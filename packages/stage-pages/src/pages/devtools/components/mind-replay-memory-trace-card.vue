<script setup lang="ts">
import type { AlicizationMemoryDecisionTraceRecord } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface DisplayRow {
  label: string
  value: string
}

const props = defineProps<{
  trace: AlicizationMemoryDecisionTraceRecord
  index: number
}>()

const { t, te } = useI18n()

const i18nPageKey = 'settings.pages.system.sections.section.developer.sections.section.mind-replay.page.trace_lab'

function tTrace(path: string, fallback: string, params?: Record<string, unknown>) {
  const key = `${i18nPageKey}.${path}`
  if (!te(key))
    return fallback
  return String(t(key, params ?? {}))
}

function asRecord(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function asObjectArray(raw: unknown) {
  if (!Array.isArray(raw))
    return [] as Record<string, unknown>[]
  return raw
    .map(item => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
}

function asString(raw: unknown, maxChars = 240) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function asBooleanText(raw: unknown) {
  if (typeof raw !== 'boolean')
    return ''
  return raw ? 'true' : 'false'
}

function asNumberText(raw: unknown, digits = 2) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return ''
  return value.toFixed(digits)
}

function asStringList(raw: unknown, maxItems = 8, maxChars = 200) {
  if (!Array.isArray(raw))
    return [] as string[]
  return raw
    .map(item => asString(item, maxChars))
    .filter(Boolean)
    .slice(0, maxItems)
}

function compactRows(rows: DisplayRow[]) {
  return rows.filter(row => row.value.trim().length > 0)
}

function formatTimestamp(timestamp: number | null | undefined) {
  if (!Number.isFinite(timestamp))
    return tTrace('summary.not_available', 'n/a')
  return new Date(Number(timestamp)).toLocaleString()
}

function jsonText(raw: unknown) {
  return JSON.stringify(raw ?? {}, null, 2)
}

const governance = computed(() => props.trace.governance ?? null)
const recallAttribution = computed(() => asRecord(props.trace.recallAttribution))
const replyMemoryCoherence = computed(() => asRecord(props.trace.replyMemoryCoherence))
const persistenceWritten = computed(() => asRecord(props.trace.persistenceWritten))
const dialogueEmitted = computed(() => asRecord(props.trace.dialogueEmitted))
const takeoverAudit = computed(() => asRecord(props.trace.takeoverAudit))
const digitalLifeSpine = computed(() => governance.value?.digitalLifeSpine ?? null)
const derivedMindStateBundle = computed(() => asRecord((props.trace as any).derivedMindStateBundle))
const memoryStageReplay = computed(() => asRecord((props.trace as any).memoryStageReplay))
const memoryStageReplayStages = computed(() => asObjectArray(memoryStageReplay.value?.stages))
const memoryResolutionLedger = computed(() => asRecord((props.trace as any).memoryResolutionLedger))
const resolutionCandidates = computed(() => asObjectArray(memoryResolutionLedger.value?.candidates))

const searchTrace = computed(() => asRecord(recallAttribution.value?.searchTrace))
const firstHop = computed(() => asRecord(searchTrace.value?.firstHop))
const secondHop = computed(() => asRecord(searchTrace.value?.secondHop))
const thirdHop = computed(() => asRecord(searchTrace.value?.thirdHop))
const followUpAffordance = computed(() => asRecord(recallAttribution.value?.followUpAffordance))

const selectedProcedures = computed(() => asObjectArray(recallAttribution.value?.selectedProcedures))
const selectedBundles = computed(() => asObjectArray(recallAttribution.value?.selectedBundles))
const selectedChains = computed(() => asObjectArray(recallAttribution.value?.selectedChains))
const selectedEpisodes = computed(() => asObjectArray(recallAttribution.value?.selectedEpisodes))
const selectedPeriods = computed(() => asObjectArray(recallAttribution.value?.selectedPeriods))
const selectedRelationshipLines = computed(() => asStringList(recallAttribution.value?.selectedRelationshipLines, 8, 180))
const stableCore = computed(() => asStringList(recallAttribution.value?.stableCore, 8, 180))
const unsafeDetails = computed(() => asStringList(recallAttribution.value?.unsafeDetails, 8, 180))
const matchedCues = computed(() => asObjectArray(replyMemoryCoherence.value?.matchedCues))

const traceSummaryRows = computed(() => compactRows([
  {
    label: tTrace('summary.decision_trace', 'Decision Trace'),
    value: props.trace.decisionTraceId,
  },
  {
    label: tTrace('summary.turn_id', 'Turn ID'),
    value: props.trace.turnId ?? '',
  },
  {
    label: tTrace('summary.session_id', 'Session ID'),
    value: props.trace.sessionId ?? '',
  },
  {
    label: tTrace('summary.origin', 'Origin'),
    value: props.trace.origin,
  },
  {
    label: tTrace('summary.active_thread', 'Active Thread'),
    value: props.trace.activeThreadId ?? '',
  },
  {
    label: tTrace('summary.created_at', 'Created At'),
    value: formatTimestamp(props.trace.createdAt),
  },
  {
    label: tTrace('summary.updated_at', 'Updated At'),
    value: formatTimestamp(props.trace.lastUpdatedAt),
  },
]))

const intentRows = computed(() => compactRows([
  {
    label: tTrace('intent.turn_mode', 'Turn Mode'),
    value: asString(governance.value?.turnMode, 80),
  },
  {
    label: tTrace('intent.truth_state', 'Truth State'),
    value: asString(governance.value?.truthState, 80),
  },
  {
    label: tTrace('intent.repair_state', 'Repair State'),
    value: asString(governance.value?.repairState, 80),
  },
  {
    label: tTrace('intent.answer_subject', 'Answer Subject'),
    value: asString(governance.value?.answerSubject, 80),
  },
  {
    label: tTrace('intent.screen_reference_mode', 'Screen Reference Mode'),
    value: asString(governance.value?.screenReferenceMode, 80),
  },
  {
    label: tTrace('intent.recollection_mode', 'Recollection Intent'),
    value: asString(recallAttribution.value?.recollectionIntentMode, 120),
  },
  {
    label: tTrace('intent.temporal_focus', 'Temporal Focus'),
    value: asString(recallAttribution.value?.recollectionIntentTemporalFocus, 120),
  },
  {
    label: tTrace('intent.why_now', 'Why Now'),
    value: asString(recallAttribution.value?.whyNow, 240),
  },
]))

const searchTraceCards = computed(() => {
  return [
    {
      key: 'first-hop',
      title: tTrace('search.first_hop', 'First Hop'),
      rows: compactRows([
        {
          label: tTrace('search.focus', 'Focus'),
          value: asString(firstHop.value?.focus, 120),
        },
        {
          label: tTrace('search.summary', 'Summary'),
          value: asString(firstHop.value?.summary, 220),
        },
        {
          label: tTrace('search.targets', 'Targets'),
          value: asStringList(firstHop.value?.targetIds, 8, 120).join(', '),
        },
      ]),
    },
    {
      key: 'second-hop',
      title: tTrace('search.second_hop', 'Second Hop'),
      rows: compactRows([
        {
          label: tTrace('search.action', 'Action'),
          value: asString(secondHop.value?.action, 120),
        },
        {
          label: tTrace('search.evidence_gap', 'Evidence Gap'),
          value: asString(secondHop.value?.evidenceGap, 120),
        },
        {
          label: tTrace('search.summary', 'Summary'),
          value: asString(secondHop.value?.summary, 220),
        },
        {
          label: tTrace('search.targets', 'Targets'),
          value: asStringList(secondHop.value?.targetIds, 8, 120).join(', '),
        },
      ]),
    },
    {
      key: 'third-hop',
      title: tTrace('search.third_hop', 'Third Hop'),
      rows: compactRows([
        {
          label: tTrace('search.ambiguity_posture', 'Ambiguity Posture'),
          value: asString(thirdHop.value?.ambiguityPosture, 120),
        },
        {
          label: tTrace('search.summary', 'Summary'),
          value: asString(thirdHop.value?.summary, 220),
        },
      ]),
    },
  ].filter(card => card.rows.length > 0)
})

const deliberationRows = computed(() => compactRows([
  {
    label: tTrace('deliberation.should_recall', 'Should Recall'),
    value: asBooleanText(recallAttribution.value?.shouldRecall),
  },
  {
    label: tTrace('deliberation.surface_policy', 'Surface Policy'),
    value: asString(recallAttribution.value?.surfacePolicy, 120),
  },
  {
    label: tTrace('deliberation.confidence', 'Confidence'),
    value: asNumberText(recallAttribution.value?.confidence),
  },
  {
    label: tTrace('deliberation.inward_line', 'Inward Line'),
    value: asString(recallAttribution.value?.inwardLine, 240),
  },
  {
    label: tTrace('deliberation.visible_line', 'Visible Line'),
    value: asString(recallAttribution.value?.visibleLine, 240),
  },
  {
    label: tTrace('deliberation.speech_should_surface', 'Speech Should Surface'),
    value: asBooleanText(recallAttribution.value?.speechShouldSurface),
  },
  {
    label: tTrace('deliberation.speech_surface_mode', 'Speech Surface Mode'),
    value: asString(recallAttribution.value?.speechSurfaceMode, 120),
  },
  {
    label: tTrace('deliberation.speech_placement', 'Speech Placement'),
    value: asString(recallAttribution.value?.speechPlacement, 120),
  },
  {
    label: tTrace('deliberation.conflict_severity', 'Conflict Severity'),
    value: asString(recallAttribution.value?.conflictSeverity, 120),
  },
  {
    label: tTrace('deliberation.follow_up', 'Follow-up Affordance'),
    value: compactRows([
      {
        label: 'summary',
        value: asString(followUpAffordance.value?.summary, 180),
      },
      {
        label: 'whyNow',
        value: asString(followUpAffordance.value?.whyNow, 180),
      },
      {
        label: 'timing',
        value: asString(followUpAffordance.value?.preferredTiming, 80),
      },
      {
        label: 'intrusion',
        value: asString(followUpAffordance.value?.intrusionRisk, 80),
      },
      {
        label: 'payoff',
        value: asString(followUpAffordance.value?.payoffDependency, 80),
      },
    ]).map(row => `${row.label}=${row.value}`).join(' | '),
  },
]))

const surfaceControlRows = computed(() => compactRows([
  {
    label: tTrace('surface.coherence_state', 'Coherence State'),
    value: asString(replyMemoryCoherence.value?.coherenceState, 120),
  },
  {
    label: tTrace('surface.explicit_expected', 'Explicit Surface Expected'),
    value: asBooleanText(replyMemoryCoherence.value?.explicitSurfaceExpected),
  },
  {
    label: tTrace('surface.explicit_observed', 'Explicit Surface Observed'),
    value: asBooleanText(replyMemoryCoherence.value?.explicitSurfaceObserved),
  },
  {
    label: tTrace('surface.strongest_overlap', 'Strongest Cue Overlap'),
    value: asNumberText(replyMemoryCoherence.value?.strongestCueOverlap),
  },
  {
    label: tTrace('surface.visible_overlap', 'Visible Lead Overlap'),
    value: asNumberText(replyMemoryCoherence.value?.visibleLeadOverlap),
  },
  {
    label: tTrace('surface.matched_cue_kinds', 'Matched Cue Kinds'),
    value: asStringList(replyMemoryCoherence.value?.matchedCueKinds, 8, 120).join(', '),
  },
  {
    label: tTrace('surface.visible_lead', 'Visible Lead'),
    value: asString(replyMemoryCoherence.value?.visibleLead, 220),
  },
  {
    label: tTrace('surface.reply_excerpt', 'Reply Excerpt'),
    value: asString(replyMemoryCoherence.value?.replyExcerpt, 240),
  },
]))

const runtimeCarryRows = computed(() => compactRows([
  {
    label: tTrace('runtime.scene', 'Scene'),
    value: asString(digitalLifeSpine.value?.runtime.sceneScenario, 80),
  },
  {
    label: tTrace('runtime.scene_summary', 'Scene Summary'),
    value: asString(digitalLifeSpine.value?.runtime.sceneSummary, 180),
  },
  {
    label: tTrace('runtime.active_thread', 'Active Thread'),
    value: asString(digitalLifeSpine.value?.runtime.activeThreadTitle, 120) || props.trace.activeThreadId || '',
  },
  {
    label: tTrace('runtime.dominant_mode', 'Dominant Mode'),
    value: asString(digitalLifeSpine.value?.runtime.dominantMode, 80),
  },
  {
    label: tTrace('runtime.dominant_drive', 'Dominant Drive'),
    value: asString(digitalLifeSpine.value?.runtime.dominantDrive, 80),
  },
  {
    label: tTrace('runtime.answer_intent', 'Answer Intent'),
    value: asString(digitalLifeSpine.value?.runtime.answerIntent, 160),
  },
  {
    label: tTrace('runtime.operating_mode', 'Operating Mode'),
    value: asString(digitalLifeSpine.value?.architecture?.operatingMode, 80),
  },
  {
    label: tTrace('runtime.dominant_system', 'Dominant System'),
    value: asString(digitalLifeSpine.value?.architecture?.dominantSystem, 80),
  },
  {
    label: tTrace('runtime.governing_focus', 'Governing Focus'),
    value: asString(digitalLifeSpine.value?.architecture?.governingFocus, 180),
  },
  {
    label: tTrace('runtime.proactive_style', 'Proactive Style'),
    value: asString(digitalLifeSpine.value?.proactive?.preferredStyle, 80),
  },
  {
    label: tTrace('runtime.proactive_action', 'Proactive Action'),
    value: asString(digitalLifeSpine.value?.proactive?.selectedAction, 80),
  },
  {
    label: tTrace('runtime.bundle_source', 'Bundle Source'),
    value: asString(derivedMindStateBundle.value?.source, 80),
  },
  {
    label: tTrace('runtime.bundle_summary', 'Bundle Summary'),
    value: asString(derivedMindStateBundle.value?.summary, 180),
  },
  {
    label: tTrace('runtime.bundle_rhythm', 'Bundle Rhythm'),
    value: compactRows([
      { label: 'context', value: asString(asRecord(derivedMindStateBundle.value?.dialogueRhythm)?.activeClosenessContext, 80) },
      { label: 'rung', value: asString(asRecord(derivedMindStateBundle.value?.dialogueRhythm)?.activeClosenessRung, 80) },
      { label: 'doctrine', value: asString(asRecord(derivedMindStateBundle.value?.dialogueRhythm)?.relationshipDoctrine, 160) },
    ]).map(row => `${row.label}=${row.value}`).join(' | '),
  },
]))

const stageReplayCards = computed(() => {
  return memoryStageReplayStages.value.map((stage, index) => ({
    key: `${asString(stage.stage, 80) || 'stage'}-${index}`,
    title: asString(stage.stage, 80) || `stage-${index + 1}`,
    rows: compactRows([
      {
        label: 'summary',
        value: asString(stage.summary, 220),
      },
      {
        label: 'latency',
        value: asNumberText(stage.latencyMs, 0),
      },
      {
        label: 'budget',
        value: asString(stage.budgetClass, 80),
      },
      {
        label: 'inputs',
        value: asStringList(stage.inputs, 8, 140).join(' | '),
      },
      {
        label: 'outputs',
        value: asStringList(stage.outputs, 8, 140).join(' | '),
      },
      {
        label: 'diagnostics',
        value: asStringList(stage.diagnostics, 8, 160).join(' | '),
      },
    ]),
  })).filter(card => card.rows.length > 0)
})

const resolutionLedgerRows = computed(() => compactRows([
  {
    label: 'dominant cluster',
    value: asString(memoryResolutionLedger.value?.dominantClusterSummary, 200),
  },
  {
    label: 'competing cluster',
    value: asString(memoryResolutionLedger.value?.competingClusterSummary, 200),
  },
  {
    label: 'final surface',
    value: asString(memoryResolutionLedger.value?.finalSurfacePolicy, 120),
  },
  {
    label: 'stay inward',
    value: asBooleanText(memoryResolutionLedger.value?.shouldStayInward),
  },
  {
    label: 'delay after payoff',
    value: asBooleanText(memoryResolutionLedger.value?.shouldDelayUntilAfterPayoff),
  },
  {
    label: 'stable core only',
    value: asBooleanText(memoryResolutionLedger.value?.stableCoreOnly),
  },
  {
    label: 'rationale',
    value: asString(memoryResolutionLedger.value?.finalRationale, 220),
  },
]))

const finalAuthorityRows = computed(() => compactRows([
  {
    label: tTrace('authority.persisted_format', 'Persisted Format'),
    value: asString(persistenceWritten.value?.format, 80),
  },
  {
    label: tTrace('authority.parse_path', 'Parse Path'),
    value: asString(persistenceWritten.value?.parsePath, 80),
  },
  {
    label: tTrace('authority.persisted_emotion', 'Persisted Emotion'),
    value: asString(persistenceWritten.value?.emotion, 80),
  },
  {
    label: tTrace('authority.dialogue_format', 'Dialogue Format'),
    value: asString(dialogueEmitted.value?.format, 80),
  },
  {
    label: tTrace('authority.dialogue_origin', 'Dialogue Origin'),
    value: asString(dialogueEmitted.value?.origin, 80),
  },
  {
    label: tTrace('authority.dialogue_fallback', 'Dialogue Fallback'),
    value: asBooleanText(dialogueEmitted.value?.isFallback),
  },
  {
    label: tTrace('authority.takeover_reason', 'Takeover Fallback Reason'),
    value: asString(takeoverAudit.value?.fallback_reason, 160),
  },
  {
    label: tTrace('authority.reply_excerpt', 'Persisted Reply Excerpt'),
    value: asString(persistenceWritten.value?.replyExcerpt, 220),
  },
  {
    label: tTrace('authority.assistant_excerpt', 'Assistant Excerpt'),
    value: asString(persistenceWritten.value?.assistantExcerpt, 220),
  },
]))

const hasRetrievalData = computed(() => {
  return selectedProcedures.value.length > 0
    || selectedBundles.value.length > 0
    || selectedChains.value.length > 0
    || selectedEpisodes.value.length > 0
    || selectedPeriods.value.length > 0
    || selectedRelationshipLines.value.length > 0
})
</script>

<template>
  <article
    :class="[
      'rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80',
      'bg-neutral-50/80', 'p-4',
      'dark:border-neutral-800/70', 'dark:bg-neutral-900/40',
    ]"
  >
    <div :class="['flex', 'flex-wrap', 'items-start', 'justify-between', 'gap-3']">
      <div :class="['min-w-0', 'flex-1']">
        <div :class="['text-xs', 'font-medium', 'uppercase', 'tracking-wide', 'text-neutral-500', 'dark:text-neutral-400']">
          {{ tTrace('title', 'Structured Memory Trace') }} #{{ index + 1 }}
        </div>
        <div :class="['mt-1', 'break-all', 'font-mono', 'text-sm', 'text-neutral-800', 'dark:text-neutral-100']">
          {{ trace.decisionTraceId }}
        </div>
      </div>

      <div :class="['flex', 'flex-wrap', 'justify-end', 'gap-2']">
        <span
          v-for="kind in trace.eventKinds"
          :key="kind"
          :class="[
            'rounded-full', 'border', 'border-solid',
            'border-neutral-300/80', 'px-2.5', 'py-1',
            'text-[11px]', 'font-medium', 'text-neutral-700',
            'dark:border-neutral-700/70', 'dark:text-neutral-200',
          ]"
        >
          {{ kind }}
        </span>
      </div>
    </div>

    <section :class="['mt-4', 'grid', 'gap-2', 'md:grid-cols-2', 'xl:grid-cols-3']">
      <div
        v-for="row in traceSummaryRows"
        :key="row.label"
        :class="[
          'rounded-xl', 'border', 'border-solid', 'border-neutral-200/80',
          'bg-white/70', 'px-3', 'py-2',
          'dark:border-neutral-800/70', 'dark:bg-neutral-950/40',
        ]"
      >
        <div :class="['text-[11px]', 'uppercase', 'tracking-wide', 'text-neutral-500', 'dark:text-neutral-400']">
          {{ row.label }}
        </div>
        <div :class="['mt-1', 'break-all', 'font-mono', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
          {{ row.value }}
        </div>
      </div>
    </section>

    <section
      v-if="intentRows.length > 0"
      :class="['mt-4']"
    >
      <div :class="['mb-2', 'text-sm', 'font-semibold', 'text-neutral-800', 'dark:text-neutral-100']">
        {{ tTrace('intent.title', 'Intent') }}
      </div>
      <div :class="['grid', 'gap-2', 'md:grid-cols-2']">
        <div
          v-for="row in intentRows"
          :key="row.label"
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-sky-200/80',
            'bg-sky-50/70', 'px-3', 'py-2',
            'dark:border-sky-900/70', 'dark:bg-sky-950/20',
          ]"
        >
          <div :class="['text-[11px]', 'uppercase', 'tracking-wide', 'text-sky-700', 'dark:text-sky-300']">
            {{ row.label }}
          </div>
          <div :class="['mt-1', 'text-xs', 'text-sky-900', 'dark:text-sky-100']">
            {{ row.value }}
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="stageReplayCards.length > 0"
      :class="['mt-4']"
    >
      <div :class="['mb-2', 'text-sm', 'font-semibold', 'text-neutral-800', 'dark:text-neutral-100']">
        {{ tTrace('stage_replay.title', 'Stage Replay') }}
      </div>
      <div :class="['grid', 'gap-3', 'md:grid-cols-2']">
        <div
          v-for="card in stageReplayCards"
          :key="card.key"
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-emerald-200/80',
            'bg-emerald-50/60', 'px-3', 'py-3',
            'dark:border-emerald-900/60', 'dark:bg-emerald-950/15',
          ]"
        >
          <div :class="['text-xs', 'font-semibold', 'uppercase', 'tracking-wide', 'text-emerald-700', 'dark:text-emerald-300']">
            {{ card.title }}
          </div>
          <div :class="['mt-2', 'space-y-2']">
            <div
              v-for="row in card.rows"
              :key="`${card.key}-${row.label}`"
            >
              <div :class="['text-[11px]', 'uppercase', 'tracking-wide', 'text-emerald-600/90', 'dark:text-emerald-400/80']">
                {{ row.label }}
              </div>
              <div :class="['mt-1', 'text-xs', 'text-emerald-950', 'dark:text-emerald-50']">
                {{ row.value }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="resolutionLedgerRows.length > 0 || resolutionCandidates.length > 0"
      :class="['mt-4']"
    >
      <div :class="['mb-2', 'text-sm', 'font-semibold', 'text-neutral-800', 'dark:text-neutral-100']">
        {{ tTrace('resolution_ledger.title', 'Resolution Ledger') }}
      </div>
      <div :class="['grid', 'gap-2', 'md:grid-cols-2']">
        <div
          v-for="row in resolutionLedgerRows"
          :key="row.label"
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-amber-200/80',
            'bg-amber-50/60', 'px-3', 'py-2',
            'dark:border-amber-900/60', 'dark:bg-amber-950/15',
          ]"
        >
          <div :class="['text-[11px]', 'uppercase', 'tracking-wide', 'text-amber-700', 'dark:text-amber-300']">
            {{ row.label }}
          </div>
          <div :class="['mt-1', 'text-xs', 'text-amber-950', 'dark:text-amber-50']">
            {{ row.value }}
          </div>
        </div>
      </div>
      <div
        v-if="resolutionCandidates.length > 0"
        :class="['mt-3', 'space-y-2']"
      >
        <div
          v-for="candidate in resolutionCandidates"
          :key="`${asString(candidate.id, 120)}-${asString(candidate.status, 40)}`"
          :class="[
            'rounded-xl', 'border', 'border-solid',
            asString(candidate.status, 40) === 'selected'
              ? 'border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/10'
              : 'border-rose-200/80 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/10',
            'px-3', 'py-2',
          ]"
        >
          <div :class="['text-[11px]', 'uppercase', 'tracking-wide', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ asString(candidate.status, 40) }} · {{ asString(candidate.id, 120) }}
          </div>
          <div :class="['mt-1', 'text-xs', 'text-neutral-900', 'dark:text-neutral-50']">
            {{ asString(candidate.summary, 220) }}
          </div>
          <div
            v-if="asString(candidate.reason, 220)"
            :class="['mt-1', 'text-[11px]', 'text-neutral-600', 'dark:text-neutral-300']"
          >
            {{ asString(candidate.reason, 220) }}
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="searchTraceCards.length > 0"
      :class="['mt-4']"
    >
      <div :class="['mb-2', 'text-sm', 'font-semibold', 'text-neutral-800', 'dark:text-neutral-100']">
        {{ tTrace('search.title', 'Search Trace') }}
      </div>
      <div :class="['grid', 'gap-3', 'xl:grid-cols-3']">
        <div
          v-for="card in searchTraceCards"
          :key="card.key"
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-emerald-200/80',
            'bg-emerald-50/70', 'px-3', 'py-3',
            'dark:border-emerald-900/70', 'dark:bg-emerald-950/20',
          ]"
        >
          <div :class="['text-sm', 'font-medium', 'text-emerald-800', 'dark:text-emerald-200']">
            {{ card.title }}
          </div>
          <div :class="['mt-2', 'flex', 'flex-col', 'gap-2']">
            <div
              v-for="row in card.rows"
              :key="row.label"
            >
              <div :class="['text-[11px]', 'uppercase', 'tracking-wide', 'text-emerald-700', 'dark:text-emerald-300']">
                {{ row.label }}
              </div>
              <div :class="['mt-1', 'text-xs', 'text-emerald-950', 'dark:text-emerald-100']">
                {{ row.value }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="hasRetrievalData"
      :class="['mt-4']"
    >
      <div :class="['mb-2', 'text-sm', 'font-semibold', 'text-neutral-800', 'dark:text-neutral-100']">
        {{ tTrace('retrieval.title', 'Retrieval Bundles') }}
      </div>
      <div :class="['grid', 'gap-3', 'xl:grid-cols-2']">
        <div
          v-if="selectedProcedures.length > 0"
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-violet-200/80',
            'bg-violet-50/70', 'px-3', 'py-3',
            'dark:border-violet-900/70', 'dark:bg-violet-950/20',
          ]"
        >
          <div :class="['text-sm', 'font-medium', 'text-violet-800', 'dark:text-violet-200']">
            {{ tTrace('retrieval.procedures', 'Procedures') }}
          </div>
          <div :class="['mt-2', 'flex', 'flex-col', 'gap-2']">
            <div
              v-for="procedure in selectedProcedures"
              :key="`${asString(procedure.id, 160)}:${asString(procedure.label, 160)}`"
              :class="['rounded-lg', 'bg-white/70', 'px-3', 'py-2', 'dark:bg-neutral-950/30']"
            >
              <div :class="['text-xs', 'font-medium', 'text-violet-900', 'dark:text-violet-100']">
                {{ asString(procedure.label, 160) || asString(procedure.id, 160) }}
              </div>
              <div :class="['mt-1', 'text-xs', 'text-violet-800', 'dark:text-violet-200']">
                {{ asString(procedure.approach, 200) }}
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="selectedBundles.length > 0"
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-violet-200/80',
            'bg-violet-50/70', 'px-3', 'py-3',
            'dark:border-violet-900/70', 'dark:bg-violet-950/20',
          ]"
        >
          <div :class="['text-sm', 'font-medium', 'text-violet-800', 'dark:text-violet-200']">
            {{ tTrace('retrieval.bundles', 'Bundles') }}
          </div>
          <div :class="['mt-2', 'flex', 'flex-col', 'gap-2']">
            <div
              v-for="bundle in selectedBundles"
              :key="`${asString(bundle.id, 160)}:${asString(bundle.summary, 160)}`"
              :class="['rounded-lg', 'bg-white/70', 'px-3', 'py-2', 'dark:bg-neutral-950/30']"
            >
              <div :class="['text-xs', 'font-medium', 'text-violet-900', 'dark:text-violet-100']">
                {{ asString(bundle.summary, 180) || asString(bundle.id, 160) }}
              </div>
              <div :class="['mt-1', 'text-xs', 'text-violet-800', 'dark:text-violet-200']">
                {{ asString(bundle.rationale, 220) }}
              </div>
              <div
                v-if="asString(bundle.relationshipLine, 180)"
                :class="['mt-1', 'text-[11px]', 'text-violet-700', 'dark:text-violet-300']"
              >
                {{ asString(bundle.relationshipLine, 180) }}
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="selectedChains.length > 0"
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-violet-200/80',
            'bg-violet-50/70', 'px-3', 'py-3',
            'dark:border-violet-900/70', 'dark:bg-violet-950/20',
          ]"
        >
          <div :class="['text-sm', 'font-medium', 'text-violet-800', 'dark:text-violet-200']">
            {{ tTrace('retrieval.chains', 'Chains') }}
          </div>
          <div :class="['mt-2', 'flex', 'flex-col', 'gap-2']">
            <div
              v-for="chain in selectedChains"
              :key="`${asString(chain.id, 160)}:${asString(chain.summary, 160)}`"
              :class="['rounded-lg', 'bg-white/70', 'px-3', 'py-2', 'dark:bg-neutral-950/30']"
            >
              <div :class="['text-xs', 'font-medium', 'text-violet-900', 'dark:text-violet-100']">
                {{ asString(chain.summary, 180) || asString(chain.id, 160) }}
              </div>
              <div :class="['mt-1', 'text-xs', 'text-violet-800', 'dark:text-violet-200']">
                {{ asString(chain.rationale, 220) }}
              </div>
              <div :class="['mt-1', 'text-[11px]', 'text-violet-700', 'dark:text-violet-300']">
                {{
                  compactRows([
                    { label: 'stance', value: asString(chain.currentStance, 160) },
                    { label: 'posture', value: asString(chain.answerPosture, 160) },
                  ]).map(row => `${row.label}=${row.value}`).join(' | ')
                }}
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="selectedEpisodes.length > 0 || selectedPeriods.length > 0 || selectedRelationshipLines.length > 0"
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-violet-200/80',
            'bg-violet-50/70', 'px-3', 'py-3',
            'dark:border-violet-900/70', 'dark:bg-violet-950/20',
          ]"
        >
          <div :class="['text-sm', 'font-medium', 'text-violet-800', 'dark:text-violet-200']">
            {{ tTrace('retrieval.episodes_relationships', 'Episodes / Relationship Lines') }}
          </div>
          <div :class="['mt-2', 'flex', 'flex-col', 'gap-2']">
            <div
              v-for="period in selectedPeriods"
              :key="`${asString(period.id, 160)}:${asString(period.summary, 160)}`"
              :class="['rounded-lg', 'bg-white/70', 'px-3', 'py-2', 'dark:bg-neutral-950/30']"
            >
              <div :class="['text-xs', 'font-medium', 'text-violet-900', 'dark:text-violet-100']">
                {{ asString(period.summary, 180) || asString(period.id, 160) }}
              </div>
              <div :class="['mt-1', 'text-[11px]', 'text-violet-700', 'dark:text-violet-300']">
                {{ asString(period.kind, 120) }}
              </div>
            </div>
            <div
              v-for="episode in selectedEpisodes"
              :key="`${asString(episode.id, 160)}:${asString(episode.summary, 160)}`"
              :class="['rounded-lg', 'bg-white/70', 'px-3', 'py-2', 'dark:bg-neutral-950/30']"
            >
              <div :class="['text-xs', 'font-medium', 'text-violet-900', 'dark:text-violet-100']">
                {{ asString(episode.summary, 180) || asString(episode.id, 160) }}
              </div>
              <div :class="['mt-1', 'text-[11px]', 'text-violet-700', 'dark:text-violet-300']">
                {{
                  compactRows([
                    { label: 'provenance', value: asString(episode.provenance, 120) },
                    { label: 'reconsolidatedFrom', value: asString(episode.reconsolidatedFromTraceId, 120) },
                  ]).map(row => `${row.label}=${row.value}`).join(' | ')
                }}
              </div>
            </div>
            <div
              v-for="line in selectedRelationshipLines"
              :key="line"
              :class="['rounded-lg', 'bg-white/70', 'px-3', 'py-2', 'text-xs', 'text-violet-900', 'dark:bg-neutral-950/30', 'dark:text-violet-100']"
            >
              {{ line }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="deliberationRows.length > 0 || stableCore.length > 0 || unsafeDetails.length > 0"
      :class="['mt-4']"
    >
      <div :class="['mb-2', 'text-sm', 'font-semibold', 'text-neutral-800', 'dark:text-neutral-100']">
        {{ tTrace('deliberation.title', 'Deliberation') }}
      </div>
      <div :class="['grid', 'gap-2', 'md:grid-cols-2']">
        <div
          v-for="row in deliberationRows"
          :key="row.label"
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-amber-200/80',
            'bg-amber-50/70', 'px-3', 'py-2',
            'dark:border-amber-900/70', 'dark:bg-amber-950/20',
          ]"
        >
          <div :class="['text-[11px]', 'uppercase', 'tracking-wide', 'text-amber-700', 'dark:text-amber-300']">
            {{ row.label }}
          </div>
          <div :class="['mt-1', 'text-xs', 'text-amber-950', 'dark:text-amber-100']">
            {{ row.value }}
          </div>
        </div>
      </div>
      <div
        v-if="stableCore.length > 0 || unsafeDetails.length > 0"
        :class="['mt-3', 'grid', 'gap-3', 'md:grid-cols-2']"
      >
        <div
          v-if="stableCore.length > 0"
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-amber-200/80',
            'bg-white/70', 'px-3', 'py-3',
            'dark:border-amber-900/70', 'dark:bg-neutral-950/40',
          ]"
        >
          <div :class="['text-xs', 'font-medium', 'text-amber-800', 'dark:text-amber-200']">
            {{ tTrace('deliberation.stable_core', 'Stable Core') }}
          </div>
          <ul :class="['mt-2', 'list-disc', 'pl-4', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
            <li
              v-for="item in stableCore"
              :key="item"
            >
              {{ item }}
            </li>
          </ul>
        </div>
        <div
          v-if="unsafeDetails.length > 0"
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-amber-200/80',
            'bg-white/70', 'px-3', 'py-3',
            'dark:border-amber-900/70', 'dark:bg-neutral-950/40',
          ]"
        >
          <div :class="['text-xs', 'font-medium', 'text-amber-800', 'dark:text-amber-200']">
            {{ tTrace('deliberation.unsafe_details', 'Unsafe Details') }}
          </div>
          <ul :class="['mt-2', 'list-disc', 'pl-4', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
            <li
              v-for="item in unsafeDetails"
              :key="item"
            >
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section
      v-if="surfaceControlRows.length > 0 || matchedCues.length > 0"
      :class="['mt-4']"
    >
      <div :class="['mb-2', 'text-sm', 'font-semibold', 'text-neutral-800', 'dark:text-neutral-100']">
        {{ tTrace('surface.title', 'Surface Controls') }}
      </div>
      <div :class="['grid', 'gap-2', 'md:grid-cols-2']">
        <div
          v-for="row in surfaceControlRows"
          :key="row.label"
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-rose-200/80',
            'bg-rose-50/70', 'px-3', 'py-2',
            'dark:border-rose-900/70', 'dark:bg-rose-950/20',
          ]"
        >
          <div :class="['text-[11px]', 'uppercase', 'tracking-wide', 'text-rose-700', 'dark:text-rose-300']">
            {{ row.label }}
          </div>
          <div :class="['mt-1', 'text-xs', 'text-rose-950', 'dark:text-rose-100']">
            {{ row.value }}
          </div>
        </div>
      </div>
      <div
        v-if="matchedCues.length > 0"
        :class="['mt-3', 'rounded-xl', 'border', 'border-solid', 'border-rose-200/80', 'bg-white/70', 'px-3', 'py-3', 'dark:border-rose-900/70', 'dark:bg-neutral-950/40']"
      >
        <div :class="['text-xs', 'font-medium', 'text-rose-800', 'dark:text-rose-200']">
          {{ tTrace('surface.matched_cues', 'Matched Cues') }}
        </div>
        <div :class="['mt-2', 'flex', 'flex-col', 'gap-2']">
          <div
            v-for="cue in matchedCues"
            :key="`${asString(cue.kind, 64)}:${asString(cue.cue, 180)}`"
            :class="['rounded-lg', 'bg-neutral-50/90', 'px-3', 'py-2', 'dark:bg-neutral-900/70']"
          >
            <div :class="['text-[11px]', 'uppercase', 'tracking-wide', 'text-rose-700', 'dark:text-rose-300']">
              {{ asString(cue.kind, 64) }} · overlap={{ asNumberText(cue.overlap) }}
            </div>
            <div :class="['mt-1', 'text-xs', 'text-neutral-700', 'dark:text-neutral-200']">
              {{ asString(cue.cue, 220) }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="runtimeCarryRows.length > 0"
      :class="['mt-4']"
    >
      <div :class="['mb-2', 'text-sm', 'font-semibold', 'text-neutral-800', 'dark:text-neutral-100']">
        {{ tTrace('runtime.title', 'Runtime Carry') }}
      </div>
      <div :class="['grid', 'gap-2', 'md:grid-cols-2']">
        <div
          v-for="row in runtimeCarryRows"
          :key="row.label"
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-cyan-200/80',
            'bg-cyan-50/70', 'px-3', 'py-2',
            'dark:border-cyan-900/70', 'dark:bg-cyan-950/20',
          ]"
        >
          <div :class="['text-[11px]', 'uppercase', 'tracking-wide', 'text-cyan-700', 'dark:text-cyan-300']">
            {{ row.label }}
          </div>
          <div :class="['mt-1', 'text-xs', 'text-cyan-950', 'dark:text-cyan-100']">
            {{ row.value }}
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="finalAuthorityRows.length > 0"
      :class="['mt-4']"
    >
      <div :class="['mb-2', 'text-sm', 'font-semibold', 'text-neutral-800', 'dark:text-neutral-100']">
        {{ tTrace('authority.title', 'Final Prompt-side Authority') }}
      </div>
      <div :class="['grid', 'gap-2', 'md:grid-cols-2']">
        <div
          v-for="row in finalAuthorityRows"
          :key="row.label"
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-neutral-200/80',
            'bg-white/70', 'px-3', 'py-2',
            'dark:border-neutral-800/70', 'dark:bg-neutral-950/40',
          ]"
        >
          <div :class="['text-[11px]', 'uppercase', 'tracking-wide', 'text-neutral-500', 'dark:text-neutral-400']">
            {{ row.label }}
          </div>
          <div :class="['mt-1', 'text-xs', 'text-neutral-800', 'dark:text-neutral-100']">
            {{ row.value }}
          </div>
        </div>
      </div>
    </section>

    <details :class="['mt-4']">
      <summary :class="['cursor-pointer', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
        {{ tTrace('raw.label', 'Raw structured trace JSON') }}
      </summary>
      <pre
        :class="[
          'mt-2', 'overflow-auto', 'rounded-xl', 'border', 'border-solid', 'border-neutral-200/80',
          'bg-white/70', 'p-3', 'font-mono', 'text-xs',
          'dark:border-neutral-800/70', 'dark:bg-neutral-950/50',
        ]"
      >{{ jsonText(props.trace) }}</pre>
    </details>
  </article>
</template>
