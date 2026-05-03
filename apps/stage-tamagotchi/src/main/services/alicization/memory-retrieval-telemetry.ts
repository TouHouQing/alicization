export interface AlicizationMemoryRetrievalTelemetrySnapshot {
  semanticLatencyMs: number | null
  semanticSampleCount: number
  graphLatencyMs: number | null
  graphSampleCount: number
  candidateGenerationLatencyMs: number | null
  candidateGenerationSampleCount: number
  plannerLatencyMs: number | null
  plannerSampleCount: number
  speechPlanLatencyMs: number | null
  speechPlanSampleCount: number
  cacheHitCount: number
  cacheMissCount: number
  prewarmHitCount: number
  prewarmMissCount: number
  budgetClassCounts: Partial<Record<'realtime-reply' | 'deep-recall-reply' | 'proactive-generation' | 'nightly-benchmark' | 'diagnosis-replay', number>>
  hotKeyStats: Array<{
    key: string
    candidateCount: number
    hitCount: number
    winCount: number
    missCount: number
  }>
  recallHitRate: number
  recallMissRate: number
  wrongThreadRate: number
  reconstructionErrorRate: number
  stableCoreOnlyRate: number
  memorySurfaceViolationRate: number
  templateLeakageFailCount: number
  mindParticipation: number
  memoryParticipation: number
  personalityParticipation: number
  relationshipParticipation: number
  continuityParticipation: number
  lastUpdatedAt: number | null
}

export interface AlicizationMemoryRetrievalHealthOverride {
  semanticLatencyMs: number | null
  graphLatencyMs: number | null
  candidateGenerationLatencyMs?: number | null
  plannerLatencyMs?: number | null
  speechPlanLatencyMs?: number | null
  cacheHitRatio?: number
  prewarmHitRatio?: number
  budgetClassCounts?: Partial<Record<'realtime-reply' | 'deep-recall-reply' | 'proactive-generation' | 'nightly-benchmark' | 'diagnosis-replay', number>>
  hotKeyStats?: Array<{
    key: string
    candidateCount: number
    hitCount: number
    winCount: number
    missCount: number
  }>
  recallHitRate?: number
  recallMissRate?: number
  wrongThreadRate?: number
  reconstructionErrorRate?: number
  stableCoreOnlyRate?: number
  memorySurfaceViolationRate?: number
  templateLeakageFailCount: number
  mindParticipation?: number
  memoryParticipation?: number
  personalityParticipation?: number
  relationshipParticipation?: number
  continuityParticipation?: number
}

export type AlicizationMemoryRetrievalBudgetClass
  = 'realtime-reply'
    | 'deep-recall-reply'
    | 'proactive-generation'
    | 'nightly-benchmark'
    | 'diagnosis-replay'

interface CreateAlicizationMemoryRetrievalTelemetryRuntimeOptions {
  now: () => number
  key: string
  getMetaValue: (key: string) => Promise<string | undefined>
  upsertMeta: (key: string, value: string) => Promise<void>
  enqueueWrite: <T>(task: () => Promise<T>) => Promise<T>
}

export function defaultAlicizationMemoryRetrievalTelemetry(): AlicizationMemoryRetrievalTelemetrySnapshot {
  return {
    semanticLatencyMs: null,
    semanticSampleCount: 0,
    graphLatencyMs: null,
    graphSampleCount: 0,
    candidateGenerationLatencyMs: null,
    candidateGenerationSampleCount: 0,
    plannerLatencyMs: null,
    plannerSampleCount: 0,
    speechPlanLatencyMs: null,
    speechPlanSampleCount: 0,
    cacheHitCount: 0,
    cacheMissCount: 0,
    prewarmHitCount: 0,
    prewarmMissCount: 0,
    budgetClassCounts: {},
    hotKeyStats: [],
    recallHitRate: 0,
    recallMissRate: 0,
    wrongThreadRate: 0,
    reconstructionErrorRate: 0,
    stableCoreOnlyRate: 0,
    memorySurfaceViolationRate: 0,
    templateLeakageFailCount: 0,
    mindParticipation: 0,
    memoryParticipation: 0,
    personalityParticipation: 0,
    relationshipParticipation: 0,
    continuityParticipation: 0,
    lastUpdatedAt: null,
  }
}

