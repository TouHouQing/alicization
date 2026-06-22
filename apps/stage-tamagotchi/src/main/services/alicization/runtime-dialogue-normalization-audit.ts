import type { AlicizationProjectRouteAuthorityEntry } from './project-state-brief'

import { resolveAlicizationProjectRouteAuthorityRegistry } from './project-state-brief'

type AlicizationRuntimeDialogueNormalizationRouteAuthorityEntry = Extract<
  AlicizationProjectRouteAuthorityEntry,
  { domain: 'runtime-dialogue-normalization' }
>

export type AlicizationRuntimeDialogueNormalizationMode
  = 'normalization-authority'
    | 'stream-finish-fallback'
    | 'background-normalize-before-deliver'
    | 'persistence-emission-normalize-before-deliver'
    | 'replay-normalize-before-deliver'
    | 'proactive-normalize-before-persist'

export interface AlicizationRuntimeDialogueNormalizationAuditEntry {
  relativePath: string
  mode: AlicizationRuntimeDialogueNormalizationMode
  responsibility: string
}

const alicizationProjectRouteAuthorityRegistry: readonly AlicizationProjectRouteAuthorityEntry[]
  = resolveAlicizationProjectRouteAuthorityRegistry()

export const alicizationRuntimeDialogueNormalizationAuditRegistry = alicizationProjectRouteAuthorityRegistry
  .filter((entry): entry is AlicizationRuntimeDialogueNormalizationRouteAuthorityEntry => entry.domain === 'runtime-dialogue-normalization')
  .map(entry => ({
    relativePath: entry.relativePath,
    mode: entry.mode,
    responsibility: entry.responsibility,
  })) as readonly AlicizationRuntimeDialogueNormalizationAuditEntry[]

export const alicizationRuntimeDialogueNormalizationAuthorityFiles
  = alicizationRuntimeDialogueNormalizationAuditRegistry
    .filter(entry => entry.mode === 'normalization-authority')
    .map(entry => entry.relativePath)

export const alicizationRuntimeDialogueNormalizedConsumerFiles
  = alicizationRuntimeDialogueNormalizationAuditRegistry
    .filter(entry => entry.mode !== 'normalization-authority')
    .map(entry => entry.relativePath)

export function resolveAlicizationRuntimeDialogueNormalizationAuditRegistry() {
  return alicizationRuntimeDialogueNormalizationAuditRegistry
}

export function resolveAlicizationRuntimeDialogueNormalizationAuditedFiles() {
  return alicizationRuntimeDialogueNormalizationAuditRegistry.map(entry => entry.relativePath)
}

export function resolveAlicizationRuntimeDialogueNormalizationMode(relativePath: string) {
  return alicizationRuntimeDialogueNormalizationAuditRegistry.find(entry => entry.relativePath === relativePath)?.mode ?? null
}
