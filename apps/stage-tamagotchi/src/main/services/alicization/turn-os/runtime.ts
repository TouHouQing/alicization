import type { AlicizationMindTurnGovernance } from '../../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'
import type { AlicizationMemoryTurnArtifact } from '../memory-os/memory-turn-artifact'
import type { AlicizationSelfEvolutionVersionRuntimeSnapshot } from '../self-evolution/version-runtime'
import type { AlicizationVisibleReplyRealizationArtifact } from '../visible-reply/facade'
import type {
  AlicizationTurnGraph,
  AlicizationTurnGraphStage,
  AlicizationTurnGraphStageSettlement,
} from './turn-graph'

import {
  alicizationTurnGraphCanonicalStageOrder,
  buildAlicizationTurnGraphFromSettlements,
  createAlicizationTurnGraphStageSettlementForRuntime,
} from './turn-graph'

export interface AlicizationTurnRuntimeStageSummary {
  status?: 'completed' | 'skipped' | 'blocked'
  inputSummary?: Array<string | null | undefined>
  outputSummary?: Array<string | null | undefined>
  reasonCodes?: Array<string | null | undefined>
}

export interface AlicizationTurnRuntimeSelfRevisionConsumption {
  version: 'turn-self-revision-consumption-v1'
  activeCandidateId: string | null
  activePatchId: string | null
  activePatchDecisionTraceId: string | null
  consumedLanes: string[]
  reasonCodes: string[]
}

export interface AlicizationTurnRuntimeContext {
  cardId: string
  turnId: string
  sessionId?: string | null
  decisionTraceId?: string | null
  startedAt: number
  stageSettlements: AlicizationTurnGraphStageSettlement[]
  activeSelfEvolutionSnapshot: AlicizationSelfEvolutionVersionRuntimeSnapshot | null
  selfRevisionConsumption: AlicizationTurnRuntimeSelfRevisionConsumption
}

function normalizeLine(raw: unknown, maxChars = 180) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
    : ''
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 12) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeLine(value, 180)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function errorToMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : String(error ?? 'unknown-error')
}

function buildSelfRevisionConsumption(
  snapshot: AlicizationSelfEvolutionVersionRuntimeSnapshot | null,
): AlicizationTurnRuntimeSelfRevisionConsumption {
  const activeCandidate = snapshot?.candidates.find(candidate => candidate.id === snapshot.activeCandidateId)
    ?? null
  const activePatch = activeCandidate?.patch ?? null
  return {
    version: 'turn-self-revision-consumption-v1',
    activeCandidateId: activeCandidate?.id ?? null,
    activePatchId: activePatch?.id ?? null,
    activePatchDecisionTraceId: activePatch?.decisionTraceId ?? activeCandidate?.decisionTraceId ?? null,
    consumedLanes: [...(activePatch?.lanes ?? [])],
    reasonCodes: uniqueList([
      activeCandidate ? 'turn-os:self-revision-active-version-consumed' : 'turn-os:self-revision-no-active-version',
      ...(activePatch?.reasonCodes ?? []),
    ], 16),
  }
}

function replaceStageSettlement(
  settlements: AlicizationTurnGraphStageSettlement[],
  next: AlicizationTurnGraphStageSettlement,
) {
  const index = settlements.findIndex(settlement => settlement.stage === next.stage)
  if (index < 0)
    return [...settlements, next]
  return [
    ...settlements.slice(0, index),
    next,
    ...settlements.slice(index + 1),
  ]
}

function buildDefaultPendingSettlements(now: number) {
  return alicizationTurnGraphCanonicalStageOrder.map(stage =>
    createAlicizationTurnGraphStageSettlementForRuntime({
      stage,
      status: 'pending',
      startedAt: stage === 'encounter' ? now : null,
      endedAt: null,
      reasonCodes: ['turn-os:pending'],
    }),
  )
}

