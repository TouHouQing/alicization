import { describe, expect, it } from 'vitest'

import { createAlicizationSessionContinuityBuildersRuntime } from './runtime-session-continuity-builders'

function createRuntime() {
  return createAlicizationSessionContinuityBuildersRuntime({
    sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw : fallback,
    sanitizeBriefText: (raw, maxChars) => String(raw ?? '').trim().slice(0, maxChars),
    sanitizeExecutionLedgerText: raw => String(raw ?? '').trim(),
    readTaskThreadActivityAt: thread => thread.completedAt ?? thread.updatedAt,
    terminalTaskThreadStatuses: new Set(['completed', 'failed', 'cancelled', 'blocked']),
    proactiveReplyWindowMs: 120_000,
    proactiveImplicitIgnoredAfterMs: 600_000,
    proactiveDismissCooldownMs: 1_800_000,
    buildVisualPresenceCapturePersistFingerprint: () => 'fingerprint',
  })
}

describe('runtime session continuity builders', () => {
  it('keeps pending proactive facts in metadata without a generated summary', () => {
    const runtime = createRuntime()
    const signal = runtime.buildPendingProactiveContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      pending: {
        turnId: 'turn-proactive-verify',
        scenario: 'coding',
        deliveredAt: Date.UTC(2026, 4, 22, 10, 8, 0),
        feedbackWindowMs: 120_000,
        learningAction: 'verify',
        learningFocuses: ['world-model'],
      } as any,
    })

    expect(signal.summary).toBeNull()
    expect(signal.metadata).toEqual({
      source: 'proactive-feedback',
      phase: 'pending',
      turnId: 'turn-proactive-verify',
      scenario: 'coding',
      deliveredAt: Date.UTC(2026, 4, 22, 10, 8, 0),
      feedbackWindowMs: 120_000,
      learningAction: 'verify',
    })
    expect(signal.metadata).not.toHaveProperty('learningFocuses')
  })

  it('does not copy proactive learning controls into session continuity metadata', () => {
    const runtime = createRuntime()
    const signal = runtime.buildProactiveOutcomeContinuitySignal({
      turnId: 'turn-proactive-feedback',
      scenario: 'coding',
      outcome: 'reply-within-120s',
      createdAt: Date.UTC(2026, 4, 22, 10, 12, 0),
      learningAction: 'verify',
      learningFocuses: [
        'source-evidence',
        'world-model',
        'Please keep source evidence wording in this natural note.',
      ],
    })

    expect(signal.summary).toBeNull()
    expect(signal.metadata).toEqual({
      source: 'proactive-feedback',
      turnId: 'turn-proactive-feedback',
      scenario: 'coding',
      outcome: 'reply-within-120s',
      learningAction: 'verify',
    })
    expect(signal.metadata).not.toHaveProperty('learningFocuses')
  })

  it('keeps proactive feedback mirror facts in metadata without a generated summary', () => {
    const runtime = createRuntime()
    const action = runtime.buildProactiveFeedbackSessionMirrorAction({
      source: 'runtime-session-continuity',
      outcome: {
        turnId: 'turn-proactive-feedback',
        scenario: 'coding',
        outcome: 'positive',
        createdAt: Date.UTC(2026, 4, 22, 10, 12, 0),
      },
    })

    expect(action.summary).toBeNull()
    expect(action.metadata).toEqual({
      source: 'runtime-session-continuity',
      turnId: 'turn-proactive-feedback',
      scenario: 'coding',
      outcome: 'positive',
    })
  })

  it('does not turn proactive feedback into project governance metadata', () => {
    const runtime = createRuntime()
    const signal = runtime.buildProactiveOutcomeContinuitySignal({
      turnId: 'turn-proactive-feedback',
      scenario: 'coding',
      outcome: 'reply-within-120s',
      createdAt: Date.UTC(2026, 4, 22, 10, 12, 0),
      learningAction: 'verify',
      learningFocuses: ['world-model'],
    })

    expect(signal.metadata).not.toHaveProperty('learningFocuses')
    expect(signal.metadata).not.toHaveProperty('projectStateOpenFocusSummary')
    expect(signal.metadata).not.toHaveProperty('projectStateNextFocusSummary')
    expect(signal.metadata).not.toHaveProperty('projectStateEmotionalClosureCue')
  })

  it('keeps held autonomy facts without generating a visible summary', () => {
    const runtime = createRuntime()
    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:held',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      autonomy: {
        deferReason: 'busy-host',
        whyNow: 'The unresolved runtime thread remains available.',
        sourceThreadId: 'thread-runtime',
        sourceThoughtThreadId: 'thought-runtime',
        sourceConcernId: 'concern-runtime',
        executionIntent: {
          kind: 'follow-through',
          summary: 're-open the unresolved runtime break and see what still blocks it',
          targetThreadId: 'thread-runtime',
        },
      },
    })

    expect(signal.label).toBe('proactive:follow-through:held-autonomy')
    expect(signal.summary).toBeNull()
    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-held-autonomy',
      summaryOwner: null,
      sourceThreadId: 'thread-runtime',
      sourceThoughtThreadId: 'thought-runtime',
      sourceConcernId: 'concern-runtime',
      executionIntentKind: 'follow-through',
      executionIntentSummary: 're-open the unresolved runtime break and see what still blocks it',
      targetThreadId: 'thread-runtime',
    }))
  })

  it('keeps deferred autonomy prose in metadata without making it visible', () => {
    const runtime = createRuntime()
    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      autonomy: {
        whyNow: 'Keep the unresolved runtime thread available without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
        executionIntent: {
          kind: 'repair',
          summary: 'Recheck the local runtime state before speaking.',
        },
      },
    })

    expect(signal.label).toBe('proactive:coding:deferred')
    expect(signal.state).toBe('pending')
    expect(signal.summary).toBeNull()
    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      summaryOwner: null,
      whyNow: 'Keep the unresolved runtime thread available without forcing a visible reply.',
      scenario: 'coding',
      sourceThreadId: 'thread-runtime',
      executionIntentKind: 'repair',
    }))
  })

  it('prefers a provider failure reported by whyNow for deferred continuity', () => {
    const runtime = createRuntime()
    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:provider-failure',
      scenario: 'general',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      autonomy: {
        whyNow: 'Embedding provider failed with HTTP 400.',
        executionIntent: {
          kind: 'repair',
          summary: 'Resume the local runtime check when it is safe.',
        },
      },
    })

    expect(signal.summary).toBe('Embedding provider failed with HTTP 400.')
    expect(signal.metadata).toEqual(expect.objectContaining({
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      summaryOwner: 'failure',
      executionIntentKind: 'repair',
      executionIntentSummary: 'Resume the local runtime check when it is safe.',
    }))
  })

  it('prefers a tool failure in a repair intent summary over ordinary whyNow text', () => {
    const runtime = createRuntime()
    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:tool-failure-intent',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      autonomy: {
        whyNow: 'Keep watching the active runtime thread.',
        executionIntent: {
          kind: 'repair',
          summary: 'Filesystem tool failed with permission denied.',
        },
      },
    })

    expect(signal.summary).toBe('Filesystem tool failed with permission denied.')
  })

  it('prefers a tool failure reported by whyNow over an ordinary repair intent summary', () => {
    const runtime = createRuntime()
    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:tool-failure-why-now',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      autonomy: {
        whyNow: 'Filesystem tool failed with permission denied.',
        executionIntent: {
          kind: 'repair',
          summary: 'Keep watching the active runtime thread.',
        },
      },
    })

    expect(signal.summary).toBe('Filesystem tool failed with permission denied.')
  })

  it('returns no deferred continuity summary when whyNow and repair intent summary are empty', () => {
    const runtime = createRuntime()
    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:empty-deferred',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      autonomy: {
        whyNow: '',
        executionIntent: {
          kind: 'repair',
          summary: '',
        },
      },
    })

    expect(signal.summary).toBeNull()
  })

  it('does not rebuild canonical project governance for an afterglow event without explicit project facts', () => {
    const runtime = createRuntime()
    const [signal] = runtime.buildAutobiographicalAfterglowContinuitySignals({
      activeSessionId: 'session-current',
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      events: [{
        id: 'episode-afterglow-without-project-facts',
        occurredAt: Date.UTC(2026, 4, 22, 10, 0, 0),
        sourceKind: 'maintenance',
        sourceSummary: '用户刚才完成了一次真实的文件整理。',
        relationshipMeaning: '这次整理让用户轻松了一点。',
        lesson: '以后可以先确认文件范围再继续。',
        whatChanged: '文件整理完成。',
        whatHappened: '完成一次真实的文件整理。',
        tags: ['afterthought'],
        sessionId: 'session-previous',
        threadAnchor: 'thread-files',
        provenance: 'self-authored',
        confidence: 0.8,
      } as any],
    })

    expect(signal?.summary).toBe('完成一次真实的文件整理。')
    expect(signal?.metadata).toEqual(expect.objectContaining({
      threadAnchor: 'thread-files',
    }))
    expect(signal?.metadata).not.toHaveProperty('projectStatePreDialogueAwarenessLine')
    expect(signal?.metadata).not.toHaveProperty('projectStatePreflightSummary')
    expect(signal?.metadata).not.toHaveProperty('projectLatestLandedProgress')
    expect(signal?.metadata).not.toHaveProperty('projectIdentity')
    expect(signal?.metadata).not.toHaveProperty('projectPrimaryOpenLoop')
    expect(signal?.metadata).not.toHaveProperty('projectNextClosureTarget')
  })

  it('keeps opaque event identifiers unchanged', () => {
    const runtime = createRuntime()
    const [signal] = runtime.buildAutobiographicalAfterglowContinuitySignals({
      activeSessionId: 'session-current',
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      events: [{
        id: 'episode-maintenance-2026-05-22',
        occurredAt: Date.UTC(2026, 4, 22, 10, 0, 0),
        sourceKind: 'maintenance',
        sourceSummary: 'A maintenance event completed.',
        relationshipMeaning: 'The result was recorded.',
        lesson: 'Keep the evidence traceable.',
        whatChanged: 'The state was persisted.',
        whatHappened: 'A maintenance event completed.',
        tags: ['afterthought'],
        sessionId: 'session-previous',
        threadAnchor: 'thread-files',
        provenance: 'self-authored',
        confidence: 0.8,
      } as any],
    })

    expect(signal?.metadata).toEqual(expect.objectContaining({
      episodeId: 'episode-maintenance-2026-05-22',
      threadAnchor: 'thread-files',
    }))
    expect(signal?.signature).toContain('episode-maintenance-2026-05-22')
  })

  it('does not use relationship interpretation as afterglow evidence', () => {
    const runtime = createRuntime()
    const [signal] = runtime.buildAutobiographicalAfterglowContinuitySignals({
      activeSessionId: 'session-current',
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      events: [{
        id: 'episode-contaminated-afterglow',
        occurredAt: Date.UTC(2026, 4, 22, 10, 0, 0),
        sourceKind: 'maintenance',
        sourceSummary: 'A maintenance event completed.',
        relationshipMeaning: 'A structured relationship note is not event evidence.',
        lesson: 'Keep the evidence traceable.',
        whatChanged: 'The state was persisted.',
        whatHappened: 'A maintenance event completed.',
        tags: ['afterthought'],
        sessionId: 'session-previous',
        threadAnchor: 'thread-maintenance',
        provenance: 'self-authored',
        confidence: 0.8,
      } as any],
    })

    expect(signal?.summary).toContain('A maintenance event completed.')
    expect(signal?.summary).not.toContain('A structured relationship note is not event evidence.')
    expect(signal?.metadata).not.toHaveProperty('projectStatePreDialogueAwarenessLine')
    expect(signal?.metadata).not.toHaveProperty('projectStatePreflightSummary')
    expect(signal?.metadata).not.toHaveProperty('projectLatestLandedProgress')
    expect(signal?.metadata).not.toHaveProperty('projectIdentity')
    expect(signal?.metadata).not.toHaveProperty('projectPrimaryOpenLoop')
    expect(signal?.metadata).not.toHaveProperty('projectNextClosureTarget')
  })

  it('does not use sourceSummary when an afterglow has no factual event text', () => {
    const runtime = createRuntime()
    const [signal] = runtime.buildAutobiographicalAfterglowContinuitySignals({
      activeSessionId: 'session-current',
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      events: [{
        id: 'episode-afterglow-without-event-fact',
        occurredAt: Date.UTC(2026, 4, 22, 10, 0, 0),
        sourceKind: 'maintenance',
        sourceSummary: 'An interpretation about how the next response should behave.',
        relationshipMeaning: null,
        lesson: null,
        whatChanged: null,
        whatHappened: '',
        tags: ['afterthought'],
        sessionId: 'session-previous',
        threadAnchor: 'thread-maintenance',
        provenance: 'self-authored',
        confidence: 0.8,
      } as any],
    })

    expect(signal?.summary).toBeNull()
  })

  it.each([
    'This source summary mentions a session mirror but has no typed afterglow source.',
    'This source summary describes a dream but has no typed afterglow source.',
  ])('does not admit an afterglow candidate from sourceSummary prose alone: %s', (sourceSummary) => {
    const runtime = createRuntime()
    const signals = runtime.buildAutobiographicalAfterglowContinuitySignals({
      activeSessionId: 'session-current',
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      events: [{
        id: 'episode-afterglow-prose-only',
        occurredAt: Date.UTC(2026, 4, 22, 10, 0, 0),
        sourceKind: 'reply',
        sourceSummary,
        relationshipMeaning: 'A normal reply was remembered.',
        lesson: 'Keep the reply grounded.',
        whatChanged: 'The reply completed.',
        whatHappened: 'A normal reply completed.',
        tags: [],
        sessionId: 'session-previous',
        threadAnchor: 'thread-prose-only',
        provenance: 'observed',
        confidence: 0.8,
      } as any],
    })

    expect(signals).toEqual([])
  })

  it('admits an afterglow candidate from typed dream source without prose cues', () => {
    const runtime = createRuntime()
    const [signal] = runtime.buildAutobiographicalAfterglowContinuitySignals({
      activeSessionId: 'session-current',
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      events: [{
        id: 'episode-afterglow-typed-dream',
        occurredAt: Date.UTC(2026, 4, 22, 10, 0, 0),
        sourceKind: 'dream',
        sourceSummary: 'A quiet image remained.',
        relationshipMeaning: 'The image carried a remembered feeling.',
        lesson: 'Keep it tentative.',
        whatChanged: 'A quiet image remained.',
        whatHappened: 'A quiet image appeared.',
        tags: [],
        sessionId: 'session-previous',
        threadAnchor: 'thread-typed-dream',
        provenance: 'observed',
        confidence: 0.8,
      } as any],
    })

    expect(signal?.label).toBe('afterglow:dream-continuity')
    expect(signal?.metadata).toEqual(expect.objectContaining({
      sourceKind: 'dream',
      afterglowTag: 'dream-continuity',
    }))
  })

  it('admits an afterglow candidate from typed dream provenance without prose cues', () => {
    const runtime = createRuntime()
    const [signal] = runtime.buildAutobiographicalAfterglowContinuitySignals({
      activeSessionId: 'session-current',
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      events: [{
        id: 'episode-afterglow-typed-provenance',
        occurredAt: Date.UTC(2026, 4, 22, 10, 0, 0),
        sourceKind: 'reply',
        sourceSummary: 'A quiet image remained.',
        relationshipMeaning: 'The image carried a remembered feeling.',
        lesson: 'Keep it tentative.',
        whatChanged: 'A quiet image remained.',
        whatHappened: 'A quiet image appeared.',
        tags: [],
        sessionId: 'session-previous',
        threadAnchor: 'thread-typed-provenance',
        provenance: 'dreamt',
        confidence: 0.8,
      } as any],
    })

    expect(signal?.metadata).toEqual(expect.objectContaining({
      provenance: 'dreamt',
      sourceKind: 'reply',
    }))
  })

  it('does not infer execution callback or carry mode from natural afterglow prose', () => {
    const runtime = createRuntime()
    const [signal] = runtime.buildAutobiographicalAfterglowContinuitySignals({
      activeSessionId: 'session-current',
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      events: [{
        id: 'episode-afterglow-natural-collision',
        occurredAt: Date.UTC(2026, 4, 22, 10, 0, 0),
        sourceKind: 'maintenance',
        sourceSummary: 'The callback felt like a soft handoff after trust warmed.',
        relationshipMeaning: 'The delivery was discussed as ordinary wording.',
        lesson: 'A careful explanation can remain ordinary prose.',
        whatChanged: 'The explanation was clarified.',
        whatHappened: 'A callback phrase appeared in a natural reflection.',
        tags: ['afterthought'],
        sessionId: 'session-previous',
        threadAnchor: 'thread-natural-collision',
        provenance: 'self-authored',
        confidence: 0.8,
      } as any],
    })

    expect(signal?.label).toBe('afterglow:afterglow')
    expect(signal?.metadata).not.toHaveProperty('continuityKind')
    expect(signal?.metadata).not.toHaveProperty('executionCallbackCarryMode')
  })

  it('does not turn delivery tags into a special afterglow mode', () => {
    const runtime = createRuntime()
    const [signal] = runtime.buildAutobiographicalAfterglowContinuitySignals({
      activeSessionId: 'session-current',
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      events: [{
        id: 'episode-afterglow-typed-carry',
        occurredAt: Date.UTC(2026, 4, 22, 10, 0, 0),
        sourceKind: 'maintenance',
        sourceSummary: 'A normal execution result returned.',
        relationshipMeaning: 'The host received the result.',
        lesson: 'Keep the result grounded.',
        whatChanged: 'The result arrived.',
        whatHappened: 'A delivery completed.',
        tags: ['afterthought', 'delivery-record'],
        sessionId: 'session-previous',
        threadAnchor: 'thread-typed-carry',
        provenance: 'self-authored',
        confidence: 0.8,
      } as any],
    })

    expect(signal?.label).toBe('afterglow:afterglow')
    expect(signal?.summary).toContain('A delivery completed.')
    expect(signal?.metadata).not.toHaveProperty('continuityKind')
    expect(signal?.metadata).not.toHaveProperty('executionCallbackCarryMode')
  })

  it('does not promote relationship-governance tags into execution callback authority', () => {
    const runtime = createRuntime()
    const [signal] = runtime.buildAutobiographicalAfterglowContinuitySignals({
      activeSessionId: 'session-current',
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      events: [{
        id: 'episode-afterglow-non-execution-tags',
        occurredAt: Date.UTC(2026, 4, 22, 10, 0, 0),
        sourceKind: 'maintenance',
        sourceSummary: 'A normal event completed.',
        relationshipMeaning: 'The result was recorded.',
        lesson: 'Keep the evidence traceable.',
        whatChanged: 'The state was persisted.',
        whatHappened: 'A normal event completed.',
        tags: ['afterthought', 'delivery-record', 'relationship-note'],
        sessionId: 'session-previous',
        threadAnchor: 'thread-normal-event',
        provenance: 'self-authored',
        confidence: 0.8,
      } as any],
    })

    expect(signal?.label).toBe('afterglow:afterglow')
    expect(signal?.metadata).not.toHaveProperty('continuityKind')
    expect(signal?.metadata).not.toHaveProperty('executionCallbackCarryMode')
  })
})
