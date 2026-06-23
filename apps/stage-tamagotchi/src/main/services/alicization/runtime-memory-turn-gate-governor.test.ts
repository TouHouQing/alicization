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

    expect(result?.mustDo).toContain('Honor the turn memory gate before speaking: inward-only.')
    expect(result?.mustDo).toContain('Let memory shape caution, ordering, care, and uncertainty inwardly without narrating recall this turn.')
    expect(result?.mustNotDo).toContain('Do not visibly cite, narrate, or dramatize recalled material while the turn memory gate is inward-only or closed.')
    expect(result?.mustNotDo).toContain('Do not let low memory precision claim exact detail or settled continuity.')
    expect(result?.mustNotDo).toContain('Do not merge competing or wrong-thread memory into the current answer.')
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
              reason: 'Hold the same remembered seam before speaking wider.',
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
      'Use the Memory OS closure trace as the authority for this turn\'s same-her memory carry.',
      'Keep proactive pressure measured-return and wait for after-payoff before widening the memory line.',
      'Carry execution feedback forward: The execution callback should be carried into the next same-person reply.',
      'Keep embodied delivery coherent with memory: Keep voice, gaze, motion, and lipsync on one lower-pressure measured-return line.',
      'If memory becomes visible, reduce it to a brief gist that serves the current payoff.',
    ]))
    expect(result?.mustNotDo).toContain('Do not close, revise away, or over-certify this memory line; the Memory OS trace still marks it open or revision-required.')
  })
})
