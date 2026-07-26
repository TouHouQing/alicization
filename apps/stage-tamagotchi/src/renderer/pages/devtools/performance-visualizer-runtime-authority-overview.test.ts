import { describe, expect, it } from 'vitest'

import { buildRuntimeAuthorityOverview } from './performance-visualizer-runtime-authority-overview'

describe('performance visualizer runtime authority overview', () => {
  it('surfaces top-level authority mismatch summary for the current renderer diagnostics snapshot', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        recentDrivingEvent: {
          kind: 'person-state-updated',
          decisionTraceId: 'mind:rest:1',
          summary: 'protective-watch settled after fatigue pressure rose',
          createdAt: 2468,
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
            createdAt: 2430,
          },
          {
            kind: 'person-state-updated',
            summary: 'protective-watch settled after fatigue pressure rose',
            createdAt: 2468,
          },
        ],
        playbackTelemetry: {
          rendererTarget: 'vrm',
          prosodyAuthority: {
            segmentId: 'segment-zh-1',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.35,
            cueMouthWeight: 0.35,
            cueHeadWeight: 0.32,
            visemePeakWeight: 0.75,
          },
          driverAuthority: {
            segmentId: 'segment-zh-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-zh-1',
        authoritySegmentId: 'segment-zh-1',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authoritySources: ['prosody-authority'],
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-zh-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync-only',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
      traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=none | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
    })

    expect(overview).toEqual({
      rendererTarget: 'vrm',
      authoritySegmentId: 'segment-zh-1',
      authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only',
      authorityMatchSummary: 'face:no motion:no lipsync:yes',
      authorityTrustSummary: 'VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。',
      bodyContinuitySummary: null,
      embodimentClosureStage: null,
      preferredBlinkCadence: null,
      preferredGazeMode: null,
      bodySegmentMatched: null,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: null,
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
      authorityMismatchReasonSummary: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。',
      authorityMismatchDisplay: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。',
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-zh-1',
      summaryEntries: [
        { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
        { key: 'authority-segment', label: '权威片段', value: 'segment-zh-1' },
        {
          key: 'authority-binding',
          label: '权威绑定',
          value: '目标 VRM，驱动 口型，来源 prosody-authority，命中 表情未命中 / 动作未命中 / 口型命中，当前仅剩口型维持同一段连续性',
          technicalValue: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only',
        },
        {
          key: 'authority-match',
          label: '绑定命中',
          value: '表情未命中 / 动作未命中 / 口型命中',
          technicalValue: 'face:no motion:no lipsync:yes',
        },
        { key: 'authority-trust', label: '权威可信性', value: 'VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。' },
        {
          key: 'prosody-authority',
          label: '韵律权威',
          value: '模式 energy-phoneme-hybrid，韵律 0.35，口部 0.35，头部 0.32，峰值口型 0.75，权威绑定，来源 韵律权威，片段 segment-zh-1',
          technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-zh-1',
        },
        { key: 'authority-mismatch', label: '权威漂移', value: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。' },
        {
          key: 'settle-authority',
          label: '稳定段归因',
          value: 'authority-bound，片段 segment-zh-1，目标 VRM，驱动 口型，来源 prosody-authority，当前仅剩口型维持同一段连续性',
          technicalValue: 'authority-bound | segment=segment-zh-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync-only',
        },
      ],
      traceSummary: {
        cueId: 'segment-zh-1',
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
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bodySegmentMatched: null,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
      },
      traceSummaryEntries: [
        { key: 'trace-id', label: '决策轨迹', value: 'mind:rest:1' },
        { key: 'turn-mode', label: '回合模式', value: 'care' },
        { key: 'truth-state', label: '真值状态', value: 'live-grounded' },
        { key: 'repair-state', label: '修复状态', value: 'none' },
        { key: 'surface-policy', label: '表面策略', value: 'procedural-carry' },
        { key: 'closure-state', label: '收口状态', value: 'grounded-recall' },
        { key: 'thread-id', label: '运行线程', value: 'runtime-thread-rest-1' },
        { key: 'suppression-tags', label: '抑制标签', value: 'late-night-fatigue' },
        { key: 'binding-state', label: '绑定状态', value: 'matched' },
        { key: 'binding-target', label: '绑定目标', value: 'vrm' },
        { key: 'binding-drivers', label: '命中驱动', value: 'lipsync' },
        { key: 'binding-sources', label: '命中来源', value: 'prosody-authority' },
        { key: 'trace-embodiment', label: '轨迹落点', value: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 口型，实际执行 无，场景 深夜疲劳照看，姿态 先观察后表达，来源链 fatigue -> care -> grounded-recall', technicalValue: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=none | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall' },
        { key: 'latest-event', label: '最近事件', value: 'protective-watch settled after fatigue pressure rose' },
      ],
      settleAuthoritySummary: 'authority-bound | segment=segment-zh-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync-only',
      traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=none | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
    })
  })

  it('returns null when runtime speech telemetry has no authority signal', () => {
    expect(buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: null,
      } as any,
      playbackCueAuthorityView: null,
    })).toBeNull()
  })

  it('prefers driver authority prosody metadata when top-level runtime prosody telemetry is absent', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: {
          rendererTarget: 'vrm',
          prosodyAuthority: null,
          driverAuthority: {
            segmentId: 'segment-driver-runtime-native',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
            prosodyAuthority: {
              segmentId: 'segment-driver-runtime-native',
              provenance: 'authority-bound',
              source: 'prosody-authority',
              mode: 'energy-phoneme-hybrid',
              cueProsodyWeight: 0.35,
              cueMouthWeight: 0.35,
              cueHeadWeight: 0.32,
              visemePeakWeight: 0.75,
            },
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-driver-runtime-native',
        authoritySegmentId: 'segment-driver-runtime-native',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authoritySources: ['prosody-authority'],
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-driver-runtime-native | target=vrm | drivers=lipsync | sources=prosody-authority',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
    })

    expect(overview?.prosodyAuthoritySummary).toBe(
      'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-driver-runtime-native',
    )
    expect(overview?.authorityTrustSummary).toBe('VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。')
  })

  it('prefers current playback cue prosody authority over stale top-level runtime telemetry when the living segment has already rethreaded', () => {
    const cueId = 'segment-runtime-current-playback-prosody'
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: {
          rendererTarget: 'vrm',
          prosodyAuthority: {
            segmentId: 'segment-runtime-stale-top-level-prosody',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'stale-top-level',
            cueProsodyWeight: 0.13,
            cueMouthWeight: 0.1,
            cueHeadWeight: 0.08,
            visemePeakWeight: 0.26,
          },
          driverAuthority: {
            segmentId: cueId,
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId,
        authoritySegmentId: cueId,
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authoritySources: ['prosody-authority'],
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync+voice-only',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        authorityTrustSummary: null,
        prosodyAuthoritySummary: `mode=energy-phoneme-hybrid | prosody=0.37 | mouth=0.33 | head=0.25 | visemePeak=0.79 | provenance=authority-bound | source=prosody-authority | segment=${cueId}`,
        settleAuthoritySummary: `authority-bound | segment=${cueId} | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync+voice-only`,
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
    })

    expect(overview?.authoritySegmentId).toBe(cueId)
    expect(overview?.prosodyAuthoritySummary).toBe(
      `mode=energy-phoneme-hybrid | prosody=0.37 | mouth=0.33 | head=0.25 | visemePeak=0.79 | provenance=authority-bound | source=prosody-authority | segment=${cueId}`,
    )
    expect(overview?.summaryEntries).toContainEqual({
      key: 'prosody-authority',
      label: '韵律权威',
      value: '模式 energy-phoneme-hybrid，韵律 0.37，口部 0.33，头部 0.25，峰值口型 0.79，权威绑定，来源 韵律权威，片段 segment-runtime-current-playback-prosody',
      technicalValue: `mode=energy-phoneme-hybrid | prosody=0.37 | mouth=0.33 | head=0.25 | visemePeak=0.79 | provenance=authority-bound | source=prosody-authority | segment=${cueId}`,
    })
  })

  it('surfaces embodiment closure stage in overview summary entries when only the quieter body+lipsync identity-continuity', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: {
          rendererTarget: 'live2d',
          driverAuthority: {
            segmentId: 'segment-runtime-audible-body-closure',
            rendererTarget: 'live2d',
            matchedDrivers: ['body', 'lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-runtime-audible-body-closure',
        authoritySegmentId: 'segment-runtime-audible-body-closure',
        authorityRendererTarget: 'live2d',
        authorityMatchedDrivers: ['body', 'lipsync'],
        authoritySources: ['prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=live2d | drivers=body, lipsync | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch | closure=body-carried-to-renderer-rejoin',
        authorityMismatchReasonSummary: 'the resident body lane is still holding together with one other embodiment lane while face and motion have not rejoined yet | closure=body-carried-to-renderer-rejoin',
        authorityMismatchDisplay: 'the resident body lane is still holding together with one other embodiment lane while face and motion have not rejoined yet | closure=body-carried-to-renderer-rejoin',
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-audible-body-closure | target=live2d | drivers=body, lipsync | sources=prosody-authority | lane=body+lipsync-only',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
        bodyContinuitySummary: 'mode=thinking | stillness=0.72 | gaze=0.58 | breath=0.28 | expressivity=0.14 | resident=measured-return | timing=body-lipsync-carry | blink=linger | gazeMode=soften | seg=segment-runtime-audible-body-closure',
      } as any,
    })

    expect(overview?.embodimentClosureStage).toBe('body-carried-to-renderer-rejoin')
    expect(overview?.summaryEntries).toContainEqual({
      key: 'embodiment-closure-stage',
      label: '闭环阶段',
      value: 'body-carried-to-renderer-rejoin',
    })
  })

  it('surfaces body-carried-to-renderer-rejoin as the active embodiment closure stage when playback cue authority already carries the structured same-her body continuity phase', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-runtime-body-rejoin-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['body', 'lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-runtime-body-rejoin-1',
        authoritySegmentId: 'segment-runtime-body-rejoin-1',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['body', 'lipsync'],
        authoritySources: ['prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:yes | lane=body-carried-to-renderer-rejoin',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-body-rejoin-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority | lane=body-carried-to-renderer-rejoin',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
        bodyContinuitySummary: 'mode=thinking | stillness=0.68 | gaze=0.54 | breath=0.33 | expressivity=0.12 | resident=measured-return | timing=same-thread-continuation | blink=linger | gazeMode=soften | seg=segment-runtime-body-rejoin-1',
      } as any,
    })

    expect(overview?.embodimentClosureStage).toBe('body-carried-to-renderer-rejoin')
    expect(overview?.summaryEntries).toContainEqual({
      key: 'embodiment-closure-stage',
      label: '闭环阶段',
      value: 'body-carried-to-renderer-rejoin',
    })
  })

  it('surfaces full-cross-modal-lock as the active embodiment closure stage when playback cue authority already carries the structured same-her lock phase', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: {
          rendererTarget: 'live2d',
          driverAuthority: {
            segmentId: 'segment-runtime-lock-1',
            rendererTarget: 'live2d',
            matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            bodySegmentMatched: true,
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-runtime-lock-1',
        authoritySegmentId: 'segment-runtime-lock-1',
        authorityRendererTarget: 'live2d',
        authorityMatchedDrivers: ['body', 'face', 'motion', 'lipsync'],
        authoritySources: ['prosody-authority', 'timeline-projection'],
        bodySegmentMatched: true,
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=live2d | drivers=body, face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=body:yes face:yes motion:yes lipsync:yes | lane=full-cross-modal-lock',
        authorityMatchSummary: 'body:yes face:yes motion:yes lipsync:yes',
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-lock-1 | target=live2d | drivers=body, face, motion, lipsync | sources=prosody-authority, timeline-projection | lane=full-cross-modal-lock',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
        bodyContinuitySummary: 'mode=thinking | stillness=0.72 | gaze=0.58 | breath=0.28 | expressivity=0.14 | resident=measured-return | timing=same-thread-continuation | blink=linger | gazeMode=soften | seg=segment-runtime-lock-1',
      } as any,
    })

    expect(overview?.embodimentClosureStage).toBe('full-cross-modal-lock')
    expect(overview?.summaryEntries).toContainEqual({
      key: 'embodiment-closure-stage',
      label: '闭环阶段',
      value: 'full-cross-modal-lock',
    })
  })

  it('surfaces renderer-rejoin-without-body as the active embodiment closure stage when playback cue authority already carries the structured body-loss phase', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-runtime-body-loss-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            bodySegmentMatched: false,
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-runtime-body-loss-1',
        authoritySegmentId: 'segment-runtime-body-loss-1',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        authoritySources: ['prosody-authority', 'timeline-projection'],
        bodySegmentMatched: false,
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=body:no face:yes motion:yes lipsync:yes | lane=renderer-rejoin-without-body',
        authorityMatchSummary: 'body:no face:yes motion:yes lipsync:yes',
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-body-loss-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | lane=renderer-rejoin-without-body',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
        bodyContinuitySummary: 'mode=thinking | stillness=0.61 | gaze=0.49 | breath=0.24 | expressivity=0.19 | resident=measured-return | timing=same-thread-continuation | blink=linger | gazeMode=soften | seg=segment-runtime-body-loss-1',
      } as any,
    })

    expect(overview?.embodimentClosureStage).toBe('renderer-rejoin-without-body')
    expect(overview?.summaryEntries).toContainEqual({
      key: 'embodiment-closure-stage',
      label: '闭环阶段',
      value: 'renderer-rejoin-without-body',
    })
  })

  it('treats face+lipsync-only and motion+lipsync-only playback carry as the same renderer-rejoin-without-body body-loss phase in runtime authority overview', () => {
    const cases = [
      {
        cueId: 'segment-runtime-face-lipsync-body-loss-1',
        rendererTarget: 'live2d' as const,
        matchedDrivers: ['face', 'lipsync'] as const,
        matchedSources: ['prosody-authority'] as const,
        matchSummary: 'body:no face:yes motion:no lipsync:yes',
        lane: 'face+lipsync-only',
        bodySegmentMatched: false,
        faceSegmentMatched: true,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
      },
      {
        cueId: 'segment-runtime-motion-lipsync-body-loss-1',
        rendererTarget: 'vrm' as const,
        matchedDrivers: ['motion', 'lipsync'] as const,
        matchedSources: ['prosody-authority'] as const,
        matchSummary: 'body:no face:no motion:yes lipsync:yes',
        lane: 'motion+lipsync-only',
        bodySegmentMatched: false,
        faceSegmentMatched: false,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
      },
    ] as const

    for (const testCase of cases) {
      const overview = buildRuntimeAuthorityOverview({
        speechEmbodiment: {
          playbackTelemetry: {
            rendererTarget: testCase.rendererTarget,
            driverAuthority: {
              segmentId: testCase.cueId,
              rendererTarget: testCase.rendererTarget,
              matchedDrivers: [...testCase.matchedDrivers],
              sources: [...testCase.matchedSources],
              bodySegmentMatched: testCase.bodySegmentMatched,
              faceSegmentMatched: testCase.faceSegmentMatched,
              motionSegmentMatched: testCase.motionSegmentMatched,
              lipsyncSegmentMatched: testCase.lipsyncSegmentMatched,
            },
          },
        } as any,
        playbackCueAuthorityView: {
          cueId: testCase.cueId,
          authoritySegmentId: testCase.cueId,
          authorityRendererTarget: testCase.rendererTarget,
          authorityMatchedDrivers: [...testCase.matchedDrivers],
          authoritySources: [...testCase.matchedSources],
          bodySegmentMatched: testCase.bodySegmentMatched,
          faceSegmentMatched: testCase.faceSegmentMatched,
          motionSegmentMatched: testCase.motionSegmentMatched,
          lipsyncSegmentMatched: testCase.lipsyncSegmentMatched,
          authorityBindingSummary: `target=${testCase.rendererTarget} | drivers=${testCase.matchedDrivers.join(', ')} | sources=${testCase.matchedSources.join(', ')} | matches=${testCase.matchSummary} | lane=${testCase.lane}`,
          authorityMatchSummary: testCase.matchSummary,
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          settleAuthoritySummary: `authority-bound | segment=${testCase.cueId} | target=${testCase.rendererTarget} | drivers=${testCase.matchedDrivers.join(', ')} | sources=${testCase.matchedSources.join(', ')} | lane=${testCase.lane}`,
          preferredExpressionAliases: [],
          preferredMotionAliases: [],
          live2dFacialReleaseMs: null,
          live2dMotionFollowThroughMs: null,
          vrmActionFadeMs: null,
          vrmExpressionBlendMs: null,
          bodyContinuitySummary: 'mode=thinking | stillness=0.61 | gaze=0.49 | breath=0.24 | expressivity=0.19 | resident=measured-return | timing=same-thread-continuation | blink=linger | gazeMode=soften | seg=segment-body-loss-alias',
        } as any,
      })

      expect(overview?.embodimentClosureStage).toBe('renderer-rejoin-without-body')
      expect(overview?.summaryEntries).toContainEqual({
        key: 'embodiment-closure-stage',
        label: '闭环阶段',
        value: 'renderer-rejoin-without-body',
      })
    }
  })

  it('prefers normalized playback cue embodiment closure stage over re-parsing body continuity text when identity-continuity', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-runtime-structured-closure-stage-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['body'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-runtime-structured-closure-stage-1',
        authoritySegmentId: 'segment-runtime-structured-closure-stage-1',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['body'],
        authoritySources: ['prosody-authority'],
        bodyContinuitySummary: 'mode=thinking | stillness=0.68 | gaze=0.54 | breath=0.33 | expressivity=0.12 | resident=measured-return | timing=same-thread-continuation | blink=linger | gazeMode=soften | seg=segment-runtime-structured-closure-stage-1',
        embodimentClosureStage: 'audible-body-carry',
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: false,
        authorityBindingSummary: 'target=vrm | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no | lane=body-only',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:no',
        authorityTrustSummary: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
        prosodyAuthoritySummary: null,
        traceEmbodimentSummary: null,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-structured-closure-stage-1 | target=vrm | drivers=body | sources=prosody-authority | lane=body-only',
        summaryEntries: [],
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      } as any,
    })

    expect(overview?.embodimentClosureStage).toBe('audible-body-carry')
    expect(overview?.summaryEntries).toContainEqual({
      key: 'embodiment-closure-stage',
      label: '闭环阶段',
      value: 'audible-body-carry',
    })
  })

  it('keeps repair-before-closeness trust visible when playback cue authority already carries the quieter blink and softened gaze line', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: {
          rendererTarget: 'vrm',
          prosodyAuthority: {
            segmentId: 'segment-runtime-repair-first',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.24,
            cueMouthWeight: 0.2,
            cueHeadWeight: 0.18,
            visemePeakWeight: 0.74,
          },
          driverAuthority: {
            segmentId: 'segment-runtime-repair-first',
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-runtime-repair-first',
        authoritySegmentId: 'segment-runtime-repair-first',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        authoritySources: ['prosody-authority', 'timeline-projection'],
        authorityTrustSummary: 'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。',
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-repair-first | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
    })

    expect(overview?.authorityTrustSummary).toBe('VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。')
    expect(overview?.summaryEntries).toContainEqual({
      key: 'authority-trust',
      label: '权威可信性',
      value: 'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。',
    })
  })

  it('keeps same-turn-if-invited measured-return trust visible when runtime authority overview reads playback cue callback-line guidance', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: {
          rendererTarget: 'vrm',
          prosodyAuthority: {
            segmentId: 'segment-runtime-invited-measured-return',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.22,
            cueMouthWeight: 0.2,
            cueHeadWeight: 0.18,
            visemePeakWeight: 0.7,
          },
          driverAuthority: {
            segmentId: 'segment-runtime-invited-measured-return',
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-runtime-invited-measured-return',
        authoritySegmentId: 'segment-runtime-invited-measured-return',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        authoritySources: ['prosody-authority', 'timeline-projection'],
        authorityTrustSummary: 'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-invited-measured-return | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: 280,
        vrmExpressionBlendMs: 360,
      },
    })

    expect(overview?.authorityTrustSummary).toBe('VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。')
    expect(overview?.summaryEntries).toContainEqual({
      key: 'authority-trust',
      label: '权威可信性',
      value: 'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。',
    })
  })

  it('prefers snapshot-native authority summaries when speech embodiment already carries them', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-summary-native',
          segmentId: 'segment-summary-native',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityMismatchSummary: 'face-mismatch, motion-mismatch',
          authorityMismatchReasonSummary: '上游 authority reason：表情与动作已经偏离绑定片段。',
          authorityMismatchDisplay: '上游 authority 展示：当前仍在同一主线程里，但表情与动作落点已经和绑定片段分叉。',
          settleSummary: '上游 authority settle',
          traceEmbodimentSummary: '上游轨迹落点摘要',
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:rest:1',
          activeThreadId: 'runtime-thread-rest-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          prosodyAuthority: {
            segmentId: 'segment-summary-native',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.35,
            cueMouthWeight: 0.35,
            cueHeadWeight: 0.32,
            visemePeakWeight: 0.75,
          },
          driverAuthority: {
            segmentId: 'segment-summary-native',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: null,
    })

    expect(overview).toEqual({
      rendererTarget: 'vrm',
      authoritySegmentId: 'segment-summary-native',
      authorityBindingSummary: '上游 authority 绑定 | 表情未命中 / 动作未命中 / 口型命中',
      authorityMatchSummary: '上游 authority 命中 | 表情未命中 / 动作未命中 / 口型命中',
      authorityTrustSummary: 'VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。',
      bodyContinuitySummary: null,
      embodimentClosureStage: null,
      preferredBlinkCadence: null,
      preferredGazeMode: null,
      bodySegmentMatched: null,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: null,
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
      authorityMismatchReasonSummary: '上游 authority reason：表情与动作已经偏离绑定片段。',
      authorityMismatchDisplay: '上游 authority 展示：当前仍在同一主线程里，但表情与动作落点已经和绑定片段分叉。',
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-summary-native',
      settleAuthoritySummary: '上游 authority settle',
      traceEmbodimentSummary: '上游轨迹落点摘要',
      summaryEntries: [
        { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
        { key: 'authority-segment', label: '权威片段', value: 'segment-summary-native' },
        { key: 'authority-binding', label: '权威绑定', value: '上游 authority 绑定 | 表情未命中 / 动作未命中 / 口型命中' },
        { key: 'authority-match', label: '绑定命中', value: '上游 authority 命中 | 表情未命中 / 动作未命中 / 口型命中' },
        { key: 'authority-trust', label: '权威可信性', value: 'VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。' },
        { key: 'prosody-authority', label: '韵律权威', value: '模式 energy-phoneme-hybrid，韵律 0.35，口部 0.35，头部 0.32，峰值口型 0.75，权威绑定，来源 韵律权威，片段 segment-summary-native', technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-summary-native' },
        { key: 'authority-mismatch', label: '权威漂移', value: '上游 authority 展示：当前仍在同一主线程里，但表情与动作落点已经和绑定片段分叉。' },
        { key: 'settle-authority', label: '稳定段归因', value: '上游 authority settle' },
      ],
      traceSummary: {
        cueId: 'segment-summary-native',
        decisionTraceId: 'mind:rest:1',
        turnMode: 'care',
        truthState: 'live-grounded',
        repairState: 'none',
        finalSurfacePolicy: 'procedural-carry',
        closureState: 'grounded-recall',
        activeThreadId: 'runtime-thread-rest-1',
        suppressionTags: [],
        latestEventSummary: null,
        segmentBinding: {
          matched: true,
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bodySegmentMatched: null,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
      },
      traceSummaryEntries: [
        { key: 'trace-id', label: '决策轨迹', value: 'mind:rest:1' },
        { key: 'turn-mode', label: '回合模式', value: 'care' },
        { key: 'truth-state', label: '真值状态', value: 'live-grounded' },
        { key: 'repair-state', label: '修复状态', value: 'none' },
        { key: 'surface-policy', label: '表面策略', value: 'procedural-carry' },
        { key: 'closure-state', label: '收口状态', value: 'grounded-recall' },
        { key: 'thread-id', label: '运行线程', value: 'runtime-thread-rest-1' },
        { key: 'binding-state', label: '绑定状态', value: 'matched' },
        { key: 'binding-target', label: '绑定目标', value: 'vrm' },
        { key: 'binding-drivers', label: '命中驱动', value: 'lipsync' },
        { key: 'binding-sources', label: '命中来源', value: 'prosody-authority' },
        { key: 'trace-embodiment', label: '轨迹落点', value: '上游轨迹落点摘要', technicalValue: undefined },
      ],
    })
  })

  it('keeps voice visible inside descriptive upstream authority summaries when the same segment still survives through lipsync and voice together', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-summary-native-voice-1',
          segmentId: 'segment-summary-native-voice-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityMismatchSummary: 'face-mismatch, motion-mismatch',
          authorityMismatchReasonSummary: '上游 authority reason：表情与动作已经偏离绑定片段。',
          authorityMismatchDisplay: '上游 authority 展示：当前仍在同一主线程里，但表情与动作落点已经和绑定片段分叉。',
          settleSummary: '上游 authority settle',
          traceEmbodimentSummary: '上游轨迹落点摘要',
        },
        speechEvidence: {
          voiceSummary: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-summary-native-voice-1 | source=prosody-authority',
          bodyContinuitySummary: null,
          authorityMatchSummary: 'face:no motion:no lipsync:yes',
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: true,
          personaStyleSummary: null,
          prosodyAuthoritySummary: null,
          timingSummary: null,
          driverExecutionSummary: null,
          visemeHintsSummary: null,
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:rest:voice:1',
          activeThreadId: 'runtime-thread-rest-voice-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          prosodyAuthority: {
            segmentId: 'segment-summary-native-voice-1',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.35,
            cueMouthWeight: 0.35,
            cueHeadWeight: 0.32,
            visemePeakWeight: 0.75,
          },
          driverAuthority: {
            segmentId: 'segment-summary-native-voice-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: null,
    })

    expect(overview?.authorityBindingSummary).toBe('上游 authority 绑定 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中')
    expect(overview?.authorityMatchSummary).toBe('上游 authority 命中 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中')
    expect(overview?.summaryEntries).toContainEqual({
      key: 'authority-binding',
      label: '权威绑定',
      value: '上游 authority 绑定 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中',
    })
    expect(overview?.summaryEntries).toContainEqual({
      key: 'authority-match',
      label: '绑定命中',
      value: '上游 authority 命中 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中',
    })
  })

  it('preserves body-backed upstream authority summaries so overview keeps identity-continuity', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-summary-body-native',
          segmentId: 'segment-summary-body-native',
          rendererTarget: 'vrm',
          matchedDrivers: ['body'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          settleSummary: '上游 authority settle',
          authorityMismatchSummary: 'face-mismatch, motion-mismatch, lipsync-mismatch',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-summary-body-native',
            rendererTarget: 'vrm',
            matchedDrivers: ['body'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
          },
        },
      } as any,
      playbackCueAuthorityView: null,
    })

    expect(overview?.authorityBindingSummary).toBe('上游 authority 绑定 | 身体命中 / 表情未命中 / 动作未命中 / 口型未命中')
    expect(overview?.authorityMatchSummary).toBe('上游 authority 命中 | 身体命中 / 表情未命中 / 动作未命中 / 口型未命中')
    expect(overview?.summaryEntries).toContainEqual({
      key: 'authority-binding',
      label: '权威绑定',
      value: '上游 authority 绑定 | 身体命中 / 表情未命中 / 动作未命中 / 口型未命中',
    })
    expect(overview?.summaryEntries).toContainEqual({
      key: 'authority-match',
      label: '绑定命中',
      value: '上游 authority 命中 | 身体命中 / 表情未命中 / 动作未命中 / 口型未命中',
    })
  })

  it('keeps upstream body continuity visible on runtime authority overview when playback cue authority already carries the same-body-line evidence', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-runtime-body-continuity-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['body'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-runtime-body-continuity-1',
        authoritySegmentId: 'segment-runtime-body-continuity-1',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['body'],
        authoritySources: ['prosody-authority'],
        bodyContinuitySummary: 'mode=thinking | stillness=0.68 | gaze=0.54 | breath=0.33 | expressivity=0.12 | resident=measured-return | timing=same-thread-continuation | blink=linger | gazeMode=soften | seg=segment-runtime-body-continuity-1',
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: false,
        authorityBindingSummary: 'target=vrm | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no | lane=body-only',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:no',
        authorityTrustSummary: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
        prosodyAuthoritySummary: null,
        traceEmbodimentSummary: null,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-body-continuity-1 | target=vrm | drivers=body | sources=prosody-authority | lane=body-only',
        summaryEntries: [],
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
    })

    expect(overview?.bodyContinuitySummary).toBe('mode=thinking | stillness=0.68 | gaze=0.54 | breath=0.33 | expressivity=0.12 | resident=measured-return | timing=same-thread-continuation | blink=linger | gazeMode=soften | seg=segment-runtime-body-continuity-1')
    expect(overview?.authorityTrustSummary).toContain('身体线继续托住')
  })

  it('derives body-backed trust with cadence guidance when local runtime authority still relies on the body line', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        driverSummary: {
          rendererTarget: 'vrm',
          face: {
            cue: 'focused',
            source: 'prosody-authority',
            confidence: 0.93,
            segmentId: 'segment-other-body-backed-face-1',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          motion: {
            cue: 'observe_focus',
            source: 'timeline-projection',
            confidence: 0.9,
            segmentId: 'segment-other-body-backed-motion-1',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          lipsync: {
            cue: 'I',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: 'segment-other-body-backed-lipsync-1',
            mode: 'energy-phoneme-hybrid',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-body-backed-runtime-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['body'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-body-backed-runtime-1',
        authoritySegmentId: 'segment-body-backed-runtime-1',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['body'],
        authoritySources: ['prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: false,
        authorityBindingSummary: 'target=vrm | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no | lane=body+voice-only',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:no',
        settleAuthoritySummary: 'authority-bound | segment=segment-body-backed-runtime-1 | target=vrm | drivers=body | sources=prosody-authority | lane=body+voice-only',
      },
    })

    expect(overview?.authorityTrustSummary).toContain('身体和声音继续托住')
    expect(overview?.authorityTrustSummary).toContain('linger blink / soften gaze')
    expect(overview?.summaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority-trust',
      value: expect.stringContaining('linger blink / soften gaze'),
    }))
  })

  it('derives audible-lane trust with cadence guidance when local runtime authority still relies on lipsync and voice', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        driverSummary: {
          rendererTarget: 'vrm',
          face: {
            cue: 'focused',
            source: 'prosody-authority',
            confidence: 0.93,
            segmentId: 'segment-other-audible-face-1',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          motion: {
            cue: 'observe_focus',
            source: 'timeline-projection',
            confidence: 0.9,
            segmentId: 'segment-other-audible-motion-1',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          lipsync: {
            cue: 'I',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: 'segment-audible-runtime-1',
            mode: 'energy-phoneme-hybrid',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-audible-runtime-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-audible-runtime-1',
        authoritySegmentId: 'segment-audible-runtime-1',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authoritySources: ['prosody-authority'],
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync+voice-only',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-audible-runtime-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync+voice-only',
      },
    })

    expect(overview?.authorityTrustSummary).toContain('口型和声音继续托住')
    expect(overview?.authorityTrustSummary).toContain('linger blink / soften gaze')
    expect(overview?.summaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority-trust',
      value: expect.stringContaining('linger blink / soften gaze'),
    }))
  })

  it('keeps audible-body partial-rejoin trust explicit when body, lipsync, and voice still carry the living line while face and motion are rejoining', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        driverSummary: {
          rendererTarget: 'vrm',
          face: {
            cue: 'focused',
            source: 'prosody-authority',
            confidence: 0.93,
            segmentId: 'segment-stale-face-shell',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          motion: {
            cue: 'observe_focus',
            source: 'timeline-projection',
            confidence: 0.9,
            segmentId: 'segment-stale-motion-shell',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          lipsync: {
            cue: 'I',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: 'segment-audible-body-runtime-1',
            mode: 'energy-phoneme-hybrid',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-audible-body-runtime-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['body', 'lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-audible-body-runtime-1',
        authoritySegmentId: 'segment-audible-body-runtime-1',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['body', 'lipsync'],
        authoritySources: ['prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync+voice-only | pending-rejoin=face+motion',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-audible-body-runtime-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority | lane=body+lipsync+voice-only | pending-rejoin=face+motion',
      },
    })

    expect(overview?.authorityTrustSummary).toContain('身体、口型和声音继续托住')
    expect(overview?.authorityTrustSummary).toContain('表情和动作还在重连这条身体线')
    expect(overview?.summaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority-trust',
      value: expect.stringContaining('表情和动作还在重连这条身体线'),
    }))
  })

  it('prefers snapshot-native authority trust text over locally deriving it from prosody authority', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-trust-upstream',
          segmentId: 'segment-trust-upstream',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityTrustSummary: '上游 authority trust：已经回到当前片段主链。',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          settleSummary: '上游 authority settle',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          prosodyAuthority: {
            segmentId: 'segment-trust-upstream',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.35,
            cueMouthWeight: 0.35,
            cueHeadWeight: 0.32,
            visemePeakWeight: 0.75,
          },
          driverAuthority: {
            segmentId: 'segment-trust-upstream',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: null,
    })

    expect(overview?.authorityTrustSummary).toBe('上游 authority trust：已经回到当前片段主链。')
    expect(overview?.summaryEntries).toContainEqual({
      key: 'authority-trust',
      label: '权威可信性',
      value: '上游 authority trust：已经回到当前片段主链。',
    })
  })

  it('prefers current body-lipsync-voice lane truth over stale body-line trust in runtime authority overview', () => {
    const cueId = 'segment-runtime-body-lipsync-voice-override-1'
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId,
          segmentId: cueId,
          rendererTarget: 'vrm',
          matchedDrivers: ['body', 'lipsync'],
          matchedSources: ['prosody-authority', 'voice-segment'],
          bindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
          matchSummary: 'body:yes face:no motion:no lipsync:yes',
          authorityTrustSummary: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
          authorityMismatchSummary: 'face-mismatch, motion-mismatch',
          authorityMismatchReasonSummary: '表情和动作还没回到这一段里，但身体、口型和声音已经继续托住同一个 living segment。',
          authorityMismatchDisplay: '表情和动作还没回到这一段里，但身体、口型和声音已经继续托住同一个 living segment。',
          settleSummary: `authority-bound | segment=${cueId} | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment`,
          traceEmbodimentSummary: null,
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          prosodyAuthority: {
            segmentId: cueId,
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.35,
            cueMouthWeight: 0.31,
            cueHeadWeight: 0.28,
            visemePeakWeight: 0.74,
          },
          driverAuthority: {
            segmentId: cueId,
            rendererTarget: 'vrm',
            matchedDrivers: ['body', 'lipsync'],
            sources: ['prosody-authority', 'voice-segment'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId,
        authoritySegmentId: cueId,
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['body', 'lipsync'],
        authoritySources: ['prosody-authority', 'voice-segment'],
        bodyContinuitySummary: null,
        embodimentClosureStage: null,
        authorityTrustSummary: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
        prosodyAuthoritySummary: `mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.31 | head=0.28 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=${cueId}`,
        traceEmbodimentSummary: null,
        residentMode: 'care',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
        settleAuthoritySummary: `authority-bound | segment=${cueId} | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment`,
        summaryEntries: [],
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
    })

    expect(overview?.authorityTrustSummary).toBe('VRM 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。 当前身体还在按 linger blink / soften gaze 的节奏把这一条线稳住。')
    expect(overview?.summaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority-trust',
      value: 'VRM 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。 当前身体还在按 linger blink / soften gaze 的节奏把这一条线稳住。',
    }))
  })

  it('surfaces lane-level truth when snapshot-native authority summaries stay descriptive', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-summary-descriptive',
          segmentId: 'segment-summary-descriptive',
          rendererTarget: 'vrm',
          matchedDrivers: ['face'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityMismatchSummary: 'motion-mismatch',
          authorityMismatchReasonSummary: '上游 authority reason：动作落点已经偏离绑定片段。',
          authorityMismatchDisplay: '上游 authority 展示：动作落点已经和绑定片段分叉。',
          settleSummary: '上游 authority settle',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          prosodyAuthority: {
            segmentId: 'segment-summary-descriptive',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.35,
            cueMouthWeight: 0.35,
            cueHeadWeight: 0.32,
            visemePeakWeight: 0.75,
          },
          driverAuthority: {
            segmentId: 'segment-summary-descriptive',
            rendererTarget: 'vrm',
            matchedDrivers: ['face'],
            sources: ['prosody-authority'],
            faceSegmentMatched: true,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: null,
          },
        },
      } as any,
      playbackCueAuthorityView: null,
    })

    expect(overview?.authorityMatchSummary).toBe('上游 authority 命中 | 表情命中 / 动作未命中 / 口型未知')
    expect(overview?.summaryEntries).toEqual(expect.arrayContaining([
      {
        key: 'authority-binding',
        label: '权威绑定',
        value: '上游 authority 绑定 | 表情命中 / 动作未命中 / 口型未知',
      },
      {
        key: 'authority-match',
        label: '绑定命中',
        value: '上游 authority 命中 | 表情命中 / 动作未命中 / 口型未知',
      },
    ]))
  })

  it('does not rehydrate mismatch summaries from stale playback authority flags when the same cue already has an upstream no-drift authority summary', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-runtime-realigned-summary',
          segmentId: 'segment-runtime-realigned-summary',
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          matchedSources: ['prosody-authority', 'timeline-projection'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: 'face:yes motion:yes lipsync:yes',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          settleSummary: '上游 authority settle',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-runtime-realigned-summary',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-runtime-realigned-summary',
        authoritySegmentId: 'segment-runtime-realigned-summary',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authoritySources: ['prosody-authority'],
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-realigned-summary | target=vrm | drivers=lipsync | sources=prosody-authority',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
    })

    expect(overview?.authorityMatchSummary).toBe('face:yes motion:yes lipsync:yes')
    expect(overview?.authorityMismatchSummary).toBeNull()
    expect(overview?.authorityMismatchReasonSummary).toBeNull()
    expect(overview?.authorityMismatchDisplay).toBeNull()
    expect(overview?.summaryEntries).not.toContainEqual(
      expect.objectContaining({
        key: 'authority-mismatch',
      }),
    )
    expect(overview?.summaryEntries).toContainEqual(
      expect.objectContaining({
        key: 'authority-binding',
        value: '上游 authority 绑定 | 表情命中 / 动作命中 / 口型命中',
      }),
    )
    expect(overview?.summaryEntries).toContainEqual(
      expect.objectContaining({
        key: 'authority-match',
        value: '表情命中 / 动作命中 / 口型命中',
        technicalValue: 'face:yes motion:yes lipsync:yes',
      }),
    )
  })

  it('prefers snapshot-native trace embodiment summary over external fallback input', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-trace-priority',
          segmentId: 'segment-trace-priority',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          settleSummary: '上游 authority settle',
          traceEmbodimentSummary: '上游优先轨迹摘要',
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:trace:priority-1',
          activeThreadId: 'runtime-thread-priority-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-trace-priority',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: true,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      traceEmbodimentSummary: '下游 fallback 轨迹摘要',
    })

    expect(overview?.traceEmbodimentSummary).toBe('上游优先轨迹摘要')
    expect(overview?.traceSummaryEntries).toContainEqual({
      key: 'trace-embodiment',
      label: '轨迹落点',
      value: '上游优先轨迹摘要',
    })
  })

  it('keeps thinner affective-residue room-making wording visible in runtime authority overview when driver summaries still carry the measured-return line', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        driverSummary: {
          rendererTarget: 'vrm',
          face: {
            cue: 'focused',
            source: 'prosody-authority',
            confidence: 0.93,
            segmentId: 'segment-thin-affective-runtime-overview',
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonSummary: '余韵还在，先留白，别立刻把温度放大',
          },
          motion: {
            cue: 'observe_focus',
            source: 'timeline-projection',
            confidence: 0.9,
            segmentId: 'segment-thin-affective-runtime-overview',
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonSummary: '余韵还在，先留白，别立刻把温度放大',
          },
          lipsync: {
            cue: 'I',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: 'segment-thin-affective-runtime-overview',
            mode: 'energy-phoneme-hybrid',
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonSummary: '余韵还在，先留白，别立刻把温度放大',
          },
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-thin-affective-runtime-overview',
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-thin-affective-runtime-overview',
        authoritySegmentId: 'segment-thin-affective-runtime-overview',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        authoritySources: ['prosody-authority', 'timeline-projection'],
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-thin-affective-runtime-overview | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
    })

    expect(overview?.settleAuthoritySummary).toContain('余韵还在')
    expect(overview?.authorityTrustSummary).toContain('余韵还在，先留白，别立刻把温度放大')
    expect(overview?.authorityTrustSummary).toContain('linger blink / soften gaze')
    expect(overview?.summaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority-trust',
      value: expect.stringContaining('余韵还在，先留白，别立刻把温度放大'),
    }))
    expect(overview?.summaryEntries).toContainEqual(expect.objectContaining({
      key: 'settle-authority',
      value: expect.stringContaining('余韵还在'),
    }))
  })

  it('prefers thinner affective-residue settle reason over generic runtime authority trust in runtime authority overview', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-thin-affective-runtime-overview-override',
          segmentId: 'segment-thin-affective-runtime-overview-override',
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          matchedSources: ['prosody-authority', 'timeline-projection'],
          bindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
          matchSummary: 'face:yes motion:yes lipsync:yes',
          authorityTrustSummary: '上游 authority trust：已经回到当前片段主链。',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          settleSummary: 'authority-bound | segment=segment-thin-affective-runtime-overview-override | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-thin-affective-runtime-overview-override',
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-thin-affective-runtime-overview-override',
        authoritySegmentId: 'segment-thin-affective-runtime-overview-override',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        authoritySources: ['prosody-authority', 'timeline-projection'],
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-thin-affective-runtime-overview-override | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
        authorityTrustSummary: 'VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
    })

    expect(overview?.authorityTrustSummary).toContain('余韵还在，先留白，别立刻把温度放大')
    expect(overview?.authorityTrustSummary).toContain('linger blink / soften gaze')
    expect(overview?.summaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority-trust',
      value: expect.stringContaining('余韵还在，先留白，别立刻把温度放大'),
    }))
  })

  it('prefers snapshot-native trace summary over locally rebuilt trace telemetry', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-trace-summary-native',
          segmentId: 'segment-trace-summary-native',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          settleSummary: '上游 authority settle',
          traceEmbodimentSummary: '上游轨迹落点摘要',
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:trace:local-fallback',
          activeThreadId: 'runtime-thread-local-fallback',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: ['should-not-win'],
        },
        traceSummary: {
          decisionTraceId: 'mind:trace:upstream-native',
          turnMode: 'protect',
          truthState: 'memory-grounded',
          repairState: 'minor',
          finalSurfacePolicy: 'authority-first',
          closureState: 'open-loop',
          activeThreadId: 'runtime-thread-upstream-native',
          suppressionTags: ['upstream-suppression'],
          latestEventSummary: '上游 trace 最近事件',
          segmentBinding: {
            matched: true,
            rendererTarget: 'vrm',
            matchedDrivers: ['motion'],
            matchedSources: ['upstream-source'],
          },
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-trace-summary-native',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: null,
    })

    expect(overview?.traceSummary).toEqual({
      cueId: 'segment-trace-summary-native',
      decisionTraceId: 'mind:trace:upstream-native',
      turnMode: 'protect',
      truthState: 'memory-grounded',
      repairState: 'minor',
      finalSurfacePolicy: 'authority-first',
      closureState: 'open-loop',
      activeThreadId: 'runtime-thread-upstream-native',
      suppressionTags: ['upstream-suppression'],
      latestEventSummary: '上游 trace 最近事件',
      segmentBinding: {
        matched: true,
        rendererTarget: 'vrm',
        matchedDrivers: ['motion'],
        matchedSources: ['upstream-source'],
      },
    })
    expect(overview?.traceSummaryEntries).toContainEqual({
      key: 'trace-id',
      label: '决策轨迹',
      value: 'mind:trace:upstream-native',
    })
    expect(overview?.traceSummaryEntries).toContainEqual({
      key: 'binding-drivers',
      label: '命中驱动',
      value: 'motion',
    })
    expect(overview?.traceSummaryEntries).toContainEqual({
      key: 'binding-sources',
      label: '命中来源',
      value: 'upstream-source',
    })
  })

  it('prefers overview authority mismatch display in summary entries when a human-facing upstream display already exists', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:rest:1',
          activeThreadId: 'runtime-thread-rest-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-display-first',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-display-first',
        authoritySegmentId: 'segment-display-first',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authoritySources: ['prosody-authority'],
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-display-first | target=vrm | drivers=lipsync | sources=prosody-authority',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
    })

    expect(overview).toEqual(expect.objectContaining({
      authorityMismatchDisplay: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。',
      authorityTrustSummary: 'VRM 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。',
      summaryEntries: [
        { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
        { key: 'authority-segment', label: '权威片段', value: 'segment-display-first' },
        {
          key: 'authority-binding',
          label: '权威绑定',
          value: '目标 VRM，驱动 口型，来源 prosody-authority，命中 表情未命中 / 动作未命中 / 口型命中',
          technicalValue: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
        },
        {
          key: 'authority-match',
          label: '绑定命中',
          value: '表情未命中 / 动作未命中 / 口型命中',
          technicalValue: 'face:no motion:no lipsync:yes',
        },
        { key: 'authority-trust', label: '权威可信性', value: 'VRM 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。' },
        { key: 'authority-mismatch', label: '权威漂移', value: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。' },
        {
          key: 'settle-authority',
          label: '稳定段归因',
          value: 'authority-bound，片段 segment-display-first，目标 VRM，驱动 口型，来源 prosody-authority',
          technicalValue: 'authority-bound | segment=segment-display-first | target=vrm | drivers=lipsync | sources=prosody-authority',
        },
      ],
    }))
  })

  it('does not reuse authority-summary trace embodiment text when playback cue already points at a different current cue', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-authority-summary',
          segmentId: 'segment-authority-summary',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          settleSummary: '上游 authority settle',
          traceEmbodimentSummary: '上游 authority 轨迹落点摘要',
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:trace:scoped-1',
          activeThreadId: 'runtime-thread-scoped-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-authority-summary',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-current-playback',
        authoritySegmentId: 'segment-authority-summary',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authoritySources: ['prosody-authority'],
        traceEmbodimentSummary: null,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: '上游 authority 绑定',
        authorityMatchSummary: '上游 authority 命中',
        settleAuthoritySummary: '上游 authority settle',
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
      traceEmbodimentSummary: '下游 fallback 轨迹摘要',
    })

    expect(overview?.traceEmbodimentSummary).toBe('下游 fallback 轨迹摘要')
    expect(overview?.traceSummary?.cueId).toBe('segment-current-playback')
    expect(overview?.traceSummaryEntries).toContainEqual({
      key: 'trace-embodiment',
      label: '轨迹落点',
      value: '下游 fallback 轨迹摘要',
    })
  })

  it('does not rehydrate binding, match, or settle summaries from authority summary when playback cue view already scoped them away for another cue', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-authority-summary',
          segmentId: 'segment-authority-summary',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          settleSummary: '上游 authority settle',
          traceEmbodimentSummary: '上游 authority 轨迹落点摘要',
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:trace:scoped-2',
          activeThreadId: 'runtime-thread-scoped-2',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-authority-summary',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-current-playback',
        authoritySegmentId: 'segment-authority-summary',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authoritySources: ['prosody-authority'],
        traceEmbodimentSummary: null,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: null,
        authorityMatchSummary: null,
        settleAuthoritySummary: null,
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
    })

    expect(overview?.authorityBindingSummary).toBeNull()
    expect(overview?.authorityMatchSummary).toBeNull()
    expect(overview?.settleAuthoritySummary).toBeNull()
    expect(overview?.summaryEntries).toEqual([
      { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
      { key: 'authority-segment', label: '权威片段', value: 'segment-authority-summary' },
      { key: 'authority-mismatch', label: '权威漂移', value: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。' },
    ])
  })

  it('does not rehydrate mismatch summaries from authority summary when playback cue view already scoped them away for another cue', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-authority-summary',
          segmentId: 'segment-authority-summary',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityMismatchSummary: 'upstream-mismatch-summary',
          authorityMismatchReasonSummary: '上游 authority reason',
          authorityMismatchDisplay: '上游 authority display',
          settleSummary: '上游 authority settle',
          traceEmbodimentSummary: '上游 authority 轨迹落点摘要',
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:trace:scoped-3',
          activeThreadId: 'runtime-thread-scoped-3',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-authority-summary',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-current-playback',
        authoritySegmentId: 'segment-authority-summary',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authoritySources: ['prosody-authority'],
        traceEmbodimentSummary: null,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: null,
        authorityMatchSummary: null,
        settleAuthoritySummary: null,
        preferredExpressionAliases: [],
        preferredMotionAliases: [],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
    })

    expect(overview?.authorityMismatchSummary).toBe('face-mismatch, motion-mismatch')
    expect(overview?.authorityMismatchReasonSummary).toBe('表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。')
    expect(overview?.authorityMismatchDisplay).toBe('表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。')
  })

  it('drops wrong-segment upstream authority summary when runtime overview only has current driver authority and trace fallback', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        authoritySummary: {
          cueId: 'segment-upstream-other-runtime-overview',
          segmentId: 'segment-upstream-other-runtime-overview',
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          matchedSources: ['prosody-authority', 'timeline-projection'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: 'face:yes motion:yes lipsync:yes',
          authorityTrustSummary: '上游 authority trust：别把这条旧段落重新当成当前身体线。',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          settleSummary: 'authority-bound | segment=segment-upstream-other-runtime-overview | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
          traceEmbodimentSummary: '上游 authority 轨迹落点摘要',
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:trace:runtime-current-1',
          activeThreadId: 'runtime-thread-current-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          prosodyAuthority: {
            segmentId: 'segment-current-runtime-overview',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.29,
            cueMouthWeight: 0.21,
            cueHeadWeight: 0.18,
            visemePeakWeight: 0.68,
          },
          driverAuthority: {
            segmentId: 'segment-current-runtime-overview',
            rendererTarget: 'vrm',
            matchedDrivers: ['body'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
          },
        },
      } as any,
      playbackCueAuthorityView: null,
      traceEmbodimentSummary: '下游 current 轨迹摘要',
    })

    expect(overview?.authoritySegmentId).toBe('segment-current-runtime-overview')
    expect(overview?.authorityTrustSummary).toBe('VRM 这段 authority 现在主要由身体和声音继续托住，同一段 living segment 还在，只是表情、动作和口型暂时没有一起跟上。')
    expect(overview?.prosodyAuthoritySummary).toBe('mode=energy-phoneme-hybrid | prosody=0.29 | mouth=0.21 | head=0.18 | visemePeak=0.68 | provenance=authority-bound | source=prosody-authority | segment=segment-current-runtime-overview')
    expect(overview?.settleAuthoritySummary).toBeNull()
    expect(overview?.traceEmbodimentSummary).toBe('下游 current 轨迹摘要')
    expect(overview?.traceSummary?.cueId).toBe('segment-current-runtime-overview')
  })

  it('keeps same-her signature and reason tags visible in runtime authority overview when playback cue authority already carries the shared living-line proof', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: {
          rendererTarget: 'live2d',
          driverAuthority: {
            segmentId: 'segment-runtime-same-her-overview-1',
            rendererTarget: 'live2d',
            matchedDrivers: ['body', 'lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-runtime-same-her-overview-1',
        authoritySegmentId: 'segment-runtime-same-her-overview-1',
        authorityRendererTarget: 'live2d',
        authorityMatchedDrivers: ['body', 'lipsync'],
        authoritySources: ['prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=live2d | drivers=body, lipsync | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
        authorityTrustSummary: 'Live2D 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。',
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-same-her-overview-1 | target=live2d | drivers=body, lipsync | sources=prosody-authority | lane=body+lipsync-only',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: [
          'embodiment:audible-same-her-line',
          'embodiment:still-voiced-motion-line',
        ],
        signature: 'embodiment:body-lipsync-voice-rejoin',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['IdleSettle'],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
    })

    expect(overview?.sameHerSignature).toBe('embodiment:body-lipsync-voice-rejoin')
    expect(overview?.sameHerReasonTags).toEqual([
      'embodiment:audible-same-her-line',
      'embodiment:still-voiced-motion-line',
    ])
    expect(overview?.summaryEntries).toContainEqual({
      key: 'identity-continuity-signature',
      label: '同一人签名',
      value: 'embodiment:body-lipsync-voice-rejoin',
    })
    expect(overview?.summaryEntries).toContainEqual({
      key: 'identity-continuity-reasons',
      label: '同一人线索',
      value: 'embodiment:audible-same-her-line, embodiment:still-voiced-motion-line',
    })
  })

  it('carries memory closure identity from runtime digest into runtime authority overview diagnostics', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        runtimeDigest: {
          derivedMindStateBundle: {
            emotionalTransitionLedger: {
              memoryClosureCausality: {
                causedByMemoryClosure: true,
                memoryIdentity: {
                  continuityKey: 'corrected-callback-memory-runtime-reconsolidation',
                  reasonTags: ['memory-identity:corrected-callback-memory-runtime-reconsolidation'],
                },
              },
            },
            learningExecutionState: {
              memoryClosureCausality: {
                causedByMemoryClosure: false,
                memoryIdentity: {
                  continuityKey: 'pending-runtime-evidence-should-not-win',
                },
              },
            },
          },
        },
        playbackTelemetry: {
          rendererTarget: 'live2d',
          driverAuthority: {
            segmentId: 'segment-runtime-memory-closure-overview-1',
            rendererTarget: 'live2d',
            matchedDrivers: ['body', 'lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-runtime-memory-closure-overview-1',
        authoritySegmentId: 'segment-runtime-memory-closure-overview-1',
        authorityRendererTarget: 'live2d',
        authorityMatchedDrivers: ['body', 'lipsync'],
        authoritySources: ['prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        authorityBindingSummary: 'target=live2d | drivers=body, lipsync | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
        authorityTrustSummary: 'Live2D 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。',
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-memory-closure-overview-1 | target=live2d | drivers=body, lipsync | sources=prosody-authority | lane=body+lipsync-only',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        reasonTags: ['embodiment:audible-same-her-line'],
        signature: 'embodiment:body-lipsync-voice-rejoin',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['IdleSettle'],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
    })

    expect(overview?.runtimeMemoryClosureIdentityKey).toBe('corrected-callback-memory-runtime-reconsolidation')
    expect(overview?.summaryEntries).toContainEqual({
      key: 'memory-closure-identity',
      label: '记忆闭环身份',
      value: 'corrected-callback-memory-runtime-reconsolidation',
      technicalValue: 'memory-identity:corrected-callback-memory-runtime-reconsolidation',
    })
  })

  it('carries VRM same-her frame evidence into runtime authority overview summary entries', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-runtime-vrm-same-her-frame',
            rendererTarget: 'vrm',
            matchedDrivers: ['body', 'face', 'motion', 'lipsync', 'voice'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: false,
            voiceSegmentMatched: false,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-runtime-vrm-same-her-frame',
        authoritySegmentId: 'segment-runtime-vrm-same-her-frame',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['body', 'face', 'motion', 'lipsync', 'voice'],
        authoritySources: ['prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: false,
        voiceSegmentMatched: false,
        authorityBindingSummary: 'target=vrm | drivers=body, face, motion, lipsync, voice | sources=prosody-authority | matches=body:yes face:yes motion:yes lipsync:no voice:no | lane=renderer-rejoin-without-body',
        authorityMatchSummary: 'body:yes face:yes motion:yes lipsync:no voice:no',
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-vrm-same-her-frame | target=vrm | drivers=body, face, motion, lipsync, voice | sources=prosody-authority | lane=renderer-rejoin-without-body',
        preferredExpressionAliases: ['soft-return'],
        preferredMotionAliases: ['idle-breathe'],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: 120,
        vrmExpressionBlendMs: 90,
      },
      vrmAuthorityView: {
        cueId: 'segment-runtime-vrm-same-her-frame',
        sameHerFrameAligned: false,
        sameHerFrameMismatchDrivers: ['lipsync', 'voice'],
        sameHerFramePerformanceSegmentId: 'segment-runtime-vrm-same-her-frame',
        sameHerFrameSpeechSegmentId: 'segment-stale-voice-line',
        sameHerFrameSummary: 'drift | performance=segment-runtime-vrm-same-her-frame | speech=segment-stale-voice-line | active=body, face, motion, lipsync, voice | mismatch=lipsync, voice',
      },
    } as any)

    expect(overview?.sameHerFrameSummary).toBe('drift | performance=segment-runtime-vrm-same-her-frame | speech=segment-stale-voice-line | active=body, face, motion, lipsync, voice | mismatch=lipsync, voice')
    expect(overview?.sameHerFrameAligned).toBe(false)
    expect(overview?.sameHerFrameMismatchDrivers).toEqual(['lipsync', 'voice'])
    expect(overview?.summaryEntries).toContainEqual({
      key: 'identity-continuity-frame-summary',
      label: '同一生命线帧摘要',
      value: 'drift | performance=segment-runtime-vrm-same-her-frame | speech=segment-stale-voice-line | active=body, face, motion, lipsync, voice | mismatch=lipsync, voice',
    })
    expect(overview?.summaryEntries).toContainEqual({
      key: 'identity-continuity-frame-aligned',
      label: '同一生命线帧对齐',
      value: 'false',
    })
    expect(overview?.summaryEntries).toContainEqual({
      key: 'identity-continuity-frame-mismatch-drivers',
      label: '同一生命线漂移驱动',
      value: 'lipsync, voice',
    })
    expect(overview?.summaryEntries).toContainEqual(expect.objectContaining({
      key: 'identity-continuity-continuity',
      label: '同一生命线总览',
      value: expect.stringContaining('identity-continuity continuity'),
      technicalValue: 'source=frame | segment=segment-runtime-vrm-same-her-frame | closure=renderer-rejoin-without-body | aligned=false | mismatch=lipsync, voice | summary=drift | performance=segment-runtime-vrm-same-her-frame | speech=segment-stale-voice-line | active=body, face, motion, lipsync, voice | mismatch=lipsync, voice',
    }))
  })

  it('carries Live2D same-her execution evidence into runtime authority overview summary entries', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: {
          rendererTarget: 'live2d',
          driverAuthority: {
            segmentId: 'segment-runtime-live2d-same-her-execution',
            rendererTarget: 'live2d',
            matchedDrivers: ['face', 'motion'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: false,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-runtime-live2d-same-her-execution',
        authoritySegmentId: 'segment-runtime-live2d-same-her-execution',
        authorityRendererTarget: 'live2d',
        authorityMatchedDrivers: ['face', 'motion'],
        authoritySources: ['prosody-authority', 'timeline-projection'],
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: false,
        authorityBindingSummary: 'target=live2d | drivers=face, motion | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:no',
        authorityMatchSummary: 'face:yes motion:yes lipsync:no',
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-live2d-same-her-execution | target=live2d | drivers=face, motion | sources=prosody-authority, timeline-projection',
        preferredExpressionAliases: ['soft-return'],
        preferredMotionAliases: ['idle-breathe'],
        live2dFacialReleaseMs: 380,
        live2dMotionFollowThroughMs: 460,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
      live2dAuthorityView: {
        cueId: 'segment-runtime-live2d-same-her-execution',
        sameHerExecutionAligned: false,
        sameHerExecutionAuthoritySegmentId: 'segment-runtime-live2d-same-her-execution',
        sameHerExecutionMismatchDrivers: ['lipsync'],
        sameHerExecutionSummary: 'drift | authority=segment-runtime-live2d-same-her-execution | active=face, motion, lipsync | mismatch=lipsync',
      },
    } as any)

    expect(overview?.sameHerExecutionSummary).toBe('drift | authority=segment-runtime-live2d-same-her-execution | active=face, motion, lipsync | mismatch=lipsync')
    expect(overview?.sameHerExecutionAligned).toBe(false)
    expect(overview?.sameHerExecutionMismatchDrivers).toEqual(['lipsync'])
    expect(overview?.summaryEntries).toContainEqual({
      key: 'identity-continuity-execution-summary',
      label: '同一生命线执行摘要',
      value: 'drift | authority=segment-runtime-live2d-same-her-execution | active=face, motion, lipsync | mismatch=lipsync',
    })
    expect(overview?.summaryEntries).toContainEqual({
      key: 'identity-continuity-execution-aligned',
      label: '同一生命线执行对齐',
      value: 'false',
    })
    expect(overview?.summaryEntries).toContainEqual({
      key: 'identity-continuity-execution-mismatch-drivers',
      label: '同一生命线执行漂移驱动',
      value: 'lipsync',
    })
    expect(overview?.summaryEntries).toContainEqual(expect.objectContaining({
      key: 'identity-continuity-continuity',
      label: '同一生命线总览',
      value: expect.stringContaining('identity-continuity continuity'),
      technicalValue: 'source=execution | segment=segment-runtime-live2d-same-her-execution | aligned=false | mismatch=lipsync | summary=drift | authority=segment-runtime-live2d-same-her-execution | active=face, motion, lipsync | mismatch=lipsync',
    }))
  })

  it('infers embodiment closure stage from structured Live2D same-her execution evidence when playback closure hints are absent', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: {
          rendererTarget: 'live2d',
          driverAuthority: {
            segmentId: 'segment-runtime-live2d-closure-stage-from-same-her',
            rendererTarget: 'live2d',
            matchedDrivers: ['face', 'motion', 'lipsync', 'voice'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
            voiceSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-runtime-live2d-closure-stage-from-same-her',
        authoritySegmentId: 'segment-runtime-live2d-closure-stage-from-same-her',
        authorityRendererTarget: 'live2d',
        authorityMatchedDrivers: ['face', 'motion', 'lipsync', 'voice'],
        authoritySources: ['prosody-authority', 'timeline-projection'],
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        voiceSegmentMatched: true,
        authorityBindingSummary: 'target=live2d | drivers=face, motion, lipsync, voice | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes voice:yes',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes voice:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-live2d-closure-stage-from-same-her | target=live2d | drivers=face, motion, lipsync, voice | sources=prosody-authority, timeline-projection',
        bodyContinuitySummary: null,
        embodimentClosureStage: null,
        preferredExpressionAliases: ['soft-return'],
        preferredMotionAliases: ['idle-breathe'],
        live2dFacialReleaseMs: 380,
        live2dMotionFollowThroughMs: 460,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
      live2dAuthorityView: {
        cueId: 'segment-runtime-live2d-closure-stage-from-same-her',
        sameHerExecutionAligned: true,
        sameHerExecutionAuthoritySegmentId: 'segment-runtime-live2d-closure-stage-from-same-her',
        sameHerExecutionMismatchDrivers: [],
        sameHerExecutionSummary: 'aligned | authority=segment-runtime-live2d-closure-stage-from-same-her | active=face, motion, lipsync, voice | closure=renderer-rejoin-without-body | lane=face+motion+lipsync+voice-only | remaining-open=none',
      },
    } as any)

    expect(overview?.embodimentClosureStage).toBe('renderer-rejoin-without-body')
  })

  it('does not infer embodiment closure stage from stale VRM same-her frame evidence that belongs to another cue', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-runtime-vrm-current-cue',
            rendererTarget: 'vrm',
            matchedDrivers: ['body', 'face', 'motion', 'lipsync', 'voice'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
            voiceSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-runtime-vrm-current-cue',
        authoritySegmentId: 'segment-runtime-vrm-current-cue',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['body', 'face', 'motion', 'lipsync', 'voice'],
        authoritySources: ['prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        voiceSegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=body, face, motion, lipsync, voice | sources=prosody-authority | matches=body:yes face:yes motion:yes lipsync:yes voice:yes',
        authorityMatchSummary: 'body:yes face:yes motion:yes lipsync:yes voice:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-vrm-current-cue | target=vrm | drivers=body, face, motion, lipsync, voice | sources=prosody-authority',
        bodyContinuitySummary: null,
        embodimentClosureStage: null,
        preferredExpressionAliases: ['soft-return'],
        preferredMotionAliases: ['idle-breathe'],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: 120,
        vrmExpressionBlendMs: 90,
      },
      vrmAuthorityView: {
        cueId: 'segment-runtime-vrm-current-cue',
        sameHerFrameAligned: true,
        sameHerFrameMismatchDrivers: [],
        sameHerFramePerformanceSegmentId: 'segment-runtime-vrm-other-cue',
        sameHerFrameSpeechSegmentId: 'segment-runtime-vrm-other-cue',
        sameHerFrameSummary: 'aligned | segment=segment-runtime-vrm-other-cue | active=body, face, motion, lipsync, voice | closure=full-cross-modal-lock | lane=full-driver-rejoin | remaining-open=none',
      },
    } as any)

    expect(overview?.sameHerFrameSummary).toBeUndefined()
    expect(overview?.sameHerFrameAligned).toBeUndefined()
    expect(overview?.sameHerFrameMismatchDrivers).toBeUndefined()
    expect(overview?.sameHerFramePerformanceSegmentId).toBeUndefined()
    expect(overview?.sameHerFrameSpeechSegmentId).toBeUndefined()
    expect(overview?.embodimentClosureStage).toBeNull()
    expect(overview?.summaryEntries?.some(entry =>
      entry.key === 'embodiment-closure-stage'
      && entry.value === 'full-cross-modal-lock',
    )).toBe(false)
    expect(JSON.stringify(overview?.summaryEntries ?? [])).not.toMatch(
      /same-her-frame-(?:summary|aligned|mismatch-drivers)/u,
    )
  })

  it('does not infer embodiment closure stage from stale Live2D same-her execution evidence that belongs to another cue', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: {
          rendererTarget: 'live2d',
          driverAuthority: {
            segmentId: 'segment-runtime-live2d-current-cue',
            rendererTarget: 'live2d',
            matchedDrivers: ['face', 'motion', 'lipsync', 'voice'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
            voiceSegmentMatched: true,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-runtime-live2d-current-cue',
        authoritySegmentId: 'segment-runtime-live2d-current-cue',
        authorityRendererTarget: 'live2d',
        authorityMatchedDrivers: ['face', 'motion', 'lipsync', 'voice'],
        authoritySources: ['prosody-authority', 'timeline-projection'],
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        voiceSegmentMatched: true,
        authorityBindingSummary: 'target=live2d | drivers=face, motion, lipsync, voice | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes voice:yes',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes voice:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-live2d-current-cue | target=live2d | drivers=face, motion, lipsync, voice | sources=prosody-authority, timeline-projection',
        bodyContinuitySummary: null,
        embodimentClosureStage: null,
        preferredExpressionAliases: ['soft-return'],
        preferredMotionAliases: ['idle-breathe'],
        live2dFacialReleaseMs: 380,
        live2dMotionFollowThroughMs: 460,
        vrmActionFadeMs: null,
        vrmExpressionBlendMs: null,
      },
      live2dAuthorityView: {
        cueId: 'segment-runtime-live2d-current-cue',
        sameHerExecutionAligned: true,
        sameHerExecutionAuthoritySegmentId: 'segment-runtime-live2d-other-cue',
        sameHerExecutionMismatchDrivers: [],
        sameHerExecutionSummary: 'aligned | authority=segment-runtime-live2d-other-cue | active=face, motion, lipsync, voice | closure=renderer-rejoin-without-body | lane=face+motion+lipsync+voice-only | remaining-open=none',
      },
    } as any)

    expect(overview?.sameHerExecutionSummary).toBeUndefined()
    expect(overview?.sameHerExecutionAligned).toBeUndefined()
    expect(overview?.sameHerExecutionMismatchDrivers).toBeUndefined()
    expect(overview?.sameHerExecutionAuthoritySegmentId).toBeUndefined()
    expect(overview?.embodimentClosureStage).toBeNull()
    expect(overview?.summaryEntries?.some(entry =>
      entry.key === 'embodiment-closure-stage'
      && entry.value === 'renderer-rejoin-without-body',
    )).toBe(false)
    expect(JSON.stringify(overview?.summaryEntries ?? [])).not.toMatch(
      /same-her-execution-(?:summary|aligned|mismatch-drivers)/u,
    )
  })

  it('does not infer embodiment closure stage from stale VRM same-her summary-only evidence when explicit identity-continuity', () => {
    const overview = buildRuntimeAuthorityOverview({
      speechEmbodiment: {
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-runtime-vrm-summary-only-current',
            rendererTarget: 'vrm',
            matchedDrivers: ['body'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
            voiceSegmentMatched: false,
          },
        },
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-runtime-vrm-summary-only-current',
        authoritySegmentId: 'segment-runtime-vrm-summary-only-current',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['body'],
        authoritySources: ['prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: false,
        voiceSegmentMatched: false,
        authorityBindingSummary: 'target=vrm | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no voice:no | lane=body-only',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:no voice:no',
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-vrm-summary-only-current | target=vrm | drivers=body | sources=prosody-authority',
        bodyContinuitySummary: null,
        embodimentClosureStage: null,
        preferredExpressionAliases: ['soft-return'],
        preferredMotionAliases: ['idle-breathe'],
        live2dFacialReleaseMs: null,
        live2dMotionFollowThroughMs: null,
        vrmActionFadeMs: 120,
        vrmExpressionBlendMs: 90,
      },
      vrmAuthorityView: {
        cueId: 'segment-runtime-vrm-summary-only-current',
        sameHerFrameAligned: true,
        sameHerFrameMismatchDrivers: [],
        sameHerFrameSummary: 'aligned | performance=segment-runtime-vrm-summary-only-stale | speech=segment-runtime-vrm-summary-only-stale | active=body, face, motion, lipsync, voice | closure=full-cross-modal-lock | lane=full-driver-rejoin | remaining-open=none',
      },
    } as any)

    expect(overview?.sameHerFrameSummary).toBeUndefined()
    expect(overview?.sameHerFrameAligned).toBeUndefined()
    expect(overview?.sameHerFrameMismatchDrivers).toBeUndefined()
    expect(overview?.embodimentClosureStage).toBeNull()
    expect(overview?.summaryEntries?.some(entry =>
      entry.key === 'embodiment-closure-stage'
      && entry.value === 'full-cross-modal-lock',
    )).toBe(false)
    expect(JSON.stringify(overview?.summaryEntries ?? [])).not.toMatch(
      /same-her-frame-(?:summary|aligned|mismatch-drivers)/u,
    )
  })
})
