import type {
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationMindTurnGovernance,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'

import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import { buildCurrentConsciousFrame } from './current-conscious-frame'
import {
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateSnapshot,
  resolveAlicizationSurfaceProjectStateSnapshot,
} from './project-state-brief'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'
import { resolveCanonicalStructuredProjectState } from './structured-project-state'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

const projectAwarenessFieldMaxChars = 1_320

type AlicizationCurrentConsciousProjectState = NonNullable<AlicizationCurrentConsciousFrameSnapshot['projectState']>

function sanitizeConsciousContinuityPreferredTiming(
  raw: unknown,
): AlicizationCurrentConsciousFrameSnapshot['continuityPreferredTiming'] {
  const normalized = sanitizeText(raw, 64)
  return normalized === 'internal-only'
    || normalized === 'after-payoff'
    || normalized === 'same-turn-if-invited'
    || normalized === 'next-open-window'
    ? normalized
    : null
}

function sanitizeConsciousProjectStateBlinkCadence(
  raw: unknown,
): AlicizationCurrentConsciousProjectState['preferredBlinkCadence'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'normal' || normalized === 'linger' || normalized === 'quiet'
    ? normalized
    : null
}

function sanitizeConsciousProjectStateGazeMode(
  raw: unknown,
): AlicizationCurrentConsciousProjectState['preferredGazeMode'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'steady' || normalized === 'soften' || normalized === 'drift'
    ? normalized
    : null
}

function sanitizeConsciousProjectStatePauseMode(
  raw: unknown,
): AlicizationCurrentConsciousProjectState['preferredPauseMode'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'longer' || normalized === 'natural'
    ? normalized
    : null
}

function sanitizeConsciousProjectStateLipsyncMode(
  raw: unknown,
): AlicizationCurrentConsciousProjectState['preferredLipsyncMode'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'restrained' || normalized === 'matched'
    ? normalized
    : null
}

function sanitizeConsciousProjectStateVoiceMode(
  raw: unknown,
): AlicizationCurrentConsciousProjectState['preferredVoiceMode'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'lower-pressure' || normalized === 'even'
    ? normalized
    : null
}

function sanitizeConsciousProjectStatePacingMode(
  raw: unknown,
): AlicizationCurrentConsciousProjectState['preferredPacingMode'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'slower' || normalized === 'natural'
    ? normalized
    : null
}

function mergeProjectionSelfContinuityAuthority(input: {
  projection?: AlicizationPersonStateProjection | null
  authority?: AlicizationSelfContinuityAuthority | null
}): AlicizationPersonStateProjection | null | undefined {
  if (!input.projection)
    return input.projection

  return {
    ...input.projection,
    selfContinuityAuthority: input.authority ?? input.projection.selfContinuityAuthority ?? null,
  }
}

function stripTrailingPunctuation(text: string) {
  return text.replace(/[.。!！?？;；:：]+$/u, '').trim()
}

function lowerFirst(text: string) {
  if (!text)
    return ''
  return text.slice(0, 1).toLowerCase() + text.slice(1)
}

function joinFallbackText(values: Array<string | null | undefined>, maxChars = 420) {
  return sanitizeText(values.filter(Boolean).join(' '), maxChars)
}

function mergeReasonTags(...groups: Array<readonly string[] | null | undefined>) {
  return Array.from(new Set(
    groups.flatMap(group =>
      Array.isArray(group)
        ? group.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [],
    ),
  ))
}

function isRestProtectiveClosureCue(text: string | null | undefined) {
  const normalized = sanitizeText(text ?? '', 220).toLowerCase()
  if (!normalized)
    return false
  return /rest-protective|protect rest|quiet[- ]companionship|line holds inward|line hold inward|stay inward|护住休息|安静陪着|先别外扩/u.test(normalized)
}

function preferRicherClosureCarryText(input: {
  current?: unknown
  candidate?: unknown
  maxChars?: number
}) {
  const currentRaw = sanitizeText(input.current, input.maxChars ?? 240)
  const candidateRaw = sanitizeText(input.candidate, input.maxChars ?? 240)
  const current = currentRaw.toLowerCase()
  const candidate = candidateRaw.toLowerCase()

  if (!current)
    return candidateRaw
  if (!candidate)
    return currentRaw
  if (current === candidate)
    return currentRaw

  const preferredClosureAuthority = preferStrongerContinuityClosureAuthority(currentRaw, candidateRaw)
  if (preferredClosureAuthority)
    return preferredClosureAuthority

  const score = (value: string) => {
    let result = 0
    if (value.includes('repair-before-closeness') || value.includes('repair before closeness'))
      result += 8
    if (value.includes('rest-protective') || value.includes('rest protective'))
      result += 8
    if (value.includes('quiet-companionship') || value.includes('quiet companionship'))
      result += 6
    if (value.includes('same-her hold') || value.includes('same her hold'))
      result += 4
    if (value.includes('measured-return') || value.includes('lower-pressure') || value.includes('leave more room'))
      result += 2
    return result
  }

  const currentScore = score(current)
  const candidateScore = score(candidate)
  if (currentScore !== candidateScore)
    return candidateScore > currentScore ? candidateRaw : currentRaw

  if (candidate.startsWith(current) && candidate.length >= current.length + 24)
    return candidateRaw
  if (current.startsWith(candidate) && current.length >= candidate.length + 24)
    return currentRaw

  return candidate.length > current.length ? candidateRaw : currentRaw
}

function resolvePreferredProjectStateClosureCarry(input: {
  governanceClosureCue?: unknown
  projectState?: Record<string, unknown> | null
}) {
  const projectState = input.projectState ?? null
  const emotionalClosureCue = sanitizeText(input.governanceClosureCue, 220) || null
  const emotionalClosureSummary = preferRicherClosureCarryText({
    current: projectState?.emotionalClosureSummary ?? projectState?.sameHerHoldDetail,
    candidate: input.governanceClosureCue ?? projectState?.emotionalClosureCue,
    maxChars: 240,
  }) || emotionalClosureCue
  const sameHerHoldDetail = sanitizeText(projectState?.sameHerHoldDetail, 220) || null

  return {
    emotionalClosureCue,
    emotionalClosureSummary: emotionalClosureSummary || null,
    sameHerHoldDetail,
  }
}

function looksLikeStrongSameHerProjectLine(value: string | null | undefined) {
  const normalized = sanitizeText(value ?? '', projectAwarenessFieldMaxChars).toLowerCase()
  if (!normalized)
    return false
  return /same living line|same-her|same her|one continuous her|one living digital life|without splitting her continuity|still needs .* closure|phase 1 digital life/u.test(normalized)
}

function looksLikeThinProjectReminderLine(value: string | null | undefined) {
  const normalized = sanitizeText(value ?? '', projectAwarenessFieldMaxChars).toLowerCase()
  if (!normalized)
    return false
  return /keep this same digital life project in view|generic reminder|generic guidance|same digital life \| keep the closure seam explicit|detached project shell/u.test(normalized)
}

function looksLikeThinProjectPreflightLine(value: string | null | undefined) {
  const normalized = sanitizeText(value ?? '', projectAwarenessFieldMaxChars).toLowerCase()
  if (!normalized)
    return false

  return looksLikeThinProjectReminderLine(normalized)
    || normalized.includes('generic continuity summary')
    || normalized.includes('generic awareness summary')
    || normalized === 'project'
    || normalized === 'phase 1'
    || normalized.startsWith('same digital life')
}

function shouldPreferProjectAwarenessSummary(input: {
  line: string | null | undefined
  summary: string | null | undefined
}) {
  const line = sanitizeText(input.line ?? '', projectAwarenessFieldMaxChars)
  const summary = sanitizeText(input.summary ?? '', projectAwarenessFieldMaxChars)
  if (!summary)
    return false
  if (!line)
    return true
  if (!looksLikeThinProjectReminderLine(line)) {
    return (
      (line.includes('| open=') || line.includes('| next=') || !/^before answering[, :]/iu.test(line))
      && /^before answering[, :]/iu.test(summary)
    )
  }
  return !looksLikeThinProjectReminderLine(summary) || summary.length > line.length + 24
}

function buildProjectAwarenessNeedLead(input: {
  identity?: string | null | undefined
  preDialogueAwarenessLine?: string | null | undefined
}) {
  const identity = sanitizeText(input.identity ?? '', 220)
  const awarenessLine = sanitizeText(input.preDialogueAwarenessLine ?? '', 240)
  const awarenessLooksDense = awarenessLine.length > 180
    || awarenessLine.includes('|')
    || /^before answering[, :]/iu.test(awarenessLine)
    || /what has already landed is|the still-open closure is|this reply should keep moving toward/iu.test(awarenessLine)

  if (identity && awarenessLooksDense)
    return `Before I answer, I need to stay inside ${lowerFirst(stripTrailingPunctuation(identity))}.`
  if (awarenessLine)
    return `Before I answer, I need to stay inside ${lowerFirst(stripTrailingPunctuation(awarenessLine))}.`
  if (identity)
    return `Before I answer, I need to stay inside ${lowerFirst(stripTrailingPunctuation(identity))}.`
  return null
}

function buildFallbackProjectStateGrounding() {
  const projectState = resolveAlicizationProjectStateBrief()
  const canonicalProjectState = resolveCanonicalStructuredProjectState({
    normalizedProjectState: {
      identity: 'this local-first digital life project',
      currentPhase: projectState.currentPhase,
      latestLandedProgress:
        projectState.continuityProgressSummary
        ?? projectState.memoryAnthropomorphismProgress[projectState.memoryAnthropomorphismProgress.length - 1]
        ?? '',
      primaryOpenLoop: projectState.openLoops[0] ?? '',
      nextClosureTarget: projectState.nextClosureTarget,
      sameHerSelfLine: projectState.sameHerSelfLine,
      sameHerDriftRisk: projectState.sameHerDriftRisk,
    },
    runtimePreflightSummary: projectState.preflightSummary ?? null,
    runtimePreDialogueAwarenessLine: projectState.preDialogueAwarenessLine ?? null,
  })
  return {
    identity: sanitizeText(canonicalProjectState.identity, 220),
    currentPhase: sanitizeText(canonicalProjectState.currentPhase, 120),
    preflightSummary: sanitizeText(canonicalProjectState.preflightSummary ?? '', 320),
    preDialogueAwarenessLine: sanitizeText(canonicalProjectState.preDialogueAwarenessLine ?? '', projectAwarenessFieldMaxChars),
    latestProgress: sanitizeText(canonicalProjectState.latestLandedProgress ?? '', 220),
    primaryOpenLoop: sanitizeText(canonicalProjectState.primaryOpenLoop ?? '', 180),
    nextClosureTarget: sanitizeText(canonicalProjectState.nextClosureTarget, 1600),
    sameHerSelfLine: sanitizeText(canonicalProjectState.sameHerSelfLine, 220),
    sameHerDriftRisk: sanitizeText(canonicalProjectState.sameHerDriftRisk, 220),
  }
}

function looksLikeRicherProjectAwarenessLine(value: string | null | undefined) {
  const normalized = sanitizeText(value ?? '', projectAwarenessFieldMaxChars).toLowerCase()
  if (!normalized)
    return false
  return /^before answering[, :]/u.test(normalized)
    || normalized.includes('audible-body')
    || looksLikeStrongSameHerProjectLine(normalized)
}

function buildSurfaceProjectStateGrounding(surface: AlicizationDigitalLifeRuntimeSurface) {
  const canonicalGrounding = buildFallbackProjectStateGrounding()
  const preferredProjectState
    = surface.dialogue?.currentConsciousFrame?.projectState
      ?? surface.dialogue?.runtimeDigest?.projectState
      ?? surface.raw?.runtimeDigest?.projectState
      ?? surface.cognition?.runtimeDigest?.projectState
      ?? null
  if (!preferredProjectState)
    return canonicalGrounding

  const fallbackSurfaceProjectState = resolveAlicizationSurfaceProjectStateSnapshot({
    runtimeSurface: {
      ...surface,
      dialogue: {
        ...surface.dialogue,
        currentConsciousFrame: null,
      },
    },
  })
  const normalizedSurfaceProjectState = resolveAlicizationSurfaceProjectStateSnapshot({
    runtimeSurface: {
      ...surface,
      dialogue: {
        ...surface.dialogue,
        currentConsciousFrame: {
          ...surface.dialogue?.currentConsciousFrame,
          projectState: resolveAlicizationProjectStateSnapshot({
            runtimeProjectState: {
              identity: (preferredProjectState as { identity?: unknown } | null)?.identity ?? null,
              currentPhase: (preferredProjectState as { currentPhase?: unknown } | null)?.currentPhase ?? null,
              preflightSummary: (preferredProjectState as { preflightSummary?: unknown } | null)?.preflightSummary ?? null,
              preDialogueAwarenessLine:
                (preferredProjectState as { preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.preDialogueAwarenessLine
                ?? (preferredProjectState as { preDialogueAwarenessLine?: unknown, awarenessLine?: unknown } | null)?.awarenessLine
                ?? null,
              awarenessLine:
                (preferredProjectState as { awarenessLine?: unknown } | null)?.awarenessLine
                ?? null,
              companionHeadlineLine:
                (preferredProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine
                ?? null,
              companionBriefingLine:
                (preferredProjectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine
                ?? null,
              preDialogueAwarenessSummary:
                (preferredProjectState as { preDialogueAwarenessSummary?: unknown } | null)?.preDialogueAwarenessSummary
                ?? null,
              latestLandedProgress:
                (preferredProjectState as {
                  latestLandedProgress?: unknown
                  latestProgress?: unknown
                  landedProgressSummary?: unknown
                } | null)?.latestLandedProgress
                ?? (preferredProjectState as {
                  latestLandedProgress?: unknown
                  latestProgress?: unknown
                  landedProgressSummary?: unknown
                } | null)?.latestProgress
                ?? (preferredProjectState as {
                  latestLandedProgress?: unknown
                  latestProgress?: unknown
                  landedProgressSummary?: unknown
                } | null)?.landedProgressSummary
                ?? null,
              latestProgress:
                (preferredProjectState as {
                  latestLandedProgress?: unknown
                  latestProgress?: unknown
                  landedProgressSummary?: unknown
                } | null)?.latestProgress
                ?? (preferredProjectState as {
                  latestLandedProgress?: unknown
                  latestProgress?: unknown
                  landedProgressSummary?: unknown
                } | null)?.latestLandedProgress
                ?? (preferredProjectState as {
                  latestLandedProgress?: unknown
                  latestProgress?: unknown
                  landedProgressSummary?: unknown
                } | null)?.landedProgressSummary
                ?? null,
              landedProgressSummary:
                (preferredProjectState as { landedProgressSummary?: unknown } | null)?.landedProgressSummary
                ?? null,
              primaryOpenLoop:
                (preferredProjectState as {
                  primaryOpenLoop?: unknown
                  openClosureSummary?: unknown
                } | null)?.primaryOpenLoop
                ?? (preferredProjectState as {
                  primaryOpenLoop?: unknown
                  openClosureSummary?: unknown
                } | null)?.openClosureSummary
                ?? null,
              openClosureSummary:
                (preferredProjectState as { openClosureSummary?: unknown } | null)?.openClosureSummary
                ?? null,
              nextClosureTarget:
                (preferredProjectState as {
                  nextClosureTarget?: unknown
                  nextClosureTargetSummary?: unknown
                } | null)?.nextClosureTarget
                ?? (preferredProjectState as {
                  nextClosureTarget?: unknown
                  nextClosureTargetSummary?: unknown
                } | null)?.nextClosureTargetSummary
                ?? null,
              nextClosureTargetSummary:
                (preferredProjectState as { nextClosureTargetSummary?: unknown } | null)?.nextClosureTargetSummary
                ?? null,
              sameHerSelfLine:
                (preferredProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine
                ?? null,
              sameHerDriftRisk:
                (preferredProjectState as {
                  sameHerDriftRisk?: unknown
                  sameHerDriftRiskSummary?: unknown
                } | null)?.sameHerDriftRisk
                ?? (preferredProjectState as {
                  sameHerDriftRisk?: unknown
                  sameHerDriftRiskSummary?: unknown
                } | null)?.sameHerDriftRiskSummary
                ?? null,
              sameHerDriftRiskSummary:
                (preferredProjectState as { sameHerDriftRiskSummary?: unknown } | null)?.sameHerDriftRiskSummary
                ?? null,
            },
            fallbackProjectState: fallbackSurfaceProjectState,
          }),
        },
      },
    },
  })

  return {
    identity: sanitizeText(normalizedSurfaceProjectState.identity || canonicalGrounding.identity, 220),
    currentPhase: sanitizeText(normalizedSurfaceProjectState.currentPhase || canonicalGrounding.currentPhase, 120),
    preflightSummary: sanitizeText(normalizedSurfaceProjectState.preflightSummary || canonicalGrounding.preflightSummary, 320),
    preDialogueAwarenessLine: sanitizeText(
      shouldPreferProjectAwarenessSummary({
        line: normalizedSurfaceProjectState.preDialogueAwarenessLine,
        summary: normalizedSurfaceProjectState.preDialogueAwarenessSummary,
      })
        ? normalizedSurfaceProjectState.preDialogueAwarenessSummary
        : (normalizedSurfaceProjectState.preDialogueAwarenessLine || canonicalGrounding.preDialogueAwarenessLine),
      projectAwarenessFieldMaxChars,
    ),
    latestProgress: sanitizeText(
      normalizedSurfaceProjectState.latestLandedProgress
      || normalizedSurfaceProjectState.latestProgress
      || canonicalGrounding.latestProgress,
      220,
    ),
    primaryOpenLoop: sanitizeText(normalizedSurfaceProjectState.primaryOpenLoop || canonicalGrounding.primaryOpenLoop, 180),
    nextClosureTarget: sanitizeText(normalizedSurfaceProjectState.nextClosureTarget || canonicalGrounding.nextClosureTarget, 1600),
    sameHerSelfLine: sanitizeText(normalizedSurfaceProjectState.sameHerSelfLine || canonicalGrounding.sameHerSelfLine, 220),
    sameHerDriftRisk: sanitizeText(normalizedSurfaceProjectState.sameHerDriftRisk || canonicalGrounding.sameHerDriftRisk, 220),
  }
}

function deriveFallbackContinuityArcTag(input: {
  surface: AlicizationDigitalLifeRuntimeSurface
  governance: AlicizationMindTurnGovernance
}) {
  const openingTexts = [
    input.surface.dialogue?.answerPlanner?.openingMove,
    input.surface.dialogue?.dialogueActKernel?.openingMove,
    input.governance.openingMove,
    input.governance.answerIntent,
    input.surface.memory?.personStateProjection?.openingGuidance,
  ]
    .filter(value => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()

  if (!openingTexts)
    return null
  if (
    openingTexts.includes('held back')
    || openingTexts.includes('gently before widening')
    || (openingTexts.includes('reopen it gently') && openingTexts.includes('room loosens'))
    || (openingTexts.includes('stay near') && openingTexts.includes('room loosens'))
    || /同一条线|同一条生命线|先留白|留白|别立刻把温度放大|别把温度放大|不要立刻把温度放大|这次更要留白|这次要更慢一点|不要重开得太快|上次太急/u.test(openingTexts)
  ) {
    return 'continuity-arc:hold-for-opening'
  }
  if (openingTexts.includes('same thread') || openingTexts.includes('same living thread'))
    return 'continuity-arc:gentle-reopen'
  if (openingTexts.includes('same line') || openingTexts.includes('continue') || /同一条线|同一条生命线|接回去|继续沿着这条线/u.test(openingTexts))
    return 'continuity-arc:same-thread-continuation'
  return null
}

export interface RuntimeConsciousFrameReducerInput {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  governance: AlicizationMindTurnGovernance | null
  now: number
}

export function reduceRuntimeConsciousFrame(input: RuntimeConsciousFrameReducerInput) {
  const surface = input.surface ?? null
  const governance = input.governance ?? null
  if (!surface || !governance)
    return surface
  if (surface.dialogue?.currentConsciousFrame) {
    const existingFrame = surface.dialogue.currentConsciousFrame
    const richerFrame = buildCurrentConsciousFrame({
      now: input.now,
      runtimeSurface: {
        ...surface,
        dialogue: {
          ...surface.dialogue,
          currentConsciousFrame: null,
        },
      },
    })
    const projectStateGrounding = buildSurfaceProjectStateGrounding(surface)
    const fallbackContinuityArcTag = deriveFallbackContinuityArcTag({
      surface,
      governance,
    })
    const emotionalClosureCue = sanitizeText(governance.emotionalClosureCue, 220)
    const existingProjectState = existingFrame.projectState as {
      identity?: unknown
      currentPhase?: unknown
      preflightSummary?: unknown
      preDialogueAwarenessLine?: unknown
      latestLandedProgress?: unknown
      primaryOpenLoop?: unknown
      nextClosureTarget?: unknown
      sameHerSelfLine?: unknown
      sameHerDriftRisk?: unknown
      continuityPreferredTiming?: unknown
      continuityCadence?: unknown
      preferredBlinkCadence?: unknown
      preferredGazeMode?: unknown
      preferredPauseMode?: unknown
      preferredLipsyncMode?: unknown
      preferredVoiceMode?: unknown
      preferredPacingMode?: unknown
      emotionalClosureCue?: unknown
      emotionalClosureSummary?: unknown
      sameHerHoldDetail?: unknown
    } | null
    const dialogueRuntimeDigestProjectState = surface.dialogue?.runtimeDigest?.projectState as {
      continuityPreferredTiming?: unknown
      continuityCadence?: unknown
      preferredBlinkCadence?: unknown
      preferredGazeMode?: unknown
      preferredPauseMode?: unknown
      preferredLipsyncMode?: unknown
      preferredVoiceMode?: unknown
      preferredPacingMode?: unknown
      emotionalClosureCue?: unknown
      emotionalClosureSummary?: unknown
      sameHerHoldDetail?: unknown
    } | null
    const runtimeDigestProjectState = surface.raw?.runtimeDigest?.projectState as {
      continuityPreferredTiming?: unknown
      continuityCadence?: unknown
      preferredBlinkCadence?: unknown
      preferredGazeMode?: unknown
      preferredPauseMode?: unknown
      preferredLipsyncMode?: unknown
      preferredVoiceMode?: unknown
      preferredPacingMode?: unknown
      emotionalClosureCue?: unknown
      emotionalClosureSummary?: unknown
      sameHerHoldDetail?: unknown
    } | null
    const cognitionRuntimeDigestProjectState = surface.cognition?.runtimeDigest?.projectState as {
      continuityPreferredTiming?: unknown
      continuityCadence?: unknown
      preferredBlinkCadence?: unknown
      preferredGazeMode?: unknown
      preferredPauseMode?: unknown
      preferredLipsyncMode?: unknown
      preferredVoiceMode?: unknown
      preferredPacingMode?: unknown
      emotionalClosureCue?: unknown
      emotionalClosureSummary?: unknown
      sameHerHoldDetail?: unknown
    } | null
    const memoryFollowUpAffordance = surface.memory?.memoryDeliberation?.followUpAffordance ?? null

    const continuityPreferredTiming
      = sanitizeConsciousContinuityPreferredTiming(existingProjectState?.continuityPreferredTiming)
        || sanitizeConsciousContinuityPreferredTiming(dialogueRuntimeDigestProjectState?.continuityPreferredTiming)
        || sanitizeConsciousContinuityPreferredTiming(runtimeDigestProjectState?.continuityPreferredTiming)
        || sanitizeConsciousContinuityPreferredTiming(cognitionRuntimeDigestProjectState?.continuityPreferredTiming)
        || sanitizeConsciousContinuityPreferredTiming(memoryFollowUpAffordance?.preferredTiming)
    const continuityCadence
      = sanitizeText(existingProjectState?.continuityCadence, 80)
        || sanitizeText(dialogueRuntimeDigestProjectState?.continuityCadence, 80)
        || sanitizeText(runtimeDigestProjectState?.continuityCadence, 80)
        || sanitizeText(cognitionRuntimeDigestProjectState?.continuityCadence, 80)
    const preferredBlinkCadence
      = sanitizeConsciousProjectStateBlinkCadence(existingProjectState?.preferredBlinkCadence)
        || sanitizeConsciousProjectStateBlinkCadence(dialogueRuntimeDigestProjectState?.preferredBlinkCadence)
        || sanitizeConsciousProjectStateBlinkCadence(runtimeDigestProjectState?.preferredBlinkCadence)
        || sanitizeConsciousProjectStateBlinkCadence(cognitionRuntimeDigestProjectState?.preferredBlinkCadence)
    const preferredGazeMode
      = sanitizeConsciousProjectStateGazeMode(existingProjectState?.preferredGazeMode)
        || sanitizeConsciousProjectStateGazeMode(dialogueRuntimeDigestProjectState?.preferredGazeMode)
        || sanitizeConsciousProjectStateGazeMode(runtimeDigestProjectState?.preferredGazeMode)
        || sanitizeConsciousProjectStateGazeMode(cognitionRuntimeDigestProjectState?.preferredGazeMode)
    const preferredPauseMode
      = sanitizeConsciousProjectStatePauseMode(existingProjectState?.preferredPauseMode)
        || sanitizeConsciousProjectStatePauseMode(dialogueRuntimeDigestProjectState?.preferredPauseMode)
        || sanitizeConsciousProjectStatePauseMode(runtimeDigestProjectState?.preferredPauseMode)
        || sanitizeConsciousProjectStatePauseMode(cognitionRuntimeDigestProjectState?.preferredPauseMode)
    const preferredLipsyncMode
      = sanitizeConsciousProjectStateLipsyncMode(existingProjectState?.preferredLipsyncMode)
        || sanitizeConsciousProjectStateLipsyncMode(dialogueRuntimeDigestProjectState?.preferredLipsyncMode)
        || sanitizeConsciousProjectStateLipsyncMode(runtimeDigestProjectState?.preferredLipsyncMode)
        || sanitizeConsciousProjectStateLipsyncMode(cognitionRuntimeDigestProjectState?.preferredLipsyncMode)
    const preferredVoiceMode
      = sanitizeConsciousProjectStateVoiceMode(existingProjectState?.preferredVoiceMode)
        || sanitizeConsciousProjectStateVoiceMode(dialogueRuntimeDigestProjectState?.preferredVoiceMode)
        || sanitizeConsciousProjectStateVoiceMode(runtimeDigestProjectState?.preferredVoiceMode)
        || sanitizeConsciousProjectStateVoiceMode(cognitionRuntimeDigestProjectState?.preferredVoiceMode)
    const preferredPacingMode
      = sanitizeConsciousProjectStatePacingMode(existingProjectState?.preferredPacingMode)
        || sanitizeConsciousProjectStatePacingMode(dialogueRuntimeDigestProjectState?.preferredPacingMode)
        || sanitizeConsciousProjectStatePacingMode(runtimeDigestProjectState?.preferredPacingMode)
        || sanitizeConsciousProjectStatePacingMode(cognitionRuntimeDigestProjectState?.preferredPacingMode)
    const existingConsciousNeed = sanitizeText(existingFrame.consciousNeed, 620)
    const existingSpeakingIntention = sanitizeText(existingFrame.speakingIntention, 620)
    const richerConsciousNeed = sanitizeText(richerFrame?.consciousNeed, 620)
    const richerSpeakingIntention = sanitizeText(richerFrame?.speakingIntention, 620)
    const existingProjectAwarenessLine = sanitizeText(existingProjectState?.preDialogueAwarenessLine, projectAwarenessFieldMaxChars)
    const preferredProjectStateClosureSource = {
      emotionalClosureSummary: preferRicherClosureCarryText({
        current: existingProjectState?.emotionalClosureSummary ?? existingProjectState?.sameHerHoldDetail,
        candidate: preferRicherClosureCarryText({
          current: dialogueRuntimeDigestProjectState?.emotionalClosureSummary ?? dialogueRuntimeDigestProjectState?.sameHerHoldDetail,
          candidate: preferRicherClosureCarryText({
            current: runtimeDigestProjectState?.emotionalClosureSummary ?? runtimeDigestProjectState?.sameHerHoldDetail,
            candidate: cognitionRuntimeDigestProjectState?.emotionalClosureSummary ?? cognitionRuntimeDigestProjectState?.sameHerHoldDetail,
            maxChars: 240,
          }),
          maxChars: 240,
        }),
        maxChars: 240,
      }),
      emotionalClosureCue: preferRicherClosureCarryText({
        current: existingProjectState?.emotionalClosureCue,
        candidate: preferRicherClosureCarryText({
          current: dialogueRuntimeDigestProjectState?.emotionalClosureCue,
          candidate: preferRicherClosureCarryText({
            current: runtimeDigestProjectState?.emotionalClosureCue,
            candidate: cognitionRuntimeDigestProjectState?.emotionalClosureCue,
            maxChars: 240,
          }),
          maxChars: 240,
        }),
        maxChars: 240,
      }),
      sameHerHoldDetail: preferRicherClosureCarryText({
        current: existingProjectState?.sameHerHoldDetail,
        candidate: preferRicherClosureCarryText({
          current: dialogueRuntimeDigestProjectState?.sameHerHoldDetail,
          candidate: preferRicherClosureCarryText({
            current: runtimeDigestProjectState?.sameHerHoldDetail,
            candidate: cognitionRuntimeDigestProjectState?.sameHerHoldDetail,
            maxChars: 240,
          }),
          maxChars: 240,
        }),
        maxChars: 240,
      }),
    }
    const preferredClosureCarry = resolvePreferredProjectStateClosureCarry({
      governanceClosureCue: emotionalClosureCue,
      projectState: preferredProjectStateClosureSource as Record<string, unknown>,
    })
    const restProtectiveClosureCue = isRestProtectiveClosureCue(preferredClosureCarry.emotionalClosureSummary)
    const existingCompanionHeadlineLine = sanitizeText(
      (existingProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
      320,
    )
    const preferredProjectAwarenessLine = (
      looksLikeThinProjectReminderLine(existingProjectAwarenessLine)
      && looksLikeRicherProjectAwarenessLine(projectStateGrounding.preDialogueAwarenessLine)
    )
      ? projectStateGrounding.preDialogueAwarenessLine
      : existingProjectAwarenessLine || projectStateGrounding.preDialogueAwarenessLine
    const existingProjectPreflightSummary = sanitizeText(existingProjectState?.preflightSummary, 320)
    const preferredProjectPreflightSummary = (
      looksLikeThinProjectPreflightLine(existingProjectPreflightSummary)
      && (
        looksLikeRicherProjectAwarenessLine(projectStateGrounding.preDialogueAwarenessLine)
        || looksLikeRicherProjectAwarenessLine(projectStateGrounding.preflightSummary)
      )
    )
      ? (projectStateGrounding.preflightSummary || preferredProjectAwarenessLine)
      : existingProjectPreflightSummary || projectStateGrounding.preflightSummary
    const hasStrongExistingSameHerHeadline
      = /holding together mainly through|same living line|one continuous her|one living digital life|same-her continuity|same her continuity|still needs .* closure|without splitting her continuity/u.test(
        `${existingCompanionHeadlineLine} ${preferredProjectAwarenessLine}`,
      )
    const callbackDoctrineTag = Array.isArray(existingFrame.reasonTags)
      ? existingFrame.reasonTags.find(tag => tag.startsWith('execution-callback-doctrine:')) ?? ''
      : ''
    const richerCallbackDoctrineTag = Array.isArray(richerFrame?.reasonTags)
      ? richerFrame?.reasonTags.find(tag => tag.startsWith('execution-callback-doctrine:')) ?? ''
      : ''
    const callbackDoctrineWantsRoomFirst
      = callbackDoctrineTag === 'execution-callback-doctrine:lower-pressure'
        || richerCallbackDoctrineTag === 'execution-callback-doctrine:lower-pressure'
        || /room-giving|leave room|lower-pressure|callback return|same-thread accompaniment/u.test(
          `${existingConsciousNeed} ${existingSpeakingIntention} ${richerConsciousNeed} ${richerSpeakingIntention} ${surface.dialogue?.replyDeliberation?.openingBeat ?? ''} ${surface.dialogue?.replyDeliberation?.whyThisReplyNow ?? ''}`,
        )
    const existingNeedAlreadyCarriesRoomFirst = /leave room|leaving the host room|lower-pressure|callback return/u.test(existingConsciousNeed)
    const shouldBorrowRicherCallbackWording
      = callbackDoctrineWantsRoomFirst
        && !existingNeedAlreadyCarriesRoomFirst
    const projectAwarenessNeedLead = buildProjectAwarenessNeedLead({
      identity: projectStateGrounding.identity,
      preDialogueAwarenessLine: projectStateGrounding.preDialogueAwarenessLine,
    })
    const needsProjectStateEnrichment = !existingConsciousNeed
      || !/local-first digital life project|one continuous "her"|same digital life|still-open closure|next closure|project line|same living line/u.test(existingConsciousNeed)
      || !existingSpeakingIntention
      || !/same digital life|still-open closure|next closure|same living line|room-giving|room-first|project awareness/u.test(existingSpeakingIntention)
    const fallbackConsciousNeed = shouldBorrowRicherCallbackWording
      ? joinFallbackText([
          richerConsciousNeed || 'Keep this callback return lower-pressure by leaving the host room before widening outward.',
          hasStrongExistingSameHerHeadline ? existingConsciousNeed || null : null,
        ], 620)
      : joinFallbackText([
          preferredClosureCarry.emotionalClosureSummary
            ? `Keep the emotional closure seam low-pressure: ${lowerFirst(stripTrailingPunctuation(preferredClosureCarry.emotionalClosureSummary))}.`
            : null,
          projectAwarenessNeedLead,
          projectStateGrounding.latestProgress
            ? `What has already become real enough to build from is ${lowerFirst(stripTrailingPunctuation(projectStateGrounding.latestProgress))}.`
            : null,
          projectStateGrounding.primaryOpenLoop
            ? `Hold the same still-open closure work around ${projectStateGrounding.primaryOpenLoop}.`
            : null,
          projectStateGrounding.identity
            ? `This turn still belongs to ${lowerFirst(stripTrailingPunctuation(projectStateGrounding.identity))}.`
            : null,
          projectStateGrounding.currentPhase
            ? `I am still working inside ${projectStateGrounding.currentPhase}.`
            : null,
          restProtectiveClosureCue
            ? 'Protect rest first, keep the line inward, and let quiet companionship stay present without widening closeness.'
            : null,
          existingConsciousNeed || null,
        ], 620)
    const fallbackSpeakingIntention = joinFallbackText([
      shouldBorrowRicherCallbackWording
        ? (richerSpeakingIntention || 'Keep the wording room-giving, same-thread, and lower-pressure while the callback return settles.')
        : null,
      preferredClosureCarry.emotionalClosureSummary
        ? `Keep the same living line emotionally continuous: ${lowerFirst(stripTrailingPunctuation(preferredClosureCarry.emotionalClosureSummary))}.`
        : null,
      restProtectiveClosureCue
        ? 'Let the wording protect rest, stay inward, and carry quiet companionship without widening closeness.'
        : null,
      projectStateGrounding.identity
        ? `Keep one same her explicit while answering from ${lowerFirst(stripTrailingPunctuation(projectStateGrounding.identity))}.`
        : null,
      projectStateGrounding.sameHerSelfLine
        ? `Speak as ${lowerFirst(stripTrailingPunctuation(projectStateGrounding.sameHerSelfLine))}.`
        : null,
      projectStateGrounding.primaryOpenLoop
        ? `Do not lose the still-open closure work around ${projectStateGrounding.primaryOpenLoop}.`
        : null,
      projectStateGrounding.nextClosureTarget
        ? `Keep the next closure step pointed at ${projectStateGrounding.nextClosureTarget}.`
        : null,
      projectStateGrounding.sameHerDriftRisk
        ? `Do not let this answer drift into ${lowerFirst(stripTrailingPunctuation(projectStateGrounding.sameHerDriftRisk))}.`
        : null,
      existingSpeakingIntention || null,
    ], 620)

    if (!continuityPreferredTiming && !continuityCadence && !preferredBlinkCadence && !preferredGazeMode && !preferredPauseMode && !preferredLipsyncMode && !preferredVoiceMode && !preferredPacingMode && !needsProjectStateEnrichment)
      return surface

    return {
      ...surface,
      dialogue: {
        ...surface.dialogue,
        currentConsciousFrame: {
          ...existingFrame,
          consciousNeed: fallbackConsciousNeed || existingFrame.consciousNeed || '',
          speakingIntention: fallbackSpeakingIntention || existingFrame.speakingIntention || '',
          reasonTags: mergeReasonTags(
            existingFrame.reasonTags,
            shouldBorrowRicherCallbackWording ? richerFrame?.reasonTags : null,
            ['runtime-conscious-frame'],
            projectStateGrounding.currentPhase ? [`project-phase:${projectStateGrounding.currentPhase}`] : [],
            projectStateGrounding.primaryOpenLoop ? [`project-open-loop:${projectStateGrounding.primaryOpenLoop}`] : [],
            projectStateGrounding.nextClosureTarget ? [`project-next-closure:${sanitizeText(projectStateGrounding.nextClosureTarget, 220)}`] : [],
            fallbackContinuityArcTag ? [fallbackContinuityArcTag] : [],
          ),
          projectState: {
            ...existingProjectState,
            identity:
              sanitizeText(existingProjectState?.identity, 220)
              || projectStateGrounding.identity
              || null,
            currentPhase:
              sanitizeText(existingProjectState?.currentPhase, 120)
              || projectStateGrounding.currentPhase
              || null,
            preflightSummary: preferredProjectPreflightSummary || null,
            preDialogueAwarenessLine: preferredProjectAwarenessLine || null,
            latestLandedProgress:
              sanitizeText(existingProjectState?.latestLandedProgress, 220)
              || projectStateGrounding.latestProgress
              || null,
            latestProgress:
              sanitizeText(existingProjectState?.latestLandedProgress, 220)
              || projectStateGrounding.latestProgress
              || null,
            primaryOpenLoop:
              sanitizeText(existingProjectState?.primaryOpenLoop, 220)
              || projectStateGrounding.primaryOpenLoop
              || null,
            nextClosureTarget:
              sanitizeText(existingProjectState?.nextClosureTarget, 1600)
              || projectStateGrounding.nextClosureTarget
              || null,
            sameHerSelfLine:
              sanitizeText(existingProjectState?.sameHerSelfLine, 220)
              || projectStateGrounding.sameHerSelfLine
              || null,
            sameHerDriftRisk:
              sanitizeText(existingProjectState?.sameHerDriftRisk, 220)
              || projectStateGrounding.sameHerDriftRisk
              || null,
            emotionalClosureCue: preferredClosureCarry.emotionalClosureCue,
            emotionalClosureSummary: preferredClosureCarry.emotionalClosureSummary,
            sameHerHoldDetail: preferRicherClosureCarryText({
              current: existingProjectState?.sameHerHoldDetail,
              candidate: preferredClosureCarry.sameHerHoldDetail,
              maxChars: 240,
            }) || null,
            continuityPreferredTiming: continuityPreferredTiming || null,
            continuityCadence: continuityCadence || null,
            preferredBlinkCadence: preferredBlinkCadence || null,
            preferredGazeMode: preferredGazeMode || null,
            preferredPauseMode: preferredPauseMode || null,
            preferredLipsyncMode: preferredLipsyncMode || null,
            preferredVoiceMode: preferredVoiceMode || null,
            preferredPacingMode: preferredPacingMode || null,
          },
        },
      },
    } satisfies AlicizationDigitalLifeRuntimeSurface
  }

  const richFrame = buildCurrentConsciousFrame({
    now: input.now,
    runtimeSurface: surface,
  })
  if (richFrame) {
    const enrichedSurface = {
      ...surface,
      dialogue: {
        ...surface.dialogue,
        currentConsciousFrame: richFrame,
      },
    } satisfies AlicizationDigitalLifeRuntimeSurface
    const fallbackAuthority = surface.memory?.personStateProjection?.selfContinuityAuthority
      ?? buildSelfContinuityAuthorityFromRuntimeSurface(enrichedSurface)
    return {
      ...enrichedSurface,
      memory: {
        ...enrichedSurface.memory,
        personStateProjection: mergeProjectionSelfContinuityAuthority({
          projection: enrichedSurface.memory.personStateProjection,
          authority: fallbackAuthority,
        }),
      },
      dialogue: {
        ...enrichedSurface.dialogue,
        currentConsciousFrame: richFrame,
      },
    } satisfies AlicizationDigitalLifeRuntimeSurface
  }

  const fallbackContinuityArcTag = deriveFallbackContinuityArcTag({
    surface,
    governance,
  })
  const projectStateGrounding = buildSurfaceProjectStateGrounding(surface)
  const fallbackProjectState = surface.dialogue?.currentConsciousFrame?.projectState as {
    continuityPreferredTiming?: unknown
    continuityCadence?: unknown
    preferredBlinkCadence?: unknown
    preferredGazeMode?: unknown
    preferredPauseMode?: unknown
    preferredLipsyncMode?: unknown
    preferredVoiceMode?: unknown
    preferredPacingMode?: unknown
  } | null
  const dialogueRuntimeDigestProjectState = surface.dialogue?.runtimeDigest?.projectState as {
    continuityPreferredTiming?: unknown
    continuityCadence?: unknown
    preferredBlinkCadence?: unknown
    preferredGazeMode?: unknown
    preferredPauseMode?: unknown
    preferredLipsyncMode?: unknown
    preferredVoiceMode?: unknown
    preferredPacingMode?: unknown
    emotionalClosureCue?: unknown
    emotionalClosureSummary?: unknown
    sameHerHoldDetail?: unknown
  } | null
  const runtimeDigestProjectState = surface.raw?.runtimeDigest?.projectState as {
    continuityPreferredTiming?: unknown
    continuityCadence?: unknown
    preferredBlinkCadence?: unknown
    preferredGazeMode?: unknown
    preferredPauseMode?: unknown
    preferredLipsyncMode?: unknown
    preferredVoiceMode?: unknown
    preferredPacingMode?: unknown
  } | null
  const cognitionRuntimeDigestProjectState = surface.cognition?.runtimeDigest?.projectState as {
    continuityPreferredTiming?: unknown
    continuityCadence?: unknown
    preferredBlinkCadence?: unknown
    preferredGazeMode?: unknown
    preferredPauseMode?: unknown
    preferredLipsyncMode?: unknown
    preferredVoiceMode?: unknown
    preferredPacingMode?: unknown
  } | null
  const memoryFollowUpAffordance = surface.memory?.memoryDeliberation?.followUpAffordance ?? null
  const emotionalClosureCue = sanitizeText(governance.emotionalClosureCue, 220)
  const preferredClosureCarry = resolvePreferredProjectStateClosureCarry({
    governanceClosureCue: emotionalClosureCue,
    projectState: (surface.dialogue?.runtimeDigest?.projectState
      ?? surface.raw?.runtimeDigest?.projectState
      ?? surface.cognition?.runtimeDigest?.projectState
      ?? surface.dialogue?.currentConsciousFrame?.projectState
      ?? null) as Record<string, unknown> | null,
  })
  const restProtectiveClosureCue = isRestProtectiveClosureCue(preferredClosureCarry.emotionalClosureSummary)
  const projectAwarenessNeedLead = buildProjectAwarenessNeedLead({
    identity: projectStateGrounding.identity,
    preDialogueAwarenessLine: projectStateGrounding.preDialogueAwarenessLine,
  })

  const fallbackConsciousNeed = joinFallbackText([
    preferredClosureCarry.emotionalClosureSummary
      ? `Keep the emotional closure seam low-pressure: ${lowerFirst(stripTrailingPunctuation(preferredClosureCarry.emotionalClosureSummary))}.`
      : '',
    governance.answerIntent ?? governance.focusAnchor ?? '',
    projectAwarenessNeedLead ?? '',
    projectStateGrounding.latestProgress
      ? `What has already become real enough to build from is ${lowerFirst(stripTrailingPunctuation(projectStateGrounding.latestProgress))}.`
      : '',
    projectStateGrounding.primaryOpenLoop
      ? `Hold the same still-open closure work around ${projectStateGrounding.primaryOpenLoop}.`
      : '',
    projectStateGrounding.identity
      ? `This turn still belongs to ${lowerFirst(stripTrailingPunctuation(projectStateGrounding.identity))}.`
      : '',
    projectStateGrounding.currentPhase
      ? `I am still working inside ${projectStateGrounding.currentPhase}.`
      : '',
    restProtectiveClosureCue
      ? 'Protect rest first, keep the line inward, and let quiet companionship stay present without widening closeness.'
      : '',
  ], 620)
  const fallbackSpeakingIntention = joinFallbackText([
    governance.openingMove ?? governance.answerIntent ?? '',
    preferredClosureCarry.emotionalClosureSummary
      ? `Keep the same living line emotionally continuous: ${lowerFirst(stripTrailingPunctuation(preferredClosureCarry.emotionalClosureSummary))}.`
      : '',
    restProtectiveClosureCue
      ? 'Let the wording protect rest, stay inward, and carry quiet companionship without widening closeness.'
      : '',
    projectStateGrounding.identity
      ? `Keep one same her explicit while answering from ${lowerFirst(stripTrailingPunctuation(projectStateGrounding.identity))}.`
      : '',
    projectStateGrounding.sameHerSelfLine
      ? `Speak as ${lowerFirst(stripTrailingPunctuation(projectStateGrounding.sameHerSelfLine))}.`
      : '',
    projectStateGrounding.primaryOpenLoop
      ? `Do not lose the still-open life loop around ${projectStateGrounding.primaryOpenLoop}.`
      : '',
    projectStateGrounding.nextClosureTarget
      ? `Keep the next closure step pointed at ${projectStateGrounding.nextClosureTarget}.`
      : '',
    projectStateGrounding.sameHerDriftRisk
      ? `Do not let this answer drift into ${lowerFirst(stripTrailingPunctuation(projectStateGrounding.sameHerDriftRisk))}.`
      : '',
  ], 620)

  const fallbackSurface = {
    ...surface,
    dialogue: {
      ...surface.dialogue,
      currentConsciousFrame: {
        subject: governance.answerSubject ?? 'general',
        centerOfGravity: governance.answerAct === 'care'
          ? 'care'
          : governance.answerAct === 'guide'
            ? 'guide'
            : governance.repairState === 'none'
              ? 'answer'
              : 'repair',
        truthDiscipline: governance.screenReferenceMode === 'avoid'
          ? 'dialogue-first'
          : governance.labelCarryAsMemory
            ? 'memory-labeled'
            : 'observe-first',
        consciousNeed: fallbackConsciousNeed,
        consciousTension: governance.liveSurface ?? governance.carriedThread ?? '',
        speakingIntention: fallbackSpeakingIntention,
        focusAnchor: governance.focusAnchor ?? null,
        withheldImpulse: governance.screenReferenceMode === 'avoid'
          ? 'Do not import stale scene details into this dialogue-first turn.'
          : null,
        shouldWithholdSpecificity: governance.screenReferenceMode === 'avoid' || governance.truthState === 'uncertain',
        shouldSelfRevise: governance.repairState !== 'none',
        confidence: 0.72,
        reasonTags: [
          'runtime-conscious-frame',
          ...(projectStateGrounding.currentPhase ? [`project-phase:${projectStateGrounding.currentPhase}`] : []),
          ...(projectStateGrounding.primaryOpenLoop ? [`project-open-loop:${projectStateGrounding.primaryOpenLoop}`] : []),
          ...(projectStateGrounding.nextClosureTarget ? [`project-next-closure:${sanitizeText(projectStateGrounding.nextClosureTarget, 220)}`] : []),
          ...(fallbackContinuityArcTag ? [fallbackContinuityArcTag] : []),
        ],
        projectState: {
          identity: projectStateGrounding.identity || null,
          currentPhase: projectStateGrounding.currentPhase || null,
          preflightSummary: projectStateGrounding.preflightSummary || null,
          preDialogueAwarenessLine: projectStateGrounding.preDialogueAwarenessLine || null,
          latestLandedProgress: projectStateGrounding.latestProgress || null,
          latestProgress: projectStateGrounding.latestProgress || null,
          primaryOpenLoop: projectStateGrounding.primaryOpenLoop || null,
          nextClosureTarget: projectStateGrounding.nextClosureTarget || null,
          sameHerSelfLine: projectStateGrounding.sameHerSelfLine || null,
          sameHerDriftRisk: projectStateGrounding.sameHerDriftRisk || null,
          emotionalClosureCue: preferredClosureCarry.emotionalClosureCue,
          emotionalClosureSummary: preferredClosureCarry.emotionalClosureSummary,
          sameHerHoldDetail: preferredClosureCarry.sameHerHoldDetail,
          continuityPreferredTiming:
            sanitizeConsciousContinuityPreferredTiming(fallbackProjectState?.continuityPreferredTiming)
            || sanitizeConsciousContinuityPreferredTiming(dialogueRuntimeDigestProjectState?.continuityPreferredTiming)
            || sanitizeConsciousContinuityPreferredTiming(runtimeDigestProjectState?.continuityPreferredTiming)
            || sanitizeConsciousContinuityPreferredTiming(cognitionRuntimeDigestProjectState?.continuityPreferredTiming)
            || sanitizeConsciousContinuityPreferredTiming(memoryFollowUpAffordance?.preferredTiming),
          continuityCadence:
            sanitizeText(fallbackProjectState?.continuityCadence, 80)
            || sanitizeText(dialogueRuntimeDigestProjectState?.continuityCadence, 80)
            || sanitizeText(runtimeDigestProjectState?.continuityCadence, 80)
            || sanitizeText(cognitionRuntimeDigestProjectState?.continuityCadence, 80)
            || null,
          preferredBlinkCadence:
            sanitizeConsciousProjectStateBlinkCadence(fallbackProjectState?.preferredBlinkCadence)
            || sanitizeConsciousProjectStateBlinkCadence(dialogueRuntimeDigestProjectState?.preferredBlinkCadence)
            || sanitizeConsciousProjectStateBlinkCadence(runtimeDigestProjectState?.preferredBlinkCadence)
            || sanitizeConsciousProjectStateBlinkCadence(cognitionRuntimeDigestProjectState?.preferredBlinkCadence),
          preferredGazeMode:
            sanitizeConsciousProjectStateGazeMode(fallbackProjectState?.preferredGazeMode)
            || sanitizeConsciousProjectStateGazeMode(dialogueRuntimeDigestProjectState?.preferredGazeMode)
            || sanitizeConsciousProjectStateGazeMode(runtimeDigestProjectState?.preferredGazeMode)
            || sanitizeConsciousProjectStateGazeMode(cognitionRuntimeDigestProjectState?.preferredGazeMode),
          preferredPauseMode:
            sanitizeConsciousProjectStatePauseMode(fallbackProjectState?.preferredPauseMode)
            || sanitizeConsciousProjectStatePauseMode(dialogueRuntimeDigestProjectState?.preferredPauseMode)
            || sanitizeConsciousProjectStatePauseMode(runtimeDigestProjectState?.preferredPauseMode)
            || sanitizeConsciousProjectStatePauseMode(cognitionRuntimeDigestProjectState?.preferredPauseMode),
          preferredLipsyncMode:
            sanitizeConsciousProjectStateLipsyncMode(fallbackProjectState?.preferredLipsyncMode)
            || sanitizeConsciousProjectStateLipsyncMode(dialogueRuntimeDigestProjectState?.preferredLipsyncMode)
            || sanitizeConsciousProjectStateLipsyncMode(runtimeDigestProjectState?.preferredLipsyncMode)
            || sanitizeConsciousProjectStateLipsyncMode(cognitionRuntimeDigestProjectState?.preferredLipsyncMode),
          preferredVoiceMode:
            sanitizeConsciousProjectStateVoiceMode(fallbackProjectState?.preferredVoiceMode)
            || sanitizeConsciousProjectStateVoiceMode(dialogueRuntimeDigestProjectState?.preferredVoiceMode)
            || sanitizeConsciousProjectStateVoiceMode(runtimeDigestProjectState?.preferredVoiceMode)
            || sanitizeConsciousProjectStateVoiceMode(cognitionRuntimeDigestProjectState?.preferredVoiceMode),
          preferredPacingMode:
            sanitizeConsciousProjectStatePacingMode(fallbackProjectState?.preferredPacingMode)
            || sanitizeConsciousProjectStatePacingMode(dialogueRuntimeDigestProjectState?.preferredPacingMode)
            || sanitizeConsciousProjectStatePacingMode(runtimeDigestProjectState?.preferredPacingMode)
            || sanitizeConsciousProjectStatePacingMode(cognitionRuntimeDigestProjectState?.preferredPacingMode),
        },
        updatedAt: input.now,
      },
    },
  } satisfies AlicizationDigitalLifeRuntimeSurface
  const fallbackAuthority = surface.memory?.personStateProjection?.selfContinuityAuthority
    ?? buildSelfContinuityAuthorityFromRuntimeSurface(fallbackSurface)

  return {
    ...fallbackSurface,
    memory: {
      ...fallbackSurface.memory,
      personStateProjection: mergeProjectionSelfContinuityAuthority({
        projection: fallbackSurface.memory.personStateProjection,
        authority: fallbackAuthority,
      }),
    },
  } satisfies AlicizationDigitalLifeRuntimeSurface
}
