import { describe, expect, it } from 'vitest'

import {
  buildDriverExecutionTelemetrySummaryEntries,
  buildDriverExecutionTelemetrySummaryEntriesFromDiagnostics,
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
      { key: 'expression-aliases', label: '表情别名偏好', value: 'CalmInspect' },
      {
        key: 'live2d-settle',
        label: 'Live2D 稳定参数',
        value: '表情回收 320ms，动作跟随 440ms',
        technicalValue: 'facialRelease=320ms | motionFollow=440ms',
      },
      { key: 'telemetry-renderer-target', label: 'Telemetry 渲染目标', value: 'live2d' },
    ])
  })

  it('keeps interruption-resume live2d execution telemetry on one later callback line with planned aliases and actual execution still aligned', () => {
    expect(buildDriverExecutionTelemetrySummaryEntries({
      driverSummary: {
        rendererTarget: 'live2d',
        face: {
          cue: 'soft-release',
          source: 'prosody-authority',
          confidence: 0.94,
          segmentId: 'segment-later-callback-return',
        },
        motion: {
          cue: 'idle_settle',
          source: 'timeline-projection',
          confidence: 0.9,
          segmentId: 'segment-later-callback-return',
        },
        lipsync: {
          cue: 'closed',
          source: 'prosody-authority',
          confidence: 0.93,
          segmentId: 'segment-later-callback-return',
          mode: 'energy-phoneme-hybrid',
        },
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
          segmentId: 'segment-later-callback-return',
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
      authorityTrustSummary: null,
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.38 | mouth=0.34 | head=0.29 | visemePeak=0.72 | provenance=authority-bound | source=prosody-authority | segment=segment-later-callback-return',
      authoritySegmentId: 'segment-later-callback-return',
      authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      telemetryRendererTarget: 'live2d',
    } as any)).toEqual([
      { key: 'driver-renderer-target', label: '驱动渲染目标', value: 'live2d' },
      {
        key: 'driver-authority-trust',
        label: '驱动权威可信性',
        value: 'Live2D 这段 authority 仍停在 repair-before-closeness 的回身线里，这次只是 later callback 的轻声接回，不是重新打开一段新的靠近。',
        technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.38 | mouth=0.34 | head=0.29 | visemePeak=0.72 | provenance=authority-bound | source=prosody-authority | segment=segment-later-callback-return',
      },
      {
        key: 'driver-face',
        label: '表情驱动',
        value: 'soft-release，来源 prosody-authority，置信 0.94，片段 segment-later-callback-return',
        technicalValue: 'soft-release | src=prosody-authority | conf=0.94 | segment=segment-later-callback-return',
      },
      {
        key: 'driver-motion',
        label: '动作驱动',
        value: 'idle_settle，来源 timeline-projection，置信 0.90，片段 segment-later-callback-return',
        technicalValue: 'idle_settle | src=timeline-projection | conf=0.90 | segment=segment-later-callback-return',
      },
      {
        key: 'driver-lipsync',
        label: '口型驱动',
        value: 'closed，来源 prosody-authority，置信 0.93，片段 segment-later-callback-return，模式 energy-phoneme-hybrid',
        technicalValue: 'closed | src=prosody-authority | conf=0.93 | segment=segment-later-callback-return | mode=energy-phoneme-hybrid',
      },
      {
        key: 'live2d-expression',
        label: 'Live2D 表情执行',
        value: 'RecoverSoft，原因 preferred，分数 12.20，片段 segment-later-callback-return',
        technicalValue: 'RecoverSoft | reason=preferred | score=12.20 | segment=segment-later-callback-return',
      },
      {
        key: 'live2d-motion',
        label: 'Live2D 动作执行',
        value: 'StillnessGuard / 0，片段 segment-later-callback-return',
        technicalValue: 'StillnessGuard / 0 | segment=segment-later-callback-return',
      },
      { key: 'live2d-cue', label: 'Live2D 线索', value: 'thinking / soft-gaze' },
      { key: 'expression-aliases', label: '表情别名偏好', value: 'RecoverSoft' },
      { key: 'motion-aliases', label: '动作别名偏好', value: 'StillnessGuard, ObserveSoft' },
      {
        key: 'live2d-settle',
        label: 'Live2D 稳定参数',
        value: '表情回收 380ms，动作跟随 460ms',
        technicalValue: 'facialRelease=380ms | motionFollow=460ms',
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

  it('derives same-body-line trust for execution telemetry when face motion and lipsync all return to the same VRM segment', () => {
    expect(buildDriverExecutionTelemetrySummaryEntries({
      driverSummary: {
        rendererTarget: 'vrm',
      },
      live2dExecution: null,
      authorityTrustSummary: null,
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-vrm-body-1',
      authoritySegmentId: 'segment-vrm-body-1',
      authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      telemetryRendererTarget: 'vrm',
    } as any)).toEqual([
      { key: 'driver-renderer-target', label: '驱动渲染目标', value: 'vrm' },
      {
        key: 'driver-authority-trust',
        label: '驱动权威可信性',
        value: 'VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
        technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-vrm-body-1',
      },
      { key: 'telemetry-renderer-target', label: 'Telemetry 渲染目标', value: 'vrm' },
    ])
  })

  it('keeps prosody trust for execution telemetry when only lipsync continuity is still matched', () => {
    expect(buildDriverExecutionTelemetrySummaryEntries({
      driverSummary: {
        rendererTarget: 'vrm',
      },
      live2dExecution: null,
      authorityTrustSummary: null,
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-thin-lipsync-1',
      authoritySegmentId: 'segment-thin-lipsync-1',
      authorityMatchedDrivers: ['lipsync'],
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      telemetryRendererTarget: 'vrm',
    } as any)).toEqual([
      { key: 'driver-renderer-target', label: '驱动渲染目标', value: 'vrm' },
      {
        key: 'driver-authority-trust',
        label: '驱动权威可信性',
        value: 'VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。',
        technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-thin-lipsync-1',
      },
      { key: 'telemetry-renderer-target', label: 'Telemetry 渲染目标', value: 'vrm' },
    ])
  })

  it('derives body-led same-her trust for execution telemetry when body has re-formed on the current segment before face and motion return', () => {
    expect(buildDriverExecutionTelemetrySummaryEntries({
      driverSummary: {
        rendererTarget: 'vrm',
      },
      live2dExecution: null,
      authorityTrustSummary: null,
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.29 | mouth=0.31 | head=0.18 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-vrm-body-led-1',
      authoritySegmentId: 'segment-vrm-body-led-1',
      authorityMatchedDrivers: ['body', 'lipsync'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      telemetryRendererTarget: 'vrm',
    } as any)).toEqual([
      { key: 'driver-renderer-target', label: '驱动渲染目标', value: 'vrm' },
      {
        key: 'driver-authority-trust',
        label: '驱动权威可信性',
        value: 'VRM 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。',
        technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.29 | mouth=0.31 | head=0.18 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-vrm-body-led-1',
      },
      { key: 'telemetry-renderer-target', label: 'Telemetry 渲染目标', value: 'vrm' },
    ])
  })

  it('keeps body-led execution telemetry on the body line when same-segment prosody is the only surviving voice evidence', () => {
    expect(buildDriverExecutionTelemetrySummaryEntries({
      driverSummary: {
        rendererTarget: 'vrm',
      },
      live2dExecution: null,
      authorityTrustSummary: null,
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.29 | mouth=0.31 | head=0.18 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-vrm-body-only-1',
      authoritySegmentId: 'segment-vrm-body-only-1',
      authorityMatchedDrivers: ['body'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: false,
      telemetryRendererTarget: 'vrm',
    } as any)).toEqual([
      { key: 'driver-renderer-target', label: '驱动渲染目标', value: 'vrm' },
      {
        key: 'driver-authority-trust',
        label: '驱动权威可信性',
        value: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
        technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.29 | mouth=0.31 | head=0.18 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-vrm-body-only-1',
      },
      { key: 'telemetry-renderer-target', label: 'Telemetry 渲染目标', value: 'vrm' },
    ])
  })

  it('keeps repair-before-closeness trust visible in execution telemetry instead of flattening it into generic prosody trust', () => {
    expect(buildDriverExecutionTelemetrySummaryEntries({
      driverSummary: {
        rendererTarget: 'vrm',
      },
      live2dExecution: null,
      authorityTrustSummary: null,
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.24 | mouth=0.20 | head=0.18 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-repair-telemetry-1',
      authoritySegmentId: 'segment-repair-telemetry-1',
      authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      telemetryRendererTarget: 'vrm',
    } as any)).toEqual([
      { key: 'driver-renderer-target', label: '驱动渲染目标', value: 'vrm' },
      {
        key: 'driver-authority-trust',
        label: '驱动权威可信性',
        value: 'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。',
        technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.24 | mouth=0.20 | head=0.18 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-repair-telemetry-1',
      },
      { key: 'telemetry-renderer-target', label: 'Telemetry 渲染目标', value: 'vrm' },
    ])
  })

  it('forwards playback cue authority context into execution telemetry summaries when runtime overview trust is still empty', () => {
    const entries = buildDriverExecutionTelemetrySummaryEntriesFromDiagnostics({
      speechEmbodiment: {
        driverSummary: {
          rendererTarget: null,
        },
        live2dExecution: null,
        playbackTelemetry: {
          rendererTarget: null,
        },
        authoritySummary: {
          prosodyAuthoritySummary: null,
        },
      } as any,
      runtimeAuthorityOverview: {
        authorityTrustSummary: null,
        rendererTarget: null,
        prosodyAuthoritySummary: null,
      } as any,
      playbackCueAuthorityView: {
        authorityTrustSummary: null,
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.24 | mouth=0.20 | head=0.18 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-repair-assembly-1',
        authoritySegmentId: 'segment-repair-assembly-1',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      } as any,
    })

    expect(entries.find(entry => entry.key === 'driver-authority-trust')).toEqual({
      key: 'driver-authority-trust',
      label: '驱动权威可信性',
      value: 'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。',
      technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.24 | mouth=0.20 | head=0.18 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-repair-assembly-1',
    })
    expect(entries.find(entry => entry.key === 'telemetry-renderer-target')).toEqual({
      key: 'telemetry-renderer-target',
      label: 'Telemetry 渲染目标',
      value: 'vrm',
    })
  })

  it('keeps thin affective settle authority visible in execution telemetry when playback cue authority already carries the room-making line', () => {
    const entries = buildDriverExecutionTelemetrySummaryEntriesFromDiagnostics({
      speechEmbodiment: {
        driverSummary: {
          rendererTarget: 'vrm',
        },
        live2dExecution: null,
        playbackTelemetry: {
          rendererTarget: 'vrm',
        },
        authoritySummary: {
          prosodyAuthoritySummary: null,
        },
      } as any,
      runtimeAuthorityOverview: {
        authorityTrustSummary: null,
        rendererTarget: 'vrm',
        prosodyAuthoritySummary: null,
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-thin-affective-execution-telemetry',
        authorityTrustSummary: null,
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-thin-affective-execution-telemetry',
        settleAuthoritySummary: 'authority-bound | segment=segment-thin-affective-execution-telemetry | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
        authoritySegmentId: 'segment-thin-affective-execution-telemetry',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        authoritySources: ['prosody-authority', 'timeline-projection'],
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      } as any,
    })

    expect(entries.find(entry => entry.key === 'driver-authority-trust')?.value.includes('余韵还在')).toBe(true)
  })

  it('preserves body-led same-her trust through diagnostics aggregation when playback cue authority is the current body-backed source of truth', () => {
    const entries = buildDriverExecutionTelemetrySummaryEntriesFromDiagnostics({
      speechEmbodiment: {
        driverSummary: {
          rendererTarget: 'vrm',
        },
        live2dExecution: null,
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-body-telemetry-aggregation-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['body'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
          },
        },
        authoritySummary: {
          prosodyAuthoritySummary: null,
        },
      } as any,
      runtimeAuthorityOverview: {
        authorityTrustSummary: null,
        rendererTarget: 'vrm',
        prosodyAuthoritySummary: null,
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-body-telemetry-aggregation-1',
        authorityTrustSummary: null,
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.29 | mouth=0.31 | head=0.18 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-body-telemetry-aggregation-1',
        settleAuthoritySummary: 'authority-bound | segment=segment-body-telemetry-aggregation-1 | target=vrm | drivers=body | sources=prosody-authority',
        authoritySegmentId: 'segment-body-telemetry-aggregation-1',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['body'],
        authoritySources: ['prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: false,
        residentMode: 'same-thread-continuation',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      } as any,
    })

    expect(entries.find(entry => entry.key === 'driver-authority-trust')).toEqual({
      key: 'driver-authority-trust',
      label: '驱动权威可信性',
      value: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。 当前身体还在按 quiet blink / soften gaze 的节奏把这一条线稳住。',
      technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.29 | mouth=0.31 | head=0.18 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-body-telemetry-aggregation-1',
    })
  })

  it('keeps body-led same-her trust through diagnostics aggregation when upstream matched drivers thin to lipsync but current lane truth already carries body continuity', () => {
    const entries = buildDriverExecutionTelemetrySummaryEntriesFromDiagnostics({
      speechEmbodiment: {
        driverSummary: {
          rendererTarget: 'vrm',
        },
        live2dExecution: null,
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-body-thin-lipsync-aggregation-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
            voiceSegmentMatched: true,
          },
        },
        authoritySummary: {
          prosodyAuthoritySummary: null,
        },
      } as any,
      runtimeAuthorityOverview: {
        authorityTrustSummary: null,
        rendererTarget: 'vrm',
        prosodyAuthoritySummary: null,
        voiceSegmentMatched: true,
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-body-thin-lipsync-aggregation-1',
        authorityTrustSummary: null,
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.29 | mouth=0.31 | head=0.18 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-body-thin-lipsync-aggregation-1',
        settleAuthoritySummary: 'authority-bound | segment=segment-body-thin-lipsync-aggregation-1 | target=vrm | drivers=lipsync | sources=prosody-authority',
        authoritySegmentId: 'segment-body-thin-lipsync-aggregation-1',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authoritySources: ['prosody-authority'],
        bodySegmentMatched: true,
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
        voiceSegmentMatched: true,
        residentMode: 'same-thread-continuation',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      } as any,
    })

    expect(entries.find(entry => entry.key === 'driver-authority-trust')).toEqual({
      key: 'driver-authority-trust',
      label: '驱动权威可信性',
      value: 'VRM 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。 当前身体还在按 quiet blink / soften gaze 的节奏把这一条线稳住。',
      technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.29 | mouth=0.31 | head=0.18 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-body-thin-lipsync-aggregation-1',
    })
  })

  it('prefers richer settle-reason trust over thinner generic runtime trust in execution telemetry', () => {
    const entries = buildDriverExecutionTelemetrySummaryEntriesFromDiagnostics({
      speechEmbodiment: {
        driverSummary: {
          rendererTarget: 'vrm',
        },
        live2dExecution: null,
        playbackTelemetry: {
          rendererTarget: 'vrm',
        },
        authoritySummary: {
          prosodyAuthoritySummary: null,
        },
      } as any,
      runtimeAuthorityOverview: {
        authorityTrustSummary: 'VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
        rendererTarget: 'vrm',
        prosodyAuthoritySummary: null,
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-thin-affective-execution-telemetry-runtime-override-1',
        authorityTrustSummary: null,
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-thin-affective-execution-telemetry-runtime-override-1',
        settleAuthoritySummary: 'authority-bound | segment=segment-thin-affective-execution-telemetry-runtime-override-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
        authoritySegmentId: 'segment-thin-affective-execution-telemetry-runtime-override-1',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        authoritySources: ['prosody-authority', 'timeline-projection'],
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      } as any,
    })

    expect(entries.find(entry => entry.key === 'driver-authority-trust')?.value).toContain('余韵还在，先留白，别立刻把温度放大')
  })

  it('keeps same-turn-if-invited measured-return trust visible in execution telemetry when playback cue authority stays on the callback line', () => {
    const entries = buildDriverExecutionTelemetrySummaryEntriesFromDiagnostics({
      speechEmbodiment: {
        driverSummary: {
          rendererTarget: 'vrm',
        },
        live2dExecution: null,
        playbackTelemetry: {
          rendererTarget: 'vrm',
        },
        authoritySummary: {
          prosodyAuthoritySummary: null,
        },
      } as any,
      runtimeAuthorityOverview: {
        authorityTrustSummary: null,
        rendererTarget: 'vrm',
        prosodyAuthoritySummary: null,
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-invited-execution-telemetry',
        authorityTrustSummary: 'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。',
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.22 | mouth=0.20 | head=0.18 | visemePeak=0.70 | provenance=authority-bound | source=prosody-authority | segment=segment-invited-execution-telemetry',
        settleAuthoritySummary: 'authority-bound | segment=segment-invited-execution-telemetry | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
        authoritySegmentId: 'segment-invited-execution-telemetry',
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        authoritySources: ['prosody-authority', 'timeline-projection'],
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      } as any,
    })

    expect(entries.find(entry => entry.key === 'driver-authority-trust')).toEqual({
      key: 'driver-authority-trust',
      label: '驱动权威可信性',
      value: 'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。',
      technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.22 | mouth=0.20 | head=0.18 | visemePeak=0.70 | provenance=authority-bound | source=prosody-authority | segment=segment-invited-execution-telemetry',
    })
  })

  it('drops wrong-segment upstream authority summaries in execution telemetry and falls back to current playback telemetry prosody', () => {
    const entries = buildDriverExecutionTelemetrySummaryEntriesFromDiagnostics({
      speechEmbodiment: {
        driverSummary: {
          rendererTarget: 'vrm',
        },
        live2dExecution: null,
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-current-execution-telemetry',
            rendererTarget: 'vrm',
            matchedDrivers: ['body'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
            prosodyAuthority: {
              segmentId: 'segment-current-execution-telemetry',
              provenance: 'authority-bound',
              source: 'prosody-authority',
              mode: 'energy-phoneme-hybrid',
              cueProsodyWeight: 0.28,
              cueMouthWeight: 0.21,
              cueHeadWeight: 0.18,
              visemePeakWeight: 0.68,
            },
          },
        },
        authoritySummary: {
          cueId: 'segment-upstream-other-execution-telemetry',
          segmentId: 'segment-upstream-other-execution-telemetry',
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.38 | mouth=0.34 | head=0.29 | visemePeak=0.72 | provenance=authority-bound | source=prosody-authority | segment=segment-upstream-other-execution-telemetry',
          settleSummary: 'authority-bound | segment=segment-upstream-other-execution-telemetry | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
        },
      } as any,
      runtimeAuthorityOverview: null,
      playbackCueAuthorityView: null,
    })

    expect(entries.find(entry => entry.key === 'driver-authority-trust')).toEqual({
      key: 'driver-authority-trust',
      label: '驱动权威可信性',
      value: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
      technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.28 | mouth=0.21 | head=0.18 | visemePeak=0.68 | provenance=authority-bound | source=prosody-authority | segment=segment-current-execution-telemetry',
    })
    expect(entries.find(entry => entry.key === 'driver-authority-trust')?.value).not.toContain('余韵还在，先留白')
  })
})
