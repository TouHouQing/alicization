import {
  formatSelfEvolutionEvidencePanelLabel,
  formatSelfEvolutionEventKindLabel,
  formatSelfEvolutionTraceSectionLabel,
} from './performance-visualizer-self-evolution-focus-history-display'

interface SelfEvolutionActiveWorkflowFocus {
  title: string
  summaryLine: string
  repairOwnerHint: string
  prosodyAuthorityHint: string | null
  evidencePanels: Set<string>
  traceSections: Set<string>
  eventKinds: Set<string>
}

export function buildSelfEvolutionRepairSession(input: {
  activeWorkflowFocus: SelfEvolutionActiveWorkflowFocus | null
  viewedEvidencePanels: Set<string>
  viewedTraceSections: Set<string>
  viewedEventKinds: Set<string>
}) {
  if (!input.activeWorkflowFocus)
    return null

  const evidenceChecklist = [...input.activeWorkflowFocus.evidencePanels]
    .sort((left, right) => left.localeCompare(right))
    .map(item => `evidence:${item}`)
  const traceChecklist = [...input.activeWorkflowFocus.traceSections]
    .sort((left, right) => left.localeCompare(right))
    .map(item => `trace:${item}`)
  const eventChecklist = [...input.activeWorkflowFocus.eventKinds]
    .sort((left, right) => left.localeCompare(right))
    .map(item => `event:${item}`)

  const completedChecklist = [
    ...evidenceChecklist.filter(item => input.viewedEvidencePanels.has(item.replace('evidence:', ''))),
    ...traceChecklist.filter(item => input.viewedTraceSections.has(item.replace('trace:', ''))),
    ...eventChecklist.filter(item => input.viewedEventKinds.has(item.replace('event:', ''))),
  ]

  const remainingEvidence = evidenceChecklist.filter(item => !completedChecklist.includes(item))
  const remainingTrace = traceChecklist.filter(item => !completedChecklist.includes(item))
  const remainingEvents = eventChecklist.filter(item => !completedChecklist.includes(item))
  const remainingChecklist = [
    ...remainingEvidence,
    ...remainingTrace,
    ...remainingEvents,
  ]

  const totalCount = evidenceChecklist.length + traceChecklist.length + eventChecklist.length
  const completedCount = completedChecklist.length
  const completionPercent = totalCount === 0
    ? 100
    : Math.round((completedCount / totalCount) * 100)

  const summaryLines = [
    `已完成 ${totalCount} 项中的 ${completedCount} 项修复检查，当前归属为${input.activeWorkflowFocus.repairOwnerHint}。`,
  ]

  if (input.activeWorkflowFocus.prosodyAuthorityHint)
    summaryLines.push(`韵律权威：${input.activeWorkflowFocus.prosodyAuthorityHint}`)

  if (remainingEvidence.length > 0)
    summaryLines.push(`剩余证据：${remainingEvidence.map(item => formatSelfEvolutionEvidencePanelLabel(item.replace('evidence:', ''))).join('，')}`)
  if (remainingTrace.length > 0)
    summaryLines.push(`剩余轨迹：${remainingTrace.map(item => formatSelfEvolutionTraceSectionLabel(item.replace('trace:', ''))).join('，')}`)
  if (remainingEvents.length > 0)
    summaryLines.push(`剩余事件：${remainingEvents.map(item => formatSelfEvolutionEventKindLabel(item.replace('event:', ''))).join('，')}`)
  if (remainingChecklist.length === 0)
    summaryLines.push('该反复漂移工作流的修复检查已全部覆盖。')

  return {
    completionPercent,
    completedCount,
    totalCount,
    completedChecklist,
    remainingChecklist,
    summaryLines,
  }
}
