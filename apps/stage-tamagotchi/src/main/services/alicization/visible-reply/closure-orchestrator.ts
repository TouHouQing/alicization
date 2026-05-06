import type { AlicizationVisibleReplyExecution } from '../../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'
import type { AlicizationSecondPassRewriteResult } from '../main-chat-second-pass-rewrite'
import type { AlicizationVisibleReplyCriticArtifact } from './critic'
import type { AlicizationVisibleReplyClosureArtifact } from './realization-engine'

import {
  buildAlicizationVisibleReplyCriticArtifact,
  shouldForceAlicizationVisibleReplyRepair,
} from './critic'

export interface AlicizationVisibleReplyClosureDraft {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
}

export interface AlicizationVisibleReplyClosureResult extends AlicizationVisibleReplyClosureDraft {
  critic: AlicizationVisibleReplyCriticArtifact
  closure: AlicizationVisibleReplyClosureArtifact
}

export class AlicizationVisibleReplyClosureBlockedError extends Error {
  constructor(message: string, readonly closure: AlicizationVisibleReplyClosureArtifact) {
    super(message)
    this.name = 'AlicizationVisibleReplyClosureBlockedError'
  }
}

function uniqueReasonCodes(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))]
}

function buildClosureArtifact(input: {
  status: AlicizationVisibleReplyClosureArtifact['status']
  initialCritic: AlicizationVisibleReplyCriticArtifact
  finalCritic: AlicizationVisibleReplyCriticArtifact | null
  rewriteAttempted: boolean
  rewriteSucceeded: boolean
  extraReasonCodes?: string[]
}): AlicizationVisibleReplyClosureArtifact {
  return {
    version: 'visible-reply-closure-v1',
    status: input.status,
    initialCritic: input.initialCritic,
    finalCritic: input.finalCritic,
    rewriteAttempted: input.rewriteAttempted,
    rewriteSucceeded: input.rewriteSucceeded,
    reasonCodes: uniqueReasonCodes([
      ...input.initialCritic.reasonCodes,
      ...(input.finalCritic?.reasonCodes ?? []),
      ...(input.extraReasonCodes ?? []),
    ]),
  }
}

export async function closeAlicizationVisibleReply(input: {
  draft: AlicizationVisibleReplyClosureDraft
  prepared: AlicizationPreparedMainChatExecutionResult
  forceRewrite?: boolean
  forceReasonCodes?: string[]
  rewriteSecondPass: (input: {
    fullText: string
    visibleReplyExecution: AlicizationVisibleReplyExecution
    forceRewrite: boolean
    forceReasonCodes: string[]
  }) => Promise<AlicizationSecondPassRewriteResult | null>
}): Promise<AlicizationVisibleReplyClosureResult | null> {
  const initialCritic = buildAlicizationVisibleReplyCriticArtifact({
    fullText: input.draft.fullText,
    visibleReplyExecution: input.draft.visibleReplyExecution,
    prepared: input.prepared,
  })
  const forceRewrite = input.forceRewrite === true || shouldForceAlicizationVisibleReplyRepair(initialCritic)
  const forceReasonCodes = uniqueReasonCodes([
    ...(input.forceReasonCodes ?? []),
    ...initialCritic.repairReasonCodes,
  ])

  if (!forceRewrite) {
    const closure = buildClosureArtifact({
      status: 'approved',
      initialCritic,
      finalCritic: initialCritic,
      rewriteAttempted: false,
      rewriteSucceeded: false,
    })
    return {
      ...input.draft,
      critic: initialCritic,
      closure,
    }
  }

  const rewritten = await input.rewriteSecondPass({
    fullText: input.draft.fullText,
    visibleReplyExecution: input.draft.visibleReplyExecution,
    forceRewrite,
    forceReasonCodes,
  })
  if (!rewritten?.rewritten) {
    const closure = buildClosureArtifact({
      status: 'blocked',
      initialCritic,
      finalCritic: null,
      rewriteAttempted: true,
      rewriteSucceeded: false,
      extraReasonCodes: ['visible-reply-second-pass-not-rewritten'],
    })
    throw new AlicizationVisibleReplyClosureBlockedError(
      'visible-reply-second-pass-not-rewritten',
      closure,
    )
  }

  const finalCritic = buildAlicizationVisibleReplyCriticArtifact({
    fullText: rewritten.fullText,
    visibleReplyExecution: rewritten.visibleReplyExecution,
    prepared: input.prepared,
  })
  if (shouldForceAlicizationVisibleReplyRepair(finalCritic)) {
    const closure = buildClosureArtifact({
      status: 'blocked',
      initialCritic,
      finalCritic,
      rewriteAttempted: true,
      rewriteSucceeded: true,
    })
    throw new AlicizationVisibleReplyClosureBlockedError(
      `visible-reply-second-pass-still-fails-critic:${finalCritic.reasonCodes.join(',') || 'unknown'}`,
      closure,
    )
  }

  const closure = buildClosureArtifact({
    status: 'rewritten',
    initialCritic,
    finalCritic,
    rewriteAttempted: true,
    rewriteSucceeded: true,
  })
  return {
    fullText: rewritten.fullText,
    visibleReplyExecution: rewritten.visibleReplyExecution,
    critic: finalCritic,
    closure,
  }
}
