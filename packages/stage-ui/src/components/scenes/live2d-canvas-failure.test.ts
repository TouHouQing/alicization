// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, onUnmounted, ref, ssrContextKey } from 'vue'

import * as VueRuntime from 'vue'

import Canvas from '../../../../stage-ui-live2d/src/components/scenes/live2d/Canvas.vue'

const graphics = vi.hoisted(() => ({ failCreate: false, failRender: false, attempts: 0, apps: [] as any[], order: [] as string[] }))
vi.mock('../../../../stage-ui-live2d/node_modules/@pixi/extensions', () => ({ extensions: { add: vi.fn() } }))
vi.mock('../../../../stage-ui-live2d/node_modules/@pixi/ticker', () => ({ Ticker: class {}, TickerPlugin: {} }))
vi.mock('../../../../stage-ui-live2d/node_modules/pixi-live2d-display/dist/cubism4.es.js', () => ({ Live2DModel: { registerTicker: vi.fn() } }))
vi.mock('../../../../stage-ui-live2d/node_modules/@pixi/app', () => ({
  Application: class {
    constructor() {
      graphics.attempts++
      if (graphics.failCreate)
        throw new Error('WebGL unsupported in this browser')
      const view = document.createElement('canvas')
      const app: any = {
        view,
        stage: { scale: { set: vi.fn() } },
        renderer: { resize: vi.fn() },
        ticker: { add: (render: () => void) => { app.draw = render }, remove: vi.fn(), stop: vi.fn(), maxFPS: 0 },
        render: vi.fn(() => {
          if (graphics.failRender)
            throw new Error('Actual renderer context failed')
        }),
        destroy: vi.fn(() => {
          graphics.order.push('application-destroyed')
          view.remove()
        }),
      }
      graphics.apps.push(app)
      return app
    }
  },
}))

beforeAll(() => {
  const require = createRequire(resolve(import.meta.dirname, '../../../../../node_modules/.pnpm/node_modules/compiler-probe.cjs'))
  const compiler = require('@vue/compiler-sfc')
  const filename = resolve(import.meta.dirname, '../../../../stage-ui-live2d/src/components/scenes/live2d/Canvas.vue')
  const { descriptor } = compiler.parse(readFileSync(filename, 'utf8'), { filename })
  const script = compiler.compileScript(descriptor, { id: 'live2d-canvas-failure' })
  const template = compiler.compileTemplate({ id: 'live2d-canvas-failure', filename, source: descriptor.template.content, compilerOptions: { mode: 'function', bindingMetadata: script.bindings } })
  if (template.errors.length)
    throw new Error(template.errors.join(', '))
  Canvas.render = runInNewContext(`(function (Vue) {${template.code}})(Vue)`, { Vue: VueRuntime })
})

const mountedApps: Array<() => void> = []
beforeEach(() => {
  graphics.failCreate = false
  graphics.failRender = false
  graphics.attempts = 0
  graphics.apps = []
  graphics.order = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  mountedApps.splice(0).forEach(close => close())
  vi.restoreAllMocks()
})

async function mountCanvas() {
  type CanvasState = 'pending' | 'loading' | 'mounted'
  const state = ref<CanvasState>('pending')
  const component = ref<InstanceType<typeof Canvas>>()
  const width = ref(300)
  const failures: Array<string | null> = []
  const unhandled = vi.fn()
  const Child = defineComponent({ setup() {
    onUnmounted(() => graphics.order.push('model-unmounted'))
    return () => h('span', 'model')
  } })
  const root = document.createElement('div')
  document.body.append(root)
  const app = createApp({ setup: () => () => h(Canvas, {
    'ref': component,
    'width': width.value,
    'height': 400,
    'state': state.value,
    'onUpdate:state': (value: CanvasState) => { state.value = value },
    'onRenderError': (code: string | null) => failures.push(code),
  }, { default: () => h(Child) }) })
  app.provide(ssrContextKey, { modules: new Set() })
  app.config.errorHandler = unhandled
  app.mount(root)
  mountedApps.push(() => {
    app.unmount()
    root.remove()
  })
  // Join the component's initial asynchronous construction, without starting
  // another attempt after it has settled.
  await component.value?.retryRenderer?.()
  await nextTick()
  await nextTick()
  return { state, component, failures, unhandled, root, width }
}

