export interface ExecutionVerifierSummary {
  id: string
  reference: string
  version: string
  scope: 'quality' | 'external-state' | 'reconciliation'
  receiptPath?: string
  publicKeyFingerprint?: string
}
export type ExecutionVerifierCommand
  = { cardId: string, action: 'list' }
    | { cardId: string, action: 'preview', registry: string }
    | { cardId: string, action: 'apply', token: string }
export interface ExecutionVerifierState {
  registryHash: string
  items: ExecutionVerifierSummary[]
  preview?: { token: string, expiresAt: number, items: ExecutionVerifierSummary[] }
}
