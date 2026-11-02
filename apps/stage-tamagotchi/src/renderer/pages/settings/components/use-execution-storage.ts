import type { ExecutionStorageCommand, ExecutionStorageStatus } from '../../../../shared/execution-storage-contracts'

import { onScopeDispose, shallowRef, watch } from 'vue'

export function useExecutionStorage(cardId: () => string, command: (input: ExecutionStorageCommand) => Promise<ExecutionStorageStatus>) {
  const status = shallowRef<ExecutionStorageStatus | null>(null)
  const pending = shallowRef(false)
  const failed = shallowRef(false)
  let sequence = 0
  async function refresh(clearCache = false) {
    if (pending.value)
      return
    const request = ++sequence
    const owner = cardId()
    pending.value = true
    failed.value = false
    try {
      const result = await command({ cardId: owner, action: clearCache ? 'clear-cache' : 'inspect' })
      if (request !== sequence || owner !== cardId())
        return
      status.value = result
    }
    catch {
      if (request === sequence && owner === cardId())
        failed.value = true
    }
    finally {
      if (request === sequence)
        pending.value = false
    }
  }
  watch(cardId, () => {
    sequence++
    status.value = null
    pending.value = false
    void refresh()
  }, { immediate: true })
  onScopeDispose(() => {
    sequence++
  })
  return { status, pending, failed, refresh, clearCache: () => refresh(true) }
}
