<script setup lang="ts">
import type { OnboardingStepNextHandler, OnboardingStepPrevHandler } from './types'

import { Input } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

import PersonaStepShell from './persona-step-shell.vue'

import { useAlicizationGenesisWorkshopStore } from '../../../../stores/alicization-genesis-workshop'

const props = defineProps<{ onNext: OnboardingStepNextHandler, onPrevious: OnboardingStepPrevHandler }>()
const { t } = useI18n()
const { identity, hasValidIdentity } = storeToRefs(useAlicizationGenesisWorkshopStore())
function next() {
  if (hasValidIdentity.value)
    return props.onNext()
}
</script>

<template>
  <PersonaStepShell :step="1" :title="t('settings.dialogs.onboarding.personaWorkshop.intro.title')" :description="t('settings.dialogs.onboarding.personaWorkshop.intro.lead')" :action="t('settings.dialogs.onboarding.next')" :hint="t('settings.dialogs.onboarding.personaWorkshop.intro.requiredHint')" :disabled="!hasValidIdentity" @previous="props.onPrevious()" @next="next">
    <div class="py-5 sm:py-8">
      <div class="mb-8 flex items-center gap-4">
        <div class="h-12 w-12 flex items-center justify-center rounded-2xl bg-primary-50 text-primary-500 dark:bg-primary-950/40">
          <span class="i-solar:heart-linear h-6 w-6" aria-hidden="true" />
        </div>
        <p class="flex-1 text-sm text-neutral-600 leading-6 dark:text-neutral-300">
          {{ t('settings.dialogs.onboarding.personaWorkshop.intro.guidance') }}
        </p>
      </div>
      <div class="grid gap-5 sm:grid-cols-2">
        <label class="block space-y-2">
          <span class="text-sm font-medium">{{ t('settings.dialogs.onboarding.personaWorkshop.intro.nameLabel') }}</span>
          <Input v-model="identity.alicizationName" required :placeholder="t('settings.dialogs.onboarding.personaWorkshop.intro.namePlaceholder')" class="!rounded-xl !px-3 !py-3 !shadow-none" />
        </label>
        <label class="block space-y-2">
          <span class="text-sm font-medium">{{ t('settings.dialogs.onboarding.personaWorkshop.intro.hostNameLabel') }}</span>
          <Input v-model="identity.hostName" required :placeholder="t('settings.dialogs.onboarding.personaWorkshop.intro.hostNamePlaceholder')" autocomplete="nickname" class="!rounded-xl !px-3 !py-3 !shadow-none" />
        </label>
      </div>
    </div>
  </PersonaStepShell>
</template>
