<script setup lang="ts">
import type {
  AlicizationMemoryQualityActionCode,
  AlicizationMemoryQualityFailureCode,
  AlicizationPersonaTrainingDatasetExample,
  AlicizationSimpleRecallGoldLabel,
} from '@proj-alicization/stage-ui/stores/alicization-bridge'
import type { AlicizationMemoryQualityGoldLabelReason } from '@proj-alicization/stage-ui/stores/alicization-memory-workbench'

import { useAlicizationMemoryWorkbenchStore } from '@proj-alicization/stage-ui/stores/alicization-memory-workbench'
import { useAiriCardStore } from '@proj-alicization/stage-ui/stores/modules/airi-card'
import { Button } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'reka-ui'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import MemoryEmbeddingConfig from './components/memory-embedding-config.vue'
import MemoryQualitySessionPicker from './components/memory-quality-session-picker.vue'
import MemoryQualityTrialHistory from './components/memory-quality-trial-history.vue'
import PersonaRuntimeConfig from './components/persona-runtime-config.vue'
import PersonaTrainingExecutorConfig from './components/persona-training-executor-config.vue'
import PersonaTrainingRuns from './components/persona-training-runs.vue'

const store = useAlicizationMemoryWorkbenchStore()
const cardStore = useAiriCardStore()
const { t } = useI18n()
const { activeCardId } = storeToRefs(cardStore)
const {
  activeTab,
  longTermItems,
  longTermFilters,
  longTermNextCursor,
  longTermError,
  tombstoneItems,
  tombstoneNextCursor,
  tombstoneLoading,
  tombstoneError,
  tombstoneRestoreLoadingId,
  reviewFilters,
  reviewNextCursor,
  reviewListLoading,
  reviewError,
  workingMemoryCleaningFailures,
  workingMemoryCleaningFailuresNextCursor,
  workingMemoryCleaningRetriedItems,
  workingMemoryCleaningLoading,
  personaCandidates,
  personaLoading,
  personaTrainingDataset,
  personaTrainingDatasetExport,
  personaTrainingDatasetLoading,
  personaTrainingSourceRevokeIntents,
  personaTrainingSourceRevokeIntentsLoading,
  skills,
  skillLoading,
  reindexLoading,
  reindexResult,
  reindexDeadLetterItems,
  semanticScaleTier,
  semanticScaleJob,
  semanticScaleJobs,
  semanticScaleLoading,
  qualityTrialLoading,
  qualityTrialReport,
  qualityTrialReports,
  qualityTrialReportsNextCursor,
  qualityTrialReportsLoading,
  qualityReplaySessions,
  qualityReplaySessionsLoading,
  qualityReplaySessionsNextCursor,
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
} = storeToRefs(store)

const reindexProgress = computed(() => reindexResult.value?.progress ?? null)
const selectedQualityTrialRecord = computed(() => {
  return qualityTrialReports.value.find(item => item.report.id === qualityTrialReport.value?.id) ?? null
})
const selectedQualityTrialReportId = computed(() => selectedQualityTrialRecord.value?.id ?? null)
// Scale soaking and raw label authoring are engineering diagnostics. The
// production validation entry and its durable reports stay visible to users.
const internalDiagnosticsVisible = import.meta.env.DEV
const personaTrainingConsentGranted = ref(false)
const personaTrainingPolicyVersion = ref('persona-training-consent-v1')
const personaTrainingScope = ref('persona-dataset')
const selectedGoldLabelReason = ref<AlicizationMemoryQualityGoldLabelReason | null>(null)
const qualityTurnId = ref('')
const qualityDecisionTraceId = ref('')
const qualityAssistantReply = ref('')
const qualityExpectedMemoryIds = ref('')
const qualitySurfacedMemoryIds = ref<string[]>([])
const pendingTombstone = ref<{
  id: string
  source?: string
  summary: string
  kind: 'long-term' | 'review'
} | null>(null)

const qualityGoldContextReady = computed(() => Boolean(
  selectedQualitySessionId.value.trim()
  && qualityTurnId.value.trim()
  && qualityAssistantReply.value.trim()
  && recallProbe.value,
))

function parseQualityMemoryIds(raw: string) {
  return [...new Set(raw
    .split(/[\s,，、]+/u)
    .map(value => value.trim())
    .filter(Boolean))]
}

function qualityEvidenceSnapshot() {
  return (recallProbe.value?.evidence ?? []).map(item => ({
    id: item.id,
    kind: item.kind,
    summary: item.summary,
    source: item.source,
    score: item.score,
    confidence: item.confidence,
    sensitivity: item.sensitivity,
    scope: item.scope,
    provenance: item.provenance,
    evidenceVersion: item.evidenceVersion,
    version: item.version,
    queryMatches: item.queryMatches,
    rankReasons: item.rankReasons,
  }))
}

function requestTombstone(input: {
  id: string
  source?: string
  summary: string
  kind: 'long-term' | 'review'
}) {
  pendingTombstone.value = input
}

function cancelTombstone() {
  pendingTombstone.value = null
}

async function confirmTombstone() {
  const pending = pendingTombstone.value
  pendingTombstone.value = null
  if (!pending)
    return
  if (pending.kind === 'long-term')
    await store.applyLongTermAction(pending.id, 'tombstone', pending.source)
  else
    await store.applyReviewAction(pending.id, 'tombstone')
}

const tabs = computed(() => [
  { id: 'working' as const, icon: 'i-solar:clipboard-list-bold-duotone', label: t('settings.pages.memory.workbench.tabs.working') },
  { id: 'long-term' as const, icon: 'i-solar:database-bold-duotone', label: t('settings.pages.memory.workbench.tabs.long_term') },
  { id: 'tombstones' as const, icon: 'i-solar:trash-bin-trash-bold-duotone', label: t('settings.pages.memory.workbench.tabs.tombstones') },
  { id: 'review' as const, icon: 'i-solar:checklist-bold-duotone', label: t('settings.pages.memory.workbench.tabs.review') },
  { id: 'probe' as const, icon: 'i-solar:magnifer-bold-duotone', label: t('settings.pages.memory.workbench.tabs.probe') },
  { id: 'persona' as const, icon: 'i-solar:user-heart-bold-duotone', label: t('settings.pages.memory.workbench.tabs.persona') },
  { id: 'quality' as const, icon: 'i-solar:clipboard-check-bold-duotone', label: t('settings.pages.memory.workbench.tabs.quality') },
  { id: 'health' as const, icon: 'i-solar:pulse-2-bold-duotone', label: t('settings.pages.memory.workbench.tabs.health') },
  { id: 'skills' as const, icon: 'i-solar:stars-bold-duotone', label: t('settings.pages.memory.workbench.tabs.skills') },
])

const kindOptions = [
  'all',
  'fact',
  'episode',
  'reflection',
  'consolidation',
] as const
const reviewKindOptions = [
  'all',
  'episode',
  'procedure',
  'relationship',
  'preference',
  'correction',
] as const
const memorySourceOptions = [
  '',
  'memory_facts',
  'memory_reflections',
  'episodic_events',
  'memory_consolidations',
] as const
const sensitivityOptions = ['all', 'public', 'personal', 'private', 'secret'] as const
const visibilityOptions = ['all', 'explicit', 'inward-only'] as const
const trainingOptions = ['all', 'allowed', 'blocked'] as const
type LongTermFilterGroup = 'kind' | 'sensitivity' | 'visibility' | 'training'

const longTermFilterLabelKeys = {
  kind: {
    all: 'settings.pages.memory.workbench.filters.kind.all',
    fact: 'settings.pages.memory.workbench.filters.kind.fact',
    episode: 'settings.pages.memory.workbench.filters.kind.episode',
    reflection: 'settings.pages.memory.workbench.filters.kind.reflection',
    consolidation: 'settings.pages.memory.workbench.filters.kind.consolidation',
    procedure: 'settings.pages.memory.workbench.filters.kind.procedure',
    relationship: 'settings.pages.memory.workbench.filters.kind.relationship',
    preference: 'settings.pages.memory.workbench.filters.kind.preference',
    correction: 'settings.pages.memory.workbench.filters.kind.correction',
    candidate: 'settings.pages.memory.workbench.filters.kind.candidate',
  },
  sensitivity: {
    all: 'settings.pages.memory.workbench.filters.sensitivity.all',
    public: 'settings.pages.memory.workbench.filters.sensitivity.public',
    personal: 'settings.pages.memory.workbench.filters.sensitivity.personal',
    private: 'settings.pages.memory.workbench.filters.sensitivity.private',
    secret: 'settings.pages.memory.workbench.filters.sensitivity.secret',
  },
  visibility: {
    'all': 'settings.pages.memory.workbench.filters.visibility.all',
    'explicit': 'settings.pages.memory.workbench.filters.visibility.explicit',
    'inward-only': 'settings.pages.memory.workbench.filters.visibility.inward_only',
  },
  training: {
    all: 'settings.pages.memory.workbench.filters.training.all',
    allowed: 'settings.pages.memory.workbench.filters.training.allowed',
    blocked: 'settings.pages.memory.workbench.filters.training.blocked',
  },
} as const

const memorySourceLabelKeys = {
  '': 'settings.pages.memory.workbench.filters.source.all',
  'memory_facts': 'settings.pages.memory.workbench.filters.source.memory_facts',
  'memory_reflections': 'settings.pages.memory.workbench.filters.source.memory_reflections',
  'episodic_events': 'settings.pages.memory.workbench.filters.source.episodic_events',
  'memory_consolidations': 'settings.pages.memory.workbench.filters.source.memory_consolidations',
} as const

const reindexStatusLabelKeys = {
  queued: 'settings.pages.memory.workbench.states.reindex_queued',
  running: 'settings.pages.memory.workbench.states.reindex_running',
  paused: 'settings.pages.memory.workbench.states.reindex_paused',
  cancel_requested: 'settings.pages.memory.workbench.states.reindex_cancel_requested',
  completed: 'settings.pages.memory.workbench.states.reindex_completed',
  cancelled: 'settings.pages.memory.workbench.states.reindex_cancelled',
  failed: 'settings.pages.memory.workbench.states.reindex_failed',
} as const

const reindexStageLabelKeys = {
  'projection-refresh-queued': 'settings.pages.memory.workbench.states.reindex_stage_projection_queued',
  'projection-refresh-running': 'settings.pages.memory.workbench.states.reindex_stage_projection_running',
  'embedding-indexing': 'settings.pages.memory.workbench.states.reindex_stage_embedding',
  'completed': 'settings.pages.memory.workbench.states.reindex_completed',
  'cancelled': 'settings.pages.memory.workbench.states.reindex_cancelled',
  'failed': 'settings.pages.memory.workbench.states.reindex_failed',
} as const

const semanticScaleStatusLabelKeys = {
  queued: 'settings.pages.memory.workbench.states.semantic_scale_queued',
  running: 'settings.pages.memory.workbench.states.semantic_scale_running',
  cancel_requested: 'settings.pages.memory.workbench.states.semantic_scale_cancel_requested',
  completed: 'settings.pages.memory.workbench.states.semantic_scale_completed',
  cancelled: 'settings.pages.memory.workbench.states.semantic_scale_cancelled',
  failed: 'settings.pages.memory.workbench.states.semantic_scale_failed',
} as const

const datasetStateLabelKeys = {
  staged: 'settings.pages.memory.workbench.states.dataset_staged',
  quarantined: 'settings.pages.memory.workbench.states.dataset_quarantined',
  revoked: 'settings.pages.memory.workbench.states.dataset_revoked',
} as const

const piiStatusLabelKeys = {
  'clear': 'settings.pages.memory.workbench.states.pii_clear',
  'detected': 'settings.pages.memory.workbench.states.pii_detected',
  'not-checked': 'settings.pages.memory.workbench.states.pii_not_checked',
} as const

const healthStatusLabelKeys = {
  ok: 'settings.pages.memory.workbench.states.health_ok',
  degraded: 'settings.pages.memory.workbench.states.health_degraded',
  error: 'settings.pages.memory.workbench.states.health_error',
} as const

const indexModeLabelKeys = {
  'sqlite-vec': 'settings.pages.memory.workbench.states.index_sqlite_vec',
  'hnsw': 'settings.pages.memory.workbench.states.index_hnsw',
  'ann': 'settings.pages.memory.workbench.states.index_ann',
  'brute-force': 'settings.pages.memory.workbench.states.index_brute_force',
} as const

const personaCandidateStatusLabelKeys = {
  'candidate': 'settings.pages.memory.workbench.states.persona_candidate_candidate',
  'approved': 'settings.pages.memory.workbench.states.persona_candidate_approved',
  'rejected': 'settings.pages.memory.workbench.states.persona_candidate_rejected',
  'no-training': 'settings.pages.memory.workbench.states.persona_candidate_no_training',
} as const

const personaPrivacyLabelKeys = {
  'public': 'settings.pages.memory.workbench.states.persona_privacy_public',
  'personal-redacted': 'settings.pages.memory.workbench.states.persona_privacy_personal_redacted',
} as const

const qualityFailureLabelKeys: Record<AlicizationMemoryQualityFailureCode, string> = {
  timeout: 'settings.pages.memory.workbench.quality.failure_codes.timeout',
  auth: 'settings.pages.memory.workbench.quality.failure_codes.auth',
  network: 'settings.pages.memory.workbench.quality.failure_codes.network',
  recall: 'settings.pages.memory.workbench.quality.failure_codes.recall',
  database: 'settings.pages.memory.workbench.quality.failure_codes.database',
  queue: 'settings.pages.memory.workbench.quality.failure_codes.queue',
  provider: 'settings.pages.memory.workbench.quality.failure_codes.provider',
  quality: 'settings.pages.memory.workbench.quality.failure_codes.quality',
}

