<script setup lang="ts">
import { useMotion } from '@vueuse/motion'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
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
const title = ref(props.title)
const subtitle = ref(props.subtitle)
const finalizedDisableBackButton = ref(props.disableBackButton)

const { apply } = useMotion(pageHeaderRef, {
  initial: { opacity: 0, x: 10, transition: { duration: 50 } },
  enter: { opacity: 1, x: 0, transition: { duration: 250 } },
  leave: { opacity: 0, x: -5, transition: { duration: 25 } },
})

onMounted(async () => {
  await apply('initial')
  await apply('enter')
})

onUnmounted(async () => {
  await apply('leave')
  finalizedDisableBackButton.value = true
})

watch([() => props.title, () => props.subtitle, route], async () => {
  await apply('leave')
  await nextTick()

  finalizedDisableBackButton.value = props.disableBackButton
  title.value = props.title
  subtitle.value = props.subtitle

  await nextTick()
  await apply('initial')
  await apply('enter')
})
</script>

<template>
  <div
    ref="pageHeaderRef"
    :style="{
      top: 'env(safe-area-inset-top, 0px)',
      right: 'env(safe-area-inset-right, 0px)',
      left: 'env(safe-area-inset-left, 0px)',
    }"
    sticky inset-x-0 top-0 z-99 w-full pb-6 pt-10
    flex="~ row items-center gap-2"
    bg="$bg-color"
  >
    <button v-if="showBackButton && !finalizedDisableBackButton" type="button" :aria-label="t('settings.common.back')" @click="goBack">
      <div
        i-solar:alt-arrow-left-line-duotone text-2xl
      />
    </button>
    <h1 relative min-w-0 flex-1>
      <div v-if="subtitle" absolute left-0 top-0 max-w-full truncate translate-y="[-80%]">
        <span text="neutral-300 dark:neutral-500">{{ subtitle }}</span>
      </div>
      <div class="break-words" text-3xl font-normal>
        {{ title }}
      </div>
    </h1>
  </div>
</template>
