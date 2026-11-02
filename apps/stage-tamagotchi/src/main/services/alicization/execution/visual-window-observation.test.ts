import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

import { afterEach, expect, it, vi } from 'vitest'

import { createVisualWindowObservations } from './visual-window-observation'

const scope = { cardId: 'alice', contextHash: 'a'.repeat(64) }
function capture() {
  // This cache unit does not decode pixels. Native capture integration must
  // independently supply a real decoded PNG; here only header/ownership varies.
  const png = Buffer.alloc(33)
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png)
  png.writeUInt32BE(13, 8); png.write('IHDR', 12, 'ascii')
  png.writeUInt32BE(400, 16); png.writeUInt32BE(300, 20)
  return {
    owner: { windowId: '1234', processId: 200, processStartTicks: '638500000000000000', windowClass: 'OwnedCanvas', desktop: 'Default' },
    geometry: { coordinateSpace: 'screen-physical' as const, clientBounds: { left: 100, top: 200, width: 800, height: 600 }, virtualScreen: { left: 0, top: 0, width: 1920, height: 1080 }, displays: [{ left: 0, top: 0, width: 1920, height: 1080 }], imageWidth: 400, imageHeight: 300, dpiX: 144, dpiY: 144 },
    png,
    observedAt: Date.now(),
  }
}
const active: Array<ReturnType<typeof createVisualWindowObservations>> = []
function observations() {
  const registry = createVisualWindowObservations()
  active.push(registry)
  registry.selectCard('alice')
  return registry
}
afterEach(() => {
  for (const registry of active.splice(0)) registry.dispose()
  vi.useRealTimers()
})

it('keeps image bytes private and binds public facts to the actual supplied identity', () => {
  const registry = observations()
  const input = capture()
  const digest = createHash('sha256').update(input.png).digest('hex')
  const facts = registry.admit(input, scope)
  expect(facts).toMatchObject({ owner: input.owner, geometry: input.geometry, imageSha256: digest, imageBytes: 33, observedAt: input.observedAt, expiresAt: input.observedAt + 60000 })
  expect(facts.id).toMatch(/^visual-window:[a-f\d-]{36}$/u)
  expect(facts).not.toHaveProperty('png')
  input.png.fill(0)
  input.owner.windowId = '9999'
  const preview = registry.preview(facts.id, scope)
  expect(createHash('sha256').update(preview.png).digest('hex')).toBe(digest)
  expect(preview.facts.owner.windowId).toBe('1234')
  preview.png.fill(0); preview.facts.geometry.clientBounds.left = -9999
  expect(registry.preview(facts.id, scope).facts.geometry.clientBounds.left).toBe(100)
})

it('refuses another card, another root context, or a malformed context without burning the original', () => {
  const registry = observations()
  const facts = registry.admit(capture(), scope)
  expect(() => registry.consume(facts.id, { ...scope, cardId: 'bob' })).toThrow('UNAVAILABLE')
  expect(() => registry.consume(facts.id, { ...scope, contextHash: 'b'.repeat(64) })).toThrow('UNAVAILABLE')
  expect(() => registry.consume(facts.id, { ...scope, contextHash: 'model-supplied-window-id' })).toThrow()
  expect(registry.consume(facts.id, scope).facts.id).toBe(facts.id)
})

it('burns one observation before asynchronous confirmation or native input', () => {
  const registry = observations()
  const facts = registry.admit(capture(), scope)
  const first = registry.consume(facts.id, scope)
  expect(first.facts.imageSha256).toBe(facts.imageSha256)
  expect(() => registry.consume(facts.id, scope)).toThrow('UNAVAILABLE')
  expect(() => registry.preview(facts.id, scope)).toThrow('UNAVAILABLE')
})

it('never revives a previous card image after selecting the card again', () => {
  const registry = observations()
  const first = registry.admit(capture(), scope)
  registry.selectCard('bob'); registry.selectCard('alice')
  expect(() => registry.preview(first.id, scope)).toThrow('UNAVAILABLE')
  expect(() => registry.admit(capture(), { ...scope, cardId: 'bob' })).toThrow('OWNER_INVALID')
})

it('limits retained observations independently of TTL and model call count', () => {
  const registry = observations()
  const first = registry.admit(capture(), scope)
  const second = registry.admit(capture(), scope)
  const third = registry.admit(capture(), scope)
  expect(() => registry.preview(first.id, scope)).toThrow('UNAVAILABLE')
  expect(registry.preview(second.id, scope).facts.id).toBe(second.id)
  expect(registry.preview(third.id, scope).facts.id).toBe(third.id)
})

it('expires an unused image while idle and clears its timer', async () => {
  vi.useFakeTimers(); vi.setSystemTime(100000)
  const registry = observations()
  const facts = registry.admit(capture(), scope)
  expect(vi.getTimerCount()).toBe(1)
  await vi.advanceTimersByTimeAsync(60000)
  expect(vi.getTimerCount()).toBe(0)
  expect(() => registry.preview(facts.id, scope)).toThrow('UNAVAILABLE')
})

it('bounds idle retention even if the wall clock moves backward', async () => {
  vi.useFakeTimers(); vi.setSystemTime(100000)
  const registry = observations()
  const facts = registry.admit(capture(), scope)
  vi.setSystemTime(50000)
  await vi.advanceTimersByTimeAsync(60000)
  expect(() => registry.preview(facts.id, scope)).toThrow('UNAVAILABLE')
})

it('rejects future or already expired captures, mismatched images and malformed owners', () => {
  vi.useFakeTimers(); vi.setSystemTime(100000)
  const registry = observations()
  expect(() => registry.admit({ ...capture(), observedAt: 100001 }, scope)).toThrow('TIME_INVALID')
  expect(() => registry.admit({ ...capture(), observedAt: 40000 }, scope)).toThrow('TIME_INVALID')
  expect(() => registry.admit({ ...capture(), png: Buffer.alloc(32) }, scope)).toThrow('BYTES_INVALID')
  expect(() => registry.admit({ ...capture(), png: Buffer.alloc(4 * 1024 * 1024 + 1) }, scope)).toThrow('BYTES_INVALID')
  const wrongSize = capture(); wrongSize.png.writeUInt32BE(1, 16)
  expect(() => registry.admit(wrongSize, scope)).toThrow('HEADER_MISMATCH')
  const wrongOwner = capture(); wrongOwner.owner.processStartTicks = 'new-process'
  expect(() => registry.admit(wrongOwner, scope)).toThrow()
})

it('disposes every pending image and refuses delayed captures after shutdown', () => {
  const registry = observations()
  const facts = registry.admit(capture(), scope)
  registry.dispose()
  expect(() => registry.preview(facts.id, scope)).toThrow('UNAVAILABLE')
  expect(() => registry.admit(capture(), scope)).toThrow('OWNER_INVALID')
  expect(() => registry.selectCard('alice')).toThrow('OWNER_INVALID')
})
