import {
  buildAlicizationExecutionRuntimeContextBlock,
  normalizeAlicizationExecutionRuntimeContext,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { buildAlicizationExecutionRuntimeContext } from './execution-runtime-context'

function createSensorySnapshot() {
  return {
    running: true,
    stale: false,
    ageMs: 12,
    nextTickAt: 30,
    sample: {
      collectedAt: 10,
      time: {
        iso: '2026-04-04T00:00:00.000Z',
        local: '2026-04-04 08:00',
        timezone: 'Asia/Shanghai',
      },
      foregroundWindow: {
        appName: 'Cursor',
        processName: 'cursor',
        title: 'airi-alice',
      },
      cpu: {
        usagePercent: 12,
        windowMs: 1000,
      },
      memory: {
        freeMB: 1024,
        totalMB: 8192,
        usagePercent: 87.5,
      },
    },
    capture: {
      health: 'healthy',
      permission: 'granted',
      sessionPhase: 'active',
      sessionReason: null,
      selectedSourceId: 'window:1',
      currentSourceId: 'window:1',
      sourcePreference: 'window',
      sourceCount: 2,
      leaseStatus: 'leased',
      leaseSourceId: 'window:1',
      lastUpdatedAt: 10,
      lastError: null,
      degradedReasons: [],
    },
  } as any
}

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    agentSessionId: 'agent-session-1',
    cardId: 'default',
    turnId: 'turn-execution-context',
    decisionTraceId: 'trace-execution-context',
    sessionId: 'session-1',
    recentActions: [],
    sensorySnapshot: createSensorySnapshot(),
    getNow: () => 42,
    ...overrides,
  } as any
}

function createAffectiveResidue() {
  return {
    version: 'affective-residue-memory-v1',
    updatedAt: 41,
    residues: [],
    dominantResidueKind: 'afterglow',
    afterglowPressure: 0.58,
    repairPressure: 0.22,
    burdenPressure: 0.14,
    trustPressure: 0.64,
    restProtectivePressure: 0.18,
    relationshipCadence: {
      cadenceMode: 'ready-return',
      distancePosture: 'nearby-soft',
      companionshipDensity: 0.4,
      repairRecovery: 0.68,
      overreachRisk: 0.12,
      fatigueGuard: 0.18,
      afterglowCarry: 0.58,
      shouldDelayWarmth: false,
      shouldProtectRest: false,
      reasonTags: ['execution-feedback'],
      summary: 'Provider callback completed with grounded evidence.',
    },
    sourceSignals: ['provider callback completed'],
    summary: 'Grounded execution afterglow remains available.',
  } as const
}

