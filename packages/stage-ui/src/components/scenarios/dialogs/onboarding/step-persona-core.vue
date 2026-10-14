<script setup lang="ts">
import type { OnboardingStepNextHandler, OnboardingStepPrevHandler } from './types'

import { Textarea } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import PersonaStepShell from './persona-step-shell.vue'
import PersonaTraitControl from './persona-trait-control.vue'

import { useAlicizationGenesisWorkshopStore } from '../../../../stores/alicization-genesis-workshop'

const props = defineProps<{ onNext: OnboardingStepNextHandler, onPrevious: OnboardingStepPrevHandler }>()
const { t } = useI18n()
const { draft } = storeToRefs(useAlicizationGenesisWorkshopStore())
const traits = ['obedience', 'liveliness', 'sensibility'] as const
const freeDescription = computed({
  get: () => draft.value.freeDescription ?? '',
  set: (value: string) => { draft.value.freeDescription = value },
})
</script>

<template>
  <PersonaStepShell :step="2" :title="t('settings.dialogs.onboarding.personaWorkshop.core.title')" :description="t('settings.dialogs.onboarding.personaWorkshop.core.description')" :action="t('settings.dialogs.onboarding.next')" @previous="props.onPrevious()" @next="props.onNext()">
    <div class="py-2 space-y-6">
      <div v-if="draft.presetTemperament" class="grid gap-6 sm:grid-cols-3">
        <PersonaTraitControl v-for="trait in traits" :key="trait" v-model="draft.presetTemperament[trait]" :label="t(`settings.dialogs.onboarding.personaWorkshop.core.${trait}`)" :low="t(`settings.dialogs.onboarding.personaWorkshop.core.traits.${trait}.low`)" :balanced="t(`settings.dialogs.onboarding.personaWorkshop.core.traits.${trait}.balanced`)" :high="t(`settings.dialogs.onboarding.personaWorkshop.core.traits.${trait}.high`)" />
      </div>
      <label class="block space-y-2">
        <span class="text-sm font-medium">{{ t('settings.dialogs.onboarding.personaWorkshop.core.freeDescription') }}</span>
        <Textarea v-model="freeDescription" :rows="3" :placeholder="t('settings.dialogs.onboarding.personaWorkshop.core.descriptionPlaceholder')" class="!resize-none !whitespace-pre-wrap !rounded-xl !p-3 !leading-6 !shadow-none" />
      </label>
      <p class="text-xs text-neutral-500 leading-5">
        {{ t('settings.dialogs.onboarding.personaWorkshop.core.examplesBody') }}
      </p>
    </div>
  </PersonaStepShell>
</template>
