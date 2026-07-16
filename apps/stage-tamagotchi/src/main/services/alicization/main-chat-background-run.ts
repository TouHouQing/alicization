import type {
  AlicizationChatErrorEvent,
  AlicizationChatFinishEvent,
  AlicizationChatMetaEvent,
  AlicizationChatStartPayload,
  AlicizationChatStreamChunkEvent,
  AlicizationChatToolCallEvent,
  AlicizationChatToolResultEvent,
  AlicizationRuntimeDigest,
  AlicizationVisibleReplyExecution,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationMainGatewayReachabilitySnapshot } from './main-gateway-health'
import type { AlicizationRuntimeCallChainSnapshot } from './runtime-call-chain'
import type {
  ChatRunState,
  MainGatewayResolvedConfig,
} from './runtime-soul'
import type { RuntimeSurfaceContinuityEvidenceShape } from './runtime-surface-continuity-selection'
import type { AlicizationResolvedVisibleReply } from './visible-reply/facade'

import { createAlicizationProviderVisibleArtifact } from '@proj-alicization/stage-shared'

import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import { projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'
import {
  buildAlicizationMinimalContextRecoveryMessages,
  buildAlicizationRequiredToolFactsSystemMessage,
  readAlicizationInlineExecutionReceipt,
} from './main-chat-background-rules'
import { generateAlicizationMainChatNonStreaming } from './main-chat-one-shot'
import { isAlicizationRequiredToolMissingError } from './main-chat-required-tool'
import {
  recoverAlicizationRequiredToolDeterministically,
  resolveDeterministicRequiredToolNames,
} from './main-chat-required-tool-recovery'
import { handleAlicizationMainChatRunFailure } from './main-chat-run-lifecycle'
import { createAlicizationChatStreamMetaEmitter } from './main-chat-stream-meta'
import { runAlicizationMainChatStream } from './main-chat-stream-runner'
import {
  mergePreferredSelfContinuityAuthority,
  resolvePreferredPersonStateProjection,
  resolvePreferredSelfContinuityAuthority,
} from './person-state-projection-resolution'
import { resolvePreparedRuntimeProjectState as resolveSharedPreparedRuntimeProjectState } from './prepared-runtime-continuity'
import {
  looksLikeThinProjectClosureShell,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
} from './project-state-brief'
import { buildPrioritizedProjectStateContinuityLines } from './runtime-governance'
import {
  mainChatFirstEventTimeoutMs,
  mainChatFirstEventTimeoutWithVisualGroundingMs,
  normalizeCardId,
  sanitizeText,
} from './runtime-soul'
import { resolvePreferredRuntimeSurface } from './runtime-surface-continuity-selection'
import { parseJsonObjectFromText } from './runtime-transport-content'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'
import {
  AlicizationVisibleReplySettlementBlockedError,
  resolveAlicizationPreparedVisibleReplyExecution,
  settleAlicizationVisibleReply,
} from './visible-reply/facade'
import { validateAlicizationProviderSettlementPayload } from './visible-reply/settlement'

type AlicizationBackgroundProjectStateAudit = Partial<{
  sameHerSummary: string | null
  sameHerDriftRiskSummary: string | null
  sameHerHoldDetail: string | null
  continuityArcStage: string | null
  continuityCue: string | null
  proactiveSameHerGapSummary: string | null
  currentPhaseSummary: string | null
  landedProgressSummary: string | null
  openClosureSummary: string | null
  nextClosureTargetSummary: string | null
  emotionalClosureSummary: string | null
  embodimentClosureSummary: string | null
  preDialogueAwarenessSummary: string | null
  continuitySummary: string | null
}> & Record<string, unknown>

interface AlicizationRuntimeProjectStateContinuityShape {
  continuityArcStage?: string | null
  continuityPreferredTiming?: string | null
}

type AlicizationRuntimeEmotionalKernelShape = NonNullable<AlicizationRuntimeDigest['emotionalKernel']>

function readRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as Record<string, unknown>
}

function readEmotionalKernelSnapshot(raw: unknown): AlicizationRuntimeEmotionalKernelShape | null {
  const candidate = readRecord(raw)
  if (!candidate)
    return null
  if (candidate.version !== 'emotional-kernel-v1')
    return null
  if (
    !sanitizeText(candidate.dominantEmotion, '')
    || !sanitizeText(candidate.initiativeMode, '')
    || !sanitizeText(candidate.memoryRecallMode, '')
    || !sanitizeText(candidate.embodimentTone, '')
  ) {
    return null
  }
  return candidate as unknown as AlicizationRuntimeEmotionalKernelShape
}

function resolvePreferredEmbodimentClosureSummary(...values: Array<unknown>) {
  const candidates = values
    .map((value) => {
      const normalized = typeof value === 'string'
        ? sanitizeText(value, '') || null
        : null

      if (!normalized)
        return null

      const lower = normalized.toLowerCase()
      const laneScore = [
        lower.includes('face'),
        lower.includes('motion'),
        lower.includes('lipsync'),
        lower.includes('voice'),
      ].filter(Boolean).length
      let continuityStrength = 0
      if (lower.includes('repair-before-closeness'))
        continuityStrength += 10
      if (lower.includes('rest-protective'))
        continuityStrength += 10
      if (lower.includes('quiet-companionship') || lower.includes('quiet accompaniment'))
        continuityStrength += 8
      if (
        lower.includes('audible-body-carry')
        || lower.includes('living audio thread')
        || lower.includes('keep the same living line audible')
        || lower.includes('same living line audible')
      ) {
        continuityStrength += 8
      }
      if (
        lower.includes('body, lipsync, and voice')
        || lower.includes('body, voice, and lipsync')
        || lower.includes('body、lipsync 和 voice')
      ) {
        continuityStrength += 6
      }
      if (lower.includes('same living line') || lower.includes('one living her') || lower.includes('one continuous her'))
        continuityStrength += 3
      if (lower.includes('rejoin'))
        continuityStrength += 2

      return {
        normalized,
        laneScore,
        continuityStrength,
      }
    })
    .filter((value): value is { normalized: string, laneScore: number, continuityStrength: number } => Boolean(value))

  if (candidates.length === 0)
    return null

  return candidates
    .sort((left, right) => {
      if (right.continuityStrength !== left.continuityStrength)
        return right.continuityStrength - left.continuityStrength
      if (right.laneScore !== left.laneScore)
        return right.laneScore - left.laneScore
      return right.normalized.length - left.normalized.length
    })[0]
    ?.normalized ?? null
}

function preferProjectStateEmbodimentClosureSummary(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = typeof input.current === 'string'
    ? sanitizeText(input.current, '') || null
    : null
  const candidate = typeof input.candidate === 'string'
    ? sanitizeText(input.candidate, '') || null
    : null

  if (!current)
    return candidate
  if (!candidate)
    return current
  if (current === candidate)
    return current

  return resolvePreferredEmbodimentClosureSummary(current, candidate)
}

