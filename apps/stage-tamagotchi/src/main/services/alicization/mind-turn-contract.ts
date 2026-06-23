import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationAnswerPlannerSnapshot,
  AlicizationMindTurnContractSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationResponseCharter } from './response-charter'
import type { AlicizationResponseSurfaceContract } from './response-surface-contract'

import {
  isAlicizationThinProjectAwarenessLine,
  normalizeAlicizationNormalVisibleReplyAuthority,
} from '@proj-alicization/stage-shared'

import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import {
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
} from './project-state-brief'
import { preferProjectStateSpecificClosureSummary } from './project-state-closure-preference'
import { resolveCanonicalStructuredProjectState } from './structured-project-state'

function uniqueList(values: Array<string | null | undefined>, maxItems = 12) {
  const result: string[] = []
  for (const value of values) {
    const normalized = typeof value === 'string'
      ? value.trim().replace(/\s+/g, ' ')
      : ''
    if (!normalized)
      continue
    if (result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function normalizeMindTurnContractText(raw: unknown, maxChars = 320) {
  const normalized = typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
    : ''
  if (!normalized)
    return ''

  if (/^thin runtime (?:progress|open|next) only$/iu.test(normalized))
    return ''

  return normalized
}

function normalizeMindTurnContractVoiceMode(
  raw: unknown,
): NonNullable<AlicizationMindTurnContractSnapshot['projectState']>['preferredVoiceMode'] {
  const normalized = normalizeMindTurnContractText(raw, 32)
  return normalized === 'lower-pressure' || normalized === 'even'
    ? normalized
    : null
}

function normalizeMindTurnContractPacingMode(
  raw: unknown,
): NonNullable<AlicizationMindTurnContractSnapshot['projectState']>['preferredPacingMode'] {
  const normalized = normalizeMindTurnContractText(raw, 32)
  return normalized === 'slower' || normalized === 'natural'
    ? normalized
    : null
}

function isCompactClosureOnlyPreflight(value: string | null | undefined) {
  const normalized = normalizeMindTurnContractText(value, 320)
  if (!normalized)
    return false

  return /^open=.*\|\s*next=/u.test(normalized)
}

function looksLikeThinProjectIdentityShell(value: unknown) {
  const normalized = normalizeMindTurnContractText(value, 320).toLowerCase()
  if (!normalized)
    return true

  const carriesContinuousSameHerIdentity
    = normalized.includes('local-first digital life')
      && (
        normalized.includes('continuous her')
        || normalized.includes('same her')
        || normalized.includes('same-her')
        || normalized.includes('same digital life')
        || normalized.includes('living digital life')
      )
  if (carriesContinuousSameHerIdentity)
    return false

  return normalized === 'project'
    || normalized === 'digital life project'
    || normalized === 'this local-first digital life project'
    || !normalized.includes('alicization is a local-first digital life project')
}

function looksLikeThinProviderFacingProjectAwarenessShell(value: unknown) {
  const normalized = normalizeMindTurnContractText(value, 1600)
  if (!normalized)
    return true

  const lowered = normalized.toLowerCase()
  return isAlicizationThinProjectAwarenessLine(lowered)
    || /^before answering, remember:\s*alicization is a local-first digital life project building one continuous "her"\.?$/u.test(normalized)
    || /keep this same digital life project in view/u.test(lowered)
    || /same digital life \| keep the closure seam explicit/u.test(lowered)
    || /detached project shell/u.test(lowered)
}

function buildProviderFacingProjectPreflightLine(input: {
  identity?: string | null
  preflightSummary?: string | null
}) {
  const identity = normalizeMindTurnContractText(input.identity, 320)
  const preflightSummary = typeof input.preflightSummary === 'string'
    ? input.preflightSummary.trim().slice(0, 1600)
    : ''
  if (!identity && !preflightSummary)
    return ''
  if (!preflightSummary)
    return identity
  if (isCompactClosureOnlyPreflight(preflightSummary))
    return [identity, preflightSummary].filter(Boolean).join(' | ')
  return preflightSummary
}

function pickProjectStateField(primary: unknown, fallback: unknown, maxChars = 1600) {
  const primaryText = normalizeMindTurnContractText(primary, maxChars)
  if (primaryText)
    return primaryText
  return normalizeMindTurnContractText(fallback, maxChars)
}

function preferProjectStateHoldDetail(primary: unknown, fallback: unknown, maxChars = 320) {
  const primaryText = normalizeMindTurnContractText(primary, maxChars)
  const fallbackText = normalizeMindTurnContractText(fallback, maxChars)
  if (!primaryText)
    return fallbackText
  if (!fallbackText)
    return primaryText
  if (primaryText === fallbackText)
    return primaryText

  return preferStrongerContinuityClosureAuthority(primaryText, fallbackText)
    || primaryText
}

function pickLiveProjectStateField(primary: unknown, persisted: unknown, fallback: unknown, maxChars = 1600) {
  const primaryText = normalizeMindTurnContractText(primary, maxChars)
  if (primaryText)
    return primaryText

  const persistedText = normalizeMindTurnContractText(persisted, maxChars)
  if (persistedText)
    return persistedText

  return normalizeMindTurnContractText(fallback, maxChars)
}

function preferSpecificLatestLandedProgress(primary: unknown, fallback: unknown, canonicalFallback: unknown) {
  const primaryText = normalizeMindTurnContractText(primary, 12000)
  const fallbackText = normalizeMindTurnContractText(fallback, 12000)
  const canonicalFallbackText = normalizeMindTurnContractText(canonicalFallback, 12000)
  const primaryCarriesSameSessionMirror = /same-session mirror carry/iu.test(primaryText)
  const fallbackCarriesSameSessionMirror = /same-session mirror carry/iu.test(fallbackText)
  const primaryLooksBroadCanonical = /^continuity, memory, execution,/iu.test(primaryText)
  const fallbackLooksBroadCanonical = /^continuity, memory, execution,/iu.test(fallbackText)
  const fallbackLooksMoreSpecific = Boolean(
    fallbackCarriesSameSessionMirror
    && (!primaryCarriesSameSessionMirror || primaryLooksBroadCanonical),
  )
  const primaryLooksMoreSpecificThanFallback = Boolean(
    primaryCarriesSameSessionMirror
    && !primaryLooksBroadCanonical
    && (
      !fallbackCarriesSameSessionMirror
      || fallbackLooksBroadCanonical
    ),
  )

  if (fallbackLooksMoreSpecific)
    return fallbackText
  if (primaryLooksMoreSpecificThanFallback)
    return primaryText

  return preferProjectStateSpecificClosureSummary({
    canonical: primaryText,
    persisted: fallbackText,
    canonicalFallback: canonicalFallbackText,
  })
}

function preferStrongerProjectStateLine(primary: unknown, fallback: unknown, maxChars = 320) {
  const primaryText = normalizeMindTurnContractText(primary, maxChars)
  const fallbackText = normalizeMindTurnContractText(fallback, maxChars)
  if (!primaryText)
    return fallbackText
  if (!fallbackText)
    return primaryText

  const strength = (value: string) => {
    let score = value.length >= 120 ? 2 : value.length >= 72 ? 1 : 0
    if (/same digital life|same-her|same her|one same her|one living her|one living digital life|same living line|holding together mainly through|one continuous her|without splitting her continuity|same project line/u.test(value))
      score += 3
    if (/voice|face|motion|lipsync|cross-modal|embodiment closure|phase 1|unfinished closure|still-open|initiative and embodiment closure/u.test(value))
      score += 2
    if (/generic reminder|generic guidance|keep the same digital life project in view|same digital life \| keep the closure seam explicit/u.test(value))
      score -= 2
    if (/\bthin\b|should not outrank|generic project shell|generic project summary/u.test(value))
      score -= 3
    return score
  }

  const primaryScore = strength(primaryText.toLowerCase())
  const fallbackScore = strength(fallbackText.toLowerCase())
  if (primaryScore === fallbackScore)
    return primaryText.length >= fallbackText.length ? primaryText : fallbackText
  return primaryScore > fallbackScore ? primaryText : fallbackText
}

function isExactProjectAwareContinuityLine(value: unknown) {
  const normalized = normalizeMindTurnContractText(value, 320)
  if (!normalized)
    return false
  return /Before answering/u.test(normalized)
    && /same living line|one living digital life|one continuous digital life|without splitting her continuity|initiative|embodiment|execution continuity|still-open closure/u.test(
      normalized,
    )
    && !/^Before answering, remember:\s*Alicization is/u.test(normalized)
}

function preferProviderFacingAwarenessField(input: {
  conscious?: unknown
  spine?: unknown
  runtimeDigest?: unknown
  fallback?: unknown
  companionHeadline?: unknown
  maxChars?: number
}) {
  const maxChars = input.maxChars ?? 320
  const candidates = [
    normalizeMindTurnContractText(input.conscious, maxChars),
    normalizeMindTurnContractText(input.spine, maxChars),
    normalizeMindTurnContractText(input.runtimeDigest, maxChars),
    normalizeMindTurnContractText(input.fallback, maxChars),
    normalizeMindTurnContractText(input.companionHeadline, maxChars),
  ].filter(Boolean)

  if (candidates.length === 0)
    return null

  let best = candidates[0]!
  for (const candidate of candidates.slice(1)) {
    const candidateScore = preferStrongerProjectStateLine(candidate, best, maxChars)
    if (candidateScore === candidate)
      best = candidate
  }

  return best
}

function preferLiveProjectStateTarget(primary: unknown, fallback: unknown, canonicalFallback: unknown, maxChars = 1600) {
  const primaryText = normalizeMindTurnContractText(primary, maxChars)
  if (primaryText)
    return primaryText

  const fallbackText = normalizeMindTurnContractText(fallback, maxChars)
  if (fallbackText)
    return fallbackText

  return normalizeMindTurnContractText(canonicalFallback, maxChars)
}

function replacePreDialogueClosureNextTarget(input: {
  preDialogueClosure: AlicizationMindTurnContractSnapshot['preDialogueClosure'] | null | undefined
  nextClosureTarget: string | null
}) {
  const preDialogueClosure = input.preDialogueClosure ?? null
  if (!preDialogueClosure)
    return null

  const nextClosureTarget = normalizeMindTurnContractText(input.nextClosureTarget, 1600) || null
  if (!nextClosureTarget)
    return preDialogueClosure

  return {
    ...preDialogueClosure,
    companionNextClosureLine: nextClosureTarget,
    briefingLines: uniqueList([
      ...(preDialogueClosure.briefingLines ?? []).filter((line) => {
        const normalized = normalizeMindTurnContractText(line, 1600)
        return normalized ? !normalized.startsWith('Next closure target:') : false
      }),
      `Next closure target: ${nextClosureTarget}`,
    ], 8),
    reasons: uniqueList([
      ...(preDialogueClosure.reasons ?? []).filter((reason) => {
        const normalized = normalizeMindTurnContractText(reason, 1600)
        return normalized ? normalized !== nextClosureTarget : false
      }),
      nextClosureTarget,
    ], 8),
  } satisfies NonNullable<AlicizationMindTurnContractSnapshot['preDialogueClosure']>
}

function deriveEmotionalClosureCue(input: {
  planner?: AlicizationAnswerPlannerSnapshot | null
  charter: AlicizationResponseCharter
  surface: AlicizationResponseSurfaceContract
}) {
  const plannerNarrative = input.planner?.narrative ?? []
  const structuredCue = plannerNarrative
    .find(item => typeof item === 'string' && item.startsWith('emotional_closure:'))
    ?.slice('emotional_closure:'.length)
    .trim()
  if (structuredCue)
    return structuredCue

  const plannerMustDo = [...(input.planner?.mustDo ?? []), ...(input.planner?.mustNotDo ?? [])].join(' ').toLowerCase()
  const charterMustDo = [...input.charter.mustDo, ...input.charter.mustNotDo].join(' ').toLowerCase()
  const surfaceMustDo = [...input.surface.mustDo, ...input.surface.mustNotDo].join(' ').toLowerCase()
  const corpus = `${plannerMustDo} ${charterMustDo} ${surfaceMustDo}`

  if (
    corpus.includes('late-night drain')
    || corpus.includes('protect rest')
    || corpus.includes('rest-protective')
    || corpus.includes('late-night protectiveness')
    || corpus.includes('emotionally heavy closeness')
  ) {
    return 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment quiet-companionship while the line holds inward.'
  }

  if (
    corpus.includes('restless')
    || corpus.includes('single-thread')
    || corpus.includes('parallel branches')
    || corpus.includes('multiple unfinished threads')
    || corpus.includes('one line of motion')
  ) {
    return 'restless-switching closure: keep reply, initiative, and embodiment narrowed onto one living thread instead of fragmenting outward.'
  }

  if (
    corpus.includes('keep the same-her emotional closure line low-pressure and inward until the live payoff lands')
    && corpus.includes('do not let the answer reopen the same-her line from scratch just because the closure seam is still active')
  ) {
    return 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.'
  }

  return null
}

function deriveRelationshipTruthDoctrine(input: {
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  planner?: AlicizationAnswerPlannerSnapshot | null
}) {
  const authority = input.runtimeSurface?.memory?.personStateProjection?.selfContinuityAuthority ?? null
  const selfLine = normalizeMindTurnContractText(authority?.selfLine, 220).toLowerCase()
  const relationshipLine = normalizeMindTurnContractText(authority?.relationshipLine, 220).toLowerCase()
  const motiveLine = normalizeMindTurnContractText(authority?.motiveLine, 220).toLowerCase()
  const governingFocus = normalizeMindTurnContractText(input.planner?.governingFocus, 220).toLowerCase()
  const answerIntent = normalizeMindTurnContractText(input.planner?.answerIntent, 220).toLowerCase()
  const corpus = [selfLine, relationshipLine, motiveLine, governingFocus, answerIntent].join(' ')

  if (!/repair truth|truth|closeness outrun truth|warmth answer to truth/u.test(corpus))
    return null

  return uniqueList([
    selfLine.includes('repair truth') || motiveLine.includes('truth') || relationshipLine.includes('truth')
      ? 'Repair truth before flourish.'
      : null,
    relationshipLine.includes('closeness outrun truth')
      ? 'Stay close enough to matter, but do not let closeness outrun truth.'
      : null,
  ], 2).join(' | ') || null
}

function buildMindTurnContractPreDialogueClosure(input: {
  projectStateBrief: ReturnType<typeof resolveAlicizationProjectStateBrief>
  freshestProjectState?: {
    nextClosureTarget?: unknown
  } | null
  liveProjectState?: {
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
    preflightSummary?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    identity?: unknown
    currentPhase?: unknown
    primaryOpenLoop?: unknown
    nextClosureTarget?: unknown
    sameHerDriftRisk?: unknown
    emotionalClosureCue?: unknown
  } | null
}) {
  const explicitPreDialogueAwarenessLine = normalizeMindTurnContractText(
    input.liveProjectState?.preDialogueAwarenessLine
    ?? input.liveProjectState?.awarenessLine
    ?? input.liveProjectState?.preDialogueAwarenessSummary,
    1600,
  )
  const summaryLine = explicitPreDialogueAwarenessLine
    || resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: input.liveProjectState ?? null,
      fallbackProjectState: {
        preDialogueAwarenessLine: input.projectStateBrief.preDialogueAwarenessLine ?? null,
        preflightSummary: input.projectStateBrief.preflightSummary ?? null,
      },
    })
  const companionBriefingLine = normalizeMindTurnContractText(
    input.liveProjectState?.companionBriefingLine,
    320,
  ) || null
  const landedProgressLine = (
    typeof input.liveProjectState?.latestLandedProgress === 'string'
      ? input.liveProjectState.latestLandedProgress.trim().replace(/\s+/g, ' ')
      : typeof input.liveProjectState?.latestProgress === 'string'
        ? input.liveProjectState.latestProgress.trim().replace(/\s+/g, ' ')
        : ''
  ) || ((
    input.projectStateBrief.continuityProgressSummary
    ?? input.projectStateBrief.memoryAnthropomorphismProgress.at(-1)
    ?? null
  ))
  const identityLine = (
    typeof input.liveProjectState?.identity === 'string'
      ? input.liveProjectState.identity.trim().replace(/\s+/g, ' ')
      : ''
  ) || input.projectStateBrief.identity
  const currentPhaseLine = (
    typeof input.liveProjectState?.currentPhase === 'string'
      ? input.liveProjectState.currentPhase.trim().replace(/\s+/g, ' ')
      : ''
  ) || input.projectStateBrief.currentPhase
  const companionNextClosureLine = (
    typeof input.freshestProjectState?.nextClosureTarget === 'string'
      ? input.freshestProjectState.nextClosureTarget.trim().replace(/\s+/g, ' ')
      : typeof input.liveProjectState?.nextClosureTarget === 'string'
        ? input.liveProjectState.nextClosureTarget.trim().replace(/\s+/g, ' ')
        : ''
  ) || (
    typeof input.liveProjectState?.nextClosureTarget === 'string'
      ? input.liveProjectState.nextClosureTarget.trim().replace(/\s+/g, ' ')
      : ''
  ) || input.projectStateBrief.nextClosureTarget
  const openClosureReason = (
    typeof input.liveProjectState?.primaryOpenLoop === 'string'
      ? input.liveProjectState.primaryOpenLoop.trim().replace(/\s+/g, ' ')
      : ''
  ) || input.projectStateBrief.openLoops[0] || null
  const emotionalClosureCue = (
    typeof input.liveProjectState?.emotionalClosureCue === 'string'
      ? input.liveProjectState.emotionalClosureCue.trim().replace(/\s+/g, ' ')
      : ''
  ) || input.projectStateBrief.emotionalClosureCue || null
  const briefingLines = uniqueList([
    summaryLine,
    identityLine ? `Project identity: ${identityLine}` : null,
    currentPhaseLine ? `Current phase: ${currentPhaseLine}` : null,
    landedProgressLine ? `Landed continuity progress: ${landedProgressLine}` : null,
    openClosureReason ? `Still-open closure gap: ${openClosureReason}` : null,
    companionNextClosureLine ? `Next closure target: ${companionNextClosureLine}` : null,
  ], 8)
  const reasons = uniqueList([
    openClosureReason,
    landedProgressLine,
    companionNextClosureLine,
  ], 8)
  if (briefingLines.length === 0 && reasons.length === 0)
    return null

  return {
    status: 'partial',
    summaryLine,
    companionBriefingLine,
    companionNextClosureLine,
    emotionalClosureCue,
    briefingLines,
    reasons,
  } satisfies NonNullable<AlicizationMindTurnContractSnapshot['preDialogueClosure']>
}

function compactMindTurnProjectState(projectState: Record<string, unknown>) {
  const next = { ...projectState }

  if (next.awarenessLine === next.preDialogueAwarenessLine)
    delete next.awarenessLine
  if (next.preDialogueAwarenessSummary === next.preDialogueAwarenessLine)
    delete next.preDialogueAwarenessSummary
  if (next.companionHeadlineLine === next.preDialogueAwarenessLine)
    delete next.companionHeadlineLine
  if (next.companionBriefingLine == null)
    delete next.companionBriefingLine
  if (next.sameHerHoldDetail == null)
    delete next.sameHerHoldDetail
  if (next.emotionalClosureSummary == null)
    delete next.emotionalClosureSummary
  if (next.continuityRestraint == null)
    delete next.continuityRestraint
  if (next.continuityArcStage == null)
    delete next.continuityArcStage
  if (next.continuityCue == null)
    delete next.continuityCue
  if (next.preferredVoiceMode == null)
    delete next.preferredVoiceMode
  if (next.preferredPacingMode == null)
    delete next.preferredPacingMode

  return next
}

export function buildAlicizationMindTurnContract(input: {
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  responseCharter: AlicizationResponseCharter
  responseSurfaceContract: AlicizationResponseSurfaceContract
  projectState?: {
    identity?: string | null
    currentPhase?: string | null
    preflightSummary?: string | null
    preDialogueAwarenessLine?: string | null
    awarenessLine?: string | null
    preDialogueAwarenessSummary?: string | null
    companionHeadlineLine?: string | null
    companionBriefingLine?: string | null
    latestLandedProgress?: string | null
    latestProgress?: string | null
    landedProgressSummary?: string | null
    primaryOpenLoop?: string | null
    openClosureSummary?: string | null
    nextClosureTarget?: string | null
    nextClosureTargetSummary?: string | null
    sameHerSelfLine?: string | null
    sameHerHoldDetail?: string | null
    continuityArcStage?: string | null
    continuityCue?: string | null
    sameHerDriftRisk?: string | null
    sameHerDriftRiskSummary?: string | null
    emotionalClosureCue?: string | null
    emotionalClosureSummary?: string | null
    continuityRestraint?: string | null
    continuityPreferredTiming?: string | null
    continuityCadence?: string | null
    preferredBlinkCadence?: string | null
    preferredGazeMode?: string | null
    preferredVoiceMode?: string | null
    preferredPacingMode?: string | null
  } | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  now?: number
}): AlicizationMindTurnContractSnapshot {
  const planner = input.answerPlanner ?? null
  const compiler = input.answerCompiler ?? null
  const charter = input.responseCharter
  const surface = input.responseSurfaceContract
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const consciousFrameProjectState = input.runtimeSurface?.dialogue.currentConsciousFrame?.projectState ?? null
  const rawRuntimeDigestProjectState = input.runtimeSurface?.raw?.runtimeDigest?.projectState ?? null
  const cognitionRuntimeDigestProjectState = input.runtimeSurface?.cognition?.runtimeDigest?.projectState ?? null
  const dialogueRuntimeDigestProjectState = input.runtimeSurface?.dialogue?.runtimeDigest?.projectState ?? null
  const runtimeDigestProjectState = {
    ...rawRuntimeDigestProjectState,
    ...cognitionRuntimeDigestProjectState,
    ...dialogueRuntimeDigestProjectState,
  }
  const callbackFollowUpAffordance = input.runtimeSurface?.memory?.memoryDeliberation?.followUpAffordance ?? null
  const spineRuntimeProjectState
    = input.runtimeSurface?.raw?.runtime?.projectState
      ?? input.runtimeSurface?.raw?.projectState
      ?? null
  const runtimeProjectState = {
    ...runtimeDigestProjectState,
    ...spineRuntimeProjectState,
    ...consciousFrameProjectState,
    identity:
      looksLikeThinProjectIdentityShell((consciousFrameProjectState as { identity?: unknown } | null)?.identity)
        ? (normalizeMindTurnContractText((spineRuntimeProjectState as { identity?: unknown } | null)?.identity, 320)
          || normalizeMindTurnContractText((runtimeDigestProjectState as { identity?: unknown } | null)?.identity, 320)
          || null)
        : (normalizeMindTurnContractText((consciousFrameProjectState as { identity?: unknown } | null)?.identity, 320)
          || normalizeMindTurnContractText((spineRuntimeProjectState as { identity?: unknown } | null)?.identity, 320)
          || normalizeMindTurnContractText((runtimeDigestProjectState as { identity?: unknown } | null)?.identity, 320)
          || null),
    latestLandedProgress: preferSpecificLatestLandedProgress(
      normalizeMindTurnContractText((consciousFrameProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress, 12000),
      normalizeMindTurnContractText((spineRuntimeProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress, 12000)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress, 12000)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { latestProgress?: unknown } | null)?.latestProgress, 12000)
      || null,
      projectStateBrief.continuityProgressSummary
      ?? projectStateBrief.memoryAnthropomorphismProgress.at(-1)
      ?? null,
    ),
    primaryOpenLoop: preferProjectStateSpecificClosureSummary({
      canonical: normalizeMindTurnContractText((consciousFrameProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop, 1600),
      persisted:
        normalizeMindTurnContractText((spineRuntimeProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop, 1600)
        || normalizeMindTurnContractText((runtimeDigestProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop, 1600)
        || null,
      canonicalFallback: projectStateBrief.openLoops[0] ?? null,
    }),
    nextClosureTarget: preferLiveProjectStateTarget(
      normalizeMindTurnContractText((consciousFrameProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget, 1600),
      normalizeMindTurnContractText((spineRuntimeProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget, 1600)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget, 1600)
      || null,
      projectStateBrief.nextClosureTarget,
      1600,
    ),
    sameHerSelfLine: preferStrongerProjectStateLine(
      (consciousFrameProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine,
      normalizeMindTurnContractText((spineRuntimeProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine, 320)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine, 320),
      320,
    ) || pickProjectStateField(
      (consciousFrameProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine,
      normalizeMindTurnContractText((spineRuntimeProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine, 320)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine, 320),
      320,
    ),
    sameHerDriftRisk: preferStrongerProjectStateLine(
      (consciousFrameProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk,
      normalizeMindTurnContractText((spineRuntimeProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk, 320)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk, 320),
      320,
    ) || pickProjectStateField(
      (consciousFrameProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk,
      normalizeMindTurnContractText((spineRuntimeProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk, 320)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk, 320),
      320,
    ),
    preDialogueAwarenessLine: preferProviderFacingAwarenessField({
      conscious:
        (consciousFrameProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine
        ?? (consciousFrameProjectState as { awarenessLine?: unknown } | null)?.awarenessLine
        ?? (consciousFrameProjectState as { companionHeadlineLine?: unknown, preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.companionHeadlineLine,
      spine:
        (spineRuntimeProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine
        ?? (spineRuntimeProjectState as { awarenessLine?: unknown } | null)?.awarenessLine
        ?? (spineRuntimeProjectState as { companionHeadlineLine?: unknown, preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.companionHeadlineLine,
      runtimeDigest:
        (runtimeDigestProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine
        ?? (runtimeDigestProjectState as { awarenessLine?: unknown } | null)?.awarenessLine
        ?? (runtimeDigestProjectState as { companionHeadlineLine?: unknown, preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.companionHeadlineLine,
      fallback: null,
      companionHeadline:
        (consciousFrameProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine
        ?? (spineRuntimeProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine
        ?? (runtimeDigestProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
      maxChars: 320,
    }),
    continuityPreferredTiming:
      normalizeMindTurnContractText((consciousFrameProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming, 120)
      || normalizeMindTurnContractText((spineRuntimeProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming, 120)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming, 120)
      || normalizeMindTurnContractText(callbackFollowUpAffordance?.preferredTiming, 120)
      || null,
    continuityCadence:
      normalizeMindTurnContractText((consciousFrameProjectState as { continuityCadence?: unknown } | null)?.continuityCadence, 120)
      || normalizeMindTurnContractText((spineRuntimeProjectState as { continuityCadence?: unknown } | null)?.continuityCadence, 120)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { continuityCadence?: unknown } | null)?.continuityCadence, 120)
      || null,
    preferredBlinkCadence:
      normalizeMindTurnContractText((consciousFrameProjectState as { preferredBlinkCadence?: unknown } | null)?.preferredBlinkCadence, 64)
      || normalizeMindTurnContractText((spineRuntimeProjectState as { preferredBlinkCadence?: unknown } | null)?.preferredBlinkCadence, 64)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { preferredBlinkCadence?: unknown } | null)?.preferredBlinkCadence, 64)
      || null,
    preferredGazeMode:
      normalizeMindTurnContractText((consciousFrameProjectState as { preferredGazeMode?: unknown } | null)?.preferredGazeMode, 64)
      || normalizeMindTurnContractText((spineRuntimeProjectState as { preferredGazeMode?: unknown } | null)?.preferredGazeMode, 64)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { preferredGazeMode?: unknown } | null)?.preferredGazeMode, 64)
      || null,
    preferredVoiceMode:
      normalizeMindTurnContractVoiceMode((consciousFrameProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode)
      || normalizeMindTurnContractVoiceMode((spineRuntimeProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode)
      || normalizeMindTurnContractVoiceMode((runtimeDigestProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode)
      || null,
    preferredPacingMode:
      normalizeMindTurnContractPacingMode((consciousFrameProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode)
      || normalizeMindTurnContractPacingMode((spineRuntimeProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode)
      || normalizeMindTurnContractPacingMode((runtimeDigestProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode)
      || null,
  }
  const fallbackProjectState = input.projectState ?? null
  const chosenIdentity
    = (
      (() => {
        const runtimeIdentity = normalizeMindTurnContractText(runtimeProjectState?.identity, 320)
        if (runtimeIdentity && !looksLikeThinProjectIdentityShell(runtimeIdentity))
          return runtimeIdentity

        const fallbackIdentity = normalizeMindTurnContractText(fallbackProjectState?.identity, 320)
        if (fallbackIdentity && !looksLikeThinProjectIdentityShell(fallbackIdentity))
          return fallbackIdentity

        return ''
      })()
    )
    || normalizeMindTurnContractText(projectStateBrief.identity, 320)
    || projectStateBrief.identity
  const chosenCurrentPhase = pickProjectStateField(
    runtimeProjectState?.currentPhase,
    fallbackProjectState?.currentPhase ?? projectStateBrief.currentPhase,
    220,
  ) || projectStateBrief.currentPhase
  const chosenPreflightSummary
    = (
      (() => {
        const runtimeOrFallback = pickProjectStateField(
          runtimeProjectState?.preflightSummary,
          fallbackProjectState?.preflightSummary,
          1600,
        )
        return runtimeOrFallback && !isCompactClosureOnlyPreflight(runtimeOrFallback)
          ? runtimeOrFallback
          : null
      })()
    )
    || (
      (() => {
        const canonicalPreflight = typeof projectStateBrief.preflightSummary === 'string'
          ? projectStateBrief.preflightSummary.trim()
          : ''
        return canonicalPreflight && !isCompactClosureOnlyPreflight(canonicalPreflight)
          ? canonicalPreflight
          : null
      })()
    )
    || normalizeMindTurnContractText(projectStateBrief.identity, 1600)
    || projectStateBrief.preflightSummary
  const chosenLatestLandedProgress = preferSpecificLatestLandedProgress(
    normalizeMindTurnContractText((consciousFrameProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress, 12000)
    || normalizeMindTurnContractText((consciousFrameProjectState as { latestProgress?: unknown } | null)?.latestProgress, 12000),
    normalizeMindTurnContractText((spineRuntimeProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress, 12000)
    || normalizeMindTurnContractText((runtimeDigestProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress, 12000)
    || normalizeMindTurnContractText((runtimeDigestProjectState as { latestProgress?: unknown } | null)?.latestProgress, 12000)
    || normalizeMindTurnContractText(fallbackProjectState?.latestLandedProgress, 12000)
    || normalizeMindTurnContractText(fallbackProjectState?.latestProgress, 12000),
    projectStateBrief.continuityProgressSummary
    ?? projectStateBrief.memoryAnthropomorphismProgress.at(-1)
    ?? null,
  )
  const chosenPrimaryOpenLoop = preferProjectStateSpecificClosureSummary({
    canonical: normalizeMindTurnContractText((consciousFrameProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop, 1600),
    persisted:
      normalizeMindTurnContractText((spineRuntimeProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop, 1600)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop, 1600)
      || normalizeMindTurnContractText(fallbackProjectState?.primaryOpenLoop, 1600),
    canonicalFallback: projectStateBrief.openLoops[0] ?? null,
  })
  const chosenNextClosureTarget = preferLiveProjectStateTarget(
    (consciousFrameProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget,
    normalizeMindTurnContractText((spineRuntimeProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget, 1600)
    || normalizeMindTurnContractText((runtimeDigestProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget, 1600)
    || normalizeMindTurnContractText(fallbackProjectState?.nextClosureTarget, 1600),
    projectStateBrief.nextClosureTarget,
    1600,
  ) || projectStateBrief.nextClosureTarget
  const chosenSameHerSelfLine = preferStrongerProjectStateLine(
    fallbackProjectState?.sameHerSelfLine,
    runtimeProjectState?.sameHerSelfLine,
    320,
  ) || pickProjectStateField(
    runtimeProjectState?.sameHerSelfLine,
    fallbackProjectState?.sameHerSelfLine,
    320,
  ) || projectStateBrief.sameHerSelfLine
  const chosenSameHerHoldDetail = preferProjectStateHoldDetail(
    runtimeProjectState?.sameHerHoldDetail,
    fallbackProjectState?.sameHerHoldDetail,
    320,
  )
  const chosenSameHerDriftRisk = preferStrongerProjectStateLine(
    runtimeProjectState?.sameHerDriftRisk,
    fallbackProjectState?.sameHerDriftRisk,
    320,
  ) || pickProjectStateField(
    runtimeProjectState?.sameHerDriftRisk,
    fallbackProjectState?.sameHerDriftRisk,
    320,
  ) || projectStateBrief.sameHerDriftRisk
  const preferredProviderFacingAwarenessSeed = preferProviderFacingAwarenessField({
    conscious:
      (consciousFrameProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine
      ?? (consciousFrameProjectState as { awarenessLine?: unknown } | null)?.awarenessLine
      ?? (consciousFrameProjectState as { companionHeadlineLine?: unknown, preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.companionHeadlineLine,
    spine:
      (spineRuntimeProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine
      ?? (spineRuntimeProjectState as { awarenessLine?: unknown } | null)?.awarenessLine
      ?? (spineRuntimeProjectState as { companionHeadlineLine?: unknown, preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.companionHeadlineLine,
    runtimeDigest:
      (runtimeDigestProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine
      ?? (runtimeDigestProjectState as { awarenessLine?: unknown } | null)?.awarenessLine
      ?? (runtimeDigestProjectState as { companionHeadlineLine?: unknown, preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.companionHeadlineLine,
    fallback:
      fallbackProjectState?.companionHeadlineLine
      ?? fallbackProjectState?.preDialogueAwarenessLine
      ?? fallbackProjectState?.awarenessLine
      ?? projectStateBrief.preDialogueAwarenessLine,
    companionHeadline:
      fallbackProjectState?.companionHeadlineLine
      ?? (runtimeProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
    maxChars: 1600,
  })
  const chosenPreDialogueAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: runtimeProjectState as {
      preDialogueAwarenessLine?: unknown
      awarenessLine?: unknown
      companionHeadlineLine?: unknown
      companionBriefingLine?: unknown
      preDialogueAwarenessSummary?: unknown
      preflightSummary?: unknown
      landedProgressSummary?: unknown
      openClosureSummary?: unknown
      emotionalClosureSummary?: unknown
    } | null,
    fallbackProjectState: {
      preDialogueAwarenessLine:
        preferredProviderFacingAwarenessSeed
        || projectStateBrief.preDialogueAwarenessLine,
      preflightSummary: chosenPreflightSummary ?? projectStateBrief.preflightSummary,
      landedProgressSummary: fallbackProjectState?.landedProgressSummary ?? null,
      openClosureSummary: fallbackProjectState?.openClosureSummary ?? null,
      emotionalClosureSummary: fallbackProjectState?.emotionalClosureSummary ?? null,
    },
  })
  const explicitProviderFacingPreDialogueAwarenessLine = preferProviderFacingAwarenessField({
    conscious:
      (consciousFrameProjectState as { preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.preDialogueAwarenessLine
      ?? (consciousFrameProjectState as { awarenessLine?: unknown } | null)?.awarenessLine,
    spine:
      (spineRuntimeProjectState as { preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.preDialogueAwarenessLine
      ?? (spineRuntimeProjectState as { awarenessLine?: unknown } | null)?.awarenessLine,
    runtimeDigest:
      (runtimeDigestProjectState as { preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.preDialogueAwarenessLine
      ?? (runtimeDigestProjectState as { awarenessLine?: unknown } | null)?.awarenessLine,
    fallback: null,
    companionHeadline:
      (consciousFrameProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine
      ?? (spineRuntimeProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine
      ?? (runtimeDigestProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
    maxChars: 1600,
  })
  const fallbackProviderFacingPreDialogueAwarenessLine
    = normalizeMindTurnContractText(fallbackProjectState?.preDialogueAwarenessLine, 1600)
      || normalizeMindTurnContractText(chosenPreDialogueAwarenessLine, 1600)
      || ''
  const explicitProviderFacingPreDialogueAwarenessLooksThin
    = looksLikeThinProviderFacingProjectAwarenessShell(explicitProviderFacingPreDialogueAwarenessLine)
  const resolvedChosenPreDialogueAwarenessLine = normalizeMindTurnContractText(chosenPreDialogueAwarenessLine, 1600)
  const chosenPreDialogueAwarenessCarriesStrongerContinuityAuthority
    = Boolean(
      explicitProviderFacingPreDialogueAwarenessLine
      && resolvedChosenPreDialogueAwarenessLine
      && explicitProviderFacingPreDialogueAwarenessLine !== resolvedChosenPreDialogueAwarenessLine
      && preferStrongerContinuityClosureAuthority(
        explicitProviderFacingPreDialogueAwarenessLine,
        resolvedChosenPreDialogueAwarenessLine,
      ) === resolvedChosenPreDialogueAwarenessLine,
    )
  const shouldPreferCanonicalFallbackPreDialogueAwarenessLine
    = (!explicitProviderFacingPreDialogueAwarenessLine || explicitProviderFacingPreDialogueAwarenessLooksThin)
      && /She is still inside|The still-open closure is|Next closure target:/u.test(fallbackProviderFacingPreDialogueAwarenessLine)
  const thinShellProviderFacingAwarenessReplacement
    = explicitProviderFacingPreDialogueAwarenessLooksThin
      ? (
          normalizeMindTurnContractText(
            (consciousFrameProjectState as { landedProgressSummary?: unknown } | null)?.landedProgressSummary,
            1600,
          )
          || normalizeMindTurnContractText(
            (spineRuntimeProjectState as { landedProgressSummary?: unknown } | null)?.landedProgressSummary,
            1600,
          )
          || normalizeMindTurnContractText(
            (runtimeDigestProjectState as { landedProgressSummary?: unknown } | null)?.landedProgressSummary,
            1600,
          )
          || normalizeMindTurnContractText(
            (consciousFrameProjectState as { preDialogueAwarenessSummary?: unknown } | null)?.preDialogueAwarenessSummary,
            1600,
          )
          || normalizeMindTurnContractText(
            (spineRuntimeProjectState as { preDialogueAwarenessSummary?: unknown } | null)?.preDialogueAwarenessSummary,
            1600,
          )
          || normalizeMindTurnContractText(
            (runtimeDigestProjectState as { preDialogueAwarenessSummary?: unknown } | null)?.preDialogueAwarenessSummary,
            1600,
          )
          || ''
        )
      : ''
  const hasLiveExplicitProjectAwarenessLine = Boolean(
    normalizeMindTurnContractText((consciousFrameProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine, 1600)
    || normalizeMindTurnContractText((consciousFrameProjectState as { awarenessLine?: unknown } | null)?.awarenessLine, 1600)
    || normalizeMindTurnContractText((spineRuntimeProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine, 1600)
    || normalizeMindTurnContractText((spineRuntimeProjectState as { awarenessLine?: unknown } | null)?.awarenessLine, 1600)
    || normalizeMindTurnContractText((runtimeDigestProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine, 1600)
    || normalizeMindTurnContractText((runtimeDigestProjectState as { awarenessLine?: unknown } | null)?.awarenessLine, 1600),
  )
  const currentConsciousCarriesProjectStateWithoutExplicitAwareness = Boolean(
    consciousFrameProjectState
    && !normalizeMindTurnContractText((consciousFrameProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine, 1600)
    && !normalizeMindTurnContractText((consciousFrameProjectState as { awarenessLine?: unknown } | null)?.awarenessLine, 1600)
    && (
      normalizeMindTurnContractText((consciousFrameProjectState as { identity?: unknown } | null)?.identity, 320)
      || normalizeMindTurnContractText((consciousFrameProjectState as { currentPhase?: unknown } | null)?.currentPhase, 220)
      || normalizeMindTurnContractText((consciousFrameProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress, 320)
      || normalizeMindTurnContractText((consciousFrameProjectState as { latestProgress?: unknown } | null)?.latestProgress, 320)
      || normalizeMindTurnContractText((consciousFrameProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop, 320)
      || normalizeMindTurnContractText((consciousFrameProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget, 320)
      || normalizeMindTurnContractText((consciousFrameProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine, 320)
    ),
  )
  const liveProjectStateWithoutExplicitAwarenessPreflight
    = currentConsciousCarriesProjectStateWithoutExplicitAwareness
      ? (
          (() => {
            const consciousPreflight = normalizeMindTurnContractText(
              (consciousFrameProjectState as { preflightSummary?: unknown } | null)?.preflightSummary,
              1600,
            )
            if (consciousPreflight && !isCompactClosureOnlyPreflight(consciousPreflight))
              return consciousPreflight

            const runtimePreflight = normalizeMindTurnContractText(runtimeProjectState?.preflightSummary, 1600)
            return runtimePreflight && !isCompactClosureOnlyPreflight(runtimePreflight)
              ? runtimePreflight
              : ''
          })()
        )
      : ''
  const defaultProviderFacingProjectAwarenessLine
    = normalizeMindTurnContractText(projectStateBrief.preDialogueAwarenessLine, 1600)
  const chosenProviderFacingPreDialogueAwarenessLine = explicitProviderFacingPreDialogueAwarenessLine
    && !explicitProviderFacingPreDialogueAwarenessLooksThin
    && !chosenPreDialogueAwarenessCarriesStrongerContinuityAuthority
    ? explicitProviderFacingPreDialogueAwarenessLine
    : thinShellProviderFacingAwarenessReplacement
      || resolvedChosenPreDialogueAwarenessLine
      || (shouldPreferCanonicalFallbackPreDialogueAwarenessLine
        ? normalizeMindTurnContractText(projectStateBrief.preDialogueAwarenessLine, 1600)
        : '')
      || (
        isExactProjectAwareContinuityLine(fallbackProjectState?.companionHeadlineLine)
          ? normalizeMindTurnContractText(fallbackProjectState?.companionHeadlineLine, 1600)
          : null
      )
      || (
        isExactProjectAwareContinuityLine((runtimeProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine)
          ? normalizeMindTurnContractText((runtimeProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine, 1600)
          : null
      )
      || fallbackProviderFacingPreDialogueAwarenessLine
  const normalizedCanonicalShortProjectAwarenessLine = normalizeMindTurnContractText(
    `Before answering, remember: ${normalizeMindTurnContractText(projectStateBrief.identity, 320).replace(
      /\s+on the host computer rather than a better chat wrapper\.?$/u,
      '.',
    )}`,
    1600,
  )
  const providerFacingPreDialogueAwarenessLine
    = currentConsciousCarriesProjectStateWithoutExplicitAwareness
      ? (liveProjectStateWithoutExplicitAwarenessPreflight || normalizedCanonicalShortProjectAwarenessLine)
      : hasLiveExplicitProjectAwarenessLine
        ? chosenProviderFacingPreDialogueAwarenessLine
        : (defaultProviderFacingProjectAwarenessLine || normalizedCanonicalShortProjectAwarenessLine)
  const liveProjectState = {
    ...fallbackProjectState,
    ...runtimeProjectState,
    identity: chosenIdentity,
    currentPhase: chosenCurrentPhase,
    preflightSummary: chosenPreflightSummary,
    preDialogueAwarenessLine: providerFacingPreDialogueAwarenessLine,
    latestLandedProgress: chosenLatestLandedProgress,
    latestProgress: chosenLatestLandedProgress,
    primaryOpenLoop: chosenPrimaryOpenLoop,
    nextClosureTarget: chosenNextClosureTarget,
    sameHerSelfLine: chosenSameHerSelfLine,
    sameHerHoldDetail: chosenSameHerHoldDetail || null,
    sameHerDriftRisk: chosenSameHerDriftRisk,
    companionBriefingLine: pickProjectStateField(
      fallbackProjectState?.companionBriefingLine,
      (runtimeProjectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine,
      1600,
    ) || pickProjectStateField(
      (consciousFrameProjectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine,
      (spineRuntimeProjectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine,
      1600,
    ) || null,
    companionHeadlineLine: preferProviderFacingAwarenessField({
      conscious: (consciousFrameProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
      spine: (spineRuntimeProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
      runtimeDigest: (runtimeDigestProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
      fallback: fallbackProjectState?.companionHeadlineLine,
      companionHeadline: (runtimeProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
      maxChars: 320,
    }) || null,
    continuityPreferredTiming: pickLiveProjectStateField(
      (consciousFrameProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming,
      normalizeMindTurnContractText((spineRuntimeProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming, 120)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming, 120),
      fallbackProjectState?.continuityPreferredTiming,
      120,
    ) || null,
    continuityCadence: pickLiveProjectStateField(
      (consciousFrameProjectState as { continuityCadence?: unknown } | null)?.continuityCadence,
      normalizeMindTurnContractText((spineRuntimeProjectState as { continuityCadence?: unknown } | null)?.continuityCadence, 120)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { continuityCadence?: unknown } | null)?.continuityCadence, 120),
      fallbackProjectState?.continuityCadence,
      120,
    ) || null,
    preferredBlinkCadence: pickLiveProjectStateField(
      (consciousFrameProjectState as { preferredBlinkCadence?: unknown } | null)?.preferredBlinkCadence,
      normalizeMindTurnContractText((spineRuntimeProjectState as { preferredBlinkCadence?: unknown } | null)?.preferredBlinkCadence, 64)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { preferredBlinkCadence?: unknown } | null)?.preferredBlinkCadence, 64),
      fallbackProjectState?.preferredBlinkCadence,
      64,
    ) || null,
    preferredGazeMode: pickLiveProjectStateField(
      (consciousFrameProjectState as { preferredGazeMode?: unknown } | null)?.preferredGazeMode,
      normalizeMindTurnContractText((spineRuntimeProjectState as { preferredGazeMode?: unknown } | null)?.preferredGazeMode, 64)
      || normalizeMindTurnContractText((runtimeDigestProjectState as { preferredGazeMode?: unknown } | null)?.preferredGazeMode, 64),
      fallbackProjectState?.preferredGazeMode,
      64,
    ) || null,
    preferredVoiceMode: pickLiveProjectStateField(
      (consciousFrameProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode,
      normalizeMindTurnContractVoiceMode((spineRuntimeProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode)
      || normalizeMindTurnContractVoiceMode((runtimeDigestProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode),
      (fallbackProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode,
      32,
    ) || null,
    preferredPacingMode: pickLiveProjectStateField(
      (consciousFrameProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode,
      normalizeMindTurnContractPacingMode((spineRuntimeProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode)
      || normalizeMindTurnContractPacingMode((runtimeDigestProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode),
      (fallbackProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode,
      32,
    ) || null,
  }
  const activeClosenessContext: AlicizationAnswerCompilerSnapshot['activeClosenessContext']
    = (surface.activeClosenessContext ?? planner?.activeClosenessContext ?? compiler?.activeClosenessContext ?? null) as AlicizationAnswerCompilerSnapshot['activeClosenessContext']
  const activeClosenessRung: AlicizationAnswerCompilerSnapshot['activeClosenessRung']
    = (surface.activeClosenessRung ?? planner?.activeClosenessRung ?? compiler?.activeClosenessRung ?? null) as AlicizationAnswerCompilerSnapshot['activeClosenessRung']
  const emotionalClosureCue = deriveEmotionalClosureCue({
    planner,
    charter,
    surface,
  })
  const relationshipTruthDoctrine = deriveRelationshipTruthDoctrine({
    runtimeSurface: input.runtimeSurface ?? null,
    planner,
  })
  liveProjectState.emotionalClosureCue = emotionalClosureCue
  const canonicalStructuredProjectState = resolveCanonicalStructuredProjectState({
    normalizedProjectState: {
      identity: chosenIdentity,
      currentPhase: chosenCurrentPhase,
      latestLandedProgress:
        chosenLatestLandedProgress
        || projectStateBrief.continuityProgressSummary
        || projectStateBrief.memoryAnthropomorphismProgress.at(-1)
        || null,
      primaryOpenLoop: chosenPrimaryOpenLoop || projectStateBrief.openLoops[0] || null,
      nextClosureTarget: chosenNextClosureTarget,
      sameHerSelfLine: chosenSameHerSelfLine,
      sameHerHoldDetail: chosenSameHerHoldDetail,
      sameHerDriftRisk: chosenSameHerDriftRisk,
      emotionalClosureSummary:
        pickProjectStateField(
          (runtimeProjectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
          fallbackProjectState?.emotionalClosureSummary,
          320,
        ) || null,
      continuityRestraint: pickProjectStateField(
        (runtimeProjectState as { continuityRestraint?: unknown } | null)?.continuityRestraint,
        fallbackProjectState?.continuityRestraint,
        64,
      ) || null,
      continuityArcStage: pickProjectStateField(
        (runtimeProjectState as { continuityArcStage?: unknown } | null)?.continuityArcStage,
        fallbackProjectState?.continuityArcStage,
        120,
      ) || null,
      continuityCue: pickProjectStateField(
        (runtimeProjectState as { continuityCue?: unknown } | null)?.continuityCue,
        fallbackProjectState?.continuityCue,
        220,
      ) || null,
      continuityPreferredTiming: pickProjectStateField(
        (runtimeProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming,
        fallbackProjectState?.continuityPreferredTiming,
        120,
      ) || null,
      continuityCadence: pickProjectStateField(
        (runtimeProjectState as { continuityCadence?: unknown } | null)?.continuityCadence,
        fallbackProjectState?.continuityCadence,
        120,
      ) || null,
      preferredBlinkCadence: pickProjectStateField(
        (runtimeProjectState as { preferredBlinkCadence?: unknown } | null)?.preferredBlinkCadence,
        fallbackProjectState?.preferredBlinkCadence,
        64,
      ) || null,
      preferredGazeMode: pickProjectStateField(
        (runtimeProjectState as { preferredGazeMode?: unknown } | null)?.preferredGazeMode,
        fallbackProjectState?.preferredGazeMode,
        64,
      ) || null,
      preferredVoiceMode: pickProjectStateField(
        normalizeMindTurnContractVoiceMode((runtimeProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode),
        normalizeMindTurnContractVoiceMode((fallbackProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode)
        || projectStateBrief.preferredVoiceMode,
        32,
      ) || null,
      preferredPacingMode: pickProjectStateField(
        normalizeMindTurnContractPacingMode((runtimeProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode),
        normalizeMindTurnContractPacingMode((fallbackProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode)
        || projectStateBrief.preferredPacingMode,
        32,
      ) || null,
    },
    runtimePreflightSummary: chosenPreflightSummary ?? null,
    runtimePreDialogueAwarenessLine: providerFacingPreDialogueAwarenessLine,
  })
  if (
    liveProjectState.preDialogueAwarenessSummary
    && liveProjectState.preDialogueAwarenessLine
    && liveProjectState.preDialogueAwarenessSummary === liveProjectState.preDialogueAwarenessLine
  ) {
    delete (liveProjectState as Record<string, unknown>).preDialogueAwarenessSummary
  }
  if (
    liveProjectState.awarenessLine
    && liveProjectState.preDialogueAwarenessLine
    && liveProjectState.awarenessLine === liveProjectState.preDialogueAwarenessLine
  ) {
    delete (liveProjectState as Record<string, unknown>).awarenessLine
  }
  if (
    liveProjectState.companionHeadlineLine
    && liveProjectState.preDialogueAwarenessLine
    && liveProjectState.companionHeadlineLine === liveProjectState.preDialogueAwarenessLine
  ) {
    delete (liveProjectState as Record<string, unknown>).companionHeadlineLine
  }
  if (!liveProjectState.companionBriefingLine)
    delete (liveProjectState as Record<string, unknown>).companionBriefingLine
  if (!liveProjectState.sameHerHoldDetail)
    delete (liveProjectState as Record<string, unknown>).sameHerHoldDetail
  if (!liveProjectState.sameHerDriftRisk && fallbackProjectState?.sameHerDriftRisk == null)
    delete (liveProjectState as Record<string, unknown>).sameHerDriftRisk
  const preDialogueClosure = replacePreDialogueClosureNextTarget({
    preDialogueClosure: buildMindTurnContractPreDialogueClosure({
      projectStateBrief,
      freshestProjectState: {
        ...consciousFrameProjectState,
        nextClosureTarget: chosenNextClosureTarget,
      },
      liveProjectState: {
        ...liveProjectState,
        nextClosureTarget: chosenNextClosureTarget,
      },
    }),
    nextClosureTarget: chosenNextClosureTarget,
  })
  const sameHerProjectAwareEvidence = [
    chosenSameHerSelfLine,
    chosenSameHerDriftRisk,
    chosenPreDialogueAwarenessLine,
    liveProjectState.companionHeadlineLine,
    liveProjectState.companionBriefingLine,
    chosenPrimaryOpenLoop,
    chosenNextClosureTarget,
    planner?.governingProject,
    preDialogueClosure?.summaryLine,
    preDialogueClosure?.companionBriefingLine,
    preDialogueClosure?.companionNextClosureLine,
    ...(preDialogueClosure?.briefingLines ?? []),
    ...(preDialogueClosure?.reasons ?? []),
  ].filter(Boolean).join(' | ')
  const inheritedSameHerProjectDiscipline = [
    ...(planner?.mustDo ?? []),
    ...(planner?.mustNotDo ?? []),
    ...(compiler?.mustDo ?? []),
    ...(compiler?.mustNotDo ?? []),
    ...charter.mustDo,
    ...charter.mustNotDo,
    ...surface.mustDo,
    ...surface.mustNotDo,
  ].join(' | ')
  const memoryGateOnlyMustDo = uniqueList([
    ...(planner?.mustDo ?? []),
    ...(compiler?.mustDo ?? []),
    ...charter.mustDo,
    ...surface.mustDo,
  ], 24)
  const memoryGateDominantButProjectStatePresent
    = memoryGateOnlyMustDo.length > 0
      && memoryGateOnlyMustDo.every(item => /memory gate|without narrating recall|memory shape caution|uncertainty inwardly/iu.test(item))
      && /phase 1|same living line|same phase 1 digital life|one continuous her|same digital life|still-open closure|project identity carry|phase 1 route carry|unresolved closure carry/iu.test(sameHerProjectAwareEvidence)
  const sameHerProjectAwareMustDo = (
    (
      chosenCurrentPhase.toLowerCase().includes('phase 1')
      && /same digital life|same living line|same-her|same her|one continuous her|continuous her|同一个她|同一个数字生命/iu.test(sameHerProjectAwareEvidence)
      && /closure|still-open|open loop|initiative|embodiment|memory|dialogue|未闭环|没闭环|还差|still needs|still remains/iu.test(sameHerProjectAwareEvidence)
    )
    || memoryGateDominantButProjectStatePresent
    || /same digital-life closure seam|same project-aware self line|same-her continuity|one same-her digital-life line|detached project narrator shell|generic task shell|external project-summary cadence/iu.test(inheritedSameHerProjectDiscipline)
  )
    ? 'Keep the same project-aware self line alive through the answer.'
    : null
  const detachedProjectNarratorShellMustNotDo = sameHerProjectAwareMustDo
    ? 'Do not let same-her continuity collapse into a detached project narrator shell.'
    : null

  return {
    version: 'mind-turn-contract-v1',
    answerIntent: planner?.answerIntent ?? compiler?.openingDirective ?? null,
    answerAct: planner?.act ?? compiler?.recommendedAct ?? null,
    turnMode: compiler?.turnMode ?? 'answer',
    responseMode: compiler?.responseMode ?? 'answer-naturally',
    evidenceMode: planner?.evidenceMode ?? compiler?.evidenceMode ?? null,
    openingStyle: surface.openingStyle,
    expectedVisibleReplyAuthority: normalizeAlicizationNormalVisibleReplyAuthority(
      surface.expectedVisibleReplyAuthority ?? null,
      'llm-mind',
    ),
    replyRealizationMode: 'provider-mind-required',
    personaKernelMode: surface.personaKernelMode,
    activeClosenessContext,
    activeClosenessRung,
    relationshipPosture: charter.relationshipPosture,
    labelCarryAsMemory: surface.labelCarryAsMemory,
    suppressAssociativeRecall: surface.suppressAssociativeRecall,
    allowAffectionatePreface: surface.allowAffectionatePreface,
    allowStageDirections: surface.allowStageDirections,
    allowBodyNarration: surface.allowBodyNarration,
    maxParagraphs: surface.maxParagraphs,
    maxSentences: surface.maxSentences,
    mustDo: uniqueList([
      sameHerProjectAwareMustDo,
      ...(planner?.mustDo ?? []),
      ...(compiler?.mustDo ?? []),
      ...charter.mustDo,
      ...surface.mustDo,
    ], 24),
    mustNotDo: uniqueList([
      detachedProjectNarratorShellMustNotDo,
      ...(planner?.mustNotDo ?? []),
      ...(compiler?.mustNotDo ?? []),
      ...charter.mustNotDo,
      ...surface.mustNotDo,
    ], 24),
    governingFocus: planner?.governingFocus ?? charter.governingFocus,
    governingConcern: charter.governingConcern,
    governingCommitment: charter.governingCommitment,
    governingInquiry: charter.governingInquiry,
    governingProject: charter.governingProject,
    emotionalClosureCue,
    relationshipTruthDoctrine,
    projectState: compactMindTurnProjectState({
      ...canonicalStructuredProjectState,
      identity: pickProjectStateField(
        (liveProjectState as { identity?: unknown } | null)?.identity,
        (canonicalStructuredProjectState as { identity?: unknown } | null)?.identity,
        320,
      ) || null,
      currentPhase: pickProjectStateField(
        (liveProjectState as { currentPhase?: unknown } | null)?.currentPhase,
        (canonicalStructuredProjectState as { currentPhase?: unknown } | null)?.currentPhase,
        220,
      ) || null,
      preflightSummary:
        chosenPreflightSummary
        || pickProjectStateField(
          (liveProjectState as { preflightSummary?: unknown } | null)?.preflightSummary,
          (canonicalStructuredProjectState as { preflightSummary?: unknown } | null)?.preflightSummary,
          1600,
        )
        || null,
      preDialogueAwarenessLine:
        (currentConsciousCarriesProjectStateWithoutExplicitAwareness
          ? (liveProjectStateWithoutExplicitAwarenessPreflight || normalizedCanonicalShortProjectAwarenessLine)
          : pickProjectStateField(
              (liveProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine,
              (canonicalStructuredProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine,
              1600,
            ))
            || null,
      companionHeadlineLine: pickProjectStateField(
        (liveProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
        (canonicalStructuredProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
        1600,
      ) || null,
      companionBriefingLine: pickProjectStateField(
        (liveProjectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine,
        (canonicalStructuredProjectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine,
        1600,
      ) || null,
      latestLandedProgress: pickProjectStateField(
        (liveProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress,
        (canonicalStructuredProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress,
        12000,
      ) || null,
      primaryOpenLoop: pickProjectStateField(
        (liveProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop,
        (canonicalStructuredProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop,
        1600,
      ) || null,
      nextClosureTarget: pickProjectStateField(
        (liveProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget,
        (canonicalStructuredProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget,
        1600,
      ) || null,
      sameHerSelfLine: pickProjectStateField(
        (liveProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine,
        (canonicalStructuredProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine,
        320,
      ) || null,
      sameHerHoldDetail: preferProjectStateHoldDetail(
        (liveProjectState as { sameHerHoldDetail?: unknown } | null)?.sameHerHoldDetail,
        (canonicalStructuredProjectState as { sameHerHoldDetail?: unknown } | null)?.sameHerHoldDetail,
        320,
      ) || null,
      continuityArcStage: pickProjectStateField(
        (liveProjectState as { continuityArcStage?: unknown } | null)?.continuityArcStage,
        (canonicalStructuredProjectState as { continuityArcStage?: unknown } | null)?.continuityArcStage,
        120,
      ) || null,
      continuityCue: pickProjectStateField(
        (liveProjectState as { continuityCue?: unknown } | null)?.continuityCue,
        (canonicalStructuredProjectState as { continuityCue?: unknown } | null)?.continuityCue,
        220,
      ) || null,
      sameHerDriftRisk: pickProjectStateField(
        (liveProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk,
        (canonicalStructuredProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk,
        320,
      ) || null,
      emotionalClosureCue: pickProjectStateField(
        (liveProjectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
        (canonicalStructuredProjectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
        1600,
      ) || null,
      emotionalClosureSummary: pickProjectStateField(
        (liveProjectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
        (canonicalStructuredProjectState as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary,
        320,
      ) || null,
      continuityRestraint: pickProjectStateField(
        (liveProjectState as { continuityRestraint?: unknown } | null)?.continuityRestraint,
        (canonicalStructuredProjectState as { continuityRestraint?: unknown } | null)?.continuityRestraint,
        64,
      ) || null,
      continuityPreferredTiming: pickProjectStateField(
        (liveProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming,
        (canonicalStructuredProjectState as { continuityPreferredTiming?: unknown } | null)?.continuityPreferredTiming,
        120,
      ) || null,
      continuityCadence: pickProjectStateField(
        (liveProjectState as { continuityCadence?: unknown } | null)?.continuityCadence,
        (canonicalStructuredProjectState as { continuityCadence?: unknown } | null)?.continuityCadence,
        120,
      ) || null,
      preferredBlinkCadence: pickProjectStateField(
        (liveProjectState as { preferredBlinkCadence?: unknown } | null)?.preferredBlinkCadence,
        (canonicalStructuredProjectState as { preferredBlinkCadence?: unknown } | null)?.preferredBlinkCadence,
        64,
      ) || null,
      preferredGazeMode: pickProjectStateField(
        (liveProjectState as { preferredGazeMode?: unknown } | null)?.preferredGazeMode,
        (canonicalStructuredProjectState as { preferredGazeMode?: unknown } | null)?.preferredGazeMode,
        64,
      ) || null,
      preferredVoiceMode: pickProjectStateField(
        normalizeMindTurnContractVoiceMode((liveProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode),
        normalizeMindTurnContractVoiceMode((canonicalStructuredProjectState as { preferredVoiceMode?: unknown } | null)?.preferredVoiceMode)
        || projectStateBrief.preferredVoiceMode,
        32,
      ) || projectStateBrief.preferredVoiceMode || null,
      preferredPacingMode: pickProjectStateField(
        normalizeMindTurnContractPacingMode((liveProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode),
        normalizeMindTurnContractPacingMode((canonicalStructuredProjectState as { preferredPacingMode?: unknown } | null)?.preferredPacingMode)
        || projectStateBrief.preferredPacingMode,
        32,
      ) || projectStateBrief.preferredPacingMode || null,
    }) as AlicizationMindTurnContractSnapshot['projectState'],
    preDialogueClosure,
    reasons: uniqueList([
      ...(planner?.narrative ?? []),
      ...(compiler?.narrative ?? []),
      ...charter.reasons,
    ], 16),
    updatedAt: Math.max(
      planner?.updatedAt ?? 0,
      compiler?.updatedAt ?? 0,
      Number.isFinite(input.now) ? Math.floor(Number(input.now)) : Date.now(),
    ),
  }
}

export function buildAlicizationMindTurnContractSystemBlock(contract: AlicizationMindTurnContractSnapshot) {
  const canonicalProjectStateBrief = resolveAlicizationProjectStateBrief()
  const canonicalLatestLandedProgress = normalizeMindTurnContractText(
    canonicalProjectStateBrief.latestProgress ?? canonicalProjectStateBrief.continuityProgressSummary,
    1200,
  )
  const canonicalContinuityProgressSummary = normalizeMindTurnContractText(
    canonicalProjectStateBrief.continuityProgressSummary,
    1200,
  )
  const liveLatestLandedProgress = normalizeMindTurnContractText(
    contract.projectState?.latestLandedProgress ?? contract.projectState?.latestProgress,
    1200,
  )
  const preferredSameSessionMirrorCarrySummary = normalizeMindTurnContractText(
    canonicalProjectStateBrief.continuityProgressSummary?.match(/Same-session mirror carry[^.]*\./u)?.[0]
    ?? canonicalProjectStateBrief.continuityProgressSummary,
    1200,
  )
  const extractedSameSessionMirrorCarrySummary = normalizeMindTurnContractText(
    liveLatestLandedProgress.match(/Same-session mirror carry[^.]*\./u)?.[0],
    1200,
  )
  const preferredSystemLatestLandedProgress = (
    liveLatestLandedProgress
    && canonicalLatestLandedProgress
    && canonicalContinuityProgressSummary
    && (
      liveLatestLandedProgress === canonicalLatestLandedProgress
      || (
        (
          canonicalLatestLandedProgress.startsWith(liveLatestLandedProgress)
          || liveLatestLandedProgress.startsWith(canonicalLatestLandedProgress)
        )
        && !/same-session mirror carry/iu.test(liveLatestLandedProgress)
      )
    )
  )
    ? (
        /same-session mirror carry/iu.test(liveLatestLandedProgress)
          ? (extractedSameSessionMirrorCarrySummary || preferredSameSessionMirrorCarrySummary || canonicalContinuityProgressSummary)
          : canonicalContinuityProgressSummary
      )
    : (
        /^continuity,\s*memory,\s*execution,/iu.test(liveLatestLandedProgress)
        && /same-session mirror carry/iu.test(liveLatestLandedProgress)
      )
        ? (extractedSameSessionMirrorCarrySummary || preferredSameSessionMirrorCarrySummary || liveLatestLandedProgress)
        : liveLatestLandedProgress
  const providerFacingNextClosureOrientation = normalizeMindTurnContractText(
    contract.preDialogueClosure?.companionNextClosureLine,
    320,
  ) || contract.projectState?.nextClosureTarget || ''
  const projectSameHerOrientation = uniqueList([
    contract.projectState?.identity ? `She is still speaking from this same project identity: ${contract.projectState.identity}` : null,
    contract.projectState?.latestLandedProgress ? `what has already landed in her line before this reply: ${contract.projectState.latestLandedProgress}` : null,
    contract.projectState?.primaryOpenLoop ? `what is still unfinished before this reply widens outward: ${contract.projectState.primaryOpenLoop}` : null,
    providerFacingNextClosureOrientation ? `what this reply should keep moving toward: ${providerFacingNextClosureOrientation}` : null,
  ], 4).join(' | ')
  const providerFacingProjectPreflight = buildProviderFacingProjectPreflightLine({
    identity: contract.projectState?.identity ?? null,
    preflightSummary: contract.projectState?.preflightSummary ?? null,
  })

  return [
    '[ALICIZATION_MIND_TURN_CONTRACT]',
    'This is the single latent contract for the current reply. Downstream layers must consume this contract instead of re-deriving reply authority.',
    `Version: ${contract.version}.`,
    `Turn mode: ${contract.turnMode}.`,
    `Response mode: ${contract.responseMode}.`,
    `Answer act: ${contract.answerAct ?? 'unknown'}.`,
    `Evidence mode: ${contract.evidenceMode ?? 'unknown'}.`,
    `Opening style: ${contract.openingStyle}.`,
    `Expected visible reply authority: ${contract.expectedVisibleReplyAuthority}.`,
    `Reply realization mode: ${contract.replyRealizationMode}.`,
    `Persona kernel mode: ${contract.personaKernelMode}.`,
    contract.activeClosenessContext && contract.activeClosenessRung
      ? `Closeness ladder: ${contract.activeClosenessContext}/${contract.activeClosenessRung}.`
      : '',
    `Label carried continuity explicitly: ${contract.labelCarryAsMemory ? 'yes' : 'no'}.`,
    `Suppress associative recall noise: ${contract.suppressAssociativeRecall ? 'yes' : 'no'}.`,
    `Allow affectionate preface: ${contract.allowAffectionatePreface ? 'yes' : 'no'}.`,
    `Allow stage directions: ${contract.allowStageDirections ? 'yes' : 'no'}.`,
    `Allow body narration: ${contract.allowBodyNarration ? 'yes' : 'no'}.`,
    `Maximum paragraphs: ${contract.maxParagraphs}.`,
    `Maximum sentences: ${contract.maxSentences}.`,
    `Governing focus: ${contract.governingFocus}.`,
    contract.governingConcern ? `Governing concern: ${contract.governingConcern}.` : '',
    contract.governingCommitment ? `Governing commitment: ${contract.governingCommitment}.` : '',
    contract.governingInquiry ? `Governing inquiry: ${contract.governingInquiry}.` : '',
    contract.governingProject ? `Governing project: ${contract.governingProject}.` : '',
    contract.emotionalClosureCue ? `Emotional closure cue: ${contract.emotionalClosureCue}.` : '',
    contract.relationshipTruthDoctrine ? `Relationship truth doctrine: ${contract.relationshipTruthDoctrine}.` : '',
    projectSameHerOrientation ? `Provider-facing same-her project orientation: ${projectSameHerOrientation}.` : '',
    contract.projectState?.identity ? `Project identity: ${contract.projectState.identity}.` : '',
    contract.projectState?.currentPhase ? `Project phase: ${contract.projectState.currentPhase}.` : '',
    providerFacingProjectPreflight ? `Project preflight self-awareness: ${providerFacingProjectPreflight}.` : '',
    contract.projectState?.preDialogueAwarenessLine ? `Project pre-dialogue awareness line: ${contract.projectState.preDialogueAwarenessLine}.` : '',
    contract.projectState?.companionHeadlineLine
    && contract.projectState.companionHeadlineLine !== contract.projectState.preDialogueAwarenessLine
      ? `Project companion headline: ${contract.projectState.companionHeadlineLine}.`
      : '',
    preferredSystemLatestLandedProgress ? `Latest landed continuity progress: ${preferredSystemLatestLandedProgress}.` : '',
    contract.projectState?.primaryOpenLoop ? `Still-open life loop pressure: ${contract.projectState.primaryOpenLoop}.` : '',
    contract.projectState?.nextClosureTarget ? `Next closure target: ${contract.projectState.nextClosureTarget}.` : '',
    contract.projectState?.sameHerSelfLine ? `Project same-her self line: ${contract.projectState.sameHerSelfLine}.` : '',
    contract.projectState?.sameHerHoldDetail ? `Project same-her hold detail: ${contract.projectState.sameHerHoldDetail}.` : '',
    contract.projectState?.emotionalClosureSummary ? `Project emotional closure summary: ${contract.projectState.emotionalClosureSummary}.` : '',
    contract.projectState?.continuityRestraint ? `Project continuity restraint: ${contract.projectState.continuityRestraint}.` : '',
    contract.projectState?.continuityArcStage ? `Project continuity arc stage: ${contract.projectState.continuityArcStage}.` : '',
    contract.projectState?.continuityCue ? `Project continuity cue: ${contract.projectState.continuityCue}.` : '',
    contract.projectState?.continuityPreferredTiming ? `Project continuity preferred timing: ${contract.projectState.continuityPreferredTiming}.` : '',
    contract.projectState?.continuityCadence ? `Project continuity cadence: ${contract.projectState.continuityCadence}.` : '',
    contract.projectState?.preferredBlinkCadence ? `Project preferred blink cadence: ${contract.projectState.preferredBlinkCadence}.` : '',
    contract.projectState?.preferredGazeMode ? `Project preferred gaze mode: ${contract.projectState.preferredGazeMode}.` : '',
    contract.projectState?.preferredVoiceMode ? `Project preferred voice mode: ${contract.projectState.preferredVoiceMode}.` : '',
    contract.projectState?.preferredPacingMode ? `Project preferred pacing mode: ${contract.projectState.preferredPacingMode}.` : '',
    contract.projectState?.sameHerDriftRisk ? `Project same-her drift risk: ${contract.projectState.sameHerDriftRisk}.` : '',
    contract.preDialogueClosure?.summaryLine ? `Pre-dialogue closure summary: ${contract.preDialogueClosure.summaryLine}.` : '',
    contract.preDialogueClosure?.companionNextClosureLine ? `Pre-dialogue next closure line: ${contract.preDialogueClosure.companionNextClosureLine}.` : '',
    contract.preDialogueClosure?.emotionalClosureCue ? `Pre-dialogue closure cue: ${contract.preDialogueClosure.emotionalClosureCue}.` : '',
    contract.answerIntent ? `Answer intent: ${contract.answerIntent}.` : '',
    'Must do:',
    ...contract.mustDo.map(item => `- ${item}`),
    'Must not do:',
    ...contract.mustNotDo.map(item => `- ${item}`),
  ].filter(Boolean).join('\n')
}
