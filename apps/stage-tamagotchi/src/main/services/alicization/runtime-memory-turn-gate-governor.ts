import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type { AlicizationMemoryTurnArtifact } from './memory-os/memory-turn-artifact'

export function applyMemoryTurnGateToGovernance(input: {
  governance: AlicizationMindTurnGovernance | null
  memoryTurnArtifact?: AlicizationMemoryTurnArtifact | null
}): AlicizationMindTurnGovernance | null {
  void input.memoryTurnArtifact
  return input.governance
}
