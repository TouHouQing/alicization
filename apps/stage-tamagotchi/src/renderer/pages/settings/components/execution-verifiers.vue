<script setup lang="ts">
import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { Button } from '@proj-alicization/ui'
import { useI18n } from 'vue-i18n'

import { electronLifeExecutionVerifiers } from '../../../../shared/life-events'
import { useExecutionVerifiers } from './use-execution-verifiers'

const props = defineProps<{ cardId: string }>()
const { t } = useI18n()
const { state, pending, failed, saved, previewFile, discardPreview, apply } = useExecutionVerifiers(() => props.cardId, useElectronEventaInvoke(electronLifeExecutionVerifiers))
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file)
    await previewFile(file)
}
</script>

<template>
  <section :aria-label="t('settings.life.verifiers.title')" class="border border-neutral-200 rounded-xl p-4 space-y-3 dark:border-neutral-700" data-execution-verifiers>
    <h2 class="text-lg font-medium">
      {{ t('settings.life.verifiers.title') }}
    </h2>
    <p class="text-sm text-neutral-500">
      {{ t('settings.life.verifiers.description') }}
    </p>
    <label class="block text-sm">
      <span class="mb-2 block">{{ t('settings.life.verifiers.import') }}</span>
      <input type="file" accept="application/json,.json" :disabled="pending" data-verifier-import @change="importFile">
    </label>
    <p v-if="failed" role="alert" class="text-sm text-red-600">
      {{ t('settings.life.verifiers.failed') }}
    </p>
    <p v-if="saved" role="status" class="text-sm text-green-700">
      {{ t('settings.life.verifiers.saved') }}
    </p>
    <div v-if="state?.preview" class="border-t border-neutral-200 pt-3 space-y-3 dark:border-neutral-700" data-verifier-preview>
      <p class="text-sm font-medium">
        {{ t('settings.life.verifiers.preview') }}
      </p>
      <p class="text-sm text-neutral-500">
        {{ t('settings.life.verifiers.trust') }}
      </p>
      <p v-if="!state.preview.items.length" class="text-sm">
        {{ t('settings.life.verifiers.clear') }}
      </p>
      <ul class="space-y-2">
        <li v-for="item in state.preview.items" :key="`${item.scope}:${item.reference}`" class="break-all text-sm">
          <span class="font-medium">{{ item.id }}</span> · {{ t(`settings.life.verifiers.scope.${item.scope}`) }}
          <p v-if="item.receiptPath" class="text-neutral-500">
            {{ item.receiptPath }}
          </p>
          <p v-if="item.publicKeyFingerprint" class="text-xs text-neutral-500 font-mono">
            SHA-256: {{ item.publicKeyFingerprint }}
          </p>
        </li>
      </ul>
      <div class="flex gap-2">
        <Button :disabled="pending" data-verifier-confirm @click="apply">
          {{ t('settings.life.verifiers.confirm') }}
        </Button>
        <Button :disabled="pending" @click="discardPreview">
          {{ t('settings.life.verifiers.dismiss') }}
        </Button>
      </div>
    </div>
    <ul v-else-if="state?.items.length" class="text-sm space-y-1" data-verifier-active>
      <li v-for="item in state.items" :key="`${item.scope}:${item.reference}`">
        {{ item.id }} · {{ t(`settings.life.verifiers.scope.${item.scope}`) }}
      </li>
    </ul>
    <p v-else-if="!pending" class="text-sm text-neutral-500">
      {{ t('settings.life.verifiers.empty') }}
    </p>
  </section>
</template>
