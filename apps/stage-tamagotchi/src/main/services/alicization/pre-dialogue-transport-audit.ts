import type { AlicizationProjectRouteAuthorityEntry } from './project-state-brief'

import {
  resolveAlicizationPreDialogueTransportEntrypointGovernanceMirrors,
  resolveAlicizationProjectRouteAuthorityRegistry,
} from './project-state-brief'

type AlicizationPreDialogueTransportRouteAuthorityEntry = Extract<
  AlicizationProjectRouteAuthorityEntry,
  { domain: 'pre-dialogue-transport' }
>

export type AlicizationPreDialogueTransportAuditMode
  = 'identity-construction'
    | 'transport-sanitization'
    | 'bridge-forwarding'

export interface AlicizationPreDialogueTransportAuditEntry {
  relativePath: string
  mode: AlicizationPreDialogueTransportAuditMode
  responsibility: string
}

const alicizationProjectRouteAuthorityRegistry: readonly AlicizationProjectRouteAuthorityEntry[]
  = resolveAlicizationProjectRouteAuthorityRegistry()

export const alicizationPreDialogueTransportAuditRegistry = alicizationProjectRouteAuthorityRegistry
  .filter((entry): entry is AlicizationPreDialogueTransportRouteAuthorityEntry => entry.domain === 'pre-dialogue-transport')
  .map(entry => ({
    relativePath: entry.relativePath,
    mode: entry.mode,
    responsibility: entry.responsibility,
  })) as readonly AlicizationPreDialogueTransportAuditEntry[]

export const alicizationPreDialogueIdentityConstructionFiles
  = alicizationPreDialogueTransportAuditRegistry
    .filter(entry => entry.mode === 'identity-construction')
    .map(entry => entry.relativePath)

export const alicizationPreDialogueTransportSanitizationFiles
  = alicizationPreDialogueTransportAuditRegistry
    .filter(entry => entry.mode === 'transport-sanitization')
    .map(entry => entry.relativePath)

export const alicizationPreDialogueBridgeForwardingFiles
  = alicizationPreDialogueTransportAuditRegistry
    .filter(entry => entry.mode === 'bridge-forwarding')
    .map(entry => entry.relativePath)

export function resolveAlicizationPreDialogueTransportAuditRegistry() {
  return alicizationPreDialogueTransportAuditRegistry
}

export function resolveAlicizationPreDialogueTransportAuditFiles() {
  return alicizationPreDialogueTransportAuditRegistry.map(entry => entry.relativePath)
}

export function resolveAlicizationPreDialogueTransportAuditMode(relativePath: string) {
  return alicizationPreDialogueTransportAuditRegistry.find(entry => entry.relativePath === relativePath)?.mode ?? null
}

export { resolveAlicizationPreDialogueTransportEntrypointGovernanceMirrors }
