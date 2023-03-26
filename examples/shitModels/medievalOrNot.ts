import { JsonConversation } from "../../";

export const medievalOrNot = new JsonConversation({
    logger: console
}, {
    config: {
        overallContext: 'trying to test a conversation framework',
        motivations: 'determine if my speech is at all medieval',
        rulesAndLimitations: [
            `think of medieval as just some shakespeare or king arthur shit idk`,
            `if a word is still common but also medieval, do not consider it medieval`,                
        ]
    },
    inputProperties: {
        maybeMedievalPhrase: 'a word that might contain medieval text'
    },
    responseProperties: {
        isMedieval: 'a YES or NO based on whether or not the text is medieval'
    }
});