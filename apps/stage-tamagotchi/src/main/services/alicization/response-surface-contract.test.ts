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

  it('keeps project continuity as data instead of provider prose', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: { ...brief, turnMode: 'answer' } as any,
      charter: charter as any,
      currentConsciousFrame: {
        projectState: {
          currentPhase: 'runtime-phase',
          latestProgress: 'runtime-landed',
          primaryOpenLoop: 'runtime-open',
          nextClosureTarget: 'runtime-next',
        },
      } as any,
    })

    expect(JSON.stringify(result.contract.projectContinuity)).toContain('runtime-phase')
    expect(JSON.stringify(result.contract.projectContinuity)).toContain('runtime-next')
    expect(result.systemBlock).toBe('')
  })
})
