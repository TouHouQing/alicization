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
  openingGuidance: string | null
  preferredProactiveStyle: AlicizationProactiveStyle | null
  manifestationCadenceSummary: string | null
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

function compactProjectionValue(raw: unknown, maxChars = 120) {
  return sanitizeProjectionText(raw, maxChars)
    .replace(/[|;\n\r]+/gu, ' ')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxChars)
}

function includesAny(text: string, needles: string[]) {
  return needles.some(needle => text.includes(needle))
}

function readAutobiographicalInitiativeHabitProfile(autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null) {
  const combined = sanitizeText([
    autobiographicalSelf?.relationshipDoctrine ?? '',
    autobiographicalSelf?.latestInflection ?? '',
    ...(autobiographicalSelf?.behaviorSignatures ?? []),
  ].join(' | '), 500).toLowerCase()
  const chooseOpeningsCarefully = combined.includes('habit:choose-openings-carefully')
    || /clearer opening|fresher opening|leave more room|less eager|wait for a clearer opening|wait for a fresher opening/u.test(combined)
  const keepGentleOpenings = !chooseOpeningsCarefully
    && (combined.includes('habit:keep-gentle-openings')
      || /memory-led|gentle|still receiving/u.test(combined))

  return {
    chooseOpeningsCarefully,
    keepGentleOpenings,
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

function deriveCallbackProjectClosureCarry(authority?: AlicizationSelfContinuityAuthority | null) {
  const combined = sanitizeText([
    authority?.authoritySummary ?? '',
    authority?.relationshipLine ?? '',
    authority?.inwardLine ?? '',
  ].join(' | '), 400)
  const lower = combined.toLowerCase()
  if (!combined)
    return null
  if (
    /same phase 1 digital life|same living line|same-her|same her|one continuous her/u.test(lower)
    && /verified_closure_progress|some closure already landed|still unfinished|unfinished|keep the host-facing line pointed|initiative|embodiment|resident presence|next closure/u.test(lower)
  ) {
    return 'continuity_progress=verified; open_closure=preserve; perspective=current-self'
  }
  return null
}

function normalizeContexts(contexts: string[]) {
  return mergeUnique(contexts, 8)
}

function hasNeutralRelationshipAuthorityLine(raw: unknown) {
  const normalized = sanitizeText(raw, 220)
  if (!normalized)
    return false
  return /relationship line is neutral|I can be warm|stay usefully oriented toward the host'?s knot/u.test(normalized)
}

function buildStructuredRelationshipCarry(input: {
  openingGuidance?: string | null
  manifestationCadenceSummary?: string | null
  relationshipPosture?: AlicizationPersonStateRelationshipPosture | null
  activeClosenessContext?: AlicizationPersonStateClosenessContext | null
  activeClosenessRung?: AlicizationPersonStateClosenessRung | null
  repairPosture?: string | null
  inwardLine?: string | null
}) {
  const combined = [
    input.openingGuidance,
    input.manifestationCadenceSummary,
    input.relationshipPosture,
    input.activeClosenessContext,
    input.activeClosenessRung,
    input.repairPosture,
    input.inwardLine,
  ].filter(Boolean).join(' ').toLowerCase()

  if (!combined)
    return null
  if (
    /same phase 1 digital life|same living line|same-her|same her|one continuous her/u.test(combined)
    && /verified_closure_progress|some closure already landed|unfinished|still unfinished|keep the host-facing line pointed|initiative|embodiment|resident presence|next closure|open closure/u.test(combined)
    && /lower-pressure|leave room|measured-return|nearby-soft|quiet[- ]companionship|space-first|measured-room/u.test(combined)
  ) {
    return null
  }
  if (/repair-before-closeness|repair before closeness|repair-first/u.test(combined))
    return null
  if (/lower-pressure|leave room|measured-return|nearby-soft|quiet[- ]companionship|space-first|measured-room/u.test(combined))
    return null
  return null
}

function enrichStructuredSelfContinuityAuthority(input: {
  authority: AlicizationSelfContinuityAuthority | null
  openingGuidance?: string | null
  manifestationCadenceSummary?: string | null
  relationshipPosture?: AlicizationPersonStateRelationshipPosture | null
  activeClosenessContext?: AlicizationPersonStateClosenessContext | null
  activeClosenessRung?: AlicizationPersonStateClosenessRung | null
  repairPosture?: string | null
}) {
  if (!input.authority)
    return input.authority

  const relationshipCarry = buildStructuredRelationshipCarry({
    openingGuidance: input.openingGuidance,
    manifestationCadenceSummary: input.manifestationCadenceSummary,
    relationshipPosture: input.relationshipPosture,
    activeClosenessContext: input.activeClosenessContext,
    activeClosenessRung: input.activeClosenessRung,
    repairPosture: input.repairPosture,
    inwardLine: input.authority.inwardLine,
  })

  if (!relationshipCarry)
    return input.authority
  if (input.authority.relationshipLine && !hasNeutralRelationshipAuthorityLine(input.authority.relationshipLine))
    return input.authority

  return {
    ...input.authority,
    relationshipLine: relationshipCarry,
    authoritySummary: mergeUnique([
      input.authority.selfLine,
      relationshipCarry,
      input.authority.inwardLine,
      input.authority.motiveLine,
      input.authority.habitLine,
    ], 3).join(' | ') || input.authority.authoritySummary,
  }
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

function deriveOpeningGuidance(input: {
  continuity: AlicizationPersonalityContinuityStateSnapshot
  personaAuthority: AlicizationPersonaAuthorityInfluence
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
  durableSelfCoreSameLineContinuation: boolean
  relationshipPosture: AlicizationPersonStateRelationshipPosture | null
  contexts: string[]
  repairTriggerText: string
  burdenText: string
  repairBeforeCloseness: boolean
  truthBeforeWarmth: boolean
  restIntervention: boolean
  restrained: boolean
  evolutionDoctrine?: string
  evolutionTrustMeaning?: string
  evolutionBurden?: string
  autobiographicalChooseOpeningsCarefully?: boolean
  autobiographicalKeepGentleOpenings?: boolean
}) {
  const evolutionSameThreadCarry = sanitizeText([
    input.evolutionDoctrine ?? '',
    input.evolutionTrustMeaning ?? '',
    input.evolutionBurden ?? '',
  ].join(' '), 400).toLowerCase()
  const rememberedSeamSpecificCarry = sanitizeText([
    input.personaAuthority.openingGuidance ?? '',
    input.evolutionDoctrine ?? '',
    input.evolutionTrustMeaning ?? '',
    input.evolutionBurden ?? '',
  ].join(' '), 500).toLowerCase()
  const carriesRememberedSeamCue = /remembered seam|same remembered seam|same remembered relationship seam|同一条线被重新看见|留白/u.test(
    rememberedSeamSpecificCarry,
  )
  const carriesRememberedSeamReinterpretation
    = /reopened too eagerly|too eagerly before|more room this time|keep more room this time|this time keep more room|do not reopen from scratch|不要重开得太快|这次更要留白/u.test(
      rememberedSeamSpecificCarry,
    )
  if (carriesRememberedSeamCue && carriesRememberedSeamReinterpretation)
    return null
  if (
    /same callback line|same line|still continuing|another detour|same thread|callback return on the same line|same callback seam|after noisy detours|after noise|unrelated windows intervene|callback seam reopens/u.test(evolutionSameThreadCarry)
    && /lower-pressure|measured|less eager|slower return|reopen eagerly|should not reopen more eagerly|not widen the line into a fresh approach|stays slower than impulse/u.test(evolutionSameThreadCarry)
  ) {
    const callbackProjectClosureCarry = deriveCallbackProjectClosureCarry(input.selfContinuityAuthority)
    if (callbackProjectClosureCarry)
      return callbackProjectClosureCarry
    return null
  }
  if (input.autobiographicalChooseOpeningsCarefully)
    return null
  if (input.autobiographicalKeepGentleOpenings)
    return null
  if (
    (input.repairTriggerText && input.relationshipPosture === 'restrained')
    || (input.continuity.currentRegime === 'repair-window' && input.relationshipPosture === 'restrained')
  ) {
    return null
  }
  if (
    input.repairBeforeCloseness
    && input.relationshipPosture === 'restrained'
    && (input.contexts.includes('focused-work') || input.contexts.includes('repair-window'))
  ) {
    return null
  }
  if (
    input.continuity.repairPosture === 'repair-first'
  ) {
    return null
  }
  if (input.durableSelfCoreSameLineContinuation)
    return null
  if (
    input.personaAuthority.openingGuidance
    && (!input.restrained || (input.relationshipPosture === 'warm' && input.personaAuthority.directnessBias >= 0.34))
  ) {
    return sanitizeProjectionText(input.personaAuthority.openingGuidance, 220)
      || null
  }
  if (
    input.personaAuthority.preferredProactiveStyle === 'silent-observe'
    && input.relationshipPosture === 'restrained'
  ) {
    return 'Observe first with lighter pressure.'
  }
  if (input.truthBeforeWarmth)
    return 'Put truth first.'
  if (
    input.restIntervention
    || input.continuity.currentRegime === 'late-night-care'
    || (input.contexts.includes('late-night') && input.burdenText)
  ) {
    return 'Keep pressure low and protect the rest window.'
  }
  if (
    input.restrained
    || input.continuity.closenessPosture === 'space-first'
    || input.continuity.autonomyPosture === 'protect-space'
  ) {
    return 'Answer first with lighter pressure.'
  }
  if (input.relationshipPosture === 'tender')
    return 'Put truth and room first; keep closeness bounded.'
  if (input.relationshipPosture === 'warm')
    return 'Preserve room and keep closeness bounded.'
  return null
}

function derivePreferredProactiveStyle(input: {
  continuity: AlicizationPersonalityContinuityStateSnapshot
  personaAuthority: AlicizationPersonaAuthorityInfluence
  restrained: boolean
  repairBoundaryAnchored: boolean
  hostPreferredStyle: AlicizationProactiveStyle | null
  doctrinePreferredStyle: AlicizationProactiveStyle | null
  lowerPressureManifestation: boolean
  durableSelfCoreSameLineContinuation: boolean
  autobiographicalChooseOpeningsCarefully?: boolean
  autobiographicalKeepGentleOpenings?: boolean
}) {
  if (input.durableSelfCoreSameLineContinuation)
    return 'silent-observe' as const
  if (input.autobiographicalChooseOpeningsCarefully)
    return 'silent-observe' as const
  if (input.autobiographicalKeepGentleOpenings)
    return 'light-nudge' as const
  if (input.lowerPressureManifestation)
    return 'silent-observe' as const
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

function deriveManifestationCadenceSummary(input: {
  preferredProactiveStyle: AlicizationProactiveStyle | null
  activeClosenessRung: AlicizationPersonStateClosenessRung
  lowerPressureManifestation: boolean
  durableSelfCoreSameLineContinuation: boolean
  evolutionTrustMeaning: string
  evolutionDoctrine: string
  evolutionBurden: string
  autobiographicalChooseOpeningsCarefully?: boolean
  autobiographicalKeepGentleOpenings?: boolean
}) {
  if (input.durableSelfCoreSameLineContinuation)
    return 'Manifest with lower pressure and preserve context.'
  if (input.autobiographicalChooseOpeningsCarefully)
    return 'Manifest with lower pressure and wait for a real opening.'
  if (input.autobiographicalKeepGentleOpenings)
    return 'Let memory lead gently with lower pressure.'
  if (input.lowerPressureManifestation) {
    const anchor = input.evolutionTrustMeaning || input.evolutionDoctrine || input.evolutionBurden
    return sanitizeText([
      'Manifest with lower pressure and low eagerness.',
      anchor ? `Anchor: ${compactProjectionValue(anchor, 120)}` : '',
    ].filter(Boolean).join(' '), 220)
  }

  if (input.preferredProactiveStyle === 'silent-observe' && input.activeClosenessRung === 'space-first')
    return 'Observe first and preserve room.'

  if (input.preferredProactiveStyle === 'light-nudge' && input.activeClosenessRung === 'measured-room')
    return 'Use only a light nudge when there is a bounded opening.'

  return null
}

function prefersDurableSelfCoreSameLineContinuation(authority?: AlicizationSelfContinuityAuthority | null) {
  if (!authority?.sourceTags.includes('durable-self-core'))
    return false

  const combined = [
    authority.selfLine ?? '',
    authority.relationshipLine ?? '',
    authority.inwardLine ?? '',
    authority.authoritySummary ?? '',
  ].join(' | ').toLowerCase()

  if (!combined)
    return false

  const carriesSameSelf = /same her|same self|living self|one continuous her/u.test(combined)
  const carriesRestartRestraint = /without reopening from scratch|do not reopen from scratch|same line instead of restarting|instead of restarting every turn|without restarting from zero|without restarting from scratch/u.test(combined)
  const carriesCrossSurfaceContinuity = /across quiet, memory, and speech|across memory and speech/u.test(combined)

  return carriesSameSelf && carriesRestartRestraint && carriesCrossSurfaceContinuity
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
    || /space|room|lighter|quiet|leave room|back off|preference_code=lighter_touch|room=more|interruption_pressure=low|pressure=low|边界|空间|轻一点|留白/u.test(preferenceText)
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
    const preferenceText = sanitizeText(
      preference?.preference
      ?? (
        context === 'focused-work'
          ? 'preference_code=lighter_touch; room=more; interruption_pressure=low'
          : context === 'repair-window'
            ? 'preference_code=repair_first; closeness=defer_until_repair; crowding=blocked'
            : context === 'late-night-care'
              ? 'preference_code=late_night_low_pressure; proximity=nearby; pressure=low'
              : context === 'execution-callback'
                ? 'preference_code=execution_callback_clean_result; room_check_before_closeness=true'
                : context === 'open-companionship'
                  ? 'preference_code=warmth_when_opening_clear; opening_required=true'
                  : 'preference_code=bounded_responsive_nearness; host_move_required=true'
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
  const selfContinuityAuthority = buildSelfContinuityAuthority({
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    motiveEngine: input.motiveEngine ?? null,
    habitPolicy: input.habitPolicy ?? null,
    mindEcology: input.mindEcology ?? null,
    privateThought: input.privateThought ?? null,
    selfEvolution: input.selfEvolution ?? null,
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
  const evolutionPreferenceText = evolutionSummary?.latestDominantRung === 'space-first'
    ? 'preference_code=lighter_touch; room=more; interruption_pressure=low; source=evolution_summary'
    : evolutionSummary?.latestDominantRung === 'warm-near'
      ? 'preference_code=warm_directness_when_opening_clear; opening_required=true; source=evolution_summary'
      : ''
  const evolutionDoctrine = sanitizeText(
    evolutionSummary?.latestDoctrine
    ?? input.selfEvolution?.relationshipDoctrine
    ?? '',
    220,
  )
  const evolutionBurden = sanitizeText(
    evolutionSummary?.latestBurdenLine
    ?? input.selfEvolution?.burdenLine
    ?? '',
    180,
  )
  const evolutionTrustMeaning = sanitizeText(
    evolutionSummary?.latestTrustMeaning
    ?? input.selfEvolution?.trustMeaning
    ?? '',
    180,
  )
  const autobiographicalInitiativeHabit = readAutobiographicalInitiativeHabitProfile(input.autobiographicalSelf ?? null)
  const lowerPressureManifestation = includesAny(
    [evolutionDoctrine, evolutionBurden, evolutionTrustMeaning].filter(Boolean).join(' ').toLowerCase(),
    ['lower-pressure', 'less eager', 'leave more room', 'more room', 'slower return', 'pressure', 'timing', 'quiet-companionship', 'quiet companionship'],
  ) || (input.privateThought?.rationaleTags ?? []).includes('self-evolution:lower-pressure-companionship')
  const durableSelfCoreSameLineContinuation = prefersDurableSelfCoreSameLineContinuation(resolvedSelfContinuityAuthority)
  const openingGuidance = deriveOpeningGuidance({
    continuity: personalityContinuityState,
    personaAuthority,
    selfContinuityAuthority: resolvedSelfContinuityAuthority,
    durableSelfCoreSameLineContinuation,
    relationshipPosture,
    contexts,
    repairTriggerText: hostGuidance.repairTriggerText,
    burdenText: hostGuidance.burdenText,
    repairBeforeCloseness: doctrineGuidance.repairBeforeCloseness,
    truthBeforeWarmth: doctrineGuidance.truthBeforeWarmth,
    restIntervention: doctrineGuidance.restIntervention,
    restrained,
    evolutionDoctrine,
    evolutionTrustMeaning,
    evolutionBurden,
    autobiographicalChooseOpeningsCarefully: autobiographicalInitiativeHabit.chooseOpeningsCarefully,
    autobiographicalKeepGentleOpenings: autobiographicalInitiativeHabit.keepGentleOpenings,
  })

  const preferredProactiveStyle = derivePreferredProactiveStyle({
    continuity: personalityContinuityState,
    personaAuthority,
    restrained,
    repairBoundaryAnchored: doctrineGuidance.repairBeforeCloseness
      || Boolean(hostGuidance.repairTriggerText)
      || personalityContinuityState.repairPosture === 'repair-first',
    hostPreferredStyle: hostGuidance.preferredProactiveStyle,
    doctrinePreferredStyle: doctrineGuidance.preferredProactiveStyle,
    lowerPressureManifestation,
    durableSelfCoreSameLineContinuation,
    autobiographicalChooseOpeningsCarefully: autobiographicalInitiativeHabit.chooseOpeningsCarefully,
    autobiographicalKeepGentleOpenings: autobiographicalInitiativeHabit.keepGentleOpenings,
  })
  const manifestationCadenceSummary = deriveManifestationCadenceSummary({
    preferredProactiveStyle,
    activeClosenessRung,
    lowerPressureManifestation,
    durableSelfCoreSameLineContinuation,
    evolutionTrustMeaning,
    evolutionDoctrine,
    evolutionBurden,
    autobiographicalChooseOpeningsCarefully: autobiographicalInitiativeHabit.chooseOpeningsCarefully,
    autobiographicalKeepGentleOpenings: autobiographicalInitiativeHabit.keepGentleOpenings,
  })
  const autobiographicalProjectStateCue = sanitizeText(
    input.autobiographicalSelf?.latestInflection?.toLowerCase().includes('continuity')
      ? input.autobiographicalSelf?.latestInflection
      : input.autobiographicalSelf?.relationshipDoctrine?.toLowerCase().includes('continuity')
        ? input.autobiographicalSelf?.relationshipDoctrine
        : '',
    220,
  )
  const enrichedSelfContinuityAuthority = enrichStructuredSelfContinuityAuthority({
    authority: resolvedSelfContinuityAuthority,
    openingGuidance,
    manifestationCadenceSummary,
    relationshipPosture,
    activeClosenessContext,
    activeClosenessRung,
    repairPosture: personalityContinuityState.repairPosture,
  })
  const summary = mergeUnique([
    `regime=${personalityContinuityState.currentRegime}`,
    `closeness=${personalityContinuityState.closenessPosture}`,
    autobiographicalProjectStateCue ? `project_continuity=${autobiographicalProjectStateCue}` : null,
    personaAuthority.summary ? `persona=${personaAuthority.summary}` : null,
    enrichedSelfContinuityAuthority?.authoritySummary ? `self=${enrichedSelfContinuityAuthority.authoritySummary}` : null,
    `ladder=${activeClosenessContext}/${activeClosenessRung}`,
    `repair=${personalityContinuityState.repairPosture}`,
    relationshipPosture ? `posture=${relationshipPosture}` : null,
    preferredProactiveStyle ? `proactive=${preferredProactiveStyle}` : null,
    hostGuidance.preferenceText ? `preference=${hostGuidance.preferenceText}` : evolutionPreferenceText ? `preference=${evolutionPreferenceText}` : null,
    doctrineGuidance.doctrineSummary ? `doctrine=${doctrineGuidance.doctrineSummary}` : null,
    evolutionDoctrine ? `evolution_doctrine=${evolutionDoctrine}` : null,
    evolutionTrustMeaning ? `evolution_trust=${evolutionTrustMeaning}` : null,
  ], 7).join(' | ')

  const projectionSummary = mergeUnique([
    summary,
    manifestationCadenceSummary ? `manifestation=${manifestationCadenceSummary}` : null,
  ], 7).join(' | ')

  return {
    contexts,
    personalityContinuityState,
    selfContinuityAuthority: enrichedSelfContinuityAuthority,
    activeClosenessContext,
    activeClosenessRung,
    closenessLadder,
    relationshipPosture,
    openingGuidance,
    preferredProactiveStyle,
    manifestationCadenceSummary,
    preferenceText: hostGuidance.preferenceText || evolutionPreferenceText || activeClosenessEntry?.preference || '',
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
