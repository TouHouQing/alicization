import { describe, expect, it } from 'vitest'

import { applyMemoryTurnGateToGovernance } from './runtime-memory-turn-gate-governor'

describe('runtime-memory-turn-gate-governor', () => {
  it('does not turn memory gates into reply-writing rules', () => {
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

    expect(result?.mustDo).toEqual(['Answer the current ask.'])
    expect(result?.mustNotDo).toEqual([])
  })

  it('keeps memory closure trace out of reply-writing governance', () => {
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

    expect(result?.mustDo).toEqual(['Answer the current ask.'])
    expect(result?.mustNotDo).toEqual([])
  })
})
