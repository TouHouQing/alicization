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
  expect(containsAlicizationFixedTemplateResidue(JSON.stringify(raw))).toBe(false)
}

describe('runtime session continuity builders', () => {
  it('keeps pending proactive continuity grounded in real learning facts', () => {
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

    expect(signal.summary).toContain('learning=verify')
    expect(signal.summary).toContain('Focus: world-model.')
    expect(signal.metadata).toEqual(expect.objectContaining({
      learningAction: 'verify',
      learningFocuses: ['world-model'],
    }))
  })

  it('does not turn proactive feedback into continuity or cadence governance tokens', () => {
    const runtime = createRuntime()
    const signal = runtime.buildProactiveOutcomeContinuitySignal({
      turnId: 'turn-proactive-feedback',
      scenario: 'coding',
      outcome: 'reply-within-120s',
      createdAt: Date.UTC(2026, 4, 22, 10, 12, 0),
      learningAction: 'verify',
      learningFocuses: ['same-her-inward-carry', 'world-model'],
      projectStateEmotionalClosureCue: 'continuity_hold=measured_return',
    })

    expect(signal.summary).toContain('host replied within 120s after a proactive turn')
    expect(signal.summary).toContain('Focus: world-model.')
    expect(signal.summary).not.toMatch(/continuity=same-thread-continuation|timing=next-open-window|cadence=|resident=quiet-companionship|same-her-inward-carry/iu)
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
    expect(signal.summary).toContain('intent=follow-through')
    expect(signal.summary).toContain('defer=busy-host')
    expect(signal.summary).toContain('thread=thread-runtime')
    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-held-autonomy',
      sourceThreadId: 'thread-runtime',
      sourceThoughtThreadId: 'thought-runtime',
      sourceConcernId: 'concern-runtime',
      executionIntentKind: 'follow-through',
      executionIntentSummary: 're-open the unresolved runtime break and see what still blocks it',
      targetThreadId: 'thread-runtime',
      projectIdentity: null,
      projectStatePreDialogueAwarenessLine: null,
      projectStateSameHerSelfLine: null,
      projectStateSameHerHoldDetail: null,
      projectStateEmotionalClosureCue: null,
    }))
    expectNoFixedTemplateResidue(signal)
  })

  it('keeps deferred proactive continuity on whyNow and source thread without rebuilding canonical project state', () => {
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
      },
    })

    expect(signal.label).toBe('proactive:coding:deferred')
    expect(signal.state).toBe('pending')
    expect(signal.summary).toContain('Stay near the current runtime seam without forcing a visible reply.')
    expect(signal.summary).toContain('thread=thread-runtime')
    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      scenario: 'coding',
      sourceThreadId: 'thread-runtime',
      projectIdentity: null,
      projectPhase: null,
      projectLatestLandedProgress: null,
      projectPrimaryOpenLoop: null,
      projectNextClosureTarget: null,
      projectStatePreDialogueAwarenessLine: null,
      projectStateCompanionHeadlineLine: null,
      projectStatePreflightSummary: null,
      projectStateOpenFocusSummary: null,
      projectStateNextFocusSummary: null,
      projectStateSameHerSelfLine: null,
      projectStateSameHerHoldDetail: null,
      projectStateSameHerDriftRisk: null,
      projectStateEmotionalClosureCue: null,
    }))
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('keeps a real provider failure in deferred continuity while dropping unrelated governance fields', () => {
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
        whyNow: '用户刚回到桌面，但没有需要主动打断的事情。',
        executionIntent: {
          kind: 'report-failure',
          summary: 'Embedding provider failed with HTTP 400.',
        },
      },
    })

    expect(signal.summary).toContain('Embedding provider failed with HTTP 400.')
    expect(signal.summary).toContain('reason=provider-mind-unavailable-for-proactive-visible-utterance')
    expect(signal.metadata).toEqual(expect.objectContaining({
      executionIntentKind: 'report-failure',
      executionIntentSummary: 'Embedding provider failed with HTTP 400.',
      projectIdentity: null,
      projectStateSameHerHoldDetail: null,
    }))
    expectNoFixedTemplateResidue(signal)
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
})
