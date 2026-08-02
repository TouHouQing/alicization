import type {
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationEpisodicEventRecord,
  AlicizationHabitPolicySnapshot,
  AlicizationHostPersonModelSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationPersonalityState,
  AlicizationPersonStateEvolutionSummary,
  AlicizationPrivateThoughtSnapshot,
  AlicizationProactiveStyle,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfEvolutionKernelSnapshot,
  AlicizationSelfStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'
import type { AlicizationMindEcologySnapshot } from './mind-ecology'
import type {
  AlicizationPersonaAuthorityInfluence,
  AlicizationPersonalityContinuityStateSnapshot,
} from './personality-continuity-state'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'

import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'

import { buildHostSocialGuidance } from './host-social-guidance'
import { mergePreferredSelfContinuityAuthority } from './person-state-projection-resolution'
import {
  buildAlicizationPersonalityContinuityState,
  deriveAlicizationPersonaAuthorityInfluence,
} from './personality-continuity-state'
import { buildRelationshipDoctrineGuidance } from './relationship-doctrine-guidance'
import { buildSelfContinuityAuthority } from './self-continuity-authority'

export type AlicizationPersonStateRelationshipPosture = 'restrained' | 'warm' | 'tender'
export type AlicizationPersonStateClosenessContext
  = 'focused-work'
    | 'repair-window'
    | 'late-night-care'
    | 'execution-callback'
    | 'open-companionship'
    | 'general'

export type AlicizationPersonStateClosenessRung
  = 'space-first'
    | 'measured-room'
    | 'nearby-soft'
    | 'warm-near'
    | 'close-hold'

export interface AlicizationPersonStateClosenessLadderEntry {
  context: AlicizationPersonStateClosenessContext
  rung: AlicizationPersonStateClosenessRung
  preference: string
  rationale: string
  confidence: number
}

export interface AlicizationPersonStateProjection {
  contexts: string[]
  personalityContinuityState: AlicizationPersonalityContinuityStateSnapshot
  selfContinuityAuthority: AlicizationSelfContinuityAuthority | null
  activeClosenessContext: AlicizationPersonStateClosenessContext
  activeClosenessRung: AlicizationPersonStateClosenessRung
  closenessLadder: AlicizationPersonStateClosenessLadderEntry[]
  relationshipPosture: AlicizationPersonStateRelationshipPosture | null
  preferredProactiveStyle: AlicizationProactiveStyle | null
  preferenceText: string
  sensitivityText: string
  repairTriggerText: string
  burdenText: string
  routineText: string
  trustRationale: string
  relationshipDoctrine: string
  cautious: boolean
  restrained: boolean
  summary: string
}

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

function sanitizeProjectionText(raw: unknown, maxChars = 220) {
  return sanitizeAlicizationProviderFacingText(raw, maxChars, '')
}

function sanitizeOptionalProjectionText(raw: unknown, maxChars = 220) {
  return sanitizeProjectionText(raw, maxChars) || null
}

function sanitizeProjectionTextList(values: string[], maxChars = 220) {
  return values
    .map(value => sanitizeProjectionText(value, maxChars))
    .filter(Boolean)
}

function sanitizeProjectionAuthority(authority: AlicizationSelfContinuityAuthority | null) {
  if (!authority)
    return null

  return {
    ...authority,
    selfLine: sanitizeOptionalProjectionText(authority.selfLine),
    relationshipLine: sanitizeOptionalProjectionText(authority.relationshipLine),
    motiveLine: sanitizeOptionalProjectionText(authority.motiveLine),
    habitLine: sanitizeOptionalProjectionText(authority.habitLine),
    inwardLine: sanitizeOptionalProjectionText(authority.inwardLine),
    authoritySummary: sanitizeOptionalProjectionText(authority.authoritySummary, 520),
  } satisfies AlicizationSelfContinuityAuthority
}

function sanitizePersonalityContinuityProjection(
  state: AlicizationPersonalityContinuityStateSnapshot,
) {
  return {
    ...state,
    growthProfile: {
      ...state.growthProfile,
      styleCap: sanitizeOptionalProjectionText(state.growthProfile.styleCap),
      presenceCap: sanitizeOptionalProjectionText(state.growthProfile.presenceCap),
      selfLine: sanitizeOptionalProjectionText(state.growthProfile.selfLine),
      relationLine: sanitizeOptionalProjectionText(state.growthProfile.relationLine),
      currentPreoccupation: sanitizeOptionalProjectionText(state.growthProfile.currentPreoccupation),
      leadingAgenda: sanitizeOptionalProjectionText(state.growthProfile.leadingAgenda),
    },
    continuitySummary: sanitizeProjectionText(state.continuitySummary, 520),
    regimeModel: {
      ...state.regimeModel,
      primaryReason: sanitizeOptionalProjectionText(state.regimeModel.primaryReason),
      carryReason: sanitizeOptionalProjectionText(state.regimeModel.carryReason),
      signals: sanitizeProjectionTextList(state.regimeModel.signals),
    },
    rhythmState: {
      ...state.rhythmState,
      summary: sanitizeProjectionText(state.rhythmState.summary, 520),
      rationale: sanitizeProjectionTextList(state.rhythmState.rationale),
    },
    trustMeaning: sanitizeOptionalProjectionText(state.trustMeaning),
    reconsolidationLine: sanitizeOptionalProjectionText(state.reconsolidationLine),
    selfLine: sanitizeOptionalProjectionText(state.selfLine),
    relationLine: sanitizeOptionalProjectionText(state.relationLine),
    currentPreoccupation: sanitizeOptionalProjectionText(state.currentPreoccupation),
    rationale: sanitizeProjectionTextList(state.rationale),
  } satisfies AlicizationPersonalityContinuityStateSnapshot
}

function readAutobiographicalInitiativeHabitProfile(autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null) {
  const behaviorSignatures = autobiographicalSelf?.behaviorSignatures ?? []
  return {
    chooseOpeningsCarefully: behaviorSignatures.includes('habit:choose-openings-carefully'),
    keepGentleOpenings: behaviorSignatures.includes('habit:keep-gentle-openings'),
  }
}

function mergeUnique(items: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const item of items) {
    const normalized = sanitizeText(item, 180)
    if (!normalized || result.some(existing => existing.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function normalizeContexts(contexts: string[]) {
  return mergeUnique(contexts, 8)
}

function normalizeClosenessContext(raw: string | null | undefined): AlicizationPersonStateClosenessContext {
  const value = sanitizeText(raw, 64).toLowerCase()
  if (value === 'focused-work')
    return 'focused-work'
  if (value === 'repair-window')
    return 'repair-window'
  if (value === 'late-night-care' || value === 'late-night')
    return 'late-night-care'
  if (value === 'execution-callback' || value === 'execution')
    return 'execution-callback'
  if (value === 'open-companionship' || value === 'open-window' || value === 'companionship')
    return 'open-companionship'
  return 'general'
}

function deriveRelationshipPosture(input: {
  continuity: AlicizationPersonalityContinuityStateSnapshot
  personaAuthority: AlicizationPersonaAuthorityInfluence
  repairBeforeCloseness: boolean
  cautious: boolean
  restrained: boolean
}) {
  if (input.repairBeforeCloseness && input.restrained)
    return 'restrained' as const
  if (
    input.continuity.currentRegime === 'focused-work'
    && input.personaAuthority.directnessBias >= 0.34
    && input.repairBeforeCloseness
    && input.continuity.repairPosture !== 'repair-first'
    && input.personaAuthority.roomBias < 0.14
  ) {
    return 'warm' as const
  }
  if (input.continuity.currentRegime === 'open-companionship') {
    if (
      input.continuity.repairPosture === 'repair-first'
      || input.continuity.autonomyPosture === 'protect-space'
    ) {
      return 'restrained' as const
    }
    if (
      input.continuity.trustStage === 'trusted'
      || input.continuity.closenessPosture === 'close-hold'
    ) {
      return 'tender' as const
    }
    return 'warm' as const
  }
  if (input.continuity.currentRegime === 'execution-callback') {
    if (input.continuity.repairPosture === 'repair-first')
      return 'restrained' as const
    if (input.cautious || input.restrained)
      return null
    return 'warm' as const
  }
  if (
    input.personaAuthority.directnessBias >= 0.22
    && input.continuity.repairPosture !== 'repair-first'
    && input.continuity.closenessPosture !== 'space-first'
    && input.continuity.autonomyPosture !== 'protect-space'
    && input.personaAuthority.roomBias < 0.2
  ) {
    return 'warm' as const
  }
  if (
    (input.continuity.closenessPosture === 'space-first' && input.personaAuthority.directnessBias < 0.22)
    || input.continuity.repairPosture === 'repair-first'
    || input.continuity.autonomyPosture === 'protect-space'
    || input.personaAuthority.roomBias >= 0.2
  ) {
    return 'restrained' as const
  }
  if (
    input.continuity.closenessPosture === 'close-hold'
    || (
      input.continuity.trustStage === 'trusted'
      && input.continuity.closenessPosture === 'warm-guidance'
    )
  ) {
    return 'tender' as const
  }
  if (
    input.continuity.closenessPosture === 'warm-guidance'
    || input.continuity.currentRegime === 'late-night-care'
    || !input.cautious
  ) {
    return 'warm' as const
  }
  return null
}

function derivePreferredProactiveStyle(input: {
  continuity: AlicizationPersonalityContinuityStateSnapshot
  personaAuthority: AlicizationPersonaAuthorityInfluence
  restrained: boolean
  repairBoundaryAnchored: boolean
  hostPreferredStyle: AlicizationProactiveStyle | null
  doctrinePreferredStyle: AlicizationProactiveStyle | null
  privateThoughtPreferredStyle?: AlicizationProactiveStyle | null
  evolutionPreferredStyle?: AlicizationProactiveStyle | null
  autobiographicalChooseOpeningsCarefully?: boolean
  autobiographicalKeepGentleOpenings?: boolean
}) {
  if (input.autobiographicalChooseOpeningsCarefully)
    return 'silent-observe' as const
  if (input.autobiographicalKeepGentleOpenings)
    return 'light-nudge' as const
  if (input.privateThoughtPreferredStyle)
    return input.privateThoughtPreferredStyle
  if (input.evolutionPreferredStyle)
    return input.evolutionPreferredStyle
  if (
    input.restrained
    && !input.repairBoundaryAnchored
    && input.personaAuthority.repairBias >= 0.2
    && input.personaAuthority.roomBias >= 0.14
  ) {
    return 'silent-observe' as const
  }
  if (input.hostPreferredStyle)
    return input.hostPreferredStyle
  if (input.doctrinePreferredStyle)
    return input.doctrinePreferredStyle
  if (input.personaAuthority.preferredProactiveStyle)
    return input.personaAuthority.preferredProactiveStyle
  if (
    input.continuity.currentRegime === 'late-night-care'
    || input.continuity.rhythmState.restMode === 'rest-protective'
  ) {
    return 'gentle-care' as const
  }
  if (input.continuity.currentRegime === 'focused-work') {
    if (input.restrained && input.continuity.rhythmState.cadenceMode === 'cooldown')
      return 'silent-observe' as const
    if (input.continuity.autonomyPosture === 'protect-space')
      return 'light-nudge' as const
  }
  if (input.continuity.currentRegime === 'repair-window')
    return 'light-nudge' as const
  return null
}

function deriveEvolutionPreferredProactiveStyle(rung: string | null | undefined): AlicizationProactiveStyle | null {
  switch (sanitizeText(rung, 64).toLowerCase()) {
    case 'space-first':
      return 'silent-observe'
    case 'warm-near':
      return 'light-nudge'
    default:
      return null
  }
}

function deriveClosenessRung(input: {
  context: AlicizationPersonStateClosenessContext
  preferenceText: string
  continuity: AlicizationPersonalityContinuityStateSnapshot
  personaAuthority: AlicizationPersonaAuthorityInfluence
  relationshipPosture: AlicizationPersonStateRelationshipPosture | null
  restrained: boolean
}) {
  if (
    input.context === 'open-companionship'
    && (
      input.relationshipPosture === 'tender'
      || input.continuity.trustStage === 'trusted'
    )
    && input.continuity.repairPosture !== 'repair-first'
    && input.continuity.autonomyPosture !== 'protect-space'
  ) {
    return 'close-hold' as const
  }
  if (
    input.continuity.closenessPosture === 'close-hold'
    || input.relationshipPosture === 'tender'
  ) {
    return 'close-hold' as const
  }
  if (
    input.restrained
    || input.continuity.closenessPosture === 'space-first'
    || input.continuity.autonomyPosture === 'protect-space'
    || input.personaAuthority.roomBias >= 0.18
  ) {
    return input.context === 'repair-window' || input.context === 'execution-callback'
      ? 'measured-room' as const
      : 'space-first' as const
  }
  if (
    input.context === 'late-night-care'
    || input.continuity.currentRegime === 'late-night-care'
  ) {
    return 'nearby-soft' as const
  }
  if (
    input.continuity.closenessPosture === 'warm-guidance'
    || input.relationshipPosture === 'warm'
  ) {
    return 'warm-near' as const
  }
  return 'measured-room' as const
}

function buildClosenessLadder(input: {
  contexts: string[]
  continuity: AlicizationPersonalityContinuityStateSnapshot
  personaAuthority: AlicizationPersonaAuthorityInfluence
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  relationshipPosture: AlicizationPersonStateRelationshipPosture | null
  restrained: boolean
}) {
  const candidateContexts = [
    ...new Set<AlicizationPersonStateClosenessContext>([
      normalizeClosenessContext(input.continuity.currentRegime),
      ...input.contexts.map(context => normalizeClosenessContext(context)),
    ]),
  ].filter((context): context is AlicizationPersonStateClosenessContext => context != null)

  const entries = candidateContexts.map((context) => {
    const preference = input.hostPersonModel?.preferredClosenessByContext.find(item => normalizeClosenessContext(item.context) === context) ?? null
    const preferenceText = sanitizeText(preference?.preference, 180)
    const rung = deriveClosenessRung({
      context,
      preferenceText,
      continuity: input.continuity,
      personaAuthority: input.personaAuthority,
      relationshipPosture: input.relationshipPosture,
      restrained: input.restrained,
    })
    const rationale = sanitizeText([
      `context=${context}`,
      `regime=${input.continuity.currentRegime}`,
      input.relationshipPosture ? `posture=${input.relationshipPosture}` : '',
      input.restrained ? 'restrained=true' : '',
      preferenceText,
    ].filter(Boolean).join(' | '), 220)
    return {
      context,
      rung,
      preference: preferenceText,
      rationale,
      confidence: clamp01(preference?.confidence ?? (context === normalizeClosenessContext(input.continuity.currentRegime) ? 0.78 : 0.58)),
    } satisfies AlicizationPersonStateClosenessLadderEntry
  })

  return entries
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 5)
}

function pickActiveClosenessContext(input: {
  continuity: AlicizationPersonalityContinuityStateSnapshot
  ladder: AlicizationPersonStateClosenessLadderEntry[]
}) {
  if (input.continuity.repairPosture === 'repair-first') {
    const repairEntry = input.ladder.find(entry => entry.context === 'repair-window')
    if (repairEntry)
      return repairEntry.context
  }
  const target = normalizeClosenessContext(input.continuity.currentRegime)
  return input.ladder.find(entry => entry.context === target)?.context
    ?? input.ladder[0]?.context
    ?? 'general'
}

export function buildAlicizationPersonStateProjection(input: {
  now: number
  contexts?: string[] | null
  personaAuthority?: AlicizationPersonalityState | null
  personStateAuthority?: AlicizationSelfContinuityAuthority | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  selfState?: AlicizationSelfStateSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  personStateEvolutionSummary?: AlicizationPersonStateEvolutionSummary | null
  recentEpisodicEvents?: AlicizationEpisodicEventRecord[] | null
  recentMemoryConsolidations?: AlicizationMemoryConsolidationRecord[] | null
  previousContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
}): AlicizationPersonStateProjection {
  const contexts = normalizeContexts(['general', ...(input.contexts ?? [])])
  const personaAuthority = deriveAlicizationPersonaAuthorityInfluence(input.personaAuthority ?? null)
  const relationshipDoctrine = sanitizeProjectionText(
    input.autobiographicalSelf?.relationshipDoctrine ?? '',
    220,
  )
  const personalityContinuityState = buildAlicizationPersonalityContinuityState({
    now: input.now,
    personaAuthority: input.personaAuthority ?? null,
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    hostPersonModel: input.hostPersonModel ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    motiveEngine: input.motiveEngine ?? null,
    habitPolicy: input.habitPolicy ?? null,
    selfContinuity: input.selfContinuity ?? null,
    selfState: input.selfState ?? null,
    privateThought: input.privateThought ?? null,
    mindEcology: input.mindEcology ?? null,
    recentEpisodicEvents: input.recentEpisodicEvents ?? null,
    recentMemoryConsolidations: input.recentMemoryConsolidations ?? null,
    previousContinuityState: input.previousContinuityState ?? null,
  })
  const selfContinuityAuthority = buildSelfContinuityAuthority({
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    motiveEngine: input.motiveEngine ?? null,
    habitPolicy: input.habitPolicy ?? null,
    mindEcology: input.mindEcology ?? null,
    privateThought: input.privateThought ?? null,
  })
  const resolvedSelfContinuityAuthority = mergePreferredSelfContinuityAuthority({
    bundleAuthority: selfContinuityAuthority,
    runtimeAuthority: input.personStateAuthority ?? null,
  }) ?? selfContinuityAuthority
  const hostGuidance = buildHostSocialGuidance({
    hostPersonModel: input.hostPersonModel ?? null,
    contexts,
  })
  const doctrineGuidance = buildRelationshipDoctrineGuidance({
    authority: resolvedSelfContinuityAuthority,
    doctrineText: relationshipDoctrine,
    contexts,
    conflictStyle: input.autobiographicalSelf?.personaDrift?.conflictStyle ?? null,
    quietObservation: input.autobiographicalSelf?.preferenceEvolution?.quietObservation ?? null,
    autonomyRespect: input.autobiographicalSelf?.preferenceEvolution?.autonomyRespect ?? null,
    truthfulGrounding: input.autobiographicalSelf?.preferenceEvolution?.truthfulGrounding ?? null,
  })
  const cautious = hostGuidance.cautious || doctrineGuidance.cautious
  const restrained = hostGuidance.restrained
    || doctrineGuidance.restrained
    || personalityContinuityState.closenessPosture === 'space-first'
    || personalityContinuityState.repairPosture === 'repair-first'
    || personalityContinuityState.autonomyPosture === 'protect-space'
  const relationshipPosture = deriveRelationshipPosture({
    continuity: personalityContinuityState,
    personaAuthority,
    repairBeforeCloseness: doctrineGuidance.repairBeforeCloseness,
    cautious,
    restrained,
  })
  const closenessLadder = buildClosenessLadder({
    contexts,
    continuity: personalityContinuityState,
    personaAuthority,
    hostPersonModel: input.hostPersonModel ?? null,
    relationshipPosture,
    restrained,
  })
  const activeClosenessContext = pickActiveClosenessContext({
    continuity: personalityContinuityState,
    ladder: closenessLadder,
  })
  const activeClosenessEntry = closenessLadder.find(entry => entry.context === activeClosenessContext) ?? null
  const activeClosenessRung = activeClosenessEntry?.rung ?? 'measured-room'
  const evolutionSummary = input.personStateEvolutionSummary ?? null
  const evolutionDoctrine = sanitizeProjectionText(
    evolutionSummary?.latestDoctrine
    ?? input.selfEvolution?.relationshipDoctrine
    ?? '',
    220,
  )
  const evolutionBurden = sanitizeProjectionText(
    evolutionSummary?.latestBurdenLine
    ?? input.selfEvolution?.burdenLine
    ?? '',
    180,
  )
  const evolutionTrustMeaning = sanitizeProjectionText(
    evolutionSummary?.latestTrustMeaning
    ?? input.selfEvolution?.trustMeaning
    ?? '',
    180,
  )
  const autobiographicalInitiativeHabit = readAutobiographicalInitiativeHabitProfile(input.autobiographicalSelf ?? null)
  const preferredProactiveStyle = derivePreferredProactiveStyle({
    continuity: personalityContinuityState,
    personaAuthority,
    restrained,
    repairBoundaryAnchored: doctrineGuidance.repairBeforeCloseness
      || Boolean(hostGuidance.repairTriggerText)
      || personalityContinuityState.repairPosture === 'repair-first',
    hostPreferredStyle: hostGuidance.preferredProactiveStyle,
    doctrinePreferredStyle: doctrineGuidance.preferredProactiveStyle,
    privateThoughtPreferredStyle: input.privateThought?.suggestedStyle ?? null,
    evolutionPreferredStyle: deriveEvolutionPreferredProactiveStyle(evolutionSummary?.latestDominantRung),
    autobiographicalChooseOpeningsCarefully: autobiographicalInitiativeHabit.chooseOpeningsCarefully,
    autobiographicalKeepGentleOpenings: autobiographicalInitiativeHabit.keepGentleOpenings,
  })
  const projectedPersonalityContinuityState = sanitizePersonalityContinuityProjection(personalityContinuityState)
  const enrichedSelfContinuityAuthority = sanitizeProjectionAuthority(resolvedSelfContinuityAuthority)
  const summary = mergeUnique([
    `regime=${personalityContinuityState.currentRegime}`,
    `closeness=${personalityContinuityState.closenessPosture}`,
    personaAuthority.summary ? `persona=${personaAuthority.summary}` : null,
    enrichedSelfContinuityAuthority?.authoritySummary ? `self=${enrichedSelfContinuityAuthority.authoritySummary}` : null,
    `ladder=${activeClosenessContext}/${activeClosenessRung}`,
    `repair=${personalityContinuityState.repairPosture}`,
    relationshipPosture ? `posture=${relationshipPosture}` : null,
    preferredProactiveStyle ? `proactive=${preferredProactiveStyle}` : null,
    hostGuidance.preferenceText ? `preference=${hostGuidance.preferenceText}` : activeClosenessEntry?.preference ? `preference=${activeClosenessEntry.preference}` : null,
    doctrineGuidance.doctrineSummary ? `doctrine=${doctrineGuidance.doctrineSummary}` : null,
    evolutionDoctrine ? `evolution_doctrine=${evolutionDoctrine}` : null,
    evolutionTrustMeaning ? `evolution_trust=${evolutionTrustMeaning}` : null,
  ], 7).join(' | ')

  const projectionSummary = mergeUnique([
    summary,
  ], 7).join(' | ')

  return {
    contexts,
    personalityContinuityState: projectedPersonalityContinuityState,
    selfContinuityAuthority: enrichedSelfContinuityAuthority,
    activeClosenessContext,
    activeClosenessRung,
    closenessLadder,
    relationshipPosture,
    preferredProactiveStyle,
    preferenceText: hostGuidance.preferenceText || activeClosenessEntry?.preference || '',
    sensitivityText: hostGuidance.sensitivityText,
    repairTriggerText: hostGuidance.repairTriggerText,
    burdenText: hostGuidance.burdenText || evolutionBurden,
    routineText: sanitizeText(input.hostPersonModel?.routines[0] ?? '', 180),
    trustRationale: evolutionTrustMeaning || hostGuidance.trustRationale,
    relationshipDoctrine: relationshipDoctrine || evolutionDoctrine,
    cautious,
    restrained,
    summary: projectionSummary,
  }
}