export function normalizeAlicizationMemoryRetrievalTelemetry(raw: unknown): AlicizationMemoryRetrievalTelemetrySnapshot {
  const candidate = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}
  const semanticLatencyMs = Number(candidate.semanticLatencyMs)
  const semanticSampleCount = Number(candidate.semanticSampleCount)
  const graphLatencyMs = Number(candidate.graphLatencyMs)
  const graphSampleCount = Number(candidate.graphSampleCount)
  const candidateGenerationLatencyMs = Number(candidate.candidateGenerationLatencyMs)
  const candidateGenerationSampleCount = Number(candidate.candidateGenerationSampleCount)
  const plannerLatencyMs = Number(candidate.plannerLatencyMs)
  const plannerSampleCount = Number(candidate.plannerSampleCount)
  const speechPlanLatencyMs = Number(candidate.speechPlanLatencyMs)
  const speechPlanSampleCount = Number(candidate.speechPlanSampleCount)
  const cacheHitCount = Number(candidate.cacheHitCount)
  const cacheMissCount = Number(candidate.cacheMissCount)
  const prewarmHitCount = Number(candidate.prewarmHitCount)
  const prewarmMissCount = Number(candidate.prewarmMissCount)
  const budgetClassCounts = candidate.budgetClassCounts && typeof candidate.budgetClassCounts === 'object'
    ? candidate.budgetClassCounts as Record<string, unknown>
    : {}
  const hotKeyStats = Array.isArray(candidate.hotKeyStats)
    ? candidate.hotKeyStats
    : []
  const recallHitRate = Number(candidate.recallHitRate)
  const recallMissRate = Number(candidate.recallMissRate)
  const wrongThreadRate = Number(candidate.wrongThreadRate)
  const reconstructionErrorRate = Number(candidate.reconstructionErrorRate)
  const stableCoreOnlyRate = Number(candidate.stableCoreOnlyRate)
  const memorySurfaceViolationRate = Number(candidate.memorySurfaceViolationRate)
  const templateLeakageFailCount = Number(candidate.templateLeakageFailCount)
  const mindParticipation = Number(candidate.mindParticipation)
  const memoryParticipation = Number(candidate.memoryParticipation)
  const personalityParticipation = Number(candidate.personalityParticipation)
  const relationshipParticipation = Number(candidate.relationshipParticipation)
  const continuityParticipation = Number(candidate.continuityParticipation)
  const lastUpdatedAt = Number(candidate.lastUpdatedAt)
  return {
    semanticLatencyMs: Number.isFinite(semanticLatencyMs) ? Math.max(0, semanticLatencyMs) : null,
    semanticSampleCount: Number.isFinite(semanticSampleCount) ? Math.max(0, Math.floor(semanticSampleCount)) : 0,
    graphLatencyMs: Number.isFinite(graphLatencyMs) ? Math.max(0, graphLatencyMs) : null,
    graphSampleCount: Number.isFinite(graphSampleCount) ? Math.max(0, Math.floor(graphSampleCount)) : 0,
    candidateGenerationLatencyMs: Number.isFinite(candidateGenerationLatencyMs) ? Math.max(0, candidateGenerationLatencyMs) : null,
    candidateGenerationSampleCount: Number.isFinite(candidateGenerationSampleCount) ? Math.max(0, Math.floor(candidateGenerationSampleCount)) : 0,
    plannerLatencyMs: Number.isFinite(plannerLatencyMs) ? Math.max(0, plannerLatencyMs) : null,
    plannerSampleCount: Number.isFinite(plannerSampleCount) ? Math.max(0, Math.floor(plannerSampleCount)) : 0,
    speechPlanLatencyMs: Number.isFinite(speechPlanLatencyMs) ? Math.max(0, speechPlanLatencyMs) : null,
    speechPlanSampleCount: Number.isFinite(speechPlanSampleCount) ? Math.max(0, Math.floor(speechPlanSampleCount)) : 0,
    cacheHitCount: Number.isFinite(cacheHitCount) ? Math.max(0, Math.floor(cacheHitCount)) : 0,
    cacheMissCount: Number.isFinite(cacheMissCount) ? Math.max(0, Math.floor(cacheMissCount)) : 0,
    prewarmHitCount: Number.isFinite(prewarmHitCount) ? Math.max(0, Math.floor(prewarmHitCount)) : 0,
    prewarmMissCount: Number.isFinite(prewarmMissCount) ? Math.max(0, Math.floor(prewarmMissCount)) : 0,
    budgetClassCounts: {
      'realtime-reply': Number.isFinite(Number(budgetClassCounts['realtime-reply'])) ? Math.max(0, Math.floor(Number(budgetClassCounts['realtime-reply']))) : 0,
      'deep-recall-reply': Number.isFinite(Number(budgetClassCounts['deep-recall-reply'])) ? Math.max(0, Math.floor(Number(budgetClassCounts['deep-recall-reply']))) : 0,
      'proactive-generation': Number.isFinite(Number(budgetClassCounts['proactive-generation'])) ? Math.max(0, Math.floor(Number(budgetClassCounts['proactive-generation']))) : 0,
      'nightly-benchmark': Number.isFinite(Number(budgetClassCounts['nightly-benchmark'])) ? Math.max(0, Math.floor(Number(budgetClassCounts['nightly-benchmark']))) : 0,
      'diagnosis-replay': Number.isFinite(Number(budgetClassCounts['diagnosis-replay'])) ? Math.max(0, Math.floor(Number(budgetClassCounts['diagnosis-replay']))) : 0,
    },
    hotKeyStats: hotKeyStats
      .map((item) => {
        const candidate = item && typeof item === 'object' ? item as Record<string, unknown> : null
        const key = typeof candidate?.key === 'string' ? candidate.key.trim().slice(0, 160) : ''
        if (!key)
          return null
        return {
          key,
          candidateCount: Number.isFinite(Number(candidate?.candidateCount)) ? Math.max(0, Math.floor(Number(candidate?.candidateCount))) : 0,
          hitCount: Number.isFinite(Number(candidate?.hitCount)) ? Math.max(0, Math.floor(Number(candidate?.hitCount))) : 0,
          winCount: Number.isFinite(Number(candidate?.winCount)) ? Math.max(0, Math.floor(Number(candidate?.winCount))) : 0,
          missCount: Number.isFinite(Number(candidate?.missCount)) ? Math.max(0, Math.floor(Number(candidate?.missCount))) : 0,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 16),
    recallHitRate: Number.isFinite(recallHitRate) ? Math.max(0, Math.min(1, recallHitRate)) : 0,
    recallMissRate: Number.isFinite(recallMissRate) ? Math.max(0, Math.min(1, recallMissRate)) : 0,
    wrongThreadRate: Number.isFinite(wrongThreadRate) ? Math.max(0, Math.min(1, wrongThreadRate)) : 0,
    reconstructionErrorRate: Number.isFinite(reconstructionErrorRate) ? Math.max(0, Math.min(1, reconstructionErrorRate)) : 0,
    stableCoreOnlyRate: Number.isFinite(stableCoreOnlyRate) ? Math.max(0, Math.min(1, stableCoreOnlyRate)) : 0,
    memorySurfaceViolationRate: Number.isFinite(memorySurfaceViolationRate) ? Math.max(0, Math.min(1, memorySurfaceViolationRate)) : 0,
    templateLeakageFailCount: Number.isFinite(templateLeakageFailCount) ? Math.max(0, Math.floor(templateLeakageFailCount)) : 0,
    mindParticipation: Number.isFinite(mindParticipation) ? Math.max(0, Math.min(1, mindParticipation)) : 0,
    memoryParticipation: Number.isFinite(memoryParticipation) ? Math.max(0, Math.min(1, memoryParticipation)) : 0,
    personalityParticipation: Number.isFinite(personalityParticipation) ? Math.max(0, Math.min(1, personalityParticipation)) : 0,
    relationshipParticipation: Number.isFinite(relationshipParticipation) ? Math.max(0, Math.min(1, relationshipParticipation)) : 0,
    continuityParticipation: Number.isFinite(continuityParticipation) ? Math.max(0, Math.min(1, continuityParticipation)) : 0,
    lastUpdatedAt: Number.isFinite(lastUpdatedAt) ? Math.max(0, Math.floor(lastUpdatedAt)) : null,
  }
}

export function blendAlicizationMemoryTelemetryLatency(previous: number | null, previousSamples: number, sample: number) {
  const normalizedSample = Math.max(0, Number(sample) || 0)
  if (!Number.isFinite(previous) || previous == null || previousSamples <= 0)
    return normalizedSample
  const carryWeight = Math.min(9, Math.max(1, previousSamples))
  return (previous * carryWeight + normalizedSample) / (carryWeight + 1)
}

function averageUnit(previous: number, sample: number) {
  return Math.max(0, Math.min(1, Number(((previous + sample) / 2).toFixed(2))))
}

function updateHotKeyStats(input: {
  current: AlicizationMemoryRetrievalTelemetrySnapshot['hotKeyStats']
  key: string
  hit: boolean
  won: boolean
}) {
  const normalizedKey = input.key.trim().slice(0, 160)
  if (!normalizedKey)
    return input.current
  const current = [...input.current]
  const existingIndex = current.findIndex(item => item.key === normalizedKey)
  const base = existingIndex >= 0
    ? current[existingIndex]
    : {
        key: normalizedKey,
        candidateCount: 0,
        hitCount: 0,
        winCount: 0,
        missCount: 0,
      }
  const next = {
    ...base,
    candidateCount: base.candidateCount + 1,
    hitCount: base.hitCount + (input.hit ? 1 : 0),
    winCount: base.winCount + (input.hit && input.won ? 1 : 0),
    missCount: base.missCount + (input.hit ? 0 : 1),
  }
  if (existingIndex >= 0)
    current.splice(existingIndex, 1)
  current.unshift(next)
  return current
    .sort((left, right) => right.candidateCount - left.candidateCount || right.winCount - left.winCount || left.key.localeCompare(right.key))
    .slice(0, 16)
}

export function createAlicizationMemoryRetrievalTelemetryRuntime(
  input: CreateAlicizationMemoryRetrievalTelemetryRuntimeOptions,
) {
  const getTelemetry = async () => {
    const raw = await input.getMetaValue(input.key)
    if (!raw)
      return defaultAlicizationMemoryRetrievalTelemetry()

    try {
      return normalizeAlicizationMemoryRetrievalTelemetry(JSON.parse(raw))
    }
    catch {
      return defaultAlicizationMemoryRetrievalTelemetry()
    }
  }

  const writeTelemetry = async (next: AlicizationMemoryRetrievalTelemetrySnapshot) => {
    await input.upsertMeta(input.key, JSON.stringify(next))
  }

  const recordSemanticLatency = async (latencyMs: number) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        semanticLatencyMs: blendAlicizationMemoryTelemetryLatency(
          telemetry.semanticLatencyMs,
          telemetry.semanticSampleCount,
          latencyMs,
        ),
        semanticSampleCount: telemetry.semanticSampleCount + 1,
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordGraphLatency = async (latencyMs: number) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        graphLatencyMs: blendAlicizationMemoryTelemetryLatency(
          telemetry.graphLatencyMs,
          telemetry.graphSampleCount,
          latencyMs,
        ),
        graphSampleCount: telemetry.graphSampleCount + 1,
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordCandidateGenerationLatency = async (latencyMs: number) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        candidateGenerationLatencyMs: blendAlicizationMemoryTelemetryLatency(
          telemetry.candidateGenerationLatencyMs,
          telemetry.candidateGenerationSampleCount,
          latencyMs,
        ),
        candidateGenerationSampleCount: telemetry.candidateGenerationSampleCount + 1,
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordPlannerLatency = async (latencyMs: number) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        plannerLatencyMs: blendAlicizationMemoryTelemetryLatency(
          telemetry.plannerLatencyMs,
          telemetry.plannerSampleCount,
          latencyMs,
        ),
        plannerSampleCount: telemetry.plannerSampleCount + 1,
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordSpeechPlanLatency = async (latencyMs: number) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        speechPlanLatencyMs: blendAlicizationMemoryTelemetryLatency(
          telemetry.speechPlanLatencyMs,
          telemetry.speechPlanSampleCount,
          latencyMs,
        ),
        speechPlanSampleCount: telemetry.speechPlanSampleCount + 1,
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordCacheAccess = async (hit: boolean) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        cacheHitCount: telemetry.cacheHitCount + (hit ? 1 : 0),
        cacheMissCount: telemetry.cacheMissCount + (hit ? 0 : 1),
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordPrewarmAccess = async (hit: boolean) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        prewarmHitCount: telemetry.prewarmHitCount + (hit ? 1 : 0),
        prewarmMissCount: telemetry.prewarmMissCount + (hit ? 0 : 1),
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordBudgetClass = async (budgetClass: AlicizationMemoryRetrievalBudgetClass) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        budgetClassCounts: {
          ...telemetry.budgetClassCounts,
          [budgetClass]: (telemetry.budgetClassCounts[budgetClass] ?? 0) + 1,
        },
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordHotKeyOutcome = async (inputValue: {
    key: string
    hit: boolean
    won?: boolean
  }) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        hotKeyStats: updateHotKeyStats({
          current: telemetry.hotKeyStats,
          key: inputValue.key,
          hit: inputValue.hit,
          won: inputValue.won !== false,
        }),
        lastUpdatedAt: currentTs,
      })
    })
  }

  const recordParticipation = async (inputValue: {
    mindParticipation: number
    memoryParticipation: number
    personalityParticipation: number
    relationshipParticipation: number
    continuityParticipation: number
  }) => {
    const currentTs = input.now()
    await input.enqueueWrite(async () => {
      const telemetry = await getTelemetry()
      await writeTelemetry({
        ...telemetry,
        mindParticipation: averageUnit(telemetry.mindParticipation, inputValue.mindParticipation),
        memoryParticipation: averageUnit(telemetry.memoryParticipation, inputValue.memoryParticipation),
        personalityParticipation: averageUnit(telemetry.personalityParticipation, inputValue.personalityParticipation),
        relationshipParticipation: averageUnit(telemetry.relationshipParticipation, inputValue.relationshipParticipation),
        continuityParticipation: averageUnit(telemetry.continuityParticipation, inputValue.continuityParticipation),
        lastUpdatedAt: currentTs,
      })
    })
  }

  const applyHealthOverrideInline = async (next: AlicizationMemoryRetrievalHealthOverride) => {
    const telemetry = await getTelemetry()
    await writeTelemetry({
      semanticLatencyMs: Number.isFinite(next.semanticLatencyMs)
        ? Math.max(0, Number(next.semanticLatencyMs))
        : telemetry.semanticLatencyMs,
      semanticSampleCount: telemetry.semanticSampleCount,
      graphLatencyMs: Number.isFinite(next.graphLatencyMs)
        ? Math.max(0, Number(next.graphLatencyMs))
        : telemetry.graphLatencyMs,
      graphSampleCount: telemetry.graphSampleCount,
      candidateGenerationLatencyMs: Number.isFinite(next.candidateGenerationLatencyMs)
        ? Math.max(0, Number(next.candidateGenerationLatencyMs))
        : telemetry.candidateGenerationLatencyMs,
      candidateGenerationSampleCount: telemetry.candidateGenerationSampleCount,
      plannerLatencyMs: Number.isFinite(next.plannerLatencyMs)
        ? Math.max(0, Number(next.plannerLatencyMs))
        : telemetry.plannerLatencyMs,
      plannerSampleCount: telemetry.plannerSampleCount,
      speechPlanLatencyMs: Number.isFinite(next.speechPlanLatencyMs)
        ? Math.max(0, Number(next.speechPlanLatencyMs))
        : telemetry.speechPlanLatencyMs,
      speechPlanSampleCount: telemetry.speechPlanSampleCount,
      cacheHitCount: Number.isFinite(next.cacheHitRatio)
        ? Math.max(0, Math.floor((telemetry.cacheHitCount + telemetry.cacheMissCount) * Math.max(0, Math.min(1, Number(next.cacheHitRatio)))))
        : telemetry.cacheHitCount,
      cacheMissCount: Number.isFinite(next.cacheHitRatio)
        ? Math.max(0, (telemetry.cacheHitCount + telemetry.cacheMissCount) - Math.floor((telemetry.cacheHitCount + telemetry.cacheMissCount) * Math.max(0, Math.min(1, Number(next.cacheHitRatio)))))
        : telemetry.cacheMissCount,
      prewarmHitCount: Number.isFinite(next.prewarmHitRatio)
        ? Math.max(0, Math.floor((telemetry.prewarmHitCount + telemetry.prewarmMissCount) * Math.max(0, Math.min(1, Number(next.prewarmHitRatio)))))
        : telemetry.prewarmHitCount,
      prewarmMissCount: Number.isFinite(next.prewarmHitRatio)
        ? Math.max(0, (telemetry.prewarmHitCount + telemetry.prewarmMissCount) - Math.floor((telemetry.prewarmHitCount + telemetry.prewarmMissCount) * Math.max(0, Math.min(1, Number(next.prewarmHitRatio)))))
        : telemetry.prewarmMissCount,
      recallHitRate: Number.isFinite(next.recallHitRate)
        ? Math.max(0, Math.min(1, Number(next.recallHitRate)))
        : telemetry.recallHitRate,
      recallMissRate: Number.isFinite(next.recallMissRate)
        ? Math.max(0, Math.min(1, Number(next.recallMissRate)))
        : telemetry.recallMissRate,
      wrongThreadRate: Number.isFinite(next.wrongThreadRate)
        ? Math.max(0, Math.min(1, Number(next.wrongThreadRate)))
        : telemetry.wrongThreadRate,
      reconstructionErrorRate: Number.isFinite(next.reconstructionErrorRate)
        ? Math.max(0, Math.min(1, Number(next.reconstructionErrorRate)))
        : telemetry.reconstructionErrorRate,
      stableCoreOnlyRate: Number.isFinite(next.stableCoreOnlyRate)
        ? Math.max(0, Math.min(1, Number(next.stableCoreOnlyRate)))
        : telemetry.stableCoreOnlyRate,
      memorySurfaceViolationRate: Number.isFinite(next.memorySurfaceViolationRate)
        ? Math.max(0, Math.min(1, Number(next.memorySurfaceViolationRate)))
        : telemetry.memorySurfaceViolationRate,
      templateLeakageFailCount: Number.isFinite(next.templateLeakageFailCount)
        ? Math.max(0, Math.floor(Number(next.templateLeakageFailCount)))
        : telemetry.templateLeakageFailCount,
      budgetClassCounts: next.budgetClassCounts
        ? {
            ...telemetry.budgetClassCounts,
            ...next.budgetClassCounts,
          }
        : telemetry.budgetClassCounts,
      hotKeyStats: Array.isArray(next.hotKeyStats) && next.hotKeyStats.length > 0
        ? next.hotKeyStats
        : telemetry.hotKeyStats,
      mindParticipation: Number.isFinite(next.mindParticipation)
        ? Math.max(0, Math.min(1, Number(next.mindParticipation)))
        : telemetry.mindParticipation,
      memoryParticipation: Number.isFinite(next.memoryParticipation)
        ? Math.max(0, Math.min(1, Number(next.memoryParticipation)))
        : telemetry.memoryParticipation,
      personalityParticipation: Number.isFinite(next.personalityParticipation)
        ? Math.max(0, Math.min(1, Number(next.personalityParticipation)))
        : telemetry.personalityParticipation,
      relationshipParticipation: Number.isFinite(next.relationshipParticipation)
        ? Math.max(0, Math.min(1, Number(next.relationshipParticipation)))
        : telemetry.relationshipParticipation,
      continuityParticipation: Number.isFinite(next.continuityParticipation)
        ? Math.max(0, Math.min(1, Number(next.continuityParticipation)))
        : telemetry.continuityParticipation,
      lastUpdatedAt: input.now(),
    })
  }

  const applyHealthOverride = async (next: AlicizationMemoryRetrievalHealthOverride) => {
    await input.enqueueWrite(async () => {
      await applyHealthOverrideInline(next)
    })
  }

  return {
    getTelemetry,
    writeTelemetry,
    recordSemanticLatency,
    recordGraphLatency,
    recordCandidateGenerationLatency,
    recordPlannerLatency,
    recordSpeechPlanLatency,
    recordCacheAccess,
    recordPrewarmAccess,
    recordBudgetClass,
    recordHotKeyOutcome,
    recordParticipation,
    applyHealthOverride,
    applyHealthOverrideInline,
  }
}
