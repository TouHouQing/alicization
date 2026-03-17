<script setup lang="ts">
import { useModelStore } from '@proj-airi/stage-ui-three'
import { Button, Callout, Checkbox, FieldInput, FieldTextArea, InputFile, SelectTab } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  isVrmCustomExpressionConfigured,
  isVrmExternalAnimationConfigured,
  useStagePerformanceStore,
} from '../../../../stores/stage-performance'
import { Container, PropertyColor, PropertyNumber, PropertyPoint } from '../../../data-pane'
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
const externalAnimationUploadFiles = ref<File[]>([])

const modelStore = useModelStore()
const {
  sceneMutationLocked,
  modelSize,
  modelOffset,
  cameraFOV,
  modelRotationY,
  cameraDistance,
  trackingMode,

  directionalLightRotation,
  directionalLightIntensity,
  directionalLightColor,

  ambientLightIntensity,
  ambientLightColor,

  hemisphereLightIntensity,
  hemisphereSkyColor,
  hemisphereGroundColor,

  envSelect,
  skyBoxIntensity,
} = storeToRefs(modelStore)
const trackingOptions = computed<{
  value: 'camera' | 'mouse' | 'none'
  label: string
  class: string
}[]>(() => [
  { value: 'camera', label: t('settings.vrm.scale-and-position.eye-tracking-mode.options.option.camera'), class: 'col-start-3' },
  { value: 'mouse', label: t('settings.vrm.scale-and-position.eye-tracking-mode.options.option.mouse'), class: 'col-start-4' },
  { value: 'none', label: t('settings.vrm.scale-and-position.eye-tracking-mode.options.option.disabled'), class: 'col-start-5' },
])

// switch between hemisphere light and sky box
const settingsLockClass = computed(() => {
  return sceneMutationLocked.value ? ['pointer-events-none', 'opacity-60'] : []
})

const envOptions = computed(() => [
  {
    value: 'hemisphere',
    label: 'Hemisphere',
    icon: envSelect.value === 'hemisphere'
      ? 'i-solar:forbidden-circle-bold rotate-45'
      : 'i-solar:forbidden-circle-linear rotate-45',
  },
  {
    value: 'skyBox',
    label: 'SkyBox',
    icon: envSelect.value === 'skyBox'
      ? 'i-solar:gallery-circle-bold'
      : 'i-solar:gallery-circle-linear',
  },
])

const externalAnimations = computed(() => {
  if (!props.modelId)
    return []

  return stagePerformanceStore.listVrmExternalAnimations(props.modelId)
})

const scannedCustomExpressionNames = computed(() => {
  if (!props.modelId)
    return []

  return stagePerformanceStore.listVrmCustomExpressionNames(props.modelId)
})

const customExpressionBindingsByName = computed(() => {
  return new Map(
    props.modelId
      ? stagePerformanceStore.listVrmCustomExpressions(props.modelId)
          .map(item => [item.expressionName, item] as const)
      : [],
  )
})

function suggestCapabilityKey(rawName: string) {
  return rawName
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 80)
}

async function handleExternalAnimationFiles(files: File[]) {
  if (!props.modelId || files.length === 0)
    return

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.vrma'))
      continue

    await stagePerformanceStore.importVrmExternalAnimation(props.modelId, file)
  }

  externalAnimationUploadFiles.value = []
}

function updateExternalAnimation(entryId: string, patch: Record<string, unknown>) {
  if (!props.modelId)
    return

  void stagePerformanceStore.updateVrmExternalAnimation(props.modelId, entryId, patch)
}

function removeExternalAnimation(entryId: string) {
  if (!props.modelId)
    return

  void stagePerformanceStore.removeVrmExternalAnimation(props.modelId, entryId)
}

function isExternalAnimationReady(entryId: string) {
  return externalAnimations.value.some(item => item.id === entryId && isVrmExternalAnimationConfigured(item))
}

function readCustomExpressionBinding(expressionName: string) {
  return customExpressionBindingsByName.value.get(expressionName)
}

function updateCustomExpression(expressionName: string, patch: Record<string, unknown>) {
  if (!props.modelId)
    return

  const current = readCustomExpressionBinding(expressionName)
  stagePerformanceStore.upsertVrmCustomExpression(props.modelId, {
    expressionName,
    facialKey: current?.facialKey ?? suggestCapabilityKey(expressionName),
    label: current?.label ?? '',
    description: current?.description ?? '',
    affectsMouth: current?.affectsMouth ?? false,
    source: 'custom',
    ...patch,
  })
}

function removeCustomExpression(expressionName: string) {
  if (!props.modelId)
    return

  stagePerformanceStore.removeVrmCustomExpression(props.modelId, expressionName)
}

