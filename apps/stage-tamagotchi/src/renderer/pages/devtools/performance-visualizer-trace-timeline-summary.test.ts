import { describe, expect, it } from 'vitest'

import {
  buildRecentDrivingEventSummaryEntries,
  buildRecentDrivingTraceDetailEntries,
  buildRecentDrivingTraceEventEntries,
  buildRecentDrivingTraceRecordSummaryEntries,
  buildRecentDrivingTraceRecordSummaryEntriesFromDiagnostics,
} from './performance-visualizer-trace-timeline-summary'

describe('performance visualizer trace timeline summary', () => {
  it('builds Chinese-first summary entries for recent driving event and trace record', () => {
    expect(buildRecentDrivingEventSummaryEntries({
      kind: 'person-state-updated',
      decisionTraceId: 'mind:rest:1',
      summary: 'protective-watch settled after fatigue pressure rose',
      createdAt: 2468,
    })).toEqual([
      { key: 'event-kind', label: '最近事件类型', value: 'person-state-updated' },
      { key: 'event-trace-id', label: '最近事件轨迹', value: 'mind:rest:1' },
      { key: 'event-summary', label: '最近事件摘要', value: 'protective-watch settled after fatigue pressure rose' },
      { key: 'event-created-at', label: '最近事件时间', value: '2468' },
    ])

    expect(buildRecentDrivingTraceRecordSummaryEntries({
      decisionTraceId: 'mind:rest:1',
      activeThreadId: 'runtime-thread-rest-1',
      turnMode: 'care',
      truthState: 'live-grounded',
      repairState: 'none',
      finalSurfacePolicy: 'procedural-carry',
      closureState: 'grounded-recall',
      suppressionTags: ['late-night-fatigue'],
      authorityTrustSummary: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
    })).toEqual([
      { key: 'trace-id', label: '决策轨迹', value: 'mind:rest:1' },
      { key: 'trace-thread', label: '活跃线程', value: 'runtime-thread-rest-1' },
      { key: 'trace-turn-mode', label: '回合模式', value: '关怀回合', technicalValue: 'care' },
      { key: 'trace-truth-state', label: '真值状态', value: 'live-grounded（当前事实已贴地）', technicalValue: 'live-grounded' },
      { key: 'trace-repair-state', label: '修复状态', value: '无需修复', technicalValue: 'none' },
      { key: 'trace-surface-policy', label: '表面策略', value: 'procedural-carry（沿既有过程延续表达）', technicalValue: 'procedural-carry' },
      { key: 'trace-closure-state', label: '收口状态', value: 'grounded-recall（基于记忆回收落稳）', technicalValue: 'grounded-recall' },
      { key: 'trace-authority-trust', label: '权威可信性', value: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。' },
      { key: 'trace-suppression-tags', label: '抑制标签', value: 'late-night-fatigue' },
    ])
  })

  it('rebuilds same-body-line authority trust for trace records when current tri-driver evidence is available', () => {
    expect(buildRecentDrivingTraceRecordSummaryEntries({
      decisionTraceId: 'mind:trace:vrm-body-1',
      activeThreadId: 'runtime-thread-vrm-body-1',
      turnMode: 'care',
      truthState: 'live-grounded',
      repairState: 'none',
      finalSurfacePolicy: 'procedural-carry',
      closureState: 'grounded-recall',
      suppressionTags: [],
    }, {
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-vrm-body-1',
      authoritySegmentId: 'segment-vrm-body-1',
      authorityRendererTarget: 'vrm',
      authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    })).toEqual([
      { key: 'trace-id', label: '决策轨迹', value: 'mind:trace:vrm-body-1' },
      { key: 'trace-thread', label: '活跃线程', value: 'runtime-thread-vrm-body-1' },
      { key: 'trace-turn-mode', label: '回合模式', value: '关怀回合', technicalValue: 'care' },
      { key: 'trace-truth-state', label: '真值状态', value: 'live-grounded（当前事实已贴地）', technicalValue: 'live-grounded' },
      { key: 'trace-repair-state', label: '修复状态', value: '无需修复', technicalValue: 'none' },
      { key: 'trace-surface-policy', label: '表面策略', value: 'procedural-carry（沿既有过程延续表达）', technicalValue: 'procedural-carry' },
      { key: 'trace-closure-state', label: '收口状态', value: 'grounded-recall（基于记忆回收落稳）', technicalValue: 'grounded-recall' },
      { key: 'trace-authority-trust', label: '权威可信性', value: 'VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。' },
    ])
  })

  it('falls back to prosody-only authority trust for trace records when only lipsync continuity is still matched', () => {
    expect(buildRecentDrivingTraceRecordSummaryEntries({
      decisionTraceId: 'mind:trace:thin-lipsync-1',
      activeThreadId: 'runtime-thread-thin-lipsync-1',
      turnMode: 'care',
      truthState: 'live-grounded',
      repairState: 'none',
      finalSurfacePolicy: 'procedural-carry',
      closureState: 'grounded-recall',
      suppressionTags: [],
    }, {
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-thin-lipsync-1',
      authoritySegmentId: 'segment-thin-lipsync-1',
      authorityRendererTarget: 'vrm',
      authorityMatchedDrivers: ['lipsync'],
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
    })).toEqual([
      { key: 'trace-id', label: '决策轨迹', value: 'mind:trace:thin-lipsync-1' },
      { key: 'trace-thread', label: '活跃线程', value: 'runtime-thread-thin-lipsync-1' },
      { key: 'trace-turn-mode', label: '回合模式', value: '关怀回合', technicalValue: 'care' },
      { key: 'trace-truth-state', label: '真值状态', value: 'live-grounded（当前事实已贴地）', technicalValue: 'live-grounded' },
      { key: 'trace-repair-state', label: '修复状态', value: '无需修复', technicalValue: 'none' },
      { key: 'trace-surface-policy', label: '表面策略', value: 'procedural-carry（沿既有过程延续表达）', technicalValue: 'procedural-carry' },
      { key: 'trace-closure-state', label: '收口状态', value: 'grounded-recall（基于记忆回收落稳）', technicalValue: 'grounded-recall' },
      { key: 'trace-authority-trust', label: '权威可信性', value: 'VRM 这段 authority 现在主要由口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。' },
    ])
  })

  it('surfaces body-led continuity trust for trace records when body has re-formed on the current segment before face and motion return', () => {
    expect(buildRecentDrivingTraceRecordSummaryEntries({
      decisionTraceId: 'mind:trace:body-led-1',
      activeThreadId: 'runtime-thread-body-led-1',
      turnMode: 'care',
      truthState: 'live-grounded',
      repairState: 'none',
      finalSurfacePolicy: 'procedural-carry',
      closureState: 'grounded-recall',
      suppressionTags: [],
    }, {
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.29 | mouth=0.31 | head=0.18 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-trace-body-led-1',
      authoritySegmentId: 'segment-trace-body-led-1',
      authorityRendererTarget: 'vrm',
      authorityMatchedDrivers: ['body', 'lipsync'],
      bodySegmentMatched: true,
      faceSegmentMatched: false,
      motionSegmentMatched: false,
      lipsyncSegmentMatched: true,
    })).toEqual([
      { key: 'trace-id', label: '决策轨迹', value: 'mind:trace:body-led-1' },
      { key: 'trace-thread', label: '活跃线程', value: 'runtime-thread-body-led-1' },
      { key: 'trace-turn-mode', label: '回合模式', value: '关怀回合', technicalValue: 'care' },
      { key: 'trace-truth-state', label: '真值状态', value: 'live-grounded（当前事实已贴地）', technicalValue: 'live-grounded' },
      { key: 'trace-repair-state', label: '修复状态', value: '无需修复', technicalValue: 'none' },
      { key: 'trace-surface-policy', label: '表面策略', value: 'procedural-carry（沿既有过程延续表达）', technicalValue: 'procedural-carry' },
      { key: 'trace-closure-state', label: '收口状态', value: 'grounded-recall（基于记忆回收落稳）', technicalValue: 'grounded-recall' },
      { key: 'trace-authority-trust', label: '权威可信性', value: 'VRM 这段 authority 现在主要由身体、口型和声音继续托住，同一段 living segment 还在，只是表情和动作暂时没有一起跟上。' },
    ])
  })

  it('keeps repair-before-closeness trust visible for trace records when companionship hints survive in authority context', () => {
    expect(buildRecentDrivingTraceRecordSummaryEntries({
      decisionTraceId: 'mind:trace:repair-line-1',
      activeThreadId: 'runtime-thread-repair-line-1',
      turnMode: 'care',
      truthState: 'live-grounded',
      repairState: 'none',
      finalSurfacePolicy: 'procedural-carry',
      closureState: 'grounded-recall',
      suppressionTags: [],
    }, {
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.24 | mouth=0.20 | head=0.18 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-trace-repair-line-1',
      authoritySegmentId: 'segment-trace-repair-line-1',
      authorityRendererTarget: 'vrm',
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
      faceSegmentMatched: true,
      motionSegmentMatched: true,
      lipsyncSegmentMatched: true,
    })).toEqual([
      { key: 'trace-id', label: '决策轨迹', value: 'mind:trace:repair-line-1' },
      { key: 'trace-thread', label: '活跃线程', value: 'runtime-thread-repair-line-1' },
      { key: 'trace-turn-mode', label: '回合模式', value: '关怀回合', technicalValue: 'care' },
      { key: 'trace-truth-state', label: '真值状态', value: 'live-grounded（当前事实已贴地）', technicalValue: 'live-grounded' },
      { key: 'trace-repair-state', label: '修复状态', value: '无需修复', technicalValue: 'none' },
      { key: 'trace-surface-policy', label: '表面策略', value: 'procedural-carry（沿既有过程延续表达）', technicalValue: 'procedural-carry' },
      { key: 'trace-closure-state', label: '收口状态', value: 'grounded-recall（基于记忆回收落稳）', technicalValue: 'grounded-recall' },
      { key: 'trace-authority-trust', label: '权威可信性', value: 'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。' },
    ])
  })

  it('forwards playback cue authority context into trace summaries when runtime overview trust is still empty', () => {
    expect(buildRecentDrivingTraceRecordSummaryEntriesFromDiagnostics({
      speechEmbodiment: {
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:trace:repair-line-assembly-1',
          activeThreadId: 'runtime-thread-repair-line-assembly-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
      } as any,
      runtimeAuthorityOverview: {
        authorityTrustSummary: null,
      } as any,
      playbackCueAuthorityView: {
        authorityTrustSummary: null,
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.24 | mouth=0.20 | head=0.18 | visemePeak=0.74 | provenance=authority-bound | source=prosody-authority | segment=segment-trace-repair-assembly-1',
        authoritySegmentId: 'segment-trace-repair-assembly-1',
        authorityRendererTarget: 'vrm',
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
      } as any,
    })).toEqual([
      { key: 'trace-id', label: '决策轨迹', value: 'mind:trace:repair-line-assembly-1' },
      { key: 'trace-thread', label: '活跃线程', value: 'runtime-thread-repair-line-assembly-1' },
      { key: 'trace-turn-mode', label: '回合模式', value: '关怀回合', technicalValue: 'care' },
      { key: 'trace-truth-state', label: '真值状态', value: 'live-grounded（当前事实已贴地）', technicalValue: 'live-grounded' },
      { key: 'trace-repair-state', label: '修复状态', value: '无需修复', technicalValue: 'none' },
      { key: 'trace-surface-policy', label: '表面策略', value: 'procedural-carry（沿既有过程延续表达）', technicalValue: 'procedural-carry' },
      { key: 'trace-closure-state', label: '收口状态', value: 'grounded-recall（基于记忆回收落稳）', technicalValue: 'grounded-recall' },
      { key: 'trace-authority-trust', label: '权威可信性', value: 'VRM 这段 authority 仍停在 repair-before-closeness 的修补线里，先守住 quieter blink / softened gaze，再判断是否继续向外靠近。' },
    ])
  })

  it('keeps thin affective settle authority visible in trace summaries when playback cue authority already carries the room-making line', () => {
    expect(buildRecentDrivingTraceRecordSummaryEntriesFromDiagnostics({
      speechEmbodiment: {
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:trace:thin-affective-trace-1',
          activeThreadId: 'runtime-thread-thin-affective-trace-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
      } as any,
      runtimeAuthorityOverview: {
        authorityTrustSummary: null,
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-thin-affective-trace-1',
        authorityTrustSummary: null,
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-thin-affective-trace-1',
        settleAuthoritySummary: 'authority-bound | segment=segment-thin-affective-trace-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
        authoritySegmentId: 'segment-thin-affective-trace-1',
        authorityRendererTarget: 'vrm',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
      } as any,
    }).some(entry => entry.key === 'trace-authority-trust' && entry.value.includes('余韵还在'))).toBe(true)
  })

  it('prefers richer settle-reason trust over thinner generic runtime trust in trace summaries', () => {
    const entries = buildRecentDrivingTraceRecordSummaryEntriesFromDiagnostics({
      speechEmbodiment: {
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:trace:thin-affective-trace-runtime-override-1',
          activeThreadId: 'runtime-thread-thin-affective-trace-runtime-override-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
      } as any,
      runtimeAuthorityOverview: {
        authorityTrustSummary: 'VRM 表情、动作、口型已经一起回到当前片段主链，可按同一身体线继续观察。',
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-thin-affective-trace-runtime-override-1',
        authorityTrustSummary: null,
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-thin-affective-trace-runtime-override-1',
        settleAuthoritySummary: 'authority-bound | segment=segment-thin-affective-trace-runtime-override-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection | reason=余韵还在，先留白，别立刻把温度放大',
        authoritySegmentId: 'segment-thin-affective-trace-runtime-override-1',
        authorityRendererTarget: 'vrm',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
      } as any,
    })

    expect(entries.find(entry => entry.key === 'trace-authority-trust')?.value).toContain('余韵还在，先留白，别立刻把温度放大')
  })

  it('keeps same-turn-if-invited measured-return callback-line trust visible in trace timeline authority summaries', () => {
    const entries = buildRecentDrivingTraceRecordSummaryEntriesFromDiagnostics({
      speechEmbodiment: {
        recentDrivingTraceRecord: {
          decisionTraceId: 'mind:trace:invited-callback-1',
          activeThreadId: 'runtime-thread-invited-callback-1',
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          finalSurfacePolicy: 'procedural-carry',
          closureState: 'grounded-recall',
          suppressionTags: [],
        },
      } as any,
      runtimeAuthorityOverview: {
        authorityTrustSummary: null,
      } as any,
      playbackCueAuthorityView: {
        cueId: 'segment-invited-trace-summary-1',
        authorityTrustSummary: 'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。',
        prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.22 | mouth=0.20 | head=0.18 | visemePeak=0.70 | provenance=authority-bound | source=prosody-authority | segment=segment-invited-trace-summary-1',
        settleAuthoritySummary: 'authority-bound | segment=segment-invited-trace-summary-1 | target=vrm | drivers=face, motion, lipsync | sources=prosody-authority, timeline-projection',
        authoritySegmentId: 'segment-invited-trace-summary-1',
        authorityRendererTarget: 'vrm',
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        authorityMatchedDrivers: ['face', 'motion', 'lipsync'],
        faceSegmentMatched: true,
        motionSegmentMatched: true,
        lipsyncSegmentMatched: true,
      } as any,
    })

    expect(entries.find(entry => entry.key === 'trace-authority-trust')).toEqual({
      key: 'trace-authority-trust',
      label: '权威可信性',
      value: 'VRM 这段 authority 仍停在 measured-return 的回身线里，这次只是 same-turn-if-invited 的轻声接回，不是重新打开一段新的靠近。',
    })
  })

  it('builds compact timeline entries for trace events and detail blocks', () => {
    expect(buildRecentDrivingTraceEventEntries([
      {
        kind: 'governance-normalized',
        summary: 'turn=care | truth=live-grounded | repair=none',
        createdAt: 2430,
      },
      {
        kind: 'person-state-updated',
        summary: 'protective-watch settled after fatigue pressure rose',
        createdAt: 2468,
      },
    ])).toEqual([
      { heading: 'governance-normalized @ 2430', body: 'turn=care | truth=live-grounded | repair=none' },
      { heading: 'person-state-updated @ 2468', body: 'protective-watch settled after fatigue pressure rose' },
    ])

    expect(buildRecentDrivingTraceDetailEntries([
      {
        kind: 'presence-pulse-dispatched',
        summary: 'protective-watch settled after fatigue pressure rose',
        createdAt: 2468,
        details: [
          { label: 'scenario', value: 'late-night-fatigue' },
          { label: 'stance', value: 'observe-first' },
        ],
      },
      {
        kind: 'person-state-updated',
        summary: 'source trail applied',
        createdAt: 2469,
        details: [
          { label: 'sourceTrail', value: 'fatigue, care, grounded-recall' },
        ],
      },
    ])).toEqual([
      {
        heading: 'presence-pulse-dispatched @ 2468',
        body: 'protective-watch settled after fatigue pressure rose',
        details: ['scenario: late-night-fatigue', 'stance: observe-first'],
      },
      {
        heading: 'person-state-updated @ 2469',
        body: 'source trail applied',
        details: ['sourceTrail: fatigue, care, grounded-recall'],
      },
    ])
  })

  it('includes renderer drift cause lines alongside recent driving event summaries', () => {
    expect(buildRecentDrivingEventSummaryEntries({
      kind: 'person-state-updated',
      decisionTraceId: 'mind:rest:1',
      summary: 'protective-watch settled after fatigue pressure rose',
      createdAt: 2468,
    }, {
      live2d: {
        predicted: 'Soft Gaze',
        actual: 'Focus Inspect',
        reason: 'preferred',
        status: 'drifted',
        driftKind: 'alias-resolution-drift',
        faceDriverCue: 'focused',
        faceDriverSource: 'prosody-authority',
        faceDriverSegmentId: 'segment-trace-live2d-1',
        motionDriverCue: 'observe_focus',
        motionDriverSource: 'cue-bridge',
        motionDriverSegmentId: 'segment-trace-live2d-1',
      },
      vrm: {
        predicted: 'calm',
        actual: null,
        reason: 'preferred',
        status: 'predicted-only',
        driftKind: 'resident-not-yet-applied',
        faceDriverCue: null,
        faceDriverSource: null,
        faceDriverSegmentId: null,
        motionDriverCue: null,
        motionDriverSource: null,
        motionDriverSegmentId: null,
      },
    })).toEqual([
      { key: 'event-kind', label: '最近事件类型', value: 'person-state-updated' },
      { key: 'event-trace-id', label: '最近事件轨迹', value: 'mind:rest:1' },
      { key: 'event-summary', label: '最近事件摘要', value: 'protective-watch settled after fatigue pressure rose' },
      { key: 'event-created-at', label: '最近事件时间', value: '2468' },
      { key: 'renderer-live2d-cause', label: 'Live2D 显形归因', value: 'resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge' },
      { key: 'renderer-vrm-cause', label: 'VRM 显形归因', value: 'resident calm is waiting for renderer application' },
    ])
  })

  it('prefers snapshot-native renderer drift summaries in recent driving event entries', () => {
    expect(buildRecentDrivingEventSummaryEntries({
      kind: 'person-state-updated',
      decisionTraceId: 'mind:rest:1',
      summary: 'protective-watch settled after fatigue pressure rose',
      createdAt: 2468,
    }, {
      live2d: {
        predicted: 'Soft Gaze',
        actual: 'Focus Inspect',
        reason: 'preferred',
        status: 'drifted',
        driftKind: 'alias-resolution-drift',
        faceDriverCue: 'focused',
        faceDriverSource: 'prosody-authority',
        faceDriverSegmentId: 'segment-trace-live2d-1',
        motionDriverCue: null,
        motionDriverSource: null,
        motionDriverSegmentId: null,
      },
      vrm: {
        predicted: 'calm',
        actual: null,
        reason: 'preferred',
        status: 'predicted-only',
        driftKind: 'resident-not-yet-applied',
        faceDriverCue: null,
        faceDriverSource: null,
        faceDriverSegmentId: null,
        motionDriverCue: null,
        motionDriverSource: null,
        motionDriverSegmentId: null,
      },
    }, {
      live2d: '上游 Live2D 显形归因',
      vrm: '上游 VRM 显形归因',
      primary: '上游 Live2D 显形归因',
    } as any)).toEqual([
      { key: 'event-kind', label: '最近事件类型', value: 'person-state-updated' },
      { key: 'event-trace-id', label: '最近事件轨迹', value: 'mind:rest:1' },
      { key: 'event-summary', label: '最近事件摘要', value: 'protective-watch settled after fatigue pressure rose' },
      { key: 'event-created-at', label: '最近事件时间', value: '2468' },
      { key: 'renderer-live2d-cause', label: 'Live2D 显形归因', value: '上游 Live2D 显形归因' },
      { key: 'renderer-vrm-cause', label: 'VRM 显形归因', value: '上游 VRM 显形归因' },
    ])
  })
})
