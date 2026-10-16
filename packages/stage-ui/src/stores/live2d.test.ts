import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { Emotion } from '../constants/emotions'
import { useLive2d } from './live2d'

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()

  return {
    ...actual,
    useBroadcastChannel: () => ({
      post: vi.fn(),
      data: ref(),
    }),
  }
})

const localStorageEntries = new Map<string, string>()

vi.stubGlobal('localStorage', {
  clear() {
    localStorageEntries.clear()
  },
  getItem(key: string) {
    return localStorageEntries.get(key) ?? null
  },
  removeItem(key: string) {
    localStorageEntries.delete(key)
  },
  setItem(key: string, value: string) {
    localStorageEntries.set(key, value)
  },
})

describe('live2d emotion motion resolution', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageEntries.clear()
  })

  it('keeps manual idle choices per model while transient emotion changes the current motion', () => {
    const store = useLive2d()
    const pro = { fileName: 'pro-idle.motion3.json', motionName: 'ProIdle', motionIndex: 2 }
    const free = { fileName: 'free-idle.motion3.json', motionName: 'Idle', motionIndex: 0 }
    store.selectPreferredRuntimeMotion('model-pro', pro)
    store.selectPreferredRuntimeMotion('model-free', free)
    store.currentMotion = { group: 'Happy', index: 1 }
    expect(store.preferredRuntimeMotions['model-pro']).toEqual(pro)
    expect(store.preferredRuntimeMotions['model-free']).toEqual(free)
    store.clearPreferredRuntimeMotion('model-pro')
    expect(store.preferredRuntimeMotions['model-pro']).toBeUndefined()
    expect(store.preferredRuntimeMotions['model-free']).toEqual(free)
    expect(store.currentMotion).toEqual({ group: 'Happy', index: 1 })
  })

  it('migrates the old selector to its known model without assigning it to another model', () => {
    localStorageEntries.set('settings/stage/model', 'model-pro')
    localStorageEntries.set('selected-runtime-motion', 'pro-idle.motion3.json')
    localStorageEntries.set('selected-runtime-motion-group', 'ProIdle')
    localStorageEntries.set('selected-runtime-motion-index', '2')
    const store = useLive2d()
    expect(store.preferredRuntimeMotions['model-pro']).toEqual({ fileName: 'pro-idle.motion3.json', motionName: 'ProIdle', motionIndex: 2 })
    expect(store.preferredRuntimeMotions['model-free']).toBeUndefined()
    store.resetState()
    expect(store.preferredRuntimeMotions).toEqual({})
  })

  it('dispatches repeatable model-scoped previews without persisting them as idle or emotion state', () => {
    const store = useLive2d()
    const motion = { fileName: 'idle.motion3.json', motionName: 'Idle', motionIndex: 0 }
    store.setAvailableMotionsForModel('model-pro', [motion])
    store.currentMotion = { group: 'Happy', index: 1 }
    const observe = vi.fn()
    const unsubscribe = store.onPreviewMotion(observe)
    store.previewMotion('model-pro', motion)
    store.previewMotion('model-pro', motion)
    expect(observe).toHaveBeenCalledTimes(2)
    expect(observe.mock.calls[0][0]).toMatchObject({ modelId: 'model-pro', group: 'Idle', index: 0 })
    expect(observe.mock.calls[0][0].requestId).not.toBe(observe.mock.calls[1][0].requestId)
    expect(store.preferredRuntimeMotions).toEqual({})
    expect(store.currentMotion).toEqual({ group: 'Happy', index: 1 })
    unsubscribe()
    store.previewMotion('model-pro', motion)
    expect(observe).toHaveBeenCalledTimes(2)
  })

  it('refuses a preview whose motion is absent from the specified model', () => {
    const store = useLive2d()
    const observe = vi.fn()
    store.onPreviewMotion(observe)
    store.previewMotion('other-model', { fileName: 'idle.motion3.json', motionName: 'Idle', motionIndex: 0 })
    expect(observe).not.toHaveBeenCalled()
  })

  it('prefers model-specific motion map bindings for emotion playback', () => {
    const store = useLive2d()

    store.setAvailableMotionsForModel('model-a', [
      { fileName: 'idle.motion3.json', motionName: 'Idle', motionIndex: 0 },
      { fileName: 'sway.motion3.json', motionName: 'Flick', motionIndex: 0 },
    ])
    store.motionMap['idle.motion3.json'] = 'Idle'
    store.motionMap['sway.motion3.json'] = 'Happy'

    expect(store.resolveEmotionMotionSelection('model-a', Emotion.Happy)).toEqual({
      group: 'Flick',
      index: 0,
    })
  })

  it('falls back to a direct motion-name match when no explicit map exists', () => {
    const store = useLive2d()

    store.setAvailableMotionsForModel('model-b', [
      { fileName: 'curious.motion3.json', motionName: 'Curious', motionIndex: 0 },
    ])

    expect(store.resolveEmotionMotionSelection('model-b', Emotion.Curious)).toEqual({
      group: 'Curious',
      index: 0,
    })
  })

  it('accepts shared alias motion names for the same emotion family', () => {
    const store = useLive2d()

    store.setAvailableMotionsForModel('model-b2', [
      { fileName: 'joy.motion3.json', motionName: 'Joy', motionIndex: 0 },
    ])

    expect(store.resolveEmotionMotionSelection('model-b2', Emotion.Happy)).toEqual({
      group: 'Joy',
      index: 0,
    })
  })

  it('prefers explicit model aliases before shared emotion aliases', () => {
    const store = useLive2d()

    store.setAvailableMotionsForModel('model-b3', [
      { fileName: 'soft.motion3.json', motionName: 'ObserveSoft', motionIndex: 0 },
      { fileName: 'question.motion3.json', motionName: 'Question', motionIndex: 0 },
    ])

    expect(store.resolveEmotionMotionSelection('model-b3', Emotion.Question, {
      preferredMotionAliases: ['ObserveSoft'],
    })).toEqual({
      group: 'ObserveSoft',
      index: 0,
    })
  })

  it('falls back to the neutral motion when the requested emotion is unavailable', () => {
    const store = useLive2d()

    store.setAvailableMotionsForModel('model-c', [
      { fileName: 'idle.motion3.json', motionName: 'Idle', motionIndex: 0 },
    ])

    expect(store.resolveEmotionMotionSelection('model-c', Emotion.Angry)).toEqual({
      group: 'Idle',
      index: 0,
    })
  })

  it('rotates same-emotion motion choices to avoid repetition', () => {
    const store = useLive2d()

    store.setAvailableMotionsForModel('model-d', [
      { fileName: 'flick.motion3.json', motionName: 'Flick', motionIndex: 0 },
      { fileName: 'tap.motion3.json', motionName: 'Tap', motionIndex: 1 },
    ])
    store.motionMap['flick.motion3.json'] = 'Happy'
    store.motionMap['tap.motion3.json'] = 'Happy'

    const first = store.resolveEmotionMotionSelection('model-d', Emotion.Happy)
    const second = store.resolveEmotionMotionSelection('model-d', Emotion.Happy)
    const third = store.resolveEmotionMotionSelection('model-d', Emotion.Happy)

    expect(first).toBeTruthy()
    expect(second).toBeTruthy()
    expect(third).toBeTruthy()
    expect(second).not.toEqual(first)
    expect(third).toEqual(first)
  })
})
