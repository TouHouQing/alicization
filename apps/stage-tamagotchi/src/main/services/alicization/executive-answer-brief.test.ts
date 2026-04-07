import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildAlicizationExecutiveAnswerBrief } from './executive-answer-brief'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('buildAlicizationExecutiveAnswerBrief', () => {
  it('reads carry and live surface cues from the runtime surface when provided', () => {
    const visualPresenceState = createDefaultVisualPresenceState(1_000)
    const runtimeBackedState = {
      ...createDefaultVisualPresenceState(2_000),
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'runtime.ts shows a stale grounding mismatch',
        source: 'screen-semantic-summary',
        confidence: 0.94,
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime.ts',
        },
        beganAt: 1_500,
        lastSeenAt: 2_000,
      },
      attention: {
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime.ts',
        },
        source: 'current-grounded-scene',
        confidence: 0.93,
        engagedAt: 1_700,
        lastConfirmedAt: 2_000,
        dwellMs: 300,
      },
      worldModel: {
        activeThread: {
          id: 'thread::runtime-surface',
          kind: 'problem',
          title: 'runtime surface',
          summary: 'Keep one runtime surface across dialogue and proactive loops.',
          status: 'active',
          significance: 0.9,
          confidence: 0.84,
          unresolved: true,
        },
        continuity: {
          label: 'same-thread',
          sameSceneAsBefore: true,
          afterglowOpen: false,
        },
        epistemicState: {
          certainty: 'grounded',
          openQuestions: [],
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      discourseState: {
        unresolvedCarry: 'Repair the stale anchor before answering.',
      } as any,
      answerPlanner: {
        act: 'guide',
        evidenceMode: 'direct',
        governingFocus: 'Answer from the freshest grounded runtime surface.',
      } as any,
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 2_000,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 2_000,
      },
      visualPresenceState,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState as any),
      responseCharter: {
        epistemicMode: 'grounded-live',
        responseMode: 'answer-naturally',
        governingFocus: 'Answer from the freshest grounded runtime surface.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.brief.liveSurface).not.toBe('none')
    expect(result.brief.liveSurface.toLowerCase()).toContain('runtime.ts')
    expect(result.brief.carriedThread).toBe('Repair the stale anchor before answering.')
    expect(result.systemBlock).toContain('Repair the stale anchor before answering.')
  })

  it('lets runtimeSurface override conflicting explicit dialogue outputs', () => {
    const visualPresenceState = createDefaultVisualPresenceState(10_000)
    const runtimeBackedState = {
      ...createDefaultVisualPresenceState(20_000),
      discourseState: {
        screenReferenceMode: 'helpful',
        unresolvedCarry: 'Runtime carry thread',
      },
      answerCompiler: {
        turnMode: 'guide-current-knot',
        screenReferenceMode: 'helpful',
        openingDirective: 'Runtime directive',
        mustDo: ['Runtime must-do'],
        mustNotDo: ['Runtime must-not-do'],
        labelCarryAsMemory: false,
      },
      claimEvidenceLedger: {
        shouldLabelHypothesis: false,
        forbidUnsupportedSpecificity: false,
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 20_000,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 20_000,
      },
      visualPresenceState,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState as any),
      responseCharter: {
        epistemicMode: 'grounded-live',
        responseMode: 'answer-naturally',
        governingFocus: 'Runtime directive',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      discourseState: {
        screenReferenceMode: 'avoid',
        unresolvedCarry: 'raw conflict',
      } as any,
      answerCompiler: {
        turnMode: 'answer',
        screenReferenceMode: 'avoid',
        openingDirective: 'raw conflict',
        mustDo: ['raw conflict'],
        mustNotDo: ['raw conflict'],
        labelCarryAsMemory: true,
      } as any,
      claimEvidenceLedger: {
        shouldLabelHypothesis: true,
        forbidUnsupportedSpecificity: true,
      } as any,
    })

    expect(result.brief.turnMode).toBe('guide-current-knot')
    expect(result.brief.carriedThread).toBe('Runtime carry thread')
    expect(result.brief.mustDo).toContain('Runtime directive')
    expect(result.brief.mustDo).toContain('Runtime must-do')
    expect(result.brief.mustNotDo).toContain('Runtime must-not-do')
    expect(result.brief.mustDo).not.toContain('raw conflict')
    expect(result.brief.mustNotDo).not.toContain('raw conflict')
  })
})
