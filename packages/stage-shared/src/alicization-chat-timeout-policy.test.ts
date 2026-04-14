import { describe, expect, it } from 'vitest'

import {
  alicizationMainGatewayOneShotRecoveryBudget,
  deriveAlicizationMainGatewayRecoveryWindowMs,
  deriveAlicizationRendererBridgeWatchdogTimeoutPolicy,
} from './alicization-chat-timeout-policy'

describe('alicization chat timeout policy', () => {
  it('keeps renderer liveness watchdog above main recovery window', () => {
    const mainRecoveryWindowMs = deriveAlicizationMainGatewayRecoveryWindowMs()
    const rendererPolicy = deriveAlicizationRendererBridgeWatchdogTimeoutPolicy()

    expect(mainRecoveryWindowMs).toBe(
      45_000
      + alicizationMainGatewayOneShotRecoveryBudget.primaryMs
      + alicizationMainGatewayOneShotRecoveryBudget.minimalContextMs,
    )
    expect(rendererPolicy.firstEventTimeoutMs).toBeGreaterThan(mainRecoveryWindowMs)
    expect(rendererPolicy.livenessTimeoutMs).toBeGreaterThan(mainRecoveryWindowMs)
    expect(rendererPolicy.livenessTimeoutMs).toBeGreaterThan(rendererPolicy.firstEventTimeoutMs)
  })

  it('expands liveness watchdog when visual grounding is enabled', () => {
    const defaultPolicy = deriveAlicizationRendererBridgeWatchdogTimeoutPolicy()
    const visualPolicy = deriveAlicizationRendererBridgeWatchdogTimeoutPolicy({
      hasVisualGrounding: true,
    })

    expect(visualPolicy.livenessTimeoutMs).toBeGreaterThan(defaultPolicy.livenessTimeoutMs)
    expect(visualPolicy.retryLivenessTimeoutMs).toBeGreaterThan(defaultPolicy.retryLivenessTimeoutMs)
  })
})
