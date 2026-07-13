import type { AlicizationVisibleReplyExecution } from '../../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'
import type { AlicizationVisibleReplyCriticArtifact } from './critic'
import type { AlicizationVisibleReplyClosureArtifact } from './realization-engine'
import type {
  AlicizationSecondPassRetryInput,
  AlicizationSecondPassRewriteResult,
} from './second-pass-rewrite'

import { resolveAlicizationChatFailureSurface } from '@proj-alicization/stage-shared'

import {
  buildAlicizationVisibleReplyCriticArtifact,
  shouldForceAlicizationVisibleReplyRepair,
} from './critic'
import {
  mapAlicizationSecondPassReasonCodes,
  readAlicizationSecondPassToolFacts,
} from './second-pass-rewrite'

function readVisibleReplyExcerpt(fullText: string) {
  try {
    const parsed = JSON.parse(fullText) as { reply?: unknown }
    if (typeof parsed.reply === 'string' && parsed.reply.trim())
      return parsed.reply.trim().slice(0, 500)
  }
  catch {}
  return fullText.trim().slice(0, 500)
}

export interface AlicizationVisibleReplyClosureDraft {
  fullText: string
  visibleReplyExecution: AlicizationVisibleReplyExecution
}

export interface AlicizationVisibleReplyClosureResult extends AlicizationVisibleReplyClosureDraft {
  critic: AlicizationVisibleReplyCriticArtifact
  closure: AlicizationVisibleReplyClosureArtifact
}

export class AlicizationVisibleReplyClosureBlockedError extends Error {
  readonly failureSurface = resolveAlicizationChatFailureSurface({
    kind: 'structured-contract',
  })

  constructor(
    message: string,
    readonly closure: AlicizationVisibleReplyClosureArtifact,
    readonly debug?: Record<string, unknown>,
  ) {
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
  appendRuntimeDebugLine?: (event: string, payload: Record<string, unknown>) => Promise<void> | void
  rewriteSecondPass: (
    input: AlicizationSecondPassRetryInput,
  ) => Promise<AlicizationSecondPassRewriteResult | null>
}): Promise<AlicizationVisibleReplyClosureResult | null> {
  const initialCritic = buildAlicizationVisibleReplyCriticArtifact({
    fullText: input.draft.fullText,
    visibleReplyExecution: input.draft.visibleReplyExecution,
    prepared: input.prepared,
  })
  const forceRewrite = input.forceRewrite === true || shouldForceAlicizationVisibleReplyRepair(initialCritic)

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

  const reasonCodes = mapAlicizationSecondPassReasonCodes([
    ...(input.forceReasonCodes ?? []),
    ...initialCritic.repairReasonCodes,
  ])
  const rewritten = await input.rewriteSecondPass({
    candidate: input.draft.fullText,
    reasonCodes,
    prepared: input.prepared,
    toolFacts: readAlicizationSecondPassToolFacts(input.prepared),
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
    await input.appendRuntimeDebugLine?.('chat-stream.visible-reply-second-pass-still-fails-critic', {
      initialReasonCodes: initialCritic.reasonCodes,
      finalReasonCodes: finalCritic.reasonCodes,
      finalRepairReasonCodes: finalCritic.repairReasonCodes,
      rewrittenReplyExcerpt: readVisibleReplyExcerpt(rewritten.fullText),
    })
    throw new AlicizationVisibleReplyClosureBlockedError(
      `visible-reply-second-pass-still-fails-critic:${finalCritic.reasonCodes.join(',') || 'unknown'}`,
      closure,
      {
        rewrittenReplyExcerpt: readVisibleReplyExcerpt(rewritten.fullText),
      },
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
