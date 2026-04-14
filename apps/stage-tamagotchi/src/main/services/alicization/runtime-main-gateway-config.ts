import type {
  AlicizationMainGatewayHealthCacheEntry,
  AlicizationMainGatewayReachabilitySnapshot,
} from './main-gateway-health'
import type { MainGatewayResolvedConfig } from './runtime-soul'

import { createOpenAI } from '@xsai-ext/providers/create'

import {
  buildAlicizationMainGatewayHealthCacheKey,
  createAlicizationMainGatewayChatTimeoutResult,
  formatAlicizationMainGatewayHealthFailure,
  mainGatewayChatTimeoutFailureCode,
  mainGatewayChatTimeoutFailureTtlMs,
  mainGatewayReachabilityFailureTtlMs,
  mainGatewayReachabilityProbeTimeoutMs,
  mainGatewayReachabilitySuccessTtlMs,
  probeAlicizationMainGatewayReachability,
  readAlicizationMainGatewayHealthCache,
  writeAlicizationMainGatewayHealthCache,
} from './main-gateway-health'
import { defaultAlicizationCardId, normalizeCardId } from './runtime-soul'

interface AlicizationRememberedMainGatewayRoute {
  cardId: string
  providerId: string
  model: string
  providerConfig: Record<string, unknown>
  updatedAt: number
}

interface CreateAlicizationMainGatewayConfigRuntimeOptions {
  sanitizeText: (raw: unknown, fallback?: string) => string
  getActiveProviderId: () => string
  getActiveModelId: () => string
  getProviderCredentials: () => Record<string, Record<string, unknown>>
}

