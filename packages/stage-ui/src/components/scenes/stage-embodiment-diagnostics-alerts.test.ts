import { describe, expect, it } from 'vitest'

import {
  buildStageEmbodimentDiagnosticsAlertFocusSummary,
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
        code: 'renderer-live2d-partial-recovery',
        message: 'Live2D expression names still differ, but face and motion authority have already re-formed on the same segment.',
      },
      {
        severity: 'info',
        code: 'renderer-vrm-pending',
        message: 'VRM resident prediction has not been applied yet.',
      },
    ])).toEqual({
      tone: 'warn',
      title: 'Same-her continuity is re-forming before renderer sync',
      primary: {
        severity: 'warn',
        code: 'renderer-live2d-partial-recovery',
        message: 'Live2D expression names still differ, but face and motion authority have already re-formed on the same segment.',
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

  it('uses explicit partial-recovery banner wording for vrm same-segment recovery alerts', () => {
    expect(resolveStageEmbodimentDiagnosticsAlertBanner([
      {
        severity: 'warn',
        code: 'renderer-vrm-partial-recovery',
        message: 'VRM expression names still differ, but face and motion authority have already re-formed on the same segment.',
      },
    ])).toEqual({
      tone: 'warn',
      title: 'Same-her continuity is re-forming before renderer sync',
      primary: {
        severity: 'warn',
        code: 'renderer-vrm-partial-recovery',
        message: 'VRM expression names still differ, but face and motion authority have already re-formed on the same segment.',
      },
      additionalCount: 0,
    })
  })

  it('surfaces audible same-her continuity in the banner title when the renderer is only lagging behind an already recovered living audio line', () => {
    expect(resolveStageEmbodimentDiagnosticsAlertBanner([
      {
        severity: 'warn',
        code: 'renderer-vrm-partial-recovery',
        message: 'VRM expression names still differ, but the audible same-her line has already re-formed on the same segment.',
      },
    ])).toEqual({
      tone: 'warn',
      title: 'Audible same-her line recovered before renderer',
      primary: {
        severity: 'warn',
        code: 'renderer-vrm-partial-recovery',
        message: 'VRM expression names still differ, but the audible same-her line has already re-formed on the same segment.',
      },
      additionalCount: 0,
    })
  })

  it('surfaces the resident body line as the alert focus when same-her continuity has narrowed to a single surviving body lane', () => {
    expect(resolveStageEmbodimentDiagnosticsAlertBanner([
      {
        severity: 'warn',
        code: 'cross-modal-single-lane-dominance',
        message: 'Only the resident body lane is still aligned with the active same-her segment.',
      },
    ])).toEqual({
      tone: 'warn',
      title: 'Resident body line is carrying same-her continuity',
      primary: {
        severity: 'warn',
        code: 'cross-modal-single-lane-dominance',
        message: 'Only the resident body lane is still aligned with the active same-her segment.',
      },
      additionalCount: 0,
    })
  })

  it('surfaces the audible same-her line as the alert focus when face and motion have not yet rejoined the living body line', () => {
    expect(resolveStageEmbodimentDiagnosticsAlertBanner([
      {
        severity: 'warn',
        code: 'cross-modal-partial-lane-dominance',
        message: 'The resident body lane is still holding together with one audible same-her lane, but face and motion have not yet rejoined the same active segment.',
      },
    ])).toEqual({
      tone: 'warn',
      title: 'Audible same-her line is carrying continuity',
      primary: {
        severity: 'warn',
        code: 'cross-modal-partial-lane-dominance',
        message: 'The resident body lane is still holding together with one audible same-her lane, but face and motion have not yet rejoined the same active segment.',
      },
      additionalCount: 0,
    })
  })

  it('surfaces the resident body-and-voice line as the alert focus when lipsync is still missing from the surviving same-her carry', () => {
    expect(resolveStageEmbodimentDiagnosticsAlertBanner([
      {
        severity: 'warn',
        code: 'cross-modal-partial-lane-dominance',
        message: 'The resident body lane is still holding together with the same-her voice line, but lipsync, face, and motion have not yet rejoined the same active segment.',
      },
    ])).toEqual({
      tone: 'warn',
      title: 'Resident body and voice are carrying continuity',
      primary: {
        severity: 'warn',
        code: 'cross-modal-partial-lane-dominance',
        message: 'The resident body lane is still holding together with the same-her voice line, but lipsync, face, and motion have not yet rejoined the same active segment.',
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

  it('builds a lane-level focus summary when audible same-her continuity has rejoined before face and motion return', () => {
    expect(buildStageEmbodimentDiagnosticsAlertFocusSummary({
      code: 'renderer-vrm-partial-recovery',
      severity: 'warn',
      message: 'VRM expression names still differ, but the audible same-her line has already re-formed on the same segment.',
    }, {
      live2d: null,
      vrm: {
        predicted: 'calm',
        actual: 'focus',
        reason: 'runtime-expression',
        status: 'drifted',
        driftKind: 'alias-resolution-drift',
        faceDriverCue: null,
        faceDriverSource: null,
        motionDriverCue: null,
        motionDriverSource: null,
        faceDriverSegmentId: null,
        motionDriverSegmentId: null,
        bodyDriverSegmentId: 'segment-vrm-audible-body-focus-1',
        lipsyncDriverSegmentId: 'segment-vrm-audible-body-focus-1',
        voiceDriverSegmentId: 'segment-vrm-audible-body-focus-1',
      },
    })).toBe('body+lipsync+voice active | pending face+motion')
  })

  it('builds a lane-level focus summary when only the resident body line is still carrying the same-her segment', () => {
    expect(buildStageEmbodimentDiagnosticsAlertFocusSummary({
      code: 'cross-modal-single-lane-dominance',
      severity: 'warn',
      message: 'Only the resident body lane is still aligned with the active same-her segment.',
    }, {
      live2d: null,
      vrm: null,
    }, '表情、动作 authority 漂移，当前 resident body 还在同一段数字生命表达上。')).toBe(
      'resident-body active | pending face+motion+lipsync+voice',
    )
  })

  it('builds a lane-level focus summary when resident body and one audible same-her lane are still holding continuity together', () => {
    expect(buildStageEmbodimentDiagnosticsAlertFocusSummary({
      code: 'cross-modal-partial-lane-dominance',
      severity: 'warn',
      message: 'The resident body lane is still holding together with one audible same-her lane, but face and motion have not yet rejoined the same active segment.',
    }, {
      live2d: null,
      vrm: null,
    }, '表情、动作 authority 漂移，但 resident body、lipsync 和 voice 仍在同一段数字生命表达上。')).toBe(
      'resident-body+audible-line active | pending face+motion',
    )
  })

  it('builds a lane-level focus summary when only lipsync and voice still carry the audible same-her line', () => {
    expect(buildStageEmbodimentDiagnosticsAlertFocusSummary({
      code: 'cross-modal-single-lane-dominance',
      severity: 'warn',
      message: 'Only one embodiment lane is still aligned with the active same-her segment.',
    }, {
      live2d: null,
      vrm: null,
    }, '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是口型和语音。')).toBe(
      'lipsync+voice active | pending body+face+motion',
    )
  })

  it('builds a lane-level focus summary when face and voice are the surviving still-voiced same-her carry before body motion and lipsync return', () => {
    expect(buildStageEmbodimentDiagnosticsAlertFocusSummary({
      code: 'renderer-live2d-runtime-only',
      severity: 'warn',
      message: 'Live2D is showing a runtime expression without a resident predicted expression.',
    }, {
      live2d: {
        predicted: null,
        actual: 'Resident Hold',
        reason: 'resident-still-voiced-face-first',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        faceDriverCue: 'soft-gaze',
        faceDriverSource: 'prosody-authority',
        motionDriverCue: null,
        motionDriverSource: null,
        faceDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-1',
        motionDriverSegmentId: null,
        bodyDriverSegmentId: null,
        lipsyncDriverSegmentId: null,
        voiceDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-1',
        reasonTags: ['embodiment:still-voiced-face-line'],
      } as any,
      vrm: null,
    })).toBe('face+voice active | pending body+motion+lipsync')
  })

  it('builds a lane-level focus summary when motion and voice are the surviving still-voiced same-her carry before body face and lipsync return', () => {
    expect(buildStageEmbodimentDiagnosticsAlertFocusSummary({
      code: 'renderer-live2d-runtime-only',
      severity: 'warn',
      message: 'Live2D is showing a runtime expression without a resident predicted expression.',
    }, {
      live2d: {
        predicted: null,
        actual: 'Resident Hold',
        reason: 'resident-still-voiced-motion-first',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        faceDriverCue: null,
        faceDriverSource: null,
        motionDriverCue: 'observe_focus',
        motionDriverSource: 'timeline-projection',
        faceDriverSegmentId: null,
        motionDriverSegmentId: 'segment-live2d-runtime-still-voiced-motion-1',
        bodyDriverSegmentId: null,
        lipsyncDriverSegmentId: null,
        voiceDriverSegmentId: 'segment-live2d-runtime-still-voiced-motion-1',
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
      } as any,
      vrm: null,
    })).toBe('motion+voice active | pending body+face+lipsync')
  })

  it('builds a lane-level focus summary when face lipsync and voice are the surviving still-voiced same-her carry before body and motion return', () => {
    expect(buildStageEmbodimentDiagnosticsAlertFocusSummary({
      code: 'renderer-live2d-runtime-only',
      severity: 'warn',
      message: 'Live2D is showing a runtime expression without a resident predicted expression.',
    }, {
      live2d: {
        predicted: null,
        actual: 'Resident Hold',
        reason: 'resident-still-voiced-face-mouth-first',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        faceDriverCue: 'soft-gaze',
        faceDriverSource: 'prosody-authority',
        motionDriverCue: null,
        motionDriverSource: null,
        faceDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-mouth-1',
        motionDriverSegmentId: null,
        bodyDriverSegmentId: null,
        lipsyncDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-mouth-1',
        voiceDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-mouth-1',
        reasonTags: [
          'embodiment:still-voiced-face-lipsync-line',
          'embodiment:still-voiced-face-line',
        ],
      } as any,
      vrm: null,
    })).toBe('face+lipsync+voice active | pending body+motion')
  })

  it('builds a lane-level focus summary when motion lipsync and voice are the surviving still-voiced same-her carry before body and face return', () => {
    expect(buildStageEmbodimentDiagnosticsAlertFocusSummary({
      code: 'renderer-live2d-runtime-only',
      severity: 'warn',
      message: 'Live2D is showing a runtime expression without a resident predicted expression.',
    }, {
      live2d: {
        predicted: null,
        actual: 'Resident Hold',
        reason: 'resident-still-voiced-motion-mouth-first',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        faceDriverCue: null,
        faceDriverSource: null,
        motionDriverCue: 'observe_focus',
        motionDriverSource: 'timeline-projection',
        faceDriverSegmentId: null,
        motionDriverSegmentId: 'segment-live2d-runtime-still-voiced-motion-mouth-1',
        bodyDriverSegmentId: null,
        lipsyncDriverSegmentId: 'segment-live2d-runtime-still-voiced-motion-mouth-1',
        voiceDriverSegmentId: 'segment-live2d-runtime-still-voiced-motion-mouth-1',
        reasonTags: [
          'embodiment:still-voiced-motion-lipsync-line',
          'embodiment:still-voiced-motion-line',
        ],
      } as any,
      vrm: null,
    })).toBe('motion+lipsync+voice active | pending body+face')
  })

  it('builds a lane-level focus summary when face motion and voice are the surviving still-voiced same-her carry before body and lipsync return', () => {
    expect(buildStageEmbodimentDiagnosticsAlertFocusSummary({
      code: 'renderer-live2d-runtime-only',
      severity: 'warn',
      message: 'Live2D is showing a runtime expression without a resident predicted expression.',
    }, {
      live2d: {
        predicted: null,
        actual: 'Resident Hold',
        reason: 'resident-still-voiced-face-motion-first',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        faceDriverCue: 'soft-gaze',
        faceDriverSource: 'prosody-authority',
        motionDriverCue: 'observe_focus',
        motionDriverSource: 'timeline-projection',
        faceDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-motion-1',
        motionDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-motion-1',
        bodyDriverSegmentId: null,
        lipsyncDriverSegmentId: null,
        voiceDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-motion-1',
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line',
      } as any,
      vrm: null,
    })).toBe('face+motion+voice active | pending body+lipsync')
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
        faceDriverCue: 'focused',
        faceDriverSource: 'prosody-authority',
        motionDriverCue: null,
        motionDriverSource: null,
      },
      vrm: null,
    })).toBe('resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority')
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
        faceDriverCue: null,
        faceDriverSource: null,
        motionDriverCue: null,
        motionDriverSource: null,
      },
    })).toBe('resident calm is waiting for renderer application')
  })

  it('keeps face and motion authority visible inside pending renderer summaries when the body line is already re-forming before expression application catches up', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-live2d-pending',
      severity: 'info',
      message: 'Live2D resident prediction has not been applied yet.',
    }, {
      live2d: {
        predicted: 'Soft Gaze',
        actual: null,
        reason: 'preferred',
        status: 'predicted-only',
        driftKind: 'resident-not-yet-applied',
        faceDriverCue: 'focused',
        faceDriverSource: 'prosody-authority',
        motionDriverCue: 'observe_focus',
        motionDriverSource: 'cue-bridge',
      },
      vrm: null,
    })).toBe(
      'resident Soft Gaze is waiting for renderer application | face focused@prosody-authority | motion observe_focus@cue-bridge',
    )
  })

  it('keeps same-segment face-motion-body recovery visible inside pending renderer summaries when the living body line already re-formed before renderer application catches up', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-live2d-pending',
      severity: 'info',
      message: 'Live2D resident prediction has not been applied yet.',
    }, {
      live2d: {
        predicted: 'Soft Gaze',
        actual: null,
        reason: 'preferred',
        status: 'predicted-only',
        driftKind: 'resident-not-yet-applied',
        faceDriverCue: 'focused',
        faceDriverSource: 'cue-bridge',
        faceDriverSegmentId: 'segment-live2d-pending-body-1',
        motionDriverCue: 'observe_focus',
        motionDriverSource: 'cue-bridge',
        motionDriverSegmentId: 'segment-live2d-pending-body-1',
        bodyDriverSegmentId: 'segment-live2d-pending-body-1',
      } as any,
      vrm: null,
    })).toBe(
      'resident Soft Gaze is waiting for renderer application | face focused@cue-bridge | motion observe_focus@cue-bridge | same-segment face+motion+body recovery@segment-live2d-pending-body-1 | remaining-open=lipsync+voice',
    )
  })

  it('keeps body+voice recovery visible inside pending renderer summaries when the resident body line and audible line re-form before face and motion return', () => {
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
        faceDriverCue: null,
        faceDriverSource: null,
        motionDriverCue: null,
        motionDriverSource: null,
        faceDriverSegmentId: null,
        motionDriverSegmentId: null,
        bodyDriverSegmentId: 'segment-vrm-pending-body-voice-1',
        voiceDriverSegmentId: 'segment-vrm-pending-body-voice-1',
      },
    })).toBe(
      'resident calm is waiting for renderer application | body+voice recovery@segment-vrm-pending-body-voice-1 | pending-rejoin=face+motion+lipsync',
    )
  })

  it('keeps structured body+voice-only same-her continuity visible inside pending renderer summaries without rewriting it into a fuller audible-body rejoin', () => {
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
        faceDriverCue: null,
        faceDriverSource: null,
        motionDriverCue: null,
        motionDriverSource: null,
        faceDriverSegmentId: null,
        motionDriverSegmentId: null,
        bodyDriverSegmentId: 'segment-vrm-pending-body-voice-structured-1',
        voiceDriverSegmentId: 'segment-vrm-pending-body-voice-structured-1',
        reasonTags: ['embodiment:body+voice-only'],
        signature: 'embodiment:audible-same-her-line',
      },
    } as any)).toBe(
      'resident calm is waiting for renderer application | continuity=embodiment:audible-same-her-line+embodiment:body+voice-only | signature=embodiment:audible-same-her-line | body+voice recovery@segment-vrm-pending-body-voice-structured-1 | pending-rejoin=face+motion+lipsync',
    )
  })

  it('keeps body+lipsync+voice recovery visible inside pending renderer summaries when the audible-body line re-forms before face and motion return', () => {
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
        faceDriverCue: null,
        faceDriverSource: null,
        motionDriverCue: null,
        motionDriverSource: null,
        faceDriverSegmentId: null,
        motionDriverSegmentId: null,
        bodyDriverSegmentId: 'segment-vrm-pending-audible-body-1',
        lipsyncDriverSegmentId: 'segment-vrm-pending-audible-body-1',
        voiceDriverSegmentId: 'segment-vrm-pending-audible-body-1',
      },
    })).toBe(
      'resident calm is waiting for renderer application | body+lipsync+voice recovery@segment-vrm-pending-audible-body-1 | audible-body rejoin@segment-vrm-pending-audible-body-1 | audible-living-line leads while face+motion lag@segment-vrm-pending-audible-body-1 | pending-rejoin=face+motion',
    )
  })

  it('keeps quieter body+lipsync carry visible inside pending renderer summaries when voice has not rejoined yet', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      severity: 'info',
      code: 'renderer-vrm-pending',
      message: 'VRM resident prediction has not been applied yet.',
    } as any, {
      live2d: null,
      vrm: {
        predicted: 'calm',
        actual: null,
        reason: 'preferred',
        status: 'predicted-only',
        driftKind: 'resident-not-yet-applied',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        faceDriverCue: null,
        faceDriverSource: null,
        motionDriverCue: null,
        motionDriverSource: null,
        faceDriverSegmentId: null,
        motionDriverSegmentId: null,
        bodyDriverSegmentId: 'segment-vrm-pending-body-lipsync-1',
        lipsyncDriverSegmentId: 'segment-vrm-pending-body-lipsync-1',
        voiceDriverSegmentId: 'segment-vrm-pending-voice-later-1',
      },
    } as any)).toBe(
      'resident calm is waiting for renderer application | timing=body-lipsync-carry',
    )
  })

  it('surfaces which visual lane is still lagging when audible body continuity has already re-formed on the current living line', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-live2d-pending',
      severity: 'info',
      message: 'Live2D resident prediction has not been applied yet.',
    }, {
      live2d: {
        predicted: 'Soft Gaze',
        actual: null,
        reason: 'preferred',
        status: 'predicted-only',
        driftKind: 'resident-not-yet-applied',
        faceDriverCue: 'soft-gaze',
        faceDriverSource: 'digital-life-projection',
        faceDriverSegmentId: 'segment-live2d-face-lag-older-shell',
        motionDriverCue: 'observe_focus',
        motionDriverSource: 'timeline-projection',
        motionDriverSegmentId: 'segment-live2d-audible-line-now',
        bodyDriverSegmentId: 'segment-live2d-audible-line-now',
        lipsyncDriverSegmentId: 'segment-live2d-audible-line-now',
        reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
        signature: 'embodiment:audible-same-her-line',
        voiceDriverSegmentId: 'segment-live2d-audible-line-now',
      },
      vrm: null,
    } as any)).toBe(
      'resident Soft Gaze is waiting for renderer application | face soft-gaze@digital-life-projection | motion observe_focus@timeline-projection | continuity=embodiment:audible-same-her-line+embodiment:body-lipsync-voice-rejoin | signature=embodiment:audible-same-her-line | audible-living-line leads while face lag@segment-live2d-audible-line-now',
    )
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
        reason: 'runtime-expression',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        faceDriverCue: 'focused',
        faceDriverSource: 'prosody-authority',
        motionDriverCue: 'observe_focus',
        motionDriverSource: 'cue-bridge',
      },
      vrm: null,
    })).toBe('runtime expression surfaced Focus Inspect before resident prediction | face focused@prosody-authority | motion observe_focus@cue-bridge')
  })

  it('builds a vrm runtime-only reason summary from actual expression and authority source', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-vrm-runtime-only',
      severity: 'warn',
      message: 'VRM is showing a runtime expression without a resident predicted expression.',
    }, {
      live2d: null,
      vrm: {
        predicted: null,
        actual: 'focus',
        reason: 'runtime-emotion',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        faceDriverCue: 'focused',
        faceDriverSource: 'prosody-authority',
        motionDriverCue: 'observe_focus',
        motionDriverSource: 'cue-bridge',
      } as any,
    })).toBe('runtime emotion surfaced focus before resident prediction | face focused@prosody-authority | motion observe_focus@cue-bridge')
  })

  it('builds a vrm runtime-only reason summary from actual facial cue visibility when no resident expression has landed yet', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-vrm-runtime-only',
      severity: 'warn',
      message: 'VRM is showing a runtime expression without a resident predicted expression.',
    }, {
      live2d: null,
      vrm: {
        predicted: null,
        actual: 'calm',
        reason: 'runtime-facial-cue',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        faceDriverCue: 'focused',
        faceDriverSource: 'prosody-authority',
        motionDriverCue: 'observe_focus',
        motionDriverSource: 'cue-bridge',
      } as any,
    })).toBe('runtime facial cue surfaced calm before resident prediction | face focused@prosody-authority | motion observe_focus@cue-bridge')
  })

  it('keeps body-only recovery visible inside runtime-only renderer summaries when the resident body line returns before face and motion do', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-live2d-runtime-only',
      severity: 'warn',
      message: 'Live2D is showing a runtime expression without a resident predicted expression.',
    }, {
      live2d: {
        predicted: null,
        actual: 'Resident Hold',
        reason: 'resident-body-first',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        faceDriverCue: null,
        faceDriverSource: null,
        motionDriverCue: null,
        motionDriverSource: null,
        faceDriverSegmentId: null,
        motionDriverSegmentId: null,
        bodyDriverSegmentId: 'segment-live2d-runtime-body-only-1',
      } as any,
      vrm: null,
    })).toBe(
      'runtime surfaced Resident Hold before resident prediction | body-only recovery@segment-live2d-runtime-body-only-1 | pending-rejoin=face+motion+lipsync+voice',
    )
  })

  it('keeps body+voice recovery visible inside runtime-only renderer summaries when the resident body line and audible line return together before face and motion do', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-live2d-runtime-only',
      severity: 'warn',
      message: 'Live2D is showing a runtime expression without a resident predicted expression.',
    }, {
      live2d: {
        predicted: null,
        actual: 'Resident Hold',
        reason: 'resident-body-voice-first',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        faceDriverCue: null,
        faceDriverSource: null,
        motionDriverCue: null,
        motionDriverSource: null,
        faceDriverSegmentId: null,
        motionDriverSegmentId: null,
        bodyDriverSegmentId: 'segment-live2d-runtime-body-voice-1',
        voiceDriverSegmentId: 'segment-live2d-runtime-body-voice-1',
      },
      vrm: null,
    })).toBe(
      'runtime surfaced Resident Hold before resident prediction | body+voice recovery@segment-live2d-runtime-body-voice-1 | pending-rejoin=face+motion+lipsync',
    )
  })

  it('keeps body+lipsync+voice recovery visible inside runtime-only renderer summaries when the audible-body line returns together before face and motion do', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-live2d-runtime-only',
      severity: 'warn',
      message: 'Live2D is showing a runtime expression without a resident predicted expression.',
    }, {
      live2d: {
        predicted: null,
        actual: 'Resident Hold',
        reason: 'resident-audible-body-first',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        faceDriverCue: null,
        faceDriverSource: null,
        motionDriverCue: null,
        motionDriverSource: null,
        faceDriverSegmentId: null,
        motionDriverSegmentId: null,
        bodyDriverSegmentId: 'segment-live2d-runtime-audible-body-1',
        lipsyncDriverSegmentId: 'segment-live2d-runtime-audible-body-1',
        voiceDriverSegmentId: 'segment-live2d-runtime-audible-body-1',
      },
      vrm: null,
    })).toBe(
      'runtime surfaced Resident Hold before resident prediction | body+lipsync+voice recovery@segment-live2d-runtime-audible-body-1 | audible-body rejoin@segment-live2d-runtime-audible-body-1 | audible-living-line leads while face+motion lag@segment-live2d-runtime-audible-body-1 | pending-rejoin=face+motion',
    )
  })

  it('keeps still-voiced face-line continuity explicit inside runtime-only renderer summaries instead of thinning it into a generic runtime-only drift note', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-live2d-runtime-only',
      severity: 'warn',
      message: 'Live2D is showing a runtime expression without a resident predicted expression.',
    }, {
      live2d: {
        predicted: null,
        actual: 'Resident Hold',
        reason: 'resident-still-voiced-face-first',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        faceDriverCue: 'soft-gaze',
        faceDriverSource: 'prosody-authority',
        motionDriverCue: null,
        motionDriverSource: null,
        faceDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-1',
        motionDriverSegmentId: null,
        bodyDriverSegmentId: null,
        lipsyncDriverSegmentId: null,
        voiceDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-1',
        reasonTags: ['embodiment:still-voiced-face-line'],
      } as any,
      vrm: null,
    })).toBe(
      'runtime surfaced Resident Hold before resident prediction | face soft-gaze@prosody-authority | continuity=embodiment:still-voiced-face-line | face+voice recovery@segment-live2d-runtime-still-voiced-face-1 | pending-rejoin=body+motion+lipsync',
    )
  })

  it('keeps signature-only still-voiced motion-line continuity explicit inside runtime-only renderer summaries instead of collapsing it back to a generic partial-lane note', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-live2d-runtime-only',
      severity: 'warn',
      message: 'Live2D is showing a runtime expression without a resident predicted expression.',
    }, {
      live2d: {
        predicted: null,
        actual: 'Resident Hold',
        reason: 'resident-still-voiced-motion-first',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        faceDriverCue: null,
        faceDriverSource: null,
        motionDriverCue: 'observe_focus',
        motionDriverSource: 'timeline-projection',
        faceDriverSegmentId: null,
        motionDriverSegmentId: 'segment-live2d-runtime-still-voiced-motion-1',
        bodyDriverSegmentId: null,
        lipsyncDriverSegmentId: null,
        voiceDriverSegmentId: 'segment-live2d-runtime-still-voiced-motion-1',
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
      } as any,
      vrm: null,
    })).toBe(
      'runtime surfaced Resident Hold before resident prediction | motion observe_focus@timeline-projection | continuity=embodiment:still-voiced-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line | motion+voice recovery@segment-live2d-runtime-still-voiced-motion-1 | pending-rejoin=body+face+lipsync',
    )
  })

  it('keeps richer still-voiced face-and-mouth continuity explicit inside runtime-only renderer summaries instead of thinning it back to a plain face-line note', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-live2d-runtime-only',
      severity: 'warn',
      message: 'Live2D is showing a runtime expression without a resident predicted expression.',
    }, {
      live2d: {
        predicted: null,
        actual: 'Resident Hold',
        reason: 'resident-still-voiced-face-mouth-first',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        faceDriverCue: 'soft-gaze',
        faceDriverSource: 'prosody-authority',
        motionDriverCue: null,
        motionDriverSource: null,
        faceDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-mouth-1',
        motionDriverSegmentId: null,
        bodyDriverSegmentId: null,
        lipsyncDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-mouth-1',
        voiceDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-mouth-1',
        reasonTags: [
          'embodiment:still-voiced-face-lipsync-line',
          'embodiment:still-voiced-face-line',
        ],
      } as any,
      vrm: null,
    })).toBe(
      'runtime surfaced Resident Hold before resident prediction | face soft-gaze@prosody-authority | continuity=embodiment:still-voiced-face-lipsync-line+embodiment:still-voiced-face-line | face+lipsync+voice recovery@segment-live2d-runtime-still-voiced-face-mouth-1 | pending-rejoin=body+motion',
    )
  })

  it('keeps richer still-voiced motion-and-mouth continuity explicit inside runtime-only renderer summaries instead of thinning it back to a plain motion-line note', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-live2d-runtime-only',
      severity: 'warn',
      message: 'Live2D is showing a runtime expression without a resident predicted expression.',
    }, {
      live2d: {
        predicted: null,
        actual: 'Resident Hold',
        reason: 'resident-still-voiced-motion-mouth-first',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        faceDriverCue: null,
        faceDriverSource: null,
        motionDriverCue: 'observe_focus',
        motionDriverSource: 'timeline-projection',
        faceDriverSegmentId: null,
        motionDriverSegmentId: 'segment-live2d-runtime-still-voiced-motion-mouth-1',
        bodyDriverSegmentId: null,
        lipsyncDriverSegmentId: 'segment-live2d-runtime-still-voiced-motion-mouth-1',
        voiceDriverSegmentId: 'segment-live2d-runtime-still-voiced-motion-mouth-1',
        reasonTags: [
          'embodiment:still-voiced-motion-lipsync-line',
          'embodiment:still-voiced-motion-line',
        ],
      } as any,
      vrm: null,
    })).toBe(
      'runtime surfaced Resident Hold before resident prediction | motion observe_focus@timeline-projection | continuity=embodiment:still-voiced-motion-lipsync-line+embodiment:still-voiced-motion-line | motion+lipsync+voice recovery@segment-live2d-runtime-still-voiced-motion-mouth-1 | pending-rejoin=body+face',
    )
  })

  it('keeps still-voiced face-and-motion continuity explicit inside runtime-only renderer summaries instead of flattening it into separate face or motion drift notes', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-live2d-runtime-only',
      severity: 'warn',
      message: 'Live2D is showing a runtime expression without a resident predicted expression.',
    }, {
      live2d: {
        predicted: null,
        actual: 'Resident Hold',
        reason: 'resident-still-voiced-face-motion-first',
        status: 'actual-only',
        driftKind: 'runtime-only-visible',
        faceDriverCue: 'soft-gaze',
        faceDriverSource: 'prosody-authority',
        motionDriverCue: 'observe_focus',
        motionDriverSource: 'timeline-projection',
        faceDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-motion-1',
        motionDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-motion-1',
        bodyDriverSegmentId: null,
        lipsyncDriverSegmentId: null,
        voiceDriverSegmentId: 'segment-live2d-runtime-still-voiced-face-motion-1',
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line',
      } as any,
      vrm: null,
    })).toBe(
      'runtime surfaced Resident Hold before resident prediction | face soft-gaze@prosody-authority | motion observe_focus@timeline-projection | continuity=embodiment:still-voiced-face-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line | same-segment face+motion recovery@segment-live2d-runtime-still-voiced-face-motion-1 | pending-rejoin=body+lipsync',
    )
  })

  it('keeps face and motion authority distinct inside renderer drift explanations', () => {
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
        faceDriverCue: 'focused',
        faceDriverSource: 'cue-bridge',
        motionDriverCue: 'observe_focus',
        motionDriverSource: 'cue-bridge',
      },
      vrm: null,
    })).toBe(
      'resident Soft Gaze -> actual Focus Inspect | face focused@cue-bridge | motion observe_focus@cue-bridge',
    )
  })

  it('keeps vrm face and motion authority distinct inside renderer drift explanations', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-vrm-drift',
      severity: 'warn',
      message: 'VRM actual expression diverged from resident predicted expression.',
    }, {
      live2d: null,
      vrm: {
        predicted: 'calm',
        actual: 'focus',
        reason: 'preferred',
        status: 'drifted',
        driftKind: 'alias-resolution-drift',
        faceDriverCue: 'focused',
        faceDriverSource: 'cue-bridge',
        motionDriverCue: 'observe_focus',
        motionDriverSource: 'cue-bridge',
      } as any,
    })).toBe(
      'resident calm -> actual focus | face focused@cue-bridge | motion observe_focus@cue-bridge',
    )
  })

  it('marks same-segment face-motion-body recovery inside renderer drift explanations when the body line has already re-formed on one living segment', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-live2d-partial-recovery',
      severity: 'warn',
      message: 'Live2D expression names still differ, but body, face, and motion authority have already re-formed on the same segment.',
    }, {
      live2d: {
        predicted: 'Soft Gaze',
        actual: 'Focus Inspect',
        reason: 'preferred',
        status: 'drifted',
        driftKind: 'alias-resolution-drift',
        faceDriverCue: 'focused',
        faceDriverSource: 'cue-bridge',
        faceDriverSegmentId: 'segment-live2d-reformed-1',
        motionDriverCue: 'observe_focus',
        motionDriverSource: 'cue-bridge',
        motionDriverSegmentId: 'segment-live2d-reformed-1',
        bodyDriverSegmentId: 'segment-live2d-reformed-1',
      } as any,
      vrm: null,
    })).toBe(
      'resident Soft Gaze -> actual Focus Inspect | face focused@cue-bridge | motion observe_focus@cue-bridge | same-segment face+motion+body recovery@segment-live2d-reformed-1 | remaining-open=lipsync+voice',
    )
  })

  it('marks body-only recovery inside renderer drift explanations when the resident body line is the only surviving aligned segment', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-vrm-partial-recovery',
      severity: 'warn',
      message: 'VRM expression names still differ, but the resident body line is the only surviving aligned segment.',
    }, {
      live2d: null,
      vrm: {
        predicted: 'calm',
        actual: 'focus',
        reason: 'preferred',
        status: 'drifted',
        driftKind: 'alias-resolution-drift',
        faceDriverCue: null,
        faceDriverSource: null,
        motionDriverCue: null,
        motionDriverSource: null,
        faceDriverSegmentId: null,
        motionDriverSegmentId: null,
        bodyDriverSegmentId: 'segment-vrm-body-only-recovery-1',
      } as any,
    })).toBe(
      'resident calm -> actual focus | body-only recovery@segment-vrm-body-only-recovery-1 | pending-rejoin=face+motion+lipsync+voice',
    )
  })

  it('marks body+voice recovery inside renderer drift explanations when the resident body line and audible line are the only surviving aligned segment', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-vrm-partial-recovery',
      severity: 'warn',
      message: 'VRM expression names still differ, but the resident body line and audible line are the surviving aligned segment.',
    }, {
      live2d: null,
      vrm: {
        predicted: 'calm',
        actual: 'focus',
        reason: 'preferred',
        status: 'drifted',
        driftKind: 'alias-resolution-drift',
        faceDriverCue: null,
        faceDriverSource: null,
        motionDriverCue: null,
        motionDriverSource: null,
        faceDriverSegmentId: null,
        motionDriverSegmentId: null,
        bodyDriverSegmentId: 'segment-vrm-body-voice-recovery-1',
        voiceDriverSegmentId: 'segment-vrm-body-voice-recovery-1',
      },
    })).toBe(
      'resident calm -> actual focus | body+voice recovery@segment-vrm-body-voice-recovery-1 | pending-rejoin=face+motion+lipsync',
    )
  })

  it('marks body+lipsync+voice recovery inside renderer drift explanations when the audible-body line is the only surviving aligned segment', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-vrm-partial-recovery',
      severity: 'warn',
      message: 'VRM expression names still differ, but the audible-body line is the surviving aligned segment.',
    }, {
      live2d: null,
      vrm: {
        predicted: 'calm',
        actual: 'focus',
        reason: 'preferred',
        status: 'drifted',
        driftKind: 'alias-resolution-drift',
        faceDriverCue: null,
        faceDriverSource: null,
        motionDriverCue: null,
        motionDriverSource: null,
        faceDriverSegmentId: null,
        motionDriverSegmentId: null,
        bodyDriverSegmentId: 'segment-vrm-audible-body-recovery-1',
        lipsyncDriverSegmentId: 'segment-vrm-audible-body-recovery-1',
        voiceDriverSegmentId: 'segment-vrm-audible-body-recovery-1',
      },
    })).toBe(
      'resident calm -> actual focus | body+lipsync+voice recovery@segment-vrm-audible-body-recovery-1 | audible-body rejoin@segment-vrm-audible-body-recovery-1 | audible-living-line leads while face+motion lag@segment-vrm-audible-body-recovery-1 | pending-rejoin=face+motion',
    )
  })

  it('marks lipsync+voice recovery inside renderer drift explanations when the audible same-her line survives before body face and motion return', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-vrm-partial-recovery',
      severity: 'warn',
      message: 'VRM expression names still differ, but the audible same-her line is the surviving aligned segment.',
    }, {
      live2d: null,
      vrm: {
        predicted: 'calm',
        actual: 'focus',
        reason: 'preferred',
        status: 'drifted',
        driftKind: 'alias-resolution-drift',
        faceDriverCue: null,
        faceDriverSource: null,
        motionDriverCue: null,
        motionDriverSource: null,
        faceDriverSegmentId: null,
        motionDriverSegmentId: null,
        bodyDriverSegmentId: null,
        lipsyncDriverSegmentId: 'segment-vrm-audible-voice-recovery-1',
        voiceDriverSegmentId: 'segment-vrm-audible-voice-recovery-1',
      },
    })).toBe(
      'resident calm -> actual focus | lipsync+voice recovery@segment-vrm-audible-voice-recovery-1 | pending-rejoin=body+face+motion',
    )
  })

  it('builds a cross-modal reason summary when mouth proof exists but face or motion authority has drifted away', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'cross-modal-mouth-dominance',
      severity: 'warn',
      message: 'Lip sync is executing, but face or motion authority has drifted away from the same segment.',
    }, {
      live2d: null,
      vrm: null,
    }, '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是口型。')).toBe(
      '口型已执行，但表情或动作没有和同一段数字生命表达对齐，同一条 companionship 身体线正在变薄 | 表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是口型。',
    )
  })

  it('builds a single-lane continuity reason summary when only one embodiment lane is still aligned', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'cross-modal-single-lane-dominance',
      severity: 'warn',
      message: 'Only one embodiment lane is still aligned with the active same-her segment.',
    }, {
      live2d: null,
      vrm: null,
    }, '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是口型。')).toBe(
      '当前只有一条身体通道还和同一段数字生命表达对齐，跨模态连续性正在从同一条 companionship 身体线收缩 | 表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是口型。',
    )
  })

  it('builds a resident-body single-lane continuity reason summary when only the resident body lane still survives', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'cross-modal-single-lane-dominance',
      severity: 'warn',
      message: 'Only the resident body lane is still aligned with the active same-her segment.',
    }, {
      live2d: null,
      vrm: null,
    }, '表情、动作 authority 漂移，当前 resident body 还在同一段数字生命表达上。')).toBe(
      '当前只有 resident body 这条身体线还和同一段数字生命表达对齐，跨模态连续性正在从同一个 her 的身体主线收缩 | 表情、动作 authority 漂移，当前 resident body 还在同一段数字生命表达上。',
    )
  })

  it('builds a partial-lane continuity reason summary when two embodiment lanes still hold the same-her line', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'cross-modal-partial-lane-dominance',
      severity: 'warn',
      message: 'Two embodiment lanes are still aligned with the active same-her segment, but full cross-modal continuity has already narrowed.',
    }, {
      live2d: null,
      vrm: null,
    }, '口型 authority 漂移，当前 face 和 motion 还在同一段数字生命表达上。')).toBe(
      '当前还有两条身体通道仍和同一段数字生命表达对齐，但完整跨模态身体线已经开始收缩 | 口型 authority 漂移，当前 face 和 motion 还在同一段数字生命表达上。',
    )
  })

  it('builds a resident-body partial-lane continuity reason summary when the resident body lane still anchors the surviving line', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'cross-modal-partial-lane-dominance',
      severity: 'warn',
      message: 'The resident body lane is still holding together with one other embodiment lane, but full cross-modal continuity has already narrowed.',
    }, {
      live2d: null,
      vrm: null,
    }, '口型 authority 漂移，但 resident body 仍和 voice 一起托住同一段数字生命表达。')).toBe(
      '当前 resident body 这条身体线仍和另一条通道一起托住同一段数字生命表达，但完整跨模态身体线已经开始收缩 | 口型 authority 漂移，但 resident body 仍和 voice 一起托住同一段数字生命表达。',
    )
  })

  it('builds a voice-only partial-lane continuity reason summary when only the voiced same-her line is still aligned', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'cross-modal-single-lane-dominance',
      severity: 'warn',
      message: 'Only one embodiment lane is still aligned with the active same-her segment.',
    }, {
      live2d: null,
      vrm: null,
    }, '表情、动作、口型 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是语音。')).toBe(
      '当前只有 voice 这条可听见的 same-her 生命线还和同一段数字生命表达对齐，跨模态连续性正在从这条活着的声音线收缩 | 表情、动作、口型 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是语音。',
    )
  })

  it('builds a lipsync+voice partial-lane continuity reason summary when the surviving same-her line is still audible through mouth and voice together', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'cross-modal-single-lane-dominance',
      severity: 'warn',
      message: 'Only one embodiment lane is still aligned with the active same-her segment.',
    }, {
      live2d: null,
      vrm: null,
    }, '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是口型和语音。')).toBe(
      '当前只有 lipsync 和 voice 这条可听见的 same-her 生命线还和同一段数字生命表达对齐，跨模态连续性正在从这条活着的声音线收缩 | 表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是口型和语音。',
    )
  })

  it('builds a face+voice partial-lane continuity reason summary when expression and voice are the only surviving same-her carry', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'cross-modal-single-lane-dominance',
      severity: 'warn',
      message: 'Only one embodiment lane is still aligned with the active same-her segment.',
    }, {
      live2d: null,
      vrm: null,
    }, '动作、口型 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情和语音。')).toBe(
      '当前只有 face 和 voice 这条 same-her 生命线还和同一段数字生命表达对齐，跨模态连续性正在从这条仍在发声的表情线收缩 | 动作、口型 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情和语音。',
    )
  })

  it('builds a motion+voice partial-lane continuity reason summary when motion and voice are the only surviving same-her carry', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'cross-modal-single-lane-dominance',
      severity: 'warn',
      message: 'Only one embodiment lane is still aligned with the active same-her segment.',
    }, {
      live2d: null,
      vrm: null,
    }, '表情、口型 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是动作和语音。')).toBe(
      '当前只有 motion 和 voice 这条 same-her 生命线还和同一段数字生命表达对齐，跨模态连续性正在从这条仍在发声的动作线收缩 | 表情、口型 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是动作和语音。',
    )
  })

  it('builds a face+lipsync partial-lane continuity reason summary when expression and mouth are the quieter surviving same-her carry', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'cross-modal-partial-lane-dominance',
      severity: 'warn',
      message: 'Two embodiment lanes are still aligned with the active same-her segment, but full cross-modal continuity has already narrowed.',
    }, {
      live2d: null,
      vrm: null,
    }, '身体、动作、语音 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情和口型。')).toBe(
      '当前只有 face 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线 | 身体、动作、语音 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情和口型。',
    )
  })

  it('builds a motion+lipsync partial-lane continuity reason summary when motion and mouth are the quieter surviving same-her carry', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'cross-modal-partial-lane-dominance',
      severity: 'warn',
      message: 'Two embodiment lanes are still aligned with the active same-her segment, but full cross-modal continuity has already narrowed.',
    }, {
      live2d: null,
      vrm: null,
    }, '身体、表情、语音 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是动作和口型。')).toBe(
      '当前只有 motion 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线 | 身体、表情、语音 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是动作和口型。',
    )
  })

  it('builds an audible-body partial-lane continuity reason summary when the surviving line is specifically the resident body plus audible same-her carry', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'cross-modal-partial-lane-dominance',
      severity: 'warn',
      message: 'The resident body lane is still holding together with the audible same-her line, but face and motion have not rejoined yet.',
    }, {
      live2d: null,
      vrm: null,
    }, '表情、动作 authority 漂移，但 resident body、lipsync 和 voice 仍在同一段数字生命表达上。')).toBe(
      '当前 resident body 这条身体线仍和可听见的 same-her 生命线一起托住同一段数字生命表达，但 face 和 motion 还没有重新接回这条活着的身体线 | 表情、动作 authority 漂移，但 resident body、lipsync 和 voice 仍在同一段数字生命表达上。',
    )
  })

  it('also treats audible same-her lane wording as the stronger audible-body continuity summary', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'cross-modal-partial-lane-dominance',
      severity: 'warn',
      message: 'The resident body lane is still holding together with one audible same-her lane, but face and motion have not yet rejoined the same active segment.',
    }, {
      live2d: null,
      vrm: null,
    }, '表情、动作 authority 漂移，但 resident body、lipsync 和 voice 仍在同一段数字生命表达上。')).toBe(
      '当前 resident body 这条身体线仍和可听见的 same-her 生命线一起托住同一段数字生命表达，但 face 和 motion 还没有重新接回这条活着的身体线 | 表情、动作 authority 漂移，但 resident body、lipsync 和 voice 仍在同一段数字生命表达上。',
    )
  })

  it('keeps body+voice-only partial-lane wording distinct from fuller audible-body recovery when lipsync has not rejoined yet', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'cross-modal-partial-lane-dominance',
      severity: 'warn',
      message: 'The resident body lane is still holding together with the same-her voice line, but lipsync, face, and motion have not yet rejoined the same active segment.',
    }, {
      live2d: null,
      vrm: null,
    }, '表情、动作、口型 authority 漂移，但 resident body 和 voice 仍在同一段数字生命表达上。')).toBe(
      '当前 resident body 这条身体线仍和 same-her 的声音线一起托住同一段数字生命表达，但 lipsync、face 和 motion 还没有重新接回这条活着的身体线 | 表情、动作、口型 authority 漂移，但 resident body 和 voice 仍在同一段数字生命表达上。',
    )
  })

  it('keeps body+voice-only focus summary distinct from resident-body plus audible-line recovery when lipsync is still missing', () => {
    expect(buildStageEmbodimentDiagnosticsAlertFocusSummary({
      code: 'cross-modal-partial-lane-dominance',
      severity: 'warn',
      message: 'The resident body lane is still holding together with the same-her voice line, but lipsync, face, and motion have not yet rejoined the same active segment.',
    }, {
      live2d: null,
      vrm: null,
    }, '表情、动作、口型 authority 漂移，但 resident body 和 voice 仍在同一段数字生命表达上。')).toBe(
      'resident-body+voice active | pending lipsync+face+motion',
    )
  })

  it('keeps face+lipsync quieter-lane focus distinct from generic two-lane narrowing when body motion and voice are still missing', () => {
    expect(buildStageEmbodimentDiagnosticsAlertFocusSummary({
      code: 'cross-modal-partial-lane-dominance',
      severity: 'warn',
      message: 'Two embodiment lanes are still aligned with the active same-her segment, but full cross-modal continuity has already narrowed.',
    }, {
      live2d: null,
      vrm: null,
    }, '身体、动作、语音 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情和口型。')).toBe(
      'face+lipsync active | pending body+motion+voice',
    )
  })

  it('keeps motion+lipsync quieter-lane focus distinct from generic two-lane narrowing when body face and voice are still missing', () => {
    expect(buildStageEmbodimentDiagnosticsAlertFocusSummary({
      code: 'cross-modal-partial-lane-dominance',
      severity: 'warn',
      message: 'Two embodiment lanes are still aligned with the active same-her segment, but full cross-modal continuity has already narrowed.',
    }, {
      live2d: null,
      vrm: null,
    }, '身体、表情、语音 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是动作和口型。')).toBe(
      'motion+lipsync active | pending body+face+voice',
    )
  })

  it('keeps audible-body recovery explicitly marked as pending face and motion rejoin in renderer diagnostics summaries', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-vrm-partial-recovery',
      severity: 'info',
      message: 'Renderer authority has partially recovered on a later audible-body line.',
    }, {
      live2d: null,
      vrm: {
        predicted: 'calm',
        actual: 'focus',
        reason: 'runtime-expression',
        status: 'drifted',
        driftKind: 'alias-resolution-drift',
        faceDriverCue: null,
        faceDriverSource: null,
        motionDriverCue: null,
        motionDriverSource: null,
        faceDriverSegmentId: null,
        motionDriverSegmentId: null,
        bodyDriverSegmentId: 'segment-vrm-audible-body-recovery-2',
        lipsyncDriverSegmentId: 'segment-vrm-audible-body-recovery-2',
        voiceDriverSegmentId: 'segment-vrm-audible-body-recovery-2',
      },
    })).toBe(
      'resident calm -> actual focus | body+lipsync+voice recovery@segment-vrm-audible-body-recovery-2 | audible-body rejoin@segment-vrm-audible-body-recovery-2 | audible-living-line leads while face+motion lag@segment-vrm-audible-body-recovery-2 | pending-rejoin=face+motion',
    )
  })

  it('keeps explicit audible same-her continuity proof visible alongside face-motion recovery prose when the living audio thread is still the surviving host-visible line', () => {
    expect(buildStageEmbodimentDiagnosticsAlertReasonSummary({
      code: 'renderer-vrm-partial-recovery',
      severity: 'info',
      message: 'Same-segment face and motion recovery exists, but explicit audible same-her continuity proof still shows the living audio thread as the stronger surviving host-visible line.',
    }, {
      live2d: null,
      vrm: {
        predicted: 'calm',
        actual: 'focus',
        reason: 'runtime-expression',
        status: 'drifted',
        driftKind: 'alias-resolution-drift',
        faceDriverCue: 'soft-gaze',
        faceDriverSource: 'cue-bridge',
        motionDriverCue: 'observe_focus',
        motionDriverSource: 'cue-bridge',
        faceDriverSegmentId: 'segment-vrm-reformed-face-motion-1',
        motionDriverSegmentId: 'segment-vrm-reformed-face-motion-1',
        bodyDriverSegmentId: 'segment-vrm-audible-body-recovery-3',
        lipsyncDriverSegmentId: 'segment-vrm-audible-body-recovery-3',
        voiceDriverSegmentId: 'segment-vrm-audible-body-recovery-3',
      },
    }, 'continuity=embodiment:audible-same-her-line+embodiment:body-lipsync-voice-rejoin | signature=embodiment:audible-same-her-line | face and motion still need to rejoin the same living line.')).toBe(
      'resident calm -> actual focus | face soft-gaze@cue-bridge | motion observe_focus@cue-bridge | body+lipsync+voice recovery@segment-vrm-audible-body-recovery-3 | audible-body rejoin@segment-vrm-audible-body-recovery-3 | audible-living-line leads while face+motion lag@segment-vrm-audible-body-recovery-3 | pending-rejoin=face+motion | same-segment face+motion recovery@segment-vrm-reformed-face-motion-1',
    )
  })
})
