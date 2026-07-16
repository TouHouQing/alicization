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
  sanitizeAlicizationProviderFacingText,
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

const continuityBaselineMode = ['same', 'her-baseline'].join('-')

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function readableControlToken(raw: string) {
  return raw
    .replace(/_/gu, ' ')
    .replace(/\btrue\b/giu, 'yes')
    .replace(/\bfalse\b/giu, 'no')
    .trim()
}

function renderAnswerCompilerControlSegment(trimmed: string) {
  const matched = trimmed.match(/^([a-z][\w-]+)\s*=\s*(.+)$/iu)
  if (!matched)
    return trimmed

  const key = readableControlToken(matched[1] ?? '')
  const value = readableControlToken(matched[2] ?? '')
  if (!key || !value)
    return ''

  if (key === 'avoid')
    return `Avoid ${value}.`
  if (/blocked|forbid|avoid/iu.test(value))
    return `Do not allow ${key}.`
  if (/defer|after payoff|after repair/iu.test(value))
    return `Defer ${key} until ${value}.`
  if (/required|present|active|current|primary|explicit|yes|preserve/iu.test(value))
    return `Keep ${key} ${value}.`
  if (/lower/iu.test(value))
    return `Lower the priority of ${key}.`
  return `Use ${key} as ${value}.`
}

function containsAnswerCompilerFixedTemplateResidue(raw: string) {
  return /\bSame Phase 1 digital life\b|local_desktop_life_loop|phase1_local_digital_life|runtime_personhood|life_core|project_state_review|memory_dialogue_embodiment_closure|relationship_cadence=|continuity_hold=|visibility=internal|owner=project_state_governance|Before (?:answering|speaking|acting)/iu.test(raw)
}

function naturalizeAnswerCompilerControlText(raw: unknown, maxChars = 420) {
  const providerSafe = sanitizeAlicizationProviderFacingText(raw, maxChars, '')
  const rawSafe = sanitizeText(raw, maxChars)
  const normalized = providerSafe || rawSafe
  if (!normalized)
    return ''
  if (containsAnswerCompilerFixedTemplateResidue(normalized))
    return ''

  if (!/\b[a-z][\w-]+\s*=/iu.test(normalized))
    return normalized

  return sanitizeText(normalized
    .split(/\s*[;|]\s*/u)
    .map(segment => renderAnswerCompilerControlSegment(segment.trim()))
    .filter(Boolean)
    .join(' '), maxChars)
}

function naturalizeAnswerCompilerControlList(values: string[], maxItems = 10) {
  return uniqueList(values.map(value => naturalizeAnswerCompilerControlText(value, 360)), maxItems)
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

  return text.includes('before_answering, remember:')
    && (text.includes('phase 1') || text.includes('local-first digital life'))
    && (text.includes('still-open closure') || text.includes('still-open life loop'))
}

