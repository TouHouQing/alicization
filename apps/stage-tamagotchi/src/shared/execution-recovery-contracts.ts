export type ExecutionRecoveryCommand
  = { cardId: string, action: 'list-downloads', afterId?: string }
    | { cardId: string, effectId: string, action: 'preview' }
    | { cardId: string, effectId: string, action: 'recheck' }
    | { cardId: string, effectId: string, action: 'takeover', token: string, confirmedStopped: true }

export type ExecutionRecoveryResult
  = { state: 'download-list', items: Array<{ effectId: string, directory: string }>, next: string | null }
    | { state: 'preview', token: string, expiresAt: number, capabilityId: string, target: string | null, goals: string[] }
    | { state: 'applied' | 'not-applied' | 'unknown' | 'host-taken-over' }
