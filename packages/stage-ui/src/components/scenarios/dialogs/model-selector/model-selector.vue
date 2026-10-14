<script setup lang="ts">
import type { DisplayModel } from '../../../../stores/display-models'

import { Button } from '@proj-alicization/ui'
import { useFileDialog } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuTrigger, EditableArea, EditableEditTrigger, EditableInput, EditablePreview, EditableRoot, EditableSubmitTrigger } from 'reka-ui'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { DisplayModelFormat, useDisplayModelsStore } from '../../../../stores/display-models'

const props = defineProps<{
  selectedModel?: DisplayModel
}>()
const emits = defineEmits<{
  (e: 'close', value: void): void
  (e: 'pick', value: DisplayModel | undefined): void
}>()

const displayModelStore = useDisplayModelsStore()
const { t } = useI18n()
const { displayModelsFromIndexedDBLoading, displayModels } = storeToRefs(displayModelStore)

function handleRemoveModel(model: DisplayModel) {
  displayModelStore.removeDisplayModel(model.id)
}

const highlightDisplayModelCard = ref<string | undefined>(props.selectedModel?.id)

watch(() => props.selectedModel?.id, (modelId) => {
  highlightDisplayModelCard.value = modelId
}, { immediate: true })

function handleAddLive2DModel(file: FileList | null) {
  if (file === null || file.length === 0)
    return
  if (!file[0].name.endsWith('.zip'))
    return

  displayModelStore.addDisplayModel(DisplayModelFormat.Live2dZip, file[0])
}

function handlePick(m: DisplayModel) {
  highlightDisplayModelCard.value = m.id
  emits('pick', m)
  emits('close', undefined)
}

function handleMobilePick() {
  emits('pick', displayModels.value.find(model => model.id === highlightDisplayModelCard.value))
  emits('close', undefined)
}

function handleAddVRMModel(file: FileList | null) {
  if (file === null || file.length === 0)
    return
  if (!file[0].name.endsWith('.vrm'))
    return

  displayModelStore.addDisplayModel(DisplayModelFormat.VRM, file[0])
}

const mapFormatRenderer: Record<DisplayModelFormat, string> = {
  [DisplayModelFormat.Live2dZip]: 'Live2D',
  [DisplayModelFormat.Live2dDirectory]: 'Live2D',
  [DisplayModelFormat.VRM]: 'VRM',
  [DisplayModelFormat.PMXDirectory]: 'MMD',
  [DisplayModelFormat.PMXZip]: 'MMD',
  [DisplayModelFormat.PMD]: 'MMD',
}

const live2dDialog = useFileDialog({ accept: '.zip', multiple: false, reset: true })
const vrmDialog = useFileDialog({ accept: '.vrm', multiple: false, reset: true })

live2dDialog.onChange(handleAddLive2DModel)
vrmDialog.onChange(handleAddVRMModel)
</script>

