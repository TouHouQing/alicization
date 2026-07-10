import type { AlicizationVisibleReplyRewriteRequest } from '@proj-alicization/stage-shared'
import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationConversationTurnInput,
  AlicizationDialoguePerformancePayload,
  AlicizationMindTurnGovernance,
  AlicizationVisibleReplyExecution,
} from '../../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'
import type {
  MainGatewayResolvedConfig,
} from '../runtime-soul'

import {
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationProviderFacingText,
  sanitizeAlicizationStructuredInternalText,
} from '@proj-alicization/stage-shared'

import {
  clampAlicizationPerformancePayloadToManifest,
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformancePayload,
} from '../../../../shared/eventa'
import { preferStrongerContinuityClosureAuthority } from '../continuity-closure-authority'
import {
  resolvePreferredPreparedRuntimeSurface,
  resolvePreparedRuntimeProjectPreDialogueAwarenessSummary,
  resolvePreparedRuntimeProjectState,
  resolvePreparedRuntimeProjectStateSnapshot,
  resolvePreparedRuntimeSelfContinuityAuthority,
} from '../prepared-runtime-continuity'
import {
  buildAlicizationOpeningGuidanceBlockedReason,
  describeAlicizationOpeningGuidanceRewriteGuidance,
  resolveAlicizationOpeningGuidanceHoldDetail,
  resolveAlicizationOpeningGuidanceViolationReason,
} from '../proactive-opening-guidance'
import {
  buildAlicizationProjectPreDialogueAwarenessLine,
  buildAlicizationProviderFacingProjectStateClosureDashboard,
  buildAlicizationProviderFacingProjectStateExtraSystemBlocks,
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectStateBrief,
  scoreAlicizationProjectAwarenessLine,
} from '../project-state-brief'
import {
  buildGovernedMindThought,
  coerceConversationTurnToMindGovernedPayload,
} from '../runtime-governance'
import {
  mainChatVisibleReplySecondPassTimeoutMs,
  sanitizeText,
} from '../runtime-soul'
import { parseJsonObjectFromText } from '../runtime-transport-content'
import { resolveCanonicalStructuredProjectState } from '../structured-project-state'
import { buildAlicizationMindAuthoringFailureArtifact } from './authority-orchestrator'

interface AlicizationSecondPassProviderInput {
  chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
  messages: Message[]
  headers?: Record<string, string>
  timeoutMs: number
}

type AlicizationSecondPassRewriteRequestShape = AlicizationVisibleReplyRewriteRequest & {
  openingGuidanceHoldDetail?: string | null
  companionshipHoldMode?: 'quiet-companionship' | 'measured-return' | 'repair-before-closeness' | 'rest-protective' | null
}

export interface AlicizationSecondPassRewriteResult {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
  rewritten: boolean
  reason: string
  audit: Record<string, unknown> | null
}

export interface AlicizationSecondPassRewriteOptions {
  cardId: string
  turnId: string
  sessionId?: string | null
  userText: string
  rawFullText: string
  prepared: AlicizationPreparedMainChatExecutionResult
  visibleReplyExecution: AlicizationVisibleReplyExecution
  provider: (input: AlicizationSecondPassProviderInput) => Promise<{
    finishReason: string
    fullText: string
  }>
  forceRewrite?: boolean
  forceReasonCodes?: string[]
  mustPreserve?: string[]
  headers?: Record<string, string>
  appendRuntimeDebugLine?: (event: string, payload: Record<string, unknown>) => Promise<void> | void
}

function sanitizeBoundedText(raw: unknown, maxChars: number) {
  return sanitizeText(raw, '').slice(0, maxChars)
}

function normalizeSecondPassProviderTemplateTokens(raw: unknown) {
  if (typeof raw !== 'string')
    return ''

  return raw
    .trim()
    .replace(/\bsame local-first digital life project\b/giu, '')
    .replace(/\bSame Phase 1 digital life\b/giu, '')
    .replace(/\bphase1_local_digital_life_anchor\s*:\s*/giu, '')
    .replace(/\bcontinuity_owner\s*=\s*one_her\b/giu, 'owner=project_state_governance')
    .replace(/\bone same-her Phase\s*1 line\b/giu, 'one continuity_line')
    .replace(/\bone same-her line\b/giu, 'one continuity_line')
    .replace(/\bcross-modal same-her proof\b/giu, 'cross_modal_continuity_proof')
    .replace(/\bsame-her carry alive\b/giu, 'continuity_carry=alive')
    .replace(/\bsame-her carry\b/giu, 'continuity_carry')
    .replace(/\bsame-her closure\b/giu, 'continuity_closure')
    .replace(/\bsame-her line\b/giu, 'continuity_line')
    .replace(/\bsame-her\b/giu, 'continuity')
    .replace(/\bsame_her\b/giu, 'continuity')
    .replace(/\bsame her\b/giu, 'continuity')
    .replace(/\bsame living line\b/giu, 'continuity_line')
    .replace(/\bsame Phase 1 living line\b/giu, 'phase1_continuity_line')
    .replace(/\bone continuous "?her"?\b/giu, 'project_state_continuity')
    .replace(/\bone living her\b/giu, 'project_state_continuity')
    .replace(/\bone continuity continuity\b/giu, 'one continuity')
    .replace(/\bcontinuity continuity\b/giu, 'continuity')
}

function sanitizeSecondPassProviderText(raw: unknown, maxChars = 360) {
  return sanitizeAlicizationProviderFacingText(
    normalizeSecondPassProviderTemplateTokens(raw),
    maxChars,
    '',
  ) || null
}

function sanitizeSecondPassProviderStructuredLine(raw: unknown, maxChars = 360) {
  const sanitized = sanitizeSecondPassProviderText(raw, maxChars)
  if (!sanitized)
    return null
  return /[=;]/u.test(sanitized) ? sanitized : null
}

function formatSecondPassProviderEvidenceContext(label: string, raw: unknown, maxChars = 360) {
  const structured = sanitizeSecondPassProviderStructuredLine(raw, maxChars)
  if (structured)
    return `${label}=${structured}`
  const sanitized = sanitizeSecondPassProviderText(raw, maxChars)
  return sanitized
    ? `${label}=present; source_text=withheld_non_structured_instruction; visible_wording=false`
    : ''
}

function isSecondPassProviderStructuredKey(value: string) {
  return value.length > 0 && Array.from(value).every((char) => {
    const code = char.codePointAt(0) ?? 0
    return (
      code >= 48 && code <= 57
      || code >= 65 && code <= 90
      || code >= 97 && code <= 122
      || char === '_'
      || char === '.'
      || char === ':'
      || char === '-'
    )
  })
}

function looksSecondPassProviderStructuredControl(value: string) {
  const trimmed = value.trim()
  if (!trimmed)
    return false
  if (isSecondPassProviderStructuredKey(trimmed))
    return true

  return trimmed.split(/[;|,]/u).every((part) => {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex <= 0)
      return false
    const key = part.slice(0, separatorIndex).trim()
    const detail = part.slice(separatorIndex + 1)
    return isSecondPassProviderStructuredKey(key) && !/[.!?。！？]/u.test(detail)
  })
}

function sanitizeSecondPassProviderList(raw: unknown, maxChars = 360) {
  return readStringList(raw)
    .map(value => sanitizeSecondPassProviderText(value, maxChars))
    .filter((value): value is string => Boolean(value))
    .map(value => looksSecondPassProviderStructuredControl(value)
      ? value
      : 'rewrite_control_present=true; rewrite_control_source_text=withheld_non_structured_instruction')
}

function sanitizeSecondPassProviderPayload(raw: unknown, maxChars = 720, depth = 0): unknown {
  if (raw === null || raw === undefined)
    return null
  if (typeof raw === 'string') {
    return sanitizeAlicizationProviderFacingText(
      normalizeSecondPassProviderTemplateTokens(raw),
      maxChars,
      '',
    ) || null
  }
  if (typeof raw === 'number' || typeof raw === 'boolean')
    return raw
  if (Array.isArray(raw)) {
    return raw
      .map(item => sanitizeSecondPassProviderPayload(item, maxChars, depth + 1))
      .filter(item => item !== null && item !== '')
  }
  if (typeof raw !== 'object' || depth >= 8)
    return null

  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([key, value]) => [
      key,
      sanitizeSecondPassProviderPayload(value, maxChars, depth + 1),
    ]),
  )
}

function sanitizeSecondPassProviderBlock(raw: unknown, maxChars = 3200) {
  const text = sanitizeBoundedText(raw, maxChars)
  if (!text)
    return '(none)'

  const sanitized = text
    .split('\n')
    .map((line) => {
      if (!line.trim())
        return ''
      return sanitizeAlicizationProviderFacingText(
        normalizeSecondPassProviderTemplateTokens(line),
        maxChars,
        '',
      )
      || ''
    })
    .join('\n')
    .trim()

  return sanitized || '(none)'
}

function sanitizeSecondPassRecentMessages(messages: Message[]) {
  return messages.map((message) => {
    if (typeof message.content !== 'string')
      return message
    return {
      ...message,
      content: sanitizeSecondPassProviderBlock(message.content, 2000),
    }
  })
}

function redactSecondPassOriginalStructuredForProvider(raw: Record<string, unknown>) {
  const redacted: Record<string, unknown> = { ...raw }
  for (const key of ['thought', 'reply', 'fullText']) {
    if (typeof redacted[key] !== 'string')
      continue
    redacted[key] = sanitizeAlicizationProviderFacingText(redacted[key], 1200, '')
  }
  return redacted
}

const SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS = 3200
const SECOND_PASS_EMBODIMENT_CLOSURE_MAX_CHARS = 3200
const SECOND_PASS_MEMORY_OWNER_BLOCK_MAX_CHARS = 1200
const SECOND_PASS_MEMORY_OWNER_EVIDENCE_MAX_CHARS = 3600

const SECOND_PASS_MEMORY_OWNER_MARKERS = [
  '[ALICIZATION_WORKING_MEMORY_OWNER]',
  '[ALICIZATION_WORKING_MEMORY]',
  '[ALICIZATION_RECALLED_MEMORY]',
] as const

type SecondPassMemoryOwnerMarker = typeof SECOND_PASS_MEMORY_OWNER_MARKERS[number]

function formatRelationshipTruthDoctrineForRewrite(raw: unknown) {
  const joinedRaw = Array.isArray(raw)
    ? raw
        .map(item => sanitizeBoundedText(item, 220))
        .filter(Boolean)
        .join(' | ')
    : sanitizeBoundedText(raw, 320)
  if (!joinedRaw)
    return null

  const normalized = joinedRaw.toLowerCase()
  const truthBeforeWarmth = /repair truth|truth before|truth-first|truth.*warmth|真实|修正|纠偏/u.test(normalized)
  const closenessBoundary = /stay close|closeness|close only|warmth|靠近|亲近/u.test(normalized)

  return [
    truthBeforeWarmth
      ? 'relationship_truth_policy=repair_truth_before_warmth'
      : 'relationship_truth_policy=truth_before_style',
    closenessBoundary
      ? 'relationship_boundary=closeness_must_not_outrun_truth'
      : '',
    'source_text=withheld_non_structured_instruction',
    'visible_wording=false',
  ].filter(Boolean).join('; ')
}

function looksLikeProjectStateAnswerStancePreserveLine(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, 320).toLowerCase()
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(normalized))
    return false

  const namesProjectState
    = /(?:^|[;|,\s])(?:answer_subject|project_state_answer|project_state_continuity|project_state_question|project_context_follow_through|preserve_field)=/u.test(normalized)
      || /preserve_field=project_state\./u.test(normalized)
  const carriesStructuredContinuity
    = /(?:^|[;|,\s])(?:continuity_anchor|continuity_field|continuity_cue|continuity_hold|life_loop_continuity|local_desktop_life_loop)=/u.test(normalized)
      || /local_desktop_life_loop|memory_dialogue_embodiment_closure|cross_modal_continuity_proof/u.test(normalized)

  return namesProjectState && carriesStructuredContinuity
}

function resolveProjectStateAnswerStancePreserveLine(values: string[]) {
  return values
    .map(value => sanitizeBoundedText(value, 320))
    .find(value => looksLikeProjectStateAnswerStancePreserveLine(value))
    ?? null
}

function carriesStructuredEmbodimentContinuityProof(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS).toLowerCase()
  if (!normalized)
    return false

  return /continuity=embodiment:(?:still-voiced-face-motion-line|still-voiced-motion-line|still-voiced-face-line|still-voiced-face-lipsync-line|still-voiced-motion-lipsync-line|audible-same-her-line|body-lipsync-voice-rejoin)(?:\+embodiment:[^|\s]+)?(?:\s*\||$)/i.test(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|(?:still-voiced-face-motion-line|still-voiced-motion-line|still-voiced-face-line|still-voiced-face-lipsync-line|still-voiced-motion-lipsync-line)/i.test(normalized)
    || /(?:same-segment\s+)?(?:face\+motion|face\+voice|motion\+voice|face\+lipsync\+voice|motion\+lipsync\+voice|body\+lipsync\+voice)\s+recovery@/i.test(normalized)
    || /pending-rejoin=body(?:\+face)?(?:\+motion)?(?:\+lipsync)?(?:\+voice)?(?:\s|\||$)/i.test(normalized)
}

