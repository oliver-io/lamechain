import { LoggerContext, PrimitiveRecord } from '../..';
import { bulletPoints, maybeExamples } from './common';

function buildTextParserFn(ctx: LoggerContext ) {
    return function (input: string):string {
        if (input.match(/generation_error/ig)) {
            ctx.logger.error({
                input
            }, 'Text generation error');
            throw new Error('GENERATION ERROR');
        } else {
            return input;
        }
    }
}

type TextResponseTemplateHelperInput = {
    overallContext: string,
    motivations: string,
    rulesAndLimitations: Array<string>
}

type TextResponseTemplateHelperOutput<I> = {
    template: string,
    responseParser: (input: string) => string,
    exampleParser: (input: I, output: string) => string,
    itemParser: (input: I) => string
}


export function textResponseTemplateHelper<
    InputOptions extends PrimitiveRecord
>(ctx: LoggerContext, options: {
    inputProperties: InputOptions
    examples?: boolean,
    config: TextResponseTemplateHelperInput
}):TextResponseTemplateHelperOutput<InputOptions> {
    const { config, inputProperties } = options;
    const responseParser = buildTextParserFn(ctx);
    const itemParser = (itemProps: InputOptions)=>`CONTEXT:\n\t${
        Object.keys(itemProps)
            .map((inputKey) => `[${inputKey.toUpperCase()}]: ${itemProps[inputKey]}`)
            .join('\n\t')
        }`;

    const exampleParser = (itemProps: InputOptions, outputExample: string) => {
        const input = `EXAMPLE ${itemParser(itemProps)}`;
        const output = `EXAMPLE RESPONSE: \n${JSON.stringify(outputExample, null, 2)}`;
        return `${input}\n\n${output}`;
    }

    const template = `Hey ChatGPT I am using you in ${config.overallContext} to ${config.motivations}. For each interaction, I want you to ${config.motivations}, and to do that, what I will give you is a [CONTEXT] with the following: 
    ${Object.keys(inputProperties).map(k => `\t[${k.toUpperCase()}]: ${inputProperties[k]}`).join('\n')}

However, there are a few rules:
${bulletPoints(config.rulesAndLimitations)}

For each interaction, I would like you to return to me text

${maybeExamples(options.examples ?? false)}
`;

    return {
        template,
        itemParser,
        responseParser,
        exampleParser
    };
}