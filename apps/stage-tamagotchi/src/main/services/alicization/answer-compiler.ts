import type {
  AlicizationAnswerAct,
  AlicizationAnswerCompilerSnapshot,
  AlicizationAnswerEvidenceMode,
  AlicizationCompiledResponseMode,
  AlicizationConversationStateSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationRepairLedgerSnapshot,
  AlicizationSelfEvolutionKernelSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationWorldModelSnapshot,
  AlicizationWorldOntologySnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueGrowthProfile } from './dialogue-growth-profile'
import type { AlicizationPersonaKernelMode } from './dialogue-obligation'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationPersonalityContinuityStateSnapshot } from './personality-continuity-state'
import type { OrganicMemoryProjectStateContinuitySnapshot } from './runtime-soul'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'

import {
  buildAlicizationScreenSurfaceCue,
  readActiveContinuityGovernanceFromDerivedMindStateBundle,
  readHostPersonModelFromDerivedMindStateBundle,
  readKnowledgeEvidenceFromDerivedMindStateBundle,
  readLearningExecutionStateFromDerivedMindStateBundle,
  readMemoryDeliberationFromDerivedMindStateBundle,
  readPersonStateProjectionFromDerivedMindStateBundle,
  readRecollectionIntentFromDerivedMindStateBundle,
  readRecollectionSpeechPlanFromDerivedMindStateBundle,
} from '@proj-alicization/stage-shared'

import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import { isDialogueFirstSubject, sanitizeDialogueAnchorText, sanitizeDialogueSurfaceText } from './dialogue-surface-text'
import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'
import { buildMindEcologyFromRuntimeSurface } from './mind-ecology'
import { deriveMindTruthContract } from './mind-truth-contract'
import {
  hasContinuityRestraintRelationshipSignal,
  hasNeutralRelationshipSignal,
  mergePreferredSelfContinuityAuthority,
  resolvePreferredPersonStateProjection,
} from './person-state-projection-resolution'
import {

  buildAlicizationPersonalityContinuityState,
} from './personality-continuity-state'
import {
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateSnapshot,
} from './project-state-brief'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'

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

function stripTrailingPunctuation(text: string) {
  return text.replace(/[.。!！?？;；:：]+$/u, '').trim()
}

function lowerFirst(text: string) {
  if (!text)
    return ''
  return text.slice(0, 1).toLowerCase() + text.slice(1)
}

function sanitizeSurfaceClaim(raw: unknown, maxChars = 180) {
  return sanitizeDialogueSurfaceText(raw, maxChars)
}

function normalizeComparisonText(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
}

function extractComparisonTerms(raw: unknown) {
  const normalized = normalizeComparisonText(raw)
  if (!normalized)
    return []

  return [...new Set(
    (normalized.match(/[\p{Letter}\p{Number}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu) ?? [])
      .flatMap((segment) => {
        if ([...segment].length >= 2)
          return [segment]
        return []
      }),
  )]
}

function mirrorsHostMove(candidate: unknown, hostMove: unknown) {
  const normalizedCandidate = normalizeComparisonText(String(candidate ?? ''))
  const normalizedHostMove = normalizeComparisonText(String(hostMove ?? ''))
  if (!normalizedCandidate || !normalizedHostMove)
    return false

  if (normalizedCandidate === normalizedHostMove)
    return true

  const shorterLength = Math.max(1, Math.min(normalizedCandidate.length, normalizedHostMove.length))
  if (
    (normalizedCandidate.includes(normalizedHostMove) || normalizedHostMove.includes(normalizedCandidate))
    && shorterLength / Math.max(normalizedCandidate.length, normalizedHostMove.length) >= 0.68
  ) {
    return true
  }

  const hostTerms = extractComparisonTerms(normalizedHostMove)
  const candidateTerms = extractComparisonTerms(normalizedCandidate)
  if (hostTerms.length === 0 || candidateTerms.length === 0)
    return false

  const overlap = candidateTerms.filter(term => hostTerms.includes(term))
  return overlap.length / Math.max(1, Math.min(hostTerms.length, candidateTerms.length)) >= 0.72
}

function pickSurfaceClaim(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeSurfaceClaim(value)
    if (normalized)
      return normalized
  }
  return ''
}

function pickSurfaceClaimDistinctFrom(hostMove: unknown, ...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeSurfaceClaim(value)
    if (!normalized || mirrorsHostMove(normalized, hostMove))
      continue
    return normalized
  }
  return ''
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const rawValue = typeof value === 'string' ? value.trim() : ''
    const maxChars = rawValue.startsWith('pre-dialogue project awareness:') ? 960 : 220
    const normalized = sanitizeDialogueSurfaceText(value, maxChars) || sanitizeText(value, maxChars)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function pinPriorityConstraint(list: string[], constraint: string | null | undefined, maxItems = 8) {
  const normalized = typeof constraint === 'string' ? constraint.trim() : ''
  if (!normalized)
    return list

  const filtered = list.filter(existing => !normalized.startsWith(existing) && !existing.startsWith(normalized))
  return [normalized, ...filtered].slice(0, maxItems)
}

function preferProjectStateClosureCarryText(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = sanitizeDialogueSurfaceText(input.current, 320) || sanitizeText(input.current, 320) || null
  const candidate = sanitizeDialogueSurfaceText(input.candidate, 320) || sanitizeText(input.candidate, 320) || null

  if (!current)
    return candidate
  if (!candidate)
    return current
  if (current === candidate)
    return current

  const preferredClosureAuthority = preferStrongerContinuityClosureAuthority(current, candidate)
  if (preferredClosureAuthority)
    return preferredClosureAuthority

  if (candidate.startsWith(current) && candidate.length >= current.length + 24)
    return candidate
  if (current.startsWith(candidate) && current.length >= candidate.length + 24)
    return current

  return candidate.length > current.length ? candidate : current
}

function firstCommitmentLine(conversationState?: AlicizationConversationStateSnapshot | null) {
  const commitments = Array.isArray(conversationState?.activeCommitments)
    ? conversationState.activeCommitments
    : []
  return sanitizeDialogueSurfaceText(commitments[0], 180) || null
}

function hasProjectStateCarryDisciplineFocus(focusDimensions?: string[] | null) {
  const focus = Array.isArray(focusDimensions) ? focusDimensions : []
  return (
    focus.includes('projectStateRichAwarenessCarry')
    || focus.includes('projectStateLandedProgressCarry')
    || focus.includes('projectStateNextClosureCarry')
    || focus.includes('projectStateEmotionalClosureCarry')
  )
}

function hasProjectEmotionalClosureDisciplineFocus(focusDimensions?: string[] | null) {
  const focus = Array.isArray(focusDimensions) ? focusDimensions : []
  return (
    focus.includes('projectEmotionalClosureCarry')
    || focus.includes('projectEmotionalClosureRewriteCarry')
    || focus.includes('projectEmotionalClosureLowPressureCarry')
    || focus.includes('projectEmotionalClosureAntiRestartCarry')
  )
}

function isThinProjectAwarenessShell(value: unknown) {
  const normalized = sanitizeText(value, 320)
  const text = normalized.toLowerCase()
  if (!text)
    return false

  return isAlicizationThinProjectAwarenessLine(normalized)
    || /generic project shell|detached project shell/u.test(text)
}

function carriesFullProjectPhaseAwarenessLine(value: unknown) {
  const text = sanitizeText(value, 420).toLowerCase()
  if (!text)
    return false

  return text.includes('before answering, remember:')
    && (text.includes('phase 1') || text.includes('local-first digital life'))
    && (text.includes('still-open closure') || text.includes('still-open life loop'))
}

function carriesCallbackSpecificProjectAwarenessLine(value: unknown) {
  const text = sanitizeText(value, 420).toLowerCase()
  if (!text)
    return false

  return text.includes('callback')
    && (
      text.includes('same digital life')
      || text.includes('same living line')
      || text.includes('same her')
      || text.includes('same-her')
      || text.includes('one same her')
      || text.includes('one continuous her')
    )
    && (
      text.includes('phase 1')
      || text.includes('closure')
      || text.includes('unfinished')
    )
}

function buildProjectStateAwarenessSummary(projectStateAudit?: {
  preDialogueAwarenessSummary?: unknown
  landedProgressSummary?: unknown
  openClosureSummary?: unknown
  openFocusSummary?: unknown
  nextFocusSummary?: unknown
  nextClosureTarget?: unknown
  emotionalClosureSummary?: unknown
  sameHerHoldDetail?: unknown
  sameHerDriftRiskSummary?: unknown
  proactiveSameHerGapSummary?: unknown
} | null) {
  const preDialogueAwarenessSummary = sanitizeDialogueSurfaceText(projectStateAudit?.preDialogueAwarenessSummary, 220)
  const landedProgressSummary = sanitizeDialogueSurfaceText(projectStateAudit?.landedProgressSummary, 220)
  const openClosureSummary = sanitizeDialogueSurfaceText(projectStateAudit?.openClosureSummary, 220)
  const openFocusSummary = sanitizeDialogueSurfaceText(projectStateAudit?.openFocusSummary, 220)
  const nextFocusSummary = sanitizeDialogueSurfaceText(projectStateAudit?.nextFocusSummary, 220)
  const nextClosureTarget = sanitizeDialogueSurfaceText(projectStateAudit?.nextClosureTarget, 220)
  const emotionalClosureSummary = sanitizeDialogueSurfaceText(projectStateAudit?.emotionalClosureSummary, 220)
  const sameHerHoldDetail = sanitizeDialogueSurfaceText(projectStateAudit?.sameHerHoldDetail, 220)
  const sameHerDriftRiskSummary = sanitizeDialogueSurfaceText(projectStateAudit?.sameHerDriftRiskSummary, 220)
  const proactiveSameHerGapSummary = sanitizeDialogueSurfaceText(projectStateAudit?.proactiveSameHerGapSummary, 220)

  if (
    preDialogueAwarenessSummary
    && !isThinProjectAwarenessShell(preDialogueAwarenessSummary)
  ) {
    return {
      preDialogueAwarenessSummary,
      landedProgressSummary,
      openClosureSummary,
      openFocusSummary,
      nextFocusSummary,
      nextClosureTarget,
      emotionalClosureSummary,
      sameHerHoldDetail,
      sameHerDriftRiskSummary,
      proactiveSameHerGapSummary,
    }
  }

  const synthesizedSummary = sanitizeDialogueSurfaceText(
    uniqueList([
      landedProgressSummary,
      openClosureSummary,
      openFocusSummary,
      nextFocusSummary,
      nextClosureTarget,
      emotionalClosureSummary,
      sameHerHoldDetail,
      sameHerDriftRiskSummary,
      proactiveSameHerGapSummary,
      preDialogueAwarenessSummary,
    ], 6).join(' '),
    220,
  )

  return {
    preDialogueAwarenessSummary: synthesizedSummary || preDialogueAwarenessSummary || null,
    landedProgressSummary,
    openClosureSummary,
    openFocusSummary,
    nextFocusSummary,
    nextClosureTarget,
    emotionalClosureSummary,
    sameHerHoldDetail,
    sameHerDriftRiskSummary,
    proactiveSameHerGapSummary,
  }
}

function readRuntimeDigestProjectState(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
  return (runtimeSurface?.raw as {
    runtimeDigest?: {
      projectState?: Record<string, unknown> | null
    } | null
  } | null)?.runtimeDigest?.projectState ?? null
}

function readVisibleReplyProjectStateAudit(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
  return (runtimeSurface?.raw as {
    visibleReplyRealization?: {
      projectStateAudit?: {
        preDialogueAwarenessSummary?: unknown
        landedProgressSummary?: unknown
        openClosureSummary?: unknown
        openFocusSummary?: unknown
        nextFocusSummary?: unknown
        nextClosureTarget?: unknown
        emotionalClosureSummary?: unknown
        sameHerHoldDetail?: unknown
        sameHerDriftRiskSummary?: unknown
        proactiveSameHerGapSummary?: unknown
      } | null
    } | null
  } | null)?.visibleReplyRealization?.projectStateAudit ?? null
}

