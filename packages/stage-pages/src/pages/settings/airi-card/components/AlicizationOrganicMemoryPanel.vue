<script setup lang="ts">
import type { AlicizationOrganicMemorySnapshot, AlicizationSubconsciousFragment } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{
  snapshot: AlicizationOrganicMemorySnapshot
  searchResults: AlicizationSubconsciousFragment[]
  searchLoading?: boolean
}>(), {
  searchLoading: false,
})

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'search'): void
}>()

const searchQuery = defineModel<string>('searchQuery', { required: true })
const { t, te } = useI18n()

const sourceKindLabelKeys: Record<AlicizationSubconsciousFragment['sourceKind'], string> = {
  'active-demotion': 'settings.pages.card.alicization.organic_memory.source_kinds.active_demotion',
  'dream-fragment': 'settings.pages.card.alicization.organic_memory.source_kinds.dream_fragment',
  'former-core-incarnation': 'settings.pages.card.alicization.organic_memory.source_kinds.former_core_incarnation',
  'unforged-shattering-event': 'settings.pages.card.alicization.organic_memory.source_kinds.unforged_shattering_event',
  'attitude-shift': 'settings.pages.card.alicization.organic_memory.source_kinds.attitude_shift',
  'mind-continuity': 'settings.pages.card.alicization.organic_memory.source_kinds.mind_continuity',
  'visual-sediment': 'settings.pages.card.alicization.organic_memory.source_kinds.visual_sediment',
  'reflection-ledger': 'settings.pages.card.alicization.organic_memory.source_kinds.reflection_ledger',
  'dialogue-turn': 'settings.pages.card.alicization.organic_memory.source_kinds.dialogue_turn',
  'fact-ledger': 'settings.pages.card.alicization.organic_memory.source_kinds.fact_ledger',
  'autobiographical-episode': 'settings.pages.card.alicization.organic_memory.source_kinds.autobiographical_episode',
}

const tier3DisplayItems = computed(() => {
  if (searchQuery.value.trim())
    return props.searchResults
  return props.snapshot.recentSubconsciousFragments
})

const tier3EmptyLabel = computed(() => {
  if (searchQuery.value.trim()) {
    return props.searchLoading
      ? t('settings.pages.card.alicization.organic_memory.tiers.tier3.search_loading')
      : t('settings.pages.card.alicization.organic_memory.tiers.tier3.empty_search')
  }
  return t('settings.pages.card.alicization.organic_memory.tiers.tier3.empty_default')
})

function formatDateTime(value?: number | null) {
  if (!value)
    return t('settings.pages.card.alicization.organic_memory.not_recorded')
  return new Date(value).toLocaleString()
}

function sourceKindLabel(value: AlicizationSubconsciousFragment['sourceKind']) {
  const key = sourceKindLabelKeys[value]
  return te(key) ? t(key) : value
}

function submitSearch() {
  emit('search')
}
</script>

