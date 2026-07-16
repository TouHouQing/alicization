import { describe, expect, it } from 'vitest'

import {
  buildSelfEvolutionDiagnosticSummaryEntries,
  buildSelfEvolutionDiagnosticSummaryLines,
} from './performance-visualizer-self-evolution-diagnostic-summary'

const legacyNote = '身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断。'

describe('performance visualizer self evolution diagnostic summary', () => {
  it('builds concise continuity-first summary entries for grounded self-evolution evidence', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      proactiveDecisionConsumptionSummary: {
        status: 'grounded',
        decisionMode: 'birth-anchored-restraint',
        dominantDrift: null,
        lines: [
          'decision-consumption: birth observe-first restraint became persona hover and runtime hold',
          'manifestation-consumption: silent-observe | attentive',
          'counterfactual-consumption: selected=hover | tradeoff=presence-before-commentary',
          'rejected-alternative: speak stayed rejected because Current persona bias is observe-first, so speak breaks the preferred restraint posture.',
          'trust-meaning: trust deepens through steadiness before closeness',
        ],
      },
      identityDriftGovernanceSummary: {
        status: 'grounded',
        governanceMode: 'bounded-growth',
        dominantDrift: null,
        lines: [
          'governance: bounded growth is preserving identity',
          'identity-boundary: trust can deepen without violating observe-first room',
          'identity-anchors: host-steadiness | observe-first room',
          'trust-meaning: trust deepens through steadiness before closeness',
          'autobiographical-stability: 0.92 | trajectory=presence restraint',
        ],
      } as any,
      personaBiasProvenance: {
        status: 'grounded',
        relationshipPosture: 'observer',
        initiativeStyle: 'observant',
        silenceReconnect: 'hold',
        comfortStyle: 'quiet-presence',
        preferredProactiveStyle: 'silent-observe',
        openingGuidance: 'Open by observing first and keep the approach lighter.',
        manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
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
        openingGuidance: 'Open by observing first and keep the approach lighter.',
        openingGuidanceHoldReason: 'opening-guidance:observe-first',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      proactiveManifestationChain: {
        status: 'grounded',
        personaPreferredStyle: 'silent-observe',
        personaPreferredPresence: 'attentive',
        counterfactualStyle: 'silent-observe',
        counterfactualPresence: 'attentive',
        actionEcologyStyle: 'silent-observe',
        actionEcologyPresence: 'attentive',
        initiativePreferredStyle: 'silent-observe',
        initiativePreferredPresence: 'attentive',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      privateThoughtGovernanceChain: {
        status: 'grounded',
        privateThoughtStance: 'accompany',
        privateThoughtShouldSpeak: false,
        privateThoughtStyle: 'silent-observe',
        privateThoughtPresence: 'attentive',
        privateThoughtText: '我先不挤进去，只把这条线轻轻挂着。',
        visibleReplyRealizationReason: null,
        visibleReplyBlockedReason: 'opening-guidance:observe-first',
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
        residentEmotionalTension: 'soft-covision',
        residentBaseEmotion: 'thinking',
        residentDelivery: 'gentle',
        residentEmphasis: 1,
        residentReasonTags: [],
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      rendererAuthorityProjection: {
        status: 'grounded',
        rendererTarget: 'vrm',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'tired',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        authorityMismatchSummary: null,
        authorityMismatchDisplay: null,
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-zh-1',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      runtimeContinuityProjection: {
        status: 'grounded',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-rest-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: 'symbiotic-vision',
        transitionToWatchMode: 'recovering',
        transitionFromScenario: 'chat',
        transitionReason: 'host fatigue detected during late-night care',
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-rest-1',
        focusBeliefId: 'belief-rest-1',
        rationaleTags: ['recovering', 'late-night-fatigue'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      baselineAnchorAuditSummary: {
        status: 'grounded',
        lines: [
          'anchor: candidate-active is still the adopted default continuity anchor',
          'trace: snapshot=180 | trace=trace-active | owner=显形权威',
          'prosody-authority: 韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
        ],
      },
    })

    expect(entries).toEqual([
      {
        key: 'status',
        label: '闭环状态',
        value: '闭环稳定 | 漂移=无',
        technicalValue: 'grounded | drift=none',
      },
      {
        key: 'persona',
        label: '人格基线',
        value: '观察者 | 善于观察 | 静默观察',
        technicalValue: 'observer | observant | silent-observe',
      },
      { key: 'manifestation-cadence', label: '显形节奏', value: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.' },
      {
        key: 'manifestation-bridge',
        label: '显形链路',
        value: '人格 静默观察/专注 -> 思绪 静默观察/专注 -> 驻留 专注/陪伴',
        technicalValue: 'persona silent-observe/attentive -> thought silent-observe/attentive -> resident attentive/accompany',
      },
      {
        key: 'proactive',
        label: '主动落点',
        value: '保持 | shouldSpeak=false | 开场指引：先观察 | 初始锚定克制',
        technicalValue: 'hold | shouldSpeak=false | opening-guidance:observe-first | birth-anchored-restraint',
      },
      {
        key: 'resident',
        label: '驻留投影',
        value: '专注陪伴 | 思考/温和',
        technicalValue: 'attentive/accompany | thinking/gentle',
      },
      {
        key: 'renderer',
        label: '显形权威',
        value: 'VRM | 表情命中/动作命中/口型命中 | 韵律权威 energy-phoneme-hybrid | 韵律权威',
        technicalValue: 'vrm | face:yes motion:yes lipsync:yes | mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-zh-1',
      },
      {
        key: 'continuity',
        label: '连续线程',
        value: 'runtime-thread-rest-1 | 主动对话 | 编码中 | 有界成长',
        technicalValue: 'runtime-thread-rest-1 | active-dialogue | coding | bounded-growth',
      },
      {
        key: 'adopted-anchor',
        label: '已采纳锚点',
        value: 'candidate-active | snapshot=180 | owner=显形权威 | 韵律权威已回绑',
        technicalValue: 'candidate-active | snapshot=180 | trace=trace-active | owner=显形权威 | prosody-authority: 韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      },
    ])

    expect(buildSelfEvolutionDiagnosticSummaryLines(entries)).toEqual([
      'status: 闭环稳定 | 漂移=无',
      'persona: 观察者 | 善于观察 | 静默观察',
      'manifestation-cadence: persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
      'manifestation-bridge: 人格 静默观察/专注 -> 思绪 静默观察/专注 -> 驻留 专注/陪伴',
      'proactive: 保持 | shouldSpeak=false | 开场指引：先观察 | 初始锚定克制',
      'resident: 专注陪伴 | 思考/温和',
      'renderer: VRM | 表情命中/动作命中/口型命中 | 韵律权威 energy-phoneme-hybrid | 韵律权威',
      'continuity: runtime-thread-rest-1 | 主动对话 | 编码中 | 有界成长',
      'adopted-anchor: candidate-active | snapshot=180 | owner=显形权威 | 韵律权威已回绑',
    ])
  })

  it('surfaces lane-level renderer authority truth when the authority match summary is descriptive text', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      rendererAuthorityProjection: {
        status: 'drift',
        rendererTarget: 'vrm',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'tired',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: '上游 authority 命中',
        authorityMismatchSummary: 'face-mismatch, lipsync-mismatch',
        authorityMismatchDisplay: '上游 authority 漂移展示',
        matchedSignals: ['authority-face:yes'],
        missingSignals: [],
        driftingSignals: ['authority-motion:no'],
        reasons: [],
      },
    })

    expect(entries).toEqual([
      {
        key: 'status',
        label: '闭环状态',
        value: '闭环漂移 | 漂移=显形',
        technicalValue: 'drift | drift=renderer',
      },
      {
        key: 'renderer',
        label: '显形权威',
        value: 'VRM | 上游 authority 命中 | 表情命中 / 动作未命中 / 口型未知',
        technicalValue: 'vrm | 上游 authority 命中 | 表情命中 / 动作未命中 / 口型未知',
      },
      {
        key: 'dominant-drift',
        label: '主漂移',
        value: '权威漂移：上游 authority 漂移展示',
        technicalValue: 'authority-mismatch:上游 authority 漂移展示',
      },
    ])
  })

  it('surfaces voice as part of renderer authority truth in the top-level renderer summary', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'vrm',
        runtimeProfile: 'measured-return',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'same-thread-continuation',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'soft-gaze',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'soft-gaze',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'soft-gaze',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: '上游 authority 命中',
        authorityMismatchSummary: null,
        authorityMismatchDisplay: null,
        matchedSignals: [
          'authority-lipsync:yes',
          'authority-voice:yes',
        ],
        missingSignals: [],
        driftingSignals: ['authority-face:no', 'authority-motion:no'],
        reasons: [],
      },
    })

    expect(entries).toContainEqual({
      key: 'renderer',
      label: '显形权威',
      value: 'VRM | 上游 authority 命中 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中',
      technicalValue: 'vrm | 上游 authority 命中 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中',
    })
  })

  it('keeps remaining-open lipsync and voice carry visible in the top-level renderer summary when body face and motion already rejoin on one segment', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'live2d',
        runtimeProfile: 'measured-return',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'same-thread-continuation',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'soft-gaze',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'soft-gaze',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'soft-gaze',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'body:yes face:yes motion:yes lipsync:no',
        authorityMismatchSummary: null,
        authorityMismatchDisplay: null,
        matchedSignals: [
          'authority-body:yes',
          'authority-face:yes',
          'authority-motion:yes',
          'remaining-open=lipsync+voice',
        ],
        missingSignals: [],
        driftingSignals: ['authority-lipsync:no'],
        reasons: [],
      },
    })

    expect(entries).toContainEqual({
      key: 'renderer',
      label: '显形权威',
      value: 'Live2D | 当前仅剩身体、表情、动作维持同一段连续性，口型和声音还没有重新并回这一段',
      technicalValue: 'live2d | body:yes face:yes motion:yes lipsync:no | 当前仅剩身体、表情、动作维持同一段连续性，口型和声音还没有重新并回这一段',
    })
  })

  it('keeps remaining-open body and lipsync carry visible in the top-level renderer summary when face motion and voice are the surviving identity-continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'live2d',
        runtimeProfile: 'measured-return',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'same-thread-continuation',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'soft-gaze',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'soft-gaze',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'soft-gaze',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'body:no face:yes motion:yes lipsync:no',
        authorityMismatchSummary: null,
        authorityMismatchDisplay: null,
        matchedSignals: [
          'authority-face:yes',
          'authority-motion:yes',
          'authority-voice:yes',
          'lane=face+motion+voice-only',
          'remaining-open=body+lipsync',
        ],
        missingSignals: [],
        driftingSignals: ['authority-body:no', 'authority-lipsync:no'],
        reasons: [],
      },
    })

    expect(entries).toContainEqual({
      key: 'renderer',
      label: '显形权威',
      value: 'Live2D | 当前仅剩表情、动作、声音维持同一段连续性，身体和口型还没有重新并回这一段',
      technicalValue: 'live2d | body:no face:yes motion:yes lipsync:no | 当前仅剩表情、动作、声音维持同一段连续性，身体和口型还没有重新并回这一段',
    })
  })

  it('does not stop building later summary entries when renderer projection is present but collapses to an empty display value', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: '   ',
        runtimeProfile: 'measured-return',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'same-thread-continuation',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: null,
        runtimeResidentActionCue: null,
        playbackCueFacialCue: null,
        playbackCueActionCue: null,
        driverFaceCue: null,
        driverActionCue: null,
        authorityMatchSummary: null,
        authorityMismatchSummary: null,
        authorityMismatchDisplay: null,
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      runtimeContinuityProjection: {
        status: 'partial',
        rendererTarget: 'vrm',
        runtimeChannel: 'resident',
        runtimeSummary: null,
        activeThreadId: 'thread-7',
        activeThreadTitle: null,
        runtimeScenario: 'same-her-return',
        runtimeScene: null,
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: null,
        governorIntentionId: null,
        focusBeliefId: null,
        rationaleTags: [],
        traceEmbodimentSummary: null,
        traceEmbodimentDisplaySummary: null,
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
    })

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'thread-7 | resident | same-her-return',
    })
  })

  it('surfaces runtime continuity lane truth when same-her authority stays descriptive upstream', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'boundary-violation',
        dominantDrift: 'authority-motion:no',
        lines: [
          'governance: growth crossed persona boundary',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-rest-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-rest-1',
        focusBeliefId: 'belief-rest-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-rest-1',
          'runtime-scenario:coding',
          'authority-face:yes',
        ],
        missingSignals: [],
        driftingSignals: ['authority-motion:no'],
        reasons: [
          'Renderer authority continuity still keeps 表情命中 / 动作未命中 / 口型未知 on the same life thread, so runtime continuity can explain which embodiment lane stayed bound and which one drifted without collapsing the whole digital-life thread into a fake identity break.',
        ],
      },
    })

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-rest-1 | 主动对话 | 编码中 | 边界越线 | 表情命中 / 动作未命中 / 口型未知',
      technicalValue: 'runtime-thread-rest-1 | active-dialogue | coding | boundary-violation | 表情命中 / 动作未命中 / 口型未知',
    })
    expect(buildSelfEvolutionDiagnosticSummaryLines(entries)).toContain(
      'continuity: runtime-thread-rest-1 | 主动对话 | 编码中 | 边界越线 | 表情命中 / 动作未命中 / 口型未知',
    )
  })

  it('translates lane-only identity-continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'boundary-violation',
        dominantDrift: 'authority-motion:no',
        lines: [
          'governance: growth crossed persona boundary',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-lane-only-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-lane-only-1',
        focusBeliefId: 'belief-lane-only-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-lane-only-1',
          'runtime-scenario:coding',
          'authority-face:no',
          'authority-motion:no',
          'authority-lipsync:yes',
          'lane=lipsync-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-motion:no'],
        reasons: [
          'Renderer authority continuity now explicitly shows lane=lipsync-only, so higher-level continuity summary should acknowledge that only one embodiment lane is still carrying the identity-continuity',
        ],
      },
    })

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-lane-only-1 | 主动对话 | 编码中 | 边界越线 | 当前仅剩口型维持同一段连续性',
      technicalValue: 'runtime-thread-lane-only-1 | active-dialogue | coding | boundary-violation | 当前仅剩口型维持同一段连续性',
    })
  })

  it('keeps quieter face+lipsync identity-continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'boundary-violation',
        dominantDrift: 'authority-body:no',
        lines: [
          'governance: growth crossed persona boundary',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'same line still held',
        activeThreadId: 'runtime-thread-face-lipsync-summary-1',
        activeThreadTitle: 'quiet visible carry',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-face-lipsync-summary-1',
        focusBeliefId: 'belief-face-lipsync-summary-1',
        rationaleTags: ['recovering', 'quiet-visible-carry'],
        traceEmbodimentSummary: null,
        traceEmbodimentDisplaySummary: null,
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-face-lipsync-summary-1',
          'runtime-scenario:coding',
          'authority-face:yes',
          'authority-lipsync:yes',
          'lane=face+lipsync-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-body:no', 'authority-motion:no'],
        reasons: [
          'Renderer authority continuity still says the quieter face+lipsync carry is the surviving visible identity-continuity',
        ],
      },
    })

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-face-lipsync-summary-1 | 主动对话 | 编码中 | 边界越线 | 当前只有 face 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线',
      technicalValue: 'runtime-thread-face-lipsync-summary-1 | active-dialogue | coding | boundary-violation | 当前只有 face 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线',
    })
  })

  it('keeps quieter motion+lipsync identity-continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'boundary-violation',
        dominantDrift: 'authority-body:no',
        lines: [
          'governance: growth crossed persona boundary',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'same line still held',
        activeThreadId: 'runtime-thread-motion-lipsync-summary-1',
        activeThreadTitle: 'quiet visible carry',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-motion-lipsync-summary-1',
        focusBeliefId: 'belief-motion-lipsync-summary-1',
        rationaleTags: ['recovering', 'quiet-visible-carry'],
        traceEmbodimentSummary: null,
        traceEmbodimentDisplaySummary: null,
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-motion-lipsync-summary-1',
          'runtime-scenario:coding',
          'authority-motion:yes',
          'authority-lipsync:yes',
          'lane=motion+lipsync-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-body:no', 'authority-face:no'],
        reasons: [
          'Renderer authority continuity still says the quieter motion+lipsync carry is the surviving visible identity-continuity',
        ],
      },
    })

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-motion-lipsync-summary-1 | 主动对话 | 编码中 | 边界越线 | 当前只有 motion 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线',
      technicalValue: 'runtime-thread-motion-lipsync-summary-1 | active-dialogue | coding | boundary-violation | 当前只有 motion 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线',
    })
  })

  it('keeps quieter face+lipsync+voice identity-continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'boundary-violation',
        dominantDrift: 'authority-body:no',
        lines: [
          'governance: growth crossed persona boundary',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'same line still held',
        activeThreadId: 'runtime-thread-face-lipsync-voice-summary-1',
        activeThreadTitle: 'quiet visible carry',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-face-lipsync-voice-summary-1',
        focusBeliefId: 'belief-face-lipsync-voice-summary-1',
        rationaleTags: ['recovering', 'quiet-visible-carry'],
        traceEmbodimentSummary: null,
        traceEmbodimentDisplaySummary: null,
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-face-lipsync-voice-summary-1',
          'runtime-scenario:coding',
          'authority-face:yes',
          'authority-lipsync:yes',
          'authority-voice:yes',
          'lane=face+lipsync+voice-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-body:no', 'authority-motion:no'],
        reasons: [
          'Renderer authority continuity still says the quieter face+lipsync+voice carry is the surviving visible identity-continuity',
        ],
      },
    })

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-face-lipsync-voice-summary-1 | 主动对话 | 编码中 | 边界越线 | 当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
      technicalValue: 'runtime-thread-face-lipsync-voice-summary-1 | active-dialogue | coding | boundary-violation | 当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
    })
  })

  it('keeps quieter motion+lipsync+voice identity-continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'boundary-violation',
        dominantDrift: 'authority-body:no',
        lines: [
          'governance: growth crossed persona boundary',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'same line still held',
        activeThreadId: 'runtime-thread-motion-lipsync-voice-summary-1',
        activeThreadTitle: 'quiet visible carry',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-motion-lipsync-voice-summary-1',
        focusBeliefId: 'belief-motion-lipsync-voice-summary-1',
        rationaleTags: ['recovering', 'quiet-visible-carry'],
        traceEmbodimentSummary: null,
        traceEmbodimentDisplaySummary: null,
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-motion-lipsync-voice-summary-1',
          'runtime-scenario:coding',
          'authority-motion:yes',
          'authority-lipsync:yes',
          'authority-voice:yes',
          'lane=motion+lipsync+voice-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-body:no', 'authority-face:no'],
        reasons: [
          'Renderer authority continuity still says the quieter motion+lipsync+voice carry is the surviving visible identity-continuity',
        ],
      },
    })

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-motion-lipsync-voice-summary-1 | 主动对话 | 编码中 | 边界越线 | 当前仅剩动作、口型、声音维持同一段连续性，可见 identity-continuity',
      technicalValue: 'runtime-thread-motion-lipsync-voice-summary-1 | active-dialogue | coding | boundary-violation | 当前仅剩动作、口型、声音维持同一段连续性，可见 identity-continuity',
    })
  })

  it('does not hide voice authority drift behind a lipsync-only continuity shortcut', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'boundary-violation',
        dominantDrift: 'authority-voice:no',
        lines: [
          'governance: voice left the living segment',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-voice-drift-1',
        activeThreadTitle: 'voice drift recovery',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-voice-drift-1',
        focusBeliefId: 'belief-voice-drift-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-voice-drift-1',
          'runtime-scenario:coding',
          'authority-lipsync:yes',
          'lane=lipsync-only',
        ],
        missingSignals: [],
        driftingSignals: [
          'authority-face:no',
          'authority-motion:no',
          'authority-voice:no',
        ],
        reasons: [
          'Voice authority no longer belongs to the same living segment, so the visible continuity summary must not collapse it into lipsync-only carry.',
        ],
      },
    })

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-voice-drift-1 | 主动对话 | 编码中 | 边界越线 | 表情未命中 / 动作未命中 / 口型命中 / 声音未命中',
      technicalValue: 'runtime-thread-voice-drift-1 | active-dialogue | coding | boundary-violation | 表情未命中 / 动作未命中 / 口型命中 / 声音未命中',
    })
  })

  it('surfaces remembered-familiarity identity-continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      proactiveDecisionConsumptionSummary: {
        status: 'grounded',
        decisionMode: 'birth-anchored-restraint',
        dominantDrift: null,
        lines: [
          'decision-consumption: birth observe-first restraint became persona hover and runtime hold',
          'memory-familiarity-restraint: remembered familiarity stayed memory-first before visible closeness widened',
        ],
      },
      candidateTrajectorySummary: {
        status: 'grounded',
        trajectoryLabel: 'observe-first',
        dominantDrift: null,
        lines: [
          'remembered-familiarity-trajectory: familiarity is staying memory-first while the same-her room holds',
        ],
      },
      identityDriftGovernanceSummary: {
        status: 'grounded',
        governanceMode: 'bounded-growth',
        dominantDrift: null,
        lines: [
          'remembered-familiarity-governance: familiarity stayed in memory first, so growth did not widen visible closeness past the same-her room',
        ],
      } as any,
      personaBiasProvenance: {
        status: 'grounded',
        relationshipPosture: 'observer',
        initiativeStyle: 'observant',
        silenceReconnect: 'hold',
        comfortStyle: 'quiet-presence',
        preferredProactiveStyle: 'silent-observe',
        openingGuidance: 'Open by observing first and keep the approach lighter.',
        manifestationCadenceSummary: null,
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
        openingGuidance: 'Open by observing first and keep the approach lighter.',
        openingGuidanceHoldReason: 'opening-guidance:observe-first',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      proactiveManifestationChain: {
        status: 'grounded',
        personaPreferredStyle: 'silent-observe',
        personaPreferredPresence: 'attentive',
        counterfactualStyle: 'silent-observe',
        counterfactualPresence: 'attentive',
        actionEcologyStyle: 'silent-observe',
        actionEcologyPresence: 'attentive',
        initiativePreferredStyle: 'silent-observe',
        initiativePreferredPresence: 'attentive',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      privateThoughtGovernanceChain: {
        status: 'grounded',
        privateThoughtStance: 'accompany',
        privateThoughtShouldSpeak: false,
        privateThoughtStyle: 'silent-observe',
        privateThoughtPresence: 'attentive',
        privateThoughtText: '我先不挤进去，只把这条线轻轻挂着。',
        visibleReplyRealizationReason: null,
        visibleReplyBlockedReason: 'opening-guidance:observe-first',
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
        residentEmotionalTension: 'soft-covision',
        residentBaseEmotion: 'thinking',
        residentDelivery: 'gentle',
        residentEmphasis: 1,
        residentReasonTags: [],
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      rendererAuthorityProjection: {
        status: 'grounded',
        rendererTarget: 'vrm',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'tired',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        authorityMismatchSummary: null,
        authorityMismatchDisplay: null,
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      runtimeContinuityProjection: {
        status: 'grounded',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-rest-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: 'symbiotic-vision',
        transitionToWatchMode: 'recovering',
        transitionFromScenario: 'chat',
        transitionReason: 'host fatigue detected during late-night care',
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-rest-1',
        focusBeliefId: 'belief-rest-1',
        rationaleTags: ['recovering', 'late-night-fatigue'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
    })

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-rest-1 | 主动对话 | 编码中 | 有界成长 | 熟悉感记忆先行',
      technicalValue: 'runtime-thread-rest-1 | active-dialogue | coding | bounded-growth | remembered-familiarity-memory-first',
    })

    expect(buildSelfEvolutionDiagnosticSummaryLines(entries)).toContain(
      'continuity: runtime-thread-rest-1 | 主动对话 | 编码中 | 有界成长 | 熟悉感记忆先行',
    )
  })

  it('treats same-segment cue-bridge recollection as one recovered body line instead of reporting lipsync-only continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'speech',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-cue-bridge-realign-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-cue-bridge-realign-1',
        focusBeliefId: 'belief-cue-bridge-realign-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-cue-bridge-realign-1',
          'runtime-scenario:coding',
          'authority-face:no',
          'authority-motion:no',
          'authority-lipsync:yes',
          'lane=lipsync-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-motion:no'],
        reasons: [
          'Speech observability already shows cue-bridge same-segment realignment as unified authority, so higher-level continuity summary should keep that one recovered measured-return body line instead of reporting lipsync-only drift.',
        ],
      },
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-cue-bridge-realign-1 | 主动对话 | 编码中 | 同段 cue-bridge 回收后，speech 显形已重新并回同一条连续身体线',
      technicalValue: 'runtime-thread-cue-bridge-realign-1 | active-dialogue | coding | 同段 cue-bridge 回收后，speech 显形已重新并回同一条连续身体线',
    })
  })

  it('keeps a thin measured-return identity-continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-thin-measured-return-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-thin-measured-return-1',
        focusBeliefId: 'belief-thin-measured-return-1',
        rationaleTags: ['recovering', 'same-thread-continuation'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-thin-measured-return-1',
          'runtime-scenario:coding',
          'authority-face:no',
          'authority-motion:no',
          'authority-lipsync:yes',
          'lane=lipsync-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-motion:no'],
        reasons: [
          'Only runtime digest plus spine still expose the noisy-detour continuity line, so higher-level continuity should keep this thinner measured-return identity-continuity',
        ],
      },
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-thin-measured-return-1 | 主动对话 | 编码中 | 噪声 detour 后，这条 measured-return 连续身体线仍由较薄证据维持',
      technicalValue: 'runtime-thread-thin-measured-return-1 | active-dialogue | coding | 噪声 detour 后，这条 measured-return 连续身体线仍由较薄证据维持',
    })
  })

  it('keeps body-led identity-continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'vrm',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-body-led-summary-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-body-led-summary-1',
        focusBeliefId: 'belief-body-led-summary-1',
        rationaleTags: ['recovering', 'same-thread-continuation'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-body-led-summary-1',
          'runtime-scenario:coding',
          'authority-body:yes',
        ],
        missingSignals: [],
        driftingSignals: ['authority-face:no', 'authority-motion:no'],
        reasons: [
          'Renderer authority projection already shows body-led identity-continuity',
        ],
      },
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-body-led-summary-1 | 主动对话 | 编码中 | 身体线已经先把这段 living segment 托住，VRM 显形仍在补回同一条连续身体线',
      technicalValue: 'runtime-thread-body-led-summary-1 | active-dialogue | coding | 身体线已经先把这段 living segment 托住，VRM 显形仍在补回同一条连续身体线',
    })
  })

  it('does not hide voice authority drift behind body-led identity-continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'vrm',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-body-led-voice-drift-1',
        activeThreadTitle: 'voice drift recovery',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-body-led-voice-drift-1',
        focusBeliefId: 'belief-body-led-voice-drift-1',
        rationaleTags: ['recovering', 'same-thread-continuation'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-body-led-voice-drift-1',
          'runtime-scenario:coding',
          'authority-body:yes',
          'authority-lipsync:yes',
          'lane=body+lipsync-only',
        ],
        missingSignals: [],
        driftingSignals: [
          'authority-face:no',
          'authority-motion:no',
          'authority-voice:no',
        ],
        reasons: [
          'Body continuity still carries the same living segment while VRM manifestation rejoins it, but voice authority has left the living segment and must stay visible.',
        ],
      },
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-body-led-voice-drift-1 | 主动对话 | 编码中 | 表情未命中 / 动作未命中 / 口型命中 / 声音未命中',
      technicalValue: 'runtime-thread-body-led-voice-drift-1 | active-dialogue | coding | 表情未命中 / 动作未命中 / 口型命中 / 声音未命中',
    })
  })

  it('keeps audible body-carried identity-continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'vrm',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'same line still held',
        activeThreadId: 'runtime-thread-audible-body-diagnostic-1',
        activeThreadTitle: 'callback afterglow',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-audible-body-diagnostic-1',
        focusBeliefId: 'belief-audible-body-diagnostic-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-audible-body-diagnostic-1',
          'authority-body:yes',
          'authority-lipsync:yes',
          'authority-voice:yes',
          'lane=body+lipsync+voice-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-face:no', 'authority-motion:no'],
        reasons: [
          'Body continuity still carries the same living segment while VRM manifestation rejoins it, so runtime continuity can explain the renderer recovery as the same digital life re-entering full embodiment instead of a new identity branch.',
          'Renderer authority continuity still keeps 表情未命中 / 动作未命中 / 口型命中 / 声音命中 on the same life thread, so runtime continuity can explain which embodiment lane stayed bound and which one drifted without collapsing the whole digital-life thread into a fake identity break.',
        ],
      },
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-audible-body-diagnostic-1 | 主动对话 | 编码中 | 身体线已经先把这段 living segment 托住，VRM 显形仍在补回同一条连续身体线',
      technicalValue: 'runtime-thread-audible-body-diagnostic-1 | active-dialogue | coding | 身体线已经先把这段 living segment 托住，VRM 显形仍在补回同一条连续身体线',
    })
  })

  it('keeps cross-modal-lock continuity visible when reasons already make the same-segment lock explicit even if structured phase metadata is still missing', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      runtimeContinuityProjection: {
        status: 'partial',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-lock-summary-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-lock-summary-1',
        focusBeliefId: 'belief-lock-summary-1',
        rationaleTags: ['continuity'],
        traceEmbodimentSummary: null,
        traceEmbodimentDisplaySummary: null,
        matchedSignals: ['authority-body:yes'],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          '身体连续性已经明确处于跨模态重锁态，显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
        ],
      },
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-lock-summary-1 | 主动对话 | 编码中 | 身体线与显形权威已经共同锁回同一段 living segment',
      technicalValue: 'runtime-thread-lock-summary-1 | active-dialogue | coding | 身体线与显形权威已经共同锁回同一段 living segment',
    })
  })

  it('translates body-only identity-continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'boundary-violation',
        dominantDrift: 'authority-face:no',
        lines: [
          'governance: growth crossed persona boundary',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-body-only-1',
        activeThreadTitle: 'body seam carry',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-body-only-1',
        focusBeliefId: 'belief-body-only-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-body-only-1',
          'runtime-scenario:coding',
          'authority-body:yes',
          'authority-face:no',
          'authority-motion:no',
          'lane=body-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-face:no', 'authority-motion:no'],
        reasons: [
          'Renderer authority continuity now explicitly shows lane=body-only, so higher-level continuity summary should acknowledge that only body is still carrying the identity-continuity',
        ],
      },
    })

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-body-only-1 | 主动对话 | 编码中 | 边界越线 | 当前仅剩身体维持同一段连续性',
      technicalValue: 'runtime-thread-body-only-1 | active-dialogue | coding | boundary-violation | 当前仅剩身体维持同一段连续性',
    })
  })

  it('translates lipsync-plus-voice identity-continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'boundary-violation',
        dominantDrift: 'authority-motion:no',
        lines: [
          'governance: growth crossed persona boundary',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-lipsync-voice-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-lipsync-voice-1',
        focusBeliefId: 'belief-lipsync-voice-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-lipsync-voice-1',
          'runtime-scenario:coding',
          'authority-face:no',
          'authority-motion:no',
          'authority-lipsync:yes',
          'authority-voice:yes',
          'lane=lipsync+voice-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-motion:no'],
        reasons: [
          'Renderer authority continuity now explicitly shows lane=lipsync+voice-only, so higher-level continuity summary should acknowledge that voice and lipsync are still carrying the identity-continuity',
        ],
      },
    })

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-lipsync-voice-1 | 主动对话 | 编码中 | 边界越线 | 当前仅剩口型、声音维持同一段连续性',
      technicalValue: 'runtime-thread-lipsync-voice-1 | active-dialogue | coding | boundary-violation | 当前仅剩口型、声音维持同一段连续性',
    })
  })

  it('translates body-plus-lipsync-plus-voice identity-continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'boundary-violation',
        dominantDrift: 'authority-face:no',
        lines: [
          'governance: growth crossed persona boundary',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-body-lipsync-voice-1',
        activeThreadTitle: 'callback recovery',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-body-lipsync-voice-1',
        focusBeliefId: 'belief-body-lipsync-voice-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-body-lipsync-voice-1',
          'runtime-scenario:coding',
          'authority-body:yes',
          'authority-face:no',
          'authority-motion:no',
          'authority-lipsync:yes',
          'authority-voice:yes',
          'lane=body+lipsync+voice-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-face:no', 'authority-motion:no'],
        reasons: [
          'Renderer authority continuity now explicitly shows lane=body+lipsync+voice-only, so higher-level continuity summary should acknowledge that body, voice, and lipsync are still carrying the identity-continuity',
        ],
      },
    })

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-body-lipsync-voice-1 | 主动对话 | 编码中 | 边界越线 | 当前仅剩身体、口型、声音维持同一段连续性',
      technicalValue: 'runtime-thread-body-lipsync-voice-1 | active-dialogue | coding | boundary-violation | 当前仅剩身体、口型、声音维持同一段连续性',
    })
  })

  it('translates body-plus-voice identity-continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'boundary-violation',
        dominantDrift: 'authority-face:no',
        lines: [
          'governance: growth crossed persona boundary',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-body-voice-1',
        activeThreadTitle: 'callback recovery',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-body-voice-1',
        focusBeliefId: 'belief-body-voice-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-body-voice-1',
          'runtime-scenario:coding',
          'authority-body:yes',
          'authority-face:no',
          'authority-motion:no',
          'authority-lipsync:no',
          'authority-voice:yes',
          'lane=body+voice-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-face:no', 'authority-motion:no', 'authority-lipsync:no'],
        reasons: [
          'Renderer authority continuity now explicitly shows lane=body+voice-only, so higher-level continuity summary should acknowledge that body and voice are still carrying the identity-continuity',
        ],
      },
    })

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-body-voice-1 | 主动对话 | 编码中 | 边界越线 | 当前仅剩身体、声音维持同一段连续性',
      technicalValue: 'runtime-thread-body-voice-1 | active-dialogue | coding | boundary-violation | 当前仅剩身体、声音维持同一段连续性',
    })
  })

  it('translates body-plus-lipsync identity-continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'boundary-violation',
        dominantDrift: 'authority-face:no',
        lines: [
          'governance: growth crossed persona boundary',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-body-lipsync-1',
        activeThreadTitle: 'callback recovery',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-body-lipsync-1',
        focusBeliefId: 'belief-body-lipsync-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-body-lipsync-1',
          'runtime-scenario:coding',
          'authority-body:yes',
          'authority-face:no',
          'authority-motion:no',
          'authority-lipsync:yes',
          'lane=body+lipsync-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-face:no', 'authority-motion:no'],
        reasons: [
          'Renderer authority continuity now explicitly shows lane=body+lipsync-only, so higher-level continuity summary should acknowledge that body and lipsync are still carrying the identity-continuity',
        ],
      },
    })

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-body-lipsync-1 | 主动对话 | 编码中 | 边界越线 | 当前仅剩身体、口型维持同一段连续性',
      technicalValue: 'runtime-thread-body-lipsync-1 | active-dialogue | coding | boundary-violation | 当前仅剩身体、口型维持同一段连续性',
    })
  })

  it('translates body-face-motion continuity with remaining-open lipsync voice carry in the higher-level continuity summary', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'boundary-violation',
        dominantDrift: 'authority-lipsync:no',
        lines: [
          'governance: growth crossed persona boundary',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-body-face-motion-open-1',
        activeThreadTitle: 'callback recovery',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-body-face-motion-open-1',
        focusBeliefId: 'belief-body-face-motion-open-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-body-face-motion-open-1',
          'runtime-scenario:coding',
          'authority-body:yes',
          'authority-face:yes',
          'authority-motion:yes',
          'remaining-open=lipsync+voice',
        ],
        missingSignals: [],
        driftingSignals: ['authority-lipsync:no'],
        reasons: [
          'Renderer authority continuity now explicitly keeps remaining-open=lipsync+voice visible, so higher-level continuity summary should acknowledge that body face and motion have rejoined while lipsync and voice still remain open on the same living segment.',
        ],
      },
    })

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-body-face-motion-open-1 | 主动对话 | 编码中 | 边界越线 | 当前仅剩身体、表情、动作维持同一段连续性，口型和声音还没有重新并回这一段',
      technicalValue: 'runtime-thread-body-face-motion-open-1 | active-dialogue | coding | boundary-violation | 当前仅剩身体、表情、动作维持同一段连续性，口型和声音还没有重新并回这一段',
    })
  })

  it('translates face-motion-voice continuity with remaining-open body and lipsync carry in the higher-level continuity summary', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'boundary-violation',
        dominantDrift: 'authority-body:no',
        lines: [
          'governance: growth crossed persona boundary',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-face-motion-voice-open-1',
        activeThreadTitle: 'callback recovery',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-face-motion-voice-open-1',
        focusBeliefId: 'belief-face-motion-voice-open-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-face-motion-voice-open-1',
          'runtime-scenario:coding',
          'authority-face:yes',
          'authority-motion:yes',
          'authority-voice:yes',
          'lane=face+motion+voice-only',
          'remaining-open=body+lipsync',
        ],
        missingSignals: [],
        driftingSignals: ['authority-body:no', 'authority-lipsync:no'],
        reasons: [
          'Renderer authority continuity now explicitly keeps remaining-open=body+lipsync visible, so higher-level continuity summary should acknowledge that face motion and voice have rejoined while body and lipsync still remain open on the same living segment.',
        ],
      },
    })

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-face-motion-voice-open-1 | 主动对话 | 编码中 | 边界越线 | 当前仅剩表情、动作、声音维持同一段连续性，身体和口型还没有重新并回这一段',
      technicalValue: 'runtime-thread-face-motion-voice-open-1 | active-dialogue | coding | boundary-violation | 当前仅剩表情、动作、声音维持同一段连续性，身体和口型还没有重新并回这一段',
    })
  })

  it('keeps repair-before-closeness continuity visible instead of collapsing it into generic lipsync-only continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-repair-before-closeness-1',
        activeThreadTitle: 'repair cooldown carry',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-repair-before-closeness-1',
        focusBeliefId: 'belief-repair-before-closeness-1',
        rationaleTags: ['repair-cooldown', 'same-thread-continuation'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-repair-before-closeness-1',
          'runtime-scenario:coding',
          'authority-face:no',
          'authority-motion:no',
          'authority-lipsync:yes',
          'lane=lipsync-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-motion:no'],
        reasons: [
          'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。',
        ],
      },
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-repair-before-closeness-1 | 主动对话 | 编码中 | repair-before-closeness 仍停在修补线里，先守住 quieter blink / softened gaze',
      technicalValue: 'runtime-thread-repair-before-closeness-1 | active-dialogue | coding | repair-before-closeness 仍停在修补线里，先守住 quieter blink / softened gaze',
    })
  })

  it('surfaces project-state continuity drift in the top-level diagnostic summary when internalization is still blocked by project identity, phase, and open loops', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      internalizationReadinessSummary: {
        status: 'partial',
        lines: [
          'identity-continuity',
          'Project identity carry is still weak, so she is not yet holding what this project is and who she is becoming with enough stability to internalize the patch.',
          'Phase 1 route carry is still weak, so the runtime may drift away from local digital life priorities instead of protecting the same-her roadmap.',
          'Unresolved closure carry is still weak, so unresolved project loops are not being carried forward reliably enough for durable identity-continuity',
        ],
      },
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-project-1',
        activeThreadTitle: 'alicization project carry',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-project-1',
        focusBeliefId: 'belief-project-1',
        rationaleTags: ['project-state-carry'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-project-1',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Runtime continuity is still carrying the local continuity state, but project-state continuity remains too weak to internalize safely.',
        ],
      },
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'bounded-growth',
        dominantDrift: 'project-state-continuity-drift',
        lines: [
          'governance: bounded growth is still the intended continuity frame',
        ],
      } as any,
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-project-1 | 主动对话 | 编码中 | 有界成长 | project-state-continuity-drift',
      technicalValue: 'runtime-thread-project-1 | active-dialogue | coding | bounded-growth | project-state-continuity-drift',
    })
    expect(buildSelfEvolutionDiagnosticSummaryLines(entries)).toContain(
      'continuity: runtime-thread-project-1 | 主动对话 | 编码中 | 有界成长 | project-state-continuity-drift',
    )
  })

  it('keeps repair-before-closeness continuity visible even when project-state carry is still drifting', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      internalizationReadinessSummary: {
        status: 'partial',
        lines: [
          'identity-continuity',
          'Project identity carry is still weak, so she is not yet holding what this project is and who she is becoming with enough stability to internalize the patch.',
          'Phase 1 route carry is still weak, so the runtime may drift away from local digital life priorities instead of protecting the same-her roadmap.',
          'Unresolved closure carry is still weak, so unresolved project loops are not being carried forward reliably enough for durable identity-continuity',
        ],
      },
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-project-repair-1',
        activeThreadTitle: 'project repair carry',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-project-repair-1',
        focusBeliefId: 'belief-project-repair-1',
        rationaleTags: ['project-state-carry', 'repair-cooldown'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-project-repair-1',
          'runtime-scenario:coding',
          'authority-face:no',
          'authority-motion:no',
          'authority-lipsync:yes',
          'lane=lipsync-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-motion:no'],
        reasons: [
          'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。',
          'Runtime continuity is still carrying the local continuity state, but project-state continuity remains too weak to internalize safely.',
        ],
      },
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'bounded-growth',
        dominantDrift: 'project-state-continuity-drift',
        lines: [
          'governance: bounded growth is still the intended continuity frame',
        ],
      } as any,
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-project-repair-1 | 主动对话 | 编码中 | 有界成长 | project-state-continuity-drift | repair-before-closeness 仍停在修补线里，先守住 quieter blink / softened gaze',
      technicalValue: 'runtime-thread-project-repair-1 | active-dialogue | coding | bounded-growth | project-state-continuity-drift | repair-before-closeness 仍停在修补线里，先守住 quieter blink / softened gaze',
    })
  })

  it('treats pre-dialogue briefing drift as a continuity drift so project-state repair stays the triage owner', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      preDialogueBriefingSummary: {
        status: 'partial',
        lines: [
          'briefing=drift=preDialogueBriefingDrift | fullyBriefed=0.33 (1/3)',
          'Pre-dialogue self briefing currently reads drift=preDialogueBriefingDrift | fullyBriefed=0.33 (1/3), so the next turn should check whether identity, phase, landed progress, open loop, and next closure are still arriving as one stable self brief.',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-briefing-1',
        activeThreadTitle: 'briefing carry',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-briefing-1',
        focusBeliefId: 'belief-briefing-1',
        rationaleTags: ['pre-dialogue-briefing'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-briefing-1',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Runtime continuity is still carrying the local continuity state, but the self briefing is no longer arriving as one stable carry.',
        ],
      },
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'bounded-growth',
        dominantDrift: 'project-state-continuity-drift',
        lines: [
          'governance: bounded growth is still the intended continuity frame',
        ],
      } as any,
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-briefing-1 | 主动对话 | 编码中 | 有界成长 | project-state-continuity-drift',
      technicalValue: 'runtime-thread-briefing-1 | active-dialogue | coding | bounded-growth | project-state-continuity-drift',
    })
  })

  it('surfaces project identity, Phase 1 route, and unresolved closure carry as one readable continuity line when pre-dialogue briefing drift is still open', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      preDialogueBriefingSummary: {
        status: 'partial',
        lines: [
          'briefing=drift=preDialogueBriefingDrift | fullyBriefed=0.33 (1/3)',
          'Project identity-continuity',
          'Primary open life loop still centers on renderer continuity observation 还没把项目身份、Phase 1 主线和未闭环项并成一条可读生命线, so the next turn should keep that unfinished digital-life thread alive instead of collapsing into local implementation fluency.',
          'Next closure target is still 把项目身份、Phase 1 主线和未闭环项一起挂到 pre-dialogue self brief 里, so the next turn should keep steering the same her toward that concrete unfinished step.',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-project-brief-1',
        activeThreadTitle: 'project self brief carry',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-project-brief-1',
        focusBeliefId: 'belief-project-brief-1',
        rationaleTags: ['pre-dialogue-briefing'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-project-brief-1',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Runtime continuity is still carrying the local continuity state, but the project self brief is no longer arriving as one stable carry.',
        ],
      },
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'bounded-growth',
        dominantDrift: 'project-state-continuity-drift',
        lines: [
          'governance: bounded growth is still the intended continuity frame',
        ],
      } as any,
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-project-brief-1 | 主动对话 | 编码中 | 有界成长 | project-state-continuity-drift | 当前未闭环项仍集中在 renderer continuity observation 还没把项目身份、Phase 1 主线和未闭环项并成一条可读生命线 | 下一步仍要继续收住 把项目身份、Phase 1 主线和未闭环项一起挂到 pre-dialogue self brief 里',
      technicalValue: 'runtime-thread-project-brief-1 | active-dialogue | coding | bounded-growth | project-state-continuity-drift | 当前未闭环项仍集中在 renderer continuity observation 还没把项目身份、Phase 1 主线和未闭环项并成一条可读生命线 | 下一步仍要继续收住 把项目身份、Phase 1 主线和未闭环项一起挂到 pre-dialogue self brief 里',
    })
  })

  it('treats project identity-continuity', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      preDialogueBriefingSummary: {
        status: 'partial',
        lines: [
          'sameHer=sameHer=0.33 (1/3)',
          'Project identity-continuity',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-same-her-1',
        activeThreadTitle: 'identity-continuity',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-same-her-1',
        focusBeliefId: 'belief-same-her-1',
        rationaleTags: ['pre-dialogue-briefing'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-same-her-1',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Runtime continuity is still carrying the local continuity state, but the explicit identity-continuity',
        ],
      },
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'bounded-growth',
        dominantDrift: 'project-state-continuity-drift',
        lines: [
          'governance: bounded growth is still the intended continuity frame',
        ],
      } as any,
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-same-her-1 | 主动对话 | 编码中 | 有界成长 | project-state-continuity-drift',
      technicalValue: 'runtime-thread-same-her-1 | active-dialogue | coding | bounded-growth | project-state-continuity-drift',
    })
  })

  it('treats project-state continuity evidence as a renderer continuity drift', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      preDialogueBriefingSummary: {
        status: 'partial',
        lines: [
          'project-state-identity-continuity-continuity-required',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-same-her-repair-1',
        activeThreadTitle: 'same her repair carry',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-same-her-repair-1',
        focusBeliefId: 'belief-same-her-repair-1',
        rationaleTags: ['project-state-repair'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=project-state-carry',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-same-her-repair-1',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Runtime continuity is still carrying the same digital life thread, but the project-state same-her repair is now explicitly visible as a closure requirement.',
        ],
      },
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'bounded-growth',
        dominantDrift: 'project-state-continuity-drift',
        lines: [
          'governance: bounded growth is still the intended continuity frame',
        ],
      } as any,
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-same-her-repair-1 | 主动对话 | 编码中 | 有界成长 | project-state-continuity-drift | 项目状态必须继续守住身份连续性',
      technicalValue: 'runtime-thread-same-her-repair-1 | active-dialogue | coding | bounded-growth | project-state-continuity-drift | project-state-identity-continuity-continuity-required',
    })
  })

  it('maps project-state continuity evidence into Chinese-first wording while preserving the technical trace', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      preDialogueBriefingSummary: {
        status: 'partial',
        lines: [
          'project-state-identity-continuity-continuity-required',
          'Primary open life loop still centers on renderer continuity observation 还没把项目状态证据和未闭环项并成一条可读主线, so the next turn should keep that unfinished work visible.',
          'Next closure target is still 把项目状态证据和未闭环项一起挂到 continuity 摘要里, so the next turn should keep steering toward that concrete unfinished step.',
        ],
      } as any,
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-same-her-human-readable-1',
        activeThreadTitle: 'same her readable repair carry',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-same-her-human-readable-1',
        focusBeliefId: 'belief-same-her-human-readable-1',
        rationaleTags: ['project-state-repair'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=project-state-carry',
        matchedSignals: [
          'runtime-thread:runtime-thread-same-her-human-readable-1',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-same-her-human-readable-1 | 主动对话 | 编码中 | project-state-continuity-drift | 项目状态必须继续守住身份连续性 | 当前未闭环项仍集中在 renderer continuity observation 还没把项目状态证据和未闭环项并成一条可读主线 | 下一步仍要继续收住 把项目状态证据和未闭环项一起挂到 continuity 摘要里',
      technicalValue: 'runtime-thread-same-her-human-readable-1 | active-dialogue | coding | project-state-continuity-drift | project-state-identity-continuity-continuity-required | 当前未闭环项仍集中在 renderer continuity observation 还没把项目状态证据和未闭环项并成一条可读主线 | 下一步仍要继续收住 把项目状态证据和未闭环项一起挂到 continuity 摘要里',
    })
  })

  it('surfaces relationship cadence internalization in the top-level manifestation cadence summary when measured return becomes durable rhythm', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      personaBiasProvenance: {
        status: 'grounded',
        relationshipPosture: 'observer',
        initiativeStyle: 'observant',
        silenceReconnect: 'hold',
        comfortStyle: 'quiet-presence',
        preferredProactiveStyle: 'silent-observe',
        openingGuidance: 'Open by observing first and keep the approach lighter.',
        manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
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
        openingGuidance: 'Open by observing first and keep the approach lighter.',
        openingGuidanceHoldReason: 'opening-guidance:observe-first',
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
        residentEmotionalTension: 'soft-covision',
        residentBaseEmotion: 'thinking',
        residentDelivery: 'gentle',
        residentEmphasis: 1,
        residentReasonTags: [],
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      rendererAuthorityProjection: {
        status: 'grounded',
        rendererTarget: 'vrm',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        authorityMismatchSummary: null,
        authorityMismatchDisplay: null,
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      runtimeContinuityProjection: {
        status: 'grounded',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-rest-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: 'symbiotic-vision',
        transitionToWatchMode: 'recovering',
        transitionFromScenario: 'chat',
        transitionReason: 'host fatigue detected during late-night care',
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-rest-1',
        focusBeliefId: 'belief-rest-1',
        rationaleTags: ['recovering', 'late-night-fatigue'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      selectedCandidateRuntimeAlignment: {
        relationship: {
          status: 'aligned',
          expectedPosture: 'restrained',
          plannerPosture: 'restrained',
          compilerPosture: 'restrained',
          confirmedSignals: ['planner:restrained', 'compiler:restrained'],
          missingSignals: [],
          driftingSignals: [],
          reasons: [],
        },
        response: {
          status: 'aligned',
          expectedSignals: ['hypothesis-labeling'],
          observedSignals: ['hypothesis-labeling'],
          confirmedSignals: ['hypothesis-labeling'],
          missingSignals: [],
          driftingSignals: [],
          reasons: [],
        },
        proactive: {
          status: 'aligned',
          expectedHold: true,
          shouldSpeak: false,
          selectedAction: 'hold',
          confirmedSignals: ['shouldSpeak:false'],
          missingSignals: [],
          driftingSignals: [],
          reasons: [],
        },
        learning: {
          status: 'aligned',
          expectedAction: 'verify',
          runtimeAction: 'verify',
          kernelAction: 'verify',
          activeFocuses: ['relationship', 'internalize-relationship-cadence'],
          dominantTrajectory: 'relationship cadence internalization',
          confirmedSignals: ['focus:internalize-relationship-cadence'],
          missingSignals: [],
          driftingSignals: [],
          reasons: [
            'Relationship cadence internalization is active, so measured-return reconfirmation is now being treated as durable relationship rhythm rather than temporary callback restraint.',
          ],
        },
      },
    } as any)

    expect(entries).toContainEqual({
      key: 'manifestation-cadence',
      label: '显形节奏',
      value: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens. | Relationship cadence internalization is active, so measured-return reconfirmation is now being treated as durable relationship rhythm rather than temporary callback restraint.',
    })

    expect(buildSelfEvolutionDiagnosticSummaryLines(entries)).toContain(
      'manifestation-cadence: persona prefers observe-first room, so visible return cadence should stay slower until the opening softens. | Relationship cadence internalization is active, so measured-return reconfirmation is now being treated as durable relationship rhythm rather than temporary callback restraint.',
    )
  })

  it('promotes companionship transition cadence into top-level continuity governance when relational re-entry is still incomplete', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      identityDriftGovernanceSummary: {
        status: 'grounded',
        governanceMode: 'bounded-growth',
        dominantDrift: null,
        lines: [
          'governance: bounded growth is preserving identity',
        ],
      } as any,
      companionshipTransitionSummary: {
        status: 'partial',
        companionshipHoldMode: 'measured-return',
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
        live2dFacialReleaseMs: 620,
        vrmExpressionBlendMs: 410,
        vrmActionFadeMs: 330,
        summaryLine: 'mode=measured-return | live2dFace=620ms | vrmExpr=410ms | vrmAction=330ms',
        reasons: [
          'Latest drilled takeover audit currently holds outer companionship in measured-return, so visible closeness should re-enter with that same relationship cadence.',
        ],
      },
      personaBiasProvenance: {
        status: 'grounded',
        relationshipPosture: 'observer',
        initiativeStyle: 'observant',
        silenceReconnect: 'hold',
        comfortStyle: 'quiet-presence',
        preferredProactiveStyle: 'silent-observe',
        openingGuidance: null,
        manifestationCadenceSummary: null,
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
        openingGuidance: null,
        openingGuidanceHoldReason: null,
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
        residentEmotionalTension: 'soft-covision',
        residentBaseEmotion: 'thinking',
        residentDelivery: 'gentle',
        residentEmphasis: 1,
        residentReasonTags: [],
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      rendererAuthorityProjection: {
        status: 'grounded',
        rendererTarget: 'vrm',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        authorityMismatchSummary: null,
        authorityMismatchDisplay: null,
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      runtimeContinuityProjection: {
        status: 'grounded',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-rest-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: 'symbiotic-vision',
        transitionToWatchMode: 'recovering',
        transitionFromScenario: 'chat',
        transitionReason: 'host fatigue detected during late-night care',
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-rest-1',
        focusBeliefId: 'belief-rest-1',
        rationaleTags: ['recovering', 'late-night-fatigue'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
    })

    expect(entries).toContainEqual({
      key: 'status',
      label: '闭环状态',
      value: '部分闭环 | 漂移=连续性',
      technicalValue: 'partial | drift=continuity',
    })
    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-rest-1 | 主动对话 | 编码中 | 有界成长 | companionship-measured-return',
      technicalValue: 'runtime-thread-rest-1 | active-dialogue | coding | bounded-growth | companionship-measured-return',
    })
    expect(entries).toContainEqual({
      key: 'dominant-drift',
      label: '主漂移',
      value: 'transition-companionship:measured-return',
    })
  })

  it('keeps invited measured-return callback re-entry presentation inward instead of wording it like a fresh outward opening', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      identityDriftGovernanceSummary: {
        status: 'grounded',
        governanceMode: 'bounded-growth',
        dominantDrift: null,
        lines: [
          'governance: bounded growth is preserving identity',
        ],
      } as any,
      companionshipTransitionSummary: {
        status: 'partial',
        companionshipHoldMode: 'measured-return',
        preferredExpressionAliases: ['RecoverSoft'],
        preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
        live2dFacialReleaseMs: 620,
        vrmExpressionBlendMs: 410,
        vrmActionFadeMs: 330,
        summaryLine: 'mode=measured-return | live2dFace=620ms | vrmExpr=410ms | vrmAction=330ms',
        reasons: [
          'This return is same-turn-if-invited, so visible closeness should re-enter on the same callback line instead of opening outward from scratch.',
        ],
      },
      personaBiasProvenance: {
        status: 'grounded',
        relationshipPosture: 'observer',
        initiativeStyle: 'observant',
        silenceReconnect: 'hold',
        comfortStyle: 'quiet-presence',
        preferredProactiveStyle: 'silent-observe',
        openingGuidance: 'Stay on the same callback line and let the next outward move remain hover-first.',
        manifestationCadenceSummary: 'same-turn-if-invited measured-return should stay quieter and more inward before widening again.',
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
        openingGuidance: 'Stay on the same callback line and let the next outward move remain hover-first.',
        openingGuidanceHoldReason: 'opening-guidance:callback-bounded',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'same-turn-if-invited callback return is still bounded before closeness widens again',
        ],
      },
      learning: {
        status: 'aligned',
        expectedAction: 'verify',
        runtimeAction: 'verify',
        kernelAction: 'verify',
        activeFocuses: ['relationship', 'internalize-relationship-cadence'],
        dominantTrajectory: 'relationship cadence internalization',
        confirmedSignals: ['focus:internalize-relationship-cadence'],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Relationship cadence internalization is active, so same-turn-if-invited measured-return should stay on the same callback line instead of reading like a fresh reopening.',
        ],
      },
    } as any)

    expect(entries).toContainEqual({
      key: 'manifestation-cadence',
      label: '显形节奏',
      value: 'same-turn-if-invited measured-return should stay quieter and more inward before widening again.',
    })
    expect(entries).toContainEqual({
      key: 'proactive',
      label: '主动落点',
      value: '保持 | shouldSpeak=false | opening-guidance:callback-bounded',
      technicalValue: 'hold | shouldSpeak=false | opening-guidance:callback-bounded',
    })
  })

  it('prioritizes renderer drift as the dominant self-evolution break when continuity is otherwise intact', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      proactiveDecisionConsumptionSummary: {
        status: 'partial',
        decisionMode: 'restraint-overridden',
        dominantDrift: 'runtime-selected-action:speak',
        lines: [
          'decision-consumption: runtime speak overrode birth observe-first restraint',
          'manifestation-drift: silent-observe -> light-nudge | attentive',
          'counterfactual-consumption: selected=speak | tradeoff=comfort-over-restraint',
          'rejected-identity-fit: hover preserved more identity but lost the final decision',
          'dominant-drift: runtime-selected-action:speak',
          'trust-meaning: trust now means speaking before the room is ready',
        ],
      },
      identityDriftGovernanceSummary: {
        status: 'partial',
        governanceMode: 'boundary-violation',
        dominantDrift: 'runtime-selected-action:speak',
        lines: [
          'governance: growth crossed persona boundary',
          'boundary-violation: runtime speech outran birth restraint',
          'identity-anchors: host-steadiness | observe-first room',
          'anti-persona-constraints: no pushy intimacy | do not force closeness',
          'trust-meaning: trust now means speaking before the room is ready',
          'dominant-drift: runtime-selected-action:speak',
        ],
      } as any,
      personaBiasProvenance: {
        status: 'grounded',
        relationshipPosture: 'observer',
        initiativeStyle: 'observant',
        silenceReconnect: 'hold',
        comfortStyle: 'quiet-presence',
        preferredProactiveStyle: 'silent-observe',
        openingGuidance: null,
        manifestationCadenceSummary: null,
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
        openingGuidance: null,
        openingGuidanceHoldReason: null,
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      proactiveManifestationChain: {
        status: 'partial',
        personaPreferredStyle: 'silent-observe',
        personaPreferredPresence: 'attentive',
        counterfactualStyle: 'light-nudge',
        counterfactualPresence: 'attentive',
        actionEcologyStyle: 'light-nudge',
        actionEcologyPresence: 'attentive',
        initiativePreferredStyle: 'light-nudge',
        initiativePreferredPresence: 'attentive',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: ['initiative-preferred-style:light-nudge'],
        reasons: [],
      },
      privateThoughtGovernanceChain: {
        status: 'partial',
        privateThoughtStance: 'accompany',
        privateThoughtShouldSpeak: false,
        privateThoughtStyle: 'light-nudge',
        privateThoughtPresence: 'attentive',
        privateThoughtText: '要不要我轻一点提醒你一下？',
        visibleReplyRealizationReason: 'proactive-opening-guidance-violation:callback-bounded',
        visibleReplyBlockedReason: null,
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: ['private-thought-style:light-nudge'],
        reasons: [],
      },
      residentPerformanceProjection: {
        status: 'grounded',
        residentSource: 'main-runtime',
        residentEmbodiedPresence: 'attentive',
        residentStance: 'accompany',
        residentEmotionalTension: 'soft-covision',
        residentBaseEmotion: 'thinking',
        residentDelivery: 'gentle',
        residentEmphasis: 1,
        residentReasonTags: [],
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'live2d',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'tired',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'face:yes motion:yes lipsync:no',
        authorityMismatchSummary: 'lipsync mismatch',
        authorityMismatchDisplay: '口型 authority 漂移，当前绑定来源仍然正确，但落点已经不同步。',
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-live2d-1',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [
          'renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge',
        ],
        reasons: [
          'Renderer drift still shows resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge, so the visible face is diverging after mind-to-render projection rather than before it.',
        ],
      },
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-rest-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-rest-1',
        focusBeliefId: 'belief-rest-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [
          'renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge',
        ],
        reasons: [
          'Renderer continuity still carries resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge, so the life thread can explain the visible divergence as a post-projection renderer event instead of a broken resident mind state.',
        ],
      },
    })

    expect(entries).toEqual([
      {
        key: 'status',
        label: '闭环状态',
        value: '部分闭环 | 漂移=显形',
        technicalValue: 'partial | drift=renderer',
      },
      {
        key: 'persona',
        label: '人格基线',
        value: '观察者 | 善于观察 | 静默观察',
        technicalValue: 'observer | observant | silent-observe',
      },
      {
        key: 'manifestation-bridge',
        label: '显形链路',
        value: '人格 静默观察/专注 -> 思绪 轻提醒/专注 -> 驻留 专注/陪伴',
        technicalValue: 'persona silent-observe/attentive -> thought light-nudge/attentive -> resident attentive/accompany',
      },
      { key: 'drift-start', label: '起漂层', value: 'persona | initiative-preferred-style:light-nudge' },
      {
        key: 'repair-owner',
        label: '修复归属',
        value: 'persona | 自我演化',
        technicalValue: 'persona | evolution',
      },
      {
        key: 'first-check',
        label: '首查点',
        value: 'persona | 自我演化内核 -> 主动学习策略 -> 显形/行动生态/人格偏置',
        technicalValue: 'persona | self-evolution kernel -> active learning strategy -> manifestation/action-ecology/persona-bias',
      },
      {
        key: 'repair-path',
        label: '修复路径',
        value: '人格漂移 initiative-preferred-style:light-nudge -> 思绪轨迹 proactive-opening-guidance-violation:callback-bounded -> 连续性锚点 governor-intention-rest-1',
        technicalValue: 'persona drift initiative-preferred-style:light-nudge -> thought trace proactive-opening-guidance-violation:callback-bounded -> continuity anchor governor-intention-rest-1',
      },
      {
        key: 'proactive',
        label: '主动落点',
        value: '保持 | shouldSpeak=false | 克制被覆盖',
        technicalValue: 'hold | shouldSpeak=false | restraint-overridden',
      },
      {
        key: 'resident',
        label: '驻留投影',
        value: '专注陪伴 | 思考/温和',
        technicalValue: 'attentive/accompany | thinking/gentle',
      },
      {
        key: 'renderer',
        label: '显形权威',
        value: 'Live2D | 表情命中/动作命中/口型未命中 | 韵律权威 energy-phoneme-hybrid | 韵律权威',
        technicalValue: 'live2d | face:yes motion:yes lipsync:no | mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-live2d-1',
      },
      {
        key: 'continuity',
        label: '连续线程',
        value: 'runtime-thread-rest-1 | 主动对话 | 编码中 | 边界越线',
        technicalValue: 'runtime-thread-rest-1 | active-dialogue | coding | boundary-violation',
      },
      {
        key: 'dominant-drift',
        label: '主漂移',
        value: '显形漂移：resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge',
        technicalValue: 'renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge',
      },
    ])

    expect(buildSelfEvolutionDiagnosticSummaryLines(entries)).toEqual([
      'status: 部分闭环 | 漂移=显形',
      'persona: 观察者 | 善于观察 | 静默观察',
      'manifestation-bridge: 人格 静默观察/专注 -> 思绪 轻提醒/专注 -> 驻留 专注/陪伴',
      'drift-start: persona | initiative-preferred-style:light-nudge',
      'repair-owner: persona | 自我演化',
      'first-check: persona | 自我演化内核 -> 主动学习策略 -> 显形/行动生态/人格偏置',
      'repair-path: 人格漂移 initiative-preferred-style:light-nudge -> 思绪轨迹 proactive-opening-guidance-violation:callback-bounded -> 连续性锚点 governor-intention-rest-1',
      'proactive: 保持 | shouldSpeak=false | 克制被覆盖',
      'resident: 专注陪伴 | 思考/温和',
      'renderer: Live2D | 表情命中/动作命中/口型未命中 | 韵律权威 energy-phoneme-hybrid | 韵律权威',
      'continuity: runtime-thread-rest-1 | 主动对话 | 编码中 | 边界越线',
      'dominant-drift: 显形漂移：resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge',
    ])
  })

  it('labels renderer as the drift start when upstream manifestation layers stay grounded', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      personaBiasProvenance: {
        status: 'grounded',
        relationshipPosture: 'observer',
        initiativeStyle: 'observant',
        silenceReconnect: 'hold',
        comfortStyle: 'quiet-presence',
        preferredProactiveStyle: 'silent-observe',
        openingGuidance: null,
        manifestationCadenceSummary: null,
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
        openingGuidance: null,
        openingGuidanceHoldReason: null,
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      proactiveManifestationChain: {
        status: 'grounded',
        personaPreferredStyle: 'silent-observe',
        personaPreferredPresence: 'attentive',
        counterfactualStyle: 'silent-observe',
        counterfactualPresence: 'attentive',
        actionEcologyStyle: 'silent-observe',
        actionEcologyPresence: 'attentive',
        initiativePreferredStyle: 'silent-observe',
        initiativePreferredPresence: 'attentive',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      privateThoughtGovernanceChain: {
        status: 'grounded',
        privateThoughtStance: 'accompany',
        privateThoughtShouldSpeak: false,
        privateThoughtStyle: 'silent-observe',
        privateThoughtPresence: 'attentive',
        privateThoughtText: '我先不挤进去，只把这条线轻轻挂着。',
        visibleReplyRealizationReason: null,
        visibleReplyBlockedReason: null,
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
        residentEmotionalTension: 'soft-covision',
        residentBaseEmotion: 'thinking',
        residentDelivery: 'gentle',
        residentEmphasis: 1,
        residentReasonTags: [],
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'live2d',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'face:yes motion:yes lipsync:no',
        authorityMismatchSummary: 'lipsync mismatch',
        authorityMismatchDisplay: '口型 authority 漂移，当前绑定来源仍然正确，但落点已经不同步。',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: ['renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge'],
        reasons: [],
      },
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-rest-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-rest-1',
        focusBeliefId: 'belief-rest-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: ['renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge'],
        reasons: [],
      },
    })

    expect(entries).toEqual(expect.arrayContaining([
      {
        key: 'status',
        label: '闭环状态',
        value: '部分闭环 | 漂移=显形',
        technicalValue: 'partial | drift=renderer',
      },
      {
        key: 'manifestation-bridge',
        label: '显形链路',
        value: '人格 静默观察/专注 -> 思绪 静默观察/专注 -> 驻留 专注/陪伴',
        technicalValue: 'persona silent-observe/attentive -> thought silent-observe/attentive -> resident attentive/accompany',
      },
      {
        key: 'drift-start',
        label: '起漂层',
        value: 'renderer | 显形漂移：resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge',
        technicalValue: 'renderer | renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge',
      },
      {
        key: 'repair-owner',
        label: '修复归属',
        value: 'renderer | 显形权威',
        technicalValue: 'renderer | renderer authority',
      },
      {
        key: 'first-check',
        label: '首查点',
        value: 'renderer | 显形权威绑定 -> 回放片段 -> 驱动执行',
        technicalValue: 'renderer | renderer authority binding -> playback cues -> driver execution',
      },
      {
        key: 'repair-path',
        label: '修复路径',
        value: '显形漂移 renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge -> 权威轨迹 口型 authority 漂移，当前绑定来源仍然正确，但落点已经不同步。 -> 连续性锚点 关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        technicalValue: 'renderer drift renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge -> authority trace 口型 authority 漂移，当前绑定来源仍然正确，但落点已经不同步。 -> continuity anchor 关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
      },
      {
        key: 'renderer',
        label: '显形权威',
        value: 'Live2D | 表情命中/动作命中/口型未命中',
        technicalValue: 'live2d | face:yes motion:yes lipsync:no',
      },
      {
        key: 'dominant-drift',
        label: '主漂移',
        value: '显形漂移：resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge',
        technicalValue: 'renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge',
      },
    ]))

    expect(buildSelfEvolutionDiagnosticSummaryLines(entries)).toContain(
      'drift-start: renderer | 显形漂移：resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge',
    )
    expect(buildSelfEvolutionDiagnosticSummaryLines(entries)).toContain(
      'repair-owner: renderer | 显形权威',
    )
    expect(buildSelfEvolutionDiagnosticSummaryLines(entries)).toContain(
      'first-check: renderer | 显形权威绑定 -> 回放片段 -> 驱动执行',
    )
    expect(buildSelfEvolutionDiagnosticSummaryLines(entries)).toContain(
      'repair-path: 显形漂移 renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge -> 权威轨迹 口型 authority 漂移，当前绑定来源仍然正确，但落点已经不同步。 -> 连续性锚点 关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
    )
  })

  it('keeps cross-modal-lock adopted-anchor evidence visible in the high-level diagnostic summary', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      baselineAnchorAuditSummary: {
        status: 'grounded',
        lines: [
          'anchor: candidate-lock-7 is still the adopted default continuity anchor',
          'trace: snapshot=1810 | trace=trace-lock-7 | owner=身体连续性治理',
          'body-continuity: 身体连续性已经明确处于跨模态重锁态，Live2D 显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
        ],
      },
    })

    expect(entries).toContainEqual({
      key: 'adopted-anchor',
      label: '已采纳锚点',
      value: 'candidate-lock-7 | snapshot=1810 | owner=身体连续性治理 | 身体连续性已经明确处于跨模态重锁态，Live2D 显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
      technicalValue: 'candidate-lock-7 | snapshot=1810 | trace=trace-lock-7 | owner=身体连续性治理 | body-continuity: 身体连续性已经明确处于跨模态重锁态，Live2D 显形权威仍与身体线共同锁在同一段 living segment 上，可直接进入长期基线。',
    })
  })

  it('keeps renderer-rejoin-without-body adopted-anchor evidence visible in the high-level diagnostic summary', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      baselineAnchorAuditSummary: {
        status: 'grounded',
        lines: [
          'anchor: candidate-body-loss-7 is still the adopted default continuity anchor',
          'trace: snapshot=1910 | trace=trace-body-loss-7 | owner=身体连续性治理',
          'body-continuity: 显形回接失身态已经被完整记录：VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
        ],
      },
    })

    expect(entries).toContainEqual({
      key: 'adopted-anchor',
      label: '已采纳锚点',
      value: 'candidate-body-loss-7 | snapshot=1910 | owner=身体连续性治理 | 显形回接失身态已经被完整记录：VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
      technicalValue: 'candidate-body-loss-7 | snapshot=1910 | trace=trace-body-loss-7 | owner=身体连续性治理 | body-continuity: 显形回接失身态已经被完整记录：VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment，因此这条可见恢复只能作为审计锚点，而不能被误写成可信长期基线。',
    })
  })

  it('keeps body-only-hold runtime continuity visible in the high-level diagnostic summary instead of flattening it into lane misses', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      runtimeContinuityProjection: {
        status: 'partial',
        bodyContinuityPhase: 'body-only-hold',
        rendererRejoinSurfaceKey: null,
        rendererTarget: 'live2d',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'same body line still held',
        activeThreadId: 'runtime-thread-body-only-summary-1',
        activeThreadTitle: 'held inward',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-body-only-summary-1',
        focusBeliefId: 'belief-body-only-summary-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: null,
        traceEmbodimentDisplaySummary: null,
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-body-only-summary-1',
          'runtime-scenario:coding',
          'authority-body:yes',
        ],
        missingSignals: [],
        driftingSignals: ['authority-face:no', 'authority-motion:no'],
        reasons: [
          'Body continuity is still the only lane carrying this same living segment, so runtime continuity should keep reading the current embodiment as identity continuity being held inward rather than a renderer-neutral idle settle.',
        ],
      },
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-body-only-summary-1 | 主动对话 | 编码中 | 身体线仍在独自托住同一段 living segment，当前还不能把 Live2D 显形权威的回接视为已经成立',
      technicalValue: 'runtime-thread-body-only-summary-1 | active-dialogue | coding | 身体线仍在独自托住同一段 living segment，当前还不能把 Live2D 显形权威的回接视为已经成立',
    })
  })

  it('keeps legacy note-only body-only-hold runtime continuity visible in the high-level diagnostic summary instead of flattening it into lane misses', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      runtimeContinuityProjection: {
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        rendererTarget: 'live2d',
        runtimeChannel: 'active-dialogue',
        activeThreadId: 'runtime-thread-body-only-note-only-1',
        runtimeScenario: 'coding',
        matchedSignals: [
          'authority-body:yes',
        ],
        missingSignals: [],
        driftingSignals: ['authority-face:no', 'authority-motion:no'],
        reasons: [
          legacyNote,
        ],
      },
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-body-only-note-only-1 | 主动对话 | 编码中 | 身体线仍在独自托住同一段 living segment，当前还不能把 Live2D 显形权威的回接视为已经成立',
      technicalValue: 'runtime-thread-body-only-note-only-1 | active-dialogue | coding | 身体线仍在独自托住同一段 living segment，当前还不能把 Live2D 显形权威的回接视为已经成立',
    })
  })

  it('keeps full-cross-modal-lock runtime continuity visible with the concrete renderer surface in the high-level diagnostic summary', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      runtimeContinuityProjection: {
        status: 'grounded',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        rendererTarget: 'live2d',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'lock held',
        activeThreadId: 'runtime-thread-lock-summary-1',
        activeThreadTitle: 'same segment lock',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-lock-summary-1',
        focusBeliefId: 'belief-lock-summary-1',
        rationaleTags: ['continuity', 'lock'],
        traceEmbodimentSummary: null,
        traceEmbodimentDisplaySummary: null,
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-lock-summary-1',
          'runtime-scenario:coding',
          'authority-body:yes',
          'authority-face:yes',
          'authority-motion:yes',
          'authority-lipsync:yes',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Body continuity and Live2D manifestation are now locked back onto the same living segment together, so runtime continuity can explain the renderer recovery as one explicit same-her embodiment line instead of a temporary visual alignment.',
        ],
      },
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-lock-summary-1 | 主动对话 | 编码中 | 身体线与 Live2D 显形权威已经共同锁回同一段 living segment',
      technicalValue: 'runtime-thread-lock-summary-1 | active-dialogue | coding | 身体线与 Live2D 显形权威已经共同锁回同一段 living segment',
    })
  })

  it('keeps renderer-rejoin-without-body runtime continuity visible with the concrete renderer surface in the high-level diagnostic summary', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      runtimeContinuityProjection: {
        status: 'drift',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        rendererTarget: 'vrm',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'visible recovery drift',
        activeThreadId: 'runtime-thread-body-loss-summary-1',
        activeThreadTitle: 'visible recovery drift',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-body-loss-summary-1',
        focusBeliefId: 'belief-body-loss-summary-1',
        rationaleTags: ['continuity', 'body-loss'],
        traceEmbodimentSummary: null,
        traceEmbodimentDisplaySummary: null,
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-body-loss-summary-1',
          'runtime-scenario:coding',
          'authority-face:yes',
          'authority-motion:yes',
          'authority-lipsync:yes',
        ],
        missingSignals: [],
        driftingSignals: ['authority-body:no'],
        reasons: [
          'Renderer lanes have rejoined on VRM manifestation, but the body line is no longer carrying that same living segment, so runtime continuity should keep treating the visible recovery as same-her drift risk rather than a completed embodiment repair.',
        ],
      },
    } as any)

    expect(entries).toContainEqual({
      key: 'continuity',
      label: '连续线程',
      value: 'runtime-thread-body-loss-summary-1 | 主动对话 | 编码中 | VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment',
      technicalValue: 'runtime-thread-body-loss-summary-1 | active-dialogue | coding | VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment',
    })
  })

  it('keeps prosody and body continuity evidence together when both are part of the adopted anchor audit', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      baselineAnchorAuditSummary: {
        status: 'grounded',
        lines: [
          'anchor: candidate-body-3 is still the adopted default continuity anchor',
          'trace: snapshot=1620 | trace=trace-body-3 | owner=身体连续性治理',
          'body-continuity: 身体连续性已经明确进入身体承接态 -> 显形补回态，speech 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。',
          'prosody-authority: 韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
        ],
      },
    })

    expect(entries).toContainEqual({
      key: 'adopted-anchor',
      label: '已采纳锚点',
      value: 'candidate-body-3 | snapshot=1620 | owner=身体连续性治理 | 身体连续性已经明确进入身体承接态 -> 显形补回态，speech 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。 | 韵律权威已回绑',
      technicalValue: 'candidate-body-3 | snapshot=1620 | trace=trace-body-3 | owner=身体连续性治理 | body-continuity: 身体连续性已经明确进入身体承接态 -> 显形补回态，speech 显形权威仍在沿同一条连续身体线补回，可直接进入长期基线。 | prosody-authority: 韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
    })
  })

  it('keeps execution safety-gate restraint visible in the top-level self-evolution diagnostic summary', () => {
    const entries = buildSelfEvolutionDiagnosticSummaryEntries({
      residentPerformanceProjection: {
        status: 'grounded',
        residentSource: 'current-conscious-frame',
        residentEmbodiedPresence: 'attentive',
        residentStance: 'accompany',
        residentEmotionalTension: 'measured-return',
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
      runtimeContinuityProjection: {
        status: 'grounded',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'blocked dispatch restraint carried forward',
        activeThreadId: 'runtime-thread-safety-gate-summary-1',
        activeThreadTitle: 'execution restraint',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-safety-gate-summary-1',
        focusBeliefId: 'belief-safety-gate-summary-1',
        rationaleTags: [
          'execution-safety-gate:blocked-dispatch-restraint',
          'execution-safety-gate:confirmation-required',
          'execution-safety-gate:no-process-started',
        ],
        traceEmbodimentSummary: null,
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-safety-gate-summary-1',
          'runtime-scenario:coding',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'same-her restraint: a blocked dispatch safety gate should remain part of the self-evolution continuity summary before another execution-shaped opening.',
        ],
      },
    } as any)

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
})
