import type { AlicizationVisibleReplyExecution } from '../../../../shared/eventa'
import type { AlicizationSelfRevisionStatePatch } from '../self-evolution/state-revision-bus'

import {
  buildAlicizationOpeningGuidanceBlockedReason,
  resolveAlicizationOpeningGuidanceHoldDetail,
  resolveAlicizationOpeningGuidanceViolationReason,
} from '../proactive-opening-guidance'
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

function readProactiveOpeningGuidance(structured: unknown) {
  if (!structured || typeof structured !== 'object')
    return ''
  const proactive = (structured as { proactive?: unknown }).proactive
  if (!proactive || typeof proactive !== 'object')
    return ''
  const openingGuidance = (proactive as { openingGuidance?: unknown }).openingGuidance
  return typeof openingGuidance === 'string'
    ? openingGuidance.trim()
    : ''
}

export function resolveAlicizationProactiveVisibleUtterance(input: {
  kind: AlicizationProactiveVisibleUtteranceKind
  structured: Record<string, unknown> | null | undefined
  hasMindAuthoredStructured: boolean
  actualVisibleReplyAuthority?: AlicizationVisibleReplyExecution['actualVisibleReplyAuthority']
  reason?: string | null
  allowDeterministicVisibleFallback?: boolean
  preferPresenceOnlyHold?: boolean | null
  expectedVisibleReplyAuthority?: AlicizationVisibleReplyExecution['expectedVisibleReplyAuthority']
  selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null
  memorySurfaceRestraint?: unknown
}) {
  const reply = readVisibleReply(input.structured)
  const openingGuidance = readProactiveOpeningGuidance(input.structured)
  const hasMindAuthoredVisibleText = input.hasMindAuthoredStructured && Boolean(reply)
  const shouldCheckOpeningGuidance = Boolean(reply)
  const openingGuidanceViolationReason = shouldCheckOpeningGuidance
    ? resolveAlicizationOpeningGuidanceViolationReason({
        reply,
        openingGuidance,
      })
    : null
  const openingGuidanceViolated = Boolean(openingGuidanceViolationReason)
  const actualVisibleReplyAuthority = hasMindAuthoredVisibleText
    ? input.actualVisibleReplyAuthority ?? 'llm-mind'
    : 'local-deterministic-fallback'
  const decision = decideAlicizationProactiveVisibleUtterance({
    hasMindAuthoredStructured: hasMindAuthoredVisibleText && !openingGuidanceViolated,
    allowDeterministicVisibleFallback: openingGuidanceViolated
      ? true
      : input.allowDeterministicVisibleFallback,
    reason: openingGuidanceViolated
      ? openingGuidanceViolationReason
      : input.reason ?? null,
    selfRevisionPatch: input.selfRevisionPatch ?? null,
  })
  const persistedVisibleReplyAuthority = actualVisibleReplyAuthority === 'llm-second-pass-rewrite'
    ? 'llm-second-pass-rewrite'
    : actualVisibleReplyAuthority === 'local-deterministic-fallback'
      ? 'local-deterministic-fallback'
      : 'llm-mind'
  const visibleReplyExecution = createAlicizationVisibleReplyExecution({
    mode: hasMindAuthoredVisibleText && !openingGuidanceViolated ? 'provider-one-shot' : 'local-fallback',
    expectedVisibleReplyAuthority: input.expectedVisibleReplyAuthority ?? 'llm-mind',
    actualVisibleReplyAuthority: hasMindAuthoredVisibleText && !openingGuidanceViolated
      ? actualVisibleReplyAuthority
      : 'local-deterministic-fallback',
    providerMindExecuted: hasMindAuthoredVisibleText && !openingGuidanceViolated,
    reason: decision.reason,
  })
  const visibleReplyRealization = buildAlicizationVisibleReplyRealizationArtifact({
    fullText: stringifyStructuredForRealization(input.structured),
    visibleReplyExecution,
  })
  const openingGuidanceBlockedReason = buildAlicizationOpeningGuidanceBlockedReason(openingGuidanceViolationReason)
  const openingGuidanceHoldDetail = openingGuidanceViolationReason
    ? resolveAlicizationOpeningGuidanceHoldDetail({
        reply,
        openingGuidance,
        openingGuidanceViolationReason,
      })
    : null
  const visibleReplyRealizationWithGuidance = openingGuidanceBlockedReason
    ? {
        ...visibleReplyRealization,
        blockedReasons: visibleReplyRealization.blockedReasons.includes(openingGuidanceBlockedReason)
          ? visibleReplyRealization.blockedReasons
          : [...visibleReplyRealization.blockedReasons, openingGuidanceBlockedReason],
        openingGuidanceHoldDetail,
      }
    : visibleReplyRealization
  const structuredForPersistence: (Record<string, unknown> & { reply?: unknown }) | null = decision.shouldPersistVisibleUtterance && input.structured
    ? {
        ...input.structured,
        visibleReplyAuthority: persistedVisibleReplyAuthority,
        replyRealizationMode: 'provider-mind-required',
        visibleReplyExecution,
        visibleReplyRealization: visibleReplyRealizationWithGuidance,
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
    visibleReplyRealization: visibleReplyRealizationWithGuidance,
  }
}
