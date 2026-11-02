import type { AlicizationMainGatewaySource } from './main-gateway-contract'
import type { AlicizationMainGatewayOneShotWorkLease, AlicizationMainGatewayWorkCoordinator } from './main-gateway-work-coordinator'

/** Wait for availability, never borrow or preempt an existing provider owner. */
export function acquireMainGatewayWork(coordinator: Pick<AlicizationMainGatewayWorkCoordinator, 'acquireOneShot' | 'signal' | 'onAvailability'>, input: { source: AlicizationMainGatewaySource, waitMs: number, signal?: AbortSignal }): AlicizationMainGatewayOneShotWorkLease | Promise<AlicizationMainGatewayOneShotWorkLease> {
  let latest = coordinator.acquireOneShot({ source: input.source })
  const waitMs = Number.isFinite(input.waitMs) ? Math.min(5000, Math.max(0, input.waitMs)) : 0
  if (latest.accepted || !waitMs)
    return latest
  const signal = AbortSignal.any([coordinator.signal, ...(input.signal ? [input.signal] : [])])
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    let settled = false
    let unsubscribe = () => {}
    const clean = () => {
      clearTimeout(timer)
      unsubscribe()
      signal.removeEventListener('abort', abort)
    }
    const finish = (lease: AlicizationMainGatewayOneShotWorkLease) => {
      settled = true
      clean()
      resolve(lease)
    }
    const abort = () => {
      if (settled)
        return
      settled = true
      clean()
      reject(signal.reason)
    }
    const attempt = () => {
      if (settled)
        return
      try {
        signal.throwIfAborted()
        latest = coordinator.acquireOneShot({ source: input.source })
        if (latest.accepted)
          finish(latest)
      }
      catch (error) {
        settled = true
        clean()
        reject(error)
      }
    }
    const timer = setTimeout(() => {
      if (!settled)
        finish(latest)
    }, waitMs)
    signal.addEventListener('abort', abort, { once: true })
    unsubscribe = coordinator.onAvailability(attempt)
    // Cover release/close between the first probe and listener registration.
    if (settled)
      unsubscribe()
    else
      attempt()
  })
}
