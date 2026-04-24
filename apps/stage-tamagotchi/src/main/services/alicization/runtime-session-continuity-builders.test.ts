import { describe, expect, it } from 'vitest'

import { createAlicizationSessionContinuityBuildersRuntime } from './runtime-session-continuity-builders'

describe('runtime session continuity builders', () => {
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
})