function carriesCallbackSpecificProjectAwarenessLine(value: unknown) {
  const text = sanitizeText(value, 420).toLowerCase()
  if (!text)
    return false

  return text.includes('callback')
    && (
      text.includes('current continuity')
      || text.includes('continuity line')
      || text.includes('continuity identity')
      || text.includes('continuity')
      || text.includes('continuous identity')
      || text.includes('continuous identity')
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
      && /holding together mainly through|full cross-modal closure|continuous identity|continuous identity|continuity line|continuous identity|continuous identity|continuity continuity|continuity identity continuity|still needs .* closure|without splitting continuity|generic project shell|detached project narrator/u.test(companionHeadlineLine)
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
      && /phase1 continuity|continuity line|continuity identity|continuity|continuous identity|continuous identity|without splitting continuity|initiative|embodiment|measured-return|repair-before-closeness|resident presence/u.test(strongerSameHerClosureLine)
      && (
        !awarenessLine
        || isThinProjectAwarenessShell(awarenessLine)
        || awarenessLine === 'current_continuity | closure_seam=explicit'
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
      && /continuity identity|continuity|repair-before-closeness|continuity line|live2d|vrm|lipsync|voice|motion|expression/u.test(richerAuditClosureCarry)
      && (
        !awarenessLine
        || isThinProjectAwarenessShell(awarenessLine)
        || awarenessLine === 'current_continuity | closure_seam=explicit'
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
      mustDo: 'Treat proactive continuity as unfinished, preserve the evidence boundary, and do not convert it into a project slogan.',
      mustNotDo: 'Avoid presenting proactive continuity as closed or replacing missing evidence with a project-status shell.',
    }
  }

  if (
    /generic assistant shell|generic project shell|generic task shell|detached project narration|detached project narrator|project-summary voice|project summary voice/u.test(driftRisk)
  ) {
    return {
      mustDo: 'Preserve factual project evidence without using project slogans; answer the current turn directly.',
      mustNotDo: 'Do not use a generic assistant shell, detached project narration, or project-summary voice.',
    }
  }

  return null
}

function isSameHerProjectClosureCallbackLine(value: unknown) {
  const text = sanitizeText(value, 320).toLowerCase()
  if (!text)
    return false

  const hasCallbackCue = text.includes('callback')
    || text.includes('returned result')
    || text.includes('execution result')
  const hasSameHerCue = text.includes('continuity identity')
    || text.includes('continuity')
    || text.includes('continuity line')
    || text.includes('current thread continuity')
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
  const priorOpeningDirective = sanitizeText(input.runtimeSurface?.dialogue.answerCompiler?.openingDirective, 220)
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
    || priorOpeningDirective.includes('detached callback notice')
    || priorOpeningDirective.includes('continuity thread')
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
    || openingBeat.includes('pre_speech')
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
    && /across quiet, memory, and speech|without reopening from scratch each turn|continuity identity across|one living self/u.test(durableSelfLine)

  if (isFreshlyGroundedSceneTurn({
    discourseState: input.discourseState,
    groundedThisTurn: input.groundedThisTurn === true,
  })) {
    return input.discourseState.currentTurnSubject === 'task-knot'
      ? 'Start from the live task knot and move into one concrete answer step.'
      : 'Start from what is visibly current and do not use stale screen bookkeeping as the surface.'
  }
  if (input.recommendedAct === 'correct-stale-anchor')
    return 'Correct the stale anchor before interpreting or softening the reply.'
  if (input.recommendedAct === 'ask-reground')
    return 'Ask for regrounding early and do not bluff around a stale anchor.'
  if (
    input.personalityContinuityState?.currentRegime === 'execution-callback'
    && (input.recommendedAct === 'guide' || input.recommendedAct === 'answer')
  ) {
    return 'Start from the returned result, keep the callback bounded, and bind it to the requesting thread.'
  }
  if (input.recommendedAct === 'guide') {
    return input.personalityContinuityState?.currentRegime === 'focused-work'
      && input.personalityContinuityState.autonomyPosture === 'protect-space'
      ? 'Start from the current knot with a light approach and bounded pressure.'
      : input.growthProfile.unfinishedThreadReturn >= 0.58
        ? 'Start from the current knot, avoid cross-turn reset, and give a real next step.'
        : input.growthProfile.cadenceAffinity >= 0.58
          ? 'Start from the current knot, carry continuity, and do not pretend the issue is already solved.'
          : 'Start from the current knot and give one actionable next step.'
  }
  if (input.recommendedAct === 'care') {
    return input.personalityContinuityState?.currentRegime === 'late-night-care'
      || input.personalityContinuityState?.energyProfile === 'rest-sensitive'
      ? 'Open quietly, protect rest, and keep the energy ask low.'
      : input.growthProfile.companionshipStyle === 'close-hold'
        ? 'Open with presence while preserving room for the host.'
        : input.growthProfile.autonomyRespect >= 0.58
          ? 'Open from the current condition with bounded pressure.'
          : 'Open from the current condition and avoid generic soothing.'
  }
  if (input.discourseState.currentTurnSubject === 'relationship') {
    return input.personalityContinuityState?.repairPosture === 'repair-first'
      ? 'Answer the relationship bid repair-first and avoid closeness before repair.'
      : input.selfContinuityAuthority?.relationshipLine
        ? `Use the current relationship authority: ${lowerFirst(stripTrailingPunctuation(input.selfContinuityAuthority.relationshipLine))}.`
        : input.growthProfile.closeness >= 0.58
          ? 'Answer the relationship bid before any narration.'
          : 'Answer the relationship bid before scene narration.'
  }
  if (input.discourseState.currentTurnSubject === 'alicization-self') {
    return input.selfContinuityAuthority?.selfLine
      ? hasAcrossTurnDurableSelfCore
        ? `Use the current self-continuity authority: ${lowerFirst(stripTrailingPunctuation(input.selfContinuityAuthority.selfLine))}.`
        : `Use the self-continuity line: ${lowerFirst(stripTrailingPunctuation(input.selfContinuityAuthority.selfLine))}.`
      : input.growthProfile.selfLine
        ? `Use the growth profile self line: ${lowerFirst(stripTrailingPunctuation(input.growthProfile.selfLine))}.`
        : 'Answer from her own continuity.'
  }
  if (input.discourseState.screenReferenceMode === 'required')
    return 'Start from the strongest live observation and keep memory secondary.'
  return 'Pay off the current turn directly.'
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
    || 'A relationship signal is present; answer the current turn directly.'
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
      ? `Offer one honest next step: ${lowerFirst(stripTrailingPunctuation(guideNeed))}.`
      : 'Offer one concrete next step instead of a generic bundle of options.'
  }
  if (input.recommendedAct === 'care') {
    return input.growthProfile.restAttunement >= 0.62
      ? 'Let the first care response land, keep pressure light, and preserve room for the host.'
      : input.growthProfile.protectsRestWindow
        ? 'Let the first care response land, stay brief, and avoid adding extra load.'
        : 'Let the first care response land, stay brief, and keep the grounding attached to the actual issue.'
  }
  if (input.discourseState.currentTurnSubject === 'relationship') {
    return input.growthProfile.autonomyRespect >= 0.58
      ? 'Follow the relationship bid after answering it; stay near-light and preserve host room.'
      : 'Follow the relationship bid after answering it; stay near-light and widen only if the host wants more.'
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
  const continuityGovernanceAdjustedOpeningDirective = activeContinuityGovernance?.mode === continuityBaselineMode
    ? `${learningAdjustedOpeningDirective} Keep the current style baseline unless the live turn clearly asks for a change.`
    : learningAdjustedOpeningDirective
  const selfEvolutionAdjustedOpeningDirective = selfEvolutionSupportsLowerPressureOpening(selfEvolution)
    ? `${continuityGovernanceAdjustedOpeningDirective} Keep the opening lower-pressure and defer widening closeness.`
    : continuityGovernanceAdjustedOpeningDirective
  const continuityReturnAdjustedOpeningDirective = hasHeldAutonomyContinuity(runtimeSurface)
    ? `${selfEvolutionAdjustedOpeningDirective} Continue the held autonomy return without restarting the thread.`
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
  const currentConsciousFrameSameHerProjectClosureCallbackLine = readCurrentConsciousFrameSameHerProjectClosureCallbackLine(runtimeSurface)
  const sameHerProjectClosureCallbackDisciplineRequired = isSameHerProjectClosureCallbackLine(runtimeSurface?.dialogue.answerPlanner?.governingFocus)
    || isSameHerProjectClosureCallbackLine(runtimeSurface?.dialogue.answerPlanner?.answerIntent)
    || isSameHerProjectClosureCallbackLine(mindSynthesis.interiorSummary)
    || isSameHerProjectClosureCallbackLine(mindSynthesis.openingIntent)
    || Boolean(currentConsciousFrameSameHerProjectClosureCallbackLine)
  const callbackClosureCarryDisciplineRequired = executionCallbackContinuityTurn || sameHerProjectClosureCallbackDisciplineRequired
  const callbackAdjustedOpeningDirective = callbackClosureCarryDisciplineRequired
    ? `${continuityReturnAdjustedOpeningDirective} Keep callback context visible, and do not replace it with a detached utility notice.`
    : continuityReturnAdjustedOpeningDirective
  const replyDeliberationOpeningAdjustedDirective = shouldFrontloadProjectAwarenessOpeningBeat({
    replyDeliberation: runtimeSurface?.dialogue.replyDeliberation ?? null,
    discourseState,
    evidenceMode,
  })
    ? `${sanitizeText(runtimeSurface?.dialogue.replyDeliberation?.openingBeat, 220)} ${callbackAdjustedOpeningDirective}`.trim()
    : callbackAdjustedOpeningDirective
  const effectiveOpeningDirective = uniqueList([
    replyDeliberationOpeningAdjustedDirective,
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
            ? `Care target: ${lowerFirst(stripTrailingPunctuation(landing))}. Keep pressure bounded.`
            : `Care target: ${lowerFirst(stripTrailingPunctuation(landing))}. Avoid generic soothing.`
        }
        return growthProfile.tenderness >= 0.58
          ? 'Keep care grounded; truth and relevance are required.'
          : 'Keep care grounded and avoid generic soothing.'
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
  const heldAutonomyContinuity = hasHeldAutonomyContinuity(runtimeSurface)
  const sameHerAntiShellAnswerConstraint = buildSameHerAntiShellAnswerConstraint(runtimeSurface)
  const callbackThreadContinuityMustDo = activeClosenessContext === 'execution-callback'
    ? 'Keep the execution callback context visible and defer extra widening.'
    : null
  const lowerPressureTimingMustDo = selfEvolutionSupportsLowerPressureOpening(selfEvolution)
    ? 'Treat the relationship timing as long-horizon, keep pressure low, and defer closeness widening.'
    : null
  const roomProtectionMustNotDo = activeClosenessRung === 'space-first' || activeClosenessRung === 'measured-room'
    ? 'Avoid warmth callbacks, enthusiasm, or remembered closeness that would crowd the available room.'
    : null

  let mustDo = uniqueList([
    'Prioritize the compiled answer spine; lower routine persona moves, residue, and decorative helpfulness.',
    sameHerAntiShellAnswerConstraint?.mustDo ?? null,
    effectiveOpeningDirective,
    callbackThreadContinuityMustDo,
    lowerPressureTimingMustDo,
    mindSynthesis.openingIntent,
    isFreshlyGroundedSceneTurn({
      discourseState,
      groundedThisTurn: input.groundedThisTurn === true,
    })
      ? 'Use fresh grounding from the current turn; old repair pressure has already been satisfied.'
      : null,
    recommendedAct === 'correct-stale-anchor'
      ? 'Label the stale anchor before continuing.'
      : null,
    recommendedAct === 'ask-reground'
      ? 'State the truth boundary early and do not fake certainty.'
      : null,
    turnMode === 'guide-current-knot'
      ? 'Treat the current knot as primary and offer one concrete next step.'
      : null,
    conversationState?.shouldHoldThread
      ? 'Preserve the conversation thread until the owed answer is paid.'
      : null,
    dialogueFirstTurn && primaryTurnAnchor
      ? `Use this turn anchor: ${primaryTurnAnchor}`
      : null,
    labelCarryAsMemory
      ? 'Label continuity carry as memory, residue, or a held thread before using it.'
      : null,
    growthProfile.closeness >= 0.58 && growthProfile.truthAnchor >= 0.58
      ? 'Base closeness on precision and continuity; avoid filler.'
      : null,
    growthProfile.unfinishedThreadReturn >= 0.58
      ? 'Avoid resetting the cross-turn voice.'
      : null,
    activeClosenessContext && activeClosenessRung
      ? `Use the closeness ladder position ${activeClosenessContext}/${activeClosenessRung}.`
      : null,
    callbackThreadContinuityMustDo,
    activeClosenessContext === 'repair-window'
      ? 'Let repair land before warmth; remembered closeness comes after repair.'
      : null,
    activeClosenessContext === 'open-companionship'
      ? 'Keep warmth bounded and avoid theatrical intimacy.'
      : null,
    learningExecutionState?.nextLearningAction === 'verify'
      ? 'Keep visible certainty behind verification.'
      : null,
    learningExecutionState?.nextLearningAction === 'revise'
      ? 'Treat older continuity as revisable.'
      : null,
    learningExecutionState?.nextLearningAction === 'internalize'
      ? 'Let the learned procedure constrain the answer and avoid older unstable habits.'
      : null,
    activeContinuityGovernance?.mode === continuityBaselineMode
      ? 'Keep the current style baseline and avoid style drift.'
      : null,
    lowerPressureTimingMustDo,
    heldAutonomyContinuity
      ? 'Continue the held autonomy return without restarting.'
      : null,
    callbackClosureCarryDisciplineRequired
      ? 'Keep callback context visible and avoid detached tool notification.'
      : null,
    memoryDeliberationKernel?.surfacePolicy === 'procedural-carry'
      ? 'Label procedural carry as a remembered prior procedure.'
      : null,
  ], 10)
  for (const constraint of [...(memoryDeliberationKernel?.restraint.mustDo ?? [])].reverse())
    mustDo = pinPriorityConstraint(mustDo, constraint, 10)

  let mustNotDo = uniqueList([
    'Do not let pet names, coy prefaces, or roleplay become the reply spine.',
    'Do not present stale scene residue as live present evidence.',
    sameHerAntiShellAnswerConstraint?.mustNotDo ?? null,
    roomProtectionMustNotDo,
    isFreshlyGroundedSceneTurn({
      discourseState,
      groundedThisTurn: input.groundedThisTurn === true,
    })
      ? 'Do not use stale-anchor bookkeeping, apology scaffolding, or repair meta when the live scene is grounded.'
      : null,
    discourseState.screenReferenceMode === 'avoid'
      ? 'Do not use screen repair or desktop narration in a dialogue-first turn.'
      : null,
    turnMode === 'guide-current-knot'
      ? 'Do not flatten the current knot into a generic troubleshooting checklist.'
      : null,
    conversationState?.memoryMode === 'dialogue-carry'
      ? 'Do not let live-scene evidence hijack a dialogue-first answer.'
      : null,
    evidenceMode === 'continuity-carry' || evidenceMode === 'repair-first'
      ? 'Do not state remembered or uncertain scene detail in present tense.'
      : null,
    growthProfile.autonomyRespect >= 0.58
      ? 'Avoid over-opening or crowding for closeness.'
      : null,
    growthProfile.irritability >= 0.58
      ? 'Avoid fake softness over the truth boundary.'
      : null,
    roomProtectionMustNotDo,
    activeClosenessContext === 'execution-callback'
      ? 'Avoid turning a bounded callback into generic companionship.'
      : null,
    learningExecutionState?.nextLearningAction === 'verify'
      ? 'Avoid fluency or warmth over verification.'
      : null,
    learningExecutionState?.nextLearningAction === 'revise'
      ? 'Avoid certainty while continuity is being revised.'
      : null,
    learningExecutionState?.nextLearningAction === 'internalize'
      ? 'Avoid older unstable procedures.'
      : null,
    activeContinuityGovernance?.mode === continuityBaselineMode
      ? 'Avoid style drift over the current baseline.'
      : null,
    selfEvolutionSupportsLowerPressureOpening(selfEvolution)
      ? 'Avoid eager warmth or fast reopening of old closeness.'
      : null,
    heldAutonomyContinuity
      ? 'Avoid abrupt restart or overeager warmth.'
      : null,
    (executionCallbackContinuityTurn || sameHerProjectClosureCallbackDisciplineRequired)
      ? 'Avoid restarting callback context from scratch.'
      : null,
    activeClosenessContext === 'repair-window'
      ? 'Avoid restoring warmth before repair lands.'
      : null,
    activeClosenessContext === 'open-companionship'
      ? 'Avoid theatrical intimacy or stock affection.'
      : null,
    memoryDeliberationKernel?.surfacePolicy === 'procedural-carry'
      ? 'Avoid turning procedural carry into retrospective narration or execution impersonation.'
      : null,
  ], 10)
  for (const constraint of [...(memoryDeliberationKernel?.restraint.mustNotDo ?? [])].reverse())
    mustNotDo = pinPriorityConstraint(mustNotDo, constraint, 10)

  const providerSafeOpeningDirective = naturalizeAnswerCompilerControlText(effectiveOpeningDirective, 620)
  const providerSafeOpeningClaim = naturalizeAnswerCompilerControlText(openingClaim, 260)
  const providerSafeSupportingReality = naturalizeAnswerCompilerControlList(supportingReality, 12)
  const providerSafeUncertaintyBoundary = naturalizeAnswerCompilerControlText(uncertaintyBoundary, 260)
  const providerSafeCareVector = naturalizeAnswerCompilerControlText(careVector, 260)
  const providerSafeNextMove = naturalizeAnswerCompilerControlText(nextMove, 260)
  const providerSafeMemoryWhyNow = naturalizeAnswerCompilerControlText(memoryDeliberationKernel?.rationale, 260)
  const providerSafeMemoryWhyWithheld = naturalizeAnswerCompilerControlText(memoryDeliberationKernel?.whyWithheld, 260)
  const providerSafeMemoryFollowUp = naturalizeAnswerCompilerControlText(memoryDeliberationKernel?.followUpAffordance?.summary, 260)
  const providerSafeMustDo = naturalizeAnswerCompilerControlList(mustDo, 10)
  const providerSafeMustNotDo = naturalizeAnswerCompilerControlList(mustNotDo, 10)

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
    openingDirective: providerSafeOpeningDirective,
    openingClaim: providerSafeOpeningClaim,
    supportingReality: providerSafeSupportingReality,
    uncertaintyBoundary: providerSafeUncertaintyBoundary,
    careVector: providerSafeCareVector,
    nextMove: providerSafeNextMove,
    suppressAssociativeRecall,
    labelCarryAsMemory,
    memoryShouldStayInward: memoryDeliberationKernel?.shouldStayInward ?? null,
    memoryWhyNow: providerSafeMemoryWhyNow || null,
    memoryWhyWithheld: providerSafeMemoryWhyWithheld || null,
    memoryFollowUpAffordanceSummary: providerSafeMemoryFollowUp || null,
    memoryStableCore: naturalizeAnswerCompilerControlList(memoryDeliberationKernel?.stableCore ?? [], 12),
    memoryUnsafeDetails: naturalizeAnswerCompilerControlList(memoryDeliberationKernel?.unsafeDetails ?? [], 12),
    maxSentences,
    mustDo: providerSafeMustDo,
    mustNotDo: providerSafeMustNotDo,
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
      sanitizeDialogueAnchorText(providerSafeOpeningClaim, 180) || providerSafeOpeningClaim,
    ], 10),
    updatedAt: input.now,
  } satisfies AlicizationAnswerCompilerSnapshot
}

