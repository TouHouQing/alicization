// @vitest-environment jsdom

import type { Ref } from 'vue'

import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createApp, h, nextTick } from 'vue'

import { useProviderValidation } from './use-provider-validation'

const fixture = vi.hoisted(() => ({ providers: undefined as unknown as Ref<Record<string, Record<string, unknown>>>, validate: vi.fn(), manual: vi.fn(), added: vi.fn(), forced: vi.fn() }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../stores/providers', async () => {
  const { ref } = await import('vue')
  fixture.providers = ref({})
  return {
    useProvidersStore: () => ({
      providers: fixture.providers,
      initializeProvider: vi.fn(),
      getProviderMetadata: () => ({ validators: { validateProviderConfig: fixture.validate, runManualValidation: fixture.manual }, defaultOptions: () => ({ baseUrl: 'http://127.0.0.1:4567/v1/', apiKey: 'synthetic-default' }) }),
      markProviderAdded: fixture.added,
      forceProviderConfigured: fixture.forced,
    }),
  }
})

const cleanup: Array<() => void> = []
beforeEach(() => {
  vi.useFakeTimers()
  fixture.validate.mockReset()
  fixture.manual.mockReset()
  fixture.added.mockReset()
  fixture.forced.mockReset()
  fixture.providers.value = { qa: { apiKey: 'synthetic-key', baseUrl: 'http://127.0.0.1:1234/v1/' } }
})
afterEach(() => {
  cleanup.splice(0).forEach(close => close())
  vi.clearAllTimers()
  vi.useRealTimers()
})

