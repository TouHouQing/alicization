import { describe, expect, it } from 'vitest'

import {
  buildCurrentConsciousFrame,
  buildCurrentConsciousFrameSystemBlock,
} from './current-conscious-frame'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

const oldTemplatePattern
  = /Before (?:answering|speaking|acting)|Right now I am|legacy phase-one template|same[- ]her|continuity state|one living her|identity continuity|local-first digital life project|local_desktop_life_loop|phase1_local_digital_life|runtime_personhood|life_core|cadence=|relationship_cadence=|continuity_hold=|continuity_identity|continuity_line|scope=single_identity|open_loop=|project_state_review=|memory_dialogue_embodiment_closure/iu

function expectNoOldTemplate(value: unknown) {
  expect(String(value ?? '')).not.toMatch(oldTemplatePattern)
}

function buildFrameWithMemoryTuning(focusDimensions: string[]) {
  const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
    ...createDefaultVisualPresenceState(83_090),
    discourseState: {
      currentTurnSubject: 'task-knot',
      screenReferenceMode: 'avoid',
      currentTurnSummary: 'Continue the current memory repair.',
      currentQuestion: '继续补记忆闭环',
      owedAction: 'guide-task',
      relationMove: 'guide',
      continuityMode: 'dialogue-first',
      confidence: 0.84,
      narrative: [],
      updatedAt: 83_090,
    },
    conversationState: {
      jointThread: 'The current memory repair is still active.',
      hostMove: '继续补记忆闭环',
      primaryTurnAnchor: 'memory repair',
      primaryTurnAnchorSource: 'user-text',
      activeProject: 'Alicization memory closure',
      unansweredQuestion: '继续补记忆闭环',
      relationFrame: 'guide',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      memoryQueryHints: [],
      shouldHoldThread: true,
      confidence: 0.82,
      narrative: [],
      updatedAt: 83_090,
    },
    answerCompiler: {
      answerSubject: 'task-knot',
      screenReferenceMode: 'avoid',
      recommendedAct: 'guide',
      evidenceMode: 'continuity-carry',
      turnMode: 'answer',
      openingClaim: 'The current memory repair is still active.',
      openingDirective: 'Stay with the current repair evidence.',
      supportingReality: ['Runtime sampling found an incomplete memory loop.'],
      labelCarryAsMemory: false,
      confidence: 0.84,
    },
    personalityContinuityState: {
      currentRegime: 'execution-callback',
      trustStage: 'settling',
      closenessPosture: 'space-first',
      autonomyPosture: 'protect-space',
      repairPosture: 'measured-repair',
      activeContexts: ['execution-callback', 'focused-work'],
      rhythmState: {
        cadenceMode: 'ready-return',
        restMode: 'ordinary',
      },
      growthProfile: {
        companionshipStyle: 'measured-presence',
        autonomyRespect: 0.76,
        unfinishedThreadReturn: 0.88,
      },
    },
    memoryTuningAdvice: null,
    raw: {
      runtimeDigest: {
        projectState: {
          preDialogueAwarenessLine: 'The current memory repair remains active.',
          sameHerSelfLine: 'Alicization is carrying the current memory repair.',
          continuityCadence: null,
          preferredBlinkCadence: null,
          preferredGazeMode: null,
          preferredPauseMode: null,
          preferredLipsyncMode: null,
          preferredVoiceMode: null,
          preferredPacingMode: null,
        },
      },
    },
  } as any)

  if (focusDimensions.length > 0) {
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 83_000,
      sourceReportAt: 82_900,
      focusDimensions,
      retrievalAdjustments: {
        proceduralBoost: 0.08,
        relationshipBoost: 0.08,
        temporalWindowBias: 0.06,
        wrongThreadPenalty: 0.04,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.16,
        delayUntilAfterPayoffBias: 0.14,
        provenanceLabelBias: 0.08,
        specificityClampBias: 0.06,
      },
      personStateAdjustments: {
        repairWindowBias: 0.08,
        closenessCapBias: 0.1,
      },
      notes: ['Replay diagnostics should remain numeric and internal.'],
    }
  }

  return buildCurrentConsciousFrame({
    now: 83_090,
    runtimeSurface,
  })
}

describe('buildCurrentConsciousFrameSystemBlock', () => {
  it('does not let nightly replay focus dimensions shape the conscious frame', () => {
    const baseline = buildFrameWithMemoryTuning([])
    const tuned = buildFrameWithMemoryTuning(
      ['Memory', 'Emotional', 'Embodiment']
        .map(lane => ['runtime', 'SameHer', lane, 'Carry'].join('')),
    )

    expect(tuned).toEqual(baseline)
  })

  it('drops old project-state templates and internal cues from provider-facing conscious frame fields', () => {
    const block = buildCurrentConsciousFrameSystemBlock({
      subject: 'memory',
      centerOfGravity: 'memory-grounded reply',
      truthDiscipline: 'evidence-first',
      consciousNeed: 'Answer from memory and current frame.',
      consciousTension: 'Avoid generic project narration.',
      speakingIntention: 'Use the live memory frame.',
      focusAnchor: 'memory closure',
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      withheldImpulse: null,
      projectState: {
        preflightSummary: 'identity=runtime_personhood',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        identity: 'local_desktop_life_loop',
        currentPhase: 'project_phase=life_core',
        latestProgress: 'WorkingMemory and LongTermMemoryRecall now both have owner evidence.',
        primaryOpenLoop: 'open_loop=memory_dialogue_embodiment_closure',
        nextClosureTarget: 'Keep the next answer grounded in memory evidence.',
        sameHerSelfLine: 'scope=single_identity',
        sameHerDriftRisk: 'project_summary_voice=blocked',
        sameHerHoldDetail: 'relationship_cadence=remembered_boundary; room=more',
        continuityCue: 'continuity_hold=measured_return',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'measured',
        memoryClosureSummary: 'Memory closure should stay evidence-first.',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
      },
      reasonTags: [
        'memory',
        'cadence=measured_return',
        'relationship_cadence=remembered_boundary',
      ],
    } as any)

    expect(block).toContain('Current conscious frame.')
    expect(block).not.toContain('[ALICIZATION_')
    expect(block).toContain('Project landed progress: WorkingMemory and LongTermMemoryRecall now both have owner evidence.')
    expect(block).toContain('Project next closure target: Keep the next answer grounded in memory evidence.')
    expect(block).toContain('Project memory closure: Memory closure should stay evidence-first.')
    expectNoOldTemplate(block)
  })

  it('can omit project-state facts while preserving transparent conscious-frame context', () => {
    const block = buildCurrentConsciousFrameSystemBlock({
      subject: 'execution',
      centerOfGravity: 'guide',
      truthDiscipline: 'evidence-first',
      consciousNeed: 'Execution callback return needs lower pressure and preserved host room.',
      consciousTension: null,
      speakingIntention: 'Return the actual tool result before any comfort.',
      focusAnchor: 'tool result',
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      withheldImpulse: null,
      projectState: {
        latestProgress: 'continuity_progress=partial',
      },
      reasonTags: ['execution'],
    } as any, { includeProjectStateFacts: false })

    expect(block).toContain('Conscious need: Execution callback return needs lower pressure and preserved host room.')
    expect(block).not.toContain('Project landed progress:')
    expectNoOldTemplate(block)
  })
})