const qualityActionLabelKeys: Record<AlicizationMemoryQualityActionCode, string> = {
  'retry-timeout': 'settings.pages.memory.workbench.quality.action_codes.retry_timeout',
  'repair-auth': 'settings.pages.memory.workbench.quality.action_codes.repair_auth',
  'repair-network': 'settings.pages.memory.workbench.quality.action_codes.repair_network',
  'repair-recall': 'settings.pages.memory.workbench.quality.action_codes.repair_recall',
  'repair-database': 'settings.pages.memory.workbench.quality.action_codes.repair_database',
  'repair-queue': 'settings.pages.memory.workbench.quality.action_codes.repair_queue',
  'repair-provider': 'settings.pages.memory.workbench.quality.action_codes.repair_provider',
  'inspect-failure-stage': 'settings.pages.memory.workbench.quality.action_codes.inspect_failure_stage',
}

const qualityGoldLabelButtons = computed<Array<{
  value: AlicizationSimpleRecallGoldLabel
  label: string
  description: string
  variant?: 'secondary' | 'danger'
}>>(() => [
  {
    value: 'right',
    label: t('settings.pages.memory.workbench.quality.labels.right'),
    description: t('settings.pages.memory.workbench.quality.descriptions.right'),
  },
  {
    value: 'missing',
    label: t('settings.pages.memory.workbench.quality.labels.missing'),
    description: t('settings.pages.memory.workbench.quality.descriptions.missing'),
    variant: 'secondary',
  },
  {
    value: 'wrong',
    label: t('settings.pages.memory.workbench.quality.labels.wrong'),
    description: t('settings.pages.memory.workbench.quality.descriptions.wrong'),
    variant: 'danger',
  },
  {
    value: 'unwanted',
    label: t('settings.pages.memory.workbench.quality.labels.unwanted'),
    description: t('settings.pages.memory.workbench.quality.descriptions.unwanted'),
    variant: 'secondary',
  },
])

const qualityGoldReasonOptions = computed<Array<{
  value: AlicizationMemoryQualityGoldLabelReason
  label: string
  description: string
}>>(() => [
  {
    value: 'wrong-thread',
    label: t('memory-workbench.quality.reasons.wrong-thread.label'),
    description: t('memory-workbench.quality.reasons.wrong-thread.description'),
  },
  {
    value: 'expired',
    label: t('memory-workbench.quality.reasons.expired.label'),
    description: t('memory-workbench.quality.reasons.expired.description'),
  },
  {
    value: 'not-needed',
    label: t('memory-workbench.quality.reasons.not-needed.label'),
    description: t('memory-workbench.quality.reasons.not-needed.description'),
  },
  {
    value: 'should-abstain',
    label: t('memory-workbench.quality.reasons.should-abstain.label'),
    description: t('memory-workbench.quality.reasons.should-abstain.description'),
  },
])

interface QualityPanelDetail {
  id: string
  title: string
  description: string
  meta: string[]
}

const healthStatusClass = computed(() => {
  if (health.value?.status === 'ok')
    return 'text-emerald-600 dark:text-emerald-300'
  if (health.value?.status === 'degraded')
    return 'text-amber-600 dark:text-amber-300'
  return 'text-rose-600 dark:text-rose-300'
})

const qualityFailureDetails = computed<QualityPanelDetail[]>(() => {
  const report = qualityTrialReport.value
  if (!report)
    return []

  const stageDetails = report.stages
    .filter(stage => !stage.passed)
    .map(stage => ({
      id: `stage:${stage.id}`,
      title: `${t('settings.pages.memory.workbench.fields.failing_stages')}: ${stage.id}`,
      description: formatQualityFailure(stage.error),
      meta: [
        `${stage.stage}`,
        `${t('settings.pages.memory.workbench.fields.count')}: ${stage.itemCount}`,
      ],
    }))

  const fixtureDetails = report.quality.summary.failingFixtureIds.map(fixtureId => ({
    id: `fixture:${fixtureId}`,
    title: `${t('settings.pages.memory.workbench.fields.failing_fixtures')}: ${fixtureId}`,
    description: '-',
    meta: [],
  }))

  return [...stageDetails, ...fixtureDetails]
})

function formatQualityFailure(value: AlicizationMemoryQualityFailureCode | null | undefined) {
  return value ? t(qualityFailureLabelKeys[value]) : '-'
}

function formatQualityAction(value: AlicizationMemoryQualityActionCode) {
  return t(qualityActionLabelKeys[value])
}

function listText(values: string[]) {
  return values.length > 0 ? values.join(' / ') : '-'
}

function formatTimestamp(value: number | null | undefined) {
  if (!value)
    return '-'
  return new Date(value).toLocaleString()
}

function formatLongTermFilterLabel(group: LongTermFilterGroup, value: string) {
  return t(longTermFilterLabelKeys[group][value as keyof typeof longTermFilterLabelKeys[typeof group]] ?? value)
}

function formatMemorySource(value: string) {
  return t(memorySourceLabelKeys[value as keyof typeof memorySourceLabelKeys] ?? value)
}

function formatReindexStatus(value: string) {
  return t(reindexStatusLabelKeys[value as keyof typeof reindexStatusLabelKeys] ?? value)
}

function formatReindexStage(value: string) {
  return t(reindexStageLabelKeys[value as keyof typeof reindexStageLabelKeys] ?? value)
}

function formatSemanticScaleStatus(value: string) {
  return t(semanticScaleStatusLabelKeys[value as keyof typeof semanticScaleStatusLabelKeys] ?? value)
}

function formatDatasetState(value: string) {
  return t(datasetStateLabelKeys[value as keyof typeof datasetStateLabelKeys] ?? value)
}

function formatPersonaRevokeIntentStatus(value: string) {
  return t(`settings.pages.memory.workbench.states.persona_source_revoke_${value}`)
}

function formatPiiStatus(value: string) {
  return t(piiStatusLabelKeys[value as keyof typeof piiStatusLabelKeys] ?? value)
}

function formatHealthStatus(value: string) {
  return t(healthStatusLabelKeys[value as keyof typeof healthStatusLabelKeys] ?? value)
}

function formatIndexMode(value: string) {
  return t(indexModeLabelKeys[value as keyof typeof indexModeLabelKeys] ?? value)
}

function formatBoolean(value: boolean | null | undefined) {
  return value ? t('settings.pages.memory.workbench.states.yes') : t('settings.pages.memory.workbench.states.no')
}

function formatCoverageRatio(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value))
    return '-'
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
}

