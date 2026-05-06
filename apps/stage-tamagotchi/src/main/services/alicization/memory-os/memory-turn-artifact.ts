import type { AlicizationTurnRetrievalPolicySnapshot } from '../memory-accessibility-runtime'
import type { OrganicMemoryPromptContext } from '../runtime-soul'
import { deriveAlicizationMemoryCandidateCompetition } from './candidate-competition'
import { deriveAlicizationMemoryCandidateRetrieval } from './candidate-retrieval'
import { deriveAlicizationMemoryDeliberation } from './memory-deliberation'
import { settleAlicizationMemoryTurn } from './memory-settlement'
import { deriveAlicizationMemoryRecallIntent } from './recall-intent'
import { deriveAlicizationMemorySpeechPosture } from './speech-posture'

export interface AlicizationMemoryTurnArtifact {
  version: 'memory-turn-artifact-v1'
  policySnapshotId: string | null
  recallIntent: {
    shouldRecall: boolean
    source: 'recollection-intent' | 'candidate-pressure' | 'none'
    agenda: string[]
    reasonCodes: string[]
  }
  candidates: {
    retrievedFacts: number
    recalledFragments: number
    recalledEpisodes: number
    recalledConversationHistory: number
    recollectedWindows: number
    consolidatedMemories: number
    proceduralMemories: number
    retrievalCandidateIds: string[]
    selectedCandidateIds: string[]
  }
  competition: {
    candidateCount: number
    selectedCandidateCount: number
    wrongThreadSuppressedCount: number
    conflictSeverity: 'none' | 'low' | 'medium' | 'high'
  }
  deliberation: {
    shouldRecall: boolean
    stableCore: string[]
    unsafeDetails: string[]
    surfacePolicy: string | null
    confidence: number | null
    ambiguityPosture: string | null
    whyNow: string | null
    inwardLine: string | null
    followUp: {
      summary: string | null
      preferredTiming: string | null
      intrusionRisk: string | null
      payoffDependency: string | null
    } | null
  }
  speechPosture: {
    shouldSurface: boolean
    surfaceMode: string | null
    placement: string | null
    certainty: string | null
    styleNote: string | null
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

export function buildAlicizationMemoryTurnArtifact(input: {
  context: OrganicMemoryPromptContext
  retrievalPolicySnapshot?: AlicizationTurnRetrievalPolicySnapshot | null
  latencyMs?: number | null
}): AlicizationMemoryTurnArtifact {
  const { context } = input
  const recalledEpisodes = context.recalledEpisodes?.length ?? 0
  const recalledConversationHistory = context.recalledConversationHistory?.length ?? 0
  const recollectedWindows = context.recollectedWindows?.length ?? 0
  const consolidatedMemories = context.consolidatedMemories?.length ?? 0
  const proceduralMemories = context.proceduralMemories?.length ?? 0
  const retrieval = deriveAlicizationMemoryCandidateRetrieval({
    context,
  })
  const competition = deriveAlicizationMemoryCandidateCompetition({
    context,
    retrieval,
  })
  const recallIntent = deriveAlicizationMemoryRecallIntent({
    context,
    retrievalPolicySnapshot: input.retrievalPolicySnapshot,
    candidateCount: competition.candidateCount,
    selectedCandidateCount: competition.selectedCandidateCount,
  })
  const memoryDeliberation = deriveAlicizationMemoryDeliberation({
    context,
    fallbackShouldRecall: recallIntent.shouldRecall,
  })
  const speechPosture = deriveAlicizationMemorySpeechPosture({
    context,
  })
  const settlement = settleAlicizationMemoryTurn({
    context,
    recallIntent,
    competition,
    deliberation: memoryDeliberation,
    speechPosture,
    latencyMs: input.latencyMs,
  })

  return {
    version: 'memory-turn-artifact-v1',
    policySnapshotId: input.retrievalPolicySnapshot?.plan.prewarmKey ?? null,
    recallIntent,
    candidates: {
      retrievedFacts: context.retrievedFacts.length,
      recalledFragments: context.recalledFragments.length,
      recalledEpisodes,
      recalledConversationHistory,
      recollectedWindows,
      consolidatedMemories,
      proceduralMemories,
      retrievalCandidateIds: retrieval.candidates.map(item => item.id).slice(0, 32),
      selectedCandidateIds: retrieval.selectedCandidateIds.slice(0, 32),
    },
    competition,
    deliberation: {
      ...memoryDeliberation,
    },
    speechPosture,
    withheld: settlement.withheld,
    metrics: settlement.metrics,
  }
}
