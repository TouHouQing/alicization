import { describe, expect, it } from 'vitest'

import {
  buildVisualRecallSeed,
  buildVisualSedimentFragment,
  normalizeVisualPresenceState,
  updateVisualPresenceState,
  visualWorkingMemoryTtlMs,
} from './visual-episodic-memory'

describe('visual episodic memory', () => {
  it('prunes expired working memory episodes on normalization', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [
        {
          scene: 'coding:error',
          summary: 'old',
          beganAt: 0,
          endedAt: 0,
          confidence: 0.8,
          emotionalTension: 'tense-debug',
          sedimentCandidate: false,
        },
        {
          scene: 'coding:diff',
          summary: 'fresh',
          beganAt: visualWorkingMemoryTtlMs - 1_000,
          endedAt: visualWorkingMemoryTtlMs - 1_000,
          confidence: 0.8,
          emotionalTension: 'focused-flow',
          sedimentCandidate: false,
        },
      ],
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: visualWorkingMemoryTtlMs + 100,
    }, visualWorkingMemoryTtlMs + 100)

    expect(state.workingMemoryEpisodes).toHaveLength(1)
    expect(state.workingMemoryEpisodes[0]?.summary).toBe('fresh')
  })

  it('derives resident performance during normalization for older persisted states', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'invited-inspection',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'Inspect the current diff carefully.',
        source: 'screen-semantic-summary',
        confidence: 0.86,
        beganAt: 9_000,
        lastSeenAt: 10_000,
      },
      attention: {
        target: null,
        source: 'foreground-window',
        confidence: 0.74,
        engagedAt: 9_000,
        lastConfirmedAt: 10_000,
        dwellMs: 1_000,
      },
      workingMemoryEpisodes: [],
      privateThought: {
        stance: 'observe',
        confidence: 0.81,
        rationaleTags: ['inspection'],
        thoughtText: 'Stay on the diff.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 16_000,
        emotionalTension: 'focused-flow',
      },
      captureState: { permission: 'granted', lastGroundedAt: 10_000 },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 20_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.residentPerformance).toMatchObject({
      version: 'resident-performance-v1',
      source: 'main-runtime',
      embodiedPresence: 'attentive',
      stance: 'observe',
      emotionalTension: 'focused-flow',
      performance: {
        baseEmotion: 'thinking',
        delivery: 'firm',
        emphasis: 2,
      },
    })
  })

  it('builds a sediment episode with emotional tension and recall seed', () => {
    const next = updateVisualPresenceState({
      now: 21 * 60_000,
      previousState: {
        watchMode: 'symbiotic-vision',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'error',
          scenario: 'coding',
          summary: 'TypeScript error panel',
          source: 'screen-semantic-summary',
          confidence: 0.92,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'proactive-policy.ts',
            pid: 5,
          },
          beganAt: 0,
          lastSeenAt: 20 * 60_000,
        },
        attention: {
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'proactive-policy.ts',
            pid: 5,
          },
          source: 'current-grounded-scene',
          confidence: 0.9,
          engagedAt: 0,
          lastConfirmedAt: 20 * 60_000,
          dwellMs: 20 * 60_000,
        },
        workingMemoryEpisodes: [],
        privateThought: {
          stance: 'nudge',
          confidence: 0.9,
          rationaleTags: ['semantic-friction'],
          thoughtText: 'debug',
          shouldSpeak: true,
          suggestedStyle: 'light-nudge',
          embodiedPresence: 'attentive',
          expiresAt: 21 * 60_000,
          afterglowFromScenario: null,
          emotionalTension: 'tense-debug',
        },
        captureState: { permission: 'granted', lastGroundedAt: 10_000 },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 10_000,
        updatedAt: 20 * 60_000,
      },
      watchMode: 'mnemonic-passive',
      scene: null,
      attention: null,
      privateThought: null,
      captureState: { permission: 'granted', lastGroundedAt: 10_000 },
      nextSuggestedProbeMs: 45_000,
    })

    expect(next.workingMemoryEpisodes).toHaveLength(1)
    expect(next.workingMemoryEpisodes[0]?.emotionalTension).toBe('tense-debug')
    expect(next.workingMemoryEpisodes[0]?.sedimentCandidate).toBe(true)
    expect(buildVisualSedimentFragment(next.workingMemoryEpisodes[0]!)).toContain('emotional_tension:tense-debug')
    expect(buildVisualRecallSeed({
      scene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'TypeScript error panel',
        source: 'screen-semantic-summary',
        confidence: 0.92,
        beganAt: 0,
        lastSeenAt: 0,
      },
      emotionalTension: 'tense-debug',
    })).toContain('emotional_tension:tense-debug')
  })

  it('keeps only the latest eight episodes', () => {
    let previousState = normalizeVisualPresenceState({}, 0)
    for (let index = 0; index < 10; index += 1) {
      previousState = updateVisualPresenceState({
        now: index + 1,
        previousState: {
          ...previousState,
          currentScene: {
            workloadKind: 'browser',
            contentKind: 'unknown',
            scenario: 'general',
            summary: `scene-${index}`,
            source: 'foreground-window-heuristic',
            confidence: 0.6,
            beganAt: index,
            lastSeenAt: index,
          },
          privateThought: {
            stance: 'accompany',
            confidence: 0.6,
            rationaleTags: [],
            thoughtText: 'observe',
            shouldSpeak: false,
            suggestedStyle: 'silent-observe',
            embodiedPresence: 'glance',
            expiresAt: index + 100,
            afterglowFromScenario: null,
            emotionalTension: 'calm-browse',
          },
        },
        watchMode: 'mnemonic-passive',
        scene: {
          workloadKind: 'browser',
          contentKind: 'unknown',
          scenario: 'general',
          summary: `scene-${index + 1}`,
          source: 'foreground-window-heuristic',
          confidence: 0.6,
          beganAt: index + 1,
          lastSeenAt: index + 1,
        },
        attention: null,
        privateThought: null,
        nextSuggestedProbeMs: 45_000,
      })
    }

    expect(previousState.workingMemoryEpisodes).toHaveLength(8)
  })

  it('persists world ontology and initiative arbitration snapshots', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      worldOntology: {
        dominantFrame: 'live',
        truthPriority: ['live', 'remembered'],
        live: {
          kind: 'live',
          summary: 'A live coding scene is grounded.',
          confidence: 0.84,
          stability: 0.82,
          focusThreadId: 'thread::live',
          evidence: ['source:grounded-scene'],
        },
        remembered: null,
        imagined: null,
        updatedAt: 10_000,
      },
      initiativeArbitration: {
        selectedProposalId: 'counterfactual:repair',
        dominantConflict: 'live-truth vs surface',
        proposals: [{
          id: 'counterfactual:repair',
          source: 'counterfactual',
          truthFrame: 'live',
          action: 'recheck',
          style: 'silent-observe',
          embodiedPresence: 'hesitant',
          truthCost: 0.02,
          interruptionCost: 0.04,
          relationshipCost: 0.03,
          continuityGain: 0.08,
          confidence: 0.72,
          score: 0.7,
          shouldSpeak: false,
          shouldSurface: true,
          why: 'Repair the current read before speaking.',
        }],
        updatedAt: 10_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.worldOntology?.dominantFrame).toBe('live')
    expect(state.initiativeArbitration?.selectedProposalId).toBe('counterfactual:repair')
    expect(state.initiativeArbitration?.proposals[0]?.action).toBe('recheck')
  })

  it('normalizes and carries the current conscious frame snapshot', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'witness',
        truthDiscipline: 'observe-then-hypothesize',
        consciousNeed: 'Start from what is visible before naming the task.',
        consciousTension: 'The scene is still too coarse for class-level certainty.',
        speakingIntention: 'Separate observation from guess and keep the guess soft.',
        focusAnchor: 'Git commit diff in Java code editor',
        withheldImpulse: 'Do not collapse coarse visual evidence into file, class, or field certainty.',
        shouldWithholdSpecificity: true,
        shouldSelfRevise: false,
        confidence: 0.84,
        reasonTags: ['discipline:observe-then-hypothesize'],
        updatedAt: 10_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.currentConsciousFrame?.truthDiscipline).toBe('observe-then-hypothesize')
    expect(state.currentConsciousFrame?.shouldWithholdSpecificity).toBe(true)
    expect(state.currentConsciousFrame?.speakingIntention).toContain('guess')
  })

  it('normalizes and carries the claim evidence ledger snapshot', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
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
        confidence: 0.82,
        reasonTags: ['budget:coarse-scene'],
        updatedAt: 10_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.claimEvidenceLedger?.specificityBudget).toBe('coarse-scene')
    expect(state.claimEvidenceLedger?.shouldLabelHypothesis).toBe(true)
    expect(state.claimEvidenceLedger?.observedSurface).toContain('Java')
  })

  it('normalizes and carries conversation state with reply deliberation', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      conversationState: {
        jointThread: 'The host is still asking about the current diff.',
        hostMove: 'What is wrong with this diff?',
        activeProject: 'ProjectAtlas diff',
        unansweredQuestion: 'What is wrong with this diff?',
        owedRepair: null,
        activeCommitments: ['Explain the current diff first.'],
        relationFrame: 'guide',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['ProjectAtlas diff'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: [],
        updatedAt: 10_000,
      },
      dialogueWorldThread: {
        activeThread: 'The host is still asking about the current diff.',
        currentQuestion: 'What is wrong with this diff?',
        openLoops: ['What is wrong with this diff?'],
        recentlyResolvedLoops: [],
        carriedFacts: ['ProjectAtlas diff'],
        relationDrift: 'steady',
        memoryMode: 'task-thread',
        recallKeys: ['ProjectAtlas diff', 'reply_motive:guide'],
        lastUserMove: 'What is wrong with this diff?',
        lastAssistantMove: 'Pay off the current knot first.',
        lastOutcome: 'pending',
        pendingValidation: {
          question: 'What is wrong with this diff?',
          expectedMode: 'guide',
          openedAt: 10_000,
        },
        confidence: 0.8,
        narrative: [],
        updatedAt: 10_000,
      },
      replyDeliberation: {
        selectedMotive: 'guide',
        speakingFrom: 'task-thread',
        memoryMode: 'task-thread',
        openingBeat: 'Pay off the current knot first.',
        whyThisReplyNow: 'The current diff is still unresolved.',
        whyNotOtherCandidates: [],
        withheldImpulses: ['withhold-associative-recall-noise'],
        candidateMotives: [{
          kind: 'guide',
          summary: 'Explain the current diff before moving on.',
          weight: 0.84,
          sourceTags: ['conversation-state'],
        }],
        shouldSpeak: true,
        mustInclude: ['Pay off the current knot first.'],
        mustAvoid: ['Do not drift away from the diff.'],
        confidence: 0.84,
        narrative: [],
        updatedAt: 10_000,
      },
      recallGovernor: {
        mode: 'thread',
        recallSeed: 'ProjectAtlas diff | What is wrong with this diff?',
        suppressAssociativeRecall: true,
        allowActiveThoughts: true,
        allowRecalledFragments: false,
        recalledFragmentCap: 3,
        recalledFragmentSourceBudget: [
          { sourceKind: 'dialogue-turn', maxItems: 2 },
          { sourceKind: 'fact-ledger', maxItems: 1 },
        ],
        carryAsMemory: false,
        rationale: 'Carry the current thread without admitting associative recall.',
        narrative: [],
        updatedAt: 10_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.conversationState?.memoryMode).toBe('task-thread')
    expect(state.dialogueWorldThread?.lastOutcome).toBe('pending')
    expect(state.replyDeliberation?.selectedMotive).toBe('guide')
    expect(state.replyDeliberation?.speakingFrom).toBe('task-thread')
    expect(state.recallGovernor?.mode).toBe('thread')
    expect(state.recallGovernor?.recalledFragmentCap).toBe(0)
    expect(state.recallGovernor?.recalledFragmentSourceBudget).toEqual([])
  })

  it('normalizes and carries dialogue act kernel snapshots', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      dialogueActKernel: {
        subject: 'task-knot',
        hostGoal: 'resolve-problem',
        relationNeed: 'guidance',
        activeProject: 'VS Code diff',
        truthMode: 'live-grounded',
        speechAct: 'guide',
        turnMode: 'guide-current-knot',
        screenReferenceMode: 'helpful',
        speakingFrom: 'task-thread',
        selectedEvidence: [{
          kind: 'scene',
          source: 'current-scene',
          summary: 'VS Code diff with missing guard',
          confidence: 0.9,
        }],
        openingClaim: 'The missing guard is the current issue.',
        openingMove: 'State the missing guard first.',
        whyNow: 'The host is asking about the active diff.',
        mustSay: ['Answer the current diff directly.'],
        mustAvoid: ['Do not answer from stale residue.'],
        sourceTrace: ['speech-act:guide'],
        confidence: 0.9,
        updatedAt: 1,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 1,
    }, 1)

    const next = updateVisualPresenceState({
      now: 2,
      previousState: state,
      watchMode: 'mnemonic-passive',
      scene: null,
      attention: null,
      privateThought: null,
      nextSuggestedProbeMs: 45_000,
    })

    expect(state.dialogueActKernel?.speechAct).toBe('guide')
    expect(next.dialogueActKernel?.openingClaim).toContain('current issue')
    expect(next.dialogueActKernel?.selectedEvidence[0]?.summary).toContain('missing guard')
  })

  it('normalizes and persists dialogue encounter snapshots', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      dialogueEncounter: {
        act: 'continue-thread',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        subject: 'general',
        screenReferenceMode: 'avoid',
        continuityMode: 'dialogue-first',
        inspectionRequested: false,
        inspectionState: 'dialogue-first',
        releaseInspectionCarry: true,
        taskAnchor: '屏幕相关对话还在串台',
        summary: '屏幕相关对话还在串台',
        dialogueFirst: true,
        shouldBypassScreenRepair: true,
        mustRepairFirst: false,
        mustAnswerDirectly: true,
        mustStayTaskBound: false,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'backgrounded',
        confidence: 0.82,
        reasonTags: ['dialogue-first-turn', 'subject:general'],
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 1,
    }, 1)

    const next = updateVisualPresenceState({
      now: 2,
      previousState: state,
      watchMode: 'mnemonic-passive',
      scene: null,
      attention: null,
      privateThought: null,
      nextSuggestedProbeMs: 45_000,
    })

    expect(state.dialogueEncounter?.summary).toBe('屏幕相关对话还在串台')
    expect(state.dialogueEncounter?.taskAnchor).toBe('屏幕相关对话还在串台')
    expect(next.dialogueEncounter?.screenReferenceMode).toBe('avoid')
    expect(next.dialogueEncounter?.mustAnswerDirectly).toBe(true)
  })

  it('normalizes recall governor fragment cap and source budget when recalled fragments are enabled', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      recallGovernor: {
        mode: 'emotional-resonance',
        recallSeed: 'late-night debugging',
        suppressAssociativeRecall: false,
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        recalledFragmentCap: 99,
        recalledFragmentSourceBudget: [
          { sourceKind: 'reflection-ledger', maxItems: 2 },
          { sourceKind: 'dialogue-turn', maxItems: 1 },
          { sourceKind: 'dialogue-turn', maxItems: 5 },
          { sourceKind: 'fact-ledger', maxItems: 1.6 },
          { sourceKind: 'unknown', maxItems: 4 },
        ],
        carryAsMemory: true,
        rationale: 'Carry resonant memory while staying answer-bound.',
        narrative: [],
        updatedAt: 10_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.recallGovernor?.allowRecalledFragments).toBe(true)
    expect(state.recallGovernor?.recalledFragmentCap).toBe(8)
    expect(state.recallGovernor?.recalledFragmentSourceBudget).toEqual([
      { sourceKind: 'reflection-ledger', maxItems: 2 },
      { sourceKind: 'dialogue-turn', maxItems: 1 },
      { sourceKind: 'fact-ledger', maxItems: 1 },
    ])
  })
})
