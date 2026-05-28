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

export function buildSelfEvolutionFocusHistoryPatternGuidance(
  pattern: SelfEvolutionFocusHistoryPattern,
) {
  const evidence = new Set([...pattern.evidenceGained, ...pattern.evidenceLost])
  const traceTargets = new Set([...pattern.traceTargetsGained, ...pattern.traceTargetsLost])

  const continuityEvidence = (
    evidence.has('candidate-trajectory-summary')
    && evidence.has('proactive-decision-consumption-summary')
    && evidence.has('identity-drift-governance-summary')
  )

  if (continuityEvidence) {
    return {
      governanceLayer: 'same-her-continuity',
      governanceLayerDisplay: '同一个她连续性层',
      repairOwnerHint: '连续性治理',
      prosodyAuthorityHint: null,
      recommendedEvidencePanels: [
        'candidate-trajectory-summary',
        'proactive-decision-consumption-summary',
        'identity-drift-governance-summary',
      ],
      recommendedTraceSections: [
        'trace-consumption',
        'trace-details',
      ],
      recommendedEventKinds: [
        'takeover-audit',
        'governance-normalized',
      ],
      summaryLine: '这更像同一个她的连续性治理反复被确认，而不是漂移修复。先核对熟悉感是否仍停留在记忆层，再确认 same-her room 与 bounded-growth 治理是否保持一致。',
    }
  }

  if (pattern.focusCardTransition === 'repair-path -> repair-owner') {
    return {
      governanceLayer: 'renderer-authority',
      governanceLayerDisplay: '显形权威层',
      repairOwnerHint: '显形权威',
      prosodyAuthorityHint: '优先核对当前片段的韵律权威链，确认 mouth/head/prosody 权重仍绑定在同一 segment 上。',
      recommendedEvidencePanels: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      recommendedTraceSections: [
        'trace-timeline',
        'trace-consumption',
      ],
      recommendedEventKinds: [
        'person-state-updated',
        'takeover-audit',
      ],
      summaryLine: '疑似反复出现的显形权威漂移。先确认显形权威绑定与当前片段的韵律权威链，再核对同一生命线程上的时间线承接。',
    }
  }

  if (pattern.focusCardTransition === 'repair-owner -> repair-path' || evidence.has('private-thought-governance-chain')) {
    return {
      governanceLayer: 'persona-thought',
      governanceLayerDisplay: '人格/思绪层',
      repairOwnerHint: '私有思绪治理',
      prosodyAuthorityHint: null,
      recommendedEvidencePanels: [
        'private-thought-governance-chain',
        'runtime-continuity-projection',
      ],
      recommendedTraceSections: [
        'trace-details',
        'selected-trace-event',
      ],
      recommendedEventKinds: [
        'takeover-audit',
        'person-state-updated',
        'governance-normalized',
      ],
      summaryLine: '疑似反复出现的人格/思绪漂移。先从私有思绪治理入手，再确认连续性承接，再看显形症状。',
    }
  }

  if (evidence.has('renderer-authority-projection') || traceTargets.has('trace-timeline')) {
    return {
      governanceLayer: 'renderer-authority',
      governanceLayerDisplay: '显形权威层',
      repairOwnerHint: '显形权威',
      prosodyAuthorityHint: '优先核对当前片段的韵律权威链，确认 mouth/head/prosody 权重仍绑定在同一 segment 上。',
      recommendedEvidencePanels: [
        'renderer-authority-projection',
        'runtime-continuity-projection',
      ],
      recommendedTraceSections: [
        'trace-timeline',
        'trace-consumption',
      ],
      recommendedEventKinds: [
        'person-state-updated',
        'takeover-audit',
      ],
      summaryLine: '疑似反复出现的显形权威漂移。先确认显形权威绑定与当前片段的韵律权威链，再核对同一生命线程上的时间线承接。',
    }
  }

  return null
}
