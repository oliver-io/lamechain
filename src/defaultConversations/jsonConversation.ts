    import { Logger, LoggerContext, PrimitiveRecord } from "../../types";
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
            public ctx: LoggerContext | JsonConversation<I, O> & { examples?: boolean },
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

        text():string {
            if (!this.messages.length) {
                throw new ConversationError(this.ctx, 'No messages');
            }

            return this.messages[this.messages.length - 1].text;
        }

        async send(input: I | string, options?: { restart?: boolean }):Promise<JsonConversation<I, O>> {
            let response:Awaited<ReturnType<typeof startConversation>>;
            const item = typeof input === 'string' ? input : this.parser.itemParser(input);
            if (!this.lastConversationId || options?.restart) {
                this.ctx.logger.info('\r\n')
                this.ctx.logger.info({
                    template: this.parser.template,
                    firstMessage: item
                });
                this.ctx.logger.info('\r\n')
                response = await startConversation(this.ctx, {
                    client: this.client, 
                    template: this.parser.template,
                    firstMessage: item
                });
            } else {
                this.ctx.logger.info('\r\n')
                this.ctx.logger.info({
                    message: item
                });
                this.ctx.logger.info('\r\n')
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
        constructor(convo: JsonConversation<I, O>, options?: Partial<Parameters<typeof JSONResponsetemplateHelper>[1]>) {
            super(convo, { ...convo.templateOptions, ...options, examples: true });
        }

        async qualify(qualifier: string):Promise<void> {
            await this.send(`QUALIFYING STATEMENT (not an interaction): ${qualifier}.  If that makes sense, just send me the string OK alone with no JSON unlike other interactions.`);
            const qualifierMessage = this.message() as Record<string, string>;
            if (!qualifierMessage) {
                throw new ConversationError(this.ctx, qualifierMessage, 'Could not retrieve qualification message');
            }

            if ((this.text() ?? '').indexOf('OK') === -1){
                throw new ConversationError(this.ctx, qualifierMessage, 'Failed to qualify');
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
                        throw new ConversationError(this.ctx, 'Example NOT OK');
                    } else {
                        console.log('Training example OK.')
                    }
                    this.hasExamples = true;
                    return this;
                }
        }
    }