import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationExecutionEventRecord,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'
import type { AlicizationActiveDialogueFastPathDecision } from './main-chat-active-dialogue-loop'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'

import { buildAlicizationActiveDialogueGovernedReply } from './main-chat-active-dialogue-loop'
import {
  alicizationTerminalTaskThreadStatuses,
  readExecutionOutcome,
  readLatestExecutionEvent,
  readTaskThreadActivityAt,
  sanitizeExecutionLedgerText,
  uniqueExecutionLedgerValues,
} from './execution-ledger-shared'
import {
  buildAlicizationExecutionListingDisplayOrder,
  formatAlicizationExecutionListingPreviewName,
  parseAlicizationRequestedListingItemCount,
  resolveAlicizationExecutionListingSummary,
  wasAlicizationListingItemMentioned,
} from './execution-listing-surface'
import { readTransportContentAsText } from './runtime-transport-content'

interface AlicizationExecutionFollowUpPayoffResolverOptions {
  listExecutionEvents: (input?: {
    threadId?: string
    limit?: number
  }) => Promise<AlicizationExecutionEventRecord[]>
  listTaskThreads: (input?: {
    sessionId?: string
    limit?: number
  }) => Promise<AlicizationTaskThreadRecord[]>
}

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function readPreviousAssistantText(messages: Message[]) {
  let sawLatestUser = false
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (!sawLatestUser && message?.role === 'user') {
      sawLatestUser = true
      continue
    }
    if (!sawLatestUser || message?.role !== 'assistant')
      continue
    return sanitizeText(readTransportContentAsText(message.content), 2_000)
  }
  return ''
}

function combineExecutionStdout(events: AlicizationExecutionEventRecord[]) {
  const ordered = [...events].sort((left, right) => left.createdAt - right.createdAt)
  const stdoutFromResult = sanitizeExecutionLedgerText(
    readLatestExecutionEvent(ordered)?.payload && typeof readLatestExecutionEvent(ordered)?.payload === 'object'
      ? (readLatestExecutionEvent(ordered)!.payload as Record<string, unknown>).stdout
      : '',
    8_000,
  )
  if (stdoutFromResult)
    return stdoutFromResult

  const stdoutChunks = ordered
    .filter(event => event.kind === 'step')
    .map((event) => {
      const payload = event.payload
      if (!payload || typeof payload !== 'object')
        return ''
      const stream = sanitizeExecutionLedgerText((payload as Record<string, unknown>).stream, 24)
      if (stream !== 'stdout')
        return ''
      return typeof (payload as Record<string, unknown>).text === 'string'
        ? (payload as Record<string, unknown>).text as string
        : ''
    })
    .filter(Boolean)

  return sanitizeExecutionLedgerText(stdoutChunks.join(''), 8_000)
}

function rankThread(thread: AlicizationTaskThreadRecord, query: string) {
  const haystack = [
    sanitizeExecutionLedgerText(thread.goal, 240),
    sanitizeExecutionLedgerText(thread.summary, 240),
    sanitizeExecutionLedgerText(thread.selectedChannel, 48),
  ].join(' ').toLowerCase()
  const normalizedQuery = query.toLowerCase()

  let score = readTaskThreadActivityAt(thread)
  if (haystack.includes('desktop') || haystack.includes('桌面'))
    score += 10_000_000
  if (haystack.includes('list') || haystack.includes('列') || haystack.includes('文件'))
    score += 5_000_000
  if (normalizedQuery && haystack.includes(normalizedQuery))
    score += 2_000_000
  return score
}

function buildRemainingListingReply(input: {
  allItems: string[]
  latestUserText: string
  previousAssistantText: string
  scope: 'desktop' | 'entries'
  decision: AlicizationActiveDialogueFastPathDecision
}) {
  const orderedItems = buildAlicizationExecutionListingDisplayOrder(input.allItems)
  if (orderedItems.length === 0)
    return null

  const remainingItems = orderedItems.filter((item) => {
    return !wasAlicizationListingItemMentioned(item, input.previousAssistantText)
  })
  const surfacedFallbackRemainingItems = remainingItems.length > 0
    ? remainingItems
    : orderedItems.slice(6)
  if (surfacedFallbackRemainingItems.length === 0)
    return null

  const requestedCount = parseAlicizationRequestedListingItemCount(input.latestUserText)
  const limit = requestedCount && requestedCount > 0
    ? requestedCount
    : Math.min(6, surfacedFallbackRemainingItems.length)
  const itemsToShow = surfacedFallbackRemainingItems.slice(0, limit)
  if (itemsToShow.length === 0)
    return null

  const remainingAfterShown = Math.max(0, surfacedFallbackRemainingItems.length - itemsToShow.length)

  return buildAlicizationActiveDialogueGovernedReply({
    decision: input.decision,
    moves: [{
      kind: 'execution-listing',
      scope: input.scope === 'desktop' ? 'desktop' : 'directory',
      count: orderedItems.length,
      previewItems: itemsToShow
        .map(formatAlicizationExecutionListingPreviewName)
        .filter(Boolean),
      extraCount: remainingAfterShown,
      mode: 'follow-up',
      remainingOnly: true,
      requestedCount,
    }],
  })
}

