import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionRepairNextAction } from './performance-visualizer-self-evolution-repair-next-action'

describe('performance visualizer self evolution repair next action', () => {
  it('returns null when there is no active repair session or closure verdict', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: null,
      repairClosure: null,
    })).toBeNull()
  })

  it('recommends the first remaining evidence target before trace/event follow-up when the closure is still open', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 43,
        completedCount: 3,
        totalCount: 7,
        completedChecklist: [],
        remainingChecklist: [
          'evidence:runtime-continuity-projection',
          'trace:selected-trace-event',
          'event:governance-normalized',
        ],
        summaryLines: [
          '韵律权威：优先核对当前片段的韵律权威链，确认 mouth/head/prosody 权重仍绑定在同一 segment 上。',
        ],
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [
          'repair context is restored to the target current side.',
          'repair checklist is still incomplete (3/7).',
          'capture a fresh snapshot after the repair to validate drift reduction.',
          'the same recurring drift pattern is still present in recent history.',
        ],
      },
    })).toEqual({
      kind: 'inspect-evidence',
      label: '检查 运行时连续性投影',
      detail: '修复闭环仍然打开。先补上下一项缺失证据；同时优先核对当前片段的韵律权威链，确认 mouth/head/prosody 权重仍绑定在同一 segment 上。再继续推进到轨迹/事件验证。',
      targetType: 'evidence',
      targetId: 'runtime-continuity-projection',
    })
  })

  it('recommends capturing a validation snapshot once the checklist is covered but closure is still open', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 100,
        completedCount: 7,
        totalCount: 7,
        completedChecklist: [],
        remainingChecklist: [],
        summaryLines: [],
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [
          'repair context is restored to the target previous side.',
          'repair checklist is fully covered.',
          'capture a fresh snapshot after the repair to validate drift reduction.',
          'the same recurring drift pattern is still present in recent history.',
        ],
      },
    })).toEqual({
      kind: 'capture-snapshot',
      label: '抓取验证快照',
      detail: '修复检查已经覆盖完成，但闭环仍未关闭，直到新的快照验证更新后的漂移状态。',
      targetType: 'snapshot',
      targetId: 'validation',
    })
  })

  it('recommends capturing a new baseline when the repair loop is already closed', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 100,
        completedCount: 7,
        totalCount: 7,
        completedChecklist: [],
        remainingChecklist: [],
        summaryLines: [],
      },
      repairClosure: {
        isClosed: true,
        summaryLines: [
          'repair context is restored to the target previous side.',
          'repair checklist is fully covered.',
          'a fresh validation snapshot exists after the repaired drift context.',
          'the repaired recurring drift pattern no longer appears in recent history.',
        ],
      },
    })).toEqual({
      kind: 'capture-baseline',
      label: '抓取新的基线快照',
      detail: '这次修复闭环已经关闭。请抓取新的基线快照，让下一次反复漂移会话从修复后的连续性状态重新开始。',
      targetType: 'snapshot',
      targetId: 'baseline',
    })
  })

  it('returns a trace target when the next uncovered step is a trace section', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 71,
        completedCount: 5,
        totalCount: 7,
        completedChecklist: [],
        remainingChecklist: [
          'trace:selected-trace-event',
          'event:governance-normalized',
        ],
        summaryLines: [],
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-trace',
      label: '检查 选中轨迹事件',
      detail: '修复闭环仍然打开。先补上下一段缺失轨迹，再继续推进到验证快照。',
      targetType: 'trace',
      targetId: 'selected-trace-event',
    })
  })

  it('returns an event target when the next uncovered step is an event audit', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 86,
        completedCount: 6,
        totalCount: 7,
        completedChecklist: [],
        remainingChecklist: [
          'event:governance-normalized',
        ],
        summaryLines: [],
      },
      repairClosure: {
        isClosed: false,
        summaryLines: [],
      },
    })).toEqual({
      kind: 'inspect-event',
      label: '检查 治理归位',
      detail: '修复闭环仍然打开。先补上下一项缺失事件审计，再继续推进到验证快照。',
      targetType: 'event',
      targetId: 'governance-normalized',
    })
  })

  it('recommends capturing a continuity baseline when same-her governance has been re-confirmed, instead of framing the next step as drift repair', () => {
    expect(buildSelfEvolutionRepairNextAction({
      repairSession: {
        completionPercent: 100,
        completedCount: 7,
        totalCount: 7,
        completedChecklist: [],
        remainingChecklist: [],
        summaryLines: [
          '已完成 7 项中的 7 项修复检查，当前归属为连续性治理。',
        ],
      },
      repairClosure: {
        isClosed: true,
        summaryLines: [
          '修复上下文已还原到目标当前侧。',
          '修复检查已全部覆盖。',
          '修复后已经存在新的验证快照。',
          '已修复的反复漂移模式不再出现在最近历史中。',
          'same-her 连续性治理已经被新的验证快照再次确认，可进入基线判断。',
        ],
      },
    })).toEqual({
      kind: 'capture-baseline',
      label: '抓取新的基线快照',
      detail: 'same-her 连续性治理已经再次得到验证。请抓取新的基线快照，让下一次连续性会话从这次确认后的同一个她状态重新开始。',
      targetType: 'snapshot',
      targetId: 'baseline',
    })
  })
})
