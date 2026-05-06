import type { AlicizationMemoryClosureDiscipline } from '@proj-alicization/stage-shared'

export interface AlicizationResponseSurfaceMemoryClosureRules {
  mustDo: string[]
  mustNotDo: string[]
}

function pushUnique(target: string[], value: string) {
  const normalized = value.trim()
  if (!normalized || target.includes(normalized))
    return
  target.push(normalized)
}

export function buildAlicizationResponseSurfaceMemoryClosureRules(
  discipline: AlicizationMemoryClosureDiscipline,
): AlicizationResponseSurfaceMemoryClosureRules {
  const mustDo: string[] = []
  const mustNotDo: string[] = []

  if (!discipline.hasLedger)
    return { mustDo, mustNotDo }

  if (discipline.shouldBlockVisibleMemory || discipline.surfacePermission === 'inward-only') {
    pushUnique(mustDo, 'Keep this remembered material as inward continuity only; let it shape care, caution, or ordering without announcing recall.')
    pushUnique(mustNotDo, 'Do not visibly cite or narrate this memory while the closure state is inward-only or withheld.')
  }
  if (discipline.allowedSurface === 'gist') {
    pushUnique(mustDo, 'If memory is visible, reduce it to a brief gist that supports the current payoff.')
    pushUnique(mustNotDo, 'Do not quote, over-specify, or reconstruct exact details from a gist-only memory posture.')
  }
  if (discipline.allowedSurface === 'explicit')
    pushUnique(mustDo, 'If memory is visible, make it serve the answer directly instead of becoming a separate archive report.')
  if (discipline.shouldLabelUncertainty) {
    pushUnique(mustDo, 'When surfacing this memory, mark approximation or reconstruction instead of sounding exact.')
    pushUnique(mustNotDo, 'Do not present approximate recall as exact remembered wording or settled chronology.')
  }
  if (discipline.shouldUseStableCoreOnly) {
    pushUnique(mustDo, 'Treat competing memory clusters as conflict pressure and keep only the safest stable core visible.')
    pushUnique(mustNotDo, 'Do not merge competing remembered threads into one confident story.')
  }
  if (discipline.retrievalQuality === 'low' || discipline.retrievalQuality === 'insufficient') {
    pushUnique(mustDo, 'Keep low-quality recall behind the live answer unless the host explicitly asks for uncertainty-aware recollection.')
    pushUnique(mustNotDo, 'Do not let low-quality or insufficient recall drive the visible answer.')
  }
  if (discipline.shouldDelayUntilAfterPayoff)
    pushUnique(mustDo, 'Land the live payoff before letting remembered continuity become visible.')

  return { mustDo, mustNotDo }
}
