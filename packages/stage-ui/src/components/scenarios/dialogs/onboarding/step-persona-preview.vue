<script setup lang="ts">
import type { OnboardingStepNextHandler, OnboardingStepPrevHandler } from './types'

import { Textarea } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import PersonaStepShell from './persona-step-shell.vue'

import { useAlicizationGenesisSubmit } from '../../../../composables/use-alicization-genesis-submit'
import { useAlicizationEpoch1Store } from '../../../../stores/alicization-epoch1'
import { useAlicizationGenesisWorkshopStore } from '../../../../stores/alicization-genesis-workshop'

const props = defineProps<{ onNext: OnboardingStepNextHandler, onPrevious: OnboardingStepPrevHandler }>()
const { t } = useI18n()
const workshopStore = useAlicizationGenesisWorkshopStore()
const epoch1Store = useAlicizationEpoch1Store()
const { draft, identity, hasValidIdentity } = storeToRefs(workshopStore)
const correctionText = ref((draft.value.previewCorrections ?? []).join('\n'))
watch(correctionText, (value) => {
  draft.value.previewCorrections = value.split('\n').map(item => item.trim()).filter(Boolean)
})
const traitDescriptions = computed(() => (['obedience', 'liveliness', 'sensibility'] as const).map((trait) => {
  const value = draft.value.presetTemperament?.[trait] ?? 0.5
  const level = value < 0.35 ? 'low' : value > 0.65 ? 'high' : 'balanced'
  return t(`settings.dialogs.onboarding.personaWorkshop.core.traits.${trait}.${level}`)
}))
const styleDescriptions = computed(() => {
  const labels: Record<string, string> = {
    'hold': 'hold',
    'light-probe': 'lightProbe',
    'direct-approach': 'directApproach',
    'quiet-presence': 'quietPresence',
    'gentle-care': 'gentleCare',
    'take-charge': 'takeCharge',
    'mask-it': 'maskIt',
    'soft-ache': 'softAche',
    'say-it': 'sayIt',
  }
  return (['silenceReconnect', 'comfortStyle', 'jealousyStyle'] as const).map(kind => ({
    label: t(`settings.dialogs.onboarding.personaWorkshop.calibration.${kind}`),
    value: t(`settings.dialogs.onboarding.personaWorkshop.calibration.options.${labels[draft.value.calibration?.[kind] ?? '']}`),
  }))
})
const { submitting, error, submit } = useAlicizationGenesisSubmit({
  buildPayload: () => workshopStore.buildGenesisPayload(),
  initialize: payload => epoch1Store.initializeGenesis(payload),
  onCreated: () => props.onNext(),
  failureMessage: reason => t('settings.dialogs.onboarding.personaWorkshop.preview.saveError', { reason }),
  conflictMessage: () => t('settings.dialogs.onboarding.personaWorkshop.preview.conflictError'),
  unavailableMessage: () => t('settings.dialogs.onboarding.personaWorkshop.preview.unavailableError'),
})
</script>

<template>
  <PersonaStepShell :step="4" :title="t('settings.dialogs.onboarding.personaWorkshop.preview.title')" :description="t('settings.dialogs.onboarding.personaWorkshop.preview.description')" :action="t(`settings.dialogs.onboarding.personaWorkshop.preview.${submitting ? 'saving' : error ? 'retry' : 'complete'}`)" :hint="t(`settings.dialogs.onboarding.personaWorkshop.preview.${submitting ? 'savingHint' : 'nextHint'}`)" :loading="submitting" :disabled="!hasValidIdentity" :error="error" @previous="props.onPrevious()" @next="submit">
    <div class="py-2 space-y-4">
      <section class="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-900">
        <div class="mb-3 flex flex-wrap items-center gap-3">
          <div class="h-9 w-9 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-950 dark:text-primary-300">
            <span class="i-solar:heart-linear h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 class="text-lg font-semibold">
              {{ identity.alicizationName }}
            </h3>
            <p class="text-xs text-neutral-500">
              {{ t('settings.dialogs.onboarding.personaWorkshop.preview.addressAs', { name: identity.hostName }) }}
            </p>
          </div>
          <div class="w-full flex flex-wrap gap-2 sm:ml-auto sm:w-auto">
            <span v-for="trait in traitDescriptions" :key="trait" class="rounded-full bg-white px-3 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{{ trait }}</span>
          </div>
        </div>
        <p class="whitespace-pre-wrap text-sm leading-6">
          {{ draft.freeDescription || t('settings.dialogs.onboarding.personaWorkshop.preview.emptyDescription') }}
        </p>
        <dl class="grid mt-3 gap-2 border-t border-neutral-200 pt-3 text-xs sm:grid-cols-3 dark:border-neutral-800">
          <div v-for="style in styleDescriptions" :key="style.label">
            <dt class="text-neutral-500">
              {{ style.label }}
            </dt><dd class="mt-1 text-sm">
              {{ style.value }}
            </dd>
          </div>
        </dl>
        <ul v-if="draft.antiPersonaConstraints?.length" class="mt-3 list-disc list-inside text-sm text-neutral-500">
          <li v-for="constraint in draft.antiPersonaConstraints" :key="constraint">
            {{ constraint }}
          </li>
        </ul>
      </section>
      <label class="block space-y-2">
        <span class="text-sm font-medium">{{ t('settings.dialogs.onboarding.personaWorkshop.preview.correctionsTitle') }}</span>
        <Textarea v-model="correctionText" :disabled="submitting" :rows="2" :placeholder="t('settings.dialogs.onboarding.personaWorkshop.preview.correctionsPlaceholder')" class="!resize-none !whitespace-pre-wrap !rounded-xl !px-3 !py-2 !leading-6 !shadow-none" />
      </label>
    </div>
  </PersonaStepShell>
</template>
