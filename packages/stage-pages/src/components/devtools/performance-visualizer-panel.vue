<script setup lang="ts">
import { ButtonBar, CheckBar } from '@proj-alicization/stage-ui/components'
import { useDevtoolsLagStore } from '@proj-alicization/stage-ui/stores/devtools/lag'
import { useMagicKeys, whenever } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const lagStore = useDevtoolsLagStore()
const { enabled, lastRecording, recording } = storeToRefs(lagStore)
const { t } = useI18n()

const panelKeyPrefix = 'settings.pages.system.sections.section.developer.sections.section.performance-visualizer.panel'

const recordingLabel = computed(() => recording.value
  ? t(`${panelKeyPrefix}.recording.stop`)
  : t(`${panelKeyPrefix}.recording.start`))
const hasRecording = computed(() => !!lastRecording.value)
const allEnabled = computed(() => enabled.value.fps && enabled.value.frameDuration && enabled.value.longtask && enabled.value.memory)
const recordingTiming = computed(() => {
  const snapshot = lastRecording.value
  if (!snapshot)
    return ''

  return t(`${panelKeyPrefix}.summary.timing`, {
    startedAt: snapshot.startedAt.toFixed(0),
    duration: (snapshot.stoppedAt - snapshot.startedAt).toFixed(0),
  })
})
const recordingSamples = computed(() => {
  const snapshot = lastRecording.value
  if (!snapshot)
    return ''

  return t(`${panelKeyPrefix}.summary.samples`, {
    fps: snapshot.samples.fps.length,
    frameDuration: snapshot.samples.frameDuration.length,
    longtask: snapshot.samples.longtask.length,
    memory: snapshot.samples.memory.length,
  })
})

const magicKeys = useMagicKeys()
whenever(magicKeys['ctrl+alt+l'], () => toggleAll(true))
whenever(magicKeys['ctrl+alt+k'], () => toggleAll(false))

function toggleAll(on: boolean) {
  lagStore.toggleAll(on)
}

function exportCsv() {
  lagStore.exportCsv()
}
</script>

<template>
  <div flex="~ col gap-4" pb-6>
    <div flex="~ col gap-2">
      <div flex="~ row items-center gap-2">
        <CheckBar
          :model-value="allEnabled"
          icon-on="i-solar:sledgehammer-bold-duotone"
          icon-off="i-solar:sledgehammer-bold-duotone"
          :text="`${panelKeyPrefix}.all-metrics.title`"
          :description="`${panelKeyPrefix}.all-metrics.description`"
          @update:model-value="value => toggleAll(Boolean(value))"
        />
        <ButtonBar
          :icon="recording ? 'i-solar:stop-circle-bold-duotone' : 'i-solar:recive-bold-duotone'"
          :text="`${panelKeyPrefix}.recording.title`"
          @click="recording ? lagStore.stopRecording() : lagStore.startRecording()"
        >
          {{ recordingLabel }}
        </ButtonBar>
        <ButtonBar
          icon="i-solar:export-bold-duotone"
          :text="`${panelKeyPrefix}.export.title`"
          :disabled="!hasRecording"
          @click="exportCsv"
        >
          {{ t(`${panelKeyPrefix}.export.button`) }}
        </ButtonBar>
      </div>

      <div flex="~ col gap-2">
        <CheckBar
          v-model="enabled.fps"
          icon-on="i-solar:activity-bold-duotone"
          icon-off="i-solar:activity-bold-duotone"
          :text="`${panelKeyPrefix}.metrics.fps.title`"
          :description="`${panelKeyPrefix}.metrics.fps.description`"
        />
        <CheckBar
          v-model="enabled.frameDuration"
          icon-on="i-solar:chart-bold-duotone"
          icon-off="i-solar:chart-bold-duotone"
          :text="`${panelKeyPrefix}.metrics.frame-duration.title`"
          :description="`${panelKeyPrefix}.metrics.frame-duration.description`"
        />
        <CheckBar
          v-model="enabled.longtask"
          icon-on="i-solar:timer-bold-duotone"
          icon-off="i-solar:timer-bold-duotone"
          :text="`${panelKeyPrefix}.metrics.long-task.title`"
          :description="`${panelKeyPrefix}.metrics.long-task.description`"
        />
        <CheckBar
          v-model="enabled.memory"
          icon-on="i-solar:database-bold-duotone"
          icon-off="i-solar:database-bold-duotone"
          :text="`${panelKeyPrefix}.metrics.memory.title`"
          :description="`${panelKeyPrefix}.metrics.memory.description`"
        />
      </div>
    </div>

    <div v-if="hasRecording" flex="~ col gap-2" rounded="lg" border="1 dashed neutral-700" p-3>
      <div text="sm neutral-200">
        {{ t(`${panelKeyPrefix}.summary.title`) }}
      </div>
      <div text="xs neutral-400">
        {{ recordingTiming }}
      </div>
      <div text="xs neutral-400">
        {{ recordingSamples }}
      </div>
    </div>

    <div text="xs neutral-500">
      {{ t(`${panelKeyPrefix}.summary.overlay-hint`) }}
    </div>
  </div>
</template>
