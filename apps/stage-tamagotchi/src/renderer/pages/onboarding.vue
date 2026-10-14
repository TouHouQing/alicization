<script setup lang="ts">
import type { OnboardingConfiguredPayload } from '@proj-alicization/stage-ui/components'

import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { OnboardingScreen } from '@proj-alicization/stage-ui/components'
import { useOnboardingStore } from '@proj-alicization/stage-ui/stores/onboarding'
import { useTheme } from '@proj-alicization/ui'
import { computed } from 'vue'

import { electronOnboardingClose, electronOpenSettings } from '../../shared/eventa'

const onboardingStore = useOnboardingStore()
const { isDark } = useTheme()

const bgClass = computed(() => isDark.value ? 'bg-[#0f0f0f]' : 'bg-white')

const closeWindow = useElectronEventaInvoke(electronOnboardingClose)
const openSettings = useElectronEventaInvoke(electronOpenSettings)

async function handleSkipped() {
  onboardingStore.markSetupSkipped()
  await closeWindow()
}

async function handleConfigured(payload?: OnboardingConfiguredPayload) {
  onboardingStore.markSetupCompleted()
  await closeWindow()
  if (payload?.followUpRoute)
    await openSettings({ route: payload.followUpRoute })
}
</script>

<template>
  <div class="onboarding-root" h-full w-full flex flex-col overflow-hidden overscroll-none :class="bgClass">
    <div :class="bgClass" w="100dvw" min-h="8" w-full flex-shrink-0 select-none data-tauri-drag-region />
    <div class="onboarding-scroll" min-h-0 w-full flex-1 px-3>
      <div class="onboarding-content" h-full>
        <OnboardingScreen @skipped="handleSkipped" @configured="payload => handleConfigured(payload)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.onboarding-root {
  scrollbar-width: none;
}

.onboarding-root::-webkit-scrollbar {
  display: none;
}

.onboarding-content {
  min-height: 0;
}

.onboarding-scroll {
  padding-top: 8px;
  padding-bottom: 12px;
  overflow-y: hidden;
}
</style>

<route lang="yaml">
meta:
  layout: plain
</route>
