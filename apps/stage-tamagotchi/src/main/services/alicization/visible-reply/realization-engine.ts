import type {
  AlicizationVisibleReplyExecution,
  AlicizationVisibleReplyExecutionMode,
} from '../../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'
import type { AlicizationVisibleReplyCriticArtifact } from './critic'

import {
  buildAlicizationEmbodimentLoopSummary,
  describeAlicizationEmbodimentClosureHeadline,
  describeAlicizationEmbodimentClosureReminder,
  isAlicizationNormalVisibleReplyAuthority,
  looksLikeAlicizationStructuredPayloadText,
  normalizeAlicizationNormalVisibleReplyAuthority,
} from '@proj-alicization/stage-shared'

import { preferStrongerContinuityClosureAuthority } from '../continuity-closure-authority'
import {
  resolvePreferredPreparedRuntimeSurface,
  resolvePreparedRuntimeProjectPreDialogueAwarenessSummary,
  resolvePreparedRuntimeProjectState,
  resolvePreparedRuntimeProjectStateSnapshot,
  resolvePreparedRuntimeSelfContinuityAuthority,
} from '../prepared-runtime-continuity'
import {
  buildAlicizationProjectPreDialogueAwarenessLine,
  buildAlicizationProjectStatePreflightSummary,
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
  scoreAlicizationProjectAwarenessLine,
} from '../project-state-brief'
import {
  deriveCompactProjectStateNextFocusSummary,
  deriveCompactProjectStateOpenFocusSummary,
} from '../project-state-focus'
import { buildPrioritizedProjectStateRewritePreserveLines } from '../runtime-governance'
import { parseJsonObjectFromText } from '../runtime-transport-content'

const sameHerProjectFollowThroughPreserveLine
  = 'Keep this same-her project follow-through on one already-live line: continue the landed progress and still-open closure from inside the same digital life instead of restarting as a fresh project report or generic companionship shell.'

function looksLikeRicherProjectClosureCarry(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return (
    /ordinary continuation|runtime project-state carry|answer-planner same-her continuity|memory, initiative, and embodiment|same-her closure seam|same living line/u.test(normalized)
    && !/before answering, keep the same digital life project in view|same digital life \| keep the closure seam explicit/u.test(normalized)
  )
}

function looksLikeProjectStateSameHerPreserveInstruction(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return (
    normalized.includes('project-state')
    || normalized.includes('project status')
    || normalized.includes('项目状态')
    || normalized.includes('这个项目')
  ) && (
    normalized.includes('same-her')
    || normalized.includes('same her')
    || normalized.includes('same living line')
    || normalized.includes('同一个 her')
    || normalized.includes('同一个她')
  )
}

function looksLikeMeaningfulTimeoutRecoveryProjectCarry(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  if (/^contract fallback\b|^thin runtime\b/u.test(normalized))
    return false

  return /same phase 1 digital life|same living line|one continuous her|project-state continuity|already survives|runtime preparation|memory|initiative|embodiment|closure|same-her|cross-modal|visible reply|project identity|landed continuity|host-visible/u.test(normalized)
}

export interface AlicizationVisibleReplyClosureArtifact {
  version: 'visible-reply-closure-v1'
  status: 'approved' | 'rewritten' | 'blocked'
  initialCritic: AlicizationVisibleReplyCriticArtifact | null
  finalCritic: AlicizationVisibleReplyCriticArtifact | null
  rewriteAttempted: boolean
  rewriteSucceeded: boolean
  reasonCodes: string[]
}

export interface AlicizationVisibleReplyRealizationArtifact {
  version: 'visible-reply-realization-v1'
  expectedAuthority: 'llm-mind' | 'llm-second-pass-rewrite'
  actualAuthority: AlicizationVisibleReplyExecution['actualVisibleReplyAuthority'] | null
  providerMindExecuted: boolean
  mode: AlicizationVisibleReplyExecutionMode
  visibleText: string | null
  sameHerInwardCarry?: string | null
  nonHumanAuthoredStatus: string | null
  blockedReasons: string[]
  emotionalClosureAudit?: {
    activeCue: string | null
    preservedIntoRewrite: boolean
    rewriteClosureApplied: boolean
    lowPressureRequired?: boolean
    antiRestartRequired?: boolean
  } | null
  selfAuthorityAudit?: {
    authoritySummary: string | null
    closenessPosture: string | null
    preservedIntoRewrite: boolean
    rewriteClosureApplied: boolean
  } | null
  projectStateAudit?: {
    sameHerSummary: string | null
    sameHerHoldDetail?: string | null
    continuityArcStage?: string | null
    continuityCue?: string | null
    sameHerDriftRiskSummary?: string | null
    proactiveSameHerGapSummary?: string | null
    currentPhaseSummary?: string | null
    landedProgressSummary?: string | null
    openClosureSummary?: string | null
    openFocusSummary?: string | null
    nextFocusSummary?: string | null
    nextClosureTargetSummary?: string | null
    memoryClosureSummary?: string | null
    recallWhySummary?: string | null
    emotionalClosureSummary?: string | null
    emotionalClosureCue?: string | null
    continuitySummary?: string | null
    embodimentClosureSummary?: string | null
    preDialogueAwarenessSummary?: string | null
    preservedIntoRewrite: boolean
    rewriteClosureApplied: boolean
  } | null
  openingGuidanceHoldDetail?: string | null
  companionshipHoldMode?: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | 'rest-protective' | null
  openingEmbodimentAudit?: {
    firstBeatPosture: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | 'rest-protective'
    delivery: 'calm'
    facialCue: 'soften' | 'settle-repair' | 'quiet' | 'rest-soften'
    actionCue: 'stillness' | 'leave-room' | 'repair-settle' | 'rest-settle'
    derivedFrom: string
  } | null
  reason: string | null
  critic?: AlicizationVisibleReplyCriticArtifact | null
  closure?: AlicizationVisibleReplyClosureArtifact | null
}

export interface AlicizationResolvedVisibleReply {
  fullText: string
  visibleText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  realization: AlicizationVisibleReplyRealizationArtifact
}

function isLocalDeterministicVisibleFallback(execution: AlicizationVisibleReplyExecution) {
  return execution.actualVisibleReplyAuthority === 'local-deterministic-fallback'
    || execution.providerMindExecuted === false
    || execution.mode === 'local-fallback'
}

function resolvePreparedReplyExecutionPlan(prepared: AlicizationPreparedMainChatExecutionResult) {
  if (prepared.mindTurnContract) {
    return {
      preferredMode: prepared.hasVisualGrounding
        ? 'provider-one-shot'
        : 'provider-stream',
      expectedVisibleReplyAuthority: normalizeAlicizationNormalVisibleReplyAuthority(
        prepared.mindTurnContract.expectedVisibleReplyAuthority,
        'llm-mind',
      ),
      reason: 'mind-turn-contract',
    } as const
  }
  const plan = prepared.replyExecutionPlan
    ?? prepared.runtimeSurface.replyExecutionPlan
    ?? null
  if (!plan)
    return null
  return {
    ...plan,
    preferredMode: plan.preferredMode === 'local-fallback'
      ? prepared.hasVisualGrounding ? 'provider-one-shot' : 'provider-stream'
      : plan.preferredMode,
    expectedVisibleReplyAuthority: normalizeAlicizationNormalVisibleReplyAuthority(
      plan.expectedVisibleReplyAuthority as any,
      'llm-mind',
    ),
    reason: plan.reason ?? 'visible-reply-authority-gate',
  } as const
}

function resolvePreparedVisibleReplyAuthority(prepared: AlicizationPreparedMainChatExecutionResult) {
  if (prepared.mindTurnContract) {
    return normalizeAlicizationNormalVisibleReplyAuthority(
      prepared.mindTurnContract.expectedVisibleReplyAuthority,
      'llm-mind',
    )
  }
  return normalizeAlicizationNormalVisibleReplyAuthority(
    (prepared.replyRealization?.expectedVisibleReplyAuthority
      ?? prepared.runtimeSurface.replyAuthority?.expectedVisibleReplyAuthority
      ?? prepared.governance?.visibleReplyAuthority
      ?? 'llm-mind') as any,
    'llm-mind',
  )
}

function resolveActualVisibleReplyAuthority(input: {
  mode: AlicizationVisibleReplyExecutionMode
  expectedVisibleReplyAuthority: AlicizationVisibleReplyExecution['expectedVisibleReplyAuthority']
  requestedAuthority?: AlicizationVisibleReplyExecution['actualVisibleReplyAuthority']
  providerMindExecuted: boolean
}) {
  if (!input.providerMindExecuted || input.mode === 'local-fallback')
    return 'local-deterministic-fallback' as const

  if (isAlicizationNormalVisibleReplyAuthority(input.requestedAuthority))
    return input.requestedAuthority

  return normalizeAlicizationNormalVisibleReplyAuthority(
    input.expectedVisibleReplyAuthority,
    'llm-mind',
  )
}

function cueRequiresLowPressure(cue: string | null) {
  const normalized = typeof cue === 'string' ? cue.toLowerCase() : ''
  if (!normalized)
    return false
  return normalized.includes('low-pressure')
    || normalized.includes('lower-pressure')
    || normalized.includes('leave more room')
    || normalized.includes('轻一点')
    || normalized.includes('放轻')
}

function cueAvoidsRestart(cue: string | null) {
  const normalized = typeof cue === 'string' ? cue.toLowerCase() : ''
  if (!normalized)
    return false
  return normalized.includes('do not reopen from scratch')
    || normalized.includes('without reopening from scratch')
    || normalized.includes('same living line is still settling')
    || normalized.includes('不要重新开')
    || normalized.includes('不要从头重开')
}

