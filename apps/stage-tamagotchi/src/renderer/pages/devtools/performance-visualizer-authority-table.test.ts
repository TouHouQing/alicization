import { describe, expect, it } from 'vitest'

import { buildAuthorityTableRows } from './performance-visualizer-authority-table'
import { buildSpeechAuthoritySegmentRows } from './performance-visualizer-speech-authority'

describe('performance visualizer authority table rows', () => {
  it('flattens compact authority display rows into table-ready cells', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-live2d-1',
        cueText: '继续看这里。',
        surfaces: 'live2d',
        lanes: 'expression, lipsync, settle',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'live2d',
            lane: 'expression',
            planned: 'CalmInspect',
            consumed: 'RecoverSoft',
            source: 'n/a',
            confidence: 'n/a',
            aligned: false,
            settleLines: [],
          },
          {
            surface: 'live2d',
            lane: 'settle',
            planned: 'settle',
            consumed: 'settle',
            source: 'n/a',
            confidence: 'n/a',
            settle: {
              live2dFacialReleaseMs: {
                planned: 320,
                consumed: 300,
              },
              live2dMotionFollowThroughMs: {
                planned: 440,
                consumed: 420,
              },
            },
            aligned: false,
            settleLines: [
              'live2dFacialReleaseMs: 320 -> 300',
              'live2dMotionFollowThroughMs: 440 -> 420',
            ],
          },
        ],
      },
    ] as any)

    expect((rows[0] as any).speechSummaryLines).toEqual([])

    expect(rows).toEqual([
      {
        cueId: 'segment-live2d-1',
        cueText: '继续看这里。',
        driftStatus: 'partial-drift',
        aligned: false,
        surface: 'live2d',
        lane: 'expression',
        planned: 'CalmInspect',
        consumed: 'RecoverSoft',
        source: 'n/a',
        confidence: 'n/a',
        settle: 'n/a',
        settleLive2dFacialReleaseMs: 'n/a',
        settleLive2dMotionFollowThroughMs: 'n/a',
        settleVrmActionFadeMs: 'n/a',
        settleVrmExpressionBlendMs: 'n/a',
        authorityBindingSummary: 'n/a',
        voiceSummary: 'n/a',
        prosodyAuthoritySummary: 'n/a',
        topVisemeSummary: 'n/a',
        cueSummary: 'n/a',
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: 'n/a',
        actionCue: 'n/a',
        weightSummary: 'n/a',
        personaStyleSummary: 'n/a',
        timingSummary: 'n/a',
        driverExecutionSummary: 'n/a',
        embodimentClosureStage: null,
        authorityMatchSummary: 'n/a',
        traceEmbodimentSummary: 'n/a',
        visemeHintsSummary: 'n/a',
        settleAuthoritySummary: 'n/a',
        authorityTrustSummary: null,
        rendererDriftSummary: null,
        authoritySegmentMatched: null,
        authorityMatchedDrivers: [],
        authorityMatchedSources: [],
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        speechSummaryLines: [],
      },
      {
        cueId: 'segment-live2d-1',
        cueText: '继续看这里。',
        driftStatus: 'partial-drift',
        aligned: false,
        surface: 'live2d',
        lane: 'settle',
        planned: 'settle',
        consumed: 'settle',
        source: 'n/a',
        confidence: 'n/a',
        settle: 'live2dFacialReleaseMs: 320 -> 300 | live2dMotionFollowThroughMs: 440 -> 420',
        settleLive2dFacialReleaseMs: '320 -> 300',
        settleLive2dMotionFollowThroughMs: '440 -> 420',
        settleVrmActionFadeMs: 'n/a',
        settleVrmExpressionBlendMs: 'n/a',
        authorityBindingSummary: 'n/a',
        voiceSummary: 'n/a',
        prosodyAuthoritySummary: 'n/a',
        topVisemeSummary: 'n/a',
        cueSummary: 'n/a',
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: 'n/a',
        actionCue: 'n/a',
        weightSummary: 'n/a',
        personaStyleSummary: 'n/a',
        timingSummary: 'n/a',
        driverExecutionSummary: 'n/a',
        embodimentClosureStage: null,
        authorityMatchSummary: 'n/a',
        traceEmbodimentSummary: 'n/a',
        visemeHintsSummary: 'n/a',
        settleAuthoritySummary: 'n/a',
        authorityTrustSummary: null,
        rendererDriftSummary: null,
        authoritySegmentMatched: null,
        authorityMatchedDrivers: [],
        authorityMatchedSources: [],
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        speechSummaryLines: [],
      },
    ])
  })

  it('threads structured speech observability into each authority table row for the same cue', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-zh-1',
        cueText: '继续看这里。',
        surfaces: 'live2d, vrm',
        lanes: 'expression, lipsync, settle',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'live2d',
            lane: 'lipsync',
            planned: 'I',
            consumed: 'A',
            source: 'prosody-authority',
            confidence: '0.91',
            aligned: false,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-zh-1': {
        cueId: 'segment-zh-1',
        cueText: '继续看这里。',
        driftStatus: 'partial-drift',
        aligned: false,
        speechEvidence: {
          voiceSummary: '上游语音韵律',
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-zh-1',
          authorityMatchSummary: '上游 authority 命中',
          topVisemeSummary: '上游主口型',
          cueSummary: '上游微表情线索',
          cueIdentityPresent: true,
          cueProsodyPresent: true,
          personaStyleSummary: '上游人设风格',
          timingSummary: '上游时序节奏',
          driverExecutionSummary: '上游驱动执行',
          visemeHintsSummary: '上游口型提示',
        },
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['face', 'lipsync'],
        authorityMatchedSources: ['prosody-authority'],
        authorityBindingSummary: 'target=vrm | drivers=face, lipsync | sources=prosody-authority | matches=face:yes motion:no lipsync:yes',
        authorityMismatchSummary: 'motion-mismatch',
        authorityMismatchReasonSummary: '动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情、动作、口型。',
        voiceSummary: 'zh-CN | closure=0.84 | precision=0.90',
        topVisemeSummary: 'A:0.66, closed:0.41, E:0.24',
        cueSummary: 'focused / observe_focus | prosody=0.36 mouth=0.28 head=0.32',
        cueIdentityPresent: true,
        cueProsodyPresent: true,
        faceCue: 'focused',
        actionCue: 'observe_focus',
        weightSummary: 'prosody=0.36 mouth=0.28 head=0.32',
        personaStyleSummary: 'observe-first | prosody=-0.07 beat=-0.06 mouth=-0.04 head=+0.08',
        timingSummary: 'facial=320 action=240 emotion=360 | segment-start | soft-interrupt | hold',
        driverExecutionSummary: 'face=attentive/focused@0.61 hold=320 pre=soften post=hold-soft src=prosody-authority conf=0.83 | motion=observe_focus mode=observe-first idle=breathing-idle@0.48 hold=240 src=timeline-projection conf=0.79 | lipsync=energy-phoneme-hybrid phase=playing',
        authorityMatchSummary: 'face:yes motion:no lipsync:yes',
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=none | execution=none | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
        visemeHintsSummary: 'I:0.35@0.94 | closed:0.75@0.89',
        settleAuthoritySummary: null,
        rendererDriftSummary: 'resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority',
      },
    })

    expect((rows[0] as any).speechSummaryLines).toEqual([
      'authority: 目标 VRM，驱动 表情、口型，来源 prosody-authority，命中 表情命中 / 动作未命中 / 口型命中',
      'authority-match: 表情命中 / 动作未命中 / 口型命中',
      'authority-trust: 韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      'authority-mismatch: 动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情、动作、口型。',
      'renderer-drift: resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority',
      'voice: 上游语音韵律',
      'prosody-authority: 模式 energy-phoneme-hybrid，韵律 0.35，口部 0.35，头部 0.32，峰值口型 0.75，权威绑定，来源 韵律权威，片段 segment-zh-1',
      'visemes: 上游主口型',
      'cue: 上游微表情线索',
      'persona-style: 上游人设风格',
      'timing: 上游时序节奏',
      'driver-execution: 上游驱动执行',
      'trace-embodiment: 关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 表情、口型，实际执行 表情+动作+口型，场景 深夜疲劳照看，姿态 先观察后表达，来源链 fatigue -> care -> grounded-recall',
      'viseme-hints: 上游口型提示',
    ])

    expect(rows).toEqual([
      {
        cueId: 'segment-zh-1',
        cueText: '继续看这里。',
        driftStatus: 'partial-drift',
        aligned: false,
        surface: 'live2d',
        lane: 'lipsync',
        planned: 'I',
        consumed: 'A',
        source: 'prosody-authority',
        confidence: '0.91',
        settle: 'n/a',
        settleLive2dFacialReleaseMs: 'n/a',
        settleLive2dMotionFollowThroughMs: 'n/a',
        settleVrmActionFadeMs: 'n/a',
        settleVrmExpressionBlendMs: 'n/a',
        authorityBindingSummary: 'target=vrm | drivers=face, lipsync | sources=prosody-authority | matches=face:yes motion:no lipsync:yes',
        voiceSummary: '上游语音韵律',
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-zh-1',
        topVisemeSummary: '上游主口型',
        cueSummary: '上游微表情线索',
        cueIdentityPresent: true,
        cueProsodyPresent: true,
        faceCue: 'focused',
        actionCue: 'observe_focus',
        weightSummary: 'prosody=0.36 mouth=0.28 head=0.32',
        personaStyleSummary: '上游人设风格',
        timingSummary: '上游时序节奏',
        driverExecutionSummary: '上游驱动执行',
        authorityMatchSummary: 'face:yes motion:no lipsync:yes',
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=face, lipsync | execution=face+motion+lipsync | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
        visemeHintsSummary: '上游口型提示',
        settleAuthoritySummary: 'n/a',
        authorityTrustSummary: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['face', 'lipsync'],
        authorityMatchedSources: ['prosody-authority'],
        authorityMismatchSummary: 'motion-mismatch',
        authorityMismatchReasonSummary: '动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情、动作、口型。',
        authorityMismatchDisplay: '动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情、动作、口型。',
        embodimentClosureStage: null,
        rendererDriftSummary: 'resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority',
        speechSummaryLines: [
          'authority: 目标 VRM，驱动 表情、口型，来源 prosody-authority，命中 表情命中 / 动作未命中 / 口型命中',
          'authority-match: 表情命中 / 动作未命中 / 口型命中',
          'authority-trust: 韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
          'authority-mismatch: 动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情、动作、口型。',
          'renderer-drift: resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority',
          'voice: 上游语音韵律',
          'prosody-authority: 模式 energy-phoneme-hybrid，韵律 0.35，口部 0.35，头部 0.32，峰值口型 0.75，权威绑定，来源 韵律权威，片段 segment-zh-1',
          'visemes: 上游主口型',
          'cue: 上游微表情线索',
          'persona-style: 上游人设风格',
          'timing: 上游时序节奏',
          'driver-execution: 上游驱动执行',
          'trace-embodiment: 关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 表情、口型，实际执行 表情+动作+口型，场景 深夜疲劳照看，姿态 先观察后表达，来源链 fatigue -> care -> grounded-recall',
          'viseme-hints: 上游口型提示',
        ],
      },
    ])
  })

  it('keeps voice continuity visible in authority table speech summary lines when descriptive upstream authority still points at the same living segment', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-authority-table-voice-1',
        cueText: '继续看这里。',
        surfaces: 'vrm',
        lanes: 'lipsync',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'lipsync',
            planned: 'I',
            consumed: 'A',
            source: 'prosody-authority',
            confidence: '0.91',
            aligned: false,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-authority-table-voice-1': {
        cueId: 'segment-authority-table-voice-1',
        cueText: '继续看这里。',
        driftStatus: 'partial-drift',
        aligned: false,
        speechEvidence: {
          voiceSummary: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-authority-table-voice-1 | source=prosody-authority',
          prosodyAuthoritySummary: null,
          authorityMatchSummary: '上游 authority 命中',
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: true,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: 'lipsync=energy-phoneme-hybrid phase=playing',
          visemeHintsSummary: null,
        },
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['lipsync'],
        authorityMatchedSources: ['prosody-authority'],
        authorityBindingSummary: '上游 authority 绑定',
        authorityMatchSummary: '上游 authority 命中',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '上游 authority 漂移说明',
        voiceSummary: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-authority-table-voice-1 | source=prosody-authority',
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: true,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: 'lipsync=energy-phoneme-hybrid phase=playing',
        traceEmbodimentSummary: null,
        visemeHintsSummary: null,
        settleAuthoritySummary: '上游 authority settle',
        rendererDriftSummary: null,
        authorityRendererTarget: 'vrm',
      },
    } as any)

    expect(rows[0]?.authorityMatchedDrivers).toEqual(['lipsync', 'voice'])
    expect(rows[0]?.speechSummaryLines).toEqual([
      'authority: 上游 authority 绑定 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中',
      'authority-match: 上游 authority 命中 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中',
      'authority-trust: VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。',
      'authority-mismatch: 上游 authority 漂移说明',
      'voice: 中文韵律，收口 0.84，咬字 0.90，权威绑定，片段 segment-authority-table-voice-1，来源 韵律权威',
      'driver-execution: 口型 energy-phoneme-hybrid，阶段 播放中',
    ])
  })

  it('keeps structured voice continuity visible in authority table rows even before a formatted voice summary string is present', () => {
    const cueId = 'segment-authority-table-structured-voice-1'
    const rows = buildAuthorityTableRows([
      {
        cueId,
        cueText: '结构化声音命中已经到了，但字符串摘要还没生成。',
        surfaces: 'vrm',
        lanes: 'lipsync',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'lipsync',
            planned: 'I',
            consumed: 'A',
            source: 'prosody-authority',
            confidence: '0.91',
            aligned: false,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      [cueId]: {
        cueId,
        cueText: '结构化声音命中已经到了，但字符串摘要还没生成。',
        driftStatus: 'partial-drift',
        aligned: false,
        speechEvidence: {
          voiceSummary: null,
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.31 | head=0.24 | visemePeak=0.58 | provenance=authority-bound | source=prosody-authority | segment=segment-authority-table-structured-voice-1',
          authorityMatchSummary: 'face:no motion:no lipsync:yes',
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: true,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: 'lipsync=energy-phoneme-hybrid phase=playing',
          visemeHintsSummary: null,
        },
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['lipsync'],
        authorityMatchedSources: ['prosody-authority', 'voice-segment'],
        authorityBindingSummary: 'upstream authority binding',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情和动作还没回到这一段里，但声音已经和口型一起并回主线。',
        voiceSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: true,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: 'lipsync=energy-phoneme-hybrid phase=playing',
        traceEmbodimentSummary: null,
        visemeHintsSummary: null,
        settleAuthoritySummary: `authority-bound | segment=${cueId} | target=vrm | drivers=lipsync | sources=prosody-authority, voice-segment`,
        rendererDriftSummary: null,
        authorityRendererTarget: 'vrm',
        playbackTelemetry: {
          driverAuthority: {
            segmentId: cueId,
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            matchedSources: ['prosody-authority', 'voice-segment'],
            bodySegmentMatched: false,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
            voiceSegmentMatched: true,
            prosodyAuthority: {
              segmentId: cueId,
              provenance: 'authority-bound',
              source: 'prosody-authority',
              mode: 'energy-phoneme-hybrid',
              cueProsodyWeight: 0.35,
              cueMouthWeight: 0.31,
              cueHeadWeight: 0.24,
              visemePeakWeight: 0.58,
            },
          },
        },
      },
    } as any)

    expect(rows[0]?.authorityMatchedDrivers).toEqual(['lipsync', 'voice'])
    expect(rows[0]?.authorityTrustSummary).toBe(
      'VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。',
    )
    expect(rows[0]?.speechSummaryLines).toEqual([
      'authority: upstream authority binding | 表情未命中 / 动作未命中 / 口型命中 / 声音命中',
      'authority-match: 表情未命中 / 动作未命中 / 口型命中 / 声音命中',
      'authority-trust: VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。',
      'authority-mismatch: 表情和动作还没回到这一段里，但声音已经和口型一起并回主线。',
      'prosody-authority: 模式 energy-phoneme-hybrid，韵律 0.35，口部 0.31，头部 0.24，峰值口型 0.58，权威绑定，来源 韵律权威，片段 segment-authority-table-structured-voice-1',
      'driver-execution: 口型 energy-phoneme-hybrid，阶段 播放中',
    ])
  })

  it('reuses speech-row prosody authority summary when authority trust must be derived locally', () => {
    const speechRows = buildSpeechAuthoritySegmentRows([
      {
        cueId: 'segment-driver-table-native',
        cueText: '继续跟上。',
        surfaces: ['vrm'],
        lanes: ['lipsync'],
        aligned: true,
        driftStatus: 'all-aligned',
        entries: [],
      },
    ] as any, {
      articulation: null,
      articulationSummary: null,
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
      },
      authorityBinding: {
        segmentId: 'segment-driver-table-native',
        rendererTarget: 'vrm',
        matchedDrivers: ['lipsync'],
        matchedSources: ['prosody-authority'],
        faceSegmentMatched: false,
        motionSegmentMatched: false,
        lipsyncSegmentMatched: true,
      },
      authoritySummary: null,
      authorityMismatchSummary: null,
      authorityMismatchReasonSummary: null,
      authorityMismatchDisplay: null,
      cueMicro: null,
      cueMicroSummary: null,
      driverExecution: null,
      visemeHints: [],
      visemeHintsSummary: null,
      driverExecutionSummary: null,
      playbackTelemetry: {
        driverAuthority: {
          segmentId: 'segment-driver-table-native',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          sources: ['prosody-authority'],
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
          prosodyAuthority: {
            segmentId: 'segment-driver-table-native',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.35,
            cueMouthWeight: 0.35,
            cueHeadWeight: 0.32,
            visemePeakWeight: 0.75,
          },
        },
        prosodyAuthority: null,
      },
      rendererAlignmentSummary: {
        live2d: null,
        vrm: null,
      },
    } as any)
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-driver-table-native',
        cueText: '继续跟上。',
        surfaces: 'vrm',
        lanes: 'lipsync',
        driftStatus: 'all-aligned',
        aligned: true,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'lipsync',
            planned: 'I',
            consumed: 'I',
            source: 'prosody-authority',
            confidence: '0.94',
            aligned: true,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-driver-table-native': speechRows[0],
    } as any)

    expect(rows[0]?.prosodyAuthoritySummary).toBe(
      'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-driver-table-native',
    )
    expect(rows[0]?.authorityTrustSummary).toBe('VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。')
  })

  it('rehydrates explicit voice telemetry into authority table speech evidence before playback telemetry rethreads top-level prosody authority', () => {
    const cueId = 'segment-authority-table-explicit-voice-1'
    const rows = buildAuthorityTableRows([
      {
        cueId,
        cueText: '这条声线 continuity 还在，但上游 prosody summary 还没回穿。',
        surfaces: 'vrm',
        lanes: 'lipsync',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'lipsync',
            planned: 'I',
            consumed: 'A',
            source: 'prosody-authority',
            confidence: '0.91',
            aligned: false,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      [cueId]: {
        cueId,
        cueText: '这条声线 continuity 还在，但上游 prosody summary 还没回穿。',
        driftStatus: 'partial-drift',
        aligned: false,
        speechEvidence: null,
        authorityRendererTarget: 'vrm',
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['lipsync'],
        authorityMatchedSources: ['prosody-authority', 'voice-segment'],
        authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority, voice-segment | matches=face:no motion:no lipsync:yes',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        authorityTrustSummary: null,
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情和动作还没跟回这一段，但声音已经把当前身体线先托住了。',
        authorityMismatchDisplay: '表情和动作还没跟回这一段，但声音已经把当前身体线先托住了。',
        voiceSummary: null,
        prosodyAuthoritySummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: 'lipsync=energy-phoneme-hybrid phase=playing',
        traceEmbodimentSummary: null,
        visemeHintsSummary: null,
        settleAuthoritySummary: null,
        rendererDriftSummary: null,
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: cueId,
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            matchedSources: ['prosody-authority', 'voice-segment'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
            voiceSegmentMatched: true,
          },
          prosodyAuthority: null,
          drivers: {
            voice: {
              playbackPhase: 'playing',
              continuityHoldMs: 280,
              segmentId: cueId,
              provenance: 'authority-bound',
              source: 'prosody-authority',
              mode: 'energy-phoneme-hybrid',
              cueProsodyWeight: 0.29,
              cueMouthWeight: 0.25,
              cueHeadWeight: 0.17,
              visemePeakWeight: 0.71,
            },
          },
        },
      },
    } as any)

    expect(rows[0]?.prosodyAuthoritySummary).toBe(
      'mode=energy-phoneme-hybrid | prosody=0.29 | mouth=0.25 | head=0.17 | visemePeak=0.71 | provenance=authority-bound | source=prosody-authority | segment=segment-authority-table-explicit-voice-1',
    )
    expect((rows[0] as any).speechEvidence?.prosodyAuthoritySummary).toBe(
      'mode=energy-phoneme-hybrid | prosody=0.29 | mouth=0.25 | head=0.17 | visemePeak=0.71 | provenance=authority-bound | source=prosody-authority | segment=segment-authority-table-explicit-voice-1',
    )
    expect(rows[0]?.speechSummaryLines).toContain(
      'prosody-authority: 模式 energy-phoneme-hybrid，韵律 0.29，口部 0.25，头部 0.17，峰值口型 0.71，权威绑定，来源 韵律权威，片段 segment-authority-table-explicit-voice-1',
    )
  })

  it('prefers current cue prosody over stale nested speech evidence when authority table rows rebuild speech evidence', () => {
    const cueId = 'segment-authority-table-current-prosody-rethreaded'
    const currentProsodySummary = `mode=energy-phoneme-hybrid | prosody=0.31 | mouth=0.27 | head=0.21 | visemePeak=0.76 | provenance=authority-bound | source=prosody-authority | segment=${cueId}`
    const rows = buildAuthorityTableRows([
      {
        cueId,
        cueText: '这一段 authority 表不该再把旧的 prosody 残影带回来。',
        surfaces: 'vrm',
        lanes: 'lipsync',
        driftStatus: 'all-aligned',
        aligned: true,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'lipsync',
            planned: 'I',
            consumed: 'I',
            source: 'prosody-authority',
            confidence: '0.94',
            aligned: true,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      [cueId]: {
        cueId,
        cueText: '这一段 authority 表不该再把旧的 prosody 残影带回来。',
        driftStatus: 'all-aligned',
        aligned: true,
        speechEvidence: {
          voiceSummary: null,
          bodyContinuitySummary: null,
          prosodyAuthoritySummary: 'mode=legacy-stale | prosody=0.11 | mouth=0.09 | head=0.07 | visemePeak=0.28 | provenance=authority-bound | source=prosody-authority | segment=segment-authority-table-stale-prosody-owner',
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
        authorityRendererTarget: 'vrm',
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['lipsync'],
        authorityMatchedSources: ['prosody-authority'],
        authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        authorityTrustSummary: null,
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        voiceSummary: null,
        prosodyAuthoritySummary: currentProsodySummary,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        traceEmbodimentSummary: null,
        visemeHintsSummary: null,
        settleAuthoritySummary: null,
        rendererDriftSummary: null,
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: cueId,
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          prosodyAuthority: {
            segmentId: 'segment-authority-table-stale-top-level-prosody',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'stale-top-level',
            cueProsodyWeight: 0.14,
            cueMouthWeight: 0.12,
            cueHeadWeight: 0.08,
            visemePeakWeight: 0.25,
          },
        },
      },
    } as any)

    expect(rows[0]?.prosodyAuthoritySummary).toBe(currentProsodySummary)
    expect((rows[0] as any).speechEvidence?.prosodyAuthoritySummary).toBe(currentProsodySummary)
    expect(rows[0]?.speechSummaryLines).toContain(
      'prosody-authority: 模式 energy-phoneme-hybrid，韵律 0.31，口部 0.27，头部 0.21，峰值口型 0.76，权威绑定，来源 韵律权威，片段 segment-authority-table-current-prosody-rethreaded',
    )
  })

  it('keeps row-level prosody authority and generic same-segment trust visible even when speechEvidence is absent', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-row-prosody-trust-1',
        cueText: '不要把这条声线 continuity 再看丢。',
        surfaces: 'vrm',
        lanes: 'lipsync',
        driftStatus: 'all-aligned',
        aligned: true,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'lipsync',
            planned: 'I',
            consumed: 'I',
            source: 'prosody-authority',
            confidence: '0.94',
            aligned: true,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-row-prosody-trust-1': {
        cueId: 'segment-row-prosody-trust-1',
        cueText: '不要把这条声线 continuity 再看丢。',
        driftStatus: 'all-aligned',
        aligned: true,
        speechEvidence: null,
        authorityRendererTarget: 'vrm',
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['lipsync'],
        authorityMatchedSources: ['prosody-authority'],
        authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        authorityTrustSummary: null,
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是口型。',
        authorityMismatchDisplay: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是口型。',
        voiceSummary: null,
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.33 | mouth=0.30 | head=0.22 | visemePeak=0.71 | provenance=authority-bound | source=prosody-authority | segment=segment-row-prosody-trust-1',
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        traceEmbodimentSummary: null,
        visemeHintsSummary: null,
        settleAuthoritySummary: null,
        rendererDriftSummary: null,
      },
    } as any)

    expect(rows[0]?.prosodyAuthoritySummary).toBe(
      'mode=energy-phoneme-hybrid | prosody=0.33 | mouth=0.30 | head=0.22 | visemePeak=0.71 | provenance=authority-bound | source=prosody-authority | segment=segment-row-prosody-trust-1',
    )
    expect(rows[0]?.authorityTrustSummary).toBe('VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。')
    expect(rows[0]?.speechSummaryLines).toContain(
      'authority-trust: VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。',
    )
    expect(rows[0]?.speechSummaryLines).toContain(
      'prosody-authority: 模式 energy-phoneme-hybrid，韵律 0.33，口部 0.30，头部 0.22，峰值口型 0.71，权威绑定，来源 韵律权威，片段 segment-row-prosody-trust-1',
    )
  })

  it('keeps a thin measured-return identity-continuity', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-thin-measured-return-outer-1',
        cueText: '先沿着这条 callback 线轻一点跟回去。',
        surfaces: 'vrm',
        lanes: 'lipsync',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'lipsync',
            planned: 'I',
            consumed: 'A',
            source: 'prosody-authority',
            confidence: '0.91',
            aligned: false,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-thin-measured-return-outer-1': {
        cueId: 'segment-thin-measured-return-outer-1',
        cueText: '先沿着这条 callback 线轻一点跟回去。',
        driftStatus: 'partial-drift',
        aligned: false,
        speechEvidence: null,
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['lipsync'],
        authorityMatchedSources: ['prosody-authority'],
        authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: 'Only runtime digest plus spine still expose the noisy-detour continuity line, so higher-level continuity should keep this thinner measured-return identity-continuity',
        authorityMismatchDisplay: 'Only runtime digest plus spine still expose the noisy-detour continuity line, so higher-level continuity should keep this thinner measured-return identity-continuity',
        voiceSummary: 'n/a',
        topVisemeSummary: 'n/a',
        cueSummary: 'n/a',
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: 'n/a',
        actionCue: 'n/a',
        weightSummary: 'n/a',
        personaStyleSummary: 'n/a',
        timingSummary: 'n/a',
        driverExecutionSummary: 'n/a',
        authorityTrustSummary: null,
        traceEmbodimentSummary: null,
        visemeHintsSummary: 'n/a',
        settleAuthoritySummary: 'authority-bound | segment=segment-thin-measured-return-outer-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync-only',
        rendererDriftSummary: null,
      },
    })

    expect((rows[0] as any).speechSummaryLines).toEqual([
      'authority: 目标 VRM，驱动 口型，来源 prosody-authority，命中 表情未命中 / 动作未命中 / 口型命中，噪声 detour 后，这条 measured-return 连续身体线仍由较薄证据维持',
      'authority-match: 表情未命中 / 动作未命中 / 口型命中',
      'authority-trust: 当前渲染体 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。',
      'authority-mismatch: Only runtime digest plus spine still expose the noisy-detour continuity line, so higher-level continuity should keep this thinner measured-return identity-continuity',
    ])
  })

  it('keeps same-her signature and reason tags visible in outer authority table speech summaries when shared-line proof survives on the speech row', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-same-her-authority-table-1',
        cueText: '身体、口型和声音还在一起托住这一段。',
        surfaces: 'vrm',
        lanes: 'lipsync, settle',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'lipsync',
            planned: 'closed',
            consumed: 'A',
            source: 'prosody-authority',
            confidence: '0.89',
            aligned: false,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-same-her-authority-table-1': {
        cueId: 'segment-same-her-authority-table-1',
        cueText: '身体、口型和声音还在一起托住这一段。',
        driftStatus: 'partial-drift',
        aligned: false,
        authoritySegmentMatched: true,
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['body', 'lipsync'],
        authorityMatchedSources: ['prosody-authority', 'voice-segment'],
        authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync+voice-only',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
        sameHerSignature: 'embodiment:body-lipsync-voice-rejoin',
        sameHerReasonTags: [
          'embodiment:audible-same-her-line',
          'embodiment:still-voiced-motion-line',
        ],
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情和动作还没回到这一段里，但身体线和声音还在继续托住同一个 living segment。',
        authorityTrustSummary: null,
        voiceSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        traceEmbodimentSummary: null,
        visemeHintsSummary: null,
        settleAuthoritySummary: 'authority-bound | segment=segment-same-her-authority-table-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment',
      },
    } as any)

    expect(rows[0]?.speechSummaryLines).toContain('same-her-signature: embodiment:body-lipsync-voice-rejoin')
    expect(rows[0]?.speechSummaryLines).toContain(
      'same-her-reasons: embodiment:audible-same-her-line, embodiment:still-voiced-motion-line',
    )
  })

  it('keeps execution safety-gate restraint visible in authority table speech summary lines before raw same-her tags', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-safety-gate-authority-table-1',
        cueText: '安全门先拦住这次执行。',
        surfaces: 'vrm',
        lanes: 'lipsync',
        driftStatus: 'all-aligned',
        aligned: true,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'lipsync',
            planned: 'hold',
            consumed: 'hold',
            source: 'resident-current-conscious-frame',
            confidence: '0.93',
            aligned: true,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-safety-gate-authority-table-1': {
        cueId: 'segment-safety-gate-authority-table-1',
        cueText: '安全门先拦住这次执行。',
        driftStatus: 'all-aligned',
        aligned: true,
        authoritySegmentMatched: true,
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authorityMatchedSources: ['resident-current-conscious-frame'],
        authorityBindingSummary: null,
        authorityMatchSummary: null,
        sameHerSignature: 'resident|measured-return|execution-restraint',
        sameHerReasonTags: [
          'execution-safety-gate:blocked-dispatch-restraint',
          'execution-safety-gate:confirmation-required',
          'execution-safety-gate:no-process-started',
          'embodiment-carry:measured-return',
        ],
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityTrustSummary: null,
        voiceSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        traceEmbodimentSummary: null,
        visemeHintsSummary: null,
        settleAuthoritySummary: null,
      },
    } as any)

    const safetyGateLine = 'execution-safety-gate: blocked dispatch 已被安全门拦住；需要确认；没有启动进程。'
    const rawReasonLine = 'same-her-reasons: execution-safety-gate:blocked-dispatch-restraint, execution-safety-gate:confirmation-required, execution-safety-gate:no-process-started, embodiment-carry:measured-return'

    expect(rows[0]?.speechSummaryLines).toContain(safetyGateLine)
    expect(rows[0]?.speechSummaryLines).toContain(rawReasonLine)
    expect(rows[0]?.speechSummaryLines.indexOf(safetyGateLine)).toBeLessThan(
      rows[0]?.speechSummaryLines.indexOf(rawReasonLine) ?? -1,
    )
  })

  it('adds settle authority labeling to settle rows without changing non-settle rows', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-settle-1',
        cueText: '这里是 settle authority.',
        surfaces: 'vrm',
        lanes: 'settle',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'settle',
            planned: 'settle',
            consumed: 'settle',
            source: 'n/a',
            confidence: 'n/a',
            aligned: false,
            settle: {
              vrmActionFadeMs: {
                planned: 280,
                consumed: 320,
              },
            },
            settleLines: [
              'vrmActionFadeMs: 280 -> 320',
            ],
          },
        ],
      },
    ] as any, {
      'segment-settle-1': {
        cueId: 'segment-settle-1',
        cueText: '这里是 settle authority.',
        driftStatus: 'partial-drift',
        aligned: false,
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['face', 'motion'],
        authorityMatchedSources: ['prosody-authority', 'timeline-projection'],
        authorityBindingSummary: 'target=vrm | drivers=face, motion | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:no',
        authorityMismatchSummary: 'lipsync-mismatch',
        authorityMismatchReasonSummary: '口型 authority 漂移，当前绑定来源是 prosody-authority、timeline-projection，实际执行落点是无执行。',
        authorityMatchSummary: 'face:yes motion:yes lipsync:no',
        voiceSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        traceEmbodimentSummary: null,
        visemeHintsSummary: null,
        settleAuthoritySummary: 'authority-bound | segment=segment-settle-1 | target=vrm | drivers=face, motion | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:no',
      },
    } as any)

    expect(rows).toEqual([
      {
        cueId: 'segment-settle-1',
        cueText: '这里是 settle authority.',
        driftStatus: 'partial-drift',
        aligned: false,
        surface: 'vrm',
        lane: 'settle',
        planned: 'settle',
        consumed: 'settle',
        source: 'n/a',
        confidence: 'n/a',
        settle: 'vrmActionFadeMs: 280 -> 320',
        settleLive2dFacialReleaseMs: 'n/a',
        settleLive2dMotionFollowThroughMs: 'n/a',
        settleVrmActionFadeMs: '280 -> 320',
        settleVrmExpressionBlendMs: 'n/a',
        authorityBindingSummary: 'target=vrm | drivers=face, motion | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:no',
        voiceSummary: 'n/a',
        prosodyAuthoritySummary: 'n/a',
        topVisemeSummary: 'n/a',
        cueSummary: 'n/a',
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: 'n/a',
        actionCue: 'n/a',
        weightSummary: 'n/a',
        personaStyleSummary: 'n/a',
        timingSummary: 'n/a',
        driverExecutionSummary: 'n/a',
        embodimentClosureStage: null,
        authorityMatchSummary: 'face:yes motion:yes lipsync:no',
        traceEmbodimentSummary: 'n/a',
        visemeHintsSummary: 'n/a',
        settleAuthoritySummary: 'authority-bound | segment=segment-settle-1 | target=vrm | drivers=face, motion | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:no',
        authorityTrustSummary: null,
        rendererDriftSummary: null,
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['face', 'motion'],
        authorityMatchedSources: ['prosody-authority', 'timeline-projection'],
        authorityMismatchSummary: 'lipsync-mismatch',
        authorityMismatchReasonSummary: '口型 authority 漂移，当前绑定来源是 prosody-authority、timeline-projection，实际执行落点是无执行。',
        authorityMismatchDisplay: '口型 authority 漂移，当前绑定来源是 prosody-authority、timeline-projection，实际执行落点是无执行。',
        speechSummaryLines: [
          'authority: 目标 VRM，驱动 表情、动作，来源 prosody-authority, timeline-projection，命中 表情命中 / 动作命中 / 口型未命中',
          'authority-match: 表情命中 / 动作命中 / 口型未命中',
          'authority-mismatch: 口型 authority 漂移，当前绑定来源是 prosody-authority、timeline-projection，实际执行落点是无执行。',
          'settle-authority: authority-bound，片段 segment-settle-1，目标 VRM，驱动 表情、动作，来源 prosody-authority, timeline-projection',
        ],
      },
    ])
  })

  it('prefers structured authority sources over parsing them back out of summary text', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-structured-source',
        cueText: '只看结构化 source threading。',
        surfaces: 'vrm',
        lanes: 'lipsync',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'lipsync',
            planned: 'I',
            consumed: 'A',
            source: 'prosody-authority',
            confidence: '0.91',
            aligned: false,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-structured-source': {
        cueId: 'segment-structured-source',
        cueText: '只看结构化 source threading。',
        driftStatus: 'partial-drift',
        aligned: false,
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['face', 'lipsync'],
        authorityMatchedSources: ['prosody-authority', 'timeline-projection'],
        authorityBindingSummary: 'target=vrm | drivers=face, lipsync | matches=face:yes motion:no lipsync:yes',
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMatchSummary: 'face:yes motion:no lipsync:yes',
        voiceSummary: null,
        topVisemeSummary: null,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        traceEmbodimentSummary: null,
        visemeHintsSummary: null,
        settleAuthoritySummary: null,
      },
    } as any)

    expect(rows).toEqual([
      expect.objectContaining({
        cueId: 'segment-structured-source',
        authorityMatchedSources: ['prosody-authority', 'timeline-projection'],
        authorityMismatchSummary: 'body-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '身体、动作 authority 漂移，当前绑定来源是 prosody-authority、timeline-projection，实际执行落点是无执行。',
        speechSummaryLines: [
          'authority: 目标 VRM，驱动 表情、口型，命中 表情命中 / 动作未命中 / 口型命中',
          'authority-match: 表情命中 / 动作未命中 / 口型命中',
          'authority-mismatch: 身体、动作 authority 漂移，当前绑定来源是 prosody-authority、timeline-projection，实际执行落点是无执行。',
        ],
      }),
    ])
  })

  it('keeps technical mismatch labels out of user-facing summary lines when a Chinese authority reason is available', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-human-readable-mismatch',
        cueText: '优先自然语言 authority explainability。',
        surfaces: 'vrm',
        lanes: 'lipsync',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'lipsync',
            planned: 'I',
            consumed: 'A',
            source: 'prosody-authority',
            confidence: '0.91',
            aligned: false,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-human-readable-mismatch': {
        cueId: 'segment-human-readable-mismatch',
        cueText: '优先自然语言 authority explainability。',
        driftStatus: 'partial-drift',
        aligned: false,
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['face', 'motion'],
        authorityMatchedSources: ['prosody-authority', 'timeline-projection'],
        authorityBindingSummary: 'target=vrm | drivers=face, motion | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:no',
        authorityMismatchSummary: 'lipsync-mismatch',
        authorityMismatchReasonSummary: '口型 authority 漂移，当前绑定来源是 prosody-authority、timeline-projection，实际执行落点是表情、动作。',
        authorityMatchSummary: 'face:yes motion:yes lipsync:no',
        voiceSummary: null,
        topVisemeSummary: null,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        traceEmbodimentSummary: null,
        visemeHintsSummary: null,
        settleAuthoritySummary: null,
      },
    } as any)

    expect(rows[0]?.authorityMismatchSummary).toBe('lipsync-mismatch')
    expect(rows[0]?.authorityMismatchReasonSummary).toBe('口型 authority 漂移，当前绑定来源是 prosody-authority、timeline-projection，实际执行落点是表情、动作。')
    expect(rows[0]?.speechSummaryLines).toEqual([
      'authority: 目标 VRM，驱动 表情、动作，来源 prosody-authority, timeline-projection，命中 表情命中 / 动作命中 / 口型未命中',
      'authority-match: 表情命中 / 动作命中 / 口型未命中',
      'authority-mismatch: 口型 authority 漂移，当前绑定来源是 prosody-authority、timeline-projection，实际执行落点是表情、动作。',
    ])
  })

  it('prefers upstream authority mismatch display text over locally rebuilt reason text', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-display-first',
        cueText: '优先使用上游 authority 展示文案。',
        surfaces: 'vrm',
        lanes: 'lipsync',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'lipsync',
            planned: 'I',
            consumed: 'A',
            source: 'prosody-authority',
            confidence: '0.91',
            aligned: false,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-display-first': {
        cueId: 'segment-display-first',
        cueText: '优先使用上游 authority 展示文案。',
        driftStatus: 'partial-drift',
        aligned: false,
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['face', 'motion'],
        authorityMatchedSources: ['prosody-authority', 'timeline-projection'],
        authorityBindingSummary: 'target=vrm | drivers=face, motion | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:no',
        authorityMismatchSummary: 'lipsync-mismatch',
        authorityMismatchReasonSummary: '口型 authority 漂移，当前绑定来源是 prosody-authority、timeline-projection，实际执行落点是表情、动作。',
        authorityMismatchDisplay: '上游 authority 展示：口型落点和绑定来源已分叉，但仍处于同一条中文主链解释中。',
        authorityMatchSummary: 'face:yes motion:yes lipsync:no',
        voiceSummary: null,
        topVisemeSummary: null,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        traceEmbodimentSummary: null,
        visemeHintsSummary: null,
        settleAuthoritySummary: null,
      },
    } as any)

    expect(rows[0]?.speechSummaryLines).toEqual([
      'authority: 目标 VRM，驱动 表情、动作，来源 prosody-authority, timeline-projection，命中 表情命中 / 动作命中 / 口型未命中',
      'authority-match: 表情命中 / 动作命中 / 口型未命中',
      'authority-mismatch: 上游 authority 展示：口型落点和绑定来源已分叉，但仍处于同一条中文主链解释中。',
    ])
  })

  it('keeps body-backed identity-continuity', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-body-table-1',
        cueText: '这条身体线还在托住同一个 living segment。',
        surfaces: 'vrm',
        lanes: 'lipsync',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'lipsync',
            planned: 'I',
            consumed: 'A',
            source: 'prosody-authority',
            confidence: '0.91',
            aligned: false,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-body-table-1': {
        cueId: 'segment-body-table-1',
        cueText: '这条身体线还在托住同一个 living segment。',
        driftStatus: 'partial-drift',
        aligned: false,
        authoritySegmentMatched: true,
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['body'],
        authorityMatchedSources: ['prosody-authority'],
        authorityBindingSummary: 'target=vrm | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no | lane=body-only',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch, lipsync-mismatch',
        authorityMismatchReasonSummary: '表情、动作、口型 authority 已经漂离，但身体线还托着同一段 living segment。',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:no',
        voiceSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        traceEmbodimentSummary: null,
        visemeHintsSummary: null,
        settleAuthoritySummary: null,
      },
    } as any)

    expect(rows[0]?.authorityTrustSummary).toBe('VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。')
    expect(rows[0]?.speechSummaryLines).toEqual([
      'authority: 目标 VRM，驱动 身体，来源 prosody-authority，命中 身体命中 / 表情未命中 / 动作未命中 / 口型未命中，当前仅剩身体维持同一段连续性',
      'authority-match: 身体命中 / 表情未命中 / 动作未命中 / 口型未命中',
      'authority-trust: VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
      'authority-mismatch: 表情、动作、口型 authority 已经漂离，但身体线还托着同一段 living segment。',
    ])
  })

  it('keeps body-face-motion same-her recovery and remaining-open lipsync voice closure visible in authority table rows', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-body-face-motion-table-1',
        cueText: '身体、表情、动作已经重新并到同一段里了。',
        surfaces: 'live2d',
        lanes: 'expression',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'live2d',
            lane: 'expression',
            planned: 'focused',
            consumed: 'focused',
            source: 'prosody-authority',
            confidence: '0.94',
            aligned: true,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-body-face-motion-table-1': {
        cueId: 'segment-body-face-motion-table-1',
        cueText: '身体、表情、动作已经重新并到同一段里了。',
        driftStatus: 'partial-drift',
        aligned: false,
        authoritySegmentMatched: true,
        authorityRendererTarget: 'live2d',
        authorityMatchedDrivers: ['face', 'motion'],
        authorityMatchedSources: ['prosody-authority', 'timeline-projection'],
        authorityBindingSummary: 'target=live2d | drivers=face, motion | sources=prosody-authority, timeline-projection | matches=body:yes face:yes motion:yes lipsync:no | lane=body+face+motion-only | remaining-open=lipsync+voice',
        authorityMismatchSummary: 'lipsync-mismatch',
        authorityMismatchReasonSummary: '口型 authority 还没有回到这一段里，但身体、表情、动作已经重新并到同一个 living segment。',
        authorityMatchSummary: 'body:yes face:yes motion:yes lipsync:no',
        authorityTrustSummary: '当前渲染体 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。',
        voiceSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        traceEmbodimentSummary: null,
        visemeHintsSummary: null,
        settleAuthoritySummary: 'authority-bound | segment=segment-body-face-motion-table-1 | target=live2d | drivers=face, motion | sources=prosody-authority, timeline-projection | lane=body+face+motion-only | remaining-open=lipsync+voice',
      },
    } as any)

    expect(rows[0]?.speechSummaryLines).toEqual(expect.arrayContaining([
      'authority: 目标 Live2D，驱动 表情、动作，来源 prosody-authority, timeline-projection，命中 身体命中 / 表情命中 / 动作命中 / 口型未命中，当前仅剩身体、表情、动作维持同一段连续性，口型和声音还没有重新并回这一段',
      'authority-match: 身体命中 / 表情命中 / 动作命中 / 口型未命中',
      'authority-mismatch: 口型 authority 还没有回到这一段里，但身体、表情、动作已经重新并到同一个 living segment。',
    ]))
  })

  it('enriches sparse generated trace embodiment summaries in authority table rows with bound authority and execution context', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-trace-enriched',
        cueText: '这里需要把轨迹落点补全到 authority table。',
        surfaces: 'vrm',
        lanes: 'lipsync',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'lipsync',
            planned: 'I',
            consumed: 'A',
            source: 'prosody-authority',
            confidence: '0.91',
            aligned: false,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-trace-enriched': {
        cueId: 'segment-trace-enriched',
        cueText: '这里需要把轨迹落点补全到 authority table。',
        driftStatus: 'partial-drift',
        aligned: false,
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['face', 'motion'],
        authorityMatchedSources: ['prosody-authority', 'timeline-projection'],
        authorityBindingSummary: 'target=vrm | drivers=face, motion | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:no',
        authorityMismatchSummary: 'lipsync-mismatch',
        authorityMismatchReasonSummary: '口型 authority 漂移，当前绑定来源是 prosody-authority、timeline-projection，实际执行落点是表情、动作。',
        authorityMatchSummary: 'face:yes motion:yes lipsync:no',
        voiceSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: 'face=attentive/focused@0.61 hold=320 src=prosody-authority conf=0.83 | motion=observe_focus mode=observe-first hold=240 src=timeline-projection conf=0.79',
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
        visemeHintsSummary: null,
        settleAuthoritySummary: null,
      },
    } as any)

    expect(rows[0]?.traceEmbodimentSummary).toBe('turn=care | closure=grounded-recall | surface=procedural-carry | authority=face, motion | execution=face+motion | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall')
    expect(rows[0]?.speechSummaryLines).toContain('trace-embodiment: 关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 表情、动作，实际执行 表情+动作，场景 深夜疲劳照看，姿态 先观察后表达，来源链 fatigue -> care -> grounded-recall')
  })

  it('prefers same-cue speech evidence execution over stale top-level execution when rebuilding authority table trace embodiment summaries', () => {
    const cueId = 'segment-authority-table-same-cue-execution-1'
    const rows = buildAuthorityTableRows([
      {
        cueId,
        cueText: '身体、口型和声音已经回到同一条 living line。',
        surfaces: 'vrm',
        lanes: 'lipsync',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'lipsync',
            planned: 'closed',
            consumed: 'A',
            source: 'prosody-authority',
            confidence: '0.89',
            aligned: false,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      [cueId]: {
        cueId,
        cueText: '身体、口型和声音已经回到同一条 living line。',
        driftStatus: 'partial-drift',
        aligned: false,
        authoritySegmentMatched: true,
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['body', 'lipsync', 'voice'],
        authorityMatchedSources: ['prosody-authority', 'voice-segment'],
        authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync+voice-only',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情和动作还没回到这一段里，但身体、口型和声音已经继续托住同一个 living segment。',
        authorityMismatchDisplay: '表情和动作还没回到这一段里，但身体、口型和声音已经继续托住同一个 living segment。',
        authorityTrustSummary: null,
        voiceSummary: `zh-CN | closure=0.78 | precision=0.81 | provenance=authority-bound | segment=${cueId} | source=prosody-authority`,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: true,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: `body=measured-return seg=${cueId} | lipsync=energy-phoneme-hybrid phase=playing`,
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=speech-rejoin',
        visemeHintsSummary: null,
        settleAuthoritySummary: `authority-bound | segment=${cueId} | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | lane=body+lipsync+voice-only`,
        speechEvidence: {
          voiceSummary: `zh-CN | closure=0.78 | precision=0.81 | provenance=authority-bound | segment=${cueId} | source=prosody-authority`,
          bodyContinuitySummary: null,
          embodimentClosureStage: null,
          prosodyAuthoritySummary: `mode=energy-phoneme-hybrid | prosody=0.31 | mouth=0.29 | head=0.18 | visemePeak=0.70 | provenance=authority-bound | source=prosody-authority | segment=${cueId}`,
          authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes voice:yes',
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: true,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: `body=measured-return seg=${cueId} | lipsync=energy-phoneme-hybrid phase=playing | voice=authority-bound phase=playing seg=${cueId}`,
          visemeHintsSummary: null,
        },
      },
    } as any)

    expect(rows[0]?.driverExecutionSummary).toBe(
      `body=measured-return seg=${cueId} | lipsync=energy-phoneme-hybrid phase=playing | voice=authority-bound phase=playing seg=${cueId}`,
    )
    expect(rows[0]?.traceEmbodimentSummary).toBe(
      'turn=care | closure=grounded-recall | surface=speech-rejoin | authority=body, lipsync, voice | execution=body+lipsync+voice',
    )
    expect(rows[0]?.speechSummaryLines).toContain(
      'trace-embodiment: 关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 speech-rejoin，权威驱动 身体、口型、声音，实际执行 身体+口型+声音',
    )
  })

  it('does not rehydrate another cue authority summary after speech rows already scoped it away', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-current-authority',
        cueText: '当前 authority cue。',
        surfaces: 'vrm',
        lanes: 'settle',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'settle',
            planned: 'settle',
            consumed: 'settle',
            source: 'n/a',
            confidence: 'n/a',
            aligned: false,
            settle: {
              vrmActionFadeMs: {
                planned: 280,
                consumed: 320,
              },
            },
            settleLines: [
              'vrmActionFadeMs: 280 -> 320',
            ],
          },
        ],
      },
    ] as any, {
      'segment-current-authority': {
        cueId: 'segment-current-authority',
        cueText: '当前 authority cue。',
        driftStatus: 'partial-drift',
        aligned: false,
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['lipsync'],
        authorityMatchedSources: ['prosody-authority'],
        authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。',
        authorityMismatchDisplay: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。',
        speechEvidence: {
          voiceSummary: null,
          authorityMatchSummary: 'face:no motion:no lipsync:yes',
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: false,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: null,
          visemeHintsSummary: null,
        },
        voiceSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=none',
        visemeHintsSummary: null,
        settleAuthoritySummary: 'authority-bound | segment=segment-current-authority | target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
      },
    } as any)

    expect(rows).toEqual([
      {
        cueId: 'segment-current-authority',
        cueText: '当前 authority cue。',
        driftStatus: 'partial-drift',
        aligned: false,
        surface: 'vrm',
        lane: 'settle',
        planned: 'settle',
        consumed: 'settle',
        source: 'n/a',
        confidence: 'n/a',
        settle: 'vrmActionFadeMs: 280 -> 320',
        settleLive2dFacialReleaseMs: 'n/a',
        settleLive2dMotionFollowThroughMs: 'n/a',
        settleVrmActionFadeMs: '280 -> 320',
        settleVrmExpressionBlendMs: 'n/a',
        authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        voiceSummary: 'n/a',
        prosodyAuthoritySummary: 'n/a',
        topVisemeSummary: 'n/a',
        cueSummary: 'n/a',
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: 'n/a',
        actionCue: 'n/a',
        weightSummary: 'n/a',
        personaStyleSummary: 'n/a',
        timingSummary: 'n/a',
        driverExecutionSummary: 'n/a',
        embodimentClosureStage: null,
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=none',
        visemeHintsSummary: 'n/a',
        settleAuthoritySummary: 'authority-bound | segment=segment-current-authority | target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
        authorityTrustSummary: '当前渲染体 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。',
        rendererDriftSummary: null,
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['lipsync'],
        authorityMatchedSources: ['prosody-authority'],
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。',
        authorityMismatchDisplay: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。',
        speechSummaryLines: [
          'authority: 目标 VRM，驱动 口型，来源 prosody-authority，命中 表情未命中 / 动作未命中 / 口型命中',
          'authority-match: 表情未命中 / 动作未命中 / 口型命中',
          'authority-trust: 当前渲染体 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。',
          'authority-mismatch: 表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。',
          'trace-embodiment: 关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 口型，实际执行 无',
          'settle-authority: authority-bound，片段 segment-current-authority，目标 VRM，驱动 口型，来源 prosody-authority',
        ],
      },
    ])
  })
  it('surfaces same-body-line trust in authority table rows when face motion and lipsync all rejoin the same VRM segment', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-same-body-table-1',
        cueText: '已经一起回到这条身体线了。',
        surfaces: 'vrm',
        lanes: 'action',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'action',
            planned: 'observe_focus',
            consumed: 'observe_focus',
            source: 'timeline-projection',
            confidence: '0.88',
            aligned: true,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-same-body-table-1': {
        cueId: 'segment-same-body-table-1',
        cueText: '已经一起回到这条身体线了。',
        driftStatus: 'partial-drift',
        aligned: false,
        speechEvidence: {
          voiceSummary: '上游语音韵律',
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-same-body-table-1',
          authorityMatchSummary: '上游 authority 命中',
          topVisemeSummary: '上游主口型',
          cueSummary: '上游微表情线索',
          cueIdentityPresent: true,
          cueProsodyPresent: true,
          personaStyleSummary: '上游人设风格',
          timingSummary: '上游时序节奏',
          driverExecutionSummary: '上游驱动执行',
          visemeHintsSummary: '上游口型提示',
        },
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        authorityMatchedSources: ['prosody-authority', 'timeline-projection'],
        authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        authorityTrustSummary: 'VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        voiceSummary: '上游语音韵律',
        topVisemeSummary: '上游主口型',
        cueSummary: '上游微表情线索',
        cueIdentityPresent: true,
        cueProsodyPresent: true,
        faceCue: 'focused',
        actionCue: 'observe_focus',
        weightSummary: 'prosody=0.36 mouth=0.28 head=0.32',
        personaStyleSummary: '上游人设风格',
        timingSummary: '上游时序节奏',
        driverExecutionSummary: '上游驱动执行',
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=face, motion, lipsync | execution=face+motion+lipsync',
        visemeHintsSummary: '上游口型提示',
        settleAuthoritySummary: 'authority-bound | segment=segment-same-body-table-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
        rendererDriftSummary: null,
      },
    } as any)

    expect(rows[0]?.authorityTrustSummary).toBe('VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。')
    expect(rows[0]?.speechSummaryLines).toContain('authority-trust: VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。')
  })

  it('keeps thinner affective-residue room-making wording visible in authority table settle lines when speech rows carry the measured-return line', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-thin-affective-table-1',
        cueText: '先轻一点接住这条线。',
        surfaces: 'vrm',
        lanes: 'settle',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'settle',
            planned: 'settle',
            consumed: 'settle',
            source: 'n/a',
            confidence: 'n/a',
            aligned: false,
            settle: {
              vrmActionFadeMs: {
                planned: 280,
                consumed: 320,
              },
            },
            settleLines: [
              'vrmActionFadeMs: 280 -> 320',
            ],
          },
        ],
      },
    ] as any, {
      'segment-thin-affective-table-1': {
        cueId: 'segment-thin-affective-table-1',
        cueText: '先轻一点接住这条线。',
        driftStatus: 'partial-drift',
        aligned: false,
        speechEvidence: {
          voiceSummary: null,
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-thin-affective-table-1',
          authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: false,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: null,
          visemeHintsSummary: null,
        },
        authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        authorityTrustSummary: null,
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        settleAuthoritySummary: 'authority-bound | segment=segment-thin-affective-table-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
        rendererDriftSummary: null,
        voiceSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=face, motion, lipsync | execution=face+motion+lipsync',
        visemeHintsSummary: null,
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        authorityMatchedSources: ['prosody-authority', 'timeline-projection'],
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      },
    } as any)

    expect(rows[0]?.settleAuthoritySummary).toContain('余韵还在')
    expect(rows[0]?.speechSummaryLines).toContain(
      'settle-authority: authority-bound，片段 segment-thin-affective-table-1，目标 VRM，驱动 表情、动作、口型，来源 prosody-authority, timeline-projection，缘由 余韵还在，先留白，别立刻把温度放大',
    )
  })

  it('keeps repair-before-closeness trust visible in authority table rows when outer speech summaries rebuild from row-level companionship hints', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-repair-table-1',
        cueText: '我先陪你把这段收稳。',
        surfaces: 'vrm',
        lanes: 'expression',
        driftStatus: 'aligned',
        aligned: true,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'expression',
            planned: 'recover-soft',
            consumed: 'recover-soft',
            source: 'prosody-authority',
            confidence: '0.87',
            aligned: true,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-repair-table-1': {
        cueId: 'segment-repair-table-1',
        cueText: '我先陪你把这段收稳。',
        driftStatus: 'aligned',
        aligned: true,
        authorityRendererTarget: 'vrm',
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        speechEvidence: {
          voiceSummary: '上游语音韵律',
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.24 | mouth=0.20 | head=0.18 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-repair-table-1',
          authorityMatchSummary: '上游 authority 命中',
          topVisemeSummary: '上游主口型',
          cueSummary: '上游微表情线索',
          cueIdentityPresent: true,
          cueProsodyPresent: true,
          personaStyleSummary: '上游人设风格',
          timingSummary: '上游时序节奏',
          driverExecutionSummary: '上游驱动执行',
          visemeHintsSummary: '上游口型提示',
        },
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        authorityMatchedSources: ['prosody-authority', 'timeline-projection'],
        authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        voiceSummary: '上游语音韵律',
        topVisemeSummary: '上游主口型',
        cueSummary: '上游微表情线索',
        cueIdentityPresent: true,
        cueProsodyPresent: true,
        faceCue: 'recover-soft',
        actionCue: 'stillness_guard',
        weightSummary: 'prosody=0.24 mouth=0.20 head=0.18',
        personaStyleSummary: '上游人设风格',
        timingSummary: '上游时序节奏',
        driverExecutionSummary: '上游驱动执行',
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=face, motion, lipsync | execution=face+motion+lipsync',
        visemeHintsSummary: '上游口型提示',
        settleAuthoritySummary: 'authority-bound | segment=segment-repair-table-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
        rendererDriftSummary: null,
      },
    } as any)

    expect(rows[0]?.authorityTrustSummary).toBe('VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。')
    expect(rows[0]?.speechSummaryLines).toContain('authority-trust: VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。')
  })

  it('keeps same-turn-if-invited measured-return trust visible in authority table rows when outer speech summaries inherit callback-line guidance', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-invited-table-1',
        cueText: '我还在，只是中性可见占位。',
        surfaces: 'vrm',
        lanes: 'expression',
        driftStatus: 'aligned',
        aligned: true,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'expression',
            planned: 'recover-soft',
            consumed: 'recover-soft',
            source: 'prosody-authority',
            confidence: '0.87',
            aligned: true,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-invited-table-1': {
        cueId: 'segment-invited-table-1',
        cueText: '我还在，只是中性可见占位。',
        driftStatus: 'aligned',
        aligned: true,
        authorityRendererTarget: 'vrm',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        speechEvidence: {
          voiceSummary: '上游语音韵律',
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.22 | mouth=0.20 | head=0.18 | visemePeak=0.70 | provenance=authority-bound | source=prosody-authority | segment=segment-invited-table-1',
          authorityMatchSummary: '上游 authority 命中',
          topVisemeSummary: '上游主口型',
          cueSummary: '上游微表情线索',
          cueIdentityPresent: true,
          cueProsodyPresent: true,
          personaStyleSummary: '上游人设风格',
          timingSummary: '上游时序节奏',
          driverExecutionSummary: '上游驱动执行',
          visemeHintsSummary: '上游口型提示',
        },
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        authorityMatchedSources: ['prosody-authority', 'timeline-projection'],
        authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        authorityTrustSummary: 'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。',
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        voiceSummary: '上游语音韵律',
        topVisemeSummary: '上游主口型',
        cueSummary: '上游微表情线索',
        cueIdentityPresent: true,
        cueProsodyPresent: true,
        faceCue: 'recover-soft',
        actionCue: 'stillness_guard',
        weightSummary: 'prosody=0.22 mouth=0.20 head=0.18',
        personaStyleSummary: '上游人设风格',
        timingSummary: '上游时序节奏',
        driverExecutionSummary: '上游驱动执行',
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=face, motion, lipsync | execution=face+motion+lipsync',
        visemeHintsSummary: '上游口型提示',
        settleAuthoritySummary: 'authority-bound | segment=segment-invited-table-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
        rendererDriftSummary: null,
      },
    } as any)

    expect(rows[0]?.authorityTrustSummary).toBe('VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。')
    expect(rows[0]?.speechSummaryLines).toContain('authority-trust: VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。')
  })

  it('keeps interruption-resume live2d same-line recovery visible in authority table rows after execution, aliases, and authority all rejoin the later callback segment', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-later-callback-return',
        cueText: '我还在，只是先别一下子靠太近。',
        surfaces: 'live2d',
        lanes: 'expression',
        driftStatus: 'aligned',
        aligned: true,
        detailRows: [
          {
            surface: 'live2d',
            lane: 'expression',
            planned: 'RecoverSoft',
            consumed: 'RecoverSoft',
            source: 'prosody-authority',
            confidence: '0.94',
            aligned: true,
            settleLines: [],
          },
          {
            surface: 'live2d',
            lane: 'motion',
            planned: 'StillnessGuard',
            consumed: 'StillnessGuard',
            source: 'timeline-projection',
            confidence: '0.90',
            aligned: true,
            settleLines: [],
          },
          {
            surface: 'live2d',
            lane: 'settle',
            planned: 'settle',
            consumed: 'settle',
            source: 'n/a',
            confidence: 'n/a',
            aligned: true,
            settle: {
              live2dFacialReleaseMs: {
                planned: 380,
                consumed: 380,
              },
              live2dMotionFollowThroughMs: {
                planned: 460,
                consumed: 460,
              },
            },
            settleLines: [
              'live2dFacialReleaseMs: 380 -> 380',
              'live2dMotionFollowThroughMs: 460 -> 460',
            ],
          },
        ],
      },
    ] as any, {
      'segment-later-callback-return': {
        cueId: 'segment-later-callback-return',
        cueText: '我还在，只是先别一下子靠太近。',
        driftStatus: 'aligned',
        aligned: true,
        authorityRendererTarget: 'live2d',
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        speechEvidence: {
          voiceSummary: 'zh-CN | closure=0.72 | precision=0.88 | companion=repair-before-closeness',
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.38 | mouth=0.34 | head=0.29 | visemePeak=0.72 | provenance=authority-bound | source=prosody-authority | segment=segment-later-callback-return',
          authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
          topVisemeSummary: 'closed:0.78, I:0.72',
          cueSummary: 'soft-gaze / idle_settle | prosody=0.38 mouth=0.34 head=0.29',
          cueIdentityPresent: true,
          cueProsodyPresent: true,
          personaStyleSummary: 'repair-before-closeness | soften / linger',
          timingSummary: 'facial=360 action=320 emotion=360 | segment-start | soft-interrupt | hold',
          driverExecutionSummary: 'face=thinking/soft-release@0.41 hold=360 pre=soft-breath post=soft-release src=prosody-authority conf=0.94 | motion=idle_settle mode=attentive idle=steady_focus@0.18 hold=320 src=timeline-projection conf=0.90 | lipsync=energy-phoneme-hybrid phase=playing',
          visemeHintsSummary: 'closed:0.78@0.93 src=prosody-authority segment=segment-later-callback-return | I:0.72@0.95 src=prosody-authority segment=segment-later-callback-return',
        },
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        authorityMatchedSources: ['prosody-authority', 'timeline-projection'],
        authorityBindingSummary: 'target=live2d | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        authorityTrustSummary: 'Live2D 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        voiceSummary: 'zh-CN | closure=0.72 | precision=0.88 | companion=repair-before-closeness',
        topVisemeSummary: 'closed:0.78, I:0.72',
        cueSummary: 'soft-gaze / idle_settle | prosody=0.38 mouth=0.34 head=0.29',
        cueIdentityPresent: true,
        cueProsodyPresent: true,
        faceCue: 'soft-gaze',
        actionCue: 'idle_settle',
        weightSummary: 'prosody=0.38 mouth=0.34 head=0.29',
        personaStyleSummary: 'repair-before-closeness | soften / linger',
        timingSummary: 'facial=360 action=320 emotion=360 | segment-start | soft-interrupt | hold',
        driverExecutionSummary: 'face=thinking/soft-release@0.41 hold=360 pre=soft-breath post=soft-release src=prosody-authority conf=0.94 | motion=idle_settle mode=attentive idle=steady_focus@0.18 hold=320 src=timeline-projection conf=0.90 | lipsync=energy-phoneme-hybrid phase=playing',
        traceEmbodimentSummary: 'turn=answer | closure=same-her-carry | surface=same-thread-continuation | authority=face, motion, lipsync | execution=face+motion+lipsync',
        visemeHintsSummary: 'closed:0.78@0.93 src=prosody-authority segment=segment-later-callback-return | I:0.72@0.95 src=prosody-authority segment=segment-later-callback-return',
        settleAuthoritySummary: 'authority-bound | segment=segment-later-callback-return | target=live2d | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
        rendererDriftSummary: null,
      },
    } as any)

    expect(rows[0]?.authorityTrustSummary).toBe('Live2D 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。')
    expect(rows[0]?.driverExecutionSummary).toContain('face=thinking/soft-release@0.41')
    expect(rows[0]?.driverExecutionSummary).toContain('motion=idle_settle')
    expect(rows[0]?.driverExecutionSummary).toContain('lipsync=energy-phoneme-hybrid phase=playing')
    expect(rows[0]?.voiceSummary).toContain('closure=0.72')
    expect(rows[0]?.prosodyAuthoritySummary).toContain('segment=segment-later-callback-return')
    expect(rows[0]?.speechSummaryLines).toContain('authority-trust: Live2D 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。')
    expect(rows[0]?.speechSummaryLines.some(line => line.startsWith('driver-execution: '))).toBe(true)
    expect(rows[0]?.traceEmbodimentSummary).toBe('turn=answer | closure=same-her-carry | surface=same-thread-continuation | authority=face, motion, lipsync | execution=face+motion+lipsync')
    expect(rows[0]?.speechSummaryLines.some(line => line.startsWith('trace-embodiment: '))).toBe(true)
    expect(rows[2]?.settle).toBe('live2dFacialReleaseMs: 380 -> 380 | live2dMotionFollowThroughMs: 460 -> 460')
    expect(rows[2]?.settleLive2dFacialReleaseMs).toBe('380 -> 380')
    expect(rows[2]?.settleLive2dMotionFollowThroughMs).toBe('460 -> 460')
    expect(rows[2]?.speechSummaryLines).toContain('settle-authority: authority-bound，片段 segment-later-callback-return，目标 Live2D，驱动 表情、动作、口型，来源 prosody-authority, timeline-projection')
  })

  it('rebuilds thin affective authority trust in authority table rows from settle authority reason when outer trust is absent', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-thin-affective-table-trust-1',
        cueText: '把这层余温留在外面。',
        surfaces: 'vrm',
        lanes: 'settle',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'settle',
            planned: 'settle',
            consumed: 'settle',
            source: 'n/a',
            confidence: 'n/a',
            aligned: false,
            settle: null,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-thin-affective-table-trust-1': {
        cueId: 'segment-thin-affective-table-trust-1',
        cueText: '把这层余温留在外面。',
        driftStatus: 'partial-drift',
        aligned: false,
        speechEvidence: {
          voiceSummary: null,
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-thin-affective-table-trust-1',
          authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: false,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: null,
          visemeHintsSummary: null,
        },
        authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        authorityTrustSummary: null,
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        settleAuthoritySummary: 'authority-bound | segment=segment-thin-affective-table-trust-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
        rendererDriftSummary: null,
        voiceSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=face, motion, lipsync | execution=face+motion+lipsync',
        visemeHintsSummary: null,
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        authorityMatchedSources: ['prosody-authority', 'timeline-projection'],
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      },
    } as any)

    expect(rows[0]?.authorityTrustSummary).toContain('余韵还在，先留白，别立刻把温度放大')
    expect(rows[0]?.speechSummaryLines).toContain('authority-trust: VRM 这段 authority 仍带着“余韵还在，先留白，别立刻把温度放大”这一层关系余温，所以外层观察不该把她压回纯技术 settle。 当前还要守住 linger blink / soften gaze 的关系节奏。')
  })

  it('prefers richer settle-reason trust over thinner generic upstream trust in authority table rows', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-thin-affective-table-runtime-override-1',
        cueText: '把这层余温留在外面。',
        surfaces: 'vrm',
        lanes: 'settle',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'settle',
            planned: 'settle',
            consumed: 'settle',
            source: 'n/a',
            confidence: 'n/a',
            aligned: false,
            settle: null,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-thin-affective-table-runtime-override-1': {
        cueId: 'segment-thin-affective-table-runtime-override-1',
        cueText: '把这层余温留在外面。',
        driftStatus: 'partial-drift',
        aligned: false,
        speechEvidence: {
          voiceSummary: null,
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-thin-affective-table-runtime-override-1',
          authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: false,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: null,
          visemeHintsSummary: null,
        },
        authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        authorityTrustSummary: 'VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        settleAuthoritySummary: 'authority-bound | segment=segment-thin-affective-table-runtime-override-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
        rendererDriftSummary: null,
        voiceSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=face, motion, lipsync | execution=face+motion+lipsync',
        visemeHintsSummary: null,
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        authorityMatchedSources: ['prosody-authority', 'timeline-projection'],
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      },
    } as any)

    expect(rows[0]?.authorityTrustSummary).toContain('余韵还在，先留白，别立刻把温度放大')
    expect(rows[0]?.speechSummaryLines).toContain('authority-trust: VRM 这段 authority 仍带着“余韵还在，先留白，别立刻把温度放大”这一层关系余温，所以外层观察不该把她压回纯技术 settle。 当前还要守住 linger blink / soften gaze 的关系节奏。')
  })

  it('preserves body-carried lane truth from authority match summary when matched drivers lag behind the structured same-her recovery', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-body-summary-table-1',
        cueText: '身体线已经把这一段重新托回来了。',
        surfaces: 'vrm',
        lanes: 'lipsync',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'vrm',
            lane: 'lipsync',
            planned: 'closed',
            consumed: 'A',
            source: 'prosody-authority',
            confidence: '0.88',
            aligned: false,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-body-summary-table-1': {
        cueId: 'segment-body-summary-table-1',
        cueText: '身体线已经把这一段重新托回来了。',
        driftStatus: 'partial-drift',
        aligned: false,
        authoritySegmentMatched: true,
        authorityRendererTarget: 'vrm',
        authorityMatchedDrivers: ['lipsync'],
        authorityMatchedSources: ['prosody-authority', 'voice-segment'],
        authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情和动作还没回到这一段里，但身体线已经继续托住同一个 living segment。',
        authorityTrustSummary: null,
        voiceSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        traceEmbodimentSummary: null,
        visemeHintsSummary: null,
        settleAuthoritySummary: null,
      },
    } as any)

    expect(rows[0]?.authorityMismatchSummary).toBe('face-mismatch, motion-mismatch')
    expect(rows[0]?.authorityTrustSummary).toBe('VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。')
    expect(rows[0]?.speechSummaryLines).toContain('authority-match: 身体命中 / 表情未命中 / 动作未命中 / 口型命中')
    expect(rows[0]?.speechSummaryLines).toContain('authority-trust: VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。')
    expect(rows[0]?.speechSummaryLines).toContain('authority-mismatch: 表情和动作还没回到这一段里，但身体线已经继续托住同一个 living segment。')
  })

  it('extracts embodiment closure stage from driver execution summary when audible-body continuity is the active identity-continuity', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-audible-body-closure-stage-1',
        cueText: '先沿着这条还活着的线中性可见占位。',
        surfaces: 'live2d',
        lanes: 'lipsync',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'live2d',
            lane: 'lipsync',
            planned: 'I',
            consumed: 'A',
            source: 'prosody-authority',
            confidence: '0.91',
            aligned: false,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-audible-body-closure-stage-1': {
        cueId: 'segment-audible-body-closure-stage-1',
        cueText: '先沿着这条还活着的线中性可见占位。',
        driftStatus: 'partial-drift',
        aligned: false,
        authoritySegmentMatched: true,
        authorityRendererTarget: 'live2d',
        authorityMatchedDrivers: ['body', 'lipsync'],
        authorityMatchedSources: ['prosody-authority'],
        authorityBindingSummary: 'target=live2d | drivers=body, lipsync | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:yes',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: 'body still carries the same living segment while face and motion have not rejoined yet.',
        authorityMismatchDisplay: 'body still carries the same living segment while face and motion have not rejoined yet.',
        authorityTrustSummary: null,
        voiceSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: 'body=measured-return seg=segment-audible-body-closure-stage-1 | lipsync=energy-phoneme-hybrid phase=playing seg=segment-audible-body-closure-stage-1 | closure=audible-body-carry',
        traceEmbodimentSummary: null,
        visemeHintsSummary: null,
        settleAuthoritySummary: null,
      },
    } as any)

    expect(rows[0]?.embodimentClosureStage).toBe('audible-body-carry')
  })

  it('does not reuse driver execution summary when it explicitly belongs to another segment than the current authority table cue', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-current-authority-table-driver',
        cueText: '别把别的执行快照串回当前这段身体线。',
        surfaces: 'live2d',
        lanes: 'lipsync',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'live2d',
            lane: 'lipsync',
            planned: 'I',
            consumed: 'A',
            source: 'prosody-authority',
            confidence: '0.91',
            aligned: false,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-current-authority-table-driver': {
        cueId: 'segment-current-authority-table-driver',
        cueText: '别把别的执行快照串回当前这段身体线。',
        driftStatus: 'partial-drift',
        aligned: false,
        authoritySegmentMatched: true,
        authorityRendererTarget: 'live2d',
        authorityMatchedDrivers: ['lipsync'],
        authorityMatchedSources: ['prosody-authority'],
        authorityBindingSummary: 'target=live2d | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情和动作还没跟回这段。',
        authorityMismatchDisplay: '表情和动作还没跟回这段。',
        authorityTrustSummary: null,
        voiceSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: 'body=measured-return seg=segment-driver-upstream-other | lipsync=energy-phoneme-hybrid phase=playing seg=segment-driver-upstream-other | closure=audible-body-carry',
        traceEmbodimentSummary: null,
        visemeHintsSummary: null,
        settleAuthoritySummary: null,
      },
    } as any)

    expect(rows[0]?.driverExecutionSummary).toBe('n/a')
    expect(rows[0]?.speechSummaryLines.some(line => line.startsWith('driver-execution:'))).toBe(false)
    expect(rows[0]?.embodimentClosureStage).toBeNull()
  })

  it('prefers the centralized speech-row embodiment closure stage when identity-continuity', () => {
    const rows = buildAuthorityTableRows([
      {
        cueId: 'segment-audible-body-closure-stage-top-level-1',
        cueText: '先不要把这条线拆开，让她沿着身体和声音继续回来。',
        surfaces: 'live2d',
        lanes: 'lipsync',
        driftStatus: 'partial-drift',
        aligned: false,
        detailRows: [
          {
            surface: 'live2d',
            lane: 'lipsync',
            planned: 'I',
            consumed: 'A',
            source: 'prosody-authority',
            confidence: '0.91',
            aligned: false,
            settleLines: [],
          },
        ],
      },
    ] as any, {
      'segment-audible-body-closure-stage-top-level-1': {
        cueId: 'segment-audible-body-closure-stage-top-level-1',
        cueText: '先不要把这条线拆开，让她沿着身体和声音继续回来。',
        driftStatus: 'partial-drift',
        aligned: false,
        authoritySegmentMatched: true,
        authorityRendererTarget: 'live2d',
        authorityMatchedDrivers: ['body', 'lipsync'],
        authorityMatchedSources: ['prosody-authority'],
        authorityBindingSummary: 'target=live2d | drivers=body, lipsync | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:yes',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: 'body still carries the same living segment while face and motion have not rejoined yet.',
        authorityMismatchDisplay: 'body still carries the same living segment while face and motion have not rejoined yet.',
        authorityTrustSummary: null,
        embodimentClosureStage: 'audible-body-carry',
        voiceSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: 'body=measured-return seg=segment-audible-body-closure-stage-top-level-1 | lipsync=energy-phoneme-hybrid phase=playing seg=segment-audible-body-closure-stage-top-level-1',
        traceEmbodimentSummary: null,
        visemeHintsSummary: null,
        settleAuthoritySummary: null,
      },
    } as any)

    expect(rows[0]?.embodimentClosureStage).toBe('audible-body-carry')
  })

  it('extracts structured identity-continuity', () => {
    const cases = [
      {
        expected: 'body-carried-to-renderer-rejoin',
        cueId: 'segment-authority-table-body-carried-to-renderer-rejoin-1',
        surface: 'vrm',
        lanes: 'body+lipsync',
        matchedDrivers: ['body', 'lipsync'],
        matchedSources: ['prosody-authority', 'voice-segment'],
        matchSummary: 'body:yes face:no motion:no lipsync:yes',
        driverExecutionSummary: 'body=measured-return seg=segment-authority-table-body-carried-to-renderer-rejoin-1 | lipsync=energy-phoneme-hybrid phase=playing seg=segment-authority-table-body-carried-to-renderer-rejoin-1',
      },
      {
        expected: 'body-carried-to-renderer-rejoin',
        cueId: 'segment-authority-table-body-lipsync-carry-1',
        surface: 'vrm',
        lanes: 'body+lipsync',
        matchedDrivers: ['body', 'lipsync'],
        matchedSources: ['prosody-authority'],
        matchSummary: 'body:yes face:no motion:no lipsync:yes',
        driverExecutionSummary: 'body=measured-return seg=segment-authority-table-body-lipsync-carry-1 | lipsync=energy-phoneme-hybrid phase=playing seg=segment-authority-table-body-lipsync-carry-1',
        lane: 'body+lipsync-only',
      },
      {
        expected: 'full-cross-modal-lock',
        cueId: 'segment-authority-table-full-cross-modal-lock-1',
        surface: 'vrm',
        lanes: 'body+face+motion+lipsync',
        matchedDrivers: ['body', 'face', 'motion', 'lipsync'],
        matchedSources: ['cue-bridge', 'prosody-authority', 'timeline-projection', 'voice-segment'],
        matchSummary: 'body:yes face:yes motion:yes lipsync:yes',
        driverExecutionSummary: 'body=measured-return seg=segment-authority-table-full-cross-modal-lock-1 | face=attentive/focused | motion=observe_focus | lipsync=energy-phoneme-hybrid phase=playing',
      },
      {
        expected: 'renderer-rejoin-without-body',
        cueId: 'segment-authority-table-renderer-rejoin-without-body-1',
        surface: 'live2d',
        lanes: 'face+motion+lipsync',
        matchedDrivers: ['face', 'motion', 'lipsync'],
        matchedSources: ['cue-bridge', 'prosody-authority', 'timeline-projection'],
        matchSummary: 'body:no face:yes motion:yes lipsync:yes',
        driverExecutionSummary: 'face=attentive/focused | motion=observe_focus | lipsync=energy-phoneme-hybrid phase=playing',
      },
      {
        expected: 'renderer-rejoin-without-body',
        cueId: 'segment-authority-table-face-lipsync-body-loss-1',
        surface: 'live2d',
        lanes: 'face+lipsync',
        matchedDrivers: ['face', 'lipsync'],
        matchedSources: ['prosody-authority'],
        matchSummary: 'body:no face:yes motion:no lipsync:yes',
        driverExecutionSummary: 'face=attentive/focused | lipsync=energy-phoneme-hybrid phase=playing',
        lane: 'face+lipsync-only',
      },
      {
        expected: 'renderer-rejoin-without-body',
        cueId: 'segment-authority-table-face-lipsync-voice-body-loss-1',
        surface: 'live2d',
        lanes: 'face+lipsync',
        matchedDrivers: ['face', 'lipsync'],
        matchedSources: ['prosody-authority', 'voice-segment'],
        matchSummary: 'body:no face:yes motion:no lipsync:yes voice:yes',
        driverExecutionSummary: 'face=attentive/focused | lipsync=energy-phoneme-hybrid phase=playing',
        lane: 'face+lipsync+voice-only',
      },
      {
        expected: 'renderer-rejoin-without-body',
        cueId: 'segment-authority-table-motion-lipsync-body-loss-1',
        surface: 'vrm',
        lanes: 'motion+lipsync',
        matchedDrivers: ['motion', 'lipsync'],
        matchedSources: ['prosody-authority'],
        matchSummary: 'body:no face:no motion:yes lipsync:yes',
        driverExecutionSummary: 'motion=observe_focus | lipsync=energy-phoneme-hybrid phase=playing',
        lane: 'motion+lipsync-only',
      },
      {
        expected: 'renderer-rejoin-without-body',
        cueId: 'segment-authority-table-motion-lipsync-voice-body-loss-1',
        surface: 'vrm',
        lanes: 'motion+lipsync',
        matchedDrivers: ['motion', 'lipsync'],
        matchedSources: ['prosody-authority', 'voice-segment'],
        matchSummary: 'body:no face:no motion:yes lipsync:yes voice:yes',
        driverExecutionSummary: 'motion=observe_focus | lipsync=energy-phoneme-hybrid phase=playing',
        lane: 'motion+lipsync+voice-only',
      },
    ] as const

    for (const testCase of cases) {
      const lane = 'lane' in testCase ? testCase.lane : testCase.expected
      const rows = buildAuthorityTableRows([
        {
          cueId: testCase.cueId,
          cueText: `same-her structured closure stage ${testCase.expected}`,
          surfaces: testCase.surface,
          lanes: testCase.lanes,
          driftStatus: 'partial-drift',
          aligned: false,
          detailRows: [
            {
              surface: testCase.surface,
              lane: 'lipsync',
              planned: 'I',
              consumed: 'A',
              source: 'prosody-authority',
              confidence: '0.91',
              aligned: false,
              settleLines: [],
            },
          ],
        },
      ] as any, {
        [testCase.cueId]: {
          cueId: testCase.cueId,
          cueText: `same-her structured closure stage ${testCase.expected}`,
          driftStatus: 'partial-drift',
          aligned: false,
          authoritySegmentMatched: true,
          authorityRendererTarget: testCase.surface,
          authorityMatchedDrivers: [...testCase.matchedDrivers],
          authorityMatchedSources: [...testCase.matchedSources],
          authorityBindingSummary: `target=${testCase.surface} | drivers=${testCase.matchedDrivers.join(', ')} | sources=${testCase.matchedSources.join(', ')} | matches=${testCase.matchSummary} | lane=${lane}`,
          authorityMatchSummary: testCase.matchSummary,
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          authorityTrustSummary: null,
          voiceSummary: null,
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: false,
          faceCue: null,
          actionCue: null,
          weightSummary: null,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: testCase.driverExecutionSummary,
          traceEmbodimentSummary: null,
          visemeHintsSummary: null,
          settleAuthoritySummary: `authority-bound | segment=${testCase.cueId} | target=${testCase.surface} | drivers=${testCase.matchedDrivers.join(', ')} | sources=${testCase.matchedSources.join(', ')} | lane=${lane}`,
        },
      } as any)

      expect(rows[0]?.embodimentClosureStage).toBe(testCase.expected)
      expect(rows[0]?.speechEvidence?.embodimentClosureStage).toBe(testCase.expected)
    }
  })
})
