import { builtinActionBindings } from '@proj-alicization/stage-ui-three/assets/vrm'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getDefaultLive2DActionBindingDefaults,
  isVrmCustomExpressionConfigured,
  isVrmExternalAnimationConfigured,
  resolveLive2DActionBindingForMotion,
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

  it('provides semantic default bindings for Alicization live2d motions', () => {
    expect(getDefaultLive2DActionBindingDefaults({
      motionName: 'Idle',
      motionIndex: 0,
    })).toEqual({
      actionKey: 'idle_gentle_nod',
      label: '轻轻点头',
      description: '轻轻低头再抬起，像在安静回应主人，适合默认待机、温柔附和或乖巧应声。',
    })

    expect(resolveLive2DActionBindingForMotion({
      fileName: 'motion/hiyori_m10.motion3.json',
      motionName: 'Flick@Body',
      motionIndex: 0,
    })).toEqual(expect.objectContaining({
      actionKey: 'disdain_side_glance',
      label: '小嫌弃',
      description: expect.stringContaining('嫌弃'),
    }))
  })

  it('keeps explicit live2d action overrides while filling missing semantic fields from defaults', () => {
    expect(resolveLive2DActionBindingForMotion({
      fileName: 'motion/hiyori_m04.motion3.json',
      motionName: 'FlickDown',
      motionIndex: 0,
    }, {
      actionKey: 'custom_tsundere',
      label: '',
      description: '',
    })).toEqual(expect.objectContaining({
      actionKey: 'custom_tsundere',
      label: '羞恼别扭',
      description: expect.stringContaining('嘴硬'),
    }))
  })

  it('merges model-specific live2d motion aliases ahead of shared defaults', () => {
    const store = useStagePerformanceStore()

    expect(store.resolveLive2DEmotionMotionAliases('live2d-model', 'happy')).toContain('Happy')

    store.setLive2DEmotionMotionAliases('live2d-model', 'happy', ['Joy', 'CheerSmile'])

    expect(store.resolveLive2DEmotionMotionAliases('live2d-model', 'happy')).toEqual([
      'Joy',
      'CheerSmile',
      'Happy',
      'Cheer',
      'Smile',
    ])
  })

  it('merges model-specific vrm expression aliases ahead of shared defaults', () => {
    const store = useStagePerformanceStore()

    expect(store.resolveVrmEmotionExpressionAliases('vrm-model', 'thinking')).toEqual([
      'relaxed',
      'neutral',
    ])

    store.setVrmEmotionExpressionAliases('vrm-model', 'thinking', ['CalmLook', 'FocusSoft'])

    expect(store.resolveVrmEmotionExpressionAliases('vrm-model', 'thinking')).toEqual([
      'CalmLook',
      'FocusSoft',
      'relaxed',
      'neutral',
    ])
  })

  it('stores model-specific action cue preferences by emotion', () => {
    const store = useStagePerformanceStore()

    store.setEmotionActionCuePreferences('stage-model', 'concerned', ['comfort_sway', 'idle_gentle_nod', 'comfort_sway'])

    expect(store.listEmotionActionCuePreferences('stage-model')).toEqual({
      concerned: ['comfort_sway', 'idle_gentle_nod'],
    })
  })

  it('stores model-specific vrm facial cue preferences by emotion', () => {
    const store = useStagePerformanceStore()

    store.setVrmEmotionFacialCuePreferences('vrm-model', 'thinking', ['relaxed', 'frown', 'relaxed'])

    expect(store.listVrmEmotionFacialCuePreferences('vrm-model')).toEqual({
      thinking: ['relaxed', 'frown'],
    })
  })
})
