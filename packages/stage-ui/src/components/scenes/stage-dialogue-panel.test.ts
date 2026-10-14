// @vitest-environment jsdom

import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, reactive } from 'vue'
import { createI18n } from 'vue-i18n'

import StageDialoguePanel from './stage-dialogue-panel.vue'

const resize = vi.hoisted(() => ({ callback: null as null | ((entries: unknown[]) => void) }))
vi.mock('@vueuse/core', async original => ({
  ...await original<typeof import('@vueuse/core')>(),
  useResizeObserver: (_target: unknown, callback: (entries: unknown[]) => void) => { resize.callback = callback },
}))
vi.mock('./stage-dialogue-overlay.vue', () => ({ default: { render: () => null } }))
vi.mock('./stage-quick-reply-composer.vue', async () => {
  const { h } = await import('vue')
  return { default: { render: () => h('textarea') } }
})

async function mountPanel() {
  localStorage.clear()
  const props = reactive({ text: '', visible: true, characterFrame: { left: 200, right: 420, top: 120, bottom: 650, centerX: 310, anchorY: 200 } })
  const root = document.createElement('div')
  document.body.append(root)
  const app = createApp({ render: () => h(StageDialoguePanel, props) })
  app.use(createPinia())
  app.use(createI18n({ legacy: false, locale: 'en', messages: {} }))
  app.mount(root)
  resize.callback!([{ contentRect: { width: 900, height: 760 } }])
  await nextTick()
  const panel = root.querySelector<HTMLElement>('.stage-dialogue-panel')!
  const input = panel.querySelector('textarea')!
  return { props, root, app, panel, input }
}

describe('dialogue controls while the body moves', () => {
  it('keeps focused controls stationary across new body frames and follows again after focus leaves', async () => {
    const { props, root, app, panel, input } = await mountPanel()
    try {
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      const before = panel.style.transform
      props.characterFrame = { ...props.characterFrame, left: 450, right: 660, centerX: 550, anchorY: 420 }
      await nextTick()
      expect(panel.style.transform).toBe(before)
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }))
      await nextTick()
      expect(panel.style.transform).not.toBe(before)
    }
    finally {
      app.unmount()
      root.remove()
    }
  })

  it('holds the hovered panel and keeps focus ownership when the pointer leaves', async () => {
    const { props, root, app, panel, input } = await mountPanel()
    try {
      panel.dispatchEvent(new Event('pointerenter'))
      const before = panel.style.transform
      props.characterFrame = { ...props.characterFrame, right: 620, centerX: 500, anchorY: 430 }
      await nextTick()
      expect(panel.style.transform).toBe(before)
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      panel.dispatchEvent(new Event('pointerleave'))
      await nextTick()
      expect(panel.style.transform).toBe(before)
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }))
      await nextTick()
      expect(panel.style.transform).not.toBe(before)
    }
    finally {
      app.unmount()
      root.remove()
    }
  })
})
