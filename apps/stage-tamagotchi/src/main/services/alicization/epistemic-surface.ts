import type {
  AlicizationBeliefRevisionSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

export interface AlicizationEpistemicSurfacePosture {
  coarseObservedProblemHolding: boolean
  requiresRegroundBeforeSurface: boolean
}

function hasConcreteProblemThread(input: {
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
}) {
  return Boolean(
    input.worldModel.activeThread?.unresolved
    && (
      input.worldModel.activeThread.kind === 'debugging'
      || input.worldModel.activeThread.kind === 'change-review'
      || input.context.content.kind === 'error'
      || input.context.content.kind === 'diff'
    ),
  )
}

// Keep observed live problem threads distinct from scenes that require regrounding.
export function buildEpistemicSurfacePosture(input: {
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  beliefRevision?: AlicizationBeliefRevisionSnapshot | null
}): AlicizationEpistemicSurfacePosture {
  const certainty = input.worldModel.epistemicState.certainty
  const contradictionPressure = input.beliefRevision?.contradictionPressure ?? 0
  const groundingNeed = input.beliefRevision?.groundingNeed ?? 0
  const concreteProblemThread = hasConcreteProblemThread(input)

  const coarseObservedProblemHolding
    = certainty === 'observed'
      && concreteProblemThread
      && contradictionPressure < 0.42
      && groundingNeed < 0.62

  const requiresRegroundBeforeSurface
    = certainty === 'uncertain'
      || certainty === 'lingering'
      || contradictionPressure >= 0.42
      || groundingNeed >= 0.62

  return {
    coarseObservedProblemHolding,
    requiresRegroundBeforeSurface,
  }
}
