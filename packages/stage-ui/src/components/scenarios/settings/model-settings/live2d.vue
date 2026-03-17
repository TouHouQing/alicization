<script setup lang="ts">
import { defaultModelParameters, useLive2d } from '@proj-airi/stage-ui-live2d'
import { OPFSCache } from '@proj-airi/stage-ui-live2d/utils/opfs-loader'
import { Button, Checkbox, FieldInput, FieldRange, FieldTextArea, SelectTab } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useSettings } from '../../../../stores/settings'
import { useStagePerformanceStore } from '../../../../stores/stage-performance'
import { Section } from '../../../layouts'
import { ColorPalette } from '../../../widgets'

const props = defineProps<{
  modelId?: string
  palette: string[]
}>()
defineEmits<{
  (e: 'extractColorsFromModel'): void
}>()

const { t } = useI18n()
const stagePerformanceStore = useStagePerformanceStore()

const settings = useSettings()
const {
  live2dDisableFocus,
  live2dIdleAnimationEnabled,
  live2dAutoBlinkEnabled,
  live2dForceAutoBlinkEnabled,
  live2dShadowEnabled,
  live2dMaxFps,
} = storeToRefs(settings)

const live2d = useLive2d()
const {
  scale,
  position,
  modelParameters,
  currentMotion,
} = storeToRefs(live2d)

const selectedRuntimeMotion = ref<string>('')
const selectedRuntimeMotionName = ref<string>('')
const runtimeMotions = ref<Array<{ name: string, fullPath: string, displayPath: string, group: string, index: number }>>([])
const showMotionSelector = ref(false)
const fpsOptions = computed(() => [
  { value: 0, label: t('settings.live2d.fps.options.unlimited') },
  { value: 60, label: '60' },
  { value: 30, label: '30' },
])
const currentModelAvailableMotions = computed(() => live2d.getAvailableMotionsForModel(props.modelId))
const currentModelActionBindings = computed(() => stagePerformanceStore.listLive2DActions(props.modelId ?? ''))

// Get available runtime motions from the model
onMounted(() => {
  // Listen for available motions updates
  watch(() => live2d.availableMotions, (motions) => {
    // Show all motions with their full paths
    runtimeMotions.value = motions.map(m => ({
      name: m.fileName.split('/').pop() || m.fileName,
      fullPath: m.fileName, // Full path like "hiyori_free_zh/runtime/motions/idle.motion3.json"
      displayPath: m.fileName, // Show full path for clarity
      group: m.motionName,
      index: m.motionIndex,
    }))

    console.info('Available motions:', runtimeMotions.value)
  }, { immediate: true })

  // Restore selected motion
  const savedPath = localStorage.getItem('selected-runtime-motion')
  const savedName = localStorage.getItem('selected-runtime-motion-name')
  if (savedPath) {
    selectedRuntimeMotion.value = savedPath
  }
  if (savedName) {
    selectedRuntimeMotionName.value = savedName
  }

  // Add click outside handler
  document.addEventListener('click', handleClickOutside)
})

// Function to reset all parameters to default values
function resetToDefaultParameters() {
  modelParameters.value = { ...defaultModelParameters }
}

const clearingCache = ref(false)

async function clearModelCache() {
  clearingCache.value = true
  try {
    await OPFSCache.clearAll()
  }
  finally {
    clearingCache.value = false
  }
}

// Runtime motion selection handlers
function handleMotionSelect(motion: any) {
  selectedRuntimeMotion.value = motion.displayPath // Store full path
  selectedRuntimeMotionName.value = motion.name // Store just the filename for display
  localStorage.setItem('selected-runtime-motion', motion.displayPath)
  localStorage.setItem('selected-runtime-motion-name', motion.name)
  localStorage.setItem('selected-runtime-motion-group', motion.group)
  localStorage.setItem('selected-runtime-motion-index', motion.index.toString())

  // Enable idle animation
  live2dIdleAnimationEnabled.value = true

  // Set the current motion to the selected runtime motion
  currentMotion.value = { group: motion.group, index: motion.index }

  showMotionSelector.value = false

  console.info('✅ Selected runtime motion:', motion.name)
  console.info('Full path:', motion.displayPath)
  console.info('Group:', motion.group, 'Index:', motion.index)
}

