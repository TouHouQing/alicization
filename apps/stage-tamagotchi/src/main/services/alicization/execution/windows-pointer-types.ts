import type { VisualImagePoint, VisualWindowGeometry } from './visual-window-geometry'
import type { WindowsVisualAuthority } from './windows-visual-authority'
import type { WindowsWindowIdentity } from './windows-window-identity'

import * as v from 'valibot'

import { compileVisualDrag, validateVisualWindowGeometry, visualPointToScreen } from './visual-window-geometry'
import { windowsVisualAuthoritySchema } from './windows-visual-authority'
import { windowsWindowIdentitySchema } from './windows-window-identity'

const point = v.strictObject({ space: v.picklist(['image-pixel', 'image-normalized']), x: v.number(), y: v.number() })
export const windowsPointerActionSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('click'), button: v.picklist(['left', 'right', 'middle']), point }),
  v.strictObject({ kind: v.literal('drag'), from: point, to: point }),
  v.strictObject({ kind: v.literal('scroll'), point, direction: v.picklist(['up', 'down']), notches: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(10)) }),
])
export type WindowsPointerAction = v.InferOutput<typeof windowsPointerActionSchema>
export interface WindowsPointerSnapshot {
  owner: WindowsWindowIdentity
  authority: WindowsVisualAuthority
  geometry: VisualWindowGeometry
  imageSha256: string
}
export function compileWindowsPointerAction(input: WindowsPointerAction, geometry: VisualWindowGeometry) {
  const action = v.parse(windowsPointerActionSchema, input)
  const actual = validateVisualWindowGeometry(geometry)
  const physical = (point: VisualImagePoint) => visualPointToScreen(point, actual)
  const points = action.kind === 'drag' ? compileVisualDrag(action.from, action.to, actual).map(item => item.physical) : [physical(action.point)]
  const button = action.kind === 'drag' ? 'left' : action.kind === 'click' ? action.button : 'none'
  return {
    action: { kind: action.kind, button, points, wheel: action.kind === 'scroll' ? action.notches * (action.direction === 'up' ? 120 : -120) : 0 },
    buttons: button === 'left' ? [1] : button === 'right' ? [2] : button === 'middle' ? [4] : [],
    expectedEvents: action.kind === 'scroll' ? 2 : points.length + 2,
  }
}
export function validateWindowsPointerSnapshot(input: WindowsPointerSnapshot) {
  return {
    owner: v.parse(windowsWindowIdentitySchema, input.owner),
    authority: v.parse(windowsVisualAuthoritySchema, input.authority),
    geometry: validateVisualWindowGeometry(input.geometry),
    imageSha256: v.parse(v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/u)), input.imageSha256),
  }
}
