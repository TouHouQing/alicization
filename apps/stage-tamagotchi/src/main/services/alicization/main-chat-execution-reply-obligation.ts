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

function sanitizeText(raw: unknown, maxChars = 200) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function pushUnique(target: string[], value: string) {
  const normalized = sanitizeText(value, 240)
  if (!normalized || target.includes(normalized))
    return
  target.push(normalized)
}

function mergeUniqueRules(values: Array<string | null | undefined>, maxItems = 12) {
  const merged: string[] = []
  for (const value of values) {
    pushUnique(merged, value ?? '')
    if (merged.length >= maxItems)
      break
  }
  return merged
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

const executionResultFollowUpCuePattern = /刚才|刚刚|结果|进展|状态|成功了吗|失败了吗|跑完|完成了没|完成没有|那个命令|那个任务|上个任务|callback|result|status|how did it go|what happened|did it finish|did it fail|did it work/i

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

function buildStatusInstruction(status: AlicizationMainChatExecutionReplyObligation['status']) {
  if (status === 'completed')
    return 'State plainly that the task already finished and surface the strongest outcome before any new planning.'
  if (status === 'failed' || status === 'blocked' || status === 'cancelled')
    return 'State plainly that the task did not complete successfully and surface the strongest available reason before any next-step advice.'
  if (status === 'running' || status === 'planned' || status === 'needs-affirmation')
    return 'State plainly that the task is not finished yet before any speculation or follow-up planning.'
  return 'State the freshest known execution status plainly before moving on.'
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
  obligation: AlicizationMainChatExecutionReplyObligation,
) {
  const mustDo: string[] = []
  const mustNotDo: string[] = []

  pushUnique(mustDo, 'Use the first sentence to pay off the freshest executor result for the current follow-up.')
  pushUnique(mustDo, buildStatusInstruction(obligation.status))
  pushUnique(
    mustDo,
    obligation.outcome
      ? 'Surface the strongest settled outcome from that prior task before proposing anything new.'
      : 'Surface the freshest known executor status before proposing anything new.',
  )

  pushUnique(mustNotDo, 'Do not bury the executor result behind scene narration, comfort language, or persona-preface.')
  pushUnique(mustNotDo, 'Do not imply the task re-ran in this exact turn unless new tool output appears now.')

  return {
    mustDo,
    mustNotDo,
  }
}

export function applyMainChatExecutionReplyObligationToGovernance(
  governance: AlicizationMindTurnGovernance | null,
  obligation: AlicizationMainChatExecutionReplyObligation | null,
): AlicizationMindTurnGovernance | null {
  if (!governance || !obligation)
    return governance

  const visibleSurfaceRules = buildMainChatExecutionReplyVisibleSurfaceRules(obligation)
  return {
    ...governance,
    openingStyle: 'direct-answer',
    mustDo: mergeUniqueRules([
      ...visibleSurfaceRules.mustDo,
      ...(governance.mustDo ?? []),
    ]),
    mustNotDo: mergeUniqueRules([
      ...visibleSurfaceRules.mustNotDo,
      ...(governance.mustNotDo ?? []),
    ]),
  }
}

export function deriveMainChatExecutionReplyObligation(input: {
  callbackContext: AlicizationExecutionCallbackContext
  ledgerContext: AlicizationExecutionLedgerContext
  messages: Message[]
}): AlicizationMainChatExecutionReplyObligation | null {
  const followUpQuestion = isExecutionResultFollowUp(input.messages)
  const latestCallback = pickLatestCallback(input.callbackContext.callbacks)
  if (latestCallback && followUpQuestion) {
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

  const latestLedgerEntry = pickLatestLedgerEntry(input.ledgerContext.entries)
  if (latestLedgerEntry && followUpQuestion) {
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

  return null
}

export function buildMainChatExecutionReplyObligationSystemBlock(obligation: AlicizationMainChatExecutionReplyObligation) {
  const visibleSurfaceRules = buildMainChatExecutionReplyVisibleSurfaceRules(obligation)
  return [
    '[ALICIZATION_EXECUTION_REPLY_OBLIGATION]',
    'This turn is following up on a recent executor result and must pay that result off directly.',
    'Use the first sentence to answer the execution-result follow-up before any new planning, comfort language, or persona flourish.',
    'Treat this result as already settled in prior runtime continuity. Do not imply the task re-ran in this exact turn unless a tool is called again now.',
    buildStatusInstruction(obligation.status),
    'Visible-surface must do:',
    ...visibleSurfaceRules.mustDo.map(item => `- ${item}`),
    'Visible-surface must not do:',
    ...visibleSurfaceRules.mustNotDo.map(item => `- ${item}`),
    `Source: ${obligation.source}.`,
    `Follow-up question detected: ${obligation.followUpQuestion ? 'yes' : 'no'}.`,
    `Channel: ${obligation.channel}.`,
    `Status: ${obligation.status}.`,
    `Goal: ${obligation.goal}.`,
    `Summary: ${obligation.summary}.`,
    obligation.outcome ? `Outcome: ${obligation.outcome}.` : '',
  ].filter(Boolean).join('\n')
}
