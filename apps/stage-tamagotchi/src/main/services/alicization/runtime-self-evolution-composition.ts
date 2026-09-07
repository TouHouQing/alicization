import type { AlicizationSelfEvolutionVersionRuntimeSnapshot } from './self-evolution/version-runtime'

import { createAlicizationSelfEvolutionRuntime } from './self-evolution/runtime'

export function createAlicizationRuntimeSelfEvolutionComposition(input: {
  now: () => number
  snapshotMetaKey: string
  alicizationDb: {
    getMetaValue: (
      key: string,
      options?: { signal?: AbortSignal },
    ) => Promise<string | undefined>
    setMetaValue: (key: string, value: string) => Promise<void>
  }
}) {
  const selfEvolutionRuntime = createAlicizationSelfEvolutionRuntime({
    now: input.now,
    readSnapshot: async (ownerOptions) => {
      const raw = await input.alicizationDb.getMetaValue(
        input.snapshotMetaKey,
        ownerOptions,
      )
      if (!raw)
        return null
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object'
        ? parsed as AlicizationSelfEvolutionVersionRuntimeSnapshot
        : null
    },
    writeSnapshot: async (snapshot) => {
      await input.alicizationDb.setMetaValue(
        input.snapshotMetaKey,
        JSON.stringify(snapshot),
      )
    },
  })

  return {
    selfEvolutionRuntime,
  }
}
