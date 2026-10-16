<script setup lang="ts">
import { useId } from 'vue'

import { Range } from '../range'

const props = withDefaults(defineProps<{
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  label?: string
  description?: string
  formatValue?: (value: number) => string
  as?: 'label' | 'div'
}>(), {
  as: 'label',
})

const modelValue = defineModel<number>({ required: true })
const labelId = useId()
</script>

<template>
  <component :is="props.as" :class="['flex flex-col gap-4']">
    <div :class="['flex', 'flex-row', 'items-center', 'gap-2']">
      <div :class="['flex-1']">
        <div :id="labelId" :class="['flex', 'items-center', 'gap-1', 'text-sm', 'font-medium']">
          <slot name="label">
            {{ label }}
          </slot>
        </div>
        <div :class="['text-xs', 'text-neutral-500', 'dark:text-neutral-400']">
          <slot name="description">
            {{ description }}
          </slot>
        </div>
      </div>
      <span :class="['font-mono']">{{ props.formatValue?.(modelValue) || modelValue }}</span>
    </div>
    <div :class="['flex', 'flex-row', 'items-center', 'gap-2']">
      <Range
        v-model="modelValue"
        :aria-labelledby="labelId"
        :disabled="disabled"
        :min="min ?? 0"
        :max="max ?? 1"
        :step="step ?? 0.01"
        :class="['w-full']"
      />
    </div>
  </component>
</template>
