import { describe, expect, it } from 'vitest'

import {
  buildAlicizationEmbodimentFaceCue,
  buildAlicizationEmbodimentLipSyncHints,
  buildAlicizationEmbodimentMotionBurst,
} from './alicization-embodiment-expression-derivation'

function createSpeechSegment(rendererHints: Record<string, unknown>) {
  return {
    id: 'segment-remembered-seam',
    text: '我先轻一点接住这条线。',
    settleMs: 420,
    prosody: {
      emphasisStrength: 0.58,
      pauseClass: 'full-stop',
      contour: 'falling',
    },
    rendererHints,
  } as const
}

function createTimelineSegment(rendererHints: Record<string, unknown>) {
  return {
    id: 'segment-remembered-seam',
    index: 0,
    startOffset: 0,
    endOffset: 12,
    text: '我先轻一点接住这条线。',
    emotion: 'concerned',
    gestureWeight: 0.52,
    facialWeight: 0.58,
    prosodyWeight: 0.56,
    beatWeight: 0.42,
    mouthWeight: 0.55,
    headWeight: 0.4,
    facialHoldMs: 360,
    actionHoldMs: 320,
    emotionHoldMs: 380,
    settleMode: 'linger',
    rendererHints,
    actionCue: 'observe_focus',
    facialCue: 'soft-gaze',
    actionWindow: 'none',
    interruptMode: 'soft-interrupt',
  } as const
}

