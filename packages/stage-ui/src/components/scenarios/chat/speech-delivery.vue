<script setup lang="ts">
import type { ConversationDeliveryState } from '../../../services/speech/conversation-delivery'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { restoreConversationDeliveryState } from '../../../services/speech/conversation-delivery'
import { useChatSessionStore } from '../../../stores/chat/session-store'
import { useConversationDeliveryStore } from '../../../stores/conversation-delivery'
import { useAiriCardStore } from '../../../stores/modules/airi-card'
import { useSpeechStore } from '../../../stores/modules/speech'

const props = defineProps<{ messageId?: string, text: string, saved?: ConversationDeliveryState, compact?: boolean }>()
const { t } = useI18n()
const delivery = useConversationDeliveryStore()
const session = useChatSessionStore()
const card = useAiriCardStore()
const speech = useSpeechStore()
const identity = computed(() => ({ cardId: card.activeCardId || 'default', sessionId: session.activeSessionId, turnId: props.messageId ?? '' }))
const state = computed(() => delivery.states[delivery.key(identity.value)] ?? (props.saved && delivery.key(props.saved) === delivery.key(identity.value) ? restoreConversationDeliveryState(props.saved) : undefined))
const active = computed(() => state.value && ['waiting', 'speaking', 'silent'].includes(state.value.phase))
const canRead = computed(() => Boolean(props.messageId && props.text.trim() && props.text.length <= 12000 && speech.configured && speech.activeSpeechProvider !== 'speech-noop' && !active.value))
const label = computed(() => {
  const value = state.value
  if (!value)
    return ''
  if (value.mode === 'silent')
    return value.phase === 'silent' ? t('stage.chat.speech.silent') : ''
  if (value.phase === 'completed')
    return t(value.playedMs === 0 ? 'stage.chat.speech.text-only' : value.partial ? 'stage.chat.speech.excerpt' : 'stage.chat.speech.completed')
  return t(`stage.chat.speech.${value.phase}`)
})
function read() {
  if (canRead.value)
    delivery.read({ ...identity.value, text: props.text })
}
</script>

<template>
  <div v-if="label || canRead" class="flex flex-col gap-1 text-xs" :class="compact ? ['mx-2 rounded-xl bg-[#fff6e9]/95 px-3 py-2 text-[#654428]', 'dark:bg-neutral-800/95 dark:text-neutral-100'] : 'mt-2'" data-conversation-delivery>
    <div class="flex items-center gap-2">
      <span v-if="label" role="status" class="opacity-70" :data-speech-phase="state?.phase">{{ label }}</span>
      <button v-if="active && state" type="button" class="rounded px-2 py-1 hover:bg-neutral-400/15" :aria-label="t('stage.chat.speech.stop')" @click="delivery.stop(state)">
        {{ t('stage.chat.speech.stop') }}
      </button>
      <button v-if="canRead" type="button" class="rounded px-2 py-1 hover:bg-neutral-400/15" :aria-label="t('stage.chat.speech.read-full')" @click="read">
        {{ t('stage.chat.speech.read-full') }}
      </button>
    </div>
    <mark v-if="!compact && state?.phase === 'speaking' && state.currentText" class="line-clamp-2 rounded bg-primary-200/40 px-1 text-inherit dark:bg-primary-800/40" :title="t(state.alignment === 'estimated' ? 'stage.chat.speech.estimated' : 'stage.chat.speech.current')" aria-live="off" data-speaking-range>
      {{ state.currentText }}
    </mark>
  </div>
</template>
