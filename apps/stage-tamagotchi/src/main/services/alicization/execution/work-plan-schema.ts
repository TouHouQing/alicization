import * as v from 'valibot'

const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
const ids = v.pipe(v.array(id), v.maxLength(256))
const positive = v.pipe(v.number(), v.integer(), v.minValue(1))

export function assertExecutionJson(value: unknown) {
  const queue = [{ value, depth: 0 }]
  let entries = 0
  let characters = 0
  while (queue.length) {
    const item = queue.pop()!
    entries++
    if (entries > 8192 || item.depth > 16 || characters > 200_000)
      throw new TypeError('Execution input exceeds its depth or size budget')
    if (typeof item.value === 'string') {
      characters += item.value.length
    }
    else if (Array.isArray(item.value)) {
      if (item.value.length > 8192)
        throw new TypeError('Execution array exceeds its entry budget')
      queue.push(...item.value.map(value => ({ value, depth: item.depth + 1 })))
    }
    else if (item.value && typeof item.value === 'object') {
      for (const [key, value] of Object.entries(item.value)) {
        if (['__proto__', 'constructor', 'prototype'].includes(key))
          throw new TypeError('Execution input contains a reserved key')
        characters += key.length
        queue.push({ value, depth: item.depth + 1 })
      }
    }
    else if (item.value !== null && !['boolean', 'number'].includes(typeof item.value)) {
      throw new TypeError('Execution input must be JSON')
    }
    else if (typeof item.value === 'number' && !Number.isFinite(item.value)) {
      throw new TypeError('Execution numbers must be finite')
    }
  }
  if (characters > 200_000)
    throw new TypeError('Execution input exceeds its character budget')
}

export const workPlanSchema = v.strictObject({
  schedule: v.optional(v.strictObject({ at: v.pipe(v.number(), v.integer(), v.minValue(0)), groupId: id, index: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(15)) })),
  id,
  cardId: id,
  rootThreadId: id,
  rootObligationId: id,
  obligationGeneration: positive,
  revision: positive,
  acceptanceHash: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u)),
  sourceEvidenceRefs: v.pipe(v.array(id), v.maxLength(64)),
  browserBinding: v.optional(v.strictObject({ kind: v.picklist(['managed', 'authorized-page']), id })),
  readRepairPolicy: v.optional(v.literal('grounded-read-v1')),
  steps: v.pipe(v.array(v.strictObject({
    id,
    dependsOn: ids,
    capabilityId: id,
    input: v.pipe(v.record(v.string(), v.unknown()), v.check((input) => { assertExecutionJson(input); return true })),
    inputHash: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u)),
    nativeWindowSourceStepId: v.optional(id),
    inputBindings: v.optional(v.pipe(v.array(v.strictObject({ parameter: id, stepId: id, path: v.pipe(v.array(id), v.maxLength(16)), select: v.optional(v.strictObject({ field: id, equals: v.pipe(v.string(), v.maxLength(4096)), valueField: id })) })), v.maxLength(32))),
    acceptanceCriterionIds: ids,
    resourceIds: ids,
    retryMode: v.picklist(['read-only', 'reconcile-first', 'manual-only']),
    state: v.literal('pending'),
    attemptId: v.null(),
  })), v.minLength(1), v.maxLength(256)),
})
