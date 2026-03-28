import { describe, expect, it } from 'vitest'

import { buildDialogueTurnOwnership } from './dialogue-turn-ownership'

describe('buildDialogueTurnOwnership', () => {
  it('keeps self-directed dialogue turns out of inspection ownership', () => {
    const ownership = buildDialogueTurnOwnership({
      semantics: {
        act: 'challenge',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'frustrated',
        subjectPreference: 'alicization-self',
        taskAnchor: null,
        sharedAttentionDemand: 0.22,
        personaSuppression: 0.44,
        confidence: 0.88,
        summary: 'The host is challenging Alicization directly.',
        source: 'heuristic',
        reasonTags: ['dialogue-first-turn', 'scene-detached-turn'],
      },
      obligation: {
        kind: 'answer',
        summary: 'Answer the complaint directly.',
        confidence: 0.78,
        mustRepairFirst: false,
        mustAnswerDirectly: true,
        mustStayTaskBound: false,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'backgrounded',
        narrative: [],
      },
      inspectionRequested: false,
      inspectionState: 'dialogue-first',
      releaseInspectionCarry: true,
      ingressHint: {
        subject: 'task-knot',
        screenReferenceMode: 'helpful',
        confidence: 0.5,
        reasonTags: ['owner:task-knot'],
      },
    })

    expect(ownership.subject).toBe('alicization-self')
    expect(ownership.screenReferenceMode).toBe('avoid')
    expect(ownership.inspectionRequested).toBe(false)
    expect(ownership.inspectionState).toBe('dialogue-first')
  })

  it('normalizes explicit inspection turns into scene ownership and non-avoid screen mode', () => {
    const ownership = buildDialogueTurnOwnership({
      semantics: {
        act: 'verify-grounding',
        responseNeed: 'guide',
        truthExpectation: 'strict',
        affectiveTone: 'urgent',
        taskAnchor: 'runtime.ts diff',
        sharedAttentionDemand: 0.9,
        personaSuppression: 0.82,
        confidence: 0.86,
        summary: 'Verify grounding around runtime.ts diff.',
        source: 'heuristic',
        reasonTags: ['scene-bound-turn', 'inspection-owned-turn'],
      },
      obligation: {
        kind: 'guide',
        summary: 'Guide the current knot.',
        confidence: 0.84,
        mustRepairFirst: false,
        mustAnswerDirectly: true,
        mustStayTaskBound: true,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'backgrounded',
        narrative: [],
      },
      worldModel: {
        activeThread: {
          id: 'thread::runtime',
          kind: 'change-review',
          status: 'active',
          source: 'continuity',
          title: 'runtime.ts diff',
          summary: 'The host is checking runtime.ts diff.',
          confidence: 0.74,
          significance: 0.77,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 30_000,
          attentionAgeMs: 30_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 30_000,
      },
      inspectionRequested: true,
      inspectionState: 'inspection-live',
      ingressHint: {
        subject: 'task-knot',
        screenReferenceMode: 'required',
        confidence: 0.82,
        reasonTags: ['owner:task-knot'],
      },
    })

    expect(ownership.subject).toBe('task-knot')
    expect(ownership.screenReferenceMode).toBe('helpful')
    expect(ownership.continuityMode).toBe('task-first')
    expect(ownership.inspectionRequested).toBe(true)
    expect(ownership.inspectionState).toBe('inspection-live')
  })

  it('ignores stale ingress scene hints when inspection is already released', () => {
    const ownership = buildDialogueTurnOwnership({
      semantics: {
        act: 'ask-help',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'neutral',
        taskAnchor: null,
        sharedAttentionDemand: 0.2,
        personaSuppression: 0.24,
        confidence: 0.72,
        summary: 'The host asks for a direct plain answer.',
        source: 'heuristic',
        reasonTags: ['question-turn'],
      },
      inspectionRequested: false,
      inspectionState: 'dialogue-first',
      ingressHint: {
        subject: 'task-knot',
        screenReferenceMode: 'required',
        confidence: 0.8,
        reasonTags: ['owner:task-knot'],
      },
    })

    expect(ownership.subject).toBe('general')
    expect(ownership.inspectionRequested).toBe(false)
    expect(ownership.inspectionState).toBe('dialogue-first')
    expect(ownership.reasonTags).toContain('ingress-hint-ignored')
  })

  it('rejects dialogue-first ingress subject when inspection is active', () => {
    const ownership = buildDialogueTurnOwnership({
      semantics: {
        act: 'verify-grounding',
        responseNeed: 'guide',
        truthExpectation: 'strict',
        affectiveTone: 'urgent',
        taskAnchor: 'runtime.ts',
        sharedAttentionDemand: 0.84,
        personaSuppression: 0.82,
        confidence: 0.86,
        summary: 'The host asks for fresh visual verification.',
        source: 'heuristic',
        reasonTags: ['scene-bound-turn', 'inspection-owned-turn'],
      },
      inspectionRequested: true,
      inspectionState: 'inspection-carry',
      ingressHint: {
        subject: 'relationship',
        screenReferenceMode: 'avoid',
        confidence: 0.7,
        reasonTags: ['owner:relationship'],
      },
    })

    expect(ownership.subject).toBe('visible-scene')
    expect(ownership.screenReferenceMode).toBe('required')
    expect(ownership.inspectionRequested).toBe(true)
    expect(ownership.reasonTags).toContain('ingress-hint-ignored')
  })
})
