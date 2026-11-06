// Adapted from Project N.E.K.O. memory/evidence.py at
// 1ea9c88872a8a4f96bc431e1f98fdf903e2c8621. Copyright 2025-2026
// Project N.E.K.O. Team, Apache-2.0. See resources/licenses/neko-persona-notice.txt.

/** Separate clocks ensure a counterexample never renews positive evidence. */
export function effectivePersonaEvidence(strength: number, occurredAt: number, now: number, halfLifeDays: number) {
  if (![strength, occurredAt, now, halfLifeDays].every(Number.isFinite) || strength < 0 || halfLifeDays <= 0)
    throw new TypeError('Invalid personality evidence clock')
  return strength * 0.5 ** (Math.max(0, now - occurredAt) / (halfLifeDays * 86_400_000))
}

export function personaEvidenceStatus(input: { support: number, opposition: number, independentEvents: number, distinctDays: number, successfulTrials: number, failedTrials: number, firstEvidenceAt: number }, now: number) {
  if ((input.opposition >= input.support * 0.5 && input.opposition >= 0.6) || input.failedTrials > 0)
    return 'disputed' as const
  if (input.independentEvents >= 8 && input.distinctDays >= 7 && now - input.firstEvidenceAt >= 6 * 86_400_000 && input.successfulTrials >= 3 && input.support - input.opposition >= 3)
    return 'mature' as const
  if (input.independentEvents >= 3 && input.distinctDays >= 2 && input.support - input.opposition >= 1)
    return 'supported' as const
  return 'exploring' as const
}
