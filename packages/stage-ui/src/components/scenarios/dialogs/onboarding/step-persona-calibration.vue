<script setup lang="ts">
import type { OnboardingStepNextHandler, OnboardingStepPrevHandler } from './types'

import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import PersonaStepShell from './persona-step-shell.vue'
import PersonaStyleChoice from './persona-style-choice.vue'

import { useAlicizationGenesisWorkshopStore } from '../../../../stores/alicization-genesis-workshop'

const props = defineProps<{ onNext: OnboardingStepNextHandler, onPrevious: OnboardingStepPrevHandler }>()
const { t } = useI18n()
const { draft } = storeToRefs(useAlicizationGenesisWorkshopStore())
function option<T extends string>(value: T, key: string) {
  return {
    value,
    label: t(`settings.dialogs.onboarding.personaWorkshop.calibration.options.${key}`),
    hint: t(`settings.dialogs.onboarding.personaWorkshop.calibration.hints.${key}`),
  }
}
const silenceOptions = computed(() => [option('hold', 'hold'), option('light-probe', 'lightProbe'), option('direct-approach', 'directApproach')])
const comfortOptions = computed(() => [option('quiet-presence', 'quietPresence'), option('gentle-care', 'gentleCare'), option('take-charge', 'takeCharge')])
const jealousyOptions = computed(() => [option('mask-it', 'maskIt'), option('soft-ache', 'softAche'), option('say-it', 'sayIt')])
</script>

<template>
  <PersonaStepShell :step="3" :title="t('settings.dialogs.onboarding.personaWorkshop.calibration.title')" :description="t('settings.dialogs.onboarding.personaWorkshop.calibration.description')" :action="t('settings.dialogs.onboarding.next')" @previous="props.onPrevious()" @next="props.onNext()">
    <div v-if="draft.calibration" class="py-2 space-y-3">
      <PersonaStyleChoice v-model="draft.calibration.silenceReconnect" :label="t('settings.dialogs.onboarding.personaWorkshop.calibration.silenceReconnect')" :options="silenceOptions" />
      <PersonaStyleChoice v-model="draft.calibration.comfortStyle" :label="t('settings.dialogs.onboarding.personaWorkshop.calibration.comfortStyle')" :options="comfortOptions" />
      <PersonaStyleChoice v-model="draft.calibration.jealousyStyle" :label="t('settings.dialogs.onboarding.personaWorkshop.calibration.jealousyStyle')" :options="jealousyOptions" />
    </div>
  </PersonaStepShell>
</template>
