<script setup lang="ts">
import { isStageTamagotchi } from '@proj-airi/stage-shared'
import { useAliceEpoch1Store } from '@proj-airi/stage-ui/stores/alice-epoch1'
import { useCharacterOrchestratorStore } from '@proj-airi/stage-ui/stores/character'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

import SoulForgePersonaForm from './SoulForgePersonaForm.vue'

import { createDefaultSoulForgeDraft, extractPersonaNotesFromSoulContent } from './soul-forge'

interface Props {
  section?: 'all' | 'runtime' | 'persona'
  showTitle?: boolean
  showPersonaSaveButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  section: 'all',
  showTitle: true,
  showPersonaSaveButton: true,
})

const aliceEpoch1Store = useAliceEpoch1Store()
const characterOrchestratorStore = useCharacterOrchestratorStore()
const {
  memoryStats: aliceMemoryStats,
  killSwitch: aliceKillSwitch,
  soul: aliceSoul,
} = storeToRefs(aliceEpoch1Store)

const memoryRefreshLoading = ref(false)
const memoryPruneLoading = ref(false)
const killSwitchLoading = ref(false)
const personaSaving = ref(false)
const supported = computed(() => isStageTamagotchi())
const personaDraft = ref(createDefaultSoulForgeDraft())
const personaMemoryEcho = ref('')

function formatDateTime(value?: number | null) {
  if (!value)
    return '未记录'
  return new Date(value).toLocaleString()
}

watch(aliceSoul, (next) => {
  if (!next) {
    personaDraft.value = createDefaultSoulForgeDraft()
    personaMemoryEcho.value = ''
    return
  }

  personaDraft.value = {
    ownerName: next.frontmatter.profile.ownerName,
    hostName: next.frontmatter.profile.hostName,
    aliceName: next.frontmatter.profile.aliceName,
    gender: next.frontmatter.profile.gender,
    genderCustom: next.frontmatter.profile.genderCustom,
    relationship: next.frontmatter.profile.relationship,
    mindAge: next.frontmatter.profile.mindAge,
    obedience: next.frontmatter.personality.obedience,
    liveliness: next.frontmatter.personality.liveliness,
    sensibility: next.frontmatter.personality.sensibility,
    customDirectives: next.frontmatter.custom_directives ?? '',
  }
  personaMemoryEcho.value = extractPersonaNotesFromSoulContent(next.content)
}, { immediate: true })

const memoryActiveRatio = computed(() => {
  if (aliceMemoryStats.value.total <= 0)
    return 0
  return Math.min(100, (aliceMemoryStats.value.active / aliceMemoryStats.value.total) * 100)
})

const memoryArchivedRatio = computed(() => {
  if (aliceMemoryStats.value.total <= 0)
    return 0
  return Math.min(100, (aliceMemoryStats.value.archived / aliceMemoryStats.value.total) * 100)
})

const memoryLastPrunedLabel = computed(() => formatDateTime(aliceMemoryStats.value.lastPrunedAt))
const killSwitchUpdatedLabel = computed(() => formatDateTime(aliceKillSwitch.value.updatedAt))
const killSwitchSuspended = computed(() => aliceKillSwitch.value.state === 'SUSPENDED')

const killSwitchReasonMap: Record<string, string> = {
  'manual': '手动切换',
  'epoch1-ui-status-panel': '面板操作',
  'global-shortcut': '全局急停快捷键',
  'bootstrap': '运行时初始化',
}
const killSwitchReason = computed(() => {
  const raw = aliceKillSwitch.value.reason || 'manual'
  if (killSwitchReasonMap[raw])
    return killSwitchReasonMap[raw]
  return `系统事件(${raw})`
})
const showRuntimeSection = computed(() => props.section === 'all' || props.section === 'runtime')
const showPersonaSection = computed(() => props.section === 'all' || props.section === 'persona')

async function toggleKillSwitch() {
  if (killSwitchLoading.value)
    return
  killSwitchLoading.value = true
  try {
    if (killSwitchSuspended.value) {
      await aliceEpoch1Store.resumeKillSwitch('epoch1-ui-status-panel')
      characterOrchestratorStore.startTicker()
    }
    else {
      await aliceEpoch1Store.suspendKillSwitch('epoch1-ui-status-panel')
      characterOrchestratorStore.stopTicker()
    }
  }
  finally {
    killSwitchLoading.value = false
  }
}

async function refreshMemoryStats() {
  if (memoryRefreshLoading.value)
    return
  memoryRefreshLoading.value = true
  try {
    await aliceEpoch1Store.refreshMemoryStats()
  }
  finally {
    memoryRefreshLoading.value = false
  }
}

async function runMemoryPrune() {
  if (memoryPruneLoading.value)
    return
  memoryPruneLoading.value = true
  try {
    await aliceEpoch1Store.runPruneNow()
  }
  finally {
    memoryPruneLoading.value = false
  }
}

