import type {
  AlicizationEntityWorldModelSnapshot,
  AlicizationGoalStackSnapshot,
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
  previous?: AlicizationSelfContinuitySnapshot | null
  watchMode: AlicizationVisualWatchMode
}): AlicizationSelfContinuitySnapshot {
  const previous = input.previous ?? createDefaultSelfContinuity(input.now)
  const recentOutcomes = input.context.relationship.recentProactiveOutcomes.slice(-4)
  const positiveCount = recentOutcomes.filter(item => item.outcome === 'positive' || item.outcome === 'reply-within-120s').length
  const dismissCount = recentOutcomes.filter(item => item.outcome === 'dismiss').length
  const ignoredCount = recentOutcomes.filter(item => item.outcome === 'ignored').length

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
    - positiveCount * 0.04,
  )
  const relationshipTrust = clamp01(
    previous.relationshipTrust * 0.84
    + 0.16 * clamp01(
      previous.relationshipTrust
      + positiveCount * 0.08
      - dismissCount * 0.12
      - ignoredCount * 0.05
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
      + (input.context.system.fullscreenLikely ? 0.08 : 0)
      - positiveCount * 0.03,
    ),
  )
  const carryOverDesire = clamp01(
    previous.carryOverDesire * 0.72
    + (input.goalStack.alicizationGoals[0]?.desireWeight ?? 0) * 0.2
    + (input.goalStack.unresolvedSummary ? 0.08 : 0)
    + (input.worldModel.continuity.afterglowOpen ? 0.12 : 0)
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
