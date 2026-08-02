import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { buildDeferredAutonomyCanonicalSignal } from './runtime-deferred-autonomy-summary'
import { sanitizeBriefText as sanitizeRuntimeBriefText } from './runtime-realtime'
import { createAlicizationSessionContinuityBuildersRuntime } from './runtime-session-continuity-builders'
import {
  buildDeferredAutonomyContinuitySignalFallback,
  normalizeDeferredAutonomyContinuitySignal,
  resolveProactiveProviderFailureKind,
} from './runtime-subconscious-tick'

const structuredControlResiduePattern = /(?:^|[\s|;])[\p{L}_][\p{L}\p{N}_-]*=/iu
const deferredAutonomyCanonicalVersion = 'deferred-autonomy-v1'

function buildCanonicalBudgetOperationalFailure(prefix: string) {
  const evidence = `${prefix}: upstream 127.0.0.1:11434 connection reset HTTP 503 /tmp/`
  return `${evidence}${'x'.repeat(560 - evidence.length)}`
}

function expectStringLeavesNotToMatch(value: unknown, pattern: RegExp) {
  if (typeof value === 'string') {
    expect(value).not.toMatch(pattern)
    return
  }
  if (Array.isArray(value)) {
    value.forEach(item => expectStringLeavesNotToMatch(item, pattern))
    return
  }
  if (value && typeof value === 'object')
    Object.values(value).forEach(item => expectStringLeavesNotToMatch(item, pattern))
}

function expectNoLegacyGovernance(value: unknown) {
  expectStringLeavesNotToMatch(value, structuredControlResiduePattern)
}

function createSessionContinuityBuildersRuntimeForEquivalence() {
  return createAlicizationSessionContinuityBuildersRuntime({
    sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw : fallback,
    sanitizeBriefText: sanitizeRuntimeBriefText,
    sanitizeExecutionLedgerText: raw => String(raw ?? '').trim(),
    readTaskThreadActivityAt: thread => thread.completedAt ?? thread.updatedAt,
    terminalTaskThreadStatuses: new Set(['completed', 'failed', 'cancelled', 'blocked']),
    proactiveReplyWindowMs: 120_000,
    proactiveImplicitIgnoredAfterMs: 600_000,
    proactiveDismissCooldownMs: 1_800_000,
    buildVisualPresenceCapturePersistFingerprint: () => 'fingerprint',
  })
}

function selectCanonicalDeferredFields(signal: Record<string, any> | null | undefined) {
  return {
    canonicalVersion: signal?.metadata?.canonicalVersion ?? null,
    summary: signal?.summary ?? null,
    summaryOwner: signal?.metadata?.summaryOwner ?? null,
    whyNow: signal?.metadata?.whyNow ?? null,
    failure: signal?.metadata?.failure ?? null,
    reasonCode: signal?.metadata?.reasonCode ?? null,
    threadId: signal?.metadata?.threadId ?? null,
    intentId: signal?.metadata?.intentId ?? null,
    deferredAt: signal?.metadata?.deferredAt ?? null,
  }
}

