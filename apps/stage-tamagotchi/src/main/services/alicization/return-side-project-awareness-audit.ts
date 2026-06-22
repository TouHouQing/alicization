import { resolveAlicizationProjectRouteAuthorityRegistry } from './project-state-brief'

export type AlicizationReturnSideProjectAwarenessAuditMode
  = 'renderer-observation-bridge'
    | 'renderer-meta-bridge'
    | 'structured-normalization'
    | 'chat-stream-ingest'
    | 'session-sanitization'
    | 'browser-observation-persistence'
    | 'project-state-observation-reducer'
    | 'inspector-fallback-rebuild'

export interface AlicizationReturnSideProjectAwarenessAuditEntry {
  relativePath: string
  mode: AlicizationReturnSideProjectAwarenessAuditMode
  responsibility: string
}

export const alicizationReturnSideProjectAwarenessAuditRegistry = resolveAlicizationProjectRouteAuthorityRegistry()
  .filter(entry => entry.domain === 'return-side-project-awareness')
  .map(entry => ({
    relativePath: entry.relativePath,
    mode: entry.mode,
    responsibility: entry.responsibility,
  })) as readonly AlicizationReturnSideProjectAwarenessAuditEntry[]

export const alicizationReturnSideRendererMetaBridgeFiles
  = alicizationReturnSideProjectAwarenessAuditRegistry
    .filter(entry => entry.mode === 'renderer-meta-bridge')
    .map(entry => entry.relativePath)

export const alicizationReturnSideStructuredNormalizationFiles
  = alicizationReturnSideProjectAwarenessAuditRegistry
    .filter(entry => entry.mode === 'structured-normalization')
    .map(entry => entry.relativePath)

export const alicizationReturnSideChatStreamIngestFiles
  = alicizationReturnSideProjectAwarenessAuditRegistry
    .filter(entry => entry.mode === 'chat-stream-ingest')
    .map(entry => entry.relativePath)

export const alicizationReturnSideSessionSanitizationFiles
  = alicizationReturnSideProjectAwarenessAuditRegistry
    .filter(entry => entry.mode === 'session-sanitization')
    .map(entry => entry.relativePath)

export const alicizationReturnSideBrowserObservationPersistenceFiles
  = alicizationReturnSideProjectAwarenessAuditRegistry
    .filter(entry => entry.mode === 'browser-observation-persistence')
    .map(entry => entry.relativePath)

export const alicizationReturnSideProjectStateObservationReducerFiles
  = alicizationReturnSideProjectAwarenessAuditRegistry
    .filter(entry => entry.mode === 'project-state-observation-reducer')
    .map(entry => entry.relativePath)

export const alicizationReturnSideInspectorFallbackRebuildFiles
  = alicizationReturnSideProjectAwarenessAuditRegistry
    .filter(entry => entry.mode === 'inspector-fallback-rebuild')
    .map(entry => entry.relativePath)

export function resolveAlicizationReturnSideProjectAwarenessAuditRegistry() {
  return alicizationReturnSideProjectAwarenessAuditRegistry
}

export function resolveAlicizationReturnSideProjectAwarenessAuditFiles() {
  return alicizationReturnSideProjectAwarenessAuditRegistry.map(entry => entry.relativePath)
}

export function resolveAlicizationReturnSideProjectAwarenessAuditMode(relativePath: string) {
  return alicizationReturnSideProjectAwarenessAuditRegistry.find(entry => entry.relativePath === relativePath)?.mode ?? null
}
