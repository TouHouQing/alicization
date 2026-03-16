<script setup lang="ts">
import type { StageBubblePlacement } from '../../utils'

import { computed } from 'vue'

const props = withDefaults(defineProps<{
  text: string
  loading?: boolean
  streaming?: boolean
  placement?: StageBubblePlacement
  maxBodyHeight?: number
}>(), {
  loading: false,
  streaming: false,
  placement: 'top-right',
  maxBodyHeight: 220,
})

const resolvedText = computed(() => props.text.trim())
const showTypingDots = computed(() => props.loading || props.streaming)
</script>

<template>
  <div
    class="stage-dialogue-bubble"
    :class="`stage-dialogue-bubble--${props.placement}`"
    :style="{ '--stage-dialogue-body-height': `${props.maxBodyHeight}px` }"
  >
    <div
      v-if="resolvedText"
      class="stage-dialogue-bubble__content"
    >
      <p class="stage-dialogue-bubble__text">
        {{ resolvedText }}
      </p>
      <span v-if="showTypingDots" class="stage-dialogue-bubble__typing" aria-hidden="true">
        <span class="stage-dialogue-bubble__dot" />
        <span class="stage-dialogue-bubble__dot" />
        <span class="stage-dialogue-bubble__dot" />
      </span>
    </div>
    <div v-else-if="loading" class="stage-dialogue-bubble__loading" aria-hidden="true">
      <span class="stage-dialogue-bubble__dot" />
      <span class="stage-dialogue-bubble__dot" />
      <span class="stage-dialogue-bubble__dot" />
    </div>
    <div class="stage-dialogue-bubble__tail" />
  </div>
</template>

<style scoped>
.stage-dialogue-bubble {
  position: relative;
  overflow: visible;
  border: 1.5px solid rgb(66 47 31 / 22%);
  border-radius: 2rem 2.4rem 1.8rem 2.8rem / 2rem 2.5rem 1.5rem 2.2rem;
  background:
    linear-gradient(135deg, rgb(255 251 243 / 90%) 0%, rgb(255 247 233 / 74%) 45%, rgb(255 255 255 / 60%) 100%);
  box-shadow:
    0 1.1rem 2.8rem rgb(73 45 23 / 15%),
    inset 0 1px 0 rgb(255 255 255 / 62%);
  backdrop-filter: blur(18px) saturate(1.12);
  color: rgb(61 42 26 / 96%);
  animation: stage-dialogue-breathe 4.8s ease-in-out infinite;
}

.stage-dialogue-bubble::before {
  content: '';
  position: absolute;
  inset: 0.45rem;
  border-radius: 1.65rem 2rem 1.35rem 2.35rem / 1.45rem 2.1rem 1.2rem 1.85rem;
  border: 1px solid rgb(255 255 255 / 30%);
  pointer-events: none;
}

.stage-dialogue-bubble__content {
  display: flex;
  max-height: var(--stage-dialogue-body-height);
  overflow-y: auto;
  padding: 1rem 1.05rem 1.1rem;
  font-size: 0.98rem;
  line-height: 1.55;
  white-space: pre-wrap;
}

.stage-dialogue-bubble__content::-webkit-scrollbar {
  width: 0.35rem;
}

.stage-dialogue-bubble__content::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgb(106 78 49 / 24%);
}

.stage-dialogue-bubble__text {
  margin: 0;
  flex: 1 1 auto;
}

.stage-dialogue-bubble__typing,
.stage-dialogue-bubble__loading {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: flex-end;
  gap: 0.28rem;
}

.stage-dialogue-bubble__typing {
  margin-left: 0.45rem;
  padding-bottom: 0.18rem;
}

.stage-dialogue-bubble__loading {
  min-height: 4.75rem;
  justify-content: center;
  padding: 0 1rem 0.35rem;
}

.stage-dialogue-bubble__dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: rgb(107 74 44 / 78%);
  animation: stage-dialogue-dot 1s ease-in-out infinite;
}

.stage-dialogue-bubble__dot:nth-child(2) {
  animation-delay: 0.14s;
}

.stage-dialogue-bubble__dot:nth-child(3) {
  animation-delay: 0.28s;
}

.stage-dialogue-bubble__tail {
  position: absolute;
  bottom: -0.8rem;
  width: 1.6rem;
  height: 1.8rem;
  border: 1.5px solid rgb(66 47 31 / 22%);
  background: linear-gradient(180deg, rgb(255 250 240 / 88%), rgb(255 242 220 / 76%));
  box-shadow: 0 0.6rem 1.25rem rgb(73 45 23 / 8%);
  animation: stage-dialogue-tail 3.8s ease-in-out infinite;
}

.stage-dialogue-bubble--top-right .stage-dialogue-bubble__tail {
  left: 1.75rem;
  border-top: none;
  border-left: none;
  border-radius: 0 0 1.15rem 0.1rem;
  transform: skewX(-16deg) rotate(14deg);
  transform-origin: top left;
}

.stage-dialogue-bubble--top-left .stage-dialogue-bubble__tail {
  right: 1.75rem;
  border-top: none;
  border-right: none;
  border-radius: 0 0 0.1rem 1.15rem;
  transform: skewX(16deg) rotate(-14deg);
  transform-origin: top right;
}

@keyframes stage-dialogue-breathe {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-0.16rem) scale(1.01);
  }
}

@keyframes stage-dialogue-tail {
  0%,
  100% {
    translate: 0 0;
  }
  50% {
    translate: 0 0.16rem;
  }
}

@keyframes stage-dialogue-dot {
  0%,
  80%,
  100% {
    opacity: 0.28;
    transform: translateY(0) scale(0.9);
  }
  40% {
    opacity: 1;
    transform: translateY(-0.18rem) scale(1);
  }
}
</style>
