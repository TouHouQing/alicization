<script setup lang="ts">
import { Button } from '@proj-alicization/ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  step: number
  title: string
  description: string
  action: string
  hint?: string
  disabled?: boolean
  loading?: boolean
  error?: string
}>()
const emit = defineEmits<{ previous: [], next: [] }>()
const { t } = useI18n()
const steps = computed(() => ['identity', 'temperament', 'style', 'review'].map(key => t(`settings.dialogs.onboarding.personaWorkshop.steps.${key}`)))
</script>

<template>
  <form
    :class="['persona-step mx-auto h-full min-h-0 w-full max-w-190 flex flex-col', 'text-neutral-800 dark:text-neutral-100']"
    :aria-busy="props.loading"
    @submit.prevent="emit('next')"
  >
    <header class="flex-shrink-0 px-2 pb-4 pt-2 sm:px-4">
      <div class="mb-4 flex items-center gap-4">
        <button
          type="button"
          :disabled="props.loading"
          :aria-label="t('settings.dialogs.onboarding.personaWorkshop.back')"
          :class="['h-9 w-9 flex items-center justify-center rounded-full text-neutral-500', 'hover:bg-neutral-100 focus-visible:outline-primary-500 dark:hover:bg-neutral-800 disabled:opacity-40']"
          @click="emit('previous')"
        >
          <span class="i-solar:alt-arrow-left-linear h-5 w-5" aria-hidden="true" />
        </button>
        <ol class="min-w-0 flex flex-1 gap-3" :aria-label="t('settings.dialogs.onboarding.personaWorkshop.progress')">
          <li v-for="(label, index) in steps" :key="label" class="min-w-0 flex-1" :aria-current="index + 1 === props.step ? 'step' : undefined">
            <div :class="['mb-2 h-1 rounded-full', index + 1 <= props.step ? 'bg-primary-500' : 'bg-neutral-100 dark:bg-neutral-800']" />
            <span :class="['text-xs', index + 1 === props.step ? 'text-primary-600 font-medium dark:text-primary-300' : 'text-neutral-400']">{{ label }}</span>
          </li>
        </ol>
      </div>
      <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
        {{ props.title }}
      </h2>
      <p class="mt-2 text-sm text-neutral-500 leading-relaxed dark:text-neutral-400">
        {{ props.description }}
      </p>
    </header>
    <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-2 sm:px-4">
      <slot />
    </div>
    <footer class="flex-shrink-0 border-t border-neutral-100 px-2 pb-2 pt-4 dark:border-neutral-800 sm:px-4">
      <div v-if="props.error" role="alert" class="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 leading-relaxed dark:bg-red-950/40 dark:text-red-300">
        {{ props.error }}
      </div>
      <div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p class="text-xs text-neutral-500 leading-5" role="status" aria-live="polite">
          {{ props.hint ?? t('settings.dialogs.onboarding.personaWorkshop.adjustLater') }}
        </p>
        <Button
          type="submit"
          :label="props.action"
          :disabled="props.disabled"
          :loading="props.loading"
          :class="['w-full !rounded-xl !px-6 !py-3 sm:w-auto sm:min-w-36', '!bg-primary-600 !text-white hover:!bg-primary-700 dark:!bg-primary-400 dark:!text-neutral-950', 'focus-visible:outline-primary-500 disabled:!opacity-40']"
        />
      </div>
    </footer>
  </form>
</template>

<style scoped>
.persona-step {
  font-family: 'DM Sans Variable', 'Microsoft YaHei UI', 'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', system-ui, sans-serif;
}
</style>
