import './env'
import { sadRhymer } from './shitModels/sadRhymer'
import { qualify, giveExample } from '../../'

export async function run() {
    const convo = await sadRhymer.init();
    await qualify(convo, 'Never pick any rhymes that begin with the letters in the word "DERP"');
    await qualify(convo, 'Always prefer any rhyme beginning with letters early in the alphabet (a, b, c, etc.)');
    await giveExample(convo, { ryhmeAttempt: 'dad' }, { rhymeResponse: 'fad' });
    await giveExample(convo, { ryhmeAttempt: 'ramburger' }, { rhymeResponse: 'NOPE' });
    await giveExample(convo, { ryhmeAttempt: 'mad' }, { rhymeResponse: 'lad' });

    for (const word of [
        'testie',
        'westie',
        'please',
        'work',
        'something hard to rhyme',
        'easy'
    ]) {
        console.log('\r\n');
        console.log({ word, response: await convo.send({ ryhmeAttempt: word })});
    }
}

run();