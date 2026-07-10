import type {
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationMindTurnGovernance,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'

import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationProviderFacingText,
  sanitizeAlicizationStructuredInternalText,
} from '@proj-alicization/stage-shared'

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

function hasStructuredProjectStateEvidence(value: string | null | undefined) {
  const normalized = sanitizeText(value ?? '', projectAwarenessFieldMaxChars).toLowerCase()
  if (!normalized || containsAlicizationFixedTemplateResidue(normalized))
    return false

  return /(?:^|[\s|;])(?:identity|project_identity|phase|project_phase|visibility|landed|landed_progress|open|open_loop|next|next_closure|continuity_anchor|continuity_hold|continuity_drift_risk|project_state_continuity|life_loop_continuity|memory_dialogue_embodiment_closure|cross_modal_continuity_proof|embodiment_closure|callback_continuity|owner|evidence|evidence_id|evidence_ids|trace|trace_id|source|source_id|source_trace_id)=/u.test(normalized)
    || /(?:^|[\s|;])local_desktop_life_loop(?:[\s|;]|$)/u.test(normalized)
}

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
  const emotionalClosureCue = sanitizeOptionalStructuredInternalCarryText(input.governanceClosureCue, 220) || null
  const emotionalClosureSummary = preferRicherClosureCarryText({
    current: projectState?.emotionalClosureSummary ?? projectState?.sameHerHoldDetail,
    candidate: input.governanceClosureCue ?? projectState?.emotionalClosureCue,
    maxChars: 240,
  }) || emotionalClosureCue
  const sameHerHoldDetail = sanitizeOptionalStructuredInternalCarryText(projectState?.sameHerHoldDetail, 220) || null

  return {
    emotionalClosureCue,
    emotionalClosureSummary: sanitizeOptionalStructuredInternalCarryText(emotionalClosureSummary, 240) || null,
    sameHerHoldDetail,
  }
}

function looksLikeStructuredProjectAwarenessLine(value: string | null | undefined) {
  const normalized = sanitizeText(value ?? '', projectAwarenessFieldMaxChars).toLowerCase()
  if (!normalized)
    return false
  return hasStructuredProjectStateEvidence(normalized)
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
  const identity = sanitizeOptionalProviderCarryText(input.identity, 220) ?? ''
  const awarenessLine = sanitizeOptionalProviderCarryText(input.preDialogueAwarenessLine, 240) ?? ''
  const awarenessLooksDense = hasStructuredProjectStateEvidence(awarenessLine)

  if (identity && awarenessLooksDense)
    return `project_context=identity:${stripTrailingPunctuation(identity)}; awareness=structured`
  if (awarenessLine)
    return `project_context=awareness:${stripTrailingPunctuation(awarenessLine)}`
  if (identity)
    return `project_context=identity:${stripTrailingPunctuation(identity)}`
  return null
}

function formatProviderClosureSource(raw: unknown) {
  const text = sanitizeText(raw, 260)
  const lowered = text.toLowerCase()
  const tags: string[] = []

  if (/repair-before-closeness|repair before closeness|repair-first/u.test(lowered))
    tags.push('repair_before_closeness')
  if (/rest-protective|rest protective/u.test(lowered))
    tags.push('rest_protective')
  if (/quiet[- ]companionship|quiet companionship/u.test(lowered))
    tags.push('quiet_companionship')
  if (/measured-return|lower-pressure|low-pressure|leave more room/u.test(lowered))
    tags.push('low_pressure_return')

  const sanitized = sanitizeAlicizationProviderFacingText(stripTrailingPunctuation(text), 220)
  if (sanitized && sanitized !== alicizationFixedTemplateReplacement)
    tags.push(`summary:${sanitized}`)

  return tags.length > 0 ? Array.from(new Set(tags)).join(',') : 'unspecified'
}

function sanitizeOptionalProviderCarryText(raw: unknown, maxChars = 320) {
  const sanitized = sanitizeAlicizationProviderFacingText(raw, maxChars)
  return sanitized && sanitized !== alicizationFixedTemplateReplacement ? sanitized : null
}

function sanitizeOptionalStructuredInternalCarryText(raw: unknown, maxChars = 320) {
  const sanitized = sanitizeAlicizationStructuredInternalText(raw, maxChars)
  return sanitized && sanitized !== alicizationFixedTemplateReplacement ? sanitized : null
}

