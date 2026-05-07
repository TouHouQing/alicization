import type { AlicizationVisibleReplyExecution } from '../../../../shared/eventa'
import type { AlicizationSelfRevisionStatePatch } from '../self-evolution/state-revision-bus'

import {
  buildAlicizationVisibleReplyRealizationArtifact,
  createAlicizationVisibleReplyExecution,
} from '../visible-reply/facade'
import { decideAlicizationProactiveVisibleUtterance } from './visible-utterance-policy'

export type AlicizationProactiveVisibleUtteranceKind
  = 'reminder'
    | 'execution-callback'
    | 'subconscious-proactive'
    | 'autonomy-proposal'

function stringifyStructuredForRealization(structured: unknown) {
  try {
    return JSON.stringify(structured ?? {})
  }
  catch {
    return ''
  }
}

function readVisibleReply(structured: unknown) {
  return structured && typeof structured === 'object' && typeof (structured as { reply?: unknown }).reply === 'string'
    ? (structured as { reply: string }).reply.trim()
    : ''
}

export function resolveAlicizationProactiveVisibleUtterance(input: {
  kind: AlicizationProactiveVisibleUtteranceKind
  structured: Record<string, unknown> | null | undefined
  hasMindAuthoredStructured: boolean
  reason?: string | null
  allowDeterministicVisibleFallback?: boolean
  expectedVisibleReplyAuthority?: AlicizationVisibleReplyExecution['expectedVisibleReplyAuthority']
  selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null
}) {
  const reply = readVisibleReply(input.structured)
  const hasMindAuthoredVisibleText = input.hasMindAuthoredStructured && Boolean(reply)
  const decisionReason = hasMindAuthoredVisibleText
    ? input.reason ?? `mind-authored-${input.kind}`
    : input.hasMindAuthoredStructured
      ? `provider-mind-empty-visible-text-for-${input.kind}`
      : input.reason ?? `provider-mind-unavailable-for-${input.kind}`
  const decision = decideAlicizationProactiveVisibleUtterance({
    hasMindAuthoredStructured: hasMindAuthoredVisibleText,
    allowDeterministicVisibleFallback: input.allowDeterministicVisibleFallback,
    reason: decisionReason,
    selfRevisionPatch: input.selfRevisionPatch ?? null,
  })
  const visibleReplyExecution = createAlicizationVisibleReplyExecution({
    mode: hasMindAuthoredVisibleText ? 'provider-one-shot' : 'local-fallback',
    expectedVisibleReplyAuthority: input.expectedVisibleReplyAuthority ?? 'llm-mind',
    actualVisibleReplyAuthority: hasMindAuthoredVisibleText ? 'llm-mind' : 'local-deterministic-fallback',
    providerMindExecuted: hasMindAuthoredVisibleText,
    reason: decision.reason,
  })
  const visibleReplyRealization = buildAlicizationVisibleReplyRealizationArtifact({
    fullText: stringifyStructuredForRealization(input.structured),
    visibleReplyExecution,
  })
  const structuredForPersistence = decision.shouldPersistVisibleUtterance && input.structured
    ? {
        ...input.structured,
        visibleReplyAuthority: 'llm-mind',
        replyRealizationMode: 'provider-mind-required',
        visibleReplyExecution,
        visibleReplyRealization,
      }
    : null

  return {
    version: 'proactive-visible-utterance-realization-v1' as const,
    kind: input.kind,
    decision,
    shouldPersistVisibleUtterance: decision.shouldPersistVisibleUtterance,
    assistantText: decision.shouldPersistVisibleUtterance ? reply : '',
    structuredForPersistence,
    visibleReplyExecution,
    visibleReplyRealization,
  }
}
