import { describe, expect, it } from 'vitest'

import { describeMainGatewayRequestTarget, sameMainGatewayRequestTarget } from './main-gateway-request-target'

const config = { providerId: 'owned-provider', model: 'owned-vision', baseUrl: 'https://owned.example/v1/?route=private-route', probeHeaders: { Authorization: 'Bearer owned-secret' }, headers: { 'X-Account': 'owned-account' } }
describe('provider review is bound to the actual route and account without exposing credentials', () => {
  it('shows only the safe origin and model while committing private path, query and headers', () => {
    const target = describeMainGatewayRequestTarget(config)
    expect(target).toMatchObject({ providerId: config.providerId, model: config.model, origin: 'https://owned.example' })
    expect(target.routeHash).toMatch(/^[a-f0-9]{64}$/u)
    expect(JSON.stringify(target)).not.toMatch(/private-route|owned-secret|owned-account/u)
    expect(Object.isFrozen(target)).toBe(true)
  })
  it.each([
    { baseUrl: 'https://another.example/v1/' },
    { baseUrl: 'https://owned.example/v2/' },
    { model: 'another-model' },
    { probeHeaders: { Authorization: 'Bearer another-owned-secret' } },
    { headers: { 'X-Account': 'another-owned-account' } },
  ])('cannot reuse approval for a changed provider request %j', (change) => {
    expect(sameMainGatewayRequestTarget(describeMainGatewayRequestTarget(config), describeMainGatewayRequestTarget({ ...config, ...change }))).toBe(false)
  })
  it('does not accept an absent destination or a non-network URI', () => {
    expect(sameMainGatewayRequestTarget(describeMainGatewayRequestTarget(config), null)).toBe(false)
    expect(() => describeMainGatewayRequestTarget({ ...config, baseUrl: 'file:///private/image' })).toThrow('TARGET_INVALID')
  })
})
