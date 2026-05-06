import type { OrganicMemoryPromptContext } from '../runtime-soul'

import type { AlicizationMemoryCandidateCompetitionArtifact } from './candidate-competition'
import type { AlicizationMemoryCandidateRetrievalArtifact } from './candidate-retrieval'
import type { AlicizationMemoryDeliberationArtifact } from './memory-deliberation'
import type { AlicizationMemoryRecallIntentArtifact } from './recall-intent'
import type { AlicizationMemorySpeechPostureArtifact } from './speech-posture'

import {
  deriveAlicizationMemoryClosureDiscipline,
  type AlicizationMemoryResolutionLedger,
} from '@proj-alicization/stage-shared'

export interface AlicizationMemorySettlementArtifact {
  version: 'memory-settlement-v1'
  shouldRecall: boolean
  shouldSurface: boolean
  closure: {
    closureState: AlicizationMemoryResolutionLedger['closureState'] | null
    visibleCarryMode: AlicizationMemoryResolutionLedger['visibleCarryMode'] | null
    retrievalQuality: AlicizationMemoryResolutionLedger['retrievalQuality'] | null
    shouldLabelUncertainty: boolean
    surfaceConfidence: number | null
    conflictPressure: AlicizationMemoryResolutionLedger['conflictPressure'] | null
  }
  withheld: string[]
  metrics: {
    recallCandidateCount: number
    selectedCandidateCount: number
    wrongThreadSuppressedCount: number
    unsupportedSpecificityBlockedCount: number
    latencyMs: number | null
    recallReadiness: number
    precisionProxy: number
    wrongThreadRisk: number
    latencyPressure: number
    conflictCandidateCount: number
  }
  visibleMemoryGate: {
    status: 'open' | 'gist-only' | 'inward-only' | 'closed'
    recallReadiness: number
    precisionProxy: number
    wrongThreadRisk: number
    latencyPressure: number
    reasons: string[]
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

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function average(values: number[]) {
  const finite = values.filter(Number.isFinite)
  if (finite.length === 0)
    return 0
  return finite.reduce((sum, value) => sum + value, 0) / finite.length
}

function deriveLatencyPressure(latencyMs: number | null | undefined) {
  if (!Number.isFinite(latencyMs))
    return 0
  const value = Math.max(0, Number(latencyMs))
  if (value <= 120)
    return 0
  if (value >= 2_400)
    return 1
  return clamp01((value - 120) / 2_280)
}

function deriveRetrievalQualitySignals(input: {
  retrieval?: AlicizationMemoryCandidateRetrievalArtifact | null
  competition: AlicizationMemoryCandidateCompetitionArtifact
  unsupportedSpecificityBlockedCount: number
  latencyMs?: number | null
}) {
  const candidates = input.retrieval?.candidates ?? []
  const selected = candidates.filter(item => item.selected)
  const topCandidates = [...candidates]
    .sort((left, right) => right.ranking.finalScore - left.ranking.finalScore)
    .slice(0, 3)
  const topSelectedScores = selected.length > 0
    ? selected.map(item => item.ranking.finalScore)
    : topCandidates.slice(0, 1).map(item => item.ranking.finalScore)
  const topRecallScore = average(topCandidates.map(item => item.ranking.finalScore))
  const selectedRecallScore = average(topSelectedScores)
  const candidateCoverage = input.competition.candidateCount <= 0
    ? 0
    : clamp01(Math.min(input.competition.candidateCount, 6) / 6)
  const selectedCoverage = input.competition.selectedCandidateCount <= 0
    ? 0
    : clamp01(Math.min(input.competition.selectedCandidateCount, 3) / 3)
  const recallReadiness = clamp01(
    selectedRecallScore * 0.46
    + topRecallScore * 0.24
    + candidateCoverage * 0.18
    + selectedCoverage * 0.12,
  )

  const selectedConflictPenalty = average(selected.map(item => item.ranking.conflictPenalty))
  const selectedThreadMatch = average(selected
    .map(item => item.ranking.relationshipThreadMatch)
    .filter((value): value is number => value != null))
  const wrongThreadSuppressionRatio = input.competition.candidateCount <= 0
    ? 0
    : clamp01(input.competition.wrongThreadSuppressedCount / input.competition.candidateCount)
  const conflictCandidateRatio = input.competition.candidateCount <= 0
    ? 0
    : clamp01(input.competition.conflictCandidateIds.length / input.competition.candidateCount)
  const unsupportedSpecificityRatio = input.competition.candidateCount <= 0
    ? 0
    : clamp01(input.unsupportedSpecificityBlockedCount / input.competition.candidateCount)
  const conflictSeverityPenalty = input.competition.conflictSeverity === 'high'
    ? 0.34
    : input.competition.conflictSeverity === 'medium'
      ? 0.2
      : input.competition.conflictSeverity === 'low'
        ? 0.08
        : 0
  const precisionProxy = clamp01(
    0.42
    + selectedRecallScore * 0.34
    + (selectedThreadMatch || 0.55) * 0.18
    - selectedConflictPenalty * 0.24
    - wrongThreadSuppressionRatio * 0.28
    - conflictCandidateRatio * 0.16
    - unsupportedSpecificityRatio * 0.22
    - conflictSeverityPenalty,
  )
  const wrongThreadRisk = clamp01(
    wrongThreadSuppressionRatio * 0.54
    + selectedConflictPenalty * 0.2
    + conflictCandidateRatio * 0.22
    + conflictSeverityPenalty * 0.44
    + unsupportedSpecificityRatio * 0.22,
  )
  const latencyPressure = deriveLatencyPressure(input.latencyMs)

  return {
    recallReadiness,
    precisionProxy,
    wrongThreadRisk,
    latencyPressure,
    conflictCandidateCount: input.competition.conflictCandidateIds.length,
  }
}

function deriveVisibleMemoryGate(input: {
  shouldRecall: boolean
  shouldSurfaceBeforeGate: boolean
  closureDiscipline: ReturnType<typeof deriveAlicizationMemoryClosureDiscipline>
  retrievalQualitySignals: ReturnType<typeof deriveRetrievalQualitySignals>
}) {
  const reasons: string[] = []
  const {
    recallReadiness,
    precisionProxy,
    wrongThreadRisk,
    latencyPressure,
  } = input.retrievalQualitySignals

  if (!input.shouldRecall)
    reasons.push('no-recall-intent')
  if (!input.shouldSurfaceBeforeGate)
    reasons.push('surface-posture-not-open')
  if (input.closureDiscipline.shouldBlockVisibleMemory)
    reasons.push('closure-blocks-visible-memory')
  if (recallReadiness < 0.42)
    reasons.push('recall-readiness-low')
  if (precisionProxy < 0.56)
    reasons.push('precision-proxy-low')
  if (wrongThreadRisk >= 0.38)
    reasons.push('wrong-thread-risk-high')
  if (latencyPressure >= 0.72)
    reasons.push('latency-pressure-high')

  const hardClosed = reasons.includes('no-recall-intent')
    || input.closureDiscipline.allowedSurface === 'none'
    || input.closureDiscipline.surfacePermission === 'no-recall'
  const inwardOnly = hardClosed
    || reasons.includes('closure-blocks-visible-memory')
    || reasons.includes('wrong-thread-risk-high')
    || reasons.includes('precision-proxy-low')
    || reasons.includes('recall-readiness-low')
  const status = hardClosed
    ? 'closed' as const
    : inwardOnly
      ? 'inward-only' as const
      : input.closureDiscipline.allowedSurface === 'gist'
        || input.closureDiscipline.shouldLabelUncertainty
        || latencyPressure >= 0.45
        ? 'gist-only' as const
        : 'open' as const

  if (status === 'gist-only' && reasons.length === 0)
    reasons.push('visible-memory-gist-disciplined')
  if (status === 'open' && reasons.length === 0)
    reasons.push('visible-memory-open')

  return {
    status,
    recallReadiness,
    precisionProxy,
    wrongThreadRisk,
    latencyPressure,
    reasons: compactList(reasons, 8),
  }
}

export function settleAlicizationMemoryTurn(input: {
  context: OrganicMemoryPromptContext
  retrieval?: AlicizationMemoryCandidateRetrievalArtifact | null
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
  const closureDiscipline = deriveAlicizationMemoryClosureDiscipline(ledger)
  const shouldSurfaceBeforeGate = shouldRecall
    && input.speechPosture.shouldSurface
    && input.deliberation.surfacePolicy !== 'internal-only'
    && !closureDiscipline.shouldBlockVisibleMemory
  const retrievalQualitySignals = deriveRetrievalQualitySignals({
    retrieval: input.retrieval ?? null,
    competition: input.competition,
    unsupportedSpecificityBlockedCount,
    latencyMs: input.latencyMs,
  })
  const visibleMemoryGate = deriveVisibleMemoryGate({
    shouldRecall,
    shouldSurfaceBeforeGate,
    closureDiscipline,
    retrievalQualitySignals,
  })
  const shouldSurface = shouldSurfaceBeforeGate
    && (visibleMemoryGate.status === 'open' || visibleMemoryGate.status === 'gist-only')

  return {
    version: 'memory-settlement-v1',
    shouldRecall,
    shouldSurface,
    closure: {
      closureState: closureDiscipline.closureState,
      visibleCarryMode: closureDiscipline.visibleCarryMode,
      retrievalQuality: closureDiscipline.retrievalQuality,
      shouldLabelUncertainty: closureDiscipline.shouldLabelUncertainty,
      surfaceConfidence: Number.isFinite(ledger?.surfaceConfidence)
        ? Number(ledger?.surfaceConfidence)
        : null,
      conflictPressure: closureDiscipline.conflictPressure,
    },
    withheld: compactList([
      input.competition.wrongThreadSuppressedCount > 0 ? 'wrong-thread-suppressed' : null,
      unsupportedSpecificityBlockedCount > 0 ? 'unsafe-specificity-withheld' : null,
      !shouldRecall && input.competition.candidateCount > 0 ? 'present-facing-turn' : null,
      shouldRecall && !shouldSurface ? 'memory-held-inward' : null,
      visibleMemoryGate.status === 'closed' ? 'visible-memory-gate-closed' : null,
      visibleMemoryGate.status === 'inward-only' ? 'visible-memory-gate-inward-only' : null,
      ...closureDiscipline.withheldReasons,
      closureDiscipline.shouldLabelUncertainty ? 'uncertainty-label-required' : null,
    ], 8),
    metrics: {
      recallCandidateCount: input.competition.candidateCount,
      selectedCandidateCount: input.competition.selectedCandidateCount,
      wrongThreadSuppressedCount: input.competition.wrongThreadSuppressedCount,
      unsupportedSpecificityBlockedCount,
      latencyMs: Number.isFinite(input.latencyMs)
        ? Number(input.latencyMs)
        : null,
      ...retrievalQualitySignals,
    },
    visibleMemoryGate,
  }
}
