import {
  formatSelfEvolutionEventKindLabel,
  formatSelfEvolutionEvidencePanelLabel,
  formatSelfEvolutionTraceSectionLabel,
} from './performance-visualizer-self-evolution-focus-history-display'

interface SelfEvolutionFocusHistoryPattern {
  patternKey: string
  occurrenceCount: number
  summaryLine: string
  focusCardTransition: string
  traceEventTransition: string
  evidenceGained: string[]
  evidenceLost: string[]
  traceTargetsGained: string[]
  traceTargetsLost: string[]
  occurrences: Array<{
    currentCapturedAt: number
    previousCapturedAt: number
  }>
}

interface SelfEvolutionFocusHistoryPatternGuidance {
  governanceLayer: string
  governanceLayerDisplay: string
  repairOwnerHint: string
  recommendedEvidencePanels: string[]
  recommendedTraceSections: string[]
  recommendedEventKinds: string[]
  summaryLine: string
}

export function buildSelfEvolutionFocusHistoryPatternWorkflow(input: {
  pattern: SelfEvolutionFocusHistoryPattern
  guidance: SelfEvolutionFocusHistoryPatternGuidance | null
}) {
  if (!input.guidance)
    return null

  const evidenceList = input.guidance.recommendedEvidencePanels.map(formatSelfEvolutionEvidencePanelLabel).join('、')
  const traceList = input.guidance.recommendedTraceSections.map(formatSelfEvolutionTraceSectionLabel).join('、')
  const eventList = input.guidance.recommendedEventKinds.map(formatSelfEvolutionEventKindLabel).join('、')
  const governanceAnchor = input.guidance.governanceLayer
  const governanceAnchorDisplay = input.guidance.governanceLayerDisplay
  const repeatedTransitions = input.pattern.occurrenceCount
  const sharedTailChecklist = '新的快照不再重演同一聚焦卡片以及证据/轨迹转移。'

  const governanceStepDetail = governanceAnchor === 'persona-thought'
    ? '先把私有思绪治理当作第一修复归属，而不是从显形症状倒推。'
    : governanceAnchor === 'same-her-continuity'
      ? '先把 same-her 连续性治理当作第一解释归属，避免把记忆先行的熟悉感误判成应该立刻显形的漂移。'
      : '先把显形权威当作第一修复归属，不要过早把问题扩散到人格层。'

  const firstChecklistLine = governanceAnchor === 'persona-thought'
    ? '修复解释仍然锚定在人格/思绪证据上，而不是只剩显形侧后果。'
    : governanceAnchor === 'same-her-continuity'
      ? '连续性解释仍然锚定在 remembered familiarity / same-her room / bounded-growth 上，而不是滑回一般性漂移修复。'
      : '显形侧证据仍与修复后的权威路径对齐，而不会在下一次转移里重新漂回去。'

  const secondChecklistLine = governanceAnchor === 'persona-thought'
    ? '轨迹事件能够解释漂移，同时不破坏活动线程连续性和候选项可追踪性。'
    : governanceAnchor === 'same-her-continuity'
      ? '接管审计与治理归位仍能解释这次连续性治理，同时不破坏活动线程连续性和候选项可追踪性。'
      : '时间线与消费轨迹仍然指向同一条连续的生命线程。'

  const eventAuditDetail = governanceAnchor === 'same-her-continuity'
    ? `优先检查 ${eventList}，找到这次反复治理背后最早的连续性锚点。`
    : `优先检查 ${eventList}，找到这次反复漂移背后最早的连续性断点。`

  const validateDetail = governanceAnchor === 'same-her-continuity'
    ? '改动后抓取新的聚焦快照，确认熟悉感仍以记忆先行的方式被治理，而不是被误推进成更近的可见靠近。'
    : '改动后抓取新的聚焦快照，确认同一模式不再在下一次转移中重复。'

  return {
    headline: `${repeatedTransitions} 次反复转移共享同一${governanceAnchorDisplay.replace(/层$/, '')}漂移特征。`,
    steps: [
      {
        key: 'restore-compare',
        title: '还原一组已记录转移',
        detail: '在修改策略前，先利用历史还原与前后对比，把这次反复漂移重新放回同一生命线程里复现。',
      },
      {
        key: 'governance-anchor',
        title: `把修复锚定在${governanceAnchorDisplay}`,
        detail: governanceStepDetail,
      },
      {
        key: 'evidence-trace',
        title: '先看证据，再看症状',
        detail: `先打开 ${evidenceList}，再顺着 ${traceList} 往下追。`,
      },
      {
        key: 'event-audit',
        title: '审计最早解释漂移的事件',
        detail: eventAuditDetail,
      },
      {
        key: 'validate',
        title: '修复后验证 same-her 连续性',
        detail: validateDetail,
      },
    ],
    validationChecklist: [
      firstChecklistLine,
      secondChecklistLine,
      governanceAnchor === 'same-her-continuity'
        ? '新的快照不再把同一治理态误标成需要修复的漂移模式。'
        : sharedTailChecklist,
    ],
  }
}
