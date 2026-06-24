<script setup lang="ts">
import type { OnboardingStepNextHandler, OnboardingStepPrevHandler } from './types'

import { Button } from '@proj-alicization/ui'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  onNext: OnboardingStepNextHandler
  onPrevious: OnboardingStepPrevHandler
}>()

const { t } = useI18n()
</script>

<template>
  <div h-full flex flex-col gap-4>
    <div sticky top-0 z-100 flex flex-shrink-0 items-center gap-2>
      <button outline-none @click="props.onPrevious">
        <div class="i-solar:alt-arrow-left-line-duotone h-5 w-5" />
      </button>
      <h2 class="flex-1 text-center text-xl text-neutral-800 font-semibold md:text-left md:text-2xl dark:text-neutral-100">
        {{ t('settings.dialogs.onboarding.personaWorkshop.intro.title') }}
      </h2>
      <div class="h-5 w-5" />
    </div>
    <div class="flex-1 overflow-y-auto border border-neutral-200 rounded-2xl bg-neutral-50/80 p-4 text-sm text-neutral-700 leading-6 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200">
      <div class="space-y-3">
        <p>{{ t('settings.dialogs.onboarding.personaWorkshop.intro.lead') }}</p>
        <div class="rounded-xl bg-white/70 p-3 dark:bg-neutral-950/70">
          <div class="font-medium">
            {{ t('settings.dialogs.onboarding.personaWorkshop.intro.exampleTitle') }}
          </div>
          <div class="mt-2 text-neutral-500 dark:text-neutral-400">
            {{ t('settings.dialogs.onboarding.personaWorkshop.intro.exampleBody') }}
          </div>
        </div>
        <p>{{ t('settings.dialogs.onboarding.personaWorkshop.intro.guidance') }}</p>
      </div>
    </div>
    <Button :label="t('settings.dialogs.onboarding.next')" @click="props.onNext()" />
  </div>
</template>
