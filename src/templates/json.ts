import { LoggerContext, PrimitiveRecord } from '../../types';
import { ContextError } from '../util/contextError';
import { bulletPoints, annotatedJson, maybeExamples } from './common';

class ParserContextError extends ContextError {}

function buildJsonParserFn<T>(ctx: LoggerContext, responseProperties: Record<string, any>) {
    return function (input: string): T {
        if (input.indexOf('{') === -1) {
            const responsePropertyKeys = Object.keys(responseProperties);
            if (responsePropertyKeys.length === 1) {
                return {
                   [responsePropertyKeys[0]]: input
                } as unknown as T;
            }

            throw new ParserContextError(ctx, { input }, "Could not JSON parse response from ChatGPT")
        }
        let substring = input.substring(input.indexOf('{'), input.indexOf('}') + 1);
        // newlines:
        substring = substring.replace(/\n/g, '');
        // tabs:
        substring = substring.replace(/\t/g, '');
        // weird height measurements breaking the " json:
        substring = substring.replace(/(\d+)\s*(?:'|ft)\s*(\d+)\s*\"/gi, '$1\' $2\\"');
        try {
            return (JSON.parse(substring) as unknown as T);
        } catch (err) {
            throw new ParserContextError(ctx, { err, JSONsubstring: substring, input }, 'Could not parse response from ChatGPT');
        }
    }
}

type JSONResponseTemplateHelperInput = {
    overallContext: string,
    motivations: string,
    rulesAndLimitations: Array<string>
}

type JSONResponseTemplateHelperOutput<R, I> = {
    template: string,
    responseParser: (input: string) => R,
    exampleParser: (input: I, output: R, first?: boolean) => string,
    itemParser: (input: I) => string
}

export function JSONResponsetemplateHelper<
    InputOptions extends PrimitiveRecord,
    OutputOptions extends PrimitiveRecord
>(ctx: LoggerContext, options: {
    inputProperties: InputOptions
    responseProperties: OutputOptions,
    examples?: boolean,
    qualifier?: boolean,
    config: JSONResponseTemplateHelperInput
}):JSONResponseTemplateHelperOutput<OutputOptions, InputOptions> {
    const { config, inputProperties, responseProperties } = options;
    const responseParser = buildJsonParserFn<OutputOptions>(ctx, responseProperties);
    const itemParser = (itemProps: InputOptions)=>`CONTEXT:\n\t${
        Object.keys(itemProps)
            .map((inputKey) => `[${inputKey.toUpperCase()}]: ${itemProps[inputKey]}`)
            .join('\n\t')
        }`;

    const exampleParser = (itemProps: InputOptions, outputProps: OutputOptions, first = false) => {
        const input = `EXAMPLE ${itemParser(itemProps)}`;
        const output = `EXAMPLE RESPONSE: \n${JSON.stringify(outputProps, null, 2)}`;
        return `${first ? maybeExamples() : ''}${input}\n\n${output}\n\nIf this example makes sense, send OK`;
    }

    const template = `Hey ChatGPT I am using you in ${config.overallContext}. I want to send you something (an INTERACTION), and I want you to ${config.motivations}, and to do that, what I will give you is a [CONTEXT] with the following: 
    ${Object.keys(inputProperties).map(k => `\t[${k.toUpperCase()}]: ${inputProperties[k]}`).join('\n')}

For each INTERACTION, I would like you to return to me the data that you generate in valid JSON markup format: (The parts in parantheses are just for you to interpret what the meaning of each field is)

\`\`\`json
{
    ${annotatedJson(responseProperties)}
}
\`\`\`

However, there are a few rules:
${bulletPoints(config.rulesAndLimitations)}

Before we start, I may send you EXAMPLEs or QUALIFYING statements.  Before we engage in any INTERACTIONs, if this prompt makes sense, send me the string "OK" and we will continue.
`;

    return {
        template,
        itemParser,
        responseParser,
        exampleParser
    };
}