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

interface AlicizationProactiveMemorySurfaceRestraint {
  shouldStayInward?: boolean | null
  shouldDelayUntilAfterPayoff?: boolean | null
  stableCoreOnly?: boolean | null
  visibleCarryMode?: string | null
  rationale?: string | null
}

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
  actualVisibleReplyAuthority?: AlicizationVisibleReplyExecution['actualVisibleReplyAuthority']
  reason?: string | null
  allowDeterministicVisibleFallback?: boolean
  allowTransparentFailureSurface?: boolean
  preferPresenceOnlyHold?: boolean
  expectedVisibleReplyAuthority?: AlicizationVisibleReplyExecution['expectedVisibleReplyAuthority']
  selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null
  memorySurfaceRestraint?: AlicizationProactiveMemorySurfaceRestraint | null
}) {
  const reply = readVisibleReply(input.structured)
  const presenceOnlyHold = input.preferPresenceOnlyHold === true
  const hasMindAuthoredVisibleText = input.hasMindAuthoredStructured && Boolean(reply)
  const shouldPersistTransparentFailure = input.allowTransparentFailureSurface === true
    && Boolean(reply)
  const shouldPersistMindReply = hasMindAuthoredVisibleText
    && !presenceOnlyHold
  const actualVisibleReplyAuthority = hasMindAuthoredVisibleText
    ? input.actualVisibleReplyAuthority ?? 'llm-mind'
    : shouldPersistTransparentFailure
      ? input.actualVisibleReplyAuthority ?? 'non-human-authored-blocked'
      : 'local-deterministic-fallback'
  const decision = shouldPersistTransparentFailure
    ? {
        version: 'proactive-visible-utterance-policy-v1' as const,
        shouldPersistVisibleUtterance: true,
        requiresMindAuthoredText: false,
        action: 'persist' as const,
        reason: input.reason ?? 'proactive-infrastructure-failure',
      }
    : decideAlicizationProactiveVisibleUtterance({
        hasMindAuthoredStructured: shouldPersistMindReply,
        allowDeterministicVisibleFallback: presenceOnlyHold
          ? true
          : input.allowDeterministicVisibleFallback,
        preferPresenceOnlyHold: presenceOnlyHold,
        reason: presenceOnlyHold ? 'proactive-visible-presence-without-utterance' : input.reason ?? null,
        selfRevisionPatch: input.selfRevisionPatch ?? null,
      })
  const visibleReplyExecution = createAlicizationVisibleReplyExecution({
    mode: shouldPersistMindReply ? 'provider-one-shot' : 'local-fallback',
    expectedVisibleReplyAuthority: input.expectedVisibleReplyAuthority ?? 'llm-mind',
    actualVisibleReplyAuthority: shouldPersistMindReply || shouldPersistTransparentFailure
      ? actualVisibleReplyAuthority
      : 'local-deterministic-fallback',
    providerMindExecuted: shouldPersistMindReply,
    reason: decision.reason,
  })
  const baseVisibleReplyRealization = buildAlicizationVisibleReplyRealizationArtifact({
    fullText: stringifyStructuredForRealization(input.structured),
    visibleReplyExecution,
  })
  const visibleReplyRealization = baseVisibleReplyRealization
  const structuredForPersistence: (Record<string, unknown> & { reply?: unknown }) | null
    = decision.shouldPersistVisibleUtterance && input.structured
      ? {
          ...input.structured,
          visibleReplyAuthority: actualVisibleReplyAuthority,
          replyRealizationMode: shouldPersistTransparentFailure
            ? 'transparent-failure-surface'
            : 'provider-mind-required',
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
