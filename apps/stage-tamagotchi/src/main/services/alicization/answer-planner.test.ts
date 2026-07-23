import { describe, expect, it } from 'vitest'

import { buildAnswerPlanner } from './answer-planner'

function buildPlanner(overrides: Record<string, unknown> = {}) {
  return buildAnswerPlanner({
    now: 30_000,
    context: {} as any,
    currentScene: null,
    inspectionRequested: false,
    ...overrides,
  } as any)
}

function createLiveWorldModel(kind: 'change-review' | 'debugging' | 'late-night-endurance' = 'change-review') {
  return {
    activeThread: {
      id: `thread:${kind}`,
      kind,
      status: 'active',
      source: 'grounded-scene',
      title: 'runtime.ts',
      summary: 'The host is inspecting the current runtime problem.',
      confidence: 0.88,
      significance: 0.8,
      unresolved: true,
      beganAt: 1,
      lastUpdatedAt: 30_000,
      target: null,
    },
    lingeringThreads: [],
    focusTarget: null,
    epistemicState: {
      certainty: 'grounded',
      freshness: 'live',
      seenNow: [],
      inferredNow: [],
      openQuestions: [],
      staleRisks: [],
    },
    continuity: {
      label: 'active',
      sceneAgeMs: 0,
      attentionAgeMs: 0,
      sameSceneAsBefore: true,
      sameAttentionAsBefore: true,
      afterglowOpen: false,
    },
    hostState: {
      availability: 'focused',
      burden: 'moderate',
    },
    updatedAt: 30_000,
  } as any
}

