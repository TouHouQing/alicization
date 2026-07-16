import type { AlicizationChatFailureKind } from '@proj-alicization/stage-shared'

import type { AlicizationVisibleReplyExecution } from '../../../../shared/eventa'

import { resolveAlicizationChatFailureSurface } from '@proj-alicization/stage-shared'

function uniqueList(values: Array<string | null | undefined>, maxItems = 12) {
  const result: string[] = []
  for (const value of values) {
    const normalized = typeof value === 'string' ? value.trim() : ''
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

export function isAlicizationNonHumanAuthoredVisibleReply(
  execution: Pick<AlicizationVisibleReplyExecution, 'actualVisibleReplyAuthority' | 'mode' | 'providerMindExecuted'> | null | undefined,
) {
  return !execution
    || execution.providerMindExecuted === false
    || execution.mode === 'local-fallback'
    || execution.actualVisibleReplyAuthority === 'local-deterministic-fallback'
}

export function buildAlicizationMindAuthoringFailureArtifact(input: {
  reason: string
  stage: 'main-gateway-timeout' | 'provider-recovery'
  turnId?: string | null
  reasonCodes?: string[]
  failureKind?: AlicizationChatFailureKind
  userText?: string
}) {
  const reason = input.reason.trim().slice(0, 180) || 'mind-authoring-failed'
  const failureKind = input.failureKind ?? (input.stage === 'main-gateway-timeout' ? 'timeout' : 'stream-failure')
  const failureSurface = resolveAlicizationChatFailureSurface({
    kind: failureKind,
    userText: input.userText,
  })
  return {
    format: 'mind-turn-v1',
    thought: `transport_failure=${input.stage}; visible_reply=blocked; reason=${reason}`,
    emotion: 'thinking',
    reply: failureSurface.reply,
    visibleReplySource: failureSurface.visibleReplySource,
    excludeFromPersonaLearning: failureSurface.excludeFromPersonaLearning,
    excludeFromMemoryCondensation: failureSurface.excludeFromMemoryCondensation,
    auditCategory: failureSurface.auditCategory,
    performance: {
      baseEmotion: 'thinking',
      facialCue: null,
      actionCue: null,
      delivery: 'calm',
      emphasis: 0,
    },
    visibleReplyAuthority: 'non-human-authored-blocked',
    visibleReplyBlocked: true,
    nonHumanAuthoredStatus: failureSurface.nonHumanAuthoredStatus,
    reasonCodes: uniqueList([
      'normal-reply-requires-provider-mind',
      'non-human-authored-visible-fallback-blocked',
      ...(input.reasonCodes ?? []),
    ]),
    formatBeforeRewrite: null,
    parsePath: 'transport-failure',
    contractFailed: true,
    transportFailure: {
      stage: input.stage,
      reason,
      turnId: input.turnId ?? null,
    },
  } as const
}
