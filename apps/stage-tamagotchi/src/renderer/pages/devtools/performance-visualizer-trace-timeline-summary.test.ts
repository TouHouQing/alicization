import { describe, expect, it } from 'vitest'

import {
  buildRecentDrivingEventSummaryEntries,
  buildRecentDrivingTraceDetailEntries,
  buildRecentDrivingTraceEventEntries,
  buildRecentDrivingTraceRecordSummaryEntries,
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
        driverCue: 'focused',
        driverSource: 'prosody-authority',
      },
      vrm: {
        predicted: 'calm',
        actual: null,
        reason: 'preferred',
        status: 'predicted-only',
        driftKind: 'resident-not-yet-applied',
        driverCue: null,
        driverSource: null,
      },
    })).toEqual([
      { key: 'event-kind', label: '最近事件类型', value: 'person-state-updated' },
      { key: 'event-trace-id', label: '最近事件轨迹', value: 'mind:rest:1' },
      { key: 'event-summary', label: '最近事件摘要', value: 'protective-watch settled after fatigue pressure rose' },
      { key: 'event-created-at', label: '最近事件时间', value: '2468' },
      { key: 'renderer-live2d-cause', label: 'Live2D 显形归因', value: 'resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority' },
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
        driverCue: 'focused',
        driverSource: 'prosody-authority',
      },
      vrm: {
        predicted: 'calm',
        actual: null,
        reason: 'preferred',
        status: 'predicted-only',
        driftKind: 'resident-not-yet-applied',
        driverCue: null,
        driverSource: null,
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
