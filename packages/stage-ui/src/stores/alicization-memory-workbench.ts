import type {
  AlicizationMemoryEmbeddingReindexPayload,
  AlicizationMemoryEmbeddingReindexResult,
  AlicizationMemoryRecallProbeResult,
  AlicizationMemoryReviewActionPayload,
  AlicizationMemoryWorkbenchListPayload,
  AlicizationMemoryWorkbenchItem,
  AlicizationMemoryWorkbenchSnapshot,
  AlicizationPersonaCandidateListPayload,
  AlicizationPersonaCandidateWorkbenchDecision,
  AlicizationPersonaCandidateWorkbenchItem,
} from './alicization-bridge'

import { errorMessageFrom } from '@moeru/std'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { getAlicizationBridge, hasAlicizationBridge } from './alicization-bridge'

export type AlicizationMemoryWorkbenchTab = 'working' | 'long-term' | 'review' | 'probe' | 'persona' | 'health'

type LongTermFilters = Omit<Required<Pick<
  AlicizationMemoryWorkbenchListPayload,
  'kind' | 'query' | 'sensitivity' | 'visibility' | 'training' | 'source'
>>, 'cardId'>

export const useAlicizationMemoryWorkbenchStore = defineStore('alicization-memory-workbench', () => {
  const activeTab = ref<AlicizationMemoryWorkbenchTab>('working')
  const snapshot = ref<AlicizationMemoryWorkbenchSnapshot | null>(null)
  const longTermItems = ref<AlicizationMemoryWorkbenchItem[]>([])
  const longTermFilters = ref<LongTermFilters>({
    query: '',
    kind: 'all',
    sensitivity: 'all',
    visibility: 'all',
    training: 'all',
    source: '',
  })
  const longTermNextCursor = ref<string | null>(null)
  const personaCandidates = ref<AlicizationPersonaCandidateWorkbenchItem[]>([])
  const personaNextCursor = ref<string | null>(null)
  const personaLoading = ref(false)
  const reindexLoading = ref(false)
  const reindexResult = ref<AlicizationMemoryEmbeddingReindexResult | null>(null)
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
      longTermNextCursor.value = null
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

  function buildLongTermPayload(cursor: string | null = null) {
    const filters = longTermFilters.value
    return {
      limit: 50,
      cursor,
      query: filters.query.trim() || undefined,
      kind: filters.kind,
      sensitivity: filters.sensitivity,
      visibility: filters.visibility,
      training: filters.training,
      source: filters.source.trim() || undefined,
    } satisfies Omit<AlicizationMemoryWorkbenchListPayload, 'cardId'>
  }

  async function refreshLongTerm(filters?: Partial<LongTermFilters>) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListLongTerm)
      return []
    longTermFilters.value = {
      ...longTermFilters.value,
      ...(filters ?? {}),
    }
    longTermNextCursor.value = null
    listLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListLongTerm!(buildLongTermPayload(null))
      longTermItems.value = result.items
      longTermNextCursor.value = result.nextCursor
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

  async function loadMoreLongTerm() {
    if (!longTermNextCursor.value || !hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListLongTerm)
      return []
    listLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListLongTerm!(buildLongTermPayload(longTermNextCursor.value))
      longTermItems.value = [
        ...longTermItems.value,
        ...result.items,
      ]
      longTermNextCursor.value = result.nextCursor
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

  async function refreshPersonaCandidates(status: AlicizationPersonaCandidateListPayload['status'] = 'all') {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListPersonaCandidates)
      return []
    personaLoading.value = true
    personaNextCursor.value = null
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListPersonaCandidates!({
        status,
        limit: 50,
        cursor: null,
      })
      personaCandidates.value = result.items
      personaNextCursor.value = result.nextCursor
      lastError.value = null
      return result.items
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return []
    }
    finally {
      personaLoading.value = false
    }
  }

  async function applyPersonaCandidateAction(
    candidateId: string,
    decision: AlicizationPersonaCandidateWorkbenchDecision,
    reason?: string | null,
  ) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchApplyPersonaCandidateAction)
      return null
    personaLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchApplyPersonaCandidateAction!({
        candidateId,
        decision,
        reason,
      })
      if (result) {
        const index = personaCandidates.value.findIndex(item => item.id === result.id)
        if (index >= 0)
          personaCandidates.value.splice(index, 1, result)
        else
          personaCandidates.value = [result, ...personaCandidates.value]
      }
      lastError.value = null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      personaLoading.value = false
    }
  }

  async function reindexEmbeddings(payload: Omit<AlicizationMemoryEmbeddingReindexPayload, 'cardId'> = {}) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchReindexEmbeddings)
      return null
    reindexLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchReindexEmbeddings!(payload)
      reindexResult.value = result
      lastError.value = result.errors[0] ?? null
      await refreshSnapshot(snapshot.value?.sessionId ?? null)
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      reindexLoading.value = false
    }
  }

  return {
    activeTab,
    snapshot,
    longTermItems,
    longTermFilters,
    longTermNextCursor,
    personaCandidates,
    personaNextCursor,
    personaLoading,
    reindexLoading,
    reindexResult,
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
    loadMoreLongTerm,
    applyReviewAction,
    runRecallProbe,
    refreshPersonaCandidates,
    applyPersonaCandidateAction,
    reindexEmbeddings,
  }
})
