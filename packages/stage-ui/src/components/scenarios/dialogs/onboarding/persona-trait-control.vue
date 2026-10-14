<script setup lang="ts">
import { Range } from '@proj-alicization/ui'
import { computed } from 'vue'

const props = defineProps<{ label: string, low: string, balanced: string, high: string }>()
const model = defineModel<number | null | undefined>({ required: true })
const value = computed({
  get: () => model.value ?? 0.5,
  set: (value: number) => { model.value = value },
})
const description = computed(() => value.value < 0.35 ? props.low : value.value > 0.65 ? props.high : props.balanced)
</script>

<template>
  <label class="block">
    <span class="flex items-center justify-between gap-4 text-sm">
      <span class="font-medium">{{ props.label }}</span>
      <span class="text-primary-600 dark:text-primary-300">{{ description }}</span>
    </span>
    <Range v-model="value" :min="0" :max="1" :step="0.05" :aria-label="props.label" :aria-valuetext="description" class="persona-trait-range my-2 w-full focus-visible:outline-primary-500" />
    <span class="flex justify-between text-xs text-neutral-400"><span>{{ props.low }}</span><span>{{ props.high }}</span></span>
  </label>
</template>

<style scoped>
.persona-trait-range {
  --height: 1.25rem;
  --thumb-width: 1.25rem;
  --track-height: 0.5rem;
  --track-border: none;
  --track-border-radius: 999px;
  --track-value-background: oklch(90% var(--chromatic-chroma-200) var(--chromatic-hue));
  --track-value-padding: 0px;
}
</style>
