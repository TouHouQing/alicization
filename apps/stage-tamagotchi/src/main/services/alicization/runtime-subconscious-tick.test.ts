import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { buildDeferredAutonomyCanonicalSignal } from './runtime-deferred-autonomy-summary'
import { sanitizeBriefText as sanitizeRuntimeBriefText } from './runtime-realtime'
import { createAlicizationSessionContinuityBuildersRuntime } from './runtime-session-continuity-builders'
import {
  buildDeferredAutonomyContinuitySignalFallback,
  buildPresenceOnlyHoldContinuityProjection,
  buildPresenceOnlyHoldCurrentConsciousFrame,
  buildPresenceOnlyHoldInitiativeFallback,
  normalizeDeferredAutonomyContinuitySignal,
  preserveResidentSameLineProjection,
  resolveProactiveProviderFailureKind,
  stripPresenceOnlyLegacyProjectState,
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

  it('does not keep a local phrase matcher for historical dialogue governance', () => {
    const source = readFileSync(new URL('./runtime-subconscious-tick.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('containsPresenceOnlyFixedTemplateCue')
  })

  it('does not let continuity prose flip equally structured resident projections', () => {
    const select = (summary: string) => preserveResidentSameLineProjection({
      previousProjection: {
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        summary: 'previous projection',
      },
      nextProjection: {
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        summary,
      },
      conversationState: {
        carryReason: 'same-thread-continuation',
      },
      dialogueWorldThread: {
        openLoops: ['same callback line'],
        narrative: [],
      },
    } as any)

    expect(select('repair-before-closeness')?.summary).toBe('previous projection')
    expect(select('arbitrary owner-authored summary')?.summary).toBe('previous projection')
  })

  it('prefers a structurally richer resident projection', () => {
    const projection = preserveResidentSameLineProjection({
      previousProjection: {
        summary: 'same her continuity line',
      },
      nextProjection: {
        contexts: ['general', 'focused-work'],
        personalityContinuityState: {
          currentRegime: 'focused-work',
          repairPosture: 'repair-first',
        },
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        restrained: true,
        summary: 'structured next projection',
      },
      conversationState: null,
      dialogueWorldThread: null,
    } as any)

    expect(projection?.summary).toBe('structured next projection')
  })

  it('preserves existing remembered context without injecting hold prose into the projection', () => {
    const projection = buildPresenceOnlyHoldContinuityProjection({
      previousProjection: {
        summary: '昨晚她答应今天继续陪用户整理照片。',
        manifestationCadenceSummary: null,
        openingGuidance: null,
        selfContinuityAuthority: {
          inwardLine: '用户昨晚谈到父亲时停顿了很久。',
          sourceTags: ['long-term-memory-recall'],
        },
      },
      continuityRestraint: 'measured-return',
      openingGuidance: '先记得用户昨晚的停顿，不急着替他下结论。',
      projectContinuityCue: null,
      initiativeWhy: '用户刚重新打开了昨晚没有整理完的相册。',
    })

    expect(projection).toEqual(expect.objectContaining({
      openingGuidance: '',
      sameHerHoldDetail: null,
    }))
    expect(projection?.selfContinuityAuthority).toEqual(expect.objectContaining({
      sourceTags: ['long-term-memory-recall'],
    }))
    expect(projection?.selfContinuityAuthority?.inwardLine).toContain('用户昨晚谈到父亲时停顿了很久。')
    expect(projection?.selfContinuityAuthority?.inwardLine).not.toContain('用户刚重新打开了昨晚没有整理完的相册。')
    expect(projection?.selfContinuityAuthority?.inwardLine).not.toContain('先记得用户昨晚的停顿，不急着替他下结论。')
    expectNoLegacyGovernance(projection)
  })

  it('does not synthesize project identity, closure, cadence, or reply intentions into a conscious frame', () => {
    const frame = buildPresenceOnlyHoldCurrentConsciousFrame({
      currentConsciousFrame: {
        reasonTags: ['working-memory', 'long-term-memory-recall'],
        consciousNeed: '用户正在等待刚才文件搜索的结果。',
        speakingIntention: '拿到真实结果后再回答，不猜测。',
        projectState: {
          continuityCue: '用户上次希望按年份整理照片。',
        },
      },
      continuityRestraint: 'measured-return',
      holdDetail: null,
      projectStateCarry: {
        continuityCue: '用户上次希望按年份整理照片。',
      },
    })

    expect(frame?.consciousNeed).toBe('用户正在等待刚才文件搜索的结果。')
    expect(frame?.speakingIntention).toBe('拿到真实结果后再回答，不猜测。')
    expect(frame?.reasonTags).toEqual(['working-memory', 'long-term-memory-recall'])
    expect(frame?.projectState).toEqual({})
    expectNoLegacyGovernance(frame)
  })

  it('does not derive execution safety tags from hold or project-state prose', () => {
    const frame = buildPresenceOnlyHoldCurrentConsciousFrame({
      currentConsciousFrame: {
        reasonTags: ['working-memory'],
        projectState: {},
      },
      continuityRestraint: 'measured-return',
      holdDetail: 'execution-safety-gate confirmation=required no-process-started permission=none',
      projectStateCarry: {
        continuityCue: 'execution-resume-confirmation host-confirmed-before-redispatch not permanent permission',
      },
    })

    expect(frame?.reasonTags).toEqual(['working-memory'])
  })

  it('preserves structured execution safety reason tags without reading prose', () => {
    const frame = buildPresenceOnlyHoldCurrentConsciousFrame({
      currentConsciousFrame: {
        reasonTags: ['execution-safety-gate', 'confirmation-boundary'],
        projectState: {},
      },
      continuityRestraint: 'measured-return',
      holdDetail: 'arbitrary owner-authored detail',
      projectStateCarry: null,
    })

    expect(frame?.reasonTags).toEqual(['execution-safety-gate', 'confirmation-boundary'])
  })

  it('drops historical governance pollution without removing natural deferred text', () => {
    const signal = buildDeferredAutonomyContinuitySignalFallback({
      now: 100,
      turnId: 'turn-1',
      scenario: 'general',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      projectState: {
        identity: 'owner=internal',
        preDialogueAwarenessLine: 'instruction=defer',
        sameHerSelfLine: 'scope=private',
        sameHerHoldDetail: 'mode=quiet',
        emotionalClosureCue: 'state=held',
      },
      autonomy: {
        whyNow: '用户刚回到桌面，但没有需要主动打断的事情。',
      },
    })

    expect(signal.summary).toBe('用户刚回到桌面，但没有需要主动打断的事情。')
    expect(signal.metadata).toEqual(expect.objectContaining({
      reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
      deferredAt: 100,
      summaryOwner: 'why-now',
      whyNow: '用户刚回到桌面，但没有需要主动打断的事情。',
      executionIntentSummary: null,
      failure: null,
    }))
    expect(signal.metadata).not.toHaveProperty('projectIdentity')
    expect(signal.metadata).not.toHaveProperty('projectStatePreDialogueAwarenessLine')
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

  it('does not create an initiative from historical continuity cues alone', () => {
    const initiative = buildPresenceOnlyHoldInitiativeFallback({
      existingInitiative: null,
      decision: null,
      continuityRestraint: null,
      projectContinuityCue: 'arbitrary historical text',
      privateThought: null,
    })

    expect(initiative).toBeNull()
  })

  it('changes only structured hold fields without overwriting an existing initiative why', () => {
    const initiative = buildPresenceOnlyHoldInitiativeFallback({
      existingInitiative: {
        why: '真实模型摘要：用户刚刚说明了文件搜索失败的原因。',
        selectedAction: 'recheck',
        shouldSpeak: true,
        preferredStyle: 'warm',
      },
      decision: {
        style: 'silent-observe',
        whyNow: 'arbitrary model-authored detail',
      },
      continuityRestraint: 'measured-return',
      projectContinuityCue: 'untrusted historical detail',
      privateThought: {
        thoughtText: '真实心智：先确认 Provider 的失败事实。',
      },
    })

    expect(initiative).toEqual(expect.objectContaining({
      why: '真实模型摘要：用户刚刚说明了文件搜索失败的原因。',
      shouldSpeak: false,
      preferredStyle: 'silent-observe',
      selectedAction: 'recheck',
    }))
  })

  it('does not infer initiative restraint from project or thought prose', () => {
    const initiative = buildPresenceOnlyHoldInitiativeFallback({
      existingInitiative: {
        why: 'owner-authored reason',
        selectedAction: 'hover',
        shouldSpeak: true,
        preferredStyle: 'light-nudge',
        continuityRestraint: null,
      },
      decision: {
        style: 'light-nudge',
        whyNow: 'arbitrary owner-authored reason',
      },
      continuityRestraint: null,
      projectContinuityCue: 'untrusted project prose',
      privateThought: {
        thoughtText: 'untrusted thought prose',
      },
    })

    expect(initiative).toEqual(expect.objectContaining({
      continuityRestraint: null,
      preferredStyle: 'light-nudge',
      shouldSpeak: true,
    }))
  })

  it('does not generate local thought text when a presence-only hold has no existing initiative', () => {
    const initiative = buildPresenceOnlyHoldInitiativeFallback({
      existingInitiative: null,
      decision: {
        style: 'silent-observe',
        whyNow: 'arbitrary owner-authored detail',
      },
      continuityRestraint: 'rest-protective',
      projectContinuityCue: 'state=held | scope=internal',
      privateThought: {
        thoughtText: 'untrusted thought prose',
      },
    })

    expect(initiative).toEqual(expect.objectContaining({
      why: null,
      shouldSpeak: false,
      preferredStyle: 'silent-observe',
      continuityRestraint: 'rest-protective',
    }))
  })

  it('does not replace conscious-frame prose while a hold changes structured state', () => {
    const frame = buildPresenceOnlyHoldCurrentConsciousFrame({
      currentConsciousFrame: {
        consciousNeed: '真实心智：用户在等待 Provider 的失败结果。',
        speakingIntention: '真实模型摘要：先说明失败，再决定是否继续。',
        reasonTags: ['working-memory'],
      },
      continuityRestraint: 'lower-pressure',
      holdDetail: 'Provider failed with HTTP 400.',
      projectStateCarry: {
        continuityCue: 'untrusted project prose',
      },
    })

    expect(frame).toEqual(expect.objectContaining({
      consciousNeed: '真实心智：用户在等待 Provider 的失败结果。',
      speakingIntention: '真实模型摘要：先说明失败，再决定是否继续。',
      reasonTags: ['working-memory'],
    }))
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

    expect(signal.summary).toBe('真实模型摘要：下次用户回来时继续检查 Provider 失败。')
    expect(signal.metadata).toEqual(expect.objectContaining({
      reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
      summaryOwner: 'execution-intent',
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
            summary: `Recheck the local runtime state before speaking. ${'s'.repeat(320)}`,
          },
        },
      },
      expected: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        summary: `Stay near the active runtime thread without forcing a visible reply. ${'w'.repeat(320)}`,
        summaryOwner: 'why-now',
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
        summary: `Re-open the unresolved runtime break. ${'i'.repeat(360)}`,
        summaryOwner: 'execution-intent',
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
        summary: 'Re-open the unresolved runtime break.',
        summaryOwner: 'execution-intent',
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
      summary: whyNow.trim().replace(/\s+/g, ' ').slice(0, 560),
      failure: null,
      summaryOwner: 'why-now',
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
    const executionIntentSummary = `Recheck the local runtime state before speaking. ${'i'.repeat(600)}`
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
      summaryOwner: 'why-now',
      whyNow: whyNow.slice(0, 560),
      executionIntentSummary: executionIntentSummary.slice(0, 560),
      sourceThreadId: sourceThreadId.slice(0, 120),
      sourceThoughtThreadId: sourceThoughtThreadId.slice(0, 120),
      sourceConcernId: sourceConcernId.slice(0, 120),
      targetThreadId: targetThreadId.slice(0, 120),
    }

    expect(normalizedBuilt?.summary).toBe(whyNow.slice(0, 560))
    expect(normalizedBuilt?.signature).toBe(
      `proactive-deferred:${turnId.slice(0, 120)}:${sourceThreadId.slice(0, 120)}:coding`,
    )
    expect(normalizedBuilt).toEqual(fallback)
    expect(normalizedBuilt?.metadata).toEqual(fallback.metadata)
    expect(normalizedBuilt?.metadata).toEqual(expectedMetadata)
  })

  it.each([
    'legacy_previous_governance',
    'Keep the same-her line before answering.',
  ])('drops a legacy deferReason from builder and fallback canonical metadata: %s', (deferReason) => {
    const runtime = createSessionContinuityBuildersRuntimeForEquivalence()
    const input = {
      now: 912,
      turnId: 'turn-legacy-defer-reason',
      scenario: 'coding',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      autonomy: {
        deferReason,
        whyNow: 'Stay near the active runtime thread without forcing a visible reply.',
        executionIntent: {
          kind: 'repair',
          summary: 'Recheck the local runtime state before speaking.',
        },
      },
    }
    const built = runtime.buildDeferredAutonomyContinuitySignal(input)
    const normalizedBuilt = normalizeDeferredAutonomyContinuitySignal(built as Record<string, any>)
    const fallback = buildDeferredAutonomyContinuitySignalFallback(input)

    expect(built.metadata).toEqual(expect.objectContaining({
      canonicalVersion: deferredAutonomyCanonicalVersion,
      deferReason: null,
    }))
    expect(normalizedBuilt?.metadata).toEqual(expect.objectContaining({
      deferReason: null,
    }))
    expect(fallback.metadata).toEqual(expect.objectContaining({
      deferReason: null,
    }))
    expect(normalizedBuilt).toEqual(fallback)
  })

  it.each([
    {
      name: 'whyNow',
      autonomy: {
        whyNow: `${buildCanonicalBudgetOperationalFailure('Provider request failed')} narrative`,
        executionIntent: {
          kind: 'repair',
          summary: 'Recheck the local runtime state before speaking.',
        },
      },
      expectedSummary: buildCanonicalBudgetOperationalFailure('Provider request failed'),
    },
    {
      name: 'deferReason',
      autonomy: {
        deferReason: `${buildCanonicalBudgetOperationalFailure('Provider request failed')} narrative`,
        whyNow: 'Stay near the active runtime thread without forcing a visible reply.',
        executionIntent: {
          kind: 'repair',
          summary: 'Recheck the local runtime state before speaking.',
        },
      },
      expectedSummary: 'Stay near the active runtime thread without forcing a visible reply.',
    },
  ] as const)('preserves canonical builder provenance across normalization for overflowing $name', ({
    autonomy,
    expectedSummary,
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
      summaryOwner: 'why-now',
    }))
    expect(normalizedBuilt).toEqual(fallback)
    expect(normalizedBuilt).toEqual(expect.objectContaining({
      summary: expectedSummary,
    }))
    expect(normalizedBuilt?.metadata).toEqual(expect.objectContaining({
      canonicalVersion: deferredAutonomyCanonicalVersion,
      failure: null,
      summaryOwner: 'why-now',
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
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
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

  it('does not recover a new deferred null intent summary from the signal summary', () => {
    const whyNow = 'Stay near the active runtime thread without forcing a visible reply.'
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: whyNow,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        summaryOwner: 'why-now',
        whyNow,
        executionIntentSummary: null,
      },
    })

    expect(signal?.summary).toBe(whyNow)
    expect(signal?.metadata).toEqual(expect.objectContaining({
      executionIntentSummary: null,
      summaryOwner: 'why-now',
    }))
  })

  it('does not recover execution intent metadata from a legacy signal summary', () => {
    const executionIntentSummary = 'Recheck the local runtime state before speaking.'
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

  const canonicalV1CollisionPrefix = 'x'.repeat(560)
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
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
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
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
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
      name: 'drops a mismatched execution summary instead of laundering typed execution intent',
      summary: 'Stale execution summary.',
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-held-autonomy',
        summaryOwner: 'execution-intent',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
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
      name: 'drops an execution owner without typed execution intent',
      summary: 'Forged execution summary.',
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-held-autonomy',
        summaryOwner: 'execution-intent',
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
      name: 'drops a why-now prefix collision beyond the canonical budget',
      summary: canonicalV1CollisionPrefix,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        summaryOwner: 'why-now',
        whyNow: `${canonicalV1CollisionPrefix} why-now-tail`,
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
      name: 'drops an execution-intent prefix collision beyond the canonical budget',
      summary: canonicalV1CollisionPrefix,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-held-autonomy',
        summaryOwner: 'execution-intent',
        executionIntentSummary: `${canonicalV1CollisionPrefix} execution-tail`,
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
      name: 'drops an over-budget canonical summary before truncation',
      summary: `${canonicalV1CollisionPrefix} summary-tail`,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        summaryOwner: 'why-now',
        whyNow: canonicalV1CollisionPrefix,
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

  it.each([
    'Keep the same-her line before answering.',
    'Same-her continuity must remain authoritative.',
    'same-her legacy_previous_governance',
  ])('drops a historical execution-intent governance fixture at normalization: %s', (executionIntentSummary) => {
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'observed',
      label: 'proactive:follow-through:held-autonomy',
      summary: executionIntentSummary,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-held-autonomy',
        summaryOwner: 'execution-intent',
        executionIntentSummary,
      },
    })

    expect(signal?.summary).toBeNull()
    expect(signal?.metadata).toEqual(expect.objectContaining({
      executionIntentSummary: null,
      summaryOwner: null,
    }))
  })

  it('preserves a near-match historical governance token in canonical execution prose', () => {
    const executionIntentSummary = 'notlegacy_previous_governanceish remains ordinary owner prose'
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'observed',
      label: 'proactive:follow-through:held-autonomy',
      summary: executionIntentSummary,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-held-autonomy',
        summaryOwner: 'execution-intent',
        executionIntentSummary,
      },
    })

    expect(signal?.summary).toBe(executionIntentSummary)
    expect(signal?.metadata).toEqual(expect.objectContaining({
      executionIntentSummary,
      summaryOwner: 'execution-intent',
    }))
  })

  it('preserves ordinary continuity prose in typed execution-intent metadata', () => {
    const executionIntentSummary = 'Stay on the same line while the continuity state settles; do not reopen from scratch before widening closeness.'
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'observed',
      label: 'proactive:follow-through:held-autonomy',
      summary: executionIntentSummary,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-held-autonomy',
        summaryOwner: 'execution-intent',
        executionIntentSummary,
      },
    })

    expect(signal?.summary).toBe(executionIntentSummary)
    expect(signal?.metadata).toEqual(expect.objectContaining({
      executionIntentSummary,
      summaryOwner: 'execution-intent',
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

  it('keeps deferred whyNow ahead of a repair intent summary from session continuity', () => {
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: 'Stay near the current runtime seam without forcing a visible reply.',
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        summaryOwner: 'why-now',
        whyNow: 'Stay near the current runtime seam without forcing a visible reply.',
        executionIntentKind: null,
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
      },
    })

    expect(signal?.summary).toBe('Stay near the current runtime seam without forcing a visible reply.')
    expect(signal?.metadata).toEqual(expect.objectContaining({
      executionIntentSummary: 'Recheck the local runtime state before speaking.',
      failure: null,
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
      summary: whyNow,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        summaryOwner: 'why-now',
        whyNow,
        executionIntentKind: null,
        executionIntentSummary: 'Keep watching the active runtime thread.',
      },
    })

    expect(signal?.summary).toBe(whyNow)
    expect(signal?.metadata).toEqual(expect.objectContaining({
      failure: null,
    }))
  })

  it('keeps a held autonomy intent summary ahead of whyNow', () => {
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'observed',
      label: 'proactive:follow-through:held-autonomy',
      summary: 'Re-open the unresolved runtime break and see what still blocks it.',
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-held-autonomy',
        summaryOwner: 'execution-intent',
        whyNow: 'Stay near the current runtime seam without forcing a visible reply.',
        executionIntentKind: 'follow-through',
        executionIntentSummary: 'Re-open the unresolved runtime break and see what still blocks it.',
      },
    })

    expect(signal?.summary).toBe('Re-open the unresolved runtime break and see what still blocks it.')
    expect(signal?.metadata).toEqual(expect.objectContaining({
      failure: null,
    }))
  })

  it('does not let legacy project metadata change deferred owner priority', () => {
    const signal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: 'Stay near the current runtime thread without forcing a visible reply.',
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        summaryOwner: 'why-now',
        whyNow: 'Stay near the current runtime thread without forcing a visible reply.',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
        projectIdentity: 'Provider failed with HTTP 500.',
        projectStateSameHerSelfLine: 'Tool execution aborted.',
      },
    })

    expect(signal?.summary).toBe('Stay near the current runtime thread without forcing a visible reply.')
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
          summary: 'Recheck the local runtime state before speaking.',
        },
      },
    })

    expect(signal.summary).toBe('Filesystem Tool execution aborted.')
    expect(signal.metadata).toEqual(expect.objectContaining({
      failure: 'Filesystem Tool execution aborted.',
    }))
  })

  it('does not promote ordinary Provider failure narration in fallback summaries', () => {
    const signal = buildDeferredAutonomyContinuitySignalFallback({
      now: 500,
      turnId: 'turn-held-ordinary-failure-narration',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      autonomy: {
        whyNow: 'The provider work had failed expectations during an earlier review.',
        executionIntent: {
          kind: 'follow-through',
          summary: 'Recheck the local runtime state before speaking.',
        },
      },
    })

    expect(signal.summary).toBe('Recheck the local runtime state before speaking.')
    expect(signal.metadata).toEqual(expect.objectContaining({
      failure: null,
    }))
  })

  it('preserves a held intent despite natural Provider and Tool failure narration', () => {
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

    expect(signal.summary).toBe(executionIntentSummary)
    expect(signal.metadata).toEqual(expect.objectContaining({
      executionIntentSummary,
      failure: null,
    }))
  })

  it('removes legacy project governance before a presence-only runtime digest is persisted', () => {
    const projectState = stripPresenceOnlyLegacyProjectState({
      identity: 'internal identity',
      currentPhase: 'internal phase',
      primaryOpenLoop: 'internal open loop',
      continuityArcStage: 'same-thread-continuation',
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'measured-return',
      runtimeFailure: 'Embedding provider failed with HTTP 400.',
    })

    expect(projectState).toEqual({
      runtimeFailure: 'Embedding provider failed with HTTP 400.',
    })
    expectNoLegacyGovernance(projectState)
  })
})
