import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import {
  applyMemoryDeliberationToDigitalLifeRuntimeSurface,
  applyMemoryDeliberationToGovernance,
  deriveMemoryDeliberationMemoryMode,
  deriveMemoryDeliberationSurfaceMode,
} from './runtime-memory-deliberation-reducer'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

function createDeliberation() {
  return {
    shouldRecall: true,
    surfacePolicy: 'answer-anchoring',
    confidence: 0.84,
    whyNow: 'A recalled procedure is relevant to the current task.',
    inwardLine: 'The evidence remains available internally.',
    stableCore: ['The verified outcome remains supported.'],
    unsafeDetails: ['The exact sequence remains uncertain.'],
    selectedEraIds: [],
    selectedConsolidationIds: [],
    selectedWindowIds: [],
    selectedProcedureIds: ['procedure-1'],
    selectedEpisodeIds: [],
    selectedConversationTurnIds: [],
    selectedRelationshipLines: [],
    selectedEras: [],
    selectedPeriods: [],
    selectedEpisodes: [],
    selectedProcedures: [{
      id: 'procedure-1',
      label: 'verified procedure',
      approach: 'Use the verified sequence.',
    }],
    selectedBundles: [],
    selectedChains: [],
    followUpAffordance: null,
  } as any
}

describe('runtime-memory-deliberation-reducer', () => {
  it('does not rewrite turn governance from recalled prose', () => {
    const governance = {
      answerSubject: 'task-knot',
      answerIntent: 'Answer the current task.',
      openingMove: 'Start from the current task.',
      mustDo: ['existing typed control'],
      mustNotDo: [],
    } as any

    expect(applyMemoryDeliberationToGovernance({
      governance,
      context: {
        memoryDeliberation: createDeliberation(),
      } as any,
    })).toBe(governance)
  })

  it('syncs typed memory state without rewriting dialogue, cognition, or raw runtime surfaces', () => {
    const now = 50_000
    const surface = buildAlicizationDigitalLifeRuntimeSurface(
      createDefaultVisualPresenceState(now),
    )
    const dialogue = structuredClone(surface.dialogue)
    const cognition = structuredClone(surface.cognition)
    const raw = structuredClone(surface.raw)
    const deliberation = createDeliberation()
    const recollectionSpeechPlan = {
      shouldSurface: true,
      surfaceMode: 'answer-anchoring',
      placement: 'inside-payoff',
      certainty: 'approximate',
      rationale: 'The recalled evidence may surface briefly.',
      confidence: 0.8,
    } as any

    const next = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface,
      governance: {
        answerSubject: 'task-knot',
      } as any,
      context: {
        memoryDeliberation: deliberation,
        recollectionSpeechPlan,
      } as any,
      now,
    })

    expect(next?.dialogue).toEqual(dialogue)
    expect(next?.cognition).toEqual(cognition)
    expect(next?.raw).toEqual(raw)
    expect(next?.memory.memoryDeliberation).toBe(deliberation)
    expect(next?.memory.recollectionSpeechPlan).toBe(recollectionSpeechPlan)
    expect(next?.memory.derivedMindStateBundle?.memoryDeliberation).toEqual(deliberation)
  })

  it('maps typed surface policy without reading evidence text', () => {
    expect(deriveMemoryDeliberationSurfaceMode({
      shouldStayInward: true,
      surfacePolicy: 'relationship-continuity',
      answerSubject: 'relationship',
    })).toBe('held-memory')
    expect(deriveMemoryDeliberationSurfaceMode({
      shouldStayInward: false,
      surfacePolicy: 'procedural-carry',
      answerSubject: 'task-knot',
    })).toBe('task-thread')
    expect(deriveMemoryDeliberationSurfaceMode({
      shouldStayInward: false,
      surfacePolicy: 'relationship-continuity',
      answerSubject: 'relationship',
    })).toBe('dialogue-bond')
  })

  it('maps typed memory mode without generating guidance text', () => {
    expect(deriveMemoryDeliberationMemoryMode({
      existingMode: null,
      shouldStayInward: false,
      surfacePolicy: 'procedural-carry',
    })).toBe('task-thread')
    expect(deriveMemoryDeliberationMemoryMode({
      existingMode: null,
      shouldStayInward: false,
      surfacePolicy: 'relationship-continuity',
    })).toBe('dialogue-carry')
    expect(deriveMemoryDeliberationMemoryMode({
      existingMode: null,
      shouldStayInward: true,
      surfacePolicy: 'internal-only',
    })).toBe('emotional-resonance')
  })
})
