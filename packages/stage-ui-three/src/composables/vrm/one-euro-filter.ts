// Adapted from Project-N-E-K-O/N.E.K.O, Apache-2.0.
// Source: f2fea6de7149ef333422e61bafa4102d44f2cf2c/static/vrm/vrm-cursor-follow.js
// Changes: functional TypeScript API, bounded frame delta, finite input checks.
// The upstream license ships in desktop resources/licenses/neko-license.txt.
export function createOneEuroFilter(options: { minCutoff: number, beta: number, derivativeCutoff: number }) {
  let previous: number | null = null
  let derivative = 0
  const alpha = (delta: number, cutoff: number) => {
    const r = 2 * Math.PI * cutoff * delta
    return r / (r + 1)
  }
  return {
    reset() {
      previous = null
      derivative = 0
    },
    filter(value: number, frameDelta: number) {
      if (!Number.isFinite(value))
        return previous ?? 0
      if (previous === null) {
        previous = value
        return value
      }
      const delta = Number.isFinite(frameDelta) ? Math.min(0.1, Math.max(0, frameDelta)) : 0
      if (delta <= 0)
        return previous
      const derivativeAlpha = alpha(delta, options.derivativeCutoff)
      derivative += derivativeAlpha * ((value - previous) / delta - derivative)
      const cutoff = options.minCutoff + options.beta * Math.abs(derivative)
      previous += alpha(delta, cutoff) * (value - previous)
      return previous
    },
  }
}
