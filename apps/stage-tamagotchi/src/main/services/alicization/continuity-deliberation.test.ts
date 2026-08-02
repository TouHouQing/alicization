import { describe, expect, it } from 'vitest'

import {
  deriveAlicizationContinuityDeliberationFromSurface,
} from './continuity-deliberation'

function baseSurface(overrides: Record<string, unknown> = {}) {
  return {
    memory: {
      memoryDeliberation: null,
      recollectionSpeechPlan: null,
      affectiveResidue: null,
      personStateProjection: null,
    },
    agency: {
      autonomy: null,
      initiative: null,
    },
    dialogue: {
      currentConsciousFrame: null,
      conversationState: null,
      dialogueWorldThread: null,
      replyDeliberation: null,
    },
    world: {
      worldModel: null,
    },
    cognition: {
      mindTurnFrame: null,
    },
    ...overrides,
  } as any
}

function cadence(overrides: Record<string, unknown> = {}) {
  return {
    cadenceMode: 'measured-return',
    distancePosture: 'measured-room',
    companionshipDensity: 0.42,
    repairRecovery: 0.64,
    overreachRisk: 0.32,
    fatigueGuard: 0.18,
    afterglowCarry: 0.3,
    shouldDelayWarmth: true,
    shouldProtectRest: false,
    reasonTags: ['cadence:measured-return'],
    summary: 'cadence state',
    ...overrides,
  }
}

