import { resolveAlicizationProjectRouteAuthorityRegistry } from './project-state-brief'

type AlicizationProjectStateAnswerGovernanceRouteAuthorityEntry = Extract<
  ReturnType<typeof resolveAlicizationProjectRouteAuthorityRegistry>[number],
  { domain: 'project-state-answer-governance' }
>

export type AlicizationProjectStateAnswerGovernanceAuditMode
  = 'governance-authority'
    | 'answer-governance-enricher'
    | 'answer-contract-surface'
    | 'reply-surface-preflight'
    | 'visible-reply-continuity-surface'

export interface AlicizationProjectStateAnswerGovernanceAuditEntry {
  relativePath: string
  mode: AlicizationProjectStateAnswerGovernanceAuditMode
  responsibility: string
}

export const alicizationProjectStateAnswerGovernanceAuditRegistry = resolveAlicizationProjectRouteAuthorityRegistry()
  .filter((entry): entry is AlicizationProjectStateAnswerGovernanceRouteAuthorityEntry => entry.domain === 'project-state-answer-governance')
  .map(entry => ({
    relativePath: entry.relativePath,
    mode: entry.mode,
    responsibility: entry.responsibility,
  })) as readonly AlicizationProjectStateAnswerGovernanceAuditEntry[]

export const alicizationProjectStateAnswerGovernanceAuthorityFiles
  = alicizationProjectStateAnswerGovernanceAuditRegistry
    .filter(entry => entry.mode === 'governance-authority')
    .map(entry => entry.relativePath)

export const alicizationProjectStateAnswerGovernanceEnricherFiles
  = alicizationProjectStateAnswerGovernanceAuditRegistry
    .filter(entry => entry.mode === 'answer-governance-enricher')
    .map(entry => entry.relativePath)

export const alicizationProjectStateAnswerGovernanceContractSurfaceFiles
  = alicizationProjectStateAnswerGovernanceAuditRegistry
    .filter(entry => entry.mode === 'answer-contract-surface')
    .map(entry => entry.relativePath)

export const alicizationProjectStateAnswerGovernanceReplySurfacePreflightFiles
  = alicizationProjectStateAnswerGovernanceAuditRegistry
    .filter(entry => entry.mode === 'reply-surface-preflight')
    .map(entry => entry.relativePath)

export const alicizationProjectStateAnswerGovernanceContinuitySurfaceFiles
  = alicizationProjectStateAnswerGovernanceAuditRegistry
    .filter(entry => entry.mode === 'visible-reply-continuity-surface')
    .map(entry => entry.relativePath)

export function resolveAlicizationProjectStateAnswerGovernanceAuditRegistry() {
  return alicizationProjectStateAnswerGovernanceAuditRegistry
}

export function resolveAlicizationProjectStateAnswerGovernanceAuditedFiles() {
  return alicizationProjectStateAnswerGovernanceAuditRegistry.map(entry => entry.relativePath)
}

export function resolveAlicizationProjectStateAnswerGovernanceMode(relativePath: string) {
  return alicizationProjectStateAnswerGovernanceAuditRegistry.find(entry => entry.relativePath === relativePath)?.mode ?? null
}
