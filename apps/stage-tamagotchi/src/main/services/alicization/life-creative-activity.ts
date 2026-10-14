import * as v from 'valibot'

const schema = v.strictObject({ title: v.pipe(v.string(), v.minLength(1), v.maxLength(120)), body: v.pipe(v.string(), v.minLength(40), v.maxLength(4000)) })
export type LifeCreativeDraft = v.InferOutput<typeof schema>

export const lifeCreativeResponseFormat = { type: 'json_schema' as const, json_schema: { name: 'life_creative_activity', strict: true, schema: { type: 'object', additionalProperties: false, required: ['title', 'body'], properties: { title: { type: 'string', minLength: 1, maxLength: 120 }, body: { type: 'string', minLength: 40, maxLength: 4000 } } } } }

export function validateLifeCreativeDraft(value: unknown): LifeCreativeDraft {
  return v.parse(schema, value)
}

export function parseLifeCreativeDraft(text: string | null): LifeCreativeDraft | null {
  if (!text)
    return null
  try { return validateLifeCreativeDraft(JSON.parse(text)) }
  catch { return null }
}
