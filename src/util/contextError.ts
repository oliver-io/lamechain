import { LoggerContext } from "../../types";
const defaultErrorDisplayMessage = 'ContextError';
export class ContextError extends Error {
    constructor(
        ctx: LoggerContext, 
        errorContext: string | Record<string, string>, 
        message: string|null = null,
        log = true
    ) {
        let displayMessage = message || errorContext;
        if (typeof (displayMessage) !== 'string') {
            displayMessage = defaultErrorDisplayMessage;
        }
        super(displayMessage);
        if (displayMessage === defaultErrorDisplayMessage) {
            displayMessage = this.constructor.name;
        }
        if (typeof errorContext === 'object') {
            Object.assign(this, errorContext);
        }
        if (ctx.debug || log) {
            ctx.logger.error({ contextError: this }, displayMessage);
        }
    }
}