function finite(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** Synthesis owns the queued request's style, rather than the playing segment. */
export function resolveSpeechRequestStyle(input: { metadata?: Record<string, unknown> | null, basePitch: number, baseRate: number }) {
  const raw = input.metadata?.speechSynthesis
  const captured = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const relative = captured.relativeToUserSettings === true
  const pitch = relative ? input.basePitch + finite(captured.pitchDelta, 0) : finite(captured.pitchDelta, input.basePitch)
  const speed = relative ? input.baseRate * finite(captured.rateMultiplier, 1) : finite(captured.rateMultiplier, input.baseRate)
  return {
    pitch: Math.max(-40, Math.min(40, finite(pitch, 0))),
    speed: Math.max(0.25, Math.min(4, finite(speed, 1))),
  }
}
