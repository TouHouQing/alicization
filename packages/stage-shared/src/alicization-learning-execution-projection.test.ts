import type { AlicizationLearningExecutionStateSnapshot } from './alicization-transport-contracts'

import { describe, expect, it } from 'vitest'

import { deriveAlicizationLearningExecutionProjection } from './alicization-learning-execution-projection'

describe('alicization-learning-execution-projection', () => {
  it('preserves persisted learning execution state as the source of truth', () => {
    const persisted: AlicizationLearningExecutionStateSnapshot = {
      currentTaskId: 'task-1',
      currentStatus: 'running',
      currentAttemptCount: 1,
      currentMaxAttempts: 3,
      currentNextRetryAt: null,
      currentBlockedReason: null,
      currentFailureKind: null,
      nextLearningAction: 'verify',
      shouldRecord: false,
      shouldReflect: false,
      shouldVerify: true,
      shouldRevise: false,
      shouldInternalize: false,
      activeLearningFocuses: ['runtime seam'],
      queuedTaskCount: 0,
      runningTaskCount: 1,
      blockedTaskCount: 0,
      recentTaskIds: ['task-1'],
      lastCompletedTaskId: null,
      lastCompletedAction: null,
      lastCompletedSummary: null,
      lastFailureTaskId: null,
      lastFailureKind: null,
      lastFailureReason: null,
      lastFailureNextRetryAt: null,
      updatedAt: 100,
    }

    expect(deriveAlicizationLearningExecutionProjection({
      persistedState: persisted,
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 200,
        evolutionMomentum: 0.7,
        learningReadiness: 0.8,
        contradictionPressure: 0,
        revisionPressure: 0,
        autobiographicalStability: 0.6,
        dominantTrajectory: null,
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'record',
        nextLearningReason: null,
        shouldRecord: true,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['ignored'],
        sourceSignals: [],
        summary: '',
      },
      projectionMode: 'browser-local-scheduled',
    })).toBe(persisted)
  })

  it('derives advisory-only learning state from self evolution without inventing a queued task', () => {
    const state = deriveAlicizationLearningExecutionProjection({
      projectionMode: 'advisory-only',
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 300,
        evolutionMomentum: 0.7,
        learningReadiness: 0.8,
        contradictionPressure: 0,
        revisionPressure: 0.2,
        autobiographicalStability: 0.6,
        dominantTrajectory: null,
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'reflect',
        nextLearningReason: 'Repair line needs consolidation.',
        shouldRecord: false,
        shouldReflect: true,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['relationship repair', 'relationship repair'],
        sourceSignals: [],
        summary: '',
      },
    })

    expect(state).toEqual(expect.objectContaining({
      currentStatus: null,
      nextLearningAction: 'reflect',
      shouldReflect: true,
      queuedTaskCount: 0,
      activeLearningFocuses: ['relationship repair'],
    }))
  })

  it('derives browser-local scheduled state when fallback has no persistent task runtime', () => {
    const state = deriveAlicizationLearningExecutionProjection({
      projectionMode: 'browser-local-scheduled',
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 400,
        evolutionMomentum: 0.7,
        learningReadiness: 0.8,
        contradictionPressure: 0,
        revisionPressure: 0.2,
        autobiographicalStability: 0.6,
        dominantTrajectory: null,
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'internalize',
        nextLearningReason: 'Stable procedure can become local skill memory.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: true,
        activeLearningFocuses: ['procedure'],
        sourceSignals: [],
        summary: '',
      },
    })

    expect(state).toEqual(expect.objectContaining({
      currentStatus: 'scheduled',
      nextLearningAction: 'internalize',
      shouldInternalize: true,
      queuedTaskCount: 1,
      updatedAt: 400,
    }))
  })

  it('turns pending same-her initiative execution repair pressure into advisory verification focus without claiming closure', () => {
    const state = deriveAlicizationLearningExecutionProjection({
      projectionMode: 'advisory-only',
      sameHerCausalityRepairPressure: {
        version: 'same-her-causality-repair-pressure-v1',
        source: 'memory-tuning-advice',
        status: 'pending-runtime-evidence',
        updatedAt: 500,
        sourceReportAt: 490,
        focusDimensions: ['runtimeSameHerInitiativeExecutionCausality'],
        lanes: [{
          lane: 'initiative-execution',
          reasonTags: ['runtimeSameHerInitiativeExecutionCausality'],
          summary: 'Proactive opening, execution callback, and learning feedback still need one recalled same-her line.',
        }],
        memoryIdentityRequirement: {
          status: 'required',
          proofBoundary: 'downstream-memory-closure-causality',
          requiredPath: 'memoryClosureCausality.memoryIdentity',
          excludedProofs: ['route-chain-text', 'visible-reply-wording'],
          continuity: 'stable-memory-identity-key',
          summary: 'Real closure still needs downstream memoryClosureCausality.memoryIdentity, not route-chain text or visible reply wording.',
        },
        notes: ['Pending pressure only; real closure still needs noisy desktop evidence.'],
        summary: 'pending same-her causality repair: initiative-execution',
      },
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 500,
        evolutionMomentum: 0.7,
        learningReadiness: 0.8,
        contradictionPressure: 0,
        revisionPressure: 0,
        autobiographicalStability: 0.6,
        dominantTrajectory: null,
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'hold',
        nextLearningReason: null,
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['existing focus'],
        sourceSignals: [],
        summary: '',
      },
    })

    expect(state).toEqual(expect.objectContaining({
      currentStatus: null,
      nextLearningAction: 'verify',
      shouldReflect: true,
      shouldVerify: true,
      shouldRevise: false,
      shouldInternalize: false,
      activeLearningFocuses: expect.arrayContaining([
        'same-her initiative/execution causality pending',
        'verify proactive opening, execution callback, and learning feedback follow the recalled same-her line',
        'verify downstream memoryClosureCausality.memoryIdentity before counting memory closure',
        'reject route-chain text and visible reply wording as memory closure proof',
        'existing focus',
      ]),
    }))
    expect(state?.memoryClosureCausality).toBeUndefined()
  })
})
