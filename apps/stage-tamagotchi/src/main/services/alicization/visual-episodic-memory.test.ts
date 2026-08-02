import type {
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationEmotionalKernelSnapshot,
  AlicizationInitiativeSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationVisualSceneSnapshot,
} from '../../../shared/eventa'

import { describe, expect, it } from 'vitest'

import {
  buildVisualRecallSeed,
  buildVisualSedimentFragment,
  createDefaultVisualPresenceState,
  normalizeVisualPresenceState,
  updateVisualPresenceState,
  visualWorkingMemoryTtlMs,
} from './visual-episodic-memory'

function buildScene(overrides: Partial<AlicizationVisualSceneSnapshot> = {}): AlicizationVisualSceneSnapshot {
  return {
    workloadKind: 'coding',
    contentKind: 'diff',
    scenario: 'coding',
    summary: 'Reviewing a memory persistence change.',
    source: 'screen-semantic-summary',
    confidence: 0.88,
    target: {
      appName: 'Visual Studio Code',
      processName: 'Code',
      title: 'visual-episodic-memory.ts',
      pid: 42,
    },
    beganAt: 1_000,
    lastSeenAt: 20_000,
    ...overrides,
  }
}

function buildPrivateThought(): AlicizationPrivateThoughtSnapshot {
  return {
    stance: 'observe',
    confidence: 0.82,
    rationaleTags: ['scene-grounded'],
    thoughtText: 'The memory persistence change is still being inspected.',
    shouldSpeak: false,
    suggestedStyle: 'silent-observe',
    embodiedPresence: 'attentive',
    expiresAt: 40_000,
    emotionalTension: 'focused-flow',
  }
}

function buildInitiative(): AlicizationInitiativeSnapshot {
  return {
    selectedAction: 'recheck',
    selectedProposalId: 'proposal-1',
    selectedTruthFrame: 'live',
    selectedCounterfactualOptionId: null,
    selectedConcernId: 'concern-1',
    selectedBeliefId: 'belief-1',
    selectedInquiryId: null,
    selectedCommitmentId: null,
    selectedInquiryPlanId: null,
    selectedHypothesisId: null,
    selectedThreadId: 'thread-1',
    selectedRuntimeThreadId: 'runtime-thread-1',
    selectedThoughtThreadId: null,
    selectedGovernorIntentionId: null,
    actionEcologyMode: 'quiet-accompany',
    confidence: 0.91,
    motives: {
      clarify: 0.8,
      protect: 0.4,
    },
    speakDrive: 0.3,
    silenceDrive: 0.7,
    preferredStyle: 'silent-observe',
    preferredPresence: 'attentive',
    why: 'The current diff still needs another grounded look.',
    shouldSurface: true,
    shouldSpeak: false,
  }
}

function buildEmotionalKernel(): AlicizationEmotionalKernelSnapshot {
  return {
    version: 'emotional-kernel-v1',
    dominantEmotion: 'hesitant-curiosity',
    initiativeMode: 'observe',
    memoryRecallMode: 'emotional-resonance',
    embodimentTone: 'nearby-soft',
    valence: 0.55,
    arousal: 0.32,
    guardedness: 0.28,
    closenessDrive: 0.48,
    repairNeed: 0.08,
    initiativePressure: 0.22,
    reasonTags: ['scene-grounded'],
    why: 'Provider failed.',
  }
}

function buildLongHorizonMemory(): AlicizationLongHorizonMemorySnapshot {
  return {
    preferenceBias: {
      companionship: 0.72,
      truthfulGrounding: 0.95,
      gentleRepair: 0.7,
      quietObservation: 0.8,
      proactiveCare: 0.55,
      playfulIntimacy: 0.35,
      autonomyRespect: 0.9,
      unfinishedThreadReturn: 0.75,
    },
    identityBias: {
      guardedness: 0.3,
      tenderness: 0.76,
      directness: 0.68,
      selfDirection: 0.74,
    },
    anchorFacts: [{
      factId: 'fact-1',
      subject: 'host',
      predicate: 'prefers',
      object: 'transparent provider failures',
      confidence: 0.96,
      weight: 0.9,
      influenceTags: ['truth', 'boundary'],
      summary: 'The host prefers explicit provider failure details.',
      lastRecalledAt: 18_000,
    }],
    summary: 'Truthful grounding and quiet companionship are important.',
    dominantCueSummary: 'Keep failures explicit.',
    rememberedPreferenceSummary: 'Prefer grounded, inspectable memory behavior.',
    rememberedConstraintSummary: 'Do not turn raw dialogue into persona training data.',
    rememberedPlanSummary: 'Finish the local memory loop.',
    updatedAt: 18_000,
  }
}