function preferRicherProjectStateAuditText(input: {
  current?: string | null
  candidate?: string | null
}) {
  const current = typeof input.current === 'string' ? input.current.trim() || null : null
  const candidate = typeof input.candidate === 'string' ? input.candidate.trim() || null : null

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

function normalizeHoldDetail(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() || null : null
}

function hasRememberedSeamMoreRoomCarry(text: string | null | undefined) {
  const normalized = normalizeHoldDetail(text)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  const rememberedSeamPresent
    = /remembered seam|same remembered relationship seam|same remembered seam|relationship seam|same line|same thread|callback line|同一条线|关系线|记住的关系缝|留白/u.test(normalized)
  if (!rememberedSeamPresent)
    return false

  return /reopened too eagerly|too eagerly before|more room this time|this time keep more room|keep more room this time|leave more room|do not reopen it with the same eagerness|same eagerness as before|before leaning in again|这次更要留白|这次要更慢一点|不要重开得太快|上次太急/u.test(normalized)
}

function looksLikeGenericMeasuredReturnHoldDetail(text: string | null | undefined) {
  const normalized = normalizeHoldDetail(text)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  if (hasRememberedSeamMoreRoomCarry(normalized))
    return false

  return normalized.includes('same-her hold: measured-return')
    || normalized.includes('callback line lower-pressure before it widens again')
}

function looksLikeCanonicalProjectStateSameHerHoldDetail(value: string | null | undefined) {
  const normalized = normalizeHoldDetail(value)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized.startsWith('same-her hold:')
    && normalized.includes('project-state answer')
    && normalized.includes('same living line before widening outward')
}

function looksLikeCadenceAwareSameHerHoldDetail(value: string | null | undefined) {
  const normalized = normalizeHoldDetail(value)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized === 'same-her hold: keep the return lower-pressure and slower before the line widens again.'
    || normalized === 'same-her hold: keep the remembered return quieter, longer, and more restrained before widening the line again.'
}

function resolveRememberedSeamMoreRoomHoldDetail() {
  return 'same-her hold: recognize the same remembered seam, but keep more room this time so the return does not reopen with the same eagerness as before.'
}

function resolvePreferredSameHerHoldDetail(input: {
  current?: string | null
  candidate?: string | null
  continuityCue?: string | null
}) {
  const current = normalizeHoldDetail(input.current)
  const candidate = normalizeHoldDetail(input.candidate)
  const continuityCue = normalizeHoldDetail(input.continuityCue)

  if (looksLikeCorrectedSamePersonAuthorityHoldDetail(current))
    return current
  if (looksLikeResumeConfirmationBoundaryHoldDetail(current))
    return current
  if (hasRememberedSeamMoreRoomCarry(current))
    return current

  if (looksLikeCorrectedSamePersonAuthorityHoldDetail(candidate))
    return candidate
  if (looksLikeResumeConfirmationBoundaryHoldDetail(candidate))
    return candidate
  if (hasRememberedSeamMoreRoomCarry(candidate))
    return candidate

  if (
    current
    && !looksLikeCanonicalProjectStateSameHerHoldDetail(current)
    && looksLikeCanonicalProjectStateSameHerHoldDetail(candidate)
  ) {
    return current
  }

  if (
    candidate
    && !looksLikeCanonicalProjectStateSameHerHoldDetail(candidate)
    && looksLikeCanonicalProjectStateSameHerHoldDetail(current)
  ) {
    return candidate
  }

  if (
    (looksLikeGenericMeasuredReturnHoldDetail(current) || !current)
    && hasRememberedSeamMoreRoomCarry(continuityCue)
  ) {
    return resolveRememberedSeamMoreRoomHoldDetail()
  }

  return preferRicherProjectStateAuditText({
    current,
    candidate,
  })
}

function looksLikeCorrectedSamePersonAuthorityHoldDetail(value: string | null | undefined) {
  const normalized = normalizeHoldDetail(value)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized.includes('host-corrected same-person continuity')
    || (
      normalized.includes('corrected same-person continuity')
      && (
        normalized.includes('progress-style continuation')
        || normalized.includes('status recap')
      )
    )
}

function looksLikeCorrectedSamePersonContinuityCue(value: string | null | undefined) {
  const normalized = normalizeHoldDetail(value)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized.includes('carry corrected same-person continuity forward')
    || (
      normalized.includes('corrected same-person continuity')
      && normalized.includes('before any status recap')
    )
}

function looksLikeResumeConfirmationBoundaryHoldDetail(value: string | null | undefined) {
  const normalized = normalizeHoldDetail(value)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  const hasBoundaryAnchor
    = /execution-resume-confirmation|host-confirmed-before-redispatch|resume-before-dispatch|host-confirmed resume|host-confirmed/u.test(normalized)
  const hasBoundaryHold
    = /bounded confirmation boundary|another execution-shaped opening/u.test(normalized)

  return hasBoundaryAnchor && hasBoundaryHold
}

function looksLikeResumeConfirmationBoundaryContinuityCue(value: string | null | undefined) {
  const normalized = normalizeHoldDetail(value)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  const hasBoundaryAnchor
    = /host-confirmed-before-redispatch|resume-before-dispatch|bounded confirmation boundary|host-confirmed resume|host-confirmed/u.test(normalized)
  const hasBoundaryCue
    = /not permanent execution permission|generic autonomous continuation|permanent execution permission|reusable autonomous continuation|one confirmed resume|callback answer/u.test(normalized)

  return (hasBoundaryAnchor && hasBoundaryCue)
    || (
      normalized.includes('callback answer')
      && normalized.includes('permanent execution permission')
      && (
        normalized.includes('reusable autonomous continuation')
        || normalized.includes('generic autonomous continuation')
      )
      && normalized.includes('one confirmed resume')
    )
}

function looksLikeCanonicalProjectStateContinuityCue(value: string | null | undefined) {
  const normalized = normalizeHoldDetail(value)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized.startsWith('same living line:')
    && normalized.includes('some closure already landed')
    && normalized.includes('same phase 1 digital life before widening outward')
}

function collectProjectStatePreserveLines(input: {
  critic?: AlicizationVisibleReplyCriticArtifact | null
  closure?: AlicizationVisibleReplyClosureArtifact | null
}) {
  return [
    ...(input.critic?.mustPreserve ?? []),
    ...(input.closure?.initialCritic?.mustPreserve ?? []),
    ...(input.closure?.finalCritic?.mustPreserve ?? []),
  ]
    .map(value => normalizeHoldDetail(value))
    .filter((value): value is string => Boolean(value))
}

function shouldTreatPreDialogueAwarenessAsHoldCandidate(value: string | null | undefined) {
  const normalized = normalizeHoldDetail(value)
  if (!normalized)
    return false

  if (looksLikeCanonicalBeforeAnsweringProjectReanchor(normalized))
    return false

  if (looksLikeExplicitProjectReanchorAwareness(normalized))
    return false

  if (looksLikeSameHerClosureSummary(normalized))
    return false

  return true
}

function resolveCompanionshipHoldMode(input: {
  emotionalClosureCue?: string | null
  projectStateClosureSummary?: string | null
  projectStatePreDialogueAwarenessSummary?: string | null
  projectStateInitiativeClosureSummary?: string | null
  openingGuidance?: string | null
}) {
  const preDialogueAwarenessHoldCandidate = shouldTreatPreDialogueAwarenessAsHoldCandidate(
    input.projectStatePreDialogueAwarenessSummary,
  )
    ? normalizeHoldDetail(input.projectStatePreDialogueAwarenessSummary)
    : null
  const candidates = [
    normalizeHoldDetail(input.emotionalClosureCue),
    normalizeHoldDetail(input.projectStateClosureSummary),
    preDialogueAwarenessHoldCandidate,
    normalizeHoldDetail(input.projectStateInitiativeClosureSummary),
    normalizeHoldDetail(input.openingGuidance),
  ].filter((value): value is string => Boolean(value))

  const detectRepairBeforeCloseness = (value: string) =>
    /repair-before-closeness|repair settle|repair-first|let repair settle/u.test(value)
  const detectInitiativeScopedRestProtective = (value: string) =>
    /initiative rest-protective|initiative rest protection/u.test(value)
  const detectRestProtective = (value: string) =>
    /rest-protective|rest protection|fatigue-aware|let rest protection hold|before warmth widens|先让休息保护|疲惫感先缓住/u.test(value)
  const detectMeasuredReturn = (value: string) =>
    /measured-return|next-open-window|lower-pressure|low-pressure|leave room before widening|same living line is still settling|living audio thread is still intact|living audio thread is keeping the same-her carry alive|holding together mainly through lipsync and voice|holding together mainly through face,\s*lipsync,\s*and voice|holding together mainly through motion,\s*lipsync,\s*and voice|still-voiced face-and-mouth line|still-voiced motion-and-mouth line|still-voiced face line|still-voiced motion line|audible-body|audible body|same callback line.*after another detour|same callback seam.*after another detour|same living thread|same-thread continuation|body and lipsync|body\+lipsync-only|quieter living line/u.test(value)
  const detectQuietCompanionship = (value: string) =>
    /quiet-companionship|quiet line|quiet companionship/u.test(value)
  const detectQuietSameHerContinuity = (value: string) =>
    /quiet same-her continuity|quiet same her continuity|same-her-inward-carry|same digital life|same phase 1 digital life|one continuous her|同一个她/u.test(value)
    && /quiet-companionship|quiet companionship|stay inward|line holds inward|before widening outward|先别外扩/u.test(value)

  const repairDetail = candidates.find(detectRepairBeforeCloseness) ?? null
  if (repairDetail) {
    return {
      mode: 'repair-before-closeness' as const,
      detail: repairDetail,
    }
  }

  const restProtectiveDetail = candidates.find(value =>
    detectRestProtective(value) && (!detectInitiativeScopedRestProtective(value)
      || !detectMeasuredReturn(value)
      || !detectQuietCompanionship(value)),
  ) ?? null
  if (restProtectiveDetail) {
    return {
      mode: 'rest-protective' as const,
      detail: restProtectiveDetail,
    }
  }

  const quietSameHerDetail = candidates.find(detectQuietSameHerContinuity) ?? null
  if (quietSameHerDetail) {
    return {
      mode: 'quiet-companionship' as const,
      detail: quietSameHerDetail,
    }
  }

  const measuredDetail = candidates.find(detectMeasuredReturn) ?? null
  if (measuredDetail) {
    return {
      mode: 'measured-return' as const,
      detail: measuredDetail,
    }
  }

  const quietDetail = candidates.find(detectQuietCompanionship) ?? null
  if (quietDetail) {
    return {
      mode: 'quiet-companionship' as const,
      detail: quietDetail,
    }
  }

  return {
    mode: null,
    detail: candidates[0] ?? null,
  }
}

function resolveOpeningEmbodimentAudit(
  holdMode: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | 'rest-protective' | null,
  derivedFrom: string | null,
) {
  if (!holdMode || !derivedFrom)
    return null

  if (holdMode === 'repair-before-closeness') {
    return {
      firstBeatPosture: holdMode,
      delivery: 'calm' as const,
      facialCue: 'settle-repair' as const,
      actionCue: 'repair-settle' as const,
      derivedFrom,
    }
  }

  if (holdMode === 'measured-return') {
    return {
      firstBeatPosture: holdMode,
      delivery: 'calm' as const,
      facialCue: 'soften' as const,
      actionCue: 'leave-room' as const,
      derivedFrom,
    }
  }

  if (holdMode === 'rest-protective') {
    return {
      firstBeatPosture: holdMode,
      delivery: 'calm' as const,
      facialCue: 'rest-soften' as const,
      actionCue: 'rest-settle' as const,
      derivedFrom,
    }
  }

  return {
    firstBeatPosture: holdMode,
    delivery: 'calm' as const,
    facialCue: 'quiet' as const,
    actionCue: 'stillness' as const,
    derivedFrom,
  }
}

function scoreEmbodimentClosureLane(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.toLowerCase() : ''
  if (!normalized)
    return 0

  const explicitLaneMatch = /\blane=([a-z+]+)-only\b/i.exec(normalized)
  if (explicitLaneMatch) {
    return explicitLaneMatch[1]
      .split('+')
      .map(part => part.trim())
      .filter(Boolean)
      .length
  }

  return [
    normalized.includes('body'),
    normalized.includes('face'),
    normalized.includes('motion'),
    normalized.includes('lipsync'),
    normalized.includes('voice'),
  ].filter(Boolean).length
}

function resolvePreferredEmbodimentClosureAuthority(input: {
  authoritySummaryCandidates: Array<string | null | undefined>
  currentBodyStateCandidates: Array<string | null | undefined>
}) {
  const candidateCount = Math.max(
    input.authoritySummaryCandidates.length,
    input.currentBodyStateCandidates.length,
  )

  let best: {
    authoritySummary: string | null
    currentBodyState: string | null
    score: number
    completenessScore: number
  } | null = null

  for (let index = 0; index < candidateCount; index += 1) {
    const authoritySummary = input.authoritySummaryCandidates[index]?.trim() || null
    const currentBodyState = input.currentBodyStateCandidates[index]?.trim() || null
    const score = Math.max(
      scoreEmbodimentClosureLane(authoritySummary),
      scoreEmbodimentClosureLane(currentBodyState),
    )

    if (!authoritySummary && !currentBodyState)
      continue

    const completenessScore
      = (authoritySummary ? 1 : 0)
        + (currentBodyState ? 2 : 0)

    if (
      !best
      || score > best.score
      || (score === best.score && completenessScore > best.completenessScore)
    ) {
      best = {
        authoritySummary,
        currentBodyState,
        score,
        completenessScore,
      }
    }
  }

  return {
    authoritySummary: best?.authoritySummary ?? null,
    currentBodyState: best?.currentBodyState ?? null,
  }
}

function readEmbodimentAwareCurrentBodyState(
  authority: { currentBodyState?: unknown } | null | undefined,
) {
  return typeof authority?.currentBodyState === 'string'
    ? authority.currentBodyState.trim() || null
    : null
}

function readPreparedRuntimeDigestSelfContinuityAuthority(
  prepared: AlicizationPreparedMainChatExecutionResult | null | undefined,
  source: 'raw' | 'cognition',
) {
  const runtimeDigest = source === 'raw'
    ? prepared?.runtimeSurface?.digitalLifeRuntimeSurface?.raw?.runtimeDigest
    : prepared?.runtimeSurface?.digitalLifeRuntimeSurface?.cognition?.runtimeDigest

  return (
    runtimeDigest as {
      currentConsciousFrame?: {
        selfContinuityAuthority?: {
          authoritySummary?: string | null
          currentBodyState?: string | null
        } | null
      } | null
    } | null | undefined
  )?.currentConsciousFrame?.selfContinuityAuthority ?? null
}

function resolvePreparedRuntimeEmbodimentClosureAuthority(input: {
  prepared?: AlicizationPreparedMainChatExecutionResult | null
  leadingAuthoritySummaryCandidates?: Array<string | null | undefined>
}) {
  const runtimePerceptionCurrentBodyState
    = typeof input.prepared?.runtimeSurface?.digitalLifeRuntimeSurface?.perception?.currentBodyState === 'string'
      ? input.prepared.runtimeSurface.digitalLifeRuntimeSurface.perception.currentBodyState.trim() || null
      : null
  const preferredRuntimeSelfContinuityAuthority
    = resolvePreparedRuntimeSelfContinuityAuthority(input.prepared) as {
      authoritySummary?: string | null
      currentBodyState?: string | null
    } | null | undefined
  const rawRuntimeDigestSelfContinuityAuthority
    = readPreparedRuntimeDigestSelfContinuityAuthority(input.prepared, 'raw')
  const cognitionRuntimeDigestSelfContinuityAuthority
    = readPreparedRuntimeDigestSelfContinuityAuthority(input.prepared, 'cognition')
  const runtimeProjectionSelfContinuityAuthority
    = input.prepared?.runtimeSurface?.digitalLifeRuntimeSurface?.memory?.personStateProjection?.selfContinuityAuthority as {
      authoritySummary?: string | null
      currentBodyState?: string | null
    } | null | undefined
  const spineProjectionSelfContinuityAuthority
    = input.prepared?.runtimeSurface?.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority as {
      authoritySummary?: string | null
      currentBodyState?: string | null
    } | null | undefined
  const leadingAuthoritySummaryCandidates = input.leadingAuthoritySummaryCandidates ?? []

  return resolvePreferredEmbodimentClosureAuthority({
    authoritySummaryCandidates: [
      ...leadingAuthoritySummaryCandidates,
      null,
      preferredRuntimeSelfContinuityAuthority?.authoritySummary ?? null,
      rawRuntimeDigestSelfContinuityAuthority?.authoritySummary ?? null,
      cognitionRuntimeDigestSelfContinuityAuthority?.authoritySummary ?? null,
      runtimeProjectionSelfContinuityAuthority?.authoritySummary ?? null,
      spineProjectionSelfContinuityAuthority?.authoritySummary ?? null,
    ],
    currentBodyStateCandidates: [
      ...leadingAuthoritySummaryCandidates.map(() => null),
      runtimePerceptionCurrentBodyState,
      readEmbodimentAwareCurrentBodyState(preferredRuntimeSelfContinuityAuthority),
      readEmbodimentAwareCurrentBodyState(rawRuntimeDigestSelfContinuityAuthority),
      readEmbodimentAwareCurrentBodyState(cognitionRuntimeDigestSelfContinuityAuthority),
      readEmbodimentAwareCurrentBodyState(runtimeProjectionSelfContinuityAuthority),
      readEmbodimentAwareCurrentBodyState(spineProjectionSelfContinuityAuthority),
    ],
  })
}

function looksLikeSameHerClosureSummary(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return /some closure already landed|unfinished closure still needs|same living line/u.test(normalized)
    && /same phase 1 digital life|same digital life/u.test(normalized)
    && !/before answering/u.test(normalized)
}

function shouldTreatAsThinAwarenessShell(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized)
    return false

  if (isAlicizationThinProjectAwarenessLine(normalized))
    return true

  if (/回答前先记住这是同一个她(?:的数字生命项目)?|先记住这是同一个她(?:的数字生命项目)?|别把这条线忘了|别把这条线弄丢/u.test(normalized))
    return true

  return scoreAlicizationProjectAwarenessLine(normalized) <= 0
}

