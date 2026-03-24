import { describe, expect, it } from 'vitest'

import { buildAlicizationMindTurnGovernance } from './chat-mind-governance'

describe('buildAlicizationMindTurnGovernance', () => {
  it('surfaces user-facing anchors and strips internal mind jargon', () => {
    const result = buildAlicizationMindTurnGovernance({
      brief: {
        turnMode: 'guide-current-knot',
        liveSurface: 'VS Code | index.ts | test failed',
        carriedThread: 'Hold the living seam until the next move earns itself.',
        truthState: 'live-observed',
        separateCarryFromSurface: false,
        shouldCompactHistory: true,
        maxRecentUserTurns: 2,
        mustDo: ['Lead with the concrete answer.'],
        mustNotDo: ['Do not roleplay.'],
      },
      charter: {
        epistemicMode: 'coarse-live',
        responseMode: 'guide-current-knot',
        governingFocus: 'host current knot',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'deliberating',
        truthFrame: null,
        mindMode: 'tracking',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      surfaceContract: {
        openingStyle: 'direct-answer',
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: true,
        suppressAssociativeRecall: true,
        mustDo: ['Stay current-turn-governed.'],
        mustNotDo: ['Do not drift into residue.'],
      },
      answerPlanner: {
        act: 'guide',
        evidenceMode: 'coarse-held',
        confidence: 0.78,
        governingFocus: 'Localize the failing test in the current diff.',
        openingMove: 'Open from the failing diff.',
        answerIntent: 'Explain the failing line before suggesting edits.',
        relationshipPosture: 'warm',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        mustDo: ['Move from current knot to next action.'],
        mustNotDo: ['Do not drift into generic lists.'],
        narrative: [],
        updatedAt: 1,
      },
      privateThought: {
        stance: 'observe',
        confidence: 0.82,
        rationaleTags: ['diff'],
        thoughtText: 'holding the diff carefully',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        expiresAt: 10,
      },
      mindMode: 'tracking',
    })

    expect(result.focusAnchor).toBe('Localize the failing test in the current diff.')
    expect(result.liveSurface).toContain('VS Code')
    expect(result.carriedThread).toBeNull()
    expect(result.personaKernelMode).toBe('backgrounded')
    expect(result.mustDo).toContain('Lead with the concrete answer.')
  })
})
