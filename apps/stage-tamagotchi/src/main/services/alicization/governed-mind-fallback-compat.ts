import type { AlicizationMindTurnGovernanceLike } from '@proj-alicization/stage-shared'

import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'

function coerceGovernedMindFallbackTruthState(
  truthState: AlicizationMindTurnGovernance['truthState'] | null | undefined,
): AlicizationMindTurnGovernanceLike['truthState'] {
  // NOTICE: dialogue-grounded is a valid runtime truth state in Alicization,
  // but the governed fallback surface currently groups non-live dialogue truth
  // into the same conservative bucket as remembered carry. Keep that mapping
  // explicit at the call boundary instead of weakening types with `any`.
  if (truthState === 'dialogue-grounded')
    return 'remembered'
  return truthState ?? 'uncertain'
}

export function coerceAlicizationGovernanceForMindFallback(
  governance: AlicizationMindTurnGovernance,
): AlicizationMindTurnGovernanceLike {
  return {
    ...governance,
    truthState: coerceGovernedMindFallbackTruthState(governance.truthState),
    mindTurnFrame: governance.mindTurnFrame
      ? {
          ...governance.mindTurnFrame,
          world: {
            ...governance.mindTurnFrame.world,
            truthState: coerceGovernedMindFallbackTruthState(
              governance.mindTurnFrame.world.truthState,
            ),
          },
        }
      : governance.mindTurnFrame,
  }
}