function normalizeProviderProjectIdentity(raw: unknown) {
  const normalized = sanitizeText(raw, 220)
  if (!normalized)
    return null
  if (containsAlicizationFixedTemplateResidue(normalized))
    return null
  if (/^(?:identity\s*=\s*)?local_desktop_life_loop$/iu.test(normalized))
    return 'runtime_personhood'
  return sanitizeOptionalProviderCarryText(normalized, 220)
}

function normalizeProviderContinuityAnchor(raw: unknown) {
  const normalized = sanitizeText(raw, 240)
  if (!normalized)
    return null
  if (containsAlicizationFixedTemplateResidue(normalized))
    return null
  if (/^(?:continuity_anchor\s*=\s*)?local_desktop_life_loop(?:\s*;\s*owner\s*=\s*[\w-]+)?$/iu.test(normalized)) {
    return 'runtime_personhood; owner=project_state_governance'
  }
  return sanitizeOptionalProviderCarryText(normalized, 240)
}

function buildFallbackProjectStateGrounding() {
  const projectState = resolveAlicizationProjectStateBrief()
  const canonicalProjectState = resolveCanonicalStructuredProjectState({
    normalizedProjectState: {
      identity: 'runtime_personhood',
      currentPhase: projectState.currentPhase,
      latestLandedProgress:
        projectState.continuityProgressSummary
        ?? projectState.memoryAnthropomorphismProgress[projectState.memoryAnthropomorphismProgress.length - 1]
        ?? '',
      primaryOpenLoop: projectState.openLoops[0] ?? '',
      nextClosureTarget: projectState.nextClosureTarget,
      sameHerSelfLine: '',
      sameHerDriftRisk: '',
    },
    runtimePreflightSummary: projectState.preflightSummary ?? null,
    runtimePreDialogueAwarenessLine: projectState.preDialogueAwarenessLine ?? null,
  })
  return {
    identity: normalizeProviderProjectIdentity(canonicalProjectState.identity) ?? 'runtime_personhood',
    currentPhase: sanitizeOptionalProviderCarryText(canonicalProjectState.currentPhase, 120) ?? 'life_core',
    preflightSummary: sanitizeOptionalProviderCarryText(canonicalProjectState.preflightSummary ?? '', 320) ?? null,
    preDialogueAwarenessLine: sanitizeOptionalProviderCarryText(canonicalProjectState.preDialogueAwarenessLine ?? '', projectAwarenessFieldMaxChars) ?? null,
    latestProgress: sanitizeOptionalProviderCarryText(canonicalProjectState.latestLandedProgress ?? '', 220) ?? null,
    primaryOpenLoop: sanitizeOptionalProviderCarryText(canonicalProjectState.primaryOpenLoop ?? '', 180) ?? null,
    nextClosureTarget: sanitizeOptionalProviderCarryText(canonicalProjectState.nextClosureTarget, 1600) ?? null,
    sameHerSelfLine: null,
    sameHerDriftRisk: sanitizeOptionalProviderCarryText(canonicalProjectState.sameHerDriftRisk, 220) ?? null,
  }
}

