import type {
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationHabitPolicySnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReflectionLedgerSnapshot,
  AlicizationSelfEvolutionKernelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationMindEcologySnapshot } from './mind-ecology'

import {
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { buildAutobiographicalContinuityLines, pickDominantAutobiographicalGoal } from './autobiographical-self'
import { buildMindEcologyFromRuntimeSurface } from './mind-ecology'
import { resolveAlicizationProjectStateSnapshot } from './project-state-brief'

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

function sanitizeAuthorityField(raw: unknown, maxChars = 220) {
  return sanitizeAlicizationProviderFacingText(raw, maxChars, '')
}

function compactStructuredValue(raw: unknown, maxChars = 120) {
  return sanitizeAuthorityField(raw, maxChars)
    .replace(/[|;\n\r]+/gu, ' ')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxChars)
}

function normalizeProjectIdentityField(raw: unknown) {
  const text = sanitizeText(raw, 220)
  if (!text)
    return ''
  const lower = text.toLowerCase()
  if (/local-first digital life|local digital life|phase\s*1|one continuous her|same living line|same-her|same her/u.test(lower))
    return /phase\s*1/u.test(lower) ? 'life_core' : 'runtime_personhood'
  return compactStructuredValue(text, 120)
}

function structuredContinuityProjectionLine(raw: unknown, role: string) {
  const text = sanitizeText(raw, 360)
  const lower = text.toLowerCase()
  if (!text)
    return ''

  const carriesContinuityTemplate
    = containsAlicizationFixedTemplateResidue(text)
      || /same callback line|same line|same thread|one continuous|one living|same self|local-first digital life|phase\s*1|reopening from zero|reopen from zero|reopening from scratch|without restarting/u.test(lower)
  const carriesPolicyTemplate
    = /lower-pressure|low-pressure|measured-return|repair-before-closeness|repair before closeness|quiet-companionship|rest-protective|protect rest|wait for confirmation|widening closeness|widening warmth|leave room/u.test(lower)
  if (!carriesContinuityTemplate && !carriesPolicyTemplate)
    return sanitizeAuthorityField(text, 220)

  return [
    `${role}=structured_carry`,
    carriesContinuityTemplate ? 'continuity_scope=detected' : '',
    /callback/u.test(lower) ? 'callback_carry=true' : '',
    /phase\s*1|local-first digital life|local digital life/u.test(lower) ? 'phase_scope=life_core' : '',
    /unfinished|open loop|still needs|not closed/u.test(lower) ? 'open_loop=present' : '',
    /already landed|some closure|verified_closure_progress|has landed/u.test(lower) ? 'landed_closure=partial' : '',
    /lower-pressure|low-pressure|measured-return|leave room/u.test(lower) ? 'pressure=lower' : '',
    /repair-before-closeness|repair before closeness/u.test(lower) ? 'repair_policy=before_closeness' : '',
    /rest-protective|protect rest/u.test(lower) ? 'rest_window=protect' : '',
    /wait for confirmation/u.test(lower) ? 'confirmation=required' : '',
    'surface=structured',
  ].filter(Boolean).join('; ')
}

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

function looksLikeEmbodimentClosureCarryLine(raw: unknown) {
  const text = sanitizeText(raw, 320).toLowerCase()
  if (!text)
    return false

  return /holding together mainly through|being carried mainly through|living audio thread|body and voice|face and voice|body, lipsync, and voice|cross-modal closure|audible-body|audible body/u.test(text)
}

function countEmbodimentClosureSignals(raw: unknown) {
  const text = sanitizeText(raw, 320).toLowerCase()
  if (!text)
    return 0

  let score = 0
  if (text.includes('holding together mainly through') || text.includes('being carried mainly through'))
    score += 3
  if (text.includes('living audio thread'))
    score += 3
  if (text.includes('body, lipsync, and voice'))
    score += 3
  if (text.includes('body and voice') || text.includes('face and voice'))
    score += 2
  if (text.includes('audible-body') || text.includes('audible body'))
    score += 2
  if (text.includes('cross-modal closure'))
    score += 2
  if (text.includes('voice') || text.includes('lipsync') || text.includes('face and motion'))
    score += 1
  return score
}