export function createAlicizationTurnRuntime(options: {
  now?: () => number
} = {}) {
  const now = options.now ?? (() => Date.now())

  function beginTurn(input: {
    cardId: string
    turnId: string
    sessionId?: string | null
    governance?: Pick<AlicizationMindTurnGovernance, 'decisionTraceId'> | null
    activeSelfEvolutionSnapshot?: AlicizationSelfEvolutionVersionRuntimeSnapshot | null
  }): AlicizationTurnRuntimeContext {
    const startedAt = now()
    const activeSelfEvolutionSnapshot = input.activeSelfEvolutionSnapshot ?? null
    return {
      cardId: input.cardId,
      turnId: input.turnId,
      sessionId: input.sessionId ?? null,
      decisionTraceId: input.governance?.decisionTraceId ?? null,
      startedAt,
      stageSettlements: buildDefaultPendingSettlements(startedAt),
      activeSelfEvolutionSnapshot,
      selfRevisionConsumption: buildSelfRevisionConsumption(activeSelfEvolutionSnapshot),
    }
  }

  function settleStage(
    context: AlicizationTurnRuntimeContext,
    stage: AlicizationTurnGraphStage,
    summary: AlicizationTurnRuntimeStageSummary & {
      startedAt?: number | null
      endedAt?: number | null
    } = {},
  ) {
    const endedAt = summary.endedAt ?? now()
    const previous = context.stageSettlements.find(settlement => settlement.stage === stage)
    const startedAt = summary.startedAt
      ?? previous?.startedAt
      ?? endedAt
    context.stageSettlements = replaceStageSettlement(
      context.stageSettlements,
      createAlicizationTurnGraphStageSettlementForRuntime({
        stage,
        status: summary.status ?? 'completed',
        startedAt,
        endedAt,
        inputSummary: summary.inputSummary,
        outputSummary: summary.outputSummary,
        reasonCodes: summary.reasonCodes,
      }),
    )
  }

  function settleSurface(input: {
    context: AlicizationTurnRuntimeContext
    surface: AlicizationVisibleReplyRealizationArtifact | null
    startedAt?: number | null
    endedAt?: number | null
  }) {
    settleStage(input.context, 'surface', {
      status: input.surface
        ? (input.surface.closure?.status === 'blocked' ? 'blocked' : 'completed')
        : 'blocked',
      startedAt: input.startedAt ?? input.context.stageSettlements.find(settlement => settlement.stage === 'surface')?.startedAt ?? null,
      endedAt: input.endedAt,
      outputSummary: input.surface
        ? [
            `expected=${input.surface.expectedAuthority}`,
            `actual=${input.surface.actualAuthority ?? 'none'}`,
            `mode=${input.surface.mode}`,
            `closure=${input.surface.closure?.status ?? 'none'}`,
          ]
        : ['visible-reply-surface-missing'],
      reasonCodes: input.surface
        ? [
            ...(input.surface.closure?.reasonCodes ?? []),
            ...(input.surface.blockedReasons ?? []),
          ]
        : ['visible-reply-surface-missing'],
    })
  }

  function settleDelivery(input: {
    context: AlicizationTurnRuntimeContext
    surface: AlicizationVisibleReplyRealizationArtifact | null
    startedAt?: number | null
    endedAt?: number | null
  }) {
    settleStage(input.context, 'delivery', {
      status: input.surface ? 'completed' : 'blocked',
      startedAt: input.startedAt ?? input.context.stageSettlements.find(settlement => settlement.stage === 'delivery')?.startedAt ?? null,
      endedAt: input.endedAt,
      outputSummary: input.surface
        ? [
            `mode=${input.surface.mode}`,
            input.surface.visibleText ? 'visible-text-settled' : 'no-visible-text',
          ]
        : ['delivery-blocked-without-visible-surface'],
      reasonCodes: input.surface ? [] : ['delivery-blocked-without-visible-surface'],
    })
  }

  function failStage(
    context: AlicizationTurnRuntimeContext,
    stage: AlicizationTurnGraphStage,
    error: unknown,
    summary: AlicizationTurnRuntimeStageSummary & {
      startedAt?: number | null
      endedAt?: number | null
    } = {},
  ) {
    const endedAt = summary.endedAt ?? now()
    const previous = context.stageSettlements.find(settlement => settlement.stage === stage)
    const startedAt = summary.startedAt
      ?? previous?.startedAt
      ?? endedAt
    context.stageSettlements = replaceStageSettlement(
      context.stageSettlements,
      createAlicizationTurnGraphStageSettlementForRuntime({
        stage,
        status: 'failed',
        startedAt,
        endedAt,
        inputSummary: summary.inputSummary,
        outputSummary: summary.outputSummary,
        reasonCodes: summary.reasonCodes,
        error: errorToMessage(error),
      }),
    )
  }

  async function runStage<T>(
    context: AlicizationTurnRuntimeContext,
    stage: AlicizationTurnGraphStage,
    input: AlicizationTurnRuntimeStageSummary & {
      run: () => Promise<T> | T
      summarizeOutput?: (value: T) => AlicizationTurnRuntimeStageSummary | void
      skipped?: boolean
    },
  ) {
    const startedAt = now()
    try {
      const value = await input.run()
      const output = input.summarizeOutput?.(value) ?? {}
      settleStage(context, stage, {
        status: input.skipped ? 'skipped' : output.status,
        startedAt,
        inputSummary: input.inputSummary,
        outputSummary: output.outputSummary,
        reasonCodes: uniqueList([
          ...(input.reasonCodes ?? []),
          ...(output.reasonCodes ?? []),
        ], 16),
      })
      return value
    }
    catch (error) {
      failStage(context, stage, error, {
        startedAt,
        inputSummary: input.inputSummary,
        reasonCodes: input.reasonCodes,
      })
      throw error
    }
  }

  function finalizeTurn(input: {
    context: AlicizationTurnRuntimeContext
    prepared: AlicizationPreparedMainChatExecutionResult
    actionObligation?: {
      kind?: string | null
      summary?: string | null
      source?: string | null
    } | null
    memory: AlicizationMemoryTurnArtifact | null
    surface?: AlicizationVisibleReplyRealizationArtifact | null
    routingRequired: boolean
  }): AlicizationTurnGraph {
    return buildAlicizationTurnGraphFromSettlements({
      prepared: input.prepared,
      cardId: input.context.cardId,
      turnId: input.context.turnId,
      actionObligation: input.actionObligation,
      memory: input.memory,
      surface: input.surface ?? null,
      routingRequired: input.routingRequired,
      stageSettlements: input.context.stageSettlements,
      activeSelfRevision: {
        patchId: input.context.selfRevisionConsumption.activePatchId,
        decisionTraceId: input.context.selfRevisionConsumption.activePatchDecisionTraceId,
        candidateId: input.context.selfRevisionConsumption.activeCandidateId,
      },
    })
  }

  return {
    beginTurn,
    runStage,
    settleStage,
    settleSurface,
    settleDelivery,
    failStage,
    finalizeTurn,
  }
}