function looksLikeThinProjectStateAwarenessGuidance(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  const carriesStrongerSameHerAwareness
    = /one living her|one living digital life|local-first digital life project|same living line|without splitting her continuity|unfinished phase 1 closure seam|holding together mainly through|still-voiced|resident body line|living mouth line/u.test(normalized)

  if (carriesStrongerSameHerAwareness)
    return false

  return /keep the latest landed project-state progress explicit in the answer|keep the still-open closure work explicit in the answer|keep extending cross-modal same-her proof across longer desktop runs|keep the same digital life project in view|explicit in the visible reply|explicit in the rewritten answer/u.test(normalized)
}

function scoreProjectStateAuditPreDialogueAwarenessSummary(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized)
    return 0

  let score = scoreAlicizationProjectAwarenessLine(normalized)
  if (/one living her|one living digital life|local-first digital life project|same living line|without splitting her continuity|unfinished phase 1 closure seam|holding together mainly through|still-voiced|resident body line|living mouth line/u.test(normalized))
    score += 3
  if (looksLikeThinProjectStateAwarenessGuidance(normalized))
    score -= 2
  return score
}

function preferProjectStateAuditPreDialogueAwarenessSummary(...values: Array<string | null | undefined>) {
  const normalizedValues = values
    .map(value => typeof value === 'string' ? value.trim() : '')
    .filter(Boolean)

  if (normalizedValues.length === 0)
    return null

  return normalizedValues.slice(1).reduce<string>((best, candidate) => {
    const bestScore = scoreProjectStateAuditPreDialogueAwarenessSummary(best)
    const candidateScore = scoreProjectStateAuditPreDialogueAwarenessSummary(candidate)

    if (candidateScore > bestScore)
      return candidate

    if (candidateScore === bestScore && candidate.length > best.length)
      return candidate

    return best
  }, normalizedValues[0]!)
}

function resolveExplicitPreparedRuntimeProjectAwarenessLine(
  prepared: AlicizationPreparedMainChatExecutionResult | null | undefined,
) {
  if (!prepared)
    return null

  const surface = resolvePreferredPreparedRuntimeSurface(prepared.runtimeSurface)
  const currentConsciousProjectState = surface?.dialogue?.currentConsciousFrame?.projectState ?? null
  const preferredRuntimeProjectState
    = surface?.raw?.runtimeDigest?.projectState
      ?? surface?.cognition?.runtimeDigest?.projectState
      ?? prepared.runtimeDigest?.projectState
      ?? null
  const contractProjectState = prepared.mindTurnContract?.projectState ?? null

  return pickStrongerPreparedAwarenessLine(
    currentConsciousProjectState?.preDialogueAwarenessLine,
    currentConsciousProjectState?.awarenessLine,
    currentConsciousProjectState?.preDialogueAwarenessSummary,
    currentConsciousProjectState?.companionHeadlineLine,
    currentConsciousProjectState?.companionBriefingLine,
    preferredRuntimeProjectState?.preDialogueAwarenessLine,
    preferredRuntimeProjectState?.awarenessLine,
    preferredRuntimeProjectState?.preDialogueAwarenessSummary,
    preferredRuntimeProjectState?.companionHeadlineLine,
    preferredRuntimeProjectState?.companionBriefingLine,
    contractProjectState?.preDialogueAwarenessLine,
    contractProjectState?.awarenessLine,
    contractProjectState?.preDialogueAwarenessSummary,
    contractProjectState?.companionHeadlineLine,
    contractProjectState?.companionBriefingLine,
  )
}

export function resolveVisibleReplyProjectAwarenessSummary(input: {
  rawSummary?: string | null
  strongerPreparedRuntimeAwarenessLine?: string | null
  preparedRuntimePreferredAwarenessSummary?: string | null
  preparedRuntimeCompanionHeadlineLine?: string | null
  canonicalProjectAwarenessLine?: string | null
  preparedRuntimeAwarenessInputsCount?: number
  preparedRuntimeAwarenessLooksThin?: boolean
  allowPreparedRuntimeBackfill?: boolean
  preferPreparedRuntimeAwarenessDisplay?: boolean
  displayMode?: 'project-reanchor' | 'embodiment-headline' | 'hidden'
}) {
  const rawSummary = typeof input.rawSummary === 'string' ? input.rawSummary.trim() || null : null
  const strongerPreparedRuntimeAwarenessLine = typeof input.strongerPreparedRuntimeAwarenessLine === 'string'
    ? input.strongerPreparedRuntimeAwarenessLine.trim() || null
    : null
  const preparedRuntimePreferredAwarenessSummary = typeof input.preparedRuntimePreferredAwarenessSummary === 'string'
    ? input.preparedRuntimePreferredAwarenessSummary.trim() || null
    : null
  const preparedRuntimeCompanionHeadlineLine = typeof input.preparedRuntimeCompanionHeadlineLine === 'string'
    ? input.preparedRuntimeCompanionHeadlineLine.trim() || null
    : null
  const canonicalProjectAwarenessLine = typeof input.canonicalProjectAwarenessLine === 'string'
    ? input.canonicalProjectAwarenessLine.trim() || null
    : null
  const displayMode = input.displayMode
    ?? resolveVisibleReplyProjectAwarenessDisplayMode({
      rawSummary,
      preparedRuntimePreferredAwarenessSummary,
      preparedRuntimeCompanionHeadlineLine,
      isTimeoutRecovery: !rawSummary && !input.allowPreparedRuntimeBackfill,
    })
  const preparedRuntimeProjectReanchorUpgrade = resolvePreparedRuntimeProjectReanchorUpgrade({
    rawSummary,
    strongerPreparedRuntimeAwarenessLine,
    preparedRuntimePreferredAwarenessSummary,
    canonicalProjectAwarenessLine,
  })

  if (looksLikeCallbackSpecificSameHerProjectAwareness(rawSummary))
    return rawSummary

  if (looksLikeCanonicalBeforeAnsweringProjectReanchor(rawSummary))
    return preparedRuntimeProjectReanchorUpgrade ?? rawSummary

  if (looksLikeExplicitProjectReanchorAwareness(rawSummary))
    return rawSummary

  if (displayMode === 'hidden')
    return null

  if (displayMode === 'embodiment-headline')
    return preparedRuntimeCompanionHeadlineLine ?? rawSummary

  if (
    rawSummary
    && !shouldTreatAsThinAwarenessShell(rawSummary)
    && !looksLikeSameHerClosureSummary(rawSummary)
    && (
      looksLikeExplicitProjectReanchorAwareness(rawSummary)
      || looksLikeCanonicalBeforeAnsweringProjectReanchor(rawSummary)
      || looksLikeEmbodimentClosureHeadline(rawSummary)
    )
  ) {
    return rawSummary
  }

  if (displayMode === 'project-reanchor' && looksLikeSameHerClosureSummary(rawSummary)) {
    if (strongerPreparedRuntimeAwarenessLine && !shouldTreatAsThinAwarenessShell(strongerPreparedRuntimeAwarenessLine))
      return strongerPreparedRuntimeAwarenessLine

    if (looksLikeCanonicalBeforeAnsweringProjectReanchor(canonicalProjectAwarenessLine))
      return canonicalProjectAwarenessLine

    return preparedRuntimePreferredAwarenessSummary
      ?? ((input.preparedRuntimeAwarenessInputsCount ?? 0) === 0 ? canonicalProjectAwarenessLine : null)
      ?? preparedRuntimeCompanionHeadlineLine
      ?? rawSummary
  }

  if (displayMode === 'project-reanchor' && shouldTreatAsThinAwarenessShell(rawSummary)) {
    return strongerPreparedRuntimeAwarenessLine
      ?? preparedRuntimePreferredAwarenessSummary
      ?? canonicalProjectAwarenessLine
      ?? preparedRuntimeCompanionHeadlineLine
      ?? rawSummary
  }

  const shouldPromoteCanonicalPreDialogueAwareness
    = Boolean(rawSummary)
      && (shouldTreatAsThinAwarenessShell(rawSummary)
        || looksLikeSameHerClosureSummary(rawSummary))
      && ((input.preparedRuntimeAwarenessInputsCount ?? 0) === 0 || Boolean(input.preparedRuntimeAwarenessLooksThin))

  if (!shouldPromoteCanonicalPreDialogueAwareness)
    return rawSummary

  const allowPreparedRuntimeBackfill = input.allowPreparedRuntimeBackfill ?? false
  const preferPreparedRuntimeAwarenessDisplay = input.preferPreparedRuntimeAwarenessDisplay ?? false
  return ((input.preparedRuntimeAwarenessInputsCount ?? 0) > 0
    ? ((allowPreparedRuntimeBackfill || preferPreparedRuntimeAwarenessDisplay)
        ? strongerPreparedRuntimeAwarenessLine
        : null)
    : null)
  ?? ((allowPreparedRuntimeBackfill || preferPreparedRuntimeAwarenessDisplay) ? preparedRuntimePreferredAwarenessSummary : null)
  ?? ((allowPreparedRuntimeBackfill || preferPreparedRuntimeAwarenessDisplay) ? preparedRuntimeCompanionHeadlineLine : null)
  ?? ((input.preparedRuntimeAwarenessInputsCount ?? 0) === 0 ? canonicalProjectAwarenessLine : null)
  ?? rawSummary
}

export function resolveVisibleReplyProjectAwarenessDisplayMode(input: {
  rawSummary?: string | null
  preparedRuntimePreferredAwarenessSummary?: string | null
  preparedRuntimeCompanionHeadlineLine?: string | null
  projectStateEmbodimentClosureSummary?: string | null
  isTimeoutRecovery?: boolean
}) {
  const rawSummary = typeof input.rawSummary === 'string' ? input.rawSummary.trim() || null : null
  const preparedRuntimePreferredAwarenessSummary = typeof input.preparedRuntimePreferredAwarenessSummary === 'string'
    ? input.preparedRuntimePreferredAwarenessSummary.trim() || null
    : null
  const preparedRuntimeCompanionHeadlineLine = typeof input.preparedRuntimeCompanionHeadlineLine === 'string'
    ? input.preparedRuntimeCompanionHeadlineLine.trim() || null
    : null
  const hasEmbodimentClosureSummary = typeof input.projectStateEmbodimentClosureSummary === 'string'
    && input.projectStateEmbodimentClosureSummary.trim().length > 0
  const rawSummaryLooksLikeProjectReanchor = Boolean(
    rawSummary
    && /phase 1|local-first digital life|project|open loop|execution, memory, initiative, and embodiment/iu.test(rawSummary)
    && /same her|same-her|same living line|one living her|one continuous her|同一个她|同一个 her/iu.test(rawSummary),
  )

  if (rawSummary) {
    if (rawSummaryLooksLikeProjectReanchor)
      return 'project-reanchor' as const

    if (shouldTreatAsThinAwarenessShell(rawSummary) || looksLikeSameHerClosureSummary(rawSummary)) {
      if (preparedRuntimePreferredAwarenessSummary && preparedRuntimePreferredAwarenessSummary !== preparedRuntimeCompanionHeadlineLine)
        return 'project-reanchor' as const
      if (preparedRuntimeCompanionHeadlineLine)
        return 'embodiment-headline' as const
    }

    return 'project-reanchor' as const
  }

  if (input.isTimeoutRecovery) {
    if (preparedRuntimePreferredAwarenessSummary && preparedRuntimePreferredAwarenessSummary !== preparedRuntimeCompanionHeadlineLine)
      return hasEmbodimentClosureSummary ? 'hidden' as const : 'project-reanchor' as const
    return 'hidden' as const
  }

  if (preparedRuntimePreferredAwarenessSummary && preparedRuntimePreferredAwarenessSummary !== preparedRuntimeCompanionHeadlineLine)
    return 'project-reanchor' as const

  if (preparedRuntimeCompanionHeadlineLine && !hasEmbodimentClosureSummary)
    return 'embodiment-headline' as const

  return 'hidden' as const
}

