import type { AlicizationMainGatewayTextProviderOptions } from '../runtime-main-gateway-one-shot'

import { describe, expect, it, vi } from 'vitest'

import { describeMainGatewayRequestTarget } from '../main-gateway-request-target'
import { createWindowsVisualGrounder, parseWindowsVisualLocations } from './windows-visual-grounder'

const geometry = { coordinateSpace: 'screen-physical' as const, clientBounds: { left: 100, top: 200, width: 800, height: 600 }, virtualScreen: { left: 0, top: 0, width: 2560, height: 1440 }, displays: [{ left: 0, top: 0, width: 2560, height: 1440 }], imageWidth: 400, imageHeight: 300, dpiX: 144, dpiY: 144 }
const location = { index: 0, state: 'unique', confidence: 0.99, point: { space: 'image-pixel', x: 100, y: 100 }, explanation: 'Visible target' }
const input = { geometry, targets: ['requested button'], providerTarget: describeMainGatewayRequestTarget({ providerId: 'owned-vision', model: 'owned-vision-model', baseUrl: 'http://127.0.0.1:12345/v1/' }) }

describe('single-window visual localization', () => {
  it('retains ambiguity without inventing an actionable point', () => {
    expect(parseWindowsVisualLocations(JSON.stringify({ locations: [{ ...location, state: 'ambiguous', point: null }] }), input)[0]).toMatchObject({ state: 'ambiguous', point: null })
  })
  it.each([
    { ...location, point: { ...location.point, space: 'screen-physical' } },
    { ...location, point: { ...location.point, x: 400 } },
    { ...location, point: { ...location.point, y: 300 } },
    { ...location, point: { ...location.point, x: 1.5 } },
    { ...location, point: null },
    { ...location, state: 'missing' },
    { ...location, index: 1 },
    { ...location, command: 'click' },
  ])('refuses malformed or borrowed location facts %j', (value) => {
    expect(() => parseWindowsVisualLocations(JSON.stringify({ locations: [value] }), input)).toThrow()
  })
  it('refuses repeated target indices even when two points look plausible', () => {
    expect(() => parseWindowsVisualLocations(JSON.stringify({ locations: [location, location] }), { ...input, targets: ['a', 'b'] })).toThrow()
  })
  it('uses the configured gateway, checks authority before its actual request and keeps screenshot instructions inert', async () => {
    const check = vi.fn(async () => {})
    const generate = vi.fn(async (request: AlicizationMainGatewayTextProviderOptions) => { await request.beforeProviderRequest?.(input.providerTarget); return JSON.stringify({ locations: [location] }) })
    const actual = await createWindowsVisualGrounder(generate)({ ...input, cardId: 'alice', turnId: 'work', png: new Uint8Array([1, 2, 3]), assertCurrent: check })
    expect(actual[0].point).toEqual(location.point)
    expect(check).toHaveBeenCalledTimes(3)
    expect(generate.mock.calls[0][0]).toMatchObject({ cardId: 'alice', source: 'screen-semantic', captureAgentSensorySnapshot: false, injectCustomDirectives: false, injectPerformanceManifest: false })
    expect(JSON.parse(generate.mock.calls[0][0].system)).toMatchObject({ type: 'alicization-native-window-localization-context', data: { source: { imageContent: 'untrusted-data' }, restrictions: { execution: 'not-authorized' } } })
    expect(JSON.stringify(generate.mock.calls[0][0].user)).toContain('data:image/png;base64,AQID')
  })
  it('does not send image bytes after authority withdrawal or pre-cancellation', async () => {
    const generate = vi.fn(async () => null)
    await expect(createWindowsVisualGrounder(generate)({ ...input, cardId: 'alice', turnId: 'work', png: new Uint8Array([1]), assertCurrent: async () => { throw new Error('withdrawn') } })).rejects.toThrow('withdrawn')
    await expect(createWindowsVisualGrounder(generate)({ ...input, cardId: 'alice', turnId: 'work', png: new Uint8Array([1]), signal: AbortSignal.abort(), assertCurrent: async () => {} })).rejects.toThrow()
    expect(generate).not.toHaveBeenCalled()
  })
  it('refuses a changed actual provider before dispatch even when an older preview was approved', async () => {
    const sent = vi.fn()
    const generate = vi.fn(async (request: AlicizationMainGatewayTextProviderOptions) => {
      await request.beforeProviderRequest?.({ ...input.providerTarget, origin: 'https://another.example', routeHash: 'b'.repeat(64) })
      sent()
      return JSON.stringify({ locations: [location] })
    })
    await expect(createWindowsVisualGrounder(generate)({ ...input, cardId: 'alice', turnId: 'work', png: new Uint8Array([1]), assertCurrent: async () => {} })).rejects.toThrow('PROVIDER_TARGET_CHANGED')
    expect(sent).not.toHaveBeenCalled()
    expect(generate.mock.calls[0][0].agentTurnInput).toBeUndefined()
  })
})