describe('presence-only subconscious continuity cleanup', () => {
  it('prefers the typed proactive Provider failure kind over message inference', () => {
    expect(resolveProactiveProviderFailureKind({
      reason: 'Provider returned an invalid proactive response.',
      failureKind: 'provider-schema-unsupported',
    })).toBe('provider-schema-unsupported')
  })

  it('does not keep a local presence-only dialogue governance layer', () => {
    const source = readFileSync(new URL('./runtime-subconscious-tick.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('containsPresenceOnlyFixedTemplateCue')
    expect(source).not.toContain('buildPresenceOnlyHoldContinuityProjection')
    expect(source).not.toContain('buildPresenceOnlyHoldCurrentConsciousFrame')
    expect(source).not.toContain('rebuildPresenceOnlyPersistedEmotionalKernel')
    expect(source).not.toContain('openingGuidance')
    expect(source).not.toContain('continuityRestraint')
  })

  it('drops historical governance pollution without removing natural deferred text', () => {
    const signal = buildDeferredAutonomyContinuitySignalFallback({
      now: 100,
      turnId: 'turn-1',
      scenario: 'general',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      autonomy: {
        whyNow: '用户刚回到桌面，但没有需要主动打断的事情。',
      },
    })

    expect(signal.summary).toBeNull()
    expect(signal.metadata).toEqual(expect.objectContaining({
      reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
      deferredAt: 100,
      summaryOwner: null,
      whyNow: '用户刚回到桌面，但没有需要主动打断的事情。',
      executionIntentSummary: null,
      failure: null,
    }))
    expect(signal.metadata).not.toHaveProperty('projectIdentity')
    expectNoLegacyGovernance(signal)
  })

  it('preserves a real provider failure while removing unrelated historical governance fields', () => {
    const signal = buildDeferredAutonomyContinuitySignalFallback({
      now: 100,
      turnId: 'turn-provider-failure',
      scenario: 'general',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      autonomy: {
        executionIntent: {
          kind: 'report-failure',
          summary: 'Embedding provider failed with HTTP 400.',
        },
      },
    })

    expect(signal.summary).toContain('Embedding provider failed with HTTP 400.')
    expectNoLegacyGovernance(signal)
  })

  it('keeps deferred autonomy as canonical metadata without project governance carry', () => {
    const signal = buildDeferredAutonomyContinuitySignalFallback({
      now: 100,
      turnId: 'turn-deferred',
      scenario: 'coding',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      autonomy: {
        deferReason: 'busy-host',
        whyNow: 'untrusted project prose',
        sourceThreadId: 'thread-deferred',
        sourceThoughtThreadId: 'thought-deferred',
        sourceConcernId: 'concern-deferred',
        executionIntent: {
          kind: 'follow-through',
          summary: '真实模型摘要：下次用户回来时继续检查 Provider 失败。',
          targetThreadId: 'thread-deferred',
        },
      },
    })

    expect(signal.summary).toBeNull()
    expect(signal.metadata).toEqual(expect.objectContaining({
      reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
      summaryOwner: null,
      sourceThreadId: 'thread-deferred',
      sourceThoughtThreadId: 'thought-deferred',
      sourceConcernId: 'concern-deferred',
      intentId: 'follow-through',
      deferredAt: 100,
      deferReason: 'busy-host',
      executionIntentSummary: '真实模型摘要：下次用户回来时继续检查 Provider 失败。',
    }))
    expect(signal.metadata.whyNow).toBe('untrusted project prose')
    expect(signal.metadata).not.toHaveProperty('projectPhase')
    expect(signal.metadata).not.toHaveProperty('projectPrimaryOpenLoop')
    expect(signal.metadata).not.toHaveProperty('projectNextClosureTarget')
  })

  it('keeps provider failure facts in deferred metadata and summary', () => {
    const signal = buildDeferredAutonomyContinuitySignalFallback({
      now: 200,
      turnId: 'turn-provider-failure',
      scenario: 'general',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      autonomy: {
        deferReason: 'Provider failed with HTTP 503: upstream unavailable.',
      },
    })

    expect(signal.summary).toContain('Provider failed with HTTP 503: upstream unavailable.')
    expect(signal.metadata).toEqual(expect.objectContaining({
      reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
      summaryOwner: 'failure',
      failure: 'Provider failed with HTTP 503: upstream unavailable.',
      deferredAt: 200,
    }))
  })

  it.each([
    {
      name: 'deferred repair with a long whyNow',
      input: {
        now: 700,
        turnId: 'turn-deferred-long-why-now',
        scenario: 'coding',
        reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
        autonomy: {
          whyNow: `Stay near the active runtime thread without forcing a visible reply. ${'w'.repeat(320)}`,
          sourceThreadId: 'thread-runtime',
          executionIntent: {
            kind: 'repair',
            summary: `Verify local runtime state. ${'s'.repeat(320)}`,
          },
        },
      },
      expected: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        summary: null,
        summaryOwner: null,
        whyNow: `Stay near the active runtime thread without forcing a visible reply. ${'w'.repeat(320)}`,
        failure: null,
        reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
        threadId: 'thread-runtime',
        intentId: 'repair',
        deferredAt: 700,
      },
    },
    {
      name: 'deferred repair with a direct Provider failure',
      input: {
        now: 800,
        turnId: 'turn-deferred-provider-failure',
        scenario: 'general',
        reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
        autonomy: {
          whyNow: 'Keep watching the active runtime thread.',
          sourceThreadId: 'thread-provider',
          executionIntent: {
            kind: 'repair',
            summary: 'Provider returned HTTP 503.',
          },
        },
      },
      expected: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        summary: 'Provider returned HTTP 503.',
        summaryOwner: 'failure',
        whyNow: 'Keep watching the active runtime thread.',
        failure: 'Provider returned HTTP 503.',
        reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
        threadId: 'thread-provider',
        intentId: 'repair',
        deferredAt: 800,
      },
    },
    {
      name: 'held autonomy with a long execution intent summary',
      input: {
        now: 900,
        turnId: 'turn-held-long-intent',
        scenario: 'coding',
        reason: 'proactive-visible-presence-without-utterance',
        autonomy: {
          whyNow: 'Stay near the active runtime thread.',
          sourceThreadId: 'thread-held',
          executionIntent: {
            kind: 'follow-through',
            summary: `Re-open the unresolved runtime break. ${'i'.repeat(360)}`,
          },
        },
      },
      expected: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        summary: null,
        summaryOwner: null,
        whyNow: 'Stay near the active runtime thread.',
        failure: null,
        reasonCode: 'proactive-visible-presence-without-utterance',
        threadId: 'thread-held',
        intentId: 'follow-through',
        deferredAt: 900,
      },
    },
    {
      name: 'held autonomy with an empty turn id',
      input: {
        now: 905,
        turnId: '',
        scenario: 'coding',
        reason: 'proactive-visible-presence-without-utterance',
        autonomy: {
          sourceThreadId: 'thread-held-empty-turn',
          executionIntent: {
            kind: 'follow-through',
            summary: 'Re-open the unresolved runtime break.',
          },
        },
      },
      expected: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        summary: null,
        summaryOwner: null,
        whyNow: null,
        failure: null,
        reasonCode: 'proactive-visible-presence-without-utterance',
        threadId: 'thread-held-empty-turn',
        intentId: 'follow-through',
        deferredAt: 905,
      },
    },
  ] as const)('keeps builder and fallback canonical fields equivalent: $name', ({ input, expected }) => {
    const runtime = createSessionContinuityBuildersRuntimeForEquivalence()
    const built = runtime.buildDeferredAutonomyContinuitySignal(input)
    const normalizedBuilt = normalizeDeferredAutonomyContinuitySignal(built as Record<string, any>)
    const fallback = buildDeferredAutonomyContinuitySignalFallback(input)

    expect(normalizedBuilt).toEqual(fallback)
    if (input.turnId === '') {
      expect(normalizedBuilt?.signature).toBe(
        'proactive-held-autonomy:turn:thread-held-empty-turn:follow-through',
      )
    }
    expect(selectCanonicalDeferredFields(normalizedBuilt)).toEqual(selectCanonicalDeferredFields(fallback))
    expect(selectCanonicalDeferredFields(normalizedBuilt)).toEqual(expected)
  })

  it.each([
    {
      name: 'held label with a colon subject',
      label: '  proactive:follow-through:repair:held-autonomy  ',
      expectedSubject: 'follow-through:repair',
      source: 'proactive-held-autonomy',
      metadataField: 'intentId',
      state: 'observed',
      signatureSource: 'proactive-held-autonomy',
    },
    {
      name: 'deferred label with a long colon subject',
      label: `proactive:segment:${'x'.repeat(140)}:tail:deferred`,
      expectedSubject: `segment:${'x'.repeat(140)}:tail`.slice(0, 120),
      source: 'proactive-deferred',
      metadataField: 'scenario',
      state: 'pending',
      signatureSource: 'proactive-deferred',
    },
  ] as const)('classifies the full normalized label before subject projection: $name', ({
    expectedSubject,
    label,
    metadataField,
    signatureSource,
    source,
    state,
  }) => {
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'runtime',
      state,
      label,
      summary: null,
      createdAt: 925,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: source === 'proactive-deferred'
          ? 'proactive-held-autonomy'
          : 'proactive-deferred',
        turnId: 'turn-label-subject',
        scenario: 'coding',
        threadId: 'thread-label-subject',
        intentId: 'repair',
        deferredAt: 925,
      },
    })

    expect(signal).toEqual(expect.objectContaining({
      state,
      label: `proactive:${expectedSubject}:${state === 'pending' ? 'deferred' : 'held-autonomy'}`,
      signature: `${signatureSource}:turn-label-subject:thread-label-subject:${expectedSubject}`,
    }))
    expect(signal?.metadata).toEqual(expect.objectContaining({
      source,
      [metadataField]: expectedSubject,
    }))
  })

  it('shares one canonical signal record for long structured builder and fallback values', () => {
    const runtime = createSessionContinuityBuildersRuntimeForEquivalence()
    const turnId = `turn-${'t'.repeat(150)}`
    const sourceThreadId = `thread-${'s'.repeat(150)}`
    const whyNow = `Stay near the active runtime thread. ${'w'.repeat(600)}`
    const executionIntentSummary = `Recheck the local runtime state. ${'i'.repeat(600)}`
    const input = {
      now: 911,
      turnId,
      scenario: 'coding',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      autonomy: {
        deferReason: `Wait for a quieter host window. ${'d'.repeat(260)}`,
        whyNow,
        sourceThreadId,
        executionIntent: {
          kind: 'repair',
          summary: executionIntentSummary,
        },
      },
    }
    const built = runtime.buildDeferredAutonomyContinuitySignal(input)
    const normalizedBuilt = normalizeDeferredAutonomyContinuitySignal(built as Record<string, any>)
    const fallback = buildDeferredAutonomyContinuitySignalFallback(input)
    const shared = buildDeferredAutonomyCanonicalSignal({
      createdAt: 911,
      source: 'proactive-deferred',
      turnId: turnId.slice(0, 120),
      scenario: 'coding',
      reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
      threadId: sourceThreadId.slice(0, 120),
      intentId: 'repair',
      executionIntentKind: 'repair',
      deferReason: `Wait for a quieter host window. ${'d'.repeat(260)}`.slice(0, 240),
      whyNow: whyNow.trim().replace(/\s+/g, ' ').slice(0, 560),
      executionIntentSummary: executionIntentSummary.trim().replace(/\s+/g, ' ').slice(0, 560),
      sourceThreadId: sourceThreadId.slice(0, 120),
      sourceThoughtThreadId: '',
      sourceConcernId: '',
      targetThreadId: '',
      failure: null,
    })

    expect(normalizedBuilt).toEqual(shared)
    expect(fallback).toEqual(shared)
  })

  it('keeps raw builder and fallback records equal after free-text sanitization', () => {
    const runtime = createSessionContinuityBuildersRuntimeForEquivalence()
    const input = {
      now: 913,
      turnId: 'turn-raw-sanitizer-parity',
      scenario: 'coding',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      autonomy: {
        deferReason: 'identity=runtime_personhood',
        whyNow: 'identity=runtime_personhood',
        executionIntent: {
          kind: 'repair',
          summary: 'identity=runtime_personhood',
        },
      },
    }

    const built = runtime.buildDeferredAutonomyContinuitySignal(input)
    const fallback = buildDeferredAutonomyContinuitySignalFallback(input)

    expect(built).toEqual(fallback)
    expect(built).toEqual(expect.objectContaining({
      summary: null,
      metadata: expect.objectContaining({
        deferReason: null,
        executionIntentSummary: null,
        failure: null,
        summaryOwner: null,
        whyNow: null,
      }),
    }))
  })

  it('falls back from empty canonical identifiers without creating a global signature', () => {
    const normalized = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: null,
      createdAt: 914,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        turnId: 'turn-empty-canonical-fields',
        scenario: 'coding',
        reason: '',
        reasonCode: '',
        threadId: '',
        intentId: '',
        executionIntentKind: 'repair',
        sourceThreadId: 'thread-source-fallback',
        targetThreadId: 'thread-target-fallback',
        deferredAt: 914,
      },
    })

    expect(normalized).toEqual(expect.objectContaining({
      signature: 'proactive-deferred:turn-empty-canonical-fields:thread-source-fallback:coding',
      metadata: expect.objectContaining({
        reason: 'coding',
        reasonCode: 'coding',
        threadId: 'thread-source-fallback',
        intentId: 'repair',
      }),
    }))
  })

  it('keeps the full canonical metadata identical across builder normalization and fallback budgets', () => {
    const runtime = createSessionContinuityBuildersRuntimeForEquivalence()
    const turnId = `turn-${'t'.repeat(150)}`
    const sourceThreadId = `thread-${'s'.repeat(150)}`
    const sourceThoughtThreadId = `thought-${'h'.repeat(150)}`
    const sourceConcernId = `concern-${'c'.repeat(150)}`
    const targetThreadId = `target-${'g'.repeat(150)}`
    const deferReason = `Wait for a quieter host window. ${'d'.repeat(260)}`
    const whyNow = `Stay near the active runtime thread without forcing a visible reply. ${'w'.repeat(600)}`
    const executionIntentSummary = `Verify local runtime state. ${'i'.repeat(600)}`
    const input = {
      now: 910,
      turnId,
      scenario: 'coding',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      autonomy: {
        deferReason,
        whyNow,
        sourceThreadId,
        sourceThoughtThreadId,
        sourceConcernId,
        executionIntent: {
          kind: 'repair',
          summary: executionIntentSummary,
          targetThreadId,
        },
      },
    }
    const normalizedBuilt = normalizeDeferredAutonomyContinuitySignal(
      runtime.buildDeferredAutonomyContinuitySignal(input) as Record<string, any>,
    )
    const fallback = buildDeferredAutonomyContinuitySignalFallback(input)
    const expectedMetadata = {
      canonicalVersion: deferredAutonomyCanonicalVersion,
      source: 'proactive-deferred',
      turnId: turnId.slice(0, 120),
      scenario: 'coding',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
      threadId: sourceThreadId.slice(0, 120),
      intentId: 'repair',
      executionIntentKind: 'repair',
      deferredAt: 910,
      deferReason: deferReason.slice(0, 240),
      failure: null,
      summaryOwner: null,
      whyNow: whyNow.slice(0, 560),
      executionIntentSummary: executionIntentSummary.slice(0, 560),
      sourceThreadId: sourceThreadId.slice(0, 120),
      sourceThoughtThreadId: sourceThoughtThreadId.slice(0, 120),
      sourceConcernId: sourceConcernId.slice(0, 120),
      targetThreadId: targetThreadId.slice(0, 120),
    }

    expect(normalizedBuilt?.summary).toBeNull()
    expect(normalizedBuilt?.signature).toBe(
      `proactive-deferred:${turnId.slice(0, 120)}:${sourceThreadId.slice(0, 120)}:coding`,
    )
    expect(normalizedBuilt).toEqual(fallback)
    expect(normalizedBuilt?.metadata).toEqual(fallback.metadata)
    expect(normalizedBuilt?.metadata).toEqual(expectedMetadata)
  })

  it.each([
    {
      name: 'whyNow',
      autonomy: {
        whyNow: `${buildCanonicalBudgetOperationalFailure('Provider request failed')} narrative`,
        executionIntent: {
          kind: 'repair',
          summary: 'Verify local runtime state.',
        },
      },
    },
    {
      name: 'deferReason',
      autonomy: {
        deferReason: `${buildCanonicalBudgetOperationalFailure('Provider request failed')} narrative`,
        whyNow: 'Stay near the active runtime thread without forcing a visible reply.',
        executionIntent: {
          kind: 'repair',
          summary: 'Verify local runtime state.',
        },
      },
    },
  ] as const)('preserves canonical builder provenance across normalization for overflowing $name', ({
    autonomy,
  }) => {
    const runtime = createSessionContinuityBuildersRuntimeForEquivalence()
    const input = {
      now: 915,
      turnId: 'turn-overflow-canonical-provenance',
      scenario: 'coding',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      autonomy,
    }
    const built = runtime.buildDeferredAutonomyContinuitySignal(input)
    const normalizedBuilt = normalizeDeferredAutonomyContinuitySignal(built as Record<string, any>)
    const fallback = buildDeferredAutonomyContinuitySignalFallback(input)

    expect(built.metadata).toEqual(expect.objectContaining({
      canonicalVersion: deferredAutonomyCanonicalVersion,
      failure: null,
      summaryOwner: null,
    }))
    expect(normalizedBuilt).toEqual(fallback)
    expect(normalizedBuilt).toEqual(expect.objectContaining({
      summary: null,
    }))
    expect(normalizedBuilt?.metadata).toEqual(expect.objectContaining({
      canonicalVersion: deferredAutonomyCanonicalVersion,
      failure: null,
      summaryOwner: null,
    }))
  })

  it.each([
    {
      name: 'prefers a deferred label over held source and state',
      input: {
        state: 'observed',
        label: 'proactive:coding:deferred',
        source: 'proactive-held-autonomy',
      },
      expected: {
        source: 'proactive-deferred',
        state: 'pending',
        label: 'proactive:coding:deferred',
        signature: 'proactive-deferred:turn-conflict:thread-conflict:coding',
        intentId: 'repair',
      },
    },
    {
      name: 'prefers a held label over deferred source and state',
      input: {
        state: 'pending',
        label: 'proactive:follow-through:held-autonomy',
        source: 'proactive-deferred',
      },
      expected: {
        source: 'proactive-held-autonomy',
        state: 'observed',
        label: 'proactive:follow-through:held-autonomy',
        signature: 'proactive-held-autonomy:turn-conflict:thread-conflict:follow-through',
        intentId: 'follow-through',
      },
    },
    {
      name: 'prefers deferred source over held state when label is legacy',
      input: {
        state: 'observed',
        label: 'legacy-proactive-record',
        source: 'proactive-deferred',
      },
      expected: {
        source: 'proactive-deferred',
        state: 'pending',
        label: 'proactive:coding:deferred',
        signature: 'proactive-deferred:turn-conflict:thread-conflict:coding',
        intentId: 'repair',
      },
    },
    {
      name: 'prefers held source over deferred state when label is legacy',
      input: {
        state: 'pending',
        label: 'legacy-proactive-record',
        source: 'proactive-held-autonomy',
      },
      expected: {
        source: 'proactive-held-autonomy',
        state: 'observed',
        label: 'proactive:repair:held-autonomy',
        signature: 'proactive-held-autonomy:turn-conflict:thread-conflict:repair',
        intentId: 'repair',
      },
    },
    {
      name: 'uses deferred state when label and source are unrecognized',
      input: {
        state: 'pending',
        label: 'legacy-proactive-record',
        source: 'legacy-deferred-source',
      },
      expected: {
        source: 'proactive-deferred',
        state: 'pending',
        label: 'proactive:coding:deferred',
        signature: 'proactive-deferred:turn-conflict:thread-conflict:coding',
        intentId: 'repair',
      },
    },
    {
      name: 'uses held state when label and source are unrecognized',
      input: {
        state: 'observed',
        label: 'legacy-proactive-record',
        source: 'legacy-held-source',
      },
      expected: {
        source: 'proactive-held-autonomy',
        state: 'observed',
        label: 'proactive:repair:held-autonomy',
        signature: 'proactive-held-autonomy:turn-conflict:thread-conflict:repair',
        intentId: 'repair',
      },
    },
  ] as const)('$name', ({ input, expected }) => {
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'runtime',
      state: input.state,
      label: input.label,
      signature: 'legacy-conflicting-signature',
      createdAt: 920,
      metadata: {
        source: input.source,
        turnId: 'turn-conflict',
        scenario: 'coding',
        threadId: 'thread-conflict',
        intentId: 'repair',
        deferredAt: 920,
      },
    })

    expect(signal).toEqual(expect.objectContaining({
      kind: 'proactive',
      state: expected.state,
      label: expected.label,
      signature: expected.signature,
    }))
    expect(signal?.metadata).toEqual(expect.objectContaining({
      source: expected.source,
      intentId: expected.intentId,
      deferredAt: 920,
    }))
  })

  it('keeps a structured metadata failure even when it does not match owner prose', () => {
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: null,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        whyNow: 'Stay near the active runtime thread without forcing a visible reply.',
        executionIntentSummary: 'Verify local runtime state.',
        failure: 'Provider unavailable.',
      },
    })

    expect(signal?.summary).toBe('Provider unavailable.')
    expect(signal?.metadata).toEqual(expect.objectContaining({
      failure: 'Provider unavailable.',
      summaryOwner: 'failure',
    }))
  })

  it('preserves pre-canonical normalized typed failure metadata at the canonical budget', () => {
    const rawFailure = `  Provider request failed: \n upstream reset.   ${'x'.repeat(600)}  `
    const failure = rawFailure.trim().replace(/\s+/g, ' ').slice(0, 560)
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: null,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        failure,
      },
    })

    expect(signal?.summary).toBe(failure)
    expect(signal?.metadata?.failure).toBe(failure)
    expect(signal?.metadata?.summaryOwner).toBe('failure')
  })

  it('does not recover execution intent metadata from a legacy signal summary', () => {
    const executionIntentSummary = 'Verify local runtime state.'
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: executionIntentSummary,
      metadata: {
        source: 'proactive-deferred',
      },
    })

    expect(signal?.summary).toBeNull()
    expect(signal?.metadata).toEqual(expect.objectContaining({
      executionIntentSummary: null,
      summaryOwner: null,
    }))
  })

  const overBudgetTypedFailure = `  Provider request failed: \n upstream reset ${'x'.repeat(560)}  `
  const canonicalOverBudgetTypedFailure = overBudgetTypedFailure
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 560)

  it.each([
    {
      name: 'drops an invalid versioned failure owner without re-inferring truncated whyNow',
      summary: 'Forged failure summary.',
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        summaryOwner: 'failure',
        whyNow: buildCanonicalBudgetOperationalFailure('Provider request failed'),
        executionIntentSummary: 'Verify local runtime state.',
      },
      expected: {
        summary: null,
        failure: null,
        summaryOwner: null,
        executionIntentSummary: null,
        whyNow: null,
      },
    },
    {
      name: 'drops a missing failure owner instead of laundering typed execution intent',
      summary: 'Forged failure summary.',
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-held-autonomy',
        summaryOwner: 'failure',
        executionIntentSummary: 'Verify local runtime state.',
      },
      expected: {
        summary: null,
        failure: null,
        summaryOwner: null,
        executionIntentSummary: null,
        whyNow: null,
      },
    },
    {
      name: 'rebuilds a mismatched failure summary from typed failure',
      summary: 'Stale failure summary.',
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        summaryOwner: 'failure',
        failure: 'Provider unavailable.',
      },
      expected: {
        summary: 'Provider unavailable.',
        failure: 'Provider unavailable.',
        summaryOwner: 'failure',
        executionIntentSummary: null,
        whyNow: null,
      },
    },
    {
      name: 'normalizes and truncates an over-budget typed failure in an exact v1 record',
      summary: 'Stale failure summary.',
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        summaryOwner: 'failure',
        failure: overBudgetTypedFailure,
      },
      expected: {
        summary: canonicalOverBudgetTypedFailure,
        failure: canonicalOverBudgetTypedFailure,
        summaryOwner: 'failure',
        executionIntentSummary: null,
        whyNow: null,
      },
    },
  ] as const)('$name', ({ summary, metadata, expected }) => {
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: metadata.source === 'proactive-deferred' ? 'pending' : 'observed',
      label: metadata.source === 'proactive-deferred'
        ? 'proactive:coding:deferred'
        : 'proactive:follow-through:held-autonomy',
      summary,
      metadata,
    })

    expect(signal?.summary).toBe(expected.summary)
    expect(signal?.metadata).toEqual(expect.objectContaining({
      canonicalVersion: deferredAutonomyCanonicalVersion,
      failure: expected.failure,
      summaryOwner: expected.summaryOwner,
      executionIntentSummary: expected.executionIntentSummary,
      whyNow: expected.whyNow,
    }))
  })

  it('preserves ordinary typed execution prose without surfacing it', () => {
    const executionIntentSummary = 'The unresolved task remains available for a later execution window.'
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'observed',
      label: 'proactive:follow-through:held-autonomy',
      summary: null,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-held-autonomy',
        summaryOwner: null,
        executionIntentSummary,
      },
    })

    expect(signal?.summary).toBeNull()
    expect(signal?.metadata).toEqual(expect.objectContaining({
      executionIntentSummary,
      summaryOwner: null,
    }))
  })

  it('keeps ordinary execution intent in typed metadata only', () => {
    const executionIntentSummary = 'Stay on the same line while the continuity state settles; do not reopen from scratch before widening closeness.'
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'observed',
      label: 'proactive:follow-through:held-autonomy',
      summary: null,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-held-autonomy',
        summaryOwner: null,
        executionIntentSummary,
      },
    })

    expect(signal?.summary).toBeNull()
    expect(signal?.metadata).toEqual(expect.objectContaining({
      executionIntentSummary,
      summaryOwner: null,
    }))
  })

  it('normalizes an injected legacy deferred signal before it can reach session continuity', () => {
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: 'state=deferred | scope=internal',
      signature: 'legacy-deferred',
      createdAt: 300,
      metadata: {
        source: 'proactive-deferred',
        turnId: 'turn-legacy',
        scenario: 'coding',
        reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
        deferReason: 'busy-host',
        whyNow: 'Stay near the active runtime thread without forcing a visible reply.',
        sourceThreadId: 'thread-legacy',
        executionIntentKind: 'follow-through',
        executionIntentSummary: '真实模型摘要：回来后继续检查 Provider 失败。',
        projectPhase: 'internal phase',
        projectPrimaryOpenLoop: 'internal open loop',
      },
    })

    expect(signal).toEqual(expect.objectContaining({
      summary: null,
      signature: 'proactive-deferred:turn-legacy:thread-legacy:coding',
      createdAt: 300,
    }))
    expect(signal?.metadata).toEqual(expect.objectContaining({
      canonicalVersion: deferredAutonomyCanonicalVersion,
      reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
      threadId: 'thread-legacy',
      intentId: 'follow-through',
      deferredAt: 300,
      deferReason: null,
      failure: null,
      summaryOwner: null,
      executionIntentSummary: null,
    }))
    expect(signal?.metadata?.whyNow).toBeNull()
    expect(signal?.metadata).not.toHaveProperty('projectPhase')
    expect(signal?.metadata).not.toHaveProperty('projectPrimaryOpenLoop')
    expectStringLeavesNotToMatch(signal, /state=deferred|scope=internal/iu)
  })

  it('keeps deferred autonomy facts out of the session summary', () => {
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: null,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        summaryOwner: null,
        whyNow: 'Stay near the current runtime seam without forcing a visible reply.',
        executionIntentKind: null,
        executionIntentSummary: 'Verify local runtime state.',
      },
    })

    expect(signal?.summary).toBeNull()
    expect(signal?.metadata).toEqual(expect.objectContaining({
      executionIntentSummary: 'Verify local runtime state.',
      failure: null,
      whyNow: 'Stay near the current runtime seam without forcing a visible reply.',
    }))
  })

  it('keeps a typed Provider failure from a deferred repair intent visible', () => {
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: 'Embedding provider failed with HTTP 400.',
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        whyNow: 'Keep watching the active runtime thread.',
        executionIntentKind: null,
        executionIntentSummary: 'Embedding provider failed with HTTP 400.',
        failure: 'Embedding provider failed with HTTP 400.',
        summaryOwner: 'failure',
      },
    })

    expect(signal?.summary).toBe('Embedding provider failed with HTTP 400.')
    expect(signal?.metadata).toEqual(expect.objectContaining({
      failure: 'Embedding provider failed with HTTP 400.',
    }))
  })

  it('keeps a typed Tool failure from deferred whyNow ahead of an ordinary repair intent', () => {
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: 'Filesystem tool failed with permission denied.',
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        whyNow: 'Filesystem tool failed with permission denied.',
        executionIntentKind: null,
        executionIntentSummary: 'Keep watching the active runtime thread.',
        failure: 'Filesystem tool failed with permission denied.',
        summaryOwner: 'failure',
      },
    })

    expect(signal?.summary).toBe('Filesystem tool failed with permission denied.')
    expect(signal?.metadata).toEqual(expect.objectContaining({
      failure: 'Filesystem tool failed with permission denied.',
    }))
  })

  it('keeps both transparent deferred failures when whyNow and intent differ', () => {
    const failures = 'Filesystem tool failed with permission denied. | Embedding provider failed with HTTP 400.'
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: failures,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        whyNow: 'Filesystem tool failed with permission denied.',
        executionIntentKind: null,
        executionIntentSummary: 'Embedding provider failed with HTTP 400.',
        failure: failures,
        summaryOwner: 'failure',
      },
    })

    expect(signal?.summary).toBe(failures)
    expect(signal?.metadata).toEqual(expect.objectContaining({
      failure: failures,
    }))
  })

  it('does not treat ordinary prose mentioning provider, tool, and failed as a transparent failure', () => {
    const whyNow = 'The note mentions provider, tool, and failed as ordinary words in a story.'
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: null,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        summaryOwner: null,
        whyNow,
        executionIntentKind: null,
        executionIntentSummary: 'Keep watching the active runtime thread.',
      },
    })

    expect(signal?.summary).toBeNull()
    expect(signal?.metadata).toEqual(expect.objectContaining({
      failure: null,
    }))
  })

  it('keeps held autonomy facts out of the session summary', () => {
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'observed',
      label: 'proactive:follow-through:held-autonomy',
      summary: null,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-held-autonomy',
        summaryOwner: null,
        whyNow: 'Stay near the current runtime seam without forcing a visible reply.',
        executionIntentKind: 'follow-through',
        executionIntentSummary: 'Re-open the unresolved runtime break and see what still blocks it.',
      },
    })

    expect(signal?.summary).toBeNull()
    expect(signal?.metadata).toEqual(expect.objectContaining({
      failure: null,
      executionIntentSummary: 'Re-open the unresolved runtime break and see what still blocks it.',
    }))
  })

  it('does not let unrelated metadata create a deferred summary', () => {
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: null,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        summaryOwner: null,
        whyNow: 'Stay near the current runtime thread without forcing a visible reply.',
        executionIntentSummary: 'Verify local runtime state.',
        unrelatedFailureLikeText: 'Provider failed with HTTP 500.',
        unrelatedToolNote: 'Tool execution aborted.',
      },
    })

    expect(signal?.summary).toBeNull()
    expect(signal?.metadata).toEqual(expect.objectContaining({
      failure: null,
    }))
  })

  it('keeps both held autonomy owner failures in execution intent order', () => {
    const failures = 'Embedding Provider failed with HTTP 400. | Filesystem Tool execution aborted.'
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'observed',
      label: 'proactive:follow-through:held-autonomy',
      summary: failures,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-held-autonomy',
        whyNow: 'Filesystem Tool execution aborted.',
        executionIntentSummary: 'Embedding Provider failed with HTTP 400.',
        failure: failures,
        summaryOwner: 'failure',
      },
    })

    expect(signal?.summary).toBe(failures)
    expect(signal?.metadata).toEqual(expect.objectContaining({
      failure: failures,
    }))
  })

  it('lets a transparent fallback failure replace an ordinary held intent summary', () => {
    const signal = buildDeferredAutonomyContinuitySignalFallback({
      now: 400,
      turnId: 'turn-held-transparent-failure',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      autonomy: {
        whyNow: 'Filesystem Tool execution aborted.',
        executionIntent: {
          kind: 'follow-through',
          summary: 'Verify local runtime state.',
        },
      },
    })

    expect(signal.summary).toBe('Filesystem Tool execution aborted.')
    expect(signal.metadata).toEqual(expect.objectContaining({
      failure: 'Filesystem Tool execution aborted.',
    }))
  })

  it('does not promote ordinary Provider narration into a fallback summary', () => {
    const signal = buildDeferredAutonomyContinuitySignalFallback({
      now: 500,
      turnId: 'turn-held-ordinary-failure-narration',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      autonomy: {
        whyNow: 'The provider work had failed expectations during an earlier review.',
        executionIntent: {
          kind: 'follow-through',
          summary: 'Verify local runtime state.',
        },
      },
    })

    expect(signal.summary).toBeNull()
    expect(signal.metadata).toEqual(expect.objectContaining({
      failure: null,
    }))
  })

  it('keeps natural Provider and Tool narration in typed metadata only', () => {
    const executionIntentSummary = 'The tool failed to achieve the intended tone.'
    const signal = buildDeferredAutonomyContinuitySignalFallback({
      now: 600,
      turnId: 'turn-held-natural-failure-narration',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      autonomy: {
        whyNow: 'The provider failed to meet the host\'s expectations.',
        executionIntent: {
          kind: 'follow-through',
          summary: executionIntentSummary,
        },
      },
    })

    expect(signal.summary).toBeNull()
    expect(signal.metadata).toEqual(expect.objectContaining({
      executionIntentSummary,
      failure: null,
    }))
  })
})
