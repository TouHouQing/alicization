import type { MainGatewayResolvedConfig } from './runtime-soul'

interface SyncAlicizationMainChatLlmRouteOptions {
  mainGateway: MainGatewayResolvedConfig
  providerConfig: Record<string, unknown>
  normalizeProviderConfig: (raw: unknown) => Record<string, unknown>
  getProviderCredentials: () => Record<string, Record<string, unknown>>
  getActiveProviderId: () => string
  getActiveModelId: () => string
  setProviderCredentials: (value: Record<string, Record<string, unknown>>) => void
  setActiveProviderId: (value: string) => void
  setActiveModelId: (value: string) => void
  persistLlmConfigToDisk?: () => Promise<void> | void
  resumePendingEmbeddingReindexJobs?: () => Promise<unknown> | unknown
}

export function isAlicizationPersonaRuntimeProviderId(providerId: string) {
  return providerId === 'llama.cpp-persona' || providerId === 'mlx-persona'
}

export async function syncAlicizationMainChatLlmRoute(
  input: SyncAlicizationMainChatLlmRouteOptions,
): Promise<{
  activeProviderId: string
  activeModelId: string
  persistedConfigKeys: string[]
}> {
  const personaOverlay = isAlicizationPersonaRuntimeProviderId(input.mainGateway.providerId)
  if (!personaOverlay) {
    input.setActiveProviderId(input.mainGateway.providerId)
    input.setActiveModelId(input.mainGateway.model)
  }

  const normalizedProviderConfig = input.normalizeProviderConfig(input.providerConfig)
  const currentProviderCredentials = input.getProviderCredentials()
  const nextProviderCredentials = !personaOverlay && Object.keys(normalizedProviderConfig).length > 0
    ? {
        ...currentProviderCredentials,
        [input.mainGateway.providerId]: {
          ...currentProviderCredentials[input.mainGateway.providerId],
          ...normalizedProviderConfig,
        },
      }
    : currentProviderCredentials

  if (nextProviderCredentials !== currentProviderCredentials)
    input.setProviderCredentials(nextProviderCredentials)

  // Route selection is part of the chat critical path. Disk persistence and
  // embedding recovery are maintenance work and must not delay the first
  // Provider request for a user turn.
  void Promise.resolve(input.persistLlmConfigToDisk?.()).catch(() => {})
  void Promise.resolve(input.resumePendingEmbeddingReindexJobs?.()).catch(() => {})

  return {
    activeProviderId: personaOverlay
      ? input.getActiveProviderId()
      : input.mainGateway.providerId,
    activeModelId: personaOverlay
      ? input.getActiveModelId()
      : input.mainGateway.model,
    persistedConfigKeys: Object.keys(
      nextProviderCredentials[personaOverlay ? input.getActiveProviderId() : input.mainGateway.providerId] ?? {},
    ),
  }
}
