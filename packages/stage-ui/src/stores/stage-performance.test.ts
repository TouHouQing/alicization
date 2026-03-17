import { builtinActionBindings } from '@proj-airi/stage-ui-three/assets/vrm'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  isVrmCustomExpressionConfigured,
  isVrmExternalAnimationConfigured,
  useStagePerformanceStore,
} from './stage-performance'

const localforageEntries = new Map<string, File>()

vi.mock('localforage', () => {
  return {
    default: {
      async getItem<T>(key: string) {
        return (localforageEntries.get(key) ?? null) as T | null
      },
      async removeItem(key: string) {
        localforageEntries.delete(key)
      },
      async setItem(key: string, value: File) {
        localforageEntries.set(key, value)
        return value
      },
    },
  }
})

describe('stage performance helpers', () => {
  beforeEach(() => {
    localforageEntries.clear()
    setActivePinia(createPinia())
  })

  it('keeps unmapped vrma sidecars hidden until semantic fields are complete', async () => {
    expect(isVrmExternalAnimationConfigured({
      actionKey: '',
      label: '',
      description: '',
    })).toBe(false)

    const store = useStagePerformanceStore()
    const file = new File(['wave'], 'wave.vrma', { type: 'application/octet-stream' })
    const imported = await store.importVrmExternalAnimation('vrm-model', file)

    expect(imported.actionKey).toBe('')
    expect(imported.label).toBe('')
    expect(await store.resolveVrmExternalAnimations('vrm-model', { configuredOnly: true })).toEqual([])

    await store.updateVrmExternalAnimation('vrm-model', imported.id, {
      actionKey: 'wave',
      label: 'Wave',
      description: 'A friendly wave animation for greeting or acknowledgment.',
    })

    const resolved = await store.resolveVrmExternalAnimations('vrm-model', { configuredOnly: true })
    expect(resolved).toHaveLength(1)
    expect(resolved[0]).toEqual(expect.objectContaining({
      actionKey: 'wave',
      label: 'Wave',
      source: 'external-vrma',
      file,
    }))
  })

  it('keeps custom expressions hidden until semantic mapping is complete', () => {
    expect(isVrmCustomExpressionConfigured({
      facialKey: 'star_eyes',
      label: '',
      description: '',
    })).toBe(false)

    expect(isVrmCustomExpressionConfigured({
      facialKey: 'star_eyes',
      label: 'Star Eyes',
      description: 'A sparkle-heavy admiration expression with star-shaped pupils.',
    })).toBe(true)
  })

  it('does not resolve partially mapped custom expressions by facial cue', () => {
    const store = useStagePerformanceStore()

    store.upsertVrmCustomExpression('vrm-model', {
      expressionName: 'StarEyes',
      facialKey: 'star_eyes',
      label: '',
      description: '',
      affectsMouth: false,
      source: 'custom',
    })

    expect(store.resolveVrmCustomExpressionByCue('vrm-model', 'star_eyes')).toBeUndefined()

    store.upsertVrmCustomExpression('vrm-model', {
      expressionName: 'StarEyes',
      facialKey: 'star_eyes',
      label: 'Star Eyes',
      description: 'A sparkle-heavy admiration expression with star-shaped pupils.',
      affectsMouth: false,
      source: 'custom',
    })

    expect(store.resolveVrmCustomExpressionByCue('vrm-model', 'star_eyes')).toEqual(expect.objectContaining({
      expressionName: 'StarEyes',
      facialKey: 'star_eyes',
      label: 'Star Eyes',
    }))
  })

  it('ships a builtin vrm action binding as a semantic capability entry', () => {
    expect(builtinActionBindings).toEqual([
      expect.objectContaining({
        source: 'builtin',
        actionKey: 'settle_idle',
        label: 'Settle',
      }),
    ])
  })
})