function preferRicherProjectStateAuditText(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = sanitizeBoundedText(input.current, 320) || null
  const candidate = sanitizeBoundedText(input.candidate, 320) || null

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

function resolveSecondPassProjectState(input?: {
  prepared?: AlicizationPreparedMainChatExecutionResult | null
}) {
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const rawPreparedProjectState = resolvePreparedRuntimeProjectState(input?.prepared)
  const runtimeProjectState = resolvePreparedRuntimeProjectStateSnapshot(input?.prepared)
  const canonicalProjectState = resolvePreparedRuntimeProjectStateSnapshot(input?.prepared)
  const resolvedProjectState = resolveCanonicalStructuredProjectState({
    normalizedProjectState: {
      identity: canonicalProjectState.identity,
      currentPhase: sanitizeBoundedText(runtimeProjectState.currentPhase, 220) || canonicalProjectState.currentPhase,
      latestLandedProgress: sanitizeBoundedText(
        rawPreparedProjectState?.latestLandedProgress
        ?? rawPreparedProjectState?.latestProgress
        ?? rawPreparedProjectState?.memoryClosureSummary
        ?? runtimeProjectState.latestLandedProgress
        ?? projectStateBrief.continuityProgressSummary
        ?? projectStateBrief.memoryAnthropomorphismProgress.at(-1)
        ?? canonicalProjectState.latestLandedProgress,
        16_000,
      ) || null,
      primaryOpenLoop: sanitizeBoundedText(
        rawPreparedProjectState?.primaryOpenLoop
        ?? runtimeProjectState.primaryOpenLoop
        ?? projectStateBrief.openLoops[0]
        ?? canonicalProjectState.primaryOpenLoop,
        16_000,
      ) || null,
      nextClosureTarget: sanitizeBoundedText(
        rawPreparedProjectState?.nextClosureTarget
        ?? runtimeProjectState.nextClosureTarget
        ?? projectStateBrief.nextClosureTarget
        ?? canonicalProjectState.nextClosureTarget,
        16_000,
      ) || projectStateBrief.nextClosureTarget,
      sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
      sameHerHoldDetail: sanitizeBoundedText(
        rawPreparedProjectState?.sameHerHoldDetail
        ?? runtimeProjectState.sameHerHoldDetail
        ?? canonicalProjectState.sameHerHoldDetail,
        320,
      ) || null,
      continuityArcStage: sanitizeBoundedText(
        rawPreparedProjectState?.continuityArcStage
        ?? runtimeProjectState.continuityArcStage
        ?? canonicalProjectState.continuityArcStage,
        120,
      ) || null,
      continuityCue: sanitizeBoundedText(
        rawPreparedProjectState?.continuityCue
        ?? runtimeProjectState.continuityCue
        ?? canonicalProjectState.continuityCue,
        220,
      ) || null,
      sameHerDriftRisk: sanitizeBoundedText(
        rawPreparedProjectState?.sameHerDriftRisk
        ?? runtimeProjectState.sameHerDriftRisk
        ?? projectStateBrief.sameHerDriftRisk,
        320,
      ) || projectStateBrief.sameHerDriftRisk,
      companionHeadlineLine: sanitizeBoundedText(
        rawPreparedProjectState?.companionHeadlineLine
        ?? runtimeProjectState.companionHeadlineLine
        ?? canonicalProjectState.companionHeadlineLine,
        SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
      ) || null,
      companionBriefingLine: sanitizeBoundedText(
        rawPreparedProjectState?.companionBriefingLine
        ?? runtimeProjectState.companionBriefingLine
        ?? canonicalProjectState.companionBriefingLine,
        SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
      ) || null,
    },
    runtimePreflightSummary: sanitizeBoundedText(
      rawPreparedProjectState?.preflightSummary
      ?? projectStateBrief.preflightSummary
      ?? runtimeProjectState.preflightSummary
      ?? canonicalProjectState.preflightSummary,
      SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
    ) || null,
    runtimePreDialogueAwarenessLine: sanitizeBoundedText(
      rawPreparedProjectState?.preDialogueAwarenessLine
      ?? rawPreparedProjectState?.awarenessLine
      ?? resolvePreparedRuntimeProjectPreDialogueAwarenessSummary(input?.prepared)
      ?? rawPreparedProjectState?.preflightSummary
      ?? canonicalProjectState.preDialogueAwarenessLine,
      SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
    ) || null,
  })

  const needsExplicitProjectReanchor = !/local-first digital life|project/iu.test(
    resolvedProjectState.preDialogueAwarenessLine ?? '',
  )
  && !looksLikeCallbackSpecificSameHerProjectAwareness(resolvedProjectState.preDialogueAwarenessLine ?? null)
  && isAlicizationThinProjectAwarenessLine(resolvedProjectState.preDialogueAwarenessLine ?? null)

  if (!needsExplicitProjectReanchor)
    return resolvedProjectState

  const rebuiltAwarenessLine = buildAlicizationProjectPreDialogueAwarenessLine({
    identity: resolvedProjectState.identity,
    currentPhase: resolvedProjectState.currentPhase,
    latestLandedProgress: resolvedProjectState.latestLandedProgress,
    primaryOpenLoop: resolvedProjectState.primaryOpenLoop,
    nextClosureTarget: resolvedProjectState.nextClosureTarget,
    sameHerSelfLine: resolvedProjectState.sameHerSelfLine,
  })

  if (!rebuiltAwarenessLine)
    return resolvedProjectState

  return {
    ...resolvedProjectState,
    preDialogueAwarenessLine: rebuiltAwarenessLine,
    preDialogueAwarenessSummary: rebuiltAwarenessLine,
    awarenessLine: rebuiltAwarenessLine,
    companionHeadlineLine: rebuiltAwarenessLine,
  }
}

function resolveSecondPassProjectStateContinuityFields(input: {
  prepared?: AlicizationPreparedMainChatExecutionResult | null
  projectState: Record<string, unknown>
}) {
  const contractProjectState = input.prepared?.mindTurnContract?.projectState as Record<string, unknown> | null | undefined
  const runtimeSurface = resolvePreferredPreparedRuntimeSurface(input.prepared?.runtimeSurface)
  const currentConsciousProjectState = runtimeSurface?.dialogue?.currentConsciousFrame?.projectState as Record<string, unknown> | null | undefined
  const rawRuntimeDigestProjectState = runtimeSurface?.raw?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined
  const cognitionRuntimeDigestProjectState = runtimeSurface?.cognition?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined
  const dialogueRuntimeDigestProjectState = runtimeSurface?.dialogue?.runtimeDigest?.projectState as Record<string, unknown> | null | undefined
  const runtimeDigestProjectState = (
    rawRuntimeDigestProjectState
    ?? cognitionRuntimeDigestProjectState
    ?? dialogueRuntimeDigestProjectState
  ) as Record<string, unknown> | null | undefined

  const pickField = (field: 'sameHerHoldDetail' | 'continuityArcStage' | 'continuityCue', maxChars: number) => {
    return sanitizeBoundedText(
      contractProjectState?.[field]
      ?? currentConsciousProjectState?.[field]
      ?? runtimeDigestProjectState?.[field]
      ?? input.projectState[field],
      maxChars,
    ) || null
  }

  const sameHerHoldDetail = preferRicherProjectStateAuditText({
    current: contractProjectState?.sameHerHoldDetail,
    candidate: preferRicherProjectStateAuditText({
      current: currentConsciousProjectState?.sameHerHoldDetail,
      candidate: preferRicherProjectStateAuditText({
        current: rawRuntimeDigestProjectState?.sameHerHoldDetail,
        candidate: preferRicherProjectStateAuditText({
          current: cognitionRuntimeDigestProjectState?.sameHerHoldDetail,
          candidate: preferRicherProjectStateAuditText({
            current: dialogueRuntimeDigestProjectState?.sameHerHoldDetail,
            candidate: input.projectState.sameHerHoldDetail,
          }),
        }),
      }),
    }),
  })

  return {
    sameHerHoldDetail: sameHerHoldDetail ? sanitizeBoundedText(sameHerHoldDetail, 320) || null : null,
    continuityArcStage: pickField('continuityArcStage', 120),
    continuityCue: pickField('continuityCue', 220),
  }
}

function buildSecondPassCanonicalProjectStateSystemMessages(input: {
  projectState: ReturnType<typeof resolveSecondPassProjectState>
  continuityFields: ReturnType<typeof resolveSecondPassProjectStateContinuityFields>
}) {
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const identity = sanitizeBoundedText(input.projectState.identity, 220) || projectStateBrief.identity
  const currentPhase = sanitizeBoundedText(input.projectState.currentPhase, 160) || projectStateBrief.currentPhase
  const latestLandedProgress
    = sanitizeBoundedText(input.projectState.latestLandedProgress, 360)
      || projectStateBrief.continuityProgressSummary
      || projectStateBrief.latestProgress
  const primaryOpenLoop
    = sanitizeBoundedText(input.projectState.primaryOpenLoop, 220)
      || projectStateBrief.openLoops[0]
      || projectStateBrief.primaryOpenLoop
  const nextClosureTarget
    = sanitizeBoundedText(input.projectState.nextClosureTarget, 220)
      || projectStateBrief.nextClosureTarget

  const canonicalProjectStateBrief = {
    ...projectStateBrief,
    identity,
    currentPhase,
    latestProgress: latestLandedProgress,
    primaryOpenLoop,
    sameHerSelfLine: sanitizeBoundedText(input.projectState.sameHerSelfLine, 220) || projectStateBrief.sameHerSelfLine,
    sameHerDriftRisk: sanitizeBoundedText(input.projectState.sameHerDriftRisk, 220) || projectStateBrief.sameHerDriftRisk,
    sameHerHoldDetail: input.continuityFields.sameHerHoldDetail ?? projectStateBrief.sameHerHoldDetail ?? null,
    continuityCue: input.continuityFields.continuityCue ?? projectStateBrief.continuityCue ?? null,
    preflightSummary: sanitizeBoundedText(input.projectState.preflightSummary, 320) || projectStateBrief.preflightSummary,
    preDialogueAwarenessLine:
      sanitizeBoundedText(input.projectState.preDialogueAwarenessLine, 400)
      || projectStateBrief.preDialogueAwarenessLine
      || null,
    continuityProgressSummary: latestLandedProgress,
    openLoops: [primaryOpenLoop, ...projectStateBrief.openLoops]
      .map(value => sanitizeBoundedText(value, 220))
      .filter((value): value is string => Boolean(value))
      .filter((value, index, values) => values.indexOf(value) === index)
      .slice(0, 5),
    nextClosureTarget,
  }

  return buildAlicizationProviderFacingProjectStateExtraSystemBlocks({
    brief: canonicalProjectStateBrief,
  }).map(content => ({
    role: 'system',
    content: sanitizeSecondPassProviderBlock(content, SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS),
  }) as Message)
}

export function buildAlicizationSecondPassTransportFailureReply(input: {
  governedStructured?: Record<string, unknown> | null
  previousExecution: AlicizationVisibleReplyExecution
  reason: string
  prepared?: AlicizationPreparedMainChatExecutionResult | null
}) {
  const reason = sanitizeText(input.reason).slice(0, 180) || 'visible-reply-second-pass-transport-failure'
  const projectState = resolveSecondPassProjectState({
    prepared: input.prepared,
  })
  const rebuiltTransportFailureAwarenessLine = !looksLikeCallbackSpecificSameHerProjectAwareness(
    projectState.preDialogueAwarenessLine ?? null,
  )
  && !/local-first digital life project/iu.test(projectState.preDialogueAwarenessLine ?? '')
    ? buildAlicizationProjectPreDialogueAwarenessLine({
        identity: projectState.identity,
        currentPhase: projectState.currentPhase,
        latestLandedProgress: projectState.latestLandedProgress,
        primaryOpenLoop: projectState.primaryOpenLoop,
        nextClosureTarget: projectState.nextClosureTarget,
        sameHerSelfLine: projectState.sameHerSelfLine,
      })
    : null
  const transportFailureAwarenessLine
    = rebuiltTransportFailureAwarenessLine ?? projectState.preDialogueAwarenessLine
  const relationshipTruthDoctrine = formatRelationshipTruthDoctrineForRewrite(
    input.prepared?.mindTurnContract?.relationshipTruthDoctrine,
  )
  const transportFailureContinuityFields = resolveSecondPassProjectStateContinuityFields({
    prepared: input.prepared,
    projectState,
  })
  const transportFailureProjectState = {
    identity: sanitizeSecondPassProviderText(projectState.identity, 320),
    currentPhase: sanitizeSecondPassProviderText(projectState.currentPhase, 240),
    preflightSummary: sanitizeSecondPassProviderText(projectState.preflightSummary, 520),
    preDialogueAwarenessLine: sanitizeSecondPassProviderText(
      transportFailureAwarenessLine,
      SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
    ),
    awarenessLine: sanitizeSecondPassProviderText(
      transportFailureAwarenessLine ?? projectState.awarenessLine,
      SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
    ),
    preDialogueAwarenessSummary: sanitizeSecondPassProviderText(
      transportFailureAwarenessLine ?? projectState.preDialogueAwarenessSummary,
      SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
    ),
    latestLandedProgress: sanitizeSecondPassProviderText(projectState.latestLandedProgress, 520),
    primaryOpenLoop: sanitizeSecondPassProviderText(projectState.primaryOpenLoop, 520),
    nextClosureTarget: sanitizeSecondPassProviderText(projectState.nextClosureTarget, 520),
    sameHerSelfLine: sanitizeSecondPassProviderStructuredLine(projectState.sameHerSelfLine, 320),
    sameHerHoldDetail: sanitizeSecondPassProviderText(transportFailureContinuityFields.sameHerHoldDetail, 520),
    continuityArcStage: sanitizeSecondPassProviderText(transportFailureContinuityFields.continuityArcStage, 160),
    continuityCue: sanitizeSecondPassProviderText(transportFailureContinuityFields.continuityCue, 520),
    sameHerDriftRisk: sanitizeSecondPassProviderText(projectState.sameHerDriftRisk, 520),
  }
  return {
    fullText: JSON.stringify({
      ...buildAlicizationMindAuthoringFailureArtifact({
        stage: 'visible-reply-second-pass',
        reason,
        reasonCodes: ['visible-reply-second-pass-transport-failure'],
      }),
      relationshipTruthDoctrine,
      governedStructured: input.governedStructured
        ? {
            format: input.governedStructured.format ?? null,
            parsePath: input.governedStructured.parsePath ?? null,
            visibleReplyAuthority: input.governedStructured.visibleReplyAuthority ?? null,
          }
        : null,
      projectState: transportFailureProjectState,
    }),
    visibleReplyExecution: {
      ...input.previousExecution,
      mode: 'local-fallback' as const,
      actualVisibleReplyAuthority: 'local-deterministic-fallback' as const,
      providerMindExecuted: false,
      reason: 'visible-reply-second-pass-transport-failure',
    } satisfies AlicizationVisibleReplyExecution,
  }
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  }
  catch {
    return JSON.stringify(null)
  }
}

function safeProviderJson(value: unknown) {
  return safeJson(sanitizeSecondPassProviderPayload(value))
}

function sanitizeSecondPassDebugText(raw: unknown, maxChars = 720) {
  return sanitizeAlicizationStructuredInternalText(
    normalizeSecondPassProviderTemplateTokens(raw),
    maxChars,
    '',
  ) || null
}

function sanitizeSecondPassOutputMetadata(raw: unknown) {
  return sanitizeSecondPassProviderPayload(raw, 16_000)
}

function sanitizeSecondPassOutputRecord(raw: unknown) {
  const sanitized = sanitizeSecondPassOutputMetadata(raw)
  return sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)
    ? sanitized as Record<string, unknown>
    : null
}

function sanitizeSecondPassOutputProjectState(raw: unknown) {
  const sanitized = sanitizeSecondPassOutputMetadata(raw) as Record<string, unknown>
  if (typeof sanitized.sameHerSelfLine === 'string' && !/[=;]/u.test(sanitized.sameHerSelfLine))
    sanitized.sameHerSelfLine = null
  return sanitized
}

