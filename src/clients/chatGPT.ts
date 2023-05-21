import { ChatGPTAPI, ChatGPTError } from 'chatgpt';
import { LoggerContext } from '../../types';
import { ContextError } from '../util/contextError';
import { retry } from '@lifeomic/attempt';

let clientSingleton:ChatGPTAPI;
class ClientError extends ContextError {};

export function getClient(
    ctx: LoggerContext, 
    options?:Partial<ConstructorParameters<typeof ChatGPTAPI>>, 
    forceNew = false
) {
    if (!process.env['OPENAI_API_KEY']) {
        throw new ClientError(ctx, { 
            valueType: typeof process.env['OPENAI_API_KEY'] 
        }, 'Missing OPENAI_API_KEY environment variable');
    }

    if (!clientSingleton) {
        clientSingleton = new ChatGPTAPI({
            apiKey: (process.env['OPENAI_API_KEY'])!,
            ...options ?? {}
        });
    }

    if (forceNew) {
        return new ChatGPTAPI({
            apiKey: (process.env['OPENAI_API_KEY'])!,
            ...options ?? {}
        });
    }

    return clientSingleton;
}

type StartConversationInput = {
    client: ChatGPTAPI,
    template: string,
    firstMessage?: string
}

type ContinueConversationInput = {
    client: ChatGPTAPI,
    conversationId: string,
    message: string,
}

const delay = 1000;
const maxAttempts = 2;
const retryOptions = {
    delay,
    maxAttempts
};

export async function startConversation(ctx: LoggerContext, options: StartConversationInput): Promise<{ text: string, id: string }> {
    try {
        const response = await options.client.sendMessage(options.firstMessage ? `${options.template}\r${options.firstMessage}` : options.template);
        if (response) {
            return response;
        } else {
            throw new ClientError(ctx, 'Could not start conversation');
        }
    } catch(err) {
        if (err.statusCode && err.statusCode == 429) {
            ctx.logger.info({ err }, `Rate limited, retrying ${retryOptions.maxAttempts} times with ${retryOptions.delay}ms`);
            await new Promise((resolve)=>setTimeout(resolve, retryOptions.delay));
            return await retry(async () => {
                return startConversation(ctx, options);
            }, retryOptions);
        } else throw err;
    }
}

export async function continueConversation(ctx: LoggerContext, options: ContinueConversationInput): Promise<{ text: string, id: string }> {
    const parentMessageId = options.conversationId!;
    try {
        const response = await options.client.sendMessage(options.message, {
            parentMessageId
        });
        if (response) {
            return response;
        } else {
            throw new ClientError(ctx, 'Could not start conversation');
        }
    } catch(err) {
        if (err.statusCode && err.statusCode == 429) {
            ctx.logger.info({ err }, `Rate limited, retrying ${retryOptions.maxAttempts} times with ${retryOptions.delay}ms`);
            await new Promise((resolve)=>setTimeout(resolve, retryOptions.delay));
            return await retry(async () => {
                return continueConversation(ctx, options);
            }, retryOptions);
        } else throw err;
    }
}