function formatBytes(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value))
    return '-'
  if (value < 1024)
    return `${Math.round(value)} B`
  if (value < 1024 * 1024)
    return `${(value / 1024).toFixed(1)} KiB`
  if (value < 1024 * 1024 * 1024)
    return `${(value / (1024 * 1024)).toFixed(1)} MiB`
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GiB`
}

function formatPersonaCandidateStatus(value: string) {
  return t(personaCandidateStatusLabelKeys[value as keyof typeof personaCandidateStatusLabelKeys] ?? value)
}

function formatPersonaPrivacyClass(value: string) {
  return t(personaPrivacyLabelKeys[value as keyof typeof personaPrivacyLabelKeys] ?? value)
}

function formatQualityScore(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value))
    return '-'
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
}

function resetLongTermFilters() {
  longTermFilters.value = {
    query: '',
    kind: 'all',
    sensitivity: 'all',
    visibility: 'all',
    training: 'all',
    source: '',
  }
  void store.refreshLongTerm()
}

function resetReviewFilters() {
  reviewFilters.value = {
    query: '',
    kind: 'all',
    sensitivity: 'all',
    visibility: 'all',
    training: 'all',
  }
  void store.refreshReview()
}

function currentPersonaConsent() {
  return {
    granted: personaTrainingConsentGranted.value,
    policyVersion: personaTrainingPolicyVersion.value.trim() || 'persona-training-consent-v1',
    scope: personaTrainingScope.value.trim() || 'persona-dataset',
  }
}

function stagePersonaDataset() {
  void store.stagePersonaTrainingDataset(currentPersonaConsent())
}

function exportPersonaDataset(datasetId?: string | null) {
  void store.exportPersonaTrainingDataset(datasetId)
}

function activatePersonaDataset(datasetId: string) {
  void store.activatePersonaTrainingDataset(datasetId)
}

function rollbackPersonaDataset(datasetId: string) {
  void store.rollbackPersonaTrainingDataset(datasetId)
}

function updatePersonaExamplePolicy(exampleId: string, allowTraining: boolean) {
  void store.setPersonaTrainingDatasetExamplePolicy({
    exampleId,
    allowTraining,
    consent: currentPersonaConsent(),
  })
}

function revokePersonaSource(
  sourceId: string,
  sourceKind: AlicizationPersonaTrainingDatasetExample['sourceKind'],
) {
  void store.revokePersonaTrainingDatasetSource({ sourceId, sourceKind })
}

function loadQualityGoldLabels() {
  void store.loadMonthlyGoldLabels(goldLabelMonth.value)
}

async function runQualityTrial() {
  await store.runQualityTrial(goldLabelMonth.value)
}

function buildGoldRegression() {
  void store.buildMonthlyGoldRegression(goldLabelMonth.value)
}

function applyProbeGoldLabel(label: AlicizationSimpleRecallGoldLabel) {
  const query = (recallProbe.value?.query ?? recallQuery.value).trim()
  if (!query || !qualityGoldContextReady.value)
    return
  const evidenceIds = recallProbe.value?.evidence.map(item => item.id) ?? []
  const surfacedMemoryIds = qualitySurfacedMemoryIds.value.length > 0
    ? qualitySurfacedMemoryIds.value
    : evidenceIds
  const expectedMemoryIds = label === 'unwanted'
    ? []
    : parseQualityMemoryIds(qualityExpectedMemoryIds.value)
  if (label !== 'unwanted' && expectedMemoryIds.length === 0)
    return
  void store.applyGoldLabel({
    month: goldLabelMonth.value,
    label,
    reason: selectedGoldLabelReason.value,
    query,
    sessionId: selectedQualitySessionId.value,
    turnId: qualityTurnId.value.trim(),
    decisionTraceId: qualityDecisionTraceId.value.trim() || null,
    assistantReply: qualityAssistantReply.value.trim(),
    retrievedEvidenceSnapshot: qualityEvidenceSnapshot(),
    expectedMemoryIds,
    retrievedCandidateIds: evidenceIds,
    surfacedMemoryIds,
    wrongThreadIds: label === 'wrong' ? surfacedMemoryIds : [],
    note: qualityGoldLabelButtons.value.find(item => item.value === label)?.description ?? null,
  }).then((result) => {
    if (result)
      selectedGoldLabelReason.value = null
  })
}

watch(recallProbe, (probe) => {
  qualitySurfacedMemoryIds.value = probe?.evidence.map(item => item.id) ?? []
  qualityExpectedMemoryIds.value = probe?.evidence.map(item => item.id).join(', ') ?? ''
})

function reloadQualityTrialContext() {
  store.resetQualityTrialContext()
  store.resetSemanticScaleJobContext()
  void store.loadQualityTrialReports()
  void store.loadQualityReplaySessions()
  void store.loadSemanticScaleJobs()
}

onMounted(() => {
  void store.refreshSnapshot()
  void store.ensureActiveTabLoaded()
  void store.refreshWorkingMemoryCleaningFailures()
  void store.refreshPersonaCandidates()
  void store.refreshPersonaTrainingDataset()
  void store.refreshPersonaTrainingSourceRevokeIntents()
  void store.refreshSkills(false)
  void store.loadMonthlyGoldLabels(goldLabelMonth.value)
  reloadQualityTrialContext()
})

watch(activeCardId, () => {
  store.resetCardScope()
  reloadQualityTrialContext()
  void store.refreshSnapshot()
  void store.ensureActiveTabLoaded()
  void store.refreshWorkingMemoryCleaningFailures()
  void store.refreshPersonaCandidates()
  void store.refreshPersonaTrainingDataset()
  void store.refreshPersonaTrainingSourceRevokeIntents()
  void store.refreshPersonaTrainingRuns()
  void store.refreshPersonaTrainingIncrements()
  void store.refreshSkills(false)
  void store.loadMonthlyGoldLabels(goldLabelMonth.value)
})
</script>

<template>
  <div :class="['flex', 'min-h-0', 'flex-col', 'gap-4', 'pb-10']">
    <header :class="['flex', 'flex-col', 'gap-3', 'md:flex-row', 'md:items-end', 'md:justify-between']">
      <div>
        <h1 :class="['text-2xl', 'font-semibold', 'text-neutral-950', 'dark:text-neutral-50']">
          {{ t('settings.pages.memory.workbench.title') }}
        </h1>
        <p :class="['mt-1', 'max-w-3xl', 'text-sm', 'text-neutral-500', 'dark:text-neutral-400']">
          {{ t('settings.pages.memory.workbench.description') }}
        </p>
      </div>
      <Button
        :label="t('settings.pages.memory.workbench.actions.refresh')"
        icon="i-solar:refresh-bold-duotone"
        size="sm"
        :loading="loading || listLoading || tombstoneLoading || reviewListLoading"
        @click="store.refreshActiveTab()"
      />
    </header>

    <section :class="['grid', 'grid-cols-2', 'gap-3', 'lg:grid-cols-4']">
      <div :class="['border', 'border-neutral-200', 'bg-white/80', 'p-3', 'dark:border-neutral-800', 'dark:bg-neutral-950/50']">
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.health') }}
        </div>
        <div :class="['mt-1', 'text-sm', 'font-semibold', healthStatusClass]">
          {{ health?.status ? formatHealthStatus(health.status) : '-' }}
        </div>
      </div>
      <div :class="['border', 'border-neutral-200', 'bg-white/80', 'p-3', 'dark:border-neutral-800', 'dark:bg-neutral-950/50']">
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.pending_review') }}
        </div>
        <div :class="['mt-1', 'text-sm', 'font-semibold']">
          {{ pendingReviewCount }}
        </div>
      </div>
      <div :class="['border', 'border-neutral-200', 'bg-white/80', 'p-3', 'dark:border-neutral-800', 'dark:bg-neutral-950/50']">
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.recall_latency') }}
        </div>
        <div :class="['mt-1', 'text-sm', 'font-semibold']">
          {{ health?.recall.lastLatencyMs ?? '-' }} ms
        </div>
      </div>
      <div :class="['border', 'border-neutral-200', 'bg-white/80', 'p-3', 'dark:border-neutral-800', 'dark:bg-neutral-950/50']">
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.queue') }}
        </div>
        <div :class="['mt-1', 'text-sm', 'font-semibold']">
          {{ health?.queue.pending ?? 0 }} / {{ health?.queue.failed ?? 0 }}
        </div>
      </div>
    </section>

    <div
      v-if="lastError"
      :class="['border', 'border-rose-300', 'bg-rose-50', 'p-3', 'text-sm', 'text-rose-700', 'dark:border-rose-900', 'dark:bg-rose-950/40', 'dark:text-rose-200']"
    >
      {{ lastError }}
    </div>

    <MemoryEmbeddingConfig />

    <nav :class="['flex', 'flex-wrap', 'gap-2', 'border-b', 'border-neutral-200', 'pb-2', 'dark:border-neutral-800']">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="[
          'inline-flex', 'items-center', 'gap-2', 'border', 'px-3', 'py-2', 'text-sm',
          activeTab === tab.id
            ? 'border-neutral-950 bg-neutral-950 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950'
            : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900',
        ]"
        @click="store.selectTab(tab.id)"
      >
        <span :class="tab.icon" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <section v-if="activeTab === 'working'" :class="['grid', 'grid-cols-1', 'gap-3', 'xl:grid-cols-2']">
      <div v-if="!workingMemory" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.empty_working') }}
      </div>
      <template v-else>
        <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.thread') }}
          </div>
          <div :class="['mt-1', 'text-sm', 'font-medium']">
            {{ workingMemory.threadTitle ?? '-' }}
          </div>
          <div :class="['mt-3', 'text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.active_task') }}
          </div>
          <div :class="['mt-1', 'text-sm']">
            {{ workingMemory.activeTask ?? '-' }}
          </div>
        </div>
        <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.corrections') }}
          </div>
          <div :class="['mt-1', 'text-sm']">
            {{ listText(workingMemory.userCorrections) }}
          </div>
          <div :class="['mt-3', 'text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.query_hints') }}
          </div>
          <div :class="['mt-1', 'text-sm']">
            {{ listText(workingMemory.queryHints) }}
          </div>
        </div>
      </template>
    </section>

    <section v-else-if="activeTab === 'long-term'" :class="['flex', 'flex-col', 'gap-3']">
      <div :class="['grid', 'grid-cols-1', 'gap-2', 'md:grid-cols-3', 'xl:grid-cols-6']">
        <input
          v-model="longTermFilters.query"
          :aria-label="t('settings.pages.memory.workbench.actions.search')"
          :placeholder="t('settings.pages.memory.workbench.placeholders.long_term_search')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
          @keydown.enter.prevent="store.refreshLongTerm()"
        >
        <select
          v-model="longTermFilters.kind"
          :aria-label="t('settings.pages.memory.workbench.fields.kind')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
          <option v-for="option in kindOptions" :key="option" :value="option">
            {{ formatLongTermFilterLabel('kind', option) }}
          </option>
        </select>
        <select
          v-model="longTermFilters.sensitivity"
          :aria-label="t('settings.pages.memory.workbench.fields.sensitivity')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
          <option v-for="option in sensitivityOptions" :key="option" :value="option">
            {{ formatLongTermFilterLabel('sensitivity', option) }}
          </option>
        </select>
        <select
          v-model="longTermFilters.visibility"
          :aria-label="t('settings.pages.memory.workbench.fields.visibility')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
          <option v-for="option in visibilityOptions" :key="option" :value="option">
            {{ formatLongTermFilterLabel('visibility', option) }}
          </option>
        </select>
        <select
          v-model="longTermFilters.training"
          :aria-label="t('settings.pages.memory.workbench.fields.training')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
          <option v-for="option in trainingOptions" :key="option" :value="option">
            {{ formatLongTermFilterLabel('training', option) }}
          </option>
        </select>
        <select
          v-model="longTermFilters.source"
          :aria-label="t('settings.pages.memory.workbench.fields.source')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
          <option v-for="option in memorySourceOptions" :key="option || 'all'" :value="option">
            {{ formatMemorySource(option) }}
          </option>
        </select>
      </div>
      <div :class="['flex', 'flex-wrap', 'gap-2']">
        <Button
          :label="t('settings.pages.memory.workbench.actions.search')"
          icon="i-solar:magnifer-bold-duotone"
          size="sm"
          :loading="listLoading"
          @click="store.refreshLongTerm()"
        />
        <Button
          :label="t('settings.pages.memory.workbench.actions.reset')"
          icon="i-solar:restart-bold-duotone"
          size="sm"
          variant="secondary"
          @click="resetLongTermFilters()"
        />
      </div>
      <div
        v-if="longTermError"
        :class="['border', 'border-rose-300', 'bg-rose-50', 'p-3', 'text-sm', 'text-rose-700', 'dark:border-rose-900', 'dark:bg-rose-950/40', 'dark:text-rose-200']"
      >
        <div :class="['font-medium']">
          {{ t('settings.pages.memory.workbench.fields.long_term_list_error') }}
        </div>
        <div :class="['mt-1', 'whitespace-pre-wrap', 'break-words']">
          {{ longTermError }}
        </div>
      </div>
      <div v-if="listLoading && longTermItems.length === 0" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.loading_long_term') }}
      </div>
      <div v-else-if="!longTermError && longTermItems.length === 0" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.empty_long_term') }}
      </div>
      <article v-for="item in longTermItems" :key="`${item.source}:${item.id}`" :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
          <span>{{ t('settings.pages.memory.workbench.fields.kind') }}: {{ formatLongTermFilterLabel('kind', item.kind) }}</span>
          <span>{{ t('settings.pages.memory.workbench.fields.sensitivity') }}: {{ formatLongTermFilterLabel('sensitivity', item.sensitivity) }}</span>
          <span>{{ t('settings.pages.memory.workbench.fields.visibility') }}: {{ formatLongTermFilterLabel('visibility', item.visibility) }}</span>
          <span>{{ t('settings.pages.memory.workbench.fields.training') }}: {{ formatLongTermFilterLabel('training', item.training) }}</span>
        </div>
        <div :class="['mt-2', 'text-sm', 'font-medium']">
          {{ item.summary }}
        </div>
        <div :class="['mt-2', 'text-xs', 'text-neutral-500']">
          {{ listText(item.evidenceSnippets) }}
        </div>
        <div :class="['mt-3', 'grid', 'grid-cols-1', 'gap-2', 'text-xs', 'text-neutral-500', 'md:grid-cols-3']">
          <div>{{ t('settings.pages.memory.workbench.fields.source') }}: {{ formatMemorySource(item.source) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.confidence') }}: {{ item.confidence.toFixed(2) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.salience') }}: {{ item.salience.toFixed(2) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.source_ids') }}: {{ listText(item.sourceIds) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.updated_at') }}: {{ formatTimestamp(item.updatedAt) }}</div>
        </div>
        <div :class="['mt-3', 'flex', 'flex-wrap', 'gap-2']">
          <Button
            size="sm"
            variant="danger"
            :label="t('settings.pages.memory.workbench.actions.tombstone')"
            :loading="reviewActionLoadingId === item.id"
            @click="requestTombstone({ id: item.id, source: item.source, summary: item.summary, kind: 'long-term' })"
          />
          <Button
            size="sm"
            variant="secondary"
            :label="t('settings.pages.memory.workbench.actions.inward_only')"
            :loading="reviewActionLoadingId === item.id"
            @click="store.applyLongTermAction(item.id, 'inward-only', item.source)"
          />
          <Button
            size="sm"
            variant="secondary"
            :label="t('settings.pages.memory.workbench.actions.no_training')"
            :loading="reviewActionLoadingId === item.id"
            @click="store.applyLongTermAction(item.id, 'no-training', item.source)"
          />
        </div>
      </article>
      <Button
        v-if="longTermNextCursor"
        :label="t('settings.pages.memory.workbench.actions.load_more')"
        icon="i-solar:alt-arrow-down-bold-duotone"
        size="sm"
        variant="secondary"
        :loading="listLoading"
        @click="store.loadMoreLongTerm()"
      />
    </section>

    <section v-else-if="activeTab === 'tombstones'" :class="['flex', 'flex-col', 'gap-3']">
      <div
        v-if="tombstoneError"
        :class="['border', 'border-rose-300', 'bg-rose-50', 'p-3', 'text-sm', 'text-rose-700', 'dark:border-rose-900', 'dark:bg-rose-950/40', 'dark:text-rose-200']"
      >
        <div :class="['font-medium']">
          {{ t('settings.pages.memory.workbench.fields.tombstone_list_error') }}
        </div>
        <div :class="['mt-1', 'whitespace-pre-wrap', 'break-words']">
          {{ tombstoneError }}
        </div>
      </div>
      <div v-if="tombstoneLoading && tombstoneItems.length === 0" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.loading_tombstones') }}
      </div>
      <div v-else-if="!tombstoneError && tombstoneItems.length === 0" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.empty_tombstones') }}
      </div>
      <article v-for="item in tombstoneItems" :key="item.id" :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
          <span>{{ t('settings.pages.memory.workbench.fields.source') }}: {{ formatMemorySource(item.source) }}</span>
          <span>{{ t('settings.pages.memory.workbench.fields.deleted_at') }}: {{ formatTimestamp(item.deletedAt) }}</span>
        </div>
        <div :class="['mt-2', 'text-sm', 'font-medium']">
          {{ item.memory?.summary ?? item.sourceId }}
        </div>
        <div :class="['mt-2', 'text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.deleted_reason') }}: {{ item.reason ?? '-' }}
        </div>
        <div v-if="item.memory?.evidenceSnippets.length" :class="['mt-2', 'text-xs', 'text-neutral-500']">
          {{ listText(item.memory.evidenceSnippets) }}
        </div>
        <Button
          :class="['mt-3']"
          size="sm"
          variant="secondary"
          icon="i-solar:restart-bold-duotone"
          :label="t('settings.pages.memory.workbench.actions.restore')"
          :loading="tombstoneRestoreLoadingId === item.id"
          @click="store.restoreTombstone(item.id)"
        />
      </article>
      <Button
        v-if="tombstoneNextCursor"
        :label="t('settings.pages.memory.workbench.actions.load_more')"
        icon="i-solar:alt-arrow-down-bold-duotone"
        size="sm"
        variant="secondary"
        :loading="tombstoneLoading"
        @click="store.loadMoreTombstones()"
      />
    </section>

    <section v-else-if="activeTab === 'review'" :class="['flex', 'flex-col', 'gap-3']">
      <div :class="['grid', 'grid-cols-1', 'gap-2', 'md:grid-cols-3', 'xl:grid-cols-5']">
        <input
          v-model="reviewFilters.query"
          :aria-label="t('settings.pages.memory.workbench.actions.search')"
          :placeholder="t('settings.pages.memory.workbench.placeholders.review_search')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
          @keydown.enter.prevent="store.refreshReview()"
        >
        <select
          v-model="reviewFilters.kind"
          :aria-label="t('settings.pages.memory.workbench.fields.kind')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
          <option v-for="option in reviewKindOptions" :key="option" :value="option">
            {{ formatLongTermFilterLabel('kind', option) }}
          </option>
        </select>
        <select
          v-model="reviewFilters.sensitivity"
          :aria-label="t('settings.pages.memory.workbench.fields.sensitivity')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
          <option v-for="option in sensitivityOptions" :key="option" :value="option">
            {{ formatLongTermFilterLabel('sensitivity', option) }}
          </option>
        </select>
        <select
          v-model="reviewFilters.visibility"
          :aria-label="t('settings.pages.memory.workbench.fields.visibility')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
          <option v-for="option in visibilityOptions" :key="option" :value="option">
            {{ formatLongTermFilterLabel('visibility', option) }}
          </option>
        </select>
        <select
          v-model="reviewFilters.training"
          :aria-label="t('settings.pages.memory.workbench.fields.training')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
          <option v-for="option in trainingOptions" :key="option" :value="option">
            {{ formatLongTermFilterLabel('training', option) }}
          </option>
        </select>
      </div>
      <div :class="['flex', 'flex-wrap', 'gap-2']">
        <Button
          :label="t('settings.pages.memory.workbench.actions.search')"
          icon="i-solar:magnifer-bold-duotone"
          size="sm"
          :loading="reviewListLoading"
          @click="store.refreshReview()"
        />
        <Button
          :label="t('settings.pages.memory.workbench.actions.reset')"
          icon="i-solar:restart-bold-duotone"
          size="sm"
          variant="secondary"
          @click="resetReviewFilters()"
        />
      </div>
      <div
        v-if="reviewError"
        :class="['border', 'border-rose-300', 'bg-rose-50', 'p-3', 'text-sm', 'text-rose-700', 'dark:border-rose-900', 'dark:bg-rose-950/40', 'dark:text-rose-200']"
      >
        <div :class="['font-medium']">
          {{ t('settings.pages.memory.workbench.fields.review_list_error') }}
        </div>
        <div :class="['mt-1', 'whitespace-pre-wrap', 'break-words']">
          {{ reviewError }}
        </div>
      </div>
      <div v-if="reviewListLoading && reviewItems.length === 0" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.loading_review') }}
      </div>
      <div v-else-if="!reviewError && reviewItems.length === 0" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.empty_review') }}
      </div>
      <article v-for="item in reviewItems" :key="item.id" :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
          <span>{{ t('settings.pages.memory.workbench.fields.kind') }}: {{ formatLongTermFilterLabel('kind', item.kind) }}</span>
          <span>{{ t('settings.pages.memory.workbench.fields.sensitivity') }}: {{ formatLongTermFilterLabel('sensitivity', item.sensitivity) }}</span>
          <span>{{ t('settings.pages.memory.workbench.fields.visibility') }}: {{ formatLongTermFilterLabel('visibility', item.visibleMode) }}</span>
          <span>{{ t('settings.pages.memory.workbench.fields.training') }}: {{ formatLongTermFilterLabel('training', item.allowTraining ? 'allowed' : 'blocked') }}</span>
        </div>
        <div :class="['text-sm', 'font-medium']">
          {{ item.summary }}
        </div>
        <div :class="['mt-2', 'text-xs', 'text-neutral-500']">
          {{ listText(item.reviewReasons) }}
        </div>
        <div :class="['mt-3', 'flex', 'flex-wrap', 'gap-2']">
          <Button size="sm" :label="t('settings.pages.memory.workbench.actions.approve')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'approve')" />
          <Button size="sm" variant="secondary" :label="t('settings.pages.memory.workbench.actions.reject')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'reject')" />
          <Button size="sm" variant="danger" :label="t('settings.pages.memory.workbench.actions.tombstone')" :loading="reviewActionLoadingId === item.id" @click="requestTombstone({ id: item.id, summary: item.summary, kind: 'review' })" />
          <Button size="sm" variant="secondary" :label="t('settings.pages.memory.workbench.actions.inward_only')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'inward-only')" />
          <Button size="sm" variant="secondary" :label="t('settings.pages.memory.workbench.actions.no_training')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'no-training')" />
        </div>
      </article>
      <Button
        v-if="reviewNextCursor"
        :label="t('settings.pages.memory.workbench.actions.load_more')"
        icon="i-solar:alt-arrow-down-bold-duotone"
        size="sm"
        variant="secondary"
        :loading="reviewListLoading"
        @click="store.loadMoreReview()"
      />

      <section :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['flex', 'flex-col', 'gap-3', 'lg:flex-row', 'lg:items-start', 'lg:justify-between']">
          <div>
            <h2 :class="['text-sm', 'font-semibold']">
              {{ t('settings.pages.memory.workbench.fields.persona_dataset') }}
            </h2>
            <p :class="['mt-1', 'text-xs', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.fields.persona_dataset_description') }}
            </p>
          </div>
          <div :class="['flex', 'flex-wrap', 'gap-2']">
            <Button
              :label="t('settings.pages.memory.workbench.actions.stage_persona_dataset')"
              icon="i-solar:layers-minimalistic-bold-duotone"
              size="sm"
              :loading="personaTrainingDatasetLoading"
              @click="stagePersonaDataset()"
            />
            <Button
              :label="t('settings.pages.memory.workbench.actions.export_persona_dataset')"
              icon="i-solar:export-bold-duotone"
              size="sm"
              variant="secondary"
              :loading="personaTrainingDatasetLoading"
              :disabled="!personaTrainingDataset?.versions.length"
              @click="exportPersonaDataset(personaTrainingDataset?.activeVersionId)"
            />
          </div>
        </div>

        <div :class="['mt-4', 'grid', 'grid-cols-1', 'gap-3', 'md:grid-cols-3']">
          <label :class="['flex', 'items-center', 'gap-2', 'text-sm']">
            <input v-model="personaTrainingConsentGranted" type="checkbox">
            <span>{{ t('settings.pages.memory.workbench.fields.dataset_consent') }}</span>
          </label>
          <label :class="['grid', 'gap-1']">
            <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.dataset_policy_version') }}</span>
            <input
              v-model="personaTrainingPolicyVersion"
              :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
            >
          </label>
          <label :class="['grid', 'gap-1']">
            <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.dataset_scope') }}</span>
            <input
              v-model="personaTrainingScope"
              :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
            >
          </label>
        </div>

        <div v-if="!personaTrainingDataset" :class="['mt-4', 'border', 'border-dashed', 'border-neutral-300', 'p-4', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
          {{ t('settings.pages.memory.workbench.states.empty_persona_dataset') }}
        </div>
        <template v-else>
          <div :class="['mt-4', 'grid', 'grid-cols-1', 'gap-2', 'text-sm', 'md:grid-cols-3']">
            <div>{{ t('settings.pages.memory.workbench.fields.dataset_active') }}: {{ personaTrainingDataset.activeVersionId ?? '-' }}</div>
            <div>{{ t('settings.pages.memory.workbench.fields.dataset_examples') }}: {{ personaTrainingDataset.examples.length }}</div>
            <div v-if="personaTrainingDatasetExport">
              {{ t('settings.pages.memory.workbench.fields.dataset_hash') }}: {{ personaTrainingDatasetExport.manifest.manifestHash }}
            </div>
          </div>

          <div :class="['mt-4', 'border-t', 'border-neutral-200', 'pt-4', 'dark:border-neutral-800']">
            <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.fields.dataset_versions') }}
            </div>
            <div :class="['mt-2', 'flex', 'flex-col', 'gap-2']">
              <article v-for="version in personaTrainingDataset.versions" :key="version.id" :class="['border', 'border-neutral-200', 'p-3', 'dark:border-neutral-800']">
                <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
                  <span>v{{ version.version }}</span>
                  <span>{{ version.schemaVersion }}</span>
                  <span>{{ t('settings.pages.memory.workbench.fields.dataset_active') }}: {{ formatBoolean(version.activeAt !== null) }}</span>
                  <span>{{ t('settings.pages.memory.workbench.fields.dataset_manifest') }}: {{ formatBoolean(version.exportedAt !== null) }}</span>
                </div>
                <div :class="['mt-2', 'text-xs', 'text-neutral-500']">
                  {{ t('settings.pages.memory.workbench.fields.dataset_consent') }}:
                  {{ formatBoolean(version.consentSnapshot.granted) }}
                  · {{ version.consentSnapshot.policyVersion }}
                  · {{ version.consentSnapshot.scope }}
                </div>
                <div :class="['mt-2', 'flex', 'flex-wrap', 'gap-2']">
                  <Button
                    v-if="personaTrainingDataset.activeVersionId !== version.id"
                    :label="t('settings.pages.memory.workbench.actions.activate_persona_dataset')"
                    icon="i-solar:check-circle-bold-duotone"
                    size="sm"
                    variant="secondary"
                    :loading="personaTrainingDatasetLoading"
                    @click="activatePersonaDataset(version.id)"
                  />
                  <Button
                    v-if="personaTrainingDataset.activeVersionId !== version.id"
                    :label="t('settings.pages.memory.workbench.actions.rollback_persona_dataset')"
                    icon="i-solar:history-2-bold-duotone"
                    size="sm"
                    variant="secondary"
                    :loading="personaTrainingDatasetLoading"
                    @click="rollbackPersonaDataset(version.id)"
                  />
                  <Button
                    :label="t('settings.pages.memory.workbench.actions.export_persona_dataset')"
                    icon="i-solar:export-bold-duotone"
                    size="sm"
                    variant="secondary"
                    :loading="personaTrainingDatasetLoading"
                    @click="exportPersonaDataset(version.id)"
                  />
                </div>
              </article>
            </div>
          </div>

          <div :class="['mt-4', 'border-t', 'border-neutral-200', 'pt-4', 'dark:border-neutral-800']">
            <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.fields.dataset_examples') }}
            </div>
            <div v-if="personaTrainingDataset.examples.length === 0" :class="['mt-2', 'text-sm', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.states.empty_persona_dataset_examples') }}
            </div>
            <div v-else :class="['mt-2', 'flex', 'flex-col', 'gap-2']">
              <article v-for="example in personaTrainingDataset.examples" :key="example.id" :class="['border', 'border-neutral-200', 'p-3', 'dark:border-neutral-800']">
                <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
                  <span>{{ formatDatasetState(example.state) }}</span>
                  <span>{{ t('settings.pages.memory.workbench.fields.pii_status') }}: {{ formatPiiStatus(example.piiStatus) }}</span>
                  <span>{{ t('settings.pages.memory.workbench.fields.training') }}: {{ formatBoolean(example.allowTraining) }}</span>
                </div>
                <div :class="['mt-2', 'text-sm', 'font-medium']">
                  {{ example.behaviorLesson }}
                </div>
                <div :class="['mt-1', 'text-xs', 'text-neutral-500']">
                  {{ example.sourceKind }} · {{ example.sourceId }}
                </div>
                <div v-if="example.piiReason" :class="['mt-1', 'text-xs', 'text-rose-600', 'dark:text-rose-300']">
                  {{ example.piiReason }}
                </div>
                <div :class="['mt-2', 'flex', 'flex-wrap', 'gap-2']">
                  <Button
                    :label="t('settings.pages.memory.workbench.actions.allow_persona_training')"
                    icon="i-solar:check-circle-bold-duotone"
                    size="sm"
                    variant="secondary"
                    :disabled="!personaTrainingConsentGranted || example.state !== 'staged' || example.piiStatus !== 'clear'"
                    :loading="personaTrainingDatasetLoading"
                    @click="updatePersonaExamplePolicy(example.id, true)"
                  />
                  <Button
                    :label="t('settings.pages.memory.workbench.actions.block_persona_training')"
                    icon="i-solar:shield-cross-bold-duotone"
                    size="sm"
                    variant="secondary"
                    :loading="personaTrainingDatasetLoading"
                    @click="updatePersonaExamplePolicy(example.id, false)"
                  />
                  <Button
                    :label="t('settings.pages.memory.workbench.actions.revoke_persona_source')"
                    icon="i-solar:trash-bin-2-bold-duotone"
                    size="sm"
                    variant="danger"
                    :loading="personaTrainingDatasetLoading"
                    @click="revokePersonaSource(example.sourceId, example.sourceKind)"
                  />
                </div>
              </article>
            </div>
          </div>

          <div :class="['mt-4', 'border-t', 'border-neutral-200', 'pt-4', 'dark:border-neutral-800']">
            <div :class="['flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-2']">
              <div>
                <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
                  {{ t('settings.pages.memory.workbench.fields.persona_source_revoke_intents') }}
                </div>
                <div :class="['mt-1', 'text-xs', 'text-neutral-500']">
                  {{ t('settings.pages.memory.workbench.fields.persona_source_revoke_intents_description') }}
                </div>
              </div>
              <Button
                :label="t('settings.pages.memory.workbench.actions.refresh_persona_source_revoke_intents')"
                icon="i-solar:refresh-bold-duotone"
                size="sm"
                variant="secondary"
                :loading="personaTrainingSourceRevokeIntentsLoading"
                @click="store.refreshPersonaTrainingSourceRevokeIntents()"
              />
            </div>
            <div v-if="personaTrainingSourceRevokeIntents.length === 0" :class="['mt-2', 'text-sm', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.states.empty_persona_source_revoke_intents') }}
            </div>
            <div v-else :class="['mt-2', 'flex', 'flex-col', 'gap-2']">
              <article
                v-for="intent in personaTrainingSourceRevokeIntents"
                :key="intent.id"
                :class="['border', 'border-neutral-200', 'p-3', 'dark:border-neutral-800']"
              >
                <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
                  <span>{{ formatPersonaRevokeIntentStatus(intent.status) }}</span>
                  <span>{{ intent.sourceKind }} · {{ intent.sourceId }}</span>
                  <span>{{ t('settings.pages.memory.workbench.fields.attempts') }}: {{ intent.attempts }}</span>
                </div>
                <div :class="['mt-1', 'text-xs', 'text-neutral-500']">
                  {{ intent.reason }}
                </div>
                <div v-if="intent.lastError" :class="['mt-1', 'text-xs', 'text-rose-600', 'dark:text-rose-300']">
                  {{ intent.lastError }}
                </div>
                <Button
                  v-if="intent.status !== 'completed'"
                  :label="t('settings.pages.memory.workbench.actions.retry_persona_source_revoke')"
                  icon="i-solar:restart-bold-duotone"
                  size="sm"
                  variant="secondary"
                  :loading="personaTrainingSourceRevokeIntentsLoading"
                  @click="store.retryPersonaTrainingSourceRevokeIntent(intent.id)"
                />
              </article>
            </div>
          </div>
        </template>
      </section>
    </section>

    <section v-else-if="activeTab === 'probe'" :class="['flex', 'flex-col', 'gap-3']">
      <div :class="['flex', 'gap-2']">
        <input
          v-model="recallQuery"
          :class="['min-w-0', 'flex-1', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
          @keydown.enter.prevent="store.runRecallProbe()"
        >
        <Button :label="t('settings.pages.memory.workbench.actions.run_probe')" icon="i-solar:magnifer-bold-duotone" :loading="probeLoading" @click="store.runRecallProbe()" />
      </div>
      <div v-if="!recallProbe" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.empty_probe') }}
      </div>
      <div v-else :class="['grid', 'grid-cols-1', 'gap-3', 'xl:grid-cols-[320px_minmax(0,1fr)]']">
        <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['text-xs', 'text-neutral-500']">
            intent
          </div>
          <pre :class="['mt-2', 'whitespace-pre-wrap', 'text-xs']">{{ JSON.stringify(recallProbe.intent, null, 2) }}</pre>
          <div :class="['mt-3', 'border-t', 'border-neutral-200', 'pt-3', 'text-xs', 'text-neutral-500', 'dark:border-neutral-800']">
            <div>
              {{ t('settings.pages.memory.workbench.fields.semantic_channel') }}:
              {{ recallProbe.semantic.available ? t('settings.pages.memory.workbench.fields.available') : t('settings.pages.memory.workbench.fields.unavailable') }}
            </div>
            <div>{{ t('settings.pages.memory.workbench.fields.model') }}: {{ recallProbe.semantic.modelId ?? '-' }}</div>
            <div>{{ t('settings.pages.memory.workbench.fields.dimensions') }}: {{ recallProbe.semantic.dimensions ?? '-' }}</div>
            <div v-if="recallProbe.semantic.error">
              {{ t('settings.pages.memory.workbench.fields.errors') }}: {{ recallProbe.semantic.error }}
            </div>
          </div>
        </div>
        <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.evidence') }}
          </div>
          <article v-for="item in recallProbe.evidence" :key="item.id" :class="['mt-3', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
            <div :class="['text-sm', 'font-medium']">
              {{ item.summary }}
            </div>
            <div :class="['mt-1', 'text-xs', 'text-neutral-500']">
              {{ listText(item.rankReasons) }}
            </div>
          </article>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'quality'" :class="['grid', 'grid-cols-1', 'gap-3', 'xl:grid-cols-[360px_minmax(0,1fr)]']">
      <div :class="['flex', 'flex-col', 'gap-3']">
        <section :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['text-sm', 'font-semibold']">
            {{ t('settings.pages.memory.workbench.quality.title') }}
          </div>
          <p :class="['mt-1', 'text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.quality.description') }}
          </p>
          <label :class="['mt-4', 'grid', 'gap-1']">
            <span :class="['text-xs', 'text-neutral-500']">{{ t('settings.pages.memory.workbench.fields.month') }}</span>
            <input
              v-model="goldLabelMonth"
              :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
              placeholder="2026-08"
              @keydown.enter.prevent="loadQualityGoldLabels()"
            >
          </label>
          <MemoryQualitySessionPicker
            :selected-session-id="selectedQualitySessionId"
            :mode="qualityTrialMode"
            :sessions="qualityReplaySessions"
            :loading="qualityReplaySessionsLoading"
            :has-more="Boolean(qualityReplaySessionsNextCursor)"
            @update:selected-session-id="store.selectQualityTrialSession"
            @update:mode="store.setQualityTrialMode"
            @load-more="store.loadMoreQualityReplaySessions()"
          />
          <div :class="['mt-3', 'flex', 'flex-wrap', 'gap-2']">
            <Button
              v-if="internalDiagnosticsVisible"
              :label="t('settings.pages.memory.workbench.actions.load_gold_labels')"
              icon="i-solar:calendar-search-bold-duotone"
              size="sm"
              variant="secondary"
              :loading="goldLabelLoading"
              @click="loadQualityGoldLabels()"
            />
            <Button
              :label="t('settings.pages.memory.workbench.actions.run_quality_trial')"
              icon="i-solar:play-circle-bold-duotone"
              size="sm"
              :loading="qualityTrialLoading"
              :disabled="qualityReplaySessionsLoading || !selectedQualitySessionId"
              @click="runQualityTrial()"
            />
            <Button
              v-if="qualityTrialLoading"
              :label="t('settings.pages.memory.workbench.actions.cancel_quality_trial')"
              icon="i-solar:close-circle-bold-duotone"
              size="sm"
              variant="secondary"
              @click="store.cancelQualityTrial(t('settings.pages.memory.workbench.states.quality_trial_cancelled_by_user'))"
            />
            <Button
              v-if="internalDiagnosticsVisible"
              :label="t('settings.pages.memory.workbench.actions.build_gold_regression')"
              icon="i-solar:archive-check-bold-duotone"
              size="sm"
              variant="secondary"
              :loading="goldLabelLoading"
              @click="buildGoldRegression()"
            />
          </div>
        </section>

        <MemoryQualityTrialHistory
          :reports="qualityTrialReports"
          :selected-report-id="selectedQualityTrialReportId"
          :loading="qualityTrialReportsLoading"
          :has-more="Boolean(qualityTrialReportsNextCursor)"
          @select="store.selectQualityTrialReport"
          @load-more="store.loadMoreQualityTrialReports()"
        />

        <section v-if="internalDiagnosticsVisible" :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['flex', 'flex-wrap', 'items-start', 'justify-between', 'gap-3']">
            <div>
              <div :class="['text-sm', 'font-semibold']">
                {{ t('settings.pages.memory.workbench.quality.semantic_scale_title') }}
              </div>
              <p :class="['mt-1', 'text-xs', 'text-neutral-500']">
                {{ t('settings.pages.memory.workbench.quality.semantic_scale_description') }}
              </p>
            </div>
            <Button
              :label="t('settings.pages.memory.workbench.actions.refresh_semantic_scale')"
              icon="i-solar:refresh-bold-duotone"
              size="sm"
              variant="secondary"
              :loading="semanticScaleLoading"
              @click="store.loadSemanticScaleJobs()"
            />
          </div>

          <div :class="['mt-4', 'grid', 'grid-cols-2', 'gap-2']">
            <label
              v-for="tier in ['10k', '100k'] as const"
              :key="tier"
              :class="[
                'flex', 'min-w-0', 'cursor-pointer', 'items-center', 'justify-center', 'gap-2',
                'border', 'px-3', 'py-2', 'text-sm',
                semanticScaleTier === tier
                  ? 'border-neutral-950 bg-neutral-950 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950'
                  : 'border-neutral-300 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200',
              ]"
            >
              <input v-model="semanticScaleTier" class="sr-only" type="radio" :value="tier">
              <span>{{ tier }}</span>
            </label>
          </div>
          <div :class="['mt-3', 'flex', 'flex-wrap', 'gap-2']">
            <Button
              :label="t('settings.pages.memory.workbench.actions.start_semantic_scale')"
              icon="i-solar:play-circle-bold-duotone"
              size="sm"
              :loading="semanticScaleLoading"
              @click="store.startSemanticScaleJob(semanticScaleTier)"
            />
            <Button
              v-if="semanticScaleJob && ['queued', 'running', 'cancel_requested'].includes(semanticScaleJob.status)"
              :label="t('settings.pages.memory.workbench.actions.cancel_semantic_scale')"
              icon="i-solar:close-circle-bold-duotone"
              size="sm"
              variant="secondary"
              :loading="semanticScaleLoading"
              @click="store.cancelSemanticScaleJob(semanticScaleJob.jobId, t('settings.pages.memory.workbench.states.semantic_scale_cancelled_by_user'))"
            />
            <Button
              v-if="semanticScaleJob?.deadLettered"
              :label="t('settings.pages.memory.workbench.actions.retry_semantic_scale')"
              icon="i-solar:restart-bold-duotone"
              size="sm"
              variant="secondary"
              :loading="semanticScaleLoading"
              @click="store.retrySemanticScaleJob(semanticScaleJob.jobId)"
            />
          </div>

          <div v-if="semanticScaleJob" :class="['mt-4', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
            <div :class="['grid', 'grid-cols-2', 'gap-2', 'text-sm']">
              <div>{{ t('settings.pages.memory.workbench.fields.status') }}: {{ formatSemanticScaleStatus(semanticScaleJob.status) }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.semantic_scale_tier') }}: {{ semanticScaleJob.tier }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.corpus_size') }}: {{ semanticScaleJob.corpusSize }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.attempt_count') }}: {{ semanticScaleJob.attemptCount }}/{{ semanticScaleJob.maxAttempts }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.indexed') }}: {{ semanticScaleJob.progress.indexedCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.semantic_scale_queries') }}: {{ semanticScaleJob.progress.queryCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.next_retry_at') }}: {{ formatTimestamp(semanticScaleJob.nextRetryAt) }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.lease_expires_at') }}: {{ formatTimestamp(semanticScaleJob.leaseExpiresAt) }}</div>
            </div>
            <div :class="['mt-3', 'h-2', 'overflow-hidden', 'bg-neutral-200', 'dark:bg-neutral-800']">
              <div
                :class="['h-full', 'bg-emerald-500', 'transition-[width]']"
                :style="{ width: `${Math.round(semanticScaleJob.progress.ratio * 100)}%` }"
              />
            </div>
            <div :class="['mt-1', 'text-xs', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.fields.semantic_scale_progress') }}:
              {{ Math.round(semanticScaleJob.progress.ratio * 100) }}%
            </div>
            <div v-if="semanticScaleJob.lastError" :class="['mt-2', 'text-sm', 'text-rose-600', 'dark:text-rose-300']">
              {{ semanticScaleJob.lastError }}
            </div>
            <div v-if="semanticScaleJob.report" :class="['mt-3', 'grid', 'grid-cols-2', 'gap-2', 'text-sm']">
              <div
                :class="[
                  'col-span-2', 'font-semibold',
                  semanticScaleJob.report.passed
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : 'text-rose-600 dark:text-rose-300',
                ]"
              >
                {{ t(semanticScaleJob.report.passed
                  ? 'settings.pages.memory.workbench.states.semantic_scale_quality_passed'
                  : 'settings.pages.memory.workbench.states.semantic_scale_quality_failed') }}
              </div>
              <div>Recall@K: {{ formatQualityScore(semanticScaleJob.report.summary.recallAtK) }}</div>
              <div>P95: {{ semanticScaleJob.report.summary.p95LatencyMs.toFixed(1) }} ms</div>
              <div>P99: {{ semanticScaleJob.report.summary.p99LatencyMs.toFixed(1) }} ms</div>
              <div>{{ t('settings.pages.memory.workbench.fields.coverage_ratio') }}: {{ formatCoverageRatio(semanticScaleJob.report.summary.coverageRatio) }}</div>
              <template v-if="semanticScaleJob.report.resourceMetrics">
                <div>{{ t('settings.pages.memory.workbench.fields.semantic_scale_dimensions') }}: {{ semanticScaleJob.report.resourceMetrics.dimensions }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.semantic_scale_vector_input') }}: {{ semanticScaleJob.report.resourceMetrics.vectorInput }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.semantic_scale_elapsed') }}: {{ semanticScaleJob.report.resourceMetrics.elapsedMs.toFixed(1) }} ms</div>
                <div>{{ t('settings.pages.memory.workbench.fields.semantic_scale_peak_rss') }}: {{ formatBytes(semanticScaleJob.report.resourceMetrics.peakRssBytes) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.semantic_scale_sqlite_size') }}: {{ formatBytes(semanticScaleJob.report.resourceMetrics.sqliteBytes) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.semantic_scale_wal_size') }}: {{ formatBytes(semanticScaleJob.report.resourceMetrics.sqliteWalBytes) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.semantic_scale_cpu') }}: {{ semanticScaleJob.report.resourceMetrics.cpuUserMs.toFixed(1) }} / {{ semanticScaleJob.report.resourceMetrics.cpuSystemMs.toFixed(1) }} ms</div>
              </template>
              <div
                v-if="semanticScaleJob.report.summary.failingChecks.length > 0"
                :class="['col-span-2', 'border-t', 'border-rose-200', 'pt-2', 'dark:border-rose-900']"
              >
                <div :class="['text-xs', 'font-semibold', 'text-rose-600', 'dark:text-rose-300']">
                  {{ t('settings.pages.memory.workbench.fields.semantic_scale_failing_checks') }}
                </div>
                <ul :class="['mt-1', 'list-disc', 'space-y-1', 'pl-5', 'text-xs']">
                  <li v-for="check in semanticScaleJob.report.summary.failingChecks" :key="check">
                    {{ check }}
                  </li>
                </ul>
              </div>
              <div
                v-if="semanticScaleJob.report.recommendedNextActions.length > 0"
                :class="['col-span-2', 'border-t', 'border-neutral-200', 'pt-2', 'dark:border-neutral-800']"
              >
                <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
                  {{ t('settings.pages.memory.workbench.fields.semantic_scale_recommended_actions') }}
                </div>
                <ul :class="['mt-1', 'list-disc', 'space-y-1', 'pl-5', 'text-xs']">
                  <li v-for="action in semanticScaleJob.report.recommendedNextActions" :key="action">
                    {{ action }}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div :class="['mt-4', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
            <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.fields.semantic_scale_history') }}
            </div>
            <div v-if="semanticScaleJobs.length === 0" :class="['mt-2', 'text-sm', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.states.empty_semantic_scale_history') }}
            </div>
            <article
              v-for="job in semanticScaleJobs"
              :key="job.jobId"
              :class="[
                'mt-3', 'border', 'p-3', 'text-sm',
                semanticScaleJob?.jobId === job.jobId
                  ? 'border-neutral-950 dark:border-neutral-100'
                  : 'border-neutral-200 dark:border-neutral-800',
              ]"
            >
              <button
                type="button"
                :class="['flex', 'w-full', 'flex-wrap', 'items-center', 'justify-between', 'gap-2', 'text-left']"
                @click="store.selectSemanticScaleJob(job.jobId)"
              >
                <span>{{ job.tier }} · {{ formatSemanticScaleStatus(job.status) }}</span>
                <span :class="['text-xs', 'text-neutral-500']">{{ formatTimestamp(job.completedAt ?? job.updatedAt) }}</span>
              </button>
              <div v-if="job.report" :class="['mt-1', 'text-xs', 'text-neutral-500']">
                Recall@K {{ formatQualityScore(job.report.summary.recallAtK) }}
                · P95 {{ job.report.summary.p95LatencyMs.toFixed(1) }} ms
                · {{ t('settings.pages.memory.workbench.fields.coverage_ratio') }} {{ formatCoverageRatio(job.report.summary.coverageRatio) }}
              </div>
              <div v-if="job.deadLettered" :class="['mt-1', 'text-xs', 'text-rose-600', 'dark:text-rose-300']">
                dead-letter · {{ job.lastError ?? '-' }}
              </div>
              <div :class="['mt-2', 'flex', 'flex-wrap', 'gap-2']">
                <Button
                  :label="t('settings.pages.memory.workbench.actions.refresh_semantic_scale')"
                  icon="i-solar:refresh-bold-duotone"
                  size="sm"
                  variant="secondary"
                  :loading="semanticScaleLoading"
                  @click.stop="store.refreshSemanticScaleJob(job.jobId)"
                />
                <Button
                  v-if="['queued', 'running', 'cancel_requested'].includes(job.status)"
                  :label="t('settings.pages.memory.workbench.actions.cancel_semantic_scale')"
                  icon="i-solar:close-circle-bold-duotone"
                  size="sm"
                  variant="secondary"
                  :loading="semanticScaleLoading"
                  @click.stop="store.cancelSemanticScaleJob(job.jobId, t('settings.pages.memory.workbench.states.semantic_scale_cancelled_by_user'))"
                />
                <Button
                  v-if="job.deadLettered"
                  :label="t('settings.pages.memory.workbench.actions.retry_semantic_scale')"
                  icon="i-solar:restart-bold-duotone"
                  size="sm"
                  variant="secondary"
                  :loading="semanticScaleLoading"
                  @click.stop="store.retrySemanticScaleJob(job.jobId)"
                />
              </div>
            </article>
          </div>
        </section>

        <section v-if="internalDiagnosticsVisible" :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['text-sm', 'font-semibold']">
            {{ t('settings.pages.memory.workbench.quality.feedback_title') }}
          </div>
          <p :class="['mt-1', 'text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.quality.feedback_description') }}
          </p>
          <div :class="['mt-3', 'grid', 'gap-2']">
            <div :class="['text-xs', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.quality.replay_binding') }}
            </div>
            <input
              v-model="qualityTurnId"
              :class="['border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
              :placeholder="t('settings.pages.memory.workbench.quality.turn_id_placeholder')"
            >
            <input
              v-model="qualityDecisionTraceId"
              :class="['border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
              :placeholder="t('settings.pages.memory.workbench.quality.decision_trace_id_placeholder')"
            >
            <textarea
              v-model="qualityAssistantReply"
              :class="['min-h-20', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
              :placeholder="t('settings.pages.memory.workbench.quality.assistant_reply_placeholder')"
            />
            <input
              v-model="qualityExpectedMemoryIds"
              :class="['border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
              :placeholder="t('settings.pages.memory.workbench.quality.expected_ids_placeholder')"
            >
          </div>
          <div v-if="recallProbe?.evidence.length" :class="['mt-3', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
            <div :class="['text-xs', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.quality.surfaced_evidence') }}
            </div>
            <label
              v-for="item in recallProbe.evidence"
              :key="item.id"
              :class="['mt-2', 'flex', 'items-start', 'gap-2', 'text-xs']"
            >
              <input v-model="qualitySurfacedMemoryIds" type="checkbox" :value="item.id">
              <span class="min-w-0">
                <span class="font-medium">{{ item.id }}</span>
                <span class="ml-1 text-neutral-500">{{ item.summary }}</span>
              </span>
            </label>
          </div>
          <label :class="['mt-3', 'flex', 'flex-col', 'gap-1', 'text-xs', 'text-neutral-500']">
            <span>{{ t('memory-workbench.quality.reason_label') }}</span>
            <select
              v-model="selectedGoldLabelReason"
              :aria-label="t('memory-workbench.quality.reason_label')"
              :class="['border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'text-neutral-900', 'dark:border-neutral-700', 'dark:bg-neutral-950', 'dark:text-neutral-100']"
            >
              <option :value="null">
                {{ t('memory-workbench.quality.reason_none') }}
              </option>
              <option v-for="option in qualityGoldReasonOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <div :class="['mt-3', 'flex', 'flex-col', 'gap-2']">
            <Button
              v-for="option in qualityGoldLabelButtons"
              :key="option.value"
              :label="option.label"
              size="sm"
              :variant="option.variant"
              :loading="goldLabelLoading"
              :disabled="!qualityGoldContextReady || (option.value !== 'unwanted' && parseQualityMemoryIds(qualityExpectedMemoryIds).length === 0)"
              @click="applyProbeGoldLabel(option.value)"
            />
          </div>
          <div v-if="!qualityGoldContextReady" :class="['mt-2', 'text-xs', 'text-amber-600', 'dark:text-amber-300']">
            {{ t('settings.pages.memory.workbench.quality.replay_binding_required') }}
          </div>
          <div :class="['mt-3', 'text-xs', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.query') }}:
            {{ recallProbe?.query ?? recallQuery }}
          </div>
        </section>
      </div>

      <div :class="['flex', 'flex-col', 'gap-3']">
        <section :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-2']">
            <div>
              <div :class="['text-sm', 'font-semibold']">
                {{ t('settings.pages.memory.workbench.quality.report_title') }}
              </div>
              <div :class="['mt-1', 'text-xs', 'text-neutral-500']">
                {{ t('settings.pages.memory.workbench.fields.month') }}: {{ goldLabelMonth }}
              </div>
            </div>
            <div :class="['text-sm', qualityTrialReport?.passed ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300']">
              {{ qualityTrialReport ? (qualityTrialReport.passed ? t('settings.pages.memory.workbench.states.quality_passed') : t('settings.pages.memory.workbench.states.quality_failed')) : '-' }}
            </div>
          </div>
          <div v-if="!qualityTrialReport" :class="['mt-4', 'border', 'border-dashed', 'border-neutral-300', 'p-4', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
            {{ t('settings.pages.memory.workbench.states.empty_quality_report') }}
          </div>
          <template v-else>
            <div
              v-if="selectedQualityTrialRecord"
              :class="['mt-4', 'grid', 'grid-cols-1', 'gap-1', 'border-t', 'border-neutral-200', 'pt-3', 'text-xs', 'text-neutral-500', 'dark:border-neutral-800', 'md:grid-cols-3']"
            >
              <div>
                {{ t('settings.pages.memory.workbench.quality.quality_run_mode') }}:
                {{ selectedQualityTrialRecord.mode === 'live-provider'
                  ? t('settings.pages.memory.workbench.quality.live_provider')
                  : t('settings.pages.memory.workbench.quality.historical_replay') }}
              </div>
              <div>{{ t('settings.pages.memory.workbench.quality.quality_session') }}: {{ selectedQualityTrialRecord.sessionId ?? '-' }}</div>
              <div :class="['break-all']">
                {{ t('settings.pages.memory.workbench.quality.quality_report_hash') }}: {{ selectedQualityTrialRecord?.reportHash }}
              </div>
            </div>
            <div v-if="qualityTrialReport.summary.lastError" :class="['mt-3', 'whitespace-pre-wrap', 'break-words', 'text-sm', 'text-amber-600', 'dark:text-amber-300']">
              {{ t('settings.pages.memory.workbench.fields.last_error') }}:
              {{ formatQualityFailure(qualityTrialReport.summary.lastError) }}
            </div>
            <div :class="['mt-4', 'grid', 'grid-cols-2', 'gap-2', 'text-sm', 'lg:grid-cols-4']">
              <div>{{ t('settings.pages.memory.workbench.fields.long_term_fixtures') }}: {{ qualityTrialReport.summary.longTermFixtureCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.working_memory_fixtures') }}: {{ qualityTrialReport.summary.workingMemoryFixtureCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.compressed_context_fixtures') }}: {{ qualityTrialReport.summary.compressedContextBehaviorFixtureCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.temporal_conflict_fixtures') }}: {{ qualityTrialReport.summary.temporalConflictFixtureCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.semantic_scale_soak') }}: {{ qualityTrialReport.summary.semanticScaleSoakRunCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.experience_quality') }}: {{ qualityTrialReport.summary.experienceQualityFixtureCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.scope_fuzz_cases') }}: {{ qualityTrialReport.summary.scopeFuzzCaseCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.persona_fixtures') }}: {{ qualityTrialReport.summary.personaTrainingFixtureCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.dialogue_replay') }}: {{ qualityTrialReport.summary.dialogueReplayCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.recall_at_k') }}: {{ formatQualityScore(qualityTrialReport.quality.summary.recallAtK) }}</div>
            </div>
            <div :class="['mt-4', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
              <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
                {{ t('settings.pages.memory.workbench.fields.regression_metrics') }}
              </div>
              <div :class="['mt-2', 'grid', 'grid-cols-2', 'gap-2', 'text-sm', 'lg:grid-cols-4']">
                <div>{{ t('settings.pages.memory.workbench.fields.recall_at_1') }}: {{ formatQualityScore(qualityTrialReport.regression.recallAt1) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.recall_at_3') }}: {{ formatQualityScore(qualityTrialReport.regression.recallAt3) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.recall_at_5') }}: {{ formatQualityScore(qualityTrialReport.regression.recallAt5) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.wrong_thread_rate') }}: {{ formatQualityScore(qualityTrialReport.regression.wrongThreadRate) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.semantic_hit_rate') }}: {{ formatQualityScore(qualityTrialReport.regression.semanticHitRate) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.source_trace_rate') }}: {{ formatQualityScore(qualityTrialReport.regression.sourceTraceRate) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.abstention_precision') }}: {{ formatQualityScore(qualityTrialReport.regression.abstentionPrecision) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.abstention_recall') }}: {{ formatQualityScore(qualityTrialReport.regression.abstentionRecall) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.recall_p50') }}: {{ qualityTrialReport.regression.p50LatencyMs.toFixed(1) }} ms</div>
                <div>{{ t('settings.pages.memory.workbench.fields.recall_p95') }}: {{ qualityTrialReport.regression.p95LatencyMs.toFixed(1) }} ms</div>
                <div>{{ t('settings.pages.memory.workbench.fields.recall_p99') }}: {{ qualityTrialReport.regression.p99LatencyMs.toFixed(1) }} ms</div>
                <div v-if="qualityTrialReport.regression.staleMemoryLeakRate !== null">
                  {{ t('settings.pages.memory.workbench.fields.stale_memory_leak_rate') }}:
                  {{ formatQualityScore(qualityTrialReport.regression.staleMemoryLeakRate) }}
                </div>
                <div v-if="qualityTrialReport.regression.temporalUpdateAccuracy !== null">
                  {{ t('settings.pages.memory.workbench.fields.temporal_update_accuracy') }}:
                  {{ formatQualityScore(qualityTrialReport.regression.temporalUpdateAccuracy) }}
                </div>
                <div>{{ t('settings.pages.memory.workbench.fields.provider_failure_rate') }}: {{ formatQualityScore(qualityTrialReport.regression.providerFailureRate) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.queue_failure_rate') }}: {{ formatQualityScore(qualityTrialReport.regression.queueFailureRate) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.dead_letter_rate') }}: {{ formatQualityScore(qualityTrialReport.regression.deadLetterRate) }}</div>
                <div v-if="qualityTrialReport.regression.embeddingCoverageRatio !== null">
                  {{ t('settings.pages.memory.workbench.fields.embedding_coverage_ratio') }}:
                  {{ formatQualityScore(qualityTrialReport.regression.embeddingCoverageRatio) }}
                </div>
              </div>
            </div>
            <div v-if="qualityTrialReport.dialogueReplay" :class="['mt-4', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
              <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
                {{ t('settings.pages.memory.workbench.fields.dialogue_replay') }}
              </div>
              <div :class="['mt-2', 'grid', 'grid-cols-2', 'gap-2', 'text-sm', 'lg:grid-cols-4']">
                <div>{{ t('settings.pages.memory.workbench.fields.replay_turns') }}: {{ qualityTrialReport.dialogueReplay.summary.turnCount }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.replay_succeeded_turns') }}: {{ qualityTrialReport.dialogueReplay.summary.succeededTurnCount }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.replay_failed_turns') }}: {{ qualityTrialReport.dialogueReplay.summary.failedTurnCount }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.replay_checkpoint_writes') }}: {{ qualityTrialReport.dialogueReplay.summary.checkpointWriteCount }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.replay_recalled_evidence') }}: {{ qualityTrialReport.dialogueReplay.summary.recalledEvidenceCount }}</div>
              </div>
              <div v-if="qualityTrialReport.dialogueReplay.summary.lastError" :class="['mt-2', 'text-sm', 'text-amber-600', 'dark:text-amber-300']">
                {{ t('settings.pages.memory.workbench.fields.last_error') }}:
                {{ formatQualityFailure(qualityTrialReport.dialogueReplay.summary.lastError) }}
              </div>
            </div>
            <div v-if="qualityTrialReport.liveProviderTrial" :class="['mt-4', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
              <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
                {{ t('settings.pages.memory.workbench.quality.live_provider_diagnostics') }}
              </div>
              <div :class="['mt-2', 'grid', 'grid-cols-2', 'gap-2', 'text-sm', 'lg:grid-cols-4']">
                <div>{{ t('settings.pages.memory.workbench.fields.provider_call_count') }}: {{ qualityTrialReport.liveProviderTrial.summary.providerCallCount }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.provider_retry_count') }}: {{ qualityTrialReport.liveProviderTrial.summary.providerRetryCount }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.provider_failure_rate') }}: {{ formatQualityScore(qualityTrialReport.liveProviderTrial.summary.providerFailureRate) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.provider_p50') }}: {{ qualityTrialReport.liveProviderTrial.summary.p50LatencyMs }} ms</div>
                <div>{{ t('settings.pages.memory.workbench.fields.provider_p95') }}: {{ qualityTrialReport.liveProviderTrial.summary.p95LatencyMs }} ms</div>
                <div>{{ t('settings.pages.memory.workbench.fields.provider_p99') }}: {{ qualityTrialReport.liveProviderTrial.summary.p99LatencyMs }} ms</div>
                <div>{{ t('settings.pages.memory.workbench.fields.replay_turns') }}: {{ qualityTrialReport.liveProviderTrial.summary.turnCount }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.replay_recalled_evidence') }}: {{ qualityTrialReport.liveProviderTrial.summary.recalledEvidenceCount }}</div>
              </div>
              <div v-if="qualityTrialReport.liveProviderTrial.summary.lastError" :class="['mt-2', 'text-sm', 'text-amber-600', 'dark:text-amber-300']">
                {{ t('settings.pages.memory.workbench.fields.last_error') }}:
                {{ formatQualityFailure(qualityTrialReport.liveProviderTrial.summary.lastError) }}
              </div>
            </div>
            <div v-if="qualityTrialReport.runtimeHealth" :class="['mt-4', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
              <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
                {{ t('settings.pages.memory.workbench.fields.runtime_health') }}
              </div>
              <div :class="['mt-2', 'grid', 'grid-cols-2', 'gap-2', 'text-sm', 'lg:grid-cols-3']">
                <div>{{ t('settings.pages.memory.workbench.fields.queue_pending') }}: {{ qualityTrialReport.runtimeHealth.queue.pending }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.queue_review') }}: {{ qualityTrialReport.runtimeHealth.queue.review }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.queue_applied') }}: {{ qualityTrialReport.runtimeHealth.queue.applied }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.queue_failed') }}: {{ qualityTrialReport.runtimeHealth.queue.failed }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.queue_dead_lettered') }}: {{ qualityTrialReport.runtimeHealth.queue.deadLettered }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.recall_latency') }}: {{ qualityTrialReport.runtimeHealth.recall.lastLatencyMs ?? '-' }} ms</div>
                <div>{{ t('settings.pages.memory.workbench.fields.recall_p95') }}: {{ qualityTrialReport.runtimeHealth.recall.p95LatencyMs ?? '-' }} ms</div>
                <div>{{ t('settings.pages.memory.workbench.fields.embedding_provider') }}: {{ qualityTrialReport.runtimeHealth.embedding.providerConfigured ? t('settings.pages.memory.workbench.states.configured') : t('settings.pages.memory.workbench.states.not_configured') }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.model') }}: {{ qualityTrialReport.runtimeHealth.embedding.modelId ?? '-' }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.dimensions') }}: {{ qualityTrialReport.runtimeHealth.embedding.dimensions ?? '-' }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.index_mode') }}: {{ formatIndexMode(qualityTrialReport.runtimeHealth.embedding.indexMode) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.degraded') }}: {{ formatBoolean(qualityTrialReport.runtimeHealth.embedding.degraded) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.native_index') }}: {{ formatBoolean(qualityTrialReport.runtimeHealth.embedding.nativeIndexReady) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.reindex_required') }}: {{ formatBoolean(qualityTrialReport.runtimeHealth.embedding.reindexRequired) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.search_ready') }}: {{ formatBoolean(qualityTrialReport.runtimeHealth.embedding.searchReady) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.coverage_ratio') }}: {{ formatCoverageRatio(qualityTrialReport.runtimeHealth.embedding.coverageRatio) }}</div>
              </div>
              <div v-if="qualityTrialReport.runtimeHealth.recall.lastError" :class="['mt-2', 'text-sm', 'text-amber-600', 'dark:text-amber-300']">
                {{ t('settings.pages.memory.workbench.fields.recall_health') }}:
                {{ formatQualityFailure(qualityTrialReport.runtimeHealth.recall.lastError) }}
              </div>
              <div v-if="qualityTrialReport.runtimeHealth.embedding.lastError" :class="['mt-2', 'text-sm', 'text-amber-600', 'dark:text-amber-300']">
                {{ t('settings.pages.memory.workbench.fields.embedding_health') }}:
                {{ formatQualityFailure(qualityTrialReport.runtimeHealth.embedding.lastError) }}
              </div>
              <ul v-if="qualityTrialReport.runtimeHealth.errors.length > 0" :class="['mt-2', 'list-disc', 'space-y-1', 'pl-5', 'text-sm', 'text-amber-600', 'dark:text-amber-300']">
                <li v-for="error in qualityTrialReport.runtimeHealth.errors" :key="error">
                  {{ formatQualityFailure(error) }}
                </li>
              </ul>
            </div>
            <div v-if="qualityTrialReport.summary.failingStageIds.length > 0" :class="['mt-3', 'text-sm', 'text-amber-600', 'dark:text-amber-300']">
              {{ t('settings.pages.memory.workbench.fields.failing_stages') }}:
              {{ listText(qualityTrialReport.summary.failingStageIds) }}
            </div>
            <div v-if="qualityFailureDetails.length > 0" :class="['mt-4', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
              <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
                {{ t('settings.pages.memory.workbench.fields.quality_findings') }}
              </div>
              <div :class="['mt-2', 'grid', 'grid-cols-1', 'gap-2', 'xl:grid-cols-2']">
                <article v-for="item in qualityFailureDetails" :key="item.id" :class="['border', 'border-neutral-200', 'p-3', 'dark:border-neutral-800']">
                  <div :class="['text-sm', 'font-medium']">
                    {{ item.title }}
                  </div>
                  <div :class="['mt-1', 'text-xs', 'text-neutral-500']">
                    {{ item.description }}
                  </div>
                  <ul v-if="item.meta.length > 0" :class="['mt-2', 'list-disc', 'space-y-1', 'pl-4', 'text-xs', 'text-neutral-500']">
                    <li v-for="meta in item.meta" :key="meta">
                      {{ meta }}
                    </li>
                  </ul>
                </article>
              </div>
            </div>
            <div v-if="qualityTrialReport.recommendedNextActions.length > 0" :class="['mt-4', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
              <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
                {{ t('settings.pages.memory.workbench.fields.recommended_actions') }}
              </div>
              <ul :class="['mt-2', 'list-disc', 'space-y-1', 'pl-5', 'text-sm']">
                <li v-for="action in qualityTrialReport.recommendedNextActions" :key="action">
                  {{ formatQualityAction(action) }}
                </li>
              </ul>
            </div>
          </template>
        </section>

        <section v-if="internalDiagnosticsVisible" :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
          <div :class="['flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-2']">
            <div :class="['text-sm', 'font-semibold']">
              {{ t('settings.pages.memory.workbench.quality.gold_labels_title') }}
            </div>
            <div :class="['text-xs', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.fields.count') }}:
              {{ monthlyGoldRegressionPack?.itemCount ?? monthlyGoldLabels.length }}
            </div>
          </div>
          <div v-if="monthlyGoldRegressionPack" :class="['mt-2', 'border', 'border-emerald-200', 'bg-emerald-50', 'p-2', 'text-xs', 'text-emerald-800', 'dark:border-emerald-900', 'dark:bg-emerald-950/30', 'dark:text-emerald-200']">
            {{ t('settings.pages.memory.workbench.quality.frozen_pack') }}
            · {{ monthlyGoldRegressionPack.packId }}
            · {{ formatTimestamp(monthlyGoldRegressionPack.frozenAt) }}
            · {{ monthlyGoldRegressionPack.contentHash }}
          </div>
          <div v-if="monthlyGoldLabels.length === 0" :class="['mt-4', 'border', 'border-dashed', 'border-neutral-300', 'p-4', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
            {{ t('settings.pages.memory.workbench.states.empty_gold_labels') }}
          </div>
          <div v-else :class="['mt-3', 'flex', 'flex-col', 'gap-2']">
            <article v-for="item in monthlyGoldLabels" :key="item.id" :class="['border', 'border-neutral-200', 'p-3', 'dark:border-neutral-800']">
              <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
                <span>{{ item.labelText }}</span>
                <span v-if="item.reason">
                  {{ t(`memory-workbench.quality.reasons.${item.reason}.label`) }}
                </span>
                <span>{{ item.evaluationClass }}</span>
                <span>{{ formatTimestamp(item.createdAt) }}</span>
              </div>
              <div :class="['mt-2', 'text-sm', 'font-medium']">
                {{ item.query }}
              </div>
              <div :class="['mt-2', 'text-xs', 'text-neutral-500']">
                {{ t('settings.pages.memory.workbench.quality.replay_context') }}:
                {{ item.sessionId }} / {{ item.turnId }}
                · {{ t('settings.pages.memory.workbench.quality.evidence_snapshot') }} {{ item.retrievedEvidenceSnapshot.length }}
              </div>
              <div :class="['mt-1', 'whitespace-pre-wrap', 'text-xs', 'text-neutral-500']">
                {{ item.assistantReply }}
              </div>
              <div :class="['mt-2', 'grid', 'grid-cols-1', 'gap-1', 'text-xs', 'text-neutral-500', 'md:grid-cols-3']">
                <div>{{ t('settings.pages.memory.workbench.fields.expected_ids') }}: {{ listText(item.expectedMemoryIds) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.surfaced_ids') }}: {{ listText(item.surfacedMemoryIds) }}</div>
                <div>{{ t('settings.pages.memory.workbench.fields.wrong_thread_ids') }}: {{ listText(item.wrongThreadIds) }}</div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </section>

    <section v-else-if="activeTab === 'persona'" :class="['flex', 'flex-col', 'gap-3']">
      <PersonaRuntimeConfig />
      <PersonaTrainingExecutorConfig />
      <PersonaTrainingRuns :dataset-id="personaTrainingDataset?.activeVersionId" />
      <div :class="['flex', 'flex-wrap', 'gap-2']">
        <Button
          :label="t('settings.pages.memory.workbench.actions.refresh')"
          icon="i-solar:refresh-bold-duotone"
          size="sm"
          :loading="personaLoading"
          @click="store.refreshPersonaCandidates()"
        />
      </div>
      <div v-if="personaCandidates.length === 0" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.empty_persona') }}
      </div>
      <article v-for="item in personaCandidates" :key="item.id" :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
          <span>{{ t('settings.pages.memory.workbench.fields.candidate_status') }}: {{ formatPersonaCandidateStatus(item.status) }}</span>
          <span>{{ t('settings.pages.memory.workbench.fields.privacy_class') }}: {{ formatPersonaPrivacyClass(item.privacyClass) }}</span>
          <span>{{ t('settings.pages.memory.workbench.fields.training') }}: {{ item.allowTraining ? t('settings.pages.memory.workbench.filters.training.allowed') : t('settings.pages.memory.workbench.filters.training.blocked') }}</span>
        </div>
        <div :class="['mt-3', 'text-xs', 'font-semibold', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.behavior_lesson') }}
        </div>
        <div :class="['mt-1', 'text-sm', 'font-medium']">
          {{ item.behaviorLesson }}
        </div>
        <div :class="['mt-3', 'grid', 'grid-cols-1', 'gap-3', 'lg:grid-cols-2']">
          <div>
            <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.fields.positive_example') }}
            </div>
            <div :class="['mt-1', 'text-sm']">
              {{ item.positiveExample }}
            </div>
          </div>
          <div>
            <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.fields.negative_example') }}
            </div>
            <div :class="['mt-1', 'text-sm']">
              {{ item.negativeExample ?? '-' }}
            </div>
          </div>
        </div>
        <div :class="['mt-3', 'text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.source_ids') }}: {{ listText(item.sourceMemoryIds) }}
        </div>
        <div :class="['mt-3', 'flex', 'flex-wrap', 'gap-2']">
          <Button size="sm" :label="t('settings.pages.memory.workbench.actions.approve_candidate')" :loading="personaLoading" @click="store.applyPersonaCandidateAction(item.id, 'approve')" />
          <Button size="sm" variant="secondary" :label="t('settings.pages.memory.workbench.actions.reject_candidate')" :loading="personaLoading" @click="store.applyPersonaCandidateAction(item.id, 'reject')" />
          <Button size="sm" variant="secondary" :label="t('settings.pages.memory.workbench.actions.no_training')" :loading="personaLoading" @click="store.applyPersonaCandidateAction(item.id, 'no-training')" />
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === 'skills'" :class="['flex', 'flex-col', 'gap-3']">
      <div :class="['flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-2']">
        <div>
          <h2 :class="['text-lg', 'font-semibold']">
            {{ t('settings.pages.memory.workbench.skills.title') }}
          </h2>
          <p :class="['mt-1', 'text-sm', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.skills.description') }}
          </p>
        </div>
        <Button
          :label="t('settings.pages.memory.workbench.actions.refresh')"
          icon="i-solar:refresh-bold-duotone"
          size="sm"
          :loading="skillLoading"
          @click="store.refreshSkills(false)"
        />
      </div>
      <div v-if="skills.length === 0" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.skills.empty') }}
      </div>
      <article v-for="skill in skills" :key="`${skill.id}@${skill.version}`" :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
          <span class="font-semibold">{{ skill.id }}@{{ skill.version }}</span>
          <span>{{ skill.activationStatus }}</span>
          <span>{{ skill.evaluationStatus }}</span>
          <span>{{ skill.risk }}</span>
        </div>
        <div :class="['mt-2', 'text-sm']">
          {{ skill.description }}
        </div>
        <div :class="['mt-2', 'text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.skills.permissions') }}: {{ listText(skill.permissions) }}
        </div>
        <div :class="['mt-3', 'flex', 'flex-wrap', 'gap-2']">
          <Button
            v-if="skill.activationStatus !== 'active'"
            :label="t('settings.pages.memory.workbench.skills.activate')"
            icon="i-solar:play-bold-duotone"
            size="sm"
            :loading="skillLoading"
            @click="store.activateSkill(skill.id, skill.version)"
          />
          <Button
            v-if="skill.activationStatus === 'active'"
            :label="t('settings.pages.memory.workbench.skills.rollback')"
            icon="i-solar:restart-bold-duotone"
            size="sm"
            variant="secondary"
            :loading="skillLoading"
            @click="store.rollbackSkill(skill.id, skill.version)"
          />
          <Button
            v-if="skill.activationStatus !== 'revoked'"
            :label="t('settings.pages.memory.workbench.skills.revoke')"
            icon="i-solar:forbidden-circle-bold-duotone"
            size="sm"
            variant="danger"
            :loading="skillLoading"
            @click="store.revokeSkill(skill.id, skill.version)"
          />
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === 'health'" :class="['grid', 'grid-cols-1', 'gap-3', 'xl:grid-cols-2']">
      <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['text-sm', 'font-semibold']">
          {{ t('settings.pages.memory.workbench.fields.queue_health') }}
        </div>
        <div :class="['mt-3', 'grid', 'grid-cols-2', 'gap-2', 'text-sm']">
          <div>{{ t('settings.pages.memory.workbench.fields.queue_pending') }}: {{ health?.queue.pending ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.queue_review') }}: {{ health?.queue.review ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.queue_applied') }}: {{ health?.queue.applied ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.queue_failed') }}: {{ health?.queue.failed ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.queue_dead_lettered') }}: {{ health?.queue.deadLettered ?? 0 }}</div>
        </div>
      </div>
      <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800', 'xl:col-span-2']">
        <div :class="['flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-2']">
          <div :class="['text-sm', 'font-semibold']">
            {{ t('settings.pages.memory.workbench.fields.cleaning_queue_failures') }}
          </div>
          <div :class="['flex', 'flex-wrap', 'gap-2']">
            <Button
              :label="t('settings.pages.memory.workbench.actions.refresh')"
              icon="i-solar:refresh-bold-duotone"
              size="sm"
              variant="secondary"
              :loading="workingMemoryCleaningLoading"
              @click="store.refreshWorkingMemoryCleaningFailures()"
            />
            <Button
              v-if="workingMemoryCleaningFailures.length > 0"
              :label="t('settings.pages.memory.workbench.actions.retry_cleaning_queue_failures')"
              icon="i-solar:restart-bold-duotone"
              size="sm"
              variant="secondary"
              :loading="workingMemoryCleaningLoading"
              @click="store.retryWorkingMemoryCleaningFailures()"
            />
          </div>
        </div>
        <div v-if="workingMemoryCleaningFailures.length === 0" :class="['mt-3', 'border', 'border-dashed', 'border-neutral-300', 'p-4', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
          {{ t('settings.pages.memory.workbench.states.empty_cleaning_queue_failures') }}
        </div>
        <div v-else :class="['mt-3', 'flex', 'flex-col', 'gap-2']">
          <article v-for="failureItem in workingMemoryCleaningFailures" :key="failureItem.itemId" :class="['border', 'border-rose-200', 'p-3', 'dark:border-rose-900']">
            <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2', 'text-xs', 'text-neutral-500']">
              <span>{{ failureItem.status }}</span>
              <span>{{ failureItem.source }}</span>
              <span>{{ failureItem.sourceId }}</span>
              <span>{{ failureItem.itemId }}</span>
            </div>
            <div :class="['mt-2', 'grid', 'grid-cols-1', 'gap-1', 'text-xs', 'text-neutral-500', 'md:grid-cols-2']">
              <div>{{ t('settings.pages.memory.workbench.fields.attempt_count') }}: {{ failureItem.attemptCount }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.created_at') }}: {{ formatTimestamp(failureItem.createdAt) }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.updated_at') }}: {{ formatTimestamp(failureItem.updatedAt) }}</div>
              <div>{{ t('settings.pages.memory.workbench.fields.next_retry_at') }}: {{ formatTimestamp(failureItem.nextAttemptAt) }}</div>
            </div>
            <div :class="['mt-2', 'whitespace-pre-wrap', 'break-words', 'text-sm', 'text-rose-600', 'dark:text-rose-300']">
              {{ failureItem.lastError ?? '-' }}
            </div>
            <Button
              :label="t('settings.pages.memory.workbench.actions.retry_cleaning_queue_failure')"
              icon="i-solar:restart-bold-duotone"
              size="sm"
              variant="secondary"
              :loading="workingMemoryCleaningLoading"
              @click="store.retryWorkingMemoryCleaningFailures([failureItem.itemId])"
            />
          </article>
          <Button
            v-if="workingMemoryCleaningFailuresNextCursor"
            :label="t('settings.pages.memory.workbench.actions.load_more')"
            icon="i-solar:alt-arrow-down-bold-duotone"
            size="sm"
            variant="secondary"
            :loading="workingMemoryCleaningLoading"
            @click="store.loadMoreWorkingMemoryCleaningFailures()"
          />
        </div>
        <div v-if="workingMemoryCleaningRetriedItems.length > 0" :class="['mt-3', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
          <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
            {{ t('settings.pages.memory.workbench.fields.recent_cleaning_retries') }}
          </div>
          <div :class="['mt-2', 'flex', 'flex-col', 'gap-1', 'text-xs', 'text-neutral-500']">
            <div v-for="retriedItem in workingMemoryCleaningRetriedItems" :key="retriedItem.itemId">
              {{ retriedItem.itemId }} · {{ retriedItem.status }} · {{ formatTimestamp(retriedItem.updatedAt) }} · {{ retriedItem.lastError ?? '-' }}
            </div>
          </div>
        </div>
      </div>
      <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['text-sm', 'font-semibold']">
          {{ t('settings.pages.memory.workbench.fields.recall_health') }}
        </div>
        <div :class="['mt-3', 'grid', 'grid-cols-1', 'gap-2', 'text-sm']">
          <div>{{ t('settings.pages.memory.workbench.fields.recall_latency') }}: {{ health?.recall.lastLatencyMs ?? '-' }} ms</div>
          <div>{{ t('settings.pages.memory.workbench.fields.recall_p95') }}: {{ health?.recall.p95LatencyMs ?? '-' }} ms</div>
          <div>{{ t('settings.pages.memory.workbench.fields.errors') }}: {{ health?.recall.lastError ?? '-' }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.semantic_channel') }}: {{ health?.embedding.providerConfigured ? t('settings.pages.memory.workbench.fields.available') : t('settings.pages.memory.workbench.fields.unavailable') }}</div>
        </div>
      </div>
      <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['flex', 'flex-wrap', 'items-center', 'justify-between', 'gap-2']">
          <div :class="['text-sm', 'font-semibold']">
            {{ t('settings.pages.memory.workbench.fields.embedding_health') }}
          </div>
          <Button
            :label="t('settings.pages.memory.workbench.actions.reindex_embeddings')"
            icon="i-solar:refresh-bold-duotone"
            size="sm"
            :loading="reindexLoading"
            @click="store.reindexEmbeddings()"
          />
        </div>
        <div :class="['mt-3', 'grid', 'grid-cols-1', 'gap-2', 'text-sm']">
          <div>{{ t('settings.pages.memory.workbench.fields.embedding') }}: {{ health?.embedding.providerConfigured ? t('settings.pages.memory.workbench.states.configured') : t('settings.pages.memory.workbench.states.not_configured') }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.model') }}: {{ health?.embedding.modelId ?? reindexProgress?.modelId ?? '-' }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.dimensions') }}: {{ health?.embedding.dimensions ?? reindexProgress?.dimensions ?? '-' }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.index_mode') }}: {{ health?.embedding.indexMode ? formatIndexMode(health.embedding.indexMode) : '-' }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.approximate') }}: {{ formatBoolean(health?.embedding.approximate) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.degraded') }}: {{ formatBoolean(health?.embedding.degraded) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.native_index') }}: {{ formatBoolean(health?.embedding.nativeIndexReady) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.search_ready') }}: {{ formatBoolean(health?.embedding.searchReady) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.reindex_required') }}: {{ formatBoolean(health?.embedding.reindexRequired) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.canonical_count') }}: {{ health?.embedding.canonicalCount ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.indexed_count') }}: {{ health?.embedding.indexedCount ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.missing_count') }}: {{ health?.embedding.missingCount ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.text_hash_mismatch_count') }}: {{ health?.embedding.textHashMismatchCount ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.stale_or_failed_count') }}: {{ health?.embedding.staleOrFailedCount ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.orphaned_count') }}: {{ health?.embedding.orphanedCount ?? 0 }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.coverage_ratio') }}: {{ formatCoverageRatio(health?.embedding.coverageRatio) }}</div>
          <div v-if="reindexProgress">
            {{ t('settings.pages.memory.workbench.fields.reindex_status') }}:
            {{ formatReindexStatus(reindexProgress.status) }}
            ({{ reindexProgress.indexed }}/{{ reindexProgress.total }})
          </div>
          <div v-if="reindexProgress">
            {{ t('settings.pages.memory.workbench.fields.reindex_stage') }}:
            {{ formatReindexStage(reindexProgress.stage) }}
          </div>
          <div v-if="reindexProgress">
            {{ t('settings.pages.memory.workbench.fields.reindex_progress') }}:
            {{ Math.round(reindexProgress.progress * 100) }}%
          </div>
          <div v-if="reindexProgress?.lastError" :class="['text-rose-600', 'dark:text-rose-300']">
            {{ t('settings.pages.memory.workbench.fields.errors') }}: {{ reindexProgress.lastError }}
          </div>
          <div v-if="reindexResult">
            {{ t('settings.pages.memory.workbench.fields.indexed') }}: {{ reindexResult.indexed }} /
            {{ t('settings.pages.memory.workbench.fields.failed') }}: {{ reindexResult.failed }}
          </div>
          <div v-if="reindexProgress && ['queued', 'running', 'cancel_requested'].includes(reindexProgress.status)" :class="['flex', 'flex-wrap', 'gap-2']">
            <Button
              :label="t('settings.pages.memory.workbench.actions.cancel_reindex')"
              icon="i-solar:close-circle-bold-duotone"
              size="sm"
              variant="secondary"
              :loading="reindexLoading"
              @click="store.cancelReindexJob(reindexProgress.jobId, t('settings.pages.memory.workbench.states.cancelled_by_user'))"
            />
          </div>
          <div v-if="reindexProgress?.status === 'failed' && reindexProgress.deadLettered > 0" :class="['flex', 'flex-wrap', 'gap-2']">
            <Button
              :label="t('settings.pages.memory.workbench.actions.retry_dead_letter')"
              icon="i-solar:restart-bold-duotone"
              size="sm"
              variant="secondary"
              :loading="reindexLoading"
              @click="store.retryDeadLetterReindex(reindexProgress.jobId)"
            />
          </div>
          <div v-if="reindexDeadLetterItems.length > 0" :class="['flex', 'flex-col', 'gap-2', 'border-t', 'border-neutral-200', 'pt-3', 'dark:border-neutral-800']">
            <div :class="['text-xs', 'font-semibold', 'text-neutral-500']">
              {{ t('settings.pages.memory.workbench.fields.dead_letter_items') }}
            </div>
            <article v-for="deadLetterItem in reindexDeadLetterItems" :key="deadLetterItem.itemId" :class="['border', 'border-rose-200', 'p-3', 'dark:border-rose-900']">
              <div :class="['text-xs', 'text-neutral-500']">
                {{ deadLetterItem.source }} · {{ deadLetterItem.sourceId }}
              </div>
              <div :class="['mt-1', 'text-xs']">
                {{ t('settings.pages.memory.workbench.fields.attempt_count') }}: {{ deadLetterItem.attemptCount }}
              </div>
              <div :class="['mt-1', 'text-xs', 'text-rose-600', 'dark:text-rose-300']">
                {{ deadLetterItem.lastError ?? '-' }}
              </div>
              <Button
                :class="['mt-2']"
                :label="t('settings.pages.memory.workbench.actions.retry_dead_letter_item')"
                icon="i-solar:restart-bold-duotone"
                size="sm"
                variant="secondary"
                :loading="reindexLoading"
                @click="store.retryDeadLetterReindex(reindexProgress!.jobId, [deadLetterItem.itemId])"
              />
            </article>
          </div>
        </div>
      </div>
      <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['text-sm', 'font-semibold']">
          {{ t('settings.pages.memory.workbench.fields.errors') }}
        </div>
        <div :class="['mt-3', 'text-sm', 'text-neutral-500']">
          {{ listText(health?.errors ?? []) }}
        </div>
      </div>
      <details v-if="internalDiagnosticsVisible" :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800', 'xl:col-span-2']">
        <summary :class="['cursor-pointer', 'text-sm', 'font-semibold']">
          {{ t('settings.pages.memory.workbench.fields.debug_details') }}
        </summary>
        <pre :class="['mt-3', 'whitespace-pre-wrap', 'text-xs']">{{ JSON.stringify(health, null, 2) }}</pre>
      </details>
    </section>
  </div>
  <AlertDialogRoot :open="pendingTombstone !== null" @update:open="value => !value && cancelTombstone()">
    <AlertDialogPortal>
      <AlertDialogOverlay class="fixed inset-0 z-100 bg-black/50" />
      <AlertDialogContent class="fixed left-1/2 top-1/2 z-100 max-w-md w-full border border-neutral-200 bg-white p-6 shadow-xl -translate-x-1/2 -translate-y-1/2 dark:border-neutral-700 dark:bg-neutral-900">
        <AlertDialogTitle class="text-lg font-semibold">
          {{ t('settings.pages.memory.workbench.confirm_tombstone_title') }}
        </AlertDialogTitle>
        <AlertDialogDescription class="mt-3 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-300">
          {{ t('settings.pages.memory.workbench.confirm_tombstone_description', { summary: pendingTombstone?.summary ?? '' }) }}
        </AlertDialogDescription>
        <div class="mt-5 flex justify-end gap-2">
          <AlertDialogCancel as-child>
            <Button
              variant="secondary"
              :label="t('settings.pages.memory.workbench.actions.cancel')"
              @click="cancelTombstone"
            />
          </AlertDialogCancel>
          <AlertDialogAction as-child>
            <Button
              variant="danger"
              :label="t('settings.pages.memory.workbench.actions.confirm')"
              @click="confirmTombstone"
            />
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.memory.workbench.title
  subtitleKey: settings.pages.modules.title
  descriptionKey: settings.pages.memory.workbench.description
  icon: i-solar:database-bold-duotone
  stageTransition:
    name: slide
</route>