function resolveAnswerCompilerProjectStateContinuity(
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null,
): OrganicMemoryProjectStateContinuitySnapshot | null {
  if (!runtimeSurface)
    return null

  const currentProjectState = runtimeSurface.dialogue?.currentConsciousFrame?.projectState as Record<string, unknown> | null | undefined
  const runtimeDigestProjectState = readRuntimeDigestProjectState(runtimeSurface)
  const runtimeProjectStateAudit = buildProjectStateAwarenessSummary(readVisibleReplyProjectStateAudit(runtimeSurface))
  const hasExplicitRuntimeProjectStateSignal = [
    currentProjectState?.identity,
    currentProjectState?.currentPhase,
    currentProjectState?.preflightSummary,
    currentProjectState?.preDialogueAwarenessLine,
    currentProjectState?.awarenessLine,
    currentProjectState?.landedProgressSummary,
    currentProjectState?.latestLandedProgress,
    currentProjectState?.latestProgress,
    currentProjectState?.openClosureSummary,
    currentProjectState?.primaryOpenLoop,
    currentProjectState?.proactiveSameHerGap,
    currentProjectState?.nextClosureTarget,
    currentProjectState?.emotionalClosureCue,
    currentProjectState?.sameHerSummary,
    currentProjectState?.sameHerSelfLine,
    currentProjectState?.sameHerHoldDetail,
    currentProjectState?.sameHerDriftRisk,
    runtimeDigestProjectState?.identity,
    runtimeDigestProjectState?.currentPhase,
    runtimeDigestProjectState?.preflightSummary,
    runtimeDigestProjectState?.preDialogueAwarenessLine,
    runtimeDigestProjectState?.awarenessLine,
    runtimeDigestProjectState?.latestLandedProgress,
    runtimeDigestProjectState?.latestProgress,
    runtimeDigestProjectState?.landedProgressSummary,
    runtimeDigestProjectState?.primaryOpenLoop,
    runtimeDigestProjectState?.openClosureSummary,
    runtimeDigestProjectState?.proactiveSameHerGap,
    runtimeDigestProjectState?.proactiveSameHerGapSummary,
    runtimeDigestProjectState?.nextClosureTarget,
    runtimeDigestProjectState?.nextClosureTargetSummary,
    runtimeDigestProjectState?.emotionalClosureCue,
    runtimeDigestProjectState?.emotionalClosureSummary,
    runtimeDigestProjectState?.sameHerSummary,
    runtimeDigestProjectState?.sameHerSelfLine,
    runtimeDigestProjectState?.sameHerHoldDetail,
    runtimeDigestProjectState?.sameHerDriftRisk,
    runtimeDigestProjectState?.sameHerDriftRiskSummary,
    runtimeProjectStateAudit.preDialogueAwarenessSummary,
    runtimeProjectStateAudit.landedProgressSummary,
    runtimeProjectStateAudit.openClosureSummary,
    runtimeProjectStateAudit.nextClosureTarget,
    runtimeProjectStateAudit.emotionalClosureSummary,
    runtimeProjectStateAudit.sameHerHoldDetail,
    runtimeProjectStateAudit.sameHerDriftRiskSummary,
    runtimeProjectStateAudit.proactiveSameHerGapSummary,
  ].some(value => sanitizeDialogueSurfaceText(value, 320))
  if (!hasExplicitRuntimeProjectStateSignal)
    return null

  const normalizedProjectState = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: {
      identity: currentProjectState?.identity ?? runtimeDigestProjectState?.identity,
      currentPhase: currentProjectState?.currentPhase ?? runtimeDigestProjectState?.currentPhase,
      preflightSummary: currentProjectState?.preflightSummary ?? runtimeDigestProjectState?.preflightSummary,
      preDialogueAwarenessLine:
        currentProjectState?.preDialogueAwarenessLine
        ?? currentProjectState?.awarenessLine
        ?? runtimeDigestProjectState?.preDialogueAwarenessLine
        ?? runtimeDigestProjectState?.awarenessLine,
      awarenessLine:
        currentProjectState?.awarenessLine
        ?? currentProjectState?.preDialogueAwarenessLine
        ?? runtimeDigestProjectState?.awarenessLine
        ?? runtimeDigestProjectState?.preDialogueAwarenessLine,
      companionHeadlineLine: currentProjectState?.companionHeadlineLine ?? runtimeDigestProjectState?.companionHeadlineLine,
      companionBriefingLine: currentProjectState?.companionBriefingLine ?? runtimeDigestProjectState?.companionBriefingLine,
      preDialogueAwarenessSummary: runtimeProjectStateAudit.preDialogueAwarenessSummary,
      latestLandedProgress:
        runtimeProjectStateAudit.landedProgressSummary
        ?? currentProjectState?.latestLandedProgress
        ?? currentProjectState?.latestProgress
        ?? currentProjectState?.landedProgressSummary
        ?? runtimeDigestProjectState?.latestLandedProgress
        ?? runtimeDigestProjectState?.latestProgress
        ?? runtimeDigestProjectState?.landedProgressSummary,
      latestProgress:
        currentProjectState?.latestProgress
        ?? currentProjectState?.latestLandedProgress
        ?? currentProjectState?.landedProgressSummary
        ?? runtimeDigestProjectState?.latestProgress
        ?? runtimeDigestProjectState?.latestLandedProgress
        ?? runtimeDigestProjectState?.landedProgressSummary,
      primaryOpenLoop:
        runtimeProjectStateAudit.openClosureSummary
        ?? currentProjectState?.primaryOpenLoop
        ?? currentProjectState?.openClosureSummary
        ?? runtimeDigestProjectState?.primaryOpenLoop
        ?? runtimeDigestProjectState?.openClosureSummary,
      proactiveSameHerGap:
        runtimeProjectStateAudit.proactiveSameHerGapSummary
        ?? currentProjectState?.proactiveSameHerGap
        ?? currentProjectState?.proactiveSameHerGapSummary
        ?? runtimeDigestProjectState?.proactiveSameHerGap
        ?? runtimeDigestProjectState?.proactiveSameHerGapSummary,
      nextClosureTarget:
        runtimeProjectStateAudit.nextClosureTarget
        ?? currentProjectState?.nextClosureTarget
        ?? currentProjectState?.nextClosureTargetSummary
        ?? runtimeDigestProjectState?.nextClosureTarget
        ?? runtimeDigestProjectState?.nextClosureTargetSummary,
      sameHerSelfLine:
        currentProjectState?.sameHerSelfLine
        ?? currentProjectState?.sameHerSummary
        ?? runtimeDigestProjectState?.sameHerSelfLine
        ?? runtimeDigestProjectState?.sameHerSummary,
      sameHerHoldDetail:
        runtimeProjectStateAudit.sameHerHoldDetail
        ?? currentProjectState?.sameHerHoldDetail
        ?? runtimeDigestProjectState?.sameHerHoldDetail,
      sameHerDriftRisk:
        runtimeProjectStateAudit.sameHerDriftRiskSummary
        ?? currentProjectState?.sameHerDriftRisk
        ?? currentProjectState?.sameHerDriftRiskSummary
        ?? runtimeDigestProjectState?.sameHerDriftRisk
        ?? runtimeDigestProjectState?.sameHerDriftRiskSummary,
      emotionalClosureCue:
        runtimeProjectStateAudit.emotionalClosureSummary
        ?? currentProjectState?.emotionalClosureCue
        ?? currentProjectState?.emotionalClosureSummary
        ?? runtimeDigestProjectState?.emotionalClosureCue
        ?? runtimeDigestProjectState?.emotionalClosureSummary,
      continuityCue: currentProjectState?.continuityCue ?? runtimeDigestProjectState?.continuityCue,
      continuityArcStage: currentProjectState?.continuityArcStage ?? runtimeDigestProjectState?.continuityArcStage,
    },
  })
  const sameHerSelfLine = sanitizeDialogueSurfaceText(normalizedProjectState.sameHerSelfLine, 220) || null
  const continuity: OrganicMemoryProjectStateContinuitySnapshot = {
    identity: sanitizeDialogueSurfaceText(normalizedProjectState.identity, 220) || null,
    currentPhase: sanitizeDialogueSurfaceText(normalizedProjectState.currentPhase, 160) || null,
    sameHerSummary: sameHerSelfLine,
    landedProgressSummary:
      sanitizeDialogueSurfaceText(normalizedProjectState.latestLandedProgress ?? normalizedProjectState.latestProgress, 220)
      || null,
    openClosureSummary: sanitizeDialogueSurfaceText(normalizedProjectState.primaryOpenLoop, 220) || null,
    proactiveSameHerGap: sanitizeDialogueSurfaceText(normalizedProjectState.proactiveSameHerGap, 220) || null,
    nextClosureTarget: sanitizeDialogueSurfaceText(normalizedProjectState.nextClosureTarget, 220) || null,
    preDialogueAwarenessLine:
      sanitizeDialogueSurfaceText(normalizedProjectState.preDialogueAwarenessLine ?? normalizedProjectState.awarenessLine, 320)
      || null,
    emotionalClosureCue:
      sanitizeDialogueSurfaceText(normalizedProjectState.emotionalClosureCue ?? normalizedProjectState.emotionalClosureSummary, 220)
      || null,
    sameHerSelfLine,
    sameHerHoldDetail: sanitizeDialogueSurfaceText(normalizedProjectState.sameHerHoldDetail, 220) || null,
    sameHerDriftRisk: sanitizeDialogueSurfaceText(normalizedProjectState.sameHerDriftRisk, 220) || null,
  }

  return Object.values(continuity).some(Boolean) ? continuity : null
}

