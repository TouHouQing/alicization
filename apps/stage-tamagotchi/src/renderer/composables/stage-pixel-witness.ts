interface Bounds { left: number, top: number, width: number, height: number }
interface Region { data: ArrayLike<number> }

// A positive alpha witness certifies rendered pixels. Sparse sampling cannot
// certify an empty character, so misses and read failures remain unknown.
export function readStagePixelWitness(input: {
  mounted: boolean
  bounds: Bounds | null
  readRegion: (x: number, y: number) => Region | null
}): 'visible' | 'unknown' {
  const bounds = input.bounds
  if (!input.mounted || !bounds || bounds.width <= 0 || bounds.height <= 0)
    return 'unknown'
  const points = [[0.5, 0.5], [0.35, 0.35], [0.65, 0.35], [0.35, 0.7], [0.65, 0.7]]
  for (const [x, y] of points) {
    try {
      const region = input.readRegion(bounds.left + bounds.width * x, bounds.top + bounds.height * y)
      if (!region || region.data.length > 4096)
        continue
      for (let offset = 3; offset < region.data.length; offset += 4) {
        if (region.data[offset] >= 16)
          return 'visible'
      }
    }
    catch { /* A lost renderer context is not evidence of visible pixels. */ }
  }
  return 'unknown'
}

export function readLive2dCanvasPixel(canvas: HTMLCanvasElement, x: number, y: number): Region | null {
  const bounds = canvas.getBoundingClientRect()
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
  if (!gl || !bounds.width || !bounds.height || gl.isContextLost())
    return null
  const px = Math.floor((x - bounds.left) * gl.drawingBufferWidth / bounds.width)
  const py = Math.floor(gl.drawingBufferHeight - 1 - (y - bounds.top) * gl.drawingBufferHeight / bounds.height)
  if (px < 0 || py < 0 || px >= gl.drawingBufferWidth || py >= gl.drawingBufferHeight)
    return null
  const data = new Uint8Array(4)
  gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, data)
  return { data }
}