function normalizeStructuredObject(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function normalizeStructuredProjectState(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function readStructuredProjectStateAudit(structured: unknown) {
  if (!structured || typeof structured !== 'object')
    return null

  const visibleReplyRealization = (structured as { visibleReplyRealization?: unknown }).visibleReplyRealization
  const visibleReplyProjectStateAudit
    = visibleReplyRealization
      && typeof visibleReplyRealization === 'object'
      && (visibleReplyRealization as { projectStateAudit?: unknown }).projectStateAudit
      && typeof (visibleReplyRealization as { projectStateAudit?: unknown }).projectStateAudit === 'object'
      ? (visibleReplyRealization as { projectStateAudit: Record<string, unknown> }).projectStateAudit
      : null
  const topLevelProjectStateAudit = (structured as { projectStateAudit?: unknown }).projectStateAudit
  const normalizedTopLevelProjectStateAudit = topLevelProjectStateAudit && typeof topLevelProjectStateAudit === 'object'
    ? topLevelProjectStateAudit as Record<string, unknown>
    : null

  return visibleReplyProjectStateAudit ?? normalizedTopLevelProjectStateAudit
}

function normalizeVisibleReplyRewriteRequest(raw: unknown): AlicizationSecondPassRewriteRequestShape | null {
  const request = normalizeStructuredObject(raw)
  if (!request)
    return null

  return {
    required: request.required === true,
    authority: 'llm-second-pass-rewrite',
    reasonCodes: uniqueTextList(readStringList(request.reasonCodes), 24),
    mustPreserve: uniqueTextList(readStringList(request.mustPreserve), 24),
    mustDrop: uniqueTextList(readStringList(request.mustDrop), 24),
    openingGuidanceHoldDetail: sanitizeBoundedText(request.openingGuidanceHoldDetail, 120) || null,
    companionshipHoldMode:
      request.companionshipHoldMode === 'quiet-companionship'
      || request.companionshipHoldMode === 'measured-return'
      || request.companionshipHoldMode === 'repair-before-closeness'
      || request.companionshipHoldMode === 'rest-protective'
        ? request.companionshipHoldMode
        : null,
    surfaceContract: sanitizeBoundedText(request.surfaceContract, 400) || null,
    memoryTruthDiscipline: sanitizeBoundedText(request.memoryTruthDiscipline, 120) || null,
    fallbackPatternId: sanitizeBoundedText(request.fallbackPatternId, 120) || null,
  }
}

function uniqueTextList(values: unknown[], maxItems = 16) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeBoundedText(value, 220)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function isSecondPassMemoryOwnerMarker(value: string): value is SecondPassMemoryOwnerMarker {
  return SECOND_PASS_MEMORY_OWNER_MARKERS.includes(value as SecondPassMemoryOwnerMarker)
}

function compactSecondPassMemoryOwnerBlock(raw: string) {
  const lines = raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => sanitizeSecondPassDebugText(line, 520) ?? '')
    .filter(Boolean)
    .slice(0, 24)
  return sanitizeSecondPassDebugText(lines.join('\n'), SECOND_PASS_MEMORY_OWNER_BLOCK_MAX_CHARS) ?? ''
}

function extractSecondPassMemoryOwnerBlocks(raw: unknown) {
  const text = sanitizeText(raw, '').replace(/\r\n/g, '\n')
  if (!text)
    return []

  const matches = Array.from(text.matchAll(/\[(?:ALICIZATION_WORKING_MEMORY_OWNER|ALICIZATION_WORKING_MEMORY|ALICIZATION_RECALLED_MEMORY)\]/g))
  return matches
    .map((match, index) => {
      const marker = match[0]
      if (!isSecondPassMemoryOwnerMarker(marker))
        return null

      const start = match.index ?? 0
      const end = matches[index + 1]?.index ?? text.length
      const block = compactSecondPassMemoryOwnerBlock(text.slice(start, end))
      return block ? { marker, block } : null
    })
    .filter((value): value is { marker: SecondPassMemoryOwnerMarker, block: string } => Boolean(value))
}

function buildSecondPassMemoryOwnerEvidence(messages: Message[]) {
  const latestByMarker = new Map<SecondPassMemoryOwnerMarker, string>()

  for (const message of messages) {
    if (message?.role !== 'system')
      continue

    for (const section of extractSecondPassMemoryOwnerBlocks(message.content))
      latestByMarker.set(section.marker, section.block)
  }

  const evidence = SECOND_PASS_MEMORY_OWNER_MARKERS
    .map(marker => latestByMarker.get(marker))
    .filter((value): value is string => Boolean(value))
    .join('\n\n')

  return sanitizeSecondPassDebugText(evidence, SECOND_PASS_MEMORY_OWNER_EVIDENCE_MAX_CHARS) || '(none)'
}

function readStringList(raw: unknown) {
  return Array.isArray(raw)
    ? raw.filter((value): value is string => typeof value === 'string')
    : []
}

function hasLowerPressureOpeningRewriteReason(reasonCodes: string[]) {
  return reasonCodes.includes('opening-guidance-lower-pressure')
    || reasonCodes.includes('semantic-judge:continuity-lower-pressure-opening-drift')
}

function hasSameThreadRestartShellRewriteReason(reasonCodes: string[]) {
  return reasonCodes.includes('same-thread-restart-shell')
    || reasonCodes.includes('semantic-judge:continuity-same-thread-restart-shell')
}

function resolveSecondPassRewriteMustDrop(reasonCodes: string[]) {
  if (hasLowerPressureOpeningRewriteReason(reasonCodes))
    return ['continuity opening drift']
  if (reasonCodes.includes('dialogue-shell-opener'))
    return ['empty shell opener before payoff']
  if (reasonCodes.some(code => code.startsWith('visible-memory-gate-violation:')))
    return ['visible memory narration while memory gate is closed or inward-only']
  if (reasonCodes.includes('semantic-judge:corrected-same-person-progress-pressure-return'))
    return ['progress-recap fallback that overwrites a host-corrected same-person continuity line']
  if (reasonCodes.includes('execution-callback-room-first-violation'))
    return ['callback closeness overshoot after payoff']
  if (hasSameThreadRestartShellRewriteReason(reasonCodes))
    return ['same-thread continuation restart shell that reopens the current reply context as a fresh opening']
  if (reasonCodes.includes('held-autonomy-opening-shell'))
    return ['held-autonomy restart shell']
  return []
}

function resolveOpeningGuidanceHoldDetailForSecondPassRewrite(input: {
  reasonCodes: string[]
  reply: unknown
  openingGuidance?: unknown
  existingHoldDetail?: unknown
}) {
  const existingHoldDetail = typeof input.existingHoldDetail === 'string'
    ? sanitizeBoundedText(input.existingHoldDetail, 120)
    : ''
  if (existingHoldDetail)
    return existingHoldDetail

  if (!hasLowerPressureOpeningRewriteReason(input.reasonCodes))
    return null

  const reply = sanitizeText(input.reply)
  const openingGuidance = sanitizeBoundedText(input.openingGuidance, 400)
  if (!reply || !openingGuidance)
    return null

  const violationReason = resolveAlicizationOpeningGuidanceViolationReason({
    reply,
    openingGuidance,
  })
  if (violationReason !== 'proactive-opening-guidance-violation:lower-pressure')
    return null

  return resolveAlicizationOpeningGuidanceHoldDetail({
    reply,
    openingGuidance,
    openingGuidanceViolationReason: violationReason,
  })
}

function normalizeLowerText(raw: unknown, maxChars = 220) {
  return sanitizeBoundedText(raw, maxChars).toLowerCase()
}

function scoreProjectAwarenessLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return 0

  let score = scoreAlicizationProjectAwarenessLine(normalized)
  const carriesFixedTemplateResidue = containsAlicizationFixedTemplateResidue(normalized)
  const carriesStructuredProjectFact
    = /(?:^|\s\|\s)(?:identity|phase|landed|open|next|continuity_anchor|continuity_hold|continuity_drift_risk|proactive_gap|emotional_closure|status|summary)=/u.test(normalized)
      || /local_desktop_life_loop|open_loop=|project_state_continuity=|life_loop_continuity=|cross_modal_continuity_proof=|memory_dialogue_embodiment_closure|embedding_recall_reindex/u.test(normalized)

  if (carriesFixedTemplateResidue)
    score -= 8
  if (carriesStructuredProjectFact)
    score += 6
  if (!carriesFixedTemplateResidue && /current screen/u.test(normalized))
    score += 2
  if (looksLikeStrongEmbodimentClosureCarry(normalized))
    score += 5
  return score
}

function looksLikeStrongEmbodimentClosureCarry(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, SECOND_PASS_EMBODIMENT_CLOSURE_MAX_CHARS).toLowerCase()
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(normalized))
    return false

  if (carriesStructuredEmbodimentContinuityProof(normalized))
    return true

  return normalized.includes('living audio thread is still intact')
    || normalized.includes('still-voiced face-and-mouth line')
    || normalized.includes('still-voiced motion-and-mouth line')
    || normalized.includes('still-voiced face line')
    || normalized.includes('still-voiced motion line')
    || (
      normalized.includes('holding together mainly through body, lipsync, and voice')
      && normalized.includes('face and motion')
      && normalized.includes('cross-modal closure')
    )
}

function looksLikeExplicitProjectRepairAwareness(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('i need to remember this is still the same digital life project')
    || normalized.includes('before any local fluency takes over')
}

function looksLikeCallbackSpecificSameHerProjectAwareness(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, 400).toLowerCase()
  if (!normalized)
    return false
  if (containsAlicizationFixedTemplateResidue(normalized))
    return false
  if (isAlicizationThinProjectAwarenessLine(normalized))
    return false

  return /callback/u.test(normalized)
    && /same digital life|same her|same-her|same living line|closure seam|same closure line forward|one same her/u.test(normalized)
    && /phase 1|unfinished|still-open closure|still needs|landed|answer compilation|response-surface carry/u.test(normalized)
}

function pickStrongerProjectAwarenessLine(...values: Array<string | null | undefined>) {
  let best = ''
  let bestScore = 0

  for (const value of values) {
    const normalized = sanitizeBoundedText(value, SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS)
    if (!normalized)
      continue
    if (containsAlicizationFixedTemplateResidue(normalized))
      continue

    const score = scoreProjectAwarenessLine(normalized)
    if (score <= 0)
      continue
    if (!best || score > bestScore) {
      best = normalized
      bestScore = score
    }
  }

  return best
}

function resolveExecutionCallbackEmbodimentHandoffForRewrite(input: {
  prepared: AlicizationPreparedMainChatExecutionResult
  rewriteRequest: AlicizationSecondPassRewriteRequestShape | null
}) {
  const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(input.prepared.runtimeSurface)
  const personStateProjection = preferredRuntimeSurface?.memory?.personStateProjection ?? null
  const openingGuidance = normalizeLowerText(personStateProjection?.openingGuidance)
  const relationshipDoctrine = normalizeLowerText(personStateProjection?.relationshipDoctrine)
  const runtimeProjectState = resolvePreparedRuntimeProjectStateSnapshot(input.prepared)
  const rawRuntimeProjectState = (
    input.prepared.runtimeSurface?.digitalLifeRuntimeSurface?.raw as {
      runtimeDigest?: {
        projectState?: {
          companionHeadlineLine?: unknown
          preDialogueAwarenessLine?: unknown
          awarenessLine?: unknown
          preDialogueAwarenessSummary?: unknown
          nextClosureTarget?: unknown
          sameHerSelfLine?: unknown
        } | null
      } | null
    } | null | undefined
  )?.runtimeDigest?.projectState ?? null
  const projectAwarenessLine = normalizeLowerText(
    pickStrongerProjectAwarenessLine(
      runtimeProjectState?.companionHeadlineLine,
      runtimeProjectState?.preDialogueAwarenessLine,
      runtimeProjectState?.awarenessLine,
      runtimeProjectState?.preDialogueAwarenessSummary,
      sanitizeBoundedText(rawRuntimeProjectState?.companionHeadlineLine, SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS),
      sanitizeBoundedText(rawRuntimeProjectState?.preDialogueAwarenessLine, SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS),
      sanitizeBoundedText(rawRuntimeProjectState?.awarenessLine, SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS),
      sanitizeBoundedText(rawRuntimeProjectState?.preDialogueAwarenessSummary, SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS),
    ),
  )
  const projectEmbodimentContinuityCandidates = [
    runtimeProjectState?.companionHeadlineLine,
    runtimeProjectState?.preDialogueAwarenessLine,
    runtimeProjectState?.awarenessLine,
    runtimeProjectState?.preDialogueAwarenessSummary,
    rawRuntimeProjectState?.companionHeadlineLine,
    rawRuntimeProjectState?.preDialogueAwarenessLine,
    rawRuntimeProjectState?.awarenessLine,
    rawRuntimeProjectState?.preDialogueAwarenessSummary,
  ]
  const projectStrongEmbodimentCarryVisible = projectEmbodimentContinuityCandidates.some(candidate =>
    looksLikeStrongEmbodimentClosureCarry(sanitizeBoundedText(candidate, SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS)),
  )
  const projectNextClosureTarget = normalizeLowerText(
    runtimeProjectState?.nextClosureTarget
    ?? rawRuntimeProjectState?.nextClosureTarget,
  )
  const projectSameHerSelfLine = normalizeLowerText(
    runtimeProjectState?.sameHerSelfLine
    ?? rawRuntimeProjectState?.sameHerSelfLine,
  )
  const projectAudibleBodyCarryVisible
    = projectStrongEmbodimentCarryVisible
      || (
        !containsAlicizationFixedTemplateResidue(projectAwarenessLine)
        && (
          projectAwarenessLine.includes('living audio thread is still intact')
          || projectAwarenessLine.includes('still-voiced face-and-mouth line')
          || projectAwarenessLine.includes('still-voiced motion-and-mouth line')
          || projectAwarenessLine.includes('still-voiced face line')
          || projectAwarenessLine.includes('still-voiced motion line')
          || projectAwarenessLine.includes('audible-body')
          || projectAwarenessLine.includes('audible body')
          || (
            projectAwarenessLine.includes('holding together mainly through body, lipsync, and voice')
            && projectAwarenessLine.includes('face and motion')
            && projectAwarenessLine.includes('cross-modal closure')
          )
        )
      )
  const executionPayoffEmbodimentHandoff
    = (input.prepared.executionPayoffStructuredReply as {
      proactive?: {
        embodimentHandoff?: {
          residentMode?: unknown
          preferredBlinkCadence?: unknown
          preferredGazeMode?: unknown
          preferredPauseMode?: unknown
          preferredLipsyncMode?: unknown
          preferredVoiceMode?: unknown
          preferredPacingMode?: unknown
        } | null
      } | null
    } | null)?.proactive?.embodimentHandoff ?? null
  const reasonCodes = readStringList(input.rewriteRequest?.reasonCodes)

  const residentMode = sanitizeBoundedText(executionPayoffEmbodimentHandoff?.residentMode, 64)
  const preferredBlinkCadence = sanitizeBoundedText(executionPayoffEmbodimentHandoff?.preferredBlinkCadence, 64)
  const preferredGazeMode = sanitizeBoundedText(executionPayoffEmbodimentHandoff?.preferredGazeMode, 64)
  const preferredPauseMode = sanitizeBoundedText(executionPayoffEmbodimentHandoff?.preferredPauseMode, 64)
  const preferredLipsyncMode = sanitizeBoundedText(executionPayoffEmbodimentHandoff?.preferredLipsyncMode, 64)
  const preferredVoiceMode = sanitizeBoundedText(executionPayoffEmbodimentHandoff?.preferredVoiceMode, 64)
  const preferredPacingMode = sanitizeBoundedText(executionPayoffEmbodimentHandoff?.preferredPacingMode, 64)

  if (
    reasonCodes.includes('execution-callback-room-first-violation')
    && (
      openingGuidance.includes('repair settle')
      || relationshipDoctrine.includes('repair settle')
    )
  ) {
    return {
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    }
  }

  if (
    residentMode === 'repair-before-closeness'
    || (
      projectNextClosureTarget.includes('repair-before-closeness')
      && /local_desktop_life_loop|owner=project_state_governance|continuity_anchor=local_desktop_life_loop/u.test(projectSameHerSelfLine)
    )
  ) {
    return {
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: preferredBlinkCadence || 'quiet',
      preferredGazeMode: preferredGazeMode || 'soften',
      preferredPauseMode: preferredPauseMode || 'longer',
      preferredLipsyncMode: preferredLipsyncMode || 'restrained',
      preferredVoiceMode: preferredVoiceMode || 'lower-pressure',
      preferredPacingMode: preferredPacingMode || 'slower',
    }
  }

  if (
    residentMode === 'rest-protective'
    || (
      projectNextClosureTarget.includes('rest-protective')
      && /local_desktop_life_loop|owner=project_state_governance|continuity_anchor=local_desktop_life_loop/u.test(projectSameHerSelfLine)
    )
  ) {
    return {
      residentMode: 'rest-protective',
      preferredBlinkCadence: preferredBlinkCadence || 'quiet',
      preferredGazeMode: preferredGazeMode || 'soften',
      preferredPauseMode: preferredPauseMode || 'longer',
      preferredLipsyncMode: preferredLipsyncMode || 'restrained',
      preferredVoiceMode: preferredVoiceMode || 'lower-pressure',
      preferredPacingMode: preferredPacingMode || 'slower',
    }
  }

  if (
    hasLowerPressureOpeningRewriteReason(reasonCodes)
    || openingGuidance.includes('lower-pressure')
    || relationshipDoctrine.includes('lower-pressure')
    || residentMode === 'measured-return'
    || projectAudibleBodyCarryVisible
    || (
      projectNextClosureTarget.includes('measured-return')
      && (
        /local_desktop_life_loop|owner=project_state_governance|continuity_anchor=local_desktop_life_loop/u.test(projectAwarenessLine)
        || /local_desktop_life_loop|owner=project_state_governance|continuity_anchor=local_desktop_life_loop/u.test(projectSameHerSelfLine)
      )
    )
  ) {
    return {
      residentMode: 'measured-return',
      preferredBlinkCadence: preferredBlinkCadence || 'linger',
      preferredGazeMode: preferredGazeMode || 'soften',
      preferredPauseMode: preferredPauseMode || 'longer',
      preferredLipsyncMode: preferredLipsyncMode || 'restrained',
      preferredVoiceMode: preferredVoiceMode || 'lower-pressure',
      preferredPacingMode: preferredPacingMode || 'slower',
    }
  }

  return null
}

