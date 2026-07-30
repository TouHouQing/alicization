import type {
  AlicizationRecallGovernorSnapshot,
  AlicizationSubconsciousFragmentSourceKind,
} from '../../../shared/eventa'

export interface AlicizationRecallFragmentBudget {
  recalledFragmentCap?: number
  recalledFragmentSourceBudget?: Array<{
    sourceKind: AlicizationSubconsciousFragmentSourceKind
    maxItems: number
  }>
}

function defaultSourceBudget(
  mode: AlicizationRecallGovernorSnapshot['mode'],
  restProtective: boolean,
): NonNullable<AlicizationRecallFragmentBudget['recalledFragmentSourceBudget']> {
  if (mode === 'self-continuity') {
    return restProtective
      ? [
          { sourceKind: 'dialogue-turn', maxItems: 1 },
          { sourceKind: 'autobiographical-episode', maxItems: 1 },
          { sourceKind: 'fact-ledger', maxItems: 1 },
          { sourceKind: 'reflection-ledger', maxItems: 1 },
          { sourceKind: 'mind-continuity', maxItems: 2 },
        ]
      : [
          { sourceKind: 'dialogue-turn', maxItems: 2 },
          { sourceKind: 'autobiographical-episode', maxItems: 2 },
          { sourceKind: 'fact-ledger', maxItems: 2 },
          { sourceKind: 'reflection-ledger', maxItems: 1 },
          { sourceKind: 'mind-continuity', maxItems: 2 },
        ]
  }

  if (mode === 'emotional-resonance') {
    return [
      { sourceKind: 'autobiographical-episode', maxItems: 1 },
      { sourceKind: 'reflection-ledger', maxItems: 2 },
      { sourceKind: 'dialogue-turn', maxItems: 1 },
      { sourceKind: 'fact-ledger', maxItems: 1 },
      { sourceKind: 'mind-continuity', maxItems: 1 },
      { sourceKind: 'dream-fragment', maxItems: 1 },
    ]
  }

  return []
}

export function resolveAlicizationRecallFragmentBudget(input: {
  mode: AlicizationRecallGovernorSnapshot['mode']
  recalledFragmentCap?: unknown
  recalledFragmentSourceBudget?: Array<{
    sourceKind: AlicizationSubconsciousFragmentSourceKind
    maxItems: number
  }>
  restProtective?: boolean
}): AlicizationRecallFragmentBudget {
  if (input.mode !== 'emotional-resonance' && input.mode !== 'self-continuity')
    return {}

  const rawCap = Number(input.recalledFragmentCap)
  const normalizedCap = Number.isFinite(rawCap) && rawCap > 0
    ? Math.min(8, Math.floor(rawCap))
    : input.mode === 'emotional-resonance'
      ? input.restProtective === true ? 2 : 3
      : 2
  const sourceBudget = input.recalledFragmentSourceBudget?.filter(item => item.maxItems > 0) ?? []

  return {
    recalledFragmentCap: normalizedCap,
    recalledFragmentSourceBudget: sourceBudget.length > 0
      ? sourceBudget
      : defaultSourceBudget(input.mode, input.restProtective === true),
  }
}
