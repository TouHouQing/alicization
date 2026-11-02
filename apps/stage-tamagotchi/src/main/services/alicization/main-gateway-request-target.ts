import type { MainGatewayResolvedConfig } from './runtime-soul'

import { createHash } from 'node:crypto'

export interface MainGatewayRequestTarget { providerId: string, model: string, origin: string, routeHash: string }

/** Display only the origin and model; hash private route/account configuration. */
export function describeMainGatewayRequestTarget(config: Pick<MainGatewayResolvedConfig, 'providerId' | 'model' | 'baseUrl' | 'headers' | 'probeHeaders'>): MainGatewayRequestTarget {
  const url = new URL(config.baseUrl)
  if (!['http:', 'https:'].includes(url.protocol) || !config.providerId || !config.model || config.providerId.length > 256 || config.model.length > 256)
    throw new Error('MAIN_GATEWAY_REQUEST_TARGET_INVALID')
  const headers = new Map<string, string>()
  for (const [name, value] of Object.entries({ ...config.probeHeaders, ...config.headers })) {
    if (typeof value !== 'string' || value.length > 65_536)
      throw new Error('MAIN_GATEWAY_REQUEST_TARGET_HEADERS_INVALID')
    headers.set(name.toLowerCase(), value)
  }
  const routeHash = createHash('sha256').update(JSON.stringify({ providerId: config.providerId, model: config.model, url: url.href, headers: [...headers].sort(([a], [b]) => a.localeCompare(b)) })).digest('hex')
  return Object.freeze({ providerId: config.providerId, model: config.model, origin: url.origin, routeHash })
}

export function sameMainGatewayRequestTarget(left: MainGatewayRequestTarget | null | undefined, right: MainGatewayRequestTarget | null | undefined) {
  return Boolean(left && right && left.providerId === right.providerId && left.model === right.model && left.origin === right.origin && left.routeHash === right.routeHash)
}