function pickStrongerPreparedAwarenessLine(...values: Array<string | null | undefined>) {
  let best = ''
  let bestScore = Number.NEGATIVE_INFINITY

  for (const value of values) {
    const normalized = typeof value === 'string' ? value.trim() : ''
    if (!normalized)
      continue

    let score = normalized.length >= 120 ? 2 : normalized.length >= 72 ? 1 : 0
    if (/before answering, remember:|same phase 1 digital life|one continuous her|local-first digital life|unfinished closure|same living line/iu.test(normalized))
      score += 4
    if (/holding together mainly through|full cross-modal same-her line|face, motion, and lipsync|still-voiced face-and-mouth line|still-voiced motion-and-mouth line|still-voiced face line|still-voiced motion line|audible-body|living audio thread/iu.test(normalized))
      score += 2
    if (/phase 1|local-first digital life|project|open loop|execution, memory, initiative, and embodiment/iu.test(normalized))
      score += 3
    if (
      /holding together mainly through|face, motion, and lipsync|still-voiced face-and-mouth line|still-voiced motion-and-mouth line|still-voiced face line|still-voiced motion line|audible-body|living audio thread/iu.test(normalized)
      && !/phase 1|local-first digital life|project|open loop|execution, memory, initiative, and embodiment/iu.test(normalized)
    ) {
      score -= 2
    }
    if (/keep the same digital life project in view|generic reminder|generic guidance|same digital life \| keep the closure seam explicit/iu.test(normalized))
      score -= 3

    const hasAudibleBodyLivingLine
      = /holding together mainly through body, lipsync, and voice|holding together mainly through body and voice|holding together mainly through face,\s*lipsync,\s*and voice|holding together mainly through motion,\s*lipsync,\s*and voice|holding together mainly through face and voice|holding together mainly through motion and voice|living audio thread|still-voiced face-and-mouth line|still-voiced motion-and-mouth line|still-voiced face line|still-voiced motion line|audible-body|audible body/iu.test(normalized)
    const hasExplicitProjectReanchor
      = /phase 1|local-first digital life|project|open loop|execution, memory, initiative, and embodiment/iu.test(normalized)

    if (hasAudibleBodyLivingLine)
      score += hasExplicitProjectReanchor ? 6 : 7

    if (!best || score > bestScore) {
      best = normalized
      bestScore = score
    }
  }

  return best || null
}

function looksLikeExplicitProjectReanchorAwareness(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized)
    return false

  return /phase 1|local-first digital life|project|open loop|still-open closure|execution, memory, initiative, and embodiment/iu.test(normalized)
    && /same her|same-her|same living line|one living her|one continuous her|同一个她|同一个 her/iu.test(normalized)
}

function looksLikeCallbackSpecificSameHerProjectAwareness(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized)
    return false

  return /callback/iu.test(normalized)
    && /same digital life|same phase 1 digital life|same her|same-her|same living line|closure seam|same closure line forward|one same her/iu.test(normalized)
    && /phase 1|unfinished|still-open closure|still needs|landed|answer compilation|response-surface carry/iu.test(normalized)
}

function looksLikeCanonicalBeforeAnsweringProjectReanchor(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized)
    return false
  if (looksLikeCallbackSpecificSameHerProjectAwareness(normalized))
    return false

  return /^before answering, remember:\s*alicization is a local-first digital life project building one continuous "her"/iu.test(normalized)
    && /she is still inside phase 1:\s*local digital life/iu.test(normalized)
}

function resolvePreparedRuntimeProjectReanchorUpgrade(input: {
  rawSummary?: string | null
  strongerPreparedRuntimeAwarenessLine?: string | null
  preparedRuntimePreferredAwarenessSummary?: string | null
  canonicalProjectAwarenessLine?: string | null
}) {
  const rawSummary = typeof input.rawSummary === 'string' ? input.rawSummary.trim() || null : null
  if (!looksLikeCanonicalBeforeAnsweringProjectReanchor(rawSummary))
    return null

  const canonicalProjectAwarenessLine = typeof input.canonicalProjectAwarenessLine === 'string'
    ? input.canonicalProjectAwarenessLine.trim() || null
    : null
  const bestCandidate = [
    input.strongerPreparedRuntimeAwarenessLine,
    input.preparedRuntimePreferredAwarenessSummary,
  ]
    .map(value => typeof value === 'string' ? value.trim() || null : null)
    .filter((value): value is string =>
      Boolean(value)
      && value !== rawSummary
      && !shouldTreatAsThinAwarenessShell(value)
      && (
        looksLikeExplicitProjectReanchorAwareness(value)
        || looksLikeCanonicalBeforeAnsweringProjectReanchor(value)
      ),
    )
    .reduce<string | null>((best, candidate) => {
      if (!best)
        return candidate

      const bestScore = scoreAlicizationProjectAwarenessLine(best)
      const candidateScore = scoreAlicizationProjectAwarenessLine(candidate)
      if (candidateScore !== bestScore)
        return candidateScore > bestScore ? candidate : best
      return candidate.length > best.length ? candidate : best
    }, null)

  if (!bestCandidate)
    return null

  if (rawSummary === canonicalProjectAwarenessLine)
    return bestCandidate

  const rawScore = scoreAlicizationProjectAwarenessLine(rawSummary)
  const candidateScore = scoreAlicizationProjectAwarenessLine(bestCandidate)
  if (candidateScore > rawScore)
    return bestCandidate
  if (rawSummary && candidateScore === rawScore && bestCandidate.length >= rawSummary.length + 24)
    return bestCandidate
  return null
}

function looksLikeEmbodimentClosureHeadline(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized)
    return false

  return /holding together mainly through|holding together through face,\s*motion,\s*lipsync,\s*and voice together|visible same-her line has already rejoined without body carry|face, motion, and lipsync|face and motion|still-voiced face-and-mouth line|still-voiced motion-and-mouth line|still-voiced face line|still-voiced motion line|audible-body|living audio thread/iu.test(normalized)
    && !/before answering|before i answer/iu.test(normalized)
}

function synthesizeAuthorityOnlyEmbodimentCompanionHeadline(input: {
  authoritySummary?: string | null
  currentBodyState?: string | null
} | null | undefined) {
  const authoritySummary = typeof input?.authoritySummary === 'string'
    ? input.authoritySummary.trim() || null
    : null
  const currentBodyState = typeof input?.currentBodyState === 'string'
    ? input.currentBodyState.trim() || null
    : null
  if (!authoritySummary && !currentBodyState)
    return null

  const synthesizedHeadline = describeAlicizationEmbodimentClosureHeadline({
    authoritySummary,
    currentBodyState,
  }).trim() || null

  return synthesizedHeadline && looksLikeEmbodimentClosureHeadline(synthesizedHeadline)
    ? synthesizedHeadline
    : null
}

function resolveTimeoutRecoveredProjectAwarenessSummary(input: {
  preferredAwarenessSummary: string | null
  companionHeadlineLine: string | null
  embodimentClosureSummary: string | null
  canonicalProjectAwarenessLine: string | null
  explicitRuntimeAwarenessLine: string | null
  explicitRuntimeAwarenessSummary: string | null
}) {
  const preferredAwarenessSummary = typeof input.preferredAwarenessSummary === 'string'
    ? input.preferredAwarenessSummary.trim() || null
    : null
  const companionHeadlineLine = typeof input.companionHeadlineLine === 'string'
    ? input.companionHeadlineLine.trim() || null
    : null
  const canonicalProjectAwarenessLine = typeof input.canonicalProjectAwarenessLine === 'string'
    ? input.canonicalProjectAwarenessLine.trim() || null
    : null
  const explicitRuntimeAwarenessLine = typeof input.explicitRuntimeAwarenessLine === 'string'
    ? input.explicitRuntimeAwarenessLine.trim() || null
    : null
  const explicitRuntimeAwarenessSummary = typeof input.explicitRuntimeAwarenessSummary === 'string'
    ? input.explicitRuntimeAwarenessSummary.trim() || null
    : null
  const thinExplicitRuntimeAwarenessSummary = shouldTreatAsThinAwarenessShell(explicitRuntimeAwarenessSummary)
    ? explicitRuntimeAwarenessSummary
    : null
  const hasExplicitRuntimeProjectReanchor = Boolean(
    explicitRuntimeAwarenessLine
    || (
      explicitRuntimeAwarenessSummary
      && !shouldTreatAsThinAwarenessShell(explicitRuntimeAwarenessSummary)
    ),
  )

  if (thinExplicitRuntimeAwarenessSummary && !hasExplicitRuntimeProjectReanchor)
    return thinExplicitRuntimeAwarenessSummary

  if (!preferredAwarenessSummary)
    return canonicalProjectAwarenessLine

  if (shouldTreatAsThinAwarenessShell(preferredAwarenessSummary)) {
    if (!hasExplicitRuntimeProjectReanchor)
      return preferredAwarenessSummary
    return canonicalProjectAwarenessLine
  }

  const displayMode = resolveVisibleReplyProjectAwarenessDisplayMode({
    rawSummary: null,
    preparedRuntimePreferredAwarenessSummary: preferredAwarenessSummary,
    preparedRuntimeCompanionHeadlineLine: companionHeadlineLine,
    projectStateEmbodimentClosureSummary: input.embodimentClosureSummary,
    isTimeoutRecovery: false,
  })

  if (displayMode === 'embodiment-headline')
    return companionHeadlineLine ?? null

  if (!hasExplicitRuntimeProjectReanchor)
    return canonicalProjectAwarenessLine ?? preferredAwarenessSummary

  return preferredAwarenessSummary
}

function preferStrongerSameHerSummary(input: {
  current?: string | null
  candidate?: string | null
}) {
  const current = typeof input.current === 'string' ? input.current.trim() : ''
  const candidate = typeof input.candidate === 'string' ? input.candidate.trim() : ''
  const looksLikeSameHerCandidate = (value: string) => {
    const lower = value.toLowerCase()
    return (
      /same phase 1 digital life|same digital life/u.test(lower)
      && /some closure already landed|unfinished closure still needs|same living line|one continuous her/u.test(lower)
    ) || /one continuous her|one living her/u.test(lower)
  }

  if (!current)
    return looksLikeSameHerCandidate(candidate) ? candidate || null : null
  if (!candidate)
    return current || null
  if (current === candidate)
    return current

  const currentLower = current.toLowerCase()
  const candidateLower = candidate.toLowerCase()
  const looksLikeExplicitSameHerSelfLine = (value: string) =>
    /same phase 1 digital life|same digital life/u.test(value)
    && /same living line|unfinished closure still needs|one continuous her/u.test(value)
  const looksLikeExplicitPhaseOneSameHerClosureSelfLine = (value: string) =>
    /same phase 1 digital life|same digital life/u.test(value)
    && /some closure already landed|unfinished closure still needs|same living line/u.test(value)
  const looksLikeProjectLandedProgressCarry = (value: string) =>
    /ordinary continuation|runtime project-state carry|answer-planner same-her continuity/u.test(value)
    && !/unfinished closure still needs|same living line/u.test(value)
  const currentMentionsContinuousHer
    = currentLower.includes('continuous her') || currentLower.includes('one continuous her')
  const candidateMentionsContinuousHer
    = candidateLower.includes('continuous her') || candidateLower.includes('one continuous her')
  const currentOnlyCarriesLivingLine
    = currentLower.includes('same living line') && !currentMentionsContinuousHer
  const candidateOnlyCarriesLivingLine
    = candidateLower.includes('same living line') && !candidateMentionsContinuousHer

  if (currentMentionsContinuousHer && candidateOnlyCarriesLivingLine)
    return current
  if (candidateMentionsContinuousHer && currentOnlyCarriesLivingLine)
    return candidate
  if (looksLikeExplicitPhaseOneSameHerClosureSelfLine(currentLower) && looksLikeProjectLandedProgressCarry(candidateLower))
    return current
  if (looksLikeExplicitPhaseOneSameHerClosureSelfLine(candidateLower) && looksLikeProjectLandedProgressCarry(currentLower))
    return candidate
  if (looksLikeExplicitSameHerSelfLine(currentLower) && looksLikeProjectLandedProgressCarry(candidateLower))
    return current
  if (looksLikeExplicitSameHerSelfLine(candidateLower) && looksLikeProjectLandedProgressCarry(currentLower))
    return candidate
  if (looksLikeSameHerCandidate(current) && !looksLikeSameHerCandidate(candidate))
    return current
  if (!looksLikeSameHerCandidate(current) && looksLikeSameHerCandidate(candidate))
    return candidate
  if (!looksLikeSameHerCandidate(current) && !looksLikeSameHerCandidate(candidate))
    return current

  return candidate.length > current.length ? candidate : current
}

function extractStrongerSameHerSummaryFromAuthoritySummary(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized)
    return null

  const looksLikeSameHerSelfLine = (candidate: string) =>
    /same phase 1 digital life|same digital life|one continuous her|one living her|same living line/iu.test(candidate)
    && (!/ordinary continuation|runtime project-state carry|answer-planner same-her continuity/iu.test(candidate)
      || /unfinished closure still needs|same phase 1 digital life/iu.test(candidate))

  const match = normalized.match(/[^|]*continuous her[^|]*/iu)
  if (match?.[0]) {
    const candidate = match[0].trim()
    if (candidate && looksLikeSameHerSelfLine(candidate))
      return candidate
  }

  return /continuous her|one continuous her/iu.test(normalized) && looksLikeSameHerSelfLine(normalized)
    ? normalized
    : null
}

export function createAlicizationVisibleReplyExecution(input: {
  mode: AlicizationVisibleReplyExecutionMode
  expectedVisibleReplyAuthority: AlicizationVisibleReplyExecution['expectedVisibleReplyAuthority']
  actualVisibleReplyAuthority?: AlicizationVisibleReplyExecution['actualVisibleReplyAuthority']
  providerMindExecuted?: boolean
  reason?: string | null
}): AlicizationVisibleReplyExecution {
  const providerMindExecuted = input.providerMindExecuted ?? input.mode !== 'local-fallback'
  const expectedVisibleReplyAuthority = normalizeAlicizationNormalVisibleReplyAuthority(
    input.expectedVisibleReplyAuthority,
    'llm-mind',
  )
  const actualVisibleReplyAuthority = resolveActualVisibleReplyAuthority({
    mode: input.mode,
    expectedVisibleReplyAuthority,
    requestedAuthority: input.actualVisibleReplyAuthority,
    providerMindExecuted,
  })

  return {
    mode: input.mode,
    expectedVisibleReplyAuthority,
    actualVisibleReplyAuthority: actualVisibleReplyAuthority ?? null,
    providerMindExecuted,
    reason: input.reason ?? null,
  }
}