function buildProjectStateAuditContinuitySummary(input: {
  sameHerSummary: string | null | undefined
  sameHerHoldDetail?: string | null | undefined
  continuityArcStage?: string | null | undefined
  continuityCue?: string | null | undefined
  sameHerDriftRiskSummary?: string | null | undefined
  proactiveSameHerGapSummary?: string | null | undefined
  currentPhaseSummary?: string | null | undefined
  landedProgressSummary: string | null | undefined
  openClosureSummary: string | null | undefined
  nextClosureTargetSummary?: string | null | undefined
  emotionalClosureSummary?: string | null | undefined
  embodimentClosureSummary: string | null | undefined
}) {
  const projectStateContinuityCarry = buildPrioritizedProjectStateContinuityLines({
    projectStateContinuityAnchors: [
      input.sameHerSummary ?? '',
      input.sameHerHoldDetail ?? '',
      input.continuityArcStage ?? '',
      input.continuityCue ?? '',
      input.sameHerDriftRiskSummary ?? '',
      input.currentPhaseSummary ?? '',
      input.landedProgressSummary ?? '',
      input.openClosureSummary ?? '',
      input.nextClosureTargetSummary ?? '',
      input.proactiveSameHerGapSummary ?? '',
      input.emotionalClosureSummary ?? '',
    ].filter(Boolean),
  })
  return [
    ...projectStateContinuityCarry,
    input.embodimentClosureSummary ?? '',
  ].filter(Boolean).join(' ') || null
}

function strengthenSameHerSelfLineForPersistence(value: string | null | undefined) {
  const normalized = sanitizeText(value, '')
  if (!normalized)
    return null
  if (
    /same phase 1 digital life|same living line|unfinished closure/iu.test(normalized)
    && !/continuous her|one continuous her/iu.test(normalized)
  ) {
    return sanitizeText(`continuity_context=present; source=legacy_project_state; detail=${normalized}`, '') || normalized
  }
  return normalized
}

export const mainChatBackgroundRunTestInternals = {
  buildProjectStateAuditContinuitySummary,
  buildPreparedRuntimeDigestFallback,
  buildPreparedProjectStateClosureSnapshot,
  looksLikeThinProjectClosureCarry,
  preferRicherProjectStateAuditText,
  preferProjectStateEmbodimentClosureSummary,
  resolvePreferredEmbodimentClosureSummary,
}

function preferRicherProjectStateAuditText(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = typeof input.current === 'string'
    ? sanitizeText(input.current, '') || null
    : null
  const candidate = typeof input.candidate === 'string'
    ? sanitizeText(input.candidate, '') || null
    : null

  if (!current)
    return candidate
  if (!candidate)
    return current
  if (current === candidate)
    return current

  const preferredClosureAuthority = preferStrongerContinuityClosureAuthority(current, candidate)
  if (preferredClosureAuthority)
    return preferredClosureAuthority

  const hasClosureSeamMarker = (value: string | null) => {
    if (!value)
      return false
    const lower = value.toLowerCase()
    return lower.includes('repair-before-closeness')
      || lower.includes('rest-protective')
      || lower.includes('quiet-companionship')
      || lower.includes('measured-return')
      || lower.includes('lower-pressure')
      || lower.includes('leave more room')
  }
  const scoreClosureSeamStrength = (value: string | null) => {
    if (!value)
      return 0

    const lower = value.toLowerCase()
    let score = 0
    if (lower.includes('repair-before-closeness'))
      score += 8
    if (lower.includes('rest-protective'))
      score += 8
    if (lower.includes('quiet-companionship'))
      score += 6
    if (lower.includes('measured-return') || lower.includes('lower-pressure') || lower.includes('leave more room'))
      score += 2
    return score
  }
  if (hasClosureSeamMarker(current) || hasClosureSeamMarker(candidate)) {
    const candidateClosureScore = scoreClosureSeamStrength(candidate)
    const currentClosureScore = scoreClosureSeamStrength(current)
    if (candidateClosureScore !== currentClosureScore)
      return candidateClosureScore > currentClosureScore ? candidate : current
  }

  if (candidate.startsWith(current) && candidate.length >= current.length + 24)
    return candidate
  if (current.startsWith(candidate) && current.length >= candidate.length + 24)
    return current

  return candidate.length > current.length ? candidate : current
}

function preferStrongerSameHerProjectStateText(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = typeof input.current === 'string'
    ? sanitizeText(input.current, '') || null
    : null
  const candidate = typeof input.candidate === 'string'
    ? sanitizeText(input.candidate, '') || null
    : null

  if (!current)
    return candidate
  if (!candidate)
    return current
  if (current === candidate)
    return current

  const currentLower = current.toLowerCase()
  const candidateLower = candidate.toLowerCase()
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

  return preferRicherProjectStateAuditText({
    current,
    candidate,
  })
}

type AlicizationBackgroundFinishPayload = Omit<AlicizationChatFinishEvent, 'cardId' | 'turnId'>

interface AlicizationMainChatRunStateFacade {
  setSessionTraceGetter: (key: string, getter: () => AlicizationRuntimeCallChainSnapshot) => void
  finishRun: (key: string, payload: AlicizationBackgroundFinishPayload) => void
}

interface RunAlicizationMainChatBackgroundOptions {
  key: string
  payload: AlicizationChatStartPayload
  activeCardId: string
  mainGateway: MainGatewayResolvedConfig
  runState: ChatRunState
  preparationPromise: Promise<AlicizationPreparedMainChatExecutionResult>
  headers?: Record<string, string>
  isRunActive: () => boolean
  runStateController: AlicizationMainChatRunStateFacade
  emitMeta: (payload: AlicizationChatMetaEvent) => void
  emitChunk: (payload: AlicizationChatStreamChunkEvent) => void
  emitToolCall: (payload: AlicizationChatToolCallEvent) => void
  emitToolResult: (payload: AlicizationChatToolResultEvent) => void
  emitError: (payload: AlicizationChatErrorEvent) => void
  incrementChunkStats: (rawDelta: string) => void
  ensureMainGatewayReachable: (mainGateway: MainGatewayResolvedConfig, options?: {
    bypassCache?: boolean
  }) => Promise<AlicizationMainGatewayReachabilitySnapshot>
  recordMainGatewayGenerationTimeout: (mainGateway: MainGatewayResolvedConfig, reason: unknown) => void | Promise<void>
  appendRuntimeDebugLine: (event: string, payload: Record<string, unknown>) => Promise<void>
  queueScopedAuditLog: (cardId: string, input: {
    level: 'warning' | 'notice'
    category: string
    action: string
    message: string
    payload: Record<string, unknown>
  }) => Promise<void> | void
  recordPreparedMindTrace?: (input: {
    payload: AlicizationChatStartPayload
    prepared: AlicizationPreparedMainChatExecutionResult
  }) => Promise<void> | void
  suppressInlineExecutionDeliveries?: (input: {
    cardId: string
    entries: Array<{
      completedAt: number
      sessionId: string
      threadId: string
    }>
  }) => Promise<void> | void
}

