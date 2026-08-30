import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const mocks = vi.hoisted(() => ({
  activeProvider: '',
  activeModel: '',
}))

vi.mock('@proj-alicization/stage-shared/composables', () => ({
  useLocalStorageManualReset: <T>(_key: string, initialValue: T) => {
    const value = ref(initialValue)
    return Object.assign(value, {
      reset: () => {
        value.value = initialValue
      },
    })
  },
}))

vi.mock('../providers', () => ({
  useProvidersStore: () => ({
    getProviderMetadata: vi.fn(() => undefined),
    getModelsForProvider: vi.fn(() => []),
    fetchModelsForProvider: vi.fn(async () => []),
    isLoadingModels: {},
    modelLoadError: {},
  }),
}))

describe('consciousness store runtime configuration readiness', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.activeProvider = ''
    mocks.activeModel = ''
  })

  it('waits for main-process LLM configuration hydration before allowing chat startup', async () => {
    const { useConsciousnessStore } = await import('./consciousness')
    const store = useConsciousnessStore()

    let resolved = false
    const ready = store.waitForRuntimeConfig().then(() => {
      resolved = true
    })

    await Promise.resolve()
    expect(resolved).toBe(false)
    expect(store.runtimeConfigHydrated).toBe(false)

    store.markRuntimeConfigHydrated()
    await ready

    expect(resolved).toBe(true)
    expect(store.runtimeConfigHydrated).toBe(true)
  })

  it('settles when main-process configuration hydration never completes', async () => {
    const { useConsciousnessStore } = await import('./consciousness')
    const store = useConsciousnessStore()

    const result = await Promise.race([
      (store.waitForRuntimeConfig as unknown as (options: { timeoutMs: number }) => Promise<boolean>)({ timeoutMs: 10 }),
      new Promise<boolean | 'test-timeout'>(resolve => setTimeout(() => resolve('test-timeout'), 50)),
    ])

    expect(result).toBe(false)
    expect(store.runtimeConfigHydrated).toBe(false)
  })
})
