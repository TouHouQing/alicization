<script setup lang="ts">
import { useElectronMouse } from '@proj-alicization/electron-vueuse'

const { x, y } = useElectronMouse()
</script>

<template>
  <div class="flex flex-col md:flex-row">
    <div>
      <div class="flex justify-center gap-3">
        {{ x }}, {{ y }}
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: tamagotchi.settings.pages.system.developer.sections.section.use-window-mouse.title
  subtitleKey: tamagotchi.settings.devtools.title
</route>
