import * as v from 'valibot'

const schema = v.strictObject({ scope: v.literal('present-choice'), activity: v.picklist(['creative-writing-v1', 'visual-study-v1']), topic: v.pipe(v.string(), v.minLength(3), v.maxLength(160)) })
export type LifePersonalIntent = v.InferOutput<typeof schema>
export const lifePersonalIntentJsonSchema = { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, required: ['scope', 'activity', 'topic'], properties: { scope: { type: 'string', const: 'present-choice' }, activity: { type: 'string', enum: ['creative-writing-v1', 'visual-study-v1'] }, topic: { type: 'string', minLength: 3, maxLength: 160 } } }] }

/** A bounded choice is data, never an external command or a permanent hobby. */
export function parseLifePersonalIntent(value: unknown): LifePersonalIntent | null {
  const parsed = v.safeParse(schema, value)
  if (!parsed.success || /删除|上传|转账|密码|脚本|运行命令|\b(?:password|script|payment|upload|delete)\b/iu.test(parsed.output.topic))
    return null
  return parsed.output
}

export function readLifePersonalIntent(fullText: string) {
  try {
    const value = JSON.parse(fullText)
    return value.format === 'mind-turn-v1' ? parseLifePersonalIntent(value.personalIntent) : null
  }
  catch { return null }
}
