import type { AlicizationActivityPresence } from '@proj-alicization/stage-shared'

export interface StageExecutionGazeGeometry {
  screenOrigin: { x: number, y: number }
  anchor: { x: number, y: number }
  stage: { width: number, height: number }
  visible: boolean
}

/** Convert an actual same-display target into a restrained local look point. */
export function projectStageExecutionGaze(activity: AlicizationActivityPresence | null, geometry: StageExecutionGazeGeometry | null | undefined, now: number) {
  const target = activity?.work?.target
  if (!activity || !['working', 'verifying'].includes(activity.phase) || !target || !target.display || !geometry?.visible || target.space !== 'screen-dip' || !target.observationId || target.observedAt > now || target.expiresAt <= now || target.expiresAt - target.observedAt > 3000)
    return null
  const { display } = target
  const { anchor, screenOrigin, stage } = geometry
  if (![target.x, target.y, target.observedAt, target.expiresAt, display.x, display.y, display.width, display.height, anchor.x, anchor.y, screenOrigin.x, screenOrigin.y, stage.width, stage.height].every(Number.isFinite) || stage.width <= 0 || stage.height <= 0 || display.width <= 0 || display.height <= 0)
    return null
  const eye = { x: screenOrigin.x + anchor.x, y: screenOrigin.y + anchor.y }
  const inside = (point: { x: number, y: number }) => point.x >= display.x && point.x < display.x + display.width && point.y >= display.y && point.y < display.y + display.height
  if (!inside(eye) || !inside(target))
    return null
  // The target is attention, not a command to twist the body across the screen.
  const clamp = (value: number) => Math.max(-1, Math.min(1, value))
  return { x: anchor.x + stage.width * 0.12 * clamp((target.x - eye.x) / (display.width / 2)), y: anchor.y + stage.height * 0.08 * clamp((target.y - eye.y) / (display.height / 2)) }
}