describe('visual episodic memory', () => {
  it('creates a default snapshot whose raw projection only contains current runtime data', () => {
    const state = createDefaultVisualPresenceState(12_345)

    expect(state).toMatchObject({
      currentBodyState: 'idle',
      continuityMode: 'ambient-covision',
      quietLineMs: 0,
      currentInwardPreoccupation: null,
      watchMode: 'mnemonic-passive',
      workingMemoryEpisodes: [],
      updatedAt: 12_345,
    })
    expect(state.raw).toEqual({
      personStateProjection: null,
      runtimeDigest: null,
      runtime: null,
    })
  })

  it('normalizes a current conscious frame using only its current typed fields', () => {
    const frame: AlicizationCurrentConsciousFrameSnapshot = {
      subject: 'task-knot',
      centerOfGravity: 'answer',
      truthDiscipline: 'observe-then-hypothesize',
      consciousNeed: 'Which memory boundary is currently failing?',
      consciousNeedSource: 'question',
      consciousTension: 'The persisted shape and the current contracts disagree.',
      speakingIntention: '',
      focusAnchor: 'memory boundary',
      focusAnchorSource: 'question',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: true,
      confidence: 0.88,
      reasonTags: ['type-contract'],
      updatedAt: 21_000,
    }

    const state = normalizeVisualPresenceState({
      ...createDefaultVisualPresenceState(21_000),
      currentConsciousFrame: frame,
    }, 21_000)

    expect(state.currentConsciousFrame).toEqual(frame)
  })

  it('drops legacy local-fallback answer compiler without dropping the whole snapshot', () => {
    const normalized = normalizeVisualPresenceState({
      ...createDefaultVisualPresenceState(21_500),
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        speechObligation: 'guide-task',
        relationMove: 'guide',
        turnMode: 'guide-current-knot',
        responseMode: 'guide-current-knot',
        replyRealizationMode: 'local-fallback',
        expectedVisibleReplyAuthority: 'llm-mind',
        recommendedAct: 'guide',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'warm',
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'nearby-soft',
        openingDirective: 'Retired persisted directive.',
        openingClaim: 'Retired persisted claim.',
        supportingReality: ['The current memory boundary is under review.'],
        uncertaintyBoundary: 'The persisted plan predates the Provider-only boundary.',
        careVector: null,
        nextMove: 'Continue the boundary check.',
        labelCarryAsMemory: true,
        maxSentences: 4,
        mustDo: ['Keep the retired compiler.'],
        mustNotDo: [],
        confidence: 0.9,
        narrative: ['Retired persisted visual state.'],
        updatedAt: 21_400,
      },
    }, 21_500)

    expect(normalized.updatedAt).toBe(21_500)
    expect(normalized.currentBodyState).toBe('idle')
    expect(normalized.answerCompiler).toBeNull()
  })

  it('normalizes and persists real initiative state without adding policy projections', () => {
    const initiative = buildInitiative()
    const state = normalizeVisualPresenceState({
      ...createDefaultVisualPresenceState(22_000),
      initiative,
    }, 22_000)

    expect(state.initiative).toEqual(initiative)
  })

  it('preserves long-horizon memory facts and preferences through normalization and update', () => {
    const longHorizonMemory = buildLongHorizonMemory()
    const normalized = normalizeVisualPresenceState({
      ...createDefaultVisualPresenceState(18_000),
      longHorizonMemory,
    }, 18_000)

    const carried = updateVisualPresenceState({
      now: 19_000,
      previousState: normalized,
      watchMode: normalized.watchMode,
      scene: normalized.currentScene,
      attention: normalized.attention,
      privateThought: null,
      nextSuggestedProbeMs: normalized.nextSuggestedProbeMs,
    })

    expect(normalized.longHorizonMemory).toEqual(longHorizonMemory)
    expect(carried.longHorizonMemory).toEqual(longHorizonMemory)
  })

  it('preserves a real emotional kernel through normalization and update', () => {
    const emotionalKernel = buildEmotionalKernel()
    const normalized = normalizeVisualPresenceState({
      ...createDefaultVisualPresenceState(22_000),
      emotionalKernel,
    }, 22_000)

    const carried = updateVisualPresenceState({
      now: 23_000,
      previousState: normalized,
      watchMode: normalized.watchMode,
      scene: null,
      attention: null,
      privateThought: null,
      nextSuggestedProbeMs: normalized.nextSuggestedProbeMs,
    })

    expect(normalized.emotionalKernel).toEqual(emotionalKernel)
    expect(carried.emotionalKernel).toEqual(emotionalKernel)
  })

  it('creates a working-memory episode when the grounded visual scene changes', () => {
    const previousState = {
      ...createDefaultVisualPresenceState(20_000),
      watchMode: 'symbiotic-vision' as const,
      currentScene: buildScene(),
      attention: {
        target: buildScene().target ?? null,
        source: 'current-grounded-scene' as const,
        confidence: 0.9,
        engagedAt: 1_000,
        lastConfirmedAt: 20_000,
        dwellMs: 19_000,
      },
      privateThought: buildPrivateThought(),
    }

    const next = updateVisualPresenceState({
      now: 21 * 60_000,
      previousState,
      watchMode: 'symbiotic-vision',
      scene: buildScene({
        workloadKind: 'terminal',
        contentKind: 'error',
        summary: 'Running the targeted test.',
        beganAt: 21 * 60_000,
        lastSeenAt: 21 * 60_000,
      }),
      attention: null,
      privateThought: null,
      nextSuggestedProbeMs: 20_000,
    })

    expect(next.workingMemoryEpisodes).toHaveLength(1)
    expect(next.workingMemoryEpisodes[0]).toMatchObject({
      scene: 'coding:coding:diff',
      emotionalTension: 'focused-flow',
      attentionTarget: 'visual-episodic-memory.ts',
      sedimentCandidate: true,
    })
  })

  it('prunes expired visual working-memory episodes during normalization', () => {
    const now = visualWorkingMemoryTtlMs + 10_000
    const state = normalizeVisualPresenceState({
      ...createDefaultVisualPresenceState(now),
      workingMemoryEpisodes: [
        {
          scene: 'coding:coding:diff',
          summary: 'Expired episode',
          beganAt: 0,
          endedAt: 1,
          confidence: 0.8,
          emotionalTension: 'focused-flow',
          sedimentCandidate: true,
        },
        {
          scene: 'coding:terminal:error',
          summary: 'Current episode',
          beganAt: now - 5_000,
          endedAt: now - 1_000,
          confidence: 0.9,
          emotionalTension: 'tense-debug',
          sedimentCandidate: true,
        },
      ],
    }, now)

    expect(state.workingMemoryEpisodes.map(episode => episode.summary)).toEqual(['Current episode'])
  })

  it('keeps only the latest eight visual working-memory episodes', () => {
    const previousState = createDefaultVisualPresenceState(10_000)
    previousState.workingMemoryEpisodes = Array.from({ length: 8 }, (_, index) => ({
      scene: `coding:coding:diff-${index}`,
      summary: `Episode ${index}`,
      beganAt: 1_000 + index,
      endedAt: 2_000 + index,
      confidence: 0.8,
      emotionalTension: 'focused-flow',
      sedimentCandidate: true,
    }))
    previousState.currentScene = buildScene()

    const next = updateVisualPresenceState({
      now: 21_000,
      previousState,
      watchMode: 'symbiotic-vision',
      scene: buildScene({ contentKind: 'error', beganAt: 21_000, lastSeenAt: 21_000 }),
      attention: null,
      privateThought: null,
      nextSuggestedProbeMs: 20_000,
    })

    expect(next.workingMemoryEpisodes).toHaveLength(8)
    expect(next.workingMemoryEpisodes[0]?.summary).toBe('Episode 1')
    expect(next.workingMemoryEpisodes.at(-1)?.scene).toBe('coding:coding:diff')
  })

  it('preserves transparent runtime failure details without carrying surrounding prose', () => {
    const failureText = 'Embedding provider failed with HTTP 400: {"code":20015,"message":"The parameter is invalid.","data":null}'
    const state = normalizeVisualPresenceState({
      ...createDefaultVisualPresenceState(12_400),
      currentInwardPreoccupation: `Stay nearby. ${failureText}`,
    }, 12_400)

    expect(state.currentInwardPreoccupation).toBe(
      'Embedding provider failed with HTTP 400: code=20015; message=The parameter is invalid.',
    )
  })

  it('builds inspectable sediment and recall text from visual memory facts', () => {
    const episode = {
      scene: 'coding:coding:error',
      summary: 'TypeScript reports a memory snapshot mismatch.',
      attentionTarget: 'Visual Studio Code / visual-episodic-memory.ts',
      beganAt: 1_000,
      endedAt: 20_000,
      confidence: 0.92,
      emotionalTension: 'tense-debug' as const,
      sedimentCandidate: true,
    }

    expect(buildVisualSedimentFragment(episode)).toBe(
      'visual_scene:coding:coding:error emotional_tension:tense-debug summary:TypeScript reports a memory snapshot mismatch. attention:Visual Studio Code / visual-episodic-memory.ts',
    )
    expect(buildVisualRecallSeed({
      scene: buildScene({ contentKind: 'error' }),
      emotionalTension: 'tense-debug',
    })).toBe('Reviewing a memory persistence change. | emotional_tension:tense-debug')
  })
})
