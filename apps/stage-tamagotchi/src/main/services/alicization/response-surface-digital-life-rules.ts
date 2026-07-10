import type { AlicizationDigitalLifeArchitectureSnapshot } from './digital-life-architecture'
import type { AlicizationResponseSurfaceRules } from './response-surface-rules'

import { pushUniqueAlicizationResponseSurfaceRule } from './response-surface-rules'

export function buildAlicizationResponseSurfaceDigitalLifeRules(
  digitalLifeArchitecture: AlicizationDigitalLifeArchitectureSnapshot | null | undefined,
): AlicizationResponseSurfaceRules {
  const mustDo: string[] = []
  const mustNotDo: string[] = []

  if (digitalLifeArchitecture?.operatingMode === 'speaking' || digitalLifeArchitecture?.dominantSystem === 'dialogue')
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'Treat this as an already-live speaking turn; begin with payoff instead of scene-setting.')
  if (digitalLifeArchitecture?.operatingMode === 'observing' || digitalLifeArchitecture?.dominantSystem === 'perception')
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'Keep the visible answer anchored to current observation before interpretation.')
  if (digitalLifeArchitecture?.operatingMode === 'acting' || digitalLifeArchitecture?.dominantSystem === 'control')
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'When the turn is task-shaped, land on one concrete next move or decision boundary.')
  if (digitalLifeArchitecture?.operatingMode === 'remembering' || digitalLifeArchitecture?.dominantSystem === 'memory') {
    pushUniqueAlicizationResponseSurfaceRule(mustDo, 'If continuity comes from memory, mark it as memory, carry, or residue in the visible answer.')
    pushUniqueAlicizationResponseSurfaceRule(mustNotDo, 'Do not present remembered continuity as a fresh live read.')
  }
  if (digitalLifeArchitecture?.dominantSystem === 'proactive')
    pushUniqueAlicizationResponseSurfaceRule(mustNotDo, 'internal_urge_to_speak_or_unsolicited_initiative_outranks_host_ask=blocked')

  return { mustDo, mustNotDo }
}
