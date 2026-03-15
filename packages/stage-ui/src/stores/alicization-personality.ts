function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value))
    return min
  return Math.min(max, Math.max(min, value))
}

export interface PersonalityDelta {
  obedience: number
  liveliness: number
  sensibility: number
}

export function computePersonalityDelta(score: number, confidence: number) {
  const boundedScore = clamp(score, -1, 1)
  const boundedConfidence = clamp(confidence, 0, 1)
  if (Math.abs(boundedScore) < 0.25) {
    return {
      obedience: 0,
      liveliness: 0,
      sensibility: 0,
    } satisfies PersonalityDelta
  }

  const baseDelta = clamp(boundedScore * boundedConfidence * 0.02, -0.02, 0.02)
  const intensity = clamp(Math.abs(boundedScore), 0, 1)

  // NOTICE: Keep drift autonomous but smooth by distributing one sentiment signal
  // into three personality axes with different response curves.
  return {
    obedience: clamp(baseDelta * (0.85 - 0.15 * intensity), -0.02, 0.02),
    liveliness: clamp(baseDelta * (0.6 + 0.25 * intensity), -0.02, 0.02),
    sensibility: clamp(baseDelta * (0.7 + 0.2 * (1 - boundedConfidence)), -0.02, 0.02),
  } satisfies PersonalityDelta
}
