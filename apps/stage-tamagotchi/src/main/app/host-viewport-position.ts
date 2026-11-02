import type { BrowserWindow, Rectangle } from 'electron'

type PositionedWindow = Pick<BrowserWindow, 'getBounds' | 'setBounds' | 'setPosition' | 'center'>

/** Bound QA placement before the OS call; move/show events arrive too late. */
export function installHostViewportPositionGuard(window: PositionedWindow, displays: () => Rectangle[]) {
  const nativeSetBounds = window.setBounds.bind(window)
  const contain = (requested: Partial<Rectangle>) => {
    const bounds = { ...window.getBounds(), ...requested }
    const visibleDisplays = displays()
    if (visibleDisplays.some(display => bounds.x < display.x + display.width && bounds.x + bounds.width > display.x && bounds.y < display.y + display.height && bounds.y + bounds.height > display.y))
      return { ...bounds, x: Math.min(0, ...visibleDisplays.map(display => display.x)) - bounds.width - 512, y: Math.min(0, ...visibleDisplays.map(display => display.y)) - bounds.height - 512 }
    return bounds
  }
  window.setBounds = (bounds, animate) => nativeSetBounds(contain(bounds), animate)
  window.setPosition = (x, y, animate) => window.setBounds({ x, y }, animate)
  window.center = () => window.setBounds({ x: -30000, y: -30000 })
}
