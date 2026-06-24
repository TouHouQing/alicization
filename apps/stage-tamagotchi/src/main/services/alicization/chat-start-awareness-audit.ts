import type { AlicizationProjectEntrypointGovernanceEntry } from './project-state-brief'

import { resolveAlicizationProjectEntrypointGovernanceRegistry } from './project-state-brief'

export type AlicizationChatStartPayloadConsumerMode
  = 'normalization-authority'
    | 'normalize-before-use'
    | 'read-only-downstream'

export interface AlicizationChatStartPayloadConsumerAuditEntry {
  relativePath: string
  mode: AlicizationChatStartPayloadConsumerMode
  responsibility: string
}

export function classifyAlicizationChatStartPayloadConsumerMode(entry: Pick<AlicizationProjectEntrypointGovernanceEntry, 'relativePath' | 'mode'>) {
  if (entry.mode === 'authority')
    return 'normalization-authority' as const
  if (entry.mode === 'normalize-before-use')
    return 'normalize-before-use' as const
  if (entry.mode === 'read-only-downstream')
    return 'read-only-downstream' as const

  throw new Error(`Unexpected Alicization chat-start governance mode for ${entry.relativePath}: ${entry.mode}`)
}

export const alicizationChatStartPayloadConsumerAuditRegistry = resolveAlicizationProjectEntrypointGovernanceRegistry()
  .filter(entry => entry.domain === 'chat-start')
  .map(entry => ({
    relativePath: entry.relativePath,
    mode: classifyAlicizationChatStartPayloadConsumerMode(entry),
    responsibility: entry.responsibility,
  })) as readonly AlicizationChatStartPayloadConsumerAuditEntry[]

export const alicizationChatStartPayloadNormalizationAuthorityFiles
  = alicizationChatStartPayloadConsumerAuditRegistry
    .filter(entry => entry.mode === 'normalization-authority')
    .map(entry => entry.relativePath)

export const alicizationChatStartPayloadNormalizedConsumerFiles
  = alicizationChatStartPayloadConsumerAuditRegistry
    .filter(entry => entry.mode === 'normalize-before-use')
    .map(entry => entry.relativePath)

export function resolveAlicizationChatStartPayloadConsumerAuditRegistry() {
  return alicizationChatStartPayloadConsumerAuditRegistry
}

export function resolveAlicizationChatStartPayloadAuditedFiles() {
  return alicizationChatStartPayloadConsumerAuditRegistry.map(entry => entry.relativePath)
}

export function resolveAlicizationChatStartPayloadConsumerMode(relativePath: string) {
  return alicizationChatStartPayloadConsumerAuditRegistry.find(entry => entry.relativePath === relativePath)?.mode ?? null
}
