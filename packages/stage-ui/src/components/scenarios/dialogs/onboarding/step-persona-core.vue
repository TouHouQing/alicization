<script setup lang="ts">
import type { OnboardingStepNextHandler, OnboardingStepPrevHandler } from './types'

import { Button, Input, Textarea } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAlicizationGenesisWorkshopStore } from '../../../../stores/alicization-genesis-workshop'

const props = defineProps<{
  onNext: OnboardingStepNextHandler
  onPrevious: OnboardingStepPrevHandler
}>()

const { t } = useI18n()
const workshopStore = useAlicizationGenesisWorkshopStore()
const { draft } = storeToRefs(workshopStore)

const temperamentSummary = computed(() => {
  const values = draft.value.presetTemperament
  return [values?.obedience, values?.liveliness, values?.sensibility]
    .map(value => `${Math.round((value ?? 0.5) * 100)}%`)
    .join(' / ')
})
</script>

<template>
  <div h-full flex flex-col gap-4>
    <div sticky top-0 z-100 flex flex-shrink-0 items-center gap-2>
      <button outline-none @click="props.onPrevious">
        <div class="i-solar:alt-arrow-left-line-duotone h-5 w-5" />
      </button>
      <h2 class="flex-1 text-center text-xl text-neutral-800 font-semibold md:text-left md:text-2xl dark:text-neutral-100">
        {{ t('settings.dialogs.onboarding.personaWorkshop.core.title') }}
      </h2>
      <div class="h-5 w-5" />
    </div>
    <div class="flex-1 overflow-y-auto space-y-4">
      <div class="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 text-sm leading-6 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200">
        {{ t('settings.dialogs.onboarding.personaWorkshop.core.description') }}
      </div>
      <div class="grid gap-3 md:grid-cols-3">
        <label class="space-y-2">
          <div class="text-xs text-neutral-500">
            {{ t('settings.dialogs.onboarding.personaWorkshop.core.obedience') }}
          </div>
          <Input v-model="draft.presetTemperament!.obedience" type="number" :min="0" :max="1" :step="0.1" />
        </label>
        <label class="space-y-2">
          <div class="text-xs text-neutral-500">
            {{ t('settings.dialogs.onboarding.personaWorkshop.core.liveliness') }}
          </div>
          <Input v-model="draft.presetTemperament!.liveliness" type="number" :min="0" :max="1" :step="0.1" />
        </label>
        <label class="space-y-2">
          <div class="text-xs text-neutral-500">
            {{ t('settings.dialogs.onboarding.personaWorkshop.core.sensibility') }}
          </div>
          <Input v-model="draft.presetTemperament!.sensibility" type="number" :min="0" :max="1" :step="0.1" />
        </label>
      </div>
      <div class="rounded-2xl border border-dashed border-primary-200 bg-primary-50/70 p-4 text-sm text-primary-700 dark:border-primary-700/60 dark:bg-primary-900/10 dark:text-primary-200">
        {{ t('settings.dialogs.onboarding.personaWorkshop.core.summary', { summary: temperamentSummary }) }}
      </div>
      <label class="block space-y-2">
        <div class="text-xs text-neutral-500">
          {{ t('settings.dialogs.onboarding.personaWorkshop.core.freeDescription') }}
        </div>
        <Textarea v-model="draft.freeDescription" rows="5" />
      </label>
      <div class="space-y-2">
        <div class="text-xs text-neutral-500">
          {{ t('settings.dialogs.onboarding.personaWorkshop.core.examplesTitle') }}
        </div>
        <div class="rounded-xl bg-white/70 p-3 text-sm text-neutral-600 dark:bg-neutral-950/60 dark:text-neutral-300">
          {{ t('settings.dialogs.onboarding.personaWorkshop.core.examplesBody') }}
        </div>
      </div>
    </div>
    <Button :label="t('settings.dialogs.onboarding.next')" @click="props.onNext()" />
  </div>
</template>
