import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type { AlicizationMemoryTurnArtifact } from './memory-os/memory-turn-artifact'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { reduceRuntimeMemoryGovernance } from './runtime-memory-governor'
import { applyMemoryTurnGateToGovernance } from './runtime-memory-turn-gate-governor'

interface RuntimeReplyAuthorityGovernorInput {
  governance: AlicizationMindTurnGovernance | null
  context: OrganicMemoryPromptContext
  memoryTurnArtifact?: AlicizationMemoryTurnArtifact | null
  now: number
  applyMemoryDeliberationToGovernance: (input: {
    governance: AlicizationMindTurnGovernance | null
    context: OrganicMemoryPromptContext
  }) => AlicizationMindTurnGovernance | null
  applyHostPersonModelToGovernance: (input: {
    now: number
    governance: AlicizationMindTurnGovernance | null
    context: OrganicMemoryPromptContext
  }) => AlicizationMindTurnGovernance | null
  applyRecollectionSurfaceRules: (governance: AlicizationMindTurnGovernance | null) => AlicizationMindTurnGovernance | null
}

export function forceProviderMindVisibleReplyAuthority(
  governance: AlicizationMindTurnGovernance | null,
) {
  return governance
    ? {
        ...governance,
        visibleReplyAuthority: 'llm-mind' as const,
      }
    : null
}

export function deriveRuntimeReplyAuthorityGovernance(
  input: RuntimeReplyAuthorityGovernorInput,
) {
  const effectiveMindTurnGovernanceWithRecollection = applyMemoryTurnGateToGovernance({
    governance: reduceRuntimeMemoryGovernance({
      governance: input.governance,
      context: input.context,
      applyMemoryDeliberationToGovernance: input.applyMemoryDeliberationToGovernance,
      applyRecollectionSurfaceRules: input.applyRecollectionSurfaceRules,
    }),
    memoryTurnArtifact: input.memoryTurnArtifact ?? null,
  })
  const sociallyShapedGovernance = input.applyHostPersonModelToGovernance({
    now: input.now,
    governance: effectiveMindTurnGovernanceWithRecollection,
    context: input.context,
  })
  return {
    effectiveMindTurnGovernanceWithRecollection,
    llmMindAuthorityGovernance: forceProviderMindVisibleReplyAuthority(sociallyShapedGovernance),
  }
}
