## @curiecode/lamechain - a code by oliver
# LameChain
> pipeable, trainable, JSON-mediated ChatGPT conversations for the smooth-brained dev

- [Overview](#overview)
    - [Package Info](#package-info)
- [Installation](#installation)
- [Usage](#usage)
- [Training](#training)
- [Pipes](#piping)

## Overview
This code is a collection of tools for templating, communicating, and parsing results from ChatGPT in a composable way.  The express intent is to use prompt engineering as a way to build "micro-models" for a specific job, and through a sort of functional composition, build these conversations into complex structures/interactions/data pipelines.

I was recently made aware of [LangChain](https://langchain.readthedocs.io/en/latest/)  and found out that there exist rigorous solutions to this problem in the Python and emerging Typescript space (LangChain has TS support).

However, my smooth brain skated over their documents like a maglev train on its way to Simpletown.  I would recommend that before anyone even consider using my code or anything like it, they assess whether or not a more rigorous solution exists for their use-case (mine is in a custom, home-brewed, half-baked game architecture, and I've decided to keep the third party libraries as light as possible, which is why I am not porting it to LangChain).

### Package Info
- Basically all Typescript
- 0% Test Coverage
- Used By No One but Me
- Not Semantically Versioned (Yet)
    - The current version is inaccurate.  Version `0.0.0.0.0.0.01` is accurate but NPM won't let me be accurate.
    - Do not use this code if you want stable software
- Super Experimental; updating this as I improve my use-case for it.
- Feel free to use, contribute, and etc. at your own risk.  I just ask that you read [about the license](#license).

<br>

# Installation:

- Yarn: `yarn add @curiecode/lamechain`

- NPM: `yarn add @curiecode/lamechain`

<br>

# Usage:

The general pattern is to declare a conversation with some intent, some rules & restrictions, and a stated format for input and output.  After doing so, messages can be sent through the conversation and received in type-safe objects rather than strings.  These conversations support training and piping, but the general interface is as follows: 

```typescript
    import { JsonConversation } from '@curiecode/lamechain';

    const model = new JsonConversation({ logger: console }, {
        ... // <--- Prompt configuration, read below
    });

    await model.send({
        someInput: 'my typed input object'
    });

    // My typed output object:
    const { someOutput } = model.message();
```

An example in practice; the following model is meant generates knock-knock jokes:
### [`model.ts`][BasicModelFile]:
<details> 
  <summary>Expand Code Example ⇲</summary>

<!-- BEGIN-CODE: ./examples/shitModels/jokes.ts -->
```typescript
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
```
<!-- END-CODE: ./examples/shitModels/jokes.ts -->

```typescript
    await model.send({ jokePrompt: 'using chatGPT to tell jokes' });
    console.log(`Generated Joke: ${model.message().jokeString}`);
```

</details>
<br><br>

# Training

Training conversations involves giving them a set of objects which match the input-output interface.  The inputs *and outputs* are fed through ChatGPT with a slightly modified prompt which asks ChatGPT to validate that the example maps to its stochastic parrot brain or whatever; if so, we proceed with a normal conversation.  If not, the conversation will throw an error on `giveExample`.

It is recommended (by me) for any complex prompts to use these kinds of examples.  Anecdotally, they seem to be very useful.  I don't have any good recommendations on a good number of examples, but I would suggest a minimum set that cover your different edge-cases.

<details> 
  <summary>Expand Code Example ⇲</summary>

```typescript
import { TrainedConversation } from "../..";
import { jokeModel } from './examples/shitModels/jokes';

const trainedModel = new TrainedConversation(jokeModel);

await model.giveExample({ 
    jokeInput: `no one home in oliver's head` 
}, {
    jokeString: `KNOCK KNOCK / Who's there? / Literally no one, my brain is empty af.` 
});

await model.giveExample({ 
    jokeInput: `pete townshend` 
}, {
    jokeString: `KNOCK KNOCK / Who's there? / A Who / What?  I'm confused` 
});

await model.send({
    jokeInput: 'some joke prompt'
});

const { jokeString } = model.message();

// ... 

```
</details>
<br><br>

# Pipes

The conversation class provides a method `pipe` which accepts another conversation; the piper (calling conversation) must have the same `responseProperties` as the `inputProperties` of the pipee (pipe conversation parameter).  This allows the decomposition of various tasks that OpenAI would normally have difficulty with due to complexity or scope; a problem broken into several distinct problems can be approached by having OpenAI provide a response for each distinct component of the problem.  An example follows, in which we run the output of the above joke-generator through a model determining if the joke is funny or not:

<details> 
  <summary>Expand Code Example ⇲</summary>

[`jokeDeterminer.ts`][JokeDeterminerFile]:

<!-- BEGIN-CODE: ./examples/shitModels/jokeDeterminer.ts -->
```typescript
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
```
<!-- END-CODE: ./examples/shitModels/jokeDeterminer.ts -->

```typescript
import { model as jokeModel } from '../the/above/section';
import { model as jokeDeterminerModel } from '../the/#usage/example';
    
jokeModel.pipe(jokeDeterminerModel);
await jokeModel.message({ jokePrompt: 'a joke about pipes' });
const jokeThatWasGenerated = jokeModel.message();
const jokeDetermination = jokeDeterminerModel.message();

console.log({
    joke: jokeThatWasGenerated.jokeString,
    jokeIsFunny: jokeDetermination.jokeJudgement
})
```

</details>
<br><br>

# License

*This project is licensed under the Love All My Cats (LMAC) Public License*

**You need to love my cats to use this code.**  If you do not, you're actually legally not allowed to use this code, there's a [whole license file](./LICENSE.md) that you should really read if you want to use this code.

## Curie

![Curie](https://i.imgur.com/fR4ECzy.jpeg)

## Anastasia

![Anastasia](https://i.imgur.com/auJrbvX.jpg)


[BasicModelFile]: ./examples/shitModels/jokes.ts
[JokeDeterminerFile]: ./examples/shitModels/jokeDeterminer.ts
