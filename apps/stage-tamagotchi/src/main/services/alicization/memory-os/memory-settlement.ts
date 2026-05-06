import type { OrganicMemoryPromptContext } from '../runtime-soul'

import type { AlicizationMemoryCandidateCompetitionArtifact } from './candidate-competition'
import type { AlicizationMemoryDeliberationArtifact } from './memory-deliberation'
import type { AlicizationMemoryRecallIntentArtifact } from './recall-intent'
import type { AlicizationMemorySpeechPostureArtifact } from './speech-posture'

export interface AlicizationMemorySettlementArtifact {
  version: 'memory-settlement-v1'
  shouldRecall: boolean
  shouldSurface: boolean
  withheld: string[]
  metrics: {
    recallCandidateCount: number
    selectedCandidateCount: number
    wrongThreadSuppressedCount: number
    unsupportedSpecificityBlockedCount: number
    latencyMs: number | null
  }
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

function countUnsupportedSpecificity(input: {
  context: OrganicMemoryPromptContext
  deliberation: AlicizationMemoryDeliberationArtifact
}) {
  const ledger = input.context.memoryResolutionLedger ?? null
  const ledgerSpecificitySuppressionCount = ledger?.suppressionTags
    ?.filter(tag => /specificity|unsupported|unsafe/u.test(tag))
    .length ?? 0
  return Math.max(input.deliberation.unsafeDetails.length, ledgerSpecificitySuppressionCount)
}

export function settleAlicizationMemoryTurn(input: {
  context: OrganicMemoryPromptContext
  recallIntent: AlicizationMemoryRecallIntentArtifact
  competition: AlicizationMemoryCandidateCompetitionArtifact
  deliberation: AlicizationMemoryDeliberationArtifact
  speechPosture: AlicizationMemorySpeechPostureArtifact
  latencyMs?: number | null
}): AlicizationMemorySettlementArtifact {
  const unsupportedSpecificityBlockedCount = countUnsupportedSpecificity({
    context: input.context,
    deliberation: input.deliberation,
  })
  const shouldRecall = input.deliberation.shouldRecall || input.recallIntent.shouldRecall
  const shouldSurface = shouldRecall
    && input.speechPosture.shouldSurface
    && input.deliberation.surfacePolicy !== 'internal-only'

  return {
    version: 'memory-settlement-v1',
    shouldRecall,
    shouldSurface,
    withheld: compactList([
      input.competition.wrongThreadSuppressedCount > 0 ? 'wrong-thread-suppressed' : null,
      unsupportedSpecificityBlockedCount > 0 ? 'unsafe-specificity-withheld' : null,
      !shouldRecall && input.competition.candidateCount > 0 ? 'present-facing-turn' : null,
      shouldRecall && !shouldSurface ? 'memory-held-inward' : null,
    ], 8),
    metrics: {
      recallCandidateCount: input.competition.candidateCount,
      selectedCandidateCount: input.competition.selectedCandidateCount,
      wrongThreadSuppressedCount: input.competition.wrongThreadSuppressedCount,
      unsupportedSpecificityBlockedCount,
      latencyMs: Number.isFinite(input.latencyMs)
        ? Number(input.latencyMs)
        : null,
    },
  }
}
