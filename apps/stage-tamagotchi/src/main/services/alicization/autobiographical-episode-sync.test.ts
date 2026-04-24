import { describe, expect, it } from 'vitest'

import {
  buildAutobiographicalEpisodesFromPreparedMirror,
  buildAutobiographicalEpisodesFromSessionMirrorSync,
} from './autobiographical-episode-sync'

describe('autobiographical episode sync', () => {
  it('turns task-thread updates into autobiographical execution episodes', () => {
    const events = buildAutobiographicalEpisodesFromSessionMirrorSync({
      cardId: 'default',
      source: 'task-dispatch',
      sessionId: 'session-1',
      turnId: 'turn-1',
      mirror: {
        cardId: 'default',
        sessionId: 'session-1',
        updatedAt: Date.UTC(2026, 3, 24, 12, 0, 0),
        decisionTraceId: 'trace-1',
        continuityLabels: [],
        sessionPhases: [],
        toolingSummary: 'source=task-dispatch',
        captureSummary: 'none',
        digitalLifeArchitectureSummary: null,
        digitalLifeRuntimeSummary: null,
        mindSummary: null,
        memoryCarrySummary: null,
        memorySummary: null,
        recollectionSummary: null,
        recollectionSurfaceSummary: null,
        recollectionConfidence: null,
        perceptionSummary: null,
        agencySummary: null,
        executionSummary: 'status=completed goal=repair runtime seam channel=codex',
        dialogueSummary: null,
      },
      taskThread: {
        id: 'thread-runtime',
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        goal: 'repair runtime seam',
        kind: 'unknown',
        status: 'completed',
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        summary: 'patched the seam and verified the result',
        metadata: null,
        createdAt: Date.UTC(2026, 3, 24, 11, 40, 0),
        updatedAt: Date.UTC(2026, 3, 24, 12, 0, 0),
        lastEventAt: Date.UTC(2026, 3, 24, 12, 0, 0),
        completedAt: Date.UTC(2026, 3, 24, 12, 0, 0),
      },
    })

    expect(events).toEqual([
      expect.objectContaining({
        sourceKind: 'execution-result',
        threadAnchor: 'repair runtime seam',
        whatHappened: expect.stringContaining('completed'),
        derivedFrom: expect.arrayContaining([
          expect.objectContaining({ kind: 'task-thread', id: 'thread-runtime' }),
        ]),
      }),
    ])
  })

  it('turns ripe recollection afterthoughts into maintenance autobiographical episodes', () => {
    const events = buildAutobiographicalEpisodesFromPreparedMirror({
      cardId: 'default',
      decisionTraceId: 'trace-2',
      turnId: 'turn-2',
      sessionId: 'session-2',
      previousMirror: {
        cardId: 'default',
        sessionId: 'session-2',
        updatedAt: Date.UTC(2026, 3, 24, 12, 0, 0),
        decisionTraceId: 'trace-1',
        continuityLabels: [],
        sessionPhases: [],
        toolingSummary: 'source=prepared',
        captureSummary: 'none',
        digitalLifeArchitectureSummary: null,
        digitalLifeRuntimeSummary: null,
        mindSummary: null,
        memoryCarrySummary: null,
        memorySummary: null,
        recollectionSummary: 'the runtime seam was there before',
        recollectionSurfaceSummary: 'surface=inward | surface_mode=internal-only',
        recollectionConfidence: 0.72,
        perceptionSummary: null,
        agencySummary: null,
        executionSummary: null,
        dialogueSummary: null,
      },
      mirror: {
        cardId: 'default',
        sessionId: 'session-2',
        updatedAt: Date.UTC(2026, 3, 24, 12, 1, 0),
        decisionTraceId: 'trace-2',
        continuityLabels: [],
        sessionPhases: [],
        toolingSummary: 'source=prepared',
        captureSummary: 'none',
        digitalLifeArchitectureSummary: null,
        digitalLifeRuntimeSummary: null,
        mindSummary: null,
        memoryCarrySummary: null,
        memorySummary: null,
        recollectionSummary: 'the runtime seam kept tugging after the reply',
        recollectionSurfaceSummary: 'surface=inward | afterthought=ripe | surface_mode=internal-only',
        recollectionConfidence: 0.8,
        perceptionSummary: null,
        agencySummary: null,
        executionSummary: null,
        dialogueSummary: null,
      },
    })

    expect(events).toEqual([
      expect.objectContaining({
        sourceKind: 'maintenance',
        provenance: 'remembered',
        whatHappened: expect.stringContaining('afterthought'),
        threadAnchor: 'the runtime seam kept tugging after the reply',
      }),
    ])
  })

  it('turns dream-driven mirror continuity into maintenance autobiographical episodes', () => {
    const events = buildAutobiographicalEpisodesFromSessionMirrorSync({
      cardId: 'default',
      source: 'dream',
      sessionId: 'session-3',
      turnId: 'turn-dream',
      mirror: {
        cardId: 'default',
        sessionId: 'session-3',
        updatedAt: Date.UTC(2026, 3, 24, 13, 0, 0),
        decisionTraceId: 'trace-dream',
        continuityLabels: ['dream'],
        sessionPhases: ['source:dream'],
        toolingSummary: 'source=dream',
        captureSummary: 'none',
        digitalLifeArchitectureSummary: null,
        digitalLifeRuntimeSummary: 'dream continuity kept the bond line quieter but more stable',
        mindSummary: null,
        memoryCarrySummary: null,
        memorySummary: 'recollection=the dream-settled line stayed active',
        recollectionSummary: null,
        recollectionSurfaceSummary: null,
        recollectionConfidence: null,
        perceptionSummary: null,
        agencySummary: null,
        executionSummary: null,
        dialogueSummary: null,
      },
    })

    expect(events).toEqual([
      expect.objectContaining({
        sourceKind: 'maintenance',
        whatHappened: expect.stringContaining('Dream continuity kept shaping'),
        tags: expect.arrayContaining(['session-mirror', 'dream', 'continuity']),
      }),
    ])
  })
})
