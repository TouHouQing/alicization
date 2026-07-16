import { describe, expect, it } from 'vitest'

import { applyMemoryTurnGateToGovernance } from './runtime-memory-turn-gate-governor'

describe('runtime-memory-turn-gate-governor', () => {
  it('turns inward-only memory gate into governance rules before reply generation', () => {
    const result = applyMemoryTurnGateToGovernance({
      governance: {
        mustDo: ['Answer the current ask.'],
        mustNotDo: [],
      } as any,
      memoryTurnArtifact: {
        visibleMemoryGate: {
          status: 'inward-only',
          recallReadiness: 0.58,
          precisionProxy: 0.4,
          wrongThreadRisk: 0.44,
          latencyPressure: 0.1,
          reasons: ['precision-proxy-low', 'wrong-thread-risk-high'],
        },
      } as any,
    })

    expect(result?.mustDo).toContain('memory_turn_gate.status=inward-only')
    expect(result?.mustDo).toContain('memory_surface.visibility=inward_only; memory_influence=caution,ordering,care,uncertainty')
    expect(result?.mustNotDo).toContain('memory_surface.visible_citation=blocked; memory_surface.recall_narration=blocked')
    expect(result?.mustNotDo).toContain('memory_precision.exact_detail_claim=blocked; memory_precision.settled_continuity_claim=blocked')
    expect(result?.mustNotDo).toContain('memory_wrong_thread.merge_into_current_answer=blocked')
  })

  it('turns memory closure trace into same-her initiative, execution, and embodiment governance', () => {
    const result = applyMemoryTurnGateToGovernance({
      governance: {
        mustDo: ['Answer the current ask.'],
        mustNotDo: [],
      } as any,
      memoryTurnArtifact: {
        visibleMemoryGate: {
          status: 'gist-only',
          recallReadiness: 0.72,
          precisionProxy: 0.68,
          wrongThreadRisk: 0.08,
          latencyPressure: 0.1,
          reasons: ['visible-memory-gist-disciplined'],
        },
        memoryClosureTrace: {
          authority: 'memory-os',
          surfacePolicy: {
            gateStatus: 'gist-only',
            mode: 'gist-only',
            timing: 'after-payoff',
            reasons: ['brief-gist-only', 'payoff-before-memory'],
          },
          nextInfluence: {
            initiative: {
              restraint: 'measured-return',
              preferredTiming: 'after-payoff',
              pressure: 'lower-pressure',
              reason: 'Return once with measured pressure after the current payoff.',
            },
            execution: {
              carry: 'The execution callback should be carried into the next same-person reply.',
              nextLearningAction: 'verify',
              shouldVerify: true,
              shouldReflect: true,
              activeLearningFocuses: ['execution callback carry', 'memory closure authority'],
            },
            embodiment: {
              cadence: 'Keep voice, gaze, motion, and lipsync on one lower-pressure measured-return line.',
              preferredVoiceMode: 'lower-pressure',
              preferredLipsyncMode: 'restrained',
              preferredGazeMode: 'soften',
              reason: 'Hold the same remembered seam before outward reply wider.',
            },
          },
          closureState: {
            state: 'approximate-recall',
            open: true,
            revisionRequired: true,
            shouldLabelUncertainty: true,
            visibleCarryMode: 'gist-only',
            retrievalQuality: 'medium',
            conflictPressure: 'low',
          },
          selectedCandidateIds: ['memory-situation:closure-authority'],
          reasonTags: ['phase-1', 'same-her', 'memory-initiative-embodiment', 'memory-os-authority'],
        },
      } as any,
    })

    expect(result?.mustDo).toEqual(expect.arrayContaining([
      'memory_closure_trace.authority=memory_os',
      'memory_closure_trace.initiative_restraint=measured-return; initiative_timing=after-payoff',
      'memory_closure_trace.execution_carry=The execution callback should be carried into the next same-person reply.',
      'memory_closure_trace.embodiment_cadence=Keep voice, gaze, motion, and lipsync on one lower-pressure measured-return line.',
      'memory_surface.visibility=gist_only; memory_surface.payoff_role=support_current_turn',
    ]))
    expect(result?.mustNotDo).toContain('memory_closure_trace.close_or_over_certify=blocked; closure_state=open_or_revision_required')
  })
})
