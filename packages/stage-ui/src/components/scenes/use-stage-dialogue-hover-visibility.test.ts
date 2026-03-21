import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'

import { useStageDialogueHoverVisibility } from './use-stage-dialogue-hover-visibility'

afterEach(() => {
  vi.useRealTimers()
})

describe('useStageDialogueHoverVisibility', () => {
  it('opens immediately when the character is hovered and closes after the configured delay', async () => {
    vi.useFakeTimers()
    const scope = effectScope()
    const enabled = ref(true)
    const characterHovered = ref(false)
    const dialogueHovered = ref(false)
    const dialogueFocused = ref(false)
    const dialogueInteracting = ref(false)
    const loading = ref(false)
    const streaming = ref(false)

    const hoverVisibility = scope.run(() => {
      return useStageDialogueHoverVisibility({
        enabled,
        characterHovered,
        dialogueHovered,
        dialogueFocused,
        dialogueInteracting,
        loading,
        streaming,
        closeDelayMs: 1200,
      })
    })!

    characterHovered.value = true
    await nextTick()
    expect(hoverVisibility.visible.value).toBe(true)

    characterHovered.value = false
    await nextTick()
    vi.advanceTimersByTime(1199)
    expect(hoverVisibility.visible.value).toBe(true)

    vi.advanceTimersByTime(1)
    expect(hoverVisibility.visible.value).toBe(false)
    scope.stop()
  })

  it('keeps the dialogue open when the pointer moves from the character to the bubble', async () => {
    vi.useFakeTimers()
    const scope = effectScope()
    const enabled = ref(true)
    const characterHovered = ref(false)
    const dialogueHovered = ref(false)
    const dialogueFocused = ref(false)
    const dialogueInteracting = ref(false)
    const loading = ref(false)
    const streaming = ref(false)

    const hoverVisibility = scope.run(() => useStageDialogueHoverVisibility({
      enabled,
      characterHovered,
      dialogueHovered,
      dialogueFocused,
      dialogueInteracting,
      loading,
      streaming,
      closeDelayMs: 1200,
    }))!

    characterHovered.value = true
    await nextTick()
    expect(hoverVisibility.visible.value).toBe(true)

    characterHovered.value = false
    await nextTick()
    vi.advanceTimersByTime(800)
    dialogueHovered.value = true
    await nextTick()
    vi.advanceTimersByTime(800)

    expect(hoverVisibility.visible.value).toBe(true)
    scope.stop()
  })

  it('hides immediately when hover-triggered mode is disabled', async () => {
    vi.useFakeTimers()
    const scope = effectScope()
    const enabled = ref(true)
    const characterHovered = ref(true)
    const dialogueHovered = ref(false)
    const dialogueFocused = ref(false)
    const dialogueInteracting = ref(false)
    const loading = ref(false)
    const streaming = ref(false)

    const hoverVisibility = scope.run(() => useStageDialogueHoverVisibility({
      enabled,
      characterHovered,
      dialogueHovered,
      dialogueFocused,
      dialogueInteracting,
      loading,
      streaming,
      closeDelayMs: 1200,
    }))!

    expect(hoverVisibility.visible.value).toBe(true)
    enabled.value = false
    await nextTick()
    expect(hoverVisibility.visible.value).toBe(false)
    scope.stop()
  })
})