describe('alicization embodiment expression derivation', () => {
  it('does not infer embodiment intensity from renderer alias ordering', () => {
    const genericRendererHints = {
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
    } as const
    const rememberedSeamRendererHints = {
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['soft-gaze', 'calm_inspect'],
      preferredMotionAliases: ['idle_settle', 'stillness_guard'],
    } as const

    const genericSegment = createSpeechSegment(genericRendererHints)
    const rememberedSeamSegment = createSpeechSegment(rememberedSeamRendererHints)
    const genericTimelineSegment = createTimelineSegment(genericRendererHints)
    const rememberedSeamTimelineSegment = createTimelineSegment(rememberedSeamRendererHints)

    const genericLipSyncHints = buildAlicizationEmbodimentLipSyncHints({
      segment: genericSegment as any,
      timelineSegment: genericTimelineSegment as any,
    })
    const rememberedSeamLipSyncHints = buildAlicizationEmbodimentLipSyncHints({
      segment: rememberedSeamSegment as any,
      timelineSegment: rememberedSeamTimelineSegment as any,
    })

    expect(rememberedSeamLipSyncHints).toEqual(genericLipSyncHints)

    const genericFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: genericSegment as any,
      timelineSegment: genericTimelineSegment as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })
    const rememberedSeamFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: rememberedSeamSegment as any,
      timelineSegment: rememberedSeamTimelineSegment as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })

    expect(rememberedSeamFaceCue).toEqual(genericFaceCue)

    const genericMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: genericSegment as any,
      timelineSegment: genericTimelineSegment as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })
    const rememberedSeamMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: rememberedSeamSegment as any,
      timelineSegment: rememberedSeamTimelineSegment as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })

    expect(rememberedSeamMotionBurst).toEqual(genericMotionBurst)
  })

  it('keeps audited continuity tokens from changing lipsync, face, or motion derivation', () => {
    const cleanRendererHints = {
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
    } as const
    const auditedRendererHintCases = [
      {
        ...cleanRendererHints,
        signature: 'embodiment:audible-continuity-line',
        reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      },
      {
        ...cleanRendererHints,
        signature: 'resident|main-runtime|embodiment:audible_continuity_line|body+voice-only',
        reasonTags: ['embodiment:body+voice-only'],
      },
      {
        ...cleanRendererHints,
        reasonTags: ['embodiment:still-voiced-face-line'],
      },
      {
        ...cleanRendererHints,
        signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
      },
      {
        ...cleanRendererHints,
        reasonTags: ['embodiment:body+lipsync-only'],
      },
      {
        ...cleanRendererHints,
        reasonTags: ['lane=face+lipsync-only'],
      },
      {
        ...cleanRendererHints,
        reasonTags: ['lane=motion+lipsync-only'],
      },
    ] as const

    const cleanLipSyncHints = buildAlicizationEmbodimentLipSyncHints({
      segment: createSpeechSegment(cleanRendererHints) as any,
      timelineSegment: createTimelineSegment(cleanRendererHints) as any,
    })
    const cleanFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: createSpeechSegment(cleanRendererHints) as any,
      timelineSegment: createTimelineSegment(cleanRendererHints) as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })
    const cleanMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: createSpeechSegment(cleanRendererHints) as any,
      timelineSegment: createTimelineSegment(cleanRendererHints) as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })

    for (const auditedRendererHints of auditedRendererHintCases) {
      expect(buildAlicizationEmbodimentLipSyncHints({
        segment: createSpeechSegment(auditedRendererHints) as any,
        timelineSegment: createTimelineSegment(auditedRendererHints) as any,
      })).toEqual(cleanLipSyncHints)
      expect(buildAlicizationEmbodimentFaceCue({
        segment: createSpeechSegment(auditedRendererHints) as any,
        timelineSegment: createTimelineSegment(auditedRendererHints) as any,
        fallbackEmotion: 'concerned',
        fallbackFacialCue: 'soft-gaze',
        fallbackIntensity: 0.58,
      })).toEqual(cleanFaceCue)
      expect(buildAlicizationEmbodimentMotionBurst({
        segment: createSpeechSegment(auditedRendererHints) as any,
        timelineSegment: createTimelineSegment(auditedRendererHints) as any,
        fallbackActionCue: 'observe_focus',
        fallbackIntensity: 0.52,
      })).toEqual(cleanMotionBurst)
    }
  })

  it('does not turn descriptive renderer preferences into hidden intensity multipliers', () => {
    const ordinaryRendererHints = {
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredMotionAliases: ['observe_soft', 'stillness_guard'],
    } as const
    const quieterRendererHints = {
      residentMode: 'measured-return',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredMotionAliases: ['observe_soft', 'stillness_guard'],
    } as const

    const ordinaryLipSyncHints = buildAlicizationEmbodimentLipSyncHints({
      segment: createSpeechSegment(ordinaryRendererHints) as any,
      timelineSegment: createTimelineSegment(ordinaryRendererHints) as any,
    })
    const quieterLipSyncHints = buildAlicizationEmbodimentLipSyncHints({
      segment: createSpeechSegment(quieterRendererHints) as any,
      timelineSegment: createTimelineSegment(quieterRendererHints) as any,
    })

    expect(quieterLipSyncHints).toEqual(ordinaryLipSyncHints)

    const ordinaryFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: createSpeechSegment(ordinaryRendererHints) as any,
      timelineSegment: createTimelineSegment(ordinaryRendererHints) as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })
    const quieterFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: createSpeechSegment(quieterRendererHints) as any,
      timelineSegment: createTimelineSegment(quieterRendererHints) as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })

    const ordinaryMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: createSpeechSegment(ordinaryRendererHints) as any,
      timelineSegment: createTimelineSegment(ordinaryRendererHints) as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })
    const quieterMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: createSpeechSegment(quieterRendererHints) as any,
      timelineSegment: createTimelineSegment(quieterRendererHints) as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })

    expect(quieterFaceCue).toEqual(ordinaryFaceCue)
    expect(quieterMotionBurst).toEqual(ordinaryMotionBurst)
  })

  it('keeps renderer preference labels separate from prosody-derived lipsync weights', () => {
    const baselineRendererHints = {
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'drift',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredMotionAliases: ['observe_soft', 'stillness_guard'],
    } as const
    const quietGazeRendererHints = {
      ...baselineRendererHints,
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'steady',
    } as const
    const restrainedLipsyncRendererHints = {
      ...baselineRendererHints,
      preferredLipsyncMode: 'restrained',
    } as const

    const baselineLipSyncHints = buildAlicizationEmbodimentLipSyncHints({
      segment: createSpeechSegment(baselineRendererHints) as any,
      timelineSegment: createTimelineSegment(baselineRendererHints) as any,
    })
    const quietGazeLipSyncHints = buildAlicizationEmbodimentLipSyncHints({
      segment: createSpeechSegment(quietGazeRendererHints) as any,
      timelineSegment: createTimelineSegment(quietGazeRendererHints) as any,
    })
    const restrainedLipSyncHints = buildAlicizationEmbodimentLipSyncHints({
      segment: createSpeechSegment(restrainedLipsyncRendererHints) as any,
      timelineSegment: createTimelineSegment(restrainedLipsyncRendererHints) as any,
    })

    expect(quietGazeLipSyncHints).toEqual(baselineLipSyncHints)
    expect(restrainedLipSyncHints).toEqual(baselineLipSyncHints)
  })

  it('keeps pending continuity repair pressure tags from changing lipsync, face, or motion derivation', () => {
    const ordinaryRendererHints = {
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
    } as const
    const pendingRepairRendererHints = {
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
      reasonTags: ['continuity-causality-repair-pressure', 'runtimeContinuityEmbodimentCausality'],
    } as const

    const ordinaryLipSyncHints = buildAlicizationEmbodimentLipSyncHints({
      segment: createSpeechSegment(ordinaryRendererHints) as any,
      timelineSegment: createTimelineSegment(ordinaryRendererHints) as any,
    })
    const pendingRepairLipSyncHints = buildAlicizationEmbodimentLipSyncHints({
      segment: createSpeechSegment(pendingRepairRendererHints) as any,
      timelineSegment: createTimelineSegment(pendingRepairRendererHints) as any,
    })

    expect(pendingRepairLipSyncHints).toEqual(ordinaryLipSyncHints)

    const ordinaryFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: createSpeechSegment(ordinaryRendererHints) as any,
      timelineSegment: createTimelineSegment(ordinaryRendererHints) as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })
    const pendingRepairFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: createSpeechSegment(pendingRepairRendererHints) as any,
      timelineSegment: createTimelineSegment(pendingRepairRendererHints) as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })

    expect(pendingRepairFaceCue).toEqual(ordinaryFaceCue)

    const ordinaryMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: createSpeechSegment(ordinaryRendererHints) as any,
      timelineSegment: createTimelineSegment(ordinaryRendererHints) as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })
    const pendingRepairMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: createSpeechSegment(pendingRepairRendererHints) as any,
      timelineSegment: createTimelineSegment(pendingRepairRendererHints) as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })

    expect(pendingRepairMotionBurst).toEqual(ordinaryMotionBurst)
  })
})
