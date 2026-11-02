<script setup lang="ts">
import type { AuthorizedBrowserCommand, AuthorizedBrowserState } from '../../../../shared/authorized-browser-contracts'

import { errorMessageFrom } from '@moeru/std'
import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { Button, FieldCheckbox, Input } from '@proj-alicization/ui'
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { electronLifeAuthorizedBrowser } from '../../../../shared/life-events'

const props = defineProps<{ cardId: string }>()
const { t } = useI18n()
const invoke = useElectronEventaInvoke(electronLifeAuthorizedBrowser)
const visibility = useDocumentVisibility()
const view = ref<AuthorizedBrowserState | null>(null)
const endpoint = ref('http://127.0.0.1:9222')
const tabId = ref('')
const origins = ref('')
const pending = ref(false)
const confirmedClosed = ref(false)
const error = ref('')
let sequence = 0
const tab = computed(() => view.value?.inspection?.tabs.find(item => item.id === tabId.value))

async function act(input: AuthorizedBrowserCommand, quiet = false) {
  const token = ++sequence
  if (!quiet) {
    pending.value = true
    error.value = ''
  }
  try {
    const next = await invoke(input)
    if (token !== sequence || props.cardId !== input.cardId)
      return
    view.value = next
  }
  catch (cause) {
    if (token === sequence && !quiet)
      error.value = /CHANGED|SUPERSEDED|FRESH_SELECTION/u.test(errorMessageFrom(cause) ?? '') ? 'changed' : 'failed'
  }
  finally {
    if (token === sequence)
      pending.value = false
  }
}
function grant() {
  if (!view.value?.inspection || !tab.value)
    return
  void act({ cardId: props.cardId, action: 'grant', inspectionId: view.value.inspection.id, tabId: tab.value.id, origins: origins.value.split(/[,\n]/u).map(value => value.trim()).filter(Boolean) })
}
watch([() => tab.value?.id, () => tab.value?.origin], () => {
  origins.value = tab.value?.origin ?? ''
})
watch(() => props.cardId, (cardId) => {
  view.value = null
  tabId.value = ''
  origins.value = ''
  confirmedClosed.value = false
  void act({ cardId, action: 'status' })
}, { immediate: true })
useIntervalFn(() => {
  if (visibility.value === 'visible' && !pending.value && view.value?.mode === 'authorized')
    void act({ cardId: props.cardId, action: 'status' }, true)
}, 2000)
</script>

<template>
  <section data-authorized-browser class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-lg font-medium">
        {{ t('settings.life.browser_access.title') }}
      </h2>
      <span v-if="view" role="status" data-browser-access-status :data-status="view.status" class="text-sm text-neutral-500">
        {{ t(`settings.life.browser_access.states.${view.status}`) }}
      </span>
    </div>
    <p class="text-sm text-neutral-500">
      {{ t('settings.life.browser_access.description') }}
    </p>
    <p v-if="error" role="alert" class="text-sm text-red-600">
      {{ t(`settings.life.browser_access.errors.${error}`) }}
    </p>
    <div v-if="view?.mode === 'authorized'" class="flex flex-wrap gap-2">
      <Button data-browser-takeover @click="act({ cardId, action: 'takeover' })">
        {{ t('settings.life.browser_access.takeover') }}
      </Button>
      <Button data-browser-revoke @click="act({ cardId, action: 'revoke' })">
        {{ t('settings.life.browser_access.revoke') }}
      </Button>
      <Button :disabled="pending || view.status === 'release-unknown'" @click="act({ cardId, action: 'managed' })">
        {{ t('settings.life.browser_access.managed') }}
      </Button>
    </div>
    <p v-if="view?.target && view.mode === 'authorized'" class="break-all text-sm">
      {{ view.target.title }} · {{ view.target.location }}
    </p>
    <p v-if="view?.status === 'disconnected' && view.target" class="text-sm text-neutral-500">
      {{ t('settings.life.browser_access.disconnected') }}
    </p>
    <div v-if="view?.status === 'release-unknown'" class="space-y-2">
      <p class="text-sm">
        {{ t('settings.life.browser_access.unknown') }}
      </p>
      <FieldCheckbox v-model="confirmedClosed" :label="t('settings.life.browser_access.closed')" />
      <Button :disabled="!confirmedClosed || pending" @click="act({ cardId, action: 'confirm-closed', confirmedClosed: true })">
        {{ t('settings.life.browser_access.confirm_closed') }}
      </Button>
    </div>
    <details class="space-y-3" data-browser-connect-details>
      <summary class="cursor-pointer text-sm">
        {{ t('settings.life.browser_access.connect') }}
      </summary>
      <p class="text-sm text-neutral-500">
        {{ t('settings.life.browser_access.setup') }}
      </p>
      <label for="authorized-browser-endpoint" class="block text-sm">
        {{ t('settings.life.browser_access.endpoint') }}
      </label>
      <div class="flex flex-wrap gap-2">
        <Input id="authorized-browser-endpoint" v-model="endpoint" class="min-w-0 flex-1" :disabled="pending" />
        <Button data-browser-inspect :disabled="pending || !endpoint" @click="act({ cardId, action: 'inspect', endpoint })">
          {{ t('settings.life.browser_access.inspect') }}
        </Button>
      </div>
      <div v-if="view?.inspection" class="space-y-2">
        <p v-if="!view.inspection.tabs.length" class="text-sm text-neutral-500">
          {{ t('settings.life.browser_access.empty') }}
        </p>
        <Button v-for="item in view.inspection.tabs" :key="item.id" :data-browser-tab="item.id" :aria-pressed="item.id === tabId" :disabled="pending" class="w-full text-left" @click="tabId = item.id">
          <span class="min-w-0 break-all">{{ item.title || item.origin }} · {{ item.location }}</span>
        </Button>
        <label v-if="tab" for="authorized-browser-origins" class="block text-sm">
          {{ t('settings.life.browser_access.origins') }}
        </label>
        <Input v-if="tab" id="authorized-browser-origins" v-model="origins" :disabled="pending" />
        <Button v-if="tab" data-browser-grant :disabled="pending || !origins" @click="grant">
          {{ t('settings.life.browser_access.grant') }}
        </Button>
      </div>
    </details>
  </section>
</template>
