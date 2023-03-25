import { JsonConversation } from "../..";

export const model = new JsonConversation({
    logger: console
}, {
    config: {
        overallContext: 'tell me jokes',
        motivations: 'take an input string, and make a joke about it',
        rulesAndLimitations: [
            `always include the phrase KNOCK KNOCK, and WHO IS THERE? in your joke`,
            `the joke should be really, really funny like something kurt vonnegut wrote`,                
        ]
    },
    inputProperties: {
        jokePrompt: 'a phrase for you to make a joke about'
    },
    responseProperties: {
        jokeString: 'the really funny joke that you invented'
    }
});