function hasSameThreadContinuationRewritePressure(input: {
  prepared: AlicizationPreparedMainChatExecutionResult
  rewriteRequest: AlicizationSecondPassRewriteRequestShape | null
  governance: AlicizationMindTurnGovernance | null
}) {
  const reasonCodes = readStringList(input.rewriteRequest?.reasonCodes)
  if (hasSameThreadRestartShellRewriteReason(reasonCodes))
    return true

  const surface = resolvePreferredPreparedRuntimeSurface(input.prepared.runtimeSurface)
  const tags = surface?.dialogue?.currentConsciousFrame?.reasonTags ?? []
  if (tags.includes('continuity-arc:same-thread-continuation'))
    return true

  const runtimeRestraint = normalizeLowerText(
    input.prepared.runtimeDigest?.continuityRestraint
    ?? surface?.agency?.initiative?.continuityRestraint
    ?? '',
  )
  const combined = [
    surface?.memory?.personStateProjection?.openingGuidance,
    surface?.agency?.initiative?.why,
    surface?.dialogue?.conversationState?.carryReason,
    input.governance?.openingMove,
  ]
    .map(value => normalizeLowerText(value))
    .filter(Boolean)
    .join(' | ')
  const sameThreadLanguage = /same callback line|same line|same thread|still live|already continuing|still continuing|same-thread-continuation|沿着刚才那条线|同一条线|callback 线继续/u.test(combined)
  const stayOnThread = /stay-on-thread|shared-attention-continuation|same-thread-continuation/u.test(combined)

  return (
    runtimeRestraint === 'measured-return'
    || runtimeRestraint === 'same-thread-continuation'
    || runtimeRestraint === 'repair-before-closeness'
    || runtimeRestraint === 'rest-protective'
  )
  && (sameThreadLanguage || stayOnThread)
}

function inferContinuityPreferredTimingForRewrite(input: {
  prepared: AlicizationPreparedMainChatExecutionResult
  governance: AlicizationMindTurnGovernance | null
}) {
  const surface = resolvePreferredPreparedRuntimeSurface(input.prepared.runtimeSurface)
  const runtimeRestraint = normalizeLowerText(
    input.prepared.runtimeDigest?.continuityRestraint
    ?? surface?.agency?.initiative?.continuityRestraint
    ?? '',
  )
  const combined = [
    surface?.memory?.personStateProjection?.openingGuidance,
    surface?.memory?.personStateProjection?.relationshipDoctrine,
    surface?.agency?.initiative?.why,
    surface?.dialogue?.conversationState?.carryReason,
    input.governance?.openingMove,
  ]
    .map(value => normalizeLowerText(value, 320))
    .filter(Boolean)
    .join(' | ')

  if (!combined)
    return null

  if (
    runtimeRestraint === 'repair-before-closeness'
    && /repair settle|repair-before-closeness|repair before closeness|before closeness widens|fresh closeness widening|do not reopen from zero|stay on the same callback repair line|先修复再靠近|先把身体收稳|修复优先/u.test(combined)
  ) {
    return 'next-open-window' as const
  }

  if (
    runtimeRestraint === 'rest-protective'
    && /rest protection|rest-protective|fatigue-aware|before warmth widens|before closeness widens|fresh warmth|fresh care opening|do not reopen from zero|stay on the same fatigue-aware callback line|先让休息保护 hold 住|先让休息保护撑住|先别把温度拉近|疲惫感先缓住/u.test(combined)
  ) {
    return 'next-open-window' as const
  }

  if (
    (runtimeRestraint === 'measured-return' || runtimeRestraint === 'same-thread-continuation')
    && /wait for a more natural opening|leave room before widening|stay lower-pressure|先留白|等更自然的 opening|等 opening 松一点/u.test(combined)
  ) {
    return 'next-open-window' as const
  }

  return null
}

function resolveProjectStateCarryInwardLineForRewrite(prepared: AlicizationPreparedMainChatExecutionResult) {
  const selfContinuityAuthority = resolvePreparedRuntimeSelfContinuityAuthority(prepared)
  const sourceTags = selfContinuityAuthority?.sourceTags ?? []
  if (!sourceTags.includes('project-state-carry'))
    return null

  const inwardLine = sanitizeBoundedText(selfContinuityAuthority?.inwardLine ?? null, 320)
  return inwardLine || null
}

function looksLikeSameHerProjectFollowThroughRewrite(prepared: AlicizationPreparedMainChatExecutionResult) {
  const latestUserText = normalizeLowerText(prepared.messages
    ?.slice()
    .reverse()
    .find(message => message?.role === 'user')
    ?.content ?? '', 400)
  const runtimeProjectState = resolvePreparedRuntimeProjectState(prepared)
  const runtimeEvidence = [
    runtimeProjectState?.identity,
    runtimeProjectState?.currentPhase,
    runtimeProjectState?.latestLandedProgress,
    runtimeProjectState?.primaryOpenLoop,
    runtimeProjectState?.nextClosureTarget,
    runtimeProjectState?.sameHerSelfLine,
    runtimeProjectState?.sameHerDriftRisk,
  ]
    .map(value => normalizeLowerText(value, 320))
    .filter(Boolean)
    .join(' | ')

  const continuationCue = /continue|carry on|follow-through|same line|same thread|继续|沿着.*同一条线|同一条线|别弄丢|不要重开/u.test(latestUserText)
  const combinedEvidence = `${latestUserText} ${runtimeEvidence}`
  const sameHerProjectCue = !containsAlicizationFixedTemplateResidue(combinedEvidence)
    && /same digital life|same-her|same her|same living line|one continuous her|phase 1|project line|数字生命项目|同一个她|同一个 her/u.test(combinedEvidence)
  const closureCue = /landed|progress|open loop|still open|next closure|closure|initiative|embodiment|memory|已落地|做到哪|闭环|没闭环/u.test(`${latestUserText} ${runtimeEvidence}`)

  return continuationCue && sameHerProjectCue && closureCue
}

function looksLikePhase1MemoryClosureFollowThroughRewrite(input: {
  prepared: AlicizationPreparedMainChatExecutionResult
  userText: string
}) {
  const latestUserText = normalizeLowerText(input.userText || (input.prepared.messages
    ?.slice()
    .reverse()
    .find(message => message?.role === 'user')
    ?.content ?? ''), 600)
  const runtimeProjectState = resolvePreparedRuntimeProjectState(input.prepared)
  const runtimeEvidence = [
    runtimeProjectState?.currentPhase,
    runtimeProjectState?.latestLandedProgress,
    runtimeProjectState?.primaryOpenLoop,
    runtimeProjectState?.nextClosureTarget,
    runtimeProjectState?.sameHerSelfLine,
  ]
    .map(value => normalizeLowerText(value, 360))
    .filter(value => !containsAlicizationFixedTemplateResidue(value))
    .filter(Boolean)
    .join(' | ')
  const combined = `${latestUserText} ${runtimeEvidence}`

  return /phase\s*1|phase1|local digital life|第一阶段/u.test(combined)
    && /记忆闭环|memory closure|memory still needs|记忆.*闭环|纯对话生命线|pure dialogue life line/u.test(combined)
    && /轻主动|low-pressure initiative|initiative|主动/u.test(combined)
    && /具身|body|voice|face|motion|lipsync|lip sync|声线|脸部|动作|口型|停顿/u.test(combined)
    && /不要重新报告项目|不要.*项目报告|without restarting a project report|do not restart a project report|not a project report/u.test(combined)
}

function buildPhase1MemoryClosureRewriteGuidance(input: {
  phase1MemoryClosureFollowThroughRewrite: boolean
}) {
  if (!input.phase1MemoryClosureFollowThroughRewrite)
    return '(none)'

  return [
    'phase1_memory_closure_follow_through=true',
    'project_report_restart=blocked',
    'visible_reply_authority=provider_authored',
    'memory_initiative_embodiment=evidence_only_when_relevant',
    'project_slogan_or_canned_self_description=blocked',
    'embodiment_answer_policy=concrete_active_modalities_or_pending_handoff_only',
    'internal_policy_explanation=blocked',
  ].join('\n')
}

function buildDialogueShellRewriteGuidance(input: {
  reasonCodes: string[]
}) {
  if (!input.reasonCodes.includes('dialogue-shell-opener'))
    return '(none)'

  return [
    'dialogue_shell_opener=blocked',
    'first_sentence=current_user_obligation',
    'empty_setup_lines=blocked',
    'memory_seed_turn=inward_until_invited',
    'first_clause=useful',
  ].join('\n')
}

function looksLikeSimpleGreetingOrPresenceTurn(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, 80).trim().toLowerCase()
  if (!normalized)
    return false

  const compact = normalized.replace(/[\s。！？!?,，、.．~～…]+/gu, '')
  if (!compact || compact.length > 24)
    return false

  return /^(?:你好|您好|嗨|哈喽|哈啰|在吗|你在吗|还在吗|你还在吗|我来了|早|早安|早上好|中午好|下午好|晚上好|晚安|hi|hey|hello|goodmorning|goodafternoon|goodevening|goodnight)$/iu.test(compact)
}

function containsProjectStateVisibleIntent(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, 240).toLowerCase()
  if (!normalized)
    return false
  if (looksLikeFixedTemplateComplaintIntent(normalized))
    return false

  return /alicization|project|phase\s*1|phase1|local-first|digital life|same-her|same her|same living line|same digital-life line|项目|阶段|第一阶段|数字生命|本地数字生命|同一个她|同一个 her|同一条线|连续性|闭环|做到哪|进度|还差什么/u.test(normalized)
}

function looksLikeFixedTemplateComplaintIntent(normalized: string) {
  const mentionsTemplateResidue = /fixed template|template residue|canned template|canned slogan|fixed slogan|模板|固定话术|固定口号|固定人格|套话|污染/u.test(normalized)
    || containsAlicizationFixedTemplateResidue(normalized)
  const asksToRemoveOrStop = /别再|不要再|别用|不要用|去掉|删掉|清掉|移除|清除|停用|stop|don't use|do not use|remove|delete|strip|clean/u.test(normalized)
  const namesTemplateToken = /same-her|same her|same living line|phase\s*1|local digital life|local-first digital life|one continuous her|同一个她|同一个 her|数字生命主线|女仆|maid/u.test(normalized)

  return mentionsTemplateResidue && asksToRemoveOrStop && namesTemplateToken
}

function containsExplicitSecondPassProjectStateIntent(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, 600).toLowerCase()
  if (!normalized)
    return false
  if (looksLikeFixedTemplateComplaintIntent(normalized))
    return false

  if (/alicization|project|phase\s*1|phase1|local-first|digital life|same-her|same her|project-state|project status|项目|项目状态|本地数字生命|数字生命项目|第一阶段|同一个她|同一个 her/u.test(normalized))
    return true

  const asksAboutState = /现在|当前|状态|进度|做到|完成|闭环|还差|缺什么|下一步|后面|可用|使用|测试|already|landed|progress|status|what remains|next/u.test(normalized)
  const namesMemoryLifeLoop = /短期记忆|长期记忆|工作记忆|语义召回|记忆中心|记忆.*闭环|人格.*闭环|具身.*闭环|主动性.*闭环|memory closure|working memory|long-term memory|semantic recall|persona continuity/u.test(normalized)
  return asksAboutState && namesMemoryLifeLoop
}

function looksLikeSecondPassDecorativePersonaShell(value: unknown) {
  const text = sanitizeBoundedText(value, 500)
  if (!text)
    return false

  return /主人|亲爱的|宝贝|呜|唔|嗯……|……$|随便聊聊.*安静陪着|安静陪着你|在这里陪着你的那一个|沿着同一条线慢慢长成|慢慢长成更完整的自己|\([^)]*(?:动作|靠近|眨眼|微笑|低头)[^)]*\)/u.test(text)
}

function reasonCodeNeedsVisibleContinuityOrProjectRepair(reasonCode: string) {
  return reasonCode.startsWith('semantic-judge:project-state-')
    || reasonCode.startsWith('semantic-judge:continuity-')
    || reasonCode.startsWith('semantic-judge:memory-')
    || reasonCode.startsWith('visible-memory-gate-violation:')
    || reasonCode.includes('execution')
    || reasonCode.includes('callback')
    || reasonCode.includes('autonomy')
    || reasonCode.includes('opening-guidance')
    || reasonCode.includes('same-thread-restart-shell')
    || reasonCode === 'held-autonomy-opening-shell'
    || reasonCode === 'mind-contract-not-closed'
}

function shouldUseNaturalPersonhoodTemplateRepair(input: {
  userText: string
  reasonCodes: string[]
  originalReply: unknown
}) {
  if (!looksLikeSimpleGreetingOrPresenceTurn(input.userText))
    return false
  if (containsProjectStateVisibleIntent(input.userText))
    return false
  if (input.reasonCodes.some(reasonCodeNeedsVisibleContinuityOrProjectRepair))
    return false

  return input.reasonCodes.includes('decorative-persona-template')
    || input.reasonCodes.includes('dialogue-shell-opener')
    || looksLikeSecondPassDecorativePersonaShell(input.originalReply)
}

function buildNaturalPersonhoodTemplateRepairGuidance(input: {
  enabled: boolean
}) {
  if (!input.enabled)
    return '(none)'

  return [
    'ordinary_dialogue_template_repair=true',
    'project_state_context=internal_audit_only_unless_explicitly_asked',
    'blocked_template_ids=same_living_line,local_digital_life_slogan,phase_status_slogan,quiet_availability_slogan,growth_slogan',
    'blocked_shells=fixed_availability,roleplay,pet_name,body_action',
    'visible_reply_source=current_host_text',
  ].join('\n')
}

