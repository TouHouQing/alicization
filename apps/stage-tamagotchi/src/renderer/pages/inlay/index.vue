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
  { label: t('inlay.vibrancy.options.titlebar'), value: 'titlebar' },
  { label: t('inlay.vibrancy.options.selection'), value: 'selection' },
  { label: t('inlay.vibrancy.options.menu'), value: 'menu' },
  { label: t('inlay.vibrancy.options.popover'), value: 'popover' },
  { label: t('inlay.vibrancy.options.sidebar'), value: 'sidebar' },
  { label: t('inlay.vibrancy.options.header'), value: 'header' },
  { label: t('inlay.vibrancy.options.sheet'), value: 'sheet' },
  { label: t('inlay.vibrancy.options.window'), value: 'window' },
  { label: t('inlay.vibrancy.options.hud'), value: 'hud' },
  { label: t('inlay.vibrancy.options.fullscreen_ui'), value: 'fullscreen-ui' },
  { label: t('inlay.vibrancy.options.tooltip'), value: 'tooltip' },
  { label: t('inlay.vibrancy.options.content'), value: 'content' },
  { label: t('inlay.vibrancy.options.under_window'), value: 'under-window' },
  { label: t('inlay.vibrancy.options.under_page'), value: 'under-page' },
])

const backgroundMaterialOptions = computed(() => [
  { label: t('inlay.background_material.options.auto'), value: 'auto' },
  { label: t('inlay.background_material.options.none'), value: 'none' },
  { label: t('inlay.background_material.options.mica'), value: 'mica' },
  { label: t('inlay.background_material.options.acrylic'), value: 'acrylic' },
  { label: t('inlay.background_material.options.tabbed'), value: 'tabbed' },
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
      <h1>{{ t('inlay.title') }}</h1>
      <p>{{ t('inlay.description') }}</p>
    </div>

    <div class="space-y-2">
      <FieldSelect
        v-model="vibrancy"
        :label="t('inlay.vibrancy.label')"
        :description="t('inlay.vibrancy.description')"
        :options="vibrancyOptions"
      />

      <FieldSelect
        v-model="backgroundMaterial"
        :label="t('inlay.background_material.label')"
        :description="t('inlay.background_material.description')"
        :options="backgroundMaterialOptions"
      />
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: plain
</route>
