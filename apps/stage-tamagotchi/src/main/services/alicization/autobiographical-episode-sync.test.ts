import { describe, expect, it } from 'vitest'

import {
  buildAutobiographicalEpisodesFromPreparedMirror,
  buildAutobiographicalEpisodesFromSessionMirrorSync,
} from './autobiographical-episode-sync'

function mirror(input: Record<string, unknown> = {}) {
  return {
    cardId: 'default',
    sessionId: 'session-1',
    updatedAt: Date.UTC(2026, 3, 24, 12, 0, 0),
    decisionTraceId: 'trace-1',
    continuityLabels: [],
    sessionPhases: [],
    toolingSummary: null,
    captureSummary: null,
    digitalLifeArchitectureSummary: null,
    digitalLifeRuntimeSummary: null,
    mindSummary: null,
    memoryCarrySummary: null,
    memorySummary: null,
    recollection: null,
    perceptionSummary: null,
    agencySummary: null,
    executionSummary: null,
    dialogueSummary: null,
    ...input,
  } as any
}

describe('autobiographical episode sync', () => {
  it.each(['blocked', 'failed', 'cancelled', 'dead-lettered'] as const)(
    'does not persist %s task-thread diagnostics as autobiographical memory',
    (status) => {
      const events = buildAutobiographicalEpisodesFromSessionMirrorSync({
        cardId: 'default',
        source: 'task-dispatch',
        sessionId: 'session-failure',
        turnId: 'turn-failure',
        mirror: mirror(),
        taskThread: {
          id: `thread-${status}`,
          decisionTraceId: 'trace-failure',
          turnId: 'turn-failure',
          sessionId: 'session-failure',
          origin: 'user-turn',
          goal: 'run the requested local task',
          kind: 'unknown',
          status,
          selectedChannel: 'codex',
          proposedChannel: 'codex',
          summary: `diagnostic-${status}-must-stay-in-audit`,
          metadata: null,
          createdAt: 10,
          updatedAt: 20,
          lastEventAt: 20,
          completedAt: null,
        },
      })

      expect(events).toEqual([])
    },
  )

  it('persists task-thread status and result evidence without generated feeling or lesson text', () => {
    const [event] = buildAutobiographicalEpisodesFromSessionMirrorSync({
      cardId: 'default',
      source: 'task-dispatch',
      sessionId: 'session-1',
      turnId: 'turn-1',
      mirror: mirror(),
      taskThread: {
        id: 'thread-runtime',
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        goal: 'repair runtime state',
        kind: 'unknown',
        status: 'completed',
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        summary: 'patched the runtime state and verified the result',
        metadata: null,
        createdAt: Date.UTC(2026, 3, 24, 11, 40, 0),
        updatedAt: Date.UTC(2026, 3, 24, 12, 0, 0),
        lastEventAt: Date.UTC(2026, 3, 24, 12, 0, 0),
        completedAt: Date.UTC(2026, 3, 24, 12, 0, 0),
      },
    })

    expect(event).toEqual(expect.objectContaining({
      sourceKind: 'execution-result',
      whereSummary: 'channel=codex',
      threadAnchor: 'repair runtime state',
      whatHappened: 'patched the runtime state and verified the result',
      felt: null,
      whatChanged: 'status=completed',
      relationshipMeaning: null,
      lesson: null,
      sourceSummary: 'source=task-dispatch | status=completed | channel=codex',
      derivedFrom: expect.arrayContaining([
        expect.objectContaining({ kind: 'task-thread', id: 'thread-runtime' }),
      ]),
    }))
  })

  it('persists a ripe recollection as evidence without reply or relationship instructions', () => {
    const events = buildAutobiographicalEpisodesFromPreparedMirror({
      cardId: 'default',
      decisionTraceId: 'trace-2',
      turnId: 'turn-2',
      sessionId: 'session-2',
      previousMirror: mirror({
        sessionId: 'session-2',
        recollection: {
          afterthoughtState: 'resting',
          certainty: 'approximate',
          confidence: 0.72,
          foreground: 'runtime verification was incomplete',
          mode: 'execution-procedure',
          placement: 'internal-only',
          surfaceMode: 'internal-only',
          visibility: 'inward',
        },
      }),
      mirror: mirror({
        sessionId: 'session-2',
        updatedAt: Date.UTC(2026, 3, 24, 12, 1, 0),
        decisionTraceId: 'trace-2',
        recollection: {
          afterthoughtState: 'ripe',
          certainty: 'approximate',
          confidence: 0.8,
          foreground: 'runtime verification completed with corrected evidence',
          mode: 'execution-procedure',
          placement: 'internal-only',
          surfaceMode: 'internal-only',
          visibility: 'inward',
        },
      }),
    })

    expect(events).toEqual([
      expect.objectContaining({
        sourceKind: 'maintenance',
        whereSummary: 'session-mirror:afterthought',
        threadAnchor: 'runtime verification completed with corrected evidence',
        whatHappened: 'runtime verification completed with corrected evidence',
        felt: null,
        whatChanged: null,
        relationshipMeaning: null,
        lesson: null,
        sourceSummary: 'source=prepared-session-mirror | kind=afterthought',
        tags: ['session-mirror', 'afterthought', 'recollection'],
      }),
    ])
  })

  it('does not duplicate an unchanged ripe recollection', () => {
    const recollection = {
      afterthoughtState: 'ripe' as const,
      certainty: 'approximate' as const,
      confidence: 0.8,
      foreground: 'runtime verification completed with corrected evidence',
      mode: 'execution-procedure' as const,
      placement: 'internal-only' as const,
      surfaceMode: 'internal-only' as const,
      visibility: 'inward' as const,
    }

    const events = buildAutobiographicalEpisodesFromPreparedMirror({
      cardId: 'default',
      decisionTraceId: 'trace-2',
      turnId: 'turn-2',
      sessionId: 'session-2',
      previousMirror: mirror({ sessionId: 'session-2', recollection }),
      mirror: mirror({ sessionId: 'session-2', recollection }),
    })

    expect(events).toEqual([])
  })

  it('persists dream summary evidence without generated identity or relationship narrative', () => {
    const events = buildAutobiographicalEpisodesFromSessionMirrorSync({
      cardId: 'default',
      source: 'dream',
      sessionId: 'session-dream',
      turnId: 'turn-dream',
      mirror: mirror({
        sessionId: 'session-dream',
        updatedAt: Date.UTC(2026, 3, 24, 13, 0, 0),
        decisionTraceId: 'trace-dream',
        digitalLifeRuntimeSummary: 'dream_result=memory_conflict_resolved',
        memorySummary: 'recollection=verified-event-linked',
      }),
    })

    expect(events).toEqual([
      expect.objectContaining({
        sourceKind: 'maintenance',
        whereSummary: 'session-mirror:dream',
        threadAnchor: 'dream_result=memory_conflict_resolved',
        whatHappened: 'dream_result=memory_conflict_resolved',
        felt: null,
        whatChanged: null,
        relationshipMeaning: null,
        lesson: null,
        sourceSummary: 'source=session-mirror | kind=dream',
        tags: ['session-mirror', 'dream'],
      }),
    ])
  })
})
