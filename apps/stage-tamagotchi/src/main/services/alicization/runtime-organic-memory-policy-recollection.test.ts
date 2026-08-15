import type { CreateAlicizationOrganicMemoryPromptRuntimeOptions } from './runtime-organic-memory-prompt'

import { describe, expect, it, vi } from 'vitest'

import { buildAlicizationTurnRetrievalPolicySnapshot } from './memory-accessibility-runtime'
import { createAlicizationOrganicMemoryPromptRuntime } from './runtime-organic-memory-prompt'

describe('runtime-organic-memory-policy-recollection', () => {
  it('keeps rejected session-mirror foreground out of retrieval policy planning', async () => {
    const resolveTurnRetrievalPolicySnapshot = vi.fn(async (
      input: Parameters<NonNullable<CreateAlicizationOrganicMemoryPromptRuntimeOptions['resolveTurnRetrievalPolicySnapshot']>>[0],
    ) => buildAlicizationTurnRetrievalPolicySnapshot({
      recallSeed: input.recallSeed,
      recallGovernor: input.recallGovernor ?? null,
      budgetClass: input.budgetClass,
      telemetry: null,
      tuningAdvice: null,
    }))
    const runtime = createAlicizationOrganicMemoryPromptRuntime({
      normalizeOrganicRecallText: raw => raw.trim().toLowerCase(),
      selectPromptActiveThoughts: ({ activeThoughts }) => activeThoughts,
      getOrganicMemorySnapshot: async () => ({
        hostAttitude: 'present',
        coreIncarnation: '',
        activeThoughts: [],
      }),
      getLatestRelationshipDynamics: async () => null,
      retrieveMemoryFacts: async () => [],
      recallSubconsciousFragmentsWithGovernor: async () => [],
      recallEpisodicEventsWithGovernor: async () => [],
      buildHostPersonModel: async () => null,
      recallMemoryConsolidations: async () => [],
      isPersonaResidueMemoryText: () => false,
      resolveTurnRetrievalPolicySnapshot,
    } satisfies CreateAlicizationOrganicMemoryPromptRuntimeOptions)

    await runtime.resolveOrganicMemoryPromptContext({
      recallSeed: '继续当前问题。',
      recallGovernor: null,
      sessionMirrorRecollection: {
        afterthoughtState: 'ripe',
        certainty: 'approximate',
        confidence: 0.8,
        foreground: 'retired_policy=observe_first',
        mode: 'execution-procedure',
        placement: 'internal-only',
        surfaceMode: 'internal-only',
        visibility: 'inward',
      },
    })

    expect(resolveTurnRetrievalPolicySnapshot).toHaveBeenCalledWith(expect.objectContaining({
      recallSeed: '继续当前问题。',
    }))
  })
})
