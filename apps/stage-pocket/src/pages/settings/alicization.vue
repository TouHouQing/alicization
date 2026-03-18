<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

void router.replace('/settings/airi-card')
</script>

<template>
  <div />
</template>

<route lang="yaml">
meta:
  layout: settings
  title: Alicization
  description: Redirect to Alicization Card
  icon: i-solar:atom-bold-duotone
  order: 8
  stageTransition:
    name: slide
</route>
