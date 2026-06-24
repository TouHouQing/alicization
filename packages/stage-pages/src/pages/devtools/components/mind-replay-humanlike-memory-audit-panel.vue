<script setup lang="ts">
import type { AlicizationHumanlikeMemoryAuditEntry } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import { useAlicizationHumanlikeMemoryAuditStore } from '@proj-alicization/stage-ui/stores/alicization-humanlike-memory-audit'
import { Button, FieldInput, FieldTextArea } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  decisionTraceId?: string | null
  turnId?: string | null
  limit?: number
}>()

const store = useAlicizationHumanlikeMemoryAuditStore()
const { entries, loading, correcting, lastError, lastCorrection, correctionDraft, hasEntries } = storeToRefs(store)
const { t, te } = useI18n()

const i18nPageKey = 'settings.pages.system.sections.section.developer.sections.section.mind-replay.page.humanlike_memory_audit'

const queryReady = computed(() => Boolean(props.decisionTraceId?.trim() || props.turnId?.trim()))
const correctionReady = computed(() => {
  return Boolean(
    correctionDraft.value.candidateId.trim()
    && correctionDraft.value.field.trim()
    && correctionDraft.value.correctedValue.trim(),
  )
})

function tAudit(path: string, fallback: string, params?: Record<string, unknown>) {
  const key = `${i18nPageKey}.${path}`
  if (!te(key))
    return fallback
  return String(t(key, params ?? {}))
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString()
}

function formatList(values: string[]) {
  return values.length > 0 ? values.join(', ') : tAudit('empty_value', 'none')
}

function formatAffectPerspective(label: string, summary: string) {
  const normalizedLabel = label.trim()
  const normalizedSummary = summary.trim()
  if (!normalizedLabel && !normalizedSummary)
    return ''
  if (!normalizedLabel)
    return normalizedSummary
  if (!normalizedSummary)
    return normalizedLabel
  return `${normalizedLabel}: ${normalizedSummary}`
}

function formatInitiativeOpportunity(entry: AlicizationHumanlikeMemoryAuditEntry) {
  return [
    entry.initiativeKind ? `kind: ${entry.initiativeKind}` : '',
    entry.initiativeSuggestedWindow ? `window: ${entry.initiativeSuggestedWindow}` : '',
    entry.initiativePressure ? `pressure: ${entry.initiativePressure}` : '',
    entry.initiativeAntiSpamReason ? `anti-spam: ${entry.initiativeAntiSpamReason}` : '',
    entry.initiativeVisibleLine ? `visible line: ${entry.initiativeVisibleLine}` : '',
  ].filter(Boolean).join('\n')
}

function formatEmbodimentProfile(entry: AlicizationHumanlikeMemoryAuditEntry) {
  return [
    entry.embodimentRecallStrength ? `recall: ${entry.embodimentRecallStrength}` : '',
    entry.embodimentModalityRisk ? `risk: ${entry.embodimentModalityRisk}` : '',
  ].filter(Boolean).join('\n')
}

function candidateSummaryRows(entry: AlicizationHumanlikeMemoryAuditEntry) {
  return [
    {
      label: tAudit('fields.relationship_context', 'Relationship context'),
      value: entry.relationshipContext,
    },
    {
      label: tAudit('fields.natural_recall_line', 'Natural recall line'),
      value: entry.naturalRecallLine,
    },
    {
      label: tAudit('fields.why_remember', 'Why remembered'),
      value: entry.whyRemember,
    },
    {
      label: tAudit('fields.emotional_residue', 'Emotional residue'),
      value: formatList(entry.emotionalResidueTags),
    },
    {
      label: tAudit('fields.host_affect', 'Host affect'),
      value: formatAffectPerspective(entry.hostEmotionLabel, entry.hostEmotionSummary),
    },
    {
      label: tAudit('fields.self_affect', 'Self affect'),
      value: formatAffectPerspective(entry.selfEmotionLabel, entry.selfEmotionSummary),
    },
    {
      label: tAudit('fields.initiative_opportunity', 'Initiative opportunity'),
      value: formatInitiativeOpportunity(entry),
    },
    {
      label: tAudit('fields.embodiment_summary', 'Embodiment trace'),
      value: entry.embodimentSummary,
    },
    {
      label: tAudit('fields.embodiment_profile', 'Embodiment recall profile'),
      value: formatEmbodimentProfile(entry),
    },
    {
      label: tAudit('fields.autobiographical_impact', 'Autobiographical impact'),
      value: entry.autobiographicalImpact,
    },
  ].filter(row => row.value.trim().length > 0)
}