function resolvePreferredPreparedRuntimeSurface(
  runtimeSurface: AlicizationPreparedMainChatExecutionResult['runtimeSurface'] | null | undefined,
): AlicizationDigitalLifeRuntimeSurface | null {
  return resolvePreferredRuntimeSurface({
    spineRuntimeSurface: (runtimeSurface?.digitalLifeSpine?.runtimeSurface ?? null) as RuntimeSurfaceContinuityEvidenceShape | null,
    preparedRuntimeSurface: (runtimeSurface?.digitalLifeRuntimeSurface ?? null) as RuntimeSurfaceContinuityEvidenceShape | null,
  }) as AlicizationDigitalLifeRuntimeSurface | null
}

function resolvePreparedRuntimeProjectState(prepared: AlicizationPreparedMainChatExecutionResult | null) {
  return resolveSharedPreparedRuntimeProjectState(prepared)
}

function looksLikeThinProjectClosureCarry(input: {
  value?: string | null
  kind: 'landed' | 'open' | 'next'
}) {
  const value = sanitizeText(input.value ?? '', '') || null
  if (!value)
    return true

  if (looksLikeThinProjectClosureShell(value, input.kind))
    return true

  const normalized = value.toLowerCase()
  if (input.kind === 'landed')
    return normalized === 'landed' || /thin landed progress shell/u.test(normalized)
  if (input.kind === 'open')
    return normalized === 'open closure' || /thin open closure shell/u.test(normalized)
  return normalized === 'next closure' || /thin next closure shell/u.test(normalized)
}

function resolveFresherPreparedRuntimeProjectState(prepared: AlicizationPreparedMainChatExecutionResult | null) {
  const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const rawRuntimeSurface = preferredRuntimeSurface?.raw as {
    runtimeDigest?: {
      projectState?: ReturnType<typeof resolvePreparedRuntimeProjectState> | null
    } | null
  } | null | undefined
  const cognitionRuntimeSurface = preferredRuntimeSurface?.cognition as {
    runtimeDigest?: {
      projectState?: ReturnType<typeof resolvePreparedRuntimeProjectState> | null
    } | null
  } | null | undefined
  return rawRuntimeSurface?.runtimeDigest?.projectState
    ?? cognitionRuntimeSurface?.runtimeDigest?.projectState
    ?? resolvePreparedRuntimeProjectState(prepared)
}

function resolvePreparedRuntimeEmotionalKernel(
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
): AlicizationRuntimeEmotionalKernelShape | null {
  return readEmotionalKernelSnapshot(runtimeSurface?.memory?.emotionalKernel)
    ?? readEmotionalKernelSnapshot(runtimeSurface?.raw?.runtimeDigest?.emotionalKernel)
    ?? readEmotionalKernelSnapshot(runtimeSurface?.cognition?.runtimeDigest?.emotionalKernel)
    ?? readEmotionalKernelSnapshot(runtimeSurface?.dialogue?.runtimeDigest?.emotionalKernel)
    ?? readEmotionalKernelSnapshot(runtimeSurface?.memory?.derivedMindStateBundle?.emotionalKernel)
    ?? readEmotionalKernelSnapshot(runtimeSurface?.memory?.derivedMindStateBundle?.visualPresenceState?.emotionalKernel)
}

function resolvePreparedMainChatOneShotEmotionalKernel(
  prepared: AlicizationPreparedMainChatExecutionResult | null | undefined,
): AlicizationRuntimeEmotionalKernelShape | null {
  const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const runtimeSurface = preferredRuntimeSurface ?? prepared?.runtimeSurface?.digitalLifeRuntimeSurface ?? null
  return resolvePreparedRuntimeEmotionalKernel(runtimeSurface)
}