function scoreAuthorityEmbodimentClosure(
  authority: Partial<AlicizationSelfContinuityAuthority> | null | undefined,
) {
  if (!authority)
    return 0

  return [
    authority.selfLine,
    authority.relationshipLine,
    authority.inwardLine,
    authority.authoritySummary,
  ].reduce((score, line) => score + countEmbodimentClosureSignals(line), 0)
}

function authorityCarriesSameHerProjectSignal(
  authority: Partial<AlicizationSelfContinuityAuthority> | null | undefined,
) {
  const combined = sanitizeText([
    authority?.selfLine,
    authority?.relationshipLine,
    authority?.inwardLine,
    authority?.authoritySummary,
  ].filter(Boolean).join(' | '), 800).toLowerCase()

  if (!combined)
    return false

  return /same phase 1 digital life|same living line|same-her|same her|one continuous her|continuous her|local-first digital life|phase 1/u.test(combined)
}

function looksLikeHighPriorityContinuityMemoryLine(raw: unknown) {
  const text = sanitizeText(raw, 320).toLowerCase()
  if (!text)
    return false

  return /execution-callback afterglow|callback afterglow|callback line|same living line|same line|same-her|same her|phase 1|quiet-companionship|rest-protective|lower-pressure|measured-return|reopen eagerly|continuity/u.test(text)
}

function shouldPrioritizeProjectStateCarryLine(raw: unknown) {
  const text = sanitizeText(raw, 320).toLowerCase()
  if (!text)
    return false

  return /same phase 1 digital life|some closure already landed|unfinished closure|same living line|one continuous her/u.test(text)
}

