import type { LifeObligationHistoryItem, LifeObligationHistoryPage, LifeObligationHistoryRequest } from '../../../../shared/life-history-contracts'

import { onScopeDispose, shallowRef, watch } from 'vue'

export function useLifeHistory(cardId: () => string, read: (input: LifeObligationHistoryRequest) => Promise<LifeObligationHistoryPage>, head: () => string = () => '') {
  const items = shallowRef<LifeObligationHistoryItem[]>([])
  const nextCursor = shallowRef<LifeObligationHistoryPage['nextCursor']>(null)
  const pending = shallowRef(false)
  const failed = shallowRef(false)
  const hasUpdates = shallowRef(false)
  let sequence = 0
  let loaded = false
  let observedHead = ''
  async function load(reset: boolean) {
    if (!reset && (pending.value || (loaded && !nextCursor.value)))
      return
    const current = ++sequence
    const owner = cardId()
    const requestedHead = head()
    pending.value = true
    failed.value = false
    if (reset) {
      items.value = []
      nextCursor.value = null
      loaded = false
    }
    try {
      const page = await read({ cardId: owner, limit: 20, ...(!reset && nextCursor.value ? { cursor: nextCursor.value } : {}) })
      if (current !== sequence || cardId() !== owner)
        return
      if (page.cardId !== owner || (page.nextCursor && page.nextCursor.cardId !== owner))
        throw new Error('History response crossed the current card')
      // Records can move to a newer page while the user is browsing history.
      const seen = new Set(items.value.map(item => item.id))
      items.value = reset ? page.items : [...items.value, ...page.items.filter(item => !seen.has(item.id))]
      nextCursor.value = page.nextCursor
      loaded = true
      if (reset)
        observedHead = requestedHead
      hasUpdates.value = head() !== observedHead
    }
    catch {
      if (current === sequence && cardId() === owner)
        failed.value = true
    }
    finally {
      if (current === sequence)
        pending.value = false
    }
  }
  watch(head, () => {
    hasUpdates.value = true
  })
  watch(cardId, () => {
    hasUpdates.value = false
    void load(true)
  }, { immediate: true })
  onScopeDispose(() => {
    sequence++
  })
  return { items, nextCursor, pending, failed, hasUpdates, more: () => load(false), refresh: () => load(true) }
}
