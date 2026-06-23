import type {
  AlicizationExecutionEventRecord,
  AlicizationListExecutionEventsInput,
  AlicizationListTaskThreadsInput,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'
import type { ContextualConversationTurn } from './runtime-soul'

import {
  readExecutionOutcome,
  readTaskThreadActivityAt,
  sanitizeExecutionLedgerText,
  uniqueExecutionLedgerValues,
} from './execution-ledger-shared'

export interface AlicizationExecutionLedgerContext {
  entries: AlicizationExecutionLedgerDigest[]
  recallText: string
  systemBlock: string
}

export interface AlicizationExecutionLedgerDigest {
  activityAt: number
  channel: string
  eventKinds: string[]
  goal: string
  outcome: string
  status: string
  summary: string
}

export const emptyAlicizationExecutionLedgerContext: AlicizationExecutionLedgerContext = {
  entries: [],
  recallText: '',
  systemBlock: '',
}

interface AlicizationExecutionLedgerRuntimeOptions {
  getNow?: () => number
  listExecutionEvents: (input?: AlicizationListExecutionEventsInput) => Promise<AlicizationExecutionEventRecord[]>
  listTaskThreads: (input?: AlicizationListTaskThreadsInput) => Promise<AlicizationTaskThreadRecord[]>
}

const executionCuePattern = /刚才|刚刚|结果|进展|状态|成功了吗|失败了吗|跑完|完成了没|继续|接着|那个命令|那个任务|执行|工具|cli|codex|claude|openclaw|command|task|tool|result|status|通过原因|排查建议|风险|did it|what happened|how did it go|why did it pass|next steps|risk/i
const executionMentionPattern = /执行|命令|任务|工具|cli|codex|claude|openclaw|command|task|tool|run|patch|fix/i
const ledgerMaxThreadAgeMs = 15 * 60_000

function shouldRecallExecutionLedger(input: {
  recentThreads: AlicizationTaskThreadRecord[]
  recentTurns: ContextualConversationTurn[]
  userText: string
}) {
  const normalizedUserText = sanitizeExecutionLedgerText(input.userText, 160)
  if (!normalizedUserText)
    return false

  const shortFollowUp = normalizedUserText.length <= 24
  const hasExplicitCue = executionCuePattern.test(normalizedUserText)
  const hasRecentActiveThread = input.recentThreads.some(thread =>
    thread.status === 'running'
    || thread.status === 'planned'
    || thread.status === 'needs-affirmation'
    || thread.status === 'blocked',
  )
  const hasRecentSettledThread = input.recentThreads.some(thread =>
    thread.status === 'completed'
    || thread.status === 'failed'
    || thread.status === 'cancelled',
  )
  const recentTurnsMentionExecution = input.recentTurns.some(turn =>
    executionMentionPattern.test(turn.userText)
    || executionMentionPattern.test(turn.assistantText),
  )

  return hasExplicitCue
    || hasRecentActiveThread
    || (hasRecentSettledThread && (hasExplicitCue || shortFollowUp))
    || (shortFollowUp && recentTurnsMentionExecution)
}

function buildExecutionLedgerItem(input: {
  events: AlicizationExecutionEventRecord[]
  thread: AlicizationTaskThreadRecord
}): AlicizationExecutionLedgerDigest {
  const goal = sanitizeExecutionLedgerText(input.thread.goal, 140) || 'the current task'
  const summary = sanitizeExecutionLedgerText(input.thread.summary, 180)
  const eventKinds = uniqueExecutionLedgerValues(
    [...input.events]
      .sort((left, right) => left.createdAt - right.createdAt)
      .map(event => sanitizeExecutionLedgerText(event.kind, 24)),
  )
  const outcome = readExecutionOutcome(input.events)

  return {
    activityAt: readTaskThreadActivityAt(input.thread),
    channel: sanitizeExecutionLedgerText(input.thread.selectedChannel ?? input.thread.proposedChannel ?? 'unknown', 48) || 'unknown',
    status: sanitizeExecutionLedgerText(input.thread.status, 48) || 'unknown',
    goal,
    summary,
    eventKinds,
    outcome,
  }
}

function buildExecutionLedgerRecallText(items: AlicizationExecutionLedgerDigest[]) {
  return items.map(item => [
    `execution_channel:${item.channel}`,
    `execution_status:${item.status}`,
    `execution_goal:${item.goal}`,
    item.summary ? `execution_summary:${item.summary}` : '',
    item.eventKinds.length > 0 ? `execution_events:${item.eventKinds.join(',')}` : '',
    item.outcome ? `execution_outcome:${item.outcome}` : '',
  ].filter(Boolean).join(' ')).join('\n')
}

function buildExecutionLedgerSystemBlock(items: AlicizationExecutionLedgerDigest[]) {
  if (items.length === 0)
    return ''

  return [
    '[ALICIZATION_EXECUTION_LEDGER]',
    'Recent structured executor history for the current session.',
    'Treat only these entries as actually executed. Do not invent missing actions or results.',
    ...items.map(item => [
      `- channel=${item.channel}`,
      `status=${item.status}`,
      `goal=${item.goal}`,
      item.summary ? `summary=${item.summary}` : '',
      item.eventKinds.length > 0 ? `events=${item.eventKinds.join(',')}` : '',
      item.outcome ? `outcome=${item.outcome}` : '',
    ].filter(Boolean).join(' | ')),
  ].join('\n')
}

export function createAlicizationMemoryLedgerRuntime(options: AlicizationExecutionLedgerRuntimeOptions) {
  const getNow = options.getNow ?? Date.now

  async function buildExecutionLedgerContext(input: {
    recentTurns?: ContextualConversationTurn[]
    sessionId: string
    userText: string
  }): Promise<AlicizationExecutionLedgerContext> {
    const sessionId = sanitizeExecutionLedgerText(input.sessionId, 160)
    const userText = sanitizeExecutionLedgerText(input.userText, 160)
    if (!sessionId || !userText)
      return emptyAlicizationExecutionLedgerContext

    const rawThreads = await options.listTaskThreads({
      sessionId,
      limit: 6,
    }).catch(() => [])
    const recentThreads = rawThreads
      .filter(thread => getNow() - readTaskThreadActivityAt(thread) <= ledgerMaxThreadAgeMs)
      .sort((left, right) => readTaskThreadActivityAt(right) - readTaskThreadActivityAt(left))
      .slice(0, 2)

    if (recentThreads.length === 0)
      return emptyAlicizationExecutionLedgerContext

    if (!shouldRecallExecutionLedger({
      userText,
      recentTurns: input.recentTurns ?? [],
      recentThreads,
    })) {
      return emptyAlicizationExecutionLedgerContext
    }

    const items = await Promise.all(recentThreads.map(async (thread) => {
      const events = await options.listExecutionEvents({
        threadId: thread.id,
        limit: 8,
      }).catch(() => [])
      return buildExecutionLedgerItem({
        thread,
        events,
      })
    }))

    return {
      entries: items,
      recallText: buildExecutionLedgerRecallText(items),
      systemBlock: buildExecutionLedgerSystemBlock(items),
    }
  }

  return {
    buildExecutionLedgerContext,
  }
}
