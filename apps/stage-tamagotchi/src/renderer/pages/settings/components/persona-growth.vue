<script setup lang="ts">
import type { LifeStateView } from '../../../../shared/life-contracts'
import type { PersonaDevelopmentCommand, PersonaDevelopmentView, PersonaFacet, PersonaSourcePreview } from '../../../../shared/persona-development-contracts'

import { errorMessageFrom } from '@moeru/std'
import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { Button } from '@proj-alicization/ui'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { electronLifePersonaDevelopmentCommand, electronLifePersonaSources } from '../../../../shared/life-events'

const props = defineProps<{ view: LifeStateView, refresh: () => Promise<unknown> }>()
const { t } = useI18n()
const invoke = useElectronEventaInvoke(electronLifePersonaDevelopmentCommand)
const inspect = useElectronEventaInvoke(electronLifePersonaSources)
const pending = shallowRef(false)
const error = shallowRef('')
const correcting = shallowRef<string | null>(null)
const correction = shallowRef('')
const sources = shallowRef<{ facetId: string, version: number, entries: PersonaSourcePreview[] } | null>(null)
watch(() => props.view.cardId, () => {
  sources.value = null
  correcting.value = null
  correction.value = ''
  error.value = ''
})
const state = computed(() => {
  const raw = props.view.values['life:persona-development']
  return raw ? JSON.parse(raw) as PersonaDevelopmentView : null
})
const facets = computed(() => state.value?.facets.filter(item => item.status !== 'withdrawn') ?? [])
async function command(action: 'pause' | 'resume' | 'withdraw' | 'correct' | 'reconsider', facet?: PersonaFacet) {
  if (pending.value)
    return
  pending.value = true
  error.value = ''
  try {
    const base = { cardId: props.view.cardId, operationId: crypto.randomUUID(), expectedHash: props.view.owners.find(owner => owner.owner === 'persona-development')?.contentHash ?? null }
    let input: PersonaDevelopmentCommand
    if (action === 'pause' || action === 'resume') {
      input = { ...base, action }
    }
    else {
      if (!facet)
        return
      const scoped = { ...base, facetId: facet.id, expectedVersion: facet.version }
      input = action === 'correct' ? { ...scoped, action, correction: correction.value.trim() } : { ...scoped, action }
    }
    await invoke(input)
    correcting.value = null
    correction.value = ''
    sources.value = null
    await props.refresh()
  }
  catch (cause) { error.value = errorMessageFrom(cause) ?? String(cause) }
  finally { pending.value = false }
}
async function showSources(facet: PersonaFacet) {
  if (pending.value)
    return
  pending.value = true
  error.value = ''
  sources.value = null
  try {
    const entries = await inspect({ cardId: props.view.cardId, facetId: facet.id, version: facet.version })
    if (props.view.cardId === entries[0]?.source.cardId || !entries.length)
      sources.value = { facetId: facet.id, version: facet.version, entries }
  }
  catch (cause) { error.value = errorMessageFrom(cause) ?? String(cause) }
  finally { pending.value = false }
}
</script>

<template>
  <section class="border-t border-neutral-200 py-5 dark:border-neutral-800" data-testid="persona-growth">
    <div class="flex items-center justify-between gap-4">
      <h2 class="text-lg font-medium">
        {{ t('settings.life.persona_growth.title') }}
      </h2>
      <Button size="sm" :disabled="pending" :label="t(state?.paused ? 'settings.life.persona_growth.resume' : 'settings.life.persona_growth.pause')" @click="command(state?.paused ? 'resume' : 'pause')" />
    </div>
    <p class="my-2 text-sm text-neutral-500">
      {{ t('settings.life.persona_growth.description') }}
    </p>
    <p v-if="error" role="alert" class="my-2 text-sm text-red-600">
      {{ error }}
    </p>
    <p v-if="state?.paused" role="status" class="my-2 text-sm text-amber-700">
      {{ t('settings.life.persona_growth.paused') }}
    </p>
    <p v-if="!facets.length" class="my-4 text-sm text-neutral-500">
      {{ t('settings.life.persona_growth.empty') }}
    </p>
    <article v-for="facet in facets" :key="facet.id" class="border-t border-neutral-100 py-4 dark:border-neutral-800">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="font-medium">
            {{ facet.label }}
          </p>
          <p class="mt-1 text-sm text-neutral-500">
            {{ t(`settings.life.persona_growth.status.${facet.status}`) }} · {{ t(`settings.life.persona_growth.context.${facet.context}`) }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button size="sm" :disabled="pending" :label="t('settings.life.persona_growth.correct')" @click="correcting = facet.id; correction = ''" />
          <Button v-if="facet.status === 'disputed'" size="sm" :disabled="pending" :label="t('settings.life.persona_growth.reconsider')" @click="command('reconsider', facet)" />
          <Button size="sm" :disabled="pending" :label="t('settings.life.persona_growth.withdraw')" @click="command('withdraw', facet)" />
        </div>
      </div>
      <p class="mt-2 text-sm text-neutral-500">
        {{ t('settings.life.persona_growth.evidence', { events: facet.independentEvents, days: facet.distinctDays, trials: facet.successfulTrials }) }}
      </p>
      <p v-for="exception in facet.exceptions" :key="exception" class="mt-1 text-sm text-neutral-500">
        {{ exception }}
      </p>
      <form v-if="correcting === facet.id" class="mt-3 flex flex-col gap-2" @submit.prevent="command('correct', facet)">
        <label :for="`persona-correction-${facet.id}`" class="text-sm">{{ t('settings.life.persona_growth.correction_label') }}</label>
        <textarea :id="`persona-correction-${facet.id}`" v-model="correction" maxlength="260" rows="2" required class="border border-neutral-300 rounded-lg bg-transparent p-2 dark:border-neutral-700" />
        <p class="text-sm text-neutral-500">
          {{ t('settings.life.persona_growth.correction_hint') }}
        </p>
        <div class="flex gap-2">
          <Button type="submit" size="sm" :disabled="pending || !correction.trim()" :label="t('settings.life.persona_growth.save_correction')" />
          <Button type="button" size="sm" :disabled="pending" :label="t('settings.life.persona_growth.cancel')" @click="correcting = null" />
        </div>
      </form>
      <Button size="sm" class="mt-2" :disabled="pending" :label="t('settings.life.persona_growth.sources')" @click="showSources(facet)" />
      <ul v-if="sources?.facetId === facet.id && sources.version === facet.version" class="mt-2 text-sm text-neutral-600 space-y-2 dark:text-neutral-400">
        <li v-for="entry in sources.entries" :key="`${entry.source.kind}:${entry.source.id}`" class="border-l-2 border-neutral-200 pl-3">
          <p>{{ entry.text ?? t('settings.life.persona_growth.source_unavailable') }}</p>
          <time v-if="entry.occurredAt" :datetime="new Date(entry.occurredAt).toISOString()">{{ new Date(entry.occurredAt).toLocaleString() }}</time>
        </li>
      </ul>
    </article>
  </section>
</template>
