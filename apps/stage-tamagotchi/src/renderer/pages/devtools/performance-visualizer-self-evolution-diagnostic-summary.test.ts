import { describe, expect, it } from 'vitest'

import {
  buildSelfEvolutionDiagnosticSummaryEntries,
  buildSelfEvolutionDiagnosticSummaryLines,
} from './performance-visualizer-self-evolution-diagnostic-summary'

describe('performance visualizer self evolution diagnostic summary', () => {
  it('builds concise status, persona, proactive and resident entries', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      proactiveDecisionConsumptionSummary: {
        status: 'grounded',
        decisionMode: 'birth-anchored-restraint',
        dominantDrift: null,
        lines: [],
      },
      personaBiasProvenance: {
        status: 'grounded',
        relationshipPosture: 'observer',
        initiativeStyle: 'observant',
        silenceReconnect: 'hold',
        comfortStyle: 'quiet-presence',
        preferredProactiveStyle: 'silent-observe',
        whySummary: 'approved persona evidence',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      proactiveActionChain: {
        status: 'grounded',
        personaPreferredAction: 'hover',
        runtimeSelectedAction: 'hold',
        runtimeShouldSpeak: false,
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      residentPerformanceProjection: {
        status: 'grounded',
        residentSource: 'main-runtime',
        residentEmbodiedPresence: 'attentive',
        residentStance: 'accompany',
        residentEmotionalTension: 'soft-focus',
        residentBaseEmotion: 'thinking',
        residentDelivery: 'gentle',
        residentEmphasis: 1,
        residentReasonTags: [],
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
    })

    expect(entries).toContainEqual({
      key: 'status',
      label: '闭环状态',
      value: '闭环稳定 | 漂移=无',
      technicalValue: 'grounded | drift=none',
    })
    expect(entries).toContainEqual({
      key: 'persona',
      label: '人格基线',
      value: '观察者 | 善于观察 | 静默观察',
      technicalValue: 'observer | observant | silent-observe',
    })
    expect(entries).toContainEqual({
      key: 'proactive',
      label: '主动落点',
      value: '保持 | shouldSpeak=false | 初始锚定克制',
      technicalValue: 'hold | shouldSpeak=false | birth-anchored-restraint',
    })
    expect(entries).toContainEqual({
      key: 'resident',
      label: '驻留投影',
      value: '专注陪伴 | 思考/温和',
      technicalValue: 'attentive/accompany | thinking/gentle',
    })
  })

  it('does not classify retired identityKernel cue strings as persona drift', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      personaBiasProvenance: {
        status: 'drift',
        relationshipPosture: null,
        initiativeStyle: null,
        silenceReconnect: null,
        comfortStyle: null,
        preferredProactiveStyle: null,
        whySummary: null,
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: ['identityKernel.relationshipPosture:observer'],
        reasons: [],
      },
    })

    expect(entries).toContainEqual({
      key: 'status',
      label: '闭环状态',
      value: '闭环漂移 | 漂移=混合',
      technicalValue: 'drift | drift=mixed',
    })
  })

  it('summarizes renderer phase, surface, prosody and five authority lanes', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'live2d',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | source=prosody-authority | segment=segment-7',
        runtimeProfile: 'measured-return',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'rejoin',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focus',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focus',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focus',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: null,
        authorityMismatchSummary: null,
        authorityMismatchDisplay: null,
        matchedSignals: [
          'authority-body:yes',
          'authority-face:yes',
          'authority-voice:yes',
        ],
        missingSignals: [],
        driftingSignals: [
          'authority-motion:no',
          'authority-lipsync:no',
        ],
        reasons: ['ignored free text'],
      },
    })

    expect(entries).toContainEqual({
      key: 'renderer',
      label: '显形权威',
      value: 'Live2D | 身体阶段=renderer-rejoin-without-body | 回接表面=authority:renderer-rejoin:Live2D | 身体命中 / 表情命中 / 动作未命中 / 口型未命中 / 声音命中 | 韵律权威 energy-phoneme-hybrid | 韵律权威',
      technicalValue: 'live2d | bodyPhase=renderer-rejoin-without-body | rejoinSurface=authority:renderer-rejoin:live2d | 身体命中 / 表情命中 / 动作未命中 / 口型未命中 / 声音命中 | mode=energy-phoneme-hybrid | source=prosody-authority | segment=segment-7',
    })
  })

  it('summarizes runtime continuity from phase, surface and lane signals', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      runtimeContinuityProjection: {
        status: 'partial',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech',
        rendererTarget: 'speech',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime projection',
        activeThreadId: 'thread-8',
        activeThreadTitle: 'renderer repair',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'intention-8',
        focusBeliefId: 'belief-8',
        rationaleTags: [],
        traceEmbodimentSummary: null,
        traceEmbodimentDisplaySummary: null,
        matchedSignals: [
          'authority-body:yes',
          'authority-lipsync:yes',
        ],
        missingSignals: [],
        driftingSignals: [
          'authority-face:no',
          'authority-motion:no',
          'authority-voice:no',
        ],
        reasons: ['ignored free text'],
      },
    })

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'thread-8 | 主动对话 | 编码中 | 身体阶段=body-carried-to-renderer-rejoin | 回接表面=authority:renderer-rejoin:speech | 身体命中 / 表情未命中 / 动作未命中 / 口型命中 / 声音未命中',
      technicalValue: 'thread-8 | active-dialogue | coding | bodyPhase=body-carried-to-renderer-rejoin | rejoinSurface=authority:renderer-rejoin:speech | 身体命中 / 表情未命中 / 动作未命中 / 口型命中 / 声音未命中',
    })
  })

  it('keeps renderer drift ownership and repair trace structural', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      rendererAuthorityProjection: {
        status: 'drift',
        rendererTarget: 'vrm',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | source=prosody-authority | segment=segment-9',
        runtimeProfile: 'measured-return',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'rejoin',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focus',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focus',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focus',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: null,
        authorityMismatchSummary: 'motion source differs',
        authorityMismatchDisplay: '动作来源未命中',
        matchedSignals: ['authority-face:yes'],
        missingSignals: [],
        driftingSignals: [
          'renderer-drift:motion-source',
          'authority-motion:no',
        ],
        reasons: [],
      },
      runtimeContinuityProjection: {
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
        governorIntentionId: 'intention-9',
      },
    })

    expect(entries).toContainEqual({
      key: 'drift-start',
      label: '起漂层',
      value: 'renderer | 显形漂移：motion-source',
      technicalValue: 'renderer | renderer-drift:motion-source',
    })
    expect(entries).toContainEqual({
      key: 'repair-owner',
      label: '修复归属',
      layer: 'renderer',
      detail: 'renderer authority',
      bodyContinuityPhase: 'renderer-rejoin-without-body',
      rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
      value: 'renderer | 显形权威',
      technicalValue: 'renderer | renderer authority',
    })
    expect(entries.find(entry => entry.key === 'first-check')?.value).toContain('韵律权威绑定')
    expect(entries.find(entry => entry.key === 'repair-path')?.value).toContain('连续性锚点 intention-9')
  })

  it('keeps execution safety gate diagnostics and line serialization', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      residentPerformanceProjection: {
        status: 'grounded',
        residentSource: 'current-frame',
        residentEmbodiedPresence: 'attentive',
        residentStance: 'accompany',
        residentEmotionalTension: 'measured',
        residentBaseEmotion: 'thinking',
        residentDelivery: 'gentle',
        residentEmphasis: 1,
        residentReasonTags: [
          'execution-safety-gate:blocked-dispatch-restraint',
          'execution-safety-gate:confirmation-required',
          'execution-safety-gate:no-process-started',
        ],
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
    })

    expect(entries).toContainEqual({
      key: 'execution-safety-gate',
      label: '执行安全门',
      value: 'blocked dispatch 已被安全门拦住；需要确认；没有启动进程。',
      technicalValue: 'execution-safety-gate:blocked-dispatch-restraint, execution-safety-gate:confirmation-required, execution-safety-gate:no-process-started',
    })
    expect(buildSelfEvolutionDiagnosticSummaryLines(entries)).toContain(
      'execution-safety-gate: blocked dispatch 已被安全门拦住；需要确认；没有启动进程。',
    )
  })

  it('keeps retired identity kernel drift cues neutral instead of classifying persona structure from text', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      personaBiasProvenance: {
        status: 'drift',
        relationshipPosture: null,
        initiativeStyle: null,
        silenceReconnect: null,
        comfortStyle: null,
        preferredProactiveStyle: null,
        whySummary: null,
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: ['identityKernel.relationshipPosture:observer'],
        reasons: [],
      },
    })

    expect(entries).toContainEqual({
      key: 'status',
      label: '闭环状态',
      value: '闭环漂移 | 漂移=混合',
      technicalValue: 'drift | drift=mixed',
    })
    expect(entries).not.toContainEqual(expect.objectContaining({
      key: 'status',
      value: expect.stringContaining('漂移=人格'),
    }))
  })
})
