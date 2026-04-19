import type {
  AlicizationExecutionCapabilityInquiry,
  AlicizationExecutionRoutingIntent,
} from '@proj-alicization/stage-shared'

import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import {
  analyzeAlicizationExecutionSemanticSignals,
  analyzeAlicizationExecutionTurnAuthority,
  hasExplicitAlicizationExecutionDemand,
} from '@proj-alicization/stage-shared'

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

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

type AlicizationDispatchChannel = AlicizationExecutionRoutingIntent['requestedChannels'][number]
type AlicizationExecutorToolName = AlicizationExecutionRoutingIntent['requiredToolNames'][number]

const executionRoutingToolMap: Record<AlicizationDispatchChannel, AlicizationExecutorToolName> = {
  'cli': 'executor_run_cli',
  'codex': 'executor_run_codex',
  'claude-code': 'executor_run_claude_code',
  'openclaw': 'executor_run_openclaw',
}
const continuationCuePattern = /继续|接着|接下来|续上|接上|沿着刚才|按刚才|照刚才|continue|keep\s+going|go\s+on|resume|carry\s+on|pick\s+up\s+where\s+we\s+left\s+off/iu
const zhExecutionAffirmationPattern = /^(?:可以(?:做吧|开始|做)?|行(?:啊|吧)?|好(?:的|啊|呀)?(?:做吧)?|嗯嗯?|那就做吧|那你做吧|做吧|去做吧|开始吧|动手吧|改吧|那就改吧|去改吧|你做吧|来吧)$/u
const enExecutionAffirmationPattern = /^(?:ok|okay|yes|yeah|yep|sure|goahead|doit|pleasedo|startit|dothat)$/iu

export type AlicizationMainChatActionObligationKind
  = | 'answer'
    | 'clarify'
    | 'inspect'
    | 'execute'
    | 'continue-task'

export interface AlicizationPendingAffirmationThreadCandidate {
  affirmationReasonCodes: string[]
  goal: string
  proposedChannel: AlicizationDispatchChannel | null
  selectedChannel: AlicizationDispatchChannel | null
  summary: string
  threadId: string
}

export interface AlicizationMainChatActionObligation {
  confidence: number
  kind: AlicizationMainChatActionObligationKind
  reasonCodes: string[]
  resumePendingThreadChannel?: AlicizationDispatchChannel | null
  resumePendingThreadId?: string | null
  routingIntent: AlicizationExecutionRoutingIntent | null
  source: 'capability-inquiry' | 'explicit-routing' | 'dialogue-governance' | 'pending-affirmation'
  summary: string
}

function buildRoutingIntent(input: {
  channels: AlicizationDispatchChannel[]
  reasonCodes: string[]
}): AlicizationExecutionRoutingIntent | null {
  const requestedChannels = unique(input.channels)
  if (requestedChannels.length === 0)
    return null

  return {
    requestedChannels,
    requiredToolNames: requestedChannels
      .map(channel => executionRoutingToolMap[channel])
      .filter((name): name is AlicizationExecutorToolName => Boolean(name)),
    reasonCodes: unique(input.reasonCodes),
  }
}

