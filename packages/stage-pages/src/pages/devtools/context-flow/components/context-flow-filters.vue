<script setup lang="ts">
import type { FlowDirection } from '../context-flow-types'

import { Button, FieldCheckbox, FieldInput, SelectTab } from '@proj-alicization/ui'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{ (event: 'clear'): void }>()
const directionFilter = defineModel<'all' | FlowDirection>('directionFilter', { required: true })
const showIncoming = defineModel<boolean>('showIncoming', { required: true })
const showOutgoing = defineModel<boolean>('showOutgoing', { required: true })
const showServer = defineModel<boolean>('showServer', { required: true })
const showBroadcast = defineModel<boolean>('showBroadcast', { required: true })
const showChat = defineModel<boolean>('showChat', { required: true })
const showDevtools = defineModel<boolean>('showDevtools', { required: true })
const maxEntries = defineModel<string>('maxEntries', { required: true })
const { t } = useI18n()

const directionOptions = [
  { label: t('settings.pages.system.sections.section.developer.sections.section.context-flow.filters.direction_options.all'), value: 'all' },
  { label: t('settings.pages.system.sections.section.developer.sections.section.context-flow.filters.direction_options.incoming'), value: 'incoming' },
  { label: t('settings.pages.system.sections.section.developer.sections.section.context-flow.filters.direction_options.outgoing'), value: 'outgoing' },
]
</script>

<template>
  <div :class="['flex', 'flex-col', 'gap-6', 'rounded-xl', 'bg-neutral-50', 'p-4', 'dark:bg-[rgba(0,0,0,0.3)]', 'h-fit']">
    <div :class="['flex', 'items-center', 'gap-2', 'text-sm', 'font-semibold', 'text-neutral-600', 'dark:text-neutral-300']">
      <div :class="['size-5', 'i-solar:filter-bold-duotone']" />
      {{ t('settings.pages.system.sections.section.developer.sections.section.context-flow.filters.title') }}
    </div>
    <div :class="['flex', 'flex-col', 'gap-3']">
      <div :class="['flex', 'flex-col', 'gap-2', 'w-full']">
        <div :class="['text-xs', 'font-medium', 'text-neutral-500', 'dark:text-neutral-400']">
          {{ t('settings.pages.system.sections.section.developer.sections.section.context-flow.filters.direction') }}
        </div>
        <SelectTab
          v-model="directionFilter"
          size="sm"
          :options="directionOptions"
        />
      </div>
      <div :class="['flex', 'flex-col', 'gap-2', 'w-full']">
        <div :class="['text-xs', 'font-medium', 'text-neutral-500', 'dark:text-neutral-400']">
          {{ t('settings.pages.system.sections.section.developer.sections.section.context-flow.filters.visibility') }}
        </div>
        <div :class="['flex', 'flex-wrap', 'gap-2']">
          <FieldCheckbox v-model="showIncoming" :label="t('settings.pages.system.sections.section.developer.sections.section.context-flow.filters.show_incoming')" />
          <FieldCheckbox v-model="showOutgoing" :label="t('settings.pages.system.sections.section.developer.sections.section.context-flow.filters.show_outgoing')" />
        </div>
      </div>
      <div :class="['flex', 'flex-col', 'gap-2', 'w-full']">
        <div :class="['text-xs', 'font-medium', 'text-neutral-500', 'dark:text-neutral-400']">
          {{ t('settings.pages.system.sections.section.developer.sections.section.context-flow.filters.channels') }}
        </div>
        <div :class="['flex', 'flex-wrap', 'gap-2']">
          <FieldCheckbox v-model="showServer" :label="t('settings.pages.system.sections.section.developer.sections.section.context-flow.filters.server')" />
          <FieldCheckbox v-model="showBroadcast" :label="t('settings.pages.system.sections.section.developer.sections.section.context-flow.filters.broadcast')" />
          <FieldCheckbox v-model="showChat" :label="t('settings.pages.system.sections.section.developer.sections.section.context-flow.filters.chat')" />
          <FieldCheckbox v-model="showDevtools" :label="t('settings.pages.system.sections.section.developer.sections.section.context-flow.filters.devtools')" />
        </div>
      </div>
      <div :class="['flex', 'flex-col', 'gap-2', 'w-full']">
        <FieldInput
          v-model="maxEntries"
          :label="t('settings.pages.system.sections.section.developer.sections.section.context-flow.filters.max_entries.label')"
          :description="t('settings.pages.system.sections.section.developer.sections.section.context-flow.filters.max_entries.description')"
          type="number"
        />
      </div>
      <div :class="['flex', 'items-end', 'justify-end', 'w-full']">
        <Button :label="t('settings.pages.system.sections.section.developer.sections.section.context-flow.filters.clear')" icon="i-solar:trash-bin-trash-bold-duotone" size="sm" @click="emit('clear')" />
      </div>
    </div>
  </div>
</template>
