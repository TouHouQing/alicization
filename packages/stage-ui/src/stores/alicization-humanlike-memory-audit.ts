import type {
  AlicizationCorrectHumanlikeMemoryAuditPayload,
  AlicizationHumanlikeMemoryAuditEntry,
  AlicizationHumanlikeMemoryCorrectionRecord,
  AlicizationListHumanlikeMemoryAuditPayload,
} from './alicization-bridge'

import { errorMessageFrom } from '@moeru/std'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { getAlicizationBridge, hasAlicizationBridge } from './alicization-bridge'

const defaultAuditLimit = 100
const maxAuditLimit = 500

export interface AlicizationHumanlikeMemoryCorrectionDraft {
  candidateId: string
  field: string
  previousValue: string
  correctedValue: string
  reason: string
}

function trimToUndefined(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized || undefined
}

function normalizeLimit(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed))
    return defaultAuditLimit
  return Math.max(1, Math.min(maxAuditLimit, Math.floor(parsed)))
}

function normalizeAuditQuery(payload: AlicizationListHumanlikeMemoryAuditPayload): AlicizationListHumanlikeMemoryAuditPayload {
  return {
    decisionTraceId: trimToUndefined(payload.decisionTraceId),
    turnId: trimToUndefined(payload.turnId),
    limit: normalizeLimit(payload.limit),
  }
}

function normalizeCorrectionPayload(payload: AlicizationCorrectHumanlikeMemoryAuditPayload): AlicizationCorrectHumanlikeMemoryAuditPayload {
  return {
    candidateId: trimToUndefined(payload.candidateId) ?? '',
    field: trimToUndefined(payload.field) ?? '',
    previousValue: trimToUndefined(payload.previousValue),
    correctedValue: trimToUndefined(payload.correctedValue) ?? '',
    reason: trimToUndefined(payload.reason),
    decisionTraceId: trimToUndefined(payload.decisionTraceId),
    turnId: trimToUndefined(payload.turnId),
    sessionId: trimToUndefined(payload.sessionId),
  }
}

function sortAuditEntries(entries: AlicizationHumanlikeMemoryAuditEntry[]) {
  return [...entries].sort((left, right) => {
    if (left.createdAt !== right.createdAt)
      return right.createdAt - left.createdAt
    return left.id.localeCompare(right.id)
  })
}

function createEmptyCorrectionDraft(): AlicizationHumanlikeMemoryCorrectionDraft {
  return {
    candidateId: '',
    field: '',
    previousValue: '',
    correctedValue: '',
    reason: '',
  }
}

export const useAlicizationHumanlikeMemoryAuditStore = defineStore('alicization-humanlike-memory-audit', () => {
  const entries = ref<AlicizationHumanlikeMemoryAuditEntry[]>([])
  const selectedEntryId = ref<string | null>(null)
  const correctionDraft = ref<AlicizationHumanlikeMemoryCorrectionDraft>(createEmptyCorrectionDraft())
  const loading = ref(false)
  const correcting = ref(false)
  const lastError = ref<string | null>(null)
  const lastCorrection = ref<AlicizationHumanlikeMemoryCorrectionRecord | null>(null)

  const hasEntries = computed(() => entries.value.length > 0)
  const selectedEntry = computed(() => {
    if (!selectedEntryId.value)
      return null
    return entries.value.find(entry => entry.id === selectedEntryId.value) ?? null
  })

  function selectEntry(candidateId: string | null | undefined) {
    selectedEntryId.value = trimToUndefined(candidateId) ?? null
    const entry = selectedEntry.value
    if (!entry)
      return
    correctionDraft.value = {
      candidateId: entry.id,
      field: entry.userCorrectableFields[0] ?? 'relationshipContext',
      previousValue: entry.relationshipContext,
      correctedValue: '',
      reason: '',
    }
  }

  function clearCorrectionDraft() {
    correctionDraft.value = createEmptyCorrectionDraft()
  }

  function clearAudit() {
    entries.value = []
    selectedEntryId.value = null
    lastCorrection.value = null
    lastError.value = null
    clearCorrectionDraft()
  }

  async function loadAudit(payload: AlicizationListHumanlikeMemoryAuditPayload = {}) {
    if (!hasAlicizationBridge()) {
      entries.value = []
      selectedEntryId.value = null
      lastError.value = null
      return [] as AlicizationHumanlikeMemoryAuditEntry[]
    }

    const bridge = getAlicizationBridge()
    if (!bridge.listHumanlikeMemoryAudit) {
      entries.value = []
      selectedEntryId.value = null
      lastError.value = null
      return [] as AlicizationHumanlikeMemoryAuditEntry[]
    }

    loading.value = true
    try {
      const rows = await bridge.listHumanlikeMemoryAudit(normalizeAuditQuery(payload))
      const normalizedRows = sortAuditEntries(Array.isArray(rows) ? rows : [])
      entries.value = normalizedRows
      if (selectedEntryId.value && !normalizedRows.some(entry => entry.id === selectedEntryId.value))
        selectedEntryId.value = null
      lastError.value = null
      return normalizedRows
    }
    catch (error) {
      entries.value = []
      selectedEntryId.value = null
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return [] as AlicizationHumanlikeMemoryAuditEntry[]
    }
    finally {
      loading.value = false
    }
  }

  async function correctAuditEntry(payload: AlicizationCorrectHumanlikeMemoryAuditPayload) {
    if (!hasAlicizationBridge()) {
      lastError.value = null
      return null
    }

    const bridge = getAlicizationBridge()
    if (!bridge.correctHumanlikeMemoryAudit) {
      lastError.value = null
      return null
    }

    const normalizedPayload = normalizeCorrectionPayload(payload)
    if (!normalizedPayload.candidateId || !normalizedPayload.field || !normalizedPayload.correctedValue) {
      lastError.value = 'missing-humanlike-memory-correction-fields'
      return null
    }

    correcting.value = true
    try {
      const correction = await bridge.correctHumanlikeMemoryAudit(normalizedPayload)
      lastCorrection.value = correction
      entries.value = entries.value.map((entry) => {
        if (entry.id !== correction.candidateId)
          return entry
        return {
          ...entry,
          corrections: [...entry.corrections, correction],
        }
      })
      clearCorrectionDraft()
      lastError.value = null
      return correction
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      correcting.value = false
    }
  }

  return {
    entries,
    selectedEntryId,
    selectedEntry,
    correctionDraft,
    loading,
    correcting,
    lastError,
    lastCorrection,
    hasEntries,
    selectEntry,
    clearCorrectionDraft,
    clearAudit,
    loadAudit,
    correctAuditEntry,
  }
})
