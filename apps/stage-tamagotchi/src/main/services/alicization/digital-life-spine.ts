import type {
  AlicizationDigitalLifeSpineDigest,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type {
  AlicizationDigitalLifeArchitectureSnapshot,
} from './digital-life-architecture'
import type {
  AlicizationDigitalLifeContinuitySignal,
  AlicizationDigitalLifeMindStateCommitShape,
  AlicizationDigitalLifeProactivePolicySnapshot,
  AlicizationDigitalLifeProactiveSelection,
  AlicizationDigitalLifeRuntimeSurface,
  CommitAlicizationDigitalLifeMindStateInput,
} from './digital-life-kernel'

import { deriveAlicizationContinuityDeliberationFromSpine } from './continuity-deliberation'
import { buildAlicizationDigitalLifeArchitecture } from './digital-life-architecture'
import {
  buildAlicizationDigitalLifeContinuitySignal,
  buildAlicizationDigitalLifeProactivePolicySnapshot,
  buildAlicizationDigitalLifeProactiveSelection,
  buildAlicizationDigitalLifeRuntimeSurface,
  commitAlicizationDigitalLifeMindState,
} from './digital-life-kernel'
import { buildAlicizationDigitalLifeMemoryDigest } from './digital-life-memory'
import { buildMindEcology } from './mind-ecology'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'

export interface AlicizationDigitalLifeSpineSnapshot {
  version: 'digital-life-spine-v1'
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface
  architecture: AlicizationDigitalLifeArchitectureSnapshot | null
  continuitySignal: AlicizationDigitalLifeContinuitySignal | null
  proactiveSelection: AlicizationDigitalLifeProactiveSelection
  proactivePolicy: AlicizationDigitalLifeProactivePolicySnapshot
  runtime?: AlicizationDigitalLifeSpineDigest['runtime'] | null
  proactive?: AlicizationDigitalLifeSpineDigest['proactive'] | null
  autonomy?: AlicizationDigitalLifeSpineDigest['autonomy'] | null
  memory?: AlicizationDigitalLifeSpineDigest['memory'] | null
  motive?: AlicizationDigitalLifeSpineDigest['motive'] | null
  habit?: AlicizationDigitalLifeSpineDigest['habit'] | null
  outcomeLearning?: AlicizationDigitalLifeSpineDigest['outcomeLearning'] | null
  embodiment?: AlicizationDigitalLifeSpineDigest['embodiment'] | null
  cognition?: AlicizationDigitalLifeRuntimeSurface['cognition'] | null
  dialogue?: AlicizationDigitalLifeRuntimeSurface['dialogue'] | null
  agency?: AlicizationDigitalLifeRuntimeSurface['agency'] | null
}

export interface AlicizationCommittedDigitalLifeSpine {
  version: 'digital-life-spine-commit-v1'
  previousState: AlicizationVisualPresenceStateSnapshot
  nextState: AlicizationVisualPresenceStateSnapshot
  previous: AlicizationDigitalLifeSpineSnapshot
  current: AlicizationDigitalLifeSpineSnapshot
}

function sanitizeDigitalLifeSpineDigestText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function looksLikeSceneContaminatedProjectSameHerLine(raw: unknown) {
  const text = sanitizeDigitalLifeSpineDigestText(raw, 320)
  if (!text)
    return false

  const lowered = text.toLowerCase()
  const carriesProjectSameHerBaseline
    = lowered.includes('same phase 1 digital life')
      || lowered.includes('same living line')
      || lowered.includes('continuous her')
      || lowered.includes('one continuous her')
  const carriesForegroundSceneNarration
    = /宿主正在|宿主还在沿着|host is|host is still following|runtime\.ts|index\.ts|callback result seam|foreground|screen|window|scene|工作线程|work thread|trust seam/u.test(text)

  return carriesProjectSameHerBaseline && carriesForegroundSceneNarration
}

function sanitizeProjectSameHerCarryCandidate(raw: unknown, maxChars = 220) {
  const text = sanitizeDigitalLifeSpineDigestText(raw, maxChars)
  if (!text)
    return ''
  return looksLikeSceneContaminatedProjectSameHerLine(text) ? '' : text
}

function normalizeDigitalLifeSpineDigestNumber(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return null
  return value
}

function normalizeDigitalLifeSpineDigestUnit(raw: unknown) {
  const value = normalizeDigitalLifeSpineDigestNumber(raw)
  if (value == null)
    return null
  return Math.max(0, Math.min(1, value))
}

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

function readDigitalLifeGoalSummary(goal: unknown) {
  if (!goal || typeof goal !== 'object')
    return ''

  const candidate = goal as {
    summary?: unknown
    title?: unknown
    label?: unknown
    reason?: unknown
  }

  return sanitizeDigitalLifeSpineDigestText(
    candidate.summary ?? candidate.title ?? candidate.label ?? candidate.reason,
    160,
  )
}

function readLegacyDigitalLifeContinuitySignalField(
  continuitySignal: AlicizationDigitalLifeSpineSnapshot['continuitySignal'],
  field: 'watchMode' | 'sceneScenario' | 'activeThreadId' | 'dominantMode' | 'dominantDrive' | 'answerIntent' | 'preferredPresence',
) {
  if (!continuitySignal || typeof continuitySignal !== 'object')
    return null

  const metadata = 'metadata' in continuitySignal && continuitySignal.metadata && typeof continuitySignal.metadata === 'object'
    ? continuitySignal.metadata as Record<string, unknown>
    : null
  const legacy = continuitySignal as unknown as Record<string, unknown>

  return sanitizeDigitalLifeSpineDigestText(metadata?.[field] ?? legacy[field] ?? '', field === 'activeThreadId' ? 96 : 64) || null
}

function joinNarrativeLine(items: string[] | null | undefined, maxItems = 4, maxChars = 220) {
  if (!Array.isArray(items))
    return null
  const text = items
    .map(item => sanitizeDigitalLifeSpineDigestText(item, 96))
    .filter(Boolean)
    .slice(0, maxItems)
    .join(', ')
  return text ? sanitizeDigitalLifeSpineDigestText(text, maxChars) : null
}

function extractPersonaBiasSummary(surface: Partial<AlicizationDigitalLifeRuntimeSurface>) {
  const projection = surface.memory?.personStateProjection ?? null
  const rawPersonality = (
    surface.memory?.derivedMindStateBundle as { personalityState?: unknown } | null | undefined
  )?.personalityState ?? null
  const personality = rawPersonality && typeof rawPersonality === 'object'
    ? rawPersonality as {
      identityKernel?: { relationshipPosture?: unknown, initiativeStyle?: unknown } | null
      initiativeBaseline?: { silenceReconnect?: unknown, comfortStyle?: unknown } | null
    }
    : null

  const relationshipPosture = sanitizeDigitalLifeSpineDigestText(personality?.identityKernel?.relationshipPosture, 48) || null
  const initiativeStyle = sanitizeDigitalLifeSpineDigestText(personality?.identityKernel?.initiativeStyle, 48) || null
  const silenceReconnect = sanitizeDigitalLifeSpineDigestText(personality?.initiativeBaseline?.silenceReconnect, 48) || null
  const comfortStyle = sanitizeDigitalLifeSpineDigestText(personality?.initiativeBaseline?.comfortStyle, 48) || null
  const preferredProactiveStyle = sanitizeDigitalLifeSpineDigestText(projection?.preferredProactiveStyle ?? '', 48) || null
  const manifestationCadenceSummary = buildPersonaManifestationCadenceSummary({
    initiativeStyle,
    silenceReconnect,
    relationshipPosture,
    comfortStyle,
    preferredProactiveStyle,
  })
  const rawOpeningGuidance = sanitizeDigitalLifeSpineDigestText(projection?.openingGuidance ?? '', 220) || null
  const rawWhySummary = sanitizeDigitalLifeSpineDigestText(
    surface.agency?.autonomy?.whyNow
    ?? surface.agency?.initiative?.why
    ?? '',
    320,
  ) || null
  const currentConsciousProjectState = surface.dialogue?.currentConsciousFrame?.projectState ?? null
  const phaseLine = sanitizeDigitalLifeSpineDigestText(currentConsciousProjectState?.currentPhase ?? '', 80) || null
  const landedLine = sanitizeDigitalLifeSpineDigestText(
    currentConsciousProjectState?.latestLandedProgress
    ?? currentConsciousProjectState?.latestProgress
    ?? currentConsciousProjectState?.landedProgressSummary
    ?? '',
    140,
  ) || null
  const openLoopLine = sanitizeDigitalLifeSpineDigestText(
    currentConsciousProjectState?.primaryOpenLoop
    ?? currentConsciousProjectState?.openClosureSummary
    ?? '',
    180,
  ) || null
  const nextClosureLine = sanitizeDigitalLifeSpineDigestText(
    currentConsciousProjectState?.nextClosureTarget
    ?? currentConsciousProjectState?.nextClosureTargetSummary
    ?? '',
    180,
  ) || null
  const sameHerLine = sanitizeDigitalLifeSpineDigestText(currentConsciousProjectState?.sameHerSelfLine ?? '', 180) || null
  const combinedCarry = [
    rawOpeningGuidance,
    rawWhySummary,
    sameHerLine,
    openLoopLine,
    nextClosureLine,
  ].filter(Boolean).join(' | ').toLowerCase()
  const carriesPhase1SameHerClosure
    = /phase 1|local digital life/u.test([
      phaseLine,
      sameHerLine,
      openLoopLine,
      nextClosureLine,
    ].filter(Boolean).join(' | ').toLowerCase())
    && /same living line|same-her|same her|continuous her|one continuous her/u.test(combinedCarry)
    && /memory|initiative|embodiment|voice|face|motion|lipsync/u.test(combinedCarry)
  const projectClosureCarrySuffix = carriesPhase1SameHerClosure
    ? sanitizeDigitalLifeSpineDigestText([
      phaseLine ? `phase=${phaseLine}` : 'phase=Phase 1: Local Digital Life',
      landedLine ? `landed=${landedLine}` : '',
      openLoopLine ? `open=${openLoopLine}` : '',
      nextClosureLine ? `next=${nextClosureLine}` : '',
    ].filter(Boolean).join(' | '), 420) || null
    : null
  const openingGuidance = projectClosureCarrySuffix
    ? sanitizeDigitalLifeSpineDigestText([
      rawOpeningGuidance,
      `Keep project identity, current Phase 1 progress, and the still-open same-her life-loop closure explicit while this turn forms.`,
    ].filter(Boolean).join(' '), 220) || rawOpeningGuidance
    : rawOpeningGuidance
  const combinedProjectClosureWhySummary = projectClosureCarrySuffix
    ? [rawWhySummary, projectClosureCarrySuffix].filter(Boolean).join(' | ')
    : null
  const whySummary = projectClosureCarrySuffix
    ? sanitizeDigitalLifeSpineDigestText(
      combinedProjectClosureWhySummary
      && combinedProjectClosureWhySummary.length <= 420
        ? combinedProjectClosureWhySummary
        : projectClosureCarrySuffix,
      420,
    ) || rawWhySummary
    : rawWhySummary

  if (!relationshipPosture && !initiativeStyle && !silenceReconnect && !comfortStyle && !preferredProactiveStyle && !manifestationCadenceSummary && !openingGuidance && !whySummary)
    return null

  return {
    relationshipPosture,
    initiativeStyle,
    silenceReconnect,
    comfortStyle,
    preferredProactiveStyle,
    manifestationCadenceSummary,
    openingGuidance,
    whySummary,
  }
}

function buildPersonaManifestationCadenceSummary(input: {
  initiativeStyle: string | null
  silenceReconnect: string | null
  relationshipPosture: string | null
  comfortStyle: string | null
  preferredProactiveStyle: string | null
}) {
  const observeFirst = input.initiativeStyle === 'observant'
    || input.silenceReconnect === 'hold'
    || input.preferredProactiveStyle === 'silent-observe'
  if (observeFirst) {
    return 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.'
  }

  const directReconnect = input.initiativeStyle === 'high-participation'
    || input.silenceReconnect === 'direct-approach'
  if (directReconnect) {
    return 'persona leans toward direct reconnect once the opening is real, so the return cadence can loosen earlier.'
  }

  const guardianCare = input.relationshipPosture === 'guardian'
    || input.comfortStyle === 'take-charge'
  if (guardianCare) {
    return 'persona keeps a care-first cadence, so she can surface sooner when the host needs a steadier kind of presence.'
  }

  return null
}

function extractProjectContinuitySummary(surface: Partial<AlicizationDigitalLifeRuntimeSurface>) {
  const personStateProjectionSummary = sanitizeDigitalLifeSpineDigestText(
    surface.memory?.personStateProjection?.summary,
    220,
  )
  if (!personStateProjectionSummary.includes('project_continuity='))
    return null

  return personStateProjectionSummary
    .split('|')
    .map(part => sanitizeDigitalLifeSpineDigestText(part, 220))
    .find(part => part.startsWith('project_continuity=')) ?? null
}

function extractProjectStateCarrySummary(surface: Partial<AlicizationDigitalLifeRuntimeSurface>) {
  const selfContinuityAuthority = surface.memory?.personStateProjection?.selfContinuityAuthority ?? null
  const sourceTags = Array.isArray(selfContinuityAuthority?.sourceTags)
    ? selfContinuityAuthority.sourceTags
    : []
  if (!sourceTags.includes('project-state-carry'))
    return null

  const inwardLine = sanitizeDigitalLifeSpineDigestText(selfContinuityAuthority?.inwardLine ?? '', 220)
  if (!inwardLine)
    return null

  return inwardLine
}

function resolveRuntimeContinuityCue(input: {
  projectContinuitySummary?: string | null
  projectStateCarrySummary?: string | null
}) {
  const projectContinuitySummary = sanitizeDigitalLifeSpineDigestText(input.projectContinuitySummary ?? '', 220)
  const projectStateCarrySummary = sanitizeDigitalLifeSpineDigestText(input.projectStateCarrySummary ?? '', 220)

  const callbackLikeContinuitySummary = /project_continuity=.*(?:callback|same-thread|same thread|same line|同一条线|沿着刚才那条线)/u
    .test(projectContinuitySummary)
  const callbackLikeCarrySummary = /callback|same-thread|same thread|same line|同一条线|沿着刚才那条线/u
    .test(projectStateCarrySummary)
  const explicitSameHerCarrySummary = /same phase 1 digital life|same living line|same digital life|same-her|same her|continuous her|one continuous her|同一个她/iu
    .test(projectStateCarrySummary)

  if (callbackLikeContinuitySummary && explicitSameHerCarrySummary && !callbackLikeCarrySummary)
    return projectContinuitySummary

  return projectStateCarrySummary || projectContinuitySummary || null
}

function normalizeSelfContinuitySourceTags(surface: Partial<AlicizationDigitalLifeRuntimeSurface>, sourceTags: unknown) {
  const normalizedTags = Array.isArray(sourceTags)
    ? sourceTags
        .map(tag => sanitizeDigitalLifeSpineDigestText(tag, 64))
        .filter(Boolean)
        .slice(0, 8)
    : []
  const sameHerProjectCarryLine = sanitizeDigitalLifeSpineDigestText([
    surface.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine ?? '',
    surface.memory?.personStateProjection?.summary ?? '',
    surface.memory?.autobiographicalSelf?.latestInflection ?? '',
    surface.memory?.autobiographicalSelf?.relationshipDoctrine ?? '',
    surface.memory?.longHorizonMemory?.rememberedConstraintSummary ?? '',
    surface.memory?.longHorizonMemory?.rememberedPreferenceSummary ?? '',
    surface.memory?.longHorizonMemory?.dominantCueSummary ?? '',
    surface.cognition?.privateThought?.thoughtText ?? '',
    surface.cognition?.privateThought?.emotionalTension ?? '',
    surface.dialogue?.currentConsciousFrame?.focusAnchor ?? '',
    sanitizeProjectSameHerCarryCandidate((surface.dialogue?.currentConsciousFrame as { projectState?: { sameHerSelfLine?: unknown, continuityCue?: unknown } | null } | null | undefined)?.projectState?.sameHerSelfLine ?? '', 220),
    sanitizeProjectSameHerCarryCandidate((surface.dialogue?.currentConsciousFrame as { projectState?: { sameHerSelfLine?: unknown, continuityCue?: unknown } | null } | null | undefined)?.projectState?.continuityCue ?? '', 220),
    surface.agency?.initiative?.why ?? '',
    surface.agency?.initiative?.continuityRestraint ?? '',
  ].filter(Boolean).join(' | '), 1200)
  const loweredProjectCarryLine = sameHerProjectCarryLine.toLowerCase()
  const carriesProjectStateCarry
    = /same phase 1 digital life|same living line|one continuous her|same-her|same her|continuous her/iu.test(loweredProjectCarryLine)
      && /unfinished|still needs|continuing|unfinished closure|keep the same|leave room|measured-return|lower-pressure/iu.test(loweredProjectCarryLine)
  const carriesExecutionCallbackProjectCarry
    = loweredProjectCarryLine.includes('continuity-execution-callback-project-carry')
      || loweredProjectCarryLine.includes('execution-callback project-carry')
      || loweredProjectCarryLine.includes('callback project-carry')
      || (
        (
          loweredProjectCarryLine.includes('execution-callback afterglow')
          || loweredProjectCarryLine.includes('callback afterglow')
          || loweredProjectCarryLine.includes('same callback line')
          || loweredProjectCarryLine.includes('callback return')
        )
        && (
          loweredProjectCarryLine.includes('same-thread-continuation')
          || loweredProjectCarryLine.includes('still continuing')
          || loweredProjectCarryLine.includes('measured-return')
          || loweredProjectCarryLine.includes('lower-pressure')
          || loweredProjectCarryLine.includes('reopen eagerly')
        )
      )
  const rebuiltAuthority = surface.perception && surface.world && surface.memory && surface.cognition && surface.agency && surface.dialogue
    ? buildSelfContinuityAuthorityFromRuntimeSurface(surface as AlicizationDigitalLifeRuntimeSurface)
    : null
  const rebuiltTags = Array.isArray(rebuiltAuthority?.sourceTags)
    ? rebuiltAuthority.sourceTags.map(tag => sanitizeDigitalLifeSpineDigestText(tag, 64)).filter(Boolean)
    : []
  const fallbackTags = !rebuiltTags.length && sameHerProjectCarryLine
    ? [
        ...(carriesProjectStateCarry
          ? ['project-state-carry']
          : []),
        ...(carriesExecutionCallbackProjectCarry
          ? ['continuity-execution-callback-project-carry']
          : []),
      ]
    : []
  const promotedCarryTags = [
    ...(rebuiltTags.includes('project-state-carry') || fallbackTags.includes('project-state-carry')
      ? ['project-state-carry']
      : []),
    ...(rebuiltTags.includes('continuity-execution-callback-project-carry') || fallbackTags.includes('continuity-execution-callback-project-carry')
      ? ['continuity-execution-callback-project-carry']
      : []),
  ]

  return Array.from(new Set([
    ...promotedCarryTags,
    ...normalizedTags,
    ...rebuiltTags,
    ...fallbackTags,
  ])).slice(0, 8)
}

function resolveSpineHybridRuntimeSurface(
  spine: AlicizationDigitalLifeSpineSnapshot | null | undefined,
): Partial<AlicizationDigitalLifeRuntimeSurface> {
  if (!spine || typeof spine !== 'object')
    return {}

  if (spine.runtimeSurface && typeof spine.runtimeSurface === 'object')
    return spine.runtimeSurface as Partial<AlicizationDigitalLifeRuntimeSurface>

  return {
    memory: (spine as { memory?: AlicizationDigitalLifeRuntimeSurface['memory'] | undefined }).memory,
    cognition: (spine as { cognition?: AlicizationDigitalLifeRuntimeSurface['cognition'] | undefined }).cognition,
    dialogue: (spine as { dialogue?: AlicizationDigitalLifeRuntimeSurface['dialogue'] | undefined }).dialogue,
    agency: (spine as { agency?: AlicizationDigitalLifeRuntimeSurface['agency'] | undefined }).agency,
  }
}

export function projectAlicizationDigitalLifeSpineDigest(
  spine: AlicizationDigitalLifeSpineSnapshot | null | undefined,
): AlicizationDigitalLifeSpineDigest | null {
  if (!spine)
    return null

  const hybridSurface = resolveSpineHybridRuntimeSurface(spine)

  const digestLikeRuntime = spine.runtime ?? null
  const digestLikeProactive = spine.proactive ?? null
  const digestLikeContinuity = spine.continuitySignal ?? null
  if (!spine.runtimeSurface) {
    const continuityActiveThreadId = readLegacyDigitalLifeContinuitySignalField(
      digestLikeContinuity,
      'activeThreadId',
    )
    const continuityDominantMode = readLegacyDigitalLifeContinuitySignalField(
      digestLikeContinuity,
      'dominantMode',
    )
    const continuityDominantDrive = readLegacyDigitalLifeContinuitySignalField(
      digestLikeContinuity,
      'dominantDrive',
    )
    const continuityAnswerIntent = readLegacyDigitalLifeContinuitySignalField(
      digestLikeContinuity,
      'answerIntent',
    )
    const continuityPreferredPresence = readLegacyDigitalLifeContinuitySignalField(
      digestLikeContinuity,
      'preferredPresence',
    )
    const continuityWatchMode = readLegacyDigitalLifeContinuitySignalField(
      digestLikeContinuity,
      'watchMode',
    )
    const continuitySceneScenario = readLegacyDigitalLifeContinuitySignalField(
      digestLikeContinuity,
      'sceneScenario',
    )
    const legacyPersonStateProjection = spine.memory?.personStateProjection
      && typeof spine.memory.personStateProjection === 'object'
      ? spine.memory.personStateProjection
      : null
    const legacySelfContinuityAuthority = legacyPersonStateProjection?.selfContinuityAuthority
      && typeof legacyPersonStateProjection.selfContinuityAuthority === 'object'
      ? legacyPersonStateProjection.selfContinuityAuthority
      : null

    return {
      version: 'digital-life-spine-digest-v1',
      runtime: {
        watchMode: sanitizeDigitalLifeSpineDigestText(digestLikeRuntime?.watchMode ?? '', 48) || null,
        sceneScenario: sanitizeDigitalLifeSpineDigestText(digestLikeRuntime?.sceneScenario ?? '', 48) || null,
        sceneSummary: sanitizeDigitalLifeSpineDigestText(digestLikeRuntime?.sceneSummary ?? '', 160) || null,
        activeThreadId: sanitizeDigitalLifeSpineDigestText(
          digestLikeProactive?.activeThreadId ?? digestLikeRuntime?.activeThreadId ?? continuityActiveThreadId ?? '',
          96,
        ) || null,
        activeThreadTitle: sanitizeDigitalLifeSpineDigestText(
          digestLikeProactive?.activeThreadTitle ?? digestLikeRuntime?.activeThreadTitle ?? '',
          96,
        ) || null,
        dominantMode: sanitizeDigitalLifeSpineDigestText(
          digestLikeRuntime?.dominantMode ?? continuityDominantMode ?? '',
          48,
        ) || null,
        dominantDrive: sanitizeDigitalLifeSpineDigestText(
          digestLikeRuntime?.dominantDrive ?? continuityDominantDrive ?? '',
          48,
        ) || null,
        answerIntent: sanitizeDigitalLifeSpineDigestText(
          digestLikeRuntime?.answerIntent ?? continuityAnswerIntent ?? '',
          64,
        ) || null,
        preferredPresence: sanitizeDigitalLifeSpineDigestText(
          digestLikeProactive?.preferredPresence ?? digestLikeRuntime?.preferredPresence ?? continuityPreferredPresence ?? '',
          48,
        ) || null,
        selectedAction: sanitizeDigitalLifeSpineDigestText(
          digestLikeProactive?.selectedAction ?? digestLikeRuntime?.selectedAction ?? '',
          48,
        ) || null,
        continuityArcStage: sanitizeDigitalLifeSpineDigestText(
          digestLikeRuntime?.continuityArcStage ?? '',
          120,
        ) || null,
        continuityPreferredTiming: sanitizeDigitalLifeSpineDigestText(
          digestLikeRuntime?.continuityPreferredTiming ?? '',
          120,
        ) || null,
        continuityCue: sanitizeDigitalLifeSpineDigestText(
          digestLikeRuntime?.continuityCue ?? '',
          220,
        ) || null,
        updatedAt: Number.isFinite(digestLikeRuntime?.updatedAt) ? Number(digestLikeRuntime?.updatedAt) : 0,
      },
      architecture: spine.architecture
        ? {
            operatingMode: spine.architecture.operatingMode ?? null,
            dominantSystem: spine.architecture.dominantSystem ?? null,
            supportingSystems: Array.isArray(spine.architecture.supportingSystems)
              ? [...spine.architecture.supportingSystems]
              : [],
            governingFocus: sanitizeDigitalLifeSpineDigestText(spine.architecture.governingFocus ?? '', 160) || null,
            summary: sanitizeDigitalLifeSpineDigestText(spine.architecture.summary ?? '', 220) || null,
          }
        : null,
      continuitySignal: digestLikeContinuity
        ? ({
            label: sanitizeDigitalLifeSpineDigestText(
              ('label' in digestLikeContinuity ? digestLikeContinuity.label : '') ?? '',
              96,
            ) || 'digital-life-line',
            summary: sanitizeDigitalLifeSpineDigestText(digestLikeContinuity.summary ?? '', 220),
            signature: sanitizeDigitalLifeSpineDigestText(digestLikeContinuity.signature ?? '', 512),
            createdAt: Number.isFinite(digestLikeContinuity.createdAt) ? Number(digestLikeContinuity.createdAt) : 0,
            watchMode: continuityWatchMode,
            sceneScenario: continuitySceneScenario,
            activeThreadId: continuityActiveThreadId,
            dominantMode: continuityDominantMode,
            dominantDrive: continuityDominantDrive,
            answerIntent: continuityAnswerIntent,
            preferredPresence: continuityPreferredPresence,
          } as NonNullable<AlicizationDigitalLifeSpineDigest['continuitySignal']>)
        : null,
      proactive: digestLikeProactive
        ? {
            selectedAction: sanitizeDigitalLifeSpineDigestText(digestLikeProactive.selectedAction ?? '', 48) || null,
            preferredStyle: sanitizeDigitalLifeSpineDigestText(digestLikeProactive.preferredStyle ?? '', 48) || null,
            continuityRestraint: sanitizeDigitalLifeSpineDigestText(
              digestLikeProactive.continuityRestraint ?? '',
              64,
            ) || null,
            confidence: normalizeDigitalLifeSpineDigestUnit(digestLikeProactive.confidence),
            shouldSpeak: typeof digestLikeProactive.shouldSpeak === 'boolean'
              ? digestLikeProactive.shouldSpeak
              : null,
            activeThreadId: sanitizeDigitalLifeSpineDigestText(digestLikeProactive.activeThreadId ?? '', 96) || null,
            activeThreadTitle: sanitizeDigitalLifeSpineDigestText(digestLikeProactive.activeThreadTitle ?? '', 96) || null,
            leadingGoalId: sanitizeDigitalLifeSpineDigestText(digestLikeProactive.leadingGoalId ?? '', 96) || null,
            leadingGoalSummary: sanitizeDigitalLifeSpineDigestText(digestLikeProactive.leadingGoalSummary ?? '', 96) || null,
            dominantConcernKind: sanitizeDigitalLifeSpineDigestText(digestLikeProactive.dominantConcernKind ?? '', 64) || null,
            dominantConcernSummary: sanitizeDigitalLifeSpineDigestText(digestLikeProactive.dominantConcernSummary ?? '', 180) || null,
            preferredPresence: sanitizeDigitalLifeSpineDigestText(digestLikeProactive.preferredPresence ?? '', 48) || null,
          }
        : null,
      memory: spine.memory
        ? {
            ...spine.memory,
            summary: sanitizeDigitalLifeSpineDigestText(spine.memory.summary ?? '', 220) || null,
            recentEpisodeSummary: sanitizeDigitalLifeSpineDigestText(spine.memory.recentEpisodeSummary ?? '', 120) || null,
            recentEpisodeCount: Number.isFinite(spine.memory.recentEpisodeCount)
              ? Number(spine.memory.recentEpisodeCount)
              : 0,
            focusBeliefStatement: sanitizeDigitalLifeSpineDigestText(spine.memory.focusBeliefStatement ?? '', 220) || null,
            focusBeliefConfidence: normalizeDigitalLifeSpineDigestUnit(spine.memory.focusBeliefConfidence),
            leadingGoalSummary: sanitizeDigitalLifeSpineDigestText(spine.memory.leadingGoalSummary ?? '', 120) || null,
            dominantConcernSummary: sanitizeDigitalLifeSpineDigestText(spine.memory.dominantConcernSummary ?? '', 120) || null,
            reflectionSummary: sanitizeDigitalLifeSpineDigestText(spine.memory.reflectionSummary ?? '', 180) || null,
            reflectionPressure: normalizeDigitalLifeSpineDigestUnit(spine.memory.reflectionPressure),
            recallMode: sanitizeDigitalLifeSpineDigestText(spine.memory.recallMode ?? '', 48) || null,
            recallSeed: sanitizeDigitalLifeSpineDigestText(spine.memory.recallSeed ?? '', 220) || null,
            thoughtThreadSummary: sanitizeDigitalLifeSpineDigestText(spine.memory.thoughtThreadSummary ?? '', 220) || null,
            selfEvolution: spine.memory.selfEvolution && typeof spine.memory.selfEvolution === 'object'
              ? {
                  relationshipDoctrine: sanitizeDigitalLifeSpineDigestText(spine.memory.selfEvolution.relationshipDoctrine ?? '', 220) || null,
                  relationshipCadenceSummary: sanitizeDigitalLifeSpineDigestText(spine.memory.selfEvolution.relationshipCadenceSummary ?? '', 220) || null,
                  latestInflection: sanitizeDigitalLifeSpineDigestText(spine.memory.selfEvolution.latestInflection ?? '', 220) || null,
                  burdenLine: sanitizeDigitalLifeSpineDigestText(spine.memory.selfEvolution.burdenLine ?? '', 220) || null,
                  trustMeaning: sanitizeDigitalLifeSpineDigestText(spine.memory.selfEvolution.trustMeaning ?? '', 220) || null,
                  summary: sanitizeDigitalLifeSpineDigestText(spine.memory.selfEvolution.summary ?? '', 220) || null,
                }
              : null,
            personStateProjection: legacyPersonStateProjection
              ? {
                  ...spine.memory.personStateProjection,
                  summary: sanitizeDigitalLifeSpineDigestText(legacyPersonStateProjection.summary ?? '', 220) || null,
                  selfContinuityAuthority: legacySelfContinuityAuthority
                    ? {
                        sourceTags: normalizeSelfContinuitySourceTags(
                          hybridSurface,
                          legacySelfContinuityAuthority.sourceTags,
                        ),
                        selfLine: sanitizeDigitalLifeSpineDigestText(legacySelfContinuityAuthority.selfLine ?? '', 220) || null,
                        relationshipLine: sanitizeDigitalLifeSpineDigestText(legacySelfContinuityAuthority.relationshipLine ?? '', 220) || null,
                        motiveLine: sanitizeDigitalLifeSpineDigestText(legacySelfContinuityAuthority.motiveLine ?? '', 220) || null,
                        habitLine: sanitizeDigitalLifeSpineDigestText(legacySelfContinuityAuthority.habitLine ?? '', 220) || null,
                        inwardLine: sanitizeDigitalLifeSpineDigestText(legacySelfContinuityAuthority.inwardLine ?? '', 220) || null,
                        authoritySummary: sanitizeDigitalLifeSpineDigestText(legacySelfContinuityAuthority.authoritySummary ?? '', 220) || null,
                      }
                    : spine.memory.personStateProjection?.selfContinuityAuthority ?? null,
                  activeClosenessContext: sanitizeDigitalLifeSpineDigestText(legacyPersonStateProjection.activeClosenessContext ?? '', 64) || null,
                  activeClosenessRung: sanitizeDigitalLifeSpineDigestText(legacyPersonStateProjection.activeClosenessRung ?? '', 64) || null,
                  relationshipPosture: sanitizeDigitalLifeSpineDigestText(legacyPersonStateProjection.relationshipPosture ?? '', 64) || null,
                  openingGuidance: sanitizeDigitalLifeSpineDigestText(legacyPersonStateProjection.openingGuidance ?? '', 220) || null,
                  preferredProactiveStyle: sanitizeDigitalLifeSpineDigestText(legacyPersonStateProjection.preferredProactiveStyle ?? '', 64) || null,
                  manifestationCadenceSummary: sanitizeDigitalLifeSpineDigestText(legacyPersonStateProjection.manifestationCadenceSummary ?? '', 220) || null,
                }
              : spine.memory.personStateProjection ?? null,
          }
        : null,
    }
  }

  const surface = (spine.runtimeSurface as Partial<AlicizationDigitalLifeRuntimeSurface> | undefined) ?? {}
  const perception = surface.perception ?? null
  const world = surface.world ?? null
  const cognition = surface.cognition ?? null
  const memory = surface.memory ?? null
  const agency = surface.agency ?? null
  const dialogue = surface.dialogue ?? null
  const architecture = spine.architecture
  const continuitySignal = spine.continuitySignal
  const proactiveSelection = spine.proactiveSelection ?? null
  const activeThread = proactiveSelection?.activeThread ?? world?.worldModel?.activeThread ?? null
  const initiative = agency?.initiative ?? null
  const autonomy = agency?.autonomy ?? null
  const privateThought = cognition?.privateThought ?? null
  const selfContinuity = memory?.selfContinuity ?? null
  const autobiographicalSelf = memory?.autobiographicalSelf ?? null
  const personStateProjection = memory?.personStateProjection ?? null
  const selfContinuityAuthority = personStateProjection?.selfContinuityAuthority ?? null
  const motiveEngine = memory?.motiveEngine ?? null
  const relationshipModel = world?.relationshipModel ?? null
  const selfState = agency?.selfState ?? null
  const habitPolicy = agency?.habitPolicy ?? null
  const leadingGoal = proactiveSelection?.leadingGoal ?? null
  const dominantConcern = proactiveSelection?.dominantConcern ?? null
  const reflectionEntries = asArray(memory?.reflectionLedger?.entries)
  const latestReflectionCandidate = reflectionEntries.find(
    entry => entry.id === memory?.reflectionLedger?.latestEntryId,
  )
  const latestReflection = (
    latestReflectionCandidate && latestReflectionCandidate.outcome !== 'released'
      ? latestReflectionCandidate
      : reflectionEntries.find(entry => entry.outcome !== 'released')
  ) ?? reflectionEntries[0] ?? null
  const continuityDeliberation = deriveAlicizationContinuityDeliberationFromSpine(spine)
  const motiveLongTermGoals = asArray(motiveEngine?.longTermGoals)
  const motiveBackgroundAgendas = asArray(motiveEngine?.backgroundAgendas)
  const leadingMotiveGoal = motiveLongTermGoals[0] ?? null
  const leadingMotiveAgenda = motiveBackgroundAgendas[0] ?? null
  const initiativeShouldSpeak = typeof (initiative as { shouldSpeak?: unknown } | null)?.shouldSpeak === 'boolean'
    ? (initiative as { shouldSpeak: boolean }).shouldSpeak
    : null
  const preferredPresence = sanitizeDigitalLifeSpineDigestText(
    privateThought?.embodiedPresence ?? initiative?.preferredPresence ?? '',
    48,
  ) || null
  const projectContinuitySummary = extractProjectContinuitySummary(surface)
  const projectStateCarrySummary = extractProjectStateCarrySummary(surface)
  const runtimeContinuityCue = resolveRuntimeContinuityCue({
    projectContinuitySummary,
    projectStateCarrySummary,
  })
  const personaBias = extractPersonaBiasSummary(surface)
  const mindEcology = buildMindEcology({
    now: perception?.updatedAt ?? 0,
    watchMode: perception?.watchMode,
    worldModel: world?.worldModel,
    appraisal: cognition?.appraisal,
    subjectiveInference: cognition?.subjectiveInference,
    beliefRevision: cognition?.beliefRevision,
    relationshipModel,
    longHorizonMemory: memory?.longHorizonMemory,
    selfContinuity,
    autobiographicalSelf,
    motiveEngine: memory?.motiveEngine ?? null,
    selfState,
    selfGovernor: agency?.selfGovernor,
    habitPolicy: agency?.habitPolicy ?? null,
    mindDynamics: cognition?.mindDynamics,
    mindKernel: cognition?.mindKernel,
    commitmentLedger: memory?.commitmentLedger,
    inquiryPlanner: memory?.inquiryPlanner,
    reflectionLedger: memory?.reflectionLedger,
    desireMemory: memory?.desireMemory,
    privateThought,
    actionEcology: agency?.actionEcology,
    answerPlanner: dialogue?.answerPlanner,
    conversationState: dialogue?.conversationState,
  })

  return {
    version: 'digital-life-spine-digest-v1',
    runtime: {
      watchMode: sanitizeDigitalLifeSpineDigestText(perception?.watchMode, 48) || null,
      sceneScenario: sanitizeDigitalLifeSpineDigestText(perception?.currentScene?.scenario ?? '', 48) || null,
      sceneSummary: sanitizeDigitalLifeSpineDigestText(perception?.currentScene?.summary ?? '', 160) || null,
      activeThreadId: sanitizeDigitalLifeSpineDigestText(activeThread?.id ?? '', 96) || null,
      activeThreadTitle: sanitizeDigitalLifeSpineDigestText(activeThread?.title ?? activeThread?.kind ?? '', 96) || null,
      dominantMode: sanitizeDigitalLifeSpineDigestText(cognition?.mindKernel?.dominantMode ?? '', 48) || null,
      dominantDrive: sanitizeDigitalLifeSpineDigestText(cognition?.mindKernel?.dominantDrive ?? '', 48) || null,
      answerIntent: sanitizeDigitalLifeSpineDigestText(dialogue?.answerPlanner?.answerIntent ?? '', 64) || null,
      preferredPresence,
      selectedAction: sanitizeDigitalLifeSpineDigestText(autonomy?.visibleAction ?? initiative?.selectedAction ?? '', 48) || null,
      continuityArcStage: continuityDeliberation.arcStage !== 'none' ? continuityDeliberation.arcStage : null,
      continuityPreferredTiming: continuityDeliberation.preferredTiming !== 'internal-only'
        ? continuityDeliberation.preferredTiming
        : null,
      continuityCue: runtimeContinuityCue,
      updatedAt: normalizeDigitalLifeSpineDigestNumber(perception?.updatedAt),
    },
    architecture: architecture
      ? {
          operatingMode: architecture.operatingMode,
          dominantSystem: architecture.dominantSystem,
          supportingSystems: [...architecture.supportingSystems],
          governingFocus: sanitizeDigitalLifeSpineDigestText(architecture.governingFocus ?? '', 160) || null,
          summary: sanitizeDigitalLifeSpineDigestText(architecture.summary, 200) || null,
        }
      : null,
    continuitySignal: continuitySignal
      ? {
          label: 'digital-life-line',
          summary: sanitizeDigitalLifeSpineDigestText(continuitySignal.summary, 220),
          signature: sanitizeDigitalLifeSpineDigestText(continuitySignal.signature, 512),
          createdAt: continuitySignal.createdAt,
          watchMode: readLegacyDigitalLifeContinuitySignalField(continuitySignal, 'watchMode'),
          sceneScenario: readLegacyDigitalLifeContinuitySignalField(continuitySignal, 'sceneScenario'),
          activeThreadId: readLegacyDigitalLifeContinuitySignalField(continuitySignal, 'activeThreadId'),
          dominantMode: readLegacyDigitalLifeContinuitySignalField(continuitySignal, 'dominantMode'),
          dominantDrive: readLegacyDigitalLifeContinuitySignalField(continuitySignal, 'dominantDrive'),
          answerIntent: readLegacyDigitalLifeContinuitySignalField(continuitySignal, 'answerIntent'),
          preferredPresence: readLegacyDigitalLifeContinuitySignalField(continuitySignal, 'preferredPresence'),
        }
      : null,
    proactive: {
      selectedAction: sanitizeDigitalLifeSpineDigestText(autonomy?.visibleAction ?? initiative?.selectedAction ?? '', 48) || null,
      preferredStyle: sanitizeDigitalLifeSpineDigestText(
        initiative?.preferredStyle ?? privateThought?.suggestedStyle ?? '',
        48,
      ) || null,
      continuityRestraint: sanitizeDigitalLifeSpineDigestText(
        initiative?.continuityRestraint ?? '',
        64,
      ) || null,
      confidence: normalizeDigitalLifeSpineDigestUnit(
        autonomy?.confidence ?? initiative?.confidence ?? privateThought?.confidence,
      ),
      shouldSpeak: typeof autonomy?.shouldSpeak === 'boolean'
        ? autonomy.shouldSpeak
        : initiativeShouldSpeak != null
          ? initiativeShouldSpeak
          : typeof privateThought?.shouldSpeak === 'boolean'
            ? privateThought.shouldSpeak
            : null,
      activeThreadId: sanitizeDigitalLifeSpineDigestText(activeThread?.id ?? '', 96) || null,
      activeThreadTitle: sanitizeDigitalLifeSpineDigestText(activeThread?.title ?? activeThread?.kind ?? '', 96) || null,
      dominantConcernKind: sanitizeDigitalLifeSpineDigestText(dominantConcern?.kind ?? '', 48) || null,
      dominantConcernSummary: sanitizeDigitalLifeSpineDigestText(dominantConcern?.summary ?? '', 160) || null,
      leadingGoalId: sanitizeDigitalLifeSpineDigestText(leadingGoal?.id ?? '', 96) || null,
      leadingGoalSummary: readDigitalLifeGoalSummary(leadingGoal) || null,
      preferredPresence,
      personaBias,
    },
    autonomy: autonomy
      ? {
          selectedMode: sanitizeDigitalLifeSpineDigestText(autonomy.selectedMode, 48) || null,
          visibleAction: sanitizeDigitalLifeSpineDigestText(autonomy.visibleAction, 48) || null,
          shouldSurface: typeof autonomy.shouldSurface === 'boolean' ? autonomy.shouldSurface : null,
          shouldSpeak: typeof autonomy.shouldSpeak === 'boolean' ? autonomy.shouldSpeak : null,
          shouldAct: typeof autonomy.shouldAct === 'boolean' ? autonomy.shouldAct : null,
          speakReadiness: normalizeDigitalLifeSpineDigestUnit(autonomy.speakReadiness),
          actReadiness: normalizeDigitalLifeSpineDigestUnit(autonomy.actReadiness),
          inhibition: normalizeDigitalLifeSpineDigestUnit(autonomy.inhibition),
          confidence: normalizeDigitalLifeSpineDigestUnit(autonomy.confidence),
          executionIntentKind: sanitizeDigitalLifeSpineDigestText(autonomy.executionIntent?.kind ?? '', 64) || null,
          executionIntentSummary: sanitizeDigitalLifeSpineDigestText(autonomy.executionIntent?.summary ?? '', 220) || null,
          deferReason: sanitizeDigitalLifeSpineDigestText(autonomy.deferReason ?? '', 160) || null,
          whyNow: sanitizeDigitalLifeSpineDigestText(autonomy.whyNow, 220) || null,
          sourceGoalId: sanitizeDigitalLifeSpineDigestText(autonomy.sourceGoalId ?? '', 96) || null,
          sourceGoalSummary: sanitizeDigitalLifeSpineDigestText(autonomy.sourceGoalSummary ?? '', 160) || null,
          sourceAgendaKind: sanitizeDigitalLifeSpineDigestText(autonomy.sourceAgendaKind ?? '', 64) || null,
          sourceAgendaSummary: sanitizeDigitalLifeSpineDigestText(autonomy.sourceAgendaSummary ?? '', 180) || null,
          sourceThreadId: sanitizeDigitalLifeSpineDigestText(autonomy.sourceThreadId ?? '', 96) || null,
          sourceThreadSummary: sanitizeDigitalLifeSpineDigestText(autonomy.sourceThreadSummary ?? '', 180) || null,
        }
      : null,
    motive: motiveEngine
      ? {
          rulingDrive: sanitizeDigitalLifeSpineDigestText(motiveEngine.rulingDrive ?? '', 48) || null,
          returnPressure: normalizeDigitalLifeSpineDigestUnit(motiveEngine.returnPressure),
          companionshipDrive: normalizeDigitalLifeSpineDigestUnit(motiveEngine.drives.companionship),
          boundaryRespectDrive: normalizeDigitalLifeSpineDigestUnit(motiveEngine.drives.boundaryRespect),
          truthDisciplineDrive: normalizeDigitalLifeSpineDigestUnit(motiveEngine.drives.truthDiscipline),
          restProtectionDrive: normalizeDigitalLifeSpineDigestUnit(motiveEngine.drives.restProtection),
          selfDirectionDrive: normalizeDigitalLifeSpineDigestUnit(motiveEngine.drives.selfDirection),
          leadingGoalSummary: readDigitalLifeGoalSummary(leadingMotiveGoal) || null,
          leadingAgendaKind: sanitizeDigitalLifeSpineDigestText(leadingMotiveAgenda?.kind ?? '', 64) || null,
          leadingAgendaSummary: sanitizeDigitalLifeSpineDigestText(leadingMotiveAgenda?.summary ?? '', 180) || null,
          narrative: joinNarrativeLine(motiveEngine.narrative) ?? null,
        }
      : null,
    habit: habitPolicy
      ? {
          dominantMode: sanitizeDigitalLifeSpineDigestText(habitPolicy.dominantMode, 64) || null,
          requiresGroundingBeforeSurface: habitPolicy.requiresGroundingBeforeSurface,
          prefersQuietCompanionship: habitPolicy.prefersQuietCompanionship,
          blocksDirectSpeakWhenBusy: habitPolicy.blocksDirectSpeakWhenBusy,
          protectsRestWindow: habitPolicy.protectsRestWindow,
          returnViaRecheck: habitPolicy.returnViaRecheck,
          suggestedStyleCap: sanitizeDigitalLifeSpineDigestText(habitPolicy.suggestedStyleCap, 64) || null,
          suggestedPresenceCap: sanitizeDigitalLifeSpineDigestText(habitPolicy.suggestedPresenceCap, 64) || null,
          narrative: joinNarrativeLine(habitPolicy.narrative) ?? null,
        }
      : null,
    outcomeLearning: latestReflection || autobiographicalSelf?.latestInflection
      || memory?.selfEvolution
      ? {
          reflectionTargetScope: asArray(memory?.selfEvolution?.activeLearningFocuses)[0] ?? null,
          reflectionSummary: sanitizeDigitalLifeSpineDigestText(latestReflection?.summary ?? '', 180) || null,
          reflectionLesson: sanitizeDigitalLifeSpineDigestText(latestReflection?.revision ?? '', 220) || null,
          latestInflection: sanitizeDigitalLifeSpineDigestText(
            memory?.selfEvolution?.latestInflection
            ?? autobiographicalSelf?.latestInflection
            ?? '',
            180,
          ) || null,
          revisionPressure: normalizeDigitalLifeSpineDigestUnit(memory?.reflectionLedger?.revisionPressure),
          autobiographicalStability: normalizeDigitalLifeSpineDigestUnit(
            memory?.selfEvolution?.autobiographicalStability
            ?? autobiographicalSelf?.stability,
          ),
          learningReadiness: normalizeDigitalLifeSpineDigestUnit(memory?.selfEvolution?.learningReadiness),
          contradictionPressure: normalizeDigitalLifeSpineDigestUnit(memory?.selfEvolution?.contradictionPressure),
          dominantTrajectory: sanitizeDigitalLifeSpineDigestText(memory?.selfEvolution?.dominantTrajectory ?? '', 180) || null,
          activeLearningFocuses: asArray(memory?.selfEvolution?.activeLearningFocuses).slice(0, 4),
          evolutionMomentum: normalizeDigitalLifeSpineDigestUnit(memory?.selfEvolution?.evolutionMomentum),
          nextLearningAction: sanitizeDigitalLifeSpineDigestText(memory?.selfEvolution?.nextLearningAction ?? '', 48) || null,
          nextLearningReason: sanitizeDigitalLifeSpineDigestText(memory?.selfEvolution?.nextLearningReason ?? '', 180) || null,
          summary: sanitizeDigitalLifeSpineDigestText(
            memory?.selfEvolution?.summary
            || latestReflection?.revision
            || latestReflection?.summary
            || personStateProjection?.relationshipDoctrine
            || memory?.selfEvolution?.latestInflection
            || autobiographicalSelf?.latestInflection
            || '',
            220,
          ) || null,
        }
      : null,
    embodiment: {
      privateThought: privateThought
        ? {
            stance: sanitizeDigitalLifeSpineDigestText(privateThought.stance, 48) || null,
            confidence: normalizeDigitalLifeSpineDigestUnit(privateThought.confidence),
            shouldSpeak: typeof privateThought.shouldSpeak === 'boolean'
              ? privateThought.shouldSpeak
              : null,
            suggestedStyle: sanitizeDigitalLifeSpineDigestText(privateThought.suggestedStyle, 48) || null,
            embodiedPresence: sanitizeDigitalLifeSpineDigestText(privateThought.embodiedPresence, 48) || null,
            emotionalTension: sanitizeDigitalLifeSpineDigestText(privateThought.emotionalTension, 48) || null,
            relationshipVector: sanitizeDigitalLifeSpineDigestText(privateThought.relationshipVector ?? '', 48) || null,
            initiativeAction: sanitizeDigitalLifeSpineDigestText(privateThought.initiativeAction ?? '', 48) || null,
            governorDrive: sanitizeDigitalLifeSpineDigestText(privateThought.governorDrive ?? '', 48) || null,
          }
        : null,
      selfContinuity: selfContinuity
        ? {
            attachmentMode: sanitizeDigitalLifeSpineDigestText(selfContinuity.attachmentMode, 48) || null,
            initiativeTemperament: sanitizeDigitalLifeSpineDigestText(selfContinuity.initiativeTemperament, 48) || null,
            perceptionTrust: normalizeDigitalLifeSpineDigestUnit(selfContinuity.perceptionTrust),
            relationshipTrust: normalizeDigitalLifeSpineDigestUnit(selfContinuity.relationshipTrust),
            guardingTendency: normalizeDigitalLifeSpineDigestUnit(selfContinuity.guardingTendency),
            misreadBurden: normalizeDigitalLifeSpineDigestUnit(selfContinuity.misreadBurden),
            carryOverDesire: normalizeDigitalLifeSpineDigestUnit(selfContinuity.carryOverDesire),
          }
        : null,
      autobiographicalSelf: autobiographicalSelf
        ? {
            attachmentStyle: sanitizeDigitalLifeSpineDigestText(autobiographicalSelf.personaDrift?.attachmentStyle ?? '', 48) || null,
            expressionStyle: sanitizeDigitalLifeSpineDigestText(autobiographicalSelf.personaDrift?.expressionStyle ?? '', 48) || null,
            conflictStyle: sanitizeDigitalLifeSpineDigestText(autobiographicalSelf.personaDrift?.conflictStyle ?? '', 64) || null,
            agencyStyle: sanitizeDigitalLifeSpineDigestText(autobiographicalSelf.personaDrift?.agencyStyle ?? '', 48) || null,
            attachmentNeed: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift?.attachmentNeed),
            autonomyNeed: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift?.autonomyNeed),
            truthAnchor: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift?.truthAnchor),
            careBias: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift?.careBias),
            playBias: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift?.playBias),
            irritabilityThreshold: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift?.irritabilityThreshold),
            stubbornness: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.personaDrift?.stubbornness),
            companionship: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution?.companionship),
            truthfulGrounding: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution?.truthfulGrounding),
            gentleRepair: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution?.gentleRepair),
            quietObservation: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution?.quietObservation),
            proactiveCare: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution?.proactiveCare),
            playfulIntimacy: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution?.playfulIntimacy),
            autonomyRespect: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution?.autonomyRespect),
            unfinishedThreadReturn: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.preferenceEvolution?.unfinishedThreadReturn),
            stability: normalizeDigitalLifeSpineDigestUnit(autobiographicalSelf.stability),
            identityNarrative: sanitizeDigitalLifeSpineDigestText(autobiographicalSelf.identityNarrative, 220) || null,
            relationshipDoctrine: sanitizeDigitalLifeSpineDigestText(
              autobiographicalSelf.relationshipDoctrine
              || personStateProjection?.relationshipDoctrine
              || '',
              220,
            ) || null,
            latestInflection: sanitizeDigitalLifeSpineDigestText(autobiographicalSelf.latestInflection, 220) || null,
          }
        : null,
      relationship: relationshipModel
        ? {
            climate: sanitizeDigitalLifeSpineDigestText(relationshipModel.climate, 48) || null,
            approachVector: sanitizeDigitalLifeSpineDigestText(relationshipModel.approachVector, 48) || null,
            receptivity: normalizeDigitalLifeSpineDigestUnit(relationshipModel.receptivity),
            sharedAttentionTrust: normalizeDigitalLifeSpineDigestUnit(relationshipModel.sharedAttentionTrust),
            correctionSensitivity: normalizeDigitalLifeSpineDigestUnit(relationshipModel.correctionSensitivity),
            reciprocityExpectation: normalizeDigitalLifeSpineDigestUnit(relationshipModel.reciprocityExpectation),
          }
        : null,
      selfState: selfState
        ? {
            stance: sanitizeDigitalLifeSpineDigestText(selfState.stance, 48) || null,
            feltCloseness: normalizeDigitalLifeSpineDigestUnit(selfState.feltCloseness),
            protectiveness: normalizeDigitalLifeSpineDigestUnit(selfState.protectiveness),
            curiosity: normalizeDigitalLifeSpineDigestUnit(selfState.curiosity),
            patience: normalizeDigitalLifeSpineDigestUnit(selfState.patience),
            desireToSpeak: normalizeDigitalLifeSpineDigestUnit(selfState.desireToSpeak),
            fearOfInterrupting: normalizeDigitalLifeSpineDigestUnit(selfState.fearOfInterrupting),
            moodLabel: sanitizeDigitalLifeSpineDigestText(selfState.moodLabel ?? '', 48) || null,
          }
        : null,
      mindEcology: {
        moodLabel: sanitizeDigitalLifeSpineDigestText(mindEcology.moodLabel, 48) || null,
        replyHabit: sanitizeDigitalLifeSpineDigestText(mindEcology.replyHabit, 48) || null,
        relationshipHabit: sanitizeDigitalLifeSpineDigestText(mindEcology.relationshipHabit, 48) || null,
        explorationHabit: sanitizeDigitalLifeSpineDigestText(mindEcology.explorationHabit, 48) || null,
        regulationHabit: sanitizeDigitalLifeSpineDigestText(mindEcology.regulationHabit, 48) || null,
        selfNarrative: sanitizeDigitalLifeSpineDigestText(mindEcology.selfNarrative, 220) || null,
        relationNarrative: sanitizeDigitalLifeSpineDigestText(mindEcology.relationNarrative, 220) || null,
        currentPreoccupation: sanitizeDigitalLifeSpineDigestText(mindEcology.currentPreoccupation, 220) || null,
        temperament: {
          attachment: normalizeDigitalLifeSpineDigestUnit(mindEcology.temperament.attachment),
          curiosity: normalizeDigitalLifeSpineDigestUnit(mindEcology.temperament.curiosity),
          steadiness: normalizeDigitalLifeSpineDigestUnit(mindEcology.temperament.steadiness),
          directness: normalizeDigitalLifeSpineDigestUnit(mindEcology.temperament.directness),
          playfulness: normalizeDigitalLifeSpineDigestUnit(mindEcology.temperament.playfulness),
          irritability: normalizeDigitalLifeSpineDigestUnit(mindEcology.temperament.irritability),
          tenderness: normalizeDigitalLifeSpineDigestUnit(mindEcology.temperament.tenderness),
        },
        climate: {
          valence: normalizeDigitalLifeSpineDigestUnit(mindEcology.climate.valence),
          arousal: normalizeDigitalLifeSpineDigestUnit(mindEcology.climate.arousal),
          socialNeed: normalizeDigitalLifeSpineDigestUnit(mindEcology.climate.socialNeed),
          solitudeNeed: normalizeDigitalLifeSpineDigestUnit(mindEcology.climate.solitudeNeed),
          irritation: normalizeDigitalLifeSpineDigestUnit(mindEcology.climate.irritation),
          restlessness: normalizeDigitalLifeSpineDigestUnit(mindEcology.climate.restlessness),
          reflectivePull: normalizeDigitalLifeSpineDigestUnit(mindEcology.climate.reflectivePull),
        },
      },
      initiative: initiative
        ? {
            selectedAction: sanitizeDigitalLifeSpineDigestText(initiative.selectedAction, 48) || null,
            preferredStyle: sanitizeDigitalLifeSpineDigestText(initiative.preferredStyle ?? '', 48) || null,
            preferredPresence: sanitizeDigitalLifeSpineDigestText(initiative.preferredPresence ?? '', 48) || null,
            confidence: normalizeDigitalLifeSpineDigestUnit(initiative.confidence),
            shouldSpeak: typeof initiative.shouldSpeak === 'boolean'
              ? initiative.shouldSpeak
              : null,
            speakDrive: normalizeDigitalLifeSpineDigestUnit(initiative.speakDrive),
            silenceDrive: normalizeDigitalLifeSpineDigestUnit(initiative.silenceDrive),
            why: sanitizeDigitalLifeSpineDigestText(initiative.why, 220) || null,
            personaBias,
          }
        : null,
    },
    memory: (() => {
      const memoryDigest = buildAlicizationDigitalLifeMemoryDigest(surface as AlicizationDigitalLifeRuntimeSurface | null | undefined)
      if (!memoryDigest)
        return memoryDigest

      return {
        ...memoryDigest,
        personStateProjection: personStateProjection
          ? {
              ...memoryDigest.personStateProjection,
              summary: sanitizeDigitalLifeSpineDigestText(personStateProjection.summary ?? '', 220) || null,
              selfContinuityAuthority: selfContinuityAuthority
                ? {
                    sourceTags: normalizeSelfContinuitySourceTags(surface, selfContinuityAuthority.sourceTags),
                    selfLine: sanitizeDigitalLifeSpineDigestText(selfContinuityAuthority.selfLine ?? '', 220) || null,
                    relationshipLine: sanitizeDigitalLifeSpineDigestText(selfContinuityAuthority.relationshipLine ?? '', 220) || null,
                    motiveLine: sanitizeDigitalLifeSpineDigestText(selfContinuityAuthority.motiveLine ?? '', 220) || null,
                    habitLine: sanitizeDigitalLifeSpineDigestText(selfContinuityAuthority.habitLine ?? '', 220) || null,
                    inwardLine: sanitizeDigitalLifeSpineDigestText(selfContinuityAuthority.inwardLine ?? '', 220) || null,
                    authoritySummary: sanitizeDigitalLifeSpineDigestText(selfContinuityAuthority.authoritySummary ?? '', 220) || null,
                  }
                : memoryDigest.personStateProjection?.selfContinuityAuthority ?? null,
              activeClosenessContext: sanitizeDigitalLifeSpineDigestText(personStateProjection.activeClosenessContext ?? '', 64) || null,
              activeClosenessRung: sanitizeDigitalLifeSpineDigestText(personStateProjection.activeClosenessRung ?? '', 64) || null,
              relationshipPosture: sanitizeDigitalLifeSpineDigestText(personStateProjection.relationshipPosture ?? '', 64) || null,
              openingGuidance: sanitizeDigitalLifeSpineDigestText(personStateProjection.openingGuidance ?? '', 220) || null,
              preferredProactiveStyle: sanitizeDigitalLifeSpineDigestText(personStateProjection.preferredProactiveStyle ?? '', 64) || null,
              manifestationCadenceSummary: sanitizeDigitalLifeSpineDigestText(personStateProjection.manifestationCadenceSummary ?? '', 220) || null,
            }
          : memoryDigest.personStateProjection ?? null,
      }
    })(),
  }
}

