import type { AlicizationRelationshipOutcomeRecord, AlicizationVisualWatchMode, AlicizationWorldModelSnapshot } from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function countOutcome(
  outcomes: AlicizationProactiveLayeredContext['relationship']['recentProactiveOutcomes'],
  kind: 'positive' | 'reply-within-120s' | 'dismiss' | 'ignored',
) {
  return outcomes.filter(item => item.outcome === kind).length
}

export interface AlicizationHostRhythmModel {
  workMode: 'deep-focus' | 'steady-open' | 'drifting' | 'recovery'
  openingEase: number
  interruptionSensitivity: number
  replyTolerance: number
  narrative: string[]
}

export function buildHostRhythmModel(input: {
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  watchMode: AlicizationVisualWatchMode
  recentRelationshipOutcomes?: AlicizationRelationshipOutcomeRecord[] | null
}) {
  const positiveCount
    = countOutcome(input.context.relationship.recentProactiveOutcomes, 'positive')
      + countOutcome(input.context.relationship.recentProactiveOutcomes, 'reply-within-120s')
  const dismissCount = countOutcome(input.context.relationship.recentProactiveOutcomes, 'dismiss')
  const ignoredCount = countOutcome(input.context.relationship.recentProactiveOutcomes, 'ignored')
  const recentRelationshipOutcomes = input.recentRelationshipOutcomes?.slice(0, 8) ?? []
  const trustLift = recentRelationshipOutcomes.reduce((sum, outcome) => sum + Math.max(0, outcome.trustDelta), 0)
  const trustDamage = recentRelationshipOutcomes.reduce((sum, outcome) => sum + Math.max(0, -outcome.trustDelta), 0)
  const burdenLift = recentRelationshipOutcomes.reduce((sum, outcome) => sum + Math.max(0, outcome.burdenDelta), 0)
  const burdenRelief = recentRelationshipOutcomes.reduce((sum, outcome) => sum + Math.max(0, -outcome.burdenDelta), 0)
  const boundaryLift = recentRelationshipOutcomes.reduce((sum, outcome) => sum + Math.max(0, outcome.boundaryDelta), 0)
  const boundaryPressure = recentRelationshipOutcomes.reduce((sum, outcome) => sum + Math.max(0, -outcome.boundaryDelta), 0)
  const busy
    = input.context.system.inputActivity === 'active'
      || input.context.system.fullscreenLikely
      || input.worldModel.hostState.availability === 'focused'
      || input.worldModel.hostState.availability === 'immersed'

  const openingEase = clamp01(
    (busy ? 0.08 : 0.34)
    + (input.context.relationship.minutesSinceLastUserTurn >= 6 ? 0.16 : 0)
    + ((input.context.system.idleSeconds ?? 0) >= 45 ? 0.14 : 0)
    + (input.watchMode === 'symbiotic-vision' ? 0.06 : 0)
    + positiveCount * 0.08
    + trustLift * 0.14
    + burdenRelief * 0.08
    + boundaryLift * 0.06
    - dismissCount * 0.1
    - ignoredCount * 0.06
    - trustDamage * 0.18
    - burdenLift * 0.12
    - boundaryPressure * 0.1,
  )
  const interruptionSensitivity = clamp01(
    (busy ? 0.34 : 0.12)
    + (input.context.system.cpuUsage >= 70 ? 0.16 : input.context.system.cpuUsage >= 45 ? 0.08 : 0)
    + (input.context.system.fullscreenLikely ? 0.16 : 0)
    + dismissCount * 0.12
    + ignoredCount * 0.08
    + burdenLift * 0.16
    + boundaryPressure * 0.18
    - positiveCount * 0.04
    - trustLift * 0.08
    - burdenRelief * 0.1
    - boundaryLift * 0.08,
  )
  const replyTolerance = clamp01(
    openingEase * 0.42
    + (1 - interruptionSensitivity) * 0.34
    + positiveCount * 0.06
    + trustLift * 0.1
    + burdenRelief * 0.08
    - dismissCount * 0.08
    - ignoredCount * 0.04
    - trustDamage * 0.12
    - boundaryPressure * 0.1
    - burdenLift * 0.1,
  )

  const workMode: AlicizationHostRhythmModel['workMode']
    = busy && interruptionSensitivity >= 0.42
      ? 'deep-focus'
      : input.context.relationship.fatigue >= 60
        || input.worldModel.hostState.availability === 'drifting'
        ? 'recovery'
        : openingEase >= 0.56
          ? 'steady-open'
          : 'drifting'

  return {
    workMode,
    openingEase,
    interruptionSensitivity,
    replyTolerance,
    narrative: [
      `host-rhythm:${workMode}`,
      openingEase >= 0.56 ? 'opening-ease:high' : openingEase >= 0.34 ? 'opening-ease:mid' : 'opening-ease:low',
      interruptionSensitivity >= 0.52 ? 'interrupt-sensitivity:high' : interruptionSensitivity >= 0.32 ? 'interrupt-sensitivity:mid' : 'interrupt-sensitivity:low',
      replyTolerance >= 0.56 ? 'reply-tolerance:high' : replyTolerance >= 0.34 ? 'reply-tolerance:mid' : 'reply-tolerance:low',
    ],
  } satisfies AlicizationHostRhythmModel
}