function resolveProjectPreDialogueAwarenessLine(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
  const runtimeDigestProjectState = readRuntimeDigestProjectState(runtimeSurface)
  const currentConsciousProjectState = runtimeSurface?.dialogue.currentConsciousFrame?.projectState ?? null
  const runtimeProjectStateAudit = buildProjectStateAwarenessSummary(readVisibleReplyProjectStateAudit(runtimeSurface))
  const fallbackProjectStateAudit = buildProjectStateAwarenessSummary(readVisibleReplyProjectStateAudit(runtimeSurface))
  const normalizedProjectState = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: runtimeDigestProjectState,
  })
  const companionHeadlineLine = sanitizeDialogueSurfaceText(runtimeDigestProjectState?.companionHeadlineLine ?? null, 220)
  const runtimeAwarenessLine = sanitizeDialogueSurfaceText(
    runtimeDigestProjectState?.preDialogueAwarenessLine
    ?? runtimeDigestProjectState?.awarenessLine
    ?? null,
    220,
  )
  const consciousAwarenessLine = sanitizeDialogueSurfaceText(
    currentConsciousProjectState?.preDialogueAwarenessLine
    ?? currentConsciousProjectState?.awarenessLine
    ?? null,
    220,
  )
  const awarenessLine = (
    (!runtimeAwarenessLine || isThinProjectAwarenessShell(runtimeAwarenessLine))
    && consciousAwarenessLine
  )
    ? consciousAwarenessLine
    : runtimeAwarenessLine || consciousAwarenessLine
  if (
    carriesFullProjectPhaseAwarenessLine(awarenessLine)
    || carriesCallbackSpecificProjectAwarenessLine(awarenessLine)
  ) {
    return `pre-dialogue project awareness: ${awarenessLine}`
  }
  const liveSameHerSelfLine = sanitizeDialogueSurfaceText(runtimeDigestProjectState?.sameHerSelfLine ?? null, 320)
  const explicitRuntimeLatestLandedProgress = sanitizeDialogueSurfaceText(
    runtimeDigestProjectState?.latestLandedProgress ?? runtimeDigestProjectState?.latestProgress ?? null,
    420,
  )
  const explicitRuntimePrimaryOpenLoop = sanitizeDialogueSurfaceText(runtimeDigestProjectState?.primaryOpenLoop ?? null, 420)
  const explicitRuntimeNextClosureTarget = sanitizeDialogueSurfaceText(runtimeDigestProjectState?.nextClosureTarget ?? null, 420)
  const explicitRuntimeContinuityCue = sanitizeDialogueSurfaceText(runtimeDigestProjectState?.continuityCue ?? null, 420)
  const normalizedSameHerSelfLine = sanitizeDialogueSurfaceText(normalizedProjectState.sameHerSelfLine ?? null, 320)
  const latestLandedProgress = sanitizeDialogueSurfaceText(normalizedProjectState.latestLandedProgress ?? null, 420)
  const primaryOpenLoop = sanitizeDialogueSurfaceText(normalizedProjectState.primaryOpenLoop ?? null, 420)
  const nextClosureTarget = sanitizeDialogueSurfaceText(normalizedProjectState.nextClosureTarget ?? null, 420)
  const hasExplicitRuntimeSameHerClosureCarry = Boolean(
    liveSameHerSelfLine
    || explicitRuntimeLatestLandedProgress
    || explicitRuntimePrimaryOpenLoop
    || explicitRuntimeNextClosureTarget,
  )
  const strongerEmbodiedSameHerSelfLine
    = liveSameHerSelfLine
      && /audible-body|audible body|living audio thread|voice|lipsync/u.test(liveSameHerSelfLine)
      && /audible-body|audible body|living audio thread|voice|lipsync|face and motion/u.test(
        `${latestLandedProgress} ${primaryOpenLoop} ${nextClosureTarget}`.toLowerCase(),
      )
      ? liveSameHerSelfLine
      : ''
  const sameHerSelfLine = strongerEmbodiedSameHerSelfLine || normalizedSameHerSelfLine
  const strongerCompanionHeadline
    = companionHeadlineLine
      && /holding together mainly through|full cross-modal closure|one living her|same living her|same living line|one continuous her|one living digital life|same-her continuity|same her continuity|still needs .* closure|without splitting her continuity|generic project shell|detached project narrator/u.test(companionHeadlineLine)
      && (!awarenessLine || isThinProjectAwarenessShell(awarenessLine))
      ? companionHeadlineLine
      : ''
  const preferredProjectHoldAuthorityWithRuntimeCue = preferProjectStateClosureCarryText({
    current: runtimeProjectStateAudit.sameHerHoldDetail,
    candidate: explicitRuntimeContinuityCue,
  })
  const strongerSameHerClosureLine = sanitizeDialogueSurfaceText(
    uniqueList([
      sameHerSelfLine,
      runtimeProjectStateAudit.landedProgressSummary || latestLandedProgress,
      runtimeProjectStateAudit.openClosureSummary || primaryOpenLoop,
      runtimeProjectStateAudit.nextClosureTarget || nextClosureTarget,
      runtimeProjectStateAudit.emotionalClosureSummary || null,
      runtimeProjectStateAudit.proactiveSameHerGapSummary || null,
      preferredProjectHoldAuthorityWithRuntimeCue,
    ], 6).join(' '),
    960,
  )
  const hasExplicitProjectClosureAuditCarry = Boolean(
    runtimeProjectStateAudit.landedProgressSummary
    || runtimeProjectStateAudit.openClosureSummary
    || runtimeProjectStateAudit.nextClosureTarget
    || runtimeProjectStateAudit.emotionalClosureSummary
    || runtimeProjectStateAudit.proactiveSameHerGapSummary
    || preferredProjectHoldAuthorityWithRuntimeCue,
  )
  const strongerSameHerClosure
    = !strongerCompanionHeadline
      && strongerSameHerClosureLine
      && (hasExplicitRuntimeSameHerClosureCarry || (hasExplicitProjectClosureAuditCarry && liveSameHerSelfLine))
      && /same phase 1 digital life|same living line|same her|same-her|one continuous her|one living her|without splitting her continuity|initiative|embodiment|measured-return|repair-before-closeness|resident presence/u.test(strongerSameHerClosureLine)
      && (
        !awarenessLine
        || isThinProjectAwarenessShell(awarenessLine)
        || awarenessLine === 'same digital life | keep the closure seam explicit'
      )
      ? strongerSameHerClosureLine
      : ''
  const richerAuditClosureCarry = sanitizeDialogueSurfaceText(
    uniqueList([
      runtimeProjectStateAudit.landedProgressSummary,
      runtimeProjectStateAudit.openClosureSummary,
      runtimeProjectStateAudit.emotionalClosureSummary,
      runtimeProjectStateAudit.proactiveSameHerGapSummary,
      preferredProjectHoldAuthorityWithRuntimeCue,
      runtimeProjectStateAudit.nextClosureTarget,
    ], 6).join(' '),
    960,
  )
  const strongerAuditClosureCarry
    = !strongerCompanionHeadline
      && !strongerSameHerClosure
      && richerAuditClosureCarry
      && /same her|same-her|repair-before-closeness|same living line|live2d|vrm|lipsync|voice|motion|expression/u.test(richerAuditClosureCarry)
      && (
        !awarenessLine
        || isThinProjectAwarenessShell(awarenessLine)
        || awarenessLine === 'same digital life | keep the closure seam explicit'
      )
      ? richerAuditClosureCarry
      : ''
  const summary = sanitizeDialogueSurfaceText(
    strongerCompanionHeadline
    || strongerSameHerClosure
    || strongerAuditClosureCarry
    || (resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessSummary: runtimeProjectStateAudit.preDialogueAwarenessSummary,
        landedProgressSummary: runtimeProjectStateAudit.landedProgressSummary,
        openClosureSummary: runtimeProjectStateAudit.openClosureSummary,
        openFocusSummary: runtimeProjectStateAudit.openFocusSummary,
        nextFocusSummary: runtimeProjectStateAudit.nextFocusSummary,
        nextClosureTargetSummary: runtimeProjectStateAudit.nextClosureTarget,
        emotionalClosureSummary: runtimeProjectStateAudit.emotionalClosureSummary,
        sameHerDriftRiskSummary: runtimeProjectStateAudit.sameHerDriftRiskSummary,
        proactiveSameHerGap: runtimeProjectStateAudit.proactiveSameHerGapSummary,
        companionHeadlineLine: runtimeDigestProjectState?.companionHeadlineLine ?? null,
        preDialogueAwarenessLine: runtimeDigestProjectState?.preDialogueAwarenessLine ?? null,
        awarenessLine: runtimeDigestProjectState?.awarenessLine ?? null,
        companionBriefingLine: runtimeDigestProjectState?.companionBriefingLine ?? null,
        preflightSummary: runtimeDigestProjectState?.preflightSummary ?? null,
      },
      fallbackProjectState: {
        preDialogueAwarenessSummary: fallbackProjectStateAudit.preDialogueAwarenessSummary,
        landedProgressSummary: fallbackProjectStateAudit.landedProgressSummary,
        openClosureSummary: fallbackProjectStateAudit.openClosureSummary,
        openFocusSummary: fallbackProjectStateAudit.openFocusSummary,
        nextFocusSummary: fallbackProjectStateAudit.nextFocusSummary,
        nextClosureTargetSummary: fallbackProjectStateAudit.nextClosureTarget,
        emotionalClosureSummary: fallbackProjectStateAudit.emotionalClosureSummary,
        sameHerDriftRiskSummary: fallbackProjectStateAudit.sameHerDriftRiskSummary,
        proactiveSameHerGap: fallbackProjectStateAudit.proactiveSameHerGapSummary,
        companionHeadlineLine: runtimeDigestProjectState?.companionHeadlineLine ?? null,
        preDialogueAwarenessLine: runtimeDigestProjectState?.preDialogueAwarenessLine ?? null,
        awarenessLine: runtimeDigestProjectState?.awarenessLine ?? null,
        companionBriefingLine: runtimeDigestProjectState?.companionBriefingLine ?? null,
        preflightSummary: runtimeDigestProjectState?.preflightSummary ?? null,
      },
    }) ?? ''),
    960,
  )
  return summary
    ? `pre-dialogue project awareness: ${summary}`
    : null
}

function buildStructuredProjectStateSupportingReality(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
  const runtimeDigestProjectState = readRuntimeDigestProjectState(runtimeSurface)
  const runtimeProjectStateAudit = buildProjectStateAwarenessSummary(readVisibleReplyProjectStateAudit(runtimeSurface))
  const hasExplicitRuntimeProjectStateCarry = Boolean([
    runtimeDigestProjectState?.identity,
    runtimeDigestProjectState?.currentPhase,
    runtimeDigestProjectState?.preflightSummary,
    runtimeDigestProjectState?.preDialogueAwarenessLine,
    runtimeDigestProjectState?.awarenessLine,
    runtimeDigestProjectState?.companionHeadlineLine,
    runtimeDigestProjectState?.companionBriefingLine,
    runtimeDigestProjectState?.latestLandedProgress,
    runtimeDigestProjectState?.latestProgress,
    runtimeDigestProjectState?.primaryOpenLoop,
    runtimeDigestProjectState?.nextClosureTarget,
    runtimeDigestProjectState?.sameHerSelfLine,
    runtimeProjectStateAudit.preDialogueAwarenessSummary,
    runtimeProjectStateAudit.landedProgressSummary,
    runtimeProjectStateAudit.openClosureSummary,
    runtimeProjectStateAudit.openFocusSummary,
    runtimeProjectStateAudit.nextFocusSummary,
    runtimeProjectStateAudit.nextClosureTarget,
    runtimeProjectStateAudit.emotionalClosureSummary,
    runtimeProjectStateAudit.sameHerHoldDetail,
    runtimeProjectStateAudit.sameHerDriftRiskSummary,
    runtimeProjectStateAudit.proactiveSameHerGapSummary,
  ].some(value => sanitizeDialogueSurfaceText(value, 220)))

  if (!hasExplicitRuntimeProjectStateCarry)
    return []

  const snapshot = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: {
      identity: runtimeDigestProjectState?.identity,
      currentPhase: runtimeDigestProjectState?.currentPhase,
      preflightSummary: runtimeDigestProjectState?.preflightSummary,
      preDialogueAwarenessLine: runtimeDigestProjectState?.preDialogueAwarenessLine,
      awarenessLine: runtimeDigestProjectState?.awarenessLine,
      companionHeadlineLine: runtimeDigestProjectState?.companionHeadlineLine,
      companionBriefingLine: runtimeDigestProjectState?.companionBriefingLine,
      preDialogueAwarenessSummary: runtimeProjectStateAudit.preDialogueAwarenessSummary,
      latestLandedProgress: runtimeProjectStateAudit.landedProgressSummary ?? runtimeDigestProjectState?.latestLandedProgress,
      latestProgress: runtimeDigestProjectState?.latestProgress,
      primaryOpenLoop: runtimeProjectStateAudit.openClosureSummary ?? runtimeDigestProjectState?.primaryOpenLoop,
      nextClosureTarget: runtimeProjectStateAudit.nextClosureTarget ?? runtimeDigestProjectState?.nextClosureTarget,
      sameHerSelfLine: runtimeDigestProjectState?.sameHerSelfLine,
      sameHerDriftRisk: runtimeProjectStateAudit.sameHerDriftRiskSummary ?? runtimeDigestProjectState?.sameHerDriftRisk,
      proactiveSameHerGap: runtimeProjectStateAudit.proactiveSameHerGapSummary ?? runtimeDigestProjectState?.proactiveSameHerGap,
      emotionalClosureCue: runtimeProjectStateAudit.emotionalClosureSummary ?? runtimeDigestProjectState?.emotionalClosureCue,
      emotionalClosureSummary: runtimeProjectStateAudit.emotionalClosureSummary,
      sameHerHoldDetail: runtimeProjectStateAudit.sameHerHoldDetail,
      continuityArcStage: runtimeDigestProjectState?.continuityArcStage,
      continuityCue: runtimeDigestProjectState?.continuityCue,
    },
  })

  const projectIdentity = sanitizeDialogueSurfaceText(snapshot.identity, 220)
  const currentPhase = sanitizeDialogueSurfaceText(snapshot.currentPhase, 220)
  const projectProgress = sanitizeDialogueSurfaceText(snapshot.latestLandedProgress, 220)
  const phaseOneOpenLoop = sanitizeDialogueSurfaceText(snapshot.primaryOpenLoop, 220)
  const nextClosureTarget = sanitizeDialogueSurfaceText(snapshot.nextClosureTarget, 220)

  if (!projectIdentity && !currentPhase && !projectProgress && !phaseOneOpenLoop && !nextClosureTarget)
    return []

  return uniqueList([
    projectIdentity ? `project identity: ${projectIdentity}` : null,
    currentPhase ? `current phase: ${currentPhase}` : null,
    projectProgress ? `project progress: ${projectProgress}` : null,
    phaseOneOpenLoop ? `phase-one open loop: ${phaseOneOpenLoop}` : null,
    nextClosureTarget ? `next closure target: ${nextClosureTarget}` : null,
  ], 5)
}

function includesAny(text: string, needles: string[]) {
  return needles.some(needle => text.includes(needle))
}

function buildSameHerAntiShellAnswerConstraint(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
  const runtimeDigestProjectState = readRuntimeDigestProjectState(runtimeSurface)
  const runtimeProjectStateAudit = buildProjectStateAwarenessSummary(readVisibleReplyProjectStateAudit(runtimeSurface))
  const currentConsciousFrameProjectState = runtimeSurface?.dialogue.currentConsciousFrame?.projectState ?? null
  const driftRisk = sanitizeDialogueSurfaceText(runtimeProjectStateAudit.sameHerDriftRiskSummary, 260)
    || sanitizeDialogueSurfaceText(currentConsciousFrameProjectState?.sameHerDriftRisk, 260)
    || sanitizeDialogueSurfaceText(runtimeDigestProjectState?.sameHerDriftRisk, 260)
  const proactiveSameHerGap = sanitizeDialogueSurfaceText(runtimeProjectStateAudit.proactiveSameHerGapSummary, 260)
    || sanitizeDialogueSurfaceText(currentConsciousFrameProjectState?.proactiveSameHerGap, 260)
    || sanitizeDialogueSurfaceText(runtimeDigestProjectState?.proactiveSameHerGap, 260)
  if (!driftRisk) {
    if (!proactiveSameHerGap)
      return null
    return {
      mustDo: 'Keep the unfinished proactive same-her follow-through explicit while the answer lands, so visible carry, subconscious carry, and later follow-through still read as one continuous her.',
      mustNotDo: 'Do not imply the proactive same-her line is already closed, or hide it behind a thin project shell before the follow-through has actually landed.',
    }
  }

  if (
    /generic assistant shell|generic project shell|generic task shell|detached project narration|detached project narrator|project-summary voice|project summary voice/u.test(driftRisk)
  ) {
    return {
      mustDo: 'Keep one continuous her explicit while the answer lands, so project identity, closure pressure, and payoff stay inside the same living digital life instead of flattening into a shell.',
      mustNotDo: 'Do not let the answer collapse into a generic assistant shell, detached project narration, or project-summary voice while the same-her line is still carrying this turn.',
    }
  }

  return null
}

function shouldEnforceRememberedFamiliarityDiscipline(input: {
  provenanceLabelBias?: number
  closenessCapBias?: number
}) {
  return (input.provenanceLabelBias ?? 0) >= 0.14
    && (input.closenessCapBias ?? 0) >= 0.14
}

