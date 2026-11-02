// @vitest-environment jsdom

import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import { useProvidersStore } from './providers'

const fixture = vi.hoisted(() => ({
  validate: vi.fn(),
  models: vi.fn(),
  create: vi.fn(),
  intervals: [] as Array<() => void>,
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('../workers/kokoro', () => ({ getKokoroWorker: vi.fn() }))
vi.mock('../libs/providers', () => ({ listProviders: () => [{ id: 'qa' }] }))
vi.mock('../libs/providers/validators/run', () => ({ getProviderValidationIntervalMs: () => 15_000 }))
vi.mock('./providers/converters', () => ({
  convertProviderDefinitionsToMetadata: () => ({
    qa: {
      id: 'qa',
      category: 'chat',
      tasks: ['chat'],
      name: 'Synthetic',
      nameKey: 'qa',
      description: '',
      descriptionKey: 'qa',
      defaultOptions: () => ({ baseUrl: 'http://127.0.0.1:1234/v1/', headers: { 'X-QA': 'initial' } }),
      validators: { validateProviderConfig: fixture.validate },
      capabilities: { listModels: fixture.models },
      createProvider: fixture.create,
    },
  }),
}))
vi.mock('@vueuse/core', async (original) => {
  const actual = await original<typeof import('@vueuse/core')>()
  const { ref } = await import('vue')
  return {
    ...actual,
    // Availability probes and timers are outside this store ownership contract.
    computedAsync: () => ref([]),
    useIntervalFn: (callback: () => void) => {
      fixture.intervals.push(callback)
      return { resume: vi.fn(), pause: vi.fn() }
    },
  }
})

let pinia: ReturnType<typeof createPinia>
beforeEach(() => {
  localStorage.clear()
  fixture.validate.mockReset().mockResolvedValue({ valid: false, errors: [], reason: 'Unconfigured synthetic endpoint' })
  fixture.models.mockReset().mockResolvedValue([])
  fixture.create.mockReset()
  fixture.intervals.length = 0
  pinia = createPinia()
  setActivePinia(pinia)
})
afterEach(() => {
  disposePinia(pinia)
  vi.restoreAllMocks()
  localStorage.clear()
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}
const valid = { valid: true, reason: '', errors: [] }
const invalid = { valid: false, reason: 'Synthetic failure', errors: [] }
const model = (id: string) => ({ id, name: id, provider: 'qa' })
async function flush() {
  for (let index = 0; index < 8; index++) await nextTick()
}
async function configuredFixture() {
  const store = useProvidersStore()
  store.providers.qa.apiKey = 'synthetic-key'
  await flush()
  fixture.validate.mockClear()
  return store
}

it('does not validate edited credentials with an old success or mutate the validator snapshot', async () => {
  const store = await configuredFixture()
  const old = deferred<typeof valid>()
  fixture.validate.mockReturnValueOnce(old.promise).mockResolvedValue(invalid)
  const request = store.validateProvider('qa', { force: true })
  const snapshot = fixture.validate.mock.calls[0][0]
  ;(store.providers.qa.headers as Record<string, string>)['X-QA'] = 'edited'
  await flush()
  old.resolve(valid)
  await request
  await flush()
  expect(store.configuredProviders.qa).toBe(false)
  expect(snapshot.headers).toEqual({ 'X-QA': 'initial' })
})

it('keeps the newest forced validation when two runs finish in reverse order', async () => {
  const store = await configuredFixture()
  const first = deferred<typeof valid>()
  const second = deferred<typeof valid>()
  fixture.validate.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  const a = store.validateProvider('qa', { force: true })
  const b = store.validateProvider('qa', { force: true })
  second.resolve(valid)
  await b
  first.resolve(invalid)
  await a
  expect(store.configuredProviders.qa).toBe(true)
})

it('does not reuse an in-flight result after credentials change A to B to A in one tick', async () => {
  const store = await configuredFixture()
  const old = deferred<typeof valid>()
  fixture.validate.mockReturnValueOnce(old.promise).mockResolvedValue(invalid)
  const a = store.validateProvider('qa', { force: true })
  store.providers.qa.apiKey = 'synthetic-other-key'
  store.providers.qa.apiKey = 'synthetic-key'
  await flush()
  old.resolve(valid)
  await a
  await flush()
  expect(store.configuredProviders.qa).toBe(false)
})

it('does not overwrite a deliberate current bypass with an older failed check', async () => {
  const store = await configuredFixture()
  const old = deferred<typeof valid>()
  fixture.validate.mockReturnValueOnce(old.promise)
  const request = store.validateProvider('qa', { force: true })
  store.forceProviderConfigured('qa')
  old.resolve(invalid)
  await request
  expect(store.configuredProviders.qa).toBe(true)
})

it('does not let stale periodic failure back off current credentials', async () => {
  const store = await configuredFixture()
  // Start with the current endpoint available, outside initial-failure backoff.
  store.forceProviderConfigured('qa')
  const old = deferred<typeof valid>()
  fixture.validate.mockReturnValueOnce(old.promise).mockResolvedValue(valid)
  fixture.intervals[0]()
  store.providers.qa.apiKey = 'synthetic-new-key'
  await flush()
  old.reject(new Error('Old synthetic endpoint disconnected'))
  await flush()
  const calls = fixture.validate.mock.calls.length
  fixture.intervals[0]()
  await flush()
  expect(fixture.validate.mock.calls.length).toBe(calls + 1)
  expect(store.configuredProviders.qa).toBe(true)
})

it('keeps model rows and loading owned by the newest model request', async () => {
  const store = await configuredFixture()
  const old = deferred<ReturnType<typeof model>[]>()
  const current = deferred<ReturnType<typeof model>[]>()
  fixture.models.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
  const a = store.fetchModelsForProvider('qa')
  const b = store.fetchModelsForProvider('qa')
  old.resolve([model('obsolete')])
  await a
  expect(store.isLoadingModels.qa).toBe(true)
  expect(store.availableModels.qa).toEqual([])
  current.resolve([model('current')])
  await b
  expect(store.availableModels.qa.map(value => value.id)).toEqual(['current'])
  expect(store.isLoadingModels.qa).toBe(false)
})

it('does not surface an old model error after credential edit or pass live nested headers to a request', async () => {
  const store = await configuredFixture()
  const old = deferred<ReturnType<typeof model>[]>()
  fixture.models.mockReturnValueOnce(old.promise)
  const request = store.fetchModelsForProvider('qa')
  const snapshot = fixture.models.mock.calls[0][0]
  ;(store.providers.qa.headers as Record<string, string>)['X-QA'] = 'edited'
  await flush()
  old.reject(new Error('Old synthetic model list failed'))
  await request
  expect(store.modelLoadError.qa).toBeNull()
  expect(store.isLoadingModels.qa).toBe(false)
  expect(snapshot.headers).toEqual({ 'X-QA': 'initial' })
})

it('deduplicates concurrent instance creation for one credential owner', async () => {
  const store = await configuredFixture()
  const instance = { chat: vi.fn(), dispose: vi.fn() }
  const pending = deferred<typeof instance>()
  fixture.create.mockReturnValue(pending.promise)
  const a = store.getProviderInstance('qa')
  const b = store.getProviderInstance('qa')
  pending.resolve(instance)
  const [first, second] = await Promise.all([a, b])
  expect(first).toBe(second)
  expect(fixture.create).toHaveBeenCalledTimes(1)
})

it('rejects and disposes a created instance whose credentials were replaced', async () => {
  const store = await configuredFixture()
  const instance = { chat: vi.fn(), dispose: vi.fn() }
  const pending = deferred<typeof instance>()
  fixture.create.mockReturnValueOnce(pending.promise)
  const request = store.getProviderInstance('qa')
  const rejection = expect(request).rejects.toThrow(/configuration changed|obsolete/i)
  store.providers.qa.apiKey = 'synthetic-new-key'
  await flush()
  pending.resolve(instance)
  await rejection
  expect(instance.dispose).toHaveBeenCalledOnce()
})

it('removes an old instance before awaiting disposal so it cannot erase a replacement', async () => {
  const store = await configuredFixture()
  const disposing = deferred<void>()
  const old = { chat: vi.fn(), dispose: vi.fn(() => disposing.promise) }
  const current = { chat: vi.fn(), dispose: vi.fn() }
  fixture.create.mockResolvedValueOnce(old).mockResolvedValueOnce(current)
  await store.getProviderInstance('qa')
  const cleanup = store.disposeProviderInstance('qa')
  const replacement = await store.getProviderInstance('qa')
  expect('chat' in replacement && replacement.chat).toBe(current.chat)
  disposing.resolve()
  await cleanup
  expect(await store.getProviderInstance('qa')).toBe(replacement)
  expect(fixture.create).toHaveBeenCalledTimes(2)
  expect(old.dispose).toHaveBeenCalledOnce()
})

it('does not resurrect deleted or reset runtime state from older validation', async () => {
  const store = await configuredFixture()
  const old = deferred<typeof valid>()
  fixture.validate.mockReturnValueOnce(old.promise)
  const request = store.validateProvider('qa', { force: true })
  store.deleteProvider('qa')
  store.initializeProvider('qa')
  old.resolve(valid)
  await request
  await flush()
  expect(store.configuredProviders.qa).toBe(false)
  expect(store.addedProviders.qa).toBeUndefined()
})

it('does not publish validation success after the provider store scope closes', async () => {
  const store = await configuredFixture()
  const old = deferred<typeof valid>()
  fixture.validate.mockReturnValueOnce(old.promise)
  const request = store.validateProvider('qa', { force: true })
  store.$dispose()
  old.resolve(valid)
  await request
  expect(store.configuredProviders.qa).toBe(false)
})

it('keeps reset credentials unconfigured when an old check completes', async () => {
  const store = await configuredFixture()
  const old = deferred<typeof valid>()
  fixture.validate.mockReturnValueOnce(old.promise)
  const request = store.validateProvider('qa', { force: true })
  await store.resetProviderSettings()
  old.resolve(valid)
  await request
  expect(store.providers.qa.apiKey).toBeUndefined()
  expect(store.configuredProviders.qa).toBe(false)
})

it('does not restore old model rows after a same-tick A to B to A credential edit', async () => {
  const store = await configuredFixture()
  const old = deferred<ReturnType<typeof model>[]>()
  fixture.models.mockReturnValueOnce(old.promise)
  const request = store.fetchModelsForProvider('qa')
  store.providers.qa.apiKey = 'synthetic-other-key'
  store.providers.qa.apiKey = 'synthetic-key'
  old.resolve([model('obsolete')])
  await request
  expect(store.availableModels.qa).toEqual([])
  expect(store.isLoadingModels.qa).toBe(false)
})

it('revokes pending creation on explicit disposal and keeps the replacement cached', async () => {
  const store = await configuredFixture()
  const old = { chat: vi.fn(), dispose: vi.fn() }
  const current = { chat: vi.fn(), dispose: vi.fn() }
  const pending = deferred<typeof old>()
  fixture.create.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(current)
  const request = store.getProviderInstance('qa')
  const rejection = expect(request).rejects.toThrow(/configuration changed|obsolete/i)
  await store.disposeProviderInstance('qa')
  const replacement = await store.getProviderInstance('qa')
  pending.resolve(old)
  await rejection
  expect(old.dispose).toHaveBeenCalledOnce()
  expect(await store.getProviderInstance('qa')).toBe(replacement)
  expect(current.dispose).not.toHaveBeenCalled()
})
