<script setup lang="ts">
import type { AlicizationOrganicMemorySnapshot, AlicizationSubconsciousFragment } from '@proj-airi/stage-ui/stores/alicization-bridge'

import { computed } from 'vue'

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

const tier3DisplayItems = computed(() => {
  if (searchQuery.value.trim())
    return props.searchResults
  return props.snapshot.recentSubconsciousFragments
})

const tier3EmptyLabel = computed(() => {
  if (searchQuery.value.trim())
    return props.searchLoading ? '搜索中...' : '未命中潜层记忆。'
  return '潜层仍然安静，尚未沉淀更多碎片。'
})

const sourceKindLabelMap: Record<AlicizationSubconsciousFragment['sourceKind'], string> = {
  'active-demotion': '活跃下沉',
  'dream-fragment': '梦境碎片',
  'former-core-incarnation': '旧心意蜕壳',
  'unforged-shattering-event': '未重铸破碎事件',
  'attitude-shift': '态度演变',
}

function formatDateTime(value?: number | null) {
  if (!value)
    return '未记录'
  return new Date(value).toLocaleString()
}

function sourceKindLabel(value: AlicizationSubconsciousFragment['sourceKind']) {
  return sourceKindLabelMap[value] ?? value
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
            Organic Memory
          </div>
          <div :class="['font-serif', 'text-2xl', 'leading-tight', 'text-neutral-950', 'dark:text-neutral-50']">
            摇光有机记忆
          </div>
          <p :class="['max-w-2xl', 'text-sm', 'leading-6', 'text-neutral-600', 'dark:text-neutral-300']">
            只读展示当前关系态度、摇光心意、活跃思绪与潜层记忆。后天记忆不再通过宿主手动改写。
          </p>
        </div>

        <button
          type="button"
          :class="['inline-flex', 'items-center', 'gap-2', 'self-start', 'rounded-full', 'border', 'border-neutral-200/80', 'bg-neutral-100/80', 'px-4', 'py-2', 'text-xs', 'tracking-[0.12em]', 'text-neutral-600', 'uppercase', 'transition', 'hover:bg-neutral-200/80', 'dark:border-neutral-700/80', 'dark:bg-neutral-800/80', 'dark:text-neutral-200', 'dark:hover:bg-neutral-800']"
          @click="emit('refresh')"
        >
          <div class="i-solar:refresh-bold-duotone" />
          刷新快照
        </button>
      </header>

      <section :class="['rounded-[24px]', 'border', 'border-neutral-200/80', 'bg-linear-to-br', 'from-emerald-50/80', 'to-white', 'p-5', 'dark:border-neutral-700/80', 'dark:from-emerald-950/15', 'dark:to-neutral-950']">
        <div :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">
          Current Attitude
        </div>
        <div :class="['mt-2', 'text-lg', 'font-medium', 'text-neutral-950', 'dark:text-neutral-50']">
          当前关系态度
        </div>
        <div :class="['mt-3', 'rounded-[20px]', 'border', 'border-white/80', 'bg-white/85', 'p-4', 'text-sm', 'leading-7', 'text-neutral-700', 'shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]', 'dark:border-neutral-700/80', 'dark:bg-neutral-950/70', 'dark:text-neutral-200']">
          {{ snapshot.hostAttitude || '礼貌而克制，保持观察' }}
        </div>
      </section>

      <div :class="['grid', 'grid-cols-1', 'gap-4', 'xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]']">
        <section :class="['rounded-[24px]', 'border', 'border-neutral-200/80', 'bg-linear-to-br', 'from-amber-50/80', 'to-white', 'p-5', 'dark:border-neutral-700/80', 'dark:from-amber-950/15', 'dark:to-neutral-950']">
          <div :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">
            Tier 1
          </div>
          <div :class="['mt-2', 'text-lg', 'font-medium', 'text-neutral-950', 'dark:text-neutral-50']">
            摇光心意
          </div>
          <div :class="['mt-3', 'rounded-[20px]', 'border', 'border-white/80', 'bg-white/85', 'p-4', 'text-sm', 'leading-7', 'text-neutral-700', 'shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)]', 'whitespace-pre-wrap', 'dark:border-neutral-700/80', 'dark:bg-neutral-950/70', 'dark:text-neutral-200']">
            {{ snapshot.coreIncarnation || '尚未形成稳定的摇光心意。下一次成功重铸后，这里会留下持续注入的灵魂基底。' }}
          </div>
        </section>

        <section :class="['rounded-[24px]', 'border', 'border-neutral-200/80', 'bg-linear-to-br', 'from-cyan-50/80', 'to-white', 'p-5', 'dark:border-neutral-700/80', 'dark:from-cyan-950/15', 'dark:to-neutral-950']">
          <div :class="['flex', 'items-center', 'justify-between', 'gap-3']">
            <div>
              <div :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">
                Tier 2
              </div>
              <div :class="['mt-2', 'text-lg', 'font-medium', 'text-neutral-950', 'dark:text-neutral-50']">
                活跃思绪
              </div>
            </div>
            <div :class="['text-right', 'text-xs', 'leading-5', 'text-neutral-500', 'dark:text-neutral-400']">
              <div>最近 Dreaming</div>
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
            当前没有活跃思绪。Dreaming 在下一次代谢时会重新写入工作记忆。
          </div>
        </section>
      </div>

      <section :class="['rounded-[24px]', 'border', 'border-neutral-200/80', 'bg-neutral-50/85', 'p-5', 'dark:border-neutral-700/80', 'dark:bg-neutral-950/60']">
        <div :class="['flex', 'flex-col', 'gap-4', 'md:flex-row', 'md:items-end', 'md:justify-between']">
          <div :class="['flex', 'flex-col', 'gap-2']">
            <div :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">
              Tier 3
            </div>
            <div :class="['text-lg', 'font-medium', 'text-neutral-950', 'dark:text-neutral-50']">
              潜层记忆
            </div>
            <p :class="['text-sm', 'leading-6', 'text-neutral-600', 'dark:text-neutral-300']">
              冷存储总量 {{ snapshot.subconsciousCount }} 条。这里只在命中时被联想唤醒，不再默认灌入对话上下文。
            </p>
          </div>

          <div :class="['flex', 'w-full', 'flex-col', 'gap-2', 'md:max-w-md']">
            <label :class="['text-xs', 'tracking-[0.14em]', 'text-neutral-500', 'uppercase', 'dark:text-neutral-400']">
              搜索潜层碎片
            </label>
            <div :class="['flex', 'items-center', 'gap-2']">
              <input
                v-model="searchQuery"
                :class="['w-full', 'rounded-2xl', 'border', 'border-neutral-200', 'bg-white/80', 'px-4', 'py-3', 'text-sm', 'text-neutral-900', 'outline-none', 'transition', 'focus:border-cyan-400/70', 'dark:border-neutral-700', 'dark:bg-neutral-950/80', 'dark:text-neutral-100']"
                placeholder="输入人名、项目名、错误码、窗口标题..."
                @keydown.enter.prevent="submitSearch()"
              >
              <button
                type="button"
                :class="['inline-flex', 'items-center', 'justify-center', 'rounded-2xl', 'border', 'border-neutral-900', 'bg-neutral-950', 'px-4', 'py-3', 'text-sm', 'text-white', 'transition', 'disabled:cursor-not-allowed', 'disabled:opacity-60', 'hover:bg-neutral-800', 'dark:border-cyan-200', 'dark:bg-cyan-200', 'dark:text-neutral-950', 'dark:hover:bg-cyan-100']"
                :disabled="searchLoading"
                @click="submitSearch()"
              >
                {{ searchLoading ? '搜索中...' : '搜索' }}
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
                <div>写入：{{ formatDateTime(fragment.createdAt) }}</div>
                <div>唤醒：{{ formatDateTime(fragment.lastRecalledAt) }}</div>
                <div>命中：{{ fragment.recallCount }} 次</div>
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
