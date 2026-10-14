import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'

import { useStageDialogueArrivalVisibility } from './use-stage-dialogue-arrival-visibility'

afterEach(() => vi.useRealTimers())
function fixture() {
  vi.useFakeTimers()
  vi.setSystemTime(100_000)
  const scope = effectScope()
  const message = ref<{ id?: string, createdAt?: number }>()
  const owner = ref('alice:primary')
  const paused = ref(false)
  const visibility = scope.run(() => useStageDialogueArrivalVisibility({ message, owner, paused, durationMs: 30_000 }))!
  return { message, owner, paused, scope, visibility }
}
describe('new dialogue presentation without body hover', () => {
  it('shows a fresh publication when recovery selects its session in the same update', async () => {
    const f = fixture()
    f.owner.value = 'alice:recovered-primary'
    f.message.value = { id: 'recovered:actual', createdAt: 100_010 }
    await nextTick()
    expect(f.visibility.visible.value).toBe(true)
    f.scope.stop()
  })
  it('reveals a recovered reply, keeps duplicate reconciliation from extending it, and releases it after the reading interval', async () => {
    const f = fixture()
    f.message.value = { id: 'recovered:actual', createdAt: 100_010 }
    await nextTick()
    expect(f.visibility.visible.value).toBe(true)
    await vi.advanceTimersByTimeAsync(20_000)
    f.message.value = { id: 'recovered:actual', createdAt: 120_000 }
    await nextTick()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(f.visibility.visible.value).toBe(false)
    f.scope.stop()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('ignores imported history, but can reveal the same ID once a fresh publication arrives', async () => {
    const f = fixture()
    f.message.value = { id: 'recovered:actual', createdAt: 90_000 }
    await nextTick()
    expect(f.visibility.visible.value).toBe(false)
    f.message.value = { id: 'recovered:actual', createdAt: 100_010 }
    await nextTick()
    expect(f.visibility.visible.value).toBe(true)
    f.scope.stop()
  })
  it('hides on pause and owner transition without displaying another session’s retained reply', async () => {
    const f = fixture()
    f.message.value = { id: 'alice:first', createdAt: 100_010 }
    await nextTick()
    f.paused.value = true
    await nextTick()
    expect(f.visibility.visible.value).toBe(false)
    f.paused.value = false
    f.owner.value = 'other:primary'
    await nextTick()
    expect(f.visibility.visible.value).toBe(false)
    f.message.value = { id: 'other:new', createdAt: 100_020 }
    await nextTick()
    expect(f.visibility.visible.value).toBe(true)
    f.scope.stop()
  })
})
