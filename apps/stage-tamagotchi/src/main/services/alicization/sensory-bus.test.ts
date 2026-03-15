import { describe, expect, it, vi } from 'vitest'

import { createAlicizationSensoryBus } from './sensory-bus'

describe('alicization sensory bus battery probes', () => {
  it('uses default probe timeout budget (1500ms) when refresh options do not override timeout', async () => {
    const appendAuditLog = vi.fn().mockResolvedValue(undefined)
    const runCommand = vi.fn().mockResolvedValue(`Now drawing from 'AC Power'\n-InternalBattery-0 (id=1234567)\t88%; charging; 0:00 remaining present: true`)
    const bus = createAlicizationSensoryBus({
      appendAuditLog,
      platformOverride: 'darwin',
      cpuWindowMs: 200,
      runCommand,
    })

    await bus.refreshNow()

    expect(runCommand).toBeCalledWith('pmset -g batt', 1_500)
  })

  it('parses battery telemetry from macOS pmset output', async () => {
    const appendAuditLog = vi.fn().mockResolvedValue(undefined)
    const bus = createAlicizationSensoryBus({
      appendAuditLog,
      platformOverride: 'darwin',
      cpuWindowMs: 200,
      runCommand: vi.fn().mockResolvedValue(`Now drawing from 'AC Power'\n-InternalBattery-0 (id=1234567)\t86%; charging; 0:00 remaining present: true`),
    })

    const sample = await bus.refreshNow({ timeoutMs: 1_000 })
    expect(sample.battery?.percent).toBe(86)
    expect(sample.battery?.charging).toBe(true)
    expect(sample.degraded?.includes('battery-unavailable') ?? false).toBe(false)
  })

  it('degrades battery telemetry and audits timeout warning when probe exceeds budget', async () => {
    const appendAuditLog = vi.fn().mockResolvedValue(undefined)
    const timeoutError = Object.assign(new Error('timeout'), { code: 'PROBE_TIMEOUT' })
    const bus = createAlicizationSensoryBus({
      appendAuditLog,
      platformOverride: 'win32',
      cpuWindowMs: 200,
      runCommand: vi.fn().mockRejectedValue(timeoutError),
    })

    const sample = await bus.refreshNow({ timeoutMs: 500 })
    expect(sample.degraded).toContain('battery-unavailable')
    expect(appendAuditLog).toBeCalledWith(expect.objectContaining({
      category: 'alicization.sensory',
      action: 'sample-battery-timeout',
    }))
  })

  it('allows refresh timeout override for one-off stale refresh attempts', async () => {
    const appendAuditLog = vi.fn().mockResolvedValue(undefined)
    const runCommand = vi.fn().mockResolvedValue(`Now drawing from 'AC Power'\n-InternalBattery-0 (id=1234567)\t66%; charging; 0:00 remaining present: true`)
    const bus = createAlicizationSensoryBus({
      appendAuditLog,
      platformOverride: 'darwin',
      cpuWindowMs: 200,
      runCommand,
    })

    await bus.refreshNow({ timeoutMs: 1_200 })

    expect(runCommand).toBeCalledWith('pmset -g batt', 1_200)
  })

  it('reads battery telemetry from linux sysfs fallback files', async () => {
    const appendAuditLog = vi.fn().mockResolvedValue(undefined)
    const bus = createAlicizationSensoryBus({
      appendAuditLog,
      platformOverride: 'linux',
      cpuWindowMs: 200,
      listDirectory: vi.fn().mockResolvedValue(['AC', 'BAT0']),
      readTextFile: vi.fn(async (path: string) => {
        if (path.endsWith('/capacity'))
          return '54\n'
        if (path.endsWith('/status'))
          return 'Discharging\n'
        return ''
      }),
    })

    const sample = await bus.refreshNow()
    expect(sample.battery?.percent).toBe(54)
    expect(sample.battery?.charging).toBe(false)
    expect(sample.battery?.source).toBe('fallback')
  })

  it('tracks running state and next tick scheduling with start/stop lifecycle', async () => {
    const appendAuditLog = vi.fn().mockResolvedValue(undefined)
    const bus = createAlicizationSensoryBus({
      appendAuditLog,
      platformOverride: 'darwin',
      cpuWindowMs: 200,
      runCommand: vi.fn().mockResolvedValue(`Now drawing from 'AC Power'\n-InternalBattery-0 (id=1234567)\t91%; charging; 0:00 remaining present: true`),
    })

    const initialSnapshot = bus.getSnapshot()
    expect(initialSnapshot.running).toBe(false)
    expect(initialSnapshot.nextTickAt).toBeNull()

    bus.start()
    const runningSnapshot = bus.getSnapshot()
    expect(runningSnapshot.running).toBe(true)
    expect(typeof runningSnapshot.nextTickAt).toBe('number')

    bus.stop('manual')
    const stoppedSnapshot = bus.getSnapshot()
    expect(stoppedSnapshot.running).toBe(false)
    expect(stoppedSnapshot.nextTickAt).toBeNull()
  })

  it('supports force refresh to run an additional sample when a refresh is already pending', async () => {
    const appendAuditLog = vi.fn().mockResolvedValue(undefined)
    const runCommand = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return `Now drawing from 'Battery Power'\n-InternalBattery-0 (id=1234567)\t74%; discharging; 2:10 remaining present: true`
    })
    const bus = createAlicizationSensoryBus({
      appendAuditLog,
      platformOverride: 'darwin',
      cpuWindowMs: 200,
      runCommand,
    })

    const firstRefresh = bus.refreshNow({ timeoutMs: 1_000 })
    const secondRefresh = bus.refreshNow({ force: true, timeoutMs: 1_000 })

    await Promise.all([firstRefresh, secondRefresh])

    // First pending refresh + one forced refresh sample.
    expect(runCommand.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('marks snapshot as stale when age exceeds configured threshold', async () => {
    vi.useFakeTimers()
    const appendAuditLog = vi.fn().mockResolvedValue(undefined)
    const baseTime = new Date('2026-03-10T12:00:00.000Z')
    vi.setSystemTime(baseTime)
    const bus = createAlicizationSensoryBus({
      appendAuditLog,
      platformOverride: 'darwin',
      cpuWindowMs: 200,
      staleMs: 10_000,
      runCommand: vi.fn().mockResolvedValue(`Now drawing from 'Battery Power'\n-InternalBattery-0 (id=1234567)\t60%; discharging; 3:00 remaining present: true`),
    })

    const refresh = bus.refreshNow({ timeoutMs: 1_000 })
    await vi.advanceTimersByTimeAsync(250)
    await refresh
    const fresh = bus.getSnapshot()
    expect(fresh.stale).toBe(false)
    expect(fresh.ageMs).toBeGreaterThanOrEqual(0)

    vi.setSystemTime(new Date(baseTime.getTime() + 10_100))
    const stale = bus.getSnapshot()
    expect(stale.ageMs).toBeGreaterThanOrEqual(10_000)
    expect(stale.stale).toBe(true)

    vi.useRealTimers()
  })
})
