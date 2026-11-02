<script setup lang="ts">
import type { ExecutionRecoveryResult } from '../../../../shared/execution-recovery-contracts'
import type { LifeStateView } from '../../../../shared/life-contracts'

import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { Button, FieldCheckbox } from '@proj-alicization/ui'
import { useIntervalFn } from '@vueuse/core'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { electronLifeExecutionRecovery } from '../../../../shared/life-events'

const props = defineProps<{ view: LifeStateView, refresh: () => Promise<void>, downloadResources?: boolean }>()
const { t, te } = useI18n()
const command = useElectronEventaInvoke(electronLifeExecutionRecovery)
const downloadItems = ref<Array<{ effectId: string, directory: string }>>([])
const nextDownload = ref<string | null>(null)
const afterDownload = ref<string | null>(null)
const listing = ref(false)
let listSequence = 0
const operations = computed(() => props.downloadResources ? downloadItems.value.map(item => ({ id: item.effectId, payload: { capabilityId: 'tool.browser_download' } })) : props.view.effects.filter(effect => effect.kind === 'execute' && effect.status === 'uncertain'))
const titleKey = computed(() => `settings.life.execution.recovery.${props.downloadResources ? 'download_title' : 'title'}`)
const preview = ref<(Extract<ExecutionRecoveryResult, { state: 'preview' }> & { cardId: string, effectId: string }) | null>(null)
const confirmed = ref(false)
const pending = ref(false)
const error = ref(false)
const notice = ref<string | null>(null)
const now = ref(Date.now())
let sequence = 0
useIntervalFn(() => {
  now.value = Date.now()
}, 1000)
const expired = computed(() => !preview.value || preview.value.expiresAt <= now.value)
function label(capability: unknown) {
  const key = `settings.life.execution.operation.${String(capability).replace('tool.', '')}`
  return te(key) ? t(key) : t('settings.life.execution.recovery.other_operation')
}
function clear() {
  sequence++
  preview.value = null
  confirmed.value = false
  pending.value = false
  error.value = false
  notice.value = null
}
watch(() => props.view.cardId, clear)
async function readDownloads(nextPage = false) {
  if (!props.downloadResources)
    return
  const cardId = props.view.cardId
  if (nextPage)
    afterDownload.value = nextDownload.value
  const request = ++listSequence
  listing.value = true
  try {
    const result = await command({ cardId, action: 'list-downloads', ...(afterDownload.value ? { afterId: afterDownload.value } : {}) })
    if (request !== listSequence || props.view.cardId !== cardId)
      return
    if (result.state !== 'download-list')
      throw new Error('Download ownership list returned another command result')
    downloadItems.value = result.items
    nextDownload.value = result.next
  }
  catch {
    if (request === listSequence)
      error.value = true
  }
  finally {
    if (request === listSequence)
      listing.value = false
  }
}
watch(() => props.view, (view, previous) => {
  if (view.cardId !== previous?.cardId) {
    downloadItems.value = []
    nextDownload.value = null
    afterDownload.value = null
  }
  void readDownloads()
}, { immediate: true })
watch(operations, (items) => {
  if (preview.value && !items.some(item => item.id === preview.value?.effectId))
    clear()
})
async function act(effectId: string, action: 'preview' | 'recheck') {
  const cardId = props.view.cardId
  const token = ++sequence
  pending.value = true
  error.value = false
  notice.value = null
  preview.value = null
  confirmed.value = false
  try {
    const result = await command({ cardId, effectId, action })
    if (token !== sequence || props.view.cardId !== cardId)
      return
    if (result.state === 'download-list')
      throw new Error('An operation command returned a list')
    if (result.state === 'preview') {
      preview.value = { ...result, cardId, effectId }
      now.value = Date.now()
    }
    else {
      await props.refresh()
      await nextTick()
      if (token === sequence && props.view.cardId === cardId)
        notice.value = result.state
    }
  }
  catch {
    if (token === sequence)
      error.value = true
  }
  finally {
    if (token === sequence)
      pending.value = false
  }
}
async function takeOver(event: MouseEvent) {
  const current = preview.value
  const clicked = event.currentTarget instanceof HTMLElement ? event.currentTarget.dataset.recoveryToken : null
  if (!current || clicked !== current.token || pending.value || expired.value || !confirmed.value || current.cardId !== props.view.cardId)
    return
  const token = ++sequence
  pending.value = true
  error.value = false
  preview.value = null
  confirmed.value = false
  try {
    const result = await command({ cardId: current.cardId, effectId: current.effectId, action: 'takeover', token: current.token, confirmedStopped: true })
    if (result.state === 'download-list' || result.state === 'preview')
      throw new Error('Takeover returned an incomplete decision')
    if (token === sequence && props.view.cardId === current.cardId) {
      await props.refresh()
      await nextTick()
      if (token === sequence && props.view.cardId === current.cardId)
        notice.value = result.state
    }
  }
  catch {
    if (token === sequence)
      error.value = true
  }
  finally {
    if (token === sequence)
      pending.value = false
  }
}
</script>