function buildGenericExecutionOutcomeReply(input: {
  outcome: string
  status: AlicizationTaskThreadRecord['status']
  summary?: string | null
  channel: string
  decision: AlicizationActiveDialogueFastPathDecision
}) {
  const outcome = sanitizeExecutionLedgerText(input.outcome, 240)
  const summary = sanitizeExecutionLedgerText(input.summary, 200)
  const detailParts = uniqueExecutionLedgerValues([outcome, summary])
  if (detailParts.length === 0)
    return null

  return buildAlicizationActiveDialogueGovernedReply({
    decision: input.decision,
    moves: [{
      kind: 'execution-detail',
      status: input.status === 'completed' || input.status === 'failed' || input.status === 'blocked' || input.status === 'cancelled'
        ? input.status
        : 'not-routed',
      detail: detailParts[0] ?? '',
      summary: detailParts[1] ?? '',
      channelLabel: (() => {
        const normalized = sanitizeExecutionLedgerText(input.channel, 48).toLowerCase()
        if (normalized === 'cli')
          return 'CLI'
        if (normalized === 'codex')
          return 'Codex'
        if (normalized === 'claude-code')
          return 'Claude Code'
        if (normalized === 'openclaw')
          return 'OpenClaw'
        return sanitizeExecutionLedgerText(input.channel, 48) || 'CLI'
      })(),
      mode: 'follow-up',
    }],
  })
}

export function createAlicizationExecutionFollowUpPayoffResolver(
  options: AlicizationExecutionFollowUpPayoffResolverOptions,
) {
  return async function resolveExecutionFollowUpPayoff(input: {
    conversationMessages: Message[]
    decision: AlicizationActiveDialogueFastPathDecision
    prepared: AlicizationPreparedMainChatExecutionResult
  }) {
    const sessionId = sanitizeExecutionLedgerText(
      input.prepared.conversationSessionId ?? input.decision.sessionMirror?.sessionId ?? '',
      160,
    )
    if (!sessionId)
      return null

    const previousAssistantText = readPreviousAssistantText(input.conversationMessages)
    const query = sanitizeText([
      input.decision.latestUserText,
      input.decision.previousUserText,
      input.decision.continuityAnchor,
      previousAssistantText,
    ].filter(Boolean).join(' '), 240)

    const threads = await options.listTaskThreads({
      sessionId,
      limit: 8,
    }).catch(() => [])
    const candidateThreads = threads
      .filter(thread => alicizationTerminalTaskThreadStatuses.has(thread.status))
      .sort((left, right) => rankThread(right, query) - rankThread(left, query))

    for (const thread of candidateThreads) {
      const events = await options.listExecutionEvents({
        threadId: thread.id,
        limit: 64,
      }).catch(() => [])
      const detail = combineExecutionStdout(events) || readExecutionOutcome(events)
      if (detail) {
        const listing = resolveAlicizationExecutionListingSummary({
          detail,
          goal: thread.goal,
        })
        if (listing) {
          const reply = buildRemainingListingReply({
            allItems: listing.items,
            latestUserText: input.decision.latestUserText,
            previousAssistantText,
            scope: listing.scope,
            decision: input.decision,
          })
          if (reply)
            return reply
        }
      }

      const genericReply = buildGenericExecutionOutcomeReply({
        outcome: detail,
        status: thread.status,
        summary: thread.summary,
        channel: thread.selectedChannel ?? thread.proposedChannel ?? 'executor',
        decision: input.decision,
      })
      if (genericReply)
        return genericReply
    }

    return null
  }
}
