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
    claimAccuracy: number | null
    replyAuthorityAccuracy: number | null
    latencyBudgetPass: boolean | null
    mindParticipation: number | null
    memoryParticipation: number | null
    personalityParticipation: number | null
    relationshipParticipation: number | null
    continuityParticipation: number | null
    misinternalizationRate: number | null
    sampleCount: number | null
    minimumSampleCount: number
  }
}

function readNumber(value: unknown) {
  return Number.isFinite(value)
    ? Number(value)
    : null
}

function readBoolean(value: unknown) {
  return typeof value === 'boolean'
    ? value
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
    memoryClosureCoverage?: unknown
    memoryClosureConflictClosureRate?: unknown
    memoryClosureLowQualityWithholdRate?: unknown
    memoryClosureUncertaintyLabelRate?: unknown
    claimAccuracy?: unknown
    replyAuthorityAccuracy?: unknown
    latencyBudgetPass?: unknown
    mindParticipation?: unknown
    memoryParticipation?: unknown
    personalityParticipation?: unknown
    relationshipParticipation?: unknown
    continuityParticipation?: unknown
    misinternalizationRate?: unknown
    sampleCount?: unknown
  } | null
  authorityLeakCount?: unknown
  localHumanlikeVisibleFallbackCount?: unknown
  sampleCount?: unknown
  minimumSampleCount?: number
}): AlicizationFinalReplayGateReport {
  const minimumSampleCount = Math.max(1, Math.floor(input.minimumSampleCount ?? 1))
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
    claimAccuracy: readNumber(input.retrievalHealth?.claimAccuracy),
    replyAuthorityAccuracy: readNumber(input.retrievalHealth?.replyAuthorityAccuracy),
    latencyBudgetPass: readBoolean(input.retrievalHealth?.latencyBudgetPass),
    mindParticipation: readNumber(input.retrievalHealth?.mindParticipation),
    memoryParticipation: readNumber(input.retrievalHealth?.memoryParticipation),
    personalityParticipation: readNumber(input.retrievalHealth?.personalityParticipation),
    relationshipParticipation: readNumber(input.retrievalHealth?.relationshipParticipation),
    continuityParticipation: readNumber(input.retrievalHealth?.continuityParticipation),
    misinternalizationRate: readNumber(input.retrievalHealth?.misinternalizationRate),
    sampleCount: readNumber(input.sampleCount ?? input.retrievalHealth?.sampleCount),
    minimumSampleCount,
  }

  const failingKeys = [
    metrics.sampleCount === null || metrics.sampleCount < metrics.minimumSampleCount ? 'minimum-sample-count' : null,
    metrics.recallAt3 !== null && metrics.recallAt3 < 0.9 ? 'recall-at-3' : null,
    metrics.precisionAt3 !== null && metrics.precisionAt3 < 0.86 ? 'precision-at-3' : null,
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
    metrics.claimAccuracy !== null && metrics.claimAccuracy < 0.96 ? 'claim-accuracy' : null,
    metrics.replyAuthorityAccuracy !== null && metrics.replyAuthorityAccuracy < 1 ? 'reply-authority-accuracy' : null,
    metrics.latencyBudgetPass === false ? 'latency-budget' : null,
    metrics.mindParticipation !== null && metrics.mindParticipation < 0.82 ? 'mind-participation' : null,
    metrics.memoryParticipation !== null && metrics.memoryParticipation < 0.72 ? 'memory-participation' : null,
    metrics.personalityParticipation !== null && metrics.personalityParticipation < 0.65 ? 'personality-participation' : null,
    metrics.relationshipParticipation !== null && metrics.relationshipParticipation < 0.55 ? 'relationship-participation' : null,
    metrics.continuityParticipation !== null && metrics.continuityParticipation < 0.72 ? 'continuity-participation' : null,
    metrics.misinternalizationRate !== null && metrics.misinternalizationRate > 0 ? 'learning-misinternalization' : null,
  ].filter(Boolean) as string[]

  return {
    version: 'final-replay-gate-v1',
    passed: failingKeys.length === 0,
    failingKeys,
    metrics,
  }
}
