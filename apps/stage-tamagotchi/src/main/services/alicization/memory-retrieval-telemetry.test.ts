import { describe, expect, it } from 'vitest'

import {
  blendAlicizationMemoryTelemetryLatency,
  createAlicizationMemoryRetrievalTelemetryRuntime,
  defaultAlicizationMemoryRetrievalTelemetry,
  normalizeAlicizationMemoryRetrievalTelemetry,
} from './memory-retrieval-telemetry'

describe('memory retrieval telemetry', () => {
  it('normalizes malformed telemetry payloads into a safe snapshot', () => {
    expect(normalizeAlicizationMemoryRetrievalTelemetry({
      semanticLatencyMs: '12',
      semanticSampleCount: '3',
      graphLatencyMs: '19',
      graphSampleCount: '2',
      templateLeakageFailCount: '4',
      lastUpdatedAt: '123',
    })).toEqual({
      semanticLatencyMs: 12,
      semanticSampleCount: 3,
      graphLatencyMs: 19,
      graphSampleCount: 2,
      templateLeakageFailCount: 4,
      lastUpdatedAt: 123,
    })
    expect(defaultAlicizationMemoryRetrievalTelemetry()).toEqual({
      semanticLatencyMs: null,
      semanticSampleCount: 0,
      graphLatencyMs: null,
      graphSampleCount: 0,
      templateLeakageFailCount: 0,
      lastUpdatedAt: null,
    })
  })

  it('blends retrieval latency and applies override through runtime meta storage', async () => {
    const meta = new Map<string, string>()
    const runtime = createAlicizationMemoryRetrievalTelemetryRuntime({
      now: () => 100,
      key: 'telemetry',
      getMetaValue: async key => meta.get(key),
      upsertMeta: async (key, value) => {
        meta.set(key, value)
      },
      enqueueWrite: async task => await task(),
    })

    expect(blendAlicizationMemoryTelemetryLatency(10, 2, 16)).toBeCloseTo(12)

    await runtime.recordSemanticLatency(12)
    await runtime.recordSemanticLatency(18)
    await runtime.recordGraphLatency(20)
    await runtime.applyHealthOverride({
      semanticLatencyMs: 15,
      graphLatencyMs: 22,
      templateLeakageFailCount: 3,
    })

    expect(await runtime.getTelemetry()).toEqual({
      semanticLatencyMs: 15,
      semanticSampleCount: 2,
      graphLatencyMs: 22,
      graphSampleCount: 1,
      templateLeakageFailCount: 3,
      lastUpdatedAt: 100,
    })
  })
})
