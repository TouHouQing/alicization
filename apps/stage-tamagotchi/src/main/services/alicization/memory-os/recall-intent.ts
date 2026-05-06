import type { AlicizationTurnRetrievalPolicySnapshot } from '../memory-accessibility-runtime'
import type { OrganicMemoryPromptContext } from '../runtime-soul'

export interface AlicizationMemoryRecallIntentArtifact {
  shouldRecall: boolean
  source: 'recollection-intent' | 'candidate-pressure' | 'none'
  agenda: string[]
  reasonCodes: string[]
}

function compactList(values: Array<string | null | undefined>, limit = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = typeof value === 'string'
      ? value.trim()
      : ''
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= limit)
      break
  }
  return result
}

function agendaToList(raw: unknown) {
  if (!raw)
    return []
  if (Array.isArray(raw))
    return raw.map(item => typeof item === 'string' ? item : JSON.stringify(item))
  if (typeof raw === 'object') {
    return Object.values(raw as Record<string, unknown>)
      .flatMap(value => Array.isArray(value) ? value : [value])
      .map(value => typeof value === 'string' ? value : '')
  }
  return []
}

export function deriveAlicizationMemoryRecallIntent(input: {
  context: OrganicMemoryPromptContext
  retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
  candidateCount: number
  selectedCandidateCount: number
}): AlicizationMemoryRecallIntentArtifact {
  const recallIntent = input.context.recollectionIntent ?? null
  const shouldRecall = Boolean(
    input.context.memoryDeliberation?.shouldRecall
    || recallIntent?.mode !== 'none'
    || input.selectedCandidateCount > 0
    || input.candidateCount > 0 && input.context.recollectionSpeechPlan?.shouldSurface === true,
  )

  return {
    shouldRecall,
    source: recallIntent
      ? 'recollection-intent'
      : input.candidateCount > 0
        ? 'candidate-pressure'
        : 'none',
    agenda: compactList(agendaToList(recallIntent?.recollectionAgenda), 8),
    reasonCodes: compactList([
      ...(input.retrievalPolicySnapshot?.policy.reasonCodes ?? []),
      shouldRecall ? 'memory-os:recall-open' : 'memory-os:recall-closed',
    ], 12),
  }
}
