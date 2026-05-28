import { describe, expect, it } from 'vitest'

import {
  buildDriverExecutionTelemetrySummaryEntries,
  buildResidentRuntimeTelemetrySummaryEntries,
} from './performance-visualizer-execution-telemetry-summary'

describe('performance visualizer execution telemetry summary', () => {
  it('builds Chinese-first resident runtime telemetry entries', () => {
    expect(buildResidentRuntimeTelemetrySummaryEntries({
      profile: 'quiet-accompaniment',
      variationToken: 'resident|quiet-accompaniment|attentive',
      residentFacialCue: 'soft-gaze',
      residentActionCue: 'steady_focus',
      actionIntensity: 0.42,
      breathDrive: 0.38,
      focusDrive: 0.64,
      provenance: {
        watchMode: 'symbiotic-vision',
        bodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        thoughtStance: 'observe',
        thoughtShouldSpeak: false,
        thoughtTension: 'soft-covision',
        runtimeChannel: 'resident',
        runtimeSummary: 'quiet accompaniment with low-pressure opening',
        activeThreadId: 'thread-1',
        activeThreadTitle: 'late-night-care',
        preferredPresence: 'soft-watch',
        selectedAction: 'hover',
        personaBiasSummary: 'observe-first',
        personaOpeningGuidance: 'leave more room before speaking',
        scene: 'editor',
        scenario: 'coding',
      },
      eventPointers: {
        recentTransition: {
          fromWatchMode: 'mnemonic-passive',
          toWatchMode: 'symbiotic-vision',
          fromScenario: 'general',
          durationMs: 8200,
          reason: 'attention recovered',
          occurredAt: 1000,
        },
        rationaleTags: ['lower-pressure', 'late-night'],
        focusBeliefId: 'belief-1',
        focusInquiryId: 'inquiry-1',
        commitmentId: 'commitment-1',
        runtimeThreadId: 'runtime-thread-1',
        governorDrive: 'care',
        governorIntentionId: 'intent-1',
        selectedThoughtThreadId: 'thought-1',
      },
    } as any)).toEqual([
      { key: 'resident-profile', label: '驻留档位', value: 'quiet-accompaniment' },
      { key: 'resident-variation', label: '驻留变体', value: 'resident|quiet-accompaniment|attentive' },
      { key: 'resident-face', label: '驻留表情', value: 'soft-gaze' },
      { key: 'resident-action', label: '驻留动作', value: 'steady_focus' },
      { key: 'resident-action-intensity', label: '动作强度', value: '0.42' },
      { key: 'resident-breath-drive', label: '呼吸驱动', value: '0.38' },
      { key: 'resident-focus-drive', label: '专注驱动', value: '0.64' },
      { key: 'resident-watch-mode', label: '驻留观察模式', value: 'symbiotic-vision' },
      { key: 'resident-body-state', label: '驻留体态', value: 'accompanying' },
      { key: 'resident-continuity', label: '连续性模式', value: 'quiet-accompaniment' },
      {
        key: 'resident-thought',
        label: '思绪立场',
        value: '姿态 observe，是否发声 false',
        technicalValue: 'observe / false',
      },
      { key: 'resident-tension', label: '情绪张力', value: 'soft-covision' },
      { key: 'resident-runtime-channel', label: '运行通道', value: 'resident' },
      { key: 'resident-runtime-summary', label: '运行摘要', value: 'quiet accompaniment with low-pressure opening' },
      {
        key: 'resident-thread',
        label: '活跃线程',
        value: 'thread-1，标题 late-night-care',
        technicalValue: 'thread-1 / late-night-care',
      },
      { key: 'resident-presence', label: '偏好存在感', value: 'soft-watch' },
      { key: 'resident-selected-action', label: '已选动作', value: 'hover' },
      { key: 'resident-persona-bias', label: '人设偏压', value: 'observe-first' },
      { key: 'resident-opening-guidance', label: '开场指导', value: 'leave more room before speaking' },
      {
        key: 'resident-scene',
        label: '场景落点',
        value: '场景 coding，界面 editor',
        technicalValue: 'coding / editor',
      },
      {
        key: 'resident-transition',
        label: '最近切换',
        value: 'mnemonic-passive -> symbiotic-vision，原因 attention recovered，耗时 8200ms',
        technicalValue: 'mnemonic-passive -> symbiotic-vision | attention recovered | 8200ms',
      },
      { key: 'resident-rationale-tags', label: '理由标签', value: 'lower-pressure, late-night' },
      { key: 'resident-focus-belief', label: '焦点信念', value: 'belief-1' },
      { key: 'resident-focus-inquiry', label: '焦点追问', value: 'inquiry-1' },
      { key: 'resident-commitment', label: '承诺链路', value: 'commitment-1' },
      { key: 'resident-runtime-thread-id', label: '运行线程 ID', value: 'runtime-thread-1' },
      { key: 'resident-governor-drive', label: '治理驱动', value: 'care' },
      { key: 'resident-governor-intention', label: '治理意图', value: 'intent-1' },
      { key: 'resident-thought-thread', label: '思绪线程', value: 'thought-1' },
    ])
  })

  it('builds Chinese-first driver execution telemetry entries', () => {
    expect(buildDriverExecutionTelemetrySummaryEntries({
      driverSummary: {
        rendererTarget: 'live2d',
        face: {
          cue: 'focus',
          source: 'prosody-authority',
          confidence: 0.94,
          segmentId: 'segment-1',
        },
        motion: {
          cue: 'ObserveSoft',
          source: 'timeline-projection',
          confidence: 0.88,
          segmentId: 'segment-1',
        },
        lipsync: {
          cue: 'I',
          source: 'prosody-authority',
          confidence: 0.91,
          segmentId: 'segment-1',
          mode: 'energy-phoneme-hybrid',
        },
      },
      live2dExecution: {
        activeExpression: {
          name: 'CalmInspect',
          reason: 'preferred',
          score: 11.4,
          segmentId: 'segment-1',
        },
        activeMotion: {
          group: 'ObserveSoft',
          index: 1,
          segmentId: 'segment-1',
        },
        cue: {
          emotion: 'thinking',
          facialCue: 'focus',
          preferredExpressionAliases: ['CalmInspect'],
          live2dFacialReleaseMs: 320,
          live2dMotionFollowThroughMs: 440,
        },
      },
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-1',
      telemetryRendererTarget: 'live2d',
    } as any)).toEqual([
      { key: 'driver-renderer-target', label: '驱动渲染目标', value: 'live2d' },
      {
        key: 'driver-authority-trust',
        label: '驱动权威可信性',
        value: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
        technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-1',
      },
      {
        key: 'driver-face',
        label: '表情驱动',
        value: 'focus，来源 prosody-authority，置信 0.94，片段 segment-1',
        technicalValue: 'focus | src=prosody-authority | conf=0.94 | segment=segment-1',
      },
      {
        key: 'driver-motion',
        label: '动作驱动',
        value: 'ObserveSoft，来源 timeline-projection，置信 0.88，片段 segment-1',
        technicalValue: 'ObserveSoft | src=timeline-projection | conf=0.88 | segment=segment-1',
      },
      {
        key: 'driver-lipsync',
        label: '口型驱动',
        value: 'I，来源 prosody-authority，置信 0.91，片段 segment-1，模式 energy-phoneme-hybrid',
        technicalValue: 'I | src=prosody-authority | conf=0.91 | segment=segment-1 | mode=energy-phoneme-hybrid',
      },
      {
        key: 'live2d-expression',
        label: 'Live2D 表情执行',
        value: 'CalmInspect，原因 preferred，分数 11.40，片段 segment-1',
        technicalValue: 'CalmInspect | reason=preferred | score=11.40 | segment=segment-1',
      },
      {
        key: 'live2d-motion',
        label: 'Live2D 动作执行',
        value: 'ObserveSoft / 1，片段 segment-1',
        technicalValue: 'ObserveSoft / 1 | segment=segment-1',
      },
      { key: 'live2d-cue', label: 'Live2D 线索', value: 'thinking / focus' },
      {
        key: 'live2d-settle',
        label: 'Live2D 稳定参数',
        value: '表情回收 320ms，动作跟随 440ms',
        technicalValue: 'facialRelease=320ms | motionFollow=440ms',
      },
      { key: 'telemetry-renderer-target', label: 'Telemetry 渲染目标', value: 'live2d' },
    ])
  })

  it('prefers upstream authority trust summary over locally re-deriving it from prosody authority', () => {
    expect(buildDriverExecutionTelemetrySummaryEntries({
      driverSummary: {
        rendererTarget: 'vrm',
      },
      live2dExecution: null,
      authorityTrustSummary: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-override',
      telemetryRendererTarget: 'vrm',
    } as any)).toEqual([
      { key: 'driver-renderer-target', label: '驱动渲染目标', value: 'vrm' },
      {
        key: 'driver-authority-trust',
        label: '驱动权威可信性',
        value: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
        technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-override',
      },
      { key: 'telemetry-renderer-target', label: 'Telemetry 渲染目标', value: 'vrm' },
    ])
  })
})
