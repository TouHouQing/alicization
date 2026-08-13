import type { AlicizationMainGatewaySource } from './main-gateway-contract'

import { AsyncLocalStorage } from 'node:async_hooks'

export type AlicizationMainGatewayWorkLane = 'foreground' | 'background'
export type AlicizationMainGatewayWorkDeferralReason
  = | 'foreground-active'
    | 'background-busy'
    | 'background-backoff'

export type AlicizationMainGatewayWorkOutcome = 'success' | 'failure' | 'cancelled'

export type AlicizationMainGatewayOneShotWorkLease
  = | {
    accepted: false
    lane: 'background'
    reason: AlicizationMainGatewayWorkDeferralReason
    retryAfterMs?: number
  }
  | {
    accepted: true
    lane: AlicizationMainGatewayWorkLane
    controller: AbortController
    release: (outcome?: { status: AlicizationMainGatewayWorkOutcome }) => void
  }

export interface AlicizationMainGatewayWorkCoordinator {
  acquireOneShot: (input: {
    source: AlicizationMainGatewaySource
  }) => AlicizationMainGatewayOneShotWorkLease
  openForeground: (input: {
    turnId: string
  }) => {
    run: <T>(task: () => Promise<T> | T) => Promise<T>
    release: () => void
  }
  snapshot: () => {
    activeBackgroundSource: AlicizationMainGatewaySource | null
    activeForegroundCount: number
  }
}

export const mainGatewayForegroundPreemptionReason = 'main-gateway-preempted-by-foreground-chat'
const backgroundFailureBackoffBaseMs = 60_000
const backgroundFailureBackoffMaxMs = 15 * 60_000

function createForegroundPreemptionError() {
  return Object.assign(new Error(mainGatewayForegroundPreemptionReason), {
    name: 'AbortError',
    code: 'MAIN_GATEWAY_PREEMPTED_BY_FOREGROUND_CHAT',
  })
}

export function isMainGatewayForegroundPreemption(error: unknown) {
  if (error === mainGatewayForegroundPreemptionReason)
    return true
  if (error instanceof Error && error.message.includes(mainGatewayForegroundPreemptionReason))
    return true
  if (typeof error !== 'object' || error === null)
    return false
  const candidate = error as { code?: unknown, reason?: unknown }
  return candidate.code === 'MAIN_GATEWAY_PREEMPTED_BY_FOREGROUND_CHAT'
    || candidate.reason === mainGatewayForegroundPreemptionReason
}

export function createAlicizationMainGatewayWorkCoordinator(): AlicizationMainGatewayWorkCoordinator {
  const laneStorage = new AsyncLocalStorage<AlicizationMainGatewayWorkLane>()
  let activeForegroundCount = 0
  let activeBackground: {
    source: AlicizationMainGatewaySource
    controller: AbortController
  } | null = null
  let consecutiveBackgroundFailures = 0
  let backgroundBackoffUntil = 0

  const acquireOneShot: AlicizationMainGatewayWorkCoordinator['acquireOneShot'] = ({ source }) => {
    const lane = laneStorage.getStore() ?? 'background'
    if (lane === 'background' && activeForegroundCount > 0) {
      return {
        accepted: false,
        lane,
        reason: 'foreground-active',
      }
    }
    const now = Date.now()
    if (lane === 'background' && backgroundBackoffUntil > now) {
      return {
        accepted: false,
        lane,
        reason: 'background-backoff',
        retryAfterMs: backgroundBackoffUntil - now,
      }
    }
    if (lane === 'background' && activeBackground) {
      return {
        accepted: false,
        lane,
        reason: 'background-busy',
      }
    }

    const controller = new AbortController()
    let released = false
    if (lane === 'background') {
      activeBackground = {
        source,
        controller,
      }
    }

    return {
      accepted: true,
      lane,
      controller,
      release: (outcome) => {
        if (released)
          return
        released = true
        if (lane === 'background' && activeBackground?.controller === controller) {
          activeBackground = null
          if (outcome?.status === 'failure') {
            consecutiveBackgroundFailures += 1
            const multiplier = 2 ** Math.max(0, consecutiveBackgroundFailures - 1)
            const backoffMs = Math.min(
              backgroundFailureBackoffMaxMs,
              backgroundFailureBackoffBaseMs * multiplier,
            )
            backgroundBackoffUntil = Date.now() + backoffMs
          }
          else if (outcome?.status === 'success') {
            consecutiveBackgroundFailures = 0
            backgroundBackoffUntil = 0
          }
        }
      },
    }
  }

  const openForeground: AlicizationMainGatewayWorkCoordinator['openForeground'] = () => {
    activeForegroundCount += 1
    const background = activeBackground
    if (background && !background.controller.signal.aborted)
      background.controller.abort(createForegroundPreemptionError())

    let released = false
    return {
      run: async task => await laneStorage.run('foreground', task),
      release: () => {
        if (released)
          return
        released = true
        activeForegroundCount = Math.max(0, activeForegroundCount - 1)
      },
    }
  }

  return {
    acquireOneShot,
    openForeground,
    snapshot: () => ({
      activeBackgroundSource: activeBackground?.source ?? null,
      activeForegroundCount,
    }),
  }
}
