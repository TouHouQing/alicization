<script setup lang="ts">
import { errorMessageFrom } from '@moeru/std'
import { ModelSettings } from '@proj-alicization/stage-ui/components/scenarios/settings/model-settings'
import { Vibrant } from 'node-vibrant/browser'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const modelSettingsRef = ref<InstanceType<typeof ModelSettings>>()

const palette = ref<string[]>([])
const extractingColors = ref(false)
const colorExtractionError = ref('')

async function extractColorsFromModel() {
  if (extractingColors.value)
    return
  extractingColors.value = true
  colorExtractionError.value = ''
  let frameUrl: string | undefined
  try {
    const frame = await modelSettingsRef.value?.captureModelFrame()
    if (!frame)
      throw new Error('No loaded model frame is available')
    frameUrl = URL.createObjectURL(frame)
    const vibrant = new Vibrant(frameUrl)

    const paletteFromVibrant = await vibrant.getPalette()
    palette.value = Object.values(paletteFromVibrant).map(color => color?.hex).filter(it => typeof it === 'string')
  }
  catch (error) {
    console.warn('[model-settings] Color extraction failed:', errorMessageFrom(error))
    colorExtractionError.value = t('settings.live2d.theme-color-from-model.capture-failed')
  }
  finally {
    if (frameUrl)
      URL.revokeObjectURL(frameUrl)
    extractingColors.value = false
  }
}
</script>

<template>
  <div :class="['relative grid h-full min-h-0 gap-4', 'grid-rows-[minmax(14rem,2fr)_minmax(0,3fr)]', 'lg:grid-cols-[minmax(18rem,2fr)_minmax(22rem,3fr)] lg:grid-rows-1']">
    <ModelSettings
      ref="modelSettingsRef"
      settings-class="order-2 min-h-0 overflow-y-auto relative"
      live-2d-scene-class="order-1 relative min-h-0 h-full w-full overflow-hidden rounded-xl bg-neutral-100/40 dark:bg-neutral-900/40"
      vrm-scene-class="order-1 relative min-h-0 h-full w-full overflow-hidden rounded-xl bg-neutral-100/40 dark:bg-neutral-900/40"
      :extracting-colors="extractingColors"
      :color-extraction-error="colorExtractionError"
      :palette="palette" @extract-colors-from-model="extractColorsFromModel"
    />
  </div>

  <div
    v-motion
    text="neutral-200/50 dark:neutral-600/20" pointer-events-none
    fixed top="[calc(100dvh-15rem)]" bottom-0 right--5 z--1
    :initial="{ scale: 0.9, opacity: 0, y: 15 }"
    :enter="{ scale: 1, opacity: 1, y: 0 }"
    :duration="500"
    size-60
    flex items-center justify-center
  >
    <div text="60" i-solar:people-nearby-bold-duotone />
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.models.title
  subtitleKey: settings.title
  descriptionKey: settings.pages.models.description
  icon: i-solar:people-nearby-bold-duotone
  settingsEntry: true
  order: 4
  stageTransition:
    name: slide
    pageSpecificAvailable: true
</route>
