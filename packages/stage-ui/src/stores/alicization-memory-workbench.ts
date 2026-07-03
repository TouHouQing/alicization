import type {
  AlicizationMemoryRecallProbeResult,
  AlicizationMemoryReviewActionPayload,
  AlicizationMemoryWorkbenchItem,
  AlicizationMemoryWorkbenchSnapshot,
} from './alicization-bridge'

import { errorMessageFrom } from '@moeru/std'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { getAlicizationBridge, hasAlicizationBridge } from './alicization-bridge'

export type AlicizationMemoryWorkbenchTab = 'working' | 'long-term' | 'review' | 'probe' | 'persona' | 'health'

export const useAlicizationMemoryWorkbenchStore = defineStore('alicization-memory-workbench', () => {
  const activeTab = ref<AlicizationMemoryWorkbenchTab>('working')
  const snapshot = ref<AlicizationMemoryWorkbenchSnapshot | null>(null)
  const longTermItems = ref<AlicizationMemoryWorkbenchItem[]>([])
  const recallProbe = ref<AlicizationMemoryRecallProbeResult | null>(null)
  const recallQuery = ref('我们去打游戏吧')
  const loading = ref(false)
  const listLoading = ref(false)
  const probeLoading = ref(false)
  const reviewActionLoadingId = ref<string | null>(null)
  const lastError = ref<string | null>(null)

  const workingMemory = computed(() => snapshot.value?.workingMemory ?? null)
  const reviewItems = computed(() => snapshot.value?.review.items ?? [])
  const health = computed(() => snapshot.value?.health ?? null)
  const pendingReviewCount = computed(() => snapshot.value?.review.pending ?? 0)

  async function refreshSnapshot(sessionId?: string | null) {
    if (!hasAlicizationBridge()) {
      snapshot.value = null
      lastError.value = null
      return null
    }
    const bridge = getAlicizationBridge()
    if (!bridge.memoryWorkbenchGetSnapshot) {
      snapshot.value = null
      lastError.value = null
      return null
    }
    loading.value = true
    try {
      const next = await bridge.memoryWorkbenchGetSnapshot({ sessionId })
      snapshot.value = next
      longTermItems.value = next.longTerm.items
      lastError.value = null
      return next
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      loading.value = false
    }
  }

  async function refreshLongTerm() {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListLongTerm)
      return []
    listLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListLongTerm!({ limit: 50 })
      longTermItems.value = result.items
      lastError.value = null
      return result.items
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return []
    }
    finally {
      listLoading.value = false
    }
  }

  async function applyReviewAction(
    reviewItemId: string,
    decision: AlicizationMemoryReviewActionPayload['decision'],
  ) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchApplyReviewAction)
      return null
    reviewActionLoadingId.value = reviewItemId
    try {
      const result = await getAlicizationBridge().memoryWorkbenchApplyReviewAction!({ reviewItemId, decision })
      await refreshSnapshot(snapshot.value?.sessionId ?? null)
      lastError.value = null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      reviewActionLoadingId.value = null
    }
  }

  async function runRecallProbe(query = recallQuery.value) {
    const normalized = query.trim()
    if (!normalized || !hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchRecallProbe)
      return null
    recallQuery.value = normalized
    probeLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchRecallProbe!({
        query: normalized,
        sessionId: snapshot.value?.sessionId ?? null,
        includeWorkingMemory: true,
        limit: 8,
      })
      recallProbe.value = result
      lastError.value = null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      probeLoading.value = false
    }
  }

  return {
    activeTab,
    snapshot,
    longTermItems,
    recallProbe,
    recallQuery,
    loading,
    listLoading,
    probeLoading,
    reviewActionLoadingId,
    lastError,
    workingMemory,
    reviewItems,
    health,
    pendingReviewCount,
    refreshSnapshot,
    refreshLongTerm,
    applyReviewAction,
    runRecallProbe,
  }
})
