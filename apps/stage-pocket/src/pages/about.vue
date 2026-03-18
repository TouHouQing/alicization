<script setup lang="ts">
import { AboutContent } from '@proj-alicization/stage-ui/components'
import { useSharedAnalyticsStore } from '@proj-alicization/stage-ui/stores/analytics'
import { storeToRefs } from 'pinia'

const { buildInfo } = storeToRefs(useSharedAnalyticsStore())
</script>

<template>
  <div
    :class="[
      'min-h-100dvh',
      'bg-neutral-50/80',
      'px-6',
      'py-12',
      'text-neutral-800',
      'dark:bg-neutral-900',
      'dark:text-neutral-100',
    ]"
  >
    <AboutContent
      title="Project"
      highlight="Alicization"
      subtitle="Mobile"
      :build-info="buildInfo"
    />
  </div>
</template>

<route lang="yaml">
meta:
  layout: plain
</route>
