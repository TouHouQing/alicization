import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'

import { buildAlicizationProviderFactBlock } from '@proj-alicization/stage-shared'

import { AlicizationVisibleReplySettlementBlockedError, validateAlicizationProviderSettlementPayload } from './settlement'

export function buildAlicizationPublicReplyContinuationFact(publishedPrefix: string) {
  return buildAlicizationProviderFactBlock('alicization-public-reply-prefix', {
    status: 'already-published-non-learning-prefix',
    text: publishedPrefix,
    replyMode: 'unpublished-continuation-v1',
    scope: 'Immutable text already shown in this same turn. The host will prepend it to your reply field. Author only the missing continuation, completing any unfinished word or sentence. Do not repeat, replace or quote the prefix. It is not committed memory, an accepted assertion or evidence of execution. The complete composed reply must pass grounding; an unsupported prefix cannot be repaired by rewriting it.',
  })
}

/** The model authors only unseen words; the host owns the immutable prefix. */
export function composeAlicizationReplyContinuation(input: {
  fullText: string
  publishedPrefix: string
  prepared: AlicizationPreparedMainChatExecutionResult
}) {
  if (!input.publishedPrefix)
    return input.fullText
  const validation = validateAlicizationProviderSettlementPayload({ fullText: input.fullText, prepared: input.prepared, allowPlainTextProviderReply: true })
  if (!validation.valid || !validation.payload)
    throw new AlicizationVisibleReplySettlementBlockedError(`provider-continuation-invalid:${validation.issues.join(',')}`, null)
  if (validation.payload.reply.startsWith(input.publishedPrefix))
    throw new AlicizationVisibleReplySettlementBlockedError('Reply continuation repeated its published prefix', null)
  // Settlement and grounding must still validate the complete composed reply.
  // This composition neither certifies the prefix nor admits any action.
  return JSON.stringify({ ...validation.payload, reply: input.publishedPrefix + validation.payload.reply })
}