describe('actual Live2D canvas failure and retry lifecycle', () => {
  it('reports a failed resize and ignores later resize requests until recovery', async () => {
    const mounted = await mountCanvas()
    const original = graphics.apps[0]
    original.renderer.resize.mockImplementation(() => {
      throw new Error('Context unavailable during resize')
    })
    mounted.width.value = 360
    await nextTick()
    expect(mounted.failures.filter(Boolean)).toEqual(['LIVE2D_RENDER_FAILED'])
    expect(mounted.unhandled).not.toHaveBeenCalled()
    mounted.width.value = 400
    await nextTick()
    expect(original.renderer.resize).toHaveBeenCalledOnce()
    await mounted.component.value!.retryRenderer()
    expect(mounted.state.value).toBe('mounted')
    expect(original.destroy).toHaveBeenCalledOnce()
  })

  it('joins concurrent retries and does not create another renderer after unmount', async () => {
    const mounted = await mountCanvas()
    const original = graphics.apps[0]
    const first = mounted.component.value!.retryRenderer()
    const second = mounted.component.value!.retryRenderer()
    expect(first).toBe(second)
    mountedApps.pop()!()
    await first
    expect(graphics.attempts).toBe(1)
    expect(original.destroy).toHaveBeenCalledOnce()
    expect(mounted.root.isConnected).toBe(false)
    original.draw()
    expect(mounted.failures.filter(Boolean)).toEqual([])
  })

  it('reports failed GPU construction and retries with a fresh owned canvas without an unhandled Vue error', async () => {
    graphics.failCreate = true
    const mounted = await mountCanvas()
    expect(mounted.failures.filter(Boolean)).toEqual(['LIVE2D_RENDERER_INITIALIZATION_FAILED'])
    expect(mounted.unhandled).not.toHaveBeenCalled()
    expect(mounted.state.value).toBe('loading')
    expect(mounted.root.querySelector('canvas')).toBeNull()
    graphics.failCreate = false
    await mounted.component.value!.retryRenderer()
    await nextTick()
    expect(mounted.state.value).toBe('mounted')
    expect(mounted.root.querySelector('canvas')).toBe(graphics.apps[0].view)
    expect(graphics.attempts).toBe(2)
  })

  it.each(['draw', 'context-loss'])('stops a failed %s owner and never lets its stale callback affect the replacement', async (mode) => {
    const mounted = await mountCanvas()
    const original = graphics.apps[0]
    const code = mode === 'draw' ? 'LIVE2D_RENDER_FAILED' : 'LIVE2D_CONTEXT_LOST'
    if (mode === 'draw') {
      graphics.failRender = true
      original.draw()
    }
    else {
      const loss = new Event('webglcontextlost', { cancelable: true })
      original.view.dispatchEvent(loss)
      expect(loss.defaultPrevented).toBe(true)
    }
    await nextTick()
    expect(original.ticker.stop).toHaveBeenCalled()
    expect(mounted.state.value).toBe('loading')
    expect(mounted.failures.filter(Boolean)).toEqual([code])
    expect(mounted.root.textContent).not.toContain('model')
    graphics.failRender = false
    await mounted.component.value!.retryRenderer()
    await nextTick()
    expect(original.destroy).toHaveBeenCalledOnce()
    expect(graphics.order.indexOf('model-unmounted')).toBeLessThan(graphics.order.indexOf('application-destroyed'))
    expect(graphics.apps).toHaveLength(2)
    original.draw()
    original.view.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    expect(mounted.failures.filter(Boolean)).toEqual([code])
    expect(mounted.state.value).toBe('mounted')
    expect(graphics.apps[1].ticker.stop).not.toHaveBeenCalled()
  })
})
