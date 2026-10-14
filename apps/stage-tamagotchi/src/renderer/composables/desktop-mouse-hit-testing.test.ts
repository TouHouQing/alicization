import type { MouseInElementOptions } from '@vueuse/core'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref, shallowRef } from 'vue'

import { useElectronMouseInElement } from '../../../../../packages/electron-vueuse/src/composables/use-electron-mouse-in-element'

const mouse = vi.hoisted(() => ({ current: null as any }))
vi.mock('../../../../../packages/electron-vueuse/src/composables/use-electron-relative-mouse', () => ({
  useElectronRelativeMouse: () => mouse.current,
}))

class TestElement {
  getBoundingClientRect() {
    return { left: 50, top: 40, width: 300, height: 200 }
  }
}

describe('desktop overlay hit testing', () => {
  beforeEach(() => {
    vi.stubGlobal('Element', TestElement)
    vi.stubGlobal('document', new EventTarget())
    mouse.current = { x: ref(100), y: ref(100), sourceType: ref('mouse'), isReady: ref(true) }
  })
  afterEach(() => vi.unstubAllGlobals())

  function setup() {
    const target = shallowRef<HTMLElement | undefined>(new TestElement() as unknown as HTMLElement)
    const window = Object.assign(new EventTarget(), { document, pageXOffset: 0, pageYOffset: 0 })
    const options = { window } as unknown as MouseInElementOptions
    const hit = useElectronMouseInElement(target, options)
    return { target, hit }
  }

  it('releases a removed dialogue panel even while the cursor stays still', async () => {
    const { target, hit } = setup()
    expect(hit.isOutside.value).toBe(false)
    target.value = undefined
    await nextTick()
    expect(hit.isOutside.value).toBe(true)
    expect(hit.elementWidth.value).toBe(0)
    expect(hit.elementHeight.value).toBe(0)
    hit.stop()
  })

  it('does not retain an invisible hit region when native cursor tracking becomes unavailable', async () => {
    const { hit } = setup()
    expect(hit.isOutside.value).toBe(false)
    mouse.current.isReady.value = false
    await nextTick()
    expect(hit.isOutside.value).toBe(true)
    mouse.current.isReady.value = true
    await nextTick()
    expect(hit.isOutside.value).toBe(false)
    hit.stop()
  })
})
