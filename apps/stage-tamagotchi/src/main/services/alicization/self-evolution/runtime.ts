import type { AlicizationSelfRevisionEvent } from './self-revision-ledger'
import type { AlicizationSelfRevisionStatePatch } from './state-revision-bus'
import type {
  AlicizationSelfEvolutionVersionCandidate,
  AlicizationSelfEvolutionVersionRuntimeSnapshot,
} from './version-runtime'

import { createAlicizationSelfEvolutionVersionRuntime } from './version-runtime'

export interface AlicizationSelfEvolutionRuntime {
  getSnapshot: () => Promise<AlicizationSelfEvolutionVersionRuntimeSnapshot>
  getActiveCandidate: () => Promise<AlicizationSelfEvolutionVersionCandidate | null>
  getActivePatch: () => Promise<AlicizationSelfRevisionStatePatch | null>
  proposeVersion: (input: {
    event: AlicizationSelfRevisionEvent
    patch: AlicizationSelfRevisionStatePatch
  }) => Promise<AlicizationSelfEvolutionVersionCandidate>
  validateVersion: (input: {
    candidateId: string
    replayPassed: boolean
    finalReplayGatePassed?: boolean | null
    productionGoldSampleCount?: number | null
    productionGoldCoverage?: number | null
  }) => Promise<AlicizationSelfEvolutionVersionRuntimeSnapshot>
  rollbackVersion: (input: {
    candidateId: string
    reason: string
  }) => Promise<AlicizationSelfEvolutionVersionRuntimeSnapshot>
  validateAllShadowVersions: (input: {
    replayPassed: boolean
    finalReplayGatePassed?: boolean | null
    productionGoldSampleCount?: number | null
    productionGoldCoverage?: number | null
  }) => Promise<AlicizationSelfEvolutionVersionRuntimeSnapshot>
}

export function createAlicizationSelfEvolutionRuntime(options: {
  now: () => number
  readSnapshot: () => Promise<AlicizationSelfEvolutionVersionRuntimeSnapshot | null>
  writeSnapshot: (snapshot: AlicizationSelfEvolutionVersionRuntimeSnapshot) => Promise<void>
}): AlicizationSelfEvolutionRuntime {
  const versionRuntime = createAlicizationSelfEvolutionVersionRuntime(options)

  async function validateAllShadowVersions(input: {
    replayPassed: boolean
    finalReplayGatePassed?: boolean | null
    productionGoldSampleCount?: number | null
    productionGoldCoverage?: number | null
  }) {
    const snapshot = await versionRuntime.getSnapshot()
    let next = snapshot
    for (const candidate of snapshot.candidates) {
      if (candidate.status !== 'shadow')
        continue
      next = await versionRuntime.validate({
        candidateId: candidate.id,
        replayPassed: input.replayPassed,
        finalReplayGatePassed: input.finalReplayGatePassed,
        productionGoldSampleCount: input.productionGoldSampleCount,
        productionGoldCoverage: input.productionGoldCoverage,
      })
    }
    return next
  }

  return {
    getSnapshot: async () => await versionRuntime.getSnapshot(),
    getActiveCandidate: async () => await versionRuntime.getActiveCandidate(),
    getActivePatch: async () => await versionRuntime.getActivePatch(),
    proposeVersion: async input => await versionRuntime.propose(input),
    validateVersion: async input => await versionRuntime.validate(input),
    rollbackVersion: async input => await versionRuntime.rollback(input),
    validateAllShadowVersions,
  }
}
