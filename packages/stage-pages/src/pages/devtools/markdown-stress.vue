<script setup lang="ts">
import { ButtonBar, Section } from '@proj-alicization/stage-ui/components'
import { useMarkdownStressStore } from '@proj-alicization/stage-ui/stores/markdown-stress'
import { Callout } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const stressStore = useMarkdownStressStore()
const { t } = useI18n()
const { capturing, events, isMock, lastRun, payloadPreview, scheduleDelayMs, runState } = storeToRefs(stressStore)

const previewText = computed(() => payloadPreview.value ?? '')
const runStateLabel = computed(() => {
  return t(`settings.pages.system.sections.section.developer.sections.section.markdown-stress.states.${runState.value}`)
})
const capturingLabel = computed(() => {
  return t(`settings.pages.system.sections.section.developer.sections.section.markdown-stress.capturing.${capturing.value ? 'yes' : 'no'}`)
})
const lastRunSummary = computed(() => {
  if (!lastRun.value)
    return undefined

  return {
    events: lastRun.value.events.length,
    durationMs: (lastRun.value.stoppedAt - lastRun.value.startedAt).toFixed(0),
  }
})
const runSummary = computed(() => {
  return t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.run_state.summary', {
    state: runStateLabel.value,
    capturing: capturingLabel.value,
    events: events.value.length,
  })
})

function toggleCapture() {
  if (capturing.value)
    stressStore.stopCapture()
  else
    stressStore.startCapture()
}

function toggleMode() {
  stressStore.toggleMockMode()
}
</script>

<template>
  <div class="grid gap-4 p-4 lg:grid-cols-[1.5fr_1fr]">
    <Section
      :title="t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.title')"
      :description="t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.description')"
      icon="i-solar:code-circle-bold-duotone"
      inner-class="gap-4"
    >
      <div class="flex flex-wrap gap-2">
        <ButtonBar
          class="w-full sm:w-auto"
          icon="i-solar:magic-stick-bold-duotone"
          :text="t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.actions.preview.text')"
          @click="stressStore.generatePreview()"
        >
          {{ t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.actions.preview.description') }}
        </ButtonBar>
        <ButtonBar
          class="w-full sm:w-auto"
          icon="i-solar:play-circle-bold-duotone"
          :text="runState === 'running'
            ? t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.actions.replay.text_running')
            : runState === 'scheduled'
              ? t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.actions.replay.text_scheduled')
              : t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.actions.replay.text_idle')"
          :disabled="!isMock && !stressStore.canRunOnline"
          @click="stressStore.scheduleRun()"
        >
          {{ runState === 'running'
            ? t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.actions.replay.description_running')
            : runState === 'scheduled'
              ? t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.actions.replay.description_scheduled')
              : t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.actions.replay.description_idle') }}
        </ButtonBar>
        <ButtonBar
          class="w-full sm:w-auto"
          :icon="capturing ? 'i-solar:stop-circle-bold-duotone' : 'i-solar:recive-bold-duotone'"
          :text="t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.actions.capture.text')"
          @click="toggleCapture"
        >
          {{ capturing
            ? t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.actions.capture.stop')
            : t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.actions.capture.start') }}
        </ButtonBar>
        <ButtonBar
          class="w-full sm:w-auto"
          icon="i-solar:export-bold-duotone"
          :text="t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.actions.export.text')"
          :disabled="!lastRun?.events.length"
          @click="stressStore.exportCsv()"
        >
          {{ t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.actions.export.description') }}
        </ButtonBar>
        <ButtonBar
          class="w-full sm:w-auto"
          :icon="isMock ? 'i-solar:simplerockets-bold-duotone' : 'i-solar:cloud-bold-duotone'"
          :text="isMock
            ? t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.actions.mode.mock')
            : t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.actions.mode.live')"
          @click="toggleMode"
        >
          {{ isMock
            ? t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.actions.mode.switch_live')
            : t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.actions.mode.switch_mock') }}
        </ButtonBar>
      </div>

      <div class="grid gap-3 md:grid-cols-[auto_1fr] md:items-center">
        <label class="text-xs text-neutral-400">
          {{ t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.fields.schedule_delay') }}
        </label>
        <input
          v-model.number="scheduleDelayMs"
          type="number"
          min="0"
          class="max-w-[180px] w-full border border-neutral-700 rounded bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
        >
      </div>

      <Callout :label="t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.run_state.title')" theme="violet">
        <div class="text-xs text-neutral-200">
          {{ runSummary }}
        </div>
        <div class="text-xs text-neutral-500">
          {{ t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.run_state.hint') }}
        </div>
      </Callout>

      <Callout v-if="lastRunSummary" :label="t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.last_run.title')" theme="orange">
        <div class="text-xs text-neutral-200">
          {{ t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.last_run.summary', {
            events: lastRunSummary.events,
            duration: lastRunSummary.durationMs,
          }) }}
        </div>
        <div class="text-xs text-neutral-500">
          {{ t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.last_run.hint') }}
        </div>
      </Callout>
    </Section>

    <div class="border border-neutral-800/70 rounded-xl bg-neutral-900/60 p-4 shadow-sm lg:col-span-1 space-y-3">
      <div class="text-sm text-neutral-200">
        {{ t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.traces.title') }}
      </div>
      <div class="text-xs text-neutral-400">
        {{ t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.traces.summary', {
          capturing: capturingLabel,
          events: events.length,
        }) }}
      </div>
      <ul class="max-h-64 overflow-auto text-xs text-neutral-300 space-y-1">
        <li v-for="(event, idx) in events.slice(-20).reverse()" :key="idx">
          <span class="text-neutral-100 font-mono">{{ event.name }}</span>
          — {{ (event.duration ?? 0).toFixed(2) }} ms
          <span v-if="event.meta" class="text-neutral-500"> {{ JSON.stringify(event.meta) }}</span>
        </li>
      </ul>
    </div>

    <Section
      :title="t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.payload.title')"
      icon="i-solar:code-file-bold-duotone"
      inner-class="gap-3"
      class="lg:col-span-2"
    >
      <div class="text-xs text-neutral-300">
        {{ t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.payload.subtitle') }}
      </div>

      <div v-if="previewText" class="border border-neutral-700 rounded-lg border-dashed bg-neutral-900/60 p-3 space-y-2">
        <pre class="max-h-60 overflow-auto whitespace-pre-wrap text-xs text-neutral-200">{{ previewText }}</pre>
      </div>
      <div v-else class="text-xs text-neutral-500">
        {{ t('settings.pages.system.sections.section.developer.sections.section.markdown-stress.payload.empty') }}
      </div>
    </Section>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: tamagotchi.settings.devtools.pages.markdown-stress.title
  subtitleKey: tamagotchi.settings.devtools.title
</route>
