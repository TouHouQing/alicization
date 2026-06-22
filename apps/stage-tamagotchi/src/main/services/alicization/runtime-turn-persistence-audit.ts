import type { AlicizationProjectRouteAuthorityEntry } from './project-state-brief'

import { resolveAlicizationProjectRouteAuthorityRegistry } from './project-state-brief'

type AlicizationRuntimeTurnPersistenceRouteAuthorityEntry = Extract<
  AlicizationProjectRouteAuthorityEntry,
  { domain: 'runtime-turn-persistence' }
>

export type AlicizationRuntimeTurnPersistenceMode
  = 'persistence-authority'
    | 'renderer-dialogue-entry'
    | 'proactive-turn-entry'
    | 'reminder-turn-entry'

export interface AlicizationRuntimeTurnPersistenceAuditEntry {
  relativePath: string
  mode: AlicizationRuntimeTurnPersistenceMode
  responsibility: string
}

const projectRouteAuthorityRegistry = resolveAlicizationProjectRouteAuthorityRegistry() as readonly AlicizationProjectRouteAuthorityEntry[]

export const alicizationRuntimeTurnPersistenceAuditRegistry = projectRouteAuthorityRegistry
  .filter((entry): entry is AlicizationRuntimeTurnPersistenceRouteAuthorityEntry => entry.domain === 'runtime-turn-persistence')
  .map(entry => ({
    relativePath: entry.relativePath,
    mode: entry.mode,
    responsibility: entry.responsibility,
  })) as readonly AlicizationRuntimeTurnPersistenceAuditEntry[]

export const alicizationRuntimeTurnPersistenceAuthorityFiles
  = alicizationRuntimeTurnPersistenceAuditRegistry
    .filter(entry => entry.mode === 'persistence-authority')
    .map(entry => entry.relativePath)

export const alicizationRuntimeTurnPersistenceEntryFiles
  = alicizationRuntimeTurnPersistenceAuditRegistry
    .filter(entry => entry.mode !== 'persistence-authority')
    .map(entry => entry.relativePath)

export function resolveAlicizationRuntimeTurnPersistenceAuditRegistry() {
  return alicizationRuntimeTurnPersistenceAuditRegistry
}

export function resolveAlicizationRuntimeTurnPersistenceAuditedFiles() {
  return alicizationRuntimeTurnPersistenceAuditRegistry.map(entry => entry.relativePath)
}

export function resolveAlicizationRuntimeTurnPersistenceMode(relativePath: string) {
  return alicizationRuntimeTurnPersistenceAuditRegistry.find(entry => entry.relativePath === relativePath)?.mode ?? null
}
