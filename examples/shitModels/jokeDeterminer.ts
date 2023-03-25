import { JsonConversation } from "../..";

export const model = new JsonConversation({
    logger: console
}, {
    config: {
        overallContext: 'tell me if a joke is quality',
        motivations: 'take an input KNOCK KNOCK joke, and tell me if it is funny',
        rulesAndLimitations: [
            `some antijokes may not always have the WHO IS THERE part`,
        ]
    },
    inputProperties: {
        jokeOutput: 'a phrase for you to judge the funniness of'
    },
    responseProperties: {
        jokeJudgement: 'a judgement of how funny the joke is'
    }
});