function isCustomExpressionReady(expressionName: string) {
  return isVrmCustomExpressionConfigured(readCustomExpressionBinding(expressionName))
}
</script>

<template>
  <Container
    :title="t('settings.pages.models.sections.section.scene')"
    icon="i-solar:people-nearby-bold-duotone"
    :class="[
      'rounded-xl',
      'bg-white/80  dark:bg-black/75',
      'backdrop-blur-lg',
    ]"
  >
    <ColorPalette class="mb-4 mt-2" :colors="palette.map(hex => ({ hex, name: hex }))" mx-auto />
    <Button variant="secondary" :disabled="sceneMutationLocked" @click="$emit('extractColorsFromModel')">
      {{ t('settings.vrm.theme-color-from-model.button-extract.title') }}
    </Button>

    <div grid="~ cols-5 gap-1" p-2 :class="settingsLockClass">
      <PropertyPoint
        v-model:x="modelOffset.x"
        v-model:y="modelOffset.y"
        v-model:z="modelOffset.z"
        :disabled="sceneMutationLocked"
        label="Model Position"
        :x-config="{ min: -modelSize.x * 2, max: modelSize.x * 2, step: modelSize.x / 10000, label: 'X', formatValue: val => val?.toFixed(4) }"
        :y-config="{ min: -modelSize.y * 2, max: modelSize.y * 2, step: modelSize.y / 10000, label: 'Y', formatValue: val => val?.toFixed(4) }"
        :z-config="{ min: -modelSize.z * 2, max: modelSize.z * 2, step: modelSize.z / 10000, label: 'Z', formatValue: val => val?.toFixed(4) }"
      />
      <PropertyNumber
        v-model="cameraFOV"
        :config="{ min: 1, max: 180, step: 1, label: t('settings.vrm.scale-and-position.fov'), disabled: sceneMutationLocked }"
        :label="t('settings.vrm.scale-and-position.fov')"
      />
      <PropertyNumber
        v-model="cameraDistance"
        :config="{ min: modelSize.z, max: modelSize.z * 20, step: modelSize.z / 100, label: t('settings.vrm.scale-and-position.camera-distance'), formatValue: val => val?.toFixed(4), disabled: sceneMutationLocked }"
        :label="t('settings.vrm.scale-and-position.camera-distance')"
      />
      <PropertyNumber
        v-model="modelRotationY"
        :config="{ min: -180, max: 180, step: 1, label: t('settings.vrm.scale-and-position.rotation-y'), disabled: sceneMutationLocked }"
        :label="t('settings.vrm.scale-and-position.rotation-y')"
      />

      <!-- Set eye tracking mode -->
      <div class="text-xs">
        {{ t('settings.vrm.scale-and-position.eye-tracking-mode.title') }}:
      </div>
      <div />
      <template v-for="option in trackingOptions" :key="option.value">
        <Button
          :class="[option.class, 'w-auto']"
          :disabled="sceneMutationLocked"
          size="sm"
          :variant="trackingMode === option.value ? 'primary' : 'secondary'"
          :label="option.label"
          @click="trackingMode = option.value"
        />
      </template>

      <PropertyNumber
        v-model="directionalLightRotation.x"
        :config="{ min: -180, max: 180, step: 1, label: 'RotationXDeg', formatValue: val => val?.toFixed(0), disabled: sceneMutationLocked }"
        label="Directional Light Rotation - X"
      />
      <PropertyNumber
        v-model="directionalLightRotation.y"
        :config="{ min: -180, max: 180, step: 1, label: 'RotationYDeg', formatValue: val => val?.toFixed(0), disabled: sceneMutationLocked }"
        label="Directional Light Rotation - Y"
      />
      <PropertyColor
        v-model="directionalLightColor"
        :disabled="sceneMutationLocked"
        label="Directional Light Color"
      />

      <PropertyNumber
        v-model="directionalLightIntensity"
        :config="{ min: 0, max: 10, step: 0.01, label: 'Intensity', disabled: sceneMutationLocked }"
        label="Directional Light Intensity"
      />

      <PropertyNumber
        v-model="ambientLightIntensity"
        :config="{ min: 0, max: 10, step: 0.01, label: 'Intensity', disabled: sceneMutationLocked }"
        label="Ambient Light Intensity"
      />
      <PropertyColor
        v-model="ambientLightColor"
        :disabled="sceneMutationLocked"
        label="Ambient Light Color"
      />
    </div>
    <div>
      <div
        :class="[
          'px-2',
          'pt-2',
          'text-xs',
          'text-neutral-500',
          'dark:text-neutral-400',
        ]"
      >
        Environment
      </div>
      <div :class="['p-2', ...settingsLockClass]">
        <SelectTab v-model="envSelect" :options="envOptions" :disabled="sceneMutationLocked" size="sm" />
      </div>
      <div v-if="envSelect === 'hemisphere'">
        <!-- hemisphere settings -->
        <div grid="~ cols-5 gap-1" p-2 :class="settingsLockClass">
          <PropertyNumber
            v-model="hemisphereLightIntensity"
            :config="{ min: 0, max: 10, step: 0.01, label: 'Intensity', disabled: sceneMutationLocked }"
            label="Hemisphere Light Intensity"
          />
          <PropertyColor
            v-model="hemisphereSkyColor"
            :disabled="sceneMutationLocked"
            label="Hemisphere Sky Color"
          />
          <PropertyColor
            v-model="hemisphereGroundColor"
            :disabled="sceneMutationLocked"
            label="Hemisphere Ground Color"
          />
        </div>
      </div>
      <div v-else>
        <!-- skybox settings -->
        <div grid="~ cols-5 gap-1" p-2 :class="settingsLockClass">
          <PropertyNumber
            v-model="skyBoxIntensity"
            :config="{ min: 0, max: 1, step: 0.01, label: 'Intensity', disabled: sceneMutationLocked }"
            :label="t('settings.vrm.skybox.skybox-intensity')"
          />
        </div>
      </div>
    </div>
  </Container>
  <Container
    :title="t('settings.vrm.change-model.title')"
    icon="i-solar:magic-stick-3-bold-duotone"
    inner-class="text-sm"
    :class="[
      'rounded-xl',
      'bg-white/80  dark:bg-black/75',
      'backdrop-blur-lg',
    ]"
  >
    <Callout :label="t('settings.vrm.scale-and-position.model-info-title')">
      <div>
        <div class="text-sm text-neutral-600 space-y-1 dark:text-neutral-400">
          <div class="flex justify-between">
            <span>{{ t('settings.vrm.scale-and-position.model-info-x') }}</span>
            <span>{{ modelSize.x.toFixed(4) }}</span>
          </div>
          <div class="flex justify-between">
            <span>{{ t('settings.vrm.scale-and-position.model-info-y') }}</span>
            <span>{{ modelSize.y.toFixed(4) }}</span>
          </div>
          <div class="flex justify-between">
            <span>{{ t('settings.vrm.scale-and-position.model-info-z') }}</span>
            <span>{{ modelSize.z.toFixed(4) }}</span>
          </div>
        </div>
      </div>
    </Callout>
    <Callout
      theme="lime"
      label="Tips!"
    >
      <div class="text-sm text-neutral-600 space-y-1 dark:text-neutral-400">
        {{ t('settings.vrm.scale-and-position.tips') }}
      </div>
    </Callout>
  </Container>
  <Container
    title="External Animations"
    icon="i-solar:video-frame-play-horizontal-bold-duotone"
    :class="[
      'rounded-xl',
      'bg-white/80  dark:bg-black/75',
      'backdrop-blur-lg',
    ]"
  >
    <Callout label="Model-side sidecar .vrma pool">
      <div class="text-sm text-neutral-600 dark:text-neutral-400">
        Import `.vrma` files for the current VRM model and map each one to an Alicization `actionCue`. Entries stay hidden from Alicization until `Action Key`, `Label`, and `Description` are all filled in.
      </div>
    </Callout>
    <InputFile
      v-model="externalAnimationUploadFiles"
      accept=".vrma"
      multiple
      @update:model-value="handleExternalAnimationFiles"
    />
    <div
      v-if="externalAnimations.length === 0"
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
      No external `.vrma` animations mapped for this model yet.
    </div>
    <div
      v-for="item in externalAnimations"
      :key="item.id"
      :class="[
        'rounded-xl',
        'border',
        'border-neutral-200',
        'bg-white/50',
        'p-4',
        'dark:border-neutral-700',
        'dark:bg-black/25',
      ]"
    >
      <div :class="['mb-3 flex items-center justify-between gap-3']">
        <div>
          <div :class="['text-sm font-medium']">
            {{ item.fileName }}
          </div>
          <div :class="['text-xs text-neutral-500 dark:text-neutral-400']">
            Imported {{ new Date(item.importedAt).toLocaleString() }}
          </div>
        </div>
        <div :class="['flex items-center gap-2']">
          <div
            :class="[
              'rounded-full',
              'px-2 py-1 text-xs font-medium',
              isExternalAnimationReady(item.id)
                ? 'bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
            ]"
          >
            {{ isExternalAnimationReady(item.id) ? 'Exposed to Alicization' : 'Hidden until mapped' }}
          </div>
          <Button variant="secondary" size="sm" @click="removeExternalAnimation(item.id)">
            Remove
          </Button>
        </div>
      </div>
      <div :class="['grid gap-3 lg:grid-cols-2']">
        <FieldInput
          :model-value="item.actionKey"
          label="Action Key"
          description="This semantic key is exposed to the LLM as an available actionCue."
          placeholder="wave"
          @update:model-value="value => updateExternalAnimation(item.id, { actionKey: value })"
        />
        <FieldInput
          :model-value="item.label"
          label="Label"
          description="Human-readable action name shown in the manifest."
          placeholder="Wave"
          @update:model-value="value => updateExternalAnimation(item.id, { label: value })"
        />
      </div>
      <FieldTextArea
        :model-value="item.description"
        label="Description"
        description="Briefly describe what this action communicates so Alicization can choose it correctly."
        placeholder="A friendly hand wave for greeting or light acknowledgment."
        @update:model-value="value => updateExternalAnimation(item.id, { description: value })"
      />
    </div>
  </Container>
  <Container
    title="Custom Expressions"
    icon="i-solar:mask-happly-bold-duotone"
    :class="[
      'rounded-xl',
      'bg-white/80  dark:bg-black/75',
      'backdrop-blur-lg',
    ]"
  >
    <Callout label="Semantic unpacking for VRM custom expressions">
      <div class="text-sm text-neutral-600 dark:text-neutral-400">
        Standard preset expressions are handled automatically. Only custom expression names scanned from the current model are listed here for manual semantic mapping. Entries stay hidden from Alicization until `Facial Key`, `Label`, and `Description` are all filled in.
      </div>
    </Callout>
    <div
      v-if="scannedCustomExpressionNames.length === 0"
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
      No custom VRM expressions detected yet. Load the model preview once to populate this list.
    </div>
    <div
      v-for="expressionName in scannedCustomExpressionNames"
      :key="expressionName"
      :class="[
        'rounded-xl',
        'border',
        'border-neutral-200',
        'bg-white/50',
        'p-4',
        'dark:border-neutral-700',
        'dark:bg-black/25',
      ]"
    >
      <div :class="['mb-3 flex items-center justify-between gap-3']">
        <div>
          <div :class="['text-sm font-medium']">
            {{ expressionName }}
          </div>
          <div :class="['text-xs text-neutral-500 dark:text-neutral-400']">
            Raw VRM custom expression name
          </div>
        </div>
        <div :class="['flex items-center gap-2']">
          <div
            :class="[
              'rounded-full',
              'px-2 py-1 text-xs font-medium',
              isCustomExpressionReady(expressionName)
                ? 'bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
            ]"
          >
            {{ isCustomExpressionReady(expressionName) ? 'Exposed to Alicization' : 'Hidden until mapped' }}
          </div>
          <Button variant="secondary" size="sm" @click="removeCustomExpression(expressionName)">
            Clear Mapping
          </Button>
        </div>
      </div>
      <div :class="['grid gap-3 lg:grid-cols-2']">
        <FieldInput
          :model-value="readCustomExpressionBinding(expressionName)?.facialKey"
          label="Facial Key"
          description="Dynamic semantic cue exposed to the LLM as facialCue."
          :placeholder="suggestCapabilityKey(expressionName)"
          @update:model-value="value => updateCustomExpression(expressionName, { facialKey: value })"
        />
        <FieldInput
          :model-value="readCustomExpressionBinding(expressionName)?.label"
          label="Label"
          description="Human-readable label shown in the manifest."
          :placeholder="expressionName"
          @update:model-value="value => updateCustomExpression(expressionName, { label: value })"
        />
      </div>
      <FieldTextArea
        :model-value="readCustomExpressionBinding(expressionName)?.description"
        label="Description"
        description="Describe the visible facial effect so Alicization can choose it deliberately."
        placeholder="Starry eyes or an exaggerated sparkle effect for strong admiration."
        @update:model-value="value => updateCustomExpression(expressionName, { description: value })"
      />
      <div :class="['mt-3 flex items-center justify-between rounded-lg bg-neutral-100/80 px-3 py-2 dark:bg-neutral-900/60']">
        <div>
          <div :class="['text-sm font-medium']">
            Affects Mouth
          </div>
          <div :class="['text-xs text-neutral-500 dark:text-neutral-400']">
            Enable this if the custom expression modifies mouth shape and should yield to viseme override while speaking.
          </div>
        </div>
        <Checkbox
          :model-value="readCustomExpressionBinding(expressionName)?.affectsMouth ?? false"
          @update:model-value="value => updateCustomExpression(expressionName, { affectsMouth: value })"
        />
      </div>
    </div>
  </Container>
</template>
