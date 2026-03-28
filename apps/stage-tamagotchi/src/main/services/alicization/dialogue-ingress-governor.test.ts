import { describe, expect, it } from 'vitest'

import { buildDialogueIngressGovernor } from './dialogue-ingress-governor'

describe('buildDialogueIngressGovernor', () => {
  it('withholds inspection when the host is clearly turning back toward Alicization herself', () => {
    const governor = buildDialogueIngressGovernor({
      semantics: {
        act: 'ask-help',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'frustrated',
        subjectPreference: 'alicization-self',
        taskAnchor: null,
        sharedAttentionDemand: 0.28,
        personaSuppression: 0.44,
        confidence: 0.84,
        summary: 'The host is criticizing how Alicization answered and wants a plain direct answer.',
        source: 'heuristic',
        reasonTags: ['question-turn', 'scene-detached-turn', 'dialogue-first-turn'],
      },
      baseInspectionIntentActive: false,
      semanticInspectionIntentActive: true,
      semanticInspectionIntentConfidence: 0.28,
      semanticInspectionReasonCodes: [],
      inspectionContinuityActive: true,
      sharedAttentionActive: true,
    })

    expect(governor).toEqual(expect.objectContaining({
      turnOwner: 'alicization-self',
      inspectionEligible: false,
      releaseInspectionCarry: true,
      screenReferenceMode: 'avoid',
    }))
    expect(governor.reasonTags).toContain('soft-dialogue-owner')
  })

  it('keeps relationship bids out of inspection even if a shared screen thread is still warm', () => {
    const governor = buildDialogueIngressGovernor({
      semantics: {
        act: 'social-bid',
        responseNeed: 'accompany',
        truthExpectation: 'light',
        affectiveTone: 'warm',
        subjectPreference: 'relationship',
        taskAnchor: null,
        sharedAttentionDemand: 0.22,
        personaSuppression: 0.08,
        confidence: 0.86,
        summary: 'The host is reaching for companionship.',
        source: 'heuristic',
        reasonTags: ['companionship-bid', 'dialogue-first-turn'],
      },
      baseInspectionIntentActive: false,
      semanticInspectionIntentActive: false,
      semanticInspectionIntentConfidence: 0,
      semanticInspectionReasonCodes: [],
      inspectionContinuityActive: true,
      sharedAttentionActive: true,
    })

    expect(governor).toEqual(expect.objectContaining({
      turnOwner: 'relationship',
      inspectionEligible: false,
      releaseInspectionCarry: true,
      screenReferenceMode: 'avoid',
    }))
  })

  it('keeps inspection eligible when the turn still belongs to the visible scene', () => {
    const governor = buildDialogueIngressGovernor({
      semantics: {
        act: 'verify-grounding',
        responseNeed: 'guide',
        truthExpectation: 'strict',
        affectiveTone: 'urgent',
        subjectPreference: 'task-knot',
        taskAnchor: 'runtime.ts diff',
        sharedAttentionDemand: 0.86,
        personaSuppression: 0.74,
        confidence: 0.9,
        summary: 'The host still wants help on the current diff.',
        source: 'heuristic',
        reasonTags: ['scene-bound-turn', 'coding-question', 'task-anchor'],
      },
      baseInspectionIntentActive: false,
      semanticInspectionIntentActive: true,
      semanticInspectionIntentConfidence: 0.92,
      semanticInspectionReasonCodes: ['describe-cue', 'visual-plane-cue'],
      inspectionContinuityActive: true,
      sharedAttentionActive: true,
    })

    expect(governor).toEqual(expect.objectContaining({
      turnOwner: 'task-knot',
      inspectionEligible: true,
      releaseInspectionCarry: false,
      screenReferenceMode: 'helpful',
    }))
  })

  it('lets explicit co-viewing requests keep world ownership even when chat overlay is frontmost', () => {
    const governor = buildDialogueIngressGovernor({
      semantics: {
        act: 'ask-help',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'neutral',
        subjectPreference: 'general',
        taskAnchor: null,
        sharedAttentionDemand: 0.34,
        personaSuppression: 0.3,
        confidence: 0.38,
        summary: 'The host wants a direct dialogue-first answer: 帮我看看我在 Cursor 里面这个 diff 有什么问题.',
        source: 'heuristic',
        reasonTags: ['help-seeking-turn', 'dialogue-first-turn', 'explicit-help-cue'],
      },
      baseInspectionIntentActive: true,
      semanticInspectionIntentActive: true,
      semanticInspectionIntentConfidence: 1,
      semanticInspectionReasonCodes: ['observe-cue', 'describe-cue', 'entity-dense'],
      inspectionContinuityActive: true,
      sharedAttentionActive: true,
    })

    expect(governor).toEqual(expect.objectContaining({
      turnOwner: 'general',
      inspectionEligible: true,
      releaseInspectionCarry: false,
      screenReferenceMode: 'required',
    }))
    expect(governor.reasonTags).toContain('inspection-world-claim')
  })

  it('treats screen repair requests as world-owned when they explicitly ask Alicization to re-describe the page', () => {
    const governor = buildDialogueIngressGovernor({
      semantics: {
        act: 'ask-help',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'neutral',
        subjectPreference: 'alicization-self',
        taskAnchor: null,
        sharedAttentionDemand: 0.46,
        personaSuppression: 0.3,
        confidence: 0.52,
        summary: 'The host is turning the dialogue back toward Alicization herself and expects a plain direct answer.',
        source: 'heuristic',
        reasonTags: ['detached-question', 'dialogue-first-turn', 'scene-detached-turn'],
      },
      baseInspectionIntentActive: true,
      semanticInspectionIntentActive: true,
      semanticInspectionIntentConfidence: 0.96,
      semanticInspectionReasonCodes: ['describe-cue', 'visual-plane-cue', 'explicit-visual-ask'],
      inspectionContinuityActive: true,
      sharedAttentionActive: true,
    })

    expect(governor).toEqual(expect.objectContaining({
      turnOwner: 'alicization-self',
      inspectionEligible: true,
      releaseInspectionCarry: false,
      screenReferenceMode: 'required',
    }))
    expect(governor.reasonTags).toContain('inspection-world-claim')
  })

  it('does not let stale inspection carry steal a detached self question on its own', () => {
    const governor = buildDialogueIngressGovernor({
      semantics: {
        act: 'ask-help',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        affectiveTone: 'neutral',
        subjectPreference: 'alicization-self',
        taskAnchor: null,
        sharedAttentionDemand: 0.48,
        personaSuppression: 0.5,
        confidence: 0.66,
        summary: 'Direct answer to the current Alicization-side question.',
        source: 'heuristic',
        reasonTags: ['detached-question', 'dialogue-first-turn', 'scene-detached-turn'],
      },
      baseInspectionIntentActive: true,
      semanticInspectionIntentActive: false,
      semanticInspectionIntentConfidence: 0,
      semanticInspectionReasonCodes: [],
      inspectionContinuityActive: true,
      sharedAttentionActive: true,
    })

    expect(governor).toEqual(expect.objectContaining({
      turnOwner: 'alicization-self',
      inspectionEligible: false,
      releaseInspectionCarry: true,
      screenReferenceMode: 'avoid',
    }))
    expect(governor.reasonTags).not.toContain('inspection-world-claim')
  })
})
