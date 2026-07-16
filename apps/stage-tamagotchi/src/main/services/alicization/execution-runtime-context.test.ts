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

describe('execution runtime context', () => {
  it('does not synthesize project or persona briefing when the caller only supplies grounded execution facts', () => {
    const runtimeContext = buildAlicizationExecutionRuntimeContext(createInput())

    expect(runtimeContext.generatedAt).toBe(42)
    expect(runtimeContext.projectBriefing).toBeNull()
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

  it('keeps explicit execution status and enums while clearing every persona and reply-governance field', () => {
    const runtimeContext = buildAlicizationExecutionRuntimeContext(createInput({
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        landedProgressSummary: 'The requested operation has started.',
        openClosureSummary: 'The operation is waiting for a provider result.',
        nextClosureTargetSummary: 'Collect the provider result.',
        sameHerSelfLine: 'Keep one living line.',
        sameHerHoldDetail: 'same-her hold: keep this reply inward.',
        continuityArcStage: 'same-thread-continuation',
        sameHerDriftRisk: 'Do not become a generic assistant.',
        proactiveSameHerGap: 'Keep proactive continuity explicit.',
        companionHeadlineLine: 'Keep the same line visible.',
        companionBriefingLine: 'Stay gentle before answering.',
        emotionalClosureSummary: 'Do not reopen from scratch.',
        continuityRestraint: 'measured-return',
        continuityCue: 'continuity state: keep this line inward.',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
        preflightSummary: 'Before acting, remember the same project.',
        preDialogueAwarenessLine: 'Before answering, remember the same digital life.',
        preDialogueAwarenessSummary: 'Keep the same-her line visible.',
      },
    }))

    expect(runtimeContext.projectBriefing).toEqual({
      identity: null,
      currentPhase: null,
      latestLandedProgress: 'The requested operation has started.',
      primaryOpenLoop: 'The operation is waiting for a provider result.',
      nextClosureTarget: 'Collect the provider result.',
      sameHerSelfLine: null,
      sameHerHoldDetail: null,
      continuityArcStage: 'same-thread-continuation',
      sameHerDriftRisk: null,
      proactiveSameHerGap: null,
      companionBriefingLine: null,
      emotionalClosureSummary: null,
      continuityRestraint: 'measured-return',
      continuityCue: null,
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
      preflightSummary: null,
      preDialogueAwarenessLine: null,
      preDialogueAwarenessSummary: null,
    })

    const normalized = normalizeAlicizationExecutionRuntimeContext(runtimeContext)
    expect(normalized?.projectBriefing).toEqual(runtimeContext.projectBriefing)
    expect(buildAlicizationExecutionRuntimeContextBlock(normalized)).not.toMatch(/Before (?:answering|speaking|acting)|same-her|local-first digital life project/iu)
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