function buildNaturalPersonhoodTemplateRepairProjectStatePrompt(projectState: ReturnType<typeof resolveSecondPassProjectState>) {
  return {
    contextUse: 'internal-audit-only',
    visibleReplyBoundary: 'ordinary_dialogue_project_slogan_surface=blocked',
    identityContext: 'single_runtime_identity',
    currentTurn: 'current_host_text_reply',
    auditContinuity: Boolean(projectState.identity || projectState.sameHerSelfLine),
  }
}

function buildNaturalPersonhoodTemplateRepairContractPrompt(input: {
  governance: AlicizationMindTurnGovernance | null
}) {
  return {
    mode: 'ordinary-dialogue-template-repair',
    answerIntent: input.governance?.answerIntent ?? null,
    openingMove: input.governance?.openingMove ?? null,
    focusAnchor: input.governance?.focusAnchor ?? null,
    visibleReplyBoundary: 'fixed_shell=blocked; project_state_slogan=blocked; reply_source=current_turn',
  }
}

function buildSecondPassProviderMindTurnContractPrompt(raw: unknown) {
  if (!raw || typeof raw !== 'object')
    return null

  const contract = raw as Record<string, unknown>
  const projectState = contract.projectState && typeof contract.projectState === 'object'
    ? contract.projectState as Record<string, unknown>
    : null
  const emotionalClosurePolicy = sanitizeBoundedText(contract.emotionalClosureCue, 400)
    ? 'emotional_closure=active; source_text=withheld_non_structured_instruction; visible_wording=false'
    : null

  return {
    version: sanitizeBoundedText(contract.version, 80) || null,
    answerAct: sanitizeBoundedText(contract.answerAct, 80) || null,
    turnMode: sanitizeBoundedText(contract.turnMode, 80) || null,
    responseMode: sanitizeBoundedText(contract.responseMode, 80) || null,
    evidenceMode: sanitizeBoundedText(contract.evidenceMode, 80) || null,
    openingStyle: sanitizeBoundedText(contract.openingStyle, 80) || null,
    expectedVisibleReplyAuthority: sanitizeBoundedText(contract.expectedVisibleReplyAuthority, 80) || null,
    replyRealizationMode: sanitizeBoundedText(contract.replyRealizationMode, 80) || null,
    personaKernelMode: sanitizeBoundedText(contract.personaKernelMode, 80) || null,
    labelCarryAsMemory: typeof contract.labelCarryAsMemory === 'boolean' ? contract.labelCarryAsMemory : null,
    suppressAssociativeRecall: typeof contract.suppressAssociativeRecall === 'boolean' ? contract.suppressAssociativeRecall : null,
    allowAffectionatePreface: typeof contract.allowAffectionatePreface === 'boolean' ? contract.allowAffectionatePreface : null,
    allowStageDirections: typeof contract.allowStageDirections === 'boolean' ? contract.allowStageDirections : null,
    allowBodyNarration: typeof contract.allowBodyNarration === 'boolean' ? contract.allowBodyNarration : null,
    maxParagraphs: typeof contract.maxParagraphs === 'number' ? contract.maxParagraphs : null,
    maxSentences: typeof contract.maxSentences === 'number' ? contract.maxSentences : null,
    answerIntent: sanitizeSecondPassProviderList([contract.answerIntent], 260).at(0) ?? null,
    openingMove: sanitizeSecondPassProviderList([contract.openingMove], 260).at(0) ?? null,
    governingFocus: sanitizeSecondPassProviderList([contract.governingFocus], 260).at(0) ?? null,
    relationshipTruthPolicy: formatRelationshipTruthDoctrineForRewrite(contract.relationshipTruthDoctrine),
    emotionalClosurePolicy,
    memorySurfacePolicy: 'memory_evidence_only; visible_wording=false',
    mustDo: sanitizeSecondPassProviderList(contract.mustDo, 260),
    mustNotDo: sanitizeSecondPassProviderList(contract.mustNotDo, 260),
    reasons: sanitizeSecondPassProviderList(contract.reasons, 260),
    projectState: projectState
      ? {
          preDialogueAwarenessLine: sanitizeSecondPassProviderStructuredLine(projectState.preDialogueAwarenessLine, 260),
          sameHerSelfLine: sanitizeSecondPassProviderStructuredLine(projectState.sameHerSelfLine, 260),
          sameHerHoldDetail: projectState.sameHerHoldDetail
            ? 'continuity_hold=present; source_text=withheld_non_structured_instruction; visible_wording=false'
            : null,
          continuityCue: projectState.continuityCue
            ? 'continuity_cue=present; source_text=withheld_non_structured_instruction; visible_wording=false'
            : null,
          continuityPreferredTiming: sanitizeBoundedText(projectState.continuityPreferredTiming, 80) || null,
        }
      : null,
    visibleWording: false,
  }
}

function looksLikeResumeConfirmationBoundaryHoldDetail(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, 360).toLowerCase()
  if (!normalized)
    return false

  const hasBoundaryAnchor
    = /execution-resume-confirmation|host-confirmed-before-redispatch|resume-before-dispatch|host-confirmed resume|host-confirmed/u.test(normalized)
  const hasBoundaryHold
    = /bounded confirmation boundary|another execution-shaped o|another execution-shaped opening/u.test(normalized)

  return hasBoundaryAnchor && hasBoundaryHold
}

function looksLikeResumeConfirmationBoundaryContinuityCue(value: string | null | undefined) {
  const normalized = sanitizeBoundedText(value, 360).toLowerCase()
  if (!normalized)
    return false

  const hasBoundaryAnchor
    = /host-confirmed-before-redispatch|resume-before-dispatch|bounded confirmation boundary|host-confirmed resume|host-confirmed/u.test(normalized)
  const hasBoundaryCue
    = /not permanent execution permission|generic autonomous continuation|permanent execution permission|reusable autonomous continuation|one confirmed resume|callback answer/u.test(normalized)

  return hasBoundaryAnchor && hasBoundaryCue
}

function buildProjectStateRewriteGuidance(input: {
  projectStateRewriteRequired: boolean
  projectStateSameHerRewriteRequired: boolean
  sameThreadContinuationRewriteGuidanceRequired: boolean
  sameHerProjectFollowThroughRewrite: boolean
  projectStateAnswerStancePreserveLine?: string | null
  projectStateSameHerSelfLine?: string | null
  projectStateSameHerHoldDetail?: string | null
  projectStateCarryInwardLine?: string | null
  projectStateContinuityCue?: string | null
  projectStateSameHerDriftRisk?: string | null
  projectStatePreDialogueAwarenessLine?: string | null
  projectStateContinuitySummary?: string | null
  projectStateEmbodimentClosureSummary?: string | null
  projectStateOpenFocusSummary?: string | null
  projectStateNextFocusSummary?: string | null
}) {
  if (!input.projectStateRewriteRequired)
    return '(none)'

  const resumeConfirmationBoundaryHoldDetail = looksLikeResumeConfirmationBoundaryHoldDetail(input.projectStateSameHerHoldDetail)
    ? 'resume_confirmation_boundary=bounded_before_redispatch'
    : ''
  const resumeConfirmationBoundaryContinuityCue = looksLikeResumeConfirmationBoundaryContinuityCue(input.projectStateContinuityCue)
    ? 'permanent_execution_permission_from_single_resume=blocked'
    : ''

  return [
    input.projectStateSameHerRewriteRequired
      ? 'project_state_question=true; prior_visible_answer=missing_required_continuity_facts'
      : input.sameHerProjectFollowThroughRewrite
        ? 'project_context_follow_through=true; prior_visible_answer=missing_landed_progress_or_open_closure'
        : 'project_state_question=true; prior_visible_answer=missing_closure_truth',
    'detached_status_summary=blocked',
    'roadmap_report=blocked',
    'project_shell=blocked',
    'settlement_surface=visible_reply_text_only',
    'project_state_facts_policy=relevant_to_host_request_only',
    'inward_context_cannot_satisfy_visible_requirements=true',
    'stored_continuity_slogans=do_not_quote_or_paraphrase',
    input.sameHerProjectFollowThroughRewrite
      ? 'current_context_follow_through=true; project_explanation_restart=blocked; generic_companionship=blocked'
      : '',
    input.projectStateSameHerRewriteRequired
      ? 'first_sentence=current_turn_answer; external_dashboard_narrator=blocked'
      : '',
    input.projectStateSameHerRewriteRequired && input.projectStateAnswerStancePreserveLine
      ? formatSecondPassProviderEvidenceContext('project_state_answer_stance', input.projectStateAnswerStancePreserveLine, 360)
      : '',
    input.projectStateSameHerRewriteRequired && input.projectStateSameHerSelfLine
      ? formatSecondPassProviderEvidenceContext('continuity_field_context', input.projectStateSameHerSelfLine, 320)
      : '',
    resumeConfirmationBoundaryHoldDetail,
    resumeConfirmationBoundaryContinuityCue,
    input.projectStateSameHerRewriteRequired && input.projectStateCarryInwardLine
      ? formatSecondPassProviderEvidenceContext('project_carry_inward', input.projectStateCarryInwardLine, 520)
      : '',
    input.projectStateSameHerRewriteRequired && input.projectStateSameHerDriftRisk
      ? formatSecondPassProviderEvidenceContext('continuity_drift_risk_boundary', input.projectStateSameHerDriftRisk, 520)
      : '',
    input.projectStateSameHerRewriteRequired && input.projectStateSameHerDriftRisk
      ? 'first_sentence=status_roadmap_progress_opening_blocked'
      : '',
    input.projectStateSameHerRewriteRequired && input.projectStateSameHerDriftRisk
      ? 'template_project_recap=blocked; detached_framing=blocked; dashboard_cadence=blocked'
      : '',
    input.projectStatePreDialogueAwarenessLine
      ? formatSecondPassProviderEvidenceContext('pre_dialogue_project_awareness_context', input.projectStatePreDialogueAwarenessLine, 800)
      : '',
    input.projectStateContinuitySummary
      ? formatSecondPassProviderEvidenceContext('project_continuity_audit_context', input.projectStateContinuitySummary, 800)
      : '',
    input.projectStateOpenFocusSummary
      ? formatSecondPassProviderEvidenceContext('open_focus', input.projectStateOpenFocusSummary, 220)
      : '',
    input.projectStateNextFocusSummary
      ? formatSecondPassProviderEvidenceContext('next_focus', input.projectStateNextFocusSummary, 220)
      : '',
    input.projectStateEmbodimentClosureSummary
      ? formatSecondPassProviderEvidenceContext('embodiment_closure_context', input.projectStateEmbodimentClosureSummary, 800)
      : '',
    input.projectStateSameHerRewriteRequired && input.sameThreadContinuationRewriteGuidanceRequired
      ? 'project_state_answer_restart=blocked; fresh_report_opening=blocked'
      : '',
    'project_identity_phase_progress_open_closure=current_turn_facts_not_dashboard_recital',
  ].join('\n')
}

function buildCorrectedSamePersonRewriteGuidance(input: {
  reasonCodes: string[]
  mustPreserve: string[]
  projectStateCarryInwardLine?: string | null
}) {
  if (!input.reasonCodes.includes('semantic-judge:corrected-same-person-progress-pressure-return'))
    return '(none)'

  const correctedContinuityAuthorityLine = input.mustPreserve.find((value) => {
    const normalized = sanitizeBoundedText(value, 320).toLowerCase()
    return normalized.includes('host-corrected same-person continuity')
      || (
        normalized.includes('corrected same-person continuity')
        && (
          normalized.includes('progress-style continuation')
          || normalized.includes('status recap')
        )
      )
  }) ?? null
  const correctedContinuityCarryLine = input.mustPreserve.find((value) => {
    const normalized = sanitizeBoundedText(value, 320).toLowerCase()
    return normalized.includes('carry corrected same-person continuity forward')
      || (
        normalized.includes('corrected same-person continuity')
        && normalized.includes('before any status recap')
      )
  }) ?? null

  return [
    'host_corrected_same_person_continuity=true',
    'progress_recap_status_update_goal_summary_shell=blocked',
    'first_sentence=status_first_narration_blocked',
    'local_implementation_progress=after_current_answer_only',
    correctedContinuityAuthorityLine
      ? 'corrected_continuity_authority=present; source_text=withheld_non_structured_instruction; visible_wording=false'
      : '',
    correctedContinuityCarryLine
      ? 'corrected_continuity_carry=present; source_text=withheld_non_structured_instruction; visible_wording=false'
      : '',
    input.projectStateCarryInwardLine
      ? formatSecondPassProviderEvidenceContext('project_state_carry_inward', input.projectStateCarryInwardLine, 520)
      : '',
  ].filter(Boolean).join('\n')
}

function resolveOutwardContinuityRewriteGuidance(input: {
  governance: AlicizationMindTurnGovernance | null
  prepared: AlicizationPreparedMainChatExecutionResult
  mustPreserve: string[]
}) {
  const mindTurnContract = input.prepared.mindTurnContract ?? null
  const candidates = uniqueTextList([
    ...(mindTurnContract?.reasons ?? []),
    ...(mindTurnContract?.mustDo ?? []),
    ...(mindTurnContract?.mustNotDo ?? []),
    ...(input.governance?.mustDo ?? []),
    ...(input.governance?.mustNotDo ?? []),
    ...input.mustPreserve,
  ], 24)

  const outwardContinuityReason
    = candidates.find((candidate) => {
      if (containsAlicizationFixedTemplateResidue(candidate))
        return false
      const normalized = candidate.toLowerCase()
      return normalized.includes('durable outward continuity')
        || (
          normalized.includes('same living line')
          && normalized.includes('restarting the relationship from zero')
        )
    }) ?? null
  const outwardContinuityMustDo
    = candidates.find((candidate) => {
      if (containsAlicizationFixedTemplateResidue(candidate))
        return false
      const normalized = candidate.toLowerCase()
      return normalized.includes('durable same-her cadence')
        || (
          normalized.includes('same living line')
          && normalized.includes('across quiet, memory, and speech')
        )
    }) ?? null
  const outwardContinuityMustNotDo
    = candidates.find((candidate) => {
      if (containsAlicizationFixedTemplateResidue(candidate))
        return false
      const normalized = candidate.toLowerCase()
      return (
        normalized.includes('reopen from scratch')
        || normalized.includes('fresh-opening shell')
      ) && (
        normalized.includes('generic helper voice')
        || normalized.includes('same-her cadence')
        || normalized.includes('same living line')
      )
    }) ?? null

  if (!outwardContinuityReason && !outwardContinuityMustDo && !outwardContinuityMustNotDo)
    return '(none)'

  return [
    'outward_continuity_evidence=present; restart_reset_helper_shell=blocked',
    outwardContinuityReason
      ? 'outward_continuity_reason=present; source_text=withheld_non_structured_instruction; visible_wording=false'
      : '',
    outwardContinuityMustDo
      ? 'outward_continuity_must_do=continue_current_context; source_text=withheld_non_structured_instruction; visible_wording=false'
      : '',
    outwardContinuityMustNotDo
      ? 'outward_continuity_must_not_do=restart_or_fresh_shell_blocked; source_text=withheld_non_structured_instruction; visible_wording=false'
      : '',
    'first_sentence=current_context_answer; fresh_narrator_opening=blocked',
  ].filter(Boolean).join('\n')
}

