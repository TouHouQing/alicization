import type { Message } from '@xsai/shared-chat'

import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type {
  AlicizationExecutionCallbackContext,
  AlicizationExecutionCallbackDigest,
} from './execution-callback-runtime'
import type {
  AlicizationExecutionLedgerContext,
  AlicizationExecutionLedgerDigest,
} from './memory-ledger-runtime'

import { buildAlicizationProviderFactBlock } from '@proj-alicization/stage-shared'

function sanitizeText(raw: unknown, maxChars = 200) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function readMessageContentAsText(content: unknown) {
  if (typeof content === 'string')
    return content
  if (!Array.isArray(content))
    return ''

  return content.map((part) => {
    if (typeof part === 'string')
      return part
    if (part && typeof part === 'object' && 'text' in part)
      return sanitizeText((part as { text?: unknown }).text, 1_000)
    return ''
  }).filter(Boolean).join('\n')
}

function readLatestUserMessageText(messages: Message[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user')
      continue
    return sanitizeText(readMessageContentAsText(message.content), 400)
  }

  return ''
}

function pickLatestCallback(callbacks: AlicizationExecutionCallbackDigest[]) {
  return [...callbacks].sort((left, right) => right.createdAt - left.createdAt)[0] ?? null
}

function pickLatestLedgerEntry(entries: AlicizationExecutionLedgerDigest[]) {
  return [...entries].sort((left, right) => right.activityAt - left.activityAt)[0] ?? null
}

function buildExecutionReplyObligationFromCallback(
  latestCallback: AlicizationExecutionCallbackDigest,
  followUpQuestion: boolean,
): AlicizationMainChatExecutionReplyObligation {
  return {
    channel: sanitizeText(latestCallback.channel, 48) || 'unknown',
    followUpQuestion,
    goal: sanitizeText(latestCallback.goal, 180) || 'the recent task',
    outcome: sanitizeText(latestCallback.outcome, 220),
    source: 'fresh-callback',
    status: normalizeExecutionStatus(latestCallback.status),
    summary: sanitizeText(latestCallback.summary, 220) || 'A fresh executor callback is waiting for direct payoff.',
  }
}

function buildExecutionReplyObligationFromLedgerEntry(
  latestLedgerEntry: AlicizationExecutionLedgerDigest,
  followUpQuestion: boolean,
): AlicizationMainChatExecutionReplyObligation {
  return {
    channel: sanitizeText(latestLedgerEntry.channel, 48) || 'unknown',
    followUpQuestion,
    goal: sanitizeText(latestLedgerEntry.goal, 180) || 'the recent task',
    outcome: sanitizeText(latestLedgerEntry.outcome, 220),
    source: 'ledger-follow-up',
    status: normalizeExecutionStatus(latestLedgerEntry.status),
    summary: sanitizeText(latestLedgerEntry.summary, 220) || 'A recent executor result is relevant to the current follow-up.',
  }
}

function shouldPreferFreshCallbackOverLedgerEntry(
  latestCallback: AlicizationExecutionCallbackDigest,
  latestLedgerEntry: AlicizationExecutionLedgerDigest,
) {
  const callbackStatus = normalizeExecutionStatus(latestCallback.status)
  const ledgerStatus = normalizeExecutionStatus(latestLedgerEntry.status)
  if (callbackStatus !== ledgerStatus)
    return false

  const callbackChannel = sanitizeText(latestCallback.channel, 48) || 'unknown'
  const ledgerChannel = sanitizeText(latestLedgerEntry.channel, 48) || 'unknown'
  if (callbackChannel !== ledgerChannel)
    return false

  const callbackGoal = sanitizeText(latestCallback.goal, 180)
  const ledgerGoal = sanitizeText(latestLedgerEntry.goal, 180)
  if (callbackGoal && ledgerGoal && callbackGoal !== ledgerGoal)
    return false

  const callbackOutcome = sanitizeText(latestCallback.outcome, 220)
  const ledgerOutcome = sanitizeText(latestLedgerEntry.outcome, 220)
  if (callbackOutcome && ledgerOutcome && callbackOutcome === ledgerOutcome)
    return true

  const callbackSummary = sanitizeText(latestCallback.summary, 220)
  const ledgerSummary = sanitizeText(latestLedgerEntry.summary, 220)
  if (callbackSummary && ledgerSummary && callbackSummary === ledgerSummary)
    return true

  return Boolean(
    (callbackOutcome && ledgerSummary.includes(callbackOutcome))
    || (ledgerOutcome && callbackSummary.includes(ledgerOutcome)),
  )
}

