<script setup lang="ts">
import ElectronRuntimeUnavailablePanel from '@proj-alicization/stage-pages/components/devtools/electron-runtime-unavailable-panel.vue'
</script>

<template>
  <ElectronRuntimeUnavailablePanel
    title-key="settings.pages.system.sections.section.developer.sections.section.widgets-calling.title"
    description-key="settings.pages.system.sections.section.developer.sections.section.widgets-calling.description"
  />
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.system.sections.section.developer.sections.section.widgets-calling.title
  subtitleKey: settings.pages.system.developer.title
</route>
