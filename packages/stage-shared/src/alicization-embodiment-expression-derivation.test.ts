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

  it('keeps audible same-her rejoin measured-return softer than an ordinary measured-return in lipsync derivation', () => {
    const genericRendererHints = {
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
    } as const
    const audibleSameHerRendererHints = {
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['relaxed', 'soft-gaze'],
      preferredMotionAliases: ['steady_focus', 'idle_settle'],
      signature: 'embodiment:audible-same-her-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    } as const

    const genericLipSyncHints = buildAlicizationEmbodimentLipSyncHints({
      segment: createSpeechSegment(genericRendererHints) as any,
      timelineSegment: createTimelineSegment(genericRendererHints) as any,
    })
    const audibleSameHerLipSyncHints = buildAlicizationEmbodimentLipSyncHints({
      segment: createSpeechSegment(audibleSameHerRendererHints) as any,
      timelineSegment: createTimelineSegment(audibleSameHerRendererHints) as any,
    })

    expect(audibleSameHerLipSyncHints).toHaveLength(genericLipSyncHints.length)
    for (const genericHint of genericLipSyncHints) {
      const audibleSameHerHint = audibleSameHerLipSyncHints.find(hint => hint.viseme === genericHint.viseme)
      expect(audibleSameHerHint?.weight).toBeLessThan(genericHint.weight)
    }
  })

  it('keeps audible same-her rejoin softer even when residentMode is no longer explicitly restrained but the continuity state is still structurally carried', () => {
    const genericRendererHints = {
      residentMode: 'dialogue',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
    } as const
    const audibleSameHerRendererHints = {
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['relaxed', 'soft-gaze'],
      preferredMotionAliases: ['steady_focus', 'idle_settle'],
      signature: 'embodiment:audible-same-her-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    } as const

    const genericFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: createSpeechSegment(genericRendererHints) as any,
      timelineSegment: createTimelineSegment(genericRendererHints) as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })
    const audibleSameHerFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: createSpeechSegment(audibleSameHerRendererHints) as any,
      timelineSegment: createTimelineSegment(audibleSameHerRendererHints) as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })

    const genericMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: createSpeechSegment(genericRendererHints) as any,
      timelineSegment: createTimelineSegment(genericRendererHints) as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })
    const audibleSameHerMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: createSpeechSegment(audibleSameHerRendererHints) as any,
      timelineSegment: createTimelineSegment(audibleSameHerRendererHints) as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })

    expect(audibleSameHerFaceCue.intensity).toBeLessThan(genericFaceCue.intensity)
    expect(audibleSameHerMotionBurst.intensity).toBeLessThan(genericMotionBurst.intensity)
  })

  it('keeps coordinator-style freeform same-her body+voice-only carry softer even when residentMode is no longer explicitly restrained but the continuity state is still structurally carried', () => {
    const genericRendererHints = {
      residentMode: 'dialogue',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
    } as const
    const audibleSameHerRendererHints = {
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['relaxed', 'soft-gaze'],
      preferredMotionAliases: ['steady_focus', 'idle_settle'],
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
      reasonTags: ['embodiment:body+voice-only'],
    } as const

    const genericFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: createSpeechSegment(genericRendererHints) as any,
      timelineSegment: createTimelineSegment(genericRendererHints) as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })
    const audibleSameHerFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: createSpeechSegment(audibleSameHerRendererHints) as any,
      timelineSegment: createTimelineSegment(audibleSameHerRendererHints) as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })

    const genericMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: createSpeechSegment(genericRendererHints) as any,
      timelineSegment: createTimelineSegment(genericRendererHints) as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })
    const audibleSameHerMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: createSpeechSegment(audibleSameHerRendererHints) as any,
      timelineSegment: createTimelineSegment(audibleSameHerRendererHints) as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })

    expect(audibleSameHerFaceCue.intensity).toBeLessThan(genericFaceCue.intensity)
    expect(audibleSameHerMotionBurst.intensity).toBeLessThan(genericMotionBurst.intensity)
  })

  it('keeps still-voiced face-line carry softer even when residentMode is no longer explicitly restrained but the continuity state is still structurally carried', () => {
    const genericRendererHints = {
      residentMode: 'dialogue',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
    } as const
    const stillVoicedFaceRendererHints = {
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['soft-gaze', 'relaxed'],
      preferredMotionAliases: ['idle_settle', 'steady_focus'],
      reasonTags: ['embodiment:still-voiced-face-line'],
    } as const

    const genericFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: createSpeechSegment(genericRendererHints) as any,
      timelineSegment: createTimelineSegment(genericRendererHints) as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })
    const stillVoicedFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: createSpeechSegment(stillVoicedFaceRendererHints) as any,
      timelineSegment: createTimelineSegment(stillVoicedFaceRendererHints) as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })

    const genericMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: createSpeechSegment(genericRendererHints) as any,
      timelineSegment: createTimelineSegment(genericRendererHints) as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })
    const stillVoicedFaceMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: createSpeechSegment(stillVoicedFaceRendererHints) as any,
      timelineSegment: createTimelineSegment(stillVoicedFaceRendererHints) as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })

    expect(stillVoicedFaceCue.intensity).toBeLessThan(genericFaceCue.intensity)
    expect(stillVoicedFaceMotionBurst.intensity).toBeLessThan(genericMotionBurst.intensity)
  })

  it('keeps signature-only still-voiced motion-line carry softer even when residentMode is no longer explicitly restrained but the continuity state is still structurally carried', () => {
    const genericRendererHints = {
      residentMode: 'dialogue',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
    } as const
    const stillVoicedMotionRendererHints = {
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['soft-gaze', 'relaxed'],
      preferredMotionAliases: ['idle_settle', 'steady_focus'],
      signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
    } as const

    const genericLipSyncHints = buildAlicizationEmbodimentLipSyncHints({
      segment: createSpeechSegment(genericRendererHints) as any,
      timelineSegment: createTimelineSegment(genericRendererHints) as any,
    })
    const stillVoicedMotionLipSyncHints = buildAlicizationEmbodimentLipSyncHints({
      segment: createSpeechSegment(stillVoicedMotionRendererHints) as any,
      timelineSegment: createTimelineSegment(stillVoicedMotionRendererHints) as any,
    })

    expect(stillVoicedMotionLipSyncHints).toHaveLength(genericLipSyncHints.length)
    for (const genericHint of genericLipSyncHints) {
      const stillVoicedMotionHint = stillVoicedMotionLipSyncHints.find(hint => hint.viseme === genericHint.viseme)
      expect(stillVoicedMotionHint?.weight).toBeLessThan(genericHint.weight)
    }

    const genericFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: createSpeechSegment(genericRendererHints) as any,
      timelineSegment: createTimelineSegment(genericRendererHints) as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })
    const stillVoicedMotionFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: createSpeechSegment(stillVoicedMotionRendererHints) as any,
      timelineSegment: createTimelineSegment(stillVoicedMotionRendererHints) as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })

    const genericMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: createSpeechSegment(genericRendererHints) as any,
      timelineSegment: createTimelineSegment(genericRendererHints) as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })
    const stillVoicedMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: createSpeechSegment(stillVoicedMotionRendererHints) as any,
      timelineSegment: createTimelineSegment(stillVoicedMotionRendererHints) as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })

    expect(stillVoicedMotionFaceCue.intensity).toBeLessThan(genericFaceCue.intensity)
    expect(stillVoicedMotionBurst.intensity).toBeLessThan(genericMotionBurst.intensity)
  })

  it('keeps quieter body+lipsync-only carry softer even when residentMode is no longer explicitly restrained but the continuity state is still structurally carried', () => {
    const genericRendererHints = {
      residentMode: 'dialogue',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
    } as const
    const bodyLipsyncRendererHints = {
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['soft-gaze', 'relaxed'],
      preferredMotionAliases: ['idle_settle', 'steady_focus'],
      reasonTags: ['embodiment:body+lipsync-only'],
    } as const

    const genericFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: createSpeechSegment(genericRendererHints) as any,
      timelineSegment: createTimelineSegment(genericRendererHints) as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })
    const bodyLipsyncFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: createSpeechSegment(bodyLipsyncRendererHints) as any,
      timelineSegment: createTimelineSegment(bodyLipsyncRendererHints) as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })

    const genericMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: createSpeechSegment(genericRendererHints) as any,
      timelineSegment: createTimelineSegment(genericRendererHints) as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })
    const bodyLipsyncMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: createSpeechSegment(bodyLipsyncRendererHints) as any,
      timelineSegment: createTimelineSegment(bodyLipsyncRendererHints) as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })

    expect(bodyLipsyncFaceCue.intensity).toBeLessThan(genericFaceCue.intensity)
    expect(bodyLipsyncMotionBurst.intensity).toBeLessThan(genericMotionBurst.intensity)
  })

  it('keeps quieter face+lipsync-only and motion+lipsync-only carry softer even when residentMode is no longer explicitly restrained but the continuity state is still structurally carried', () => {
    const genericRendererHints = {
      residentMode: 'dialogue',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
    } as const
    const faceLipsyncRendererHints = {
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['soft-gaze', 'relaxed'],
      preferredMotionAliases: ['idle_settle', 'steady_focus'],
      reasonTags: ['lane=face+lipsync-only'],
    } as const
    const motionLipsyncRendererHints = {
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['soft-gaze', 'relaxed'],
      preferredMotionAliases: ['idle_settle', 'steady_focus'],
      reasonTags: ['lane=motion+lipsync-only'],
    } as const

    const genericFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: createSpeechSegment(genericRendererHints) as any,
      timelineSegment: createTimelineSegment(genericRendererHints) as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })
    const faceLipsyncFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: createSpeechSegment(faceLipsyncRendererHints) as any,
      timelineSegment: createTimelineSegment(faceLipsyncRendererHints) as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })
    const motionLipsyncFaceCue = buildAlicizationEmbodimentFaceCue({
      segment: createSpeechSegment(motionLipsyncRendererHints) as any,
      timelineSegment: createTimelineSegment(motionLipsyncRendererHints) as any,
      fallbackEmotion: 'concerned',
      fallbackFacialCue: 'soft-gaze',
      fallbackIntensity: 0.58,
    })

    const genericMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: createSpeechSegment(genericRendererHints) as any,
      timelineSegment: createTimelineSegment(genericRendererHints) as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })
    const faceLipsyncMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: createSpeechSegment(faceLipsyncRendererHints) as any,
      timelineSegment: createTimelineSegment(faceLipsyncRendererHints) as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })
    const motionLipsyncMotionBurst = buildAlicizationEmbodimentMotionBurst({
      segment: createSpeechSegment(motionLipsyncRendererHints) as any,
      timelineSegment: createTimelineSegment(motionLipsyncRendererHints) as any,
      fallbackActionCue: 'observe_focus',
      fallbackIntensity: 0.52,
    })

    expect(faceLipsyncFaceCue.intensity).toBeLessThan(genericFaceCue.intensity)
    expect(faceLipsyncMotionBurst.intensity).toBeLessThan(genericMotionBurst.intensity)
    expect(motionLipsyncFaceCue.intensity).toBeLessThan(genericFaceCue.intensity)
    expect(motionLipsyncMotionBurst.intensity).toBeLessThan(genericMotionBurst.intensity)
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

  it('lets pending same-her embodiment repair pressure quiet face motion and lipsync around one shared body line', () => {
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

    expect(pendingRepairLipSyncHints).toHaveLength(ordinaryLipSyncHints.length)
    for (const ordinaryHint of ordinaryLipSyncHints) {
      const pendingRepairHint = pendingRepairLipSyncHints.find(hint => hint.viseme === ordinaryHint.viseme)
      expect(pendingRepairHint?.weight).toBeLessThan(ordinaryHint.weight)
    }

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

    expect(pendingRepairFaceCue.intensity).toBeLessThan(ordinaryFaceCue.intensity)
    expect(pendingRepairFaceCue.facialCue).toBe('soft-gaze')

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

    expect(pendingRepairMotionBurst.intensity).toBeLessThan(ordinaryMotionBurst.intensity)
    expect(pendingRepairMotionBurst.actionCue).toBe('idle_settle')
  })
})
