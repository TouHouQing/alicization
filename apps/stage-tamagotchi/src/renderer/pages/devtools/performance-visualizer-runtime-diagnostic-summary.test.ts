import { describe, expect, it } from 'vitest'

import {
  buildPlaybackCueAuthoritySummaryEntries,
  buildRuntimeAuthoritySummaryEntries,
  buildTraceTelemetrySummaryEntries,
  resolveAuthorityTrustSummaryFromSettleAuthority,
} from './performance-visualizer-runtime-diagnostic-summary'

describe('performance visualizer runtime diagnostic summary', () => {
  it('surfaces execution safety-gate restraint from same-her reason tags as a readable runtime diagnostic', () => {
    expect(buildRuntimeAuthoritySummaryEntries({
      rendererTarget: 'vrm',
      authoritySegmentId: 'resident-safety-gate-frame-1',
      sameHerSignature: 'resident|measured-return|execution-restraint',
      sameHerReasonTags: [
        'execution-safety-gate:blocked-dispatch-restraint',
        'execution-safety-gate:confirmation-required',
        'execution-safety-gate:no-process-started',
        'embodiment-carry:measured-return',
      ],
    } as any)).toEqual([
      { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
      { key: 'authority-segment', label: '权威片段', value: 'resident-safety-gate-frame-1' },
      { key: 'same-her-signature', label: '同一人签名', value: 'resident|measured-return|execution-restraint' },
      {
        key: 'execution-safety-gate',
        label: '执行安全门',
        value: 'blocked dispatch 已被安全门拦住；需要确认；没有启动进程。',
        technicalValue: 'execution-safety-gate:blocked-dispatch-restraint, execution-safety-gate:confirmation-required, execution-safety-gate:no-process-started',
      },
      {
        key: 'same-her-reasons',
        label: '同一人线索',
        value: 'execution-safety-gate:blocked-dispatch-restraint, execution-safety-gate:confirmation-required, execution-safety-gate:no-process-started, embodiment-carry:measured-return',
      },
    ])
  })

  it('surfaces memory closure identity as a dedicated runtime authority diagnostic entry', () => {
    expect(buildRuntimeAuthoritySummaryEntries({
      rendererTarget: 'live2d',
      authoritySegmentId: 'segment-runtime-memory-closure-summary-1',
      runtimeMemoryClosureIdentityKey: 'corrected-callback-memory-runtime-reconsolidation',
      runtimeMemoryClosureIdentityReasonTags: [
        'memory-identity:corrected-callback-memory-runtime-reconsolidation',
        'memory-lane:emotional-transition',
      ],
    } as any)).toEqual([
      { key: 'renderer-target', label: '渲染目标', value: 'live2d' },
      { key: 'authority-segment', label: '权威片段', value: 'segment-runtime-memory-closure-summary-1' },
      {
        key: 'memory-closure-identity',
        label: '记忆闭环身份',
        value: 'corrected-callback-memory-runtime-reconsolidation',
        technicalValue: 'memory-identity:corrected-callback-memory-runtime-reconsolidation, memory-lane:emotional-transition',
      },
    ])
  })

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
      authorityTrustSummary: 'VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。',
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
      { key: 'authority-trust', label: '权威可信性', value: 'VRM 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。' },
      { key: 'authority-mismatch', label: '权威漂移', value: '上游 authority 展示：当前仍在同一主线程里，但表情与动作落点已经和绑定片段分叉。' },
      {
        key: 'settle-authority',
        label: '稳定段归因',
        value: 'authority-bound，片段 segment-display-first，目标 VRM，驱动 口型，来源 prosody-authority',
        technicalValue: 'authority-bound | segment=segment-display-first | target=vrm | drivers=lipsync | sources=prosody-authority',
      },
    ])
  })

  it('keeps a thin measured-return same-her line visible in runtime authority summaries instead of collapsing it into lipsync-only drift', () => {
    expect(buildRuntimeAuthoritySummaryEntries({
      rendererTarget: 'vrm',
      authoritySegmentId: 'segment-thin-measured-return-1',
      authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only',
      authorityMatchSummary: 'face:no motion:no lipsync:yes',
      authorityTrustSummary: 'Only runtime digest plus spine still expose the noisy-detour continuity line, so higher-level continuity should keep this thinner measured-return same-her line visible instead of collapsing it into lipsync-only drift.',
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
      authorityMismatchReasonSummary: 'Only runtime digest plus spine still expose the noisy-detour continuity line, so higher-level continuity should keep this thinner measured-return same-her line visible instead of collapsing it into lipsync-only drift.',
      settleAuthoritySummary: 'authority-bound | segment=segment-thin-measured-return-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync-only',
    } as any)).toEqual([
      { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
      { key: 'authority-segment', label: '权威片段', value: 'segment-thin-measured-return-1' },
      {
        key: 'authority-binding',
        label: '权威绑定',
        value: '目标 VRM，驱动 口型，来源 prosody-authority，命中 表情未命中 / 动作未命中 / 口型命中，噪声 detour 后，这条 measured-return 连续身体线仍由较薄证据维持',
        technicalValue: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only',
      },
      {
        key: 'authority-match',
        label: '绑定命中',
        value: '表情未命中 / 动作未命中 / 口型命中',
        technicalValue: 'face:no motion:no lipsync:yes',
      },
      { key: 'authority-trust', label: '权威可信性', value: 'Only runtime digest plus spine still expose the noisy-detour continuity line, so higher-level continuity should keep this thinner measured-return same-her line visible instead of collapsing it into lipsync-only drift.' },
      { key: 'authority-mismatch', label: '权威漂移', value: 'Only runtime digest plus spine still expose the noisy-detour continuity line, so higher-level continuity should keep this thinner measured-return same-her line visible instead of collapsing it into lipsync-only drift.' },
      {
        key: 'settle-authority',
        label: '稳定段归因',
        value: 'authority-bound，片段 segment-thin-measured-return-1，目标 VRM，驱动 口型，来源 prosody-authority，噪声 detour 后，这条 measured-return 连续身体线仍由较薄证据维持',
        technicalValue: 'authority-bound | segment=segment-thin-measured-return-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync-only',
      },
    ])
  })

  it('keeps repair-before-closeness lane truth visible in runtime authority summaries instead of reducing it to a generic one-lane hold', () => {
    expect(buildRuntimeAuthoritySummaryEntries({
      rendererTarget: 'vrm',
      authoritySegmentId: 'segment-repair-runtime-1',
      authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only',
      authorityMatchSummary: 'face:no motion:no lipsync:yes',
      authorityTrustSummary: 'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。',
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
      authorityMismatchReasonSummary: 'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。',
      settleAuthoritySummary: 'authority-bound | segment=segment-repair-runtime-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync-only',
    } as any)).toEqual([
      { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
      { key: 'authority-segment', label: '权威片段', value: 'segment-repair-runtime-1' },
      {
        key: 'authority-binding',
        label: '权威绑定',
        value: '目标 VRM，驱动 口型，来源 prosody-authority，命中 表情未命中 / 动作未命中 / 口型命中，repair-before-closeness 仍停在修补线里，先守住 quieter blink / softened gaze',
        technicalValue: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only',
      },
      {
        key: 'authority-match',
        label: '绑定命中',
        value: '表情未命中 / 动作未命中 / 口型命中',
        technicalValue: 'face:no motion:no lipsync:yes',
      },
      { key: 'authority-trust', label: '权威可信性', value: 'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。' },
      { key: 'authority-mismatch', label: '权威漂移', value: 'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。' },
      {
        key: 'settle-authority',
        label: '稳定段归因',
        value: 'authority-bound，片段 segment-repair-runtime-1，目标 VRM，驱动 口型，来源 prosody-authority，repair-before-closeness 仍停在修补线里，先守住 quieter blink / softened gaze',
        technicalValue: 'authority-bound | segment=segment-repair-runtime-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync-only',
      },
    ])
  })

  it('surfaces lipsync-plus-voice lane truth in runtime authority summaries when the same authority segment is still carried by mouth and voice together', () => {
    expect(buildRuntimeAuthoritySummaryEntries({
      rendererTarget: 'vrm',
      authoritySegmentId: 'segment-lipsync-voice-runtime-1',
      authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync+voice-only',
      authorityMatchSummary: 'face:no motion:no lipsync:yes',
      authorityTrustSummary: 'VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。 当前口型还在按 linger blink / soften gaze 的节奏把这一条线稳住。',
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
      authorityMismatchReasonSummary: 'Voice and lipsync are still holding the same authority segment together even though face and motion have already drifted away.',
      settleAuthoritySummary: 'authority-bound | segment=segment-lipsync-voice-runtime-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync+voice-only',
    } as any)).toEqual([
      { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
      { key: 'authority-segment', label: '权威片段', value: 'segment-lipsync-voice-runtime-1' },
      {
        key: 'authority-binding',
        label: '权威绑定',
        value: '目标 VRM，驱动 口型，来源 prosody-authority，命中 表情未命中 / 动作未命中 / 口型命中，当前仅剩口型、声音维持同一段连续性',
        technicalValue: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync+voice-only',
      },
      {
        key: 'authority-match',
        label: '绑定命中',
        value: '表情未命中 / 动作未命中 / 口型命中',
        technicalValue: 'face:no motion:no lipsync:yes',
      },
      { key: 'authority-trust', label: '权威可信性', value: 'VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。' },
      { key: 'authority-mismatch', label: '权威漂移', value: 'Voice and lipsync are still holding the same authority segment together even though face and motion have already drifted away.' },
      {
        key: 'settle-authority',
        label: '稳定段归因',
        value: 'authority-bound，片段 segment-lipsync-voice-runtime-1，目标 VRM，驱动 口型，来源 prosody-authority，当前仅剩口型、声音维持同一段连续性',
        technicalValue: 'authority-bound | segment=segment-lipsync-voice-runtime-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync+voice-only',
      },
    ])
  })

  it('keeps body-backed same-her lane truth visible in runtime authority summaries when the shared segment is carried by body and voice after face motion and lipsync drift', () => {
    expect(buildRuntimeAuthoritySummaryEntries({
      rendererTarget: 'vrm',
      authoritySegmentId: 'segment-body-voice-runtime-1',
      authorityBindingSummary: 'target=vrm | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no | lane=body+voice-only',
      authorityMatchSummary: 'body:yes face:no motion:no lipsync:no',
      authorityTrustSummary: null,
      authorityMismatchSummary: 'face-mismatch, motion-mismatch, lipsync-mismatch',
      authorityMismatchReasonSummary: 'The body line and voice are still carrying the same living segment even though face motion and lipsync have drifted.',
      settleAuthoritySummary: 'authority-bound | segment=segment-body-voice-runtime-1 | target=vrm | drivers=body | sources=prosody-authority | lane=body+voice-only',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    } as any)).toEqual([
      { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
      { key: 'authority-segment', label: '权威片段', value: 'segment-body-voice-runtime-1' },
      {
        key: 'authority-binding',
        label: '权威绑定',
        value: '目标 VRM，驱动 身体，来源 prosody-authority，命中 身体命中 / 表情未命中 / 动作未命中 / 口型未命中，当前仅剩身体、声音维持同一段连续性',
        technicalValue: 'target=vrm | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no | lane=body+voice-only',
      },
      {
        key: 'authority-match',
        label: '绑定命中',
        value: '身体命中 / 表情未命中 / 动作未命中 / 口型未命中',
        technicalValue: 'body:yes face:no motion:no lipsync:no',
      },
      { key: 'embodiment-closure-stage', label: '闭环阶段', value: 'body-carried-to-renderer-rejoin' },
      { key: 'authority-trust', label: '权威可信性', value: 'VRM 这段 authority 现在主要由身体和声音继续托住，同一段 living segment 还在，只是表情、动作和口型暂时没有一起跟上。 当前身体还在按 linger blink / soften gaze 的节奏把这一条线稳住。' },
      { key: 'authority-mismatch', label: '权威漂移', value: 'The body line and voice are still carrying the same living segment even though face motion and lipsync have drifted.' },
      {
        key: 'settle-authority',
        label: '稳定段归因',
        value: 'authority-bound，片段 segment-body-voice-runtime-1，目标 VRM，驱动 身体，来源 prosody-authority，当前仅剩身体、声音维持同一段连续性',
        technicalValue: 'authority-bound | segment=segment-body-voice-runtime-1 | target=vrm | drivers=body | sources=prosody-authority | lane=body+voice-only',
      },
    ])
  })

  it('prefers current body-lipsync-voice lane truth over stale body-line trust in runtime authority summaries', () => {
    expect(buildRuntimeAuthoritySummaryEntries({
      rendererTarget: 'vrm',
      authoritySegmentId: 'segment-runtime-summary-body-lipsync-voice-override-1',
      authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
      authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
      authorityTrustSummary: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
      authorityMismatchReasonSummary: '表情和动作还没回到这一段里，但身体、口型和声音已经继续托住同一个 living segment。',
      settleAuthoritySummary: 'authority-bound | segment=segment-runtime-summary-body-lipsync-voice-override-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment',
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.31 | head=0.28 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-runtime-summary-body-lipsync-voice-override-1',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    } as any)).toEqual([
      { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
      { key: 'authority-segment', label: '权威片段', value: 'segment-runtime-summary-body-lipsync-voice-override-1' },
      {
        key: 'authority-binding',
        label: '权威绑定',
        value: '目标 VRM，驱动 身体、口型，来源 prosody-authority, voice-segment，命中 身体命中 / 表情未命中 / 动作未命中 / 口型命中，当前仅剩身体、口型维持同一段连续性',
        technicalValue: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
      },
      {
        key: 'authority-match',
        label: '绑定命中',
        value: '身体命中 / 表情未命中 / 动作未命中 / 口型命中',
        technicalValue: 'body:yes face:no motion:no lipsync:yes',
      },
      { key: 'embodiment-closure-stage', label: '闭环阶段', value: 'body-carried-to-renderer-rejoin' },
      {
        key: 'authority-trust',
        label: '权威可信性',
        value: 'VRM 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。 当前身体还在按 linger blink / soften gaze 的节奏把这一条线稳住。',
      },
      {
        key: 'prosody-authority',
        label: '韵律权威',
        value: '模式 energy-phoneme-hybrid，韵律 0.35，口部 0.31，头部 0.28，峰值口型 0.74，权威绑定，来源 韵律权威，片段 segment-runtime-summary-body-lipsync-voice-override-1',
        technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.31 | head=0.28 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-runtime-summary-body-lipsync-voice-override-1',
      },
      { key: 'authority-mismatch', label: '权威漂移', value: '表情和动作还没回到这一段里，但身体、口型和声音已经继续托住同一个 living segment。' },
      {
        key: 'settle-authority',
        label: '稳定段归因',
        value: 'authority-bound，片段 segment-runtime-summary-body-lipsync-voice-override-1，目标 VRM，驱动 身体、口型，来源 prosody-authority, voice-segment',
        technicalValue: 'authority-bound | segment=segment-runtime-summary-body-lipsync-voice-override-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment',
      },
    ])
  })

  it('rebuilds thin affective authority trust from settle authority reason when outer runtime summaries would otherwise drop it', () => {
    const entries = buildRuntimeAuthoritySummaryEntries({
      rendererTarget: 'vrm',
      authoritySegmentId: 'segment-thin-affective-runtime-summary-1',
      authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
      authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
      authorityTrustSummary: null,
      authorityMismatchSummary: null,
      authorityMismatchReasonSummary: null,
      settleAuthoritySummary: 'authority-bound | segment=segment-thin-affective-runtime-summary-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
    } as any)

    expect(entries.find(entry => entry.key === 'authority-trust')?.value).toContain('余韵还在，先留白，别立刻把温度放大')
  })

  it('prefers richer settle-reason trust over thinner generic upstream trust in runtime summaries', () => {
    const entries = buildRuntimeAuthoritySummaryEntries({
      rendererTarget: 'vrm',
      authoritySegmentId: 'segment-thin-affective-runtime-summary-override-1',
      authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
      authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
      authorityTrustSummary: 'VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
      authorityMismatchSummary: null,
      authorityMismatchReasonSummary: null,
      settleAuthoritySummary: 'authority-bound | segment=segment-thin-affective-runtime-summary-override-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
    } as any)

    expect(entries.find(entry => entry.key === 'authority-trust')?.value).toContain('余韵还在，先留白，别立刻把温度放大')
  })

  it('keeps same-turn-if-invited measured-return callback-line trust visible in runtime authority summaries', () => {
    expect(buildRuntimeAuthoritySummaryEntries({
      rendererTarget: 'vrm',
      authoritySegmentId: 'segment-invited-runtime-summary-1',
      authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
      authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
      authorityTrustSummary: 'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。',
      authorityMismatchSummary: null,
      authorityMismatchReasonSummary: null,
      settleAuthoritySummary: 'authority-bound | segment=segment-invited-runtime-summary-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
    } as any)).toEqual([
      { key: 'renderer-target', label: '渲染目标', value: 'vrm' },
      { key: 'authority-segment', label: '权威片段', value: 'segment-invited-runtime-summary-1' },
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
        value: 'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。',
      },
      {
        key: 'settle-authority',
        label: '稳定段归因',
        value: 'authority-bound，片段 segment-invited-runtime-summary-1，目标 VRM，驱动 表情、动作、口型，来源 prosody-authority, timeline-projection',
        technicalValue: 'authority-bound | segment=segment-invited-runtime-summary-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
      },
    ])
  })

  it('derives structured same-her closure stage entries from authority lane summaries inside runtime authority summaries', () => {
    expect(buildRuntimeAuthoritySummaryEntries({
      rendererTarget: 'vrm',
      authoritySegmentId: 'segment-runtime-closure-fallback-1',
      authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body-carried-to-renderer-rejoin',
      authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
      authorityTrustSummary: null,
      authorityMismatchSummary: null,
      authorityMismatchReasonSummary: null,
      authorityMismatchDisplay: null,
      settleAuthoritySummary: 'authority-bound | segment=segment-runtime-closure-fallback-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | lane=body-carried-to-renderer-rejoin',
    } as any)).toEqual(expect.arrayContaining([
      {
        key: 'embodiment-closure-stage',
        label: '闭环阶段',
        value: 'body-carried-to-renderer-rejoin',
      },
    ]))
  })

  it('derives quieter body+lipsync same-her closure stage entries from authority lane summaries inside runtime authority summaries', () => {
    expect(buildRuntimeAuthoritySummaryEntries({
      rendererTarget: 'vrm',
      authoritySegmentId: 'segment-runtime-body-lipsync-carry-1',
      authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
      authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
      authorityTrustSummary: null,
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
      authorityMismatchReasonSummary: 'the resident body lane is still holding together with one other embodiment lane while face and motion have not rejoined yet',
      authorityMismatchDisplay: 'the resident body lane is still holding together with one other embodiment lane while face and motion have not rejoined yet',
      settleAuthoritySummary: 'authority-bound | segment=segment-runtime-body-lipsync-carry-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority | lane=body+lipsync-only | mode=measured-return | timing=body-lipsync-carry',
    } as any)).toEqual(expect.arrayContaining([
      {
        key: 'embodiment-closure-stage',
        label: '闭环阶段',
        value: 'body-carried-to-renderer-rejoin',
      },
    ]))
  })

  it('derives renderer-rejoin-without-body from still-voiced face or motion lanes inside runtime authority summaries', () => {
    const cases = [
      {
        rendererTarget: 'live2d' as const,
        authoritySegmentId: 'segment-runtime-face-lipsync-voice-body-loss-1',
        authorityBindingSummary: 'target=live2d | drivers=face, lipsync | sources=prosody-authority, voice-segment | matches=body:no face:yes motion:no lipsync:yes voice:yes | lane=face+lipsync+voice-only',
        authorityMatchSummary: 'body:no face:yes motion:no lipsync:yes voice:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-face-lipsync-voice-body-loss-1 | target=live2d | drivers=face, lipsync | sources=prosody-authority, voice-segment | lane=face+lipsync+voice-only',
      },
      {
        rendererTarget: 'vrm' as const,
        authoritySegmentId: 'segment-runtime-motion-lipsync-voice-body-loss-1',
        authorityBindingSummary: 'target=vrm | drivers=motion, lipsync | sources=prosody-authority, voice-segment | matches=body:no face:no motion:yes lipsync:yes voice:yes | lane=motion+lipsync+voice-only',
        authorityMatchSummary: 'body:no face:no motion:yes lipsync:yes voice:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-motion-lipsync-voice-body-loss-1 | target=vrm | drivers=motion, lipsync | sources=prosody-authority, voice-segment | lane=motion+lipsync+voice-only',
      },
    ] as const

    for (const testCase of cases) {
      expect(buildRuntimeAuthoritySummaryEntries({
        rendererTarget: testCase.rendererTarget,
        authoritySegmentId: testCase.authoritySegmentId,
        authorityBindingSummary: testCase.authorityBindingSummary,
        authorityMatchSummary: testCase.authorityMatchSummary,
        authorityTrustSummary: null,
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        settleAuthoritySummary: testCase.settleAuthoritySummary,
      } as any)).toEqual(expect.arrayContaining([
        {
          key: 'embodiment-closure-stage',
          label: '闭环阶段',
          value: 'renderer-rejoin-without-body',
        },
      ]))
    }
  })

  it('keeps quieter face+lipsync+voice and motion+lipsync+voice same-her continuity explicit in runtime authority summaries instead of collapsing them into shorter lane-only labels', () => {
    const cases = [
      {
        rendererTarget: 'live2d' as const,
        authoritySegmentId: 'segment-runtime-face-lipsync-voice-governance-1',
        authorityBindingSummary: 'target=live2d | drivers=face, lipsync | sources=prosody-authority, voice-segment | matches=body:no face:yes motion:no lipsync:yes voice:yes | lane=face+lipsync+voice-only',
        authorityMatchSummary: 'body:no face:yes motion:no lipsync:yes voice:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-face-lipsync-voice-governance-1 | target=live2d | drivers=face, lipsync | sources=prosody-authority, voice-segment | lane=face+lipsync+voice-only',
        expectedLaneTruth: '当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线',
      },
      {
        rendererTarget: 'vrm' as const,
        authoritySegmentId: 'segment-runtime-motion-lipsync-voice-governance-1',
        authorityBindingSummary: 'target=vrm | drivers=motion, lipsync | sources=prosody-authority, voice-segment | matches=body:no face:no motion:yes lipsync:yes voice:yes | lane=motion+lipsync+voice-only',
        authorityMatchSummary: 'body:no face:no motion:yes lipsync:yes voice:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-runtime-motion-lipsync-voice-governance-1 | target=vrm | drivers=motion, lipsync | sources=prosody-authority, voice-segment | lane=motion+lipsync+voice-only',
        expectedLaneTruth: '当前仅剩动作、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线',
      },
    ] as const

    for (const testCase of cases) {
      expect(buildRuntimeAuthoritySummaryEntries({
        rendererTarget: testCase.rendererTarget,
        authoritySegmentId: testCase.authoritySegmentId,
        authorityBindingSummary: testCase.authorityBindingSummary,
        authorityMatchSummary: testCase.authorityMatchSummary,
        authorityTrustSummary: null,
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        settleAuthoritySummary: testCase.settleAuthoritySummary,
      } as any)).toEqual(expect.arrayContaining([
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

  it('derives structured same-her closure stage entries from authority lane summaries inside playback cue authority summaries', () => {
    expect(buildPlaybackCueAuthoritySummaryEntries({
      cueId: 'segment-playback-closure-fallback-1',
      authoritySegmentId: 'segment-playback-closure-fallback-1',
      authorityRendererTarget: 'vrm',
      authorityMatchedDrivers: ['body', 'lipsync'],
      authoritySources: ['prosody-authority', 'voice-segment'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
      authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body-carried-to-renderer-rejoin',
      authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
      settleAuthoritySummary: 'authority-bound | segment=segment-playback-closure-fallback-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | lane=body-carried-to-renderer-rejoin',
    } as any)).toEqual(expect.arrayContaining([
      {
        key: 'embodiment-closure-stage',
        label: '闭环阶段',
        value: 'body-carried-to-renderer-rejoin',
      },
    ]))
  })

  it('keeps trace telemetry on the same body line instead of rebuilding shell face motion and lipsync matches from fallback driver summary', () => {
    expect(buildTraceTelemetrySummaryEntries({
      decisionTraceId: 'mind:body-only:1',
      turnMode: 'care',
      truthState: 'live-grounded',
      repairState: 'none',
      finalSurfacePolicy: 'procedural-carry',
      closureState: 'grounded-recall',
      activeThreadId: 'runtime-thread-body-only-1',
      suppressionTags: [],
      latestEventSummary: 'body continuity held while face motion and lipsync were still reforming',
      segmentBinding: {
        matched: true,
        rendererTarget: 'live2d',
        matchedDrivers: ['body'],
        matchedSources: [],
      },
    }, {
      traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=body | execution=body | scenario=same-body-line | stance=observe-first | sourceTrail=care, grounded-recall',
    })).toEqual([
      { key: 'trace-id', label: '决策轨迹', value: 'mind:body-only:1' },
      { key: 'turn-mode', label: '回合模式', value: 'care' },
      { key: 'truth-state', label: '真值状态', value: 'live-grounded' },
      { key: 'repair-state', label: '修复状态', value: 'none' },
      { key: 'surface-policy', label: '表面策略', value: 'procedural-carry' },
      { key: 'closure-state', label: '收口状态', value: 'grounded-recall' },
      { key: 'thread-id', label: '运行线程', value: 'runtime-thread-body-only-1' },
      { key: 'binding-state', label: '绑定状态', value: 'matched' },
      { key: 'binding-target', label: '绑定目标', value: 'live2d' },
      { key: 'binding-drivers', label: '命中驱动', value: 'body' },
      { key: 'trace-embodiment', label: '轨迹落点', value: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 身体，实际执行 身体，场景 same-body-line，姿态 先观察后表达，来源链 care -> grounded-recall', technicalValue: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=body | execution=body | scenario=same-body-line | stance=observe-first | sourceTrail=care, grounded-recall' },
      { key: 'latest-event', label: '最近事件', value: 'body continuity held while face motion and lipsync were still reforming' },
    ])
  })

  it('rebuilds body-carried same-her trust from settle and binding summaries when no explicit trust summary is present', () => {
    expect(resolveAuthorityTrustSummaryFromSettleAuthority({
      authorityTrustSummary: null,
      authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
      settleAuthoritySummary: 'authority-bound | segment=segment-body-speech-runtime-helper-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | lane=body+lipsync-only',
      rendererTarget: 'vrm',
    })).toBeNull()

    expect(buildRuntimeAuthoritySummaryEntries({
      rendererTarget: 'vrm',
      authoritySegmentId: 'segment-body-speech-runtime-helper-1',
      authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
      authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
      authorityTrustSummary: null,
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
      authorityMismatchReasonSummary: '表情和动作还没回到这一段里，但身体线已经继续托住同一个 living segment。',
      settleAuthoritySummary: 'authority-bound | segment=segment-body-speech-runtime-helper-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | lane=body+lipsync-only',
    } as any)).toEqual(expect.arrayContaining([
      {
        key: 'authority-binding',
        label: '权威绑定',
        value: '目标 VRM，驱动 身体、口型，来源 prosody-authority, voice-segment，命中 身体命中 / 表情未命中 / 动作未命中 / 口型命中，当前仅剩身体、口型维持同一段连续性',
        technicalValue: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
      },
      {
        key: 'settle-authority',
        label: '稳定段归因',
        value: 'authority-bound，片段 segment-body-speech-runtime-helper-1，目标 VRM，驱动 身体、口型，来源 prosody-authority, voice-segment，当前仅剩身体、口型维持同一段连续性',
        technicalValue: 'authority-bound | segment=segment-body-speech-runtime-helper-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | lane=body+lipsync-only',
      },
    ]))
  })
})