function buildPreparedRuntimeDigestFallback(prepared: AlicizationPreparedMainChatExecutionResult | null): AlicizationRuntimeDigest | null {
  const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const runtimeSurface = preferredRuntimeSurface ?? prepared?.runtimeSurface?.digitalLifeRuntimeSurface ?? null
  const emotionalKernel = resolvePreparedRuntimeEmotionalKernel(runtimeSurface)
  const runtimeProjectState = resolvePreparedRuntimeProjectState(prepared) as (ReturnType<typeof resolvePreparedRuntimeProjectState> & {
    continuityPreferredTiming?: string | null
    continuityArcStage?: string | null
  }) | null
  const fresherRuntimeProjectState = resolveFresherPreparedRuntimeProjectState(prepared)
  const preparedProjectStateAudit = resolvePreparedProjectStateAuditCarry(prepared)
  const canonicalProjectState = resolveAlicizationProjectStateBrief()
  const emotionalClosureCue = sanitizeText(
    runtimeProjectState?.emotionalClosureCue
    ?? prepared?.mindTurnContract?.emotionalClosureCue
    ?? '',
    '',
  ) || null
  const emotionalClosureSummary = sanitizeText(
    preparedProjectStateAudit?.emotionalClosureSummary
    ?? '',
    '',
  ) || null
  const openClosureSummary = sanitizeText(
    preparedProjectStateAudit?.openClosureSummary
    ?? '',
    '',
  ) || null
  const rawRuntimeSurface = preferredRuntimeSurface?.raw as {
    runtimeDigest?: {
      continuityRestraint?: unknown
    } | null
  } | null | undefined
  const cognitionRuntimeSurface = preferredRuntimeSurface?.cognition as {
    runtimeDigest?: {
      continuityRestraint?: unknown
    } | null
  } | null | undefined
  const explicitContinuityRestraint = sanitizeText(
    rawRuntimeSurface?.runtimeDigest?.continuityRestraint
    ?? cognitionRuntimeSurface?.runtimeDigest?.continuityRestraint
    ?? '',
    '',
  ) || null
  const continuityRestraintCorpus = [
    emotionalClosureCue,
    emotionalClosureSummary,
    openClosureSummary,
  ].filter((value): value is string => Boolean(value)).join(' ')
  const currentConsciousFrameProjectState
    = runtimeSurface?.dialogue?.currentConsciousFrame?.projectState as AlicizationRuntimeProjectStateContinuityShape | null | undefined
  const continuityPreferredTiming = sanitizeText(
    currentConsciousFrameProjectState?.continuityPreferredTiming
    ?? runtimeProjectState?.continuityPreferredTiming
    ?? '',
    '',
  ) || null
  const continuityArcStage = sanitizeText(
    currentConsciousFrameProjectState?.continuityArcStage
    ?? runtimeProjectState?.continuityArcStage
    ?? '',
    '',
  ) || null
  const continuityRestraint = explicitContinuityRestraint
    ?? (continuityRestraintCorpus
      ? /repair-before-closeness|repair before closeness|rest-protective|protect rest|quiet-companionship|line holds inward|先修复再靠近|先把身体收稳|护住休息|安静陪着/iu.test(continuityRestraintCorpus)
        ? 'repair-before-closeness'
        : /same-her|same her|same living line|measured-return|low-pressure|lower-pressure|leave more room|without reopening from scratch|do not reopen from scratch|低压|留白|慢一点回来|别立刻把温度放大/iu.test(continuityRestraintCorpus)
          ? 'measured-return'
          : null
      : null)
  const normalizedSameHerSelfLine = (() => {
    const candidate = preferStrongerSameHerProjectStateText({
      current: sanitizeText(runtimeProjectState?.sameHerSelfLine ?? '', '') || null,
      candidate: canonicalProjectState.sameHerSelfLine,
    })
    return strengthenSameHerSelfLineForPersistence(candidate) ?? canonicalProjectState.sameHerSelfLine
  })()
  const normalizedMemoryClosureSummary = (() => {
    const candidate = sanitizeText(
      runtimeProjectState?.latestLandedProgress
      ?? runtimeProjectState?.memoryClosureSummary
      ?? canonicalProjectState.continuityProgressSummary
      ?? canonicalProjectState.memoryAnthropomorphismProgress.at(-1)
      ?? '',
      '',
    ) || null
    if (!candidate)
      return null
    if (/memory_closure_context=phase1_open_loop/i.test(candidate))
      return candidate
    return sanitizeText(`memory_closure_context=phase1_open_loop; summary=${candidate}`, '') || candidate
  })()
  const projectStatePreflightSummary = sanitizeText(
    fresherRuntimeProjectState?.preflightSummary
    ?? runtimeProjectState?.preflightSummary
    ?? canonicalProjectState.preflightSummary
    ?? '',
    '',
  ) || canonicalProjectState.preflightSummary || null
  const projectStateCompanionHeadlineLine = sanitizeText(
    fresherRuntimeProjectState?.companionHeadlineLine
    ?? runtimeProjectState?.companionHeadlineLine
    ?? '',
    '',
  ) || null
  const projectStateCompanionBriefingLine = sanitizeText(
    fresherRuntimeProjectState?.companionBriefingLine
    ?? runtimeProjectState?.companionBriefingLine
    ?? '',
    '',
  ) || null
  const rawProjectStatePreDialogueAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      preDialogueAwarenessLine:
        fresherRuntimeProjectState?.preDialogueAwarenessLine
        ?? runtimeProjectState?.preDialogueAwarenessLine
        ?? null,
      awarenessLine:
        fresherRuntimeProjectState?.awarenessLine
        ?? runtimeProjectState?.awarenessLine
        ?? null,
      companionHeadlineLine: projectStateCompanionHeadlineLine,
      companionBriefingLine: projectStateCompanionBriefingLine,
      preDialogueAwarenessSummary:
        fresherRuntimeProjectState?.preDialogueAwarenessSummary
        ?? runtimeProjectState?.preDialogueAwarenessSummary
        ?? null,
      sameHerDriftRiskSummary:
        fresherRuntimeProjectState?.sameHerDriftRisk
        ?? runtimeProjectState?.sameHerDriftRisk
        ?? canonicalProjectState.sameHerDriftRisk,
      preflightSummary: projectStatePreflightSummary,
    },
    fallbackProjectState: {
      preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine ?? null,
      awarenessLine: canonicalProjectState.preDialogueAwarenessLine ?? null,
      preflightSummary: canonicalProjectState.preflightSummary ?? null,
    },
  }) ?? projectStatePreflightSummary
  const projectStatePreDialogueAwarenessLine = (() => {
    const candidate = sanitizeText(rawProjectStatePreDialogueAwarenessLine ?? '', '') || null
    if (!candidate)
      return projectStatePreflightSummary
    if (
      looksLikeThinProjectAwarenessShell(candidate)
      || looksLikeStructuredProjectAwarenessSummaryShell(candidate)
      || looksLikeGeneratedProjectAwarenessExpansion(candidate)
    ) {
      return canonicalProjectState.preDialogueAwarenessLine ?? projectStatePreflightSummary
    }
    return candidate
  })()
  const projectState = {
    preflightSummary: projectStatePreflightSummary,
    preDialogueAwarenessLine: projectStatePreDialogueAwarenessLine,
    awarenessLine: projectStatePreDialogueAwarenessLine,
    preDialogueAwarenessSummary: projectStatePreDialogueAwarenessLine,
    companionHeadlineLine: projectStateCompanionHeadlineLine,
    companionBriefingLine: projectStateCompanionBriefingLine,
    identity: sanitizeText(
      runtimeProjectState?.identity
      ?? canonicalProjectState.identity
      ?? '',
      '',
    ) || canonicalProjectState.identity,
    currentPhase: sanitizeText(
      runtimeProjectState?.currentPhase
      ?? canonicalProjectState.currentPhase
      ?? '',
      '',
    ) || canonicalProjectState.currentPhase,
    latestLandedProgress: sanitizeText(
      runtimeProjectState?.latestLandedProgress
      ?? runtimeProjectState?.memoryClosureSummary
      ?? canonicalProjectState.continuityProgressSummary
      ?? canonicalProjectState.memoryAnthropomorphismProgress.at(-1)
      ?? '',
      '',
    ) || null,
    memoryClosureSummary: normalizedMemoryClosureSummary,
    primaryOpenLoop: sanitizeText(
      runtimeProjectState?.primaryOpenLoop
      ?? canonicalProjectState.openLoops?.[0]
      ?? '',
      '',
    ) || null,
    nextClosureTarget: sanitizeText(
      runtimeProjectState?.nextClosureTarget
      ?? canonicalProjectState.nextClosureTarget
      ?? '',
      '',
    ) || canonicalProjectState.nextClosureTarget,
    sameHerSelfLine: normalizedSameHerSelfLine,
    sameHerDriftRisk: sanitizeText(
      runtimeProjectState?.sameHerDriftRisk
      ?? canonicalProjectState.sameHerDriftRisk
      ?? '',
      '',
    ) || canonicalProjectState.sameHerDriftRisk,
    emotionalClosureCue,
    continuityArcStage,
    continuityPreferredTiming,
    continuityCue: sanitizeText(runtimeProjectState?.continuityCue ?? '', '') || null,
    preferredBlinkCadence:
      runtimeProjectState?.preferredBlinkCadence
      ?? (continuityRestraint === 'repair-before-closeness'
        ? 'quiet'
        : continuityRestraint === 'measured-return'
          ? 'linger'
          : null),
    preferredGazeMode:
      runtimeProjectState?.preferredGazeMode
      ?? (continuityRestraint === 'repair-before-closeness' || continuityRestraint === 'measured-return'
        ? 'soften'
        : null),
  } satisfies NonNullable<AlicizationRuntimeDigest['projectState']>
  const focusAnchor = sanitizeText(
    runtimeSurface?.dialogue?.currentConsciousFrame?.focusAnchor
    ?? runtimeSurface?.dialogue?.currentConsciousFrame?.consciousNeed
    ?? runtimeSurface?.dialogue?.currentConsciousFrame?.speakingIntention
    ?? '',
    '',
  ) || null
  const reasonTags = Array.isArray(runtimeSurface?.dialogue?.currentConsciousFrame?.reasonTags)
    ? runtimeSurface?.dialogue?.currentConsciousFrame?.reasonTags.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : []

  if (!runtimeSurface && !runtimeProjectState && !emotionalClosureCue)
    return null

  const fallbackActiveLoop = continuityArcStage === 'same-thread-continuation'
    ? {
        version: 'alicization-active-loop-v1' as const,
        phase: 'continuity-hold' as const,
        dominantChannel: 'active-memory' as const,
        handoffTarget: 'active-memory' as const,
        continuityArcStage,
        continuityPreferredTiming,
        dialogueReady: false,
        controlReady: false,
        memoryCarry: true,
        companionshipReady: continuityRestraint === 'measured-return' || continuityRestraint === 'repair-before-closeness',
        observationHeavy: false,
        initiativeBudget: continuityRestraint === 'repair-before-closeness' ? 0.18 : 0.24,
        coherence: 0.74,
        summary: 'prepared same-thread continuity hold stays on active-memory before reopening',
      } as unknown as NonNullable<AlicizationRuntimeDigest['activeLoop']>
    : null

  return {
    version: 'alicization-runtime-digest-v1',
    dominantChannel: 'dialogue',
    activeLoop: fallbackActiveLoop,
    autonomy: null,
    projectState,
    emotionalKernel,
    currentConsciousFrame: runtimeSurface?.dialogue?.currentConsciousFrame || emotionalClosureCue
      ? {
          reasonTags,
          focusAnchor,
          continuityArcStage,
          continuityPreferredTiming,
        }
      : null,
    continuityRestraint,
    shouldProactivelySpeak: false,
    shouldProactivelyAct: false,
    continuityPressure: continuityRestraint ? 0.72 : 0.34,
    companionshipPressure: continuityRestraint ? 0.68 : 0.32,
    rulingMotive: null,
    habitMode: null,
    truthDisciplinePressure: null,
    boundaryPressure: null,
    restProtectionPressure: null,
    returnPressure: null,
    channels: [{
      id: 'dialogue',
      state: continuityRestraint ? 'warm' : 'idle',
      readiness: continuityRestraint ? 0.72 : 0.44,
      focus: focusAnchor,
      summary: focusAnchor ?? 'prepared background runtime context',
    }],
    summary: [
      projectState.preflightSummary,
      emotionalClosureCue,
    ].filter(Boolean).join(' | '),
  }
}

