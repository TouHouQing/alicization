<script setup lang="ts">
import type { AlicizationVisualPresenceStateSnapshot } from '../../stores/alicization-bridge'
import type { StageCharacterFrame } from '../../utils'

import { useNow, useResizeObserver } from '@vueuse/core'
import { computed, shallowRef, useTemplateRef } from 'vue'

import { resolveStagePresenceExpressionOverlayState } from './stage-presence-expression-overlay-state'

const props = withDefaults(defineProps<{
  expression?: AlicizationVisualPresenceStateSnapshot['presenceExpression'] | null
  characterFrame?: StageCharacterFrame | null
  dialogueVisible?: boolean
  loading?: boolean
  streaming?: boolean
}>(), {
  expression: null,
  characterFrame: null,
  dialogueVisible: false,
  loading: false,
  streaming: false,
})

const hostRef = useTemplateRef<HTMLDivElement>('host')
const hostSize = shallowRef({ width: 0, height: 0 })
const now = useNow({ interval: 500 })

useResizeObserver(hostRef, (entries) => {
  const entry = entries[0]
  if (!entry)
    return

  hostSize.value = {
    width: entry.contentRect.width,
    height: entry.contentRect.height,
  }
})

const overlay = computed(() => resolveStagePresenceExpressionOverlayState({
  now: now.value.getTime(),
  expression: props.expression,
  characterFrame: props.characterFrame,
  hostSize: hostSize.value,
  dialogueVisible: props.dialogueVisible,
  loading: props.loading,
  streaming: props.streaming,
}))
</script>

<template>
  <div
    ref="host"
    class="stage-presence-expression-host"
    aria-live="polite"
  >
    <Transition name="stage-presence-expression">
      <div
        v-if="overlay.visible"
        :key="overlay.text"
        class="stage-presence-expression"
        :class="`stage-presence-expression--${overlay.intensity}`"
        :style="overlay.style"
      >
        {{ overlay.text }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.stage-presence-expression-host {
  position: absolute;
  inset: 0;
  z-index: 24;
  pointer-events: none;
}

.stage-presence-expression {
  position: absolute;
  max-width: min(220px, 46vw);
  padding: 0.55rem 0.72rem;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 8px;
  background: rgb(28 30 36 / 68%);
  color: rgb(255 250 242 / 94%);
  box-shadow: 0 0.9rem 2rem rgb(0 0 0 / 18%);
  backdrop-filter: blur(16px) saturate(1.08);
  font-size: 0.78rem;
  line-height: 1.45;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.stage-presence-expression--barely-there {
  opacity: 0.78;
}

.stage-presence-expression-enter-active,
.stage-presence-expression-leave-active {
  transition:
    opacity 260ms ease,
    transform 260ms ease;
}

.stage-presence-expression-enter-from,
.stage-presence-expression-leave-to {
  opacity: 0;
  transform: translateY(0.3rem) scale(0.98);
}
</style>
