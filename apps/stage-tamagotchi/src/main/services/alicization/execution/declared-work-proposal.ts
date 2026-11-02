import type { ExecutionWorkProposal } from '../../../../shared/execution-contracts'

import { executionDigest } from './acceptance-compiler'
import { declaredWorkParameters, normalizeWorkProposal } from './work-plan-tool'

const schema = declaredWorkParameters

/** Exact request data constrains a proposal; it grants no execution permission. */
export function declaredWorkProposal(text: string) {
  if (text.length > 256_000)
    throw new Error('The current work request exceeds its source-reading budget')
  const candidates = new Map<string, ExecutionWorkProposal>()
  let depth = 0
  let start = 0
  let quoted = false
  let escaped = false
  let objects = 0
  for (let index = 0; index < text.length; index++) {
    const character = text[index]
    if (!depth) {
      if (character !== '{')
        continue
      start = index
      depth = 1
      quoted = false
      escaped = false
      continue
    }
    if (quoted) {
      if (escaped)
        escaped = false
      else if (character === '\\')
        escaped = true
      else if (character === '"')
        quoted = false
      continue
    }
    if (character === '"')
      quoted = true
    else if (character === '{')
      depth++
    else if (character === '}')
      depth--
    if (depth > 64)
      throw new Error('The current work request exceeds its nesting budget')
    if (depth)
      continue
    if (++objects > 32)
      throw new Error('The current work request contains too many parameter objects')
    let candidate: unknown
    try { candidate = JSON.parse(text.slice(start, index + 1)) }
    catch { continue }
    const parsed = schema.safeParse(candidate)
    if (parsed.success) {
      const normalized = normalizeWorkProposal(parsed.data)
      candidates.set(executionDigest(normalized), normalized)
    }
  }
  if (candidates.size > 1)
    throw new Error('The current request contains different work plans; choose one before admission')
  const entry = candidates.entries().next().value
  return entry ? { hash: entry[0], proposal: entry[1] } : null
}

export function matchesDeclaredWorkProposal(input: unknown, declared: NonNullable<ReturnType<typeof declaredWorkProposal>>) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return false
  const record = input as Record<string, unknown>
  try {
    return executionDigest(normalizeWorkProposal({ goal: record.goal, criteria: record.criteria, steps: record.steps })) === declared.hash
  }
  catch { return false }
}
