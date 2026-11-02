<script setup lang="ts">
import type { AlicizationSafetyPermissionRequest } from '../../shared/eventa'

import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AlicizationWindowActionPreview from './alicization-window-action-preview.vue'

const props = defineProps<{
  request: AlicizationSafetyPermissionRequest | null
  resolving: boolean
}>()

const emit = defineEmits<{
  decide: [payload: { requestId: string, token: string, allow: boolean, rememberSession: boolean }]
}>()
const { t } = useI18n()

const rememberSession = ref(false)

watch(() => props.request?.requestId, () => {
  rememberSession.value = false
})

const riskLabel = computed(() => {
  if (!props.request)
    return ''
  if (props.request.riskLevel === 'danger')
    return t('tamagotchi.settings.hitl.risk.danger')
  if (props.request.riskLevel === 'sensitive')
    return t('tamagotchi.settings.hitl.risk.sensitive')
  return t('tamagotchi.settings.hitl.risk.safe')
})

const riskBadgeClass = computed(() => {
  if (!props.request)
    return ''
  if (props.request.riskLevel === 'danger')
    return 'bg-red-100 text-red-700 border-red-200'
  if (props.request.riskLevel === 'sensitive')
    return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-emerald-100 text-emerald-700 border-emerald-200'
})

const argumentsSummaryText = computed(() => {
  const summary = props.request?.argumentsSummary
  if (!summary)
    return t('tamagotchi.settings.hitl.arguments.empty_summary')
  const keys = Array.isArray(summary.keys) && summary.keys.length > 0
    ? summary.keys.join(', ')
    : t('tamagotchi.settings.hitl.arguments.none')
  const keyCount = typeof summary.keyCount === 'number'
    ? summary.keyCount
    : 0
  return `kind=${summary.kind}, keyCount=${keyCount}, keys=[${keys}]`
})

function displayedRequest(event: MouseEvent) {
  const button = event.currentTarget as HTMLElement | null
  const requestId = button?.dataset.permissionRequestId
  const token = button?.dataset.permissionToken
  // Props can advance before a pending Vue DOM update. A click belongs to the
  // rendered request, never whichever request happened to become current later.
  return props.request && requestId === props.request.requestId && token === props.request.token
    ? { requestId, token }
    : null
}

function onAllow(event: MouseEvent) {
  const owner = displayedRequest(event)
  if (!owner)
    return
  emit('decide', {
    ...owner,
    allow: true,
    rememberSession: Boolean(props.request?.supportsRememberSession) && rememberSession.value,
  })
}

const operationLabel = computed(() => {
  const operation = props.request?.changePreview?.operation ?? props.request?.actionCategory ?? 'unknown'
  return t(`tamagotchi.settings.hitl.operations.${operation}`)
})
const reasonText = computed(() => t(`tamagotchi.settings.hitl.reasons.${props.request?.actionCategory ?? 'unknown'}`))
const targetLabel = computed(() => props.request?.serverName === 'local-interface' && props.request.interfaceImagePreview && props.request.resourceLabel ? props.request.resourceLabel : props.request?.resourcePath || props.request?.resourceLabel || t('tamagotchi.settings.hitl.fields.not_provided'))

function onDeny(event: MouseEvent) {
  const owner = displayedRequest(event)
  if (!owner)
    return
  emit('decide', {
    ...owner,
    allow: false,
    rememberSession: false,
  })
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="request"
      :key="`${request.requestId}:${request.token}`"
      :class="[
        'fixed inset-0 z-[9999] pointer-events-none',
        'flex items-start justify-end p-4',
      ]"
    >
      <div
        role="dialog"
        :data-permission-request-id="request.requestId"
        :aria-label="t('tamagotchi.settings.hitl.title')"
        :class="[
          'pointer-events-auto w-full max-w-sm max-h-[70vh] overflow-y-auto rounded-2xl border border-red-200 bg-white p-5 shadow-xl',
          'text-zinc-900',
        ]"
      >
        <div :class="['mb-4 flex items-center justify-between gap-3']">
          <h2 :class="['text-lg font-700 tracking-wide']">
            {{ t('tamagotchi.settings.hitl.title') }}
          </h2>
          <span
            :class="[
              'inline-flex items-center rounded-full border px-2 py-1 text-xs font-600',
              riskBadgeClass,
            ]"
          >
            {{ riskLabel }}
          </span>
        </div>

        <div :class="['space-y-3 text-sm leading-6']">
          <p class="font-600">
            {{ operationLabel }}
          </p>
          <p class="break-all">
            <b>{{ t('tamagotchi.settings.hitl.fields.target') }}</b>{{ targetLabel }}
          </p>
          <p>{{ reasonText }}</p>
          <div v-if="request.changePreview" class="space-y-1">
            <pre data-file-change-preview class="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-zinc-100 p-3 text-xs">{{ request.changePreview.text }}</pre>
            <p v-if="request.changePreview.truncated" class="text-xs text-zinc-500">
              {{ t('tamagotchi.settings.hitl.fields.preview_truncated') }}
            </p>
            <p data-file-content-binding class="break-all text-xs text-zinc-500">
              {{ request.changePreview.byteLength }} bytes · SHA-256 {{ request.changePreview.sha256 }}
            </p>
          </div>
          <AlicizationWindowActionPreview v-if="request.interfaceImagePreview" :image="request.interfaceImagePreview" />
          <div v-if="request.interfacePreview" class="space-y-1">
            <p>{{ t('tamagotchi.settings.hitl.fields.input_preview') }}</p>
            <pre data-interface-input-preview class="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-zinc-100 p-3 text-xs">{{ request.interfacePreview.text }}</pre>
          </div>
          <details class="text-xs text-zinc-500">
            <summary class="cursor-pointer">
              {{ t('tamagotchi.settings.hitl.details') }}
            </summary>
            <p class="mt-2 break-all">
              {{ request.serverName }}::{{ request.toolName }}
            </p>
            <p>{{ request.reason }}</p>
            <p>{{ argumentsSummaryText }}</p>
            <p v-if="request.interfacePreview" class="break-all">
              {{ request.interfacePreview.byteLength }} bytes · SHA-256 {{ request.interfacePreview.sha256 }}
            </p>
          </details>
        </div>

        <label
          v-if="request.supportsRememberSession"
          :class="['mt-5 flex items-center gap-2 text-sm text-zinc-700 select-none']"
        >
          <input
            v-model="rememberSession"
            type="checkbox"
            :disabled="resolving"
          >
          {{ t('tamagotchi.settings.hitl.remember_session') }}
        </label>

        <div :class="['mt-6 flex items-center justify-end gap-3']">
          <button
            type="button"
            :data-permission-request-id="request.requestId"
            :data-permission-token="request.token"
            :disabled="resolving"
            :class="[
              'rounded-lg border border-zinc-300 px-4 py-2 text-sm font-600',
              'disabled:cursor-not-allowed disabled:opacity-60',
            ]"
            @click="onDeny"
          >
            {{ t('tamagotchi.settings.hitl.actions.deny') }}
          </button>
          <button
            type="button"
            :data-permission-request-id="request.requestId"
            :data-permission-token="request.token"
            :disabled="resolving"
            :class="[
              'rounded-lg border border-red-300 bg-red-600 px-4 py-2 text-sm font-600 text-white',
              'disabled:cursor-not-allowed disabled:opacity-60',
            ]"
            @click="onAllow"
          >
            {{ t('tamagotchi.settings.hitl.actions.allow') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
