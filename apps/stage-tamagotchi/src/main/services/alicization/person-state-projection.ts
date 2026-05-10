import type {
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationEpisodicEventRecord,
  AlicizationHabitPolicySnapshot,
  AlicizationHostPersonModelSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationPersonStateEvolutionSummary,
  AlicizationPersonalityState,
  AlicizationPrivateThoughtSnapshot,
  AlicizationProactiveStyle,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfStateSnapshot,
} from '../../../shared/eventa'

import type { AlicizationMindEcologySnapshot } from './mind-ecology'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'
import type {
  AlicizationPersonaAuthorityInfluence,
  AlicizationPersonalityContinuityStateSnapshot,
} from './personality-continuity-state'

import { buildHostSocialGuidance } from './host-social-guidance'
import {
  buildAlicizationPersonalityContinuityState,
  deriveAlicizationPersonaAuthorityInfluence,
} from './personality-continuity-state'
import { buildRelationshipDoctrineGuidance } from './relationship-doctrine-guidance'

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
  activeClosenessContext: AlicizationPersonStateClosenessContext
  activeClosenessRung: AlicizationPersonStateClosenessRung
  closenessLadder: AlicizationPersonStateClosenessLadderEntry[]
  relationshipPosture: AlicizationPersonStateRelationshipPosture | null
  openingGuidance: string | null
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
  cautious: boolean
  restrained: boolean
}) {
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
    && !input.cautious
    && !input.restrained
    && input.continuity.repairPosture !== 'repair-first'
  ) {
    return 'warm' as const
  }
  if (
    input.restrained
    || input.continuity.closenessPosture === 'space-first'
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

function deriveOpeningGuidance(input: {
  continuity: AlicizationPersonalityContinuityStateSnapshot
  personaAuthority: AlicizationPersonaAuthorityInfluence
  relationshipPosture: AlicizationPersonStateRelationshipPosture | null
  contexts: string[]
  repairTriggerText: string
  burdenText: string
  repairBeforeCloseness: boolean
  truthBeforeWarmth: boolean
  restIntervention: boolean
  restrained: boolean
}) {
  if (
    input.repairBeforeCloseness
    || input.continuity.repairPosture === 'repair-first'
    || (input.repairTriggerText && input.relationshipPosture === 'restrained')
  ) {
    return 'Repair the seam before leaning closer.'
  }
  if (input.personaAuthority.openingGuidance && !input.restrained)
    return input.personaAuthority.openingGuidance
  if (input.truthBeforeWarmth)
    return 'Keep truth in front of warmth while you answer.'
  if (
    input.restIntervention
    || input.continuity.currentRegime === 'late-night-care'
    || (input.contexts.includes('late-night') && input.burdenText)
  ) {
    return 'Keep the answer gentle and low-pressure.'
  }
  if (
    input.restrained
    || input.continuity.closenessPosture === 'space-first'
    || input.continuity.autonomyPosture === 'protect-space'
  ) {
    return 'Open with the live answer first and keep the approach lighter.'
  }
  if (input.relationshipPosture === 'tender')
    return 'Stay near, but do not let closeness outrun truth or room.'
  if (input.relationshipPosture === 'warm')
    return 'Stay near, but let the host keep room to breathe.'
  return null
}

function derivePreferredProactiveStyle(input: {
  continuity: AlicizationPersonalityContinuityStateSnapshot
  personaAuthority: AlicizationPersonaAuthorityInfluence
  restrained: boolean
  hostPreferredStyle: AlicizationProactiveStyle | null
  doctrinePreferredStyle: AlicizationProactiveStyle | null
}) {
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

function deriveClosenessRung(input: {
  context: AlicizationPersonStateClosenessContext
  preferenceText: string
  continuity: AlicizationPersonalityContinuityStateSnapshot
  personaAuthority: AlicizationPersonaAuthorityInfluence
  relationshipPosture: AlicizationPersonStateRelationshipPosture | null
  restrained: boolean
}) {
  const preferenceText = input.preferenceText.toLowerCase()
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
    || /space|room|lighter|quiet|leave room|back off|边界|空间|轻一点|留白/u.test(preferenceText)
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
      input.personaAuthority.roomBias >= 0.2 ? 'repair-window' : null,
      ...input.contexts.map(context => normalizeClosenessContext(context)),
    ]),
  ].filter((context): context is AlicizationPersonStateClosenessContext => context != null)

  const entries = candidateContexts.map((context) => {
    const preference = input.hostPersonModel?.preferredClosenessByContext.find(item => normalizeClosenessContext(item.context) === context) ?? null
    const preferenceText = sanitizeText(
      preference?.preference
        ?? (
          context === 'focused-work'
            ? 'Lighter touch, more room, less interruption pressure.'
            : context === 'repair-window'
              ? 'Repair first, then return without crowding.'
              : context === 'late-night-care'
                ? 'Stay near softly and keep pressure low.'
                : context === 'execution-callback'
                  ? 'Deliver the result cleanly, but check room before leaning closer.'
                  : context === 'open-companionship'
                    ? 'Warmer nearness can land when the opening is real.'
                    : 'Stay near, but keep the approach bounded and responsive to the host move.'
        ),
      180,
    )
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
      preferenceText ? `preference=${preferenceText}` : '',
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
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  selfState?: AlicizationSelfStateSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
  personStateEvolutionSummary?: AlicizationPersonStateEvolutionSummary | null
  recentEpisodicEvents?: AlicizationEpisodicEventRecord[] | null
  recentMemoryConsolidations?: AlicizationMemoryConsolidationRecord[] | null
  previousContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
}): AlicizationPersonStateProjection {
  const contexts = normalizeContexts(['general', ...(input.contexts ?? [])])
  const personaAuthority = deriveAlicizationPersonaAuthorityInfluence(input.personaAuthority ?? null)
  const relationshipDoctrine = sanitizeText(
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
  const hostGuidance = buildHostSocialGuidance({
    hostPersonModel: input.hostPersonModel ?? null,
    contexts,
  })
  const doctrineGuidance = buildRelationshipDoctrineGuidance({
    doctrineText: relationshipDoctrine,
    contexts,
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
  const openingGuidance = deriveOpeningGuidance({
    continuity: personalityContinuityState,
    personaAuthority,
    relationshipPosture,
    contexts,
    repairTriggerText: hostGuidance.repairTriggerText,
    burdenText: hostGuidance.burdenText,
    repairBeforeCloseness: doctrineGuidance.repairBeforeCloseness,
    truthBeforeWarmth: doctrineGuidance.truthBeforeWarmth,
    restIntervention: doctrineGuidance.restIntervention,
    restrained,
  })
  const preferredProactiveStyle = derivePreferredProactiveStyle({
    continuity: personalityContinuityState,
    personaAuthority,
    restrained,
    hostPreferredStyle: hostGuidance.preferredProactiveStyle,
    doctrinePreferredStyle: doctrineGuidance.preferredProactiveStyle,
  })
  const evolutionSummary = input.personStateEvolutionSummary ?? null
  const evolutionPreferenceText = evolutionSummary?.latestDominantRung === 'space-first'
    ? 'Lighter touch, more room, less interruption pressure.'
    : evolutionSummary?.latestDominantRung === 'warm-near'
      ? 'Warmer directness can land when the opening is clearly there.'
      : ''
  const evolutionDoctrine = sanitizeText(evolutionSummary?.latestDoctrine, 220)
  const evolutionBurden = sanitizeText(evolutionSummary?.latestBurdenLine, 180)
  const evolutionTrustMeaning = sanitizeText(evolutionSummary?.latestTrustMeaning, 180)

  const summary = mergeUnique([
    `regime=${personalityContinuityState.currentRegime}`,
    `closeness=${personalityContinuityState.closenessPosture}`,
    personaAuthority.summary ? `persona=${personaAuthority.summary}` : null,
    `ladder=${activeClosenessContext}/${activeClosenessRung}`,
    `repair=${personalityContinuityState.repairPosture}`,
    relationshipPosture ? `posture=${relationshipPosture}` : null,
    preferredProactiveStyle ? `proactive=${preferredProactiveStyle}` : null,
    hostGuidance.preferenceText ? `preference=${hostGuidance.preferenceText}` : evolutionPreferenceText ? `preference=${evolutionPreferenceText}` : null,
    doctrineGuidance.doctrineSummary ? `doctrine=${doctrineGuidance.doctrineSummary}` : null,
    evolutionDoctrine ? `evolution_doctrine=${evolutionDoctrine}` : null,
    evolutionTrustMeaning ? `evolution_trust=${evolutionTrustMeaning}` : null,
  ], 6).join(' | ')

  return {
    contexts,
    personalityContinuityState,
    activeClosenessContext,
    activeClosenessRung,
    closenessLadder,
    relationshipPosture,
    openingGuidance,
    preferredProactiveStyle,
    preferenceText: hostGuidance.preferenceText || evolutionPreferenceText || activeClosenessEntry?.preference || '',
    sensitivityText: hostGuidance.sensitivityText,
    repairTriggerText: hostGuidance.repairTriggerText,
    burdenText: hostGuidance.burdenText || evolutionBurden,
    routineText: sanitizeText(input.hostPersonModel?.routines[0] ?? '', 180),
    trustRationale: evolutionTrustMeaning || hostGuidance.trustRationale,
    relationshipDoctrine: relationshipDoctrine || evolutionDoctrine,
    cautious,
    restrained,
    summary,
  }
}
