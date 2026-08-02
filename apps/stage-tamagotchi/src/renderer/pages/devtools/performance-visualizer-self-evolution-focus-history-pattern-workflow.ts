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

function formatValues(values: string[]) {
  return values.length > 0 ? values.join(', ') : 'n/a'
}

export function buildSelfEvolutionFocusHistoryPatternWorkflow(input: {
  pattern: SelfEvolutionFocusHistoryPattern
  guidance: SelfEvolutionFocusHistoryPatternGuidance | null
}) {
  if (!input.guidance)
    return null

  const occurrencePairs = input.pattern.occurrences
    .map(item => `${item.previousCapturedAt}->${item.currentCapturedAt}`)

  return {
    headline: `patternKey=${input.pattern.patternKey}; occurrenceCount=${input.pattern.occurrenceCount}`,
    steps: [
      {
        key: 'occurrences',
        title: 'Occurrences',
        detail: `capturedAtPairs=${formatValues(occurrencePairs)}`,
      },
      {
        key: 'evidence',
        title: 'Evidence',
        detail: `evidencePanelIds=${formatValues(input.guidance.recommendedEvidencePanels)}`,
      },
      {
        key: 'trace',
        title: 'Trace',
        detail: `traceSectionIds=${formatValues(input.guidance.recommendedTraceSections)}`,
      },
      {
        key: 'events',
        title: 'Events',
        detail: `eventKinds=${formatValues(input.guidance.recommendedEventKinds)}`,
      },
    ],
    validationChecklist: [
      `diagnosticLayer=${input.guidance.governanceLayer}`,
      `repairOwner=${input.guidance.repairOwnerHint}`,
      `focusCardTransition=${input.pattern.focusCardTransition}`,
      `traceEventTransition=${input.pattern.traceEventTransition}`,
    ],
  }
}
