export interface LifeDailyNeedsEffect { id: string, fatigueRelief: number }

/** Effect IDs are persisted with the changed value in the same needs snapshot. */
export function applyLifeDailyNeedsEffects<T extends { fatigue: number, appliedDailyNeedsEffects?: string[] }>(state: T, effects: LifeDailyNeedsEffect[]): T {
  const applied = new Set(state.appliedDailyNeedsEffects ?? [])
  let fatigue = state.fatigue
  for (const effect of effects) {
    if (applied.has(effect.id))
      continue
    if (!effect.id.startsWith('daily:') || !Number.isFinite(effect.fatigueRelief) || effect.fatigueRelief < 0 || effect.fatigueRelief > 12)
      throw new Error('Daily needs effect is outside its bounded contract')
    fatigue = Math.max(0, fatigue - effect.fatigueRelief)
    applied.add(effect.id)
  }
  return { ...state, fatigue, appliedDailyNeedsEffects: [...applied].slice(-64) }
}
