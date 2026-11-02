export type FileRecoveryCommand
  = { cardId: string, action: 'list', afterId?: string }
    | { cardId: string, action: 'preview', versionId: string }
    | { cardId: string, action: 'restore', versionId: string, token: string, confirmed: true }
    | { cardId: string, action: 'preview-forget', versionId: string }
    | { cardId: string, action: 'forget', versionId: string, token: string, confirmed: true }
    | { cardId: string, action: 'stop', effectId: string }

export interface FileRecoveryVersion {
  id: string
  effectId: string
  path: string
  originalExisted: boolean
  originalBytes: number
  resultBytes: number | null
  state: string
  at: number
  recoveryEffectIds: string[]
}

export interface FileRecoveryPreview {
  purpose: 'restore' | 'forget'
  state: string
  path: string
  mode: 'restore-original' | 'remove-created'
  originalBytes: number
  originalHash: string
  writtenHash: string | null
  goals: string[]
  recoveryEffectIds: string[]
  token: string | null
  expiresAt: number | null
}

/** Metadata only: original bytes and encryption references stay in main. */
export type FileRecoveryResult
  = { kind: 'list', entries: FileRecoveryVersion[], next: string | null }
    | { kind: 'preview', preview: FileRecoveryPreview }
    | { kind: 'restore', state: 'restored' | 'unknown' | 'not-restored', effectId: string }
    | { kind: 'forget', state: 'forgotten' }
    | { kind: 'stop', state: 'stopping' | 'stopped' | 'unknown' }
