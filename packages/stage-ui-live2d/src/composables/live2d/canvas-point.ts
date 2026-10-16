export function mapLive2DClientPoint(
  clientX: number,
  clientY: number,
  canvas: { left: number, top: number, width: number, height: number },
  renderer: { width: number, height: number },
) {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY) || canvas.width <= 0 || canvas.height <= 0)
    return null
  return {
    x: (clientX - canvas.left) * renderer.width / canvas.width,
    y: (clientY - canvas.top) * renderer.height / canvas.height,
  }
}

export function hitLive2DRenderedPoint(
  point: { x: number, y: number },
  renderer: { width: number, height: number },
  buffer: { width: number, height: number },
  readAlpha: (x: number, y: number) => number,
) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.y < 0 || point.x >= renderer.width || point.y >= renderer.height || buffer.width <= 0 || buffer.height <= 0)
    return false
  const x = Math.floor(point.x * buffer.width / renderer.width)
  const y = buffer.height - 1 - Math.floor(point.y * buffer.height / renderer.height)
  return readAlpha(x, y) > 64
}
