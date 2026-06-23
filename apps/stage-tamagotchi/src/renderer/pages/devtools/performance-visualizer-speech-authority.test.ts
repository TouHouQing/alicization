import { describe, expect, it } from 'vitest'

import { buildSpeechAuthoritySegmentRows } from './performance-visualizer-speech-authority'

describe('performance visualizer speech authority', () => {
  it('projects speech observability into structured authority segment rows', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-zh-1',
          cueText: '继续看这里。',
          surfaces: ['live2d', 'vrm'],
          lanes: ['expression', 'lipsync', 'settle'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'settle',
              cueId: 'segment-zh-1',
              planned: 'settle',
              consumed: 'settle',
              source: null,
              aligned: false,
              settle: {
                vrmActionFadeMs: {
                  planned: 280,
                  consumed: 320,
                },
              },
            },
          ],
        },
        {
          cueId: 'segment-other',
          cueText: '别的片段。',
          surfaces: ['vrm'],
          lanes: ['action'],
          aligned: true,
          driftStatus: 'all-aligned',
          entries: [],
        },
      ] as any,
      {
        articulation: {
          active: true,
          voiceLanguage: 'zh-CN',
          closureBias: 0.84,
          consonantPrecision: 0.9,
          vowelLegato: 0.3,
          lipClosure: 0.44,
          lipRound: 0.12,
          lipSpread: 0.18,
          jawOpen: 0.28,
          openness: 0.36,
          topVisemes: [
            { viseme: 'A', weight: 0.66 },
            { viseme: 'closed', weight: 0.41 },
            { viseme: 'E', weight: 0.24 },
          ],
        },
        articulationSummary: {
          voice: 'zh-CN | closure=0.84 | precision=0.90',
          topVisemes: 'A:0.66, closed:0.41, E:0.24',
        },
        speechEvidence: {
          voiceSummary: null,
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-zh-1',
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
          segmentId: 'segment-zh-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        authoritySummary: null,
        cueMicro: {
          cueId: 'segment-zh-1',
          cueText: '继续看这里。',
          prosodyWeight: 0.36,
          mouthWeight: 0.28,
          headWeight: 0.32,
          personaStyleSummary: 'observe-first | prosody=-0.07 beat=-0.06 mouth=-0.04 head=+0.08',
          facialHoldMs: 320,
          actionHoldMs: 240,
          emotionHoldMs: 360,
          facialCue: 'focused',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: 'hold',
        },
        cueMicroSummary: {
          cue: 'focused / observe_focus | prosody=0.36 mouth=0.28 head=0.32 provenance=fallback-derived segment=segment-zh-1',
          personaStyle: 'observe-first | prosody=-0.07 beat=-0.06 mouth=-0.04 head=+0.08',
          timing: 'facial=320 action=240 emotion=360 | segment-start | soft-interrupt | hold',
        },
        driverExecution: {
          face: {
            segmentId: 'segment-zh-1',
            emotion: 'attentive',
            facialCue: 'focused',
            intensity: 0.61,
            holdMs: 320,
            source: 'prosody-authority',
            confidence: 0.83,
            preUtteranceCue: 'soften',
            postUtteranceCue: 'hold-soft',
          },
          motion: {
            segmentId: 'segment-zh-1',
            idleBase: 'breathing-idle',
            attentionMode: 'observe-first',
            actionCue: 'observe_focus',
            intensity: 0.48,
            holdMs: 240,
            source: 'timeline-projection',
            confidence: 0.79,
          },
          lipsync: {
            segmentId: 'segment-zh-1',
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
          },
        },
        driverExecutionSummary: null,
        visemeHints: [
          { segmentId: 'segment-zh-1', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
          { segmentId: 'segment-zh-1', viseme: 'closed', weight: 0.75, source: 'prosody-authority', confidence: 0.89 },
        ],
        visemeHintsSummary: 'I:0.35@0.94 | closed:0.75@0.89',
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      },
      {
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:rest:1',
          activeThreadId: 'runtime-thread-rest-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: ['late-night-fatigue'],
        },
        recentDrivingTraceDetails: [
          {
            kind: 'presence-pulse-dispatched',
            summary: 'protective-watch settled after fatigue pressure rose',
            createdAt: 2_468,
            details: [
              { label: 'scenario', value: 'late-night-fatigue' },
              { label: 'stance', value: 'observe-first' },
            ],
          },
          {
            kind: 'person-state-updated',
            summary: 'source trail applied',
            createdAt: 2_469,
            details: [
              { label: 'sourceTrail', value: 'fatigue, care, grounded-recall' },
            ],
          },
        ],
      },
    )

    expect(rows).toEqual([
      {
        cueId: 'segment-zh-1',
        cueText: '继续看这里。',
        driftStatus: 'partial-drift',
        aligned: false,
        authorityRendererTarget: 'vrm',
        residentMode: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['lipsync', 'voice'],
        authorityMatchedSources: ['prosody-authority'],
        authorityBindingSummary: 'target=vrm | drivers=lipsync, voice | sources=prosody-authority | matches=face:no motion:no lipsync:yes voice:yes | lane=lipsync+voice-only',
        authorityMatchSummary: 'face:no motion:no lipsync:yes voice:yes',
        authorityTrustSummary: 'VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情、动作、口型；当前表面策略是 procedural-carry。',
        authorityMismatchDisplay: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情、动作、口型；当前表面策略是 procedural-carry。',
        bodyContinuitySummary: null,
        speechEvidence: {
          voiceSummary: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-zh-1 | source=prosody-authority',
          bodyContinuitySummary: null,
          embodimentClosureStage: null,
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-zh-1',
          authorityMatchSummary: 'face:no motion:no lipsync:yes voice:yes',
          topVisemeSummary: 'A:0.66, closed:0.41, E:0.24',
          cueSummary: 'focused / observe_focus | prosody=0.36 mouth=0.28 head=0.32 provenance=fallback-derived segment=segment-zh-1',
          cueIdentityPresent: true,
          cueProsodyPresent: true,
          personaStyleSummary: 'observe-first | prosody=-0.07 beat=-0.06 mouth=-0.04 head=+0.08',
          timingSummary: 'facial=320 action=240 emotion=360 | segment-start | soft-interrupt | hold',
          driverExecutionSummary: 'face=attentive/focused@0.61 hold=320 pre=soften post=hold-soft src=prosody-authority conf=0.83 | motion=observe_focus mode=observe-first idle=breathing-idle@0.48 hold=240 src=timeline-projection conf=0.79 | lipsync=energy-phoneme-hybrid phase=playing',
          visemeHintsSummary: 'I:0.35@0.94 | closed:0.75@0.89',
        },
        speechSummaryEntries: [
          { key: 'authority', label: '权威绑定', value: '目标 VRM，驱动 口型、声音，来源 prosody-authority，命中 表情未命中 / 动作未命中 / 口型命中 / 声音命中，当前仅剩口型、声音维持同一段连续性', technicalValue: 'target=vrm | drivers=lipsync, voice | sources=prosody-authority | matches=face:no motion:no lipsync:yes voice:yes | lane=lipsync+voice-only' },
          { key: 'authority-match', label: '绑定命中', value: '表情未命中 / 动作未命中 / 口型命中 / 声音命中', technicalValue: 'face:no motion:no lipsync:yes voice:yes' },
          { key: 'authority-trust', label: '权威可信性', value: 'VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。' },
          { key: 'authority-mismatch', label: '权威漂移', value: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情、动作、口型；当前表面策略是 procedural-carry。' },
          { key: 'voice', label: '语音韵律', value: '中文韵律，收口 0.84，咬字 0.90，权威绑定，片段 segment-zh-1，来源 韵律权威', technicalValue: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-zh-1 | source=prosody-authority' },
          { key: 'prosody-authority', label: '韵律权威', value: '模式 energy-phoneme-hybrid，韵律 0.35，口部 0.35，头部 0.32，峰值口型 0.75，权威绑定，来源 韵律权威，片段 segment-zh-1', technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-zh-1' },
          { key: 'visemes', label: '主口型', value: 'A 0.66，闭口 0.41，E 0.24', technicalValue: 'A:0.66, closed:0.41, E:0.24' },
          { key: 'cue', label: '微表情线索', value: 'focused / observe_focus，韵律 0.36，口部 0.28，头部 0.32，回退派生，片段 segment-zh-1', technicalValue: 'focused / observe_focus | prosody=0.36 mouth=0.28 head=0.32 provenance=fallback-derived segment=segment-zh-1' },
          { key: 'persona-style', label: '人设风格', value: 'observe-first，韵律 -0.07，节拍 -0.06，口部 -0.04，头部 +0.08', technicalValue: 'observe-first | prosody=-0.07 beat=-0.06 mouth=-0.04 head=+0.08' },
          { key: 'timing', label: '时序节奏', value: '表情 320ms，动作 240ms，情绪 360ms，片段起始，软打断，保持', technicalValue: 'facial=320 action=240 emotion=360 | segment-start | soft-interrupt | hold' },
          { key: 'driver-execution', label: '驱动执行', value: '表情 attentive/focused @0.61，保持 320ms，前置 soften，后置 hold-soft，来源 韵律权威，置信 0.83 | 动作 observe_focus，模式 先观察，待机 breathing-idle @0.48，保持 240ms，来源 时间线投影，置信 0.79 | 口型 energy-phoneme-hybrid，阶段 播放中', technicalValue: 'face=attentive/focused@0.61 hold=320 pre=soften post=hold-soft src=prosody-authority conf=0.83 | motion=observe_focus mode=observe-first idle=breathing-idle@0.48 hold=240 src=timeline-projection conf=0.79 | lipsync=energy-phoneme-hybrid phase=playing' },
          { key: 'trace-embodiment', label: '轨迹落点', value: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 口型、声音，实际执行 表情+动作+口型，场景 深夜疲劳照看，姿态 先观察后表达，来源链 fatigue -> care -> grounded-recall', technicalValue: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync, voice | execution=face+motion+lipsync | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall' },
          { key: 'viseme-hints', label: '口型提示', value: 'I 权重 0.35（置信 0.94），闭口 权重 0.75（置信 0.89）', technicalValue: 'I:0.35@0.94 | closed:0.75@0.89' },
          { key: 'settle-authority', label: '稳定段归因', value: 'authority-bound，片段 segment-zh-1，目标 VRM，驱动 口型、声音，来源 prosody-authority，当前仅剩口型、声音维持同一段连续性', technicalValue: 'authority-bound | segment=segment-zh-1 | target=vrm | drivers=lipsync, voice | sources=prosody-authority | matches=face:no motion:no lipsync:yes voice:yes | lane=lipsync+voice-only' },
        ],
        settleAuthoritySummary: 'authority-bound | segment=segment-zh-1 | target=vrm | drivers=lipsync, voice | sources=prosody-authority | matches=face:no motion:no lipsync:yes voice:yes | lane=lipsync+voice-only',
        rendererDriftSummary: null,
        voiceSummary: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-zh-1 | source=prosody-authority',
        topVisemeSummary: 'A:0.66, closed:0.41, E:0.24',
        cueSummary: 'focused / observe_focus | prosody=0.36 mouth=0.28 head=0.32 provenance=fallback-derived segment=segment-zh-1',
        cueIdentityPresent: true,
        cueProsodyPresent: true,
        faceCue: 'focused',
        actionCue: 'observe_focus',
        weightSummary: 'prosody=0.36 mouth=0.28 head=0.32',
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-zh-1',
        personaStyleSummary: 'observe-first | prosody=-0.07 beat=-0.06 mouth=-0.04 head=+0.08',
        timingSummary: 'facial=320 action=240 emotion=360 | segment-start | soft-interrupt | hold',
        driverExecutionSummary: 'face=attentive/focused@0.61 hold=320 pre=soften post=hold-soft src=prosody-authority conf=0.83 | motion=observe_focus mode=observe-first idle=breathing-idle@0.48 hold=240 src=timeline-projection conf=0.79 | lipsync=energy-phoneme-hybrid phase=playing',
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync, voice | execution=face+motion+lipsync | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
        visemeHintsSummary: 'I:0.35@0.94 | closed:0.75@0.89',
      },
    ])
  })

  it('prefers driver authority prosody metadata when speech evidence summary is absent', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-driver-prosody-native',
          cueText: '继续跟上。',
          surfaces: ['vrm'],
          lanes: ['lipsync'],
          aligned: true,
          driftStatus: 'all-aligned',
          entries: [],
        },
      ] as any,
      {
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
          segmentId: 'segment-driver-prosody-native',
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
            segmentId: 'segment-driver-prosody-native',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            matchedSources: ['prosody-authority'],
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
          prosodyAuthority: null,
        },
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
    )

    expect(rows[0]?.speechEvidence?.prosodyAuthoritySummary).toBe(
      'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-driver-prosody-native',
    )
    expect(rows[0]?.authorityTrustSummary).toBe('VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。')
  })

  it('prefers current driver authority prosody over stale top-level speech evidence summaries when the living segment has already rethreaded', () => {
    const cueId = 'segment-current-driver-prosody-stale-summary'
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId,
          cueText: '当前韵律主线已经回到这段里。',
          surfaces: ['vrm'],
          lanes: ['lipsync'],
          aligned: true,
          driftStatus: 'all-aligned',
          entries: [],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        speechEvidence: {
          voiceSummary: null,
          bodyContinuitySummary: null,
          prosodyAuthoritySummary: 'mode=legacy-stale | prosody=0.12 | mouth=0.11 | head=0.10 | visemePeak=0.33 | provenance=authority-bound | source=prosody-authority | segment=segment-stale-prosody-owner',
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
          segmentId: cueId,
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
        driverExecutionSummary: null,
        visemeHints: [],
        visemeHintsSummary: null,
        playbackTelemetry: {
          driverAuthority: {
            segmentId: cueId,
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            matchedSources: ['prosody-authority'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
            prosodyAuthority: {
              segmentId: cueId,
              provenance: 'authority-bound',
              source: 'prosody-authority',
              mode: 'energy-phoneme-hybrid',
              cueProsodyWeight: 0.41,
              cueMouthWeight: 0.34,
              cueHeadWeight: 0.22,
              visemePeakWeight: 0.81,
            },
          },
          prosodyAuthority: {
            segmentId: 'segment-stale-top-level-prosody',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'stale-top-level',
            cueProsodyWeight: 0.15,
            cueMouthWeight: 0.13,
            cueHeadWeight: 0.09,
            visemePeakWeight: 0.28,
          },
        },
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
    )

    expect(rows[0]?.prosodyAuthoritySummary).toBe(
      'mode=energy-phoneme-hybrid | prosody=0.41 | mouth=0.34 | head=0.22 | visemePeak=0.81 | provenance=authority-bound | source=prosody-authority | segment=segment-current-driver-prosody-stale-summary',
    )
    expect(rows[0]?.speechEvidence?.prosodyAuthoritySummary).toBe(
      'mode=energy-phoneme-hybrid | prosody=0.41 | mouth=0.34 | head=0.22 | visemePeak=0.81 | provenance=authority-bound | source=prosody-authority | segment=segment-current-driver-prosody-stale-summary',
    )
    expect(rows[0]?.speechSummaryEntries).toContainEqual(expect.objectContaining({
      key: 'prosody-authority',
      technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.41 | mouth=0.34 | head=0.22 | visemePeak=0.81 | provenance=authority-bound | source=prosody-authority | segment=segment-current-driver-prosody-stale-summary',
    }))
  })

  it('keeps authority-bound rows visible even when cue and viseme evidence is absent', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-authority-only',
          cueText: '仅 authority seed。',
          surfaces: ['vrm'],
          lanes: ['action'],
          aligned: true,
          driftStatus: 'all-aligned',
          entries: [],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        authorityBinding: {
          segmentId: 'segment-authority-only',
          rendererTarget: 'vrm',
          matchedDrivers: ['motion'],
          matchedSources: ['timeline-projection'],
          faceSegmentMatched: false,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: false,
        },
        authoritySummary: null,
        cueMicro: null,
        cueMicroSummary: null,
        driverExecution: null,
        driverExecutionSummary: null,
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      },
      {
        recentDrivingTraceRecord: null,
        recentDrivingTraceDetails: [],
      },
    )

    expect(rows).toEqual([
      {
        cueId: 'segment-authority-only',
        cueText: '仅 authority seed。',
        driftStatus: 'all-aligned',
        aligned: true,
        authorityRendererTarget: 'vrm',
        residentMode: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['motion'],
        authorityMatchedSources: ['timeline-projection'],
        authorityBindingSummary: 'target=vrm | drivers=motion | sources=timeline-projection | matches=face:no motion:yes lipsync:no | lane=motion-only',
        authorityMatchSummary: 'face:no motion:yes lipsync:no',
        authorityTrustSummary: null,
        authorityMismatchSummary: 'face-mismatch, lipsync-mismatch',
        authorityMismatchReasonSummary: '表情、口型 authority 漂移，当前绑定来源是 timeline-projection，实际执行落点是无执行。',
        authorityMismatchDisplay: '表情、口型 authority 漂移，当前绑定来源是 timeline-projection，实际执行落点是无执行。',
        bodyContinuitySummary: null,
        speechEvidence: {
          voiceSummary: null,
          bodyContinuitySummary: null,
          embodimentClosureStage: null,
          prosodyAuthoritySummary: null,
          authorityMatchSummary: 'face:no motion:yes lipsync:no',
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: false,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: null,
          visemeHintsSummary: null,
        },
        speechSummaryEntries: [
          { key: 'authority', label: '权威绑定', value: '目标 VRM，驱动 动作，来源 timeline-projection，命中 表情未命中 / 动作命中 / 口型未命中，当前仅剩动作维持同一段连续性', technicalValue: 'target=vrm | drivers=motion | sources=timeline-projection | matches=face:no motion:yes lipsync:no | lane=motion-only' },
          { key: 'authority-match', label: '绑定命中', value: '表情未命中 / 动作命中 / 口型未命中', technicalValue: 'face:no motion:yes lipsync:no' },
          { key: 'authority-mismatch', label: '权威漂移', value: '表情、口型 authority 漂移，当前绑定来源是 timeline-projection，实际执行落点是无执行。' },
        ],
        settleAuthoritySummary: null,
        rendererDriftSummary: null,
        voiceSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        prosodyAuthoritySummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        traceEmbodimentSummary: null,
        visemeHintsSummary: null,
      },
    ])
  })

  it('marks settle authority as fallback-derived when the cue has settle drift but no stable authority match', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-settle-fallback',
          cueText: '这里只剩 settle 回退。',
          surfaces: ['vrm'],
          lanes: ['settle'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'settle',
              cueId: 'segment-settle-fallback',
              planned: 'settle',
              consumed: 'settle',
              source: null,
              aligned: false,
              settle: {
                vrmActionFadeMs: {
                  planned: 280,
                  consumed: 340,
                },
              },
            },
          ],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        authorityBinding: {
          segmentId: 'segment-other',
          rendererTarget: 'vrm',
          matchedDrivers: ['face'],
          matchedSources: ['prosody-authority'],
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: false,
        },
        authoritySummary: null,
        cueMicro: {
          cueId: 'segment-settle-fallback',
          cueText: '这里只剩 settle 回退。',
          prosodyWeight: null,
          mouthWeight: null,
          headWeight: null,
          personaStyleSummary: null,
          facialHoldMs: null,
          actionHoldMs: null,
          emotionHoldMs: null,
          facialCue: null,
          actionCue: null,
          actionWindow: null,
          interruptMode: null,
          settleMode: 'hold',
        },
        cueMicroSummary: {
          cue: 'n/a / n/a | prosody=n/a mouth=n/a head=n/a',
          personaStyle: null,
          timing: 'facial=n/a action=n/a emotion=n/a | n/a | n/a | hold',
        },
        driverExecution: null,
        driverExecutionSummary: null,
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      },
      {
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:fallback:1',
          activeThreadId: 'runtime-thread-fallback-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceDetails: [],
      },
    )

    expect(rows).toEqual([
      {
        cueId: 'segment-settle-fallback',
        cueText: '这里只剩 settle 回退。',
        driftStatus: 'partial-drift',
        aligned: false,
        authorityRendererTarget: 'vrm',
        residentMode: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        authoritySegmentMatched: false,
        authorityMatchedDrivers: [],
        authorityMatchedSources: [],
        authorityBindingSummary: null,
        authorityMatchSummary: null,
        authorityTrustSummary: null,
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        bodyContinuitySummary: null,
        speechEvidence: {
          voiceSummary: null,
          bodyContinuitySummary: null,
          embodimentClosureStage: null,
          prosodyAuthoritySummary: null,
          authorityMatchSummary: null,
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: false,
          personaStyleSummary: null,
          timingSummary: 'facial=n/a action=n/a emotion=n/a | n/a | n/a | hold',
          driverExecutionSummary: null,
          visemeHintsSummary: null,
        },
        speechSummaryEntries: [
          { key: 'timing', label: '时序节奏', value: '表情 n/a，动作 n/a，情绪 n/a，n/a，n/a，保持', technicalValue: 'facial=n/a action=n/a emotion=n/a | n/a | n/a | hold' },
          { key: 'trace-embodiment', label: '轨迹落点', value: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 无，实际执行 无', technicalValue: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=none | execution=none' },
          { key: 'settle-authority', label: '稳定段归因', value: 'fallback-derived，片段 segment-settle-fallback', technicalValue: 'fallback-derived | segment=segment-settle-fallback' },
        ],
        settleAuthoritySummary: 'fallback-derived | segment=segment-settle-fallback',
        rendererDriftSummary: null,
        voiceSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        prosodyAuthoritySummary: null,
        personaStyleSummary: null,
        timingSummary: 'facial=n/a action=n/a emotion=n/a | n/a | n/a | hold',
        driverExecutionSummary: null,
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=none | execution=none',
        visemeHintsSummary: null,
      },
    ])
  })

  it('prefers snapshot-native authority, cue, driver, and viseme summaries for matched segments', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-summary-1',
          cueText: '继续看这里。',
          surfaces: ['vrm'],
          lanes: ['expression', 'settle'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'settle',
              cueId: 'segment-summary-1',
              planned: 'settle',
              consumed: 'settle',
              source: null,
              aligned: false,
              settle: {
                vrmActionFadeMs: {
                  planned: 280,
                  consumed: 320,
                },
              },
            },
          ],
        },
      ] as any,
      {
        articulation: {
          active: true,
          voiceLanguage: 'zh-CN',
          closureBias: 0.84,
          consonantPrecision: 0.9,
          vowelLegato: 0.3,
          lipClosure: 0.44,
          lipRound: 0.12,
          lipSpread: 0.18,
          jawOpen: 0.28,
          openness: 0.36,
          topVisemes: [
            { viseme: 'A', weight: 0.66 },
          ],
        },
        articulationSummary: {
          voice: '上游语音摘要',
          topVisemes: '上游主口型',
        },
        authorityBinding: {
          segmentId: 'segment-summary-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        authoritySummary: {
          cueId: 'segment-summary-1',
          segmentId: 'segment-summary-1',
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          settleSummary: '上游 authority settle',
        },
        cueMicro: {
          cueId: 'segment-summary-1',
          cueText: '继续看这里。',
          prosodyWeight: 0.36,
          mouthWeight: 0.28,
          headWeight: 0.32,
          personaStyleSummary: 'raw persona style',
          facialHoldMs: 320,
          actionHoldMs: 240,
          emotionHoldMs: 360,
          facialCue: 'focused',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: 'hold',
        },
        cueMicroSummary: {
          cue: '上游微表情线索',
          personaStyle: '上游人设风格',
          timing: '上游时序节奏',
        },
        driverExecution: {
          face: {
            segmentId: 'segment-summary-1',
            emotion: 'attentive',
            facialCue: 'focused',
            intensity: 0.61,
            holdMs: 320,
            source: 'prosody-authority',
            confidence: 0.83,
            preUtteranceCue: 'soften',
            postUtteranceCue: 'hold-soft',
          },
          motion: null,
          lipsync: {
            segmentId: 'segment-summary-1',
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
          },
        },
        driverExecutionSummary: 'face=上游驱动执行',
        visemeHints: [
          { segmentId: 'segment-summary-1', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
        ],
        visemeHintsSummary: '上游口型提示',
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      {
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:rest:1',
          activeThreadId: 'runtime-thread-rest-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceDetails: [],
      },
    )

    expect(rows).toEqual([
      {
        cueId: 'segment-summary-1',
        cueText: '继续看这里。',
        driftStatus: 'partial-drift',
        aligned: false,
        authorityRendererTarget: 'vrm',
        residentMode: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['lipsync'],
        authorityMatchedSources: ['prosody-authority'],
        authorityBindingSummary: '上游 authority 绑定',
        authorityMatchSummary: '上游 authority 命中',
        authorityTrustSummary: 'VRM 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情；当前表面策略是 procedural-carry。',
        authorityMismatchDisplay: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情；当前表面策略是 procedural-carry。',
        bodyContinuitySummary: null,
        speechSummaryEntries: [
          { key: 'authority', label: '权威绑定', value: '上游 authority 绑定 | 表情未命中 / 动作未命中 / 口型命中' },
          { key: 'authority-match', label: '绑定命中', value: '上游 authority 命中 | 表情未命中 / 动作未命中 / 口型命中' },
          { key: 'authority-trust', label: '权威可信性', value: 'VRM 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。' },
          { key: 'authority-mismatch', label: '权威漂移', value: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情；当前表面策略是 procedural-carry。' },
          { key: 'voice', label: '语音韵律', value: '上游语音摘要' },
          { key: 'visemes', label: '主口型', value: '上游主口型' },
          { key: 'cue', label: '微表情线索', value: '上游微表情线索' },
          { key: 'persona-style', label: '人设风格', value: '上游人设风格' },
          { key: 'timing', label: '时序节奏', value: '上游时序节奏' },
          { key: 'driver-execution', label: '驱动执行', value: 'face=上游驱动执行' },
          { key: 'trace-embodiment', label: '轨迹落点', value: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 口型，实际执行 表情', technicalValue: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=face' },
          { key: 'viseme-hints', label: '口型提示', value: '上游口型提示' },
          { key: 'settle-authority', label: '稳定段归因', value: '上游 authority settle' },
        ],
        settleAuthoritySummary: '上游 authority settle',
        rendererDriftSummary: null,
        speechEvidence: {
          voiceSummary: '上游语音摘要',
          bodyContinuitySummary: null,
          embodimentClosureStage: null,
          prosodyAuthoritySummary: null,
          authorityMatchSummary: '上游 authority 命中',
          topVisemeSummary: '上游主口型',
          cueSummary: '上游微表情线索',
          cueIdentityPresent: true,
          cueProsodyPresent: true,
          personaStyleSummary: '上游人设风格',
          timingSummary: '上游时序节奏',
          driverExecutionSummary: 'face=上游驱动执行',
          visemeHintsSummary: '上游口型提示',
        },
        voiceSummary: '上游语音摘要',
        topVisemeSummary: '上游主口型',
        cueSummary: '上游微表情线索',
        cueIdentityPresent: true,
        cueProsodyPresent: true,
        faceCue: 'focused',
        actionCue: 'observe_focus',
        weightSummary: null,
        prosodyAuthoritySummary: null,
        personaStyleSummary: '上游人设风格',
        timingSummary: '上游时序节奏',
        driverExecutionSummary: 'face=上游驱动执行',
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=face',
        visemeHintsSummary: '上游口型提示',
      },
    ])
  })

  it('keeps voice continuity visible inside descriptive upstream authority summaries for matched speech authority rows', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-speech-authority-voice-2',
          cueText: '继续看这里。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: {
          voice: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-speech-authority-voice-2 | source=prosody-authority',
          topVisemes: null,
        },
        speechEvidence: {
          voiceSummary: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-speech-authority-voice-2 | source=prosody-authority',
          bodyContinuitySummary: null,
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
        authorityBinding: {
          segmentId: 'segment-speech-authority-voice-2',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        playbackTelemetry: null,
        playbackCue: {
          authorityView: null,
        },
        authoritySummary: {
          cueId: 'segment-speech-authority-voice-2',
          segmentId: 'segment-speech-authority-voice-2',
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          authorityTrustSummary: null,
          settleSummary: '上游 authority settle',
        },
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '上游 authority 漂移说明',
        authorityMismatchDisplay: '上游 authority 漂移说明',
        embodimentClosureStage: null,
        cueMicro: null,
        cueMicroSummary: null,
        driverExecution: null,
        visemeHints: [],
        visemeHintsSummary: null,
        driverExecutionSummary: 'lipsync=energy-phoneme-hybrid phase=playing',
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      undefined,
    )

    expect(rows[0]?.speechSummaryEntries).toEqual(expect.arrayContaining([
      {
        key: 'authority',
        label: '权威绑定',
        value: '上游 authority 绑定 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中',
      },
      {
        key: 'authority-match',
        label: '绑定命中',
        value: '上游 authority 命中 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中',
      },
      {
        key: 'voice',
        label: '语音韵律',
        value: '中文韵律，收口 0.84，咬字 0.90，权威绑定，片段 segment-speech-authority-voice-2，来源 韵律权威',
        technicalValue: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-speech-authority-voice-2 | source=prosody-authority',
      },
    ]))
  })

  it('preserves body-backed upstream authority summaries when the current speech segment is still carried by the body line', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-summary-body-1',
          cueText: '先别急，我还在这里。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [
            { lane: 'settle', settle: true },
          ],
        },
      ] as any,
      {
        articulationSummary: {
          voice: '身体线还在托住这一句。',
          topVisemes: null,
        },
        authorityBinding: {
          segmentId: 'segment-summary-body-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['body'],
          matchedSources: ['prosody-authority'],
          bodySegmentMatched: true,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: false,
        },
        authoritySummary: {
          cueId: 'segment-summary-body-1',
          segmentId: 'segment-summary-body-1',
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          settleSummary: '上游 authority settle',
          authorityTrustSummary: '上游 authority trust：这一段先由身体线继续托住，不要把她重新拆成孤立表情层。',
        },
        playbackCue: {
          authorityView: {
            cueId: 'segment-summary-body-1',
            authoritySegmentId: 'segment-summary-body-1',
            authorityRendererTarget: 'vrm',
            authorityMatchedDrivers: ['body'],
            authoritySources: ['prosody-authority'],
            authorityTrustSummary: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
            prosodyAuthoritySummary: null,
            traceEmbodimentSummary: null,
            residentMode: null,
            preferredBlinkCadence: null,
            preferredGazeMode: null,
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
            authorityBindingSummary: 'target=vrm | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no | lane=body-only',
            authorityMatchSummary: 'body:yes face:no motion:no lipsync:no',
            settleAuthoritySummary: 'authority-bound | segment=segment-summary-body-1 | target=vrm | drivers=body | sources=prosody-authority',
            summaryEntries: [],
            preferredExpressionAliases: [],
            preferredMotionAliases: [],
            live2dFacialReleaseMs: null,
            live2dMotionFollowThroughMs: null,
            vrmActionFadeMs: null,
            vrmExpressionBlendMs: null,
          },
        },
        cueMicro: {
          cueId: 'segment-summary-body-1',
          cueText: '先别急，我还在这里。',
          prosodyWeight: 0.22,
          mouthWeight: 0.18,
          headWeight: 0.16,
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          settleMode: 'hold',
        },
        cueMicroSummary: {
          cue: '身体先稳住，再慢慢把脸接回来。',
          personaStyle: null,
          timing: null,
        },
        driverExecution: null,
        driverExecutionSummary: 'body=measured-return still=0.88 gazeStable=0.80',
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
        authorityMismatchSummary: 'face-mismatch, motion-mismatch, lipsync-mismatch',
        authorityMismatchReasonSummary: '表情、动作、口型 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是身体维持。',
        authorityMismatchDisplay: '表情、动作、口型 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是身体维持。',
      } as any,
      undefined,
    )

    expect(rows).toEqual([
      expect.objectContaining({
        cueId: 'segment-summary-body-1',
        cueText: '先别急，我还在这里。',
        authorityRendererTarget: 'vrm',
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['body'],
        authorityMatchedSources: ['prosody-authority'],
        authorityBindingSummary: '上游 authority 绑定',
        authorityMatchSummary: '上游 authority 命中',
        authorityTrustSummary: '上游 authority trust：这一段先由身体线继续托住，不要把她重新拆成孤立表情层。',
        settleAuthoritySummary: '上游 authority settle',
      }),
    ])
    expect(rows[0]?.speechSummaryEntries).toContainEqual({
      key: 'authority',
      label: '权威绑定',
      value: '上游 authority 绑定 | 身体命中 / 表情未命中 / 动作未命中 / 口型未命中',
    })
    expect(rows[0]?.speechSummaryEntries).toContainEqual({
      key: 'authority-match',
      label: '绑定命中',
      value: '上游 authority 命中 | 身体命中 / 表情未命中 / 动作未命中 / 口型未命中',
    })
    expect(rows[0]?.speechSummaryEntries).toContainEqual({
      key: 'authority-trust',
      label: '权威可信性',
      value: '上游 authority trust：这一段先由身体线继续托住，不要把她重新拆成孤立表情层。',
    })
  })

  it('preserves body-carried speech rejoin lane truth when upstream authority summary is richer than the current authority binding', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-body-speech-row-1',
          cueText: '身体线已经把她托回当前语音片段里。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [
            { lane: 'lipsync', aligned: false },
            { lane: 'settle', settle: true },
          ],
        },
      ] as any,
      {
        articulationSummary: {
          voice: '她还在这条身体线里。',
          topVisemes: null,
        },
        authorityBinding: {
          segmentId: 'segment-body-speech-row-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        authoritySummary: {
          cueId: 'segment-body-speech-row-1',
          segmentId: 'segment-body-speech-row-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['body', 'lipsync'],
          matchedSources: ['prosody-authority', 'voice-segment'],
          bindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
          matchSummary: 'body:yes face:no motion:no lipsync:yes',
          settleSummary: 'authority-bound | segment=segment-body-speech-row-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment',
          authorityTrustSummary: null,
        },
        playbackCue: {
          authorityView: {
            cueId: 'segment-body-speech-row-1',
            authoritySegmentId: 'segment-body-speech-row-1',
            authorityRendererTarget: 'vrm',
            authorityMatchedDrivers: ['body', 'lipsync'],
            authoritySources: ['prosody-authority', 'voice-segment'],
            authorityTrustSummary: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
            prosodyAuthoritySummary: null,
            traceEmbodimentSummary: null,
            residentMode: 'care',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
            authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
            authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
            settleAuthoritySummary: 'authority-bound | segment=segment-body-speech-row-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment',
            summaryEntries: [],
            preferredExpressionAliases: [],
            preferredMotionAliases: [],
            live2dFacialReleaseMs: null,
            live2dMotionFollowThroughMs: null,
            vrmActionFadeMs: null,
            vrmExpressionBlendMs: null,
          },
        },
        cueMicro: {
          cueId: 'segment-body-speech-row-1',
          cueText: '身体线已经把她托回当前语音片段里。',
          prosodyWeight: 0.24,
          mouthWeight: 0.21,
          headWeight: 0.18,
          facialCue: 'soft-gaze',
          actionCue: 'return',
          settleMode: 'hold',
        },
        cueMicroSummary: {
          cue: '先回到当前语音片段主链。',
          personaStyle: null,
          timing: null,
        },
        driverExecution: null,
        driverExecutionSummary: 'lipsync=energy-phoneme-hybrid phase=playing',
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情和动作还没回到这一段里，但身体线已经继续托住同一个 living segment。',
        authorityMismatchDisplay: '表情和动作还没回到这一段里，但身体线已经继续托住同一个 living segment。',
      } as any,
      undefined,
    )

    expect(rows).toEqual([
      expect.objectContaining({
        cueId: 'segment-body-speech-row-1',
        authorityRendererTarget: 'vrm',
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['body', 'lipsync'],
        authorityMatchedSources: ['prosody-authority', 'voice-segment'],
        authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
      }),
    ])
    expect(rows[0]?.speechSummaryEntries).toContainEqual({
      key: 'authority-match',
      label: '绑定命中',
      value: '身体命中 / 表情未命中 / 动作未命中 / 口型命中',
      technicalValue: 'body:yes face:no motion:no lipsync:yes',
    })
    expect(rows[0]?.speechSummaryEntries).toContainEqual({
      key: 'authority-trust',
      label: '权威可信性',
      value: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。 当前身体还在按 linger blink / soften gaze 的节奏把这一条线稳住。',
    })
  })

  it('prefers current body-lipsync-voice lane truth over stale playback cue body-line trust in speech authority rows', () => {
    const cueId = 'segment-body-lipsync-voice-speech-override-1'
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId,
          cueText: '身体、口型和声音都已经回到同一段里。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [
            { lane: 'settle', settle: true },
          ],
        },
      ] as any,
      {
        articulationSummary: {
          voice: `zh-CN | closure=0.71 | precision=0.62 | provenance=authority-bound | segment=${cueId} | source=prosody-authority`,
          topVisemes: null,
        },
        speechEvidence: {
          voiceSummary: null,
          prosodyAuthoritySummary: `mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.31 | head=0.28 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=${cueId}`,
          authorityMatchSummary: null,
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: true,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: null,
          visemeHintsSummary: null,
        },
        authorityBinding: {
          segmentId: cueId,
          rendererTarget: 'vrm',
          matchedDrivers: ['body', 'lipsync'],
          matchedSources: ['prosody-authority', 'voice-segment'],
          bodySegmentMatched: true,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        authoritySummary: null,
        playbackCue: {
          authorityView: {
            cueId,
            authoritySegmentId: cueId,
            authorityRendererTarget: 'vrm',
            authorityMatchedDrivers: ['body', 'lipsync'],
            authoritySources: ['prosody-authority', 'voice-segment'],
            authorityTrustSummary: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
            settleAuthoritySummary: `authority-bound | segment=${cueId} | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment`,
            authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
            authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
            residentMode: 'care',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
            summaryEntries: [],
            preferredExpressionAliases: [],
            preferredMotionAliases: [],
            live2dFacialReleaseMs: null,
            live2dMotionFollowThroughMs: null,
            vrmActionFadeMs: null,
            vrmExpressionBlendMs: null,
          },
        },
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情和动作还没回到这一段里，但身体、口型和声音已经继续托住同一个 living segment。',
        authorityMismatchDisplay: '表情和动作还没回到这一段里，但身体、口型和声音已经继续托住同一个 living segment。',
        cueMicro: null,
        cueMicroSummary: null,
        driverExecution: null,
        driverExecutionSummary: null,
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      undefined,
    )

    expect(rows).toEqual([
      expect.objectContaining({
        cueId,
        authorityRendererTarget: 'vrm',
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['body', 'lipsync', 'voice'],
        authorityMatchedSources: ['prosody-authority', 'voice-segment'],
        authorityTrustSummary: 'VRM 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。 当前身体还在按 linger blink / soften gaze 的节奏把这一条线稳住。',
      }),
    ])
    expect(rows[0]?.speechSummaryEntries).toContainEqual({
      key: 'authority-trust',
      label: '权威可信性',
      value: 'VRM 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。 当前身体还在按 linger blink / soften gaze 的节奏把这一条线稳住。',
    })
  })

  it('surfaces embodiment closure stage as a top-level speech authority row field when audible body continuity is the active same-her closure phase', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-audible-body-speech-authority-1',
          cueText: '先让身体和声音把她接住。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [
            { lane: 'lipsync', aligned: true },
            { lane: 'settle', settle: true },
          ],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        speechEvidence: {
          voiceSummary: 'zh-CN | closure=0.62 | precision=0.58 | provenance=authority-bound | segment=segment-audible-body-speech-authority-1 | source=prosody-authority',
          bodyContinuitySummary: 'mode=thinking | stillness=0.72 | gaze=0.58 | breath=0.28 | expressivity=0.14 | closure=audible-body-carry | seg=segment-audible-body-speech-authority-1',
          prosodyAuthoritySummary: null,
          authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: true,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: 'body=measured-return seg=segment-audible-body-speech-authority-1 | lipsync=energy-phoneme-hybrid phase=playing seg=segment-audible-body-speech-authority-1 | closure=audible-body-carry',
          visemeHintsSummary: null,
        },
        authorityBinding: {
          segmentId: 'segment-audible-body-speech-authority-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['body', 'lipsync'],
          matchedSources: ['prosody-authority'],
          bodySegmentMatched: true,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        authoritySummary: {
          cueId: 'segment-audible-body-speech-authority-1',
          segmentId: 'segment-audible-body-speech-authority-1',
          bindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync+voice-only | pending-rejoin=face+motion',
          matchSummary: 'body:yes face:no motion:no lipsync:yes',
          settleSummary: 'authority-bound | segment=segment-audible-body-speech-authority-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority | lane=body+lipsync+voice-only | pending-rejoin=face+motion',
          authorityTrustSummary: null,
          authorityMismatchSummary: 'face-mismatch, motion-mismatch | closure=audible-body-carry',
          authorityMismatchReasonSummary: 'body still carries the same living segment while face and motion have not rejoined yet | closure=audible-body-carry',
          authorityMismatchDisplay: 'body still carries the same living segment while face and motion have not rejoined yet | closure=audible-body-carry',
        },
        playbackCue: {
          authorityView: null,
        },
        cueMicro: null,
        cueMicroSummary: null,
        driverExecution: null,
        driverExecutionSummary: 'body=measured-return seg=segment-audible-body-speech-authority-1 | lipsync=energy-phoneme-hybrid phase=playing seg=segment-audible-body-speech-authority-1 | closure=audible-body-carry',
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
        authorityMismatchSummary: 'face-mismatch, motion-mismatch | closure=audible-body-carry',
        authorityMismatchReasonSummary: 'body still carries the same living segment while face and motion have not rejoined yet | closure=audible-body-carry',
        authorityMismatchDisplay: 'body still carries the same living segment while face and motion have not rejoined yet | closure=audible-body-carry',
        embodimentClosureStage: 'audible-body-carry',
      } as any,
      undefined,
    )

    expect(rows[0]?.embodimentClosureStage).toBe('audible-body-carry')
    expect(rows[0]?.speechEvidence?.embodimentClosureStage).toBe('audible-body-carry')
    expect(rows[0]?.speechSummaryEntries).toContainEqual(expect.objectContaining({
      key: 'closure-stage',
      value: 'audible-body-carry',
    }))
  })

  it('keeps structured same-her closure stage synchronized onto nested speech evidence snapshots when the top-level row derives it from settle authority summaries', () => {
    const cueId = 'segment-speech-authority-structured-stage-1'
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId,
          cueText: '让身体把这一段先接回渲染主链。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [
            { lane: 'settle', settle: true },
          ],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        speechEvidence: {
          voiceSummary: `zh-CN | closure=0.62 | precision=0.58 | provenance=authority-bound | segment=${cueId} | source=prosody-authority`,
          bodyContinuitySummary: null,
          prosodyAuthoritySummary: null,
          authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: false,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: `body=measured-return seg=${cueId} | lipsync=energy-phoneme-hybrid phase=playing seg=${cueId}`,
          visemeHintsSummary: null,
        },
        authorityBinding: {
          segmentId: cueId,
          rendererTarget: 'vrm',
          matchedDrivers: ['body', 'lipsync'],
          matchedSources: ['prosody-authority', 'voice-segment'],
          bodySegmentMatched: true,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
          voiceSegmentMatched: true,
        },
        authoritySummary: {
          cueId,
          segmentId: cueId,
          bindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body-carried-to-renderer-rejoin',
          matchSummary: 'body:yes face:no motion:no lipsync:yes',
          settleSummary: `authority-bound | segment=${cueId} | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | lane=body-carried-to-renderer-rejoin`,
          authorityTrustSummary: null,
        },
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        playbackCue: {
          authorityView: null,
        },
        cueMicro: null,
        cueMicroSummary: null,
        driverExecution: null,
        driverExecutionSummary: `body=measured-return seg=${cueId} | lipsync=energy-phoneme-hybrid phase=playing seg=${cueId}`,
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
        embodimentClosureStage: null,
      } as any,
      undefined,
    )

    expect(rows[0]?.embodimentClosureStage).toBe('body-carried-to-renderer-rejoin')
    expect(rows[0]?.speechEvidence?.embodimentClosureStage).toBe('body-carried-to-renderer-rejoin')
    expect(rows[0]?.speechSummaryEntries).toContainEqual(expect.objectContaining({
      key: 'closure-stage',
      value: 'body-carried-to-renderer-rejoin',
    }))
  })

  it('keeps same-her structured closure stages visible when legacy closure hints are absent upstream', () => {
    const cases = [
      {
        cueId: 'segment-same-her-live2d-only-speech-authority-1',
        rendererTarget: 'live2d' as const,
        matchedDrivers: ['face', 'motion', 'lipsync', 'voice'] as const,
        matchSummary: 'body:no face:yes motion:yes lipsync:yes voice:yes',
        driverExecutionSummary: 'face=attentive/focused | motion=observe_focus | lipsync=energy-phoneme-hybrid phase=playing',
        sameHerEvidence: {
          live2dAuthorityView: {
            sameHerExecutionAuthoritySegmentId: 'segment-same-her-live2d-only-speech-authority-1',
            sameHerExecutionSummary: 'aligned | authority=segment-same-her-live2d-only-speech-authority-1 | active=face, motion, lipsync, voice | closure=renderer-rejoin-without-body | lane=face+motion+lipsync+voice-only | remaining-open=none',
          },
          vrmAuthorityView: null,
        },
        expected: 'renderer-rejoin-without-body',
      },
      {
        cueId: 'segment-same-her-vrm-only-speech-authority-1',
        rendererTarget: 'vrm' as const,
        matchedDrivers: ['body', 'face', 'motion', 'lipsync', 'voice'] as const,
        matchSummary: 'body:yes face:yes motion:yes lipsync:yes voice:yes',
        driverExecutionSummary: 'body=measured-return seg=segment-same-her-vrm-only-speech-authority-1 | face=attentive/focused | motion=observe_focus | lipsync=energy-phoneme-hybrid phase=playing',
        sameHerEvidence: {
          live2dAuthorityView: null,
          vrmAuthorityView: {
            sameHerFramePerformanceSegmentId: 'segment-same-her-vrm-only-speech-authority-1',
            sameHerFrameSpeechSegmentId: 'segment-same-her-vrm-only-speech-authority-1',
            sameHerFrameSummary: 'aligned | segment=segment-same-her-vrm-only-speech-authority-1 | active=body, face, motion, lipsync, voice | closure=full-cross-modal-lock | lane=full-driver-rejoin | remaining-open=none',
          },
        },
        expected: 'full-cross-modal-lock',
      },
    ] as const

    for (const testCase of cases) {
      const rows = buildSpeechAuthoritySegmentRows(
        [
          {
            cueId: testCase.cueId,
            cueText: `same-her closure stage ${testCase.expected}`,
            driftStatus: 'partial-drift',
            aligned: false,
            entries: [
              { lane: 'settle', settle: true },
            ],
          },
        ] as any,
        {
          articulation: null,
          articulationSummary: null,
          speechEvidence: {
            voiceSummary: testCase.rendererTarget === 'live2d'
              ? `zh-CN | closure=0.62 | precision=0.58 | provenance=authority-bound | segment=${testCase.cueId} | source=prosody-authority`
              : null,
            bodyContinuitySummary: null,
            prosodyAuthoritySummary: null,
            authorityMatchSummary: testCase.matchSummary,
            topVisemeSummary: null,
            cueSummary: null,
            cueIdentityPresent: false,
            cueProsodyPresent: true,
            personaStyleSummary: null,
            timingSummary: null,
            driverExecutionSummary: testCase.driverExecutionSummary,
            visemeHintsSummary: null,
          },
          authorityBinding: {
            segmentId: testCase.cueId,
            rendererTarget: testCase.rendererTarget,
            matchedDrivers: [...testCase.matchedDrivers],
            matchedSources: ['prosody-authority', 'voice-segment'],
            bodySegmentMatched: testCase.rendererTarget === 'vrm',
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
            voiceSegmentMatched: true,
          },
          authoritySummary: {
            cueId: testCase.cueId,
            segmentId: testCase.cueId,
            bindingSummary: `target=${testCase.rendererTarget} | drivers=${testCase.matchedDrivers.join(', ')} | sources=prosody-authority, voice-segment`,
            matchSummary: testCase.matchSummary,
            settleSummary: `authority-bound | segment=${testCase.cueId} | target=${testCase.rendererTarget} | drivers=${testCase.matchedDrivers.join(', ')} | sources=prosody-authority, voice-segment`,
            authorityTrustSummary: null,
            authorityMismatchSummary: null,
            authorityMismatchReasonSummary: null,
            authorityMismatchDisplay: null,
          },
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          playbackCue: {
            authorityView: null,
          },
          cueMicro: null,
          cueMicroSummary: null,
          driverExecution: null,
          driverExecutionSummary: testCase.driverExecutionSummary,
          visemeHints: [],
          visemeHintsSummary: null,
          rendererAlignmentSummary: {
            live2d: null,
            vrm: null,
          },
          embodimentClosureStage: null,
        } as any,
        undefined,
        testCase.sameHerEvidence,
      )

      expect(rows[0]?.embodimentClosureStage).toBe(testCase.expected)
      expect(rows[0]?.speechEvidence?.embodimentClosureStage).toBe(testCase.expected)
      expect(rows[0]?.speechSummaryEntries).toContainEqual(expect.objectContaining({
        key: 'closure-stage',
        value: testCase.expected,
      }))
    }
  })

  it('does not leak stale Live2D same-her summary-only evidence into another speech authority row when explicit same-her segment ids are absent', () => {
    const cueId = 'segment-speech-authority-summary-only-current'
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId,
          cueText: '当前 authority 只剩身体线在托住。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [
            { lane: 'settle', settle: true },
          ],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        speechEvidence: {
          voiceSummary: null,
          bodyContinuitySummary: null,
          prosodyAuthoritySummary: null,
          authorityMatchSummary: 'body:yes face:no motion:no lipsync:no',
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
          segmentId: cueId,
          rendererTarget: 'vrm',
          matchedDrivers: ['body'],
          matchedSources: ['prosody-authority'],
          bodySegmentMatched: true,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: false,
          voiceSegmentMatched: false,
        },
        authoritySummary: {
          cueId,
          segmentId: cueId,
          bindingSummary: 'target=vrm | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no voice:no | lane=body-only',
          matchSummary: 'body:yes face:no motion:no lipsync:no voice:no',
          settleSummary: `authority-bound | segment=${cueId} | target=vrm | drivers=body | sources=prosody-authority`,
          authorityTrustSummary: null,
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
        },
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        playbackCue: {
          authorityView: null,
        },
        cueMicro: null,
        cueMicroSummary: null,
        driverExecution: null,
        driverExecutionSummary: null,
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
        embodimentClosureStage: null,
      } as any,
      undefined,
      {
        live2dAuthorityView: {
          sameHerExecutionSummary: 'aligned | authority=segment-speech-authority-summary-only-stale | active=face, motion, lipsync, voice | closure=renderer-rejoin-without-body | lane=face+motion+lipsync+voice-only | remaining-open=none',
        },
        vrmAuthorityView: null,
      },
    )

    expect(rows[0]?.embodimentClosureStage).toBeUndefined()
    expect(rows[0]?.speechEvidence?.embodimentClosureStage).toBeNull()
    expect(rows[0]?.speechSummaryEntries?.some(entry =>
      entry.key === 'closure-stage'
      && entry.value === 'renderer-rejoin-without-body',
    ) ?? false).toBe(false)
  })

  it('does not leak embodiment closure stage onto another observed segment when only one cue owns the same-her authority carry', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-audible-body-authority-owner',
          cueText: '这段 authority 还在由身体和声音托住。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [
            { lane: 'settle', settle: true },
          ],
        },
        {
          cueId: 'segment-observed-other',
          cueText: '别把 closure phase 串到这段。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        speechEvidence: {
          voiceSummary: null,
          bodyContinuitySummary: 'mode=thinking | stillness=0.72 | gaze=0.58 | breath=0.28 | expressivity=0.14 | closure=audible-body-carry | seg=segment-audible-body-authority-owner',
          prosodyAuthoritySummary: null,
          authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: false,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: 'body=measured-return seg=segment-audible-body-authority-owner | lipsync=energy-phoneme-hybrid phase=playing seg=segment-audible-body-authority-owner | closure=audible-body-carry',
          visemeHintsSummary: null,
        },
        authorityBinding: {
          segmentId: 'segment-audible-body-authority-owner',
          rendererTarget: 'vrm',
          matchedDrivers: ['body', 'lipsync'],
          matchedSources: ['prosody-authority'],
          bodySegmentMatched: true,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        authoritySummary: null,
        authorityMismatchSummary: 'face-mismatch, motion-mismatch | closure=audible-body-carry',
        authorityMismatchReasonSummary: 'body still carries the same living segment while face and motion have not rejoined yet | closure=audible-body-carry',
        authorityMismatchDisplay: 'body still carries the same living segment while face and motion have not rejoined yet | closure=audible-body-carry',
        cueMicro: {
          cueId: 'segment-observed-other',
          cueText: '别把 closure phase 串到这段。',
          prosodyWeight: null,
          mouthWeight: null,
          headWeight: null,
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          settleMode: 'hold',
        },
        cueMicroSummary: {
          cue: 'soft-gaze / observe_focus | provenance=fallback-derived segment=segment-observed-other',
          personaStyle: null,
          timing: 'segment-start | soft-interrupt | hold',
        },
        driverExecution: null,
        driverExecutionSummary: null,
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
        embodimentClosureStage: 'audible-body-carry',
      } as any,
      undefined,
    )

    expect(rows).toHaveLength(2)
    expect(rows[0]?.cueId).toBe('segment-audible-body-authority-owner')
    expect(rows[0]?.embodimentClosureStage).toBe('audible-body-carry')
    expect(rows[0]?.speechEvidence?.embodimentClosureStage).toBe('audible-body-carry')

    expect(rows[1]?.cueId).toBe('segment-observed-other')
    expect(rows[1]?.embodimentClosureStage).toBeUndefined()
    expect(rows[1]?.bodyContinuitySummary).toBeNull()
    expect(rows[1]?.speechEvidence?.bodyContinuitySummary).toBeNull()
    expect(rows[1]?.speechEvidence?.embodimentClosureStage).toBeNull()
    expect(rows[1]?.speechSummaryEntries?.some(entry => entry.key === 'closure-stage')).toBe(false)
  })

  it('does not leak authority-bound prosody summary onto another observed segment when only one cue owns the living speech line', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-prosody-authority-owner',
          cueText: '这段韵律还在托住她。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [
            { lane: 'settle', settle: true },
          ],
        },
        {
          cueId: 'segment-prosody-other',
          cueText: '别把韵律主线串到这里。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        speechEvidence: {
          voiceSummary: null,
          bodyContinuitySummary: null,
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-prosody-authority-owner',
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
        authorityBinding: {
          segmentId: 'segment-prosody-authority-owner',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        authoritySummary: null,
        authorityMismatchSummary: 'face-mismatch, motion-mismatch | closure=voice-lipsync-carry',
        authorityMismatchReasonSummary: 'voice and lipsync still carry the same living segment while face and motion have not rejoined yet | closure=voice-lipsync-carry',
        authorityMismatchDisplay: 'voice and lipsync still carry the same living segment while face and motion have not rejoined yet | closure=voice-lipsync-carry',
        cueMicro: {
          cueId: 'segment-prosody-other',
          cueText: '别把韵律主线串到这里。',
          prosodyWeight: null,
          mouthWeight: null,
          headWeight: null,
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          settleMode: 'hold',
        },
        cueMicroSummary: {
          cue: 'soft-gaze / observe_focus | provenance=fallback-derived segment=segment-prosody-other',
          personaStyle: null,
          timing: 'segment-start | soft-interrupt | hold',
        },
        driverExecution: null,
        driverExecutionSummary: null,
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      undefined,
    )

    expect(rows).toHaveLength(2)
    expect(rows[0]?.cueId).toBe('segment-prosody-authority-owner')
    expect(rows[0]?.prosodyAuthoritySummary).toBe(
      'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-prosody-authority-owner',
    )
    expect(rows[0]?.speechEvidence?.prosodyAuthoritySummary).toBe(
      'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-prosody-authority-owner',
    )

    expect(rows[1]?.cueId).toBe('segment-prosody-other')
    expect(rows[1]?.prosodyAuthoritySummary).toBeNull()
    expect(rows[1]?.speechEvidence?.prosodyAuthoritySummary).toBeNull()
    expect(rows[1]?.speechSummaryEntries?.some(entry => entry.key === 'prosody-authority')).toBe(false)
  })

  it('keeps structured voice lane continuity visible even before a formatted voice summary string is available', () => {
    const cueId = 'segment-structured-voice-authority-owner'
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId,
          cueText: '声音已经并回这一段，但摘要字符串还没生成。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [
            { lane: 'settle', settle: true },
          ],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        speechEvidence: {
          voiceSummary: null,
          bodyContinuitySummary: null,
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.31 | head=0.24 | visemePeak=0.58 | provenance=authority-bound | source=prosody-authority | segment=segment-structured-voice-authority-owner',
          authorityMatchSummary: 'face:no motion:no lipsync:yes',
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: false,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: 'lipsync=energy-phoneme-hybrid phase=playing seg=segment-structured-voice-authority-owner',
          visemeHintsSummary: null,
        },
        authorityBinding: {
          segmentId: cueId,
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority', 'voice-segment'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
          voiceSegmentMatched: true,
        },
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
        authoritySummary: {
          cueId,
          segmentId: cueId,
          bindingSummary: 'upstream authority binding',
          matchSummary: 'face:no motion:no lipsync:yes',
          settleSummary: `authority-bound | segment=${cueId} | target=vrm | drivers=lipsync | sources=prosody-authority, voice-segment`,
          authorityTrustSummary: null,
        },
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情和动作还没回到这一段里，但声音已经和口型一起并回主线。',
        authorityMismatchDisplay: '表情和动作还没回到这一段里，但声音已经和口型一起并回主线。',
        cueMicro: null,
        cueMicroSummary: null,
        driverExecution: null,
        driverExecutionSummary: 'lipsync=energy-phoneme-hybrid phase=playing seg=segment-structured-voice-authority-owner',
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      undefined,
    )

    expect(rows[0]?.authorityMatchedDrivers).toEqual(['lipsync', 'voice'])
    expect(rows[0]?.authorityTrustSummary).toBe(
      'VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。',
    )
    expect(rows[0]?.speechSummaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority',
      value: 'upstream authority binding | 表情未命中 / 动作未命中 / 口型命中 / 声音命中',
    }))
  })

  it('does not leak driver execution summary onto another observed segment when the execution snapshot belongs to one authority owner', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-driver-owner',
          cueText: '这段执行还在她的主线上。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [
            { lane: 'settle', settle: true },
          ],
        },
        {
          cueId: 'segment-driver-other',
          cueText: '别把执行落点串到这里。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        speechEvidence: {
          voiceSummary: null,
          bodyContinuitySummary: null,
          prosodyAuthoritySummary: null,
          authorityMatchSummary: 'face:no motion:no lipsync:yes',
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: false,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: 'face=attentive/focused@0.61 hold=320 pre=soften post=hold-soft src=prosody-authority conf=0.83 seg=segment-driver-owner | motion=observe_focus mode=observe-first idle=breathing-idle@0.48 hold=240 src=timeline-projection conf=0.79 seg=segment-driver-owner | lipsync=energy-phoneme-hybrid phase=playing seg=segment-driver-owner',
          visemeHintsSummary: null,
        },
        authorityBinding: {
          segmentId: 'segment-driver-owner',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        authoritySummary: null,
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        cueMicro: {
          cueId: 'segment-driver-other',
          cueText: '别把执行落点串到这里。',
          prosodyWeight: null,
          mouthWeight: null,
          headWeight: null,
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          settleMode: 'hold',
        },
        cueMicroSummary: {
          cue: 'soft-gaze / observe_focus | provenance=fallback-derived segment=segment-driver-other',
          personaStyle: null,
          timing: 'segment-start | soft-interrupt | hold',
        },
        driverExecution: null,
        driverExecutionSummary: 'face=attentive/focused@0.61 hold=320 pre=soften post=hold-soft src=prosody-authority conf=0.83 seg=segment-driver-owner | motion=observe_focus mode=observe-first idle=breathing-idle@0.48 hold=240 src=timeline-projection conf=0.79 seg=segment-driver-owner | lipsync=energy-phoneme-hybrid phase=playing seg=segment-driver-owner',
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      undefined,
    )

    expect(rows).toHaveLength(2)
    expect(rows[0]?.cueId).toBe('segment-driver-owner')
    expect(rows[0]?.driverExecutionSummary).toBe(
      'face=attentive/focused@0.61 hold=320 pre=soften post=hold-soft src=prosody-authority conf=0.83 seg=segment-driver-owner | motion=observe_focus mode=observe-first idle=breathing-idle@0.48 hold=240 src=timeline-projection conf=0.79 seg=segment-driver-owner | lipsync=energy-phoneme-hybrid phase=playing seg=segment-driver-owner',
    )
    expect(rows[0]?.speechEvidence?.driverExecutionSummary).toBe(
      'face=attentive/focused@0.61 hold=320 pre=soften post=hold-soft src=prosody-authority conf=0.83 seg=segment-driver-owner | motion=observe_focus mode=observe-first idle=breathing-idle@0.48 hold=240 src=timeline-projection conf=0.79 seg=segment-driver-owner | lipsync=energy-phoneme-hybrid phase=playing seg=segment-driver-owner',
    )

    expect(rows[1]?.cueId).toBe('segment-driver-other')
    expect(rows[1]?.driverExecutionSummary).toBeNull()
    expect(rows[1]?.speechEvidence?.driverExecutionSummary).toBeNull()
    expect(rows[1]?.speechSummaryEntries?.some(entry => entry.key === 'driver-execution')).toBe(false)
  })

  it('does not leak viseme hint summary onto another observed segment when the mouth-shape evidence belongs to one authority owner', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-viseme-owner',
          cueText: '这段口型提示还在她的主线上。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [
            { lane: 'settle', settle: true },
          ],
        },
        {
          cueId: 'segment-viseme-other',
          cueText: '别把口型提示串到这里。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        speechEvidence: {
          voiceSummary: null,
          bodyContinuitySummary: null,
          prosodyAuthoritySummary: null,
          authorityMatchSummary: 'face:no motion:no lipsync:yes',
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: false,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: null,
          visemeHintsSummary: 'I:0.35@0.94 | closed:0.75@0.89',
        },
        authorityBinding: {
          segmentId: 'segment-viseme-owner',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        authoritySummary: null,
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        cueMicro: {
          cueId: 'segment-viseme-other',
          cueText: '别把口型提示串到这里。',
          prosodyWeight: null,
          mouthWeight: null,
          headWeight: null,
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          settleMode: 'hold',
        },
        cueMicroSummary: {
          cue: 'soft-gaze / observe_focus | provenance=fallback-derived segment=segment-viseme-other',
          personaStyle: null,
          timing: 'segment-start | soft-interrupt | hold',
        },
        driverExecution: null,
        driverExecutionSummary: null,
        visemeHints: [],
        visemeHintsSummary: 'I:0.35@0.94 | closed:0.75@0.89',
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      undefined,
    )

    expect(rows).toHaveLength(2)
    expect(rows[0]?.cueId).toBe('segment-viseme-owner')
    expect(rows[0]?.visemeHintsSummary).toBe('I:0.35@0.94 | closed:0.75@0.89')
    expect(rows[0]?.speechEvidence?.visemeHintsSummary).toBe('I:0.35@0.94 | closed:0.75@0.89')

    expect(rows[1]?.cueId).toBe('segment-viseme-other')
    expect(rows[1]?.visemeHintsSummary).toBeNull()
    expect(rows[1]?.speechEvidence?.visemeHintsSummary).toBeNull()
    expect(rows[1]?.speechSummaryEntries?.some(entry => entry.key === 'viseme-hints')).toBe(false)
  })

  it('does not rewrite a voice summary onto another observed segment when the living utterance still belongs to one authority owner', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-voice-owner',
          cueText: '这段语音还是她的主线。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [
            { lane: 'settle', settle: true },
          ],
        },
        {
          cueId: 'segment-voice-other',
          cueText: '别把语音摘要重写到这里。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [],
        },
      ] as any,
      {
        articulation: {
          active: true,
          voiceLanguage: 'zh-CN',
          closureBias: 0.84,
          consonantPrecision: 0.9,
          vowelLegato: 0.3,
          lipClosure: 0.44,
          lipRound: 0.12,
          lipSpread: 0.18,
          jawOpen: 0.28,
          openness: 0.36,
          topVisemes: [],
        },
        articulationSummary: {
          voice: 'zh-CN | closure=0.84 | precision=0.90',
          topVisemes: null,
        },
        speechEvidence: {
          voiceSummary: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-voice-owner | source=prosody-authority',
          bodyContinuitySummary: null,
          prosodyAuthoritySummary: null,
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
        authorityBinding: {
          segmentId: 'segment-voice-owner',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        authoritySummary: null,
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        cueMicro: {
          cueId: 'segment-voice-other',
          cueText: '别把语音摘要重写到这里。',
          prosodyWeight: null,
          mouthWeight: null,
          headWeight: null,
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          settleMode: 'hold',
        },
        cueMicroSummary: {
          cue: 'soft-gaze / observe_focus | provenance=fallback-derived segment=segment-voice-other',
          personaStyle: null,
          timing: 'segment-start | soft-interrupt | hold',
        },
        driverExecution: null,
        driverExecutionSummary: null,
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      undefined,
    )

    expect(rows).toHaveLength(2)
    expect(rows[0]?.cueId).toBe('segment-voice-owner')
    expect(rows[0]?.voiceSummary).toBe('zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-voice-owner | source=n/a')
    expect(rows[0]?.speechEvidence?.voiceSummary).toBe('zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-voice-owner | source=n/a')

    expect(rows[1]?.cueId).toBe('segment-voice-other')
    expect(rows[1]?.voiceSummary).toBeNull()
    expect(rows[1]?.speechEvidence?.voiceSummary).toBeNull()
    expect(rows[1]?.speechSummaryEntries?.some(entry => entry.key === 'voice')).toBe(false)
  })

  it('does not leak top viseme summary onto another observed segment when the mouth-shape snapshot belongs to one authority owner', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-top-viseme-owner',
          cueText: '这段主嘴型还是她的主线。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [
            { lane: 'settle', settle: true },
          ],
        },
        {
          cueId: 'segment-top-viseme-other',
          cueText: '别把主嘴型串到这里。',
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [],
        },
      ] as any,
      {
        articulation: {
          active: true,
          voiceLanguage: 'zh-CN',
          closureBias: 0.84,
          consonantPrecision: 0.9,
          vowelLegato: 0.3,
          lipClosure: 0.44,
          lipRound: 0.12,
          lipSpread: 0.18,
          jawOpen: 0.28,
          openness: 0.36,
          topVisemes: [],
        },
        articulationSummary: {
          voice: null,
          topVisemes: 'A:0.66, closed:0.41, E:0.24',
        },
        speechEvidence: {
          voiceSummary: null,
          bodyContinuitySummary: null,
          prosodyAuthoritySummary: null,
          authorityMatchSummary: 'face:no motion:no lipsync:yes',
          topVisemeSummary: 'A:0.66, closed:0.41, E:0.24',
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: false,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: null,
          visemeHintsSummary: null,
        },
        authorityBinding: {
          segmentId: 'segment-top-viseme-owner',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          bodySegmentMatched: false,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        authoritySummary: null,
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        cueMicro: {
          cueId: 'segment-top-viseme-other',
          cueText: '别把主嘴型串到这里。',
          prosodyWeight: null,
          mouthWeight: null,
          headWeight: null,
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          settleMode: 'hold',
        },
        cueMicroSummary: {
          cue: 'soft-gaze / observe_focus | provenance=fallback-derived segment=segment-top-viseme-other',
          personaStyle: null,
          timing: 'segment-start | soft-interrupt | hold',
        },
        driverExecution: null,
        driverExecutionSummary: null,
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      undefined,
    )

    expect(rows).toHaveLength(2)
    expect(rows[0]?.cueId).toBe('segment-top-viseme-owner')
    expect(rows[0]?.topVisemeSummary).toBe('A:0.66, closed:0.41, E:0.24')
    expect(rows[0]?.speechEvidence?.topVisemeSummary).toBe('A:0.66, closed:0.41, E:0.24')

    expect(rows[1]?.cueId).toBe('segment-top-viseme-other')
    expect(rows[1]?.topVisemeSummary).toBeNull()
    expect(rows[1]?.speechEvidence?.topVisemeSummary).toBeNull()
    expect(rows[1]?.speechSummaryEntries?.some(entry => entry.key === 'visemes')).toBe(false)
  })

  it('prefers an upstream observability authority mismatch display over locally recomputing the same cue mismatch', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-display-first',
          cueText: '继续看这里。',
          surfaces: ['vrm'],
          lanes: ['lipsync'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        authorityBinding: {
          segmentId: 'segment-display-first',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        authoritySummary: null,
        authorityMismatchDisplay: '上游 authority 展示：当前仍在同一主线程里，但表情与动作、口型落点已分叉；当前表面策略是 procedural-carry。',
        cueMicro: {
          cueId: 'segment-display-first',
          cueText: '继续看这里。',
          prosodyWeight: 0.36,
          mouthWeight: 0.28,
          headWeight: 0.32,
          personaStyleSummary: null,
          facialHoldMs: 320,
          actionHoldMs: 240,
          emotionHoldMs: 360,
          facialCue: 'focused',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: 'hold',
        },
        cueMicroSummary: {
          cue: 'focused / observe_focus | prosody=0.36 mouth=0.28 head=0.32',
          personaStyle: null,
          timing: 'facial=320 action=240 emotion=360 | segment-start | soft-interrupt | hold',
        },
        driverExecution: {
          face: {
            segmentId: 'segment-display-first',
            emotion: 'attentive',
            facialCue: 'focused',
            intensity: 0.61,
            holdMs: 320,
            source: 'prosody-authority',
            confidence: 0.83,
            preUtteranceCue: 'soften',
            postUtteranceCue: 'hold-soft',
          },
          motion: {
            segmentId: 'segment-display-first',
            idleBase: 'breathing-idle',
            attentionMode: 'observe-first',
            actionCue: 'observe_focus',
            intensity: 0.48,
            holdMs: 240,
            source: 'timeline-projection',
            confidence: 0.79,
          },
          lipsync: {
            segmentId: 'segment-display-first',
            mode: 'energy-phoneme-hybrid',
            playbackPhase: 'playing',
          },
        },
        driverExecutionSummary: null,
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      {
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:rest:1',
          activeThreadId: 'runtime-thread-rest-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceDetails: [],
      },
    )

    expect(rows[0]?.authorityMismatchDisplay).toBe('上游 authority 展示：当前仍在同一主线程里，但表情与动作、口型落点已分叉；当前表面策略是 procedural-carry。')
    expect(rows[0]?.speechSummaryEntries?.find(entry => entry.key === 'authority-mismatch')).toEqual({
      key: 'authority-mismatch',
      label: '权威漂移',
      value: '上游 authority 展示：当前仍在同一主线程里，但表情与动作、口型落点已分叉；当前表面策略是 procedural-carry。',
    })
  })

  it('does not leak renderer drift summary into non-authority observed segments', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-authority',
          cueText: '权威片段。',
          surfaces: ['vrm'],
          lanes: ['lipsync'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [],
        },
        {
          cueId: 'segment-observed-only',
          cueText: '只是被观测到的片段。',
          surfaces: ['vrm'],
          lanes: ['lipsync'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        authorityBinding: {
          segmentId: 'segment-authority',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        authoritySummary: {
          cueId: 'segment-authority',
          segmentId: 'segment-authority',
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          settleSummary: '上游 authority settle',
        },
        cueMicro: {
          cueId: 'segment-observed-only',
          cueText: '只是被观测到的片段。',
          prosodyWeight: 0.3,
          mouthWeight: 0.2,
          headWeight: 0.1,
          personaStyleSummary: null,
          facialHoldMs: 200,
          actionHoldMs: 180,
          emotionHoldMs: 240,
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: 'hold',
        },
        cueMicroSummary: {
          cue: 'soft-gaze / observe_focus | prosody=0.30 mouth=0.20 head=0.10',
          personaStyle: null,
          timing: 'facial=200 action=180 emotion=240 | segment-start | soft-interrupt | hold',
        },
        driverExecution: null,
        driverExecutionSummary: null,
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: '上游 Live2D 显形归因',
          vrm: '上游 VRM 显形归因',
        },
      } as any,
      {
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:authority:1',
          activeThreadId: 'runtime-thread-authority-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceDetails: [],
      },
    )

    expect(rows).toEqual([
      expect.objectContaining({
        cueId: 'segment-authority',
        authoritySegmentMatched: true,
        rendererDriftSummary: '上游 Live2D 显形归因',
      }),
      expect.objectContaining({
        cueId: 'segment-observed-only',
        authoritySegmentMatched: false,
        rendererDriftSummary: null,
      }),
    ])
  })

  it('does not leak trace embodiment summary into non-authority observed segments', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-authority',
          cueText: '权威片段。',
          surfaces: ['vrm'],
          lanes: ['lipsync'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [],
        },
        {
          cueId: 'segment-observed-only',
          cueText: '只是被观测到的片段。',
          surfaces: ['vrm'],
          lanes: ['lipsync'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        authorityBinding: {
          segmentId: 'segment-authority',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        authoritySummary: {
          cueId: 'segment-authority',
          segmentId: 'segment-authority',
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          settleSummary: '上游 authority settle',
        },
        cueMicro: {
          cueId: 'segment-observed-only',
          cueText: '只是被观测到的片段。',
          prosodyWeight: 0.3,
          mouthWeight: 0.2,
          headWeight: 0.1,
          personaStyleSummary: null,
          facialHoldMs: 200,
          actionHoldMs: 180,
          emotionHoldMs: 240,
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: 'hold',
        },
        cueMicroSummary: {
          cue: 'soft-gaze / observe_focus | prosody=0.30 mouth=0.20 head=0.10',
          personaStyle: null,
          timing: 'facial=200 action=180 emotion=240 | segment-start | soft-interrupt | hold',
        },
        driverExecution: null,
        driverExecutionSummary: null,
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      {
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:authority:1',
          activeThreadId: 'runtime-thread-authority-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceDetails: [
          {
            kind: 'presence-pulse-dispatched',
            summary: 'protective-watch settled after fatigue pressure rose',
            createdAt: 2_468,
            details: [
              { label: 'scenario', value: 'late-night-fatigue' },
              { label: 'stance', value: 'observe-first' },
            ],
          },
        ],
      },
    )

    expect(rows).toEqual([
      expect.objectContaining({
        cueId: 'segment-authority',
        authoritySegmentMatched: true,
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=none | scenario=late-night-fatigue | stance=observe-first',
      }),
      expect.objectContaining({
        cueId: 'segment-observed-only',
        authoritySegmentMatched: false,
        traceEmbodimentSummary: null,
      }),
    ])
  })

  it('does not reuse authority summary binding, match, or settle text when the authority summary belongs to another cue', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-current-authority',
          cueText: '当前 authority cue。',
          surfaces: ['vrm'],
          lanes: ['settle'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'settle',
              cueId: 'segment-current-authority',
              planned: 'settle',
              consumed: 'settle',
              source: null,
              aligned: false,
              settle: {
                vrmActionFadeMs: {
                  planned: 280,
                  consumed: 320,
                },
              },
            },
          ],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        authorityBinding: {
          segmentId: 'segment-current-authority',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        authoritySummary: {
          cueId: 'segment-other-authority-summary',
          segmentId: 'segment-other-authority-summary',
          bindingSummary: '上游 authority 绑定',
          matchSummary: '上游 authority 命中',
          settleSummary: '上游 authority settle',
        },
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        cueMicro: null,
        cueMicroSummary: null,
        driverExecution: null,
        driverExecutionSummary: null,
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      {
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:authority:scoped-1',
          activeThreadId: 'runtime-thread-authority-scoped-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceDetails: [],
      },
    )

    expect(rows).toEqual([
      {
        cueId: 'segment-current-authority',
        cueText: '当前 authority cue。',
        driftStatus: 'partial-drift',
        aligned: false,
        authorityRendererTarget: 'vrm',
        residentMode: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        authoritySegmentMatched: true,
        authorityMatchedDrivers: ['lipsync'],
        authorityMatchedSources: ['prosody-authority'],
        authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only',
        authorityMatchSummary: 'face:no motion:no lipsync:yes',
        authorityTrustSummary: 'VRM 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。',
        authorityMismatchDisplay: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。',
        bodyContinuitySummary: null,
        speechEvidence: {
          voiceSummary: null,
          bodyContinuitySummary: null,
          embodimentClosureStage: null,
          prosodyAuthoritySummary: null,
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
        speechSummaryEntries: [
          { key: 'authority', label: '权威绑定', value: '目标 VRM，驱动 口型，来源 prosody-authority，命中 表情未命中 / 动作未命中 / 口型命中，当前仅剩口型维持同一段连续性', technicalValue: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only' },
          { key: 'authority-match', label: '绑定命中', value: '表情未命中 / 动作未命中 / 口型命中', technicalValue: 'face:no motion:no lipsync:yes' },
          { key: 'authority-trust', label: '权威可信性', value: 'VRM 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。' },
          { key: 'authority-mismatch', label: '权威漂移', value: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。' },
          { key: 'trace-embodiment', label: '轨迹落点', value: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 口型，实际执行 无', technicalValue: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=none' },
          { key: 'settle-authority', label: '稳定段归因', value: 'authority-bound，片段 segment-current-authority，目标 VRM，驱动 口型，来源 prosody-authority，当前仅剩口型维持同一段连续性', technicalValue: 'authority-bound | segment=segment-current-authority | target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only' },
        ],
        settleAuthoritySummary: 'authority-bound | segment=segment-current-authority | target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only',
        rendererDriftSummary: null,
        voiceSummary: null,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        faceCue: null,
        actionCue: null,
        weightSummary: null,
        prosodyAuthoritySummary: null,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: null,
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=none',
        visemeHintsSummary: null,
      },
    ])
  })

  it('does not reuse same-cue upstream authority summaries when their segment drifts onto another embodied line', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-current-same-cue',
          cueText: '当前 embodied line。',
          surfaces: ['vrm'],
          lanes: ['settle'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'settle',
              cueId: 'segment-current-same-cue',
              planned: 'settle',
              consumed: 'settle',
              source: null,
              aligned: false,
              settle: {
                vrmActionFadeMs: {
                  planned: 260,
                  consumed: 300,
                },
              },
            },
          ],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        authorityBinding: {
          segmentId: 'segment-current-same-cue',
          rendererTarget: 'vrm',
          matchedDrivers: ['body'],
          matchedSources: ['prosody-authority'],
          bodySegmentMatched: true,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: false,
        },
        authoritySummary: {
          cueId: 'segment-current-same-cue',
          segmentId: 'segment-upstream-other-same-cue',
          bindingSummary: '上游 authority 绑定：别把另一段身体线拿来复用。',
          matchSummary: 'body:no face:yes motion:yes lipsync:yes',
          authorityTrustSummary: '上游 authority trust：这其实还是另一段没有退干净的身体线。',
          settleSummary: 'authority-bound | segment=segment-upstream-other-same-cue | target=vrm | drivers=face, motion, lipsync | sources=timeline-projection',
        },
        playbackCue: {
          authorityView: {
            cueId: 'segment-current-same-cue',
            authoritySegmentId: 'segment-current-same-cue',
            authorityRendererTarget: 'vrm',
            authorityMatchedDrivers: ['body'],
            authoritySources: ['prosody-authority'],
            authorityTrustSummary: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
            prosodyAuthoritySummary: null,
            traceEmbodimentSummary: null,
            residentMode: null,
            preferredBlinkCadence: null,
            preferredGazeMode: null,
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
            authorityBindingSummary: 'target=vrm | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no | lane=body-only',
            authorityMatchSummary: 'body:yes face:no motion:no lipsync:no',
            settleAuthoritySummary: 'authority-bound | segment=segment-current-same-cue | target=vrm | drivers=body | sources=prosody-authority',
            summaryEntries: [],
            preferredExpressionAliases: [],
            preferredMotionAliases: [],
            live2dFacialReleaseMs: null,
            live2dMotionFollowThroughMs: null,
            vrmActionFadeMs: null,
            vrmExpressionBlendMs: null,
          },
        },
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        cueMicro: null,
        cueMicroSummary: null,
        driverExecution: null,
        driverExecutionSummary: null,
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      undefined,
    )

    expect(rows).toEqual([
      expect.objectContaining({
        cueId: 'segment-current-same-cue',
        authoritySegmentMatched: true,
        authorityBindingSummary: 'target=vrm | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no | lane=body-only',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:no',
        authorityTrustSummary: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
        settleAuthoritySummary: 'authority-bound | segment=segment-current-same-cue | target=vrm | drivers=body | sources=prosody-authority',
      }),
    ])
    expect(rows[0]?.speechSummaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority-trust',
      value: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
    }))
    expect(rows[0]?.speechSummaryEntries).toContainEqual(expect.objectContaining({
      key: 'settle-authority',
      technicalValue: 'authority-bound | segment=segment-current-same-cue | target=vrm | drivers=body | sources=prosody-authority',
    }))
  })

  it('keeps repair-before-closeness trust visible in speech authority segment rows when companionship hints only survive on playback cue authority view', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-repair-speech-authority-1',
          cueText: '先别急着靠近。',
          surfaces: ['vrm'],
          lanes: ['lipsync'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        speechEvidence: {
          voiceSummary: null,
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.31 | mouth=0.29 | head=0.18 | visemePeak=0.63 | provenance=authority-bound | source=prosody-authority | segment=segment-repair-speech-authority-1',
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
          segmentId: 'segment-repair-speech-authority-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['lipsync'],
          matchedSources: ['prosody-authority'],
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        playbackCue: {
          authorityView: {
            cueId: 'segment-repair-speech-authority-1',
            authoritySegmentId: 'segment-repair-speech-authority-1',
            authorityRendererTarget: 'vrm',
            authorityMatchedDrivers: ['lipsync'],
            authoritySources: ['prosody-authority'],
            authorityTrustSummary: 'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。',
            prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.31 | mouth=0.29 | head=0.18 | visemePeak=0.63 | provenance=authority-bound | source=prosody-authority | segment=segment-repair-speech-authority-1',
            traceEmbodimentSummary: null,
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
            authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only',
            authorityMatchSummary: 'face:no motion:no lipsync:yes',
            settleAuthoritySummary: 'authority-bound | segment=segment-repair-speech-authority-1 | target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only',
            summaryEntries: [],
            preferredExpressionAliases: ['SoftRepair'],
            preferredMotionAliases: ['ObserveStill'],
            live2dFacialReleaseMs: null,
            live2dMotionFollowThroughMs: null,
            vrmActionFadeMs: 360,
            vrmExpressionBlendMs: 420,
          },
        },
        authoritySummary: null,
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行。',
        authorityMismatchDisplay: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行。',
        cueMicro: null,
        cueMicroSummary: null,
        driverExecution: null,
        visemeHints: [],
        visemeHintsSummary: null,
        driverExecutionSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      undefined,
    )

    expect(rows).toEqual([
      expect.objectContaining({
        cueId: 'segment-repair-speech-authority-1',
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        authorityTrustSummary: 'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。',
        speechSummaryEntries: expect.arrayContaining([
          {
            key: 'authority-trust',
            label: '权威可信性',
            value: 'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。',
          },
        ]),
      }),
    ])
  })

  it('keeps thinner affective-residue room-making wording visible in speech authority settle summaries when playback cue authority still carries the measured-return line', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-thin-affective-speech-authority',
          cueText: '先轻一点接住这条线。',
          surfaces: ['vrm'],
          lanes: ['settle'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'settle',
              cueId: 'segment-thin-affective-speech-authority',
              planned: 'settle',
              consumed: 'settle',
              source: null,
              settle: {
                vrmActionFadeMs: {
                  planned: 280,
                  consumed: 320,
                },
              },
              aligned: false,
            },
          ],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        speechEvidence: {
          voiceSummary: null,
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-thin-affective-speech-authority',
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
        authorityBinding: {
          segmentId: 'segment-thin-affective-speech-authority',
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          matchedSources: ['prosody-authority', 'timeline-projection'],
          faceSegmentMatched: true,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: true,
        },
        playbackCue: {
          authorityView: {
            cueId: 'segment-thin-affective-speech-authority',
            authoritySegmentId: 'segment-thin-affective-speech-authority',
            authorityRendererTarget: 'vrm',
            authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
            authoritySources: ['prosody-authority', 'timeline-projection'],
            authorityTrustSummary: null,
            prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-thin-affective-speech-authority',
            traceEmbodimentSummary: null,
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
            authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
            authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
            settleAuthoritySummary: 'authority-bound | segment=segment-thin-affective-speech-authority | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
            summaryEntries: [],
            preferredExpressionAliases: [],
            preferredMotionAliases: [],
            live2dFacialReleaseMs: null,
            live2dMotionFollowThroughMs: null,
            vrmActionFadeMs: 320,
            vrmExpressionBlendMs: null,
          },
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
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      undefined,
    )

    expect(rows[0]?.settleAuthoritySummary).toContain('余韵还在')
    expect(rows[0]?.speechSummaryEntries).toContainEqual(expect.objectContaining({
      key: 'settle-authority',
      value: expect.stringContaining('余韵还在'),
    }))
  })

  it('rebuilds thin affective authority trust in speech authority rows from settle authority reason when outer trust is absent', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-thin-affective-speech-authority-trust',
          cueText: '先把这层余温留住。',
          surfaces: ['vrm'],
          lanes: ['settle'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        speechEvidence: {
          voiceSummary: null,
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-thin-affective-speech-authority-trust',
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
        authorityBinding: {
          segmentId: 'segment-thin-affective-speech-authority-trust',
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          matchedSources: ['prosody-authority', 'timeline-projection'],
          faceSegmentMatched: true,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: true,
        },
        playbackCue: {
          authorityView: {
            cueId: 'segment-thin-affective-speech-authority-trust',
            authoritySegmentId: 'segment-thin-affective-speech-authority-trust',
            authorityRendererTarget: 'vrm',
            authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
            authoritySources: ['prosody-authority', 'timeline-projection'],
            authorityTrustSummary: null,
            prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-thin-affective-speech-authority-trust',
            traceEmbodimentSummary: null,
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
            authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
            authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
            settleAuthoritySummary: 'authority-bound | segment=segment-thin-affective-speech-authority-trust | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
            summaryEntries: [],
            preferredExpressionAliases: [],
            preferredMotionAliases: [],
            live2dFacialReleaseMs: null,
            live2dMotionFollowThroughMs: null,
            vrmActionFadeMs: null,
            vrmExpressionBlendMs: null,
          },
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
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      undefined,
    )

    expect(rows[0]?.authorityTrustSummary).toContain('余韵还在，先留白，别立刻把温度放大')
    expect(rows[0]?.speechSummaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority-trust',
      value: expect.stringContaining('余韵还在，先留白，别立刻把温度放大'),
    }))
  })

  it('prefers richer settle-reason trust over thinner generic upstream trust in speech authority rows', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-thin-affective-speech-authority-runtime-override-1',
          cueText: '先把这层余温留住。',
          surfaces: ['vrm'],
          lanes: ['settle'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        speechEvidence: {
          voiceSummary: null,
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-thin-affective-speech-authority-runtime-override-1',
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
        authorityBinding: {
          segmentId: 'segment-thin-affective-speech-authority-runtime-override-1',
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          matchedSources: ['prosody-authority', 'timeline-projection'],
          faceSegmentMatched: true,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: true,
        },
        playbackCue: {
          authorityView: {
            cueId: 'segment-thin-affective-speech-authority-runtime-override-1',
            authoritySegmentId: 'segment-thin-affective-speech-authority-runtime-override-1',
            authorityRendererTarget: 'vrm',
            authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
            authoritySources: ['prosody-authority', 'timeline-projection'],
            authorityTrustSummary: null,
            prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-thin-affective-speech-authority-runtime-override-1',
            traceEmbodimentSummary: null,
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
            authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
            authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
            settleAuthoritySummary: 'authority-bound | segment=segment-thin-affective-speech-authority-runtime-override-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
            summaryEntries: [],
            preferredExpressionAliases: [],
            preferredMotionAliases: [],
            live2dFacialReleaseMs: null,
            live2dMotionFollowThroughMs: null,
            vrmActionFadeMs: null,
            vrmExpressionBlendMs: null,
          },
        },
        authoritySummary: {
          cueId: 'segment-thin-affective-speech-authority-runtime-override-1',
          segmentId: 'segment-thin-affective-speech-authority-runtime-override-1',
          rendererTarget: 'vrm',
          bindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
          matchSummary: 'face:yes motion:yes lipsync:yes',
          authorityTrustSummary: 'VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          settleSummary: 'authority-bound | segment=segment-thin-affective-speech-authority-runtime-override-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
        },
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        cueMicro: null,
        cueMicroSummary: null,
        driverExecution: null,
        visemeHints: [],
        visemeHintsSummary: null,
        driverExecutionSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      undefined,
    )

    expect(rows[0]?.authorityTrustSummary).toContain('余韵还在，先留白，别立刻把温度放大')
    expect(rows[0]?.speechSummaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority-trust',
      value: expect.stringContaining('余韵还在，先留白，别立刻把温度放大'),
    }))
  })

  it('preserves same-her signature and reason tags in speech authority summary entries when playback authority already carries shared-line proof', () => {
    const cueId = 'segment-same-her-speech-authority'
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId,
          cueText: '身体、口型和声音还在把这一句托在同一条线上。',
          surfaces: ['vrm'],
          lanes: ['lipsync'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        speechEvidence: null,
        authorityBinding: {
          segmentId: cueId,
          rendererTarget: 'vrm',
          matchedDrivers: ['body', 'lipsync'],
          matchedSources: ['prosody-authority', 'voice-segment'],
          bodySegmentMatched: true,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        authoritySummary: null,
        playbackCue: {
          authorityView: {
            cueId,
            authoritySegmentId: cueId,
            authorityRendererTarget: 'vrm',
            authorityMatchedDrivers: ['body', 'lipsync'],
            authoritySources: ['prosody-authority', 'voice-segment'],
            authorityTrustSummary: null,
            settleAuthoritySummary: `authority-bound | segment=${cueId} | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment`,
            authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync+voice-only',
            authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
            reasonTags: [
              'embodiment:audible-same-her-line',
              'embodiment:still-voiced-motion-line',
            ],
            signature: 'embodiment:body-lipsync-voice-rejoin',
            summaryEntries: [],
            preferredExpressionAliases: [],
            preferredMotionAliases: [],
            live2dFacialReleaseMs: null,
            live2dMotionFollowThroughMs: null,
            vrmActionFadeMs: null,
            vrmExpressionBlendMs: null,
          },
        },
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情和动作还没回到这一段里，但身体、口型和声音已经继续托住同一个 living segment。',
        authorityMismatchDisplay: '表情和动作还没回到这一段里，但身体、口型和声音已经继续托住同一个 living segment。',
        cueMicro: null,
        cueMicroSummary: null,
        driverExecution: null,
        driverExecutionSummary: null,
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      undefined,
    )

    expect(rows[0]?.speechSummaryEntries).toContainEqual({
      key: 'same-her-signature',
      label: '同一人签名',
      value: 'embodiment:body-lipsync-voice-rejoin',
    })
    expect(rows[0]?.speechSummaryEntries).toContainEqual({
      key: 'same-her-reasons',
      label: '同一人线索',
      value: 'embodiment:audible-same-her-line, embodiment:still-voiced-motion-line',
    })
  })

  it('keeps same-turn-if-invited measured-return trust visible in speech authority rows when playback cue authority stays on the callback line', () => {
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId: 'segment-invited-speech-authority',
          cueText: '我还在，只是轻一点接回来。',
          surfaces: ['vrm'],
          lanes: ['expression', 'motion', 'lipsync'],
          aligned: true,
          driftStatus: 'all-aligned',
          entries: [
            {
              surface: 'vrm',
              lane: 'expression',
              cueId: 'segment-invited-speech-authority',
              planned: 'recover-soft',
              consumed: 'recover-soft',
              source: 'prosody-authority',
              aligned: true,
            },
          ],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: null,
        speechEvidence: {
          voiceSummary: null,
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.22 | mouth=0.20 | head=0.18 | visemePeak=0.70 | provenance=authority-bound | source=prosody-authority | segment=segment-invited-speech-authority',
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
        authorityBinding: {
          segmentId: 'segment-invited-speech-authority',
          rendererTarget: 'vrm',
          matchedDrivers: ['face', 'motion', 'lipsync'],
          matchedSources: ['prosody-authority', 'timeline-projection'],
          faceSegmentMatched: true,
          motionSegmentMatched: true,
          lipsyncSegmentMatched: true,
        },
        playbackCue: {
          authorityView: {
            cueId: 'segment-invited-speech-authority',
            authoritySegmentId: 'segment-invited-speech-authority',
            authorityRendererTarget: 'vrm',
            authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
            authoritySources: ['prosody-authority', 'timeline-projection'],
            authorityTrustSummary: 'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。',
            prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.22 | mouth=0.20 | head=0.18 | visemePeak=0.70 | provenance=authority-bound | source=prosody-authority | segment=segment-invited-speech-authority',
            traceEmbodimentSummary: null,
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
            authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
            authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
            settleAuthoritySummary: 'authority-bound | segment=segment-invited-speech-authority | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
            summaryEntries: [],
            preferredExpressionAliases: ['RecoverSoft'],
            preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
            live2dFacialReleaseMs: null,
            live2dMotionFollowThroughMs: null,
            vrmActionFadeMs: 280,
            vrmExpressionBlendMs: 360,
          },
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
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      undefined,
    )

    expect(rows[0]?.authorityTrustSummary).toBe('VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。')
    expect(rows[0]?.speechSummaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority-trust',
      value: 'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。',
    }))
  })

  it('preserves upstream voice driver authority in speech rows when the same living segment is still voice-carried', () => {
    const cueId = 'segment-upstream-voice-driver-1'
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId,
          cueText: '声音还在把这句托在同一条 living segment 上。',
          surfaces: ['vrm'],
          lanes: ['lipsync', 'settle'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'settle',
              cueId,
              planned: 'settle',
              consumed: 'settle',
              source: null,
              aligned: false,
              settle: {
                vrmActionFadeMs: {
                  planned: 260,
                  consumed: 300,
                },
              },
            },
          ],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: {
          voice: `zh-CN | closure=0.78 | precision=0.81 | provenance=authority-bound | segment=${cueId} | source=prosody-authority`,
          topVisemes: null,
        },
        speechEvidence: {
          voiceSummary: `zh-CN | closure=0.78 | precision=0.81 | provenance=authority-bound | segment=${cueId} | source=prosody-authority`,
          bodyContinuitySummary: null,
          prosodyAuthoritySummary: `mode=energy-phoneme-hybrid | prosody=0.31 | mouth=0.29 | head=0.18 | visemePeak=0.70 | provenance=authority-bound | source=prosody-authority | segment=${cueId}`,
          authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: true,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: `body=measured-return seg=${cueId} | lipsync=energy-phoneme-hybrid phase=playing seg=${cueId}`,
          visemeHintsSummary: null,
        },
        authorityBinding: {
          segmentId: cueId,
          rendererTarget: 'vrm',
          matchedDrivers: ['body', 'lipsync'],
          matchedSources: ['prosody-authority'],
          bodySegmentMatched: true,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        authoritySummary: {
          cueId,
          segmentId: cueId,
          rendererTarget: 'vrm',
          matchedDrivers: ['body', 'lipsync', 'voice'],
          matchedSources: ['prosody-authority', 'voice-segment'],
          bindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync+voice-only',
          matchSummary: 'body:yes face:no motion:no lipsync:yes',
          authorityTrustSummary: null,
          authorityMismatchSummary: 'face-mismatch, motion-mismatch',
          authorityMismatchReasonSummary: '表情和动作还没回到这一段里，但身体、口型和声音已经继续托住同一个 living segment。',
          authorityMismatchDisplay: '表情和动作还没回到这一段里，但身体、口型和声音已经继续托住同一个 living segment。',
          prosodyAuthoritySummary: `mode=energy-phoneme-hybrid | prosody=0.31 | mouth=0.29 | head=0.18 | visemePeak=0.70 | provenance=authority-bound | source=prosody-authority | segment=${cueId}`,
          settleSummary: `authority-bound | segment=${cueId} | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | lane=body+lipsync+voice-only`,
        },
        playbackCue: {
          authorityView: null,
        },
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情和动作还没回到这一段里，但身体、口型和声音已经继续托住同一个 living segment。',
        authorityMismatchDisplay: '表情和动作还没回到这一段里，但身体、口型和声音已经继续托住同一个 living segment。',
        cueMicro: null,
        cueMicroSummary: null,
        driverExecution: null,
        driverExecutionSummary: `body=measured-return seg=${cueId} | lipsync=energy-phoneme-hybrid phase=playing seg=${cueId}`,
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      undefined,
    )

    expect(rows[0]?.authorityMatchedDrivers).toEqual(['body', 'lipsync', 'voice'])
    expect(rows[0]?.authorityMatchedSources).toEqual(['prosody-authority', 'voice-segment'])
    expect(rows[0]?.speechSummaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority',
      value: expect.stringContaining('身体、口型、声音'),
    }))
  })

  it('prefers same-cue speech evidence driver execution over stale top-level execution summaries in speech authority rows', () => {
    const cueId = 'segment-speech-authority-same-cue-execution-1'
    const rows = buildSpeechAuthoritySegmentRows(
      [
        {
          cueId,
          cueText: '身体、口型和声音已经回到同一条 living line。',
          surfaces: ['vrm'],
          lanes: ['settle'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            { lane: 'settle', settle: true },
          ],
        },
      ] as any,
      {
        articulation: null,
        articulationSummary: {
          voice: `zh-CN | closure=0.78 | precision=0.81 | provenance=authority-bound | segment=${cueId} | source=prosody-authority`,
          topVisemes: null,
        },
        speechEvidence: {
          voiceSummary: `zh-CN | closure=0.78 | precision=0.81 | provenance=authority-bound | segment=${cueId} | source=prosody-authority`,
          bodyContinuitySummary: null,
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
        authorityBinding: {
          segmentId: cueId,
          rendererTarget: 'vrm',
          matchedDrivers: ['body', 'lipsync'],
          matchedSources: ['prosody-authority', 'voice-segment'],
          bodySegmentMatched: true,
          faceSegmentMatched: false,
          motionSegmentMatched: false,
          lipsyncSegmentMatched: true,
        },
        authoritySummary: {
          cueId,
          segmentId: cueId,
          rendererTarget: 'vrm',
          matchedDrivers: ['body', 'lipsync', 'voice'],
          matchedSources: ['prosody-authority', 'voice-segment'],
          bindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync+voice-only',
          matchSummary: 'body:yes face:no motion:no lipsync:yes',
          authorityTrustSummary: null,
          authorityMismatchSummary: 'face-mismatch, motion-mismatch',
          authorityMismatchReasonSummary: '表情和动作还没回到这一段里，但身体、口型和声音已经继续托住同一个 living segment。',
          authorityMismatchDisplay: '表情和动作还没回到这一段里，但身体、口型和声音已经继续托住同一个 living segment。',
          prosodyAuthoritySummary: `mode=energy-phoneme-hybrid | prosody=0.31 | mouth=0.29 | head=0.18 | visemePeak=0.70 | provenance=authority-bound | source=prosody-authority | segment=${cueId}`,
          settleSummary: `authority-bound | segment=${cueId} | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | lane=body+lipsync+voice-only`,
        },
        playbackCue: {
          authorityView: null,
        },
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '表情和动作还没回到这一段里，但身体、口型和声音已经继续托住同一个 living segment。',
        authorityMismatchDisplay: '表情和动作还没回到这一段里，但身体、口型和声音已经继续托住同一个 living segment。',
        cueMicro: null,
        cueMicroSummary: null,
        driverExecution: null,
        driverExecutionSummary: `body=measured-return seg=${cueId} | lipsync=energy-phoneme-hybrid phase=playing`,
        visemeHints: [],
        visemeHintsSummary: null,
        rendererAlignmentSummary: {
          live2d: null,
          vrm: null,
        },
      } as any,
      {
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:speech-authority:same-cue-execution',
          activeThreadId: 'runtime-thread-speech-authority-same-cue-execution',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'speech-rejoin',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceDetails: [],
      } as any,
    )

    expect(rows[0]?.driverExecutionSummary).toBe(
      `body=measured-return seg=${cueId} | lipsync=energy-phoneme-hybrid phase=playing | voice=authority-bound phase=playing seg=${cueId}`,
    )
    expect(rows[0]?.speechEvidence?.driverExecutionSummary).toBe(
      `body=measured-return seg=${cueId} | lipsync=energy-phoneme-hybrid phase=playing | voice=authority-bound phase=playing seg=${cueId}`,
    )
    expect(rows[0]?.traceEmbodimentSummary).toContain('execution=body+lipsync+voice')
  })
})