function buildForcedSecondPassRewriteRequest(reasonCodes?: string[]): AlicizationSecondPassRewriteRequestShape {
  const normalizedReasonCodes = (reasonCodes ?? [])
    .map(code => sanitizeBoundedText(code, 120))
    .filter(Boolean)
  const mustDrop = resolveSecondPassRewriteMustDrop(normalizedReasonCodes)

  return {
    required: true,
    authority: 'llm-second-pass-rewrite' as const,
    reasonCodes: normalizedReasonCodes.length > 0
      ? normalizedReasonCodes
      : ['forced-visible-reply-second-pass'],
    mustPreserve: [],
    mustDrop,
    openingGuidanceHoldDetail: hasLowerPressureOpeningRewriteReason(normalizedReasonCodes)
      ? 'generic-availability-shell'
      : null,
    surfaceContract: null,
    memoryTruthDiscipline: null,
    fallbackPatternId: null,
  }
}

function buildForcedOriginalStructuredDraft(input: {
  rawFullText: string
  forceReasonCodes?: string[]
}) {
  const rawDraft = sanitizeText(input.rawFullText).slice(0, 2_000)
  return {
    format: 'mind-turn-v1',
    thought: 'forced_second_pass_input=unstructured_visible_draft; rule_layer_must_not_author_visible_reply',
    emotion: 'thinking',
    reply: rawDraft,
    performance: {
      baseEmotion: 'thinking',
      facialCue: null,
      actionCue: null,
      delivery: 'calm',
      emphasis: 0,
    },
    visibleReplyAuthority: 'llm-second-pass-rewrite',
    visibleReplyRewriteRequest: buildForcedSecondPassRewriteRequest([
      'unstructured-visible-draft',
      ...(input.forceReasonCodes ?? []),
    ]),
    parsePath: 'forced-unstructured-visible-draft',
    formatBeforeRewrite: null,
    contractFailed: true,
  }
}

function buildCandidateConversationTurn(input: {
  rawStructured: Record<string, unknown>
  prepared: AlicizationPreparedMainChatExecutionResult
  sessionId?: string | null
  turnId: string
  userText: string
}) {
  const reply = sanitizeText(input.rawStructured.reply)
  return {
    turnId: input.turnId,
    sessionId: input.sessionId ?? input.prepared.conversationSessionId ?? 'runtime-second-pass',
    userText: input.userText,
    assistantText: reply,
    structured: input.rawStructured,
    governance: input.prepared.governance ?? input.prepared.runtimeSurface.governance ?? null,
    createdAt: Date.now(),
  } satisfies AlicizationConversationTurnInput
}

