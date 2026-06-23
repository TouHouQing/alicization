import type {
  AlicizationDialoguePerformancePayload,
  AlicizationHostPersonModelSnapshot,
  AlicizationMindTurnGovernance,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'
import type { AlicizationExecutionResultDeliveryPolicy } from './execution-interaction-learning'
import type { AlicizationActiveDialogueFastPathDecision } from './main-chat-active-dialogue-loop'
import type { AlicizationMindSurfaceMove } from './mind-surface-renderer'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'

import { sanitizeExecutionLedgerText } from './execution-ledger-shared'
import {
  buildAlicizationExecutionListingDisplayOrder,
  formatAlicizationExecutionListingPreviewName,
  resolveAlicizationExecutionListingSummary,
} from './execution-listing-surface'
import { buildHostSocialGuidance, inferHostSocialContextsFromText } from './host-social-guidance'
import { buildAlicizationActiveDialogueGovernedReply } from './main-chat-active-dialogue-loop'
import { resolveAlicizationOpeningGuidanceViolationReason } from './proactive-opening-guidance'
import { buildRelationshipDoctrineGuidance } from './relationship-doctrine-guidance'
import { parseJsonObjectFromText } from './runtime-transport-content'

const listingProtocolLeakPattern = /\bListed\s+(?:desktop\s+entries|entries)\s*\(\d+\):/iu
const shellListingLeakPattern = /(?:^|\s)(?:drwx|total\s+\d+)/iu
const mechanisticChannelLeadPattern = /^(?:刚才那个|这条)?\s*(?:CLI|Codex|Claude Code|OpenClaw)\b/iu
const uriEncodedLeakPattern = /%[0-9A-F]{2}/iu

const allowedExecutionPayoffEmotions = new Set([
  'neutral',
  'happy',
  'sad',
  'angry',
  'concerned',
  'tired',
  'apologetic',
  'surprised',
  'thinking',
])

const allowedExecutionPayoffDeliveries = new Set([
  'calm',
  'gentle',
  'firm',
  'energetic',
  'hesitant',
  'teasing',
])

export type AlicizationExecutionDeliveryReplySource = 'llm' | 'llm-repaired'
export type AlicizationExecutionPayoffMode = 'inline-execution' | 'callback-delivery'

export interface AlicizationExecutionDeliveryReplySelection {
  reply: string
  source: AlicizationExecutionDeliveryReplySource
  reason?: string
}

export interface AlicizationExecutionPayoffStructured {
  thought: string
  emotion: string
  reply: string
  visibleReplyAuthority?: AlicizationMindTurnGovernance['visibleReplyAuthority'] | null
  performance: {
    baseEmotion: string
    facialCue: string | null
    actionCue: string | null
    delivery: string
    emphasis: 0 | 1 | 2
  }
  parsePath: 'json'
  format: 'mind-turn-v1'
}

export type AlicizationExecutionOutcomeSurfaceStatus
  = | AlicizationTaskThreadRecord['status']
    | 'queued'
    | 'running'
    | 'not-routed'

function sanitizeText(raw: unknown, maxLength: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

function normalizeChannelLabel(channelRaw: string) {
  const channel = sanitizeExecutionLedgerText(channelRaw, 48).toLowerCase()
  if (channel === 'cli')
    return 'CLI'
  if (channel === 'codex')
    return 'Codex'
  if (channel === 'claude-code')
    return 'Claude Code'
  if (channel === 'openclaw')
    return 'OpenClaw'
  return sanitizeExecutionLedgerText(channelRaw, 48) || '执行线程'
}
function resolveListingSummary(input: {
  detail: string
  goal?: string
}) {
  return resolveAlicizationExecutionListingSummary(input)
}

function readExecutionDetail(input: {
  summary: string
  outcome: string
}) {
  // NOTICE: execution payoff needs a wider internal parse budget than the visible reply budget,
  // otherwise long shell listings are truncated before we can compress them into lived summaries.
  return sanitizeText(input.outcome || input.summary, 1_200)
}

function buildExecutionPayoffThought(input: {
  mode: AlicizationExecutionPayoffMode
  status: AlicizationExecutionOutcomeSurfaceStatus
}) {
  if (input.status === 'running' || input.status === 'queued') {
    return input.mode === 'inline-execution'
      ? 'obligation=guide; truth=grounded; focus=execution-dispatch; move=confirm-dispatch-and-stay-with-thread; tone=direct'
      : 'obligation=guide; truth=grounded; focus=background-task-thread; move=deliver-dispatch-state; tone=direct'
  }

  if (input.status === 'completed') {
    return input.mode === 'inline-execution'
      ? 'obligation=guide; truth=grounded; focus=execution-result; move=pay-off-finished-result; tone=direct'
      : 'obligation=guide; truth=grounded; focus=finished-task-thread; move=deliver-finished-result-into-dialogue; tone=direct'
  }

  return input.mode === 'inline-execution'
    ? 'obligation=repair; truth=grounded; focus=execution-result; move=state-why-execution-stopped; tone=direct'
    : 'obligation=repair; truth=grounded; focus=finished-task-thread; move=explain-why-execution-stopped; tone=direct'
}

function buildExecutionPayoffEmotion(status: AlicizationExecutionOutcomeSurfaceStatus) {
  if (status === 'completed')
    return 'thinking'
  if (status === 'running' || status === 'queued')
    return 'thinking'
  if (status === 'blocked' || status === 'cancelled')
    return 'concerned'
  return 'apologetic'
}

function normalizeOutcomeSurfaceStatus(raw: AlicizationExecutionOutcomeSurfaceStatus) {
  if (raw === 'completed' || raw === 'cancelled' || raw === 'blocked' || raw === 'failed')
    return raw
  if (raw === 'running' || raw === 'queued')
    return raw
  return 'not-routed'
}

function applyExecutionResultDeliveryPolicyToReply(input: {
  policy?: AlicizationExecutionResultDeliveryPolicy | null
  reply: string
  status: AlicizationExecutionOutcomeSurfaceStatus
  personStateProjection?: AlicizationPersonStateProjection | null
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
  goal?: string
}) {
  const policy = input.policy ?? null
  const personStateProjection = input.personStateProjection ?? null
  const contexts = personStateProjection?.contexts ?? inferHostSocialContextsFromText(input.goal ?? '')
  const hostGuidance = personStateProjection
    ? {
        cautious: personStateProjection.cautious,
        restrained: personStateProjection.restrained,
      }
    : buildHostSocialGuidance({
        hostPersonModel: input.hostPersonModel ?? null,
        contexts,
      })
  const doctrineGuidance = personStateProjection
    ? {
        cautious: personStateProjection.cautious,
        restrained: personStateProjection.restrained,
      }
    : buildRelationshipDoctrineGuidance({
        authority: input.selfContinuityAuthority ?? null,
        contexts,
      })
  if ((!policy || policy.mode === 'deliver-now') && !hostGuidance.cautious && !doctrineGuidance.cautious)
    return input.reply

  const normalizedStatus = normalizeOutcomeSurfaceStatus(input.status)
  const baseReply = sanitizeText(input.reply, 220)
  if (!baseReply)
    return ''

  if (policy?.mode === 'check-availability-first' || hostGuidance.cautious || doctrineGuidance.cautious) {
    if (normalizedStatus === 'completed') {
      if (policy?.companionshipFraming === 'close-carry')
        return sanitizeText(`你现在要是能接，我把这条结果轻轻接回来给你：${baseReply}`, 220)
      if (policy?.tone === 'direct')
        return sanitizeText(`你要是现在能接结果，我就直接说：${baseReply}`, 220)
      if (policy?.tone === 'cautious' || hostGuidance.cautious || doctrineGuidance.cautious || personStateProjection?.relationshipPosture === 'restrained')
        return sanitizeText(`你现在要是方便，我再把结果直接摊给你：${baseReply}`, 220)
      return sanitizeText(`你现在要是方便，我把结果直接接给你：${baseReply}`, 220)
    }

    if (policy?.tone === 'cautious' || hostGuidance.cautious || doctrineGuidance.cautious || personStateProjection?.relationshipPosture === 'restrained')
      return sanitizeText(`你现在要是方便，我把卡住的地方直接交代给你：${baseReply}`, 220)
    return sanitizeText(`你现在要是能接，我把这条执行状态直接说清：${baseReply}`, 220)
  }

  if (policy?.resultLeadStyle === 'soft-handoff' && normalizedStatus === 'completed')
    return sanitizeText(`我把这条结果接回来了：${baseReply}`, 220)

  return baseReply
}

function buildExecutionPayoffGovernance(input: {
  mode: AlicizationExecutionPayoffMode
  channel: string
  goal: string
  status: AlicizationExecutionOutcomeSurfaceStatus
  personStateProjection?: AlicizationPersonStateProjection | null
}): AlicizationMindTurnGovernance {
  const normalizedStatus = normalizeOutcomeSurfaceStatus(input.status)
  const focusAnchor = normalizedStatus === 'completed'
    ? 'execution-result'
    : normalizedStatus === 'running' || normalizedStatus === 'queued'
      ? 'execution-dispatch'
      : 'execution-fault'
  const answerIntent = normalizedStatus === 'completed'
    ? '把已经落地的执行结果直接兑现给宿主。'
    : normalizedStatus === 'running' || normalizedStatus === 'queued'
      ? '把正在进行的执行状态直接说清。'
      : '把执行没跑通的地方直接说清。'
  const answerAct = normalizedStatus === 'completed' || normalizedStatus === 'running' || normalizedStatus === 'queued'
    ? 'guide'
    : 'answer'
  const turnMode = normalizedStatus === 'completed' || normalizedStatus === 'running' || normalizedStatus === 'queued'
    ? 'guide-current-knot'
    : 'answer'
  const emotion = buildExecutionPayoffEmotion(normalizedStatus)

  return {
    decisionTraceId: null,
    turnMode,
    truthState: 'live-grounded',
    groundedThisTurn: true,
    personaKernelMode: 'full',
    openingStyle: 'direct-answer',
    relationshipPosture: input.personStateProjection?.relationshipPosture ?? 'warm',
    answerSubject: 'task-knot',
    screenReferenceMode: 'avoid',
    answerAct,
    evidenceMode: 'live-grounded',
    repairState: 'none',
    liveSurface: null,
    focusAnchor,
    answerIntent,
    openingMove: input.personStateProjection?.openingGuidance ?? answerIntent,
    carriedThread: null,
    suppressAssociativeRecall: true,
    labelCarryAsMemory: false,
    shouldAskForGrounding: false,
    shouldAcknowledgeRepair: false,
    maxSentences: normalizedStatus === 'completed' ? 2 : 2,
    mindMode: 'tracking',
    embodiedPresence: emotion === 'thinking' ? 'attentive' : 'concerned',
    emotionalTension: emotion === 'thinking' ? 'focused-flow' : 'tense-debug',
    dialogueActKernel: null,
    claimEvidence: null,
    mindTurnFrame: {
      world: {
        activeThread: null,
        visibleSurface: null,
        truthState: 'live-grounded',
        truthBoundary: 'Bound to the finished execution result for this turn.',
        continuityPolicy: 'answer-then-carry',
        continuitySummary: sanitizeText(input.goal, 160) || null,
        staleRisk: 0.08,
      },
      relation: {
        subject: 'task-knot',
        hostMove: sanitizeText(input.goal, 160) || null,
        hostGoal: sanitizeText(input.goal, 160) || focusAnchor,
        relationNeed: answerIntent,
        relationMove: answerIntent,
        relationshipPosture: 'warm',
      },
      memory: {
        memoryMode: 'task-thread',
        carriedThread: null,
        carriedFacts: [],
        recallKeys: ['execution-payoff', normalizedStatus],
        recallSeed: sanitizeText(input.goal, 96) || null,
        lastOutcome: normalizedStatus === 'completed' ? 'aligned' : 'repairing',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
      },
      self: {
        stance: normalizedStatus === 'completed' ? 'nudge' : 'warn',
        mindMode: 'tracking',
        dominantDrive: answerIntent,
        embodiedPresence: emotion === 'thinking' ? 'attentive' : 'concerned',
        emotionalTension: emotion === 'thinking' ? 'focused-flow' : 'tense-debug',
        initiativeAction: null,
        thought: null,
      },
      obligation: {
        shouldSpeak: true,
        speechObligation: answerIntent,
        answerAct,
        responseMode: input.mode,
        turnMode,
        openingClaim: focusAnchor,
        openingMove: answerIntent,
        answerIntent,
        whyNow: input.mode === 'inline-execution'
          ? '这一轮的执行已经在当前回合落地。'
          : '后台执行已经结束，现在要把结果接回对话面。',
        repairState: 'none',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
      },
      focusAnchor,
      confidence: normalizedStatus === 'completed' ? 0.94 : 0.9,
      mustDo: ['Lead with the actual execution outcome.'],
      mustNotDo: ['Do not narrate executor ceremony in the visible reply.'],
      narrative: [answerIntent],
      updatedAt: 0,
    },
    mustDo: ['Lead with the actual execution outcome.'],
    mustNotDo: ['Do not narrate executor ceremony in the visible reply.'],
  }
}

function buildExecutionPayoffMoves(input: {
  mode: AlicizationExecutionPayoffMode
  channel: string
  goal: string
  status: AlicizationExecutionOutcomeSurfaceStatus
  summary: string
  outcome: string
}): AlicizationMindSurfaceMove[] {
  const normalizedStatus = normalizeOutcomeSurfaceStatus(input.status)
  const detail = readExecutionDetail({
    summary: input.summary,
    outcome: input.outcome,
  })
  const listing = normalizedStatus === 'completed' && detail
    ? resolveListingSummary({
        detail,
        goal: input.goal,
      })
    : null
  const mode = input.mode === 'inline-execution' ? 'inline' : 'callback'

  if (listing) {
    const previewItems = buildAlicizationExecutionListingDisplayOrder(listing.items)
      .slice(0, 6)
      .map(formatAlicizationExecutionListingPreviewName)
      .filter(Boolean)

    return [{
      kind: 'execution-listing',
      scope: listing.scope === 'desktop' ? 'desktop' : 'directory',
      count: Math.max(0, listing.count),
      previewItems,
      extraCount: listing.extraCount > 0
        ? listing.extraCount
        : Math.max(0, listing.count - previewItems.length),
      mode,
    }]
  }

  return [{
    kind: 'execution-detail',
    status: normalizedStatus,
    detail,
    summary: sanitizeText(input.summary, 220) || null,
    channelLabel: normalizeChannelLabel(input.channel),
    mode,
  }]
}

function buildExecutionPayoffDecision(input: {
  mode: AlicizationExecutionPayoffMode
  channel: string
  goal: string
  status: AlicizationExecutionOutcomeSurfaceStatus
  summary: string
  outcome: string
  personStateProjection?: AlicizationPersonStateProjection | null
}): AlicizationActiveDialogueFastPathDecision {
  const continuityAnchor = sanitizeText(input.summary || input.goal || input.outcome, 160)
  return {
    lane: 'follow-up',
    strategy: 'compact-one-shot',
    timeoutMs: 6_500,
    resolvedTimeZone: 'UTC',
    resolvedTimeZoneSource: 'utc-fallback',
    latestUserText: sanitizeText(input.goal, 180) || 'execution result follow-up',
    previousUserText: '',
    previousAssistantText: sanitizeText(input.summary || input.outcome, 220),
    continuityAnchor,
    preparedExecutionCarryText: sanitizeText(input.outcome || input.summary || input.goal, 240),
    runtimeDigest: null,
    sessionMirror: null,
    governance: buildExecutionPayoffGovernance(input),
    personaKernel: null,
    performanceManifest: undefined,
    digitalLifeSpine: null,
    reasonCodes: [
      'execution-carry',
      'execution-carry-llm-authored',
      input.mode === 'callback-delivery'
        ? 'execution-callback-surface'
        : 'inline-execution-surface',
    ],
  }
}

export function buildAlicizationExecutionPayoffStructuredReply(input: {
  mode: AlicizationExecutionPayoffMode
  channel: string
  goal: string
  status: AlicizationExecutionOutcomeSurfaceStatus
  summary: string
  outcome: string
  personStateProjection?: AlicizationPersonStateProjection | null
  thought?: string | null
  emotion?: string | null
  delivery?: string | null
  performance?: Partial<AlicizationDialoguePerformancePayload> | null
  visibleReplyAuthority?: AlicizationMindTurnGovernance['visibleReplyAuthority'] | null
}) {
  const structured = buildAlicizationActiveDialogueGovernedReply({
    decision: buildExecutionPayoffDecision(input),
    moves: buildExecutionPayoffMoves(input),
    thought: sanitizeText(input.thought, 220) || buildExecutionPayoffThought({
      mode: input.mode,
      status: input.status,
    }),
    emotion: sanitizeText(input.emotion, 24) || buildExecutionPayoffEmotion(input.status),
    delivery: sanitizeText(input.delivery, 24) || undefined,
    performance: input.performance,
    visibleReplyAuthority: input.visibleReplyAuthority ?? 'llm-mind',
  })
  const parsed = parseJsonObjectFromText(structured)
  if (!parsed)
    throw new Error('execution-payoff-surface-invalid-json')
  const openingGuidance = sanitizeText(input.personStateProjection?.openingGuidance, 180) || null
  return {
    ...parsed,
    proactive: openingGuidance
      ? {
          ...(parsed as { proactive?: Record<string, unknown> | null }).proactive,
          openingGuidance,
        }
      : ((parsed as { proactive?: Record<string, unknown> | null }).proactive ?? null),
    parsePath: 'json',
    format: 'mind-turn-v1',
  } as unknown as AlicizationExecutionPayoffStructured
}

export function buildAlicizationInlineExecutionOutcomeReply(input: {
  channel: string
  goal: string
  status: AlicizationExecutionOutcomeSurfaceStatus
  summary: string
  outcome: string
  policy?: AlicizationExecutionResultDeliveryPolicy | null
  personStateProjection?: AlicizationPersonStateProjection | null
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
}) {
  const baseReply = buildAlicizationExecutionPayoffStructuredReply({
    ...input,
    mode: 'inline-execution',
  }).reply
  return applyExecutionResultDeliveryPolicyToReply({
    policy: input.policy,
    reply: baseReply,
    status: input.status,
    personStateProjection: input.personStateProjection ?? null,
    hostPersonModel: input.hostPersonModel ?? null,
    selfContinuityAuthority: input.selfContinuityAuthority ?? null,
    goal: input.goal,
  })
}

export function buildAlicizationDeterministicExecutionDeliveryReply(input: {
  channel: string
  goal: string
  status: AlicizationExecutionOutcomeSurfaceStatus
  summary: string
  outcome: string
  policy?: AlicizationExecutionResultDeliveryPolicy | null
  personStateProjection?: AlicizationPersonStateProjection | null
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
}) {
  const baseReply = buildAlicizationExecutionPayoffStructuredReply({
    ...input,
    mode: 'callback-delivery',
  }).reply
  return applyExecutionResultDeliveryPolicyToReply({
    policy: input.policy,
    reply: baseReply,
    status: input.status,
    personStateProjection: input.personStateProjection ?? null,
    hostPersonModel: input.hostPersonModel ?? null,
    selfContinuityAuthority: input.selfContinuityAuthority ?? null,
    goal: input.goal,
  })
}

function hasProtocolOrEncodingLeak(reply: string) {
  if (listingProtocolLeakPattern.test(reply))
    return 'listing-protocol-leak'
  if (shellListingLeakPattern.test(reply))
    return 'shell-listing-leak'
  if (uriEncodedLeakPattern.test(reply))
    return 'uri-encoding-leak'
  return null
}

export function selectAlicizationExecutionDeliveryReply(input: {
  channel: string
  goal: string
  llmReply?: string | null
  outcome: string
  status: AlicizationExecutionOutcomeSurfaceStatus
  summary: string
  policy?: AlicizationExecutionResultDeliveryPolicy | null
  personStateProjection?: AlicizationPersonStateProjection | null
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
}): AlicizationExecutionDeliveryReplySelection {
  const deterministicReply = buildAlicizationDeterministicExecutionDeliveryReply({
    channel: input.channel,
    goal: input.goal,
    status: input.status,
    summary: input.summary,
    outcome: input.outcome,
    policy: input.policy,
    personStateProjection: input.personStateProjection ?? null,
    selfContinuityAuthority: input.selfContinuityAuthority,
    hostPersonModel: input.hostPersonModel ?? null,
  })
  const detail = sanitizeText(input.outcome || input.summary, 1_200)
  const normalizedStatus = normalizeOutcomeSurfaceStatus(input.status)
  const listing = normalizedStatus === 'completed' && detail
    ? resolveListingSummary({
        detail,
        goal: input.goal,
      })
    : null
  const llmReply = sanitizeText(input.llmReply, 220)

  if (!llmReply) {
    return {
      source: 'llm-repaired',
      reply: deterministicReply,
      reason: 'missing-llm-reply',
    }
  }

  if (listing) {
    return {
      source: 'llm-repaired',
      reply: deterministicReply,
      reason: 'listing-surface-authority',
    }
  }

  const leakReason = hasProtocolOrEncodingLeak(llmReply)
  if (leakReason) {
    return {
      source: 'llm-repaired',
      reply: deterministicReply,
      reason: leakReason,
    }
  }

  if (input.status === 'completed' && mechanisticChannelLeadPattern.test(llmReply) && /结果是[:：]/u.test(llmReply)) {
    return {
      source: 'llm-repaired',
      reply: deterministicReply,
      reason: 'mechanistic-channel-lead',
    }
  }

  const hostGuidance = input.personStateProjection
    ? { cautious: input.personStateProjection.cautious }
    : buildHostSocialGuidance({
        hostPersonModel: input.hostPersonModel ?? null,
        contexts: inferHostSocialContextsFromText(input.goal),
      })
  const doctrineGuidance = input.personStateProjection
    ? { cautious: input.personStateProjection.cautious }
    : buildRelationshipDoctrineGuidance({
        authority: input.selfContinuityAuthority ?? null,
        contexts: inferHostSocialContextsFromText(input.goal),
      })
  const openingGuidanceViolationReason = input.personStateProjection?.openingGuidance
    ? resolveAlicizationOpeningGuidanceViolationReason({
        reply: llmReply,
        openingGuidance: input.personStateProjection.openingGuidance,
      })
    : null
  if (openingGuidanceViolationReason) {
    return {
      source: 'llm-repaired',
      reply: deterministicReply,
      reason: openingGuidanceViolationReason.replace('proactive-opening-guidance-violation:', 'opening-guidance-'),
    }
  }
  if ((input.policy?.mode === 'check-availability-first' || hostGuidance.cautious || doctrineGuidance.cautious) && !/(方便|能接|if you're free|if you have room|if now's a good time)/iu.test(llmReply)) {
    return {
      source: 'llm-repaired',
      reply: deterministicReply,
      reason: 'missing-availability-check-in',
    }
  }

  return {
    source: 'llm',
    reply: applyExecutionResultDeliveryPolicyToReply({
      policy: input.policy,
      reply: llmReply,
      status: input.status,
      personStateProjection: input.personStateProjection ?? null,
      hostPersonModel: input.hostPersonModel ?? null,
      selfContinuityAuthority: input.selfContinuityAuthority ?? null,
      goal: input.goal,
    }),
  }
}

export function buildAlicizationExecutionPayoffPrompt(input: {
  mode: AlicizationExecutionPayoffMode
  channel: string
  goal: string
  status: AlicizationExecutionOutcomeSurfaceStatus
  summary: string
  outcome: string
  policy?: AlicizationExecutionResultDeliveryPolicy | null
  userText?: string | null
  trace?: {
    decisionTraceId?: string | null
    turnMode?: string | null
    personaKernelMode?: string | null
  } | null
  governance?: {
    relationshipPosture?: string | null
    answerAct?: string | null
    answerSubject?: string | null
    focusAnchor?: string | null
    answerIntent?: string | null
  } | null
  knowledgeEvidence?: {
    validationCount?: number | null
    contradictionCount?: number | null
    stronglyValidatedProcedureCount?: number | null
    contradictionHeavyFactCount?: number | null
  } | null
  personStateProjection?: AlicizationPersonStateProjection | null
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
}) {
  const detail = readExecutionDetail({
    summary: input.summary,
    outcome: input.outcome,
  })
  const listing = detail
    ? resolveListingSummary({
        detail,
        goal: input.goal,
      })
    : null

  const digest = listing
    ? {
        kind: 'listing',
        scope: listing.scope,
        count: listing.count,
        previewItems: listing.items.slice(0, 6),
        extraCount: listing.extraCount,
      }
    : {
        kind: 'detail',
        detail,
      }

  const system = [
    '[ALICIZATION_EXECUTION_PAYOFF]',
    input.mode === 'inline-execution'
      ? 'The required execution for the current user turn has already finished in this same turn.'
      : 'A background execution callback from the current conversation has already settled and must now be paid off naturally.',
    'Your job is to cash out the finished result as Alicization, not to narrate dispatch mechanics.',
    `Current host ask: ${sanitizeText(input.userText, 180) || sanitizeText(input.goal, 180) || 'the current requested task'}.`,
    `Execution payoff JSON: ${JSON.stringify({
      channel: sanitizeText(input.channel, 48) || 'executor',
      status: normalizeOutcomeSurfaceStatus(input.status),
      goal: sanitizeText(input.goal, 180) || 'the current task',
      summary: sanitizeText(input.summary, 220) || null,
      outcome: sanitizeText(input.outcome, 240) || null,
      digest,
    })}`,
    input.trace
      ? `Mind trace JSON: ${JSON.stringify({
        decisionTraceId: sanitizeText(input.trace.decisionTraceId, 120) || null,
        turnMode: sanitizeText(input.trace.turnMode, 64) || null,
        personaKernelMode: sanitizeText(input.trace.personaKernelMode, 64) || null,
      })}`
      : '',
    input.governance
      ? `Governance hint JSON: ${JSON.stringify({
        relationshipPosture: sanitizeText(input.governance.relationshipPosture, 64) || null,
        answerAct: sanitizeText(input.governance.answerAct, 64) || null,
        answerSubject: sanitizeText(input.governance.answerSubject, 64) || null,
        focusAnchor: sanitizeText(input.governance.focusAnchor, 120) || null,
        answerIntent: sanitizeText(input.governance.answerIntent, 160) || null,
      })}`
      : '',
    input.knowledgeEvidence
      ? `Knowledge evidence JSON: ${JSON.stringify({
        validationCount: input.knowledgeEvidence.validationCount ?? 0,
        contradictionCount: input.knowledgeEvidence.contradictionCount ?? 0,
        stronglyValidatedProcedureCount: input.knowledgeEvidence.stronglyValidatedProcedureCount ?? 0,
        contradictionHeavyFactCount: input.knowledgeEvidence.contradictionHeavyFactCount ?? 0,
      })}`
      : '',
    input.personStateProjection
      ? `Person-state projection JSON: ${JSON.stringify({
        contexts: input.personStateProjection.contexts,
        summary: sanitizeText(input.personStateProjection.summary, 180) || null,
        regime: input.personStateProjection.personalityContinuityState.currentRegime,
        activeClosenessContext: input.personStateProjection.activeClosenessContext,
        activeClosenessRung: input.personStateProjection.activeClosenessRung,
        closenessPosture: input.personStateProjection.personalityContinuityState.closenessPosture,
        repairPosture: input.personStateProjection.personalityContinuityState.repairPosture,
        relationshipPosture: input.personStateProjection.relationshipPosture,
        openingGuidance: sanitizeText(input.personStateProjection.openingGuidance, 180) || null,
        preferredProactiveStyle: input.personStateProjection.preferredProactiveStyle,
        preference: sanitizeText(input.personStateProjection.preferenceText, 160) || null,
        sensitivity: sanitizeText(input.personStateProjection.sensitivityText, 160) || null,
        repairTrigger: sanitizeText(input.personStateProjection.repairTriggerText, 160) || null,
        burden: sanitizeText(input.personStateProjection.burdenText, 160) || null,
        trustRationale: sanitizeText(input.personStateProjection.trustRationale, 160) || null,
      })}`
      : '',
    input.selfContinuityAuthority
      ? `Self continuity authority JSON: ${JSON.stringify({
        selfLine: sanitizeText(input.selfContinuityAuthority.selfLine, 160) || null,
        relationshipLine: sanitizeText(input.selfContinuityAuthority.relationshipLine, 160) || null,
        motiveLine: sanitizeText(input.selfContinuityAuthority.motiveLine, 160) || null,
        inwardLine: sanitizeText(input.selfContinuityAuthority.inwardLine, 160) || null,
        authoritySummary: sanitizeText(input.selfContinuityAuthority.authoritySummary, 180) || null,
        sourceTags: input.selfContinuityAuthority.sourceTags,
      })}`
      : '',
    input.hostPersonModel
      ? `Host person model JSON: ${JSON.stringify({
        summary: sanitizeText(input.hostPersonModel.summary, 180) || null,
        trustStage: input.hostPersonModel.trustLadder.stage,
        trustRationale: sanitizeText(input.hostPersonModel.trustLadder.rationale, 160) || null,
        sensitivities: input.hostPersonModel.sensitivities.slice(0, 3),
        repairTriggers: input.hostPersonModel.repairTriggers.slice(0, 3),
        preferredClosenessByContext: input.hostPersonModel.preferredClosenessByContext.slice(0, 3),
        recurrentBurdens: input.hostPersonModel.recurrentBurdens.slice(0, 3),
      })}`
      : '',
    input.selfContinuityAuthority?.relationshipLine
      ? `Relationship doctrine JSON: ${JSON.stringify({
        doctrine: sanitizeText(input.selfContinuityAuthority.relationshipLine, 180) || null,
      })}`
      : '',
    input.policy
      ? `Delivery policy JSON: ${JSON.stringify({
        mode: input.policy.mode,
        tone: input.policy.tone,
        reasonTags: input.policy.reasonTags,
      })}`
      : '',
    'Lead with the concrete finished result, not with channel ceremony.',
    input.selfContinuityAuthority?.authoritySummary
      ? 'Let the same durable self line color this payoff so it sounds like Alicization, but never let it outrank the concrete finished result.'
      : '',
    'Carry the feeling that you stayed present through the execution and are now naturally paying it off to the Host.',
    input.policy?.mode === 'check-availability-first' || input.personStateProjection?.cautious
      ? 'Open with a quick check that the Host has room to receive the result, then land the result in the same reply.'
      : '',
    input.personStateProjection
      ? 'Use the person-state projection as the single social authority for tone, distance, and timing. Do not invent a second relationship posture beside it.'
      : input.hostPersonModel
        ? 'If the host person model implies lighter touch, lower pressure, or a need for room, let that social memory soften how you hand off the result without becoming vague.'
        : '',
    input.selfContinuityAuthority?.relationshipLine
      ? 'If the relationship doctrine implies repair before closeness, truth before warmth, or that presence should not become pressure, let that doctrine soften and sequence the handoff.'
      : '',
    input.policy?.tone === 'cautious'
      ? 'Keep the opening softer and lower-pressure than default.'
      : input.policy?.tone === 'direct'
        ? 'Be concise and decisive once you open the result.'
        : '',
    'Do not say things like "CLI这条任务已经收束", "结果是 Listed entries", or other logger-style lead-ins.',
    'Avoid executor-log syntax like "结果是：" unless it is genuinely the most natural way to finish the sentence.',
    'Do not paste raw shell long-listing rows like total/drwx/-rw, and do not leak URI-encoded names.',
    'If the result is a directory listing, translate it into what is there now and mention only a few meaningful names.',
    'If the result detail is machiney, compress it into the actual finding or state change.',
    'Sound like a living ongoing intelligence paying off a real action, not a formatter or executor log.',
    'Output must be valid JSON only with keys: thought, emotion, reply, performance.',
    'emotion must be one of: neutral|happy|sad|angry|concerned|tired|apologetic|surprised|thinking.',
    'emotion must exactly mirror performance.baseEmotion.',
    'performance must be an object with keys: baseEmotion, facialCue, actionCue, delivery, emphasis.',
    input.mode === 'inline-execution'
      ? 'reply must directly answer the host’s just-finished request in under 120 Chinese characters.'
      : 'reply must deliver the settled callback naturally in under 120 Chinese characters without sounding robotic or ceremonial.',
    'No markdown. No extra keys.',
  ].filter(Boolean).join('\n')

  const user = input.mode === 'inline-execution'
    ? 'Pay off the already-finished execution result to the Host now.'
    : 'Deliver this already-finished background task result to the Host now.'

  return { system, user }
}

export function buildAlicizationExecutionPayoffDeterministicStructured(input: {
  mode: AlicizationExecutionPayoffMode
  channel: string
  goal: string
  status: AlicizationExecutionOutcomeSurfaceStatus
  summary: string
  outcome: string
  policy?: AlicizationExecutionResultDeliveryPolicy | null
  personStateProjection?: AlicizationPersonStateProjection | null
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  visibleReplyAuthority?: AlicizationMindTurnGovernance['visibleReplyAuthority'] | null
}): AlicizationExecutionPayoffStructured {
  const rendered = buildAlicizationExecutionPayoffStructuredReply({
    ...input,
    thought: null,
    emotion: null,
    delivery: null,
    performance: null,
    visibleReplyAuthority: input.visibleReplyAuthority ?? 'llm-second-pass-rewrite',
  })

  return {
    ...rendered,
    thought: input.selfContinuityAuthority?.authoritySummary
      ? `${sanitizeText(rendered.thought, 180)}; self=${sanitizeText(input.selfContinuityAuthority.authoritySummary, 120)}`
      : sanitizeText(rendered.thought, 220),
    reply: applyExecutionResultDeliveryPolicyToReply({
      policy: input.policy,
      reply: sanitizeText(rendered.reply, 220),
      status: input.status,
      personStateProjection: input.personStateProjection ?? null,
      hostPersonModel: input.hostPersonModel ?? null,
      selfContinuityAuthority: input.selfContinuityAuthority ?? null,
      goal: input.goal,
    }),
  }
}

export function normalizeAlicizationExecutionPayoffEmotion(raw: unknown, fallback: string) {
  const candidate = sanitizeText(raw, 48).toLowerCase()
  return allowedExecutionPayoffEmotions.has(candidate)
    ? candidate
    : fallback
}

export function normalizeAlicizationExecutionPayoffPerformance(
  raw: unknown,
  emotion: string,
  fallback: AlicizationExecutionPayoffStructured['performance'],
) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ...fallback,
      baseEmotion: emotion,
    }
  }

  const payload = raw as Record<string, unknown>
  const deliveryCandidate = sanitizeText(payload.delivery, 48).toLowerCase()
  const emphasis = Number.isFinite(payload.emphasis)
    ? Math.max(0, Math.min(2, Math.floor(Number(payload.emphasis))))
    : fallback.emphasis

  return {
    baseEmotion: emotion,
    facialCue: sanitizeText(payload.facialCue, 64) || fallback.facialCue,
    actionCue: sanitizeText(payload.actionCue, 64) || fallback.actionCue,
    delivery: allowedExecutionPayoffDeliveries.has(deliveryCandidate)
      ? deliveryCandidate
      : fallback.delivery,
    emphasis: emphasis as 0 | 1 | 2,
  }
}