<template>
  <section v-if="operations.length || notice || error || afterDownload" :aria-label="t(titleKey)" class="space-y-3">
    <h2 class="text-lg font-medium">
      {{ t(titleKey) }}
    </h2>
    <p class="text-sm text-neutral-500">
      {{ t(`settings.life.execution.recovery.${downloadResources ? 'download_hint' : 'hint'}`) }}
    </p>
    <p v-if="error" role="alert" class="text-sm text-red-600">
      {{ t('settings.life.execution.recovery.failed') }}
    </p>
    <p v-if="notice" role="status" class="text-sm">
      {{ t(`settings.life.execution.recovery.result.${notice}`) }}
    </p>
    <article v-for="operation in operations" :key="operation.id" :data-recovery-effect-id="operation.id" class="border-b border-neutral-200 py-3 dark:border-neutral-800">
      <h3 class="font-medium">
        {{ label(operation.payload.capabilityId) }}
      </h3>
      <p class="mt-1 text-sm text-neutral-500">
        {{ t('settings.life.execution.recovery.unknown') }}
      </p>
      <div class="mt-2 flex flex-wrap gap-2">
        <Button size="sm" :label="t('settings.life.execution.recovery.recheck')" :disabled="pending" @click="act(operation.id, 'recheck')" />
        <Button size="sm" :label="t('settings.life.execution.recovery.review_takeover')" :disabled="pending" @click="act(operation.id, 'preview')" />
      </div>
      <div v-if="preview?.effectId === operation.id" class="mt-3 text-sm space-y-3">
        <p v-if="preview.target" class="break-all">
          {{ preview.target }}
        </p>
        <p v-for="goal in preview.goals" :key="goal">
          {{ goal }}
        </p>
        <p>{{ t('settings.life.execution.recovery.takeover_hint') }}</p>
        <FieldCheckbox v-model="confirmed" :label="t('settings.life.execution.recovery.confirm_stopped')" :disabled="pending || expired" />
        <p v-if="expired" role="status">
          {{ t('settings.life.execution.recovery.expired') }}
        </p>
        <div class="flex flex-wrap gap-2">
          <Button :data-recovery-token="preview.token" size="sm" :label="t('settings.life.execution.recovery.takeover')" :disabled="pending || !confirmed || expired" @click="takeOver" />
          <Button size="sm" :label="t('settings.life.execution.edit.close')" :disabled="pending" @click="clear" />
        </div>
      </div>
    </article>
    <Button v-if="nextDownload" size="sm" :disabled="pending || listing" :label="t('settings.life.execution.recovery.more')" @click="readDownloads(true)" />
    <Button v-if="afterDownload" size="sm" :disabled="pending || listing" :label="t('settings.life.execution.recovery.first')" @click="afterDownload = null; readDownloads()" />
  </section>
</template>
