import type { AlicizationSafetyPermissionRequest } from '../../../shared/eventa'
import type { LifeInterfaceRiskRequest } from './life-interface-risk'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

import * as v from 'valibot'

const actionSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('click'), button: v.picklist(['left', 'right', 'middle']) }),
  v.strictObject({ kind: v.literal('drag') }),
  v.strictObject({ kind: v.literal('scroll'), direction: v.picklist(['up', 'down']), notches: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(10)) }),
])

/** Only an approved bounded PNG enters the transient local review event. */
export function buildLifeInterfaceImagePreview(input: NonNullable<LifeInterfaceRiskRequest['imagePreview']>): NonNullable<AlicizationSafetyPermissionRequest['interfaceImagePreview']> {
  if (!(input.png instanceof Uint8Array) || input.png.byteLength < 33 || input.png.byteLength > 4 * 1024 * 1024 || !/^[a-f0-9]{64}$/u.test(input.sha256) || !Array.isArray(input.markers) || input.markers.length > 2)
    throw new Error('WINDOWS_VISUAL_PREVIEW_INVALID')
  const png = Buffer.from(input.png)
  try {
    if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || png.readUInt32BE(8) !== 13 || png.toString('ascii', 12, 16) !== 'IHDR' || createHash('sha256').update(png).digest('hex') !== input.sha256)
      throw new Error('WINDOWS_VISUAL_PREVIEW_IMAGE_CHANGED')
    const width = png.readUInt32BE(16)
    const height = png.readUInt32BE(20)
    if (width < 1 || height < 1 || width > 4096 || height > 4096 || input.markers.some(point => !Number.isInteger(point.x) || !Number.isInteger(point.y) || point.x < 0 || point.y < 0 || point.x >= width || point.y >= height || typeof point.label !== 'string' || !point.label || point.label.length > 80))
      throw new Error('WINDOWS_VISUAL_PREVIEW_MARKERS_INVALID')
    return { dataUrl: `data:image/png;base64,${png.toString('base64')}`, width, height, sha256: input.sha256, markers: input.markers.map(({ x, y, label }) => ({ x, y, label })), ...(input.action ? { action: v.parse(actionSchema, input.action) } : {}) }
  }
  finally { png.fill(0) }
}