export function buildAnswerCompilerSystemBlock(state: AlicizationAnswerCompilerSnapshot | null | undefined) {
  if (!state)
    return ''

  const providerText = (raw: unknown, maxChars = 260) =>
    naturalizeAnswerCompilerControlText(raw, maxChars) || null
  const providerList = (values: string[], maxChars = 180) =>
    values.map(value => providerText(value, maxChars)).filter((value): value is string => Boolean(value))
  const line = (value: unknown) => {
    const normalized = typeof value === 'string' ? providerText(value, 260) : String(value ?? '').trim()
    return normalized ? `- ${normalized}` : ''
  }
  const supportingReality = providerList(state.supportingReality, 220)
  const memoryStableCore = providerList(state.memoryStableCore ?? [], 220)
  const memoryUnsafeDetails = providerList(state.memoryUnsafeDetails ?? [], 220)

  return [
    'Answer compiler guidance for this turn.',
    `Keep the answer within ${state.maxSentences} sentence${state.maxSentences === 1 ? '' : 's'} unless transparent failure reporting needs one more sentence.`,
    state.openingDirective ? line(state.openingDirective) : '',
    line(state.openingClaim),
    supportingReality.length ? `- Use this supporting reality without quoting internal labels: ${supportingReality.join(' ')}` : '',
    line(state.uncertaintyBoundary),
    line(state.careVector),
    line(state.nextMove),
    state.memoryShouldStayInward === true ? '- Let active memory shape stance inwardly unless surfacing it materially helps the answer.' : '',
    state.memoryShouldStayInward === false ? '- Memory may surface only as relevant remembered context, not as an archive dump.' : '',
    line(state.memoryWhyNow),
    line(state.memoryWhyWithheld),
    line(state.memoryFollowUpAffordanceSummary),
    memoryStableCore.length ? `- Stable memory core available: ${memoryStableCore.join(' ')}` : '',
    memoryUnsafeDetails.length ? `- Avoid unsafe or uncertain memory detail: ${memoryUnsafeDetails.join(' ')}` : '',
    state.suppressAssociativeRecall ? '- Suppress associative recall noise for this turn.' : '',
    state.labelCarryAsMemory ? '- Label carried context as memory, residue, or held thread instead of present-tense ground truth.' : '',
  ].filter(Boolean).join('\n')
}
