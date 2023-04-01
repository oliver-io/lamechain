import './env'
import { sadRhymer } from './shitModels/sadRhymer'
import { giveExample } from '../../'

export async function run() {
    const model = await sadRhymer.init();
    await giveExample(model, { ryhmeAttempt: 'dad' }, { rhymeResponse: 'lad' });
    await giveExample(model, { ryhmeAttempt: 'sad' }, { rhymeResponse: 'mad' });
    await giveExample(model, { ryhmeAttempt: 'glockenspiel' }, { rhymeResponse: 'NOPE' });

    for (const word of [
        'testie',
        'westie',
        'lord have mercy',
        'chatGPT',
        'something funny',
        'overjoyed',
        'exuberant'
    ]) {
        console.log({ word, response: await model.send({ ryhmeAttempt: word }) });
    }
}

run();