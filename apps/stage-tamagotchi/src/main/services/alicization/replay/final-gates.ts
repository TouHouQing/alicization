export interface AlicizationFinalReplayGateReport {
  version: 'final-replay-gate-v1'
  passed: boolean
  failingKeys: string[]
  metrics: {
    recallAt3: number | null
    precisionAt3: number | null
    wrongThreadRate: number | null
    templateLeakageFailCount: number | null
    authorityLeakCount: number | null
    localHumanlikeVisibleFallbackCount: number | null
    unsupportedSpecificityVisibleFailCount: number | null
    turnOsTraceCoverage: number | null
    learningOutcomeToSelfRevisionRoundtrip: number | null
    memoryClosureCoverage: number | null
    memoryClosureConflictClosureRate: number | null
    memoryClosureLowQualityWithholdRate: number | null
    memoryClosureUncertaintyLabelRate: number | null
  }
}

function readNumber(value: unknown) {
  return Number.isFinite(value)
    ? Number(value)
    : null
}

export function buildAlicizationFinalReplayGateReport(input: {
  retrievalHealth?: {
    recallAt3?: unknown
    precisionAt3?: unknown
    wrongThreadRate?: unknown
    templateLeakageFailCount?: unknown
    unsupportedSpecificityVisibleFailCount?: unknown
    turnOsTraceCoverage?: unknown
    learningOutcomeToSelfRevisionRoundtrip?: unknown
  } | null
  authorityLeakCount?: unknown
  localHumanlikeVisibleFallbackCount?: unknown
}): AlicizationFinalReplayGateReport {
  const metrics = {
    recallAt3: readNumber(input.retrievalHealth?.recallAt3),
    precisionAt3: readNumber(input.retrievalHealth?.precisionAt3),
    wrongThreadRate: readNumber(input.retrievalHealth?.wrongThreadRate),
    templateLeakageFailCount: readNumber(input.retrievalHealth?.templateLeakageFailCount),
    authorityLeakCount: readNumber(input.authorityLeakCount),
    localHumanlikeVisibleFallbackCount: readNumber(input.localHumanlikeVisibleFallbackCount),
    unsupportedSpecificityVisibleFailCount: readNumber(input.retrievalHealth?.unsupportedSpecificityVisibleFailCount),
    turnOsTraceCoverage: readNumber(input.retrievalHealth?.turnOsTraceCoverage),
    learningOutcomeToSelfRevisionRoundtrip: readNumber(input.retrievalHealth?.learningOutcomeToSelfRevisionRoundtrip),
    memoryClosureCoverage: readNumber(input.retrievalHealth?.memoryClosureCoverage),
    memoryClosureConflictClosureRate: readNumber(input.retrievalHealth?.memoryClosureConflictClosureRate),
    memoryClosureLowQualityWithholdRate: readNumber(input.retrievalHealth?.memoryClosureLowQualityWithholdRate),
    memoryClosureUncertaintyLabelRate: readNumber(input.retrievalHealth?.memoryClosureUncertaintyLabelRate),
  }

  const failingKeys = [
    metrics.recallAt3 !== null && metrics.recallAt3 < 0.85 ? 'recall-at-3' : null,
    metrics.precisionAt3 !== null && metrics.precisionAt3 < 0.82 ? 'precision-at-3' : null,
    metrics.wrongThreadRate !== null && metrics.wrongThreadRate > 0 ? 'wrong-thread-rate' : null,
    metrics.templateLeakageFailCount !== null && metrics.templateLeakageFailCount > 0 ? 'template-leakage' : null,
    metrics.authorityLeakCount !== null && metrics.authorityLeakCount > 0 ? 'authority-leak' : null,
    metrics.localHumanlikeVisibleFallbackCount !== null && metrics.localHumanlikeVisibleFallbackCount > 0 ? 'local-humanlike-visible-fallback' : null,
    metrics.unsupportedSpecificityVisibleFailCount !== null && metrics.unsupportedSpecificityVisibleFailCount > 0 ? 'unsupported-specificity-visible' : null,
    metrics.turnOsTraceCoverage !== null && metrics.turnOsTraceCoverage < 1 ? 'turn-os-trace-coverage' : null,
    metrics.learningOutcomeToSelfRevisionRoundtrip !== null && metrics.learningOutcomeToSelfRevisionRoundtrip < 1 ? 'learning-self-revision-roundtrip' : null,
    metrics.memoryClosureCoverage !== null && metrics.memoryClosureCoverage < 1 ? 'memory-closure-coverage' : null,
    metrics.memoryClosureConflictClosureRate !== null && metrics.memoryClosureConflictClosureRate < 1 ? 'memory-closure-conflict' : null,
    metrics.memoryClosureLowQualityWithholdRate !== null && metrics.memoryClosureLowQualityWithholdRate < 1 ? 'memory-closure-low-quality-withhold' : null,
    metrics.memoryClosureUncertaintyLabelRate !== null && metrics.memoryClosureUncertaintyLabelRate < 1 ? 'memory-closure-uncertainty-label' : null,
  ].filter(Boolean) as string[]

  return {
    version: 'final-replay-gate-v1',
    passed: failingKeys.length === 0,
    failingKeys,
    metrics,
  }
}
