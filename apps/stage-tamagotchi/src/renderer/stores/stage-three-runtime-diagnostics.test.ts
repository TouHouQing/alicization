import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'

import {
  applyHitTestTracePayload,
  applySnapshotRecord,
  applyThreeRenderTracePayload,
  applyVrmUpdateTracePayload,
  createDefaultStageHitTestDiagnostics,
  createDefaultStageResourceSnapshotDiagnostics,
  createDefaultStageSpeechEmbodimentDiagnostics,
  createDefaultStageThreeRenderDiagnostics,
  createDefaultStageVrmUpdateDiagnostics,
  pushTraceHistory,
  TRACE_HISTORY_LIMIT,
  useStageThreeRuntimeDiagnosticsStore,
} from './stage-three-runtime-diagnostics'

describe('stage three runtime diagnostics helpers', () => {
  setActivePinia(createPinia())

  it('aggregates three render payloads', () => {
    const next = applyThreeRenderTracePayload(createDefaultStageThreeRenderDiagnostics(), {
      drawCalls: 12,
      geometries: 8,
      lines: 3,
      points: 2,
      textures: 5,
      triangles: 144,
      ts: 10,
    })

    expect(next.renderCount).toBe(1)
    expect(next.drawCalls).toBe(12)
    expect(next.points).toBe(2)
    expect(next.lines).toBe(3)
    expect(next.triangles).toBe(144)
  })

  it('aggregates vrm update and hit-test payloads', () => {
    const vrmUpdate = applyVrmUpdateTracePayload(createDefaultStageVrmUpdateDiagnostics(), {
      activeActionCue: 'observe_focus',
      activeActionCueSource: 'segment',
      activeCuePreferredExpressionAliases: ['CalmInspect'],
      activeCuePreferredMotionAliases: ['ObserveSoft'],
      activeCueVrmActionFadeMs: 220,
      activeCueVrmExpressionBlendMs: 260,
      activeFacialCue: 'focused',
      activeFacialCueSource: 'segment',
      animationMixerMs: 1,
      actionIntensity: 0.44,
      blinkAndSaccadeMs: 2,
      bodyActive: true,
      deltaMs: 16.7,
      durationMs: 9.5,
      emoteMs: 3,
      embodimentSegmentAligned: false,
      embodimentSegmentMismatchDrivers: ['lipsync', 'voice'],
      expressionIntensity: 0.62,
      expressionMs: 4,
      faceActive: true,
      facialCueIntensity: 0.58,
      humanoidMs: 5,
      lipSyncMs: 6,
      lipsyncActive: true,
      lookAtMs: 7,
      motionActive: true,
      performanceSegmentId: 'segment-current-line',
      springBoneMs: 8,
      speechSegmentId: 'segment-stale-voice-line',
      ts: 20,
      visemeIntensity: 0.4,
      voiceActive: true,
      vrmFrameHookMs: 9,
    })

    const hitTest = applyHitTestTracePayload(createDefaultStageHitTestDiagnostics(), {
      durationMs: 4.5,
      radius: 25,
      readHeight: 20,
      readWidth: 30,
      ts: 30,
    })

    expect(vrmUpdate.frameCount).toBe(1)
    expect(vrmUpdate.totalMs).toBe(9.5)
    expect(vrmUpdate.springBoneMs).toBe(8)
    expect(vrmUpdate.lastConsumedExpressionAliases).toEqual(['CalmInspect'])
    expect(vrmUpdate.lastConsumedMotionAliases).toEqual(['ObserveSoft'])
    expect(vrmUpdate.lastConsumedVrmActionFadeMs).toBe(220)
    expect(vrmUpdate.lastConsumedVrmExpressionBlendMs).toBe(260)
    expect(vrmUpdate.performanceSegmentId).toBe('segment-current-line')
    expect(vrmUpdate.speechSegmentId).toBe('segment-stale-voice-line')
    expect(vrmUpdate.embodimentSegmentAligned).toBe(false)
    expect(vrmUpdate.embodimentSegmentMismatchDrivers).toEqual(['lipsync', 'voice'])
    expect(vrmUpdate.sameHerFrameSummary).toBe(
      'drift | performance=segment-current-line | speech=segment-stale-voice-line | active=body, face, motion, lipsync, voice | mismatch=lipsync, voice | lane=body+face+motion-only | remaining-open=lipsync+voice',
    )
    expect(vrmUpdate.voiceActive).toBe(true)
    expect(vrmUpdate.lipsyncActive).toBe(true)
    expect(vrmUpdate.faceActive).toBe(true)
    expect(vrmUpdate.motionActive).toBe(true)
    expect(vrmUpdate.bodyActive).toBe(true)
    expect(hitTest.readCount).toBe(1)
    expect(hitTest.totalDurationMs).toBe(4.5)
    expect(hitTest.lastReadWidth).toBe(30)
  })

  it('clears vrm same-her segment evidence when the next frame is idle', () => {
    const speaking = applyVrmUpdateTracePayload(createDefaultStageVrmUpdateDiagnostics(), {
      animationMixerMs: 1,
      blinkAndSaccadeMs: 2,
      bodyActive: true,
      deltaMs: 16.7,
      durationMs: 9.5,
      embodimentSegmentAligned: true,
      embodimentSegmentMismatchDrivers: [],
      emoteMs: 3,
      expressionMs: 4,
      faceActive: true,
      humanoidMs: 5,
      lipSyncMs: 6,
      lipsyncActive: true,
      lookAtMs: 7,
      motionActive: true,
      performanceSegmentId: 'segment-current-line',
      springBoneMs: 8,
      speechSegmentId: 'segment-current-line',
      ts: 20,
      voiceActive: true,
      vrmFrameHookMs: 9,
    })

    expect(speaking.sameHerFrameSummary).toBe(
      'aligned | segment=segment-current-line | active=body, face, motion, lipsync, voice | closure=full-cross-modal-lock | lane=full-driver-rejoin | remaining-open=none',
    )

    const idle = applyVrmUpdateTracePayload(speaking, {
      animationMixerMs: 1,
      blinkAndSaccadeMs: 2,
      bodyActive: false,
      deltaMs: 16.7,
      durationMs: 9.5,
      embodimentSegmentAligned: null,
      embodimentSegmentMismatchDrivers: [],
      emoteMs: 3,
      expressionMs: 4,
      faceActive: false,
      humanoidMs: 5,
      lipSyncMs: 6,
      lipsyncActive: false,
      lookAtMs: 7,
      motionActive: false,
      performanceSegmentId: null,
      springBoneMs: 8,
      speechSegmentId: null,
      ts: 36,
      voiceActive: false,
      vrmFrameHookMs: 9,
    })

    expect(idle.performanceSegmentId).toBeNull()
    expect(idle.speechSegmentId).toBeNull()
    expect(idle.embodimentSegmentAligned).toBeNull()
    expect(idle.sameHerFrameSummary).toBeNull()
    expect(idle.embodimentSegmentMismatchDrivers).toEqual([])
    expect(idle.voiceActive).toBe(false)
    expect(idle.lipsyncActive).toBe(false)
    expect(idle.faceActive).toBe(false)
    expect(idle.motionActive).toBe(false)
    expect(idle.bodyActive).toBe(false)
  })

  it('keeps partial body-led same-her closure explicit when voice and lipsync have not rejoined yet', () => {
    const partial = applyVrmUpdateTracePayload(createDefaultStageVrmUpdateDiagnostics(), {
      animationMixerMs: 1,
      blinkAndSaccadeMs: 2,
      bodyActive: true,
      deltaMs: 16.7,
      durationMs: 9.5,
      embodimentSegmentAligned: true,
      embodimentSegmentMismatchDrivers: [],
      emoteMs: 3,
      expressionMs: 4,
      faceActive: true,
      humanoidMs: 5,
      lipSyncMs: 6,
      lipsyncActive: false,
      lookAtMs: 7,
      motionActive: true,
      performanceSegmentId: 'segment-body-face-motion-line',
      springBoneMs: 8,
      speechSegmentId: null,
      ts: 44,
      voiceActive: false,
      vrmFrameHookMs: 9,
    })

    expect(partial.embodimentSegmentAligned).toBe(true)
    expect(partial.sameHerFrameSummary).toBe(
      'aligned | segment=segment-body-face-motion-line | active=body, face, motion | lane=body+face+motion-only | remaining-open=lipsync+voice',
    )
  })

  it('keeps resource snapshot history bounded', () => {
    let history: ReturnType<typeof createDefaultStageResourceSnapshotDiagnostics>['history'] = []
    for (let index = 0; index < TRACE_HISTORY_LIMIT + 4; index += 1) {
      history = pushTraceHistory(history, {
        phase: 'after-load',
        ts: index,
      })
    }

    expect(history).toHaveLength(TRACE_HISTORY_LIMIT)
    expect(history[0]?.ts).toBe(4)

    const snapshots = applySnapshotRecord(createDefaultStageResourceSnapshotDiagnostics(), {
      phase: 'before-dispose',
      ts: 99,
    })

    expect(snapshots.lastBeforeDispose?.ts).toBe(99)
    expect(snapshots.history).toHaveLength(1)
  })

  it('creates an empty speech embodiment diagnostics snapshot for renderer devtools', () => {
    expect(createDefaultStageSpeechEmbodimentDiagnostics()).toEqual({
      phase: 'idle',
      playbackPhase: 'idle',
      speechEnergy: 0,
      prosodyIntensity: 0,
      emphasisLevel: 0,
      cadencePulse: 0,
      visemeIntensity: 0,
      articulation: null,
      runtimeDynamics: null,
      recentDrivingEvent: null,
      recentDrivingTraceRecord: null,
      recentDrivingTraceEvents: [],
      recentDrivingTraceDetails: [],
      traceSummary: null,
      driverSummary: null,
      live2dExecution: null,
      rendererAlignment: {
        live2d: null,
        vrm: null,
      },
      rendererDriftSummary: null,
      articulationSummary: null,
      authoritySummary: null,
      convergence: null,
      speechEvidence: null,
      cueMicroSummary: null,
      driverExecutionSummary: null,
      visemeHintsSummary: null,
      playbackTelemetry: null,
    })
  })

  it('stores speech embodiment diagnostics snapshots for renderer devtools consumption', () => {
    const store = useStageThreeRuntimeDiagnosticsStore()

    store.setSpeechEmbodiment({
      phase: 'playing',
      playbackPhase: 'playing',
      speechEnergy: 0.44,
      prosodyIntensity: 0.52,
      emphasisLevel: 0.38,
      cadencePulse: 0.22,
      visemeIntensity: 0.4,
      articulation: {
        active: true,
        progress: 0.42,
        openness: 0.36,
        jawOpen: 0.28,
        lipClosure: 0.44,
        lipSpread: 0.18,
        lipRound: 0.12,
        visemes: {
          A: 0.66,
          E: 0.24,
          I: 0.18,
          O: 0.08,
          U: 0.12,
          closed: 0.41,
        },
        voice: {
          provider: 'test',
          model: null,
          voiceId: 'crisp-zh',
          voiceName: null,
          language: 'zh-CN',
          gender: null,
          rateMultiplier: 1,
          pitchDelta: 0,
          closureBias: 0.84,
          roundBias: 0.1,
          spreadBias: 0.1,
          jawBias: 0.12,
          consonantPrecision: 0.9,
          vowelLegato: 0.3,
        },
      },
      runtimeDynamics: {
        profile: 'protective-watch',
        variationToken: 'presence-pulse|protective-watch',
        residentEmotion: 'tired',
        residentDelivery: 'gentle',
        residentFacialCue: 'soft-gaze',
        residentActionCue: 'comfort_sway',
        actionIntensity: 0.1,
        breathDrive: 0.2,
        focusDrive: 0.3,
        provenance: {
          watchMode: 'recovering',
          bodyState: 'settled',
          continuityMode: 'ambient-covision',
          thoughtStance: 'care',
          thoughtShouldSpeak: false,
          thoughtTension: 'focused-flow',
          runtimeChannel: 'active-dialogue',
          runtimeSummary: 'runtime alignment held',
          activeThreadId: 'runtime-thread-rest-1',
          activeThreadTitle: 'late-night care',
          preferredPresence: 'gentle-watch',
          selectedAction: 'comfort_sway',
          personaBiasSummary: 'protective-watch favored due to late-night care pressure',
          personaOpeningGuidance: 'Open gently, but keep the opening bounded and real.',
          scene: 'coding',
          scenario: 'coding',
        },
        eventPointers: {
          recentTransition: {
            fromWatchMode: 'symbiotic-vision',
            toWatchMode: 'recovering',
            fromScenario: 'chat',
            durationMs: 90_000,
            reason: 'host fatigue detected during late-night care',
            occurredAt: 1_234,
          },
          rationaleTags: ['recovering', 'late-night-fatigue'],
          focusBeliefId: 'belief-rest-1',
          focusInquiryId: null,
          commitmentId: 'commitment-rest-1',
          runtimeThreadId: 'runtime-thread-rest-1',
          governorDrive: 'protect',
          governorIntentionId: 'governor-intention-rest-1',
          selectedThoughtThreadId: 'thought-thread-rest-1',
        },
      },
      recentDrivingEvent: {
        kind: 'person-state-updated',
        decisionTraceId: 'mind:rest:1',
        summary: 'protective-watch settled after fatigue pressure rose',
        createdAt: 2_468,
      },
      recentDrivingTraceRecord: {
        decisionTraceId: 'mind:rest:1',
        activeThreadId: 'runtime-thread-rest-1',
        turnMode: 'care',
        truthState: 'live-grounded',
        repairState: 'none',
        finalSurfacePolicy: 'procedural-carry',
        closureState: 'grounded-recall',
        suppressionTags: ['late-night-fatigue'],
      },
      recentDrivingTraceEvents: [
        {
          kind: 'governance-normalized',
          summary: 'turn=care | truth=live-grounded | repair=none',
          createdAt: 2_430,
        },
        {
          kind: 'presence-pulse-dispatched',
          summary: 'protective watch dispatched',
          createdAt: 2_450,
        },
        {
          kind: 'person-state-updated',
          summary: 'protective-watch settled after fatigue pressure rose',
          createdAt: 2_468,
        },
      ],
      recentDrivingTraceDetails: [],
      traceSummary: {
        decisionTraceId: 'mind:rest:1',
        turnMode: 'care',
        truthState: 'live-grounded',
        repairState: 'none',
        finalSurfacePolicy: 'procedural-carry',
        closureState: 'grounded-recall',
        activeThreadId: 'runtime-thread-rest-1',
        suppressionTags: ['late-night-fatigue'],
        latestEventSummary: 'protective-watch settled after fatigue pressure rose',
        segmentBinding: {
          matched: true,
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          matchedSources: ['prosody-authority', 'timeline-projection'],
        },
      },
      rendererAlignment: {
        live2d: {
          predicted: 'CalmInspect',
          actual: 'CalmInspect',
          reason: 'preferred',
          status: 'aligned',
          driftKind: 'aligned',
          faceDriverCue: 'focused',
          faceDriverSource: 'prosody-authority',
          motionDriverCue: 'observe_focus',
          motionDriverSource: 'timeline-projection',
        },
        vrm: {
          predicted: 'calm',
          actual: 'calm',
          reason: 'preferred',
          status: 'aligned',
          driftKind: 'aligned',
          faceDriverCue: null,
          faceDriverSource: null,
          motionDriverCue: null,
          motionDriverSource: null,
        },
      },
      rendererDriftSummary: null,
      articulationSummary: {
        voice: 'zh-CN | closure=0.84 | precision=0.90',
        topVisemes: 'A:0.66, closed:0.41, E:0.24',
      },
      authoritySummary: {
        cueId: 'segment-vrm-1',
        segmentId: 'segment-vrm-1',
        rendererTarget: 'vrm',
        matchedDrivers: ['face', 'motion', 'lipsync'],
        matchedSources: ['prosody-authority', 'timeline-projection'],
        bindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
        matchSummary: 'face:yes motion:yes lipsync:yes',
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        settleSummary: 'segment=segment-vrm-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
      },
      convergence: null,
      speechEvidence: {
        voiceSummary: 'zh-CN | closure=0.84 | precision=0.90',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        topVisemeSummary: 'A:0.66, closed:0.41, E:0.24',
        cueSummary: 'focused / observe_focus | prosody=0.36 mouth=0.28 head=0.32',
        cueIdentityPresent: true,
        cueProsodyPresent: true,
        personaStyleSummary: 'observe-first | prosody=-0.07 beat=-0.06 mouth=-0.04 head=+0.08',
        timingSummary: 'facial=320 action=240 emotion=360 | segment-start | soft-interrupt | hold',
        driverExecutionSummary: 'face=thinking/focused@0.52 hold=320 pre=steady-inhale post=soft-release src=prosody-authority conf=0.94 | motion=observe_focus mode=attentive idle=idle_settle@0.34 hold=240 src=timeline-projection conf=0.88 | lipsync=energy-phoneme-hybrid phase=playing',
        visemeHintsSummary: 'I:0.35@0.94 | closed:0.75@0.89',
      },
      cueMicroSummary: {
        cueId: 'segment-vrm-1',
        cueText: '继续看这里。',
        cue: 'focused / observe_focus | prosody=0.36 mouth=0.28 head=0.32',
        personaStyle: null,
        timing: 'facial=320 action=240 emotion=360 | segment-start | soft-interrupt | hold',
      },
      driverSummary: {
        rendererTarget: 'vrm',
        face: {
          cue: 'focused',
          source: 'prosody-authority',
          confidence: 0.94,
          segmentId: 'segment-vrm-1',
        },
        motion: null,
        lipsync: null,
      },
      driverExecutionSummary: 'face=thinking/focused@0.52 hold=320 pre=steady-inhale post=soft-release src=prosody-authority conf=0.94 | motion=observe_focus mode=attentive idle=idle_settle@0.34 hold=240 src=timeline-projection conf=0.88 | lipsync=energy-phoneme-hybrid phase=playing',
      live2dExecution: {
        activeExpression: {
          name: 'CalmInspect',
          reason: 'preferred',
          score: 11.4,
          segmentId: 'segment-vrm-1',
        },
        activeMotion: {
          group: 'ObserveSoft',
          index: 1,
          segmentId: 'segment-vrm-1',
        },
        cue: {
          emotion: 'thinking',
          facialCue: 'focus',
          preferredExpressionAliases: ['CalmInspect'],
          live2dFacialReleaseMs: 320,
          live2dMotionFollowThroughMs: 440,
        },
      },
      visemeHintsSummary: 'I:0.35@0.94 | closed:0.75@0.89',
      playbackTelemetry: {
        actualDurationMs: 220,
        plannedDurationMs: 220,
        driftMs: 0,
        settleMs: 220,
        stopReason: null,
        rendererTarget: 'vrm',
        driverAuthority: {
          segmentId: 'segment-vrm-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          sources: ['prosody-authority', 'timeline-projection'],
          faceSegmentMatched: true,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: true,
        },
        cue: {
          id: 'segment-vrm-1',
          text: '继续看这里。',
          prosodyWeight: 0.36,
          mouthWeight: 0.28,
          headWeight: 0.32,
          facialHoldMs: 320,
          actionHoldMs: 240,
          emotionHoldMs: 360,
          facialCue: 'focused',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: 'hold',
          rendererHints: {
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
          },
          rendererSettle: {
            live2dFacialReleaseMs: 320,
            live2dMotionFollowThroughMs: 440,
            vrmActionFadeMs: 280,
            vrmExpressionBlendMs: 360,
          },
        },
        drivers: {
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.52,
            holdMs: 320,
            source: 'prosody-authority',
            confidence: 0.94,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            segmentId: 'segment-vrm-1',
          },
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-vrm-1',
            continuityHoldMs: 320,
            visemeHints: [
              { segmentId: 'segment-vrm-1', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
              { segmentId: 'segment-vrm-1', viseme: 'closed', weight: 0.75, source: 'prosody-authority', confidence: 0.89 },
            ],
          },
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'observe_focus',
            intensity: 0.34,
            holdMs: 240,
            source: 'timeline-projection',
            confidence: 0.88,
            segmentId: 'segment-vrm-1',
          },
        },
      },
    })

    expect(store.speechEmbodiment).toEqual({
      phase: 'playing',
      playbackPhase: 'playing',
      speechEnergy: 0.44,
      prosodyIntensity: 0.52,
      emphasisLevel: 0.38,
      cadencePulse: 0.22,
      visemeIntensity: 0.4,
      articulation: {
        active: true,
        progress: 0.42,
        openness: 0.36,
        jawOpen: 0.28,
        lipClosure: 0.44,
        lipSpread: 0.18,
        lipRound: 0.12,
        visemes: {
          A: 0.66,
          E: 0.24,
          I: 0.18,
          O: 0.08,
          U: 0.12,
          closed: 0.41,
        },
        voice: {
          provider: 'test',
          model: null,
          voiceId: 'crisp-zh',
          voiceName: null,
          language: 'zh-CN',
          gender: null,
          rateMultiplier: 1,
          pitchDelta: 0,
          closureBias: 0.84,
          roundBias: 0.1,
          spreadBias: 0.1,
          jawBias: 0.12,
          consonantPrecision: 0.9,
          vowelLegato: 0.3,
        },
      },
      runtimeDynamics: {
        profile: 'protective-watch',
        variationToken: 'presence-pulse|protective-watch',
        residentEmotion: 'tired',
        residentDelivery: 'gentle',
        residentFacialCue: 'soft-gaze',
        residentActionCue: 'comfort_sway',
        actionIntensity: 0.1,
        breathDrive: 0.2,
        focusDrive: 0.3,
        provenance: {
          watchMode: 'recovering',
          bodyState: 'settled',
          continuityMode: 'ambient-covision',
          thoughtStance: 'care',
          thoughtShouldSpeak: false,
          thoughtTension: 'focused-flow',
          runtimeChannel: 'active-dialogue',
          runtimeSummary: 'runtime alignment held',
          activeThreadId: 'runtime-thread-rest-1',
          activeThreadTitle: 'late-night care',
          preferredPresence: 'gentle-watch',
          selectedAction: 'comfort_sway',
          personaBiasSummary: 'protective-watch favored due to late-night care pressure',
          personaOpeningGuidance: 'Open gently, but keep the opening bounded and real.',
          scene: 'coding',
          scenario: 'coding',
        },
        eventPointers: {
          recentTransition: {
            fromWatchMode: 'symbiotic-vision',
            toWatchMode: 'recovering',
            fromScenario: 'chat',
            durationMs: 90_000,
            reason: 'host fatigue detected during late-night care',
            occurredAt: 1_234,
          },
          rationaleTags: ['recovering', 'late-night-fatigue'],
          focusBeliefId: 'belief-rest-1',
          focusInquiryId: null,
          commitmentId: 'commitment-rest-1',
          runtimeThreadId: 'runtime-thread-rest-1',
          governorDrive: 'protect',
          governorIntentionId: 'governor-intention-rest-1',
          selectedThoughtThreadId: 'thought-thread-rest-1',
        },
      },
      recentDrivingEvent: {
        kind: 'person-state-updated',
        decisionTraceId: 'mind:rest:1',
        summary: 'protective-watch settled after fatigue pressure rose',
        createdAt: 2_468,
      },
      recentDrivingTraceRecord: {
        decisionTraceId: 'mind:rest:1',
        activeThreadId: 'runtime-thread-rest-1',
        turnMode: 'care',
        truthState: 'live-grounded',
        repairState: 'none',
        finalSurfacePolicy: 'procedural-carry',
        closureState: 'grounded-recall',
        suppressionTags: ['late-night-fatigue'],
      },
      recentDrivingTraceEvents: [
        {
          kind: 'governance-normalized',
          summary: 'turn=care | truth=live-grounded | repair=none',
          createdAt: 2_430,
        },
        {
          kind: 'presence-pulse-dispatched',
          summary: 'protective watch dispatched',
          createdAt: 2_450,
        },
        {
          kind: 'person-state-updated',
          summary: 'protective-watch settled after fatigue pressure rose',
          createdAt: 2_468,
        },
      ],
      recentDrivingTraceDetails: [],
      traceSummary: {
        decisionTraceId: 'mind:rest:1',
        turnMode: 'care',
        truthState: 'live-grounded',
        repairState: 'none',
        finalSurfacePolicy: 'procedural-carry',
        closureState: 'grounded-recall',
        activeThreadId: 'runtime-thread-rest-1',
        suppressionTags: ['late-night-fatigue'],
        latestEventSummary: 'protective-watch settled after fatigue pressure rose',
        segmentBinding: {
          matched: true,
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          matchedSources: ['prosody-authority', 'timeline-projection'],
        },
      },
      rendererAlignment: {
        live2d: {
          predicted: 'CalmInspect',
          actual: 'CalmInspect',
          reason: 'preferred',
          status: 'aligned',
          driftKind: 'aligned',
          faceDriverCue: 'focused',
          faceDriverSource: 'prosody-authority',
          motionDriverCue: 'observe_focus',
          motionDriverSource: 'timeline-projection',
        },
        vrm: {
          predicted: 'calm',
          actual: 'calm',
          reason: 'preferred',
          status: 'aligned',
          driftKind: 'aligned',
          faceDriverCue: null,
          faceDriverSource: null,
          motionDriverCue: null,
          motionDriverSource: null,
        },
      },
      rendererDriftSummary: null,
      articulationSummary: {
        voice: 'zh-CN | closure=0.84 | precision=0.90',
        topVisemes: 'A:0.66, closed:0.41, E:0.24',
      },
      authoritySummary: {
        cueId: 'segment-vrm-1',
        segmentId: 'segment-vrm-1',
        rendererTarget: 'vrm',
        matchedDrivers: ['face', 'motion', 'lipsync'],
        matchedSources: ['prosody-authority', 'timeline-projection'],
        bindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
        matchSummary: 'face:yes motion:yes lipsync:yes',
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        settleSummary: 'segment=segment-vrm-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
      },
      convergence: null,
      speechEvidence: {
        voiceSummary: 'zh-CN | closure=0.84 | precision=0.90',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        topVisemeSummary: 'A:0.66, closed:0.41, E:0.24',
        cueSummary: 'focused / observe_focus | prosody=0.36 mouth=0.28 head=0.32',
        cueIdentityPresent: true,
        cueProsodyPresent: true,
        personaStyleSummary: 'observe-first | prosody=-0.07 beat=-0.06 mouth=-0.04 head=+0.08',
        timingSummary: 'facial=320 action=240 emotion=360 | segment-start | soft-interrupt | hold',
        driverExecutionSummary: 'face=thinking/focused@0.52 hold=320 pre=steady-inhale post=soft-release src=prosody-authority conf=0.94 | motion=observe_focus mode=attentive idle=idle_settle@0.34 hold=240 src=timeline-projection conf=0.88 | lipsync=energy-phoneme-hybrid phase=playing',
        visemeHintsSummary: 'I:0.35@0.94 | closed:0.75@0.89',
      },
      cueMicroSummary: {
        cueId: 'segment-vrm-1',
        cueText: '继续看这里。',
        cue: 'focused / observe_focus | prosody=0.36 mouth=0.28 head=0.32',
        personaStyle: null,
        timing: 'facial=320 action=240 emotion=360 | segment-start | soft-interrupt | hold',
      },
      driverSummary: {
        rendererTarget: 'vrm',
        face: {
          cue: 'focused',
          source: 'prosody-authority',
          confidence: 0.94,
          segmentId: 'segment-vrm-1',
        },
        motion: null,
        lipsync: null,
      },
      live2dExecution: {
        activeExpression: {
          name: 'CalmInspect',
          reason: 'preferred',
          score: 11.4,
          segmentId: 'segment-vrm-1',
        },
        activeMotion: {
          group: 'ObserveSoft',
          index: 1,
          segmentId: 'segment-vrm-1',
        },
        cue: {
          emotion: 'thinking',
          facialCue: 'focus',
          preferredExpressionAliases: ['CalmInspect'],
          live2dFacialReleaseMs: 320,
          live2dMotionFollowThroughMs: 440,
        },
      },
      driverExecutionSummary: 'face=thinking/focused@0.52 hold=320 pre=steady-inhale post=soft-release src=prosody-authority conf=0.94 | motion=observe_focus mode=attentive idle=idle_settle@0.34 hold=240 src=timeline-projection conf=0.88 | lipsync=energy-phoneme-hybrid phase=playing',
      visemeHintsSummary: 'I:0.35@0.94 | closed:0.75@0.89',
      playbackTelemetry: {
        actualDurationMs: 220,
        plannedDurationMs: 220,
        driftMs: 0,
        settleMs: 220,
        stopReason: null,
        rendererTarget: 'vrm',
        driverAuthority: {
          segmentId: 'segment-vrm-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          sources: ['prosody-authority', 'timeline-projection'],
          faceSegmentMatched: true,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: true,
        },
        cue: {
          id: 'segment-vrm-1',
          text: '继续看这里。',
          prosodyWeight: 0.36,
          mouthWeight: 0.28,
          headWeight: 0.32,
          facialHoldMs: 320,
          actionHoldMs: 240,
          emotionHoldMs: 360,
          facialCue: 'focused',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: 'hold',
          rendererHints: {
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
          },
          rendererSettle: {
            live2dFacialReleaseMs: 320,
            live2dMotionFollowThroughMs: 440,
            vrmActionFadeMs: 280,
            vrmExpressionBlendMs: 360,
          },
        },
        drivers: {
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.52,
            holdMs: 320,
            source: 'prosody-authority',
            confidence: 0.94,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            segmentId: 'segment-vrm-1',
          },
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-vrm-1',
            continuityHoldMs: 320,
            visemeHints: [
              { segmentId: 'segment-vrm-1', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
              { segmentId: 'segment-vrm-1', viseme: 'closed', weight: 0.75, source: 'prosody-authority', confidence: 0.89 },
            ],
          },
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'observe_focus',
            intensity: 0.34,
            holdMs: 240,
            source: 'timeline-projection',
            confidence: 0.88,
            segmentId: 'segment-vrm-1',
          },
        },
      },
    })
  })

  it('keeps same-turn-if-invited measured-return cue timing and calmer renderer hints in stored speech diagnostics snapshots', () => {
    const store = useStageThreeRuntimeDiagnosticsStore()

    store.setSpeechEmbodiment({
      phase: 'playing',
      playbackPhase: 'playing',
      speechEnergy: 0.22,
      prosodyIntensity: 0.24,
      emphasisLevel: 0.14,
      cadencePulse: 0.12,
      visemeIntensity: 0.16,
      articulation: null,
      runtimeDynamics: null,
      recentDrivingEvent: null,
      recentDrivingTraceRecord: null,
      recentDrivingTraceEvents: [],
      recentDrivingTraceDetails: [],
      traceSummary: null,
      rendererAlignment: {
        live2d: null,
        vrm: null,
      },
      rendererDriftSummary: null,
      articulationSummary: null,
      authoritySummary: null,
      speechEvidence: null,
      cueMicroSummary: null,
      driverSummary: {
        rendererTarget: 'vrm',
        face: {
          cue: 'soft-gaze',
          source: 'cue-bridge',
          confidence: 0.83,
          segmentId: 'segment-store-invited-1',
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          reasonSummary: 'stay on the same callback line when invited back in',
        },
        motion: {
          cue: 'steady_focus',
          source: 'cue-bridge',
          confidence: 0.79,
          segmentId: 'segment-store-invited-1',
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          reasonSummary: 'keep the invited return settled before widening outward',
        },
        lipsync: null,
      },
      driverExecutionSummary: null,
      live2dExecution: null,
      visemeHintsSummary: null,
      playbackTelemetry: {
        actualDurationMs: 180,
        plannedDurationMs: 200,
        driftMs: -20,
        settleMs: 260,
        stopReason: null,
        rendererTarget: 'vrm',
        driverAuthority: null,
        cue: {
          id: 'segment-store-invited-1',
          text: 'I am still here.',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          actionWindow: 'same-turn-if-invited',
          interruptMode: 'soft-interrupt',
          settleMode: 'hold',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredExpressionAliases: ['RecoverSoft'],
            preferredGazeMode: 'soften',
            preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
          },
          rendererSettle: {
            vrmActionFadeMs: 280,
            vrmExpressionBlendMs: 360,
          },
        },
        drivers: null,
      },
    } as any)

    expect(store.speechEmbodiment.playbackTelemetry?.cue).toEqual(expect.objectContaining({
      actionWindow: 'same-turn-if-invited',
      interruptMode: 'soft-interrupt',
      settleMode: 'hold',
    }))
    expect(store.speechEmbodiment.playbackTelemetry?.cue?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredGazeMode: 'soften',
      preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
    }))
  })

  it('surfaces same-her measured-return lane drift when only lipsync still matches the active VRM segment', () => {
    const speech = {
      ...createDefaultStageSpeechEmbodimentDiagnostics(),
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 96_000,
      currentInwardPreoccupation: 'keep following the same callback line lower-pressure',
      activePresenceSummary: 'same-her callback line still measured-return after repeated reopenings',
      embodiedPresenceSummary: 'quiet-accompaniment',
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.82,
        companionshipPressure: 0.76,
        channels: [],
        summary: 'active-memory=warm | continuity=0.82 | companionship=0.76',
      },
      runtimeSummary: 'active-memory same-her line still measured-return',
      digitalLifeSpineDigest: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'callback seam still open',
          activeThreadId: 'thread-same-her-lane-drift-1',
          activeThreadTitle: 'callback seam',
          dominantMode: 'thinking',
          dominantDrive: 'stabilize',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'observe_focus',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'project_continuity=keep the same callback line alive without widening it',
          updatedAt: 1_000,
        },
        architecture: {
          operatingMode: 'acting',
          dominantSystem: 'dialogue',
          supportingSystems: ['memory', 'embodiment'],
          governingFocus: 'same-her measured-return continuity',
          summary: 'same-her measured-return continuity',
        },
        continuitySignal: {
          summary: 'thread=callback seam | stage=same-thread-continuation | restraint=measured-return',
          confidence: 0.86,
        } as any,
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'leave room before widening closeness',
          },
        },
        proactive: {
          selectedAction: 'observe_focus',
          preferredStyle: 'silent-observe',
          confidence: 0.81,
          shouldSpeak: false,
          activeThreadId: 'thread-same-her-lane-drift-1',
          activeThreadTitle: 'callback seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'The same callback line is still alive after repeated measured-return reopenings.',
          leadingGoalId: null,
          leadingGoalSummary: 'keep the return lower-pressure',
          preferredPresence: 'attentive',
          continuityRestraint: 'measured-return',
          personaBias: {
            relationshipPosture: 'companion',
            initiativeStyle: 'measured-approach',
            silenceReconnect: 'light-probe',
            comfortStyle: 'gentle-care',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'measured-return | soften / linger',
            openingGuidance: 'Stay on the same callback line and keep the next outward move hover-first.',
            whySummary: 'same-her callback line still needs room',
          },
        },
        memory: {
          summary: 'callback seam is still active',
          recentEpisodeSummary: null,
          recentEpisodeCount: 0,
          focusBeliefStatement: null,
          focusBeliefConfidence: null,
          leadingGoalSummary: 'keep the same thread lower-pressure',
          dominantConcernSummary: 'same-her continuity still active',
          reflectionSummary: null,
          reflectionPressure: null,
          recallMode: 'working-memory',
          recallSeed: null,
          thoughtThreadSummary: null,
        },
        outcomeLearning: {
          reflectionTargetScope: null,
          reflectionSummary: null,
          reflectionLesson: null,
          latestInflection: 'keep the next return hover-first',
          revisionPressure: null,
          autobiographicalStability: null,
          learningReadiness: null,
          contradictionPressure: null,
          dominantTrajectory: null,
          activeLearningFocuses: [],
          evolutionMomentum: null,
          nextLearningAction: null,
          nextLearningReason: null,
          summary: null,
        },
      } as any,
      recentDrivingEvent: {
        kind: 'dialogue-responded',
        decisionTraceId: 'mind:same-her-lane-drift:1',
        summary: 'same-her callback line kept measured-return after repeated reopenings',
        createdAt: 2_468,
      } as any,
      recentDrivingTraceRecord: {
        decisionTraceId: 'mind:same-her-lane-drift:1',
        activeThreadId: 'thread-same-her-lane-drift-1',
        turnMode: 'answer',
        truthState: 'remembered',
        repairState: 'none',
        finalSurfacePolicy: 'same-thread-continuation',
        closureState: 'same-her-carry',
        suppressionTags: ['continuity-next-open-window'],
      } as any,
      recentDrivingTraceEvents: [],
      recentDrivingTraceDetails: [],
      traceSummary: {
        decisionTraceId: 'mind:same-her-lane-drift:1',
        turnMode: 'answer',
        truthState: 'remembered',
        repairState: 'none',
        finalSurfacePolicy: 'same-thread-continuation',
        closureState: 'same-her-carry',
        activeThreadId: 'thread-same-her-lane-drift-1',
        suppressionTags: ['continuity-next-open-window'],
        latestEventSummary: 'same-her callback line is still measured-return, but face and motion drifted away from the active segment',
        segmentBinding: {
          matched: false,
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
        },
      },
      rendererAlignment: {
        live2d: null,
        vrm: {
          predicted: 'calm',
          actual: 'calm',
          reason: 'preferred',
          status: 'aligned',
          driftKind: 'aligned',
          faceDriverCue: null,
          faceDriverSource: null,
          motionDriverCue: null,
          motionDriverSource: null,
        },
      },
      rendererDriftSummary: 'same-her segment still active, but face/motion drifted off the active lane',
      articulationSummary: {
        voice: 'zh-CN | closure=0.84 | precision=0.90',
        topVisemes: 'I:0.42',
      },
      authoritySummary: {
        cueId: 'segment-same-her-lane-drift-1',
        segmentId: 'segment-same-her-lane-drift-1',
        rendererTarget: 'vrm',
        matchedDrivers: ['lipsync'],
        matchedSources: ['prosody-authority'],
        bindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only',
        matchSummary: 'face:no motion:no lipsync:yes',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是口型。',
        authorityMismatchDisplay: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是口型。',
        settleSummary: 'authority-bound | segment=segment-same-her-lane-drift-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync-only',
      },
      speechEvidence: {
        voiceSummary: 'companion=measured-return | blink=linger | gaze=soften',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        topVisemeSummary: 'I:0.42',
        cueSummary: 'focused / observe_focus | prosody=0.34 mouth=0.30 head=0.28',
        cueIdentityPresent: true,
        cueProsodyPresent: true,
        personaStyleSummary: 'measured-return | soften / linger',
        timingSummary: 'facial=320 action=240 emotion=360 | segment-start | soft-interrupt | hold',
        driverExecutionSummary: 'face drifted | motion drifted | lipsync=energy-phoneme-hybrid phase=playing',
        visemeHintsSummary: 'I:0.42@0.94',
      },
      cueMicroSummary: {
        cueId: 'segment-same-her-lane-drift-1',
        cueText: '先沿着这条线继续看。',
        cue: 'focused / observe_focus | prosody=0.34 mouth=0.30 head=0.28',
        personaStyle: 'measured-return | soften / linger',
        timing: 'facial=320 action=240 emotion=360 | segment-start | soft-interrupt | hold',
      },
      driverSummary: {
        rendererTarget: 'vrm',
        face: {
          cue: 'focused',
          source: 'prosody-authority',
          confidence: 0.94,
          segmentId: 'segment-other-face-same-her-1',
        },
        motion: null,
        lipsync: null,
      },
      live2dExecution: null,
      driverExecutionSummary: 'face drifted | motion drifted | lipsync=energy-phoneme-hybrid phase=playing',
      visemeHintsSummary: 'I:0.42@0.94',
      playbackTelemetry: {
        actualDurationMs: 260,
        plannedDurationMs: 240,
        driftMs: 20,
        settleMs: 280,
        stopReason: null,
        rendererTarget: 'vrm',
        driverAuthority: {
          segmentId: 'segment-same-her-lane-drift-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          sources: ['prosody-authority', 'timeline-projection'],
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        cue: {
          id: 'segment-same-her-lane-drift-1',
          text: '先沿着这条线继续看。',
          prosodyWeight: 0.34,
          mouthWeight: 0.3,
          headWeight: 0.28,
          facialHoldMs: 320,
          actionHoldMs: 240,
          emotionHoldMs: 360,
          facialCue: 'focused',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: 'hold',
          rendererHints: {
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
          },
          rendererSettle: {
            live2dFacialReleaseMs: 320,
            live2dMotionFollowThroughMs: 440,
            vrmActionFadeMs: 280,
            vrmExpressionBlendMs: 360,
          },
        },
        drivers: {
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.5,
            holdMs: 320,
            source: 'prosody-authority',
            confidence: 0.94,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            segmentId: 'segment-other-face-same-her-1',
          },
          lipsync: {
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
            segmentId: 'segment-same-her-lane-drift-1',
            continuityHoldMs: 320,
            visemeHints: [
              { segmentId: 'segment-same-her-lane-drift-1', viseme: 'I', weight: 0.42, source: 'prosody-authority', confidence: 0.94 },
            ],
          },
          motion: {
            idleBase: 'idle_settle',
            attentionMode: 'attentive',
            actionCue: 'observe_focus',
            intensity: 0.36,
            holdMs: 220,
            source: 'timeline-projection',
            confidence: 0.88,
            segmentId: 'segment-other-motion-same-her-1',
          },
        },
      },
    } as any

    expect(speech.authoritySummary).toMatchObject({
      matchSummary: 'face:no motion:no lipsync:yes',
      bindingSummary: expect.stringContaining('lane=lipsync-only'),
      settleSummary: expect.stringContaining('lane=lipsync-only'),
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
    })
    expect(speech.authoritySummary?.authorityMismatchDisplay).toContain('表情、动作 authority 漂移')
    expect(speech.playbackTelemetry?.driverAuthority).toEqual(expect.objectContaining({
      matchedDrivers: ['face', 'motion', 'lipsync'],
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
    }))
    expect(speech.playbackTelemetry?.drivers?.lipsync?.continuityHoldMs).toBe(320)
  })

  it('preserves body-carried speech rejoin continuity in runtime diagnostics snapshots before devtools readback layers consume it', () => {
    const store = useStageThreeRuntimeDiagnosticsStore()

    store.setSpeechEmbodiment({
      phase: 'playing',
      playbackPhase: 'playing',
      speechEnergy: 0.31,
      prosodyIntensity: 0.43,
      emphasisLevel: 0.22,
      cadencePulse: 0.18,
      visemeIntensity: 0.28,
      articulation: null,
      runtimeDynamics: null,
      recentDrivingEvent: {
        kind: 'authority-shift',
        decisionTraceId: 'mind:body-speech-store:1',
        summary: '身体线先把语音片段接回来。',
        createdAt: 100,
      },
      recentDrivingTraceRecord: {
        decisionTraceId: 'mind:body-speech-store:1',
        activeThreadId: 'runtime-thread-body-speech-store-1',
        turnMode: 'care',
        truthState: 'live-grounded',
        repairState: 'none',
        finalSurfacePolicy: 'speech-rejoin',
        closureState: 'grounded-recall',
        suppressionTags: [],
      },
      recentDrivingTraceEvents: [],
      recentDrivingTraceDetails: [],
      traceSummary: {
        decisionTraceId: 'mind:body-speech-store:1',
        turnMode: 'care',
        truthState: 'live-grounded',
        repairState: 'none',
        finalSurfacePolicy: 'speech-rejoin',
        closureState: 'grounded-recall',
        activeThreadId: 'runtime-thread-body-speech-store-1',
        suppressionTags: [],
        latestEventSummary: '身体线先把语音片段接回来。',
        segmentBinding: {
          matched: true,
          rendererTarget: 'vrm',
          matchedDrivers: ['body', 'lipsync'],
          matchedSources: ['prosody-authority'],
        },
      },
      rendererAlignment: {
        live2d: null,
        vrm: null,
      },
      rendererDriftSummary: null,
      articulationSummary: null,
      authoritySummary: {
        cueId: 'segment-body-speech-store-1',
        segmentId: 'segment-body-speech-store-1',
        rendererTarget: 'vrm',
        matchedDrivers: ['body', 'lipsync'],
        matchedSources: ['prosody-authority', 'voice-segment'],
        bindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
        matchSummary: 'body:yes face:no motion:no lipsync:yes',
        authorityTrustSummary: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情和动作还没回到这一段里，但身体线已经继续托住同一个 living segment。',
        authorityMismatchDisplay: '表情和动作还没回到这一段里，但身体线已经继续托住同一个 living segment。',
        settleSummary: 'authority-bound | segment=segment-body-speech-store-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | lane=body+lipsync-only',
      },
      speechEvidence: {
        voiceSummary: null,
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        personaStyleSummary: null,
        prosodyAuthoritySummary: null,
        timingSummary: null,
        driverExecutionSummary: 'lipsync=energy-phoneme-hybrid phase=playing',
        visemeHintsSummary: null,
      },
      cueMicroSummary: null,
      driverSummary: {
        rendererTarget: 'vrm',
        face: null,
        motion: null,
        lipsync: {
          cue: null,
          source: 'prosody-authority',
          confidence: 0.91,
          segmentId: 'segment-body-speech-store-1',
          mode: 'energy-phoneme-hybrid',
          reasonSummary: '身体线先把语音片段接回来。',
        },
      },
      live2dExecution: null,
      driverExecutionSummary: 'lipsync=energy-phoneme-hybrid phase=playing',
      visemeHintsSummary: null,
      playbackTelemetry: {
        actualDurationMs: 210,
        plannedDurationMs: 210,
        driftMs: 0,
        settleMs: 210,
        stopReason: null,
        rendererTarget: 'vrm',
        driverAuthority: {
          segmentId: 'segment-body-speech-store-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['body', 'lipsync'],
          sources: ['prosody-authority'],
          bodySegmentMatched: true,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        cue: {
          id: 'segment-body-speech-store-1',
          rendererHints: null,
          rendererSettle: null,
        },
        drivers: null,
      },
    } as any)

    const speech = store.speechEmbodiment
    expect(speech.traceSummary?.segmentBinding).toEqual({
      matched: true,
      rendererTarget: 'vrm',
      matchedDrivers: ['body', 'lipsync'],
      matchedSources: ['prosody-authority'],
    })
    expect(speech.authoritySummary).toMatchObject({
      matchedDrivers: ['body', 'lipsync'],
      matchedSources: ['prosody-authority', 'voice-segment'],
      matchSummary: 'body:yes face:no motion:no lipsync:yes',
    })
    expect(speech.playbackTelemetry?.driverAuthority).toEqual(expect.objectContaining({
      matchedDrivers: ['body', 'lipsync'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
    }))
  })

  it('surfaces tightened same-thread callback reopen summaries when the same line narrows from measured-return into repair-before-closeness', () => {
    const store = useStageThreeRuntimeDiagnosticsStore()

    store.setSpeechEmbodiment({
      ...createDefaultStageSpeechEmbodimentDiagnostics(),
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 128_000,
      currentInwardPreoccupation: 'same callback line is still alive, but now it needs more distance before widening again',
      activePresenceSummary: 'same-her callback line tightened into repair-before-closeness after repeated reopenings',
      embodiedPresenceSummary: 'quiet-accompaniment',
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.72,
        channels: [],
        summary: 'active-memory=warm | continuity=0.90 | companionship=0.72',
      },
      runtimeSummary: 'active-memory same-her callback line narrowed into repair-before-closeness',
      digitalLifeSpineDigest: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'callback seam still open but more guarded',
          activeThreadId: 'thread-tightened-callback-line-1',
          activeThreadTitle: 'callback seam',
          dominantMode: 'thinking',
          dominantDrive: 'stabilize',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'idle_settle',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'project_continuity=keep the same callback line alive while holding more inward distance',
          updatedAt: 2_000,
        },
        architecture: {
          operatingMode: 'acting',
          dominantSystem: 'dialogue',
          supportingSystems: ['memory', 'embodiment'],
          governingFocus: 'same-her callback restraint tightened before closeness widens again',
          summary: 'same-her callback restraint tightened before closeness widens again',
        },
        continuitySignal: {
          summary: 'thread=callback seam | stage=same-thread-continuation | restraint=repair-before-closeness',
          confidence: 0.9,
        } as any,
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'leave room before widening warmth again',
          },
        },
        proactive: {
          selectedAction: 'idle_settle',
          preferredStyle: 'silent-observe',
          confidence: 0.84,
          shouldSpeak: false,
          activeThreadId: 'thread-tightened-callback-line-1',
          activeThreadTitle: 'callback seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'The same callback line is still alive, but it now needs a more inward reopen.',
          leadingGoalId: null,
          leadingGoalSummary: 'keep the callback return more inward before it widens again',
          preferredPresence: 'attentive',
          continuityRestraint: 'repair-before-closeness',
          personaBias: {
            relationshipPosture: 'companion',
            initiativeStyle: 'measured-approach',
            silenceReconnect: 'light-probe',
            comfortStyle: 'gentle-care',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'repair-before-closeness | soften / linger',
            openingGuidance: 'Stay on the same callback line, but let the next outward move hold more distance first.',
            whySummary: 'same-her callback line still needs extra room',
          },
        },
        memory: {
          summary: 'callback seam is still active',
          recentEpisodeSummary: null,
          recentEpisodeCount: 0,
          focusBeliefStatement: null,
          focusBeliefConfidence: null,
          leadingGoalSummary: 'keep the same thread more inward before widening',
          dominantConcernSummary: 'same-her continuity still active',
          reflectionSummary: null,
          reflectionPressure: null,
          recallMode: 'working-memory',
          recallSeed: null,
          thoughtThreadSummary: null,
        },
        outcomeLearning: {
          reflectionTargetScope: null,
          reflectionSummary: null,
          reflectionLesson: null,
          latestInflection: 'keep the next return more inward before widening',
          revisionPressure: null,
          autobiographicalStability: null,
          learningReadiness: null,
          contradictionPressure: null,
          dominantTrajectory: null,
          activeLearningFocuses: [],
          evolutionMomentum: null,
          nextLearningAction: null,
          nextLearningReason: null,
          summary: null,
        },
      } as any,
      recentDrivingEvent: {
        kind: 'dialogue-responded',
        decisionTraceId: 'mind:tightened-callback-line:1',
        summary: 'same-her callback line tightened into repair-before-closeness after repeated reopenings',
        createdAt: 3_579,
      } as any,
      recentDrivingTraceRecord: {
        decisionTraceId: 'mind:tightened-callback-line:1',
        activeThreadId: 'thread-tightened-callback-line-1',
        turnMode: 'answer',
        truthState: 'remembered',
        repairState: 'none',
        finalSurfacePolicy: 'same-thread-continuation',
        closureState: 'same-her-carry',
        suppressionTags: ['continuity-next-open-window'],
      } as any,
      recentDrivingTraceEvents: [],
      recentDrivingTraceDetails: [],
      traceSummary: {
        decisionTraceId: 'mind:tightened-callback-line:1',
        turnMode: 'answer',
        truthState: 'remembered',
        repairState: 'none',
        finalSurfacePolicy: 'same-thread-continuation',
        closureState: 'same-her-carry',
        activeThreadId: 'thread-tightened-callback-line-1',
        suppressionTags: ['continuity-next-open-window'],
        latestEventSummary: 'same-her callback line is still active, but it has narrowed into repair-before-closeness after the repeated reopenings',
        segmentBinding: {
          matched: false,
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
        },
      },
      rendererAlignment: {
        live2d: null,
        vrm: null,
      },
      rendererDriftSummary: 'same-her segment still active, but face/motion drifted off while the callback line tightened inward',
      articulationSummary: null,
      authoritySummary: {
        cueId: 'segment-tightened-callback-line-1',
        segmentId: 'segment-tightened-callback-line-1',
        rendererTarget: 'vrm',
        matchedDrivers: ['lipsync'],
        matchedSources: ['prosody-authority'],
        bindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only',
        matchSummary: 'face:no motion:no lipsync:yes',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情、动作 authority 漂移，但同一条 callback line 已经收紧成更 inward 的 reopen。',
        authorityMismatchDisplay: '表情、动作 authority 漂移，但同一条 callback line 已经收紧成更 inward 的 reopen。',
        settleSummary: 'authority-bound | segment=segment-tightened-callback-line-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync-only',
      },
      speechEvidence: {
        voiceSummary: 'companion=repair-before-closeness | blink=linger | gaze=soften',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        topVisemeSummary: 'I:0.38',
        cueSummary: 'soft-gaze / idle_settle | prosody=0.30 mouth=0.24 head=0.22',
        cueIdentityPresent: true,
        cueProsodyPresent: true,
        personaStyleSummary: 'repair-before-closeness | soften / linger',
        timingSummary: 'facial=360 action=320 emotion=380 | segment-start | soft-interrupt | hold',
        driverExecutionSummary: 'face drifted | motion drifted | lipsync=energy-phoneme-hybrid phase=playing',
        visemeHintsSummary: 'I:0.38@0.93',
      },
      cueMicroSummary: {
        cueId: 'segment-tightened-callback-line-1',
        cueText: '我还在，只是先别一下子靠太近。',
        cue: 'soft-gaze / idle_settle | prosody=0.30 mouth=0.24 head=0.22',
        personaStyle: 'repair-before-closeness | soften / linger',
        timing: 'facial=360 action=320 emotion=380 | segment-start | soft-interrupt | hold',
      },
      driverSummary: {
        rendererTarget: 'vrm',
        face: {
          cue: 'soft-gaze',
          source: 'prosody-authority',
          confidence: 0.93,
          segmentId: 'segment-other-face-tightened-callback-line-1',
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          reasonSummary: 'same callback line tightened before widening again',
        },
        motion: {
          cue: 'idle_settle',
          source: 'timeline-projection',
          confidence: 0.88,
          segmentId: 'segment-other-motion-tightened-callback-line-1',
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          reasonSummary: 'hold more inward distance before the next outward move',
        },
        lipsync: null,
      },
      live2dExecution: null,
      driverExecutionSummary: 'face drifted | motion drifted | lipsync=energy-phoneme-hybrid phase=playing',
      visemeHintsSummary: 'I:0.38@0.93',
      playbackTelemetry: {
        actualDurationMs: 280,
        plannedDurationMs: 260,
        driftMs: 20,
        settleMs: 320,
        stopReason: null,
        rendererTarget: 'vrm',
        driverAuthority: {
          segmentId: 'segment-tightened-callback-line-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          sources: ['prosody-authority', 'timeline-projection'],
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        cue: {
          id: 'segment-tightened-callback-line-1',
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredExpressionAliases: ['RecoverSoft'],
            preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          rendererSettle: {
            live2dFacialReleaseMs: 380,
            live2dMotionFollowThroughMs: 460,
            vrmActionFadeMs: 460,
            vrmExpressionBlendMs: 540,
          },
        },
        drivers: null,
      },
    } as any)

    const speech = store.speechEmbodiment
    expect(speech.currentInwardPreoccupation).toContain('more distance')
    expect(speech.activePresenceSummary).toContain('repair-before-closeness')
    expect(speech.runtimeSummary).toContain('repair-before-closeness')
    expect(speech.traceSummary?.latestEventSummary).toContain('repair-before-closeness')
    expect(speech.speechEvidence?.voiceSummary).toContain('repair-before-closeness')
    expect(speech.speechEvidence?.personaStyleSummary).toBe('repair-before-closeness | soften / linger')
    expect(speech.cueMicroSummary?.personaStyle).toBe('repair-before-closeness | soften / linger')
    expect(speech.playbackTelemetry?.cue?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
    }))
  })

  it('surfaces interruption-tail same-her narration when owner-canceled playback resumes on the same callback line', () => {
    const store = useStageThreeRuntimeDiagnosticsStore()

    store.setSpeechEmbodiment({
      ...createDefaultStageSpeechEmbodimentDiagnostics(),
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 96_000,
      currentInwardPreoccupation: 'the interruption passed, but she is still following the same callback line before widening again',
      activePresenceSummary: 'same-her callback line stayed alive through interruption and resumed more inward',
      embodiedPresenceSummary: 'quiet-accompaniment',
      runtimeSummary: 'same-her interruption tail stayed on the callback line and reopened as repair-before-closeness',
      recentDrivingEvent: {
        kind: 'dialogue-interrupted',
        decisionTraceId: 'mind:interrupt-callback-line:1',
        summary: '打断以后还是沿着同一条 callback 线轻一点接回来。',
        createdAt: 4_200,
      } as any,
      recentDrivingTraceRecord: {
        decisionTraceId: 'mind:interrupt-callback-line:1',
        activeThreadId: 'thread-interrupt-callback-line-1',
        turnMode: 'answer',
        truthState: 'remembered',
        repairState: 'none',
        finalSurfacePolicy: 'same-thread-continuation',
        closureState: 'same-her-carry',
        suppressionTags: ['continuity-next-open-window', 'interrupt-tail'],
      } as any,
      recentDrivingTraceEvents: [],
      recentDrivingTraceDetails: [],
      traceSummary: {
        decisionTraceId: 'mind:interrupt-callback-line:1',
        turnMode: 'answer',
        truthState: 'remembered',
        repairState: 'none',
        finalSurfacePolicy: 'same-thread-continuation',
        closureState: 'same-her-carry',
        activeThreadId: 'thread-interrupt-callback-line-1',
        suppressionTags: ['continuity-next-open-window', 'interrupt-tail'],
        latestEventSummary: 'owner-canceled interruption happened, but the same-her callback line still resumed on the later segment',
        segmentBinding: {
          matched: true,
          rendererTarget: 'live2d',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          matchedSources: ['prosody-authority', 'timeline-projection', 'voice-segment'],
          faceSegmentMatched: true,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: true,
        },
      },
      authoritySummary: {
        cueId: 'segment-later-callback-return',
        segmentId: 'segment-later-callback-return',
        rendererTarget: 'live2d',
        matchedDrivers: ['face', 'motion', 'lipsync'],
        matchedSources: ['prosody-authority', 'timeline-projection', 'voice-segment'],
        bindingSummary: 'interruption tail still resolved onto the later living segment',
        matchSummary: 'face:yes motion:yes lipsync:yes',
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        settleSummary: 'later callback segment kept authority after interruption',
      },
      articulationSummary: {
        voice: 'zh-CN | closure=0.72 | precision=0.88 | companion=repair-before-closeness',
        topVisemes: 'closed:0.78, I:0.72',
        cueId: 'segment-later-callback-return',
        segmentId: 'segment-later-callback-return',
        bindingSummary: 'target=live2d | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection, voice-segment | matches=face:yes motion:yes lipsync:yes',
      },
      speechEvidence: {
        voiceSummary: 'companion=repair-before-closeness | closure=0.72 | blink=linger | gaze=soften',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        topVisemeSummary: 'closed:0.78, I:0.72',
        cueSummary: 'soft-gaze / idle_settle | prosody=0.38 mouth=0.34 head=0.29',
        cueIdentityPresent: true,
        cueProsodyPresent: true,
        personaStyleSummary: 'repair-before-closeness | soften / linger',
        timingSummary: 'facial=360 action=320 emotion=360 | segment-start | soft-interrupt | hold',
        driverExecutionSummary: 'face=thinking/soft-release@0.41 hold=360 pre=soft-breath post=soft-release src=prosody-authority conf=0.94 | motion=idle_settle mode=attentive idle=steady_focus@0.18 hold=320 src=timeline-projection conf=0.90 | lipsync=energy-phoneme-hybrid phase=playing',
        visemeHintsSummary: 'closed:0.78@0.93 | I:0.72@0.95',
      },
      cueMicroSummary: {
        cueId: 'segment-later-callback-return',
        cueText: '我还在，只是先别一下子靠太近。',
        cue: 'soft-gaze / idle_settle | prosody=0.38 mouth=0.34 head=0.29',
        personaStyle: 'repair-before-closeness | soften / linger',
        timing: 'facial=360 action=320 emotion=360 | segment-start | soft-interrupt | hold',
      },
      driverSummary: {
        rendererTarget: 'live2d',
        face: {
          cue: 'soft-release',
          source: 'prosody-authority',
          confidence: 0.94,
          segmentId: 'segment-later-callback-return',
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          reasonSummary: 'the interruption passed, but she stayed on the same callback line',
        },
        motion: {
          cue: 'idle_settle',
          source: 'timeline-projection',
          confidence: 0.9,
          segmentId: 'segment-later-callback-return',
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          reasonSummary: 'resume more inward after the interruption instead of reopening from scratch',
        },
        lipsync: null,
      },
      live2dExecution: {
        activeExpression: {
          name: 'RecoverSoft',
          reason: 'preferred',
          score: 12.2,
          segmentId: 'segment-later-callback-return',
        },
        activeMotion: {
          group: 'StillnessGuard',
          index: 0,
        },
        cue: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          preferredExpressionAliases: ['RecoverSoft'],
          preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
          live2dFacialReleaseMs: 380,
          live2dMotionFollowThroughMs: 460,
        },
      },
      driverExecutionSummary: 'face=thinking/soft-release@0.41 hold=360 pre=soft-breath post=soft-release src=prosody-authority conf=0.94 | motion=idle_settle mode=attentive idle=steady_focus@0.18 hold=320 src=timeline-projection conf=0.90 | lipsync=energy-phoneme-hybrid phase=playing',
      visemeHintsSummary: 'I:0.72@0.95',
      playbackTelemetry: {
        actualDurationMs: 260,
        plannedDurationMs: 420,
        driftMs: -160,
        settleMs: 340,
        stopReason: 'owner-canceled',
        rendererTarget: 'live2d',
        driverAuthority: {
          segmentId: 'segment-later-callback-return',
          rendererTarget: 'live2d',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          sources: ['prosody-authority', 'timeline-projection', 'voice-segment'],
          faceSegmentMatched: true,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: true,
        },
        cue: {
          id: 'segment-later-callback-return',
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredExpressionAliases: ['RecoverSoft'],
            preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          rendererSettle: {
            live2dFacialReleaseMs: 380,
            live2dMotionFollowThroughMs: 460,
            vrmActionFadeMs: 460,
            vrmExpressionBlendMs: 540,
          },
          interruptMode: 'soft-interrupt',
          settleMode: 'hold',
        },
        drivers: null,
      },
    } as any)

    const speech = store.speechEmbodiment
    expect(speech.recentDrivingEvent?.summary).toContain('同一条 callback 线')
    expect(speech.traceSummary?.latestEventSummary).toContain('owner-canceled')
    expect(speech.traceSummary?.latestEventSummary).toContain('same-her callback line')
    expect(speech.articulationSummary?.cueId).toBe('segment-later-callback-return')
    expect(speech.articulationSummary?.segmentId).toBe('segment-later-callback-return')
    expect(speech.articulationSummary?.voice).toContain('closure=0.72')
    expect(speech.articulationSummary?.topVisemes).toContain('closed:0.78')
    expect(speech.authoritySummary?.segmentId).toBe(speech.articulationSummary?.segmentId)
    expect(speech.authoritySummary?.matchedSources).toEqual(expect.arrayContaining([
      'prosody-authority',
      'timeline-projection',
      'voice-segment',
    ]))
    expect(speech.playbackTelemetry?.driverAuthority?.segmentId).toBe(speech.articulationSummary?.segmentId)
    expect(speech.playbackTelemetry?.driverAuthority?.sources).toEqual(expect.arrayContaining([
      'prosody-authority',
      'timeline-projection',
      'voice-segment',
    ]))
    expect(speech.articulationSummary?.bindingSummary).toContain('voice-segment')
    expect(speech.speechEvidence?.voiceSummary).toContain('repair-before-closeness')
    expect(speech.speechEvidence?.voiceSummary).toContain('closure=0.72')
    expect(speech.speechEvidence?.voiceSummary).toContain('blink=linger')
    expect(speech.speechEvidence?.voiceSummary).toContain('gaze=soften')
    expect(speech.speechEvidence?.cueSummary).toContain('soft-gaze / idle_settle')
    expect(speech.speechEvidence?.cueSummary).toContain('mouth=0.34')
    expect(speech.speechEvidence?.cueSummary).toContain('head=0.29')
    expect(speech.speechEvidence?.timingSummary).toContain('soft-interrupt | hold')
    expect(speech.speechEvidence?.driverExecutionSummary).toContain('post=soft-release')
    expect(speech.speechEvidence?.driverExecutionSummary).toContain('motion=idle_settle')
    expect(speech.speechEvidence?.visemeHintsSummary).toContain('closed:0.78@0.93')
    expect(speech.speechEvidence?.visemeHintsSummary).toContain('I:0.72@0.95')
    expect(speech.speechEvidence?.personaStyleSummary).toBe('repair-before-closeness | soften / linger')
    expect(speech.live2dExecution?.activeExpression?.name).toBe('RecoverSoft')
    expect(speech.live2dExecution?.activeExpression?.segmentId).toBe(speech.articulationSummary?.segmentId)
    expect(speech.live2dExecution?.activeMotion?.group).toBe('StillnessGuard')
    expect(speech.driverSummary?.motion?.segmentId).toBe(speech.articulationSummary?.segmentId)
    expect(speech.live2dExecution?.cue?.preferredExpressionAliases).toEqual(['RecoverSoft'])
    expect(speech.live2dExecution?.cue?.preferredMotionAliases).toEqual(['StillnessGuard', 'ObserveSoft'])
    expect(speech.live2dExecution?.cue?.live2dFacialReleaseMs).toBe(380)
    expect(speech.live2dExecution?.cue?.live2dMotionFollowThroughMs).toBe(460)
    expect(speech.driverSummary?.face?.preferredBlinkCadence).toBe('linger')
    expect(speech.driverSummary?.motion?.preferredBlinkCadence).toBe('linger')
    expect(speech.playbackTelemetry?.stopReason).toBe('owner-canceled')
    expect(speech.playbackTelemetry?.cue?.settleMode).toBe('hold')
    expect(speech.playbackTelemetry?.cue?.interruptMode).toBe('soft-interrupt')
    expect(speech.playbackTelemetry?.cue?.rendererHints?.residentMode).toBe('repair-before-closeness')
    expect(speech.playbackTelemetry?.cue?.rendererSettle?.live2dFacialReleaseMs).toBe(380)
    expect(speech.playbackTelemetry?.cue?.rendererSettle?.live2dMotionFollowThroughMs).toBe(460)
  })
})
