import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationConversationTurnInput,
  AlicizationDialoguePerformancePayload,
  AlicizationMindTurnGovernance,
  AlicizationVisibleReplyExecution,
} from '../../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'
import type { MainGatewayResolvedConfig } from '../runtime-soul'

import {
  clampAlicizationPerformancePayloadToManifest,
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformancePayload,
} from '../../../../shared/eventa'
import { buildAlicizationMindAuthoringFailureArtifact } from './authority-orchestrator'
import { coerceConversationTurnToMindGovernedPayload } from '../runtime-governance'
import { parseJsonObjectFromText } from '../runtime-transport-content'
import { sanitizeText } from '../runtime-soul'

interface AlicizationSecondPassProviderInput {
  chatConfig: ReturnType<MainGatewayResolvedConfig['provider']['chat']>
  messages: Message[]
  headers?: Record<string, string>
  timeoutMs: number
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
  headers?: Record<string, string>
  appendRuntimeDebugLine?: (event: string, payload: Record<string, unknown>) => Promise<void> | void
}

export function buildAlicizationSecondPassTransportFailureReply(input: {
  governedStructured?: Record<string, unknown> | null
  previousExecution: AlicizationVisibleReplyExecution
  reason: string
}) {
  const reason = sanitizeText(input.reason).slice(0, 180) || 'visible-reply-second-pass-transport-failure'
  return {
    fullText: JSON.stringify({
      ...buildAlicizationMindAuthoringFailureArtifact({
        stage: 'visible-reply-second-pass',
        reason,
        reasonCodes: ['visible-reply-second-pass-transport-failure'],
      }),
      governedStructured: input.governedStructured
        ? {
            format: input.governedStructured.format ?? null,
            parsePath: input.governedStructured.parsePath ?? null,
            visibleReplyAuthority: input.governedStructured.visibleReplyAuthority ?? null,
          }
        : null,
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

function normalizeStructuredObject(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function buildForcedSecondPassRewriteRequest(reasonCodes?: string[]) {
  const normalizedReasonCodes = (reasonCodes ?? [])
    .map(code => sanitizeText(code).slice(0, 120))
    .filter(Boolean)

  return {
    required: true,
    authority: 'llm-second-pass-rewrite' as const,
    reasonCodes: normalizedReasonCodes.length > 0
      ? normalizedReasonCodes
      : ['forced-visible-reply-second-pass'],
    mustPreserve: [],
    mustDrop: [],
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
}) {
  const rewriteRequest = normalizeStructuredObject(input.governedStructured.visibleReplyRewriteRequest)
  const governance = input.governance
  const system = [
    '[ALICIZATION_SECOND_PASS_VISIBLE_REPLY_REWRITE]',
    'You are the same Alicization mind, performing a second-pass visible reply rewrite for this exact turn.',
    'The first provider-authored reply violated governance. The rule layer is not allowed to write the normal visible reply.',
    'You must author the corrected visible reply yourself, using the constraints and evidence below.',
    'Output valid JSON only with keys: format, thought, emotion, reply, performance.',
    'format must be "mind-turn-v1".',
    'reply must be natural visible speech to the Host, not a policy explanation and not a template shell.',
    'Do not mention second pass, rewrite, governance, fallback, contract, JSON, provider, or internal rules.',
    'Do not use fixed shell openers such as "I will answer directly", "I hear you", "Let me stay with this", or equivalent empty setup lines.',
    'Do not copy any mustDrop text or unsupported specificity.',
    'Preserve the current user obligation and any safe mustPreserve content.',
    'If evidence is insufficient, phrase uncertainty naturally without inventing screen/file/class/app details.',
    'Keep performance.baseEmotion equal to emotion.',
  ].join('\n')

  const user = [
    'Rewrite this turn now.',
    '',
    '[LATEST_USER_TEXT]',
    input.userText || '(empty)',
    '',
    '[GOVERNANCE_SUMMARY]',
    safeJson({
      decisionTraceId: governance?.decisionTraceId ?? null,
      turnMode: governance?.turnMode ?? null,
      truthState: governance?.truthState ?? null,
      answerSubject: governance?.answerSubject ?? null,
      answerAct: governance?.answerAct ?? null,
      screenReferenceMode: governance?.screenReferenceMode ?? null,
      evidenceMode: governance?.evidenceMode ?? null,
      repairState: governance?.repairState ?? null,
      focusAnchor: governance?.focusAnchor ?? null,
      answerIntent: governance?.answerIntent ?? null,
      openingMove: governance?.openingMove ?? null,
      carriedThread: governance?.carriedThread ?? null,
      suppressAssociativeRecall: governance?.suppressAssociativeRecall ?? null,
      labelCarryAsMemory: governance?.labelCarryAsMemory ?? null,
      mustDo: governance?.mustDo ?? [],
      mustNotDo: governance?.mustNotDo ?? [],
      claimEvidence: governance?.claimEvidence ?? null,
    }),
    '',
    '[REWRITE_REQUEST]',
    safeJson(rewriteRequest),
    '',
    '[MIND_TURN_CONTRACT]',
    safeJson(input.prepared.mindTurnContract ?? null),
    '',
    '[RESPONSE_SURFACE_AUTHORITY]',
    safeJson({
      replyRealization: input.prepared.replyRealization ?? null,
      replyExecutionPlan: input.prepared.replyExecutionPlan ?? null,
      currentConsciousFrame: input.prepared.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.currentConsciousFrame ?? null,
      claimEvidenceLedger: input.prepared.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.claimEvidenceLedger ?? input.governance?.claimEvidence ?? null,
      answerCompiler: input.prepared.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerCompiler ?? null,
      answerPlanner: input.prepared.runtimeSurface.digitalLifeRuntimeSurface?.dialogue.answerPlanner ?? null,
    }),
    '',
    '[ORIGINAL_STRUCTURED_REPLY]',
    safeJson({
      thought: input.originalStructured.thought ?? null,
      emotion: input.originalStructured.emotion ?? null,
      reply: input.originalStructured.reply ?? null,
      performance: input.originalStructured.performance ?? null,
    }),
    '',
    '[RULE_LAYER_NON_AUTHORING_DIAGNOSTIC]',
    safeJson({
      reasons: rewriteRequest?.reasonCodes ?? [],
      mustPreserve: rewriteRequest?.mustPreserve ?? [],
      mustDrop: rewriteRequest?.mustDrop ?? [],
      memoryTruthDiscipline: rewriteRequest?.memoryTruthDiscipline ?? null,
      fallbackPatternId: rewriteRequest?.fallbackPatternId ?? null,
    }),
  ].join('\n')

  return [
    { role: 'system' as const, content: system },
    ...input.prepared.messages.slice(-4),
    { role: 'user' as const, content: user },
  ] satisfies Message[]
}

function normalizeSecondPassStructuredReply(input: {
  parsed: Record<string, unknown>
  governedStructured: Record<string, unknown>
  performanceManifest: AlicizationPreparedMainChatExecutionResult['performanceManifest']
}) {
  const reply = sanitizeText(input.parsed.reply)
  const thought = sanitizeText(input.parsed.thought)
  if (!reply || !thought)
    return null

  const normalizedEmotion = normalizeAlicizationEmotion(input.parsed.emotion)
  if (normalizedEmotion.downgraded)
    return null

  const performance = clampAlicizationPerformancePayloadToManifest(
    normalizeAlicizationPerformancePayload(input.parsed.performance, normalizedEmotion.emotion),
    input.performanceManifest ?? null,
    normalizedEmotion.emotion,
  ).performance satisfies AlicizationDialoguePerformancePayload

  return {
    ...input.governedStructured,
    thought,
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
  const rewriteRequest = normalizeStructuredObject(governedStructured?.visibleReplyRewriteRequest)
  const effectiveRewriteRequest = rewriteRequest ?? (
    shouldForceRewrite
      ? buildForcedSecondPassRewriteRequest(input.forceReasonCodes)
      : null
  )
  const effectiveGovernedStructured = governedStructured
    ? {
        ...governedStructured,
        visibleReplyRewriteRequest: effectiveRewriteRequest ?? governedStructured.visibleReplyRewriteRequest ?? null,
      }
    : shouldForceRewrite
      ? {
          ...originalStructured,
          visibleReplyRewriteRequest: effectiveRewriteRequest,
        }
      : null
  if ((!governed.replyOverridden || effectiveRewriteRequest?.required !== true || !effectiveGovernedStructured) && !shouldForceRewrite) {
    return {
      fullText: input.rawFullText,
      visibleReplyExecution: input.visibleReplyExecution,
      rewritten: false,
      reason: 'rewrite-not-required',
      audit: governed.audit,
    }
  }
  if (!effectiveRewriteRequest || effectiveRewriteRequest.required !== true || !effectiveGovernedStructured) {
    return {
      fullText: input.rawFullText,
      visibleReplyExecution: input.visibleReplyExecution,
      rewritten: false,
      reason: 'rewrite-force-setup-failed',
      audit: governed.audit,
    }
  }

  await input.appendRuntimeDebugLine?.('chat-stream.visible-reply-second-pass-started', {
    cardId: input.cardId,
    turnId: input.turnId,
    decisionTraceId: governed.governance?.decisionTraceId ?? null,
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
    }),
    timeoutMs: 12_000,
  })
  const parsedRewrite = parseJsonObjectFromText(providerResult.fullText)
  if (!parsedRewrite)
    throw new Error('visible-reply-second-pass-invalid-json')

  const rewrittenStructured = normalizeSecondPassStructuredReply({
    parsed: parsedRewrite,
    governedStructured: effectiveGovernedStructured,
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
  const verifiedStructured = {
    ...(normalizeStructuredObject(verified.payload.structured) ?? rewrittenStructured),
    thought: rewrittenStructured.thought,
    emotion: rewrittenStructured.emotion,
    reply: rewrittenStructured.reply,
    performance: rewrittenStructured.performance,
    visibleReplyAuthority: 'llm-second-pass-rewrite' as const,
    visibleReplyRewriteRequest: null,
    parsePath: 'second-pass-json',
    format: 'mind-turn-v1',
  }
  if (verified.replyOverridden) {
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
      before: governed.audit,
      after: verified.audit,
    },
  }
}
