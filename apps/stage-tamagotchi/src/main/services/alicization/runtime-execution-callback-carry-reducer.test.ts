import { describe, expect, it } from 'vitest'

import { applyExecutionCallbackCarryToDigitalLifeRuntimeSurface } from './runtime-execution-callback-carry-reducer'

describe('runtime-execution-callback-carry-reducer', () => {
  it('does not let execution callback context mutate any digital-life owner surface', () => {
    const memoryDeliberation = {
      shouldRecall: true,
      selectedEraIds: [],
      selectedConsolidationIds: ['memory-1'],
      selectedWindowIds: [],
      selectedProcedureIds: [],
      selectedEpisodeIds: [],
      selectedRelationshipLines: [],
      selectedEras: [],
      selectedPeriods: [],
      selectedEpisodes: [],
      selectedProcedures: [],
      selectedBundles: [],
      selectedChains: [],
      surfacePolicy: 'answer-directly',
      confidence: 0.82,
      whyNow: 'WorkingMemory selected this evidence.',
      inwardLine: 'Keep the selected evidence available.',
      visibleLine: null,
      followUpAffordance: null,
    }
    const surface = {
      memory: {
        memoryDeliberation,
        autobiographicalSelf: { id: 'autobiographical-owner' },
        longHorizonMemory: { id: 'long-term-owner' },
        personStateProjection: { contexts: ['resident'] },
      },
      dialogue: {
        currentConsciousFrame: {
          consciousNeed: 'Return the real execution result.',
        },
      },
      cognition: {
        runtimeDigest: null,
      },
    } as any

    const resolved = applyExecutionCallbackCarryToDigitalLifeRuntimeSurface({
      surface,
      governance: {
        focusAnchor: 'compile result',
        answerIntent: 'return the compile result',
        repairState: 'none',
        answerSubject: 'task',
        screenReferenceMode: 'avoid',
        answerAct: 'guide',
        labelCarryAsMemory: true,
        turnMode: 'callback',
      } as any,
      context: {
        executionCallbackCarry: {
          summary: 'The compile finished.',
          threadAnchor: 'compile result',
          carryMode: 'lower-pressure',
          confidence: 0.88,
        },
      } as any,
      now: 2_000,
    })

    expect(resolved).toBe(surface)
    expect(resolved?.memory.memoryDeliberation).toBe(memoryDeliberation)
  })
})
