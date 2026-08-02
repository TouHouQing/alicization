import type { SelfEvolutionRepairClosureLike as SelfEvolutionRepairOutcomeClosureLike } from './performance-visualizer-self-evolution-repair-outcome'

import { buildSelfEvolutionRepairOutcome } from './performance-visualizer-self-evolution-repair-outcome'

interface SelfEvolutionRepairNextActionLike {
  kind: string
  label: string
  detail: string
  targetType: 'evidence' | 'trace' | 'event' | 'snapshot'
  targetId: string
}

interface SelfEvolutionRepairFollowupNavigationLike {
  activeSurfaceKey: string
  scrollTargetId: string | null
}

interface SelfEvolutionRepairActionClosureLike {
  isClosed: boolean
  sessionCovered?: boolean
  hasFreshValidationSnapshot?: boolean
  samePatternStillPresent?: boolean
  prosodyAuthorityRelevant?: boolean
  prosodyAuthorityValidated?: boolean | null
  summaryLines: string[]
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
}

export interface SelfEvolutionRepairActionFeedback {
  tone: 'success' | 'progress'
  summaryLine: string
  detailLine: string
  supportingLines?: string[]
}

function normalizeRepairOutcomeClosure(
  closure: SelfEvolutionRepairActionClosureLike | null,
): SelfEvolutionRepairOutcomeClosureLike | null {
  if (!closure)
    return null

  return {
    isClosed: closure.isClosed,
    sessionCovered: closure.sessionCovered ?? false,
    hasFreshValidationSnapshot: closure.hasFreshValidationSnapshot ?? false,
    samePatternStillPresent: closure.samePatternStillPresent ?? false,
    prosodyAuthorityRelevant: closure.prosodyAuthorityRelevant ?? false,
    prosodyAuthorityValidated: closure.prosodyAuthorityValidated ?? null,
    summaryLines: closure.summaryLines,
    bodyContinuityPhase: closure.bodyContinuityPhase,
    rendererRejoinSurfaceKey: closure.rendererRejoinSurfaceKey,
    survivingVisibleLane: closure.survivingVisibleLane,
  }
}

function buildClosureFacts(closure: SelfEvolutionRepairActionClosureLike | null) {
  return [
    `repairClosure.isClosed=${closure?.isClosed ?? 'n/a'}`,
    `bodyContinuityPhase=${closure?.bodyContinuityPhase ?? 'n/a'}`,
    `rendererRejoinSurfaceKey=${closure?.rendererRejoinSurfaceKey ?? 'n/a'}`,
    `survivingVisibleLane=${closure?.survivingVisibleLane ?? 'n/a'}`,
  ]
}

export function buildSelfEvolutionRepairActionFeedback(input: {
  executedAction: SelfEvolutionRepairNextActionLike | null
  followupNavigation: SelfEvolutionRepairFollowupNavigationLike | null
  repairClosureBefore: SelfEvolutionRepairActionClosureLike | null
  repairClosureAfter: SelfEvolutionRepairActionClosureLike | null
  snapshotCountBefore: number
  snapshotCountAfter: number
}): SelfEvolutionRepairActionFeedback | null {
  const action = input.executedAction
  if (!action)
    return null

  const repairOutcome = buildSelfEvolutionRepairOutcome({
    repairClosureBefore: normalizeRepairOutcomeClosure(input.repairClosureBefore),
    repairClosureAfter: normalizeRepairOutcomeClosure(input.repairClosureAfter),
  })
  const closureJustClosed = !input.repairClosureBefore?.isClosed
    && input.repairClosureAfter?.isClosed === true

  if (closureJustClosed) {
    return {
      tone: 'success',
      summaryLine: 'repairClosure: open -> closed',
      detailLine: repairOutcome?.detailLine ?? 'repair outcome unavailable',
      supportingLines: buildClosureFacts(input.repairClosureAfter),
    }
  }

  if (action.targetType === 'snapshot' && input.snapshotCountAfter > input.snapshotCountBefore) {
    return {
      tone: 'progress',
      summaryLine: `snapshotCount: ${input.snapshotCountBefore} -> ${input.snapshotCountAfter}`,
      detailLine: repairOutcome?.detailLine
        ?? `repairClosure.isClosed=${input.repairClosureAfter?.isClosed ?? 'n/a'}`,
      supportingLines: buildClosureFacts(input.repairClosureAfter),
    }
  }

  if (input.followupNavigation?.activeSurfaceKey) {
    return {
      tone: 'progress',
      summaryLine: `nextTarget=${input.followupNavigation.activeSurfaceKey}`,
      detailLine: [
        `executedAction=${action.kind}`,
        `executedTarget=${action.targetType}:${action.targetId}`,
        `scrollTargetId=${input.followupNavigation.scrollTargetId ?? 'n/a'}`,
      ].join('; '),
      supportingLines: buildClosureFacts(input.repairClosureAfter),
    }
  }

  return {
    tone: 'progress',
    summaryLine: `executedAction=${action.kind}`,
    detailLine: `executedTarget=${action.targetType}:${action.targetId}; followupTarget=n/a`,
    supportingLines: buildClosureFacts(input.repairClosureAfter),
  }
}
