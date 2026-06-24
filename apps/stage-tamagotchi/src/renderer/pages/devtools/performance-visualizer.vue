<script setup lang="ts">
import { ButtonBar } from '@proj-alicization/stage-ui/components'
import { useAlicizationMindReplayStore } from '@proj-alicization/stage-ui/stores/alicization-mind-replay'
import { useAlicizationSelfEvolutionInspectorStore } from '@proj-alicization/stage-ui/stores/alicization-self-evolution-inspector'
import { useLocalStorage } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import { useStageThreeRuntimeDiagnosticsStore } from '../../stores/stage-three-runtime-diagnostics'
import { useStageWindowLifecycleStore } from '../../stores/stage-window-lifecycle'
import { buildAuthorityDisplayRows } from './performance-visualizer-authority-rows'
import { buildAuthoritySegmentRows, buildAuthoritySummaryEntries, filterAuthoritySegmentRows, sortAuthoritySegmentRows } from './performance-visualizer-authority-summary'
import { buildAuthorityTableRows, filterAuthorityTableRows } from './performance-visualizer-authority-table'
import {
  buildPerformanceVisualizerClosureNavigationState,
  readPerformanceVisualizerClosureNavigationContext,
} from './performance-visualizer-closure-navigation'
import { resolvePerformanceVisualizerEvidenceLineScrollTargetId } from './performance-visualizer-evidence-scroll-target'
import {
  buildDriverExecutionTelemetrySummaryEntriesFromDiagnostics,
  buildResidentRuntimeTelemetrySummaryEntries,
} from './performance-visualizer-execution-telemetry-summary'
import { buildLive2DAuthorityComparisonView } from './performance-visualizer-live2d-authority'
import { buildPlaybackCueAuthorityView } from './performance-visualizer-playback-cue'
import { buildRuntimeAuthorityOverview } from './performance-visualizer-runtime-authority-overview'
import { buildSelfEvolutionActiveWorkflowFocus } from './performance-visualizer-self-evolution-active-workflow-focus'
import { buildSelfEvolutionAdoptedAnchor } from './performance-visualizer-self-evolution-adopted-anchor'
import { buildSelfEvolutionAdoptedAnchorHistoryTransition } from './performance-visualizer-self-evolution-adopted-anchor-history-transition'
import { buildSelfEvolutionAdoptedAnchorReplayPlan } from './performance-visualizer-self-evolution-adopted-anchor-replay'
import { buildSelfEvolutionAdoptedAnchorReplayFeedback } from './performance-visualizer-self-evolution-adopted-anchor-replay-feedback'
import { buildSelfEvolutionAdoptedAnchorTraceEventSelection } from './performance-visualizer-self-evolution-adopted-anchor-trace-event'
import { buildSelfEvolutionAdoptedAnchorTraceability } from './performance-visualizer-self-evolution-adopted-anchor-traceability'
import { buildSelfEvolutionBaselineAdoption } from './performance-visualizer-self-evolution-baseline-adoption'
import { buildSelfEvolutionBaselineAdoptionHistorySummary } from './performance-visualizer-self-evolution-baseline-adoption-history'
import { appendSelfEvolutionBaselineAdoptionHistory } from './performance-visualizer-self-evolution-baseline-adoption-history-records'
import { buildSelfEvolutionBaselineAdoptionRecord } from './performance-visualizer-self-evolution-baseline-adoption-record'
import { buildSelfEvolutionBaselineQuality } from './performance-visualizer-self-evolution-baseline-quality'
import {
  buildSelfEvolutionDiagnosticSummaryEntries,
} from './performance-visualizer-self-evolution-diagnostic-summary'
import { buildSelfEvolutionEvidencePanels } from './performance-visualizer-self-evolution-evidence'
import { buildSelfEvolutionEvidencePanelInput } from './performance-visualizer-self-evolution-evidence-input'
import { resolveDefaultSelfEvolutionFocusCardId } from './performance-visualizer-self-evolution-focus-card'
import { buildSelfEvolutionFocusDiffSummary } from './performance-visualizer-self-evolution-focus-diff'
import { appendSelfEvolutionFocusSnapshotHistory } from './performance-visualizer-self-evolution-focus-history'
import { buildSelfEvolutionFocusHistoryComparison } from './performance-visualizer-self-evolution-focus-history-comparison'
import { buildSelfEvolutionFocusHistoryDiffHighlighting } from './performance-visualizer-self-evolution-focus-history-diff-highlighting'
import {
  buildSelfEvolutionFocusHistoryPatternGuidanceDisplay,
  buildSelfEvolutionFocusSnapshotDisplay,
  buildSelfEvolutionFocusSnapshotHistoryDisplay,
  formatRendererRejoinSurfaceLabel,
  formatSelfEvolutionBooleanValue,
  formatSelfEvolutionCandidateStatus,
  formatSelfEvolutionClosureStatus,
  formatSelfEvolutionDisplayText,
  formatSelfEvolutionGovernanceValue,
  formatSelfEvolutionLearningValue,
  formatSelfEvolutionMemoryResolutionValue,
  formatSelfEvolutionRepairOwnerHint,
  formatSelfEvolutionRuntimeStatus,
  formatSelfEvolutionRuntimeValue,
  formatSelfEvolutionTraceListValue,
} from './performance-visualizer-self-evolution-focus-history-display'
import { buildSelfEvolutionFocusHistoryDrilldown } from './performance-visualizer-self-evolution-focus-history-drilldown'
import { buildSelfEvolutionFocusHistoryEventLocalization } from './performance-visualizer-self-evolution-focus-history-event-localization'
import { buildSelfEvolutionFocusHistoryPatternContext } from './performance-visualizer-self-evolution-focus-history-pattern-context'
import { buildSelfEvolutionFocusHistoryPatternGuidance } from './performance-visualizer-self-evolution-focus-history-pattern-guidance'
import { buildSelfEvolutionFocusHistoryPatternWorkflow } from './performance-visualizer-self-evolution-focus-history-pattern-workflow'
import { buildSelfEvolutionFocusHistoryPatterns } from './performance-visualizer-self-evolution-focus-history-patterns'
import { buildSelfEvolutionFocusHistoryRestorePlan } from './performance-visualizer-self-evolution-focus-history-restore-plan'
import { buildSelfEvolutionFocusHistorySummary } from './performance-visualizer-self-evolution-focus-history-summary'
import { buildSelfEvolutionFocusPlan } from './performance-visualizer-self-evolution-focus-plan'
import { buildSelfEvolutionFocusSnapshot } from './performance-visualizer-self-evolution-focus-snapshot'
import { buildSelfEvolutionRendererAuthorityProjection } from './performance-visualizer-self-evolution-renderer-authority'
import { buildSelfEvolutionRepairActionFeedback } from './performance-visualizer-self-evolution-repair-action-feedback'
import { buildSelfEvolutionRepairActionRoute } from './performance-visualizer-self-evolution-repair-action-route'
import { buildSelfEvolutionRepairClosure } from './performance-visualizer-self-evolution-repair-closure'
import { buildSelfEvolutionRepairFollowupNavigation } from './performance-visualizer-self-evolution-repair-followup-navigation'
import { buildSelfEvolutionRepairNextAction } from './performance-visualizer-self-evolution-repair-next-action'
import { buildSelfEvolutionRepairOutcome } from './performance-visualizer-self-evolution-repair-outcome'
import { buildSelfEvolutionRepairScrollTarget } from './performance-visualizer-self-evolution-repair-scroll-target'
import { buildSelfEvolutionRepairSession } from './performance-visualizer-self-evolution-repair-session'
import { resolveSelfEvolutionRuntimeBodyContinuityPhase } from './performance-visualizer-self-evolution-runtime-body-continuity-phase'
import { buildSelfEvolutionRuntimeContinuityProjection } from './performance-visualizer-self-evolution-runtime-continuity'
import { buildSelfEvolutionTriageView } from './performance-visualizer-self-evolution-triage-view'
import { buildSpeechAuthoritySegmentRows } from './performance-visualizer-speech-authority'
import {
  formatSpeechAuthorityFilterValue,
  formatSpeechAuthorityValue,
  formatSpeechDisplayText,
  formatSpeechObservabilityLabel,
  formatSpeechObservabilitySectionLabel,
} from './performance-visualizer-speech-display'
import { buildSpeechAuthorityHotspots, filterSpeechAuthorityHotspots } from './performance-visualizer-speech-hotspots'
import { buildSpeechObservabilityView } from './performance-visualizer-speech-observability'
import { buildSpeechObservabilityRows } from './performance-visualizer-speech-observability-rows'
import {
  formatRecentDrivingTraceDetailLine,
  formatRecentDrivingTraceHeading,
} from './performance-visualizer-trace-display'
import { resolveScopedTraceEmbodimentSummary } from './performance-visualizer-trace-embodiment-selection'
import {
  buildRecentDrivingEventSummaryEntries,
  buildRecentDrivingTraceDetailEntries,
  buildRecentDrivingTraceEventEntries,
  buildRecentDrivingTraceRecordSummaryEntriesFromDiagnostics,
} from './performance-visualizer-trace-timeline-summary'
import { buildVrmAuthorityComparisonView } from './performance-visualizer-vrm-authority'

const { t } = useI18n()
const route = useRoute()
const diagnostics = useStageThreeRuntimeDiagnosticsStore()
const replayStore = useAlicizationMindReplayStore()
const selfEvolutionInspector = useAlicizationSelfEvolutionInspectorStore()
const windowLifecycleStore = useStageWindowLifecycleStore()
const {
  hitTest,
  resourceSnapshots,
  snapshot: selfEvolutionSnapshot,
  activeCandidate,
  candidateCounts,
  loading: selfEvolutionLoading,
  drilledTraceResult,
  selectedCandidate,
  selectedCandidateConsumptionPreview,
  selectedCandidateRuntimeAlignment,
  selectedCandidateTraceCoverage,
  selectedCandidateTraceConsumptionEvidence,
  selectedCandidateConsumedTraceSummaries,
  selectedCandidateConsumptionStability,
  selectedCandidateTrajectorySummary,
  selectedCandidateBaselineAnchorAuditSummary,
  selectedCandidateCompanionshipTransitionSummary,
  birthPersonaAuthoritySummary,
  identityDriftGovernanceSummary,
  selectedCandidateInternalizationReadinessSummary,
  selectedCandidatePersonaAuthorityMappingSummary,
  selectedCandidateAuthoritySurfaces,
  selectedCandidatePersonaBiasProvenance,
  selectedCandidateProactiveActionChain,
  selectedCandidateProactiveManifestationChain,
  selectedCandidatePrivateThoughtGovernanceChain,
  selectedCandidateResidentPerformanceProjection,
  selectedCandidateEmbodimentOutputProjection,
  selectedCandidateImpactSummary,
  selectedCandidateProactiveDecisionConsumptionSummary,
  selectedCandidateRejectedActionAlternatives,
  selectedCandidateTraceDetails,
  selectedCandidateTraceEvents,
  selectedTraceEvent,
  selectedTraceEventDetails,
  selectedCandidateTraceSummary,
  sortedCandidates,
  preDialogueAwarenessSnapshot,
  preDialogueClosureSnapshot,
  benchmarkSupported,
  benchmarkLoading,
  benchmarkRuntimeSameHerProofSummary,
  benchmarkPreDialogueBriefingRows,
  speechEmbodiment,
  threeRender,
  tracing,
  vrmLifecycle,
  vrmUpdate,
} = {
  ...storeToRefs(diagnostics),
  ...storeToRefs(replayStore),
  ...storeToRefs(selfEvolutionInspector),
}
const {
  stagePaused,
  windowLifecycle,
} = storeToRefs(windowLifecycleStore)
const {
  lastError: replayLastError,
} = storeToRefs(replayStore)

onMounted(() => {
  diagnostics.startTracing()
  void selfEvolutionInspector.refresh().then(async () => {
    await nextTick()
    await applyClosureNavigationEntryFocus()
  })
})

onUnmounted(() => {
  diagnostics.stopTracing()
})

async function runRuntimeSameHerSessionProof() {
  if (!benchmarkSupported.value || benchmarkLoading.value)
    return

  await replayStore.runSameHerSessionProof()
  await selfEvolutionInspector.refresh()
}

function formatFloat(value?: number, digits = 2) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(digits)
    : 'n/a'
}

function formatCount(value?: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : 'n/a'
}

function formatTimestamp(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    return 'n/a'
  return new Date(value).toLocaleString()
}

function formatMaybeText(value?: string | null) {
  return typeof value === 'string' && value.trim()
    ? value
    : 'n/a'
}

function formatList(values?: Array<string | null | undefined>) {
  const normalized = (values ?? [])
    .map(value => typeof value === 'string' ? value.trim() : '')
    .filter(Boolean)
  return normalized.length > 0 ? normalized.join(', ') : 'n/a'
}

const live2dAuthorityComparisonView = computed(() => buildLive2DAuthorityComparisonView({
  speech: {
    live2dExecution: speechEmbodiment.value.live2dExecution,
    driverSummary: speechEmbodiment.value.driverSummary,
    playbackTelemetry: speechEmbodiment.value.playbackTelemetry,
  },
}))

const vrmAuthorityComparisonView = computed(() => buildVrmAuthorityComparisonView({
  speech: {
    driverSummary: speechEmbodiment.value.driverSummary,
    playbackTelemetry: speechEmbodiment.value.playbackTelemetry,
  },
  vrmUpdate: vrmUpdate.value,
}))

const playbackCueAuthorityView = computed(() => buildPlaybackCueAuthorityView({
  speech: {
    playbackTelemetry: speechEmbodiment.value.playbackTelemetry,
  },
  live2dAuthorityView: live2dAuthorityComparisonView.value,
  vrmAuthorityView: vrmAuthorityComparisonView.value,
}))

const authoritySummaryEntries = computed(() => buildAuthoritySummaryEntries({
  live2d: live2dAuthorityComparisonView.value,
  vrm: vrmAuthorityComparisonView.value,
}))

const authorityCueTextById = computed<Record<string, string | null>>(() => {
  const cueId = speechEmbodiment.value.playbackTelemetry?.cue?.id ?? null
  const cueText = speechEmbodiment.value.playbackTelemetry?.cue?.text ?? null
  return cueId ? { [cueId]: cueText } : {}
})

const authorityOnlyDriftRows = useLocalStorage('devtools/authority-only-drift-rows', false)
const authoritySurfaceFilter = useLocalStorage<'all' | 'live2d' | 'vrm'>('devtools/authority-surface-filter', 'all')
const authorityLaneFilter = useLocalStorage<'all' | 'expression' | 'motion' | 'face' | 'action' | 'lipsync' | 'voice' | 'settle'>('devtools/authority-lane-filter', 'all')
const authorityDriftFilter = useLocalStorage<'all' | 'hard-drift' | 'partial-drift' | 'unknown' | 'all-aligned'>('devtools/authority-drift-filter', 'all')
const authoritySpeechEvidenceFilter = useLocalStorage<'all' | 'speech' | 'prosody' | 'viseme' | 'micro-expression' | 'authority-match'>('devtools/authority-speech-evidence-filter', 'all')
const authoritySettleAuthorityFilter = useLocalStorage<'all' | 'authority-bound' | 'fallback-derived'>('devtools/authority-settle-authority-filter', 'all')
const authorityMismatchFilter = useLocalStorage<'all' | 'face-mismatch' | 'motion-mismatch' | 'lipsync-mismatch' | 'voice-mismatch'>('devtools/authority-mismatch-filter', 'all')
const authorityRendererDriftFilter = useLocalStorage<'all' | 'present' | 'pending-or-runtime-only' | 'none'>('devtools/authority-renderer-drift-filter', 'all')
const authorityCueTextQuery = useLocalStorage('devtools/authority-cue-text-query', '')

const authoritySegmentRows = computed(() => {
  const rows = buildAuthoritySegmentRows(
    authoritySummaryEntries.value,
    authorityCueTextById.value,
  )
  return filterAuthoritySegmentRows(
    sortAuthoritySegmentRows(rows),
    { onlyDrift: authorityOnlyDriftRows.value },
  )
})

const authorityDisplayRows = computed(() => buildAuthorityDisplayRows(authoritySegmentRows.value))
const speechObservabilityView = computed(() => buildSpeechObservabilityView(speechEmbodiment.value, {
  live2dAuthorityView: live2dAuthorityComparisonView.value,
  vrmAuthorityView: vrmAuthorityComparisonView.value,
}))
const speechObservabilityRows = computed(() => buildSpeechObservabilityRows(speechObservabilityView.value))
const speechAuthoritySegmentRows = computed(() => buildSpeechAuthoritySegmentRows(
  authoritySegmentRows.value,
  speechObservabilityView.value,
  {
    recentDrivingTraceRecord: speechEmbodiment.value.recentDrivingTraceRecord,
    recentDrivingTraceDetails: speechEmbodiment.value.recentDrivingTraceDetails,
  },
  {
    live2dAuthorityView: live2dAuthorityComparisonView.value,
    vrmAuthorityView: vrmAuthorityComparisonView.value,
  },
))
const speechAuthoritySegmentRowsByCueId = computed<Record<string, (typeof speechAuthoritySegmentRows.value)[number]>>(() =>
  Object.fromEntries(
    speechAuthoritySegmentRows.value.map(row => [row.cueId, row]),
  ),
)
const resolvedTraceEmbodimentSummary = computed(() => resolveScopedTraceEmbodimentSummary({
  playbackCueAuthorityView: playbackCueAuthorityView.value,
  speechEmbodiment: speechEmbodiment.value,
  speechAuthoritySegmentRowsByCueId: speechAuthoritySegmentRowsByCueId.value,
}))
const runtimeAuthorityOverview = computed(() => buildRuntimeAuthorityOverview({
  speechEmbodiment: speechEmbodiment.value,
  live2dAuthorityView: live2dAuthorityComparisonView.value,
  playbackCueAuthorityView: playbackCueAuthorityView.value,
  traceEmbodimentSummary: resolvedTraceEmbodimentSummary.value,
  vrmAuthorityView: vrmAuthorityComparisonView.value,
}))
const speechAuthorityHotspots = computed(() => filterSpeechAuthorityHotspots(
  buildSpeechAuthorityHotspots(
    authoritySegmentRows.value,
    speechAuthoritySegmentRows.value,
    {
      recentDrivingEvent: speechEmbodiment.value.recentDrivingEvent,
      recentDrivingTraceRecord: speechEmbodiment.value.recentDrivingTraceRecord,
      recentDrivingTraceEvents: speechEmbodiment.value.recentDrivingTraceEvents,
      recentDrivingTraceDetails: speechEmbodiment.value.recentDrivingTraceDetails,
      driverSummary: speechEmbodiment.value.driverSummary,
      playbackTelemetry: speechEmbodiment.value.playbackTelemetry,
    },
  ),
  {
    settleAuthority: authoritySettleAuthorityFilter.value === 'all' ? undefined : authoritySettleAuthorityFilter.value,
    authorityMatch: authorityMismatchFilter.value === 'all' ? undefined : authorityMismatchFilter.value,
    rendererDrift: authorityRendererDriftFilter.value === 'all' ? undefined : authorityRendererDriftFilter.value,
  },
))
const topSpeechAuthorityHotspots = computed(() => speechAuthorityHotspots.value.slice(0, 3))
const selfEvolutionRendererAuthorityProjection = computed(() => buildSelfEvolutionRendererAuthorityProjection({
  embodimentOutputProjection: selectedCandidateEmbodimentOutputProjection.value,
  speechEmbodiment: speechEmbodiment.value,
  live2dAuthorityView: live2dAuthorityComparisonView.value,
  vrmAuthorityView: vrmAuthorityComparisonView.value,
  playbackCueAuthorityView: playbackCueAuthorityView.value,
}))
const selfEvolutionRuntimeContinuityProjection = computed(() => buildSelfEvolutionRuntimeContinuityProjection({
  rendererAuthorityProjection: selfEvolutionRendererAuthorityProjection.value,
  speechEmbodiment: speechEmbodiment.value,
  traceEmbodimentSummary: resolvedTraceEmbodimentSummary.value,
}))
const selfEvolutionEvidencePanels = computed(() => buildSelfEvolutionEvidencePanels(buildSelfEvolutionEvidencePanelInput({
  preDialogueBriefingSummary: preDialogueClosureSnapshot.value
    ? {
        status: preDialogueClosureSnapshot.value.status,
        lines: [
          preDialogueClosureSnapshot.value.summaryLine ?? '',
          ...(preDialogueClosureSnapshot.value.briefingLines ?? []),
          ...((preDialogueClosureSnapshot.value.reasons ?? []).filter(reason =>
            reason.includes('Pre-dialogue self briefing currently reads')
            || reason.includes('Project same-her self line currently reads')
            || reason.includes('Same-her self authority currently reads')
            || reason.includes('Latest landed progress still holds')
            || reason.includes('Primary open life loop still centers on')
            || reason.includes('Next closure target is still'),
          )),
        ].filter(Boolean),
      }
    : null,
  internalizationReadinessSummary: selectedCandidateInternalizationReadinessSummary.value as any,
  proactiveDecisionConsumptionSummary: selectedCandidateProactiveDecisionConsumptionSummary.value,
  candidateTrajectorySummary: selectedCandidateTrajectorySummary.value as any,
  identityDriftGovernanceSummary: identityDriftGovernanceSummary.value as any,
  companionshipTransitionSummary: selectedCandidateCompanionshipTransitionSummary.value as any,
  personaBiasProvenance: selectedCandidatePersonaBiasProvenance.value,
  proactiveActionChain: selectedCandidateProactiveActionChain.value,
  proactiveManifestationChain: selectedCandidateProactiveManifestationChain.value,
  privateThoughtGovernanceChain: selectedCandidatePrivateThoughtGovernanceChain.value,
  residentPerformanceProjection: selectedCandidateResidentPerformanceProjection.value,
  embodimentOutputProjection: selectedCandidateEmbodimentOutputProjection.value,
  rendererAuthorityProjection: selfEvolutionRendererAuthorityProjection.value,
  runtimeContinuityProjection: selfEvolutionRuntimeContinuityProjection.value,
  rejectedActionAlternatives: selectedCandidateRejectedActionAlternatives.value,
})))
const selfEvolutionDiagnosticSummaryEntries = computed(() => buildSelfEvolutionDiagnosticSummaryEntries({
  preDialogueBriefingSummary: preDialogueClosureSnapshot.value
    ? {
        status: preDialogueClosureSnapshot.value.status,
        lines: [
          preDialogueClosureSnapshot.value.summaryLine ?? '',
          ...(preDialogueClosureSnapshot.value.briefingLines ?? []),
          ...((preDialogueClosureSnapshot.value.reasons ?? []).filter(reason =>
            reason.includes('Pre-dialogue self briefing currently reads')
            || reason.includes('Project same-her self line currently reads')
            || reason.includes('Same-her self authority currently reads')
            || reason.includes('Latest landed progress still holds')
            || reason.includes('Primary open life loop still centers on')
            || reason.includes('Next closure target is still'),
          )),
        ].filter(Boolean),
      }
    : null,
  internalizationReadinessSummary: selectedCandidateInternalizationReadinessSummary.value as any,
  proactiveDecisionConsumptionSummary: selectedCandidateProactiveDecisionConsumptionSummary.value as any,
  identityDriftGovernanceSummary: identityDriftGovernanceSummary.value as any,
  personaBiasProvenance: selectedCandidatePersonaBiasProvenance.value,
  proactiveActionChain: selectedCandidateProactiveActionChain.value,
  proactiveManifestationChain: selectedCandidateProactiveManifestationChain.value,
  privateThoughtGovernanceChain: selectedCandidatePrivateThoughtGovernanceChain.value,
  residentPerformanceProjection: selectedCandidateResidentPerformanceProjection.value,
  embodimentOutputProjection: selectedCandidateEmbodimentOutputProjection.value,
  rendererAuthorityProjection: selfEvolutionRendererAuthorityProjection.value,
  runtimeContinuityProjection: selfEvolutionRuntimeContinuityProjection.value,
  rejectedActionAlternatives: selectedCandidateRejectedActionAlternatives.value,
}))
const preDialogueAwarenessLines = computed(() => {
  const awareness = preDialogueAwarenessSnapshot.value
  if (!awareness)
    return []

  return [
    awareness.summaryLine,
    awareness.companionHeadlineLine,
    awareness.companionBriefingLine,
    awareness.awarenessLine,
    awareness.companionNextClosureLine,
    ...awareness.reasonPreview,
  ].filter((line, index, lines): line is string => Boolean(line) && lines.indexOf(line) === index)
})
const projectSelfBriefLines = computed(() => {
  const lines = [
    preDialogueClosureSnapshot.value?.summaryLine ?? null,
    ...(preDialogueClosureSnapshot.value?.briefingLines ?? []),
    ...preDialogueAwarenessLines.value,
  ].filter((line, index, entries): line is string => Boolean(line) && entries.indexOf(line) === index)

  return lines.filter((line) => {
    const normalizedLine = line.toLowerCase()
    return normalizedLine.includes('alicization')
      || normalizedLine.includes('digital life')
      || normalizedLine.includes('phase 1')
      || normalizedLine.includes('project identity')
      || normalizedLine.includes('project awareness')
      || normalizedLine.includes('landed progress')
      || normalizedLine.includes('primary open life loop')
      || normalizedLine.includes('open life loop')
      || normalizedLine.includes('next closure')
      || normalizedLine.includes('embodiment closure')
      || normalizedLine.includes('body line')
      || normalizedLine.includes('same-her')
  })
})
const selfEvolutionTriageView = computed(() => buildSelfEvolutionTriageView(
  selfEvolutionDiagnosticSummaryEntries.value,
))
const selectedSelfEvolutionTriageCardId = ref<'repair-owner' | 'first-check' | 'repair-path' | null>(null)
const selfEvolutionFocusPlan = computed(() => buildSelfEvolutionFocusPlan(
  selfEvolutionTriageView.value.triageCards,
  selectedSelfEvolutionTriageCardId.value,
  selectedCandidateTraceEvents.value,
))
const selfEvolutionFocusSnapshotHistory = useLocalStorage<Record<string, any>[]>(
  'devtools/self-evolution-focus-snapshot-history',
  [],
)
const selfEvolutionBaselineAdoptionHistory = useLocalStorage<Record<string, any>[]>(
  'devtools/self-evolution-baseline-adoption-history',
  [],
)
const lastSelfEvolutionFocusSnapshot = computed(() => selfEvolutionFocusSnapshotHistory.value[0] ?? null)
const selfEvolutionFocusHistorySummary = computed(() => buildSelfEvolutionFocusHistorySummary(
  selfEvolutionFocusSnapshotHistory.value as any,
))
const selfEvolutionFocusHistoryDrilldown = computed(() => buildSelfEvolutionFocusHistoryDrilldown(
  selfEvolutionFocusSnapshotHistory.value as any,
))
const selfEvolutionFocusHistoryPatterns = computed(() => buildSelfEvolutionFocusHistoryPatterns(
  selfEvolutionFocusSnapshotHistory.value as any,
))
const selfEvolutionFocusHistoryPatternGuidance = computed(() => selfEvolutionFocusHistoryPatterns.value
  .map(pattern => ({
    patternKey: pattern.patternKey,
    guidance: buildSelfEvolutionFocusHistoryPatternGuidance(pattern as any),
  }))
  .filter((item): item is {
    patternKey: string
    guidance: NonNullable<ReturnType<typeof buildSelfEvolutionFocusHistoryPatternGuidance>>
  } => Boolean(item.guidance)))