function buildProjectStateCarryLine(longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null) {
  const rememberedPlanSummary = sanitizeText(longHorizonMemory?.rememberedPlanSummary, 220)
  const rememberedConstraintSummary = sanitizeText(longHorizonMemory?.rememberedConstraintSummary, 220)
  const rememberedPreferenceSummary = sanitizeText(longHorizonMemory?.rememberedPreferenceSummary, 220)
  const dominantCueSummary = sanitizeText(longHorizonMemory?.dominantCueSummary, 220)
  const combined = [
    rememberedPlanSummary,
    rememberedConstraintSummary,
    rememberedPreferenceSummary,
    dominantCueSummary,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const carriesProjectIdentity
    = combined.includes('local-first digital life')
      || combined.includes('one continuous her')
      || combined.includes('same-her')
      || combined.includes('phase 1')
  const carriesLandedProgress
    = combined.includes('already survives')
      || combined.includes('already landed')
      || combined.includes('has landed')
      || combined.includes('already become real')
  const carriesOpenClosure
    = combined.includes('still-open closure')
      || combined.includes('not closed')
      || combined.includes('open loop')
      || combined.includes('still needs')

  if (!carriesProjectIdentity && !carriesLandedProgress && !carriesOpenClosure)
    return null

  return sanitizeText([
    carriesProjectIdentity ? 'memory_continuity=local_runtime.' : '',
    carriesLandedProgress ? 'verified_closure_progress=partial.' : '',
    carriesOpenClosure ? 'unresolved_closure=continuity.' : '',
  ].filter(Boolean).join(' '), 220) || null
}

function buildDurableSelfCoreLine(input: {
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
}) {
  const identityNarrative = sanitizeText(input.autobiographicalSelf?.identityNarrative, 220)
  const relationshipDoctrine = sanitizeText(input.autobiographicalSelf?.relationshipDoctrine, 220)
  const latestInflection = sanitizeText(input.autobiographicalSelf?.latestInflection, 220)
  const rememberedPreferenceSummary = sanitizeText(input.longHorizonMemory?.rememberedPreferenceSummary, 220)
  const rememberedConstraintSummary = sanitizeText(input.longHorizonMemory?.rememberedConstraintSummary, 220)
  const rememberedPlanSummary = sanitizeText(input.longHorizonMemory?.rememberedPlanSummary, 220)
  const dominantCueSummary = sanitizeText(input.longHorizonMemory?.dominantCueSummary, 220)
  const selfNarrative = sanitizeText(input.mindEcology?.selfNarrative, 220)
  const currentPreoccupation = sanitizeText(input.mindEcology?.currentPreoccupation, 220)
  const thoughtText = sanitizeText(input.privateThought?.thoughtText, 220)
  const selfEvolutionSummary = sanitizeText(input.selfEvolution?.summary, 220)
  const selfEvolutionRelationshipDoctrine = sanitizeText(input.selfEvolution?.relationshipDoctrine, 220)
  const selfEvolutionRelationshipCadenceSummary = sanitizeText(input.selfEvolution?.relationshipCadenceSummary, 220)
  const selfEvolutionLatestInflection = sanitizeText(input.selfEvolution?.latestInflection, 220)
  const selfEvolutionTrustMeaning = sanitizeText(input.selfEvolution?.trustMeaning, 220)
  const projectStateCarryLine = buildProjectStateCarryLine(input.longHorizonMemory ?? null)

  const combined = [
    identityNarrative,
    relationshipDoctrine,
    latestInflection,
    selfEvolutionSummary,
    selfEvolutionRelationshipDoctrine,
    selfEvolutionRelationshipCadenceSummary,
    selfEvolutionLatestInflection,
    selfEvolutionTrustMeaning,
    rememberedPreferenceSummary,
    rememberedConstraintSummary,
    rememberedPlanSummary,
    dominantCueSummary,
    selfNarrative,
    currentPreoccupation,
    thoughtText,
    projectStateCarryLine,
  ]
    .filter(Boolean)
    .join(' | ')
    .toLowerCase()

  const carriesSameHer
    = combined.includes('one continuous her')
      || combined.includes('same her')
      || combined.includes('same-her')
      || combined.includes('same self')
      || combined.includes('same living line')
  const carriesDigitalLifeIdentity
    = combined.includes('local-first digital life')
      || combined.includes('phase 1')
      || combined.includes('digital life')
  const carriesContinuityAcrossSurfaces
    = combined.includes('across quiet, memory, and speech')
      || combined.includes('across memory and speech')
      || combined.includes('across reply surface')
      || combined.includes('across reply surfaces')
      || combined.includes('every reply surface')
      || combined.includes('visible reply surface')
      || combined.includes('not a service shell')
      || combined.includes('not a shell')
  const carriesLivingSelfRestraint
    = combined.includes('living self')
      || combined.includes('living line')
      || combined.includes('do not reopen from scratch')
      || combined.includes('same line instead of restarting')

  if (!carriesSameHer && !carriesDigitalLifeIdentity && !carriesContinuityAcrossSurfaces && !carriesLivingSelfRestraint)
    return null

  return sanitizeText([
    'self_continuity=durable',
    carriesSameHer ? 'identity_scope=continuity_evidence' : '',
    carriesDigitalLifeIdentity ? 'phase_scope=life_core' : '',
    carriesContinuityAcrossSurfaces ? 'surface_scope=memory_speech_reply' : '',
    carriesLivingSelfRestraint ? 'restart_policy=context_preserving' : '',
    'surface=structured',
  ].filter(Boolean).join('; '), 220) || null
}

function shouldPreferDurableSelfCoreLine(input: {
  durableSelfCoreLine?: string | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
}) {
  const durableSelfCoreLine = sanitizeText(input.durableSelfCoreLine, 220).toLowerCase()
  if (!durableSelfCoreLine)
    return false

  const autobiographicalIdentity = sanitizeText(input.autobiographicalSelf?.identityNarrative, 220).toLowerCase()
  const autobiographicalInflection = sanitizeText(input.autobiographicalSelf?.latestInflection, 220).toLowerCase()
  const ecologySelfNarrative = sanitizeText(input.mindEcology?.selfNarrative, 220).toLowerCase()
  const baseline = [autobiographicalIdentity, autobiographicalInflection, ecologySelfNarrative]
    .filter(Boolean)
    .join(' | ')

  const explicitContinuitySignal
    = durableSelfCoreLine.includes('self_continuity=durable')
      || durableSelfCoreLine.includes('restart_policy=context_preserving')
      || durableSelfCoreLine.includes('surface_scope=memory_speech_reply')
      || durableSelfCoreLine.includes('same her')
      || durableSelfCoreLine.includes('living self')
      || durableSelfCoreLine.includes('without reopening from scratch')
      || durableSelfCoreLine.includes('across quiet, memory, and speech')
      || durableSelfCoreLine.includes('local-first digital life')
  const baselineAlreadyCarriesContinuity
    = baseline.includes('same her')
      || baseline.includes('same self')
      || baseline.includes('one continuous her')
      || baseline.includes('living self')
      || baseline.includes('across quiet, memory, and speech')
      || baseline.includes('local-first digital life')
  const baselineCarriesTruthDoctrine
    = baseline.includes('repair truth')
      || baseline.includes('truth')
      || baseline.includes('repair-first')
      || baseline.includes('ground first')
  const baselineIsGenericPersonaLine
    = !!autobiographicalIdentity
      && !baselineAlreadyCarriesContinuity
      && !/(repair truth|truth|ground|continuous|continuity|same her|same self|living self|digital life|phase 1)/u.test(autobiographicalIdentity)

  return explicitContinuitySignal
    && !baselineCarriesTruthDoctrine
    && (!baselineAlreadyCarriesContinuity || baselineIsGenericPersonaLine)
}

function buildSelfEvolutionRelationshipCadenceLine(
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null,
) {
  const relationshipCadenceSummary = sanitizeText(selfEvolution?.relationshipCadenceSummary, 220)
  if (!relationshipCadenceSummary)
    return null

  const normalized = relationshipCadenceSummary.toLowerCase()
  if (!/same her|same-her|same living line|without reopening from scratch|without restarting from scratch|across quiet, memory, and speech|one continuous her/u.test(normalized))
    return null

  return structuredContinuityProjectionLine(relationshipCadenceSummary, 'relationship_cadence')
}

function inferExecutionCallbackProjectCarryTag(input: {
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
}) {
  const combined = sanitizeText([
    input.autobiographicalSelf?.identityNarrative,
    input.autobiographicalSelf?.relationshipDoctrine,
    input.autobiographicalSelf?.latestInflection,
    input.longHorizonMemory?.rememberedPlanSummary,
    input.longHorizonMemory?.rememberedConstraintSummary,
    input.longHorizonMemory?.rememberedPreferenceSummary,
    input.longHorizonMemory?.dominantCueSummary,
    input.mindEcology?.selfNarrative,
    input.mindEcology?.relationNarrative,
    input.mindEcology?.currentPreoccupation,
    input.privateThought?.thoughtText,
  ].filter(Boolean).join(' | '), 1600).toLowerCase()

  if (!combined)
    return false

  const carriesCallbackLine
    = combined.includes('continuity-execution-callback-project-carry')
      || combined.includes('execution-callback project-carry')
      || combined.includes('callback project-carry')
      || combined.includes('execution-callback afterglow')
      || combined.includes('callback afterglow')
      || combined.includes('same callback line')
      || combined.includes('callback return')
  const carriesSameLineRestraint
    = combined.includes('same line')
      || combined.includes('still continuing')
      || combined.includes('measured-return')
      || combined.includes('lower-pressure')
      || combined.includes('reopen eagerly')

  return carriesCallbackLine && carriesSameLineRestraint
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

function shouldPreferProjectStateFallbackAuthority(input: {
  authority?: AlicizationSelfContinuityAuthority | null
  fallbackAuthority?: AlicizationSelfContinuityAuthority | null
}) {
  const authority = input.authority ?? null
  const fallbackAuthority = input.fallbackAuthority ?? null

  if (!fallbackAuthority?.sourceTags.includes('runtime-project-state-carry'))
    return false
  if (!authority)
    return true
  if (authorityCarriesSameHerProjectSignal(authority))
    return false

  const authorityHasNonDerivedSignals = authority.sourceTags.some(tag =>
    !tag.startsWith('ecology:')
    && !tag.startsWith('private-thought:')
    && !tag.startsWith('reflection:'),
  )

  return !authorityHasNonDerivedSignals
}

function mergeEmbodimentFallbackIntoAuthority(input: {
  authority?: AlicizationSelfContinuityAuthority | null
  fallbackAuthority?: AlicizationSelfContinuityAuthority | null
}) {
  const authority = input.authority ?? null
  const fallbackAuthority = input.fallbackAuthority ?? null

  if (!fallbackAuthority)
    return authority
  if (!authority)
    return fallbackAuthority
  if (shouldPreferProjectStateFallbackAuthority({ authority, fallbackAuthority })) {
    return {
      ...fallbackAuthority,
      motiveLine: fallbackAuthority.motiveLine ?? authority.motiveLine,
      habitLine: fallbackAuthority.habitLine ?? authority.habitLine,
      closenessPosture: fallbackAuthority.closenessPosture ?? authority.closenessPosture ?? null,
      sourceTags: uniqueList([
        ...fallbackAuthority.sourceTags,
        ...authority.sourceTags,
      ], 8),
    } satisfies AlicizationSelfContinuityAuthority
  }
  if (!fallbackAuthority.sourceTags.includes('project-state-companion-headline'))
    return authority

  const fallbackEmbodimentScore = scoreAuthorityEmbodimentClosure(fallbackAuthority)
  const authorityEmbodimentScore = scoreAuthorityEmbodimentClosure(authority)
  if (fallbackEmbodimentScore <= authorityEmbodimentScore)
    return authority

  const relationshipLine = fallbackAuthority.relationshipLine ?? authority.relationshipLine
  const inwardLine
    = scoreAuthorityEmbodimentClosure({
      inwardLine: fallbackAuthority.inwardLine,
      authoritySummary: fallbackAuthority.authoritySummary,
    })
    >= scoreAuthorityEmbodimentClosure({
      inwardLine: authority.inwardLine,
      authoritySummary: authority.authoritySummary,
    })
      ? (fallbackAuthority.inwardLine ?? authority.inwardLine)
      : authority.inwardLine

  return {
    ...authority,
    relationshipLine,
    inwardLine,
    authoritySummary: uniqueList([
      authority.selfLine,
      relationshipLine,
      inwardLine,
      authority.relationshipLine,
      authority.motiveLine,
      authority.habitLine,
      authority.inwardLine,
      fallbackAuthority.selfLine,
      fallbackAuthority.authoritySummary,
    ], 4).join(' | ') || authority.authoritySummary,
    closenessPosture: authority.closenessPosture ?? fallbackAuthority.closenessPosture ?? null,
    sourceTags: uniqueList([
      ...authority.sourceTags,
      ...fallbackAuthority.sourceTags,
    ], 8),
  } satisfies AlicizationSelfContinuityAuthority
}

export function buildRuntimeSurfaceProjectStateContinuityFallback(
  projectState?: {
    identity?: unknown
    currentPhase?: unknown
    latestProgress?: unknown
    latestLandedProgress?: unknown
    landedProgressSummary?: unknown
    primaryOpenLoop?: unknown
    nextClosureTarget?: unknown
    sameHerSelfLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessLine?: unknown
  } | null,
) {
  const normalizedProjectState = projectState
    ? resolveAlicizationProjectStateSnapshot({
        runtimeProjectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          latestLandedProgress:
            sanitizeText(projectState.latestLandedProgress, 320)
            || sanitizeText(projectState.latestProgress, 320)
            || sanitizeText(projectState.landedProgressSummary, 320)
            || null,
          primaryOpenLoop: projectState.primaryOpenLoop,
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerSelfLine: projectState.sameHerSelfLine ?? null,
        },
      })
    : {
        identity: '',
        currentPhase: '',
        preflightSummary: null,
        latestLandedProgress: null,
        primaryOpenLoop: null,
        nextClosureTarget: '',
        sameHerSelfLine: '',
      }
  const identity = sanitizeText(normalizedProjectState.identity, 220)
  const currentPhase = sanitizeText(normalizedProjectState.currentPhase, 160)
  const primaryOpenLoop = sanitizeText(normalizedProjectState.primaryOpenLoop, 220)
  const nextClosureTarget = sanitizeText(normalizedProjectState.nextClosureTarget, 220)
  const latestProgress = sanitizeText(normalizedProjectState.latestLandedProgress, 220)
  const sameHerSelfLine = sanitizeText(normalizedProjectState.sameHerSelfLine, 220)
  const embodimentCarryLine = uniqueList([
    looksLikeEmbodimentClosureCarryLine(projectState?.companionHeadlineLine) ? sanitizeText(projectState?.companionHeadlineLine, 320) : '',
    looksLikeEmbodimentClosureCarryLine(projectState?.companionBriefingLine) ? sanitizeText(projectState?.companionBriefingLine, 320) : '',
    looksLikeEmbodimentClosureCarryLine(projectState?.preDialogueAwarenessLine) ? sanitizeText(projectState?.preDialogueAwarenessLine, 320) : '',
  ], 1)[0] ?? null

  if (!identity && !currentPhase && !primaryOpenLoop && !nextClosureTarget && !latestProgress && !sameHerSelfLine && !embodimentCarryLine)
    return null

  const selfLine = sanitizeText([
    'surface=structured',
    sameHerSelfLine ? structuredContinuityProjectionLine(sameHerSelfLine, 'continuity_anchor') : '',
    identity && normalizeProjectIdentityField(identity) ? `identity_scope=${normalizeProjectIdentityField(identity)}` : '',
    currentPhase && (normalizeProjectIdentityField(currentPhase) || compactStructuredValue(currentPhase, 80))
      ? `phase_scope=${normalizeProjectIdentityField(currentPhase) || compactStructuredValue(currentPhase, 80)}`
      : '',
  ].filter(Boolean).join(' '), 220) || null
  const relationshipLine = sanitizeText(
    embodimentCarryLine
    || [
      primaryOpenLoop ? `open_loop=${compactStructuredValue(primaryOpenLoop, 120)}; pressure=lower` : '',
      nextClosureTarget ? `next_closure=${compactStructuredValue(nextClosureTarget, 140)}` : '',
      'surface=structured',
    ].filter(Boolean).join(' '),
    220,
  ) || null
  const inwardLine = sanitizeText([
    embodimentCarryLine ? `embodiment_carry=${compactStructuredValue(embodimentCarryLine, 120)}` : '',
    sameHerSelfLine ? structuredContinuityProjectionLine(sameHerSelfLine, 'continuity_anchor') : '',
    latestProgress ? `verified_closure_progress=${compactStructuredValue(latestProgress, 140)}` : '',
    primaryOpenLoop ? `open_loop=${compactStructuredValue(primaryOpenLoop, 120)}` : '',
    'surface=structured',
  ].filter(Boolean).join(' | '), 220) || null
  const authoritySummary = uniqueList([
    selfLine,
    relationshipLine,
    inwardLine,
  ], 3).join(' | ') || null

  if (!authoritySummary)
    return null

  return {
    selfLine,
    relationshipLine,
    motiveLine: null,
    habitLine: null,
    inwardLine,
    authoritySummary,
    closenessPosture: 'space-first',
    sourceTags: uniqueList([
      'runtime-project-state-carry',
      identity ? 'project-state-identity' : '',
      currentPhase ? 'project-state-phase' : '',
      primaryOpenLoop ? 'project-state-open-loop' : '',
      nextClosureTarget ? 'project-state-next-closure' : '',
      sameHerSelfLine ? 'project-state-same-her' : '',
      embodimentCarryLine ? 'project-state-companion-headline' : '',
    ], 8),
  } satisfies AlicizationSelfContinuityAuthority
}

export function buildSelfContinuityAuthority(input: {
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
}): AlicizationSelfContinuityAuthority | null {
  const autobiographicalGoal = pickDominantAutobiographicalGoal(input.autobiographicalSelf ?? null)
  const continuityLines = buildAutobiographicalContinuityLines({
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    privateThought: input.privateThought ?? null,
    mindEcology: input.mindEcology ?? null,
  })
  const reflection = latestReflection(input.reflectionLedger ?? null)
  const explicitProjectStateCarryLine = sanitizeText([
    input.autobiographicalSelf?.latestInflection,
    input.autobiographicalSelf?.relationshipDoctrine,
    input.longHorizonMemory?.rememberedConstraintSummary,
    input.longHorizonMemory?.rememberedPreferenceSummary,
    input.longHorizonMemory?.dominantCueSummary,
    input.privateThought?.thoughtText,
    input.privateThought?.emotionalTension,
    input.mindEcology?.currentPreoccupation,
    input.mindEcology?.selfNarrative,
    input.mindEcology?.relationNarrative,
  ].filter(Boolean).join(' | '), 800)
  const carriesExplicitProjectStateClosure
    = /same phase 1 digital life|same living line|one continuous her|same-her|same her|continuous her/iu
      .test(explicitProjectStateCarryLine)
      && /unfinished|continue|continuing|keep the same|leave room|measured-return|lower-pressure|rest-protective|protect rest|quiet[- ]companionship|line inward|stay inward/iu
        .test(explicitProjectStateCarryLine)
  const projectStateCarryLine = buildProjectStateCarryLine(input.longHorizonMemory ?? null)
    || (carriesExplicitProjectStateClosure ? explicitProjectStateCarryLine : null)
  const prioritizedContinuityMemoryLines = uniqueList([
    looksLikeHighPriorityContinuityMemoryLine(input.longHorizonMemory?.dominantCueSummary) ? sanitizeText(input.longHorizonMemory?.dominantCueSummary, 220) : '',
    looksLikeHighPriorityContinuityMemoryLine(input.longHorizonMemory?.rememberedConstraintSummary) ? sanitizeText(input.longHorizonMemory?.rememberedConstraintSummary, 220) : '',
    looksLikeHighPriorityContinuityMemoryLine(input.longHorizonMemory?.rememberedPlanSummary) ? sanitizeText(input.longHorizonMemory?.rememberedPlanSummary, 220) : '',
    looksLikeHighPriorityContinuityMemoryLine(input.longHorizonMemory?.rememberedPreferenceSummary) ? sanitizeText(input.longHorizonMemory?.rememberedPreferenceSummary, 220) : '',
  ], 2)
  const prioritizedProjectStateCarryLine = shouldPrioritizeProjectStateCarryLine(projectStateCarryLine)
    ? projectStateCarryLine
    : null
  const durableSelfCoreLine = buildDurableSelfCoreLine({
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    mindEcology: input.mindEcology ?? null,
    privateThought: input.privateThought ?? null,
    selfEvolution: input.selfEvolution ?? null,
  })
  const selfEvolutionRelationshipCadenceLine = buildSelfEvolutionRelationshipCadenceLine(input.selfEvolution ?? null)
  const preferDurableSelfCoreLine = shouldPreferDurableSelfCoreLine({
    durableSelfCoreLine,
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    mindEcology: input.mindEcology ?? null,
  })
  const carriesExecutionCallbackProjectCarry = inferExecutionCallbackProjectCarryTag({
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    mindEcology: input.mindEcology ?? null,
    privateThought: input.privateThought ?? null,
  })

  const selfLine = sanitizeText(
    (preferDurableSelfCoreLine ? (selfEvolutionRelationshipCadenceLine || durableSelfCoreLine) : '')
    || structuredContinuityProjectionLine(input.autobiographicalSelf?.identityNarrative, 'self_line')
    || structuredContinuityProjectionLine(input.autobiographicalSelf?.latestInflection, 'self_line')
    || structuredContinuityProjectionLine(input.mindEcology?.selfNarrative, 'self_line')
    || selfEvolutionRelationshipCadenceLine
    || durableSelfCoreLine
    || structuredContinuityProjectionLine(continuityLines[0], 'self_line')
    || '',
    220,
  ) || null
  const relationshipLine = sanitizeText(
    structuredContinuityProjectionLine(input.autobiographicalSelf?.relationshipDoctrine, 'relationship_line')
    || structuredContinuityProjectionLine(input.mindEcology?.relationNarrative, 'relationship_line')
    || '',
    220,
  ) || null
  const motiveLine = sanitizeText(
    sanitizeAuthorityField(asArray(input.motiveEngine?.backgroundAgendas)[0]?.summary, 220)
    || sanitizeAuthorityField(asArray(input.motiveEngine?.longTermGoals)[0]?.summary, 220)
    || sanitizeAuthorityField(autobiographicalGoal?.summary, 220)
    || '',
    220,
  ) || null
  const habitLine = sanitizeText(
    input.habitPolicy?.requiresGroundingBeforeSurface
      ? 'habit_policy=ground_first; reply_source=model_authored; surface=structured'
      : input.habitPolicy?.prefersQuietCompanionship
        ? 'presence_policy=quiet_companionship; pressure=low; surface=structured'
        : input.habitPolicy?.protectsRestWindow
          ? 'rest_window=protect; surface=structured'
          : input.habitPolicy?.dominantMode
            ? `dominant_mode=${compactStructuredValue(input.habitPolicy.dominantMode, 80)}; surface=structured`
            : '',
    220,
  ) || null
  const inwardLine = sanitizeText(
    (
      carriesExecutionCallbackProjectCarry
        ? [
            ...prioritizedContinuityMemoryLines.map(line => structuredContinuityProjectionLine(line, 'memory_carry')),
            structuredContinuityProjectionLine(projectStateCarryLine, 'project_state_carry'),
            structuredContinuityProjectionLine(input.privateThought?.thoughtText, 'private_thought'),
            structuredContinuityProjectionLine(input.mindEcology?.currentPreoccupation, 'current_preoccupation'),
            sanitizeAuthorityField(reflection?.revision, 220),
            structuredContinuityProjectionLine(continuityLines[1], 'continuity_line'),
          ]
        : [
            structuredContinuityProjectionLine(prioritizedProjectStateCarryLine, 'project_state_carry'),
            structuredContinuityProjectionLine(input.privateThought?.thoughtText, 'private_thought'),
            structuredContinuityProjectionLine(input.mindEcology?.currentPreoccupation, 'current_preoccupation'),
            sanitizeAuthorityField(reflection?.revision, 220),
            structuredContinuityProjectionLine(continuityLines[1], 'continuity_line'),
            ...prioritizedContinuityMemoryLines.map(line => structuredContinuityProjectionLine(line, 'memory_carry')),
            prioritizedProjectStateCarryLine ? '' : structuredContinuityProjectionLine(projectStateCarryLine, 'project_state_carry'),
          ]
    ).filter(Boolean).join(' | '),
    220,
  ) || null
  const callbackPriorityAuthorityLine
    = carriesExecutionCallbackProjectCarry
      ? (prioritizedContinuityMemoryLines[0] ?? projectStateCarryLine ?? null)
      : null
  const authoritySummary = uniqueList(
    carriesExecutionCallbackProjectCarry
      ? [
          selfLine,
          callbackPriorityAuthorityLine,
          relationshipLine,
          durableSelfCoreLine,
          motiveLine,
          habitLine,
          inwardLine,
        ]
      : [
          selfLine,
          durableSelfCoreLine,
          relationshipLine,
          motiveLine,
          habitLine,
          inwardLine,
        ],
    3,
  ).join(' | ') || null
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
  const closenessPosture = sanitizeText(
    ecologyClosenessPosture
    || autobiographicalRelationshipStyle
    || input.mindEcology?.relationNarrative
    || input.autobiographicalSelf?.relationshipDoctrine
    || '',
    80,
  ) || null

  if (!authoritySummary)
    return null

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
      durableSelfCoreLine ? 'durable-self-core' : '',
      input.selfEvolution?.relationshipCadenceSummary ? 'self-evolution-relationship-cadence' : '',
      projectStateCarryLine ? 'project-state-carry' : '',
      carriesExecutionCallbackProjectCarry ? 'continuity-execution-callback-project-carry' : '',
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
  const authority = buildSelfContinuityAuthority({
    autobiographicalSelf: surface.memory?.autobiographicalSelf ?? null,
    longHorizonMemory: surface.memory?.longHorizonMemory ?? null,
    motiveEngine: surface.memory?.motiveEngine ?? null,
    habitPolicy: surface.agency?.habitPolicy ?? null,
    mindEcology: buildMindEcologyFromRuntimeSurface(surface),
    privateThought: surface.cognition?.privateThought ?? null,
    reflectionLedger: surface.memory?.reflectionLedger ?? null,
    selfEvolution: surface.memory?.selfEvolution ?? null,
  })
  const fallbackAuthority = buildRuntimeSurfaceProjectStateContinuityFallback(
    surface.dialogue?.currentConsciousFrame?.projectState
    ?? surface.raw?.runtimeDigest?.projectState
    ?? (surface.cognition as { runtimeDigest?: { projectState?: Record<string, unknown> | null } } | null | undefined)?.runtimeDigest?.projectState
    ?? null,
  )

  return mergeEmbodimentFallbackIntoAuthority({
    authority,
    fallbackAuthority,
  })
}