<template>
  <div pt="4 sm:0" gap="4 sm:6" h-full min-h-0 flex flex-col>
    <div flex shrink-0 items-center>
      <div w-full flex-1 text-xl>
        {{ t('settings.model-selector.title') }}
      </div>
      <div>
        <DropdownMenuRoot>
          <DropdownMenuTrigger
            bg="neutral-400/20 hover:neutral-400/45 active:neutral-400/60 dark:neutral-700/50 hover:dark:neutral-700/65 active:dark:neutral-700/90"
            flex items-center justify-center gap-1 rounded-lg px-2 py-1 backdrop-blur-sm
            transition="colors duration-200 ease-in-out"
            :aria-label="t('settings.model-selector.add')"
          >
            <div i-solar:add-circle-bold />
            <div>{{ t('settings.model-selector.add') }}</div>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent
              class="will-change-[opacity,transform] z-10000 max-w-45 rounded-lg p-0.5 shadow-md outline-none data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade data-[side=right]:animate-slideLeftAndFade data-[side=top]:animate-slideDownAndFade"
              bg="neutral-100/50 dark:neutral-950/50"
              transition="colors duration-200 ease-in-out"
              backdrop-blur-sm
              align="end"
              side="bottom"
              :side-offset="8"
            >
              <DropdownMenuItem
                :class="[
                  'data-[disabled]:text-mauve8 relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 leading-none outline-none data-[disabled]:pointer-events-none',
                  'text-base sm:text-sm',
                  'data-[highlighted]:bg-primary-300/20 dark:data-[highlighted]:bg-primary-100/20',
                  'data-[highlighted]:text-primary-400 dark:data-[highlighted]:text-primary-200',
                ]"
                transition="colors duration-200 ease-in-out"
                @click="live2dDialog.open()"
              >
                Live2D
              </DropdownMenuItem>
              <DropdownMenuItem
                :class="[
                  'data-[disabled]:text-mauve8 relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 leading-none outline-none data-[disabled]:pointer-events-none',
                  'text-base sm:text-sm',
                  'data-[highlighted]:bg-primary-300/20 dark:data-[highlighted]:bg-primary-100/20',
                  'data-[highlighted]:text-primary-400 dark:data-[highlighted]:text-primary-200',
                ]"
                transition="colors duration-200 ease-in-out" @click="vrmDialog.open()"
              >
                VRM
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>
      </div>
    </div>
    <div v-if="displayModelsFromIndexedDBLoading">
      {{ t('settings.model-selector.loading') }}
    </div>
    <div class="min-h-0 w-full flex-1 overflow-y-auto">
      <div class="grid grid-cols-2 w-full gap-4">
        <div
          v-for="(model) of displayModels"
          :key="model.id"
          v-auto-animate
          relative gap-2
          class="min-w-0 w-full flex flex-col"
          @click="() => highlightDisplayModelCard = model.id"
        >
          <div absolute left-3 top-4 z-1>
            <DropdownMenuRoot>
              <DropdownMenuTrigger
                :class="[
                  'bg-neutral-900/20 hover:bg-neutral-900/45 active:bg-neutral-900/60 dark:bg-neutral-950/50 hover:dark:bg-neutral-900/65 active:dark:bg-neutral-900/90',
                ]"
                text="white"
                h-7 w-7 flex items-center justify-center rounded-lg backdrop-blur-sm
                transition="colors duration-200 ease-in-out"
                :aria-label="t('settings.model-selector.options', { name: model.name })"
              >
                <div i-solar:menu-dots-bold />
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent
                  :class="[
                    'will-change-[opacity,transform] z-10000 max-w-45 rounded-lg p-0.5 text-white shadow-md outline-none data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade data-[side=right]:animate-slideLeftAndFade data-[side=top]:animate-slideDownAndFade dark:text-black',
                    'bg-neutral-900/30 dark:bg-neutral-950/50',
                    'backdrop-blur-sm',
                  ]"
                  transition="colors duration-200 ease-in-out"
                  align="start"
                  side="bottom"
                  :side-offset="4"
                >
                  <DropdownMenuItem
                    :class="[
                      'relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-base leading-none outline-none data-[disabled]:pointer-events-none sm:text-sm',
                      'data-[highlighted]:bg-red-900/20 dark:data-[highlighted]:bg-red-100/20',
                      'text-white dark:text-white data-[highlighted]:text-red-200 dark:data-[highlighted]:text-red-200',
                    ]"
                    transition="colors duration-200 ease-in-out"
                  >
                    <button flex items-center gap-1 outline-none @click="handleRemoveModel(model)">
                      <div i-solar:trash-bin-minimalistic-bold-duotone />
                      <div>{{ t('settings.model-selector.remove') }}</div>
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenuRoot>
          </div>
          <div
            class="min-h-0 w-full"
            aspect="12/16"
            px-1 py-2
          >
            <img v-if="model.previewImage" :src="model.previewImage" h-full w-full rounded-lg object-contain :class="[highlightDisplayModelCard && highlightDisplayModelCard === model.id ? 'ring-3 ring-primary-400' : 'ring-0 ring-transparent']" transition="all duration-200 ease-in-out">
            <div v-else bg="neutral-100 dark:neutral-900" relative h-full w-full flex flex-col items-center justify-center gap-2 overflow-hidden rounded-lg :class="[highlightDisplayModelCard && highlightDisplayModelCard === model.id ? 'ring-3 ring-primary-400' : 'ring-0 ring-transparent']" transition="all duration-200 ease-in-out">
              <div i-solar:question-square-bold-duotone text-4xl opacity-75 />
              <div translate-y="100%" absolute top-0 flex flex-col translate-x--7 rotate-45 scale-250 gap-0 opacity-5>
                <div text="sm sm:sm" translate-x-7 translate-y--2 text-nowrap>
                  unavailable Preview unavailable Preview
                </div>
                <div text="sm sm:sm" translate-x-0 translate-y--0 text-nowrap>
                  Preview unavailable Preview unavailable
                </div>
                <div text="sm sm:sm" translate-x--7 translate-y-2 text-nowrap>
                  unavailable Preview unavailable Preview
                </div>
              </div>
            </div>
          </div>
          <div w-full flex flex-col>
            <div w-full flex-1 p-2>
              <EditableRoot
                v-slot="{ isEditing }"
                :default-value="model.name"
                :placeholder="t('settings.model-selector.name')"
                class="flex gap-2"
                auto-resize
              >
                <EditableArea class="w-[calc(100%-8px-1rem)] dark:text-white">
                  <EditablePreview class="line-clamp-1 w-[calc(100%-8px)] overflow-hidden text-ellipsis" />
                  <EditableInput class="w-[calc(100%-8px)]! placeholder:text-neutral-700 dark:placeholder:text-neutral-600" />
                </EditableArea>
                <EditableEditTrigger v-if="!isEditing">
                  <div i-solar:pen-2-line-duotone opacity-50 />
                </EditableEditTrigger>
                <div v-else class="flex gap-2">
                  <EditableSubmitTrigger>
                    <div i-solar:check-read-line-duotone opacity-50 />
                  </EditableSubmitTrigger>
                </div>
              </EditableRoot>
              <div flex items-center gap-1 text="neutral-400 dark:neutral-600">
                <div i-solar:tag-horizontal-bold />
                <div>{{ mapFormatRenderer[model.format] }}</div>
              </div>
            </div>
            <Button class="hidden md:block" variant="secondary" @click="handlePick(model)">
              {{ t('settings.model-selector.pick') }}
            </Button>
          </div>
        </div>
      </div>
    </div>
    <Button class="block shrink-0 md:hidden" @click="handleMobilePick()">
      {{ t('settings.model-selector.confirm') }}
    </Button>
  </div>
</template>