async function savePersona() {
  if (personaSaving.value)
    return
  personaSaving.value = true
  try {
    const result = await aliceEpoch1Store.initializeGenesis({
      ownerName: personaDraft.value.ownerName,
      hostName: personaDraft.value.hostName,
      aliceName: personaDraft.value.aliceName,
      gender: personaDraft.value.gender,
      genderCustom: personaDraft.value.genderCustom,
      relationship: personaDraft.value.relationship,
      customDirectives: personaDraft.value.customDirectives,
      mindAge: personaDraft.value.mindAge,
      allowOverwrite: true,
      personality: {
        obedience: personaDraft.value.obedience,
        liveliness: personaDraft.value.liveliness,
        sensibility: personaDraft.value.sensibility,
      },
    })
    if (result?.conflict)
      return
    await aliceEpoch1Store.refreshSoul()
  }
  finally {
    personaSaving.value = false
  }
}

defineExpose({
  savePersona,
})
</script>

<template>
  <div v-if="supported" flex="~ col gap-6" p-2 font-normal>
    <div v-if="showTitle" class="text-sm text-neutral-500 dark:text-neutral-400">
      Alicization 中枢
    </div>
    <div v-if="showRuntimeSection" class="border border-neutral-200 rounded-xl p-4 dark:border-neutral-700">
      <div class="mb-3 flex items-center justify-between">
        <div class="text-sm font-semibold">
          执行熔断开关
        </div>
        <span
          :class="[
            'rounded px-2 py-0.5 text-xs',
            killSwitchSuspended ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
          ]"
        >
          {{ killSwitchSuspended ? '休眠' : '激活' }}
        </span>
      </div>
      <div class="text-xs space-y-1">
        <div class="truncate font-medium">
          原因：{{ killSwitchReason }}
        </div>
        <div class="truncate text-neutral-500 dark:text-neutral-400">
          更新时间：{{ killSwitchUpdatedLabel }}
        </div>
      </div>
      <button
        class="mt-3 w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs transition-colors disabled:cursor-not-allowed dark:border-neutral-600 disabled:opacity-60"
        :disabled="killSwitchLoading"
        @click="toggleKillSwitch()"
      >
        {{ killSwitchLoading ? '处理中...' : (killSwitchSuspended ? '恢复执行器' : '立即休眠执行器') }}
      </button>
    </div>

    <div v-if="showRuntimeSection" class="border border-neutral-200 rounded-xl p-4 dark:border-neutral-700">
      <div class="mb-3 text-sm font-semibold">
        记忆体状态
      </div>
      <div class="grid grid-cols-3 gap-2 text-center text-xs">
        <div class="rounded-lg bg-neutral-100 px-2 py-2 dark:bg-neutral-800">
          <div class="text-base font-semibold">
            {{ aliceMemoryStats.total }}
          </div>
          <div class="text-neutral-500 dark:text-neutral-400">
            总量
          </div>
        </div>
        <div class="rounded-lg bg-neutral-100 px-2 py-2 dark:bg-neutral-800">
          <div class="text-base font-semibold">
            {{ aliceMemoryStats.active }}
          </div>
          <div class="text-neutral-500 dark:text-neutral-400">
            活跃
          </div>
        </div>
        <div class="rounded-lg bg-neutral-100 px-2 py-2 dark:bg-neutral-800">
          <div class="text-base font-semibold">
            {{ aliceMemoryStats.archived }}
          </div>
          <div class="text-neutral-500 dark:text-neutral-400">
            归档
          </div>
        </div>
      </div>

      <div class="mt-3 text-xs space-y-2">
        <div>
          <div class="mb-0.5 flex items-center justify-between">
            <span>活跃占比</span>
            <span>{{ memoryActiveRatio.toFixed(1) }}%</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-700">
            <div class="h-full bg-emerald-500 transition-all" :style="{ width: `${memoryActiveRatio}%` }" />
          </div>
        </div>
        <div>
          <div class="mb-0.5 flex items-center justify-between">
            <span>归档占比</span>
            <span>{{ memoryArchivedRatio.toFixed(1) }}%</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-700">
            <div class="h-full bg-amber-500 transition-all" :style="{ width: `${memoryArchivedRatio}%` }" />
          </div>
        </div>
      </div>

      <div class="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
        最近修剪：{{ memoryLastPrunedLabel }}
      </div>

      <div class="mt-3 flex items-center gap-2">
        <button
          class="flex-1 border border-neutral-300 rounded-lg px-3 py-2 text-xs transition-colors disabled:cursor-not-allowed dark:border-neutral-600 disabled:opacity-60"
          :disabled="memoryRefreshLoading"
          @click="refreshMemoryStats()"
        >
          {{ memoryRefreshLoading ? '刷新中...' : '刷新' }}
        </button>
        <button
          class="flex-1 border border-neutral-300 rounded-lg px-3 py-2 text-xs transition-colors disabled:cursor-not-allowed dark:border-neutral-600 disabled:opacity-60"
          :disabled="memoryPruneLoading"
          @click="runMemoryPrune()"
        >
          {{ memoryPruneLoading ? '修剪中...' : '执行修剪' }}
        </button>
      </div>
    </div>

    <SoulForgePersonaForm
      v-if="showPersonaSection"
      v-model:draft="personaDraft"
      :memory-echo="personaMemoryEcho"
      :show-memory-echo="true"
      :show-save-button="showPersonaSaveButton"
      :saving="personaSaving"
      @save="savePersona()"
    />
  </div>
  <div v-else class="border border-neutral-200 rounded-lg p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
    Alicization 面板仅在桌面端可用。
  </div>
</template>