export function createAlicizationMainGatewayConfigRuntime(options: CreateAlicizationMainGatewayConfigRuntimeOptions) {
  const mainGatewayHealthCache = new Map<string, AlicizationMainGatewayHealthCacheEntry>()
  const rememberedRoutesByCard = new Map<string, AlicizationRememberedMainGatewayRoute>()

  function normalizeProviderCredentialsMap(raw: unknown) {
    if (!raw || typeof raw !== 'object')
      return {} as Record<string, Record<string, unknown>>
    const entries = Object.entries(raw as Record<string, unknown>)
      .filter(([, value]) => value && typeof value === 'object')
      .map(([key, value]) => [key, value as Record<string, unknown>])
    return Object.fromEntries(entries)
  }

  function normalizeProviderConfig(raw: unknown) {
    if (!raw || typeof raw !== 'object')
      return {} as Record<string, unknown>
    return raw as Record<string, unknown>
  }

  function rememberMainGatewayRoute(input: {
    cardId?: string
    mainGateway: Pick<MainGatewayResolvedConfig, 'providerId' | 'model'>
    providerConfig?: Record<string, unknown>
  }) {
    const cardId = normalizeCardId(input.cardId ?? defaultAlicizationCardId)
    rememberedRoutesByCard.set(cardId, {
      cardId,
      providerId: input.mainGateway.providerId,
      model: input.mainGateway.model,
      providerConfig: normalizeProviderConfig(input.providerConfig),
      updatedAt: Date.now(),
    })
  }

  function resolveMainGatewayConfig(input?: {
    cardId?: string
    providerId?: string
    model?: string
    providerConfig?: Record<string, unknown>
  }): MainGatewayResolvedConfig | null {
    const cardId = normalizeCardId(input?.cardId ?? defaultAlicizationCardId)
    const rememberedRoute = rememberedRoutesByCard.get(cardId)
    const providerId = options.sanitizeText(
      input?.providerId
      || rememberedRoute?.providerId
      || options.getActiveProviderId(),
    )
    const model = options.sanitizeText(
      input?.model
      || rememberedRoute?.model
      || options.getActiveModelId(),
    )
    if (!providerId || !model)
      return null

    const requestProviderConfig = normalizeProviderConfig(input?.providerConfig)
    const rememberedProviderConfig = rememberedRoute?.providerId === providerId
      ? normalizeProviderConfig(rememberedRoute.providerConfig)
      : {}
    const mergedCredentials = {
      ...options.getProviderCredentials()[providerId],
      ...rememberedProviderConfig,
      ...requestProviderConfig,
    }
    const requestHeaders = (
      mergedCredentials.headers
      && typeof mergedCredentials.headers === 'object'
    )
      ? mergedCredentials.headers as Record<string, string>
      : undefined
    const apiKey = options.sanitizeText(mergedCredentials.apiKey)
    const baseUrlRaw = options.sanitizeText((mergedCredentials.baseUrl ?? mergedCredentials.baseURL) as string, 'https://api.openai.com/v1')
    const baseUrl = baseUrlRaw.endsWith('/') ? baseUrlRaw : `${baseUrlRaw}/`
    const provider = createOpenAI(apiKey, baseUrl)
    const probeHeaders = {
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...requestHeaders,
    }

    return {
      providerId,
      model,
      baseUrl,
      headers: requestHeaders,
      probeHeaders,
      provider,
    }
  }

  async function ensureMainGatewayReachable(
    mainGateway: MainGatewayResolvedConfig,
    options?: {
      bypassCache?: boolean
      ignoreChatTimeoutCache?: boolean
    },
  ): Promise<AlicizationMainGatewayReachabilitySnapshot> {
    const now = Date.now()
    const cachedEntry = options?.bypassCache
      ? null
      : readAlicizationMainGatewayHealthCache(mainGatewayHealthCache, mainGateway.baseUrl, now)
    const shouldIgnoreCachedChatTimeout = Boolean(
      options?.ignoreChatTimeoutCache
      && cachedEntry
      && !cachedEntry.reachable
      && String(cachedEntry.code ?? '').toUpperCase() === mainGatewayChatTimeoutFailureCode,
    )
    if (cachedEntry && !shouldIgnoreCachedChatTimeout) {
      return {
        reachable: cachedEntry.reachable,
        cached: true,
        code: cachedEntry.code,
        reason: cachedEntry.reason,
        formattedReason: cachedEntry.reachable
          ? undefined
          : formatAlicizationMainGatewayHealthFailure(mainGateway.baseUrl, cachedEntry),
      }
    }
    if (shouldIgnoreCachedChatTimeout) {
      const cacheKey = buildAlicizationMainGatewayHealthCacheKey(mainGateway.baseUrl)
      mainGatewayHealthCache.delete(cacheKey)
    }

    const result = await probeAlicizationMainGatewayReachability({
      baseUrl: mainGateway.baseUrl,
      headers: mainGateway.probeHeaders,
      timeoutMs: mainGatewayReachabilityProbeTimeoutMs,
    })
    writeAlicizationMainGatewayHealthCache(
      mainGatewayHealthCache,
      mainGateway.baseUrl,
      result,
      now,
      {
        successTtlMs: mainGatewayReachabilitySuccessTtlMs,
        failureTtlMs: mainGatewayReachabilityFailureTtlMs,
      },
    )
    return {
      ...result,
      cached: false,
      formattedReason: result.reachable
        ? undefined
        : formatAlicizationMainGatewayHealthFailure(mainGateway.baseUrl, result),
    }
  }

  function recordMainGatewayGenerationTimeout(
    mainGateway: MainGatewayResolvedConfig,
    reason: unknown,
  ) {
    writeAlicizationMainGatewayHealthCache(
      mainGatewayHealthCache,
      mainGateway.baseUrl,
      createAlicizationMainGatewayChatTimeoutResult(reason),
      Date.now(),
      {
        failureTtlMs: mainGatewayChatTimeoutFailureTtlMs,
      },
    )
  }

  return {
    normalizeProviderCredentialsMap,
    normalizeProviderConfig,
    rememberMainGatewayRoute,
    resolveMainGatewayConfig,
    ensureMainGatewayReachable,
    recordMainGatewayGenerationTimeout,
  }
}
