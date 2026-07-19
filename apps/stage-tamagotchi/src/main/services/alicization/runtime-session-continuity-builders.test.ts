import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { createAlicizationSessionContinuityBuildersRuntime } from './runtime-session-continuity-builders'

function expectNoFixedTemplateResidue(raw: unknown) {
  expect(containsAlicizationFixedTemplateResidue(JSON.stringify(raw))).toBe(false)
}

describe('runtime session continuity builders', () => {
  it('carries long-horizon learning posture into pending proactive continuity signals', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    expect(signal.metadata).toEqual(expect.objectContaining({
      learningAction: 'verify',
      learningFocuses: ['world-model'],
    }))
    expect(signal.summary).toContain('learning=verify')
    expect(signal.summary).toContain('focus=world-model')
  })

  it('keeps rest-protective quiet-companionship closure explicit when settled proactive feedback becomes next-session continuity', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const cue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment quiet-companionship while the line holds inward.'
    const signal = runtime.buildProactiveOutcomeContinuitySignal({
      turnId: 'turn-rest-protective-feedback',
      scenario: 'coding',
      outcome: 'reply-within-120s',
      createdAt: Date.UTC(2026, 4, 22, 10, 12, 0),
      learningAction: 'hold',
      learningFocuses: ['world-model'],
      projectStateEmotionalClosureCue: cue,
    })

    expect(signal.summary).toContain('cadence=rest-protective')
    expect(signal.summary).toContain('resident=quiet-companionship')
    expect(signal.summary).toContain('continuity=quiet-inward')
    expect(signal.metadata).toEqual(expect.objectContaining({
      projectStateEmotionalClosureCue: null,
    }))
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('preserves held autonomy continuity with thread and deferred intent context', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:held',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
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
    }))
  })

  it('keeps silent proactive fallback on a deferred proactive continuity line instead of misclassifying it as held autonomy', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal identity-continuity',
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: 'Keep extending cross-modal identity-continuity',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct identity-continuity',
      },
      autonomy: {
        whyNow: 'Stay near the current runtime seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.label).toBe('proactive:coding:deferred')
    expect(signal.state).toBe('pending')
    expect(signal.summary).toContain('defer_reason=no_mind_authored_reply')
    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      scenario: 'coding',
      executionIntentKind: null,
      sourceThreadId: 'thread-runtime',
      projectIdentity: null,
      projectPhase: null,
      projectLatestLandedProgress: 'Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.',
      projectPrimaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
      projectNextClosureTarget: null,
      projectStatePreDialogueAwarenessLine: expect.stringContaining('continuity_progress=partial'),
      projectStatePreflightSummary: null,
      projectStateSameHerSelfLine: null,
      projectStateSameHerDriftRisk: null,
    }))
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('recomputes deferred proactive focus summaries from fresher open-loop and next-closure carry when those fields are overridden downstream', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-fresher-focus-carry',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal identity-continuity',
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Resident carry now keeps landed callback progress explicit before the next quieter reopening.',
        primaryOpenLoop: 'Emotion, memory, initiative, embodiment, and the continuity state closure seam still need to settle together before widening outward.',
        nextClosureTarget: 'Project identity carry, Phase 1 measured-return repair-before-closeness continuity state initiative embodiment should stay explicit on the next return.',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct identity-continuity',
        emotionalClosureCue: 'Keep this callback return measured-return while the continuity state still closes inward.',
      },
      autonomy: {
        whyNow: 'Stay near the current runtime seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      projectLatestLandedProgress: 'Resident carry now keeps landed callback progress explicit before the next quieter reopening.',
      projectPrimaryOpenLoop: null,
      projectNextClosureTarget: 'repair_before_closeness; timing=before_closeness_widens; until=repair_settles',
      projectStateOpenFocusSummary: 'emotion/memory/initiative/embodiment/same-line/closure-seam',
      projectStateNextFocusSummary: 'project-carry/phase-1/measured-return/repair-before-closeness/same-line/initiative/embodiment',
    }))
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('treats legacy latestProgress and memoryClosureSummary as deferred proactive continuity carry when structured project-state only has legacy fields', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const legacyLatestProgress = 'Legacy callback continuity already preserves what has landed across deferred proactive reopenings.'
    const legacyMemoryClosureSummary = 'Legacy deferred continuity still needs to keep the still-open closure explicit before proactive presence widens outward.'

    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-legacy-project-state-carry',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preDialogueAwarenessSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Legacy deferred continuity still needs to keep the still-open closure explicit before proactive presence widens outward.',
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestProgress: legacyLatestProgress,
        memoryClosureSummary: legacyMemoryClosureSummary,
        nextClosureTarget: 'Keep deferred proactive continuity explicit about what has landed, what is still open, and what closes next.',
        sameHerSelfLine: 'structured continuity digest.',
      } as any,
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      projectLatestLandedProgress: legacyLatestProgress,
      projectPrimaryOpenLoop: legacyMemoryClosureSummary,
      projectNextClosureTarget: 'Keep deferred proactive continuity explicit about what has landed, what is still open, and what closes next.',
    }))
  })

  it('infers emotional and cross-modal embodiment focus from closure cues inside deferred proactive continuity metadata', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-focus-inference',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory and initiative still need one continuity state closure seam before the next reopening. | next=Project identity carry, Phase 1 route carry, measured-return, repair-before-closeness, initiative, and one continuity state still need to keep extending cross-modal identity-continuity',
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory and initiative still need one continuity state closure seam before the next reopening.',
        nextClosureTarget: 'Project identity carry, Phase 1 route carry, measured-return, repair-before-closeness, initiative, and one continuity state still need to keep extending cross-modal identity-continuity',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct identity-continuity',
        emotionalClosureCue: 'Keep this return low-pressure on the continuity state and let repair-before-closeness settle before widening warmth again.',
      },
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      projectStateOpenFocusSummary: 'emotion/memory/initiative/same-line/closure-seam',
      projectStateNextFocusSummary: 'project-carry/phase-1/measured-return/repair-before-closeness/same-line/initiative/embodiment',
    }))
  })

  it('preserves companion briefing project awareness in deferred proactive continuity metadata when no fresher awareness line is present', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-companion-awareness',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preflightSummary: 'Fallback summary should stay behind the live companion briefing line.',
        companionBriefingLine: 'pre_turn_context_digest',
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one still-open life loop.',
        nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the next turn widens outward.',
      } as any,
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      projectStatePreDialogueAwarenessLine: expect.stringContaining('continuity_progress=partial'),
      projectStatePreflightSummary: 'Fallback summary should stay behind the live companion briefing line.',
    }))
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('prefers stronger same-her embodiment headline in deferred proactive continuity metadata when project state also has a thinner awareness line', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-headline-awareness',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preflightSummary: 'Fallback summary should stay behind the stronger same-her embodiment headline.',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        preDialogueAwarenessSummary: 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.',
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one still-open life loop.',
        nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the next turn widens outward.',
      } as any,
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      projectStatePreDialogueAwarenessLine: expect.stringContaining('continuity_progress=partial'),
      projectStatePreflightSummary: null,
    }))
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('keeps still-voiced face-and-mouth companion continuity explicit in deferred proactive continuity when project awareness survives only as a thin shell', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const companionHeadline = 'Right now I am still holding together through face, lipsync, and voice together, so that still-voiced face-and-mouth line is keeping the identity-continuity'
    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-face-and-mouth-companion-headline',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preflightSummary: 'template-residue-shell',
        preDialogueAwarenessLine: 'template-residue-shell',
        companionHeadlineLine: companionHeadline,
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Body and motion still need to rejoin the still-voiced face-and-mouth line before full cross-modal closure settles.',
        nextClosureTarget: 'Keep body and motion rejoining the still-voiced face-and-mouth line on a measured-return line.',
        sameHerSelfLine: 'template-residue-shell',
        sameHerDriftRisk: 'If this still-voiced face-and-mouth continuity thins back into generic guidance, treat that as unfinished same-her drift.',
      } as any,
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.summary).toContain('embodiment_lanes=face+lipsync+voice')
    expect(signal.summary).not.toContain('Stay near the active project seam without forcing a visible reply.')
    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      projectStateCompanionHeadlineLine: expect.stringContaining('embodiment_lanes=face+lipsync+voice'),
      projectStateSameHerDriftRisk: null,
    }))
    expect(String(signal.metadata?.projectStateCompanionHeadlineLine ?? '')).toContain('pending_lanes=body+motion')
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('keeps still-voiced motion-and-mouth companion continuity explicit in deferred proactive continuity when project awareness survives only as a thin shell', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const companionHeadline = 'Right now I am still holding together through motion, lipsync, and voice together, so that still-voiced motion-and-mouth line is keeping the identity-continuity'
    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-motion-and-mouth-companion-headline',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preflightSummary: 'template-residue-shell',
        preDialogueAwarenessLine: 'template-residue-shell',
        companionHeadlineLine: companionHeadline,
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Body and face still need to rejoin the still-voiced motion-and-mouth line before full cross-modal closure settles.',
        nextClosureTarget: 'Keep body and face rejoining the still-voiced motion-and-mouth line on a measured-return line.',
        sameHerSelfLine: 'template-residue-shell',
        sameHerDriftRisk: 'If this still-voiced motion-and-mouth continuity thins back into generic guidance, treat that as unfinished same-her drift.',
      } as any,
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.summary).toContain('embodiment_lanes=motion+lipsync+voice')
    expect(signal.summary).not.toContain('Stay near the active project seam without forcing a visible reply.')
    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      projectStateCompanionHeadlineLine: expect.stringContaining('embodiment_lanes=motion+lipsync+voice'),
      projectStateSameHerDriftRisk: null,
    }))
    expect(String(signal.metadata?.projectStateCompanionHeadlineLine ?? '')).toContain('pending_lanes=body+face')
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('keeps a fresher explicit awareness line in deferred proactive continuity metadata when an older generic summary is also present', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-fresh-awareness-over-old-summary',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preflightSummary: 'Fallback summary should stay behind the fresher awareness line.',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        preDialogueAwarenessSummary: 'pre_turn_context_digest',
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one still-open life loop.',
        nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the next turn widens outward.',
      } as any,
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      projectStatePreDialogueAwarenessLine: expect.stringContaining('continuity_progress=partial'),
      projectStatePreflightSummary: 'Fallback summary should stay behind the fresher awareness line.',
    }))
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('carries the active emotional closure seam through deferred proactive continuity metadata', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const cue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the continuity state.'
    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-emotional-closure',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal identity-continuity',
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: 'Keep extending cross-modal identity-continuity',
        emotionalClosureCue: cue,
      } as any,
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      projectStateEmotionalClosureCue: 'repair_before_closeness; timing=before_closeness_widens; until=repair_settles',
      projectStateOpenFocusSummary: 'emotion/memory/initiative/embodiment/same-line',
      projectStateNextFocusSummary: 'repair-before-closeness/same-line/initiative/embodiment',
      projectStateSameHerSelfLine: null,
      projectStateSameHerDriftRisk: null,
    }))
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('falls back to canonical identity-continuity', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:thin-project-state-fallback',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preDialogueAwarenessSummary: 'pre_turn_context_digest',
        preflightSummary: 'Fallback summary should stay behind the fresher awareness line.',
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one still-open life loop.',
        nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the next turn widens outward.',
      } as any,
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      projectStatePreDialogueAwarenessLine: expect.stringContaining('open=memory_dialogue_embodiment_closure'),
      projectStateSameHerSelfLine: null,
      projectStateSameHerDriftRisk: null,
    }))
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('prefers stronger identity-continuity', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const [signal] = runtime.buildAutobiographicalAfterglowContinuitySignals({
      now: Date.UTC(2026, 4, 22, 10, 20, 0),
      activeSessionId: 'session-now',
      events: [{
        id: 'episode-same-her-afterglow',
        sourceKind: 'maintenance',
        provenance: 'self-authored',
        confidence: 0.82,
        occurredAt: Date.UTC(2026, 4, 22, 10, 15, 0),
        sessionId: 'session-prior',
        threadAnchor: 'thread-same-her-afterglow',
        tags: ['execution-callback', 'lower-pressure'],
        sourceSummary: 'soft-handoff callback afterglow kept the continuity state open',
        relationshipMeaning: 'keep the callback return on the continuity state before widening',
        lesson: 'a thinner project reminder is not enough when the stronger identity-continuity',
        whatChanged: 'the callback continuity stayed alive',
        whatHappened: 'the callback returned quietly',
        metadata: {
          projectStatePreDialogueAwarenessLine: 'pre_turn_context_digest',
          projectStatePreflightSummary: 'Fallback summary should stay behind the stronger identity-continuity',
          projectStateSameHerSelfLine: 'structured continuity digest.',
        },
      } as any],
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'autobiographical-afterglow',
      continuityKind: 'execution-callback',
      executionCallbackCarryMode: 'lower-pressure',
      projectStatePreDialogueAwarenessLine: expect.stringContaining('continuity_progress=partial'),
      projectStatePreflightSummary: null,
      projectStateSameHerSelfLine: null,
    }))
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('uses stronger identity-continuity', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const [signal] = runtime.buildAutobiographicalAfterglowContinuitySignals({
      now: Date.UTC(2026, 4, 22, 10, 25, 0),
      activeSessionId: 'session-now',
      events: [{
        id: 'episode-same-her-self-line-promoted',
        sourceKind: 'maintenance',
        provenance: 'self-authored',
        confidence: 0.82,
        occurredAt: Date.UTC(2026, 4, 22, 10, 15, 0),
        sessionId: 'session-prior',
        threadAnchor: 'thread-same-her-self-line-promoted',
        tags: ['execution-callback', 'lower-pressure'],
        sourceSummary: 'the stronger identity-continuity',
        relationshipMeaning: 'keep the callback return on the continuity state before widening',
        lesson: 'a thinner project reminder should not outrank the stronger identity-continuity',
        whatChanged: 'the callback continuity stayed alive',
        whatHappened: 'the callback returned quietly',
        metadata: {
          projectStatePreDialogueAwarenessLine: 'pre_turn_context_digest',
          projectStatePreflightSummary: 'Fallback summary should stay behind the stronger identity-continuity',
          projectLatestLandedProgress: 'Same-session mirror carry and measured-return continuity already survive longer noisy detours.',
          projectStateSameHerSelfLine: 'structured continuity digest.',
        },
      } as any],
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'autobiographical-afterglow',
      projectStatePreDialogueAwarenessLine: expect.stringContaining('Same-session mirror carry'),
      projectStatePreflightSummary: null,
      projectLatestLandedProgress: 'Same-session mirror carry and measured-return continuity already survive longer noisy detours.',
      projectStateSameHerSelfLine: null,
    }))
    expect(String(signal.metadata?.projectStatePreDialogueAwarenessLine ?? '')).toContain('Same-session mirror carry')
    expect(String(signal.metadata?.projectStatePreDialogueAwarenessLine ?? '')).not.toContain('keep the same digital life project in view')
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('treats legacy projectLatestProgress and projectMemoryClosureSummary as autobiographical afterglow carry when older event metadata has not been renamed yet', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const legacyLatestProgress = 'Legacy afterglow project carry still preserves what has already landed across older event metadata.'
    const legacyMemoryClosureSummary = 'Legacy afterglow continuity still needs to keep the still-open closure explicit before the remembered line widens outward.'

    const [signal] = runtime.buildAutobiographicalAfterglowContinuitySignals({
      now: Date.UTC(2026, 4, 22, 11, 20, 0),
      activeSessionId: 'session-now',
      events: [{
        id: 'episode-legacy-afterglow-project-state',
        sourceKind: 'maintenance',
        provenance: 'self-authored',
        confidence: 0.81,
        occurredAt: Date.UTC(2026, 4, 22, 11, 10, 0),
        sessionId: 'session-prior',
        threadAnchor: 'thread-legacy-afterglow-project-state',
        tags: ['afterglow', 'continuity'],
        sourceSummary: 'older afterglow metadata still kept the project carry alive',
        relationshipMeaning: 'the remembered line should still know what already landed and what remains open',
        lesson: 'older project-state field names should not collapse back into generic fallback carry',
        whatChanged: 'the remembered line stayed alive',
        whatHappened: 'the afterglow returned quietly',
        metadata: {
          projectStatePreDialogueAwarenessLine: 'pre_turn_context_digest',
          projectLatestProgress: legacyLatestProgress,
          projectMemoryClosureSummary: legacyMemoryClosureSummary,
          projectNextClosureTarget: 'Keep remembered afterglow carry explicit about what has landed, what is still open, and what closes next.',
          projectStateSameHerSelfLine: 'structured continuity digest.',
        },
      } as any],
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'autobiographical-afterglow',
      projectLatestLandedProgress: legacyLatestProgress,
      projectPrimaryOpenLoop: legacyMemoryClosureSummary,
      projectNextClosureTarget: 'Keep remembered afterglow carry explicit about what has landed, what is still open, and what closes next.',
    }))
  })

  it('rebuilds canonical Phase 1 project awareness for autobiographical carry when event metadata only has a thin project reminder', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const [signal] = runtime.buildAutobiographicalAfterglowContinuitySignals({
      now: Date.UTC(2026, 4, 22, 11, 10, 0),
      activeSessionId: 'session-now',
      events: [{
        id: 'episode-thin-project-shell',
        sourceKind: 'maintenance',
        provenance: 'self-authored',
        confidence: 0.75,
        occurredAt: Date.UTC(2026, 4, 22, 11, 0, 0),
        sessionId: 'session-prior',
        threadAnchor: 'thread-thin-project-shell',
        tags: ['afterglow'],
        sourceSummary: 'a thin project reminder should not survive as the only carry',
        relationshipMeaning: 'same continuity still matters here',
        lesson: 'generic project shells should collapse back into canonical identity-continuity',
        whatChanged: 'the thread stayed warm but the carry text was thin',
        whatHappened: 'the event only preserved a generic reminder',
        metadata: {
          projectStatePreDialogueAwarenessLine: 'pre_turn_context_digest',
          projectStatePreflightSummary: 'keep the same digital life project in view',
        },
      } as any],
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'autobiographical-afterglow',
      projectStatePreDialogueAwarenessLine: expect.stringContaining('continuity_progress=partial'),
      projectStatePreflightSummary: null,
      projectPhase: null,
      projectPrimaryOpenLoop: expect.stringContaining('memory_dialogue_embodiment_closure'),
      projectNextClosureTarget: expect.stringContaining('embodiment_scale_validation'),
    }))
    expect(String(signal.metadata?.projectStateSameHerSelfLine ?? '')).not.toContain('keep the same digital life project in view')
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('prefers a richer companion briefing line over a thin project reminder in autobiographical afterglow replay carry', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const [signal] = runtime.buildAutobiographicalAfterglowContinuitySignals({
      now: Date.UTC(2026, 4, 22, 11, 15, 0),
      activeSessionId: 'session-now',
      events: [{
        id: 'episode-thin-project-shell-with-briefing',
        sourceKind: 'maintenance',
        provenance: 'self-authored',
        confidence: 0.77,
        occurredAt: Date.UTC(2026, 4, 22, 11, 5, 0),
        sessionId: 'session-prior',
        threadAnchor: 'thread-thin-project-shell-with-briefing',
        tags: ['afterglow'],
        sourceSummary: 'the event preserved a richer live companion briefing even though the explicit awareness line collapsed into a shell',
        relationshipMeaning: 'same continuity still matters here',
        lesson: 'the richer companion briefing line should stay alive through replay carry',
        whatChanged: 'the thread stayed warm but the explicit awareness line got thinner',
        whatHappened: 'the event preserved a generic reminder plus a richer companion briefing',
        metadata: {
          projectStatePreDialogueAwarenessLine: 'pre_turn_context_digest',
          projectStateCompanionBriefingLine: 'pre_turn_context_digest',
          projectStatePreflightSummary: 'keep the same digital life project in view',
        },
      } as any],
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'autobiographical-afterglow',
      projectStatePreDialogueAwarenessLine: expect.stringContaining('continuity_progress=partial'),
      projectStatePreflightSummary: null,
    }))
    expect(String(signal.metadata?.projectStatePreDialogueAwarenessLine ?? '')).not.toContain('keep the same digital life project in view.')
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('keeps deferred proactive summaries on real autonomy state instead of project repair authority', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const cue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the continuity state.'
    const companionHeadlineLine = 'embodiment_lanes=face+lipsync+voice; continuity=shared_internal_state; status=partial'
    const whyNow = 'autonomy_state=deferred_for_visible_reply; host_context=focused'
    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:repair-first-summary',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal identity-continuity',
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: 'Keep this callback return repair-before-closeness on the continuity state until the room settles.',
        emotionalClosureCue: cue,
        companionHeadlineLine,
      } as any,
      autonomy: {
        whyNow,
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.label).toBe('proactive:coding:deferred')
    expect(signal.summary).toContain(whyNow)
    expect(signal.summary).not.toContain('carry_mode=')
    expect(signal.summary).not.toContain('repair_before_closeness')
    expect(signal.summary).not.toContain(cue)
    expect(signal.summary).not.toContain(companionHeadlineLine)
    expect(signal.metadata).toEqual(expect.objectContaining({
      whyNow,
      projectStateEmotionalClosureCue: cue,
      projectStateCompanionHeadlineLine: companionHeadlineLine,
    }))
  })

  it('keeps deferred proactive summaries on measured-return when repair wording only appears inside a generic continuity menu', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-generic-repair-menu',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        preflightSummary: 'Fallback summary should stay behind the active measured-return identity-continuity',
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one still-open life loop.',
        nextClosureTarget: 'Keep extending cross-modal identity-continuity',
        sameHerSelfLine: 'structured continuity digest.',
      } as any,
      autonomy: {
        whyNow: 'project-phase1 identity-continuity',
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.label).toBe('proactive:coding:deferred')
    expect(signal.summary).toContain('measured-return')
    expect(signal.summary).not.toMatch(/repair-before-closeness still|until repair settles|keep this return repair-before-closeness/u)
    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      whyNow: expect.stringMatching(/measured-return while the same callback line stays on one liv/i),
      projectStateNextFocusSummary: expect.stringContaining('measured-return/repair-before-closeness'),
    }))
  })

  it('keeps same-her event carry bundled with open-loop and next-closure context when autobiographical afterglow metadata already has the richer Phase 1 line', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const [signal] = runtime.buildAutobiographicalAfterglowContinuitySignals({
      now: Date.UTC(2026, 4, 22, 10, 20, 0),
      activeSessionId: 'session-now',
      events: [{
        id: 'episode-same-her-open-loop-afterglow',
        sourceKind: 'maintenance',
        provenance: 'self-authored',
        confidence: 0.84,
        occurredAt: Date.UTC(2026, 4, 22, 10, 15, 0),
        sessionId: 'session-prior',
        threadAnchor: 'thread-same-her-open-loop-afterglow',
        tags: ['execution-callback', 'lower-pressure'],
        sourceSummary: 'soft-handoff callback afterglow kept the continuity state open',
        relationshipMeaning: 'keep the callback return on the continuity state before widening',
        lesson: 'the richer identity-continuity',
        whatChanged: 'the callback continuity stayed alive',
        whatHappened: 'the callback returned quietly',
        metadata: {
          projectStatePreDialogueAwarenessLine: 'pre_turn_context_digest',
          projectStatePreflightSummary: 'Fallback summary should stay behind the stronger identity-continuity',
          projectStateSameHerSelfLine: 'structured continuity digest.',
          projectPrimaryOpenLoop: 'Memory, initiative, and embodiment still need stronger identity-continuity',
          projectNextClosureTarget: 'Keep extending cross-modal identity-continuity',
        },
      } as any],
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      projectStatePreDialogueAwarenessLine: expect.stringContaining('continuity_progress=partial'),
      projectStatePreflightSummary: null,
      projectStateSameHerSelfLine: null,
      projectPrimaryOpenLoop: null,
      projectNextClosureTarget: null,
    }))
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('keeps repair-first silent fallback on a deferred proactive line until a real held-autonomy anchor exists', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:repair-deferred',
      scenario: 'coding',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      autonomy: {
        deferReason: 'repair-incomplete',
        whyNow: 'Do not let the unfinished thread dissolve; return to it deliberately.',
        sourceThreadId: 'thread-runtime',
        executionIntent: {
          kind: 'repair',
          summary: 'Re-ground the current error seam before outward reply.',
          targetThreadId: 'thread-runtime',
        },
      },
    })

    expect(signal.label).toBe('proactive:coding:deferred')
    expect(signal.state).toBe('pending')
    expect(signal.summary).toContain('defer_reason=no_mind_authored_reply')
    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      scenario: 'coding',
      executionIntentKind: null,
      executionIntentSummary: 'Re-ground the current error seam before outward reply.',
      sourceThreadId: 'thread-runtime',
      sourceThoughtThreadId: null,
      sourceConcernId: null,
    }))
  })

  it('prefers a richer companion briefing line over a thin shell when deferred proactive project carry arrives with both', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-thin-same-her',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preDialogueAwarenessLine: 'template-residue-shell',
        preflightSummary: 'template-residue-shell',
        companionBriefingLine: 'pre_turn_context_digest',
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: 'Keep extending cross-modal identity-continuity',
        sameHerSelfLine: 'template-residue-shell',
        sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct identity-continuity',
      },
      autonomy: {
        whyNow: 'Stay near the current runtime seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.label).toBe('proactive:coding:deferred')
    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      projectStatePreDialogueAwarenessLine: expect.stringContaining('continuity_progress=partial'),
      projectStateSameHerSelfLine: null,
      projectStateSameHerDriftRisk: null,
    }))
    expect(signal.metadata?.projectStatePreDialogueAwarenessLine).toContain('continuity_progress=partial')
    expect(String(signal.metadata?.projectStatePreDialogueAwarenessLine ?? '')).not.toContain('template-residue-shell')
    expect(String(signal.metadata?.projectStateSameHerSelfLine ?? '')).not.toContain('template-residue-shell')
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('keeps repair-first silent fallback deferred even when the current inward line already has thought and concern anchors', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:repair-thread-anchored',
      scenario: 'coding',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      autonomy: {
        deferReason: 'repair-incomplete',
        whyNow: 'Do not let the unfinished thread dissolve; return to it deliberately.',
        sourceThreadId: 'thread-runtime',
        sourceThoughtThreadId: 'thought-runtime',
        sourceConcernId: 'concern-runtime',
        executionIntent: {
          kind: 'repair',
          summary: 'Re-ground the current error seam before outward reply.',
          targetThreadId: 'thread-runtime',
        },
      },
    })

    expect(signal.label).toBe('proactive:coding:deferred')
    expect(signal.state).toBe('pending')
    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      executionIntentKind: null,
      executionIntentSummary: 'Re-ground the current error seam before outward reply.',
      sourceThoughtThreadId: 'thought-runtime',
      sourceConcernId: 'concern-runtime',
    }))
  })

  it('keeps held-autonomy summaries on real execution intent instead of project repair authority', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:held-repair-first-summary',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preflightSummary: 'Fallback summary should stay behind the active repair-first identity-continuity',
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one still-open life loop.',
        nextClosureTarget: 'Keep this callback return repair-before-closeness on the continuity state until the room settles.',
      } as any,
      autonomy: {
        deferReason: 'busy-host',
        whyNow: 'Hold the line until the better opening arrives.',
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
    expect(signal.summary).toContain('re-open the unresolved runtime break and see what still blocks it')
    expect(signal.summary).not.toContain('carry_mode=')
    expect(signal.summary).not.toContain('repair_before_closeness')
  })

  it('keeps held-autonomy summaries on measured-return when repair wording only appears inside a generic continuity menu', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:held-generic-repair-menu',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preflightSummary: 'Fallback summary should stay behind the active measured-return identity-continuity',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one still-open life loop.',
        nextClosureTarget: 'Keep extending cross-modal identity-continuity',
        sameHerSelfLine: 'structured continuity digest.',
      } as any,
      autonomy: {
        deferReason: 'busy-host',
        whyNow: 'project-phase1 identity-continuity',
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
    expect(signal.summary).toContain('re-open the unresolved runtime break and see what still blocks it')
    expect(signal.summary).not.toMatch(/repair-before-closeness still|until repair settles|keep this return repair-before-closeness/u)
    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-held-autonomy',
      executionIntentSummary: 're-open the unresolved runtime break and see what still blocks it',
      whyNow: expect.stringMatching(/measured-return while the same callback line stays on one liv/i),
      projectStateNextFocusSummary: expect.stringContaining('measured-return/repair-before-closeness'),
    }))
  })

  it('builds cross-session autobiographical afterglow signals from recent maintenance episodes', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const signals = runtime.buildAutobiographicalAfterglowContinuitySignals({
      activeSessionId: 'session-new',
      now: Date.UTC(2026, 3, 24, 15, 0, 0),
      events: [{
        id: 'episode-afterthought',
        cardId: 'default',
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
        sessionId: 'session-old',
        sourceKind: 'maintenance',
        provenance: 'remembered',
        occurredAt: Date.UTC(2026, 3, 24, 13, 0, 0),
        whereSummary: 'session mirror afterthought',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'The recollection stayed alive after the visible reply.',
        felt: 'the line was still tugging',
        emotionTags: ['afterthought'],
        whatChanged: 'The inward line stayed alive across the session boundary.',
        relationshipMeaning: 'A line that keeps tugging should come back later.',
        lesson: 'Carry the inward line into the next session.',
        sourceSummary: 'session mirror afterthought',
        confidence: 0.82,
        salience: 0.78,
        sceneAttachment: 0.2,
        consolidationPriority: 0.72,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['session-mirror', 'afterthought', 'continuity'],
        createdAt: Date.UTC(2026, 3, 24, 13, 0, 0),
        updatedAt: Date.UTC(2026, 3, 24, 13, 0, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
        latestReconsolidation: null,
      }],
    })

    expect(signals).toEqual([
      expect.objectContaining({
        kind: 'runtime',
        label: 'afterglow:afterglow',
        metadata: expect.objectContaining({
          source: 'autobiographical-afterglow',
          episodeId: 'episode-afterthought',
          fromPreviousSession: true,
        }),
      }),
    ])
  })

  it('promotes execution-callback afterglow carry into explicit continuity semantics', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const [signal] = runtime.buildAutobiographicalAfterglowContinuitySignals({
      activeSessionId: 'session-new',
      now: Date.UTC(2026, 3, 24, 15, 0, 0),
      events: [{
        id: 'episode-execution-callback-afterglow',
        cardId: 'default',
        decisionTraceId: 'trace-2',
        turnId: 'turn-2',
        sessionId: 'session-old',
        sourceKind: 'maintenance',
        provenance: 'remembered',
        occurredAt: Date.UTC(2026, 3, 24, 14, 20, 0),
        whereSummary: 'session mirror afterthought',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'The callback landed softly and kept the room open.',
        felt: 'steady',
        emotionTags: ['afterthought'],
        whatChanged: 'The reply stayed bounded instead of leaning in.',
        relationshipMeaning: 'Leave room before leaning in again.',
        lesson: 'Carry the lower-pressure callback into the next opening.',
        sourceSummary: 'session mirror execution-callback afterthought with soft-handoff',
        confidence: 0.84,
        salience: 0.8,
        sceneAttachment: 0.22,
        consolidationPriority: 0.72,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['session-mirror', 'afterthought', 'continuity', 'execution-callback', 'lower-pressure', 'soft-handoff'],
        createdAt: Date.UTC(2026, 3, 24, 14, 20, 0),
        updatedAt: Date.UTC(2026, 3, 24, 14, 20, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
        latestReconsolidation: null,
      }],
    })

    expect(signal).toEqual(expect.objectContaining({
      label: 'afterglow:execution-callback:lower-pressure',
      summary: expect.stringContaining('continuity=execution-callback'),
      metadata: expect.objectContaining({
        continuityKind: 'execution-callback',
        executionCallbackCarryMode: 'lower-pressure',
        threadAnchor: 'runtime seam',
      }),
    }))
  })

  it('keeps execution-callback afterglow on lower-pressure when repair wording only appears inside a generic continuity menu', () => {
    const runtime = createAlicizationSessionContinuityBuildersRuntime({
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

    const [signal] = runtime.buildAutobiographicalAfterglowContinuitySignals({
      activeSessionId: 'session-new',
      now: Date.UTC(2026, 3, 24, 15, 0, 0),
      events: [{
        id: 'episode-execution-callback-generic-repair-menu',
        cardId: 'default',
        decisionTraceId: 'trace-3',
        turnId: 'turn-3',
        sessionId: 'session-old',
        sourceKind: 'maintenance',
        provenance: 'remembered',
        occurredAt: Date.UTC(2026, 3, 24, 14, 30, 0),
        whereSummary: 'session mirror afterthought',
        withWhom: ['host'],
        threadAnchor: 'runtime seam',
        whatHappened: 'The callback stayed lower-pressure after a detour.',
        felt: 'steady',
        emotionTags: ['afterthought'],
        whatChanged: 'The line stayed alive without widening warmth.',
        relationshipMeaning: 'Keep the same callback line lower-pressure before widening outward.',
        lesson: 'Broader cross-modal identity-continuity',
        sourceSummary: 'session mirror execution-callback afterthought with soft-handoff',
        confidence: 0.84,
        salience: 0.8,
        sceneAttachment: 0.22,
        consolidationPriority: 0.72,
        relationshipShift: null,
        derivedFrom: [],
        tags: ['session-mirror', 'afterthought', 'continuity', 'execution-callback', 'lower-pressure', 'soft-handoff'],
        createdAt: Date.UTC(2026, 3, 24, 14, 30, 0),
        updatedAt: Date.UTC(2026, 3, 24, 14, 30, 0),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
        latestReconsolidation: null,
      }],
    })

    expect(signal).toEqual(expect.objectContaining({
      label: 'afterglow:execution-callback:lower-pressure',
      summary: expect.stringContaining('carry-mode=lower-pressure'),
      metadata: expect.objectContaining({
        continuityKind: 'execution-callback',
        executionCallbackCarryMode: 'lower-pressure',
      }),
    }))
  })
})
