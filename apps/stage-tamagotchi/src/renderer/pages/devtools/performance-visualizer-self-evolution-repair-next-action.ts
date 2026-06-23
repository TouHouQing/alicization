import {
  formatSelfEvolutionEventKindLabel,
  formatSelfEvolutionEvidencePanelLabel,
  formatSelfEvolutionTraceSectionLabel,
} from './performance-visualizer-self-evolution-focus-history-display'

interface SelfEvolutionRepairSession {
  completionPercent: number
  completedCount: number
  totalCount: number
  completedChecklist: string[]
  remainingChecklist: string[]
  summaryLines: string[]
}

interface SelfEvolutionRepairClosure {
  isClosed: boolean
  summaryLines: string[]
}

export function buildSelfEvolutionRepairNextAction(input: {
  repairSession: SelfEvolutionRepairSession | null
  repairClosure: SelfEvolutionRepairClosure | null
}) {
  if (!input.repairSession || !input.repairClosure)
    return null

  if (input.repairClosure.isClosed) {
    const continuityGovernanceConfirmed = input.repairClosure.summaryLines.some(line =>
      line.includes('same-her 连续性治理已经被新的验证快照再次确认'),
    )
    return {
      kind: 'capture-baseline',
      label: '抓取新的基线快照',
      detail: continuityGovernanceConfirmed
        ? 'same-her 连续性治理已经再次得到验证。请抓取新的基线快照，让下一次连续性会话从这次确认后的同一个她状态重新开始。'
        : '这次修复闭环已经关闭。请抓取新的基线快照，让下一次反复漂移会话从修复后的连续性状态重新开始。',
      targetType: 'snapshot',
      targetId: 'baseline',
    }
  }

  if (input.repairSession.remainingChecklist.length === 0) {
    return {
      kind: 'capture-snapshot',
      label: '抓取验证快照',
      detail: '修复检查已经覆盖完成，但闭环仍未关闭，直到新的快照验证更新后的漂移状态。',
      targetType: 'snapshot',
      targetId: 'validation',
    }
  }

  const nextItem = input.repairSession.remainingChecklist[0]
  if (nextItem?.startsWith('evidence:')) {
    const target = nextItem.replace('evidence:', '')
    const prosodyHint = input.repairSession.summaryLines.find(line => line.startsWith('韵律权威：'))
      ?.replace(/^韵律权威：/, '')
      .trim()
    return {
      kind: 'inspect-evidence',
      label: `检查 ${formatSelfEvolutionEvidencePanelLabel(target)}`,
      detail: prosodyHint
        ? `修复闭环仍然打开。先补上下一项缺失证据；同时${prosodyHint.replace(/[。.]$/, '')}。再继续推进到轨迹/事件验证。`
        : '修复闭环仍然打开。先补上下一项缺失证据，再继续推进到轨迹/事件验证。',
      targetType: 'evidence',
      targetId: target,
    }
  }
  if (nextItem?.startsWith('trace:')) {
    const target = nextItem.replace('trace:', '')
    return {
      kind: 'inspect-trace',
      label: `检查 ${formatSelfEvolutionTraceSectionLabel(target)}`,
      detail: '修复闭环仍然打开。先补上下一段缺失轨迹，再继续推进到验证快照。',
      targetType: 'trace',
      targetId: target,
    }
  }
  if (nextItem?.startsWith('event:')) {
    const target = nextItem.replace('event:', '')
    return {
      kind: 'inspect-event',
      label: `检查 ${formatSelfEvolutionEventKindLabel(target)}`,
      detail: '修复闭环仍然打开。先补上下一项缺失事件审计，再继续推进到验证快照。',
      targetType: 'event',
      targetId: target,
    }
  }

  return null
}
