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
      projectStateEmotionalClosureCue: expect.stringMatching(/lower_pressure|rest_protective|rest-protective|quiet-companionship/),
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
        preDialogueAwarenessLine: 'Before answering, remember this is still the same digital life project and the unfinished closure seam still belongs to one living her.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
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
      projectIdentity: 'local_desktop_life_loop',
      projectPhase: 'local_desktop_life_loop',
      projectLatestLandedProgress: 'Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.',
      projectPrimaryOpenLoop: expect.stringContaining('Memory still needs stronger end-to-end closure across turns, initiative, and embodiment'),
      projectNextClosureTarget: 'cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
      projectStatePreDialogueAwarenessLine: expect.stringContaining('visibility=internal-structured'),
      projectStatePreflightSummary: expect.stringContaining('visibility=internal-structured'),
      projectStateSameHerSelfLine: expect.stringContaining('local_desktop_life_loop'),
      projectStateSameHerDriftRisk: 'generic_guidance_without_first_person_continuity',
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
        preDialogueAwarenessLine: 'Before answering, remember this is still the same digital life project and the unfinished closure seam still belongs to one living her.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Resident carry now keeps landed callback progress explicit before the next quieter reopening.',
        primaryOpenLoop: 'Emotion, memory, initiative, embodiment, and the same living line closure seam still need to settle together before widening outward.',
        nextClosureTarget: 'Project identity carry, Phase 1 measured-return repair-before-closeness same living line initiative embodiment should stay explicit on the next return.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
        emotionalClosureCue: 'Keep this callback return measured-return while the same living line still closes inward.',
      },
      autonomy: {
        whyNow: 'Stay near the current runtime seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      projectLatestLandedProgress: 'Resident carry now keeps landed callback progress explicit before the next quieter reopening.',
      projectPrimaryOpenLoop: 'open_loop=callback_continuity; status=unfinished',
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
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestProgress: legacyLatestProgress,
        memoryClosureSummary: legacyMemoryClosureSummary,
        nextClosureTarget: 'Keep deferred proactive continuity explicit about what has landed, what is still open, and what closes next.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
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
        preDialogueAwarenessLine: 'Before answering, remember this still belongs to one living her inside the same digital life project.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory and initiative still need one same living line closure seam before the next reopening. | next=Project identity carry, Phase 1 route carry, measured-return, repair-before-closeness, initiative, and one same living line still need to keep extending cross-modal same-her proof across visible reply, voice, face, motion, lipsync, and resident presence through longer real-desktop runs.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory and initiative still need one same living line closure seam before the next reopening.',
        nextClosureTarget: 'Project identity carry, Phase 1 route carry, measured-return, repair-before-closeness, initiative, and one same living line still need to keep extending cross-modal same-her proof across visible reply, voice, face, motion, lipsync, and resident presence through longer real-desktop runs.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
        emotionalClosureCue: 'Keep this return low-pressure on the same living line and let repair-before-closeness settle before widening warmth again.',
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
        companionBriefingLine: 'Before answering, keep the same digital life project, Phase 1 closure pressure, and still-open life loop explicit.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
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
      projectStatePreDialogueAwarenessLine: expect.stringContaining('visibility=internal-structured'),
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
        preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not flatten the current embodiment continuity risk into a thinner generic reminder.',
        preDialogueAwarenessSummary: 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
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
      projectStatePreDialogueAwarenessLine: expect.stringContaining('continuity=embodiment'),
      projectStatePreflightSummary: expect.any(String),
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

    const companionHeadline = 'Right now I am still holding together through face, lipsync, and voice together, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.'
    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-face-and-mouth-companion-headline',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preflightSummary: 'same digital life | keep the closure seam explicit',
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        companionHeadlineLine: companionHeadline,
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Body and motion still need to rejoin the still-voiced face-and-mouth line before full cross-modal closure settles.',
        nextClosureTarget: 'Keep body and motion rejoining the still-voiced face-and-mouth line on a measured-return line.',
        sameHerSelfLine: 'same digital life | keep the closure seam explicit',
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
      projectStateSameHerDriftRisk: 'generic_guidance_without_first_person_continuity',
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

    const companionHeadline = 'Right now I am still holding together through motion, lipsync, and voice together, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.'
    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-motion-and-mouth-companion-headline',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preflightSummary: 'same digital life | keep the closure seam explicit',
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        companionHeadlineLine: companionHeadline,
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Body and face still need to rejoin the still-voiced motion-and-mouth line before full cross-modal closure settles.',
        nextClosureTarget: 'Keep body and face rejoining the still-voiced motion-and-mouth line on a measured-return line.',
        sameHerSelfLine: 'same digital life | keep the closure seam explicit',
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
      projectStateSameHerDriftRisk: 'generic_guidance_without_first_person_continuity',
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
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished closure seam still belongs to one living her.',
        preDialogueAwarenessSummary: 'Before answering, keep the same digital life project in view.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
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
      projectStatePreDialogueAwarenessLine: expect.stringContaining('visibility=internal-structured'),
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

    const cue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the same living line.'
    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-emotional-closure',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished closure seam still belongs to one living her.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
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
      projectStateSameHerSelfLine: expect.any(String),
      projectStateSameHerDriftRisk: expect.any(String),
    }))
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('falls back to canonical same-her project continuity metadata when deferred proactive carry provides only thin project-state fields', () => {
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
        preDialogueAwarenessSummary: 'Before answering, keep the same digital life project in view.',
        preflightSummary: 'Fallback summary should stay behind the fresher awareness line.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
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
      projectStatePreDialogueAwarenessLine: expect.stringContaining('visibility=internal-structured'),
      projectStateSameHerSelfLine: expect.stringContaining('local_desktop_life_loop'),
      projectStateSameHerDriftRisk: expect.stringContaining('generic_guidance_without_first_person_continuity'),
    }))
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('prefers stronger same-her self line in autobiographical afterglow event carry when event awareness text is thinner', () => {
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
        sourceSummary: 'soft-handoff callback afterglow kept the same living line open',
        relationshipMeaning: 'keep the callback return on the same living line before widening',
        lesson: 'a thinner project reminder is not enough when the stronger same-her self line is available',
        whatChanged: 'the callback continuity stayed alive',
        whatHappened: 'the callback returned quietly',
        metadata: {
          projectStatePreDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not flatten the current same-her continuity into a generic project reminder.',
          projectStatePreflightSummary: 'Fallback summary should stay behind the stronger same-her self line.',
          projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed, but the unfinished closure still has to stay on the same living line.',
        },
      } as any],
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'autobiographical-afterglow',
      continuityKind: 'execution-callback',
      executionCallbackCarryMode: 'lower-pressure',
      projectStatePreDialogueAwarenessLine: expect.stringContaining('visibility=internal-structured'),
      projectStatePreflightSummary: expect.stringContaining('visibility=internal-structured'),
      projectStateSameHerSelfLine: 'phase1_local_digital_life; landed_closure=partial',
    }))
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('uses stronger same-her self line as rebuilt projectStatePreDialogueAwarenessLine when event carry only preserves a thinner reminder', () => {
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
        sourceSummary: 'the stronger same-her self line should become the rebuilt awareness lead',
        relationshipMeaning: 'keep the callback return on the same living line before widening',
        lesson: 'a thinner project reminder should not outrank the stronger same-her self line in memory carry',
        whatChanged: 'the callback continuity stayed alive',
        whatHappened: 'the callback returned quietly',
        metadata: {
          projectStatePreDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
          projectStatePreflightSummary: 'Fallback summary should stay behind the stronger same-her self line.',
          projectLatestLandedProgress: 'Same-session mirror carry and measured-return continuity already survive longer noisy detours.',
          projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed, but the unfinished closure still has to stay on the same living line.',
        },
      } as any],
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'autobiographical-afterglow',
      projectStatePreDialogueAwarenessLine: expect.stringContaining('visibility=internal-structured'),
      projectStatePreflightSummary: expect.stringContaining('visibility=internal-structured'),
      projectLatestLandedProgress: 'Same-session mirror carry and measured-return continuity already survive longer noisy detours.',
      projectStateSameHerSelfLine: 'phase1_local_digital_life; landed_closure=partial',
    }))
    expect(String(signal.metadata?.projectStatePreDialogueAwarenessLine ?? '')).toContain('local_desktop_life_loop')
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
          projectStatePreDialogueAwarenessLine: 'Before answering, remember this is still the same digital life project and the unfinished closure seam still belongs to one living her.',
          projectLatestProgress: legacyLatestProgress,
          projectMemoryClosureSummary: legacyMemoryClosureSummary,
          projectNextClosureTarget: 'Keep remembered afterglow carry explicit about what has landed, what is still open, and what closes next.',
          projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
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
        lesson: 'generic project shells should collapse back into canonical same-her project awareness',
        whatChanged: 'the thread stayed warm but the carry text was thin',
        whatHappened: 'the event only preserved a generic reminder',
        metadata: {
          projectStatePreDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
          projectStatePreflightSummary: 'keep the same digital life project in view',
        },
      } as any],
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'autobiographical-afterglow',
      projectStatePreDialogueAwarenessLine: expect.stringContaining('local_desktop_life_loop'),
      projectStatePreflightSummary: expect.stringContaining('visibility=internal-structured'),
      projectPhase: expect.stringContaining('local_desktop_life_loop'),
      projectPrimaryOpenLoop: expect.stringContaining('memory_dialogue_embodiment_closure'),
      projectNextClosureTarget: expect.stringContaining('cross_modal_continuity_proof'),
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
          projectStatePreDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
          projectStateCompanionBriefingLine: 'Before answering, keep the same digital life project, Phase 1 closure pressure, and still-open life loop explicit.',
          projectStatePreflightSummary: 'keep the same digital life project in view',
        },
      } as any],
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'autobiographical-afterglow',
      projectStatePreDialogueAwarenessLine: expect.stringContaining('local_desktop_life_loop'),
      projectStatePreflightSummary: expect.stringContaining('visibility=internal-structured'),
    }))
    expect(String(signal.metadata?.projectStatePreDialogueAwarenessLine ?? '')).not.toContain('keep the same digital life project in view.')
    expectNoFixedTemplateResidue(signal.metadata)
  })

  it('keeps repair-before-closeness explicit in deferred proactive summaries when project-state carry is the only repair-first authority', () => {
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

    const cue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the same living line.'
    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:repair-first-summary',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished closure seam still belongs to one living her.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: 'Keep this callback return repair-before-closeness on the same living line until the room settles.',
        emotionalClosureCue: cue,
      } as any,
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.label).toBe('proactive:coding:deferred')
    expect(signal.summary).toContain('repair_before_closeness')
    expect(signal.summary).not.toContain('Stay near the active project seam without forcing a visible reply.')
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
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the callback seam still belongs to one living her.',
        preflightSummary: 'Fallback summary should stay behind the active measured-return same-her line.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one still-open life loop.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, Unresolved closure carry, anthropomorphic emotional closure, and same-her inward-carry observability all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      } as any,
      autonomy: {
        whyNow: 'project-phase1 same-her closure keeps the action one step more reversible so visible initiative stays lower-pressure, measured-return while the same callback line stays on one living thread.',
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
        sourceSummary: 'soft-handoff callback afterglow kept the same living line open',
        relationshipMeaning: 'keep the callback return on the same living line before widening',
        lesson: 'the richer same-her self line should stay bundled with what is still unfinished and where the next closure step points',
        whatChanged: 'the callback continuity stayed alive',
        whatHappened: 'the callback returned quietly',
        metadata: {
          projectStatePreDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not flatten the current same-her continuity into a generic project reminder.',
          projectStatePreflightSummary: 'Fallback summary should stay behind the stronger same-her self line.',
          projectStateSameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed, but the unfinished closure still has to stay on the same living line.',
          projectPrimaryOpenLoop: 'Memory, initiative, and embodiment still need stronger same-her closure so the life loop stops flattening into project shell narration.',
          projectNextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence while initiative stays natural.',
        },
      } as any],
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      projectStatePreDialogueAwarenessLine: expect.stringContaining('local_desktop_life_loop'),
      projectStatePreflightSummary: expect.stringContaining('visibility=internal-structured'),
      projectStateSameHerSelfLine: 'phase1_local_digital_life; landed_closure=partial',
      projectPrimaryOpenLoop: 'open_loop=memory+initiative+embodiment; status=unfinished',
      projectNextClosureTarget: 'cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs',
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
          summary: 'Re-ground the current error seam before speaking.',
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
      executionIntentSummary: 'Re-ground the current error seam before speaking.',
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
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        preflightSummary: 'same digital life | keep the closure seam explicit',
        companionBriefingLine: 'Before answering, keep the same digital life project, Phase 1 closure pressure, and still-open life loop explicit.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        sameHerSelfLine: 'same digital life | keep the closure seam explicit',
        sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
      },
      autonomy: {
        whyNow: 'Stay near the current runtime seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.label).toBe('proactive:coding:deferred')
    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      projectStatePreDialogueAwarenessLine: expect.stringContaining('visibility=internal-structured'),
      projectStateSameHerSelfLine: 'local_desktop_life_loop',
      projectStateSameHerDriftRisk: expect.stringContaining('generic_guidance_without_first_person_continuity'),
    }))
    expect(String(signal.metadata?.projectStatePreDialogueAwarenessLine ?? '')).toContain('visibility=internal-structured')
    expect(String(signal.metadata?.projectStatePreDialogueAwarenessLine ?? '')).not.toContain('same digital life | keep the closure seam explicit')
    expect(String(signal.metadata?.projectStateSameHerSelfLine ?? '')).not.toContain('same digital life | keep the closure seam explicit')
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
          summary: 'Re-ground the current error seam before speaking.',
          targetThreadId: 'thread-runtime',
        },
      },
    })

    expect(signal.label).toBe('proactive:coding:deferred')
    expect(signal.state).toBe('pending')
    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      executionIntentKind: null,
      executionIntentSummary: 'Re-ground the current error seam before speaking.',
      sourceThoughtThreadId: 'thought-runtime',
      sourceConcernId: 'concern-runtime',
    }))
  })

  it('keeps held-autonomy summaries on repair-before-closeness when project-state carry is the only surviving repair-first authority', () => {
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
        preflightSummary: 'Fallback summary should stay behind the active repair-first same-her line.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one still-open life loop.',
        nextClosureTarget: 'Keep this callback return repair-before-closeness on the same living line until the room settles.',
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
    expect(signal.summary).toContain('repair_before_closeness')
    expect(signal.summary).not.toContain('Hold the line until the better opening arrives.')
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
        preflightSummary: 'Fallback summary should stay behind the active measured-return same-her line.',
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the callback seam still belongs to one living her.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one still-open life loop.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, Unresolved closure carry, anthropomorphic emotional closure, and same-her inward-carry observability all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      } as any,
      autonomy: {
        deferReason: 'busy-host',
        whyNow: 'project-phase1 same-her closure keeps the action one step more reversible so visible initiative stays lower-pressure, measured-return while the same callback line stays on one living thread.',
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
        lesson: 'Broader cross-modal same-her proof still has to stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.',
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
