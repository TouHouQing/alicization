import type { DesktopCapturerSource } from 'electron'

import type { DesktopCaptureAccessResult } from './runtime-soul'

import { errorMessageFrom } from '@moeru/std'

const defaultAccessCacheTtlMs = 1_500

type DesktopCaptureSourceKind = 'window' | 'screen'

export interface DesktopCaptureAccessRequest {
  thumbnailSize: {
    height: number
    width: number
  }
  types: DesktopCaptureSourceKind[]
}

export interface DesktopCaptureAccessRuntimeSnapshot {
  key: string
  permissionStatus?: string
  probeError?: string
  probeStrategy?: string
  sourceCount: number
  unavailableReason?: string
  updatedAt: number
}

export interface CreateDesktopCaptureAccessRuntimeOptions {
  cacheTtlMs?: number
  getNow?: () => number
  getScreenPermissionStatus?: () => string | undefined
  getSources?: (options: {
    fetchWindowIcons: boolean
    thumbnailSize: {
      height: number
      width: number
    }
    types: DesktopCaptureSourceKind[]
  }) => Promise<DesktopCapturerSource[]>
}

interface DesktopCaptureAccessCacheEntry {
  result: DesktopCaptureAccessResult
  updatedAt: number
}

function normalizeSourceKinds(types: DesktopCaptureSourceKind[]) {
  return [...new Set(types.filter(type => type === 'window' || type === 'screen'))]
}

function buildAccessCacheKey(input: DesktopCaptureAccessRequest) {
  return `${normalizeSourceKinds(input.types).join(',')}@${input.thumbnailSize.width}x${input.thumbnailSize.height}`
}

function buildProbePlan(types: DesktopCaptureSourceKind[]) {
  const normalizedTypes = normalizeSourceKinds(types)
  return [
    { label: 'primary', types: normalizedTypes },
    ...(normalizedTypes.includes('screen') && normalizedTypes.length > 1
      ? [{ label: 'retry-screen-only', types: ['screen'] as DesktopCaptureSourceKind[] }]
      : []),
    ...(normalizedTypes.includes('window') && normalizedTypes.length > 1
      ? [{ label: 'retry-window-only', types: ['window'] as DesktopCaptureSourceKind[] }]
      : []),
  ]
}

export function createDesktopCaptureAccessRuntime(options: CreateDesktopCaptureAccessRuntimeOptions = {}) {
  const cacheTtlMs = Math.max(250, Math.floor(options.cacheTtlMs ?? defaultAccessCacheTtlMs))
  const getNow = options.getNow ?? Date.now
  const getSources = options.getSources
  const getScreenPermissionStatus = options.getScreenPermissionStatus ?? (() => undefined)
  const accessCache = new Map<string, DesktopCaptureAccessCacheEntry>()

  async function probeAccess(input: DesktopCaptureAccessRequest): Promise<DesktopCaptureAccessResult> {
    if (!getSources) {
      throw new Error('Desktop capture runtime requires a getSources provider.')
    }

    const permissionStatus = getScreenPermissionStatus()
    const probePlan = buildProbePlan(input.types)
    const probeAttempts: NonNullable<DesktopCaptureAccessResult['probeAttempts']> = []
    let recoveredFromRetry = false
    let sawProbeError = false
    let lastProbeError: string | undefined

    for (const attempt of probePlan) {
      try {
        const sources = await getSources({
          types: attempt.types,
          fetchWindowIcons: false,
          thumbnailSize: input.thumbnailSize,
        })
        probeAttempts.push({
          label: attempt.label,
          types: attempt.types,
          sourceCount: sources.length,
        })
        if (sources.length > 0) {
          recoveredFromRetry = recoveredFromRetry || attempt.label !== 'primary' || sawProbeError
          return {
            permissionStatus,
            sources,
            recoveredFromRetry,
            probeStrategy: attempt.label,
            probeAttempts,
          }
        }
      }
      catch (error) {
        sawProbeError = true
        lastProbeError = errorMessageFrom(error) ?? 'desktop capture failed'
        probeAttempts.push({
          label: attempt.label,
          types: attempt.types,
          sourceCount: 0,
          error: lastProbeError,
        })
      }
    }

    return {
      permissionStatus,
      sources: [],
      unavailableReason: sawProbeError
        ? 'screen-capture-access-failed'
        : permissionStatus && permissionStatus !== 'granted'
          ? 'screen-capture-permission-denied'
          : 'screen-capture-sources-empty',
      probeError: lastProbeError,
      recoveredFromRetry,
      probeAttempts,
    }
  }

  async function resolveAccess(input: DesktopCaptureAccessRequest): Promise<DesktopCaptureAccessResult> {
    const key = buildAccessCacheKey(input)
    const now = getNow()
    const cached = accessCache.get(key)
    if (cached && now - cached.updatedAt <= cacheTtlMs) {
      return cached.result
    }

    // NOTICE: Keep a short-lived access cache so grounding and proactive semantic passes
    // can reuse the same desktopCapturer probe burst instead of hammering Electron twice.
    const result = await probeAccess(input)
    accessCache.set(key, {
      result,
      updatedAt: now,
    })
    return result
  }

  function clear() {
    accessCache.clear()
  }

  function getSnapshot(input: DesktopCaptureAccessRequest): DesktopCaptureAccessRuntimeSnapshot | null {
    const key = buildAccessCacheKey(input)
    const cached = accessCache.get(key)
    if (!cached)
      return null

    return {
      key,
      updatedAt: cached.updatedAt,
      sourceCount: cached.result.sources.length,
      permissionStatus: cached.result.permissionStatus,
      unavailableReason: cached.result.unavailableReason,
      probeError: cached.result.probeError,
      probeStrategy: cached.result.probeStrategy,
    }
  }

  return {
    clear,
    getSnapshot,
    resolveAccess,
  }
}
