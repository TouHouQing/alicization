<script setup lang="ts">
import type { ChatHistoryItem } from '@proj-airi/stage-ui/types/chat'

import { ChatHistory } from '@proj-airi/stage-ui/components'
import { useChatOrchestratorStore } from '@proj-airi/stage-ui/stores/chat'
import { useChatSessionStore } from '@proj-airi/stage-ui/stores/chat/session-store'
import { useChatStreamStore } from '@proj-airi/stage-ui/stores/chat/stream-store'
import { useDeferredMount } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { computed, ref, useAttrs } from 'vue'
import { useI18n } from 'vue-i18n'

import ChatActionButtons from '../Widgets/ChatActionButtons.vue'
import ChatArea from '../Widgets/ChatArea.vue'
import ChatContainer from '../Widgets/ChatContainer.vue'

defineOptions({
  inheritAttrs: false,
})

const attrs = useAttrs()
const { isReady } = useDeferredMount()
const { sending } = storeToRefs(useChatOrchestratorStore())
const { messages } = storeToRefs(useChatSessionStore())
const { streamingMessage } = storeToRefs(useChatStreamStore())
const { t } = useI18n()

const isLoading = ref(true)
const historyExpanded = ref(false)
const historyMessages = computed(() => messages.value as unknown as ChatHistoryItem[])
const historyTriggerLabel = computed(() => historyExpanded.value ? t('stage.dialogue.collapse-history') : t('stage.dialogue.history'))
const historyTriggerTitle = computed(() => historyExpanded.value ? t('stage.dialogue.collapse-history') : t('stage.dialogue.expand-history'))
</script>

<template>
  <div class="stage-history-root">
    <button
      type="button"
      class="stage-history-trigger"
      :aria-expanded="historyExpanded"
      :title="historyTriggerTitle"
      @click="historyExpanded = !historyExpanded"
    >
      <span class="stage-history-trigger__icon i-solar:chat-round-line-linear" aria-hidden="true" />
      <span class="stage-history-trigger__label">{{ historyTriggerLabel }}</span>
    </button>

    <Transition
      enter-active-class="transition-all duration-250 ease-out"
      enter-from-class="translate-x-8 op-0"
      enter-to-class="translate-x-0 op-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-x-0 op-100"
      leave-to-class="translate-x-8 op-0"
    >
      <div
        v-if="historyExpanded"
        v-bind="attrs"
        class="stage-history-panel"
      >
        <div class="stage-history-panel__header">
          <span class="stage-history-panel__title">{{ t('stage.dialogue.history') }}</span>
          <button
            type="button"
            class="stage-history-panel__collapse"
            @click="historyExpanded = false"
          >
            {{ t('stage.dialogue.collapse-history') }}
          </button>
        </div>

        <div flex="col" h-full min-h-0 items-center pt-4>
          <div max-h="[85vh]" h-full min-h-0 w-full py="4">
            <ChatContainer>
              <div
                v-if="isLoading"
                absolute left-0 top-0 h-1 w-full overflow-hidden rounded-t-xl
                class="bg-primary-500/20"
              >
                <div h-full w="1/3" origin-left bg-primary-500 class="animate-scan" />
              </div>
              <div w="full" max-h="<md:[60%]" py="<sm:2" flex="~ col" rounded="lg" relative h-full flex-1 overflow-hidden px="2 <md:0" py-4>
                <ChatHistory
                  v-if="isReady"
                  :messages="historyMessages"
                  :sending="sending"
                  :streaming-message="streamingMessage"
                  h-full
                  variant="desktop"
                  @vue:mounted="isLoading = false"
                />
              </div>
              <ChatArea />
            </ChatContainer>
          </div>

          <ChatActionButtons />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.stage-history-root {
  position: absolute;
  inset: 0;
  z-index: 20;
  overflow: visible;
  pointer-events: none;
}

.stage-history-trigger {
  position: absolute;
  right: 1rem;
  top: clamp(7rem, 28vh, 14rem);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: 999px;
  background:
    linear-gradient(135deg, rgb(255 252 243 / 88%), rgb(255 244 227 / 74%));
  box-shadow: 0 1rem 2.2rem rgb(63 41 20 / 18%);
  color: rgb(73 48 26 / 96%);
  backdrop-filter: blur(18px);
  padding: 0.7rem 0.9rem;
  pointer-events: auto;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

.stage-history-trigger:hover {
  transform: translateX(-2px);
  box-shadow: 0 1.15rem 2.6rem rgb(63 41 20 / 22%);
}

.stage-history-trigger__icon {
  font-size: 1rem;
}

.stage-history-trigger__label {
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

.stage-history-panel {
  position: absolute;
  right: 1rem;
  top: 1rem;
  pointer-events: auto;
}

.stage-history-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
  padding: 0 0.4rem;
}

.stage-history-panel__title {
  font-size: 0.9rem;
  font-weight: 700;
  color: rgb(255 250 244 / 90%);
  text-shadow: 0 0.35rem 1rem rgb(42 25 10 / 28%);
}

.stage-history-panel__collapse {
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 999px;
  background: rgb(255 255 255 / 14%);
  color: rgb(255 249 239 / 92%);
  backdrop-filter: blur(12px);
  padding: 0.3rem 0.7rem;
  font-size: 0.75rem;
}

@keyframes scan {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
}

.animate-scan {
  animation: scan 2s infinite linear;
}
</style>
