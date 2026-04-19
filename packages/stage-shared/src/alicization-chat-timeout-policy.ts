export interface AlicizationMainGatewayOneShotRecoveryBudget {
  /**
   * Primary one-shot timeout floor for normal timeout recovery attempts.
   */
  primaryMs: number
  /**
   * Primary one-shot timeout floor when execution tooling is required.
   */
  toolingRequiredPrimaryMs: number
  /**
   * Secondary one-shot timeout floor for compact-context retries.
   */
  minimalContextMs: number
}

export const alicizationMainGatewayOneShotRecoveryBudget: AlicizationMainGatewayOneShotRecoveryBudget = {
  primaryMs: 25_000,
  toolingRequiredPrimaryMs: 16_000,
  minimalContextMs: 32_000,
}

export const alicizationRendererBridgeFirstEventTimeoutMs = 65_000
export const alicizationRendererBridgeIdleTimeoutMs = 45_000
export const alicizationRendererBridgeRetryFirstEventTimeoutMs = 65_000
export const alicizationRendererBridgeRetryIdleTimeoutMs = 25_000

export const alicizationMainGatewayFirstProgressTimeoutMs = 65_000
export const alicizationMainGatewayFirstProgressTimeoutWithVisualGroundingMs = 90_000

function resolveMainGatewayFirstProgressTimeoutMs(input?: {
  hasVisualGrounding?: boolean
}) {
  return input?.hasVisualGrounding
    ? alicizationMainGatewayFirstProgressTimeoutWithVisualGroundingMs
    : alicizationMainGatewayFirstProgressTimeoutMs
}

export function deriveAlicizationMainGatewayRecoveryWindowMs(input?: {
  hasVisualGrounding?: boolean
}) {
  const firstProgressTimeoutMs = resolveMainGatewayFirstProgressTimeoutMs(input)
  const recoveryTailMs
    = alicizationMainGatewayOneShotRecoveryBudget.primaryMs
      + alicizationMainGatewayOneShotRecoveryBudget.minimalContextMs
  return firstProgressTimeoutMs + recoveryTailMs
}

export interface AlicizationRendererBridgeWatchdogTimeoutPolicy {
  firstEventTimeoutMs: number
  livenessTimeoutMs: number
  idleTimeoutMs: number
  retryFirstEventTimeoutMs: number
  retryLivenessTimeoutMs: number
  retryIdleTimeoutMs: number
}

export function deriveAlicizationRendererBridgeWatchdogTimeoutPolicy(input?: {
  hasVisualGrounding?: boolean
}): AlicizationRendererBridgeWatchdogTimeoutPolicy {
  const recoveryWindowMs = deriveAlicizationMainGatewayRecoveryWindowMs(input)
  const livenessTimeoutFloorMs = recoveryWindowMs + 8_000
  const retryLivenessTimeoutFloorMs = recoveryWindowMs + 4_000
  const firstEventTimeoutFloorMs = recoveryWindowMs + 6_000
  const retryFirstEventTimeoutFloorMs = recoveryWindowMs + 2_000

  // NOTICE: Renderer watchdog must never undercut main-process recovery windows.
  // Otherwise renderer aborts the stream while main is still executing timeout recovery.
  const firstEventTimeoutMs = Math.max(
    alicizationRendererBridgeFirstEventTimeoutMs,
    firstEventTimeoutFloorMs,
  )
  const retryFirstEventTimeoutMs = Math.max(
    alicizationRendererBridgeRetryFirstEventTimeoutMs,
    retryFirstEventTimeoutFloorMs,
  )
  return {
    firstEventTimeoutMs,
    livenessTimeoutMs: Math.max(firstEventTimeoutMs, livenessTimeoutFloorMs),
    idleTimeoutMs: alicizationRendererBridgeIdleTimeoutMs,
    retryFirstEventTimeoutMs,
    retryLivenessTimeoutMs: Math.max(retryFirstEventTimeoutMs, retryLivenessTimeoutFloorMs),
    retryIdleTimeoutMs: alicizationRendererBridgeRetryIdleTimeoutMs,
  }
}
