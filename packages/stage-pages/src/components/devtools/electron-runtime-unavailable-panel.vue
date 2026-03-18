<script setup lang="ts">
import { Callout } from '@proj-alicization/ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  titleKey: string
  descriptionKey: string
}>()

const { t } = useI18n()

const title = computed(() => t(props.titleKey))
const description = computed(() => t(props.descriptionKey))
</script>

<template>
  <div :class="['flex', 'h-full', 'flex-col', 'gap-4', 'p-4']">
    <Callout
      theme="orange"
      :label="t('settings.pages.system.sections.section.developer.runtime-unavailable.title')"
      :description="t('settings.pages.system.sections.section.developer.runtime-unavailable.description')"
    />

    <div :class="['rounded-2xl', 'border', 'border-neutral-200/60', 'bg-white/70', 'p-4', 'dark:border-neutral-700', 'dark:bg-neutral-900/60']">
      <div :class="['text-lg', 'font-semibold']">
        {{ title }}
      </div>
      <div :class="['mt-2', 'text-sm', 'text-neutral-600', 'dark:text-neutral-300']">
        {{ description }}
      </div>
    </div>
  </div>
</template>
