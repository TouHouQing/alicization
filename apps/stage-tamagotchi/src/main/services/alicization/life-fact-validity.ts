import type { AlicizationMemoryFactInput } from '../../../shared/eventa'

import * as v from 'valibot'

const time = v.pipe(v.number(), v.integer(), v.minValue(0))
const validitySchema = v.strictObject({ validFrom: v.nullable(time), validTo: v.nullable(time), precision: v.literal('day'), sourceText: v.pipe(v.string(), v.minLength(1), v.maxLength(2000)) })
export function parseLifeFactValidity(value: AlicizationMemoryFactInput['validity']) {
  if (value == null)
    return undefined
  const result = v.parse(validitySchema, value)
  if (result.validFrom !== null && result.validTo !== null && result.validTo <= result.validFrom)
    throw new TypeError('Fact validity interval must have positive duration')
  return result
}

// Only explicit effective-date wording is parsed. A date mentioned in a story
// does not establish when its preference or belief became valid. Resolve relative
// days against the original input time, never the later cleaning/restart time.
export function extractLifeFactValidity(evidence: string[], occurredAt: number): AlicizationMemoryFactInput['validity'] {
  const date = '(20\\d{2})[-年](\\d{1,2})[-月](\\d{1,2})日?'
  const outputs: NonNullable<AlicizationMemoryFactInput['validity']>[] = []
  for (const sourceText of evidence.slice(0, 8)) {
    const from = sourceText.match(new RegExp(`(?:从|自|since\\s+|effective\\s+from\\s+)${date}(?:起|开始|生效|\\b)`, 'iu'))
    const relative = sourceText.match(/从(今天|明天)起/u)
    let validFrom: number | null = null
    if (from) {
      const point = new Date(Number(from[1]), Number(from[2]) - 1, Number(from[3]))
      if (point.getFullYear() !== Number(from[1]) || point.getMonth() !== Number(from[2]) - 1 || point.getDate() !== Number(from[3]))
        continue
      validFrom = point.getTime()
    }
    else if (relative && Number.isSafeInteger(occurredAt) && occurredAt >= 0) {
      const point = new Date(occurredAt)
      validFrom = new Date(point.getFullYear(), point.getMonth(), point.getDate() + (relative[1] === '明天' ? 1 : 0)).getTime()
    }
    if (validFrom === null)
      continue
    const until = sourceText.match(new RegExp(`(?:直到|至|到|until\\s+)${date}(?:为止|结束|\\b)`, 'iu'))
    let validTo: number | null = null
    if (until) {
      const point = new Date(Number(until[1]), Number(until[2]) - 1, Number(until[3]))
      if (point.getFullYear() !== Number(until[1]) || point.getMonth() !== Number(until[2]) - 1 || point.getDate() !== Number(until[3]))
        continue
      validTo = new Date(point.getFullYear(), point.getMonth(), point.getDate() + (/为止/u.test(until[0]) ? 1 : 0)).getTime()
    }
    if (validTo !== null && validTo <= validFrom)
      continue
    outputs.push({ validFrom, validTo, precision: 'day', sourceText: sourceText.slice(0, 2000) })
  }
  if (!outputs.length || outputs.some(value => value.validFrom !== outputs[0].validFrom || value.validTo !== outputs[0].validTo))
    return undefined
  return outputs[0]
}
