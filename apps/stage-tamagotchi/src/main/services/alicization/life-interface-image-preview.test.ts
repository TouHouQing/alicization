import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { buildLifeInterfaceImagePreview } from './life-interface-image-preview'

const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2i0AAAAASUVORK5CYII=', 'base64')
const sha256 = createHash('sha256').update(image).digest('hex')
describe('transient native window review preview', () => {
  it('binds a real PNG and bounded target marker without modifying the private source', () => {
    const actual = buildLifeInterfaceImagePreview({ png: image, sha256, markers: [{ x: 0, y: 0, label: '1' }] })
    expect(actual).toMatchObject({ width: 1, height: 1, sha256, markers: [{ x: 0, y: 0, label: '1' }] })
    expect(actual.dataUrl).toBe(`data:image/png;base64,${image.toString('base64')}`)
    expect(createHash('sha256').update(image).digest('hex')).toBe(sha256)
  })
  it('refuses a mismatched image hash and any non-PNG bytes', () => {
    expect(() => buildLifeInterfaceImagePreview({ png: image, sha256: 'a'.repeat(64), markers: [] })).toThrow('IMAGE_CHANGED')
    expect(() => buildLifeInterfaceImagePreview({ png: Buffer.from('<svg onload="untrusted"/>'.repeat(4)), sha256, markers: [] })).toThrow('IMAGE_CHANGED')
  })
  it.each([{ x: 1, y: 0, label: '1' }, { x: -1, y: 0, label: '1' }, { x: 0.5, y: 0, label: '1' }, { x: 0, y: 0, label: 'x'.repeat(81) }])('rejects markers outside the actual image %j', (point) => {
    expect(() => buildLifeInterfaceImagePreview({ png: image, sha256, markers: [point] })).toThrow('MARKERS_INVALID')
  })
  it('does not accept an unlimited sequence or an over-budget image', () => {
    expect(() => buildLifeInterfaceImagePreview({ png: image, sha256, markers: Array.from({ length: 3 }, () => ({ x: 0, y: 0, label: '1' })) })).toThrow('PREVIEW_INVALID')
    expect(() => buildLifeInterfaceImagePreview({ png: Buffer.alloc(4 * 1024 * 1024 + 1), sha256, markers: [] })).toThrow('PREVIEW_INVALID')
  })
})
