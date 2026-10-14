import type { LifeCommitInput, LifeCommitReceipt, LifeStateView } from '../../../shared/life-contracts'
import type { AlicizationSelfEvolutionVersionRuntimeSnapshot } from './self-evolution/version-runtime'

import { randomUUID } from 'node:crypto'

import { parseLifeGrowthSnapshot } from './life-growth-repository'
import { createAlicizationSelfEvolutionRuntime } from './self-evolution/runtime'

export function createAlicizationRuntimeSelfEvolutionComposition(input: {
  now: () => number
  snapshotMetaKey: string
  alicizationDb: {
    getMetaValue: (
      key: string,
      options?: { signal?: AbortSignal },
    ) => Promise<string | undefined>
    commitLifeState: (input: LifeCommitInput) => Promise<LifeCommitReceipt>
    readLifeState: () => Promise<LifeStateView>
  }
}) {
  const sourceValues = new WeakMap<AlicizationSelfEvolutionVersionRuntimeSnapshot, string>()
  const selfEvolutionRuntime = createAlicizationSelfEvolutionRuntime({
    now: input.now,
    readSnapshot: async (ownerOptions) => {
      const raw = await input.alicizationDb.getMetaValue(
        input.snapshotMetaKey,
        ownerOptions,
      )
      if (!raw)
        return null
      const parsed = parseLifeGrowthSnapshot(raw)
      sourceValues.set(parsed, raw)
      return parsed
    },
    writeSnapshot: async (snapshot, previous) => {
      const view = await input.alicizationDb.readLifeState()
      await input.alicizationDb.commitLifeState({ cardId: view.cardId, operationKey: `growth-save:${randomUUID()}`, changes: [], mutations: [{ type: 'growth-save', key: input.snapshotMetaKey, snapshotJson: JSON.stringify(snapshot), expectedValue: sourceValues.get(previous) ?? null }] })
    },
  })

  return {
    selfEvolutionRuntime,
    recordGrowthConsumption: async (consumer: string, turnId: string, candidateId: string) => {
      const view = await input.alicizationDb.readLifeState()
      const operationKey = `growth-use:${consumer}:${turnId}:${candidateId}`
      await input.alicizationDb.commitLifeState({ cardId: view.cardId, operationKey, changes: [], mutations: [{ type: 'growth-consumed', key: input.snapshotMetaKey, consumer, turnId, candidateId }] })
    },
  }
}
