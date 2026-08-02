import { describe, expect, it } from 'vitest'

import { reduceRuntimeConsciousFrame } from './runtime-conscious-frame-reducer'

function createGovernance() {
  return {
    answerSubject: 'task-knot',
    answerAct: 'guide',
    answerIntent: '回答当前问题。',
    openingMove: '从当前问题开始。',
    focusAnchor: '当前问题',
    truthState: 'dialogue-grounded',
    screenReferenceMode: 'avoid',
    repairState: 'none',
    labelCarryAsMemory: false,
  } as any
}

function createSurface(currentConsciousFrame: Record<string, unknown> | null) {
  return {
    version: 'digital-life-runtime-surface-v1',
    perception: {},
    world: {},
    cognition: {},
    memory: {
      memoryDeliberation: {
        shouldRecall: true,
        surfacePolicy: 'answer-anchoring',
      },
    },
    dialogue: {
      currentConsciousFrame,
      answerPlanner: null,
      replyDeliberation: null,
      dialogueActKernel: null,
    },
    agency: {},
    raw: {},
  } as any
}

function createFrame(overrides: Record<string, unknown> = {}) {
  return {
    subject: 'task-knot',
    centerOfGravity: 'guide',
    truthDiscipline: 'dialogue-first',
    consciousNeed: '理解当前运行时问题。',
    consciousTension: '当前失败分支仍未解决。',
    speakingIntention: '回答当前运行时问题。',
    focusAnchor: 'runtime.ts 当前失败分支',
    withheldImpulse: null,
    shouldWithholdSpecificity: false,
    shouldSelfRevise: false,
    confidence: 0.82,
    reasonTags: ['memory-deliberation', 'dialogue-grounded'],
    updatedAt: 10,
    ...overrides,
  } as any
}

describe('reduceRuntimeConsciousFrame', () => {
  it('does not synthesize a missing conscious-frame owner', () => {
    const surface = createSurface(null)
    const reduced = reduceRuntimeConsciousFrame({
      surface,
      governance: createGovernance(),
      now: 100,
    })

    expect(reduced).toBe(surface)
    expect(reduced?.dialogue.currentConsciousFrame).toBeNull()
    expect(reduced?.memory).toBe(surface.memory)
    expect(reduced?.raw).toBe(surface.raw)
  })

  it('sanitizes existing dynamic text while preserving typed cognition state', () => {
    const frame = createFrame()
    const reduced = reduceRuntimeConsciousFrame({
      surface: createSurface(frame),
      governance: createGovernance(),
      now: 200,
    })

    expect(reduced?.dialogue.currentConsciousFrame).toMatchObject({
      subject: 'task-knot',
      centerOfGravity: 'guide',
      truthDiscipline: 'dialogue-first',
      consciousNeed: '理解当前运行时问题。',
      consciousTension: '当前失败分支仍未解决。',
      speakingIntention: '回答当前运行时问题。',
      focusAnchor: 'runtime.ts 当前失败分支',
      shouldWithholdSpecificity: false,
      confidence: 0.82,
      reasonTags: ['memory-deliberation', 'dialogue-grounded'],
      updatedAt: 10,
    })
  })

  it('preserves provider-authored cognition text while applying ordinary whitespace normalization', () => {
    const reduced = reduceRuntimeConsciousFrame({
      surface: createSurface(createFrame({
        consciousNeed: '  Provider may discuss continuity semantics as ordinary content.  ',
        consciousTension: 'A first line.\nA second line.',
        speakingIntention: '  Answer from the current cognition state. ',
        focusAnchor: '  active runtime issue ',
        withheldImpulse: '  unrelated branch ',
      })),
      governance: createGovernance(),
      now: 300,
    })

    expect(reduced?.dialogue.currentConsciousFrame).toMatchObject({
      consciousNeed: 'Provider may discuss continuity semantics as ordinary content.',
      consciousTension: 'A first line. A second line.',
      speakingIntention: 'Answer from the current cognition state.',
      focusAnchor: 'active runtime issue',
      withheldImpulse: 'unrelated branch',
    })
  })
})
