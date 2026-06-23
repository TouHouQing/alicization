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

describe('runtime session continuity builders alias focus carry', () => {
  it('derives deferred continuity focus summaries from alias-only open and next project-state carry', () => {
    const runtime = createRuntime()

    const signal = runtime.buildDeferredAutonomyContinuitySignal({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:alias-focus-carry',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preDialogueAwarenessSummary: 'Before answering, keep this same digital life project on one living line.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Alias-only landed progress already keeps callback continuity on one same-her line.',
        openClosureSummary: 'Emotion, memory, initiative, and embodiment still need one stronger same living line closure seam.',
        nextClosureTargetSummary: 'Keep project identity carry, Phase 1 route carry, measured-return initiative, and resident presence on one same living line.',
        emotionalClosureCue: 'Keep this return low-pressure on the same living line.',
      } as any,
      autonomy: {
        whyNow: 'Stay near the same unresolved project seam without widening into a generic reminder.',
        sourceThreadId: 'thread-runtime',
      },
    })

    expect(signal.metadata).toEqual(expect.objectContaining({
      source: 'proactive-deferred',
      projectPrimaryOpenLoop: 'Emotion, memory, initiative, and embodiment still need one stronger same living line closure seam.',
      projectNextClosureTarget: 'Keep project identity carry, Phase 1 route carry, measured-return initiative, and resident presence on one same living line.',
      projectStateOpenFocusSummary: 'emotion/memory/initiative/embodiment/same-line/closure-seam',
      projectStateNextFocusSummary: 'project-carry/phase-1/measured-return/same-line/initiative/embodiment',
    }))
  })
})