export function buildAlicizationVisibleReplyRealizationArtifact(input: {
  fullText?: string | null
  visibleReplyExecution: AlicizationVisibleReplyExecution
  emotionalClosureCue?: string | null
  selfAuthoritySummary?: string | null
  selfAuthorityClosenessPosture?: string | null
  projectStateSameHerSummary?: string | null
  projectStateSameHerHoldDetail?: string | null
  projectStateContinuityArcStage?: string | null
  projectStateContinuityCue?: string | null
  projectStateSameHerDriftRiskSummary?: string | null
  projectStateProactiveSameHerGapSummary?: string | null
  projectStateCurrentPhaseSummary?: string | null
  projectStateLandedProgressSummary?: string | null
  projectStateOpenClosureSummary?: string | null
  projectStateClosureSummary?: string | null
  projectStateNextClosureTargetSummary?: string | null
  projectStateEmotionalClosureSummary?: string | null
  projectStateRelationshipTruthSummary?: string | null
  projectStatePreDialogueAwarenessSummary?: string | null
  projectStateRewriteClosureApplied?: boolean | null
  prepared?: AlicizationPreparedMainChatExecutionResult | null
  critic?: AlicizationVisibleReplyCriticArtifact | null
  closure?: AlicizationVisibleReplyClosureArtifact | null
}): AlicizationVisibleReplyRealizationArtifact {
  const localDeterministicFallback = isLocalDeterministicVisibleFallback(input.visibleReplyExecution)
  const parsedFullText = parseJsonObjectFromText(typeof input.fullText === 'string' ? input.fullText : '')
  const parsedVisibleReplyRealization = parsedFullText?.visibleReplyRealization
    && typeof parsedFullText.visibleReplyRealization === 'object'
    ? parsedFullText.visibleReplyRealization as Record<string, unknown>
    : null
  const parsedTopLevelProjectStateAudit = parsedFullText?.projectStateAudit
    && typeof parsedFullText.projectStateAudit === 'object'
    ? parsedFullText.projectStateAudit as Record<string, unknown>
    : null
  const parsedVisibleReplyProjectStateAudit = parsedVisibleReplyRealization?.projectStateAudit
    && typeof parsedVisibleReplyRealization.projectStateAudit === 'object'
    ? parsedVisibleReplyRealization.projectStateAudit as Record<string, unknown>
    : null
  const parsedProjectStateAudit = parsedVisibleReplyProjectStateAudit ?? parsedTopLevelProjectStateAudit
  const parsedProjectState = parsedFullText?.projectState
    && typeof parsedFullText.projectState === 'object'
    ? parsedFullText.projectState as Record<string, unknown>
    : null
  const parsedRuntimeDigest = parsedFullText?.runtimeDigest
    && typeof parsedFullText.runtimeDigest === 'object'
    ? parsedFullText.runtimeDigest as Record<string, unknown>
    : null
  const parsedRuntimeDigestProjectState = parsedRuntimeDigest?.projectState
    && typeof parsedRuntimeDigest.projectState === 'object'
    ? parsedRuntimeDigest.projectState as Record<string, unknown>
    : null
  const readParsedText = (value: unknown) => typeof value === 'string'
    ? value.trim() || null
    : null
  const visibleText = localDeterministicFallback
    ? ''
    : deriveAlicizationVisibleReplyText(input.fullText ?? '')
  const selfAuthoritySummary = typeof input.selfAuthoritySummary === 'string'
    ? input.selfAuthoritySummary.trim() || null
    : null
  const selfAuthorityClosenessPosture = typeof input.selfAuthorityClosenessPosture === 'string'
    ? input.selfAuthorityClosenessPosture.trim() || null
    : null
  const explicitProjectStateSameHerSummary = typeof input.projectStateSameHerSummary === 'string'
    ? input.projectStateSameHerSummary.trim() || null
    : null
  const parsedProjectStateSameHerSummary = preferStrongerSameHerSummary({
    current: readParsedText(parsedProjectStateAudit?.sameHerSummary),
    candidate:
      readParsedText(parsedProjectState?.sameHerSelfLine)
      ?? readParsedText(parsedRuntimeDigestProjectState?.sameHerSelfLine),
  })
  const projectStateSameHerSummary = looksLikeProjectStateSameHerPreserveInstruction(explicitProjectStateSameHerSummary)
    ? explicitProjectStateSameHerSummary
    : preferStrongerSameHerSummary({
        current: explicitProjectStateSameHerSummary,
        candidate: parsedProjectStateSameHerSummary,
      })
  const explicitProjectStateSameHerHoldDetail = normalizeHoldDetail(input.projectStateSameHerHoldDetail)
  const authoritativeInputSameHerSummary
    = projectStateSameHerSummary
      && !looksLikeRicherProjectClosureCarry(projectStateSameHerSummary)
      ? projectStateSameHerSummary
      : null
  const preparedRuntimeProjectState = input.prepared
    ? resolvePreparedRuntimeProjectState(input.prepared)
    : null
  const preparedRuntimeProjectStateRecord = preparedRuntimeProjectState as Record<string, unknown> | null
  const projectStateCurrentPhaseSummary = preferRicherProjectStateAuditText({
    current: typeof input.projectStateCurrentPhaseSummary === 'string'
      ? input.projectStateCurrentPhaseSummary.trim() || null
      : null,
    candidate:
      readParsedText(parsedProjectStateAudit?.currentPhaseSummary)
      ?? readParsedText(parsedProjectState?.currentPhase)
      ?? readParsedText(parsedRuntimeDigestProjectState?.currentPhase),
  })
  const projectStateLandedProgressSummary = preferRicherProjectStateAuditText({
    current: typeof input.projectStateLandedProgressSummary === 'string'
      ? input.projectStateLandedProgressSummary.trim() || null
      : null,
    candidate:
      readParsedText(parsedProjectStateAudit?.landedProgressSummary)
      ?? readParsedText(parsedProjectState?.latestLandedProgress)
      ?? readParsedText(parsedProjectState?.latestProgress)
      ?? readParsedText(parsedProjectState?.landedProgressSummary)
      ?? readParsedText(parsedRuntimeDigestProjectState?.latestLandedProgress)
      ?? readParsedText(parsedRuntimeDigestProjectState?.latestProgress)
      ?? readParsedText(parsedRuntimeDigestProjectState?.landedProgressSummary),
  })
  const projectStateOpenClosureSummary = preferRicherProjectStateAuditText({
    current: typeof input.projectStateOpenClosureSummary === 'string'
      ? input.projectStateOpenClosureSummary.trim() || null
      : null,
    candidate:
      readParsedText(parsedProjectStateAudit?.openClosureSummary)
      ?? readParsedText(parsedProjectState?.primaryOpenLoop)
      ?? readParsedText(parsedRuntimeDigestProjectState?.primaryOpenLoop),
  })
  const projectStateClosureSummary = typeof input.projectStateClosureSummary === 'string'
    ? input.projectStateClosureSummary.trim() || null
    : null
  const projectStateNextClosureTargetSummary = preferRicherProjectStateAuditText({
    current: typeof input.projectStateNextClosureTargetSummary === 'string'
      ? input.projectStateNextClosureTargetSummary.trim() || null
      : null,
    candidate:
      readParsedText(parsedProjectStateAudit?.nextClosureTargetSummary)
      ?? readParsedText(parsedProjectState?.nextClosureTarget)
      ?? readParsedText(parsedRuntimeDigestProjectState?.nextClosureTarget),
  })
  const projectStateEmotionalClosureSummary = preferRicherProjectStateAuditText({
    current: typeof input.projectStateEmotionalClosureSummary === 'string'
      ? input.projectStateEmotionalClosureSummary.trim() || null
      : null,
    candidate: readParsedText(parsedProjectStateAudit?.emotionalClosureSummary),
  })
  const activeCue = preferRicherProjectStateAuditText({
    current: typeof input.emotionalClosureCue === 'string'
      ? input.emotionalClosureCue.trim() || null
      : null,
    candidate:
      readParsedText(parsedProjectStateAudit?.emotionalClosureCue)
      ?? projectStateEmotionalClosureSummary,
  })
  const projectStateRelationshipTruthSummary = typeof input.projectStateRelationshipTruthSummary === 'string'
    ? input.projectStateRelationshipTruthSummary.trim() || null
    : null
  const projectStateSameHerDriftRiskSummary = preferRicherProjectStateAuditText({
    current: typeof input.projectStateSameHerDriftRiskSummary === 'string'
      ? input.projectStateSameHerDriftRiskSummary.trim() || null
      : null,
    candidate: readParsedText(parsedProjectStateAudit?.sameHerDriftRiskSummary),
  })
  const projectStateProactiveSameHerGapSummary = preferRicherProjectStateAuditText({
    current: typeof input.projectStateProactiveSameHerGapSummary === 'string'
      ? input.projectStateProactiveSameHerGapSummary.trim() || null
      : null,
    candidate:
      readParsedText(parsedProjectStateAudit?.proactiveSameHerGapSummary)
      ?? readParsedText(parsedProjectState?.proactiveSameHerGap)
      ?? readParsedText(parsedRuntimeDigestProjectState?.proactiveSameHerGap)
      ?? readParsedText(preparedRuntimeProjectStateRecord?.proactiveSameHerGap),
  })
  const preferredRuntimeSelfContinuityAuthority = resolvePreparedRuntimeSelfContinuityAuthority(input.prepared)
  const preferredEmbodimentClosureAuthority = resolvePreparedRuntimeEmbodimentClosureAuthority({
    prepared: input.prepared,
    leadingAuthoritySummaryCandidates: [selfAuthoritySummary],
  })
  const projectStateEmbodimentClosureSummary = preferRicherProjectStateAuditText({
    current: readParsedText(parsedProjectStateAudit?.embodimentClosureSummary),
    candidate:
      buildAlicizationEmbodimentLoopSummary({
        authoritySummary: preferredEmbodimentClosureAuthority.authoritySummary,
        currentBodyState: preferredEmbodimentClosureAuthority.currentBodyState,
      })
      || describeAlicizationEmbodimentClosureReminder({
        authoritySummary: preferredEmbodimentClosureAuthority.authoritySummary,
        currentBodyState: preferredEmbodimentClosureAuthority.currentBodyState,
      })
      || null,
  })
  const projectStatePreDialogueAwarenessSummaryRaw = preferProjectStateAuditPreDialogueAwarenessSummary(
    typeof input.projectStatePreDialogueAwarenessSummary === 'string'
      ? input.projectStatePreDialogueAwarenessSummary.trim() || null
      : null,
    readParsedText(parsedProjectStateAudit?.preDialogueAwarenessSummary)
    ?? readParsedText(parsedProjectState?.preDialogueAwarenessSummary)
    ?? readParsedText(parsedProjectState?.preDialogueAwarenessLine)
    ?? readParsedText(parsedProjectState?.awarenessLine)
    ?? readParsedText(parsedRuntimeDigestProjectState?.preDialogueAwarenessSummary)
    ?? readParsedText(parsedRuntimeDigestProjectState?.preDialogueAwarenessLine)
    ?? readParsedText(parsedRuntimeDigestProjectState?.awarenessLine),
  )
  const preparedCurrentConsciousSpeakingIntention = typeof input.prepared?.runtimeSurface?.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.speakingIntention === 'string'
    ? input.prepared.runtimeSurface.digitalLifeRuntimeSurface.dialogue.currentConsciousFrame.speakingIntention.trim() || null
    : null
  const preparedCurrentConsciousNeed = typeof input.prepared?.runtimeSurface?.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.consciousNeed === 'string'
    ? input.prepared.runtimeSurface.digitalLifeRuntimeSurface.dialogue.currentConsciousFrame.consciousNeed.trim() || null
    : null
  const projectStateInitiativeClosureSummary = preferRicherProjectStateAuditText({
    current:
      preparedCurrentConsciousSpeakingIntention
      && /initiative should|same digital life carrying memory, emotion, and embodiment|same living line before widening|rechecking on the same living line/u.test(
        preparedCurrentConsciousSpeakingIntention.toLowerCase(),
      )
        ? preparedCurrentConsciousSpeakingIntention
        : null,
    candidate:
      preparedCurrentConsciousNeed
      && /initiative should|same digital life carrying memory, emotion, and embodiment|same living line before widening|rechecking on the same living line/u.test(
        preparedCurrentConsciousNeed.toLowerCase(),
      )
        ? preparedCurrentConsciousNeed
        : null,
  })
  const canonicalProjectState = resolveAlicizationProjectStateBrief()
  const resolvedProjectStateContinuityArcStage = readParsedText(input.projectStateContinuityArcStage)
    ?? readParsedText(parsedProjectStateAudit?.continuityArcStage)
    ?? readParsedText(parsedProjectState?.continuityArcStage)
    ?? readParsedText(parsedRuntimeDigestProjectState?.continuityArcStage)
    ?? readParsedText(preparedRuntimeProjectStateRecord?.continuityArcStage)
  const projectStatePreserveLines = collectProjectStatePreserveLines({
    critic: input.critic,
    closure: input.closure,
  })
  const correctedSamePersonAuthorityHoldDetail
    = projectStatePreserveLines.find(looksLikeCorrectedSamePersonAuthorityHoldDetail)
      ?? null
  const correctedSamePersonContinuityCue
    = projectStatePreserveLines.find(looksLikeCorrectedSamePersonContinuityCue)
      ?? null
  const resumeConfirmationBoundaryHoldDetail
    = projectStatePreserveLines.find(looksLikeResumeConfirmationBoundaryHoldDetail)
      ?? null
  const resumeConfirmationBoundaryContinuityCue
    = projectStatePreserveLines.find(looksLikeResumeConfirmationBoundaryContinuityCue)
      ?? null
  const resolvedProjectStateContinuityCue = [
    readParsedText(input.projectStateContinuityCue),
    readParsedText(parsedProjectStateAudit?.continuityCue),
    readParsedText(parsedProjectState?.continuityCue),
    readParsedText(parsedRuntimeDigestProjectState?.continuityCue),
    readParsedText(preparedRuntimeProjectStateRecord?.continuityCue),
    resumeConfirmationBoundaryContinuityCue,
    correctedSamePersonContinuityCue,
  ].reduce<string | null>((preferred, candidate) => {
    if (
      preferred
      && !looksLikeCanonicalProjectStateContinuityCue(preferred)
      && looksLikeCanonicalProjectStateContinuityCue(candidate)
    ) {
      return preferred
    }

    if (
      candidate
      && !looksLikeCanonicalProjectStateContinuityCue(candidate)
      && looksLikeCanonicalProjectStateContinuityCue(preferred)
    ) {
      return candidate
    }

    return preferRicherProjectStateAuditText({
      current: preferred,
      candidate,
    }) ?? preferred ?? candidate ?? null
  }, null)
  const parsedProjectStateSameHerHoldDetail = normalizeHoldDetail(
    parsedProjectStateAudit?.sameHerHoldDetail as string | null | undefined,
  )
  ?? normalizeHoldDetail(parsedProjectState?.sameHerHoldDetail as string | null | undefined)
  ?? normalizeHoldDetail(parsedRuntimeDigestProjectState?.sameHerHoldDetail as string | null | undefined)
  const explicitPreparedRuntimeAwarenessLine = resolveExplicitPreparedRuntimeProjectAwarenessLine(input.prepared)
  const preparedRuntimePreferredAwarenessSummary
    = (explicitPreparedRuntimeAwarenessLine && !shouldTreatAsThinAwarenessShell(explicitPreparedRuntimeAwarenessLine)
      ? explicitPreparedRuntimeAwarenessLine
      : null)
    ?? resolvePreparedRuntimeProjectPreDialogueAwarenessSummary(input.prepared)
    ?? resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: preparedRuntimeProjectState
        ? {
            sameHerSelfLine: preparedRuntimeProjectState.sameHerSelfLine,
            preDialogueAwarenessLine: preparedRuntimeProjectState.preDialogueAwarenessLine,
            awarenessLine: preparedRuntimeProjectState.awarenessLine,
            companionHeadlineLine: preparedRuntimeProjectState.companionHeadlineLine,
            companionBriefingLine: preparedRuntimeProjectState.companionBriefingLine,
            preDialogueAwarenessSummary: preparedRuntimeProjectState.preDialogueAwarenessSummary,
            preflightSummary: preparedRuntimeProjectState.preflightSummary,
          }
        : null,
      fallbackProjectState: canonicalProjectState,
    })
  const preparedRuntimeCompanionHeadlineLine = typeof preparedRuntimeProjectState?.companionHeadlineLine === 'string'
    ? preparedRuntimeProjectState.companionHeadlineLine.trim() || null
    : null
  const strongerPreparedRuntimeAwarenessLine = pickStrongerPreparedAwarenessLine(
    explicitPreparedRuntimeAwarenessLine,
    preparedRuntimeProjectState?.preDialogueAwarenessLine ?? null,
    preparedRuntimeProjectState?.awarenessLine ?? null,
    preparedRuntimeProjectState?.preDialogueAwarenessSummary ?? null,
    preparedRuntimeProjectState?.companionBriefingLine ?? null,
    preparedRuntimeProjectState?.companionHeadlineLine ?? null,
    preparedRuntimeProjectState?.preflightSummary ?? null,
  )
  const preparedRuntimeAwarenessInputs = [
    preparedRuntimeProjectState?.preDialogueAwarenessLine,
    preparedRuntimeProjectState?.awarenessLine,
    preparedRuntimeProjectState?.preDialogueAwarenessSummary,
    preparedRuntimeProjectState?.preflightSummary,
    preparedRuntimeProjectState?.companionHeadlineLine,
    preparedRuntimeProjectState?.companionBriefingLine,
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  const preparedRuntimeAwarenessLooksThin = isAlicizationThinProjectAwarenessLine(
    preparedRuntimeProjectState?.preDialogueAwarenessLine
    ?? preparedRuntimeProjectState?.awarenessLine
    ?? preparedRuntimeProjectState?.preDialogueAwarenessSummary
    ?? preparedRuntimeProjectState?.preflightSummary
    ?? null,
  )
  const isTimeoutRecovery = Boolean(
    input.visibleReplyExecution.reason?.startsWith('timeout-recovered-'),
  )
  const projectAwarenessDisplayMode = resolveVisibleReplyProjectAwarenessDisplayMode({
    rawSummary: projectStatePreDialogueAwarenessSummaryRaw,
    preparedRuntimePreferredAwarenessSummary,
    preparedRuntimeCompanionHeadlineLine,
    projectStateEmbodimentClosureSummary,
    isTimeoutRecovery: Boolean(isTimeoutRecovery),
  })
  const projectStatePreDialogueAwarenessSummary = resolveVisibleReplyProjectAwarenessSummary({
    rawSummary: projectStatePreDialogueAwarenessSummaryRaw,
    strongerPreparedRuntimeAwarenessLine,
    preparedRuntimePreferredAwarenessSummary,
    preparedRuntimeCompanionHeadlineLine,
    canonicalProjectAwarenessLine: canonicalProjectState.preDialogueAwarenessLine ?? null,
    preparedRuntimeAwarenessInputsCount: preparedRuntimeAwarenessInputs.length,
    preparedRuntimeAwarenessLooksThin,
    allowPreparedRuntimeBackfill: Boolean(projectStatePreDialogueAwarenessSummaryRaw),
    preferPreparedRuntimeAwarenessDisplay: projectAwarenessDisplayMode === 'project-reanchor',
    displayMode: projectAwarenessDisplayMode,
  })
  const richerProjectClosureAwarenessReanchor = (
    (
      isAlicizationThinProjectAwarenessLine(projectStatePreDialogueAwarenessSummary)
      || (
        isTimeoutRecovery
        && shouldTreatAsThinAwarenessShell(projectStatePreDialogueAwarenessSummaryRaw)
      )
    )
    && (
      looksLikeRicherProjectClosureCarry(projectStateLandedProgressSummary)
      || looksLikeRicherProjectClosureCarry(projectStateOpenClosureSummary)
      || looksLikeRicherProjectClosureCarry(projectStateNextClosureTargetSummary)
    )
  )
    ? resolveAlicizationProjectPreDialogueAwarenessLine({
        runtimeProjectState: {
          preDialogueAwarenessLine: buildAlicizationProjectPreDialogueAwarenessLine({
            identity: preparedRuntimeProjectState?.identity ?? canonicalProjectState.identity,
            currentPhase: projectStateCurrentPhaseSummary ?? canonicalProjectState.currentPhase,
            latestLandedProgress:
              projectStateLandedProgressSummary
              ?? preparedRuntimeProjectState?.latestProgress
              ?? preparedRuntimeProjectState?.latestLandedProgress
              ?? canonicalProjectState.latestProgress,
            primaryOpenLoop: projectStateOpenClosureSummary ?? canonicalProjectState.primaryOpenLoop,
            nextClosureTarget: projectStateNextClosureTargetSummary ?? canonicalProjectState.nextClosureTarget,
            sameHerSelfLine:
              input.projectStateSameHerSummary
              ?? preparedRuntimeProjectState?.sameHerSelfLine
              ?? canonicalProjectState.sameHerSelfLine,
          }),
          preDialogueAwarenessSummary: projectStatePreDialogueAwarenessSummary,
          sameHerDriftRiskSummary: projectStateSameHerDriftRiskSummary ?? null,
          preflightSummary: preparedRuntimeProjectState?.preflightSummary ?? canonicalProjectState.preflightSummary ?? null,
        },
        fallbackProjectState: {
          preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine ?? null,
          preDialogueAwarenessSummary: canonicalProjectState.preDialogueAwarenessLine ?? null,
          preflightSummary: canonicalProjectState.preflightSummary ?? null,
          sameHerDriftRiskSummary: canonicalProjectState.sameHerDriftRisk ?? null,
        },
      })
    : null
  const resolvedProjectStatePreDialogueAwarenessSummary
    = richerProjectClosureAwarenessReanchor ?? projectStatePreDialogueAwarenessSummary
  const resolvedProjectStateSameHerHoldDetail = resolvePreferredSameHerHoldDetail({
    current: explicitProjectStateSameHerHoldDetail ?? parsedProjectStateSameHerHoldDetail,
    candidate: correctedSamePersonAuthorityHoldDetail
      ?? resumeConfirmationBoundaryHoldDetail
      ?? parsedProjectStateSameHerHoldDetail
      ?? normalizeHoldDetail(preparedRuntimeProjectState?.sameHerHoldDetail),
    continuityCue: [
      activeCue,
      resolvedProjectStateContinuityCue,
      resolvedProjectStateContinuityArcStage,
      projectStateEmotionalClosureSummary,
      projectStateClosureSummary,
      resolvedProjectStatePreDialogueAwarenessSummary,
      projectStatePreDialogueAwarenessSummaryRaw,
    ].filter((value): value is string => Boolean(value)).join(' | '),
  })
  const preferredCadenceAwareProjectStateAwarenessSummary = (
    shouldTreatAsThinAwarenessShell(projectStatePreDialogueAwarenessSummaryRaw)
    && looksLikeCadenceAwareSameHerHoldDetail(resolvedProjectStateSameHerHoldDetail)
  )
    ? resolvedProjectStateSameHerHoldDetail
    : null
  const explicitPreparedRuntimeSameHerSummary = (() => {
    const explicitPreparedSameHer = typeof preparedRuntimeProjectState?.sameHerSelfLine === 'string'
      ? preparedRuntimeProjectState.sameHerSelfLine.trim() || null
      : null
    if (!explicitPreparedSameHer)
      return null

    return /same phase 1 digital life|same living line|one same her|one continuous her|without splitting her continuity/u.test(
      explicitPreparedSameHer,
    )
      ? explicitPreparedSameHer
      : null
  })()
  const strongerSameHerSummaryFromAuthority = extractStrongerSameHerSummaryFromAuthoritySummary(
    selfAuthoritySummary
    ?? preferredRuntimeSelfContinuityAuthority?.authoritySummary
    ?? null,
  )
  const resolvedProjectStateSameHerSummary = preferStrongerSameHerSummary({
    current:
      authoritativeInputSameHerSummary
      ?? projectStateSameHerSummary
      ?? explicitPreparedRuntimeSameHerSummary,
    candidate: strongerSameHerSummaryFromAuthority,
  })
  const finalResolvedProjectStateSameHerSummary
    = authoritativeInputSameHerSummary ?? resolvedProjectStateSameHerSummary
  const projectStateOpenFocusSummary = deriveCompactProjectStateOpenFocusSummary(
    projectStateOpenClosureSummary,
    {
      emotionalClosureCue: activeCue ?? projectStateEmotionalClosureSummary ?? null,
    },
  )
  const projectStateNextFocusSummary = deriveCompactProjectStateNextFocusSummary(
    projectStateNextClosureTargetSummary,
    {
      emotionalClosureCue: activeCue ?? projectStateEmotionalClosureSummary ?? null,
    },
  )
  const prioritizedProjectStateContinuityCarry = buildPrioritizedProjectStateRewritePreserveLines({
    projectStateContinuityAnchors: [
      finalResolvedProjectStateSameHerSummary ? `same-her=${finalResolvedProjectStateSameHerSummary}` : '',
      resolvedProjectStateSameHerHoldDetail ? `hold=${resolvedProjectStateSameHerHoldDetail}` : '',
      resolvedProjectStateContinuityArcStage ? `arc=${resolvedProjectStateContinuityArcStage}` : '',
      resolvedProjectStateContinuityCue ? `cue=${resolvedProjectStateContinuityCue}` : '',
      projectStateCurrentPhaseSummary ? `phase=${projectStateCurrentPhaseSummary}` : '',
      projectStateLandedProgressSummary ? `landed=${projectStateLandedProgressSummary}` : '',
      projectStateOpenClosureSummary ? `open=${projectStateOpenClosureSummary}` : '',
      projectStateNextClosureTargetSummary ? `next=${projectStateNextClosureTargetSummary}` : '',
      projectStateProactiveSameHerGapSummary ? `proactive-gap=${projectStateProactiveSameHerGapSummary}` : '',
      projectStateEmotionalClosureSummary ? `closure-emotion=${projectStateEmotionalClosureSummary}` : '',
      projectStateRelationshipTruthSummary ? `relationship-truth=${projectStateRelationshipTruthSummary}` : '',
    ].filter(Boolean),
  })
  const projectStateContinuitySummary = [
    ...prioritizedProjectStateContinuityCarry,
    projectStateSameHerDriftRiskSummary ? `drift=${projectStateSameHerDriftRiskSummary}` : null,
    projectStateClosureSummary ? `closure=${projectStateClosureSummary}` : null,
    projectStateEmbodimentClosureSummary ? `body=${projectStateEmbodimentClosureSummary}` : null,
  ].filter(Boolean).join(' | ') || null
  const selfAuthorityClosenessCue = selfAuthorityClosenessPosture
    ? `Shared self closeness posture: ${selfAuthorityClosenessPosture}.`
    : null
  const holdResolution = resolveCompanionshipHoldMode({
    emotionalClosureCue: activeCue,
    projectStateClosureSummary,
    projectStatePreDialogueAwarenessSummary: resolvedProjectStatePreDialogueAwarenessSummary,
    projectStateInitiativeClosureSummary,
    openingGuidance:
      input.prepared?.governance?.openingMove
      ?? input.prepared?.governance?.mindTurnFrame?.obligation?.openingMove
      ?? input.prepared?.runtimeSurface?.governance?.openingMove
      ?? null,
  })
  const blockedReasons = localDeterministicFallback
    ? ['non-human-authored-visible-fallback']
    : []
  const projectStatePreservedIntoRewrite = Boolean(
    (finalResolvedProjectStateSameHerSummary && projectStatePreserveLines.includes(finalResolvedProjectStateSameHerSummary))
    || (resolvedProjectStateSameHerHoldDetail && projectStatePreserveLines.includes(resolvedProjectStateSameHerHoldDetail))
    || (resolvedProjectStateContinuityArcStage && projectStatePreserveLines.includes(resolvedProjectStateContinuityArcStage))
    || (resolvedProjectStateContinuityCue && projectStatePreserveLines.includes(resolvedProjectStateContinuityCue))
    || (projectStateSameHerDriftRiskSummary && projectStatePreserveLines.includes(projectStateSameHerDriftRiskSummary))
    || (projectStateProactiveSameHerGapSummary && projectStatePreserveLines.includes(`proactive-gap=${projectStateProactiveSameHerGapSummary}`))
    || (projectStateCurrentPhaseSummary && projectStatePreserveLines.includes(projectStateCurrentPhaseSummary))
    || (projectStateLandedProgressSummary && projectStatePreserveLines.includes(projectStateLandedProgressSummary))
    || (projectStateOpenClosureSummary && projectStatePreserveLines.includes(projectStateOpenClosureSummary))
    || (projectStateNextClosureTargetSummary && projectStatePreserveLines.includes(projectStateNextClosureTargetSummary))
    || (projectStateEmotionalClosureSummary && projectStatePreserveLines.includes(projectStateEmotionalClosureSummary))
    || (projectStateClosureSummary && projectStatePreserveLines.includes(projectStateClosureSummary))
    || (projectStateEmbodimentClosureSummary && projectStatePreserveLines.includes(projectStateEmbodimentClosureSummary))
    || (resolvedProjectStatePreDialogueAwarenessSummary && projectStatePreserveLines.includes(resolvedProjectStatePreDialogueAwarenessSummary))
    || projectStatePreserveLines.includes(sameHerProjectFollowThroughPreserveLine)
    || parsedProjectStateAudit?.preservedIntoRewrite === true,
  )
  const explicitProjectStateRewriteClosureApplied = typeof input.projectStateRewriteClosureApplied === 'boolean'
    ? input.projectStateRewriteClosureApplied
    : null
  const projectStateRewriteClosureApplied = Boolean(
    explicitProjectStateRewriteClosureApplied
    ?? (
      (
        input.closure?.rewriteAttempted
        && input.closure?.rewriteSucceeded
        && input.visibleReplyExecution.actualVisibleReplyAuthority === 'llm-second-pass-rewrite'
      )
      || parsedProjectStateAudit?.rewriteClosureApplied === true
    ),
  )
  return {
    version: 'visible-reply-realization-v1',
    expectedAuthority: input.visibleReplyExecution.expectedVisibleReplyAuthority ?? 'llm-mind',
    actualAuthority: input.visibleReplyExecution.actualVisibleReplyAuthority ?? null,
    providerMindExecuted: input.visibleReplyExecution.providerMindExecuted,
    mode: input.visibleReplyExecution.mode,
    visibleText: visibleText || null,
    nonHumanAuthoredStatus: localDeterministicFallback
      ? input.visibleReplyExecution.reason ?? 'visible-reply-local-fallback'
      : null,
    blockedReasons,
    emotionalClosureAudit: activeCue
      ? {
          activeCue,
          preservedIntoRewrite: Boolean(input.critic?.mustPreserve.includes(activeCue)),
          rewriteClosureApplied: Boolean(
            input.closure?.rewriteAttempted
            && input.closure?.rewriteSucceeded
            && input.visibleReplyExecution.actualVisibleReplyAuthority === 'llm-second-pass-rewrite',
          ),
          lowPressureRequired: cueRequiresLowPressure(activeCue),
          antiRestartRequired: cueAvoidsRestart(activeCue),
        }
      : null,
    selfAuthorityAudit: selfAuthoritySummary || selfAuthorityClosenessPosture
      ? {
          authoritySummary: selfAuthoritySummary,
          closenessPosture: selfAuthorityClosenessPosture,
          preservedIntoRewrite: Boolean(
            (selfAuthoritySummary && input.critic?.mustPreserve.includes(selfAuthoritySummary))
            || (selfAuthorityClosenessCue && input.critic?.mustPreserve.includes(selfAuthorityClosenessCue)),
          ),
          rewriteClosureApplied: Boolean(
            input.closure?.rewriteAttempted
            && input.closure?.rewriteSucceeded
            && input.visibleReplyExecution.actualVisibleReplyAuthority === 'llm-second-pass-rewrite',
          ),
        }
      : null,
    projectStateAudit: finalResolvedProjectStateSameHerSummary || resolvedProjectStateSameHerHoldDetail || resolvedProjectStateContinuityArcStage || resolvedProjectStateContinuityCue || projectStateSameHerDriftRiskSummary || projectStateProactiveSameHerGapSummary || projectStateCurrentPhaseSummary || projectStateLandedProgressSummary || projectStateOpenClosureSummary || projectStateNextClosureTargetSummary || projectStateEmotionalClosureSummary || projectStateClosureSummary || projectStateRelationshipTruthSummary || projectStateEmbodimentClosureSummary || resolvedProjectStatePreDialogueAwarenessSummary
      ? {
          sameHerSummary: finalResolvedProjectStateSameHerSummary,
          ...(resolvedProjectStateSameHerHoldDetail
            ? { sameHerHoldDetail: resolvedProjectStateSameHerHoldDetail }
            : {}),
          ...(resolvedProjectStateContinuityArcStage
            ? { continuityArcStage: resolvedProjectStateContinuityArcStage }
            : {}),
          ...(resolvedProjectStateContinuityCue
            ? { continuityCue: resolvedProjectStateContinuityCue }
            : {}),
          ...(projectStateSameHerDriftRiskSummary
            ? { sameHerDriftRiskSummary: projectStateSameHerDriftRiskSummary }
            : {}),
          ...(projectStateProactiveSameHerGapSummary
            ? { proactiveSameHerGapSummary: projectStateProactiveSameHerGapSummary }
            : {}),
          currentPhaseSummary: projectStateCurrentPhaseSummary,
          landedProgressSummary: projectStateLandedProgressSummary,
          openClosureSummary: projectStateOpenClosureSummary,
          ...(projectStateOpenFocusSummary
            ? { openFocusSummary: projectStateOpenFocusSummary }
            : {}),
          ...(projectStateNextFocusSummary
            ? { nextFocusSummary: projectStateNextFocusSummary }
            : {}),
          nextClosureTargetSummary: projectStateNextClosureTargetSummary,
          emotionalClosureSummary: projectStateEmotionalClosureSummary,
          ...(activeCue
            ? { emotionalClosureCue: activeCue }
            : {}),
          continuitySummary: projectStateContinuitySummary,
          ...(projectStateEmbodimentClosureSummary
            ? { embodimentClosureSummary: projectStateEmbodimentClosureSummary }
            : {}),
          preDialogueAwarenessSummary:
            preferredCadenceAwareProjectStateAwarenessSummary
            ?? resolvedProjectStatePreDialogueAwarenessSummary,
          preservedIntoRewrite: projectStatePreservedIntoRewrite,
          rewriteClosureApplied: projectStateRewriteClosureApplied,
        }
      : null,
    openingGuidanceHoldDetail: holdResolution.detail,
    companionshipHoldMode: holdResolution.mode,
    openingEmbodimentAudit: resolveOpeningEmbodimentAudit(holdResolution.mode, holdResolution.detail),
    reason: input.visibleReplyExecution.reason,
    critic: input.critic ?? null,
    closure: input.closure ?? null,
  }
}