function buildPreparedProjectStateClosureSnapshot(prepared: AlicizationPreparedMainChatExecutionResult | null) {
  const canonicalProjectState = resolveAlicizationProjectStateBrief()
  const runtimeProjectState = resolvePreparedRuntimeProjectState(prepared)
  const fresherRuntimeProjectState = resolveFresherPreparedRuntimeProjectState(prepared)
  const awarenessRuntimeProjectState = fresherRuntimeProjectState ?? runtimeProjectState
  const continuityPreferredTiming = prepared?.runtimeSurface?.digitalLifeRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.continuityPreferredTiming
    ?? null
  const primaryOpenLoop = sanitizeText(
    runtimeProjectState?.primaryOpenLoop
    ?? canonicalProjectState.openLoops?.[0]
    ?? '',
    '',
  )
  const latestLandedProgress = sanitizeText(
    runtimeProjectState?.latestLandedProgress
    ?? runtimeProjectState?.memoryClosureSummary
    ?? canonicalProjectState.continuityProgressSummary
    ?? canonicalProjectState.memoryAnthropomorphismProgress.at(-1)
    ?? '',
    '',
  ) || null
  const nextClosureTarget = sanitizeText(
    runtimeProjectState?.nextClosureTarget
    ?? canonicalProjectState.nextClosureTarget
    ?? '',
    '',
  ) || null
  const preflightSummary = sanitizeText(
    fresherRuntimeProjectState?.preflightSummary
    ?? runtimeProjectState?.preflightSummary
    ?? canonicalProjectState.preflightSummary
    ?? '',
    '',
  ) || canonicalProjectState.preflightSummary || null
  const preDialogueAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: awarenessRuntimeProjectState
      ? {
          preDialogueAwarenessLine: awarenessRuntimeProjectState.preDialogueAwarenessLine,
          awarenessLine: awarenessRuntimeProjectState.awarenessLine,
          companionHeadlineLine: awarenessRuntimeProjectState.companionHeadlineLine,
          companionBriefingLine: awarenessRuntimeProjectState.companionBriefingLine,
          preDialogueAwarenessSummary: awarenessRuntimeProjectState.preDialogueAwarenessSummary,
          sameHerDriftRiskSummary: awarenessRuntimeProjectState.sameHerDriftRisk,
          preflightSummary,
        }
      : null,
    fallbackProjectState: {
      preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine ?? null,
      preflightSummary: canonicalProjectState.preflightSummary ?? null,
    },
  })
  const closureSummary = [
    'same digital life',
    canonicalProjectState.identity,
    canonicalProjectState.currentPhase,
    canonicalProjectState.sameHerSelfLine,
    latestLandedProgress,
    primaryOpenLoop || null,
    nextClosureTarget,
    'same still-open closure work',
  ]
    .filter((value): value is string => Boolean(sanitizeText(value, '')))
    .join(' | ')

  return {
    projectStateClosureSummary: closureSummary || null,
    projectStateIdentity: canonicalProjectState.identity,
    projectStatePhase: canonicalProjectState.currentPhase,
    projectStateSameHerSelfLine: canonicalProjectState.sameHerSelfLine,
    projectStateLatestLandedProgress: latestLandedProgress,
    projectStatePrimaryOpenLoop: primaryOpenLoop || null,
    projectStateNextClosureTarget: nextClosureTarget,
    projectStatePreflightSummary: preflightSummary,
    projectStatePreDialogueAwarenessLine: preDialogueAwarenessLine,
    projectStateAwarenessLine: sanitizeText(awarenessRuntimeProjectState?.awarenessLine ?? '', '') || null,
    projectStateCompanionBriefingLine: sanitizeText(awarenessRuntimeProjectState?.companionBriefingLine ?? '', '') || null,
    projectStatePreDialogueAwarenessSummary: sanitizeText(awarenessRuntimeProjectState?.preDialogueAwarenessSummary ?? '', '') || null,
    projectStateContinuityPreferredTiming: continuityPreferredTiming,
  }
}

