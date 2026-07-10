<script setup lang="ts">
import { useAlicizationMemoryWorkbenchStore } from '@proj-alicization/stage-ui/stores/alicization-memory-workbench'
import { Button } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import MemoryEmbeddingConfig from './components/memory-embedding-config.vue'

const store = useAlicizationMemoryWorkbenchStore()
const { t } = useI18n()
const {
  activeTab,
  longTermItems,
  longTermFilters,
  longTermNextCursor,
  personaCandidates,
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
} = storeToRefs(store)

const tabs = computed(() => [
  { id: 'working' as const, icon: 'i-solar:clipboard-list-bold-duotone', label: t('settings.pages.memory.workbench.tabs.working') },
  { id: 'long-term' as const, icon: 'i-solar:database-bold-duotone', label: t('settings.pages.memory.workbench.tabs.long_term') },
  { id: 'review' as const, icon: 'i-solar:checklist-bold-duotone', label: t('settings.pages.memory.workbench.tabs.review') },
  { id: 'probe' as const, icon: 'i-solar:magnifer-bold-duotone', label: t('settings.pages.memory.workbench.tabs.probe') },
  { id: 'persona' as const, icon: 'i-solar:user-heart-bold-duotone', label: t('settings.pages.memory.workbench.tabs.persona') },
  { id: 'health' as const, icon: 'i-solar:pulse-2-bold-duotone', label: t('settings.pages.memory.workbench.tabs.health') },
])

const kindOptions = ['all', 'fact', 'episode', 'reflection', 'consolidation'] as const
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

const healthStatusClass = computed(() => {
  if (health.value?.status === 'ok')
    return 'text-emerald-600 dark:text-emerald-300'
  if (health.value?.status === 'degraded')
    return 'text-amber-600 dark:text-amber-300'
  return 'text-rose-600 dark:text-rose-300'
})

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