function deferred() {
  let resolve!: (value: { valid: boolean, reason: string }) => void
  const promise = new Promise<{ valid: boolean, reason: string }>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
async function flush() {
  for (let index = 0; index < 5; index++) await nextTick()
}
function mount() {
  let scope!: ReturnType<typeof useProviderValidation>
  const root = document.createElement('div')
  const app = createApp({
    setup() {
      scope = useProviderValidation('qa')
      return () => h('div')
    },
  })
  app.mount(root)
  let closed = false
  const close = () => {
    if (!closed) {
      closed = true
      app.unmount()
    }
  }
  cleanup.push(close)
  return { scope, close }
}

it('cannot apply old success to edited credentials or mark the new configuration as added', async () => {
  const old = deferred()
  const current = deferred()
  fixture.validate.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
  const { scope } = mount()
  scope.baseUrl.value = 'http://127.0.0.1:5678/v1/'
  await flush()
  await vi.advanceTimersByTimeAsync(500)
  old.resolve({ valid: true, reason: '' })
  await flush()
  expect(scope.isValid.value).toBe(false)
  expect(fixture.added).not.toHaveBeenCalled()
  current.resolve({ valid: false, reason: 'Current synthetic endpoint failed' })
  await flush()
  await vi.advanceTimersByTimeAsync(500)
  expect(scope.validationMessage.value).toBe('Current synthetic endpoint failed')
  expect(scope.isValidating.value).toBe(0)
})

it('cannot restore validity or produce a negative busy count after all credentials are cleared', async () => {
  const old = deferred()
  fixture.validate.mockReturnValue(old.promise)
  const { scope } = mount()
  scope.apiKey.value = ''
  scope.baseUrl.value = ''
  await flush()
  await vi.advanceTimersByTimeAsync(500)
  old.resolve({ valid: true, reason: '' })
  await flush()
  await vi.advanceTimersByTimeAsync(500)
  expect(scope.isValid.value).toBe(false)
  expect(scope.isValidating.value).toBe(0)
  expect(fixture.added).not.toHaveBeenCalled()
})

it('does not mark a provider as added or start another check after its settings page unmounts', async () => {
  const old = deferred()
  fixture.validate.mockReturnValue(old.promise)
  const { scope, close } = mount()
  scope.baseUrl.value = 'http://127.0.0.1:6789/v1/'
  await flush()
  close()
  old.resolve({ valid: true, reason: '' })
  await flush()
  await vi.advanceTimersByTimeAsync(1000)
  expect(fixture.validate).toHaveBeenCalledOnce()
  expect(fixture.added).not.toHaveBeenCalled()
})

it('keeps a late manual generation result attached to the credentials that requested it', async () => {
  fixture.validate.mockResolvedValue({ valid: false, reason: 'Synthetic not ready' })
  const manual = deferred()
  fixture.manual.mockReturnValue(manual.promise)
  const { scope } = mount()
  const pending = scope.runManualTest()
  scope.baseUrl.value = 'http://127.0.0.1:7891/v1/'
  await flush()
  manual.resolve({ valid: true, reason: '' })
  await pending
  expect(scope.manualTestPassed.value).toBe(false)
  expect(scope.isManualTesting.value).toBe(false)
})

it('keeps an explicit configure-anyway decision without claiming a manual generation passed', async () => {
  const old = deferred()
  fixture.validate.mockReturnValue(old.promise)
  const { scope } = mount()
  scope.forceValid()
  expect(scope.manualTestPassed.value).toBe(false)
  old.resolve({ valid: false, reason: 'Old check failed after explicit user decision' })
  await flush()
  await vi.advanceTimersByTimeAsync(500)
  expect(scope.isValid.value).toBe(true)
  expect(fixture.forced).toHaveBeenCalledExactlyOnceWith('qa')
  expect(scope.validationMessage.value).toBe('')
})

it('snapshots nested request headers so later edits cannot be sent to the old endpoint', async () => {
  const pending = deferred()
  fixture.providers.value.qa.headers = { 'X-QA': 'old-synthetic-value' }
  fixture.validate.mockReturnValue(pending.promise)
  mount()
  const submitted = fixture.validate.mock.calls[0][0]
  const headers = fixture.providers.value.qa.headers as Record<string, string>
  headers['X-QA'] = 'new-synthetic-value'
  await flush()
  expect(submitted.headers).toEqual({ 'X-QA': 'old-synthetic-value' })
  pending.resolve({ valid: false, reason: 'Old synthetic result' })
  await flush()
})

it('adds a currently validated configuration and reports a real successful manual test', async () => {
  fixture.validate.mockResolvedValue({ valid: true, reason: '' })
  fixture.manual.mockResolvedValue({ valid: true, reason: '' })
  const { scope } = mount()
  await flush()
  await vi.advanceTimersByTimeAsync(500)
  expect(scope.isValid.value).toBe(true)
  expect(scope.isValidating.value).toBe(0)
  expect(fixture.added).toHaveBeenCalledExactlyOnceWith('qa')
  await scope.runManualTest()
  expect(scope.manualTestPassed.value).toBe(true)
  expect(scope.isManualTesting.value).toBe(false)
})

it('does not run a queued automatic check after an explicit configure-anyway decision for that edited configuration', async () => {
  const pending = deferred()
  fixture.validate.mockReturnValue(pending.promise)
  const { scope } = mount()
  scope.baseUrl.value = 'http://127.0.0.1:7892/v1/'
  await flush()
  scope.forceValid()
  await vi.advanceTimersByTimeAsync(1000)
  expect(fixture.validate).toHaveBeenCalledOnce()
  expect(scope.isValid.value).toBe(true)
  pending.resolve({ valid: false, reason: 'Old synthetic check' })
  await flush()
  expect(scope.isValid.value).toBe(true)
})

it('does not let an older manual test clear the busy state or result of the newer test', async () => {
  fixture.validate.mockResolvedValue({ valid: true, reason: '' })
  const old = deferred()
  const current = deferred()
  fixture.manual.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
  const { scope } = mount()
  const first = scope.runManualTest()
  const second = scope.runManualTest()
  old.resolve({ valid: false, reason: 'Old synthetic generation' })
  await first
  expect(scope.isManualTesting.value).toBe(true)
  expect(scope.manualTestMessage.value).toBe('')
  current.resolve({ valid: true, reason: '' })
  await second
  expect(scope.isManualTesting.value).toBe(false)
  expect(scope.manualTestPassed.value).toBe(true)
})
