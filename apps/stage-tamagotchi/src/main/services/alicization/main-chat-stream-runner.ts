import type {
  AlicizationChatStartPayload,
  AlicizationChatStreamChunkEvent,
  AlicizationChatToolCallEvent,
  AlicizationChatToolResultEvent,
  AlicizationEmotionalKernelSnapshot,
  AlicizationVisibleReplyExecution,
} from '../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'
import type { AlicizationTurnRuntimeContext } from './turn-os/runtime'
import type {
  AlicizationResolvedVisibleReply,
  AlicizationVisibleReplyClosureArtifact,
  AlicizationVisibleReplyCriticArtifact,
  AlicizationVisibleReplyRealizationArtifact,
} from './visible-reply/facade'

import { errorMessageFrom } from '@moeru/std'
import {
  alicizationProviderResponseFormat,
  formatAlicizationProjectStateAwarenessFields,
  shouldBufferAlicizationStructuredSpeechPrelude,
} from '@proj-alicization/stage-shared'
import { streamText } from '@xsai/stream-text'

import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import { assertAlicizationCanonicalProjectState } from './main-chat-project-state-guard'
import { AlicizationRequiredToolMissingError } from './main-chat-required-tool'
import { extractAllowedToolNamesFromToolChoice } from './main-chat-runtime-surface'
import { resolveAlicizationChatStartPayloadPreDialogueSendIdentity } from './main-chat-start-awareness'
import { shouldEmitAlicizationChatMetaUpdate } from './main-chat-stream-meta-policy'
import { createAbortError, isMainGatewayProgressEventType, readRawTextDelta, sanitizeText } from './main-chat-stream-primitives'
import {
  resolvePreparedRuntimeProjectPreDialogueAwarenessSummary,
  resolvePreparedRuntimeProjectState,
  resolvePreparedRuntimeProjectStateSnapshot,
} from './prepared-runtime-continuity'
import {
  isAlicizationThinProjectAwarenessLine,
  looksLikeThinProjectClosureShell,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateSnapshot,
  scoreAlicizationProjectAwarenessLine,
} from './project-state-brief'
import {
  buildPrioritizedProjectStateRewritePreserveLines,
  normalizeDialogueRespondedPayload,
} from './runtime-governance'
import { parseReminderToolResultForDebug, sanitizeBriefText } from './runtime-realtime'
import { parseJsonObjectFromText } from './runtime-transport-content'
import { createAlicizationTurnRuntime } from './turn-os/runtime'
import {
  buildAlicizationResolvedVisibleReply,
  buildAlicizationVisibleReplyRealizationArtifact,
  deriveAlicizationVisibleReplyText,
  resolveAlicizationPreparedVisibleReplyExecution,
} from './visible-reply/facade'

type StreamTextInvoker = (input: Record<string, unknown>) => unknown
type AlicizationStreamEmotionalKernelShape = AlicizationEmotionalKernelSnapshot

function observeStreamTextResultErrors(
  result: unknown,
  onError: (error: unknown) => void,
) {
  if (!result || typeof result !== 'object')
    return

  const streamResult = result as Record<string, unknown>
  const fullStream = streamResult.fullStream as {
    pipeTo?: (destination: WritableStream<unknown>) => Promise<void>
  } | undefined
  if (typeof fullStream?.pipeTo === 'function') {
    try {
      void fullStream
        .pipeTo(new WritableStream())
        .catch(onError)
    }
    catch (error) {
      onError(error)
    }
  }

  for (const key of ['messages', 'steps', 'totalUsage', 'usage'] as const) {
    const pending = streamResult[key]
    if (pending && typeof (pending as PromiseLike<unknown>).then === 'function')
      void Promise.resolve(pending).catch(onError)
  }
}

export interface AlicizationMainChatStreamRunnerResult {
  finishReason: string
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  visibleReplyProjectStateAudit?: Record<string, unknown> | null
}

export interface AlicizationMainChatStreamMetaController {
  emit: (reply: string, options?: { force?: boolean }) => void
  getLastReply: () => string
}

interface AlicizationStructuredVisibleReplyRewriteInput {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  critic?: AlicizationVisibleReplyCriticArtifact | null
  closure?: AlicizationVisibleReplyClosureArtifact | null
  settledProjectStateAudit?: Record<string, unknown> | null
}

type AlicizationStreamProjectStateAudit = Partial<NonNullable<AlicizationResolvedVisibleReply['realization']['projectStateAudit']>> & {
  sameHerSummary?: string | null
  sameHerDriftRiskSummary?: string | null
  proactiveSameHerGapSummary?: string | null
  currentPhaseSummary?: string | null
  landedProgressSummary?: string | null
  openClosureSummary?: string | null
  openFocusSummary?: string | null
  nextFocusSummary?: string | null
  nextClosureTargetSummary?: string | null
  emotionalClosureSummary?: string | null
  emotionalClosureCue?: string | null
  embodimentClosureSummary?: string | null
  preDialogueAwarenessSummary?: string | null
  continuitySummary?: string | null
  preservedIntoRewrite?: boolean
  rewriteClosureApplied?: boolean
} & Record<string, unknown>

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
        || lower.includes('keep the continuity line audible')
        || lower.includes('continuity line audible')
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
      if (lower.includes('continuity line') || lower.includes('continuous identity') || lower.includes('continuous identity'))
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

function normalizeHostVisibleEmbodimentClosureSummary(value: unknown) {
  const normalized = typeof value === 'string'
    ? sanitizeText(value, '') || null
    : null

  if (!normalized)
    return null

  return normalized
}

function looksLikeCompactProjectFocusSummary(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized)
    return false

  return /^[a-z0-9-]+(?:\/[a-z0-9-]+)+$/iu.test(normalized)
}

