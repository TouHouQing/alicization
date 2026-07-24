import type { AlicizationVisibleReplyExecution } from '../../../../shared/eventa'
import type { AlicizationSelfRevisionStatePatch } from '../self-evolution/state-revision-bus'

import {
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationStructuredInternalText,
} from '@proj-alicization/stage-shared'

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

function sanitizeStructuredForRealization(value: unknown): unknown {
  if (typeof value === 'string') {
    if (!value.trim())
      return value
    return containsAlicizationFixedTemplateResidue(value)
      ? sanitizeAlicizationStructuredInternalText(value, 520)
      : value
  }

  if (Array.isArray(value))
    return value.map(item => sanitizeStructuredForRealization(item))

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        sanitizeStructuredForRealization(item),
      ]),
    )
  }

  return value
}

function stringifyStructuredForRealization(structured: unknown) {
  try {
    return JSON.stringify(sanitizeStructuredForRealization(structured ?? {}))
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
  preferPresenceOnlyHold?: boolean
  expectedVisibleReplyAuthority?: AlicizationVisibleReplyExecution['expectedVisibleReplyAuthority']
  selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null
  memorySurfaceRestraint?: AlicizationProactiveMemorySurfaceRestraint | null
}) {
  const reply = readVisibleReply(input.structured)
  const presenceOnlyHold = input.preferPresenceOnlyHold === true
  const hasMindAuthoredVisibleText = input.hasMindAuthoredStructured && Boolean(reply)
  const fixedTemplateViolationReason = reply && containsAlicizationFixedTemplateResidue(reply)
    ? 'proactive-visible-reply-fixed-template-contamination'
    : null
  const shouldPersistMindReply = hasMindAuthoredVisibleText
    && !fixedTemplateViolationReason
    && !presenceOnlyHold
  const actualVisibleReplyAuthority = hasMindAuthoredVisibleText
    ? input.actualVisibleReplyAuthority ?? 'llm-mind'
    : 'local-deterministic-fallback'
  const decision = decideAlicizationProactiveVisibleUtterance({
    hasMindAuthoredStructured: shouldPersistMindReply,
    allowDeterministicVisibleFallback: fixedTemplateViolationReason || presenceOnlyHold
      ? true
      : input.allowDeterministicVisibleFallback,
    preferPresenceOnlyHold: presenceOnlyHold,
    reason: fixedTemplateViolationReason
      ?? (presenceOnlyHold ? 'proactive-visible-presence-without-utterance' : input.reason ?? null),
    selfRevisionPatch: input.selfRevisionPatch ?? null,
  })
  const visibleReplyExecution = createAlicizationVisibleReplyExecution({
    mode: shouldPersistMindReply ? 'provider-one-shot' : 'local-fallback',
    expectedVisibleReplyAuthority: input.expectedVisibleReplyAuthority ?? 'llm-mind',
    actualVisibleReplyAuthority: shouldPersistMindReply
      ? actualVisibleReplyAuthority
      : 'local-deterministic-fallback',
    providerMindExecuted: shouldPersistMindReply,
    reason: decision.reason,
  })
  const baseVisibleReplyRealization = buildAlicizationVisibleReplyRealizationArtifact({
    fullText: stringifyStructuredForRealization(input.structured),
    visibleReplyExecution,
  })
  const visibleReplyRealization = {
    ...baseVisibleReplyRealization,
    blockedReasons: fixedTemplateViolationReason
      ? [...baseVisibleReplyRealization.blockedReasons, fixedTemplateViolationReason]
      : baseVisibleReplyRealization.blockedReasons,
  }
  const structuredForPersistence: (Record<string, unknown> & { reply?: unknown }) | null
    = decision.shouldPersistVisibleUtterance && input.structured
      ? {
          ...input.structured,
          visibleReplyAuthority: actualVisibleReplyAuthority,
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
