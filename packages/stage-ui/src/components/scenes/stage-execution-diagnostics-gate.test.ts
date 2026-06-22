import { describe, expect, it } from 'vitest'

import {
  gateStageExecutionDiagnostics,
  gateStageRuntimeCapabilities,
} from './stage-execution-diagnostics-gate'

describe('stage execution diagnostics gate', () => {
  it('keeps diagnostics when the current renderer is mounted and visible', () => {
    const diagnostics = {
      activeMotion: {
        group: 'Idle',
        index: 0,
        segmentId: 'segment-live2d-1',
      },
    }

    expect(gateStageExecutionDiagnostics({
      componentState: 'mounted',
      currentRenderer: 'live2d',
      diagnostics,
      renderer: 'live2d',
      showStage: true,
    })).toBe(diagnostics)
  })

  it('drops diagnostics when the current renderer no longer owns the stage', () => {
    expect(gateStageExecutionDiagnostics({
      componentState: 'mounted',
      currentRenderer: 'vrm',
      diagnostics: {
        activeMotion: {
          group: 'Idle',
          index: 0,
          segmentId: 'segment-live2d-stale-1',
        },
      },
      renderer: 'live2d',
      showStage: true,
    })).toBeNull()
  })

  it('drops diagnostics while the stage is hidden', () => {
    expect(gateStageExecutionDiagnostics({
      componentState: 'mounted',
      currentRenderer: 'vrm',
      diagnostics: {
        activeMotion: {
          cue: 'observe_focus',
          segmentId: 'segment-vrm-hidden-1',
        },
      },
      renderer: 'vrm',
      showStage: false,
    })).toBeNull()
  })

  it('drops diagnostics before the renderer is mounted', () => {
    expect(gateStageExecutionDiagnostics({
      componentState: 'loading',
      currentRenderer: 'vrm',
      diagnostics: {
        activeMotion: {
          cue: 'observe_focus',
          segmentId: 'segment-vrm-loading-1',
        },
      },
      renderer: 'vrm',
      showStage: true,
    })).toBeNull()
  })

  it('drops runtime capabilities while the stage is hidden', () => {
    expect(gateStageRuntimeCapabilities({
      componentState: 'mounted',
      currentRenderer: 'live2d',
      renderer: 'live2d',
      runtimeCapabilities: {
        supportedExpressionNames: ['Soft Gaze'],
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: [],
        supportedActions: [],
      },
      showStage: false,
    })).toBeNull()
  })

  it('drops runtime capabilities before the renderer is mounted', () => {
    expect(gateStageRuntimeCapabilities({
      componentState: 'pending',
      currentRenderer: 'vrm',
      renderer: 'vrm',
      runtimeCapabilities: {
        supportedExpressionNames: ['relaxed'],
        supportedBaseEmotions: ['thinking'],
        supportedFacialCues: [],
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportsVisemeLipSync: true,
      },
      showStage: true,
    })).toBeNull()
  })
})