function looksLikeRicherProjectAwarenessLine(value: string | null | undefined) {
  const normalized = sanitizeText(value ?? '', projectAwarenessFieldMaxChars).toLowerCase()
  if (!normalized)
    return false
  return looksLikeStructuredProjectAwarenessLine(normalized)
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
    identity: normalizeProviderProjectIdentity(normalizedSurfaceProjectState.identity) ?? canonicalGrounding.identity,
    currentPhase: sanitizeOptionalProviderCarryText(normalizedSurfaceProjectState.currentPhase || canonicalGrounding.currentPhase, 120) ?? canonicalGrounding.currentPhase,
    preflightSummary: sanitizeOptionalProviderCarryText(normalizedSurfaceProjectState.preflightSummary || canonicalGrounding.preflightSummary, 320),
    preDialogueAwarenessLine: sanitizeOptionalProviderCarryText(
      shouldPreferProjectAwarenessSummary({
        line: normalizedSurfaceProjectState.preDialogueAwarenessLine,
        summary: normalizedSurfaceProjectState.preDialogueAwarenessSummary,
      })
        ? normalizedSurfaceProjectState.preDialogueAwarenessSummary
        : (normalizedSurfaceProjectState.preDialogueAwarenessLine || canonicalGrounding.preDialogueAwarenessLine),
      projectAwarenessFieldMaxChars,
    ),
    latestProgress: sanitizeOptionalProviderCarryText(
      normalizedSurfaceProjectState.latestLandedProgress
      || normalizedSurfaceProjectState.latestProgress
      || canonicalGrounding.latestProgress,
      220,
    ),
    primaryOpenLoop: sanitizeOptionalProviderCarryText(normalizedSurfaceProjectState.primaryOpenLoop || canonicalGrounding.primaryOpenLoop, 180),
    nextClosureTarget: sanitizeOptionalProviderCarryText(normalizedSurfaceProjectState.nextClosureTarget || canonicalGrounding.nextClosureTarget, 1600),
    sameHerSelfLine: normalizeProviderContinuityAnchor(normalizedSurfaceProjectState.sameHerSelfLine) ?? canonicalGrounding.sameHerSelfLine,
    sameHerDriftRisk: sanitizeOptionalProviderCarryText(normalizedSurfaceProjectState.sameHerDriftRisk || canonicalGrounding.sameHerDriftRisk, 220),
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
    const existingProjectAwarenessLine = sanitizeOptionalProviderCarryText(
      existingProjectState?.preDialogueAwarenessLine,
      projectAwarenessFieldMaxChars,
    ) ?? ''
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
    const existingProjectPreflightSummary = sanitizeOptionalProviderCarryText(existingProjectState?.preflightSummary, 320) ?? ''
    const preferredProjectPreflightSummary = (
      looksLikeThinProjectPreflightLine(existingProjectPreflightSummary)
    )
      ? (projectStateGrounding.preflightSummary || preferredProjectAwarenessLine)
      : existingProjectPreflightSummary || projectStateGrounding.preflightSummary || preferredProjectAwarenessLine
    const hasStructuredExistingProjectHeadline
      = hasStructuredProjectStateEvidence(`${existingCompanionHeadlineLine} ${preferredProjectAwarenessLine}`)
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
      || !hasStructuredProjectStateEvidence(existingConsciousNeed)
      || !existingSpeakingIntention
      || !hasStructuredProjectStateEvidence(existingSpeakingIntention)
    const fallbackConsciousNeed = shouldBorrowRicherCallbackWording
      ? joinFallbackText([
          sanitizeOptionalProviderCarryText(richerConsciousNeed, 420) || 'callback_return=lower_pressure; host_room=leave_before_widening',
          hasStructuredExistingProjectHeadline ? sanitizeOptionalProviderCarryText(existingConsciousNeed, 420) : null,
        ], 620)
      : joinFallbackText([
          preferredClosureCarry.emotionalClosureSummary
            ? `emotional_closure=low_pressure; source=${formatProviderClosureSource(preferredClosureCarry.emotionalClosureSummary)}`
            : null,
          projectAwarenessNeedLead,
          projectStateGrounding.latestProgress
            ? `landed_progress=${stripTrailingPunctuation(projectStateGrounding.latestProgress)}`
            : null,
          projectStateGrounding.primaryOpenLoop
            ? `open_loop=${stripTrailingPunctuation(projectStateGrounding.primaryOpenLoop)}`
            : null,
          projectStateGrounding.identity || projectStateGrounding.currentPhase
            ? 'project_state_owner=ProjectStateGovernance; visible_governance_entry=MemoryWorkbench; template_policy=no_fixed_persona_templates'
            : null,
          restProtectiveClosureCue
            ? 'rest_protection=first; companionship=quiet; closeness=widen_later'
            : null,
          sanitizeOptionalProviderCarryText(existingConsciousNeed, 420),
        ], 620)
    const fallbackSpeakingIntention = joinFallbackText([
      shouldBorrowRicherCallbackWording
        ? (sanitizeOptionalProviderCarryText(richerSpeakingIntention, 420) || 'wording=room_giving; continuity=current_thread; pressure=lower; callback_return=settling')
        : null,
      preferredClosureCarry.emotionalClosureSummary
        ? `emotional_closure=low_pressure; continuity=emotion_memory_initiative_embodiment; source=${formatProviderClosureSource(preferredClosureCarry.emotionalClosureSummary)}`
        : null,
      restProtectiveClosureCue
        ? 'rest_protection=first; wording=inward; companionship=quiet; closeness=widen_later'
        : null,
      projectStateGrounding.identity
        ? 'continuity_owner=ProjectStateGovernance; visible_governance_entry=MemoryWorkbench; template_policy=no_fixed_persona_templates'
        : null,
      projectStateGrounding.sameHerSelfLine
        ? `continuity_anchor=${sanitizeAlicizationProviderFacingText(stripTrailingPunctuation(projectStateGrounding.sameHerSelfLine), 220)}`
        : null,
      projectStateGrounding.primaryOpenLoop
        ? `open_loop=${stripTrailingPunctuation(projectStateGrounding.primaryOpenLoop)}`
        : null,
      projectStateGrounding.nextClosureTarget
        ? `next_closure=${stripTrailingPunctuation(projectStateGrounding.nextClosureTarget)}`
        : null,
      projectStateGrounding.sameHerDriftRisk
        ? `drift_risk=${stripTrailingPunctuation(projectStateGrounding.sameHerDriftRisk)}`
        : null,
      sanitizeOptionalProviderCarryText(existingSpeakingIntention, 420),
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
              normalizeProviderProjectIdentity(existingProjectState?.identity)
              || projectStateGrounding.identity
              || null,
            currentPhase:
              sanitizeOptionalProviderCarryText(existingProjectState?.currentPhase, 120)
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
              normalizeProviderContinuityAnchor(existingProjectState?.sameHerSelfLine)
              || projectStateGrounding.sameHerSelfLine
              || null,
            sameHerDriftRisk:
              sanitizeOptionalProviderCarryText(existingProjectState?.sameHerDriftRisk, 220)
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
      ? `emotional_closure=low_pressure; source=${formatProviderClosureSource(preferredClosureCarry.emotionalClosureSummary)}`
      : '',
    sanitizeOptionalProviderCarryText(governance.answerIntent, 220)
    ?? sanitizeOptionalProviderCarryText(governance.focusAnchor, 220)
    ?? '',
    projectAwarenessNeedLead ?? '',
    projectStateGrounding.latestProgress
      ? `landed_progress=${stripTrailingPunctuation(projectStateGrounding.latestProgress)}`
      : '',
    projectStateGrounding.primaryOpenLoop
      ? `open_loop=${stripTrailingPunctuation(projectStateGrounding.primaryOpenLoop)}`
      : '',
    projectStateGrounding.identity || projectStateGrounding.currentPhase
      ? 'project_state_owner=ProjectStateGovernance; visible_governance_entry=MemoryWorkbench; template_policy=no_fixed_persona_templates'
      : '',
    restProtectiveClosureCue
      ? 'rest_protection=first; companionship=quiet; closeness=widen_later'
      : '',
  ], 620)
  const fallbackSpeakingIntention = joinFallbackText([
    sanitizeOptionalProviderCarryText(governance.openingMove, 220)
    ?? sanitizeOptionalProviderCarryText(governance.answerIntent, 220)
    ?? '',
    preferredClosureCarry.emotionalClosureSummary
      ? `emotional_closure=low_pressure; continuity=emotion_memory_initiative_embodiment; source=${formatProviderClosureSource(preferredClosureCarry.emotionalClosureSummary)}`
      : '',
    restProtectiveClosureCue
      ? 'rest_protection=first; wording=inward; companionship=quiet; closeness=widen_later'
      : '',
    projectStateGrounding.identity
      ? 'continuity_owner=ProjectStateGovernance; visible_governance_entry=MemoryWorkbench; template_policy=no_fixed_persona_templates'
      : '',
    projectStateGrounding.sameHerSelfLine
      ? `continuity_anchor=${sanitizeAlicizationProviderFacingText(stripTrailingPunctuation(projectStateGrounding.sameHerSelfLine), 220)}`
      : '',
    projectStateGrounding.primaryOpenLoop
      ? `open_loop=${stripTrailingPunctuation(projectStateGrounding.primaryOpenLoop)}`
      : '',
    projectStateGrounding.nextClosureTarget
      ? `next_closure=${stripTrailingPunctuation(projectStateGrounding.nextClosureTarget)}`
      : '',
    projectStateGrounding.sameHerDriftRisk
      ? `drift_risk=${stripTrailingPunctuation(projectStateGrounding.sameHerDriftRisk)}`
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
