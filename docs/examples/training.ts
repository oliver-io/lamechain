import './env'
import { sadRhymer } from './shitModels/sadRhymer'
import { TrainedConversation } from '../../'

export async function run() {
    const convo = new TrainedConversation(sadRhymer);
    await convo.init();
    await convo.giveExample({ ryhmeAttempt: 'dad' }, { rhymeResponse: 'lad' });
    await convo.giveExample({ ryhmeAttempt: 'sad' }, { rhymeResponse: 'mad' });
    await convo.giveExample({ ryhmeAttempt: 'glockenspiel' }, { rhymeResponse: 'NOPE' });

    for (const word of [
        'testie',
        'westie',
        'lord have mercy',
        'chatGPT',
        'something funny',
        'overjoyed',
        'exuberant'
    ]) {
        console.log({ word, response: await convo.send({ ryhmeAttempt: word }) });
    }
}

run();