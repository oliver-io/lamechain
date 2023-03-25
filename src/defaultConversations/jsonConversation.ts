import { StreamersonLogger } from "streamerson";
import { Logger, PrimitiveRecord } from "../../types";
import { ContextError } from '../util/contextError';
import { continueConversation, getClient, startConversation } from '../clients/chatGPT';
import { JSONResponsetemplateHelper } from "../templates";

class ConversationError extends ContextError {};

export class JsonConversation<I extends PrimitiveRecord, O extends PrimitiveRecord> {
    parser: ReturnType<typeof JSONResponsetemplateHelper>;
    client: ReturnType<typeof getClient>;
    messages: Awaited<ReturnType<typeof startConversation>>[];
    lastConversationId: string;
    _pipe?:JsonConversation<O, any>|null = null;
    constructor(
        public ctx: { logger: StreamersonLogger } | JsonConversation<I, O> & { examples?: boolean },
        public templateOptions: Parameters<typeof JSONResponsetemplateHelper>[1],
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
        this.parser = JSONResponsetemplateHelper(ctx, templateOptions);
    }

    get logger():Logger {
        return this.ctx.logger;
    }

    setConversationId(id: string) {
        this.lastConversationId = id;
    }

    message():O & { id: string } {
        if (!this.messages.length) {
            throw new ConversationError(this.ctx, 'No messages');
        }
        
        return Object.assign(this.parser.responseParser(this.messages[this.messages.length - 1].text) as O, {
            id: this.messages[this.messages.length - 1].id
        });
    }

    async send(input: I, options?: { restart?: boolean }):Promise<JsonConversation<I, O>> {
        let response:Awaited<ReturnType<typeof startConversation>>;
        const item = this.parser.itemParser(input);
        if (!this.lastConversationId || options?.restart) {
            response = await startConversation(this.ctx, {
                client: this.client, 
                template: this.parser.template,
                firstMessage: item
            });
        } else {
            response = await continueConversation(this.ctx, {
                client: this.client, 
                conversationId: this.lastConversationId,
                message: item
            });
        }
        this.messages.push(response);
        this.lastConversationId = response.id;
        if (!response) {
            throw new ConversationError(this.ctx, 'Could not give example');
        } else {
            this.messages.push(response);
            this.lastConversationId = response.id;
            if (this._pipe) {
                await this._pipe.send(this.message());
            }

            return this;
        }
    }

    pipe<O2 extends PrimitiveRecord>(input: JsonConversation<O, O2>) {
        this._pipe = input;
        return this;
    }
}

export class TrainedConversation<I extends PrimitiveRecord, O extends PrimitiveRecord> extends JsonConversation<I, O> {
    hasExamples:boolean = false;
    constructor(convo: JsonConversation<I, O>) {
        super(convo, { ...convo.templateOptions, examples: true });
    }

    async giveExample(input: I, output: O) {
            const ex = this.parser.exampleParser(input, output);
            const message = this.lastConversationId ? await continueConversation(this.ctx, {
                client: this.client,
                conversationId: this.lastConversationId,
                message: ex
            }) : await startConversation(this.ctx, {
                    client: this.client, 
                    template: this.parser.template,
                    firstMessage: ex
            });

            if (!message) {
                throw new ConversationError(this.ctx, 'Could not give example');
            } else {
                this.hasExamples = true;
                this.lastConversationId = message.id;
                if (message.text.indexOf('OK') === -1) {
                    this.logger.error(message.text);
                    throw new ConversationError(this.ctx, 'Example NOT OK');
                } else {
                    console.log('Training example OK.')
                }
                return this;
            }
    }
}