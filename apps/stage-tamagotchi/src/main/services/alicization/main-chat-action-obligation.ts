import type {
  AlicizationExecutionCapabilityInquiry,
  AlicizationExecutionRoutingIntent,

  analyzeAlicizationExecutionSemanticSignals,
} from '@proj-alicization/stage-shared'

import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import {
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

interface AlicizationActiveWorldThread {
  proposedChannel?: unknown
  selectedChannel?: unknown
  unresolved?: boolean
}

const executionRoutingToolMap: Partial<Record<AlicizationDispatchChannel, AlicizationExecutorToolName>> = {
  'cli': 'executor_run_cli',
  'codex': 'executor_run_codex',
  'claude-code': 'executor_run_claude_code',
  'openclaw': 'executor_run_openclaw',
  'browser': 'executor_run_local_visual',
  'software': 'executor_run_local_visual',
  'desktop': 'executor_run_local_visual',
}
const continuationCuePattern = /继续|接着|接下来|续上|接上|沿着刚才|按刚才|照刚才|continue|keep\s+going|go\s+on|resume|carry\s+on|pick\s+up\s+where\s+we\s+left\s+off/iu
const zhExecutionAffirmationPattern = /^(?:可以(?:做吧|开始|做)?|行(?:啊|吧)?|好[的啊呀]?(?:做吧)?|嗯嗯?|那就做吧|那你做吧|做吧|去做吧|开始吧|动手吧|改吧|那就改吧|去改吧|你做吧|来吧)$/u
const enExecutionAffirmationPattern = /^(?:ok|okay|yes|yeah|yep|sure|goahead|doit|pleasedo|startit|dothat)$/iu
const browserVisualCuePattern = /\b(?:browser|web\s?page|page|site|tab|url)\b|浏览器|网页|页面|标签页/u
const desktopVisualCuePattern = /\b(?:screen|scene|window|dialog|desktop|app(?:lication)?)\b|屏幕|界面|画面|窗口|桌面|软件|应用/u

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

export interface AlicizationRecentExecutionCallbackCandidate {
  channel: string | null | undefined
  createdAt?: number | null
  threadId?: string | null
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
  const visibleSceneLike = dialogueEncounter?.subject === 'visible-scene'
    || dialogueEncounter?.screenReferenceMode === 'required'
    || dialogueEncounter?.screenReferenceMode === 'helpful'
  const browserVisualLike = input.userSemanticSignals.hasBrowserArtifact
    || browserVisualCuePattern.test(combinedAnchor)
  const desktopVisualLike = input.userSemanticSignals.hasSoftwareArtifact
    || desktopVisualCuePattern.test(combinedAnchor)
  const visualLike = visibleSceneLike && (browserVisualLike || desktopVisualLike)
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
  if (visualLike && browserVisualLike && !desktopVisualLike)
    return ['browser'] as AlicizationDispatchChannel[]
  if (visualLike && desktopVisualLike && !browserVisualLike)
    return ['desktop'] as AlicizationDispatchChannel[]
  if (visualLike) {
    return browserVisualLike
      ? ['browser'] as AlicizationDispatchChannel[]
      : ['desktop'] as AlicizationDispatchChannel[]
  }
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
    .replace(/[，,。.!！？?\s]+/g, '')
    .toLowerCase()
}

function isExecutionAffirmationTurn(userText: string) {
  const compact = normalizeCompactUserText(userText)
  if (!compact)
    return false
  return zhExecutionAffirmationPattern.test(compact) || enExecutionAffirmationPattern.test(compact)
}

function resolveObligationSummary(values: unknown[], maxChars = 180) {
  for (const value of values) {
    const normalized = sanitizeText(value, maxChars)
    if (normalized)
      return normalized
  }
  return ''
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

function normalizeRecentExecutionCallbackChannel(
  callbacks: AlicizationRecentExecutionCallbackCandidate[],
): AlicizationDispatchChannel | null {
  for (const callback of callbacks) {
    const channel = sanitizeText(callback.channel, 48)
    if (channel === 'browser' || channel === 'software' || channel === 'desktop')
      return channel
  }
  return null
}

function shouldPreferRecentLocalVisualExecutor(input: {
  activeThreadId: string
  callbacks: AlicizationRecentExecutionCallbackCandidate[]
  continuationRequested: boolean
  explicitRoutingIntent: AlicizationExecutionRoutingIntent | null
}) {
  if (!input.continuationRequested || !input.explicitRoutingIntent)
    return false

  const explicitToolNames = new Set(input.explicitRoutingIntent.requiredToolNames)
  const explicitGroundingOnly = explicitToolNames.size > 0
    && [...explicitToolNames].every(name => name === 'browser_read_page' || name === 'desktop_inspect_scene')
  if (!explicitGroundingOnly)
    return false

  return input.callbacks.some((callback) => {
    const callbackThreadId = sanitizeText(callback.threadId, 160)
    const callbackChannel = sanitizeText(callback.channel, 48)
    if (!callbackThreadId || callbackThreadId !== input.activeThreadId)
      return false
    return callbackChannel === 'browser' || callbackChannel === 'software' || callbackChannel === 'desktop'
  })
}

function shouldUpgradeExplicitVisualGroundingToContinuationExecutor(input: {
  activeThread: AlicizationActiveWorldThread | null | undefined
  continuationRequested: boolean
  explicitRoutingIntent: AlicizationExecutionRoutingIntent | null
}) {
  if (!input.continuationRequested || !input.explicitRoutingIntent)
    return false

  if (input.activeThread?.unresolved !== true)
    return false

  const explicitToolNames = new Set(input.explicitRoutingIntent.requiredToolNames)
  return explicitToolNames.size > 0
    && [...explicitToolNames].every(name => name === 'browser_read_page' || name === 'desktop_inspect_scene')
}

function buildExplicitVisualContinuationRoutingIntent(input: {
  activeThread: AlicizationActiveWorldThread | null | undefined
  explicitRoutingIntent: AlicizationExecutionRoutingIntent
}) {
  const requestedChannels = input.explicitRoutingIntent.requestedChannels.filter((channel): channel is AlicizationDispatchChannel =>
    channel === 'browser' || channel === 'software' || channel === 'desktop',
  )
  if (requestedChannels.length === 0)
    return null

  const activeThreadChannel = sanitizeText(
    input.activeThread?.selectedChannel
    ?? input.activeThread?.proposedChannel,
    48,
  )
  const preferredChannel = requestedChannels.find(channel => channel === activeThreadChannel)
    ?? requestedChannels[0]

  return buildRoutingIntent({
    channels: [preferredChannel],
    reasonCodes: [
      'continue-thread',
      'upgrade-explicit-visual-grounding',
      'unresolved-active-visual-thread',
      ...(input.explicitRoutingIntent.reasonCodes ?? []),
    ],
  })
}

function buildRecentLocalVisualRoutingIntent(input: {
  activeThreadId: string
  callbacks: AlicizationRecentExecutionCallbackCandidate[]
  explicitRoutingIntent: AlicizationExecutionRoutingIntent | null
}) {
  const channel = normalizeRecentExecutionCallbackChannel(input.callbacks)
  if (!channel)
    return null

  return buildRoutingIntent({
    channels: [channel],
    reasonCodes: [
      'continue-thread',
      'recent-local-visual-callback',
      input.explicitRoutingIntent ? 'upgrade-explicit-visual-grounding' : '',
      input.activeThreadId ? 'matched-active-thread-callback' : '',
      ...((input.explicitRoutingIntent?.reasonCodes ?? [])),
    ].filter(Boolean),
  })
}

export function deriveMainChatActionObligation(input: {
  capabilityInquiry: AlicizationExecutionCapabilityInquiry
  explicitRoutingIntent?: AlicizationExecutionRoutingIntent | null
  pendingAffirmationThread?: AlicizationPendingAffirmationThreadCandidate | null
  recentExecutionCallbacks?: AlicizationRecentExecutionCallbackCandidate[] | null
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
  const recentExecutionCallbacks = input.recentExecutionCallbacks ?? []
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
    && activeThread?.unresolved === true,
  )
  const continuationRequested = (
    dialogueEncounter?.act === 'continue-thread'
    || continuityPolicyHoldsTaskThread
  ) && (continuationCueActive || wantsTaskExecution)
  const currentConsciousSpeakingIntention = sanitizeText(currentConsciousFrame?.speakingIntention, 180)
  const dialogueEncounterSummary = sanitizeText(dialogueEncounter?.summary, 180)
  const preferredAnswerSummary = currentConsciousSpeakingIntention || dialogueEncounterSummary

  if (input.capabilityInquiry.capabilityQuestion) {
    return {
      kind: 'answer',
      summary: userText,
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
      summary: resolveObligationSummary([
        pendingAffirmationThread.summary,
        pendingAffirmationThread.goal,
        userText,
      ]),
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
      summary: resolveObligationSummary([
        dialogueEncounter.summary,
        currentConsciousFrame?.consciousNeed,
        userText,
      ]),
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

  if (
    shouldPreferRecentLocalVisualExecutor({
      activeThreadId: sanitizeText(activeThread?.id, 160),
      callbacks: recentExecutionCallbacks,
      continuationRequested,
      explicitRoutingIntent,
    })
  ) {
    const localVisualRoutingIntent = buildRecentLocalVisualRoutingIntent({
      activeThreadId: sanitizeText(activeThread?.id, 160),
      callbacks: recentExecutionCallbacks,
      explicitRoutingIntent,
    })
    if (localVisualRoutingIntent) {
      return {
        kind: 'continue-task',
        summary: resolveObligationSummary([
          dialogueEncounter?.summary,
          currentConsciousFrame?.speakingIntention,
          activeThread?.summary,
          userText,
        ]),
        confidence: clamp01(
          (dialogueEncounter?.confidence ?? 0.52) * 0.34
          + (currentConsciousFrame?.confidence ?? 0.42) * 0.16
          + (activeThread?.confidence ?? 0.38) * 0.14
          + 0.28,
        ),
        routingIntent: localVisualRoutingIntent,
        source: 'explicit-routing',
        reasonCodes: localVisualRoutingIntent.reasonCodes,
      }
    }
  }

  if (
    explicitRoutingIntent
    && shouldUpgradeExplicitVisualGroundingToContinuationExecutor({
      activeThread,
      continuationRequested,
      explicitRoutingIntent,
    })
  ) {
    const localVisualRoutingIntent = buildExplicitVisualContinuationRoutingIntent({
      activeThread,
      explicitRoutingIntent,
    })
    if (localVisualRoutingIntent) {
      return {
        kind: 'continue-task',
        summary: resolveObligationSummary([
          dialogueEncounter?.summary,
          currentConsciousFrame?.speakingIntention,
          activeThread?.summary,
          userText,
        ]),
        confidence: clamp01(
          (dialogueEncounter?.confidence ?? 0.52) * 0.34
          + (currentConsciousFrame?.confidence ?? 0.42) * 0.16
          + (activeThread?.confidence ?? 0.38) * 0.14
          + 0.24,
        ),
        routingIntent: localVisualRoutingIntent,
        source: 'explicit-routing',
        reasonCodes: unique([
          'continue-thread',
          'explicit-routing-intent',
          continuationCueActive ? 'continuation-cue' : '',
          ...localVisualRoutingIntent.reasonCodes,
        ]),
      }
    }
  }

  if (explicitRoutingIntent) {
    return {
      kind: continuationRequested ? 'continue-task' : 'execute',
      summary: resolveObligationSummary([
        dialogueEncounter?.summary,
        currentConsciousFrame?.speakingIntention,
        userText,
      ]),
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
      summary: resolveObligationSummary([
        dialogueEncounter.summary,
        currentConsciousFrame?.consciousNeed,
        userText,
      ]),
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
      summary: resolveObligationSummary([
        currentConsciousFrame?.speakingIntention,
        dialogueEncounter?.summary,
        conversationState?.jointThread,
        activeThread?.summary,
        userText,
      ]),
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
    summary: resolveObligationSummary([
      userText,
      preferredAnswerSummary,
      currentConsciousFrame?.speakingIntention,
      conversationState?.jointThread,
    ]),
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
