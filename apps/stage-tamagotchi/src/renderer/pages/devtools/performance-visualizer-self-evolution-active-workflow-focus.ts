interface SelfEvolutionFocusHistoryPatternContext {
  currentCapturedAt: number
  previousCapturedAt: number
  side: 'current' | 'previous'
  summaryLine: string
}

interface SelfEvolutionFocusHistoryPatternGuidance {
  governanceLayer: string
  governanceLayerDisplay: string
  repairOwnerHint: string
  prosodyAuthorityHint: string | null
  recommendedEvidencePanels: string[]
  recommendedTraceSections: string[]
  recommendedEventKinds: string[]
  summaryLine: string
}

export function buildSelfEvolutionActiveWorkflowFocus(input: {
  activePatternKey: string | null
  patternContextByKey: Record<string, SelfEvolutionFocusHistoryPatternContext>
  patternGuidanceByKey: Record<string, SelfEvolutionFocusHistoryPatternGuidance>
}) {
  if (!input.activePatternKey)
    return null

  const context = input.patternContextByKey[input.activePatternKey]
  const guidance = input.patternGuidanceByKey[input.activePatternKey]

  if (!context || !guidance)
    return null

  return {
    title: `当前工作流焦点：${guidance.governanceLayerDisplay}`,
    summaryLine: `正在修复该反复漂移模式的${context.side === 'current' ? '当前侧' : '前一侧'}。`,
    repairOwnerHint: guidance.repairOwnerHint,
    prosodyAuthorityHint: guidance.prosodyAuthorityHint,
    evidencePanels: new Set(guidance.recommendedEvidencePanels),
    traceSections: new Set(guidance.recommendedTraceSections),
    eventKinds: new Set(guidance.recommendedEventKinds),
  }
}
