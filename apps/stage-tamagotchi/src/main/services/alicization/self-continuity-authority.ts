import type {
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationHabitPolicySnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReflectionLedgerSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationMindEcologySnapshot } from './mind-ecology'

import { buildAutobiographicalContinuityLines, pickDominantAutobiographicalGoal } from './autobiographical-self'
import { buildMindEcologyFromRuntimeSurface } from './mind-ecology'

export interface AlicizationSelfContinuityAuthority {
  selfLine: string | null
  relationshipLine: string | null
  motiveLine: string | null
  habitLine: string | null
  inwardLine: string | null
  authoritySummary: string | null
  sourceTags: string[]
  closenessPosture?: string | null
  currentBodyState?: string | null
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 220)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function latestReflection(reflectionLedger?: AlicizationReflectionLedgerSnapshot | null) {
  return reflectionLedger?.entries.find(entry => entry.id === reflectionLedger.latestEntryId)
    ?? reflectionLedger?.entries[0]
    ?? null
}

export function buildSelfContinuityAuthority(input: {
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
}): AlicizationSelfContinuityAuthority | null {
  const autobiographicalGoal = pickDominantAutobiographicalGoal(input.autobiographicalSelf ?? null)
  const continuityLines = buildAutobiographicalContinuityLines({
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    privateThought: input.privateThought ?? null,
    mindEcology: input.mindEcology ?? null,
  })
  const reflection = latestReflection(input.reflectionLedger ?? null)

  const selfLine = sanitizeText(
    input.autobiographicalSelf?.identityNarrative
    || input.autobiographicalSelf?.latestInflection
    || input.mindEcology?.selfNarrative
    || continuityLines[0]
    || '',
    220,
  ) || null
  const relationshipLine = sanitizeText(
    input.autobiographicalSelf?.relationshipDoctrine
    || input.mindEcology?.relationNarrative
    || '',
    220,
  ) || null
  const motiveLine = sanitizeText(
    input.motiveEngine?.backgroundAgendas[0]?.summary
    || input.motiveEngine?.longTermGoals[0]?.summary
    || autobiographicalGoal?.summary
    || '',
    220,
  ) || null
  const habitLine = sanitizeText(
    input.habitPolicy?.requiresGroundingBeforeSurface
      ? 'Ground first, then let warmth or fluency surface.'
      : input.habitPolicy?.prefersQuietCompanionship
        ? 'Stay near lightly rather than crowding the opening.'
        : input.habitPolicy?.protectsRestWindow
          ? 'Protect the host rest window before stretching the exchange.'
          : input.habitPolicy?.dominantMode
            ? `Current durable behavior gate leans ${input.habitPolicy.dominantMode}.`
            : '',
    220,
  ) || null
  const inwardLine = sanitizeText(
    input.privateThought?.thoughtText
    || input.mindEcology?.currentPreoccupation
    || reflection?.revision
    || continuityLines[1]
    || '',
    220,
  ) || null
  const authoritySummary = uniqueList([
    selfLine,
    relationshipLine,
    motiveLine,
    habitLine,
    inwardLine,
  ], 3).join(' | ') || null

  if (!authoritySummary)
    return null

  return {
    selfLine,
    relationshipLine,
    motiveLine,
    habitLine,
    inwardLine,
    authoritySummary,
    sourceTags: uniqueList([
      input.autobiographicalSelf ? 'autobiographical-self' : '',
      autobiographicalGoal?.kind ? `autobio-goal:${autobiographicalGoal.kind}` : '',
      input.longHorizonMemory?.rememberedPlanSummary ? 'long-horizon-plan' : '',
      input.longHorizonMemory?.rememberedConstraintSummary ? 'long-horizon-constraint' : '',
      input.motiveEngine?.rulingDrive ? `motive:${input.motiveEngine.rulingDrive}` : '',
      input.habitPolicy?.dominantMode ? `habit:${input.habitPolicy.dominantMode}` : '',
      input.mindEcology?.moodLabel ? `ecology:${input.mindEcology.moodLabel}` : '',
      input.privateThought?.stance ? `private-thought:${input.privateThought.stance}` : '',
      reflection?.outcome ? `reflection:${reflection.outcome}` : '',
    ], 8),
  }
}

export function buildSelfContinuityAuthorityFromRuntimeSurface(
  surface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
) {
  if (!surface)
    return null
  return buildSelfContinuityAuthority({
    autobiographicalSelf: surface.memory.autobiographicalSelf ?? null,
    longHorizonMemory: surface.memory.longHorizonMemory ?? null,
    motiveEngine: surface.memory.motiveEngine ?? null,
    habitPolicy: surface.agency.habitPolicy ?? null,
    mindEcology: buildMindEcologyFromRuntimeSurface(surface),
    privateThought: surface.cognition.privateThought ?? null,
    reflectionLedger: surface.memory.reflectionLedger ?? null,
  })
}
