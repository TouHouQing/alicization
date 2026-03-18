<script setup lang="ts">
import type { VrmActionBinding } from '@proj-alicization/stage-ui-three'

import type { DisplayModel } from '../../../../stores/display-models'

import { Live2DScene, useLive2d } from '@proj-alicization/stage-ui-live2d'
import { ThreeScene } from '@proj-alicization/stage-ui-three'
import { builtinActionBindings } from '@proj-alicization/stage-ui-three/assets/vrm'
import { Button, Callout } from '@proj-alicization/ui'
import { useMouse } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import Live2D from './live2d.vue'
import VRM from './vrm.vue'

import { DisplayModelFormat } from '../../../../stores/display-models'
import { useSettings } from '../../../../stores/settings'
import { isVrmCustomExpressionConfigured, useStagePerformanceStore } from '../../../../stores/stage-performance'
import { ModelSelectorDialog } from '../../dialogs/model-selector'

const props = defineProps<{
  palette: string[]
  settingsClass?: string | string[]

  live2dSceneClass?: string | string[]
  vrmSceneClass?: string | string[]
}>()

defineEmits<{
  (e: 'extractColorsFromModel'): void
}>()

const modelSelectorOpen = ref(false)
const resolvedVrmExternalAnimations = ref<VrmActionBinding[]>([])
const positionCursor = useMouse()
const { t } = useI18n()
const settingsStore = useSettings()
const stagePerformanceStore = useStagePerformanceStore()
const { scale: live2dScale } = storeToRefs(useLive2d())
const {
  live2dDisableFocus,
  stageModelSelectedUrl,
  stageModelSelected,
  stageModelSelectedDisplayModel,
  stageModelRenderer,
  themeColorsHue,
  themeColorsHueDynamic,
  live2dIdleAnimationEnabled,
  live2dAutoBlinkEnabled,
  live2dForceAutoBlinkEnabled,
  live2dShadowEnabled,
  live2dMaxFps,
} = storeToRefs(settingsStore)

const currentSelectedDisplayModel = computed<DisplayModel | undefined>(() => stageModelSelectedDisplayModel.value)

async function handleModelPick(selectedModel: DisplayModel | undefined) {
  stageModelSelected.value = selectedModel?.id ?? ''
  await settingsStore.updateStageModel()

  if (selectedModel?.format === DisplayModelFormat.Live2dZip)
    useLive2d().shouldUpdateView()
}

function handleVrmCustomExpressionsResolved(names: string[]) {
  if (!stageModelSelected.value)
    return

  stagePerformanceStore.setVrmCustomExpressionNames(stageModelSelected.value, names)
}

async function refreshResolvedVrmExternalAnimations() {
  if (stageModelRenderer.value !== 'vrm' || !stageModelSelected.value) {
    resolvedVrmExternalAnimations.value = []
    return
  }

  resolvedVrmExternalAnimations.value = await stagePerformanceStore.resolveVrmExternalAnimations(stageModelSelected.value, {
    configuredOnly: true,
  })
}

const currentStoredVrmExternalAnimations = computed(() => {
  return stagePerformanceStore.listVrmExternalAnimations(stageModelSelected.value)
})

watch([stageModelRenderer, stageModelSelected, currentStoredVrmExternalAnimations], async () => {
  await refreshResolvedVrmExternalAnimations()
}, { immediate: true, deep: true })

const currentVrmCustomExpressionBindings = computed(() => {
  const scanned = new Set(stagePerformanceStore.listVrmCustomExpressionNames(stageModelSelected.value))
  return stagePerformanceStore.listVrmCustomExpressions(stageModelSelected.value)
    .filter(item => scanned.has(item.expressionName))
})

const currentVrmManifestCustomExpressionBindings = computed(() => {
  return currentVrmCustomExpressionBindings.value.filter(item => isVrmCustomExpressionConfigured(item))
})

const currentVrmActionBindings = computed(() => {
  if (stageModelRenderer.value !== 'vrm')
    return []

  return [
    ...builtinActionBindings,
    ...resolvedVrmExternalAnimations.value,
  ]
})
</script>

<template>
  <div
    flex="~ col gap-2" z-10 overflow-y-scroll p-2 :class="[
      ...(props.settingsClass
        ? (typeof props.settingsClass === 'string' ? [props.settingsClass] : props.settingsClass)
        : []),
    ]"
  >
    <Callout :label="t('settings.pages.models.supported-formats.label')">
      <p>
        {{ t('settings.pages.models.supported-formats.description-1') }}
      </p>
      <p>
        {{ t('settings.pages.models.supported-formats.description-2') }}
      </p>
    </Callout>
    <div :class="['flex flex-wrap gap-2']">
      <ModelSelectorDialog v-model:show="modelSelectorOpen" :selected-model="currentSelectedDisplayModel" @pick="handleModelPick">
        <Button variant="secondary">
          {{ t('settings.pages.models.actions.select-model') }}
        </Button>
      </ModelSelectorDialog>
    </div>
    <Live2D
      v-if="stageModelRenderer === 'live2d'"
      :model-id="stageModelSelected"
      :palette="palette"
      @extract-colors-from-model="$emit('extractColorsFromModel')"
    />
    <VRM
      v-if="stageModelRenderer === 'vrm'"
      :model-id="stageModelSelected"
      :palette="palette"
      @extract-colors-from-model="$emit('extractColorsFromModel')"
    />
  </div>
  <!-- Live2D component for 2D stage view -->
  <template v-if="stageModelRenderer === 'live2d'">
    <div :class="[...(props.live2dSceneClass ? (typeof props.live2dSceneClass === 'string' ? [props.live2dSceneClass] : props.live2dSceneClass) : [])]">
      <Live2DScene
        :focus-at="{ x: positionCursor.x.value, y: positionCursor.y.value }"
        :model-src="stageModelSelectedUrl"
        :model-id="stageModelSelected"
        :disable-focus-at="live2dDisableFocus"
        :scale="live2dScale"
        :theme-colors-hue="themeColorsHue"
        :theme-colors-hue-dynamic="themeColorsHueDynamic"
        :live2d-idle-animation-enabled="live2dIdleAnimationEnabled"
        :live2d-auto-blink-enabled="live2dAutoBlinkEnabled"
        :live2d-force-auto-blink-enabled="live2dForceAutoBlinkEnabled"
        :live2d-shadow-enabled="live2dShadowEnabled"
        :live2d-max-fps="live2dMaxFps"
      />
    </div>
  </template>
  <!-- VRM component for 3D stage view -->
  <template v-if="stageModelRenderer === 'vrm'">
    <div :class="[...(props.vrmSceneClass ? (typeof props.vrmSceneClass === 'string' ? [props.vrmSceneClass] : props.vrmSceneClass) : [])]">
      <ThreeScene
        :custom-expression-bindings="currentVrmManifestCustomExpressionBindings"
        :action-bindings="currentVrmActionBindings"
        :model-id="stageModelSelected"
        :model-src="stageModelSelectedUrl"
        @custom-expressions-resolved="handleVrmCustomExpressionsResolved"
      />
    </div>
  </template>
</template>