<template>
  <section :class="['rounded-[28px]', 'border', 'border-neutral-200/80', 'bg-white/92', 'p-5', 'shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)]', 'dark:border-neutral-700/80', 'dark:bg-neutral-900/90', 'sm:p-6']">
    <div :class="['flex', 'flex-col', 'gap-5']">
      <header :class="['flex', 'flex-col', 'gap-3', 'border-b', 'border-neutral-200/80', 'pb-5', 'dark:border-neutral-700/80', 'md:flex-row', 'md:items-end', 'md:justify-between']">
        <div :class="['flex', 'flex-col', 'gap-2']">
          <div :class="['text-[11px]', 'font-medium', 'tracking-[0.36em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">
            {{ t('settings.pages.card.alicization.organic_memory.eyebrow') }}
          </div>
          <div :class="['font-serif', 'text-2xl', 'leading-tight', 'text-neutral-950', 'dark:text-neutral-50']">
            {{ t('settings.pages.card.alicization.organic_memory.title') }}
          </div>
          <p :class="['max-w-2xl', 'text-sm', 'leading-6', 'text-neutral-600', 'dark:text-neutral-300']">
            {{ t('settings.pages.card.alicization.organic_memory.description') }}
          </p>
        </div>

        <button
          type="button"
          :class="['inline-flex', 'items-center', 'gap-2', 'self-start', 'rounded-full', 'border', 'border-neutral-200/80', 'bg-neutral-100/80', 'px-4', 'py-2', 'text-xs', 'tracking-[0.12em]', 'text-neutral-600', 'uppercase', 'transition', 'hover:bg-neutral-200/80', 'dark:border-neutral-700/80', 'dark:bg-neutral-800/80', 'dark:text-neutral-200', 'dark:hover:bg-neutral-800']"
          @click="emit('refresh')"
        >
          <div class="i-solar:refresh-bold-duotone" />
          {{ t('settings.pages.card.alicization.organic_memory.refresh') }}
        </button>
      </header>

      <section :class="['rounded-[24px]', 'border', 'border-neutral-200/80', 'bg-linear-to-br', 'from-emerald-50/80', 'to-white', 'p-5', 'dark:border-neutral-700/80', 'dark:from-emerald-950/15', 'dark:to-neutral-950']">
        <div :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">
          {{ t('settings.pages.card.alicization.organic_memory.attitude.eyebrow') }}
        </div>
        <div :class="['mt-2', 'text-lg', 'font-medium', 'text-neutral-950', 'dark:text-neutral-50']">
          {{ t('settings.pages.card.alicization.organic_memory.attitude.title') }}
        </div>
        <div :class="['mt-3', 'rounded-[20px]', 'border', 'border-white/80', 'bg-white/85', 'p-4', 'text-sm', 'leading-7', 'text-neutral-700', 'shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]', 'dark:border-neutral-700/80', 'dark:bg-neutral-950/70', 'dark:text-neutral-200']">
          {{ snapshot.hostAttitude || t('settings.pages.card.alicization.organic_memory.attitude.fallback') }}
        </div>
      </section>

      <div :class="['grid', 'grid-cols-1', 'gap-4', 'xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]']">
        <section :class="['rounded-[24px]', 'border', 'border-neutral-200/80', 'bg-linear-to-br', 'from-amber-50/80', 'to-white', 'p-5', 'dark:border-neutral-700/80', 'dark:from-amber-950/15', 'dark:to-neutral-950']">
          <div :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">
            {{ t('settings.pages.card.alicization.organic_memory.tiers.tier1.eyebrow') }}
          </div>
          <div :class="['mt-2', 'text-lg', 'font-medium', 'text-neutral-950', 'dark:text-neutral-50']">
            {{ t('settings.pages.card.alicization.organic_memory.tiers.tier1.title') }}
          </div>
          <div :class="['mt-3', 'rounded-[20px]', 'border', 'border-white/80', 'bg-white/85', 'p-4', 'text-sm', 'leading-7', 'text-neutral-700', 'shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]', 'whitespace-pre-wrap', 'dark:border-neutral-700/80', 'dark:bg-neutral-950/70', 'dark:text-neutral-200']">
            {{ snapshot.coreIncarnation || t('settings.pages.card.alicization.organic_memory.tiers.tier1.empty') }}
          </div>
        </section>

        <section :class="['rounded-[24px]', 'border', 'border-neutral-200/80', 'bg-linear-to-br', 'from-cyan-50/80', 'to-white', 'p-5', 'dark:border-neutral-700/80', 'dark:from-cyan-950/15', 'dark:to-neutral-950']">
          <div :class="['flex', 'items-center', 'justify-between', 'gap-3']">
            <div>
              <div :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">
                {{ t('settings.pages.card.alicization.organic_memory.tiers.tier2.eyebrow') }}
              </div>
              <div :class="['mt-2', 'text-lg', 'font-medium', 'text-neutral-950', 'dark:text-neutral-50']">
                {{ t('settings.pages.card.alicization.organic_memory.tiers.tier2.title') }}
              </div>
            </div>
            <div :class="['text-right', 'text-xs', 'leading-5', 'text-neutral-500', 'dark:text-neutral-400']">
              <div>{{ t('settings.pages.card.alicization.organic_memory.tiers.tier2.last_dreaming') }}</div>
              <div>{{ formatDateTime(snapshot.lastDreamedAt) }}</div>
            </div>
          </div>

          <div v-if="snapshot.activeThoughts.length > 0" :class="['mt-4', 'grid', 'grid-cols-1', 'gap-3']">
            <article
              v-for="thought in snapshot.activeThoughts"
              :key="thought.id"
              :class="['rounded-2xl', 'border', 'border-white/80', 'bg-white/85', 'p-4', 'shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]', 'dark:border-neutral-700/80', 'dark:bg-neutral-950/70']"
            >
              <div :class="['text-sm', 'leading-7', 'text-neutral-700', 'dark:text-neutral-200']">
                {{ thought.text }}
              </div>
            </article>
          </div>
          <div v-else :class="['mt-4', 'rounded-2xl', 'border', 'border-dashed', 'border-neutral-200/80', 'bg-white/60', 'p-4', 'text-sm', 'leading-7', 'text-neutral-500', 'dark:border-neutral-700/80', 'dark:bg-neutral-950/40', 'dark:text-neutral-400']">
            {{ t('settings.pages.card.alicization.organic_memory.tiers.tier2.empty') }}
          </div>
        </section>
      </div>

      <section :class="['rounded-[24px]', 'border', 'border-neutral-200/80', 'bg-neutral-50/85', 'p-5', 'dark:border-neutral-700/80', 'dark:bg-neutral-950/60']">
        <div :class="['flex', 'flex-col', 'gap-4', 'md:flex-row', 'md:items-end', 'md:justify-between']">
          <div :class="['flex', 'flex-col', 'gap-2']">
            <div :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">
              {{ t('settings.pages.card.alicization.organic_memory.tiers.tier3.eyebrow') }}
            </div>
            <div :class="['text-lg', 'font-medium', 'text-neutral-950', 'dark:text-neutral-50']">
              {{ t('settings.pages.card.alicization.organic_memory.tiers.tier3.title') }}
            </div>
            <p :class="['text-sm', 'leading-6', 'text-neutral-600', 'dark:text-neutral-300']">
              {{ t('settings.pages.card.alicization.organic_memory.tiers.tier3.description', { count: snapshot.subconsciousCount }) }}
            </p>
          </div>

          <div :class="['flex', 'w-full', 'flex-col', 'gap-2', 'md:max-w-md']">
            <label :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">
              {{ t('settings.pages.card.alicization.organic_memory.tiers.tier3.search_label') }}
            </label>
            <div :class="['flex', 'items-center', 'gap-2']">
              <input
                v-model="searchQuery"
                :class="['w-full', 'rounded-2xl', 'border', 'border-neutral-200', 'bg-white/80', 'px-4', 'py-3', 'text-sm', 'text-neutral-900', 'outline-none', 'transition', 'focus:border-cyan-400/70', 'dark:border-neutral-700', 'dark:bg-neutral-950/80', 'dark:text-neutral-100']"
                :placeholder="t('settings.pages.card.alicization.organic_memory.tiers.tier3.search_placeholder')"
                @keydown.enter.prevent="submitSearch()"
              >
              <button
                type="button"
                :class="['inline-flex', 'items-center', 'justify-center', 'rounded-2xl', 'border', 'border-neutral-900', 'bg-neutral-950', 'px-4', 'py-3', 'text-sm', 'text-white', 'transition', 'disabled:cursor-not-allowed', 'disabled:opacity-60', 'hover:bg-neutral-800', 'dark:border-cyan-200', 'dark:bg-cyan-200', 'dark:text-neutral-950', 'dark:hover:bg-cyan-100']"
                :disabled="searchLoading"
                @click="submitSearch()"
              >
                {{ searchLoading
                  ? t('settings.pages.card.alicization.organic_memory.tiers.tier3.search_loading')
                  : t('settings.pages.card.alicization.organic_memory.tiers.tier3.search_action') }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="tier3DisplayItems.length > 0" :class="['mt-5', 'grid', 'grid-cols-1', 'gap-3']">
          <article
            v-for="fragment in tier3DisplayItems"
            :key="fragment.id"
            :class="['rounded-2xl', 'border', 'border-white/80', 'bg-white/85', 'p-4', 'shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]', 'dark:border-neutral-700/80', 'dark:bg-neutral-950/70']"
          >
            <div :class="['flex', 'flex-col', 'gap-3', 'md:flex-row', 'md:items-start', 'md:justify-between']">
              <div :class="['flex', 'flex-col', 'gap-2']">
                <div :class="['inline-flex', 'w-fit', 'items-center', 'rounded-full', 'bg-neutral-100', 'px-3', 'py-1', 'text-[11px]', 'tracking-[0.12em]', 'text-neutral-600', 'uppercase', 'dark:bg-neutral-800', 'dark:text-neutral-300']">
                  {{ sourceKindLabel(fragment.sourceKind) }}
                </div>
                <div :class="['text-sm', 'leading-7', 'text-neutral-700', 'dark:text-neutral-200']">
                  {{ fragment.text }}
                </div>
              </div>

              <div :class="['shrink-0', 'text-xs', 'leading-5', 'text-neutral-500', 'dark:text-neutral-400', 'md:text-right']">
                <div>{{ t('settings.pages.card.alicization.organic_memory.tiers.tier3.written_at') }}{{ formatDateTime(fragment.createdAt) }}</div>
                <div>{{ t('settings.pages.card.alicization.organic_memory.tiers.tier3.recalled_at') }}{{ formatDateTime(fragment.lastRecalledAt) }}</div>
                <div>{{ t('settings.pages.card.alicization.organic_memory.tiers.tier3.hits', { count: fragment.recallCount }) }}</div>
              </div>
            </div>
          </article>
        </div>
        <div v-else :class="['mt-5', 'rounded-2xl', 'border', 'border-dashed', 'border-neutral-200/80', 'bg-white/60', 'p-4', 'text-sm', 'leading-7', 'text-neutral-500', 'dark:border-neutral-700/80', 'dark:bg-neutral-950/40', 'dark:text-neutral-400']">
          {{ tier3EmptyLabel }}
        </div>
      </section>
    </div>
  </section>
</template>