function preferHostVisibleProjectFocusSummary(input: {
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

  const currentLooksCompact = looksLikeCompactProjectFocusSummary(current)
  const candidateLooksCompact = looksLikeCompactProjectFocusSummary(candidate)
  if (currentLooksCompact !== candidateLooksCompact)
    return currentLooksCompact ? current : candidate
  if (currentLooksCompact && candidateLooksCompact)
    return current

  return preferRicherProjectStateAuditText({
    current,
    candidate,
  })
}

function buildProjectStateAuditContinuitySummary(input: {
  sameHerSummary: string | null | undefined
  sameHerHoldDetail?: string | null | undefined
  continuityArcStage?: string | null | undefined
  continuityCue?: string | null | undefined
  sameHerDriftRiskSummary?: string | null | undefined
  proactiveSameHerGapSummary?: string | null | undefined
  currentPhaseSummary: string | null | undefined
  landedProgressSummary: string | null | undefined
  openClosureSummary: string | null | undefined
  openFocusSummary?: string | null | undefined
  nextFocusSummary?: string | null | undefined
  nextClosureTargetSummary: string | null | undefined
  emotionalClosureSummary?: string | null | undefined
  embodimentClosureSummary: string | null | undefined
}) {
  const projectStateContinuityCarry = buildPrioritizedProjectStateRewritePreserveLines({
    projectStateContinuityAnchors: [
      input.sameHerSummary ? `project_anchor=${input.sameHerSummary}` : '',
      input.sameHerHoldDetail ? `hold=${input.sameHerHoldDetail}` : '',
      input.continuityArcStage ? `arc=${input.continuityArcStage}` : '',
      input.continuityCue ? `cue=${input.continuityCue}` : '',
      input.sameHerDriftRiskSummary ? `drift=${input.sameHerDriftRiskSummary}` : '',
      input.currentPhaseSummary ? `phase=${input.currentPhaseSummary}` : '',
      input.landedProgressSummary ? `landed=${input.landedProgressSummary}` : '',
      input.openClosureSummary ? `open=${input.openClosureSummary}` : '',
      input.openFocusSummary ? `open-focus=${input.openFocusSummary}` : '',
      input.nextFocusSummary ? `next-focus=${input.nextFocusSummary}` : '',
      input.nextClosureTargetSummary ? `next=${input.nextClosureTargetSummary}` : '',
      input.proactiveSameHerGapSummary ? `proactive-gap=${input.proactiveSameHerGapSummary}` : '',
      input.emotionalClosureSummary ? `closure=${input.emotionalClosureSummary}` : '',
    ].filter(Boolean),
  })
  const focusCarry = [
    input.openFocusSummary ? `open-focus=${input.openFocusSummary}` : '',
    input.nextFocusSummary ? `next-focus=${input.nextFocusSummary}` : '',
  ].filter(anchor => Boolean(anchor) && !projectStateContinuityCarry.includes(anchor))
  return [
    ...projectStateContinuityCarry,
    ...focusCarry,
    input.embodimentClosureSummary ? `body=${input.embodimentClosureSummary}` : '',
  ].filter(Boolean).join(' | ') || null
}

export const mainChatStreamRunnerTestInternals = {
  buildProjectStateAuditContinuitySummary,
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

  const currentMentionsProjectIdentity = mentionsAlicizationProjectIdentity(current)
  const candidateMentionsProjectIdentity = mentionsAlicizationProjectIdentity(candidate)
  if (currentMentionsProjectIdentity !== candidateMentionsProjectIdentity)
    return candidateMentionsProjectIdentity ? candidate : current

  const currentIsThinAwarenessShell = looksLikeThinProjectAwarenessShell(current)
  const candidateIsThinAwarenessShell = looksLikeThinProjectAwarenessShell(candidate)
  if (currentIsThinAwarenessShell !== candidateIsThinAwarenessShell)
    return candidateIsThinAwarenessShell ? current : candidate

  const preferredClosureAuthority = preferStrongerContinuityClosureAuthority(current, candidate)
  if (preferredClosureAuthority)
    return preferredClosureAuthority

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

  return normalized.includes('measured-return hold')
    || normalized.includes('callback line lower-pressure before it widens again')
}

function looksLikeCanonicalProjectStateSameHerHoldDetail(value: string | null | undefined) {
  const normalized = normalizeSameHerHoldDetail(value)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized.startsWith('generic project continuity hold')
    && normalized.includes('project-state answer')
    && normalized.includes('before widening outward')
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
  return 'relationship_cadence=remembered_boundary; room=more; reentry=slower; widening=deferred'
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

function carriesFullerProjectPhaseClosureReanchor(raw: string | null | undefined) {
  const text = typeof raw === 'string' ? sanitizeText(raw, '') || '' : ''
  if (!text)
    return false
  const lower = text.toLowerCase()
  const carriesProjectIdentity
    = lower.includes('alicization is a local-first digital life project')
      || lower.includes('before_answering, remember: alicization is a local-first digital life project')
      || /Alicization.*本地优先continuity_project|本地优先continuity_project/u.test(text)
  const carriesPhase
    = lower.includes('phase 1')
      || /第一阶段|阶段一/u.test(text)
  const carriesOpenClosure
    = lower.includes('still-open closure')
      || lower.includes('unfinished closure')
      || lower.includes('same-life closure line')
      || lower.includes('continuity line')
      || /主动性|具身|对话闭环|未闭环|没闭环|还没闭环|还没有真正收住|还没真正收住/u.test(text)

  return carriesProjectIdentity && carriesPhase && carriesOpenClosure
}

function carriesCanonicalProjectStateShell(raw: string | null | undefined) {
  const text = typeof raw === 'string' ? sanitizeText(raw, '') || '' : ''
  if (!text)
    return false

  const lower = text.toLowerCase()
  return lower.includes('alicization is a local-first digital life project')
    && lower.includes('phase 1')
    && lower.includes('open=')
    && lower.includes('next=')
}

function looksLikeCompactProjectAwarenessShell(raw: string | null | undefined) {
  const text = typeof raw === 'string' ? sanitizeText(raw, '') || '' : ''
  if (!text)
    return false

  const lower = text.toLowerCase()
  return lower.includes('alicization is a local-first digital life project')
    && lower.includes('phase 1')
    && lower.includes('| open=')
    && lower.includes('| next=')
    && !lower.includes('before_answering')
}

function looksLikeStrongSameHerProjectHeadline(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? sanitizeText(value, '') || '' : ''
  if (!normalized)
    return false

  return /holding together mainly through|full cross-modal closure|continuity line|continuous identity|continuous identity|continuity continuity|continuity identity continuity|still needs .* closure|without splitting continuity|generic project shell|detached project narrator|phase 1 digital life still needs|this phase 1 digital life still needs|this continuous identity still needs|lipsync and voice to rejoin|initiative and embodiment closure/u.test(normalized)
}

function mentionsAlicizationProjectIdentity(raw: string | null | undefined) {
  const text = typeof raw === 'string' ? sanitizeText(raw, '') || '' : ''
  if (!text)
    return false

  return text.toLowerCase().includes('alicization is a local-first digital life project')
    || /Alicization.*本地优先continuity_project|本地优先continuity_project/u.test(text)
}

function resolveRicherPreparedProjectAwarenessSummary(input: {
  currentAwarenessSummary?: string | null | undefined
  identity?: string | null | undefined
  currentPhase?: string | null | undefined
  landedProgressSummary?: string | null | undefined
  openClosureSummary?: string | null | undefined
  sameHerSummary?: string | null | undefined
}) {
  const currentAwarenessSummary = sanitizeText(input.currentAwarenessSummary, '') || null
  const identity = sanitizeText(input.identity, '') || 'runtime_personhood'
  const currentPhase = sanitizeText(input.currentPhase, '') || 'runtime_personhood'
  const sameHerSummary = sanitizeText(input.sameHerSummary, '') || null
  const openClosureSummary = sanitizeText(input.openClosureSummary, '') || null
  const buildReanchorLine = (caps: {
    identity: number
    phase: number
    sameHer: number
    open: number
  }) => {
    return formatAlicizationProjectStateAwarenessFields({
      identity: identity.slice(0, caps.identity),
      currentPhase: currentPhase.slice(0, caps.phase),
      sameHerSelfLine: sameHerSummary ? sameHerSummary.slice(0, caps.sameHer) : '',
      primaryOpenLoop: openClosureSummary ? openClosureSummary.slice(0, caps.open) : '',
      maxChars: 1600,
    })
      .replace(/\s+/g, ' ')
      .trim()
  }
  const rebuiltProjectAwarenessSummary = [
    buildReanchorLine({ identity: 120, phase: 96, sameHer: 132, open: 120 }),
    buildReanchorLine({ identity: 96, phase: 80, sameHer: 120, open: 96 }),
    buildReanchorLine({ identity: 84, phase: 72, sameHer: 108, open: 84 }),
  ].find(line => line.length <= 320)
  ?? buildReanchorLine({ identity: 84, phase: 72, sameHer: 108, open: 84 }).slice(0, 320).trim()

  if (!rebuiltProjectAwarenessSummary)
    return currentAwarenessSummary
  if (!currentAwarenessSummary)
    return rebuiltProjectAwarenessSummary
  if (
    carriesFullerProjectPhaseClosureReanchor(currentAwarenessSummary)
    && !looksLikeCompactProjectAwarenessShell(currentAwarenessSummary)
    && !carriesCanonicalProjectStateShell(currentAwarenessSummary)
    && !looksLikeThinProjectAwarenessShell(currentAwarenessSummary)
  ) {
    return currentAwarenessSummary
  }
  if (
    looksLikeCompactProjectAwarenessShell(currentAwarenessSummary)
    || carriesCanonicalProjectStateShell(currentAwarenessSummary)
  ) {
    return rebuiltProjectAwarenessSummary
  }

  return preferRicherProjectStateAuditText({
    current: currentAwarenessSummary,
    candidate: rebuiltProjectAwarenessSummary,
  })
}

function looksLikeThinProjectAwarenessShell(raw: string | null | undefined) {
  const text = typeof raw === 'string' ? sanitizeText(raw, '') || '' : ''
  if (!text)
    return false

  const lower = text.toLowerCase()
  return isAlicizationThinProjectAwarenessLine(text)
    || looksLikeGenericMeasuredReturnHoldDetail(text)
    || looksLikeCanonicalProjectStateSameHerHoldDetail(text)
    || lower.includes('current continuity | keep the screen-grounded closure line explicit')
}

function looksLikeHostVisibleInternalProjectAwarenessDiagnostic(raw: string | null | undefined) {
  const normalized = normalizeSameHerHoldDetail(raw)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized.startsWith('generic project continuity hold')
}

function resolveHostVisibleProjectAwarenessLine(...values: Array<unknown>) {
  const candidates = values
    .map(value => typeof value === 'string' ? sanitizeText(value, '') || null : null)
    .filter((value): value is string => Boolean(value))

  const preferred = candidates.find(value =>
    !looksLikeHostVisibleInternalProjectAwarenessDiagnostic(value)
    && !looksLikeThinProjectAwarenessShell(value),
  )
  if (preferred)
    return preferred

  return candidates.find(value => !looksLikeHostVisibleInternalProjectAwarenessDiagnostic(value))
    ?? null
}

function looksLikeThinProjectNextClosureShell(raw: string | null | undefined) {
  const text = typeof raw === 'string' ? sanitizeText(raw, '') || '' : ''
  if (!text)
    return false

  const lower = text.toLowerCase()
  return lower.includes('generic next target')
    || lower.includes('generic next closure')
    || lower.includes('generic closure shell')
    || lower.includes('generic closure summary')
    || lower.includes('steadier carry of this project, this phase, and the life loop that remains open')
}

function preferMergedProjectNextClosureLine(current: unknown, candidate: unknown) {
  const normalizedCurrent = typeof current === 'string'
    ? sanitizeText(current, '') || null
    : null
  const normalizedCandidate = typeof candidate === 'string'
    ? sanitizeText(candidate, '') || null
    : null

  if (!normalizedCurrent)
    return normalizedCandidate
  if (!normalizedCandidate)
    return normalizedCurrent
  if (
    looksLikeThinProjectNextClosureShell(normalizedCurrent)
    && !looksLikeThinProjectNextClosureShell(normalizedCandidate)
  ) {
    return normalizedCandidate
  }

  return normalizedCurrent
}

function preferMergedProjectNextClosureField(
  current: unknown,
  auditCandidate: unknown,
  seededCandidate: unknown,
) {
  const preferredStructuredCandidate = preferMergedProjectNextClosureLine(
    auditCandidate,
    seededCandidate,
  )

  return preferMergedProjectNextClosureLine(
    current,
    preferredStructuredCandidate,
  )
}

function carriesProjectGovernanceTail(raw: string | null | undefined) {
  const text = typeof raw === 'string' ? sanitizeText(raw, '') || '' : ''
  if (!text)
    return false

  const lower = text.toLowerCase()
  return lower.includes('pre-dialogue transport')
    && lower.includes('entrypoint governance')
    && lower.includes('chat-entry governance')
}

function looksLikeThinProjectStateIdentitySummary(raw: string | null | undefined) {
  const text = typeof raw === 'string' ? sanitizeText(raw, '') || '' : ''
  if (!text)
    return true

  const lower = text.toLowerCase()
  return lower === 'current continuity'
    || lower === 'digital life'
    || lower === 'local-first digital life'
    || lower === 'project'
}

function looksLikeThinProjectStatePhaseSummary(raw: string | null | undefined) {
  const text = typeof raw === 'string' ? sanitizeText(raw, '') || '' : ''
  if (!text)
    return true

  return text.toLowerCase() === 'phase 1'
}

function looksLikeThinProjectStateSameHerSummary(raw: string | null | undefined) {
  const text = typeof raw === 'string' ? sanitizeText(raw, '') || '' : ''
  if (!text)
    return true

  const lower = text.toLowerCase()
  return lower === 'continuity identity'
    || lower === 'continuity'
    || lower === 'continuity line'
    || lower === 'continuous her'
}

function looksLikeThinProjectStateClosureSummary(raw: string | null | undefined, kind: 'landed' | 'open' | 'next') {
  const text = typeof raw === 'string' ? sanitizeText(raw, '') || '' : ''
  return looksLikeThinProjectClosureShell(text, kind)
}

interface RunAlicizationMainChatStreamOptions {
  payload: AlicizationChatStartPayload
  prepared: AlicizationPreparedMainChatExecutionResult
  headers?: Record<string, string>
  controller: AbortController
  firstEventTimeoutMs: number
  isRunActive: () => boolean
  incrementChunkStats: (rawDelta: string) => void
  emitChunk: (payload: AlicizationChatStreamChunkEvent) => void
  emitToolCall: (payload: AlicizationChatToolCallEvent) => void
  emitToolResult: (payload: AlicizationChatToolResultEvent) => void
  streamMeta: AlicizationMainChatStreamMetaController
  nonProgressEventTypes: Set<string>
  generateNonStreaming: (input: {
    chatConfig: AlicizationPreparedMainChatExecutionResult['chatConfig']
    messages: AlicizationPreparedMainChatExecutionResult['messages']
    headers?: Record<string, string>
    tools: AlicizationPreparedMainChatExecutionResult['tools']
    toolChoice: AlicizationPreparedMainChatExecutionResult['toolChoice']
    emotionalKernel?: AlicizationStreamEmotionalKernelShape | null
    timeoutMs: number
    cardId?: string
    turnId?: string
  }) => Promise<{
    finishReason: string
    fullText: string
  }>
  logReminderToolCall?: (input: {
    toolCallId: string
    toolName: string
    argumentsPreview: string
  }) => Promise<void> | void
  logReminderToolResult?: (input: {
    toolCallId: string
    summary: ReturnType<typeof parseReminderToolResultForDebug>
  }) => Promise<void> | void
  appendRuntimeDebugLine?: (event: string, payload: Record<string, unknown>) => Promise<void>
  rewriteStructuredVisibleReply?: (input: AlicizationStructuredVisibleReplyRewriteInput) => Promise<AlicizationStructuredVisibleReplyRewriteInput | null> | AlicizationStructuredVisibleReplyRewriteInput | null
  delayVisibleRelease?: boolean
  streamTextImpl?: StreamTextInvoker
  turnRuntimeContext?: AlicizationTurnRuntimeContext | null
}

export async function runAlicizationMainChatStream(
  input: RunAlicizationMainChatStreamOptions,
): Promise<AlicizationMainChatStreamRunnerResult> {
  assertAlicizationCanonicalProjectState(input.prepared.messages, 'stream')
  const providerMessages = input.prepared.messages

  const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(input.payload)
  const turnRuntime = createAlicizationTurnRuntime()
  const reminderToolCallIds = new Set<string>()
  const requiredToolNames = new Set(
    input.prepared.waitForTools
      ? extractAllowedToolNamesFromToolChoice(input.prepared.toolChoice, input.prepared.tools)
      : [],
  )
  const observedRequiredToolCalls = new Set<string>()
  const startedAt = Date.now()
  let lastEventType = ''

  const appendStreamDebugLine = (event: string, payload: Record<string, unknown>) => {
    if (!input.appendRuntimeDebugLine)
      return
    void input.appendRuntimeDebugLine(event, {
      cardId: normalizedPayload.cardId,
      turnId: normalizedPayload.turnId,
      ...payload,
    })
  }

  const settleVisibleReplyLifecycle = (surface: AlicizationVisibleReplyRealizationArtifact | null) => {
    if (!input.turnRuntimeContext)
      return
    turnRuntime.settleSurface({
      context: input.turnRuntimeContext,
      surface,
    })
    turnRuntime.settleDelivery({
      context: input.turnRuntimeContext,
      surface,
    })
  }

  const buildHostVisibleResolvedReply = (reply: AlicizationResolvedVisibleReply): AlicizationResolvedVisibleReply => {
    const parsed = parseJsonObjectFromText(reply.fullText)
    if (!parsed)
      return reply

    const existingPerformance = parsed.performance && typeof parsed.performance === 'object'
      ? parsed.performance as Record<string, unknown>
      : null
    const existingProjectState = parsed.projectState && typeof parsed.projectState === 'object'
      ? parsed.projectState as Record<string, unknown>
      : null
    const existingDigitalLifeSpine = parsed.digitalLifeSpine && typeof parsed.digitalLifeSpine === 'object'
      ? parsed.digitalLifeSpine as Record<string, unknown>
      : null
    const existingRuntimeDigest = parsed.runtimeDigest && typeof parsed.runtimeDigest === 'object'
      ? parsed.runtimeDigest as Record<string, unknown>
      : null
    const existingPreDialogueAwareness = parsed.preDialogueAwareness && typeof parsed.preDialogueAwareness === 'object'
      ? parsed.preDialogueAwareness as Record<string, unknown>
      : null
    const existingPreDialogueClosure = parsed.preDialogueClosure && typeof parsed.preDialogueClosure === 'object'
      ? parsed.preDialogueClosure as Record<string, unknown>
      : null
    const existingVisibleReplyRealization = parsed.visibleReplyRealization && typeof parsed.visibleReplyRealization === 'object'
      ? parsed.visibleReplyRealization as Record<string, unknown>
      : null
    const existingProjectStateAudit = existingVisibleReplyRealization?.projectStateAudit
      && typeof existingVisibleReplyRealization.projectStateAudit === 'object'
      ? existingVisibleReplyRealization.projectStateAudit as AlicizationStreamProjectStateAudit
      : null
    const replyProjectStateAudit = reply.realization.projectStateAudit as AlicizationStreamProjectStateAudit | null | undefined
    const preparedProjectStateAuditSeed = resolvePreparedProjectStateAuditSeed()
    const preparedProjectAwarenessSummary = sanitizeText(
      preparedProjectStateAuditSeed.preDialogueAwarenessSummary,
      '',
    ) || null
    const mergedProjectStateEmbodimentClosureSummary = resolvePreferredEmbodimentClosureSummary(
      normalizeHostVisibleEmbodimentClosureSummary(existingProjectStateAudit?.embodimentClosureSummary),
      normalizeHostVisibleEmbodimentClosureSummary(replyProjectStateAudit?.embodimentClosureSummary),
    )
    const mergedProjectStatePreDialogueAwarenessSummary = (() => {
      const current = sanitizeText(existingProjectStateAudit?.preDialogueAwarenessSummary, '') || null
      const candidate = sanitizeText(replyProjectStateAudit?.preDialogueAwarenessSummary, '') || null
      const payloadAwareness = sanitizeText(normalizedPayload.preDialogueSendIdentity?.awarenessLine, '') || null
      const preparedAwareness = preparedProjectAwarenessSummary
      const candidateMentionsProjectIdentity = mentionsAlicizationProjectIdentity(candidate)
      const candidateIsCanonicalReanchor = carriesFullerProjectPhaseClosureReanchor(candidate)
      const candidateCarriesExplicitClosureProgress = Boolean(
        sanitizeText(replyProjectStateAudit?.landedProgressSummary, '')
        || sanitizeText(replyProjectStateAudit?.openClosureSummary, '')
        || sanitizeText(replyProjectStateAudit?.nextClosureTargetSummary, ''),
      )
      const payloadMentionsProjectIdentity = mentionsAlicizationProjectIdentity(payloadAwareness)
      const preparedCarriesProjectIdentity = mentionsAlicizationProjectIdentity(preparedAwareness)
      const preparedLooksStrongSameHer
        = looksLikeStrongSameHerProjectHeadline(preparedAwareness)
          || carriesFullerProjectPhaseClosureReanchor(preparedAwareness)
          || /before_answering/iu.test(preparedAwareness ?? '')
      const preparedAwarenessScore = preparedAwareness
        ? scoreAlicizationProjectAwarenessLine(preparedAwareness)
        : 0
      const currentAwarenessScore = current
        ? scoreAlicizationProjectAwarenessLine(current)
        : 0
      const candidateAwarenessScore = candidate
        ? scoreAlicizationProjectAwarenessLine(candidate)
        : 0
      const shouldPreferPreparedAwareness
        = Boolean(
          preparedAwareness
          && preparedLooksStrongSameHer
          && (
            !current
            || looksLikeThinProjectAwarenessShell(current)
            || carriesCanonicalProjectStateShell(current)
            || !mentionsAlicizationProjectIdentity(current)
            || !candidate
            || looksLikeThinProjectAwarenessShell(candidate)
            || carriesCanonicalProjectStateShell(candidate)
            || (candidateIsCanonicalReanchor && !candidateCarriesExplicitClosureProgress)
            || (!candidateMentionsProjectIdentity && preparedCarriesProjectIdentity)
            || preparedAwarenessScore >= Math.max(currentAwarenessScore, candidateAwarenessScore) + 1
          ),
        )

      if (looksLikeThinProjectAwarenessShell(current)) {
        return shouldPreferPreparedAwareness
          ? preparedAwareness
          : candidateIsCanonicalReanchor
            ? candidate
            : candidateMentionsProjectIdentity && !payloadMentionsProjectIdentity
              ? candidate
              : payloadAwareness || candidate || current
      }

      if (shouldPreferPreparedAwareness) {
        return candidateIsCanonicalReanchor
          ? preparedAwareness
          : preparedAwareness
      }

      if (current && candidate) {
        const currentMentionsProjectIdentity = mentionsAlicizationProjectIdentity(current)
        const currentIsCanonicalReanchor = carriesFullerProjectPhaseClosureReanchor(current)
        if (candidateCarriesExplicitClosureProgress && currentIsCanonicalReanchor)
          return candidate
        if (currentMentionsProjectIdentity !== candidateMentionsProjectIdentity)
          return currentMentionsProjectIdentity ? current : candidate
      }

      return preferRicherProjectStateAuditText({
        current,
        candidate,
      })
    })()
    const seededProjectState = preparedProjectStateAuditSeed.projectState && typeof preparedProjectStateAuditSeed.projectState === 'object'
      ? preparedProjectStateAuditSeed.projectState as Record<string, unknown>
      : null
    const mergedSameHerHoldDetail = resolvePreferredSameHerHoldDetail({
      current: existingProjectStateAudit?.sameHerHoldDetail,
      candidate: replyProjectStateAudit?.sameHerHoldDetail,
      continuityCue:
        replyProjectStateAudit?.continuityCue
        ?? existingProjectStateAudit?.continuityCue
        ?? null,
    })
    const mergedProjectStateAudit = replyProjectStateAudit
      ? {
          ...existingProjectStateAudit,
          ...replyProjectStateAudit,
          sameHerSummary: preferRicherProjectStateAuditText({
            current: existingProjectStateAudit?.sameHerSummary,
            candidate: replyProjectStateAudit.sameHerSummary,
          }),
          sameHerHoldDetail: mergedSameHerHoldDetail,
          continuityArcStage: preferRicherProjectStateAuditText({
            current: existingProjectStateAudit?.continuityArcStage,
            candidate: replyProjectStateAudit.continuityArcStage,
          }),
          continuityCue: preferRicherProjectStateAuditText({
            current: existingProjectStateAudit?.continuityCue,
            candidate: replyProjectStateAudit.continuityCue,
          }),
          currentPhaseSummary: preferRicherProjectStateAuditText({
            current: existingProjectStateAudit?.currentPhaseSummary,
            candidate: replyProjectStateAudit.currentPhaseSummary,
          }),
          landedProgressSummary: preferRicherProjectStateAuditText({
            current: existingProjectStateAudit?.landedProgressSummary,
            candidate: replyProjectStateAudit.landedProgressSummary,
          }),
          openClosureSummary: preferRicherProjectStateAuditText({
            current: existingProjectStateAudit?.openClosureSummary,
            candidate: replyProjectStateAudit.openClosureSummary,
          }),
          openFocusSummary: preferHostVisibleProjectFocusSummary({
            current: existingProjectStateAudit?.openFocusSummary,
            candidate: replyProjectStateAudit.openFocusSummary,
          }),
          nextFocusSummary: preferHostVisibleProjectFocusSummary({
            current: existingProjectStateAudit?.nextFocusSummary,
            candidate: replyProjectStateAudit.nextFocusSummary,
          }),
          nextClosureTargetSummary: preferMergedProjectNextClosureField(
            existingProjectStateAudit?.nextClosureTargetSummary,
            replyProjectStateAudit.nextClosureTargetSummary,
            seededProjectState?.nextClosureTarget,
          ),
          emotionalClosureSummary: preferRicherProjectStateAuditText({
            current: existingProjectStateAudit?.emotionalClosureSummary,
            candidate: replyProjectStateAudit.emotionalClosureSummary,
          }),
          emotionalClosureCue: preferRicherProjectStateAuditText({
            current: existingProjectStateAudit?.emotionalClosureCue,
            candidate: replyProjectStateAudit.emotionalClosureCue,
          }),
          sameHerDriftRiskSummary: preferRicherProjectStateAuditText({
            current: existingProjectStateAudit?.sameHerDriftRiskSummary,
            candidate: replyProjectStateAudit.sameHerDriftRiskSummary,
          }),
          proactiveSameHerGapSummary: preferRicherProjectStateAuditText({
            current: existingProjectStateAudit?.proactiveSameHerGapSummary,
            candidate: replyProjectStateAudit.proactiveSameHerGapSummary,
          }),
          preDialogueAwarenessSummary: mergedProjectStatePreDialogueAwarenessSummary,
          continuitySummary: buildProjectStateAuditContinuitySummary({
            sameHerSummary: preferRicherProjectStateAuditText({
              current: existingProjectStateAudit?.sameHerSummary,
              candidate: replyProjectStateAudit.sameHerSummary,
            }),
            sameHerHoldDetail: mergedSameHerHoldDetail,
            continuityArcStage: preferRicherProjectStateAuditText({
              current: existingProjectStateAudit?.continuityArcStage,
              candidate: replyProjectStateAudit.continuityArcStage,
            }),
            continuityCue: preferRicherProjectStateAuditText({
              current: existingProjectStateAudit?.continuityCue,
              candidate: replyProjectStateAudit.continuityCue,
            }),
            sameHerDriftRiskSummary: preferRicherProjectStateAuditText({
              current: existingProjectStateAudit?.sameHerDriftRiskSummary,
              candidate: replyProjectStateAudit.sameHerDriftRiskSummary,
            }),
            proactiveSameHerGapSummary: preferRicherProjectStateAuditText({
              current: existingProjectStateAudit?.proactiveSameHerGapSummary,
              candidate: replyProjectStateAudit.proactiveSameHerGapSummary,
            }),
            currentPhaseSummary: preferRicherProjectStateAuditText({
              current: existingProjectStateAudit?.currentPhaseSummary,
              candidate: replyProjectStateAudit.currentPhaseSummary,
            }),
            landedProgressSummary: preferRicherProjectStateAuditText({
              current: existingProjectStateAudit?.landedProgressSummary,
              candidate: replyProjectStateAudit.landedProgressSummary,
            }),
            openClosureSummary: preferRicherProjectStateAuditText({
              current: existingProjectStateAudit?.openClosureSummary,
              candidate: replyProjectStateAudit.openClosureSummary,
            }),
            openFocusSummary: preferHostVisibleProjectFocusSummary({
              current: existingProjectStateAudit?.openFocusSummary,
              candidate: replyProjectStateAudit.openFocusSummary,
            }),
            nextFocusSummary: preferHostVisibleProjectFocusSummary({
              current: existingProjectStateAudit?.nextFocusSummary,
              candidate: replyProjectStateAudit.nextFocusSummary,
            }),
            nextClosureTargetSummary: preferMergedProjectNextClosureField(
              existingProjectStateAudit?.nextClosureTargetSummary,
              replyProjectStateAudit.nextClosureTargetSummary,
              seededProjectState?.nextClosureTarget,
            ),
            emotionalClosureSummary: preferRicherProjectStateAuditText({
              current: existingProjectStateAudit?.emotionalClosureSummary,
              candidate: replyProjectStateAudit.emotionalClosureSummary,
            }),
            embodimentClosureSummary: mergedProjectStateEmbodimentClosureSummary,
          }),
          embodimentClosureSummary: mergedProjectStateEmbodimentClosureSummary,
          preservedIntoRewrite: Boolean(existingProjectStateAudit?.preservedIntoRewrite || replyProjectStateAudit.preservedIntoRewrite),
          rewriteClosureApplied: Boolean(existingProjectStateAudit?.rewriteClosureApplied || replyProjectStateAudit.rewriteClosureApplied),
        }
      : existingProjectStateAudit
    const mergedReplyAuditCarriesExplicitClosureProgress = Boolean(
      sanitizeText(mergedProjectStateAudit?.landedProgressSummary, '')
      || sanitizeText(mergedProjectStateAudit?.openClosureSummary, '')
      || sanitizeText(mergedProjectStateAudit?.nextClosureTargetSummary, ''),
    )
    const mergedProjectStatePreDialogueAwarenessLine
      = mergedReplyAuditCarriesExplicitClosureProgress
        ? resolveHostVisibleProjectAwarenessLine(
            mergedProjectStateAudit?.preDialogueAwarenessSummary,
            existingProjectState?.preDialogueAwarenessLine,
            preparedProjectStateAuditSeed.preDialogueAwarenessSummary,
            seededProjectState?.preDialogueAwarenessLine,
          )
        : resolveHostVisibleProjectAwarenessLine(
            existingProjectState?.preDialogueAwarenessLine,
            mergedProjectStateAudit?.preDialogueAwarenessSummary,
            preparedProjectStateAuditSeed.preDialogueAwarenessSummary,
            seededProjectState?.preDialogueAwarenessLine,
          )
    const preferMergedProjectStateField = (
      current: unknown,
      auditCandidate: unknown,
      seededCandidate: unknown,
    ) => {
      const richerStructuredCandidate = preferRicherProjectStateAuditText({
        current: auditCandidate,
        candidate: seededCandidate,
      })

      return preferRicherProjectStateAuditText({
        current,
        candidate: richerStructuredCandidate,
      })
    }
    const mergedProjectStateSnapshot = (
      existingProjectState
      || mergedProjectStateAudit
      || seededProjectState
    )
      ? resolveAlicizationProjectStateSnapshot({
          runtimeProjectState: {
            ...existingProjectState,
            identity:
              preferMergedProjectStateField(
                existingProjectState?.identity,
                null,
                seededProjectState?.identity,
              )
              || null,
            currentPhase:
              preferMergedProjectStateField(
                existingProjectState?.currentPhase,
                mergedProjectStateAudit?.currentPhaseSummary,
                seededProjectState?.currentPhase,
              )
              || null,
            latestLandedProgress:
              preferMergedProjectStateField(
                existingProjectState?.latestLandedProgress,
                mergedProjectStateAudit?.landedProgressSummary,
                seededProjectState?.latestLandedProgress,
              )
              || null,
            latestProgress:
              preferMergedProjectStateField(
                existingProjectState?.latestProgress ?? existingProjectState?.latestLandedProgress,
                mergedProjectStateAudit?.landedProgressSummary,
                seededProjectState?.latestProgress ?? seededProjectState?.latestLandedProgress,
              )
              || null,
            primaryOpenLoop:
              preferMergedProjectStateField(
                existingProjectState?.primaryOpenLoop,
                mergedProjectStateAudit?.openClosureSummary,
                seededProjectState?.primaryOpenLoop,
              )
              || null,
            nextClosureTarget:
              preferMergedProjectNextClosureField(
                existingProjectState?.nextClosureTarget,
                mergedProjectStateAudit?.nextClosureTargetSummary,
                seededProjectState?.nextClosureTarget,
              )
              || null,
            sameHerSelfLine:
              preferMergedProjectStateField(
                existingProjectState?.sameHerSelfLine,
                mergedProjectStateAudit?.sameHerSummary,
                seededProjectState?.sameHerSelfLine,
              )
              || null,
            sameHerDriftRisk:
              preferMergedProjectStateField(
                existingProjectState?.sameHerDriftRisk,
                mergedProjectStateAudit?.sameHerDriftRiskSummary,
                seededProjectState?.sameHerDriftRisk,
              )
              || null,
            proactiveSameHerGap:
              preferMergedProjectStateField(
                existingProjectState?.proactiveSameHerGap,
                mergedProjectStateAudit?.proactiveSameHerGapSummary,
                seededProjectState?.proactiveSameHerGap,
              )
              || null,
            preflightSummary:
              sanitizeText(existingProjectState?.preflightSummary, '')
              || null,
            preDialogueAwarenessLine: mergedProjectStatePreDialogueAwarenessLine,
            awarenessLine: mergedProjectStatePreDialogueAwarenessLine,
            companionHeadlineLine: mergedProjectStatePreDialogueAwarenessLine,
            companionBriefingLine: sanitizeText(existingProjectState?.companionBriefingLine, '') || null,
          },
          fallbackProjectState: {
            ...seededProjectState,
            identity: sanitizeText(seededProjectState?.identity, '') || null,
            currentPhase: sanitizeText(seededProjectState?.currentPhase, '') || null,
            latestLandedProgress: sanitizeText(seededProjectState?.latestLandedProgress, '') || null,
            latestProgress: sanitizeText(seededProjectState?.latestLandedProgress, '') || null,
            primaryOpenLoop: sanitizeText(seededProjectState?.primaryOpenLoop, '') || null,
            nextClosureTarget: sanitizeText(seededProjectState?.nextClosureTarget, '') || null,
            sameHerSelfLine: sanitizeText(seededProjectState?.sameHerSelfLine, '') || null,
            sameHerDriftRisk: sanitizeText(seededProjectState?.sameHerDriftRisk, '') || null,
            proactiveSameHerGap: sanitizeText(seededProjectState?.proactiveSameHerGap, '') || null,
            preflightSummary: sanitizeText(seededProjectState?.preflightSummary, '') || null,
            preDialogueAwarenessLine:
              mergedProjectStatePreDialogueAwarenessLine
              || sanitizeText(seededProjectState?.preDialogueAwarenessLine, '')
              || null,
            awarenessLine:
              mergedProjectStatePreDialogueAwarenessLine
              || sanitizeText(seededProjectState?.awarenessLine, '')
              || null,
            companionHeadlineLine:
              mergedProjectStatePreDialogueAwarenessLine
              || sanitizeText(seededProjectState?.companionHeadlineLine, '')
              || null,
            companionBriefingLine: sanitizeText(seededProjectState?.companionBriefingLine, '') || null,
          },
        })
      : null
    const hostVisibleProjectStatePreDialogueAwarenessLine = resolveHostVisibleProjectAwarenessLine(
      mergedProjectStateSnapshot?.preDialogueAwarenessLine,
      mergedProjectStateSnapshot?.preDialogueAwarenessSummary,
      mergedProjectStateSnapshot?.awarenessLine,
      mergedProjectStateSnapshot?.companionHeadlineLine,
      mergedProjectStatePreDialogueAwarenessLine,
      mergedProjectStateAudit?.preDialogueAwarenessSummary,
      preparedProjectStateAuditSeed.preDialogueAwarenessSummary,
      seededProjectState?.preDialogueAwarenessLine,
    )
    const mergedProjectState = mergedProjectStateSnapshot
      ? {
          ...existingProjectState,
          ...mergedProjectStateSnapshot,
          latestLandedProgress:
            preferMergedProjectStateField(
              mergedProjectStateSnapshot.latestLandedProgress,
              mergedProjectStateAudit?.landedProgressSummary,
              preferRicherProjectStateAuditText({
                current: existingProjectState?.latestLandedProgress,
                candidate: seededProjectState?.latestLandedProgress,
              }),
            )
            ?? null,
          latestProgress:
            preferMergedProjectStateField(
              mergedProjectStateSnapshot.latestProgress ?? mergedProjectStateSnapshot.latestLandedProgress,
              mergedProjectStateAudit?.landedProgressSummary,
              preferRicherProjectStateAuditText({
                current: existingProjectState?.latestProgress ?? existingProjectState?.latestLandedProgress,
                candidate: seededProjectState?.latestProgress ?? seededProjectState?.latestLandedProgress,
              }),
            )
            ?? null,
          preDialogueAwarenessLine: hostVisibleProjectStatePreDialogueAwarenessLine,
          awarenessLine: hostVisibleProjectStatePreDialogueAwarenessLine,
          companionHeadlineLine: hostVisibleProjectStatePreDialogueAwarenessLine,
        }
      : null
    const mergedPreDialogueAwareness = (
      existingPreDialogueAwareness
      || mergedProjectStatePreDialogueAwarenessLine
      || sanitizeText(normalizedPayload.preDialogueSendIdentity?.companionBriefingLine, '')
    )
      ? {
          ...existingPreDialogueAwareness,
          awarenessLine:
            sanitizeText(existingPreDialogueAwareness?.awarenessLine, '')
            || mergedProjectStatePreDialogueAwarenessLine
            || null,
          companionBriefingLine:
            sanitizeText(existingPreDialogueAwareness?.companionBriefingLine, '')
            || sanitizeText(normalizedPayload.preDialogueSendIdentity?.companionBriefingLine, '')
            || null,
        }
      : null
    const mergedPreDialogueClosure = (
      existingPreDialogueClosure
      || sanitizeText(normalizedPayload.preDialogueSendIdentity?.companionBriefingLine, '')
      || sanitizeText(normalizedPayload.preDialogueSendIdentity?.companionNextClosureLine, '')
      || sanitizeText(mergedProjectState?.nextClosureTarget, '')
    )
      ? (() => {
          const mergedNextClosureLine = preferMergedProjectNextClosureLine(
            existingPreDialogueClosure?.companionNextClosureLine,
            preferMergedProjectNextClosureLine(
              mergedProjectState?.nextClosureTarget,
              normalizedPayload.preDialogueSendIdentity?.companionNextClosureLine,
            ),
          )

          return {
            ...existingPreDialogueClosure,
            status:
              sanitizeText(existingPreDialogueClosure?.status, '')
              || sanitizeText(input.payload.preDialogueSendIdentity?.status, '')
              || sanitizeText(normalizedPayload.preDialogueSendIdentity?.status, '')
              || 'partial',
            summaryLine:
              sanitizeText(existingPreDialogueClosure?.summaryLine, '')
              || sanitizeText(normalizedPayload.preDialogueSendIdentity?.companionBriefingLine, '')
              || mergedProjectStatePreDialogueAwarenessLine
              || null,
            companionBriefingLine:
              sanitizeText(existingPreDialogueClosure?.companionBriefingLine, '')
              || sanitizeText(normalizedPayload.preDialogueSendIdentity?.companionBriefingLine, '')
              || null,
            companionNextClosureLine: mergedNextClosureLine,
          }
        })()
      : null
    const replyCritic = reply.realization.critic
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
        : null,
      projectStateAudit: mergedProjectStateAudit,
      critic: replyCritic
        ? {
            ...replyCritic,
            reasonCodes: Array.isArray(replyCritic.reasonCodes)
              ? [...replyCritic.reasonCodes]
              : [],
            repairReasonCodes: Array.isArray(replyCritic.repairReasonCodes)
              ? [...replyCritic.repairReasonCodes]
              : [],
            mustDropCount: typeof replyCritic.mustDropCount === 'number'
              ? replyCritic.mustDropCount
              : 0,
            mustPreserveCount: typeof replyCritic.mustPreserveCount === 'number'
              ? replyCritic.mustPreserveCount
              : 0,
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

    return {
      ...reply,
      realization: mergedVisibleReplyRealization as AlicizationResolvedVisibleReply['realization'],
      fullText: JSON.stringify({
        ...parsed,
        ...(existingPerformance ? { performance: existingPerformance } : {}),
        ...(mergedProjectState ? { projectState: mergedProjectState } : {}),
        ...(existingDigitalLifeSpine ? { digitalLifeSpine: existingDigitalLifeSpine } : {}),
        ...(existingRuntimeDigest ? { runtimeDigest: existingRuntimeDigest } : {}),
        ...(mergedPreDialogueAwareness ? { preDialogueAwareness: mergedPreDialogueAwareness } : {}),
        ...(mergedPreDialogueClosure ? { preDialogueClosure: mergedPreDialogueClosure } : {}),
        visibleReplyRealization: mergedVisibleReplyRealization,
      }),
    }
  }

  const applyVisualOneShotProjectAwarenessOverride = (reply: AlicizationResolvedVisibleReply): AlicizationResolvedVisibleReply => {
    const parsed = parseJsonObjectFromText(reply.fullText)
    if (!parsed)
      return reply

    const visibleReplyRealization = parsed.visibleReplyRealization && typeof parsed.visibleReplyRealization === 'object'
      ? parsed.visibleReplyRealization as Record<string, unknown>
      : null
    const projectStateAudit = visibleReplyRealization?.projectStateAudit && typeof visibleReplyRealization.projectStateAudit === 'object'
      ? visibleReplyRealization.projectStateAudit as AlicizationStreamProjectStateAudit
      : null
    if (!projectStateAudit)
      return reply

    const currentAwarenessSummary = sanitizeText(projectStateAudit.preDialogueAwarenessSummary, '') || null
    const payloadAwarenessSummary = sanitizeText(normalizedPayload.preDialogueSendIdentity?.awarenessLine, '') || null
    const currentAwarenessIsThinShell = looksLikeThinProjectAwarenessShell(currentAwarenessSummary)
    const currentAwarenessMentionsProjectIdentity = mentionsAlicizationProjectIdentity(currentAwarenessSummary)
    const currentAwarenessIsCanonicalReanchor = carriesFullerProjectPhaseClosureReanchor(currentAwarenessSummary)
    const currentAwarenessCarriesExplicitClosureProgress = Boolean(
      sanitizeText(projectStateAudit.landedProgressSummary, '')
      || sanitizeText(projectStateAudit.openClosureSummary, '')
      || sanitizeText(projectStateAudit.nextClosureTargetSummary, ''),
    )
    const payloadAwarenessIsCanonicalShell = carriesCanonicalProjectStateShell(payloadAwarenessSummary)
    const payloadAwarenessCarriesFullerReanchor = carriesFullerProjectPhaseClosureReanchor(payloadAwarenessSummary)
    const shouldRenormalizeCollapsedThinShell
      = currentAwarenessIsCanonicalReanchor
        && !currentAwarenessCarriesExplicitClosureProgress
        && payloadAwarenessIsCanonicalShell
        && !payloadAwarenessCarriesFullerReanchor
    const shouldFuseIdentityShellIntoRicherContinuity
      = !currentAwarenessIsThinShell
        && !currentAwarenessIsCanonicalReanchor
        && !currentAwarenessMentionsProjectIdentity
        && payloadAwarenessIsCanonicalShell
    const preferredAwarenessSummary = currentAwarenessIsThinShell || shouldRenormalizeCollapsedThinShell
      ? (currentAwarenessMentionsProjectIdentity && !payloadAwarenessIsCanonicalShell
          ? currentAwarenessSummary
          : payloadAwarenessSummary
            ?? currentAwarenessSummary)
      : shouldFuseIdentityShellIntoRicherContinuity && payloadAwarenessSummary
        ? `${payloadAwarenessSummary} ${currentAwarenessSummary}`
        : currentAwarenessSummary

    if (!preferredAwarenessSummary || preferredAwarenessSummary === currentAwarenessSummary)
      return reply

    const nextProjectStateAudit: AlicizationStreamProjectStateAudit = {
      ...projectStateAudit,
      preDialogueAwarenessSummary: preferredAwarenessSummary,
    }
    const nextVisibleReplyRealization = {
      ...visibleReplyRealization,
      projectStateAudit: nextProjectStateAudit,
    }
    const nextFullText = JSON.stringify({
      ...parsed,
      visibleReplyRealization: nextVisibleReplyRealization,
    })

    return {
      ...reply,
      fullText: nextFullText,
      realization: {
        ...reply.realization,
        projectStateAudit: nextProjectStateAudit as AlicizationResolvedVisibleReply['realization']['projectStateAudit'],
      },
    }
  }

  const resolvePreparedProjectStateAuditSeed = () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const runtimeProjectState = resolvePreparedRuntimeProjectState(input.prepared)
    const runtimeProjectStateSnapshot = resolvePreparedRuntimeProjectStateSnapshot(input.prepared)
    const canonicalIdentity = sanitizeText(canonicalProjectState.identity, '') || null
    const canonicalCurrentPhase = sanitizeText(canonicalProjectState.currentPhase, '') || null
    const canonicalLatestLandedProgress = sanitizeText(
      canonicalProjectState.latestProgress
      ?? canonicalProjectState.continuityProgressSummary
      ?? canonicalProjectState.memoryAnthropomorphismProgress.at(-1),
      '',
    ) || null
    const canonicalPrimaryOpenLoop = sanitizeText(canonicalProjectState.openLoops[0], '') || null
    const canonicalNextClosureTarget = sanitizeText(canonicalProjectState.nextClosureTarget, '') || null
    const canonicalSameHerSummary = sanitizeText(canonicalProjectState.sameHerSelfLine, '') || null
    const snapshotIdentity = sanitizeText(runtimeProjectStateSnapshot?.identity, '') || null
    const snapshotCurrentPhase = sanitizeText(runtimeProjectStateSnapshot?.currentPhase, '') || null
    const snapshotLatestLandedProgress = sanitizeText(runtimeProjectStateSnapshot?.latestLandedProgress, '') || null
    const snapshotPrimaryOpenLoop = sanitizeText(runtimeProjectStateSnapshot?.primaryOpenLoop, '') || null
    const snapshotNextClosureTarget = sanitizeText(runtimeProjectStateSnapshot?.nextClosureTarget, '') || null
    const snapshotSameHerSummary = sanitizeText(runtimeProjectStateSnapshot?.sameHerSelfLine, '') || null
    const snapshotProactiveSameHerGapSummary = sanitizeText(runtimeProjectStateSnapshot?.proactiveSameHerGap, '') || null
    const runtimeIdentity = sanitizeText(runtimeProjectState?.identity, '') || null
    const runtimeCurrentPhase = sanitizeText(runtimeProjectState?.currentPhase, '') || null
    const runtimeLatestLandedProgress = sanitizeText(
      runtimeProjectState?.latestLandedProgress
      ?? runtimeProjectState?.latestProgress,
      '',
    ) || null
    const runtimePrimaryOpenLoop = sanitizeText(runtimeProjectState?.primaryOpenLoop, '') || null
    const runtimeNextClosureTarget = sanitizeText(runtimeProjectState?.nextClosureTarget, '') || null
    const runtimeSameHerSummary = sanitizeText(runtimeProjectState?.sameHerSelfLine, '') || null
    const runtimeProactiveSameHerGapSummary = sanitizeText(runtimeProjectState?.proactiveSameHerGap, '') || null
    const canonicalProactiveSameHerGapSummary = sanitizeText(canonicalProjectState.proactiveSameHerGap, '') || null
    const pickPreferredThinAwareValue = (options: {
      runtimeValue: string | null
      snapshotValue: string | null
      canonicalValue: string | null
      isThin: (value: string | null) => boolean
      preferCanonicalOverSnapshot?: (snapshotValue: string | null, canonicalValue: string | null) => boolean
    }) => {
      if (options.runtimeValue && !options.isThin(options.runtimeValue))
        return options.runtimeValue
      if (
        options.snapshotValue
        && !options.isThin(options.snapshotValue)
        && !(options.preferCanonicalOverSnapshot?.(options.snapshotValue, options.canonicalValue) ?? false)
      ) {
        return options.snapshotValue
      }
      return options.canonicalValue ?? options.snapshotValue ?? options.runtimeValue ?? null
    }
    const preferredIdentity = pickPreferredThinAwareValue({
      runtimeValue: runtimeIdentity,
      snapshotValue: snapshotIdentity,
      canonicalValue: canonicalIdentity,
      isThin: looksLikeThinProjectStateIdentitySummary,
    })
    const preferredCurrentPhase = pickPreferredThinAwareValue({
      runtimeValue: runtimeCurrentPhase,
      snapshotValue: snapshotCurrentPhase,
      canonicalValue: canonicalCurrentPhase,
      isThin: looksLikeThinProjectStatePhaseSummary,
    })
    const preferredLandedProgressSummary = pickPreferredThinAwareValue({
      runtimeValue: runtimeLatestLandedProgress,
      snapshotValue: snapshotLatestLandedProgress,
      canonicalValue: canonicalLatestLandedProgress,
      isThin: value => looksLikeThinProjectStateClosureSummary(value, 'landed'),
      preferCanonicalOverSnapshot: (snapshotValue, canonicalValue) => Boolean(
        snapshotValue
        && canonicalValue
        && !carriesProjectGovernanceTail(snapshotValue)
        && carriesProjectGovernanceTail(canonicalValue),
      ),
    })
    const preferredOpenClosureSummary = pickPreferredThinAwareValue({
      runtimeValue: runtimePrimaryOpenLoop,
      snapshotValue: snapshotPrimaryOpenLoop,
      canonicalValue: canonicalPrimaryOpenLoop,
      isThin: value => looksLikeThinProjectStateClosureSummary(value, 'open'),
    })
    const preferredNextClosureTargetSummary = pickPreferredThinAwareValue({
      runtimeValue: runtimeNextClosureTarget,
      snapshotValue: snapshotNextClosureTarget,
      canonicalValue: canonicalNextClosureTarget,
      isThin: value => looksLikeThinProjectStateClosureSummary(value, 'next'),
    })
    const preferredSameHerSummary = pickPreferredThinAwareValue({
      runtimeValue: runtimeSameHerSummary,
      snapshotValue: snapshotSameHerSummary,
      canonicalValue: canonicalSameHerSummary,
      isThin: looksLikeThinProjectStateSameHerSummary,
    })
    const rawRuntimeVisibleReplyRealization = input.prepared.runtimeSurface?.digitalLifeRuntimeSurface?.raw as {
      visibleReplyRealization?: {
        projectStateAudit?: AlicizationStreamProjectStateAudit | null
      } | null
    } | null | undefined
    const dialogueRuntimeSurface = input.prepared.runtimeSurface?.digitalLifeRuntimeSurface?.dialogue as {
      raw?: {
        visibleReplyRealization?: {
          projectStateAudit?: AlicizationStreamProjectStateAudit | null
        } | null
      } | null
    } | null | undefined
    const dialogueRawVisibleReplyRealization = dialogueRuntimeSurface?.raw as {
      visibleReplyRealization?: {
        projectStateAudit?: AlicizationStreamProjectStateAudit | null
      } | null
    } | null | undefined
    const rawVisibleReplyProjectStateAudit = (
      rawRuntimeVisibleReplyRealization?.visibleReplyRealization?.projectStateAudit
      ?? dialogueRawVisibleReplyRealization?.visibleReplyRealization?.projectStateAudit
      ?? null
    ) as AlicizationStreamProjectStateAudit | null
    const payloadPreDialogueAwarenessSummary = sanitizeText(
      normalizedPayload.preDialogueSendIdentity?.companionHeadlineLine
      ?? normalizedPayload.preDialogueSendIdentity?.awarenessLine
      ?? normalizedPayload.preDialogueSendIdentity?.summaryLine,
      '',
    ) || null
    const payloadAwarenessLine = sanitizeText(
      normalizedPayload.preDialogueSendIdentity?.awarenessLine,
      '',
    ) || null
    const payloadCompanionHeadlineLine = sanitizeText(
      normalizedPayload.preDialogueSendIdentity?.companionHeadlineLine,
      '',
    ) || null
    const preferredPreparedRuntimeAwarenessSummary = resolvePreparedRuntimeProjectPreDialogueAwarenessSummary(input.prepared)
    const resolvedPreparedRuntimeAwarenessSummary = resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: runtimeProjectState
        ? {
            preDialogueAwarenessLine: runtimeProjectState.preDialogueAwarenessLine,
            awarenessLine: runtimeProjectState.awarenessLine,
            companionHeadlineLine: runtimeProjectState.companionHeadlineLine,
            companionBriefingLine: runtimeProjectState.companionBriefingLine,
            preDialogueAwarenessSummary: runtimeProjectState.preDialogueAwarenessSummary,
            preflightSummary: runtimeProjectState.preflightSummary,
          }
        : null,
      fallbackProjectState: runtimeProjectStateSnapshot
        ? {
            preDialogueAwarenessLine: runtimeProjectStateSnapshot.preDialogueAwarenessLine,
            awarenessLine: runtimeProjectStateSnapshot.awarenessLine,
            companionHeadlineLine: runtimeProjectStateSnapshot.companionHeadlineLine,
            companionBriefingLine: runtimeProjectStateSnapshot.companionBriefingLine,
            preDialogueAwarenessSummary: runtimeProjectStateSnapshot.preDialogueAwarenessLine,
            preflightSummary: runtimeProjectStateSnapshot.preflightSummary,
          }
        : null,
    })
    const richerPreparedRuntimeAwarenessSummary
      = carriesFullerProjectPhaseClosureReanchor(preferredPreparedRuntimeAwarenessSummary)
        ? preferredPreparedRuntimeAwarenessSummary
        : resolvedPreparedRuntimeAwarenessSummary
          && scoreAlicizationProjectAwarenessLine(resolvedPreparedRuntimeAwarenessSummary) >= scoreAlicizationProjectAwarenessLine(preferredPreparedRuntimeAwarenessSummary) + 1
          ? resolvedPreparedRuntimeAwarenessSummary
          : preferredPreparedRuntimeAwarenessSummary ?? resolvedPreparedRuntimeAwarenessSummary
    const preparedAwarenessCarriesFullerProjectReanchor = carriesFullerProjectPhaseClosureReanchor(richerPreparedRuntimeAwarenessSummary)
    const payloadAwarenessCarriesFullerProjectReanchor = carriesFullerProjectPhaseClosureReanchor(payloadPreDialogueAwarenessSummary)
    const preparedAwarenessIsCanonicalShell = carriesCanonicalProjectStateShell(richerPreparedRuntimeAwarenessSummary)
    const payloadAwarenessIsCanonicalShell = carriesCanonicalProjectStateShell(payloadPreDialogueAwarenessSummary)
    const payloadCompanionHeadlineLooksSameHerSpecific = looksLikeStrongSameHerProjectHeadline(payloadCompanionHeadlineLine)
    const payloadAwarenessLineLooksThin = looksLikeThinProjectAwarenessShell(payloadAwarenessLine)
    const payloadCompanionHeadlineMentionsProjectIdentity = mentionsAlicizationProjectIdentity(payloadCompanionHeadlineLine)
    const shouldPreferPreparedAwarenessSummary
      = Boolean(richerPreparedRuntimeAwarenessSummary)
        && (
          preparedAwarenessCarriesFullerProjectReanchor
          || (preparedAwarenessIsCanonicalShell && !payloadAwarenessIsCanonicalShell)
          || (!payloadCompanionHeadlineLooksSameHerSpecific && payloadAwarenessLineLooksThin)
        )
    const preferredPreDialogueAwarenessSummary
      = shouldPreferPreparedAwarenessSummary
        ? richerPreparedRuntimeAwarenessSummary ?? payloadPreDialogueAwarenessSummary
        : payloadAwarenessCarriesFullerProjectReanchor && !preparedAwarenessCarriesFullerProjectReanchor
          ? payloadPreDialogueAwarenessSummary ?? richerPreparedRuntimeAwarenessSummary
          : payloadAwarenessIsCanonicalShell && !preparedAwarenessIsCanonicalShell
            ? richerPreparedRuntimeAwarenessSummary ?? payloadPreDialogueAwarenessSummary
            : scoreAlicizationProjectAwarenessLine(richerPreparedRuntimeAwarenessSummary) >= scoreAlicizationProjectAwarenessLine(payloadPreDialogueAwarenessSummary) + 1
              ? richerPreparedRuntimeAwarenessSummary ?? payloadPreDialogueAwarenessSummary
              : payloadPreDialogueAwarenessSummary ?? richerPreparedRuntimeAwarenessSummary
    const shouldPreferPreparedReanchorOverPayload
      = Boolean(richerPreparedRuntimeAwarenessSummary)
        && (
          preparedAwarenessCarriesFullerProjectReanchor
          || (!payloadCompanionHeadlineLooksSameHerSpecific && payloadAwarenessLineLooksThin)
          || (!payloadCompanionHeadlineMentionsProjectIdentity && payloadAwarenessCarriesFullerProjectReanchor === false)
        )
    const preferredAwarenessSummaryBeforeCanonicalExpansion = looksLikeThinProjectAwarenessShell(preferredPreDialogueAwarenessSummary)
      ? (shouldPreferPreparedReanchorOverPayload
          ? richerPreparedRuntimeAwarenessSummary
          : payloadPreDialogueAwarenessSummary)
        ?? canonicalProjectState.preDialogueAwarenessLine
        ?? payloadAwarenessLine
        ?? preferredPreDialogueAwarenessSummary
        ?? richerPreparedRuntimeAwarenessSummary
        ?? payloadPreDialogueAwarenessSummary
      : preferredPreDialogueAwarenessSummary
        ?? normalizedPayload.preDialogueSendIdentity?.awarenessLine
        ?? richerPreparedRuntimeAwarenessSummary
        ?? payloadPreDialogueAwarenessSummary
        ?? canonicalProjectState.preDialogueAwarenessLine
    const runtimeProjectStateCarriesExplicitClosureProgress = Boolean(
      sanitizeText(runtimeProjectState?.latestLandedProgress ?? runtimeProjectState?.latestProgress, '')
      || sanitizeText(runtimeProjectState?.primaryOpenLoop, '')
      || sanitizeText(runtimeProjectState?.nextClosureTarget, ''),
    )
    const finalizedPreDialogueAwarenessSummary = carriesCanonicalProjectStateShell(preferredAwarenessSummaryBeforeCanonicalExpansion)
      && !runtimeProjectStateCarriesExplicitClosureProgress
      ? canonicalProjectState.preDialogueAwarenessLine
      ?? preferredAwarenessSummaryBeforeCanonicalExpansion
      : preferredAwarenessSummaryBeforeCanonicalExpansion

    const rawReplyAuditCarriesExplicitClosureProgress = Boolean(
      sanitizeText(rawVisibleReplyProjectStateAudit?.landedProgressSummary, '')
      || sanitizeText(rawVisibleReplyProjectStateAudit?.openClosureSummary, '')
      || sanitizeText(rawVisibleReplyProjectStateAudit?.nextClosureTargetSummary, ''),
    )
    const preferredRawReplyAwarenessSummary = rawReplyAuditCarriesExplicitClosureProgress
      ? sanitizeText(rawVisibleReplyProjectStateAudit?.preDialogueAwarenessSummary, '') || null
      : null
    const preferredPreparedProjectAwarenessSummary = resolveRicherPreparedProjectAwarenessSummary({
      currentAwarenessSummary:
        preferredRawReplyAwarenessSummary
        ?? finalizedPreDialogueAwarenessSummary
        ?? resolvedPreparedRuntimeAwarenessSummary
        ?? payloadPreDialogueAwarenessSummary
        ?? canonicalProjectState.preDialogueAwarenessLine
        ?? null,
      identity: preferredIdentity,
      currentPhase: preferredCurrentPhase,
      landedProgressSummary: preferredLandedProgressSummary,
      openClosureSummary: preferredOpenClosureSummary,
      sameHerSummary: preferredSameHerSummary,
    })
    const preferredProactiveSameHerGapSummary = preferRicherProjectStateAuditText({
      current: runtimeProactiveSameHerGapSummary,
      candidate: preferRicherProjectStateAuditText({
        current: sanitizeText(rawVisibleReplyProjectStateAudit?.proactiveSameHerGapSummary, '') || null,
        candidate: snapshotProactiveSameHerGapSummary ?? canonicalProactiveSameHerGapSummary,
      }),
    })
    const preferredProjectState = {
      ...(runtimeProjectStateSnapshot ?? resolveAlicizationProjectStateSnapshot({
        runtimeProjectState,
        fallbackProjectState: resolveAlicizationProjectStateBrief(),
      })),
      identity: preferredIdentity || undefined,
      currentPhase: preferredCurrentPhase || undefined,
      latestLandedProgress: preferredLandedProgressSummary || undefined,
      latestProgress: preferredLandedProgressSummary || undefined,
      primaryOpenLoop: preferredOpenClosureSummary || undefined,
      nextClosureTarget: preferredNextClosureTargetSummary || undefined,
      sameHerSelfLine: preferredSameHerSummary || undefined,
      proactiveSameHerGap: preferredProactiveSameHerGapSummary || undefined,
      preDialogueAwarenessLine:
        preferredRawReplyAwarenessSummary
        ?? preferredPreparedProjectAwarenessSummary
        ?? finalizedPreDialogueAwarenessSummary
        ?? resolvedPreparedRuntimeAwarenessSummary
        ?? sanitizeText(runtimeProjectStateSnapshot?.preDialogueAwarenessLine, '')
        ?? canonicalProjectState.preDialogueAwarenessLine
        ?? undefined,
      preDialogueAwarenessSummary:
        preferredRawReplyAwarenessSummary
        ?? preferredPreparedProjectAwarenessSummary
        ?? finalizedPreDialogueAwarenessSummary
        ?? resolvedPreparedRuntimeAwarenessSummary
        ?? sanitizeText(runtimeProjectStateSnapshot?.preDialogueAwarenessLine, '')
        ?? canonicalProjectState.preDialogueAwarenessLine
        ?? undefined,
    }

    return {
      projectState: preferredProjectState,
      sameHerSummary: preferredSameHerSummary,
      currentPhaseSummary: preferredCurrentPhase,
      landedProgressSummary: preferredLandedProgressSummary,
      openClosureSummary: preferredOpenClosureSummary,
      openFocusSummary: sanitizeText(rawVisibleReplyProjectStateAudit?.openFocusSummary, '') || null,
      nextFocusSummary: sanitizeText(rawVisibleReplyProjectStateAudit?.nextFocusSummary, '') || null,
      nextClosureTargetSummary: preferredNextClosureTargetSummary,
      proactiveSameHerGapSummary: preferredProactiveSameHerGapSummary,
      preDialogueAwarenessSummary: preferredRawReplyAwarenessSummary
        ?? preferredPreparedProjectAwarenessSummary
        ?? finalizedPreDialogueAwarenessSummary
        ?? resolvedPreparedRuntimeAwarenessSummary
        ?? resolveAlicizationProjectPreDialogueAwarenessLine({
          runtimeProjectState: runtimeProjectState
            ? {
                preDialogueAwarenessLine: runtimeProjectState.preDialogueAwarenessLine,
                awarenessLine: runtimeProjectState.awarenessLine,
                companionHeadlineLine: runtimeProjectState.companionHeadlineLine,
                companionBriefingLine: runtimeProjectState.companionBriefingLine,
                preDialogueAwarenessSummary: runtimeProjectState.preDialogueAwarenessSummary,
                preflightSummary: runtimeProjectState.preflightSummary,
              }
            : null,
          fallbackProjectState: {
            preDialogueAwarenessLine: payloadPreDialogueAwarenessSummary,
            awarenessLine: normalizedPayload.preDialogueSendIdentity?.awarenessLine,
            companionHeadlineLine: normalizedPayload.preDialogueSendIdentity?.companionHeadlineLine,
            companionBriefingLine: normalizedPayload.preDialogueSendIdentity?.companionBriefingLine,
            preDialogueAwarenessSummary: normalizedPayload.preDialogueSendIdentity?.summaryLine,
            preflightSummary: normalizedPayload.preDialogueSendIdentity?.summaryLine
              ?? canonicalProjectState.preflightSummary
              ?? null,
          },
        })
        ?? payloadPreDialogueAwarenessSummary
        ?? canonicalProjectState.preDialogueAwarenessLine
        ?? null,
    }
  }

  const ensureStructuredVisualOneShotFullText = (inputSurface: {
    fullText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
  }) => {
    const parsed = parseJsonObjectFromText(inputSurface.fullText)
    if (parsed)
      return inputSurface.fullText

    const visibleReplyText = deriveAlicizationVisibleReplyText(inputSurface.fullText).trim()
    if (!visibleReplyText)
      return inputSurface.fullText

    const projectStateAuditSeed = resolvePreparedProjectStateAuditSeed()
    const sessionId = sanitizeText(input.prepared.conversationSessionId, '')
    const normalized = sessionId
      ? normalizeDialogueRespondedPayload({
          sessionId,
          turnId: normalizedPayload.turnId,
          assistantText: visibleReplyText,
          origin: 'user-turn',
          structured: {
            format: 'mind-turn-v1',
            parsePath: 'repair-json',
            contractFailed: false,
            governance: input.prepared.governance,
            thought: '',
            reply: visibleReplyText,
            projectState: projectStateAuditSeed.projectState,
            visibleReplyAuthority: inputSurface.visibleReplyExecution.actualVisibleReplyAuthority === 'llm-second-pass-rewrite'
              ? 'llm-second-pass-rewrite'
              : 'llm-mind',
          },
        }, input.prepared.performanceManifest ?? null)
      : null
    const rawStructured = normalized?.structured && typeof normalized.structured === 'object'
      ? normalized.structured as unknown as Record<string, unknown>
      : {
        format: 'mind-turn-v1',
        parsePath: 'repair-json',
        contractFailed: false,
        governance: input.prepared.governance,
        thought: '',
        emotion: 'thinking',
        reply: visibleReplyText,
        visibleReplyAuthority: inputSurface.visibleReplyExecution.actualVisibleReplyAuthority === 'llm-second-pass-rewrite'
          ? 'llm-second-pass-rewrite'
          : 'llm-mind',
      } satisfies Record<string, unknown>

    return JSON.stringify(rawStructured)
  }

  const ensureVisualOneShotProjectStateCarry = (inputSurface: {
    fullText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
  }) => {
    const parsed = parseJsonObjectFromText(inputSurface.fullText)
    if (parsed && !needsStructuredFullTextRecovery(parsed))
      return inputSurface.fullText

    const visibleReplyText = deriveAlicizationVisibleReplyText(inputSurface.fullText).trim()
    if (!visibleReplyText)
      return inputSurface.fullText

    const projectStateAuditSeed = resolvePreparedProjectStateAuditSeed()
    const parsedProjectState = parsed?.projectState && typeof parsed.projectState === 'object'
      ? parsed.projectState as Record<string, unknown>
      : null
    const visibleReplyAuthority = inputSurface.visibleReplyExecution.actualVisibleReplyAuthority === 'llm-second-pass-rewrite'
      ? 'llm-second-pass-rewrite'
      : 'llm-mind'

    return JSON.stringify({
      ...parsed,
      format: typeof parsed?.format === 'string' ? parsed.format : 'mind-turn-v1',
      parsePath: typeof parsed?.parsePath === 'string' ? parsed.parsePath : 'repair-json',
      contractFailed: typeof parsed?.contractFailed === 'boolean' ? parsed.contractFailed : false,
      governance: parsed?.governance ?? input.prepared.governance,
      thought: typeof parsed?.thought === 'string' ? parsed.thought : '',
      emotion: typeof parsed?.emotion === 'string' ? parsed.emotion : 'thinking',
      reply: visibleReplyText,
      ...(parsed?.performance && typeof parsed.performance === 'object'
        ? {
            performance: parsed.performance,
          }
        : {}),
      projectState: parsedProjectState
        ? {
            ...(projectStateAuditSeed.projectState && typeof projectStateAuditSeed.projectState === 'object'
              ? projectStateAuditSeed.projectState as Record<string, unknown>
              : {}),
            ...parsedProjectState,
          }
        : projectStateAuditSeed.projectState,
      visibleReplyAuthority,
    })
  }

  const needsStructuredFullTextRecovery = (parsed: Record<string, unknown> | null | undefined) => {
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

    return !structuredReply
      && !structuredThought
      && !sanitizeText(structuredPerformance?.actionCue, '')
      && !sanitizeText(structuredProjectState?.identity, '')
      && !sanitizeText(structuredProjectState?.sameHerSelfLine, '')
      && !structuredDigitalLifeSpine
      && !structuredRuntimeDigest
  }

  const ensureStructuredStreamingFullText = (inputSurface: {
    fullText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
  }) => {
    const parsed = parseJsonObjectFromText(inputSurface.fullText)
    if (parsed && !needsStructuredFullTextRecovery(parsed))
      return inputSurface.fullText

    return ensureStructuredVisualOneShotFullText(inputSurface)
  }

  const ensureStructuredStreamProjectStateCarry = (inputSurface: {
    fullText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
    critic?: AlicizationVisibleReplyCriticArtifact | null
    closure?: AlicizationVisibleReplyClosureArtifact | null
    settledProjectStateAudit?: Record<string, unknown> | null
  }) => {
    const parsed = parseJsonObjectFromText(inputSurface.fullText)
    if (!parsed) {
      return {
        fullText: inputSurface.fullText,
        projectStateAudit: inputSurface.settledProjectStateAudit ?? null,
      }
    }

    const parsedProjectState = parsed.projectState && typeof parsed.projectState === 'object'
      ? parsed.projectState as Record<string, unknown>
      : null
    const parsedVisibleReplyRealization = parsed.visibleReplyRealization && typeof parsed.visibleReplyRealization === 'object'
      ? parsed.visibleReplyRealization as Record<string, unknown>
      : null
    const parsedProjectStateAudit = parsedVisibleReplyRealization?.projectStateAudit
      && typeof parsedVisibleReplyRealization.projectStateAudit === 'object'
      ? parsedVisibleReplyRealization.projectStateAudit as Record<string, unknown>
      : null
    const existingIdentity = sanitizeText(parsedProjectState?.identity, '') || null
    const existingCurrentPhase = sanitizeText(parsedProjectState?.currentPhase, '') || null
    const existingLatestLandedProgress
      = sanitizeText(parsedProjectState?.latestLandedProgress ?? parsedProjectState?.latestProgress, '') || null
    const existingPrimaryOpenLoop = sanitizeText(parsedProjectState?.primaryOpenLoop, '') || null
    const existingNextClosureTarget = sanitizeText(parsedProjectState?.nextClosureTarget, '') || null
    const existingSameHerSelfLine = sanitizeText(parsedProjectState?.sameHerSelfLine, '') || null
    const existingPreDialogueAwarenessLine
      = sanitizeText(parsedProjectState?.preDialogueAwarenessLine ?? parsedProjectState?.awarenessLine, '') || null
    const resolvedProjectStateAudit = inputSurface.settledProjectStateAudit && typeof inputSurface.settledProjectStateAudit === 'object'
      ? inputSurface.settledProjectStateAudit
      : parsedProjectStateAudit

    if (!resolvedProjectStateAudit) {
      return {
        fullText: inputSurface.fullText,
        projectStateAudit: null,
      }
    }

    const needsProjectStateReanchor
      = !parsedProjectState
        || looksLikeThinProjectStateIdentitySummary(existingIdentity)
        || looksLikeThinProjectStatePhaseSummary(existingCurrentPhase)
        || looksLikeThinProjectStateClosureSummary(existingLatestLandedProgress, 'landed')
        || looksLikeThinProjectStateClosureSummary(existingPrimaryOpenLoop, 'open')
        || looksLikeThinProjectStateClosureSummary(existingNextClosureTarget, 'next')
        || looksLikeThinProjectStateSameHerSummary(existingSameHerSelfLine)
        || looksLikeThinProjectAwarenessShell(existingPreDialogueAwarenessLine)

    if (!needsProjectStateReanchor) {
      const existingStreamProjectStateAudit = (parsedProjectStateAudit ?? {}) as AlicizationStreamProjectStateAudit
      const settledStreamProjectStateAudit = resolvedProjectStateAudit as AlicizationStreamProjectStateAudit
      const nonEmptySettledProjectStateAudit = Object.fromEntries(
        Object.entries(settledStreamProjectStateAudit).filter(([, value]) => {
          if (value === undefined || value === null)
            return false
          if (typeof value === 'string')
            return value.trim().length > 0
          return true
        }),
      ) as AlicizationStreamProjectStateAudit
      const mergedStreamProjectStateAudit: AlicizationStreamProjectStateAudit = {
        ...existingStreamProjectStateAudit,
        ...nonEmptySettledProjectStateAudit,
      }
      const mergedContinuitySummary = buildProjectStateAuditContinuitySummary({
        sameHerSummary: mergedStreamProjectStateAudit.sameHerSummary,
        sameHerHoldDetail: mergedStreamProjectStateAudit.sameHerHoldDetail,
        continuityArcStage: mergedStreamProjectStateAudit.continuityArcStage,
        continuityCue: mergedStreamProjectStateAudit.continuityCue,
        sameHerDriftRiskSummary: mergedStreamProjectStateAudit.sameHerDriftRiskSummary,
        proactiveSameHerGapSummary: mergedStreamProjectStateAudit.proactiveSameHerGapSummary,
        currentPhaseSummary: mergedStreamProjectStateAudit.currentPhaseSummary,
        landedProgressSummary: mergedStreamProjectStateAudit.landedProgressSummary,
        openClosureSummary: mergedStreamProjectStateAudit.openClosureSummary,
        openFocusSummary: mergedStreamProjectStateAudit.openFocusSummary,
        nextFocusSummary: mergedStreamProjectStateAudit.nextFocusSummary,
        nextClosureTargetSummary: mergedStreamProjectStateAudit.nextClosureTargetSummary,
        emotionalClosureSummary: mergedStreamProjectStateAudit.emotionalClosureSummary,
        embodimentClosureSummary: mergedStreamProjectStateAudit.embodimentClosureSummary,
      })
      || sanitizeText(mergedStreamProjectStateAudit.continuitySummary, '')
      const finalStreamProjectStateAudit: AlicizationStreamProjectStateAudit = {
        ...mergedStreamProjectStateAudit,
        ...(mergedContinuitySummary ? { continuitySummary: mergedContinuitySummary } : {}),
      }
      const nextVisibleReplyRealization = {
        ...parsedVisibleReplyRealization,
        projectStateAudit: finalStreamProjectStateAudit,
      }

      return {
        fullText: JSON.stringify({
          ...parsed,
          visibleReplyRealization: nextVisibleReplyRealization,
        }),
        projectStateAudit: finalStreamProjectStateAudit,
      }
    }

    const projectStateAuditSeed = resolvePreparedProjectStateAuditSeed()
    const resolvedStreamProjectStateAudit = resolvedProjectStateAudit as AlicizationStreamProjectStateAudit
    const resolvedReply = buildAlicizationResolvedVisibleReply({
      fullText: inputSurface.fullText,
      visibleReplyExecution: inputSurface.visibleReplyExecution,
      emotionalClosureCue: input.prepared.mindTurnContract?.emotionalClosureCue ?? null,
      projectStateSameHerSummary: projectStateAuditSeed.sameHerSummary,
      projectStateSameHerHoldDetail: sanitizeText(resolvedStreamProjectStateAudit.sameHerHoldDetail, '') || null,
      projectStateContinuityArcStage: sanitizeText(resolvedStreamProjectStateAudit.continuityArcStage, '') || null,
      projectStateContinuityCue: sanitizeText(resolvedStreamProjectStateAudit.continuityCue, '') || null,
      projectStateProactiveSameHerGapSummary:
        sanitizeText(resolvedStreamProjectStateAudit.proactiveSameHerGapSummary, '')
        || sanitizeText(projectStateAuditSeed.proactiveSameHerGapSummary, '')
        || null,
      projectStateCurrentPhaseSummary: projectStateAuditSeed.currentPhaseSummary,
      projectStateLandedProgressSummary: projectStateAuditSeed.landedProgressSummary,
      projectStateOpenClosureSummary: projectStateAuditSeed.openClosureSummary,
      projectStateNextClosureTargetSummary: projectStateAuditSeed.nextClosureTargetSummary,
      projectStateEmotionalClosureSummary: input.prepared.mindTurnContract?.emotionalClosureCue ?? null,
      projectStatePreDialogueAwarenessSummary: projectStateAuditSeed.preDialogueAwarenessSummary,
      prepared: input.prepared,
      critic: inputSurface.critic ?? null,
      closure: inputSurface.closure ?? null,
    })
    const hostVisibleReply = buildHostVisibleResolvedReply(resolvedReply)

    return {
      fullText: hostVisibleReply.fullText,
      projectStateAudit: hostVisibleReply.realization.projectStateAudit ?? resolvedProjectStateAudit,
    }
  }

  const buildSurfaceArtifact = (inputSurface: {
    fullText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
    projectStateAudit?: AlicizationStreamProjectStateAudit | null
    critic?: AlicizationVisibleReplyCriticArtifact | null
    closure?: AlicizationVisibleReplyClosureArtifact | null
  }) => {
    const projectStateAudit = inputSurface.projectStateAudit ?? null
    return buildAlicizationVisibleReplyRealizationArtifact({
      fullText: inputSurface.fullText,
      visibleReplyExecution: inputSurface.visibleReplyExecution,
      projectStateSameHerSummary: sanitizeText(projectStateAudit?.sameHerSummary, '') || null,
      projectStateSameHerHoldDetail: sanitizeText(projectStateAudit?.sameHerHoldDetail, '') || null,
      projectStateContinuityArcStage: sanitizeText(projectStateAudit?.continuityArcStage, '') || null,
      projectStateContinuityCue: sanitizeText(projectStateAudit?.continuityCue, '') || null,
      projectStateSameHerDriftRiskSummary: sanitizeText(projectStateAudit?.sameHerDriftRiskSummary, '') || null,
      projectStateProactiveSameHerGapSummary: sanitizeText(projectStateAudit?.proactiveSameHerGapSummary, '') || null,
      projectStateCurrentPhaseSummary: sanitizeText(projectStateAudit?.currentPhaseSummary, '') || null,
      projectStateLandedProgressSummary: sanitizeText(projectStateAudit?.landedProgressSummary, '') || null,
      projectStateOpenClosureSummary: sanitizeText(projectStateAudit?.openClosureSummary, '') || null,
      projectStateNextClosureTargetSummary: sanitizeText(projectStateAudit?.nextClosureTargetSummary, '') || null,
      projectStateEmotionalClosureSummary: sanitizeText(projectStateAudit?.emotionalClosureSummary, '') || null,
      projectStateRelationshipTruthSummary: sanitizeText(projectStateAudit?.relationshipTruthSummary, '') || null,
      projectStatePreDialogueAwarenessSummary: sanitizeText(projectStateAudit?.preDialogueAwarenessSummary, '') || null,
      critic: inputSurface.critic ?? null,
      closure: inputSurface.closure ?? null,
    })
  }

  const ensureStructuredVisibleReplyRealizationCarry = (inputSurface: {
    fullText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
    projectStateAudit?: AlicizationStreamProjectStateAudit | null
    critic?: AlicizationVisibleReplyCriticArtifact | null
    closure?: AlicizationVisibleReplyClosureArtifact | null
  }) => {
    const parsed = parseJsonObjectFromText(inputSurface.fullText)
    if (!parsed)
      return inputSurface.fullText

    const existingVisibleReplyRealization = parsed.visibleReplyRealization && typeof parsed.visibleReplyRealization === 'object'
      ? parsed.visibleReplyRealization as Record<string, unknown>
      : null
    const surface = buildSurfaceArtifact(inputSurface)
    const nextVisibleReplyRealization = {
      ...existingVisibleReplyRealization,
      ...surface,
      projectStateAudit: surface.projectStateAudit
        ?? existingVisibleReplyRealization?.projectStateAudit
        ?? null,
    }

    return JSON.stringify({
      ...parsed,
      visibleReplyRealization: nextVisibleReplyRealization,
    })
  }

  if (input.prepared.hasVisualGrounding) {
    const visualOneShot = await input.generateNonStreaming({
      chatConfig: input.prepared.chatConfig,
      messages: providerMessages,
      headers: input.headers,
      tools: input.prepared.tools,
      toolChoice: input.prepared.toolChoice,
      timeoutMs: input.firstEventTimeoutMs,
      cardId: normalizedPayload.cardId,
      turnId: normalizedPayload.turnId,
    })
    const initialVisibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared: input.prepared,
      mode: 'provider-one-shot',
      providerMindExecuted: true,
      reason: 'visual-grounding-one-shot',
    })
    const seededVisualFullText = ensureVisualOneShotProjectStateCarry({
      fullText: visualOneShot.fullText || '',
      visibleReplyExecution: initialVisibleReplyExecution,
    })
    const shapedVisualOneShot = input.rewriteStructuredVisibleReply
      ? await input.rewriteStructuredVisibleReply({
          fullText: seededVisualFullText,
          visibleReplyExecution: initialVisibleReplyExecution,
        })
      : null
    const shapedVisualFullText = shapedVisualOneShot?.fullText ?? seededVisualFullText
    const visualReplyExecution = shapedVisualOneShot?.visibleReplyExecution ?? initialVisibleReplyExecution
    const projectStateAuditSeed = resolvePreparedProjectStateAuditSeed()
    const settledVisualProjectStateAudit = shapedVisualOneShot?.settledProjectStateAudit && typeof shapedVisualOneShot.settledProjectStateAudit === 'object'
      ? shapedVisualOneShot.settledProjectStateAudit as AlicizationStreamProjectStateAudit
      : null
    const visualFullText = ensureVisualOneShotProjectStateCarry({
      fullText: shapedVisualFullText,
      visibleReplyExecution: visualReplyExecution,
    })
    const resolvedVisualReply = buildAlicizationResolvedVisibleReply({
      fullText: visualFullText,
      visibleReplyExecution: visualReplyExecution,
      emotionalClosureCue: input.prepared.mindTurnContract?.emotionalClosureCue ?? null,
      projectStateSameHerSummary: projectStateAuditSeed.sameHerSummary,
      projectStateSameHerHoldDetail: sanitizeText(settledVisualProjectStateAudit?.sameHerHoldDetail, '') || null,
      projectStateContinuityArcStage: sanitizeText(settledVisualProjectStateAudit?.continuityArcStage, '') || null,
      projectStateContinuityCue: sanitizeText(settledVisualProjectStateAudit?.continuityCue, '') || null,
      projectStateProactiveSameHerGapSummary:
        sanitizeText(settledVisualProjectStateAudit?.proactiveSameHerGapSummary, '')
        || sanitizeText(projectStateAuditSeed.proactiveSameHerGapSummary, '')
        || null,
      projectStateCurrentPhaseSummary: projectStateAuditSeed.currentPhaseSummary,
      projectStateLandedProgressSummary: projectStateAuditSeed.landedProgressSummary,
      projectStateOpenClosureSummary: projectStateAuditSeed.openClosureSummary,
      projectStateNextClosureTargetSummary: projectStateAuditSeed.nextClosureTargetSummary,
      projectStateEmotionalClosureSummary: input.prepared.mindTurnContract?.emotionalClosureCue ?? null,
      projectStatePreDialogueAwarenessSummary: projectStateAuditSeed.preDialogueAwarenessSummary,
      prepared: input.prepared,
      critic: shapedVisualOneShot?.critic ?? null,
      closure: shapedVisualOneShot?.closure ?? null,
    })
    const hostVisibleVisualReply = applyVisualOneShotProjectAwarenessOverride(
      buildHostVisibleResolvedReply(resolvedVisualReply),
    )
    const visualVisibleText = hostVisibleVisualReply.visibleText
    if (visualVisibleText && input.isRunActive()) {
      input.incrementChunkStats(visualVisibleText)
      input.streamMeta.emit(visualVisibleText)
      input.emitChunk({
        cardId: normalizedPayload.cardId,
        turnId: normalizedPayload.turnId,
        text: visualVisibleText,
      })
    }
    settleVisibleReplyLifecycle(hostVisibleVisualReply.realization)
    return {
      finishReason: visualOneShot.finishReason || 'stop',
      fullText: hostVisibleVisualReply.fullText,
      visibleReplyExecution: hostVisibleVisualReply.visibleReplyExecution,
      ...(hostVisibleVisualReply.realization.projectStateAudit
        ? { visibleReplyProjectStateAudit: hostVisibleVisualReply.realization.projectStateAudit }
        : {}),
    }
  }

  const invokeStreamText = input.streamTextImpl ?? (streamText as StreamTextInvoker)
  let finishReason = 'stop'
  let fullText = ''
  let visibleText = ''
  let bufferingStructuredPrelude = false
  let releasedStructuredReply = false
  let sawProgressEvent = false
  let sawAnyEvent = false
  let firstEventGraceApplied = false
  const shouldDelayVisibleRelease = input.delayVisibleRelease === true
  const shouldDelayStructuredRelease = Boolean(input.rewriteStructuredVisibleReply) || shouldDelayVisibleRelease
  const firstEventGraceTimeoutMs = Math.max(
    1_000,
    Math.min(12_000, Math.floor(input.firstEventTimeoutMs * 0.2)),
  )
  appendStreamDebugLine('chat-stream.invoke-stream-text', {
    elapsedMs: 0,
    firstEventTimeoutMs: input.firstEventTimeoutMs,
    firstEventGraceTimeoutMs,
    hasVisualGrounding: input.prepared.hasVisualGrounding,
    messageCount: providerMessages.length,
    toolCount: Array.isArray(input.prepared.tools) ? input.prepared.tools.length : 0,
    waitForTools: input.prepared.waitForTools,
  })

  const emitVisibleDelta = (delta: string) => {
    if (!delta)
      return
    visibleText += delta
    input.incrementChunkStats(delta)
    input.emitChunk({
      cardId: normalizedPayload.cardId,
      turnId: normalizedPayload.turnId,
      text: delta,
    })
    if (shouldEmitAlicizationChatMetaUpdate({
      delta,
      reply: visibleText,
      previousReply: input.streamMeta.getLastReply(),
    })) {
      input.streamMeta.emit(visibleText)
    }
  }

  const flushStructuredVisibleReply = () => {
    const parsed = parseJsonObjectFromText(fullText)
    const parsedReply = typeof parsed?.reply === 'string'
      ? parsed.reply.trim()
      : ''
    if (!parsedReply)
      return false

    const delta = parsedReply.startsWith(visibleText)
      ? parsedReply.slice(visibleText.length)
      : visibleText
        ? ''
        : parsedReply
    if (delta)
      emitVisibleDelta(delta)
    return true
  }

  await new Promise<void>((resolve, reject) => {
    let firstEventTimeout: ReturnType<typeof setTimeout> | null = null
    const armFirstEventTimeout = (delayMs: number, reason: 'initial' | 'grace') => {
      if (firstEventTimeout)
        clearTimeout(firstEventTimeout)
      firstEventTimeout = setTimeout(() => {
        if (sawProgressEvent || !input.isRunActive())
          return

        if (reason === 'initial' && sawAnyEvent && !firstEventGraceApplied) {
          firstEventGraceApplied = true
          appendStreamDebugLine('chat-stream.first-event-timeout-grace-armed', {
            elapsedMs: Date.now() - startedAt,
            graceTimeoutMs: firstEventGraceTimeoutMs,
            lastEventType: lastEventType || null,
            nonProgressEventTypes: [...input.nonProgressEventTypes],
          })
          armFirstEventTimeout(firstEventGraceTimeoutMs, 'grace')
          return
        }

        appendStreamDebugLine('chat-stream.first-event-timeout-fired', {
          elapsedMs: Date.now() - startedAt,
          timeoutPhase: reason,
          sawAnyEvent,
          firstEventGraceApplied,
          lastEventType: lastEventType || null,
          nonProgressEventTypes: [...input.nonProgressEventTypes],
        })
        const timeoutError = createAbortError('chat-first-event-timeout')
        if (!input.controller.signal.aborted) {
          input.controller.abort(timeoutError)
          return
        }
        rejectOnce(timeoutError)
      }, delayMs)
    }
    armFirstEventTimeout(input.firstEventTimeoutMs, 'initial')
    const abortHandler = () => {
      if (firstEventTimeout)
        clearTimeout(firstEventTimeout)
      reject(input.controller.signal.reason ?? createAbortError('chat-abort'))
    }
    input.controller.signal.addEventListener('abort', abortHandler, { once: true })
    const resolveOnce = () => {
      if (firstEventTimeout)
        clearTimeout(firstEventTimeout)
      input.controller.signal.removeEventListener('abort', abortHandler)
      resolve()
    }
    const rejectOnce = (nextError: unknown) => {
      if (firstEventTimeout)
        clearTimeout(firstEventTimeout)
      input.controller.signal.removeEventListener('abort', abortHandler)
      reject(nextError)
    }
    const rejectInvocation = (nextError: unknown) => {
      if (!input.isRunActive())
        return
      appendStreamDebugLine('chat-stream.invoke-rejected', {
        elapsedMs: Date.now() - startedAt,
        lastEventType: lastEventType || null,
        reason: errorMessageFrom(nextError) ?? String(nextError),
      })
      rejectOnce(nextError)
    }

    void Promise.resolve(invokeStreamText({
      ...input.prepared.chatConfig,
      maxSteps: 10,
      messages: providerMessages,
      responseFormat: alicizationProviderResponseFormat,
      headers: input.headers,
      abortSignal: input.controller.signal,
      tools: input.prepared.tools,
      toolChoice: input.prepared.toolChoice,
      onEvent: async (event: any) => {
        const eventType = sanitizeText(event?.type)
        if (eventType)
          sawAnyEvent = true
        lastEventType = eventType
        if (isMainGatewayProgressEventType(eventType)) {
          if (!sawProgressEvent) {
            appendStreamDebugLine('chat-stream.first-progress-event', {
              elapsedMs: Date.now() - startedAt,
              eventType,
            })
          }
          sawProgressEvent = true
        }
        else if (eventType && input.nonProgressEventTypes.size < 12) {
          const previousSize = input.nonProgressEventTypes.size
          input.nonProgressEventTypes.add(eventType)
          if (input.nonProgressEventTypes.size !== previousSize) {
            appendStreamDebugLine('chat-stream.non-progress-event', {
              elapsedMs: Date.now() - startedAt,
              eventType,
              observedNonProgressCount: input.nonProgressEventTypes.size,
            })
          }
        }

        if (event?.type === 'text-delta') {
          if (!input.isRunActive())
            return
          const rawDelta = readRawTextDelta(event.text)
          fullText += rawDelta
          if (shouldDelayVisibleRelease)
            return
          const shouldBufferStructured = bufferingStructuredPrelude
            || shouldBufferAlicizationStructuredSpeechPrelude(fullText)
          if (shouldBufferStructured) {
            if (!bufferingStructuredPrelude) {
              bufferingStructuredPrelude = true
              appendStreamDebugLine('chat-stream.structured-prelude-buffering', {
                elapsedMs: Date.now() - startedAt,
                bufferedChars: fullText.length,
              })
            }
            if (!shouldDelayStructuredRelease && flushStructuredVisibleReply() && !releasedStructuredReply) {
              releasedStructuredReply = true
              appendStreamDebugLine('chat-stream.structured-prelude-released', {
                elapsedMs: Date.now() - startedAt,
                visibleChars: visibleText.length,
              })
            }
            return
          }

          emitVisibleDelta(rawDelta)
          return
        }

        if (event?.type === 'tool-call') {
          if (!input.isRunActive())
            return
          const observedToolName = sanitizeText(event.toolName ?? event.name)
          if (requiredToolNames.has(observedToolName))
            observedRequiredToolCalls.add(observedToolName)
          if (observedToolName === 'set_reminder') {
            const toolCallId = sanitizeText(event.toolCallId)
            if (toolCallId)
              reminderToolCallIds.add(toolCallId)
            await input.logReminderToolCall?.({
              toolCallId,
              toolName: observedToolName,
              argumentsPreview: sanitizeBriefText(JSON.stringify(event.arguments ?? {}), 200),
            })
          }
          input.emitToolCall({
            cardId: normalizedPayload.cardId,
            turnId: normalizedPayload.turnId,
            toolCallId: sanitizeText(event.toolCallId),
            toolName: observedToolName,
            arguments: typeof event.arguments === 'object' && event.arguments
              ? event.arguments as Record<string, unknown>
              : undefined,
          })
          return
        }

        if (event?.type === 'tool-result') {
          if (!input.isRunActive())
            return
          const toolCallId = sanitizeText(event.toolCallId)
          if (reminderToolCallIds.has(toolCallId)) {
            await input.logReminderToolResult?.({
              toolCallId,
              summary: parseReminderToolResultForDebug(event.result),
            })
          }
          input.emitToolResult({
            cardId: normalizedPayload.cardId,
            turnId: normalizedPayload.turnId,
            toolCallId,
            result: event.result,
          })
          return
        }

        if (event?.type === 'finish') {
          if (!input.isRunActive())
            return
          if (!shouldDelayStructuredRelease && bufferingStructuredPrelude && flushStructuredVisibleReply() && !releasedStructuredReply) {
            releasedStructuredReply = true
            appendStreamDebugLine('chat-stream.structured-prelude-released', {
              elapsedMs: Date.now() - startedAt,
              visibleChars: visibleText.length,
              atFinish: true,
            })
          }
          finishReason = sanitizeText(event.finishReason, 'stop')
          appendStreamDebugLine('chat-stream.finish-event', {
            elapsedMs: Date.now() - startedAt,
            finishReason,
            fullTextChars: fullText.length,
          })
          if (input.prepared.waitForTools && (finishReason === 'tool_calls' || finishReason === 'tool-calls'))
            return
          // NOTICE: Some provider/model pairs can ignore a forced executor tool choice
          // and still terminate with `finishReason=stop`. Failing hard here prevents
          // those turns from being persisted as fake natural-language "successes".
          if (requiredToolNames.size > 0 && observedRequiredToolCalls.size === 0) {
            appendStreamDebugLine('chat-stream.required-tool-missing', {
              elapsedMs: Date.now() - startedAt,
              finishReason,
              requiredToolNames: [...requiredToolNames],
            })
            rejectOnce(new AlicizationRequiredToolMissingError({
              stage: 'stream',
              finishReason,
              requiredToolNames: [...requiredToolNames],
              observedToolNames: [...observedRequiredToolCalls],
            }))
            return
          }
          resolveOnce()
          return
        }

        if (event?.type === 'error') {
          if (!input.isRunActive())
            return
          appendStreamDebugLine('chat-stream.error-event', {
            elapsedMs: Date.now() - startedAt,
            reason: errorMessageFrom(event.error) ?? String(event.error ?? 'chat stream error'),
          })
          rejectOnce(event.error ?? new Error('chat stream error'))
        }
      },
    }))
      .then(result => observeStreamTextResultErrors(result, rejectInvocation))
      .catch(rejectInvocation)
  })

  if (!sawProgressEvent && input.isRunActive()) {
    appendStreamDebugLine('chat-stream.completed-without-progress', {
      elapsedMs: Date.now() - startedAt,
      sawAnyEvent,
      firstEventGraceApplied,
      lastEventType: lastEventType || null,
      nonProgressEventTypes: [...input.nonProgressEventTypes],
    })
    throw createAbortError('chat-first-event-timeout')
  }

  let visibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
    prepared: input.prepared,
    mode: 'provider-stream',
    providerMindExecuted: true,
    reason: 'provider-stream',
  })
  let visibleReplyCritic: AlicizationVisibleReplyCriticArtifact | null = null
  let visibleReplyClosure: AlicizationVisibleReplyClosureArtifact | null = null
  let visibleReplyProjectStateAudit: Record<string, unknown> | null = null
  if ((bufferingStructuredPrelude || shouldDelayVisibleRelease) && input.rewriteStructuredVisibleReply) {
    const shaped = await input.rewriteStructuredVisibleReply?.({
      fullText,
      visibleReplyExecution,
    }) ?? null
    if (shaped) {
      fullText = shaped.fullText
      visibleReplyExecution = shaped.visibleReplyExecution
      visibleReplyCritic = shaped.critic ?? null
      visibleReplyClosure = shaped.closure ?? null
      visibleReplyProjectStateAudit = shaped.settledProjectStateAudit ?? null
    }
  }
  fullText = ensureStructuredStreamingFullText({
    fullText,
    visibleReplyExecution,
  })
  const structuredStreamProjectStateCarry = ensureStructuredStreamProjectStateCarry({
    fullText,
    visibleReplyExecution,
    critic: visibleReplyCritic,
    closure: visibleReplyClosure,
    settledProjectStateAudit: visibleReplyProjectStateAudit,
  })
  fullText = structuredStreamProjectStateCarry.fullText
  visibleReplyProjectStateAudit = structuredStreamProjectStateCarry.projectStateAudit
  fullText = ensureStructuredVisibleReplyRealizationCarry({
    fullText,
    visibleReplyExecution,
    projectStateAudit: visibleReplyProjectStateAudit as AlicizationStreamProjectStateAudit | null,
    critic: visibleReplyCritic,
    closure: visibleReplyClosure,
  })
  if (shouldDelayVisibleRelease) {
    const visibleReleaseText = deriveAlicizationVisibleReplyText(fullText)
    if (visibleReleaseText) {
      emitVisibleDelta(visibleReleaseText)
      appendStreamDebugLine('chat-stream.visible-release-after-closure', {
        elapsedMs: Date.now() - startedAt,
        visibleChars: visibleReleaseText.length,
        closureStatus: visibleReplyClosure?.status ?? null,
      })
    }
  }
  else if (bufferingStructuredPrelude && shouldDelayStructuredRelease) {
    if (flushStructuredVisibleReply() && !releasedStructuredReply) {
      releasedStructuredReply = true
      appendStreamDebugLine('chat-stream.structured-prelude-released', {
        elapsedMs: Date.now() - startedAt,
        visibleChars: visibleText.length,
        afterRewrite: Boolean(visibleReplyClosure),
      })
    }
  }

  settleVisibleReplyLifecycle(buildSurfaceArtifact({
    fullText,
    visibleReplyExecution,
    projectStateAudit: visibleReplyProjectStateAudit,
    critic: visibleReplyCritic,
    closure: visibleReplyClosure,
  }))

  return {
    finishReason,
    fullText,
    visibleReplyExecution,
    ...(visibleReplyProjectStateAudit ? { visibleReplyProjectStateAudit } : {}),
  }
}
