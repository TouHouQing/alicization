import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type { OrganicMemoryPromptContext } from './runtime-soul'

export interface RuntimeMemoryGovernanceReducerInput {
  governance: AlicizationMindTurnGovernance | null
  context: OrganicMemoryPromptContext
  applyMemoryDeliberationToGovernance: (input: {
    governance: AlicizationMindTurnGovernance | null
    context: OrganicMemoryPromptContext
  }) => AlicizationMindTurnGovernance | null
}

export function reduceRuntimeMemoryGovernance(input: RuntimeMemoryGovernanceReducerInput) {
  return input.applyMemoryDeliberationToGovernance({
    governance: input.governance,
    context: input.context,
  })
}
