<script lang="ts" setup>
import { watchEffect } from 'vue'

import { TransitionVertical } from '../animations'

// NOTICE: An absent Boolean prop otherwise becomes false and overrides v-model.
const props = withDefaults(defineProps<{
  default?: boolean
  label?: string
}>(), { default: undefined })
const visible = defineModel<boolean>({ default: false })
watchEffect(() => {
  if (props.default != null) {
    visible.value = !!props.default
  }
})

function setVisible(value: boolean) {
  visible.value = value
  return value
}
</script>

<template>
  <div>
    <slot name="trigger" v-bind="{ visible, setVisible }">
      <button
        :class="['sticky top-0 z-10 flex items-center justify-between px2 py1 text-sm backdrop-blur-xl']"
        @click="visible = !visible"
      >
        <span>
          {{ props.label ?? 'Collapsable' }}
        </span> <span op50>{{ visible ? '▲' : '▼' }}</span>
      </button>
    </slot>
    <TransitionVertical>
      <slot v-if="visible" v-bind="{ visible, setVisible }" />
    </TransitionVertical>
  </div>
</template>
