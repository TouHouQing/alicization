<script setup lang="ts">
import type { OnboardingStepNextHandler, OnboardingStepPrevHandler } from './types'

import { Button } from '@proj-alicization/ui'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  onNext?: OnboardingStepNextHandler
  onPrevious?: OnboardingStepPrevHandler
  onComplete: () => Promise<void> | void
  onOpenActionMapping: () => Promise<void> | void
}>()

const { t } = useI18n()
</script>

<template>
  <div :class="['h-full flex flex-col gap-4']">
    <div :class="['flex flex-1 flex-col justify-center gap-4']">
      <div :class="['mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300']">
        <div class="i-solar:check-circle-bold-duotone h-9 w-9" />
      </div>

      <div :class="['space-y-2 text-center']">
        <h2 :class="['text-xl text-neutral-800 font-semibold md:text-2xl dark:text-neutral-100']">
          {{ t('settings.dialogs.onboarding.action-mapping-guide.title') }}
        </h2>
        <p :class="['text-sm text-neutral-500 leading-6 dark:text-neutral-400']">
          {{ t('settings.dialogs.onboarding.action-mapping-guide.description') }}
        </p>
      </div>

      <div :class="['rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 text-sm text-neutral-700 leading-6 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200']">
        <div :class="['font-medium']">
          {{ t('settings.dialogs.onboarding.action-mapping-guide.summaryTitle') }}
        </div>
        <div :class="['mt-2 text-neutral-500 dark:text-neutral-400']">
          {{ t('settings.dialogs.onboarding.action-mapping-guide.summaryDescription') }}
        </div>
      </div>

      <div :class="['rounded-2xl border border-dashed border-primary-200 bg-primary-50/70 p-4 text-sm text-primary-700 leading-6 dark:border-primary-700/60 dark:bg-primary-900/10 dark:text-primary-200']">
        <div :class="['font-medium']">
          {{ t('settings.dialogs.onboarding.action-mapping-guide.nextTitle') }}
        </div>
        <div :class="['mt-2']">
          {{ t('settings.dialogs.onboarding.action-mapping-guide.nextDescription') }}
        </div>
      </div>
    </div>

    <div :class="['grid gap-3 md:grid-cols-2']">
      <Button
        variant="secondary"
        :label="t('settings.dialogs.onboarding.action-mapping-guide.skip')"
        @click="props.onComplete"
      />
      <Button
        :label="t('settings.dialogs.onboarding.action-mapping-guide.open')"
        @click="props.onOpenActionMapping"
      />
    </div>
  </div>
</template>