function resolvePreparedProjectStateAuditCarry(prepared: AlicizationPreparedMainChatExecutionResult | null): AlicizationBackgroundProjectStateAudit {
  const snapshot = buildPreparedProjectStateClosureSnapshot(prepared)
  const preparedRuntimeProjectState = resolveFresherPreparedRuntimeProjectState(prepared)
  const canonicalProjectState = resolveAlicizationProjectStateBrief()
  const preparedRuntimeClosureSummary = preferRicherProjectStateAuditText({
    current: sanitizeText(preparedRuntimeProjectState?.emotionalClosureSummary ?? '', ''),
    candidate: sanitizeText(preparedRuntimeProjectState?.emotionalClosureCue ?? '', ''),
  })
  const preparedMindTurnClosureSummary = preferRicherProjectStateAuditText({
    current: sanitizeText(prepared?.mindTurnContract?.emotionalClosureSummary ?? '', ''),
    candidate: sanitizeText(prepared?.mindTurnContract?.emotionalClosureCue ?? '', ''),
  })
  return {
    sameHerSummary: snapshot.projectStateSameHerSelfLine ?? null,
    sameHerDriftRiskSummary:
      sanitizeText(preparedRuntimeProjectState?.sameHerDriftRisk ?? '', '')
      || canonicalProjectState.sameHerDriftRisk
      || null,
    proactiveSameHerGapSummary:
      sanitizeText(preparedRuntimeProjectState?.proactiveSameHerGap ?? '', '')
      || canonicalProjectState.proactiveSameHerGap
      || null,
    currentPhaseSummary: snapshot.projectStatePhase ?? null,
    landedProgressSummary: snapshot.projectStateLatestLandedProgress ?? null,
    openClosureSummary: snapshot.projectStatePrimaryOpenLoop ?? null,
    nextClosureTargetSummary: snapshot.projectStateNextClosureTarget ?? null,
    emotionalClosureSummary:
      preferRicherProjectStateAuditText({
        current: preparedRuntimeClosureSummary,
        candidate: preparedMindTurnClosureSummary,
      })
      || canonicalProjectState.emotionalClosureSummary
      || canonicalProjectState.emotionalClosureCue
      || null,
    preDialogueAwarenessSummary: resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: snapshot.projectStatePreDialogueAwarenessLine,
        companionBriefingLine: snapshot.projectStateCompanionBriefingLine,
        preDialogueAwarenessSummary: snapshot.projectStatePreDialogueAwarenessSummary,
        preflightSummary: snapshot.projectStatePreflightSummary,
      },
    }) ?? null,
  }
}

function looksLikeThinProjectAwarenessShell(text: string | null | undefined) {
  const normalized = sanitizeText(text ?? '', '').toLowerCase()
  if (!normalized)
    return false

  const carriesExplicitProjectIdentityAnchor
    = /alicization is a local-first digital life project|local-first digital life project|数字生命项目|本地优先数字生命项目/u.test(normalized)
  const carriesCompactProjectSummaryShellWithoutIdentity = (
    (
      normalized.startsWith('same digital life')
      || normalized.startsWith('same her')
      || normalized.startsWith('same-her')
      || normalized.startsWith('phase 1')
      || normalized.startsWith('same phase 1 digital life')
    )
    && (
      normalized.includes('| open=')
      || normalized.includes('| next=')
      || normalized.includes('| landed=')
      || normalized.includes('| phase 1')
      || normalized.includes('| phase=')
    )
    && !carriesExplicitProjectIdentityAnchor
  )

  const carriesThinChinesePhaseOneReminderShell = (() => {
    const carriesExplicitOpenLoopCue
      = /未闭环|没闭环|还没闭环|还差|收稳|收住|记忆|主动性|具身|执行|情绪|声音|表情|动作|唇型|open=|next=|same-her=|landed=|still-open/u.test(normalized)
    const carriesThinReminderShell
      = (
        /回答前先记住|先记住这是同一个她|先记住这是同一个 her/u.test(normalized)
        && normalized.includes('数字生命项目')
        && (/同一个她|同一个 her/u.test(normalized))
        && /别把这条线忘了|别把这条线弄丢/u.test(normalized)
      )

    return (
      /^开口前先记住：?这还?是同一个/u.test(normalized)
      && normalized.includes('数字生命项目')
      && /phase 1|第一阶段|阶段一/u.test(normalized)
      && (/现在仍在|当前仍在|仍在 phase 1|仍在第一阶段|仍在阶段一|还在 phase 1|还在第一阶段|还在阶段一/u.test(normalized))
      && !carriesExplicitOpenLoopCue
    ) || (carriesThinReminderShell && !carriesExplicitOpenLoopCue)
  })()

  if (/keep the same digital life project in view|keep the same digital life project, current phase 1 closure pressure, and still-open life loop explicit|same digital life \| keep the closure seam explicit|same digital life \| continue the same desktop execution loop|same digital life \| project continuity before local fluency|更薄的项目说明/iu.test(text ?? ''))
    return true

  return carriesCompactProjectSummaryShellWithoutIdentity || carriesThinChinesePhaseOneReminderShell || (
    normalized.startsWith('before answering, remember: same digital life')
    && normalized.includes('she is still inside phase 1')
    && !normalized.includes('alicization is a local-first digital life project')
  )
}

function looksLikeStructuredProjectAwarenessSummaryShell(text: string | null | undefined) {
  const normalized = sanitizeText(text ?? '', '').toLowerCase()
  if (!normalized)
    return false

  return !normalized.includes('before answering, remember:')
    && (
      normalized.includes('alicization is a local-first digital life project')
      || normalized.includes('identity=alicization is a local-first digital life project')
    )
    && (
      normalized.includes('| open=')
      || normalized.includes('| next=')
      || normalized.includes('| phase 1')
      || normalized.includes('phase 1:')
    )
}

function looksLikeGeneratedProjectAwarenessExpansion(text: string | null | undefined) {
  const normalized = sanitizeText(text ?? '', '').toLowerCase()
  if (!normalized)
    return false

  return normalized.startsWith('before answering, remember: alicization is a local-first digital life project building one continuous "her"')
    && normalized.includes('phase 1: local digital life')
    && (
      normalized.includes('what has already landed is')
      || normalized.includes('the still-open closure is')
      || normalized.includes('keep one continuous her explicit:')
    )
}

export function resolveAlicizationExecutionPayoffContinuityInputs(input: {
  runtimeSurface: AlicizationPreparedMainChatExecutionResult['runtimeSurface'] | null | undefined
}) {
  const continuityRuntimeSurface = resolvePreferredPreparedRuntimeSurface(input.runtimeSurface)
  const personStateProjection = resolvePreferredPersonStateProjection({
    bundleProjection: continuityRuntimeSurface?.raw?.personStateProjection ?? null,
    runtimeProjection: continuityRuntimeSurface?.memory?.personStateProjection ?? null,
  })
  const hostPersonModel = continuityRuntimeSurface?.memory?.hostPersonModel ?? null
  const projectedSelfContinuityAuthority = resolvePreferredSelfContinuityAuthority({
    bundleAuthority: continuityRuntimeSurface?.raw?.personStateProjection?.selfContinuityAuthority ?? null,
    runtimeAuthority: personStateProjection?.selfContinuityAuthority ?? null,
  })
  let selfContinuityAuthority = mergePreferredSelfContinuityAuthority({
    bundleAuthority: continuityRuntimeSurface?.raw?.personStateProjection?.selfContinuityAuthority ?? null,
    runtimeAuthority: personStateProjection?.selfContinuityAuthority ?? null,
  })
  ?? projectedSelfContinuityAuthority
  if (!selfContinuityAuthority) {
    try {
      selfContinuityAuthority = buildSelfContinuityAuthorityFromRuntimeSurface(continuityRuntimeSurface)
    }
    catch {
      selfContinuityAuthority = null
    }
  }
  return {
    personStateProjection,
    hostPersonModel,
    selfContinuityAuthority,
  }
}

