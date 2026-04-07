import type {
  AlicizationExecutionCapabilityInquiry,
  AlicizationExecutionRoutingIntent,
} from '@proj-alicization/stage-shared'

import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

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

const terminalActionCuePattern = /\b(?:typecheck|lint|build|test|vitest|eslint|prettier|pnpm|npm|yarn|bun|git|node|python|tsc|vue-tsc)\b|命令|终端|控制台|shell|cli|跑一下|跑个|执行下|执行一下|编译|构建|测试/iu
const taskExecutionCuePattern = /\b(?:run|execute|fix|patch|implement|edit|modify|refactor|trace|investigate|debug|review|continue|resume|finish|check)\b|帮我(?:[跑修改查看]|执行|排查|定位|处理|完成|继续)|修一下|改一下|补一下|跑一下|查一下|看下|看一下|排查|定位|调查|重构|继续|接着|处理一下|搞一下/iu
const visualActionCuePattern = /\b(?:click|close|open|drag|scroll|dismiss|move)\b|点击|关闭|打开|拖动|滚动|关掉|点掉|移动|弹窗/iu

type AlicizationDispatchChannel = AlicizationExecutionRoutingIntent['requestedChannels'][number]
type AlicizationExecutorToolName = AlicizationExecutionRoutingIntent['requiredToolNames'][number]

const executionRoutingToolMap: Record<AlicizationDispatchChannel, AlicizationExecutorToolName> = {
  'cli': 'executor_run_cli',
  'codex': 'executor_run_codex',
  'claude-code': 'executor_run_claude_code',
  'openclaw': 'executor_run_openclaw',
}

export type AlicizationMainChatActionObligationKind
  = | 'answer'
    | 'clarify'
    | 'inspect'
    | 'execute'
    | 'continue-task'

export interface AlicizationMainChatActionObligation {
  confidence: number
  kind: AlicizationMainChatActionObligationKind
  reasonCodes: string[]
  routingIntent: AlicizationExecutionRoutingIntent | null
  source: 'capability-inquiry' | 'explicit-routing' | 'dialogue-governance'
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
  userText: string
}) {
  const runtimeSurface = input.runtimeSurface ?? null
  const dialogueEncounter = runtimeSurface?.dialogue.dialogueEncounter ?? null
  const discourseState = runtimeSurface?.dialogue.discourseState ?? null
  const currentConsciousFrame = runtimeSurface?.dialogue.currentConsciousFrame ?? null
  const activeThread = runtimeSurface?.world.worldModel?.activeThread ?? null
  const userText = sanitizeText(input.userText, 320)
  const taskAnchor = sanitizeText(dialogueEncounter?.taskAnchor, 180)
  const threadAnchor = sanitizeText(activeThread?.title ?? activeThread?.summary, 180)
  const combinedAnchor = `${taskAnchor} ${threadAnchor}`.trim()
  const terminalLike = terminalActionCuePattern.test(userText)
    || /\b(?:terminal|shell|cli)\b/iu.test(combinedAnchor)
  const visualLike = visualActionCuePattern.test(userText)
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
    || /\b(?:diff|patch|refactor|trace|review|debug|code|bug|regression)\b/iu.test(combinedAnchor)
    || /代码|报错|回归|改动|补丁|重构|调试/u.test(combinedAnchor)

  if (input.dialogueFirst)
    return [] as AlicizationDispatchChannel[]
  if (visualLike)
    return ['openclaw'] as AlicizationDispatchChannel[]
  if (terminalLike)
    return ['cli'] as AlicizationDispatchChannel[]
  if (codingThreadLike || codingIntentLike)
    return ['codex', 'claude-code'] as AlicizationDispatchChannel[]
  return [] as AlicizationDispatchChannel[]
}

export function deriveMainChatActionObligation(input: {
  capabilityInquiry: AlicizationExecutionCapabilityInquiry
  explicitRoutingIntent?: AlicizationExecutionRoutingIntent | null
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
  const userText = sanitizeText(input.userText, 320)
  const dialogueFirst = dialogueEncounter?.dialogueFirst === true || discourseState?.screenReferenceMode === 'avoid'
  const continuationRequested = dialogueEncounter?.act === 'continue-thread'
    || (
      conversationState?.shouldHoldThread === true
      && conversationState?.continuityPolicy === 'stay-on-thread'
      && activeThread?.unresolved === true
    )
  const wantsTaskExecution = taskExecutionCuePattern.test(userText)

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
    userText,
  })
  const taskBoundTurn = dialogueEncounter?.mustStayTaskBound === true
    || discourseState?.owedAction === 'guide-task'
    || discourseState?.owedAction === 'repair-truth'
  const inferredRoutingIntent = buildRoutingIntent({
    channels: inferredChannels,
    reasonCodes: [
      continuationRequested ? 'continue-thread' : 'execute-now',
      wantsTaskExecution ? 'task-execution-cue' : '',
      taskBoundTurn ? 'task-bound-turn' : '',
      activeThread?.unresolved ? 'unresolved-active-thread' : '',
      discourseState?.owedAction ? `owed-action:${discourseState.owedAction}` : '',
      currentConsciousFrame?.centerOfGravity ? `center-of-gravity:${currentConsciousFrame.centerOfGravity}` : '',
    ].filter(Boolean),
  })

  if (
    inferredRoutingIntent
    && (
      continuationRequested
      || (wantsTaskExecution && (terminalActionCuePattern.test(userText) || taskBoundTurn))
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
