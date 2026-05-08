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
export type AlicizationTurnGraphStageStatus = 'pending' | 'completed' | 'blocked' | 'failed' | 'skipped'

export interface AlicizationTurnGraphStageSettlement {
  version: 'turn-graph-stage-settlement-v1'
  stage: AlicizationTurnGraphStage
  status: AlicizationTurnGraphStageStatus
  startedAt: number | null
  endedAt: number | null
  latencyMs: number | null
  inputSummary: string[]
  outputSummary: string[]
  reasonCodes: string[]
  error: string | null
}

export interface AlicizationTurnGraphClosure {
  version: 'turn-graph-closure-v1'
  status: 'complete' | 'incomplete'
  completedStages: AlicizationTurnGraphStage[]
  missingStages: AlicizationTurnGraphStage[]
  blockedStages: AlicizationTurnGraphStage[]
  failedStages: AlicizationTurnGraphStage[]
  closureCoverage: number
  firstIncompleteStage: AlicizationTurnGraphStage | null
}

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
    activeSelfRevisionPatchId: string | null
    activeSelfRevisionDecisionTraceId: string | null
    activeSelfEvolutionCandidateId: string | null
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
  stageSettlements: AlicizationTurnGraphStageSettlement[]
  closure: AlicizationTurnGraphClosure
}

function normalizeSummaryLines(values: Array<string | null | undefined>, limit = 6) {
  const result: string[] = []
  for (const value of values) {
    const normalized = typeof value === 'string'
      ? value.trim().replace(/\s+/g, ' ')
      : ''
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized.slice(0, 220))
    if (result.length >= limit)
      break
  }
  return result
}

function createStageSettlement(input: {
  stage: AlicizationTurnGraphStage
  status: AlicizationTurnGraphStageStatus
  startedAt?: number | null
  endedAt?: number | null
  latencyMs?: number | null
  inputSummary?: Array<string | null | undefined>
  outputSummary?: Array<string | null | undefined>
  reasonCodes?: Array<string | null | undefined>
  error?: string | null
}): AlicizationTurnGraphStageSettlement {
  const startedAt = Number.isFinite(input.startedAt) ? Number(input.startedAt) : null
  const endedAt = Number.isFinite(input.endedAt) ? Number(input.endedAt) : null
  const latencyMs = Number.isFinite(input.latencyMs)
    ? Math.max(0, Number(input.latencyMs))
    : startedAt != null && endedAt != null
      ? Math.max(0, endedAt - startedAt)
      : null
  return {
    version: 'turn-graph-stage-settlement-v1',
    stage: input.stage,
    status: input.status,
    startedAt,
    endedAt,
    latencyMs,
    inputSummary: normalizeSummaryLines(input.inputSummary ?? []),
    outputSummary: normalizeSummaryLines(input.outputSummary ?? []),
    reasonCodes: normalizeSummaryLines(input.reasonCodes ?? [], 10),
    error: input.error ?? null,
  }
}

function buildTurnGraphClosure(settlements: AlicizationTurnGraphStageSettlement[]): AlicizationTurnGraphClosure {
  const settlementByStage = new Map(settlements.map(settlement => [settlement.stage, settlement]))
  const completedStages = alicizationTurnGraphCanonicalStageOrder.filter((stage) => {
    const status = settlementByStage.get(stage)?.status
    return status === 'completed' || status === 'skipped'
  })
  const blockedStages = alicizationTurnGraphCanonicalStageOrder.filter(stage => settlementByStage.get(stage)?.status === 'blocked')
  const failedStages = alicizationTurnGraphCanonicalStageOrder.filter(stage => settlementByStage.get(stage)?.status === 'failed')
  const missingStages = alicizationTurnGraphCanonicalStageOrder.filter((stage) => {
    const status = settlementByStage.get(stage)?.status
    return status !== 'completed' && status !== 'skipped'
  })
  const closureCoverage = Number((completedStages.length / alicizationTurnGraphCanonicalStageOrder.length).toFixed(2))

  return {
    version: 'turn-graph-closure-v1',
    status: missingStages.length === 0 ? 'complete' : 'incomplete',
    completedStages,
    missingStages,
    blockedStages,
    failedStages,
    closureCoverage,
    firstIncompleteStage: missingStages[0] ?? null,
  }
}

export function buildAlicizationTurnGraphFromSettlements(input: {
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
  stageSettlements: AlicizationTurnGraphStageSettlement[]
  activeSelfRevision?: {
    patchId?: string | null
    decisionTraceId?: string | null
    candidateId?: string | null
  } | null
}): AlicizationTurnGraph {
  const stageByName = new Map(input.stageSettlements.map(settlement => [settlement.stage, settlement]))
  const orderedSettlements = alicizationTurnGraphCanonicalStageOrder.map((stageName) => {
    return stageByName.get(stageName)
      ?? createStageSettlement({
        stage: stageName,
        status: 'pending',
        reasonCodes: ['turn-os-stage-not-settled'],
      })
  })
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
      activeSelfRevisionPatchId: input.activeSelfRevision?.patchId ?? null,
      activeSelfRevisionDecisionTraceId: input.activeSelfRevision?.decisionTraceId ?? null,
      activeSelfEvolutionCandidateId: input.activeSelfRevision?.candidateId ?? null,
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
    stageSettlements: orderedSettlements,
    closure: buildTurnGraphClosure(orderedSettlements),
  }
}

export function createAlicizationTurnGraphStageSettlementForRuntime(input: {
  stage: AlicizationTurnGraphStage
  status: AlicizationTurnGraphStageStatus
  startedAt?: number | null
  endedAt?: number | null
  latencyMs?: number | null
  inputSummary?: Array<string | null | undefined>
  outputSummary?: Array<string | null | undefined>
  reasonCodes?: Array<string | null | undefined>
  error?: string | null
}) {
  return createStageSettlement(input)
}

export function isAlicizationTurnGraphClosed(turnGraph: AlicizationTurnGraph | null | undefined) {
  return turnGraph?.version === 'turn-graph-v1'
    && turnGraph.closure?.status === 'complete'
    && alicizationTurnGraphCanonicalStageOrder.every(stage =>
      turnGraph.stageSettlements?.some(settlement =>
        settlement.stage === stage
        && (settlement.status === 'completed' || settlement.status === 'skipped'),
      ),
    )
}
