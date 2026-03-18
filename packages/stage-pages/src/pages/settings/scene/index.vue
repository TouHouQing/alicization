<script setup lang="ts">
import { Callout } from '@proj-alicization/ui'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div>
    <Callout
      :label="t('settings.pages.scene.wip.label')"
      theme="orange"
    >
      <i18n-t keypath="settings.pages.scene.wip.description" tag="div">
        <template #issues>
          <a underline decoration-dotted href="https://github.com/TouHouQing/alicization/issues">{{ t('settings.pages.scene.wip.issues_link') }}</a>
        </template>
        <template #source>
          <a underline decoration-dotted href="https://github.com/TouHouQing/alicization/tree/main/apps/stage-web/src/pages/settings/scene/index.vue">{{ t('settings.pages.scene.wip.source_link') }}</a>
        </template>
      </i18n-t>
    </Callout>
  </div>
  <div
    v-motion
    text="neutral-200/50 dark:neutral-600/20" pointer-events-none
    fixed top="[calc(100dvh-15rem)]" bottom-0 right--5 z--1
    :initial="{ scale: 0.9, opacity: 0, y: 20 }"
    :enter="{ scale: 1, opacity: 1, y: 0 }"
    :duration="500"
    size-60
    flex items-center justify-center
  >
    <div text="60" i-solar:armchair-2-bold-duotone />
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.scene.title
  subtitleKey: settings.title
  descriptionKey: settings.pages.scene.description
  icon: i-solar:armchair-2-bold-duotone
  settingsEntry: true
  order: 3
  stageTransition:
    name: slide
    pageSpecificAvailable: true
</route>
