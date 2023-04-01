import { Logger, LoggerContext, PrimitiveRecord } from "../../types";
import { ContextError } from '../util/contextError';
import { continueConversation, getClient, startConversation } from '../clients/chatGPT';
import { JSONResponsetemplateHelper } from "../templates";

class ConversationError extends ContextError { };

type OptionExtensions = {
    examples?: boolean,
    qualifier?: boolean,
    restart?: boolean
    rawHook?: (message: string) => void
}

type IncludedChatGPTProperties = {
    id: string
}

export class JsonConversation<I extends PrimitiveRecord, O extends PrimitiveRecord> {
    parser: ReturnType<typeof JSONResponsetemplateHelper<I, O>>;
    client: ReturnType<typeof getClient>;
    messages: Awaited<ReturnType<typeof startConversation>>[];
    lastConversationId: string;
    _pipe?: JsonConversation<O, any> | null = null;
    initialized = false;
    rawHook?: (message: string) => void;
    public hasExamples: boolean = false;
    constructor(
        public ctx: LoggerContext | (JsonConversation<I, O> & OptionExtensions),
        public templateOptions: Parameters<typeof JSONResponsetemplateHelper<I, O>>[1] & OptionExtensions,
        private clientOptions?: Parameters<typeof getClient>[1]
    ) {
        if (ctx instanceof JsonConversation) {
            this.client = ctx.client;
            this.messages = ctx.messages;
        } else {
            this.client = getClient(ctx, clientOptions);
            this.messages = [];
        }
        this.lastConversationId = '';
        this.parser = JSONResponsetemplateHelper<I, O>(ctx, templateOptions);
        const rawHook = ('rawHook' in ctx ? ctx.rawHook : templateOptions.rawHook);
        this.rawHook = rawHook ?? undefined;
    }

    get logger(): Logger {
        return this.ctx.logger;
    }

    setConversationId(id: string) {
        this.lastConversationId = id;
    }

    message(): O & IncludedChatGPTProperties {
        if (!this.initialized) {
            throw new ConversationError(this.ctx, 'Conversation not initialized');
        }
        if (!this.messages.length) {
            throw new ConversationError(this.ctx, 'No messages');
        }

        return Object.assign(this.parser.responseParser(this.messages[this.messages.length - 1].text) as O, {
            id: this.messages[this.messages.length - 1].id
        });
    }

    text(): string {
        if (!this.initialized) {
            throw new ConversationError(this.ctx, 'Conversation not initialized');
        }
        if (!this.messages.length) {
            throw new ConversationError(this.ctx, 'No messages');
        }

        return this.messages[this.messages.length - 1].text;
    }

    validate(message: string | O): boolean {
        if (typeof message === 'string') {
            return message.toLowerCase().indexOf('ok') !== -1;
        } else {
            return JSON.stringify(message).toLowerCase().indexOf('ok') !== -1;
        }
    }

    async init() {
        const newConvo = new JsonConversation(this.ctx, this.templateOptions, this.clientOptions);
        if (newConvo.rawHook) {
            newConvo.rawHook(newConvo.parser.template);
        }
        const response = await startConversation(newConvo.ctx, {
            client: newConvo.client,
            template: newConvo.parser.template
        });
        if (newConvo.rawHook) {
            newConvo.rawHook(response.text);
        }
        if (!response) {
            throw new ConversationError(newConvo.ctx, 'Could not get a message to start conversation');
        } else {
            newConvo.messages.push(response);
            newConvo.lastConversationId = response.id;
        }

        if (!newConvo.validate(newConvo.text())) {
            throw new ConversationError(newConvo.ctx, { text: newConvo.text() }, 'Could not validate template');
        } else {
            newConvo.ctx.logger.info('Conversation template OK.')
            newConvo.initialized = true;
        }

        return newConvo;
    }

    async send(input: I | string, options?: { restart?: boolean }): Promise<O & IncludedChatGPTProperties> {
        if (!this.initialized) {
            throw new ConversationError(this.ctx, 'Conversation not initialized');
        }
        const item = typeof input === 'string' ? input : this.parser.itemParser(input);
        if (this.rawHook) {
            this.rawHook(item);
        }
        const response = await continueConversation(this.ctx, {
            client: this.client,
            conversationId: this.lastConversationId,
            message: item
        });
        if (this.rawHook) {
            this.rawHook(response.text);
        }
        if (!response) {
            throw new ConversationError(this.ctx, 'Could not give example');
        } else {
            this.messages.push(response);
            this.lastConversationId = response.id;
            if (this._pipe) {
                await this._pipe.send(this.message());
            }

            return this.message();
        }
    }

    pipe<O2 extends PrimitiveRecord>(input: JsonConversation<O, O2>) {
        this._pipe = input;
        return this;
    }
}

export async function qualify<T extends JsonConversation<any, any>>(
    conversation: T, 
    qualifier: string
): Promise<void> {
    await conversation.send(`QUALIFIER STATEMENT (not an interaction): ${qualifier}.

If that makes sense, just send me the string OK alone.`);
    if (!conversation.validate(conversation.text())) {
        throw new ConversationError(conversation.ctx, { text: conversation.text() }, 'Failed to qualify');
    } else {
        conversation.logger.info('Qualification OK.')
    }
}

export async function giveExample<T extends JsonConversation<any, any>>(
    conversation: T, 
    input: Parameters<T['send']>[0], 
    output: Omit<Awaited<ReturnType<T['send']>>, keyof IncludedChatGPTProperties>
):Promise<void> {
    let ex = conversation.parser.exampleParser(input, output, !conversation.hasExamples);
    const message = conversation.lastConversationId ? await continueConversation(conversation.ctx, {
        client: conversation.client,
        conversationId: conversation.lastConversationId,
        message: ex
    }) : await startConversation(conversation.ctx, {
        client: conversation.client,
        template: conversation.parser.template,
        firstMessage: ex
    });
    if (!message) {
        throw new ConversationError(conversation.ctx, 'Could not give example');
    } else {
        conversation.hasExamples = true;
        conversation.lastConversationId = message.id;
        if (message.text.indexOf('OK') === -1) {
            conversation.logger.error(message.text);
            throw new ConversationError(conversation.ctx, { text: conversation.text() }, 'Example NOT OK');
        } else {
            console.log('Training example OK.')
        }
        conversation.hasExamples = true;
        return;
    }
}