import { describe, expect, it } from 'vitest'

import { buildPlaybackCueAuthorityView } from './performance-visualizer-playback-cue'

describe('performance visualizer playback cue authority view', () => {
  it('formats playback cue renderer authority from diagnostics snapshot speech telemetry', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        playbackTelemetry: {
          actualDurationMs: 240,
          plannedDurationMs: 240,
          driftMs: 0,
          settleMs: 280,
          stopReason: null,
          rendererTarget: 'vrm',
          prosodyAuthority: {
            segmentId: 'segment-explicit-playback-cue-metadata',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.35,
            cueMouthWeight: 0.35,
            cueHeadWeight: 0.32,
            visemePeakWeight: 0.75,
          },
          driverAuthority: {
            segmentId: 'segment-explicit-playback-cue-metadata',
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
          cue: {
            id: 'segment-explicit-playback-cue-metadata',
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
          drivers: null,
        },
      },
    } as any)

    expect(view).toEqual({
      cueId: 'segment-explicit-playback-cue-metadata',
      authoritySegmentId: 'segment-explicit-playback-cue-metadata',
      authorityRendererTarget: 'vrm',
      authorityMatchedDrivers: ['face', 'motion', 'lipsync', 'voice'],
      authoritySources: ['prosody-authority', 'timeline-projection'],
      bodyContinuitySummary: null,
      authorityTrustSummary: 'VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-explicit-playback-cue-metadata',
      traceEmbodimentSummary: null,
      residentMode: null,
      preferredBlinkCadence: null,
      preferredGazeMode: null,
      bodySegmentMatched: null,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
      authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync, voice | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes voice:yes',
      authorityMatchSummary: 'face:yes motion:yes lipsync:yes voice:yes',
      settleAuthoritySummary: 'authority-bound | segment=segment-explicit-playback-cue-metadata | target=vrm | drivers=face, motion, lipsync, voice | sources=prosody-authority, timeline-projection',
      summaryEntries: [
        { key: 'cue-id', label: '当前片段', value: 'segment-explicit-playback-cue-metadata' },
        { key: 'authority-segment', label: '权威片段', value: 'segment-explicit-playback-cue-metadata' },
        { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
        { key: 'matched-drivers', label: '命中驱动', value: 'face, motion, lipsync, voice' },
        { key: 'authority-sources', label: '权威来源', value: 'prosody-authority, timeline-projection' },
        {
          key: 'authority-binding',
          label: '权威绑定',
          value: '目标 VRM，驱动 表情、动作、口型、声音，来源 prosody-authority, timeline-projection，命中 表情命中 / 动作命中 / 口型命中 / 声音命中',
          technicalValue: 'target=vrm | drivers=face, motion, lipsync, voice | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes voice:yes',
        },
        {
          key: 'authority-match',
          label: '绑定命中',
          value: '表情命中 / 动作命中 / 口型命中 / 声音命中',
          technicalValue: 'face:yes motion:yes lipsync:yes voice:yes',
        },
        {
          key: 'authority-trust',
          label: '权威可信性',
          value: 'VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
        },
        {
          key: 'prosody-authority',
          label: '韵律权威',
          value: '模式 energy-phoneme-hybrid，韵律 0.35，口部 0.35，头部 0.32，峰值口型 0.75，权威绑定，来源 韵律权威，片段 segment-explicit-playback-cue-metadata',
          technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-explicit-playback-cue-metadata',
        },
        {
          key: 'settle-authority',
          label: '稳定段归因',
          value: 'authority-bound，片段 segment-explicit-playback-cue-metadata，目标 VRM，驱动 表情、动作、口型、声音，来源 prosody-authority, timeline-projection',
          technicalValue: 'authority-bound | segment=segment-explicit-playback-cue-metadata | target=vrm | drivers=face, motion, lipsync, voice | sources=prosody-authority, timeline-projection',
        },
        { key: 'expression-aliases', label: '表情偏好', value: 'CalmInspect' },
        { key: 'motion-aliases', label: '动作偏好', value: 'ObserveSoft' },
        { key: 'live2d-facial-release', label: 'Live2D 表情回收', value: '320ms' },
        { key: 'live2d-motion-follow', label: 'Live2D 动作跟随', value: '440ms' },
        { key: 'vrm-action-fade', label: 'VRM 动作淡出', value: '280ms' },
        { key: 'vrm-expression-blend', label: 'VRM 表情混合', value: '360ms' },
      ],
      preferredExpressionAliases: ['CalmInspect'],
      preferredMotionAliases: ['ObserveSoft'],
      live2dFacialReleaseMs: 320,
      live2dMotionFollowThroughMs: 440,
      vrmActionFadeMs: 280,
      vrmExpressionBlendMs: 360,
    })
  })

  it('returns null when playback cue authority is absent', () => {
    expect(buildPlaybackCueAuthorityView({
      speech: {
        playbackTelemetry: null,
      },
    } as any)).toBeNull()
  })

  it('rehydrates explicit voice driver telemetry into playback cue prosody authority before upstream telemetry rethreads top-level truth', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        playbackTelemetry: {
          actualDurationMs: 240,
          plannedDurationMs: 240,
          driftMs: 0,
          settleMs: 280,
          stopReason: null,
          rendererTarget: 'vrm',
          prosodyAuthority: null,
          driverAuthority: {
            segmentId: 'segment-explicit-voice-only-playback-cue',
            rendererTarget: 'vrm',
            matchedDrivers: ['voice'],
            sources: ['prosody-authority'],
            bodySegmentMatched: false,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
            voiceSegmentMatched: true,
          },
          cue: {
            id: 'segment-explicit-voice-only-playback-cue',
            rendererHints: null,
            rendererSettle: null,
          },
          drivers: {
            body: null,
            face: null,
            lipsync: null,
            motion: null,
            voice: {
              playbackPhase: 'playing',
              continuityHoldMs: 240,
              segmentId: 'segment-explicit-voice-only-playback-cue',
              source: 'prosody-authority',
              provenance: 'authority-bound',
              mode: 'energy-phoneme-hybrid',
              cueProsodyWeight: 0.41,
              cueMouthWeight: 0.33,
              cueHeadWeight: 0.26,
              visemePeakWeight: 0.58,
            },
          },
        },
      },
    } as any)

    expect(view).toEqual(expect.objectContaining({
      authoritySegmentId: 'segment-explicit-voice-only-playback-cue',
      authorityMatchedDrivers: ['voice'],
      voiceSegmentMatched: true,
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.41 | mouth=0.33 | head=0.26 | visemePeak=0.58 | provenance=authority-bound | source=prosody-authority | segment=segment-explicit-voice-only-playback-cue',
    }))
    expect(view?.summaryEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'prosody-authority',
        technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.41 | mouth=0.33 | head=0.26 | visemePeak=0.58 | provenance=authority-bound | source=prosody-authority | segment=segment-explicit-voice-only-playback-cue',
      }),
    ]))
  })

  it('keeps settle authority explainability even when cue id is missing but stable driver authority is present', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        playbackTelemetry: {
          rendererTarget: 'live2d',
          driverAuthority: {
            segmentId: 'segment-authority-only',
            rendererTarget: 'live2d',
            matchedDrivers: ['face', 'lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: true,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          cue: {
            id: null,
            rendererSettle: {
              live2dFacialReleaseMs: 320,
              live2dMotionFollowThroughMs: 440,
            },
          },
        },
      },
    } as any)

    expect(view).toEqual({
      cueId: 'segment-authority-only',
      authoritySegmentId: 'segment-authority-only',
      authorityRendererTarget: 'live2d',
      authorityMatchedDrivers: ['face', 'lipsync'],
      authoritySources: ['prosody-authority'],
      bodyContinuitySummary: null,
      embodimentClosureStage: 'renderer-rejoin-without-body',
      authorityTrustSummary: null,
      prosodyAuthoritySummary: null,
      traceEmbodimentSummary: null,
      residentMode: null,
      preferredBlinkCadence: null,
      preferredGazeMode: null,
      bodySegmentMatched: null,
      faceSegmentMatched: true,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: null,
      authorityBindingSummary: 'target=live2d | drivers=face, lipsync | sources=prosody-authority | matches=face:yes motion:no lipsync:yes | lane=face+lipsync-only',
      authorityMatchSummary: 'face:yes motion:no lipsync:yes',
      settleAuthoritySummary: 'authority-bound | segment=segment-authority-only | target=live2d | drivers=face, lipsync | sources=prosody-authority',
      summaryEntries: [
        { key: 'cue-id', label: '当前片段', value: 'segment-authority-only' },
        { key: 'authority-segment', label: '权威片段', value: 'segment-authority-only' },
        { key: 'renderer-target', label: '渲染目标', value: 'live2d' },
        { key: 'matched-drivers', label: '命中驱动', value: 'face, lipsync' },
        { key: 'authority-sources', label: '权威来源', value: 'prosody-authority' },
        {
          key: 'authority-binding',
          label: '权威绑定',
          value: '目标 Live2D，驱动 表情、口型，来源 prosody-authority，命中 表情命中 / 动作未命中 / 口型命中，当前仅剩表情、口型维持同一段连续性',
          technicalValue: 'target=live2d | drivers=face, lipsync | sources=prosody-authority | matches=face:yes motion:no lipsync:yes | lane=face+lipsync-only',
        },
        {
          key: 'authority-match',
          label: '绑定命中',
          value: '表情命中 / 动作未命中 / 口型命中',
          technicalValue: 'face:yes motion:no lipsync:yes',
        },
        {
          key: 'embodiment-closure-stage',
          label: '闭环阶段',
          value: 'renderer-rejoin-without-body',
        },
        {
          key: 'settle-authority',
          label: '稳定段归因',
          value: 'authority-bound，片段 segment-authority-only，目标 Live2D，驱动 表情、口型，来源 prosody-authority',
          technicalValue: 'authority-bound | segment=segment-authority-only | target=live2d | drivers=face, lipsync | sources=prosody-authority',
        },
        { key: 'live2d-facial-release', label: 'Live2D 表情回收', value: '320ms' },
        { key: 'live2d-motion-follow', label: 'Live2D 动作跟随', value: '440ms' },
      ],
      preferredExpressionAliases: [],
      preferredMotionAliases: [],
      live2dFacialReleaseMs: 320,
      live2dMotionFollowThroughMs: 440,
      vrmActionFadeMs: null,
      vrmExpressionBlendMs: null,
    })
  })

  it('preserves body-backed continuity authority when body and voice still carry the living segment after visible face motion and lipsync drift', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        authoritySummary: {
          cueId: 'segment-body-voice-carry',
          segmentId: 'segment-body-voice-carry',
          bodyContinuitySummary: 'mode=thinking | stillness=0.68 | gaze=0.54 | breath=0.33 | expressivity=0.12 | resident=measured-return | timing=same-thread-continuation | blink=linger | gazeMode=soften | seg=segment-body-voice-carry',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-body-voice-carry',
            rendererTarget: 'vrm',
            matchedDrivers: ['body'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
          },
          cue: {
            id: 'segment-body-voice-carry',
          },
        },
      },
    } as any)

    expect(view?.cueId).toBe('segment-body-voice-carry')
    expect(view?.authoritySegmentId).toBe('segment-body-voice-carry')
    expect(view?.authorityRendererTarget).toBe('vrm')
    expect(view?.authorityMatchedDrivers).toEqual(['body'])
    expect(view?.authoritySources).toEqual(['prosody-authority'])
    expect(view?.bodyContinuitySummary).toBe('mode=thinking | stillness=0.68 | gaze=0.54 | breath=0.33 | expressivity=0.12 | resident=measured-return | timing=same-thread-continuation | blink=linger | gazeMode=soften | seg=segment-body-voice-carry')
    expect(view?.bodySegmentMatched).toBe(true)
    expect(view?.faceSegmentMatched).toBe(false)
    expect(view?.motionSegmentMatched).toBe(false)
    expect(view?.lipsyncSegmentMatched).toBe(false)
    expect(view?.authorityTrustSummary).toBe('VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。')
    expect(view?.authorityBindingSummary).toBe('target=vrm | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no | lane=body-only')
    expect(view?.authorityMatchSummary).toBe('body:yes face:no motion:no lipsync:no')
    expect(view?.settleAuthoritySummary).toBe('authority-bound | segment=segment-body-voice-carry | target=vrm | drivers=body | sources=prosody-authority')

    expect(view?.summaryEntries).toEqual(expect.arrayContaining([
      { key: 'matched-drivers', label: '命中驱动', value: 'body' },
      {
        key: 'authority-binding',
        label: '权威绑定',
        value: '目标 VRM，驱动 身体，来源 prosody-authority，命中 身体命中 / 表情未命中 / 动作未命中 / 口型未命中，当前仅剩身体维持同一段连续性',
        technicalValue: 'target=vrm | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no | lane=body-only',
      },
      {
        key: 'authority-match',
        label: '绑定命中',
        value: '身体命中 / 表情未命中 / 动作未命中 / 口型未命中',
        technicalValue: 'body:yes face:no motion:no lipsync:no',
      },
      {
        key: 'authority-trust',
        label: '权威可信性',
        value: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
      },
    ]))
  })

  it('surfaces normalized embodiment closure stage on playback cue authority view when identity-continuity', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        authoritySummary: {
          cueId: 'segment-playback-closure-stage-1',
          segmentId: 'segment-playback-closure-stage-1',
          bodyContinuitySummary: 'mode=thinking | stillness=0.68 | gaze=0.54 | breath=0.33 | expressivity=0.12 | resident=measured-return | timing=same-thread-continuation | blink=linger | gazeMode=soften | seg=segment-playback-closure-stage-1',
          embodimentClosureStage: 'audible-body-carry',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-playback-closure-stage-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['body'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
          },
          cue: {
            id: 'segment-playback-closure-stage-1',
          },
        },
      },
    } as any)

    expect(view?.embodimentClosureStage).toBe('audible-body-carry')
    expect(view?.summaryEntries).toContainEqual(expect.objectContaining({
      key: 'embodiment-closure-stage',
      value: 'audible-body-carry',
    }))
  })

  it('extracts structured identity-continuity', () => {
    const cases = [
      {
        expected: 'body-carried-to-renderer-rejoin',
        cueId: 'segment-playback-body-carried-to-renderer-rejoin-1',
        rendererTarget: 'vrm' as const,
        matchedDrivers: ['body', 'lipsync'] as const,
        matchedSources: ['prosody-authority', 'voice-segment'],
        matchSummary: 'body:yes face:no motion:no lipsync:yes',
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        voiceSegmentMatched: false,
      },
      {
        expected: 'full-cross-modal-lock',
        cueId: 'segment-playback-full-cross-modal-lock-1',
        rendererTarget: 'vrm' as const,
        matchedDrivers: ['body', 'face', 'motion', 'lipsync'] as const,
        matchedSources: ['cue-bridge', 'prosody-authority', 'timeline-projection', 'voice-segment'],
        matchSummary: 'body:yes face:yes motion:yes lipsync:yes',
        bodySegmentMatched: true,
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        voiceSegmentMatched: false,
      },
      {
        expected: 'renderer-rejoin-without-body',
        cueId: 'segment-playback-renderer-rejoin-without-body-1',
        rendererTarget: 'live2d' as const,
        matchedDrivers: ['face', 'motion', 'lipsync'] as const,
        matchedSources: ['cue-bridge', 'prosody-authority', 'timeline-projection'],
        matchSummary: 'body:no face:yes motion:yes lipsync:yes',
        bodySegmentMatched: false,
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        voiceSegmentMatched: false,
      },
      {
        expected: 'renderer-rejoin-without-body',
        cueId: 'segment-playback-face-lipsync-body-loss-1',
        rendererTarget: 'live2d' as const,
        matchedDrivers: ['face', 'lipsync'] as const,
        matchedSources: ['prosody-authority'],
        matchSummary: 'body:no face:yes motion:no lipsync:yes',
        bodySegmentMatched: false,
        faceSegmentMatched: true,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        voiceSegmentMatched: false,
      },
      {
        expected: 'renderer-rejoin-without-body',
        cueId: 'segment-playback-face-lipsync-voice-body-loss-1',
        rendererTarget: 'live2d' as const,
        matchedDrivers: ['face', 'lipsync'] as const,
        matchedSources: ['prosody-authority', 'voice-segment'],
        matchSummary: 'body:no face:yes motion:no lipsync:yes voice:yes',
        bodySegmentMatched: false,
        faceSegmentMatched: true,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        voiceSegmentMatched: true,
      },
      {
        expected: 'renderer-rejoin-without-body',
        cueId: 'segment-playback-motion-lipsync-body-loss-1',
        rendererTarget: 'vrm' as const,
        matchedDrivers: ['motion', 'lipsync'] as const,
        matchedSources: ['prosody-authority'],
        matchSummary: 'body:no face:no motion:yes lipsync:yes',
        bodySegmentMatched: false,
        faceSegmentMatched: false,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        voiceSegmentMatched: false,
      },
      {
        expected: 'renderer-rejoin-without-body',
        cueId: 'segment-playback-motion-lipsync-voice-body-loss-1',
        rendererTarget: 'vrm' as const,
        matchedDrivers: ['motion', 'lipsync'] as const,
        matchedSources: ['prosody-authority', 'voice-segment'],
        matchSummary: 'body:no face:no motion:yes lipsync:yes voice:yes',
        bodySegmentMatched: false,
        faceSegmentMatched: false,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        voiceSegmentMatched: true,
      },
    ] as const

    for (const testCase of cases) {
      const lane = testCase.expected === 'renderer-rejoin-without-body' && testCase.matchedDrivers.length === 2
        ? testCase.matchedDrivers[0] === 'face'
          ? testCase.voiceSegmentMatched
            ? 'face+lipsync+voice-only'
            : 'face+lipsync-only'
          : testCase.voiceSegmentMatched
            ? 'motion+lipsync+voice-only'
            : 'motion+lipsync-only'
        : testCase.expected
      const view = buildPlaybackCueAuthorityView({
        speech: {
          authoritySummary: {
            cueId: testCase.cueId,
            segmentId: testCase.cueId,
            rendererTarget: testCase.rendererTarget,
            matchedDrivers: [...testCase.matchedDrivers],
            matchedSources: [...testCase.matchedSources],
            bindingSummary: `target=${testCase.rendererTarget} | drivers=${testCase.matchedDrivers.join(', ')} | sources=${testCase.matchedSources.join(', ')} | matches=${testCase.matchSummary} | lane=${lane}`,
            matchSummary: testCase.matchSummary,
            settleSummary: `authority-bound | segment=${testCase.cueId} | target=${testCase.rendererTarget} | drivers=${testCase.matchedDrivers.join(', ')} | sources=${testCase.matchedSources.join(', ')} | lane=${lane}`,
          },
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
              voiceSegmentMatched: testCase.voiceSegmentMatched,
            },
            cue: {
              id: testCase.cueId,
            },
          },
        },
      } as any)

      expect(view?.embodimentClosureStage).toBe(testCase.expected)
      expect(view?.summaryEntries).toContainEqual(expect.objectContaining({
        key: 'embodiment-closure-stage',
        value: testCase.expected,
      }))
    }
  })

  it('keeps quieter face+lipsync+voice and motion+lipsync+voice identity-continuity', () => {
    const cases = [
      {
        cueId: 'segment-playback-face-lipsync-voice-governance-1',
        rendererTarget: 'live2d' as const,
        matchedDrivers: ['face', 'lipsync'] as const,
        matchedSources: ['prosody-authority', 'voice-segment'],
        matchSummary: 'body:no face:yes motion:no lipsync:yes voice:yes',
        faceSegmentMatched: true,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        voiceSegmentMatched: true,
        expectedLaneTruth: '当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
      },
      {
        cueId: 'segment-playback-motion-lipsync-voice-governance-1',
        rendererTarget: 'vrm' as const,
        matchedDrivers: ['motion', 'lipsync'] as const,
        matchedSources: ['prosody-authority', 'voice-segment'],
        matchSummary: 'body:no face:no motion:yes lipsync:yes voice:yes',
        faceSegmentMatched: false,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        voiceSegmentMatched: true,
        expectedLaneTruth: '当前仅剩动作、口型、声音维持同一段连续性，可见 identity-continuity',
      },
    ] as const

    for (const testCase of cases) {
      const lane = testCase.matchedDrivers[0] === 'face'
        ? 'face+lipsync+voice-only'
        : 'motion+lipsync+voice-only'
      const view = buildPlaybackCueAuthorityView({
        speech: {
          authoritySummary: {
            cueId: testCase.cueId,
            segmentId: testCase.cueId,
            rendererTarget: testCase.rendererTarget,
            matchedDrivers: [...testCase.matchedDrivers],
            matchedSources: [...testCase.matchedSources],
            bindingSummary: `target=${testCase.rendererTarget} | drivers=${testCase.matchedDrivers.join(', ')} | sources=${testCase.matchedSources.join(', ')} | matches=${testCase.matchSummary} | lane=${lane}`,
            matchSummary: testCase.matchSummary,
            settleSummary: `authority-bound | segment=${testCase.cueId} | target=${testCase.rendererTarget} | drivers=${testCase.matchedDrivers.join(', ')} | sources=${testCase.matchedSources.join(', ')} | lane=${lane}`,
          },
          playbackTelemetry: {
            rendererTarget: testCase.rendererTarget,
            driverAuthority: {
              segmentId: testCase.cueId,
              rendererTarget: testCase.rendererTarget,
              matchedDrivers: [...testCase.matchedDrivers],
              sources: [...testCase.matchedSources],
              faceSegmentMatched: testCase.faceSegmentMatched,
              motionSegmentMatched: testCase.motionSegmentMatched,
              lipsyncSegmentMatched: testCase.lipsyncSegmentMatched,
              voiceSegmentMatched: testCase.voiceSegmentMatched,
            },
            cue: {
              id: testCase.cueId,
            },
          },
        },
      } as any)

      expect(view?.summaryEntries).toEqual(expect.arrayContaining([
        expect.objectContaining({
          key: 'authority-binding',
          value: expect.stringContaining(testCase.expectedLaneTruth),
        }),
        expect.objectContaining({
          key: 'settle-authority',
          value: expect.stringContaining(testCase.expectedLaneTruth),
        }),
      ]))
    }
  })

  it('keeps continuity structured closure stages visible on playback cue authority view when legacy closure hints are absent upstream', () => {
    const cases = [
      {
        cueId: 'segment-playback-continuity-live2d-only-1',
        rendererTarget: 'live2d' as const,
        matchedDrivers: ['face', 'motion', 'lipsync', 'voice'] as const,
        continuityEvidence: {
          live2dAuthorityView: {
            continuityExecutionAuthoritySegmentId: 'segment-playback-continuity-live2d-only-1',
            continuityExecutionSummary: 'aligned | authority=segment-playback-continuity-live2d-only-1 | active=face, motion, lipsync, voice | closure=renderer-rejoin-without-body | lane=face+motion+lipsync+voice-only | remaining-open=none',
          },
          vrmAuthorityView: null,
        },
        expected: 'renderer-rejoin-without-body',
      },
      {
        cueId: 'segment-playback-continuity-vrm-only-1',
        rendererTarget: 'vrm' as const,
        matchedDrivers: ['body', 'face', 'motion', 'lipsync', 'voice'] as const,
        continuityEvidence: {
          live2dAuthorityView: null,
          vrmAuthorityView: {
            continuityFramePerformanceSegmentId: 'segment-playback-continuity-vrm-only-1',
            continuityFrameSpeechSegmentId: 'segment-playback-continuity-vrm-only-1',
            continuityFrameSummary: 'aligned | segment=segment-playback-continuity-vrm-only-1 | active=body, face, motion, lipsync, voice | closure=full-cross-modal-lock | lane=full-driver-rejoin | remaining-open=none',
          },
        },
        expected: 'full-cross-modal-lock',
      },
    ] as const

    for (const testCase of cases) {
      const view = buildPlaybackCueAuthorityView({
        speech: {
          authoritySummary: {
            cueId: testCase.cueId,
            segmentId: testCase.cueId,
            rendererTarget: testCase.rendererTarget,
            matchedDrivers: [...testCase.matchedDrivers],
            matchedSources: ['prosody-authority', 'voice-segment'],
            bindingSummary: `target=${testCase.rendererTarget} | drivers=${testCase.matchedDrivers.join(', ')} | sources=prosody-authority, voice-segment`,
            matchSummary: testCase.rendererTarget === 'live2d'
              ? 'body:no face:yes motion:yes lipsync:yes voice:yes'
              : 'body:yes face:yes motion:yes lipsync:yes voice:yes',
            settleSummary: `authority-bound | segment=${testCase.cueId} | target=${testCase.rendererTarget} | drivers=${testCase.matchedDrivers.join(', ')} | sources=prosody-authority, voice-segment`,
          },
          playbackTelemetry: {
            rendererTarget: testCase.rendererTarget,
            driverAuthority: {
              segmentId: testCase.cueId,
              rendererTarget: testCase.rendererTarget,
              matchedDrivers: [...testCase.matchedDrivers],
              sources: ['prosody-authority', 'voice-segment'],
              bodySegmentMatched: testCase.rendererTarget === 'vrm',
              faceSegmentMatched: true,
              motionSegmentMatched: true,
              lipsyncSegmentMatched: true,
              voiceSegmentMatched: true,
            },
            cue: {
              id: testCase.cueId,
            },
          },
        },
        ...testCase.continuityEvidence,
      } as any)

      expect(view?.embodimentClosureStage).toBe(testCase.expected)
      expect(view?.summaryEntries).toContainEqual(expect.objectContaining({
        key: 'embodiment-closure-stage',
        value: testCase.expected,
      }))
    }
  })

  it('does not infer embodiment closure stage from stale Live2D continuity summary-only evidence when explicit identity-continuity', () => {
    const cueId = 'segment-playback-summary-only-current-body'
    const view = buildPlaybackCueAuthorityView({
      speech: {
        authoritySummary: {
          cueId,
          segmentId: cueId,
          rendererTarget: 'vrm',
          matchedDrivers: ['body'],
          matchedSources: ['prosody-authority'],
          bindingSummary: 'target=vrm | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no | lane=body-only',
          matchSummary: 'body:yes face:no motion:no lipsync:no',
          settleSummary: `authority-bound | segment=${cueId} | target=vrm | drivers=body | sources=prosody-authority`,
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: cueId,
            rendererTarget: 'vrm',
            matchedDrivers: ['body'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
          },
          cue: {
            id: cueId,
          },
        },
      },
      live2dAuthorityView: {
        continuityExecutionSummary: 'aligned | authority=segment-playback-summary-only-stale-live2d | active=face, motion, lipsync, voice | closure=renderer-rejoin-without-body | lane=face+motion+lipsync+voice-only | remaining-open=none',
      },
    } as any)

    expect(view?.embodimentClosureStage).toBeUndefined()
    expect(view?.summaryEntries?.some(entry => entry.key === 'embodiment-closure-stage')).toBe(false)
  })

  it('keeps quieter body+lipsync carry at body-carried-to-renderer-rejoin instead of overstating it as audible body carry on playback cue authority view', () => {
    const cueId = 'segment-playback-body-lipsync-carry-1'
    const view = buildPlaybackCueAuthorityView({
      speech: {
        authoritySummary: {
          cueId,
          segmentId: cueId,
          rendererTarget: 'vrm',
          matchedDrivers: ['body', 'lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
          matchSummary: 'body:yes face:no motion:no lipsync:yes',
          authorityMismatchSummary: 'face-mismatch, motion-mismatch | closure=body-carried-to-renderer-rejoin',
          authorityMismatchReasonSummary: 'the resident body lane is still holding together with one other embodiment lane while face and motion have not rejoined yet | closure=body-carried-to-renderer-rejoin',
          authorityMismatchDisplay: 'the resident body lane is still holding together with one other embodiment lane while face and motion have not rejoined yet | closure=body-carried-to-renderer-rejoin',
          settleSummary: `authority-bound | segment=${cueId} | target=vrm | drivers=body, lipsync | sources=prosody-authority | lane=body+lipsync-only | mode=measured-return | timing=body-lipsync-carry`,
          bodyContinuitySummary: `mode=thinking | stillness=0.68 | gaze=0.54 | breath=0.33 | expressivity=0.12 | resident=measured-return | timing=body-lipsync-carry | blink=linger | gazeMode=soften | seg=${cueId}`,
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: cueId,
            rendererTarget: 'vrm',
            matchedDrivers: ['body', 'lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          cue: {
            id: cueId,
          },
        },
      },
    } as any)

    expect(view?.embodimentClosureStage).toBe('body-carried-to-renderer-rejoin')
    expect(view?.summaryEntries).toContainEqual(expect.objectContaining({
      key: 'embodiment-closure-stage',
      value: 'body-carried-to-renderer-rejoin',
    }))
  })

  it('does not reuse body continuity evidence on playback cue authority view when it explicitly belongs to another segment', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        authoritySummary: {
          cueId: 'segment-current-playback-cue-body',
          segmentId: 'segment-current-playback-cue-body',
          bodyContinuitySummary: 'mode=thinking | stillness=0.68 | gaze=0.54 | breath=0.33 | expressivity=0.12 | closure=audible-body-carry | seg=segment-body-upstream-other',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-current-playback-cue-body',
            rendererTarget: 'vrm',
            matchedDrivers: ['body'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
          },
          cue: {
            id: 'segment-current-playback-cue-body',
          },
        },
      },
    } as any)

    expect(view?.bodyContinuitySummary).toBeNull()
    expect(view?.embodimentClosureStage).toBeUndefined()
  })

  it('keeps remaining-open lipsync and voice carry visible on playback cue authority view when body, face, and motion already re-form on one segment', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        authoritySummary: {
          cueId: 'segment-face-motion-body-rejoined-1',
          segmentId: 'segment-face-motion-body-rejoined-1',
          rendererTarget: 'live2d',
          matchedDrivers: ['face', 'motion'],
          matchedSources: ['prosody-authority', 'timeline-projection'],
          bindingSummary: 'target=live2d | drivers=face, motion | sources=prosody-authority, timeline-projection | matches=body:yes face:yes motion:yes lipsync:no | lane=body+face+motion-only | remaining-open=lipsync+voice',
          matchSummary: 'body:yes face:yes motion:yes lipsync:no',
          settleSummary: 'authority-bound | segment=segment-face-motion-body-rejoined-1 | target=live2d | drivers=face, motion | sources=prosody-authority, timeline-projection | lane=body+face+motion-only | remaining-open=lipsync+voice',
        },
        playbackTelemetry: {
          rendererTarget: 'live2d',
          driverAuthority: {
            segmentId: 'segment-face-motion-body-rejoined-1',
            rendererTarget: 'live2d',
            matchedDrivers: ['face', 'motion'],
            sources: ['prosody-authority', 'timeline-projection'],
            bodySegmentMatched: true,
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: false,
          },
          cue: {
            id: 'segment-face-motion-body-rejoined-1',
          },
        },
      },
    } as any)

    expect(view?.authorityBindingSummary).toContain('lane=body+face+motion-only')
    expect(view?.authorityBindingSummary).toContain('remaining-open=lipsync+voice')
    expect(view?.settleAuthoritySummary).toContain('lane=body+face+motion-only')
    expect(view?.settleAuthoritySummary).toContain('remaining-open=lipsync+voice')
    expect(view?.summaryEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'authority-binding',
        technicalValue: expect.stringContaining('remaining-open=lipsync+voice'),
      }),
      expect.objectContaining({
        key: 'settle-authority',
        technicalValue: expect.stringContaining('remaining-open=lipsync+voice'),
      }),
    ]))
  })

  it('preserves body-backed snapshot-native authority summaries when the cue already carries an upstream body-led continuity line', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        authoritySummary: {
          cueId: 'segment-body-summary-native',
          segmentId: 'segment-body-summary-native',
          rendererTarget: 'vrm',
          matchedDrivers: ['body'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityTrustSummary: '上游 authority trust：这一段现在主要还是由身体线托住，先别把她重新拆成独立的表情/动作壳层。',
          settleSummary: '上游 authority settle',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-body-summary-native',
            rendererTarget: 'vrm',
            matchedDrivers: ['body'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
          },
          cue: {
            id: 'segment-body-summary-native',
          },
        },
      },
    } as any)

    expect(view?.authorityMatchedDrivers).toEqual(['body'])
    expect(view?.bodySegmentMatched).toBe(true)
    expect(view?.faceSegmentMatched).toBe(false)
    expect(view?.motionSegmentMatched).toBe(false)
    expect(view?.lipsyncSegmentMatched).toBe(false)
    expect(view?.authorityBindingSummary).toBe('上游 authority 绑定 | 身体命中 / 表情未命中 / 动作未命中 / 口型未命中')
    expect(view?.authorityMatchSummary).toBe('上游 authority 命中 | 身体命中 / 表情未命中 / 动作未命中 / 口型未命中')
    expect(view?.authorityTrustSummary).toBe('上游 authority trust：这一段现在主要还是由身体线托住，先别把她重新拆成独立的表情/动作壳层。')
    expect(view?.settleAuthoritySummary).toBe('上游 authority settle')
  })

  it('preserves body-carried speech rejoin matched drivers when authority match summary is richer than the upstream matched driver list', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        authoritySummary: {
          cueId: 'segment-body-speech-playback-cue-1',
          segmentId: 'segment-body-speech-playback-cue-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority', 'voice-segment'],
          bindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
          matchSummary: 'body:yes face:no motion:no lipsync:yes',
          settleSummary: 'authority-bound | segment=segment-body-speech-playback-cue-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-body-speech-playback-cue-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: false,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          cue: {
            id: 'segment-body-speech-playback-cue-1',
          },
        },
      },
    } as any)

    expect(view?.authorityMatchedDrivers).toEqual(['body', 'lipsync'])
    expect(view?.authoritySources).toEqual(['prosody-authority', 'voice-segment'])
    expect(view?.bodySegmentMatched).toBe(true)
    expect(view?.faceSegmentMatched).toBe(false)
    expect(view?.motionSegmentMatched).toBe(false)
    expect(view?.lipsyncSegmentMatched).toBe(true)
    expect(view?.authorityBindingSummary).toBe('target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only')
    expect(view?.authorityMatchSummary).toBe('body:yes face:no motion:no lipsync:yes')
    expect(view?.settleAuthoritySummary).toBe('authority-bound | segment=segment-body-speech-playback-cue-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment')
    expect(view?.summaryEntries).toEqual(expect.arrayContaining([
      { key: 'matched-drivers', label: '命中驱动', value: 'body, lipsync' },
      expect.objectContaining({
        key: 'authority-binding',
        technicalValue: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
      }),
      expect.objectContaining({
        key: 'authority-match',
        technicalValue: 'body:yes face:no motion:no lipsync:yes',
      }),
    ]))
  })

  it('prefers current body-lipsync-voice lane truth over stale body-line trust on playback cue authority view', () => {
    const cueId = 'segment-playback-cue-body-lipsync-voice-override-1'
    const view = buildPlaybackCueAuthorityView({
      speech: {
        authoritySummary: {
          cueId,
          segmentId: cueId,
          rendererTarget: 'vrm',
          matchedDrivers: ['body', 'lipsync'],
          matchedSources: ['prosody-authority', 'voice-segment'],
          bindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
          matchSummary: 'body:yes face:no motion:no lipsync:yes',
          authorityTrustSummary: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
          settleSummary: `authority-bound | segment=${cueId} | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment`,
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: cueId,
            rendererTarget: 'vrm',
            matchedDrivers: ['body', 'lipsync'],
            sources: ['prosody-authority', 'voice-segment'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
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
          },
          cue: {
            id: cueId,
            text: '身体、口型和声音都已经回到同一段里。',
            prosodyWeight: 0.24,
            mouthWeight: 0.21,
            headWeight: 0.18,
            facialCue: 'soft-gaze',
            actionCue: 'return',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
            settleMode: 'hold',
            rendererHints: {
              residentMode: 'care',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              preferredExpressionAliases: [],
              preferredMotionAliases: [],
            },
            rendererSettle: {
              vrmActionFadeMs: 320,
              vrmExpressionBlendMs: 360,
            },
          },
          drivers: {
            face: null,
            motion: null,
            lipsync: {
              mode: 'energy-phoneme-hybrid',
              playbackPhase: 'playing',
              segmentId: cueId,
              visemeHints: [],
            },
          },
        },
      },
    } as any)

    expect(view?.authorityMatchedDrivers).toEqual(['body', 'lipsync', 'voice'])
    expect(view?.summaryEntries).toContainEqual({
      key: 'matched-drivers',
      label: '命中驱动',
      value: 'body, lipsync, voice',
    })
    expect(view?.authorityTrustSummary).toBe('VRM 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。 当前身体还在按 linger blink / soften gaze 的节奏把这一条线稳住。')
    expect(view?.summaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority-trust',
      value: 'VRM 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。 当前身体还在按 linger blink / soften gaze 的节奏把这一条线稳住。',
    }))
  })

  it('does not claim same-body-line recovery when one authority driver is still missing', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        playbackTelemetry: {
          rendererTarget: 'live2d',
          prosodyAuthority: {
            segmentId: 'segment-live2d-partial',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.31,
            cueMouthWeight: 0.30,
            cueHeadWeight: 0.24,
            visemePeakWeight: 0.71,
          },
          driverAuthority: {
            segmentId: 'segment-live2d-partial',
            rendererTarget: 'live2d',
            matchedDrivers: ['face', 'lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: true,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          cue: {
            id: 'segment-live2d-partial',
          },
        },
      },
    } as any)

    expect(view?.authorityTrustSummary).toBe('韵律权威链已重新绑定到当前片段，可直接进入长期基线。')
  })

  it('prefers driver authority prosody metadata when top-level prosody telemetry is absent', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        playbackTelemetry: {
          rendererTarget: 'vrm',
          prosodyAuthority: null,
          driverAuthority: {
            segmentId: 'segment-driver-prosody-native',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
            prosodyAuthority: {
              segmentId: 'segment-driver-prosody-native',
              provenance: 'authority-bound',
              source: 'prosody-authority',
              mode: 'energy-phoneme-hybrid',
              cueProsodyWeight: 0.35,
              cueMouthWeight: 0.35,
              cueHeadWeight: 0.32,
              visemePeakWeight: 0.75,
            },
          },
          cue: {
            id: 'segment-driver-prosody-native',
          },
        },
      },
    } as any)

    expect(view?.prosodyAuthoritySummary).toBe(
      'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-driver-prosody-native',
    )
    expect(view?.authorityTrustSummary).toBe('VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。')
  })

  it('falls back to current playback prosody authority on playback cue authority view when upstream summary explicitly belongs to another segment', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        authoritySummary: {
          cueId: 'segment-current-playback-cue-prosody',
          segmentId: 'segment-current-playback-cue-prosody',
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.48 | mouth=0.42 | head=0.18 | visemePeak=0.66 | provenance=authority-bound | source=prosody-authority | segment=segment-prosody-upstream-other',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-current-playback-cue-prosody',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
            prosodyAuthority: {
              segmentId: 'segment-current-playback-cue-prosody',
              provenance: 'authority-bound',
              source: 'prosody-authority',
              mode: 'energy-phoneme-hybrid',
              cueProsodyWeight: 0.35,
              cueMouthWeight: 0.35,
              cueHeadWeight: 0.32,
              visemePeakWeight: 0.75,
            },
          },
          cue: {
            id: 'segment-current-playback-cue-prosody',
          },
        },
      },
    } as any)

    expect(view?.prosodyAuthoritySummary).toBe(
      'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-current-playback-cue-prosody',
    )
  })

  it('keeps explicit no-match segment-aware summaries instead of collapsing them into absence', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-authority-mismatch',
            rendererTarget: 'vrm',
            matchedDrivers: ['face'],
            sources: ['seeded-face'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
          },
          cue: {
            id: 'segment-authority-mismatch',
          },
        },
      },
    } as any)

    expect(view).toEqual({
      cueId: 'segment-authority-mismatch',
      authoritySegmentId: 'segment-authority-mismatch',
      authorityRendererTarget: 'vrm',
      authorityMatchedDrivers: ['face'],
      authoritySources: ['seeded-face'],
      bodyContinuitySummary: null,
      authorityTrustSummary: null,
      prosodyAuthoritySummary: null,
      traceEmbodimentSummary: null,
      residentMode: null,
      preferredBlinkCadence: null,
      preferredGazeMode: null,
      bodySegmentMatched: null,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: false,
      voiceSegmentMatched: null,
      authorityBindingSummary: 'target=vrm | drivers=face | sources=seeded-face | matches=face:no motion:no lipsync:no',
      authorityMatchSummary: 'face:no motion:no lipsync:no',
      settleAuthoritySummary: 'authority-bound | segment=segment-authority-mismatch | target=vrm | drivers=face | sources=seeded-face',
      summaryEntries: [
        { key: 'cue-id', label: '当前片段', value: 'segment-authority-mismatch' },
        { key: 'authority-segment', label: '权威片段', value: 'segment-authority-mismatch' },
        { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
        { key: 'matched-drivers', label: '命中驱动', value: 'face' },
        { key: 'authority-sources', label: '权威来源', value: 'seeded-face' },
        {
          key: 'authority-binding',
          label: '权威绑定',
          value: '目标 VRM，驱动 表情，来源 seeded-face，命中 表情未命中 / 动作未命中 / 口型未命中',
          technicalValue: 'target=vrm | drivers=face | sources=seeded-face | matches=face:no motion:no lipsync:no',
        },
        {
          key: 'authority-match',
          label: '绑定命中',
          value: '表情未命中 / 动作未命中 / 口型未命中',
          technicalValue: 'face:no motion:no lipsync:no',
        },
        {
          key: 'settle-authority',
          label: '稳定段归因',
          value: 'authority-bound，片段 segment-authority-mismatch，目标 VRM，驱动 表情，来源 seeded-face',
          technicalValue: 'authority-bound | segment=segment-authority-mismatch | target=vrm | drivers=face | sources=seeded-face',
        },
      ],
      preferredExpressionAliases: [],
      preferredMotionAliases: [],
      live2dFacialReleaseMs: null,
      live2dMotionFollowThroughMs: null,
      vrmActionFadeMs: null,
      vrmExpressionBlendMs: null,
    })
  })

  it('deduplicates seeded authority sources before building playback cue authority summaries', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-authority-dedupe',
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection', 'prosody-authority'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
          cue: {
            id: 'segment-authority-dedupe',
          },
        },
      },
    } as any)

    expect(view).toEqual({
      cueId: 'segment-authority-dedupe',
      authoritySegmentId: 'segment-authority-dedupe',
      authorityRendererTarget: 'vrm',
      authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
      authoritySources: ['prosody-authority', 'timeline-projection'],
      bodyContinuitySummary: null,
      authorityTrustSummary: 'VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
      prosodyAuthoritySummary: null,
      traceEmbodimentSummary: null,
      residentMode: null,
      preferredBlinkCadence: null,
      preferredGazeMode: null,
      bodySegmentMatched: null,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: null,
      authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
      authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
      settleAuthoritySummary: 'authority-bound | segment=segment-authority-dedupe | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
      summaryEntries: [
        { key: 'cue-id', label: '当前片段', value: 'segment-authority-dedupe' },
        { key: 'authority-segment', label: '权威片段', value: 'segment-authority-dedupe' },
        { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
        { key: 'matched-drivers', label: '命中驱动', value: 'face, motion, lipsync' },
        { key: 'authority-sources', label: '权威来源', value: 'prosody-authority, timeline-projection' },
        {
          key: 'authority-binding',
          label: '权威绑定',
          value: '目标 VRM，驱动 表情、动作、口型，来源 prosody-authority, timeline-projection，命中 表情命中 / 动作命中 / 口型命中',
          technicalValue: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
        },
        {
          key: 'authority-match',
          label: '绑定命中',
          value: '表情命中 / 动作命中 / 口型命中',
          technicalValue: 'face:yes motion:yes lipsync:yes',
        },
        {
          key: 'authority-trust',
          label: '权威可信性',
          value: 'VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
        },
        {
          key: 'settle-authority',
          label: '稳定段归因',
          value: 'authority-bound，片段 segment-authority-dedupe，目标 VRM，驱动 表情、动作、口型，来源 prosody-authority, timeline-projection',
          technicalValue: 'authority-bound | segment=segment-authority-dedupe | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
        },
      ],
      preferredExpressionAliases: [],
      preferredMotionAliases: [],
      live2dFacialReleaseMs: null,
      live2dMotionFollowThroughMs: null,
      vrmActionFadeMs: null,
      vrmExpressionBlendMs: null,
    })
  })

  it('prefers snapshot-native authority summaries over locally recomputed playback cue strings', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        authoritySummary: {
          cueId: 'segment-summary-native',
          segmentId: 'segment-summary-native',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityTrustSummary: '上游 authority trust：已经回到当前片段主链。',
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-summary-native',
          settleSummary: '上游 authority settle',
          traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=lipsync | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-summary-native',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          cue: {
            id: 'segment-summary-native',
          },
        },
      },
    } as any)

    expect(view).toEqual({
      cueId: 'segment-summary-native',
      authoritySegmentId: 'segment-summary-native',
      authorityRendererTarget: 'vrm',
      authorityMatchedDrivers: ['lipsync', 'voice'],
      authoritySources: ['prosody-authority'],
      bodyContinuitySummary: null,
      authorityTrustSummary: '上游 authority trust：已经回到当前片段主链。',
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-summary-native',
      traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=lipsync | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
      residentMode: null,
      preferredBlinkCadence: null,
      preferredGazeMode: null,
      bodySegmentMatched: null,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: true,
      authorityBindingSummary: '上游 authority 绑定 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中',
      authorityMatchSummary: '上游 authority 命中 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中',
      settleAuthoritySummary: '上游 authority settle',
      summaryEntries: [
        { key: 'cue-id', label: '当前片段', value: 'segment-summary-native' },
        { key: 'authority-segment', label: '权威片段', value: 'segment-summary-native' },
        { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
        { key: 'matched-drivers', label: '命中驱动', value: 'lipsync, voice' },
        { key: 'authority-sources', label: '权威来源', value: 'prosody-authority' },
        { key: 'authority-binding', label: '权威绑定', value: '上游 authority 绑定 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中' },
        { key: 'authority-match', label: '绑定命中', value: '上游 authority 命中 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中' },
        { key: 'authority-trust', label: '权威可信性', value: '上游 authority trust：已经回到当前片段主链。' },
        {
          key: 'prosody-authority',
          label: '韵律权威',
          value: '模式 energy-phoneme-hybrid，韵律 0.35，口部 0.35，头部 0.32，峰值口型 0.75，权威绑定，来源 韵律权威，片段 segment-summary-native',
          technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-summary-native',
        },
        { key: 'settle-authority', label: '稳定段归因', value: '上游 authority settle' },
      ],
      preferredExpressionAliases: [],
      preferredMotionAliases: [],
      live2dFacialReleaseMs: null,
      live2dMotionFollowThroughMs: null,
      vrmActionFadeMs: null,
      vrmExpressionBlendMs: null,
    })
  })

  it('keeps thinner affective-residue room-making wording visible in playback cue settle authority when upstream authority already carries the measured-return line', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        authoritySummary: {
          cueId: 'segment-thin-affective-playback-cue',
          segmentId: 'segment-thin-affective-playback-cue',
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          matchedSources: ['prosody-authority', 'timeline-projection'],
          bindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
          matchSummary: 'face:yes motion:yes lipsync:yes',
          settleSummary: 'authority-bound | segment=segment-thin-affective-playback-cue | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-thin-affective-playback-cue',
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
          cue: {
            id: 'segment-thin-affective-playback-cue',
          },
        },
      },
    } as any)

    expect(view?.settleAuthoritySummary).toContain('余韵还在')
    expect(view?.authorityTrustSummary).toContain('余韵还在，先留白，别立刻把温度放大')
    expect(view?.summaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority-trust',
      value: expect.stringContaining('余韵还在，先留白，别立刻把温度放大'),
    }))
    expect(view?.summaryEntries).toContainEqual(expect.objectContaining({
      key: 'settle-authority',
      value: expect.stringContaining('余韵还在'),
    }))
  })

  it('prefers thinner affective-residue settle reason over generic runtime authority trust in playback cue authority trust', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        authoritySummary: {
          cueId: 'segment-thin-affective-playback-cue-runtime-override',
          segmentId: 'segment-thin-affective-playback-cue-runtime-override',
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          matchedSources: ['prosody-authority', 'timeline-projection'],
          bindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
          matchSummary: 'face:yes motion:yes lipsync:yes',
          authorityTrustSummary: 'VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
          settleSummary: 'authority-bound | segment=segment-thin-affective-playback-cue-runtime-override | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-thin-affective-playback-cue-runtime-override',
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
          cue: {
            id: 'segment-thin-affective-playback-cue-runtime-override',
          },
        },
      },
    } as any)

    expect(view?.authorityTrustSummary).toContain('余韵还在，先留白，别立刻把温度放大')
    expect(view?.summaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority-trust',
      value: expect.stringContaining('余韵还在，先留白，别立刻把温度放大'),
    }))
  })

  it('keeps thinner affective-residue room-making wording visible in playback cue settle authority when local telemetry must rebuild the measured-return line', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        driverSummary: {
          rendererTarget: 'vrm',
          face: {
            cue: 'focused',
            source: 'prosody-authority',
            confidence: 0.93,
            segmentId: 'segment-thin-affective-playback-local',
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonSummary: '余韵还在，先留白，别立刻把温度放大',
          },
          motion: {
            cue: 'observe_focus',
            source: 'timeline-projection',
            confidence: 0.9,
            segmentId: 'segment-thin-affective-playback-local',
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonSummary: '余韵还在，先留白，别立刻把温度放大',
          },
          lipsync: {
            cue: 'I',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: 'segment-thin-affective-playback-local',
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
            segmentId: 'segment-thin-affective-playback-local',
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
          cue: {
            id: 'segment-thin-affective-playback-local',
          },
        },
      },
    } as any)

    expect(view?.settleAuthoritySummary).toContain('余韵还在')
    expect(view?.authorityTrustSummary).toContain('余韵还在，先留白，别立刻把温度放大')
    expect(view?.summaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority-trust',
      value: expect.stringContaining('余韵还在，先留白，别立刻把温度放大'),
    }))
    expect(view?.summaryEntries).toContainEqual(expect.objectContaining({
      key: 'settle-authority',
      value: expect.stringContaining('余韵还在'),
    }))
  })

  it('surfaces repair-first companionship trust from playback cue renderer hints when the authority is still holding the repair line', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-repair-first-playback',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          prosodyAuthority: {
            segmentId: 'segment-repair-first-playback',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.28,
            cueMouthWeight: 0.3,
            cueHeadWeight: 0.18,
            visemePeakWeight: 0.62,
          },
          cue: {
            id: 'segment-repair-first-playback',
            rendererHints: {
              residentMode: 'repair-before-closeness',
              preferredExpressionAliases: ['RecoverSoft', 'CalmInspect'],
              preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
          },
        },
      },
    } as any)

    expect(view?.residentMode).toBe('repair-before-closeness')
    expect(view?.preferredBlinkCadence).toBe('quiet')
    expect(view?.preferredGazeMode).toBe('soften')
    expect(view?.authorityTrustSummary).toBe('VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。')
    expect(view?.summaryEntries).toContainEqual({
      key: 'authority-trust',
      label: '权威可信性',
      value: 'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。',
    })
  })

  it('keeps same-turn-if-invited measured-return trust on the same callback line instead of describing it like a fresh reopening', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-invited-measured-return-playback',
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
          cue: {
            id: 'segment-invited-measured-return-playback',
            actionWindow: 'same-turn-if-invited',
            rendererHints: {
              residentMode: 'measured-return',
              preferredExpressionAliases: ['RecoverSoft'],
              preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
        },
      },
    } as any)

    expect(view?.residentMode).toBe('measured-return')
    expect(view?.preferredBlinkCadence).toBe('linger')
    expect(view?.preferredGazeMode).toBe('soften')
    expect(view?.authorityTrustSummary).toBe('VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。')
    expect(view?.summaryEntries).toContainEqual({
      key: 'authority-trust',
      label: '权威可信性',
      value: 'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。',
    })
  })

  it('prefers same-cue upstream authority match flags over stale driver booleans', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        authoritySummary: {
          cueId: 'segment-summary-recovered',
          segmentId: 'segment-summary-recovered',
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          matchedSources: ['prosody-authority', 'timeline-projection'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: 'face:yes motion:yes lipsync:yes',
          settleSummary: '上游 authority settle',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-summary-recovered',
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          cue: {
            id: 'segment-summary-recovered',
          },
        },
      },
    } as any)

    expect(view?.faceSegmentMatched).toBe(true)
    expect(view?.motionSegmentMatched).toBe(true)
    expect(view?.lipsyncSegmentMatched).toBe(true)
    expect(view?.authorityMatchSummary).toBe('face:yes motion:yes lipsync:yes')
    expect(view?.authorityBindingSummary).toBe('上游 authority 绑定 | 表情命中 / 动作命中 / 口型命中')
    expect(view?.settleAuthoritySummary).toBe('上游 authority settle')
  })

  it('does not reuse same-cue upstream authority summaries when their segment has drifted onto another embodied line', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        authoritySummary: {
          cueId: 'segment-current-same-cue-playback',
          segmentId: 'segment-upstream-other-same-cue-playback',
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          matchedSources: ['timeline-projection'],
          bindingSummary: '上游 authority 绑定：别把另一段身体线拿来复用。',
          matchSummary: 'body:no face:yes motion:yes lipsync:yes',
          authorityTrustSummary: '上游 authority trust：这其实还是另一段没有退干净的身体线。',
          settleSummary: 'authority-bound | segment=segment-upstream-other-same-cue-playback | target=vrm | drivers=face, motion, lipsync | sources=timeline-projection',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-current-same-cue-playback',
            rendererTarget: 'vrm',
            matchedDrivers: ['body'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
          },
          cue: {
            id: 'segment-current-same-cue-playback',
          },
        },
      },
    } as any)

    expect(view?.cueId).toBe('segment-current-same-cue-playback')
    expect(view?.authoritySegmentId).toBe('segment-current-same-cue-playback')
    expect(view?.authorityMatchedDrivers).toEqual(['body'])
    expect(view?.authoritySources).toEqual(['prosody-authority'])
    expect(view?.bodySegmentMatched).toBe(true)
    expect(view?.faceSegmentMatched).toBe(false)
    expect(view?.motionSegmentMatched).toBe(false)
    expect(view?.lipsyncSegmentMatched).toBe(false)
    expect(view?.authorityBindingSummary).toBe('target=vrm | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no | lane=body-only')
    expect(view?.authorityMatchSummary).toBe('body:yes face:no motion:no lipsync:no')
    expect(view?.authorityTrustSummary).toBe('VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。')
    expect(view?.settleAuthoritySummary).toBe('authority-bound | segment=segment-current-same-cue-playback | target=vrm | drivers=body | sources=prosody-authority')
  })

  it('recovers same-cue lane truth from upstream matched drivers when authority match summary is descriptive text', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        authoritySummary: {
          cueId: 'segment-summary-descriptive',
          segmentId: 'segment-summary-descriptive',
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion'],
          matchedSources: ['prosody-authority', 'timeline-projection'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          settleSummary: '上游 authority settle',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-summary-descriptive',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          cue: {
            id: 'segment-summary-descriptive',
          },
        },
      },
    } as any)

    expect(view?.faceSegmentMatched).toBe(true)
    expect(view?.motionSegmentMatched).toBe(true)
    expect(view?.lipsyncSegmentMatched).toBe(true)
    expect(view?.authorityMatchSummary).toBe('上游 authority 命中 | 表情命中 / 动作命中 / 口型命中')
  })

  it('surfaces snapshot-native trace embodiment summary from upstream authority summary', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        authoritySummary: {
          cueId: 'segment-trace-native',
          segmentId: 'segment-trace-native',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          settleSummary: '上游 authority settle',
          traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=lipsync | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-trace-native',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          cue: {
            id: 'segment-trace-native',
          },
        },
      },
    } as any)

    expect(view?.traceEmbodimentSummary).toBe('turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=lipsync | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall')
  })

  it('does not reuse upstream trace embodiment summary when authority summary cue differs from the playback cue', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        authoritySummary: {
          cueId: 'segment-other-trace',
          segmentId: 'segment-other-trace',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bindingSummary: '别的 cue authority 绑定',
          matchSummary: '别的 cue authority 命中',
          settleSummary: '别的 cue authority settle',
          traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=lipsync | scenario=late-night-fatigue',
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-current-playback',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          cue: {
            id: 'segment-current-playback',
          },
        },
      },
    } as any)

    expect(view).toEqual({
      cueId: 'segment-current-playback',
      authoritySegmentId: 'segment-current-playback',
      authorityRendererTarget: 'vrm',
      authorityMatchedDrivers: ['lipsync'],
      authoritySources: ['prosody-authority'],
      bodyContinuitySummary: null,
      authorityTrustSummary: 'VRM 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。',
      prosodyAuthoritySummary: null,
      traceEmbodimentSummary: null,
      residentMode: null,
      preferredBlinkCadence: null,
      preferredGazeMode: null,
      bodySegmentMatched: null,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      voiceSegmentMatched: null,
      authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only',
      authorityMatchSummary: 'face:no motion:no lipsync:yes',
      settleAuthoritySummary: 'authority-bound | segment=segment-current-playback | target=vrm | drivers=lipsync | sources=prosody-authority',
      summaryEntries: [
        { key: 'cue-id', label: '当前片段', value: 'segment-current-playback' },
        { key: 'authority-segment', label: '权威片段', value: 'segment-current-playback' },
        { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
        { key: 'matched-drivers', label: '命中驱动', value: 'lipsync' },
        { key: 'authority-sources', label: '权威来源', value: 'prosody-authority' },
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
        {
          key: 'authority-trust',
          label: '权威可信性',
          value: 'VRM 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。',
        },
        {
          key: 'settle-authority',
          label: '稳定段归因',
          value: 'authority-bound，片段 segment-current-playback，目标 VRM，驱动 口型，来源 prosody-authority',
          technicalValue: 'authority-bound | segment=segment-current-playback | target=vrm | drivers=lipsync | sources=prosody-authority',
        },
      ],
      preferredExpressionAliases: [],
      preferredMotionAliases: [],
      live2dFacialReleaseMs: null,
      live2dMotionFollowThroughMs: null,
      vrmActionFadeMs: null,
      vrmExpressionBlendMs: null,
    })
  })

  it('preserves continuity renderer hint signature and reason tags on playback cue authority view', () => {
    const view = buildPlaybackCueAuthorityView({
      speech: {
        playbackTelemetry: {
          rendererTarget: 'live2d',
          driverAuthority: {
            segmentId: 'segment-continuity-playback-view',
            rendererTarget: 'live2d',
            matchedDrivers: ['body', 'lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          cue: {
            id: 'segment-continuity-playback-view',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              preferredExpressionAliases: ['RecoverSoft'],
              preferredMotionAliases: ['IdleSettle'],
              reasonTags: [
                'embodiment:audible-continuity-line',
                'embodiment:still-voiced-motion-line',
              ],
              signature: 'embodiment:body-lipsync-voice-rejoin',
            },
          } as any,
        },
      },
    } as any)

    expect(view).toEqual(expect.objectContaining({
      cueId: 'segment-continuity-playback-view',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonTags: [
        'embodiment:audible-continuity-line',
        'embodiment:still-voiced-motion-line',
      ],
      signature: 'embodiment:body-lipsync-voice-rejoin',
    }))
    expect(view?.summaryEntries).toContainEqual({
      key: 'identity-continuity-signature',
      label: '同一人签名',
      value: 'embodiment:body-lipsync-voice-rejoin',
    })
    expect(view?.summaryEntries).toContainEqual({
      key: 'identity-continuity-reasons',
      label: '同一人线索',
      value: 'embodiment:audible-continuity-line, embodiment:still-voiced-motion-line',
    })
  })
})