export function resolveAlicizationPreparedVisibleReplyExecution(input: {
  prepared: AlicizationPreparedMainChatExecutionResult
  mode?: AlicizationVisibleReplyExecutionMode
  actualVisibleReplyAuthority?: AlicizationVisibleReplyExecution['actualVisibleReplyAuthority']
  providerMindExecuted?: boolean
  reason?: string | null
}): AlicizationVisibleReplyExecution {
  const plan = resolvePreparedReplyExecutionPlan(input.prepared)
  const expectedVisibleReplyAuthority = plan?.expectedVisibleReplyAuthority
    ?? resolvePreparedVisibleReplyAuthority(input.prepared)
  const mode = input.mode
    ?? plan?.preferredMode
    ?? (input.prepared.hasVisualGrounding ? 'provider-one-shot' : 'provider-stream')

  return createAlicizationVisibleReplyExecution({
    mode,
    expectedVisibleReplyAuthority,
    actualVisibleReplyAuthority: input.actualVisibleReplyAuthority,
    providerMindExecuted: input.providerMindExecuted,
    reason: input.reason ?? plan?.reason ?? null,
  })
}

export function deriveAlicizationVisibleReplyText(rawText: string) {
  const normalizedText = typeof rawText === 'string'
    ? rawText.trim()
    : ''
  if (!normalizedText)
    return ''

  const parsed = parseJsonObjectFromText(normalizedText)
  const structuredReply = typeof parsed?.reply === 'string'
    ? parsed.reply.trim()
    : ''
  if (structuredReply)
    return structuredReply

  const realizedVisibleText
    = parsed?.visibleReplyRealization && typeof parsed.visibleReplyRealization === 'object'
      && typeof (parsed.visibleReplyRealization as { visibleText?: unknown }).visibleText === 'string'
      ? ((parsed.visibleReplyRealization as { visibleText?: string }).visibleText?.trim() ?? '')
      : ''
  if (realizedVisibleText)
    return realizedVisibleText

  return looksLikeAlicizationStructuredPayloadText(normalizedText)
    ? ''
    : normalizedText
}

