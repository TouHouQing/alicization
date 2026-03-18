<script setup lang="ts">
import { isStageTamagotchi } from '@proj-alicization/stage-shared'
import { useAlicizationEpoch1Store } from '@proj-alicization/stage-ui/stores/alicization-epoch1'
import { useCharacterOrchestratorStore } from '@proj-alicization/stage-ui/stores/character'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AlicizationOrganicMemoryPanel from './AlicizationOrganicMemoryPanel.vue'
import SoulForgePersonaForm from './SoulForgePersonaForm.vue'

import { createDefaultSoulForgeDraft } from './soul-forge'

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

const { t } = useI18n()
const alicizationEpoch1Store = useAlicizationEpoch1Store()
const characterOrchestratorStore = useCharacterOrchestratorStore()
const {
  killSwitch: alicizationKillSwitch,
  organicMemorySearchResults,
  organicMemorySnapshot,
  soul: alicizationSoul,
} = storeToRefs(alicizationEpoch1Store)

const killSwitchLoading = ref(false)
const organicMemorySearchLoading = ref(false)
const organicMemorySearchQuery = ref('')
const personaSaving = ref(false)
const supported = computed(() => isStageTamagotchi())
const personaDraft = ref(createDefaultPersonaDraft())

function createDefaultPersonaDraft(seedAlicizationName?: string) {
  return createDefaultSoulForgeDraft({
    seedAlicizationName,
    ownerName: t('settings.pages.card.alicization.soul_forge.defaults.owner_name'),
    hostName: t('settings.pages.card.alicization.soul_forge.defaults.host_name'),
    relationship: t('settings.pages.card.alicization.soul_forge.defaults.relationship'),
  })
}

function formatDateTime(value?: number | null) {
  if (!value)
    return t('settings.pages.card.alicization.organic_memory.not_recorded')
  return new Date(value).toLocaleString()
}

watch(alicizationSoul, (next) => {
  organicMemorySearchQuery.value = ''
  if (!next) {
    personaDraft.value = createDefaultPersonaDraft()
    return
  }

  personaDraft.value = {
    ownerName: next.frontmatter.profile.ownerName,
    hostName: next.frontmatter.profile.hostName,
    alicizationName: next.frontmatter.profile.alicizationName,
    gender: next.frontmatter.profile.gender,
    genderCustom: next.frontmatter.profile.genderCustom,
    relationship: next.frontmatter.profile.relationship,
    mindAge: next.frontmatter.profile.mindAge,
    obedience: next.frontmatter.personality.obedience,
    liveliness: next.frontmatter.personality.liveliness,
    sensibility: next.frontmatter.personality.sensibility,
    customDirectives: next.frontmatter.custom_directives ?? '',
  }
}, { immediate: true })

const killSwitchUpdatedLabel = computed(() => formatDateTime(alicizationKillSwitch.value.updatedAt))
const killSwitchSuspended = computed(() => alicizationKillSwitch.value.state === 'SUSPENDED')

const killSwitchReason = computed(() => {
  const raw = alicizationKillSwitch.value.reason || 'manual'
  switch (raw) {
    case 'manual':
      return t('settings.pages.card.alicization.runtime.kill_switch.reasons.manual')
    case 'epoch1-ui-status-panel':
      return t('settings.pages.card.alicization.runtime.kill_switch.reasons.ui')
    case 'global-shortcut':
      return t('settings.pages.card.alicization.runtime.kill_switch.reasons.global_shortcut')
    case 'bootstrap':
      return t('settings.pages.card.alicization.runtime.kill_switch.reasons.bootstrap')
    default:
      return t('settings.pages.card.alicization.runtime.kill_switch.reasons.system_event', { reason: raw })
  }
})

const showRuntimeSection = computed(() => props.section === 'all' || props.section === 'runtime')
const showPersonaSection = computed(() => props.section === 'all' || props.section === 'persona')

if (supported.value)
  void alicizationEpoch1Store.refreshOrganicMemorySnapshot()

