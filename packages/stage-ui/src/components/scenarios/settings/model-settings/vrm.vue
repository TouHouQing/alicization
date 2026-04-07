<script setup lang="ts">
import type { StageEmbodimentCanonicalEmotion } from '@proj-alicization/stage-shared'

import {
  resolveStageEmbodimentCueCandidates,
  resolveStageEmbodimentVrmBaseExpressionCandidates,
  stageEmbodimentCanonicalEmotions,
} from '@proj-alicization/stage-shared'
import { useModelStore } from '@proj-alicization/stage-ui-three'
import { Button, Callout, Checkbox, FieldInput, FieldTextArea, InputFile, SelectTab } from '@proj-alicization/ui'
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
    label: t('settings.vrm.environment.options.hemisphere'),
    icon: envSelect.value === 'hemisphere'
      ? 'i-solar:forbidden-circle-bold rotate-45'
      : 'i-solar:forbidden-circle-linear rotate-45',
  },
  {
    value: 'skyBox',
    label: t('settings.vrm.environment.options.skybox'),
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
const embodimentEmotionOptions = computed(() => stageEmbodimentCanonicalEmotions.map(emotion => ({
  value: emotion,
  label: t(`settings.vrm.embodiment.emotions.${emotion}`),
})))
const currentModelActionCuePreferences = computed(() => (
  props.modelId
    ? stagePerformanceStore.listEmotionActionCuePreferences(props.modelId)
    : {}
))
const currentModelEmotionExpressionAliases = computed(() => (
  props.modelId
    ? stagePerformanceStore.listVrmEmotionExpressionAliases(props.modelId)
    : {}
))
const currentModelEmotionFacialCuePreferences = computed(() => (
  props.modelId
    ? stagePerformanceStore.listVrmEmotionFacialCuePreferences(props.modelId)
    : {}
))

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

function formatEmbodimentAliasInput(aliases?: string[]) {
  return aliases?.join(', ') ?? ''
}

function parseEmbodimentAliasInput(rawValue?: string) {
  return (rawValue ?? '')
    .split(',')
    .map(alias => alias.trim())
    .filter(Boolean)
}

function readEmotionExpressionAliasInput(emotion: StageEmbodimentCanonicalEmotion) {
  return formatEmbodimentAliasInput(currentModelEmotionExpressionAliases.value[emotion])
}

function resolveDefaultEmotionExpressionAliasesText(emotion: StageEmbodimentCanonicalEmotion) {
  return formatEmbodimentAliasInput(resolveStageEmbodimentVrmBaseExpressionCandidates(emotion))
}

function resolveEffectiveEmotionExpressionAliasesText(emotion: StageEmbodimentCanonicalEmotion) {
  return formatEmbodimentAliasInput(stagePerformanceStore.resolveVrmEmotionExpressionAliases(props.modelId ?? '', emotion))
}

function readEmotionFacialCuePreferenceInput(emotion: StageEmbodimentCanonicalEmotion) {
  return formatEmbodimentAliasInput(currentModelEmotionFacialCuePreferences.value[emotion])
}

function readEmotionActionCuePreferenceInput(emotion: StageEmbodimentCanonicalEmotion) {
  return formatEmbodimentAliasInput(currentModelActionCuePreferences.value[emotion])
}

function resolveSuggestedEmotionFacialCueText(emotion: StageEmbodimentCanonicalEmotion) {
  return formatEmbodimentAliasInput(resolveStageEmbodimentCueCandidates({
    emotion,
  }).facialCueCandidates)
}

function resolveSuggestedEmotionActionCueText(emotion: StageEmbodimentCanonicalEmotion) {
  return formatEmbodimentAliasInput(resolveStageEmbodimentCueCandidates({
    emotion,
  }).actionCueCandidates)
}

function updateEmotionExpressionAliases(emotion: StageEmbodimentCanonicalEmotion, rawValue?: string) {
  if (!props.modelId)
    return

  stagePerformanceStore.setVrmEmotionExpressionAliases(props.modelId, emotion, parseEmbodimentAliasInput(rawValue))
}

function updateEmotionFacialCuePreferences(emotion: StageEmbodimentCanonicalEmotion, rawValue?: string) {
  if (!props.modelId)
    return

  stagePerformanceStore.setVrmEmotionFacialCuePreferences(props.modelId, emotion, parseEmbodimentAliasInput(rawValue))
}

function updateEmotionActionCuePreferences(emotion: StageEmbodimentCanonicalEmotion, rawValue?: string) {
  if (!props.modelId)
    return

  stagePerformanceStore.setEmotionActionCuePreferences(props.modelId, emotion, parseEmbodimentAliasInput(rawValue))
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
        :label="t('settings.vrm.scene-controls.model-position')"
        :x-config="{ min: -modelSize.x * 2, max: modelSize.x * 2, step: modelSize.x / 10000, label: t('settings.vrm.scene-controls.axis.x'), formatValue: val => val?.toFixed(4) }"
        :y-config="{ min: -modelSize.y * 2, max: modelSize.y * 2, step: modelSize.y / 10000, label: t('settings.vrm.scene-controls.axis.y'), formatValue: val => val?.toFixed(4) }"
        :z-config="{ min: -modelSize.z * 2, max: modelSize.z * 2, step: modelSize.z / 10000, label: t('settings.vrm.scene-controls.axis.z'), formatValue: val => val?.toFixed(4) }"
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
        :config="{ min: -180, max: 180, step: 1, label: t('settings.vrm.scene-controls.directional-light.rotation-x-short'), formatValue: val => val?.toFixed(0), disabled: sceneMutationLocked }"
        :label="t('settings.vrm.scene-controls.directional-light.rotation-x')"
      />
      <PropertyNumber
        v-model="directionalLightRotation.y"
        :config="{ min: -180, max: 180, step: 1, label: t('settings.vrm.scene-controls.directional-light.rotation-y-short'), formatValue: val => val?.toFixed(0), disabled: sceneMutationLocked }"
        :label="t('settings.vrm.scene-controls.directional-light.rotation-y')"
      />
      <PropertyColor
        v-model="directionalLightColor"
        :disabled="sceneMutationLocked"
        :label="t('settings.vrm.scene-controls.directional-light.color')"
      />

      <PropertyNumber
        v-model="directionalLightIntensity"
        :config="{ min: 0, max: 10, step: 0.01, label: t('settings.vrm.scene-controls.common.intensity'), disabled: sceneMutationLocked }"
        :label="t('settings.vrm.scene-controls.directional-light.intensity')"
      />

      <PropertyNumber
        v-model="ambientLightIntensity"
        :config="{ min: 0, max: 10, step: 0.01, label: t('settings.vrm.scene-controls.common.intensity'), disabled: sceneMutationLocked }"
        :label="t('settings.vrm.scene-controls.ambient-light.intensity')"
      />
      <PropertyColor
        v-model="ambientLightColor"
        :disabled="sceneMutationLocked"
        :label="t('settings.vrm.scene-controls.ambient-light.color')"
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
        {{ t('settings.vrm.environment.title') }}
      </div>
      <div :class="['p-2', ...settingsLockClass]">
        <SelectTab v-model="envSelect" :options="envOptions" :disabled="sceneMutationLocked" size="sm" />
      </div>
      <div v-if="envSelect === 'hemisphere'">
        <!-- hemisphere settings -->
        <div grid="~ cols-5 gap-1" p-2 :class="settingsLockClass">
          <PropertyNumber
            v-model="hemisphereLightIntensity"
            :config="{ min: 0, max: 10, step: 0.01, label: t('settings.vrm.scene-controls.common.intensity'), disabled: sceneMutationLocked }"
            :label="t('settings.vrm.scene-controls.hemisphere-light.intensity')"
          />
          <PropertyColor
            v-model="hemisphereSkyColor"
            :disabled="sceneMutationLocked"
            :label="t('settings.vrm.scene-controls.hemisphere-light.sky-color')"
          />
          <PropertyColor
            v-model="hemisphereGroundColor"
            :disabled="sceneMutationLocked"
            :label="t('settings.vrm.scene-controls.hemisphere-light.ground-color')"
          />
        </div>
      </div>
      <div v-else>
        <!-- skybox settings -->
        <div grid="~ cols-5 gap-1" p-2 :class="settingsLockClass">
          <PropertyNumber
            v-model="skyBoxIntensity"
            :config="{ min: 0, max: 1, step: 0.01, label: t('settings.vrm.scene-controls.common.intensity'), disabled: sceneMutationLocked }"
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
      :label="t('settings.vrm.tips.label')"
    >
      <div class="text-sm text-neutral-600 space-y-1 dark:text-neutral-400">
        {{ t('settings.vrm.scale-and-position.tips') }}
      </div>
    </Callout>
  </Container>
  <Container
    :title="t('settings.vrm.external-animations.title')"
    icon="i-solar:video-frame-play-horizontal-bold-duotone"
    :class="[
      'rounded-xl',
      'bg-white/80  dark:bg-black/75',
      'backdrop-blur-lg',
    ]"
  >
    <Callout :label="t('settings.vrm.external-animations.callout.label')">
      <div class="text-sm text-neutral-600 dark:text-neutral-400">
        {{ t('settings.vrm.external-animations.callout.description') }}
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
      {{ t('settings.vrm.external-animations.empty') }}
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
            {{ t('settings.vrm.external-animations.imported-at', { time: new Date(item.importedAt).toLocaleString() }) }}
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
            {{ isExternalAnimationReady(item.id) ? t('settings.vrm.external-animations.status.exposed') : t('settings.vrm.external-animations.status.hidden') }}
          </div>
          <Button variant="secondary" size="sm" @click="removeExternalAnimation(item.id)">
            {{ t('settings.vrm.external-animations.actions.remove') }}
          </Button>
        </div>
      </div>
      <div :class="['grid gap-3 lg:grid-cols-2']">
        <FieldInput
          :model-value="item.actionKey"
          :label="t('settings.vrm.external-animations.fields.action-key.label')"
          :description="t('settings.vrm.external-animations.fields.action-key.description')"
          :placeholder="t('settings.vrm.external-animations.fields.action-key.placeholder')"
          @update:model-value="value => updateExternalAnimation(item.id, { actionKey: value })"
        />
        <FieldInput
          :model-value="item.label"
          :label="t('settings.vrm.external-animations.fields.label.label')"
          :description="t('settings.vrm.external-animations.fields.label.description')"
          :placeholder="t('settings.vrm.external-animations.fields.label.placeholder')"
          @update:model-value="value => updateExternalAnimation(item.id, { label: value })"
        />
      </div>
      <FieldTextArea
        :model-value="item.description"
        :label="t('settings.vrm.external-animations.fields.description.label')"
        :description="t('settings.vrm.external-animations.fields.description.description')"
        :placeholder="t('settings.vrm.external-animations.fields.description.placeholder')"
        @update:model-value="value => updateExternalAnimation(item.id, { description: value })"
      />
    </div>
  </Container>
  <Container
    :title="t('settings.vrm.embodiment.title')"
    icon="i-solar:mask-happly-bold-duotone"
    :class="[
      'rounded-xl',
      'bg-white/80  dark:bg-black/75',
      'backdrop-blur-lg',
    ]"
  >
    <Callout :label="t('settings.vrm.embodiment.callout.label')">
      <div class="text-sm text-neutral-600 dark:text-neutral-400">
        {{ t('settings.vrm.embodiment.callout.description') }}
      </div>
    </Callout>
    <div
      v-for="emotion in embodimentEmotionOptions"
      :key="emotion.value"
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
      <div :class="['mb-3']">
        <div :class="['text-sm font-medium']">
          {{ emotion.label }}
        </div>
        <div :class="['text-xs text-neutral-500 dark:text-neutral-400']">
          {{ emotion.value }}
        </div>
      </div>
      <div :class="['grid gap-3 lg:grid-cols-2']">
        <FieldInput
          :model-value="readEmotionExpressionAliasInput(emotion.value)"
          :label="t('settings.vrm.embodiment.fields.expression-aliases.label')"
          :placeholder="resolveDefaultEmotionExpressionAliasesText(emotion.value)"
          @update:model-value="value => updateEmotionExpressionAliases(emotion.value, value)"
        >
          <template #description>
            <div :class="['space-y-1']">
              <div>{{ t('settings.vrm.embodiment.fields.expression-aliases.description') }}</div>
              <div>{{ t('settings.vrm.embodiment.defaults', { aliases: resolveDefaultEmotionExpressionAliasesText(emotion.value) }) }}</div>
              <div>{{ t('settings.vrm.embodiment.effective', { aliases: resolveEffectiveEmotionExpressionAliasesText(emotion.value) }) }}</div>
            </div>
          </template>
        </FieldInput>
        <FieldInput
          :model-value="readEmotionFacialCuePreferenceInput(emotion.value)"
          :label="t('settings.vrm.embodiment.fields.facial-cues.label')"
          :placeholder="resolveSuggestedEmotionFacialCueText(emotion.value)"
          @update:model-value="value => updateEmotionFacialCuePreferences(emotion.value, value)"
        >
          <template #description>
            <div :class="['space-y-1']">
              <div>{{ t('settings.vrm.embodiment.fields.facial-cues.description') }}</div>
              <div>{{ t('settings.vrm.embodiment.suggested', { aliases: resolveSuggestedEmotionFacialCueText(emotion.value) }) }}</div>
            </div>
          </template>
        </FieldInput>
      </div>
      <div :class="['mt-3']">
        <FieldInput
          :model-value="readEmotionActionCuePreferenceInput(emotion.value)"
          :label="t('settings.vrm.embodiment.fields.action-cues.label')"
          :placeholder="resolveSuggestedEmotionActionCueText(emotion.value)"
          @update:model-value="value => updateEmotionActionCuePreferences(emotion.value, value)"
        >
          <template #description>
            <div :class="['space-y-1']">
              <div>{{ t('settings.vrm.embodiment.fields.action-cues.description') }}</div>
              <div>{{ t('settings.vrm.embodiment.suggested', { aliases: resolveSuggestedEmotionActionCueText(emotion.value) }) }}</div>
            </div>
          </template>
        </FieldInput>
      </div>
    </div>
  </Container>
  <Container
    :title="t('settings.vrm.custom-expressions.title')"
    icon="i-solar:mask-happly-bold-duotone"
    :class="[
      'rounded-xl',
      'bg-white/80  dark:bg-black/75',
      'backdrop-blur-lg',
    ]"
  >
    <Callout :label="t('settings.vrm.custom-expressions.callout.label')">
      <div class="text-sm text-neutral-600 dark:text-neutral-400">
        {{ t('settings.vrm.custom-expressions.callout.description') }}
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
      {{ t('settings.vrm.custom-expressions.empty') }}
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
            {{ t('settings.vrm.custom-expressions.raw-name') }}
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
            {{ isCustomExpressionReady(expressionName) ? t('settings.vrm.custom-expressions.status.exposed') : t('settings.vrm.custom-expressions.status.hidden') }}
          </div>
          <Button variant="secondary" size="sm" @click="removeCustomExpression(expressionName)">
            {{ t('settings.vrm.custom-expressions.actions.clear-mapping') }}
          </Button>
        </div>
      </div>
      <div :class="['grid gap-3 lg:grid-cols-2']">
        <FieldInput
          :model-value="readCustomExpressionBinding(expressionName)?.facialKey"
          :label="t('settings.vrm.custom-expressions.fields.facial-key.label')"
          :description="t('settings.vrm.custom-expressions.fields.facial-key.description')"
          :placeholder="suggestCapabilityKey(expressionName)"
          @update:model-value="value => updateCustomExpression(expressionName, { facialKey: value })"
        />
        <FieldInput
          :model-value="readCustomExpressionBinding(expressionName)?.label"
          :label="t('settings.vrm.custom-expressions.fields.label.label')"
          :description="t('settings.vrm.custom-expressions.fields.label.description')"
          :placeholder="expressionName"
          @update:model-value="value => updateCustomExpression(expressionName, { label: value })"
        />
      </div>
      <FieldTextArea
        :model-value="readCustomExpressionBinding(expressionName)?.description"
        :label="t('settings.vrm.custom-expressions.fields.description.label')"
        :description="t('settings.vrm.custom-expressions.fields.description.description')"
        :placeholder="t('settings.vrm.custom-expressions.fields.description.placeholder')"
        @update:model-value="value => updateCustomExpression(expressionName, { description: value })"
      />
      <div :class="['mt-3 flex items-center justify-between rounded-lg bg-neutral-100/80 px-3 py-2 dark:bg-neutral-900/60']">
        <div>
          <div :class="['text-sm font-medium']">
            {{ t('settings.vrm.custom-expressions.affects-mouth.title') }}
          </div>
          <div :class="['text-xs text-neutral-500 dark:text-neutral-400']">
            {{ t('settings.vrm.custom-expressions.affects-mouth.description') }}
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
