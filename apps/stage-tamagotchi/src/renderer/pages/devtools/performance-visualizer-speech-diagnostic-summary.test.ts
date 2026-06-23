import { describe, expect, it } from 'vitest'

import {
  buildSpeechDiagnosticSummaryEntries,
  buildSpeechDiagnosticSummaryLines,
} from './performance-visualizer-speech-diagnostic-summary'

describe('performance visualizer speech diagnostic summary', () => {
  it('builds Chinese-first diagnostic entries and technical lines from shared speech evidence', () => {
    const entries = buildSpeechDiagnosticSummaryEntries({
      authorityBindingSummary: 'target=vrm | drivers=face, lipsync | sources=prosody-authority | matches=face:yes motion:no lipsync:yes',
      authorityMatchSummary: 'face:yes motion:no lipsync:yes',
      authorityMismatchSummary: 'motion-mismatch',
      authorityMismatchReasonSummary: '动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情、动作、口型。',
      settleAuthoritySummary: 'authority-bound | segment=segment-zh-1 | target=vrm | drivers=face, lipsync | sources=prosody-authority',
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
      { key: 'authority', label: '权威绑定', value: '目标 VRM，驱动 表情、口型，来源 prosody-authority，命中 表情命中 / 动作未命中 / 口型命中', technicalValue: 'target=vrm | drivers=face, lipsync | sources=prosody-authority | matches=face:yes motion:no lipsync:yes' },
      { key: 'authority-match', label: '绑定命中', value: '表情命中 / 动作未命中 / 口型命中', technicalValue: 'face:yes motion:no lipsync:yes' },
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
      { key: 'settle-authority', label: '稳定段归因', value: 'authority-bound，片段 segment-zh-1，目标 VRM，驱动 表情、口型，来源 prosody-authority', technicalValue: 'authority-bound | segment=segment-zh-1 | target=vrm | drivers=face, lipsync | sources=prosody-authority' },
    ])

    expect(buildSpeechDiagnosticSummaryLines(entries)).toEqual([
      'authority: 目标 VRM，驱动 表情、口型，来源 prosody-authority，命中 表情命中 / 动作未命中 / 口型命中',
      'authority-match: 表情命中 / 动作未命中 / 口型命中',
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
      'settle-authority: authority-bound，片段 segment-zh-1，目标 VRM，驱动 表情、口型，来源 prosody-authority',
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
})