async function toggleKillSwitch() {
  if (killSwitchLoading.value)
    return
  killSwitchLoading.value = true
  try {
    if (killSwitchSuspended.value) {
      await alicizationEpoch1Store.resumeKillSwitch('epoch1-ui-status-panel')
      characterOrchestratorStore.startTicker()
    }
    else {
      await alicizationEpoch1Store.suspendKillSwitch('epoch1-ui-status-panel')
      characterOrchestratorStore.stopTicker()
    }
  }
  finally {
    killSwitchLoading.value = false
  }
}

async function refreshOrganicMemorySnapshot() {
  if (!supported.value)
    return
  await alicizationEpoch1Store.refreshOrganicMemorySnapshot()
}

async function searchOrganicMemory() {
  if (organicMemorySearchLoading.value)
    return
  organicMemorySearchLoading.value = true
  try {
    await alicizationEpoch1Store.searchOrganicSubconsciousFragments(organicMemorySearchQuery.value)
  }
  finally {
    organicMemorySearchLoading.value = false
  }
}

async function savePersona() {
  if (personaSaving.value)
    return
  personaSaving.value = true
  try {
    const result = await alicizationEpoch1Store.initializeGenesis({
      ownerName: personaDraft.value.ownerName,
      hostName: personaDraft.value.hostName,
      alicizationName: personaDraft.value.alicizationName,
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
    await alicizationEpoch1Store.refreshSoul()
    await alicizationEpoch1Store.refreshOrganicMemorySnapshot()
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
      {{ t('settings.pages.card.alicization.title') }}
    </div>
    <div v-if="showRuntimeSection" class="border border-neutral-200 rounded-xl p-4 dark:border-neutral-700">
      <div class="mb-3 flex items-center justify-between">
        <div class="text-sm font-semibold">
          {{ t('settings.pages.card.alicization.runtime.title') }}
        </div>
        <span
          :class="[
            'rounded px-2 py-0.5 text-xs',
            killSwitchSuspended ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
          ]"
        >
          {{ killSwitchSuspended
            ? t('settings.pages.card.alicization.runtime.kill_switch.state_suspended')
            : t('settings.pages.card.alicization.runtime.kill_switch.state_active') }}
        </span>
      </div>
      <div class="text-xs space-y-1">
        <div class="truncate font-medium">
          {{ t('settings.pages.card.alicization.runtime.kill_switch.reason_label') }}{{ killSwitchReason }}
        </div>
        <div class="truncate text-neutral-500 dark:text-neutral-400">
          {{ t('settings.pages.card.alicization.runtime.kill_switch.updated_at_label') }}{{ killSwitchUpdatedLabel }}
        </div>
      </div>
      <button
        class="mt-3 w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs transition-colors disabled:cursor-not-allowed dark:border-neutral-600 disabled:opacity-60"
        :disabled="killSwitchLoading"
        @click="toggleKillSwitch()"
      >
        {{ killSwitchLoading
          ? t('settings.pages.card.alicization.runtime.kill_switch.loading')
          : (killSwitchSuspended
            ? t('settings.pages.card.alicization.runtime.kill_switch.actions.resume')
            : t('settings.pages.card.alicization.runtime.kill_switch.actions.suspend')) }}
      </button>
    </div>

    <AlicizationOrganicMemoryPanel
      v-if="showRuntimeSection"
      v-model:search-query="organicMemorySearchQuery"
      :snapshot="organicMemorySnapshot"
      :search-results="organicMemorySearchResults"
      :search-loading="organicMemorySearchLoading"
      @refresh="refreshOrganicMemorySnapshot()"
      @search="searchOrganicMemory()"
    />

    <SoulForgePersonaForm
      v-if="showPersonaSection"
      v-model:draft="personaDraft"
      :show-save-button="showPersonaSaveButton"
      :saving="personaSaving"
      @save="savePersona()"
    />
  </div>
  <div v-else class="border border-neutral-200 rounded-lg p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
    {{ t('settings.pages.card.alicization.desktop_only') }}
  </div>
</template>
