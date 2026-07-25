import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
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

function expectNoFixedTemplateResidue(raw: unknown) {
  if (typeof raw === 'string') {
    expect(containsAlicizationFixedTemplateResidue(raw)).toBe(false)
    return
  }
  if (Array.isArray(raw)) {
    raw.forEach(expectNoFixedTemplateResidue)
    return
  }
  if (raw && typeof raw === 'object')
    Object.values(raw).forEach(expectNoFixedTemplateResidue)
}

describe('runtime session continuity builders', () => {
  it('detects fixed-template residue in nested string leaves', () => {
    expect(() => expectNoFixedTemplateResidue({
      nested: {
        carry: 'continuity_hold=measured_return',
      },
    })).toThrow()
  })

  it('does not reject natural prose containing a short legacy phrase', () => {
    expect(() => expectNoFixedTemplateResidue({
      note: 'Please keep same-her-inward-carry wording in this natural note.',
    })).not.toThrow()
  })

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
      learningFocuses: ['world-model'],
      projectStateOpenFocusSummary: null,
      projectStateNextFocusSummary: null,
      projectStateEmotionalClosureCue: null,
    })
  })

  it('keeps proactive outcome facts in metadata and removes only the exact legacy learning focus', () => {
    const runtime = createRuntime()
    const signal = runtime.buildProactiveOutcomeContinuitySignal({
      turnId: 'turn-proactive-feedback',
      scenario: 'coding',
      outcome: 'reply-within-120s',
      createdAt: Date.UTC(2026, 4, 22, 10, 12, 0),
      learningAction: 'verify',
      learningFocuses: [
        'same-her-inward-carry',
        'world-model',
        'Please keep same-her-inward-carry wording in this natural note.',
      ],
      projectStateEmotionalClosureCue: 'continuity_hold=measured_return',
    })

    expect(signal.summary).toBeNull()
    expect(signal.metadata).toEqual({
      source: 'proactive-feedback',
      turnId: 'turn-proactive-feedback',
      scenario: 'coding',
      outcome: 'reply-within-120s',
      learningAction: 'verify',
      learningFocuses: [
        'world-model',
        'Please keep same-her-inward-carry wording in this natural note.',
      ],
      projectStateOpenFocusSummary: null,
      projectStateNextFocusSummary: null,
      projectStateEmotionalClosureCue: null,
    })
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
      projectStateEmotionalClosureCue: 'continuity_hold=measured_return',
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      learningFocuses: ['world-model'],
      projectStateEmotionalClosureCue: null,
    }))
    expectNoFixedTemplateResidue(signal)
  })

  it('preserves held autonomy thread and execution intent without project governance carry', () => {
    const runtime = createRuntime()
    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:held',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        identity: 'identity=runtime_personhood',
        sameHerSelfLine: 'same-her project closure',
        sameHerHoldDetail: 'relationship_cadence=remembered_boundary',
        emotionalClosureCue: 'continuity_hold=measured_return',
      },
      autonomy: {
        deferReason: 'busy-host',
        whyNow: 'She wants to quietly return to the unresolved runtime thread.',
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
    expect(signal.summary).toBe('re-open the unresolved runtime break and see what still blocks it')
    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-held-autonomy',
      summaryOwner: 'execution-intent',
      sourceThreadId: 'thread-runtime',
      sourceThoughtThreadId: 'thought-runtime',
      sourceConcernId: 'concern-runtime',
      executionIntentKind: 'follow-through',
      executionIntentSummary: 're-open the unresolved runtime break and see what still blocks it',
      targetThreadId: 'thread-runtime',
    }))
    expectNoFixedTemplateResidue(signal)
  })

  it('prefers whyNow over a repair intent summary for deferred proactive continuity', () => {
    const runtime = createRuntime()
    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life',
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        latestLandedProgress: 'Project identity carry already survives across runtime preparation.',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure.',
        nextClosureTarget: 'Keep extending cross-modal identity-continuity.',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerDriftRisk: 'generic project continuity guidance',
      },
      autonomy: {
        whyNow: 'Stay near the current runtime seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
        executionIntent: {
          kind: 'repair',
          summary: 'Recheck the local runtime state before speaking.',
        },
      },
    })

    expect(signal.label).toBe('proactive:coding:deferred')
    expect(signal.state).toBe('pending')
    expect(signal.summary).toBe('Stay near the current runtime seam without forcing a visible reply.')
    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      summaryOwner: 'why-now',
      whyNow: 'Stay near the current runtime seam without forcing a visible reply.',
      scenario: 'coding',
      sourceThreadId: 'thread-runtime',
      executionIntentKind: 'repair',
    }))
    expectNoFixedTemplateResidue(signal)
  })

  it('prefers a provider failure reported by whyNow for deferred continuity', () => {
    const runtime = createRuntime()
    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:provider-failure',
      scenario: 'general',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      projectState: {
        identity: 'identity=runtime_personhood',
        sameHerHoldDetail: 'continuity_hold=measured_return',
      },
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
    expectNoFixedTemplateResidue(signal)
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

    expect(signal?.summary).toContain('thread=thread-files')
    expect(signal?.metadata).toEqual(expect.objectContaining({
      projectStatePreDialogueAwarenessLine: null,
      projectStatePreflightSummary: null,
      projectLatestLandedProgress: null,
      projectIdentity: null,
      projectPrimaryOpenLoop: null,
      projectNextClosureTarget: null,
    }))
    expectNoFixedTemplateResidue(signal)
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
        relationshipMeaning: 'Repair-before-closeness was discussed as ordinary wording.',
        lesson: 'A lower-pressure explanation can still be natural prose.',
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
    expect(signal?.metadata).toEqual(expect.objectContaining({
      continuityKind: 'afterglow',
      executionCallbackCarryMode: null,
    }))
  })

  it('uses exact typed afterglow tags as execution callback carry authority', () => {
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
        whatHappened: 'A callback completed.',
        tags: ['afterthought', 'execution-callback', 'repair-before-closeness'],
        sessionId: 'session-previous',
        threadAnchor: 'thread-typed-carry',
        provenance: 'self-authored',
        confidence: 0.8,
      } as any],
    })

    expect(signal?.label).toBe('afterglow:execution-callback:repair-before-closeness')
    expect(signal?.metadata).toEqual(expect.objectContaining({
      continuityKind: 'execution-callback',
      executionCallbackCarryMode: 'repair-before-closeness',
    }))
  })
})
