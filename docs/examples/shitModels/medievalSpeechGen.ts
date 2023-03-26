import { JsonConversation } from "../../../";

export const sayMedievalShitIfYES = new JsonConversation({
    logger: console
}, {
    config: {
        overallContext: 'read some JSON and then maybe say something medieval',
        motivations: 'read the incoming text for YES and if so be medieval',
        rulesAndLimitations: [
            `the incoming text will be json`,
            `if it says yes i want you to go all medieval on me`,
            `if it says no i want you to say NOPE!`,                
            `seriously be medieval as heck`
        ]
    },
    inputProperties: {
        isMedieval: 'YES or NO based on whether or not you should go medieval'
    },
    responseProperties: {
        outputText: 'if medieval, the response.  otherwise, just "NOPE!"'
    }
});