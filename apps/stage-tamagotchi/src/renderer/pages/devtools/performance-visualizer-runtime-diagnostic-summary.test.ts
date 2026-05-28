import { describe, expect, it } from 'vitest'

import {
  buildPlaybackCueAuthoritySummaryEntries,
  buildRuntimeAuthoritySummaryEntries,
  buildTraceTelemetrySummaryEntries,
} from './performance-visualizer-runtime-diagnostic-summary'

describe('performance visualizer runtime diagnostic summary', () => {
  it('builds Chinese-first runtime authority entries', () => {
    expect(buildRuntimeAuthoritySummaryEntries({
      rendererTarget: 'vrm',
      authoritySegmentId: 'segment-zh-1',
      authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
      authorityMatchSummary: 'face:no motion:no lipsync:yes',
      authorityTrustSummary: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
      authorityMismatchReasonSummary: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行。',
      settleAuthoritySummary: 'authority-bound | segment=segment-zh-1 | target=vrm | drivers=lipsync | sources=prosody-authority',
    })).toEqual([
      { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
      { key: 'authority-segment', label: '权威片段', value: 'segment-zh-1' },
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
      { key: 'authority-trust', label: '权威可信性', value: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。' },
      { key: 'authority-mismatch', label: '权威漂移', value: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行。' },
      {
        key: 'settle-authority',
        label: '稳定段归因',
        value: 'authority-bound，片段 segment-zh-1，目标 VRM，驱动 口型，来源 prosody-authority',
        technicalValue: 'authority-bound | segment=segment-zh-1 | target=vrm | drivers=lipsync | sources=prosody-authority',
      },
    ])
  })

  it('prefers upstream authority mismatch display over locally rebuilt reason text', () => {
    expect(buildRuntimeAuthoritySummaryEntries({
      rendererTarget: 'vrm',
      authoritySegmentId: 'segment-display-first',
      authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
      authorityMatchSummary: 'face:no motion:no lipsync:yes',
      authorityTrustSummary: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
      authorityMismatchReasonSummary: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行。',
      authorityMismatchDisplay: '上游 authority 展示：当前仍在同一主线程里，但表情与动作落点已经和绑定片段分叉。',
      settleAuthoritySummary: 'authority-bound | segment=segment-display-first | target=vrm | drivers=lipsync | sources=prosody-authority',
    } as any)).toEqual([
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
      { key: 'authority-trust', label: '权威可信性', value: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。' },
      { key: 'authority-mismatch', label: '权威漂移', value: '上游 authority 展示：当前仍在同一主线程里，但表情与动作落点已经和绑定片段分叉。' },
      {
        key: 'settle-authority',
        label: '稳定段归因',
        value: 'authority-bound，片段 segment-display-first，目标 VRM，驱动 口型，来源 prosody-authority',
        technicalValue: 'authority-bound | segment=segment-display-first | target=vrm | drivers=lipsync | sources=prosody-authority',
      },
    ])
  })

  it('builds playback cue authority entries and trace telemetry entries', () => {
    expect(buildPlaybackCueAuthoritySummaryEntries({
      cueId: 'segment-explicit-playback-cue-metadata',
      authoritySegmentId: 'segment-explicit-playback-cue-metadata',
      authorityRendererTarget: 'vrm',
      authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
      authoritySources: ['prosody-authority', 'timeline-projection'],
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
      authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
      settleAuthoritySummary: 'authority-bound | segment=segment-explicit-playback-cue-metadata | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
      preferredExpressionAliases: ['CalmInspect'],
      preferredMotionAliases: ['ObserveSoft'],
      live2dFacialReleaseMs: 320,
      live2dMotionFollowThroughMs: 440,
      vrmActionFadeMs: 280,
      vrmExpressionBlendMs: 360,
    })).toEqual([
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
    ])

    expect(buildTraceTelemetrySummaryEntries({
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
        matchedSources: ['seeded-face', 'seeded-motion', 'seeded-lipsync'],
      },
    }, {
      traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=face, motion, lipsync | execution=face+motion+lipsync | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
    })).toEqual([
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
      { key: 'binding-drivers', label: '命中驱动', value: 'face, motion, lipsync' },
      { key: 'binding-sources', label: '命中来源', value: 'seeded-face, seeded-motion, seeded-lipsync' },
      { key: 'trace-embodiment', label: '轨迹落点', value: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 表情、动作、口型，实际执行 表情+动作+口型，场景 深夜疲劳照看，姿态 先观察后表达，来源链 fatigue -> care -> grounded-recall', technicalValue: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=face, motion, lipsync | execution=face+motion+lipsync | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall' },
      { key: 'latest-event', label: '最近事件', value: 'protective-watch settled after fatigue pressure rose' },
    ])
  })
})
