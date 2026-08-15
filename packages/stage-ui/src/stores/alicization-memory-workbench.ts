import type {
  AlicizationMemoryEmbeddingConnectionTestPayload,
  AlicizationMemoryEmbeddingConnectionTestResult,
  AlicizationMemoryEmbeddingModelInfo,
  AlicizationMemoryEmbeddingModelListPayload,
  AlicizationMemoryEmbeddingModelListResult,
  AlicizationMemoryEmbeddingProgress,
  AlicizationMemoryEmbeddingReindexDeadLetterItem,
  AlicizationMemoryEmbeddingReindexPayload,
  AlicizationMemoryEmbeddingReindexResult,
  AlicizationMemoryQualityTrialReport,
  AlicizationMemoryRecallProbeResult,
  AlicizationMemoryReviewActionPayload,
  AlicizationMemoryWorkbenchItem,
  AlicizationMemoryWorkbenchListPayload,
  AlicizationMemoryWorkbenchSnapshot,
  AlicizationPersonaCandidateListPayload,
  AlicizationPersonaCandidateWorkbenchDecision,
  AlicizationPersonaCandidateWorkbenchItem,
  AlicizationPersonaTrainingDatasetExamplePolicyPayload,
  AlicizationPersonaTrainingDatasetExportResult,
  AlicizationPersonaTrainingDatasetSnapshot,
  AlicizationPersonaTrainingDatasetStagePayload,
  AlicizationPersonaTrainingPipelineIncrement,
  AlicizationPersonaTrainingPipelineResult,
  AlicizationSkillWorkbenchItem,
  AlicizationMemoryQualityGoldLabelItem as BridgeMemoryQualityGoldLabelItem,
  AlicizationMemoryQualityGoldLabelPayload as BridgeMemoryQualityGoldLabelPayload,
  AlicizationMemoryQualityMonthlyGoldRegressionPack as BridgeMemoryQualityMonthlyGoldRegressionPack,
} from './alicization-bridge'

import { errorMessageFrom } from '@moeru/std'
import { useIntervalFn } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { getAlicizationBridge, hasAlicizationBridge } from './alicization-bridge'

