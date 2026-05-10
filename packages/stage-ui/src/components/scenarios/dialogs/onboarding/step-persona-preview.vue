<script setup lang="ts">
import type { OnboardingStepNextHandler, OnboardingStepPrevHandler } from './types'

import { Button, Textarea } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAlicizationEpoch1Store } from '../../../../stores/alicization-epoch1'
import { useAlicizationGenesisWorkshopStore } from '../../../../stores/alicization-genesis-workshop'

const props = defineProps<{
  onNext: OnboardingStepNextHandler
  onPrevious: OnboardingStepPrevHandler
}>()

const emit = defineEmits<{
  (e: 'completed'): void
}>()

const { t } = useI18n()
const workshopStore = useAlicizationGenesisWorkshopStore()
const epoch1Store = useAlicizationEpoch1Store()
const { draft, previewNotes, previewSummary } = storeToRefs(workshopStore)
const submitting = ref(false)
const correctionText = ref('')

const previewLines = computed(() => [
  draft.value.freeDescription || t('settings.dialogs.onboarding.personaWorkshop.preview.emptyDescription'),
  ...(draft.value.antiPersonaConstraints ?? []),
])

const previewInterpretation = computed(() => {
  const temperament = draft.value.presetTemperament ?? {}
  const summary = [
    `${t('settings.dialogs.onboarding.personaWorkshop.core.obedience')}: ${Math.round((temperament.obedience ?? 0.5) * 100)}%`,
    `${t('settings.dialogs.onboarding.personaWorkshop.core.liveliness')}: ${Math.round((temperament.liveliness ?? 0.5) * 100)}%`,
    `${t('settings.dialogs.onboarding.personaWorkshop.core.sensibility')}: ${Math.round((temperament.sensibility ?? 0.5) * 100)}%`,
  ].join(' / ')

  const notes = [
    draft.value.relationshipPosture
      ? `Relationship posture: ${draft.value.relationshipPosture}`
      : 'Relationship posture: companion',
    draft.value.initiativeStyle
      ? `Initiative style: ${draft.value.initiativeStyle}`
      : 'Initiative style: measured-approach',
    draft.value.calibration?.silenceReconnect
      ? `Reconnect after silence: ${draft.value.calibration.silenceReconnect}`
      : 'Reconnect after silence: light-probe',
  ]

  return { summary, notes }
})

watch(previewInterpretation, (value) => {
  workshopStore.setPreviewFeedback({
    notes: value.notes,
    summary: value.summary,
    decision: 'pending',
  })
}, { immediate: true })

watch(correctionText, (value) => {
  const corrections = value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)

  workshopStore.setPreviewCorrections(corrections)
  workshopStore.setPreviewFeedback({
    notes: previewInterpretation.value.notes,
    summary: corrections.length > 0
      ? `${previewInterpretation.value.summary} | Corrections: ${corrections.join(' / ')}`
      : previewInterpretation.value.summary,
    decision: 'pending',
  })
}, { immediate: true })

watch(
  () => draft.value.previewCorrections,
  (value) => {
    correctionText.value = (value ?? []).join('\n')
  },
  { immediate: true },
)

async function completePreview() {
  if (submitting.value)
    return

  submitting.value = true
  try {
    const payload = workshopStore.snapshotDraft()
    const result = await epoch1Store.initializeGenesis({
      ownerName: '指挥官',
      hostName: '主人',
      alicizationName: '小艾',
      gender: 'female',
      genderCustom: '',
      relationship: '女仆',
      mindAge: 18,
      personality: {
        obedience: draft.value.presetTemperament?.obedience ?? 0.5,
        liveliness: draft.value.presetTemperament?.liveliness ?? 0.5,
        sensibility: draft.value.presetTemperament?.sensibility ?? 0.5,
        identityAnchors: [],
        antiPersonaConstraints: draft.value.antiPersonaConstraints,
      },
      personaWorkshop: payload,
    })
    if (result && !epoch1Store.needsGenesis) {
      workshopStore.setPreviewFeedback({
        notes: ['Genesis accepted.'],
        summary: previewInterpretation.value.summary,
        decision: 'ready',
      })
      emit('completed')
      await props.onNext()
    }
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div h-full flex flex-col gap-4>
    <div sticky top-0 z-100 flex flex-shrink-0 items-center gap-2>
      <button outline-none @click="props.onPrevious">
        <div class="i-solar:alt-arrow-left-line-duotone h-5 w-5" />
      </button>
      <h2 class="flex-1 text-center text-xl text-neutral-800 font-semibold md:text-left md:text-2xl dark:text-neutral-100">
        {{ t('settings.dialogs.onboarding.personaWorkshop.preview.title') }}
      </h2>
      <div class="h-5 w-5" />
    </div>
    <div class="flex-1 overflow-y-auto space-y-4">
      <div class="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 text-sm leading-6 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200">
        {{ t('settings.dialogs.onboarding.personaWorkshop.preview.description') }}
      </div>
      <div class="rounded-2xl border border-dashed border-primary-200 bg-primary-50/70 p-4 text-sm text-primary-700 dark:border-primary-700/60 dark:bg-primary-900/10 dark:text-primary-200">
        {{ previewSummary || t('settings.dialogs.onboarding.personaWorkshop.preview.summaryPending') }}
      </div>
      <label class="block space-y-2">
        <div class="text-xs text-neutral-500">
          {{ t('settings.dialogs.onboarding.personaWorkshop.preview.correctionsTitle') }}
        </div>
        <Textarea
          v-model="correctionText"
          :rows="4"
        />
      </label>
      <div class="rounded-2xl bg-white/70 p-3 text-sm text-neutral-600 dark:bg-neutral-950/60 dark:text-neutral-300">
        <div v-for="line in previewLines" :key="line" class="mb-2 last:mb-0">
          {{ line }}
        </div>
      </div>
      <div class="space-y-2">
        <div class="text-xs text-neutral-500">
          {{ t('settings.dialogs.onboarding.personaWorkshop.preview.notesTitle') }}
        </div>
        <div class="rounded-xl bg-white/70 p-3 text-sm text-neutral-600 dark:bg-neutral-950/60 dark:text-neutral-300">
          <div v-for="note in previewNotes" :key="note">{{ note }}</div>
          <div v-if="previewNotes.length === 0">
            {{ t('settings.dialogs.onboarding.personaWorkshop.preview.notesEmpty') }}
          </div>
        </div>
      </div>
    </div>
    <Button :label="t('settings.dialogs.onboarding.personaWorkshop.preview.complete')" :loading="submitting" @click="completePreview" />
  </div>
</template>