function fieldValueForCorrection(entry: AlicizationHumanlikeMemoryAuditEntry, field: string) {
  switch (field) {
    case 'relationshipContext':
      return entry.relationshipContext
    case 'naturalRecallLine':
      return entry.naturalRecallLine
    case 'embodimentTrace':
      return entry.embodimentSummary
    case 'autobiographicalImpact':
      return entry.autobiographicalImpact
    case 'emotionalResidue':
      return entry.emotionalResidueTags.join(', ')
    case 'initiativeOpportunity':
      return formatInitiativeOpportunity(entry)
    default:
      return ''
  }
}

function startCorrection(entry: AlicizationHumanlikeMemoryAuditEntry, field?: string) {
  const selectedField = field || entry.userCorrectableFields[0] || 'naturalRecallLine'
  store.selectEntry(entry.id)
  correctionDraft.value = {
    candidateId: entry.id,
    field: selectedField,
    previousValue: fieldValueForCorrection(entry, selectedField),
    correctedValue: '',
    reason: '',
  }
}

async function refreshAudit() {
  await store.loadAudit({
    decisionTraceId: props.decisionTraceId ?? undefined,
    turnId: props.turnId ?? undefined,
    limit: props.limit,
  })
}

async function submitCorrection() {
  await store.correctAuditEntry({
    candidateId: correctionDraft.value.candidateId,
    field: correctionDraft.value.field,
    previousValue: correctionDraft.value.previousValue,
    correctedValue: correctionDraft.value.correctedValue,
    reason: correctionDraft.value.reason,
    decisionTraceId: props.decisionTraceId,
    turnId: props.turnId,
  })
}

watch(
  () => [props.decisionTraceId, props.turnId, props.limit] as const,
  () => {
    if (queryReady.value)
      void refreshAudit()
    else
      store.clearAudit()
  },
  { immediate: true },
)
</script>