function toggleMotionSelector() {
  showMotionSelector.value = !showMotionSelector.value
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('[data-motion-selector]')) {
    showMotionSelector.value = false
  }
}

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

function suggestActionKey(rawName: string) {
  return rawName
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 80)
}

function readActionBinding(fileName: string) {
  return currentModelActionBindings.value.find(item => item.fileName === fileName)
}

function updateActionBinding(
  motion: { fileName: string, motionName: string, motionIndex: number },
  patch: Record<string, unknown>,
) {
  if (!props.modelId)
    return

  stagePerformanceStore.upsertLive2DAction(props.modelId, {
    fileName: motion.fileName,
    motionName: motion.motionName,
    motionIndex: motion.motionIndex,
    actionKey: readActionBinding(motion.fileName)?.actionKey ?? suggestActionKey(motion.motionName || motion.fileName),
    label: readActionBinding(motion.fileName)?.label ?? motion.motionName,
    description: readActionBinding(motion.fileName)?.description ?? '',
    source: 'live2d-motion',
    ...patch,
  })
}

function removeActionBinding(fileName: string) {
  if (!props.modelId)
    return

  stagePerformanceStore.removeLive2DAction(props.modelId, fileName)
}

// async function patchMotionMap(source: File, motionMap: Record<string, string>): Promise<File> {
//   if (!Object.keys(motionMap).length)
//     return source

//   const jsZip = new JSZip()
//   const zip = await jsZip.loadAsync(source)
//   const fileName = Object.keys(zip.files).find(key => key.endsWith('model3.json'))
//   if (!fileName) {
//     throw new Error('model3.json not found')
//   }

//   const model3Json = await zip.file(fileName)!.async('string')
//   const model3JsonObject = JSON.parse(model3Json)

//   const motions: Record<string, { File: string }[]> = {}
//   Object.entries(motionMap).forEach(([key, value]) => {
//     if (motions[value]) {
//       motions[value].push({ File: key })
//       return
//     }
//     motions[value] = [{ File: key }]
//   })

//   model3JsonObject.FileReferences.Motions = motions

//   zip.file(fileName, JSON.stringify(model3JsonObject, null, 2))
//   const zipBlob = await zip.generateAsync({ type: 'blob' })

//   return new File([zipBlob], source.name, {
//     type: source.type,
//     lastModified: source.lastModified,
//   })
// }

// async function saveMotionMap() {
//   const fileFromIndexedDB = await localforage.getItem<File>('live2dModel')
//   if (!fileFromIndexedDB) {
//     return
//   }

//   const patchedFile = await patchMotionMap(fileFromIndexedDB, motionMap.value)
//   modelFile.value = patchedFile
// }
</script>

