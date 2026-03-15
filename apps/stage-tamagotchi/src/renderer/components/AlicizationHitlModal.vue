<script setup lang="ts">
import type { AlicizationSafetyPermissionRequest } from '../../shared/eventa'

import { computed, ref, watch } from 'vue'

const props = defineProps<{
  request: AlicizationSafetyPermissionRequest | null
  resolving: boolean
}>()

const emit = defineEmits<{
  decide: [payload: { allow: boolean, rememberSession: boolean }]
}>()

const rememberSession = ref(false)

watch(() => props.request?.requestId, () => {
  rememberSession.value = false
})

const riskLabel = computed(() => {
  if (!props.request)
    return ''
  if (props.request.riskLevel === 'danger')
    return '高风险'
  if (props.request.riskLevel === 'sensitive')
    return '敏感'
  return '安全'
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
    return '无参数摘要'
  const keys = Array.isArray(summary.keys) && summary.keys.length > 0
    ? summary.keys.join(', ')
    : '无'
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
            安全拦截确认（HitL）
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
          <p><b>工具：</b>{{ request.serverName }}::{{ request.toolName }}</p>
          <p><b>类型：</b>{{ request.actionCategory }}</p>
          <p><b>目标：</b>{{ request.resourceLabel || '未提供' }}</p>
          <p><b>原因：</b>{{ request.reason }}</p>
          <p><b>参数摘要：</b>{{ argumentsSummaryText }}</p>
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
          本次会话记住该读取路径
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
            拒绝
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
            允许
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
