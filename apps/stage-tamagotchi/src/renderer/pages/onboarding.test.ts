import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

import OnboardingPage from './onboarding.vue'

const fixture = vi.hoisted(() => ({
  alive: true,
  configured: null as null | ((payload?: { followUpRoute?: string }) => Promise<void>),
  skipped: null as null | (() => Promise<void>),
  close: vi.fn(),
  openSettings: vi.fn(),
  completed: vi.fn(),
  markSkipped: vi.fn(),
}))

vi.mock('../../shared/eventa', () => ({ electronOnboardingClose: 'close', electronOpenSettings: 'settings' }))
vi.mock('@proj-alicization/electron-vueuse', () => ({ useElectronEventaInvoke: (event: string) => event === 'close' ? fixture.close : fixture.openSettings }))
vi.mock('@proj-alicization/stage-ui/stores/onboarding', () => ({ useOnboardingStore: () => ({ markSetupCompleted: fixture.completed, markSetupSkipped: fixture.markSkipped }) }))
vi.mock('@proj-alicization/ui', async () => {
  const { ref } = await import('vue')
  return { useTheme: () => ({ isDark: ref(false) }) }
})
vi.mock('@proj-alicization/stage-ui/components', async () => {
  const { defineComponent, getCurrentInstance, h } = await import('vue')
  return {
    OnboardingScreen: defineComponent({
      emits: ['configured', 'skipped'],
      setup() {
        const props = getCurrentInstance()!.vnode.props!
        fixture.configured = props.onConfigured
        fixture.skipped = props.onSkipped
        return () => h('div')
      },
    }),
  }
})

beforeEach(async () => {
  vi.resetAllMocks()
  fixture.alive = true
  fixture.close.mockImplementation(async () => {
    fixture.alive = false
  })
  fixture.openSettings.mockImplementation(async () => {
    if (!fixture.alive)
      throw new Error('Renderer closed before the settings RPC was delivered')
  })
  await renderToString(createSSRApp(() => h(OnboardingPage)))
})

describe('onboarding renderer lifetime', () => {
  it('delivers the follow-up settings request while the onboarding owner is alive', async () => {
    await fixture.configured!({ followUpRoute: '/settings/models' })
    expect(fixture.openSettings).toHaveBeenCalledWith({ route: '/settings/models' })
    expect(fixture.close).toHaveBeenCalledOnce()
    expect(fixture.completed).toHaveBeenCalledOnce()
    expect(fixture.alive).toBe(false)
  })

  it('keeps the renderer available when the follow-up fails, allowing retry', async () => {
    fixture.openSettings.mockRejectedValueOnce(new Error('Settings unavailable'))
    await expect(fixture.configured!({ followUpRoute: '/settings/models' })).rejects.toThrow('Settings unavailable')
    expect(fixture.close).not.toHaveBeenCalled()
    expect(fixture.alive).toBe(true)
    await fixture.configured!({ followUpRoute: '/settings/models' })
    expect(fixture.close).toHaveBeenCalledOnce()
  })

  it('closes completed setup directly when no follow-up is requested', async () => {
    await fixture.configured!()
    expect(fixture.openSettings).not.toHaveBeenCalled()
    expect(fixture.completed).toHaveBeenCalledOnce()
    expect(fixture.close).toHaveBeenCalledOnce()
  })

  it('closes skipped setup without opening settings or recording completion', async () => {
    await fixture.skipped!()
    expect(fixture.openSettings).not.toHaveBeenCalled()
    expect(fixture.completed).not.toHaveBeenCalled()
    expect(fixture.markSkipped).toHaveBeenCalledOnce()
    expect(fixture.close).toHaveBeenCalledOnce()
  })
})
