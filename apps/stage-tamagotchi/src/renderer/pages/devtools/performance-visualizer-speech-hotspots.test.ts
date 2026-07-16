import { describe, expect, it } from 'vitest'

import {
  buildSpeechAuthorityHotspots,
  filterSpeechAuthorityHotspots,
} from './performance-visualizer-speech-hotspots'

describe('performance visualizer speech hotspots', () => {
  it('aggregates authority and speech evidence into cue-level drift hotspots', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-zh-1',
          cueText: '继续看这里。',
          surfaces: ['live2d', 'vrm'],
          lanes: ['expression', 'face', 'action', 'lipsync', 'settle'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'live2d',
              lane: 'expression',
              cueId: 'segment-zh-1',
              planned: 'CalmInspect',
              consumed: 'RecoverSoft',
              source: null,
              aligned: false,
            },
            {
              surface: 'live2d',
              lane: 'lipsync',
              cueId: 'segment-zh-1',
              planned: 'I',
              consumed: 'A',
              source: 'prosody-authority',
              confidence: 0.91,
              aligned: false,
            },
            {
              surface: 'vrm',
              lane: 'action',
              cueId: 'segment-zh-1',
              planned: 'observe_focus',
              consumed: 'observe_focus',
              source: 'timeline-projection',
              aligned: true,
            },
            {
              surface: 'vrm',
              lane: 'settle',
              cueId: 'segment-zh-1',
              planned: 'settle',
              consumed: 'settle',
              source: null,
              settle: {
                vrmActionFadeMs: {
                  planned: 280,
                  consumed: 320,
                },
                vrmExpressionBlendMs: {
                  planned: 360,
                  consumed: 360,
                },
              },
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-zh-1',
          cueText: '继续看这里。',
          driftStatus: 'partial-drift',
          aligned: false,
          speechEvidence: {
            voiceSummary: '上游语音韵律',
            prosodyAuthoritySummary: '上游韵律权威',
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
          authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=seeded-face, seeded-motion, seeded-lipsync',
          authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
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
          traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=none | execution=none | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
          visemeHintsSummary: 'I:0.35@0.94 | closed:0.75@0.89',
          settleAuthoritySummary: 'authority-bound | segment=segment-zh-1 | target=vrm | drivers=face, motion, lipsync | sources=seeded-face, seeded-motion, seeded-lipsync',
        },
      ],
      {
        recentDrivingEvent: {
          kind: 'person-state-updated',
          decisionTraceId: 'mind:rest:1',
          summary: 'protective-watch settled after fatigue pressure rose',
          createdAt: 2_468,
        },
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
        recentDrivingTraceEvents: [
          {
            kind: 'governance-normalized',
            summary: 'turn=care | truth=live-grounded | repair=none',
            createdAt: 2_430,
          },
          {
            kind: 'person-state-updated',
            summary: 'protective-watch settled after fatigue pressure rose',
            createdAt: 2_468,
          },
        ],
        recentDrivingTraceDetails: [],
        driverSummary: {
          rendererTarget: 'vrm',
          face: {
            cue: 'focused',
            source: 'legacy-face-source',
            confidence: 0.94,
            segmentId: 'segment-zh-1',
          },
          motion: {
            cue: 'observe_focus',
            source: 'legacy-motion-source',
            confidence: 0.88,
            segmentId: 'segment-zh-1',
          },
          lipsync: {
            cue: 'I',
            source: 'legacy-lipsync-source',
            confidence: 0.91,
            segmentId: 'segment-zh-1',
            mode: 'energy-phoneme-hybrid',
          },
        },
        playbackTelemetry: {
          actualDurationMs: 220,
          plannedDurationMs: 220,
          driftMs: 0,
          settleMs: 220,
          stopReason: null,
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-zh-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['seeded-face', 'seeded-motion', 'seeded-lipsync'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
          cue: null,
          drivers: null,
        },
      },
    )

    expect(hotspots).toEqual([
      {
        cueId: 'segment-zh-1',
        cueText: '继续看这里。',
        driftStatus: 'partial-drift',
        aligned: false,
        severityScore: 10,
        hasSpeechDrift: true,
        surfaces: 'live2d, vrm',
        lanes: 'expression, face, action, lipsync, settle',
        authorityDriftLanes: ['expression', 'lipsync', 'settle'],
        evidenceKinds: ['prosody', 'viseme', 'micro-expression', 'settle'],
        speechEvidence: {
          voiceSummary: '上游语音韵律',
          prosodyAuthoritySummary: '上游韵律权威',
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
        authorityTrustSummary: 'VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
        speechSummaryEntries: [
          { key: 'authority-match', label: '绑定命中', value: '表情命中 / 动作命中 / 口型命中', technicalValue: 'face:yes motion:yes lipsync:yes' },
          { key: 'authority-trust', label: '权威可信性', value: 'VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。' },
          { key: 'voice', label: '语音韵律', value: '上游语音韵律' },
          { key: 'prosody-authority', label: '韵律权威', value: '上游韵律权威' },
          { key: 'visemes', label: '主口型', value: '上游主口型' },
          { key: 'cue', label: '微表情线索', value: '上游微表情线索' },
          { key: 'persona-style', label: '人设风格', value: '上游人设风格' },
          { key: 'timing', label: '时序节奏', value: '上游时序节奏' },
          { key: 'driver-execution', label: '驱动执行', value: '上游驱动执行' },
          { key: 'trace-embodiment', label: '轨迹落点', value: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 表情、动作、口型，实际执行 表情+动作+口型，场景 深夜疲劳照看，姿态 先观察后表达，来源链 fatigue -> care -> grounded-recall', technicalValue: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=face, motion, lipsync | execution=face+motion+lipsync | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall' },
          { key: 'viseme-hints', label: '口型提示', value: '上游口型提示' },
          { key: 'settle-authority', label: '稳定段归因', value: 'authority-bound，片段 segment-zh-1，目标 VRM，驱动 表情、动作、口型，来源 seeded-face, seeded-motion, seeded-lipsync', technicalValue: 'authority-bound | segment=segment-zh-1 | target=vrm | drivers=face, motion, lipsync | sources=seeded-face, seeded-motion, seeded-lipsync' },
        ],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=face, motion, lipsync | execution=face+motion+lipsync | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        authorityMismatchSummary: null,
        authorityMismatchReasonSummary: null,
        authorityMismatchDisplay: null,
        rendererDriftSummary: null,
        settleAuthoritySummary: 'authority-bound | segment=segment-zh-1 | target=vrm | drivers=face, motion, lipsync | sources=seeded-face, seeded-motion, seeded-lipsync',
        settleDriftSummary: [
          'vrmActionFadeMs: 280 -> 320',
          'vrmExpressionBlendMs: 360 -> 360',
        ],
        traceSummary: {
          cueId: 'segment-zh-1',
          decisionTraceId: 'mind:rest:1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          activeThreadId: 'runtime-thread-rest-1',
          suppressionTags: ['late-night-fatigue'],
          latestEventSummary: 'protective-watch settled after fatigue pressure rose',
          segmentBinding: expect.objectContaining({
            matched: true,
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            matchedSources: ['seeded-face', 'seeded-motion', 'seeded-lipsync'],
          }),
        },
        traceSummaryEntries: [
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
          { key: 'latest-event', label: '最近事件', value: 'protective-watch settled after fatigue pressure rose' },
        ],
      },
    ])
  })

  it('keeps a thin measured-return identity-continuity', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-thin-measured-return-hotspot-1',
          cueText: '先沿着这条 callback 线轻一点跟回去。',
          surfaces: ['vrm'],
          lanes: ['lipsync'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'lipsync',
              cueId: 'segment-thin-measured-return-hotspot-1',
              planned: 'I',
              consumed: 'A',
              source: 'prosody-authority',
              confidence: 0.91,
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-thin-measured-return-hotspot-1',
          cueText: '先沿着这条 callback 线轻一点跟回去。',
          driftStatus: 'partial-drift',
          aligned: false,
          speechEvidence: null,
          authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes | lane=lipsync-only',
          authorityMatchSummary: 'face:no motion:no lipsync:yes',
          authorityMatchedDrivers: ['lipsync'],
          authorityMatchedSources: ['prosody-authority'],
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
          traceEmbodimentSummary: null,
          visemeHintsSummary: 'n/a',
          settleAuthoritySummary: 'authority-bound | segment=segment-thin-measured-return-hotspot-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync-only',
        },
      ] as any,
    )

    expect(hotspots[0]?.speechSummaryEntries).toEqual(expect.arrayContaining([
      {
        key: 'authority-match',
        label: '绑定命中',
        value: '表情未命中 / 动作未命中 / 口型命中',
        technicalValue: 'face:no motion:no lipsync:yes',
      },
      {
        key: 'authority-trust',
        label: '权威可信性',
        value: '当前渲染体 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。',
      },
      {
        key: 'authority-mismatch',
        label: '权威漂移',
        value: 'Only runtime digest plus spine still expose the noisy-detour continuity line, so higher-level continuity should keep this thinner measured-return identity-continuity',
      },
      {
        key: 'settle-authority',
        label: '稳定段归因',
        value: 'authority-bound，片段 segment-thin-measured-return-hotspot-1，目标 VRM，驱动 口型，来源 prosody-authority，噪声 detour 后，这条 measured-return 连续身体线仍由较薄证据维持',
        technicalValue: 'authority-bound | segment=segment-thin-measured-return-hotspot-1 | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync-only',
      },
    ]))
  })

  it('surfaces body-led same-her authority in speech hotspots when body still carries the living segment before face and motion return', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-body-led-hotspot-1',
          cueText: '身体线先稳住，别急着把表情拉回来。',
          surfaces: ['vrm'],
          lanes: ['settle'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'settle',
              cueId: 'segment-body-led-hotspot-1',
              planned: 'settle',
              consumed: 'settle',
              source: null,
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-body-led-hotspot-1',
          cueText: '身体线先稳住，别急着把表情拉回来。',
          driftStatus: 'partial-drift',
          aligned: false,
          speechEvidence: null,
          authorityBindingSummary: 'target=vrm | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no | lane=body-only',
          authorityMatchSummary: 'body:yes face:no motion:no lipsync:no',
          authorityMatchedDrivers: ['body'],
          authorityMatchedSources: ['prosody-authority'],
          authorityMismatchSummary: 'face-mismatch, motion-mismatch, lipsync-mismatch',
          authorityMismatchReasonSummary: '身体已经先把同一段 living segment 托住，外层观察不该把这段 partial recovery 压扁成普通 settle 漂移。',
          authorityMismatchDisplay: '身体已经先把同一段 living segment 托住，外层观察不该把这段 partial recovery 压扁成普通 settle 漂移。',
          voiceSummary: 'zh-CN | closure=0.79 | precision=0.86 | companion=measured-return',
          topVisemeSummary: 'n/a',
          cueSummary: 'n/a',
          cueIdentityPresent: false,
          cueProsodyPresent: false,
          faceCue: 'n/a',
          actionCue: 'n/a',
          weightSummary: 'n/a',
          personaStyleSummary: 'n/a',
          timingSummary: 'n/a',
          driverExecutionSummary: 'body=measured-return still=0.88 gazeStable=0.80 breath=0.22 express=0.24 segment=segment-body-led-hotspot-1',
          traceEmbodimentSummary: null,
          visemeHintsSummary: 'n/a',
          settleAuthoritySummary: 'authority-bound | segment=segment-body-led-hotspot-1 | target=vrm | drivers=body | sources=prosody-authority',
        },
      ] as any,
      {
        recentDrivingEvent: null,
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:body-led:1',
          activeThreadId: 'runtime-thread-body-led-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        traceSummary: {
          decisionTraceId: 'mind:body-led:1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          activeThreadId: 'runtime-thread-body-led-1',
          suppressionTags: [],
          latestEventSummary: null,
          segmentBinding: {
            matched: true,
            rendererTarget: 'vrm',
            matchedDrivers: ['body'],
            matchedSources: ['prosody-authority'],
          },
        },
        driverSummary: {
          rendererTarget: 'vrm',
          body: {
            frameMode: 'measured-return',
            stillness: 0.88,
            gazeStability: 0.80,
            breathAmplitude: 0.22,
            expressivity: 0.24,
            segmentId: 'segment-body-led-hotspot-1',
          },
          face: null,
          motion: null,
          lipsync: null,
          voice: 'zh-CN | closure=0.79 | precision=0.86 | companion=measured-return',
        },
        playbackTelemetry: {
          actualDurationMs: 220,
          plannedDurationMs: 220,
          driftMs: 0,
          settleMs: 220,
          stopReason: null,
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-body-led-hotspot-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['body'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
          },
          cue: null,
          drivers: null,
        },
      } as any,
    )

    expect(hotspots[0]?.authorityTrustSummary).toBe('VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。')
    expect(hotspots[0]?.speechSummaryEntries).toContainEqual({
      key: 'authority-trust',
      label: '权威可信性',
      value: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
    })
  })

  it('preserves body-carried identity-continuity', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-body-speech-hotspot-1',
          cueText: '身体线已经把她托回当前语音片段里。',
          surfaces: ['vrm'],
          lanes: ['lipsync', 'settle'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'lipsync',
              cueId: 'segment-body-speech-hotspot-1',
              planned: 'closed',
              consumed: 'A',
              source: 'prosody-authority',
              confidence: 0.89,
              aligned: false,
            },
            {
              surface: 'vrm',
              lane: 'settle',
              cueId: 'segment-body-speech-hotspot-1',
              planned: 'settle',
              consumed: 'settle',
              source: null,
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-body-speech-hotspot-1',
          cueText: '身体线已经把她托回当前语音片段里。',
          driftStatus: 'partial-drift',
          aligned: false,
          authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
          authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
          authorityMatchedDrivers: ['body', 'lipsync'],
          authorityMatchedSources: ['prosody-authority', 'voice-segment'],
          authorityMismatchSummary: 'face-mismatch, motion-mismatch',
          authorityMismatchReasonSummary: '表情和动作还没回到这一段里，但身体线已经继续托住同一个 living segment。',
          speechEvidence: {
            voiceSummary: null,
            authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
            topVisemeSummary: null,
            cueSummary: null,
            cueIdentityPresent: false,
            cueProsodyPresent: false,
            personaStyleSummary: null,
            timingSummary: null,
            driverExecutionSummary: 'lipsync=energy-phoneme-hybrid phase=playing',
            visemeHintsSummary: null,
          },
          settleAuthoritySummary: null,
        },
      ] as any,
      {
        recentDrivingEvent: null,
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:body-speech-hotspot:1',
          activeThreadId: 'runtime-thread-body-speech-hotspot-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'speech-rejoin',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        driverSummary: {
          rendererTarget: 'vrm',
          body: {
            frameMode: 'care',
            segmentId: 'segment-body-speech-hotspot-1',
            reasonSummary: '身体线先把语音片段接回来。',
          },
        },
        playbackTelemetry: {
          actualDurationMs: 210,
          plannedDurationMs: 210,
          driftMs: 0,
          settleMs: 210,
          stopReason: null,
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-body-speech-hotspot-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: false,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          cue: null,
          drivers: null,
        },
      } as any,
    )

    expect(hotspots[0]?.authorityTrustSummary).toBe('VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。')
    expect(hotspots[0]?.speechSummaryEntries).toEqual(expect.arrayContaining([
      {
        key: 'authority-match',
        label: '绑定命中',
        value: '身体命中 / 表情未命中 / 动作未命中 / 口型命中',
        technicalValue: 'body:yes face:no motion:no lipsync:yes',
      },
      {
        key: 'authority-trust',
        label: '权威可信性',
        value: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
      },
    ]))
  })

  it('keeps richer voice-segment source evidence in hotspots when trace segment binding still lags behind the speech authority summary', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-body-voice-hotspot-1',
          cueText: '声音和身体线还在一起托住这一段。',
          surfaces: ['vrm'],
          lanes: ['lipsync', 'settle'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'lipsync',
              cueId: 'segment-body-voice-hotspot-1',
              planned: 'closed',
              consumed: 'A',
              source: 'prosody-authority',
              confidence: 0.89,
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-body-voice-hotspot-1',
          cueText: '声音和身体线还在一起托住这一段。',
          driftStatus: 'partial-drift',
          aligned: false,
          authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
          authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
          authorityMatchedDrivers: ['body', 'lipsync'],
          authorityMatchedSources: ['prosody-authority', 'voice-segment'],
          sameHerSignature: 'embodiment:body-lipsync-voice-rejoin',
          sameHerReasonTags: [
            'embodiment:audible-same-her-line',
            'embodiment:still-voiced-motion-line',
          ],
          authorityMismatchSummary: 'face-mismatch, motion-mismatch',
          authorityMismatchReasonSummary: '表情和动作还没回到这一段里，但身体线和声音还在继续托住同一个 living segment。',
          speechEvidence: {
            voiceSummary: null,
            authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
            topVisemeSummary: null,
            cueSummary: null,
            cueIdentityPresent: false,
            cueProsodyPresent: false,
            personaStyleSummary: null,
            timingSummary: null,
            driverExecutionSummary: 'lipsync=energy-phoneme-hybrid phase=playing',
            visemeHintsSummary: null,
          },
          settleAuthoritySummary: null,
        },
      ] as any,
      {
        recentDrivingEvent: null,
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:body-voice-hotspot:1',
          activeThreadId: 'runtime-thread-body-voice-hotspot-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'speech-rejoin',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        driverSummary: {
          rendererTarget: 'vrm',
          body: {
            frameMode: 'care',
            segmentId: 'segment-body-voice-hotspot-1',
            reasonSummary: '身体线先把语音片段接回来。',
          },
        },
        playbackTelemetry: {
          actualDurationMs: 210,
          plannedDurationMs: 210,
          driftMs: 0,
          settleMs: 210,
          stopReason: null,
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-body-voice-hotspot-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: false,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          cue: null,
          drivers: null,
        },
      } as any,
    )

    expect(hotspots[0]?.traceSummary?.segmentBinding).toEqual({
      matched: true,
      rendererTarget: 'vrm',
      matchedDrivers: ['body', 'lipsync'],
      matchedSources: ['prosody-authority', 'voice-segment'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
    })
    expect(hotspots[0]?.authorityMismatchReasonSummary).toBe('表情和动作还没回到这一段里，但身体线和声音还在继续托住同一个 living segment。')
    expect(hotspots[0]?.speechSummaryEntries).toEqual(expect.arrayContaining([
      {
        key: 'same-her-signature',
        label: '同一人签名',
        value: 'embodiment:body-lipsync-voice-rejoin',
      },
      {
        key: 'same-her-reasons',
        label: '同一人线索',
        value: 'embodiment:audible-same-her-line, embodiment:still-voiced-motion-line',
      },
      {
        key: 'authority-trust',
        label: '权威可信性',
        value: 'VRM 这段 authority 现在主要由身体线继续托住，同一段 living segment 还在，只是表情、动作、口型暂时没有一起跟上。',
      },
      {
        key: 'trace-embodiment',
        label: '轨迹落点',
        value: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 speech-rejoin，权威驱动 身体、口型，实际执行 口型',
        technicalValue: 'turn=care | closure=grounded-recall | surface=speech-rejoin | authority=body, lipsync | execution=lipsync',
      },
    ]))
  })

  it('surfaces renderer drift summary when speech row carries resident-to-renderer cause text', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-renderer-drift-1',
          cueText: '这里是显形漂移热点。',
          surfaces: ['live2d'],
          lanes: ['expression', 'face'],
          aligned: false,
          driftStatus: 'hard-drift',
          entries: [
            {
              surface: 'live2d',
              lane: 'expression',
              cueId: 'segment-renderer-drift-1',
              planned: 'Soft Gaze',
              consumed: 'Focus Inspect',
              source: null,
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-renderer-drift-1',
          cueText: '这里是显形漂移热点。',
          driftStatus: 'hard-drift',
          aligned: false,
          authorityBindingSummary: 'target=live2d | drivers=face | sources=prosody-authority | matches=face:yes motion:no lipsync:no',
          authorityMatchSummary: 'face:yes motion:no lipsync:no',
          voiceSummary: null,
          topVisemeSummary: null,
          cueSummary: 'focused / observe_focus | prosody=0.42 mouth=0.18 head=0.24',
          cueIdentityPresent: true,
          cueProsodyPresent: true,
          faceCue: 'focused',
          actionCue: 'observe_focus',
          weightSummary: 'prosody=0.42 mouth=0.18 head=0.24',
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: 'face=thinking/focused@0.52 hold=320 pre=steady-inhale post=soft-release src=prosody-authority conf=0.94',
          traceEmbodimentSummary: null,
          visemeHintsSummary: null,
          settleAuthoritySummary: null,
          rendererDriftSummary: 'resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority',
        },
      ] as any,
      {
        recentDrivingEvent: null,
        recentDrivingTraceRecord: null,
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [
          {
            kind: 'governance-normalized',
            summary: 'turn=care | truth=live-grounded | repair=none',
            createdAt: 2_430,
            details: [
              { label: 'scenario', value: 'late-night-fatigue' },
              { label: 'stance', value: 'observe-first' },
              { label: 'sourceTrail', value: 'fatigue, care, grounded-recall' },
            ],
          },
        ],
        driverSummary: null,
        playbackTelemetry: null,
      },
    )

    expect(hotspots[0]?.rendererDriftSummary).toBe('resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority')
  })

  it('keeps repair-before-closeness trust visible in outer speech hotspots when companionship hints survive on the speech row', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-repair-hotspot-1',
          cueText: '先别把这条修补线说成已经回暖。',
          surfaces: ['vrm'],
          lanes: ['expression', 'lipsync'],
          aligned: true,
          driftStatus: 'all-aligned',
          entries: [
            {
              surface: 'vrm',
              lane: 'expression',
              cueId: 'segment-repair-hotspot-1',
              planned: 'recover-soft',
              consumed: 'recover-soft',
              source: 'prosody-authority',
              aligned: true,
            },
            {
              surface: 'vrm',
              lane: 'lipsync',
              cueId: 'segment-repair-hotspot-1',
              planned: 'I',
              consumed: 'I',
              source: 'prosody-authority',
              confidence: 0.94,
              aligned: true,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-repair-hotspot-1',
          cueText: '先别把这条修补线说成已经回暖。',
          driftStatus: 'all-aligned',
          aligned: true,
          speechEvidence: null,
          authorityRendererTarget: 'vrm',
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
          authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
          authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
          authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
          authorityMatchedSources: ['prosody-authority', 'timeline-projection'],
          authorityTrustSummary: null,
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          voiceSummary: 'n/a',
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.24 | mouth=0.20 | head=0.18 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-repair-hotspot-1',
          topVisemeSummary: 'n/a',
          cueSummary: 'n/a',
          cueIdentityPresent: false,
          cueProsodyPresent: false,
          faceCue: 'recover-soft',
          actionCue: 'stillness_guard',
          weightSummary: 'n/a',
          personaStyleSummary: 'n/a',
          timingSummary: 'n/a',
          driverExecutionSummary: 'n/a',
          traceEmbodimentSummary: null,
          visemeHintsSummary: 'n/a',
          settleAuthoritySummary: 'authority-bound | segment=segment-repair-hotspot-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
          rendererDriftSummary: null,
        },
      ] as any,
      undefined,
    )

    expect(hotspots[0]?.authorityTrustSummary).toBe('VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。')
    expect(hotspots[0]?.speechSummaryEntries).toContainEqual({
      key: 'authority-trust',
      label: '权威可信性',
      value: 'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。',
    })
  })

  it('keeps same-turn-if-invited measured-return trust visible in outer speech hotspots when playback cue guidance stays on the callback line', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-invited-hotspot-1',
          cueText: '我还在，只是中性可见占位。',
          surfaces: ['vrm'],
          lanes: ['expression', 'motion', 'lipsync'],
          aligned: true,
          driftStatus: 'all-aligned',
          entries: [
            {
              surface: 'vrm',
              lane: 'expression',
              cueId: 'segment-invited-hotspot-1',
              planned: 'recover-soft',
              consumed: 'recover-soft',
              source: 'prosody-authority',
              aligned: true,
            },
            {
              surface: 'vrm',
              lane: 'motion',
              cueId: 'segment-invited-hotspot-1',
              planned: 'stillness_guard',
              consumed: 'stillness_guard',
              source: 'timeline-projection',
              aligned: true,
            },
            {
              surface: 'vrm',
              lane: 'lipsync',
              cueId: 'segment-invited-hotspot-1',
              planned: 'I',
              consumed: 'I',
              source: 'prosody-authority',
              confidence: 0.91,
              aligned: true,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-invited-hotspot-1',
          cueText: '我还在，只是中性可见占位。',
          driftStatus: 'all-aligned',
          aligned: true,
          authorityRendererTarget: 'vrm',
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
          authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
          authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
          authorityMatchedSources: ['prosody-authority', 'timeline-projection'],
          authorityTrustSummary: 'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          voiceSummary: 'n/a',
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.22 | mouth=0.20 | head=0.18 | visemePeak=0.70 | provenance=authority-bound | source=prosody-authority | segment=segment-invited-hotspot-1',
          topVisemeSummary: 'n/a',
          cueSummary: 'n/a',
          cueIdentityPresent: false,
          cueProsodyPresent: false,
          faceCue: 'recover-soft',
          actionCue: 'stillness_guard',
          weightSummary: 'n/a',
          personaStyleSummary: 'n/a',
          timingSummary: 'n/a',
          driverExecutionSummary: 'n/a',
          traceEmbodimentSummary: null,
          visemeHintsSummary: 'n/a',
          settleAuthoritySummary: 'authority-bound | segment=segment-invited-hotspot-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
          rendererDriftSummary: null,
        },
      ] as any,
      undefined,
    )

    expect(hotspots[0]?.authorityTrustSummary).toBe('VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。')
    expect(hotspots[0]?.speechSummaryEntries).toContainEqual({
      key: 'authority-trust',
      label: '权威可信性',
      value: 'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。',
    })
  })

  it('prefers speech-row authority summaries over trace-derived hotspot recomputation when available', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-summary-owned',
          cueText: '这里优先用上游 authority summary。',
          surfaces: ['vrm'],
          lanes: ['settle', 'lipsync'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'settle',
              cueId: 'segment-summary-owned',
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
      [
        {
          cueId: 'segment-summary-owned',
          cueText: '这里优先用上游 authority summary。',
          driftStatus: 'partial-drift',
          aligned: false,
          authorityBindingSummary: '上游 authority 绑定',
          authorityMatchSummary: '上游 authority 命中',
          authorityMismatchSummary: 'face-mismatch, motion-mismatch',
          authorityMismatchReasonSummary: '上游 authority 漂移说明',
          voiceSummary: '上游语音摘要',
          topVisemeSummary: '上游主口型',
          cueSummary: '上游微表情线索',
          cueIdentityPresent: true,
          cueProsodyPresent: true,
          faceCue: 'focused',
          actionCue: 'observe_focus',
          weightSummary: null,
          personaStyleSummary: '上游人设风格',
          timingSummary: '上游时序节奏',
          driverExecutionSummary: 'motion=上游驱动执行',
          traceEmbodimentSummary: '上游轨迹落点',
          visemeHintsSummary: '上游口型提示',
          settleAuthoritySummary: '上游 authority settle',
          rendererDriftSummary: null,
        },
      ] as any,
      {
        recentDrivingEvent: null,
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:summary:1',
          activeThreadId: 'runtime-thread-summary-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [
          {
            kind: 'governance-normalized',
            summary: 'turn=care | truth=live-grounded | repair=none',
            createdAt: 2_430,
            details: [
              { label: 'scenario', value: 'late-night-fatigue' },
              { label: 'stance', value: 'observe-first' },
              { label: 'sourceTrail', value: 'fatigue, care, grounded-recall' },
            ],
          },
        ],
        driverSummary: {
          rendererTarget: 'vrm',
          face: null,
          motion: {
            cue: 'observe_focus',
            source: 'legacy-motion-source',
            confidence: 0.88,
            segmentId: 'segment-summary-owned',
          },
          lipsync: null,
        },
        playbackTelemetry: {
          actualDurationMs: 220,
          plannedDurationMs: 220,
          driftMs: 0,
          settleMs: 220,
          stopReason: null,
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-summary-owned',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          cue: null,
          drivers: null,
        },
      },
    )

    expect(hotspots).toEqual([
      expect.objectContaining({
        cueId: 'segment-summary-owned',
        authorityTrustSummary: 'VRM 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。',
        speechSummaryEntries: expect.arrayContaining([
          { key: 'authority-match', label: '绑定命中', value: '上游 authority 命中 | 表情未命中 / 动作未命中 / 口型命中' },
          { key: 'authority-trust', label: '权威可信性', value: 'VRM 这段 authority 当前能确认的是口型还在继续托住这一段，同一段 living segment 还在，声音这一侧还没有拿到同段证据，表情和动作也暂时没有一起跟上。' },
          { key: 'authority-mismatch', label: '权威漂移', value: '上游 authority 漂移说明' },
          { key: 'voice', label: '语音韵律', value: '上游语音摘要' },
          { key: 'visemes', label: '主口型', value: '上游主口型' },
          { key: 'cue', label: '微表情线索', value: '上游微表情线索' },
          { key: 'persona-style', label: '人设风格', value: '上游人设风格' },
          { key: 'timing', label: '时序节奏', value: '上游时序节奏' },
          { key: 'driver-execution', label: '驱动执行', value: '动作 上游驱动执行', technicalValue: 'motion=上游驱动执行' },
          { key: 'trace-embodiment', label: '轨迹落点', value: '上游轨迹落点' },
          { key: 'viseme-hints', label: '口型提示', value: '上游口型提示' },
          { key: 'settle-authority', label: '稳定段归因', value: '上游 authority settle' },
        ]),
        traceEmbodimentSummary: '上游轨迹落点',
        authorityMatchSummary: '上游 authority 命中',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '上游 authority 漂移说明',
        authorityMismatchDisplay: '上游 authority 漂移说明',
        settleAuthoritySummary: '上游 authority settle',
      }),
    ])
  })

  it('keeps voice continuity visible in hotspot authority match summaries when descriptive upstream authority still points at the same living segment', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-hotspot-voice-gap-1',
          cueText: '继续看这里。',
          surfaces: ['vrm'],
          lanes: ['lipsync'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'lipsync',
              cueId: 'segment-hotspot-voice-gap-1',
              planned: 'I',
              consumed: 'A',
              source: 'prosody-authority',
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-hotspot-voice-gap-1',
          cueText: '继续看这里。',
          driftStatus: 'partial-drift',
          aligned: false,
          authorityBindingSummary: '上游 authority 绑定',
          authorityMatchSummary: '上游 authority 命中',
          authorityMismatchSummary: 'face-mismatch, motion-mismatch',
          authorityMismatchReasonSummary: '上游 authority 漂移说明',
          voiceSummary: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-hotspot-voice-gap-1 | source=prosody-authority',
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
        },
      ] as any,
      {
        recentDrivingEvent: null,
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:hotspot-gap:1',
          activeThreadId: 'runtime-thread-hotspot-gap-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        driverSummary: {
          rendererTarget: 'vrm',
          face: null,
          motion: null,
          lipsync: {
            cue: 'observe_focus',
            source: 'prosody-authority',
            confidence: 0.88,
            segmentId: 'segment-hotspot-voice-gap-1',
          },
        },
        playbackTelemetry: {
          actualDurationMs: 220,
          plannedDurationMs: 220,
          driftMs: 0,
          settleMs: 220,
          stopReason: null,
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-hotspot-voice-gap-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          cue: null,
          drivers: null,
        },
      } as any,
    )

    expect(hotspots[0]?.speechSummaryEntries).toEqual(expect.arrayContaining([
      {
        key: 'authority-match',
        label: '绑定命中',
        value: '上游 authority 命中 | 表情未命中 / 动作未命中 / 口型命中 / 声音命中',
      },
      {
        key: 'voice',
        label: '语音韵律',
        value: '中文韵律，收口 0.84，咬字 0.90，权威绑定，片段 segment-hotspot-voice-gap-1，来源 韵律权威',
        technicalValue: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-hotspot-voice-gap-1 | source=prosody-authority',
      },
    ]))
  })

  it('treats explicit voice drift as speech drift in hotspot triage', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-hotspot-voice-drift-1',
          cueText: '声音还没回到这一段里。',
          surfaces: ['vrm'],
          lanes: ['voice'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'voice',
              cueId: 'segment-hotspot-voice-drift-1',
              planned: 'steady-line',
              consumed: 'stale-line',
              source: 'voice-segment',
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-hotspot-voice-drift-1',
          cueText: '声音还没回到这一段里。',
          driftStatus: 'partial-drift',
          aligned: false,
          authorityBindingSummary: 'target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, voice-segment | matches=face:yes motion:yes lipsync:yes voice:no',
          authorityMatchSummary: 'face:yes motion:yes lipsync:yes voice:no',
          voiceSummary: 'zh-CN | closure=0.84 | precision=0.90 | provenance=authority-bound | segment=segment-stale-voice-line | source=voice-segment',
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: true,
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
      ] as any,
      {
        recentDrivingEvent: null,
        recentDrivingTraceRecord: null,
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        driverSummary: null,
        playbackTelemetry: null,
      },
    )

    expect(hotspots[0]?.authorityDriftLanes).toEqual(['voice'])
    expect(hotspots[0]?.hasSpeechDrift).toBe(true)
  })

  it('prefers speech-row authority mismatch display over speech-row reason text in hotspot summary entries', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-display-first',
          cueText: '这里优先用上游 authority display。',
          surfaces: ['vrm'],
          lanes: ['action', 'lipsync'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'lipsync',
              cueId: 'segment-display-first',
              planned: 'I',
              consumed: 'A',
              source: 'prosody-authority',
              confidence: 0.91,
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-display-first',
          cueText: '这里优先用上游 authority display。',
          driftStatus: 'partial-drift',
          aligned: false,
          authorityBindingSummary: '上游 authority 绑定',
          authorityMatchSummary: '上游 authority 命中',
          authorityMismatchSummary: 'lipsync-mismatch',
          authorityMismatchReasonSummary: '上游 authority reason',
          authorityMismatchDisplay: '上游 authority display',
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
          rendererDriftSummary: null,
        },
      ] as any,
      {
        recentDrivingEvent: null,
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:display:1',
          activeThreadId: 'runtime-thread-display-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [
          {
            kind: 'governance-normalized',
            summary: 'turn=care | truth=live-grounded | repair=none',
            createdAt: 2_430,
            details: [
              { label: 'scenario', value: 'late-night-fatigue' },
              { label: 'stance', value: 'observe-first' },
              { label: 'sourceTrail', value: 'fatigue, care, grounded-recall' },
            ],
          },
        ],
        driverSummary: null,
        playbackTelemetry: {
          actualDurationMs: 220,
          plannedDurationMs: 220,
          driftMs: 0,
          settleMs: 220,
          stopReason: null,
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-display-first',
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: false,
          },
          cue: null,
          drivers: null,
        },
      },
    )

    expect(hotspots[0]?.speechSummaryEntries?.find(entry => entry.key === 'authority-mismatch')).toEqual({
      key: 'authority-mismatch',
      label: '权威漂移',
      value: '上游 authority display',
    })
    expect(hotspots[0]?.authorityMismatchDisplay).toBe('上游 authority display')
  })

  it('labels settle drift as fallback-derived when no stable authority binding matched the cue', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-fallback-1',
          cueText: '这里只有 settle 回退推断。',
          surfaces: ['vrm'],
          lanes: ['settle'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'settle',
              cueId: 'segment-fallback-1',
              planned: 'settle',
              consumed: 'settle',
              source: null,
              settle: {
                vrmActionFadeMs: {
                  planned: 280,
                  consumed: 340,
                },
              },
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-fallback-1',
          cueText: '这里只有 settle 回退推断。',
          driftStatus: 'partial-drift',
          aligned: false,
          authorityBindingSummary: null,
          authorityMatchSummary: null,
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
          traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=none | execution=none',
          visemeHintsSummary: null,
          settleAuthoritySummary: 'fallback-derived | segment=segment-fallback-1',
        },
      ],
      {
        recentDrivingEvent: null,
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
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [
          {
            kind: 'governance-normalized',
            summary: 'turn=care | truth=live-grounded | repair=none',
            createdAt: 2_430,
            details: [
              { label: 'scenario', value: 'late-night-fatigue' },
              { label: 'stance', value: 'observe-first' },
              { label: 'sourceTrail', value: 'fatigue, care, grounded-recall' },
            ],
          },
        ],
        driverSummary: {
          rendererTarget: 'vrm',
          face: null,
          motion: {
            cue: 'observe_focus',
            source: 'legacy-motion-source',
            confidence: 0.88,
            segmentId: 'segment-fallback-1',
          },
          lipsync: null,
        },
        playbackTelemetry: {
          actualDurationMs: 220,
          plannedDurationMs: 220,
          driftMs: 0,
          settleMs: 220,
          stopReason: null,
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-other',
            rendererTarget: 'vrm',
            matchedDrivers: ['face'],
            sources: ['seeded-face'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
          },
          cue: null,
          drivers: null,
        },
      },
    )

    expect(hotspots).toEqual([
      expect.objectContaining({
        cueId: 'segment-fallback-1',
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=none | execution=none | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
        authorityMatchSummary: null,
        settleAuthoritySummary: 'fallback-derived | target=vrm | drivers=motion | sources=legacy-motion-source',
        settleDriftSummary: [
          'vrmActionFadeMs: 280 -> 340',
        ],
        traceSummary: expect.objectContaining({
          segmentBinding: expect.objectContaining({
            matched: false,
            rendererTarget: 'vrm',
            matchedDrivers: [],
            matchedSources: [],
          }),
        }),
      }),
    ])
  })

  it('deduplicates authority-bound settle sources when multiple matched driver lanes share the same provenance', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-fallback-dedupe-1',
          cueText: '这里只看 fallback source 去重。',
          surfaces: ['vrm'],
          lanes: ['settle'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'settle',
              cueId: 'segment-fallback-dedupe-1',
              planned: 'settle',
              consumed: 'settle',
              source: null,
              settle: {
                vrmActionFadeMs: {
                  planned: 280,
                  consumed: 340,
                },
              },
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-fallback-dedupe-1',
          cueText: '这里只看 fallback source 去重。',
          driftStatus: 'partial-drift',
          aligned: false,
          authorityBindingSummary: null,
          authorityMatchSummary: null,
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
      ],
      {
        recentDrivingEvent: null,
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:fallback-dedupe:1',
          activeThreadId: 'runtime-thread-fallback-dedupe-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        driverSummary: {
          rendererTarget: 'vrm',
          face: {
            cue: 'focused',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: 'segment-fallback-dedupe-1',
          },
          motion: {
            cue: 'observe_focus',
            source: 'prosody-authority',
            confidence: 0.88,
            segmentId: 'segment-fallback-dedupe-1',
          },
          lipsync: null,
        },
        playbackTelemetry: {
          actualDurationMs: 220,
          plannedDurationMs: 220,
          driftMs: 0,
          settleMs: 220,
          stopReason: null,
          rendererTarget: 'vrm',
          driverAuthority: null,
          cue: null,
          drivers: null,
        },
      },
    )

    expect(hotspots[0]?.settleAuthoritySummary).toBe('authority-bound | segment=segment-fallback-dedupe-1 | target=vrm | drivers=face, motion | sources=prosody-authority')
  })

  it('surfaces authority mismatch summary when the bound segment drifts on a specific driver lane', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-mismatch-1',
          cueText: '这里有口型 authority 漂移。',
          surfaces: ['vrm'],
          lanes: ['action', 'lipsync'],
          aligned: false,
          driftStatus: 'hard-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'lipsync',
              cueId: 'segment-mismatch-1',
              planned: 'I',
              consumed: 'A',
              source: 'prosody-authority',
              confidence: 0.91,
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-mismatch-1',
          cueText: '这里有口型 authority 漂移。',
          driftStatus: 'hard-drift',
          aligned: false,
          authoritySegmentMatched: true,
          authorityMatchedDrivers: ['face', 'motion'],
          authorityBindingSummary: 'target=vrm | drivers=face, motion | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:no',
          authorityMatchSummary: 'face:yes motion:yes lipsync:no',
          authorityMismatchSummary: 'lipsync-mismatch',
          voiceSummary: 'zh-CN | closure=0.83 | precision=0.89',
          topVisemeSummary: 'A:0.66, closed:0.41, E:0.24',
          cueSummary: 'n/a / observe_focus | prosody=0.48 mouth=0.42 head=0.18',
          cueIdentityPresent: true,
          cueProsodyPresent: true,
          faceCue: null,
          actionCue: 'observe_focus',
          weightSummary: 'prosody=0.48 mouth=0.42 head=0.18',
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: 'lipsync=energy-phoneme-hybrid phase=playing',
          traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=none | execution=none',
          visemeHintsSummary: 'I:0.35@0.94 | closed:0.75@0.89',
          settleAuthoritySummary: null,
        },
      ],
      {
        recentDrivingEvent: null,
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:mismatch:1',
          activeThreadId: 'runtime-thread-mismatch-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        driverSummary: null,
        playbackTelemetry: {
          actualDurationMs: 220,
          plannedDurationMs: 220,
          driftMs: 0,
          settleMs: 220,
          stopReason: null,
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-mismatch-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: false,
          },
          cue: null,
          drivers: null,
        },
      },
    )

    expect(hotspots[0]?.authorityMismatchSummary).toBe('lipsync-mismatch')
    expect(hotspots[0]?.authorityMismatchReasonSummary).toBe('口型 authority 漂移，当前绑定来源是 prosody-authority、timeline-projection，实际执行落点是口型；当前表面策略是 procedural-carry。')
    expect(hotspots[0]?.authorityMismatchDisplay).toBe('口型 authority 漂移，当前绑定来源是 prosody-authority、timeline-projection，实际执行落点是口型；当前表面策略是 procedural-carry。')
  })

  it('deduplicates derived matched sources when trace binding is rebuilt from driver summary', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-derived-dedupe-1',
          cueText: '这里看 derived matched sources 去重。',
          surfaces: ['live2d', 'vrm'],
          lanes: ['expression', 'face', 'lipsync'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            { surface: 'live2d', lane: 'expression', cueId: 'segment-derived-dedupe-1', planned: 'A', consumed: 'B', source: null, aligned: false },
            { surface: 'vrm', lane: 'face', cueId: 'segment-derived-dedupe-1', planned: 'focused', consumed: 'blank', source: 'prosody-authority', aligned: false },
            { surface: 'live2d', lane: 'lipsync', cueId: 'segment-derived-dedupe-1', planned: 'I', consumed: 'A', source: 'prosody-authority', aligned: false },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-derived-dedupe-1',
          cueText: '这里看 derived matched sources 去重。',
          driftStatus: 'partial-drift',
          aligned: false,
          authorityBindingSummary: null,
          authorityMatchSummary: null,
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
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
          driverExecutionSummary: 'face=focused src=prosody-authority | lipsync=energy-phoneme-hybrid phase=playing',
          traceEmbodimentSummary: null,
          visemeHintsSummary: null,
          settleAuthoritySummary: null,
        },
      ],
      {
        recentDrivingEvent: null,
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:derived-dedupe:1',
          activeThreadId: 'runtime-thread-derived-dedupe-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        driverSummary: {
          rendererTarget: 'vrm',
          face: {
            cue: 'focused',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: 'segment-derived-dedupe-1',
          },
          motion: null,
          lipsync: {
            cue: 'I',
            source: 'prosody-authority',
            confidence: 0.91,
            segmentId: 'segment-derived-dedupe-1',
            mode: 'energy-phoneme-hybrid',
          },
        },
        playbackTelemetry: {
          actualDurationMs: 220,
          plannedDurationMs: 220,
          driftMs: 0,
          settleMs: 220,
          stopReason: null,
          rendererTarget: 'vrm',
          driverAuthority: null,
          cue: null,
          drivers: null,
        },
      },
    )

    expect(hotspots[0]?.traceSummary?.segmentBinding.matchedSources).toEqual(['prosody-authority'])
    expect(hotspots[0]?.authorityMismatchReasonSummary).toBe('动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是表情、口型；当前表面策略是 procedural-carry。')
  })

  it('prefers snapshot-native trace summary over locally rebuilt hotspot trace telemetry', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-trace-summary-native',
          cueText: '继续看这里。',
          surfaces: ['vrm'],
          lanes: ['lipsync'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'lipsync',
              cueId: 'segment-trace-summary-native',
              planned: 'I',
              consumed: 'A',
              source: 'prosody-authority',
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-trace-summary-native',
          cueText: '继续看这里。',
          driftStatus: 'partial-drift',
          aligned: false,
          speechEvidence: {
            voiceSummary: '上游语音韵律',
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
          authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority',
          authorityMatchSummary: 'lipsync:yes',
          voiceSummary: 'zh-CN | closure=0.84 | precision=0.90',
          topVisemeSummary: 'I:0.66',
          cueSummary: 'focused / observe_focus | prosody=0.36 mouth=0.28 head=0.32',
          cueIdentityPresent: true,
          cueProsodyPresent: true,
          faceCue: 'focused',
          actionCue: 'observe_focus',
          weightSummary: 'prosody=0.36 mouth=0.28 head=0.32',
          personaStyleSummary: 'observe-first',
          timingSummary: 'facial=320 action=240 emotion=360 | segment-start | soft-interrupt | hold',
          driverExecutionSummary: '上游驱动执行',
          traceEmbodimentSummary: '上游轨迹落点摘要',
          visemeHintsSummary: '上游口型提示',
          settleAuthoritySummary: null,
        },
      ] as any,
      {
        recentDrivingEvent: {
          kind: 'person-state-updated',
          decisionTraceId: 'mind:trace:local-fallback',
          summary: '本地 fallback 最近事件',
          createdAt: 2_468,
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:trace:local-fallback',
          activeThreadId: 'runtime-thread-local-fallback',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: ['local-fallback'],
        },
        traceSummary: {
          decisionTraceId: 'mind:trace:upstream-native',
          turnMode: 'protect',
          truthState: 'memory-grounded',
          repairState: 'minor',
          finalSurfacePolicy: 'authority-first',
          closureState: 'open-loop',
          activeThreadId: 'runtime-thread-upstream-native',
          suppressionTags: ['upstream-suppression'],
          latestEventSummary: '上游 trace 最近事件',
          segmentBinding: {
            matched: true,
            rendererTarget: 'vrm',
            matchedDrivers: ['motion'],
            matchedSources: ['upstream-source'],
          },
        },
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        driverSummary: {
          rendererTarget: 'vrm',
          face: null,
          motion: null,
          lipsync: {
            cue: 'I',
            source: 'legacy-lipsync-source',
            confidence: 0.91,
            segmentId: 'segment-trace-summary-native',
            mode: 'energy-phoneme-hybrid',
          },
        },
        playbackTelemetry: {
          actualDurationMs: 220,
          plannedDurationMs: 220,
          driftMs: 0,
          settleMs: 220,
          stopReason: null,
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-trace-summary-native',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          cue: null,
          drivers: null,
        },
      } as any,
    )

    expect(hotspots[0]?.traceSummary).toEqual({
      cueId: 'segment-trace-summary-native',
      decisionTraceId: 'mind:trace:upstream-native',
      turnMode: 'protect',
      truthState: 'memory-grounded',
      repairState: 'minor',
      finalSurfacePolicy: 'authority-first',
      closureState: 'open-loop',
      activeThreadId: 'runtime-thread-upstream-native',
      suppressionTags: ['upstream-suppression'],
      latestEventSummary: '上游 trace 最近事件',
      segmentBinding: {
        matched: true,
        rendererTarget: 'vrm',
        matchedDrivers: ['motion'],
        matchedSources: ['upstream-source'],
      },
    })
    expect(hotspots[0]?.traceSummaryEntries).toContainEqual({
      key: 'trace-id',
      label: '决策轨迹',
      value: 'mind:trace:upstream-native',
    })
    expect(hotspots[0]?.traceSummaryEntries).toContainEqual({
      key: 'binding-drivers',
      label: '命中驱动',
      value: 'motion',
    })
  })

  it('falls back to local hotspot trace telemetry when upstream trace summary belongs to a different cue', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-trace-summary-target',
          cueText: '继续看这里。',
          surfaces: ['vrm'],
          lanes: ['lipsync'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'lipsync',
              cueId: 'segment-trace-summary-target',
              planned: 'I',
              consumed: 'A',
              source: 'prosody-authority',
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-trace-summary-target',
          cueText: '继续看这里。',
          driftStatus: 'partial-drift',
          aligned: false,
          speechEvidence: {
            voiceSummary: '上游语音韵律',
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
          authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority',
          authorityMatchSummary: 'lipsync:yes',
          voiceSummary: 'zh-CN | closure=0.84 | precision=0.90',
          topVisemeSummary: 'I:0.66',
          cueSummary: 'focused / observe_focus | prosody=0.36 mouth=0.28 head=0.32',
          cueIdentityPresent: true,
          cueProsodyPresent: true,
          faceCue: 'focused',
          actionCue: 'observe_focus',
          weightSummary: 'prosody=0.36 mouth=0.28 head=0.32',
          personaStyleSummary: 'observe-first',
          timingSummary: 'facial=320 action=240 emotion=360 | segment-start | soft-interrupt | hold',
          driverExecutionSummary: '上游驱动执行',
          traceEmbodimentSummary: '上游轨迹落点摘要',
          visemeHintsSummary: '上游口型提示',
          settleAuthoritySummary: null,
        },
      ] as any,
      {
        recentDrivingEvent: {
          kind: 'person-state-updated',
          decisionTraceId: 'mind:trace:local-fallback',
          summary: '本地 fallback 最近事件',
          createdAt: 2_468,
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:trace:local-fallback',
          activeThreadId: 'runtime-thread-local-fallback',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: ['local-fallback'],
        },
        traceSummary: {
          cueId: 'segment-some-other-cue',
          decisionTraceId: 'mind:trace:upstream-wrong-cue',
          turnMode: 'protect',
          truthState: 'memory-grounded',
          repairState: 'minor',
          finalSurfacePolicy: 'authority-first',
          closureState: 'open-loop',
          activeThreadId: 'runtime-thread-upstream-native',
          suppressionTags: ['upstream-suppression'],
          latestEventSummary: '上游 trace 最近事件',
          segmentBinding: {
            matched: true,
            rendererTarget: 'vrm',
            matchedDrivers: ['motion'],
            matchedSources: ['upstream-source'],
          },
        },
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        driverSummary: {
          rendererTarget: 'vrm',
          face: null,
          motion: null,
          lipsync: {
            cue: 'I',
            source: 'legacy-lipsync-source',
            confidence: 0.91,
            segmentId: 'segment-trace-summary-target',
            mode: 'energy-phoneme-hybrid',
          },
        },
        playbackTelemetry: {
          actualDurationMs: 220,
          plannedDurationMs: 220,
          driftMs: 0,
          settleMs: 220,
          stopReason: null,
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-trace-summary-target',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          cue: null,
          drivers: null,
        },
      } as any,
    )

    expect(hotspots[0]?.traceSummary).toEqual(expect.objectContaining({
      cueId: 'segment-trace-summary-target',
      decisionTraceId: 'mind:trace:local-fallback',
      turnMode: 'care',
      truthState: 'live-grounded',
      repairState: 'none',
      finalSurfacePolicy: 'procedural-carry',
      closureState: 'grounded-recall',
      activeThreadId: 'runtime-thread-local-fallback',
      suppressionTags: ['local-fallback'],
      latestEventSummary: '本地 fallback 最近事件',
      segmentBinding: expect.objectContaining({
        matched: true,
        rendererTarget: 'vrm',
        matchedDrivers: ['lipsync'],
        matchedSources: ['prosody-authority'],
      }),
    }))
  })

  it('does not rebuild shell face motion and lipsync lanes as matched in local hotspot trace fallback when only the body line still carries the same segment', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-body-shell-fallback',
          cueText: '身体线先托住，其他外显车道还没回来。',
          surfaces: ['live2d'],
          lanes: ['settle'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'live2d',
              lane: 'settle',
              cueId: 'segment-body-shell-fallback',
              planned: 'settle',
              consumed: 'settle',
              source: null,
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-body-shell-fallback',
          cueText: '身体线先托住，其他外显车道还没回来。',
          driftStatus: 'partial-drift',
          aligned: false,
          speechEvidence: null,
          authorityBindingSummary: 'target=live2d | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no | lane=body-only',
          authorityMatchSummary: 'body:yes face:no motion:no lipsync:no',
          voiceSummary: 'zh-CN | closure=0.79 | precision=0.86 | companion=measured-return',
          topVisemeSummary: 'n/a',
          cueSummary: 'n/a',
          cueIdentityPresent: false,
          cueProsodyPresent: false,
          faceCue: 'n/a',
          actionCue: 'n/a',
          weightSummary: 'n/a',
          personaStyleSummary: 'n/a',
          timingSummary: 'n/a',
          driverExecutionSummary: 'body=measured-return still=0.88 gazeStable=0.80 breath=0.22 express=0.24 segment=segment-body-shell-fallback',
          traceEmbodimentSummary: null,
          visemeHintsSummary: 'n/a',
          settleAuthoritySummary: 'authority-bound | segment=segment-body-shell-fallback | target=live2d | drivers=body | sources=prosody-authority',
        },
      ] as any,
      {
        recentDrivingEvent: {
          kind: 'person-state-updated',
          decisionTraceId: 'mind:trace:body-shell-fallback',
          summary: '身体线仍在，其他外显车道只是空壳残留',
          createdAt: 2_468,
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:trace:body-shell-fallback',
          activeThreadId: 'runtime-thread-body-shell-fallback',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: ['body-shell-fallback'],
        },
        traceSummary: {
          cueId: 'segment-other-upstream-trace',
          decisionTraceId: 'mind:trace:upstream-other',
          turnMode: 'observe',
          truthState: 'memory-grounded',
          repairState: 'minor',
          finalSurfacePolicy: 'authority-first',
          closureState: 'open-loop',
          activeThreadId: 'runtime-thread-upstream-other',
          suppressionTags: [],
          latestEventSummary: 'wrong upstream trace summary',
          segmentBinding: {
            matched: true,
            rendererTarget: 'live2d',
            matchedDrivers: ['motion'],
            matchedSources: ['upstream-motion'],
          },
        },
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        driverSummary: {
          rendererTarget: 'live2d',
          body: {
            frameMode: 'measured-return',
            stillness: 0.88,
            gazeStability: 0.80,
            breathAmplitude: 0.22,
            expressivity: 0.24,
            segmentId: 'segment-body-shell-fallback',
          },
          face: {
            cue: null,
            source: null,
            confidence: 0,
            segmentId: 'segment-body-shell-fallback',
          },
          motion: {
            cue: null,
            source: null,
            confidence: 0,
            segmentId: 'segment-body-shell-fallback',
          },
          lipsync: {
            cue: null,
            source: null,
            confidence: 0,
            segmentId: 'segment-body-shell-fallback',
            mode: null,
          },
        },
        playbackTelemetry: {
          actualDurationMs: 220,
          plannedDurationMs: 220,
          driftMs: 0,
          settleMs: 220,
          stopReason: null,
          rendererTarget: 'live2d',
          driverAuthority: null,
          cue: null,
          drivers: null,
        },
      } as any,
    )

    expect(hotspots[0]?.traceSummary).toEqual(expect.objectContaining({
      cueId: 'segment-body-shell-fallback',
      decisionTraceId: 'mind:trace:body-shell-fallback',
      turnMode: 'care',
      truthState: 'live-grounded',
      repairState: 'none',
      finalSurfacePolicy: 'procedural-carry',
      closureState: 'grounded-recall',
      activeThreadId: 'runtime-thread-body-shell-fallback',
      suppressionTags: ['body-shell-fallback'],
      latestEventSummary: '身体线仍在，其他外显车道只是空壳残留',
      segmentBinding: expect.objectContaining({
        matched: true,
        rendererTarget: 'live2d',
        matchedDrivers: ['body'],
        matchedSources: [],
      }),
    }))
    expect(hotspots[0]?.settleAuthoritySummary).toBe('authority-bound | segment=segment-body-shell-fallback | target=live2d | drivers=body | sources=prosody-authority')
  })

  it('sorts hotspots by drift severity, speech evidence density, and lane count', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-hard-1',
          cueText: '这里口型和表情都漂了。',
          surfaces: ['live2d', 'vrm'],
          lanes: ['expression', 'face', 'lipsync', 'settle'],
          aligned: false,
          driftStatus: 'hard-drift',
          entries: [
            { surface: 'live2d', lane: 'expression', cueId: 'segment-hard-1', planned: 'A', consumed: 'B', source: null, aligned: false },
            { surface: 'live2d', lane: 'lipsync', cueId: 'segment-hard-1', planned: 'I', consumed: 'A', source: 'prosody-authority', aligned: false },
            { surface: 'vrm', lane: 'face', cueId: 'segment-hard-1', planned: 'focused', consumed: 'blank', source: 'prosody-authority', aligned: false },
            { surface: 'vrm', lane: 'settle', cueId: 'segment-hard-1', planned: 'settle', consumed: 'settle', source: null, aligned: false, settle: { vrmActionFadeMs: { planned: 280, consumed: 340 } } },
          ],
        },
        {
          cueId: 'segment-partial-1',
          cueText: '这里只是轻微漂移。',
          surfaces: ['live2d'],
          lanes: ['expression', 'lipsync'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            { surface: 'live2d', lane: 'expression', cueId: 'segment-partial-1', planned: 'A', consumed: 'B', source: null, aligned: false },
            { surface: 'live2d', lane: 'lipsync', cueId: 'segment-partial-1', planned: 'I', consumed: 'I', source: 'prosody-authority', aligned: true },
          ],
        },
        {
          cueId: 'segment-aligned-1',
          cueText: '这里是对齐的。',
          surfaces: ['vrm'],
          lanes: ['action'],
          aligned: true,
          driftStatus: 'all-aligned',
          entries: [
            { surface: 'vrm', lane: 'action', cueId: 'segment-aligned-1', planned: 'observe_focus', consumed: 'observe_focus', source: 'timeline-projection', aligned: true },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-hard-1',
          cueText: '这里口型和表情都漂了。',
          driftStatus: 'hard-drift',
          aligned: false,
          authorityBindingSummary: 'n/a',
          authorityMatchSummary: null,
          voiceSummary: 'zh-CN | closure=0.88 | precision=0.92',
          prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.48 | mouth=0.40 | head=0.22 | visemePeak=0.62 | provenance=fallback-derived | source=prosody-authority | segment=segment-hard-1',
          topVisemeSummary: 'A:0.70, closed:0.45',
          cueSummary: 'focused / observe_focus | prosody=0.48 mouth=0.40 head=0.22',
          cueIdentityPresent: true,
          cueProsodyPresent: true,
          faceCue: 'focused',
          actionCue: 'observe_focus',
          weightSummary: 'prosody=0.48 mouth=0.40 head=0.22',
          personaStyleSummary: 'observe-first | prosody=-0.09',
          timingSummary: 'facial=340 action=260 emotion=360 | cadence-peak | soft-interrupt | hold',
          driverExecutionSummary: 'motion=observe_focus mode=observe-first idle=breathing-idle@0.48 hold=240 src=timeline-projection conf=0.79',
          traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=none | execution=none',
          visemeHintsSummary: 'I:0.25@0.80 | A:0.62@0.93',
          settleAuthoritySummary: 'fallback-derived | segment=segment-hard-1',
        },
        {
          cueId: 'segment-partial-1',
          cueText: '这里只是轻微漂移。',
          driftStatus: 'partial-drift',
          aligned: false,
          authorityBindingSummary: 'n/a',
          authorityMatchSummary: null,
          voiceSummary: 'zh-CN | closure=0.82 | precision=0.90',
          prosodyAuthoritySummary: null,
          topVisemeSummary: 'A:0.62, E:0.30',
          cueSummary: 'soft-gaze / n/a | prosody=0.30 mouth=0.22 head=0.18',
          cueIdentityPresent: true,
          cueProsodyPresent: true,
          faceCue: 'soft-gaze',
          actionCue: null,
          weightSummary: 'prosody=0.30 mouth=0.22 head=0.18',
          personaStyleSummary: null,
          timingSummary: 'facial=240 action=220 emotion=300 | segment-start | soft-interrupt | hold',
          driverExecutionSummary: null,
          traceEmbodimentSummary: null,
          visemeHintsSummary: null,
          settleAuthoritySummary: null,
        },
        {
          cueId: 'segment-aligned-1',
          cueText: '这里是对齐的。',
          driftStatus: 'all-aligned',
          aligned: true,
          authorityBindingSummary: 'n/a',
          authorityMatchSummary: null,
          voiceSummary: 'zh-CN | closure=0.80 | precision=0.88',
          prosodyAuthoritySummary: null,
          topVisemeSummary: null,
          cueSummary: 'n/a / observe_focus',
          cueIdentityPresent: true,
          cueProsodyPresent: false,
          faceCue: null,
          actionCue: 'observe_focus',
          weightSummary: null,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: null,
          traceEmbodimentSummary: null,
          visemeHintsSummary: null,
          settleAuthoritySummary: null,
        },
      ],
      {
        recentDrivingEvent: null,
        recentDrivingTraceRecord: null,
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        driverSummary: null,
        playbackTelemetry: null,
      },
    )

    expect(hotspots.map(hotspot => hotspot.cueId)).toEqual([
      'segment-hard-1',
      'segment-partial-1',
      'segment-aligned-1',
    ])
    expect(hotspots.map(hotspot => hotspot.severityScore)).toEqual([13, 6, 2])
    expect(hotspots.map(hotspot => hotspot.hasSpeechDrift)).toEqual([true, true, false])
    expect(hotspots[0]?.speechEvidence.driverExecutionSummary).toBe('motion=observe_focus mode=observe-first idle=breathing-idle@0.48 hold=240 src=timeline-projection conf=0.79')
    expect(hotspots[0]?.traceEmbodimentSummary).toBe(null)
    expect(hotspots.map(hotspot => hotspot.traceSummary)).toEqual([null, null, null])
  })

  it('filters hotspots by settle authority provenance', () => {
    const hotspots = [
      {
        cueId: 'segment-bound-1',
        cueText: '这里有稳定 authority 绑定。',
        settleAuthoritySummary: 'authority-bound | segment=segment-bound-1 | target=vrm | drivers=face | sources=prosody-authority',
        authorityDriftLanes: ['face'],
        traceSummary: {
          segmentBinding: {
            matched: true,
            rendererTarget: 'vrm',
            matchedDrivers: ['face'],
            matchedSources: ['prosody-authority'],
          },
        },
      },
      {
        cueId: 'segment-fallback-1',
        cueText: '这里是回退推断。',
        settleAuthoritySummary: 'fallback-derived | target=vrm | drivers=motion | sources=legacy-motion-source',
        authorityDriftLanes: ['action'],
        traceSummary: {
          segmentBinding: {
            matched: false,
            rendererTarget: 'vrm',
            matchedDrivers: [],
            matchedSources: [],
          },
        },
      },
      {
        cueId: 'segment-none-1',
        cueText: '这里没有 settle authority。',
        settleAuthoritySummary: null,
        authorityDriftLanes: [],
        traceSummary: {
          segmentBinding: {
            matched: true,
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            matchedSources: ['seeded-face', 'seeded-motion', 'seeded-lipsync'],
          },
        },
      },
      {
        cueId: 'segment-face-mismatch-1',
        cueText: '这里 face authority 漂了。',
        settleAuthoritySummary: null,
        authorityDriftLanes: ['face'],
        traceSummary: {
          segmentBinding: {
            matched: true,
            rendererTarget: 'vrm',
            matchedDrivers: ['motion', 'lipsync'],
            matchedSources: ['seeded-motion', 'seeded-lipsync'],
          },
        },
      },
      {
        cueId: 'segment-body-mismatch-1',
        cueText: '这里 body authority 漂了。',
        settleAuthoritySummary: null,
        authorityDriftLanes: ['body'],
        traceSummary: {
          segmentBinding: {
            matched: true,
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            matchedSources: ['seeded-face', 'seeded-motion', 'seeded-lipsync'],
          },
        },
      },
      {
        cueId: 'segment-motion-mismatch-1',
        cueText: '这里 motion authority 漂了。',
        settleAuthoritySummary: null,
        authorityDriftLanes: ['action'],
        traceSummary: {
          segmentBinding: {
            matched: true,
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'lipsync'],
            matchedSources: ['seeded-face', 'seeded-lipsync'],
          },
        },
      },
      {
        cueId: 'segment-lipsync-mismatch-1',
        cueText: '这里 lipsync authority 漂了。',
        settleAuthoritySummary: null,
        authorityDriftLanes: ['lipsync'],
        traceSummary: {
          segmentBinding: {
            matched: true,
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion'],
            matchedSources: ['seeded-face', 'seeded-motion'],
          },
        },
      },
      {
        cueId: 'segment-voice-mismatch-1',
        cueText: '这里 voice authority 漂了。',
        settleAuthoritySummary: null,
        authorityDriftLanes: ['voice'],
        traceSummary: {
          segmentBinding: {
            matched: true,
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            matchedSources: ['seeded-face', 'seeded-motion', 'seeded-lipsync'],
          },
        },
      },
    ] as any

    expect(filterSpeechAuthorityHotspots(hotspots, {
      settleAuthority: 'authority-bound',
    }).map(hotspot => hotspot.cueId)).toEqual(['segment-bound-1'])

    expect(filterSpeechAuthorityHotspots(hotspots, {
      settleAuthority: 'fallback-derived',
    }).map(hotspot => hotspot.cueId)).toEqual(['segment-fallback-1'])

    expect(filterSpeechAuthorityHotspots(hotspots, {}).map(hotspot => hotspot.cueId)).toEqual([
      'segment-bound-1',
      'segment-fallback-1',
      'segment-none-1',
      'segment-face-mismatch-1',
      'segment-body-mismatch-1',
      'segment-motion-mismatch-1',
      'segment-lipsync-mismatch-1',
      'segment-voice-mismatch-1',
    ])

    expect(filterSpeechAuthorityHotspots(hotspots, {
      authorityMatch: 'body-mismatch',
    }).map(hotspot => hotspot.cueId)).toEqual(['segment-body-mismatch-1'])

    expect(filterSpeechAuthorityHotspots(hotspots, {
      authorityMatch: 'face-mismatch',
    }).map(hotspot => hotspot.cueId)).toEqual(['segment-face-mismatch-1'])

    expect(filterSpeechAuthorityHotspots(hotspots, {
      authorityMatch: 'motion-mismatch',
    }).map(hotspot => hotspot.cueId)).toEqual(['segment-motion-mismatch-1'])

    expect(filterSpeechAuthorityHotspots(hotspots, {
      authorityMatch: 'lipsync-mismatch',
    }).map(hotspot => hotspot.cueId)).toEqual(['segment-lipsync-mismatch-1'])

    expect(filterSpeechAuthorityHotspots(hotspots, {
      authorityMatch: 'voice-mismatch',
    }).map(hotspot => hotspot.cueId)).toEqual(['segment-voice-mismatch-1'])
  })

  it('does not rehydrate another cue authority summary after speech rows already scoped authority text away', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-current-authority',
          cueText: '当前 authority cue。',
          surfaces: ['vrm'],
          lanes: ['settle', 'lipsync'],
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
              settle: {
                vrmActionFadeMs: {
                  planned: 280,
                  consumed: 320,
                },
              },
              aligned: false,
            },
            {
              surface: 'vrm',
              lane: 'lipsync',
              cueId: 'segment-current-authority',
              planned: 'I',
              consumed: 'A',
              source: 'prosody-authority',
              confidence: 0.91,
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-current-authority',
          cueText: '当前 authority cue。',
          driftStatus: 'partial-drift',
          aligned: false,
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
          rendererDriftSummary: null,
        },
      ] as any,
      {
        recentDrivingEvent: null,
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:hotspot:scoped-1',
          activeThreadId: 'runtime-thread-hotspot-scoped-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        traceSummary: {
          cueId: 'segment-other-authority-summary',
          decisionTraceId: 'mind:trace:wrong-cue',
          turnMode: 'protect',
          truthState: 'memory-grounded',
          repairState: 'minor',
          finalSurfacePolicy: 'authority-first',
          closureState: 'open-loop',
          activeThreadId: 'runtime-thread-upstream-wrong-cue',
          suppressionTags: ['upstream-suppression'],
          latestEventSummary: '上游 trace 最近事件',
          segmentBinding: {
            matched: true,
            rendererTarget: 'vrm',
            matchedDrivers: ['motion'],
            matchedSources: ['upstream-source'],
          },
        },
        driverSummary: {
          rendererTarget: 'vrm',
          face: null,
          motion: null,
          lipsync: {
            cue: 'I',
            source: 'prosody-authority',
            confidence: 0.91,
            segmentId: 'segment-current-authority',
            mode: 'energy-phoneme-hybrid',
          },
        },
        playbackTelemetry: {
          actualDurationMs: 220,
          plannedDurationMs: 220,
          driftMs: 0,
          settleMs: 220,
          stopReason: null,
          rendererTarget: 'vrm',
          prosodyAuthority: {
            mode: 'energy-phoneme-hybrid',
            cueProsodyWeight: 0.35,
            cueMouthWeight: 0.35,
            cueHeadWeight: 0.32,
            visemePeakWeight: 0.75,
            provenance: 'authority-bound',
            source: 'prosody-authority',
            segmentId: 'segment-current-authority',
          },
          driverAuthority: {
            segmentId: 'segment-current-authority',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
          cue: null,
          drivers: null,
        },
      } as any,
    )

    expect(hotspots[0]).toEqual(expect.objectContaining({
      cueId: 'segment-current-authority',
      authorityTrustSummary: 'VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。',
      authorityMatchSummary: 'face:no motion:no lipsync:yes',
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
      authorityMismatchReasonSummary: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。',
      authorityMismatchDisplay: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。',
      settleAuthoritySummary: 'authority-bound | segment=segment-current-authority | target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
      speechSummaryEntries: [
        { key: 'authority-match', label: '绑定命中', value: '表情未命中 / 动作未命中 / 口型命中', technicalValue: 'face:no motion:no lipsync:yes' },
        { key: 'authority-trust', label: '权威可信性', value: 'VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。' },
        { key: 'authority-mismatch', label: '权威漂移', value: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。' },
        { key: 'prosody-authority', label: '韵律权威', value: '模式 energy-phoneme-hybrid，韵律 0.35，口部 0.35，头部 0.32，峰值口型 0.75，权威绑定，来源 韵律权威，片段 segment-current-authority', technicalValue: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-current-authority' },
        { key: 'trace-embodiment', label: '轨迹落点', value: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 口型，实际执行 无', technicalValue: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=none' },
        { key: 'settle-authority', label: '稳定段归因', value: 'authority-bound，片段 segment-current-authority，目标 VRM，驱动 口型，来源 prosody-authority', technicalValue: 'authority-bound | segment=segment-current-authority | target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes' },
      ],
    }))
    expect(hotspots[0]?.traceSummary?.cueId).toBe('segment-current-authority')
  })

  it('keeps body-backed identity-continuity', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-body-hotspot-1',
          cueText: '身体线还在托住同一个 segment。',
          surfaces: ['vrm'],
          lanes: ['settle', 'lipsync'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'settle',
              cueId: 'segment-body-hotspot-1',
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
            {
              surface: 'vrm',
              lane: 'lipsync',
              cueId: 'segment-body-hotspot-1',
              planned: 'I',
              consumed: 'A',
              source: 'prosody-authority',
              confidence: 0.91,
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-body-hotspot-1',
          cueText: '身体线还在托住同一个 segment。',
          driftStatus: 'partial-drift',
          aligned: false,
          authorityBindingSummary: 'target=vrm | drivers=body | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:no | lane=body-only',
          authorityMatchSummary: 'body:yes face:no motion:no lipsync:no',
          authorityMismatchSummary: 'face-mismatch, motion-mismatch, lipsync-mismatch',
          authorityMismatchReasonSummary: '表情、动作、口型 authority 已经漂离，但身体线还托着同一段 living segment。',
          speechEvidence: {
            voiceSummary: null,
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
          settleAuthoritySummary: null,
        },
      ] as any,
      {
        driverSummary: {
          rendererTarget: 'vrm',
          body: {
            frameMode: 'thinking',
            segmentId: 'segment-body-hotspot-1',
            reasonSummary: '身体线还托着这一段 living segment。',
          },
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-body-hotspot-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['body'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: false,
          },
        },
      } as any,
    )

    expect(hotspots[0]?.authorityTrustSummary).toBe('VRM 这段 authority 仍带着“身体线还托着这一段 living segment。”这一层关系余温，所以外层观察不该把她压回纯技术 settle。')
    expect(hotspots[0]?.speechSummaryEntries).toEqual(expect.arrayContaining([
      {
        key: 'authority-match',
        label: '绑定命中',
        value: '身体命中 / 表情未命中 / 动作未命中 / 口型未命中',
        technicalValue: 'body:yes face:no motion:no lipsync:no',
      },
      {
        key: 'authority-trust',
        label: '权威可信性',
        value: 'VRM 这段 authority 仍带着“身体线还托着这一段 living segment。”这一层关系余温，所以外层观察不该把她压回纯技术 settle。',
      },
    ]))
  })

  it('surfaces embodiment closure stage as a top-level hotspot field when audible body continuity is the active identity-continuity', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-audible-body-hotspot-1',
          cueText: '让身体和声音继续把她托在这条线上。',
          surfaces: ['live2d', 'vrm'],
          lanes: ['lipsync', 'settle'],
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [
            {
              surface: 'vrm',
              lane: 'lipsync',
              cueId: 'segment-audible-body-hotspot-1',
              planned: 'I',
              consumed: 'A',
              source: 'prosody-authority',
              confidence: 0.91,
              aligned: false,
            },
            {
              surface: 'vrm',
              lane: 'settle',
              cueId: 'segment-audible-body-hotspot-1',
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
      [
        {
          cueId: 'segment-audible-body-hotspot-1',
          cueText: '让身体和声音继续把她托在这条线上。',
          driftStatus: 'partial-drift',
          aligned: false,
          authorityRendererTarget: 'vrm',
          authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync+voice-only | pending-rejoin=face+motion',
          authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
          authorityMismatchSummary: 'face-mismatch, motion-mismatch | closure=audible-body-carry',
          authorityMismatchReasonSummary: 'body still carries the same living segment while face and motion have not rejoined yet | closure=audible-body-carry',
          authorityMismatchDisplay: 'body still carries the same living segment while face and motion have not rejoined yet | closure=audible-body-carry',
          embodimentClosureStage: 'audible-body-carry',
          speechEvidence: {
            voiceSummary: 'zh-CN | closure=0.62 | precision=0.58 | provenance=authority-bound | segment=segment-audible-body-hotspot-1 | source=prosody-authority',
            bodyContinuitySummary: 'mode=thinking | stillness=0.72 | gaze=0.58 | breath=0.28 | expressivity=0.14 | closure=audible-body-carry | seg=segment-audible-body-hotspot-1',
            prosodyAuthoritySummary: null,
            authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
            topVisemeSummary: null,
            cueSummary: null,
            cueIdentityPresent: false,
            cueProsodyPresent: true,
            personaStyleSummary: null,
            timingSummary: null,
            driverExecutionSummary: 'body=measured-return seg=segment-audible-body-hotspot-1 | lipsync=energy-phoneme-hybrid phase=playing seg=segment-audible-body-hotspot-1 | closure=audible-body-carry',
            visemeHintsSummary: null,
          },
          speechSummaryEntries: [
            { key: 'closure-stage', label: '闭环阶段', value: 'audible-body-carry' },
          ],
          settleAuthoritySummary: 'authority-bound | segment=segment-audible-body-hotspot-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority | lane=body+lipsync+voice-only | pending-rejoin=face+motion',
          rendererDriftSummary: null,
          voiceSummary: 'zh-CN | closure=0.62 | precision=0.58 | provenance=authority-bound | segment=segment-audible-body-hotspot-1 | source=prosody-authority',
          bodyContinuitySummary: 'mode=thinking | stillness=0.72 | gaze=0.58 | breath=0.28 | expressivity=0.14 | closure=audible-body-carry | seg=segment-audible-body-hotspot-1',
          topVisemeSummary: null,
          cueSummary: null,
          cueIdentityPresent: false,
          cueProsodyPresent: true,
          faceCue: null,
          actionCue: null,
          weightSummary: null,
          personaStyleSummary: null,
          timingSummary: null,
          driverExecutionSummary: 'body=measured-return seg=segment-audible-body-hotspot-1 | lipsync=energy-phoneme-hybrid phase=playing seg=segment-audible-body-hotspot-1 | closure=audible-body-carry',
          traceEmbodimentSummary: null,
          visemeHintsSummary: null,
        },
      ] as any,
      {
        driverSummary: {
          rendererTarget: 'vrm',
          body: {
            frameMode: 'thinking',
            segmentId: 'segment-audible-body-hotspot-1',
            reasonSummary: '身体线继续托住这条 living segment。',
          },
        },
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-audible-body-hotspot-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['body', 'lipsync'],
            sources: ['prosody-authority'],
            bodySegmentMatched: true,
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
    )

    expect(hotspots[0]?.authorityTrustSummary).toBe('VRM 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，表情和动作还在重连这条身体线。')
    expect(hotspots[0]?.embodimentClosureStage).toBe('audible-body-carry')
    expect(hotspots[0]?.speechSummaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority-trust',
      value: 'VRM 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，表情和动作还在重连这条身体线。',
    }))
    expect(hotspots[0]?.speechSummaryEntries).toContainEqual(expect.objectContaining({
      key: 'closure-stage',
      value: 'audible-body-carry',
    }))
  })

  it('does not reuse driver execution summary when it explicitly belongs to another segment than the current hotspot cue', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-current-hotspot-driver',
          cueText: '别把别段执行快照串回当前这条 living segment。',
          surfaces: ['vrm'],
          lanes: ['lipsync'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'lipsync',
              cueId: 'segment-current-hotspot-driver',
              planned: 'I',
              consumed: 'A',
              source: 'prosody-authority',
              confidence: 0.91,
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-current-hotspot-driver',
          cueText: '别把别段执行快照串回当前这条 living segment。',
          driftStatus: 'partial-drift',
          aligned: false,
          authorityRendererTarget: 'vrm',
          authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
          authorityMatchSummary: 'face:no motion:no lipsync:yes',
          authorityMismatchSummary: 'face-mismatch, motion-mismatch',
          authorityMismatchReasonSummary: '表情和动作还没跟回这段。',
          authorityMismatchDisplay: '表情和动作还没跟回这段。',
          speechEvidence: {
            voiceSummary: null,
            authorityMatchSummary: 'face:no motion:no lipsync:yes',
            topVisemeSummary: null,
            cueSummary: null,
            cueIdentityPresent: false,
            cueProsodyPresent: false,
            personaStyleSummary: null,
            timingSummary: null,
            driverExecutionSummary: 'body=measured-return seg=segment-hotspot-driver-upstream-other | lipsync=energy-phoneme-hybrid phase=playing seg=segment-hotspot-driver-upstream-other | closure=audible-body-carry',
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
          driverExecutionSummary: 'body=measured-return seg=segment-hotspot-driver-upstream-other | lipsync=energy-phoneme-hybrid phase=playing seg=segment-hotspot-driver-upstream-other | closure=audible-body-carry',
          traceEmbodimentSummary: null,
          visemeHintsSummary: null,
          settleAuthoritySummary: null,
          rendererDriftSummary: null,
        },
      ] as any,
      {
        recentDrivingEvent: null,
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:hotspot:stale-driver',
          activeThreadId: 'runtime-thread-hotspot-stale-driver',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        driverSummary: null,
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-current-hotspot-driver',
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority'],
            faceSegmentMatched: false,
            motionSegmentMatched: false,
            lipsyncSegmentMatched: true,
          },
        },
      } as any,
    )

    expect(hotspots[0]?.speechEvidence.driverExecutionSummary).toBeNull()
    expect(hotspots[0]?.speechSummaryEntries.some(entry => entry.key === 'driver-execution')).toBe(false)
    expect(hotspots[0]?.embodimentClosureStage).toBeUndefined()
  })

  it('keeps thinner affective-residue room-making wording visible in hotspot settle authority when driver summaries still carry the measured-return line', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-thin-affective-hotspot',
          cueText: '先轻一点接住这条线。',
          surfaces: ['vrm'],
          lanes: ['face', 'action', 'lipsync', 'settle'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'face',
              cueId: 'segment-thin-affective-hotspot',
              planned: 'focused',
              consumed: 'focused',
              source: 'prosody-authority',
              confidence: 0.93,
              aligned: true,
            },
            {
              surface: 'vrm',
              lane: 'action',
              cueId: 'segment-thin-affective-hotspot',
              planned: 'observe_focus',
              consumed: 'observe_focus',
              source: 'timeline-projection',
              confidence: 0.9,
              aligned: true,
            },
            {
              surface: 'vrm',
              lane: 'lipsync',
              cueId: 'segment-thin-affective-hotspot',
              planned: 'I',
              consumed: 'I',
              source: 'prosody-authority',
              confidence: 0.94,
              aligned: true,
            },
            {
              surface: 'vrm',
              lane: 'settle',
              cueId: 'segment-thin-affective-hotspot',
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
      [
        {
          cueId: 'segment-thin-affective-hotspot',
          cueText: '先轻一点接住这条线。',
          driftStatus: 'partial-drift',
          aligned: false,
          authorityBindingSummary: null,
          authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          speechEvidence: {
            voiceSummary: null,
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
          settleAuthoritySummary: 'authority-bound | segment=segment-thin-affective-hotspot',
          rendererDriftSummary: null,
        },
      ] as any,
      {
        recentDrivingEvent: null,
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:hotspot:thin-affective',
          activeThreadId: 'runtime-thread-hotspot-thin-affective',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        driverSummary: {
          rendererTarget: 'vrm',
          face: {
            cue: 'focused',
            source: 'prosody-authority',
            confidence: 0.93,
            segmentId: 'segment-thin-affective-hotspot',
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonSummary: '余韵还在，先留白，别立刻把温度放大',
          },
          motion: {
            cue: 'observe_focus',
            source: 'timeline-projection',
            confidence: 0.9,
            segmentId: 'segment-thin-affective-hotspot',
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonSummary: '余韵还在，先留白，别立刻把温度放大',
          },
          lipsync: {
            cue: 'I',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: 'segment-thin-affective-hotspot',
            mode: 'energy-phoneme-hybrid',
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonSummary: '余韵还在，先留白，别立刻把温度放大',
          },
        },
        playbackTelemetry: {
          actualDurationMs: 240,
          plannedDurationMs: 240,
          driftMs: 0,
          settleMs: 240,
          stopReason: null,
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-thin-affective-hotspot',
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
          cue: null,
          drivers: null,
        },
      } as any,
    )

    expect(hotspots[0]?.settleAuthoritySummary).toContain('余韵还在')
    expect(hotspots[0]?.authorityTrustSummary).toContain('余韵还在，先留白，别立刻把温度放大')
    expect(hotspots[0]?.speechSummaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority-trust',
      value: expect.stringContaining('余韵还在，先留白，别立刻把温度放大'),
    }))
    expect(hotspots[0]?.speechSummaryEntries).toContainEqual(expect.objectContaining({
      key: 'settle-authority',
      value: expect.stringContaining('余韵还在'),
    }))
  })

  it('prefers richer settle-reason trust over thinner generic row trust in speech hotspots', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-thin-affective-hotspot-runtime-override-1',
          cueText: '先轻一点接住这条线。',
          surfaces: ['vrm'],
          lanes: ['face', 'action', 'lipsync', 'settle'],
          driftStatus: 'partial-drift',
          aligned: false,
          entries: [
            {
              surface: 'vrm',
              lane: 'face',
              cueId: 'segment-thin-affective-hotspot-runtime-override-1',
              planned: 'focused',
              consumed: 'focused',
              source: 'prosody-authority',
              confidence: 0.93,
              aligned: true,
            },
            {
              surface: 'vrm',
              lane: 'action',
              cueId: 'segment-thin-affective-hotspot-runtime-override-1',
              planned: 'observe_focus',
              consumed: 'observe_focus',
              source: 'timeline-projection',
              confidence: 0.9,
              aligned: true,
            },
            {
              surface: 'vrm',
              lane: 'lipsync',
              cueId: 'segment-thin-affective-hotspot-runtime-override-1',
              planned: 'I',
              consumed: 'I',
              source: 'prosody-authority',
              confidence: 0.94,
              aligned: true,
            },
            {
              surface: 'vrm',
              lane: 'settle',
              cueId: 'segment-thin-affective-hotspot-runtime-override-1',
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
      [
        {
          cueId: 'segment-thin-affective-hotspot-runtime-override-1',
          cueText: '先轻一点接住这条线。',
          driftStatus: 'partial-drift',
          aligned: false,
          authorityBindingSummary: null,
          authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          speechEvidence: {
            voiceSummary: null,
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
          authorityTrustSummary: 'VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
          settleAuthoritySummary: 'authority-bound | segment=segment-thin-affective-hotspot-runtime-override-1',
          rendererDriftSummary: null,
        },
      ] as any,
      {
        recentDrivingEvent: null,
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:hotspot:thin-affective-runtime-override-1',
          activeThreadId: 'runtime-thread-hotspot-thin-affective-runtime-override-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        driverSummary: {
          rendererTarget: 'vrm',
          face: {
            cue: 'focused',
            source: 'prosody-authority',
            confidence: 0.93,
            segmentId: 'segment-thin-affective-hotspot-runtime-override-1',
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonSummary: '余韵还在，先留白，别立刻把温度放大',
          },
          motion: {
            cue: 'observe_focus',
            source: 'timeline-projection',
            confidence: 0.9,
            segmentId: 'segment-thin-affective-hotspot-runtime-override-1',
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonSummary: '余韵还在，先留白，别立刻把温度放大',
          },
          lipsync: {
            cue: 'I',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: 'segment-thin-affective-hotspot-runtime-override-1',
            mode: 'energy-phoneme-hybrid',
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonSummary: '余韵还在，先留白，别立刻把温度放大',
          },
        },
        playbackTelemetry: {
          actualDurationMs: 240,
          plannedDurationMs: 240,
          driftMs: 0,
          settleMs: 240,
          stopReason: null,
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: 'segment-thin-affective-hotspot-runtime-override-1',
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
          cue: null,
          drivers: null,
        },
      } as any,
    )

    expect(hotspots[0]?.authorityTrustSummary).toContain('余韵还在，先留白，别立刻把温度放大')
    expect(hotspots[0]?.speechSummaryEntries).toContainEqual(expect.objectContaining({
      key: 'authority-trust',
      value: expect.stringContaining('余韵还在，先留白，别立刻把温度放大'),
    }))
  })

  it('keeps interruption-resume live2d same-line recovery visible in speech hotspots after authority, execution, and trace context all rejoin the later callback segment', () => {
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId: 'segment-later-callback-return',
          cueText: '我还在，只是先别一下子靠太近。',
          surfaces: ['live2d'],
          lanes: ['expression', 'motion', 'lipsync', 'settle'],
          aligned: true,
          driftStatus: 'all-aligned',
          entries: [
            {
              surface: 'live2d',
              lane: 'expression',
              cueId: 'segment-later-callback-return',
              planned: 'RecoverSoft',
              consumed: 'RecoverSoft',
              source: 'prosody-authority',
              confidence: 0.94,
              aligned: true,
            },
            {
              surface: 'live2d',
              lane: 'motion',
              cueId: 'segment-later-callback-return',
              planned: 'StillnessGuard',
              consumed: 'StillnessGuard',
              source: 'timeline-projection',
              confidence: 0.9,
              aligned: true,
            },
            {
              surface: 'live2d',
              lane: 'lipsync',
              cueId: 'segment-later-callback-return',
              planned: 'closed',
              consumed: 'closed',
              source: 'prosody-authority',
              confidence: 0.93,
              aligned: true,
            },
            {
              surface: 'live2d',
              lane: 'settle',
              cueId: 'segment-later-callback-return',
              planned: 'settle',
              consumed: 'settle',
              source: null,
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
              aligned: true,
            },
          ],
        },
      ] as any,
      [
        {
          cueId: 'segment-later-callback-return',
          cueText: '我还在，只是先别一下子靠太近。',
          driftStatus: 'all-aligned',
          aligned: true,
          authorityRendererTarget: 'live2d',
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          authorityBindingSummary: 'target=live2d | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | matches=face:yes motion:yes lipsync:yes',
          authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
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
      ] as any,
      {
        recentDrivingEvent: {
          kind: 'dialogue-interrupted',
          decisionTraceId: 'mind:interrupt-callback-line:1',
          summary: '打断以后还是沿着同一条 callback 线中性可见占位。',
          createdAt: 4200,
        },
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:interrupt-callback-line:1',
          activeThreadId: 'thread-interrupt-callback-line-1',
          turnMode: 'answer',
          truthState: 'remembered',
          repairState: 'none',
          finalSurfacePolicy: 'same-thread-continuation',
          closureState: 'same-her-carry',
          suppressionTags: ['continuity-next-open-window', 'interrupt-tail'],
        },
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        driverSummary: {
          rendererTarget: 'live2d',
          face: {
            cue: 'soft-release',
            source: 'prosody-authority',
            confidence: 0.94,
            segmentId: 'segment-later-callback-return',
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonSummary: 'the interruption passed, but she stayed on the same callback line',
          },
          motion: {
            cue: 'idle_settle',
            source: 'timeline-projection',
            confidence: 0.9,
            segmentId: 'segment-later-callback-return',
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonSummary: 'resume more inward after the interruption instead of reopening from scratch',
          },
          lipsync: {
            cue: 'closed',
            source: 'prosody-authority',
            confidence: 0.93,
            segmentId: 'segment-later-callback-return',
            mode: 'energy-phoneme-hybrid',
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            reasonSummary: 'the same callback line is still carrying the mouth closure',
          },
        },
        playbackTelemetry: {
          actualDurationMs: 260,
          plannedDurationMs: 420,
          driftMs: -160,
          settleMs: 340,
          stopReason: 'owner-canceled',
          rendererTarget: 'live2d',
          driverAuthority: {
            segmentId: 'segment-later-callback-return',
            rendererTarget: 'live2d',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            sources: ['prosody-authority', 'timeline-projection'],
            faceSegmentMatched: true,
            motionSegmentMatched: true,
            lipsyncSegmentMatched: true,
          },
          cue: null,
          drivers: null,
        },
      } as any,
    )

    expect(hotspots[0]).toEqual(expect.objectContaining({
      cueId: 'segment-later-callback-return',
      authorityTrustSummary: 'Live2D 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
      authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
      settleAuthoritySummary: 'authority-bound | segment=segment-later-callback-return | target=live2d | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
      traceEmbodimentSummary: 'turn=answer | closure=same-her-carry | surface=same-thread-continuation | authority=face, motion, lipsync | execution=face+motion+lipsync',
    }))
    expect(hotspots[0]?.speechEvidence.driverExecutionSummary).toContain('face=thinking/soft-release@0.41')
    expect(hotspots[0]?.speechEvidence.driverExecutionSummary).toContain('motion=idle_settle')
    expect(hotspots[0]?.speechEvidence.driverExecutionSummary).toContain('lipsync=energy-phoneme-hybrid phase=playing')
    expect(hotspots[0]?.speechSummaryEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'authority-trust',
        value: 'Live2D 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
      }),
      expect.objectContaining({
        key: 'driver-execution',
      }),
      expect.objectContaining({
        key: 'trace-embodiment',
      }),
      expect.objectContaining({
        key: 'settle-authority',
        value: 'authority-bound，片段 segment-later-callback-return，目标 Live2D，驱动 表情、动作、口型，来源 prosody-authority, timeline-projection',
      }),
    ]))
    expect(hotspots[0]?.traceSummary).toEqual(expect.objectContaining({
      cueId: 'segment-later-callback-return',
      decisionTraceId: 'mind:interrupt-callback-line:1',
      finalSurfacePolicy: 'same-thread-continuation',
      closureState: 'same-her-carry',
      latestEventSummary: '打断以后还是沿着同一条 callback 线中性可见占位。',
      segmentBinding: expect.objectContaining({
        matched: true,
        rendererTarget: 'live2d',
        matchedDrivers: ['face', 'motion', 'lipsync'],
        matchedSources: ['prosody-authority', 'timeline-projection'],
      }),
    }))
  })

  it('filters hotspots by renderer drift presence and pending/runtime-only summaries', () => {
    const hotspots = [
      {
        cueId: 'segment-pending-1',
        cueText: 'resident prediction still pending.',
        settleAuthoritySummary: null,
        authorityDriftLanes: ['expression'],
        rendererDriftSummary: 'resident Soft Gaze is waiting for renderer application',
        traceSummary: null,
      },
      {
        cueId: 'segment-runtime-only-1',
        cueText: 'runtime surfaced before resident prediction.',
        settleAuthoritySummary: null,
        authorityDriftLanes: ['expression'],
        rendererDriftSummary: 'runtime expression surfaced Focus Inspect before resident prediction | face focused@prosody-authority',
        traceSummary: null,
      },
      {
        cueId: 'segment-alias-drift-1',
        cueText: 'resident and actual diverged.',
        settleAuthoritySummary: null,
        authorityDriftLanes: ['expression'],
        rendererDriftSummary: 'resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority',
        traceSummary: null,
      },
      {
        cueId: 'segment-none-1',
        cueText: 'no renderer drift here.',
        settleAuthoritySummary: null,
        authorityDriftLanes: [],
        rendererDriftSummary: null,
        traceSummary: null,
      },
    ] as any

    expect(filterSpeechAuthorityHotspots(hotspots, {
      rendererDrift: 'present',
    }).map(hotspot => hotspot.cueId)).toEqual([
      'segment-pending-1',
      'segment-runtime-only-1',
      'segment-alias-drift-1',
    ])

    expect(filterSpeechAuthorityHotspots(hotspots, {
      rendererDrift: 'pending-or-runtime-only',
    }).map(hotspot => hotspot.cueId)).toEqual([
      'segment-pending-1',
      'segment-runtime-only-1',
    ])

    expect(filterSpeechAuthorityHotspots(hotspots, {
      rendererDrift: 'none',
    }).map(hotspot => hotspot.cueId)).toEqual([
      'segment-none-1',
    ])
  })

  it('rehydrates explicit voice telemetry into speech hotspot evidence before playback telemetry rethreads top-level prosody authority', () => {
    const cueId = 'segment-hotspot-explicit-voice-1'
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId,
          cueText: '现在只有声音 continuity 还知道这条 embodied line 在哪里。',
          surfaces: ['vrm'],
          lanes: ['lipsync'],
          aligned: false,
          driftStatus: 'partial-drift',
          entries: [
            {
              surface: 'vrm',
              lane: 'lipsync',
              cueId,
              planned: 'I',
              consumed: 'A',
              source: 'prosody-authority',
              confidence: 0.91,
              aligned: false,
            },
          ],
        },
      ] as any,
      [
        {
          cueId,
          cueText: '现在只有声音 continuity 还知道这条 embodied line 在哪里。',
          driftStatus: 'partial-drift',
          aligned: false,
          speechEvidence: null,
          authorityMatchedDrivers: ['lipsync'],
          authorityMatchedSources: ['prosody-authority', 'voice-segment'],
          authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority, voice-segment | matches=face:no motion:no lipsync:yes',
          authorityMatchSummary: 'face:no motion:no lipsync:yes',
          authorityMismatchSummary: 'face-mismatch, motion-mismatch',
          authorityMismatchReasonSummary: '表情和动作还没跟回这一段，但声音已经把当前身体线先托住了。',
          authorityMismatchDisplay: '表情和动作还没跟回这一段，但声音已经把当前身体线先托住了。',
          authorityRendererTarget: 'vrm',
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
              sources: ['prosody-authority', 'voice-segment'],
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
      ] as any,
      {
        recentDrivingEvent: null,
        recentDrivingTraceRecord: null,
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        driverSummary: null,
        playbackTelemetry: {
          rendererTarget: 'vrm',
          driverAuthority: {
            segmentId: cueId,
            rendererTarget: 'vrm',
            matchedDrivers: ['lipsync'],
            sources: ['prosody-authority', 'voice-segment'],
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
        traceSummary: null,
      } as any,
    )

    expect(hotspots[0]?.speechEvidence.prosodyAuthoritySummary).toBe(
      'mode=energy-phoneme-hybrid | prosody=0.29 | mouth=0.25 | head=0.17 | visemePeak=0.71 | provenance=authority-bound | source=prosody-authority | segment=segment-hotspot-explicit-voice-1',
    )
    expect(hotspots[0]?.speechSummaryEntries.find(entry => entry.key === 'prosody-authority')?.technicalValue).toBe(
      'mode=energy-phoneme-hybrid | prosody=0.29 | mouth=0.25 | head=0.17 | visemePeak=0.71 | provenance=authority-bound | source=prosody-authority | segment=segment-hotspot-explicit-voice-1',
    )
  })

  it('prefers the current cue prosody summary over stale nested speech evidence when the living segment has already rethreaded', () => {
    const cueId = 'segment-hotspot-current-prosody-rethreaded'
    const currentProsodySummary = `mode=energy-phoneme-hybrid | prosody=0.31 | mouth=0.27 | head=0.21 | visemePeak=0.76 | provenance=authority-bound | source=prosody-authority | segment=${cueId}`
    const hotspots = buildSpeechAuthorityHotspots(
      [
        {
          cueId,
          cueText: '这一段热点应该跟着当前 embodied cue，而不是旧的韵律残影。',
          surfaces: ['vrm'],
          lanes: ['lipsync'],
          aligned: true,
          driftStatus: 'all-aligned',
          entries: [],
        },
      ] as any,
      [
        {
          cueId,
          cueText: '这一段热点应该跟着当前 embodied cue，而不是旧的韵律残影。',
          driftStatus: 'all-aligned',
          aligned: true,
          speechEvidence: {
            voiceSummary: null,
            bodyContinuitySummary: null,
            prosodyAuthoritySummary: 'mode=legacy-stale | prosody=0.11 | mouth=0.09 | head=0.07 | visemePeak=0.28 | provenance=authority-bound | source=prosody-authority | segment=segment-hotspot-stale-prosody-owner',
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
          authorityMatchedDrivers: ['lipsync'],
          authorityMatchedSources: ['prosody-authority'],
          authorityBindingSummary: 'target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
          authorityMatchSummary: 'face:no motion:no lipsync:yes',
          authorityMismatchSummary: null,
          authorityMismatchReasonSummary: null,
          authorityMismatchDisplay: null,
          authorityRendererTarget: 'vrm',
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
              segmentId: 'segment-hotspot-stale-top-level-prosody',
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
      ] as any,
      {
        recentDrivingEvent: null,
        recentDrivingTraceRecord: null,
        recentDrivingTraceEvents: [],
        recentDrivingTraceDetails: [],
        driverSummary: null,
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
            segmentId: 'segment-hotspot-stale-top-level-prosody',
            provenance: 'authority-bound',
            source: 'prosody-authority',
            mode: 'stale-top-level',
            cueProsodyWeight: 0.14,
            cueMouthWeight: 0.12,
            cueHeadWeight: 0.08,
            visemePeakWeight: 0.25,
          },
        },
        traceSummary: null,
      } as any,
    )

    expect(hotspots[0]?.speechEvidence.prosodyAuthoritySummary).toBe(currentProsodySummary)
    expect(hotspots[0]?.speechSummaryEntries.find(entry => entry.key === 'prosody-authority')?.technicalValue).toBe(
      currentProsodySummary,
    )
  })
})
