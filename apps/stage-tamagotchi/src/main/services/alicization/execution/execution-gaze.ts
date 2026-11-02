import type { AlicizationWorkAttentionTarget } from '@proj-alicization/stage-shared'

import type { LifeEffect } from '../../../../shared/life-contracts'
import type { VisualImagePoint } from './visual-window-geometry'

import { validateVisualWindowGeometry, visualPointToScreen } from './visual-window-geometry'

interface Point { x: number, y: number }
interface Rectangle extends Point { width: number, height: number }

/** Geometry is an ephemeral projection of an actual owned-window observation. */
export function executionGazeTarget(effect: LifeEffect, geometry: {
  screenToDipPoint: (point: Point) => Point
  displayAt: (point: Point) => Rectangle
}, now = Date.now()): AlicizationWorkAttentionTarget | null {
  if (effect.status !== 'settled' || effect.receipt?.outcome !== 'success' || !['tool.browser_read_page', 'tool.desktop_list_interactables', 'tool.desktop_locate_window'].includes(String(effect.payload.capabilityId)))
    return null
  const output = effect.receipt.output as Record<string, unknown> | null
  const visual = effect.payload.capabilityId === 'tool.desktop_locate_window'
  const observedAt = Number(visual ? output?.observedAt : effect.receipt.observedAt)
  if (!Number.isFinite(observedAt) || observedAt > now || observedAt + 3000 <= now)
    return null
  if (visual && (output?.coordinateSpace !== 'screen-physical' || observedAt > Number(effect.receipt.observedAt)))
    return null
  const bounds = output?.windowBounds as { left?: number, top?: number, width?: number, height?: number } | undefined
  if (!output || output.windowVisible !== true || !bounds || ![bounds.left, bounds.top, bounds.width, bounds.height].every(value => typeof value === 'number' && Number.isFinite(value)) || Number(bounds.width) <= 0 || Number(bounds.height) <= 0)
    return null
  let point = { x: Math.round(Number(bounds.left) + Number(bounds.width) / 2), y: Math.round(Number(bounds.top) + Number(bounds.height) / 2) }
  if (visual) {
    const first = Array.isArray(output.locations) ? output.locations[0] as Record<string, unknown> | undefined : undefined
    if (first?.index === 0 && first.state === 'unique' && typeof first.confidence === 'number' && first.confidence >= 0.9 && first.confidence <= 1 && first.point) {
      try {
        const snapshot = validateVisualWindowGeometry(output.geometry)
        if (['left', 'top', 'width', 'height'].some(key => snapshot.clientBounds[key as keyof typeof snapshot.clientBounds] !== bounds[key as keyof typeof bounds]))
          return null
        point = visualPointToScreen(first.point as VisualImagePoint, snapshot)
        if (point.x < Number(bounds.left) || point.y < Number(bounds.top) || point.x >= Number(bounds.left) + Number(bounds.width) || point.y >= Number(bounds.top) + Number(bounds.height))
          return null
      }
      catch { return null }
    }
  }
  if (!['screen-physical', 'screen-dip'].includes(String(output.coordinateSpace)))
    return null
  const target = output.coordinateSpace === 'screen-physical' ? geometry.screenToDipPoint(point) : point
  const display = geometry.displayAt(target)
  if (![target.x, target.y, display.x, display.y, display.width, display.height].every(Number.isFinite) || display.width <= 0 || display.height <= 0 || target.x < display.x || target.y < display.y || target.x >= display.x + display.width || target.y >= display.y + display.height)
    return null
  return { space: 'screen-dip', ...target, display: { ...display }, observationId: `observation:${effect.id}`, observedAt, expiresAt: observedAt + 3000 }
}