const executionResultFollowUpCuePattern = /刚才|刚刚|结果|进展|状态|成功了吗|失败了吗|跑完|完成了没|完成没有|还在等我确认吗|等我确认|要我确认|是不是卡住了|卡住了没|还卡着吗|那个命令|那个任务|上个任务|callback|result|status|how did it go|what happened|did it finish|did it fail|did it work|waiting for confirmation|stuck|blocked/i

function isExecutionResultFollowUp(messages: Message[]) {
  const latestUserText = readLatestUserMessageText(messages)
  if (!latestUserText)
    return false
  return executionResultFollowUpCuePattern.test(latestUserText)
}

function normalizeExecutionStatus(raw: string) {
  const status = sanitizeText(raw, 48).toLowerCase()
  if (status === 'completed')
    return 'completed'
  if (status === 'failed')
    return 'failed'
  if (status === 'blocked')
    return 'blocked'
  if (status === 'cancelled')
    return 'cancelled'
  if (status === 'running')
    return 'running'
  if (status === 'planned')
    return 'planned'
  if (status === 'needs-affirmation')
    return 'needs-affirmation'
  return 'unknown'
}

export interface AlicizationMainChatExecutionReplyObligation {
  channel: string
  followUpQuestion: boolean
  goal: string
  outcome: string
  source: 'fresh-callback' | 'ledger-follow-up'
  status: 'blocked' | 'cancelled' | 'completed' | 'failed' | 'needs-affirmation' | 'planned' | 'running' | 'unknown'
  summary: string
}

export function buildMainChatExecutionReplyVisibleSurfaceRules(
  _obligation: AlicizationMainChatExecutionReplyObligation,
) {
  return {
    mustDo: [] as string[],
    mustNotDo: [] as string[],
  }
}

export function applyMainChatExecutionReplyObligationToGovernance(
  governance: AlicizationMindTurnGovernance | null,
  _obligation: AlicizationMainChatExecutionReplyObligation | null,
): AlicizationMindTurnGovernance | null {
  return governance
}

export function deriveMainChatExecutionReplyObligation(input: {
  callbackContext: AlicizationExecutionCallbackContext
  ledgerContext: AlicizationExecutionLedgerContext
  messages: Message[]
}): AlicizationMainChatExecutionReplyObligation | null {
  const followUpQuestion = isExecutionResultFollowUp(input.messages)
  if (!followUpQuestion)
    return null

  const latestCallback = pickLatestCallback(input.callbackContext.callbacks)
  const latestLedgerEntry = pickLatestLedgerEntry(input.ledgerContext.entries)

  if (latestCallback && latestLedgerEntry) {
    if (
      latestLedgerEntry.activityAt > latestCallback.createdAt
      && !shouldPreferFreshCallbackOverLedgerEntry(latestCallback, latestLedgerEntry)
    ) {
      return buildExecutionReplyObligationFromLedgerEntry(latestLedgerEntry, followUpQuestion)
    }
    return buildExecutionReplyObligationFromCallback(latestCallback, followUpQuestion)
  }

  if (latestCallback)
    return buildExecutionReplyObligationFromCallback(latestCallback, followUpQuestion)

  if (latestLedgerEntry)
    return buildExecutionReplyObligationFromLedgerEntry(latestLedgerEntry, followUpQuestion)

  return null
}

export function buildMainChatExecutionReplyObligationSystemBlock(obligation: AlicizationMainChatExecutionReplyObligation) {
  return buildAlicizationProviderFactBlock('alicization-execution-reply-context', obligation)
}
