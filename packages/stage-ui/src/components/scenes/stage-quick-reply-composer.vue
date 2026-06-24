<script setup lang="ts">
import { BasicTextarea } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useChatReplyAbort } from '../../composables'
import { useAlicizationSelfEvolutionInspectorStore } from '../../stores/alicization-self-evolution-inspector'
import { useChatTextComposerStore } from '../../stores/chat/text-composer-store'
import { buildStageQuickReplyClosureDiagnosticEntry } from './stage-quick-reply-closure'
import { resolveStageQuickReplyClosureSummary } from './stage-quick-reply-closure-summary'
import { buildStageQuickReplyProjectBriefLines } from './stage-quick-reply-project-brief'

const composerStore = useChatTextComposerStore()
const { draft, isComposing } = storeToRefs(composerStore)
const { sending, aborting, abortReply } = useChatReplyAbort()
const selfEvolutionInspectorStore = useAlicizationSelfEvolutionInspectorStore()
const { t } = useI18n()
const router = useRouter()
const preDialogueClosureSnapshot = computed(() => selfEvolutionInspectorStore.preDialogueClosureSnapshot)
const preDialogueAwarenessSnapshot = computed(() => selfEvolutionInspectorStore.preDialogueAwarenessSnapshot)
const closureDiagnosticEntry = computed(() => buildStageQuickReplyClosureDiagnosticEntry(
  preDialogueClosureSnapshot.value,
  preDialogueAwarenessSnapshot.value,
))
const closureSummaryLine = computed(() => resolveStageQuickReplyClosureSummary(
  preDialogueClosureSnapshot.value,
  closureDiagnosticEntry.value,
  {
    fallbackAwarenessLine: preDialogueAwarenessSnapshot.value?.awarenessLine ?? null,
    fallbackAwarenessCandidates: [
      preDialogueAwarenessSnapshot.value?.awarenessLine ?? null,
      preDialogueAwarenessSnapshot.value?.summaryLine ?? null,
      preDialogueAwarenessSnapshot.value?.companionBriefingLine ?? null,
    ],
  },
))
const projectSelfBriefLines = computed(() => buildStageQuickReplyProjectBriefLines(
  preDialogueAwarenessSnapshot.value,
  preDialogueClosureSnapshot.value,
))

async function handleSubmit() {
  await composerStore.sendCurrentMessage()
}

async function handleOpenClosureDiagnosis() {
  await router.push({
    path: '/devtools/performance-visualizer',
    query: closureDiagnosticEntry.value.routeQuery,
  })
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
    <details
      v-if="preDialogueClosureSnapshot"
      class="stage-quick-reply__closure"
      open
    >
      <summary class="stage-quick-reply__closure-toggle">
        <span class="stage-quick-reply__closure-label">
          Digital Life Closure
        </span>
        <span class="stage-quick-reply__closure-pill">
          {{ preDialogueClosureSnapshot.status }}
        </span>
      </summary>
      <div
        v-if="closureSummaryLine"
        class="stage-quick-reply__closure-summary"
      >
        {{ closureSummaryLine }}
      </div>
      <div
        v-if="closureDiagnosticEntry.headline"
        class="stage-quick-reply__closure-headline"
      >
        {{ closureDiagnosticEntry.headline }}
      </div>
      <div
        v-if="closureDiagnosticEntry.nextClosureLine"
        class="stage-quick-reply__closure-next"
      >
        {{ closureDiagnosticEntry.nextClosureLine }}
      </div>
      <ul
        v-if="projectSelfBriefLines.length > 0"
        class="stage-quick-reply__closure-project-brief"
      >
        <li
          v-for="(line, index) in projectSelfBriefLines"
          :key="`project-self-brief:${index}:${line}`"
          class="stage-quick-reply__closure-project-brief-line"
        >
          {{ line }}
        </li>
      </ul>
      <ul
        v-if="preDialogueClosureSnapshot.briefingLines?.length"
        class="stage-quick-reply__closure-briefing"
      >
        <li
          v-for="(line, index) in preDialogueClosureSnapshot.briefingLines"
          :key="`briefing:${index}:${line}`"
          class="stage-quick-reply__closure-briefing-line"
        >
          {{ line }}
        </li>
      </ul>
      <ul
        v-if="preDialogueClosureSnapshot.reasons.length > 0"
        class="stage-quick-reply__closure-reasons"
      >
        <li
          v-for="(reason, index) in preDialogueClosureSnapshot.reasons"
          :key="`${index}:${reason}`"
          class="stage-quick-reply__closure-reason"
        >
          {{ reason }}
        </li>
      </ul>
      <div class="stage-quick-reply__closure-hint">
        {{ closureDiagnosticEntry.hint }}
      </div>
      <button
        v-if="closureDiagnosticEntry.visible"
        type="button"
        class="stage-quick-reply__closure-action"
        @click="handleOpenClosureDiagnosis"
      >
        {{ closureDiagnosticEntry.label }}
      </button>
    </details>
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
  flex-direction: column;
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

.stage-quick-reply__closure {
  width: 100%;
  border: 1px solid rgb(99 68 39 / 14%);
  border-radius: 1rem 1.1rem 0.85rem 0.95rem;
  background: linear-gradient(135deg, rgb(120 85 49 / 8%) 0%, rgb(255 255 255 / 36%) 100%);
  padding: 0.55rem 0.7rem;
}

.stage-quick-reply__closure-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  cursor: pointer;
  list-style: none;
}

