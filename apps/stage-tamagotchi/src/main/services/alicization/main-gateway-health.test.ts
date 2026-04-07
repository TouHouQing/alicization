import { describe, expect, it, vi } from 'vitest'

import {
  buildAlicizationMainGatewayHealthCacheKey,
  createAlicizationMainGatewayChatTimeoutResult,
  formatAlicizationMainGatewayHealthFailure,
  probeAlicizationMainGatewayReachability,
  readAlicizationMainGatewayHealthCache,
  writeAlicizationMainGatewayHealthCache,
} from './main-gateway-health'

describe('main gateway health', () => {
  it('treats any HTTP response as reachable', async () => {
    const fetchImpl = vi.fn(async () => ({ status: 404 }) as Response)

    const result = await probeAlicizationMainGatewayReachability({
      baseUrl: 'https://example.test/v1/',
      fetchImpl,
    })

    expect(result).toEqual({
      reachable: true,
      status: 404,
    })
  })

  it('normalizes network failures into unreachable results', async () => {
    const fetchImpl = vi.fn(async () => {
      const error = new TypeError('fetch failed') as TypeError & {
        cause?: { code: string, message: string }
      }
      error.cause = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:443',
      }
      throw error
    })

    const result = await probeAlicizationMainGatewayReachability({
      baseUrl: 'https://example.test/v1/',
      fetchImpl,
    })

    expect(result).toEqual({
      reachable: false,
      code: 'ECONNREFUSED',
      reason: 'connect ECONNREFUSED 127.0.0.1:443',
    })
    expect(formatAlicizationMainGatewayHealthFailure('https://example.test/v1/', result)).toContain('example.test')
  })

  it('stores and expires cached probe results', () => {
    const cache = new Map()
    const now = 1_000

    writeAlicizationMainGatewayHealthCache(cache, 'https://example.test/v1', {
      reachable: false,
      code: 'TIMEOUT',
      reason: 'gateway health probe failed',
    }, now, {
      failureTtlMs: 500,
    })

    expect(buildAlicizationMainGatewayHealthCacheKey('https://example.test/v1')).toBe('https://example.test/v1/')
    expect(readAlicizationMainGatewayHealthCache(cache, 'https://example.test/v1/', now + 100)).toEqual({
      reachable: false,
      checkedAt: now,
      expiresAt: now + 500,
      code: 'TIMEOUT',
      reason: 'gateway health probe failed',
    })
    expect(readAlicizationMainGatewayHealthCache(cache, 'https://example.test/v1/', now + 600)).toBeNull()
  })

  it('formats chat-timeout failures as generation-health failures', () => {
    const result = createAlicizationMainGatewayChatTimeoutResult('Chat completions timed out before the first event.')

    expect(formatAlicizationMainGatewayHealthFailure('https://example.test/v1/', result)).toBe(
      'Main gateway health check failed for example.test (chat_timeout). Chat completions timed out before the first event.',
    )
  })
})
