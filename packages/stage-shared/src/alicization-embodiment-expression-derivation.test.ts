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
  it('keeps remembered-seam more-room measured-return quieter than ordinary measured-return across lipsync, face, and motion derivation', () => {
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

    expect(rememberedSeamLipSyncHints).toHaveLength(genericLipSyncHints.length)
    for (const genericHint of genericLipSyncHints) {
      const rememberedSeamHint = rememberedSeamLipSyncHints.find(hint => hint.viseme === genericHint.viseme)
      expect(rememberedSeamHint?.weight).toBeLessThan(genericHint.weight)
    }

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

    expect(rememberedSeamFaceCue.intensity).toBeLessThan(genericFaceCue.intensity)
    expect(rememberedSeamFaceCue.facialCue).toBe(genericFaceCue.facialCue)

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

    expect(rememberedSeamMotionBurst.intensity).toBeLessThan(genericMotionBurst.intensity)
    expect(rememberedSeamMotionBurst.actionCue).toBe(genericMotionBurst.actionCue)
  })

  it('keeps audited same-her tokens from changing lipsync, face, or motion derivation', () => {
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
        signature: 'embodiment:audible-same-her-line',
        reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      },
      {
        ...cleanRendererHints,
        signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
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

  it('keeps explicit quiet measured-return callback hints softer than an ordinary measured-return even without the older remembered-seam alias swap', () => {
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

    expect(quieterLipSyncHints).toHaveLength(ordinaryLipSyncHints.length)
    for (const ordinaryHint of ordinaryLipSyncHints) {
      const quieterHint = quieterLipSyncHints.find(hint => hint.viseme === ordinaryHint.viseme)
      expect(quieterHint?.weight).toBeLessThan(ordinaryHint.weight)
    }

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

    expect(quieterFaceCue.intensity).toBeLessThan(ordinaryFaceCue.intensity)
    expect(quieterMotionBurst.intensity).toBeLessThan(ordinaryMotionBurst.intensity)
  })

  it('keeps structured quiet-gaze and lipsync preferences authoritative without audit prose', () => {
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

    expect(quietGazeLipSyncHints).not.toEqual(baselineLipSyncHints)
    expect(restrainedLipSyncHints).toHaveLength(baselineLipSyncHints.length)
    for (const baselineHint of baselineLipSyncHints) {
      const restrainedHint = restrainedLipSyncHints.find(hint => hint.viseme === baselineHint.viseme)
      expect(restrainedHint?.weight).toBeLessThan(baselineHint.weight)
    }
  })

  it('keeps pending same-her repair pressure tags from changing lipsync, face, or motion derivation', () => {
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
      reasonTags: ['same-her-causality-repair-pressure', 'runtimeSameHerEmbodimentCausality'],
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
