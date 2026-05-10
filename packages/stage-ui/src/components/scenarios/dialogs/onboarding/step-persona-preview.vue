<script setup lang="ts">
import type { OnboardingStepNextHandler, OnboardingStepPrevHandler } from './types'

import { Button, Textarea } from '@proj-alicization/ui'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { defaultAlicizationPersonality, defaultAlicizationProfile } from '@proj-alicization/stage-shared'
import { useAlicizationEpoch1Store } from '../../../../stores/alicization-epoch1'
import { useAlicizationGenesisWorkshopStore } from '../../../../stores/alicization-genesis-workshop'

const props = defineProps<{
  onNext: OnboardingStepNextHandler
  onPrevious: OnboardingStepPrevHandler
}>()

const { t } = useI18n()
const workshopStore = useAlicizationGenesisWorkshopStore()
const epoch1Store = useAlicizationEpoch1Store()
const { draft } = workshopStore
const submitting = ref(false)
const correctionText = ref('')

function localizedCalibrationLabel(kind: 'relationshipPosture' | 'initiativeStyle' | 'silenceReconnect', value: string) {
  const map = {
    relationshipPosture: {
      companion: t('settings.dialogs.onboarding.personaWorkshop.preview.relationshipPostureLabels.companion'),
      guardian: t('settings.dialogs.onboarding.personaWorkshop.preview.relationshipPostureLabels.guardian'),
      lover: t('settings.dialogs.onboarding.personaWorkshop.preview.relationshipPostureLabels.lover'),
      partner: t('settings.dialogs.onboarding.personaWorkshop.preview.relationshipPostureLabels.partner'),
      observer: t('settings.dialogs.onboarding.personaWorkshop.preview.relationshipPostureLabels.observer'),
    },
    initiativeStyle: {
      observant: t('settings.dialogs.onboarding.personaWorkshop.preview.initiativeStyleLabels.observant'),
      'measured-approach': t('settings.dialogs.onboarding.personaWorkshop.preview.initiativeStyleLabels.measuredApproach'),
      'direct-approach': t('settings.dialogs.onboarding.personaWorkshop.preview.initiativeStyleLabels.directApproach'),
      'high-participation': t('settings.dialogs.onboarding.personaWorkshop.preview.initiativeStyleLabels.highParticipation'),
    },
    silenceReconnect: {
      hold: t('settings.dialogs.onboarding.personaWorkshop.preview.silenceReconnectLabels.hold'),
      'light-probe': t('settings.dialogs.onboarding.personaWorkshop.preview.silenceReconnectLabels.lightProbe'),
      'direct-approach': t('settings.dialogs.onboarding.personaWorkshop.preview.silenceReconnectLabels.directApproach'),
    },
  } as const

  return map[kind][value as keyof typeof map[typeof kind]] ?? value
}

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
      ? t('settings.dialogs.onboarding.personaWorkshop.preview.relationshipPosture', { value: localizedCalibrationLabel('relationshipPosture', draft.value.relationshipPosture) })
      : t('settings.dialogs.onboarding.personaWorkshop.preview.relationshipPostureDefault'),
    draft.value.initiativeStyle
      ? t('settings.dialogs.onboarding.personaWorkshop.preview.initiativeStyle', { value: localizedCalibrationLabel('initiativeStyle', draft.value.initiativeStyle) })
      : t('settings.dialogs.onboarding.personaWorkshop.preview.initiativeStyleDefault'),
    draft.value.calibration?.silenceReconnect
      ? t('settings.dialogs.onboarding.personaWorkshop.preview.reconnectAfterSilence', { value: localizedCalibrationLabel('silenceReconnect', draft.value.calibration.silenceReconnect) })
      : t('settings.dialogs.onboarding.personaWorkshop.preview.reconnectAfterSilenceDefault'),
  ]

  return { summary, notes }
})

watch(correctionText, (value) => {
  const corrections = value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)

  draft.value.previewCorrections = corrections
}, { immediate: true })

watch(
  () => draft.value.previewCorrections,
  (value) => {
    correctionText.value = (value ?? []).join('\n')
  },
  { immediate: true },
)

function buildGenesisPayload() {
  const personaWorkshop = workshopStore.snapshotDraft()
  return {
    ownerName: defaultAlicizationProfile.ownerName,
    hostName: defaultAlicizationProfile.hostName,
    alicizationName: defaultAlicizationProfile.alicizationName,
    gender: defaultAlicizationProfile.gender,
    genderCustom: defaultAlicizationProfile.genderCustom,
    relationship: defaultAlicizationProfile.relationship,
    mindAge: defaultAlicizationProfile.mindAge,
    personality: {
      ...defaultAlicizationPersonality,
      identityAnchors: [...(defaultAlicizationPersonality.identityAnchors ?? [])],
      antiPersonaConstraints: [...(draft.value.antiPersonaConstraints ?? [])],
    },
    personaWorkshop,
  }
}

async function completePreview() {
  if (submitting.value)
    return

  submitting.value = true
  try {
    const payload = buildGenesisPayload()
    const result = await epoch1Store.initializeGenesis(payload)
    if (result && !epoch1Store.needsGenesis) {
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
        {{ previewInterpretation.summary }}
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
          <div v-for="note in previewInterpretation.notes" :key="note">{{ note }}</div>
          <div v-if="previewInterpretation.notes.length === 0">
            {{ t('settings.dialogs.onboarding.personaWorkshop.preview.notesEmpty') }}
          </div>
        </div>
      </div>
    </div>
    <Button :label="t('settings.dialogs.onboarding.personaWorkshop.preview.complete')" :loading="submitting" @click="completePreview" />
  </div>
</template>