describe('continuity deliberation', () => {
  it('uses follow-up timing and payoff fields without parsing the affordance prose', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface(baseSurface({
      memory: {
        memoryDeliberation: {
          followUpAffordance: {
            summary: 'arbitrary model summary',
            whyNow: 'arbitrary model rationale',
            intrusionRisk: 'high',
            payoffDependency: 'requires-current-payoff',
            preferredTiming: 'next-open-window',
          },
        },
        recollectionSpeechPlan: {
          shouldSurface: false,
        },
      },
    }))

    expect(deliberation.kind).toBe('execution-callback')
    expect(deliberation.arcStage).toBe('hold-for-opening')
    expect(deliberation.preferredTiming).toBe('next-open-window')
    expect(deliberation.shouldStayOnThread).toBe(true)
  })

  it('carries an eligible active dialogue thread from structured conversation state', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface(baseSurface({
      dialogue: {
        currentConsciousFrame: {
          reasonTags: [],
          focusAnchor: 'active thread',
        },
        conversationState: {
          continuityPolicy: 'stay-on-thread',
          carryEligible: true,
          shouldHoldThread: true,
          jointThread: 'active thread',
          carryReason: 'structured carry',
        },
        dialogueWorldThread: {
          activeThread: 'active thread',
          carryEligible: true,
          lastOutcome: 'pending',
          openLoops: ['open loop'],
        },
        replyDeliberation: null,
      },
    }))

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.shouldStayOnThread).toBe(true)
    expect(deliberation.shouldSpeakNow).toBe(false)
  })

  it('recognizes a scene shift from unresolved structured world threads', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface(baseSurface({
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
        affectiveResidue: {
          relationshipCadence: cadence(),
        },
        personStateProjection: null,
      },
      world: {
        worldModel: {
          activeThread: {
            id: 'active-thread',
            kind: 'debugging',
            unresolved: true,
            title: 'active',
            summary: 'active',
          },
          lingeringThreads: [{
            id: 'lingering-thread',
            kind: 'change-review',
            unresolved: true,
            title: 'lingering',
            summary: 'lingering',
          }],
          continuity: {
            label: 'scene-shift',
          },
        },
      },
      cognition: {
        mindTurnFrame: {
          relation: {
            hostGoal: 'resolve-problem',
          },
        },
      },
    }))

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.sourceTags).toContain('world:scene-shift')
  })

  it('recognizes a foreground browsing thread with an unresolved problem thread from structured state', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface(baseSurface({
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
        affectiveResidue: {
          relationshipCadence: cadence(),
        },
        personStateProjection: null,
      },
      world: {
        worldModel: {
          activeThread: {
            id: 'foreground-thread',
            kind: 'browsing',
            unresolved: true,
            title: 'foreground',
            summary: 'foreground',
          },
          lingeringThreads: [{
            id: 'problem-thread',
            kind: 'debugging',
            unresolved: true,
            title: 'problem',
            summary: 'problem',
          }],
          continuity: {
            label: 'staying-with-thread',
          },
        },
      },
      cognition: {
        mindTurnFrame: {
          memory: {
            carriedThread: 'problem-thread',
            recallKeys: ['problem-thread'],
          },
        },
      },
    }))

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.sourceTags).toContain('world:staying-with-thread')
  })

  it('uses typed initiative and cadence state for thin resident continuity', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface(baseSurface({
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
        affectiveResidue: {
          relationshipCadence: cadence({
            afterglowCarry: 0.5,
            shouldDelayWarmth: true,
          }),
        },
        personStateProjection: null,
      },
      agency: {
        autonomy: null,
        initiative: {
          selectedThreadId: 'thread-1',
          selectedAction: 'recheck',
          preferredStyle: 'silent-observe',
          shouldSpeak: false,
          why: 'arbitrary initiative rationale',
        },
      },
    }))

    expect(deliberation.kind).toBe('dialogue-carry')
    expect(deliberation.arcStage).toBe('same-thread-continuation')
    expect(deliberation.preferredTiming).toBe('next-open-window')
    expect(deliberation.shouldSpeakNow).toBe(false)
  })

  it('does not manufacture thread continuity from restraint without a thread id', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface(baseSurface({
      memory: {
        memoryDeliberation: null,
        recollectionSpeechPlan: null,
        affectiveResidue: {
          relationshipCadence: cadence(),
        },
        personStateProjection: null,
      },
      agency: {
        autonomy: null,
        initiative: {
          selectedAction: 'recheck',
          preferredStyle: 'silent-observe',
          shouldSpeak: false,
          why: 'arbitrary initiative rationale',
        },
      },
    }))

    expect(deliberation.kind).toBe('none')
    expect(deliberation.shouldStayOnThread).toBe(false)
  })

  it('never speaks now when structured timing defers the continuation', () => {
    const deliberation = deriveAlicizationContinuityDeliberationFromSurface(baseSurface({
      dialogue: {
        currentConsciousFrame: {
          focusAnchor: 'active thread',
        },
        conversationState: {
          continuityPolicy: 'next-open-window',
          carryEligible: true,
          shouldHoldThread: true,
          jointThread: 'active thread',
        },
        dialogueWorldThread: {
          activeThread: 'active thread',
          carryEligible: true,
          lastOutcome: 'pending',
          openLoops: ['open loop'],
        },
        replyDeliberation: {
          memoryMode: 'dialogue-carry',
          speakingFrom: 'held-memory',
          openingBeat: 'model-authored opening',
          whyThisReplyNow: 'model-authored rationale',
          shouldSpeak: true,
          confidence: 0.8,
        },
      },
    }))

    expect(deliberation.preferredTiming).toBe('next-open-window')
    expect(deliberation.shouldSpeakNow).toBe(false)
  })

  it('keeps model-authored summary changes from changing a structured decision', () => {
    const create = (summary: string, whyNow: string) => deriveAlicizationContinuityDeliberationFromSurface(baseSurface({
      memory: {
        memoryDeliberation: {
          followUpAffordance: {
            summary,
            whyNow,
            intrusionRisk: 'medium',
            payoffDependency: 'can-surface-softly',
            preferredTiming: 'same-turn-if-invited',
          },
        },
        recollectionSpeechPlan: {
          shouldSurface: true,
        },
      },
    }))

    const first = create('one', 'two')
    const second = create('another', 'different')
    expect({
      kind: first.kind,
      arcStage: first.arcStage,
      pressure: first.pressure,
      intrusionRisk: first.intrusionRisk,
      payoffDependency: first.payoffDependency,
      preferredTiming: first.preferredTiming,
      shouldStayOnThread: first.shouldStayOnThread,
      shouldSpeakNow: first.shouldSpeakNow,
      sourceTags: first.sourceTags,
    }).toEqual({
      kind: second.kind,
      arcStage: second.arcStage,
      pressure: second.pressure,
      intrusionRisk: second.intrusionRisk,
      payoffDependency: second.payoffDependency,
      preferredTiming: second.preferredTiming,
      shouldStayOnThread: second.shouldStayOnThread,
      shouldSpeakNow: second.shouldSpeakNow,
      sourceTags: second.sourceTags,
    })
  })

  it('returns an inert deliberation when no structured continuity source is present', () => {
    expect(deriveAlicizationContinuityDeliberationFromSurface(baseSurface())).toEqual({
      kind: 'none',
      arcStage: 'none',
      summary: null,
      whyNow: null,
      pressure: 0,
      intrusionRisk: 'high',
      payoffDependency: 'memory-only',
      preferredTiming: 'internal-only',
      shouldStayOnThread: false,
      shouldSpeakNow: false,
      sourceTags: [],
    })
  })
})
