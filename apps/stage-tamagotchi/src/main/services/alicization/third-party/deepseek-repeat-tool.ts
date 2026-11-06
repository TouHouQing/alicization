// Adapted from deepseek-ai/deepseek-harness, commit
// ce7073d51254c26cd63b22a60835b8f948deb447,
// packages/guard/repeat-tool-reminder/src/index.ts (MIT).
// Changes: derive the chain from current-turn durable results rather than a
// plugin WeakMap; reset when the observed result changes; advise without veto.
// Full license: resources/licenses/deepseek-harness-license.txt.

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map(sortJsonValue)
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    // JSON keys such as __proto__ must remain data during canonicalization.
    const sorted = Object.create(null) as Record<string, unknown>
    for (const key of Object.keys(record).sort())
      sorted[key] = sortJsonValue(record[key])
    return sorted
  }
  return value
}

export function canonicalizeToolArguments(value: unknown): string {
  return JSON.stringify(sortJsonValue(value))
}

export function repeatedToolReminder(calls: readonly { name: string, argumentsKey: string, observationKey: string }[]) {
  let key: string | undefined
  let count = 0
  for (const call of calls) {
    const next = canonicalizeToolArguments([call.name, call.argumentsKey, call.observationKey])
    count = next === key ? count + 1 : 1
    key = next
  }
  if (![3, 5, 8].includes(count))
    return null
  return {
    toolName: calls.at(-1)!.name,
    consecutiveCalls: count,
    guidance: 'The same tool and arguments returned an unchanged observation repeatedly. Inspect the evidence and change the approach or finish if enough evidence exists. If waiting for an external state change, use the designated wait/watch mechanism. This notice does not establish failure, success, permission or task acceptance.',
  }
}