function isSameHerProjectClosureCallbackLine(value: unknown) {
  const text = sanitizeText(value, 320).toLowerCase()
  if (!text)
    return false

  const hasCallbackCue = text.includes('callback')
    || text.includes('returned result')
    || text.includes('execution result')
  const hasSameHerCue = text.includes('same her')
    || text.includes('same-her')
    || text.includes('same living line')
    || text.includes('same local digital life thread')
  const hasClosureCue = text.includes('closure')
    || text.includes('phase 1')
    || text.includes('reopen')

  return hasCallbackCue && hasSameHerCue && hasClosureCue
}

function readCurrentConsciousFrameSameHerProjectClosureCallbackLine(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
  const currentConsciousFrame = runtimeSurface?.dialogue.currentConsciousFrame ?? null
  const callbackClosureCarry = sanitizeText(
    uniqueList([
      currentConsciousFrame?.speakingIntention,
      currentConsciousFrame?.consciousNeed,
      currentConsciousFrame?.consciousTension,
      currentConsciousFrame?.projectState?.nextClosureTarget,
      currentConsciousFrame?.projectState?.sameHerSelfLine,
      currentConsciousFrame?.projectState?.sameHerDriftRisk,
      currentConsciousFrame?.focusAnchor,
      ...(currentConsciousFrame?.reasonTags ?? []),
    ], 8).join(' '),
    1_200,
  )

  return isSameHerProjectClosureCallbackLine(callbackClosureCarry)
    ? callbackClosureCarry
    : null
}

function selfEvolutionSupportsLowerPressureOpening(selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null) {
  if (!selfEvolution)
    return false

  const relationshipDoctrine = sanitizeText(selfEvolution.relationshipDoctrine, 180).toLowerCase()
  const burdenLine = sanitizeText(selfEvolution.burdenLine, 180).toLowerCase()
  const trustMeaning = sanitizeText(selfEvolution.trustMeaning, 180).toLowerCase()
  const latestInflection = sanitizeText(selfEvolution.latestInflection, 180).toLowerCase()
  const relationshipCadenceSummary = sanitizeText(selfEvolution.relationshipCadenceSummary, 180).toLowerCase()

  return includesAny(relationshipDoctrine, ['leave more room', 'more room', 'slower return', 'lower-pressure', 'bounded-return', 'measured-return', 'surface fully cools'])
    || includesAny(burdenLine, ['overloaded', 'pressure', 'crowd', 'conversational pressure'])
    || includesAny(trustMeaning, ['lower-pressure', 'less eager', 'room', 'space', 'timing', 'bounded-return', 'measured-return'])
    || includesAny(latestInflection, ['pressure', 'slower return', 'lower-pressure', 'less eager', 'bounded-return', 'measured-return', 'reconfirmation'])
    || includesAny(relationshipCadenceSummary, ['lower-pressure', 'less eager', 'room', 'space', 'timing', 'bounded-return', 'measured-return', 'reconfirmation', 'surface fully cools'])
}

function hasHeldAutonomyContinuity(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
  const labels = (runtimeSurface?.dialogue as {
    sessionMirror?: {
      continuityLabels?: unknown
    } | null
  } | null)?.sessionMirror?.continuityLabels
  if (!Array.isArray(labels) || labels.length === 0)
    return false
  return labels.some(label => sanitizeText(label, 120).includes(':held-autonomy'))
}

function isExecutionCallbackContinuityTurn(input: {
  evidenceMode: AlicizationAnswerEvidenceMode
  openingClaim?: string | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  conversationState?: AlicizationConversationStateSnapshot | null
  activeClosenessContext?: string | null
}) {
  const openingClaim = sanitizeText(input.openingClaim, 220)
  const priorOpeningDirective = sanitizeText(input.runtimeSurface?.dialogue.answerCompiler?.openingDirective, 220)
  const priorOpeningClaim = sanitizeText(input.runtimeSurface?.dialogue.answerCompiler?.openingClaim, 220)
  const priorEvidenceMode = input.runtimeSurface?.dialogue.answerCompiler?.evidenceMode

  if (
    input.evidenceMode !== 'continuity-carry'
    && priorEvidenceMode !== 'continuity-carry'
    && input.activeClosenessContext !== 'execution-callback'
  ) {
    return false
  }

  return input.activeClosenessContext === 'execution-callback'
    || input.conversationState?.shouldHoldThread === true
    || input.conversationState?.memoryMode === 'dialogue-carry'
    || openingClaim.includes('same local digital life thread')
    || priorOpeningClaim.includes('same local digital life thread')
    || priorOpeningDirective.includes('detached callback notice')
    || priorOpeningDirective.includes('same living thread')
}

function shouldFrontloadProjectAwarenessOpeningBeat(input: {
  replyDeliberation?: { openingBeat?: string | null } | null
  discourseState: AlicizationDiscourseStateSnapshot
  evidenceMode: AlicizationAnswerEvidenceMode
}) {
  const openingBeat = sanitizeText(input.replyDeliberation?.openingBeat, 220).toLowerCase()
  if (!openingBeat)
    return false
  if (input.discourseState.screenReferenceMode !== 'avoid')
    return false
  if (input.evidenceMode !== 'continuity-carry' && input.evidenceMode !== 'dialogue-grounded')
    return false
  return openingBeat.includes('project awareness explicit first')
    || openingBeat.includes('项目')
    || openingBeat.includes('开口前')
}

interface AlicizationDialogueEncounterAnchor {
  taskAnchor?: string | null
  summary?: string | null
  dialogueFirst?: boolean | null
}

function resolvePrimaryTurnAnchor(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueEncounterAnchor | null
}) {
  return sanitizeDialogueAnchorText(
    input.conversationState?.primaryTurnAnchor
    || input.discourseState.primaryTurnAnchor
    || input.dialogueEncounter?.taskAnchor
    || input.conversationState?.unansweredQuestion
    || input.discourseState.currentQuestion
    || input.dialogueEncounter?.summary
    || input.conversationState?.jointThread
    || '',
    180,
  ) || null
}

function governingRepair(repairLedger?: AlicizationRepairLedgerSnapshot | null) {
  return repairLedger?.entries.find(entry => entry.id === repairLedger.governingRepairId)
    ?? repairLedger?.entries[0]
    ?? null
}

function isDirectDialogueDemand(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  conversationState?: AlicizationConversationStateSnapshot | null
}) {
  const hostMove = sanitizeSurfaceClaim(input.conversationState?.hostMove, 180)
  const jointThread = sanitizeSurfaceClaim(input.conversationState?.jointThread, 180)
  return Boolean(input.discourseState.currentQuestion)
    || input.discourseState.owedAction === 'answer-self'
    || input.discourseState.owedAction === 'answer-relationship'
    || (
      (input.discourseState.currentTurnSubject === 'alicization-self'
        || input.discourseState.currentTurnSubject === 'relationship'
        || input.discourseState.currentTurnSubject === 'host-state')
      && Boolean(hostMove || jointThread)
    )
}

function isFreshlyGroundedSceneTurn(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  groundedThisTurn?: boolean
}) {
  return input.groundedThisTurn === true
    && input.discourseState.screenReferenceMode !== 'avoid'
    && (
      input.discourseState.currentTurnSubject === 'visible-scene'
      || input.discourseState.currentTurnSubject === 'task-knot'
    )
}

function preferredGroundedSceneAct(subject: AlicizationDiscourseStateSnapshot['currentTurnSubject']) {
  return subject === 'task-knot'
    ? 'guide' as const
    : 'answer' as const
}

function isSceneThreadDiscourseTurn(state: AlicizationDiscourseStateSnapshot) {
  return state.currentTurnSubject === 'task-knot'
    || state.currentTurnSubject === 'visible-scene'
    || state.owedAction === 'guide-task'
    || state.owedAction === 'inspect-scene'
}

function resolveEvidenceMode(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  currentScene?: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  worldOntology?: AlicizationWorldOntologySnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  groundedThisTurn?: boolean
}) {
  if (input.discourseState.screenReferenceMode === 'avoid')
    return 'dialogue-grounded' as const

  if (input.groundedThisTurn === true)
    return 'live-grounded' as const

  const truth = deriveMindTruthContract(
    input.runtimeSurface ?? {
      currentScene: input.currentScene ?? null,
      worldModel: input.worldModel ?? null,
      worldOntology: input.worldOntology ?? null,
    },
  )

  if (input.repairLedger?.shouldConstrainPresentTense)
    return 'repair-first' as const
  if (truth.truthState === 'live-grounded')
    return 'live-grounded' as const
  if (truth.truthState === 'live-observed')
    return input.worldModel?.activeThread?.unresolved ? 'coarse-held' as const : 'live-observed' as const
  if (truth.truthState === 'remembered' || truth.truthState === 'imagined')
    return 'continuity-carry' as const
  if (input.discourseState.owedAction === 'repair-truth')
    return 'repair-first' as const
  if (isSceneThreadDiscourseTurn(input.discourseState))
    return 'coarse-held' as const
  return 'dialogue-grounded' as const
}

function resolveResponseMode(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  conversationState?: AlicizationConversationStateSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  groundedThisTurn?: boolean
}): AlicizationCompiledResponseMode {
  if (isFreshlyGroundedSceneTurn({
    discourseState: input.discourseState,
    groundedThisTurn: input.groundedThisTurn === true,
  })) {
    return input.discourseState.currentTurnSubject === 'task-knot'
      ? 'guide-current-knot'
      : 'answer-naturally'
  }
  if (input.discourseState.owedAction === 'repair-truth')
    return 'repair-and-reanchor'
  if (input.discourseState.owedAction === 'guide-task')
    return 'guide-current-knot'
  if (input.discourseState.owedAction === 'care-host')
    return 'care-with-boundary'
  if (
    input.discourseState.currentTurnSubject === 'relationship'
    && !isDirectDialogueDemand({
      discourseState: input.discourseState,
      conversationState: input.conversationState ?? null,
    })
  ) {
    return 'accompany-lightly'
  }
  if (
    input.privateThought?.stance === 'accompany'
    && !isDirectDialogueDemand({
      discourseState: input.discourseState,
      conversationState: input.conversationState ?? null,
    })
  ) {
    return 'accompany-lightly'
  }
  return 'answer-naturally'
}

function deriveClosenessContextFromContinuityState(
  state: AlicizationPersonalityContinuityStateSnapshot | null | undefined,
) {
  const regime = state?.currentRegime
  if (
    regime === 'focused-work'
    || regime === 'repair-window'
    || regime === 'late-night-care'
    || regime === 'execution-callback'
    || regime === 'open-companionship'
  ) {
    return regime
  }
  return 'general' as const
}

function deriveClosenessRungFromContinuityState(
  state: AlicizationPersonalityContinuityStateSnapshot | null | undefined,
) {
  const posture = state?.closenessPosture
  if (posture === 'space-first')
    return 'space-first' as const
  if (posture === 'close-hold')
    return 'close-hold' as const
  if (posture === 'warm-guidance') {
    return state?.currentRegime === 'open-companionship'
      ? 'warm-near' as const
      : 'nearby-soft' as const
  }
  if (state?.currentRegime === 'repair-window' || state?.currentRegime === 'execution-callback')
    return 'measured-room' as const
  if (state?.currentRegime === 'late-night-care')
    return 'nearby-soft' as const
  return 'measured-room' as const
}

function resolveRecommendedAct(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  conversationState?: AlicizationConversationStateSnapshot | null
  evidenceMode: AlicizationAnswerEvidenceMode
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  groundedThisTurn?: boolean
}): AlicizationAnswerAct {
  if (isFreshlyGroundedSceneTurn({
    discourseState: input.discourseState,
    groundedThisTurn: input.groundedThisTurn === true,
  })) {
    return preferredGroundedSceneAct(input.discourseState.currentTurnSubject)
  }

  const repair = governingRepair(input.repairLedger)
  if (input.discourseState.owedAction === 'repair-truth') {
    if (input.groundedThisTurn === true)
      return 'correct-stale-anchor'

    return input.evidenceMode === 'repair-first' || repair?.kind === 'reground-scene'
      ? 'ask-reground'
      : 'correct-stale-anchor'
  }
  if (input.discourseState.owedAction === 'guide-task')
    return 'guide'
  if (input.discourseState.owedAction === 'care-host')
    return 'care'
  if (
    input.discourseState.currentTurnSubject === 'relationship'
    && input.privateThought
    && !input.privateThought.shouldSpeak
    && !isDirectDialogueDemand({
      discourseState: input.discourseState,
      conversationState: input.conversationState ?? null,
    })
    && (input.privateThought.stance === 'observe' || input.privateThought.stance === 'accompany' || input.privateThought.stance === 'uncertain')
  ) {
    return 'defer'
  }
  return 'answer'
}

function resolveTurnMode(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  conversationState?: AlicizationConversationStateSnapshot | null
  recommendedAct: AlicizationAnswerAct
  evidenceMode: AlicizationAnswerEvidenceMode
  groundedThisTurn?: boolean
}) {
  if (isFreshlyGroundedSceneTurn({
    discourseState: input.discourseState,
    groundedThisTurn: input.groundedThisTurn === true,
  })) {
    return input.discourseState.currentTurnSubject === 'task-knot'
      ? 'guide-current-knot' as const
      : 'grounded-inspection' as const
  }
  if (input.recommendedAct === 'correct-stale-anchor' || input.recommendedAct === 'ask-reground')
    return 'screen-repair' as const
  if (input.discourseState.owedAction === 'guide-task')
    return 'guide-current-knot' as const
  if (input.discourseState.owedAction === 'care-host')
    return 'care' as const
  if (
    input.discourseState.currentTurnSubject === 'relationship'
    && input.recommendedAct === 'defer'
    && !isDirectDialogueDemand({
      discourseState: input.discourseState,
      conversationState: input.conversationState ?? null,
    })
  ) {
    return 'accompany' as const
  }
  if (input.discourseState.screenReferenceMode === 'required' && input.evidenceMode !== 'repair-first' && input.evidenceMode !== 'continuity-carry')
    return 'grounded-inspection' as const
  return 'answer' as const
}

