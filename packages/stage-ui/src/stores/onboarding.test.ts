import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  activeProvider: '',
  activeModel: '',
  needsGenesis: false,
  configuredProviders: {} as Record<string, boolean>,
  providers: {} as Record<string, Record<string, unknown>>,
  addedProviders: {} as Record<string, boolean>,
  providerMetadata: {} as Record<string, { category: string }>,
  persistedChatProvidersMetadata: [] as Array<{ id: string, category: string }>,
}))

vi.mock('@vueuse/core', async () => {
  const { ref } = await import('vue')
  return {
    useLocalStorage: <T>(_key: string, initialValue: T) => ref(initialValue),
  }
})

vi.mock('./providers', () => ({
  useProvidersStore: () => ({
    configuredProviders: mocks.configuredProviders,
    providers: mocks.providers,
    addedProviders: mocks.addedProviders,
    providerMetadata: mocks.providerMetadata,
    persistedChatProvidersMetadata: mocks.persistedChatProvidersMetadata,
  }),
}))

vi.mock('./modules/consciousness', async () => {
  const { ref } = await import('vue')
  return {
    useConsciousnessStore: () => ({
      activeProvider: ref(mocks.activeProvider),
      activeModel: ref(mocks.activeModel),
    }),
  }
})

vi.mock('./alicization-epoch1', async () => {
  return {
    useAlicizationEpoch1Store: () => ({
      needsGenesis: mocks.needsGenesis,
    }),
  }
})

describe('onboarding store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.activeProvider = ''
    mocks.activeModel = ''
    mocks.needsGenesis = false
    Object.keys(mocks.configuredProviders).forEach(key => delete mocks.configuredProviders[key])
    Object.keys(mocks.providers).forEach(key => delete mocks.providers[key])
    Object.keys(mocks.addedProviders).forEach(key => delete mocks.addedProviders[key])
    Object.keys(mocks.providerMetadata).forEach(key => delete mocks.providerMetadata[key])
    mocks.persistedChatProvidersMetadata.length = 0
  })

  it('does not require onboarding when a persisted chat provider selection already exists', async () => {
    mocks.activeProvider = 'qwen-custom'
    mocks.activeModel = 'qwen3:32b'
    mocks.providers['qwen-custom'] = {
      baseUrl: 'https://example.test/v1/',
    }
    mocks.addedProviders['qwen-custom'] = true
    mocks.providerMetadata['qwen-custom'] = {
      category: 'chat',
    }

    const { useOnboardingStore } = await import('./onboarding')
    const store = useOnboardingStore()
    await store.initializeSetupCheck()

    expect(store.hasPersistedActiveProviderSelection).toBe(true)
    expect(store.needsOnboarding).toBe(false)
    expect(store.shouldShowSetup).toBe(false)
  })

  it('reopens onboarding when setup was completed but genesis is still needed', async () => {
    mocks.activeProvider = 'provider-not-hydrated-yet'
    mocks.activeModel = 'model-x'
    mocks.needsGenesis = true

    const { useOnboardingStore } = await import('./onboarding')
    const store = useOnboardingStore()

    store.markSetupCompleted()
    await store.initializeSetupCheck()

    expect(store.hasCompletedSetup).toBe(true)
    expect(store.needsOnboarding).toBe(true)
    expect(store.shouldShowSetup).toBe(true)
  })

  it('auto-promotes setup as completed when persisted chat provider metadata exists', async () => {
    mocks.persistedChatProvidersMetadata.push({
      id: 'openai-compatible',
      category: 'chat',
    })

    const { useOnboardingStore } = await import('./onboarding')
    const store = useOnboardingStore()
    await store.initializeSetupCheck()

    expect(store.needsOnboarding).toBe(false)
    expect(store.shouldShowSetup).toBe(false)
    expect(store.hasCompletedSetup).toBe(true)
  })

  it('does not reopen onboarding when runtime provider+model are persisted but metadata is not hydrated yet', async () => {
    mocks.activeProvider = 'provider-not-hydrated-yet'
    mocks.activeModel = 'model-x'

    const { useOnboardingStore } = await import('./onboarding')
    const store = useOnboardingStore()
    await store.initializeSetupCheck()

    expect(store.hasRuntimeProviderSelection).toBe(true)
    expect(store.needsOnboarding).toBe(false)
    expect(store.shouldShowSetup).toBe(false)
    expect(store.hasCompletedSetup).toBe(true)
  })

  it('still requires onboarding when the provider is ready but genesis is not', async () => {
    mocks.activeProvider = 'provider-not-hydrated-yet'
    mocks.activeModel = 'model-x'
    mocks.needsGenesis = true

    const { useOnboardingStore } = await import('./onboarding')
    const store = useOnboardingStore()
    await store.initializeSetupCheck()

    expect(store.hasRuntimeProviderSelection).toBe(true)
    expect(store.hasGenesisReady).toBe(false)
    expect(store.needsOnboarding).toBe(true)
    expect(store.shouldShowSetup).toBe(true)
    expect(store.hasCompletedSetup).toBe(false)
  })
})