<template>
  <section
    :class="[
      'rounded-2xl', 'border', 'border-solid', 'border-neutral-200/80',
      'bg-white/70', 'p-4',
      'dark:border-neutral-800/70', 'dark:bg-neutral-950/40',
    ]"
  >
    <div :class="['mb-3', 'flex', 'flex-wrap', 'items-start', 'justify-between', 'gap-3']">
      <div>
        <div :class="['text-sm', 'font-semibold', 'text-neutral-800', 'dark:text-neutral-100']">
          {{ tAudit('title', 'Humanlike Memory Audit') }}
        </div>
        <div :class="['mt-1', 'max-w-3xl', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
          {{ tAudit('description', 'Inspect why Alicization formed a long-term humanlike memory candidate, including relationship context, emotional residue, embodiment trace, and user corrections.') }}
        </div>
      </div>
      <Button
        :label="tAudit('actions.refresh', 'Refresh audit')"
        icon="i-solar:refresh-bold-duotone"
        size="sm"
        variant="secondary"
        :loading="loading"
        :disabled="!queryReady"
        @click="refreshAudit"
      />
    </div>

    <div
      v-if="lastError"
      :class="[
        'mb-3', 'rounded-xl', 'border', 'border-solid', 'border-rose-300/80',
        'bg-rose-50', 'px-3', 'py-2', 'text-sm', 'text-rose-700',
        'dark:border-rose-900/80', 'dark:bg-rose-950/40', 'dark:text-rose-200',
      ]"
    >
      {{ lastError }}
    </div>

    <div
      v-if="lastCorrection"
      :class="[
        'mb-3', 'rounded-xl', 'border', 'border-solid', 'border-emerald-300/80',
        'bg-emerald-50', 'px-3', 'py-2', 'text-sm', 'text-emerald-700',
        'dark:border-emerald-900/80', 'dark:bg-emerald-950/40', 'dark:text-emerald-200',
      ]"
    >
      {{ tAudit('correction.recorded', 'Correction recorded') }}:
      <span :class="['font-mono']">{{ lastCorrection.field }}</span>
    </div>

    <div
      v-if="!queryReady"
      :class="[
        'rounded-xl', 'border', 'border-dashed', 'border-neutral-300/80',
        'px-4', 'py-6', 'text-sm', 'text-neutral-500',
        'dark:border-neutral-700/70', 'dark:text-neutral-400',
      ]"
    >
      {{ tAudit('states.need_query', 'Enter a decision trace or turn id to inspect humanlike memory candidates.') }}
    </div>
    <div
      v-else-if="loading"
      :class="[
        'rounded-xl', 'border', 'border-dashed', 'border-neutral-300/80',
        'px-4', 'py-6', 'text-sm', 'text-neutral-500',
        'dark:border-neutral-700/70', 'dark:text-neutral-400',
      ]"
    >
      {{ tAudit('states.loading', 'Loading humanlike memory audit...') }}
    </div>
    <div
      v-else-if="!hasEntries"
      :class="[
        'rounded-xl', 'border', 'border-dashed', 'border-neutral-300/80',
        'px-4', 'py-6', 'text-sm', 'text-neutral-500',
        'dark:border-neutral-700/70', 'dark:text-neutral-400',
      ]"
    >
      {{ tAudit('states.empty', 'No humanlike memory candidates for the current query yet.') }}
    </div>
    <div v-else :class="['grid', 'gap-3', 'xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]']">
      <div :class="['flex', 'flex-col', 'gap-3']">
        <article
          v-for="entry in entries"
          :key="entry.id"
          :class="[
            'rounded-xl', 'border', 'border-solid', 'border-neutral-200/80',
            'bg-neutral-50/70', 'p-3',
            'dark:border-neutral-800/70', 'dark:bg-neutral-900/50',
          ]"
        >
          <div :class="['flex', 'flex-wrap', 'items-start', 'justify-between', 'gap-2']">
            <div>
              <div :class="['font-mono', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
                {{ entry.id }}
              </div>
              <div :class="['mt-1', 'text-sm', 'font-semibold', 'text-neutral-800', 'dark:text-neutral-100']">
                {{ entry.relationshipThreadAnchor || tAudit('entry.fallback_anchor', 'relationship memory candidate') }}
              </div>
            </div>
            <div :class="['flex', 'flex-wrap', 'items-center', 'gap-2']">
              <span
                :class="[
                  'rounded-full', 'border', 'border-solid', 'border-cyan-300/80',
                  'px-2', 'py-0.5', 'text-xs', 'text-cyan-700',
                  'dark:border-cyan-800/80', 'dark:text-cyan-200',
                ]"
              >
                {{ Math.round(entry.confidence * 100) }}%
              </span>
              <span :class="['text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
                {{ formatTimestamp(entry.createdAt) }}
              </span>
            </div>
          </div>

          <div :class="['mt-3', 'flex', 'flex-wrap', 'gap-1.5']">
            <span
              v-for="channel in entry.sourceChannels"
              :key="channel"
              :class="[
                'rounded-full', 'border', 'border-solid', 'border-neutral-300/80',
                'px-2', 'py-0.5', 'text-xs', 'text-neutral-600',
                'dark:border-neutral-700/70', 'dark:text-neutral-300',
              ]"
            >
              {{ channel }}
            </span>
          </div>

          <div :class="['mt-3', 'grid', 'gap-2']">
            <div
              v-for="row in candidateSummaryRows(entry)"
              :key="row.label"
              :class="[
                'rounded-lg', 'border', 'border-solid', 'border-neutral-200/80',
                'bg-white/70', 'px-3', 'py-2',
                'dark:border-neutral-800/70', 'dark:bg-neutral-950/50',
              ]"
            >
              <div :class="['text-xs', 'font-medium', 'text-neutral-500', 'dark:text-neutral-400']">
                {{ row.label }}
              </div>
              <div :class="['mt-1', 'whitespace-pre-wrap', 'text-sm', 'text-neutral-750', 'dark:text-neutral-100']">
                {{ row.value }}
              </div>
            </div>
          </div>

          <div
            v-if="entry.revisionMemoryIds.length > 0 || entry.downrankMemoryIds.length > 0"
            :class="['mt-3', 'grid', 'gap-2', 'text-xs', 'md:grid-cols-2']"
          >
            <div :class="['rounded-lg', 'bg-amber-50', 'px-3', 'py-2', 'text-amber-800', 'dark:bg-amber-950/30', 'dark:text-amber-100']">
              {{ tAudit('entry.revises', 'Revises') }}: {{ formatList(entry.revisionMemoryIds) }}
            </div>
            <div :class="['rounded-lg', 'bg-neutral-100/80', 'px-3', 'py-2', 'text-neutral-650', 'dark:bg-neutral-900/80', 'dark:text-neutral-200']">
              {{ tAudit('entry.downranks', 'Downranks') }}: {{ formatList(entry.downrankMemoryIds) }}
            </div>
          </div>

          <div v-if="entry.corrections.length > 0" :class="['mt-3', 'flex', 'flex-col', 'gap-2']">
            <div :class="['text-xs', 'font-medium', 'text-neutral-500', 'dark:text-neutral-400']">
              {{ tAudit('entry.corrections', 'Corrections') }}
            </div>
            <div
              v-for="correction in entry.corrections"
              :key="`${correction.createdAt}:${correction.field}:${correction.correctedValue}`"
              :class="[
                'rounded-lg', 'border', 'border-solid', 'border-emerald-300/70',
                'bg-emerald-50/70', 'px-3', 'py-2', 'text-xs', 'text-emerald-800',
                'dark:border-emerald-900/70', 'dark:bg-emerald-950/30', 'dark:text-emerald-100',
              ]"
            >
              <span :class="['font-mono']">{{ correction.field }}</span>:
              {{ correction.correctedValue }}
            </div>
          </div>

          <div :class="['mt-3', 'flex', 'flex-wrap', 'gap-2']">
            <Button
              v-for="field in entry.userCorrectableFields"
              :key="field"
              :label="tAudit('actions.correct_field', 'Correct {field}', { field })"
              size="sm"
              variant="secondary"
              @click="startCorrection(entry, field)"
            />
          </div>
        </article>
      </div>

      <aside
        :class="[
          'rounded-xl', 'border', 'border-solid', 'border-neutral-200/80',
          'bg-neutral-50/70', 'p-3',
          'dark:border-neutral-800/70', 'dark:bg-neutral-900/50',
        ]"
      >
        <div :class="['text-sm', 'font-semibold', 'text-neutral-800', 'dark:text-neutral-100']">
          {{ tAudit('correction.title', 'Correct her memory') }}
        </div>
        <div :class="['mt-1', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
          {{ tAudit('correction.description', 'Corrections are written back as auditable memory events instead of silently overwriting her past.') }}
        </div>
        <div :class="['mt-3', 'flex', 'flex-col', 'gap-3']">
          <FieldInput
            v-model="correctionDraft.candidateId"
            :label="tAudit('correction.candidate_id', 'Candidate ID')"
            :required="false"
            input-class="font-mono"
          />
          <FieldInput
            v-model="correctionDraft.field"
            :label="tAudit('correction.field', 'Field')"
            :required="false"
          />
          <FieldTextArea
            v-model="correctionDraft.previousValue"
            :label="tAudit('correction.previous', 'Previous value')"
            :required="false"
            :rows="3"
            textarea-class="font-mono"
          />
          <FieldTextArea
            v-model="correctionDraft.correctedValue"
            :label="tAudit('correction.corrected', 'Corrected value')"
            :required="false"
            :rows="4"
          />
          <FieldTextArea
            v-model="correctionDraft.reason"
            :label="tAudit('correction.reason', 'Reason')"
            :required="false"
            :rows="3"
          />
          <div :class="['flex', 'flex-wrap', 'justify-end', 'gap-2']">
            <Button
              :label="tAudit('actions.clear_correction', 'Clear')"
              size="sm"
              variant="ghost"
              @click="store.clearCorrectionDraft()"
            />
            <Button
              :label="tAudit('actions.record_correction', 'Record correction')"
              icon="i-solar:pen-new-square-bold-duotone"
              size="sm"
              :loading="correcting"
              :disabled="!correctionReady"
              @click="submitCorrection"
            />
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
