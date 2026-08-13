import type { MainGatewayResolvedConfig } from './runtime-soul'

interface SyncAlicizationMainChatLlmRouteOptions {
  mainGateway: MainGatewayResolvedConfig
  providerConfig: Record<string, unknown>
  normalizeProviderConfig: (raw: unknown) => Record<string, unknown>
  getProviderCredentials: () => Record<string, Record<string, unknown>>
  setProviderCredentials: (value: Record<string, Record<string, unknown>>) => void
  setActiveProviderId: (value: string) => void
  setActiveModelId: (value: string) => void
  persistLlmConfigToDisk?: () => Promise<void> | void
  resumePendingEmbeddingReindexJobs?: () => Promise<unknown> | unknown
}

export async function syncAlicizationMainChatLlmRoute(
  input: SyncAlicizationMainChatLlmRouteOptions,
): Promise<{
  activeProviderId: string
  activeModelId: string
  persistedConfigKeys: string[]
}> {
  input.setActiveProviderId(input.mainGateway.providerId)
  input.setActiveModelId(input.mainGateway.model)

  const normalizedProviderConfig = input.normalizeProviderConfig(input.providerConfig)
  const currentProviderCredentials = input.getProviderCredentials()
  const nextProviderCredentials = Object.keys(normalizedProviderConfig).length > 0
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
    activeProviderId: input.mainGateway.providerId,
    activeModelId: input.mainGateway.model,
    persistedConfigKeys: Object.keys(nextProviderCredentials[input.mainGateway.providerId] ?? {}),
  }
}
