import type {
  AlicizationRelationshipModelSnapshot,
  AlicizationSubjectiveSceneAppraisal,
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

function countOutcomes(
  outcomes: AlicizationProactiveLayeredContext['relationship']['recentProactiveOutcomes'],
  kind: 'positive' | 'reply-within-120s' | 'dismiss' | 'ignored',
) {
  return outcomes.filter(item => item.outcome === kind).length
}

export function buildRelationshipModel(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  appraisal: AlicizationSubjectiveSceneAppraisal
  previous?: AlicizationRelationshipModelSnapshot | null
  watchMode: AlicizationVisualWatchMode
}): AlicizationRelationshipModelSnapshot {
  const previous = input.previous
  const positiveCount
    = countOutcomes(input.context.relationship.recentProactiveOutcomes, 'positive')
      + countOutcomes(input.context.relationship.recentProactiveOutcomes, 'reply-within-120s')
  const dismissCount = countOutcomes(input.context.relationship.recentProactiveOutcomes, 'dismiss')
  const ignoredCount = countOutcomes(input.context.relationship.recentProactiveOutcomes, 'ignored')

  const receptivity = clamp01(
    (previous?.receptivity ?? 0.46) * 0.78
    + (input.appraisal.relationshipNeed === 'guidance' ? 0.12 : 0.04)
    + (input.appraisal.relationshipNeed === 'companionship' ? 0.1 : 0)
    + (input.watchMode === 'invited-inspection' ? 0.16 : input.watchMode === 'symbiotic-vision' ? 0.08 : 0)
    + (input.worldModel.epistemicState.certainty === 'grounded' ? 0.08 : 0)
    + positiveCount * 0.08
    - dismissCount * 0.12
    - ignoredCount * 0.06
    - (input.appraisal.relationshipNeed === 'space' ? 0.18 : 0),
  )
  const sharedAttentionTrust = clamp01(
    (previous?.sharedAttentionTrust ?? 0.42) * 0.8
    + (input.watchMode === 'invited-inspection' ? 0.2 : input.watchMode === 'symbiotic-vision' ? 0.12 : 0.04)
    + (input.worldModel.epistemicState.certainty === 'grounded' ? 0.18 : input.worldModel.epistemicState.certainty === 'observed' ? 0.08 : -0.08)
    + positiveCount * 0.05
    - dismissCount * 0.06,
  )
  const correctionSensitivity = clamp01(
    (previous?.correctionSensitivity ?? 0.34) * 0.76
    + (input.worldModel.epistemicState.certainty === 'lingering' || input.worldModel.epistemicState.certainty === 'uncertain' ? 0.2 : 0.04)
    + dismissCount * 0.14
    + ignoredCount * 0.08
    + (input.appraisal.relationshipNeed === 'space' ? 0.12 : 0)
    - positiveCount * 0.04,
  )
  const reciprocityExpectation = clamp01(
    (previous?.reciprocityExpectation ?? 0.38) * 0.82
    + positiveCount * 0.08
    - dismissCount * 0.08
    - ignoredCount * 0.04
    + (input.context.relationship.loneliness >= 84 ? 0.06 : 0)
    + (input.watchMode === 'symbiotic-vision' ? 0.04 : 0),
  )

  const climate = dismissCount >= 2 || correctionSensitivity >= receptivity + 0.08
    ? 'guarded'
    : receptivity >= 0.68 && sharedAttentionTrust >= 0.62
      ? 'attuned'
      : receptivity >= 0.54
        ? 'warm'
        : 'neutral'
  const approachVector = input.appraisal.relationshipNeed === 'care'
    ? 'care'
    : input.appraisal.relationshipNeed === 'guidance'
      ? sharedAttentionTrust >= 0.5 ? 'guide' : 'give-space'
      : input.appraisal.relationshipNeed === 'space' || climate === 'guarded'
        ? 'give-space'
        : input.appraisal.relationshipNeed === 'companionship'
          ? 'stay-near'
          : input.worldModel.activeThread?.unresolved && input.worldModel.epistemicState.certainty === 'grounded'
            ? 'guide'
            : 'stay-near'

  const activeBoundaries = [
    (input.worldModel.hostState.availability === 'focused' || input.worldModel.hostState.availability === 'immersed') ? 'focus-protection' : '',
    (input.worldModel.epistemicState.certainty === 'lingering' || input.worldModel.epistemicState.certainty === 'uncertain') ? 'needs-recheck' : '',
    dismissCount > 0 || ignoredCount >= 2 ? 'feedback-caution' : '',
    correctionSensitivity >= 0.58 ? 'correction-sensitive' : '',
  ]
    .map(item => sanitizeText(item))
    .filter(Boolean)
    .slice(0, 6)
  const narrative = [
    climate === 'guarded' ? 'host-boundary-felt' : '',
    climate === 'attuned' ? 'shared-attention-deepening' : '',
    approachVector === 'guide' ? 'guidance-feels-possible' : '',
    approachVector === 'care' ? 'care-over-correctness' : '',
    approachVector === 'give-space' ? 'restraint-is-kinder' : '',
    sharedAttentionTrust >= 0.62 ? 'grounding-trust-rising' : '',
    correctionSensitivity >= 0.58 ? 'misread-cost-feels-real' : '',
  ]
    .map(item => sanitizeText(item))
    .filter(Boolean)
    .slice(0, 6)

  return {
    climate,
    approachVector,
    receptivity,
    sharedAttentionTrust,
    correctionSensitivity,
    reciprocityExpectation,
    activeBoundaries,
    narrative,
    updatedAt: input.now,
  }
}