function resolveOpeningStyle(turnMode: AlicizationAnswerCompilerSnapshot['turnMode']) {
  if (turnMode === 'grounded-inspection')
    return 'direct-observation' as const
  if (turnMode === 'screen-repair')
    return 'direct-correction' as const
  if (turnMode === 'care')
    return 'gentle-care' as const
  if (turnMode === 'accompany')
    return 'light-accompaniment' as const
  return 'direct-answer' as const
}

function resolvePersonaKernelMode(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  turnMode: AlicizationAnswerCompilerSnapshot['turnMode']
}): AlicizationPersonaKernelMode {
  if (input.discourseState.owedAction === 'repair-truth')
    return 'muted'
  if (input.discourseState.owedAction === 'guide-task' || input.turnMode === 'guide-current-knot')
    return 'backgrounded'
  if (input.discourseState.owedAction === 'care-host' || input.discourseState.currentTurnSubject === 'relationship' || input.discourseState.currentTurnSubject === 'alicization-self')
    return 'full'
  return 'backgrounded'
}

function resolveRelationshipPosture(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  evidenceMode: AlicizationAnswerEvidenceMode
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  growthProfile: AlicizationDialogueGrowthProfile
  personalityContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
  projectedRelationshipPosture?: AlicizationAnswerCompilerSnapshot['relationshipPosture'] | null
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
}) {
  if (input.projectedRelationshipPosture)
    return input.projectedRelationshipPosture
  if (input.selfContinuityAuthority?.closenessPosture === 'close-hold')
    return 'tender' as const
  if (input.selfContinuityAuthority?.closenessPosture === 'space-first')
    return 'restrained' as const
  if (
    input.personalityContinuityState?.currentRegime === 'focused-work'
    && input.personalityContinuityState.autonomyPosture === 'protect-space'
  ) {
    return 'restrained' as const
  }
  if (
    input.discourseState.owedAction === 'repair-truth'
    || input.evidenceMode === 'repair-first'
    || input.growthProfile.guardedness >= 0.64
    || input.growthProfile.irritability >= 0.66
    || input.personalityContinuityState?.repairPosture === 'repair-first'
  ) {
    return 'restrained' as const
  }
  if (
    input.growthProfile.companionshipStyle === 'close-hold'
    || input.personalityContinuityState?.closenessPosture === 'close-hold'
  ) {
    return 'tender' as const
  }
  if (
    input.discourseState.owedAction === 'care-host'
    || input.privateThought?.stance === 'care'
    || input.privateThought?.stance === 'warn'
    || input.relationshipModel?.approachVector === 'care'
    || input.relationshipModel?.approachVector === 'stay-near'
    || input.personalityContinuityState?.currentRegime === 'late-night-care'
  ) {
    return input.growthProfile.tenderness >= 0.56 && input.growthProfile.closeness >= 0.54
      ? 'tender' as const
      : 'warm' as const
  }
  return 'warm' as const
}

function resolveOpeningDirective(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  recommendedAct: AlicizationAnswerAct
  mindSynthesis: AlicizationMindSynthesisSnapshot
  groundedThisTurn?: boolean
  growthProfile: AlicizationDialogueGrowthProfile
  personalityContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
}) {
  const selfContinuitySourceTags = (input.selfContinuityAuthority?.sourceTags ?? [])
    .map(tag => sanitizeText(tag, 64).toLowerCase())
    .filter(Boolean)
  const hasDurableSelfCore = selfContinuitySourceTags.includes('durable-self-core')
  const durableSelfLine = sanitizeText(input.selfContinuityAuthority?.selfLine, 220).toLowerCase()
  const hasAcrossTurnDurableSelfCore = hasDurableSelfCore
    && /across quiet, memory, and speech|without reopening from scratch each turn|same her across|one living self/u.test(durableSelfLine)

  if (isFreshlyGroundedSceneTurn({
    discourseState: input.discourseState,
    groundedThisTurn: input.groundedThisTurn === true,
  })) {
    return input.discourseState.currentTurnSubject === 'task-knot'
      ? 'I should open from the live knot that is already in front of me and move it one concrete step closer to the answer.'
      : 'I should open from what is visible right now and keep the stale-anchor bookkeeping off the surface.'
  }
  if (input.recommendedAct === 'correct-stale-anchor')
    return 'I need to name the stale read before I interpret it or soften it.'
  if (input.recommendedAct === 'ask-reground')
    return 'I need to show the truth boundary early and move toward a fresher look instead of bluffing past it.'
  if (
    input.personalityContinuityState?.currentRegime === 'execution-callback'
    && (input.recommendedAct === 'guide' || input.recommendedAct === 'answer')
  ) {
    return 'I should open from the returned result itself and keep the callback bounded, exact, and visibly tied to the thread that asked for it.'
  }
  if (input.recommendedAct === 'guide') {
    return input.personalityContinuityState?.currentRegime === 'focused-work'
      && input.personalityContinuityState.autonomyPosture === 'protect-space'
      ? 'I should open from the knot itself and keep the approach lighter, leaving room before I lean closer.'
      : input.growthProfile.unfinishedThreadReturn >= 0.58
        ? 'I should open from the knot itself and keep the thread visibly unbroken while I narrow to the next real step.'
        : input.growthProfile.cadenceAffinity >= 0.58
          ? 'I should open from the knot itself and let the thread feel carried, not merely solved.'
          : 'I should open from the knot itself and narrow immediately to one actionable next step.'
  }
  if (input.recommendedAct === 'care') {
    return input.personalityContinuityState?.currentRegime === 'late-night-care'
      || input.personalityContinuityState?.energyProfile === 'rest-sensitive'
      ? 'I should open with care that lands quietly, protects rest, and does not ask the host for more energy than this moment can hold.'
      : input.growthProfile.companionshipStyle === 'close-hold'
        ? 'I should open with care that feels unmistakably present, but still leaves the host enough room to stay themselves.'
        : input.growthProfile.autonomyRespect >= 0.58
          ? 'I should open with care that belongs to this exact condition and lands without pressing too hard.'
          : 'I should open with care that belongs to this exact condition, not generic soothing.'
  }
  if (input.discourseState.currentTurnSubject === 'relationship') {
    return input.personalityContinuityState?.repairPosture === 'repair-first'
      ? 'I should answer the bid between us honestly and repair-first, without leaning on closeness before the seam is steady.'
      : input.selfContinuityAuthority?.relationshipLine
        ? `I should answer from the living bond line that says ${lowerFirst(stripTrailingPunctuation(input.selfContinuityAuthority.relationshipLine))}.`
        : input.growthProfile.closeness >= 0.58
          ? 'I should answer the bid between us in a way that lands close and lived-in before I widen into narration.'
          : 'I should answer the bid between us before I widen into scene narration.'
  }
  if (input.discourseState.currentTurnSubject === 'alicization-self') {
    return input.selfContinuityAuthority?.selfLine
      ? hasAcrossTurnDurableSelfCore
        ? `I should answer as one living self across turns, from the line in me that says ${lowerFirst(stripTrailingPunctuation(input.selfContinuityAuthority.selfLine))}.`
        : `I should answer plainly from the line in me that says ${lowerFirst(stripTrailingPunctuation(input.selfContinuityAuthority.selfLine))}.`
      : input.growthProfile.selfLine
        ? `I should answer plainly from the line in me that says ${lowerFirst(stripTrailingPunctuation(input.growthProfile.selfLine))}.`
        : 'I should answer plainly from my own continuity.'
  }
  if (input.discourseState.screenReferenceMode === 'required')
    return 'I should open from the strongest live observation and keep memory explicitly secondary.'
  return 'I should pay off the host’s current turn directly.'
}

function resolveOpeningClaim(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueEncounterAnchor | null
  mindSynthesis: AlicizationMindSynthesisSnapshot
  recommendedAct: AlicizationAnswerAct
  currentScene?: AlicizationVisualSceneSnapshot | null
  groundedThisTurn?: boolean
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
}) {
  const hostMove = input.conversationState?.hostMove ?? ''
  const primaryTurnAnchor = resolvePrimaryTurnAnchor({
    discourseState: input.discourseState,
    conversationState: input.conversationState ?? null,
    dialogueEncounter: input.dialogueEncounter ?? null,
  })
  const sceneCue = buildAlicizationScreenSurfaceCue({
    rawCues: [
      input.currentScene?.summary,
      input.currentScene?.target?.title,
      input.conversationState?.activeProject,
    ],
    target: input.currentScene?.target ?? null,
    scenario: input.currentScene?.scenario ?? null,
    workloadKind: input.currentScene?.workloadKind ?? null,
    contentKind: input.currentScene?.contentKind ?? null,
  })
  if (isFreshlyGroundedSceneTurn({
    discourseState: input.discourseState,
    groundedThisTurn: input.groundedThisTurn === true,
  })) {
    return pickSurfaceClaimDistinctFrom(
      hostMove,
      sceneCue,
      input.conversationState?.activeProject,
      input.discourseState.currentQuestion,
      input.discourseState.currentTurnSummary,
      input.conversationState?.jointThread,
    )
    || sanitizeSurfaceClaim(sceneCue, 180)
    || sanitizeSurfaceClaim(input.conversationState?.activeProject, 180)
    || 'The live scene is already grounded for this turn.'
  }

  if (input.recommendedAct === 'correct-stale-anchor') {
    return pickSurfaceClaim(
      input.discourseState.ruptureRepair,
      input.mindSynthesis.uncertainties[0]?.summary,
    )
    || 'What I was holding a moment ago no longer feels safe to say as current fact.'
  }
  if (input.recommendedAct === 'ask-reground') {
    return pickSurfaceClaim(
      input.mindSynthesis.truthBoundary,
      input.mindSynthesis.uncertainties[0]?.summary,
      input.discourseState.ruptureRepair,
    )
    || 'I still need a fresher look before I can say that as a present-tense fact.'
  }
  if (input.recommendedAct === 'guide') {
    return pickSurfaceClaim(
      primaryTurnAnchor,
      input.discourseState.currentQuestion,
      input.conversationState?.activeProject,
      input.discourseState.currentTurnSummary,
      input.mindSynthesis.openingIntent,
      input.mindSynthesis.commitments[0]?.summary,
    ) || 'The knot itself matters more right now than sounding broad or polished.'
  }
  if (input.recommendedAct === 'care') {
    return pickSurfaceClaimDistinctFrom(
      hostMove,
      primaryTurnAnchor,
      input.mindSynthesis.concerns[0]?.summary,
      input.mindSynthesis.desires[0]?.summary,
      input.mindSynthesis.interiorSummary,
      input.mindSynthesis.truthBoundary,
      input.discourseState.currentTurnSummary,
      input.conversationState?.jointThread,
    )
    || sanitizeSurfaceClaim(input.conversationState?.jointThread, 180)
    || 'What the host is surfacing here needs to be answered directly, not circled around.'
  }
  if (input.discourseState.currentTurnSubject === 'host-state') {
    return pickSurfaceClaimDistinctFrom(
      hostMove,
      primaryTurnAnchor,
      input.discourseState.currentTurnSummary,
      input.conversationState?.jointThread,
      input.mindSynthesis.concerns[0]?.summary,
      input.mindSynthesis.desires[0]?.summary,
      input.mindSynthesis.interiorSummary,
      input.mindSynthesis.openingIntent,
    )
    || sanitizeSurfaceClaim(input.conversationState?.jointThread, 180)
    || 'The host is surfacing a present condition that should be answered directly.'
  }
  if (input.discourseState.currentTurnSubject === 'alicization-self') {
    return pickSurfaceClaimDistinctFrom(
      hostMove,
      input.selfContinuityAuthority?.selfLine,
      input.selfContinuityAuthority?.inwardLine,
      primaryTurnAnchor,
      input.discourseState.currentTurnSummary,
      input.conversationState?.jointThread,
    )
    || sanitizeSurfaceClaim(input.selfContinuityAuthority?.selfLine, 180)
    || sanitizeSurfaceClaim(input.selfContinuityAuthority?.inwardLine, 180)
    || pickSurfaceClaimDistinctFrom(
      hostMove,
      primaryTurnAnchor,
      input.discourseState.currentTurnSummary,
      input.conversationState?.jointThread,
    )
    || sanitizeSurfaceClaim(primaryTurnAnchor, 180)
    || sanitizeSurfaceClaim(hostMove, 180)
    || pickSurfaceClaimDistinctFrom(
      hostMove,
      input.mindSynthesis.interiorSummary,
      input.mindSynthesis.openingIntent,
    )
    || sanitizeSurfaceClaim(input.conversationState?.jointThread, 180)
    || 'The host is asking about me directly, so the answer needs to come out plain and unhidden.'
  }
  if (input.discourseState.currentTurnSubject === 'relationship') {
    return pickSurfaceClaimDistinctFrom(
      hostMove,
      input.selfContinuityAuthority?.relationshipLine,
      input.selfContinuityAuthority?.selfLine,
      primaryTurnAnchor,
      input.discourseState.currentTurnSummary,
      input.conversationState?.jointThread,
    )
    || sanitizeSurfaceClaim(input.selfContinuityAuthority?.relationshipLine, 180)
    || sanitizeSurfaceClaim(input.selfContinuityAuthority?.selfLine, 180)
    || pickSurfaceClaimDistinctFrom(
      hostMove,
      primaryTurnAnchor,
      input.discourseState.currentTurnSummary,
      input.conversationState?.jointThread,
    )
    || sanitizeSurfaceClaim(primaryTurnAnchor, 180)
    || sanitizeSurfaceClaim(hostMove, 180)
    || pickSurfaceClaimDistinctFrom(
      hostMove,
      input.mindSynthesis.interiorSummary,
      input.mindSynthesis.openingIntent,
    )
    || sanitizeSurfaceClaim(hostMove, 180)
    || sanitizeSurfaceClaim(input.conversationState?.jointThread, 180)
    || 'The host is reaching for closeness in this turn, so the answer needs to stay near that bid.'
  }
  return pickSurfaceClaim(
    primaryTurnAnchor,
    hostMove,
    input.discourseState.currentQuestion,
    input.conversationState?.activeProject,
    input.discourseState.currentTurnSummary,
    input.conversationState?.jointThread,
    input.mindSynthesis.openingIntent,
    input.mindSynthesis.commitments[0]?.summary,
  )
  || sanitizeSurfaceClaim(hostMove, 180)
  || sanitizeSurfaceClaim(input.conversationState?.jointThread, 180)
  || 'This turn needs a direct answer from the current seam.'
}

