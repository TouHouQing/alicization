<script setup lang="ts">
import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { useStageDeveloperMenu } from '@proj-alicization/stage-pages/composables/use-stage-developer-menu'
import { ButtonBar, CheckBar, IconItem } from '@proj-alicization/stage-ui/components'
import { useSettings } from '@proj-alicization/stage-ui/stores/settings'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { electronOpenDevtoolsWindow, electronOpenMainDevtools } from '../../../../shared/eventa'

const { t } = useI18n()
const settings = useSettings()
const router = useRouter()
const menu = useStageDeveloperMenu('desktop')

const openDevTools = useElectronEventaInvoke(electronOpenMainDevtools)
const openDevtoolsWindow = useElectronEventaInvoke(electronOpenDevtoolsWindow)
</script>

<template>
  <ButtonBar
    v-model="settings.disableTransitions"
    v-motion
    mb-2
    icon="i-solar:settings-minimalistic-outline"
    text="settings.pages.page.developers.open-devtools.title"
    :initial="{ opacity: 0, y: 10 }"
    :enter="{ opacity: 1, y: 0 }"
    :duration="250 + (19 * 10)"
    :delay="1 * 50"
    transition="all ease-in-out duration-250"
    @click="() => openDevTools()"
  >
    {{ t('settings.pages.page.developers.open-devtools.button') }}
  </ButtonBar>
  <ButtonBar
    v-motion
    mb-2
    icon="i-solar:code-bold-duotone"
    :text="t('tamagotchi.settings.devtools.pages.markdown-stress.title')"
    :initial="{ opacity: 0, y: 10 }"
    :enter="{ opacity: 1, y: 0 }"
    :duration="250 + (19 * 10)"
    :delay="2 * 50"
    transition="all ease-in-out duration-250"
    @click="() => openDevtoolsWindow({ route: '/devtools/markdown-stress' })"
  >
    {{ t('tamagotchi.settings.devtools.pages.markdown-stress.title') }}
  </ButtonBar>
  <ButtonBar
    v-motion
    mb-2
    icon="i-solar:chart-square-bold-duotone"
    :text="t('tamagotchi.settings.devtools.pages.lag-visualizer.title')"
    :initial="{ opacity: 0, y: 10 }"
    :enter="{ opacity: 1, y: 0 }"
    :duration="250 + (19 * 10)"
    :delay="3 * 50"
    transition="all ease-in-out duration-250"
    @click="() => router.push('/devtools/performance-visualizer')"
  >
    {{ t('tamagotchi.settings.devtools.pages.lag-visualizer.title') }}
  </ButtonBar>
  <CheckBar
    v-model="settings.disableTransitions"
    v-motion
    mb-2
    icon-on="i-solar:people-nearby-bold-duotone"
    icon-off="i-solar:running-2-line-duotone"
    text="settings.animations.stage-transitions.title"
    :initial="{ opacity: 0, y: 10 }"
    :enter="{ opacity: 1, y: 0 }"
    :duration="250 + (19 * 10)"
    :delay="4 * 50"
    transition="all ease-in-out duration-250"
  />
  <CheckBar
    v-model="settings.usePageSpecificTransitions"
    v-motion
    :disabled="settings.disableTransitions"
    icon-on="i-solar:running-2-line-duotone"
    icon-off="i-solar:people-nearby-bold-duotone"
    text="settings.animations.use-page-specific-transitions.title"
    description="settings.animations.use-page-specific-transitions.description"
    :initial="{ opacity: 0, y: 10 }"
    :enter="{ opacity: 1, y: 0 }"
    :duration="250 + (20 * 10)"
    :delay="5 * 50"
    transition="all ease-in-out duration-250"
  />

  <div flex="~ col gap-4" mt-2 pb-12>
    <IconItem
      v-for="(item, index) in menu"
      :key="item.to"
      v-motion
      :initial="{ opacity: 0, y: 10 }"
      :enter="{ opacity: 1, y: 0 }"
      :duration="250"
      :style="{
        transitionDelay: `${(5 + index) * 50}ms`, // delay between each item, unocss doesn't support dynamic generation of classes now
      }"
      :title="item.title"
      :description="item.description"
      :icon="item.icon"
      :to="item.to"
    />
  </div>

  <div
    v-motion
    text="neutral-200/50 dark:neutral-600/20" pointer-events-none
    fixed top="[65dvh]" right--15 z--1
    :initial="{ scale: 0.9, opacity: 0, rotate: 30 }"
    :enter="{ scale: 1, opacity: 1, rotate: 0 }"
    :duration="250"
    flex items-center justify-center
  >
    <div text="60" i-solar:code-bold-duotone />
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.system.developer.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
</route>
