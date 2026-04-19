import type {
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationHabitPolicySnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfStateSnapshot,
} from '../../../shared/eventa'

import type { AlicizationMindEcologySnapshot } from './mind-ecology'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

export interface AlicizationDialogueGrowthProfile {
  closeness: number
  patience: number
  directness: number
  tenderness: number
  irritability: number
  guardedness: number
  truthAnchor: number
  autonomyRespect: number
  unfinishedThreadReturn: number
  stability: number
  reassuranceDepth: number
  repairGentleness: number
  cadenceAffinity: number
  restAttunement: number
  expressionDensity: number
  companionshipStyle: 'quiet-presence' | 'warm-guidance' | 'close-hold'
  prefersQuietCompanionship: boolean
  protectsRestWindow: boolean
  styleCap: string | null
  presenceCap: string | null
  selfLine: string | null
  relationLine: string | null
  currentPreoccupation: string | null
  leadingAgenda: string | null
}

export function buildAlicizationDialogueGrowthProfile(input: {
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  selfState?: AlicizationSelfStateSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
}): AlicizationDialogueGrowthProfile {
  const autobiographicalSelf = input.autobiographicalSelf ?? null
  const longHorizonMemory = input.longHorizonMemory ?? null
  const motiveEngine = input.motiveEngine ?? null
  const habitPolicy = input.habitPolicy ?? null
  const selfContinuity = input.selfContinuity ?? null
  const selfState = input.selfState ?? null
  const privateThought = input.privateThought ?? null
  const mindEcology = input.mindEcology ?? null

  const closeness = clamp01(
    (autobiographicalSelf?.preferenceEvolution.companionship ?? 0.42) * 0.28
    + (longHorizonMemory?.preferenceBias.companionship ?? 0) * 0.18
    + (selfContinuity?.relationshipTrust ?? 0.42) * 0.2
    + (selfState?.feltCloseness ?? 0.32) * 0.14
    + (mindEcology?.temperament.attachment ?? 0.36) * 0.12
    + (mindEcology?.climate.socialNeed ?? 0.32) * 0.08,
  )
  const patience = clamp01(
    (selfState?.patience ?? 0.42) * 0.3
    + (mindEcology?.temperament.steadiness ?? 0.42) * 0.22
    + (autobiographicalSelf?.stability ?? 0.48) * 0.18
    + (autobiographicalSelf?.preferenceEvolution.autonomyRespect ?? 0.42) * 0.08
    + (1 - (mindEcology?.climate.restlessness ?? 0.28)) * 0.12
    + (1 - (mindEcology?.temperament.irritability ?? 0.22)) * 0.1,
  )
  const directness = clamp01(
    (mindEcology?.temperament.directness ?? 0.42) * 0.24
    + (longHorizonMemory?.identityBias.directness ?? 0) * 0.16
    + (autobiographicalSelf?.personaDrift.truthAnchor ?? 0.54) * 0.18
    + (longHorizonMemory?.preferenceBias.truthfulGrounding ?? 0) * 0.14
    + (motiveEngine?.drives.truthDiscipline ?? 0.42) * 0.18
    + (privateThought?.stance === 'warn' ? 0.08 : 0),
  )
  const tenderness = clamp01(
    (mindEcology?.temperament.tenderness ?? 0.42) * 0.24
    + (longHorizonMemory?.identityBias.tenderness ?? 0) * 0.16
    + (autobiographicalSelf?.personaDrift.careBias ?? 0.52) * 0.2
    + (autobiographicalSelf?.preferenceEvolution.proactiveCare ?? 0.48) * 0.16
    + (selfState?.protectiveness ?? 0.28) * 0.12
    + (privateThought?.stance === 'care' ? 0.08 : 0),
  )
  const irritability = clamp01(
    (mindEcology?.temperament.irritability ?? 0.18) * 0.22
    + (mindEcology?.climate.irritation ?? 0.14) * 0.18
    + (1 - (autobiographicalSelf?.personaDrift.irritabilityThreshold ?? 0.58)) * 0.22
    + (longHorizonMemory?.identityBias.guardedness ?? 0) * 0.08
    + (privateThought?.emotionalTension === 'tense-debug' ? 0.14 : 0)
    + (privateThought?.emotionalTension === 'restless-switching' ? 0.12 : 0),
  )
  const guardedness = clamp01(
    (longHorizonMemory?.identityBias.guardedness ?? 0) * 0.22
    + (selfContinuity?.guardingTendency ?? 0.32) * 0.22
    + (habitPolicy?.blocksDirectSpeakWhenBusy ? 0.16 : 0)
    + (autobiographicalSelf?.personaDrift.autonomyNeed ?? 0.42) * 0.1
    + (autobiographicalSelf?.preferenceEvolution.autonomyRespect ?? 0.42) * 0.1
    + (mindEcology?.climate.solitudeNeed ?? 0.2) * 0.1
    + (mindEcology?.climate.reflectivePull ?? 0.26) * 0.1,
  )
  const truthAnchor = clamp01(
    (autobiographicalSelf?.personaDrift.truthAnchor ?? 0.56) * 0.26
    + (autobiographicalSelf?.preferenceEvolution.truthfulGrounding ?? 0.56) * 0.16
    + (longHorizonMemory?.preferenceBias.truthfulGrounding ?? 0) * 0.16
    + (motiveEngine?.drives.truthDiscipline ?? 0.52) * 0.22
    + (habitPolicy?.requiresGroundingBeforeSurface ? 0.12 : 0),
  )
  const autonomyRespect = clamp01(
    (autobiographicalSelf?.preferenceEvolution.autonomyRespect ?? 0.52) * 0.24
    + (longHorizonMemory?.preferenceBias.autonomyRespect ?? 0) * 0.18
    + (habitPolicy?.blocksDirectSpeakWhenBusy ? 0.16 : 0)
    + (selfContinuity?.guardingTendency ?? 0.32) * 0.12
    + (mindEcology?.climate.solitudeNeed ?? 0.2) * 0.1
    + (mindEcology?.temperament.steadiness ?? 0.42) * 0.08,
  )
  const unfinishedThreadReturn = clamp01(
    (autobiographicalSelf?.preferenceEvolution.unfinishedThreadReturn ?? 0.46) * 0.26
    + (longHorizonMemory?.preferenceBias.unfinishedThreadReturn ?? 0) * 0.18
    + (motiveEngine?.drives.unfinishedThreadReturn ?? 0.42) * 0.22
    + (habitPolicy?.returnViaRecheck ? 0.14 : 0)
    + (selfContinuity?.carryOverDesire ?? 0.24) * 0.1,
  )
  const stability = clamp01(
    (autobiographicalSelf?.stability ?? 0.48) * 0.42
    + (mindEcology?.temperament.steadiness ?? 0.42) * 0.16
    + (selfContinuity?.relationshipTrust ?? 0.42) * 0.12
    + (1 - (mindEcology?.climate.restlessness ?? 0.28)) * 0.12
    + (1 - irritability) * 0.1,
  )
  const reassuranceDepth = clamp01(
    tenderness * 0.34
    + patience * 0.22
    + closeness * 0.16
    + (autobiographicalSelf?.preferenceEvolution.proactiveCare ?? 0.48) * 0.14
    + (selfState?.protectiveness ?? 0.28) * 0.14
    + (habitPolicy?.prefersQuietCompanionship ? 0.06 : 0),
  )
  const repairGentleness = clamp01(
    truthAnchor * 0.28
    + autonomyRespect * 0.2
    + tenderness * 0.2
    + patience * 0.16
    + (habitPolicy?.requiresGroundingBeforeSurface ? 0.08 : 0)
    - directness * 0.1,
  )
  const cadenceAffinity = clamp01(
    unfinishedThreadReturn * 0.26
    + closeness * 0.18
    + patience * 0.16
    + (mindEcology?.climate.socialNeed ?? 0.32) * 0.08
    + (habitPolicy?.prefersQuietCompanionship ? 0.06 : 0)
    - guardedness * 0.12
    - irritability * 0.12,
  )
  const restAttunement = clamp01(
    patience * 0.26
    + autonomyRespect * 0.18
    + guardedness * 0.12
    + (habitPolicy?.protectsRestWindow ? 0.18 : 0)
    + (habitPolicy?.prefersQuietCompanionship ? 0.08 : 0)
    + tenderness * 0.08,
  )
  const expressionDensity = clamp01(
    directness * 0.26
    + closeness * 0.16
    + tenderness * 0.12
    + (mindEcology?.temperament.playfulness ?? 0.24) * 0.1
    - guardedness * 0.16
    - autonomyRespect * 0.08,
  )
  const companionshipStyle
    = closeness >= 0.68 && reassuranceDepth >= 0.62 && autonomyRespect < 0.64
      ? 'close-hold'
      : reassuranceDepth >= 0.52 || tenderness >= 0.58
        ? 'warm-guidance'
        : 'quiet-presence'

  return {
    closeness,
    patience,
    directness,
    tenderness,
    irritability,
    guardedness,
    truthAnchor,
    autonomyRespect,
    unfinishedThreadReturn,
    stability,
    reassuranceDepth,
    repairGentleness,
    cadenceAffinity,
    restAttunement,
    expressionDensity,
    companionshipStyle,
    prefersQuietCompanionship: habitPolicy?.prefersQuietCompanionship === true,
    protectsRestWindow: habitPolicy?.protectsRestWindow === true,
    styleCap: sanitizeText(habitPolicy?.suggestedStyleCap, 48) || null,
    presenceCap: sanitizeText(habitPolicy?.suggestedPresenceCap, 48) || null,
    selfLine: sanitizeText(
      autobiographicalSelf?.identityNarrative
      || mindEcology?.selfNarrative,
      220,
    ) || null,
    relationLine: sanitizeText(
      autobiographicalSelf?.relationshipDoctrine
      || mindEcology?.relationNarrative,
      220,
    ) || null,
    currentPreoccupation: sanitizeText(mindEcology?.currentPreoccupation, 220) || null,
    leadingAgenda: sanitizeText(
      motiveEngine?.backgroundAgendas[0]?.summary
      || motiveEngine?.longTermGoals[0]?.summary,
      220,
    ) || null,
  }
}
