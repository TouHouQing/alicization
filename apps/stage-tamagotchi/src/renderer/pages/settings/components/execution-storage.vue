<script setup lang="ts">
import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { Button } from '@proj-alicization/ui'
import { useI18n } from 'vue-i18n'

import { electronLifeExecutionStorage } from '../../../../shared/life-events'
import { useExecutionStorage } from './use-execution-storage'

const props = defineProps<{ cardId: string }>()
const { t } = useI18n()
const { status, pending, failed, refresh, clearCache } = useExecutionStorage(() => props.cardId, useElectronEventaInvoke(electronLifeExecutionStorage))
const megabytes = (bytes: number) => Math.round(bytes / 1024 / 1024 * 10) / 10
</script>

<template>
  <section data-execution-storage :data-storage-cleaned-at="status?.cleanedAt" class="border border-neutral-200 rounded-xl p-4 dark:border-neutral-800" :aria-label="t('settings.life.storage.title')">
    <h2 class="font-semibold">
      {{ t('settings.life.storage.title') }}
    </h2>
    <p v-if="failed || status?.state === 'failed'" role="alert" class="mt-2 text-sm text-red-600">
      {{ t('settings.life.storage.failed') }}
    </p>
    <p v-else role="status" class="mt-2 text-sm text-neutral-500">
      {{ t(`settings.life.storage.pressure_${status?.pressure ?? 'unknown'}`) }}
    </p>
    <p v-if="status?.cacheBytes != null" class="mt-2 text-sm">
      {{ t('settings.life.storage.cache_size', { size: megabytes(status.cacheBytes) }) }}
    </p>
    <p v-if="status?.state === 'deferred'" class="mt-2 text-sm">
      {{ t('settings.life.storage.deferred') }}
    </p>
    <p v-if="status?.cleanupPending" class="mt-2 text-sm">
      {{ t('settings.life.storage.cleaning') }}
    </p>
    <p v-if="status?.cleanedAt" class="mt-2 text-sm" data-storage-released>
      {{ t('settings.life.storage.released', { size: megabytes(status.releasedCacheBytes) }) }}
    </p>
    <p class="mt-2 text-sm text-neutral-500">
      {{ t('settings.life.storage.description') }}
    </p>
    <div class="mt-3 flex flex-wrap gap-2">
      <Button :disabled="pending || status?.cleanupPending" data-storage-clear @click="clearCache">
        {{ t('settings.life.storage.clear') }}
      </Button>
      <Button :disabled="pending" data-storage-refresh @click="refresh()">
        {{ t('settings.life.storage.refresh') }}
      </Button>
    </div>
  </section>
</template>