onMounted(() => {
  void store.refreshSnapshot()
  void store.refreshPersonaCandidates()
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
        :loading="loading"
        @click="store.refreshSnapshot()"
      />
    </header>

    <section :class="['grid', 'grid-cols-2', 'gap-3', 'lg:grid-cols-4']">
      <div :class="['border', 'border-neutral-200', 'bg-white/80', 'p-3', 'dark:border-neutral-800', 'dark:bg-neutral-950/50']">
        <div :class="['text-xs', 'text-neutral-500']">
          {{ t('settings.pages.memory.workbench.fields.health') }}
        </div>
        <div :class="['mt-1', 'text-sm', 'font-semibold', healthStatusClass]">
          {{ health?.status ?? '-' }}
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
        @click="activeTab = tab.id"
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
        <input
          v-model="longTermFilters.source"
          :aria-label="t('settings.pages.memory.workbench.fields.source')"
          :placeholder="t('settings.pages.memory.workbench.placeholders.long_term_source')"
          :class="['min-w-0', 'border', 'border-neutral-300', 'bg-white', 'px-3', 'py-2', 'text-sm', 'dark:border-neutral-700', 'dark:bg-neutral-950']"
        >
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
      <div v-if="longTermItems.length === 0" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.empty_long_term') }}
      </div>
      <article v-for="item in longTermItems" :key="item.id" :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
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
          <div>{{ t('settings.pages.memory.workbench.fields.source') }}: {{ item.source }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.confidence') }}: {{ item.confidence.toFixed(2) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.salience') }}: {{ item.salience.toFixed(2) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.source_ids') }}: {{ listText(item.sourceIds) }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.updated_at') }}: {{ formatTimestamp(item.updatedAt) }}</div>
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

    <section v-else-if="activeTab === 'review'" :class="['flex', 'flex-col', 'gap-3']">
      <div v-if="reviewItems.length === 0" :class="['border', 'border-dashed', 'border-neutral-300', 'p-5', 'text-sm', 'text-neutral-500', 'dark:border-neutral-700']">
        {{ t('settings.pages.memory.workbench.states.empty_review') }}
      </div>
      <article v-for="item in reviewItems" :key="item.id" :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['text-sm', 'font-medium']">
          {{ item.summary }}
        </div>
        <div :class="['mt-2', 'text-xs', 'text-neutral-500']">
          {{ listText(item.reviewReasons) }}
        </div>
        <div :class="['mt-3', 'flex', 'flex-wrap', 'gap-2']">
          <Button size="sm" :label="t('settings.pages.memory.workbench.actions.approve')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'approve')" />
          <Button size="sm" variant="secondary" :label="t('settings.pages.memory.workbench.actions.reject')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'reject')" />
          <Button size="sm" variant="danger" :label="t('settings.pages.memory.workbench.actions.tombstone')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'tombstone')" />
          <Button size="sm" variant="secondary" :label="t('settings.pages.memory.workbench.actions.inward_only')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'inward-only')" />
          <Button size="sm" variant="secondary" :label="t('settings.pages.memory.workbench.actions.no_training')" :loading="reviewActionLoadingId === item.id" @click="store.applyReviewAction(item.id, 'no-training')" />
        </div>
      </article>
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

    <section v-else-if="activeTab === 'persona'" :class="['flex', 'flex-col', 'gap-3']">
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
          <span>{{ t('settings.pages.memory.workbench.fields.candidate_status') }}: {{ item.status }}</span>
          <span>{{ t('settings.pages.memory.workbench.fields.privacy_class') }}: {{ item.privacyClass }}</span>
          <span>{{ t('settings.pages.memory.workbench.fields.training') }}: {{ item.allowTraining ? 'allowed' : 'blocked' }}</span>
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

    <section v-else-if="activeTab === 'health'" :class="['grid', 'grid-cols-1', 'gap-3', 'xl:grid-cols-2']">
      <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['text-sm', 'font-semibold']">
          {{ t('settings.pages.memory.workbench.fields.queue_health') }}
        </div>
        <div :class="['mt-3', 'grid', 'grid-cols-2', 'gap-2', 'text-sm']">
          <div>pending: {{ health?.queue.pending ?? 0 }}</div>
          <div>review: {{ health?.queue.review ?? 0 }}</div>
          <div>applied: {{ health?.queue.applied ?? 0 }}</div>
          <div>failed: {{ health?.queue.failed ?? 0 }}</div>
          <div>deadLettered: {{ health?.queue.deadLettered ?? 0 }}</div>
        </div>
      </div>
      <div :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800']">
        <div :class="['text-sm', 'font-semibold']">
          {{ t('settings.pages.memory.workbench.fields.recall_health') }}
        </div>
        <div :class="['mt-3', 'grid', 'grid-cols-1', 'gap-2', 'text-sm']">
          <div>{{ t('settings.pages.memory.workbench.fields.recall_latency') }}: {{ health?.recall.lastLatencyMs ?? '-' }} ms</div>
          <div>p95: {{ health?.recall.p95LatencyMs ?? '-' }} ms</div>
          <div>{{ t('settings.pages.memory.workbench.fields.errors') }}: {{ health?.recall.lastError ?? '-' }}</div>
          <div>{{ t('settings.pages.memory.workbench.fields.semantic_channel') }}: {{ health?.embedding.providerConfigured ? 'available' : 'unavailable' }}</div>
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
          <div>{{ t('settings.pages.memory.workbench.fields.embedding') }}: {{ health?.embedding.providerConfigured ? 'configured' : 'not configured' }}</div>
          <div>model: {{ health?.embedding.modelId ?? '-' }}</div>
          <div>dimensions: {{ health?.embedding.dimensions ?? '-' }}</div>
          <div>reindexRequired: {{ health?.embedding.reindexRequired ?? false }}</div>
          <div v-if="reindexResult">
            indexed: {{ reindexResult.indexed }} / failed: {{ reindexResult.failed }}
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
      <details :class="['border', 'border-neutral-200', 'p-4', 'dark:border-neutral-800', 'xl:col-span-2']">
        <summary :class="['cursor-pointer', 'text-sm', 'font-semibold']">
          raw
        </summary>
        <pre :class="['mt-3', 'whitespace-pre-wrap', 'text-xs']">{{ JSON.stringify(health, null, 2) }}</pre>
      </details>
    </section>
  </div>
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
