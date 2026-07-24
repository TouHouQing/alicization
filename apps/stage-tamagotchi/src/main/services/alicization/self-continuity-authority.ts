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

import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'

import { buildAutobiographicalContinuityLines, pickDominantAutobiographicalGoal } from './autobiographical-self'
import { buildMindEcologyFromRuntimeSurface } from './mind-ecology'

export interface AlicizationSelfContinuityAuthority {
  selfLine: string | null
  relationshipLine: string | null
  motiveLine: string | null
  habitLine: string | null
  inwardLine: string | null
  authoritySummary: string | null
  closenessPosture?: string | null
  sourceTags: string[]
}

function sanitizeText(raw: unknown, maxChars = 220) {
  return sanitizeAlicizationProviderFacingText(raw, maxChars, '')
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

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

function latestReflection(reflectionLedger?: AlicizationReflectionLedgerSnapshot | null) {
  const entries = asArray(reflectionLedger?.entries)
  const latest = entries.find(entry => entry.id === reflectionLedger?.latestEntryId)
  if (latest && latest.outcome !== 'released')
    return latest

  return entries.find(entry => entry.outcome !== 'released')
    ?? entries[0]
    ?? null
}

function firstCleanLine(values: unknown[], maxChars = 220) {
  for (const value of values) {
    const normalized = sanitizeText(value, maxChars)
    if (normalized)
      return normalized
  }
  return null
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
  const hasPrimaryOwner = Boolean(
    input.autobiographicalSelf
    || input.mindEcology
    || input.privateThought
    || input.motiveEngine
    || input.habitPolicy
    || input.reflectionLedger,
  )
  const continuityLines = hasPrimaryOwner
    ? buildAutobiographicalContinuityLines({
        autobiographicalSelf: input.autobiographicalSelf ?? null,
        longHorizonMemory: input.longHorizonMemory ?? null,
        privateThought: input.privateThought ?? null,
        mindEcology: input.mindEcology ?? null,
      })
    : []
  const reflection = latestReflection(input.reflectionLedger ?? null)

  const selfLine = firstCleanLine([
    input.autobiographicalSelf?.identityNarrative,
    input.autobiographicalSelf?.latestInflection,
    input.mindEcology?.selfNarrative,
    hasPrimaryOwner ? continuityLines[0] : null,
  ])
  const relationshipLine = firstCleanLine([
    input.autobiographicalSelf?.relationshipDoctrine,
    input.mindEcology?.relationNarrative,
  ])
  const motiveLine = firstCleanLine([
    asArray(input.motiveEngine?.backgroundAgendas)[0]?.summary,
    asArray(input.motiveEngine?.longTermGoals)[0]?.summary,
    autobiographicalGoal?.summary,
  ])
  const habitLine = firstCleanLine([
    asArray(input.habitPolicy?.narrative)[0],
    input.habitPolicy?.dominantMode,
  ])
  const ownerInwardLines = uniqueList([
    input.privateThought?.thoughtText,
    input.mindEcology?.currentPreoccupation,
    reflection?.revision,
    continuityLines[1],
  ], 3)
  const hasOwnerSignal = Boolean(
    selfLine
    || relationshipLine
    || motiveLine
    || habitLine
    || ownerInwardLines.length > 0,
  )
  if (!hasOwnerSignal)
    return null

  const inwardLines = uniqueList([
    ...ownerInwardLines,
    input.longHorizonMemory?.dominantCueSummary,
    input.longHorizonMemory?.rememberedConstraintSummary,
    input.longHorizonMemory?.rememberedPreferenceSummary,
    input.longHorizonMemory?.rememberedPlanSummary,
  ], 3)
  const inwardLine = inwardLines.join(' | ') || null
  const authoritySummary = uniqueList([
    selfLine,
    relationshipLine,
    motiveLine,
    habitLine,
    inwardLine,
  ], 3).join(' | ') || null

  if (!authoritySummary)
    return null

  const ecologyClosenessPosture
    = input.mindEcology?.relationshipHabit === 'give-space'
      ? 'space-first'
      : input.mindEcology?.relationshipHabit === 'warm-guidance'
        ? 'warm-guidance'
        : input.mindEcology?.relationshipHabit === 'stay-near'
          ? 'balanced'
          : input.mindEcology?.relationshipHabit === 'protective-shadow'
            ? 'space-first'
            : ''
  const autobiographicalRelationshipStyle = sanitizeText(
    (input.autobiographicalSelf as { relationshipStyle?: unknown } | null | undefined)?.relationshipStyle,
    80,
  )
  const closenessPosture = firstCleanLine([
    ecologyClosenessPosture,
    autobiographicalRelationshipStyle,
  ], 80)

  return {
    selfLine,
    relationshipLine,
    motiveLine,
    habitLine,
    inwardLine,
    authoritySummary,
    closenessPosture,
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
    autobiographicalSelf: surface.memory?.autobiographicalSelf ?? null,
    longHorizonMemory: surface.memory?.longHorizonMemory ?? null,
    motiveEngine: surface.memory?.motiveEngine ?? null,
    habitPolicy: surface.agency?.habitPolicy ?? null,
    mindEcology: buildMindEcologyFromRuntimeSurface(surface),
    privateThought: surface.cognition?.privateThought ?? null,
    reflectionLedger: surface.memory?.reflectionLedger ?? null,
  })
}