export type AlicizationMemoryWorkbenchTab = 'working' | 'long-term' | 'review' | 'probe' | 'persona' | 'quality' | 'health' | 'skills'
export type AlicizationMemoryQualityGoldLabelReason = 'wrong-thread' | 'expired' | 'not-needed' | 'should-abstain'
export type AlicizationMemoryQualityGoldLabelPayload = Omit<BridgeMemoryQualityGoldLabelPayload, 'cardId'> & {
  reason?: AlicizationMemoryQualityGoldLabelReason | null
}
export type AlicizationMemoryQualityGoldLabelItem = BridgeMemoryQualityGoldLabelItem & {
  reason: AlicizationMemoryQualityGoldLabelReason | null
}
export type AlicizationMemoryQualityMonthlyGoldRegressionPack = Omit<BridgeMemoryQualityMonthlyGoldRegressionPack, 'items'> & {
  items: AlicizationMemoryQualityGoldLabelItem[]
}

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
  const personaTrainingDataset = ref<AlicizationPersonaTrainingDatasetSnapshot | null>(null)
  const personaTrainingDatasetLoading = ref(false)
  const personaTrainingDatasetExport = ref<AlicizationPersonaTrainingDatasetExportResult | null>(null)
  const personaTrainingIncrements = ref<AlicizationPersonaTrainingPipelineIncrement[]>([])
  const personaTrainingRunLoading = ref(false)
  const personaTrainingRun = ref<AlicizationPersonaTrainingPipelineResult | null>(null)
  const skills = ref<AlicizationSkillWorkbenchItem[]>([])
  const skillLoading = ref(false)
  const reindexLoading = ref(false)
  const reindexResult = ref<AlicizationMemoryEmbeddingReindexResult | null>(null)
  const reindexDeadLetterItems = ref<AlicizationMemoryEmbeddingReindexDeadLetterItem[]>([])
  const embeddingModels = ref<AlicizationMemoryEmbeddingModelInfo[]>([])
  const embeddingModelDiscoveryLoading = ref(false)
  const embeddingModelDiscoveryResult = ref<AlicizationMemoryEmbeddingModelListResult | null>(null)
  const embeddingConnectionTesting = ref(false)
  const embeddingConnectionTest = ref<AlicizationMemoryEmbeddingConnectionTestResult | null>(null)
  const qualityTrialLoading = ref(false)
  const qualityTrialReport = ref<AlicizationMemoryQualityTrialReport | null>(null)
  const goldLabelLoading = ref(false)
  const goldLabelMonth = ref(new Date().toISOString().slice(0, 7))
  const monthlyGoldLabels = ref<AlicizationMemoryQualityGoldLabelItem[]>([])
  const monthlyGoldRegressionPack = ref<AlicizationMemoryQualityMonthlyGoldRegressionPack | null>(null)
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
  const activeReindexStatuses = new Set(['queued', 'running', 'cancel_requested'])
  const { pause: pauseReindexPolling, resume: resumeReindexPolling } = useIntervalFn(async () => {
    const progress = reindexResult.value?.progress
    if (!progress || !activeReindexStatuses.has(progress.status)) {
      pauseReindexPolling()
      return
    }
    if (!reindexLoading.value)
      await refreshReindexJob(progress.jobId)
  }, 2_000, { immediate: false })

  function updateReindexResult(result: AlicizationMemoryEmbeddingReindexResult) {
    reindexResult.value = result
    reindexDeadLetterItems.value = result.deadLetterItems ?? []
    lastError.value = result.errors[0] ?? result.progress?.lastError ?? null
    if (result.progress && activeReindexStatuses.has(result.progress.status))
      resumeReindexPolling()
    else
      pauseReindexPolling()
  }

  function restoreReindexProgress(progress: AlicizationMemoryEmbeddingProgress | null | undefined) {
    if (!progress)
      return
    updateReindexResult({
      jobId: progress.jobId,
      status: progress.status,
      scheduled: progress.total,
      indexed: progress.indexed,
      failed: progress.deadLettered,
      modelId: progress.modelId,
      dimensions: progress.dimensions,
      vectorSpaceId: progress.vectorSpaceId,
      errors: progress.lastError ? [progress.lastError] : [],
      deadLetterItems: [],
      progress,
    })
  }

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
      restoreReindexProgress(next.health.embedding.reindexJob)
      lastError.value = next.health.embedding.reindexJob?.lastError ?? null
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
      ...filters,
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

  async function refreshPersonaTrainingDataset() {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchGetPersonaTrainingDataset)
      return null
    personaTrainingDatasetLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchGetPersonaTrainingDataset!()
      personaTrainingDataset.value = result
      lastError.value = null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      personaTrainingDatasetLoading.value = false
    }
  }

  async function stagePersonaTrainingDataset(
    consent: Omit<AlicizationPersonaTrainingDatasetStagePayload['consent'], 'capturedAt'>,
  ) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchStagePersonaTrainingDataset)
      return null
    personaTrainingDatasetLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchStagePersonaTrainingDataset!({ consent })
      await refreshPersonaTrainingDataset()
      lastError.value = null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      personaTrainingDatasetLoading.value = false
    }
  }

  async function exportPersonaTrainingDataset(datasetId?: string | null) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchExportPersonaTrainingDataset)
      return null
    personaTrainingDatasetLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchExportPersonaTrainingDataset!({ datasetId })
      personaTrainingDatasetExport.value = result
      await refreshPersonaTrainingDataset()
      lastError.value = null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      personaTrainingDatasetLoading.value = false
    }
  }

  async function activatePersonaTrainingDataset(datasetId: string) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchActivatePersonaTrainingDataset)
      return null
    personaTrainingDatasetLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchActivatePersonaTrainingDataset!({ datasetId })
      await refreshPersonaTrainingDataset()
      lastError.value = null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      personaTrainingDatasetLoading.value = false
    }
  }

  async function rollbackPersonaTrainingDataset(datasetId: string) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchRollbackPersonaTrainingDataset)
      return null
    personaTrainingDatasetLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchRollbackPersonaTrainingDataset!({ datasetId })
      await refreshPersonaTrainingDataset()
      lastError.value = null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      personaTrainingDatasetLoading.value = false
    }
  }

  async function setPersonaTrainingDatasetExamplePolicy(
    payload: Omit<AlicizationPersonaTrainingDatasetExamplePolicyPayload, 'cardId'>,
  ) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchSetPersonaTrainingDatasetExamplePolicy)
      return null
    personaTrainingDatasetLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchSetPersonaTrainingDatasetExamplePolicy!(payload)
      await refreshPersonaTrainingDataset()
      lastError.value = null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      personaTrainingDatasetLoading.value = false
    }
  }

  async function revokePersonaTrainingDatasetSource(sourceId: string) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchRevokePersonaTrainingDatasetSource)
      return null
    personaTrainingDatasetLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchRevokePersonaTrainingDatasetSource!({ sourceId })
      await refreshPersonaTrainingDataset()
      lastError.value = null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      personaTrainingDatasetLoading.value = false
    }
  }

  async function refreshPersonaTrainingIncrements() {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListPersonaTrainingIncrements)
      return []
    personaTrainingRunLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListPersonaTrainingIncrements!()
      personaTrainingIncrements.value = result.items
      lastError.value = null
      return result.items
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return []
    }
    finally {
      personaTrainingRunLoading.value = false
    }
  }

  async function runPersonaTraining(datasetId?: string | null) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchRunPersonaTraining)
      return null
    personaTrainingRunLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchRunPersonaTraining!({ datasetId })
      personaTrainingRun.value = result
      await refreshPersonaTrainingIncrements()
      lastError.value = result.status === 'failed' ? result.error : null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      personaTrainingRunLoading.value = false
    }
  }

  async function rollbackPersonaTrainingIncrement(incrementId: string) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchRollbackPersonaTrainingIncrement)
      return null
    personaTrainingRunLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchRollbackPersonaTrainingIncrement!({ incrementId })
      await refreshPersonaTrainingIncrements()
      lastError.value = null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      personaTrainingRunLoading.value = false
    }
  }

  async function refreshSkills(productionOnly = false) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().skillWorkbenchList)
      return []
    skillLoading.value = true
    try {
      const result = await getAlicizationBridge().skillWorkbenchList!({ productionOnly })
      skills.value = result.items
      lastError.value = null
      return result.items
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return []
    }
    finally {
      skillLoading.value = false
    }
  }

  async function transitionSkill(
    action: 'skillWorkbenchActivate' | 'skillWorkbenchRollback' | 'skillWorkbenchRevoke',
    id: string,
    version: string,
  ) {
    if (!hasAlicizationBridge() || !getAlicizationBridge()[action])
      return null
    skillLoading.value = true
    try {
      const result = await getAlicizationBridge()[action]!({ id, version })
      const index = skills.value.findIndex(item => item.id === result.id && item.version === result.version)
      if (index >= 0)
        skills.value.splice(index, 1, result)
      else
        skills.value = [result, ...skills.value]
      await refreshSkills(false)
      lastError.value = null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      skillLoading.value = false
    }
  }

  async function activateSkill(id: string, version: string) {
    return await transitionSkill('skillWorkbenchActivate', id, version)
  }

  async function rollbackSkill(id: string, version: string) {
    return await transitionSkill('skillWorkbenchRollback', id, version)
  }

  async function revokeSkill(id: string, version: string) {
    return await transitionSkill('skillWorkbenchRevoke', id, version)
  }

  function normalizeGoldLabelMonth(month?: string | null) {
    const normalized = typeof month === 'string' ? month.trim() : ''
    return /^\d{4}-\d{2}$/u.test(normalized)
      ? normalized
      : goldLabelMonth.value
  }

  const memoryQualityGoldReasonNotePrefix = '[[alicization-memory-quality-reason:'

  function encodeMemoryQualityGoldReasonNote(reason: AlicizationMemoryQualityGoldLabelReason | null | undefined, note: string | null | undefined) {
    const normalizedNote = typeof note === 'string' ? note.trim() : ''
    return reason
      ? `${memoryQualityGoldReasonNotePrefix}${reason}]]${normalizedNote ? `\n${normalizedNote}` : ''}`
      : note
  }

  async function loadMonthlyGoldLabels(month?: string | null) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListQualityGoldLabels)
      return []
    const resolvedMonth = normalizeGoldLabelMonth(month)
    goldLabelLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListQualityGoldLabels!({
        month: resolvedMonth,
        limit: 200,
      })
      goldLabelMonth.value = resolvedMonth
      monthlyGoldLabels.value = result.items as AlicizationMemoryQualityGoldLabelItem[]
      lastError.value = null
      return result.items
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return []
    }
    finally {
      goldLabelLoading.value = false
    }
  }

  async function applyGoldLabel(payload: Omit<AlicizationMemoryQualityGoldLabelPayload, 'cardId'>) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchRecordQualityGoldLabel)
      return null
    goldLabelLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchRecordQualityGoldLabel!({
        ...payload,
        month: normalizeGoldLabelMonth(payload.month),
        note: encodeMemoryQualityGoldReasonNote(payload.reason, payload.note),
      })
      goldLabelMonth.value = result.month
      const typedResult = result as AlicizationMemoryQualityGoldLabelItem
      const index = monthlyGoldLabels.value.findIndex(item => item.id === typedResult.id)
      if (index >= 0)
        monthlyGoldLabels.value.splice(index, 1, typedResult)
      else
        monthlyGoldLabels.value = [typedResult, ...monthlyGoldLabels.value]
      lastError.value = null
      return typedResult
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      goldLabelLoading.value = false
    }
  }

  async function buildMonthlyGoldRegression(month?: string | null) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchBuildMonthlyGoldRegression)
      return null
    const resolvedMonth = normalizeGoldLabelMonth(month)
    goldLabelLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchBuildMonthlyGoldRegression!({
        month: resolvedMonth,
      })
      goldLabelMonth.value = result.month
      monthlyGoldRegressionPack.value = result as AlicizationMemoryQualityMonthlyGoldRegressionPack
      monthlyGoldLabels.value = result.items as AlicizationMemoryQualityGoldLabelItem[]
      lastError.value = null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      goldLabelLoading.value = false
    }
  }

  async function runQualityTrial(
    month?: string | null,
    replayPackId?: string | null,
    mode: 'historical-replay' | 'live-provider' = 'historical-replay',
  ) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchRunQualityTrial)
      return null
    const resolvedMonth = normalizeGoldLabelMonth(month)
    qualityTrialLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchRunQualityTrial!({
        mode,
        month: resolvedMonth,
        ...(replayPackId ? { replayPackId } : {}),
      })
      goldLabelMonth.value = resolvedMonth
      qualityTrialReport.value = result
      lastError.value = result.summary.lastError
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      qualityTrialLoading.value = false
    }
  }

  async function reindexEmbeddings(payload: Omit<AlicizationMemoryEmbeddingReindexPayload, 'cardId'> = {}) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchReindexEmbeddings)
      return null
    reindexLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchReindexEmbeddings!({
        ...payload,
        action: 'start',
      })
      updateReindexResult(result)
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

  async function refreshReindexJob(jobId: string) {
    if (!jobId.trim() || !hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchReindexEmbeddings)
      return null
    reindexLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchReindexEmbeddings!({
        action: 'status',
        jobId,
      })
      updateReindexResult(result)
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

  async function cancelReindexJob(jobId: string, reason?: string | null) {
    if (!jobId.trim() || !hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchReindexEmbeddings)
      return null
    reindexLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchReindexEmbeddings!({
        action: 'cancel',
        jobId,
        reason,
      })
      updateReindexResult(result)
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

  async function retryDeadLetterReindex(jobId: string, itemIds?: string[]) {
    if (!jobId.trim() || !hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchReindexEmbeddings)
      return null
    reindexLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchReindexEmbeddings!({
        action: 'retry-dead-letter',
        jobId,
        itemIds,
      })
      updateReindexResult(result)
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

  async function discoverEmbeddingModels(payload: Omit<AlicizationMemoryEmbeddingModelListPayload, 'cardId'>) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListEmbeddingModels)
      return null
    embeddingModelDiscoveryLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListEmbeddingModels!(payload)
      embeddingModelDiscoveryResult.value = result
      embeddingModels.value = result.items
      lastError.value = result.error
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      embeddingModelDiscoveryLoading.value = false
    }
  }

  async function testEmbeddingConnection(payload: Omit<AlicizationMemoryEmbeddingConnectionTestPayload, 'cardId'>) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchTestEmbeddingConnection)
      return null
    embeddingConnectionTesting.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchTestEmbeddingConnection!(payload)
      embeddingConnectionTest.value = result
      lastError.value = result.error
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      embeddingConnectionTesting.value = false
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
    personaTrainingDataset,
    personaTrainingDatasetLoading,
    personaTrainingDatasetExport,
    personaTrainingIncrements,
    personaTrainingRunLoading,
    personaTrainingRun,
    skills,
    skillLoading,
    reindexLoading,
    reindexResult,
    reindexDeadLetterItems,
    embeddingModels,
    embeddingModelDiscoveryLoading,
    embeddingModelDiscoveryResult,
    embeddingConnectionTesting,
    embeddingConnectionTest,
    qualityTrialLoading,
    qualityTrialReport,
    goldLabelLoading,
    goldLabelMonth,
    monthlyGoldLabels,
    monthlyGoldRegressionPack,
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
    refreshPersonaTrainingDataset,
    stagePersonaTrainingDataset,
    exportPersonaTrainingDataset,
    activatePersonaTrainingDataset,
    rollbackPersonaTrainingDataset,
    setPersonaTrainingDatasetExamplePolicy,
    revokePersonaTrainingDatasetSource,
    refreshPersonaTrainingIncrements,
    runPersonaTraining,
    rollbackPersonaTrainingIncrement,
    refreshSkills,
    activateSkill,
    rollbackSkill,
    revokeSkill,
    loadMonthlyGoldLabels,
    applyGoldLabel,
    buildMonthlyGoldRegression,
    runQualityTrial,
    reindexEmbeddings,
    refreshReindexJob,
    cancelReindexJob,
    retryDeadLetterReindex,
    discoverEmbeddingModels,
    testEmbeddingConnection,
  }
})
