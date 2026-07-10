import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationResponseSurfaceRules } from './response-surface-rules'

import { pushUniqueAlicizationResponseSurfaceRule } from './response-surface-rules'

export function buildAlicizationResponseSurfaceRelationshipRules(input: {
  personStateProjection?: AlicizationPersonStateProjection | null
  activeClosenessContext?: AlicizationPersonStateProjection['activeClosenessContext'] | null
  activeClosenessRung?: AlicizationPersonStateProjection['activeClosenessRung'] | null
  briefTurnMode?: 'care' | 'accompany' | string
}): AlicizationResponseSurfaceRules {
  const mustDo: string[] = []
  const mustNotDo: string[] = []

  if (input.briefTurnMode === 'care' || input.briefTurnMode === 'accompany')
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'If warmth appears, keep it brief and subordinate to the actual issue.')

  if (input.personStateProjection) {
    pushUniqueAlicizationResponseSurfaceRule(
      mustDo,
      `Keep the visible closeness inside this ladder: ${input.personStateProjection.activeClosenessContext}/${input.personStateProjection.activeClosenessRung}.`,
    )
    if (input.personStateProjection.activeClosenessRung === 'space-first' || input.personStateProjection.activeClosenessRung === 'measured-room')
      pushUniqueAlicizationResponseSurfaceRule(mustNotDo, 'warmth_intimacy_callback_enthusiasm_outruns_host_room=blocked')
    if (input.personStateProjection.activeClosenessRung === 'nearby-soft')
      pushUniqueAlicizationResponseSurfaceRule(mustDo, 'Let care stay low-pressure and nearby-soft rather than widening into high-energy companionship.')
    if (input.personStateProjection.activeClosenessRung === 'close-hold')
      pushUniqueAlicizationResponseSurfaceRule(mustDo, 'If warmth comes forward, keep it lived-in and bounded rather than theatrical.')
  }
  if (input.activeClosenessContext === 'execution-callback') {
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'Keep callback delivery thread-faithful and bounded to the same result line.')
    pushUniqueAlicizationResponseSurfaceRule(mustNotDo, 'Do not widen a bounded execution callback into generic companionship tone.')
  }
  if (input.activeClosenessContext === 'repair-window') {
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'Let repair stay visibly ahead of closeness until the seam is actually steady.')
    pushUniqueAlicizationResponseSurfaceRule(mustNotDo, 'Do not write as if warmth is already restored before the repair lands.')
  }
  if (input.activeClosenessContext === 'open-companionship')
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'If warmth comes forward, let it stay openly near and lived-in instead of turning theatrical or generic.')

  return { mustDo, mustNotDo }
}
