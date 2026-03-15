import type { AlicizationAuditLogInput, AlicizationSensoryCacheSnapshot, AlicizationSystemProbeDegradeReason, AlicizationSystemProbeSample } from '../../../shared/eventa'

import os from 'node:os'

import { exec } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { platform } from 'node:process'

const defaultTickMs = 60_000
const defaultStaleMs = 90_000
const defaultCpuWindowMs = 1_000
const defaultProbeTimeoutMs = 1_500

interface CpuSnapshot {
  idle: number
  total: number
}

export interface AlicizationSensoryBusRefreshOptions {
  force?: boolean
  timeoutMs?: number
}

interface AlicizationSensoryBusOptions {
  tickMs?: number
  staleMs?: number
  cpuWindowMs?: number
  probeTimeoutMs?: number
  platformOverride?: NodeJS.Platform
  runCommand?: (command: string, timeoutMs: number) => Promise<string>
  readTextFile?: (path: string) => Promise<string>
  listDirectory?: (path: string) => Promise<string[]>
  appendAuditLog: (input: AlicizationAuditLogInput) => Promise<void>
}

export interface AlicizationSensoryBus {
  start: () => void
  stop: (reason?: 'kill-switch' | 'shutdown' | 'manual') => void
  refreshNow: (options?: AlicizationSensoryBusRefreshOptions) => Promise<AlicizationSystemProbeSample>
  getSnapshot: () => AlicizationSensoryCacheSnapshot
}

interface BatterySnapshot {
  percent: number
  charging: boolean
  source: 'native' | 'fallback'
}

function clampPercent(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(100, value))
}

function readCpuSnapshot(): CpuSnapshot {
  const cpus = os.cpus()
  let idle = 0
  let total = 0

  for (const cpu of cpus) {
    const times = cpu.times
    idle += times.idle
    total += times.user + times.nice + times.sys + times.irq + times.idle
  }

  return {
    idle,
    total,
  }
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

async function measureCpuUsage(windowMs: number) {
  const start = readCpuSnapshot()
  await sleep(windowMs)
  const end = readCpuSnapshot()
  const idleDelta = end.idle - start.idle
  const totalDelta = end.total - start.total

  if (totalDelta <= 0)
    return 0

  return clampPercent((1 - idleDelta / totalDelta) * 100)
}

function createProbeTimeoutError(command: string, timeoutMs: number) {
  const timeoutError = new Error(`Command timed out after ${timeoutMs}ms: ${command}`) as Error & { code?: string }
  timeoutError.code = 'PROBE_TIMEOUT'
  return timeoutError
}

async function defaultRunCommand(command: string, timeoutMs: number) {
  let child: ReturnType<typeof exec> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const executePromise = new Promise<string>((resolve, reject) => {
    child = exec(command, { windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (timer)
        clearTimeout(timer)
      if (error) {
        reject(error)
        return
      }

      resolve([stdout, stderr].filter(Boolean).join('\n').trim())
    })
  })
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      child?.kill()
      reject(createProbeTimeoutError(command, timeoutMs))
    }, timeoutMs)
  })

  try {
    return await Promise.race([executePromise, timeoutPromise])
  }
  finally {
    if (timer)
      clearTimeout(timer)
  }
}

function parseMacBatteryOutput(raw: string): BatterySnapshot | null {
  const percentMatch = raw.match(/(\d{1,3})\s*%/)
  if (!percentMatch)
    return null

  const percent = clampPercent(Number(percentMatch[1]))
  const charging = /charging|charged|ac power|finishing charge/i.test(raw)
  return {
    percent,
    charging,
    source: 'native',
  }
}

function parseWindowsBatteryOutput(raw: string): BatterySnapshot | null {
  const numbers = (raw.match(/\d+/g) ?? []).map(Number)
  const percent = numbers.find(value => value >= 0 && value <= 100)
  if (percent == null)
    return null

  const status = numbers.find((value, index) => index > 0 && value >= 0 && value <= 20)
  const charging = status != null
    ? [2, 3, 6, 7, 8, 9, 11].includes(status)
    : /charging|fully charged|charged/i.test(raw)

  return {
    percent: clampPercent(percent),
    charging,
    source: 'native',
  }
}

function parseLinuxBatteryOutput(capacityRaw: string, statusRaw: string): BatterySnapshot | null {
  const capacity = Number.parseInt(capacityRaw.trim(), 10)
  if (!Number.isFinite(capacity))
    return null

  const status = statusRaw.trim().toLowerCase()
  return {
    percent: clampPercent(capacity),
    charging: status.startsWith('charging') || status.startsWith('full'),
    source: 'fallback',
  }
}

