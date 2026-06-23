import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRuntimeContinuityProjection } from './performance-visualizer-self-evolution-runtime-continuity'

describe('performance visualizer self evolution runtime continuity projection', () => {
  it('connects renderer authority evidence to runtime and scene continuity evidence', () => {
    const projection = buildSelfEvolutionRuntimeContinuityProjection({
      rendererAuthorityProjection: {
        status: 'grounded',
        rendererTarget: 'vrm',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'tired',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      speechEmbodiment: {
        runtimeDynamics: {
          profile: 'protective-watch',
          variationToken: 'presence-pulse|protective-watch',
          residentEmotion: 'tired',
          residentDelivery: 'gentle',
          residentFacialCue: 'focused',
          residentActionCue: 'observe_focus',
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
            selectedAction: 'observe_focus',
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
        recentDrivingTraceDetails: [
          {
            kind: 'governance-normalized',
            summary: 'turn=care | truth=live-grounded | repair=none',
            createdAt: 2_430,
            details: [
              { label: 'scenario', value: 'late-night-fatigue' },
              { label: 'stance', value: 'observe-first' },
              { label: 'sourceTrail', value: 'fatigue, care, grounded-recall' },
            ],
          },
        ],
      } as any,
    })

    expect(projection).toEqual({
      status: 'grounded',
      bodyContinuityPhase: null,
      rendererRejoinSurfaceKey: null,
      runtimeChannel: 'active-dialogue',
      runtimeSummary: 'runtime alignment held',
      activeThreadId: 'runtime-thread-rest-1',
      activeThreadTitle: 'late-night care',
      runtimeScenario: 'coding',
      runtimeScene: 'coding',
      transitionFromWatchMode: 'symbiotic-vision',
      transitionToWatchMode: 'recovering',
      transitionFromScenario: 'chat',
      transitionReason: 'host fatigue detected during late-night care',
      governorDrive: 'protect',
      governorIntentionId: 'governor-intention-rest-1',
      focusBeliefId: 'belief-rest-1',
      rationaleTags: ['recovering', 'late-night-fatigue'],
      traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=none | execution=none | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
      traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 无，实际执行 无，场景 深夜疲劳照看，姿态 先观察后表达，来源链 fatigue -> care -> grounded-recall',
      matchedSignals: [
        'runtime-channel:active-dialogue',
        'runtime-thread:runtime-thread-rest-1',
        'runtime-scenario:coding',
        'runtime-scene:coding',
        'transition-from:symbiotic-vision',
        'transition-to:recovering',
        'governor-drive:protect',
        'focus-belief:belief-rest-1',
        'trace-embodiment',
      ],
      missingSignals: [],
      driftingSignals: [],
      reasons: [
        'Runtime continuity still stays on thread runtime-thread-rest-1 with active-dialogue/coding context, so the rendered authority output is attached to an ongoing life situation instead of a detached animation shell.',
        'Recent transition still explains the move from symbiotic-vision to recovering because host fatigue detected during late-night care, which preserves a causal line between the prior scene and the current embodied posture.',
        'Upstream renderer authority is still carrying the same manifestation line, so runtime continuity can explain the current embodiment as one continuous person-state rather than a renderer-local improvisation.',
        'Trace embodiment summary still closes the same care/grounded-recall line, so renderer authority is part of one continuous person-state rather than a fresh isolated output.',
      ],
    })
  })

  it('keeps renderer drift attached to runtime continuity instead of treating it as a pre-runtime identity break', () => {
    const projection = buildSelfEvolutionRuntimeContinuityProjection({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'live2d',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'tired',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'face:yes motion:yes lipsync:no',
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-live2d-1',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [
          'renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge',
        ],
        reasons: [
          'Renderer drift still shows resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge, so the visible face is diverging after mind-to-render projection rather than before it.',
        ],
      },
      speechEmbodiment: {
        runtimeDynamics: {
          profile: 'protective-watch',
          variationToken: 'presence-pulse|protective-watch',
          residentEmotion: 'tired',
          residentDelivery: 'gentle',
          residentFacialCue: 'focused',
          residentActionCue: 'observe_focus',
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
            selectedAction: 'observe_focus',
            personaBiasSummary: 'protective-watch favored due to late-night care pressure',
            personaOpeningGuidance: 'Open gently, but keep the opening bounded and real.',
            scene: 'coding',
            scenario: 'coding',
          },
          eventPointers: {
            recentTransition: null,
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
        recentDrivingTraceDetails: [],
      } as any,
    })

    expect(projection?.status).toBe('drift')
    expect(projection?.driftingSignals).toContain('renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge')
    expect(projection?.reasons).toContain('Upstream renderer authority is still carrying the same manifestation line, so runtime continuity can explain the current embodiment as one continuous person-state rather than a renderer-local improvisation.')
    expect(projection?.reasons).toContain('Renderer continuity still carries resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge, so the life thread can explain the visible divergence as a post-projection renderer event instead of a broken resident mind state.')
    expect(projection?.reasons).toContain('Prosody authority still anchors energy-phoneme-hybrid on segment-live2d-1, so runtime continuity can attribute the mouth-driving divergence to the same speech segment instead of a detached renderer branch.')
  })

  it('carries explicit body-led renderer rejoin continuity forward from renderer authority projection', () => {
    const projection = buildSelfEvolutionRuntimeContinuityProjection({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'vrm',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'tired',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'body:yes face:yes motion:no lipsync:no',
        matchedSignals: ['authority-body:yes', 'authority-face:yes'],
        missingSignals: [],
        driftingSignals: ['authority-motion:no', 'authority-lipsync:no'],
        reasons: [],
      },
      speechEmbodiment: {
        runtimeDynamics: {
          provenance: {
            runtimeChannel: 'active-dialogue',
            activeThreadId: 'runtime-thread-rest-1',
            scenario: 'coding',
            scene: 'coding',
          },
          eventPointers: {
            runtimeThreadId: 'runtime-thread-rest-1',
            governorDrive: 'protect',
            focusBeliefId: 'belief-rest-1',
            rationaleTags: [],
          },
        },
        recentDrivingTraceDetails: [],
      } as any,
    })

    expect(projection?.bodyContinuityPhase).toBe('body-carried-to-renderer-rejoin')
    expect(projection?.rendererRejoinSurfaceKey).toBe('authority:renderer-rejoin:vrm')
    expect(projection?.reasons).toContain('Body continuity still carries the same living segment while VRM manifestation rejoins it, so runtime continuity can explain the renderer recovery as the same digital life re-entering full embodiment instead of a new identity branch.')
  })

  it('keeps the concrete live2d rejoin surface visible in runtime continuity reasons', () => {
    const projection = buildSelfEvolutionRuntimeContinuityProjection({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'live2d',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'tired',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
        matchedSignals: ['authority-body:yes', 'authority-lipsync:yes'],
        missingSignals: [],
        driftingSignals: ['authority-face:no', 'authority-motion:no'],
        reasons: [],
      },
      speechEmbodiment: {
        runtimeDynamics: {
          provenance: {
            runtimeChannel: 'active-dialogue',
            activeThreadId: 'runtime-thread-live2d-1',
            scenario: 'coding',
            scene: 'coding',
          },
          eventPointers: {
            runtimeThreadId: 'runtime-thread-live2d-1',
            governorDrive: 'protect',
            focusBeliefId: 'belief-live2d-1',
            rationaleTags: [],
          },
        },
        recentDrivingTraceDetails: [],
      } as any,
    })

    expect(projection?.bodyContinuityPhase).toBe('body-carried-to-renderer-rejoin')
    expect(projection?.rendererRejoinSurfaceKey).toBe('authority:renderer-rejoin:live2d')
    expect(projection?.reasons).toContain('Body continuity still carries the same living segment while Live2D manifestation rejoins it, so runtime continuity can explain the renderer recovery as the same digital life re-entering full embodiment instead of a new identity branch.')
  })

  it('keeps the concrete speech rejoin surface visible in runtime continuity reasons', () => {
    const projection = buildSelfEvolutionRuntimeContinuityProjection({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: null,
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        runtimeProfile: 'steady-presence',
        runtimeBodyState: 'carried-forward',
        runtimeContinuityMode: 'speech-resident',
        runtimeResidentEmotion: 'steady',
        runtimeResidentDelivery: 'warm',
        runtimeResidentFacialCue: 'soft_focus',
        runtimeResidentActionCue: 'voice_hold',
        playbackCueFacialCue: null,
        playbackCueActionCue: 'voice_hold',
        driverFaceCue: null,
        driverActionCue: 'voice_hold',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:no',
        matchedSignals: ['authority-body:yes', 'authority-voice:yes'],
        missingSignals: [],
        driftingSignals: ['authority-face:no', 'authority-motion:no', 'authority-lipsync:no'],
        reasons: [],
      },
      speechEmbodiment: {
        runtimeDynamics: {
          provenance: {
            runtimeChannel: 'active-dialogue',
            activeThreadId: 'runtime-thread-speech-1',
            scenario: 'comfort',
            scene: 'comfort',
          },
          eventPointers: {
            runtimeThreadId: 'runtime-thread-speech-1',
            governorDrive: 'soothe',
            focusBeliefId: 'belief-speech-1',
            rationaleTags: ['comfort', 'continuity'],
          },
        },
        recentDrivingTraceDetails: [],
      } as any,
    })

    expect(projection?.bodyContinuityPhase).toBe('body-carried-to-renderer-rejoin')
    expect(projection?.rendererRejoinSurfaceKey).toBe('authority:renderer-rejoin:speech')
    expect(projection?.matchedSignals).toContain('authority-voice:yes')
    expect(projection?.reasons).toContain('Body continuity still carries the same living segment while speech manifestation rejoins it, so runtime continuity can explain the renderer recovery as the same digital life re-entering full embodiment instead of a new identity branch.')
  })

  it('falls back to generic manifestation wording when body continuity persists but the rejoining manifestation surface is still unknown', () => {
    const projection = buildSelfEvolutionRuntimeContinuityProjection({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: null,
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: null,
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'tired',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'body:yes face:yes motion:no lipsync:no',
        matchedSignals: ['authority-body:yes', 'authority-face:yes'],
        missingSignals: [],
        driftingSignals: ['authority-motion:no', 'authority-lipsync:no'],
        reasons: [],
      },
      speechEmbodiment: {
        runtimeDynamics: {
          provenance: {
            runtimeChannel: 'active-dialogue',
            activeThreadId: 'runtime-thread-generic-1',
            activeThreadTitle: 'generic manifestation carry',
            scenario: 'coding',
            scene: 'coding',
          },
          eventPointers: {
            runtimeThreadId: 'runtime-thread-generic-1',
            governorDrive: 'protect',
            governorIntentionId: 'governor-intention-generic-1',
            focusBeliefId: 'belief-generic-1',
            rationaleTags: ['continuity'],
          },
        },
        recentDrivingTraceRecord: null,
        recentDrivingTraceDetails: [],
      } as any,
    })

    expect(projection?.bodyContinuityPhase).toBe('body-carried-to-renderer-rejoin')
    expect(projection?.rendererRejoinSurfaceKey).toBeNull()
    expect(projection?.reasons).toContain('Body continuity still carries the same living segment while manifestation rejoins it, so runtime continuity can explain the renderer recovery as the same digital life re-entering full embodiment instead of a new identity branch.')
  })

  it('keeps the concrete renderer surface and same-her lock wording when body continuity has already entered full-cross-modal-lock', () => {
    const projection = buildSelfEvolutionRuntimeContinuityProjection({
      rendererAuthorityProjection: {
        status: 'grounded',
        rendererTarget: 'live2d',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        runtimeProfile: 'measured-return',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'same-thread-continuation',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'soft-gaze',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'soft-gaze',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'soft-gaze',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'body:yes face:yes motion:yes lipsync:yes',
        matchedSignals: [
          'authority-body:yes',
          'authority-face:yes',
          'authority-motion:yes',
          'authority-lipsync:yes',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      speechEmbodiment: {
        runtimeDynamics: {
          provenance: {
            runtimeChannel: 'active-dialogue',
            activeThreadId: 'runtime-thread-lock-1',
            activeThreadTitle: 'same segment lock',
            scenario: 'coding',
            scene: 'coding',
          },
          eventPointers: {
            runtimeThreadId: 'runtime-thread-lock-1',
            governorDrive: 'protect',
            governorIntentionId: 'governor-intention-lock-1',
            focusBeliefId: 'belief-lock-1',
            rationaleTags: ['continuity', 'lock'],
          },
        },
        recentDrivingTraceRecord: null,
        recentDrivingTraceDetails: [],
      } as any,
    })

    expect(projection?.bodyContinuityPhase).toBe('full-cross-modal-lock')
    expect(projection?.rendererRejoinSurfaceKey).toBe('authority:renderer-rejoin:live2d')
    expect(projection?.reasons).toContain(
      'Body continuity and Live2D manifestation are now locked back onto the same living segment together, so runtime continuity can explain the renderer recovery as one explicit same-her embodiment line instead of a temporary visual alignment.',
    )
  })

  it('keeps the concrete renderer surface and body-loss warning when renderer lanes rejoin without same-segment body carry', () => {
    const projection = buildSelfEvolutionRuntimeContinuityProjection({
      rendererAuthorityProjection: {
        status: 'drift',
        rendererTarget: 'vrm',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'tired',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'body:no face:yes motion:yes lipsync:yes',
        matchedSignals: [
          'authority-face:yes',
          'authority-motion:yes',
          'authority-lipsync:yes',
        ],
        missingSignals: [],
        driftingSignals: ['authority-body:no'],
        reasons: [],
      },
      speechEmbodiment: {
        runtimeDynamics: {
          provenance: {
            runtimeChannel: 'active-dialogue',
            activeThreadId: 'runtime-thread-body-loss-2',
            activeThreadTitle: 'visible recovery drift',
            scenario: 'coding',
            scene: 'coding',
          },
          eventPointers: {
            runtimeThreadId: 'runtime-thread-body-loss-2',
            governorDrive: 'protect',
            governorIntentionId: 'governor-intention-body-loss-2',
            focusBeliefId: 'belief-body-loss-2',
            rationaleTags: ['continuity', 'body-loss'],
          },
        },
        recentDrivingTraceRecord: null,
        recentDrivingTraceDetails: [],
      } as any,
    })

    expect(projection?.bodyContinuityPhase).toBe('renderer-rejoin-without-body')
    expect(projection?.rendererRejoinSurfaceKey).toBe('authority:renderer-rejoin:vrm')
    expect(projection?.reasons).toContain(
      'Renderer lanes have rejoined on VRM manifestation, but the body line is no longer carrying that same living segment, so runtime continuity should keep treating the visible recovery as same-her drift risk rather than a completed embodiment repair.',
    )
  })

  it('keeps lane-level renderer authority truth attached to runtime continuity when upstream summaries stay descriptive', () => {
    const projection = buildSelfEvolutionRuntimeContinuityProjection({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'vrm',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'tired',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: '上游 authority 命中',
        matchedSignals: ['authority-face:yes'],
        missingSignals: [],
        driftingSignals: ['authority-motion:no'],
        reasons: [],
      },
      speechEmbodiment: {
        runtimeDynamics: {
          profile: 'protective-watch',
          variationToken: 'presence-pulse|protective-watch',
          residentEmotion: 'tired',
          residentDelivery: 'gentle',
          residentFacialCue: 'focused',
          residentActionCue: 'observe_focus',
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
            selectedAction: 'observe_focus',
            personaBiasSummary: 'protective-watch favored due to late-night care pressure',
            personaOpeningGuidance: 'Open gently, but keep the opening bounded and real.',
            scene: 'coding',
            scenario: 'coding',
          },
          eventPointers: {
            recentTransition: null,
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
        recentDrivingTraceDetails: [],
      } as any,
    })

    expect(projection?.matchedSignals).toContain('authority-face:yes')
    expect(projection?.status).toBe('drift')
    expect(projection?.driftingSignals).toContain('authority-motion:no')
    expect(projection?.reasons).toContain('Renderer authority continuity still keeps 表情命中 / 动作未命中 / 口型未知 on the same life thread, so runtime continuity can explain which embodiment lane stayed bound and which one drifted without collapsing the whole digital-life thread into a fake identity break.')
  })

  it('carries a lipsync-plus-voice same-her lane from renderer authority into runtime continuity when voice is still on the active authority segment', () => {
    const projection = buildSelfEvolutionRuntimeContinuityProjection({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'vrm',
        runtimeProfile: 'measured-return',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'same-thread-continuation',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'soft-gaze',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'soft-gaze',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: null,
        driverActionCue: null,
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-voice-lane-1',
        matchedSignals: [
          'authority-lipsync:yes',
          'authority-voice:yes',
          'lane=lipsync+voice-only',
        ],
        missingSignals: [],
        driftingSignals: [
          'authority-face:no',
          'authority-motion:no',
        ],
        reasons: [],
      },
      speechEmbodiment: {
        runtimeDynamics: {
          profile: 'measured-return',
          variationToken: 'presence-pulse|measured-return',
          residentEmotion: 'thinking',
          residentDelivery: 'gentle',
          residentFacialCue: 'soft-gaze',
          residentActionCue: 'observe_focus',
          actionIntensity: 0.12,
          breathDrive: 0.24,
          focusDrive: 0.33,
          provenance: {
            watchMode: 'recovering',
            bodyState: 'settled',
            continuityMode: 'same-thread-continuation',
            thoughtStance: 'care',
            thoughtShouldSpeak: false,
            thoughtTension: 'measured-return',
            runtimeChannel: 'active-dialogue',
            runtimeSummary: 'same line still held',
            activeThreadId: 'runtime-thread-voice-lane-1',
            activeThreadTitle: 'callback afterglow',
            preferredPresence: 'gentle-watch',
            selectedAction: 'observe_focus',
            personaBiasSummary: null,
            personaOpeningGuidance: null,
            scene: 'coding',
            scenario: 'coding',
          },
          eventPointers: {
            recentTransition: null,
            rationaleTags: ['recovering'],
            focusBeliefId: 'belief-voice-lane-1',
            focusInquiryId: null,
            commitmentId: null,
            runtimeThreadId: 'runtime-thread-voice-lane-1',
            governorDrive: 'protect',
            governorIntentionId: 'governor-intention-voice-lane-1',
            selectedThoughtThreadId: null,
          },
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:voice-lane:1',
          activeThreadId: 'runtime-thread-voice-lane-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceDetails: [],
      } as any,
    })

    expect(projection?.matchedSignals).toContain('authority-voice:yes')
    expect(projection?.matchedSignals).toContain('lane=lipsync+voice-only')
    expect(projection?.reasons).toContain('Renderer authority continuity still keeps 表情未命中 / 动作未命中 / 口型命中 / 声音命中 on the same life thread, so runtime continuity can explain which embodiment lane stayed bound and which one drifted without collapsing the whole digital-life thread into a fake identity break.')
  })

  it('carries voice authority drift into runtime continuity when lipsync still matches the active authority segment', () => {
    const projection = buildSelfEvolutionRuntimeContinuityProjection({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'vrm',
        runtimeProfile: 'measured-return',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'same-thread-continuation',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'soft-gaze',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'soft-gaze',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: null,
        driverActionCue: null,
        authorityMatchSummary: 'face:no motion:no lipsync:yes voice:no',
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-voice-drift-1',
        matchedSignals: [
          'authority-lipsync:yes',
          'lane=lipsync-only',
        ],
        missingSignals: [],
        driftingSignals: [
          'authority-face:no',
          'authority-motion:no',
          'authority-voice:no',
        ],
        reasons: [],
      },
      speechEmbodiment: {
        runtimeDynamics: {
          profile: 'measured-return',
          variationToken: 'presence-pulse|measured-return',
          residentEmotion: 'thinking',
          residentDelivery: 'gentle',
          residentFacialCue: 'soft-gaze',
          residentActionCue: 'observe_focus',
          actionIntensity: 0.12,
          breathDrive: 0.24,
          focusDrive: 0.33,
          provenance: {
            watchMode: 'recovering',
            bodyState: 'settled',
            continuityMode: 'same-thread-continuation',
            thoughtStance: 'care',
            thoughtShouldSpeak: false,
            thoughtTension: 'measured-return',
            runtimeChannel: 'active-dialogue',
            runtimeSummary: 'same line still held while voice segment drifted',
            activeThreadId: 'runtime-thread-voice-drift-1',
            activeThreadTitle: 'callback afterglow',
            preferredPresence: 'gentle-watch',
            selectedAction: 'observe_focus',
            personaBiasSummary: null,
            personaOpeningGuidance: null,
            scene: 'coding',
            scenario: 'coding',
          },
          eventPointers: {
            recentTransition: null,
            rationaleTags: ['recovering', 'voice-drift'],
            focusBeliefId: 'belief-voice-drift-1',
            focusInquiryId: null,
            commitmentId: null,
            runtimeThreadId: 'runtime-thread-voice-drift-1',
            governorDrive: 'protect',
            governorIntentionId: 'governor-intention-voice-drift-1',
            selectedThoughtThreadId: null,
          },
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:voice-drift:1',
          activeThreadId: 'runtime-thread-voice-drift-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceDetails: [],
      } as any,
    })

    expect(projection?.status).toBe('drift')
    expect(projection?.matchedSignals).toContain('authority-lipsync:yes')
    expect(projection?.matchedSignals).toContain('lane=lipsync-only')
    expect(projection?.driftingSignals).toContain('authority-voice:no')
    expect(projection?.reasons).toContain('Renderer authority continuity still keeps 表情未命中 / 动作未命中 / 口型命中 / 声音未命中 on the same life thread, so runtime continuity can explain which embodiment lane stayed bound and which one drifted without collapsing the whole digital-life thread into a fake identity break.')
  })

  it('keeps audible body-carried same-her continuity visible in runtime continuity when body lipsync and voice still hold one living segment on VRM', () => {
    const projection = buildSelfEvolutionRuntimeContinuityProjection({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'vrm',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        runtimeProfile: 'measured-return',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'same-thread-continuation',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'soft-gaze',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'soft-gaze',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: null,
        driverActionCue: null,
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-audible-body-runtime-continuity-1',
        matchedSignals: [
          'authority-body:yes',
          'authority-lipsync:yes',
          'authority-voice:yes',
          'lane=lipsync+voice-only',
        ],
        missingSignals: [],
        driftingSignals: [
          'authority-face:no',
          'authority-motion:no',
        ],
        reasons: [],
      },
      speechEmbodiment: {
        runtimeDynamics: {
          profile: 'measured-return',
          variationToken: 'presence-pulse|measured-return',
          residentEmotion: 'thinking',
          residentDelivery: 'gentle',
          residentFacialCue: 'soft-gaze',
          residentActionCue: 'observe_focus',
          actionIntensity: 0.12,
          breathDrive: 0.24,
          focusDrive: 0.33,
          provenance: {
            watchMode: 'recovering',
            bodyState: 'settled',
            continuityMode: 'same-thread-continuation',
            thoughtStance: 'care',
            thoughtShouldSpeak: false,
            thoughtTension: 'measured-return',
            runtimeChannel: 'active-dialogue',
            runtimeSummary: 'same line still held',
            activeThreadId: 'runtime-thread-audible-body-runtime-continuity-1',
            activeThreadTitle: 'callback afterglow',
            preferredPresence: 'gentle-watch',
            selectedAction: 'observe_focus',
            personaBiasSummary: null,
            personaOpeningGuidance: null,
            scene: 'coding',
            scenario: 'coding',
          },
          eventPointers: {
            recentTransition: null,
            rationaleTags: ['recovering'],
            focusBeliefId: 'belief-audible-body-runtime-continuity-1',
            focusInquiryId: null,
            commitmentId: null,
            runtimeThreadId: 'runtime-thread-audible-body-runtime-continuity-1',
            governorDrive: 'protect',
            governorIntentionId: 'governor-intention-audible-body-runtime-continuity-1',
            selectedThoughtThreadId: null,
          },
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:audible-body-runtime-continuity:1',
          activeThreadId: 'runtime-thread-audible-body-runtime-continuity-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceDetails: [],
      } as any,
    })

    expect(projection?.bodyContinuityPhase).toBe('body-carried-to-renderer-rejoin')
    expect(projection?.rendererRejoinSurfaceKey).toBe('authority:renderer-rejoin:vrm')
    expect(projection?.matchedSignals).toContain('authority-body:yes')
    expect(projection?.matchedSignals).toContain('authority-lipsync:yes')
    expect(projection?.matchedSignals).toContain('authority-voice:yes')
    expect(projection?.matchedSignals).toContain('lane=lipsync+voice-only')
    expect(projection?.reasons).toContain('Body continuity still carries the same living segment while VRM manifestation rejoins it, so runtime continuity can explain the renderer recovery as the same digital life re-entering full embodiment instead of a new identity branch.')
    expect(projection?.reasons).toContain('Renderer authority continuity still keeps 表情未命中 / 动作未命中 / 口型命中 / 声音命中 on the same life thread, so runtime continuity can explain which embodiment lane stayed bound and which one drifted without collapsing the whole digital-life thread into a fake identity break.')
  })

  it('carries remaining-open lipsync and voice continuity into runtime continuity when body face and motion already rejoin on one segment', () => {
    const projection = buildSelfEvolutionRuntimeContinuityProjection({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'live2d',
        runtimeProfile: 'measured-return',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'same-thread-continuation',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'soft-gaze',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'soft-gaze',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'soft-gaze',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'body:yes face:yes motion:yes lipsync:no',
        matchedSignals: [
          'authority-body:yes',
          'authority-face:yes',
          'authority-motion:yes',
          'remaining-open=lipsync+voice',
        ],
        missingSignals: [],
        driftingSignals: [
          'authority-lipsync:no',
        ],
        reasons: [],
      },
      speechEmbodiment: {
        runtimeDynamics: {
          profile: 'measured-return',
          variationToken: 'presence-pulse|measured-return',
          residentEmotion: 'thinking',
          residentDelivery: 'gentle',
          residentFacialCue: 'soft-gaze',
          residentActionCue: 'observe_focus',
          actionIntensity: 0.12,
          breathDrive: 0.24,
          focusDrive: 0.33,
          provenance: {
            watchMode: 'recovering',
            bodyState: 'settled',
            continuityMode: 'same-thread-continuation',
            thoughtStance: 'care',
            thoughtShouldSpeak: false,
            thoughtTension: 'measured-return',
            runtimeChannel: 'active-dialogue',
            runtimeSummary: 'same line still held',
            activeThreadId: 'runtime-thread-body-face-motion-open-1',
            activeThreadTitle: 'callback afterglow',
            preferredPresence: 'gentle-watch',
            selectedAction: 'observe_focus',
            personaBiasSummary: null,
            personaOpeningGuidance: null,
            scene: 'coding',
            scenario: 'coding',
          },
          eventPointers: {
            recentTransition: null,
            rationaleTags: ['recovering'],
            focusBeliefId: 'belief-body-face-motion-open-1',
            focusInquiryId: null,
            commitmentId: null,
            runtimeThreadId: 'runtime-thread-body-face-motion-open-1',
            governorDrive: 'protect',
            governorIntentionId: 'governor-intention-body-face-motion-open-1',
            selectedThoughtThreadId: null,
          },
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:body-face-motion-open:1',
          activeThreadId: 'runtime-thread-body-face-motion-open-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceDetails: [],
      } as any,
    })

    expect(projection?.matchedSignals).toContain('authority-body:yes')
    expect(projection?.matchedSignals).toContain('authority-face:yes')
    expect(projection?.matchedSignals).toContain('authority-motion:yes')
    expect(projection?.matchedSignals).toContain('remaining-open=lipsync+voice')
    expect(projection?.driftingSignals).toContain('authority-lipsync:no')
  })

  it('carries a body-led same-her lane from renderer authority into runtime continuity when body still holds the living segment before face and motion return', () => {
    const projection = buildSelfEvolutionRuntimeContinuityProjection({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'vrm',
        runtimeProfile: 'measured-return',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'same-thread-continuation',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'soft-gaze',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'soft-gaze',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: null,
        driverActionCue: null,
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:unknown',
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.29 | mouth=0.31 | head=0.18 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-body-led-runtime-1',
        matchedSignals: [
          'authority-body:yes',
          'lane=body-only',
        ],
        missingSignals: [],
        driftingSignals: [
          'authority-face:no',
          'authority-motion:no',
        ],
        reasons: [],
      },
      speechEmbodiment: {
        runtimeDynamics: {
          profile: 'measured-return',
          variationToken: 'presence-pulse|measured-return',
          residentEmotion: 'thinking',
          residentDelivery: 'gentle',
          residentFacialCue: 'soft-gaze',
          residentActionCue: 'observe_focus',
          actionIntensity: 0.12,
          breathDrive: 0.24,
          focusDrive: 0.33,
          provenance: {
            watchMode: 'recovering',
            bodyState: 'settled',
            continuityMode: 'same-thread-continuation',
            thoughtStance: 'care',
            thoughtShouldSpeak: false,
            thoughtTension: 'measured-return',
            runtimeChannel: 'active-dialogue',
            runtimeSummary: 'same line still held',
            activeThreadId: 'runtime-thread-body-led-runtime-1',
            activeThreadTitle: 'callback afterglow',
            preferredPresence: 'gentle-watch',
            selectedAction: 'observe_focus',
            personaBiasSummary: null,
            personaOpeningGuidance: null,
            scene: 'coding',
            scenario: 'coding',
          },
          eventPointers: {
            recentTransition: null,
            rationaleTags: ['recovering'],
            focusBeliefId: 'belief-body-led-runtime-1',
            focusInquiryId: null,
            commitmentId: null,
            runtimeThreadId: 'runtime-thread-body-led-runtime-1',
            governorDrive: 'protect',
            governorIntentionId: 'governor-intention-body-led-runtime-1',
            selectedThoughtThreadId: null,
          },
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:body-led-runtime-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          activeThreadId: 'runtime-thread-body-led-runtime-1',
          suppressionTags: ['late-night-fatigue'],
        },
        recentDrivingTraceDetails: [],
      } as any,
    })

    expect(projection?.matchedSignals).toContain('authority-body:yes')
    expect(projection?.matchedSignals).toContain('lane=body-only')
    expect(projection?.driftingSignals).toContain('authority-face:no')
    expect(projection?.driftingSignals).toContain('authority-motion:no')
    expect(projection?.reasons).toContain('Renderer authority continuity still keeps 表情未命中 / 动作未命中 / 口型未知 on the same life thread, so runtime continuity can explain which embodiment lane stayed bound and which one drifted without collapsing the whole digital-life thread into a fake identity break.')
  })

  it('prefers an upstream runtime continuity trace embodiment summary when one is already projected', () => {
    const projection = buildSelfEvolutionRuntimeContinuityProjection({
      rendererAuthorityProjection: {
        status: 'grounded',
        rendererTarget: 'vrm',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'tired',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      speechEmbodiment: {
        runtimeDynamics: {
          profile: 'protective-watch',
          variationToken: 'presence-pulse|protective-watch',
          residentEmotion: 'tired',
          residentDelivery: 'gentle',
          residentFacialCue: 'focused',
          residentActionCue: 'observe_focus',
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
            selectedAction: 'observe_focus',
            personaBiasSummary: 'protective-watch favored due to late-night care pressure',
            personaOpeningGuidance: 'Open gently, but keep the opening bounded and real.',
            scene: 'coding',
            scenario: 'coding',
          },
          eventPointers: {
            recentTransition: null,
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
        recentDrivingTraceDetails: [
          {
            kind: 'governance-normalized',
            summary: 'turn=care | truth=live-grounded | repair=none',
            createdAt: 2_430,
            details: [
              { label: 'scenario', value: 'late-night-fatigue' },
              { label: 'stance', value: 'observe-first' },
              { label: 'sourceTrail', value: 'fatigue, care, grounded-recall' },
            ],
          },
        ],
      } as any,
      traceEmbodimentSummary: '上游轨迹摘要：中文优先 continuity explainability',
    })

    expect(projection?.traceEmbodimentSummary).toBe('上游轨迹摘要：中文优先 continuity explainability')
    expect(projection?.traceEmbodimentDisplaySummary).toBe('上游轨迹摘要：中文优先 continuity explainability')
    expect(projection?.reasons).toContain('Trace embodiment summary still closes the same care/grounded-recall line, so renderer authority is part of one continuous person-state rather than a fresh isolated output.')
  })

  it('enriches a sparse upstream generated trace embodiment summary with local trace detail context', () => {
    const projection = buildSelfEvolutionRuntimeContinuityProjection({
      rendererAuthorityProjection: {
        status: 'grounded',
        rendererTarget: 'vrm',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'tired',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      speechEmbodiment: {
        runtimeDynamics: {
          profile: 'protective-watch',
          variationToken: 'presence-pulse|protective-watch',
          residentEmotion: 'tired',
          residentDelivery: 'gentle',
          residentFacialCue: 'focused',
          residentActionCue: 'observe_focus',
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
            selectedAction: 'observe_focus',
            personaBiasSummary: 'protective-watch favored due to late-night care pressure',
            personaOpeningGuidance: 'Open gently, but keep the opening bounded and real.',
            scene: 'coding',
            scenario: 'coding',
          },
          eventPointers: {
            recentTransition: null,
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
        recentDrivingTraceDetails: [
          {
            kind: 'governance-normalized',
            summary: 'turn=care | truth=live-grounded | repair=none',
            createdAt: 2_430,
            details: [
              { label: 'scenario', value: 'late-night-fatigue' },
              { label: 'stance', value: 'observe-first' },
              { label: 'sourceTrail', value: 'fatigue, care, grounded-recall' },
            ],
          },
        ],
      } as any,
      traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
    })

    expect(projection?.traceEmbodimentSummary).toBe('turn=care | closure=grounded-recall | surface=procedural-carry | authority=none | execution=none | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall')
    expect(projection?.traceEmbodimentDisplaySummary).toBe('关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 无，实际执行 无，场景 深夜疲劳照看，姿态 先观察后表达，来源链 fatigue -> care -> grounded-recall')
  })

  it('carries VRM same-her frame drift from renderer authority into runtime continuity projection', () => {
    const projection = buildSelfEvolutionRuntimeContinuityProjection({
      rendererAuthorityProjection: {
        status: 'drift',
        rendererTarget: 'vrm',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'same-thread-continuation',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'soft-gaze',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'soft-gaze',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'soft-gaze',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'body:yes face:yes motion:yes lipsync:no voice:no',
        matchedSignals: ['authority-body:yes', 'authority-face:yes', 'authority-motion:yes'],
        missingSignals: [],
        driftingSignals: [
          'same-her-frame:lipsync',
          'same-her-frame:voice',
          'renderer-drift:drift | performance=segment-runtime-continuity-vrm-frame | speech=segment-stale-voice-line | active=body, face, motion, lipsync, voice | mismatch=lipsync, voice',
        ],
        reasons: [],
      },
      speechEmbodiment: {
        runtimeDynamics: {
          profile: 'protective-watch',
          variationToken: 'presence-pulse|protective-watch',
          residentEmotion: 'thinking',
          residentDelivery: 'gentle',
          residentFacialCue: 'soft-gaze',
          residentActionCue: 'observe_focus',
          actionIntensity: 0.1,
          breathDrive: 0.2,
          focusDrive: 0.3,
          provenance: {
            watchMode: 'recovering',
            bodyState: 'settled',
            continuityMode: 'same-thread-continuation',
            thoughtStance: 'care',
            thoughtShouldSpeak: false,
            thoughtTension: 'focused-flow',
            runtimeChannel: 'active-dialogue',
            runtimeSummary: 'same line still held',
            activeThreadId: 'runtime-thread-vrm-frame-drift-1',
            activeThreadTitle: 'same-her frame drift',
            preferredPresence: 'gentle-watch',
            selectedAction: 'observe_focus',
            personaBiasSummary: null,
            personaOpeningGuidance: null,
            scene: 'coding',
            scenario: 'coding',
          },
          eventPointers: {
            recentTransition: null,
            rationaleTags: [],
            focusBeliefId: null,
            focusInquiryId: null,
            commitmentId: null,
            runtimeThreadId: 'runtime-thread-vrm-frame-drift-1',
            governorDrive: 'protect',
            governorIntentionId: null,
            selectedThoughtThreadId: null,
          },
        },
      } as any,
    })

    expect(projection?.status).toBe('drift')
    expect(projection?.driftingSignals).toContain('same-her-frame:lipsync')
    expect(projection?.driftingSignals).toContain('same-her-frame:voice')
    expect(projection?.reasons).toContain('Runtime continuity still carries same-her frame drift signals same-her-frame:lipsync, same-her-frame:voice, so the current repair loop can keep the voice/lipsync mismatch attached to one digital-life thread instead of treating it as a separate renderer branch.')
  })

  it('carries Live2D same-her execution drift from renderer authority into runtime continuity projection', () => {
    const projection = buildSelfEvolutionRuntimeContinuityProjection({
      rendererAuthorityProjection: {
        status: 'drift',
        rendererTarget: 'live2d',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'same-thread-continuation',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'soft-gaze',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'soft-gaze',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'soft-gaze',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'face:yes motion:yes lipsync:no',
        matchedSignals: ['authority-face:yes', 'authority-motion:yes'],
        missingSignals: [],
        driftingSignals: [
          'same-her-execution:lipsync',
          'renderer-drift:drift | authority=segment-runtime-continuity-live2d-execution | active=face, motion, lipsync | mismatch=lipsync',
        ],
        reasons: [],
      },
      speechEmbodiment: {
        runtimeDynamics: {
          profile: 'protective-watch',
          variationToken: 'presence-pulse|protective-watch',
          residentEmotion: 'thinking',
          residentDelivery: 'gentle',
          residentFacialCue: 'soft-gaze',
          residentActionCue: 'observe_focus',
          actionIntensity: 0.1,
          breathDrive: 0.2,
          focusDrive: 0.3,
          provenance: {
            watchMode: 'recovering',
            bodyState: 'settled',
            continuityMode: 'same-thread-continuation',
            thoughtStance: 'care',
            thoughtShouldSpeak: false,
            thoughtTension: 'focused-flow',
            runtimeChannel: 'active-dialogue',
            runtimeSummary: 'same line still held',
            activeThreadId: 'runtime-thread-live2d-execution-drift-1',
            activeThreadTitle: 'same-her execution drift',
            preferredPresence: 'gentle-watch',
            selectedAction: 'observe_focus',
            personaBiasSummary: null,
            personaOpeningGuidance: null,
            scene: 'coding',
            scenario: 'coding',
          },
          eventPointers: {
            recentTransition: null,
            rationaleTags: [],
            focusBeliefId: null,
            focusInquiryId: null,
            commitmentId: null,
            runtimeThreadId: 'runtime-thread-live2d-execution-drift-1',
            governorDrive: 'protect',
            governorIntentionId: null,
            selectedThoughtThreadId: null,
          },
        },
      } as any,
    })

    expect(projection?.status).toBe('drift')
    expect(projection?.driftingSignals).toContain('same-her-execution:lipsync')
    expect(projection?.reasons).toContain('Runtime continuity still carries same-her execution drift signals same-her-execution:lipsync, so the current repair loop can keep the Live2D execution mismatch attached to one digital-life thread instead of treating it as a separate renderer branch.')
  })
})
