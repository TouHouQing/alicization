<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { useMotion } from '@vueuse/motion'
import { ref, toRefs, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  showBackButton?: boolean
  disableBackButton?: boolean
}>(), {
  showBackButton: true,
  disableBackButton: false,
})

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

function goBack() {
  if (router.options.history.state.back) {
    router.back()
    return
  }
  // A settings window can be opened directly from onboarding or the tray.
  const parent = route.path.slice(0, route.path.lastIndexOf('/')) || '/'
  void router.push(router.resolve(parent).matched.length ? parent : '/settings')
}

const pageHeaderRef = ref<HTMLElement>()
const preferredReducedMotion = usePreferredReducedMotion()
// Navigation and route labels cannot wait for an optional animation to finish.
const { title, subtitle, disableBackButton: finalizedDisableBackButton } = toRefs(props)

const { apply } = useMotion(pageHeaderRef, {
  initial: { opacity: 1, x: preferredReducedMotion.value === 'reduce' ? 0 : 10, transition: { duration: 50 } },
  enter: { opacity: 1, x: 0, transition: { duration: preferredReducedMotion.value === 'reduce' ? 0 : 250 } },
})

watch([() => props.title, () => props.subtitle, () => route.path], async (_current, _previous, onCleanup) => {
  let current = true
  onCleanup(() => {
    current = false
  })
  if (preferredReducedMotion.value === 'reduce')
    return
  await apply('initial')
  if (current)
    await apply('enter')
}, { flush: 'post' })
</script>

<template>
  <div
    ref="pageHeaderRef"
    :style="{
      top: 'env(safe-area-inset-top, 0px)',
      right: 'env(safe-area-inset-right, 0px)',
      left: 'env(safe-area-inset-left, 0px)',
    }"
    sticky inset-x-0 top-0 z-99 w-full shrink-0 pb-6 pt-6
    flex="~ row items-center gap-2"
    bg="$bg-color"
  >
    <button v-if="showBackButton && !finalizedDisableBackButton" type="button" :aria-label="t('settings.common.back')" @click="goBack">
      <div
        i-solar:alt-arrow-left-line-duotone text-2xl
      />
    </button>
    <h1 min-w-0 flex-1>
      <span v-if="subtitle" class="mb-1 block max-w-full truncate text-sm text-neutral-500 leading-5 dark:text-neutral-400">{{ subtitle }}</span>
      <span class="block break-words text-3xl font-normal leading-tight">
        {{ title }}
      </span>
    </h1>
  </div>
</template>
