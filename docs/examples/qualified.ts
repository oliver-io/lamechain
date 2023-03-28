import './env'
import { sadRhymer } from './shitModels/sadRhymer'
import { TrainedConversation } from '../../'

export async function run() {
    const convo = new TrainedConversation(sadRhymer, { examples: true, qualifier: true });
    await convo.qualify('Never pick any rhymes that begin with the letters in the word "DERP"');
    await convo.qualify('Always prefer any rhyme beginning with letters early in the alphabet (a, b, c, etc.)');
    await convo.giveExample({ ryhmeAttempt: 'dad' }, { rhymeResponse: 'fad' });
    await convo.giveExample({ ryhmeAttempt: 'ramburger' }, { rhymeResponse: 'NOPE' });
    await convo.giveExample({ ryhmeAttempt: 'mad' }, { rhymeResponse: 'lad' });

    for (const word of [
        'testie',
        'westie',
        'please',
        'work',
        'something hard to rhyme',
        'easy'
    ]) {
        console.log('\r\n');
        console.log({ word, response: (await convo.send({ ryhmeAttempt: word })).message() });
    }
}

run();