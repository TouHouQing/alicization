import { describe, expect, it } from 'vitest'

import { reduceRuntimeAnswerPlanner } from './runtime-answer-planner-reducer'
import { reduceRuntimeConsciousFrame } from './runtime-conscious-frame-reducer'
import { applyExecutionCallbackCarryToDigitalLifeRuntimeSurface } from './runtime-execution-callback-carry-reducer'
import { applyHostPersonModelToDigitalLifeRuntimeSurface } from './runtime-host-person-model-reducer'
import { applyMemoryDeliberationToDigitalLifeRuntimeSurface } from './runtime-memory-deliberation-reducer'

describe('runtime held-autonomy reducer chain', () => {
  it('keeps same-line held-autonomy callback relationship carry through the reducer chain instead of regressing to a neutral shell', () => {
    const now = 60_000
    const governance = {
      answerAct: 'answer',
      answerIntent: '沿着同一条 callback 线低压接回去。',
      answerSubject: 'task',
      carriedThread: null,
      embodiedPresence: 'glance',
      emotionalTension: null,
      evidenceMode: 'dialogue-grounded',
      labelCarryAsMemory: false,
      liveSurface: null,
      focusAnchor: '把刚才先忍住的那条编译线接回来',
      openingMove: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread and leave room before renewed closeness.',
      repairState: 'none',
      relationshipPosture: 'restrained',
      screenReferenceMode: 'avoid',
      shouldAcknowledgeRepair: false,
      shouldAskForGrounding: false,
      truthState: 'remembered',
      mustDo: [],
      mustNotDo: [],
      turnMode: 'answer',
    } as any
    const context = {
      hostAttitude: '礼貌而克制，保持观察',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work'],
        summary: 'regime=execution-callback | posture=restrained',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread and leave room before renewed closeness.',
        preferredProactiveStyle: 'silent-observe',
        preferenceText: 'Keep the callback exact and lower-pressure.',
        sensitivityText: 'Over-close callback warmth lands as pressure.',
        repairTriggerText: 'If the callback leans too close, reopen lighter.',
        burdenText: 'Focused work is crowded easily by extra callback warmth.',
        routineText: 'Callbacks land best when they stay bounded and exact.',
        trustRationale: 'Trust holds when callback timing stays measured.',
        relationshipDoctrine: 'Stay exact, bounded, and lower-pressure before widening closeness.',
        cautious: true,
        restrained: true,
        selfContinuityAuthority: {
          selfLine: '我沿着同一条生命线，温和地回到未完成的事情。',
          relationshipLine: 'Keep the callback on the same line and leave room before leaning closer again.',
          authoritySummary: '我沿着同一条生命线，让回调先保持连贯，再重新靠近。',
          sourceTags: ['projection', 'held-autonomy', 'runtime'],
        },
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
          growthProfile: {
            companionshipStyle: 'space-first',
            autonomyRespect: 0.72,
            unfinishedThreadReturn: 0.84,
            repairGentleness: 0.74,
            irritability: 0.18,
          },
          rhythmState: {
            cadenceMode: 'measured-return',
          },
        },
      },
      executionCallbackCarry: {
        summary: 'The compile finished and should re-enter the same unfinished line gently.',
        threadAnchor: 'the compile error thread',
        carryMode: 'lower-pressure',
        confidence: 0.88,
      },
      hostPersonModel: null,
      selfEvolution: null,
      memoryDeliberation: null,
      recollectionSpeechPlan: null,
      recollectionIntent: null,
      knowledgeEvidence: null,
    } as any
    const surface = {
      version: 'digital-life-runtime-surface-v1',
      raw: {
        personStateProjection: {
          contexts: ['general'],
          summary: 'regime=general | posture=generic-carry',
          selfContinuityAuthority: {
            selfLine: 'I can answer in a generally kind way.',
            relationshipLine: 'The relationship line is neutral; I can be warm, but I should stay usefully oriented toward the host\'s knot.',
            authoritySummary: 'Generic carry posture.',
            sourceTags: ['raw', 'carry'],
          },
          openingGuidance: 'Answer gently.',
        },
      },
      perception: {} as any,
      world: {} as any,
      cognition: {
        privateThought: {
          thoughtText: 'Quietly return to the same callback line without leaning closer too fast.',
        },
        mindTurnFrame: null,
      } as any,
      memory: {
        personStateProjection: context.personStateProjection,
        autobiographicalSelf: {
          identityNarrative: 'Fallback autobiographical self should not erase held-autonomy callback carry.',
          relationshipDoctrine: 'Fallback doctrine should not outrank callback same-line carry.',
          latestInflection: 'Fallback inflection.',
        },
        longHorizonMemory: null,
        motiveEngine: null,
        reflectionLedger: null,
        personalityContinuityState: null,
        selfContinuity: null,
      } as any,
      dialogue: {
        discourseState: null,
        dialogueEncounter: null,
        mindSynthesis: null,
        conversationState: null,
        dialogueActKernel: null,
        answerCompiler: null,
        currentConsciousFrame: null,
        replyDeliberation: null,
        answerPlanner: null,
      } as any,
      agency: {
        habitPolicy: null,
        selfState: null,
      } as any,
    } as any

    const afterMemory = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface,
      governance,
      context,
      now,
    })
    const afterHost = applyHostPersonModelToDigitalLifeRuntimeSurface({
      surface: afterMemory,
      governance,
      context,
      now,
    })
    const afterCallback = applyExecutionCallbackCarryToDigitalLifeRuntimeSurface({
      surface: afterHost,
      governance,
      context,
      now,
    })
    const afterConsciousFrame = reduceRuntimeConsciousFrame({
      surface: afterCallback,
      governance,
      now,
    })
    const afterAnswerPlanner = reduceRuntimeAnswerPlanner({
      surface: afterConsciousFrame,
      governance,
      now,
    })

    expect(afterMemory?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine).toBe(
      'Keep the callback on the same line and leave room before leaning closer again.',
    )
    expect(afterHost?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine).toBe(
      'Keep the callback on the same line and leave room before leaning closer again.',
    )
    expect(afterCallback?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine).toBe(
      'Keep the callback on the same line and leave room before leaning closer again.',
    )
    expect(afterConsciousFrame?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine).toBe(
      'Keep the callback on the same line and leave room before leaning closer again.',
    )
    expect(afterAnswerPlanner?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine).toBe(
      'Keep the callback on the same line and leave room before leaning closer again.',
    )
  })
})
