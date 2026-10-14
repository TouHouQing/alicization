<script setup lang="ts" generic="T extends string">
import { useId } from 'vue'

const props = defineProps<{ label: string, options: { value: T, label: string, hint: string }[] }>()
const value = defineModel<T | null | undefined>({ required: true })
const groupId = useId()
</script>

<template>
  <fieldset>
    <legend class="mb-2 text-sm font-medium">
      {{ props.label }}
    </legend>
    <div class="grid gap-2 sm:grid-cols-3">
      <label v-for="option in props.options" :key="option.value" class="relative cursor-pointer">
        <input v-model="value" type="radio" :name="groupId" :value="option.value" class="peer sr-only">
        <span :class="['h-full flex flex-col gap-1 border rounded-xl px-3 py-2 transition-colors', 'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-primary-500', value === option.value ? 'border-primary-300 bg-primary-50/50 dark:border-primary-700 dark:bg-primary-950/30' : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-600']">
          <span class="flex items-center justify-between gap-2 text-sm font-medium">
            {{ option.label }}
            <span :class="['h-4 w-4 flex-shrink-0', value === option.value ? 'i-solar:check-circle-bold text-primary-500' : 'rounded-full border border-neutral-300 dark:border-neutral-600']" aria-hidden="true" />
          </span>
          <span class="text-xs text-neutral-500 leading-5 dark:text-neutral-400">{{ option.hint }}</span>
        </span>
      </label>
    </div>
  </fieldset>
</template>
