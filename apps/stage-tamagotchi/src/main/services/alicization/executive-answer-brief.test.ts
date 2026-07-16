import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildAlicizationExecutiveAnswerBrief } from './executive-answer-brief'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

const charter = {
  epistemicMode: 'dialogue-grounded',
  responseMode: 'answer-naturally',
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

const perceptionState = {
  attentionAnchor: null,
  lastNonSelfForegroundTarget: null,
  recentObservations: [],
  invitedInspection: null,
  recentSceneResidue: null,
  updatedAt: 2_000,
} as any

describe('buildAlicizationExecutiveAnswerBrief', () => {
  it('keeps runtime carry and surface data without reply-writing rules', () => {
    const visualPresenceState = createDefaultVisualPresenceState(1_000)
    const runtimeState = {
      ...createDefaultVisualPresenceState(2_000),
      currentScene: {
        summary: 'runtime.ts shows the current failure',
        target: { appName: 'Visual Studio Code', processName: 'Code', title: 'runtime.ts' },
      },
      discourseState: { unresolvedCarry: 'Repair the stale anchor.' },
    } as any

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 2_000,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState,
      visualPresenceState,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeState),
      responseCharter: charter as any,
    })

    expect(result.brief.liveSurface.toLowerCase()).toContain('runtime.ts')
    expect(result.brief.carriedThread).toBe('Repair the stale anchor.')
    expect(result.brief.mustDo).toEqual([])
    expect(result.brief.mustNotDo).toEqual([])
    expect(result.systemBlock).toBe('')
  })

  it('keeps history compaction metadata data-only', () => {
    const visualPresenceState = createDefaultVisualPresenceState(3_000)
    const result = buildAlicizationExecutiveAnswerBrief({
      now: 3_000,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState,
      visualPresenceState,
      responseCharter: { ...charter, responseMode: 'repair-and-reanchor' } as any,
    })

    expect(result.brief.turnMode).toBe('screen-repair')
    expect(result.brief.shouldCompactHistory).toBe(true)
    expect(result.brief.maxRecentUserTurns).toBe(3)
    expect(result.systemBlock).toBe('')
  })
})
