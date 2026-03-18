<script setup lang="ts">
import ElectronRuntimeUnavailablePanel from '@proj-alicization/stage-pages/components/devtools/electron-runtime-unavailable-panel.vue'
</script>

<template>
  <ElectronRuntimeUnavailablePanel
    title-key="settings.pages.system.sections.section.developer.sections.section.relative-mouse.title"
    description-key="settings.pages.system.sections.section.developer.sections.section.relative-mouse.description"
  />
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.system.sections.section.developer.sections.section.relative-mouse.title
  subtitleKey: settings.pages.system.developer.title
</route>
