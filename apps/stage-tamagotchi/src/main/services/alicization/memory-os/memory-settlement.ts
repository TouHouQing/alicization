import type { OrganicMemoryPromptContext } from '../runtime-soul'

import type { AlicizationMemoryCandidateCompetitionArtifact } from './candidate-competition'
import type { AlicizationMemoryDeliberationArtifact } from './memory-deliberation'
import type { AlicizationMemoryRecallIntentArtifact } from './recall-intent'
import type { AlicizationMemorySpeechPostureArtifact } from './speech-posture'

export interface AlicizationMemorySettlementArtifact {
  version: 'memory-settlement-v1'
  shouldRecall: boolean
  shouldSurface: boolean
  closure: {
    closureState: OrganicMemoryPromptContext['memoryResolutionLedger'] extends infer Ledger
      ? Ledger extends { closureState?: infer State }
        ? State | null
        : string | null
      : string | null
    visibleCarryMode: OrganicMemoryPromptContext['memoryResolutionLedger'] extends infer Ledger
      ? Ledger extends { visibleCarryMode?: infer Mode }
        ? Mode | null
        : string | null
      : string | null
    retrievalQuality: OrganicMemoryPromptContext['memoryResolutionLedger'] extends infer Ledger
      ? Ledger extends { retrievalQuality?: infer Quality }
        ? Quality | null
        : string | null
      : string | null
    shouldLabelUncertainty: boolean
    surfaceConfidence: number | null
    conflictPressure: OrganicMemoryPromptContext['memoryResolutionLedger'] extends infer Ledger
      ? Ledger extends { conflictPressure?: infer Pressure }
        ? Pressure | null
        : string | null
      : string | null
  }
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
  const ledger = input.context.memoryResolutionLedger ?? null
  const closureBlocksSurface = ledger?.visibleCarryMode === 'withhold'
    || ledger?.closureState === 'inward-only'
    || ledger?.closureState === 'no-recall'
    || ledger?.retrievalQuality === 'insufficient'
    || ledger?.conflictPressure === 'high'
  const shouldSurface = shouldRecall
    && input.speechPosture.shouldSurface
    && input.deliberation.surfacePolicy !== 'internal-only'
    && !closureBlocksSurface

  return {
    version: 'memory-settlement-v1',
    shouldRecall,
    shouldSurface,
    closure: {
      closureState: ledger?.closureState ?? null,
      visibleCarryMode: ledger?.visibleCarryMode ?? null,
      retrievalQuality: ledger?.retrievalQuality ?? null,
      shouldLabelUncertainty: ledger?.shouldLabelUncertainty === true,
      surfaceConfidence: Number.isFinite(ledger?.surfaceConfidence)
        ? Number(ledger?.surfaceConfidence)
        : null,
      conflictPressure: ledger?.conflictPressure ?? null,
    },
    withheld: compactList([
      input.competition.wrongThreadSuppressedCount > 0 ? 'wrong-thread-suppressed' : null,
      unsupportedSpecificityBlockedCount > 0 ? 'unsafe-specificity-withheld' : null,
      !shouldRecall && input.competition.candidateCount > 0 ? 'present-facing-turn' : null,
      shouldRecall && !shouldSurface ? 'memory-held-inward' : null,
      ledger?.shouldLabelUncertainty ? 'uncertainty-label-required' : null,
      ledger?.retrievalQuality === 'insufficient' ? 'retrieval-insufficient' : null,
      ledger?.conflictPressure === 'high' ? 'conflict-pressure-high' : null,
      ledger?.closureState === 'no-recall' ? 'no-recall-available' : null,
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
