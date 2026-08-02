import { describe, expect, it } from 'vitest'

import {
  buildSpeechDiagnosticSummaryEntries,
  buildSpeechDiagnosticSummaryLines,
} from './performance-visualizer-speech-diagnostic-summary'

describe('performance visualizer speech diagnostic summary', () => {
  it('surfaces execution safety-gate reason tags as a readable speech diagnostic line before raw continuity reasons', () => {
    const entries = buildSpeechDiagnosticSummaryEntries({
      includeSettleAuthority: false,
      continuitySignature: 'resident|measured-return|execution-restraint',
      continuityReasonTags: [
        'execution-safety-gate:blocked-dispatch-restraint',
        'execution-safety-gate:confirmation-required',
        'execution-safety-gate:no-process-started',
        'embodiment-carry:measured-return',
      ],
      speechEvidence: null,
    } as any)

    expect(entries).toEqual([
      { key: 'continuity-signature', label: '同一人签名', value: 'resident|measured-return|execution-restraint' },
      {
        key: 'execution-safety-gate',
        label: '执行安全门',
        value: 'blocked dispatch 已被安全门拦住；需要确认；没有启动进程。',
        technicalValue: 'execution-safety-gate:blocked-dispatch-restraint, execution-safety-gate:confirmation-required, execution-safety-gate:no-process-started',
      },
      {
        key: 'continuity-reasons',
        label: '同一人线索',
        value: 'execution-safety-gate:blocked-dispatch-restraint, execution-safety-gate:confirmation-required, execution-safety-gate:no-process-started, embodiment-carry:measured-return',
      },
    ])

    expect(buildSpeechDiagnosticSummaryLines(entries)).toEqual([
      'continuity-signature: resident|measured-return|execution-restraint',
      'execution-safety-gate: blocked dispatch 已被安全门拦住；需要确认；没有启动进程。',
      'continuity-reasons: execution-safety-gate:blocked-dispatch-restraint, execution-safety-gate:confirmation-required, execution-safety-gate:no-process-started, embodiment-carry:measured-return',
    ])
  })

  it('builds Chinese-first diagnostic entries and technical lines from shared speech evidence', () => {
    const entries = buildSpeechDiagnosticSummaryEntries({
      authorityBindingSummary: 'target=vrm | drivers=face, lipsync | sources=prosody-authority | matches=face:yes motion:no lipsync:yes | lane=face+lipsync-only',
      authorityMatchSummary: 'face:yes motion:no lipsync:yes',
      authorityMismatchSummary: 'motion-mismatch',
      authorityMismatchReasonSummary: '动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情、动作、口型。',
      settleAuthoritySummary: 'authority-bound | segment=segment-zh-1 | target=vrm | drivers=face, lipsync | sources=prosody-authority | lane=face+lipsync-only',
      traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
      includeSettleAuthority: true,
      speechEvidence: {
        voiceSummary: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-zh-1 | source=prosody-authority',
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-zh-1',
        authorityMatchSummary: 'face:yes motion:no lipsync:yes',
        topVisemeSummary: 'A:0.66, closed:0.41, E:0.24',
        cueSummary: 'focused / observe_focus | prosody=0.36 mouth=0.28 head=0.32 provenance=fallback-derived segment=segment-zh-1',
        cueIdentityPresent: true,
        cueProsodyPresent: true,
        personaStyleSummary: 'observe-first | prosody=-0.07 beat=-0.06 mouth=-0.04 head=+0.08 provenance=authority-bound segment=segment-zh-1',
        timingSummary: 'facial=320 action=240 emotion=360 | segment-start | soft-interrupt | hold',
        driverExecutionSummary: 'face=attentive/focused@0.61 hold=320',
        visemeHintsSummary: 'I:0.35@0.94 src=prosody-authority segment=segment-zh-1 | closed:0.75@0.89 src=prosody-authority segment=segment-zh-1',
      },
    })

    expect(entries).toEqual([
      { key: 'authority', label: '权威绑定', value: '目标 VRM，驱动 表情、口型，来源 prosody-authority，命中 表情命中 / 动作未命中 / 口型命中，当前仅剩表情、口型维持同一段连续性', technicalValue: 'target=vrm | drivers=face, lipsync | sources=prosody-authority | matches=face:yes motion:no lipsync:yes | lane=face+lipsync-only' },
      { key: 'authority-match', label: '绑定命中', value: '表情命中 / 动作未命中 / 口型命中 / 声音命中', technicalValue: 'face:yes motion:no lipsync:yes voice:yes' },
      { key: 'closure-stage', label: '闭环阶段', value: 'renderer-rejoin-without-body' },
      { key: 'authority-mismatch', label: '权威漂移', value: '动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情、动作、口型。' },
      { key: 'voice', label: '语音韵律', value: '中文韵律，收口 0.84，咬字 0.90，权威绑定，片段 segment-zh-1，来源 韵律权威', technicalValue: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-zh-1 | source=prosody-authority' },
      { key: 'prosody-authority', label: '韵律权威', value: '模式 energy-phoneme-hybrid，韵律 0.35，口部 0.35，头部 0.32，峰值口型 0.75，权威绑定，来源 韵律权威，片段 segment-zh-1', technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-zh-1' },
      { key: 'visemes', label: '主口型', value: 'A 0.66，闭口 0.41，E 0.24', technicalValue: 'A:0.66, closed:0.41, E:0.24' },
      { key: 'cue', label: '微表情线索', value: 'focused / observe_focus，韵律 0.36，口部 0.28，头部 0.32，回退派生，片段 segment-zh-1', technicalValue: 'focused / observe_focus | prosody=0.36 mouth=0.28 head=0.32 provenance=fallback-derived segment=segment-zh-1' },
      { key: 'persona-style', label: '人设风格', value: 'observe-first，韵律 -0.07，节拍 -0.06，口部 -0.04，头部 +0.08，权威绑定，片段 segment-zh-1', technicalValue: 'observe-first | prosody=-0.07 beat=-0.06 mouth=-0.04 head=+0.08 provenance=authority-bound segment=segment-zh-1' },
      { key: 'timing', label: '时序节奏', value: '表情 320ms，动作 240ms，情绪 360ms，片段起始，软打断，保持', technicalValue: 'facial=320 action=240 emotion=360 | segment-start | soft-interrupt | hold' },
      { key: 'driver-execution', label: '驱动执行', value: '表情 attentive/focused @0.61，保持 320ms', technicalValue: 'face=attentive/focused@0.61 hold=320' },
      { key: 'trace-embodiment', label: '轨迹落点', value: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）', technicalValue: 'turn=care | closure=grounded-recall | surface=procedural-carry' },
      { key: 'viseme-hints', label: '口型提示', value: 'I 权重 0.35（置信 0.94，来源 韵律权威，片段 segment-zh-1），闭口 权重 0.75（置信 0.89，来源 韵律权威，片段 segment-zh-1）', technicalValue: 'I:0.35@0.94 src=prosody-authority segment=segment-zh-1 | closed:0.75@0.89 src=prosody-authority segment=segment-zh-1' },
      { key: 'settle-authority', label: '稳定段归因', value: 'authority-bound，片段 segment-zh-1，目标 VRM，驱动 表情、口型，来源 prosody-authority，当前仅剩表情、口型维持同一段连续性', technicalValue: 'authority-bound | segment=segment-zh-1 | target=vrm | drivers=face, lipsync | sources=prosody-authority | lane=face+lipsync-only' },
    ])

    expect(buildSpeechDiagnosticSummaryLines(entries)).toEqual([
      'authority: 目标 VRM，驱动 表情、口型，来源 prosody-authority，命中 表情命中 / 动作未命中 / 口型命中，当前仅剩表情、口型维持同一段连续性',
      'authority-match: 表情命中 / 动作未命中 / 口型命中 / 声音命中',
      'closure-stage: renderer-rejoin-without-body',
      'authority-mismatch: 动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情、动作、口型。',
      'voice: 中文韵律，收口 0.84，咬字 0.90，权威绑定，片段 segment-zh-1，来源 韵律权威',
      'prosody-authority: 模式 energy-phoneme-hybrid，韵律 0.35，口部 0.35，头部 0.32，峰值口型 0.75，权威绑定，来源 韵律权威，片段 segment-zh-1',
      'visemes: A 0.66，闭口 0.41，E 0.24',
      'cue: focused / observe_focus，韵律 0.36，口部 0.28，头部 0.32，回退派生，片段 segment-zh-1',
      'persona-style: observe-first，韵律 -0.07，节拍 -0.06，口部 -0.04，头部 +0.08，权威绑定，片段 segment-zh-1',
      'timing: 表情 320ms，动作 240ms，情绪 360ms，片段起始，软打断，保持',
      'driver-execution: 表情 attentive/focused @0.61，保持 320ms',
      'trace-embodiment: 关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
      'viseme-hints: I 权重 0.35（置信 0.94，来源 韵律权威，片段 segment-zh-1），闭口 权重 0.75（置信 0.89，来源 韵律权威，片段 segment-zh-1）',
      'settle-authority: authority-bound，片段 segment-zh-1，目标 VRM，驱动 表情、口型，来源 prosody-authority，当前仅剩表情、口型维持同一段连续性',
    ])
  })

  it('keeps upstream human-facing driver execution text unchanged instead of forcing a local reformat', () => {
    const entries = buildSpeechDiagnosticSummaryEntries({
      includeSettleAuthority: false,
      speechEvidence: {
        voiceSummary: null,
        prosodyAuthoritySummary: null,
        authorityMatchSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: '上游驱动执行',
        visemeHintsSummary: null,
      },
    })

    expect(entries).toEqual([
      { key: 'driver-execution', label: '驱动执行', value: '上游驱动执行' },
    ])

    expect(buildSpeechDiagnosticSummaryLines(entries)).toEqual([
      'driver-execution: 上游驱动执行',
    ])
  })

  it('surfaces memory-deliberation continuity reasons prominently in high-level voice summaries', () => {
    const entries = buildSpeechDiagnosticSummaryEntries({
      includeSettleAuthority: false,
      speechEvidence: {
        voiceSummary: 'zh-CN | closure=0.72 | precision=0.88 | companion=repair-before-closeness | reason=Memory deliberation still says let repair settle first on the continuity state before closeness widens again | source=prosody-authority | segment=segment-memory-deliberation-repair-1',
        prosodyAuthoritySummary: null,
        authorityMatchSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        visemeHintsSummary: null,
      },
    })

    expect(entries).toContainEqual({
      key: 'voice',
      label: '语音韵律',
      value: '中文韵律，收口 0.72，咬字 0.88，companion repair-before-closeness，连续性原因 Memory deliberation still says let repair settle first on the continuity state before closeness widens again，来源 韵律权威，片段 segment-memory-deliberation-repair-1',
      technicalValue: 'zh-CN | closure=0.72 | precision=0.88 | companion=repair-before-closeness | reason=Memory deliberation still says let repair settle first on the continuity state before closeness widens again | source=prosody-authority | segment=segment-memory-deliberation-repair-1',
    })
  })

  it('prefers authority mismatch display over reason/technical summary when a human-facing upstream display already exists', () => {
    const entries = buildSpeechDiagnosticSummaryEntries({
      authorityBindingSummary: 'target=vrm | drivers=face, lipsync | sources=prosody-authority | matches=face:yes motion:no lipsync:yes',
      authorityMatchSummary: 'face:yes motion:no lipsync:yes',
      authorityMismatchSummary: 'motion-mismatch',
      authorityMismatchReasonSummary: '动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情、动作、口型。',
      authorityMismatchDisplay: '上游 authority 展示：当前仍在同一主线程里，但动作落点已经偏离绑定段。',
      includeSettleAuthority: false,
      speechEvidence: null,
    } as any)

    expect(entries).toEqual([
      { key: 'authority', label: '权威绑定', value: '目标 VRM，驱动 表情、口型，来源 prosody-authority，命中 表情命中 / 动作未命中 / 口型命中', technicalValue: 'target=vrm | drivers=face, lipsync | sources=prosody-authority | matches=face:yes motion:no lipsync:yes' },
      { key: 'authority-match', label: '绑定命中', value: '表情命中 / 动作未命中 / 口型命中', technicalValue: 'face:yes motion:no lipsync:yes' },
      { key: 'authority-mismatch', label: '权威漂移', value: '上游 authority 展示：当前仍在同一主线程里，但动作落点已经偏离绑定段。' },
    ])

    expect(buildSpeechDiagnosticSummaryLines(entries)).toEqual([
      'authority: 目标 VRM，驱动 表情、口型，来源 prosody-authority，命中 表情命中 / 动作未命中 / 口型命中',
      'authority-match: 表情命中 / 动作未命中 / 口型命中',
      'authority-mismatch: 上游 authority 展示：当前仍在同一主线程里，但动作落点已经偏离绑定段。',
    ])
  })

  it('keeps a thin measured-return identity-continuity', () => {
    const entries = buildSpeechDiagnosticSummaryEntries({
      authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only',
      authorityMatchSummary: 'face:no motion:no lipsync:yes',
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
      authorityMismatchReasonSummary: 'Only runtime digest plus spine still expose the noisy-detour continuity line, so higher-level continuity should keep this thinner measured-return identity-continuity',
      settleAuthoritySummary: 'authority-bound | segment=segment-thin-measured-return-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync-only',
      includeSettleAuthority: true,
      speechEvidence: null,
    } as any)

    expect(entries).toEqual([
      {
        key: 'authority',
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
      {
        key: 'authority-mismatch',
        label: '权威漂移',
        value: 'Only runtime digest plus spine still expose the noisy-detour continuity line, so higher-level continuity should keep this thinner measured-return identity-continuity',
      },
      {
        key: 'settle-authority',
        label: '稳定段归因',
        value: 'authority-bound，片段 segment-thin-measured-return-1，目标 VRM，驱动 口型，来源 prosody-authority，噪声 detour 后，这条 measured-return 连续身体线仍由较薄证据维持',
        technicalValue: 'authority-bound | segment=segment-thin-measured-return-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync-only',
      },
    ])
  })

  it('keeps body lipsync and voice identity-continuity', () => {
    const entries = buildSpeechDiagnosticSummaryEntries({
      authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync+voice-only | pending-rejoin=face+motion',
      authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
      settleAuthoritySummary: 'authority-bound | segment=segment-body-lipsync-voice-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority | lane=body+lipsync+voice-only | pending-rejoin=face+motion',
      includeSettleAuthority: true,
      speechEvidence: null,
    } as any)

    expect(entries).toEqual([
      {
        key: 'authority',
        label: '权威绑定',
        value: '目标 VRM，驱动 身体、口型，来源 prosody-authority，命中 身体命中 / 表情未命中 / 动作未命中 / 口型命中，当前仅剩身体、口型、声音维持同一段连续性，表情和动作还在重连这条身体线',
        technicalValue: 'target=vrm | drivers=body, lipsync | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync+voice-only | pending-rejoin=face+motion',
      },
      {
        key: 'authority-match',
        label: '绑定命中',
        value: '身体命中 / 表情未命中 / 动作未命中 / 口型命中',
        technicalValue: 'body:yes face:no motion:no lipsync:yes',
      },
      {
        key: 'closure-stage',
        label: '闭环阶段',
        value: 'audible-body-carry',
      },
      {
        key: 'authority-trust',
        label: '权威可信性',
        value: 'VRM 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，表情和动作还在重连这条身体线。',
      },
      {
        key: 'settle-authority',
        label: '稳定段归因',
        value: 'authority-bound，片段 segment-body-lipsync-voice-1，目标 VRM，驱动 身体、口型，来源 prosody-authority，当前仅剩身体、口型、声音维持同一段连续性，表情和动作还在重连这条身体线',
        technicalValue: 'authority-bound | segment=segment-body-lipsync-voice-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority | lane=body+lipsync+voice-only | pending-rejoin=face+motion',
      },
    ])
  })

  it('surfaces embodiment closure stage in speech summaries when audible body continuity is the active identity-continuity', () => {
    const entries = buildSpeechDiagnosticSummaryEntries({
      authorityMismatchDisplay: '当前仍由身体和可听线维持同一段连续性 | closure=audible-body-carry',
      includeSettleAuthority: false,
      speechEvidence: {
        voiceSummary: null,
        prosodyAuthoritySummary: null,
        authorityMatchSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: 'segment=segment-audible-body-1 | closure=audible-body-carry',
        visemeHintsSummary: null,
      },
    })

    expect(entries).toContainEqual({
      key: 'closure-stage',
      label: '闭环阶段',
      value: 'audible-body-carry',
    })
  })

  it('prefers normalized speech evidence closure stage over re-parsing when identity-continuity', () => {
    const entries = buildSpeechDiagnosticSummaryEntries({
      includeSettleAuthority: false,
      speechEvidence: {
        voiceSummary: null,
        prosodyAuthoritySummary: null,
        authorityMatchSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: 'segment=segment-audible-body-structured-1',
        visemeHintsSummary: null,
        embodimentClosureStage: 'audible-body-carry',
      } as any,
    })

    expect(entries).toContainEqual({
      key: 'closure-stage',
      label: '闭环阶段',
      value: 'audible-body-carry',
    })
  })

  it('extracts structured identity-continuity', () => {
    const cases = [
      {
        expected: 'body-carried-to-renderer-rejoin',
        authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body-carried-to-renderer-rejoin',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-speech-summary-body-carried-to-renderer-rejoin-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | lane=body-carried-to-renderer-rejoin',
      },
      {
        expected: 'body-carried-to-renderer-rejoin',
        authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-speech-summary-body-lipsync-carry-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority | lane=body+lipsync-only | mode=measured-return | timing=body-lipsync-carry',
      },
      {
        expected: 'full-cross-modal-lock',
        authorityBindingSummary: 'target=vrm | drivers=body, face, motion, lipsync | sources=cue-bridge, prosody-authority, timeline-projection, voice-segment | matches=body:yes face:yes motion:yes lipsync:yes | lane=full-cross-modal-lock',
        authorityMatchSummary: 'body:yes face:yes motion:yes lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-speech-summary-full-cross-modal-lock-1 | target=vrm | drivers=body, face, motion, lipsync | sources=cue-bridge, prosody-authority, timeline-projection, voice-segment | lane=full-cross-modal-lock',
      },
      {
        expected: 'renderer-rejoin-without-body',
        authorityBindingSummary: 'target=live2d | drivers=face, motion, lipsync | sources=cue-bridge, prosody-authority, timeline-projection | matches=body:no face:yes motion:yes lipsync:yes | lane=renderer-rejoin-without-body',
        authorityMatchSummary: 'body:no face:yes motion:yes lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-speech-summary-renderer-rejoin-without-body-1 | target=live2d | drivers=face, motion, lipsync | sources=cue-bridge, prosody-authority, timeline-projection | lane=renderer-rejoin-without-body',
      },
      {
        expected: 'renderer-rejoin-without-body',
        authorityBindingSummary: 'target=live2d | drivers=face, lipsync | sources=prosody-authority | matches=body:no face:yes motion:no lipsync:yes | lane=face+lipsync-only',
        authorityMatchSummary: 'body:no face:yes motion:no lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-speech-summary-face-lipsync-body-loss-1 | target=live2d | drivers=face, lipsync | sources=prosody-authority | lane=face+lipsync-only',
      },
      {
        expected: 'renderer-rejoin-without-body',
        authorityBindingSummary: 'target=vrm | drivers=motion, lipsync | sources=prosody-authority | matches=body:no face:no motion:yes lipsync:yes | lane=motion+lipsync-only',
        authorityMatchSummary: 'body:no face:no motion:yes lipsync:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-speech-summary-motion-lipsync-body-loss-1 | target=vrm | drivers=motion, lipsync | sources=prosody-authority | lane=motion+lipsync-only',
      },
      {
        expected: 'renderer-rejoin-without-body',
        authorityBindingSummary: 'target=live2d | drivers=face, lipsync | sources=prosody-authority, voice-segment | matches=body:no face:yes motion:no lipsync:yes voice:yes | lane=face+lipsync+voice-only',
        authorityMatchSummary: 'body:no face:yes motion:no lipsync:yes voice:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-speech-summary-face-lipsync-voice-body-loss-1 | target=live2d | drivers=face, lipsync | sources=prosody-authority, voice-segment | lane=face+lipsync+voice-only',
      },
      {
        expected: 'renderer-rejoin-without-body',
        authorityBindingSummary: 'target=vrm | drivers=motion, lipsync | sources=prosody-authority, voice-segment | matches=body:no face:no motion:yes lipsync:yes voice:yes | lane=motion+lipsync+voice-only',
        authorityMatchSummary: 'body:no face:no motion:yes lipsync:yes voice:yes',
        settleAuthoritySummary: 'authority-bound | segment=segment-speech-summary-motion-lipsync-voice-body-loss-1 | target=vrm | drivers=motion, lipsync | sources=prosody-authority, voice-segment | lane=motion+lipsync+voice-only',
      },
    ] as const

    for (const testCase of cases) {
      const entries = buildSpeechDiagnosticSummaryEntries({
        authorityBindingSummary: testCase.authorityBindingSummary,
        authorityMatchSummary: testCase.authorityMatchSummary,
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        settleAuthoritySummary: testCase.settleAuthoritySummary,
        includeSettleAuthority: false,
        speechEvidence: {
          voiceSummary: null,
          prosodyAuthoritySummary: null,
          authorityMatchSummary: null,
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: false,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: null,
          visemeHintsSummary: null,
        } as any,
      } as any)

      expect(entries).toContainEqual({
        key: 'closure-stage',
        label: '闭环阶段',
        value: testCase.expected,
      })
    }
  })

  it('rebuilds thin affective authority trust from settle authority reason when speech outer summaries would otherwise drop it', () => {
    const entries = buildSpeechDiagnosticSummaryEntries({
      authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
      authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
      authorityTrustSummary: null,
      authorityMismatchSummary: null,
      authorityMismatchReasonSummary: null,
      settleAuthoritySummary: 'authority-bound | segment=segment-thin-affective-speech-summary-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
      includeSettleAuthority: true,
      speechEvidence: null,
    } as any)

    expect(entries.find(entry => entry.key === 'authority-trust')?.value).toContain('余韵还在，先留白，别立刻把温度放大')
  })

  it('prefers richer settle-reason trust over thinner generic upstream trust in speech summaries', () => {
    const entries = buildSpeechDiagnosticSummaryEntries({
      authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
      authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
      authorityTrustSummary: 'VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
      authorityMismatchSummary: null,
      authorityMismatchReasonSummary: null,
      settleAuthoritySummary: 'authority-bound | segment=segment-thin-affective-speech-summary-runtime-override-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
      includeSettleAuthority: true,
      speechEvidence: null,
    } as any)

    expect(entries.find(entry => entry.key === 'authority-trust')?.value).toContain('余韵还在，先留白，别立刻把温度放大')
  })

  it('surfaces continuity signature and reason tags in speech summaries when playback authority already proved the shared living line', () => {
    const entries = buildSpeechDiagnosticSummaryEntries({
      authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync+voice-only',
      authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
      includeSettleAuthority: false,
      continuitySignature: 'embodiment:body-lipsync-voice-rejoin',
      continuityReasonTags: [
        'embodiment:audible-continuity-line',
        'embodiment:still-voiced-motion-line',
      ],
      speechEvidence: null,
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity-signature',
      label: '同一人签名',
      value: 'embodiment:body-lipsync-voice-rejoin',
    })
    expect(entries).toContainEqual({
      key: 'continuity-reasons',
      label: '同一人线索',
      value: 'embodiment:audible-continuity-line, embodiment:still-voiced-motion-line',
    })
    expect(buildSpeechDiagnosticSummaryLines(entries)).toContain(
      'continuity-signature: embodiment:body-lipsync-voice-rejoin',
    )
    expect(buildSpeechDiagnosticSummaryLines(entries)).toContain(
      'continuity-reasons: embodiment:audible-continuity-line, embodiment:still-voiced-motion-line',
    )
  })

  it('appends lane truth to descriptive upstream authority summaries when matched drivers and mismatches are known', () => {
    const entries = buildSpeechDiagnosticSummaryEntries({
      authorityBindingSummary: '上游 authority 绑定',
      authorityMatchSummary: '上游 authority 命中',
      authorityMatchedDrivers: ['face', 'lipsync'],
      authorityMismatchSummary: 'motion-mismatch',
      includeSettleAuthority: false,
      speechEvidence: null,
    } as any)

    expect(entries).toEqual([
      { key: 'authority', label: '权威绑定', value: '上游 authority 绑定 | 表情命中 / 动作未命中 / 口型命中' },
      { key: 'authority-match', label: '绑定命中', value: '上游 authority 命中 | 表情命中 / 动作未命中 / 口型命中' },
      { key: 'authority-mismatch', label: '权威漂移', value: 'motion-mismatch' },
    ])

    expect(buildSpeechDiagnosticSummaryLines(entries)).toEqual([
      'authority: 上游 authority 绑定 | 表情命中 / 动作未命中 / 口型命中',
      'authority-match: 上游 authority 命中 | 表情命中 / 动作未命中 / 口型命中',
      'authority-mismatch: motion-mismatch',
    ])
  })

  it('keeps voice visible inside descriptive upstream authority summaries when the same segment still survives through lipsync and voice together', () => {
    const entries = buildSpeechDiagnosticSummaryEntries({
      authorityBindingSummary: '上游 authority 绑定',
      authorityMatchSummary: '上游 authority 命中',
      authorityMatchedDrivers: ['lipsync'],
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
      settleAuthoritySummary: 'authority-bound | segment=segment-speech-summary-voice-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync+voice-only',
      includeSettleAuthority: false,
      speechEvidence: {
        voiceSummary: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-speech-summary-voice-1 | source=prosody-authority',
        bodyContinuitySummary: null,
        prosodyAuthoritySummary: null,
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: true,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        visemeHintsSummary: null,
      },
    } as any)

    expect(entries).toEqual([
      { key: 'authority', label: '权威绑定', value: '上游 authority 绑定 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中' },
      { key: 'authority-match', label: '绑定命中', value: '上游 authority 命中 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中' },
      { key: 'authority-mismatch', label: '权威漂移', value: 'face-mismatch, motion-mismatch' },
      { key: 'voice', label: '语音韵律', value: '中文韵律，收口 0.84，咬字 0.90，权威绑定，片段 segment-speech-summary-voice-1，来源 韵律权威', technicalValue: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-speech-summary-voice-1 | source=prosody-authority' },
    ])

    expect(buildSpeechDiagnosticSummaryLines(entries)).toEqual([
      'authority: 上游 authority 绑定 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中',
      'authority-match: 上游 authority 命中 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中',
      'authority-mismatch: face-mismatch, motion-mismatch',
      'voice: 中文韵律，收口 0.84，咬字 0.90，权威绑定，片段 segment-speech-summary-voice-1，来源 韵律权威',
    ])
  })

  it('appends body-backed lane truth to descriptive upstream authority summaries when the living segment is now carried by body and voice', () => {
    const entries = buildSpeechDiagnosticSummaryEntries({
      authorityBindingSummary: '上游 authority 绑定',
      authorityMatchSummary: '上游 authority 命中',
      authorityMatchedDrivers: ['body'],
      authorityMismatchSummary: 'face-mismatch, motion-mismatch, lipsync-mismatch',
      includeSettleAuthority: false,
      speechEvidence: null,
    } as any)

    expect(entries).toEqual([
      { key: 'authority', label: '权威绑定', value: '上游 authority 绑定 | 身体命中 / 表情未命中 / 动作未命中 / 口型未命中' },
      { key: 'authority-match', label: '绑定命中', value: '上游 authority 命中 | 身体命中 / 表情未命中 / 动作未命中 / 口型未命中' },
      { key: 'authority-mismatch', label: '权威漂移', value: 'face-mismatch, motion-mismatch, lipsync-mismatch' },
    ])

    expect(buildSpeechDiagnosticSummaryLines(entries)).toEqual([
      'authority: 上游 authority 绑定 | 身体命中 / 表情未命中 / 动作未命中 / 口型未命中',
      'authority-match: 上游 authority 命中 | 身体命中 / 表情未命中 / 动作未命中 / 口型未命中',
      'authority-mismatch: face-mismatch, motion-mismatch, lipsync-mismatch',
    ])
  })
})
