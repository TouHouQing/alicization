import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationExecutionEventRecord,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'
import type { AlicizationActiveDialogueFastPathDecision } from './main-chat-active-dialogue-loop'
import type { AlicizationPreparedMainChatExecutionResult } from './main-chat-session-runtime'

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

export function createAlicizationExecutionFollowUpPayoffResolver(
  options: AlicizationExecutionFollowUpPayoffResolverOptions,
) {
  void options

  return async function resolveExecutionFollowUpPayoff(input: {
    conversationMessages: Message[]
    decision: AlicizationActiveDialogueFastPathDecision
    prepared: AlicizationPreparedMainChatExecutionResult
  }) {
    void input

    // Phase 13 authority closure: execution follow-up evidence can still be
    // consumed by the main runtime, but this helper must not synthesize the
    // final visible reply. Normal follow-up payoff has to pass through
    // provider mind authoring or second-pass rewrite.
    return null
  }
}
