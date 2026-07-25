import type { VrmActionBinding } from '../../types/performance'
import type { VrmMotionExecutionCueSnapshot } from './action-playback'

import { createIdleStageEmbodimentPerformanceState } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import {
  buildVrmTransientActionReplayKey,
  createIdleVrmMotionExecutionState,
  createSettledVrmMotionExecutionState,
  resolveCurrentVrmMotionAuthorityCueSnapshot,
  resolveVrmActionFadeDurationSeconds,
  resolveVrmActionFadeInputFromPerformanceState,
  resolveVrmMotionExecutionStateFromBinding,

} from './action-playback'

describe('vrm action playback helpers', () => {
  it('keeps runtime motion execution on the real bound action key and falls back to the settled idle loop cue', () => {
    const binding: VrmActionBinding = {
      id: 'observe-soft-motion',
      fileName: 'observe-soft-motion.vrma',
      actionKey: 'ObserveSoft',
      label: 'Observe Soft',
      description: 'Observe with a softer identity-continuity',
      importedAt: 0,
      source: 'external-vrma',
    }

    const sameHerFollowThroughCue: VrmMotionExecutionCueSnapshot = {
      id: 'segment-observe-soft-1',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
        reasonTags: ['same-her-return'],
        signature: 'same-her-hold:slower-lower-pressure',
      },
      rendererSettle: {
        vrmActionFadeMs: 420,
        vrmExpressionBlendMs: 560,
      },
    }

    expect(createIdleVrmMotionExecutionState()).toEqual({
      cue: null,
      segmentId: null,
      cueSnapshot: null,
    })
    expect(resolveVrmMotionExecutionStateFromBinding(binding, 'segment-observe-soft-1', sameHerFollowThroughCue)).toEqual({
      cue: 'ObserveSoft',
      segmentId: 'segment-observe-soft-1',
      cueSnapshot: sameHerFollowThroughCue,
    })
    expect(createSettledVrmMotionExecutionState()).toEqual({
      cue: 'settle_idle',
      segmentId: null,
      cueSnapshot: null,
    })
  })

  it('keeps transient replay keys identical when only renderer audit fields change', () => {
    const binding: VrmActionBinding = {
      id: 'observe-soft-motion',
      fileName: 'observe-soft-motion.vrma',
      actionKey: 'observe_soft',
      label: 'Observe Soft',
      description: 'Observe with a softer identity-continuity',
      importedAt: 0,
      source: 'external-vrma',
    }

    const neutralKey = buildVrmTransientActionReplayKey({
      binding,
      fadeInput: {
        actionCueSource: 'segment',
        actionIntensity: 0.52,
        fadeDurationSeconds: 0.36,
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        residentMode: 'repair-before-closeness',
        bodySegmentMatched: true,
      },
    })

    const auditedKey = buildVrmTransientActionReplayKey({
      binding,
      fadeInput: {
        actionCueSource: 'segment',
        actionIntensity: 0.52,
        fadeDurationSeconds: 0.36,
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        residentMode: 'repair-before-closeness',
        signature: 'ordinary renderer audit text',
        reasonTags: ['renderer:audit-only'],
        bodySegmentMatched: true,
      },
    })

    const legacySameHerKey = buildVrmTransientActionReplayKey({
      binding,
      fadeInput: {
        actionCueSource: 'segment',
        actionIntensity: 0.52,
        fadeDurationSeconds: 0.36,
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        residentMode: 'repair-before-closeness',
        signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
        reasonTags: ['embodiment:body+voice-only'],
        bodySegmentMatched: true,
      },
    })

    expect(auditedKey).toBe(neutralKey)
    expect(legacySameHerKey).toBe(neutralKey)
  })

  it('builds different transient replay keys when structured driver matching changes', () => {
    const binding: VrmActionBinding = {
      id: 'observe-soft-motion',
      fileName: 'observe-soft-motion.vrma',
      actionKey: 'observe_soft',
      label: 'Observe Soft',
      description: 'Observe with a softer identity-continuity',
      importedAt: 0,
      source: 'external-vrma',
    }
    const buildKey = (bodySegmentMatched: boolean) => buildVrmTransientActionReplayKey({
      binding,
      fadeInput: {
        actionCueSource: 'segment',
        actionIntensity: 0.52,
        fadeDurationSeconds: 0.36,
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        residentMode: 'repair-before-closeness',
        bodySegmentMatched,
      },
    })

    expect(buildKey(false)).not.toBe(buildKey(true))
  })

  it('freezes the current same-her authority cue into vrm motion execution state when the motion actually starts', () => {
    const binding: VrmActionBinding = {
      id: 'observe-soft-motion',
      fileName: 'observe-soft-motion.vrma',
      actionKey: 'ObserveSoft',
      label: 'Observe Soft',
      description: 'Observe with a softer identity-continuity',
      importedAt: 0,
      source: 'external-vrma',
    }
    const state = createIdleStageEmbodimentPerformanceState()
    state.activeCue = {
      id: 'segment-active-cue-older',
      emotion: 'guarded',
      facialCue: 'guarded-look',
      rendererHints: {
        residentMode: 'quiet-companionship',
        preferredExpressionAliases: ['GuardedSoft'],
        preferredMotionAliases: ['GuardedStillness'],
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'steady',
        reasonTags: ['older-cue'],
        signature: 'older-same-her-line',
      },
      rendererSettle: {
        vrmActionFadeMs: 280,
        vrmExpressionBlendMs: 300,
      },
    } as unknown as NonNullable<typeof state.activeCue>
    state.activeSegment = {
      segmentId: 'segment-observe-soft-1',
      cue: {
        id: 'segment-observe-soft-1',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredExpressionAliases: ['RecoverSoft'],
          preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredPauseMode: 'longer',
          preferredLipsyncMode: 'restrained',
          preferredVoiceMode: 'lower-pressure',
          preferredPacingMode: 'slower',
          reasonTags: ['same-her-return'],
          signature: 'same-her-hold:slower-lower-pressure',
        },
        rendererSettle: {
          vrmActionFadeMs: 420,
          vrmExpressionBlendMs: 560,
        },
      },
    } as unknown as NonNullable<typeof state.activeSegment>

    const executionState = resolveVrmMotionExecutionStateFromBinding(
      binding,
      'segment-observe-soft-1',
      resolveCurrentVrmMotionAuthorityCueSnapshot(state),
    )

    expect(executionState).toEqual({
      cue: 'ObserveSoft',
      segmentId: 'segment-observe-soft-1',
      cueSnapshot: {
        id: 'segment-observe-soft-1',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredExpressionAliases: ['RecoverSoft'],
          preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredPauseMode: 'longer',
          preferredLipsyncMode: 'restrained',
          preferredVoiceMode: 'lower-pressure',
          preferredPacingMode: 'slower',
          reasonTags: ['same-her-return'],
          signature: 'same-her-hold:slower-lower-pressure',
        },
        rendererSettle: {
          vrmActionFadeMs: 420,
          vrmExpressionBlendMs: 560,
        },
      },
    })

    state.activeSegment = null
    state.activeCue = null

    expect(executionState.cueSnapshot).toEqual({
      id: 'segment-observe-soft-1',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      rendererHints: {
        residentMode: 'repair-before-closeness',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
        reasonTags: ['same-her-return'],
        signature: 'same-her-hold:slower-lower-pressure',
      },
      rendererSettle: {
        vrmActionFadeMs: 420,
        vrmExpressionBlendMs: 560,
      },
    })
  })

  it('resolves fade input from performance state with same-her renderer hints and body continuity authority intact', () => {
    const neutralState = createIdleStageEmbodimentPerformanceState()
    neutralState.activeActionCueSource = 'segment'
    neutralState.actionIntensity = 0.52
    neutralState.activeCue = {
      rendererHints: {
        residentMode: 'same-thread-continuation',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      },
    } as unknown as NonNullable<typeof neutralState.activeCue>

    const matchedSameHerState = createIdleStageEmbodimentPerformanceState()
    matchedSameHerState.activeActionCueSource = 'segment'
    matchedSameHerState.actionIntensity = 0.52
    matchedSameHerState.driverAuthority = {
      segmentId: 'segment-same-her-motion',
      rendererTarget: 'vrm',
      matchedDrivers: ['body', 'motion'],
      sources: ['segment'],
      bodySegmentMatched: true,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
      prosodyAuthority: null,
    }
    matchedSameHerState.activeCue = {
      rendererHints: {
        residentMode: 'same-thread-continuation',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
        reasonTags: ['embodiment:body+voice-only'],
      },
    } as unknown as NonNullable<typeof matchedSameHerState.activeCue>

    const rendererOnlySameHerState = createIdleStageEmbodimentPerformanceState()
    rendererOnlySameHerState.activeActionCueSource = 'segment'
    rendererOnlySameHerState.actionIntensity = 0.52
    rendererOnlySameHerState.driverAuthority = {
      segmentId: 'segment-same-her-motion',
      rendererTarget: 'vrm',
      matchedDrivers: ['motion'],
      sources: ['segment'],
      bodySegmentMatched: false,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
      prosodyAuthority: null,
    }
    rendererOnlySameHerState.activeCue = {
      rendererHints: {
        residentMode: 'same-thread-continuation',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
        reasonTags: ['embodiment:body+voice-only'],
      },
    } as unknown as NonNullable<typeof rendererOnlySameHerState.activeCue>

    const neutralFade = resolveVrmActionFadeDurationSeconds(
      resolveVrmActionFadeInputFromPerformanceState({
        state: neutralState,
        fadeDurationSeconds: 0.36,
      }),
    )
    const matchedSameHerFade = resolveVrmActionFadeDurationSeconds(
      resolveVrmActionFadeInputFromPerformanceState({
        state: matchedSameHerState,
        fadeDurationSeconds: 0.36,
      }),
    )
    const rendererOnlySameHerFade = resolveVrmActionFadeDurationSeconds(
      resolveVrmActionFadeInputFromPerformanceState({
        state: rendererOnlySameHerState,
        fadeDurationSeconds: 0.36,
      }),
    )

    expect(matchedSameHerFade).toBeGreaterThan(neutralFade)
    expect(rendererOnlySameHerFade).toBeGreaterThan(matchedSameHerFade)
  })

  it('shortens action fade for stronger segment-grade action intensity', () => {
    const residentFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'resident',
      actionIntensity: 0.18,
      fadeDurationSeconds: 0.36,
    })

    const segmentFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.88,
      fadeDurationSeconds: 0.36,
    })

    expect(segmentFade).toBeLessThan(residentFade)
  })

  it('keeps the default fade duration when action intensity is absent', () => {
    expect(resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'preview',
      actionIntensity: null,
      fadeDurationSeconds: 0.36,
    })).toBeCloseTo(0.36, 2)
  })

  it('keeps restrained companionship resident modes softer by lengthening VRM action fade', () => {
    const measuredReturnFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'measured-return',
    })

    const repairFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'repair-before-closeness',
    })

    const neutralFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'dialogue',
    })

    expect(measuredReturnFade).toBeGreaterThan(neutralFade)
    expect(repairFade).toBeGreaterThan(measuredReturnFade)
  })

  it('keeps durable softened measured-return fades slower than ordinary measured-return while preserving repair-first as the most restrained tier', () => {
    const ordinaryMeasuredReturnFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'measured-return',
      preferredGazeMode: 'drift',
      preferredBlinkCadence: 'normal',
    })

    const durableMeasuredReturnFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'measured-return',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
    })

    const repairFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'repair-before-closeness',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
    })

    expect(durableMeasuredReturnFade).toBeGreaterThan(ordinaryMeasuredReturnFade)
    expect(repairFade).toBeGreaterThan(durableMeasuredReturnFade)
  })

  it('still applies resident companionship restraint even when action intensity is unavailable', () => {
    const quietCompanionshipFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'resident',
      actionIntensity: null,
      fadeDurationSeconds: 0.36,
      residentMode: 'quiet-companionship',
    })

    expect(quietCompanionshipFade).toBeGreaterThan(0.36)
  })

  it('keeps repair-before-closeness segment fades guarded when renderer continuity has returned before body authority does', () => {
    const fullyMatchedFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'repair-before-closeness',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      bodySegmentMatched: true,
    })

    const rendererOnlyFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'repair-before-closeness',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      bodySegmentMatched: false,
    })

    expect(rendererOnlyFade).toBeGreaterThan(fullyMatchedFade)
  })

  it('keeps same-her audible-return measured-return fades slower than ordinary measured-return and still keeps repair-before-closeness on the restrained companionship tier', () => {
    const ordinaryMeasuredReturnFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'measured-return',
      preferredGazeMode: 'steady',
      preferredBlinkCadence: 'normal',
    })

    const audibleSameHerMeasuredReturnFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'measured-return',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      signature: 'embodiment:audible-same-her-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    })

    const audibleSameHerRepairFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'repair-before-closeness',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'quiet',
      signature: 'embodiment:audible-same-her-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    })

    expect(audibleSameHerMeasuredReturnFade).toBeGreaterThan(ordinaryMeasuredReturnFade)
    expect(audibleSameHerRepairFade).toBeGreaterThan(ordinaryMeasuredReturnFade)
  })

  it('keeps renderer-only same-her audible-return rejoin fades more guarded than fully matched fades on the same VRM callback line', () => {
    const fullyMatchedFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'measured-return',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      signature: 'embodiment:audible-same-her-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      bodySegmentMatched: true,
    })

    const rendererOnlyFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'measured-return',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      signature: 'embodiment:audible-same-her-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      bodySegmentMatched: false,
    })

    expect(rendererOnlyFade).toBeGreaterThan(fullyMatchedFade)
  })

  it('keeps repair-before-closeness body+voice-only fades more guarded than an otherwise equally softened repair-first line', () => {
    const softenedRepairFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'repair-before-closeness',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      bodySegmentMatched: true,
    })

    const sameHerBodyVoiceRepairFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'repair-before-closeness',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
      reasonTags: ['embodiment:body+voice-only'],
      bodySegmentMatched: true,
    })

    const rendererOnlySameHerBodyVoiceRepairFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'repair-before-closeness',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
      reasonTags: ['embodiment:body+voice-only'],
      bodySegmentMatched: false,
    })

    expect(sameHerBodyVoiceRepairFade).toBeGreaterThan(softenedRepairFade)
    expect(rendererOnlySameHerBodyVoiceRepairFade).toBeGreaterThan(sameHerBodyVoiceRepairFade)
  })

  it('keeps same-her audible-return fades guarded even after residentMode relaxes into same-thread-continuation', () => {
    const neutralFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      bodySegmentMatched: true,
    })

    const audibleSameHerFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      signature: 'embodiment:audible-same-her-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      bodySegmentMatched: true,
    })

    const rendererOnlyAudibleSameHerFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      signature: 'embodiment:audible-same-her-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      bodySegmentMatched: false,
    })

    expect(audibleSameHerFade).toBeGreaterThan(neutralFade)
    expect(rendererOnlyAudibleSameHerFade).toBeGreaterThan(audibleSameHerFade)
  })

  it('treats coordinator same-her audible carry hints as guarded fades even before full body+lipsync+voice rejoin returns', () => {
    const neutralFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      bodySegmentMatched: true,
    })

    const coordinatorAudibleCarryFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      signature: 'embodiment:audible_same_her_line',
      reasonTags: ['embodiment:body+voice-only'],
      bodySegmentMatched: true,
    })

    const rendererOnlyCoordinatorAudibleCarryFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      signature: 'embodiment:audible_same_her_line',
      reasonTags: ['embodiment:body+voice-only'],
      bodySegmentMatched: false,
    })

    expect(coordinatorAudibleCarryFade).toBeGreaterThan(neutralFade)
    expect(rendererOnlyCoordinatorAudibleCarryFade).toBeGreaterThan(coordinatorAudibleCarryFade)
  })

  it('keeps same-thread still-voiced motion-line fades more guarded than an otherwise equally softened same-thread continuation', () => {
    const softenedSameThreadFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      bodySegmentMatched: true,
    })

    const stillVoicedMotionFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      reasonTags: ['embodiment:still-voiced-motion-line'],
      bodySegmentMatched: true,
    })

    const rendererOnlyStillVoicedMotionFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      reasonTags: ['embodiment:still-voiced-motion-line'],
      bodySegmentMatched: false,
    })

    expect(stillVoicedMotionFade).toBeGreaterThan(softenedSameThreadFade)
    expect(rendererOnlyStillVoicedMotionFade).toBeGreaterThan(stillVoicedMotionFade)
  })

  it.each([
    'embodiment:body+lipsync-only',
    'embodiment:lipsync+voice-only',
  ])('keeps quieter same-her fades more guarded than an otherwise equally softened same-thread continuation when continuity survives through %s', (reasonTag) => {
    const softenedSameThreadFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      bodySegmentMatched: true,
    })

    const quieterSameHerFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      reasonTags: [reasonTag],
      bodySegmentMatched: true,
    })

    const rendererOnlyQuieterSameHerFade = resolveVrmActionFadeDurationSeconds({
      actionCueSource: 'segment',
      actionIntensity: 0.52,
      fadeDurationSeconds: 0.36,
      residentMode: 'same-thread-continuation',
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      reasonTags: [reasonTag],
      bodySegmentMatched: false,
    })

    expect(quieterSameHerFade).toBeGreaterThan(softenedSameThreadFade)
    expect(rendererOnlyQuieterSameHerFade).toBeGreaterThan(quieterSameHerFade)
  })
})
