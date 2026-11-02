export interface ExecutionStorageStatus {
  state: 'unknown' | 'ready' | 'deferred' | 'cleaning' | 'failed' | 'closed'
  pressure: 'unknown' | 'normal' | 'low'
  availableBytes: string | null
  cacheBytes: number | null
  checkedAt: number | null
  cleanedAt: number | null
  releasedCacheBytes: number
  cleanupPending: boolean
}
export interface ExecutionStorageCommand { cardId: string, action: 'inspect' | 'clear-cache' }
