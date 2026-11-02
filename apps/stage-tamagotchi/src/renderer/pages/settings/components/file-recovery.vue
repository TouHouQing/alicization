<script setup lang="ts">
import type { FileRecoveryPreview, FileRecoveryVersion } from '../../../../shared/file-recovery-contracts'
import type { LifeStateView } from '../../../../shared/life-contracts'

import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { Button, FieldCheckbox } from '@proj-alicization/ui'
import { useDebounceFn, useIntervalFn } from '@vueuse/core'
import { computed, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { electronLifeFileRecovery } from '../../../../shared/life-events'

const props = defineProps<{ view: LifeStateView, refresh: () => Promise<void> }>()
const { t, te, locale } = useI18n()
const titleId = useId()
const command = useElectronEventaInvoke(electronLifeFileRecovery)
const prefix = 'settings.life.execution.file_recovery'
const entries = ref<FileRecoveryVersion[]>([])
const next = ref<string | null>(null)
const afterId = ref<string | undefined>()
const preview = ref<(FileRecoveryPreview & { cardId: string, versionId: string }) | null>(null)
const confirmed = ref(false)
const pending = ref(false)
const listing = ref(false)
const stopping = ref<string | null>(null)
const error = ref(false)
const notice = ref<string | null>(null)
const now = ref(Date.now())
let generation = 0
let listSequence = 0
const expired = computed(() => !preview.value?.expiresAt || preview.value.expiresAt <= now.value)
const canRestore = computed(() => preview.value?.state === 'ready' && Boolean(preview.value.token) && !expired.value && confirmed.value && !pending.value)
function stateLabel(state: string) {
  const key = `${prefix}.state.${state}`
  return t(te(key) ? key : `${prefix}.state.unknown`)
}
function versionLabel(entry: FileRecoveryVersion) {
  const time = new Intl.DateTimeFormat(locale.value, { dateStyle: 'short', timeStyle: 'medium' }).format(entry.at)
  return t(`${prefix}.version`, { time, bytes: entry.originalBytes })
}
async function read(nextPage = false) {
  if (nextPage)
    afterId.value = next.value ?? undefined
  const cardId = props.view.cardId
  const sequence = ++listSequence
  listing.value = true
  try {
    const result = await command({ cardId, action: 'list', ...(afterId.value ? { afterId: afterId.value } : {}) })
    if (sequence !== listSequence || cardId !== props.view.cardId)
      return
    if (result.kind !== 'list')
      throw new Error('Unexpected file recovery list result')
    entries.value = result.entries
    next.value = result.next
  }
  catch {
    if (sequence === listSequence)
      error.value = true
  }
  finally {
    if (sequence === listSequence)
      listing.value = false
  }
}
const refreshList = useDebounceFn(() => read(), 300, { maxWait: 1500 })
watch(() => props.view.cardId, () => {
  generation++
  listSequence++
  entries.value = []
  afterId.value = undefined
  next.value = null
  preview.value = null
  confirmed.value = false
  pending.value = false
  stopping.value = null
  error.value = false
  notice.value = null
  void read()
}, { immediate: true })
watch(() => props.view.revision, () => {
  void refreshList()
})
useIntervalFn(() => {
  now.value = Date.now()
  // A long restore must expose its durable operation so Stop remains available.
  if (pending.value && !listing.value)
    void read()
}, 2000)
async function select(versionId: string, purpose: 'restore' | 'forget' = 'restore') {
  const cardId = props.view.cardId
  const sequence = ++generation
  preview.value = null
  confirmed.value = false
  error.value = false
  notice.value = null
  pending.value = true
  try {
    const result = await command({ cardId, action: purpose === 'forget' ? 'preview-forget' : 'preview', versionId })
    if (sequence !== generation || cardId !== props.view.cardId)
      return
    if (result.kind !== 'preview')
      throw new Error('Unexpected file recovery preview result')
    preview.value = { ...result.preview, cardId, versionId }
    now.value = Date.now()
  }
  catch {
    if (sequence === generation)
      error.value = true
  }
  finally {
    if (sequence === generation)
      pending.value = false
  }
}
async function restore() {
  const current = preview.value
  if (!canRestore.value || !current?.token)
    return
  const sequence = ++generation
  pending.value = true
  confirmed.value = false
  error.value = false
  try {
    const result = await command({ cardId: current.cardId, action: current.purpose, versionId: current.versionId, token: current.token, confirmed: true })
    if (sequence !== generation || props.view.cardId !== current.cardId)
      return
    if (result.kind !== 'restore' && result.kind !== 'forget')
      throw new Error('Unexpected file recovery operation result')
    notice.value = result.state
    preview.value = null
    await read()
    await props.refresh()
  }
  catch {
    if (sequence === generation) {
      error.value = true
      preview.value = null
      await read()
    }
  }
  finally {
    if (sequence === generation)
      pending.value = false
  }
}
async function stop(effectId: string) {
  const cardId = props.view.cardId
  const sequence = generation
  stopping.value = effectId
  try {
    const result = await command({ cardId, action: 'stop', effectId })
    if (sequence !== generation || cardId !== props.view.cardId)
      return
    if (result.kind !== 'stop')
      throw new Error('Unexpected file recovery stop result')
    notice.value = result.state
    await read()
  }
  catch {
    if (sequence === generation)
      error.value = true
  }
  finally {
    if (sequence === generation)
      stopping.value = null
  }
}
</script>

<template>
  <section :aria-labelledby="titleId" data-file-recovery flex="~ col" gap-3 rounded-xl bg="neutral-50 dark:neutral-900" p-4>
    <h2 :id="titleId" text-lg font-semibold>
      {{ t(`${prefix}.title`) }}
    </h2>
    <p text-sm text-neutral-500>
      {{ t(`${prefix}.hint`) }}
    </p>
    <p v-if="!entries.length && !listing" text-sm>
      {{ t(`${prefix}.empty`) }}
    </p>
    <div v-for="entry in entries" :key="entry.id" :data-file-version-id="entry.id" flex="~ col" gap-2 border="1 neutral-200 dark:neutral-700" rounded-lg p-3>
      <p break-all text-sm>
        {{ entry.path }}
      </p>
      <p text-xs text-neutral-500>
        {{ stateLabel(entry.state) }}
      </p>
      <p text-xs text-neutral-500>
        {{ versionLabel(entry) }}
      </p>
      <div flex="~ wrap" gap-2>
        <Button :disabled="pending" size="sm" @click="select(entry.id)">
          {{ t(`${prefix}.preview`) }}
        </Button>
        <Button v-if="entry.state !== 'forgotten'" :disabled="pending" size="sm" @click="select(entry.id, 'forget')">
          {{ t(`${prefix}.forget`) }}
        </Button>
        <Button v-for="effectId in entry.recoveryEffectIds" :key="effectId" :disabled="stopping !== null" size="sm" @click="stop(effectId)">
          {{ t(`${prefix}.stop`) }}
        </Button>
      </div>
    </div>
    <div flex="~ wrap" gap-2>
      <Button :disabled="listing" size="sm" @click="read()">
        {{ t(`${prefix}.refresh`) }}
      </Button>
      <Button v-if="next" :disabled="listing" size="sm" @click="read(true)">
        {{ t(`${prefix}.more`) }}
      </Button>
      <Button v-if="afterId" :disabled="listing" size="sm" @click="afterId = undefined; read()">
        {{ t(`${prefix}.first`) }}
      </Button>
    </div>
    <div v-if="preview" data-file-recovery-preview flex="~ col" gap-3 border="1 amber-300 dark:amber-700" rounded-lg p-4>
      <p break-all font-medium>
        {{ preview.path }}
      </p>
      <p>{{ t(`${prefix}.${preview.purpose === 'forget' ? 'forget_hint' : preview.mode}`) }}</p>
      <details text-xs>
        <summary>{{ t(`${prefix}.version_details`) }}</summary>
        <p break-all>
          {{ t(`${prefix}.original_hash`) }} {{ preview.originalHash }}
        </p>
        <p break-all>
          {{ t(`${prefix}.written_hash`) }} {{ preview.writtenHash }}
        </p>
      </details>
      <p v-if="preview.purpose === 'restore' && preview.goals.length" text-sm>
        {{ t(`${prefix}.cancel_goals`) }} {{ preview.goals.join(' · ') }}
      </p>
      <p v-if="preview.state !== 'ready'" role="status">
        {{ stateLabel(preview.state) }}
      </p>
      <template v-else>
        <p v-if="expired" role="status">
          {{ t(`${prefix}.expired`) }}
        </p>
        <FieldCheckbox v-model="confirmed" :disabled="pending || expired" :label="t(`${prefix}.${preview.purpose === 'forget' ? 'confirm_forget' : 'confirm'}`)" />
        <Button :disabled="!canRestore" @click="restore">
          {{ t(`${prefix}.${preview.purpose === 'forget' ? 'forget_confirmed' : 'restore'}`) }}
        </Button>
      </template>
    </div>
    <p v-if="error" role="alert" text-sm text-red-600>
      {{ t(`${prefix}.failed`) }}
    </p>
    <p v-if="notice" role="status" text-sm>
      {{ stateLabel(notice) }}
    </p>
  </section>
</template>
