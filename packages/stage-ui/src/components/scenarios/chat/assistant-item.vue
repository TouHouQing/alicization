<script setup lang="ts">
import type { ChatAssistantMessage, ChatSlices, ChatSlicesText } from '../../../types/chat'

import { computed } from 'vue'

import ChatResponsePart from './response-part.vue'
import ChatToolCallBlock from './tool-call-block.vue'

import { MarkdownRenderer } from '../../markdown'

const props = withDefaults(defineProps<{
  message: ChatAssistantMessage
  label: string
  showPlaceholder?: boolean
  variant?: 'desktop' | 'mobile'
}>(), {
  showPlaceholder: false,
  variant: 'desktop',
})

const resolvedSlices = computed<ChatSlices[]>(() => {
  if (props.message.slices?.length) {
    return props.message.slices
  }

  if (typeof props.message.content === 'string' && props.message.content.trim()) {
    return [{ type: 'text', text: props.message.content } satisfies ChatSlicesText]
  }

  if (Array.isArray(props.message.content)) {
    const textPart = props.message.content.find(part => 'type' in part && part.type === 'text') as { text?: string } | undefined
    if (textPart?.text)
      return [{ type: 'text', text: textPart.text } satisfies ChatSlicesText]
  }

  return []
})

const showLoader = computed(() => props.showPlaceholder && resolvedSlices.value.length === 0)
const containerClass = computed(() => props.variant === 'mobile' ? 'mr-0' : 'mr-12')
const boxClasses = computed(() => [
  props.variant === 'mobile' ? 'px-2 py-2 text-sm bg-primary-50/90 dark:bg-primary-950/90' : 'px-3 py-3 bg-primary-50/80 dark:bg-primary-950/80',
])
</script>

<template>
  <div flex :class="containerClass" class="ph-no-capture">
    <div
      flex="~ col" shadow="sm primary-200/50 dark:none"
      min-w-20 rounded-xl h="unset <sm:fit"
      :class="boxClasses"
    >
      <div>
        <span text-sm text="black/60 dark:white/65" font-normal class="inline <sm:hidden">{{ label }}</span>
      </div>
      <div v-if="resolvedSlices.length > 0" class="break-words" text="primary-700 dark:primary-100">
        <template v-for="(slice, sliceIndex) in resolvedSlices" :key="sliceIndex">
          <ChatToolCallBlock
            v-if="slice.type === 'tool-call'"
            :tool-name="slice.toolCall.toolName"
            :args="slice.toolCall.args"
            class="mb-2"
          />
          <template v-else-if="slice.type === 'tool-call-result'" />
          <div
            v-else-if="slice.type === 'execution-status'"
            :class="[
              'mb-2 rounded-md border px-2 py-1 text-xs',
              slice.phase === 'tool-dead-lettered'
                ? 'border-red-400 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/25 dark:text-red-200'
                : slice.phase === 'tool-failed'
                  ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-300'
                  : slice.phase === 'tool-recovery-required'
                    ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/20 dark:text-rose-300'
                    : slice.phase === 'tool-cancelled'
                      ? 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950/20 dark:text-slate-300'
                      : slice.phase === 'tool-timeout'
                        ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950/20 dark:text-orange-300'
                        : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950/20 dark:text-sky-300',
            ]"
          >
            <div class="font-medium">
              {{ slice.label }}
            </div>
            <pre
              v-if="slice.outputPreview"
              class="mt-1 max-h-28 overflow-auto whitespace-pre-wrap break-words border-t border-current/15 pt-1 text-[11px] font-mono opacity-80"
            >{{ slice.outputPreview }}</pre>
          </div>
          <template v-else-if="slice.type === 'text'">
            <MarkdownRenderer :content="slice.text" />
          </template>
        </template>
      </div>
      <div v-else-if="showLoader" i-eos-icons:three-dots-loading />

      <ChatResponsePart
        v-if="message.categorization"
        :message="message"
        :variant="variant"
      />
    </div>
  </div>
</template>
