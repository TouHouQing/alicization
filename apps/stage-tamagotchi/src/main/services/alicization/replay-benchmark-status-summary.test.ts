import { describe, expect, it } from 'vitest'

import { __alicizationTestOnly } from './replay-benchmark-runtime'

describe('replay benchmark status summaries', () => {
  it('does not let retired continuity telemetry affect the ship decision', () => {
    const shipGate = __alicizationTestOnly.buildReplayBenchmarkShipGate({
      report: {
        gate: {
          passed: true,
          failingKeys: [],
        },
        telemetryPatch: {
          retrievalHealth: {
            longRunContinuityClosureRate: 0,
            longRunContinuitySessionClosureRate: 0,
            runtimeLongRunContinuitySessionClosureRate: 0,
          },
        },
        datasetFeedback: {
          humanRatingRubric: null,
          paritySummary: null,
          authoritySummary: null,
        },
      },
      finalReplayGate: {
        passed: true,
        failingKeys: [],
      },
    } as any)

    const presenceGate = shipGate.find(row => row.key === 'presence-qa-gate')
    expect(presenceGate?.detail).not.toContain('Continuity')
    expect(presenceGate?.detail).toContain('continuityMindCarryRate')
    expect(presenceGate?.detail).toContain('runtimeMemoryClosureLongRunClosureRate')
    expect(presenceGate?.detail).not.toContain('longRunContinuityClosureRate')
    expect(presenceGate?.detail).not.toContain('longRunContinuitySessionClosureRate')
    expect(presenceGate?.detail).not.toContain('runtimeLongRunContinuitySessionClosureRate')
  })
})