function buildSecondPassRewriteMessages(input: {
  prepared: AlicizationPreparedMainChatExecutionResult
  userText: string
  originalStructured: Record<string, unknown>
  governedStructured: Record<string, unknown>
  governance: AlicizationMindTurnGovernance | null
  mustPreserve?: string[]
}) {
  const rewriteRequest = normalizeVisibleReplyRewriteRequest(input.governedStructured.visibleReplyRewriteRequest)
  const governance = input.governance
  const rewriteReasonCodes = rewriteRequest?.reasonCodes ?? []
  const naturalPersonhoodTemplateRepair = shouldUseNaturalPersonhoodTemplateRepair({
    userText: input.userText,
    reasonCodes: rewriteReasonCodes,
    originalReply: input.originalStructured.reply,
  })
  const projectState = resolveSecondPassProjectState({
    prepared: input.prepared,
  })
  const projectStateContinuityFields = resolveSecondPassProjectStateContinuityFields({
    prepared: input.prepared,
    projectState,
  })
  const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(input.prepared.runtimeSurface)
  const currentConsciousFrameSubject = sanitizeBoundedText(
    preferredRuntimeSurface?.dialogue?.currentConsciousFrame?.subject ?? null,
    120,
  )
  const currentConsciousFrameReasonTags = preferredRuntimeSurface?.dialogue?.currentConsciousFrame?.reasonTags ?? []
  const runtimeProjectStateIntent = currentConsciousFrameSubject === 'project-state'
    || currentConsciousFrameReasonTags.includes('project-state')
  const projectStateReasonCodes = rewriteReasonCodes
  const projectStateSameHerRewriteRequired = projectStateReasonCodes.includes('semantic-judge:project-state-same-her-missing')
  const projectStateRewriteRequired = projectStateReasonCodes.some(reasonCode =>
    typeof reasonCode === 'string' && reasonCode.startsWith('semantic-judge:project-state-'),
  )
  const sameHerProjectFollowThroughRewrite = looksLikeSameHerProjectFollowThroughRewrite(input.prepared)
  const phase1MemoryClosureFollowThroughRewrite = looksLikePhase1MemoryClosureFollowThroughRewrite({
    prepared: input.prepared,
    userText: input.userText,
  })
  const includeFullProjectStateContext = !naturalPersonhoodTemplateRepair && (
    containsExplicitSecondPassProjectStateIntent(input.userText)
    || runtimeProjectStateIntent
    || projectStateRewriteRequired
    || projectStateSameHerRewriteRequired
    || phase1MemoryClosureFollowThroughRewrite
  )
  const projectStateSystemMessages = includeFullProjectStateContext
    ? buildSecondPassCanonicalProjectStateSystemMessages({
        projectState,
        continuityFields: projectStateContinuityFields,
      })
    : []
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const projectStateClosureDashboard = includeFullProjectStateContext
    ? buildAlicizationProviderFacingProjectStateClosureDashboard({
        brief: {
          ...projectStateBrief,
          currentPhase: projectState.currentPhase,
          continuityProgressSummary: projectState.latestLandedProgress ?? projectStateBrief.continuityProgressSummary,
          openLoops: projectState.primaryOpenLoop ? [projectState.primaryOpenLoop] : projectStateBrief.openLoops,
          nextClosureTarget: projectState.nextClosureTarget,
        },
      })
    : null
  const inwardOnlyMemoryGateRewriteRequired = rewriteReasonCodes.includes('visible-memory-gate-violation:inward-only')
  const hasRoomFirstViolation = rewriteReasonCodes.includes('execution-callback-room-first-violation')
  const openingGuidanceBlockedReason = buildAlicizationOpeningGuidanceBlockedReason(
    hasLowerPressureOpeningRewriteReason(rewriteReasonCodes) || hasRoomFirstViolation
      ? 'proactive-opening-guidance-violation:lower-pressure'
      : null,
  )
  const continuityReasonTags = currentConsciousFrameReasonTags
  const explicitContinuityPreferredTiming = sanitizeBoundedText(
    preferredRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.continuityPreferredTiming
    ?? input.prepared.mindTurnContract?.projectState?.continuityPreferredTiming
    ?? null,
    80,
  )
  const inferredContinuityPreferredTiming = inferContinuityPreferredTimingForRewrite({
    prepared: input.prepared,
    governance,
  })
  const continuityPreferredTiming = continuityReasonTags.includes('continuity-timing:next-open-window')
    ? 'next-open-window'
    : rewriteReasonCodes.includes('semantic-judge:continuity-next-open-window-early-widening')
      ? 'next-open-window'
      : continuityReasonTags.includes('continuity-timing:after-payoff')
        ? 'after-payoff'
        : rewriteReasonCodes.includes('semantic-judge:continuity-after-payoff-early-widening')
          ? 'after-payoff'
          : continuityReasonTags.includes('continuity-timing:same-turn-if-invited')
            ? 'same-turn-if-invited'
            : explicitContinuityPreferredTiming
              || inferredContinuityPreferredTiming
  const openingGuidanceRewriteGuidance = describeAlicizationOpeningGuidanceRewriteGuidance({
    blockedReason: openingGuidanceBlockedReason,
    openingGuidanceHoldDetail: rewriteRequest?.openingGuidanceHoldDetail ?? null,
  })
  const sameThreadContinuationRewriteGuidanceRequired = hasSameThreadContinuationRewritePressure({
    prepared: input.prepared,
    rewriteRequest,
    governance,
  })
  const visibleSameThreadContinuationRewriteGuidanceRequired = sameThreadContinuationRewriteGuidanceRequired && !naturalPersonhoodTemplateRepair
  const executionCallbackEmbodimentHandoff = naturalPersonhoodTemplateRepair
    ? null
    : resolveExecutionCallbackEmbodimentHandoffForRewrite({
        prepared: input.prepared,
        rewriteRequest,
      })
  const projectStateAudit
    = readStructuredProjectStateAudit(input.originalStructured)
      ?? (input.prepared.replyRealization as { projectStateAudit?: Record<string, unknown> | null } | null | undefined)?.projectStateAudit
      ?? null
  const emotionalClosureCue = preferRicherProjectStateAuditText({
    current: input.prepared.mindTurnContract?.emotionalClosureCue,
    candidate: projectStateAudit?.emotionalClosureSummary,
  }) || ''
  const providerSafeEmotionalClosureCue = sanitizeSecondPassProviderText(emotionalClosureCue, 520)
  const emotionalClosureCueNormalized = emotionalClosureCue.toLowerCase()
  const emotionalClosureCueHasFixedTemplateResidue = containsAlicizationFixedTemplateResidue(emotionalClosureCue)
  const emotionalClosurePrefersLowPressure = emotionalClosureCueNormalized.includes('low-pressure')
    || emotionalClosureCueNormalized.includes('lower-pressure')
    || emotionalClosureCueNormalized.includes('leave more room')
    || emotionalClosureCueNormalized.includes('轻一点')
    || emotionalClosureCueNormalized.includes('放轻')
  const emotionalClosureAvoidsRestart = !emotionalClosureCueHasFixedTemplateResidue
    && (
      emotionalClosureCueNormalized.includes('do not reopen from scratch')
      || emotionalClosureCueNormalized.includes('without reopening from scratch')
      || emotionalClosureCueNormalized.includes('不要重新开')
      || emotionalClosureCueNormalized.includes('不要从头重开')
    )
  const directPreparedProjectState = resolvePreparedRuntimeProjectState(input.prepared)
  const carriedProjectAwarenessSummary = sanitizeBoundedText(
    projectStateAudit?.preDialogueAwarenessSummary ?? null,
    SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
  ) || null
  const runtimeProjectAwarenessLine = sanitizeBoundedText(
    projectState.preDialogueAwarenessLine ?? null,
    SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
  ) || null
  const preparedRuntimeProjectAwarenessSummary = sanitizeBoundedText(
    resolvePreparedRuntimeProjectPreDialogueAwarenessSummary(input.prepared),
    SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
  ) || null
  const runtimeProjectCompanionHeadlineLine = sanitizeBoundedText(
    projectState.companionHeadlineLine ?? null,
    SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
  ) || null
  const directPreparedCompanionHeadlineLine = sanitizeBoundedText(
    directPreparedProjectState?.companionHeadlineLine ?? null,
    SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS,
  ) || null
  const preferredProjectAwarenessLine = pickStrongerProjectAwarenessLine(
    preparedRuntimeProjectAwarenessSummary,
    runtimeProjectAwarenessLine,
    carriedProjectAwarenessSummary,
  )
  const projectStatePreDialogueAwarenessLine
    = (
      projectStateSameHerRewriteRequired
      && carriedProjectAwarenessSummary
      && looksLikeExplicitProjectRepairAwareness(carriedProjectAwarenessSummary)
      && !looksLikeExplicitProjectRepairAwareness(preparedRuntimeProjectAwarenessSummary)
      && !looksLikeExplicitProjectRepairAwareness(preferredProjectAwarenessLine)
    )
      ? carriedProjectAwarenessSummary
      : preferredProjectAwarenessLine || (
        preparedRuntimeProjectAwarenessSummary || ((
          projectStateSameHerRewriteRequired
          && carriedProjectAwarenessSummary
        )
          ? carriedProjectAwarenessSummary
          : runtimeProjectAwarenessLine)
      )
  const projectStateEmbodimentClosureSummary
    = sanitizeBoundedText(
      projectStateAudit?.embodimentClosureSummary ?? null,
      SECOND_PASS_EMBODIMENT_CLOSURE_MAX_CHARS,
    )
    || (looksLikeStrongEmbodimentClosureCarry(runtimeProjectCompanionHeadlineLine)
      ? runtimeProjectCompanionHeadlineLine
      : null)
    || (looksLikeStrongEmbodimentClosureCarry(directPreparedCompanionHeadlineLine)
      ? directPreparedCompanionHeadlineLine
      : null)
    || null
  const mergedMustPreserve = uniqueTextList([
    ...readStringList(rewriteRequest?.mustPreserve),
    ...(input.mustPreserve ?? []),
  ])
  const projectStateAnswerStancePreserveLine = resolveProjectStateAnswerStancePreserveLine(mergedMustPreserve)
  const projectStateCarryInwardLine = resolveProjectStateCarryInwardLineForRewrite(input.prepared)
  const providerSafeRewriteRequest = rewriteRequest
    ? {
        ...rewriteRequest,
        mustPreserve: sanitizeSecondPassProviderList(rewriteRequest.mustPreserve, 360),
        mustDrop: sanitizeSecondPassProviderList(rewriteRequest.mustDrop, 360),
        surfaceContract: sanitizeSecondPassProviderText(rewriteRequest.surfaceContract, 360),
      }
    : null
  const providerSafeProjectState = {
    identity: sanitizeSecondPassProviderText(projectState.identity, 320),
    currentPhase: sanitizeSecondPassProviderText(projectState.currentPhase, 240),
    latestLandedProgress: sanitizeSecondPassProviderText(projectState.latestLandedProgress, 520),
    primaryOpenLoop: sanitizeSecondPassProviderText(projectState.primaryOpenLoop, 520),
    nextClosureTarget: sanitizeSecondPassProviderText(projectState.nextClosureTarget, 520),
    sameHerSelfLine: sanitizeSecondPassProviderStructuredLine(projectState.sameHerSelfLine, 240),
    companionHeadlineLine: sanitizeSecondPassProviderText(projectState.companionHeadlineLine, 520),
    companionBriefingLine: sanitizeSecondPassProviderText(projectState.companionBriefingLine, 520),
    preDialogueAwarenessLine: sanitizeSecondPassProviderText(projectStatePreDialogueAwarenessLine, SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS),
    sameHerDriftRisk: sanitizeSecondPassProviderText(projectState.sameHerDriftRisk, 520),
  }
  const providerSafeProjectStateContinuityFields = {
    sameHerHoldDetail: projectStateContinuityFields.sameHerHoldDetail
      ? 'continuity_hold=present; source_text=withheld_non_structured_instruction; visible_wording=false'
      : null,
    continuityArcStage: sanitizeSecondPassProviderText(projectStateContinuityFields.continuityArcStage, 160),
    continuityCue: projectStateContinuityFields.continuityCue
      ? 'continuity_cue=present; source_text=withheld_non_structured_instruction; visible_wording=false'
      : null,
  }
  const providerSafeProjectStateEmbodimentClosureSummary = sanitizeSecondPassProviderText(
    projectStateEmbodimentClosureSummary,
    SECOND_PASS_EMBODIMENT_CLOSURE_MAX_CHARS,
  )
  const providerSafeProjectStateCarryInwardLine = projectStateCarryInwardLine
    ? 'project_state_carry_inward=present; source_text=withheld_non_structured_instruction; visible_wording=false'
    : null
  const providerSafeProjectStateAnswerStancePreserveLine = projectStateAnswerStancePreserveLine
    ? 'project_state_answer_stance=present; source_text=withheld_non_structured_instruction; visible_wording=false'
    : null
  const providerSafeProjectStateSameHerDriftRisk = sanitizeSecondPassProviderText(
    sanitizeBoundedText(projectStateAudit?.sameHerDriftRiskSummary ?? null, 320)
    || projectState.sameHerDriftRisk,
    520,
  )
  const outwardContinuityRewriteGuidance = resolveOutwardContinuityRewriteGuidance({
    governance,
    prepared: input.prepared,
    mustPreserve: sanitizeSecondPassProviderList(mergedMustPreserve, 320),
  })
  const relationshipTruthDoctrineLine = formatRelationshipTruthDoctrineForRewrite(
    input.prepared.mindTurnContract?.relationshipTruthDoctrine,
  )
  const correctedSamePersonRewriteGuidance = buildCorrectedSamePersonRewriteGuidance({
    reasonCodes: projectStateReasonCodes,
    mustPreserve: sanitizeSecondPassProviderList(mergedMustPreserve, 320),
    projectStateCarryInwardLine: providerSafeProjectStateCarryInwardLine,
  })
  const executionResumeConfirmationBoundaryHoldDetail = looksLikeResumeConfirmationBoundaryHoldDetail(
    projectStateContinuityFields.sameHerHoldDetail,
  )
    ? 'remembered_host_confirmed_resume=bounded_confirmation_boundary; next_execution_opening=requires_fresh_boundary'
    : ''
  const executionResumeConfirmationBoundaryContinuityCue = looksLikeResumeConfirmationBoundaryContinuityCue(
    projectStateContinuityFields.continuityCue,
  )
    ? 'permanent_execution_permission=blocked; reusable_autonomous_continuation=blocked; source=single_confirmed_resume'
    : ''
  const memoryOwnerEvidence = buildSecondPassMemoryOwnerEvidence(input.prepared.messages)
  const projectStatePayloadLines = includeFullProjectStateContext
    ? [
        '[ALICIZATION_PROJECT_STATE]',
        safeProviderJson(
          naturalPersonhoodTemplateRepair
            ? buildNaturalPersonhoodTemplateRepairProjectStatePrompt(projectState)
            : {
                identity: providerSafeProjectState.identity,
                currentPhase: providerSafeProjectState.currentPhase,
                latestLandedProgress: providerSafeProjectState.latestLandedProgress,
                primaryOpenLoop: providerSafeProjectState.primaryOpenLoop,
                nextClosureTarget: providerSafeProjectState.nextClosureTarget,
                sameHerSelfLine: providerSafeProjectState.sameHerSelfLine,
                ...(providerSafeProjectState.companionHeadlineLine
                  ? { companionHeadlineLine: providerSafeProjectState.companionHeadlineLine }
                  : {}),
                ...(providerSafeProjectState.companionBriefingLine
                  ? { companionBriefingLine: providerSafeProjectState.companionBriefingLine }
                  : {}),
                ...(providerSafeProjectStateContinuityFields.sameHerHoldDetail
                  ? { sameHerHoldDetail: providerSafeProjectStateContinuityFields.sameHerHoldDetail }
                  : {}),
                ...(providerSafeProjectStateContinuityFields.continuityArcStage
                  ? { continuityArcStage: providerSafeProjectStateContinuityFields.continuityArcStage }
                  : {}),
                ...(providerSafeProjectStateContinuityFields.continuityCue
                  ? { continuityCue: providerSafeProjectStateContinuityFields.continuityCue }
                  : {}),
              },
        ),
        '',
        sanitizeSecondPassProviderBlock(projectStateClosureDashboard ?? '(none)', SECOND_PASS_PROJECT_AWARENESS_MAX_CHARS),
      ]
    : [
        '[PROJECT_STATE_CONTEXT_BOUNDARY]',
        'full_project_dashboard_context=withheld; rewrite_scope=ordinary_dialogue',
        'evidence_priority=memory_owner_evidence,current_turn_governance,latest_host_text',
        'project_status_synthesis=blocked_unless_explicit_host_request; closure_dashboard_language=blocked_unless_explicit_host_request; continuity_slogans=blocked',
      ]
  const system = [
    '[ALICIZATION_SECOND_PASS_VISIBLE_REPLY_REWRITE]',
    'visible_reply_repair=provider_authored',
    'normal_visible_reply_from_rule_layer=blocked',
    'corrected_reply_source=current_turn_evidence_and_constraints',
    includeFullProjectStateContext
      ? 'project_state_context=sanitized_facts_only; project_slogans=blocked'
      : 'ordinary_dialogue_rewrite=true; current_user_obligation_and_memory_owner_evidence=primary; project_status_unless_explicit=blocked',
    `project_state_question=${includeFullProjectStateContext ? 'true' : 'false'}`,
    'internal_control_visible_wording=false',
    'output_contract=json_object; allowed_keys=format,thought,emotion,reply,performance; extra_keys=blocked',
    'required_field=format; required_value=mind-turn-v1',
    'reply_authority=provider_authored; policy_explanation=blocked; template_shell=blocked.',
    'hidden_internal_terms=second_pass,rewrite,governance,fallback,contract,json,provider,internal_rules',
    'fixed_shell_openers=blocked; empty_setup_lines=blocked',
    'must_drop_copy=blocked; unsupported_specificity=blocked',
    'current_user_obligation=preserve; safe_must_preserve=preserve',
    'insufficient_evidence_policy=natural_uncertainty; invented_screen_file_class_app_details=blocked',
    'performance_baseEmotion_source=emotion',
  ].join('\n')

  const user = [
    'task=visible_reply_repair_now',
    '',
    '[LATEST_USER_TEXT]',
    sanitizeSecondPassProviderBlock(input.userText || '(empty)', 1200),
    '',
    '[MEMORY_OWNER_EVIDENCE]',
    memoryOwnerEvidence,
    '',
    ...projectStatePayloadLines,
    '',
    '[GOVERNANCE_SUMMARY]',
    safeProviderJson({
      decisionTraceId: governance?.decisionTraceId ?? null,
      turnMode: governance?.turnMode ?? null,
      truthState: governance?.truthState ?? null,
      answerSubject: governance?.answerSubject ?? null,
      answerAct: governance?.answerAct ?? null,
      screenReferenceMode: governance?.screenReferenceMode ?? null,
      evidenceMode: governance?.evidenceMode ?? null,
      repairState: governance?.repairState ?? null,
      focusAnchor: sanitizeSecondPassProviderText(governance?.focusAnchor, 180),
      answerIntent: sanitizeSecondPassProviderText(governance?.answerIntent, 360),
      openingMove: sanitizeSecondPassProviderText(governance?.openingMove, 360),
      carriedThread: sanitizeSecondPassProviderText(governance?.carriedThread, 260),
      suppressAssociativeRecall: governance?.suppressAssociativeRecall ?? null,
      labelCarryAsMemory: governance?.labelCarryAsMemory ?? null,
      mustDo: sanitizeSecondPassProviderList(governance?.mustDo ?? [], 260),
      mustNotDo: sanitizeSecondPassProviderList(governance?.mustNotDo ?? [], 260),
      claimEvidence: governance?.claimEvidence ?? null,
    }),
    '',
    '[REWRITE_REQUEST]',
    safeProviderJson(providerSafeRewriteRequest),
    '',
    '[VISIBLE_REPLY_NATURAL_PERSONHOOD_GUIDANCE]',
    buildNaturalPersonhoodTemplateRepairGuidance({
      enabled: naturalPersonhoodTemplateRepair,
    }),
    '',
    '[MEMORY_GATE_REWRITE_GUIDANCE]',
    inwardOnlyMemoryGateRewriteRequired
      ? [
          'memory_seed_turn=first_turn',
          'visible_memory_gate=inward_only',
          'current_instruction_storage=inward_for_later_turn',
          'visible_speech_scope=present_turn',
          'recall_surfaced_claim=same_turn_blocked',
          'blocked_visible_phrases=i_remember,recall_surfaced,why_recall_surfaced,previously,last_time',
          'internal_process_terms=blocked',
        ].join('\n')
      : '(none)',
    '',
    '[OPENING_GUIDANCE_REWRITE_GUIDANCE]',
    openingGuidanceRewriteGuidance.length > 0
      ? openingGuidanceRewriteGuidance.join('\n')
      : '(none)',
    '',
    '[HELD_AUTONOMY_REWRITE_GUIDANCE]',
    rewriteRequest?.reasonCodes.includes('held-autonomy-opening-shell')
      ? [
          'held_autonomy_return=true',
          'restraint_shell=blocked',
          'first_sentence=answer_deferred_context',
        ].join('\n')
      : '(none)',
    '',
    '[CURRENT_CONTEXT_CONTINUATION_REWRITE_GUIDANCE]',
    visibleSameThreadContinuationRewriteGuidanceRequired
      ? [
          'current_reply_context=already_open',
          'restart_greeting_fresh_approach=blocked',
          'first_sentence=current_answer_context',
          continuityPreferredTiming === 'next-open-window'
            ? 'expansion_timing=next_open_window'
            : continuityPreferredTiming === 'after-payoff'
              ? 'expansion_timing=after_payoff'
              : '',
        ].join('\n')
      : '(none)',
    '',
    '[OUTWARD_CONTINUITY_REWRITE_GUIDANCE]',
    sanitizeSecondPassProviderBlock(outwardContinuityRewriteGuidance, 1600),
    '',
    '[PHASE1_MEMORY_CLOSURE_REWRITE_GUIDANCE]',
    buildPhase1MemoryClosureRewriteGuidance({
      phase1MemoryClosureFollowThroughRewrite,
    }),
    '',
    '[DIALOGUE_SHELL_REWRITE_GUIDANCE]',
    buildDialogueShellRewriteGuidance({
      reasonCodes: projectStateReasonCodes,
    }),
    '',
    '[PROJECT_STATE_REWRITE_GUIDANCE]',
    sanitizeSecondPassProviderBlock(buildProjectStateRewriteGuidance({
      projectStateRewriteRequired,
      projectStateSameHerRewriteRequired,
      sameThreadContinuationRewriteGuidanceRequired: visibleSameThreadContinuationRewriteGuidanceRequired,
      sameHerProjectFollowThroughRewrite,
      projectStateAnswerStancePreserveLine: providerSafeProjectStateAnswerStancePreserveLine,
      projectStateSameHerSelfLine: providerSafeProjectState.sameHerSelfLine,
      projectStateSameHerHoldDetail: providerSafeProjectStateContinuityFields.sameHerHoldDetail,
      projectStateCarryInwardLine: providerSafeProjectStateCarryInwardLine,
      projectStateContinuityCue: providerSafeProjectStateContinuityFields.continuityCue,
      projectStateSameHerDriftRisk: providerSafeProjectStateSameHerDriftRisk,
      projectStatePreDialogueAwarenessLine: providerSafeProjectState.preDialogueAwarenessLine,
      projectStateContinuitySummary: sanitizeBoundedText(projectStateAudit?.continuitySummary ?? null, 800) || null,
      projectStateEmbodimentClosureSummary: providerSafeProjectStateEmbodimentClosureSummary,
      projectStateOpenFocusSummary: sanitizeBoundedText(projectStateAudit?.openFocusSummary ?? null, 220) || null,
      projectStateNextFocusSummary: sanitizeBoundedText(projectStateAudit?.nextFocusSummary ?? null, 220) || null,
    }), 2400),
    '',
    '[CORRECTED_SAME_PERSON_REWRITE_GUIDANCE]',
    sanitizeSecondPassProviderBlock(correctedSamePersonRewriteGuidance, 1600),
    '',
    '[RELATIONSHIP_TRUTH_DOCTRINE_REWRITE_GUIDANCE]',
    relationshipTruthDoctrineLine
      ? sanitizeSecondPassProviderBlock([
          relationshipTruthDoctrineLine,
          'truth_repair_priority=above_closeness_smoothing',
        ].join('\n'), 1000)
      : '(none)',
    '',
    '[EXECUTION_CALLBACK_REWRITE_GUIDANCE]',
    (
      rewriteRequest?.reasonCodes.includes('execution-callback-room-first-violation')
      || (executionCallbackEmbodimentHandoff && projectStateEmbodimentClosureSummary)
    )
      ? sanitizeSecondPassProviderBlock([
          'execution_callback_return=true',
          'immediate_closeness_pressure_affection_surge=blocked',
          'first_sentence=callback_context',
          executionResumeConfirmationBoundaryHoldDetail,
          executionResumeConfirmationBoundaryContinuityCue,
          executionCallbackEmbodimentHandoff && providerSafeProjectStateEmbodimentClosureSummary
            ? formatSecondPassProviderEvidenceContext('embodiment_closure_context', providerSafeProjectStateEmbodimentClosureSummary, 800)
            : '',
        ].join('\n'), 1800)
      : '(none)',
    '',
    '[EXECUTION_CALLBACK_EMBODIMENT_HANDOFF]',
    executionCallbackEmbodimentHandoff
      ? safeProviderJson(executionCallbackEmbodimentHandoff)
      : '(none)',
    '',
    '[EMOTIONAL_CLOSURE_REWRITE_GUIDANCE]',
    emotionalClosureCue
      ? sanitizeSecondPassProviderBlock([
          'emotional_closure=active',
          providerSafeEmotionalClosureCue
            ? 'emotional_closure_context=present; source_text=withheld_non_structured_instruction; visible_wording=false'
            : 'emotional_context=present; source_text=withheld_non_structured_instruction; visible_wording=false.',
          emotionalClosurePrefersLowPressure
            ? 'pressure=low'
            : '',
          emotionalClosureAvoidsRestart
            ? 'emotional_context_restart=blocked'
            : '',
          'reply_specificity=current_turn',
        ].join('\n'), 1200)
      : '(none)',
    '',
    '[MIND_TURN_CONTRACT]',
    safeProviderJson(
      naturalPersonhoodTemplateRepair
        ? buildNaturalPersonhoodTemplateRepairContractPrompt({
            governance,
          })
        : buildSecondPassProviderMindTurnContractPrompt(input.prepared.mindTurnContract),
    ),
    '',
    '[RESPONSE_SURFACE_AUTHORITY]',
    safeProviderJson({
      replyRealization: input.prepared.replyRealization ?? null,
      replyExecutionPlan: input.prepared.replyExecutionPlan ?? null,
      currentConsciousFrame: preferredRuntimeSurface?.dialogue?.currentConsciousFrame ?? null,
      claimEvidenceLedger: preferredRuntimeSurface?.dialogue?.claimEvidenceLedger ?? input.governance?.claimEvidence ?? null,
      answerCompiler: preferredRuntimeSurface?.dialogue?.answerCompiler ?? null,
      answerPlanner: preferredRuntimeSurface?.dialogue?.answerPlanner ?? null,
    }),
    '',
    '[ORIGINAL_STRUCTURED_REPLY]',
    safeProviderJson(redactSecondPassOriginalStructuredForProvider({
      thought: input.originalStructured.thought ?? null,
      emotion: input.originalStructured.emotion ?? null,
      reply: input.originalStructured.reply ?? null,
      performance: input.originalStructured.performance ?? null,
    })),
    '',
    '[RULE_LAYER_NON_AUTHORING_DIAGNOSTIC]',
    safeProviderJson({
      reasons: rewriteRequest?.reasonCodes ?? [],
      mustPreserve: sanitizeSecondPassProviderList(rewriteRequest?.mustPreserve, 360),
      mustDrop: sanitizeSecondPassProviderList(rewriteRequest?.mustDrop, 360),
      memoryTruthDiscipline: rewriteRequest?.memoryTruthDiscipline ?? null,
      fallbackPatternId: rewriteRequest?.fallbackPatternId ?? null,
    }),
  ].join('\n')

  return [
    ...projectStateSystemMessages,
    { role: 'system' as const, content: system },
    ...sanitizeSecondPassRecentMessages(input.prepared.messages.slice(-4)),
    { role: 'user' as const, content: user },
  ] satisfies Message[]
}