.stage-quick-reply__closure-toggle::-webkit-details-marker {
  display: none;
}

.stage-quick-reply__closure-label {
  color: rgb(104 76 49 / 88%);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stage-quick-reply__closure-pill {
  border: 1px solid rgb(111 77 44 / 14%);
  border-radius: 999px;
  background: rgb(255 250 243 / 72%);
  color: rgb(91 63 36 / 90%);
  font-size: 0.68rem;
  line-height: 1;
  padding: 0.24rem 0.48rem;
  text-transform: capitalize;
}

.stage-quick-reply__closure-summary {
  margin-top: 0.22rem;
  color: rgb(67 46 29 / 92%);
  font-size: 0.78rem;
  line-height: 1.35;
}

.stage-quick-reply__closure-headline {
  margin-top: 0.42rem;
  border: 1px solid rgb(149 88 46 / 18%);
  border-radius: 0.82rem;
  background: linear-gradient(135deg, rgb(169 103 56 / 12%) 0%, rgb(255 247 236 / 86%) 100%);
  color: rgb(96 58 31 / 96%);
  font-size: 0.74rem;
  font-weight: 600;
  line-height: 1.42;
  padding: 0.46rem 0.58rem;
}

.stage-quick-reply__closure-next {
  margin-top: 0.34rem;
  color: rgb(101 70 43 / 92%);
  font-size: 0.72rem;
  line-height: 1.38;
}

.stage-quick-reply__closure-project-brief {
  margin: 0.42rem 0 0;
  padding-left: 1rem;
  color: rgb(84 58 36 / 88%);
  font-size: 0.73rem;
  line-height: 1.42;
}

.stage-quick-reply__closure-project-brief-line + .stage-quick-reply__closure-project-brief-line {
  margin-top: 0.16rem;
}

.stage-quick-reply__closure-briefing {
  margin: 0.42rem 0 0;
  padding-left: 1rem;
  color: rgb(75 52 32 / 88%);
  font-size: 0.73rem;
  line-height: 1.42;
}

.stage-quick-reply__closure-briefing-line + .stage-quick-reply__closure-briefing-line {
  margin-top: 0.16rem;
}

.stage-quick-reply__closure-reasons {
  margin: 0.42rem 0 0;
  padding-left: 1rem;
  color: rgb(88 61 39 / 88%);
  font-size: 0.74rem;
  line-height: 1.45;
}

.stage-quick-reply__closure-reason + .stage-quick-reply__closure-reason {
  margin-top: 0.18rem;
}

.stage-quick-reply__closure-hint {
  margin-top: 0.45rem;
  color: rgb(114 83 55 / 78%);
  font-size: 0.7rem;
  line-height: 1.35;
}

.stage-quick-reply__closure-action {
  margin-top: 0.48rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(95 66 40 / 18%);
  border-radius: 999px;
  background: rgb(255 250 243 / 78%);
  color: rgb(88 60 34 / 92%);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1;
  padding: 0.42rem 0.68rem;
  transition:
    transform 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease;
}

.stage-quick-reply__closure-action:hover {
  transform: translateY(-1px);
  background: rgb(255 246 233 / 92%);
  border-color: rgb(95 66 40 / 26%);
}

.stage-quick-reply__closure-action:active {
  transform: translateY(1px);
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
