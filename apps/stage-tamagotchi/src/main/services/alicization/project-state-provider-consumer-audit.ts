import type { AlicizationProjectEntrypointGovernanceEntry } from './project-state-brief'

import { resolveAlicizationProjectEntrypointGovernanceRegistry } from './project-state-brief'

export type AlicizationProjectStateProviderConsumerAuditMode
  = 'provider-wrapper-authority'
    | 'provider-dispatch-owner'
    | 'typed-gateway-consumer'

export interface AlicizationProjectStateProviderConsumerAuditEntry {
  relativePath: string
  mode: AlicizationProjectStateProviderConsumerAuditMode
  responsibility: string
}

export function classifyAlicizationProjectStateProviderConsumerAuditMode(entry: Pick<AlicizationProjectEntrypointGovernanceEntry, 'relativePath' | 'mode'>) {
  if (entry.mode === 'authority')
    return 'provider-wrapper-authority' as const
  if (entry.mode === 'dispatch-owner')
    return 'provider-dispatch-owner' as const
  if (entry.mode === 'typed-consumer')
    return 'typed-gateway-consumer' as const

  throw new Error(`Unexpected Alicization provider-consumer governance mode for ${entry.relativePath}: ${entry.mode}`)
}

export const alicizationProjectStateProviderConsumerAuditRegistry = resolveAlicizationProjectEntrypointGovernanceRegistry()
  .filter(entry => entry.domain === 'provider-consumer')
  .map(entry => ({
    relativePath: entry.relativePath,
    mode: classifyAlicizationProjectStateProviderConsumerAuditMode(entry),
    responsibility: entry.responsibility,
  })) as readonly AlicizationProjectStateProviderConsumerAuditEntry[]

export const providerWrapperAuthorityFiles = alicizationProjectStateProviderConsumerAuditRegistry
  .filter(entry => entry.mode === 'provider-wrapper-authority')
  .map(entry => entry.relativePath)

export const providerDispatchOwnerFiles = alicizationProjectStateProviderConsumerAuditRegistry
  .filter(entry => entry.mode === 'provider-dispatch-owner')
  .map(entry => entry.relativePath)

export const typedGatewayConsumerFiles = alicizationProjectStateProviderConsumerAuditRegistry
  .filter(entry => entry.mode === 'typed-gateway-consumer')
  .map(entry => entry.relativePath)

export function resolveAlicizationProjectStateProviderConsumerAuditRegistry() {
  return alicizationProjectStateProviderConsumerAuditRegistry
}

export function resolveAlicizationProjectStateProviderConsumerAuditFiles() {
  return alicizationProjectStateProviderConsumerAuditRegistry.map(entry => entry.relativePath)
}

export function resolveAlicizationProjectStateProviderConsumerAuditMode(relativePath: string) {
  return alicizationProjectStateProviderConsumerAuditRegistry.find(entry => entry.relativePath === relativePath)?.mode ?? null
}
