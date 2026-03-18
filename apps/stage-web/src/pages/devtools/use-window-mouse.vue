<script setup lang="ts">
import ElectronRuntimeUnavailablePanel from '@proj-alicization/stage-pages/components/devtools/electron-runtime-unavailable-panel.vue'
</script>

<template>
  <ElectronRuntimeUnavailablePanel
    title-key="tamagotchi.settings.pages.system.developer.sections.section.use-window-mouse.title"
    description-key="tamagotchi.settings.pages.system.developer.sections.section.use-window-mouse.description"
  />
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: tamagotchi.settings.pages.system.developer.sections.section.use-window-mouse.title
  subtitleKey: settings.pages.system.developer.title
</route>
