import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationChatErrorEvent,
  AlicizationChatFinishEvent,
  AlicizationChatMetaEvent,
  AlicizationChatStartPayload,
  AlicizationChatStreamChunkEvent,
  AlicizationChatToolCallEvent,
  AlicizationChatToolResultEvent,
  AlicizationDialoguePerformancePayload,
  AlicizationMindTurnGovernance,
  AlicizationResidentPerformanceSnapshot,
  AlicizationRuntimeDigest,
  AlicizationVisibleReplyExecution,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationActiveDialogueFastPathDecision } from './main-chat-active-dialogue-loop'
import type { AlicizationInlineExecutionReceipt } from './main-chat-background-rules'
import type { AlicizationMainChatTimeoutRecoveryMode } from './main-chat-run-lifecycle'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationMainGatewayReachabilitySnapshot } from './main-gateway-health'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationRuntimeCallChainSnapshot } from './runtime-call-chain'
import type {
  ChatRunState,
  MainGatewayResolvedConfig,
  PreparedMainChatExecution,
} from './runtime-soul'
import type { RuntimeSurfaceContinuityEvidenceShape } from './runtime-surface-continuity-selection'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'
import type {
  AlicizationResolvedVisibleReply,

  buildAlicizationVisibleReplyRealizationArtifact,
} from './visible-reply/facade'

import {
  alicizationMainGatewayOneShotRecoveryBudget,
  describeAlicizationEmbodimentClosureHeadline,
  deriveAlicizationResidentPerformanceSnapshot,
  normalizeAlicizationDigitalLifeSpineDigest,
  normalizeAlicizationPerformancePayload,
} from '@proj-alicization/stage-shared'
import { normalizeStructuredProjectStatePayload } from '@proj-alicization/stage-ui/composables/alicization-structured-output'

import { deriveAlicizationRuntimeSnapshot, projectAlicizationRuntimeDigest } from './alicization-runtime-architecture'
import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import { deriveAlicizationDigitalLifeSpineFromSurface, projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'
import {
  buildAlicizationExecutionPayoffDeterministicStructured,
  buildAlicizationExecutionPayoffPrompt,
  normalizeAlicizationExecutionPayoffEmotion,
  normalizeAlicizationExecutionPayoffPerformance,
  selectAlicizationExecutionDeliveryReply,
} from './execution-delivery-surface'
import {

  AlicizationActiveDialogueMindAuthorityEscalationError,
  buildAlicizationActiveDialogueFastPathMessages,
  deriveAlicizationActiveDialogueFastPathDecision,
  normalizeAlicizationActiveDialogueFastPathReplyOrEscalate,
} from './main-chat-active-dialogue-loop'
import {
  alicizationExecutorToolNames,

  asAlicizationInlineExecutionSurfaceInput,
  buildAlicizationMinimalContextRecoveryMessages,
  readAlicizationInlineExecutionReceipt,
  shouldUseAlicizationExecutionFirstFastPath,
} from './main-chat-background-rules'
import {
  generateAlicizationMainChatNonStreaming,
  recoverAlicizationMainChatFromTimeout,
} from './main-chat-one-shot'
import { carriesAlicizationCanonicalProjectState } from './main-chat-project-state-guard'
import { isAlicizationRequiredToolMissingError } from './main-chat-required-tool'
import {
  recoverAlicizationRequiredToolDeterministically,
  resolveDeterministicRequiredToolNames,
} from './main-chat-required-tool-recovery'
import { handleAlicizationMainChatRunFailure } from './main-chat-run-lifecycle'
import { extractAllowedToolNamesFromToolChoice } from './main-chat-runtime-surface'
import {
  resolveAlicizationChatStartPayloadPreDialogueSendIdentity,
  summarizeAlicizationPreDialogueSendIdentityForDebug,
} from './main-chat-start-awareness'
import {
  buildAlicizationChatMetaPayload,
  createAlicizationChatStreamMetaEmitter,
  repairContinuitySourceTagsFromRuntimeDigest,
} from './main-chat-stream-meta'
import { runAlicizationMainChatStream } from './main-chat-stream-runner'
import { buildAlicizationMainGatewayTimeoutFallbackReply } from './main-chat-timeout-fallback'
import {
  mergePreferredSelfContinuityAuthority,
  resolvePreferredPersonStateProjection,
  resolvePreferredSelfContinuityAuthority,
} from './person-state-projection-resolution'
import {
  resolvePreparedRuntimeProjectStateSnapshot,
  resolvePreparedRuntimeSelfContinuityAuthority,
  resolvePreparedRuntimeProjectState as resolveSharedPreparedRuntimeProjectState,
} from './prepared-runtime-continuity'
import { enrichProjectStateAnswerGovernanceIfNeeded } from './project-state-answer-governance'
import {
  buildAlicizationProjectStateExtraSystemBlocks,
  looksLikeThinProjectClosureShell,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
} from './project-state-brief'
import { buildAlicizationChatStreamEmbodimentMeta, buildPrioritizedProjectStateRewritePreserveLines, normalizeDialogueRespondedPayload } from './runtime-governance'
import {
  mainChatFirstEventTimeoutMs,
  mainChatFirstEventTimeoutWithVisualGroundingMs,
  mainChatTimeoutRecoveryMs,
  mainChatTimeoutRecoveryWithVisualGroundingMs,
  normalizeCardId,
  sanitizeText,
} from './runtime-soul'
import { resolvePreferredRuntimeSurface } from './runtime-surface-continuity-selection'
import { parseJsonObjectFromText, readTransportContentAsText } from './runtime-transport-content'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'
import { resolveCanonicalStructuredProjectState } from './structured-project-state'
import { buildAlicizationTurnGraphFromSettlements } from './turn-os/turn-graph'
import {
  AlicizationVisibleReplyClosureBlockedError,
  buildAlicizationResolvedVisibleReply,
  buildAlicizationSecondPassTransportFailureReply,
  buildAlicizationVisibleReplyCriticArtifact,
  decideAlicizationActiveDialogueCompactAuthority,
  deriveAlicizationVisibleReplyText,
  resolveAlicizationPreparedVisibleReplyExecution,
  resolveAlicizationTimeoutRecoveredVisibleReply,
  rewriteAlicizationVisibleReplySecondPass,
  settleAlicizationVisibleReply,
} from './visible-reply/facade'

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
  preservedIntoRewrite: boolean
  rewriteClosureApplied: boolean
}> & Record<string, unknown>

type AlicizationProjectStateGovernanceShape = {
  answerSubject?: string | null
  mustDo?: string[] | null
  mustNotDo?: string[] | null
} & Record<string, unknown>

interface AlicizationRuntimeProjectStateContinuityShape {
  continuityArcStage?: string | null
  continuityPreferredTiming?: string | null
}

type AlicizationEmbodimentMetaCurrentConsciousFrameInput
  = Parameters<typeof buildAlicizationChatStreamEmbodimentMeta>[0]['currentConsciousFrame']

type AlicizationPersonStateProjectionShape = Partial<AlicizationPersonStateProjection>
type AlicizationSelfContinuityAuthorityShape = Partial<AlicizationSelfContinuityAuthority>
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

function normalizeProjectStateAuditCarry(
  raw: Record<string, unknown> | null,
): AlicizationBackgroundProjectStateAudit | null {
  if (!raw)
    return null

  return {
    ...raw,
    sameHerSummary: sanitizeText(raw.sameHerSummary, '') || null,
    sameHerDriftRiskSummary: sanitizeText(raw.sameHerDriftRiskSummary, '') || null,
    sameHerHoldDetail: sanitizeText(raw.sameHerHoldDetail, '') || null,
    continuityArcStage: sanitizeText(raw.continuityArcStage, '') || null,
    continuityCue: sanitizeText(raw.continuityCue, '') || null,
    proactiveSameHerGapSummary: sanitizeText(raw.proactiveSameHerGapSummary, '') || null,
    currentPhaseSummary: sanitizeText(raw.currentPhaseSummary, '') || null,
    landedProgressSummary: sanitizeText(raw.landedProgressSummary, '') || null,
    openClosureSummary: sanitizeText(raw.openClosureSummary, '') || null,
    nextClosureTargetSummary: sanitizeText(raw.nextClosureTargetSummary, '') || null,
    emotionalClosureSummary: sanitizeText(raw.emotionalClosureSummary, '') || null,
    embodimentClosureSummary: sanitizeText(raw.embodimentClosureSummary, '') || null,
    preDialogueAwarenessSummary: sanitizeText(raw.preDialogueAwarenessSummary, '') || null,
    continuitySummary: sanitizeText(raw.continuitySummary, '') || null,
    preservedIntoRewrite: raw.preservedIntoRewrite === true,
    rewriteClosureApplied: raw.rewriteClosureApplied === true,
  }
}

function resolveEmbodimentMetaCurrentConsciousFrameInput(
  currentConsciousFrame: AlicizationRuntimeDigest['currentConsciousFrame'] | null | undefined,
): AlicizationEmbodimentMetaCurrentConsciousFrameInput {
  const raw = readRecord(currentConsciousFrame)
  if (!raw)
    return undefined

  const reasonTags = Array.isArray(raw.reasonTags)
    ? raw.reasonTags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    : []
  const projectState = readRecord(raw.projectState)

  if (reasonTags.length === 0 && !projectState)
    return undefined

  return {
    reasonTags,
    projectState: projectState as NonNullable<AlicizationEmbodimentMetaCurrentConsciousFrameInput>['projectState'],
  }
}

function resolveStructuredPerformancePayload(
  raw: unknown,
  fallbackEmotion: AlicizationDialoguePerformancePayload['baseEmotion'] = 'thinking',
) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return normalizeAlicizationPerformancePayload(raw, fallbackEmotion)
}

function preferContinuityRichProjectionText(input: {
  persisted?: unknown
  derived?: unknown
  requireProjectContinuity?: boolean
}) {
  const normalizeProjectionText = (raw: unknown) => {
    if (typeof raw === 'string')
      return sanitizeText(raw, '') || null
    if (raw && typeof raw === 'object') {
      const candidate = raw as {
        summary?: unknown
        text?: unknown
      }
      if (typeof candidate.summary === 'string')
        return sanitizeText(candidate.summary, '') || null
      if (typeof candidate.text === 'string')
        return sanitizeText(candidate.text, '') || null
    }
    return null
  }

  const persisted = normalizeProjectionText(input.persisted)
  const derived = normalizeProjectionText(input.derived)

  if (!persisted)
    return derived || null
  if (!derived)
    return persisted || null

  const persistedCarriesProjectContinuity = persisted.includes('project_continuity=')
  const derivedCarriesProjectContinuity = derived.includes('project_continuity=')
  const persistedCarriesCallbackStyleContinuity = /callback|same-thread|same thread|same line|同一条线|沿着刚才那条线|刚才那条提醒/u.test(persisted.toLowerCase())
  const derivedCarriesCallbackStyleContinuity = /callback|same-thread|same thread|same line|同一条线|沿着刚才那条线|刚才那条提醒/u.test(derived.toLowerCase())

  if (
    input.requireProjectContinuity
    && persistedCarriesProjectContinuity
    && !derivedCarriesProjectContinuity
  ) {
    return persisted
  }

  if (persistedCarriesCallbackStyleContinuity && !derivedCarriesCallbackStyleContinuity)
    return persisted

  return derived || persisted || null
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

  const scoreEmbodimentLane = (value: string | null | undefined) => {
    const normalized = sanitizeText(value ?? '', '').toLowerCase()
    if (!normalized)
      return 0

    let score = 0
    if (normalized.includes('face'))
      score += 1
    if (normalized.includes('motion'))
      score += 1
    if (normalized.includes('lipsync'))
      score += 1
    if (normalized.includes('voice'))
      score += 1
    if (normalized.includes('body'))
      score += 1
    if (/full cross-modal|same living segment|visible same-her line has already rejoined without body carry/u.test(normalized))
      score += 4
    if (/living audio thread|still-voiced|resident body line|rejoin/u.test(normalized))
      score += 2
    return score
  }

  for (let index = 0; index < candidateCount; index += 1) {
    const authoritySummary = input.authoritySummaryCandidates[index]?.trim() || null
    const currentBodyState = input.currentBodyStateCandidates[index]?.trim() || null
    if (!authoritySummary && !currentBodyState)
      continue

    const score = Math.max(
      scoreEmbodimentLane(authoritySummary),
      scoreEmbodimentLane(currentBodyState),
    )
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

function resolvePreparedRuntimeEmbodimentClosureAuthority(
  prepared?: AlicizationPreparedMainChatExecutionResult | null,
) {
  const runtimePerceptionCurrentBodyState
    = typeof prepared?.runtimeSurface?.digitalLifeRuntimeSurface?.perception?.currentBodyState === 'string'
      ? prepared.runtimeSurface.digitalLifeRuntimeSurface.perception.currentBodyState.trim() || null
      : null
  const preferredRuntimeSelfContinuityAuthority
    = resolvePreparedRuntimeSelfContinuityAuthority(prepared) as {
      authoritySummary?: string | null
      currentBodyState?: string | null
    } | null | undefined
  const rawRuntimeDigestSelfContinuityAuthority = readPreparedRuntimeDigestSelfContinuityAuthority(prepared, 'raw')
  const cognitionRuntimeDigestSelfContinuityAuthority = readPreparedRuntimeDigestSelfContinuityAuthority(prepared, 'cognition')
  const runtimeProjectionSelfContinuityAuthority
    = prepared?.runtimeSurface?.digitalLifeRuntimeSurface?.memory?.personStateProjection?.selfContinuityAuthority as {
      authoritySummary?: string | null
      currentBodyState?: string | null
    } | null | undefined
  const spineProjectionSelfContinuityAuthority
    = prepared?.runtimeSurface?.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority as {
      authoritySummary?: string | null
      currentBodyState?: string | null
    } | null | undefined

  return resolvePreferredEmbodimentClosureAuthority({
    authoritySummaryCandidates: [
      null,
      preferredRuntimeSelfContinuityAuthority?.authoritySummary ?? null,
      rawRuntimeDigestSelfContinuityAuthority?.authoritySummary ?? null,
      cognitionRuntimeDigestSelfContinuityAuthority?.authoritySummary ?? null,
      runtimeProjectionSelfContinuityAuthority?.authoritySummary ?? null,
      spineProjectionSelfContinuityAuthority?.authoritySummary ?? null,
    ],
    currentBodyStateCandidates: [
      runtimePerceptionCurrentBodyState,
      readEmbodimentAwareCurrentBodyState(preferredRuntimeSelfContinuityAuthority),
      readEmbodimentAwareCurrentBodyState(rawRuntimeDigestSelfContinuityAuthority),
      readEmbodimentAwareCurrentBodyState(cognitionRuntimeDigestSelfContinuityAuthority),
      readEmbodimentAwareCurrentBodyState(runtimeProjectionSelfContinuityAuthority),
      readEmbodimentAwareCurrentBodyState(spineProjectionSelfContinuityAuthority),
    ],
  })
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
  const projectStateContinuityCarry = buildPrioritizedProjectStateRewritePreserveLines({
    projectStateContinuityAnchors: [
      input.sameHerSummary ? `same-her=${input.sameHerSummary}` : '',
      input.sameHerHoldDetail ? `hold=${input.sameHerHoldDetail}` : '',
      input.continuityArcStage ? `arc=${input.continuityArcStage}` : '',
      input.continuityCue ? `cue=${input.continuityCue}` : '',
      input.sameHerDriftRiskSummary ? `drift=${input.sameHerDriftRiskSummary}` : '',
      input.currentPhaseSummary ? `phase=${input.currentPhaseSummary}` : '',
      input.landedProgressSummary ? `landed=${input.landedProgressSummary}` : '',
      input.openClosureSummary ? `open=${input.openClosureSummary}` : '',
      input.nextClosureTargetSummary ? `next=${input.nextClosureTargetSummary}` : '',
      input.proactiveSameHerGapSummary ? `proactive-gap=${input.proactiveSameHerGapSummary}` : '',
      input.emotionalClosureSummary ? `closure=${input.emotionalClosureSummary}` : '',
    ].filter(Boolean),
  })
  return [
    ...projectStateContinuityCarry,
    input.embodimentClosureSummary ? `body=${input.embodimentClosureSummary}` : '',
  ].filter(Boolean).join(' | ') || null
}

function looksLikeSameHerSelfLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false
  return /same digital life|same-her|same her|one continuous her|同一个 her|同一个她|same living line/u.test(normalized)
}

function ensureTimeoutRecoveryCarriesCanonicalProjectState(messages: Message[]) {
  if (carriesAlicizationCanonicalProjectState(messages))
    return messages

  return [
    ...buildAlicizationProjectStateExtraSystemBlocks().map(content => ({ role: 'system', content }) as Message),
    ...messages,
  ]
}

function strengthenSameHerSelfLineForPersistence(value: string | null | undefined) {
  const normalized = sanitizeText(value, '')
  if (!normalized)
    return null
  if (
    /same phase 1 digital life|same living line|unfinished closure/iu.test(normalized)
    && !/continuous her|one continuous her/iu.test(normalized)
  ) {
    return sanitizeText(`Keep one continuous her explicit: ${normalized}`, '') || normalized
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

function shouldUpgradeDeferredDecisionToProjectState(decision: AlicizationActiveDialogueFastPathDecision | null | undefined) {
  if (!decision)
    return false

  return decision.reasonCodes.includes('project-state-progress-open-loop-follow-up')
    || decision.reasonCodes.includes('project-state-same-her-continuity-required')
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

function normalizeSameHerHoldDetail(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() || null : null
}

function hasRememberedSeamMoreRoomCarry(text: string | null | undefined) {
  const normalized = normalizeSameHerHoldDetail(text)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  const rememberedSeamPresent
    = /remembered seam|same remembered relationship seam|same remembered seam|relationship seam|same line|same thread|callback line|同一条线|关系线|记住的关系缝|留白/u.test(normalized)
  if (!rememberedSeamPresent)
    return false

  return /reopened too eagerly|too eagerly before|more room this time|this time keep more room|keep more room this time|leave more room|do not reopen it with the same eagerness|same eagerness as before|before leaning in again|这次更要留白|这次要更慢一点|不要重开得太快|上次太急/u.test(normalized)
}

function looksLikeGenericMeasuredReturnHoldDetail(text: string | null | undefined) {
  const normalized = normalizeSameHerHoldDetail(text)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  if (hasRememberedSeamMoreRoomCarry(normalized))
    return false

  return normalized.includes('same-her hold: measured-return')
    || normalized.includes('callback line lower-pressure before it widens again')
}

function looksLikeCanonicalProjectStateSameHerHoldDetail(value: string | null | undefined) {
  const normalized = normalizeSameHerHoldDetail(value)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized.startsWith('same-her hold:')
    && normalized.includes('project-state answer')
    && normalized.includes('same living line before widening outward')
}

function looksLikeExplicitSameHerHoldDetail(value: string | null | undefined) {
  const normalized = normalizeSameHerHoldDetail(value)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized.startsWith('same-her hold:')
}

function looksLikeGenericContinuityCueShell(value: string | null | undefined) {
  const normalized = normalizeSameHerHoldDetail(value)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  if (looksLikeExplicitSameHerHoldDetail(normalized))
    return false

  return (
    normalized.includes('same phase 1 digital life')
    || normalized.includes('same living line')
    || normalized.includes('callback line')
    || normalized.includes('repair-before-closeness')
    || normalized.includes('repair settle')
    || normalized.includes('measured-return')
    || normalized.includes('lower-pressure')
  )
}

function looksLikeCorrectedSamePersonAuthorityHoldDetail(value: string | null | undefined) {
  const normalized = normalizeSameHerHoldDetail(value)?.toLowerCase() ?? ''
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

function looksLikeResumeConfirmationBoundaryHoldDetail(value: string | null | undefined) {
  const normalized = normalizeSameHerHoldDetail(value)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  const hasBoundaryAnchor
    = /execution-resume-confirmation|host-confirmed-before-redispatch|resume-before-dispatch|host-confirmed resume|host-confirmed/u.test(normalized)
  const hasBoundaryHold
    = /bounded confirmation boundary|another execution-shaped opening/u.test(normalized)

  return hasBoundaryAnchor && hasBoundaryHold
}

function resolveRememberedSeamMoreRoomHoldDetail() {
  return 'same-her hold: recognize the same remembered seam, but keep more room this time so the return does not reopen with the same eagerness as before.'
}

function resolveRememberedSeamMoreRoomOpeningGuidance() {
  return 'Recognize the same remembered seam, but keep more room this time because it reopened too eagerly before.'
}

function resolveTurnRememberedSeamMoreRoomOpeningGuidance(input: {
  reply?: string | null
  thought?: string | null
  digitalLifeSpine?: ReturnType<typeof normalizeAlicizationDigitalLifeSpineDigest> | null
  runtimeDigest?: AlicizationRuntimeDigest | null
}) {
  const runtimeProjectState = input.runtimeDigest?.projectState && typeof input.runtimeDigest.projectState === 'object'
    ? input.runtimeDigest.projectState as Record<string, unknown>
    : null
  const corpus = [
    sanitizeText(input.reply, '') || null,
    sanitizeText(input.thought, '') || null,
    sanitizeText(input.digitalLifeSpine?.memory?.personStateProjection?.openingGuidance, '') || null,
    sanitizeText(input.digitalLifeSpine?.proactive?.personaBias?.manifestationCadenceSummary, '') || null,
    sanitizeText((input.digitalLifeSpine?.runtime?.projectState as { sameHerHoldDetail?: unknown } | null | undefined)?.sameHerHoldDetail, '') || null,
    sanitizeText((input.digitalLifeSpine?.runtime?.projectState as { nextClosureTarget?: unknown } | null | undefined)?.nextClosureTarget, '') || null,
    sanitizeText((input.digitalLifeSpine?.runtime?.projectState as { continuityCue?: unknown } | null | undefined)?.continuityCue, '') || null,
    sanitizeText(runtimeProjectState?.sameHerHoldDetail, '') || null,
    sanitizeText(runtimeProjectState?.sameHerSelfLine, '') || null,
    sanitizeText(runtimeProjectState?.nextClosureTarget, '') || null,
    sanitizeText(runtimeProjectState?.continuityCue, '') || null,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' | ')
    .toLowerCase()

  if (!corpus)
    return null
  if (hasRememberedSeamMoreRoomCarry(corpus))
    return resolveRememberedSeamMoreRoomOpeningGuidance()

  const carriesRememberedSeamReturn
    = /rejoin-remembered-seam|same remembered relationship seam|same remembered seam|remembered seam|同一条线|轻轻牵回/u.test(corpus)
  const carriesMeasuredSlowerReturn
    = /measured-return|lower-pressure|leave room|more room|gentle|slower|slowly|慢一点|更轻一点|轻一点|留白/u.test(corpus)

  return carriesRememberedSeamReturn && carriesMeasuredSlowerReturn
    ? resolveRememberedSeamMoreRoomOpeningGuidance()
    : null
}

function applyRememberedSeamMoreRoomDigitalLifePatch(input: {
  digitalLifeSpine?: ReturnType<typeof normalizeAlicizationDigitalLifeSpineDigest> | null
  openingGuidance?: string | null
}) {
  const digitalLifeSpine = normalizeAlicizationDigitalLifeSpineDigest(input.digitalLifeSpine ?? null)
  const openingGuidance = sanitizeText(input.openingGuidance, '') || null
  if (!digitalLifeSpine || !openingGuidance)
    return digitalLifeSpine

  const rememberedSeamHoldDetail = resolveRememberedSeamMoreRoomHoldDetail()
  const currentProjectState = digitalLifeSpine.runtime?.projectState && typeof digitalLifeSpine.runtime.projectState === 'object'
    ? digitalLifeSpine.runtime.projectState as Record<string, unknown>
    : null
  const preferredSameHerHoldDetail = resolvePreferredSameHerHoldDetail({
    current: sanitizeText(currentProjectState?.sameHerHoldDetail, '') || null,
    candidate: rememberedSeamHoldDetail,
    continuityCue: sanitizeText(currentProjectState?.continuityCue, '') || openingGuidance,
  })
  const currentCadenceSummary = sanitizeText(digitalLifeSpine.memory?.personStateProjection?.manifestationCadenceSummary, '') || null
  const rememberedSeamCadenceSummary = hasRememberedSeamMoreRoomCarry(currentCadenceSummary)
    ? currentCadenceSummary
    : openingGuidance.toLowerCase()

  return normalizeAlicizationDigitalLifeSpineDigest({
    ...digitalLifeSpine,
    proactive: {
      ...digitalLifeSpine.proactive,
      continuityRestraint: digitalLifeSpine.proactive?.continuityRestraint ?? 'measured-return',
      personaBias: {
        ...digitalLifeSpine.proactive?.personaBias,
        manifestationCadenceSummary:
          sanitizeText(digitalLifeSpine.proactive?.personaBias?.manifestationCadenceSummary, '')
          || rememberedSeamCadenceSummary,
      },
    },
    memory: {
      ...digitalLifeSpine.memory,
      personStateProjection: {
        ...digitalLifeSpine.memory?.personStateProjection,
        openingGuidance,
        manifestationCadenceSummary: rememberedSeamCadenceSummary,
      },
    },
    runtime: {
      ...digitalLifeSpine.runtime,
      projectState: {
        ...currentProjectState,
        sameHerHoldDetail: preferredSameHerHoldDetail ?? rememberedSeamHoldDetail,
      },
    },
  })
}

function resolvePreferredSameHerHoldDetail(input: {
  current?: string | null
  candidate?: string | null
  continuityCue?: string | null
}) {
  const current = normalizeSameHerHoldDetail(input.current)
  const candidate = normalizeSameHerHoldDetail(input.candidate)
  const continuityCue = normalizeSameHerHoldDetail(input.continuityCue)

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

  if (looksLikeExplicitSameHerHoldDetail(current) && looksLikeGenericContinuityCueShell(candidate))
    return current

  if (looksLikeExplicitSameHerHoldDetail(candidate) && looksLikeGenericContinuityCueShell(current))
    return candidate

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

const sameLineMeasuredReturnPattern = /先别换线|刚才那条提醒|沿着刚才那条提醒继续|不重新起势|沿着这条线|同一条线|不要突然把关系放宽/u

type AlicizationBackgroundFinishPayload = Omit<AlicizationChatFinishEvent, 'cardId' | 'turnId'> & {
  visibleReplyRealization?: AlicizationResolvedVisibleReply['realization'] | Record<string, unknown> | null
}

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
    preDialogueAwarenessDebug?: ReturnType<typeof summarizeAlicizationPreDialogueSendIdentityForDebug>
  }) => Promise<void> | void
  suppressInlineExecutionDeliveries?: (input: {
    cardId: string
    entries: Array<{
      completedAt: number
      sessionId: string
      threadId: string
    }>
  }) => Promise<void> | void
  resolveActiveDialogueDeterministicReply?: (input: {
    conversationMessages: Message[]
    decision: AlicizationActiveDialogueFastPathDecision
    prepared: AlicizationPreparedMainChatExecutionResult
  }) => Promise<string | null> | string | null
}

class AlicizationMindAuthoredReplyRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AlicizationMindAuthoredReplyRequiredError'
  }
}

function resolvePreferredPreparedRuntimeSurface(
  runtimeSurface: AlicizationPreparedMainChatExecutionResult['runtimeSurface'] | null | undefined,
): AlicizationDigitalLifeRuntimeSurface | null {
  return resolvePreferredRuntimeSurface({
    spineRuntimeSurface: (runtimeSurface?.digitalLifeSpine?.runtimeSurface ?? null) as RuntimeSurfaceContinuityEvidenceShape | null,
    preparedRuntimeSurface: (runtimeSurface?.digitalLifeRuntimeSurface ?? null) as RuntimeSurfaceContinuityEvidenceShape | null,
  }) as AlicizationDigitalLifeRuntimeSurface | null
}

function hasUsablePreparedBackgroundRuntimeSurface(
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
) {
  return Boolean(
    runtimeSurface?.perception
    && runtimeSurface?.world
    && runtimeSurface?.cognition
    && runtimeSurface?.memory
    && runtimeSurface?.dialogue
    && runtimeSurface?.agency,
  )
}

function resolvePreparedRuntimeProjectState(prepared: AlicizationPreparedMainChatExecutionResult | null) {
  return resolveSharedPreparedRuntimeProjectState(prepared)
}

function preferFullCanonicalLandedProgressWhenCurrentIsTruncated(input: {
  current?: string | null
  canonical?: string | null
}) {
  const current = sanitizeText(input.current ?? '', '') || null
  const canonical = sanitizeText(input.canonical ?? '', '') || null

  if (!current)
    return canonical
  if (!canonical)
    return current
  if (current === canonical)
    return current
  if (canonical.startsWith(current) && canonical.length >= current.length + 24)
    return canonical

  return current
}

function preferFullCanonicalProjectStateTextWhenCurrentIsTruncated(input: {
  current?: string | null
  canonical?: string | null
}) {
  const current = sanitizeText(input.current ?? '', '') || null
  const canonical = sanitizeText(input.canonical ?? '', '') || null

  if (!current)
    return canonical
  if (!canonical)
    return current
  if (current === canonical)
    return current
  if (canonical.startsWith(current) && canonical.length >= current.length + 24)
    return canonical

  return current
}

function preferExplicitProjectClosureCarryOverCanonical(input: {
  current?: string | null
  candidate?: string | null
  canonical?: string | null
  kind: 'landed' | 'open' | 'next'
}) {
  const current = sanitizeText(input.current ?? '', '') || null
  const candidate = sanitizeText(input.candidate ?? '', '') || null
  const canonical = sanitizeText(input.canonical ?? '', '') || null

  if (!current)
    return candidate || canonical
  if (!candidate)
    return current

  const looksCanonicalOrTruncated = (value: string | null) => {
    if (!value || !canonical)
      return false
    if (value === canonical)
      return true
    return canonical.startsWith(value) && canonical.length >= value.length + 24
  }

  if (current === candidate) {
    const currentLooksWeak
      = looksCanonicalOrTruncated(current)
        || looksLikeThinProjectClosureCarry({
          value: current,
          kind: input.kind,
        })
    return currentLooksWeak ? (canonical || current) : current
  }

  const currentLooksWeak
    = looksCanonicalOrTruncated(current)
      || looksLikeThinProjectClosureCarry({
        value: current,
        kind: input.kind,
      })
  const candidateLooksWeak
    = looksCanonicalOrTruncated(candidate)
      || looksLikeThinProjectClosureCarry({
        value: candidate,
        kind: input.kind,
      })

  if (currentLooksWeak && !candidateLooksWeak)
    return candidate
  if (candidateLooksWeak && !currentLooksWeak)
    return current

  return preferRicherProjectStateAuditText({
    current,
    candidate,
  })
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

function carriesGovernanceTailProjectProgress(value: string | null | undefined) {
  const normalized = sanitizeText(value ?? '', '').toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('pre-dialogue transport')
    && normalized.includes('entrypoint governance')
    && normalized.includes('chat-entry governance')
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
    if (/same digital life/i.test(candidate) && /same still-open closure work/i.test(candidate))
      return candidate
    return sanitizeText(`same digital life | same still-open closure work | ${candidate}`, '') || candidate
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

function resolveStructuredPreDialogueClosure(input: {
  projectStateClosureSummary: string | null
  projectStatePrimaryOpenLoop: string | null
  projectStateNextClosureTarget: string | null
  preferredCompanionBriefingLine?: string | null
}) {
  const preferredCompanionBriefingLine = sanitizeText(input.preferredCompanionBriefingLine, '') || null
  const summaryLine = preferredCompanionBriefingLine
    || sanitizeText(input.projectStateClosureSummary, '')
    || null
  const companionNextClosureLine = sanitizeText(input.projectStateNextClosureTarget, '') || null
  const openClosureReason = sanitizeText(input.projectStatePrimaryOpenLoop, '') || null
  const briefingLines = [
    summaryLine,
    companionNextClosureLine ? `Next closure target: ${companionNextClosureLine}` : null,
  ].filter((value): value is string => Boolean(value))
  const reasons = [
    openClosureReason,
    companionNextClosureLine,
  ].filter((value): value is string => Boolean(value))
  if (briefingLines.length === 0 && reasons.length === 0)
    return null

  return {
    status: 'partial',
    summaryLine,
    companionBriefingLine: preferredCompanionBriefingLine,
    companionNextClosureLine,
    briefingLines,
    reasons,
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

function resolveStructuredPreDialogueAwarenessSummary(structured: Record<string, unknown> | null | undefined) {
  const preDialogueAwareness = structured?.preDialogueAwareness && typeof structured.preDialogueAwareness === 'object'
    ? structured.preDialogueAwareness as Record<string, unknown>
    : null
  const preDialogueClosure = structured?.preDialogueClosure && typeof structured.preDialogueClosure === 'object'
    ? structured.preDialogueClosure as Record<string, unknown>
    : null
  const projectState = structured?.projectState && typeof structured.projectState === 'object'
    ? structured.projectState as Record<string, unknown>
    : null

  return resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      preDialogueAwarenessLine: projectState?.preDialogueAwarenessLine,
      awarenessLine: preDialogueAwareness?.awarenessLine,
      companionHeadlineLine: projectState?.companionHeadlineLine,
      companionBriefingLine: preDialogueAwareness?.companionBriefingLine ?? preDialogueClosure?.companionBriefingLine,
      preDialogueAwarenessSummary: preDialogueAwareness?.summaryLine ?? preDialogueClosure?.summaryLine,
      preflightSummary: projectState?.preflightSummary,
    },
  }) ?? null
}

function resolvePayloadPreDialogueAwarenessSummary(payload: AlicizationChatStartPayload) {
  const companionHeadlineLine = sanitizeText(payload.preDialogueSendIdentity?.companionHeadlineLine, '')
  if (companionHeadlineLine)
    return companionHeadlineLine
  const awarenessLine = sanitizeText(payload.preDialogueSendIdentity?.awarenessLine, '')
  const summaryLine = sanitizeText(payload.preDialogueSendIdentity?.summaryLine, '')
  if (awarenessLine) {
    if (
      looksLikeThinProjectAwarenessShell(awarenessLine)
      && summaryLine
      && !looksLikeThinProjectAwarenessShell(summaryLine)
      && !looksLikeStructuredProjectAwarenessSummaryShell(summaryLine)
    ) {
      return summaryLine
    }

    return awarenessLine
  }
  const companionBriefingLine = sanitizeText(payload.preDialogueSendIdentity?.companionBriefingLine, '')
  if (companionBriefingLine)
    return companionBriefingLine
  if (summaryLine && !looksLikeThinProjectAwarenessShell(summaryLine))
    return summaryLine
  return null
}

function resolvePayloadPreDialogueSummaryShell(payload: AlicizationChatStartPayload) {
  const summaryLine = sanitizeText(payload.preDialogueSendIdentity?.summaryLine, '')
  if (summaryLine)
    return summaryLine
  return null
}

function resolvePreferredHostVisibleProjectPreflightSummary(input: {
  rawPayloadSummary?: string | null
  normalizedPayloadSummary?: string | null
  preparedClosureSummary?: string | null
  runtimeDigestSummary?: string | null
  preparedRuntimeSummary?: string | null
  resolvedProjectStateSummary?: string | null
  parsedProjectStateSummary?: string | null
  structuredProjectStateSummary?: string | null
  canonicalSummary?: string | null
}) {
  const rawPayloadSummary = sanitizeText(input.rawPayloadSummary ?? '', '') || null
  const normalizedPayloadSummary = sanitizeText(input.normalizedPayloadSummary ?? '', '') || null
  const preparedClosureSummary = sanitizeText(input.preparedClosureSummary ?? '', '') || null
  const runtimeDigestSummary = sanitizeText(input.runtimeDigestSummary ?? '', '') || null
  const preparedRuntimeSummary = sanitizeText(input.preparedRuntimeSummary ?? '', '') || null
  const resolvedProjectStateSummary = sanitizeText(input.resolvedProjectStateSummary ?? '', '') || null
  const parsedProjectStateSummary = sanitizeText(input.parsedProjectStateSummary ?? '', '') || null
  const structuredProjectStateSummary = sanitizeText(input.structuredProjectStateSummary ?? '', '') || null
  const canonicalSummary = sanitizeText(input.canonicalSummary ?? '', '') || null

  const preferredPreparedSummary
    = preparedClosureSummary
      || runtimeDigestSummary
      || preparedRuntimeSummary
      || resolvedProjectStateSummary
      || structuredProjectStateSummary
      || parsedProjectStateSummary
      || normalizedPayloadSummary
      || canonicalSummary
      || null

  if (
    rawPayloadSummary
    && (
      !preferredPreparedSummary
      || preferredPreparedSummary === canonicalSummary
    )
  ) {
    return rawPayloadSummary
  }

  return preferredPreparedSummary
    || rawPayloadSummary
    || normalizedPayloadSummary
    || canonicalSummary
    || null
}

function resolvePayloadExplicitCompanionBriefingLine(payload: AlicizationChatStartPayload) {
  const companionBriefingLine = sanitizeText(payload.preDialogueSendIdentity?.companionBriefingLine, '')
  if (companionBriefingLine)
    return companionBriefingLine
  return null
}

function resolvePayloadPreferredPreDialogueAwarenessCarry(payload: AlicizationChatStartPayload) {
  const preferredAwarenessLine = resolvePayloadPreDialogueAwarenessSummary(payload)
  const companionBriefingLine = resolvePayloadExplicitCompanionBriefingLine(payload)

  if (!companionBriefingLine)
    return preferredAwarenessLine
  if (!preferredAwarenessLine)
    return companionBriefingLine
  if (companionBriefingLine === preferredAwarenessLine)
    return companionBriefingLine

  if (
    (
      looksLikeThinProjectAwarenessShell(companionBriefingLine)
      || looksLikeCanonicalProjectAwarenessReanchor(companionBriefingLine)
      || looksLikeStructuredProjectAwarenessSummaryShell(companionBriefingLine)
    )
    && !looksLikeThinProjectAwarenessShell(preferredAwarenessLine)
    && !looksLikeCanonicalProjectAwarenessReanchor(preferredAwarenessLine)
    && !looksLikeStructuredProjectAwarenessSummaryShell(preferredAwarenessLine)
  ) {
    return preferredAwarenessLine
  }

  return companionBriefingLine
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

function looksLikeStrongSameHerCarryLine(text: string | null | undefined) {
  return /holding together mainly through|one living her|one living digital life|one continuous her|same living line|face|motion|voice|lipsync|cross-modal|embodiment closure|generic assistant shell|generic project guidance|generic project shell|detached project narration|project-summary voice|generic task shell/iu.test(text ?? '')
}

function promoteSameHerDriftRiskOverThinAwareness(input: {
  awarenessLine?: string | null
  sameHerDriftRisk?: string | null
}) {
  const awarenessLine = sanitizeText(input.awarenessLine ?? '', '') || null
  const sameHerDriftRisk = sanitizeText(input.sameHerDriftRisk ?? '', '') || null
  const awarenessLooksWeak = Boolean(
    awarenessLine
    && (
      looksLikeThinProjectAwarenessShell(awarenessLine)
      || looksLikeCanonicalProjectAwarenessReanchor(awarenessLine)
      || looksLikeStructuredProjectAwarenessSummaryShell(awarenessLine)
      || looksLikeGeneratedProjectAwarenessExpansion(awarenessLine)
    ),
  )
  const awarenessCarriesExplicitProjectIdentity = Boolean(
    awarenessLine && carriesExplicitProjectAwarenessIdentity(awarenessLine),
  )

  if (
    awarenessLine
    && sameHerDriftRisk
    && awarenessLine !== sameHerDriftRisk
    && awarenessLooksWeak
    && !awarenessCarriesExplicitProjectIdentity
    && looksLikeStrongSameHerCarryLine(sameHerDriftRisk)
  ) {
    return sameHerDriftRisk
  }

  return awarenessLine
}

function preferStrongerSameHerHeadlineOverAwareness(input: {
  awarenessLine?: string | null
  companionHeadlineLine?: string | null
}) {
  const awarenessLine = sanitizeText(input.awarenessLine ?? '', '') || null
  const companionHeadlineLine = sanitizeText(input.companionHeadlineLine ?? '', '') || null

  if (!companionHeadlineLine)
    return awarenessLine
  if (!awarenessLine)
    return companionHeadlineLine
  if (awarenessLine === companionHeadlineLine)
    return awarenessLine

  const awarenessLooksThin = looksLikeThinProjectAwarenessShell(awarenessLine)
    || looksLikeCanonicalProjectAwarenessReanchor(awarenessLine)
    || looksLikeStructuredProjectAwarenessSummaryShell(awarenessLine)
    || looksLikeGeneratedProjectAwarenessExpansion(awarenessLine)
  if (awarenessLooksThin && looksLikeStrongSameHerCarryLine(companionHeadlineLine))
    return companionHeadlineLine

  return awarenessLine
}

function synthesizeAuthorityOnlyEmbodimentCompanionHeadline(input: {
  authoritySummary?: string | null
  currentBodyState?: string | null
} | null | undefined) {
  const authoritySummary = sanitizeText(input?.authoritySummary ?? '', '') || null
  const currentBodyState = sanitizeText(input?.currentBodyState ?? '', '') || null
  if (!authoritySummary && !currentBodyState)
    return null

  const synthesizedHeadline = sanitizeText(describeAlicizationEmbodimentClosureHeadline({
    authoritySummary,
    currentBodyState,
  }), '') || null

  return synthesizedHeadline && looksLikeStrongSameHerCarryLine(synthesizedHeadline)
    ? synthesizedHeadline
    : null
}

function resolveRawPreparedRuntimeExplicitCompanionHeadlineLine(
  prepared: AlicizationPreparedMainChatExecutionResult | null | undefined,
) {
  const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
  const rawRuntimeProjectState
    = preferredRuntimeSurface?.raw?.runtimeDigest?.projectState
      ?? preferredRuntimeSurface?.cognition?.runtimeDigest?.projectState
      ?? prepared?.runtimeDigest?.projectState
      ?? null
  const rawCurrentConsciousProjectState = preferredRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState ?? null
  const rawContractProjectState = prepared?.mindTurnContract?.projectState ?? null

  return [
    rawCurrentConsciousProjectState?.companionHeadlineLine,
    rawRuntimeProjectState?.companionHeadlineLine,
    rawContractProjectState?.companionHeadlineLine,
  ]
    .map(value => sanitizeText(value ?? '', '') || null)
    .find((value): value is string => Boolean(value))
    ?? null
}

function preferCompactRecoveryPayloadHeadlineOverFallback(input: {
  awarenessLine?: string | null
  payloadAwarenessLine?: string | null
  payloadCompanionBriefingLine?: string | null
  payloadCompanionHeadlineLine?: string | null
}) {
  const awarenessLine = sanitizeText(input.awarenessLine ?? '', '') || null
  const payloadAwarenessLine = sanitizeText(input.payloadAwarenessLine ?? '', '') || null
  const payloadCompanionBriefingLine = sanitizeText(input.payloadCompanionBriefingLine ?? '', '') || null
  const payloadCompanionHeadlineLine = sanitizeText(input.payloadCompanionHeadlineLine ?? '', '') || null

  if (!payloadCompanionHeadlineLine || !looksLikeStrongSameHerCarryLine(payloadCompanionHeadlineLine))
    return awarenessLine

  if (awarenessLine === payloadCompanionBriefingLine || awarenessLine === payloadAwarenessLine)
    return payloadCompanionHeadlineLine

  return preferStrongerSameHerHeadlineOverAwareness({
    awarenessLine,
    companionHeadlineLine: payloadCompanionHeadlineLine,
  })
}

function preferRicherProjectAwarenessOverNarrowSameHerCarry(input: {
  awarenessLine?: string | null
  candidateAwarenessLine?: string | null
}) {
  const awarenessLine = sanitizeText(input.awarenessLine ?? '', '') || null
  const candidateAwarenessLine = sanitizeText(input.candidateAwarenessLine ?? '', '') || null

  if (!candidateAwarenessLine)
    return awarenessLine
  if (!awarenessLine)
    return candidateAwarenessLine
  if (awarenessLine === candidateAwarenessLine)
    return awarenessLine

  if (
    (
      looksLikeThinProjectAwarenessShell(awarenessLine)
      || looksLikeCanonicalProjectAwarenessReanchor(awarenessLine)
      || looksLikeStructuredProjectAwarenessSummaryShell(awarenessLine)
      || looksLikeGeneratedProjectAwarenessExpansion(awarenessLine)
    )
    && !looksLikeThinProjectAwarenessShell(candidateAwarenessLine)
  ) {
    return candidateAwarenessLine
  }

  if (
    preferRicherProjectStateAuditText({
      current: awarenessLine,
      candidate: candidateAwarenessLine,
    }) === candidateAwarenessLine
    && looksLikeStrongSameHerCarryLine(awarenessLine)
    && !looksLikeStrongSameHerCarryLine(candidateAwarenessLine)
  ) {
    return candidateAwarenessLine
  }

  return awarenessLine
}

function looksLikeProjectAwareClosureSummary(text: string | null | undefined) {
  return /local-first digital life project|same-her|same living line|phase 1|数字生命项目|同一个数字生命项目/iu.test(text ?? '')
}

function carriesExplicitProjectAwarenessIdentity(text: string | null | undefined) {
  return /local-first digital life project|phase 1|数字生命项目|同一个数字生命项目/iu.test(text ?? '')
}

function preferProjectAwareClosureSummary(input: {
  current?: string | null
  candidate?: string | null
}) {
  const current = sanitizeText(input.current ?? '', '') || null
  const candidate = sanitizeText(input.candidate ?? '', '') || null

  if (!candidate)
    return current
  if (!current)
    return candidate
  if (current === candidate)
    return current

  if (
    looksLikeStrongSameHerCarryLine(current)
    && !looksLikeThinProjectAwarenessShell(candidate)
    && looksLikeProjectAwareClosureSummary(candidate)
  ) {
    return candidate
  }

  return preferRicherProjectAwarenessOverNarrowSameHerCarry({
    awarenessLine: current,
    candidateAwarenessLine: candidate,
  }) ?? current
}

function looksLikeCanonicalProjectAwarenessReanchor(text: string | null | undefined) {
  const normalized = sanitizeText(text ?? '', '').toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('before answering, remember: alicization is a local-first digital life project building one continuous "her"')
    && normalized.includes('she is still inside phase 1: local digital life')
    && normalized.includes('the still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    && normalized.includes('same phase 1 digital life')
}

function preferExplicitProjectAwarenessOverCanonicalReanchor(input: {
  current?: string | null
  candidate?: string | null
}) {
  const current = sanitizeText(input.current ?? '', '') || null
  const candidate = sanitizeText(input.candidate ?? '', '') || null

  if (!candidate)
    return current
  if (!current)
    return candidate
  if (current === candidate)
    return current

  if (
    (
      looksLikeThinProjectAwarenessShell(current)
      || looksLikeCanonicalProjectAwarenessReanchor(current)
      || looksLikeStructuredProjectAwarenessSummaryShell(current)
      || looksLikeGeneratedProjectAwarenessExpansion(current)
    )
    && !looksLikeThinProjectAwarenessShell(candidate)
  ) {
    return candidate
  }

  return current
}

function resolveProjectStateAwarenessField(input: {
  runtimeDigestProjectState: Record<string, unknown> | null | undefined
  preparedRuntimeProjectState?: Record<string, unknown> | null | undefined
  payloadFallback?: string | null
  canonicalFallback?: string | null
}) {
  const normalizedPayloadFallback = sanitizeText(input.payloadFallback ?? '', '') || null
  const normalizedCanonicalFallback = sanitizeText(input.canonicalFallback ?? '', '') || null
  const preferredPayloadFallback = normalizedPayloadFallback
    && normalizedPayloadFallback !== normalizedCanonicalFallback
    && !/same digital life\s*\|/iu.test(normalizedPayloadFallback)
    ? normalizedPayloadFallback
    : null

  return resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: input.runtimeDigestProjectState
      ? {
          preDialogueAwarenessLine: input.runtimeDigestProjectState.preDialogueAwarenessLine,
          awarenessLine: input.runtimeDigestProjectState.awarenessLine,
          companionHeadlineLine: input.runtimeDigestProjectState.companionHeadlineLine,
          companionBriefingLine: input.runtimeDigestProjectState.companionBriefingLine,
          preDialogueAwarenessSummary: input.runtimeDigestProjectState.preDialogueAwarenessSummary,
          preflightSummary: input.runtimeDigestProjectState.preflightSummary,
        }
      : null,
    fallbackProjectState: input.preparedRuntimeProjectState
      ? {
          preDialogueAwarenessLine: input.preparedRuntimeProjectState.preDialogueAwarenessLine,
          awarenessLine: input.preparedRuntimeProjectState.awarenessLine,
          companionHeadlineLine: input.preparedRuntimeProjectState.companionHeadlineLine,
          companionBriefingLine: input.preparedRuntimeProjectState.companionBriefingLine,
          preDialogueAwarenessSummary: input.preparedRuntimeProjectState.preDialogueAwarenessSummary,
          preflightSummary: input.preparedRuntimeProjectState.preflightSummary,
        }
      : {
          preDialogueAwarenessLine: preferredPayloadFallback ?? normalizedCanonicalFallback,
          preflightSummary: normalizedCanonicalFallback,
        },
  })
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

export async function runAlicizationMainChatBackground(
  input: RunAlicizationMainChatBackgroundOptions,
) {
  const payload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(input.payload)
  const rawPreDialogueSendIdentity = input.payload.preDialogueSendIdentity ?? null
  const rawPayloadCompanionBriefingLine = sanitizeText(rawPreDialogueSendIdentity?.companionBriefingLine, '') || null
  const rawPayloadCompanionHeadlineLine = sanitizeText(rawPreDialogueSendIdentity?.companionHeadlineLine, '') || null
  const rawPayloadAwarenessLine = sanitizeText(rawPreDialogueSendIdentity?.awarenessLine, '') || null
  const rawPayloadStatus = sanitizeText(rawPreDialogueSendIdentity?.status, '') || null
  const rawPayloadPreferredPreDialogueAwarenessSummary = resolvePayloadPreferredPreDialogueAwarenessCarry(input.payload)
  const resolveVerbatimPayloadProjectAwarenessLine = (options?: {
    allowThinShell?: boolean
  }) => {
    const allowThinShell = options?.allowThinShell === true
    const exactAwarenessLine = rawPayloadAwarenessLine && rawPayloadCompanionBriefingLine && rawPayloadAwarenessLine === rawPayloadCompanionBriefingLine
      ? rawPayloadAwarenessLine
      : (!rawPayloadCompanionHeadlineLine && rawPayloadCompanionBriefingLine && !rawPayloadAwarenessLine
          ? rawPayloadCompanionBriefingLine
          : null)

    if (!exactAwarenessLine || rawPayloadCompanionHeadlineLine)
      return null
    if (
      !allowThinShell
      && (
        looksLikeThinProjectAwarenessShell(exactAwarenessLine)
        || looksLikeCanonicalProjectAwarenessReanchor(exactAwarenessLine)
        || looksLikeStructuredProjectAwarenessSummaryShell(exactAwarenessLine)
        || looksLikeGeneratedProjectAwarenessExpansion(exactAwarenessLine)
      )
    ) {
      return null
    }

    return exactAwarenessLine
  }
  const conversationMessages = Array.isArray(payload.messages)
    ? payload.messages as Message[]
    : []
  let prepared: AlicizationPreparedMainChatExecutionResult | null = null
  let chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']> | null = null
  let messages: Message[] = []
  let tools: PreparedMainChatExecution['tools']
  let toolChoice: PreparedMainChatExecution['toolChoice']
  let timeoutRecoveryMode: AlicizationMainChatTimeoutRecoveryMode = 'original'
  let timeoutRecoveryMs = mainChatTimeoutRecoveryMs
  const nonProgressEventTypes = new Set<string>()
  let pendingAffirmationToolInputOverrides: Record<string, Record<string, unknown>> | undefined
  let preparedExecutionToolInputOverrides: Record<string, Record<string, unknown>> | undefined
  const mergeToolInputOverrides = (
    base: Record<string, Record<string, unknown>> | undefined,
    patch: Record<string, Record<string, unknown>> | undefined,
  ) => {
    if (!base)
      return patch
    if (!patch)
      return base

    const merged: Record<string, Record<string, unknown>> = { ...base }
    for (const [toolName, argumentObject] of Object.entries(patch))
      merged[toolName] = { ...base[toolName], ...argumentObject }
    return merged
  }
  let currentVisibleReplyExecution: AlicizationVisibleReplyExecution | null = null
  let latestResolvedVisibleReply: AlicizationResolvedVisibleReply | null = null
  let releasedVisibleReplyText = ''
  const suppressedFreshExecutionReplyKeys = new Set<string>()
  const resolveDigitalLifeSpineFromPrepared = () => {
    const runtimeSurface = prepared?.runtimeSurface
    if (!runtimeSurface)
      return null
    const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(runtimeSurface)
    const spine = runtimeSurface.digitalLifeSpine ?? null
    const spineRuntimeSurface = spine?.runtimeSurface as AlicizationPreparedMainChatExecutionResult['runtimeSurface']['digitalLifeRuntimeSurface'] | null | undefined
    const directSpineIsThin = Boolean(
      spineRuntimeSurface && !hasUsablePreparedBackgroundRuntimeSurface(spineRuntimeSurface),
    )
    if (!spine && !preferredRuntimeSurface)
      return null
    try {
      if (preferredRuntimeSurface && (preferredRuntimeSurface !== spine?.runtimeSurface || directSpineIsThin))
        return deriveAlicizationDigitalLifeSpineFromSurface(preferredRuntimeSurface)
    }
    catch {
      return spine
    }
    return spine
  }
  const resolvePreparedDigitalLifeSpineDigest = () => {
    const preparedDigitalLifeSpine = resolveDigitalLifeSpineFromPrepared()
    if (preparedDigitalLifeSpine) {
      try {
        return normalizeAlicizationDigitalLifeSpineDigest(
          projectAlicizationDigitalLifeSpineDigest(preparedDigitalLifeSpine),
        )
      }
      catch {
      }
    }

    // Concurrent work can leave a thin runtimeSurface-only spine snapshot in prepared state.
    // Fall back to rebuilding a digest from the preferred runtime surface instead of breaking the turn.
    const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(prepared?.runtimeSurface)
    if (!preferredRuntimeSurface)
      return null

    try {
      return normalizeAlicizationDigitalLifeSpineDigest(
        projectAlicizationDigitalLifeSpineDigest(
          deriveAlicizationDigitalLifeSpineFromSurface(preferredRuntimeSurface),
        ),
      )
    }
    catch {
      return null
    }
  }
  const resolveResidentPerformanceFromPrepared = (): AlicizationResidentPerformanceSnapshot | null => {
    const runtimeSurface = prepared?.runtimeSurface
    const runtimeDigestSurface = resolvePreferredPreparedRuntimeSurface(runtimeSurface)
    if (!runtimeDigestSurface)
      return null

    const perception = runtimeDigestSurface.perception ?? null
    const cognition = runtimeDigestSurface.cognition ?? null
    const dialogue = runtimeDigestSurface.dialogue ?? null
    const dialogueCurrentConsciousFrame = dialogue?.currentConsciousFrame
      && typeof dialogue.currentConsciousFrame === 'object'
      ? dialogue.currentConsciousFrame as unknown as Record<string, unknown>
      : null
    const memory = runtimeDigestSurface.memory ?? null
    const rawRuntimeDigest = (() => {
      const rawCandidate = runtimeDigestSurface.raw?.runtimeDigest
      if (rawCandidate && typeof rawCandidate === 'object')
        return rawCandidate as Record<string, unknown>
      const cognitionCandidate = cognition?.runtimeDigest
      return cognitionCandidate && typeof cognitionCandidate === 'object'
        ? cognitionCandidate as Record<string, unknown>
        : null
    })()
    const rawCurrentConsciousFrame = rawRuntimeDigest?.currentConsciousFrame
      && typeof rawRuntimeDigest.currentConsciousFrame === 'object'
      ? rawRuntimeDigest.currentConsciousFrame as Record<string, unknown>
      : null
    const rawContinuityRestraint = sanitizeText(rawRuntimeDigest?.continuityRestraint ?? '', '') || null
    const mergedCurrentConsciousFrameReasonTags = Array.from(new Set([
      ...(Array.isArray(rawCurrentConsciousFrame?.reasonTags)
        ? rawCurrentConsciousFrame.reasonTags.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        : []),
      ...(Array.isArray(dialogueCurrentConsciousFrame?.reasonTags)
        ? dialogueCurrentConsciousFrame.reasonTags.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        : []),
      ...(rawContinuityRestraint === 'measured-return' || rawContinuityRestraint === 'repair-before-closeness'
        ? [rawContinuityRestraint]
        : []),
    ])).slice(0, 8)
    const preparedCanonicalProjectState = resolvePreparedCanonicalProjectState()
    const mergedCurrentConsciousFrame = (dialogueCurrentConsciousFrame || rawCurrentConsciousFrame)
      ? {
          ...rawCurrentConsciousFrame,
          ...dialogueCurrentConsciousFrame,
          reasonTags: mergedCurrentConsciousFrameReasonTags,
          continuityArcStage:
            sanitizeText(
              dialogueCurrentConsciousFrame?.continuityArcStage
              ?? rawCurrentConsciousFrame?.continuityArcStage
              ?? '',
              '',
            ) || null,
          continuityPreferredTiming:
            sanitizeText(
              dialogueCurrentConsciousFrame?.continuityPreferredTiming
              ?? rawCurrentConsciousFrame?.continuityPreferredTiming
              ?? '',
              '',
            ) || null,
          projectState: {
            ...preparedCanonicalProjectState,
            ...((rawCurrentConsciousFrame?.projectState && typeof rawCurrentConsciousFrame.projectState === 'object')
              ? rawCurrentConsciousFrame.projectState as Record<string, unknown>
              : {}),
            ...((dialogueCurrentConsciousFrame as { projectState?: Record<string, unknown> | null } | null)?.projectState),
            emotionalClosureCue:
              ((dialogueCurrentConsciousFrame as { projectState?: { emotionalClosureCue?: unknown } | null } | null)?.projectState?.emotionalClosureCue as string | null | undefined)
              ?? ((rawCurrentConsciousFrame?.projectState && typeof rawCurrentConsciousFrame.projectState === 'object')
                ? (rawCurrentConsciousFrame.projectState as { emotionalClosureCue?: unknown }).emotionalClosureCue as string | null | undefined
                : null)
              ?? prepared?.mindTurnContract?.emotionalClosureCue
              ?? null,
          },
        }
      : prepared?.mindTurnContract?.emotionalClosureCue
        ? {
            projectState: {
              ...preparedCanonicalProjectState,
              emotionalClosureCue: prepared.mindTurnContract.emotionalClosureCue,
            },
          }
        : null

    const updatedAt = Number.isFinite(perception?.updatedAt)
      ? Number(perception?.updatedAt)
      : Date.now()
    return deriveAlicizationResidentPerformanceSnapshot({
      watchMode: perception?.watchMode ?? null,
      currentBodyState: perception?.currentBodyState ?? null,
      continuityMode: perception?.continuityMode ?? null,
      currentInwardPreoccupation: perception?.currentInwardPreoccupation ?? null,
      quietLineMs: perception?.quietLineMs ?? null,
      currentScene: perception?.currentScene ?? null,
      attention: perception?.attention ?? null,
      captureState: perception?.captureState ?? null,
      privateThought: cognition?.privateThought ?? null,
      currentConsciousFrame: mergedCurrentConsciousFrame,
      affectiveResidue: memory?.affectiveResidue
        ?? memory?.derivedMindStateBundle?.affectiveResidue
        ?? null,
      updatedAt,
    }, {
      fallbackUpdatedAt: updatedAt,
      source: 'main-runtime',
    })
  }
  const resolveRuntimeDigestFromPrepared = (): AlicizationRuntimeDigest | null => {
    const preparedDigitalLifeSpine = resolvePreparedDigitalLifeSpineDigest()
    const alignedPreparedState = reconcileStructuredDigitalLifeRuntimeState(preparedDigitalLifeSpine)
    const mergedRuntimeDigest = mergePreparedRuntimeDigestCarry(alignedPreparedState.runtimeDigest)
    return (mergedRuntimeDigest ?? buildPreparedRuntimeDigestFallback(prepared)) as AlicizationRuntimeDigest | null
  }
  const resolvePreparedCanonicalProjectState = () => {
    return resolveStructuredProjectState(resolvePreparedRuntimeProjectState(prepared))
  }
  const resolvePreparedStrongestProjectStateSameHerSelfLine = () => {
    const preparedRuntimeProjectState = resolvePreparedRuntimeProjectState(prepared)
    const preparedCanonicalProjectState = resolvePreparedCanonicalProjectState()
    const preparedSelfContinuityAuthority = resolvePreparedRuntimeSelfContinuityAuthority(prepared)
    const continuousHerAuthorityCandidate = [
      sanitizeText(preparedSelfContinuityAuthority?.selfLine ?? '', ''),
      sanitizeText(preparedSelfContinuityAuthority?.inwardLine ?? '', ''),
      sanitizeText(preparedSelfContinuityAuthority?.authoritySummary ?? '', ''),
    ].find(candidate => /continuous her|one continuous her/iu.test(candidate)) ?? null
    const runtimeSameHerSelfLine = sanitizeText(
      preparedRuntimeProjectState?.sameHerSelfLine
      ?? preparedCanonicalProjectState?.sameHerSelfLine
      ?? '',
      '',
    ) || preparedCanonicalProjectState?.sameHerSelfLine || null

    return preferStrongerSameHerProjectStateText({
      current: continuousHerAuthorityCandidate,
      candidate: runtimeSameHerSelfLine,
    }) ?? continuousHerAuthorityCandidate ?? runtimeSameHerSelfLine ?? null
  }
  const resolvePreparedVisibleReplyPreDialogueAwarenessSeed = () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const preparedRuntimeProjectState = resolvePreparedRuntimeProjectState(prepared)
    const fresherPreparedRuntimeProjectState = resolveFresherPreparedRuntimeProjectState(prepared)
    const awarenessPreparedRuntimeProjectState = fresherPreparedRuntimeProjectState ?? preparedRuntimeProjectState
    const payloadPreDialogueAwarenessSummary
      = resolvePayloadPreferredPreDialogueAwarenessCarry(payload)
    const payloadPreflightSummary = resolvePayloadPreDialogueSummaryShell(payload)
    const preparedRuntimeAwarenessSeed = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: awarenessPreparedRuntimeProjectState
        ? {
            preDialogueAwarenessLine: awarenessPreparedRuntimeProjectState.preDialogueAwarenessLine,
            awarenessLine: awarenessPreparedRuntimeProjectState.awarenessLine,
            companionHeadlineLine: awarenessPreparedRuntimeProjectState.companionHeadlineLine,
            companionBriefingLine: awarenessPreparedRuntimeProjectState.companionBriefingLine,
            preDialogueAwarenessSummary: awarenessPreparedRuntimeProjectState.preDialogueAwarenessSummary,
            sameHerDriftRiskSummary: awarenessPreparedRuntimeProjectState.sameHerDriftRisk,
            preflightSummary: awarenessPreparedRuntimeProjectState.preflightSummary,
          }
        : null,
      fallbackProjectState: {
        preDialogueAwarenessLine: payloadPreDialogueAwarenessSummary,
        awarenessLine: payload.preDialogueSendIdentity?.awarenessLine,
        companionHeadlineLine: payload.preDialogueSendIdentity?.companionHeadlineLine,
        companionBriefingLine: payload.preDialogueSendIdentity?.companionBriefingLine,
        preDialogueAwarenessSummary: payload.preDialogueSendIdentity?.summaryLine,
        preflightSummary: payloadPreflightSummary ?? canonicalProjectState.preflightSummary ?? null,
      },
    }) ?? canonicalProjectState.preDialogueAwarenessLine ?? null

    return promoteSameHerDriftRiskOverThinAwareness({
      awarenessLine: preferExplicitProjectAwarenessOverCanonicalReanchor({
        current: preferStrongerSameHerHeadlineOverAwareness({
          awarenessLine: preparedRuntimeAwarenessSeed,
          companionHeadlineLine: sanitizeText(awarenessPreparedRuntimeProjectState?.companionHeadlineLine ?? '', '') || null,
        }),
        candidate: payloadPreDialogueAwarenessSummary,
      }) ?? preparedRuntimeAwarenessSeed,
      sameHerDriftRisk: sanitizeText(awarenessPreparedRuntimeProjectState?.sameHerDriftRisk ?? '', '') || null,
    }) ?? preparedRuntimeAwarenessSeed
  }
  const resolvePreparedVisibleReplyProjectStateAuditSeed = () => {
    const preparedProjectStateAudit = resolvePreparedProjectStateAuditCarry(prepared)
    const preparedRuntimeProjectState = resolveFresherPreparedRuntimeProjectState(prepared)
    const preparedMindTurnProjectState = prepared?.mindTurnContract?.projectState
      && typeof prepared.mindTurnContract.projectState === 'object'
      ? prepared.mindTurnContract.projectState as Record<string, unknown>
      : null
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const preparedSameHerHoldDetail = resolvePreferredSameHerHoldDetail({
      current: sanitizeText(preparedRuntimeProjectState?.sameHerHoldDetail ?? '', ''),
      candidate: sanitizeText(preparedMindTurnProjectState?.sameHerHoldDetail ?? '', ''),
      continuityCue:
        sanitizeText(preparedRuntimeProjectState?.continuityCue ?? '', '')
        || sanitizeText((preparedMindTurnProjectState as { continuityCue?: unknown } | null)?.continuityCue, '')
        || null,
    })
    const preparedRuntimeClosureSummary = preferRicherProjectStateAuditText({
      current: sanitizeText(preparedRuntimeProjectState?.emotionalClosureSummary ?? '', ''),
      candidate: sanitizeText(preparedRuntimeProjectState?.emotionalClosureCue ?? '', ''),
    })
    const preparedMindTurnClosureSummary = preferRicherProjectStateAuditText({
      current: sanitizeText(prepared?.mindTurnContract?.emotionalClosureSummary ?? '', ''),
      candidate: sanitizeText(prepared?.mindTurnContract?.emotionalClosureCue ?? '', ''),
    })
    const preparedContinuityArcStage = sanitizeText(
      preparedRuntimeProjectState?.continuityArcStage
      ?? preparedMindTurnProjectState?.continuityArcStage
      ?? preparedProjectStateAudit.continuityArcStage
      ?? '',
      '',
    ) || null
    const preparedContinuityCue = (
      preferStrongerContinuityClosureAuthority(
        sanitizeText(preparedRuntimeProjectState?.continuityCue ?? '', ''),
        sanitizeText(preparedMindTurnProjectState?.continuityCue ?? '', ''),
      )
      ?? sanitizeText(preparedProjectStateAudit.continuityCue ?? '', '')
    ) || canonicalProjectState.continuityCue
    || null
    return {
      projectStateSameHerSummary: preferStrongerSameHerProjectStateText({
        current: resolvePreparedStrongestProjectStateSameHerSelfLine(),
        candidate: preparedProjectStateAudit.sameHerSummary ?? null,
      }) ?? resolvePreparedStrongestProjectStateSameHerSelfLine() ?? preparedProjectStateAudit.sameHerSummary,
      sameHerDriftRiskSummary:
        sanitizeText(preparedRuntimeProjectState?.sameHerDriftRisk ?? '', '')
        || preparedProjectStateAudit.sameHerDriftRiskSummary
        || canonicalProjectState.sameHerDriftRisk
        || null,
      proactiveSameHerGapSummary:
        sanitizeText(preparedRuntimeProjectState?.proactiveSameHerGap ?? '', '')
        || preparedProjectStateAudit.proactiveSameHerGapSummary
        || canonicalProjectState.proactiveSameHerGap
        || null,
      projectStateProactiveSameHerGapSummary:
        sanitizeText(preparedRuntimeProjectState?.proactiveSameHerGap ?? '', '')
        || preparedProjectStateAudit.proactiveSameHerGapSummary
        || canonicalProjectState.proactiveSameHerGap
        || null,
      projectStateCurrentPhaseSummary: preparedRuntimeProjectState?.currentPhase ?? canonicalProjectState.currentPhase,
      projectStateLandedProgressSummary: preparedProjectStateAudit.landedProgressSummary,
      projectStateOpenClosureSummary: preparedProjectStateAudit.openClosureSummary,
      projectStateNextClosureTargetSummary: preparedProjectStateAudit.nextClosureTargetSummary,
      sameHerHoldDetail: preparedSameHerHoldDetail,
      continuityArcStage: preparedContinuityArcStage,
      continuityCue: preparedContinuityCue,
      emotionalClosureSummary:
        preferRicherProjectStateAuditText({
          current: preparedRuntimeClosureSummary,
          candidate: preparedMindTurnClosureSummary,
        })
        ?? canonicalProjectState.emotionalClosureSummary
        ?? canonicalProjectState.emotionalClosureCue
        ?? null,
      projectStatePreDialogueAwarenessSummary: resolvePreparedVisibleReplyPreDialogueAwarenessSeed(),
    }
  }
  const resolvePreparedTraceFallback = () => {
    const runtimeTrace = prepared?.runtimeSurface?.trace
    const governance = prepared?.governance
    const mindTurnContract = prepared?.mindTurnContract
    return {
      decisionTraceId:
        sanitizeText(runtimeTrace?.decisionTraceId ?? '', '')
        || sanitizeText(governance?.decisionTraceId ?? '', '')
        || null,
      turnMode:
        sanitizeText(runtimeTrace?.turnMode ?? '', '')
        || sanitizeText(governance?.turnMode ?? '', '')
        || sanitizeText(mindTurnContract?.turnMode ?? '', '')
        || null,
      personaKernelMode:
        sanitizeText(runtimeTrace?.personaKernelMode ?? '', '')
        || sanitizeText(governance?.personaKernelMode ?? '', '')
        || sanitizeText(mindTurnContract?.personaKernelMode ?? '', '')
        || null,
    }
  }
  let currentStructuredDigitalLifeSpine: ReturnType<typeof normalizeAlicizationDigitalLifeSpineDigest> | null = null
  const resolveCurrentDigitalLifeSpine = () => {
    if (currentStructuredDigitalLifeSpine) {
      currentStructuredDigitalLifeSpine = reconcileStructuredDigitalLifeRuntimeState(currentStructuredDigitalLifeSpine).digitalLifeSpine
      return currentStructuredDigitalLifeSpine
    }

    const preparedDigitalLifeSpine = resolvePreparedDigitalLifeSpineDigest()
    const alignedPreparedState = reconcileStructuredDigitalLifeRuntimeState(preparedDigitalLifeSpine)
    const preparedSelfContinuityAuthority = resolvePreparedRuntimeSelfContinuityAuthority(prepared) as AlicizationSelfContinuityAuthorityShape | null
    const alignedPreparedDigitalLifeSpine = alignedPreparedState.digitalLifeSpine
    if (
      !alignedPreparedDigitalLifeSpine
      || !preparedSelfContinuityAuthority
      || !alignedPreparedDigitalLifeSpine.memory?.personStateProjection
    ) {
      return alignedPreparedDigitalLifeSpine
    }

    return normalizeAlicizationDigitalLifeSpineDigest({
      ...alignedPreparedDigitalLifeSpine,
      memory: {
        ...alignedPreparedDigitalLifeSpine.memory,
        personStateProjection: {
          ...alignedPreparedDigitalLifeSpine.memory.personStateProjection,
          selfContinuityAuthority: mergePreferredSelfContinuityAuthority({
            bundleAuthority: alignedPreparedDigitalLifeSpine.memory.personStateProjection.selfContinuityAuthority as AlicizationSelfContinuityAuthorityShape | null | undefined,
            runtimeAuthority: preparedSelfContinuityAuthority,
          }) ?? preparedSelfContinuityAuthority,
        },
      },
    })
  }
  const reconcileStructuredDigitalLifeRuntimeState = (
    digitalLifeSpine: ReturnType<typeof normalizeAlicizationDigitalLifeSpineDigest> | null | undefined,
  ) => {
    if (!digitalLifeSpine) {
      return {
        digitalLifeSpine: null,
        runtimeDigest: null,
      }
    }

    const initialRuntimeDigest = projectAlicizationRuntimeDigest(
      deriveAlicizationRuntimeSnapshot({
        spine: digitalLifeSpine as any,
      }),
    )
    const repairedDigitalLifeSpine = normalizeAlicizationDigitalLifeSpineDigest(
      repairContinuitySourceTagsFromRuntimeDigest({
        digitalLifeSpine: digitalLifeSpine as any,
        runtimeDigest: initialRuntimeDigest,
      }),
    ) ?? digitalLifeSpine
    const runtimeDigest = projectAlicizationRuntimeDigest(
      deriveAlicizationRuntimeSnapshot({
        spine: repairedDigitalLifeSpine as any,
      }),
    )
    const alignedDigitalLifeSpine = normalizeAlicizationDigitalLifeSpineDigest({
      ...repairedDigitalLifeSpine,
      runtime: {
        ...((repairedDigitalLifeSpine.runtime && typeof repairedDigitalLifeSpine.runtime === 'object')
          ? repairedDigitalLifeSpine.runtime as unknown as Record<string, unknown>
          : {}),
        continuityArcStage: runtimeDigest?.projectState?.continuityArcStage
          ?? runtimeDigest?.currentConsciousFrame?.continuityArcStage
          ?? repairedDigitalLifeSpine.runtime?.continuityArcStage
          ?? null,
        continuityPreferredTiming: runtimeDigest?.projectState?.continuityPreferredTiming
          ?? runtimeDigest?.currentConsciousFrame?.continuityPreferredTiming
          ?? repairedDigitalLifeSpine.runtime?.continuityPreferredTiming
          ?? null,
        continuityCue: runtimeDigest?.projectState?.continuityCue
          ?? repairedDigitalLifeSpine.runtime?.continuityCue
          ?? null,
      },
    }) ?? repairedDigitalLifeSpine

    return {
      digitalLifeSpine: alignedDigitalLifeSpine,
      runtimeDigest,
    }
  }
  const mergePreparedRuntimeDigestCarry = (runtimeDigest: AlicizationRuntimeDigest | null) => {
    if (!runtimeDigest)
      return null

    const canonicalProjectState = resolvePreparedRuntimeProjectStateSnapshot(prepared)
    const projectContinuityArcStage = runtimeDigest.projectState?.continuityArcStage ?? null
    const projectContinuityPreferredTiming = runtimeDigest.projectState?.continuityPreferredTiming ?? null
    const currentConsciousFrameReasonTags = Array.isArray(runtimeDigest.currentConsciousFrame?.reasonTags)
      ? runtimeDigest.currentConsciousFrame.reasonTags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
      : []
    const mergedCurrentConsciousFrame = (
      runtimeDigest.currentConsciousFrame
      || projectContinuityArcStage
      || projectContinuityPreferredTiming
    )
      ? {
          ...runtimeDigest.currentConsciousFrame,
          reasonTags: Array.from(new Set([
            ...currentConsciousFrameReasonTags,
            ...(projectContinuityArcStage ? [`continuity-arc:${projectContinuityArcStage}`] : []),
            ...(projectContinuityPreferredTiming ? [`continuity-timing:${projectContinuityPreferredTiming}`] : []),
          ])).slice(0, 8),
          continuityArcStage: runtimeDigest.currentConsciousFrame?.continuityArcStage
            ?? projectContinuityArcStage
            ?? null,
          continuityPreferredTiming: runtimeDigest.currentConsciousFrame?.continuityPreferredTiming
            ?? projectContinuityPreferredTiming
            ?? null,
        }
      : null
    const mergedActiveLoop = runtimeDigest.activeLoop
      ?? ((projectContinuityArcStage === 'same-thread-continuation'
        || currentConsciousFrameReasonTags.includes('continuity-arc:same-thread-continuation'))
        ? {
            version: 'alicization-active-loop-v1' as const,
            phase: 'continuity-hold' as const,
            dominantChannel: 'active-memory' as const,
            handoffTarget: 'active-memory' as const,
            continuityArcStage: projectContinuityArcStage,
            continuityPreferredTiming: projectContinuityPreferredTiming,
            dialogueReady: false,
            controlReady: false,
            memoryCarry: true,
            companionshipReady: true,
            observationHeavy: false,
            initiativeBudget: 0.24,
            coherence: 0.74,
            summary: 'prepared same-thread continuity hold stays on active-memory before reopening',
          }
        : null)
    const strengthenedRuntimeSameHerSelfLine = strengthenSameHerSelfLineForPersistence(
      preferStrongerSameHerProjectStateText({
        current: preferStrongerSameHerProjectStateText({
          current: runtimeDigest.projectState?.sameHerSelfLine ?? null,
          candidate: canonicalProjectState.sameHerSelfLine,
        }),
        candidate: resolveAlicizationProjectStateBrief().sameHerSelfLine,
      }),
    ) ?? null
    const canonicalFullLatestLandedProgress = sanitizeText(
      resolveAlicizationProjectStateBrief().continuityProgressSummary
      ?? canonicalProjectState.latestLandedProgress
      ?? '',
      '',
    ) || null
    const preferredLatestLandedProgress = preferFullCanonicalLandedProgressWhenCurrentIsTruncated({
      current: sanitizeText(runtimeDigest.projectState?.latestLandedProgress ?? '', '') || null,
      canonical: canonicalFullLatestLandedProgress,
    })

    return {
      ...runtimeDigest,
      activeLoop: mergedActiveLoop,
      currentConsciousFrame: mergedCurrentConsciousFrame,
      projectState: {
        ...canonicalProjectState,
        ...runtimeDigest.projectState,
        sameHerSelfLine: strengthenedRuntimeSameHerSelfLine,
        latestLandedProgress:
          preferredLatestLandedProgress
          ?? runtimeDigest.projectState?.latestLandedProgress
          ?? canonicalProjectState.latestLandedProgress
          ?? null,
        sameHerDriftRisk:
          runtimeDigest.projectState?.sameHerDriftRisk
          ?? canonicalProjectState.sameHerDriftRisk
          ?? null,
        emotionalClosureCue: runtimeDigest.projectState?.emotionalClosureCue
          ?? prepared?.mindTurnContract?.emotionalClosureCue
          ?? null,
      },
    } as AlicizationRuntimeDigest
  }
  const applyRuntimeDigestResidentHints = (
    runtimeDigest: AlicizationRuntimeDigest | null,
    residentMode: string | null | undefined,
  ) => {
    if (!runtimeDigest)
      return null

    const projectContinuityArcStage = runtimeDigest.projectState?.continuityArcStage ?? null
    const projectContinuityPreferredTiming = runtimeDigest.projectState?.continuityPreferredTiming ?? null
    const currentConsciousFrameReasonTags = Array.isArray(runtimeDigest.currentConsciousFrame?.reasonTags)
      ? runtimeDigest.currentConsciousFrame.reasonTags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
      : []

    return {
      ...runtimeDigest,
      currentConsciousFrame: (
        runtimeDigest.currentConsciousFrame
        || projectContinuityArcStage
        || projectContinuityPreferredTiming
      )
        ? {
            ...runtimeDigest.currentConsciousFrame,
            reasonTags: Array.from(new Set([
              ...currentConsciousFrameReasonTags,
              ...(projectContinuityArcStage ? [`continuity-arc:${projectContinuityArcStage}`] : []),
              ...(projectContinuityPreferredTiming ? [`continuity-timing:${projectContinuityPreferredTiming}`] : []),
            ])).slice(0, 8),
            continuityArcStage: runtimeDigest.currentConsciousFrame?.continuityArcStage
              ?? projectContinuityArcStage
              ?? null,
            continuityPreferredTiming: runtimeDigest.currentConsciousFrame?.continuityPreferredTiming
              ?? projectContinuityPreferredTiming
              ?? null,
          }
        : null,
      projectState: {
        ...runtimeDigest.projectState,
        preferredBlinkCadence: runtimeDigest.projectState?.preferredBlinkCadence
          ?? (residentMode === 'repair-before-closeness'
            ? 'quiet'
            : residentMode === 'measured-return'
              ? 'linger'
              : null),
        preferredGazeMode: runtimeDigest.projectState?.preferredGazeMode
          ?? (residentMode === 'repair-before-closeness' || residentMode === 'measured-return'
            ? 'soften'
            : null),
      },
    } as AlicizationRuntimeDigest
  }
  const resolveCurrentRuntimeDigest = () => {
    if (currentStructuredDigitalLifeSpine) {
      const alignedStructuredState = reconcileStructuredDigitalLifeRuntimeState(currentStructuredDigitalLifeSpine)
      currentStructuredDigitalLifeSpine = alignedStructuredState.digitalLifeSpine
      const mergedRuntimeDigest = mergePreparedRuntimeDigestCarry(alignedStructuredState.runtimeDigest)
      return mergedRuntimeDigest ?? buildPreparedRuntimeDigestFallback(prepared)
    }
    return resolveRuntimeDigestFromPrepared()
  }
  let currentStructuredGovernance: AlicizationMindTurnGovernance | null = null
  let currentStructuredPerformance: AlicizationDialoguePerformancePayload | null = null
  let currentStructuredThought: string | null = null
  let latestSettledProjectStateAudit: Record<string, unknown> | null = null
  const streamMetaEmitter = createAlicizationChatStreamMetaEmitter({
    cardId: payload.cardId,
    turnId: payload.turnId,
    getGovernance: () => currentStructuredGovernance ?? prepared?.governance ?? null,
    getThought: () => currentStructuredThought,
    getVisibleReplyExecution: () => currentVisibleReplyExecution,
    getDigitalLifeSpine: () => resolveCurrentDigitalLifeSpine(),
    getRuntimeDigest: () => resolveCurrentRuntimeDigest(),
    getResidentPerformance: () => resolveResidentPerformanceFromPrepared(),
    getPerformanceManifest: () => prepared?.performanceManifest ?? null,
    getExplicitPerformance: () => currentStructuredPerformance,
    emit: input.emitMeta,
  })
  const emitStreamEmbodimentMeta = streamMetaEmitter.emit
  const executorToolCallIds = new Set<string>()
  const inlineExecutionReceipts = new Map<string, AlicizationInlineExecutionReceipt>()
  const preDialogueAwarenessDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(payload)
  const resolveAuthoritativeGovernance = () => {
    return currentStructuredGovernance
      ?? prepared?.governance
      ?? prepared?.runtimeSurface?.governance
      ?? null
  }

  const emitFinalAuthoritativeMeta = (inputSurface: {
    reply: string
    thought: string | null
    performance: AlicizationDialoguePerformancePayload | null
    digitalLifeSpine: ReturnType<typeof normalizeAlicizationDigitalLifeSpineDigest> | null
  }) => {
    if (!prepared || !inputSurface.reply.trim() || !inputSurface.digitalLifeSpine)
      return

    const proactiveSameLineContinuation
      = sameLineMeasuredReturnPattern.test([
        inputSurface.reply,
        inputSurface.thought ?? '',
      ].join(' | '))
    const authoritativeDigitalLifeSpine = proactiveSameLineContinuation
      ? normalizeAlicizationDigitalLifeSpineDigest({
        ...inputSurface.digitalLifeSpine,
        runtime: {
          ...((inputSurface.digitalLifeSpine.runtime && typeof inputSurface.digitalLifeSpine.runtime === 'object')
            ? inputSurface.digitalLifeSpine.runtime as unknown as Record<string, unknown>
            : {}),
          continuityArcStage: 'same-thread-continuation',
        },
      }) ?? inputSurface.digitalLifeSpine
      : inputSurface.digitalLifeSpine
    const residentPerformance = resolveResidentPerformanceFromPrepared()
    const alignedStructuredState = reconcileStructuredDigitalLifeRuntimeState(authoritativeDigitalLifeSpine)
    const runtimeDigest = mergePreparedRuntimeDigestCarry(alignedStructuredState.runtimeDigest)
    const meta = buildAlicizationChatStreamEmbodimentMeta({
      governance: resolveAuthoritativeGovernance(),
      digitalLifeSpine: authoritativeDigitalLifeSpine as any,
      affectiveResidue: runtimeDigest?.affectiveResidue
        ?? runtimeDigest?.derivedMindStateBundle?.affectiveResidue
        ?? null,
      currentConsciousFrame: resolveEmbodimentMetaCurrentConsciousFrameInput(runtimeDigest?.currentConsciousFrame),
      performanceManifest: prepared.performanceManifest ?? null,
      residentPerformance,
      explicitPerformance: inputSurface.performance ?? null,
      reply: inputSurface.reply,
      thought: inputSurface.thought ?? undefined,
      turnId: input.payload.turnId,
    })
    const authoritativeResidentMode = meta.embodimentScript?.state.residentMode
    const runtimeDigestWithResidentHints = applyRuntimeDigestResidentHints(
      runtimeDigest,
      authoritativeResidentMode,
    )
    const authoritativeDigitalLifeSpineWithRuntimeCarry
      = alignedStructuredState.digitalLifeSpine
        ?? authoritativeDigitalLifeSpine
    const authoritativeSourceTags = authoritativeDigitalLifeSpineWithRuntimeCarry?.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags
    const alignedContinuityPreferredTiming = runtimeDigestWithResidentHints?.projectState?.continuityPreferredTiming ?? null
    const finalDigitalLifeSpine = authoritativeDigitalLifeSpineWithRuntimeCarry && authoritativeSourceTags
      ? {
          ...authoritativeDigitalLifeSpineWithRuntimeCarry,
          runtime: authoritativeDigitalLifeSpineWithRuntimeCarry.runtime
            ? {
                ...authoritativeDigitalLifeSpineWithRuntimeCarry.runtime,
                continuityPreferredTiming: alignedContinuityPreferredTiming ?? authoritativeDigitalLifeSpineWithRuntimeCarry.runtime.continuityPreferredTiming ?? null,
              }
            : authoritativeDigitalLifeSpineWithRuntimeCarry.runtime,
          memory: authoritativeDigitalLifeSpineWithRuntimeCarry.memory
            ? {
                ...authoritativeDigitalLifeSpineWithRuntimeCarry.memory,
                personStateProjection: authoritativeDigitalLifeSpineWithRuntimeCarry.memory.personStateProjection
                  ? {
                      ...authoritativeDigitalLifeSpineWithRuntimeCarry.memory.personStateProjection,
                      selfContinuityAuthority: authoritativeDigitalLifeSpineWithRuntimeCarry.memory.personStateProjection.selfContinuityAuthority
                        ? {
                            ...authoritativeDigitalLifeSpineWithRuntimeCarry.memory.personStateProjection.selfContinuityAuthority,
                            sourceTags: authoritativeSourceTags,
                          }
                        : authoritativeDigitalLifeSpineWithRuntimeCarry.memory.personStateProjection.selfContinuityAuthority,
                    }
                  : authoritativeDigitalLifeSpineWithRuntimeCarry.memory.personStateProjection,
              }
            : authoritativeDigitalLifeSpineWithRuntimeCarry.memory,
        }
      : authoritativeDigitalLifeSpineWithRuntimeCarry

    const repairedFinalDigitalLifeSpine = repairContinuitySourceTagsFromRuntimeDigest({
      digitalLifeSpine: finalDigitalLifeSpine,
      runtimeDigest: runtimeDigestWithResidentHints,
    })

    input.emitMeta(buildAlicizationChatMetaPayload({
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      governance: meta.governance,
      visibleReplyExecution: currentVisibleReplyExecution,
      embodiment: meta.embodiment,
      embodimentScript: meta.embodimentScript,
      speechTimeline: meta.speechTimeline,
      digitalLife: meta.digitalLife,
      digitalLifeSpine: repairedFinalDigitalLifeSpine,
      runtimeDigest: runtimeDigestWithResidentHints,
    }))
  }

  const resolveStructuredProjectState = (runtimeDigestProjectState: Record<string, unknown> | null | undefined) => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const preparedRuntimeProjectState = resolvePreparedRuntimeProjectState(prepared)
    const fresherPreparedRuntimeProjectState = resolveFresherPreparedRuntimeProjectState(prepared)
    const awarenessPreparedRuntimeProjectState = fresherPreparedRuntimeProjectState ?? preparedRuntimeProjectState
    const normalizedProjectState = normalizeStructuredProjectStatePayload(runtimeDigestProjectState ?? null)
    const payloadPreflightSummary = sanitizeText(payload.preDialogueSendIdentity?.summaryLine, '') || null
    const runtimePreflightSummary = sanitizeText(runtimeDigestProjectState?.preflightSummary ?? '', '') || null
    const preparedPreflightSummary = sanitizeText(
      fresherPreparedRuntimeProjectState?.preflightSummary
      ?? preparedRuntimeProjectState?.preflightSummary
      ?? '',
      '',
    ) || null
    const payloadPreDialogueAwarenessLine
      = sanitizeText(payload.preDialogueSendIdentity?.companionHeadlineLine, '')
        || sanitizeText(payload.preDialogueSendIdentity?.awarenessLine, '')
        || sanitizeText(payload.preDialogueSendIdentity?.companionBriefingLine, '')
        || null
    const runtimePreDialogueAwarenessLine = resolveProjectStateAwarenessField({
      runtimeDigestProjectState,
      preparedRuntimeProjectState: awarenessPreparedRuntimeProjectState,
      payloadFallback: payloadPreDialogueAwarenessLine,
      canonicalFallback: payloadPreflightSummary ?? canonicalProjectState.preflightSummary ?? null,
    })
    const runtimePreferredAwarenessLine = resolvePreparedVisibleReplyPreDialogueAwarenessSeed()

    const canonicalStructuredProjectState = resolveCanonicalStructuredProjectState({
      normalizedProjectState,
      runtimePreflightSummary,
      preparedPreflightSummary,
      payloadPreflightSummary,
      runtimePreferredAwarenessLine,
      runtimePreDialogueAwarenessLine,
      payloadPreDialogueAwarenessLine,
    })
    const runtimeSameHerSelfLine = sanitizeText(runtimeDigestProjectState?.sameHerSelfLine ?? '', '') || null
    const strengthenedSameHerSelfLine = strengthenSameHerSelfLineForPersistence(
      preferStrongerSameHerProjectStateText({
        current: preferStrongerSameHerProjectStateText({
          current: runtimeSameHerSelfLine,
          candidate: canonicalStructuredProjectState.sameHerSelfLine,
        }),
        candidate: canonicalProjectState.sameHerSelfLine,
      }),
    ) ?? canonicalStructuredProjectState.sameHerSelfLine ?? canonicalProjectState.sameHerSelfLine
    const resolvedSameHerDriftRisk = sanitizeText(
      runtimeDigestProjectState?.sameHerDriftRisk
      ?? awarenessPreparedRuntimeProjectState?.sameHerDriftRisk
      ?? canonicalStructuredProjectState.sameHerDriftRisk
      ?? canonicalProjectState.sameHerDriftRisk
      ?? '',
      '',
    ) || canonicalStructuredProjectState.sameHerDriftRisk || canonicalProjectState.sameHerDriftRisk
    const resolvedContinuityArcStage = sanitizeText(
      runtimeDigestProjectState?.continuityArcStage
      ?? preparedRuntimeProjectState?.continuityArcStage
      ?? '',
      '',
    ) || null
    const resolvedContinuityPreferredTiming = sanitizeText(
      runtimeDigestProjectState?.continuityPreferredTiming
      ?? preparedRuntimeProjectState?.continuityPreferredTiming
      ?? '',
      '',
    ) || null
    const resolvedPreferredBlinkCadence = sanitizeText(
      runtimeDigestProjectState?.preferredBlinkCadence
      ?? preparedRuntimeProjectState?.preferredBlinkCadence
      ?? '',
      '',
    ) || null
    const resolvedPreferredGazeMode = sanitizeText(
      runtimeDigestProjectState?.preferredGazeMode
      ?? preparedRuntimeProjectState?.preferredGazeMode
      ?? '',
      '',
    ) || null

    return {
      ...canonicalStructuredProjectState,
      preflightSummary:
        runtimePreflightSummary
        ?? preparedPreflightSummary
        ?? payloadPreflightSummary
        ?? canonicalStructuredProjectState.preflightSummary,
      sameHerSelfLine: strengthenedSameHerSelfLine,
      sameHerDriftRisk: resolvedSameHerDriftRisk,
      continuityArcStage: resolvedContinuityArcStage,
      continuityPreferredTiming: resolvedContinuityPreferredTiming,
      preferredBlinkCadence: resolvedPreferredBlinkCadence,
      preferredGazeMode: resolvedPreferredGazeMode,
    }
  }

  const resolveBackgroundPreDialogueClosure = () => {
    const preparedClosureSnapshot = buildPreparedProjectStateClosureSnapshot(prepared)
    const preparedRuntimeProjectState = resolvePreparedRuntimeProjectState(prepared)
    const preferredCompanionBriefingLine
      = rawPayloadCompanionBriefingLine
        ?? resolvePayloadExplicitCompanionBriefingLine(payload)
        ?? (sanitizeText(preparedRuntimeProjectState?.companionBriefingLine, '') || null)

    return resolveStructuredPreDialogueClosure({
      ...preparedClosureSnapshot,
      preferredCompanionBriefingLine,
    })
  }

  const resolveBackgroundPreDialogueAwareness = () => {
    const preparedRuntimeProjectState = resolvePreparedRuntimeProjectState(prepared)
    const structuredProjectState = resolveStructuredProjectState(
      preparedRuntimeProjectState && typeof preparedRuntimeProjectState === 'object'
        ? preparedRuntimeProjectState as Record<string, unknown>
        : null,
    )
    const preferredAwarenessLine
      = sanitizeText(structuredProjectState?.preDialogueAwarenessLine ?? '', '') || null
    const preferredCompanionBriefingLine
      = rawPayloadCompanionBriefingLine
        ?? resolvePayloadExplicitCompanionBriefingLine(payload)
        ?? (sanitizeText(preparedRuntimeProjectState?.companionBriefingLine, '') || null)
    const summaryLine
      = sanitizeText(payload.preDialogueSendIdentity?.summaryLine, '')
        || sanitizeText(structuredProjectState?.preflightSummary ?? '', '')
        || preferredAwarenessLine
        || null

    if (!preferredAwarenessLine && !preferredCompanionBriefingLine && !summaryLine)
      return null

    return {
      status: payload.preDialogueSendIdentity?.status ?? 'partial',
      summaryLine,
      companionBriefingLine: preferredCompanionBriefingLine,
      awarenessLine: preferredAwarenessLine,
    }
  }

  const mergeStructuredDigitalLifeSpineContinuityCarry = (
    candidateSpine: ReturnType<typeof normalizeAlicizationDigitalLifeSpineDigest> | null | undefined,
  ) => {
    const normalizedCandidateSpine = normalizeAlicizationDigitalLifeSpineDigest(candidateSpine)
    const continuityBaselineSpine = normalizeAlicizationDigitalLifeSpineDigest(
      currentStructuredDigitalLifeSpine ?? resolveCurrentDigitalLifeSpine(),
    )

    if (!normalizedCandidateSpine)
      return continuityBaselineSpine ?? null
    if (!continuityBaselineSpine)
      return normalizedCandidateSpine

    const normalizedCandidateProjection = normalizedCandidateSpine.memory?.personStateProjection as AlicizationPersonStateProjectionShape | null | undefined
    const continuityBaselineProjection = continuityBaselineSpine.memory?.personStateProjection as AlicizationPersonStateProjectionShape | null | undefined
    const normalizedCandidateAuthority = normalizedCandidateSpine.memory?.personStateProjection?.selfContinuityAuthority as AlicizationSelfContinuityAuthorityShape | null | undefined
    const continuityBaselineAuthority = continuityBaselineSpine.memory?.personStateProjection?.selfContinuityAuthority as AlicizationSelfContinuityAuthorityShape | null | undefined
    const mergedProjection = resolvePreferredPersonStateProjection({
      bundleProjection: normalizedCandidateProjection ?? null,
      runtimeProjection: continuityBaselineProjection ?? null,
    })
    const mergedAuthority = mergePreferredSelfContinuityAuthority({
      bundleAuthority: normalizedCandidateAuthority ?? null,
      runtimeAuthority: continuityBaselineAuthority ?? null,
    }) ?? resolvePreferredSelfContinuityAuthority({
      bundleAuthority: normalizedCandidateAuthority ?? null,
      runtimeAuthority: continuityBaselineAuthority ?? null,
    })
    const mergedProjectionSummary = preferContinuityRichProjectionText({
      persisted: continuityBaselineSpine.memory?.personStateProjection?.summary ?? null,
      derived: mergedProjection?.summary ?? null,
      requireProjectContinuity: true,
    }) ?? mergedProjection?.summary ?? continuityBaselineSpine.memory?.personStateProjection?.summary ?? null

    const mergedDigitalLifeSpine = normalizeAlicizationDigitalLifeSpineDigest({
      ...normalizedCandidateSpine,
      memory: {
        ...normalizedCandidateSpine.memory,
        personStateProjection: mergedProjection
          ? {
              ...mergedProjection,
              summary: mergedProjectionSummary,
              selfContinuityAuthority: mergedAuthority ?? mergedProjection.selfContinuityAuthority ?? null,
            }
          : normalizedCandidateSpine.memory?.personStateProjection ?? continuityBaselineSpine.memory?.personStateProjection ?? null,
      },
    })

    const mergedSameHerSelfLine = [
      mergedDigitalLifeSpine?.runtime?.projectState?.sameHerSelfLine,
      continuityBaselineSpine.runtime?.projectState?.sameHerSelfLine,
      normalizedCandidateSpine.runtime?.projectState?.sameHerSelfLine,
    ]
      .find(value => typeof value === 'string' && value.trim().length > 0)
      ?.trim() ?? ''
    const shouldCarryCallbackProjectContinuityTag = [
      normalizedCandidateSpine.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags,
      continuityBaselineSpine.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags,
      mergedDigitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags,
    ].some(sourceTags =>
      Array.isArray(sourceTags) && sourceTags.includes('continuity-execution-callback-project-carry'),
    )
    if (
      !mergedDigitalLifeSpine
      || !mergedSameHerSelfLine
      || !mergedDigitalLifeSpine.memory?.personStateProjection?.selfContinuityAuthority
    ) {
      return mergedDigitalLifeSpine
    }

    return normalizeAlicizationDigitalLifeSpineDigest({
      ...mergedDigitalLifeSpine,
      memory: {
        ...mergedDigitalLifeSpine.memory,
        personStateProjection: {
          ...mergedDigitalLifeSpine.memory.personStateProjection,
          selfContinuityAuthority: {
            ...mergedDigitalLifeSpine.memory.personStateProjection.selfContinuityAuthority,
            sourceTags: Array.from(new Set([
              ...(mergedDigitalLifeSpine.memory.personStateProjection.selfContinuityAuthority.sourceTags ?? []),
              'project-state-carry',
              ...(shouldCarryCallbackProjectContinuityTag ? ['continuity-execution-callback-project-carry'] : []),
            ])),
            inwardLine: mergedDigitalLifeSpine.memory.personStateProjection.selfContinuityAuthority.inwardLine
              ?? mergedSameHerSelfLine,
          },
        },
      },
    })
  }

  const backfillStructuredLifeAuthority = (inputSurface: {
    structured: Record<string, unknown> | null | undefined
    reply: string
    thought: string | null
  }) => {
    const structured = inputSurface.structured && typeof inputSurface.structured === 'object'
      ? { ...inputSurface.structured }
      : null
    if (!structured)
      return null

    const proactiveSameLineContinuation
      = sameLineMeasuredReturnPattern.test([
        inputSurface.reply,
        inputSurface.thought ?? '',
      ].join(' | '))
    const preparedRuntimeDigest = resolveCurrentRuntimeDigest()
    const preparedContinuityArcStage = sanitizeText(
      preparedRuntimeDigest?.projectState?.continuityArcStage
      ?? preparedRuntimeDigest?.currentConsciousFrame?.continuityArcStage
      ?? '',
      '',
    ) || null
    const preparedContinuityPreferredTiming = sanitizeText(
      preparedRuntimeDigest?.projectState?.continuityPreferredTiming
      ?? preparedRuntimeDigest?.currentConsciousFrame?.continuityPreferredTiming
      ?? '',
      '',
    ) || null
    const structuredDigitalLifeSpine = normalizeAlicizationDigitalLifeSpineDigest(structured.digitalLifeSpine ?? null)
    const baseSpine = mergeStructuredDigitalLifeSpineContinuityCarry(
      structuredDigitalLifeSpine ?? currentStructuredDigitalLifeSpine ?? resolveCurrentDigitalLifeSpine(),
    )
    const authoritativeSpine = baseSpine
      ? normalizeAlicizationDigitalLifeSpineDigest({
          ...baseSpine,
          runtime: {
            ...((baseSpine.runtime && typeof baseSpine.runtime === 'object')
              ? baseSpine.runtime as unknown as Record<string, unknown>
              : {}),
            continuityArcStage: proactiveSameLineContinuation
              ? 'same-thread-continuation'
              : baseSpine.runtime?.continuityArcStage
                ?? preparedContinuityArcStage
                ?? null,
            continuityPreferredTiming:
              baseSpine.runtime?.continuityPreferredTiming
              ?? preparedContinuityPreferredTiming
              ?? null,
          },
        })
      : null
    const rememberedSeamMoreRoomOpeningGuidance = resolveTurnRememberedSeamMoreRoomOpeningGuidance({
      reply: inputSurface.reply,
      thought: inputSurface.thought,
      digitalLifeSpine: authoritativeSpine,
      runtimeDigest: preparedRuntimeDigest,
    })
    const rememberedAwareAuthoritativeSpine = applyRememberedSeamMoreRoomDigitalLifePatch({
      digitalLifeSpine: authoritativeSpine,
      openingGuidance: rememberedSeamMoreRoomOpeningGuidance,
    })
    const alignedStructuredState = reconcileStructuredDigitalLifeRuntimeState(rememberedAwareAuthoritativeSpine)
    const runtimeDigest = mergePreparedRuntimeDigestCarry(alignedStructuredState.runtimeDigest)
    const runtimeDigestProjectState = runtimeDigest?.projectState && typeof runtimeDigest.projectState === 'object'
      ? runtimeDigest.projectState as unknown as Record<string, unknown>
      : null
    const existingProjectState = structured.projectState && typeof structured.projectState === 'object'
      ? structured.projectState as Record<string, unknown>
      : null
    const existingVisibleReplyRealization = structured.visibleReplyRealization && typeof structured.visibleReplyRealization === 'object'
      ? structured.visibleReplyRealization as Record<string, unknown>
      : null
    const existingProjectStateAudit = existingVisibleReplyRealization?.projectStateAudit
      && typeof existingVisibleReplyRealization.projectStateAudit === 'object'
      ? existingVisibleReplyRealization.projectStateAudit as Record<string, unknown>
      : null
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const isSyntheticProjectStateAuditOnlyShell = Boolean(
      !existingProjectState
      && !structured.runtimeDigest
      && !structured.digitalLifeSpine
      && !sanitizeText(structured.thought, '')
      && existingProjectStateAudit
      && (
        looksLikeThinProjectAwarenessShell(
          sanitizeText(existingProjectStateAudit.preDialogueAwarenessSummary ?? '', '') || null,
        )
        || looksLikeThinProjectClosureCarry({
          value: sanitizeText(existingProjectStateAudit.landedProgressSummary ?? '', '') || null,
          kind: 'landed',
        })
        || looksLikeThinProjectClosureCarry({
          value: sanitizeText(existingProjectStateAudit.openClosureSummary ?? '', '') || null,
          kind: 'open',
        })
        || looksLikeThinProjectClosureCarry({
          value: sanitizeText(existingProjectStateAudit.nextClosureTargetSummary ?? '', '') || null,
          kind: 'next',
        })
      ),
    )
    const preparedClosureSnapshot = buildPreparedProjectStateClosureSnapshot(prepared)
    const preparedRuntimeProjectState = preparedClosureSnapshot
      ? {
          preDialogueAwarenessLine: preparedClosureSnapshot.projectStatePreDialogueAwarenessLine,
          companionBriefingLine: preparedClosureSnapshot.projectStateCompanionBriefingLine,
          preDialogueAwarenessSummary: preparedClosureSnapshot.projectStatePreDialogueAwarenessSummary,
          preflightSummary: preparedClosureSnapshot.projectStatePreflightSummary,
        }
      : null
    const resolvedProjectStateBase = resolveStructuredProjectState(runtimeDigestProjectState)
    const resolvedProjectStateAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: runtimeDigestProjectState
        ? {
            preDialogueAwarenessLine: runtimeDigestProjectState.preDialogueAwarenessLine,
            awarenessLine: runtimeDigestProjectState.awarenessLine,
            companionHeadlineLine: runtimeDigestProjectState.companionHeadlineLine,
            companionBriefingLine: runtimeDigestProjectState.companionBriefingLine,
            preDialogueAwarenessSummary: runtimeDigestProjectState.preDialogueAwarenessSummary,
            preflightSummary: runtimeDigestProjectState.preflightSummary,
          }
        : null,
      fallbackProjectState: resolvedProjectStateBase
        ? {
            preDialogueAwarenessLine: resolvedProjectStateBase.preDialogueAwarenessLine,
            awarenessLine: resolvedProjectStateBase.awarenessLine,
            companionHeadlineLine: (resolvedProjectStateBase as { companionHeadlineLine?: unknown }).companionHeadlineLine,
            companionBriefingLine: (resolvedProjectStateBase as { companionBriefingLine?: unknown }).companionBriefingLine,
            preDialogueAwarenessSummary: (resolvedProjectStateBase as { preDialogueAwarenessSummary?: unknown }).preDialogueAwarenessSummary,
            preflightSummary: resolvedProjectStateBase.preflightSummary,
          }
        : preparedRuntimeProjectState,
    })
    const resolvedProjectState = resolvedProjectStateBase
      ? (() => {
          const preferredProjectStateAwarenessLine = preferStrongerSameHerHeadlineOverAwareness({
            awarenessLine: resolvedProjectStateAwarenessLine ?? resolvedProjectStateBase.preDialogueAwarenessLine ?? null,
            companionHeadlineLine: sanitizeText(
              runtimeDigestProjectState?.companionHeadlineLine
              ?? (resolvedProjectStateBase as { companionHeadlineLine?: unknown }).companionHeadlineLine
              ?? '',
              '',
            ) || null,
          })
          return {
            ...resolvedProjectStateBase,
            latestLandedProgress:
              isSyntheticProjectStateAuditOnlyShell
                ? canonicalProjectState.latestProgress
                ?? resolvedProjectStateBase.latestLandedProgress
                ?? null
                : resolvedProjectStateBase.latestLandedProgress ?? null,
            preDialogueAwarenessLine: preferredProjectStateAwarenessLine ?? resolvedProjectStateBase.preDialogueAwarenessLine ?? null,
            awarenessLine: preferredProjectStateAwarenessLine ?? resolvedProjectStateBase.awarenessLine ?? null,
            companionHeadlineLine:
              preferStrongerSameHerHeadlineOverAwareness({
                awarenessLine: preferredProjectStateAwarenessLine ?? null,
                companionHeadlineLine: sanitizeText(
                  runtimeDigestProjectState?.companionHeadlineLine
                  ?? (resolvedProjectStateBase as { companionHeadlineLine?: unknown }).companionHeadlineLine
                  ?? '',
                  '',
                ) || null,
              })
              ?? (resolvedProjectStateBase as { companionHeadlineLine?: unknown }).companionHeadlineLine
              ?? null,
          }
        })()
      : resolvedProjectStateBase
    const existingPreDialogueAwareness = structured.preDialogueAwareness && typeof structured.preDialogueAwareness === 'object'
      ? structured.preDialogueAwareness as Record<string, unknown>
      : null
    const canonicalAwarenessLine = sanitizeText(resolvedProjectState?.preDialogueAwarenessLine ?? '', '') || null
    const existingAwarenessLine = sanitizeText(existingPreDialogueAwareness?.awarenessLine ?? '', '') || null
    const resolvedBackgroundPreDialogueAwareness = resolveBackgroundPreDialogueAwareness()
    const exactPayloadProjectAwarenessLine = resolveVerbatimPayloadProjectAwarenessLine()
    const preferredRefreshedAwarenessLine = exactPayloadProjectAwarenessLine ?? (
      canonicalAwarenessLine
        ? preferProjectAwareClosureSummary({
          current: preferExplicitProjectAwarenessOverCanonicalReanchor({
            current: canonicalAwarenessLine,
            candidate:
              sanitizeText((resolvedBackgroundPreDialogueAwareness as { awarenessLine?: unknown } | null)?.awarenessLine, '')
              || sanitizeText(existingPreDialogueAwareness?.awarenessLine ?? '', '')
              || sanitizeText((resolvedBackgroundPreDialogueAwareness as { summaryLine?: unknown } | null)?.summaryLine, '')
              || sanitizeText(existingPreDialogueAwareness?.summaryLine ?? '', '')
              || null,
          }),
          candidate:
            sanitizeText((resolvedBackgroundPreDialogueAwareness as { summaryLine?: unknown } | null)?.summaryLine, '')
            || sanitizeText(existingPreDialogueAwareness?.summaryLine ?? '', '')
            || null,
        }) || canonicalAwarenessLine
        : null
    )
    const preferredRefreshedCompanionBriefingLine
      = exactPayloadProjectAwarenessLine
        || sanitizeText((resolvedBackgroundPreDialogueAwareness as { companionBriefingLine?: unknown } | null)?.companionBriefingLine, '')
        || sanitizeText(existingPreDialogueAwareness?.companionBriefingLine ?? '', '')
        || rawPayloadCompanionBriefingLine
        || resolvePayloadExplicitCompanionBriefingLine(payload)
        || null
    const refreshedPreDialogueAwareness = preferredRefreshedAwarenessLine && (
      !existingAwarenessLine
      || existingAwarenessLine !== preferredRefreshedAwarenessLine
      || (
        !sanitizeText(existingPreDialogueAwareness?.companionBriefingLine ?? '', '')
        && Boolean(preferredRefreshedCompanionBriefingLine)
      )
      || /keep the same digital life project in view|same digital life \| keep the closure seam explicit/iu.test(existingAwarenessLine)
    )
      ? {
          ...resolvedBackgroundPreDialogueAwareness,
          ...existingPreDialogueAwareness,
          awarenessLine: preferredRefreshedAwarenessLine,
          summaryLine: exactPayloadProjectAwarenessLine
            || preferProjectAwareClosureSummary({
              current: preferredRefreshedAwarenessLine,
              candidate:
                sanitizeText((resolvedBackgroundPreDialogueAwareness as { summaryLine?: unknown } | null)?.summaryLine, '')
                || sanitizeText(existingPreDialogueAwareness?.summaryLine ?? '', '')
                || null,
            })
            || preferredRefreshedAwarenessLine,
          companionBriefingLine: preferredRefreshedCompanionBriefingLine,
        }
      : null
    const existingPerformance = structured.performance && typeof structured.performance === 'object'
      ? structured.performance as Record<string, unknown>
      : null
    const authoritativePerformance = currentStructuredPerformance && typeof currentStructuredPerformance === 'object'
      ? currentStructuredPerformance as unknown as Record<string, unknown>
      : null
    const refreshedPerformance = authoritativePerformance
      ? {
          ...existingPerformance,
          ...authoritativePerformance,
          baseEmotion: sanitizeText(authoritativePerformance.baseEmotion, '')
            || sanitizeText(existingPerformance?.baseEmotion ?? '', '')
            || 'thinking',
          facialCue: sanitizeText(authoritativePerformance.facialCue, '')
            || sanitizeText(existingPerformance?.facialCue ?? '', '')
            || null,
          actionCue: sanitizeText(authoritativePerformance.actionCue, '')
            || sanitizeText(existingPerformance?.actionCue ?? '', '')
            || null,
          delivery: sanitizeText(authoritativePerformance.delivery, '')
            || sanitizeText(existingPerformance?.delivery ?? '', '')
            || 'calm',
          emphasis:
            typeof authoritativePerformance.emphasis === 'number'
              ? authoritativePerformance.emphasis
              : typeof existingPerformance?.emphasis === 'number'
                ? existingPerformance.emphasis
                : 0,
        }
      : null
    const existingPreDialogueClosure = structured.preDialogueClosure && typeof structured.preDialogueClosure === 'object'
      ? structured.preDialogueClosure as Record<string, unknown>
      : null
    const resolvedBackgroundPreDialogueClosure = resolveBackgroundPreDialogueClosure()
    const existingClosureSummaryLine = sanitizeText(existingPreDialogueClosure?.summaryLine ?? '', '') || null
    const preferredClosureSummaryLine = exactPayloadProjectAwarenessLine || preferProjectAwareClosureSummary({
      current: sanitizeText(
        refreshedPreDialogueAwareness?.summaryLine
        ?? refreshedPreDialogueAwareness?.awarenessLine
        ?? canonicalAwarenessLine
        ?? '',
        '',
      ) || null,
      candidate: sanitizeText(
        (resolvedBackgroundPreDialogueClosure as { summaryLine?: unknown } | null)?.summaryLine
        ?? existingPreDialogueClosure?.summaryLine
        ?? '',
        '',
      ) || null,
    })
    const refreshedPreDialogueClosure = (
      preferredClosureSummaryLine
      && (
        !existingClosureSummaryLine
        || existingClosureSummaryLine !== preferredClosureSummaryLine
        || /keep the same digital life project in view|same digital life \| keep the closure seam explicit/iu.test(existingClosureSummaryLine)
      )
    )
      ? {
          ...resolvedBackgroundPreDialogueClosure,
          ...existingPreDialogueClosure,
          summaryLine: preferredClosureSummaryLine,
          companionBriefingLine:
            exactPayloadProjectAwarenessLine
            || sanitizeText((resolvedBackgroundPreDialogueClosure as { companionBriefingLine?: unknown } | null)?.companionBriefingLine, '')
            || sanitizeText(existingPreDialogueClosure?.companionBriefingLine ?? '', '')
            || sanitizeText(refreshedPreDialogueAwareness?.companionBriefingLine ?? '', '')
            || null,
        }
      : null

    return {
      ...structured,
      ...(refreshedPerformance ? { performance: refreshedPerformance } : {}),
      projectState: resolvedProjectState,
      preDialogueAwareness: refreshedPreDialogueAwareness ?? structured.preDialogueAwareness ?? resolvedBackgroundPreDialogueAwareness,
      preDialogueClosure: refreshedPreDialogueClosure ?? structured.preDialogueClosure ?? resolvedBackgroundPreDialogueClosure,
      visibleReplyRealization: structured.visibleReplyRealization ?? null,
      digitalLifeSpine: alignedStructuredState.digitalLifeSpine ?? rememberedAwareAuthoritativeSpine ?? authoritativeSpine ?? structured.digitalLifeSpine ?? null,
      runtimeDigest: runtimeDigest ?? structured.runtimeDigest ?? null,
    }
  }

  const enrichStructuredFullTextWithLifeAuthority = (inputSurface: {
    fullText: string
    reply?: string | null
    thought?: string | null
  }) => {
    const parsed = parseJsonObjectFromText(inputSurface.fullText)
    if (!parsed)
      return inputSurface.fullText
    const enriched = backfillStructuredLifeAuthority({
      structured: parsed,
      reply: typeof inputSurface.reply === 'string'
        ? inputSurface.reply
        : deriveAlicizationVisibleReplyText(inputSurface.fullText).trim(),
      thought: typeof inputSurface.thought === 'string'
        ? inputSurface.thought
        : (typeof parsed.thought === 'string' ? parsed.thought : null),
    })
    return enriched ? JSON.stringify(enriched) : inputSurface.fullText
  }

  const promoteRehydratedStructuredAuthority = (inputSurface: {
    fullText: string
  }) => {
    const parsed = parseJsonObjectFromText(inputSurface.fullText)
    if (!parsed)
      return

    if (!currentStructuredPerformance) {
      const parsedPerformance = resolveStructuredPerformancePayload(parsed.performance)
      if (parsedPerformance)
        currentStructuredPerformance = parsedPerformance
    }

    if (!currentStructuredThought && typeof parsed.thought === 'string')
      currentStructuredThought = parsed.thought

    if (!currentStructuredDigitalLifeSpine) {
      const parsedDigitalLifeSpine = normalizeAlicizationDigitalLifeSpineDigest(parsed.digitalLifeSpine ?? null)
      if (parsedDigitalLifeSpine)
        currentStructuredDigitalLifeSpine = reconcileStructuredDigitalLifeRuntimeState(parsedDigitalLifeSpine).digitalLifeSpine
    }
  }

  const buildStructuredStreamFinishFallback = (inputSurface: {
    fullText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
  }) => {
    if (!prepared)
      return null

    const visibleReplyText = deriveAlicizationVisibleReplyText(inputSurface.fullText).trim()
    if (!visibleReplyText)
      return null

    const residentPerformance = resolveResidentPerformanceFromPrepared()
    const authoritativeDigitalLifeSpine = resolveCurrentDigitalLifeSpine()
    const authoritativeRuntimeDigest = resolveCurrentRuntimeDigest()
    const preparedReplyExecutionPlan = prepared.replyExecutionPlan && typeof prepared.replyExecutionPlan === 'object'
      ? prepared.replyExecutionPlan as unknown as Record<string, unknown>
      : null
    const runtimeReplyExecutionPlan = prepared.runtimeSurface?.replyExecutionPlan && typeof prepared.runtimeSurface.replyExecutionPlan === 'object'
      ? prepared.runtimeSurface.replyExecutionPlan as unknown as Record<string, unknown>
      : null
    const preparedReplyExecutionPerformance = (
      preparedReplyExecutionPlan?.performance && typeof preparedReplyExecutionPlan.performance === 'object'
        ? preparedReplyExecutionPlan.performance as Record<string, unknown>
        : null
    ) ?? (
      runtimeReplyExecutionPlan?.performance && typeof runtimeReplyExecutionPlan.performance === 'object'
        ? runtimeReplyExecutionPlan.performance as Record<string, unknown>
        : null
    )
    const preparedResidentPerformance = residentPerformance?.performance
      && typeof residentPerformance.performance === 'object'
      ? residentPerformance.performance as unknown as Record<string, unknown>
      : null
    const fallbackExplicitPerformanceFromMeta = (() => {
      if (!authoritativeDigitalLifeSpine)
        return null

      try {
        const meta = buildAlicizationChatStreamEmbodimentMeta({
          governance: resolveAuthoritativeGovernance(),
          digitalLifeSpine: authoritativeDigitalLifeSpine as any,
          affectiveResidue: authoritativeRuntimeDigest?.affectiveResidue
            ?? authoritativeRuntimeDigest?.derivedMindStateBundle?.affectiveResidue
            ?? null,
          currentConsciousFrame: resolveEmbodimentMetaCurrentConsciousFrameInput(authoritativeRuntimeDigest?.currentConsciousFrame),
          performanceManifest: prepared.performanceManifest ?? null,
          residentPerformance,
          explicitPerformance: currentStructuredPerformance ?? null,
          reply: visibleReplyText,
          thought: currentStructuredThought ?? undefined,
          turnId: input.payload.turnId,
        })
        const explicitPerformance = meta.digitalLife?.performance
        return explicitPerformance && typeof explicitPerformance === 'object'
          ? explicitPerformance as unknown as Record<string, unknown>
          : null
      }
      catch {
        return null
      }
    })()
    const fallbackPerformance = (() => {
      const preferredSource = preparedReplyExecutionPerformance
        ?? fallbackExplicitPerformanceFromMeta
        ?? preparedResidentPerformance
        ?? null
      if (!preferredSource)
        return currentStructuredPerformance ?? residentPerformance?.performance ?? undefined

      return {
        baseEmotion: sanitizeText(preferredSource.baseEmotion, '')
          || currentStructuredPerformance?.baseEmotion
          || sanitizeText(fallbackExplicitPerformanceFromMeta?.baseEmotion, '')
          || sanitizeText(preparedResidentPerformance?.baseEmotion, '')
          || 'thinking',
        facialCue: sanitizeText(preferredSource.facialCue, '')
          || currentStructuredPerformance?.facialCue
          || sanitizeText(fallbackExplicitPerformanceFromMeta?.facialCue, '')
          || sanitizeText(preparedResidentPerformance?.facialCue, '')
          || null,
        actionCue: sanitizeText(preferredSource.actionCue, '')
          || currentStructuredPerformance?.actionCue
          || sanitizeText(fallbackExplicitPerformanceFromMeta?.actionCue, '')
          || sanitizeText(preparedResidentPerformance?.actionCue, '')
          || null,
        delivery: sanitizeText(preferredSource.delivery, '')
          || currentStructuredPerformance?.delivery
          || sanitizeText(fallbackExplicitPerformanceFromMeta?.delivery, '')
          || sanitizeText(preparedResidentPerformance?.delivery, '')
          || 'calm',
        emphasis:
          typeof preferredSource.emphasis === 'number'
            ? preferredSource.emphasis
            : typeof currentStructuredPerformance?.emphasis === 'number'
              ? currentStructuredPerformance.emphasis
              : typeof fallbackExplicitPerformanceFromMeta?.emphasis === 'number'
                ? fallbackExplicitPerformanceFromMeta.emphasis
                : typeof preparedResidentPerformance?.emphasis === 'number'
                  ? preparedResidentPerformance.emphasis
                  : 0,
      }
    })()
    const sessionId = sanitizeText(prepared.conversationSessionId, '')
    const normalized = sessionId
      ? normalizeDialogueRespondedPayload({
          sessionId,
          turnId: input.payload.turnId,
          assistantText: visibleReplyText,
          origin: 'user-turn',
          structured: {
            format: 'mind-turn-v1',
            parsePath: 'repair-json',
            contractFailed: false,
            governance: resolveAuthoritativeGovernance(),
            thought: currentStructuredThought ?? '',
            reply: visibleReplyText,
            performance: fallbackPerformance,
            digitalLifeSpine: authoritativeDigitalLifeSpine ?? undefined,
            visibleReplyAuthority: inputSurface.visibleReplyExecution.actualVisibleReplyAuthority === 'llm-mind'
              ? 'llm-mind'
              : 'llm-second-pass-rewrite',
          },
        }, prepared.performanceManifest, {
          residentPerformance,
          currentConsciousFrame: resolveEmbodimentMetaCurrentConsciousFrameInput(authoritativeRuntimeDigest?.currentConsciousFrame),
        })
      : null
    const rawStructured = normalized?.structured && typeof normalized.structured === 'object'
      ? normalized.structured as unknown as Record<string, unknown>
      : {
        format: 'mind-turn-v1',
        thought: currentStructuredThought ?? '',
        emotion: 'thinking',
        reply: visibleReplyText,
        performance: fallbackPerformance,
        visibleReplyAuthority: inputSurface.visibleReplyExecution.actualVisibleReplyAuthority === 'llm-mind'
          ? 'llm-mind'
          : 'llm-second-pass-rewrite',
      } satisfies Record<string, unknown>
    const rawDigitalLifeSpine = rawStructured.digitalLifeSpine && typeof rawStructured.digitalLifeSpine === 'object'
      ? rawStructured.digitalLifeSpine as Record<string, unknown>
      : {}
    const rawStructuredDigitalLifeSpine = normalizeAlicizationDigitalLifeSpineDigest(rawStructured.digitalLifeSpine ?? null)
    const fallbackPreparedSpineDigest = mergeStructuredDigitalLifeSpineContinuityCarry(
      rawStructuredDigitalLifeSpine ?? resolvePreparedDigitalLifeSpineDigest(),
    )
    const proactiveSameLineContinuation
      = sameLineMeasuredReturnPattern.test([
        visibleReplyText,
        currentStructuredThought ?? '',
      ].join(' | '))
    const fallbackStructuredDigitalLifeSpine = fallbackPreparedSpineDigest
      ? normalizeAlicizationDigitalLifeSpineDigest({
          ...fallbackPreparedSpineDigest,
          runtime: {
            ...((fallbackPreparedSpineDigest.runtime && typeof fallbackPreparedSpineDigest.runtime === 'object')
              ? fallbackPreparedSpineDigest.runtime as unknown as Record<string, unknown>
              : {}),
            continuityArcStage: proactiveSameLineContinuation
              ? 'same-thread-continuation'
              : fallbackPreparedSpineDigest.runtime?.continuityArcStage ?? null,
          },
        })
      : normalizeAlicizationDigitalLifeSpineDigest(
          proactiveSameLineContinuation
            ? {
                ...rawDigitalLifeSpine,
                runtime: {
                  ...((rawDigitalLifeSpine.runtime && typeof rawDigitalLifeSpine.runtime === 'object')
                    ? rawDigitalLifeSpine.runtime as Record<string, unknown>
                    : {}),
                  continuityArcStage: 'same-thread-continuation',
                },
              }
            : rawStructured.digitalLifeSpine,
        )
    const alignedFallbackStructuredState = reconcileStructuredDigitalLifeRuntimeState(fallbackStructuredDigitalLifeSpine)
    const fallbackRuntimeDigest = mergePreparedRuntimeDigestCarry(alignedFallbackStructuredState.runtimeDigest)
    const finalStructured = {
      ...rawStructured,
      performance: fallbackPerformance ?? rawStructured.performance ?? null,
      projectState: resolveStructuredProjectState(
        fallbackRuntimeDigest?.projectState && typeof fallbackRuntimeDigest.projectState === 'object'
          ? fallbackRuntimeDigest.projectState as unknown as Record<string, unknown>
          : null,
      ),
      preDialogueClosure: rawStructured.preDialogueClosure ?? resolveBackgroundPreDialogueClosure(),
      digitalLifeSpine: alignedFallbackStructuredState.digitalLifeSpine ?? fallbackStructuredDigitalLifeSpine ?? rawStructured.digitalLifeSpine,
      runtimeDigest: fallbackRuntimeDigest ?? rawStructured.runtimeDigest ?? null,
    }

    return JSON.stringify(finalStructured)
  }

  const needsStructuredStreamFinishRehydration = (parsed: Record<string, unknown> | null | undefined) => {
    if (!parsed)
      return true

    const structuredReply = typeof parsed.reply === 'string'
      ? sanitizeText(parsed.reply, '')
      : ''
    const structuredThought = typeof parsed.thought === 'string'
      ? sanitizeText(parsed.thought, '')
      : ''
    const structuredPerformance = parsed.performance && typeof parsed.performance === 'object'
      ? parsed.performance as Record<string, unknown>
      : null
    const structuredProjectState = parsed.projectState && typeof parsed.projectState === 'object'
      ? parsed.projectState as Record<string, unknown>
      : null
    const structuredDigitalLifeSpine = parsed.digitalLifeSpine && typeof parsed.digitalLifeSpine === 'object'
      ? parsed.digitalLifeSpine as Record<string, unknown>
      : null
    const structuredRuntimeDigest = parsed.runtimeDigest && typeof parsed.runtimeDigest === 'object'
      ? parsed.runtimeDigest as Record<string, unknown>
      : null
    const structuredProjectStateIdentity = sanitizeText(structuredProjectState?.identity, '')
    const structuredProjectStateSameHerSelfLine = sanitizeText(structuredProjectState?.sameHerSelfLine, '')
    const structuredPerformanceActionCue = sanitizeText(structuredPerformance?.actionCue, '')

    return !structuredReply
      && !structuredThought
      && !structuredPerformanceActionCue
      && !structuredProjectStateIdentity
      && !structuredProjectStateSameHerSelfLine
      && !structuredDigitalLifeSpine
      && !structuredRuntimeDigest
  }

  const ensureStructuredRecoveredText = (inputSurface: {
    fullText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
  }) => {
    const parsed = parseJsonObjectFromText(inputSurface.fullText)
    if (parsed && !needsStructuredStreamFinishRehydration(parsed))
      return inputSurface.fullText
    const recovered = enrichStructuredFullTextWithLifeAuthority({
      fullText: buildStructuredStreamFinishFallback(inputSurface) ?? inputSurface.fullText,
    })
    promoteRehydratedStructuredAuthority({
      fullText: recovered,
    })
    return recovered
  }

  const shouldForceStructuredRecoveredText = (mode: AlicizationMainChatTimeoutRecoveryMode) => {
    return mode === 'tools-disabled' || mode === 'minimal-context-non-streaming'
  }

  const shouldAttemptRecoveredReplySecondPass = (inputSurface: {
    fullText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
  }) => {
    if (!inputSurface.visibleReplyExecution.providerMindExecuted)
      return false

    const parsed = parseJsonObjectFromText(inputSurface.fullText)
    if (!parsed)
      return false

    const reply = typeof parsed.reply === 'string'
      ? parsed.reply.trim()
      : ''
    if (!reply)
      return false

    const visibleReplyRewriteRequest = parsed.visibleReplyRewriteRequest
      && typeof parsed.visibleReplyRewriteRequest === 'object'
      ? parsed.visibleReplyRewriteRequest as { required?: unknown }
      : null
    if (visibleReplyRewriteRequest?.required === true)
      return true

    const parsePath = typeof parsed.parsePath === 'string'
      ? parsed.parsePath.trim()
      : ''
    if (parsePath === 'repair-json' || parsePath === 'forced-unstructured-visible-draft')
      return false

    return typeof parsed.format === 'string' && parsed.format.trim() === 'mind-turn-v1'
  }

  const noteInlineExecutionReceipt = (result: unknown) => {
    const receipt = readAlicizationInlineExecutionReceipt(result)
    if (!receipt)
      return
    inlineExecutionReceipts.set(
      `${receipt.sessionId}::${receipt.threadId}::${receipt.completedAt}`,
      receipt,
    )
  }

  const emitVisibleChunk = (text: string) => {
    if (!text)
      return
    releasedVisibleReplyText += text
    input.emitChunk({
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      text,
    })
  }

  const emitToolCall = (event: AlicizationChatToolCallEvent) => {
    const toolName = sanitizeText(event.toolName, '')
    const toolCallId = sanitizeText(event.toolCallId, '')
    if (toolName && toolCallId && alicizationExecutorToolNames.has(toolName))
      executorToolCallIds.add(toolCallId)
    input.emitToolCall(event)
  }

  const emitToolResult = (event: AlicizationChatToolResultEvent) => {
    const toolCallId = sanitizeText(event.toolCallId, '')
    if (toolCallId && executorToolCallIds.has(toolCallId))
      noteInlineExecutionReceipt(event.result)
    input.emitToolResult(event)
  }

  const suppressInlineExecutionDeliveries = async () => {
    if (inlineExecutionReceipts.size === 0 || !input.suppressInlineExecutionDeliveries)
      return

    const entries = [...inlineExecutionReceipts.values()]
    inlineExecutionReceipts.clear()
    await Promise.resolve(input.suppressInlineExecutionDeliveries({
      cardId: input.payload.cardId,
      entries,
    }))
  }

  const suppressFreshExecutionReplyDeliveryIfNeeded = async () => {
    if (!input.suppressInlineExecutionDeliveries)
      return

    const obligation = prepared?.executionReplyObligation
    const callback = prepared?.freshExecutionReplyCallback
    if (obligation?.source !== 'fresh-callback' || !callback?.sessionId)
      return

    if (!callback.threadId)
      return

    const suppressionKey = `${callback.sessionId}::${callback.threadId}`
    if (suppressedFreshExecutionReplyKeys.has(suppressionKey))
      return
    suppressedFreshExecutionReplyKeys.add(suppressionKey)

    await Promise.resolve(input.suppressInlineExecutionDeliveries({
      cardId: input.payload.cardId,
      entries: [{
        sessionId: callback.sessionId,
        threadId: callback.threadId,
        completedAt: callback.createdAt,
      }],
    }))
  }

  let activeDialogueCompactTimeoutRecoveryContext = false

  const withActiveDialogueCompactTimeoutRecoveryContext = <T>(
    enabled: boolean,
    run: () => T,
  ) => {
    if (!enabled)
      return run()

    const previous = activeDialogueCompactTimeoutRecoveryContext
    activeDialogueCompactTimeoutRecoveryContext = true
    try {
      return run()
    }
    finally {
      activeDialogueCompactTimeoutRecoveryContext = previous
    }
  }

  const rebuildPreparedTurnGraph = (nextPrepared: AlicizationPreparedMainChatExecutionResult, surface: ReturnType<typeof buildAlicizationVisibleReplyRealizationArtifact> | AlicizationResolvedVisibleReply['realization'] | null) => {
    return buildAlicizationTurnGraphFromSettlements({
      prepared: nextPrepared,
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      actionObligation: nextPrepared.runtimeSurface?.action ?? null,
      memory: nextPrepared.memoryTurnArtifact ?? null,
      surface,
      routingRequired: nextPrepared.runtimeSurface?.tooling?.routingRequired ?? false,
      stageSettlements: nextPrepared.turnRuntimeContext?.stageSettlements ?? nextPrepared.turnGraph?.stageSettlements ?? [],
      activeSelfRevision: {
        patchId: nextPrepared.turnRuntimeContext?.selfRevisionConsumption.activePatchId ?? null,
        decisionTraceId: nextPrepared.turnRuntimeContext?.selfRevisionConsumption.activePatchDecisionTraceId ?? null,
        candidateId: nextPrepared.turnRuntimeContext?.selfRevisionConsumption.activeCandidateId ?? null,
      },
    })
  }

  const rememberResolvedVisibleReply = (reply: AlicizationResolvedVisibleReply) => {
    latestResolvedVisibleReply = reply
    currentVisibleReplyExecution = reply.visibleReplyExecution
  }

  const emitResolvedVisibleReply = async (reply: AlicizationResolvedVisibleReply) => {
    rememberResolvedVisibleReply(reply)
    if (prepared) {
      const nextPrepared = {
        ...prepared,
      }
      prepared = {
        ...nextPrepared,
        turnGraph: rebuildPreparedTurnGraph(nextPrepared, reply.realization),
      }
      try {
        await Promise.resolve(input.recordPreparedMindTrace?.({
          payload,
          prepared,
          preDialogueAwarenessDebug: preDialogueAwarenessDebug ?? undefined,
        }))
      }
      catch (error) {
        await input.appendRuntimeDebugLine('chat-stream.resolved-visible-reply-mind-trace-failed', {
          cardId: payload.cardId,
          turnId: payload.turnId,
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    }
    if (!reply.visibleText)
      return
    emitStreamEmbodimentMeta(reply.visibleText)
    emitFinalAuthoritativeMeta({
      reply: reply.visibleText,
      thought: currentStructuredThought,
      performance: currentStructuredPerformance,
      digitalLifeSpine: currentStructuredDigitalLifeSpine,
    })
    emitVisibleChunk(reply.visibleText)
  }

  const buildHostVisibleResolvedReply = (reply: AlicizationResolvedVisibleReply): AlicizationResolvedVisibleReply => {
    const parsed = parseJsonObjectFromText(reply.fullText)
    if (!parsed)
      return reply

    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const rawPayloadProjectStatePreflightSummary = sanitizeText(
      input.payload.preDialogueSendIdentity?.summaryLine ?? '',
      '',
    ) || null
    const preparedRuntimeProjectState = resolveFresherPreparedRuntimeProjectState(prepared)
    const preparedMindTurnProjectState = prepared?.mindTurnContract?.projectState
      && typeof prepared.mindTurnContract.projectState === 'object'
      ? prepared.mindTurnContract.projectState as Record<string, unknown>
      : null
    const preparedSameHerHoldDetail = resolvePreferredSameHerHoldDetail({
      current: sanitizeText(preparedRuntimeProjectState?.sameHerHoldDetail ?? '', ''),
      candidate: sanitizeText(preparedMindTurnProjectState?.sameHerHoldDetail ?? '', ''),
      continuityCue:
        sanitizeText(preparedRuntimeProjectState?.continuityCue ?? '', '')
        || sanitizeText((preparedMindTurnProjectState as { continuityCue?: unknown } | null)?.continuityCue, '')
        || null,
    })
    const preparedRuntimeClosureSummary = preferRicherProjectStateAuditText({
      current: sanitizeText(preparedRuntimeProjectState?.emotionalClosureSummary ?? '', ''),
      candidate: sanitizeText(preparedRuntimeProjectState?.emotionalClosureCue ?? '', ''),
    })
    const preparedMindTurnClosureSummary = preferRicherProjectStateAuditText({
      current: sanitizeText(prepared?.mindTurnContract?.emotionalClosureSummary ?? '', ''),
      candidate: sanitizeText(prepared?.mindTurnContract?.emotionalClosureCue ?? '', ''),
    })
    const preparedProjectStateSeed = {
      identity: canonicalProjectState.identity,
      currentPhase: canonicalProjectState.currentPhase,
      latestLandedProgress: preparedRuntimeProjectState?.latestLandedProgress
        ?? canonicalProjectState.continuityProgressSummary
        ?? null,
      primaryOpenLoop: preparedRuntimeProjectState?.primaryOpenLoop
        ?? canonicalProjectState.openLoops?.[0]
        ?? null,
      nextClosureTarget: canonicalProjectState.nextClosureTarget,
      proactiveSameHerGap: preparedRuntimeProjectState?.proactiveSameHerGap
        ?? canonicalProjectState.proactiveSameHerGap
        ?? null,
      sameHerSelfLine: preparedRuntimeProjectState?.sameHerSelfLine
        ?? canonicalProjectState.sameHerSelfLine,
    } satisfies Record<string, string | null>
    const preparedProjectStateAuditSeed = {
      sameHerSummary: preparedProjectStateSeed.sameHerSelfLine,
      sameHerHoldDetail: preparedSameHerHoldDetail,
      continuityArcStage: preparedRuntimeProjectState?.continuityArcStage
        ?? null,
      continuityCue: preparedRuntimeProjectState?.continuityCue
        ?? null,
      currentPhaseSummary: preparedProjectStateSeed.currentPhase,
      landedProgressSummary: preparedProjectStateSeed.latestLandedProgress,
      openClosureSummary: preparedProjectStateSeed.primaryOpenLoop,
      nextClosureTargetSummary: preparedProjectStateSeed.nextClosureTarget,
      sameHerDriftRiskSummary: preparedRuntimeProjectState?.sameHerDriftRisk
        ?? canonicalProjectState.sameHerDriftRisk
        ?? null,
      proactiveSameHerGapSummary: preparedProjectStateSeed.proactiveSameHerGap,
      emotionalClosureSummary:
        preferRicherProjectStateAuditText({
          current: preparedRuntimeClosureSummary,
          candidate: preparedMindTurnClosureSummary,
        })
        ?? canonicalProjectState.emotionalClosureSummary
        ?? canonicalProjectState.emotionalClosureCue
        ?? null,
      preDialogueAwarenessSummary: resolvePreparedVisibleReplyPreDialogueAwarenessSeed(),
      continuitySummary: buildProjectStateAuditContinuitySummary({
        sameHerSummary: preparedProjectStateSeed.sameHerSelfLine,
        sameHerHoldDetail: preparedSameHerHoldDetail,
        continuityArcStage: preparedRuntimeProjectState?.continuityArcStage
          ?? null,
        continuityCue: preparedRuntimeProjectState?.continuityCue
          ?? null,
        sameHerDriftRiskSummary: preparedRuntimeProjectState?.sameHerDriftRisk
          ?? canonicalProjectState.sameHerDriftRisk
          ?? null,
        currentPhaseSummary: preparedProjectStateSeed.currentPhase,
        landedProgressSummary: preparedProjectStateSeed.latestLandedProgress,
        openClosureSummary: preparedProjectStateSeed.primaryOpenLoop,
        nextClosureTargetSummary: preparedProjectStateSeed.nextClosureTarget,
        proactiveSameHerGapSummary: preparedProjectStateSeed.proactiveSameHerGap,
        emotionalClosureSummary:
          preferRicherProjectStateAuditText({
            current: preparedRuntimeClosureSummary,
            candidate: preparedMindTurnClosureSummary,
          })
          ?? canonicalProjectState.emotionalClosureSummary
          ?? canonicalProjectState.emotionalClosureCue
          ?? null,
        embodimentClosureSummary: null,
      }),
    } satisfies Record<string, string | null>
    const preparedRuntimePreferredAwarenessLine = resolvePreparedVisibleReplyPreDialogueAwarenessSeed()
    const preparedRuntimeExplicitCompanionHeadlineLine = resolveRawPreparedRuntimeExplicitCompanionHeadlineLine(prepared)
    const preparedRuntimeCompanionHeadlineLine = sanitizeText(
      preparedRuntimeProjectState?.companionHeadlineLine
      ?? preparedRuntimeProjectState?.preDialogueAwarenessLine
      ?? '',
      '',
    ) || null
    const topLevelProjectStateAudit = parsed.projectStateAudit && typeof parsed.projectStateAudit === 'object'
      ? parsed.projectStateAudit as AlicizationBackgroundProjectStateAudit
      : null
    const existingVisibleReplyRealization = parsed.visibleReplyRealization && typeof parsed.visibleReplyRealization === 'object'
      ? parsed.visibleReplyRealization as Record<string, unknown>
      : null
    const existingVisibleReplyProjectStateAudit = existingVisibleReplyRealization?.projectStateAudit
      && typeof existingVisibleReplyRealization.projectStateAudit === 'object'
      ? existingVisibleReplyRealization.projectStateAudit as AlicizationBackgroundProjectStateAudit
      : null
    const existingVisibleReplySelfAuthorityAudit = existingVisibleReplyRealization?.selfAuthorityAudit
      && typeof existingVisibleReplyRealization.selfAuthorityAudit === 'object'
      ? existingVisibleReplyRealization.selfAuthorityAudit as Record<string, unknown>
      : null
    const existingProjectStateAudit = topLevelProjectStateAudit || existingVisibleReplyProjectStateAudit
      ? {
          ...topLevelProjectStateAudit,
          ...existingVisibleReplyProjectStateAudit,
        } as AlicizationBackgroundProjectStateAudit
      : null
    const replyProjectStateAudit = reply.realization.projectStateAudit as AlicizationBackgroundProjectStateAudit | null | undefined
    const payloadAwarenessLine = rawPayloadAwarenessLine
      || sanitizeText(payload.preDialogueSendIdentity?.awarenessLine, '')
      || null
    const payloadCompanionBriefingLine = rawPayloadCompanionBriefingLine
      || sanitizeText(payload.preDialogueSendIdentity?.companionBriefingLine, '')
      || null
    const payloadCompanionHeadlineLine = rawPayloadCompanionHeadlineLine
      || sanitizeText(payload.preDialogueSendIdentity?.companionHeadlineLine, '')
      || null
    const isActiveDialogueCompactTimeoutRecovery
      = activeDialogueCompactTimeoutRecoveryContext
        || /active-dialogue-compact/u.test(reply.visibleReplyExecution.reason ?? '')
    const payloadPreferredPreDialogueAwarenessSummary
      = isActiveDialogueCompactTimeoutRecovery
        ? rawPayloadPreferredPreDialogueAwarenessSummary
        ?? resolvePayloadPreferredPreDialogueAwarenessCarry(payload)
        : rawPayloadPreferredPreDialogueAwarenessSummary
          ?? resolvePayloadPreDialogueAwarenessSummary(payload)
    const mergedProjectStateEmbodimentClosureSummary = resolvePreferredEmbodimentClosureSummary(
      existingProjectStateAudit?.embodimentClosureSummary,
      replyProjectStateAudit?.embodimentClosureSummary,
    )
    const resolvedReplyProjectState = (reply.realization as {
      projectState?: Record<string, unknown> | null
    }).projectState ?? null
    const resolvedStructuredPreDialogueAwarenessSummary = resolveStructuredPreDialogueAwarenessSummary(
      parseJsonObjectFromText(reply.fullText),
    )
    const payloadAwareReplyProjectAwarenessSummary = preferCompactRecoveryPayloadHeadlineOverFallback({
      awarenessLine:
        replyProjectStateAudit?.preDialogueAwarenessSummary
        ?? resolvedStructuredPreDialogueAwarenessSummary
        ?? sanitizeText(existingProjectStateAudit?.preDialogueAwarenessSummary, '')
        ?? null,
      payloadAwarenessLine,
      payloadCompanionBriefingLine,
      payloadCompanionHeadlineLine,
    })
    const payloadGroundingStatus = rawPayloadStatus
      || sanitizeText(payload.preDialogueSendIdentity?.status, '')
      || null
    const explicitPayloadProjectAwarenessSummaryCandidate
      = payloadGroundingStatus === 'grounded'
        && payloadAwareReplyProjectAwarenessSummary === payloadCompanionHeadlineLine
        ? payloadAwareReplyProjectAwarenessSummary
        : payloadPreferredPreDialogueAwarenessSummary
    const explicitPayloadProjectAwarenessSummary
      = explicitPayloadProjectAwarenessSummaryCandidate
        && !looksLikeThinProjectAwarenessShell(explicitPayloadProjectAwarenessSummaryCandidate)
        && !looksLikeStructuredProjectAwarenessSummaryShell(explicitPayloadProjectAwarenessSummaryCandidate)
        ? explicitPayloadProjectAwarenessSummaryCandidate
        : null
    const shouldPreferGroundedPayloadProjectAwarenessSummary
      = isActiveDialogueCompactTimeoutRecovery
        && payloadGroundingStatus === 'grounded'
        && Boolean(explicitPayloadProjectAwarenessSummary)
    const explicitResolvedReplyCompanionHeadlineLine
      = sanitizeText((resolvedReplyProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine, '')
        || null
    const explicitParsedProjectStateCompanionHeadlineLine
      = sanitizeText((parsed.projectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine, '')
        || null
    const preparedClosureSnapshot = buildPreparedProjectStateClosureSnapshot(prepared)
    const preparedSelfContinuityAuthority = resolvePreparedRuntimeSelfContinuityAuthority(prepared) as ({
      authoritySummary?: string | null
      currentBodyState?: string | null
      closenessPosture?: string | null
    } & Record<string, unknown>) | null
    const preparedEmbodimentClosureAuthority = resolvePreparedRuntimeEmbodimentClosureAuthority(prepared)
    const preparedRuntimeAuthorityOnlyCompanionHeadlineLine
      = isActiveDialogueCompactTimeoutRecovery
        ? synthesizeAuthorityOnlyEmbodimentCompanionHeadline({
            authoritySummary: sanitizeText(preparedEmbodimentClosureAuthority.authoritySummary ?? '', '') || null,
            currentBodyState: sanitizeText(preparedEmbodimentClosureAuthority.currentBodyState ?? '', '') || null,
          })
        : null
    const shouldPreferAuthorityOnlyRuntimeCompanionHeadline
      = isActiveDialogueCompactTimeoutRecovery
        && Boolean(preparedRuntimeAuthorityOnlyCompanionHeadlineLine)
        && !shouldPreferGroundedPayloadProjectAwarenessSummary
        && !payloadCompanionHeadlineLine
        && !preparedRuntimeExplicitCompanionHeadlineLine
        && !explicitResolvedReplyCompanionHeadlineLine
        && !explicitParsedProjectStateCompanionHeadlineLine
    const fallbackSelfAuthorityAudit
      = preparedSelfContinuityAuthority
        && (
          sanitizeText(preparedSelfContinuityAuthority.authoritySummary, '')
          || sanitizeText(preparedSelfContinuityAuthority.closenessPosture, '')
        )
        ? {
            authoritySummary: sanitizeText(preparedSelfContinuityAuthority.authoritySummary, '') || null,
            closenessPosture: sanitizeText(preparedSelfContinuityAuthority.closenessPosture, '') || null,
            preservedIntoRewrite: false,
            rewriteClosureApplied: false,
          }
        : null
    const mergedProjectStateSameHerDriftRiskSummary = preferRicherProjectStateAuditText({
      current: existingProjectStateAudit?.sameHerDriftRiskSummary,
      candidate: replyProjectStateAudit?.sameHerDriftRiskSummary
        || sanitizeText((resolvedReplyProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk, '')
        || sanitizeText((parsed.projectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk, '')
        || preparedProjectStateAuditSeed.sameHerDriftRiskSummary,
    })
    const mergedProjectStateProactiveSameHerGapSummary = preferRicherProjectStateAuditText({
      current: existingProjectStateAudit?.proactiveSameHerGapSummary,
      candidate: replyProjectStateAudit?.proactiveSameHerGapSummary
        || sanitizeText((resolvedReplyProjectState as { proactiveSameHerGap?: unknown } | null)?.proactiveSameHerGap, '')
        || sanitizeText((parsed.projectState as { proactiveSameHerGap?: unknown } | null)?.proactiveSameHerGap, '')
        || preparedProjectStateAuditSeed.proactiveSameHerGapSummary,
    })
    const existingProjectStateAuditAwarenessSummary
      = sanitizeText(existingProjectStateAudit?.preDialogueAwarenessSummary, '') || null
    const replyPreferredProjectAwarenessSummary
      = preferExplicitProjectAwarenessOverCanonicalReanchor({
        current:
          replyProjectStateAudit?.preDialogueAwarenessSummary
          ?? resolvedStructuredPreDialogueAwarenessSummary
          ?? null,
        candidate: existingProjectStateAuditAwarenessSummary,
      })
      ?? replyProjectStateAudit?.preDialogueAwarenessSummary
      ?? resolvedStructuredPreDialogueAwarenessSummary
      ?? existingProjectStateAuditAwarenessSummary
      ?? null
    const mergedProjectStateAuditPreDialogueAwarenessSummary = shouldPreferGroundedPayloadProjectAwarenessSummary
      ? explicitPayloadProjectAwarenessSummary
      : shouldPreferAuthorityOnlyRuntimeCompanionHeadline
        ? preparedRuntimeAuthorityOnlyCompanionHeadlineLine
      : explicitPayloadProjectAwarenessSummary
        || promoteSameHerDriftRiskOverThinAwareness({
          awarenessLine: preferExplicitProjectAwarenessOverCanonicalReanchor({
            current: preferExplicitProjectAwarenessOverCanonicalReanchor({
              current: preferStrongerSameHerHeadlineOverAwareness({
                awarenessLine:
                replyPreferredProjectAwarenessSummary
                ?? preparedProjectStateAuditSeed.preDialogueAwarenessSummary
                ?? null,
                companionHeadlineLine:
                sanitizeText((resolvedReplyProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine, '')
                || sanitizeText((resolvedReplyProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine, '')
                || preparedRuntimeAuthorityOnlyCompanionHeadlineLine
                || preparedRuntimeCompanionHeadlineLine
                || null,
              }),
              candidate: preparedRuntimePreferredAwarenessLine,
            }),
            candidate: payloadPreferredPreDialogueAwarenessSummary,
          }),
          sameHerDriftRisk: mergedProjectStateSameHerDriftRiskSummary,
        })
    const replyProjectStateAuditSameHerSummary = replyProjectStateAudit?.sameHerSummary
    const replyProjectStateAuditEmotionalClosureSummary = replyProjectStateAudit?.emotionalClosureSummary
    const mergedSameHerSummary = preferStrongerSameHerProjectStateText({
      current: looksLikeSameHerSelfLine(existingProjectStateAudit?.sameHerSummary as string | null | undefined)
        ? existingProjectStateAudit?.sameHerSummary
        : null,
      candidate: looksLikeSameHerSelfLine(replyProjectStateAuditSameHerSummary)
        ? replyProjectStateAuditSameHerSummary
        : looksLikeSameHerSelfLine((resolvedReplyProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine as string | null | undefined)
          ? sanitizeText((resolvedReplyProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine, '')
          : looksLikeSameHerSelfLine(preparedProjectStateSeed.sameHerSelfLine)
            ? preparedProjectStateSeed.sameHerSelfLine
            : null,
    }) ?? null
    const resolvedReplyProjectStateEmotionalClosureSummary = preferRicherProjectStateAuditText({
      current: sanitizeText((resolvedReplyProjectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue, ''),
      candidate: preparedProjectStateAuditSeed.emotionalClosureSummary,
    })
    const mergedReplyProjectStateEmotionalClosureSummary = preferRicherProjectStateAuditText({
      current: replyProjectStateAuditEmotionalClosureSummary,
      candidate: resolvedReplyProjectStateEmotionalClosureSummary,
    })
    const mergedSameHerHoldContinuityCue
      = replyProjectStateAudit?.continuityCue
        ?? preparedProjectStateAuditSeed.continuityCue
        ?? sanitizeText((resolvedReplyProjectState as { continuityCue?: unknown } | null)?.continuityCue, '')
        ?? existingProjectStateAudit?.continuityCue
        ?? null
    const mergedReplyPreferredSameHerHoldDetail = resolvePreferredSameHerHoldDetail({
      current: replyProjectStateAudit?.sameHerHoldDetail
        ?? sanitizeText((resolvedReplyProjectState as { sameHerHoldDetail?: unknown } | null)?.sameHerHoldDetail, '')
        ?? null,
      candidate: preparedProjectStateAuditSeed.sameHerHoldDetail,
      continuityCue: mergedSameHerHoldContinuityCue,
    })
    const mergedSameHerHoldDetail = resolvePreferredSameHerHoldDetail({
      current: existingProjectStateAudit?.sameHerHoldDetail,
      candidate: mergedReplyPreferredSameHerHoldDetail,
      continuityCue: mergedSameHerHoldContinuityCue,
    })
    const mergedContinuityArcStage = preferRicherProjectStateAuditText({
      current: existingProjectStateAudit?.continuityArcStage,
      candidate: replyProjectStateAudit?.continuityArcStage
        ?? preparedProjectStateAuditSeed.continuityArcStage
        ?? sanitizeText((resolvedReplyProjectState as { continuityArcStage?: unknown } | null)?.continuityArcStage, ''),
    })
    const mergedContinuityCue = preferRicherProjectStateAuditText({
      current: existingProjectStateAudit?.continuityCue,
      candidate: replyProjectStateAudit?.continuityCue
        ?? preparedProjectStateAuditSeed.continuityCue
        ?? sanitizeText((resolvedReplyProjectState as { continuityCue?: unknown } | null)?.continuityCue, ''),
    })
    const mergedProjectStateAudit = replyProjectStateAudit
      ? {
          ...existingProjectStateAudit,
          ...replyProjectStateAudit,
          sameHerSummary: mergedSameHerSummary,
          sameHerHoldDetail: mergedSameHerHoldDetail,
          continuityArcStage: mergedContinuityArcStage,
          continuityCue: mergedContinuityCue,
          currentPhaseSummary: preferRicherProjectStateAuditText({
            current: existingProjectStateAudit?.currentPhaseSummary,
            candidate: replyProjectStateAudit.currentPhaseSummary
              ?? sanitizeText((resolvedReplyProjectState as { currentPhase?: unknown } | null)?.currentPhase, ''),
          }),
          landedProgressSummary: preferRicherProjectStateAuditText({
            current: existingProjectStateAudit?.landedProgressSummary,
            candidate: replyProjectStateAudit.landedProgressSummary,
          }),
          openClosureSummary: preferRicherProjectStateAuditText({
            current: existingProjectStateAudit?.openClosureSummary,
            candidate: replyProjectStateAudit.openClosureSummary,
          }),
          emotionalClosureSummary: preferRicherProjectStateAuditText({
            current: existingProjectStateAudit?.emotionalClosureSummary,
            candidate: mergedReplyProjectStateEmotionalClosureSummary,
          }),
          sameHerDriftRiskSummary: mergedProjectStateSameHerDriftRiskSummary,
          proactiveSameHerGapSummary: mergedProjectStateProactiveSameHerGapSummary,
          nextClosureTargetSummary: preferRicherProjectStateAuditText({
            current: existingProjectStateAudit?.nextClosureTargetSummary,
            candidate: replyProjectStateAudit.nextClosureTargetSummary
              ?? sanitizeText((resolvedReplyProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget, ''),
          }),
          preDialogueAwarenessSummary: mergedProjectStateAuditPreDialogueAwarenessSummary,
          continuitySummary: buildProjectStateAuditContinuitySummary({
            sameHerSummary: mergedSameHerSummary,
            sameHerHoldDetail: mergedSameHerHoldDetail,
            continuityArcStage: mergedContinuityArcStage,
            continuityCue: mergedContinuityCue,
            currentPhaseSummary: preferRicherProjectStateAuditText({
              current: existingProjectStateAudit?.currentPhaseSummary,
              candidate: replyProjectStateAudit.currentPhaseSummary
                ?? sanitizeText((resolvedReplyProjectState as { currentPhase?: unknown } | null)?.currentPhase, ''),
            }),
            landedProgressSummary: preferRicherProjectStateAuditText({
              current: existingProjectStateAudit?.landedProgressSummary,
              candidate: replyProjectStateAudit.landedProgressSummary,
            }),
            openClosureSummary: preferRicherProjectStateAuditText({
              current: existingProjectStateAudit?.openClosureSummary,
              candidate: replyProjectStateAudit.openClosureSummary,
            }),
            proactiveSameHerGapSummary: mergedProjectStateProactiveSameHerGapSummary,
            emotionalClosureSummary: preferRicherProjectStateAuditText({
              current: existingProjectStateAudit?.emotionalClosureSummary,
              candidate: mergedReplyProjectStateEmotionalClosureSummary,
            }),
            nextClosureTargetSummary: preferRicherProjectStateAuditText({
              current: existingProjectStateAudit?.nextClosureTargetSummary,
              candidate: replyProjectStateAudit.nextClosureTargetSummary
                ?? sanitizeText((resolvedReplyProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget, ''),
            }),
            embodimentClosureSummary: mergedProjectStateEmbodimentClosureSummary,
          }),
          embodimentClosureSummary: mergedProjectStateEmbodimentClosureSummary,
          preservedIntoRewrite: Boolean(existingProjectStateAudit?.preservedIntoRewrite || replyProjectStateAudit.preservedIntoRewrite),
          rewriteClosureApplied: Boolean(existingProjectStateAudit?.rewriteClosureApplied || replyProjectStateAudit.rewriteClosureApplied),
        }
      : existingProjectStateAudit
        ? {
            ...preparedProjectStateAuditSeed,
            ...existingProjectStateAudit,
            sameHerHoldDetail: resolvePreferredSameHerHoldDetail({
              current: existingProjectStateAudit.sameHerHoldDetail as string | null | undefined,
              candidate: preparedProjectStateAuditSeed.sameHerHoldDetail,
              continuityCue:
                (existingProjectStateAudit.continuityCue as string | null | undefined)
                ?? preparedProjectStateAuditSeed.continuityCue
                ?? null,
            }) ?? null,
            continuityArcStage: (existingProjectStateAudit.continuityArcStage as string | null | undefined)
              ?? preparedProjectStateAuditSeed.continuityArcStage
              ?? null,
            continuityCue: (existingProjectStateAudit.continuityCue as string | null | undefined)
              ?? preparedProjectStateAuditSeed.continuityCue
              ?? null,
            proactiveSameHerGapSummary: preferRicherProjectStateAuditText({
              current: existingProjectStateAudit.proactiveSameHerGapSummary as string | null | undefined,
              candidate: preparedProjectStateAuditSeed.proactiveSameHerGapSummary,
            }),
            continuitySummary: buildProjectStateAuditContinuitySummary({
              sameHerSummary: preferStrongerSameHerProjectStateText({
                current: looksLikeSameHerSelfLine(existingProjectStateAudit.sameHerSummary as string | null | undefined)
                  ? sanitizeText(existingProjectStateAudit.sameHerSummary, '')
                  : null,
                candidate: preparedProjectStateAuditSeed.sameHerSummary,
              }),
              sameHerHoldDetail: resolvePreferredSameHerHoldDetail({
                current: existingProjectStateAudit.sameHerHoldDetail as string | null | undefined,
                candidate: preparedProjectStateAuditSeed.sameHerHoldDetail,
                continuityCue:
                  (existingProjectStateAudit.continuityCue as string | null | undefined)
                  ?? preparedProjectStateAuditSeed.continuityCue
                  ?? null,
              }) ?? null,
              continuityArcStage: (existingProjectStateAudit.continuityArcStage as string | null | undefined)
                ?? preparedProjectStateAuditSeed.continuityArcStage
                ?? null,
              continuityCue: (existingProjectStateAudit.continuityCue as string | null | undefined)
                ?? preparedProjectStateAuditSeed.continuityCue
                ?? null,
              sameHerDriftRiskSummary: preferRicherProjectStateAuditText({
                current: existingProjectStateAudit.sameHerDriftRiskSummary as string | null | undefined,
                candidate: preparedProjectStateAuditSeed.sameHerDriftRiskSummary,
              }),
              currentPhaseSummary: preferRicherProjectStateAuditText({
                current: existingProjectStateAudit.currentPhaseSummary as string | null | undefined,
                candidate: preparedProjectStateAuditSeed.currentPhaseSummary,
              }),
              landedProgressSummary: preferRicherProjectStateAuditText({
                current: existingProjectStateAudit.landedProgressSummary as string | null | undefined,
                candidate: preparedProjectStateAuditSeed.landedProgressSummary,
              }),
              openClosureSummary: preferRicherProjectStateAuditText({
                current: existingProjectStateAudit.openClosureSummary as string | null | undefined,
                candidate: preparedProjectStateAuditSeed.openClosureSummary,
              }),
              nextClosureTargetSummary: preferRicherProjectStateAuditText({
                current: existingProjectStateAudit.nextClosureTargetSummary as string | null | undefined,
                candidate: preparedProjectStateAuditSeed.nextClosureTargetSummary,
              }),
              proactiveSameHerGapSummary: preferRicherProjectStateAuditText({
                current: existingProjectStateAudit.proactiveSameHerGapSummary as string | null | undefined,
                candidate: preparedProjectStateAuditSeed.proactiveSameHerGapSummary,
              }),
              emotionalClosureSummary: preferRicherProjectStateAuditText({
                current: existingProjectStateAudit.emotionalClosureSummary as string | null | undefined,
                candidate: preparedProjectStateAuditSeed.emotionalClosureSummary,
              }),
              embodimentClosureSummary: preferRicherProjectStateAuditText({
                current: existingProjectStateAudit.embodimentClosureSummary as string | null | undefined,
                candidate: null,
              }),
            }),
          }
        : preparedProjectStateAuditSeed
    const mergedTopLevelSameHerSelfLine = strengthenSameHerSelfLineForPersistence(preferStrongerSameHerProjectStateText({
      current: preferStrongerSameHerProjectStateText({
        current: preferStrongerSameHerProjectStateText({
          current: preparedProjectStateSeed.sameHerSelfLine,
          candidate: looksLikeSameHerSelfLine(mergedProjectStateAudit?.sameHerSummary)
            ? sanitizeText(mergedProjectStateAudit?.sameHerSummary, '')
            : null,
        }),
        candidate: sanitizeText((parsed.projectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine, ''),
      }),
      candidate: sanitizeText((resolvedReplyProjectState as { sameHerSelfLine?: unknown } | null)?.sameHerSelfLine, ''),
    })) ?? null
    const replyCritic = reply.realization.critic as ({
      blockedReasons?: string[] | null
      mustPreserve?: string[] | null
      reasonCodes?: string[] | null
    } & Record<string, unknown>) | null
    const mergedVisibleReplyRealization = {
      ...existingVisibleReplyRealization,
      ...reply.realization,
      blockedReasons: Array.isArray(reply.realization.blockedReasons)
        ? [...reply.realization.blockedReasons]
        : [],
      emotionalClosureAudit: reply.realization.emotionalClosureAudit
        ? { ...reply.realization.emotionalClosureAudit }
        : null,
      selfAuthorityAudit: reply.realization.selfAuthorityAudit
        ? { ...reply.realization.selfAuthorityAudit }
        : existingVisibleReplySelfAuthorityAudit
          ? {
              ...existingVisibleReplySelfAuthorityAudit,
            }
          : fallbackSelfAuthorityAudit,
      projectStateAudit: mergedProjectStateAudit,
      critic: replyCritic
        ? {
            ...replyCritic,
            blockedReasons: Array.isArray(replyCritic.blockedReasons)
              ? [...replyCritic.blockedReasons]
              : [],
            mustPreserve: Array.isArray(replyCritic.mustPreserve)
              ? [...replyCritic.mustPreserve]
              : [],
            reasonCodes: Array.isArray(replyCritic.reasonCodes)
              ? [...replyCritic.reasonCodes]
              : [],
          }
        : null,
      closure: reply.realization.closure
        ? {
            ...reply.realization.closure,
            reasonCodes: Array.isArray(reply.realization.closure.reasonCodes)
              ? [...reply.realization.closure.reasonCodes]
              : [],
          }
        : null,
    }
    const mergedProjectStatePreDialogueAwarenessLineRaw = shouldPreferGroundedPayloadProjectAwarenessSummary
      ? explicitPayloadProjectAwarenessSummary
      : shouldPreferAuthorityOnlyRuntimeCompanionHeadline
        ? preparedRuntimeAuthorityOnlyCompanionHeadlineLine
      : preferStrongerSameHerHeadlineOverAwareness({
          awarenessLine:
            sanitizeText(mergedProjectStateAudit?.preDialogueAwarenessSummary ?? '', '')
            || sanitizeText((resolvedReplyProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine, '')
            || resolvedStructuredPreDialogueAwarenessSummary
            || preparedRuntimePreferredAwarenessLine
            || preparedProjectStateAuditSeed.preDialogueAwarenessSummary
            || sanitizeText((parsed.projectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine, '')
            || null,
          companionHeadlineLine:
            sanitizeText((resolvedReplyProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine, '')
            || sanitizeText((resolvedReplyProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine, '')
            || preparedRuntimeAuthorityOnlyCompanionHeadlineLine
            || preparedRuntimeCompanionHeadlineLine
            || sanitizeText((parsed.projectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine, '')
            || sanitizeText((parsed.preDialogueAwareness && typeof parsed.preDialogueAwareness === 'object'
              ? (parsed.preDialogueAwareness as Record<string, unknown>).awarenessLine
              : null) ?? '', '')
            || sanitizeText((parsed.projectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine, '')
            || null,
        })
    const mergedProjectStatePreDialogueAwarenessLine = (() => {
      const preferredAwarenessLine = sanitizeText(mergedProjectStatePreDialogueAwarenessLineRaw ?? '', '') || null
      if (!preferredAwarenessLine)
        return preparedProjectStateAuditSeed.preDialogueAwarenessSummary ?? canonicalProjectState.preDialogueAwarenessLine ?? null

      const preferredLooksWeak = looksLikeThinProjectAwarenessShell(preferredAwarenessLine)
        || looksLikeStructuredProjectAwarenessSummaryShell(preferredAwarenessLine)
        || looksLikeGeneratedProjectAwarenessExpansion(preferredAwarenessLine)

      if (!preferredLooksWeak)
        return preferredAwarenessLine

      return canonicalProjectState.preDialogueAwarenessLine
        ?? preparedProjectStateAuditSeed.preDialogueAwarenessSummary
        ?? preferredAwarenessLine
    })()
    const mergedProjectStateCompanionBriefingLine
      = sanitizeText((resolvedReplyProjectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine, '')
        || payloadCompanionBriefingLine
        || sanitizeText((parsed.projectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine, '')
        || sanitizeText((parsed.preDialogueAwareness && typeof parsed.preDialogueAwareness === 'object'
          ? (parsed.preDialogueAwareness as Record<string, unknown>).companionBriefingLine
          : null) ?? '', '')
        || sanitizeText((parsed.preDialogueClosure && typeof parsed.preDialogueClosure === 'object'
          ? (parsed.preDialogueClosure as Record<string, unknown>).companionBriefingLine
          : null) ?? '', '')
        || null
    const mergedProjectStateCompanionHeadlineLine
      = shouldPreferAuthorityOnlyRuntimeCompanionHeadline
        ? preparedRuntimeAuthorityOnlyCompanionHeadlineLine
        : preferProjectAwareClosureSummary({
            current: preferExplicitProjectAwarenessOverCanonicalReanchor({
              current:
                  sanitizeText((resolvedReplyProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine, '')
                  || preparedRuntimeAuthorityOnlyCompanionHeadlineLine
                  || preparedRuntimeCompanionHeadlineLine
                  || sanitizeText((parsed.projectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine, '')
                  || null,
              candidate: mergedProjectStatePreDialogueAwarenessLine,
            }),
            candidate: mergedProjectStatePreDialogueAwarenessLine,
          })
          || mergedProjectStatePreDialogueAwarenessLine
    const parsedPerformance = parsed.performance && typeof parsed.performance === 'object'
      ? parsed.performance as Record<string, unknown>
      : null
    const mergedTopLevelPerformance = currentStructuredPerformance && typeof currentStructuredPerformance === 'object'
      ? {
          ...parsedPerformance,
          ...(currentStructuredPerformance as unknown as Record<string, unknown>),
          baseEmotion: sanitizeText((currentStructuredPerformance as unknown as Record<string, unknown>).baseEmotion, '')
            || sanitizeText(parsedPerformance?.baseEmotion ?? '', '')
            || 'thinking',
          facialCue: sanitizeText((currentStructuredPerformance as unknown as Record<string, unknown>).facialCue, '')
            || sanitizeText(parsedPerformance?.facialCue ?? '', '')
            || null,
          actionCue: sanitizeText((currentStructuredPerformance as unknown as Record<string, unknown>).actionCue, '')
            || sanitizeText(parsedPerformance?.actionCue ?? '', '')
            || null,
          delivery: sanitizeText((currentStructuredPerformance as unknown as Record<string, unknown>).delivery, '')
            || sanitizeText(parsedPerformance?.delivery ?? '', '')
            || 'calm',
          emphasis:
            typeof (currentStructuredPerformance as unknown as Record<string, unknown>).emphasis === 'number'
              ? (currentStructuredPerformance as unknown as Record<string, unknown>).emphasis
              : typeof parsedPerformance?.emphasis === 'number'
                ? parsedPerformance.emphasis
                : 0,
        }
      : null
    const hasPreparedProjectStateSeed = Object.values(preparedProjectStateSeed).some(value => typeof value === 'string' && value.trim().length > 0)
    const mergedTopLevelProjectState = mergedProjectStateAudit || resolvedReplyProjectState || hasPreparedProjectStateSeed
      ? {
          ...(((parsed.projectState && typeof parsed.projectState === 'object')
            ? parsed.projectState
            : {}) as Record<string, unknown>),
          ...preparedProjectStateSeed,
          ...((resolvedReplyProjectState && typeof resolvedReplyProjectState === 'object')
            ? resolvedReplyProjectState as Record<string, unknown>
            : {}),
          identity: sanitizeText((resolvedReplyProjectState as { identity?: unknown } | null)?.identity, '')
            || sanitizeText((parsed.projectState as { identity?: unknown } | null)?.identity, '')
            || preparedProjectStateSeed.identity
            || null,
          currentPhase: sanitizeText((resolvedReplyProjectState as { currentPhase?: unknown } | null)?.currentPhase, '')
            || sanitizeText((parsed.projectState as { currentPhase?: unknown } | null)?.currentPhase, '')
            || preparedProjectStateSeed.currentPhase
            || mergedProjectStateAudit?.currentPhaseSummary
            || null,
          preflightSummary: resolvePreferredHostVisibleProjectPreflightSummary({
            rawPayloadSummary: rawPayloadProjectStatePreflightSummary,
            normalizedPayloadSummary: payload.preDialogueSendIdentity?.summaryLine ?? null,
            preparedClosureSummary: preparedClosureSnapshot?.projectStatePreflightSummary ?? null,
            preparedRuntimeSummary: preparedRuntimeProjectState?.preflightSummary ?? null,
            resolvedProjectStateSummary: (resolvedReplyProjectState as { preflightSummary?: unknown } | null)?.preflightSummary as string | null | undefined,
            parsedProjectStateSummary: (parsed.projectState as { preflightSummary?: unknown } | null)?.preflightSummary as string | null | undefined,
            canonicalSummary: canonicalProjectState.preflightSummary ?? null,
          }),
          latestLandedProgress: mergedProjectStateAudit?.landedProgressSummary
            || sanitizeText((resolvedReplyProjectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress, '')
            || sanitizeText((parsed.projectState as { latestLandedProgress?: unknown } | null)?.latestLandedProgress, '')
            || preparedProjectStateSeed.latestLandedProgress
            || null,
          primaryOpenLoop: mergedProjectStateAudit?.openClosureSummary
            || sanitizeText((resolvedReplyProjectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop, '')
            || sanitizeText((parsed.projectState as { primaryOpenLoop?: unknown } | null)?.primaryOpenLoop, '')
            || preparedProjectStateSeed.primaryOpenLoop
            || null,
          nextClosureTarget: mergedProjectStateAudit?.nextClosureTargetSummary
            || sanitizeText((resolvedReplyProjectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget, '')
            || sanitizeText((parsed.projectState as { nextClosureTarget?: unknown } | null)?.nextClosureTarget, '')
            || preparedProjectStateSeed.nextClosureTarget
            || null,
          proactiveSameHerGap: mergedProjectStateAudit?.proactiveSameHerGapSummary
            || sanitizeText((resolvedReplyProjectState as { proactiveSameHerGap?: unknown } | null)?.proactiveSameHerGap, '')
            || sanitizeText((parsed.projectState as { proactiveSameHerGap?: unknown } | null)?.proactiveSameHerGap, '')
            || preparedProjectStateSeed.proactiveSameHerGap
            || null,
          sameHerSelfLine: mergedTopLevelSameHerSelfLine,
          sameHerDriftRisk: mergedProjectStateAudit?.sameHerDriftRiskSummary
            || sanitizeText((resolvedReplyProjectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk, '')
            || sanitizeText((parsed.projectState as { sameHerDriftRisk?: unknown } | null)?.sameHerDriftRisk, '')
            || preparedProjectStateAuditSeed.sameHerDriftRiskSummary
            || null,
          preDialogueAwarenessLine: mergedProjectStatePreDialogueAwarenessLine,
          awarenessLine: mergedProjectStatePreDialogueAwarenessLine,
          companionHeadlineLine: mergedProjectStateCompanionHeadlineLine,
          companionBriefingLine: mergedProjectStateCompanionBriefingLine,
        }
      : (parsed.projectState && typeof parsed.projectState === 'object' ? parsed.projectState : undefined)

    return {
      ...reply,
      realization: mergedVisibleReplyRealization as typeof reply.realization,
      fullText: JSON.stringify({
        ...parsed,
        ...(mergedTopLevelPerformance ? { performance: mergedTopLevelPerformance } : {}),
        ...(mergedTopLevelProjectState ? { projectState: mergedTopLevelProjectState } : {}),
        visibleReplyRealization: mergedVisibleReplyRealization,
      }),
    }
  }

  const injectLatestProjectStateAuditIfMissing = (fullText: string) => {
    if (!latestSettledProjectStateAudit)
      return fullText
    const parsed = parseJsonObjectFromText(fullText)
    if (!parsed)
      return fullText
    const existingVisibleReplyRealization = parsed.visibleReplyRealization
      && typeof parsed.visibleReplyRealization === 'object'
      ? parsed.visibleReplyRealization as Record<string, unknown>
      : null
    const existingProjectStateAudit = existingVisibleReplyRealization?.projectStateAudit
      && typeof existingVisibleReplyRealization.projectStateAudit === 'object'
      ? existingVisibleReplyRealization.projectStateAudit as Record<string, unknown>
      : null
    if (existingProjectStateAudit)
      return fullText
    return JSON.stringify({
      ...parsed,
      visibleReplyRealization: {
        ...existingVisibleReplyRealization,
        projectStateAudit: latestSettledProjectStateAudit,
      },
    })
  }

  const normalizeTopLevelProjectStateAwarenessFromRealization = (fullText: string) => {
    const parsed = parseJsonObjectFromText(fullText)
    if (!parsed)
      return fullText

    const visibleReplyRealization = parsed.visibleReplyRealization
      && typeof parsed.visibleReplyRealization === 'object'
      ? parsed.visibleReplyRealization as Record<string, unknown>
      : null
    const projectStateAudit = visibleReplyRealization?.projectStateAudit
      && typeof visibleReplyRealization.projectStateAudit === 'object'
      ? visibleReplyRealization.projectStateAudit as Record<string, unknown>
      : null
    const projectState = parsed.projectState
      && typeof parsed.projectState === 'object'
      ? parsed.projectState as Record<string, unknown>
      : null
    const performance = parsed.performance
      && typeof parsed.performance === 'object'
      ? parsed.performance as Record<string, unknown>
      : null
    const digitalLifeSpine = parsed.digitalLifeSpine
      && typeof parsed.digitalLifeSpine === 'object'
      ? parsed.digitalLifeSpine as Record<string, unknown>
      : null
    const runtimeDigest = parsed.runtimeDigest
      && typeof parsed.runtimeDigest === 'object'
      ? parsed.runtimeDigest as Record<string, unknown>
      : null
    const runtimeDigestProjectState = runtimeDigest?.projectState
      && typeof runtimeDigest.projectState === 'object'
      ? runtimeDigest.projectState as Record<string, unknown>
      : null
    const preDialogueAwareness = parsed.preDialogueAwareness
      && typeof parsed.preDialogueAwareness === 'object'
      ? parsed.preDialogueAwareness as Record<string, unknown>
      : null
    const preDialogueClosure = parsed.preDialogueClosure
      && typeof parsed.preDialogueClosure === 'object'
      ? parsed.preDialogueClosure as Record<string, unknown>
      : null
    const preparedRuntimeProjectState = resolvePreparedRuntimeProjectState(prepared)
    const payloadProjectAwarenessSummary = rawPayloadPreferredPreDialogueAwarenessSummary
      ?? resolvePayloadPreferredPreDialogueAwarenessCarry(payload)
    const preferredProjectStatePreflightSummary = resolvePreferredHostVisibleProjectPreflightSummary({
      rawPayloadSummary: input.payload.preDialogueSendIdentity?.summaryLine ?? null,
      normalizedPayloadSummary: payload.preDialogueSendIdentity?.summaryLine ?? null,
      preparedClosureSummary: buildPreparedProjectStateClosureSnapshot(prepared)?.projectStatePreflightSummary ?? null,
      runtimeDigestSummary: runtimeDigestProjectState?.preflightSummary as string | null | undefined,
      preparedRuntimeSummary: preparedRuntimeProjectState?.preflightSummary ?? null,
      structuredProjectStateSummary: projectState?.preflightSummary as string | null | undefined,
      canonicalSummary: resolveAlicizationProjectStateBrief().preflightSummary ?? null,
    })
    const currentTopLevelAwarenessSummary
      = sanitizeText(projectState?.preDialogueAwarenessSummary ?? '', '') || null
    const currentTopLevelAwarenessSummaryLooksExplicit = Boolean(
      currentTopLevelAwarenessSummary
      && !looksLikeThinProjectAwarenessShell(currentTopLevelAwarenessSummary)
      && !looksLikeCanonicalProjectAwarenessReanchor(currentTopLevelAwarenessSummary)
      && !looksLikeStructuredProjectAwarenessSummaryShell(currentTopLevelAwarenessSummary)
      && !looksLikeGeneratedProjectAwarenessExpansion(currentTopLevelAwarenessSummary),
    )
    const currentTopLevelAwarenessLineCandidate
      = sanitizeText(runtimeDigestProjectState?.preDialogueAwarenessLine ?? '', '')
        || sanitizeText(runtimeDigestProjectState?.awarenessLine ?? '', '')
        || sanitizeText(projectState?.preDialogueAwarenessLine ?? '', '')
        || sanitizeText(preDialogueAwareness?.awarenessLine ?? '', '')
        || (
          currentTopLevelAwarenessSummary
          && !looksLikeCanonicalProjectAwarenessReanchor(currentTopLevelAwarenessSummary)
          && !looksLikeStructuredProjectAwarenessSummaryShell(currentTopLevelAwarenessSummary)
          && !looksLikeGeneratedProjectAwarenessExpansion(currentTopLevelAwarenessSummary)
            ? currentTopLevelAwarenessSummary
            : null
        )
        || null
    const currentTopLevelAwarenessLineLooksWeak = Boolean(
      currentTopLevelAwarenessLineCandidate
      && (
        looksLikeThinProjectAwarenessShell(currentTopLevelAwarenessLineCandidate)
        || looksLikeCanonicalProjectAwarenessReanchor(currentTopLevelAwarenessLineCandidate)
        || looksLikeStructuredProjectAwarenessSummaryShell(currentTopLevelAwarenessLineCandidate)
        || looksLikeGeneratedProjectAwarenessExpansion(currentTopLevelAwarenessLineCandidate)
      ),
    )
    const auditAwarenessLine = sanitizeText(projectStateAudit?.preDialogueAwarenessSummary ?? '', '') || null
    const normalizedProjectStateSameHerDriftRisk
      = sanitizeText(runtimeDigestProjectState?.sameHerDriftRisk ?? '', '')
        || sanitizeText(projectState?.sameHerDriftRisk ?? '', '')
        || sanitizeText(projectStateAudit?.sameHerDriftRiskSummary ?? '', '')
        || null
    const currentTopLevelAwarenessLine
      = currentTopLevelAwarenessSummaryLooksExplicit && currentTopLevelAwarenessLineLooksWeak
        ? preferExplicitProjectAwarenessOverCanonicalReanchor({
          current: currentTopLevelAwarenessSummary,
          candidate:
              auditAwarenessLine
              || payloadProjectAwarenessSummary
              || sanitizeText(payload.preDialogueSendIdentity?.summaryLine ?? '', '')
              || null,
        }) || currentTopLevelAwarenessSummary
        : preferExplicitProjectAwarenessOverCanonicalReanchor({
          current: currentTopLevelAwarenessLineCandidate,
          candidate:
              auditAwarenessLine
              || payloadProjectAwarenessSummary
              || currentTopLevelAwarenessSummary
              || null,
        }) || currentTopLevelAwarenessLineCandidate
    const currentCompanionBriefingLine
      = sanitizeText(runtimeDigestProjectState?.companionBriefingLine ?? '', '')
        || rawPayloadCompanionBriefingLine
        || sanitizeText(preparedRuntimeProjectState?.companionBriefingLine ?? '', '')
        || sanitizeText(preDialogueAwareness?.companionBriefingLine ?? '', '')
        || sanitizeText(preDialogueClosure?.companionBriefingLine ?? '', '')
        || sanitizeText(payload.preDialogueSendIdentity?.companionBriefingLine ?? '', '')
        || null
    const currentCompanionHeadlineLine
      = preferExplicitProjectAwarenessOverCanonicalReanchor({
        current:
            sanitizeText(runtimeDigestProjectState?.companionHeadlineLine ?? '', '')
            || sanitizeText(preparedRuntimeProjectState?.companionHeadlineLine ?? '', '')
            || sanitizeText(projectState?.companionHeadlineLine ?? '', '')
            || sanitizeText(payload.preDialogueSendIdentity?.companionHeadlineLine ?? '', '')
            || null,
        candidate:
            auditAwarenessLine
            || payloadProjectAwarenessSummary
            || currentTopLevelAwarenessSummary
            || currentCompanionBriefingLine
            || null,
      })
      || null
    const baseAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: currentTopLevelAwarenessLine,
        awarenessLine:
          sanitizeText(runtimeDigestProjectState?.awarenessLine ?? '', '')
          || sanitizeText(projectState?.awarenessLine ?? '', '')
          || sanitizeText(preDialogueAwareness?.awarenessLine ?? '', '')
          || currentTopLevelAwarenessLine,
        companionHeadlineLine:
          currentCompanionHeadlineLine
          || currentTopLevelAwarenessLine,
        companionBriefingLine: currentCompanionBriefingLine,
        preDialogueAwarenessSummary:
          sanitizeText(runtimeDigestProjectState?.preDialogueAwarenessSummary ?? '', '')
          || (
            currentTopLevelAwarenessSummary
            && !looksLikeCanonicalProjectAwarenessReanchor(currentTopLevelAwarenessSummary)
            && !looksLikeStructuredProjectAwarenessSummaryShell(currentTopLevelAwarenessSummary)
            && !looksLikeGeneratedProjectAwarenessExpansion(currentTopLevelAwarenessSummary)
              ? currentTopLevelAwarenessSummary
              : null
          )
          || null,
        sameHerDriftRiskSummary: normalizedProjectStateSameHerDriftRisk,
        preflightSummary: preferredProjectStatePreflightSummary,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine:
            auditAwarenessLine
            || payloadProjectAwarenessSummary
            || sanitizeText(payload.preDialogueSendIdentity?.awarenessLine ?? '', '')
            || currentCompanionBriefingLine
            || null,
        awarenessLine:
            auditAwarenessLine
            || payloadProjectAwarenessSummary
            || sanitizeText(payload.preDialogueSendIdentity?.awarenessLine ?? '', '')
            || currentCompanionBriefingLine
            || null,
        companionHeadlineLine:
          currentCompanionHeadlineLine
          || sanitizeText(payload.preDialogueSendIdentity?.companionHeadlineLine ?? '', '')
          || null,
        companionBriefingLine:
          currentCompanionBriefingLine
          || sanitizeText(payload.preDialogueSendIdentity?.companionBriefingLine ?? '', '')
          || null,
        preDialogueAwarenessSummary:
          auditAwarenessLine
          || payloadProjectAwarenessSummary
          || currentTopLevelAwarenessSummary
          || null,
        sameHerDriftRiskSummary: normalizedProjectStateSameHerDriftRisk,
        preflightSummary: preferredProjectStatePreflightSummary,
      },
    })
    const explicitAuditAwarenessLine
      = auditAwarenessLine
        && !looksLikeThinProjectAwarenessShell(auditAwarenessLine)
        && !looksLikeCanonicalProjectAwarenessReanchor(auditAwarenessLine)
        && !looksLikeStructuredProjectAwarenessSummaryShell(auditAwarenessLine)
        && !looksLikeGeneratedProjectAwarenessExpansion(auditAwarenessLine)
        ? auditAwarenessLine
        : null
    const authoritativeAwarenessLine = preferExplicitProjectAwarenessOverCanonicalReanchor({
      current: promoteSameHerDriftRiskOverThinAwareness({
        awarenessLine:
          baseAwarenessLine,
        sameHerDriftRisk: normalizedProjectStateSameHerDriftRisk,
      }),
      candidate: explicitAuditAwarenessLine,
    }) ?? promoteSameHerDriftRiskOverThinAwareness({
      awarenessLine:
        baseAwarenessLine,
      sameHerDriftRisk: normalizedProjectStateSameHerDriftRisk,
    })
    const authoritativeCompanionHeadlineLine
      = preferProjectAwareClosureSummary({
        current: currentCompanionHeadlineLine,
        candidate: authoritativeAwarenessLine,
      })
      || currentCompanionHeadlineLine
      || authoritativeAwarenessLine
    const authoritativeCompanionBriefingLine
      = currentCompanionBriefingLine
        || sanitizeText(payload.preDialogueSendIdentity?.companionBriefingLine ?? '', '')
        || null
    const authoritativeProjectStateAuditAwarenessSummary
      = explicitAuditAwarenessLine
        || authoritativeAwarenessLine
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const authoritativeProjectStateAuditSameHerSummary = preferStrongerSameHerProjectStateText({
      current: preferStrongerSameHerProjectStateText({
        current: sanitizeText(projectStateAudit?.sameHerSummary ?? '', ''),
        candidate: sanitizeText(projectState?.sameHerSelfLine ?? '', ''),
      }),
      candidate: canonicalProjectState.sameHerSelfLine,
    }) ?? canonicalProjectState.sameHerSelfLine
    const normalizedTopLevelSameHerSelfLine = strengthenSameHerSelfLineForPersistence(
      authoritativeProjectStateAuditSameHerSummary,
    ) ?? canonicalProjectState.sameHerSelfLine
    const authoritativeCurrentPhaseSummary = preferRicherProjectStateAuditText({
      current: sanitizeText(projectStateAudit?.currentPhaseSummary ?? '', '') || null,
      candidate:
        sanitizeText(projectState?.currentPhase ?? '', '')
        || canonicalProjectState.currentPhase,
    })
    const canonicalHostVisibleLatestLandedProgress = sanitizeText(
      canonicalProjectState.latestProgress
      ?? canonicalProjectState.continuityProgressSummary
      ?? '',
      '',
    ) || canonicalProjectState.latestProgress || canonicalProjectState.continuityProgressSummary || null
    const authoritativeLandedProgressSummary = (() => {
      const current = sanitizeText(projectStateAudit?.landedProgressSummary ?? '', '') || null
      const candidate = sanitizeText(projectState?.latestLandedProgress ?? '', '') || null
      if (
        carriesGovernanceTailProjectProgress(current)
        && !carriesGovernanceTailProjectProgress(candidate)
      ) {
        return current
      }

      return preferRicherProjectStateAuditText({
        current,
        candidate: candidate || canonicalHostVisibleLatestLandedProgress || null,
      })
    })()
    const normalizedAuthoritativeLandedProgressSummary = preferFullCanonicalProjectStateTextWhenCurrentIsTruncated({
      current: preferExplicitProjectClosureCarryOverCanonical({
        current: authoritativeLandedProgressSummary,
        candidate: sanitizeText(projectState?.latestLandedProgress ?? '', '') || null,
        canonical: canonicalHostVisibleLatestLandedProgress,
        kind: 'landed',
      }),
      canonical: canonicalHostVisibleLatestLandedProgress,
    })
    const authoritativeOpenClosureSummary = preferRicherProjectStateAuditText({
      current: sanitizeText(projectStateAudit?.openClosureSummary ?? '', '') || null,
      candidate:
        sanitizeText(projectState?.primaryOpenLoop ?? '', '')
        || canonicalProjectState.openLoops?.[0]
        || null,
    })
    const authoritativeNextClosureTargetSummary = preferRicherProjectStateAuditText({
      current: sanitizeText(projectStateAudit?.nextClosureTargetSummary ?? '', '') || null,
      candidate:
        sanitizeText(projectState?.nextClosureTarget ?? '', '')
        || canonicalProjectState.nextClosureTarget
        || null,
    })
    const normalizedAuthoritativeOpenClosureSummary = preferFullCanonicalProjectStateTextWhenCurrentIsTruncated({
      current: preferExplicitProjectClosureCarryOverCanonical({
        current: authoritativeOpenClosureSummary,
        candidate: sanitizeText(projectState?.primaryOpenLoop ?? '', '') || null,
        canonical: canonicalProjectState.openLoops?.[0] ?? null,
        kind: 'open',
      }),
      canonical: canonicalProjectState.openLoops?.[0] ?? null,
    })
    const normalizedAuthoritativeNextClosureTargetSummary = preferFullCanonicalProjectStateTextWhenCurrentIsTruncated({
      current: preferExplicitProjectClosureCarryOverCanonical({
        current: authoritativeNextClosureTargetSummary,
        candidate: sanitizeText(projectState?.nextClosureTarget ?? '', '') || null,
        canonical: canonicalProjectState.nextClosureTarget,
        kind: 'next',
      }),
      canonical: canonicalProjectState.nextClosureTarget,
    })
    const normalizedTopLevelLatestLandedProgress = preferFullCanonicalProjectStateTextWhenCurrentIsTruncated({
      current: preferExplicitProjectClosureCarryOverCanonical({
        current: sanitizeText(projectState?.latestLandedProgress ?? '', '') || null,
        candidate: authoritativeLandedProgressSummary,
        canonical: canonicalHostVisibleLatestLandedProgress,
        kind: 'landed',
      }),
      canonical: canonicalHostVisibleLatestLandedProgress,
    })
    const normalizedTopLevelPrimaryOpenLoop = preferExplicitProjectClosureCarryOverCanonical({
      current: sanitizeText(projectState?.primaryOpenLoop ?? '', '') || null,
      candidate: normalizedAuthoritativeOpenClosureSummary,
      canonical: canonicalProjectState.openLoops?.[0] ?? null,
      kind: 'open',
    })
    const normalizedTopLevelNextClosureTarget = preferFullCanonicalProjectStateTextWhenCurrentIsTruncated({
      current: preferExplicitProjectClosureCarryOverCanonical({
        current: sanitizeText(projectState?.nextClosureTarget ?? '', '') || null,
        candidate: normalizedAuthoritativeNextClosureTargetSummary,
        canonical: canonicalProjectState.nextClosureTarget,
        kind: 'next',
      }),
      canonical: canonicalProjectState.nextClosureTarget,
    })
    const authoritativeEmotionalClosureSummary = preferRicherProjectStateAuditText({
      current: sanitizeText(projectStateAudit?.emotionalClosureSummary ?? '', '') || null,
      candidate:
        sanitizeText(projectState?.emotionalClosureCue ?? '', '')
        || sanitizeText(prepared?.mindTurnContract?.emotionalClosureCue ?? '', '')
        || null,
    })
    const authoritativeEmbodimentClosureSummary = preferRicherProjectStateAuditText({
      current: sanitizeText(projectStateAudit?.embodimentClosureSummary ?? '', '') || null,
      candidate: null,
    })

    if (!authoritativeAwarenessLine)
      return fullText

    return JSON.stringify({
      ...parsed,
      ...(performance ? { performance } : {}),
      ...(digitalLifeSpine ? { digitalLifeSpine } : {}),
      ...(runtimeDigest ? { runtimeDigest } : {}),
      ...(visibleReplyRealization
        ? {
            visibleReplyRealization: {
              ...visibleReplyRealization,
              ...(projectStateAudit
                ? {
                    projectStateAudit: {
                      ...projectStateAudit,
                      sameHerSummary: authoritativeProjectStateAuditSameHerSummary,
                      currentPhaseSummary: authoritativeCurrentPhaseSummary,
                      landedProgressSummary: normalizedAuthoritativeLandedProgressSummary,
                      openClosureSummary: normalizedAuthoritativeOpenClosureSummary,
                      nextClosureTargetSummary: normalizedAuthoritativeNextClosureTargetSummary,
                      emotionalClosureSummary: authoritativeEmotionalClosureSummary,
                      embodimentClosureSummary: authoritativeEmbodimentClosureSummary,
                      preDialogueAwarenessSummary: authoritativeProjectStateAuditAwarenessSummary,
                      continuitySummary: buildProjectStateAuditContinuitySummary({
                        sameHerSummary: authoritativeProjectStateAuditSameHerSummary,
                        sameHerHoldDetail: resolvePreferredSameHerHoldDetail({
                          current: sanitizeText(projectStateAudit?.sameHerHoldDetail ?? '', '') || null,
                          candidate:
                            sanitizeText(runtimeDigestProjectState?.sameHerHoldDetail ?? '', '')
                            || sanitizeText(projectState?.sameHerHoldDetail ?? '', '')
                            || sanitizeText(preparedRuntimeProjectState?.sameHerHoldDetail ?? '', '')
                            || null,
                          continuityCue:
                            sanitizeText(projectStateAudit?.continuityCue ?? '', '')
                            || sanitizeText(runtimeDigestProjectState?.continuityCue ?? '', '')
                            || sanitizeText(projectState?.continuityCue ?? '', '')
                            || null,
                        }) ?? null,
                        continuityArcStage: sanitizeText(projectStateAudit?.continuityArcStage ?? '', '') || null,
                        continuityCue: sanitizeText(projectStateAudit?.continuityCue ?? '', '') || null,
                        sameHerDriftRiskSummary:
                          sanitizeText(projectStateAudit?.sameHerDriftRiskSummary ?? '', '')
                          || sanitizeText(runtimeDigestProjectState?.sameHerDriftRisk ?? '', '')
                          || sanitizeText(projectState?.sameHerDriftRisk ?? '', '')
                          || sanitizeText(preparedRuntimeProjectState?.sameHerDriftRisk ?? '', '')
                          || null,
                        currentPhaseSummary: authoritativeCurrentPhaseSummary,
                        landedProgressSummary: normalizedAuthoritativeLandedProgressSummary,
                        openClosureSummary: normalizedAuthoritativeOpenClosureSummary,
                        nextClosureTargetSummary: normalizedAuthoritativeNextClosureTargetSummary,
                        proactiveSameHerGapSummary:
                          sanitizeText(projectStateAudit?.proactiveSameHerGapSummary ?? '', '')
                          || sanitizeText(projectState?.proactiveSameHerGap ?? '', '')
                          || canonicalProjectState.proactiveSameHerGap
                          || null,
                        emotionalClosureSummary: authoritativeEmotionalClosureSummary,
                        embodimentClosureSummary: authoritativeEmbodimentClosureSummary,
                      }),
                    },
                  }
                : {}),
            },
          }
        : {}),
      projectState: {
        ...projectState,
        identity:
          sanitizeText(projectState?.identity ?? '', '')
          || sanitizeText(projectStateAudit?.currentPhaseSummary ?? '', '') && sanitizeText(projectState?.identity ?? '', '')
          || canonicalProjectState.identity,
        currentPhase:
          sanitizeText(projectState?.currentPhase ?? '', '')
          || sanitizeText(projectStateAudit?.currentPhaseSummary ?? '', '')
          || canonicalProjectState.currentPhase,
        latestLandedProgress:
          normalizedAuthoritativeLandedProgressSummary
          || (
            looksLikeThinProjectClosureCarry({
              value: normalizedTopLevelLatestLandedProgress,
              kind: 'landed',
            })
              ? canonicalHostVisibleLatestLandedProgress
              : normalizedTopLevelLatestLandedProgress
          )
          || canonicalHostVisibleLatestLandedProgress
          || null,
        primaryOpenLoop:
          (
            looksLikeThinProjectClosureCarry({
              value: normalizedTopLevelPrimaryOpenLoop,
              kind: 'open',
            })
              ? canonicalProjectState.openLoops?.[0] ?? null
              : normalizedTopLevelPrimaryOpenLoop
          )
          || canonicalProjectState.openLoops?.[0]
          || null,
        nextClosureTarget:
          (
            looksLikeThinProjectClosureCarry({
              value: normalizedTopLevelNextClosureTarget,
              kind: 'next',
            })
              ? canonicalProjectState.nextClosureTarget
              : normalizedTopLevelNextClosureTarget
          )
          || canonicalProjectState.nextClosureTarget,
        proactiveSameHerGap:
          sanitizeText(projectState?.proactiveSameHerGap ?? '', '')
          || sanitizeText(projectStateAudit?.proactiveSameHerGapSummary ?? '', '')
          || canonicalProjectState.proactiveSameHerGap,
        sameHerSelfLine: normalizedTopLevelSameHerSelfLine,
        sameHerDriftRisk:
          sanitizeText(projectState?.sameHerDriftRisk ?? '', '')
          || sanitizeText(projectStateAudit?.sameHerDriftRiskSummary ?? '', '')
          || canonicalProjectState.sameHerDriftRisk,
        preDialogueAwarenessLine: authoritativeAwarenessLine,
        awarenessLine: authoritativeAwarenessLine,
        companionHeadlineLine: authoritativeCompanionHeadlineLine,
        companionBriefingLine: authoritativeCompanionBriefingLine,
      },
      preDialogueAwareness: preDialogueAwareness
        ? {
            ...preDialogueAwareness,
            awarenessLine: authoritativeAwarenessLine,
            companionBriefingLine:
              sanitizeText(preDialogueAwareness?.companionBriefingLine ?? '', '')
              || authoritativeCompanionBriefingLine
              || null,
          }
        : {
            awarenessLine: authoritativeAwarenessLine,
            companionBriefingLine:
              authoritativeCompanionBriefingLine
              || authoritativeAwarenessLine,
          },
    })
  }

  const normalizeRecoveredResolvedReplyAwareness = (reply: AlicizationResolvedVisibleReply) => {
    const normalizedFullText = normalizeTopLevelProjectStateAwarenessFromRealization(reply.fullText)
    const effectiveFullText = normalizedFullText === reply.fullText
      ? reply.fullText
      : normalizedFullText
    const normalizedParsed = parseJsonObjectFromText(effectiveFullText)
    const normalizedVisibleReplyRealization = normalizedParsed?.visibleReplyRealization
      && typeof normalizedParsed.visibleReplyRealization === 'object'
      ? normalizedParsed.visibleReplyRealization as Record<string, unknown>
      : null
    const normalizedProjectStateAudit = normalizedVisibleReplyRealization?.projectStateAudit
      && typeof normalizedVisibleReplyRealization.projectStateAudit === 'object'
      ? normalizedVisibleReplyRealization.projectStateAudit as Record<string, unknown>
      : null

    const normalizedRealization = normalizedProjectStateAudit
      ? {
          ...reply.realization,
          projectStateAudit: {
            ...reply.realization.projectStateAudit,
            ...(typeof normalizedProjectStateAudit.preDialogueAwarenessSummary === 'string'
              ? {
                  preDialogueAwarenessSummary: normalizedProjectStateAudit.preDialogueAwarenessSummary,
                }
              : {}),
          } as typeof reply.realization.projectStateAudit,
        }
      : reply.realization

    return {
      ...reply,
      fullText: effectiveFullText,
      realization: normalizedRealization,
    }
  }

  const preserveVerbatimProjectAwarenessLineOnResolvedReply = (inputSurface: {
    reply: AlicizationResolvedVisibleReply
    exactAwarenessLine?: string | null
  }) => {
    const exactAwarenessLine = typeof inputSurface.exactAwarenessLine === 'string'
      ? inputSurface.exactAwarenessLine
      : null
    if (!exactAwarenessLine)
      return inputSurface.reply

    const parsed = parseJsonObjectFromText(inputSurface.reply.fullText)
    if (!parsed)
      return inputSurface.reply

    const projectState = parsed.projectState && typeof parsed.projectState === 'object'
      ? parsed.projectState as Record<string, unknown>
      : null
    const preDialogueAwareness = parsed.preDialogueAwareness && typeof parsed.preDialogueAwareness === 'object'
      ? parsed.preDialogueAwareness as Record<string, unknown>
      : null
    const preDialogueClosure = parsed.preDialogueClosure && typeof parsed.preDialogueClosure === 'object'
      ? parsed.preDialogueClosure as Record<string, unknown>
      : null
    const visibleReplyRealization = parsed.visibleReplyRealization && typeof parsed.visibleReplyRealization === 'object'
      ? parsed.visibleReplyRealization as Record<string, unknown>
      : null
    const projectStateAudit = visibleReplyRealization?.projectStateAudit
      && typeof visibleReplyRealization.projectStateAudit === 'object'
      ? visibleReplyRealization.projectStateAudit as Record<string, unknown>
      : null

    return {
      ...inputSurface.reply,
      realization: {
        ...inputSurface.reply.realization,
        projectStateAudit: inputSurface.reply.realization.projectStateAudit
          ? {
              ...inputSurface.reply.realization.projectStateAudit,
              preDialogueAwarenessSummary: exactAwarenessLine,
            }
          : inputSurface.reply.realization.projectStateAudit,
      },
      fullText: JSON.stringify({
        ...parsed,
        projectState: {
          ...projectState,
          preDialogueAwarenessLine: exactAwarenessLine,
          awarenessLine: exactAwarenessLine,
          preDialogueAwarenessSummary: exactAwarenessLine,
          companionHeadlineLine: exactAwarenessLine,
        },
        preDialogueAwareness: preDialogueAwareness
          ? {
              ...preDialogueAwareness,
              awarenessLine: exactAwarenessLine,
            }
          : {
              awarenessLine: exactAwarenessLine,
            },
        preDialogueClosure: preDialogueClosure
          ? {
              ...preDialogueClosure,
              summaryLine: exactAwarenessLine,
              companionBriefingLine:
                sanitizeText(preDialogueClosure?.companionBriefingLine ?? '', '')
                || exactAwarenessLine,
            }
          : {
              status: 'partial',
              summaryLine: exactAwarenessLine,
              companionBriefingLine: exactAwarenessLine,
            },
        visibleReplyRealization: visibleReplyRealization
          ? {
              ...visibleReplyRealization,
              projectStateAudit: projectStateAudit
                ? {
                    ...projectStateAudit,
                    preDialogueAwarenessSummary: exactAwarenessLine,
                  }
                : visibleReplyRealization.projectStateAudit,
            }
          : parsed.visibleReplyRealization,
      }),
    }
  }

  const resolveFinishPayloadVisibleReplyRealization = (fullText: string) => {
    const parsed = parseJsonObjectFromText(fullText)
    if (!parsed)
      return null
    const visibleReplyRealization = parsed.visibleReplyRealization
      && typeof parsed.visibleReplyRealization === 'object'
      ? parsed.visibleReplyRealization as Record<string, unknown>
      : null
    return visibleReplyRealization
  }

  const ensureStructuredProjectStateHostVisibleClosure = (inputSurface: {
    fullText: string
    resolvedReply?: AlicizationResolvedVisibleReply | null
    projectStateAudit?: Record<string, unknown> | null
  }) => {
    const parsed = parseJsonObjectFromText(inputSurface.fullText)
    if (!parsed)
      return inputSurface.fullText

    const visibleReplyRealization = parsed?.visibleReplyRealization
      && typeof parsed.visibleReplyRealization === 'object'
      ? parsed.visibleReplyRealization as Record<string, unknown>
      : null
    const projectStateAudit = visibleReplyRealization?.projectStateAudit
      && typeof visibleReplyRealization.projectStateAudit === 'object'
      ? visibleReplyRealization.projectStateAudit as Record<string, unknown>
      : null
    const selfAuthorityAudit = visibleReplyRealization?.selfAuthorityAudit
      && typeof visibleReplyRealization.selfAuthorityAudit === 'object'
      ? visibleReplyRealization.selfAuthorityAudit as Record<string, unknown>
      : null
    const projectState = parsed?.projectState
      && typeof parsed.projectState === 'object'
      ? parsed.projectState as Record<string, unknown>
      : null
    const runtimeDigest = parsed?.runtimeDigest
      && typeof parsed.runtimeDigest === 'object'
      ? parsed.runtimeDigest as Record<string, unknown>
      : null
    const runtimeDigestProjectState = runtimeDigest?.projectState
      && typeof runtimeDigest.projectState === 'object'
      ? runtimeDigest.projectState as Record<string, unknown>
      : null
    const preDialogueAwareness = parsed?.preDialogueAwareness
      && typeof parsed.preDialogueAwareness === 'object'
      ? parsed.preDialogueAwareness as Record<string, unknown>
      : null
    const preDialogueClosure = parsed?.preDialogueClosure
      && typeof parsed.preDialogueClosure === 'object'
      ? parsed.preDialogueClosure as Record<string, unknown>
      : null
    const projectStatePreDialogueAwarenessLine = sanitizeText(projectState?.preDialogueAwarenessLine ?? '', '') || null
    const projectStatePreflightSummary = sanitizeText(projectState?.preflightSummary ?? '', '') || null
    const projectStateAuditPreDialogueAwarenessSummary = sanitizeText(projectStateAudit?.preDialogueAwarenessSummary ?? '', '') || null
    const carriedProjectStateAudit = inputSurface.projectStateAudit
      && typeof inputSurface.projectStateAudit === 'object'
      ? inputSurface.projectStateAudit
      : null
    const effectiveProjectStateAudit = projectStateAudit ?? carriedProjectStateAudit
    const effectiveProjectStateAuditLandedProgressSummary = sanitizeText(effectiveProjectStateAudit?.landedProgressSummary ?? '', '') || null
    const effectiveProjectStateAuditOpenClosureSummary = sanitizeText(effectiveProjectStateAudit?.openClosureSummary ?? '', '') || null
    const effectiveProjectStateAuditNextClosureTargetSummary = sanitizeText(effectiveProjectStateAudit?.nextClosureTargetSummary ?? '', '') || null
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const preparedClosureSnapshot = buildPreparedProjectStateClosureSnapshot(prepared)
    const preparedRuntimeProjectState = resolvePreparedRuntimeProjectState(prepared)
    const preferredCompanionBriefingLine
      = sanitizeText(runtimeDigestProjectState?.companionBriefingLine ?? '', '')
        || sanitizeText(preparedRuntimeProjectState?.companionBriefingLine ?? '', '')
        || sanitizeText(projectState?.companionBriefingLine ?? '', '')
        || sanitizeText(preDialogueAwareness?.companionBriefingLine ?? '', '')
        || sanitizeText(preDialogueClosure?.companionBriefingLine ?? '', '')
        || rawPayloadCompanionBriefingLine
        || resolvePayloadExplicitCompanionBriefingLine(payload)
        || null
    const preferredProjectStatePreflightSummary = resolvePreferredHostVisibleProjectPreflightSummary({
      rawPayloadSummary: input.payload.preDialogueSendIdentity?.summaryLine ?? null,
      normalizedPayloadSummary: payload.preDialogueSendIdentity?.summaryLine ?? null,
      preparedClosureSummary: preparedClosureSnapshot?.projectStatePreflightSummary ?? null,
      runtimeDigestSummary: runtimeDigestProjectState?.preflightSummary as string | null | undefined,
      preparedRuntimeSummary: preparedRuntimeProjectState?.preflightSummary ?? null,
      structuredProjectStateSummary: projectState?.preflightSummary as string | null | undefined,
      canonicalSummary: canonicalProjectState.preflightSummary ?? null,
    })

    if (
      projectState
      && effectiveProjectStateAudit
      && projectStatePreDialogueAwarenessLine
      && projectStatePreflightSummary
      && projectStateAuditPreDialogueAwarenessSummary
      && projectStatePreDialogueAwarenessLine === projectStateAuditPreDialogueAwarenessSummary
      && !looksLikeThinProjectAwarenessShell(projectStatePreDialogueAwarenessLine)
      && !looksLikeStructuredProjectAwarenessSummaryShell(projectStatePreDialogueAwarenessLine)
      && !looksLikeGeneratedProjectAwarenessExpansion(projectStatePreDialogueAwarenessLine)
      && projectStatePreflightSummary === preferredProjectStatePreflightSummary
      && sanitizeText(projectState?.identity ?? '', '')
      && sanitizeText(projectState?.currentPhase ?? '', '')
      && (
        !preferredCompanionBriefingLine
        || sanitizeText(preDialogueAwareness?.companionBriefingLine ?? '', '')
        || sanitizeText(preDialogueClosure?.companionBriefingLine ?? '', '')
      )
      && (
        sanitizeText(projectState?.latestLandedProgress ?? '', '')
        || sanitizeText(projectState?.primaryOpenLoop ?? '', '')
        || sanitizeText(projectState?.nextClosureTarget ?? '', '')
      )
    ) {
      return inputSurface.fullText
    }

    const existingPerformance = parsed?.performance && typeof parsed.performance === 'object'
      ? parsed.performance as Record<string, unknown>
      : null
    const existingDigitalLifeSpine = parsed?.digitalLifeSpine && typeof parsed.digitalLifeSpine === 'object'
      ? parsed.digitalLifeSpine as Record<string, unknown>
      : null
    const existingRuntimeDigest = runtimeDigest
    const preparedSelfContinuityAuthority = resolvePreparedRuntimeSelfContinuityAuthority(prepared)
    const shouldRebuildThinProjectStateFromResolvedReply = Boolean(
      projectState
      && effectiveProjectStateAudit
      && (
        looksLikeThinProjectAwarenessShell(projectStateAuditPreDialogueAwarenessSummary)
        || looksLikeThinProjectClosureCarry({
          value: effectiveProjectStateAuditLandedProgressSummary,
          kind: 'landed',
        })
        || looksLikeThinProjectClosureCarry({
          value: effectiveProjectStateAuditOpenClosureSummary,
          kind: 'open',
        })
        || looksLikeThinProjectClosureCarry({
          value: effectiveProjectStateAuditNextClosureTargetSummary,
          kind: 'next',
        })
      ),
    )
    const shouldRebuildFromResolvedReply = Boolean(
      inputSurface.resolvedReply
      && (
        !projectState
        || !effectiveProjectStateAudit
        || (!selfAuthorityAudit && preparedSelfContinuityAuthority)
        || shouldRebuildThinProjectStateFromResolvedReply
      ),
    )

    if (inputSurface.resolvedReply && shouldRebuildFromResolvedReply) {
      const rebuiltResolvedReplyFullText = buildHostVisibleResolvedReply(inputSurface.resolvedReply).fullText
      const rebuiltParsed = parseJsonObjectFromText(rebuiltResolvedReplyFullText)
      if (!rebuiltParsed)
        return rebuiltResolvedReplyFullText

      return JSON.stringify({
        ...rebuiltParsed,
        ...(existingPerformance ? { performance: existingPerformance } : {}),
        ...(existingDigitalLifeSpine ? { digitalLifeSpine: existingDigitalLifeSpine } : {}),
        ...(existingRuntimeDigest ? { runtimeDigest: existingRuntimeDigest } : {}),
        ...(typeof parsed?.thought === 'string' ? { thought: parsed.thought } : {}),
        ...(typeof parsed?.reply === 'string' ? { reply: parsed.reply } : {}),
      })
    }

    const withStructuredAudit = ensureStructuredVisibleReplyProjectStateAudit({
      fullText: inputSurface.fullText,
      projectStateAudit: carriedProjectStateAudit ?? null,
    })
    const structuredParsed = parseJsonObjectFromText(withStructuredAudit)
    if (!structuredParsed)
      return withStructuredAudit

    const structuredVisibleReplyRealization = structuredParsed.visibleReplyRealization
      && typeof structuredParsed.visibleReplyRealization === 'object'
      ? structuredParsed.visibleReplyRealization as Record<string, unknown>
      : null
    const structuredProjectStateAudit = structuredVisibleReplyRealization?.projectStateAudit
      && typeof structuredVisibleReplyRealization.projectStateAudit === 'object'
      ? structuredVisibleReplyRealization.projectStateAudit as Record<string, unknown>
      : null
    const structuredProjectState = structuredParsed.projectState
      && typeof structuredParsed.projectState === 'object'
      ? structuredParsed.projectState as Record<string, unknown>
      : null
    const structuredRuntimeDigest = structuredParsed.runtimeDigest
      && typeof structuredParsed.runtimeDigest === 'object'
      ? structuredParsed.runtimeDigest as Record<string, unknown>
      : null
    const structuredRuntimeDigestProjectState = structuredRuntimeDigest?.projectState
      && typeof structuredRuntimeDigest.projectState === 'object'
      ? structuredRuntimeDigest.projectState as Record<string, unknown>
      : null
    const structuredPreDialogueAwareness = structuredParsed.preDialogueAwareness
      && typeof structuredParsed.preDialogueAwareness === 'object'
      ? structuredParsed.preDialogueAwareness as Record<string, unknown>
      : null
    const structuredPreDialogueClosure = structuredParsed.preDialogueClosure
      && typeof structuredParsed.preDialogueClosure === 'object'
      ? structuredParsed.preDialogueClosure as Record<string, unknown>
      : null

    if (!structuredProjectStateAudit)
      return withStructuredAudit

    const structuredSameHerSelfLine = strengthenSameHerSelfLineForPersistence(preferStrongerSameHerProjectStateText({
      current: preferStrongerSameHerProjectStateText({
        current: sanitizeText(structuredProjectStateAudit?.sameHerSummary ?? '', ''),
        candidate: sanitizeText(structuredProjectState?.sameHerSelfLine ?? '', ''),
      }),
      candidate: canonicalProjectState.sameHerSelfLine,
    })) ?? canonicalProjectState.sameHerSelfLine
    const structuredCompanionBriefingLine
      = sanitizeText(structuredRuntimeDigestProjectState?.companionBriefingLine ?? '', '')
        || sanitizeText(preparedRuntimeProjectState?.companionBriefingLine ?? '', '')
        || sanitizeText(structuredProjectState?.companionBriefingLine ?? '', '')
        || sanitizeText(structuredPreDialogueAwareness?.companionBriefingLine ?? '', '')
        || sanitizeText(structuredPreDialogueClosure?.companionBriefingLine ?? '', '')
        || rawPayloadCompanionBriefingLine
        || resolvePayloadExplicitCompanionBriefingLine(payload)
        || null
    const structuredPreferredAwarenessLineBase = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine:
          sanitizeText(structuredRuntimeDigestProjectState?.preDialogueAwarenessLine ?? '', '')
          || sanitizeText(preparedRuntimeProjectState?.preDialogueAwarenessLine ?? '', '')
          || sanitizeText(structuredProjectState?.preDialogueAwarenessLine ?? '', '')
          || null,
        awarenessLine:
          sanitizeText(structuredRuntimeDigestProjectState?.awarenessLine ?? '', '')
          || sanitizeText(preparedRuntimeProjectState?.awarenessLine ?? '', '')
          || sanitizeText(structuredProjectState?.awarenessLine ?? '', '')
          || sanitizeText(structuredPreDialogueAwareness?.awarenessLine ?? '', '')
          || null,
        companionHeadlineLine:
          sanitizeText(structuredRuntimeDigestProjectState?.companionHeadlineLine ?? '', '')
          || sanitizeText(preparedRuntimeProjectState?.companionHeadlineLine ?? '', '')
          || sanitizeText(structuredProjectState?.companionHeadlineLine ?? '', '')
          || null,
        companionBriefingLine: structuredCompanionBriefingLine,
        preDialogueAwarenessSummary: sanitizeText(structuredProjectStateAudit?.preDialogueAwarenessSummary ?? '', '') || null,
        preflightSummary: preferredProjectStatePreflightSummary,
      },
    })
    const structuredProjectStateAuditAwarenessSummary
      = sanitizeText(structuredProjectStateAudit?.preDialogueAwarenessSummary ?? '', '') || null
    const structuredExplicitProjectStateAuditAwarenessSummary
      = structuredProjectStateAuditAwarenessSummary
        && !looksLikeThinProjectAwarenessShell(structuredProjectStateAuditAwarenessSummary)
        && !looksLikeCanonicalProjectAwarenessReanchor(structuredProjectStateAuditAwarenessSummary)
        && !looksLikeStructuredProjectAwarenessSummaryShell(structuredProjectStateAuditAwarenessSummary)
        && !looksLikeGeneratedProjectAwarenessExpansion(structuredProjectStateAuditAwarenessSummary)
        ? structuredProjectStateAuditAwarenessSummary
        : null
    const structuredPreferredAwarenessLineRaw
      = structuredPreferredAwarenessLineBase
        && structuredProjectStateAuditAwarenessSummary
        && structuredPreferredAwarenessLineBase !== structuredProjectStateAuditAwarenessSummary
        && structuredPreferredAwarenessLineBase === structuredCompanionBriefingLine
        ? structuredProjectStateAuditAwarenessSummary
        : structuredPreferredAwarenessLineBase
          ?? canonicalProjectState.preDialogueAwarenessLine
    const structuredPreferredAwarenessLine = (() => {
      const preferredAwarenessLine = sanitizeText(preferExplicitProjectAwarenessOverCanonicalReanchor({
        current: structuredPreferredAwarenessLineRaw,
        candidate: structuredExplicitProjectStateAuditAwarenessSummary,
      }) ?? structuredPreferredAwarenessLineRaw ?? '', '') || null
      if (!preferredAwarenessLine)
        return canonicalProjectState.preDialogueAwarenessLine

      const preferredLooksWeak = looksLikeThinProjectAwarenessShell(preferredAwarenessLine)
        || looksLikeCanonicalProjectAwarenessReanchor(preferredAwarenessLine)
        || looksLikeGeneratedProjectAwarenessExpansion(preferredAwarenessLine)
        || looksLikeStructuredProjectAwarenessSummaryShell(preferredAwarenessLine)

      if (!preferredLooksWeak)
        return preferredAwarenessLine

      return structuredExplicitProjectStateAuditAwarenessSummary
        ?? canonicalProjectState.preDialogueAwarenessLine
        ?? structuredProjectStateAuditAwarenessSummary
        ?? preferredAwarenessLine
    })()
    const structuredPreferredCompanionHeadlineLine
      = preferProjectAwareClosureSummary({
        current:
            sanitizeText(structuredRuntimeDigestProjectState?.companionHeadlineLine ?? '', '')
            || sanitizeText(preparedRuntimeProjectState?.companionHeadlineLine ?? '', '')
            || sanitizeText(structuredProjectState?.companionHeadlineLine ?? '', '')
            || null,
        candidate: structuredPreferredAwarenessLine,
      })
      || structuredPreferredAwarenessLine
    const structuredLatestLandedProgress = (() => {
      const projectStateLatestLandedProgress = sanitizeText(structuredProjectState?.latestLandedProgress ?? '', '') || null
      const auditLandedProgressSummary = sanitizeText(structuredProjectStateAudit?.landedProgressSummary ?? '', '') || null
      if (
        carriesGovernanceTailProjectProgress(auditLandedProgressSummary)
        && !carriesGovernanceTailProjectProgress(projectStateLatestLandedProgress)
      ) {
        return auditLandedProgressSummary
      }

      return preferFullCanonicalProjectStateTextWhenCurrentIsTruncated({
        current: preferExplicitProjectClosureCarryOverCanonical({
          current: projectStateLatestLandedProgress,
          candidate: auditLandedProgressSummary,
          canonical: canonicalProjectState.continuityProgressSummary ?? null,
          kind: 'landed',
        }),
        canonical: canonicalProjectState.continuityProgressSummary ?? null,
      })
    })()
    const structuredPrimaryOpenLoop = preferExplicitProjectClosureCarryOverCanonical({
      current: sanitizeText(structuredProjectState?.primaryOpenLoop ?? '', '') || null,
      candidate: sanitizeText(structuredProjectStateAudit?.openClosureSummary ?? '', '') || null,
      canonical: canonicalProjectState.openLoops?.[0] ?? null,
      kind: 'open',
    })
    const structuredNextClosureTarget = preferFullCanonicalProjectStateTextWhenCurrentIsTruncated({
      current: preferExplicitProjectClosureCarryOverCanonical({
        current: sanitizeText(structuredProjectState?.nextClosureTarget ?? '', '') || null,
        candidate: sanitizeText(structuredProjectStateAudit?.nextClosureTargetSummary ?? '', '') || null,
        canonical: canonicalProjectState.nextClosureTarget,
        kind: 'next',
      }),
      canonical: canonicalProjectState.nextClosureTarget,
    })

    return JSON.stringify({
      ...structuredParsed,
      projectState: {
        ...structuredProjectState,
        identity:
          sanitizeText(structuredProjectState?.identity ?? '', '')
          || sanitizeText(structuredProjectStateAudit?.identity ?? '', '')
          || canonicalProjectState.identity,
        currentPhase:
          sanitizeText(structuredProjectState?.currentPhase ?? '', '')
          || sanitizeText(structuredProjectStateAudit?.currentPhaseSummary ?? '', '')
          || canonicalProjectState.currentPhase,
        latestLandedProgress:
          structuredLatestLandedProgress
          || canonicalProjectState.continuityProgressSummary
          || null,
        primaryOpenLoop:
          structuredPrimaryOpenLoop
          || canonicalProjectState.openLoops?.[0]
          || null,
        nextClosureTarget:
          structuredNextClosureTarget
          || canonicalProjectState.nextClosureTarget,
        sameHerSelfLine: structuredSameHerSelfLine,
        sameHerDriftRisk:
          sanitizeText(structuredProjectState?.sameHerDriftRisk ?? '', '')
          || canonicalProjectState.sameHerDriftRisk,
        preflightSummary: preferredProjectStatePreflightSummary,
        preDialogueAwarenessLine: structuredPreferredAwarenessLine,
        awarenessLine: structuredPreferredAwarenessLine,
        companionHeadlineLine: structuredPreferredCompanionHeadlineLine,
        companionBriefingLine: structuredCompanionBriefingLine,
      },
      preDialogueAwareness: structuredPreDialogueAwareness
        ? {
            ...structuredPreDialogueAwareness,
            awarenessLine: structuredPreferredAwarenessLine,
            companionBriefingLine:
              sanitizeText(structuredPreDialogueAwareness?.companionBriefingLine ?? '', '')
              || sanitizeText(structuredPreDialogueClosure?.companionBriefingLine ?? '', '')
              || structuredCompanionBriefingLine,
          }
        : {
            awarenessLine: structuredPreferredAwarenessLine,
            companionBriefingLine: structuredCompanionBriefingLine,
          },
    })
  }

  const ensureStructuredVisibleReplyProjectStateAudit = (inputSurface: {
    fullText: string
    projectStateAudit?: Record<string, unknown> | null
  }) => {
    const parsed = parseJsonObjectFromText(inputSurface.fullText)
    if (!parsed)
      return inputSurface.fullText

    const existingVisibleReplyRealization = parsed.visibleReplyRealization
      && typeof parsed.visibleReplyRealization === 'object'
      ? parsed.visibleReplyRealization as Record<string, unknown>
      : null
    const existingStructuredProjectState = parsed.projectState
      && typeof parsed.projectState === 'object'
      ? parsed.projectState as Record<string, unknown>
      : null
    const existingStructuredRuntimeDigest = parsed.runtimeDigest
      && typeof parsed.runtimeDigest === 'object'
      ? parsed.runtimeDigest as Record<string, unknown>
      : null
    const existingStructuredRuntimeDigestProjectState = existingStructuredRuntimeDigest?.projectState
      && typeof existingStructuredRuntimeDigest.projectState === 'object'
      ? existingStructuredRuntimeDigest.projectState as Record<string, unknown>
      : null
    const existingProjectStateAudit = existingVisibleReplyRealization?.projectStateAudit
      && typeof existingVisibleReplyRealization.projectStateAudit === 'object'
      ? existingVisibleReplyRealization.projectStateAudit as Record<string, unknown>
      : null
    const carriedProjectStateAudit = inputSurface.projectStateAudit
      && typeof inputSurface.projectStateAudit === 'object'
      ? inputSurface.projectStateAudit
      : null

    if (!existingProjectStateAudit && !carriedProjectStateAudit)
      return inputSurface.fullText

    const mergedProjectStateAudit = {
      ...existingProjectStateAudit,
      ...carriedProjectStateAudit,
    } as Record<string, unknown>
    const mergedProjectStateAuditSameHerSummary = sanitizeText(mergedProjectStateAudit.sameHerSummary, '') || null
    const mergedProjectStateAuditSameHerHoldDetail = sanitizeText(mergedProjectStateAudit.sameHerHoldDetail, '') || null
    const mergedProjectStateAuditContinuityArcStage = sanitizeText(mergedProjectStateAudit.continuityArcStage, '') || null
    const mergedProjectStateAuditContinuityCue = sanitizeText(mergedProjectStateAudit.continuityCue, '') || null
    const preferredSameHerHoldDetail = resolvePreferredSameHerHoldDetail({
      current: resolvePreferredSameHerHoldDetail({
        current: sanitizeText(existingProjectStateAudit?.sameHerHoldDetail ?? '', '') || null,
        candidate: sanitizeText(carriedProjectStateAudit?.sameHerHoldDetail ?? '', '') || null,
        continuityCue: mergedProjectStateAuditContinuityCue,
      }),
      candidate:
        sanitizeText(existingStructuredProjectState?.sameHerHoldDetail ?? '', '')
        || sanitizeText(existingStructuredRuntimeDigestProjectState?.sameHerHoldDetail ?? '', '')
        || null,
      continuityCue: mergedProjectStateAuditContinuityCue,
    })
    const preferredSameHerSummary = preferStrongerSameHerProjectStateText({
      current: looksLikeSameHerSelfLine(existingProjectStateAudit?.sameHerSummary as string | null | undefined)
        ? sanitizeText(existingProjectStateAudit?.sameHerSummary, '')
        : null,
      candidate: looksLikeSameHerSelfLine(carriedProjectStateAudit?.sameHerSummary as string | null | undefined)
        ? sanitizeText(carriedProjectStateAudit?.sameHerSummary, '')
        : null,
    })
    const mergedProjectStateAuditProactiveSameHerGapSummary = preferRicherProjectStateAuditText({
      current: sanitizeText(existingProjectStateAudit?.proactiveSameHerGapSummary ?? '', '') || null,
      candidate:
        sanitizeText(carriedProjectStateAudit?.proactiveSameHerGapSummary ?? '', '')
        || sanitizeText(existingStructuredProjectState?.proactiveSameHerGap ?? '', '')
        || sanitizeText(existingStructuredRuntimeDigestProjectState?.proactiveSameHerGap ?? '', '')
        || null,
    })
    const normalizedProjectStateAudit = {
      ...mergedProjectStateAudit,
      sameHerSummary: preferredSameHerSummary ?? mergedProjectStateAuditSameHerSummary,
      sameHerHoldDetail: preferredSameHerHoldDetail ?? mergedProjectStateAuditSameHerHoldDetail,
      continuityArcStage: mergedProjectStateAuditContinuityArcStage,
      continuityCue: mergedProjectStateAuditContinuityCue,
      proactiveSameHerGapSummary: mergedProjectStateAuditProactiveSameHerGapSummary,
      continuitySummary: buildProjectStateAuditContinuitySummary({
        sameHerSummary:
          preferredSameHerSummary
          ?? mergedProjectStateAuditSameHerSummary,
        sameHerHoldDetail:
          preferredSameHerHoldDetail
          ?? mergedProjectStateAuditSameHerHoldDetail,
        continuityArcStage: mergedProjectStateAuditContinuityArcStage,
        continuityCue: mergedProjectStateAuditContinuityCue,
        sameHerDriftRiskSummary: preferRicherProjectStateAuditText({
          current: sanitizeText(existingProjectStateAudit?.sameHerDriftRiskSummary ?? '', '') || null,
          candidate: sanitizeText(carriedProjectStateAudit?.sameHerDriftRiskSummary ?? '', '') || null,
        }),
        currentPhaseSummary: preferRicherProjectStateAuditText({
          current: sanitizeText(existingProjectStateAudit?.currentPhaseSummary ?? '', '') || null,
          candidate: sanitizeText(carriedProjectStateAudit?.currentPhaseSummary ?? '', '') || null,
        }),
        landedProgressSummary: preferRicherProjectStateAuditText({
          current: sanitizeText(existingProjectStateAudit?.landedProgressSummary ?? '', '') || null,
          candidate: sanitizeText(carriedProjectStateAudit?.landedProgressSummary ?? '', '') || null,
        }),
        openClosureSummary: preferRicherProjectStateAuditText({
          current: sanitizeText(existingProjectStateAudit?.openClosureSummary ?? '', '') || null,
          candidate: sanitizeText(carriedProjectStateAudit?.openClosureSummary ?? '', '') || null,
        }),
        nextClosureTargetSummary: preferRicherProjectStateAuditText({
          current: sanitizeText(existingProjectStateAudit?.nextClosureTargetSummary ?? '', '') || null,
          candidate: sanitizeText(carriedProjectStateAudit?.nextClosureTargetSummary ?? '', '') || null,
        }),
        proactiveSameHerGapSummary: mergedProjectStateAuditProactiveSameHerGapSummary,
        emotionalClosureSummary: preferRicherProjectStateAuditText({
          current: sanitizeText(existingProjectStateAudit?.emotionalClosureSummary ?? '', '') || null,
          candidate: sanitizeText(carriedProjectStateAudit?.emotionalClosureSummary ?? '', '') || null,
        }),
        embodimentClosureSummary: preferProjectStateEmbodimentClosureSummary({
          current: sanitizeText(existingProjectStateAudit?.embodimentClosureSummary ?? '', '') || null,
          candidate: sanitizeText(carriedProjectStateAudit?.embodimentClosureSummary ?? '', '') || null,
        }),
      }),
    }

    return JSON.stringify({
      ...parsed,
      visibleReplyRealization: {
        ...existingVisibleReplyRealization,
        projectStateAudit: normalizedProjectStateAudit,
      },
    })
  }

  const carriesRecoveredStructuredLifeAuthority = (fullText: string | null | undefined) => {
    const parsed = parseJsonObjectFromText(typeof fullText === 'string' ? fullText : '')
    if (!parsed)
      return false

    const performance = parsed.performance && typeof parsed.performance === 'object'
      ? parsed.performance as Record<string, unknown>
      : null
    const projectState = parsed.projectState && typeof parsed.projectState === 'object'
      ? parsed.projectState as Record<string, unknown>
      : null
    const digitalLifeSpine = parsed.digitalLifeSpine && typeof parsed.digitalLifeSpine === 'object'
      ? parsed.digitalLifeSpine as Record<string, unknown>
      : null
    const runtimeDigest = parsed.runtimeDigest && typeof parsed.runtimeDigest === 'object'
      ? parsed.runtimeDigest as Record<string, unknown>
      : null

    return Boolean(
      sanitizeText(performance?.actionCue, '')
      || sanitizeText(projectState?.sameHerSelfLine, '')
      || sanitizeText(projectState?.preDialogueAwarenessLine, '')
      || digitalLifeSpine
      || runtimeDigest,
    )
  }

  const emitVisibleReplyFallbackIfMissing = (fullText: string) => {
    const visibleText = deriveAlicizationVisibleReplyText(fullText)
    if (!visibleText || releasedVisibleReplyText)
      return false
    emitStreamEmbodimentMeta(visibleText)
    emitVisibleChunk(visibleText)
    return true
  }

  const closeStructuredVisibleReplyIfNeeded = async (rewriteInput: {
    fullText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
    forceRewrite?: boolean
    forceReasonCodes?: string[]
    forceMustPreserve?: string[]
  }) => {
    if (!prepared)
      return null

    const latestUserMessage = [...conversationMessages].reverse().find(message => message?.role === 'user')
    const latestUserText = sanitizeText(latestUserMessage?.content, '')
    if (!latestUserText)
      return null

    try {
      const settled = await settleAlicizationVisibleReply({
        draft: {
          fullText: rewriteInput.fullText,
          visibleReplyExecution: rewriteInput.visibleReplyExecution,
        },
        prepared,
        forceRewrite: rewriteInput.forceRewrite,
        forceReasonCodes: rewriteInput.forceReasonCodes,
        forceMustPreserve: rewriteInput.forceMustPreserve,
        rewriteSecondPass: async secondPassInput => await rewriteAlicizationVisibleReplySecondPass({
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          sessionId: prepared!.conversationSessionId,
          userText: latestUserText,
          rawFullText: secondPassInput.fullText,
          prepared: prepared!,
          visibleReplyExecution: secondPassInput.visibleReplyExecution,
          forceRewrite: secondPassInput.forceRewrite,
          forceReasonCodes: secondPassInput.forceReasonCodes,
          mustPreserve: secondPassInput.mustPreserve,
          headers: input.headers,
          provider: async ({ chatConfig, messages, headers, timeoutMs }) => {
            return await generateAlicizationMainChatNonStreaming({
              chatConfig,
              messages,
              headers,
              emotionalKernel: resolvePreparedMainChatOneShotEmotionalKernel(prepared),
              timeoutMs,
            })
          },
          appendRuntimeDebugLine: input.appendRuntimeDebugLine,
        }),
      })
      const settledFullText = sanitizeText(settled.fullText, '')
      return {
        fullText: settledFullText || rewriteInput.fullText,
        visibleReplyExecution: settled.visibleReplyExecution,
        critic: settled.realization.critic ?? null,
        closure: settled.realization.closure ?? null,
        projectStateAudit: settled.realization.projectStateAudit ?? null,
      }
    }
    catch (error) {
      const closure = error instanceof AlicizationVisibleReplyClosureBlockedError
        ? error.closure
        : null
      await input.appendRuntimeDebugLine('chat-stream.visible-reply-second-pass-failed', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        reason: error instanceof Error ? error.message : String(error),
        closureStatus: closure?.status ?? null,
        closureReasonCodes: closure?.reasonCodes ?? [],
      })
      const reachability = await input.ensureMainGatewayReachable(input.mainGateway, { bypassCache: true }).catch(() => null)
      if (reachability?.reachable !== false) {
        throw new AlicizationMindAuthoredReplyRequiredError(
          `visible-reply-second-pass-required:${error instanceof Error ? error.message : String(error)}`,
        )
      }
      const blockedTransportFailure = buildAlicizationSecondPassTransportFailureReply({
        governedStructured: parseJsonObjectFromText(rewriteInput.fullText),
        previousExecution: rewriteInput.visibleReplyExecution,
        reason: error instanceof Error ? error.message : String(error),
        prepared,
      })
      await input.appendRuntimeDebugLine('chat-stream.visible-reply-second-pass-local-fallback-blocked', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        reason: blockedTransportFailure.visibleReplyExecution.reason,
        gatewayReachable: reachability?.reachable ?? null,
        gatewayReason: reachability?.reason ?? null,
        closureReasonCodes: closure?.reasonCodes ?? [],
      })
      throw new AlicizationMindAuthoredReplyRequiredError(
        `visible-reply-second-pass-required:${blockedTransportFailure.visibleReplyExecution.reason}`,
      )
    }
  }

  const rewriteStructuredVisibleReplyIfNeeded = async (rewriteInput: {
    fullText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
    forceRewrite?: boolean
    forceReasonCodes?: string[]
    forceMustPreserve?: string[]
    projectStateSameHerSummary?: string | null
    projectStateSameHerHoldDetail?: string | null
    projectStateContinuityArcStage?: string | null
    projectStateContinuityCue?: string | null
    projectStateCurrentPhaseSummary?: string | null
    projectStateLandedProgressSummary?: string | null
    projectStateOpenClosureSummary?: string | null
    projectStateNextClosureTargetSummary?: string | null
    projectStateSameHerDriftRiskSummary?: string | null
    projectStateProactiveSameHerGapSummary?: string | null
    emotionalClosureSummary?: string | null
    projectStatePreDialogueAwarenessSummary?: string | null
  }) => {
    const criticPreflight = buildAlicizationVisibleReplyCriticArtifact({
      fullText: rewriteInput.fullText,
      visibleReplyExecution: rewriteInput.visibleReplyExecution,
      prepared: prepared!,
    })
    const forceRewrite = rewriteInput.forceRewrite || criticPreflight.status === 'repair-required'
    const forceReasonCodes = Array.from(new Set([
      ...(rewriteInput.forceReasonCodes ?? []),
      ...(forceRewrite ? criticPreflight.repairReasonCodes : []),
    ]))
    const forceMustPreserve = Array.from(new Set([
      ...(rewriteInput.forceMustPreserve ?? []),
      ...(forceRewrite ? criticPreflight.mustPreserve : []),
    ]))
    const closed = await closeStructuredVisibleReplyIfNeeded({
      ...rewriteInput,
      forceRewrite,
      forceReasonCodes,
      forceMustPreserve,
    })
    if (!closed)
      return null
    latestSettledProjectStateAudit = closed.projectStateAudit && typeof closed.projectStateAudit === 'object'
      ? closed.projectStateAudit as Record<string, unknown>
      : null
    return {
      fullText: closed.fullText,
      visibleReplyExecution: closed.visibleReplyExecution,
      critic: closed.critic,
      closure: closed.closure,
      settledProjectStateAudit: closed.projectStateAudit ?? null,
      projectStateSameHerSummary: preferStrongerSameHerProjectStateText({
        current: sanitizeText((closed.projectStateAudit as { sameHerSummary?: unknown } | null)?.sameHerSummary, ''),
        candidate: rewriteInput.projectStateSameHerSummary,
      }) || null,
      projectStateSameHerHoldDetail: resolvePreferredSameHerHoldDetail({
        current: sanitizeText((closed.projectStateAudit as { sameHerHoldDetail?: unknown } | null)?.sameHerHoldDetail, ''),
        candidate: rewriteInput.projectStateSameHerHoldDetail,
        continuityCue:
          sanitizeText((closed.projectStateAudit as { continuityCue?: unknown } | null)?.continuityCue, '')
          || rewriteInput.projectStateContinuityCue
          || null,
      }) || null,
      projectStateContinuityArcStage: preferRicherProjectStateAuditText({
        current: sanitizeText((closed.projectStateAudit as { continuityArcStage?: unknown } | null)?.continuityArcStage, ''),
        candidate: rewriteInput.projectStateContinuityArcStage,
      }) || null,
      projectStateContinuityCue: preferRicherProjectStateAuditText({
        current: sanitizeText((closed.projectStateAudit as { continuityCue?: unknown } | null)?.continuityCue, ''),
        candidate: rewriteInput.projectStateContinuityCue,
      }) || null,
      projectStateCurrentPhaseSummary: sanitizeText((closed.projectStateAudit as { currentPhaseSummary?: unknown } | null)?.currentPhaseSummary, '')
        || rewriteInput.projectStateCurrentPhaseSummary
        || null,
      projectStateLandedProgressSummary: sanitizeText((closed.projectStateAudit as { landedProgressSummary?: unknown } | null)?.landedProgressSummary, '')
        || rewriteInput.projectStateLandedProgressSummary
        || null,
      projectStateOpenClosureSummary: sanitizeText((closed.projectStateAudit as { openClosureSummary?: unknown } | null)?.openClosureSummary, '')
        || rewriteInput.projectStateOpenClosureSummary
        || null,
      projectStateSameHerDriftRiskSummary: sanitizeText((closed.projectStateAudit as { sameHerDriftRiskSummary?: unknown } | null)?.sameHerDriftRiskSummary, '')
        || rewriteInput.projectStateSameHerDriftRiskSummary
        || null,
      projectStateProactiveSameHerGapSummary: sanitizeText((closed.projectStateAudit as { proactiveSameHerGapSummary?: unknown } | null)?.proactiveSameHerGapSummary, '')
        || rewriteInput.projectStateProactiveSameHerGapSummary
        || null,
      projectStateNextClosureTargetSummary: sanitizeText((closed.projectStateAudit as { nextClosureTargetSummary?: unknown } | null)?.nextClosureTargetSummary, '')
        || rewriteInput.projectStateNextClosureTargetSummary
        || null,
      emotionalClosureSummary: preferRicherProjectStateAuditText({
        current: sanitizeText((closed.projectStateAudit as { emotionalClosureSummary?: unknown } | null)?.emotionalClosureSummary, ''),
        candidate: rewriteInput.emotionalClosureSummary,
      }) || null,
      projectStatePreDialogueAwarenessSummary: sanitizeText((closed.projectStateAudit as { preDialogueAwarenessSummary?: unknown } | null)?.preDialogueAwarenessSummary, '')
        || rewriteInput.projectStatePreDialogueAwarenessSummary
        || null,
    }
  }

  const syncVisibleReplyExecutionFromPreparedPlan = (override?: {
    mode?: AlicizationVisibleReplyExecution['mode']
    actualVisibleReplyAuthority?: AlicizationVisibleReplyExecution['actualVisibleReplyAuthority']
    providerMindExecuted?: boolean
    reason?: string | null
  }) => {
    if (!prepared)
      return

    currentVisibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared,
      mode: override?.mode,
      actualVisibleReplyAuthority: override?.actualVisibleReplyAuthority,
      providerMindExecuted: override?.providerMindExecuted,
      reason: override?.reason,
    })
  }

  const attemptDeterministicRequiredToolRecovery = async (recoveryInput: {
    error?: unknown
    origin: 'execution-first' | 'stream' | 'timeout-recovery'
    requiredToolNames?: string[]
    toolInputOverrides?: Record<string, Record<string, unknown>>
  }) => {
    if (!prepared || !input.isRunActive())
      return null

    const requiredToolNames = resolveDeterministicRequiredToolNames({
      error: recoveryInput.error,
      fallbackToolNames: recoveryInput.requiredToolNames?.length
        ? recoveryInput.requiredToolNames
        : prepared.runtimeSurface?.tooling?.enforcedToolNames,
    })
    if (requiredToolNames.length === 0)
      return null
    if (!Array.isArray(prepared.tools) || prepared.tools.length === 0)
      return null

    const recoveryStartAudit = recoveryInput.origin === 'execution-first'
      ? {
          level: 'notice' as const,
          action: 'execution-first-inline-started',
          message: 'Explicit execution turn routed directly into deterministic executor dispatch before model streaming.',
        }
      : {
          level: 'warning' as const,
          action: 'required-tool-recovery-started',
          message: 'Model skipped required executor tool call; switched to deterministic executor recovery.',
        }
    await input.appendRuntimeDebugLine('chat-stream.required-tool-recovery-started', {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      origin: recoveryInput.origin,
      requiredToolNames,
    })
    await Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
      level: recoveryStartAudit.level,
      category: 'alicization.main-gateway',
      action: recoveryStartAudit.action,
      message: recoveryStartAudit.message,
      payload: {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        origin: recoveryInput.origin,
        requiredToolNames,
      },
    }))

    const recoveryResult = await recoverAlicizationRequiredToolDeterministically({
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      messages,
      tools: prepared.tools as never,
      requiredToolNames,
      toolInputOverrides: recoveryInput.toolInputOverrides,
      emitToolCall: payload => emitToolCall(payload),
      emitToolResult: payload => emitToolResult(payload),
    })
    noteInlineExecutionReceipt(recoveryResult.toolResult)

    const recoveryFinishAudit = recoveryInput.origin === 'execution-first'
      ? {
          action: 'execution-first-inline-finished',
          message: 'Execution-first inline executor dispatch completed before model streaming.',
        }
      : {
          action: 'required-tool-recovery-finished',
          message: 'Deterministic executor recovery completed and produced a user-facing answer.',
        }
    await input.appendRuntimeDebugLine('chat-stream.required-tool-recovery-finished', {
      cardId: input.payload.cardId,
      turnId: input.payload.turnId,
      origin: recoveryInput.origin,
      toolName: recoveryResult.toolName,
      fullTextChars: recoveryResult.fullText.length,
    })
    await Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
      level: 'notice',
      category: 'alicization.main-gateway',
      action: recoveryFinishAudit.action,
      message: recoveryFinishAudit.message,
      payload: {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        origin: recoveryInput.origin,
        toolName: recoveryResult.toolName,
      },
    }))

    return recoveryResult
  }

  const attemptInlineExecutionPayoff = async (recoveryResult: Awaited<ReturnType<typeof recoverAlicizationRequiredToolDeterministically>>) => {
    if (!prepared || !chatConfig || !input.isRunActive()) {
      throw new AlicizationMindAuthoredReplyRequiredError('mind-authored-execution-payoff-required:execution-inline-payoff-unprepared')
    }
    const preparedTrace = resolvePreparedTraceFallback()

    const surfaceInput = asAlicizationInlineExecutionSurfaceInput(recoveryResult.toolName, recoveryResult.toolResult)
    if (!surfaceInput) {
      const rewritten = await rewriteStructuredVisibleReplyIfNeeded({
        fullText: recoveryResult.fullText,
        visibleReplyExecution: resolveAlicizationPreparedVisibleReplyExecution({
          prepared,
          mode: 'provider-one-shot',
          actualVisibleReplyAuthority: 'local-deterministic-fallback',
          providerMindExecuted: false,
          reason: 'execution-inline-payoff-second-pass-required:unsupported-surface',
        }),
        forceRewrite: true,
        forceReasonCodes: ['execution-inline-payoff-unsupported-surface'],
        projectStateSameHerSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateSameHerSummary,
        projectStateSameHerHoldDetail: resolvePreparedVisibleReplyProjectStateAuditSeed().sameHerHoldDetail,
        projectStateContinuityArcStage: resolvePreparedVisibleReplyProjectStateAuditSeed().continuityArcStage,
        projectStateContinuityCue: resolvePreparedVisibleReplyProjectStateAuditSeed().continuityCue,
        projectStateCurrentPhaseSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateCurrentPhaseSummary,
        projectStateLandedProgressSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateLandedProgressSummary,
        projectStateOpenClosureSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateOpenClosureSummary,
        projectStateNextClosureTargetSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateNextClosureTargetSummary,
        projectStateSameHerDriftRiskSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().sameHerDriftRiskSummary,
        projectStateProactiveSameHerGapSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateProactiveSameHerGapSummary,
        emotionalClosureSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().emotionalClosureSummary,
        projectStatePreDialogueAwarenessSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().projectStatePreDialogueAwarenessSummary,
      })
      if (rewritten) {
        return normalizeRecoveredResolvedReplyAwareness(buildHostVisibleResolvedReply(buildAlicizationResolvedVisibleReply({
          ...rewritten,
          projectStateSameHerSummary: rewritten.projectStateSameHerSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateSameHerSummary,
          projectStateSameHerHoldDetail: rewritten.projectStateSameHerHoldDetail ?? resolvePreparedVisibleReplyProjectStateAuditSeed().sameHerHoldDetail,
          projectStateContinuityArcStage: rewritten.projectStateContinuityArcStage ?? resolvePreparedVisibleReplyProjectStateAuditSeed().continuityArcStage,
          projectStateContinuityCue: rewritten.projectStateContinuityCue ?? resolvePreparedVisibleReplyProjectStateAuditSeed().continuityCue,
          projectStateSameHerDriftRiskSummary: rewritten.projectStateSameHerDriftRiskSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().sameHerDriftRiskSummary,
          projectStateProactiveSameHerGapSummary: rewritten.projectStateProactiveSameHerGapSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateProactiveSameHerGapSummary,
          projectStateCurrentPhaseSummary: rewritten.projectStateCurrentPhaseSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateCurrentPhaseSummary,
          projectStateLandedProgressSummary: rewritten.projectStateLandedProgressSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateLandedProgressSummary,
          projectStateOpenClosureSummary: rewritten.projectStateOpenClosureSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateOpenClosureSummary,
          projectStateNextClosureTargetSummary: rewritten.projectStateNextClosureTargetSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateNextClosureTargetSummary,
          emotionalClosureCue: preferRicherProjectStateAuditText({
            current: rewritten.emotionalClosureSummary,
            candidate: resolvePreparedVisibleReplyProjectStateAuditSeed().emotionalClosureSummary,
          }),
          projectStateEmotionalClosureSummary: preferRicherProjectStateAuditText({
            current: rewritten.emotionalClosureSummary,
            candidate: resolvePreparedVisibleReplyProjectStateAuditSeed().emotionalClosureSummary,
          }),
          projectStatePreDialogueAwarenessSummary: preferStrongerSameHerHeadlineOverAwareness({
            awarenessLine:
              rewritten.projectStatePreDialogueAwarenessSummary
              ?? resolveStructuredPreDialogueAwarenessSummary(parseJsonObjectFromText(rewritten.fullText))
              ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStatePreDialogueAwarenessSummary
              ?? null,
            companionHeadlineLine:
              sanitizeText(
                (
                  parseJsonObjectFromText(rewritten.fullText)?.projectState
                  && typeof parseJsonObjectFromText(rewritten.fullText)?.projectState === 'object'
                    ? ((parseJsonObjectFromText(rewritten.fullText)?.projectState as Record<string, unknown>).companionHeadlineLine
                      ?? (parseJsonObjectFromText(rewritten.fullText)?.projectState as Record<string, unknown>).preDialogueAwarenessLine)
                    : null
                ) ?? '',
                '',
              )
              || sanitizeText(
                (
                  parseJsonObjectFromText(rewritten.fullText)?.preDialogueAwareness
                  && typeof parseJsonObjectFromText(rewritten.fullText)?.preDialogueAwareness === 'object'
                    ? (parseJsonObjectFromText(rewritten.fullText)?.preDialogueAwareness as Record<string, unknown>).awarenessLine
                    : null
                ) ?? '',
                '',
              )
              || null,
          }),
          prepared,
        })))
      }
      throw new AlicizationMindAuthoredReplyRequiredError('mind-authored-execution-payoff-required:execution-inline-payoff-unsupported-surface')
    }

    const continuityInputs = resolveAlicizationExecutionPayoffContinuityInputs({
      runtimeSurface: prepared.runtimeSurface,
    })
    const deterministicStructured = buildAlicizationExecutionPayoffDeterministicStructured({
      mode: 'inline-execution',
      channel: surfaceInput.channel,
      goal: surfaceInput.goal,
      status: surfaceInput.status,
      summary: surfaceInput.summary,
      outcome: surfaceInput.outcome,
      personStateProjection: continuityInputs.personStateProjection,
      selfContinuityAuthority: continuityInputs.selfContinuityAuthority,
      hostPersonModel: continuityInputs.hostPersonModel,
      visibleReplyAuthority: 'llm-second-pass-rewrite',
    })

    try {
      const prompt = buildAlicizationExecutionPayoffPrompt({
        mode: 'inline-execution',
        channel: surfaceInput.channel,
        goal: surfaceInput.goal,
        status: surfaceInput.status,
        summary: surfaceInput.summary,
        outcome: surfaceInput.outcome,
        userText: input.payload.messages.at(-1)?.role === 'user'
          ? sanitizeText(String(input.payload.messages.at(-1)?.content ?? ''), '')
          : null,
        trace: {
          decisionTraceId: preparedTrace.decisionTraceId,
          turnMode: preparedTrace.turnMode,
          personaKernelMode: preparedTrace.personaKernelMode,
        },
        governance: prepared.runtimeSurface.governance
          ? {
              relationshipPosture: prepared.runtimeSurface.governance.relationshipPosture,
              answerAct: prepared.runtimeSurface.governance.answerAct,
              answerSubject: prepared.runtimeSurface.governance.answerSubject,
              focusAnchor: prepared.runtimeSurface.governance.focusAnchor,
              answerIntent: prepared.runtimeSurface.governance.answerIntent,
            }
          : null,
        personStateProjection: continuityInputs.personStateProjection,
        selfContinuityAuthority: continuityInputs.selfContinuityAuthority,
        hostPersonModel: continuityInputs.hostPersonModel,
      })
      await input.appendRuntimeDebugLine('chat-stream.execution-payoff-started', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        channel: surfaceInput.channel,
        status: surfaceInput.status,
      })
      const nonStreamingResult = await generateAlicizationMainChatNonStreaming({
        chatConfig,
        headers: input.headers,
        emotionalKernel: resolvePreparedMainChatOneShotEmotionalKernel(prepared),
        messages: [
          { role: 'system', content: prompt.system },
          ...buildAlicizationMinimalContextRecoveryMessages(messages),
          { role: 'user', content: prompt.user },
        ],
        timeoutMs: 9_000,
      })
      const parsed = parseJsonObjectFromText(nonStreamingResult.fullText)
      if (!parsed)
        throw new Error('execution-payoff-invalid-json')

      const llmReply = sanitizeText(parsed.reply, '')
      if (!llmReply)
        throw new Error('execution-payoff-missing-reply')

      const selectedReply = selectAlicizationExecutionDeliveryReply({
        channel: surfaceInput.channel,
        goal: surfaceInput.goal,
        llmReply,
        outcome: surfaceInput.outcome,
        status: surfaceInput.status,
        summary: surfaceInput.summary,
        personStateProjection: continuityInputs.personStateProjection,
        selfContinuityAuthority: continuityInputs.selfContinuityAuthority,
        hostPersonModel: continuityInputs.hostPersonModel,
      })
      const emotion = normalizeAlicizationExecutionPayoffEmotion(
        parsed.emotion,
        deterministicStructured.emotion,
      )
      const performance = normalizeAlicizationExecutionPayoffPerformance(
        parsed.performance,
        emotion,
        deterministicStructured.performance,
      )
      const structured = {
        ...deterministicStructured,
        thought: sanitizeText(parsed.thought, '') || deterministicStructured.thought,
        emotion,
        reply: selectedReply.reply,
        performance,
        visibleReplyAuthority: selectedReply.source === 'llm'
          ? 'llm-mind'
          : 'llm-second-pass-rewrite',
      }
      if (selectedReply.source !== 'llm') {
        const enrichedStructuredFullText = enrichStructuredFullTextWithLifeAuthority({
          fullText: JSON.stringify(structured),
          reply: selectedReply.reply,
          thought: typeof structured.thought === 'string' ? structured.thought : null,
        })
        const rewritten = await rewriteStructuredVisibleReplyIfNeeded({
          fullText: enrichedStructuredFullText,
          visibleReplyExecution: resolveAlicizationPreparedVisibleReplyExecution({
            prepared,
            mode: 'provider-one-shot',
            actualVisibleReplyAuthority: 'local-deterministic-fallback',
            providerMindExecuted: false,
            reason: `execution-inline-payoff-second-pass-required:${selectedReply.reason ?? 'llm-repaired'}`,
          }),
          forceRewrite: true,
          forceReasonCodes: [`execution-inline-payoff:${selectedReply.reason ?? 'llm-repaired'}`],
          projectStateSameHerSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateSameHerSummary,
          projectStateSameHerHoldDetail: resolvePreparedVisibleReplyProjectStateAuditSeed().sameHerHoldDetail,
          projectStateContinuityArcStage: resolvePreparedVisibleReplyProjectStateAuditSeed().continuityArcStage,
          projectStateContinuityCue: resolvePreparedVisibleReplyProjectStateAuditSeed().continuityCue,
          projectStateCurrentPhaseSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateCurrentPhaseSummary,
          projectStateLandedProgressSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateLandedProgressSummary,
          projectStateOpenClosureSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateOpenClosureSummary,
          projectStateNextClosureTargetSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateNextClosureTargetSummary,
          projectStateSameHerDriftRiskSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().sameHerDriftRiskSummary,
          projectStateProactiveSameHerGapSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateProactiveSameHerGapSummary,
          emotionalClosureSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().emotionalClosureSummary,
          projectStatePreDialogueAwarenessSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().projectStatePreDialogueAwarenessSummary,
        })
        if (!rewritten) {
          throw new AlicizationMindAuthoredReplyRequiredError(
            `mind-authored-execution-payoff-required:${selectedReply.reason ?? 'llm-repaired'}`,
          )
        }
        await input.appendRuntimeDebugLine('chat-stream.execution-payoff-finished', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          channel: surfaceInput.channel,
          status: surfaceInput.status,
          source: 'llm-second-pass-rewrite',
          surfaceReason: selectedReply.reason ?? null,
        })
        currentStructuredPerformance = normalizeAlicizationPerformancePayload(
          structured.performance,
          structured.emotion as AlicizationDialoguePerformancePayload['baseEmotion'],
        )
        currentStructuredThought = typeof structured.thought === 'string' ? structured.thought : null
        return buildHostVisibleResolvedReply(buildAlicizationResolvedVisibleReply({
          ...rewritten,
          projectStateSameHerSummary: rewritten.projectStateSameHerSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateSameHerSummary,
          projectStateSameHerHoldDetail: rewritten.projectStateSameHerHoldDetail ?? resolvePreparedVisibleReplyProjectStateAuditSeed().sameHerHoldDetail,
          projectStateContinuityArcStage: rewritten.projectStateContinuityArcStage ?? resolvePreparedVisibleReplyProjectStateAuditSeed().continuityArcStage,
          projectStateContinuityCue: rewritten.projectStateContinuityCue ?? resolvePreparedVisibleReplyProjectStateAuditSeed().continuityCue,
          projectStateSameHerDriftRiskSummary: rewritten.projectStateSameHerDriftRiskSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().sameHerDriftRiskSummary,
          projectStateProactiveSameHerGapSummary: rewritten.projectStateProactiveSameHerGapSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateProactiveSameHerGapSummary,
          projectStateCurrentPhaseSummary: rewritten.projectStateCurrentPhaseSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateCurrentPhaseSummary,
          projectStateLandedProgressSummary: rewritten.projectStateLandedProgressSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateLandedProgressSummary,
          projectStateOpenClosureSummary: rewritten.projectStateOpenClosureSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateOpenClosureSummary,
          projectStateNextClosureTargetSummary: rewritten.projectStateNextClosureTargetSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateNextClosureTargetSummary,
          emotionalClosureCue: preferRicherProjectStateAuditText({
            current: rewritten.emotionalClosureSummary,
            candidate: resolvePreparedVisibleReplyProjectStateAuditSeed().emotionalClosureSummary,
          }),
          projectStateEmotionalClosureSummary: preferRicherProjectStateAuditText({
            current: rewritten.emotionalClosureSummary,
            candidate: resolvePreparedVisibleReplyProjectStateAuditSeed().emotionalClosureSummary,
          }),
          projectStatePreDialogueAwarenessSummary: preferStrongerSameHerHeadlineOverAwareness({
            awarenessLine:
              rewritten.projectStatePreDialogueAwarenessSummary
              ?? resolveStructuredPreDialogueAwarenessSummary(parseJsonObjectFromText(rewritten.fullText))
              ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStatePreDialogueAwarenessSummary
              ?? null,
            companionHeadlineLine:
              sanitizeText(
                (
                  parseJsonObjectFromText(rewritten.fullText)?.projectState
                  && typeof parseJsonObjectFromText(rewritten.fullText)?.projectState === 'object'
                    ? ((parseJsonObjectFromText(rewritten.fullText)?.projectState as Record<string, unknown>).companionHeadlineLine
                      ?? (parseJsonObjectFromText(rewritten.fullText)?.projectState as Record<string, unknown>).preDialogueAwarenessLine)
                    : null
                ) ?? '',
                '',
              )
              || sanitizeText(
                (
                  parseJsonObjectFromText(rewritten.fullText)?.preDialogueAwareness
                  && typeof parseJsonObjectFromText(rewritten.fullText)?.preDialogueAwareness === 'object'
                    ? (parseJsonObjectFromText(rewritten.fullText)?.preDialogueAwareness as Record<string, unknown>).awarenessLine
                    : null
                ) ?? '',
                '',
              )
              || null,
          }),
          prepared,
        }))
      }
      await input.appendRuntimeDebugLine('chat-stream.execution-payoff-finished', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        channel: surfaceInput.channel,
        status: surfaceInput.status,
        source: selectedReply.source,
        surfaceReason: selectedReply.reason ?? null,
      })
      currentStructuredPerformance = normalizeAlicizationPerformancePayload(
        structured.performance,
        structured.emotion as AlicizationDialoguePerformancePayload['baseEmotion'],
      )
      currentStructuredThought = typeof structured.thought === 'string' ? structured.thought : null
      return normalizeRecoveredResolvedReplyAwareness(buildHostVisibleResolvedReply(buildAlicizationResolvedVisibleReply({
        fullText: enrichStructuredFullTextWithLifeAuthority({
          fullText: JSON.stringify(structured),
          reply: selectedReply.reply,
          thought: typeof structured.thought === 'string' ? structured.thought : null,
        }),
        visibleReplyExecution: resolveAlicizationPreparedVisibleReplyExecution({
          prepared,
          mode: 'provider-one-shot',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'execution-inline-payoff',
        }),
        ...resolvePreparedVisibleReplyProjectStateAuditSeed(),
        prepared,
      })))
    }
    catch (error) {
      let reachability: AlicizationMainGatewayReachabilitySnapshot | null = null
      try {
        reachability = await input.ensureMainGatewayReachable(input.mainGateway, { bypassCache: true })
      }
      catch {}
      await input.appendRuntimeDebugLine('chat-stream.execution-payoff-failed', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        reason: error instanceof Error ? error.message : String(error),
        gatewayReachable: reachability?.reachable ?? null,
        gatewayReason: reachability?.reason ?? null,
      })
      throw new AlicizationMindAuthoredReplyRequiredError(
        `mind-authored-execution-payoff-required:${reachability?.reachable === false ? 'provider-unavailable' : error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  try {
    prepared = await input.preparationPromise
    if (!input.isRunActive())
      return

    prepared = {
      ...prepared,
      governance: enrichProjectStateAnswerGovernanceIfNeeded(prepared.governance) as typeof prepared.governance,
      mindTurnContract: prepared.mindTurnContract
        ? {
            ...prepared.mindTurnContract,
            mustDo: enrichProjectStateAnswerGovernanceIfNeeded({
              answerSubject: prepared.governance?.answerSubject ?? null,
              mustDo: prepared.mindTurnContract.mustDo ?? [],
              mustNotDo: prepared.mindTurnContract.mustNotDo ?? [],
            })?.mustDo ?? prepared.mindTurnContract.mustDo,
            mustNotDo: enrichProjectStateAnswerGovernanceIfNeeded({
              answerSubject: prepared.governance?.answerSubject ?? null,
              mustDo: prepared.mindTurnContract.mustDo ?? [],
              mustNotDo: prepared.mindTurnContract.mustNotDo ?? [],
            })?.mustNotDo ?? prepared.mindTurnContract.mustNotDo,
          }
        : prepared.mindTurnContract,
    }

    chatConfig = prepared.chatConfig
    messages = prepared.messages
    tools = prepared.tools
    toolChoice = prepared.toolChoice
    input.runStateController.setSessionTraceGetter(input.key, prepared.getSessionTrace)
    const runtimeSurface = prepared.runtimeSurface
    const runtimeCapture = runtimeSurface.capture ?? {
      health: null,
      permission: null,
      fallbackReason: null,
    }
    const preparedTrace = resolvePreparedTraceFallback()
    const enforcedExecutionTools = extractAllowedToolNamesFromToolChoice(toolChoice, tools)
    pendingAffirmationToolInputOverrides = (() => {
      const threadId = sanitizeText(runtimeSurface.action?.resumePendingThreadId, '')
      if (!threadId)
        return undefined
      const channel = sanitizeText(runtimeSurface.action?.resumePendingThreadChannel, '')
      const requiredToolName = channel === 'cli'
        ? 'executor_run_cli'
        : channel === 'codex'
          ? 'executor_run_codex'
          : channel === 'claude-code'
            ? 'executor_run_claude_code'
            : channel === 'openclaw'
              ? 'executor_run_openclaw'
              : ''
      if (!requiredToolName)
        return undefined
      return {
        [requiredToolName]: {
          threadId,
        },
      } satisfies Record<string, Record<string, unknown>>
    })()
    preparedExecutionToolInputOverrides = mergeToolInputOverrides(
      prepared.executionToolInputOverrides as Record<string, Record<string, unknown>> | undefined,
      pendingAffirmationToolInputOverrides,
    )
    timeoutRecoveryMode = !toolChoice && Array.isArray(tools) && tools.length > 0
      ? 'tools-disabled'
      : 'original'
    timeoutRecoveryMs = prepared.hasVisualGrounding
      ? mainChatTimeoutRecoveryWithVisualGroundingMs
      : mainChatTimeoutRecoveryMs
    const firstEventTimeoutMs = prepared.hasVisualGrounding
      ? mainChatFirstEventTimeoutWithVisualGroundingMs
      : mainChatFirstEventTimeoutMs

    syncVisibleReplyExecutionFromPreparedPlan()
    emitStreamEmbodimentMeta('', { force: true })
    void input.queueScopedAuditLog(input.payload.cardId, {
      level: 'notice',
      category: 'alicization.main-gateway',
      action: 'stream-started',
      message: 'Accepted a main-process Alicization chat stream.',
      payload: {
        cardId: input.runState.cardId,
        turnId: input.runState.turnId,
        providerId: input.payload.providerId,
        model: input.payload.model,
        hasVisualGrounding: prepared.hasVisualGrounding,
        hasSender: Boolean(input.runState.sender),
        senderId: input.runState.sender?.id ?? null,
        customDirectivesSource: prepared.customDirectivesResolution.source,
        customDirectivesChars: prepared.customDirectivesResolution.text.length,
        decisionTraceId: preparedTrace.decisionTraceId,
        personaKernelMode: preparedTrace.personaKernelMode,
        sessionPhases: prepared.getSessionTrace().phaseOrder,
        captureHealth: runtimeCapture.health,
        capturePermission: runtimeCapture.permission,
        captureFallbackReason: runtimeCapture.fallbackReason,
        enforcedExecutionTools,
      },
    })
    await input.appendRuntimeDebugLine('chat-start.prepared', {
      cardId: input.runState.cardId,
      turnId: input.runState.turnId,
      hasVisualGrounding: prepared.hasVisualGrounding,
      customDirectivesSource: prepared.customDirectivesResolution.source,
      customDirectivesChars: prepared.customDirectivesResolution.text.length,
      governanceTurnMode: preparedTrace.turnMode,
      governanceMustDo: prepared.governance?.mustDo ?? [],
      governanceMustNotDo: prepared.governance?.mustNotDo ?? [],
      decisionTraceId: preparedTrace.decisionTraceId,
      personaKernelMode: preparedTrace.personaKernelMode,
      sessionPhases: prepared.getSessionTrace().phaseOrder,
      captureHealth: runtimeCapture.health,
      capturePermission: runtimeCapture.permission,
      captureFallbackReason: runtimeCapture.fallbackReason,
      enforcedExecutionTools,
      ...preDialogueAwarenessDebug,
      ...buildPreparedProjectStateClosureSnapshot(prepared),
    })
    try {
      await Promise.resolve(input.recordPreparedMindTrace?.({
        payload,
        prepared,
        preDialogueAwarenessDebug: preDialogueAwarenessDebug ?? undefined,
      }))
    }
    catch (error) {
      await input.appendRuntimeDebugLine('chat-start.prepared-mind-trace-failed', {
        cardId: input.runState.cardId,
        turnId: input.runState.turnId,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
    await input.appendRuntimeDebugLine('chat-stream.started', {
      cardId: input.runState.cardId,
      turnId: input.runState.turnId,
      firstEventTimeoutMs,
      timeoutRecoveryMs,
      timeoutRecoveryMode,
      hasVisualGrounding: prepared.hasVisualGrounding,
      waitForTools: prepared.waitForTools,
      toolCount: Array.isArray(tools) ? tools.length : 0,
      messageCount: messages.length,
    })
    if (shouldUseAlicizationExecutionFirstFastPath({
      prepared,
      enforcedExecutionTools,
    })) {
      try {
        await input.appendRuntimeDebugLine('chat-stream.execution-first-inline-started', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          enforcedExecutionTools,
          actionKind: prepared.runtimeSurface.action?.kind ?? null,
        })
        const deterministicRecovery = await attemptDeterministicRequiredToolRecovery({
          origin: 'execution-first',
          requiredToolNames: enforcedExecutionTools,
          toolInputOverrides: preparedExecutionToolInputOverrides,
        })
        if (deterministicRecovery) {
          const inlineExecutionPayoffReply = await attemptInlineExecutionPayoff(deterministicRecovery)
          const normalizedPayoffReply = normalizeRecoveredResolvedReplyAwareness(inlineExecutionPayoffReply)
          const shouldPreserveVerbatimPayloadAwarenessLine = Boolean(
            payload.preDialogueSendIdentity?.awarenessLine
            && !sanitizeText(payload.preDialogueSendIdentity?.companionHeadlineLine ?? '', '')
            && !sanitizeText(payload.preDialogueSendIdentity?.companionBriefingLine ?? '', '')
            && looksLikeThinProjectAwarenessShell(payload.preDialogueSendIdentity?.summaryLine),
          )
          const payoffReply = shouldPreserveVerbatimPayloadAwarenessLine
            ? preserveVerbatimProjectAwarenessLineOnResolvedReply({
                reply: normalizedPayoffReply,
                exactAwarenessLine: payload.preDialogueSendIdentity?.awarenessLine ?? null,
              })
            : normalizedPayoffReply
          await emitResolvedVisibleReply(payoffReply)
          await suppressInlineExecutionDeliveries()
          await input.appendRuntimeDebugLine('chat-stream.execution-first-inline-finished', {
            cardId: input.payload.cardId,
            turnId: input.payload.turnId,
            fullTextChars: payoffReply.fullText.length,
            toolName: deterministicRecovery.toolName,
          })
          input.runStateController.finishRun(input.key, {
            status: 'completed',
            finishReason: 'execution-first-inline',
            fullText: payoffReply.fullText,
            visibleReplyExecution: payoffReply.visibleReplyExecution,
            visibleReplyRealization: payoffReply.realization,
          })
          return
        }
      }
      catch (error) {
        await input.appendRuntimeDebugLine('chat-stream.execution-first-inline-failed', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          reason: error instanceof Error ? error.message : String(error),
        })
        if (error instanceof AlicizationMindAuthoredReplyRequiredError)
          throw error
      }
    }
    const activeDialogueDecision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages,
      prepared,
      runtimeDigest: resolveRuntimeDigestFromPrepared(),
    })
    const activeDialogueCompactAuthority = decideAlicizationActiveDialogueCompactAuthority(activeDialogueDecision)
    const activeDialogueUsesCompactFastPath = activeDialogueDecision
      && activeDialogueCompactAuthority.allowed
    if (activeDialogueDecision && !activeDialogueUsesCompactFastPath) {
      if (shouldUpgradeDeferredDecisionToProjectState(activeDialogueDecision) && prepared) {
        const preparedGovernanceForProjectState = prepared.governance as AlicizationProjectStateGovernanceShape | null | undefined
        const upgradedGovernance = enrichProjectStateAnswerGovernanceIfNeeded({
          ...preparedGovernanceForProjectState,
          answerSubject: 'project-state',
        })
        const upgradedMindTurnContract = prepared.mindTurnContract
          ? enrichProjectStateAnswerGovernanceIfNeeded({
              answerSubject: 'project-state',
              mustDo: prepared.mindTurnContract.mustDo ?? [],
              mustNotDo: prepared.mindTurnContract.mustNotDo ?? [],
            })
          : null

        prepared = {
          ...prepared,
          governance: upgradedGovernance
            ? {
                ...preparedGovernanceForProjectState,
                ...upgradedGovernance,
                answerSubject: 'project-state',
              } as unknown as AlicizationMindTurnGovernance
            : prepared.governance,
          mindTurnContract: prepared.mindTurnContract
            ? {
                ...prepared.mindTurnContract,
                mustDo: upgradedMindTurnContract?.mustDo ?? prepared.mindTurnContract.mustDo,
                mustNotDo: upgradedMindTurnContract?.mustNotDo ?? prepared.mindTurnContract.mustNotDo,
              }
            : prepared.mindTurnContract,
        }
      }
      await input.appendRuntimeDebugLine('chat-stream.active-dialogue-deferred-to-main-runtime', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        lane: activeDialogueDecision.lane,
        strategy: activeDialogueDecision.strategy,
        reasonCodes: activeDialogueDecision.reasonCodes,
        deferredReason: activeDialogueCompactAuthority.reason,
      })
    }
    if (activeDialogueDecision && activeDialogueUsesCompactFastPath) {
      const resolveActiveDialogueMindReply = async (decision: AlicizationActiveDialogueFastPathDecision) => {
        const compactMessages = buildAlicizationActiveDialogueFastPathMessages({
          conversationMessages,
          decision,
          prepared: prepared!,
        })
        const oneShotTimeoutMs = Math.max(
          decision.timeoutMs,
          decision.strategy === 'compact-one-shot' ? 6_500 : 9_000,
        )
        await input.appendRuntimeDebugLine('chat-stream.active-dialogue-mind-started', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          lane: decision.lane,
          strategy: decision.strategy,
          timeoutMs: oneShotTimeoutMs,
          messageCount: compactMessages.length,
        })
        const compactReply = await recoverAlicizationMainChatFromTimeout({
          chatConfig: chatConfig!,
          messages: compactMessages,
          headers: input.headers,
          emotionalKernel: resolvePreparedMainChatOneShotEmotionalKernel(prepared),
          timeoutMs: oneShotTimeoutMs,
          maxSteps: 2,
        })
        return normalizeAlicizationActiveDialogueFastPathReplyOrEscalate({
          decision,
          rawText: compactReply,
        })
      }
      await input.appendRuntimeDebugLine('chat-stream.active-dialogue-lane-selected', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        lane: activeDialogueDecision.lane,
        strategy: activeDialogueDecision.strategy,
        timeoutMs: activeDialogueDecision.timeoutMs,
        resolvedTimeZone: activeDialogueDecision.resolvedTimeZone,
        resolvedTimeZoneSource: activeDialogueDecision.resolvedTimeZoneSource,
        reasonCodes: activeDialogueDecision.reasonCodes,
      })

      try {
        const normalizedReply = await resolveActiveDialogueMindReply(activeDialogueDecision)
        const enrichedReply = enrichStructuredFullTextWithLifeAuthority({
          fullText: normalizedReply,
        })
        const preparedExecution = prepared!
        const resolvedReply = buildAlicizationResolvedVisibleReply({
          fullText: enrichedReply,
          visibleReplyExecution: resolveAlicizationPreparedVisibleReplyExecution({
            prepared: preparedExecution,
            mode: 'provider-one-shot',
            providerMindExecuted: true,
            reason: 'active-dialogue-fast-path',
          }),
          emotionalClosureCue: preparedExecution.mindTurnContract?.emotionalClosureCue ?? null,
          projectStateEmotionalClosureSummary: preparedExecution.mindTurnContract?.emotionalClosureCue ?? null,
          ...resolvePreparedVisibleReplyProjectStateAuditSeed(),
        })
        const rewritten = await rewriteStructuredVisibleReplyIfNeeded({
          fullText: resolvedReply.fullText,
          visibleReplyExecution: resolvedReply.visibleReplyExecution,
          projectStateSameHerSummary: resolvedReply.realization.projectStateAudit?.sameHerSummary ?? null,
          projectStateSameHerHoldDetail: resolvedReply.realization.projectStateAudit?.sameHerHoldDetail ?? null,
          projectStateContinuityArcStage: resolvedReply.realization.projectStateAudit?.continuityArcStage ?? null,
          projectStateContinuityCue: resolvedReply.realization.projectStateAudit?.continuityCue ?? null,
          projectStateLandedProgressSummary: resolvedReply.realization.projectStateAudit?.landedProgressSummary ?? null,
          projectStateOpenClosureSummary: resolvedReply.realization.projectStateAudit?.openClosureSummary ?? null,
          projectStateNextClosureTargetSummary: resolvedReply.realization.projectStateAudit?.nextClosureTargetSummary ?? null,
          projectStateProactiveSameHerGapSummary: resolvedReply.realization.projectStateAudit?.proactiveSameHerGapSummary ?? null,
          emotionalClosureSummary: resolvedReply.realization.projectStateAudit?.emotionalClosureSummary ?? null,
          projectStatePreDialogueAwarenessSummary: resolvedReply.realization.projectStateAudit?.preDialogueAwarenessSummary ?? null,
        })
        const finalReply = rewritten
          ? buildHostVisibleResolvedReply(buildAlicizationResolvedVisibleReply({
              ...rewritten,
              projectStateSameHerSummary: rewritten.projectStateSameHerSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateSameHerSummary,
              projectStateSameHerHoldDetail: rewritten.projectStateSameHerHoldDetail ?? resolvePreparedVisibleReplyProjectStateAuditSeed().sameHerHoldDetail,
              projectStateContinuityArcStage: rewritten.projectStateContinuityArcStage ?? resolvePreparedVisibleReplyProjectStateAuditSeed().continuityArcStage,
              projectStateContinuityCue: rewritten.projectStateContinuityCue ?? resolvePreparedVisibleReplyProjectStateAuditSeed().continuityCue,
              projectStateProactiveSameHerGapSummary: rewritten.projectStateProactiveSameHerGapSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateProactiveSameHerGapSummary,
              projectStateCurrentPhaseSummary: rewritten.projectStateCurrentPhaseSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateCurrentPhaseSummary,
              projectStateLandedProgressSummary: rewritten.projectStateLandedProgressSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateLandedProgressSummary,
              projectStateOpenClosureSummary: rewritten.projectStateOpenClosureSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateOpenClosureSummary,
              projectStateNextClosureTargetSummary: rewritten.projectStateNextClosureTargetSummary ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateNextClosureTargetSummary,
              emotionalClosureCue: preferRicherProjectStateAuditText({
                current: rewritten.emotionalClosureSummary,
                candidate: resolvePreparedVisibleReplyProjectStateAuditSeed().emotionalClosureSummary,
              }),
              projectStateEmotionalClosureSummary: preferRicherProjectStateAuditText({
                current: rewritten.emotionalClosureSummary,
                candidate: resolvePreparedVisibleReplyProjectStateAuditSeed().emotionalClosureSummary,
              }),
              projectStatePreDialogueAwarenessSummary: preferStrongerSameHerHeadlineOverAwareness({
                awarenessLine:
                  rewritten.projectStatePreDialogueAwarenessSummary
                  ?? resolveStructuredPreDialogueAwarenessSummary(parseJsonObjectFromText(rewritten.fullText))
                  ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStatePreDialogueAwarenessSummary
                  ?? null,
                companionHeadlineLine:
                  sanitizeText(
                    (
                      parseJsonObjectFromText(rewritten.fullText)?.projectState
                      && typeof parseJsonObjectFromText(rewritten.fullText)?.projectState === 'object'
                        ? ((parseJsonObjectFromText(rewritten.fullText)?.projectState as Record<string, unknown>).companionHeadlineLine
                          ?? (parseJsonObjectFromText(rewritten.fullText)?.projectState as Record<string, unknown>).preDialogueAwarenessLine)
                        : null
                    ) ?? '',
                    '',
                  )
                  || sanitizeText(
                    (
                      parseJsonObjectFromText(rewritten.fullText)?.preDialogueAwareness
                      && typeof parseJsonObjectFromText(rewritten.fullText)?.preDialogueAwareness === 'object'
                        ? (parseJsonObjectFromText(rewritten.fullText)?.preDialogueAwareness as Record<string, unknown>).awarenessLine
                        : null
                    ) ?? '',
                    '',
                  )
                  || null,
              }),
              prepared,
            }))
          : buildHostVisibleResolvedReply(resolvedReply)
        const parsedFinalStructured = parseJsonObjectFromText(finalReply.fullText)
        currentStructuredGovernance = parsedFinalStructured?.governance && typeof parsedFinalStructured.governance === 'object'
          ? parsedFinalStructured.governance as AlicizationMindTurnGovernance
          : currentStructuredGovernance
        currentStructuredPerformance = resolveStructuredPerformancePayload(parsedFinalStructured?.performance)
          ?? currentStructuredPerformance
        currentStructuredThought = typeof parsedFinalStructured?.thought === 'string'
          ? parsedFinalStructured.thought
          : currentStructuredThought
        const parsedFinalDigitalLifeSpine = normalizeAlicizationDigitalLifeSpineDigest(parsedFinalStructured?.digitalLifeSpine ?? null)
        if (parsedFinalDigitalLifeSpine)
          currentStructuredDigitalLifeSpine = reconcileStructuredDigitalLifeRuntimeState(parsedFinalDigitalLifeSpine).digitalLifeSpine
        await emitResolvedVisibleReply(finalReply)
        await suppressFreshExecutionReplyDeliveryIfNeeded()
        await input.appendRuntimeDebugLine('chat-stream.active-dialogue-mind-finished', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          lane: activeDialogueDecision.lane,
          strategy: activeDialogueDecision.strategy,
          fullTextChars: finalReply.fullText.length,
        })
        input.runStateController.finishRun(input.key, {
          status: 'completed',
          finishReason: 'active-dialogue-fast-path',
          fullText: finalReply.fullText,
          visibleReplyExecution: finalReply.visibleReplyExecution,
          visibleReplyRealization: finalReply.realization,
        })
        return
      }
      catch (error) {
        await input.appendRuntimeDebugLine('chat-stream.active-dialogue-fast-failed', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          lane: activeDialogueDecision.lane,
          strategy: activeDialogueDecision.strategy,
          reason: error instanceof Error ? error.message : String(error),
        })
        await input.appendRuntimeDebugLine('chat-stream.active-dialogue-escalated-to-main-runtime', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          lane: activeDialogueDecision.lane,
          strategy: activeDialogueDecision.strategy,
          escalationReason: error instanceof Error ? error.message : String(error),
          mindAuthorityEscalation: error instanceof AlicizationActiveDialogueMindAuthorityEscalationError,
        })
      }
    }
    const streamResult = await runAlicizationMainChatStream({
      payload: input.payload,
      prepared: prepared!,
      headers: input.headers,
      controller: input.runState.controller,
      firstEventTimeoutMs,
      isRunActive: input.isRunActive,
      nonProgressEventTypes,
      streamMeta: streamMetaEmitter,
      incrementChunkStats: input.incrementChunkStats,
      emitChunk: payload => emitVisibleChunk(payload.text),
      emitToolCall,
      emitToolResult,
      generateNonStreaming: async (oneShotInput) => {
        const cardId = normalizeCardId(oneShotInput.cardId ?? input.activeCardId)
        const turnId = sanitizeText(oneShotInput.turnId)
        await input.appendRuntimeDebugLine('chat-stream.visual-one-shot-started', {
          cardId,
          turnId,
          timeoutMs: oneShotInput.timeoutMs,
          toolCount: Array.isArray(oneShotInput.tools) ? oneShotInput.tools.length : 0,
          messageCount: oneShotInput.messages.length,
        })
        try {
          const result = await generateAlicizationMainChatNonStreaming({
            ...oneShotInput,
            emotionalKernel: resolvePreparedMainChatOneShotEmotionalKernel(prepared),
          })
          await input.appendRuntimeDebugLine('chat-stream.visual-one-shot-finished', {
            cardId,
            turnId,
            finishReason: result.finishReason,
            finalChars: result.fullText.length,
          })
          return result
        }
        catch (error) {
          await input.appendRuntimeDebugLine('chat-stream.visual-one-shot-failed', {
            cardId,
            turnId,
            timeoutMs: oneShotInput.timeoutMs,
            reason: error instanceof Error ? error.message : String(error),
          })
          throw error
        }
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
          triggerIso: typeof summary.triggerAt === 'number' ? new Date(summary.triggerAt).toISOString() : undefined,
        })
      },
      appendRuntimeDebugLine: input.appendRuntimeDebugLine,
      rewriteStructuredVisibleReply: rewriteStructuredVisibleReplyIfNeeded,
      delayVisibleRelease: true,
      turnRuntimeContext: prepared?.turnRuntimeContext ?? null,
    })
    const effectiveStreamFullText = sanitizeText(streamResult.fullText, '')
      || (
        (streamResult.visibleReplyCritic || streamResult.visibleReplyClosure || streamResult.visibleReplyProjectStateAudit)
          ? sanitizeText(JSON.stringify({
              format: 'mind-turn-v1',
              thought: currentStructuredThought ?? '',
              emotion: (currentStructuredPerformance ?? normalizeAlicizationPerformancePayload(undefined, 'thinking')).baseEmotion,
              reply: releasedVisibleReplyText
                || deriveAlicizationVisibleReplyText(streamMetaEmitter.getLastReply())
                || '',
              performance: currentStructuredPerformance ?? normalizeAlicizationPerformancePayload(undefined, 'thinking'),
              visibleReplyRealization: streamResult.visibleReplyProjectStateAudit
                ? {
                    projectStateAudit: streamResult.visibleReplyProjectStateAudit,
                  }
                : undefined,
            }), '')
          : ''
      )
    if (effectiveStreamFullText.trim()) {
      await suppressInlineExecutionDeliveries()
      await suppressFreshExecutionReplyDeliveryIfNeeded()
    }
    currentVisibleReplyExecution = streamResult.visibleReplyExecution
    const shapedFullText = (() => {
      const parsed = parseJsonObjectFromText(effectiveStreamFullText)
      if (parsed) {
        if (needsStructuredStreamFinishRehydration(parsed)) {
          return ensureStructuredRecoveredText({
            fullText: effectiveStreamFullText,
            visibleReplyExecution: streamResult.visibleReplyExecution,
          })
        }
        const visibleReplyText = deriveAlicizationVisibleReplyText(effectiveStreamFullText).trim()
        const thought = typeof parsed.thought === 'string' ? parsed.thought : currentStructuredThought
        const enriched = backfillStructuredLifeAuthority({
          structured: parsed,
          reply: visibleReplyText,
          thought,
        })
        return enriched ? JSON.stringify(enriched) : effectiveStreamFullText
      }
      return buildStructuredStreamFinishFallback({
        fullText: effectiveStreamFullText,
        visibleReplyExecution: streamResult.visibleReplyExecution,
      }) ?? effectiveStreamFullText
    })()
    const parsedStructured = parseJsonObjectFromText(shapedFullText)
    currentStructuredGovernance = parsedStructured?.governance && typeof parsedStructured.governance === 'object'
      ? parsedStructured.governance as AlicizationMindTurnGovernance
      : null
    const maybePerformance = parsedStructured?.performance
    const maybeThought = parsedStructured?.thought
    const parsedStructuredDigitalLifeSpine = normalizeAlicizationDigitalLifeSpineDigest(parsedStructured?.digitalLifeSpine ?? null)
    const parsedStructuredProjection = parsedStructuredDigitalLifeSpine?.memory?.personStateProjection as AlicizationPersonStateProjectionShape | null | undefined
    const currentStructuredProjection = currentStructuredDigitalLifeSpine?.memory?.personStateProjection as AlicizationPersonStateProjectionShape | null | undefined
    const parsedStructuredAuthority = parsedStructuredDigitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority as AlicizationSelfContinuityAuthorityShape | null | undefined
    const currentStructuredAuthority = currentStructuredDigitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority as AlicizationSelfContinuityAuthorityShape | null | undefined
    const preferredParsedProjection = resolvePreferredPersonStateProjection({
      bundleProjection: parsedStructuredProjection ?? null,
      runtimeProjection: currentStructuredProjection ?? null,
    })
    const mergedStructuredSelfContinuityAuthority = mergePreferredSelfContinuityAuthority({
      bundleAuthority: parsedStructuredAuthority ?? null,
      runtimeAuthority: currentStructuredAuthority ?? null,
    }) ?? resolvePreferredSelfContinuityAuthority({
      bundleAuthority: parsedStructuredAuthority ?? null,
      runtimeAuthority: currentStructuredAuthority ?? null,
    })
    const mergedParsedStructuredDigitalLifeSpine = parsedStructuredDigitalLifeSpine
      ? normalizeAlicizationDigitalLifeSpineDigest({
        ...parsedStructuredDigitalLifeSpine,
        memory: {
          ...parsedStructuredDigitalLifeSpine.memory,
          personStateProjection: preferredParsedProjection
            ? {
                ...preferredParsedProjection,
                summary: preferContinuityRichProjectionText({
                  persisted: currentStructuredDigitalLifeSpine?.memory?.personStateProjection?.summary ?? null,
                  derived: preferredParsedProjection.summary,
                  requireProjectContinuity: true,
                }) ?? preferredParsedProjection.summary ?? null,
                selfContinuityAuthority: mergedStructuredSelfContinuityAuthority ?? preferredParsedProjection.selfContinuityAuthority ?? null,
              }
            : parsedStructuredDigitalLifeSpine.memory?.personStateProjection ?? null,
        },
      }) ?? parsedStructuredDigitalLifeSpine
      : null
    currentStructuredDigitalLifeSpine = mergedParsedStructuredDigitalLifeSpine
      ? mergeStructuredDigitalLifeSpineContinuityCarry(mergedParsedStructuredDigitalLifeSpine)
      : null
    if (
      currentStructuredDigitalLifeSpine?.runtime?.projectState?.sameHerSelfLine
      && currentStructuredDigitalLifeSpine.memory?.personStateProjection?.selfContinuityAuthority
    ) {
      const currentAuthoritySourceTags
        = currentStructuredDigitalLifeSpine.memory.personStateProjection.selfContinuityAuthority.sourceTags ?? []
      const shouldCarryCallbackProjectContinuityTag = Array.isArray(currentAuthoritySourceTags)
        && currentAuthoritySourceTags.includes('continuity-execution-callback-project-carry')
      currentStructuredDigitalLifeSpine = normalizeAlicizationDigitalLifeSpineDigest({
        ...currentStructuredDigitalLifeSpine,
        memory: {
          ...currentStructuredDigitalLifeSpine.memory,
          personStateProjection: currentStructuredDigitalLifeSpine.memory.personStateProjection
            ? {
                ...currentStructuredDigitalLifeSpine.memory.personStateProjection,
                selfContinuityAuthority: {
                  ...currentStructuredDigitalLifeSpine.memory.personStateProjection.selfContinuityAuthority,
                  sourceTags: Array.from(new Set([
                    ...currentAuthoritySourceTags,
                    'project-state-carry',
                    ...(shouldCarryCallbackProjectContinuityTag ? ['continuity-execution-callback-project-carry'] : []),
                  ])),
                },
              }
            : currentStructuredDigitalLifeSpine.memory.personStateProjection,
        },
      })
    }
    currentStructuredPerformance = resolveStructuredPerformancePayload(maybePerformance)
    currentStructuredThought = typeof maybeThought === 'string' ? maybeThought : null
    const finalVisibleReplyText = deriveAlicizationVisibleReplyText(shapedFullText)
    if (
      finalVisibleReplyText
      && currentStructuredDigitalLifeSpine
      && sameLineMeasuredReturnPattern.test([
        finalVisibleReplyText,
        currentStructuredThought ?? '',
      ].join(' | '))
    ) {
      currentStructuredDigitalLifeSpine = normalizeAlicizationDigitalLifeSpineDigest({
        ...currentStructuredDigitalLifeSpine,
        runtime: {
          ...((currentStructuredDigitalLifeSpine.runtime && typeof currentStructuredDigitalLifeSpine.runtime === 'object')
            ? currentStructuredDigitalLifeSpine.runtime as unknown as Record<string, unknown>
            : {}),
          continuityArcStage: 'same-thread-continuation',
        },
      })
    }
    if (currentStructuredDigitalLifeSpine)
      currentStructuredDigitalLifeSpine = reconcileStructuredDigitalLifeRuntimeState(currentStructuredDigitalLifeSpine).digitalLifeSpine
    const finalAuthoritativeDigitalLifeSpine = currentStructuredDigitalLifeSpine ?? resolveCurrentDigitalLifeSpine()
    if (finalVisibleReplyText && currentStructuredPerformance)
      emitStreamEmbodimentMeta(finalVisibleReplyText, { force: true })
    if (finalVisibleReplyText && finalAuthoritativeDigitalLifeSpine)
      emitStreamEmbodimentMeta(finalVisibleReplyText, { force: true })
    if (finalVisibleReplyText && finalAuthoritativeDigitalLifeSpine) {
      emitFinalAuthoritativeMeta({
        reply: finalVisibleReplyText,
        thought: currentStructuredThought,
        performance: currentStructuredPerformance,
        digitalLifeSpine: finalAuthoritativeDigitalLifeSpine,
      })
    }
    let hostVisibleFullText = shapedFullText
    let finalizedResolvedReply: AlicizationResolvedVisibleReply | null = null
    let finalizedProjectStateAuditCarry: Record<string, unknown> | null = null
    if (prepared) {
      const shapedStructured = parseJsonObjectFromText(shapedFullText)
      const shapedVisibleReplyRealization = shapedStructured?.visibleReplyRealization
        && typeof shapedStructured.visibleReplyRealization === 'object'
        ? shapedStructured.visibleReplyRealization as Record<string, unknown>
        : null
      const shapedProjectStateAudit = shapedStructured?.projectStateAudit
        && typeof shapedStructured.projectStateAudit === 'object'
        ? shapedStructured.projectStateAudit as Record<string, unknown>
        : (
            shapedVisibleReplyRealization?.projectStateAudit
            && typeof shapedVisibleReplyRealization.projectStateAudit === 'object'
              ? shapedVisibleReplyRealization.projectStateAudit as Record<string, unknown>
              : null
          )
      const streamResultProjectStateAudit = streamResult.visibleReplyProjectStateAudit
        && typeof streamResult.visibleReplyProjectStateAudit === 'object'
        ? streamResult.visibleReplyProjectStateAudit as Record<string, unknown>
        : null
      const canonicalProjectState = resolveAlicizationProjectStateBrief()
      const shouldCanonicalizeSyntheticProjectStateAuditCarry = Boolean(
        streamResultProjectStateAudit
        && !parseJsonObjectFromText(sanitizeText(streamResult.fullText, ''))
        && (
          looksLikeThinProjectAwarenessShell(
            sanitizeText(streamResultProjectStateAudit.preDialogueAwarenessSummary, '') || null,
          )
          || looksLikeThinProjectClosureCarry({
            value: sanitizeText(streamResultProjectStateAudit.landedProgressSummary, '') || null,
            kind: 'landed',
          })
          || looksLikeThinProjectClosureCarry({
            value: sanitizeText(streamResultProjectStateAudit.openClosureSummary, '') || null,
            kind: 'open',
          })
          || looksLikeThinProjectClosureCarry({
            value: sanitizeText(streamResultProjectStateAudit.nextClosureTargetSummary, '') || null,
            kind: 'next',
          })
        ),
      )
      const rawCarriedProjectStateAudit = shapedProjectStateAudit ?? streamResultProjectStateAudit ?? latestSettledProjectStateAudit
      const normalizedRawCarriedProjectStateAudit = normalizeProjectStateAuditCarry(rawCarriedProjectStateAudit)
      const carriedProjectStateAudit: AlicizationBackgroundProjectStateAudit | null = normalizedRawCarriedProjectStateAudit
        ? {
            ...normalizedRawCarriedProjectStateAudit,
            ...(shouldCanonicalizeSyntheticProjectStateAuditCarry
              ? {
                  sameHerSummary: canonicalProjectState.sameHerSelfLine,
                  currentPhaseSummary: canonicalProjectState.currentPhase,
                  landedProgressSummary:
                    canonicalProjectState.latestProgress
                    ?? normalizedRawCarriedProjectStateAudit.landedProgressSummary
                    ?? null,
                  openClosureSummary:
                    canonicalProjectState.openLoops?.[0]
                    ?? normalizedRawCarriedProjectStateAudit.openClosureSummary
                    ?? null,
                  nextClosureTargetSummary:
                    canonicalProjectState.nextClosureTarget
                    ?? normalizedRawCarriedProjectStateAudit.nextClosureTargetSummary
                    ?? null,
                  preDialogueAwarenessSummary:
                    resolvePreparedVisibleReplyPreDialogueAwarenessSeed()
                    ?? canonicalProjectState.preDialogueAwarenessLine
                    ?? normalizedRawCarriedProjectStateAudit.preDialogueAwarenessSummary
                    ?? null,
                }
              : {}),
            sameHerSummary: preferStrongerSameHerProjectStateText({
              current: looksLikeSameHerSelfLine(sanitizeText(normalizedRawCarriedProjectStateAudit.sameHerSummary, ''))
                ? sanitizeText(normalizedRawCarriedProjectStateAudit.sameHerSummary, '')
                : null,
              candidate: resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateSameHerSummary,
            }) ?? resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateSameHerSummary,
          }
        : rawCarriedProjectStateAudit
      finalizedProjectStateAuditCarry = carriedProjectStateAudit
      const continuityInputs = resolveAlicizationExecutionPayoffContinuityInputs({
        runtimeSurface: prepared.runtimeSurface,
      })
      const selfAuthority = continuityInputs.selfContinuityAuthority
      const shapedFullTextWithCarriedAudit = carriedProjectStateAudit
        ? ensureStructuredVisibleReplyProjectStateAudit({
            fullText: shapedFullText,
            projectStateAudit: carriedProjectStateAudit,
          })
        : shapedFullText
      const resolvedReply = buildAlicizationResolvedVisibleReply({
        fullText: shapedFullTextWithCarriedAudit,
        visibleReplyExecution: streamResult.visibleReplyExecution,
        emotionalClosureCue: prepared.mindTurnContract?.emotionalClosureCue ?? null,
        projectStateEmotionalClosureSummary: resolvePreparedVisibleReplyProjectStateAuditSeed().emotionalClosureSummary,
        selfAuthoritySummary: selfAuthority?.authoritySummary ?? null,
        selfAuthorityClosenessPosture: selfAuthority?.closenessPosture ?? null,
        projectStateSameHerSummary: sanitizeText(carriedProjectStateAudit?.sameHerSummary, '')
          || resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateSameHerSummary,
        projectStateSameHerHoldDetail: sanitizeText(carriedProjectStateAudit?.sameHerHoldDetail, '')
          || resolvePreparedVisibleReplyProjectStateAuditSeed().sameHerHoldDetail,
        projectStateContinuityArcStage: sanitizeText(carriedProjectStateAudit?.continuityArcStage, '')
          || resolvePreparedVisibleReplyProjectStateAuditSeed().continuityArcStage,
        projectStateContinuityCue: sanitizeText(carriedProjectStateAudit?.continuityCue, '')
          || resolvePreparedVisibleReplyProjectStateAuditSeed().continuityCue,
        projectStateSameHerDriftRiskSummary: sanitizeText(carriedProjectStateAudit?.sameHerDriftRiskSummary, '')
          || resolvePreparedVisibleReplyProjectStateAuditSeed().sameHerDriftRiskSummary,
        projectStateProactiveSameHerGapSummary: sanitizeText(carriedProjectStateAudit?.proactiveSameHerGapSummary, '')
          || resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateProactiveSameHerGapSummary,
        projectStateCurrentPhaseSummary: sanitizeText(carriedProjectStateAudit?.currentPhaseSummary, '')
          || resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateCurrentPhaseSummary,
        projectStateLandedProgressSummary: sanitizeText(carriedProjectStateAudit?.landedProgressSummary, '')
          || resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateLandedProgressSummary,
        projectStateOpenClosureSummary: sanitizeText(carriedProjectStateAudit?.openClosureSummary, '')
          || resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateOpenClosureSummary,
        projectStateNextClosureTargetSummary: sanitizeText(carriedProjectStateAudit?.nextClosureTargetSummary, '')
          || resolvePreparedVisibleReplyProjectStateAuditSeed().projectStateNextClosureTargetSummary,
        projectStatePreDialogueAwarenessSummary: sanitizeText(carriedProjectStateAudit?.preDialogueAwarenessSummary, '')
          || resolvePreparedVisibleReplyProjectStateAuditSeed().projectStatePreDialogueAwarenessSummary,
        prepared,
        critic: streamResult.visibleReplyCritic ?? buildAlicizationVisibleReplyCriticArtifact({
          fullText: shapedFullText,
          visibleReplyExecution: streamResult.visibleReplyExecution,
          prepared,
        }),
        closure: streamResult.visibleReplyClosure ?? null,
      })
      finalizedResolvedReply = resolvedReply
      try {
        hostVisibleFullText = normalizeTopLevelProjectStateAwarenessFromRealization(ensureStructuredVisibleReplyProjectStateAudit({
          fullText: injectLatestProjectStateAuditIfMissing(
            ensureStructuredProjectStateHostVisibleClosure({
              fullText: shapedFullText,
              resolvedReply,
              projectStateAudit: resolvedReply.realization.projectStateAudit ?? null,
            }),
          ),
          projectStateAudit: resolvedReply.realization.projectStateAudit ?? null,
        }))
      }
      catch (error) {
        await input.appendRuntimeDebugLine('chat-stream.host-visible-rebuild-failed', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          reason: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
      const nextPrepared = {
        ...prepared,
      }
      try {
        prepared = {
          ...nextPrepared,
          turnGraph: rebuildPreparedTurnGraph(nextPrepared, resolvedReply.realization),
        }
      }
      catch (error) {
        await input.appendRuntimeDebugLine('chat-stream.turn-graph-rebuild-failed', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          reason: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
      try {
        await Promise.resolve(input.recordPreparedMindTrace?.({
          payload,
          prepared,
          preDialogueAwarenessDebug: preDialogueAwarenessDebug ?? undefined,
        }))
      }
      catch (error) {
        await input.appendRuntimeDebugLine('chat-stream.completed-mind-trace-failed', {
          cardId: input.runState.cardId,
          turnId: input.runState.turnId,
          reason: error instanceof Error ? error.message : String(error),
        })
      }
    }
    try {
      if (emitVisibleReplyFallbackIfMissing(shapedFullText)) {
        await input.appendRuntimeDebugLine('chat-stream.visible-release-fallback-after-success', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          visibleChars: releasedVisibleReplyText.length,
          finishReason: streamResult.finishReason,
        })
      }
    }
    catch (error) {
      await input.appendRuntimeDebugLine('chat-stream.visible-release-fallback-failed', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        reason: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
    let finalizedHostVisibleFullText = ''
    try {
      finalizedHostVisibleFullText = normalizeTopLevelProjectStateAwarenessFromRealization(ensureStructuredVisibleReplyProjectStateAudit({
        fullText: enrichStructuredFullTextWithLifeAuthority({
          fullText: hostVisibleFullText,
        }),
        projectStateAudit: finalizedResolvedReply?.realization.projectStateAudit ?? finalizedProjectStateAuditCarry ?? null,
      }))
      if (!sanitizeText(finalizedHostVisibleFullText, '')) {
        finalizedHostVisibleFullText = normalizeTopLevelProjectStateAwarenessFromRealization(ensureStructuredVisibleReplyProjectStateAudit({
          fullText: finalizedResolvedReply ? buildHostVisibleResolvedReply(finalizedResolvedReply).fullText : hostVisibleFullText,
          projectStateAudit: finalizedResolvedReply?.realization.projectStateAudit ?? finalizedProjectStateAuditCarry ?? null,
        }))
      }
    }
    catch (error) {
      await input.appendRuntimeDebugLine('chat-stream.finalize-host-visible-full-text-failed', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        reason: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
    finalizedHostVisibleFullText = normalizeTopLevelProjectStateAwarenessFromRealization(finalizedHostVisibleFullText)
    const rebuiltHostVisiblePayload = sanitizeText(
      finalizedResolvedReply ? buildHostVisibleResolvedReply(finalizedResolvedReply).fullText : '',
      '',
    )
    const finalizedCarriesRecoveredLifeAuthority = carriesRecoveredStructuredLifeAuthority(finalizedHostVisibleFullText)
    const hostVisibleCarriesRecoveredLifeAuthority = carriesRecoveredStructuredLifeAuthority(hostVisibleFullText)
    const rebuiltCarriesRecoveredLifeAuthority = carriesRecoveredStructuredLifeAuthority(rebuiltHostVisiblePayload)
    const preferredHostVisiblePayloadSource = finalizedCarriesRecoveredLifeAuthority
      ? finalizedHostVisibleFullText
      : hostVisibleCarriesRecoveredLifeAuthority
        ? hostVisibleFullText
        : rebuiltCarriesRecoveredLifeAuthority
          ? rebuiltHostVisiblePayload
          : carriesRecoveredStructuredLifeAuthority(shapedFullText)
            ? shapedFullText
            : (
                sanitizeText(finalizedHostVisibleFullText, '')
                || sanitizeText(hostVisibleFullText, '')
                || rebuiltHostVisiblePayload
                || shapedFullText
              )
    const authoritativeHostVisiblePayloadSource = (() => {
      const parsedPreferred = parseJsonObjectFromText(preferredHostVisiblePayloadSource)
      if (!parsedPreferred)
        return preferredHostVisiblePayloadSource

      const parsedPerformance = parsedPreferred.performance && typeof parsedPreferred.performance === 'object'
        ? parsedPreferred.performance as Record<string, unknown>
        : null
      const structuredPerformance = currentStructuredPerformance && typeof currentStructuredPerformance === 'object'
        ? currentStructuredPerformance as unknown as Record<string, unknown>
        : null
      const parsedDigitalLifeSpine = parsedPreferred.digitalLifeSpine && typeof parsedPreferred.digitalLifeSpine === 'object'
        ? parsedPreferred.digitalLifeSpine as Record<string, unknown>
        : null
      const parsedDigitalLifeRuntime = parsedDigitalLifeSpine?.runtime && typeof parsedDigitalLifeSpine.runtime === 'object'
        ? parsedDigitalLifeSpine.runtime as Record<string, unknown>
        : null
      const parsedProjectState = parsedPreferred.projectState && typeof parsedPreferred.projectState === 'object'
        ? parsedPreferred.projectState as Record<string, unknown>
        : null
      const parsedRuntimeDigest = parsedPreferred.runtimeDigest && typeof parsedPreferred.runtimeDigest === 'object'
        ? parsedPreferred.runtimeDigest as Record<string, unknown>
        : null
      const parsedRuntimeDigestProjectState = parsedRuntimeDigest?.projectState && typeof parsedRuntimeDigest.projectState === 'object'
        ? parsedRuntimeDigest.projectState as Record<string, unknown>
        : null
      const structuredDigitalLifeSpine = currentStructuredDigitalLifeSpine && typeof currentStructuredDigitalLifeSpine === 'object'
        ? currentStructuredDigitalLifeSpine as unknown as Record<string, unknown>
        : null
      const structuredDigitalLifeRuntime = structuredDigitalLifeSpine?.runtime && typeof structuredDigitalLifeSpine.runtime === 'object'
        ? structuredDigitalLifeSpine.runtime as Record<string, unknown>
        : null
      const authoritativeRuntimeDigest = resolveCurrentRuntimeDigest()
      const authoritativeContinuityArcStage = sanitizeText(parsedDigitalLifeRuntime?.continuityArcStage, '')
        || sanitizeText(parsedProjectState?.continuityArcStage, '')
        || sanitizeText(parsedRuntimeDigestProjectState?.continuityArcStage, '')
        || sanitizeText(structuredDigitalLifeRuntime?.continuityArcStage, '')
        || sanitizeText(authoritativeRuntimeDigest?.projectState?.continuityArcStage ?? authoritativeRuntimeDigest?.currentConsciousFrame?.continuityArcStage, '')
      const authoritativeContinuityPreferredTiming = sanitizeText(parsedDigitalLifeRuntime?.continuityPreferredTiming, '')
        || sanitizeText(parsedProjectState?.continuityPreferredTiming, '')
        || sanitizeText(parsedRuntimeDigestProjectState?.continuityPreferredTiming, '')
        || sanitizeText(structuredDigitalLifeRuntime?.continuityPreferredTiming, '')
        || sanitizeText(authoritativeRuntimeDigest?.projectState?.continuityPreferredTiming ?? authoritativeRuntimeDigest?.currentConsciousFrame?.continuityPreferredTiming, '')
      const authoritativePreferredBlinkCadence = sanitizeText(parsedRuntimeDigestProjectState?.preferredBlinkCadence, '')
        || sanitizeText(parsedProjectState?.preferredBlinkCadence, '')
        || sanitizeText(authoritativeRuntimeDigest?.projectState?.preferredBlinkCadence, '')
      const authoritativePreferredGazeMode = sanitizeText(parsedRuntimeDigestProjectState?.preferredGazeMode, '')
        || sanitizeText(parsedProjectState?.preferredGazeMode, '')
        || sanitizeText(authoritativeRuntimeDigest?.projectState?.preferredGazeMode, '')
      const resolvedActionCue = sanitizeText(parsedPerformance?.actionCue, '')
        || sanitizeText(structuredPerformance?.actionCue, '')
      const shouldPatchPerformance = Boolean(structuredPerformance)
        && resolvedActionCue !== sanitizeText(parsedPerformance?.actionCue, '')
      const shouldPatchDigitalLifeRuntime
        = Boolean(structuredDigitalLifeRuntime || authoritativeContinuityArcStage || authoritativeContinuityPreferredTiming)
          && (
            authoritativeContinuityArcStage !== sanitizeText(parsedDigitalLifeRuntime?.continuityArcStage, '')
            || authoritativeContinuityPreferredTiming !== sanitizeText(parsedDigitalLifeRuntime?.continuityPreferredTiming, '')
          )
      const shouldPatchRuntimeDigestProjectState
        = Boolean(
          authoritativeContinuityArcStage
          || authoritativeContinuityPreferredTiming
          || authoritativePreferredBlinkCadence
          || authoritativePreferredGazeMode,
        )
        && (
          authoritativeContinuityArcStage !== sanitizeText(parsedRuntimeDigestProjectState?.continuityArcStage, '')
          || authoritativeContinuityPreferredTiming !== sanitizeText(parsedRuntimeDigestProjectState?.continuityPreferredTiming, '')
          || authoritativePreferredBlinkCadence !== sanitizeText(parsedRuntimeDigestProjectState?.preferredBlinkCadence, '')
          || authoritativePreferredGazeMode !== sanitizeText(parsedRuntimeDigestProjectState?.preferredGazeMode, '')
        )
      if (!shouldPatchPerformance && !shouldPatchDigitalLifeRuntime && !shouldPatchRuntimeDigestProjectState)
        return preferredHostVisiblePayloadSource

      return JSON.stringify({
        ...parsedPreferred,
        ...(shouldPatchPerformance
          ? {
              performance: {
                ...parsedPerformance,
                ...structuredPerformance,
                actionCue: resolvedActionCue,
              },
            }
          : {}),
        ...(shouldPatchDigitalLifeRuntime
          ? {
              digitalLifeSpine: {
                ...parsedDigitalLifeSpine,
                ...structuredDigitalLifeSpine,
                runtime: {
                  ...parsedDigitalLifeRuntime,
                  ...structuredDigitalLifeRuntime,
                  continuityArcStage: authoritativeContinuityArcStage || null,
                  continuityPreferredTiming: authoritativeContinuityPreferredTiming || null,
                },
              },
            }
          : {}),
        ...(shouldPatchRuntimeDigestProjectState
          ? {
              runtimeDigest: {
                ...parsedRuntimeDigest,
                projectState: {
                  ...parsedRuntimeDigestProjectState,
                  continuityArcStage: authoritativeContinuityArcStage || null,
                  continuityPreferredTiming: authoritativeContinuityPreferredTiming || null,
                  preferredBlinkCadence: authoritativePreferredBlinkCadence || null,
                  preferredGazeMode: authoritativePreferredGazeMode || null,
                },
              },
            }
          : {}),
      })
    })()
    const finalizedHostVisiblePayloadCandidate = sanitizeText(
      normalizeTopLevelProjectStateAwarenessFromRealization(ensureStructuredVisibleReplyProjectStateAudit({
        fullText: ensureStructuredProjectStateHostVisibleClosure({
          fullText: authoritativeHostVisiblePayloadSource,
          resolvedReply: finalizedResolvedReply,
          projectStateAudit: finalizedResolvedReply?.realization.projectStateAudit ?? finalizedProjectStateAuditCarry ?? null,
        }),
        projectStateAudit: finalizedResolvedReply?.realization.projectStateAudit ?? finalizedProjectStateAuditCarry ?? null,
      })),
      '',
    )
    let finalHostVisiblePayload = finalizedHostVisiblePayloadCandidate
      || sanitizeText(authoritativeHostVisiblePayloadSource, '')
      || sanitizeText(preferredHostVisiblePayloadSource, '')
      || sanitizeText(shapedFullText, '')
    finalHostVisiblePayload = (() => {
      const parsed = parseJsonObjectFromText(finalHostVisiblePayload)
      if (!parsed)
        return finalHostVisiblePayload

      const projectState = parsed.projectState && typeof parsed.projectState === 'object'
        ? parsed.projectState as Record<string, unknown>
        : null
      const preDialogueAwareness = parsed.preDialogueAwareness && typeof parsed.preDialogueAwareness === 'object'
        ? parsed.preDialogueAwareness as Record<string, unknown>
        : null
      const visibleReplyRealization = parsed.visibleReplyRealization && typeof parsed.visibleReplyRealization === 'object'
        ? parsed.visibleReplyRealization as Record<string, unknown>
        : null
      const projectStateAudit = visibleReplyRealization?.projectStateAudit
        && typeof visibleReplyRealization.projectStateAudit === 'object'
        ? visibleReplyRealization.projectStateAudit as Record<string, unknown>
        : null
      const currentAwarenessLine = sanitizeText(
        projectState?.preDialogueAwarenessLine
        ?? projectState?.awarenessLine
        ?? projectStateAudit?.preDialogueAwarenessSummary
        ?? preDialogueAwareness?.awarenessLine
        ?? '',
        '',
      ) || null
      const currentAwarenessLooksThin = Boolean(
        currentAwarenessLine
        && (
          looksLikeThinProjectAwarenessShell(currentAwarenessLine)
          || looksLikeStructuredProjectAwarenessSummaryShell(currentAwarenessLine)
          || looksLikeGeneratedProjectAwarenessExpansion(currentAwarenessLine)
        ),
      )
      if (!currentAwarenessLooksThin)
        return finalHostVisiblePayload

      const explicitAuditAwarenessLine = sanitizeText(preferExplicitProjectAwarenessOverCanonicalReanchor({
        current: sanitizeText(projectStateAudit?.preDialogueAwarenessSummary ?? '', '') || null,
        candidate: sanitizeText(projectState?.preDialogueAwarenessSummary ?? '', '') || null,
      }) ?? '', '') || null
      const explicitAuditAwarenessLooksStrong = Boolean(
        explicitAuditAwarenessLine
        && !looksLikeThinProjectAwarenessShell(explicitAuditAwarenessLine)
        && !looksLikeCanonicalProjectAwarenessReanchor(explicitAuditAwarenessLine)
        && !looksLikeStructuredProjectAwarenessSummaryShell(explicitAuditAwarenessLine)
        && !looksLikeGeneratedProjectAwarenessExpansion(explicitAuditAwarenessLine),
      )
      const canonicalProjectState = resolveAlicizationProjectStateBrief()
      const canonicalAwarenessLine = sanitizeText(canonicalProjectState.preDialogueAwarenessLine ?? '', '') || null
      const preferredFinalAwarenessLine = explicitAuditAwarenessLooksStrong
        ? explicitAuditAwarenessLine
        : canonicalAwarenessLine
      if (!preferredFinalAwarenessLine)
        return finalHostVisiblePayload

      return JSON.stringify({
        ...parsed,
        projectState: {
          ...projectState,
          identity:
            sanitizeText(projectState?.identity ?? '', '')
            || canonicalProjectState.identity,
          currentPhase:
            sanitizeText(projectState?.currentPhase ?? '', '')
            || canonicalProjectState.currentPhase,
          preDialogueAwarenessLine: preferredFinalAwarenessLine,
          awarenessLine: preferredFinalAwarenessLine,
          preDialogueAwarenessSummary: preferredFinalAwarenessLine,
        },
        preDialogueAwareness: preDialogueAwareness
          ? {
              ...preDialogueAwareness,
              awarenessLine: preferredFinalAwarenessLine,
              summaryLine: preferredFinalAwarenessLine,
            }
          : {
              awarenessLine: preferredFinalAwarenessLine,
              summaryLine: preferredFinalAwarenessLine,
            },
        visibleReplyRealization: visibleReplyRealization
          ? {
              ...visibleReplyRealization,
              projectStateAudit: projectStateAudit
                ? {
                    ...projectStateAudit,
                    preDialogueAwarenessSummary: preferredFinalAwarenessLine,
                  }
                : projectStateAudit,
            }
          : visibleReplyRealization,
      })
    })()
    try {
      await input.appendRuntimeDebugLine('chat-stream.completed-finish-shape', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        streamFullTextChars: streamResult.fullText.length,
        shapedFullTextChars: shapedFullText.length,
        hostVisibleFullTextChars: hostVisibleFullText.length,
        finalizedHostVisibleFullTextChars: finalizedHostVisibleFullText.length,
        finalHostVisiblePayloadChars: finalHostVisiblePayload.length,
        shapedCarriesRecoveredLifeAuthority: carriesRecoveredStructuredLifeAuthority(shapedFullText),
        hostVisibleCarriesRecoveredLifeAuthority,
        rebuiltCarriesRecoveredLifeAuthority,
        finalizedCarriesRecoveredLifeAuthority,
        finalCarriesRecoveredLifeAuthority: carriesRecoveredStructuredLifeAuthority(finalHostVisiblePayload),
      })
    }
    catch {}
    try {
      await input.appendRuntimeDebugLine('chat-stream.completed-finish-payload-preview', {
        cardId: input.payload.cardId,
        turnId: input.payload.turnId,
        finalHostVisiblePayload,
      })
    }
    catch {}
    const finalVisibleReplyRealization = resolveFinishPayloadVisibleReplyRealization(finalHostVisiblePayload)
    input.runStateController.finishRun(input.key, {
      status: 'completed',
      finishReason: streamResult.finishReason,
      fullText: finalHostVisiblePayload,
      visibleReplyRealization: finalVisibleReplyRealization
        ?? finalizedResolvedReply?.realization
        ?? (finalizedProjectStateAuditCarry
          ? {
              projectStateAudit: finalizedProjectStateAuditCarry,
            }
          : undefined),
      visibleReplyExecution: streamResult.visibleReplyExecution ?? currentVisibleReplyExecution ?? undefined,
      visibleReplyCritic: streamResult.visibleReplyCritic ?? null,
      visibleReplyClosure: streamResult.visibleReplyClosure ?? null,
    })
  }
  catch (error) {
    let failureError: unknown = error
    if (isAlicizationRequiredToolMissingError(error)) {
      try {
        const deterministicRecovery = await attemptDeterministicRequiredToolRecovery({
          error,
          origin: 'stream',
          toolInputOverrides: preparedExecutionToolInputOverrides,
        })
        if (deterministicRecovery) {
          const payoffReply = await attemptInlineExecutionPayoff(deterministicRecovery)
          await emitResolvedVisibleReply(payoffReply)
          await suppressInlineExecutionDeliveries()
          input.runStateController.finishRun(input.key, {
            status: 'completed',
            finishReason: 'required-tool-recovered',
            fullText: payoffReply.fullText,
            visibleReplyExecution: payoffReply.visibleReplyExecution,
            visibleReplyRealization: payoffReply.realization,
          })
          return
        }
      }
      catch (recoveryError) {
        failureError = recoveryError
        await input.appendRuntimeDebugLine('chat-stream.required-tool-recovery-failed', {
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          origin: 'stream',
          reason: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
        })
      }
    }

    await handleAlicizationMainChatRunFailure({
      error: failureError,
      prepared,
      controller: input.runState.controller,
      mainGateway: input.mainGateway,
      chatConfig,
      messages,
      headers: input.headers,
      tools,
      toolChoice,
      timeoutRecoveryMode,
      timeoutRecoveryMs,
      payload: input.payload,
      dispatchBound: input.runState.hasLoggedDispatchBinding === true,
      nonProgressEventTypes,
      isRunActive: input.isRunActive,
      ensureMainGatewayReachable: input.ensureMainGatewayReachable,
      recordMainGatewayGenerationTimeout: input.recordMainGatewayGenerationTimeout,
      recoverFromTimeout: async (recoveryInput) => {
        let preparedExecution = prepared!
        const normalizedCardId = normalizeCardId(input.payload.cardId ?? input.activeCardId)
        const normalizedTurnId = sanitizeText(input.payload.turnId)
        const requiredToolNames = extractAllowedToolNamesFromToolChoice(recoveryInput.toolChoice, recoveryInput.tools)
        const effectiveRequiredToolNames = requiredToolNames.length > 0
          ? requiredToolNames
          : (preparedExecution.runtimeSurface.tooling?.enforcedToolNames ?? [])
        const toolingRequired = effectiveRequiredToolNames.length > 0
        if (toolingRequired) {
          try {
            const deterministicRecovery = await attemptDeterministicRequiredToolRecovery({
              origin: 'timeout-recovery',
              requiredToolNames: effectiveRequiredToolNames,
              toolInputOverrides: preparedExecutionToolInputOverrides,
            })
            if (deterministicRecovery) {
              const payoffReply = await attemptInlineExecutionPayoff(deterministicRecovery)
              await suppressInlineExecutionDeliveries()
              await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-finished', {
                cardId: normalizedCardId,
                turnId: normalizedTurnId,
                chunkCount: 1,
                rawChunkChars: payoffReply.fullText.length,
                finalChars: payoffReply.fullText.length,
                recoveryMode: 'deterministic-required-tool',
              })
              rememberResolvedVisibleReply(payoffReply)
              return {
                recoveredReply: payoffReply,
                recoveryMode: 'deterministic-required-tool',
              }
            }
          }
          catch (error) {
            await input.appendRuntimeDebugLine('chat-stream.required-tool-recovery-failed', {
              cardId: normalizedCardId,
              turnId: normalizedTurnId,
              origin: 'timeout-recovery',
              recoveryMode: 'deterministic-required-tool',
              reason: error instanceof Error ? error.message : String(error),
            })
          }
        }

        const recoveryAttempts: Array<{
          mode: AlicizationMainChatTimeoutRecoveryMode
          input: typeof recoveryInput & {
            emotionalKernel?: AlicizationRuntimeEmotionalKernelShape | null
            maxSteps?: number
          }
          normalizeRecoveredText?: (rawText: string) => string
        }> = []
        const recoveryConversationMessages = recoveryInput.messages.length > 0
          ? [...conversationMessages, ...recoveryInput.messages]
          : conversationMessages
        const timeoutProjectStateQuestionDetected = recoveryConversationMessages.some((message) => {
          if (message?.role !== 'user')
            return false
          const text = sanitizeText(readTransportContentAsText(message.content), '')
          return /项目.*(什么|程度|进度|闭环|还差)|做到什么程度|还差什么/u.test(text)
        })
        const timeoutPreparedProjectStateDetected = (
          (preparedExecution.governance as AlicizationProjectStateGovernanceShape | null | undefined)?.answerSubject === 'project-state'
          || preparedExecution.mindTurnContract?.projectState != null
          || preparedExecution.mindTurnContract?.answerIntent?.includes('current Phase 1 continuity work has landed')
        )
        const timeoutActiveDialogueDecision = !toolingRequired
          ? deriveAlicizationActiveDialogueFastPathDecision({
              conversationMessages: recoveryConversationMessages,
              prepared: preparedExecution,
              runtimeDigest: resolveRuntimeDigestFromPrepared(),
            })
          : null
        const shouldUpgradeTimeoutRecoveryToProjectState = !toolingRequired && (
          shouldUpgradeDeferredDecisionToProjectState(timeoutActiveDialogueDecision)
          || timeoutProjectStateQuestionDetected
          || timeoutPreparedProjectStateDetected
        )
        if (shouldUpgradeTimeoutRecoveryToProjectState) {
          const preparedExecutionGovernance = preparedExecution.governance as AlicizationProjectStateGovernanceShape | null | undefined
          const upgradedGovernance = enrichProjectStateAnswerGovernanceIfNeeded({
            ...preparedExecutionGovernance,
            answerSubject: 'project-state',
          })
          const upgradedMindTurnContract = preparedExecution.mindTurnContract
            ? enrichProjectStateAnswerGovernanceIfNeeded({
                answerSubject: 'project-state',
                mustDo: preparedExecution.mindTurnContract.mustDo ?? [],
                mustNotDo: preparedExecution.mindTurnContract.mustNotDo ?? [],
              })
            : null

          preparedExecution = {
            ...preparedExecution,
            governance: upgradedGovernance
              ? {
                  ...preparedExecutionGovernance,
                  ...upgradedGovernance,
                  answerSubject: 'project-state',
                } as unknown as AlicizationMindTurnGovernance
              : preparedExecution.governance,
            mindTurnContract: preparedExecution.mindTurnContract
              ? {
                  ...preparedExecution.mindTurnContract,
                  mustDo: upgradedMindTurnContract?.mustDo ?? preparedExecution.mindTurnContract.mustDo,
                  mustNotDo: upgradedMindTurnContract?.mustNotDo ?? preparedExecution.mindTurnContract.mustNotDo,
                }
              : preparedExecution.mindTurnContract,
          }
          prepared = preparedExecution
        }
        const timeoutRecoveryEmotionalKernel = resolvePreparedMainChatOneShotEmotionalKernel(preparedExecution)
        const timeoutActiveDialogueCompactAuthority = decideAlicizationActiveDialogueCompactAuthority(timeoutActiveDialogueDecision)
        const timeoutActiveDialogueUsesCompactRecovery
          = !toolingRequired
            && !!timeoutActiveDialogueDecision
            && timeoutActiveDialogueCompactAuthority.allowed
        if (!toolingRequired && timeoutActiveDialogueDecision && !timeoutActiveDialogueUsesCompactRecovery) {
          await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-active-dialogue-deferred', {
            cardId: normalizedCardId,
            turnId: normalizedTurnId,
            lane: timeoutActiveDialogueDecision.lane,
            strategy: timeoutActiveDialogueDecision.strategy,
            reasonCodes: timeoutActiveDialogueDecision.reasonCodes,
            deferredReason: timeoutActiveDialogueCompactAuthority.reason,
          })
        }
        else if (shouldUpgradeTimeoutRecoveryToProjectState && !timeoutActiveDialogueDecision) {
          await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-project-state-upgraded-without-compact-decision', {
            cardId: normalizedCardId,
            turnId: normalizedTurnId,
            detectedFromMessages: timeoutProjectStateQuestionDetected,
            detectedFromPrepared: timeoutPreparedProjectStateDetected,
          })
        }
        if (timeoutActiveDialogueUsesCompactRecovery && timeoutActiveDialogueDecision) {
          const oneShotTimeoutMs = Math.max(
            timeoutActiveDialogueDecision.timeoutMs,
            6_500,
          )
          recoveryAttempts.push({
            mode: 'active-dialogue-compact',
            input: {
              ...recoveryInput,
              emotionalKernel: timeoutRecoveryEmotionalKernel,
              messages: buildAlicizationActiveDialogueFastPathMessages({
                conversationMessages: recoveryConversationMessages,
                decision: timeoutActiveDialogueDecision,
                prepared: preparedExecution,
              }),
              tools: undefined,
              toolChoice: undefined,
              timeoutMs: Math.max(
                oneShotTimeoutMs,
                Math.min(recoveryInput.timeoutMs, 9_000),
              ),
              maxSteps: 2,
            },
            normalizeRecoveredText: rawText => normalizeAlicizationActiveDialogueFastPathReplyOrEscalate({
              decision: timeoutActiveDialogueDecision,
              rawText,
            }),
          })
        }
        const effectiveRecoveryInput = timeoutRecoveryMode === 'tools-disabled'
          ? {
              ...recoveryInput,
              messages: ensureTimeoutRecoveryCarriesCanonicalProjectState(recoveryInput.messages),
              tools: undefined,
              toolChoice: undefined,
            }
          : {
              ...recoveryInput,
              messages: ensureTimeoutRecoveryCarriesCanonicalProjectState(recoveryInput.messages),
            }
        recoveryAttempts.push({
          mode: timeoutRecoveryMode === 'tools-disabled' ? 'tools-disabled' : 'non-streaming',
          input: {
            ...effectiveRecoveryInput,
            emotionalKernel: timeoutRecoveryEmotionalKernel,
            timeoutMs: toolingRequired
              ? Math.max(
                  alicizationMainGatewayOneShotRecoveryBudget.toolingRequiredPrimaryMs,
                  recoveryInput.timeoutMs,
                )
              : Math.max(
                  alicizationMainGatewayOneShotRecoveryBudget.primaryMs,
                  recoveryInput.timeoutMs,
                ),
            maxSteps: toolingRequired ? 4 : 2,
          },
        })
        if (!toolingRequired) {
          const minimalMessages = buildAlicizationMinimalContextRecoveryMessages(recoveryInput.messages)
          if (minimalMessages.length < recoveryInput.messages.length || recoveryInput.messages.length > 6) {
            recoveryAttempts.push({
              mode: 'minimal-context-non-streaming',
              input: {
                ...recoveryInput,
                emotionalKernel: timeoutRecoveryEmotionalKernel,
                messages: ensureTimeoutRecoveryCarriesCanonicalProjectState(minimalMessages),
                tools: undefined,
                toolChoice: undefined,
                timeoutMs: Math.max(
                  alicizationMainGatewayOneShotRecoveryBudget.minimalContextMs,
                  recoveryInput.timeoutMs,
                ),
                maxSteps: 2,
              },
            })
          }
        }
        await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-started', {
          cardId: normalizedCardId,
          turnId: normalizedTurnId,
          timeoutMs: recoveryInput.timeoutMs,
          recoveryMode: timeoutRecoveryMode,
          toolCount: Array.isArray(recoveryInput.tools) ? recoveryInput.tools.length : 0,
          messageCount: recoveryInput.messages.length,
          recoveryAttemptModes: recoveryAttempts.map(attempt => attempt.mode),
        })
        let lastRecoveryError: unknown = null
        for (let index = 0; index < recoveryAttempts.length; index += 1) {
          const attempt = recoveryAttempts[index]
          await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-attempt', {
            cardId: normalizedCardId,
            turnId: normalizedTurnId,
            attempt: index + 1,
            totalAttempts: recoveryAttempts.length,
            recoveryMode: attempt.mode,
            timeoutMs: attempt.input.timeoutMs,
            toolCount: Array.isArray(attempt.input.tools) ? attempt.input.tools.length : 0,
            messageCount: attempt.input.messages.length,
            maxSteps: attempt.input.maxSteps ?? 1,
          })
          try {
            const recoveredText = await recoverAlicizationMainChatFromTimeout(attempt.input)
            const normalizedRecoveredText = attempt.normalizeRecoveredText
              ? attempt.normalizeRecoveredText(recoveredText)
              : recoveredText
            if (!normalizedRecoveredText) {
              lastRecoveryError = new Error('empty-recovery-text')
              await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-attempt-empty', {
                cardId: normalizedCardId,
                turnId: normalizedTurnId,
                attempt: index + 1,
                totalAttempts: recoveryAttempts.length,
                recoveryMode: attempt.mode,
              })
              continue
            }

            await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-finished', {
              cardId: normalizedCardId,
              turnId: normalizedTurnId,
              chunkCount: 1,
              rawChunkChars: recoveredText.length,
              finalChars: normalizedRecoveredText.length,
              recoveryMode: attempt.mode,
            })
            const timeoutRecoveredVisibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
              prepared: preparedExecution,
              mode: attempt.mode === 'local-fallback' ? 'local-fallback' : 'provider-one-shot',
              actualVisibleReplyAuthority: attempt.mode === 'local-fallback'
                ? 'local-deterministic-fallback'
                : undefined,
              providerMindExecuted: attempt.mode !== 'local-fallback',
              reason: attempt.mode === 'local-fallback'
                ? 'timeout-recovered-local-fallback'
                : `timeout-recovered-${attempt.mode}`,
            })
            const structuredRecoveredText = shouldForceStructuredRecoveredText(attempt.mode)
              ? (
                  buildStructuredStreamFinishFallback({
                    fullText: normalizedRecoveredText,
                    visibleReplyExecution: timeoutRecoveredVisibleReplyExecution,
                  })
                  ?? ensureStructuredRecoveredText({
                    fullText: normalizedRecoveredText,
                    visibleReplyExecution: timeoutRecoveredVisibleReplyExecution,
                  })
                )
              : ensureStructuredRecoveredText({
                  fullText: normalizedRecoveredText,
                  visibleReplyExecution: timeoutRecoveredVisibleReplyExecution,
                })
            await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-structured-shape', {
              cardId: normalizedCardId,
              turnId: normalizedTurnId,
              recoveryMode: attempt.mode,
              structuredStartsWithBrace: structuredRecoveredText.startsWith('{'),
              normalizedStartsWithBrace: normalizedRecoveredText.startsWith('{'),
            })
            const recoveredProjectStateAuditSeed = resolvePreparedVisibleReplyProjectStateAuditSeed()
            const recoveredReply = resolveAlicizationTimeoutRecoveredVisibleReply({
              prepared: preparedExecution,
              recoveredText: structuredRecoveredText,
              recoveryMode: attempt.mode,
            })
            const recoveredReplyProjectStateAudit = recoveredReply.realization.projectStateAudit as AlicizationBackgroundProjectStateAudit | null | undefined
            const recoveredLandedProgressSummary = preferRicherProjectStateAuditText({
              current: recoveredReplyProjectStateAudit?.landedProgressSummary,
              candidate: recoveredProjectStateAuditSeed.projectStateLandedProgressSummary,
            })
            const recoveredOpenClosureSummary = preferRicherProjectStateAuditText({
              current: recoveredReplyProjectStateAudit?.openClosureSummary,
              candidate: recoveredProjectStateAuditSeed.projectStateOpenClosureSummary,
            })
            const groundedPayloadProjectAwarenessSummaryCandidate = (rawPayloadStatus
              || sanitizeText(
                payload.preDialogueSendIdentity?.status,
                '',
              )) === 'grounded'
              ? rawPayloadPreferredPreDialogueAwarenessSummary
              ?? resolvePayloadPreferredPreDialogueAwarenessCarry(payload)
              : null
            const groundedPayloadProjectAwarenessSummary
              = groundedPayloadProjectAwarenessSummaryCandidate
                && !looksLikeThinProjectAwarenessShell(groundedPayloadProjectAwarenessSummaryCandidate)
                && !looksLikeStructuredProjectAwarenessSummaryShell(groundedPayloadProjectAwarenessSummaryCandidate)
                ? groundedPayloadProjectAwarenessSummaryCandidate
                : null
            const recoveredPreparedRuntimeExplicitCompanionHeadlineLine
              = resolveRawPreparedRuntimeExplicitCompanionHeadlineLine(preparedExecution)
            const recoveredPreparedEmbodimentClosureAuthority = resolvePreparedRuntimeEmbodimentClosureAuthority(preparedExecution)
            const recoveredAuthorityOnlyProjectAwarenessSummary
              = Boolean(timeoutActiveDialogueDecision)
                && !groundedPayloadProjectAwarenessSummary
                && !sanitizeText(payload.preDialogueSendIdentity?.companionHeadlineLine, '')
                && !recoveredPreparedRuntimeExplicitCompanionHeadlineLine
                ? synthesizeAuthorityOnlyEmbodimentCompanionHeadline({
                    authoritySummary: sanitizeText(recoveredPreparedEmbodimentClosureAuthority.authoritySummary ?? '', '') || null,
                    currentBodyState: sanitizeText(recoveredPreparedEmbodimentClosureAuthority.currentBodyState ?? '', '') || null,
                  })
                : null
            const enrichedRecoveredReply = buildAlicizationResolvedVisibleReply({
              fullText: enrichStructuredFullTextWithLifeAuthority({
                fullText: recoveredReply.fullText,
              }),
              visibleReplyExecution: recoveredReply.visibleReplyExecution,
              emotionalClosureCue: recoveredReply.realization.emotionalClosureAudit?.activeCue ?? null,
              projectStateEmotionalClosureSummary: recoveredReplyProjectStateAudit?.emotionalClosureSummary
                ?? recoveredProjectStateAuditSeed.emotionalClosureSummary,
              selfAuthoritySummary: recoveredReply.realization.selfAuthorityAudit?.authoritySummary ?? null,
              selfAuthorityClosenessPosture: recoveredReply.realization.selfAuthorityAudit?.closenessPosture ?? null,
              projectStateSameHerSummary: recoveredReplyProjectStateAudit?.sameHerSummary
                ?? recoveredProjectStateAuditSeed.projectStateSameHerSummary,
              projectStateSameHerDriftRiskSummary: recoveredReplyProjectStateAudit?.sameHerDriftRiskSummary
                ?? recoveredProjectStateAuditSeed.sameHerDriftRiskSummary,
              projectStateProactiveSameHerGapSummary: recoveredReplyProjectStateAudit?.proactiveSameHerGapSummary
                ?? recoveredProjectStateAuditSeed.projectStateProactiveSameHerGapSummary,
              projectStateLandedProgressSummary: recoveredLandedProgressSummary,
              projectStateOpenClosureSummary: recoveredOpenClosureSummary,
              projectStateNextClosureTargetSummary: preferRicherProjectStateAuditText({
                current: recoveredReplyProjectStateAudit?.nextClosureTargetSummary,
                candidate: recoveredProjectStateAuditSeed.projectStateNextClosureTargetSummary,
              }),
              projectStatePreDialogueAwarenessSummary: attempt.mode === 'active-dialogue-compact'
                ? preferExplicitProjectAwarenessOverCanonicalReanchor({
                    current: preferCompactRecoveryPayloadHeadlineOverFallback({
                      awarenessLine: preferRicherProjectAwarenessOverNarrowSameHerCarry({
                        awarenessLine:
                          recoveredReplyProjectStateAudit?.preDialogueAwarenessSummary
                          ?? resolveStructuredPreDialogueAwarenessSummary(
                            parseJsonObjectFromText(enrichStructuredFullTextWithLifeAuthority({
                              fullText: recoveredReply.fullText,
                            })),
                          )
                          ?? null,
                        candidateAwarenessLine:
                          recoveredAuthorityOnlyProjectAwarenessSummary
                          ?? recoveredProjectStateAuditSeed.projectStatePreDialogueAwarenessSummary
                          ?? null,
                      }),
                      payloadAwarenessLine: payload.preDialogueSendIdentity?.awarenessLine ?? null,
                      payloadCompanionBriefingLine: payload.preDialogueSendIdentity?.companionBriefingLine ?? null,
                      payloadCompanionHeadlineLine: payload.preDialogueSendIdentity?.companionHeadlineLine ?? null,
                    }),
                    candidate: groundedPayloadProjectAwarenessSummary,
                  })
                : preferStrongerSameHerHeadlineOverAwareness({
                    awarenessLine:
                      recoveredReplyProjectStateAudit?.preDialogueAwarenessSummary
                      ?? recoveredProjectStateAuditSeed.projectStatePreDialogueAwarenessSummary
                      ?? resolveStructuredPreDialogueAwarenessSummary(
                        parseJsonObjectFromText(enrichStructuredFullTextWithLifeAuthority({
                          fullText: recoveredReply.fullText,
                        })),
                      )
                      ?? null,
                    companionHeadlineLine:
                      sanitizeText(payload.preDialogueSendIdentity?.companionHeadlineLine, '')
                      || recoveredAuthorityOnlyProjectAwarenessSummary
                      || null,
                  }),
              prepared: preparedExecution,
              critic: recoveredReply.realization.critic ?? null,
              closure: recoveredReply.realization.closure ?? null,
            })
            const enrichedRecoveredReplyProjectStateAudit = enrichedRecoveredReply.realization.projectStateAudit as AlicizationBackgroundProjectStateAudit | null | undefined
            const enrichedRecoveredReplyWithAudit = buildAlicizationResolvedVisibleReply({
              fullText: ensureStructuredVisibleReplyProjectStateAudit({
                fullText: enrichedRecoveredReply.fullText,
                projectStateAudit: enrichedRecoveredReply.realization.projectStateAudit ?? null,
              }),
              visibleReplyExecution: enrichedRecoveredReply.visibleReplyExecution,
              emotionalClosureCue: enrichedRecoveredReply.realization.emotionalClosureAudit?.activeCue ?? null,
              projectStateEmotionalClosureSummary: enrichedRecoveredReplyProjectStateAudit?.emotionalClosureSummary
                ?? recoveredProjectStateAuditSeed.emotionalClosureSummary,
              selfAuthoritySummary: enrichedRecoveredReply.realization.selfAuthorityAudit?.authoritySummary ?? null,
              selfAuthorityClosenessPosture: enrichedRecoveredReply.realization.selfAuthorityAudit?.closenessPosture ?? null,
              projectStateSameHerSummary: enrichedRecoveredReplyProjectStateAudit?.sameHerSummary
                ?? recoveredProjectStateAuditSeed.projectStateSameHerSummary,
              projectStateSameHerDriftRiskSummary: enrichedRecoveredReplyProjectStateAudit?.sameHerDriftRiskSummary
                ?? recoveredProjectStateAuditSeed.sameHerDriftRiskSummary,
              projectStateProactiveSameHerGapSummary: enrichedRecoveredReplyProjectStateAudit?.proactiveSameHerGapSummary
                ?? recoveredProjectStateAuditSeed.projectStateProactiveSameHerGapSummary,
              projectStateCurrentPhaseSummary: enrichedRecoveredReplyProjectStateAudit?.currentPhaseSummary
                ?? recoveredProjectStateAuditSeed.projectStateCurrentPhaseSummary,
              projectStateLandedProgressSummary: recoveredLandedProgressSummary,
              projectStateOpenClosureSummary: recoveredOpenClosureSummary,
              projectStateNextClosureTargetSummary: preferRicherProjectStateAuditText({
                current: enrichedRecoveredReplyProjectStateAudit?.nextClosureTargetSummary,
                candidate: recoveredProjectStateAuditSeed.projectStateNextClosureTargetSummary,
              }),
              projectStatePreDialogueAwarenessSummary: attempt.mode === 'active-dialogue-compact'
                ? preferExplicitProjectAwarenessOverCanonicalReanchor({
                    current: preferCompactRecoveryPayloadHeadlineOverFallback({
                      awarenessLine: preferRicherProjectAwarenessOverNarrowSameHerCarry({
                        awarenessLine:
                          enrichedRecoveredReplyProjectStateAudit?.preDialogueAwarenessSummary
                          ?? resolveStructuredPreDialogueAwarenessSummary(
                            parseJsonObjectFromText(enrichedRecoveredReply.fullText),
                          )
                          ?? null,
                        candidateAwarenessLine:
                          recoveredAuthorityOnlyProjectAwarenessSummary
                          ?? recoveredProjectStateAuditSeed.projectStatePreDialogueAwarenessSummary
                          ?? null,
                      }),
                      payloadAwarenessLine: payload.preDialogueSendIdentity?.awarenessLine ?? null,
                      payloadCompanionBriefingLine: payload.preDialogueSendIdentity?.companionBriefingLine ?? null,
                      payloadCompanionHeadlineLine: payload.preDialogueSendIdentity?.companionHeadlineLine ?? null,
                    }),
                    candidate: groundedPayloadProjectAwarenessSummary,
                  })
                : preferStrongerSameHerHeadlineOverAwareness({
                    awarenessLine:
                      enrichedRecoveredReplyProjectStateAudit?.preDialogueAwarenessSummary
                      ?? recoveredProjectStateAuditSeed.projectStatePreDialogueAwarenessSummary
                      ?? resolveStructuredPreDialogueAwarenessSummary(
                        parseJsonObjectFromText(enrichedRecoveredReply.fullText),
                      )
                      ?? null,
                    companionHeadlineLine:
                      sanitizeText(payload.preDialogueSendIdentity?.companionHeadlineLine, '')
                      || recoveredAuthorityOnlyProjectAwarenessSummary
                      || null,
                  }),
              prepared: preparedExecution,
              critic: enrichedRecoveredReply.realization.critic ?? null,
              closure: enrichedRecoveredReply.realization.closure ?? null,
            })
            let rewrittenRecovered = null
            if (shouldAttemptRecoveredReplySecondPass({
              fullText: enrichedRecoveredReplyWithAudit.fullText,
              visibleReplyExecution: enrichedRecoveredReplyWithAudit.visibleReplyExecution,
            })) {
              try {
                rewrittenRecovered = await rewriteStructuredVisibleReplyIfNeeded({
                  fullText: enrichedRecoveredReplyWithAudit.fullText,
                  visibleReplyExecution: enrichedRecoveredReplyWithAudit.visibleReplyExecution,
                  projectStateSameHerSummary: enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.sameHerSummary ?? null,
                  projectStateSameHerHoldDetail: enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.sameHerHoldDetail ?? null,
                  projectStateContinuityArcStage: enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.continuityArcStage ?? null,
                  projectStateContinuityCue: enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.continuityCue ?? null,
                  projectStateLandedProgressSummary: enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.landedProgressSummary ?? null,
                  projectStateOpenClosureSummary: enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.openClosureSummary ?? null,
                  projectStateNextClosureTargetSummary: enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.nextClosureTargetSummary ?? null,
                  projectStateSameHerDriftRiskSummary: enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.sameHerDriftRiskSummary ?? recoveredProjectStateAuditSeed.sameHerDriftRiskSummary ?? null,
                  projectStateProactiveSameHerGapSummary: enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.proactiveSameHerGapSummary ?? recoveredProjectStateAuditSeed.projectStateProactiveSameHerGapSummary ?? null,
                  emotionalClosureSummary: enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.emotionalClosureSummary ?? null,
                  projectStatePreDialogueAwarenessSummary: enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.preDialogueAwarenessSummary ?? null,
                })
              }
              catch (error) {
                await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-second-pass-skipped', {
                  cardId: normalizedCardId,
                  turnId: normalizedTurnId,
                  recoveryMode: attempt.mode,
                  reason: error instanceof Error ? error.message : String(error),
                })
                rewrittenRecovered = null
              }
            }
            const shouldPreserveActiveDialogueCompactTimeoutRecoveryContext = Boolean(timeoutActiveDialogueDecision)
            const normalizedRecoveredReply = withActiveDialogueCompactTimeoutRecoveryContext(
              shouldPreserveActiveDialogueCompactTimeoutRecoveryContext,
              () => rewrittenRecovered
                ? normalizeRecoveredResolvedReplyAwareness(buildHostVisibleResolvedReply(buildAlicizationResolvedVisibleReply({
                    ...rewrittenRecovered,
                    projectStateSameHerSummary: recoveredProjectStateAuditSeed.projectStateSameHerSummary
                      ?? rewrittenRecovered.projectStateSameHerSummary,
                    projectStateSameHerHoldDetail: rewrittenRecovered.projectStateSameHerHoldDetail
                      ?? enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.sameHerHoldDetail
                      ?? recoveredProjectStateAuditSeed.sameHerHoldDetail,
                    projectStateContinuityArcStage: rewrittenRecovered.projectStateContinuityArcStage
                      ?? enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.continuityArcStage
                      ?? recoveredProjectStateAuditSeed.continuityArcStage,
                    projectStateContinuityCue: rewrittenRecovered.projectStateContinuityCue
                      ?? enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.continuityCue
                      ?? recoveredProjectStateAuditSeed.continuityCue,
                    projectStateSameHerDriftRiskSummary: rewrittenRecovered.projectStateSameHerDriftRiskSummary
                      ?? enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.sameHerDriftRiskSummary
                      ?? recoveredProjectStateAuditSeed.sameHerDriftRiskSummary,
                    projectStateProactiveSameHerGapSummary: rewrittenRecovered.projectStateProactiveSameHerGapSummary
                      ?? enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.proactiveSameHerGapSummary
                      ?? recoveredProjectStateAuditSeed.projectStateProactiveSameHerGapSummary,
                    projectStateCurrentPhaseSummary: rewrittenRecovered.projectStateCurrentPhaseSummary
                      ?? recoveredProjectStateAuditSeed.projectStateCurrentPhaseSummary,
                    projectStateLandedProgressSummary: preferRicherProjectStateAuditText({
                      current: rewrittenRecovered.projectStateLandedProgressSummary,
                      candidate: recoveredLandedProgressSummary ?? recoveredProjectStateAuditSeed.projectStateLandedProgressSummary,
                    }),
                    projectStateOpenClosureSummary: preferRicherProjectStateAuditText({
                      current: rewrittenRecovered.projectStateOpenClosureSummary,
                      candidate: recoveredOpenClosureSummary ?? recoveredProjectStateAuditSeed.projectStateOpenClosureSummary,
                    }),
                    projectStateNextClosureTargetSummary: preferRicherProjectStateAuditText({
                      current: rewrittenRecovered.projectStateNextClosureTargetSummary,
                      candidate: enrichedRecoveredReply.realization.projectStateAudit?.nextClosureTargetSummary
                        ?? recoveredProjectStateAuditSeed.projectStateNextClosureTargetSummary,
                    }),
                    projectStatePreDialogueAwarenessSummary: attempt.mode === 'active-dialogue-compact'
                      ? preferExplicitProjectAwarenessOverCanonicalReanchor({
                          current: preferCompactRecoveryPayloadHeadlineOverFallback({
                            awarenessLine: preferRicherProjectAwarenessOverNarrowSameHerCarry({
                              awarenessLine:
                                rewrittenRecovered.projectStatePreDialogueAwarenessSummary
                                ?? enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.preDialogueAwarenessSummary
                                ?? resolveStructuredPreDialogueAwarenessSummary(parseJsonObjectFromText(rewrittenRecovered.fullText))
                                ?? null,
                              candidateAwarenessLine:
                                recoveredAuthorityOnlyProjectAwarenessSummary
                                ?? recoveredProjectStateAuditSeed.projectStatePreDialogueAwarenessSummary
                                ?? null,
                            }),
                            payloadAwarenessLine: payload.preDialogueSendIdentity?.awarenessLine ?? null,
                            payloadCompanionBriefingLine: payload.preDialogueSendIdentity?.companionBriefingLine ?? null,
                            payloadCompanionHeadlineLine: payload.preDialogueSendIdentity?.companionHeadlineLine ?? null,
                          }),
                          candidate: groundedPayloadProjectAwarenessSummary,
                        })
                        : recoveredProjectStateAuditSeed.projectStatePreDialogueAwarenessSummary
                          ? preferStrongerSameHerHeadlineOverAwareness({
                              awarenessLine:
                                  recoveredProjectStateAuditSeed.projectStatePreDialogueAwarenessSummary
                                  ?? rewrittenRecovered.projectStatePreDialogueAwarenessSummary
                                  ?? enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.preDialogueAwarenessSummary
                                  ?? resolveStructuredPreDialogueAwarenessSummary(parseJsonObjectFromText(rewrittenRecovered.fullText))
                                  ?? null,
                              companionHeadlineLine:
                                sanitizeText(payload.preDialogueSendIdentity?.companionHeadlineLine, '')
                                || recoveredAuthorityOnlyProjectAwarenessSummary
                                || null,
                            })
                        : rewrittenRecovered.projectStatePreDialogueAwarenessSummary
                          ?? enrichedRecoveredReplyWithAudit.realization.projectStateAudit?.preDialogueAwarenessSummary
                          ?? resolveStructuredPreDialogueAwarenessSummary(parseJsonObjectFromText(rewrittenRecovered.fullText)),
                    prepared: preparedExecution,
                  })))
                : normalizeRecoveredResolvedReplyAwareness(buildHostVisibleResolvedReply(enrichedRecoveredReplyWithAudit)),
            )
            const exactPayloadProjectAwarenessLine = resolveVerbatimPayloadProjectAwarenessLine()
            const returnedRecoveredReply = exactPayloadProjectAwarenessLine
              ? preserveVerbatimProjectAwarenessLineOnResolvedReply({
                  reply: normalizedRecoveredReply,
                  exactAwarenessLine: exactPayloadProjectAwarenessLine,
                })
              : normalizedRecoveredReply
            rememberResolvedVisibleReply(returnedRecoveredReply)

            return {
              recoveredReply: returnedRecoveredReply,
              recoveryMode: attempt.mode,
            }
          }
          catch (error) {
            if (isAlicizationRequiredToolMissingError(error)) {
              try {
                const deterministicRecovery = await attemptDeterministicRequiredToolRecovery({
                  error,
                  origin: 'timeout-recovery',
                  toolInputOverrides: preparedExecutionToolInputOverrides,
                })
                if (deterministicRecovery) {
                  const payoffReply = await attemptInlineExecutionPayoff(deterministicRecovery)
                  await suppressInlineExecutionDeliveries()
                  rememberResolvedVisibleReply(payoffReply)
                  return {
                    recoveredReply: payoffReply,
                    recoveryMode: attempt.mode,
                  }
                }
              }
              catch (recoveryError) {
                lastRecoveryError = recoveryError
                await input.appendRuntimeDebugLine('chat-stream.required-tool-recovery-failed', {
                  cardId: normalizedCardId,
                  turnId: normalizedTurnId,
                  attempt: index + 1,
                  totalAttempts: recoveryAttempts.length,
                  recoveryMode: attempt.mode,
                  origin: 'timeout-recovery',
                  reason: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
                })
                continue
              }
            }

            lastRecoveryError = error
            await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-attempt-failed', {
              cardId: normalizedCardId,
              turnId: normalizedTurnId,
              attempt: index + 1,
              totalAttempts: recoveryAttempts.length,
              recoveryMode: attempt.mode,
              reason: error instanceof Error ? error.message : String(error),
            })
          }
        }

        const localFallbackReply = buildAlicizationMainGatewayTimeoutFallbackReply({
          messages: conversationMessages.length > 0
            ? conversationMessages
            : recoveryInput.messages,
          turnId: normalizedTurnId,
          actionKind: preparedExecution.runtimeSurface.action?.kind ?? null,
          digitalLifeSpine: preparedExecution.runtimeSurface.digitalLifeSpine ?? null,
          governance: preparedExecution.governance ?? preparedExecution.runtimeSurface.governance ?? null,
          personaKernel: preparedExecution.personaKernel ?? null,
          preDialogueSendIdentity: payload.preDialogueSendIdentity ?? null,
          runtimeDigest: resolveRuntimeDigestFromPrepared(),
          sessionMirror: preparedExecution.sessionMirror ?? null,
        })
        const localFallbackStructured = localFallbackReply
          ? parseJsonObjectFromText(localFallbackReply)
          : null
        const localFallbackProjectStateAudit
          = localFallbackStructured?.projectStateAudit && typeof localFallbackStructured.projectStateAudit === 'object'
            ? localFallbackStructured.projectStateAudit as Record<string, unknown>
            : null
        let fallbackReachability: AlicizationMainGatewayReachabilitySnapshot | null = null
        try {
          fallbackReachability = await input.ensureMainGatewayReachable(input.mainGateway, { bypassCache: true })
        }
        catch {}
        if (localFallbackReply && input.isRunActive() && fallbackReachability?.reachable === false) {
          await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-local-fallback-blocked', {
            cardId: normalizedCardId,
            turnId: normalizedTurnId,
            recoveredChars: localFallbackReply.length,
            actionKind: preparedExecution.runtimeSurface.action?.kind ?? null,
            reason: lastRecoveryError instanceof Error ? lastRecoveryError.message : String(lastRecoveryError ?? 'none'),
            gatewayReachable: fallbackReachability.reachable,
            gatewayReason: fallbackReachability.reason ?? null,
            fallbackProjectStateAudit: localFallbackProjectStateAudit,
          })
          await Promise.resolve(input.queueScopedAuditLog(input.payload.cardId, {
            level: 'warning',
            category: 'alicization.main-gateway',
            action: 'stream-timeout-local-fallback-blocked',
            message: 'Blocked local timeout fallback because normal visible replies require provider-authored mind output.',
            payload: {
              cardId: normalizedCardId,
              turnId: normalizedTurnId,
              actionKind: preparedExecution.runtimeSurface.action?.kind ?? null,
              gatewayReachable: fallbackReachability.reachable,
              gatewayReason: fallbackReachability.reason ?? null,
              fallbackProjectStateAudit: localFallbackProjectStateAudit,
            },
          }))
        }

        if (localFallbackReply && input.isRunActive() && fallbackReachability?.reachable !== false) {
          await input.appendRuntimeDebugLine('chat-stream.timeout-recovery-local-fallback-blocked', {
            cardId: normalizedCardId,
            turnId: normalizedTurnId,
            actionKind: preparedExecution.runtimeSurface.action?.kind ?? null,
            reason: lastRecoveryError instanceof Error ? lastRecoveryError.message : String(lastRecoveryError ?? 'none'),
            gatewayReachable: fallbackReachability?.reachable ?? null,
            gatewayReason: fallbackReachability?.reason ?? null,
            fallbackProjectStateAudit: localFallbackProjectStateAudit,
          })
        }

        throw (lastRecoveryError ?? new Error('main-gateway-timeout-recovery'))
      },
      emitRecoveredText: async (recoveredReply) => {
        await emitResolvedVisibleReply(recoveredReply)
      },
      emitError: (reason) => {
        input.emitError({
          cardId: input.payload.cardId,
          turnId: input.payload.turnId,
          error: reason,
        })
      },
      finish: (finishPayload) => {
        input.runStateController.finishRun(input.key, {
          ...finishPayload,
          visibleReplyExecution:
            finishPayload.visibleReplyExecution
            ?? latestResolvedVisibleReply?.visibleReplyExecution
            ?? currentVisibleReplyExecution,
          visibleReplyRealization:
            finishPayload.visibleReplyRealization
            ?? latestResolvedVisibleReply?.realization
            ?? undefined,
        })
      },
      appendRuntimeDebugLine: input.appendRuntimeDebugLine,
      queueScopedAuditLog: input.queueScopedAuditLog,
      turnRuntimeContext: prepared?.turnRuntimeContext ?? null,
    })
  }
}
