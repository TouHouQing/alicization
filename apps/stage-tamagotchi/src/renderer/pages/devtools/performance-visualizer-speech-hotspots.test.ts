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
        authorityTrustSummary: null,
        speechSummaryEntries: [
          { key: 'authority-match', label: '绑定命中', value: '表情命中 / 动作命中 / 口型命中', technicalValue: 'face:yes motion:yes lipsync:yes' },
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
          segmentBinding: {
            matched: true,
            rendererTarget: 'vrm',
            matchedDrivers: ['face', 'motion', 'lipsync'],
            matchedSources: ['seeded-face', 'seeded-motion', 'seeded-lipsync'],
          },
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
          rendererDriftSummary: 'resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority',
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

    expect(hotspots[0]?.rendererDriftSummary).toBe('resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority')
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
        speechSummaryEntries: [
          { key: 'authority-match', label: '绑定命中', value: '上游 authority 命中' },
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
        ],
        traceEmbodimentSummary: '上游轨迹落点',
        authorityMatchSummary: '上游 authority 命中',
        authorityMismatchSummary: 'face-mismatch, motion-mismatch',
        authorityMismatchReasonSummary: '上游 authority 漂移说明',
        authorityMismatchDisplay: '上游 authority 漂移说明',
        settleAuthoritySummary: '上游 authority settle',
      }),
    ])
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
          segmentBinding: {
            matched: false,
            rendererTarget: 'vrm',
            matchedDrivers: [],
            matchedSources: [],
          },
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

    expect(hotspots[0]?.traceSummary).toEqual({
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
      segmentBinding: {
        matched: true,
        rendererTarget: 'vrm',
        matchedDrivers: ['lipsync'],
        matchedSources: ['prosody-authority'],
      },
    })
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
      'segment-motion-mismatch-1',
      'segment-lipsync-mismatch-1',
    ])

    expect(filterSpeechAuthorityHotspots(hotspots, {
      authorityMatch: 'face-mismatch',
    }).map(hotspot => hotspot.cueId)).toEqual(['segment-face-mismatch-1'])

    expect(filterSpeechAuthorityHotspots(hotspots, {
      authorityMatch: 'motion-mismatch',
    }).map(hotspot => hotspot.cueId)).toEqual(['segment-motion-mismatch-1'])

    expect(filterSpeechAuthorityHotspots(hotspots, {
      authorityMatch: 'lipsync-mismatch',
    }).map(hotspot => hotspot.cueId)).toEqual(['segment-lipsync-mismatch-1'])
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
      authorityTrustSummary: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      authorityMatchSummary: 'face:no motion:no lipsync:yes',
      authorityMismatchSummary: 'face-mismatch, motion-mismatch',
      authorityMismatchReasonSummary: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。',
      authorityMismatchDisplay: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。',
      settleAuthoritySummary: 'authority-bound | segment=segment-current-authority | target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes',
      speechSummaryEntries: [
        { key: 'authority-match', label: '绑定命中', value: '表情未命中 / 动作未命中 / 口型命中', technicalValue: 'face:no motion:no lipsync:yes' },
        { key: 'authority-trust', label: '权威可信性', value: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。' },
        { key: 'authority-mismatch', label: '权威漂移', value: '表情、动作 authority 漂移，当前绑定来源是 prosody-authority，实际执行落点是无执行；当前表面策略是 procedural-carry。' },
        { key: 'trace-embodiment', label: '轨迹落点', value: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 口型，实际执行 无', technicalValue: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=lipsync | execution=none' },
        { key: 'settle-authority', label: '稳定段归因', value: 'authority-bound，片段 segment-current-authority，目标 VRM，驱动 口型，来源 prosody-authority', technicalValue: 'authority-bound | segment=segment-current-authority | target=vrm | drivers=lipsync | sources=prosody-authority | matches=face:no motion:no lipsync:yes' },
      ],
    }))
    expect(hotspots[0]?.traceSummary?.cueId).toBe('segment-current-authority')
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
        rendererDriftSummary: 'runtime surfaced Focus Inspect before resident prediction | cue focused@prosody-authority',
        traceSummary: null,
      },
      {
        cueId: 'segment-alias-drift-1',
        cueText: 'resident and actual diverged.',
        settleAuthoritySummary: null,
        authorityDriftLanes: ['expression'],
        rendererDriftSummary: 'resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority',
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
})