function normalizeSecondPassStructuredReply(input: {
  parsed: Record<string, unknown>
  governedStructured: Record<string, unknown>
  governance?: AlicizationMindTurnGovernance | null
  userText?: string
  performanceManifest: AlicizationPreparedMainChatExecutionResult['performanceManifest']
}) {
  const reply = sanitizeText(input.parsed.reply)
  const thought = sanitizeText(input.parsed.thought)
  if (!reply || !thought)
    return null

  const parsedPerformance = normalizeStructuredObject(input.parsed.performance)
  const normalizedEmotion = normalizeAlicizationEmotion(input.parsed.emotion)
  const performanceEmotion = normalizeAlicizationEmotion(parsedPerformance?.baseEmotion ?? parsedPerformance?.emotion)
  const fallbackEmotion = normalizedEmotion.downgraded
    ? performanceEmotion.downgraded
      ? 'thinking'
      : performanceEmotion.emotion
    : normalizedEmotion.emotion

  const performance = clampAlicizationPerformancePayloadToManifest(
    normalizeAlicizationPerformancePayload(input.parsed.performance, fallbackEmotion),
    input.performanceManifest ?? null,
    fallbackEmotion,
  ).performance satisfies AlicizationDialoguePerformancePayload

  return {
    ...input.governedStructured,
    thought: input.governance
      ? buildGovernedMindThought(input.governance, {
          userText: input.userText ?? '',
        } as AlicizationConversationTurnInput)
      : thought,
    emotion: performance.baseEmotion,
    reply,
    performance,
    visibleReplyAuthority: 'llm-second-pass-rewrite' as const,
    visibleReplyRewriteRequest: null,
    parsePath: 'second-pass-json',
    format: 'mind-turn-v1',
    contractFailed: false,
  }
}

function rewriteExecutionFrom(input: {
  previous: AlicizationVisibleReplyExecution
  reason: string
  providerMindExecuted: boolean
  actualVisibleReplyAuthority?: AlicizationVisibleReplyExecution['actualVisibleReplyAuthority']
}) {
  return {
    ...input.previous,
    mode: 'provider-one-shot' as const,
    expectedVisibleReplyAuthority: 'llm-second-pass-rewrite' as const,
    actualVisibleReplyAuthority: input.actualVisibleReplyAuthority ?? (
      input.providerMindExecuted ? 'llm-second-pass-rewrite' : input.previous.actualVisibleReplyAuthority
    ),
    providerMindExecuted: input.providerMindExecuted,
    reason: input.reason,
  } satisfies AlicizationVisibleReplyExecution
}

export async function rewriteAlicizationVisibleReplySecondPass(
  input: AlicizationSecondPassRewriteOptions,
): Promise<AlicizationSecondPassRewriteResult> {
  const parsedOriginal = parseJsonObjectFromText(input.rawFullText)
  const shouldForceRewrite = input.forceRewrite === true
  const originalStructured = normalizeStructuredObject(parsedOriginal)
    ?? (
      shouldForceRewrite
        ? buildForcedOriginalStructuredDraft({
            rawFullText: input.rawFullText,
            forceReasonCodes: input.forceReasonCodes,
          })
        : null
    )
  if (!originalStructured) {
    return {
      fullText: input.rawFullText,
      visibleReplyExecution: input.visibleReplyExecution,
      rewritten: false,
      reason: 'not-structured-json',
      audit: null,
    }
  }

  const candidateTurn = buildCandidateConversationTurn({
    rawStructured: originalStructured,
    prepared: input.prepared,
    sessionId: input.sessionId,
    turnId: input.turnId,
    userText: input.userText,
  })
  const governed = coerceConversationTurnToMindGovernedPayload(
    candidateTurn,
    input.prepared.performanceManifest,
    {
      dialogueFirstLocalRepairMode: 'rewrite-request-only',
    },
  )
  const governedStructured = normalizeStructuredObject(governed.payload.structured)
  const rewriteRequest = normalizeVisibleReplyRewriteRequest(governedStructured?.visibleReplyRewriteRequest)
  const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(input.prepared.runtimeSurface)
  const effectiveOpeningGuidance = governed.governance?.openingMove
    ?? input.prepared.governance?.openingMove
    ?? preferredRuntimeSurface?.memory?.personStateProjection?.openingGuidance
    ?? preferredRuntimeSurface?.dialogue?.currentConsciousFrame?.projectState?.preDialogueAwarenessLine
    ?? input.prepared.runtimeSurface.governance?.openingMove
    ?? null
  const effectiveRewriteRequestBase: AlicizationSecondPassRewriteRequestShape | null = rewriteRequest ?? (
    shouldForceRewrite
      ? buildForcedSecondPassRewriteRequest(input.forceReasonCodes)
      : null
  )
  const effectiveRewriteRequest: AlicizationSecondPassRewriteRequestShape | null = effectiveRewriteRequestBase
    ? {
        ...effectiveRewriteRequestBase,
        mustDrop: uniqueTextList([
          ...effectiveRewriteRequestBase.mustDrop,
          ...resolveSecondPassRewriteMustDrop(effectiveRewriteRequestBase.reasonCodes),
        ]),
        openingGuidanceHoldDetail: resolveOpeningGuidanceHoldDetailForSecondPassRewrite({
          reasonCodes: effectiveRewriteRequestBase.reasonCodes,
          reply: originalStructured.reply ?? input.rawFullText,
          openingGuidance: effectiveOpeningGuidance,
          existingHoldDetail: effectiveRewriteRequestBase.openingGuidanceHoldDetail,
        }),
      }
    : null
  const mergedMustPreserve = uniqueTextList([
    ...(effectiveRewriteRequest?.mustPreserve ?? []),
    ...(input.mustPreserve ?? []),
  ])
  const effectiveGovernedStructured = governedStructured
    ? {
        ...governedStructured,
        visibleReplyRewriteRequest: effectiveRewriteRequest
          ? {
              ...effectiveRewriteRequest,
              mustPreserve: mergedMustPreserve,
            }
          : governedStructured.visibleReplyRewriteRequest ?? null,
      }
    : shouldForceRewrite
      ? {
          ...originalStructured,
          visibleReplyRewriteRequest: effectiveRewriteRequest
            ? {
                ...effectiveRewriteRequest,
                mustPreserve: mergedMustPreserve,
              }
            : null,
        }
      : null
  if ((!governed.replyOverridden || effectiveRewriteRequest?.required !== true || !effectiveGovernedStructured) && !shouldForceRewrite) {
    return {
      fullText: input.rawFullText,
      visibleReplyExecution: input.visibleReplyExecution,
      rewritten: false,
      reason: 'rewrite-not-required',
      audit: sanitizeSecondPassOutputRecord(governed.audit),
    }
  }
  if (!effectiveRewriteRequest || effectiveRewriteRequest.required !== true || !effectiveGovernedStructured) {
    return {
      fullText: input.rawFullText,
      visibleReplyExecution: input.visibleReplyExecution,
      rewritten: false,
      reason: 'rewrite-force-setup-failed',
      audit: sanitizeSecondPassOutputRecord(governed.audit),
    }
  }

  await input.appendRuntimeDebugLine?.('chat-stream.visible-reply-second-pass-started', {
    cardId: input.cardId,
    turnId: input.turnId,
    decisionTraceId: governed.governance?.decisionTraceId ?? null,
    timeoutMs: mainChatVisibleReplySecondPassTimeoutMs,
    reasons: shouldForceRewrite
      ? effectiveRewriteRequest.reasonCodes
      : governed.reasons,
    fallbackPatternId: governed.fallbackPatternId ?? null,
  })

  const providerResult = await input.provider({
    chatConfig: input.prepared.chatConfig,
    headers: input.headers,
    messages: buildSecondPassRewriteMessages({
      prepared: input.prepared,
      userText: input.userText,
      originalStructured,
      governedStructured: effectiveGovernedStructured,
      governance: governed.governance ?? null,
      mustPreserve: mergedMustPreserve,
    }),
    timeoutMs: mainChatVisibleReplySecondPassTimeoutMs,
  })
  const parsedRewrite = parseJsonObjectFromText(providerResult.fullText)
  if (!parsedRewrite)
    throw new Error('visible-reply-second-pass-invalid-json')

  const rewrittenStructured = normalizeSecondPassStructuredReply({
    parsed: parsedRewrite,
    governedStructured: effectiveGovernedStructured,
    governance: governed.governance ?? candidateTurn.governance ?? null,
    userText: input.userText,
    performanceManifest: input.prepared.performanceManifest,
  })
  if (!rewrittenStructured)
    throw new Error('visible-reply-second-pass-invalid-structured-reply')

  const verified = coerceConversationTurnToMindGovernedPayload({
    ...candidateTurn,
    assistantText: sanitizeText(rewrittenStructured.reply),
    structured: rewrittenStructured,
    governance: governed.governance ?? candidateTurn.governance,
  }, input.prepared.performanceManifest, {
    dialogueFirstLocalRepairMode: 'rewrite-request-only',
  })
  const normalizedVerifiedStructured = normalizeStructuredObject(verified.payload.structured)
  const carriedProjectState = normalizeStructuredProjectState(normalizedVerifiedStructured?.projectState)
  const canonicalProjectState = resolveSecondPassProjectState({
    prepared: input.prepared,
  })
  const rewriteEmbodimentHandoff = resolveExecutionCallbackEmbodimentHandoffForRewrite({
    prepared: input.prepared,
    rewriteRequest: effectiveRewriteRequest ?? null,
  })
  const carriedProjectStateAudit = readStructuredProjectStateAudit(originalStructured)
    ?? (input.prepared.replyRealization as { projectStateAudit?: Record<string, unknown> | null } | null | undefined)?.projectStateAudit
    ?? null
  const rewrittenStructuredWithVisibleReplyRealization = rewrittenStructured as typeof rewrittenStructured & {
    visibleReplyRealization?: Record<string, unknown> | null
  }
  const existingVisibleReplyRealization
    = normalizedVerifiedStructured?.visibleReplyRealization
      && typeof normalizedVerifiedStructured.visibleReplyRealization === 'object'
      ? normalizedVerifiedStructured.visibleReplyRealization as Record<string, unknown>
      : rewrittenStructuredWithVisibleReplyRealization.visibleReplyRealization
        && typeof rewrittenStructuredWithVisibleReplyRealization.visibleReplyRealization === 'object'
        ? rewrittenStructuredWithVisibleReplyRealization.visibleReplyRealization as Record<string, unknown>
        : null
  const existingVerifiedProjectStateAudit = existingVisibleReplyRealization?.projectStateAudit
  const bridgedVisibleReplyProjectStateAudit
    = existingVerifiedProjectStateAudit && typeof existingVerifiedProjectStateAudit === 'object'
      ? sanitizeSecondPassOutputRecord(existingVerifiedProjectStateAudit)
      : sanitizeSecondPassOutputRecord(carriedProjectStateAudit)
  const verifiedStructured = {
    ...(normalizedVerifiedStructured ?? rewrittenStructured),
    thought: rewrittenStructured.thought,
    emotion: rewrittenStructured.emotion,
    reply: rewrittenStructured.reply,
    performance: rewrittenStructured.performance,
    projectState: sanitizeSecondPassOutputProjectState({
      ...canonicalProjectState,
      ...carriedProjectState,
      ...(rewriteEmbodimentHandoff?.residentMode
        ? { continuityCadence: rewriteEmbodimentHandoff.residentMode }
        : {}),
      ...(rewriteEmbodimentHandoff?.preferredBlinkCadence
        ? { preferredBlinkCadence: rewriteEmbodimentHandoff.preferredBlinkCadence }
        : {}),
      ...(rewriteEmbodimentHandoff?.preferredGazeMode
        ? { preferredGazeMode: rewriteEmbodimentHandoff.preferredGazeMode }
        : {}),
      ...(rewriteEmbodimentHandoff?.preferredPauseMode
        ? { preferredPauseMode: rewriteEmbodimentHandoff.preferredPauseMode }
        : {}),
      ...(rewriteEmbodimentHandoff?.preferredLipsyncMode
        ? { preferredLipsyncMode: rewriteEmbodimentHandoff.preferredLipsyncMode }
        : {}),
      ...(rewriteEmbodimentHandoff?.preferredVoiceMode
        ? { preferredVoiceMode: rewriteEmbodimentHandoff.preferredVoiceMode }
        : {}),
      ...(rewriteEmbodimentHandoff?.preferredPacingMode
        ? { preferredPacingMode: rewriteEmbodimentHandoff.preferredPacingMode }
        : {}),
    }),
    ...(bridgedVisibleReplyProjectStateAudit
      ? {
          visibleReplyRealization: {
            ...existingVisibleReplyRealization,
            projectStateAudit: bridgedVisibleReplyProjectStateAudit,
          },
        }
      : {}),
    visibleReplyAuthority: 'llm-second-pass-rewrite' as const,
    visibleReplyRewriteRequest: null,
    parsePath: 'second-pass-json',
    format: 'mind-turn-v1',
  }
  if (verified.replyOverridden) {
    await input.appendRuntimeDebugLine?.('chat-stream.visible-reply-second-pass-still-violates', {
      cardId: input.cardId,
      turnId: input.turnId,
      decisionTraceId: governed.governance?.decisionTraceId ?? null,
      reasons: verified.reasons,
      replyExcerpt: sanitizeSecondPassDebugText(rewrittenStructured.reply, 500),
      localRepairCandidateBlocked: verified.audit?.local_repair_candidate_blocked ?? null,
      localRepairCandidateReason: sanitizeSecondPassDebugText(verified.audit?.local_repair_candidate_reason, 360),
      localRepairCandidateReplyExcerpt: sanitizeSecondPassDebugText(verified.audit?.local_repair_candidate_reply_excerpt, 500),
      localRepairCandidateDroppedClauses: sanitizeSecondPassOutputMetadata(verified.audit?.local_repair_candidate_dropped_clauses ?? null),
      visibleReplyRewriteRequest: sanitizeSecondPassOutputMetadata(effectiveRewriteRequest),
    })
    throw new Error(`visible-reply-second-pass-still-violates:${verified.reasons.join(',') || 'unknown'}`)
  }

  await input.appendRuntimeDebugLine?.('chat-stream.visible-reply-second-pass-finished', {
    cardId: input.cardId,
    turnId: input.turnId,
    decisionTraceId: governed.governance?.decisionTraceId ?? null,
    finishReason: providerResult.finishReason,
    replyChars: sanitizeText(verifiedStructured.reply).length,
  })

  return {
    fullText: JSON.stringify(verifiedStructured),
    visibleReplyExecution: rewriteExecutionFrom({
      previous: input.visibleReplyExecution,
      providerMindExecuted: true,
      reason: 'visible-reply-second-pass-rewrite',
    }),
    rewritten: true,
    reason: 'visible-reply-second-pass-rewrite',
    audit: {
      before: sanitizeSecondPassOutputRecord(governed.audit),
      after: sanitizeSecondPassOutputRecord(verified.audit),
    },
  }
}

export const secondPassRewriteTestInternals = {
  buildProjectStateRewriteGuidance,
}
