interface GazePoint { x: number, y: number }

/** A parked cursor is not a new attention request on every reactive render. */
export function createLive2DGazeInput() {
  let lastExternalPoint: GazePoint | undefined
  let localUntil = Number.NEGATIVE_INFINITY
  let holdUntil = Number.NEGATIVE_INFINITY

  function observe(point: GazePoint, now: number, source: 'local' | 'external') {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(now))
      return false
    if (source === 'external') {
      const previous = lastExternalPoint
      lastExternalPoint = { ...point }
      if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 1)
        return false
      if (now < localUntil)
        return false
    }
    else {
      localUntil = now + 0.7
    }
    holdUntil = now + 1.6
    return true
  }

  return {
    observe,
    get holdUntil() { return holdUntil },
    reset: () => {
      lastExternalPoint = undefined
      localUntil = Number.NEGATIVE_INFINITY
      holdUntil = Number.NEGATIVE_INFINITY
    },
  }
}
