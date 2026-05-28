import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRepairSession } from './performance-visualizer-self-evolution-repair-session'

describe('performance visualizer self evolution repair session', () => {
  it('returns null when there is no active workflow focus', () => {
    expect(buildSelfEvolutionRepairSession({
      activeWorkflowFocus: null,
      viewedEvidencePanels: new Set<string>(),
      viewedTraceSections: new Set<string>(),
      viewedEventKinds: new Set<string>(),
    })).toBeNull()
  })

  it('builds a partially completed repair checklist from active workflow targets and viewed progress', () => {
    expect(buildSelfEvolutionRepairSession({
      activeWorkflowFocus: {
        title: '当前工作流焦点：人格/思绪层',
        summaryLine: '正在修复该反复漂移模式的当前侧。',
        repairOwnerHint: '私有思绪治理',
        prosodyAuthorityHint: null,
        evidencePanels: new Set([
          'private-thought-governance-chain',
          'runtime-continuity-projection',
        ]),
        traceSections: new Set([
          'trace-details',
          'selected-trace-event',
        ]),
        eventKinds: new Set([
          'takeover-audit',
          'person-state-updated',
          'governance-normalized',
        ]),
      },
      viewedEvidencePanels: new Set([
        'private-thought-governance-chain',
      ]),
      viewedTraceSections: new Set([
        'trace-details',
      ]),
      viewedEventKinds: new Set([
        'takeover-audit',
      ]),
    })).toEqual({
      completionPercent: 43,
      completedCount: 3,
      totalCount: 7,
      completedChecklist: [
        'evidence:private-thought-governance-chain',
        'trace:trace-details',
        'event:takeover-audit',
      ],
      remainingChecklist: [
        'evidence:runtime-continuity-projection',
        'trace:selected-trace-event',
        'event:governance-normalized',
        'event:person-state-updated',
      ],
      summaryLines: [
        '已完成 7 项中的 3 项修复检查，当前归属为私有思绪治理。',
        '剩余证据：运行时连续性投影',
        '剩余轨迹：选中轨迹事件',
        '剩余事件：治理归位，人格状态更新',
      ],
    })
  })

  it('reports a completed session when every active workflow target has been inspected', () => {
    expect(buildSelfEvolutionRepairSession({
      activeWorkflowFocus: {
        title: '当前工作流焦点：显形权威层',
        summaryLine: '正在修复该反复漂移模式的前一侧。',
        repairOwnerHint: '显形权威',
        prosodyAuthorityHint: '优先核对当前片段的韵律权威链，确认 mouth/head/prosody 权重仍绑定在同一 segment 上。',
        evidencePanels: new Set([
          'renderer-authority-projection',
          'runtime-continuity-projection',
        ]),
        traceSections: new Set([
          'trace-consumption',
          'trace-timeline',
          'selected-trace-event',
        ]),
        eventKinds: new Set([
          'person-state-updated',
          'takeover-audit',
        ]),
      },
      viewedEvidencePanels: new Set([
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ]),
      viewedTraceSections: new Set([
        'trace-consumption',
        'trace-timeline',
        'selected-trace-event',
      ]),
      viewedEventKinds: new Set([
        'person-state-updated',
        'takeover-audit',
      ]),
    })).toEqual({
      completionPercent: 100,
      completedCount: 7,
      totalCount: 7,
      completedChecklist: [
        'evidence:renderer-authority-projection',
        'evidence:runtime-continuity-projection',
        'trace:selected-trace-event',
        'trace:trace-consumption',
        'trace:trace-timeline',
        'event:person-state-updated',
        'event:takeover-audit',
      ],
      remainingChecklist: [],
      summaryLines: [
        '已完成 7 项中的 7 项修复检查，当前归属为显形权威。',
        '韵律权威：优先核对当前片段的韵律权威链，确认 mouth/head/prosody 权重仍绑定在同一 segment 上。',
        '该反复漂移工作流的修复检查已全部覆盖。',
      ],
    })
  })
})
