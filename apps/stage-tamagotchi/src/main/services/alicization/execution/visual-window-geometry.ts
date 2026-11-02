import * as v from 'valibot'

const coordinate = v.pipe(v.number(), v.integer(), v.minValue(-131072), v.maxValue(131072))
const size = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(32768))
const rectangle = v.strictObject({ left: coordinate, top: coordinate, width: size, height: size })
export const visualWindowGeometrySchema = v.strictObject({
  coordinateSpace: v.literal('screen-physical'),
  clientBounds: rectangle,
  virtualScreen: rectangle,
  displays: v.pipe(v.array(rectangle), v.minLength(1), v.maxLength(16)),
  imageWidth: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(4096)),
  imageHeight: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(4096)),
  dpiX: v.pipe(v.number(), v.integer(), v.minValue(48), v.maxValue(768)),
  dpiY: v.pipe(v.number(), v.integer(), v.minValue(48), v.maxValue(768)),
})
export type VisualWindowGeometry = v.InferOutput<typeof visualWindowGeometrySchema>
export interface VisualImagePoint { space: 'image-pixel' | 'image-normalized', x: number, y: number }
export interface VisualScreenPoint { x: number, y: number }

function contains(rect: VisualWindowGeometry['clientBounds'], point: VisualScreenPoint) {
  return point.x >= rect.left && point.y >= rect.top && point.x < rect.left + rect.width && point.y < rect.top + rect.height
}

export function validateVisualWindowGeometry(input: unknown): VisualWindowGeometry {
  const geometry = v.parse(visualWindowGeometrySchema, input)
  const virtual = geometry.virtualScreen
  const withinVirtual = (rect: typeof virtual) => rect.left >= virtual.left && rect.top >= virtual.top && rect.left + rect.width <= virtual.left + virtual.width && rect.top + rect.height <= virtual.top + virtual.height
  if (geometry.displays.some(display => !withinVirtual(display)))
    throw new Error('WINDOWS_VISUAL_DISPLAY_GEOMETRY_INVALID')
  // A downscaled screenshot preserves the client aspect ratio within rounding.
  const { clientBounds: client, imageWidth: width, imageHeight: height } = geometry
  if (Math.abs(width * client.height - height * client.width) > client.width + client.height)
    throw new Error('WINDOWS_VISUAL_IMAGE_GEOMETRY_MISMATCH')
  return geometry
}

/** Image units never inherit desktop DPI. Native observations already use pixels. */
export function visualPointToScreen(input: VisualImagePoint, snapshot: VisualWindowGeometry): VisualScreenPoint {
  const geometry = validateVisualWindowGeometry(snapshot)
  if (!input || !['image-pixel', 'image-normalized'].includes(input.space) || !Number.isFinite(input.x) || !Number.isFinite(input.y))
    throw new Error('WINDOWS_VISUAL_POINT_INVALID')
  const normalized = input.space === 'image-normalized'
  const maximumX = normalized ? 1 : geometry.imageWidth - 1
  const maximumY = normalized ? 1 : geometry.imageHeight - 1
  if (input.x < 0 || input.y < 0 || input.x > maximumX || input.y > maximumY || (!normalized && (!Number.isInteger(input.x) || !Number.isInteger(input.y))))
    throw new Error('WINDOWS_VISUAL_POINT_OUTSIDE_IMAGE')
  const { clientBounds: client } = geometry
  // Multiply the integer pixel-center numerator before dividing. Dividing
  // first can turn an exact 201 into 200.99999999999997 and lose one pixel.
  const axis = (value: number, imageSize: number, clientSize: number) => Math.min(clientSize - 1, Math.floor(normalized ? value * clientSize : ((2 * value + 1) * clientSize) / (2 * imageSize)))
  const point = {
    x: client.left + axis(input.x, geometry.imageWidth, client.width),
    y: client.top + axis(input.y, geometry.imageHeight, client.height),
  }
  if (!contains(client, point) || !contains(geometry.virtualScreen, point) || !geometry.displays.some(display => contains(display, point)))
    throw new Error('WINDOWS_VISUAL_POINT_OUTSIDE_VISIBLE_DISPLAY')
  return point
}

/**
 * Absolute input uses the entire virtual desktop. Round upward into the
 * requested pixel and avoid absolute zero (Windows 10 workaround verified in
 * Chromium ui/base/win/event_creation_utils.cc, blob e67fec2f7e038a4fb1a2bbfdf840d12b0a3d58d1).
 */
export function visualPointToAbsolute(point: VisualScreenPoint, snapshot: VisualWindowGeometry) {
  const geometry = validateVisualWindowGeometry(snapshot)
  if (![point.x, point.y].every(Number.isSafeInteger) || !contains(geometry.clientBounds, point) || !contains(geometry.virtualScreen, point) || !geometry.displays.some(display => contains(display, point)))
    throw new Error('WINDOWS_VISUAL_ABSOLUTE_POINT_INVALID')
  const virtual = geometry.virtualScreen
  const axis = (position: number, origin: number, length: number) => Math.max(1, Math.ceil((position - origin) * 65536 / length))
  return {
    x: axis(point.x, virtual.left, virtual.width),
    y: axis(point.y, virtual.top, virtual.height),
  }
}

/** Compile the complete bounded route before acquiring any native input. */
export function compileVisualDrag(from: VisualImagePoint, to: VisualImagePoint, snapshot: VisualWindowGeometry, steps = 16) {
  if (!Number.isSafeInteger(steps) || steps < 2 || steps > 32)
    throw new Error('WINDOWS_VISUAL_DRAG_BUDGET')
  const start = visualPointToScreen(from, snapshot)
  const end = visualPointToScreen(to, snapshot)
  if (start.x === end.x && start.y === end.y)
    throw new Error('WINDOWS_VISUAL_DRAG_ZERO_DISTANCE')
  // Check every physical-pixel transition, not only the eventual event sample
  // points. A narrow gap must not disappear between two emitted moves.
  const transitions = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y))
  for (let index = 0; index <= transitions; index++) {
    const fraction = index / transitions
    const physical = { x: Math.round(start.x + (end.x - start.x) * fraction), y: Math.round(start.y + (end.y - start.y) * fraction) }
    if (!snapshot.displays.some(display => contains(display, physical)))
      throw new Error('WINDOWS_VISUAL_DRAG_CROSSES_DISPLAY_GAP')
  }
  return Array.from({ length: steps + 1 }, (_, index) => {
    const fraction = index / steps
    const physical = { x: Math.round(start.x + (end.x - start.x) * fraction), y: Math.round(start.y + (end.y - start.y) * fraction) }
    return { physical, absolute: visualPointToAbsolute(physical, snapshot) }
  })
}