<template>
  <Section
    :title="t('settings.live2d.scale-and-position.title')"
    icon="i-solar:scale-bold-duotone"
    :class="[
      'rounded-xl',
      'bg-white/80  dark:bg-black/75',
      'backdrop-blur-lg',
    ]"
    size="sm"
    :expand="true"
  >
    <FieldRange v-model="scale" as="div" :min="0.1" :max="3" :step="0.01" :label="t('settings.live2d.scale-and-position.scale')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.scale-and-position.scale') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => scale = 1">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
    <FieldRange v-model="position.x" as="div" :min="-3000" :max="3000" :step="1" :label="t('settings.live2d.scale-and-position.x')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.scale-and-position.x') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => position.x = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
    <FieldRange v-model="position.y" as="div" :min="-3000" :max="3000" :step="1" :label="t('settings.live2d.scale-and-position.y')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.scale-and-position.y') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => position.y = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
  </Section>
  <Section
    :title="t('settings.live2d.theme-color-from-model.title')"
    icon="i-solar:magic-stick-3-bold-duotone"
    inner-class="text-sm"
    :class="[
      'rounded-xl',
      'bg-white/80  dark:bg-black/75',
      'backdrop-blur-lg',
    ]"
    size="sm"
    :expand="false"
  >
    <ColorPalette class="mb-4 mt-2" :colors="palette.map(hex => ({ hex, name: hex }))" mx-auto />
    <Button variant="secondary" @click="$emit('extractColorsFromModel')">
      {{ t('settings.live2d.theme-color-from-model.button-extract.title') }}
    </Button>
  </Section>
  <Section
    :title="t('settings.live2d.action-mapping.title')"
    icon="i-solar:gesture-bold-duotone"
    :class="[
      'rounded-xl',
      'bg-white/80  dark:bg-black/75',
      'backdrop-blur-lg',
    ]"
    size="sm"
    :expand="false"
  >
    <div
      v-if="currentModelAvailableMotions.length === 0"
      :class="[
        'rounded-xl',
        'border',
        'border-dashed',
        'border-neutral-200',
        'bg-white/40',
        'p-4',
        'text-sm',
        'text-neutral-500',
        'dark:border-neutral-700',
        'dark:bg-black/20',
        'dark:text-neutral-400',
      ]"
    >
      {{ t('settings.live2d.action-mapping.empty') }}
    </div>
    <div
      v-for="motion in currentModelAvailableMotions"
      :key="motion.fileName"
      :class="[
        'mb-3 rounded-xl border border-neutral-200 bg-white/50 p-4 dark:border-neutral-700 dark:bg-black/25',
      ]"
    >
      <div :class="['mb-3 flex items-center justify-between gap-3']">
        <div>
          <div :class="['text-sm font-medium']">
            {{ motion.motionName }} #{{ motion.motionIndex }}
          </div>
          <div :class="['text-xs text-neutral-500 dark:text-neutral-400']">
            {{ motion.fileName }}
          </div>
        </div>
        <div :class="['flex items-center gap-2']">
          <Button size="sm" variant="secondary" @click="currentMotion = { group: motion.motionName, index: motion.motionIndex }">
            {{ t('settings.live2d.action-mapping.actions.preview') }}
          </Button>
          <Button size="sm" variant="secondary" @click="removeActionBinding(motion.fileName)">
            {{ t('settings.live2d.action-mapping.actions.clear') }}
          </Button>
        </div>
      </div>
      <div :class="['grid gap-3 lg:grid-cols-2']">
        <FieldInput
          :model-value="readActionBinding(motion.fileName)?.actionKey"
          :label="t('settings.live2d.action-mapping.fields.action-key.label')"
          :description="t('settings.live2d.action-mapping.fields.action-key.description')"
          :placeholder="suggestActionKey(motion.motionName)"
          @update:model-value="value => updateActionBinding(motion, { actionKey: value })"
        />
        <FieldInput
          :model-value="readActionBinding(motion.fileName)?.label"
          :label="t('settings.live2d.action-mapping.fields.label.label')"
          :description="t('settings.live2d.action-mapping.fields.label.description')"
          :placeholder="motion.motionName"
          @update:model-value="value => updateActionBinding(motion, { label: value })"
        />
      </div>
      <FieldTextArea
        :model-value="readActionBinding(motion.fileName)?.description"
        :label="t('settings.live2d.action-mapping.fields.description.label')"
        :description="t('settings.live2d.action-mapping.fields.description.description')"
        :placeholder="t('settings.live2d.action-mapping.fields.description.placeholder')"
        @update:model-value="value => updateActionBinding(motion, { description: value })"
      />
    </div>
  </Section>
  <!-- <Section
    v-if="modelFile"
    :title="t('settings.live2d.edit-motion-map.title')"
    icon="i-solar:face-scan-circle-bold-duotone"
    :class="[
      'rounded-xl',
      'bg-white/80  dark:bg-black/75',
      'backdrop-blur-lg',
    ]"
    size="sm"
    :expand="false"
  >
    <div v-for="motion in availableMotions" :key="motion.fileName" flex items-center justify-between text-sm>
      <span font-medium font-mono>{{ motion.fileName }}</span>

      <div flex gap-2>
        <select v-model="motionMap[motion.fileName]">
          <option v-for="emotion in Object.keys(Emotion)" :key="emotion">
            {{ emotion }}
          </option>
        </select>

        <Button
          class="form-control"
          @click="currentMotion = { group: motion.motionName, index: motion.motionIndex }"
        >
          Play
        </Button>
      </div>
    </div>
    <Button @click="saveMotionMap">
      Save and patch
    </Button>
    <a
      mt-2 block :href="exportObjectUrl"
      :download="`${modelFile?.name || 'live2d'}-motion-edited.zip`"
    >
      <Button w-full>Export</button>
    </a>
  </Section> -->
  <Section
    :title="t('settings.live2d.focus.title')"
    icon="i-solar:eye-scan-bold-duotone"
    :class="[
      'rounded-xl',
      'bg-white/80  dark:bg-black/75',
      'backdrop-blur-lg',
    ]"
    size="sm"
    :expand="false"
  >
    <Checkbox
      v-model="live2dDisableFocus"
      :label="t('settings.live2d.focus.button-disable.title')"
    />
  </Section>
  <Section
    :title="t('settings.live2d.parameters.title')"
    icon="i-solar:settings-bold-duotone"
    :class="[
      'rounded-xl',
      'bg-white/80  dark:bg-black/75',
      'backdrop-blur-lg',
    ]"
    size="sm"
    :expand="false"
  >
    <div flex items-center justify-between>
      <span text-sm text-neutral-600 dark:text-neutral-400>{{ t('settings.live2d.parameters.idle-animation') }}</span>
      <div data-motion-selector relative flex flex-col items-end gap-1>
        <button

          :title="selectedRuntimeMotion"
          flex items-center gap-2 border rounded bg-neutral-100 px-4 py-2 text-sm text-neutral-700 font-medium transition-colors dark:border-neutral-700 dark:bg-neutral-800 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-700
          @click="toggleMotionSelector"
        >
          <span max-w-32 truncate>{{ selectedRuntimeMotionName || t('settings.live2d.parameters.motion-selector.select') }}</span>
          <div
            :class="showMotionSelector ? 'i-solar:alt-arrow-up-line-duotone' : 'i-solar:alt-arrow-down-line-duotone'"
            text-xs transition-transform
          />
        </button>

        <!-- Dropdown menu -->
        <div
          v-if="showMotionSelector"

          bg="white dark:neutral-800"
          border="1 neutral-200 dark:neutral-700"
          absolute right-0 top-10 z-50 max-h-80 min-w-64 overflow-y-auto rounded-lg shadow-lg
        >
          <div v-if="runtimeMotions.length === 0" p-4 text-sm text-neutral-500 dark:text-neutral-400>
            {{ t('settings.live2d.parameters.motion-selector.empty') }}
          </div>
          <button
            v-for="motion in runtimeMotions"
            :key="motion.fullPath"
            w-full px-4 py-2.5 text-left
            hover:bg="neutral-100 dark:neutral-700"
            transition-colors
            :class="{
              'bg-neutral-100 dark:bg-neutral-700': selectedRuntimeMotion === motion.displayPath,
            }"
            @click="handleMotionSelect(motion)"
          >
            <div text-sm text-neutral-900 font-medium dark:text-neutral-100>
              {{ motion.name }}
            </div>
            <div truncate text-xs text-neutral-500 dark:text-neutral-400>
              {{ motion.displayPath }}
            </div>
          </button>
        </div>
      </div>
    </div>

    <div :class="['mt-4', 'flex', 'items-center', 'justify-between']">
      <div :class="['flex', 'flex-col', 'gap-1']">
        <span :class="['text-sm', 'text-neutral-600', 'dark:text-neutral-400']">
          {{ t('settings.live2d.fps.title') }}
        </span>
        <span :class="['text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
          {{ t('settings.live2d.fps.description') }}
        </span>
      </div>
      <SelectTab v-model="live2dMaxFps" :options="fpsOptions" size="sm" :class="['w-48', 'shrink-0']" />
    </div>

    <div mt-4 flex items-center justify-between>
      <span text-sm text-neutral-600 dark:text-neutral-400>{{ t('settings.live2d.parameters.auto-blink') }}</span>
      <Checkbox v-model="live2dAutoBlinkEnabled" />
    </div>

    <div mt-3 flex items-center justify-between>
      <span text-sm text-neutral-600 dark:text-neutral-400>{{ t('settings.live2d.parameters.force-auto-blink') }}</span>
      <Checkbox v-model="live2dForceAutoBlinkEnabled" />
    </div>

    <div mt-4 flex items-center justify-between>
      <span text-sm text-neutral-600 dark:text-neutral-400>{{ t('settings.live2d.parameters.shadow') }}</span>
      <Checkbox v-model="live2dShadowEnabled" />
    </div>

    <button

      mt-4 w-full border rounded bg-neutral-100 px-4 py-2 text-sm text-neutral-700 font-medium transition-colors dark:border-neutral-700 dark:bg-neutral-800 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-700
      @click="resetToDefaultParameters"
    >
      {{ t('settings.live2d.parameters.reset-to-default') }}
    </button>

    <button
      mt-2 w-full border rounded bg-neutral-100 px-4 py-2 text-sm text-neutral-700 font-medium transition-colors dark:border-neutral-700 dark:bg-neutral-800 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-700
      :disabled="clearingCache"
      @click="clearModelCache"
    >
      {{ clearingCache ? t('settings.live2d.parameters.clearing-cache') : t('settings.live2d.parameters.clear-cache') }}
    </button>

    <!-- Head Rotation -->
    <div mb-2 mt-4 text-xs text-neutral-500 font-semibold dark:text-neutral-400>
      {{ t('settings.live2d.parameters.groups.head-rotation') }}
    </div>
    <FieldRange v-model="modelParameters.angleX" as="div" :min="-30" :max="30" :step="0.1" :label="t('settings.live2d.parameters.fields.angle-x')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.angle-x') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.angleX = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
    <FieldRange v-model="modelParameters.angleY" as="div" :min="-30" :max="30" :step="0.1" :label="t('settings.live2d.parameters.fields.angle-y')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.angle-y') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.angleY = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
    <FieldRange v-model="modelParameters.angleZ" as="div" :min="-30" :max="30" :step="0.1" :label="t('settings.live2d.parameters.fields.angle-z')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.angle-z') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.angleZ = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>

    <!-- Eyes -->
    <div mb-2 mt-4 text-xs text-neutral-500 font-semibold dark:text-neutral-400>
      {{ t('settings.live2d.parameters.groups.eyes') }}
    </div>
    <FieldRange v-model="modelParameters.leftEyeOpen" as="div" :min="0" :max="1" :step="0.01" :label="t('settings.live2d.parameters.fields.left-eye-open')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.left-eye-open') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.leftEyeOpen = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
    <FieldRange v-model="modelParameters.rightEyeOpen" as="div" :min="0" :max="1" :step="0.01" :label="t('settings.live2d.parameters.fields.right-eye-open')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.right-eye-open') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.rightEyeOpen = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
    <FieldRange v-model="modelParameters.leftEyeSmile" as="div" :min="0" :max="1" :step="0.01" :label="t('settings.live2d.parameters.fields.left-eye-smile')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.left-eye-smile') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.leftEyeSmile = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
    <FieldRange v-model="modelParameters.rightEyeSmile" as="div" :min="0" :max="1" :step="0.01" :label="t('settings.live2d.parameters.fields.right-eye-smile')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.right-eye-smile') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.rightEyeSmile = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>

    <!-- Eyebrows -->
    <div mb-2 mt-4 text-xs text-neutral-500 font-semibold dark:text-neutral-400>
      {{ t('settings.live2d.parameters.groups.eyebrows') }}
    </div>
    <FieldRange v-model="modelParameters.leftEyebrowLR" as="div" :min="-1" :max="1" :step="0.01" :label="t('settings.live2d.parameters.fields.left-eyebrow-lr')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.left-eyebrow-lr') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.leftEyebrowLR = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
    <FieldRange v-model="modelParameters.rightEyebrowLR" as="div" :min="-1" :max="1" :step="0.01" :label="t('settings.live2d.parameters.fields.right-eyebrow-lr')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.right-eyebrow-lr') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.rightEyebrowLR = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
    <FieldRange v-model="modelParameters.leftEyebrowY" as="div" :min="-1" :max="1" :step="0.01" :label="t('settings.live2d.parameters.fields.left-eyebrow-y')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.left-eyebrow-y') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.leftEyebrowY = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
    <FieldRange v-model="modelParameters.rightEyebrowY" as="div" :min="-1" :max="1" :step="0.01" :label="t('settings.live2d.parameters.fields.right-eyebrow-y')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.right-eyebrow-y') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.rightEyebrowY = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
    <FieldRange v-model="modelParameters.leftEyebrowAngle" as="div" :min="-1" :max="1" :step="0.01" :label="t('settings.live2d.parameters.fields.left-eyebrow-angle')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.left-eyebrow-angle') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.leftEyebrowAngle = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
    <FieldRange v-model="modelParameters.rightEyebrowAngle" as="div" :min="-1" :max="1" :step="0.01" :label="t('settings.live2d.parameters.fields.right-eyebrow-angle')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.right-eyebrow-angle') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.rightEyebrowAngle = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
    <FieldRange v-model="modelParameters.leftEyebrowForm" as="div" :min="-1" :max="1" :step="0.01" :label="t('settings.live2d.parameters.fields.left-eyebrow-form')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.left-eyebrow-form') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.leftEyebrowForm = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
    <FieldRange v-model="modelParameters.rightEyebrowForm" as="div" :min="-1" :max="1" :step="0.01" :label="t('settings.live2d.parameters.fields.right-eyebrow-form')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.right-eyebrow-form') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.rightEyebrowForm = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>

    <!-- Mouth -->
    <div mb-2 mt-4 text-xs text-neutral-500 font-semibold dark:text-neutral-400>
      {{ t('settings.live2d.parameters.groups.mouth') }}
    </div>
    <FieldRange v-model="modelParameters.mouthOpen" as="div" :min="0" :max="1" :step="0.01" :label="t('settings.live2d.parameters.fields.mouth-open')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.mouth-open') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.mouthOpen = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
    <FieldRange v-model="modelParameters.mouthForm" as="div" :min="-1" :max="1" :step="0.01" :label="t('settings.live2d.parameters.fields.mouth-form')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.mouth-form') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.mouthForm = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>

    <!-- Face -->
    <div mb-2 mt-4 text-xs text-neutral-500 font-semibold dark:text-neutral-400>
      {{ t('settings.live2d.parameters.groups.face') }}
    </div>
    <FieldRange v-model="modelParameters.cheek" as="div" :min="0" :max="1" :step="0.01" :label="t('settings.live2d.parameters.fields.cheek')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.cheek') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.cheek = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>

    <!-- Body -->
    <div mb-2 mt-4 text-xs text-neutral-500 font-semibold dark:text-neutral-400>
      {{ t('settings.live2d.parameters.groups.body') }}
    </div>
    <FieldRange v-model="modelParameters.bodyAngleX" as="div" :min="-10" :max="10" :step="0.1" :label="t('settings.live2d.parameters.fields.body-angle-x')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.body-angle-x') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.bodyAngleX = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
    <FieldRange v-model="modelParameters.bodyAngleY" as="div" :min="-10" :max="10" :step="0.1" :label="t('settings.live2d.parameters.fields.body-angle-y')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.body-angle-y') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.bodyAngleY = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
    <FieldRange v-model="modelParameters.bodyAngleZ" as="div" :min="-10" :max="10" :step="0.1" :label="t('settings.live2d.parameters.fields.body-angle-z')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.body-angle-z') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.bodyAngleZ = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
    <FieldRange v-model="modelParameters.breath" as="div" :min="0" :max="1" :step="0.01" :label="t('settings.live2d.parameters.fields.breath')">
      <template #label>
        <div flex items-center>
          <div>{{ t('settings.live2d.parameters.fields.breath') }}</div>
          <button px-2 text-xs outline-none :title="t('settings.live2d.common.reset-value-to-default')" @click="() => modelParameters.breath = 0">
            <div i-solar:forward-linear transform-scale-x--100 text="neutral-500 dark:neutral-400" />
          </button>
        </div>
      </template>
    </FieldRange>
  </Section>
</template>
