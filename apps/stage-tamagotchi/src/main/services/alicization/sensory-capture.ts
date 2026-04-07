import type { ScreenCaptureDiagnosticsSnapshot } from '@proj-alicization/electron-screen-capture'

import type {
  AlicizationSensoryCaptureHealth,
  AlicizationSensoryCapturePermission,
  AlicizationSensoryCaptureSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { DesktopCaptureAccessRuntimeSnapshot } from './desktop-capture-runtime'

function maxTimestamp(values: Array<number | null | undefined>) {
  const finiteValues = values.filter(value => typeof value === 'number' && Number.isFinite(value)) as number[]
  return finiteValues.length > 0 ? Math.max(...finiteValues) : null
}

export function normalizeScreenCapturePermission(
  status: ScreenCaptureDiagnosticsSnapshot['permissionStatus'] | string | null | undefined,
): AlicizationSensoryCapturePermission {
  if (status === 'granted')
    return 'granted'
  if (status === 'denied' || status === 'restricted')
    return 'denied'
  if (status === 'not-determined')
    return 'prompt'
  return 'unknown'
}

export function deriveSensoryCaptureSnapshotFromDiagnostics(
  diagnostics: ScreenCaptureDiagnosticsSnapshot | null | undefined,
): AlicizationSensoryCaptureSnapshot | null {
  if (!diagnostics)
    return null

  const permission = normalizeScreenCapturePermission(diagnostics.permissionStatus)
  const degradedReasons = new Set<string>()
  let health: AlicizationSensoryCaptureHealth = 'healthy'

  if (permission === 'denied') {
    health = 'unavailable'
    degradedReasons.add('permission-denied')
  }
  else if (permission === 'prompt') {
    health = 'degraded'
    degradedReasons.add('permission-prompt')
  }
  else if (permission === 'unknown') {
    health = 'degraded'
    degradedReasons.add('permission-unknown')
  }

  if (diagnostics.main.getSources.completedAt == null && diagnostics.main.getSources.sourceCount == null) {
    if (health === 'healthy')
      health = 'degraded'
    degradedReasons.add('sources-unprobed')
  }
  else if (diagnostics.main.getSources.sourceCount === 0) {
    health = 'unavailable'
    degradedReasons.add('sources-empty')
  }

  if (diagnostics.main.getSources.error) {
    if (health === 'healthy')
      health = 'degraded'
    degradedReasons.add('probe-error')
  }

  if (diagnostics.renderer.sessionState?.phase === 'error') {
    if (health === 'healthy')
      health = 'degraded'
    degradedReasons.add('session-error')
  }
  else if (diagnostics.renderer.sessionState?.phase === 'prompting') {
    if (health === 'healthy')
      health = 'degraded'
    degradedReasons.add('session-prompting')
  }

  if (diagnostics.renderer.sessionState?.lastError) {
    if (health === 'healthy')
      health = 'degraded'
    degradedReasons.add('session-last-error')
  }

  return {
    health,
    permission,
    sessionPhase: diagnostics.renderer.sessionState?.phase ?? null,
    sessionReason: diagnostics.renderer.sessionState?.reason ?? null,
    selectedSourceId: diagnostics.renderer.sessionState?.selectedSourceId ?? null,
    currentSourceId: diagnostics.renderer.sessionState?.currentSourceId ?? null,
    sourcePreference: diagnostics.renderer.sessionState?.sourcePreference ?? null,
    sourceCount: diagnostics.main.getSources.sourceCount,
    leaseStatus: diagnostics.main.lease.status,
    leaseSourceId: diagnostics.main.lease.sourceId,
    lastUpdatedAt: maxTimestamp([
      diagnostics.updatedAt,
      diagnostics.renderer.updatedAt,
      diagnostics.main.getSources.completedAt,
      diagnostics.main.getSources.requestedAt,
      diagnostics.main.lease.acquiredAt,
      diagnostics.main.lease.releasedAt,
    ]),
    lastError: diagnostics.renderer.sessionState?.lastError
      ?? diagnostics.main.getSources.error
      ?? null,
    degradedReasons: [...degradedReasons],
  }
}

export function deriveSensoryCaptureSnapshotFromAccessRuntimeSnapshot(
  snapshot: DesktopCaptureAccessRuntimeSnapshot | null | undefined,
): AlicizationSensoryCaptureSnapshot | null {
  if (!snapshot)
    return null

  const permission = normalizeScreenCapturePermission(snapshot.permissionStatus)
  const degradedReasons = new Set<string>()
  let health: AlicizationSensoryCaptureHealth = 'healthy'

  if (permission === 'denied') {
    health = 'unavailable'
    degradedReasons.add('permission-denied')
  }
  else if (permission === 'prompt') {
    health = 'degraded'
    degradedReasons.add('permission-prompt')
  }
  else if (permission === 'unknown') {
    health = 'degraded'
    degradedReasons.add('permission-unknown')
  }

  if (snapshot.unavailableReason === 'screen-capture-permission-denied') {
    health = 'unavailable'
    degradedReasons.add('permission-denied')
  }
  else if (snapshot.unavailableReason === 'screen-capture-access-failed') {
    health = 'unavailable'
    degradedReasons.add('probe-error')
  }
  else if (snapshot.sourceCount === 0 || snapshot.unavailableReason === 'screen-capture-sources-empty') {
    health = 'unavailable'
    degradedReasons.add('sources-empty')
  }

  if (snapshot.probeError) {
    if (health === 'healthy')
      health = snapshot.sourceCount === 0 ? 'unavailable' : 'degraded'
    degradedReasons.add('probe-error')
  }

  return {
    health,
    permission,
    sessionPhase: null,
    sessionReason: null,
    selectedSourceId: null,
    currentSourceId: null,
    sourcePreference: null,
    sourceCount: snapshot.sourceCount,
    leaseStatus: 'idle',
    leaseSourceId: null,
    lastUpdatedAt: snapshot.updatedAt ?? null,
    lastError: snapshot.probeError ?? null,
    degradedReasons: [...degradedReasons],
  }
}

function resolveCaptureFallbackReason(capture: AlicizationSensoryCaptureSnapshot | null | undefined) {
  if (!capture)
    return null

  const reasons = new Set(capture.degradedReasons)
  if (reasons.has('permission-denied'))
    return 'screen-capture-permission-denied'
  if (reasons.has('sources-empty'))
    return 'screen-capture-sources-empty'
  if (reasons.has('permission-prompt') || reasons.has('session-prompting'))
    return 'screen-capture-permission-prompt'
  if (reasons.has('probe-error'))
    return 'screen-capture-access-failed'
  if (reasons.has('session-error') || reasons.has('session-last-error'))
    return 'screen-capture-session-error'
  if (reasons.has('sources-unprobed'))
    return 'screen-capture-sources-unprobed'
  if (reasons.has('permission-unknown'))
    return 'screen-capture-permission-unknown'
  if (capture.health === 'unavailable')
    return 'screen-capture-unavailable'
  if (capture.health === 'degraded')
    return 'screen-capture-degraded'
  return null
}

export interface AlicizationRuntimeCaptureGovernance {
  allowResidueAsLiveScene: boolean
  capture: AlicizationSensoryCaptureSnapshot | null
  fallbackReason: string | null
  nextCaptureState: AlicizationVisualPresenceStateSnapshot['captureState']
  auditPayload: {
    captureHealth: AlicizationSensoryCaptureHealth | null
    capturePermission: AlicizationSensoryCapturePermission | null
    captureSessionPhase: string | null
    captureSessionReason: string | null
    captureLeaseStatus: AlicizationSensoryCaptureSnapshot['leaseStatus'] | null
    captureSourceCount: number | null
    captureDegradedReasons: string[]
    captureLastError: string | null
    captureLastUpdatedAt: number | null
    captureTruthMode: 'grounded' | 'live-observed-only' | 'perception-continuity' | 'passive'
    captureFallbackReason: string | null
  }
}

export function deriveRuntimeCaptureGovernance(input: {
  capture: AlicizationSensoryCaptureSnapshot | null | undefined
  inspectionRequested: boolean
  groundedThisTurn: boolean
  previousCaptureState: AlicizationVisualPresenceStateSnapshot['captureState']
  captureSourceName?: string | null
  now: number
}): AlicizationRuntimeCaptureGovernance {
  const capture = input.capture ?? null
  const fallbackReason = resolveCaptureFallbackReason(capture)
  const shouldConstrainLiveSceneCarry = input.inspectionRequested
    && !input.groundedThisTurn
    && capture !== null
    && capture.health !== 'healthy'
  const nextHealth = input.groundedThisTurn
    ? 'healthy'
    : capture?.health ?? input.previousCaptureState.health

  return {
    allowResidueAsLiveScene: !shouldConstrainLiveSceneCarry,
    capture,
    fallbackReason,
    nextCaptureState: {
      permission: input.groundedThisTurn
        ? 'granted'
        : capture?.permission ?? input.previousCaptureState.permission,
      ...(nextHealth ? { health: nextHealth } : {}),
      lastGroundedAt: input.groundedThisTurn
        ? input.now
        : input.previousCaptureState.lastGroundedAt,
      sourceName: input.groundedThisTurn
        ? input.captureSourceName ?? input.previousCaptureState.sourceName
        : input.previousCaptureState.sourceName,
      degradedReason: input.groundedThisTurn
        ? undefined
        : fallbackReason ?? input.previousCaptureState.degradedReason,
    },
    auditPayload: {
      captureHealth: input.groundedThisTurn ? 'healthy' : capture?.health ?? null,
      capturePermission: input.groundedThisTurn ? 'granted' : capture?.permission ?? null,
      captureSessionPhase: capture?.sessionPhase ?? null,
      captureSessionReason: capture?.sessionReason ?? null,
      captureLeaseStatus: capture?.leaseStatus ?? null,
      captureSourceCount: capture?.sourceCount ?? null,
      captureDegradedReasons: capture?.degradedReasons ?? [],
      captureLastError: capture?.lastError ?? null,
      captureLastUpdatedAt: capture?.lastUpdatedAt ?? null,
      captureTruthMode: input.groundedThisTurn
        ? 'grounded'
        : input.inspectionRequested
          ? shouldConstrainLiveSceneCarry
            ? 'live-observed-only'
            : 'perception-continuity'
          : 'passive',
      captureFallbackReason: input.groundedThisTurn ? null : fallbackReason,
    },
  }
}
