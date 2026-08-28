import type {
  AlicizationLongTermMemoryReviewItem,
  AlicizationMemoryEmbeddingConnectionTestPayload,
  AlicizationMemoryEmbeddingConnectionTestResult,
  AlicizationMemoryEmbeddingModelInfo,
  AlicizationMemoryEmbeddingModelListPayload,
  AlicizationMemoryEmbeddingModelListResult,
  AlicizationMemoryEmbeddingProgress,
  AlicizationMemoryEmbeddingReindexDeadLetterItem,
  AlicizationMemoryEmbeddingReindexPayload,
  AlicizationMemoryEmbeddingReindexResult,
  AlicizationMemoryLongTermActionDecision,
  AlicizationMemoryQualityConversationSample,
  AlicizationMemoryQualityTrialReportRecordSurface,
  AlicizationMemoryQualityTrialReportSurface,
  AlicizationMemoryRecallProbeResult,
  AlicizationMemoryReplaySessionSummary,
  AlicizationMemoryReviewActionPayload,
  AlicizationMemorySemanticScaleJob,
  AlicizationMemorySemanticScaleJobTier,
  AlicizationMemoryWorkbenchItem,
  AlicizationMemoryWorkbenchListPayload,
  AlicizationMemoryWorkbenchReviewListPayload,
  AlicizationMemoryWorkbenchSnapshot,
  AlicizationMemoryWorkbenchTombstoneItem,
  AlicizationPersonaCandidateListPayload,
  AlicizationPersonaCandidateWorkbenchDecision,
  AlicizationPersonaCandidateWorkbenchItem,
  AlicizationPersonaRuntimeConfig,
  AlicizationPersonaRuntimeConfigState,
  AlicizationPersonaRuntimeConnectionResult,
  AlicizationPersonaTrainingDatasetExamplePolicyPayload,
  AlicizationPersonaTrainingDatasetExportResult,
  AlicizationPersonaTrainingDatasetRevokePayload,
  AlicizationPersonaTrainingDatasetSnapshot,
  AlicizationPersonaTrainingDatasetStagePayload,
  AlicizationPersonaTrainingExecutorConfig,
  AlicizationPersonaTrainingExecutorConfigState,
  AlicizationPersonaTrainingExecutorConnectionResult,
  AlicizationPersonaTrainingPipelineIncrement,
  AlicizationPersonaTrainingPipelineRunRecord,
  AlicizationPersonaTrainingSourceRevokeIntent,
  AlicizationPersonaTrainingSourceRevokeIntentStatus,
  AlicizationSkillWorkbenchItem,
  AlicizationWorkingMemoryCleaningQueueItem,
  AlicizationWorkingMemoryCleaningQueuePayload,
  AlicizationMemoryQualityGoldLabelItem as BridgeMemoryQualityGoldLabelItem,
  AlicizationMemoryQualityGoldLabelPayload as BridgeMemoryQualityGoldLabelPayload,
  AlicizationSimpleRecallGoldReason as BridgeMemoryQualityGoldLabelReason,
  AlicizationMemoryQualityMonthlyGoldRegressionPack as BridgeMemoryQualityMonthlyGoldRegressionPack,
} from './alicization-bridge'

import { errorMessageFrom } from '@moeru/std'
import { useIntervalFn } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { getAlicizationBridge, hasAlicizationBridge } from './alicization-bridge'

export type AlicizationMemoryWorkbenchTab = 'working' | 'long-term' | 'tombstones' | 'review' | 'probe' | 'persona' | 'quality' | 'health' | 'skills'
export type AlicizationMemoryQualityGoldLabelReason = BridgeMemoryQualityGoldLabelReason
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
type ReviewFilters = Omit<Required<Pick<
  AlicizationMemoryWorkbenchReviewListPayload,
  'kind' | 'query' | 'sensitivity' | 'visibility' | 'training'
>>, 'cardId'>

const DEFAULT_LONG_TERM_FILTERS: LongTermFilters = {
  query: '',
  kind: 'all',
  sensitivity: 'all',
  visibility: 'all',
  training: 'all',
  source: '',
}

const DEFAULT_REVIEW_FILTERS: ReviewFilters = {
  query: '',
  kind: 'all',
  sensitivity: 'all',
  visibility: 'all',
  training: 'all',
}

