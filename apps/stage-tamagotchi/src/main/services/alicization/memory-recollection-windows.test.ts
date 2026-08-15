import { describe, expect, it } from 'vitest'

import { buildMemoryRecollectionWindows } from './memory-recollection-windows'

describe('memory recollection windows', () => {
  it('clusters recalled episodes into period-style windows without transcript input', () => {
    const windows = buildMemoryRecollectionWindows({
      intent: {
        mode: 'relationship-history',
        temporalFocus: 'cross-session',
        searchEpisodes: true,
        searchProceduralExperience: false,
        queryHints: ['runtime continuity', 'proactive feedback'],
        rationale: 'Need to recover the admitted long-term episode behind the current relationship thread.',
        confidence: 0.82,
      },
      episodes: [{
        id: 'event-1',
        cardId: 'default',
        decisionTraceId: null,
        turnId: 'turn-1',
        sessionId: 'session-1',
        sourceKind: 'reply',
        provenance: 'observed',
        occurredAt: new Date('2026-04-17T09:00:00Z').getTime(),
        whereSummary: 'runtime continuity thread',
        withWhom: ['host'],
        threadAnchor: 'runtime continuity',
        whatHappened: 'We were aligning proactive closure and runtime continuity.',
        felt: 'focused',
        emotionTags: ['focused'],
        whatChanged: 'trust up 0.04',
        relationshipMeaning: 'Task continuity strengthened the shared line.',
        lesson: 'Keep the thread coherent across sessions.',
        sourceSummary: 'reply turn',
        confidence: 0.84,
        salience: 0.82,
        sceneAttachment: 0.4,
        consolidationPriority: 0.62,
        relationshipShift: {
          closenessDelta: 0.02,
          trustDelta: 0.04,
          burdenDelta: 0,
          boundaryDelta: 0.01,
          misreadDelta: -0.01,
          repairDelta: 0.02,
          openLoopDelta: 0.04,
        },
        derivedFrom: [],
        tags: ['runtime', 'continuity'],
        createdAt: new Date('2026-04-17T09:00:00Z').getTime(),
        updatedAt: new Date('2026-04-17T09:00:00Z').getTime(),
        lastRecalledAt: null,
        recallCount: 0,
        reconsolidationCount: 0,
        latestReconsolidation: null,
      }],
    })

    expect(windows).toHaveLength(1)
    expect(windows[0]?.label).toContain('runtime continuity')
    expect(windows[0]?.summary).toContain('runtime continuity')
    expect(windows[0]?.cues.join(' ')).toContain('proactive closure')
  })
})