describe('execution runtime context', () => {
  it('builds grounded execution facts from the caller input', () => {
    const runtimeContext = buildAlicizationExecutionRuntimeContext(createInput())

    expect(runtimeContext.generatedAt).toBe(42)
    expect(runtimeContext.sensory).toMatchObject({
      collectedAt: 10,
      running: true,
      stale: false,
      foregroundWindow: {
        appName: 'Cursor',
        processName: 'cursor',
        title: 'airi-alice',
      },
    })
  })

  it('preserves grounded runtime facts', () => {
    const runtimeContext = buildAlicizationExecutionRuntimeContext(createInput({
      affectiveResidue: createAffectiveResidue(),
      recentActions: [{
        kind: 'executor',
        status: 'completed',
        threadStatus: 'completed',
        label: 'callback:cli',
        summary: 'Provider callback completed.',
      }],
    }))

    expect(runtimeContext).toMatchObject({
      affectiveResidue: {
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.58,
        trustPressure: 0.64,
        relationshipCadence: {
          cadenceMode: 'ready-return',
          shouldDelayWarmth: false,
        },
      },
      recentActions: [{
        kind: 'executor',
        status: 'completed',
        threadStatus: 'completed',
        label: 'callback:cli',
        summary: 'Provider callback completed.',
      }],
      sensory: {
        collectedAt: 10,
        running: true,
        stale: false,
      },
    })

    const normalized = normalizeAlicizationExecutionRuntimeContext(runtimeContext)
    const block = buildAlicizationExecutionRuntimeContextBlock(normalized)
    const factBlock = JSON.parse(block) as {
      data?: Record<string, unknown>
    }
    expect(factBlock.data).not.toHaveProperty('execution')
    expect(factBlock.data).toMatchObject({
      affective: {
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.58,
        trustPressure: 0.64,
        cadenceMode: 'ready-return',
      },
      recentActions: [{
        kind: 'executor',
        status: 'completed',
        threadStatus: 'completed',
        label: 'callback:cli',
        summary: 'Provider callback completed.',
      }],
      sensory: {
        running: true,
        stale: false,
      },
    })
    expect(block).not.toMatch(/Before (?:answering|speaking|acting)|continuity|local-first digital life project/iu)
  })

  it('projects Memory OS execution closure facts without converting them into a fixed response template', () => {
    const runtimeContext = buildAlicizationExecutionRuntimeContext(createInput({
      memoryClosureTrace: {
        version: 'memory-closure-trace-v1',
        authority: 'memory-os',
        whySurface: [],
        surfacePolicy: {
          gateStatus: 'gist',
          mode: 'tone-carry',
          timing: 'next-open-window',
          speechMode: 'lower-pressure',
          placement: 'callback-return',
          certainty: 'grounded',
          reasons: [],
        },
        nextInfluence: {
          initiative: {
            restraint: 'measured-return',
            preferredTiming: 'next-open-window',
            pressure: 'lower-pressure',
            reason: 'Wait for callback evidence.',
          },
          execution: {
            carry: 'The callback result belongs to the active memory thread.',
            nextLearningAction: 'verify',
            shouldVerify: true,
            shouldReflect: true,
            activeLearningFocuses: ['callback evidence'],
          },
          embodiment: {
            cadence: 'measured-return',
            preferredVoiceMode: 'lower-pressure',
            preferredLipsyncMode: 'restrained',
            preferredGazeMode: 'soften',
            reason: 'Wait for callback evidence.',
          },
        },
        closureState: {
          state: 'open',
          open: true,
          revisionRequired: false,
          shouldLabelUncertainty: true,
          visibleCarryMode: 'gist',
          retrievalQuality: 'grounded',
          conflictPressure: 'low',
        },
        selectedCandidateIds: ['memory-candidate-execution-callback'],
        reasonTags: ['memory-os', 'execution-feedback'],
      },
    }))

    expect(runtimeContext.memoryClosureExecution).toEqual({
      authority: 'memory-os',
      carry: 'The callback result belongs to the active memory thread.',
      nextLearningAction: 'verify',
      shouldVerify: true,
      shouldReflect: true,
      activeLearningFocuses: ['callback evidence'],
      reasonTags: ['memory-os', 'execution-feedback'],
      closureState: {
        state: 'open',
        open: true,
        revisionRequired: false,
        shouldLabelUncertainty: true,
        visibleCarryMode: 'gist',
        retrievalQuality: 'grounded',
        conflictPressure: 'low',
      },
    })
  })

  it('preserves recent action status and sensory failure details for transparent execution failures', () => {
    const sensorySnapshot = createSensorySnapshot()
    sensorySnapshot.stale = true
    sensorySnapshot.capture.health = 'degraded'
    sensorySnapshot.capture.lastError = 'thumbnail stale'
    sensorySnapshot.capture.degradedReasons = ['window-thumbnail-stale']

    const runtimeContext = buildAlicizationExecutionRuntimeContext(createInput({
      recentActions: [{
        kind: 'executor',
        status: 'failed',
        threadStatus: 'blocked',
        label: 'callback:cli',
        summary: 'Provider callback failed.',
      }],
      sensorySnapshot,
    }))

    expect(runtimeContext.recentActions).toEqual([{
      kind: 'executor',
      status: 'failed',
      threadStatus: 'blocked',
      label: 'callback:cli',
      summary: 'Provider callback failed.',
    }])
    expect(runtimeContext.sensory.capture).toMatchObject({
      health: 'degraded',
      lastError: 'thumbnail stale',
      degradedReasons: ['window-thumbnail-stale'],
    })
  })
})