export const useAlicizationMemoryWorkbenchStore = defineStore('alicization-memory-workbench', () => {
  const activeTab = ref<AlicizationMemoryWorkbenchTab>('working')
  const snapshot = ref<AlicizationMemoryWorkbenchSnapshot | null>(null)
  const longTermItems = ref<AlicizationMemoryWorkbenchItem[]>([])
  const longTermFilters = ref<LongTermFilters>({ ...DEFAULT_LONG_TERM_FILTERS })
  const longTermAppliedFilters = ref<LongTermFilters>({ ...DEFAULT_LONG_TERM_FILTERS })
  const longTermNextCursor = ref<string | null>(null)
  const longTermLoaded = ref(false)
  const longTermError = ref<string | null>(null)
  const tombstoneItems = ref<AlicizationMemoryWorkbenchTombstoneItem[]>([])
  const tombstoneNextCursor = ref<string | null>(null)
  const tombstoneLoaded = ref(false)
  const tombstoneLoading = ref(false)
  const tombstoneError = ref<string | null>(null)
  const tombstoneRestoreLoadingId = ref<string | null>(null)
  const reviewQueueItems = ref<AlicizationLongTermMemoryReviewItem[]>([])
  const reviewFilters = ref<ReviewFilters>({ ...DEFAULT_REVIEW_FILTERS })
  const reviewAppliedFilters = ref<ReviewFilters>({ ...DEFAULT_REVIEW_FILTERS })
  const reviewNextCursor = ref<string | null>(null)
  const reviewLoaded = ref(false)
  const reviewListLoading = ref(false)
  const reviewError = ref<string | null>(null)
  const workingMemoryCleaningFailures = ref<AlicizationWorkingMemoryCleaningQueueItem[]>([])
  const workingMemoryCleaningFailuresNextCursor = ref<string | null>(null)
  const workingMemoryCleaningRetriedItems = ref<AlicizationWorkingMemoryCleaningQueueItem[]>([])
  const workingMemoryCleaningLoading = ref(false)
  const personaCandidates = ref<AlicizationPersonaCandidateWorkbenchItem[]>([])
  const personaNextCursor = ref<string | null>(null)
  const personaAppliedStatus = ref<AlicizationPersonaCandidateListPayload['status']>('all')
  const personaLoading = ref(false)
  const personaTrainingDataset = ref<AlicizationPersonaTrainingDatasetSnapshot | null>(null)
  const personaTrainingDatasetLoading = ref(false)
  const personaTrainingDatasetExport = ref<AlicizationPersonaTrainingDatasetExportResult | null>(null)
  const personaTrainingIncrements = ref<AlicizationPersonaTrainingPipelineIncrement[]>([])
  const personaTrainingRunLoading = ref(false)
  const personaTrainingRun = ref<AlicizationPersonaTrainingPipelineRunRecord | null>(null)
  const personaTrainingRuns = ref<AlicizationPersonaTrainingPipelineRunRecord[]>([])
  const personaTrainingSourceRevokeIntents = ref<AlicizationPersonaTrainingSourceRevokeIntent[]>([])
  const personaTrainingSourceRevokeIntentsLoading = ref(false)
  const personaTrainingExecutorConfigState = ref<AlicizationPersonaTrainingExecutorConfigState>({
    configured: false,
    config: null,
    error: null,
  })
  const personaTrainingExecutorConnection = ref<AlicizationPersonaTrainingExecutorConnectionResult | null>(null)
  const personaTrainingExecutorLoading = ref(false)
  const personaRuntimeConfigState = ref<AlicizationPersonaRuntimeConfigState>({
    configured: false,
    config: null,
    active: false,
    artifactId: null,
    routeBaseUrl: null,
    error: null,
  })
  const personaRuntimeConnection = ref<AlicizationPersonaRuntimeConnectionResult | null>(null)
  const personaRuntimeLoading = ref(false)
  const skills = ref<AlicizationSkillWorkbenchItem[]>([])
  const skillLoading = ref(false)
  const reindexLoading = ref(false)
  const reindexResult = ref<AlicizationMemoryEmbeddingReindexResult | null>(null)
  const reindexDeadLetterItems = ref<AlicizationMemoryEmbeddingReindexDeadLetterItem[]>([])
  const semanticScaleTier = ref<AlicizationMemorySemanticScaleJobTier>('10k')
  const semanticScaleJob = ref<AlicizationMemorySemanticScaleJob | null>(null)
  const semanticScaleJobs = ref<AlicizationMemorySemanticScaleJob[]>([])
  const semanticScaleLoading = ref(false)
  const embeddingModels = ref<AlicizationMemoryEmbeddingModelInfo[]>([])
  const embeddingModelDiscoveryLoading = ref(false)
  const embeddingModelDiscoveryResult = ref<AlicizationMemoryEmbeddingModelListResult | null>(null)
  const embeddingConnectionTesting = ref(false)
  const embeddingConnectionTest = ref<AlicizationMemoryEmbeddingConnectionTestResult | null>(null)
  const qualityTrialLoading = ref(false)
  const qualityTrialReport = ref<AlicizationMemoryQualityTrialReportSurface | null>(null)
  const qualityTrialReports = ref<AlicizationMemoryQualityTrialReportRecordSurface[]>([])
  const qualityTrialReportsNextCursor = ref<string | null>(null)
  const qualityTrialReportsLoading = ref(false)
  const qualityReplaySessions = ref<AlicizationMemoryReplaySessionSummary[]>([])
  const qualityReplaySessionsLoading = ref(false)
  const qualityReplaySessionsNextCursor = ref<string | null>(null)
  const qualityConversationSamples = ref<AlicizationMemoryQualityConversationSample[]>([])
  const qualityConversationSamplesNextCursor = ref<string | null>(null)
  const qualityConversationSamplesLoading = ref(false)
  const selectedQualityConversationSampleId = ref<string | null>(null)
  const selectedQualitySessionId = ref('')
  const qualityTrialMode = ref<'historical-replay' | 'live-provider'>('historical-replay')
  let qualityReplaySessionsRevision = 0
  let qualityConversationSamplesRequestRevision = 0
  let qualityTrialContextRevision = 0
  let cardScopeRevision = 0
  let snapshotRequestRevision = 0
  let longTermRequestRevision = 0
  let tombstoneRequestRevision = 0
  let reviewRequestRevision = 0
  let embeddingModelDiscoveryRevision = 0
  let embeddingConnectionTestRevision = 0
  let semanticScaleContextRevision = 0
  let personaRequestRevision = 0
  let goldLabelRequestRevision = 0
  let recallProbeRequestRevision = 0
  let personaTrainingContextRevision = 0
  let personaTrainingRunLoadingCount = 0
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
  const reviewItems = computed(() => reviewQueueItems.value)
  const health = computed(() => snapshot.value?.health ?? null)
  const pendingReviewCount = computed(() => snapshot.value?.review.pending ?? 0)
  const activeReindexStatuses = new Set(['queued', 'running', 'cancel_requested'])
  const terminalReindexStatuses = new Set(['completed', 'cancelled', 'failed'])
  const { pause: pauseReindexPolling, resume: resumeReindexPolling } = useIntervalFn(async () => {
    const progress = reindexResult.value?.progress
    if (!progress || !activeReindexStatuses.has(progress.status)) {
      pauseReindexPolling()
      return
    }
    if (!reindexLoading.value)
      await refreshReindexJob(progress.jobId)
  }, 2_000, { immediate: false })
  const activeSemanticScaleStatuses = new Set(['queued', 'running', 'cancel_requested'])
  const { pause: pauseSemanticScalePolling, resume: resumeSemanticScalePolling } = useIntervalFn(async () => {
    const job = semanticScaleJob.value
    if (!job || !activeSemanticScaleStatuses.has(job.status)) {
      pauseSemanticScalePolling()
      return
    }
    if (!semanticScaleLoading.value)
      await refreshSemanticScaleJob(job.jobId, { select: false })
  }, 2_000, { immediate: false })
  const activePersonaTrainingStatuses = new Set(['queued', 'running', 'cancel_requested', 'terminalizing'])
  const { pause: pausePersonaTrainingPolling, resume: resumePersonaTrainingPolling } = useIntervalFn(async () => {
    const run = personaTrainingRun.value
    if (!run || !activePersonaTrainingStatuses.has(run.status)) {
      pausePersonaTrainingPolling()
      return
    }
    if (!personaTrainingRunLoading.value)
      await refreshPersonaTrainingRun(run.runId)
  }, 2_000, { immediate: false })

  function beginPersonaTrainingRunLoading(revision: number) {
    if (revision !== personaTrainingContextRevision)
      return
    personaTrainingRunLoadingCount += 1
    personaTrainingRunLoading.value = true
  }

  function endPersonaTrainingRunLoading(revision: number) {
    if (revision !== personaTrainingContextRevision)
      return
    personaTrainingRunLoadingCount = Math.max(0, personaTrainingRunLoadingCount - 1)
    personaTrainingRunLoading.value = personaTrainingRunLoadingCount > 0
  }

  function updateReindexResult(
    result: AlicizationMemoryEmbeddingReindexResult,
    revision = cardScopeRevision,
  ) {
    if (revision !== cardScopeRevision)
      return false
    reindexResult.value = result
    reindexDeadLetterItems.value = result.deadLetterItems ?? []
    lastError.value = result.errors[0] ?? result.progress?.lastError ?? null
    if (result.progress && activeReindexStatuses.has(result.progress.status))
      resumeReindexPolling()
    else
      pauseReindexPolling()
    return true
  }

  function restoreReindexProgress(
    progress: AlicizationMemoryEmbeddingProgress | null | undefined,
    revision = cardScopeRevision,
  ) {
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
    }, revision)
  }

  function syncSemanticScalePolling() {
    if (semanticScaleJob.value && activeSemanticScaleStatuses.has(semanticScaleJob.value.status))
      resumeSemanticScalePolling()
    else
      pauseSemanticScalePolling()
  }

  function updateSemanticScaleResult(
    result: {
      job: AlicizationMemorySemanticScaleJob | null
      jobs: AlicizationMemorySemanticScaleJob[]
    },
    options?: {
      selectJob?: boolean
    },
  ) {
    const selectedJobId = semanticScaleJob.value?.jobId ?? null
    if (result.job && options?.selectJob !== false)
      semanticScaleJob.value = result.job
    const byId = new Map(semanticScaleJobs.value.map(job => [job.jobId, job]))
    for (const job of result.jobs)
      byId.set(job.jobId, job)
    if (result.job)
      byId.set(result.job.jobId, result.job)
    semanticScaleJobs.value = [...byId.values()]
      .sort((left, right) => right.createdAt - left.createdAt || right.jobId.localeCompare(left.jobId))
    if (options?.selectJob === false && selectedJobId)
      semanticScaleJob.value = byId.get(selectedJobId) ?? semanticScaleJob.value
    lastError.value = semanticScaleJob.value?.lastError ?? null
    syncSemanticScalePolling()
  }

  function selectSemanticScaleJob(jobId: string) {
    const job = semanticScaleJobs.value.find(item => item.jobId === jobId) ?? null
    if (!job)
      return null
    semanticScaleJob.value = job
    lastError.value = job.lastError
    syncSemanticScalePolling()
    return job
  }

  async function loadSemanticScaleJobs() {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchManageSemanticScaleJobs)
      return []
    const revision = semanticScaleContextRevision
    semanticScaleLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchManageSemanticScaleJobs!({
        action: 'list',
        limit: 30,
      })
      if (revision !== semanticScaleContextRevision)
        return []
      semanticScaleJobs.value = result.jobs
      semanticScaleJob.value = semanticScaleJob.value
        ? result.jobs.find(job => job.jobId === semanticScaleJob.value?.jobId) ?? result.job
        : result.job
      lastError.value = semanticScaleJob.value?.lastError ?? null
      syncSemanticScalePolling()
      return result.jobs
    }
    catch (error) {
      if (revision === semanticScaleContextRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return []
    }
    finally {
      if (revision === semanticScaleContextRevision)
        semanticScaleLoading.value = false
    }
  }

  async function startSemanticScaleJob(tier: AlicizationMemorySemanticScaleJobTier = semanticScaleTier.value) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchManageSemanticScaleJobs)
      return null
    const revision = semanticScaleContextRevision
    semanticScaleLoading.value = true
    semanticScaleTier.value = tier
    try {
      const result = await getAlicizationBridge().memoryWorkbenchManageSemanticScaleJobs!({
        action: 'start',
        tier,
      })
      if (revision !== semanticScaleContextRevision)
        return null
      updateSemanticScaleResult(result)
      return result.job
    }
    catch (error) {
      if (revision === semanticScaleContextRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      if (revision === semanticScaleContextRevision)
        semanticScaleLoading.value = false
    }
  }

  async function refreshSemanticScaleJob(
    jobId: string,
    options?: {
      select?: boolean
    },
  ) {
    if (!jobId.trim() || !hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchManageSemanticScaleJobs)
      return null
    const revision = semanticScaleContextRevision
    semanticScaleLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchManageSemanticScaleJobs!({
        action: 'status',
        jobId,
      })
      if (revision !== semanticScaleContextRevision)
        return null
      updateSemanticScaleResult(result, {
        selectJob: options?.select ?? true,
      })
      return result.job
    }
    catch (error) {
      if (revision === semanticScaleContextRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      if (revision === semanticScaleContextRevision)
        semanticScaleLoading.value = false
    }
  }

  async function cancelSemanticScaleJob(jobId: string, reason?: string | null) {
    if (!jobId.trim() || !hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchManageSemanticScaleJobs)
      return null
    const revision = semanticScaleContextRevision
    semanticScaleLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchManageSemanticScaleJobs!({
        action: 'cancel',
        jobId,
        reason,
      })
      if (revision !== semanticScaleContextRevision)
        return null
      updateSemanticScaleResult(result)
      return result.job
    }
    catch (error) {
      if (revision === semanticScaleContextRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      if (revision === semanticScaleContextRevision)
        semanticScaleLoading.value = false
    }
  }

  async function retrySemanticScaleJob(jobId: string) {
    if (!jobId.trim() || !hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchManageSemanticScaleJobs)
      return null
    const revision = semanticScaleContextRevision
    semanticScaleLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchManageSemanticScaleJobs!({
        action: 'retry',
        jobId,
      })
      if (revision !== semanticScaleContextRevision)
        return null
      updateSemanticScaleResult(result)
      return result.job
    }
    catch (error) {
      if (revision === semanticScaleContextRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      if (revision === semanticScaleContextRevision)
        semanticScaleLoading.value = false
    }
  }

  function resetSemanticScaleJobContext() {
    semanticScaleContextRevision += 1
    pauseSemanticScalePolling()
    semanticScaleTier.value = '10k'
    semanticScaleJob.value = null
    semanticScaleJobs.value = []
    semanticScaleLoading.value = false
  }

  function resetCardScope() {
    cardScopeRevision += 1
    snapshotRequestRevision += 1
    longTermRequestRevision += 1
    tombstoneRequestRevision += 1
    reviewRequestRevision += 1
    personaRequestRevision += 1
    goldLabelRequestRevision += 1
    recallProbeRequestRevision += 1
    snapshot.value = null
    longTermItems.value = []
    longTermAppliedFilters.value = { ...longTermFilters.value }
    longTermNextCursor.value = null
    longTermLoaded.value = false
    longTermError.value = null
    listLoading.value = false
    tombstoneItems.value = []
    tombstoneNextCursor.value = null
    tombstoneLoaded.value = false
    tombstoneLoading.value = false
    tombstoneError.value = null
    tombstoneRestoreLoadingId.value = null
    reviewQueueItems.value = []
    reviewAppliedFilters.value = { ...reviewFilters.value }
    reviewNextCursor.value = null
    reviewLoaded.value = false
    reviewListLoading.value = false
    reviewError.value = null
    workingMemoryCleaningFailures.value = []
    workingMemoryCleaningFailuresNextCursor.value = null
    workingMemoryCleaningRetriedItems.value = []
    workingMemoryCleaningLoading.value = false
    personaCandidates.value = []
    personaNextCursor.value = null
    personaAppliedStatus.value = 'all'
    personaLoading.value = false
    personaTrainingDataset.value = null
    personaTrainingDatasetExport.value = null
    personaTrainingDatasetLoading.value = false
    personaTrainingSourceRevokeIntents.value = []
    personaTrainingSourceRevokeIntentsLoading.value = false
    skills.value = []
    skillLoading.value = false
    reindexResult.value = null
    reindexDeadLetterItems.value = []
    reindexLoading.value = false
    pauseReindexPolling()
    embeddingModels.value = []
    embeddingModelDiscoveryResult.value = null
    embeddingConnectionTest.value = null
    embeddingModelDiscoveryRevision += 1
    embeddingConnectionTestRevision += 1
    embeddingModelDiscoveryLoading.value = false
    embeddingConnectionTesting.value = false
    monthlyGoldLabels.value = []
    monthlyGoldRegressionPack.value = null
    goldLabelLoading.value = false
    recallProbe.value = null
    probeLoading.value = false
    resetQualityTrialContext()
    resetSemanticScaleJobContext()
    resetPersonaTrainingScope()
    lastError.value = null
  }

  async function restoreReindexDeadLetterItems(jobId: string, revision: number) {
    if (
      !jobId.trim()
      || revision !== cardScopeRevision
      || !hasAlicizationBridge()
      || !getAlicizationBridge().memoryWorkbenchReindexEmbeddings
    ) {
      return null
    }
    try {
      const result = await getAlicizationBridge().memoryWorkbenchReindexEmbeddings!({
        action: 'status',
        jobId,
      })
      if (revision !== cardScopeRevision)
        return null
      updateReindexResult(result, revision)
      return result
    }
    catch (error) {
      if (revision === cardScopeRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
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
    const revision = cardScopeRevision
    const requestRevision = ++snapshotRequestRevision
    loading.value = true
    try {
      const next = await bridge.memoryWorkbenchGetSnapshot({ sessionId })
      if (
        revision !== cardScopeRevision
        || requestRevision !== snapshotRequestRevision
      ) {
        return null
      }
      snapshot.value = next
      restoreReindexProgress(next.health.embedding.reindexJob, revision)
      lastError.value = next.health.embedding.reindexJob?.lastError ?? null
      if (next.health.embedding.reindexJob?.status === 'failed') {
        await restoreReindexDeadLetterItems(next.health.embedding.reindexJob.jobId, revision)
      }
      if (
        revision !== cardScopeRevision
        || requestRevision !== snapshotRequestRevision
      ) {
        return null
      }
      return next
    }
    catch (error) {
      if (
        revision === cardScopeRevision
        && requestRevision === snapshotRequestRevision
      ) {
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      }
      return null
    }
    finally {
      if (
        revision === cardScopeRevision
        && requestRevision === snapshotRequestRevision
      ) {
        loading.value = false
      }
    }
  }

  function buildLongTermPayload(filters: LongTermFilters, cursor: string | null = null) {
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
    const scopeRevision = cardScopeRevision
    const requestRevision = ++longTermRequestRevision
    const previousAppliedFilters = { ...longTermAppliedFilters.value }
    const nextFilters = {
      ...longTermFilters.value,
      ...filters,
    }
    longTermFilters.value = nextFilters
    longTermError.value = null
    listLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListLongTerm!(buildLongTermPayload(nextFilters, null))
      if (
        scopeRevision !== cardScopeRevision
        || requestRevision !== longTermRequestRevision
      ) {
        return []
      }
      longTermItems.value = result.items
      longTermAppliedFilters.value = { ...nextFilters }
      longTermNextCursor.value = result.nextCursor
      longTermLoaded.value = true
      longTermError.value = null
      return result.items
    }
    catch (error) {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === longTermRequestRevision
      ) {
        longTermFilters.value = previousAppliedFilters
        longTermError.value = errorMessageFrom(error) ?? 'unknown-error'
      }
      return []
    }
    finally {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === longTermRequestRevision
      ) {
        listLoading.value = false
      }
    }
  }

  async function loadMoreLongTerm() {
    if (!longTermNextCursor.value || !hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListLongTerm)
      return []
    const scopeRevision = cardScopeRevision
    const requestRevision = ++longTermRequestRevision
    const cursor = longTermNextCursor.value
    longTermError.value = null
    listLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListLongTerm!(
        buildLongTermPayload(longTermAppliedFilters.value, cursor),
      )
      if (
        scopeRevision !== cardScopeRevision
        || requestRevision !== longTermRequestRevision
      ) {
        return []
      }
      longTermItems.value = [
        ...longTermItems.value,
        ...result.items,
      ]
      longTermNextCursor.value = result.nextCursor
      longTermError.value = null
      return result.items
    }
    catch (error) {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === longTermRequestRevision
      ) {
        longTermError.value = errorMessageFrom(error) ?? 'unknown-error'
      }
      return []
    }
    finally {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === longTermRequestRevision
      ) {
        listLoading.value = false
      }
    }
  }

  async function refreshTombstones() {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListTombstones)
      return []
    const scopeRevision = cardScopeRevision
    const requestRevision = ++tombstoneRequestRevision
    tombstoneError.value = null
    tombstoneLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListTombstones!({
        limit: 50,
        cursor: null,
      })
      if (
        scopeRevision !== cardScopeRevision
        || requestRevision !== tombstoneRequestRevision
      ) {
        return []
      }
      tombstoneItems.value = result.items
      tombstoneNextCursor.value = result.nextCursor
      tombstoneLoaded.value = true
      tombstoneError.value = null
      return result.items
    }
    catch (error) {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === tombstoneRequestRevision
      ) {
        tombstoneError.value = errorMessageFrom(error) ?? 'unknown-error'
      }
      return []
    }
    finally {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === tombstoneRequestRevision
      ) {
        tombstoneLoading.value = false
      }
    }
  }

  async function loadMoreTombstones() {
    if (!tombstoneNextCursor.value || !hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListTombstones)
      return []
    const scopeRevision = cardScopeRevision
    const requestRevision = ++tombstoneRequestRevision
    const cursor = tombstoneNextCursor.value
    tombstoneError.value = null
    tombstoneLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListTombstones!({
        limit: 50,
        cursor,
      })
      if (
        scopeRevision !== cardScopeRevision
        || requestRevision !== tombstoneRequestRevision
      ) {
        return []
      }
      tombstoneItems.value = [
        ...tombstoneItems.value,
        ...result.items,
      ]
      tombstoneNextCursor.value = result.nextCursor
      tombstoneError.value = null
      return result.items
    }
    catch (error) {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === tombstoneRequestRevision
      ) {
        tombstoneError.value = errorMessageFrom(error) ?? 'unknown-error'
      }
      return []
    }
    finally {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === tombstoneRequestRevision
      ) {
        tombstoneLoading.value = false
      }
    }
  }

  async function restoreTombstone(tombstoneId: string) {
    const normalizedId = tombstoneId.trim()
    if (!normalizedId || !hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchRestoreTombstone)
      return null
    const scopeRevision = cardScopeRevision
    tombstoneRestoreLoadingId.value = normalizedId
    tombstoneError.value = null
    try {
      const result = await getAlicizationBridge().memoryWorkbenchRestoreTombstone!({
        tombstoneId: normalizedId,
      })
      if (scopeRevision !== cardScopeRevision)
        return null
      await Promise.all([
        refreshTombstones(),
        refreshLongTerm(),
        refreshSnapshot(snapshot.value?.sessionId ?? null),
      ])
      return result
    }
    catch (error) {
      if (scopeRevision === cardScopeRevision)
        tombstoneError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      if (scopeRevision === cardScopeRevision)
        tombstoneRestoreLoadingId.value = null
    }
  }

  async function ensureActiveTabLoaded() {
    if (activeTab.value === 'long-term' && !longTermLoaded.value && !listLoading.value)
      await refreshLongTerm()
    if (activeTab.value === 'tombstones' && !tombstoneLoaded.value && !tombstoneLoading.value)
      await refreshTombstones()
    if (activeTab.value === 'review' && !reviewLoaded.value && !reviewListLoading.value)
      await refreshReview()
  }

  async function selectTab(tab: AlicizationMemoryWorkbenchTab) {
    activeTab.value = tab
    await ensureActiveTabLoaded()
  }

  async function refreshActiveTab() {
    const listRefresh = activeTab.value === 'long-term'
      ? refreshLongTerm()
      : activeTab.value === 'tombstones'
        ? refreshTombstones()
        : activeTab.value === 'review'
          ? refreshReview()
          : Promise.resolve([])
    await Promise.all([
      refreshSnapshot(snapshot.value?.sessionId ?? null),
      listRefresh,
    ])
  }

  async function applyLongTermAction(
    memoryItemId: string,
    decision: AlicizationMemoryLongTermActionDecision,
    source?: string,
  ) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchApplyLongTermAction)
      return null
    reviewActionLoadingId.value = memoryItemId
    try {
      const result = await getAlicizationBridge().memoryWorkbenchApplyLongTermAction!({
        memoryItemId,
        source,
        decision,
      })
      await refreshLongTerm()
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

  async function refreshWorkingMemoryCleaningFailures() {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchManageWorkingMemoryCleaningQueue)
      return []
    const revision = cardScopeRevision
    workingMemoryCleaningFailuresNextCursor.value = null
    workingMemoryCleaningLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchManageWorkingMemoryCleaningQueue!({
        action: 'list',
        limit: 24,
        cursor: null,
      })
      if (revision !== cardScopeRevision)
        return []
      workingMemoryCleaningFailures.value = result.items
      workingMemoryCleaningFailuresNextCursor.value = result.nextCursor
      workingMemoryCleaningRetriedItems.value = result.retried
      lastError.value = null
      return result.items
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return []
    }
    finally {
      if (revision === cardScopeRevision)
        workingMemoryCleaningLoading.value = false
    }
  }

  async function loadMoreWorkingMemoryCleaningFailures() {
    if (
      !workingMemoryCleaningFailuresNextCursor.value
      || !hasAlicizationBridge()
      || !getAlicizationBridge().memoryWorkbenchManageWorkingMemoryCleaningQueue
    ) {
      return []
    }
    const revision = cardScopeRevision
    workingMemoryCleaningLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchManageWorkingMemoryCleaningQueue!({
        action: 'list',
        limit: 24,
        cursor: workingMemoryCleaningFailuresNextCursor.value,
      })
      if (revision !== cardScopeRevision)
        return []
      workingMemoryCleaningFailures.value = [
        ...workingMemoryCleaningFailures.value,
        ...result.items,
      ]
      workingMemoryCleaningFailuresNextCursor.value = result.nextCursor
      lastError.value = null
      return result.items
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return []
    }
    finally {
      if (revision === cardScopeRevision)
        workingMemoryCleaningLoading.value = false
    }
  }

  async function retryWorkingMemoryCleaningFailures(itemIds?: string[]) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchManageWorkingMemoryCleaningQueue)
      return null
    const revision = cardScopeRevision
    workingMemoryCleaningLoading.value = true
    try {
      const payload: Omit<AlicizationWorkingMemoryCleaningQueuePayload, 'cardId'> = {
        action: 'retry-dead-letter',
        itemIds,
        limit: 24,
        cursor: null,
      }
      const result = await getAlicizationBridge().memoryWorkbenchManageWorkingMemoryCleaningQueue!(payload)
      if (revision !== cardScopeRevision)
        return null
      workingMemoryCleaningFailures.value = result.items
      workingMemoryCleaningFailuresNextCursor.value = result.nextCursor
      workingMemoryCleaningRetriedItems.value = result.retried
      await refreshSnapshot(snapshot.value?.sessionId ?? null)
      lastError.value = null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      if (revision === cardScopeRevision)
        workingMemoryCleaningLoading.value = false
    }
  }

  function buildReviewPayload(filters: ReviewFilters, cursor: string | null) {
    return {
      query: filters.query.trim() || undefined,
      kind: filters.kind,
      sensitivity: filters.sensitivity,
      visibility: filters.visibility,
      training: filters.training,
      limit: 50,
      cursor,
    } satisfies Omit<AlicizationMemoryWorkbenchReviewListPayload, 'cardId'>
  }

  async function refreshReview(filters?: Partial<ReviewFilters>) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListReview)
      return []
    const scopeRevision = cardScopeRevision
    const requestRevision = ++reviewRequestRevision
    const nextFilters = {
      ...reviewFilters.value,
      ...filters,
    }
    reviewFilters.value = nextFilters
    reviewError.value = null
    reviewListLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListReview!(buildReviewPayload(nextFilters, null))
      if (
        scopeRevision !== cardScopeRevision
        || requestRevision !== reviewRequestRevision
      ) {
        return []
      }
      reviewQueueItems.value = result.items
      reviewAppliedFilters.value = { ...nextFilters }
      reviewNextCursor.value = result.nextCursor
      reviewLoaded.value = true
      reviewError.value = null
      return result.items
    }
    catch (error) {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === reviewRequestRevision
      ) {
        reviewError.value = errorMessageFrom(error) ?? 'unknown-error'
      }
      return []
    }
    finally {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === reviewRequestRevision
      ) {
        reviewListLoading.value = false
      }
    }
  }

  async function loadMoreReview() {
    if (!reviewNextCursor.value || !hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListReview)
      return []
    const scopeRevision = cardScopeRevision
    const requestRevision = ++reviewRequestRevision
    const cursor = reviewNextCursor.value
    reviewError.value = null
    reviewListLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListReview!(
        buildReviewPayload(reviewAppliedFilters.value, cursor),
      )
      if (
        scopeRevision !== cardScopeRevision
        || requestRevision !== reviewRequestRevision
      ) {
        return []
      }
      reviewQueueItems.value = [
        ...reviewQueueItems.value,
        ...result.items,
      ]
      reviewNextCursor.value = result.nextCursor
      reviewError.value = null
      return result.items
    }
    catch (error) {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === reviewRequestRevision
      ) {
        reviewError.value = errorMessageFrom(error) ?? 'unknown-error'
      }
      return []
    }
    finally {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === reviewRequestRevision
      ) {
        reviewListLoading.value = false
      }
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
      if (result) {
        if (decision === 'approve' || decision === 'reject' || decision === 'tombstone') {
          reviewQueueItems.value = reviewQueueItems.value.filter(item => item.id !== reviewItemId)
        }
        else {
          reviewQueueItems.value = reviewQueueItems.value.map(item => item.id === reviewItemId ? result : item)
        }
      }
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
    const scopeRevision = cardScopeRevision
    const requestRevision = ++recallProbeRequestRevision
    const sessionId = snapshot.value?.sessionId ?? null
    recallQuery.value = normalized
    probeLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchRecallProbe!({
        query: normalized,
        sessionId,
        includeWorkingMemory: true,
        limit: 8,
      })
      if (
        scopeRevision !== cardScopeRevision
        || requestRevision !== recallProbeRequestRevision
      ) {
        return null
      }
      recallProbe.value = result
      lastError.value = null
      return result
    }
    catch (error) {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === recallProbeRequestRevision
      ) {
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      }
      return null
    }
    finally {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === recallProbeRequestRevision
      ) {
        probeLoading.value = false
      }
    }
  }

  async function refreshPersonaCandidates(status: AlicizationPersonaCandidateListPayload['status'] = 'all') {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListPersonaCandidates)
      return []
    const revision = cardScopeRevision
    const requestRevision = ++personaRequestRevision
    personaLoading.value = true
    personaNextCursor.value = null
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListPersonaCandidates!({
        status,
        limit: 50,
        cursor: null,
      })
      if (
        revision !== cardScopeRevision
        || requestRevision !== personaRequestRevision
      ) {
        return []
      }
      personaCandidates.value = result.items
      personaNextCursor.value = result.nextCursor
      personaAppliedStatus.value = status
      lastError.value = null
      return result.items
    }
    catch (error) {
      if (
        revision === cardScopeRevision
        && requestRevision === personaRequestRevision
      ) {
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      }
      return []
    }
    finally {
      if (
        revision === cardScopeRevision
        && requestRevision === personaRequestRevision
      ) {
        personaLoading.value = false
      }
    }
  }

  async function loadMorePersonaCandidates() {
    const cursor = personaNextCursor.value
    if (
      !cursor
      || personaLoading.value
      || !hasAlicizationBridge()
      || !getAlicizationBridge().memoryWorkbenchListPersonaCandidates
    ) {
      return []
    }
    const revision = cardScopeRevision
    const requestRevision = ++personaRequestRevision
    personaLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListPersonaCandidates!({
        status: personaAppliedStatus.value,
        limit: 50,
        cursor,
      })
      if (
        revision !== cardScopeRevision
        || requestRevision !== personaRequestRevision
      ) {
        return []
      }
      const knownIds = new Set(personaCandidates.value.map(item => item.id))
      personaCandidates.value = [
        ...personaCandidates.value,
        ...result.items.filter(item => !knownIds.has(item.id)),
      ]
      personaNextCursor.value = result.nextCursor
      lastError.value = null
      return result.items
    }
    catch (error) {
      if (
        revision === cardScopeRevision
        && requestRevision === personaRequestRevision
      ) {
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      }
      return []
    }
    finally {
      if (
        revision === cardScopeRevision
        && requestRevision === personaRequestRevision
      ) {
        personaLoading.value = false
      }
    }
  }

  async function applyPersonaCandidateAction(
    candidateId: string,
    decision: AlicizationPersonaCandidateWorkbenchDecision,
    reason?: string | null,
  ) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchApplyPersonaCandidateAction)
      return null
    const scopeRevision = cardScopeRevision
    const requestRevision = ++personaRequestRevision
    personaLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchApplyPersonaCandidateAction!({
        candidateId,
        decision,
        reason,
      })
      if (
        scopeRevision !== cardScopeRevision
        || requestRevision !== personaRequestRevision
      ) {
        return null
      }
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
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === personaRequestRevision
      ) {
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      }
      return null
    }
    finally {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === personaRequestRevision
      ) {
        personaLoading.value = false
      }
    }
  }

  async function refreshPersonaTrainingDataset() {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchGetPersonaTrainingDataset)
      return null
    const revision = cardScopeRevision
    personaTrainingDatasetLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchGetPersonaTrainingDataset!()
      if (revision !== cardScopeRevision)
        return null
      personaTrainingDataset.value = result
      lastError.value = null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      if (revision === cardScopeRevision)
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
    let operationError: string | null = null
    personaTrainingDatasetLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchActivatePersonaTrainingDataset!({ datasetId })
      return result
    }
    catch (error) {
      operationError = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      await refreshPersonaTrainingState()
      if (operationError)
        lastError.value = operationError
      personaTrainingDatasetLoading.value = false
    }
  }

  async function rollbackPersonaTrainingDataset(datasetId: string) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchRollbackPersonaTrainingDataset)
      return null
    let operationError: string | null = null
    personaTrainingDatasetLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchRollbackPersonaTrainingDataset!({ datasetId })
      return result
    }
    catch (error) {
      operationError = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      await refreshPersonaTrainingState()
      if (operationError)
        lastError.value = operationError
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

  async function revokePersonaTrainingDatasetSource(
    sourceRef: Omit<AlicizationPersonaTrainingDatasetRevokePayload, 'cardId'>,
  ) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchRevokePersonaTrainingDatasetSource)
      return null
    let operationError: string | null = null
    personaTrainingDatasetLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchRevokePersonaTrainingDatasetSource!({
        sourceId: sourceRef.sourceId,
        sourceKind: sourceRef.sourceKind,
      })
      return result
    }
    catch (error) {
      operationError = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      await refreshPersonaTrainingState()
      if (operationError)
        lastError.value = operationError
      personaTrainingDatasetLoading.value = false
    }
  }

  async function refreshPersonaTrainingSourceRevokeIntents(
    status: AlicizationPersonaTrainingSourceRevokeIntentStatus | 'all' = 'all',
  ) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListPersonaTrainingSourceRevokeIntents)
      return []
    const revision = personaTrainingContextRevision
    personaTrainingSourceRevokeIntentsLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListPersonaTrainingSourceRevokeIntents!({
        status,
        limit: 64,
      })
      if (revision !== personaTrainingContextRevision)
        return []
      personaTrainingSourceRevokeIntents.value = result.items
      lastError.value = null
      return result.items
    }
    catch (error) {
      if (revision === personaTrainingContextRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return []
    }
    finally {
      if (revision === personaTrainingContextRevision)
        personaTrainingSourceRevokeIntentsLoading.value = false
    }
  }

  async function retryPersonaTrainingSourceRevokeIntent(intentId: string) {
    const normalizedIntentId = intentId.trim()
    if (
      !normalizedIntentId
      || !hasAlicizationBridge()
      || !getAlicizationBridge().memoryWorkbenchRetryPersonaTrainingSourceRevokeIntent
    ) {
      return null
    }
    const revision = personaTrainingContextRevision
    personaTrainingSourceRevokeIntentsLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchRetryPersonaTrainingSourceRevokeIntent!({
        intentId: normalizedIntentId,
      })
      if (revision !== personaTrainingContextRevision)
        return null
      await Promise.all([
        refreshPersonaTrainingSourceRevokeIntents(),
        refreshPersonaTrainingState(),
      ])
      lastError.value = null
      return result.item
    }
    catch (error) {
      if (revision === personaTrainingContextRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      await refreshPersonaTrainingSourceRevokeIntents()
      return null
    }
    finally {
      if (revision === personaTrainingContextRevision)
        personaTrainingSourceRevokeIntentsLoading.value = false
    }
  }

  async function refreshPersonaTrainingState() {
    await Promise.all([
      refreshPersonaTrainingDataset(),
      refreshPersonaTrainingRuns(),
      refreshPersonaTrainingIncrements(),
      refreshPersonaTrainingSourceRevokeIntents(),
    ])
  }

  async function refreshPersonaTrainingIncrements() {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListPersonaTrainingIncrements)
      return []
    const revision = personaTrainingContextRevision
    beginPersonaTrainingRunLoading(revision)
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListPersonaTrainingIncrements!()
      if (revision !== personaTrainingContextRevision)
        return []
      personaTrainingIncrements.value = result.items
      lastError.value = null
      return result.items
    }
    catch (error) {
      if (revision === personaTrainingContextRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return []
    }
    finally {
      endPersonaTrainingRunLoading(revision)
    }
  }

  function updatePersonaTrainingRun(run: AlicizationPersonaTrainingPipelineRunRecord | null) {
    if (!run)
      return
    personaTrainingRun.value = run
    const byId = new Map(personaTrainingRuns.value.map(item => [item.runId, item]))
    byId.set(run.runId, run)
    personaTrainingRuns.value = [...byId.values()]
      .sort((left, right) => right.queuedAt - left.queuedAt || right.runId.localeCompare(left.runId))
    lastError.value = run.error
    if (activePersonaTrainingStatuses.has(run.status))
      resumePersonaTrainingPolling()
    else
      pausePersonaTrainingPolling()
  }

  async function refreshPersonaTrainingRuns(limit = 30) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListPersonaTrainingRuns)
      return []
    const revision = personaTrainingContextRevision
    beginPersonaTrainingRunLoading(revision)
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListPersonaTrainingRuns!({ limit })
      if (revision !== personaTrainingContextRevision)
        return []
      personaTrainingRuns.value = result.items
      const currentRunId = personaTrainingRun.value?.runId
      personaTrainingRun.value = currentRunId
        ? result.items.find(run => run.runId === currentRunId) ?? result.items[0] ?? null
        : result.items[0] ?? null
      if (personaTrainingRun.value && activePersonaTrainingStatuses.has(personaTrainingRun.value.status))
        resumePersonaTrainingPolling()
      else
        pausePersonaTrainingPolling()
      lastError.value = personaTrainingRun.value?.error ?? null
      return result.items
    }
    catch (error) {
      if (revision === personaTrainingContextRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return []
    }
    finally {
      endPersonaTrainingRunLoading(revision)
    }
  }

  async function refreshPersonaTrainingRun(runId: string) {
    if (!runId.trim() || !hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchGetPersonaTrainingRun)
      return null
    const revision = personaTrainingContextRevision
    beginPersonaTrainingRunLoading(revision)
    try {
      const run = await getAlicizationBridge().memoryWorkbenchGetPersonaTrainingRun!({ runId })
      if (revision !== personaTrainingContextRevision)
        return null
      updatePersonaTrainingRun(run)
      if (run && !activePersonaTrainingStatuses.has(run.status)) {
        await Promise.all([
          refreshPersonaTrainingRuns(),
          refreshPersonaTrainingIncrements(),
        ])
      }
      return run
    }
    catch (error) {
      if (revision === personaTrainingContextRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      endPersonaTrainingRunLoading(revision)
    }
  }

  async function runPersonaTraining(datasetId?: string | null) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchRunPersonaTraining)
      return null
    const revision = personaTrainingContextRevision
    beginPersonaTrainingRunLoading(revision)
    try {
      const result = await getAlicizationBridge().memoryWorkbenchRunPersonaTraining!({ datasetId })
      if (revision !== personaTrainingContextRevision)
        return null
      updatePersonaTrainingRun(result.run)
      return result.run
    }
    catch (error) {
      if (revision === personaTrainingContextRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      endPersonaTrainingRunLoading(revision)
    }
  }

  async function cancelPersonaTraining(runId: string, reason?: string | null) {
    if (!runId.trim() || !hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchCancelPersonaTraining)
      return null
    const revision = personaTrainingContextRevision
    beginPersonaTrainingRunLoading(revision)
    try {
      const run = await getAlicizationBridge().memoryWorkbenchCancelPersonaTraining!({
        runId,
        reason,
      })
      if (revision !== personaTrainingContextRevision)
        return null
      updatePersonaTrainingRun(run)
      return run
    }
    catch (error) {
      if (revision === personaTrainingContextRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      endPersonaTrainingRunLoading(revision)
    }
  }

  function resetPersonaTrainingScope() {
    personaTrainingContextRevision += 1
    personaTrainingRunLoadingCount = 0
    pausePersonaTrainingPolling()
    personaTrainingRun.value = null
    personaTrainingRuns.value = []
    personaTrainingIncrements.value = []
    personaTrainingRunLoading.value = false
  }

  async function loadPersonaTrainingExecutorConfig() {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchGetPersonaTrainingExecutorConfig)
      return null
    personaTrainingExecutorLoading.value = true
    try {
      const state = await getAlicizationBridge().memoryWorkbenchGetPersonaTrainingExecutorConfig!()
      personaTrainingExecutorConfigState.value = state
      lastError.value = state.error
      return state
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      personaTrainingExecutorLoading.value = false
    }
  }

  async function savePersonaTrainingExecutorConfig(config: AlicizationPersonaTrainingExecutorConfig | null) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchSetPersonaTrainingExecutorConfig)
      return null
    personaTrainingExecutorLoading.value = true
    try {
      const state = await getAlicizationBridge().memoryWorkbenchSetPersonaTrainingExecutorConfig!({ config })
      personaTrainingExecutorConfigState.value = state
      lastError.value = state.error
      return state
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      personaTrainingExecutorLoading.value = false
    }
  }

  async function testPersonaTrainingExecutor(config: AlicizationPersonaTrainingExecutorConfig | null) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchTestPersonaTrainingExecutor)
      return null
    personaTrainingExecutorLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchTestPersonaTrainingExecutor!({ config })
      personaTrainingExecutorConnection.value = result
      lastError.value = result.error
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      personaTrainingExecutorLoading.value = false
    }
  }

  async function loadPersonaRuntimeConfig() {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchGetPersonaRuntimeConfig)
      return null
    personaRuntimeLoading.value = true
    try {
      const state = await getAlicizationBridge().memoryWorkbenchGetPersonaRuntimeConfig!()
      personaRuntimeConfigState.value = state
      lastError.value = state.error
      return state
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      personaRuntimeLoading.value = false
    }
  }

  async function savePersonaRuntimeConfig(config: AlicizationPersonaRuntimeConfig | null) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchSetPersonaRuntimeConfig)
      return null
    personaRuntimeLoading.value = true
    try {
      const state = await getAlicizationBridge().memoryWorkbenchSetPersonaRuntimeConfig!({ config })
      personaRuntimeConfigState.value = state
      lastError.value = state.error
      return state
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      personaRuntimeLoading.value = false
    }
  }

  async function testPersonaRuntime(config: AlicizationPersonaRuntimeConfig | null) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchTestPersonaRuntime)
      return null
    personaRuntimeLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchTestPersonaRuntime!({ config })
      personaRuntimeConnection.value = result
      lastError.value = result.error
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      personaRuntimeLoading.value = false
    }
  }

  async function rollbackPersonaTrainingIncrement(incrementId: string) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchRollbackPersonaTrainingIncrement)
      return null
    const revision = personaTrainingContextRevision
    beginPersonaTrainingRunLoading(revision)
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
      endPersonaTrainingRunLoading(revision)
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

  async function loadMonthlyGoldLabels(month?: string | null) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListQualityGoldLabels)
      return []
    const scopeRevision = cardScopeRevision
    const requestRevision = ++goldLabelRequestRevision
    const resolvedMonth = normalizeGoldLabelMonth(month)
    goldLabelLoading.value = true
    try {
      const items: AlicizationMemoryQualityGoldLabelItem[] = []
      let cursor: string | null = null
      do {
        const result = await getAlicizationBridge().memoryWorkbenchListQualityGoldLabels!({
          month: resolvedMonth,
          limit: 500,
          cursor,
        })
        if (
          scopeRevision !== cardScopeRevision
          || requestRevision !== goldLabelRequestRevision
        ) {
          return []
        }
        items.push(...result.items as AlicizationMemoryQualityGoldLabelItem[])
        cursor = result.nextCursor
      } while (cursor)
      if (
        scopeRevision !== cardScopeRevision
        || requestRevision !== goldLabelRequestRevision
      ) {
        return []
      }
      goldLabelMonth.value = resolvedMonth
      monthlyGoldLabels.value = items
      lastError.value = null
      return items
    }
    catch (error) {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === goldLabelRequestRevision
      ) {
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      }
      return []
    }
    finally {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === goldLabelRequestRevision
      ) {
        goldLabelLoading.value = false
      }
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

  async function loadQualityConversationSamples() {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListQualityConversationSamples)
      return []
    const revision = qualityReplaySessionsRevision
    const requestRevision = ++qualityConversationSamplesRequestRevision
    qualityConversationSamplesLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListQualityConversationSamples!({
        limit: 20,
      })
      if (
        revision !== qualityReplaySessionsRevision
        || requestRevision !== qualityConversationSamplesRequestRevision
      ) {
        return []
      }
      qualityConversationSamples.value = result.items
      qualityConversationSamplesNextCursor.value = result.nextCursor
      selectedQualityConversationSampleId.value = result.items[0]?.id ?? null
      lastError.value = null
      return result.items
    }
    catch (error) {
      if (
        revision === qualityReplaySessionsRevision
        && requestRevision === qualityConversationSamplesRequestRevision
      ) {
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      }
      return []
    }
    finally {
      if (
        revision === qualityReplaySessionsRevision
        && requestRevision === qualityConversationSamplesRequestRevision
      ) {
        qualityConversationSamplesLoading.value = false
      }
    }
  }

  async function loadMoreQualityConversationSamples() {
    const cursor = qualityConversationSamplesNextCursor.value
    if (
      !cursor
      || qualityConversationSamplesLoading.value
      || !hasAlicizationBridge()
      || !getAlicizationBridge().memoryWorkbenchListQualityConversationSamples
    ) {
      return []
    }
    const revision = qualityReplaySessionsRevision
    const requestRevision = ++qualityConversationSamplesRequestRevision
    qualityConversationSamplesLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListQualityConversationSamples!({
        cursor,
        limit: 20,
      })
      if (
        revision !== qualityReplaySessionsRevision
        || requestRevision !== qualityConversationSamplesRequestRevision
      ) {
        return []
      }
      qualityConversationSamples.value = [
        ...qualityConversationSamples.value,
        ...result.items,
      ]
      qualityConversationSamplesNextCursor.value = result.nextCursor
      lastError.value = null
      return result.items
    }
    catch (error) {
      if (
        revision === qualityReplaySessionsRevision
        && requestRevision === qualityConversationSamplesRequestRevision
      ) {
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      }
      return []
    }
    finally {
      if (
        revision === qualityReplaySessionsRevision
        && requestRevision === qualityConversationSamplesRequestRevision
      ) {
        qualityConversationSamplesLoading.value = false
      }
    }
  }

  function selectQualityConversationSample(sampleId: string) {
    const sample = qualityConversationSamples.value.find(item => item.id === sampleId) ?? null
    if (!sample)
      return null
    selectedQualityConversationSampleId.value = sample.id
    selectedQualitySessionId.value = sample.sessionId
    return sample
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

  async function loadQualityReplaySessions() {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListReplaySessions)
      return []
    const revision = qualityReplaySessionsRevision
    qualityReplaySessionsLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListReplaySessions!({
        limit: 20,
      })
      if (revision !== qualityReplaySessionsRevision)
        return []
      // The desktop product has one dialogue continuity root. Keep the
      // renderer tolerant of stale bridge data, but never expose a second
      // replay session to the user.
      const primarySession = result.items[0] ?? null
      qualityReplaySessions.value = primarySession ? [primarySession] : []
      qualityReplaySessionsNextCursor.value = null
      selectedQualitySessionId.value = primarySession?.sessionId ?? ''
      lastError.value = null
      return qualityReplaySessions.value
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return []
    }
    finally {
      if (revision === qualityReplaySessionsRevision)
        qualityReplaySessionsLoading.value = false
    }
  }

  async function loadMoreQualityReplaySessions() {
    const cursor = qualityReplaySessionsNextCursor.value
    if (
      !cursor
      || qualityReplaySessionsLoading.value
      || !hasAlicizationBridge()
      || !getAlicizationBridge().memoryWorkbenchListReplaySessions
    ) {
      return []
    }
    const revision = qualityReplaySessionsRevision
    qualityReplaySessionsLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListReplaySessions!({
        cursor,
        limit: 20,
      })
      if (revision !== qualityReplaySessionsRevision)
        return []
      const primarySession = qualityReplaySessions.value[0] ?? result.items[0] ?? null
      qualityReplaySessions.value = primarySession ? [primarySession] : []
      qualityReplaySessionsNextCursor.value = null
      selectedQualitySessionId.value = primarySession?.sessionId ?? ''
      lastError.value = null
      return qualityReplaySessions.value
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return []
    }
    finally {
      if (revision === qualityReplaySessionsRevision)
        qualityReplaySessionsLoading.value = false
    }
  }

  function selectQualityTrialSession(sessionId: string) {
    const nextSessionId = sessionId.trim()
    if (nextSessionId === selectedQualitySessionId.value)
      return
    void cancelQualityTrial('质量试用会话已切换')
    selectedQualitySessionId.value = nextSessionId
  }

  function setQualityTrialMode(mode: 'historical-replay' | 'live-provider') {
    if (mode === qualityTrialMode.value)
      return
    void cancelQualityTrial('质量试用模式已切换')
    qualityTrialMode.value = mode
  }

  function resetQualityTrialContext() {
    void cancelQualityTrial('质量试用上下文已重置')
    qualityReplaySessionsRevision += 1
    qualityConversationSamplesRequestRevision += 1
    qualityTrialReports.value = []
    qualityTrialReportsNextCursor.value = null
    qualityTrialReportsLoading.value = false
    qualityReplaySessions.value = []
    qualityReplaySessionsNextCursor.value = null
    qualityReplaySessionsLoading.value = false
    qualityConversationSamples.value = []
    qualityConversationSamplesNextCursor.value = null
    qualityConversationSamplesLoading.value = false
    selectedQualityConversationSampleId.value = null
    selectedQualitySessionId.value = ''
    qualityTrialMode.value = 'historical-replay'
  }

  async function cancelQualityTrial(reason = '质量试用已取消') {
    const shouldCancelRemoteTrial = qualityTrialLoading.value
    qualityTrialReport.value = null
    qualityTrialLoading.value = false
    qualityTrialContextRevision += 1
    if (!shouldCancelRemoteTrial || !hasAlicizationBridge())
      return null
    const cancelRemoteTrial = getAlicizationBridge().memoryWorkbenchCancelQualityTrial
    if (!cancelRemoteTrial)
      return null
    try {
      const result = await cancelRemoteTrial({
        reason,
      })
      if (result.cancelled)
        lastError.value = null
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
  }

  async function loadQualityTrialReports() {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListQualityTrialReports)
      return []
    const revision = cardScopeRevision
    const contextRevision = qualityTrialContextRevision
    qualityTrialReportsLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListQualityTrialReports!({
        limit: 20,
      })
      if (revision !== cardScopeRevision)
        return []
      qualityTrialReports.value = result.items
      qualityTrialReportsNextCursor.value = result.nextCursor
      const restoredFirstReport = contextRevision === qualityTrialContextRevision
        && !qualityTrialReport.value
        && Boolean(result.items[0])
      if (restoredFirstReport)
        selectQualityTrialReport(result.items[0].id)
      else if (contextRevision === qualityTrialContextRevision && !qualityTrialReport.value)
        lastError.value = null
      return result.items
    }
    catch (error) {
      if (revision === cardScopeRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return []
    }
    finally {
      if (revision === cardScopeRevision)
        qualityTrialReportsLoading.value = false
    }
  }

  async function loadMoreQualityTrialReports() {
    const cursor = qualityTrialReportsNextCursor.value
    if (
      !cursor
      || qualityTrialReportsLoading.value
      || !hasAlicizationBridge()
      || !getAlicizationBridge().memoryWorkbenchListQualityTrialReports
    ) {
      return []
    }
    const revision = cardScopeRevision
    qualityTrialReportsLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListQualityTrialReports!({
        cursor,
        limit: 20,
      })
      if (revision !== cardScopeRevision)
        return []
      const knownIds = new Set(qualityTrialReports.value.map(item => item.id))
      qualityTrialReports.value = [
        ...qualityTrialReports.value,
        ...result.items.filter(item => !knownIds.has(item.id)),
      ]
      qualityTrialReportsNextCursor.value = result.nextCursor
      lastError.value = null
      return result.items
    }
    catch (error) {
      if (revision === cardScopeRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return []
    }
    finally {
      if (revision === cardScopeRevision)
        qualityTrialReportsLoading.value = false
    }
  }

  function selectQualityTrialReport(reportId: string) {
    const selected = qualityTrialReports.value.find(item => item.id === reportId)
    if (!selected)
      return null
    qualityTrialReport.value = selected.report
    goldLabelMonth.value = selected.month
    selectedQualitySessionId.value = selected.sessionId ?? ''
    qualityTrialMode.value = selected.mode
    lastError.value = selected.report.summary.lastError
    return selected
  }

  async function runQualityTrial(
    month?: string | null,
    _sessionId: string | null = selectedQualitySessionId.value || null,
    mode: 'historical-replay' | 'live-provider' = qualityTrialMode.value,
  ) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchRunQualityTrial)
      return null
    if (qualityTrialLoading.value)
      return null
    // The main process resolves the canonical primary session. Keep the
    // positional argument only so old internal callers remain source
    // compatible while it is no longer an authority.
    void _sessionId
    const resolvedMonth = normalizeGoldLabelMonth(month)
    const revision = qualityTrialContextRevision
    qualityTrialLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchRunQualityTrial!({
        mode,
        month: resolvedMonth,
      })
      if (revision !== qualityTrialContextRevision)
        return null
      goldLabelMonth.value = resolvedMonth
      qualityTrialReport.value = result
      await loadQualityTrialReports()
      lastError.value = result.summary.lastError
      return result
    }
    catch (error) {
      lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      if (revision === qualityTrialContextRevision)
        qualityTrialLoading.value = false
    }
  }

  async function reindexEmbeddings(payload: Omit<AlicizationMemoryEmbeddingReindexPayload, 'cardId'> = {}) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchReindexEmbeddings)
      return null
    const revision = cardScopeRevision
    reindexLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchReindexEmbeddings!({
        ...payload,
        action: 'start',
      })
      if (revision !== cardScopeRevision)
        return null
      updateReindexResult(result, revision)
      await refreshSnapshot(snapshot.value?.sessionId ?? null)
      if (revision !== cardScopeRevision)
        return null
      return result
    }
    catch (error) {
      if (revision === cardScopeRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      if (revision === cardScopeRevision)
        reindexLoading.value = false
    }
  }

  async function refreshReindexJob(jobId: string) {
    if (!jobId.trim() || !hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchReindexEmbeddings)
      return null
    const revision = cardScopeRevision
    reindexLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchReindexEmbeddings!({
        action: 'status',
        jobId,
      })
      if (revision !== cardScopeRevision)
        return null
      updateReindexResult(result, revision)
      if (result.status && terminalReindexStatuses.has(result.status))
        await refreshSnapshot(snapshot.value?.sessionId ?? null)
      if (revision !== cardScopeRevision)
        return null
      return result
    }
    catch (error) {
      if (revision === cardScopeRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      if (revision === cardScopeRevision)
        reindexLoading.value = false
    }
  }

  async function cancelReindexJob(jobId: string, reason?: string | null) {
    if (!jobId.trim() || !hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchReindexEmbeddings)
      return null
    const revision = cardScopeRevision
    reindexLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchReindexEmbeddings!({
        action: 'cancel',
        jobId,
        reason,
      })
      if (revision !== cardScopeRevision)
        return null
      updateReindexResult(result, revision)
      await refreshSnapshot(snapshot.value?.sessionId ?? null)
      if (revision !== cardScopeRevision)
        return null
      return result
    }
    catch (error) {
      if (revision === cardScopeRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      if (revision === cardScopeRevision)
        reindexLoading.value = false
    }
  }

  async function retryDeadLetterReindex(jobId: string, itemIds?: string[]) {
    if (!jobId.trim() || !hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchReindexEmbeddings)
      return null
    const revision = cardScopeRevision
    reindexLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchReindexEmbeddings!({
        action: 'retry-dead-letter',
        jobId,
        itemIds,
      })
      if (revision !== cardScopeRevision)
        return null
      updateReindexResult(result, revision)
      await refreshSnapshot(snapshot.value?.sessionId ?? null)
      if (revision !== cardScopeRevision)
        return null
      return result
    }
    catch (error) {
      if (revision === cardScopeRevision)
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      return null
    }
    finally {
      if (revision === cardScopeRevision)
        reindexLoading.value = false
    }
  }

  async function discoverEmbeddingModels(payload: Omit<AlicizationMemoryEmbeddingModelListPayload, 'cardId'>) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchListEmbeddingModels)
      return null
    const scopeRevision = cardScopeRevision
    const requestRevision = ++embeddingModelDiscoveryRevision
    embeddingModelDiscoveryLoading.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchListEmbeddingModels!(payload)
      if (
        scopeRevision !== cardScopeRevision
        || requestRevision !== embeddingModelDiscoveryRevision
      ) {
        return null
      }
      embeddingModelDiscoveryResult.value = result
      embeddingModels.value = result.items
      lastError.value = result.error
      return result
    }
    catch (error) {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === embeddingModelDiscoveryRevision
      ) {
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      }
      return null
    }
    finally {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === embeddingModelDiscoveryRevision
      ) {
        embeddingModelDiscoveryLoading.value = false
      }
    }
  }

  async function testEmbeddingConnection(payload: Omit<AlicizationMemoryEmbeddingConnectionTestPayload, 'cardId'>) {
    if (!hasAlicizationBridge() || !getAlicizationBridge().memoryWorkbenchTestEmbeddingConnection)
      return null
    const scopeRevision = cardScopeRevision
    const requestRevision = ++embeddingConnectionTestRevision
    embeddingConnectionTesting.value = true
    try {
      const result = await getAlicizationBridge().memoryWorkbenchTestEmbeddingConnection!(payload)
      if (
        scopeRevision !== cardScopeRevision
        || requestRevision !== embeddingConnectionTestRevision
      ) {
        return null
      }
      embeddingConnectionTest.value = result
      lastError.value = result.error
      return result
    }
    catch (error) {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === embeddingConnectionTestRevision
      ) {
        lastError.value = errorMessageFrom(error) ?? 'unknown-error'
      }
      return null
    }
    finally {
      if (
        scopeRevision === cardScopeRevision
        && requestRevision === embeddingConnectionTestRevision
      ) {
        embeddingConnectionTesting.value = false
      }
    }
  }

  return {
    activeTab,
    snapshot,
    longTermItems,
    longTermFilters,
    longTermNextCursor,
    longTermLoaded,
    longTermError,
    tombstoneItems,
    tombstoneNextCursor,
    tombstoneLoaded,
    tombstoneLoading,
    tombstoneError,
    tombstoneRestoreLoadingId,
    reviewFilters,
    reviewNextCursor,
    reviewLoaded,
    reviewListLoading,
    reviewError,
    workingMemoryCleaningFailures,
    workingMemoryCleaningFailuresNextCursor,
    workingMemoryCleaningRetriedItems,
    workingMemoryCleaningLoading,
    personaCandidates,
    personaNextCursor,
    personaLoading,
    personaTrainingDataset,
    personaTrainingDatasetLoading,
    personaTrainingDatasetExport,
    personaTrainingIncrements,
    personaTrainingRunLoading,
    personaTrainingRun,
    personaTrainingRuns,
    personaTrainingSourceRevokeIntents,
    personaTrainingSourceRevokeIntentsLoading,
    personaTrainingExecutorConfigState,
    personaTrainingExecutorConnection,
    personaTrainingExecutorLoading,
    personaRuntimeConfigState,
    personaRuntimeConnection,
    personaRuntimeLoading,
    skills,
    skillLoading,
    reindexLoading,
    reindexResult,
    reindexDeadLetterItems,
    semanticScaleTier,
    semanticScaleJob,
    semanticScaleJobs,
    semanticScaleLoading,
    embeddingModels,
    embeddingModelDiscoveryLoading,
    embeddingModelDiscoveryResult,
    embeddingConnectionTesting,
    embeddingConnectionTest,
    qualityTrialLoading,
    qualityTrialReport,
    qualityTrialReports,
    qualityTrialReportsNextCursor,
    qualityTrialReportsLoading,
    qualityReplaySessions,
    qualityReplaySessionsLoading,
    qualityReplaySessionsNextCursor,
    qualityConversationSamples,
    qualityConversationSamplesNextCursor,
    qualityConversationSamplesLoading,
    selectedQualityConversationSampleId,
    selectedQualitySessionId,
    qualityTrialMode,
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
    selectTab,
    ensureActiveTabLoaded,
    refreshActiveTab,
    refreshLongTerm,
    loadMoreLongTerm,
    refreshTombstones,
    loadMoreTombstones,
    restoreTombstone,
    applyLongTermAction,
    refreshReview,
    loadMoreReview,
    refreshWorkingMemoryCleaningFailures,
    loadMoreWorkingMemoryCleaningFailures,
    retryWorkingMemoryCleaningFailures,
    applyReviewAction,
    runRecallProbe,
    refreshPersonaCandidates,
    loadMorePersonaCandidates,
    applyPersonaCandidateAction,
    refreshPersonaTrainingDataset,
    stagePersonaTrainingDataset,
    exportPersonaTrainingDataset,
    activatePersonaTrainingDataset,
    rollbackPersonaTrainingDataset,
    setPersonaTrainingDatasetExamplePolicy,
    revokePersonaTrainingDatasetSource,
    refreshPersonaTrainingSourceRevokeIntents,
    retryPersonaTrainingSourceRevokeIntent,
    refreshPersonaTrainingIncrements,
    refreshPersonaTrainingRuns,
    refreshPersonaTrainingRun,
    runPersonaTraining,
    cancelPersonaTraining,
    resetPersonaTrainingScope,
    loadPersonaTrainingExecutorConfig,
    savePersonaTrainingExecutorConfig,
    testPersonaTrainingExecutor,
    loadPersonaRuntimeConfig,
    savePersonaRuntimeConfig,
    testPersonaRuntime,
    rollbackPersonaTrainingIncrement,
    refreshSkills,
    activateSkill,
    rollbackSkill,
    revokeSkill,
    loadMonthlyGoldLabels,
    loadQualityTrialReports,
    loadMoreQualityTrialReports,
    selectQualityTrialReport,
    applyGoldLabel,
    buildMonthlyGoldRegression,
    loadQualityReplaySessions,
    loadMoreQualityReplaySessions,
    loadQualityConversationSamples,
    loadMoreQualityConversationSamples,
    selectQualityConversationSample,
    selectQualityTrialSession,
    setQualityTrialMode,
    resetQualityTrialContext,
    cancelQualityTrial,
    resetCardScope,
    runQualityTrial,
    reindexEmbeddings,
    refreshReindexJob,
    cancelReindexJob,
    retryDeadLetterReindex,
    loadSemanticScaleJobs,
    startSemanticScaleJob,
    refreshSemanticScaleJob,
    selectSemanticScaleJob,
    cancelSemanticScaleJob,
    retrySemanticScaleJob,
    resetSemanticScaleJobContext,
    discoverEmbeddingModels,
    testEmbeddingConnection,
  }
})
