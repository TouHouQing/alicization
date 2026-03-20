<script setup lang="ts">
import type { Card } from '@proj-alicization/ccc'
import type { DisplayModel } from '@proj-alicization/stage-ui/stores/display-models'
import type { AiriExtension } from '@proj-alicization/stage-ui/stores/modules/airi-card'

import type { SoulForgeDraft } from './soul-forge'

import kebabcase from '@stdlib/string-base-kebabcase'

import { errorMessageFrom } from '@moeru/std'
import { defaultAlicizationStageModelId } from '@proj-alicization/stage-shared'
import { ModelSelectorDialog } from '@proj-alicization/stage-ui/components/scenarios/dialogs/model-selector'
import { hasAlicizationBridge } from '@proj-alicization/stage-ui/stores/alicization-bridge'
import { useAlicizationEpoch1Store } from '@proj-alicization/stage-ui/stores/alicization-epoch1'
import { useDisplayModelsStore } from '@proj-alicization/stage-ui/stores/display-models'
import { useAiriCardStore } from '@proj-alicization/stage-ui/stores/modules/airi-card'
import { useConsciousnessStore } from '@proj-alicization/stage-ui/stores/modules/consciousness'
import { useSpeechStore } from '@proj-alicization/stage-ui/stores/modules/speech'
import { useProvidersStore } from '@proj-alicization/stage-ui/stores/providers'
import { useSettingsStageModel } from '@proj-alicization/stage-ui/stores/settings/stage-model'
import { Button, FieldInput } from '@proj-alicization/ui'
import { Select } from '@proj-alicization/ui/components/form'
import { storeToRefs } from 'pinia'
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { computed, ref, toRaw, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AlicizationPanel from './AlicizationPanel.vue'
import SoulForgePersonaForm from './SoulForgePersonaForm.vue'

import { createDefaultSoulForgeDraft } from './soul-forge'

interface Props {
  modelValue: boolean
  cardId?: string
}

interface AlicizationPanelExposed {
  savePersona: () => Promise<void>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const openModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const { t } = useI18n()
const cardStore = useAiriCardStore()
const consciousnessStore = useConsciousnessStore()
const speechStore = useSpeechStore()
const providersStore = useProvidersStore()
const displayModelsStore = useDisplayModelsStore()
const stageModelStore = useSettingsStageModel()
const alicizationEpoch1Store = useAlicizationEpoch1Store()

const { activeCardId } = storeToRefs(cardStore)
const { activeProvider: consciousnessProvider, activeModel: defaultConsciousnessModel } = storeToRefs(consciousnessStore)
const { activeSpeechProvider: speechProvider, activeSpeechModel: defaultSpeechModel, activeSpeechVoiceId: defaultSpeechVoiceId } = storeToRefs(speechStore)
const { displayModels } = storeToRefs(displayModelsStore)
const { stageModelSelected } = storeToRefs(stageModelStore)

const dialogMode = ref<'create' | 'edit'>('create')
const dialogCardId = ref('')
const isEditMode = computed(() => dialogMode.value === 'edit')
const supportsAlicizationEdit = computed(() => hasAlicizationBridge() && isEditMode.value)
const supportsAlicizationCreate = computed(() => hasAlicizationBridge() && !isEditMode.value)

const selectedConsciousnessProvider = ref<string>('')
const selectedConsciousnessModel = ref<string>('')
const selectedSpeechProvider = ref<string>('')
const selectedSpeechModel = ref<string>('')
const selectedSpeechVoiceId = ref<string>('')
const selectedDisplayModelId = ref<string>('')
const modelSelectorOpen = ref(false)

const consciousnessProviderOptions = computed(() => {
  return providersStore.configuredChatProvidersMetadata.map(provider => ({
    value: provider.id,
    label: provider.localizedName || provider.name,
  }))
})

const consciousnessModelOptions = computed(() => {
  const provider = selectedConsciousnessProvider.value || consciousnessProvider.value
  if (!provider)
    return []
  const models = providersStore.getModelsForProvider(provider)
  return models.map(model => ({
    value: model.id,
    label: model.name || model.id,
  }))
})

const speechProviderOptions = computed(() => {
  return providersStore.configuredSpeechProvidersMetadata.map(provider => ({
    value: provider.id,
    label: provider.localizedName || provider.name,
  }))
})

const speechModelOptions = computed(() => {
  const provider = selectedSpeechProvider.value || speechProvider.value
  if (!provider)
    return []
  const models = providersStore.getModelsForProvider(provider)
  return models.map(model => ({
    value: model.id,
    label: model.name || model.id,
  }))
})

const speechVoiceOptions = computed(() => {
  const provider = selectedSpeechProvider.value || speechProvider.value
  if (!provider)
    return []
  const voices = speechStore.getVoicesForProvider(provider)
  return voices.map(voice => ({
    value: voice.id,
    label: voice.name || voice.id,
  }))
})

const selectedDisplayModel = computed<DisplayModel | undefined>(() => {
  return displayModels.value.find(model => model.id === selectedDisplayModelId.value)
})

const selectedDisplayModelLabel = computed(() => {
  return selectedDisplayModel.value?.name
    || selectedDisplayModelId.value
    || defaultAlicizationStageModelId
})

const selectedDisplayModelDescription = computed(() => {
  const selectedModel = selectedDisplayModel.value
  if (!selectedModel && displayModels.value.length > 0)
    return t('settings.pages.card.alicization.creation.model_missing', { id: selectedDisplayModelId.value })
  if (!selectedModel)
    return selectedDisplayModelId.value

  switch (selectedModel.format) {
    case 'live2d-zip':
    case 'live2d-directory':
      return `Live2D · ${selectedModel.id}`
    case 'vrm':
      return `VRM · ${selectedModel.id}`
    default:
      return selectedModel.id
  }
})

watch(() => [consciousnessProvider.value, speechProvider.value], async ([consProvider, spProvider]) => {
  if (consProvider) {
    await consciousnessStore.loadModelsForProvider(consProvider)
  }
  if (spProvider) {
    await speechStore.loadVoicesForProvider(spProvider)
    const metadata = providersStore.getProviderMetadata(spProvider)
    if (metadata?.capabilities.listModels) {
      await providersStore.fetchModelsForProvider(spProvider)
    }
  }
}, { immediate: true })

watch(selectedConsciousnessProvider, async (newProvider, oldProvider) => {
  if (oldProvider !== undefined && newProvider !== oldProvider && newProvider) {
    await consciousnessStore.loadModelsForProvider(newProvider)
    selectedConsciousnessModel.value = ''
  }
})

watch(selectedSpeechProvider, async (newProvider, oldProvider) => {
  if (oldProvider !== undefined && newProvider !== oldProvider && newProvider) {
    await speechStore.loadVoicesForProvider(newProvider)
    const metadata = providersStore.getProviderMetadata(newProvider)
    if (metadata?.capabilities.listModels) {
      await providersStore.fetchModelsForProvider(newProvider)
    }
    selectedSpeechModel.value = ''
    selectedSpeechVoiceId.value = ''
  }
})

watch(selectedSpeechModel, async (newModel, oldModel) => {
  const provider = selectedSpeechProvider.value || speechProvider.value
  if (oldModel !== undefined && newModel !== oldModel && provider) {
    await speechStore.loadVoicesForProvider(provider)
    selectedSpeechVoiceId.value = defaultSpeechVoiceId.value || ''
  }
})

interface Tab {
  id: string
  label: string
  icon: string
}

const activeTabId = ref('')
const tabs = computed<Tab[]>(() => {
  if (isEditMode.value) {
    const editTabs: Tab[] = [
      { id: 'modules', label: t('settings.pages.card.alicization.creation.tabs.modules'), icon: 'i-solar:widget-4-bold-duotone' },
    ]
    if (supportsAlicizationEdit.value) {
      editTabs.push(
        { id: 'alicization-runtime', label: t('settings.pages.card.alicization.creation.tabs.runtime'), icon: 'i-solar:shield-check-bold-duotone' },
        { id: 'alicization-persona', label: t('settings.pages.card.alicization.creation.tabs.persona'), icon: 'i-solar:user-heart-bold-duotone' },
      )
    }
    return editTabs
  }

  const createTabs: Tab[] = [
    { id: 'shell', label: t('settings.pages.card.alicization.creation.tabs.shell'), icon: 'i-solar:documents-bold-duotone' },
    { id: 'modules', label: t('settings.pages.card.alicization.creation.tabs.modules'), icon: 'i-solar:widget-4-bold-duotone' },
  ]
  if (supportsAlicizationCreate.value) {
    createTabs.push({ id: 'alicization-persona', label: t('settings.pages.card.alicization.creation.tabs.persona'), icon: 'i-solar:user-heart-bold-duotone' })
  }
  return createTabs
})

const activeTab = computed({
  get: () => {
    if (!tabs.value.find(tab => tab.id === activeTabId.value))
      return tabs.value[0]?.id || ''
    return activeTabId.value
  },
  set: (value: string) => {
    activeTabId.value = value
  },
})

const showError = ref(false)
const errorMessage = ref('')
const creating = ref(false)
const editPersonaPanelRef = ref<AlicizationPanelExposed | null>(null)

function createDefaultPersonaDraft(seed?: Card) {
  return createDefaultSoulForgeDraft({
    seedAlicizationName: seed?.name,
  })
}

const createPersonaDraft = ref<SoulForgeDraft>(createDefaultPersonaDraft())

function initializeCard(): Card {
  const existingCard = (isEditMode.value && dialogCardId.value) ? cardStore.getCard(dialogCardId.value) : undefined
  const airiExt = existingCard?.extensions?.airi as AiriExtension | undefined

  selectedConsciousnessProvider.value = airiExt?.modules?.consciousness?.provider || consciousnessProvider.value
  selectedConsciousnessModel.value = airiExt?.modules?.consciousness?.model || defaultConsciousnessModel.value
  selectedSpeechProvider.value = airiExt?.modules?.speech?.provider || speechProvider.value
  selectedSpeechModel.value = airiExt?.modules?.speech?.model || defaultSpeechModel.value
  selectedSpeechVoiceId.value = airiExt?.modules?.speech?.voice_id || defaultSpeechVoiceId.value
  selectedDisplayModelId.value = airiExt?.modules?.displayModel?.modelId?.trim()
    || stageModelSelected.value
    || defaultAlicizationStageModelId

  if (existingCard) {
    return { ...toRaw(existingCard) }
  }

  return {
    name: t('settings.pages.card.creation.defaults.name'),
    nickname: undefined,
    version: '1.0',
    description: '',
    notes: undefined,
    personality: '',
    scenario: '',
    systemPrompt: '',
    postHistoryInstructions: '',
    greetings: [],
    messageExample: [],
  }
}

const card = ref<Card>(initializeCard())

watch(() => props.modelValue, (isOpen, wasOpen) => {
  if (isOpen && !wasOpen) {
    dialogMode.value = props.cardId ? 'edit' : 'create'
    dialogCardId.value = props.cardId ?? ''
    if (supportsAlicizationEdit.value && dialogCardId.value)
      activeCardId.value = dialogCardId.value
    card.value = initializeCard()
    createPersonaDraft.value = createDefaultPersonaDraft(card.value)
    activeTabId.value = tabs.value[0]?.id || ''
    showError.value = false
    errorMessage.value = ''
  }

  if (!isOpen && wasOpen) {
    dialogCardId.value = ''
  }
}, { immediate: true })

function makeComputed<T extends keyof Card>(
  key: T,
  transform?: (input: string) => string,
) {
  return computed({
    get: () => {
      return card.value[key] ?? ''
    },
    set: (val: string) => {
      const input = val.trim()
      card.value[key] = (input.length > 0
        ? (transform ? transform(input) : input)
        : '') as Card[T]
    },
  })
}

const cardName = makeComputed('name', input => kebabcase(input))
const cardDescription = makeComputed('description')
const cardNotes = makeComputed('notes')
const cardVersion = makeComputed('version')

function getDefaultPlaceholder(defaultValue: string | undefined): string {
  return defaultValue
    ? `${t('settings.pages.card.creation.use_default')} (${defaultValue})`
    : t('settings.pages.card.creation.use_default_not_configured')
}

function resolveSelectedDisplayModelId() {
  return selectedDisplayModelId.value.trim()
    || stageModelSelected.value?.trim()
    || defaultAlicizationStageModelId
}

function buildAiriExtension(existingExtension?: AiriExtension): AiriExtension {
  return {
    modules: {
      consciousness: {
        provider: selectedConsciousnessProvider.value || consciousnessProvider.value,
        model: selectedConsciousnessModel.value || defaultConsciousnessModel.value,
      },
      speech: {
        provider: selectedSpeechProvider.value || speechProvider.value,
        model: selectedSpeechModel.value || defaultSpeechModel.value,
        voice_id: selectedSpeechVoiceId.value || defaultSpeechVoiceId.value,
        pitch: existingExtension?.modules?.speech?.pitch,
        rate: existingExtension?.modules?.speech?.rate,
        ssml: existingExtension?.modules?.speech?.ssml,
        language: existingExtension?.modules?.speech?.language,
      },
      displayModel: {
        modelId: resolveSelectedDisplayModelId(),
      },
    },
    agents: existingExtension?.agents ?? {},
  }
}

function handleDisplayModelPick(selectedModel: DisplayModel | undefined) {
  if (!selectedModel)
    return

  selectedDisplayModelId.value = selectedModel.id
}

function validateCreatePersonaDraft() {
  const ownerName = createPersonaDraft.value.ownerName.trim()
  const hostName = createPersonaDraft.value.hostName.trim()
  const alicizationName = createPersonaDraft.value.alicizationName.trim()
  const relationship = createPersonaDraft.value.relationship.trim()
  const genderCustom = createPersonaDraft.value.genderCustom.trim()

  if (!ownerName) {
    showError.value = true
    errorMessage.value = t('settings.pages.card.alicization.creation.errors.owner_name_required')
    return false
  }
  if (!hostName) {
    showError.value = true
    errorMessage.value = t('settings.pages.card.alicization.creation.errors.host_name_required')
    return false
  }
  if (!alicizationName) {
    showError.value = true
    errorMessage.value = t('settings.pages.card.alicization.creation.errors.alicization_name_required')
    return false
  }
  if (!relationship) {
    showError.value = true
    errorMessage.value = t('settings.pages.card.alicization.creation.errors.relationship_required')
    return false
  }
  if (createPersonaDraft.value.gender === 'custom' && !genderCustom) {
    showError.value = true
    errorMessage.value = t('settings.pages.card.alicization.creation.errors.gender_custom_required')
    return false
  }
  return true
}

async function initializeGenesisForNewCard(newCardId: string) {
  if (!supportsAlicizationCreate.value)
    return
  if (!validateCreatePersonaDraft())
    throw new Error(errorMessage.value)

  const previousActiveCardId = activeCardId.value
  try {
    activeCardId.value = newCardId
    const result = await alicizationEpoch1Store.initializeGenesis({
      ownerName: createPersonaDraft.value.ownerName.trim(),
      hostName: createPersonaDraft.value.hostName.trim(),
      alicizationName: createPersonaDraft.value.alicizationName.trim(),
      gender: createPersonaDraft.value.gender,
      genderCustom: createPersonaDraft.value.genderCustom.trim(),
      relationship: createPersonaDraft.value.relationship.trim(),
      customDirectives: createPersonaDraft.value.customDirectives.trim(),
      mindAge: createPersonaDraft.value.mindAge,
      allowOverwrite: true,
      personality: {
        obedience: createPersonaDraft.value.obedience,
        liveliness: createPersonaDraft.value.liveliness,
        sensibility: createPersonaDraft.value.sensibility,
      },
    })
    if (result?.conflict) {
      showError.value = true
      errorMessage.value = t('settings.pages.card.alicization.creation.errors.genesis_conflict')
      throw new Error('Alicization initialization conflict')
    }
    await alicizationEpoch1Store.refreshSoul()
  }
  finally {
    activeCardId.value = previousActiveCardId
  }
}

async function saveCard(nextCard: Card) {
  if (creating.value)
    return

  const rawCard = toRaw(nextCard)
  if (!isEditMode.value && !(rawCard.name?.length > 0)) {
    showError.value = true
    errorMessage.value = t('settings.pages.card.creation.errors.name')
    return
  }
  if (!isEditMode.value && !/^(?:\d+\.)+\d+$/.test(rawCard.version)) {
    showError.value = true
    errorMessage.value = t('settings.pages.card.creation.errors.version')
    return
  }
  if (!resolveSelectedDisplayModelId()) {
    showError.value = true
    errorMessage.value = t('settings.pages.card.alicization.creation.errors.display_model_required')
    return
  }

  showError.value = false
  errorMessage.value = ''
  creating.value = true

  try {
    if (isEditMode.value && activeTab.value === 'alicization-persona') {
      await editPersonaPanelRef.value?.savePersona()
    }

    if (isEditMode.value && dialogCardId.value) {
      const existingCard = cardStore.getCard(dialogCardId.value)
      if (!existingCard) {
        showError.value = true
        errorMessage.value = t('settings.pages.card.card_not_found')
        return
      }
      const existingExtension = existingCard.extensions?.airi as AiriExtension | undefined
      cardStore.updateCard(dialogCardId.value, {
        ...toRaw(existingCard),
        extensions: {
          ...existingCard.extensions,
          airi: buildAiriExtension(existingExtension),
        },
      })
    }
    else {
      if (supportsAlicizationCreate.value && !validateCreatePersonaDraft())
        return

      let newCardId = ''
      try {
        const existingExtension = rawCard.extensions?.airi as AiriExtension | undefined
        newCardId = cardStore.addCard({
          ...rawCard,
          personality: '',
          scenario: '',
          systemPrompt: '',
          postHistoryInstructions: '',
          greetings: [],
          messageExample: [],
          extensions: {
            ...rawCard.extensions,
            airi: buildAiriExtension(existingExtension),
          },
        })
        await initializeGenesisForNewCard(newCardId)
      }
      catch (error) {
        if (newCardId) {
          await cardStore.removeCard(newCardId).catch(() => {})
        }
        throw error
      }
    }

    openModel.value = false
  }
  catch (error) {
    if (!errorMessage.value) {
      showError.value = true
      errorMessage.value = errorMessageFrom(error) ?? t('settings.pages.card.alicization.creation.errors.save_failed')
    }
  }
  finally {
    creating.value = false
  }
}
</script>

<template>
  <DialogRoot :open="openModel" @update:open="openModel = $event">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-100 bg-black/50 backdrop-blur-sm data-[state=closed]:animate-fadeOut data-[state=open]:animate-fadeIn" />
      <DialogContent class="fixed left-1/2 top-1/2 z-100 m-0 max-h-[90vh] max-w-6xl w-[92vw] flex flex-col overflow-auto border border-neutral-200 rounded-xl bg-white p-5 shadow-xl 2xl:w-[60vw] lg:w-[80vw] md:w-[85vw] xl:w-[70vw] -translate-x-1/2 -translate-y-1/2 data-[state=closed]:animate-contentHide data-[state=open]:animate-contentShow dark:border-neutral-700 dark:bg-neutral-800 sm:p-6">
        <div class="w-full flex flex-col gap-5">
          <DialogTitle text-2xl font-normal class="from-primary-500 to-primary-400 bg-gradient-to-r bg-clip-text text-transparent">
            {{ isEditMode
              ? t('settings.pages.card.alicization.creation.title_edit')
              : t('settings.pages.card.alicization.creation.title_create') }}
          </DialogTitle>

          <div class="mt-4">
            <div class="border-b border-neutral-200 dark:border-neutral-700">
              <div class="flex justify-center -mb-px sm:justify-start space-x-1">
                <button
                  v-for="tab in tabs"
                  :key="tab.id"
                  class="px-4 py-2 text-sm font-medium"
                  :class="[
                    activeTab === tab.id
                      ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 dark:border-primary-400'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300',
                  ]"
                  @click="activeTab = tab.id"
                >
                  <div class="flex items-center gap-1">
                    <div :class="tab.icon" />
                    {{ tab.label }}
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div v-if="showError" class="w-full rounded-xl bg-red900">
            <p class="w-full p-4">
              {{ errorMessage }}
            </p>
          </div>

          <div v-if="activeTab === 'shell'" class="tab-content ml-auto mr-auto w-95%">
            <p class="mb-3">
              {{ t('settings.pages.card.alicization.creation.shell.description') }}
            </p>

            <div class="input-list ml-auto mr-auto w-90% flex flex-row flex-wrap justify-center gap-8">
              <FieldInput
                v-model="cardName"
                :label="t('settings.pages.card.alicization.creation.shell.fields.card_name.label')"
                :description="t('settings.pages.card.alicization.creation.shell.fields.card_name.description')"
                :required="true"
              />
              <FieldInput
                v-model="cardVersion"
                :label="t('settings.pages.card.alicization.creation.shell.fields.card_version.label')"
                :required="true"
                :description="t('settings.pages.card.alicization.creation.shell.fields.card_version.description')"
              />
              <FieldInput
                v-model="cardDescription"
                :label="t('settings.pages.card.alicization.creation.shell.fields.card_description.label')"
                :single-line="false"
                :description="t('settings.pages.card.alicization.creation.shell.fields.card_description.description')"
              />
              <FieldInput
                v-model="cardNotes"
                :label="t('settings.pages.card.alicization.creation.shell.fields.card_notes.label')"
                :single-line="false"
                :description="t('settings.pages.card.alicization.creation.shell.fields.card_notes.description')"
              />
            </div>
          </div>

          <div v-else-if="activeTab === 'modules'" class="tab-content ml-auto mr-auto w-95%">
            <p class="mb-3">
              {{ t('settings.pages.card.creation.modules_info') }}
            </p>

            <div :class="['grid', 'grid-cols-1', 'sm:grid-cols-2', 'gap-4', 'ml-auto', 'mr-auto', 'w-90%']">
              <div :class="['flex', 'flex-col', 'gap-2']">
                <label :class="['flex', 'flex-row', 'items-center', 'gap-2', 'text-sm', 'text-neutral-500', 'dark:text-neutral-400']">
                  <div i-lucide:brain />
                  {{ t('settings.pages.card.chat.provider') }}
                </label>
                <Select
                  v-model="selectedConsciousnessProvider"
                  :options="consciousnessProviderOptions"
                  :placeholder="getDefaultPlaceholder(consciousnessProvider)"
                  class="w-full"
                />
              </div>

              <div :class="['flex', 'flex-col', 'gap-2']">
                <label :class="['flex', 'flex-row', 'items-center', 'gap-2', 'text-sm', 'text-neutral-500', 'dark:text-neutral-400']">
                  <div i-lucide:ghost />
                  {{ t('settings.pages.card.consciousness.model') }}
                </label>
                <Select
                  v-model="selectedConsciousnessModel"
                  :options="consciousnessModelOptions"
                  :placeholder="getDefaultPlaceholder(defaultConsciousnessModel)"
                  :disabled="!selectedConsciousnessProvider && !consciousnessProvider"
                  class="w-full"
                />
              </div>

              <div :class="['flex', 'flex-col', 'gap-2']">
                <label :class="['flex', 'flex-row', 'items-center', 'gap-2', 'text-sm', 'text-neutral-500', 'dark:text-neutral-400']">
                  <div i-lucide:radio />
                  {{ t('settings.pages.card.speech.provider') }}
                </label>
                <Select
                  v-model="selectedSpeechProvider"
                  :options="speechProviderOptions"
                  :placeholder="getDefaultPlaceholder(speechProvider)"
                  class="w-full"
                />
              </div>

              <div :class="['flex', 'flex-col', 'gap-2']">
                <label :class="['flex', 'flex-row', 'items-center', 'gap-2', 'text-sm', 'text-neutral-500', 'dark:text-neutral-400']">
                  <div i-lucide:mic />
                  {{ t('settings.pages.card.speech.model') }}
                </label>
                <Select
                  v-model="selectedSpeechModel"
                  :options="speechModelOptions"
                  :placeholder="getDefaultPlaceholder(defaultSpeechModel)"
                  :disabled="!selectedSpeechProvider && !speechProvider"
                  class="w-full"
                />
              </div>

              <div :class="['flex', 'flex-col', 'gap-2']">
                <label :class="['flex', 'flex-row', 'items-center', 'gap-2', 'text-sm', 'text-neutral-500', 'dark:text-neutral-400']">
                  <div i-lucide:music />
                  {{ t('settings.pages.card.speech.voice') }}
                </label>
                <Select
                  v-model="selectedSpeechVoiceId"
                  :options="speechVoiceOptions"
                  :placeholder="getDefaultPlaceholder(defaultSpeechVoiceId)"
                  :disabled="!selectedSpeechProvider && !speechProvider"
                  class="w-full"
                />
              </div>

              <div :class="['sm:col-span-2', 'flex', 'flex-col', 'gap-2']">
                <label :class="['flex', 'flex-row', 'items-center', 'gap-2', 'text-sm', 'text-neutral-500', 'dark:text-neutral-400']">
                  <div i-solar:face-scan-circle-bold-duotone />
                  {{ t('settings.pages.card.body-model') }}
                </label>

                <div :class="['flex', 'flex-col', 'gap-3', 'rounded-xl', 'border', 'border-neutral-200', 'bg-neutral-50/80', 'p-3', 'dark:border-neutral-700', 'dark:bg-neutral-900/40', 'sm:flex-row', 'sm:items-center', 'sm:justify-between']">
                  <div :class="['min-w-0', 'flex-1']">
                    <div :class="['truncate', 'text-sm', 'font-medium', 'text-neutral-800', 'dark:text-neutral-100']">
                      {{ selectedDisplayModelLabel }}
                    </div>
                    <div :class="['mt-1', 'text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
                      {{ selectedDisplayModelDescription }}
                    </div>
                  </div>

                  <ModelSelectorDialog
                    v-model:show="modelSelectorOpen"
                    :selected-model="selectedDisplayModel"
                    @pick="handleDisplayModelPick"
                  >
                    <Button variant="secondary">
                      {{ t('settings.pages.models.actions.select-model') }}
                    </Button>
                  </ModelSelectorDialog>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'alicization-runtime'" class="tab-content ml-auto mr-auto w-95%">
            <AlicizationPanel section="runtime" :show-title="false" />
          </div>

          <div v-else-if="activeTab === 'alicization-persona' && isEditMode" class="tab-content ml-auto mr-auto w-95%">
            <AlicizationPanel
              ref="editPersonaPanelRef"
              section="persona"
              :show-title="false"
              :show-persona-save-button="false"
            />
          </div>

          <div v-else-if="activeTab === 'alicization-persona'" class="tab-content ml-auto mr-auto w-95%">
            <SoulForgePersonaForm v-model:draft="createPersonaDraft" />
          </div>

          <div class="ml-auto mr-1 flex flex-row gap-2">
            <Button
              variant="secondary"
              icon="i-solar:undo-left-bold-duotone"
              :label="t('settings.pages.card.cancel')"
              :disabled="creating"
              @click="openModel = false"
            />
            <Button
              variant="primary"
              icon="i-solar:check-circle-bold-duotone"
              :label="isEditMode ? t('settings.pages.card.save') : t('settings.pages.card.creation.create')"
              :disabled="creating"
              @click="saveCard(card)"
            />
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.input-list > * {
  min-width: 45%;
}

@media (max-width: 641px) {
  .input-list * {
    min-width: unset;
    width: 100%;
  }
}
</style>
