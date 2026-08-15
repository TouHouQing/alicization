import type { AlicizationSubconsciousFragmentSourceKind } from '../../../shared/eventa'

// `dialogue-turn` remains in the persisted union for legacy database rows only.
// Raw conversation text belongs to WorkingMemory, not durable subconscious memory.
export function isRawDialogueTranscriptSubconsciousSource(
  sourceKind: AlicizationSubconsciousFragmentSourceKind,
) {
  return sourceKind === 'dialogue-turn'
}
