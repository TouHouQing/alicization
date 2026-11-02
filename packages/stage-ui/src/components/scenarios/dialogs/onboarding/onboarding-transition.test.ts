// @vitest-environment jsdom

import { beforeEach, expect, it, vi } from 'vitest'
import { createApp, h, nextTick } from 'vue'

import Onboarding from './onboarding.vue'

const fixture = vi.hoisted(() => ({ motion: 'reduce', entry: 'model-selection', sync: vi.fn(), loadModels: vi.fn() }))
vi.mock('@vueuse/core', async () => {
  const { computed } = await import('vue')
  return { usePreferredReducedMotion: () => computed(() => fixture.motion) }
})
vi.mock('../../../../stores/providers', async () => {
  const { ref } = await import('vue')
  return { useProvidersStore: () => ({ providers: ref({}), allChatProvidersMetadata: ref([{ id: 'openai' }, { id: 'openai-compatible' }]), markProviderAdded: vi.fn() }) }
})
vi.mock('../../../../stores/modules/consciousness', async () => {
  const { ref } = await import('vue')
  return { useConsciousnessStore: () => ({ activeProvider: ref('qa'), loadModelsForProvider: fixture.loadModels }) }
})
vi.mock('../../../../stores/modules/airi-card', () => ({ useAiriCardStore: () => ({ syncCurrentConsciousnessToCard: fixture.sync }) }))
vi.mock('../../../../stores/onboarding', () => ({
  useOnboardingStore: () => ({
    get preferredEntryStepId() {
      return fixture.entry
    },
  }),
}))
vi.mock('./step-welcome.vue', () => ({ default: { render: () => null } }))
vi.mock('./step-persona-intro.vue', () => ({ default: { render: () => null } }))
vi.mock('./step-persona-core.vue', () => ({ default: { render: () => null } }))
vi.mock('./step-persona-calibration.vue', () => ({ default: { render: () => null } }))
vi.mock('./step-persona-preview.vue', () => ({ default: { render: () => null } }))
vi.mock('./step-provider-selection.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      props: ['popularProviders', 'onSelectProvider', 'onNext'],
      setup: props => () => h('div', props.popularProviders.map((provider: { id: string }) => h('button', {
        onClick: () => {
          props.onSelectProvider(provider)
          props.onNext()
        },
      }, `choose-${provider.id}`))),
    }),
  }
})
vi.mock('./step-provider-configuration.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return { default: defineComponent({ props: ['onNext', 'onPrevious'], setup: props => () => h('div', [h('button', { onClick: () => props.onNext({ apiKey: 'synthetic-key', baseUrl: 'http://127.0.0.1:1234/v1/', accountId: '' }) }, 'submit-config'), h('button', { onClick: props.onPrevious }, 'back-config')]) }) }
})
vi.mock('./step-model-selection.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return { default: defineComponent({ props: ['onNext'], setup: props => () => h('button', { onClick: props.onNext }, 'save-model') }) }
})
vi.mock('./step-action-mapping-guide.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return { default: defineComponent({ props: ['onOpenActionMapping'], setup: props => () => h('button', { onClick: props.onOpenActionMapping }, 'open-mapping') }) }
})

beforeEach(() => {
  fixture.motion = 'reduce'
  fixture.entry = 'model-selection'
  fixture.sync.mockReset().mockReturnValue(true)
  fixture.loadModels.mockReset().mockResolvedValue(undefined)
})

it.each(['reduce', 'no-preference'])('respects motion preference without stranding reduced-motion navigation when no animation frame arrives: %s', async (motion) => {
  fixture.motion = motion
  const frame = vi.fn(() => 1)
  vi.stubGlobal('requestAnimationFrame', frame)
  const configured = vi.fn()
  const root = document.createElement('div')
  document.body.append(root)
  const app = createApp(() => h(Onboarding, { onConfigured: configured }))
  app.mount(root)
  try {
    root.querySelector<HTMLButtonElement>('button')!.click()
    for (let i = 0; i < 6; i++) await nextTick()
    expect(fixture.sync).toHaveBeenCalledOnce()
    if (motion === 'reduce') {
      expect(frame).not.toHaveBeenCalled()
      expect(root.textContent).toBe('open-mapping')
      root.querySelector<HTMLButtonElement>('button')!.click()
      await nextTick()
      expect(configured).toHaveBeenCalledExactlyOnceWith({ followUpRoute: '/settings/models' })
    }
    else {
      expect(frame).toHaveBeenCalled()
      expect(root.textContent).toBe('save-model')
      expect(configured).not.toHaveBeenCalled()
    }
  }
  finally {
    app.unmount()
    root.remove()
    vi.unstubAllGlobals()
  }
})

it('still requires a valid saved model binding before leaving model selection with reduced motion', async () => {
  fixture.sync.mockReturnValue(false)
  const root = document.createElement('div')
  const app = createApp(Onboarding)
  app.mount(root)
  try {
    root.querySelector<HTMLButtonElement>('button')!.click()
    for (let i = 0; i < 6; i++) await nextTick()
    expect(fixture.sync).toHaveBeenCalledOnce()
    expect(root.textContent).toBe('save-model')
  }
  finally { app.unmount() }
})

it.each(['return-to-selection', 'select-another-provider'] as const)('does not apply a finished old model-list guard after %s', async (condition) => {
  fixture.entry = 'provider-selection'
  let finish!: () => void
  const pending = new Promise<void>((resolve) => {
    finish = resolve
  })
  fixture.loadModels.mockReturnValueOnce(pending)
  const root = document.createElement('div')
  document.body.append(root)
  const app = createApp(Onboarding)
  app.mount(root)
  const settle = async () => {
    for (let index = 0; index < 8; index++) await nextTick()
  }
  const click = (text: string) => Array.from(root.querySelectorAll('button')).find(button => button.textContent === text)!.click()
  try {
    click('choose-openai')
    await settle()
    click('submit-config')
    await settle()
    expect(fixture.loadModels).toHaveBeenCalledExactlyOnceWith('openai')
    click('back-config')
    await settle()
    expect(root.textContent).toContain('choose-openai')
    if (condition === 'select-another-provider') {
      click('choose-openai-compatible')
      await settle()
      click('submit-config')
      await settle()
      expect(root.textContent).toBe('save-model')
    }
    finish()
    await settle()
    if (condition === 'return-to-selection')
      expect(root.textContent).toContain('choose-openai')
    else
      expect(root.textContent).toBe('save-model')
  }
  finally {
    finish()
    await settle()
    app.unmount()
    root.remove()
  }
})