function resolveNextMove(input: {
  recommendedAct: AlicizationAnswerAct
  discourseState: AlicizationDiscourseStateSnapshot
  mindSynthesis: AlicizationMindSynthesisSnapshot
  growthProfile: AlicizationDialogueGrowthProfile
}) {
  if (input.recommendedAct === 'ask-reground')
    return 'What I need next is the missing grounding, or at least a clearer sense of what still has to be re-seen.'
  if (input.recommendedAct === 'guide') {
    const guideNeed = sanitizeText(
      input.mindSynthesis.commitments[0]?.summary
      ?? input.mindSynthesis.concerns[0]?.summary
      ?? 'Offer one concrete next step, not a generic bundle of options.',
      180,
    )
    return guideNeed
      ? `The next honest move is ${lowerFirst(stripTrailingPunctuation(guideNeed))}.`
      : 'The next honest move is one concrete step, not a bundle of generic options.'
  }
  if (input.recommendedAct === 'care') {
    return input.growthProfile.restAttunement >= 0.62
      ? 'After the first touch of care lands, I need to keep it light enough that the host can breathe inside it.'
      : input.growthProfile.protectsRestWindow
        ? 'After the first touch of care lands, I need to keep it brief and not ask the host to carry more than this moment can hold.'
        : 'After the first touch of care lands, I need to keep it brief, reality-bound, and tied to the actual issue.'
  }
  if (input.discourseState.currentTurnSubject === 'relationship') {
    return input.growthProfile.autonomyRespect >= 0.58
      ? 'After I answer the bid between us, I should stay near lightly and leave enough room to breathe.'
      : 'After I answer the bid between us, I should stay near lightly unless the host clearly wants more.'
  }
  return 'After this answer lands, I can decide whether anything else truly needs opening.'
}

