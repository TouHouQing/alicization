<script setup lang="ts">
import type { OnboardingStepNextHandler, OnboardingStepPrevHandler } from './types'

import { Button } from '@proj-alicization/ui'
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

const calibrationSummary = computed(() => {
  return [
    draft.value.calibration?.silenceReconnect,
    draft.value.calibration?.comfortStyle,
    draft.value.calibration?.jealousyStyle,
  ].filter(Boolean).join(' / ')
})
</script>

<template>
  <div h-full flex flex-col gap-4>
    <div sticky top-0 z-100 flex flex-shrink-0 items-center gap-2>
      <button outline-none @click="props.onPrevious">
        <div class="i-solar:alt-arrow-left-line-duotone h-5 w-5" />
      </button>
      <h2 class="flex-1 text-center text-xl text-neutral-800 font-semibold md:text-left md:text-2xl dark:text-neutral-100">
        {{ t('settings.dialogs.onboarding.personaWorkshop.calibration.title') }}
      </h2>
      <div class="h-5 w-5" />
    </div>
    <div class="flex-1 overflow-y-auto space-y-4">
      <div class="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 text-sm leading-6 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200">
        {{ t('settings.dialogs.onboarding.personaWorkshop.calibration.description') }}
      </div>
      <div class="grid gap-3 md:grid-cols-3">
        <label class="space-y-2">
          <div class="text-xs text-neutral-500">
            {{ t('settings.dialogs.onboarding.personaWorkshop.calibration.silenceReconnect') }}
          </div>
          <select v-model="draft.calibration!.silenceReconnect" class="w-full rounded-lg border-2 border-neutral-100 bg-neutral-50 px-2 py-2 text-sm outline-none dark:border-neutral-900 dark:bg-neutral-950">
            <option value="hold">Hold</option>
            <option value="light-probe">Light probe</option>
            <option value="direct-approach">Direct approach</option>
          </select>
        </label>
        <label class="space-y-2">
          <div class="text-xs text-neutral-500">
            {{ t('settings.dialogs.onboarding.personaWorkshop.calibration.comfortStyle') }}
          </div>
          <select v-model="draft.calibration!.comfortStyle" class="w-full rounded-lg border-2 border-neutral-100 bg-neutral-50 px-2 py-2 text-sm outline-none dark:border-neutral-900 dark:bg-neutral-950">
            <option value="quiet-presence">Quiet presence</option>
            <option value="gentle-care">Gentle care</option>
            <option value="take-charge">Take charge</option>
          </select>
        </label>
        <label class="space-y-2">
          <div class="text-xs text-neutral-500">
            {{ t('settings.dialogs.onboarding.personaWorkshop.calibration.jealousyStyle') }}
          </div>
          <select v-model="draft.calibration!.jealousyStyle" class="w-full rounded-lg border-2 border-neutral-100 bg-neutral-50 px-2 py-2 text-sm outline-none dark:border-neutral-900 dark:bg-neutral-950">
            <option value="mask-it">Mask it</option>
            <option value="soft-ache">Soft ache</option>
            <option value="say-it">Say it</option>
          </select>
        </label>
      </div>
      <div class="rounded-2xl border border-dashed border-primary-200 bg-primary-50/70 p-4 text-sm text-primary-700 dark:border-primary-700/60 dark:bg-primary-900/10 dark:text-primary-200">
        {{ t('settings.dialogs.onboarding.personaWorkshop.calibration.summary', { summary: calibrationSummary }) }}
      </div>
      <div class="rounded-2xl bg-white/70 p-3 text-sm text-neutral-600 dark:bg-neutral-950/60 dark:text-neutral-300">
        {{ t('settings.dialogs.onboarding.personaWorkshop.calibration.examplesBody') }}
      </div>
    </div>
    <Button :label="t('settings.dialogs.onboarding.next')" @click="props.onNext()" />
  </div>
</template>
