    import { Logger, LoggerContext, PrimitiveRecord } from "../../types";
    import { ContextError } from '../util/contextError';
    import { continueConversation, getClient, startConversation } from '../clients/chatGPT';
    import { JSONResponsetemplateHelper } from "../templates";

    class ConversationError extends ContextError {};

    type OptionExtensions =  { 
        examples?: boolean,
        qualifier?: boolean,
        restart?: boolean
        rawHook?: (message: string) => void
    }

    export class JsonConversation<I extends PrimitiveRecord, O extends PrimitiveRecord> {
        parser: ReturnType<typeof JSONResponsetemplateHelper>;
        client: ReturnType<typeof getClient>;
        messages: Awaited<ReturnType<typeof startConversation>>[];
        lastConversationId: string;
        _pipe?:JsonConversation<O, any>|null = null;
        initialized = false;
        rawHook?: (message: string) => void;
        constructor(
            public ctx: LoggerContext | (JsonConversation<I, O> & OptionExtensions),
            public templateOptions: Parameters<typeof JSONResponsetemplateHelper>[1] & OptionExtensions,
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
            const rawHook = ('rawHook' in ctx ? ctx.rawHook : templateOptions.rawHook);
            this.rawHook = rawHook ?? undefined;
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

        text():string {
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
            if (this.rawHook){
                this.rawHook(this.parser.template);
            }
            const response = await startConversation(this.ctx, {
                client: this.client, 
                template: this.parser.template
            });
            if (this.rawHook){
                this.rawHook(response.text);
            }
            if (!response) {
                throw new ConversationError(this.ctx, 'Could not start conversation');
            } else {
                this.messages.push(response);
                this.lastConversationId = response.id;
            }

            if (!this.validate(this.text())) {
                throw new ConversationError(this.ctx, 'Could not validate template');
            } else {
                this.ctx.logger.info('Conversation template OK.')
                this.initialized = true;
            }
        }

        async send(input: I | string, options?: { restart?: boolean }):Promise<O> {
            if (!this.initialized) {
                throw new ConversationError(this.ctx, 'Conversation not initialized');
            }
            const item = typeof input === 'string' ? input : this.parser.itemParser(input);
            if (this.rawHook){
                this.rawHook(item);
            }
            const response = await continueConversation(this.ctx, {
                client: this.client, 
                conversationId: this.lastConversationId,
                message: item
            });
            if (this.rawHook){
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

    export class TrainedConversation<I extends PrimitiveRecord, O extends PrimitiveRecord> extends JsonConversation<I, O> {
        hasExamples:boolean = false;
        constructor(convo: JsonConversation<I, O>, options?: Partial<Parameters<typeof JSONResponsetemplateHelper>[1]>) {
            super(convo, { ...convo.templateOptions, ...options, examples: true });
        }

        async qualify(qualifier: string):Promise<void> {
            await this.send(`QUALIFIER STATEMENT (not an interaction): ${qualifier}.

If that makes sense, just send me the string OK alone.`);
            if (!this.validate(this.text())) {
                throw new ConversationError(this.ctx, { text: this.text() }, 'Failed to qualify');
            } else {
                this.logger.info('Qualification OK.')
            }
        }

        async giveExample(input: I, output: O) {
                let ex = this.parser.exampleParser(input, output, !this.hasExamples);
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
                        throw new ConversationError(this.ctx, { text: this.text() }, 'Example NOT OK');
                    } else {
                        console.log('Training example OK.')
                    }
                    this.hasExamples = true;
                    return this;
                }
        }
    }