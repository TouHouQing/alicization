interface Bounds { x: number, y: number, width: number, height: number }
interface NativeSurface {
  isDestroyed: () => boolean
  isVisible: () => boolean
  isMinimized: () => boolean
  getOpacity: () => number
  getBounds: () => Bounds
}
export function isNativeSurfaceVisible(window: NativeSurface | null, displays: readonly { bounds: Bounds }[]) {
  try {
    if (!window || window.isDestroyed() || !window.isVisible() || window.isMinimized() || window.getOpacity() <= 0)
      return false
    const bounds = window.getBounds()
    return bounds.width > 0 && bounds.height > 0 && displays.some(display => Math.max(bounds.x, display.bounds.x) < Math.min(bounds.x + bounds.width, display.bounds.x + display.bounds.width) && Math.max(bounds.y, display.bounds.y) < Math.min(bounds.y + bounds.height, display.bounds.y + display.bounds.height))
  }
  catch { return false }
}
