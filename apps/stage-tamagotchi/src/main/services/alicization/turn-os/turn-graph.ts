import type { AlicizationMindTurnGovernance } from '../../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'
import type { AlicizationMemoryTurnArtifact } from '../memory-os/memory-turn-artifact'
import type { AlicizationVisibleReplyRealizationArtifact } from '../visible-reply/facade'

export const alicizationTurnGraphCanonicalStageOrder = [
  'encounter',
  'conscious-frame',
  'obligation',
  'memory',
  'deliberation',
  'surface',
  'delivery',
  'learning',
  'telemetry',
] as const

export type AlicizationTurnGraphStage = typeof alicizationTurnGraphCanonicalStageOrder[number]

export interface AlicizationTurnGraph {
  version: 'turn-graph-v1'
  ids: {
    cardId: string
    sessionId: string | null
    turnId: string
    decisionTraceId: string | null
  }
  encounter: {
    actionKind: string
    routingRequired: boolean
    hasVisualGrounding: boolean
  }
  consciousFrame: {
    turnMode: AlicizationMindTurnGovernance['turnMode'] | null
    personaKernelMode: AlicizationMindTurnGovernance['personaKernelMode'] | null
    answerIntent: string | null
    focusAnchor: string | null
  }
  obligation: {
    kind: string | null
    summary: string | null
    source: string | null
  }
  memory: AlicizationMemoryTurnArtifact | null
  deliberation: {
    replyAuthority: string | null
    replyExecutionMode: string | null
  }
  surface: AlicizationVisibleReplyRealizationArtifact | null
  delivery: {
    waitForTools: boolean
    toolCount: number
  }
  learning: {
    selfEvolutionKernelVersion: string | null
    nextLearningAction: string | null
    memoryOutcome: {
      usedCandidateIds: string[]
      surfacedCandidateIds: string[]
      suppressedCandidateIds: string[]
      wrongThreadCandidateIds: string[]
      conflictCandidateIds: string[]
      feedbackSignal: 'pending' | 'confirmed' | 'corrected' | 'rejected' | null
    }
  }
  telemetry: {
    canonicalStageOrder: AlicizationTurnGraphStage[]
    phaseOrder: string[]
  }
}

export function buildAlicizationTurnGraph(input: {
  prepared: AlicizationPreparedMainChatExecutionResult
  cardId: string
  turnId: string
  actionObligation?: {
    kind?: string | null
    summary?: string | null
    source?: string | null
  } | null
  memory: AlicizationMemoryTurnArtifact | null
  surface?: AlicizationVisibleReplyRealizationArtifact | null
  routingRequired: boolean
}): AlicizationTurnGraph {
  const governance = input.prepared.governance ?? null
  const selfEvolution = input.prepared.organicMemoryContext?.selfEvolution ?? null

  return {
    version: 'turn-graph-v1',
    ids: {
      cardId: input.cardId,
      sessionId: input.prepared.conversationSessionId,
      turnId: input.turnId,
      decisionTraceId: governance?.decisionTraceId ?? null,
    },
    encounter: {
      actionKind: input.actionObligation?.kind ?? 'unknown',
      routingRequired: input.routingRequired,
      hasVisualGrounding: input.prepared.hasVisualGrounding,
    },
    consciousFrame: {
      turnMode: governance?.turnMode ?? null,
      personaKernelMode: governance?.personaKernelMode ?? null,
      answerIntent: governance?.answerIntent ?? null,
      focusAnchor: governance?.focusAnchor ?? null,
    },
    obligation: {
      kind: input.actionObligation?.kind ?? null,
      summary: input.actionObligation?.summary ?? null,
      source: input.actionObligation?.source ?? null,
    },
    memory: input.memory,
    deliberation: {
      replyAuthority: input.prepared.replyRealization?.expectedVisibleReplyAuthority ?? null,
      replyExecutionMode: input.prepared.replyExecutionPlan?.preferredMode ?? null,
    },
    surface: input.surface ?? null,
    delivery: {
      waitForTools: input.prepared.waitForTools,
      toolCount: input.prepared.tools?.length ?? 0,
    },
    learning: {
      selfEvolutionKernelVersion: selfEvolution?.version ?? null,
      nextLearningAction: selfEvolution?.nextLearningAction ?? null,
      memoryOutcome: {
        usedCandidateIds: input.memory?.candidates.selectedCandidateIds ?? [],
        surfacedCandidateIds: input.memory?.visibleMemoryGate.status === 'open' || input.memory?.visibleMemoryGate.status === 'gist-only'
          ? input.memory.candidates.selectedCandidateIds
          : [],
        suppressedCandidateIds: input.memory?.visibleMemoryGate.status === 'closed' || input.memory?.visibleMemoryGate.status === 'inward-only'
          ? input.memory.candidates.selectedCandidateIds
          : [],
        wrongThreadCandidateIds: input.memory?.competition.wrongThreadCandidateIds ?? [],
        conflictCandidateIds: input.memory?.competition.conflictCandidateIds ?? [],
        feedbackSignal: 'pending',
      },
    },
    telemetry: {
      canonicalStageOrder: [...alicizationTurnGraphCanonicalStageOrder],
      phaseOrder: input.prepared.sessionTrace.phaseOrder ?? [],
    },
  }
}

export function attachAlicizationTurnGraphSurface(input: {
  turnGraph: AlicizationTurnGraph
  surface: AlicizationVisibleReplyRealizationArtifact | null
}) {
  return {
    ...input.turnGraph,
    surface: input.surface ?? null,
  } satisfies AlicizationTurnGraph
}
