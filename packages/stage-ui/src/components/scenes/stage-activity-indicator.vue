<script setup lang="ts">
import type { AlicizationActivityPresence } from '@proj-alicization/stage-shared'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ activity: AlicizationActivityPresence }>()
const { t } = useI18n()
const labelKey = computed(() => {
  const { kind, behavior, phase } = props.activity
  if (kind === 'daily-life')
    return behavior
  if (kind === 'personal-project' && ['working', 'finished'].includes(phase))
    return `personal_${phase}`
  return phase
})
</script>

<template>
  <div
    v-if="activity.kind !== 'daily-life' || ['orienting', 'working'].includes(activity.phase)"
    class="pointer-events-none absolute bottom-6 left-1/2 z-20 max-w-72 rounded-full bg-neutral-50/90 px-4 py-2 text-sm text-neutral-700 shadow-sm backdrop-blur -translate-x-1/2 dark:bg-neutral-900/90 dark:text-neutral-200"
    :data-life-activity-phase="activity.phase"
    :data-life-activity-sequence="activity.sequence"
    role="status"
    aria-live="polite"
  >
    {{ t(`settings.life.activity.${labelKey}`) }}
  </div>
</template>