const selfEvolutionFocusHistoryPatternGuidanceByKey = computed<Record<string, NonNullable<(typeof selfEvolutionFocusHistoryPatternGuidance.value)[number]['guidance']>>>(() =>
  Object.fromEntries(
    selfEvolutionFocusHistoryPatternGuidance.value.map(item => [item.patternKey, item.guidance]),
  ),
)
const selfEvolutionFocusHistoryPatternGuidanceDisplayByKey = computed<Record<string, ReturnType<typeof buildSelfEvolutionFocusHistoryPatternGuidanceDisplay>>>(() =>
  Object.fromEntries(
    selfEvolutionFocusHistoryPatternGuidance.value.map(item => [
      item.patternKey,
      buildSelfEvolutionFocusHistoryPatternGuidanceDisplay(item.guidance as any),
    ]),
  ),
)
const lastSelfEvolutionFocusSnapshotDisplay = computed(() =>
  lastSelfEvolutionFocusSnapshot.value
    ? buildSelfEvolutionFocusSnapshotDisplay(lastSelfEvolutionFocusSnapshot.value as any)
    : null,
)
const selfEvolutionFocusSnapshotHistoryDisplay = computed(() =>
  buildSelfEvolutionFocusSnapshotHistoryDisplay(selfEvolutionFocusSnapshotHistory.value as any),
)
const selfEvolutionFocusHistoryPatternWorkflowByKey = computed<Record<string, NonNullable<ReturnType<typeof buildSelfEvolutionFocusHistoryPatternWorkflow>>>>(() =>
  Object.fromEntries(
    selfEvolutionFocusHistoryPatterns.value
      .map((pattern) => {
        const guidance = selfEvolutionFocusHistoryPatternGuidance.value
          .find(item => item.patternKey === pattern.patternKey)
          ?.guidance ?? null
        const workflow = buildSelfEvolutionFocusHistoryPatternWorkflow({
          pattern: pattern as any,
          guidance: guidance as any,
        })
        return workflow
          ? [pattern.patternKey, workflow]
          : null
      })
      .filter(Boolean) as Array<[string, NonNullable<ReturnType<typeof buildSelfEvolutionFocusHistoryPatternWorkflow>>]>,
  ),
)
const selfEvolutionFocusHistoryPatternContextByKey = computed<Record<string, NonNullable<ReturnType<typeof buildSelfEvolutionFocusHistoryPatternContext>>>>(() =>
  Object.fromEntries(
    selfEvolutionFocusHistoryPatterns.value
      .map((pattern) => {
        const guidance = selfEvolutionFocusHistoryPatternGuidance.value
          .find(item => item.patternKey === pattern.patternKey)
          ?.guidance ?? null

        const context = buildSelfEvolutionFocusHistoryPatternContext({
          pattern: pattern as any,
          preferredSide: guidance?.governanceLayer === 'persona-thought' ? 'current' : 'previous',
        })

        return context
          ? [pattern.patternKey, context]
          : null
      })
      .filter(Boolean) as Array<[string, NonNullable<ReturnType<typeof buildSelfEvolutionFocusHistoryPatternContext>>]>,
  ),
)
const activeSelfEvolutionWorkflowPatternKey = ref<string | null>(null)
const activeSelfEvolutionWorkflowFocus = computed(() => buildSelfEvolutionActiveWorkflowFocus({
  activePatternKey: activeSelfEvolutionWorkflowPatternKey.value,
  rendererTarget: playbackCueAuthorityView.value?.authorityRendererTarget
    ?? selfEvolutionRendererAuthorityProjection.value?.rendererTarget
    ?? null,
  patternContextByKey: selfEvolutionFocusHistoryPatternContextByKey.value as any,
  patternGuidanceByKey: selfEvolutionFocusHistoryPatternGuidanceByKey.value as any,
}))
const runtimeSelfEvolutionBodyContinuityPhase = computed(() =>
  selfEvolutionRendererAuthorityProjection.value?.bodyContinuityPhase
  ?? resolveSelfEvolutionRuntimeBodyContinuityPhase(playbackCueAuthorityView.value),
)
const viewedSelfEvolutionWorkflowEvidencePanels = ref<Set<string>>(new Set())
const viewedSelfEvolutionWorkflowTraceSections = ref<Set<string>>(new Set())
const viewedSelfEvolutionWorkflowEventKinds = ref<Set<string>>(new Set())
const selfEvolutionRepairSession = computed(() => buildSelfEvolutionRepairSession({
  activeWorkflowFocus: activeSelfEvolutionWorkflowFocus.value as any,
  rendererTarget: playbackCueAuthorityView.value?.authorityRendererTarget
    ?? selfEvolutionRendererAuthorityProjection.value?.rendererTarget
    ?? null,
  bodyContinuityPhase: runtimeSelfEvolutionBodyContinuityPhase.value,
  viewedEvidencePanels: viewedSelfEvolutionWorkflowEvidencePanels.value,
  viewedTraceSections: viewedSelfEvolutionWorkflowTraceSections.value,
  viewedEventKinds: viewedSelfEvolutionWorkflowEventKinds.value,
}))
const activeSelfEvolutionWorkflowContext = computed(() => activeSelfEvolutionWorkflowPatternKey.value
  ? selfEvolutionFocusHistoryPatternContextByKey.value[activeSelfEvolutionWorkflowPatternKey.value] ?? null
  : null)
const selfEvolutionRepairClosure = computed(() => buildSelfEvolutionRepairClosure({
  activePatternKey: activeSelfEvolutionWorkflowPatternKey.value,
  activePatternContext: activeSelfEvolutionWorkflowContext.value as any,
  repairSession: selfEvolutionRepairSession.value as any,
  latestSnapshot: lastSelfEvolutionFocusSnapshot.value as any,
  latestPatterns: selfEvolutionFocusHistoryPatterns.value as any,
}))
const selfEvolutionRepairNextAction = computed(() => buildSelfEvolutionRepairNextAction({
  repairSession: selfEvolutionRepairSession.value as any,
  repairClosure: selfEvolutionRepairClosure.value as any,
}))
const selfEvolutionRepairActionRoute = computed(() => buildSelfEvolutionRepairActionRoute(
  selfEvolutionRepairNextAction.value as any,
))
const selfEvolutionRepairScrollTarget = computed(() => buildSelfEvolutionRepairScrollTarget(
  selfEvolutionRepairActionRoute.value as any,
))
const activeSelfEvolutionRepairSurfaceKey = ref<string | null>(null)
const selfEvolutionRepairScrollTargetElements = ref<Record<string, HTMLElement | null>>({})
const selfEvolutionRepairActionFeedback = ref<ReturnType<typeof buildSelfEvolutionRepairActionFeedback> | null>(null)
const closureNavigationContext = computed(() => readPerformanceVisualizerClosureNavigationContext(route.query as Record<string, unknown>))
const closureNavigationState = computed(() => buildPerformanceVisualizerClosureNavigationState(closureNavigationContext.value))
const selfEvolutionBaselineQuality = computed(() => buildSelfEvolutionBaselineQuality({
  latestSnapshot: lastSelfEvolutionFocusSnapshot.value as any,
  history: selfEvolutionFocusSnapshotHistory.value as any,
  repairOutcome: activeSelfEvolutionWorkflowFocus.value && selfEvolutionRepairClosure.value
    ? buildSelfEvolutionRepairOutcome({
        repairClosureBefore: selfEvolutionRepairClosure.value as any,
        repairClosureAfter: selfEvolutionRepairClosure.value as any,
      })
    : null,
  repairClosure: selfEvolutionRepairClosure.value as any,
}))
const selfEvolutionBaselineAdoption = computed(() => buildSelfEvolutionBaselineAdoption({
  baselineQuality: selfEvolutionBaselineQuality.value as any,
  latestSnapshot: lastSelfEvolutionFocusSnapshot.value as any,
  history: selfEvolutionFocusSnapshotHistory.value as any,
}))
const selfEvolutionAdoptedAnchor = computed(() => buildSelfEvolutionAdoptedAnchor(
  selfEvolutionBaselineAdoptionHistory.value as any,
))
const selfEvolutionAdoptedAnchorTraceability = computed(() => buildSelfEvolutionAdoptedAnchorTraceability({
  adoptedAnchor: selfEvolutionAdoptedAnchor.value as any,
  patternSummaryByKey: Object.fromEntries(
    selfEvolutionFocusHistoryPatterns.value.map(pattern => [pattern.patternKey, pattern.summaryLine]),
  ),
  workflowByPatternKey: selfEvolutionFocusHistoryPatternWorkflowByKey.value as any,
  patternContextByKey: selfEvolutionFocusHistoryPatternContextByKey.value as any,
}))
const selfEvolutionBaselineAdoptionHistorySummary = computed(() => buildSelfEvolutionBaselineAdoptionHistorySummary(
  selfEvolutionBaselineAdoptionHistory.value as any,
))
const selfEvolutionAdoptedAnchorHistoryTransition = computed(() => buildSelfEvolutionAdoptedAnchorHistoryTransition({
  adoptedAnchor: selfEvolutionAdoptedAnchor.value as any,
  historyDrilldown: selfEvolutionFocusHistoryDrilldown.value as any,
}))
const selfEvolutionFocusHistoryComparisons = computed(() => selfEvolutionFocusHistoryDrilldown.value
  .map((transition) => {
    const comparison = buildSelfEvolutionFocusHistoryComparison({
      bodyContinuityPhase: runtimeSelfEvolutionBodyContinuityPhase.value,
      history: selfEvolutionFocusSnapshotHistory.value as any,
      transition,
    })
    return comparison
      ? {
          transitionKey: `${transition.currentCapturedAt}:${transition.previousCapturedAt}`,
          comparison,
        }
      : null
  })
  .filter(Boolean) as Array<{
  transitionKey: string
  comparison: NonNullable<ReturnType<typeof buildSelfEvolutionFocusHistoryComparison>>
}>)
const selfEvolutionFocusHistoryComparisonsByTransitionKey = computed(() => Object.fromEntries(
  selfEvolutionFocusHistoryComparisons.value.map(item => [
    item.transitionKey,
    {
      comparison: item.comparison,
      rendererRejoinSurfaceKey: item.comparison.current.rendererRejoinSurfaceKey
        ?? item.comparison.previous.rendererRejoinSurfaceKey
        ?? null,
    },
  ]),
) as Record<string, {
  comparison: NonNullable<ReturnType<typeof buildSelfEvolutionFocusHistoryComparison>>
  rendererRejoinSurfaceKey: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
}>)

function hasBodyContinuityComparisonBanner(
  bodyContinuityPhase: NonNullable<ReturnType<typeof buildSelfEvolutionFocusHistoryComparison>>['bodyContinuityPhase'],
) {
  return bodyContinuityPhase === 'body-only-hold'
    || bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    || bodyContinuityPhase === 'full-cross-modal-lock'
    || bodyContinuityPhase === 'renderer-rejoin-without-body'
}

function bodyContinuityPhaseHasRendererSurface(
  bodyContinuityPhase: NonNullable<ReturnType<typeof buildSelfEvolutionFocusHistoryComparison>>['bodyContinuityPhase'],
) {
  return bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    || bodyContinuityPhase === 'full-cross-modal-lock'
    || bodyContinuityPhase === 'renderer-rejoin-without-body'
}

const activeSelfEvolutionRepairRendererRejoinSurfaceKey = computed(() => {
  if (activeSelfEvolutionRepairSurfaceKey.value === 'authority:renderer-rejoin:speech')
    return activeSelfEvolutionRepairSurfaceKey.value
  if (activeSelfEvolutionRepairSurfaceKey.value === 'authority:renderer-rejoin:live2d')
    return activeSelfEvolutionRepairSurfaceKey.value
  if (activeSelfEvolutionRepairSurfaceKey.value === 'authority:renderer-rejoin:vrm')
    return activeSelfEvolutionRepairSurfaceKey.value
  return null
})
const selectedSelfEvolutionHistoryTransitionKey = ref<string | null>(null)
const selectedSelfEvolutionHistoryComparison = computed(() => {
  if (!selectedSelfEvolutionHistoryTransitionKey.value)
    return null
  return selfEvolutionFocusHistoryComparisons.value
    .find(item => item.transitionKey === selectedSelfEvolutionHistoryTransitionKey.value)
    ?.comparison ?? null
})
const selectedSelfEvolutionHistorySide = ref<'current' | 'previous' | null>(null)
const selectedSelfEvolutionHistoryRestoreSummaryLine = ref<string | null>(null)
const selfEvolutionHistoryDiffHighlighting = computed(() => buildSelfEvolutionFocusHistoryDiffHighlighting(
  selectedSelfEvolutionHistoryComparison.value,
))
const selfEvolutionHistoryEventLocalization = computed(() => buildSelfEvolutionFocusHistoryEventLocalization({
  comparison: selectedSelfEvolutionHistoryComparison.value,
  selectedSide: selectedSelfEvolutionHistorySide.value,
  traceEvents: selectedCandidateTraceEvents.value,
}))
const selfEvolutionAdoptedAnchorTraceEventSelection = computed(() => buildSelfEvolutionAdoptedAnchorTraceEventSelection({
  comparison: selectedSelfEvolutionHistoryComparison.value as any,
  adoptedAnchor: selfEvolutionAdoptedAnchor.value as any,
  selectedSide: selectedSelfEvolutionHistorySide.value,
}))
const selfEvolutionAdoptedAnchorReplayPlan = computed(() => buildSelfEvolutionAdoptedAnchorReplayPlan({
  traceability: selfEvolutionAdoptedAnchorTraceability.value as any,
  historyTransition: selfEvolutionAdoptedAnchorHistoryTransition.value as any,
  traceEventSelection: selfEvolutionAdoptedAnchorTraceEventSelection.value as any,
}))
const selfEvolutionFocusDiffSummary = computed(() => buildSelfEvolutionFocusDiffSummary({
  current: selfEvolutionFocusPlan.value,
  snapshot: lastSelfEvolutionFocusSnapshot.value as any,
}))
const highlightedSelfEvolutionEvidencePanelIds = computed(() => new Set(
  selfEvolutionFocusPlan.value.highlightedEvidencePanelIds,
))
const highlightedSelfEvolutionTraceSectionIds = computed(() => new Set(
  selfEvolutionFocusPlan.value.highlightedTraceSectionIds,
))
const residentRuntimeTelemetrySummaryEntries = computed(() => buildResidentRuntimeTelemetrySummaryEntries(
  speechEmbodiment.value.runtimeDynamics,
))
const driverExecutionTelemetrySummaryEntries = computed(() => buildDriverExecutionTelemetrySummaryEntriesFromDiagnostics({
  speechEmbodiment: speechEmbodiment.value,
  runtimeAuthorityOverview: runtimeAuthorityOverview.value,
  playbackCueAuthorityView: playbackCueAuthorityView.value,
}))
const recentDrivingEventSummaryEntries = computed(() => buildRecentDrivingEventSummaryEntries(
  speechEmbodiment.value.recentDrivingEvent,
  speechEmbodiment.value.rendererAlignment,
  speechEmbodiment.value.rendererDriftSummary,
))
const recentDrivingTraceRecordSummaryEntries = computed(() => buildRecentDrivingTraceRecordSummaryEntriesFromDiagnostics({
  speechEmbodiment: speechEmbodiment.value,
  runtimeAuthorityOverview: runtimeAuthorityOverview.value,
  playbackCueAuthorityView: playbackCueAuthorityView.value,
}))
const recentDrivingTraceEventEntries = computed(() => buildRecentDrivingTraceEventEntries(
  speechEmbodiment.value.recentDrivingTraceEvents,
))
const recentDrivingTraceDetailEntries = computed(() => buildRecentDrivingTraceDetailEntries(
  speechEmbodiment.value.recentDrivingTraceDetails,
))
const authorityTableRows = computed(() => filterAuthorityTableRows(
  buildAuthorityTableRows(authorityDisplayRows.value, speechAuthoritySegmentRowsByCueId.value),
  {
    surface: authoritySurfaceFilter.value === 'all' ? undefined : authoritySurfaceFilter.value,
    lane: authorityLaneFilter.value === 'all' ? undefined : authorityLaneFilter.value,
    driftStatus: authorityDriftFilter.value === 'all' ? undefined : authorityDriftFilter.value,
    speechEvidence: authoritySpeechEvidenceFilter.value === 'all' ? undefined : authoritySpeechEvidenceFilter.value,
    settleAuthority: authoritySettleAuthorityFilter.value === 'all' ? undefined : authoritySettleAuthorityFilter.value,
    authorityMatch: authorityMismatchFilter.value === 'all' ? undefined : authorityMismatchFilter.value,
    rendererDrift: authorityRendererDriftFilter.value === 'all' ? undefined : authorityRendererDriftFilter.value,
    cueTextQuery: authorityCueTextQuery.value.trim() || undefined,
  },
))

function cycleAuthoritySurfaceFilter() {
  authoritySurfaceFilter.value = authoritySurfaceFilter.value === 'all'
    ? 'live2d'
    : authoritySurfaceFilter.value === 'live2d'
      ? 'vrm'
      : 'all'
}

function toggleSelfEvolutionTriageCard(cardId: 'repair-owner' | 'first-check' | 'repair-path') {
  const nextCardId = selectedSelfEvolutionTriageCardId.value === cardId
    ? null
    : cardId
  selectedSelfEvolutionTriageCardId.value = nextCardId

  if (!nextCardId)
    return

  const recommendedTraceEventId = buildSelfEvolutionFocusPlan(
    selfEvolutionTriageView.value.triageCards,
    nextCardId,
    selectedCandidateTraceEvents.value,
  ).recommendedTraceEventId
  if (recommendedTraceEventId)
    selfEvolutionInspector.selectTraceEvent(recommendedTraceEventId)
}

function focusDefaultSelfEvolutionRepairPath() {
  const defaultCardId = resolveDefaultSelfEvolutionFocusCardId(selfEvolutionTriageView.value.triageCards)
  if (defaultCardId)
    toggleSelfEvolutionTriageCard(defaultCardId)
}

