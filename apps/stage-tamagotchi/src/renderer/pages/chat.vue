<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import InteractiveArea from '../components/InteractiveArea.vue'
import WindowTitleBar from '../components/Window/TitleBar.vue'

const { t } = useI18n()
</script>

<template>
  <div h-full w-full flex flex-col pt="44px" overflow-hidden>
    <WindowTitleBar
      :title="t('stage.chat.title')"
      icon="i-solar:chat-line-bold"
    />
    <InteractiveArea
      class="interaction-area block"
      min-h-0 w-full flex-1 p-4 transition="opacity duration-250"
    />
  </div>
</template>

<route lang="yaml">
meta:
  layout: stage
</route>
