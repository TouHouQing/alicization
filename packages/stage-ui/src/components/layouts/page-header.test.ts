// @vitest-environment jsdom

import { beforeEach, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, reactive } from 'vue'

import PageHeader from './page-header.vue'

const fixture = vi.hoisted(() => ({ motion: 'no-preference', apply: vi.fn(), push: vi.fn(), options: null as null | { initial: { opacity: number, x: number } } }))
vi.mock('@vueuse/core', async () => {
  const { computed } = await import('vue')
  return { usePreferredReducedMotion: () => computed(() => fixture.motion) }
})
vi.mock('@vueuse/motion', () => ({ useMotion: (_target: unknown, options: typeof fixture.options) => {
  fixture.options = options
  return { apply: fixture.apply }
} }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: () => 'back' }) }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/settings/models' }),
  useRouter: () => ({ options: { history: { state: { back: null } } }, back: vi.fn(), resolve: () => ({ matched: [{}] }), push: fixture.push }),
}))

beforeEach(() => {
  fixture.motion = 'no-preference'
  fixture.apply.mockReset().mockImplementation(() => new Promise(() => {}))
  fixture.push.mockReset()
  fixture.options = null
})

it.each(['no-preference', 'reduce'])('updates title and cold-deep-link navigation while animation never finishes: %s', async (motion) => {
  fixture.motion = motion
  const props = reactive({ title: 'Settings', subtitle: 'Old', disableBackButton: true })
  const root = document.createElement('div')
  const app = createApp(() => h(PageHeader, props))
  app.mount(root)
  try {
    expect(root.querySelector('button')).toBeNull()
    props.title = 'Models'
    props.subtitle = 'Current'
    props.disableBackButton = false
    await nextTick()
    expect(root.querySelector('h1')!.textContent).toContain('Models')
    expect(root.querySelector('h1')!.textContent).toContain('Current')
    const back = root.querySelector<HTMLButtonElement>('button')
    expect(back).not.toBeNull()
    back!.click()
    expect(fixture.push).toHaveBeenCalledExactlyOnceWith('/settings')
    if (motion === 'reduce')
      expect(fixture.apply).not.toHaveBeenCalled()
  }
  finally { app.unmount() }
})

it('keeps the native header visible before the first animation frame', () => {
  const root = document.createElement('div')
  const app = createApp(PageHeader, { title: 'Models' })
  app.mount(root)
  try {
    expect(fixture.options!.initial.opacity).toBe(1)
    expect(root.querySelector('button')).not.toBeNull()
  }
  finally { app.unmount() }
})
