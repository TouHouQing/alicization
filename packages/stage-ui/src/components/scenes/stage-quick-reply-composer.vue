<script setup lang="ts">
import { BasicTextarea } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

import { useChatReplyAbort } from '../../composables'
import { useChatTextComposerStore } from '../../stores/chat/text-composer-store'

const composerStore = useChatTextComposerStore()
const { draft, isComposing } = storeToRefs(composerStore)
const { sending, aborting, abortReply } = useChatReplyAbort()
const { t } = useI18n()

async function handleSubmit() {
  await composerStore.sendCurrentMessage()
}

async function handleActionButtonClick() {
  if (sending.value) {
    await abortReply()
    return
  }

  await handleSubmit()
}
</script>

<template>
  <div class="stage-quick-reply">
    <BasicTextarea
      v-model="draft"
      :placeholder="t('stage.dialogue.quick-reply-placeholder')"
      class="stage-quick-reply__input"
      default-height="2lh"
      @submit="handleSubmit"
      @compositionstart="isComposing = true"
      @compositionend="isComposing = false"
    />
    <button
      type="button"
      :class="[
        'stage-quick-reply__send',
        sending ? 'stage-quick-reply__send--stop' : '',
      ]"
      :title="sending ? t('stage.dialogue.stop-reply') : undefined"
      :aria-label="sending ? t('stage.dialogue.stop-reply') : undefined"
      :disabled="sending ? aborting : isComposing"
      @click="handleActionButtonClick"
    >
      <span v-if="sending" class="stage-quick-reply__stop-icon i-solar:stop-circle-linear" aria-hidden="true" />
      <span v-else class="stage-quick-reply__send-icon i-solar:arrow-up-linear" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.stage-quick-reply {
  display: flex;
  align-items: flex-end;
  gap: 0.65rem;
  border: 1px solid rgb(66 47 31 / 18%);
  border-radius: 1.45rem 1.9rem 1.55rem 1.2rem;
  background:
    linear-gradient(135deg, rgb(255 250 242 / 84%) 0%, rgb(255 246 230 / 74%) 48%, rgb(255 255 255 / 55%) 100%);
  box-shadow:
    0 0.85rem 2.2rem rgb(73 45 23 / 12%),
    inset 0 1px 0 rgb(255 255 255 / 62%);
  backdrop-filter: blur(16px) saturate(1.1);
  padding: 0.7rem 0.75rem 0.75rem 0.9rem;
}

.stage-quick-reply__input {
  min-height: calc(2lh + 0.5rem);
  max-height: 7lh;
  width: 100%;
  resize: none;
  overflow-y: auto;
  border: none;
  background: transparent;
  color: rgb(63 44 30 / 96%);
  font-size: 0.92rem;
  line-height: 1.45;
  outline: none;
  padding: 0;
}

.stage-quick-reply__input::placeholder {
  color: rgb(112 84 57 / 62%);
}

.stage-quick-reply__send {
  display: inline-flex;
  min-width: 2.8rem;
  min-height: 2.8rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(89 61 34 / 14%);
  border-radius: 999px;
  background: rgb(91 64 38 / 88%);
  color: rgb(255 248 239 / 96%);
  box-shadow: 0 0.55rem 1rem rgb(63 41 20 / 18%);
  font-size: 0.78rem;
  line-height: 1;
  transition:
    transform 180ms ease,
    opacity 180ms ease,
    background-color 180ms ease;
}

.stage-quick-reply__send--stop {
  background: rgb(125 63 47 / 92%);
}

.stage-quick-reply__send:disabled {
  cursor: wait;
  opacity: 0.72;
}

.stage-quick-reply__send:not(:disabled):hover {
  transform: translateY(-1px);
}

.stage-quick-reply__send:not(:disabled):active {
  transform: translateY(1px);
}

.stage-quick-reply__send-icon {
  font-size: 1rem;
}

.stage-quick-reply__stop-icon {
  font-size: 1rem;
}
</style>
