import type { OrganicMemoryPromptContext } from './runtime-soul'

import { describe, expect, it } from 'vitest'

import { buildOrganicMemorySystemBlocks } from './runtime-organic-memory-prompt-blocks'

function buildContext(overrides: Partial<OrganicMemoryPromptContext> = {}): OrganicMemoryPromptContext {
  return {
    hostAttitude: '',
    coreIncarnation: '',
    activeThoughts: [],
    retrievedFacts: [],
    recalledFragments: [],
    ...overrides,
  }
}

describe('runtime-organic-memory-prompt-blocks', () => {
  it('requires downstream memoryClosureCausality memory identity when memory closure long-run advice is pending', () => {
    const context = buildContext({
      memoryTuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: Date.UTC(2026, 5, 1, 11, 0, 0),
        sourceReportAt: Date.UTC(2026, 5, 1, 10, 55, 0),
        focusDimensions: [
          'runtimeMemoryClosureLongRun',
          'runtimeMemoryClosureCausalIdentity',
          'runtimeMemoryClosureLaneCarry',
          'runtimeMemoryClosureIdentityContinuity',
          'runtimeSameHerMemoryCarry',
          'runtimeSameHerInitiativeExecutionCausality',
          'runtimeSameHerEmotionalCausality',
          'runtimeSameHerEmbodimentCausality',
        ],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0.12,
          temporalWindowBias: 0.1,
          wrongThreadPenalty: 0,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.14,
          delayUntilAfterPayoffBias: 0.12,
          provenanceLabelBias: 0.04,
          specificityClampBias: 0,
        },
        personStateAdjustments: {
          repairWindowBias: 0.08,
          closenessCapBias: 0.04,
        },
        notes: [
          'Replay memory closure long-run lacks downstream causal memory identity, so future closure must come from memoryClosureCausality.memoryIdentity instead of route-chain text or visible reply wording.',
          'Memory closure lane carry is missing across initiative/execution, emotion, and embodiment.',
          'Memory closure long-run broke stable memory identity across turns.',
        ],
      },
    })

    const systemText = buildOrganicMemorySystemBlocks(context).join('\n\n')

    expect(systemText).toContain('[ALICIZATION_MEMORY_TUNING_CAUSALITY]')
    expect(systemText).toContain('memory_closure_identity=required')
    expect(systemText).toContain('memoryClosureCausality.memoryIdentity')
    expect(systemText).toContain('proof_boundary=route-chain text and visible reply wording are not closure proof')
    expect(systemText).toContain('identity_continuity=preserve one stable memory identity key across recall, initiative, execution, emotion, and embodiment')
  })
})