function inferTaskExecutionChannels(input: {
  dialogueFirst: boolean
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  userSemanticSignals: ReturnType<typeof analyzeAlicizationExecutionSemanticSignals>
}) {
  const runtimeSurface = input.runtimeSurface ?? null
  const dialogueEncounter = runtimeSurface?.dialogue.dialogueEncounter ?? null
  const discourseState = runtimeSurface?.dialogue.discourseState ?? null
  const currentConsciousFrame = runtimeSurface?.dialogue.currentConsciousFrame ?? null
  const activeThread = runtimeSurface?.world.worldModel?.activeThread ?? null
  const taskAnchor = sanitizeText(dialogueEncounter?.taskAnchor, 180)
  const threadAnchor = sanitizeText(activeThread?.title ?? activeThread?.summary, 180)
  const combinedAnchor = `${taskAnchor} ${threadAnchor}`.trim()
  const terminalLike = input.userSemanticSignals.hasCommandLiteral
    || input.userSemanticSignals.hasCommandToken
    || input.userSemanticSignals.hasShellLikeStructure
    || input.userSemanticSignals.hasToolReference
    || (input.userSemanticSignals.hasFilesystemPathReference && input.userSemanticSignals.hasExecutionSignal)
    || /\b(?:terminal|shell|cli)\b/iu.test(combinedAnchor)
  const visualLike = (input.userSemanticSignals.hasBrowserArtifact || input.userSemanticSignals.hasSoftwareArtifact)
    && (
      dialogueEncounter?.subject === 'visible-scene'
      || dialogueEncounter?.screenReferenceMode === 'required'
      || dialogueEncounter?.screenReferenceMode === 'helpful'
    )
  const codingThreadLike = activeThread?.kind === 'debugging'
    || activeThread?.kind === 'change-review'
    || activeThread?.kind === 'deep-focus'
    || activeThread?.kind === 'recovery'
  const codingIntentLike = discourseState?.owedAction === 'guide-task'
    || currentConsciousFrame?.centerOfGravity === 'guide'
    || input.userSemanticSignals.hasCodeArtifact
    || /\b(?:diff|patch|refactor|trace|review|debug|code|bug|regression)\b/iu.test(combinedAnchor)
    || /代码|报错|回归|改动|补丁|重构|调试/u.test(combinedAnchor)
  const explicitExecutionDemand = hasExplicitAlicizationExecutionDemand(input.userSemanticSignals)

  if (input.userSemanticSignals.mentionedDispatchChannels.length > 0)
    return input.userSemanticSignals.mentionedDispatchChannels
  if (input.dialogueFirst && !explicitExecutionDemand)
    return [] as AlicizationDispatchChannel[]
  if (visualLike)
    return ['openclaw'] as AlicizationDispatchChannel[]
  if (terminalLike)
    return ['cli'] as AlicizationDispatchChannel[]
  if (codingThreadLike || codingIntentLike)
    return ['codex', 'claude-code'] as AlicizationDispatchChannel[]
  return [] as AlicizationDispatchChannel[]
}

function hasContinuationCue(userText: string) {
  if (!userText)
    return false
  return continuationCuePattern.test(userText)
}

function normalizeCompactUserText(raw: string) {
  return sanitizeText(raw, 240)
    .replace(/[，,。.!！？?？\s]+/g, '')
    .toLowerCase()
}

function isExecutionAffirmationTurn(userText: string) {
  const compact = normalizeCompactUserText(userText)
  if (!compact)
    return false
  return zhExecutionAffirmationPattern.test(compact) || enExecutionAffirmationPattern.test(compact)
}

function buildPendingAffirmationRoutingIntent(thread: AlicizationPendingAffirmationThreadCandidate) {
  const channel = thread.selectedChannel ?? thread.proposedChannel
  if (!channel)
    return null
  return buildRoutingIntent({
    channels: [channel],
    reasonCodes: [
      'resume-pending-affirmation-thread',
      ...thread.affirmationReasonCodes,
    ],
  })
}