async function applyClosureNavigationEntryFocus() {
  const navigationState = closureNavigationState.value

  if (navigationState.preferredTriageCardId) {
    selectedSelfEvolutionTriageCardId.value = navigationState.preferredTriageCardId

    const recommendedTraceEventId = buildSelfEvolutionFocusPlan(
      selfEvolutionTriageView.value.triageCards,
      navigationState.preferredTriageCardId,
      selectedCandidateTraceEvents.value,
    ).recommendedTraceEventId

    if (recommendedTraceEventId)
      selfEvolutionInspector.selectTraceEvent(recommendedTraceEventId)
  }
  else if (navigationState.shouldAutoFocusRepairPath) {
    focusDefaultSelfEvolutionRepairPath()
  }

  if (navigationState.preferredTraceEventKind) {
    const preferredEvent = selectedCandidateTraceEvents.value.find(event => event.kind === navigationState.preferredTraceEventKind)
    if (preferredEvent)
      selfEvolutionInspector.selectTraceEvent(preferredEvent.id)
  }

  await nextTick()

  if (!navigationState.preferredScrollTargetId)
    return

  selfEvolutionRepairScrollTargetElements.value[navigationState.preferredScrollTargetId]?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

function captureSelfEvolutionFocusSnapshot() {
  const snapshot = buildSelfEvolutionFocusSnapshot({
    candidateId: selectedCandidate.value?.id ?? null,
    decisionTraceId: selectedCandidate.value?.decisionTraceId ?? null,
    activeThreadId: selfEvolutionRuntimeContinuityProjection.value?.activeThreadId ?? null,
    focusPlan: selfEvolutionFocusPlan.value,
    capturedAt: Date.now(),
  })
  if (snapshot) {
    selfEvolutionFocusSnapshotHistory.value = appendSelfEvolutionFocusSnapshotHistory({
      history: selfEvolutionFocusSnapshotHistory.value as any,
      snapshot: snapshot as any,
      limit: 5,
    }) as any
  }
}

function selectSelfEvolutionHistoryTransition(
  transition: (typeof selfEvolutionFocusHistoryDrilldown.value)[number],
) {
  selectedSelfEvolutionHistoryTransitionKey.value = `${transition.currentCapturedAt}:${transition.previousCapturedAt}`
}

function selectSelfEvolutionAdoptedAnchorHistoryTransition() {
  if (!selfEvolutionAdoptedAnchorHistoryTransition.value)
    return

  selectedSelfEvolutionHistoryTransitionKey.value = selfEvolutionAdoptedAnchorHistoryTransition.value.transitionKey
  selectedSelfEvolutionHistorySide.value = selfEvolutionAdoptedAnchorHistoryTransition.value.selectedSide

  const traceEventSelection = buildSelfEvolutionAdoptedAnchorTraceEventSelection({
    comparison: selectedSelfEvolutionHistoryComparison.value as any,
    adoptedAnchor: selfEvolutionAdoptedAnchor.value as any,
    selectedSide: selfEvolutionAdoptedAnchorHistoryTransition.value.selectedSide,
  })
  if (traceEventSelection)
    selfEvolutionInspector.selectTraceEvent(traceEventSelection.eventId)
}

function replaySelfEvolutionAdoptedAnchor() {
  const replayPlan = buildSelfEvolutionAdoptedAnchorReplayPlan({
    traceability: selfEvolutionAdoptedAnchorTraceability.value as any,
    historyTransition: selfEvolutionAdoptedAnchorHistoryTransition.value as any,
    traceEventSelection: selfEvolutionAdoptedAnchorTraceEventSelection.value as any,
  })
  if (!replayPlan)
    return

  activeSelfEvolutionWorkflowPatternKey.value = replayPlan.patternKey
  selectedSelfEvolutionHistoryTransitionKey.value = replayPlan.transitionKey
  selectedSelfEvolutionHistorySide.value = replayPlan.selectedSide
  selfEvolutionInspector.selectTraceEvent(replayPlan.eventId)
  selfEvolutionRepairActionFeedback.value = buildSelfEvolutionAdoptedAnchorReplayFeedback(replayPlan as any) as any
}

function resolveSelfEvolutionDiffEvidenceState(panelId: string) {
  return selfEvolutionHistoryDiffHighlighting.value.evidencePanels[panelId]
}

function resolveSelfEvolutionDiffTraceState(sectionId: string) {
  return selfEvolutionHistoryDiffHighlighting.value.traceSections[sectionId]
}

function markSelfEvolutionWorkflowEvidencePanelViewed(panelId: string) {
  if (!activeSelfEvolutionWorkflowFocus.value?.evidencePanels.has(panelId))
    return
  viewedSelfEvolutionWorkflowEvidencePanels.value = new Set([
    ...viewedSelfEvolutionWorkflowEvidencePanels.value,
    panelId,
  ])
}

function markSelfEvolutionWorkflowTraceSectionViewed(sectionId: string) {
  if (!activeSelfEvolutionWorkflowFocus.value?.traceSections.has(sectionId))
    return
  viewedSelfEvolutionWorkflowTraceSections.value = new Set([
    ...viewedSelfEvolutionWorkflowTraceSections.value,
    sectionId,
  ])
}

function markSelfEvolutionWorkflowEventKindViewed(eventKind: string) {
  if (!activeSelfEvolutionWorkflowFocus.value?.eventKinds.has(eventKind))
    return
  viewedSelfEvolutionWorkflowEventKinds.value = new Set([
    ...viewedSelfEvolutionWorkflowEventKinds.value,
    eventKind,
  ])
}

async function restoreSelfEvolutionHistoryTransition(
  transition: (typeof selfEvolutionFocusHistoryDrilldown.value)[number],
  side: 'current' | 'previous',
) {
  selectSelfEvolutionHistoryTransition(transition)
  selectedSelfEvolutionHistorySide.value = side
  const restorePlan = buildSelfEvolutionFocusHistoryRestorePlan({
    history: selfEvolutionFocusSnapshotHistory.value as any,
    transition,
    adoptedAnchor: selfEvolutionAdoptedAnchor.value as any,
    side,
  })
  if (!restorePlan)
    return

  selectedSelfEvolutionHistoryRestoreSummaryLine.value = restorePlan.restoreSummaryLine
  selectedSelfEvolutionTriageCardId.value = restorePlan.selectedCardId

  if (restorePlan.candidateId)
    selfEvolutionInspector.selectCandidate(restorePlan.candidateId)

  if (!restorePlan.shouldDrillTrace)
    return

  await selfEvolutionInspector.drillSelectedCandidateTrace()

  if (restorePlan.recommendedTraceEventId)
    selfEvolutionInspector.selectTraceEvent(restorePlan.recommendedTraceEventId)
}

async function applySelfEvolutionPatternWorkflowContext(patternKey: string) {
  const context = selfEvolutionFocusHistoryPatternContextByKey.value[patternKey]
  if (!context)
    return

  const transition = selfEvolutionFocusHistoryDrilldown.value.find(item =>
    item.currentCapturedAt === context.currentCapturedAt
    && item.previousCapturedAt === context.previousCapturedAt,
  )
  if (!transition)
    return

  activeSelfEvolutionWorkflowPatternKey.value = patternKey
  viewedSelfEvolutionWorkflowEvidencePanels.value = new Set()
  viewedSelfEvolutionWorkflowTraceSections.value = new Set()
  viewedSelfEvolutionWorkflowEventKinds.value = new Set()
  await restoreSelfEvolutionHistoryTransition(transition, context.side)
}

async function runSelfEvolutionRepairNextAction() {
  const nextAction = selfEvolutionRepairNextAction.value
  const executedRoute = selfEvolutionRepairActionRoute.value
  if (!nextAction)
    return

  const repairClosureBefore = selfEvolutionRepairClosure.value
  const snapshotCountBefore = selfEvolutionFocusSnapshotHistory.value.length

  if (executedRoute)
    activeSelfEvolutionRepairSurfaceKey.value = executedRoute.surfaceKey

  if (nextAction.targetType === 'snapshot') {
    captureSelfEvolutionFocusSnapshot()
  }
  else if (nextAction.targetType === 'evidence') {
    markSelfEvolutionWorkflowEvidencePanelViewed(nextAction.targetId)
  }
  else if (nextAction.targetType === 'trace') {
    markSelfEvolutionWorkflowTraceSectionViewed(nextAction.targetId)
    if (nextAction.targetId === 'selected-trace-event') {
      const preferredTraceEvent = nextAction.preferredEventKind
        ? selectedCandidateTraceEvents.value.find(item => item.kind === nextAction.preferredEventKind) ?? null
        : null
      if (preferredTraceEvent)
        selfEvolutionInspector.selectTraceEvent(preferredTraceEvent.id)

      if (selectedTraceEvent?.value?.kind)
        markSelfEvolutionWorkflowEventKindViewed(selectedTraceEvent.value.kind)
    }
  }
  else if (nextAction.targetType === 'event') {
    const event = selectedCandidateTraceEvents.value.find(item => item.kind === nextAction.targetId)
    if (event) {
      markSelfEvolutionWorkflowTraceSectionViewed('selected-trace-event')
      markSelfEvolutionWorkflowEventKindViewed(event.kind)
      selfEvolutionInspector.selectTraceEvent(event.id)
    }
  }

  await nextTick()

  const followupNavigation = buildSelfEvolutionRepairFollowupNavigation({
    executedRoute: executedRoute as any,
    refreshedRoute: selfEvolutionRepairActionRoute.value as any,
    refreshedScrollTarget: selfEvolutionRepairScrollTarget.value as any,
  })

  selfEvolutionRepairActionFeedback.value = buildSelfEvolutionRepairActionFeedback({
    executedAction: nextAction as any,
    followupNavigation: followupNavigation as any,
    repairClosureBefore: repairClosureBefore as any,
    repairClosureAfter: selfEvolutionRepairClosure.value as any,
    snapshotCountBefore,
    snapshotCountAfter: selfEvolutionFocusSnapshotHistory.value.length,
  })

  const adoptionRecord = buildSelfEvolutionBaselineAdoptionRecord({
    baselineAdoption: selfEvolutionBaselineAdoption.value as any,
    latestSnapshot: lastSelfEvolutionFocusSnapshot.value as any,
    activePatternKey: activeSelfEvolutionWorkflowPatternKey.value,
    repairOwnerHint: activeSelfEvolutionWorkflowFocus.value?.repairOwnerHint ?? null,
    prosodyAuthorityNote: selfEvolutionBaselineAdoption.value?.supportingLines.find(line => line.includes('韵律权威链')) ?? null,
    capturedAt: Date.now(),
  })
  selfEvolutionBaselineAdoptionHistory.value = appendSelfEvolutionBaselineAdoptionHistory({
    history: selfEvolutionBaselineAdoptionHistory.value as any,
    record: adoptionRecord as any,
  }) as any

  if (!followupNavigation)
    return

  activeSelfEvolutionRepairSurfaceKey.value = followupNavigation.activeSurfaceKey

  if (!followupNavigation.scrollTargetId)
    return

  selfEvolutionRepairScrollTargetElements.value[followupNavigation.scrollTargetId]?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

function cycleAuthorityLaneFilter() {
  authorityLaneFilter.value = authorityLaneFilter.value === 'all'
    ? 'expression'
    : authorityLaneFilter.value === 'expression'
      ? 'motion'
      : authorityLaneFilter.value === 'motion'
        ? 'face'
        : authorityLaneFilter.value === 'face'
          ? 'action'
          : authorityLaneFilter.value === 'action'
            ? 'lipsync'
            : authorityLaneFilter.value === 'lipsync'
              ? 'voice'
              : authorityLaneFilter.value === 'voice'
                ? 'settle'
                : 'all'
}

function cycleAuthorityDriftFilter() {
  authorityDriftFilter.value = authorityDriftFilter.value === 'all'
    ? 'hard-drift'
    : authorityDriftFilter.value === 'hard-drift'
      ? 'partial-drift'
      : authorityDriftFilter.value === 'partial-drift'
        ? 'unknown'
        : authorityDriftFilter.value === 'unknown'
          ? 'all-aligned'
          : 'all'
}

function cycleAuthoritySpeechEvidenceFilter() {
  authoritySpeechEvidenceFilter.value = authoritySpeechEvidenceFilter.value === 'all'
    ? 'speech'
    : authoritySpeechEvidenceFilter.value === 'speech'
      ? 'prosody'
      : authoritySpeechEvidenceFilter.value === 'prosody'
        ? 'viseme'
        : authoritySpeechEvidenceFilter.value === 'viseme'
          ? 'micro-expression'
          : authoritySpeechEvidenceFilter.value === 'micro-expression'
            ? 'authority-match'
            : 'all'
}

function cycleAuthoritySettleAuthorityFilter() {
  authoritySettleAuthorityFilter.value = authoritySettleAuthorityFilter.value === 'all'
    ? 'authority-bound'
    : authoritySettleAuthorityFilter.value === 'authority-bound'
      ? 'fallback-derived'
      : 'all'
}

function cycleAuthorityMismatchFilter() {
  authorityMismatchFilter.value = authorityMismatchFilter.value === 'all'
    ? 'face-mismatch'
    : authorityMismatchFilter.value === 'face-mismatch'
      ? 'motion-mismatch'
      : authorityMismatchFilter.value === 'motion-mismatch'
        ? 'lipsync-mismatch'
        : authorityMismatchFilter.value === 'lipsync-mismatch'
          ? 'voice-mismatch'
          : 'all'
}

function cycleAuthorityRendererDriftFilter() {
  authorityRendererDriftFilter.value = authorityRendererDriftFilter.value === 'all'
    ? 'present'
    : authorityRendererDriftFilter.value === 'present'
      ? 'pending-or-runtime-only'
      : authorityRendererDriftFilter.value === 'pending-or-runtime-only'
        ? 'none'
        : 'all'
}
</script>

<template>
  <div :class="['flex flex-col gap-4', 'pb-6']">
    <div :class="['flex items-center gap-2']">
      <ButtonBar
        :icon="tracing ? 'i-solar:stop-circle-bold-duotone' : 'i-solar:play-circle-bold-duotone'"
        :text="formatSpeechDisplayText(tracing ? 'tracing-enabled' : 'tracing-disabled')"
        @click="tracing ? diagnostics.stopTracing() : diagnostics.startTracing()"
      >
        {{ formatSpeechDisplayText(tracing ? 'stop-tracing' : 'start-tracing') }}
      </ButtonBar>
      <ButtonBar
        icon="i-solar:restart-bold-duotone"
        :text="formatSpeechDisplayText('refresh-self-evolution-inspector')"
        @click="() => selfEvolutionInspector.refresh()"
      >
        {{ formatSpeechDisplayText(selfEvolutionLoading ? 'refreshing-self-evolution' : 'refresh-self-evolution') }}
      </ButtonBar>
      <ButtonBar
        :icon="authorityOnlyDriftRows ? 'i-solar:filter-bold-duotone' : 'i-solar:filter-line-duotone'"
        :text="formatSpeechDisplayText('show-only-drift-rows')"
        @click="authorityOnlyDriftRows = !authorityOnlyDriftRows"
      >
        {{ formatSpeechDisplayText(authorityOnlyDriftRows ? 'only-drift-rows' : 'all-rows') }}
      </ButtonBar>
      <ButtonBar
        icon="i-solar:tuning-2-bold-duotone"
        :text="formatSpeechDisplayText('cycle-authority-surface-filter')"
        @click="cycleAuthoritySurfaceFilter"
      >
        {{ formatSpeechDisplayText('surface') }}: {{ formatSpeechAuthorityFilterValue('surface', authoritySurfaceFilter) }}
      </ButtonBar>
      <ButtonBar
        icon="i-solar:list-bold-duotone"
        :text="formatSpeechDisplayText('cycle-authority-lane-filter')"
        @click="cycleAuthorityLaneFilter"
      >
        {{ formatSpeechDisplayText('lane') }}: {{ formatSpeechAuthorityFilterValue('lane', authorityLaneFilter) }}
      </ButtonBar>
      <ButtonBar
        icon="i-solar:flag-bold-duotone"
        :text="formatSpeechDisplayText('cycle-authority-drift-filter')"
        @click="cycleAuthorityDriftFilter"
      >
        {{ formatSpeechDisplayText('drift') }}: {{ formatSpeechAuthorityFilterValue('drift', authorityDriftFilter) }}
      </ButtonBar>
      <ButtonBar
        icon="i-solar:soundwave-bold-duotone"
        :text="formatSpeechDisplayText('cycle-authority-speech-evidence-filter')"
        @click="cycleAuthoritySpeechEvidenceFilter"
      >
        {{ formatSpeechDisplayText('speech') }}: {{ formatSpeechAuthorityFilterValue('speech-evidence', authoritySpeechEvidenceFilter) }}
      </ButtonBar>
      <ButtonBar
        icon="i-solar:shield-check-bold-duotone"
        :text="formatSpeechDisplayText('cycle-settle-authority-filter')"
        @click="cycleAuthoritySettleAuthorityFilter"
      >
        {{ formatSpeechDisplayText('settle') }}: {{ formatSpeechAuthorityFilterValue('settle-authority', authoritySettleAuthorityFilter) }}
      </ButtonBar>
      <ButtonBar
        icon="i-solar:target-bold-duotone"
        :text="formatSpeechDisplayText('cycle-authority-mismatch-filter')"
        @click="cycleAuthorityMismatchFilter"
      >
        {{ formatSpeechDisplayText('authority-mismatch') }}: {{ formatSpeechAuthorityFilterValue('authority-mismatch', authorityMismatchFilter) }}
      </ButtonBar>
      <ButtonBar
        icon="i-solar:emoji-funny-square-bold-duotone"
        :text="formatSpeechDisplayText('cycle-renderer-drift-filter')"
        @click="cycleAuthorityRendererDriftFilter"
      >
        {{ formatSpeechDisplayText('renderer') }}: {{ formatSpeechAuthorityFilterValue('renderer-drift', authorityRendererDriftFilter) }}
      </ButtonBar>
      <input
        v-model="authorityCueTextQuery"
        type="text"
        :placeholder="formatSpeechDisplayText('search-cue-text')"
        :class="['min-w-40 rounded border border-neutral-700 bg-neutral-950/60 px-2 py-1 text-sm text-neutral-100 outline-none']"
      >
    </div>

    <div :class="['grid gap-3', 'md:grid-cols-2']">
      <section :class="['rounded-2xl border border-neutral-700/60', 'bg-neutral-950/40 p-4', 'md:col-span-2']">
        <div :class="['mb-2 text-sm text-neutral-400']">
          {{ formatSelfEvolutionDisplayText('self-evolution-runtime') }}
        </div>
        <div :class="['grid gap-1 text-sm text-neutral-100', 'md:grid-cols-2']">
          <div>{{ formatSelfEvolutionDisplayText('snapshot') }}: {{ formatMaybeText(selfEvolutionSnapshot?.version) }}</div>
          <div>{{ formatSelfEvolutionDisplayText('active-candidate-id') }}: {{ formatMaybeText(selfEvolutionSnapshot?.activeCandidateId) }}</div>
          <div>{{ formatSelfEvolutionDisplayText('shadow-count') }}: {{ candidateCounts.shadow }}</div>
          <div>{{ formatSelfEvolutionDisplayText('active-count') }}: {{ candidateCounts.active }}</div>
          <div>{{ formatSelfEvolutionDisplayText('rejected-count') }}: {{ candidateCounts.rejected }}</div>
          <div>{{ formatSelfEvolutionDisplayText('rolled-back-count') }}: {{ candidateCounts['rolled-back'] }}</div>
          <div>{{ formatSelfEvolutionDisplayText('active-summary') }}: {{ formatMaybeText(activeCandidate?.patch.summary) }}</div>
          <div>{{ formatSelfEvolutionDisplayText('selected-candidate') }}: {{ formatMaybeText(selectedCandidate?.id) }}</div>
        </div>
        <div :class="['mt-3 text-xs text-neutral-400']">
          {{ formatSelfEvolutionDisplayText('runtime-reasons') }}: {{ selfEvolutionSnapshot?.reasonCodes?.join(', ') || 'n/a' }}
        </div>
        <div :class="['mt-4 grid gap-3', 'md:grid-cols-[minmax(18rem,22rem)_1fr]']">
          <div :class="['rounded-xl border border-neutral-800/80', 'bg-neutral-900/50 p-3']">
            <div :class="['mb-2 text-xs text-neutral-400 uppercase tracking-wide']">
              {{ formatSelfEvolutionDisplayText('candidates') }}
            </div>
            <button
              v-for="candidate in sortedCandidates"
              :key="candidate.id"
              type="button"
              :class="[
                'mb-2 w-full rounded-lg border p-3 text-left text-sm transition',
                selectedCandidate?.id === candidate.id
                  ? 'border-sky-500/60 bg-sky-500/10 text-sky-100'
                  : 'border-neutral-800 bg-neutral-950/30 text-neutral-200 hover:border-neutral-600',
              ]"
              @click="() => selfEvolutionInspector.selectCandidate(candidate.id)"
            >
              <div :class="['flex items-center justify-between gap-2']">
                <span>{{ formatSelfEvolutionCandidateStatus(candidate.status) }}</span>
                <span :class="['text-xs text-neutral-400']">{{ formatTimestamp(candidate.createdAt) }}</span>
              </div>
              <div :class="['mt-1 text-xs text-neutral-400']">
                {{ formatMaybeText(candidate.patch.summary) }}
              </div>
            </button>
          </div>

          <div :class="['rounded-xl border border-neutral-800/80', 'bg-neutral-900/50 p-3 text-sm text-neutral-100']">
            <div :class="['mb-2 text-xs text-neutral-400 uppercase tracking-wide']">
              {{ formatSelfEvolutionDisplayText('selected-details') }}
            </div>
            <div :class="['grid gap-1', 'md:grid-cols-2']">
              <div>{{ formatSelfEvolutionDisplayText('id') }}: {{ formatMaybeText(selectedCandidate?.id) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('status') }}: {{ formatSelfEvolutionCandidateStatus(selectedCandidate?.status) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('decision-trace-id') }}: {{ formatMaybeText(selectedCandidate?.decisionTraceId) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('source-turn-id') }}: {{ formatMaybeText(selectedCandidate?.sourceTurnId) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('source-event-id') }}: {{ formatMaybeText(selectedCandidate?.sourceEventId) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('activated-at') }}: {{ formatTimestamp(selectedCandidate?.activatedAt) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('rolled-back-at') }}: {{ formatTimestamp(selectedCandidate?.rolledBackAt) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('replay-passed') }}: {{ selectedCandidate?.validation.replayPassed ?? 'n/a' }}</div>
              <div>{{ formatSelfEvolutionDisplayText('replay-required') }}: {{ selectedCandidate?.validation.replayRequired ?? 'n/a' }}</div>
              <div>{{ formatSelfEvolutionDisplayText('rollback-supported') }}: {{ selectedCandidate?.validation.rollbackSupported ?? 'n/a' }}</div>
              <div>{{ formatSelfEvolutionDisplayText('final-replay-gate-passed') }}: {{ selectedCandidate?.validation.finalReplayGatePassed ?? 'n/a' }}</div>
              <div>{{ formatSelfEvolutionDisplayText('production-gold-sample-count') }}: {{ selectedCandidate?.validation.productionGoldSampleCount ?? 'n/a' }}</div>
              <div>{{ formatSelfEvolutionDisplayText('production-gold-coverage') }}: {{ selectedCandidate?.validation.productionGoldCoverage ?? 'n/a' }}</div>
              <div>{{ formatSelfEvolutionDisplayText('patch-domain') }}: {{ formatMaybeText(selectedCandidate?.patch.domain) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('patch-action') }}: {{ formatMaybeText(selectedCandidate?.patch.action) }}</div>
            </div>
            <div :class="['mt-3 text-xs text-neutral-400']">
              {{ formatSelfEvolutionDisplayText('lanes') }}: {{ formatList(selectedCandidate?.patch.lanes) }}
            </div>
            <div :class="['mt-2 text-xs text-neutral-400']">
              {{ formatSelfEvolutionDisplayText('reason-codes') }}: {{ formatList(selectedCandidate?.patch.reasonCodes) }}
            </div>
            <div :class="['mt-2 text-xs text-neutral-400']">
              {{ formatSelfEvolutionDisplayText('blocked-reasons') }}: {{ formatList(selectedCandidate?.validation.activationBlockedReasons) }}
            </div>
            <div
              v-if="selectedCandidateInternalizationReadinessSummary"
              :class="['mt-2 text-xs text-neutral-400']"
            >
              {{ formatSelfEvolutionDisplayText('internalization-readiness') }}: {{ formatList(selectedCandidateInternalizationReadinessSummary.lines) }}
            </div>
            <div :class="['mt-2 text-xs text-neutral-400']">
              {{ formatSelfEvolutionDisplayText('rollback-plan') }}: {{ formatList(selectedCandidate?.patch.validation.rollbackPlan) }}
            </div>
            <div
              v-if="selectedCandidateConsumptionPreview"
              :class="['mt-4 rounded-xl border border-neutral-800/80 bg-neutral-950/30 p-3']"
            >
              <div :class="['mb-2 text-xs text-neutral-400 uppercase tracking-wide']">
                {{ formatSelfEvolutionDisplayText('candidate-consumption-preview') }}
              </div>
              <div :class="['grid gap-3 text-xs text-neutral-400', 'md:grid-cols-2']">
                <div :class="['rounded-lg border border-neutral-800/70 bg-neutral-900/30 p-2']">
                  <div :class="['mb-1 text-neutral-300']">
                    {{ formatSelfEvolutionDisplayText('memory') }}
                  </div>
                  <div>{{ formatSelfEvolutionDisplayText('verification-strictness') }}: {{ selectedCandidateConsumptionPreview.memory.verificationStrictness }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('top-k-expansion-active') }}: {{ selectedCandidateConsumptionPreview.memory.topKExpansionActive }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('wrong-thread-suppression-raised') }}: {{ selectedCandidateConsumptionPreview.memory.wrongThreadSuppressionRaised }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('provenance-labeling-raised') }}: {{ selectedCandidateConsumptionPreview.memory.provenanceLabelingRaised }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('source-weight-shift') }}: {{ selectedCandidateConsumptionPreview.memory.sourceWeightShift }}</div>
                  <div :class="['mt-1 text-neutral-500']">
                    {{ formatList(selectedCandidateConsumptionPreview.memory.reasons) }}
                  </div>
                </div>
                <div :class="['rounded-lg border border-neutral-800/70 bg-neutral-900/30 p-2']">
                  <div :class="['mb-1 text-neutral-300']">
                    {{ formatSelfEvolutionDisplayText('relationship') }}
                  </div>
                  <div>{{ formatSelfEvolutionDisplayText('resolved-posture') }}: {{ selectedCandidateConsumptionPreview.relationship.resolvedPosture }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('repair-window-raised') }}: {{ selectedCandidateConsumptionPreview.relationship.repairWindowRaised }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('closeness-capped') }}: {{ selectedCandidateConsumptionPreview.relationship.closenessCapped }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('warmth-may-release') }}: {{ selectedCandidateConsumptionPreview.relationship.warmthMayRelease }}</div>
                  <div :class="['mt-1 text-neutral-500']">
                    {{ formatList(selectedCandidateConsumptionPreview.relationship.reasons) }}
                  </div>
                </div>
                <div :class="['rounded-lg border border-neutral-800/70 bg-neutral-900/30 p-2']">
                  <div :class="['mb-1 text-neutral-300']">
                    {{ formatSelfEvolutionDisplayText('response') }}
                  </div>
                  <div>{{ formatSelfEvolutionDisplayText('hypothesis-labeling-raised') }}: {{ selectedCandidateConsumptionPreview.response.hypothesisLabelingRaised }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('specificity-clamp-raised') }}: {{ selectedCandidateConsumptionPreview.response.specificityClampRaised }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('second-pass-required') }}: {{ selectedCandidateConsumptionPreview.response.secondPassRequired }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('template-shell-suppressed') }}: {{ selectedCandidateConsumptionPreview.response.templateShellSuppressed }}</div>
                  <div :class="['mt-1 text-neutral-500']">
                    {{ formatList(selectedCandidateConsumptionPreview.response.reasons) }}
                  </div>
                </div>
                <div :class="['rounded-lg border border-neutral-800/70 bg-neutral-900/30 p-2']">
                  <div :class="['mb-1 text-neutral-300']">
                    {{ formatSelfEvolutionDisplayText('proactive') }}
                  </div>
                  <div>{{ formatSelfEvolutionDisplayText('hold-likely') }}: {{ selectedCandidateConsumptionPreview.proactive.holdLikely }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('learning-proposal-raised') }}: {{ selectedCandidateConsumptionPreview.proactive.learningProposalRaised }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('restraint-raised') }}: {{ selectedCandidateConsumptionPreview.proactive.restraintRaised }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('cooldown-raised') }}: {{ selectedCandidateConsumptionPreview.proactive.cooldownRaised }}</div>
                  <div :class="['mt-1 text-neutral-500']">
                    {{ formatList(selectedCandidateConsumptionPreview.proactive.reasons) }}
                  </div>
                </div>
              </div>
            </div>
            <div
              v-if="selectedCandidateAuthoritySurfaces"
              :class="['mt-4 rounded-xl border border-neutral-800/80 bg-neutral-950/30 p-3']"
            >
              <div :class="['mb-2 text-xs text-neutral-400 uppercase tracking-wide']">
                {{ formatSelfEvolutionDisplayText('authority-surfaces') }}
              </div>
              <div :class="['grid gap-3 text-xs text-neutral-400', 'md:grid-cols-2']">
                <div :class="['rounded-lg border border-neutral-800/70 bg-neutral-900/30 p-2']">
                  <div :class="['mb-1 text-neutral-300']">
                    {{ formatSelfEvolutionDisplayText('persistent-mind-state') }}
                  </div>
                  <div>{{ formatSelfEvolutionDisplayText('status') }}: {{ formatSelfEvolutionRuntimeStatus(selectedCandidateAuthoritySurfaces.persistentMindState.status) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('host-person-model-present') }}: {{ selectedCandidateAuthoritySurfaces.persistentMindState.hostPersonModelPresent }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('affective-residue-present') }}: {{ selectedCandidateAuthoritySurfaces.persistentMindState.affectiveResiduePresent }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('self-evolution-present') }}: {{ selectedCandidateAuthoritySurfaces.persistentMindState.selfEvolutionPresent }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('learning-execution-present') }}: {{ selectedCandidateAuthoritySurfaces.persistentMindState.learningExecutionPresent }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('recall-latency-policy-present') }}: {{ selectedCandidateAuthoritySurfaces.persistentMindState.recallLatencyPolicyPresent }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('derived-mind-state-bundle-present') }}: {{ selectedCandidateAuthoritySurfaces.persistentMindState.derivedMindStateBundlePresent }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('dominant-trajectory') }}: {{ formatMaybeText(selectedCandidateAuthoritySurfaces.persistentMindState.dominantTrajectory) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('next-learning-action') }}: {{ formatSelfEvolutionLearningValue('action', selectedCandidateAuthoritySurfaces.persistentMindState.nextLearningAction) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('active-focuses') }}: {{ formatList(selectedCandidateAuthoritySurfaces.persistentMindState.activeFocuses) }}</div>
                  <div :class="['mt-1 text-neutral-500']">
                    {{ formatList(selectedCandidateAuthoritySurfaces.persistentMindState.reasons) }}
                  </div>
                </div>
                <div :class="['rounded-lg border border-neutral-800/70 bg-neutral-900/30 p-2']">
                  <div :class="['mb-1 text-neutral-300']">
                    {{ formatSelfEvolutionDisplayText('turn-trace-state') }}
                  </div>
                  <div>{{ formatSelfEvolutionDisplayText('status') }}: {{ formatSelfEvolutionRuntimeStatus(selectedCandidateAuthoritySurfaces.turnTraceState.status) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('memory-stage-replay-present') }}: {{ selectedCandidateAuthoritySurfaces.turnTraceState.memoryStageReplayPresent }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('memory-resolution-ledger-present') }}: {{ selectedCandidateAuthoritySurfaces.turnTraceState.memoryResolutionLedgerPresent }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('latest-trace-stage') }}: {{ formatMaybeText(selectedCandidateAuthoritySurfaces.turnTraceState.latestTraceStage) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('latest-trace-closure-state') }}: {{ formatMaybeText(selectedCandidateAuthoritySurfaces.turnTraceState.latestTraceClosureState) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('latest-trace-surface-policy') }}: {{ formatMaybeText(selectedCandidateAuthoritySurfaces.turnTraceState.latestTraceSurfacePolicy) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('suppression-tags') }}: {{ formatList(selectedCandidateAuthoritySurfaces.turnTraceState.suppressionTags?.map(value => formatSelfEvolutionTraceListValue('suppression-tag', value))) }}</div>
                  <div :class="['mt-1 text-neutral-500']">
                    {{ formatList(selectedCandidateAuthoritySurfaces.turnTraceState.reasons) }}
                  </div>
                </div>
              </div>
            </div>
            <div
              v-if="selectedCandidateRuntimeAlignment"
              :class="['mt-4 rounded-xl border border-neutral-800/80 bg-neutral-950/30 p-3']"
            >
              <div :class="['mb-2 text-xs text-neutral-400 uppercase tracking-wide']">
                {{ formatSelfEvolutionDisplayText('runtime-alignment') }}
              </div>
              <div :class="['grid gap-3 text-xs text-neutral-400', 'md:grid-cols-2']">
                <div :class="['rounded-lg border border-neutral-800/70 bg-neutral-900/30 p-2']">
                  <div :class="['mb-1 text-neutral-300']">
                    {{ formatSelfEvolutionDisplayText('relationship') }}
                  </div>
                  <div>{{ formatSelfEvolutionDisplayText('status') }}: {{ formatSelfEvolutionRuntimeStatus(selectedCandidateRuntimeAlignment.relationship.status) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('expected-posture') }}: {{ formatSelfEvolutionRuntimeValue('posture', selectedCandidateRuntimeAlignment.relationship.expectedPosture) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('planner-posture') }}: {{ formatSelfEvolutionRuntimeValue('posture', selectedCandidateRuntimeAlignment.relationship.plannerPosture) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('compiler-posture') }}: {{ formatSelfEvolutionRuntimeValue('posture', selectedCandidateRuntimeAlignment.relationship.compilerPosture) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('confirmed-signals') }}: {{ formatList(selectedCandidateRuntimeAlignment.relationship.confirmedSignals?.map(value => formatSelfEvolutionTraceListValue('alignment-signal', value))) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('missing-signals') }}: {{ formatList(selectedCandidateRuntimeAlignment.relationship.missingSignals?.map(value => formatSelfEvolutionTraceListValue('alignment-signal', value))) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('drifting-signals') }}: {{ formatList(selectedCandidateRuntimeAlignment.relationship.driftingSignals?.map(value => formatSelfEvolutionTraceListValue('alignment-signal', value))) }}</div>
                  <div :class="['mt-1 text-neutral-500']">
                    {{ formatList(selectedCandidateRuntimeAlignment.relationship.reasons) }}
                  </div>
                </div>
                <div :class="['rounded-lg border border-neutral-800/70 bg-neutral-900/30 p-2']">
                  <div :class="['mb-1 text-neutral-300']">
                    {{ formatSelfEvolutionDisplayText('response') }}
                  </div>
                  <div>{{ formatSelfEvolutionDisplayText('status') }}: {{ formatSelfEvolutionRuntimeStatus(selectedCandidateRuntimeAlignment.response.status) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('expected-signals') }}: {{ formatList(selectedCandidateRuntimeAlignment.response.expectedSignals?.map(value => formatSelfEvolutionTraceListValue('alignment-signal', value))) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('observed-signals') }}: {{ formatList(selectedCandidateRuntimeAlignment.response.observedSignals?.map(value => formatSelfEvolutionTraceListValue('alignment-signal', value))) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('confirmed-signals') }}: {{ formatList(selectedCandidateRuntimeAlignment.response.confirmedSignals?.map(value => formatSelfEvolutionTraceListValue('alignment-signal', value))) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('missing-signals') }}: {{ formatList(selectedCandidateRuntimeAlignment.response.missingSignals?.map(value => formatSelfEvolutionTraceListValue('alignment-signal', value))) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('drifting-signals') }}: {{ formatList(selectedCandidateRuntimeAlignment.response.driftingSignals?.map(value => formatSelfEvolutionTraceListValue('alignment-signal', value))) }}</div>
                  <div :class="['mt-1 text-neutral-500']">
                    {{ formatList(selectedCandidateRuntimeAlignment.response.reasons) }}
                  </div>
                </div>
                <div :class="['rounded-lg border border-neutral-800/70 bg-neutral-900/30 p-2']">
                  <div :class="['mb-1 text-neutral-300']">
                    {{ formatSelfEvolutionDisplayText('proactive') }}
                  </div>
                  <div>{{ formatSelfEvolutionDisplayText('status') }}: {{ formatSelfEvolutionRuntimeStatus(selectedCandidateRuntimeAlignment.proactive.status) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('expected-hold') }}: {{ formatSelfEvolutionBooleanValue(selectedCandidateRuntimeAlignment.proactive.expectedHold) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('should-speak') }}: {{ formatSelfEvolutionBooleanValue(selectedCandidateRuntimeAlignment.proactive.shouldSpeak) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('selected-action') }}: {{ formatSelfEvolutionRuntimeValue('action', selectedCandidateRuntimeAlignment.proactive.selectedAction) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('confirmed-signals') }}: {{ formatList(selectedCandidateRuntimeAlignment.proactive.confirmedSignals?.map(value => formatSelfEvolutionTraceListValue('alignment-signal', value))) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('missing-signals') }}: {{ formatList(selectedCandidateRuntimeAlignment.proactive.missingSignals?.map(value => formatSelfEvolutionTraceListValue('alignment-signal', value))) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('drifting-signals') }}: {{ formatList(selectedCandidateRuntimeAlignment.proactive.driftingSignals?.map(value => formatSelfEvolutionTraceListValue('alignment-signal', value))) }}</div>
                  <div :class="['mt-1 text-neutral-500']">
                    {{ formatList(selectedCandidateRuntimeAlignment.proactive.reasons) }}
                  </div>
                </div>
                <div :class="['rounded-lg border border-neutral-800/70 bg-neutral-900/30 p-2']">
                  <div :class="['mb-1 text-neutral-300']">
                    {{ formatSelfEvolutionDisplayText('learning') }}
                  </div>
                  <div>{{ formatSelfEvolutionDisplayText('status') }}: {{ formatSelfEvolutionRuntimeStatus(selectedCandidateRuntimeAlignment.learning.status) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('expected-action') }}: {{ formatMaybeText(selectedCandidateRuntimeAlignment.learning.expectedAction) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('runtime-action') }}: {{ formatSelfEvolutionRuntimeValue('action', selectedCandidateRuntimeAlignment.learning.runtimeAction) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('kernel-action') }}: {{ formatSelfEvolutionRuntimeValue('action', selectedCandidateRuntimeAlignment.learning.kernelAction) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('active-focuses') }}: {{ formatList(selectedCandidateRuntimeAlignment.learning.activeFocuses?.map(value => formatSelfEvolutionTraceListValue('alignment-signal', `focus:${value}`))) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('dominant-trajectory') }}: {{ formatMaybeText(selectedCandidateRuntimeAlignment.learning.dominantTrajectory) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('confirmed-signals') }}: {{ formatList(selectedCandidateRuntimeAlignment.learning.confirmedSignals?.map(value => formatSelfEvolutionTraceListValue('alignment-signal', value))) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('missing-signals') }}: {{ formatList(selectedCandidateRuntimeAlignment.learning.missingSignals?.map(value => formatSelfEvolutionTraceListValue('alignment-signal', value))) }}</div>
                  <div>{{ formatSelfEvolutionDisplayText('drifting-signals') }}: {{ formatList(selectedCandidateRuntimeAlignment.learning.driftingSignals?.map(value => formatSelfEvolutionTraceListValue('alignment-signal', value))) }}</div>
                  <div :class="['mt-1 text-neutral-500']">
                    {{ formatList(selectedCandidateRuntimeAlignment.learning.reasons) }}
                  </div>
                </div>
              </div>
            </div>
            <div :class="['mt-4 flex gap-2']">
              <ButtonBar
                icon="i-solar:chat-round-dots-bold-duotone"
                :text="formatSelfEvolutionDisplayText('open-selected-candidate-trace')"
                @click="() => selfEvolutionInspector.drillSelectedCandidateTrace()"
              >
                {{ formatSelfEvolutionDisplayText('open-trace-short') }}
              </ButtonBar>
            </div>
            <div
              v-if="birthPersonaAuthoritySummary"
              :class="['mt-4 rounded-xl border border-fuchsia-700/40 bg-fuchsia-950/20 p-3']"
            >
              <div :class="['mb-2 text-xs text-fuchsia-200/70 uppercase tracking-wide']">
                {{ formatSelfEvolutionDisplayText('birth-persona-authority') }}
              </div>
              <div
                v-for="line in birthPersonaAuthoritySummary.lines"
                :key="`birth-persona-authority-summary:${line}`"
                :class="['mb-1 text-xs text-fuchsia-50/90 last:mb-0']"
              >
                {{ line }}
              </div>
            </div>
            <div
              v-if="selectedCandidatePersonaAuthorityMappingSummary"
              :class="['mt-4 rounded-xl border border-rose-700/40 bg-rose-950/20 p-3']"
            >
              <div :class="['mb-2 text-xs text-rose-200/70 uppercase tracking-wide']">
                {{ formatSelfEvolutionDisplayText('persona-authority-mapping') }}
              </div>
              <div
                v-for="line in selectedCandidatePersonaAuthorityMappingSummary.lines"
                :key="`persona-authority-mapping-summary:${line}`"
                :class="['mb-1 text-xs text-rose-50/90 last:mb-0']"
              >
                {{ line }}
              </div>
            </div>
            <div
              v-if="selectedCandidateTrajectorySummary"
              :class="['mt-4 rounded-xl border border-amber-700/40 bg-amber-950/20 p-3']"
            >
              <div :class="['mb-2 text-xs text-amber-200/70 uppercase tracking-wide']">
                {{ formatSelfEvolutionDisplayText('personality-trajectory') }}
              </div>
              <div
                v-for="line in selectedCandidateTrajectorySummary.lines"
                :key="`candidate-trajectory-summary:${line}`"
                :class="['mb-1 text-xs text-amber-50/90 last:mb-0']"
              >
                {{ line }}
              </div>
            </div>
            <div
              v-if="selectedCandidateBaselineAnchorAuditSummary"
              :class="['mt-4 rounded-xl border border-violet-700/40 bg-violet-950/20 p-3']"
            >
              <div :class="['mb-2 text-xs text-violet-200/70 uppercase tracking-wide']">
                {{ formatSelfEvolutionDisplayText('baseline-anchor-audit') }}
              </div>
              <div
                v-for="line in selectedCandidateBaselineAnchorAuditSummary.lines"
                :key="`baseline-anchor-audit-summary:${line}`"
                :class="['mb-1 text-xs text-violet-50/90 last:mb-0']"
              >
                {{ line }}
              </div>
            </div>
            <div
              v-if="selectedCandidateCompanionshipTransitionSummary"
              :class="['mt-4 rounded-xl border border-pink-700/40 bg-pink-950/20 p-3']"
            >
              <div :class="['mb-2 text-xs text-pink-200/70 uppercase tracking-wide']">
                companionship transition
              </div>
              <div :class="['mb-1 text-xs text-pink-50/90']">
                mode: {{ formatMaybeText(selectedCandidateCompanionshipTransitionSummary.companionshipHoldMode) }}
              </div>
              <div :class="['mb-1 text-xs text-pink-50/90']">
                face bias: {{ formatList(selectedCandidateCompanionshipTransitionSummary.preferredExpressionAliases) }}
              </div>
              <div :class="['mb-1 text-xs text-pink-50/90']">
                motion bias: {{ formatList(selectedCandidateCompanionshipTransitionSummary.preferredMotionAliases) }}
              </div>
              <div
                v-if="selectedCandidateCompanionshipTransitionSummary.summaryLine"
                :class="['mb-1 text-xs text-pink-100/80']"
              >
                settle: {{ selectedCandidateCompanionshipTransitionSummary.summaryLine }}
              </div>
              <div
                v-for="reason in selectedCandidateCompanionshipTransitionSummary.reasons"
                :key="`candidate-companionship-transition-summary:${reason}`"
                :class="['mb-1 text-xs text-pink-100/72 last:mb-0']"
              >
                {{ reason }}
              </div>
            </div>
            <div
              v-if="identityDriftGovernanceSummary"
              :class="['mt-4 rounded-xl border border-cyan-700/40 bg-cyan-950/20 p-3']"
            >
              <div :class="['mb-2 text-xs text-cyan-200/70 uppercase tracking-wide']">
                {{ formatSelfEvolutionDisplayText('identity-drift-governance') }}
              </div>
              <div
                v-for="line in identityDriftGovernanceSummary.lines"
                :key="`identity-drift-governance-summary:${line}`"
                :class="['mb-1 text-xs text-cyan-50/90 last:mb-0']"
              >
                {{ line }}
              </div>
            </div>
            <div
              v-if="selectedCandidateImpactSummary"
              :class="['mt-4 rounded-xl border border-emerald-700/40 bg-emerald-950/20 p-3']"
            >
              <div :class="['mb-2 text-xs text-emerald-200/70 uppercase tracking-wide']">
                {{ formatSelfEvolutionDisplayText('candidate-impact-summary') }}
              </div>
              <div
                v-for="line in selectedCandidateImpactSummary.lines"
                :key="`candidate-impact-summary:${line}`"
                :class="['mb-1 text-xs text-emerald-50/90 last:mb-0']"
              >
                {{ line }}
              </div>
            </div>
            <div
              v-if="selfEvolutionTriageView.overviewLines.length > 0 || selfEvolutionTriageView.triageCards.length > 0"
              :class="['mt-4 rounded-xl border border-sky-700/40 bg-sky-950/20 p-3']"
            >
              <div :class="['mb-2 text-xs text-sky-200/70 uppercase tracking-wide']">
                {{ formatSelfEvolutionDisplayText('self-evolution-summary') }}
              </div>
              <div :class="['mb-3 rounded-lg border border-emerald-600/30 bg-emerald-900/20 p-3']">
                <div :class="['mb-2 flex flex-wrap items-center justify-between gap-2']">
                  <div :class="['text-[11px] text-emerald-100/70 uppercase tracking-wide']">
                    runtime same-her desktop proof
                  </div>
                  <ButtonBar
                    data-testid="runtime-same-her-proof:run-button"
                    icon="i-solar:play-circle-bold-duotone"
                    :text="benchmarkSupported ? 'Run sampled runtime same-her proof' : 'Runtime replay benchmark bridge is unavailable'"
                    @click="runRuntimeSameHerSessionProof"
                  >
                    {{ benchmarkLoading ? 'running proof' : benchmarkSupported ? 'run proof' : 'unsupported' }}
                  </ButtonBar>
                </div>
                <div
                  data-testid="runtime-same-her-proof:status"
                  :class="['mb-1 text-xs text-emerald-50/88']"
                >
                  status: {{ benchmarkRuntimeSameHerProofSummary?.status ?? (benchmarkSupported ? 'not-run' : 'unsupported') }}
                </div>
                <div
                  v-if="benchmarkRuntimeSameHerProofSummary?.headline"
                  :class="['mb-1 text-xs text-emerald-100/82']"
                >
                  {{ benchmarkRuntimeSameHerProofSummary.headline }}
                </div>
                <div
                  data-testid="runtime-same-her-proof:detail"
                  :class="['mb-1 text-xs text-emerald-100/72']"
                >
                  detail: {{ benchmarkRuntimeSameHerProofSummary?.detail ?? 'Run a sampled proof to load runtime decision-trace closure evidence.' }}
                </div>
                <div
                  data-testid="runtime-same-her-proof:next-repair-target"
                  :class="['text-xs text-emerald-100/72']"
                >
                  next repair target: {{ benchmarkRuntimeSameHerProofSummary?.nextRepairTarget ?? 'Collect real desktop turns before treating same-her closure as closed.' }}
                </div>
                <div
                  v-if="replayLastError"
                  :class="['mt-2 text-xs text-rose-100/80']"
                >
                  replay error: {{ replayLastError }}
                </div>
              </div>
              <div
                v-if="projectSelfBriefLines.length > 0"
                :class="['mb-3 rounded-lg border border-violet-600/30 bg-violet-900/20 p-3']"
              >
                <div :class="['mb-2 text-[11px] text-violet-100/70 uppercase tracking-wide']">
                  project self brief
                </div>
                <div
                  v-for="line in projectSelfBriefLines"
                  :key="`project-self-brief:${line}`"
                  :class="['mb-1 text-xs text-violet-100/84 last:mb-0']"
                >
                  {{ line }}
                </div>
              </div>
              <div
                v-if="preDialogueClosureSnapshot?.briefingLines?.length"
                :class="['mb-3 rounded-lg border border-sky-600/30 bg-sky-900/20 p-3']"
              >
                <div :class="['mb-2 text-[11px] text-sky-100/70 uppercase tracking-wide']">
                  pre-dialogue self briefing
                </div>
                <div
                  v-if="preDialogueClosureSnapshot.summaryLine"
                  :class="['mb-2 text-xs text-sky-50/88']"
                >
                  {{ preDialogueClosureSnapshot.summaryLine }}
                </div>
                <div
                  v-for="line in preDialogueClosureSnapshot.briefingLines"
                  :key="`pre-dialogue-briefing:${line}`"
                  :class="['mb-1 text-xs text-sky-100/80 last:mb-0']"
                >
                  {{ line }}
                </div>
                <div
                  v-if="benchmarkPreDialogueBriefingRows.length > 0"
                  :class="['mt-3 rounded-lg border border-sky-700/20 bg-sky-950/20 p-2']"
                >
                  <div :class="['mb-2 text-[11px] text-sky-200/70 uppercase tracking-wide']">
                    briefing stability
                  </div>
                  <div
                    v-for="row in benchmarkPreDialogueBriefingRows"
                    :key="`pre-dialogue-briefing-row:${row.key}`"
                    :class="['mb-1 text-xs text-sky-100/78 last:mb-0']"
                  >
                    {{ row.detail }}
                  </div>
                </div>
              </div>
              <div
                v-if="preDialogueAwarenessLines.length > 0"
                :class="['mb-3 rounded-lg border border-cyan-600/30 bg-cyan-900/20 p-3']"
              >
                <div :class="['mb-2 text-[11px] text-cyan-100/70 uppercase tracking-wide']">
                  pre-dialogue awareness
                </div>
                <div
                  v-for="line in preDialogueAwarenessLines"
                  :key="`pre-dialogue-awareness:${line}`"
                  :class="['mb-1 text-xs text-cyan-100/82 last:mb-0']"
                >
                  {{ line }}
                </div>
              </div>
              <div
                v-if="selfEvolutionTriageView.triageCards.length > 0"
                :ref="(element) => {
                  selfEvolutionRepairScrollTargetElements['self-evolution-snapshot:capture'] = element as HTMLElement | null
                }"
                :class="[
                  'mb-3 flex flex-wrap gap-2 rounded-lg transition-colors',
                  activeSelfEvolutionRepairSurfaceKey === 'snapshot:baseline'
                    ? 'ring-2 ring-emerald-400/70 p-1'
                    : '',
                ]"
              >
                <ButtonBar
                  icon="i-solar:compass-bold-duotone"
                  :text="formatSelfEvolutionDisplayText('focus-repair-path')"
                  @click="focusDefaultSelfEvolutionRepairPath"
                >
                  {{ formatSelfEvolutionDisplayText('focus-repair-path') }}
                </ButtonBar>
                <ButtonBar
                  icon="i-solar:bookmark-square-bold-duotone"
                  :text="formatSelfEvolutionDisplayText('capture-focus-snapshot')"
                  @click="captureSelfEvolutionFocusSnapshot"
                >
                  {{ formatSelfEvolutionDisplayText('capture-focus-snapshot') }}
                </ButtonBar>
              </div>
              <div
                v-if="selfEvolutionTriageView.triageCards.length > 0"
                :class="['mb-3 grid gap-2', 'md:grid-cols-3']"
              >
                <div
                  v-for="card in selfEvolutionTriageView.triageCards"
                  :key="`self-evolution-triage:${card.id}`"
                  :class="[
                    'cursor-pointer rounded-lg border p-2 transition-colors',
                    selectedSelfEvolutionTriageCardId === card.id
                      ? 'border-sky-400/70 bg-sky-800/30'
                      : 'border-sky-700/30 bg-sky-900/20 hover:border-sky-500/50',
                  ]"
                  @click="toggleSelfEvolutionTriageCard(card.id)"
                >
                  <div :class="['text-[11px] uppercase tracking-wide text-sky-200/70']">
                    {{ card.label }}
                  </div>
                  <div
                    v-if="card.layer"
                    :class="['mt-1 text-[11px] text-sky-300/80']"
                  >
                    {{ card.layer }}
                  </div>
                  <div :class="['mt-1 text-xs text-sky-50/90 break-words']">
                    {{ card.detail }}
                  </div>
                </div>
              </div>
              <div
                v-if="selfEvolutionFocusPlan.explanation"
                :class="['mb-3 rounded-lg border border-sky-700/30 bg-sky-900/15 p-2 text-xs text-sky-100/90']"
              >
                {{ selfEvolutionFocusPlan.explanation }}
              </div>
              <div
                v-if="lastSelfEvolutionFocusSnapshot"
                :class="['mb-3 rounded-lg border border-sky-800/30 bg-sky-950/10 p-2 text-xs text-sky-100/80']"
              >
                <div>{{ formatSelfEvolutionDisplayText('latest-snapshot') }}: {{ formatTimestamp(lastSelfEvolutionFocusSnapshotDisplay?.capturedAt) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('candidate') }}: {{ formatMaybeText(lastSelfEvolutionFocusSnapshotDisplay?.candidateId) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('trace') }}: {{ formatMaybeText(lastSelfEvolutionFocusSnapshotDisplay?.decisionTraceId) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('thread') }}: {{ formatMaybeText(lastSelfEvolutionFocusSnapshotDisplay?.activeThreadId) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('focus') }}: {{ formatMaybeText(lastSelfEvolutionFocusSnapshotDisplay?.focusLabel) }}</div>
              </div>
              <div
                v-if="selfEvolutionFocusSnapshotHistory.length > 1"
                :ref="(element) => {
                  selfEvolutionRepairScrollTargetElements['self-evolution-snapshot:history'] = element as HTMLElement | null
                }"
                :class="[
                  'mb-3 rounded-lg border border-sky-800/30 bg-sky-950/10 p-2 text-xs text-sky-100/80 transition-colors',
                  activeSelfEvolutionRepairSurfaceKey === 'snapshot:validation'
                    ? 'ring-2 ring-emerald-400/70'
                    : '',
                ]"
              >
                <div :class="['mb-1 text-sky-200/70 uppercase tracking-wide']">
                  {{ formatSelfEvolutionDisplayText('snapshot-history') }}
                </div>
                <div
                  v-for="snapshot in selfEvolutionFocusSnapshotHistoryDisplay"
                  :key="`${snapshot.capturedAt}:${snapshot.decisionTraceId}`"
                  :class="['mb-1 last:mb-0']"
                >
                  {{ formatTimestamp(snapshot.capturedAt) }} | {{ formatMaybeText(snapshot.focusLabel) }} | {{ formatMaybeText(snapshot.decisionTraceId) }}
                </div>
              </div>
              <div
                v-if="selfEvolutionFocusHistorySummary"
                :class="['mb-3 rounded-lg border border-sky-800/30 bg-sky-950/10 p-2 text-xs text-sky-100/80']"
              >
                <div :class="['mb-1 text-sky-200/70 uppercase tracking-wide']">
                  {{ formatSelfEvolutionDisplayText('focus-history-summary') }}
                </div>
                <div
                  v-for="line in selfEvolutionFocusHistorySummary"
                  :key="`self-evolution-focus-history:${line}`"
                  :class="['mb-1 last:mb-0']"
                >
                  {{ line }}
                </div>
              </div>
              <div
                v-if="activeSelfEvolutionWorkflowFocus"
                :class="['mb-3 rounded-lg border border-emerald-700/40 bg-emerald-950/20 p-2 text-xs text-emerald-100/90']"
              >
                <div :class="['mb-1 text-emerald-200/70 uppercase tracking-wide']">
                  {{ activeSelfEvolutionWorkflowFocus.title }}
                </div>
                <div :class="['mb-1']">
                  {{ activeSelfEvolutionWorkflowFocus.summaryLine }}
                </div>
                <div>
                  {{ formatSelfEvolutionDisplayText('owner') }}: {{ formatSelfEvolutionRepairOwnerHint(activeSelfEvolutionWorkflowFocus.repairOwnerHint) }}
                </div>
              </div>
              <div
                v-if="selfEvolutionRepairSession"
                :class="['mb-3 rounded-lg border border-emerald-700/30 bg-emerald-950/10 p-2 text-xs text-emerald-100/85']"
              >
                <div :class="['mb-1 text-emerald-200/70 uppercase tracking-wide']">
                  {{ formatSelfEvolutionDisplayText('repair-session-checklist') }}
                </div>
                <div :class="['mb-1']">
                  {{ formatSelfEvolutionDisplayText('completion') }}: {{ selfEvolutionRepairSession.completionPercent }}% ({{ selfEvolutionRepairSession.completedCount }}/{{ selfEvolutionRepairSession.totalCount }})
                </div>
                <div
                  v-for="line in selfEvolutionRepairSession.summaryLines"
                  :key="`self-evolution-repair-session:${line}`"
                  :class="['mb-1 last:mb-0']"
                >
                  {{ line }}
                </div>
                <div
                  v-if="selfEvolutionRepairClosure"
                  :class="['mt-2 rounded-md border border-emerald-700/20 bg-emerald-950/10 p-2']"
                >
                  <div :class="['mb-1 text-emerald-200/70 uppercase tracking-wide']">
                    {{ formatSelfEvolutionDisplayText('repair-closure') }}
                  </div>
                  <div :class="['mb-1']">
                    {{ formatSelfEvolutionDisplayText('status') }}: {{ formatSelfEvolutionClosureStatus(selfEvolutionRepairClosure.isClosed) }}
                  </div>
                  <div
                    v-for="line in selfEvolutionRepairClosure.summaryLines"
                    :key="`self-evolution-repair-closure:${line}`"
                    :class="['mb-1 last:mb-0']"
                  >
                    {{ line }}
                  </div>
                  <div
                    v-if="selfEvolutionRepairNextAction"
                    :class="['mt-2 rounded-md border border-emerald-700/20 bg-emerald-950/10 p-2']"
                  >
                    <div :class="['mb-1 text-emerald-200/70 uppercase tracking-wide']">
                      {{ formatSelfEvolutionDisplayText('next-action') }}
                    </div>
                    <div :class="['mb-2 flex flex-wrap gap-2']">
                      <ButtonBar
                        icon="i-solar:play-bold-duotone"
                        :text="formatSelfEvolutionDisplayText('run-suggested-repair-action')"
                        @click="runSelfEvolutionRepairNextAction"
                      >
                        {{ formatSelfEvolutionDisplayText('run-next-action-short') }}
                      </ButtonBar>
                    </div>
                    <div :class="['mb-1']">
                      {{ selfEvolutionRepairNextAction.label }}
                    </div>
                    <div>
                      {{ selfEvolutionRepairNextAction.detail }}
                    </div>
                  </div>
                  <div
                    v-if="selfEvolutionRepairActionFeedback"
                    :class="[
                      'mt-2 rounded-md border p-2',
                      selfEvolutionRepairActionFeedback.tone === 'success'
                        ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-100/90'
                        : 'border-sky-500/30 bg-sky-950/20 text-sky-100/90',
                    ]"
                  >
                    <div :class="['mb-1 uppercase tracking-wide text-[10px] opacity-75']">
                      {{ formatSelfEvolutionDisplayText('action-feedback') }}
                    </div>
                    <div :class="['mb-1']">
                      {{ selfEvolutionRepairActionFeedback.summaryLine }}
                    </div>
                    <div>
                      {{ selfEvolutionRepairActionFeedback.detailLine }}
                    </div>
                    <div
                      v-for="line in selfEvolutionRepairActionFeedback.supportingLines ?? []"
                      :key="`self-evolution-repair-action-feedback:${line}`"
                      :class="['mt-1 text-[11px] opacity-80 last:mb-0']"
                    >
                      {{ line }}
                    </div>
                  </div>
                  <div
                    v-if="selfEvolutionBaselineQuality"
                    :class="[
                      'mt-2 rounded-md border p-2',
                      selfEvolutionBaselineQuality.verdict === 'trusted'
                        ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-100/90'
                        : selfEvolutionBaselineQuality.verdict === 'provisional'
                          ? 'border-amber-500/40 bg-amber-950/20 text-amber-100/90'
                          : 'border-rose-500/40 bg-rose-950/20 text-rose-100/90',
                    ]"
                  >
                    <div :class="['mb-1 uppercase tracking-wide text-[10px] opacity-75']">
                      {{ formatSelfEvolutionDisplayText('baseline-quality') }}
                    </div>
                    <div :class="['mb-1']">
                      {{ selfEvolutionBaselineQuality.summaryLine }}
                    </div>
                    <div :class="['mb-1']">
                      {{ selfEvolutionBaselineQuality.detailLine }}
                    </div>
                    <div
                      v-for="line in selfEvolutionBaselineQuality.supportingLines"
                      :key="`self-evolution-baseline-quality:${line}`"
                      :class="['mb-1 last:mb-0 text-[11px] opacity-80']"
                    >
                      {{ line }}
                    </div>
                  </div>
                  <div
                    v-if="selfEvolutionBaselineAdoption"
                    :class="[
                      'mt-2 rounded-md border p-2',
                      selfEvolutionBaselineAdoption.mode === 'adopt-now'
                        ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-100/90'
                        : selfEvolutionBaselineAdoption.mode === 'observe'
                          ? 'border-amber-500/40 bg-amber-950/20 text-amber-100/90'
                          : 'border-rose-500/40 bg-rose-950/20 text-rose-100/90',
                    ]"
                  >
                    <div :class="['mb-1 uppercase tracking-wide text-[10px] opacity-75']">
                      {{ formatSelfEvolutionDisplayText('baseline-adoption') }}
                    </div>
                    <div :class="['mb-1']">
                      {{ selfEvolutionBaselineAdoption.summaryLine }}
                    </div>
                    <div :class="['mb-1']">
                      {{ selfEvolutionBaselineAdoption.detailLine }}
                    </div>
                    <div
                      v-for="line in selfEvolutionBaselineAdoption.supportingLines"
                      :key="`self-evolution-baseline-adoption:${line}`"
                      :class="['mb-1 last:mb-0 text-[11px] opacity-80']"
                    >
                      {{ line }}
                    </div>
                  </div>
                  <div
                    v-if="selfEvolutionAdoptedAnchor"
                    :class="['mt-2 rounded-md border border-cyan-500/40 bg-cyan-950/20 p-2 text-cyan-100/90']"
                  >
                    <div :class="['mb-1 uppercase tracking-wide text-[10px] opacity-75']">
                      {{ formatSelfEvolutionDisplayText('adopted-anchor') }}
                    </div>
                    <div :class="['mb-1']">
                      {{ selfEvolutionAdoptedAnchor.summaryLine }}
                    </div>
                    <div :class="['text-[11px] opacity-80']">
                      candidate {{ formatMaybeText(selfEvolutionAdoptedAnchor.candidateId) }} |
                      trace {{ formatMaybeText(selfEvolutionAdoptedAnchor.decisionTraceId) }} |
                      {{ formatSelfEvolutionDisplayText('owner') }} {{ formatSelfEvolutionRepairOwnerHint(selfEvolutionAdoptedAnchor.repairOwnerHint) }}
                    </div>
                    <div
                      v-if="selfEvolutionAdoptedAnchorTraceability"
                      :class="['mt-2 rounded-md border border-cyan-500/20 bg-cyan-950/10 p-2 text-[11px] opacity-90']"
                    >
                      <div
                        v-if="selfEvolutionAdoptedAnchorTraceability.workflowHeadline"
                        :class="['mb-1 text-cyan-50/95']"
                      >
                        {{ selfEvolutionAdoptedAnchorTraceability.workflowHeadline }}
                      </div>
                      <div
                        v-if="selfEvolutionAdoptedAnchorTraceability.patternSummary"
                        :class="['mb-1 text-cyan-100/80']"
                      >
                        {{ selfEvolutionAdoptedAnchorTraceability.patternSummary }}
                      </div>
                      <div
                        v-if="selfEvolutionAdoptedAnchorTraceability.workflowContextLine"
                        :class="['mb-1 text-cyan-100/80']"
                      >
                        {{ selfEvolutionAdoptedAnchorTraceability.workflowContextLine }}
                      </div>
                      <div
                        v-for="line in selfEvolutionAdoptedAnchorTraceability.supportingLines"
                        :key="`self-evolution-adopted-anchor-traceability:${line}`"
                        :class="['mb-1 last:mb-0 text-cyan-100/75']"
                      >
                        {{ line }}
                      </div>
                      <button
                        v-if="selfEvolutionAdoptedAnchorTraceability.patternKey"
                        type="button"
                        :class="['mt-2 rounded border border-cyan-400/40 bg-cyan-900/20 px-2 py-1 text-[11px] text-cyan-50 transition hover:border-cyan-300/60 hover:bg-cyan-800/30']"
                        @click="() => applySelfEvolutionPatternWorkflowContext(selfEvolutionAdoptedAnchorTraceability!.patternKey)"
                      >
                        {{ formatSelfEvolutionDisplayText('apply-workflow-context') }}
                      </button>
                      <div
                        v-if="selfEvolutionAdoptedAnchorHistoryTransition"
                        :class="['mt-2 rounded border border-cyan-500/20 bg-cyan-950/10 p-2 text-[11px] text-cyan-100/80']"
                      >
                        <div :class="['mb-1 text-cyan-50/95']">
                          {{ selfEvolutionAdoptedAnchorHistoryTransition.summaryLine }}
                        </div>
                        <div
                          v-for="line in selfEvolutionAdoptedAnchorHistoryTransition.supportingLines"
                          :key="`self-evolution-adopted-anchor-history-transition:${line}`"
                          :class="['mb-1 last:mb-0']"
                        >
                          {{ line }}
                        </div>
                        <button
                          type="button"
                          :class="['mt-2 rounded border border-cyan-400/40 bg-cyan-900/20 px-2 py-1 text-[11px] text-cyan-50 transition hover:border-cyan-300/60 hover:bg-cyan-800/30']"
                          @click="selectSelfEvolutionAdoptedAnchorHistoryTransition"
                        >
                          {{ formatSelfEvolutionDisplayText('history-drilldown') }}
                        </button>
                      </div>
                      <button
                        v-if="selfEvolutionAdoptedAnchorReplayPlan"
                        type="button"
                        :class="['mt-2 rounded border border-emerald-400/50 bg-emerald-900/20 px-2 py-1 text-[11px] text-emerald-50 transition hover:border-emerald-300/70 hover:bg-emerald-800/30']"
                        @click="replaySelfEvolutionAdoptedAnchor"
                      >
                        {{ selfEvolutionAdoptedAnchorReplayPlan.summaryLine }}
                      </button>
                      <div
                        v-if="selfEvolutionAdoptedAnchorReplayPlan?.supportingLines?.find(line => line.startsWith('显形补回：'))"
                        :class="['mt-2 rounded border border-emerald-500/20 bg-emerald-950/10 p-2 text-[11px] text-emerald-100/85']"
                      >
                        {{ selfEvolutionAdoptedAnchorReplayPlan.supportingLines.find(line => line.startsWith('显形补回：')) }}
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="selfEvolutionBaselineAdoptionHistorySummary"
                    :class="['mt-2 rounded-md border border-cyan-500/20 bg-cyan-950/10 p-2 text-cyan-100/85']"
                  >
                    <div :class="['mb-1 uppercase tracking-wide text-[10px] opacity-75']">
                      {{ formatSelfEvolutionDisplayText('adoption-audit') }}
                    </div>
                    <div
                      v-for="line in selfEvolutionBaselineAdoptionHistorySummary"
                      :key="`self-evolution-baseline-adoption-history:${line}`"
                      :class="['mb-1 last:mb-0 text-[11px] opacity-80']"
                    >
                      {{ line }}
                    </div>
                  </div>
                </div>
              </div>
              <div
                v-if="selfEvolutionFocusHistoryDrilldown.length > 0"
                :class="['mb-3 rounded-lg border border-sky-800/30 bg-sky-950/10 p-2 text-xs text-sky-100/80']"
              >
                <div :class="['mb-1 text-sky-200/70 uppercase tracking-wide']">
                  {{ formatSelfEvolutionDisplayText('history-drilldown') }}
                </div>
                <div
                  v-for="transition in selfEvolutionFocusHistoryDrilldown"
                  :key="`${transition.currentCapturedAt}:${transition.previousCapturedAt}`"
                  :class="[
                    'mb-2 rounded-md border border-sky-800/30 bg-sky-950/10 p-2 last:mb-0',
                    selectedSelfEvolutionHistoryTransitionKey === `${transition.currentCapturedAt}:${transition.previousCapturedAt}`
                      ? 'border-sky-400/60 bg-sky-900/20'
                      : '',
                  ]"
                >
                  <div :class="['mb-1 text-sky-100/90']">
                    {{ formatTimestamp(transition.previousCapturedAt) }} -> {{ formatTimestamp(transition.currentCapturedAt) }}
                  </div>
                  <div :class="['mb-1 text-sky-200/70']">
                    trace: {{ formatMaybeText(transition.previousDecisionTraceId) }} -> {{ formatMaybeText(transition.currentDecisionTraceId) }}
                  </div>
                  <div
                    v-if="selfEvolutionFocusHistoryComparisons.find(item => item.transitionKey === `${transition.currentCapturedAt}:${transition.previousCapturedAt}`)?.comparison"
                    :class="['mb-2 rounded-md border border-sky-800/30 bg-sky-950/10 p-2 text-sky-100/80']"
                  >
                    <div :class="['mb-1 text-sky-200/70 uppercase tracking-wide']">
                      {{ formatSelfEvolutionDisplayText('previous-current-comparison') }}
                    </div>
                    <div
                      v-if="hasBodyContinuityComparisonBanner(selfEvolutionFocusHistoryComparisonsByTransitionKey[`${transition.currentCapturedAt}:${transition.previousCapturedAt}`]?.comparison.bodyContinuityPhase ?? null)"
                      :class="['mb-2 rounded-md border border-emerald-700/40 bg-emerald-950/20 p-2 text-emerald-100/90']"
                    >
                      {{ formatSelfEvolutionDisplayText('body-continuity') }}:
                      {{ formatSelfEvolutionDisplayText(selfEvolutionFocusHistoryComparisonsByTransitionKey[`${transition.currentCapturedAt}:${transition.previousCapturedAt}`]?.comparison.bodyContinuityPhase ?? 'body-continuity') }}
                      <template
                        v-if="bodyContinuityPhaseHasRendererSurface(selfEvolutionFocusHistoryComparisonsByTransitionKey[`${transition.currentCapturedAt}:${transition.previousCapturedAt}`]?.comparison.bodyContinuityPhase ?? null)"
                      >
                        ({{ formatRendererRejoinSurfaceLabel(selfEvolutionFocusHistoryComparisonsByTransitionKey[`${transition.currentCapturedAt}:${transition.previousCapturedAt}`]?.rendererRejoinSurfaceKey ?? null) }})
                      </template>
                    </div>
                    <div
                      v-for="line in selfEvolutionFocusHistoryComparisonsByTransitionKey[`${transition.currentCapturedAt}:${transition.previousCapturedAt}`]?.comparison.summaryLines ?? []"
                      :key="`self-evolution-focus-comparison:${transition.currentCapturedAt}:${transition.previousCapturedAt}:${line}`"
                      :class="['mb-1 last:mb-0']"
                    >
                      {{ line }}
                    </div>
                  </div>
                  <div :class="['mb-2 flex flex-wrap gap-2']">
                    <ButtonBar
                      icon="i-solar:layers-minimalistic-bold-duotone"
                      :text="formatSelfEvolutionDisplayText('show-diff-detail')"
                      @click="() => {
                        selectSelfEvolutionHistoryTransition(transition)
                        selectedSelfEvolutionHistorySide = 'current'
                      }"
                    >
                      {{ formatSelfEvolutionDisplayText('show-diff-short') }}
                    </ButtonBar>
                    <ButtonBar
                      icon="i-solar:rewind-back-bold-duotone"
                      :text="formatSelfEvolutionDisplayText('restore-previous-detail')"
                      @click="() => restoreSelfEvolutionHistoryTransition(transition, 'previous')"
                    >
                      {{ formatSelfEvolutionDisplayText('restore-previous-short') }}
                    </ButtonBar>
                    <ButtonBar
                      icon="i-solar:rewind-forward-bold-duotone"
                      :text="formatSelfEvolutionDisplayText('restore-current-detail')"
                      @click="() => restoreSelfEvolutionHistoryTransition(transition, 'current')"
                    >
                      {{ formatSelfEvolutionDisplayText('restore-current-short') }}
                    </ButtonBar>
                  </div>
                  <div
                    v-for="line in transition.lines"
                    :key="`self-evolution-focus-drilldown:${transition.currentCapturedAt}:${transition.previousCapturedAt}:${line}`"
                    :class="['mb-1 last:mb-0']"
                  >
                    {{ line }}
                  </div>
                  <div
                    v-if="selectedSelfEvolutionHistoryTransitionKey === `${transition.currentCapturedAt}:${transition.previousCapturedAt}` && selectedSelfEvolutionHistoryRestoreSummaryLine"
                    :class="['mt-2 rounded-md border border-emerald-700/40 bg-emerald-950/20 p-2 text-emerald-100/90']"
                  >
                    {{ selectedSelfEvolutionHistoryRestoreSummaryLine }}
                  </div>
                </div>
              </div>
              <div
                v-if="selfEvolutionFocusHistoryPatterns.length > 0"
                :class="['mb-3 rounded-lg border border-sky-800/30 bg-sky-950/10 p-2 text-xs text-sky-100/80']"
              >
                <div :class="['mb-1 text-sky-200/70 uppercase tracking-wide']">
                  {{ formatSelfEvolutionDisplayText('recurring-drift-patterns') }}
                </div>
                <div
                  v-for="pattern in selfEvolutionFocusHistoryPatterns"
                  :key="pattern.patternKey"
                  :class="['mb-2 rounded-md border border-sky-800/30 bg-sky-950/10 p-2 last:mb-0']"
                >
                  <div :class="['mb-1 text-sky-100/90']">
                    {{ pattern.summaryLine }}
                  </div>
                  <div :class="['text-sky-200/70']">
                    {{ formatSelfEvolutionDisplayText('occurrences') }}:
                    {{
                      pattern.occurrences
                        .map(occurrence => `${formatTimestamp(occurrence.previousCapturedAt)} -> ${formatTimestamp(occurrence.currentCapturedAt)}`)
                        .join(' | ')
                    }}
                  </div>
                  <div
                    v-if="selfEvolutionFocusHistoryPatternGuidance.find(item => item.patternKey === pattern.patternKey)?.guidance"
                    :class="['mt-2 rounded-md border border-sky-800/30 bg-sky-950/10 p-2']"
                  >
                    <div :class="['mb-1 text-sky-200/70 uppercase tracking-wide']">
                      {{ formatSelfEvolutionDisplayText('repair-guidance') }}
                    </div>
                    <div
                      v-if="selfEvolutionFocusHistoryPatternWorkflowByKey[pattern.patternKey]"
                      :class="['mb-2 rounded-md border border-sky-800/30 bg-sky-950/10 p-2']"
                    >
                      <div :class="['mb-1 text-sky-200/70 uppercase tracking-wide']">
                        {{ formatSelfEvolutionDisplayText('repair-workflow') }}
                      </div>
                      <div
                        v-if="selfEvolutionFocusHistoryPatternContextByKey[pattern.patternKey]"
                        :class="['mb-2 flex flex-wrap gap-2']"
                      >
                        <ButtonBar
                          icon="i-solar:cursor-bold-duotone"
                          :text="formatSelfEvolutionDisplayText('apply-workflow-context')"
                          @click="() => applySelfEvolutionPatternWorkflowContext(pattern.patternKey)"
                        >
                          {{ formatSelfEvolutionDisplayText('apply-workflow-context') }}
                        </ButtonBar>
                        <div :class="['text-sky-200/70']">
                          {{ selfEvolutionFocusHistoryPatternContextByKey[pattern.patternKey].summaryLine }}
                        </div>
                      </div>
                      <div :class="['mb-2 text-sky-100/90']">
                        {{ selfEvolutionFocusHistoryPatternWorkflowByKey[pattern.patternKey].headline }}
                      </div>
                      <div
                        v-for="step in selfEvolutionFocusHistoryPatternWorkflowByKey[pattern.patternKey].steps"
                        :key="`self-evolution-pattern-workflow:${pattern.patternKey}:${step.key}`"
                        :class="['mb-2 last:mb-0']"
                      >
                        <div :class="['text-sky-100/90']">
                          {{ step.title }}
                        </div>
                        <div :class="['text-sky-200/70']">
                          {{ step.detail }}
                        </div>
                      </div>
                      <div :class="['mt-2 text-sky-200/70 uppercase tracking-wide']">
                        {{ formatSelfEvolutionDisplayText('validation-checklist') }}
                      </div>
                      <div
                        v-for="line in selfEvolutionFocusHistoryPatternWorkflowByKey[pattern.patternKey].validationChecklist"
                        :key="`self-evolution-pattern-validation:${pattern.patternKey}:${line}`"
                        :class="['text-sky-200/70']"
                      >
                        - {{ line }}
                      </div>
                    </div>
                    <div :class="['mb-1']">
                      {{
                        selfEvolutionFocusHistoryPatternGuidance.find(item => item.patternKey === pattern.patternKey)?.guidance?.summaryLine
                      }}
                    </div>
                    <div :class="['mb-1 text-sky-200/70']">
                      {{ formatSelfEvolutionDisplayText('layer') }}:
                      {{ selfEvolutionFocusHistoryPatternGuidanceDisplayByKey[pattern.patternKey]?.governanceLayerLabel }}
                      |
                      {{ formatSelfEvolutionDisplayText('owner') }}:
                      {{ selfEvolutionFocusHistoryPatternGuidanceDisplayByKey[pattern.patternKey]?.repairOwnerHintLabel }}
                    </div>
                    <div :class="['mb-1 text-sky-200/70']">
                      {{ formatSelfEvolutionDisplayText('evidence') }}:
                      {{ selfEvolutionFocusHistoryPatternGuidanceDisplayByKey[pattern.patternKey]?.evidenceLabels }}
                    </div>
                    <div :class="['mb-1 text-sky-200/70']">
                      {{ formatSelfEvolutionDisplayText('trace') }}:
                      {{ selfEvolutionFocusHistoryPatternGuidanceDisplayByKey[pattern.patternKey]?.traceLabels }}
                    </div>
                    <div :class="['text-sky-200/70']">
                      {{ formatSelfEvolutionDisplayText('events') }}:
                      {{ selfEvolutionFocusHistoryPatternGuidanceDisplayByKey[pattern.patternKey]?.eventLabels }}
                    </div>
                  </div>
                </div>
              </div>
              <div
                v-if="selfEvolutionFocusDiffSummary"
                :class="['mb-3 rounded-lg border border-sky-800/30 bg-sky-950/10 p-2 text-xs text-sky-100/80']"
              >
                <div :class="['mb-1 text-sky-200/70 uppercase tracking-wide']">
                  {{ formatSelfEvolutionDisplayText('focus-diff-vs-last-snapshot') }}
                </div>
                <div
                  v-for="line in selfEvolutionFocusDiffSummary"
                  :key="`self-evolution-focus-diff:${line}`"
                  :class="['mb-1 last:mb-0']"
                >
                  {{ line }}
                </div>
              </div>
              <div
                v-for="line in selfEvolutionTriageView.overviewLines"
                :key="`self-evolution-summary:${line}`"
                :class="['mb-1 text-xs text-sky-50/90 last:mb-0']"
              >
                {{ line }}
              </div>
            </div>
            <div
              v-if="selfEvolutionEvidencePanels.length > 0"
              :class="['mt-4 rounded-xl border border-neutral-800/80 bg-neutral-950/30 p-3']"
            >
              <div :class="['mb-2 text-xs text-neutral-400 uppercase tracking-wide']">
                {{ formatSelfEvolutionDisplayText('persona-action-evidence') }}
              </div>
              <div :class="['grid gap-3 text-xs text-neutral-400', 'md:grid-cols-2']">
                <div
                  v-for="panel in selfEvolutionEvidencePanels"
                  :key="panel.id"
                  :ref="(element) => {
                    selfEvolutionRepairScrollTargetElements[`self-evolution-evidence:${panel.id}`] = element as HTMLElement | null
                  }"
                  :class="[
                    'rounded-lg border p-2 transition-colors',
                    activeSelfEvolutionRepairSurfaceKey === `evidence:${panel.id}`
                      ? 'ring-2 ring-emerald-400/70'
                      : '',
                    activeSelfEvolutionWorkflowFocus?.evidencePanels.has(panel.id)
                      ? 'ring-1 ring-emerald-500/40'
                      : '',
                    resolveSelfEvolutionDiffEvidenceState(panel.id) === 'current-only'
                      ? 'border-emerald-500/70 bg-emerald-950/20 text-emerald-100'
                      : resolveSelfEvolutionDiffEvidenceState(panel.id) === 'previous-only'
                        ? 'border-amber-500/70 bg-amber-950/20 text-amber-100'
                        : resolveSelfEvolutionDiffEvidenceState(panel.id) === 'shared'
                          ? 'border-cyan-500/70 bg-cyan-950/20 text-cyan-100'
                          : highlightedSelfEvolutionEvidencePanelIds.has(panel.id)
                            ? 'border-sky-500/70 bg-sky-950/30 text-sky-100'
                            : 'border-neutral-800/70 bg-neutral-900/30',
                  ]"
                  @mouseenter="markSelfEvolutionWorkflowEvidencePanelViewed(panel.id)"
                >
                  <div :class="['mb-1 flex items-center justify-between gap-2 text-neutral-300']">
                    <span>{{ panel.title }}</span>
                    <span
                      v-if="resolveSelfEvolutionDiffEvidenceState(panel.id)"
                      :class="['text-[10px] uppercase tracking-wide']"
                    >
                      {{ resolveSelfEvolutionDiffEvidenceState(panel.id) }}
                    </span>
                  </div>
                  <div
                    v-for="line in panel.lines"
                    :key="`${panel.id}:${line}`"
                    :ref="(element) => {
                      const scrollTargetId = resolvePerformanceVisualizerEvidenceLineScrollTargetId({
                        panelId: panel.id,
                        line,
                      })
                      if (scrollTargetId)
                        selfEvolutionRepairScrollTargetElements[scrollTargetId] = element as HTMLElement | null
                    }"
                    :class="['mb-1 last:mb-0']"
                  >
                    {{ line }}
                  </div>
                </div>
              </div>
            </div>
            <div
              v-if="selectedCandidateTraceConsumptionEvidence"
              :ref="(element) => {
                selfEvolutionRepairScrollTargetElements['self-evolution-trace:trace-consumption'] = element as HTMLElement | null
              }"
              :class="[
                'mt-4 rounded-xl border p-3 transition-colors',
                activeSelfEvolutionRepairSurfaceKey === 'trace:trace-consumption'
                  ? 'ring-2 ring-emerald-400/70'
                  : '',
                activeSelfEvolutionWorkflowFocus?.traceSections.has('trace-consumption')
                  ? 'ring-1 ring-emerald-500/40'
                  : '',
                resolveSelfEvolutionDiffTraceState('trace-consumption') === 'current-only'
                  ? 'border-emerald-500/70 bg-emerald-950/20'
                  : resolveSelfEvolutionDiffTraceState('trace-consumption') === 'previous-only'
                    ? 'border-amber-500/70 bg-amber-950/20'
                    : resolveSelfEvolutionDiffTraceState('trace-consumption') === 'shared'
                      ? 'border-cyan-500/70 bg-cyan-950/20'
                      : highlightedSelfEvolutionTraceSectionIds.has('trace-consumption')
                        ? 'border-sky-500/70 bg-sky-950/30'
                        : 'border-neutral-800/80 bg-neutral-950/30',
              ]"
              @mouseenter="markSelfEvolutionWorkflowTraceSectionViewed('trace-consumption')"
            >
              <div :class="['mb-2 flex items-center justify-between gap-2 text-xs text-neutral-400 uppercase tracking-wide']">
                <span>{{ formatSelfEvolutionDisplayText('trace-consumption-evidence') }}</span>
                <span
                  v-if="resolveSelfEvolutionDiffTraceState('trace-consumption')"
                  :class="['text-[10px]']"
                >
                  {{ resolveSelfEvolutionDiffTraceState('trace-consumption') }}
                </span>
              </div>
              <div :class="['grid gap-2 text-xs text-neutral-400', 'md:grid-cols-2']">
                <div>{{ formatSelfEvolutionDisplayText('status') }}: {{ formatSelfEvolutionRuntimeStatus(selectedCandidateTraceConsumptionEvidence.status) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('matched-candidate-id') }}: {{ formatMaybeText(selectedCandidateTraceConsumptionEvidence.matchedCandidateId) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('matched-active-candidate-id') }}: {{ selectedCandidateTraceConsumptionEvidence.matchedActiveCandidateId }}</div>
                <div>{{ formatSelfEvolutionDisplayText('trace-patch-id') }}: {{ formatMaybeText(selectedCandidateTraceConsumptionEvidence.tracePatchId) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('trace-patch-decision-trace-id') }}: {{ formatMaybeText(selectedCandidateTraceConsumptionEvidence.tracePatchDecisionTraceId) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('matched-patch-id') }}: {{ selectedCandidateTraceConsumptionEvidence.matchedPatchId }}</div>
                <div>{{ formatSelfEvolutionDisplayText('matched-decision-trace-id') }}: {{ selectedCandidateTraceConsumptionEvidence.matchedDecisionTraceId }}</div>
                <div>{{ formatSelfEvolutionDisplayText('trace-lanes') }}: {{ formatList(selectedCandidateTraceConsumptionEvidence.traceLanes?.map(value => formatSelfEvolutionTraceListValue('lane', value))) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('trace-reason-codes') }}: {{ formatList(selectedCandidateTraceConsumptionEvidence.traceReasonCodes?.map(value => formatSelfEvolutionTraceListValue('reason-code', value))) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('missing-signals') }}: {{ formatList(selectedCandidateTraceConsumptionEvidence.missingSignals?.map(value => formatSelfEvolutionTraceListValue('trace-signal', value))) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('drifting-signals') }}: {{ formatList(selectedCandidateTraceConsumptionEvidence.driftingSignals?.map(value => formatSelfEvolutionTraceListValue('trace-signal', value))) }}</div>
              </div>
              <div :class="['mt-2 text-xs text-neutral-500']">
                {{ formatList(selectedCandidateTraceConsumptionEvidence.reasons) }}
              </div>
            </div>
            <div
              v-if="selectedCandidateConsumedTraceSummaries.length > 0"
              :class="['mt-4 rounded-xl border border-neutral-800/80 bg-neutral-950/30 p-3']"
            >
              <div :class="['mb-2 text-xs text-neutral-400 uppercase tracking-wide']">
                {{ formatSelfEvolutionDisplayText('cross-turn-candidate-consumption') }}
              </div>
              <div
                v-for="trace in selectedCandidateConsumedTraceSummaries"
                :key="trace.decisionTraceId"
                :class="['mb-2 rounded-lg border border-neutral-800/70 bg-neutral-900/30 p-2 text-xs text-neutral-400']"
              >
                <div>{{ formatSelfEvolutionDisplayText('decision-trace-id') }}: {{ formatMaybeText(trace.decisionTraceId) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('turn-id') }}: {{ formatMaybeText(trace.turnId) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('consumed-at') }}: {{ formatTimestamp(trace.consumedAt) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('lanes') }}: {{ formatList(trace.lanes?.map(value => formatSelfEvolutionTraceListValue('lane', value))) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('trajectory-summary') }}: {{ formatMaybeText(trace.trajectorySummary) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('summary') }}: {{ formatMaybeText(trace.summary) }}</div>
              </div>
            </div>
            <div
              v-if="selectedCandidateConsumptionStability"
              :class="['mt-4 rounded-xl border border-neutral-800/80 bg-neutral-950/30 p-3']"
            >
              <div :class="['mb-2 text-xs text-neutral-400 uppercase tracking-wide']">
                {{ formatSelfEvolutionDisplayText('candidate-stability') }}
              </div>
              <div :class="['grid gap-2 text-xs text-neutral-400', 'md:grid-cols-2']">
                <div>{{ formatSelfEvolutionDisplayText('consumed-turn-count') }}: {{ selectedCandidateConsumptionStability.consumedTurnCount }}</div>
                <div>{{ formatSelfEvolutionDisplayText('latest-consumed-at') }}: {{ selectedCandidateConsumptionStability.latestConsumedAt ? formatTimestamp(selectedCandidateConsumptionStability.latestConsumedAt) : 'n/a' }}</div>
                <div>{{ formatSelfEvolutionDisplayText('latest-decision-trace-id') }}: {{ formatMaybeText(selectedCandidateConsumptionStability.latestDecisionTraceId) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('dominant-learning-action') }}: {{ formatSelfEvolutionLearningValue('action', selectedCandidateConsumptionStability.dominantLearningAction) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('lane-coverage') }}: {{ formatList(selectedCandidateConsumptionStability.laneCoverage?.map(value => formatSelfEvolutionTraceListValue('lane', value))) }}</div>
                <div>{{ formatSelfEvolutionDisplayText('drift-detected') }}: {{ selectedCandidateConsumptionStability.driftDetected }}</div>
              </div>
              <div :class="['mt-2 text-xs text-neutral-500']">
                {{ formatList(selectedCandidateConsumptionStability.reasons) }}
              </div>
            </div>
            <div
              :ref="(element) => {
                selfEvolutionRepairScrollTargetElements['self-evolution-trace:trace-details'] = element as HTMLElement | null
              }"
              :class="[
                'mt-3 text-xs',
                activeSelfEvolutionRepairSurfaceKey === 'trace:trace-details'
                  ? 'ring-2 ring-emerald-400/70 rounded'
                  : '',
                resolveSelfEvolutionDiffTraceState('trace-details') === 'current-only'
                  ? 'text-emerald-200'
                  : resolveSelfEvolutionDiffTraceState('trace-details') === 'previous-only'
                    ? 'text-amber-200'
                    : resolveSelfEvolutionDiffTraceState('trace-details') === 'shared'
                      ? 'text-cyan-200'
                      : highlightedSelfEvolutionTraceSectionIds.has('trace-details')
                        ? 'text-sky-200'
                        : 'text-neutral-400',
              ]"
              @mouseenter="markSelfEvolutionWorkflowTraceSectionViewed('trace-details')"
            >
              {{ formatSelfEvolutionDisplayText('trace-events-count') }}: {{ drilledTraceResult?.events.length ?? 0 }}
            </div>
            <div
              :class="[
                'mt-1 text-xs',
                resolveSelfEvolutionDiffTraceState('trace-details') === 'current-only'
                  ? 'text-emerald-200'
                  : resolveSelfEvolutionDiffTraceState('trace-details') === 'previous-only'
                    ? 'text-amber-200'
                    : resolveSelfEvolutionDiffTraceState('trace-details') === 'shared'
                      ? 'text-cyan-200'
                      : highlightedSelfEvolutionTraceSectionIds.has('trace-details')
                        ? 'text-sky-200'
                        : 'text-neutral-400',
              ]"
            >
              {{ formatSelfEvolutionDisplayText('trace-records-count') }}: {{ drilledTraceResult?.traceRecords.length ?? 0 }}
            </div>
            <div
              :class="[
                'mt-1 text-xs',
                resolveSelfEvolutionDiffTraceState('trace-details') === 'current-only'
                  ? 'text-emerald-200'
                  : resolveSelfEvolutionDiffTraceState('trace-details') === 'previous-only'
                    ? 'text-amber-200'
                    : resolveSelfEvolutionDiffTraceState('trace-details') === 'shared'
                      ? 'text-cyan-200'
                      : highlightedSelfEvolutionTraceSectionIds.has('trace-details')
                        ? 'text-sky-200'
                        : 'text-neutral-400',
              ]"
            >
              {{ formatSelfEvolutionDisplayText('trace-summary') }}: {{ formatMaybeText(selectedCandidateTraceSummary) }}
            </div>
            <div
              :class="[
                'mt-1 text-xs',
                resolveSelfEvolutionDiffTraceState('trace-details') === 'current-only'
                  ? 'text-emerald-200'
                  : resolveSelfEvolutionDiffTraceState('trace-details') === 'previous-only'
                    ? 'text-amber-200'
                    : resolveSelfEvolutionDiffTraceState('trace-details') === 'shared'
                      ? 'text-cyan-200'
                      : highlightedSelfEvolutionTraceSectionIds.has('trace-details')
                        ? 'text-sky-200'
                        : 'text-neutral-400',
              ]"
            >
              {{ formatSelfEvolutionDisplayText('trace-coverage') }}: {{ formatMaybeText(selectedCandidateTraceCoverage) }}
            </div>
            <div
              :class="[
                'mt-3 text-xs',
                resolveSelfEvolutionDiffTraceState('trace-details') === 'current-only'
                  ? 'text-emerald-200'
                  : resolveSelfEvolutionDiffTraceState('trace-details') === 'previous-only'
                    ? 'text-amber-200'
                    : resolveSelfEvolutionDiffTraceState('trace-details') === 'shared'
                      ? 'text-cyan-200'
                      : highlightedSelfEvolutionTraceSectionIds.has('trace-details')
                        ? 'text-sky-200'
                        : 'text-neutral-400',
              ]"
            >
              {{ formatSelfEvolutionDisplayText('trace-event-kinds') }}: {{ formatList(selectedCandidateTraceDetails.eventKinds?.map(value => formatSelfEvolutionTraceListValue('event-kind', value))) }}
            </div>
            <div
              :class="[
                'mt-2 grid gap-1 text-xs',
                resolveSelfEvolutionDiffTraceState('trace-details') === 'current-only'
                  ? 'text-emerald-200'
                  : resolveSelfEvolutionDiffTraceState('trace-details') === 'previous-only'
                    ? 'text-amber-200'
                    : resolveSelfEvolutionDiffTraceState('trace-details') === 'shared'
                      ? 'text-cyan-200'
                      : highlightedSelfEvolutionTraceSectionIds.has('trace-details')
                        ? 'text-sky-200'
                        : 'text-neutral-400',
                'md:grid-cols-2',
              ]"
            >
              <div>{{ formatSelfEvolutionDisplayText('trace-turn-mode') }}: {{ formatSelfEvolutionGovernanceValue('turn-mode', selectedCandidateTraceDetails.governance?.turnMode) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('trace-truth-state') }}: {{ formatSelfEvolutionGovernanceValue('truth-state', selectedCandidateTraceDetails.governance?.truthState) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('trace-repair-state') }}: {{ formatSelfEvolutionGovernanceValue('repair-state', selectedCandidateTraceDetails.governance?.repairState) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('trace-answer-subject') }}: {{ formatSelfEvolutionGovernanceValue('answer-subject', selectedCandidateTraceDetails.governance?.answerSubject) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('trace-screen-reference-mode') }}: {{ formatSelfEvolutionGovernanceValue('screen-reference-mode', selectedCandidateTraceDetails.governance?.screenReferenceMode) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('learning-action') }}: {{ formatSelfEvolutionLearningValue('action', selectedCandidateTraceDetails.learning?.action) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('learning-domain') }}: {{ formatSelfEvolutionLearningValue('domain', selectedCandidateTraceDetails.learning?.domain) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('learning-result') }}: {{ formatMaybeText(selectedCandidateTraceDetails.learning?.resultSummary) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('resolution-surface-policy') }}: {{ formatSelfEvolutionMemoryResolutionValue('surface-policy', selectedCandidateTraceDetails.memoryResolution?.finalSurfacePolicy) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('resolution-closure-state') }}: {{ formatSelfEvolutionMemoryResolutionValue('closure-state', selectedCandidateTraceDetails.memoryResolution?.closureState) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('resolution-suppression-tags') }}: {{ formatList(selectedCandidateTraceDetails.memoryResolution?.suppressionTags?.map(value => formatSelfEvolutionTraceListValue('suppression-tag', value))) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('memory-stage') }}: {{ formatSelfEvolutionGovernanceValue('memory-stage', selectedCandidateTraceDetails.memoryStage?.stage) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('memory-stage-summary') }}: {{ formatMaybeText(selectedCandidateTraceDetails.memoryStage?.summary) }}</div>
              <div>{{ formatSelfEvolutionDisplayText('memory-stage-latency-ms') }}: {{ selectedCandidateTraceDetails.memoryStage?.latencyMs ?? 'n/a' }}</div>
            </div>
            <div
              :class="[
                'mt-2 text-xs',
                resolveSelfEvolutionDiffTraceState('trace-details') === 'current-only'
                  ? 'text-emerald-200'
                  : resolveSelfEvolutionDiffTraceState('trace-details') === 'previous-only'
                    ? 'text-amber-200'
                    : resolveSelfEvolutionDiffTraceState('trace-details') === 'shared'
                      ? 'text-cyan-200'
                      : highlightedSelfEvolutionTraceSectionIds.has('trace-details')
                        ? 'text-sky-200'
                        : 'text-neutral-400',
              ]"
            >
              {{ formatSelfEvolutionDisplayText('resolution-rationale') }}: {{ formatMaybeText(selectedCandidateTraceDetails.memoryResolution?.finalRationale) }}
            </div>
            <div
              :ref="(element) => {
                selfEvolutionRepairScrollTargetElements['self-evolution-trace:trace-timeline'] = element as HTMLElement | null
              }"
              :class="[
                'mt-4 rounded-xl border p-3 transition-colors',
                activeSelfEvolutionRepairSurfaceKey === 'trace:trace-timeline'
                  ? 'ring-2 ring-emerald-400/70'
                  : '',
                activeSelfEvolutionWorkflowFocus?.traceSections.has('trace-timeline')
                  ? 'ring-1 ring-emerald-500/40'
                  : '',
                resolveSelfEvolutionDiffTraceState('trace-timeline') === 'current-only'
                  ? 'border-emerald-500/70 bg-emerald-950/20'
                  : resolveSelfEvolutionDiffTraceState('trace-timeline') === 'previous-only'
                    ? 'border-amber-500/70 bg-amber-950/20'
                    : resolveSelfEvolutionDiffTraceState('trace-timeline') === 'shared'
                      ? 'border-cyan-500/70 bg-cyan-950/20'
                      : highlightedSelfEvolutionTraceSectionIds.has('trace-timeline')
                        ? 'border-sky-500/70 bg-sky-950/30'
                        : 'border-neutral-800/80 bg-neutral-950/30',
              ]"
              @mouseenter="markSelfEvolutionWorkflowTraceSectionViewed('trace-timeline')"
            >
              <div :class="['mb-2 flex items-center justify-between gap-2 text-xs text-neutral-400 uppercase tracking-wide']">
                <span>{{ formatSelfEvolutionDisplayText('trace-timeline') }}</span>
                <span
                  v-if="resolveSelfEvolutionDiffTraceState('trace-timeline')"
                  :class="['text-[10px]']"
                >
                  {{ resolveSelfEvolutionDiffTraceState('trace-timeline') }}
                </span>
              </div>
              <div
                v-if="selectedCandidateTraceEvents.length === 0"
                :class="['text-xs text-neutral-500']"
              >
                {{ formatSelfEvolutionDisplayText('no-drilled-trace-events-yet') }}
              </div>
              <div
                v-for="event in selectedCandidateTraceEvents"
                :key="event.id"
                :ref="(element) => {
                  selfEvolutionRepairScrollTargetElements[`self-evolution-event:${event.kind}`] = element as HTMLElement | null
                }"
                :class="[
                  'mb-2 rounded-lg border border-neutral-800/80 bg-neutral-900/40 p-2 text-xs text-neutral-300',
                  activeSelfEvolutionRepairSurfaceKey === `event:${event.kind}`
                    ? 'ring-2 ring-emerald-400/70'
                    : '',
                  activeSelfEvolutionWorkflowFocus?.eventKinds.has(event.kind)
                    ? 'ring-1 ring-emerald-500/40'
                    : '',
                  selfEvolutionHistoryEventLocalization.timelineStates[event.id] === 'recommended'
                    ? 'border-emerald-500/70 bg-emerald-950/20 text-emerald-100'
                    : selfEvolutionHistoryEventLocalization.timelineStates[event.id] === 'candidate-anchor'
                      ? 'border-cyan-500/70 bg-cyan-950/20 text-cyan-100'
                      : '',
                ]"
              >
                <div :class="['flex items-center justify-between gap-2']">
                  <span>{{ event.kind }}</span>
                  <span
                    v-if="selfEvolutionHistoryEventLocalization.timelineStates[event.id]"
                    :class="['text-[10px] uppercase tracking-wide']"
                  >
                    {{ selfEvolutionHistoryEventLocalization.timelineStates[event.id] }}
                  </span>
                  <span :class="['text-neutral-500']">{{ formatTimestamp(event.createdAt) }}</span>
                </div>
                <div :class="['mt-1 text-neutral-500']">
                  origin={{ event.origin }} | turn={{ formatMaybeText(event.turnId) }} | session={{ formatMaybeText(event.sessionId) }}
                </div>
                <div :class="['mt-1 text-neutral-400']">
                  {{ formatMaybeText(event.summary) }}
                </div>
                <div :class="['mt-2 flex gap-2']">
                  <ButtonBar
                    icon="i-solar:sidebar-code-bold-duotone"
                    :text="formatSelfEvolutionDisplayText('inspect-event')"
                    @click="() => {
                      markSelfEvolutionWorkflowEventKindViewed(event.kind)
                      markSelfEvolutionWorkflowTraceSectionViewed('selected-trace-event')
                      selfEvolutionInspector.selectTraceEvent(event.id)
                    }"
                  >
                    {{ formatSelfEvolutionDisplayText('inspect-short') }}
                  </ButtonBar>
                </div>
              </div>
            </div>
            <div
              :ref="(element) => {
                selfEvolutionRepairScrollTargetElements['self-evolution-trace:selected-trace-event'] = element as HTMLElement | null
              }"
              :class="[
                'mt-4 rounded-xl border p-3 transition-colors',
                activeSelfEvolutionRepairSurfaceKey === 'trace:selected-trace-event'
                  ? 'ring-2 ring-emerald-400/70'
                  : '',
                activeSelfEvolutionWorkflowFocus?.traceSections.has('selected-trace-event')
                  ? 'ring-1 ring-emerald-500/40'
                  : '',
                resolveSelfEvolutionDiffTraceState('selected-trace-event') === 'current-only'
                  ? 'border-emerald-500/70 bg-emerald-950/20'
                  : resolveSelfEvolutionDiffTraceState('selected-trace-event') === 'previous-only'
                    ? 'border-amber-500/70 bg-amber-950/20'
                    : resolveSelfEvolutionDiffTraceState('selected-trace-event') === 'shared'
                      ? 'border-cyan-500/70 bg-cyan-950/20'
                      : highlightedSelfEvolutionTraceSectionIds.has('selected-trace-event')
                        ? 'border-sky-500/70 bg-sky-950/30'
                        : 'border-neutral-800/80 bg-neutral-950/30',
                selfEvolutionHistoryEventLocalization.selectedEventState === 'recommended'
                  ? ' ring-1 ring-emerald-500/40'
                  : '',
              ]"
              @mouseenter="markSelfEvolutionWorkflowTraceSectionViewed('selected-trace-event')"
            >
              <div :class="['mb-2 flex items-center justify-between gap-2 text-xs text-neutral-400 uppercase tracking-wide']">
                <span>{{ formatSelfEvolutionDisplayText('selected-trace-event') }}</span>
                <span
                  v-if="resolveSelfEvolutionDiffTraceState('selected-trace-event')"
                  :class="['text-[10px]']"
                >
                  {{ resolveSelfEvolutionDiffTraceState('selected-trace-event') }}
                </span>
              </div>
              <div :class="['text-xs text-neutral-400']">
                {{ formatSelfEvolutionDisplayText('kind') }}: {{ formatMaybeText(selectedTraceEvent?.kind) }}
              </div>
              <div :class="['mt-1 text-xs text-neutral-400']">
                {{ formatSelfEvolutionDisplayText('summary') }}: {{ formatMaybeText(selectedTraceEvent?.summary) }}
              </div>
              <div
                v-if="selectedTraceEventDetails.length === 0"
                :class="['mt-2 text-xs text-neutral-500']"
              >
                {{ formatSelfEvolutionDisplayText('no-structured-event-details') }}
              </div>
              <div
                v-else
                :class="['mt-2 grid gap-1 text-xs text-neutral-400', 'md:grid-cols-2']"
              >
                <div
                  v-for="detail in selectedTraceEventDetails"
                  :key="`${detail.label}:${detail.value}`"
                >
                  {{ detail.label }}: {{ detail.value }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section :class="['rounded-2xl border border-neutral-700/60', 'bg-neutral-950/40 p-4']">
        <div :class="['mb-2 text-sm text-neutral-400']">
          {{ formatSpeechDisplayText('speech-embodiment') }}
        </div>
        <div :class="['grid gap-1 text-sm text-neutral-100']">
          <div>{{ formatSpeechDisplayText('phase') }}: {{ speechEmbodiment.phase }}</div>
          <div>{{ formatSpeechDisplayText('playback-phase') }}: {{ speechEmbodiment.playbackPhase }}</div>
          <div>{{ formatSpeechDisplayText('speech-energy') }}: {{ formatFloat(speechEmbodiment.speechEnergy) }}</div>
          <div>{{ formatSpeechDisplayText('prosody-intensity') }}: {{ formatFloat(speechEmbodiment.prosodyIntensity) }}</div>
          <div>{{ formatSpeechDisplayText('emphasis-level') }}: {{ formatFloat(speechEmbodiment.emphasisLevel) }}</div>
          <div>{{ formatSpeechDisplayText('cadence-pulse') }}: {{ formatFloat(speechEmbodiment.cadencePulse) }}</div>
          <div>{{ formatSpeechDisplayText('viseme-intensity') }}: {{ formatFloat(speechEmbodiment.visemeIntensity) }}</div>
          <div
            v-for="entry in recentDrivingEventSummaryEntries"
            :key="`recent-driving-event:${entry.key}`"
          >
            {{ entry.label }}: {{ entry.value }}
          </div>
          <div
            v-for="entry in runtimeAuthorityOverview?.summaryEntries ?? []"
            :key="`runtime-authority-overview:${entry.key}`"
          >
            {{ entry.label }}: {{ entry.value }}
          </div>
          <div
            v-for="entry in runtimeAuthorityOverview?.traceSummaryEntries ?? []"
            :key="`runtime-authority-trace:${entry.key}`"
          >
            {{ entry.label }}: {{ entry.value }}
          </div>
          <div>{{ formatSpeechDisplayText('articulation-voice-language') }}: {{ formatMaybeText(speechObservabilityView.articulation?.voiceLanguage ?? null) }}</div>
          <div>{{ formatSpeechDisplayText('articulation-consonant-precision') }}: {{ formatFloat(speechObservabilityView.articulation?.consonantPrecision ?? undefined) }}</div>
          <div>{{ formatSpeechDisplayText('articulation-closure-bias') }}: {{ formatFloat(speechObservabilityView.articulation?.closureBias ?? undefined) }}</div>
          <div>{{ formatSpeechDisplayText('cue-micro-prosody-weight') }}: {{ formatFloat(speechObservabilityView.cueMicro?.prosodyWeight ?? undefined) }}</div>
          <div>{{ formatSpeechDisplayText('cue-micro-mouth-weight') }}: {{ formatFloat(speechObservabilityView.cueMicro?.mouthWeight ?? undefined) }}</div>
          <div>{{ formatSpeechDisplayText('cue-micro-head-weight') }}: {{ formatFloat(speechObservabilityView.cueMicro?.headWeight ?? undefined) }}</div>
          <div>{{ formatSpeechDisplayText('cue-micro-facial-hold-ms') }}: {{ speechObservabilityView.cueMicro?.facialHoldMs ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('cue-micro-action-hold-ms') }}: {{ speechObservabilityView.cueMicro?.actionHoldMs ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('cue-micro-emotion-hold-ms') }}: {{ speechObservabilityView.cueMicro?.emotionHoldMs ?? 'n/a' }}</div>
          <div
            v-for="entry in residentRuntimeTelemetrySummaryEntries"
            :key="`resident-runtime:${entry.key}`"
          >
            {{ entry.label }}: {{ entry.value }}
          </div>
          <div
            v-for="entry in driverExecutionTelemetrySummaryEntries"
            :key="`driver-runtime:${entry.key}`"
          >
            {{ entry.label }}: {{ entry.value }}
          </div>
        </div>
        <div
          v-if="speechObservabilityRows.length > 0"
          :ref="(element) => {
            selfEvolutionRepairScrollTargetElements['self-evolution-speech:observability-summary'] = element as HTMLElement | null
          }"
          :class="['mt-3 rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3 text-xs text-neutral-300']"
        >
          <div :class="['mb-2 text-neutral-400 uppercase tracking-wide']">
            {{ formatSpeechDisplayText('speech-observability-summary') }}
          </div>
          <div
            v-for="(row, index) in speechObservabilityRows"
            :key="`${row.section}:${row.label}:${index}`"
            :class="['mb-1 last:mb-0']"
          >
            <span :class="['text-neutral-500']">{{ formatSpeechObservabilitySectionLabel(row.section) }}</span>
            <span>: </span>
            <span>{{ formatSpeechObservabilityLabel(row.label) }}</span>
            <span> -> </span>
            <span>{{ row.value }}</span>
          </div>
        </div>
        <div
          v-if="speechObservabilityView.articulation"
          :class="['mt-3 rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3 text-xs text-neutral-300']"
        >
          <div :class="['mb-2 text-neutral-400 uppercase tracking-wide']">
            {{ formatSpeechDisplayText('articulation-observability') }}
          </div>
          <div>{{ formatSpeechDisplayText('active') }}: {{ speechObservabilityView.articulation.active }}</div>
          <div>{{ formatSpeechDisplayText('voice') }}: {{ formatMaybeText(speechObservabilityView.articulationSummary?.voice ?? null) }}</div>
          <div>{{ formatSpeechDisplayText('lip-closure') }}: {{ formatFloat(speechObservabilityView.articulation.lipClosure ?? undefined) }}</div>
          <div>{{ formatSpeechDisplayText('lip-round') }}: {{ formatFloat(speechObservabilityView.articulation.lipRound ?? undefined) }}</div>
          <div>{{ formatSpeechDisplayText('lip-spread') }}: {{ formatFloat(speechObservabilityView.articulation.lipSpread ?? undefined) }}</div>
          <div>{{ formatSpeechDisplayText('jaw-open') }}: {{ formatFloat(speechObservabilityView.articulation.jawOpen ?? undefined) }}</div>
          <div>{{ formatSpeechDisplayText('openness') }}: {{ formatFloat(speechObservabilityView.articulation.openness ?? undefined) }}</div>
          <div>{{ formatSpeechDisplayText('top-visemes') }}: {{ formatMaybeText(speechObservabilityView.articulationSummary?.topVisemes ?? null) }}</div>
        </div>
        <div
          v-if="speechObservabilityView.cueMicro"
          :class="['mt-3 rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3 text-xs text-neutral-300']"
        >
          <div :class="['mb-2 text-neutral-400 uppercase tracking-wide']">
            {{ formatSpeechDisplayText('cue-micro-expression') }}
          </div>
          <div>{{ formatSpeechDisplayText('cue-id') }}: {{ formatMaybeText(speechObservabilityView.cueMicro.cueId) }}</div>
          <div>{{ formatSpeechDisplayText('cue-text') }}: {{ formatMaybeText(speechObservabilityView.cueMicro.cueText) }}</div>
          <div>{{ formatSpeechDisplayText('cue') }}: {{ formatMaybeText(speechObservabilityView.cueMicroSummary?.cue ?? null) }}</div>
          <div>{{ formatSpeechDisplayText('persona-style') }}: {{ formatMaybeText(speechObservabilityView.cueMicroSummary?.personaStyle ?? null) }}</div>
          <div>{{ formatSpeechDisplayText('timing') }}: {{ formatMaybeText(speechObservabilityView.cueMicroSummary?.timing ?? null) }}</div>
        </div>
        <div
          v-if="speechObservabilityView.visemeHints.length > 0"
          :class="['mt-3 rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3 text-xs text-neutral-300']"
        >
          <div :class="['mb-2 text-neutral-400 uppercase tracking-wide']">
            {{ formatSpeechDisplayText('viseme-hints') }}
          </div>
          <div>{{ formatSpeechDisplayText('summary') }}: {{ formatMaybeText(speechObservabilityView.visemeHintsSummary) }}</div>
        </div>
        <div
          v-if="speechAuthoritySegmentRows.length > 0"
          :class="['mt-3 rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3 text-xs text-neutral-300']"
        >
          <div :class="['mb-2 text-neutral-400 uppercase tracking-wide']">
            {{ formatSpeechDisplayText('speech-authority-segments') }}
          </div>
          <div
            v-for="segment in speechAuthoritySegmentRows"
            :key="segment.cueId"
            :class="['mb-3 rounded-lg border border-neutral-800/70 bg-neutral-950/30 p-2 last:mb-0']"
          >
            <div>{{ formatMaybeText(segment.cueText) }} ({{ segment.cueId }})</div>
            <div :class="['text-neutral-500']">
              {{ formatSpeechDisplayText('drift') }}={{ formatSpeechAuthorityValue('drift', segment.driftStatus) }} / {{ formatSpeechDisplayText('aligned') }}={{ segment.aligned ?? 'n/a' }}
            </div>
            <div
              v-for="entry in segment.speechSummaryEntries ?? []"
              :key="`segment:${segment.cueId}:${entry.key}`"
              :class="['mt-1']"
            >
              <span :class="['text-neutral-500']">{{ entry.label }}</span>
              <span>: </span>
              <span>{{ entry.value }}</span>
            </div>
          </div>
        </div>
        <div
          v-if="speechAuthorityHotspots.length > 0"
          :ref="(element) => {
            selfEvolutionRepairScrollTargetElements['self-evolution-authority:speech-hotspots'] = element as HTMLElement | null
          }"
          :class="['mt-3 rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3 text-xs text-neutral-300']"
        >
          <div :class="['mb-2 text-neutral-400 uppercase tracking-wide']">
            {{ formatSpeechDisplayText('speech-authority-hotspots') }}
          </div>
          <div
            v-if="activeSelfEvolutionRepairSurfaceKey?.startsWith('authority:renderer-rejoin')"
            :class="['mb-2 rounded-md border border-emerald-700/40 bg-emerald-950/20 p-2 text-emerald-100/90']"
          >
            {{ formatSelfEvolutionDisplayText('body-continuity') }}:
            {{ formatSelfEvolutionDisplayText('body-carried-to-renderer-rejoin') }}
            ({{ formatRendererRejoinSurfaceLabel(activeSelfEvolutionRepairRendererRejoinSurfaceKey) }})
          </div>
          <div
            v-if="topSpeechAuthorityHotspots.length > 0"
            :class="['mb-3 rounded-lg border border-amber-700/40 bg-amber-950/20 p-2']"
          >
            <div :class="['mb-1 text-[11px] uppercase tracking-wide text-amber-300/80']">
              {{ formatSpeechDisplayText('top-hotspots') }}
            </div>
            <div
              v-for="hotspot in topSpeechAuthorityHotspots"
              :key="`top-hotspot:${hotspot.cueId}`"
              :class="['mb-2 last:mb-0 text-[11px] text-amber-100/90']"
            >
              <div>{{ formatMaybeText(hotspot.cueText) }} ({{ hotspot.cueId }})</div>
              <div :class="['text-amber-200/70']">
                {{ formatSpeechDisplayText('severity') }}={{ hotspot.severityScore }} / {{ formatSpeechDisplayText('drift') }}={{ formatSpeechAuthorityValue('drift', hotspot.driftStatus) }} / {{ formatSpeechDisplayText('lanes') }}={{ hotspot.authorityDriftLanes.map(lane => formatSpeechAuthorityValue('lane', lane)).join(', ') || 'n/a' }}
              </div>
              <div
                v-if="hotspot.rendererDriftSummary"
                :class="['mt-1 text-amber-100/85']"
              >
                {{ formatSpeechDisplayText('renderer') }}={{ hotspot.rendererDriftSummary }}
              </div>
            </div>
          </div>
          <div
            v-for="hotspot in speechAuthorityHotspots"
            :key="`hotspot:${hotspot.cueId}`"
            :class="['mb-3 rounded-lg border border-neutral-800/70 bg-neutral-950/30 p-2 last:mb-0']"
          >
            <div>{{ formatMaybeText(hotspot.cueText) }} ({{ hotspot.cueId }})</div>
            <div :class="['text-neutral-500']">
              {{ formatSpeechDisplayText('severity') }}={{ hotspot.severityScore }} / {{ formatSpeechDisplayText('drift') }}={{ formatSpeechAuthorityValue('drift', hotspot.driftStatus) }} / {{ formatSpeechDisplayText('aligned') }}={{ hotspot.aligned ?? 'n/a' }} / {{ formatSpeechDisplayText('lanes') }}={{ hotspot.authorityDriftLanes.map(lane => formatSpeechAuthorityValue('lane', lane)).join(', ') || 'n/a' }}
            </div>
            <div :class="['mt-1 text-neutral-500']">
              {{ formatSpeechDisplayText('surfaces') }}={{ hotspot.surfaces.split(', ').map(surface => formatSpeechAuthorityValue('surface', surface)).join(', ') }} / {{ formatSpeechDisplayText('all-lanes') }}={{ hotspot.lanes.split(', ').map(lane => formatSpeechAuthorityValue('lane', lane)).join(', ') }} / {{ formatSpeechDisplayText('evidence') }}={{ hotspot.evidenceKinds.join(', ') || 'n/a' }}
            </div>
            <div
              v-if="hotspot.rendererDriftSummary"
              :class="['mt-1 text-neutral-400']"
            >
              {{ formatSpeechDisplayText('renderer') }}: {{ hotspot.rendererDriftSummary }}
            </div>
            <div
              v-for="entry in hotspot.speechSummaryEntries ?? []"
              :key="`hotspot:${hotspot.cueId}:${entry.key}`"
              :class="['mt-1']"
            >
              <span :class="['text-neutral-500']">{{ entry.label }}</span>
              <span>: </span>
              <span>{{ entry.value }}</span>
            </div>
            <div
              v-if="hotspot.settleDriftSummary.length > 0"
              :class="['mt-1']"
            >
              <span :class="['text-neutral-500']">{{ formatSpeechDisplayText('settle') }}</span>
              <span>: </span>
              <span>{{ hotspot.settleDriftSummary.join(' | ') }}</span>
            </div>
            <div
              v-if="hotspot.traceSummary"
              :class="['mt-1 border-t border-neutral-800/60 pt-1 text-neutral-400']"
            >
              <div
                v-for="entry in hotspot.traceSummaryEntries ?? []"
                :key="`hotspot-trace:${hotspot.cueId}:${entry.key}`"
              >
                {{ entry.label }}: {{ entry.value }}
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="playbackCueAuthorityView"
          :class="['mt-3 rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3 text-xs text-neutral-300']"
        >
          <div :class="['mb-2 text-neutral-400 uppercase tracking-wide']">
            {{ formatSpeechDisplayText('playback-cue-authority') }}
          </div>
          <div
            v-for="entry in playbackCueAuthorityView.summaryEntries ?? []"
            :key="`playback-cue:${entry.key}`"
          >
            {{ entry.label }}: {{ entry.value }}
          </div>
        </div>
        <div
          v-if="speechEmbodiment.recentDrivingTraceRecord"
          :class="['mt-3 rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3 text-xs text-neutral-300']"
        >
          <div :class="['mb-2 text-neutral-400 uppercase tracking-wide']">
            {{ formatSpeechDisplayText('recent-driving-trace-record') }}
          </div>
          <div
            v-for="entry in recentDrivingTraceRecordSummaryEntries"
            :key="`recent-driving-trace-record:${entry.key}`"
          >
            {{ entry.label }}: {{ entry.value }}
          </div>
        </div>
        <div
          v-if="recentDrivingTraceEventEntries.length > 0"
          :class="['mt-3 rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3 text-xs text-neutral-300']"
        >
          <div :class="['mb-2 text-neutral-400 uppercase tracking-wide']">
            {{ formatSpeechDisplayText('recent-driving-trace') }}
          </div>
          <div
            v-for="(event, index) in recentDrivingTraceEventEntries"
            :key="`${event.heading}:${index}`"
            :class="['mb-2 last:mb-0']"
          >
            <div>{{ formatRecentDrivingTraceHeading(event.heading) }}</div>
            <div :class="['text-neutral-400']">
              {{ event.body }}
            </div>
          </div>
        </div>
        <div
          v-if="recentDrivingTraceDetailEntries.length > 0"
          :class="['mt-3 rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3 text-xs text-neutral-300']"
        >
          <div :class="['mb-2 text-neutral-400 uppercase tracking-wide']">
            {{ formatSpeechDisplayText('recent-driving-trace-details') }}
          </div>
          <div
            v-for="(event, index) in recentDrivingTraceDetailEntries"
            :key="`detail:${event.heading}:${index}`"
            :class="['mb-3 last:mb-0']"
          >
            <div>{{ formatRecentDrivingTraceHeading(event.heading) }}</div>
            <div :class="['text-neutral-400']">
              {{ event.body }}
            </div>
            <div
              v-if="event.details.length > 0"
              :class="['mt-1 grid gap-1 text-neutral-500 md:grid-cols-2']"
            >
              <div
                v-for="detail in event.details"
                :key="detail"
              >
                {{ formatRecentDrivingTraceDetailLine(detail) }}
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="live2dAuthorityComparisonView"
          :ref="(element) => {
            selfEvolutionRepairScrollTargetElements['self-evolution-authority:live2d-comparison'] = element as HTMLElement | null
          }"
          :class="['mt-3 rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3 text-xs text-neutral-300']"
        >
          <div :class="['mb-2 text-neutral-400 uppercase tracking-wide']">
            {{ formatSpeechDisplayText('live2d-authority-comparison') }}
          </div>
          <div>{{ formatSpeechDisplayText('cue-id') }}: {{ live2dAuthorityComparisonView.cueId }}</div>
          <div>{{ formatSpeechDisplayText('same-her-execution-summary') }}: {{ formatMaybeText(live2dAuthorityComparisonView.sameHerExecutionSummary) }}</div>
          <div>{{ formatSpeechDisplayText('same-her-execution-aligned') }}: {{ live2dAuthorityComparisonView.sameHerExecutionAligned ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('same-her-execution-mismatch-drivers') }}: {{ formatList(live2dAuthorityComparisonView.sameHerExecutionMismatchDrivers ?? []) }}</div>
          <div>{{ formatSpeechDisplayText('planned-expression-aliases') }}: {{ formatList(live2dAuthorityComparisonView.plannedExpressionAliases) }}</div>
          <div>{{ formatSpeechDisplayText('consumed-expression-name') }}: {{ formatMaybeText(live2dAuthorityComparisonView.consumedExpressionName) }}</div>
          <div>{{ formatSpeechDisplayText('expression-aligned') }}: {{ live2dAuthorityComparisonView.expressionAligned ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('planned-face-cue') }}: {{ formatMaybeText(live2dAuthorityComparisonView.plannedFaceCue) }}</div>
          <div>{{ formatSpeechDisplayText('consumed-face-cue') }}: {{ formatMaybeText(live2dAuthorityComparisonView.consumedFaceCue) }}</div>
          <div>{{ formatSpeechDisplayText('face-source') }}: {{ formatSpeechAuthorityValue('source', formatMaybeText(live2dAuthorityComparisonView.faceSource)) }}</div>
          <div>{{ formatSpeechDisplayText('face-segment-aligned') }}: {{ live2dAuthorityComparisonView.faceSegmentAligned ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('planned-motion-aliases') }}: {{ formatList(live2dAuthorityComparisonView.plannedMotionAliases) }}</div>
          <div>{{ formatSpeechDisplayText('consumed-motion-group') }}: {{ formatMaybeText(live2dAuthorityComparisonView.consumedMotionGroup) }}</div>
          <div>{{ formatSpeechDisplayText('motion-aligned') }}: {{ live2dAuthorityComparisonView.motionAligned ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('planned-motion-cue') }}: {{ formatMaybeText(live2dAuthorityComparisonView.plannedMotionCue) }}</div>
          <div>{{ formatSpeechDisplayText('consumed-motion-cue') }}: {{ formatMaybeText(live2dAuthorityComparisonView.consumedMotionCue) }}</div>
          <div>{{ formatSpeechDisplayText('motion-source') }}: {{ formatSpeechAuthorityValue('source', formatMaybeText(live2dAuthorityComparisonView.motionSource)) }}</div>
          <div>{{ formatSpeechDisplayText('motion-segment-aligned') }}: {{ live2dAuthorityComparisonView.motionSegmentAligned ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('consumed-lipsync-cue') }}: {{ formatMaybeText(live2dAuthorityComparisonView.consumedLipsyncCue) }}</div>
          <div>{{ formatSpeechDisplayText('lipsync-source') }}: {{ formatSpeechAuthorityValue('source', formatMaybeText(live2dAuthorityComparisonView.lipsyncSource)) }}</div>
          <div>{{ formatSpeechDisplayText('lipsync-segment-aligned') }}: {{ live2dAuthorityComparisonView.lipsyncSegmentAligned ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('consumed-voice-summary') }}: {{ formatMaybeText(live2dAuthorityComparisonView.consumedVoiceSummary) }}</div>
          <div>{{ formatSpeechDisplayText('voice-source') }}: {{ formatSpeechAuthorityValue('source', formatMaybeText(live2dAuthorityComparisonView.voiceSource)) }}</div>
          <div>{{ formatSpeechDisplayText('voice-segment-aligned') }}: {{ live2dAuthorityComparisonView.voiceSegmentAligned ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('planned-live2d-facial-release-ms') }}: {{ live2dAuthorityComparisonView.plannedLive2dFacialReleaseMs ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('consumed-live2d-facial-release-ms') }}: {{ live2dAuthorityComparisonView.consumedLive2dFacialReleaseMs ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('facial-release-aligned') }}: {{ live2dAuthorityComparisonView.facialReleaseAligned ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('planned-live2d-motion-follow-through-ms') }}: {{ live2dAuthorityComparisonView.plannedLive2dMotionFollowThroughMs ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('consumed-live2d-motion-follow-through-ms') }}: {{ live2dAuthorityComparisonView.consumedLive2dMotionFollowThroughMs ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('motion-follow-through-aligned') }}: {{ live2dAuthorityComparisonView.motionFollowThroughAligned ?? 'n/a' }}</div>
        </div>
        <div
          v-if="vrmAuthorityComparisonView"
          :ref="(element) => {
            selfEvolutionRepairScrollTargetElements['self-evolution-authority:vrm-comparison'] = element as HTMLElement | null
          }"
          :class="['mt-3 rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3 text-xs text-neutral-300']"
        >
          <div :class="['mb-2 text-neutral-400 uppercase tracking-wide']">
            {{ formatSpeechDisplayText('vrm-authority-comparison') }}
          </div>
          <div>{{ formatSpeechDisplayText('cue-id') }}: {{ vrmAuthorityComparisonView.cueId }}</div>
          <div>{{ formatSpeechDisplayText('same-her-frame-summary') }}: {{ formatMaybeText(vrmAuthorityComparisonView.sameHerFrameSummary) }}</div>
          <div>{{ formatSpeechDisplayText('same-her-frame-aligned') }}: {{ vrmAuthorityComparisonView.sameHerFrameAligned ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('same-her-frame-mismatch-drivers') }}: {{ formatList(vrmAuthorityComparisonView.sameHerFrameMismatchDrivers ?? []) }}</div>
          <div>{{ formatSpeechDisplayText('planned-expression-aliases') }}: {{ formatList(vrmAuthorityComparisonView.plannedExpressionAliases) }}</div>
          <div>{{ formatSpeechDisplayText('consumed-expression-aliases') }}: {{ formatList(vrmAuthorityComparisonView.consumedExpressionAliases) }}</div>
          <div>{{ formatSpeechDisplayText('expression-aligned') }}: {{ vrmAuthorityComparisonView.expressionAligned ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('planned-face-cue') }}: {{ formatMaybeText(vrmAuthorityComparisonView.plannedFaceCue) }}</div>
          <div>{{ formatSpeechDisplayText('consumed-face-cue') }}: {{ formatMaybeText(vrmAuthorityComparisonView.consumedFaceCue) }}</div>
          <div>{{ formatSpeechDisplayText('face-source') }}: {{ formatSpeechAuthorityValue('source', formatMaybeText(vrmAuthorityComparisonView.faceSource)) }}</div>
          <div>{{ formatSpeechDisplayText('face-segment-aligned') }}: {{ vrmAuthorityComparisonView.faceSegmentAligned ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('planned-motion-aliases') }}: {{ formatList(vrmAuthorityComparisonView.plannedMotionAliases) }}</div>
          <div>{{ formatSpeechDisplayText('consumed-motion-aliases') }}: {{ formatList(vrmAuthorityComparisonView.consumedMotionAliases) }}</div>
          <div>{{ formatSpeechDisplayText('motion-aligned') }}: {{ vrmAuthorityComparisonView.motionAligned ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('planned-action-cue') }}: {{ formatMaybeText(vrmAuthorityComparisonView.plannedActionCue) }}</div>
          <div>{{ formatSpeechDisplayText('consumed-action-cue') }}: {{ formatMaybeText(vrmAuthorityComparisonView.consumedActionCue) }}</div>
          <div>{{ formatSpeechDisplayText('motion-source') }}: {{ formatSpeechAuthorityValue('source', formatMaybeText(vrmAuthorityComparisonView.motionSource)) }}</div>
          <div>{{ formatSpeechDisplayText('motion-segment-aligned') }}: {{ vrmAuthorityComparisonView.motionSegmentAligned ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('consumed-lipsync-cue') }}: {{ formatMaybeText(vrmAuthorityComparisonView.consumedLipsyncCue) }}</div>
          <div>{{ formatSpeechDisplayText('lipsync-source') }}: {{ formatSpeechAuthorityValue('source', formatMaybeText(vrmAuthorityComparisonView.lipsyncSource)) }}</div>
          <div>{{ formatSpeechDisplayText('lipsync-segment-aligned') }}: {{ vrmAuthorityComparisonView.lipsyncSegmentAligned ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('consumed-voice-summary') }}: {{ formatMaybeText(vrmAuthorityComparisonView.consumedVoiceSummary) }}</div>
          <div>{{ formatSpeechDisplayText('voice-source') }}: {{ formatSpeechAuthorityValue('source', formatMaybeText(vrmAuthorityComparisonView.voiceSource)) }}</div>
          <div>{{ formatSpeechDisplayText('voice-segment-aligned') }}: {{ vrmAuthorityComparisonView.voiceSegmentAligned ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('planned-vrm-action-fade-ms') }}: {{ vrmAuthorityComparisonView.plannedVrmActionFadeMs ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('consumed-vrm-action-fade-ms') }}: {{ vrmAuthorityComparisonView.consumedVrmActionFadeMs ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('vrm-action-fade-aligned') }}: {{ vrmAuthorityComparisonView.vrmActionFadeAligned ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('planned-vrm-expression-blend-ms') }}: {{ vrmAuthorityComparisonView.plannedVrmExpressionBlendMs ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('consumed-vrm-expression-blend-ms') }}: {{ vrmAuthorityComparisonView.consumedVrmExpressionBlendMs ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('vrm-expression-blend-aligned') }}: {{ vrmAuthorityComparisonView.vrmExpressionBlendAligned ?? 'n/a' }}</div>
        </div>
        <div
          v-if="authorityTableRows.length > 0"
          :class="['mt-3 rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-3 text-xs text-neutral-300']"
        >
          <div :class="['mb-2 text-neutral-400 uppercase tracking-wide']">
            {{ formatSpeechDisplayText('authority-summary') }}
          </div>
          <div :class="['grid gap-1']">
            <div :class="['grid grid-cols-[minmax(10rem,14rem)_5rem_5rem_7rem_6rem_7rem_7rem_8rem_8rem_8rem_8rem_8rem_minmax(16rem,22rem)] gap-2 border-b border-neutral-800/70 pb-1 text-[11px] text-neutral-500']">
              <div>{{ formatSpeechDisplayText('cue') }}</div>
              <div>{{ formatSpeechDisplayText('surface') }}</div>
              <div>{{ formatSpeechDisplayText('lane') }}</div>
              <div>{{ formatSpeechDisplayText('drift') }}</div>
              <div>{{ formatSpeechDisplayText('aligned') }}</div>
              <div>{{ formatSpeechDisplayText('source') }}</div>
              <div>{{ formatSpeechDisplayText('confidence') }}</div>
              <div>{{ formatSpeechDisplayText('planned') }}</div>
              <div>{{ formatSpeechDisplayText('consumed') }}</div>
              <div>{{ formatSpeechDisplayText('live2d-release') }}</div>
              <div>{{ formatSpeechDisplayText('live2d-follow') }}</div>
              <div>{{ formatSpeechDisplayText('vrm-action-fade') }}</div>
              <div>{{ formatSpeechDisplayText('vrm-expression-blend') }}</div>
              <div>{{ formatSpeechDisplayText('speech') }}</div>
            </div>
            <div
              v-for="row in authorityTableRows"
              :key="`${row.cueId}:${row.surface}:${row.lane}`"
              :class="['grid grid-cols-[minmax(10rem,14rem)_5rem_5rem_7rem_6rem_7rem_7rem_8rem_8rem_8rem_8rem_8rem_minmax(16rem,22rem)] gap-2 rounded border border-neutral-800/50 bg-neutral-950/20 p-2']"
            >
              <div>
                <div>{{ row.cueText ?? row.cueId }}</div>
                <div :class="['text-neutral-500']">
                  {{ row.cueId }}
                </div>
              </div>
              <div>{{ formatSpeechAuthorityValue('surface', row.surface) }}</div>
              <div>{{ formatSpeechAuthorityValue('lane', row.lane) }}</div>
              <div>{{ formatSpeechAuthorityValue('drift', row.driftStatus) }}</div>
              <div>{{ row.aligned ?? 'n/a' }}</div>
              <div>{{ formatSpeechAuthorityValue('source', row.source) }}</div>
              <div>{{ row.confidence }}</div>
              <div>{{ row.planned }}</div>
              <div>{{ row.consumed }}</div>
              <div>{{ row.settleLive2dFacialReleaseMs }}</div>
              <div>{{ row.settleLive2dMotionFollowThroughMs }}</div>
              <div>{{ row.settleVrmActionFadeMs }}</div>
              <div>{{ row.settleVrmExpressionBlendMs }}</div>
              <div :class="['text-[11px] leading-4 text-neutral-400']">
                <div
                  v-for="(line, index) in row.speechSummaryLines"
                  :key="`${row.cueId}:${row.surface}:${row.lane}:speech:${index}`"
                >
                  {{ line }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section :class="['rounded-2xl border border-neutral-700/60', 'bg-neutral-950/40 p-4']">
        <div :class="['mb-2 text-sm text-neutral-400']">
          {{ formatSpeechDisplayText('window-lifecycle') }}
        </div>
        <div :class="['grid gap-1 text-sm text-neutral-100']">
          <div>{{ formatSpeechDisplayText('visible') }}: {{ windowLifecycle.visible }}</div>
          <div>{{ formatSpeechDisplayText('minimized') }}: {{ windowLifecycle.minimized }}</div>
          <div>{{ formatSpeechDisplayText('focused') }}: {{ windowLifecycle.focused }}</div>
          <div>{{ formatSpeechDisplayText('reason') }}: {{ windowLifecycle.reason }}</div>
          <div>{{ formatSpeechDisplayText('updated-at') }}: {{ windowLifecycle.updatedAt }}</div>
          <div>{{ formatSpeechDisplayText('stage-paused') }}: {{ stagePaused }}</div>
        </div>
      </section>

      <section :class="['rounded-2xl border border-neutral-700/60', 'bg-neutral-950/40 p-4']">
        <div :class="['mb-2 text-sm text-neutral-400']">
          {{ formatSpeechDisplayText('three-render') }}
        </div>
        <div :class="['grid gap-1 text-sm text-neutral-100']">
          <div>{{ formatSpeechDisplayText('render-count') }}: {{ threeRender.renderCount }}</div>
          <div>{{ formatSpeechDisplayText('draw-calls') }}: {{ threeRender.drawCalls }}</div>
          <div>{{ formatSpeechDisplayText('triangles') }}: {{ threeRender.triangles }}</div>
          <div>{{ formatSpeechDisplayText('points') }}: {{ threeRender.points }}</div>
          <div>{{ formatSpeechDisplayText('lines') }}: {{ threeRender.lines }}</div>
          <div>{{ formatSpeechDisplayText('textures') }}: {{ threeRender.textures }}</div>
          <div>{{ formatSpeechDisplayText('geometries') }}: {{ threeRender.geometries }}</div>
          <div>{{ formatSpeechDisplayText('last-timestamp-ms') }}: {{ threeRender.lastTimestampMs.toFixed(2) }}</div>
        </div>
      </section>

      <section :class="['rounded-2xl border border-neutral-700/60', 'bg-neutral-950/40 p-4']">
        <div :class="['mb-2 text-sm text-neutral-400']">
          {{ formatSpeechDisplayText('vrm-update-frame') }}
        </div>
        <div :class="['grid gap-1 text-sm text-neutral-100']">
          <div>{{ formatSpeechDisplayText('same-her-frame-summary') }}: {{ vrmUpdate.sameHerFrameSummary ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('last-consumed-expression-aliases') }}: {{ formatList(vrmUpdate.lastConsumedExpressionAliases) }}</div>
          <div>{{ formatSpeechDisplayText('last-consumed-motion-aliases') }}: {{ formatList(vrmUpdate.lastConsumedMotionAliases) }}</div>
          <div>{{ formatSpeechDisplayText('last-consumed-vrm-action-fade-ms') }}: {{ vrmUpdate.lastConsumedVrmActionFadeMs ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('last-consumed-vrm-expression-blend-ms') }}: {{ vrmUpdate.lastConsumedVrmExpressionBlendMs ?? 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('frame-count') }}: {{ vrmUpdate.frameCount }}</div>
          <div>{{ formatSpeechDisplayText('total-ms') }}: {{ vrmUpdate.totalMs.toFixed(3) }}</div>
          <div>{{ formatSpeechDisplayText('delta-ms') }}: {{ vrmUpdate.deltaMs.toFixed(3) }}</div>
          <div>{{ formatSpeechDisplayText('animation-mixer-ms') }}: {{ vrmUpdate.animationMixerMs.toFixed(3) }}</div>
          <div>{{ formatSpeechDisplayText('humanoid-ms') }}: {{ vrmUpdate.humanoidMs.toFixed(3) }}</div>
          <div>{{ formatSpeechDisplayText('look-at-ms') }}: {{ vrmUpdate.lookAtMs.toFixed(3) }}</div>
          <div>{{ formatSpeechDisplayText('blink-and-saccade-ms') }}: {{ vrmUpdate.blinkAndSaccadeMs.toFixed(3) }}</div>
          <div>{{ formatSpeechDisplayText('emote-ms') }}: {{ vrmUpdate.emoteMs.toFixed(3) }}</div>
          <div>{{ formatSpeechDisplayText('lip-sync-ms') }}: {{ vrmUpdate.lipSyncMs.toFixed(3) }}</div>
          <div>{{ formatSpeechDisplayText('expression-ms') }}: {{ vrmUpdate.expressionMs.toFixed(3) }}</div>
          <div>{{ formatSpeechDisplayText('spring-bone-ms') }}: {{ vrmUpdate.springBoneMs.toFixed(3) }}</div>
          <div>{{ formatSpeechDisplayText('vrm-frame-hook-ms') }}: {{ vrmUpdate.vrmFrameHookMs.toFixed(3) }}</div>
        </div>
      </section>

      <section :class="['rounded-2xl border border-neutral-700/60', 'bg-neutral-950/40 p-4']">
        <div :class="['mb-2 text-sm text-neutral-400']">
          {{ formatSpeechDisplayText('fade-on-hover-hit-test') }}
        </div>
        <div :class="['grid gap-1 text-sm text-neutral-100']">
          <div>{{ formatSpeechDisplayText('read-count') }}: {{ hitTest.readCount }}</div>
          <div>{{ formatSpeechDisplayText('last-duration-ms') }}: {{ hitTest.lastDurationMs.toFixed(3) }}</div>
          <div>{{ formatSpeechDisplayText('total-duration-ms') }}: {{ hitTest.totalDurationMs.toFixed(3) }}</div>
          <div>{{ formatSpeechDisplayText('last-read-width') }}: {{ hitTest.lastReadWidth }}</div>
          <div>{{ formatSpeechDisplayText('last-read-height') }}: {{ hitTest.lastReadHeight }}</div>
          <div>{{ formatSpeechDisplayText('last-timestamp-ms') }}: {{ hitTest.lastTimestampMs.toFixed(2) }}</div>
        </div>
      </section>

      <section :class="['rounded-2xl border border-neutral-700/60', 'bg-neutral-950/40 p-4']">
        <div :class="['mb-2 text-sm text-neutral-400']">
          {{ formatSpeechDisplayText('vrm-lifecycle') }}
        </div>
        <div :class="['grid gap-1 text-sm text-neutral-100']">
          <div>{{ formatSpeechDisplayText('last-model-src') }}: {{ vrmLifecycle.lastModelSrc || 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('last-reason') }}: {{ vrmLifecycle.lastReason || 'n/a' }}</div>
          <div>{{ formatSpeechDisplayText('last-load-start-at') }}: {{ vrmLifecycle.lastLoadStartAt.toFixed(2) }}</div>
          <div>{{ formatSpeechDisplayText('last-load-end-at') }}: {{ vrmLifecycle.lastLoadEndAt.toFixed(2) }}</div>
          <div>{{ formatSpeechDisplayText('last-load-duration-ms') }}: {{ vrmLifecycle.lastLoadDurationMs.toFixed(3) }}</div>
          <div>{{ formatSpeechDisplayText('last-dispose-start-at') }}: {{ vrmLifecycle.lastDisposeStartAt.toFixed(2) }}</div>
          <div>{{ formatSpeechDisplayText('last-dispose-end-at') }}: {{ vrmLifecycle.lastDisposeEndAt.toFixed(2) }}</div>
          <div>{{ formatSpeechDisplayText('last-dispose-duration-ms') }}: {{ vrmLifecycle.lastDisposeDurationMs.toFixed(3) }}</div>
          <div>{{ formatSpeechDisplayText('last-error-message') }}: {{ vrmLifecycle.lastErrorMessage || 'n/a' }}</div>
        </div>
      </section>

      <section :class="['rounded-2xl border border-neutral-700/60', 'bg-neutral-950/40 p-4', 'md:col-span-2']">
        <div :class="['mb-2 text-sm text-neutral-400']">
          {{ formatSpeechDisplayText('renderer-resource-snapshots') }}
        </div>
        <div :class="['grid gap-3 text-sm text-neutral-100', 'md:grid-cols-3']">
          <div>
            <div :class="['mb-1 text-xs text-neutral-400 uppercase tracking-wide']">
              {{ formatSpeechDisplayText('after-load') }}
            </div>
            <div>{{ formatSpeechDisplayText('ts') }}: {{ formatFloat(resourceSnapshots.lastAfterLoad?.ts) }}</div>
            <div>{{ formatSpeechDisplayText('textures') }}: {{ formatCount(resourceSnapshots.lastAfterLoad?.rendererMemory?.textures) }}</div>
            <div>{{ formatSpeechDisplayText('geometries') }}: {{ formatCount(resourceSnapshots.lastAfterLoad?.rendererMemory?.geometries) }}</div>
            <div>{{ formatSpeechDisplayText('calls') }}: {{ formatCount(resourceSnapshots.lastAfterLoad?.rendererMemory?.calls) }}</div>
            <div>{{ formatSpeechDisplayText('mesh-count') }}: {{ formatCount(resourceSnapshots.lastAfterLoad?.sceneSummary?.meshCount) }}</div>
            <div>{{ formatSpeechDisplayText('material-count') }}: {{ formatCount(resourceSnapshots.lastAfterLoad?.sceneSummary?.materialCount) }}</div>
          </div>
          <div>
            <div :class="['mb-1 text-xs text-neutral-400 uppercase tracking-wide']">
              {{ formatSpeechDisplayText('before-dispose') }}
            </div>
            <div>{{ formatSpeechDisplayText('ts') }}: {{ formatFloat(resourceSnapshots.lastBeforeDispose?.ts) }}</div>
            <div>{{ formatSpeechDisplayText('textures') }}: {{ formatCount(resourceSnapshots.lastBeforeDispose?.rendererMemory?.textures) }}</div>
            <div>{{ formatSpeechDisplayText('geometries') }}: {{ formatCount(resourceSnapshots.lastBeforeDispose?.rendererMemory?.geometries) }}</div>
            <div>{{ formatSpeechDisplayText('calls') }}: {{ formatCount(resourceSnapshots.lastBeforeDispose?.rendererMemory?.calls) }}</div>
            <div>{{ formatSpeechDisplayText('mesh-count') }}: {{ formatCount(resourceSnapshots.lastBeforeDispose?.sceneSummary?.meshCount) }}</div>
            <div>{{ formatSpeechDisplayText('material-count') }}: {{ formatCount(resourceSnapshots.lastBeforeDispose?.sceneSummary?.materialCount) }}</div>
          </div>
          <div>
            <div :class="['mb-1 text-xs text-neutral-400 uppercase tracking-wide']">
              {{ formatSpeechDisplayText('after-dispose') }}
            </div>
            <div>{{ formatSpeechDisplayText('ts') }}: {{ formatFloat(resourceSnapshots.lastAfterDispose?.ts) }}</div>
            <div>{{ formatSpeechDisplayText('textures') }}: {{ formatCount(resourceSnapshots.lastAfterDispose?.rendererMemory?.textures) }}</div>
            <div>{{ formatSpeechDisplayText('geometries') }}: {{ formatCount(resourceSnapshots.lastAfterDispose?.rendererMemory?.geometries) }}</div>
            <div>{{ formatSpeechDisplayText('calls') }}: {{ formatCount(resourceSnapshots.lastAfterDispose?.rendererMemory?.calls) }}</div>
            <div>{{ formatSpeechDisplayText('mesh-count') }}: {{ formatCount(resourceSnapshots.lastAfterDispose?.sceneSummary?.meshCount) }}</div>
            <div>{{ formatSpeechDisplayText('material-count') }}: {{ formatCount(resourceSnapshots.lastAfterDispose?.sceneSummary?.materialCount) }}</div>
          </div>
        </div>

        <div :class="['mt-3 text-xs text-neutral-400']">
          {{ formatSpeechDisplayText('history-entries') }}: {{ resourceSnapshots.history.length }}
        </div>
      </section>
    </div>

    <div :class="['text-sm text-neutral-400']">
      {{ t('tamagotchi.settings.devtools.pages.performance-visualizer.description') }}
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: tamagotchi.settings.devtools.pages.performance-visualizer.title
  subtitleKey: tamagotchi.settings.devtools.title
</route>
