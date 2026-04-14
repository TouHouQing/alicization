import type { ProviderCatalogProvider } from '../database/repos/providers.repo'

import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { client } from '../composables/api'
import { useLocalFirstRequest } from '../composables/use-local-first'
import { providersRepo } from '../database/repos/providers.repo'
import { getDefinedProvider, listProviders } from '../libs/providers/providers'
import { useProvidersStore } from './providers'

export const useProviderCatalogStore = defineStore('provider-catalog', () => {
  const defs = computed(() => listProviders())
  const configs = ref<Record<string, ProviderCatalogProvider>>({})
  const providersStore = useProvidersStore()
  const syncedDefinitionIds = new Set<string>()

  function isSyncableDefinitionId(definitionId: string) {
    return !!providersStore.providerMetadata[definitionId]
  }

  function listDefinitionEntries(definitionId: string) {
    return Object.values(configs.value).filter(entry => entry.definitionId === definitionId)
  }

  function getRuntimeSyncScore(entry: ProviderCatalogProvider) {
    let score = 0
    if (entry.validated)
      score += 4
    if (entry.validationBypassed)
      score += 2
    if (Object.keys(entry.config ?? {}).length > 0)
      score += 1
    return score
  }

  function pickDefinitionRuntimeEntry(definitionId: string) {
    let picked: ProviderCatalogProvider | null = null
    let bestScore = -1

    for (const entry of listDefinitionEntries(definitionId)) {
      const score = getRuntimeSyncScore(entry)
      // NOTICE: Use >= to let the latest record win when scores are the same.
      if (score >= bestScore) {
        bestScore = score
        picked = entry
      }
    }

    return picked
  }

  async function syncRuntimeProviderForDefinition(definitionId: string) {
    if (!isSyncableDefinitionId(definitionId))
      return

    const picked = pickDefinitionRuntimeEntry(definitionId)
    if (!picked) {
      if (syncedDefinitionIds.has(definitionId)) {
        providersStore.deleteProvider(definitionId)
        syncedDefinitionIds.delete(definitionId)
      }
      return
    }

    providersStore.providers[definitionId] = { ...picked.config }
    providersStore.markProviderAdded(definitionId)
    syncedDefinitionIds.add(definitionId)

    if (picked.validationBypassed) {
      providersStore.forceProviderConfigured(definitionId)
      return
    }

    await providersStore.validateProvider(definitionId, { force: true }).catch(() => {})
  }

  async function syncRuntimeProvidersFromCatalog() {
    const candidateDefinitionIds = new Set<string>([
      ...syncedDefinitionIds,
      ...Object.values(configs.value).map(entry => entry.definitionId),
    ])

    for (const definitionId of candidateDefinitionIds) {
      await syncRuntimeProviderForDefinition(definitionId)
    }
  }

  async function fetchList() {
    return useLocalFirstRequest({
      local: async () => {
        const cached = await providersRepo.getAll()
        configs.value = cached
        await syncRuntimeProvidersFromCatalog()
      },
      remote: async () => {
        const res = await client.api.providers.$get()
        if (!res.ok) {
          throw new Error('Failed to fetch providers')
        }
        const data = await res.json()

        const newConfigs: Record<string, ProviderCatalogProvider> = {}
        for (const item of data) {
          newConfigs[item.id] = {
            id: item.id,
            definitionId: item.definitionId,
            name: item.name,
            config: item.config as Record<string, any>,
            validated: item.validated,
            validationBypassed: item.validationBypassed,
          }
        }
        configs.value = newConfigs
        await providersRepo.saveAll(newConfigs)
        await syncRuntimeProvidersFromCatalog()
      },
    })
  }

  async function addProvider(definitionId: string, initialConfig: Record<string, any> = {}) {
    const definition = getDefinedProvider(definitionId)
    if (!definition) {
      throw new Error(`Provider definition with id "${definitionId}" not found.`)
    }

    const id = nanoid()
    const provider: ProviderCatalogProvider = {
      id,
      definitionId,
      name: definition.name,
      config: initialConfig,
      validated: false,
      validationBypassed: false,
    }

    return useLocalFirstRequest<ProviderCatalogProvider>({
      local: async () => {
        configs.value[id] = provider
        await providersRepo.upsert(provider)
        await syncRuntimeProviderForDefinition(definitionId)
        return provider
      },
      remote: async () => {
        const res = await client.api.providers.$post({
          json: {
            id,
            definitionId,
            name: provider.name,
            config: provider.config,
            validated: provider.validated,
            validationBypassed: provider.validationBypassed,
          },
        })
        if (!res.ok) {
          throw new Error('Failed to add provider')
        }
        const item = await res.json() as ProviderCatalogProvider
        const finalProvider: ProviderCatalogProvider = {
          id: item.id,
          definitionId: item.definitionId,
          name: item.name,
          config: item.config as Record<string, any>,
          validated: item.validated,
          validationBypassed: item.validationBypassed,
        }

        configs.value[item.id] = finalProvider
        await providersRepo.upsert(finalProvider)
        await syncRuntimeProviderForDefinition(finalProvider.definitionId)
        return item
      },
    })
  }

  async function removeProvider(providerId: string) {
    const removed = configs.value[providerId]
    if (!removed) {
      return
    }

    return useLocalFirstRequest({
      local: async () => {
        delete configs.value[providerId]
        await providersRepo.remove(providerId)
        await syncRuntimeProviderForDefinition(removed.definitionId)
      },
      remote: async () => {
        const res = await client.api.providers[':id'].$delete({
          param: { id: providerId },
        })
        if (!res.ok) {
          throw new Error('Failed to remove provider')
        }
        await syncRuntimeProviderForDefinition(removed.definitionId)
      },
    })
  }

  async function commitProviderConfig(providerId: string, newConfig: Record<string, any>, options: { validated: boolean, validationBypassed: boolean }) {
    const provider = configs.value[providerId]
    if (!provider) {
      return
    }

    return useLocalFirstRequest<ProviderCatalogProvider>({
      local: async () => {
        provider.config = { ...newConfig }
        provider.validated = options.validated
        provider.validationBypassed = options.validationBypassed
        await providersRepo.upsert(provider)
        await syncRuntimeProviderForDefinition(provider.definitionId)
        return provider
      },
      remote: async () => {
        const res = await client.api.providers[':id'].$patch({
          param: { id: providerId },
          // @ts-expect-error hono client typing misses json option for this route
          json: {
            config: newConfig,
            validated: options.validated,
            validationBypassed: options.validationBypassed,
          },
        })
        if (!res.ok) {
          throw new Error('Failed to update provider config')
        }
        const item = await res.json() as ProviderCatalogProvider
        // Sync with server response just in case
        provider.config = { ...item.config }
        provider.validated = item.validated
        provider.validationBypassed = item.validationBypassed
        await providersRepo.upsert(provider)
        await syncRuntimeProviderForDefinition(provider.definitionId)
        return provider
      },
    })
  }

  return {
    configs,
    defs,
    getDefinedProvider,

    fetchList,
    addProvider,
    removeProvider,
    commitProviderConfig,
  }
})
