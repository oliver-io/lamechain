import { PrimitiveRecord } from "../../types"

export function maybeExamples(examples: boolean = true) {
    return examples ? "Before we begin, I would like to show you some examples of good EXAMPLE CONTEXT ==> EXAMPLE RESPONSES, which are examples of how I want you to respond given some input of mine.  If the examples make sense, just respond 'OK'.  If you're ready for me to begin, just say 'OK' also." 
    : ''
}

export function bulletPoints(list:Array<string>) {
    return list.map((rule, i) => `\t${i}) ${rule}`).join('\n')
}

export function annotatedJson(record: PrimitiveRecord) {
    return Object.keys(record).map(key => `"${key}": "<${key.toUpperCase()}>" (${record[key]})`).join(',\n\t')
}