import type { AlicizationVisibleReplyExecution } from '../../../../shared/eventa'
import type { AlicizationPreparedMainChatExecutionResult } from '../main-chat-session-runtime'
import type { AlicizationVisibleReplyCriticArtifact } from './critic'
import type { AlicizationVisibleReplyClosureArtifact } from './realization-engine'

import { resolveAlicizationChatFailureSurface } from '@proj-alicization/stage-shared'

import {
  buildAlicizationVisibleReplyCriticArtifact,
  shouldBlockAlicizationVisibleReply,
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
  readonly failureSurface = resolveAlicizationChatFailureSurface({
    kind: 'provider-output-invalid',
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
}): AlicizationVisibleReplyClosureArtifact {
  return {
    version: 'visible-reply-closure-v1',
    status: input.status,
    initialCritic: input.initialCritic,
    finalCritic: input.finalCritic,
    reasonCodes: uniqueReasonCodes([
      ...input.initialCritic.reasonCodes,
      ...(input.finalCritic?.reasonCodes ?? []),
    ]),
  }
}

export async function closeAlicizationVisibleReply(input: {
  draft: AlicizationVisibleReplyClosureDraft
  prepared: AlicizationPreparedMainChatExecutionResult
  appendRuntimeDebugLine?: (event: string, payload: Record<string, unknown>) => Promise<void> | void
}): Promise<AlicizationVisibleReplyClosureResult | null> {
  const initialCritic = buildAlicizationVisibleReplyCriticArtifact({
    fullText: input.draft.fullText,
    visibleReplyExecution: input.draft.visibleReplyExecution,
    prepared: input.prepared,
  })
  const shouldBlock = shouldBlockAlicizationVisibleReply(initialCritic)

  if (!shouldBlock) {
    const closure = buildClosureArtifact({
      status: 'approved',
      initialCritic,
      finalCritic: initialCritic,
    })
    return {
      ...input.draft,
      critic: initialCritic,
      closure,
    }
  }

  const closure = buildClosureArtifact({
    status: 'blocked',
    initialCritic,
    finalCritic: null,
  })
  await input.appendRuntimeDebugLine?.('chat-stream.visible-reply-validation-blocked', {
    reasonCodes: closure.reasonCodes,
    criticReasonCodes: initialCritic.reasonCodes,
  })
  throw new AlicizationVisibleReplyClosureBlockedError(
    `visible-reply-validation-blocked:${closure.reasonCodes.join(',') || 'unknown'}`,
    closure,
  )
}