// Treat the committed visual-presence snapshot as the single living spine so
// dialogue, proactive behavior, screen grounding, and agent sessions all read
// the same derived architecture instead of rebuilding parallel interpretations.
export function deriveAlicizationDigitalLifeSpineFromSurface(
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface,
): AlicizationDigitalLifeSpineSnapshot {
  const architecture = buildAlicizationDigitalLifeArchitecture(runtimeSurface)

  return {
    version: 'digital-life-spine-v1',
    runtimeSurface,
    architecture,
    continuitySignal: buildAlicizationDigitalLifeContinuitySignal(runtimeSurface),
    proactiveSelection: buildAlicizationDigitalLifeProactiveSelection(runtimeSurface),
    proactivePolicy: {
      ...buildAlicizationDigitalLifeProactivePolicySnapshot(runtimeSurface),
      architecture,
    },
  }
}

export function deriveAlicizationDigitalLifeSpine(
  state: AlicizationVisualPresenceStateSnapshot,
): AlicizationDigitalLifeSpineSnapshot {
  return deriveAlicizationDigitalLifeSpineFromSurface(
    buildAlicizationDigitalLifeRuntimeSurface(state),
  )
}

export function commitAlicizationDigitalLifeSpine<TMindState extends AlicizationDigitalLifeMindStateCommitShape>(
  input: CommitAlicizationDigitalLifeMindStateInput<TMindState>,
): AlicizationCommittedDigitalLifeSpine {
  const previousState = input.previousState
  const nextState = commitAlicizationDigitalLifeMindState(input)

  return {
    version: 'digital-life-spine-commit-v1',
    previousState,
    nextState,
    previous: deriveAlicizationDigitalLifeSpine(previousState),
    current: deriveAlicizationDigitalLifeSpine(nextState),
  }
}