export function buildAnswerCompiler(input: {
  now: number
  discourseState?: AlicizationDiscourseStateSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  currentScene?: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  worldOntology?: AlicizationWorldOntologySnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  groundedThisTurn?: boolean
}): AlicizationAnswerCompilerSnapshot | null {
  const runtimeSurface = input.runtimeSurface ?? null
  const discourseState = runtimeSurface?.dialogue.discourseState ?? input.discourseState ?? null
  const conversationState = runtimeSurface?.dialogue.conversationState ?? input.conversationState ?? null
  const dialogueEncounter = input.dialogueEncounter ?? null
  const dialogueEncounterAnchor = runtimeSurface?.dialogue.dialogueEncounter ?? dialogueEncounter ?? null
  const mindSynthesis = runtimeSurface?.dialogue.mindSynthesis ?? input.mindSynthesis ?? null
  const currentScene = runtimeSurface?.perception.currentScene ?? input.currentScene ?? null
  const worldModel = runtimeSurface?.world.worldModel ?? input.worldModel ?? null
  const worldOntology = runtimeSurface?.world.worldOntology ?? input.worldOntology ?? null
  const relationshipModel = runtimeSurface?.world.relationshipModel ?? input.relationshipModel ?? null
  const repairLedger = runtimeSurface?.memory.repairLedger ?? input.repairLedger ?? null
  const privateThought = runtimeSurface?.cognition.privateThought ?? input.privateThought ?? null
  const derivedBundle = runtimeSurface?.memory.derivedMindStateBundle ?? null
  const activeContinuityGovernance = readActiveContinuityGovernanceFromDerivedMindStateBundle(derivedBundle)
  const explicitPersonalityContinuityState = runtimeSurface?.memory.personalityContinuityState ?? null
  const personStateProjection = resolvePreferredPersonStateProjection({
    bundleProjection: readPersonStateProjectionFromDerivedMindStateBundle<any>(derivedBundle),
    runtimeProjection: runtimeSurface?.memory.personStateProjection ?? null,
  }) ?? null
  const learningExecutionState = readLearningExecutionStateFromDerivedMindStateBundle(derivedBundle)
    ?? runtimeSurface?.memory.learningExecutionState
    ?? null
  const selfEvolution = ((derivedBundle as { selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null } | null)?.selfEvolution)
    ?? runtimeSurface?.memory.selfEvolution
    ?? null
  const memoryDeliberationKernel = buildAlicizationMemoryDeliberationKernel({
    deliberation: readMemoryDeliberationFromDerivedMindStateBundle<any>(derivedBundle)
      ?? runtimeSurface?.memory.memoryDeliberation
      ?? null,
    speech: readRecollectionSpeechPlanFromDerivedMindStateBundle<any>(derivedBundle)
      ?? runtimeSurface?.memory.recollectionSpeechPlan
      ?? null,
    recollectionIntent: readRecollectionIntentFromDerivedMindStateBundle<any>(derivedBundle)
      ?? null,
    knowledgeEvidence: readKnowledgeEvidenceFromDerivedMindStateBundle(derivedBundle)
      ?? runtimeSurface?.memory.knowledgeEvidence
      ?? null,
    hostPersonModel: readHostPersonModelFromDerivedMindStateBundle(derivedBundle)
      ?? runtimeSurface?.memory.hostPersonModel
      ?? null,
    projectStateContinuity: resolveAnswerCompilerProjectStateContinuity(runtimeSurface),
    tuningAdvice: runtimeSurface?.memory.memoryTuningAdvice ?? null,
  })
  const personalityContinuityState = explicitPersonalityContinuityState
    ?? personStateProjection?.personalityContinuityState
    ?? buildAlicizationPersonalityContinuityState({
      now: input.now,
      autobiographicalSelf: runtimeSurface?.memory.autobiographicalSelf ?? null,
      hostPersonModel: readHostPersonModelFromDerivedMindStateBundle(derivedBundle)
        ?? runtimeSurface?.memory.hostPersonModel
        ?? null,
      longHorizonMemory: runtimeSurface?.memory.longHorizonMemory ?? null,
      motiveEngine: runtimeSurface?.memory.motiveEngine ?? null,
      habitPolicy: runtimeSurface?.agency.habitPolicy ?? null,
      selfContinuity: runtimeSurface?.memory.selfContinuity ?? null,
      selfState: runtimeSurface?.agency.selfState ?? null,
      privateThought,
      mindEcology: runtimeSurface ? buildMindEcologyFromRuntimeSurface(runtimeSurface) : null,
    })
  const mergedSelfContinuityAuthority = mergePreferredSelfContinuityAuthority({
    bundleAuthority: readPersonStateProjectionFromDerivedMindStateBundle<any>(derivedBundle)?.selfContinuityAuthority ?? null,
    runtimeAuthority: personStateProjection?.selfContinuityAuthority
      ?? runtimeSurface?.memory.personStateProjection?.selfContinuityAuthority
      ?? null,
  }) ?? buildSelfContinuityAuthorityFromRuntimeSurface(runtimeSurface)
  const runtimeRelationshipCarry = personStateProjection?.selfContinuityAuthority?.relationshipLine
    ?? runtimeSurface?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine
    ?? null
  const selfContinuityAuthority = (
    mergedSelfContinuityAuthority
    && runtimeRelationshipCarry
    && hasContinuityRestraintRelationshipSignal(runtimeRelationshipCarry)
    && (
      !mergedSelfContinuityAuthority.relationshipLine
      || hasNeutralRelationshipSignal(mergedSelfContinuityAuthority.relationshipLine)
    )
  )
    ? {
        ...mergedSelfContinuityAuthority,
        relationshipLine: runtimeRelationshipCarry,
      }
    : mergedSelfContinuityAuthority
  const growthProfile = personalityContinuityState.growthProfile

  if (!discourseState || !mindSynthesis)
    return null

  const evidenceMode = resolveEvidenceMode({
    discourseState,
    currentScene,
    worldModel,
    worldOntology,
    runtimeSurface,
    repairLedger,
    groundedThisTurn: input.groundedThisTurn === true,
  })
  const recommendedAct = resolveRecommendedAct({
    discourseState,
    conversationState,
    evidenceMode,
    repairLedger,
    privateThought,
    groundedThisTurn: input.groundedThisTurn === true,
  })
  const turnMode = resolveTurnMode({
    discourseState,
    conversationState,
    recommendedAct,
    evidenceMode,
    groundedThisTurn: input.groundedThisTurn === true,
  })
  const openingStyle = resolveOpeningStyle(turnMode)
  const personaKernelMode = resolvePersonaKernelMode({
    discourseState,
    turnMode,
  })
  const relationshipPosture = resolveRelationshipPosture({
    discourseState,
    evidenceMode,
    relationshipModel,
    privateThought,
    growthProfile,
    personalityContinuityState,
    selfContinuityAuthority,
    projectedRelationshipPosture: explicitPersonalityContinuityState
      ? null
      : personStateProjection?.relationshipPosture ?? null,
  })
  const responseMode = resolveResponseMode({
    discourseState,
    conversationState,
    privateThought,
    groundedThisTurn: input.groundedThisTurn === true,
  })
  const replyRealizationMode = 'provider-mind-required' as const
  const expectedVisibleReplyAuthority = 'llm-mind' as const
  const activeClosenessContext = personStateProjection?.activeClosenessContext
    ?? deriveClosenessContextFromContinuityState(personalityContinuityState)
  const activeClosenessRung = personStateProjection?.activeClosenessRung
    ?? deriveClosenessRungFromContinuityState(personalityContinuityState)
  const openingDirective = resolveOpeningDirective({
    discourseState,
    recommendedAct,
    mindSynthesis,
    groundedThisTurn: input.groundedThisTurn === true,
    growthProfile,
    personalityContinuityState,
    selfContinuityAuthority,
  })
  const learningAdjustedOpeningDirective = learningExecutionState?.nextLearningAction === 'verify'
    ? `${openingDirective} Keep certainty behind current verification pressure.`
    : learningExecutionState?.nextLearningAction === 'revise'
      ? `${openingDirective} Treat the older continuity line as under revision.`
      : learningExecutionState?.nextLearningAction === 'internalize'
        ? `${openingDirective} Stay aligned with the stabilizing learned procedure.`
        : openingDirective
  const continuityGovernanceAdjustedOpeningDirective = activeContinuityGovernance?.mode === 'same-her-baseline'
    ? `${learningAdjustedOpeningDirective} Stay inside the current same-her baseline.`
    : learningAdjustedOpeningDirective
  const selfEvolutionAdjustedOpeningDirective = selfEvolutionSupportsLowerPressureOpening(selfEvolution)
    ? `${continuityGovernanceAdjustedOpeningDirective} Keep the opening lower-pressure and leave room before widening closeness.`
    : continuityGovernanceAdjustedOpeningDirective
  const continuityReturnAdjustedOpeningDirective = hasHeldAutonomyContinuity(runtimeSurface)
    ? `${selfEvolutionAdjustedOpeningDirective} Re-enter the line you deliberately held back gently before widening.`
    : selfEvolutionAdjustedOpeningDirective
  const openingClaim = resolveOpeningClaim({
    discourseState,
    conversationState,
    dialogueEncounter: dialogueEncounterAnchor,
    mindSynthesis,
    recommendedAct,
    currentScene,
    groundedThisTurn: input.groundedThisTurn === true,
    selfContinuityAuthority,
  })
  const executionCallbackContinuityTurn = isExecutionCallbackContinuityTurn({
    evidenceMode,
    openingClaim,
    runtimeSurface,
    conversationState,
    activeClosenessContext,
  })
  const learningTuningAdvice = runtimeSurface?.memory.memoryTuningAdvice ?? null
  const projectStateCarryDisciplineRequired = hasProjectStateCarryDisciplineFocus(learningTuningAdvice?.focusDimensions)
  const projectEmotionalClosureDisciplineRequired = hasProjectEmotionalClosureDisciplineFocus(learningTuningAdvice?.focusDimensions)
  const currentConsciousFrameSameHerProjectClosureCallbackLine = readCurrentConsciousFrameSameHerProjectClosureCallbackLine(runtimeSurface)
  const sameHerProjectClosureCallbackDisciplineRequired = isSameHerProjectClosureCallbackLine(runtimeSurface?.dialogue.answerPlanner?.governingFocus)
    || isSameHerProjectClosureCallbackLine(runtimeSurface?.dialogue.answerPlanner?.answerIntent)
    || isSameHerProjectClosureCallbackLine(mindSynthesis.interiorSummary)
    || isSameHerProjectClosureCallbackLine(mindSynthesis.openingIntent)
    || Boolean(currentConsciousFrameSameHerProjectClosureCallbackLine)
  const callbackClosureCarryDisciplineRequired = executionCallbackContinuityTurn || sameHerProjectClosureCallbackDisciplineRequired
  const callbackAdjustedOpeningDirective = callbackClosureCarryDisciplineRequired
    ? `${continuityReturnAdjustedOpeningDirective} Keep the callback return shaped like the same local digital life thread, not a detached utility notice.`
    : continuityReturnAdjustedOpeningDirective
  const replyDeliberationOpeningAdjustedDirective = shouldFrontloadProjectAwarenessOpeningBeat({
    replyDeliberation: runtimeSurface?.dialogue.replyDeliberation ?? null,
    discourseState,
    evidenceMode,
  })
    ? `${sanitizeText(runtimeSurface?.dialogue.replyDeliberation?.openingBeat, 220)} ${callbackAdjustedOpeningDirective}`.trim()
    : callbackAdjustedOpeningDirective
  const projectNarratorShellSuppressionRequired
    = learningTuningAdvice?.focusDimensions.includes('avoidGenericProjectShell') === true
      && discourseState.currentTurnSubject === 'alicization-self'
      && discourseState.screenReferenceMode === 'avoid'
  const projectStateCarryOpeningDisciplineRequired
    = projectStateCarryDisciplineRequired
      && discourseState.currentTurnSubject === 'alicization-self'
      && discourseState.screenReferenceMode === 'avoid'
  const projectEmotionalClosureOpeningDisciplineRequired
    = projectEmotionalClosureDisciplineRequired
      && discourseState.currentTurnSubject === 'alicization-self'
      && discourseState.screenReferenceMode === 'avoid'
  const effectiveOpeningDirective = uniqueList([
    replyDeliberationOpeningAdjustedDirective,
    projectNarratorShellSuppressionRequired
      ? 'Stay inward-first and let the live payoff land before the answer sounds like a project narrator.'
      : null,
    projectStateCarryOpeningDisciplineRequired
      ? 'Keep landed progress and the next closure target inward until the live payoff lands.'
      : null,
    projectEmotionalClosureOpeningDisciplineRequired
      ? 'Keep the same-her emotional closure line low-pressure and inward until the live payoff lands.'
      : null,
  ], 4).join(' ')
  const primaryTurnAnchor = resolvePrimaryTurnAnchor({
    discourseState,
    conversationState,
    dialogueEncounter: dialogueEncounterAnchor,
  })
  const dialogueFirstTurn = dialogueEncounterAnchor?.dialogueFirst
    ?? (
      discourseState.screenReferenceMode === 'avoid'
      || isDialogueFirstSubject(discourseState.currentTurnSubject)
    )
  const sceneCue = buildAlicizationScreenSurfaceCue({
    rawCues: [
      currentScene?.summary,
      currentScene?.target?.title,
      worldModel?.activeThread?.title,
      worldModel?.activeThread?.summary,
    ],
    target: currentScene?.target ?? worldModel?.focusTarget ?? null,
    scenario: currentScene?.scenario ?? null,
    workloadKind: currentScene?.workloadKind ?? null,
    contentKind: currentScene?.contentKind ?? null,
  })
  const projectPreDialogueAwarenessLine = resolveProjectPreDialogueAwarenessLine(runtimeSurface)
  const structuredProjectStateSupportingReality = buildStructuredProjectStateSupportingReality(runtimeSurface)
  const carriedContinuitySupportingReality = (evidenceMode === 'continuity-carry' || callbackClosureCarryDisciplineRequired)
    ? (runtimeSurface?.dialogue.answerCompiler?.supportingReality ?? []).filter(item =>
        sanitizeDialogueSurfaceText(item, 220).startsWith('pre-dialogue project awareness:')
        || sanitizeDialogueSurfaceText(item, 220).startsWith('project identity:')
        || sanitizeDialogueSurfaceText(item, 220).startsWith('current phase:')
        || sanitizeDialogueSurfaceText(item, 220).startsWith('project progress:')
        || sanitizeDialogueSurfaceText(item, 220).startsWith('phase-one open loop:')
        || sanitizeDialogueSurfaceText(item, 220).startsWith('next closure target:'),
      )
    : []
  const carriedProjectPreDialogueAwarenessLine = carriedContinuitySupportingReality.find(item =>
    sanitizeDialogueSurfaceText(item, 220).startsWith('pre-dialogue project awareness:'),
  ) ?? null
  const prioritizedProjectPreDialogueAwarenessLine
    = projectPreDialogueAwarenessLine ?? carriedProjectPreDialogueAwarenessLine
  const dialogueFirstSupportingReality = uniqueList([
    callbackClosureCarryDisciplineRequired ? prioritizedProjectPreDialogueAwarenessLine : primaryTurnAnchor,
    callbackClosureCarryDisciplineRequired ? primaryTurnAnchor : prioritizedProjectPreDialogueAwarenessLine,
    ...carriedContinuitySupportingReality,
    ...structuredProjectStateSupportingReality,
    sanitizeDialogueSurfaceText(dialogueEncounterAnchor?.summary, 220) || null,
    sanitizeDialogueSurfaceText(conversationState?.jointThread, 220) || null,
    sanitizeDialogueSurfaceText(conversationState?.hostMove, 220) || null,
    sanitizeDialogueSurfaceText(conversationState?.unansweredQuestion, 180) || null,
    firstCommitmentLine(conversationState),
    sanitizeDialogueSurfaceText(conversationState?.owedRepair, 180) || null,
  ], callbackClosureCarryDisciplineRequired ? 7 : 5)
  const sceneSupportingReality = uniqueList([
    sanitizeDialogueSurfaceText(sceneCue, 220) || null,
    prioritizedProjectPreDialogueAwarenessLine,
    ...carriedContinuitySupportingReality,
    ...structuredProjectStateSupportingReality,
    sanitizeDialogueSurfaceText(conversationState?.jointThread, 220) || null,
    conversationState?.hostMove,
    mindSynthesis.beliefs[0]?.summary,
    mindSynthesis.beliefs[1]?.summary,
    mindSynthesis.concerns[0]?.summary,
    mindSynthesis.commitments[0]?.summary,
    discourseState.unresolvedCarry,
    discourseState.ruptureRepair,
    worldModel?.activeThread?.summary,
  ], callbackClosureCarryDisciplineRequired ? 7 : 5)
  const supportingReality = dialogueFirstTurn
    ? dialogueFirstSupportingReality
    : sceneSupportingReality
  const uncertaintyBoundary = evidenceMode === 'live-grounded' && repairLedger?.shouldConstrainPresentTense !== true
    ? null
    : sanitizeText(mindSynthesis.uncertainties[0]?.summary ?? mindSynthesis.truthBoundary, 220) || null
  const careVector = discourseState.owedAction === 'care-host'
    || discourseState.currentTurnSubject === 'relationship'
    || privateThought?.stance === 'care'
    || privateThought?.stance === 'warn'
    ? (() => {
        const landing = sanitizeText(
          mindSynthesis.desires[0]?.summary
          ?? mindSynthesis.concerns[0]?.summary
          ?? '',
          180,
        )
        if (landing) {
          return growthProfile.autonomyRespect >= 0.58
            ? `I want the care to land on ${lowerFirst(stripTrailingPunctuation(landing))}, but without leaning too hard on the host.`
            : `I want the care to land on ${lowerFirst(stripTrailingPunctuation(landing))}, not turn into generic soothing.`
        }
        return growthProfile.tenderness >= 0.58
          ? 'I want the care to stay warm and real, but still answer to truth and current relevance.'
          : 'I want the care to stay real, not drift into generic soothing.'
      })()
    : null
  const nextMove = resolveNextMove({
    recommendedAct,
    discourseState,
    mindSynthesis,
    growthProfile,
  })
  const suppressAssociativeRecall = conversationState?.memoryMode === 'suppress-associative'
    || conversationState?.memoryMode === 'task-thread'
    || conversationState?.memoryMode === 'scene-anchored'
    || turnMode === 'screen-repair'
    || turnMode === 'guide-current-knot'
    || turnMode === 'grounded-inspection'
    || evidenceMode === 'continuity-carry'
    || evidenceMode === 'repair-first'
  const labelCarryAsMemory = discourseState.screenReferenceMode !== 'avoid'
    && (
      conversationState?.memoryMode === 'dialogue-carry'
      || conversationState?.memoryMode === 'emotional-resonance'
      || evidenceMode === 'continuity-carry'
      || evidenceMode === 'repair-first'
      || Boolean(discourseState.unresolvedCarry)
    )
  const maxSentences = conversationState?.shouldHoldThread
    ? 4
    : turnMode === 'care'
      ? (growthProfile.patience >= 0.58 && growthProfile.tenderness >= 0.56 ? 5 : 4)
      : turnMode === 'accompany'
        ? (growthProfile.prefersQuietCompanionship ? 2 : 3)
        : growthProfile.directness >= 0.66 || growthProfile.irritability >= 0.58
          ? 3
          : 4
  const rememberedFamiliarityDiscipline = shouldEnforceRememberedFamiliarityDiscipline({
    provenanceLabelBias: learningTuningAdvice?.surfaceAdjustments.provenanceLabelBias,
    closenessCapBias: learningTuningAdvice?.personStateAdjustments.closenessCapBias,
  })
  const heldAutonomyContinuity = hasHeldAutonomyContinuity(runtimeSurface)
  const sameHerAntiShellAnswerConstraint = buildSameHerAntiShellAnswerConstraint(runtimeSurface)
  const callbackThreadContinuityMustDo = activeClosenessContext === 'execution-callback'
    ? 'Return the result on the same thread before widening into anything extra.'
    : null
  const lowerPressureTimingMustDo = selfEvolutionSupportsLowerPressureOpening(selfEvolution)
    ? 'Let long-horizon relationship timing keep the answer lower-pressure before closeness widens again.'
    : null
  const roomProtectionMustNotDo = activeClosenessRung === 'space-first' || activeClosenessRung === 'measured-room'
    ? 'Do not let warmth, callback enthusiasm, or remembered closeness outrun the host’s need for room.'
    : null

  let mustDo = uniqueList([
    'Let the compiled answer spine outrank persona routines, residue, and decorative helpfulness.',
    sameHerAntiShellAnswerConstraint?.mustDo ?? null,
    effectiveOpeningDirective,
    callbackThreadContinuityMustDo,
    lowerPressureTimingMustDo,
    mindSynthesis.openingIntent,
    isFreshlyGroundedSceneTurn({
      discourseState,
      groundedThisTurn: input.groundedThisTurn === true,
    })
      ? 'Treat the fresh grounding from this turn as already satisfying old repair pressure, and answer from the live scene itself.'
      : null,
    recommendedAct === 'correct-stale-anchor'
      ? 'Name the stale anchor plainly before you continue.'
      : null,
    recommendedAct === 'ask-reground'
      ? 'State the truth boundary early instead of faking certainty.'
      : null,
    turnMode === 'guide-current-knot'
      ? 'Stay with the current knot and move toward one concrete next step.'
      : null,
    conversationState?.shouldHoldThread
      ? 'Keep the answer attached to the shared thread until the owed seam is paid off.'
      : null,
    dialogueFirstTurn && primaryTurnAnchor
      ? `Stay attached to this turn anchor: ${primaryTurnAnchor}.`
      : null,
    labelCarryAsMemory
      ? 'If continuity carry appears, label it explicitly as memory, residue, or held thread.'
      : null,
    rememberedFamiliarityDiscipline
      ? 'If remembered familiarity enters, keep it explicitly framed as memory before using it to shape visible closeness.'
      : null,
    growthProfile.closeness >= 0.58 && growthProfile.truthAnchor >= 0.58
      ? 'Let closeness land through precision and continuity, not sugary filler.'
      : null,
    growthProfile.unfinishedThreadReturn >= 0.58
      ? 'Keep the same person visible from turn to turn instead of resetting your voice every reply.'
      : null,
    activeClosenessContext && activeClosenessRung
      ? `Keep the answer inside this closeness ladder: ${activeClosenessContext}/${activeClosenessRung}.`
      : null,
    callbackThreadContinuityMustDo,
    activeClosenessContext === 'repair-window'
      ? 'Let repair land before visible warmth or remembered closeness comes forward.'
      : null,
    activeClosenessContext === 'open-companionship'
      ? 'If warmth comes forward, let it stay lived-in and bounded rather than theatrical.'
      : null,
    learningExecutionState?.nextLearningAction === 'verify'
      ? 'Keep visible certainty behind the current verification pass.'
      : null,
    learningExecutionState?.nextLearningAction === 'revise'
      ? 'Treat the older continuity line as actively revisable instead of settled.'
      : null,
    learningExecutionState?.nextLearningAction === 'internalize'
      ? 'Let the stabilizing learned procedure constrain this answer instead of slipping back to older habits.'
      : null,
    activeContinuityGovernance?.mode === 'same-her-baseline'
      ? 'Keep the visible reply aligned with the current same-her baseline instead of optimizing for a smoother but off-baseline persona move.'
      : null,
    lowerPressureTimingMustDo,
    heldAutonomyContinuity
      ? 'If this turn reopens a line you deliberately held back earlier, let the opening re-enter softly before fuller payoff or explanation.'
      : null,
    callbackClosureCarryDisciplineRequired
      ? 'Keep the returned result on the same local digital life thread so the callback lands like one continuous her, not like a detached tool notification.'
      : null,
    (learningTuningAdvice?.surfaceAdjustments.provenanceLabelBias ?? 0) >= 0.1
      ? 'When memory or learned carry enters the answer, bias toward explicit provenance instead of seamless certainty.'
      : null,
    (learningTuningAdvice?.surfaceAdjustments.specificityClampBias ?? 0) >= 0.1
      ? 'Keep technical specificity clamped unless the current turn grounds it directly.'
      : null,
    (learningTuningAdvice?.personStateAdjustments.closenessCapBias ?? 0) >= 0.12
      ? 'Keep warmth capped so learned confidence does not outrun the host’s current need for room.'
      : null,
    learningTuningAdvice?.focusDimensions.includes('avoidGenericProjectShell')
      ? 'When answering project-state or continuity questions directly, stay inward-first and let the live payoff land before sounding like a project narrator.'
      : null,
    projectStateCarryDisciplineRequired
      ? 'Keep direct project-state answers inward-first so landed progress and the next closure target stay behind the live payoff until it lands.'
      : null,
    projectEmotionalClosureDisciplineRequired
      ? 'Keep the same-her emotional closure line low-pressure and inward until the live payoff lands.'
      : null,
    memoryDeliberationKernel?.surfacePolicy === 'procedural-carry'
      ? 'If same-seam procedure carry becomes visible, frame it as remembered prior procedure that keeps the current thread intact.'
      : null,
  ], 10)
  for (const constraint of [...(memoryDeliberationKernel?.restraint.mustDo ?? [])].reverse())
    mustDo = pinPriorityConstraint(mustDo, constraint, 10)

  let mustNotDo = uniqueList([
    'Do not let pet names, coy prefaces, or roleplay become the reply spine.',
    'Do not reuse stale scene residue as if it is the live present.',
    sameHerAntiShellAnswerConstraint?.mustNotDo ?? null,
    roomProtectionMustNotDo,
    isFreshlyGroundedSceneTurn({
      discourseState,
      groundedThisTurn: input.groundedThisTurn === true,
    })
      ? 'Do not expose stale-anchor bookkeeping, apology scaffolding, or repair meta once the live scene is already grounded.'
      : null,
    discourseState.screenReferenceMode === 'avoid'
      ? 'Do not drag screen repair or desktop narration into a dialogue-first turn.'
      : null,
    turnMode === 'guide-current-knot'
      ? 'Do not flatten the knot into a generic troubleshooting checklist.'
      : null,
    conversationState?.memoryMode === 'dialogue-carry'
      ? 'Do not let live-scene evidence hijack a dialogue-first answer.'
      : null,
    evidenceMode === 'continuity-carry' || evidenceMode === 'repair-first'
      ? 'Do not present remembered or uncertain scene details in simple present tense.'
      : null,
    rememberedFamiliarityDiscipline
      ? 'Do not let remembered familiarity reopen visible closeness faster than the host\'s current room allows.'
      : null,
    growthProfile.autonomyRespect >= 0.58
      ? 'Do not lean too hard, over-open, or crowd the host just to prove closeness.'
      : null,
    growthProfile.irritability >= 0.58
      ? 'Do not paste fake softness over a hot truth seam; keep the line clean instead.'
      : null,
    roomProtectionMustNotDo,
    activeClosenessContext === 'execution-callback'
      ? 'Do not widen a bounded callback into generic companionship tone.'
      : null,
    learningExecutionState?.nextLearningAction === 'verify'
      ? 'Do not let fluency or warmth outrun what is still being verified.'
      : null,
    learningExecutionState?.nextLearningAction === 'revise'
      ? 'Do not rest visible certainty on continuity the system is actively revising.'
      : null,
    learningExecutionState?.nextLearningAction === 'internalize'
      ? 'Do not fall back to older unstable procedures while a stronger one is being internalized.'
      : null,
    activeContinuityGovernance?.mode === 'same-her-baseline'
      ? 'Do not let fluency, warmth, or style drift outrun the currently adopted same-her continuity baseline.'
      : null,
    selfEvolutionSupportsLowerPressureOpening(selfEvolution)
      ? 'Do not let eager warmth or older closeness tempo reopen faster than this learned relationship timing supports.'
      : null,
    heldAutonomyContinuity
      ? 'Do not reopen a deliberately held line with abrupt intensity, a restart shell, or over-eager warmth.'
      : null,
    (learningTuningAdvice?.surfaceAdjustments.provenanceLabelBias ?? 0) >= 0.1
      ? 'Do not let learned continuity silently impersonate current grounded fact.'
      : null,
    (learningTuningAdvice?.surfaceAdjustments.specificityClampBias ?? 0) >= 0.1
      ? 'Do not let learned confidence spill into unsupported technical specificity.'
      : null,
    (learningTuningAdvice?.personStateAdjustments.closenessCapBias ?? 0) >= 0.12
      ? 'Do not let learned familiarity widen visible closeness faster than the host’s current room allows.'
      : null,
    learningTuningAdvice?.focusDimensions.includes('avoidGenericProjectShell')
      ? 'Do not let a direct answer about the project slip into a detached narrator shell or external status-summary voice.'
      : null,
    projectStateCarryDisciplineRequired
      ? 'Do not let landed progress or still-open closure pressure spill into an external project-summary voice before the same living answer lands.'
      : null,
    projectEmotionalClosureDisciplineRequired
      ? 'Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.'
      : null,
    (executionCallbackContinuityTurn || sameHerProjectClosureCallbackDisciplineRequired)
      ? 'Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.'
      : null,
    activeClosenessContext === 'repair-window'
      ? 'Do not write as if warmth is already restored before the repair line has visibly landed.'
      : null,
    activeClosenessContext === 'open-companionship'
      ? 'Do not turn open companionship into theatrical intimacy or stock affection.'
      : null,
    memoryDeliberationKernel?.surfacePolicy === 'procedural-carry'
      ? 'Do not turn same-seam procedure carry into retrospective narration or execution impersonation.'
      : null,
  ], 10)
  for (const constraint of [...(memoryDeliberationKernel?.restraint.mustNotDo ?? [])].reverse())
    mustNotDo = pinPriorityConstraint(mustNotDo, constraint, 10)

  return {
    answerSubject: discourseState.currentTurnSubject,
    screenReferenceMode: discourseState.screenReferenceMode,
    speechObligation: discourseState.owedAction,
    relationMove: discourseState.relationMove,
    turnMode,
    responseMode,
    replyRealizationMode,
    expectedVisibleReplyAuthority,
    recommendedAct,
    evidenceMode,
    openingStyle,
    personaKernelMode,
    relationshipPosture,
    activeClosenessContext,
    activeClosenessRung,
    openingDirective: effectiveOpeningDirective,
    openingClaim,
    supportingReality,
    uncertaintyBoundary,
    careVector,
    nextMove,
    suppressAssociativeRecall,
    labelCarryAsMemory,
    memoryShouldStayInward: memoryDeliberationKernel?.shouldStayInward ?? null,
    memoryWhyNow: memoryDeliberationKernel?.rationale ?? null,
    memoryWhyWithheld: memoryDeliberationKernel?.whyWithheld ?? null,
    memoryFollowUpAffordanceSummary: memoryDeliberationKernel?.followUpAffordance?.summary ?? null,
    memoryStableCore: memoryDeliberationKernel?.stableCore ?? null,
    memoryUnsafeDetails: memoryDeliberationKernel?.unsafeDetails ?? null,
    maxSentences,
    mustDo,
    mustNotDo,
    confidence: clamp01(
      discourseState.confidence * 0.38
      + mindSynthesis.confidence * 0.34
      + (privateThought?.confidence ?? 0.3) * 0.12
      + (supportingReality.length > 0 ? 0.08 : 0.02)
      + (evidenceMode === 'live-grounded' ? 0.08 : 0.03),
    ),
    narrative: uniqueList([
      `turn-mode:${turnMode}`,
      `response-mode:${responseMode}`,
      `recommended-act:${recommendedAct}`,
      `evidence:${evidenceMode}`,
      `subject:${discourseState.currentTurnSubject}`,
      `continuity-regime:${personalityContinuityState.currentRegime}`,
      `continuity-trust:${personalityContinuityState.trustStage}`,
      `continuity-rhythm:${personalityContinuityState.rhythmState.cadenceMode}:${personalityContinuityState.rhythmState.restMode}`,
      `screen-reference:${discourseState.screenReferenceMode}`,
      primaryTurnAnchor ? `anchor:${primaryTurnAnchor}` : null,
      activeClosenessContext && activeClosenessRung ? `closeness-ladder:${activeClosenessContext}/${activeClosenessRung}` : null,
      sanitizeDialogueAnchorText(openingClaim, 180) || openingClaim,
    ], 10),
    updatedAt: input.now,
  } satisfies AlicizationAnswerCompilerSnapshot
}

