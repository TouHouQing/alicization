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
      authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
      authoritySources: ['prosody-authority', 'timeline-projection'],
      authorityTrustSummary: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-explicit-playback-cue-metadata',
      traceEmbodimentSummary: null,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
      authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
      settleAuthoritySummary: 'authority-bound | segment=segment-explicit-playback-cue-metadata | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
      summaryEntries: [
        { key: 'cue-id', label: '当前片段', value: 'segment-explicit-playback-cue-metadata' },
        { key: 'authority-segment', label: '权威片段', value: 'segment-explicit-playback-cue-metadata' },
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
          value: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
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
          value: 'authority-bound，片段 segment-explicit-playback-cue-metadata，目标 VRM，驱动 表情、动作、口型，来源 prosody-authority, timeline-projection',
          technicalValue: 'authority-bound | segment=segment-explicit-playback-cue-metadata | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
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
      authorityTrustSummary: null,
      prosodyAuthoritySummary: null,
      traceEmbodimentSummary: null,
      faceSegmentMatched: true,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      authorityBindingSummary: 'target=live2d | drivers=face, lipsync | sources=prosody-authority | matches=face:yes motion:no lipsync:yes',
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
          value: '目标 Live2D，驱动 表情、口型，来源 prosody-authority，命中 表情命中 / 动作未命中 / 口型命中',
          technicalValue: 'target=live2d | drivers=face, lipsync | sources=prosody-authority | matches=face:yes motion:no lipsync:yes',
        },
        {
          key: 'authority-match',
          label: '绑定命中',
          value: '表情命中 / 动作未命中 / 口型命中',
          technicalValue: 'face:yes motion:no lipsync:yes',
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
    expect(view?.authorityTrustSummary).toBe('韵律权威链已重新绑定到当前片段，可直接进入长期基线。')
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
      authorityTrustSummary: null,
      prosodyAuthoritySummary: null,
      traceEmbodimentSummary: null,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: false,
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
      authorityTrustSummary: null,
      prosodyAuthoritySummary: null,
      traceEmbodimentSummary: null,
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
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
      authorityMatchedDrivers: ['lipsync'],
      authoritySources: ['prosody-authority'],
      authorityTrustSummary: '上游 authority trust：已经回到当前片段主链。',
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-summary-native',
      traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=lipsync | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      authorityBindingSummary: '上游 authority 绑定',
      authorityMatchSummary: '上游 authority 命中',
      settleAuthoritySummary: '上游 authority settle',
      summaryEntries: [
        { key: 'cue-id', label: '当前片段', value: 'segment-summary-native' },
        { key: 'authority-segment', label: '权威片段', value: 'segment-summary-native' },
        { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
        { key: 'matched-drivers', label: '命中驱动', value: 'lipsync' },
        { key: 'authority-sources', label: '权威来源', value: 'prosody-authority' },
        { key: 'authority-binding', label: '权威绑定', value: '上游 authority 绑定' },
        { key: 'authority-match', label: '绑定命中', value: '上游 authority 命中' },
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
      authoritySegmentId: 'segment-other-trace',
      authorityRendererTarget: 'vrm',
      authorityMatchedDrivers: ['lipsync'],
      authoritySources: ['prosody-authority'],
      authorityTrustSummary: null,
      prosodyAuthoritySummary: null,
      traceEmbodimentSummary: null,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      authorityBindingSummary: null,
      authorityMatchSummary: null,
      settleAuthoritySummary: null,
      summaryEntries: [
        { key: 'cue-id', label: '当前片段', value: 'segment-current-playback' },
        { key: 'authority-segment', label: '权威片段', value: 'segment-other-trace' },
        { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
        { key: 'matched-drivers', label: '命中驱动', value: 'lipsync' },
        { key: 'authority-sources', label: '权威来源', value: 'prosody-authority' },
      ],
      preferredExpressionAliases: [],
      preferredMotionAliases: [],
      live2dFacialReleaseMs: null,
      live2dMotionFollowThroughMs: null,
      vrmActionFadeMs: null,
      vrmExpressionBlendMs: null,
    })
  })
})
