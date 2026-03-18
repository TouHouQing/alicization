<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <section
    :class="[
      'flex',
      'min-h-56',
      'flex-col',
      'items-center',
      'justify-center',
      'gap-3',
      'rounded-3xl',
      'border',
      'border-neutral-200',
      'bg-neutral-50/80',
      'p-6',
      'text-center',
      'dark:border-neutral-700',
      'dark:bg-neutral-900/70',
    ]"
  >
    <div class="i-solar:keyboard-bold-duotone text-5xl text-neutral-400 dark:text-neutral-500" />
    <div class="text-lg text-neutral-900 font-medium dark:text-neutral-100">
      {{ t('tamagotchi.settings.pages.system.window-shortcuts.title') }}
    </div>
    <p class="max-w-lg text-sm text-neutral-500 leading-6 dark:text-neutral-400">
      {{ t('tamagotchi.settings.pages.system.window-shortcuts.description') }}
    </p>
  </section>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: tamagotchi.settings.pages.system.window-shortcuts.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
