<script setup lang="ts">
import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { Button } from '@proj-alicization/ui'
import { useI18n } from 'vue-i18n'

import { electronLifeObligationHistory } from '../../../../shared/life-events'
import { useLifeHistory } from './use-life-history'

const props = defineProps<{ cardId: string, head: string }>()
const { t } = useI18n()
const { items, nextCursor, pending, failed, hasUpdates, more, refresh } = useLifeHistory(() => props.cardId, useElectronEventaInvoke(electronLifeObligationHistory), () => props.head)
</script>

<template>
  <details data-life-obligation-history>
    <summary class="cursor-pointer text-sm text-neutral-500">
      {{ t('settings.life.history') }}
      <span v-if="hasUpdates" class="ml-2">{{ t('settings.life.history_updates') }}</span>
    </summary>
    <p v-for="item in items" :key="item.id" class="mt-3 text-sm" :data-history-obligation-id="item.id">
      {{ item.summary }} · {{ t(`settings.life.status.${item.status}`) }}
    </p>
    <p v-if="failed" role="alert" class="mt-3 text-sm text-red-600">
      {{ t('settings.life.history_failed') }}
    </p>
    <p v-else-if="!pending && !items.length" class="mt-3 text-sm text-neutral-500">
      {{ t('settings.life.history_empty') }}
    </p>
    <p v-if="pending" role="status" class="mt-3 text-sm text-neutral-500">
      {{ t('settings.life.history_loading') }}
    </p>
    <div class="mt-3 flex gap-2">
      <Button v-if="nextCursor" :disabled="pending" data-life-history-more @click="more">
        {{ t('settings.life.history_more') }}
      </Button>
      <Button :disabled="pending" data-life-history-refresh @click="refresh">
        {{ t('settings.life.history_refresh') }}
      </Button>
    </div>
  </details>
</template>