export function buildAlicizationResolvedVisibleReply(input: {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  emotionalClosureCue?: string | null
  selfAuthoritySummary?: string | null
  selfAuthorityClosenessPosture?: string | null
  projectStateSameHerSummary?: string | null
  projectStateSameHerHoldDetail?: string | null
  projectStateContinuityArcStage?: string | null
  projectStateContinuityCue?: string | null
  projectStateSameHerDriftRiskSummary?: string | null
  projectStateProactiveSameHerGapSummary?: string | null
  projectStateCurrentPhaseSummary?: string | null
  projectStateLandedProgressSummary?: string | null
  projectStateOpenClosureSummary?: string | null
  projectStateClosureSummary?: string | null
  projectStateNextClosureTargetSummary?: string | null
  projectStateEmotionalClosureSummary?: string | null
  projectStateRelationshipTruthSummary?: string | null
  projectStatePreDialogueAwarenessSummary?: string | null
  projectStateRewriteClosureApplied?: boolean | null
  prepared?: AlicizationPreparedMainChatExecutionResult | null
  critic?: AlicizationVisibleReplyCriticArtifact | null
  closure?: AlicizationVisibleReplyClosureArtifact | null
}): AlicizationResolvedVisibleReply {
  const realization = buildAlicizationVisibleReplyRealizationArtifact({
    fullText: input.fullText,
    visibleReplyExecution: input.visibleReplyExecution,
    emotionalClosureCue: input.emotionalClosureCue ?? null,
    selfAuthoritySummary: input.selfAuthoritySummary ?? null,
    selfAuthorityClosenessPosture: input.selfAuthorityClosenessPosture ?? null,
    projectStateSameHerSummary: input.projectStateSameHerSummary ?? null,
    projectStateSameHerHoldDetail: input.projectStateSameHerHoldDetail ?? null,
    projectStateContinuityArcStage: input.projectStateContinuityArcStage ?? null,
    projectStateContinuityCue: input.projectStateContinuityCue ?? null,
    projectStateSameHerDriftRiskSummary: input.projectStateSameHerDriftRiskSummary ?? null,
    projectStateProactiveSameHerGapSummary: input.projectStateProactiveSameHerGapSummary ?? null,
    projectStateCurrentPhaseSummary: input.projectStateCurrentPhaseSummary ?? null,
    projectStateLandedProgressSummary: input.projectStateLandedProgressSummary ?? null,
    projectStateOpenClosureSummary: input.projectStateOpenClosureSummary ?? null,
    projectStateClosureSummary: input.projectStateClosureSummary ?? null,
    projectStateNextClosureTargetSummary: input.projectStateNextClosureTargetSummary ?? null,
    projectStateEmotionalClosureSummary: input.projectStateEmotionalClosureSummary ?? null,
    projectStateRelationshipTruthSummary: input.projectStateRelationshipTruthSummary ?? null,
    projectStatePreDialogueAwarenessSummary: input.projectStatePreDialogueAwarenessSummary ?? null,
    projectStateRewriteClosureApplied: input.projectStateRewriteClosureApplied ?? null,
    prepared: input.prepared ?? null,
    critic: input.critic ?? null,
    closure: input.closure ?? null,
  })
  return {
    fullText: input.fullText,
    visibleText: realization.visibleText ?? '',
    visibleReplyExecution: input.visibleReplyExecution,
    realization,
  }
}