function createEmptySample(windowMs: number) {
  const now = new Date()
  return {
    collectedAt: now.getTime(),
    time: {
      iso: now.toISOString(),
      local: now.toLocaleString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
    cpu: {
      usagePercent: 0,
      windowMs,
    },
    memory: {
      freeMB: 0,
      totalMB: 0,
      usagePercent: 0,
    },
    degraded: ['battery-unavailable', 'cpu-unavailable', 'memory-unavailable'],
  } satisfies AlicizationSystemProbeSample
}

export function createAlicizationSensoryBus(options: AlicizationSensoryBusOptions): AlicizationSensoryBus {
  const tickMs = Math.max(5_000, Math.floor(options.tickMs ?? defaultTickMs))
  const staleMs = Math.max(10_000, Math.floor(options.staleMs ?? defaultStaleMs))
  const cpuWindowMs = Math.max(200, Math.floor(options.cpuWindowMs ?? defaultCpuWindowMs))
  const probeTimeoutMs = Math.max(300, Math.floor(options.probeTimeoutMs ?? defaultProbeTimeoutMs))
  const runtimePlatform = options.platformOverride ?? platform
  const runCommand = options.runCommand ?? defaultRunCommand
  const readTextFile = options.readTextFile ?? (async (path: string) => await readFile(path, 'utf-8'))
  const listDirectory = options.listDirectory ?? (async (path: string) => await readdir(path))

  let timer: ReturnType<typeof setInterval> | undefined
  let running = false
  let nextTickAt: number | null = null
  let cache: AlicizationSystemProbeSample = createEmptySample(cpuWindowMs)
  let pendingRefresh: Promise<AlicizationSystemProbeSample> | null = null

  async function appendWarning(action: string, message: string, payload?: Record<string, unknown>) {
    await options.appendAuditLog({
      level: 'warning',
      category: 'alicization.sensory',
      action,
      message,
      payload,
    }).catch(() => {})
  }

  async function sampleBattery(timeoutMs: number): Promise<BatterySnapshot | null> {
    if (runtimePlatform === 'darwin') {
      const output = await runCommand('pmset -g batt', timeoutMs)
      return parseMacBatteryOutput(output)
    }

    if (runtimePlatform === 'win32') {
      const output = await runCommand('wmic path Win32_Battery get EstimatedChargeRemaining,BatteryStatus', timeoutMs)
      return parseWindowsBatteryOutput(output)
    }

    const candidates = await listDirectory('/sys/class/power_supply').catch(() => [])
    const batteryDirName = candidates.find(name => /^BAT\d+$/i.test(name))
    if (!batteryDirName)
      return null

    const batteryDir = join('/sys/class/power_supply', batteryDirName)
    const [capacity, status] = await Promise.all([
      readTextFile(join(batteryDir, 'capacity')),
      readTextFile(join(batteryDir, 'status')),
    ])

    return parseLinuxBatteryOutput(capacity, status)
  }

  async function sampleOnce(timeoutMs = probeTimeoutMs) {
    const now = Date.now()
    const degraded = new Set<AlicizationSystemProbeDegradeReason>()

    const sample: AlicizationSystemProbeSample = {
      collectedAt: now,
      time: {
        iso: new Date(now).toISOString(),
        local: new Date(now).toLocaleString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
      cpu: {
        usagePercent: 0,
        windowMs: cpuWindowMs,
      },
      memory: {
        freeMB: 0,
        totalMB: 0,
        usagePercent: 0,
      },
    }

    try {
      const battery = await sampleBattery(timeoutMs)
      if (battery) {
        sample.battery = battery
      }
      else {
        degraded.add('battery-unavailable')
      }
    }
    catch (error: any) {
      degraded.add('battery-unavailable')
      const timedOut = typeof error === 'object' && error != null && (error as { code?: unknown }).code === 'PROBE_TIMEOUT'
      await appendWarning(timedOut ? 'sample-battery-timeout' : 'sample-battery-failed', 'Failed to sample battery telemetry.', {
        reason: error instanceof Error ? error.message : String(error),
      })
    }

    try {
      const total = os.totalmem()
      const free = os.freemem()
      const used = Math.max(0, total - free)
      sample.memory = {
        totalMB: Math.round(total / (1024 * 1024)),
        freeMB: Math.round(free / (1024 * 1024)),
        usagePercent: total > 0 ? clampPercent((used / total) * 100) : 0,
      }
    }
    catch (error) {
      degraded.add('memory-unavailable')
      await appendWarning('sample-memory-failed', 'Failed to sample memory telemetry.', {
        reason: error instanceof Error ? error.message : String(error),
      })
    }

    try {
      sample.cpu = {
        usagePercent: await measureCpuUsage(cpuWindowMs),
        windowMs: cpuWindowMs,
      }
    }
    catch (error) {
      degraded.add('cpu-unavailable')
      await appendWarning('sample-cpu-failed', 'Failed to sample CPU telemetry.', {
        reason: error instanceof Error ? error.message : String(error),
      })
    }

    if (degraded.size > 0)
      sample.degraded = [...degraded]

    cache = sample
    return sample
  }

  async function refreshNow(refreshOptions?: AlicizationSensoryBusRefreshOptions) {
    const timeoutMs = Math.max(300, Math.floor(refreshOptions?.timeoutMs ?? probeTimeoutMs))

    if (pendingRefresh && !refreshOptions?.force)
      return await pendingRefresh

    if (pendingRefresh && refreshOptions?.force) {
      await pendingRefresh.catch(() => {})
    }

    pendingRefresh = sampleOnce(timeoutMs).finally(() => {
      pendingRefresh = null
    })
    return await pendingRefresh
  }

  function scheduleTick() {
    nextTickAt = Date.now() + tickMs
  }

  function start() {
    if (running)
      return

    running = true
    scheduleTick()
    void refreshNow()
    timer = setInterval(() => {
      scheduleTick()
      void refreshNow()
    }, tickMs)
  }

  function stop(_reason?: 'kill-switch' | 'shutdown' | 'manual') {
    if (timer) {
      clearInterval(timer)
      timer = undefined
    }
    running = false
    nextTickAt = null
  }

  function getSnapshot(): AlicizationSensoryCacheSnapshot {
    const ageMs = Math.max(0, Date.now() - cache.collectedAt)
    return {
      sample: cache,
      stale: ageMs > staleMs,
      ageMs,
      nextTickAt,
      running,
    }
  }

  return {
    start,
    stop,
    refreshNow,
    getSnapshot,
  }
}
