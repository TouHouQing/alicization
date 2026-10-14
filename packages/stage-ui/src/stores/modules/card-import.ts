import type { Card, ccv3 } from '@proj-alicization/ccc'

import { array, check, looseObject, optional, parse, pipe, record, string, unknown } from 'valibot'

const name = pipe(string(), check(value => Boolean(value.trim()), 'A card name is required.'))
const text = optional(string())
const texts = optional(array(string()))
const extensions = optional(record(string(), unknown()))
const common = { name, description: text, creator: text, personality: text, scenario: text, tags: texts, extensions }
const plain = looseObject({ ...common, version: text, greetings: texts, greetingsGroupOnly: texts, systemPrompt: text, postHistoryInstructions: text })
const wrapped = looseObject({ data: looseObject({ ...common, first_mes: text, mes_example: text, character_version: text, creator_notes: text, creator_notes_multilingual: optional(record(string(), string())), alternate_greetings: texts, group_only_greetings: texts, system_prompt: text, post_history_instructions: text }) })

// Validate consumed fields before an imported file can mutate the card list.
export function parseImportedCard(input: unknown): Card | ccv3.CharacterCardV3 {
  const schema = typeof input === 'object' && input !== null && 'data' in input ? wrapped : plain
  parse(schema, input)
  return input as Card | ccv3.CharacterCardV3
}
