import { describe, expect, it } from 'vitest'

import { buildAlicizationResponseSurfaceContract } from './response-surface-contract'

describe('response-surface-contract', () => {
  it('forces direct correction discipline for repair turns', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'screen-repair',
        liveSurface: 'Codex | Chat Overlay',
        carriedThread: 'GitHub diff in browser',
        truthState: 'remembered',
        separateCarryFromSurface: true,
        shouldCompactHistory: true,
        maxRecentUserTurns: 2,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'repair-needed',
        responseMode: 'repair-and-reanchor',
        governingFocus: 'Correct the stale browser carry before continuing.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: 'Visible surface is now Codex.',
        executivePhase: 'reflecting',
        truthFrame: 'remembered',
        mindMode: 'repairing',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.contract.openingStyle).toBe('direct-correction')
    expect(result.contract.allowStageDirections).toBe(false)
    expect(result.contract.labelCarryAsMemory).toBe(true)
    expect(result.contract.suppressAssociativeRecall).toBe(true)
  })

  it('keeps care turns warm but still rejects theatrical prefaces', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'care',
        liveSurface: 'VS Code | main.ts',
        carriedThread: null,
        truthState: 'live-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 4,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'grounded-live',
        responseMode: 'care-with-boundary',
        governingFocus: 'Host is tired while coding.',
        governingConcern: 'fatigue',
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'care-host',
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'observed',
        mindMode: 'care',
        relationshipPosture: 'tender',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.contract.openingStyle).toBe('gentle-care')
    expect(result.contract.allowAffectionatePreface).toBe(true)
    expect(result.contract.allowBodyNarration).toBe(false)
    expect(result.contract.mustNotDo).toContain('Do not begin with moans, pet names, ellipsis-only prefaces, or decorative roleplay.')
  })
})
