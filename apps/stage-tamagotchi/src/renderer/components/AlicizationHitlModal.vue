<script setup lang="ts">
import type { AlicizationSafetyPermissionRequest } from '../../shared/eventa'

import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  request: AlicizationSafetyPermissionRequest | null
  resolving: boolean
}>()

const emit = defineEmits<{
  decide: [payload: { allow: boolean, rememberSession: boolean }]
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

function onAllow() {
  emit('decide', {
    allow: true,
    rememberSession: Boolean(props.request?.supportsRememberSession) && rememberSession.value,
  })
}

function onDeny() {
  emit('decide', {
    allow: false,
    rememberSession: false,
  })
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="request"
      :class="[
        'fixed inset-0 z-[9999]',
        'flex items-center justify-center px-4 py-8',
        'bg-black/55 backdrop-blur-sm',
      ]"
    >
      <div
        :class="[
          'w-full max-w-2xl rounded-2xl border border-red-200 bg-white p-6 shadow-2xl',
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
          <p><b>{{ t('tamagotchi.settings.hitl.fields.tool') }}</b>{{ request.serverName }}::{{ request.toolName }}</p>
          <p><b>{{ t('tamagotchi.settings.hitl.fields.type') }}</b>{{ request.actionCategory }}</p>
          <p><b>{{ t('tamagotchi.settings.hitl.fields.target') }}</b>{{ request.resourceLabel || t('tamagotchi.settings.hitl.fields.not_provided') }}</p>
          <p><b>{{ t('tamagotchi.settings.hitl.fields.reason') }}</b>{{ request.reason }}</p>
          <p><b>{{ t('tamagotchi.settings.hitl.fields.arguments_summary') }}</b>{{ argumentsSummaryText }}</p>
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