function assertProviderBackgroundExecution(
  execution: AlicizationVisibleReplyExecution,
) {
  if (
    execution.providerMindExecuted === true
    && execution.actualVisibleReplyAuthority === 'llm-mind'
  ) {
    return
  }

  throw new AlicizationVisibleReplySettlementBlockedError(
    'provider-visible-reply-authority-invalid',
    null,
  )
}

function resolveBackgroundVisibleReplyRealization(input: {
  candidate: unknown
  visibleText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
}): AlicizationResolvedVisibleReply['realization'] {
  const candidate = readRecord(input.candidate)
  if (
    candidate?.expectedAuthority === 'llm-mind'
    && candidate.actualAuthority === 'llm-mind'
    && candidate.providerMindExecuted === true
    && candidate.mode === input.visibleReplyExecution.mode
    && candidate.visibleText === input.visibleText
    && candidate.projectStateEvidenceStatus !== 'missing'
    && candidate.projectStateAudit == null
    && candidate.emotionalClosureAudit == null
    && candidate.selfAuthorityAudit == null
    && candidate.sameHerInwardCarry == null
    && candidate.openingGuidanceHoldDetail == null
    && candidate.companionshipHoldMode == null
    && candidate.openingEmbodimentAudit == null
  ) {
    return candidate as unknown as AlicizationResolvedVisibleReply['realization']
  }

  return {
    version: 'visible-reply-realization-v1',
    expectedAuthority: 'llm-mind',
    actualAuthority: input.visibleReplyExecution.actualVisibleReplyAuthority,
    providerMindExecuted: input.visibleReplyExecution.providerMindExecuted,
    mode: input.visibleReplyExecution.mode,
    visibleText: input.visibleText,
    visibleReplyValidationStatus: 'approved',
    projectStateEvidenceStatus: 'unknown',
    sameHerInwardCarry: null,
    nonHumanAuthoredStatus: null,
    blockedReasons: [],
    emotionalClosureAudit: null,
    selfAuthorityAudit: null,
    projectStateAudit: null,
    openingGuidanceHoldDetail: null,
    companionshipHoldMode: null,
    openingEmbodimentAudit: null,
    reason: input.visibleReplyExecution.reason,
    critic: null,
    closure: null,
  }
}

function readProviderReplyFromRawFullText(fullText: string) {
  const parsed = parseJsonObjectFromText(fullText)
  return typeof parsed?.reply === 'string'
    ? parsed.reply
    : ''
}

