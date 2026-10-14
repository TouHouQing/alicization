<script setup lang="ts">
import type { BackgroundMaterialType, VibrancyType } from '@proj-alicization/electron-eventa'

import { electron } from '@proj-alicization/electron-eventa'
import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { FieldSelect } from '@proj-alicization/ui'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const setVibrancy = useElectronEventaInvoke(electron.window.setVibrancy)
const setBackgroundMaterial = useElectronEventaInvoke(electron.window.setBackgroundMaterial)
const { t } = useI18n()

const vibrancy = ref<NonNullable<VibrancyType>>()
const backgroundMaterial = ref<NonNullable<BackgroundMaterialType>>()

const vibrancyOptions = computed(() => [
  { label: t('tamagotchi.settings.inlay.vibrancy.options.titlebar'), value: 'titlebar' },
  { label: t('tamagotchi.settings.inlay.vibrancy.options.selection'), value: 'selection' },
  { label: t('tamagotchi.settings.inlay.vibrancy.options.menu'), value: 'menu' },
  { label: t('tamagotchi.settings.inlay.vibrancy.options.popover'), value: 'popover' },
  { label: t('tamagotchi.settings.inlay.vibrancy.options.sidebar'), value: 'sidebar' },
  { label: t('tamagotchi.settings.inlay.vibrancy.options.header'), value: 'header' },
  { label: t('tamagotchi.settings.inlay.vibrancy.options.sheet'), value: 'sheet' },
  { label: t('tamagotchi.settings.inlay.vibrancy.options.window'), value: 'window' },
  { label: t('tamagotchi.settings.inlay.vibrancy.options.hud'), value: 'hud' },
  { label: t('tamagotchi.settings.inlay.vibrancy.options.fullscreen_ui'), value: 'fullscreen-ui' },
  { label: t('tamagotchi.settings.inlay.vibrancy.options.tooltip'), value: 'tooltip' },
  { label: t('tamagotchi.settings.inlay.vibrancy.options.content'), value: 'content' },
  { label: t('tamagotchi.settings.inlay.vibrancy.options.under_window'), value: 'under-window' },
  { label: t('tamagotchi.settings.inlay.vibrancy.options.under_page'), value: 'under-page' },
])

const backgroundMaterialOptions = computed(() => [
  { label: t('tamagotchi.settings.inlay.background_material.options.auto'), value: 'auto' },
  { label: t('tamagotchi.settings.inlay.background_material.options.none'), value: 'none' },
  { label: t('tamagotchi.settings.inlay.background_material.options.mica'), value: 'mica' },
  { label: t('tamagotchi.settings.inlay.background_material.options.acrylic'), value: 'acrylic' },
  { label: t('tamagotchi.settings.inlay.background_material.options.tabbed'), value: 'tabbed' },
])

watch(
  vibrancy,
  (newVibrancy) => {
    setVibrancy([newVibrancy ?? null])
  },
)

watch(
  backgroundMaterial,
  (newBackgroundMaterial) => {
    if (!newBackgroundMaterial)
      return

    setBackgroundMaterial([newBackgroundMaterial])
  },
)
</script>

<template>
  <div class="p-4">
    <div class="drag-region" />

    <div class="py-4">
      <h1>{{ t('tamagotchi.settings.inlay.title') }}</h1>
      <p>{{ t('tamagotchi.settings.inlay.description') }}</p>
    </div>

    <div class="space-y-2">
      <FieldSelect
        v-model="vibrancy"
        :label="t('tamagotchi.settings.inlay.vibrancy.label')"
        :description="t('tamagotchi.settings.inlay.vibrancy.description')"
        :options="vibrancyOptions"
      />

      <FieldSelect
        v-model="backgroundMaterial"
        :label="t('tamagotchi.settings.inlay.background_material.label')"
        :description="t('tamagotchi.settings.inlay.background_material.description')"
        :options="backgroundMaterialOptions"
      />
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: plain
</route>
