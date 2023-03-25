import { ChatGPTAPI } from 'chatgpt';
import { LoggerContext } from '../../types';
import { ContextError } from '../util/contextError';

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

export async function startConversation(ctx: LoggerContext, options: StartConversationInput): Promise<{ text: string, id: string }> {
    const response = await options.client.sendMessage(options.firstMessage ? `${options.template}\r${options.firstMessage}` : options.template);
    if (response) {
        return response;
    } else {
        throw new ClientError(ctx, 'Could not start conversation');
    }
}

export async function continueConversation(ctx: LoggerContext, options: ContinueConversationInput): Promise<{ text: string, id: string }> {
    const parentMessageId = options.conversationId!;
    const response = await options.client.sendMessage(options.message, {
        parentMessageId
    });
    if (response) {
        return response;
    } else {
        throw new ClientError(ctx, 'Could not start conversation');
    }
}