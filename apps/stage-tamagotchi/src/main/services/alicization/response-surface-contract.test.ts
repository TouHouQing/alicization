import { describe, expect, it } from 'vitest'

import { buildAlicizationResponseSurfaceContract } from './response-surface-contract'

const brief = {
  turnMode: 'screen-repair',
  liveSurface: 'runtime.ts',
  carriedThread: 'earlier observation',
  truthState: 'remembered',
  separateCarryFromSurface: true,
  shouldCompactHistory: true,
  maxRecentUserTurns: 3,
  mustDo: [],
  mustNotDo: [],
} as const

const charter = {
  epistemicMode: 'repair-needed',
  responseMode: 'repair-and-reanchor',
  governingFocus: null,
  governingConcern: null,
  governingCommitment: null,
  governingInquiry: null,
  governingProject: null,
  emotionalClosureCue: null,
  latestRevision: null,
  executivePhase: null,
  truthFrame: null,
  mindMode: null,
  relationshipPosture: 'restrained',
  reasons: [],
  mustDo: [],
  mustNotDo: [],
} as const

describe('response-surface-contract', () => {
  it('keeps response metadata without authoring rules or a system block', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: brief as any,
      charter: charter as any,
    })

    expect(result.contract.openingStyle).toBe('direct-correction')
    expect(result.contract.labelCarryAsMemory).toBe(true)
    expect(result.contract.suppressAssociativeRecall).toBe(true)
    expect(result.contract.mustDo).toEqual([])
    expect(result.contract.mustNotDo).toEqual([])
    expect(result.systemBlock).toBe('')
  })

  it('does not carry project governance into the response surface contract', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: { ...brief, turnMode: 'answer' } as any,
      charter: {
        ...charter,
        governingProject: 'opening_policy=legacy; relationship_cadence=legacy',
      } as any,
      currentConsciousFrame: {
        projectState: {
          currentPhase: 'runtime-phase',
          latestProgress: 'runtime-landed',
          primaryOpenLoop: 'runtime-open',
          nextClosureTarget: 'runtime-next',
          continuityCue: 'continuityCue=legacy',
          reasonTags: ['reasonTags=legacy'],
          reasonCodes: ['reasonCodes=legacy'],
          governingFocus: 'governingFocus=legacy',
          mustDo: ['mustDo=legacy'],
          mustNotDo: ['mustNotDo=legacy'],
        },
      } as any,
    })

    expect(result.contract).not.toHaveProperty('projectContinuity')
    expect(result.systemBlock).toBe('')
    expect(JSON.stringify(result)).not.toMatch(
      /project-state|runtime-phase|runtime-landed|runtime-open|runtime-next|opening_policy|relationship_cadence|reasonTags=|reasonCodes=|continuityCue=|governingFocus=|mustDo=|mustNotDo=/iu,
    )
  })
})