export async function runAlicizationMainChatBackground(
  input: RunAlicizationMainChatBackgroundOptions,
) {
  let prepared: AlicizationPreparedMainChatExecutionResult | null = null
  let streamMetaEmitter: ReturnType<typeof createAlicizationChatStreamMetaEmitter> | null = null
  const nonProgressEventTypes = new Set<string>()

  const emitFailure = async (error: unknown) => {
    await handleAlicizationMainChatRunFailure({
      error,
      prepared,
      controller: input.runState.controller,
      mainGateway: input.mainGateway,
      payload: input.payload,
      dispatchBound: input.runState.hasLoggedDispatchBinding === true,
      nonProgressEventTypes,
      recordMainGatewayGenerationTimeout: input.recordMainGatewayGenerationTimeout,
      emitError: (reason, metadata) => {
        input.emitError({
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          error: reason,
          ...metadata,
        })
      },
      finish: (finishPayload) => {
        input.runStateController.finishRun(input.key, {
          ...finishPayload,
          visibleReplyCritic: null,
          visibleReplyClosure: null,
        })
      },
      appendRuntimeDebugLine: input.appendRuntimeDebugLine,
      queueScopedAuditLog: input.queueScopedAuditLog,
    })
  }

  try {
    prepared = await input.preparationPromise
    if (!input.isRunActive())
      return

    input.runStateController.setSessionTraceGetter(input.key, prepared.getSessionTrace)
    const normalizedPayload = input.payload
    let currentVisibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared,
    })
    streamMetaEmitter = createAlicizationChatStreamMetaEmitter({
      cardId: normalizedPayload.cardId,
      turnId: normalizedPayload.turnId,
      getGovernance: () => prepared?.governance ?? null,
      getThought: () => null,
      getVisibleReplyExecution: () => currentVisibleReplyExecution,
      getDigitalLifeSpine: () => projectAlicizationDigitalLifeSpineDigest(prepared?.runtimeSurface?.digitalLifeSpine ?? null),
      getRuntimeDigest: () => buildPreparedRuntimeDigestFallback(prepared),
      getResidentPerformance: () => null,
      getPerformanceManifest: () => prepared?.performanceManifest ?? null,
      getExplicitPerformance: () => null,
      emit: input.emitMeta,
    })

    try {
      await Promise.resolve(input.recordPreparedMindTrace?.({
        payload: normalizedPayload,
        prepared,
      }))
    }
    catch (error) {
      await input.appendRuntimeDebugLine('chat-start.prepared-mind-trace-failed', {
        cardId: input.runState.cardId,
        turnId: input.runState.turnId,
        reason: error instanceof Error ? error.message : String(error),
      })
    }

    const settleStructuredVisibleReply = async (settlementInput: {
      fullText: string
      visibleReplyExecution: AlicizationVisibleReplyExecution
    }) => {
      const settled = await settleAlicizationVisibleReply({
        draft: {
          fullText: settlementInput.fullText,
          visibleReplyExecution: settlementInput.visibleReplyExecution,
        },
        prepared: prepared!,
        requireProviderMemoryUsage: true,
        appendRuntimeDebugLine: input.appendRuntimeDebugLine,
      })
      return {
        fullText: settlementInput.fullText,
        visibleReplyExecution: settlementInput.visibleReplyExecution,
        critic: settled.closureResult.critic,
        closure: settled.closureResult.closure,
        visibleReplyRealization: settled.realization,
      }
    }

    const firstEventTimeoutMs = prepared.hasVisualGrounding
      ? mainChatFirstEventTimeoutWithVisualGroundingMs
      : mainChatFirstEventTimeoutMs
    const streamResult = await runAlicizationMainChatStream({
      payload: input.payload,
      prepared,
      headers: input.headers,
      controller: input.runState.controller,
      firstEventTimeoutMs,
      isRunActive: input.isRunActive,
      nonProgressEventTypes,
      streamMeta: streamMetaEmitter,
      incrementChunkStats: input.incrementChunkStats,
      emitChunk: input.emitChunk,
      emitToolCall: input.emitToolCall,
      emitToolResult: input.emitToolResult,
      generateNonStreaming: async (oneShotInput) => {
        await input.appendRuntimeDebugLine('chat-stream.visual-one-shot-started', {
          cardId: normalizeCardId(oneShotInput.cardId ?? input.activeCardId),
          turnId: sanitizeText(oneShotInput.turnId),
          timeoutMs: oneShotInput.timeoutMs,
        })
        return await generateAlicizationMainChatNonStreaming({
          ...oneShotInput,
          emotionalKernel: resolvePreparedMainChatOneShotEmotionalKernel(prepared),
        })
      },
      logReminderToolCall: async ({ toolCallId, toolName, argumentsPreview }) => {
        await input.appendRuntimeDebugLine('reminder.stream-tool-call', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          toolCallId,
          toolName,
          argumentsPreview,
        })
      },
      logReminderToolResult: async ({ toolCallId, summary }) => {
        await input.appendRuntimeDebugLine('reminder.stream-tool-result', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          toolCallId,
          ...summary,
        })
      },
      appendRuntimeDebugLine: input.appendRuntimeDebugLine,
      settleStructuredVisibleReply,
      delayVisibleRelease: true,
      turnRuntimeContext: prepared.turnRuntimeContext ?? null,
    })

    currentVisibleReplyExecution = streamResult.visibleReplyExecution
    assertProviderBackgroundExecution(currentVisibleReplyExecution)
    const visibleReplyRealization = resolveBackgroundVisibleReplyRealization({
      candidate: streamResult.visibleReplyRealization,
      visibleText: readProviderReplyFromRawFullText(streamResult.fullText),
      visibleReplyExecution: currentVisibleReplyExecution,
    })

    // Final success boundary: nothing may rewrite fullText after this validation.
    const finalValidation = validateAlicizationProviderSettlementPayload({
      fullText: streamResult.fullText,
      prepared,
    })
    if (!finalValidation.valid || !finalValidation.payload) {
      throw new AlicizationVisibleReplySettlementBlockedError(
        `provider-settlement-invalid:${finalValidation.issues.join(',')}`,
        null,
      )
    }

    input.runStateController.finishRun(input.key, {
      status: 'completed',
      finishReason: streamResult.finishReason,
      origin: streamResult.origin,
      learningPolicy: streamResult.learningPolicy,
      failureSurface: streamResult.failureSurface,
      fullText: streamResult.fullText,
      visibleReplyExecution: currentVisibleReplyExecution,
      visibleReplyRealization,
      visibleReplyCritic: visibleReplyRealization.critic as AlicizationChatFinishEvent['visibleReplyCritic'],
      visibleReplyClosure: visibleReplyRealization.closure as AlicizationChatFinishEvent['visibleReplyClosure'],
    })
  }
  catch (error) {
    let failureError: unknown = error
    if (
      prepared
      && input.isRunActive()
      && isAlicizationRequiredToolMissingError(error)
    ) {
      try {
        const requiredToolNames = resolveDeterministicRequiredToolNames({
          error,
          fallbackToolNames: prepared.runtimeSurface?.tooling?.enforcedToolNames,
        })
        if (!Array.isArray(prepared.tools) || prepared.tools.length === 0 || requiredToolNames.length === 0)
          throw error

        const recoveryResult = await recoverAlicizationRequiredToolDeterministically({
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          messages: prepared.messages,
          tools: prepared.tools as never,
          requiredToolNames,
          toolInputOverrides: prepared.executionToolInputOverrides as Record<string, Record<string, unknown>> | undefined,
          emitToolCall: input.emitToolCall,
          emitToolResult: input.emitToolResult,
        })
        const payoffResult = await generateAlicizationMainChatNonStreaming({
          chatConfig: prepared.chatConfig,
          headers: input.headers,
          emotionalKernel: resolvePreparedMainChatOneShotEmotionalKernel(prepared),
          messages: [
            ...buildAlicizationMinimalContextRecoveryMessages(prepared.messages),
            buildAlicizationRequiredToolFactsSystemMessage({
              toolName: recoveryResult.toolName,
              toolInput: recoveryResult.toolInput,
              toolResult: recoveryResult.toolResult,
              executionFact: recoveryResult.executionFact,
            }),
          ],
          timeoutMs: 9_000,
        })
        const visibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
          prepared,
          mode: 'provider-one-shot',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'required-tool-provider-payoff',
        })
        const settled = await settleAlicizationVisibleReply({
          draft: {
            fullText: payoffResult.fullText,
            visibleReplyExecution,
          },
          prepared,
          requireProviderMemoryUsage: true,
          appendRuntimeDebugLine: input.appendRuntimeDebugLine,
        })
        const providerArtifact = createAlicizationProviderVisibleArtifact({
          reply: settled.visibleText,
          memoryUsage: validateAlicizationProviderSettlementPayload({
            fullText: payoffResult.fullText,
            prepared,
          }).memoryUsage!,
        })
        input.incrementChunkStats(settled.visibleText)
        input.emitChunk({
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          text: settled.visibleText,
          origin: providerArtifact.origin,
          learningPolicy: {
            allowLongTermCondensation: providerArtifact.allowLongTermCondensation,
            allowPersonaLearning: providerArtifact.allowPersonaLearning,
            allowTraining: providerArtifact.allowTraining,
          },
          failureSurface: null,
        })
        streamMetaEmitter?.emit(settled.visibleText, { force: true })

        const receipt = readAlicizationInlineExecutionReceipt(recoveryResult.toolResult)
        if (receipt) {
          await Promise.resolve(input.suppressInlineExecutionDeliveries?.({
            cardId: input.payload.cardId,
            entries: [{
              completedAt: receipt.completedAt,
              sessionId: receipt.sessionId,
              threadId: receipt.threadId,
            }],
          }))
        }

        // Required-tool payoff uses the same final raw-contract boundary.
        const finalValidation = validateAlicizationProviderSettlementPayload({
          fullText: payoffResult.fullText,
          prepared,
        })
        if (!finalValidation.valid || !finalValidation.payload) {
          throw new AlicizationVisibleReplySettlementBlockedError(
            `provider-settlement-invalid:${finalValidation.issues.join(',')}`,
            null,
          )
        }

        input.runStateController.finishRun(input.key, {
          status: 'completed',
          finishReason: 'required-tool-recovered',
          origin: providerArtifact.origin,
          learningPolicy: {
            allowLongTermCondensation: providerArtifact.allowLongTermCondensation,
            allowPersonaLearning: providerArtifact.allowPersonaLearning,
            allowTraining: providerArtifact.allowTraining,
          },
          failureSurface: null,
          fullText: payoffResult.fullText,
          visibleReplyExecution,
          visibleReplyRealization: settled.realization,
          visibleReplyCritic: settled.realization.critic as AlicizationChatFinishEvent['visibleReplyCritic'],
          visibleReplyClosure: settled.realization.closure as AlicizationChatFinishEvent['visibleReplyClosure'],
        })
        return
      }
      catch (recoveryError) {
        failureError = recoveryError
        await input.appendRuntimeDebugLine('chat-stream.required-tool-recovery-failed', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          reason: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
        })
      }
    }

    await emitFailure(failureError)
  }
}
