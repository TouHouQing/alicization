<script setup lang="ts">
import { OnboardingScreen } from '@proj-alicization/stage-ui/components'
import { useOnboardingStore } from '@proj-alicization/stage-ui/stores/onboarding'
import { useTheme } from '@proj-alicization/ui'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const onboardingStore = useOnboardingStore()
const router = useRouter()
const { isDark } = useTheme()

const bgClass = computed(() => isDark.value ? 'bg-[#0f0f0f]' : 'bg-white')

async function finishOnboarding(mode: 'configured' | 'skipped') {
  if (mode === 'configured')
    onboardingStore.markSetupCompleted()
  else
    onboardingStore.markSetupSkipped()

  await router.replace('/')
}
</script>

<template>
  <div class="onboarding-root" h-full w-full flex flex-col overflow-x-hidden overflow-y-auto overscroll-none :class="bgClass">
    <div class="onboarding-scroll" w-full flex-1 px-3>
      <div class="onboarding-content" h-full>
        <OnboardingScreen
          @configured="finishOnboarding('configured')"
          @skipped="finishOnboarding('skipped')"
        />
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
  padding: 8px 0 20px 0;
}

.onboarding-scroll {
  padding-top: 8px;
  padding-bottom: 20px;
  overflow-y: auto;
}
</style>

<route lang="yaml">
meta:
  layout: plain
</route>