export function resolveAlicizationTimeoutRecoveredVisibleReply(input: {
  prepared: AlicizationPreparedMainChatExecutionResult
  recoveredText: string
  recoveryMode: string
}): AlicizationResolvedVisibleReply {
  const localFallback = input.recoveryMode === 'local-fallback'
  const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(input.prepared?.runtimeSurface)
  const rawRuntimeProjectState
    = preferredRuntimeSurface?.raw?.runtimeDigest?.projectState
      ?? preferredRuntimeSurface?.cognition?.runtimeDigest?.projectState
      ?? input.prepared?.runtimeDigest?.projectState
      ?? null
  const rawCurrentConsciousProjectState = preferredRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState ?? null
  const rawContractProjectState = input.prepared?.mindTurnContract?.projectState ?? null
  const canonicalProjectState = resolveAlicizationProjectStateBrief()
  const explicitRuntimeProjectState = resolvePreparedRuntimeProjectState(input.prepared)
  const runtimeProjectState = resolvePreparedRuntimeProjectStateSnapshot(input.prepared)
  const explicitPreparedRuntimeAwarenessLine = resolveExplicitPreparedRuntimeProjectAwarenessLine(input.prepared)
  const recoveredEmbodimentAuthority = resolvePreparedRuntimeEmbodimentClosureAuthority({
    prepared: input.prepared,
  })
  const recoveredEmbodimentClosureSummary = buildAlicizationEmbodimentLoopSummary({
    authoritySummary: recoveredEmbodimentAuthority.authoritySummary,
    currentBodyState: recoveredEmbodimentAuthority.currentBodyState,
  })
  || describeAlicizationEmbodimentClosureReminder({
    authoritySummary: recoveredEmbodimentAuthority.authoritySummary,
    currentBodyState: recoveredEmbodimentAuthority.currentBodyState,
  })
  || null
  const preferredRecoveredProjectAwarenessSummary
    = (explicitPreparedRuntimeAwarenessLine && !shouldTreatAsThinAwarenessShell(explicitPreparedRuntimeAwarenessLine)
      ? explicitPreparedRuntimeAwarenessLine
      : null)
    ?? resolvePreparedRuntimeProjectPreDialogueAwarenessSummary(input.prepared)
    ?? pickStrongerPreparedAwarenessLine(
      explicitPreparedRuntimeAwarenessLine,
      explicitRuntimeProjectState?.preDialogueAwarenessLine ?? null,
      explicitRuntimeProjectState?.awarenessLine ?? null,
      explicitRuntimeProjectState?.preDialogueAwarenessSummary ?? null,
      explicitRuntimeProjectState?.companionBriefingLine ?? null,
      explicitRuntimeProjectState?.companionHeadlineLine ?? null,
      explicitRuntimeProjectState?.preflightSummary ?? null,
    )
    ?? explicitRuntimeProjectState?.companionHeadlineLine
    ?? explicitRuntimeProjectState?.preDialogueAwarenessLine
    ?? explicitRuntimeProjectState?.awarenessLine
    ?? explicitRuntimeProjectState?.companionBriefingLine
    ?? null
  const rawExplicitRuntimeCompanionHeadlineLine = [
    rawCurrentConsciousProjectState?.companionHeadlineLine,
    rawRuntimeProjectState?.companionHeadlineLine,
    rawContractProjectState?.companionHeadlineLine,
  ].map(value => typeof value === 'string' ? value.trim() || null : null).find((value): value is string => Boolean(value))
  ?? null
  const rawExplicitRuntimeAwarenessWithoutPreflight = pickStrongerPreparedAwarenessLine(
    rawCurrentConsciousProjectState?.preDialogueAwarenessLine ?? null,
    rawCurrentConsciousProjectState?.awarenessLine ?? null,
    rawCurrentConsciousProjectState?.preDialogueAwarenessSummary ?? null,
    rawRuntimeProjectState?.preDialogueAwarenessLine ?? null,
    rawRuntimeProjectState?.awarenessLine ?? null,
    rawRuntimeProjectState?.preDialogueAwarenessSummary ?? null,
    rawContractProjectState?.preDialogueAwarenessLine ?? null,
    rawContractProjectState?.awarenessLine ?? null,
    rawContractProjectState?.preDialogueAwarenessSummary ?? null,
  )
  // Keep renderer/body rejoin truth host-visible during compact timeout recovery when the runtime
  // only preserved embodiment authority and never surfaced a same-her companion headline.
  const authorityOnlyEmbodimentHeadline = input.recoveryMode === 'active-dialogue-compact'
    && !rawExplicitRuntimeCompanionHeadlineLine
    && (
      !rawExplicitRuntimeAwarenessWithoutPreflight
      || shouldTreatAsThinAwarenessShell(rawExplicitRuntimeAwarenessWithoutPreflight)
    )
    ? synthesizeAuthorityOnlyEmbodimentCompanionHeadline({
        authoritySummary: recoveredEmbodimentAuthority.authoritySummary,
        currentBodyState: recoveredEmbodimentAuthority.currentBodyState,
      })
    : null
  const preferredRecoveredProjectAwarenessSummaryForRecovery = authorityOnlyEmbodimentHeadline
    ?? preferredRecoveredProjectAwarenessSummary
  const resolvedRecoveredProjectAwarenessSummary = resolveTimeoutRecoveredProjectAwarenessSummary({
    preferredAwarenessSummary: preferredRecoveredProjectAwarenessSummaryForRecovery,
    companionHeadlineLine: authorityOnlyEmbodimentHeadline
      ?? explicitRuntimeProjectState?.companionHeadlineLine
      ?? null,
    embodimentClosureSummary: recoveredEmbodimentClosureSummary,
    canonicalProjectAwarenessLine: canonicalProjectState.preDialogueAwarenessLine ?? null,
    explicitRuntimeAwarenessLine:
      explicitRuntimeProjectState?.preDialogueAwarenessLine
      ?? explicitRuntimeProjectState?.awarenessLine
      ?? null,
    explicitRuntimeAwarenessSummary:
      explicitRuntimeProjectState?.preDialogueAwarenessSummary
      ?? explicitRuntimeProjectState?.preflightSummary
      ?? null,
  })
  const preferTimeoutRecoveryProjectStateField = (
    current: string | null | undefined,
    explicit: string | null | undefined,
    canonical: string | null | undefined,
  ) => {
    const normalizedCurrent = typeof current === 'string' ? current.trim() || null : null
    const normalizedExplicit = typeof explicit === 'string' ? explicit.trim() || null : null
    const normalizedCanonical = typeof canonical === 'string' ? canonical.trim() || null : null

    if (
      normalizedCurrent
      && normalizedCanonical
      && normalizedCurrent === normalizedCanonical
      && normalizedExplicit
      && normalizedExplicit !== normalizedCanonical
    ) {
      return normalizedExplicit
    }

    return normalizedCurrent
      ?? normalizedExplicit
      ?? null
  }
  const timeoutRecoveredSameHerSummary = preferTimeoutRecoveryProjectStateField(
    runtimeProjectState?.sameHerSelfLine ?? null,
    explicitRuntimeProjectState?.sameHerSelfLine ?? null,
    canonicalProjectState.sameHerSelfLine ?? null,
  )
  const timeoutRecoveredCurrentPhase = preferTimeoutRecoveryProjectStateField(
    runtimeProjectState?.currentPhase ?? null,
    explicitRuntimeProjectState?.currentPhase ?? null,
    canonicalProjectState.currentPhase ?? null,
  )
  const timeoutRecoveredLandedProgress = preferTimeoutRecoveryProjectStateField(
    runtimeProjectState?.latestLandedProgress ?? null,
    explicitRuntimeProjectState?.latestLandedProgress ?? null,
    canonicalProjectState.latestProgress ?? null,
  )
  const timeoutRecoveredOpenClosure = preferTimeoutRecoveryProjectStateField(
    runtimeProjectState?.primaryOpenLoop ?? null,
    explicitRuntimeProjectState?.primaryOpenLoop ?? null,
    canonicalProjectState.primaryOpenLoop ?? null,
  )
  const timeoutRecoveredNextClosureTarget = preferTimeoutRecoveryProjectStateField(
    runtimeProjectState?.nextClosureTarget ?? null,
    explicitRuntimeProjectState?.nextClosureTarget ?? null,
    canonicalProjectState.nextClosureTarget ?? null,
  )
  const timeoutRecoveredSameHerDriftRisk = preferTimeoutRecoveryProjectStateField(
    runtimeProjectState?.sameHerDriftRisk ?? null,
    explicitRuntimeProjectState?.sameHerDriftRisk ?? null,
    canonicalProjectState.sameHerDriftRisk ?? null,
  )
  const hasMeaningfulTimeoutRecoveryProjectCarry = (
    looksLikeMeaningfulTimeoutRecoveryProjectCarry(timeoutRecoveredSameHerSummary)
    || looksLikeMeaningfulTimeoutRecoveryProjectCarry(timeoutRecoveredLandedProgress)
    || looksLikeMeaningfulTimeoutRecoveryProjectCarry(timeoutRecoveredOpenClosure)
  )
  const timeoutRecoveryShouldKeepAuthorityOnlyEmbodimentHeadline = Boolean(
    authorityOnlyEmbodimentHeadline
    && resolvedRecoveredProjectAwarenessSummary === authorityOnlyEmbodimentHeadline,
  )
  const shouldPreferCompactTimeoutRecoveryAwareness = Boolean(
    !timeoutRecoveryShouldKeepAuthorityOnlyEmbodimentHeadline
    && hasMeaningfulTimeoutRecoveryProjectCarry
    && (
      !resolvedRecoveredProjectAwarenessSummary
      || !/\bopen=/u.test(resolvedRecoveredProjectAwarenessSummary)
    ),
  )
  const shouldRebuildTimeoutRecoveryAwareness = Boolean(
    !shouldPreferCompactTimeoutRecoveryAwareness
    && resolvedRecoveredProjectAwarenessSummary
    && (
      resolvedRecoveredProjectAwarenessSummary === canonicalProjectState.preDialogueAwarenessLine
      || looksLikeCanonicalBeforeAnsweringProjectReanchor(resolvedRecoveredProjectAwarenessSummary)
    )
    && (
      timeoutRecoveredSameHerSummary
      || timeoutRecoveredLandedProgress
      || timeoutRecoveredOpenClosure
      || timeoutRecoveredNextClosureTarget
    )
    && (
      timeoutRecoveredSameHerSummary !== canonicalProjectState.sameHerSelfLine
      || timeoutRecoveredLandedProgress !== canonicalProjectState.latestProgress
      || timeoutRecoveredOpenClosure !== canonicalProjectState.primaryOpenLoop
      || timeoutRecoveredNextClosureTarget !== canonicalProjectState.nextClosureTarget
    )
    && hasMeaningfulTimeoutRecoveryProjectCarry,
  )
  const compactRecoveredProjectAwarenessSummary = shouldPreferCompactTimeoutRecoveryAwareness
    ? buildAlicizationProjectStatePreflightSummary({
        identity: explicitRuntimeProjectState?.identity ?? runtimeProjectState?.identity ?? canonicalProjectState.identity,
        currentPhase: timeoutRecoveredCurrentPhase ?? canonicalProjectState.currentPhase,
        primaryOpenLoop: timeoutRecoveredOpenClosure ?? canonicalProjectState.primaryOpenLoop,
        nextClosureTarget: timeoutRecoveredNextClosureTarget ?? canonicalProjectState.nextClosureTarget,
      })
    : null
  const rebuiltRecoveredProjectAwarenessSummary = shouldRebuildTimeoutRecoveryAwareness
    ? buildAlicizationProjectPreDialogueAwarenessLine({
        identity: explicitRuntimeProjectState?.identity ?? runtimeProjectState?.identity ?? canonicalProjectState.identity,
        currentPhase: timeoutRecoveredCurrentPhase ?? canonicalProjectState.currentPhase,
        latestLandedProgress: timeoutRecoveredLandedProgress ?? canonicalProjectState.latestProgress,
        primaryOpenLoop: timeoutRecoveredOpenClosure ?? canonicalProjectState.primaryOpenLoop,
        nextClosureTarget: timeoutRecoveredNextClosureTarget ?? canonicalProjectState.nextClosureTarget,
        sameHerSelfLine: timeoutRecoveredSameHerSummary ?? canonicalProjectState.sameHerSelfLine,
      })
    : null
  return buildAlicizationResolvedVisibleReply({
    fullText: input.recoveredText,
    visibleReplyExecution: resolveAlicizationPreparedVisibleReplyExecution({
      prepared: input.prepared,
      mode: localFallback ? 'local-fallback' : 'provider-one-shot',
      actualVisibleReplyAuthority: localFallback
        ? 'local-deterministic-fallback'
        : undefined,
      providerMindExecuted: !localFallback,
      reason: localFallback
        ? 'timeout-recovered-local-fallback'
        : `timeout-recovered-${input.recoveryMode}`,
    }),
    projectStateSameHerSummary: timeoutRecoveredSameHerSummary,
    projectStateSameHerHoldDetail: runtimeProjectState?.sameHerHoldDetail ?? null,
    projectStateCurrentPhaseSummary: timeoutRecoveredCurrentPhase,
    projectStateLandedProgressSummary: timeoutRecoveredLandedProgress,
    projectStateOpenClosureSummary: timeoutRecoveredOpenClosure,
    projectStateNextClosureTargetSummary: timeoutRecoveredNextClosureTarget,
    projectStateSameHerDriftRiskSummary: timeoutRecoveredSameHerDriftRisk,
    projectStatePreDialogueAwarenessSummary: compactRecoveredProjectAwarenessSummary
      ?? rebuiltRecoveredProjectAwarenessSummary
      ?? resolvedRecoveredProjectAwarenessSummary,
    prepared: input.prepared,
  })
}
