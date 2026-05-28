import { describe, expect, it } from 'vitest'

import {
  buildStageEmbodimentDiagnosticsAlertReasonSummary,
  resolveStageEmbodimentDiagnosticsAlertBanner,
  resolveStageEmbodimentDiagnosticsAlertToneClasses,
} from './stage-embodiment-diagnostics-alerts'

describe('stage embodiment diagnostics alerts', () => {
  it('returns null banner state when there are no alerts', () => {
    expect(resolveStageEmbodimentDiagnosticsAlertBanner([])).toBeNull()
  })

  it('prioritizes warn alerts and reports remaining alert count', () => {
    expect(resolveStageEmbodimentDiagnosticsAlertBanner([
      {
        severity: 'info',
        code: 'renderer-live2d-pending',
        message: 'Live2D resident prediction has not been applied yet.',
      },
      {
        severity: 'warn',
        code: 'renderer-live2d-drift',
        message: 'Live2D actual expression diverged from resident predicted expression.',
      },
      {
        severity: 'info',
        code: 'renderer-vrm-pending',
        message: 'VRM resident prediction has not been applied yet.',
      },
    ])).toEqual({
      tone: 'warn',
      title: 'Expression drift detected',
      primary: {
        severity: 'warn',
        code: 'renderer-live2d-drift',
        message: 'Live2D actual expression diverged from resident predicted expression.',
      },
      additionalCount: 2,
    })
  })

  it('keeps informational pending alerts visible without escalating them', () => {
    expect(resolveStageEmbodimentDiagnosticsAlertBanner([
      {
        severity: 'info',
        code: 'renderer-live2d-pending',
        message: 'Live2D resident prediction has not been applied yet.',
      },
    ])).toEqual({
      tone: 'info',
      title: 'Renderer synchronization pending',
      primary: {
        severity: 'info',
        code: 'renderer-live2d-pending',
        message: 'Live2D resident prediction has not been applied yet.',
      },
      additionalCount: 0,
    })
  })

  it('maps tones to high-emphasis overlay classes', () => {
    expect(resolveStageEmbodimentDiagnosticsAlertToneClasses('warn')).toEqual([
      'border-amber-300/40',
      'bg-amber-500/14',
      'text-amber-100',
    ])
    expect(resolveStageEmbodimentDiagnosticsAlertToneClasses('info')).toEqual([
      'border-sky-300/30',
      'bg-sky-500/10',
      'text-sky-100',
    ])
  })

  it('builds a drift reason summary from predicted, actual, and driver authority', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-live2d-drift',
      severity: 'warn',
      message: 'Live2D actual expression diverged from resident predicted expression.',
    }, {
      live2d: {
        predicted: 'Soft Gaze',
        actual: 'Focus Inspect',
        reason: 'preferred',
        status: 'drifted',
        driftKind: 'alias-resolution-drift',
        driverCue: 'focused',
        driverSource: 'prosody-authority',
      },
      vrm: null,
    })).toBe('resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority')
  })

  it('builds a pending reason summary from resident prediction only', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-vrm-pending',
      severity: 'info',
      message: 'VRM resident prediction has not been applied yet.',
    }, {
      live2d: null,
      vrm: {
        predicted: 'calm',
        actual: null,
        reason: 'preferred',
        status: 'predicted-only',
        driftKind: 'resident-not-yet-applied',
        driverCue: null,
        driverSource: null,
      },
    })).toBe('resident calm is waiting for renderer application')
  })

  it('builds a runtime-only reason summary from actual expression and authority source', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-live2d-runtime-only',
      severity: 'warn',
      message: 'Live2D is showing a runtime expression without a resident predicted expression.',
    }, {
      live2d: {
        predicted: null,
        actual: 'Focus Inspect',
        reason: 'preferred',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        driverCue: 'focused',
        driverSource: 'prosody-authority',
      },
      vrm: null,
    })).toBe('runtime surfaced Focus Inspect before resident prediction | cue focused@prosody-authority')
  })
})
