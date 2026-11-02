import type { VisualWindowGeometry } from './visual-window-geometry'
import type { WindowsPointerSnapshot } from './windows-pointer-types'
import type { WindowsVisualLocation } from './windows-visual-grounder'
import type { WindowsWindowIdentity } from './windows-window-identity'

import { Buffer } from 'node:buffer'
import { createHash, randomUUID } from 'node:crypto'

import * as v from 'valibot'

import { validateVisualWindowGeometry } from './visual-window-geometry'
import { windowsWindowIdentitySchema } from './windows-window-identity'

const hash = v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/u))
const scopeSchema = v.strictObject({ cardId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)), contextHash: hash })
export type VisualWindowObservationScope = v.InferOutput<typeof scopeSchema>
export interface VisualWindowCapture {
  owner: WindowsWindowIdentity
  geometry: VisualWindowGeometry
  png: Uint8Array
  observedAt: number
  native?: { authority: WindowsPointerSnapshot['authority'], locations: WindowsVisualLocation[], title: string }
}
export interface VisualWindowObservation {
  id: string
  owner: WindowsWindowIdentity
  geometry: VisualWindowGeometry
  imageSha256: string
  imageBytes: number
  observedAt: number
  expiresAt: number
}
interface PrivateObservation { scope: VisualWindowObservationScope, facts: VisualWindowObservation, png: Buffer, native?: VisualWindowCapture['native'], timer?: ReturnType<typeof setTimeout> }
const maximumImageBytes = 4 * 1024 * 1024
const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

/**
 * Desktop-owned ephemeral images only. Authority stays in the real action
 * permit and resource broker; possessing a screenshot is never input consent.
 */
export function createVisualWindowObservations(options: { now?: () => number, ttlMs?: number } = {}) {
  const now = options.now ?? Date.now
  const ttlMs = options.ttlMs ?? 60_000
  if (!Number.isSafeInteger(ttlMs) || ttlMs < 1000 || ttlMs > 60_000)
    throw new TypeError('WINDOWS_VISUAL_OBSERVATION_TTL_INVALID')
  const entries = new Map<string, PrivateObservation>()
  let ownerCardId: string | null = null
  let closed = false
  const destroy = (entry: PrivateObservation) => { clearTimeout(entry.timer); entry.png.fill(0) }
  function clear() {
    for (const entry of entries.values()) destroy(entry)
    entries.clear()
  }
  function prune() {
    const time = now()
    for (const [id, entry] of entries) {
      if (entry.facts.expiresAt <= time) {
        destroy(entry)
        entries.delete(id)
      }
    }
  }
  function requireEntry(id: string, scope: VisualWindowObservationScope) {
    v.parse(scopeSchema, scope)
    prune()
    const entry = entries.get(id)
    if (entry && entry.facts.observedAt > now()) {
      entries.delete(id)
      destroy(entry)
      throw new Error('WINDOWS_VISUAL_OBSERVATION_UNAVAILABLE')
    }
    if (closed || ownerCardId !== scope.cardId || !entry || entry.scope.cardId !== scope.cardId || entry.scope.contextHash !== scope.contextHash)
      throw new Error('WINDOWS_VISUAL_OBSERVATION_UNAVAILABLE')
    return entry
  }
  return {
    selectCard(cardId: string) {
      if (closed || typeof cardId !== 'string' || !cardId || cardId.length > 128)
        throw new Error('WINDOWS_VISUAL_OBSERVATION_OWNER_INVALID')
      if (ownerCardId !== cardId) {
        clear()
        ownerCardId = cardId
      }
    },
    admit(capture: VisualWindowCapture, scope: VisualWindowObservationScope): VisualWindowObservation {
      const verifiedScope = v.parse(scopeSchema, scope)
      if (closed || ownerCardId !== verifiedScope.cardId)
        throw new Error('WINDOWS_VISUAL_OBSERVATION_OWNER_INVALID')
      prune()
      const owner = v.parse(windowsWindowIdentitySchema, capture.owner)
      const geometry = validateVisualWindowGeometry(capture.geometry)
      if (!Number.isSafeInteger(capture.observedAt) || capture.observedAt < 0 || capture.observedAt > now() || capture.observedAt + ttlMs <= now())
        throw new Error('WINDOWS_VISUAL_OBSERVATION_TIME_INVALID')
      if (!(capture.png instanceof Uint8Array) || capture.png.byteLength < 33 || capture.png.byteLength > maximumImageBytes)
        throw new Error('WINDOWS_VISUAL_IMAGE_BYTES_INVALID')
      const png = Buffer.from(capture.png)
      if (!png.subarray(0, 8).equals(pngHeader) || png.readUInt32BE(8) !== 13 || png.toString('ascii', 12, 16) !== 'IHDR' || png.readUInt32BE(16) !== geometry.imageWidth || png.readUInt32BE(20) !== geometry.imageHeight) {
        png.fill(0)
        throw new Error('WINDOWS_VISUAL_IMAGE_HEADER_MISMATCH')
      }
      // Bound memory independently of model call frequency and TTL.
      while (entries.size >= 2) {
        const first = entries.keys().next().value!
        destroy(entries.get(first)!)
        entries.delete(first)
      }
      const facts: VisualWindowObservation = { id: `visual-window:${randomUUID()}`, owner: structuredClone(owner), geometry: structuredClone(geometry), imageSha256: createHash('sha256').update(png).digest('hex'), imageBytes: png.byteLength, observedAt: capture.observedAt, expiresAt: capture.observedAt + ttlMs }
      if (capture.native && Buffer.byteLength(JSON.stringify(capture.native)) > 16_384) {
        png.fill(0)
        throw new Error('WINDOWS_VISUAL_OBSERVATION_METADATA_BUDGET')
      }
      const entry: PrivateObservation = { scope: { ...verifiedScope }, facts, png, ...(capture.native ? { native: structuredClone(capture.native) } : {}) }
      entries.set(facts.id, entry)
      // A quiet companion must still release an unused image on time. The
      // elapsed timer also bounds retention if the host wall clock moves back.
      entry.timer = setTimeout(() => {
        if (entries.get(facts.id) === entry) {
          entries.delete(facts.id)
          destroy(entry)
        }
      }, Math.max(1, facts.expiresAt - now()))
      entry.timer.unref?.()
      return structuredClone(facts)
    },
    preview(id: string, scope: VisualWindowObservationScope) {
      const entry = requireEntry(id, scope)
      return { facts: structuredClone(entry.facts), png: Buffer.from(entry.png), native: structuredClone(entry.native) }
    },
    consume(id: string, scope: VisualWindowObservationScope) {
      const entry = requireEntry(id, scope)
      // Burn before approval/native waits. A denied, expired or interrupted
      // action needs a new real observation, never a replay of this image.
      entries.delete(id)
      const result = { facts: structuredClone(entry.facts), png: Buffer.from(entry.png), native: structuredClone(entry.native) }
      destroy(entry)
      return result
    },
    clear,
    dispose() { clear(); ownerCardId = null; closed = true },
  }
}
