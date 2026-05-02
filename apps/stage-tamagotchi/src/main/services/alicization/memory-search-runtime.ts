import type { CreateAlicizationOrganicMemoryPromptRuntimeOptions } from './runtime-organic-memory-prompt'

import { buildMemoryRecollectionIntent } from './memory-recollection-intent'
import {
  buildRecallGovernor,
  buildRecallGovernorSystemBlock,
} from './recall-governor'
import { createAlicizationOrganicMemoryPromptRuntime } from './runtime-organic-memory-prompt'

export interface CreateAlicizationMemorySearchRuntimeOptions {
  organicMemoryPrompt: CreateAlicizationOrganicMemoryPromptRuntimeOptions
}

export const buildTurnRecallGovernor = buildRecallGovernor
export const buildMemorySearchGovernorSystemBlock = buildRecallGovernorSystemBlock
export const buildHeuristicRecollectionIntent = buildMemoryRecollectionIntent

// Centralize turn-time memory search entry so the runtime calls one façade
// instead of reaching into recall-governor and organic prompt internals
// independently. The underlying algorithms stay split for now, but external
// callers should use this module as the single authority boundary.
export function createAlicizationMemorySearchRuntime(
  options: CreateAlicizationMemorySearchRuntimeOptions,
) {
  const organicMemoryPromptRuntime = createAlicizationOrganicMemoryPromptRuntime(
    options.organicMemoryPrompt,
  )

  return {
    buildTurnRecallGovernor,
    buildRecallGovernorSystemBlock: buildMemorySearchGovernorSystemBlock,
    buildHeuristicRecollectionIntent,
    ...organicMemoryPromptRuntime,
  }
}

export type AlicizationMemorySearchRuntime = ReturnType<typeof createAlicizationMemorySearchRuntime>