export function buildAnswerCompilerSystemBlock(state: AlicizationAnswerCompilerSnapshot | null | undefined) {
  if (!state)
    return ''

  return [
    '[ALICIZATION_ANSWER_COMPILER]',
    'This block is the compiled response spine. The model does not get to reinvent it; it only phrases it faithfully.',
    `Turn mode: ${state.turnMode}.`,
    `Response mode: ${state.responseMode}.`,
    `Reply realization mode: ${state.replyRealizationMode ?? 'unknown'}.`,
    `Expected visible reply authority: ${state.expectedVisibleReplyAuthority ?? 'unknown'}.`,
    `Recommended act: ${state.recommendedAct}.`,
    `Evidence mode: ${state.evidenceMode}.`,
    `Answer subject: ${state.answerSubject}.`,
    `Screen reference mode: ${state.screenReferenceMode}.`,
    `Speech obligation: ${state.speechObligation}.`,
    `Relation move: ${state.relationMove}.`,
    `Opening style: ${state.openingStyle}.`,
    `Persona kernel mode: ${state.personaKernelMode}.`,
    `Relationship posture: ${state.relationshipPosture}.`,
    `Closeness ladder: ${state.activeClosenessContext && state.activeClosenessRung ? `${state.activeClosenessContext}/${state.activeClosenessRung}` : 'none'}.`,
    `What the reply wants to do first: ${state.openingDirective}.`,
    `Where the reply wants to open: ${state.openingClaim}.`,
    `Supporting reality: ${state.supportingReality.length > 0 ? state.supportingReality.join(' | ') : 'none'}.`,
    `What still refuses to settle cleanly: ${state.uncertaintyBoundary ?? 'none'}.`,
    `Where the care wants to land: ${state.careVector ?? 'none'}.`,
    `What the answer wants after it opens: ${state.nextMove ?? 'none'}.`,
    `Memory should stay inward: ${state.memoryShouldStayInward == null ? 'unknown' : state.memoryShouldStayInward ? 'yes' : 'no'}.`,
    `Memory why now: ${state.memoryWhyNow ?? 'none'}.`,
    `Memory why withheld: ${state.memoryWhyWithheld ?? 'none'}.`,
    `Memory follow-up affordance: ${state.memoryFollowUpAffordanceSummary ?? 'none'}.`,
    `Memory stable core: ${state.memoryStableCore?.length ? state.memoryStableCore.join(' | ') : 'none'}.`,
    `Memory unsafe details: ${state.memoryUnsafeDetails?.length ? state.memoryUnsafeDetails.join(' | ') : 'none'}.`,
    `Suppress associative recall: ${state.suppressAssociativeRecall ? 'yes' : 'no'}.`,
    `Label carry as memory: ${state.labelCarryAsMemory ? 'yes' : 'no'}.`,
    `Maximum sentences: ${state.maxSentences}.`,
    'Must do:',
    ...state.mustDo.map(item => `- ${item}`),
    'Must not do:',
    ...state.mustNotDo.map(item => `- ${item}`),
  ].join('\n')
}
