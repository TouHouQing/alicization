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
  readonly signal: AbortSignal
  close: (reason?: unknown) => void
  onAvailability: (listener: () => void) => () => void
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
const shutdownSignals = new WeakSet<AbortSignal>()

/** Only the actual coordinator owner can classify its cancellation as shutdown. */
export const isMainGatewayWorkShutdown = (signal: AbortSignal) => shutdownSignals.has(signal)

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
  const foregroundOwner = new AsyncLocalStorage<() => boolean>()
  let activeForegroundCount = 0
  let activeBackground: {
    source: AlicizationMainGatewaySource
    controller: AbortController
  } | null = null
  let consecutiveBackgroundFailures = 0
  let backgroundBackoffUntil = 0
  let closed = false
  const lifetime = new AbortController()
  const leaseControllers = new Set<AbortController>()
  const availabilityListeners = new Set<() => void>()
  let backoffWakeTimer: ReturnType<typeof setTimeout> | undefined

  function notifyAvailability() {
    if (backoffWakeTimer) {
      clearTimeout(backoffWakeTimer)
      backoffWakeTimer = undefined
    }
    if (closed || !availabilityListeners.size || activeForegroundCount || activeBackground)
      return
    const delay = backgroundBackoffUntil - Date.now()
    if (delay > 0) {
      backoffWakeTimer = setTimeout(notifyAvailability, delay)
      backoffWakeTimer.unref?.()
      return
    }
    for (const listener of [...availabilityListeners]) {
      try { listener() }
      catch { /* A continuation observer cannot break provider ownership. */ }
    }
  }

  const acquireOneShot: AlicizationMainGatewayWorkCoordinator['acquireOneShot'] = ({ source }) => {
    if (closed)
      throw new DOMException('Main gateway coordinator is closed', 'AbortError')
    // Detached task continuations retain their admission's async context. This
    // internal planning job must still yield to the next real user turn.
    // Timers also inherit a finished dialogue's async context. Its released
    // lease cannot lend foreground priority to later background work.
    const liveForeground = foregroundOwner.getStore()?.() === true
    const lane = source === 'execution-planning' || source === 'memory-compaction' || !liveForeground ? 'background' : 'foreground'
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
    leaseControllers.add(controller)
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
        leaseControllers.delete(controller)
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
          notifyAvailability()
        }
      },
    }
  }

  const openForeground: AlicizationMainGatewayWorkCoordinator['openForeground'] = () => {
    if (closed)
      throw new DOMException('Main gateway coordinator is closed', 'AbortError')
    activeForegroundCount += 1
    const background = activeBackground
    if (background && !background.controller.signal.aborted)
      background.controller.abort(createForegroundPreemptionError())

    let released = false
    return {
      run: async (task) => {
        if (closed)
          throw new DOMException('Main gateway coordinator is closed', 'AbortError')
        return await foregroundOwner.run(() => !released, task)
      },
      release: () => {
        if (released)
          return
        released = true
        activeForegroundCount = Math.max(0, activeForegroundCount - 1)
        notifyAvailability()
      },
    }
  }

  return {
    signal: lifetime.signal,
    close: (reason = new DOMException('Main gateway coordinator is closed', 'AbortError')) => {
      if (closed)
        return
      closed = true
      lifetime.abort(reason)
      if (backoffWakeTimer) {
        clearTimeout(backoffWakeTimer)
        backoffWakeTimer = undefined
      }
      availabilityListeners.clear()
      // Cancellation requests release no lease. Each actual provider owner
      // remains visible until its normal finally block confirms completion.
      for (const controller of leaseControllers) {
        shutdownSignals.add(controller.signal)
        controller.abort(reason)
      }
    },
    onAvailability: (listener) => {
      if (closed)
        return () => {}
      availabilityListeners.add(listener)
      if (backgroundBackoffUntil > Date.now())
        notifyAvailability()
      return () => {
        availabilityListeners.delete(listener)
        if (!availabilityListeners.size && backoffWakeTimer) {
          clearTimeout(backoffWakeTimer)
          backoffWakeTimer = undefined
        }
      }
    },
    acquireOneShot,
    openForeground,
    snapshot: () => ({
      activeBackgroundSource: activeBackground?.source ?? null,
      activeForegroundCount,
    }),
  }
}
