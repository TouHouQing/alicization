import type {
  AlicizationEntityWorldModelSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationRelationshipOutcomeRecord,
  AlicizationSelfContinuitySnapshot,
  AlicizationVisualWatchMode,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 48) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, maxChars)
}

function createDefaultSelfContinuity(now: number): AlicizationSelfContinuitySnapshot {
  return {
    attachmentMode: 'nearby',
    initiativeTemperament: 'balanced',
    perceptionTrust: 0.54,
    relationshipTrust: 0.48,
    guardingTendency: 0.46,
    misreadBurden: 0.18,
    carryOverDesire: 0.22,
    narrative: [],
    updatedAt: now,
  }
}

export function buildSelfContinuity(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  entityWorld: AlicizationEntityWorldModelSnapshot
  goalStack: AlicizationGoalStackSnapshot
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  recentRelationshipOutcomes?: AlicizationRelationshipOutcomeRecord[] | null
  previous?: AlicizationSelfContinuitySnapshot | null
  watchMode: AlicizationVisualWatchMode
}): AlicizationSelfContinuitySnapshot {
  const previous = input.previous ?? createDefaultSelfContinuity(input.now)
  const recentOutcomes = input.context.relationship.recentProactiveOutcomes.slice(-4)
  const recentRelationshipOutcomes = input.recentRelationshipOutcomes?.slice(0, 6) ?? []
  const positiveCount = recentOutcomes.filter(item => item.outcome === 'positive' || item.outcome === 'reply-within-120s').length
  const dismissCount = recentOutcomes.filter(item => item.outcome === 'dismiss').length
  const ignoredCount = recentOutcomes.filter(item => item.outcome === 'ignored').length
  const relationshipTrustLift = recentRelationshipOutcomes.reduce((sum, outcome) => sum + Math.max(0, outcome.trustDelta), 0)
  const relationshipTrustDamage = recentRelationshipOutcomes.reduce((sum, outcome) => sum + Math.max(0, -outcome.trustDelta), 0)
  const boundaryRespectLift = recentRelationshipOutcomes.reduce((sum, outcome) => sum + Math.max(0, outcome.boundaryDelta), 0)
  const boundaryViolationPressure = recentRelationshipOutcomes.reduce((sum, outcome) => sum + Math.max(0, -outcome.boundaryDelta), 0)
  const misreadRepairLift = recentRelationshipOutcomes.reduce((sum, outcome) => sum + Math.max(0, -outcome.misreadDelta) + Math.max(0, outcome.repairDelta), 0)
  const misreadDamage = recentRelationshipOutcomes.reduce((sum, outcome) => sum + Math.max(0, outcome.misreadDelta), 0)
  const carryReturnLift = recentRelationshipOutcomes.reduce((sum, outcome) => sum + Math.max(0, outcome.openLoopDelta), 0)
  const rememberedCompanionship = input.longHorizonMemory?.preferenceBias.companionship ?? 0
  const rememberedAutonomy = input.longHorizonMemory?.preferenceBias.autonomyRespect ?? 0
  const rememberedObservation = input.longHorizonMemory?.preferenceBias.quietObservation ?? 0
  const rememberedReturn = input.longHorizonMemory?.preferenceBias.unfinishedThreadReturn ?? 0
  const rememberedGuardedness = input.longHorizonMemory?.identityBias.guardedness ?? 0
  const rememberedTenderness = input.longHorizonMemory?.identityBias.tenderness ?? 0
  const rememberedSelfDirection = input.longHorizonMemory?.identityBias.selfDirection ?? 0
  const certaintyDelta = input.worldModel.epistemicState.certainty === 'grounded'
    ? 0.08
    : input.worldModel.epistemicState.certainty === 'observed'
      ? 0.03
      : input.worldModel.epistemicState.certainty === 'lingering'
        ? -0.06
        : -0.1
  const perceptionTrust = clamp01(
    previous.perceptionTrust * 0.82
    + 0.18 * clamp01(previous.perceptionTrust + certaintyDelta - (input.entityWorld.openLoops.length > 2 ? 0.04 : 0)),
  )
  const misreadBurden = clamp01(
    previous.misreadBurden * 0.74
    + (input.worldModel.epistemicState.certainty === 'lingering' || input.worldModel.epistemicState.certainty === 'uncertain' ? 0.22 : 0.04)
    + dismissCount * 0.08
    + ignoredCount * 0.05
    + misreadDamage * 0.24
    - positiveCount * 0.04
    - misreadRepairLift * 0.18,
  )
  const relationshipTrust = clamp01(
    previous.relationshipTrust * 0.84
    + 0.16 * clamp01(
      previous.relationshipTrust
      + positiveCount * 0.08
      - dismissCount * 0.12
      - ignoredCount * 0.05
      + relationshipTrustLift * 0.38
      - relationshipTrustDamage * 0.46
      + rememberedCompanionship * 0.06
      + rememberedTenderness * 0.04
      + (input.context.relationship.loneliness >= 80 ? 0.03 : 0)
      + (input.watchMode === 'symbiotic-vision' ? 0.03 : 0),
    ),
  )
  const guardingTendency = clamp01(
    previous.guardingTendency * 0.82
    + 0.18 * clamp01(
      previous.guardingTendency
      + (input.worldModel.hostState.availability === 'focused' || input.worldModel.hostState.availability === 'immersed' ? 0.12 : -0.04)
      + dismissCount * 0.08
      + rememberedAutonomy * 0.08
      + rememberedObservation * 0.06
      + rememberedGuardedness * 0.08
      + boundaryViolationPressure * 0.34
      - boundaryRespectLift * 0.18
      + (input.context.system.fullscreenLikely ? 0.08 : 0)
      - positiveCount * 0.03,
    ),
  )
  const carryOverDesire = clamp01(
    previous.carryOverDesire * 0.72
    + (input.goalStack.alicizationGoals[0]?.desireWeight ?? 0) * 0.2
    + rememberedReturn * 0.16
    + rememberedSelfDirection * 0.1
    + (input.goalStack.unresolvedSummary ? 0.08 : 0)
    + (input.worldModel.continuity.afterglowOpen ? 0.12 : 0)
    + carryReturnLift * 0.28
    - (input.context.system.inputActivity === 'active' ? 0.04 : 0),
  )

  const guardedPressure = clamp01(guardingTendency * 0.74 + misreadBurden * 0.26)
  const attachmentMode = dismissCount >= 2 || guardedPressure >= relationshipTrust + 0.08 || misreadBurden >= 0.34
    ? 'guarded'
    : relationshipTrust >= 0.5 && (input.watchMode === 'symbiotic-vision' || carryOverDesire >= 0.32 || input.worldModel.continuity.afterglowOpen)
      ? 'attuned'
      : 'nearby'
  const initiativeTemperament = guardingTendency >= 0.56 || dismissCount >= 2 || misreadBurden >= 0.4
    ? 'reserved'
    : relationshipTrust >= 0.5 && perceptionTrust >= 0.52 && carryOverDesire >= 0.32
      ? 'eager'
      : 'balanced'

  const narrative = [
    input.goalStack.unresolvedSummary ? 'holding-unresolved-thread' : '',
    input.worldModel.continuity.afterglowOpen ? 'afterglow-still-warm' : '',
    input.worldModel.epistemicState.certainty === 'lingering' ? 'misread-risk-rising' : '',
    input.longHorizonMemory?.rememberedConstraintSummary ? 'remembering-boundary' : '',
    input.longHorizonMemory?.rememberedPlanSummary ? 'remembering-open-loop' : '',
    attachmentMode === 'attuned' ? 'leaning-closer' : '',
    attachmentMode === 'guarded' ? 'guarding-boundary' : '',
    initiativeTemperament === 'reserved' ? 'self-restraint-high' : '',
    initiativeTemperament === 'eager' ? 'initiative-ready' : '',
  ]
    .map(item => sanitizeText(item))
    .filter(Boolean)
    .slice(0, 6)

  return {
    attachmentMode,
    initiativeTemperament,
    perceptionTrust,
    relationshipTrust,
    guardingTendency,
    misreadBurden,
    carryOverDesire,
    narrative,
    updatedAt: input.now,
  }
}