describe('buildAnswerPlanner', () => {
  it('selects guide from a live unresolved change-review concern', () => {
    const planner = buildPlanner({
      worldModel: createLiveWorldModel(),
      concernContinuity: {
        governingEntryId: 'concern:runtime',
        entries: [{
          id: 'concern:runtime',
          kind: 'help-fix',
          summary: 'The runtime diff is still unresolved.',
          confidence: 0.84,
        }],
      },
      conversationState: {
        primaryTurnAnchor: '检查 runtime.ts 当前哪里有问题。',
        hostMove: '检查 runtime.ts 当前哪里有问题。',
      },
    })

    expect(planner.act).toBe('guide')
    expect(planner.evidenceMode).toBe('live-grounded')
    expect(planner.governingFocus).toContain('检查 runtime.ts 当前哪里有问题')
    expect(planner.selectedConcernEntryId).toBe('concern:runtime')
    expect(planner.mustDo).toEqual([])
    expect(planner.mustNotDo).toEqual([])
  })

  it('treats a freshly grounded repair turn as resolved grounding', () => {
    const planner = buildPlanner({
      groundedThisTurn: true,
      ownership: {
        subject: 'task-knot',
        screenReferenceMode: 'required',
      },
      dialogueObligation: {
        kind: 'repair',
        summary: '重新确认当前界面以后继续处理。',
      },
      conversationState: {
        primaryTurnAnchor: '重新确认当前界面以后继续处理。',
      },
    })

    expect(planner.act).toBe('guide')
    expect(planner.evidenceMode).toBe('live-grounded')
    expect(planner.shouldAskForGrounding).toBe(false)
    expect(planner.shouldAcknowledgeRepair).toBe(false)
  })

  it('selects stale-anchor repair from structured repair state', () => {
    const planner = buildPlanner({
      ownership: {
        subject: 'visible-scene',
        screenReferenceMode: 'required',
      },
      repairLedger: {
        governingRepairId: 'repair:stale',
        shouldConstrainPresentTense: true,
        repairPressure: 0.9,
        entries: [{
          id: 'repair:stale',
          kind: 'stale-scene-anchor',
          summary: 'The previous screen observation is stale.',
          confidence: 0.9,
        }],
      },
      conversationState: {
        primaryTurnAnchor: '重新看一下现在的界面。',
      },
    })

    expect(planner.act).toBe('correct-stale-anchor')
    expect(planner.evidenceMode).toBe('repair-first')
    expect(planner.shouldAcknowledgeRepair).toBe(true)
    expect(planner.selectedRepairId).toBe('repair:stale')
  })

  it('selects care structurally without creating a fixed care opening', () => {
    const planner = buildPlanner({
      ownership: {
        subject: 'host-state',
        screenReferenceMode: 'avoid',
      },
      dialogueObligation: {
        kind: 'care',
        summary: '用户说自己今天很累。',
      },
      privateThought: {
        shouldSpeak: true,
        stance: 'care',
        confidence: 0.78,
      },
      conversationState: {
        primaryTurnAnchor: '用户说自己今天很累。',
      },
    })

    expect(planner.act).toBe('care')
    expect(planner.relationshipPosture).toBe('tender')
    expect(planner.governingFocus).toContain('用户说自己今天很累')
    expect(planner.openingMove).toBe('')
  })

  it('prefers runtime surface planning inputs over conflicting raw inputs', () => {
    const planner = buildPlanner({
      answerCompiler: {
        recommendedAct: 'guide',
        evidenceMode: 'coarse-held',
        confidence: 0.4,
        relationshipPosture: 'restrained',
        mustDo: [],
        mustNotDo: [],
        narrative: [],
      },
      conversationState: {
        primaryTurnAnchor: 'raw anchor',
      },
      runtimeSurface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {
          currentScene: null,
        },
        world: {
          worldModel: null,
          worldOntology: null,
          relationshipModel: null,
        },
        cognition: {
          privateThought: null,
          mindKernel: null,
        },
        memory: {},
        agency: {},
        dialogue: {
          conversationState: {
            primaryTurnAnchor: 'runtime anchor',
            hostMove: 'runtime anchor',
          },
          answerCompiler: {
            recommendedAct: 'care',
            evidenceMode: 'dialogue-grounded',
            confidence: 0.86,
            relationshipPosture: 'tender',
            turnMode: 'care',
            mustDo: ['ignored compiler rule'],
            mustNotDo: ['ignored compiler rule'],
            narrative: ['ignored compiler narrative'],
          },
          replyDeliberation: {
            openingBeat: 'runtime opening',
            whyThisReplyNow: 'runtime anchor',
          },
        },
        raw: {},
      },
    })

    expect(planner.act).toBe('care')
    expect(planner.evidenceMode).toBe('dialogue-grounded')
    expect(planner.governingFocus).toContain('runtime anchor')
    expect(planner.governingFocus).not.toContain('raw anchor')
    expect(planner.openingMove).toBe('runtime opening')
    expect(planner.mustDo).toEqual([])
    expect(planner.mustNotDo).toEqual([])
  })

  it('keeps dynamic self authority available for self-facing turns', () => {
    const planner = buildPlanner({
      ownership: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
      },
      conversationState: {
        primaryTurnAnchor: '你现在怎么理解自己？',
      },
      runtimeSurface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {
          currentScene: null,
        },
        world: {
          worldModel: null,
          worldOntology: null,
          relationshipModel: null,
        },
        cognition: {
          privateThought: null,
          mindKernel: null,
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              selfLine: 'I remember myself through the choices I actually made.',
              relationshipLine: 'The relationship line comes from reviewed experience.',
              motiveLine: 'I want to answer from current evidence.',
              authoritySummary: 'My self-understanding comes from reviewed memory and current choices.',
              sourceTags: ['durable-self-core'],
            },
          },
        },
        agency: {},
        dialogue: {
          conversationState: {
            primaryTurnAnchor: '你现在怎么理解自己？',
          },
        },
        raw: {},
      },
    })

    expect(planner.governingFocus).toContain('你现在怎么理解自己')
    expect(planner.governingFocus).toContain('reviewed memory and current choices')
    expect(planner.answerIntent).toContain('reviewed memory and current choices')
  })

  it('does not select a released reflection as current evidence', () => {
    const planner = buildPlanner({
      reflectionLedger: {
        latestEntryId: 'reflection:released',
        entries: [{
          id: 'reflection:released',
          outcome: 'released',
          revision: 'Temporary noise that should no longer lead.',
        }],
      },
      conversationState: {
        primaryTurnAnchor: '继续当前问题。',
      },
    })

    expect(planner.selectedReflectionId).toBeNull()
    expect(planner.governingFocus).not.toContain('Temporary noise')
  })

  it('does not carry person-state opening or closeness governance text into planner intent', () => {
    const planner = buildPlanner({
      ownership: {
        subject: 'relationship',
        screenReferenceMode: 'avoid',
      },
      conversationState: {
        primaryTurnAnchor: '用户正在说明昨晚发生的真实情况。',
        hostMove: '用户正在说明昨晚发生的真实情况。',
      },
      runtimeSurface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {
          currentScene: null,
        },
        world: {
          worldModel: null,
          worldOntology: null,
          relationshipModel: null,
        },
        cognition: {
          privateThought: null,
          mindKernel: null,
        },
        memory: {
          personStateProjection: {
            openingGuidance: 'Observe first with lighter pressure.',
            manifestationCadenceSummary: 'Manifest with lower pressure and preserve context.',
            relationshipPosture: 'restrained',
            activeClosenessContext: 'focused-work',
            activeClosenessRung: 'space-first',
            sensitivityText: '用户昨晚连续工作到很晚。',
            burdenText: '用户昨晚睡眠不足。',
          },
        },
        agency: {},
        dialogue: {},
        raw: {},
      },
    })

    expect(planner.governingFocus).toContain('用户正在说明昨晚发生的真实情况')
    expect(planner.answerIntent).toContain('用户昨晚睡眠不足')
    expect(planner.governingFocus).not.toMatch(
      /Observe first with lighter pressure|Manifest with lower pressure|space-first|restrained/iu,
    )
    expect(planner.answerIntent).not.toMatch(
      /Observe first with lighter pressure|Manifest with lower pressure|space-first|restrained/iu,
    )
  })
})
