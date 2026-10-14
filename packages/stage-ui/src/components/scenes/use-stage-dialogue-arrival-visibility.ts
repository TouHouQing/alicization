import type { Ref } from 'vue'

import { onScopeDispose, ref, watch } from 'vue'

// A background/recovered reply has no foreground streaming transition and
// must not require hovering the body to become visible. Reveal only fresh
// arrivals for a bounded reading interval, never imported historical messages.
export function useStageDialogueArrivalVisibility(options: {
  message: Readonly<Ref<{ id?: string, createdAt?: number } | undefined>>
  owner: Readonly<Ref<string>>
  paused: Readonly<Ref<boolean>>
  durationMs?: number
}) {
  const mountedAt = Date.now()
  const visible = ref(false)
  const duration = options.durationMs ?? 30_000
  let owner = options.owner.value
  let messageId: string | null = null
  let revealed = false
  let blockedId: string | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  function clear() {
    clearTimeout(timer)
    timer = undefined
    visible.value = false
  }
  watch([() => options.message.value?.id ?? null, () => options.message.value?.createdAt, options.owner, options.paused], ([id, createdAt, nextOwner, paused]) => {
    if (nextOwner !== owner) {
      owner = nextOwner
      clear()
      if (id === messageId) {
        blockedId = id
        return
      }
    }
    if (id !== messageId) {
      messageId = id
      revealed = false
      blockedId = null
      clear()
    }
    if (paused) {
      clear()
      return
    }
    const now = Date.now()
    if (!id || id === blockedId || revealed || createdAt == null || !Number.isFinite(createdAt) || createdAt < mountedAt || createdAt > now + 5000 || now - createdAt >= duration)
      return
    revealed = true
    visible.value = true
    timer = setTimeout(clear, duration)
  }, { immediate: true })
  onScopeDispose(clear)
  return { visible }
}