export function deriveMainChatActionObligation(input: {
  capabilityInquiry: AlicizationExecutionCapabilityInquiry
  explicitRoutingIntent?: AlicizationExecutionRoutingIntent | null
  pendingAffirmationThread?: AlicizationPendingAffirmationThreadCandidate | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  userText: string
}): AlicizationMainChatActionObligation {
  const runtimeSurface = input.runtimeSurface ?? null
  const dialogueEncounter = runtimeSurface?.dialogue.dialogueEncounter ?? null
  const discourseState = runtimeSurface?.dialogue.discourseState ?? null
  const conversationState = runtimeSurface?.dialogue.conversationState ?? null
  const currentConsciousFrame = runtimeSurface?.dialogue.currentConsciousFrame ?? null
  const activeThread = runtimeSurface?.world.worldModel?.activeThread ?? null
  const explicitRoutingIntent = input.explicitRoutingIntent ?? null
  const pendingAffirmationThread = input.pendingAffirmationThread ?? null
  const userText = sanitizeText(input.userText, 320)
  const executionTurnAuthority = analyzeAlicizationExecutionTurnAuthority(userText)
  const userSemanticSignals = executionTurnAuthority.semanticSignals
  const dialogueFirst = dialogueEncounter?.dialogueFirst === true || discourseState?.screenReferenceMode === 'avoid'
  const wantsTaskExecution = executionTurnAuthority.executionBound || Boolean(explicitRoutingIntent)
  const explicitExecutionDemand = executionTurnAuthority.explicitExecutionDemand
  const continuationCueActive = hasContinuationCue(userText)
  const continuityPolicyHoldsTaskThread = Boolean(
    conversationState?.shouldHoldThread === true
    && conversationState?.continuityPolicy === 'stay-on-thread'
    && activeThread?.unresolved === true
  )
  const continuationRequested = (
    dialogueEncounter?.act === 'continue-thread'
    || continuityPolicyHoldsTaskThread
  ) && (continuationCueActive || wantsTaskExecution)

  if (input.capabilityInquiry.capabilityQuestion) {
    return {
      kind: 'answer',
      summary: 'The host is asking about execution capability availability, not requesting execution yet.',
      confidence: 0.96,
      routingIntent: null,
      source: 'capability-inquiry',
      reasonCodes: unique([
        'capability-question',
        ...input.capabilityInquiry.mentionedChannels.map(channel => `channel:${channel}`),
      ]),
    }
  }

  if (pendingAffirmationThread && isExecutionAffirmationTurn(userText)) {
    const routingIntent = buildPendingAffirmationRoutingIntent(pendingAffirmationThread)
    return {
      kind: 'continue-task',
      summary: sanitizeText(
        pendingAffirmationThread.summary
        || `The host affirmed the pending execution proposal for ${pendingAffirmationThread.goal}.`,
        180,
      ) || `The host affirmed the pending execution proposal for ${pendingAffirmationThread.goal}.`,
      confidence: 0.96,
      routingIntent,
      source: 'pending-affirmation',
      resumePendingThreadId: pendingAffirmationThread.threadId,
      resumePendingThreadChannel: pendingAffirmationThread.selectedChannel ?? pendingAffirmationThread.proposedChannel ?? null,
      reasonCodes: unique([
        'affirmed-pending-execution-proposal',
        'resume-pending-affirmation-thread',
        ...pendingAffirmationThread.affirmationReasonCodes,
      ]),
    }
  }

  if (dialogueEncounter?.shouldAskClarifyingQuestion) {
    return {
      kind: 'clarify',
      summary: sanitizeText(
        dialogueEncounter.summary
        || currentConsciousFrame?.consciousNeed
        || 'The host turn needs one concrete clarification before acting.',
        180,
      ) || 'The host turn needs one concrete clarification before acting.',
      confidence: clamp01(
        (dialogueEncounter?.confidence ?? 0.52) * 0.72
        + (currentConsciousFrame?.confidence ?? 0.38) * 0.12
        + 0.16,
      ),
      routingIntent: null,
      source: 'dialogue-governance',
      reasonCodes: unique([
        'clarify-before-claiming',
        dialogueEncounter?.mustRepairFirst ? 'repair-pressure' : '',
        discourseState?.owedAction ? `owed-action:${discourseState.owedAction}` : '',
      ].filter(Boolean)),
    }
  }

  if (explicitRoutingIntent) {
    return {
      kind: continuationRequested ? 'continue-task' : 'execute',
      summary: sanitizeText(
        dialogueEncounter?.summary
        || currentConsciousFrame?.speakingIntention
        || 'The host explicitly requested real task execution in this turn.',
        180,
      ) || 'The host explicitly requested real task execution in this turn.',
      confidence: clamp01(
        (dialogueEncounter?.confidence ?? 0.52) * 0.36
        + (currentConsciousFrame?.confidence ?? 0.42) * 0.14
        + 0.48,
      ),
      routingIntent: explicitRoutingIntent,
      source: 'explicit-routing',
      reasonCodes: unique([
        continuationRequested ? 'continue-thread' : 'execute-now',
        'explicit-routing-intent',
        continuationCueActive ? 'continuation-cue' : '',
        ...explicitRoutingIntent.reasonCodes,
      ]),
    }
  }

  if (discourseState?.owedAction === 'inspect-scene' && dialogueEncounter?.inspectionRequested) {
    return {
      kind: 'inspect',
      summary: sanitizeText(
        dialogueEncounter.summary
        || currentConsciousFrame?.consciousNeed
        || 'The turn owes scene inspection before a stronger claim.',
        180,
      ) || 'The turn owes scene inspection before a stronger claim.',
      confidence: clamp01(
        (dialogueEncounter?.confidence ?? 0.48) * 0.58
        + (currentConsciousFrame?.confidence ?? 0.34) * 0.18
        + 0.18,
      ),
      routingIntent: null,
      source: 'dialogue-governance',
      reasonCodes: unique([
        'inspect-scene',
        dialogueEncounter?.inspectionState ? `inspection-state:${dialogueEncounter.inspectionState}` : '',
        discourseState?.owedAction ? `owed-action:${discourseState.owedAction}` : '',
      ].filter(Boolean)),
    }
  }

  const inferredChannels = inferTaskExecutionChannels({
    dialogueFirst,
    runtimeSurface,
    userSemanticSignals,
  })
  const taskBoundTurn = dialogueEncounter?.mustStayTaskBound === true
    || discourseState?.owedAction === 'guide-task'
    || discourseState?.owedAction === 'repair-truth'
  const inferredRoutingIntent = buildRoutingIntent({
    channels: inferredChannels,
    reasonCodes: [
      continuationRequested ? 'continue-thread' : 'execute-now',
      continuationCueActive ? 'continuation-cue' : '',
      wantsTaskExecution ? 'task-execution-cue' : '',
      userSemanticSignals.hasExecutionSignal ? 'semantic-execution-signal' : '',
      dialogueFirst && explicitExecutionDemand ? 'dialogue-first-explicit-execution-demand' : '',
      taskBoundTurn ? 'task-bound-turn' : '',
      activeThread?.unresolved ? 'unresolved-active-thread' : '',
      ...userSemanticSignals.mentionedDispatchChannels.map(channel => `mentioned-dispatch:${channel}`),
      discourseState?.owedAction ? `owed-action:${discourseState.owedAction}` : '',
      currentConsciousFrame?.centerOfGravity ? `center-of-gravity:${currentConsciousFrame.centerOfGravity}` : '',
    ].filter(Boolean),
  })

  if (
    inferredRoutingIntent
    && (
      continuationRequested
      || (wantsTaskExecution && (inferredChannels.length > 0 || taskBoundTurn))
    )
  ) {
    return {
      kind: continuationRequested ? 'continue-task' : 'execute',
      summary: sanitizeText(
        currentConsciousFrame?.speakingIntention
        || dialogueEncounter?.summary
        || conversationState?.jointThread
        || activeThread?.summary
        || 'The current governed turn should move the active task thread forward through execution.',
        180,
      ) || 'The current governed turn should move the active task thread forward through execution.',
      confidence: clamp01(
        (dialogueEncounter?.confidence ?? 0.44) * 0.28
        + (conversationState?.confidence ?? 0.4) * 0.18
        + (currentConsciousFrame?.confidence ?? 0.42) * 0.18
        + (activeThread?.confidence ?? 0.38) * 0.12
        + (continuationRequested ? 0.18 : 0.12)
        + (wantsTaskExecution ? 0.14 : 0.06),
      ),
      routingIntent: inferredRoutingIntent,
      source: 'dialogue-governance',
      reasonCodes: inferredRoutingIntent.reasonCodes,
    }
  }

  return {
    kind: 'answer',
    summary: sanitizeText(
      dialogueEncounter?.summary
      || currentConsciousFrame?.speakingIntention
      || conversationState?.jointThread
      || 'The turn should stay on direct truthful reply rather than action dispatch.',
      180,
    ) || 'The turn should stay on direct truthful reply rather than action dispatch.',
    confidence: clamp01(
      (dialogueEncounter?.confidence ?? 0.42) * 0.34
      + (conversationState?.confidence ?? 0.4) * 0.16
      + (currentConsciousFrame?.confidence ?? 0.38) * 0.18
      + 0.22,
    ),
    routingIntent: null,
    source: 'dialogue-governance',
    reasonCodes: unique([
      discourseState?.owedAction ? `owed-action:${discourseState.owedAction}` : 'owed-action:answer-general',
      dialogueFirst ? 'dialogue-first' : '',
      taskBoundTurn ? 'stay-task-bound' : '',
    ].filter(Boolean)),
  }
}

export function buildMainChatActionObligationSystemBlock(obligation: AlicizationMainChatActionObligation) {
  return [
    '[ALICIZATION_ACTION_OBLIGATION]',
    'This block is the turn-level action authority derived from dialogue governance, not a generic tool hint.',
    `Primary action obligation: ${obligation.kind}.`,
    `Summary: ${obligation.summary}.`,
    `Source: ${obligation.source}.`,
    `Routing required: ${obligation.routingIntent ? 'yes' : 'no'}.`,
    obligation.routingIntent
      ? `Allowed executor tools for this turn: ${obligation.routingIntent.requiredToolNames.join(', ')}.`
      : 'No executor routing is required before speaking in this turn.',
    obligation.reasonCodes.length > 0
      ? `Reason codes: ${obligation.reasonCodes.join(', ')}.`
      : '',
    'Downstream execution routing may narrow tool choice, but it must not contradict this obligation.',
  ].filter(Boolean).join('\n')
}
