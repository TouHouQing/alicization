import type { Ref } from 'vue'

import { computed, onScopeDispose, ref, watch } from 'vue'

interface UseStageDialogueHoverVisibilityOptions {
  enabled: Ref<boolean>
  characterHovered: Ref<boolean>
  dialogueHovered: Ref<boolean>
  dialogueFocused: Ref<boolean>
  dialogueInteracting: Ref<boolean>
  loading: Ref<boolean>
  streaming: Ref<boolean>
  closeDelayMs?: number
}

const defaultCloseDelayMs = 1400

export function useStageDialogueHoverVisibility(options: UseStageDialogueHoverVisibilityOptions) {
  const visible = ref(false)
  const keepVisible = computed(() => {
    return options.loading.value
      || options.streaming.value
      || options.characterHovered.value
      || options.dialogueHovered.value
      || options.dialogueFocused.value
      || options.dialogueInteracting.value
  })
  let closeTimer: ReturnType<typeof setTimeout> | undefined

  function clearCloseTimer() {
    if (!closeTimer)
      return

    clearTimeout(closeTimer)
    closeTimer = undefined
  }

  watch([options.enabled, keepVisible], ([enabled, shouldKeepVisible]) => {
    if (!enabled) {
      clearCloseTimer()
      visible.value = false
      return
    }

    if (shouldKeepVisible) {
      clearCloseTimer()
      visible.value = true
      return
    }

    if (!visible.value || closeTimer)
      return

    closeTimer = setTimeout(() => {
      closeTimer = undefined
      if (!options.enabled.value || keepVisible.value)
        return

      visible.value = false
    }, options.closeDelayMs ?? defaultCloseDelayMs)
  }, { immediate: true })

  onScopeDispose(() => {
    clearCloseTimer()
  })

  return {
    visible,
  }
}
