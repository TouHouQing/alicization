import type { AlicizationVisibleReplyExecution } from '../../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'
import type { AlicizationSecondPassRewriteResult } from './second-pass-rewrite'

import {
  closeAlicizationVisibleReply,
  type AlicizationVisibleReplyClosureResult,
} from './closure-orchestrator'
import {
  buildAlicizationResolvedVisibleReply,
  type AlicizationResolvedVisibleReply,
  type AlicizationVisibleReplyClosureArtifact,
} from './realization-engine'

export interface AlicizationVisibleReplySettlementDraft {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
}

export interface AlicizationVisibleReplySettlementResult extends AlicizationResolvedVisibleReply {
  closureResult: AlicizationVisibleReplyClosureResult
}

export class AlicizationVisibleReplySettlementBlockedError extends Error {
  constructor(message: string, readonly closure: AlicizationVisibleReplyClosureArtifact | null) {
    super(message)
    this.name = 'AlicizationVisibleReplySettlementBlockedError'
  }
}

export async function settleAlicizationVisibleReply(input: {
  draft: AlicizationVisibleReplySettlementDraft
  prepared: AlicizationPreparedMainChatExecutionResult
  forceRewrite?: boolean
  forceReasonCodes?: string[]
  rewriteSecondPass: (input: {
    fullText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
    forceRewrite: boolean
    forceReasonCodes: string[]
  }) => Promise<AlicizationSecondPassRewriteResult | null>
}): Promise<AlicizationVisibleReplySettlementResult> {
  const closed = await closeAlicizationVisibleReply({
    draft: input.draft,
    prepared: input.prepared,
    forceRewrite: input.forceRewrite,
    forceReasonCodes: input.forceReasonCodes,
    rewriteSecondPass: input.rewriteSecondPass,
  })
  if (!closed) {
    throw new AlicizationVisibleReplySettlementBlockedError(
      'visible-reply-settlement-not-produced',
      null,
    )
  }

  return {
    ...buildAlicizationResolvedVisibleReply({
      fullText: closed.fullText,
      visibleReplyExecution: closed.visibleReplyExecution,
      critic: closed.critic,
      closure: closed.closure,
    }),
    closureResult: closed,
  }
}
