<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  // Memory governance, including persona dataset staging and rollback, lives in the
  // single Workbench surface so the legacy route cannot become a second owner.
  void router.replace('/settings/modules/memory')
})
</script>

<template>
  <div />
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.memory.workbench.title
  descriptionKey: settings.pages.memory.workbench.description
  stageTransition:
    name: slide
</route>
