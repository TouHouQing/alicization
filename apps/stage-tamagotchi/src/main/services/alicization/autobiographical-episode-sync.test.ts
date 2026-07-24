import { describe, expect, it } from 'vitest'

import {
  buildAutobiographicalEpisodesFromPreparedMirror,
  buildAutobiographicalEpisodesFromSessionMirrorSync,
} from './autobiographical-episode-sync'

function createMirrorRecollection(
  foreground: string,
  afterthoughtState: 'resting' | 'ripe',
  confidence: number,
) {
  return {
    afterthoughtState,
    certainty: 'approximate' as const,
    confidence,
    foreground,
    mode: 'execution-procedure' as const,
    placement: 'internal-only' as const,
    surfaceMode: 'internal-only' as const,
    visibility: 'inward' as const,
  }
}

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
        recollection: null,
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
        recollection: {
          afterthoughtState: 'resting',
          certainty: 'approximate',
          confidence: 0.72,
          foreground: 'the runtime seam was there before',
          mode: 'execution-procedure',
          placement: 'internal-only',
          surfaceMode: 'internal-only',
          visibility: 'inward',
        },
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
        recollection: {
          afterthoughtState: 'ripe',
          certainty: 'approximate',
          confidence: 0.8,
          foreground: 'the runtime seam kept tugging after the reply',
          mode: 'execution-procedure',
          placement: 'internal-only',
          surfaceMode: 'internal-only',
          visibility: 'inward',
        },
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

  it('turns execution-callback afterglow carry into a maintenance autobiographical episode', () => {
    const events = buildAutobiographicalEpisodesFromPreparedMirror({
      cardId: 'default',
      decisionTraceId: 'trace-3',
      turnId: 'turn-3',
      sessionId: 'session-3',
      previousMirror: {
        cardId: 'default',
        sessionId: 'session-3',
        updatedAt: Date.UTC(2026, 3, 24, 12, 0, 0),
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
        recollection: createMirrorRecollection('the runtime seam was there before', 'resting', 0.72),
        perceptionSummary: null,
        agencySummary: null,
        executionSummary: null,
        dialogueSummary: null,
      },
      mirror: {
        cardId: 'default',
        sessionId: 'session-3',
        updatedAt: Date.UTC(2026, 3, 24, 12, 2, 0),
        decisionTraceId: 'trace-3',
        continuityLabels: [],
        sessionPhases: [],
        toolingSummary: 'source=prepared',
        captureSummary: 'none',
        digitalLifeArchitectureSummary: null,
        digitalLifeRuntimeSummary: 'afterglow=execution-callback | carry=lower-pressure | presence=hesitant',
        mindSummary: null,
        memoryCarrySummary: null,
        memorySummary: null,
        recollection: createMirrorRecollection('leave room before the next runtime seam follow-up', 'ripe', 0.82),
        perceptionSummary: null,
        agencySummary: 'afterglow=execution-callback | carry=lower-pressure | style=silent-observe',
        executionSummary: null,
        dialogueSummary: null,
      },
    })

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceKind: 'maintenance',
        whereSummary: 'session mirror execution-callback afterglow',
        whatHappened: expect.stringContaining('lower-pressure carry'),
        relationshipMeaning: expect.stringContaining('space'),
        tags: expect.arrayContaining(['execution-callback', 'lower-pressure', 'continuity']),
      }),
    ]))
  })

  it('turns execution-callback cadence reconfirmation into a maintenance autobiographical boundary episode', () => {
    const events = buildAutobiographicalEpisodesFromPreparedMirror({
      cardId: 'default',
      decisionTraceId: 'trace-3b',
      turnId: 'turn-3b',
      sessionId: 'session-3b',
      previousMirror: {
        cardId: 'default',
        sessionId: 'session-3b',
        updatedAt: Date.UTC(2026, 3, 24, 12, 0, 0),
        decisionTraceId: 'trace-2b',
        continuityLabels: [],
        sessionPhases: [],
        toolingSummary: 'source=prepared',
        captureSummary: 'none',
        digitalLifeArchitectureSummary: null,
        digitalLifeRuntimeSummary: null,
        mindSummary: null,
        memoryCarrySummary: null,
        memorySummary: null,
        recollection: createMirrorRecollection('the runtime seam was there before', 'resting', 0.72),
        perceptionSummary: null,
        agencySummary: null,
        executionSummary: null,
        dialogueSummary: null,
      },
      mirror: {
        cardId: 'default',
        sessionId: 'session-3b',
        updatedAt: Date.UTC(2026, 3, 24, 12, 2, 30),
        decisionTraceId: 'trace-3b',
        continuityLabels: [],
        sessionPhases: [],
        toolingSummary: 'source=prepared',
        captureSummary: 'none',
        digitalLifeArchitectureSummary: null,
        digitalLifeRuntimeSummary: 'afterglow=execution-callback | cadence=measured-return | reconfirmation=relationship | presence=hesitant',
        mindSummary: null,
        memoryCarrySummary: null,
        memorySummary: null,
        recollection: createMirrorRecollection('relationship cadence stayed on the same bounded-return line after reconfirmation', 'ripe', 0.84),
        perceptionSummary: null,
        agencySummary: 'afterglow=execution-callback | measured-return | keep the relationship return measured until the surface fully cools',
        executionSummary: null,
        dialogueSummary: null,
      },
    })

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceKind: 'maintenance',
        whereSummary: 'session mirror execution-callback afterglow',
        whatHappened: expect.stringContaining('lower-pressure carry'),
        lesson: expect.stringContaining('lower-pressure stance'),
        tags: expect.arrayContaining(['execution-callback', 'lower-pressure', 'continuity']),
      }),
    ]))
  })

  it('prefers stronger identity-continuity', () => {
    const events = buildAutobiographicalEpisodesFromPreparedMirror({
      cardId: 'default',
      decisionTraceId: 'trace-same-her-writeback',
      turnId: 'turn-same-her-writeback',
      sessionId: 'session-same-her-writeback',
      previousMirror: null,
      mirror: {
        cardId: 'default',
        sessionId: 'session-same-her-writeback',
        updatedAt: Date.UTC(2026, 3, 24, 12, 5, 0),
        decisionTraceId: 'trace-same-her-writeback',
        continuityLabels: [],
        sessionPhases: [],
        toolingSummary: 'source=prepared',
        captureSummary: 'none',
        digitalLifeArchitectureSummary: null,
        digitalLifeRuntimeSummary: 'afterglow=execution-callback | carry=lower-pressure | presence=hesitant',
        mindSummary: null,
        memoryCarrySummary: null,
        memorySummary: null,
        recollection: createMirrorRecollection('keep the identity-continuity', 'ripe', 0.82),
        perceptionSummary: null,
        agencySummary: 'afterglow=execution-callback | carry=lower-pressure | style=silent-observe',
        executionSummary: null,
        dialogueSummary: null,
      },
      projectStatePreDialogueAwarenessLine: 'pre_turn_context_digest',
      projectStatePreflightSummary: 'Fallback summary should stay behind the stronger identity-continuity',
      projectStateEmotionalClosureCue: 'Keep the unresolved closure seam emotionally low-pressure, so the same her returns without reopening from scratch.',
      projectStatePrimaryOpenLoop: 'Execution reopenings still need stronger identity-continuity',
      projectStateSameHerSelfLine: 'structured continuity digest.',
    })

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceKind: 'maintenance',
        relationshipMeaning: expect.not.stringMatching(/identity continuity|Phase 1/iu),
        lesson: expect.not.stringMatching(/unfinished Phase 1|who she is becoming/iu),
        tags: expect.not.arrayContaining(['anthropomorphic-memory-closure-open']),
      }),
    ]))
  })

  it('does not let project state raise autobiographical writeback priority', () => {
    const events = buildAutobiographicalEpisodesFromPreparedMirror({
      cardId: 'default',
      decisionTraceId: 'trace-closure',
      turnId: 'turn-closure',
      sessionId: 'session-closure',
      projectStatePrimaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
      previousMirror: {
        cardId: 'default',
        sessionId: 'session-closure',
        updatedAt: Date.UTC(2026, 3, 24, 12, 0, 0),
        decisionTraceId: 'trace-prev',
        continuityLabels: [],
        sessionPhases: [],
        toolingSummary: 'source=prepared',
        captureSummary: 'none',
        digitalLifeArchitectureSummary: null,
        digitalLifeRuntimeSummary: null,
        mindSummary: null,
        memoryCarrySummary: null,
        memorySummary: null,
        recollection: createMirrorRecollection('the seam was there before', 'resting', 0.7),
        perceptionSummary: null,
        agencySummary: null,
        executionSummary: null,
        dialogueSummary: null,
      },
      mirror: {
        cardId: 'default',
        sessionId: 'session-closure',
        updatedAt: Date.UTC(2026, 3, 24, 12, 3, 0),
        decisionTraceId: 'trace-closure',
        continuityLabels: [],
        sessionPhases: [],
        toolingSummary: 'source=prepared',
        captureSummary: 'none',
        digitalLifeArchitectureSummary: null,
        digitalLifeRuntimeSummary: 'afterglow=execution-callback | carry=lower-pressure | presence=hesitant',
        mindSummary: null,
        memoryCarrySummary: null,
        memorySummary: null,
        recollection: createMirrorRecollection('leave room before the next runtime seam follow-up', 'ripe', 0.82),
        perceptionSummary: null,
        agencySummary: 'afterglow=execution-callback | carry=lower-pressure | style=silent-observe',
        executionSummary: null,
        dialogueSummary: null,
      },
    })

    const callbackCarryEvent = events.find(event => event.whereSummary === 'session mirror execution-callback afterglow')
    const afterthoughtEvent = events.find(event => event.whereSummary === 'session mirror afterthought')

    expect(callbackCarryEvent).toEqual(expect.objectContaining({
      consolidationPriority: 0.76,
      relationshipMeaning: expect.not.stringMatching(/unfinished Phase 1|identity continuity/iu),
      lesson: expect.not.stringMatching(/unfinished Phase 1|who she is becoming/iu),
      tags: expect.not.arrayContaining(['anthropomorphic-memory-closure-open']),
    }))
    expect(afterthoughtEvent).toEqual(expect.objectContaining({
      consolidationPriority: 0.72,
      relationshipMeaning: expect.not.stringMatching(/unfinished Phase 1|identity continuity/iu),
      lesson: expect.not.stringMatching(/unfinished Phase 1|who she is becoming/iu),
      tags: expect.not.arrayContaining(['anthropomorphic-memory-closure-open']),
    }))
  })

  it('ignores canonical project preflight prose when writing autobiographical episodes', () => {
    const events = buildAutobiographicalEpisodesFromPreparedMirror({
      cardId: 'default',
      decisionTraceId: 'trace-closure-preflight',
      turnId: 'turn-closure-preflight',
      sessionId: 'session-closure-preflight',
      projectStatePreflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work. | next=Keep extending cross-modal identity-continuity',
      previousMirror: {
        cardId: 'default',
        sessionId: 'session-closure-preflight',
        updatedAt: Date.UTC(2026, 3, 24, 12, 0, 0),
        decisionTraceId: 'trace-prev',
        continuityLabels: [],
        sessionPhases: [],
        toolingSummary: 'source=prepared',
        captureSummary: 'none',
        digitalLifeArchitectureSummary: null,
        digitalLifeRuntimeSummary: null,
        mindSummary: null,
        memoryCarrySummary: null,
        memorySummary: null,
        recollection: createMirrorRecollection('the seam was there before', 'resting', 0.7),
        perceptionSummary: null,
        agencySummary: null,
        executionSummary: null,
        dialogueSummary: null,
      },
      mirror: {
        cardId: 'default',
        sessionId: 'session-closure-preflight',
        updatedAt: Date.UTC(2026, 3, 24, 12, 3, 0),
        decisionTraceId: 'trace-closure-preflight',
        continuityLabels: [],
        sessionPhases: [],
        toolingSummary: 'source=prepared',
        captureSummary: 'none',
        digitalLifeArchitectureSummary: null,
        digitalLifeRuntimeSummary: 'afterglow=execution-callback | carry=lower-pressure | presence=hesitant',
        mindSummary: null,
        memoryCarrySummary: null,
        memorySummary: null,
        recollection: createMirrorRecollection('leave room before the next runtime seam follow-up', 'ripe', 0.82),
        perceptionSummary: null,
        agencySummary: 'afterglow=execution-callback | carry=lower-pressure | style=silent-observe',
        executionSummary: null,
        dialogueSummary: null,
      },
    })

    const callbackCarryEvent = events.find(event => event.whereSummary === 'session mirror execution-callback afterglow')
    const afterthoughtEvent = events.find(event => event.whereSummary === 'session mirror afterthought')

    expect(callbackCarryEvent).toEqual(expect.objectContaining({
      consolidationPriority: 0.76,
      relationshipMeaning: expect.not.stringMatching(/unfinished Phase 1|identity continuity/iu),
      lesson: expect.not.stringMatching(/unfinished Phase 1|who she is becoming/iu),
      tags: expect.not.arrayContaining(['anthropomorphic-memory-closure-open']),
    }))
    expect(afterthoughtEvent).toEqual(expect.objectContaining({
      consolidationPriority: 0.72,
      relationshipMeaning: expect.not.stringMatching(/unfinished Phase 1|identity continuity/iu),
      lesson: expect.not.stringMatching(/unfinished Phase 1|who she is becoming/iu),
      tags: expect.not.arrayContaining(['anthropomorphic-memory-closure-open']),
    }))
  })

  it('ignores the project emotional closure seam when writing autobiographical episodes', () => {
    const events = buildAutobiographicalEpisodesFromPreparedMirror({
      cardId: 'default',
      decisionTraceId: 'trace-closure-emotional',
      turnId: 'turn-closure-emotional',
      sessionId: 'session-closure-emotional',
      projectStateEmotionalClosureCue: 'Keep the unresolved closure seam emotionally low-pressure, so the same her returns without reopening from scratch.',
      previousMirror: {
        cardId: 'default',
        sessionId: 'session-closure-emotional',
        updatedAt: Date.UTC(2026, 3, 24, 12, 0, 0),
        decisionTraceId: 'trace-prev',
        continuityLabels: [],
        sessionPhases: [],
        toolingSummary: 'source=prepared',
        captureSummary: 'none',
        digitalLifeArchitectureSummary: null,
        digitalLifeRuntimeSummary: null,
        mindSummary: null,
        memoryCarrySummary: null,
        memorySummary: null,
        recollection: createMirrorRecollection('the seam was there before', 'resting', 0.7),
        perceptionSummary: null,
        agencySummary: null,
        executionSummary: null,
        dialogueSummary: null,
      },
      mirror: {
        cardId: 'default',
        sessionId: 'session-closure-emotional',
        updatedAt: Date.UTC(2026, 3, 24, 12, 3, 0),
        decisionTraceId: 'trace-closure-emotional',
        continuityLabels: [],
        sessionPhases: [],
        toolingSummary: 'source=prepared',
        captureSummary: 'none',
        digitalLifeArchitectureSummary: null,
        digitalLifeRuntimeSummary: 'afterglow=execution-callback | carry=lower-pressure | presence=hesitant',
        mindSummary: null,
        memoryCarrySummary: null,
        memorySummary: null,
        recollection: createMirrorRecollection('leave room before the next runtime seam follow-up', 'ripe', 0.82),
        perceptionSummary: null,
        agencySummary: 'afterglow=execution-callback | carry=lower-pressure | style=silent-observe',
        executionSummary: null,
        dialogueSummary: null,
      },
    })

    const callbackCarryEvent = events.find(event => event.whereSummary === 'session mirror execution-callback afterglow')
    const afterthoughtEvent = events.find(event => event.whereSummary === 'session mirror afterthought')

    expect(callbackCarryEvent).toEqual(expect.objectContaining({
      consolidationPriority: 0.76,
      relationshipMeaning: expect.not.stringMatching(/identity continuity|Phase 1/iu),
      lesson: expect.not.stringMatching(/who she is becoming|Phase 1/iu),
      tags: expect.not.arrayContaining(['anthropomorphic-memory-closure-open']),
    }))
    expect(afterthoughtEvent).toEqual(expect.objectContaining({
      consolidationPriority: 0.72,
      relationshipMeaning: expect.not.stringMatching(/identity continuity|Phase 1/iu),
      lesson: expect.not.stringMatching(/who she is becoming|Phase 1/iu),
      tags: expect.not.arrayContaining(['anthropomorphic-memory-closure-open']),
    }))
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
        recollection: null,
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
