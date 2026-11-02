// @vitest-environment jsdom

import type { ProviderMetadata } from '../../../../stores/providers'

import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'

import Configuration from './step-provider-configuration.vue'

const fixture = vi.hoisted(() => ({ validate: vi.fn(), force: vi.fn() }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key.split('.').at(-1) }) }))
vi.mock('../../../../stores/providers', () => ({
  useProvidersStore: () => ({
    getProviderConfig: () => ({ apiKey: 'synthetic-key', baseUrl: 'http://127.0.0.1:1234/v1/' }),
    getProviderMetadata: () => ({ validators: { validateProviderConfig: fixture.validate } }),
    forceProviderConfigured: fixture.force,
  }),
}))
vi.mock('@proj-alicization/ui', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({ props: ['label', 'disabled', 'loading'], setup: props => () => h('button', { 'disabled': props.disabled, 'data-primary': '' }, props.label) }),
    Callout: defineComponent({ setup: (_, { slots }) => () => h('aside', slots.default?.()) }),
    FieldInput: defineComponent({ props: ['modelValue', 'type'], emits: ['update:modelValue'], setup: (props, { emit }) => () => h('input', { type: props.type, value: props.modelValue, onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value) }) }),
  }
})
vi.mock('../../../misc', async () => {
  const { defineComponent, h } = await import('vue')
  return { Alert: defineComponent({ setup: (_, { slots }) => () => h('section', [slots.title?.(), slots.content?.()]) }) }
})
vi.mock('../../../scenarios/providers', () => ({ ProviderAccountIdInput: { render: () => null } }))

const mounted: Array<() => void> = []
beforeEach(() => {
  fixture.validate.mockReset()
  fixture.force.mockReset()
})
afterEach(() => {
  mounted.splice(0).forEach(clean => clean())
})

function deferred() {
  let resolve!: (value: { valid: boolean, reason: string }) => void
  const promise = new Promise<{ valid: boolean, reason: string }>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
async function flush() {
  for (let index = 0; index < 6; index++) await nextTick()
}
function mount() {
  const provider = ref({ id: 'openai-compatible', localizedName: 'Synthetic' } as ProviderMetadata)
  const next = vi.fn()
  const previous = vi.fn()
  const root = document.createElement('div')
  document.body.append(root)
  const app = createApp(() => h(Configuration, { selectedProviderId: provider.value.id, selectedProvider: provider.value, onNext: next, onPrevious: previous }))
  app.mount(root)
  let closed = false
  const close = () => {
    if (!closed) {
      closed = true
      app.unmount()
      root.remove()
    }
  }
  mounted.push(close)
  const primary = () => root.querySelector<HTMLButtonElement>('button[data-primary]')!
  const editUrl = async (url: string) => {
    const input = root.querySelector<HTMLInputElement>('input[type=text]')!
    input.value = url
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await flush()
  }
  return { root, provider, next, previous, primary, editUrl, close }
}

it('never advances an edited URL on a successful response for its old configuration, and validates the new input independently', async () => {
  const old = deferred()
  const current = deferred()
  fixture.validate.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
  const view = mount()
  view.primary().click()
  await flush()
  expect(view.primary().disabled).toBe(true)
  await view.editUrl('http://127.0.0.1:4567/v1/')
  expect(view.primary().disabled).toBe(false)
  view.primary().click()
  await flush()
  old.resolve({ valid: true, reason: '' })
  await flush()
  expect(view.next).not.toHaveBeenCalled()
  expect(view.primary().disabled).toBe(true)
  current.resolve({ valid: true, reason: '' })
  await flush()
  expect(view.next).toHaveBeenCalledExactlyOnceWith({ apiKey: 'synthetic-key', baseUrl: 'http://127.0.0.1:4567/v1/', accountId: '' })
  expect(fixture.validate).toHaveBeenCalledTimes(2)
})

it.each(['provider-change', 'back', 'unmount'] as const)('discards an in-flight result after %s instead of navigating a different setup', async (condition) => {
  const pending = deferred()
  fixture.validate.mockReturnValue(pending.promise)
  const view = mount()
  view.primary().click()
  await flush()
  if (condition === 'provider-change') {
    view.provider.value = { id: 'other-provider', localizedName: 'Other synthetic' } as ProviderMetadata
    await flush()
  }
  else if (condition === 'back') {
    view.root.querySelector<HTMLButtonElement>('button:not([data-primary])')!.click()
    await flush()
    expect(view.previous).toHaveBeenCalledOnce()
  }
  else { view.close() }
  pending.resolve({ valid: true, reason: '' })
  await flush()
  expect(view.next).not.toHaveBeenCalled()
  expect(fixture.force).not.toHaveBeenCalled()
})

it('keeps an older failed response from replacing a current pending validation or enabling stale continue-anyway', async () => {
  const old = deferred()
  const current = deferred()
  fixture.validate.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
  const view = mount()
  view.primary().click()
  await flush()
  await view.editUrl('http://127.0.0.1:5678/v1/')
  // A fresh edit must allow a fresh check even while the old read is unresolved.
  expect(view.primary().disabled).toBe(false)
  view.primary().click()
  await flush()
  old.resolve({ valid: false, reason: 'Old synthetic endpoint failed' })
  await flush()
  expect(view.primary().disabled).toBe(true)
  expect(view.root.textContent).not.toContain('Old synthetic endpoint failed')
  expect(view.root.textContent).not.toContain('continueAnyway')
  current.resolve({ valid: true, reason: '' })
  await flush()
  expect(view.next).toHaveBeenCalledOnce()
})

it('shows the current failure and retries the same reviewed configuration before advancing', async () => {
  fixture.validate.mockResolvedValueOnce({ valid: false, reason: 'Current synthetic endpoint unavailable' }).mockResolvedValueOnce({ valid: true, reason: '' })
  const view = mount()
  view.primary().click()
  await flush()
  expect(view.primary().textContent).toBe('retry')
  expect(view.root.textContent).toContain('Current synthetic endpoint unavailable')
  expect(view.next).not.toHaveBeenCalled()
  view.primary().click()
  await flush()
  expect(view.next).toHaveBeenCalledExactlyOnceWith({ apiKey: 'synthetic-key', baseUrl: 'http://127.0.0.1:1234/v1/', accountId: '' })
})

it('binds an explicitly accepted unverified configuration to its original provider while navigation is saving', async () => {
  fixture.validate.mockResolvedValue({ valid: false, reason: 'Synthetic endpoint unavailable' })
  const saved = deferred()
  const view = mount()
  view.next.mockReturnValue(saved.promise)
  view.primary().click()
  await flush()
  const continueButton = Array.from(view.root.querySelectorAll('button')).find(button => button.textContent === 'continueAnyway')!
  continueButton.click()
  await flush()
  expect(view.next).toHaveBeenCalledOnce()
  view.provider.value = { id: 'other-provider', localizedName: 'Other synthetic' } as ProviderMetadata
  await flush()
  saved.resolve({ valid: true, reason: '' })
  await flush()
  expect(fixture.force).toHaveBeenCalledExactlyOnceWith('openai-compatible')
})
