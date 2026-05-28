import { describe, expect, it } from 'vitest'

import {
  applyMemoryDeliberationToDigitalLifeRuntimeSurface,
  applyMemoryDeliberationToGovernance,
} from './runtime-memory-deliberation-reducer'

describe('runtime-memory-deliberation-reducer', () => {
  it('propagates resolved procedural-carry continuity into governance and runtime surface output', () => {
    const context: any = {
      recollectionIntent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        confidence: 0.86,
        rationale: 'The turn is continuing the same runtime seam.',
        recollectionAgenda: {
          goalSimilarity: 0.92,
          relationshipNeed: 0.12,
          uncertaintyTolerance: 'medium',
          candidateProcedureLines: ['active-dialogue', 'runtime seam'],
        },
      },
      recollectionSpeechPlan: {
        shouldSurface: true,
        surfaceMode: 'procedural-carry',
        placement: 'inside-payoff',
        certainty: 'approximate',
        confidence: 0.82,
      },
      memoryDeliberation: {
        shouldRecall: true,
        surfacePolicy: 'answer-anchoring',
        confidence: 0.86,
        whyNow: 'The active runtime seam should keep shaping the live answer.',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: ['Stay on the same active dialogue seam before branching.'],
        unsafeDetails: [],
        selectedPeriods: [],
        selectedEras: [{
          id: 'era-runtime',
          facet: 'task-era',
          summary: 'That task era kept returning to the same active dialogue seam.',
        }],
        selectedEpisodes: [],
        selectedProcedures: [{
          label: 'active dialogue seam first',
          approach: 'Stay on the same active dialogue seam before branching.',
        }],
        selectedBundles: [{
          id: 'bundle-runtime',
          summary: 'The active dialogue seam kept holding the same runtime thread.',
          confidence: 0.85,
        }],
        selectedChains: [{
          kind: 'task-procedure',
          summary: 'The answer should continue from the same active dialogue seam.',
          currentStance: 'Stay on the same active dialogue seam.',
          answerPosture: 'Carry the same active dialogue seam before widening out.',
          confidence: 0.84,
        }],
        selectedRelationshipLines: [],
        followUpAffordance: {
          summary: 'Carry the same active dialogue seam inside the current payoff.',
          whyNow: 'The host is still in the same runtime repair lane.',
          intrusionRisk: 'low',
          payoffDependency: 'can-surface-softly',
          preferredTiming: 'same-turn-if-invited',
        },
      },
      knowledgeEvidence: null,
      memoryTuningAdvice: null,
    }

    const governance: any = {
      answerSubject: 'task',
      answerAct: 'guide',
      answerIntent: 'guide the current repair',
      openingMove: null,
      carriedThread: 'runtime seam',
      liveSurface: 'Cursor diff',
      truthState: 'grounded',
      repairState: 'none',
      relationshipPosture: 'warm',
      mindMode: 'focused',
      embodiedPresence: 'attentive',
      emotionalTension: 'steady',
      turnMode: 'guide-current-knot',
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      evidenceMode: 'continuity-carry',
      mustDo: [],
      mustNotDo: [],
      mindTurnFrame: null,
      focusAnchor: 'runtime seam',
    }

    const nextGovernance = applyMemoryDeliberationToGovernance({
      governance,
      context,
    })

    expect(nextGovernance?.mindTurnFrame?.narrative).toContain('memory-deliberation:surface:procedural-carry')
    expect(nextGovernance?.mindTurnFrame?.obligation?.openingMove).toContain('memory_opening_strategy{mode=brief-procedure-carry')
    expect(nextGovernance?.answerIntent).toContain('Carry the same active dialogue seam before widening out.')

    const surface: any = {
      dialogue: {
        currentConsciousFrame: null,
        replyDeliberation: null,
        answerPlanner: null,
        dialogueActKernel: null,
      },
      cognition: {
        mindTurnFrame: null,
      },
      memory: {},
    }

    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface,
      governance,
      context,
      now: 123456,
    })

    expect(nextSurface?.dialogue?.replyDeliberation?.memoryMode).toBe('task-thread')
    expect(nextSurface?.dialogue?.replyDeliberation?.speakingFrom).toBe('task-thread')
    expect(nextSurface?.dialogue?.replyDeliberation?.narrative).toContain('memory-deliberation:surface:procedural-carry')
    expect(nextSurface?.dialogue?.answerPlanner?.narrative).toContain('memory-deliberation:surface:procedural-carry')
    expect(nextSurface?.dialogue?.answerPlanner?.openingMove).toContain('memory_opening_strategy{mode=brief-procedure-carry')
  })
})
