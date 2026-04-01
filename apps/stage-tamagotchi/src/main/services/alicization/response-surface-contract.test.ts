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
    expect(result.contract.mustNotDo).toContain('Do not mirror or lightly paraphrase the host\'s latest line as the spine of the reply.')
  })

  it('forbids dialogue-first answer shells that stop at an opener', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'previous browser tab',
        truthState: 'remembered',
        separateCarryFromSurface: true,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Pay off the current dialogue turn directly.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'remembered',
        mindMode: 'repairing',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      dialogueFocus: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
        shouldBypassScreenRepair: true,
        weakLiveScene: true,
        focusSummary: 'Keep this turn dialogue-first.',
        confidence: 0.74,
        reasonTags: ['dialogue-first-turn'],
      },
    })

    expect(result.contract.mustDo).toContain('Complete the actual answer, care move, or companionship move in the same reply.')
    expect(result.contract.mustNotDo).toContain('Do not stop at a shell opener such as "I will answer directly" or "Let me stay with you" without the real content.')
    expect(result.contract.mustNotDo).toContain('Do not expose planning jargon, governance labels, or internal control summaries in the visible answer.')
  })

  it('adds hypothesis labeling and unsupported-specificity bans for coarse screen turns', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'guide-current-knot',
        liveSurface: 'Git commit diff in Java code editor',
        carriedThread: null,
        truthState: 'uncertain',
        separateCarryFromSurface: false,
        shouldCompactHistory: true,
        maxRecentUserTurns: 2,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'coarse-live',
        responseMode: 'guide-current-knot',
        governingFocus: 'Separate observation from guess and keep the guess soft.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'live',
        mindMode: 'tracking',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      claimEvidenceLedger: {
        subject: 'task-knot',
        evidenceMode: 'coarse-held',
        observedSurface: 'Git commit diff in Java code editor',
        taskHypothesis: 'The host is probably working through a Java diff.',
        intentHypothesis: 'Separate observation from guess and keep the guess soft.',
        specificityBudget: 'coarse-scene',
        hostReferencedCues: [],
        groundedArtifactCues: [],
        allowedSpecificCues: [],
        shouldLabelHypothesis: true,
        forbidUnsupportedSpecificity: true,
        shouldSelfRevise: false,
        confidence: 0.8,
        reasonTags: [],
        updatedAt: 1,
      },
    })

    expect(result.contract.mustDo).toContain('When the answer goes beyond direct observation, mark that move as a guess or hypothesis.')
    expect(result.contract.mustNotDo).toContain('Do not smuggle in file names, class names, enum names, or field changes that are not grounded in this turn.')
  })
})
