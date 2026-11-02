import { afterEach, expect, it, vi } from 'vitest'

import { acquireMainGatewayWork } from './main-gateway-work-admission'
import { createAlicizationMainGatewayWorkCoordinator } from './main-gateway-work-coordinator'

afterEach(() => vi.useRealTimers())

it('retains the current background and foreground owners until they actually release', async () => {
  const coordinator = createAlicizationMainGatewayWorkCoordinator()
  const busy = coordinator.acquireOneShot({ source: 'subjective-inference' })
  if (!busy.accepted)
    throw new Error('Expected the initial background owner')
  const pending = Promise.resolve(acquireMainGatewayWork(coordinator, { source: 'screen-semantic', waitMs: 5000 }))
  const human = coordinator.openForeground({ turnId: 'actual-host-turn' })
  expect(busy.controller.signal.aborted).toBe(true)
  busy.release({ status: 'cancelled' })
  expect(coordinator.snapshot()).toEqual({ activeBackgroundSource: null, activeForegroundCount: 1 })
  human.release()
  const admitted = await pending
  expect(admitted).toMatchObject({ accepted: true, lane: 'background' })
  expect(coordinator.snapshot().activeBackgroundSource).toBe('screen-semantic')
  if (admitted.accepted)
    admitted.release({ status: 'success' })
  expect(coordinator.snapshot().activeBackgroundSource).toBeNull()
})

it.each(['host-cancelled', 'coordinator-closed'])('removes a pending request immediately on %s without acquiring later', async (reason) => {
  const coordinator = createAlicizationMainGatewayWorkCoordinator()
  const busy = coordinator.acquireOneShot({ source: 'proactive' })
  if (!busy.accepted)
    throw new Error('Expected the initial background owner')
  const acquire = vi.spyOn(coordinator, 'acquireOneShot')
  const cancel = new AbortController()
  const failure = new Error(reason)
  const pending = Promise.resolve(acquireMainGatewayWork(coordinator, { source: 'screen-semantic', waitMs: 5000, signal: cancel.signal }))
  const rejected = expect(pending).rejects.toBe(failure)
  if (reason === 'host-cancelled')
    cancel.abort(failure)
  else
    coordinator.close(failure)
  await rejected
  const calls = acquire.mock.calls.length
  busy.release({ status: 'cancelled' })
  expect(acquire).toHaveBeenCalledTimes(calls)
  expect(coordinator.snapshot().activeBackgroundSource).toBeNull()
})

it('bounds a requested wait to five seconds and cannot acquire after its deadline', async () => {
  vi.useFakeTimers()
  const coordinator = createAlicizationMainGatewayWorkCoordinator()
  const busy = coordinator.acquireOneShot({ source: 'proactive' })
  if (!busy.accepted)
    throw new Error('Expected the initial background owner')
  const acquire = vi.spyOn(coordinator, 'acquireOneShot')
  const pending = Promise.resolve(acquireMainGatewayWork(coordinator, { source: 'screen-semantic', waitMs: 60_000 }))
  await vi.advanceTimersByTimeAsync(5000)
  expect(await pending).toMatchObject({ accepted: false, reason: 'background-busy' })
  const calls = acquire.mock.calls.length
  busy.release({ status: 'success' })
  expect(acquire).toHaveBeenCalledTimes(calls)
  expect(vi.getTimerCount()).toBe(0)
})

it('preserves failure backoff instead of treating an idle provider as available', async () => {
  vi.useFakeTimers()
  const coordinator = createAlicizationMainGatewayWorkCoordinator()
  const busy = coordinator.acquireOneShot({ source: 'proactive' })
  if (!busy.accepted)
    throw new Error('Expected the initial background owner')
  const pending = Promise.resolve(acquireMainGatewayWork(coordinator, { source: 'screen-semantic', waitMs: 5000 }))
  busy.release({ status: 'failure' })
  await vi.advanceTimersByTimeAsync(5000)
  expect(await pending).toMatchObject({ accepted: false })
  expect(coordinator.acquireOneShot({ source: 'screen-semantic' })).toMatchObject({ accepted: false, reason: 'background-backoff' })
  expect(vi.getTimerCount()).toBe(0)
})

it('serializes two waiting requests without lending either the other request lease', async () => {
  const coordinator = createAlicizationMainGatewayWorkCoordinator()
  const busy = coordinator.acquireOneShot({ source: 'proactive' })
  if (!busy.accepted)
    throw new Error('Expected the initial background owner')
  const first = Promise.resolve(acquireMainGatewayWork(coordinator, { source: 'screen-semantic', waitMs: 5000 }))
  const second = Promise.resolve(acquireMainGatewayWork(coordinator, { source: 'execution-planning', waitMs: 5000 }))
  busy.release({ status: 'success' })
  const one = await first
  expect(coordinator.snapshot().activeBackgroundSource).toBe('screen-semantic')
  if (one.accepted)
    one.release({ status: 'success' })
  const two = await second
  expect(coordinator.snapshot().activeBackgroundSource).toBe('execution-planning')
  if (two.accepted)
    two.release({ status: 'success' })
})
