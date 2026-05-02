export interface AlicizationMemoryRetrievalTelemetrySnapshot {
  semanticLatencyMs: number | null
  semanticSampleCount: number
  graphLatencyMs: number | null
  graphSampleCount: number
  templateLeakageFailCount: number
  lastUpdatedAt: number | null
}

export interface AlicizationMemoryRetrievalHealthOverride {
  semanticLatencyMs: number | null
  graphLatencyMs: number | null
  templateLeakageFailCount: number
}

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
    templateLeakageFailCount: 0,
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
  const templateLeakageFailCount = Number(candidate.templateLeakageFailCount)
  const lastUpdatedAt = Number(candidate.lastUpdatedAt)
  return {
    semanticLatencyMs: Number.isFinite(semanticLatencyMs) ? Math.max(0, semanticLatencyMs) : null,
    semanticSampleCount: Number.isFinite(semanticSampleCount) ? Math.max(0, Math.floor(semanticSampleCount)) : 0,
    graphLatencyMs: Number.isFinite(graphLatencyMs) ? Math.max(0, graphLatencyMs) : null,
    graphSampleCount: Number.isFinite(graphSampleCount) ? Math.max(0, Math.floor(graphSampleCount)) : 0,
    templateLeakageFailCount: Number.isFinite(templateLeakageFailCount) ? Math.max(0, Math.floor(templateLeakageFailCount)) : 0,
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
      templateLeakageFailCount: Number.isFinite(next.templateLeakageFailCount)
        ? Math.max(0, Math.floor(Number(next.templateLeakageFailCount)))
        : telemetry.templateLeakageFailCount,
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
    applyHealthOverride,
    applyHealthOverrideInline,
  }
}
