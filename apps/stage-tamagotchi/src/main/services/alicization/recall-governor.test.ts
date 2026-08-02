import { describe, expect, it } from 'vitest'

import { buildRecallGovernor } from './recall-governor'

describe('buildRecallGovernor', () => {
  it('leaves scene-repair fragment limits to the recall owner without emitting recall switches', () => {
    const governor = buildRecallGovernor({
      now: 10_000,
      dialogueWorldThread: {
        activeThread: 'Repair the stale browser anchor before reply.',
        currentQuestion: 'What is on screen right now?',
        openLoops: ['What is on screen right now?'],
        recentlyResolvedLoops: [],
        carriedFacts: [],
        relationDrift: 'guarded',
        memoryMode: 'scene-anchored',
        recallKeys: ['current screen'],
        lastUserMove: 'What is on screen right now?',
        lastAssistantMove: 'The old browser anchor may be stale.',
        lastOutcome: 'repairing',
        pendingValidation: null,
        confidence: 0.9,
        narrative: [],
        updatedAt: 10_000,
      },
      conversationState: {
        jointThread: 'Repair the stale browser anchor before reply.',
        hostMove: 'What is on screen right now?',
        activeProject: null,
        unansweredQuestion: 'What is on screen right now?',
        owedRepair: 'The earlier browser anchor is stale.',
        activeCommitments: [],
        relationFrame: 'repair',
        continuityPolicy: 'scene-before-memory',
        memoryMode: 'scene-anchored',
        memoryQueryHints: ['current screen'],
        shouldHoldThread: true,
        confidence: 0.88,
        narrative: [],
        updatedAt: 10_000,
      },
      answerCompiler: {
        answerSubject: 'visible-scene',
        screenReferenceMode: 'required',
        speechObligation: 'repair-truth',
        relationMove: 'repair',
        turnMode: 'screen-repair',
        responseMode: 'repair-and-reanchor',
        recommendedAct: 'ask-reground',
        evidenceMode: 'repair-first',
        openingStyle: 'direct-correction',
        personaKernelMode: 'muted',
        relationshipPosture: 'restrained',
        openingDirective: 'Repair the stale anchor first.',
        openingClaim: 'The older screen anchor is stale.',
        supportingReality: [],
        uncertaintyBoundary: 'Need a fresh look.',
        careVector: null,
        nextMove: 'Ask for a fresh look.',
        labelCarryAsMemory: true,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.9,
        narrative: [],
        updatedAt: 10_000,
      },
    })

    expect(governor).toEqual(expect.objectContaining({
      mode: 'scene',
      carryAsMemory: true,
    }))
    expect(governor).not.toHaveProperty('recalledFragmentCap')
    expect(governor).not.toHaveProperty('recalledFragmentSourceBudget')
    expect(governor).not.toHaveProperty('suppressAssociativeRecall')
    expect(governor).not.toHaveProperty('allowActiveThoughts')
    expect(governor).not.toHaveProperty('allowRecalledFragments')
    expect(governor?.narrative.join(' | ')).not.toMatch(/(?:suppress|allow):(?:associative|active-thoughts|recalled-fragments)/u)
  })

  it('admits emotionally resonant memory when the live thread is felt rather than purely visual', () => {
    const governor = buildRecallGovernor({
      now: 20_000,
      dialogueWorldThread: {
        activeThread: 'The host is still drained from the late-night debugging session.',
        currentQuestion: null,
        openLoops: ['The session is still emotionally heavy.'],
        recentlyResolvedLoops: [],
        carriedFacts: ['late-night debugging'],
        relationDrift: 'warming',
        memoryMode: 'emotional-resonance',
        recallKeys: ['late-night debugging', 'emotional_tension:late-night-drain'],
        lastUserMove: '我有点累了',
        lastAssistantMove: '先停一下也可以。',
        lastOutcome: 'aligned',
        pendingValidation: null,
        confidence: 0.74,
        narrative: [],
        updatedAt: 20_000,
      },
      conversationState: {
        jointThread: 'The host is still drained from the late-night debugging session.',
        hostMove: 'I am getting tired.',
        activeProject: null,
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'care',
        continuityPolicy: 'answer-then-carry',
        memoryMode: 'emotional-resonance',
        memoryQueryHints: ['late-night debugging', 'fatigue'],
        shouldHoldThread: false,
        confidence: 0.72,
        narrative: [],
        updatedAt: 20_000,
      },
      replyDeliberation: {
        selectedMotive: 'care',
        speakingFrom: 'dialogue-bond',
        memoryMode: 'emotional-resonance',
        openingBeat: 'Acknowledge the host condition first.',
        whyThisReplyNow: 'The host is still carrying late-night drain.',
        whyNotOtherCandidates: [],
        withheldImpulses: [],
        candidateMotives: [],
        shouldSpeak: true,
        mustInclude: [],
        mustAvoid: [],
        confidence: 0.78,
        narrative: [],
        updatedAt: 20_000,
      },
      privateThought: {
        stance: 'care',
        confidence: 0.75,
        rationaleTags: ['late-night'],
        thoughtText: 'Stay near the host and keep the tone soft.',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        embodiedPresence: 'concerned',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'late-night-drain',
      },
      answerCompiler: {
      } as any,
    })

    expect(governor).toEqual(expect.objectContaining({
      mode: 'emotional-resonance',
      recalledFragmentCap: 3,
    }))
    expect(governor).not.toHaveProperty('suppressAssociativeRecall')
    expect(governor).not.toHaveProperty('allowActiveThoughts')
    expect(governor).not.toHaveProperty('allowRecalledFragments')
    expect(governor?.affectAnchors).toEqual(expect.arrayContaining([
      'emotional_tension:late-night-drain',
      'reply_motive:care',
    ]))
    expect(governor?.salienceBias).toBeGreaterThan(0.7)
    expect(governor?.recalledFragmentSourceBudget).toEqual(expect.arrayContaining([
      { sourceKind: 'reflection-ledger', maxItems: 2 },
      { sourceKind: 'dialogue-turn', maxItems: 1 },
      { sourceKind: 'fact-ledger', maxItems: 1 },
    ]))
    expect((governor?.recalledFragmentSourceBudget ?? []).every(item => item.maxItems > 0)).toBe(true)
  })

  it('treats rest-protective companionship as narrow self-continuity recall instead of broader emotional spill', () => {
    const governor = buildRecallGovernor({
      now: 22_000,
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'rest-protective-companionship',
        initiativeMode: 'rest-guard',
        memoryRecallMode: 'rest-protective-presence',
        embodimentTone: 'rest-protective',
        valence: 0.42,
        arousal: 0.14,
        guardedness: 0.68,
        closenessDrive: 0.46,
        repairNeed: 0.3,
        initiativePressure: 0.08,
        reasonTags: ['rest-protective', 'rest-protective-companionship'],
        why: 'Keep caring present, but let rest protection hold the line inward.',
      } as any,
      privateThought: {
        stance: 'accompany',
        confidence: 0.76,
        rationaleTags: ['rest-protective'],
        thoughtText: 'Stay quietly here and keep the same self line inward.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'concerned',
        expiresAt: 50_000,
        afterglowFromScenario: 'late-night-care',
        emotionalTension: 'late-night-drain',
      } as any,
      selfContinuityAuthority: {
        selfLine: '我仍然沿着这条更安静的内在线保持连续。',
        relationshipLine: 'Care should stay present without widening outward yet.',
        inwardLine: 'Let rest protection hold the line inward while I stay here.',
        habitLine: 'When the host is tired, I stay near without crowding.',
        authoritySummary: 'identity-continuity',
      } as any,
    })

    expect(governor).toEqual(expect.objectContaining({
      mode: 'self-continuity',
      recalledFragmentCap: 2,
      carryAsMemory: true,
      rationale: 'reason=self_continuity_rest_protection; recall_scope=narrow',
    }))
    expect(governor).not.toHaveProperty('suppressAssociativeRecall')
    expect(governor).not.toHaveProperty('allowActiveThoughts')
    expect(governor).not.toHaveProperty('allowRecalledFragments')
    expect(governor?.recalledFragmentSourceBudget).toEqual(expect.arrayContaining([
      { sourceKind: 'dialogue-turn', maxItems: 1 },
      { sourceKind: 'autobiographical-episode', maxItems: 1 },
      { sourceKind: 'reflection-ledger', maxItems: 1 },
      { sourceKind: 'mind-continuity', maxItems: 2 },
    ]))
    expect(governor?.recalledFragmentSourceBudget).not.toEqual(expect.arrayContaining([
      { sourceKind: 'dialogue-turn', maxItems: 2 },
      { sourceKind: 'fact-ledger', maxItems: 2 },
    ]))
    expect((governor?.recalledFragmentSourceBudget ?? []).every(item => item.maxItems > 0)).toBe(true)
    expect(governor?.affectAnchors).toEqual(expect.arrayContaining([
      'emotion:rest-protective-companionship',
      'emotion_memory_mode:rest-protective-presence',
      'emotion_tone:rest-protective',
      'emotional_tension:late-night-drain',
    ]))
  })

  it('injects live scene attachment cues into recall governor for task-thread recollection', () => {
    const governor = buildRecallGovernor({
      now: 25_000,
      dialogueWorldThread: {
        activeThread: 'Keep repairing the runtime seam in the current diff.',
        currentQuestion: 'Can you keep doing it the way you did before?',
        openLoops: ['repair the runtime seam'],
        recentlyResolvedLoops: [],
        carriedFacts: [],
        relationDrift: 'steady',
        memoryMode: 'task-thread',
        recallKeys: ['runtime seam', 'cli patch'],
        lastUserMove: '继续按之前那样修这个 runtime seam',
        lastAssistantMove: '我先沿着 diff 和 terminal patch flow 走。',
        lastOutcome: 'pending',
        pendingValidation: null,
        confidence: 0.82,
        narrative: [],
        updatedAt: 25_000,
      },
      conversationState: {
        jointThread: 'repair the runtime seam',
        hostMove: '继续按之前那样修这个 runtime seam',
        activeProject: 'runtime seam',
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'guide',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['runtime seam', 'cli patch'],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: [],
        updatedAt: 25_000,
      },
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        recommendedAct: 'answer',
        labelCarryAsMemory: false,
      } as any,
      replyDeliberation: {
        selectedMotive: 'guide',
        speakingFrom: 'task-thread',
        memoryMode: 'task-thread',
        openingBeat: 'Continue from the known seam.',
        whyThisReplyNow: 'The host wants the earlier working procedure reused in the same live workspace.',
        whyNotOtherCandidates: [],
        withheldImpulses: [],
        candidateMotives: [],
        shouldSpeak: true,
        mustInclude: [],
        mustAvoid: [],
        confidence: 0.8,
        narrative: [],
        updatedAt: 25_000,
      },
      sceneContext: {
        cueSummary: 'Cursor diff lane with terminal patch flow',
        appName: 'Cursor',
        processName: 'Cursor',
        targetTitle: 'runtime.ts diff',
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'diff',
      },
    })

    expect(governor?.sceneAnchor).toContain('Cursor diff lane with terminal patch flow')
    expect(governor?.sceneAnchor).toContain('runtime.ts diff')
    expect(governor?.recollectionIntent?.queryHints).toEqual(expect.arrayContaining([
      'Cursor diff lane with terminal patch flow',
      'runtime.ts diff',
      'Cursor',
      'scene:coding',
    ]))
  })

  it('carries scene familiarity, mood carry, and embodied cadence as explicit recall state', () => {
    const governor = buildRecallGovernor({
      now: 40_000,
      dialogueWorldThread: {
        activeThread: 'Keep holding the late-night coding seam.',
        currentQuestion: '为什么这时候又会想起那条线',
        openLoops: ['late-night coding seam'],
        recentlyResolvedLoops: [],
        carriedFacts: [],
        relationDrift: 'warming',
        memoryMode: 'emotional-resonance',
        recallKeys: ['late-night coding seam'],
        lastUserMove: '为什么这时候又会想起那条线',
        lastAssistantMove: '因为那条线的余温还在。',
        lastOutcome: 'aligned',
        pendingValidation: null,
        confidence: 0.8,
        narrative: [],
        updatedAt: 40_000,
      },
      conversationState: {
        jointThread: 'late-night coding seam',
        hostMove: '为什么这时候又会想起那条线',
        activeProject: 'runtime seam',
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'care',
        continuityPolicy: 'answer-then-carry',
        memoryMode: 'emotional-resonance',
        memoryQueryHints: ['late-night coding seam', 'afterglow'],
        shouldHoldThread: true,
        confidence: 0.78,
        narrative: [],
        updatedAt: 40_000,
      },
      replyDeliberation: {
        selectedMotive: 'care',
        speakingFrom: 'held-memory',
        memoryMode: 'emotional-resonance',
        openingBeat: 'Hold the lingering line softly.',
        whyThisReplyNow: 'The line is still emotionally warm.',
        whyNotOtherCandidates: [],
        withheldImpulses: [],
        candidateMotives: [],
        shouldSpeak: true,
        mustInclude: [],
        mustAvoid: [],
        confidence: 0.8,
        narrative: [],
        updatedAt: 40_000,
      },
      privateThought: {
        stance: 'accompany',
        confidence: 0.78,
        rationaleTags: ['afterglow'],
        thoughtText: 'The late-night seam is still warm enough to tug on me.',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        embodiedPresence: 'glance',
        expiresAt: 70_000,
        afterglowFromScenario: 'coding',
        emotionalTension: 'late-night-drain',
      },
      mindEcology: {
        moodLabel: 'afterglow',
        replyHabit: 'hover-first',
        relationshipHabit: 'stay-near',
        explorationHabit: 'follow-thread',
        regulationHabit: 'soften-before-speaking',
        temperament: {
          attachment: 0.66,
          curiosity: 0.42,
          steadiness: 0.58,
          directness: 0.3,
          playfulness: 0.18,
          irritability: 0.1,
          tenderness: 0.72,
        },
        climate: {
          valence: 0.48,
          arousal: 0.36,
          socialNeed: 0.62,
          solitudeNeed: 0.28,
          irritation: 0.1,
          restlessness: 0.16,
          reflectivePull: 0.74,
        },
        selfNarrative: 'Stay near the line without forcing it open.',
        relationNarrative: 'Let the shared afterglow breathe.',
        currentPreoccupation: 'late-night seam',
        learnedAdjustments: [],
        recurringPatterns: [],
        updatedAt: 40_000,
      } as any,
      personalityContinuityState: {
        currentRegime: 'late-night-care',
        rhythmState: {
          cadenceMode: 'cooldown',
          restMode: 'rest-protective',
          embodiedPresence: 'concerned',
          suggestedStyle: 'gentle-care',
          moodLabel: 'afterglow',
          emotionalTension: 'late-night-drain',
          cadencePressure: 0.28,
          restPressure: 0.82,
          memoryResonance: 0.74,
          companionshipTempo: 0.52,
          summary: 'cadence:cooldown | rest:rest-protective | mood:afterglow | tension:late-night-drain | presence:concerned',
          rationale: ['Protect rest before reopening the seam.'],
        },
      } as any,
      sceneContext: {
        cueSummary: 'Cursor late-night diff lane',
        appName: 'Cursor',
        processName: 'Cursor',
        targetTitle: 'runtime.ts diff',
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'diff',
      },
    })

    expect(governor?.sceneFamiliarityHint).toBeGreaterThan(0.4)
    expect(governor?.affectiveCarry).toEqual(expect.objectContaining({
      moodLabel: 'afterglow',
      emotionalTension: 'late-night-drain',
    }))
    expect(governor?.affectiveCarry?.summary).toContain('rhythm:cadence:cooldown')
    expect(governor?.affectAnchors).toEqual(expect.arrayContaining([
      'rhythm_mood:afterglow',
      'rhythm_tension:late-night-drain',
      'rhythm_cadence:cooldown',
    ]))
    expect(governor?.embodiedCarry).toEqual(expect.objectContaining({
      presence: 'glance',
      afterglowFromScenario: 'coding',
      suggestedStyle: 'gentle-care',
    }))
  })

  it('lets affective residue become explicit recollection guidance even when private-thought emotion is still implicit', () => {
    const governor = buildRecallGovernor({
      now: 48_000,
      dialogueWorldThread: {
        activeThread: 'why does this feel the same again',
        currentQuestion: '为什么这次又感觉像上次那样了',
        openLoops: ['same-feeling seam'],
        recentlyResolvedLoops: [],
        carriedFacts: [],
        relationDrift: 'warming',
        memoryMode: 'emotional-resonance',
        recallKeys: ['same-feeling seam'],
        lastUserMove: '为什么这次又感觉像上次那样了',
        lastAssistantMove: '先别急着把那条感觉推开。',
        lastOutcome: 'aligned',
        pendingValidation: null,
        confidence: 0.8,
        narrative: [],
        updatedAt: 48_000,
      },
      conversationState: {
        jointThread: 'same-feeling seam',
        hostMove: '为什么这次又感觉像上次那样了',
        activeProject: null,
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'care',
        continuityPolicy: 'answer-then-carry',
        memoryMode: 'emotional-resonance',
        memoryQueryHints: ['same-feeling seam'],
        shouldHoldThread: true,
        confidence: 0.78,
        narrative: [],
        updatedAt: 48_000,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
      } as any,
      replyDeliberation: {
        selectedMotive: 'care',
        speakingFrom: 'held-memory',
        memoryMode: 'emotional-resonance',
        openingBeat: 'Hold the lingering line softly.',
        whyThisReplyNow: 'The current feeling is pulling on an older seam.',
        whyNotOtherCandidates: [],
        withheldImpulses: [],
        candidateMotives: [],
        shouldSpeak: true,
        mustInclude: [],
        mustAvoid: [],
        confidence: 0.74,
        narrative: [],
        updatedAt: 48_000,
      } as any,
      privateThought: {
        stance: 'care',
        confidence: 0.76,
        rationaleTags: ['felt-continuity'],
        thoughtText: 'something old is tugging here',
        shouldSpeak: true,
        suggestedStyle: 'gentle-care',
        embodiedPresence: 'hesitant',
        expiresAt: 60_000,
        afterglowFromScenario: 'late-night-care',
        emotionalTension: null,
      } as any,
      mindEcology: {
        moodLabel: 'guarded-nearby',
        replyHabit: 'hover-first',
        relationshipHabit: 'stay-near',
        explorationHabit: 'follow-thread',
        regulationHabit: 'soften-before-speaking',
        temperament: {
          attachment: 0.62,
          curiosity: 0.34,
          steadiness: 0.58,
          directness: 0.28,
          playfulness: 0.14,
          irritability: 0.08,
          tenderness: 0.72,
        },
        climate: {
          valence: 0.18,
          arousal: 0.32,
          socialNeed: 0.64,
          solitudeNeed: 0.42,
          irritation: 0.08,
          restlessness: 0.18,
          reflectivePull: 0.76,
        },
        selfNarrative: 'Stay close to the seam without forcing it open.',
        relationNarrative: 'Protect the room before asking for more warmth.',
        currentPreoccupation: 'same-feeling seam',
        learnedAdjustments: [],
        recurringPatterns: [],
        updatedAt: 48_000,
        affectiveResidue: {
          dominantResidueKind: 'rest-protective',
          summary: 'Rest-protective residue is leading, so companionship must stay low-pressure.',
          relationshipCadence: {
            cadenceMode: 'cooldown',
            distancePosture: 'protect-space',
            companionshipDensity: 0.22,
            repairRecovery: 0.44,
            overreachRisk: 0.63,
            fatigueGuard: 0.71,
            afterglowCarry: 0.18,
            shouldDelayWarmth: true,
            shouldProtectRest: true,
            reasonTags: ['cadence-mode:cooldown', 'distance:protect-space'],
            summary: 'Rest protection should lead the line before warmth widens again.',
          },
          residues: [{
            kind: 'rest-protective',
            intensity: 0.76,
            persistence: 0.72,
            confidence: 0.8,
            polarity: 'protective',
            releaseMode: 'delay-until-open-window',
            summary: 'The room is still tired and easier to crowd than it looks.',
            sourceSignals: ['rest', 'late-night', 'protect space'],
            lastUpdatedAt: 1_000,
          }],
        },
      } as any,
    })

    expect(governor?.recollectionIntent?.mode).toBe('autobiographical-history')
    expect(governor?.recollectionIntent?.queryHints).toEqual(expect.arrayContaining([
      'affect:rest-protective',
      'cadence:cooldown',
      'distance:protect-space',
    ]))
    expect(governor?.recollectionIntent?.rationale).toBe('recollection:autobiographical-history:affective-residue')
  })

  it('keeps dialogue-first attune turns thread-bound unless self-carry is explicitly eligible', () => {
    const governor = buildRecallGovernor({
      now: 30_000,
      dialogueWorldThread: {
        activeThread: '你在说什么呢',
        currentQuestion: '你在说什么呢',
        openLoops: [],
        recentlyResolvedLoops: [],
        carriedFacts: ['old browser tab'],
        relationDrift: 'warming',
        memoryMode: 'dialogue-carry',
        recallKeys: ['old browser tab'],
        lastUserMove: '你在说什么呢',
        lastAssistantMove: '上一轮有点串台。',
        lastOutcome: 'repairing',
        pendingValidation: null,
        confidence: 0.82,
        narrative: [],
        updatedAt: 30_000,
      },
      conversationState: {
        jointThread: '你在说什么呢',
        hostMove: '你在说什么呢',
        activeProject: null,
        unansweredQuestion: '你在说什么呢',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'answer-then-carry',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['你在说什么呢'],
        shouldHoldThread: false,
        primaryTurnAnchor: '你在说什么呢',
        primaryTurnAnchorSource: 'user-text',
        carryEligible: false,
        carryReason: null,
        confidence: 0.8,
        narrative: [],
        updatedAt: 30_000,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        labelCarryAsMemory: false,
      } as any,
      replyDeliberation: {
        selectedMotive: 'attune',
        speakingFrom: 'dialogue-bond',
        memoryMode: 'dialogue-carry',
        openingBeat: 'Answer the host directly.',
        whyThisReplyNow: 'The host wants this sentence answered plainly.',
        whyNotOtherCandidates: [],
        withheldImpulses: [],
        candidateMotives: [],
        shouldSpeak: true,
        mustInclude: [],
        mustAvoid: [],
        confidence: 0.76,
        narrative: [],
        updatedAt: 30_000,
      },
      dialogueEncounter: {
        subject: 'relationship',
        screenReferenceMode: 'avoid',
        dialogueFirst: true,
        taskAnchor: '你在说什么呢',
        summary: '你在说什么呢',
        mustAnswerDirectly: true,
        mustStayTaskBound: true,
      } as any,
    })

    expect(governor).toEqual(expect.objectContaining({
      mode: 'thread',
      carryAsMemory: false,
    }))
    expect(governor).not.toHaveProperty('recalledFragmentCap')
    expect(governor).not.toHaveProperty('recalledFragmentSourceBudget')
    expect(governor).not.toHaveProperty('suppressAssociativeRecall')
    expect(governor).not.toHaveProperty('allowActiveThoughts')
    expect(governor).not.toHaveProperty('allowRecalledFragments')
    expect(governor?.recallSeed).toContain('你在说什么呢')
    expect(governor?.rationale).toContain('reason=current_turn_anchor_priority')
  })

  it('admits self-continuity recall with source budget when dialogue-first carry is eligible', () => {
    const governor = buildRecallGovernor({
      now: 40_000,
      dialogueWorldThread: {
        activeThread: '你刚才问我在说什么',
        currentQuestion: '你刚才在说什么？',
        openLoops: [],
        recentlyResolvedLoops: [],
        carriedFacts: ['上轮是关系向澄清'],
        relationDrift: 'warming',
        memoryMode: 'dialogue-carry',
        recallKeys: ['你刚才在说什么', 'reply_motive:attune'],
        lastUserMove: '你刚才在说什么？',
        lastAssistantMove: '我在说明上一轮的语义边界。',
        lastOutcome: 'aligned',
        pendingValidation: null,
        confidence: 0.86,
        narrative: [],
        updatedAt: 40_000,
      },
      conversationState: {
        jointThread: '你刚才问我在说什么',
        hostMove: '你刚才在说什么？',
        activeProject: null,
        unansweredQuestion: '你刚才在说什么？',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'answer-then-carry',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['你刚才在说什么'],
        shouldHoldThread: false,
        primaryTurnAnchor: '你刚才在说什么？',
        primaryTurnAnchorSource: 'user-text',
        carryEligible: true,
        carryReason: 'self continuity requested by host',
        confidence: 0.82,
        narrative: [],
        updatedAt: 40_000,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        labelCarryAsMemory: false,
      } as any,
      replyDeliberation: {
        selectedMotive: 'attune',
        speakingFrom: 'dialogue-bond',
        memoryMode: 'dialogue-carry',
        openingBeat: 'Directly explain the immediate context.',
        whyThisReplyNow: 'The host asks for immediate self continuity.',
        whyNotOtherCandidates: [],
        withheldImpulses: [],
        candidateMotives: [],
        shouldSpeak: true,
        mustInclude: [],
        mustAvoid: [],
        confidence: 0.78,
        narrative: [],
        updatedAt: 40_000,
      },
      dialogueEncounter: {
        subject: 'relationship',
        screenReferenceMode: 'avoid',
        dialogueFirst: true,
        taskAnchor: '你刚才在说什么？',
        summary: '你刚才在说什么？',
        mustAnswerDirectly: true,
        mustStayTaskBound: true,
      } as any,
    })

    expect(governor).toEqual(expect.objectContaining({
      mode: 'self-continuity',
      recalledFragmentCap: 2,
      carryAsMemory: true,
    }))
    expect(governor).not.toHaveProperty('suppressAssociativeRecall')
    expect(governor).not.toHaveProperty('allowActiveThoughts')
    expect(governor).not.toHaveProperty('allowRecalledFragments')
    expect(governor?.recalledFragmentSourceBudget).toEqual(expect.arrayContaining([
      { sourceKind: 'dialogue-turn', maxItems: 2 },
      { sourceKind: 'fact-ledger', maxItems: 2 },
      { sourceKind: 'reflection-ledger', maxItems: 1 },
      { sourceKind: 'mind-continuity', maxItems: 2 },
    ]))
  })

  it('uses self-continuity evidence for mode selection without copying authority prose into recall planning', () => {
    const governor = buildRecallGovernor({
      now: 45_000,
      dialogueWorldThread: {
        activeThread: '你现在还是同一个你吗',
        currentQuestion: '你现在还是同一个你吗？',
        openLoops: [],
        recentlyResolvedLoops: [],
        carriedFacts: [],
        relationDrift: 'warming',
        memoryMode: 'dialogue-carry',
        recallKeys: ['同一个她'],
        lastUserMove: '你现在还是同一个你吗？',
        lastAssistantMove: '我会从现在这一条线回答。',
        lastOutcome: 'aligned',
        pendingValidation: null,
        confidence: 0.82,
        narrative: [],
        updatedAt: 45_000,
      },
      conversationState: {
        jointThread: '你现在还是同一个你吗',
        hostMove: '你现在还是同一个你吗？',
        activeProject: null,
        unansweredQuestion: '你现在还是同一个你吗？',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'answer-then-carry',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: false,
        confidence: 0.8,
        narrative: [],
        updatedAt: 45_000,
      },
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        labelCarryAsMemory: false,
      } as any,
      replyDeliberation: {
        selectedMotive: 'attune',
        speakingFrom: 'dialogue-bond',
        memoryMode: 'dialogue-carry',
        openingBeat: 'Answer from the current self line directly.',
        whyThisReplyNow: 'The host is asking whether the same self is still here.',
        whyNotOtherCandidates: [],
        withheldImpulses: [],
        candidateMotives: [],
        shouldSpeak: true,
        mustInclude: [],
        mustAvoid: [],
        confidence: 0.78,
        narrative: [],
        updatedAt: 45_000,
      },
      selfContinuityAuthority: {
        selfLine: '我仍然把连续性活在这一条线上。',
        relationshipLine: 'Our bond stays truest when I answer from the same line directly.',
        inwardLine: 'The inward line is still calm and legible.',
        habitLine: 'Return to the same line before widening.',
        authoritySummary: 'identity-continuity',
        closenessPosture: 'measured-room',
      } as any,
    })

    expect(governor?.mode).toBe('self-continuity')
    expect(governor?.carryAsMemory).toBe(true)
    expect(governor?.recallSeed).not.toContain('把连续性活在这一条线上')
    expect(governor?.recallSeed).not.toContain('identity-continuity')
    expect(governor?.narrative.join(' ')).not.toContain('self-authority')
    expect(governor?.rationale).not.toContain('Self authority')
  })

  it('prefers repair-grounding recall when the emotional kernel says repair-tension even if older cues alone would have looked like ordinary thread carry', () => {
    const governor = buildRecallGovernor({
      now: 50_000,
      dialogueWorldThread: {
        activeThread: 'The same repair line is still open.',
        currentQuestion: null,
        openLoops: ['repair line still open'],
        recentlyResolvedLoops: [],
        carriedFacts: [],
        relationDrift: 'repairing',
        memoryMode: 'dialogue-carry',
        recallKeys: ['repair line'],
        lastUserMove: '继续',
        lastAssistantMove: '我还在这条线里。',
        lastOutcome: 'repairing',
        pendingValidation: null,
        confidence: 0.72,
        narrative: [],
        updatedAt: 50_000,
      },
      conversationState: {
        jointThread: 'The same repair line is still open.',
        hostMove: '继续',
        activeProject: null,
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'repair',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['repair line'],
        shouldHoldThread: true,
        confidence: 0.72,
        narrative: [],
        updatedAt: 50_000,
      },
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'repair-tension',
        initiativeMode: 'repair',
        memoryRecallMode: 'repair-grounding',
        embodimentTone: 'repair-before-closeness',
        valence: 0.32,
        arousal: 0.54,
        guardedness: 0.72,
        closenessDrive: 0.36,
        repairNeed: 0.76,
        initiativePressure: 0.34,
        reasonTags: ['repair-before-closeness'],
        why: 'repair-first',
      },
    } as any)

    expect(governor?.mode).toBe('scene')
    expect(governor?.affectAnchors).toEqual(expect.arrayContaining([
      'emotion:repair-tension',
      'emotion_memory_mode:repair-grounding',
      'emotion_tone:repair-before-closeness',
    ]))
    expect(governor?.affectiveCarry?.summary).toContain('repair-tension')
  })

  it('still builds a scene recall governor from a repair-first emotional kernel even when no dialogue seam has formed yet', () => {
    const governor = buildRecallGovernor({
      now: 60_000,
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'repair-tension',
        initiativeMode: 'repair',
        memoryRecallMode: 'repair-grounding',
        embodimentTone: 'repair-before-closeness',
        valence: 0.32,
        arousal: 0.54,
        guardedness: 0.72,
        closenessDrive: 0.36,
        repairNeed: 0.76,
        initiativePressure: 0.34,
        reasonTags: ['repair-before-closeness'],
        why: 'repair-first',
      },
      privateThought: {
        thoughtText: 'Let repair settle before closeness widens again.',
        emotionalTension: 'soft-covision',
        shouldSpeak: false,
        stance: 'care',
        rationaleTags: ['repair-before-closeness'],
      } as any,
      sceneContext: {
        cueSummary: 'later repair coding seam after callback cooldown',
        appName: 'Cursor',
        processName: 'Cursor',
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'error',
      },
    } as any)

    expect(governor?.mode).toBe('scene')
    expect(governor?.affectAnchors).toEqual(expect.arrayContaining([
      'emotion:repair-tension',
      'emotion_memory_mode:repair-grounding',
      'emotion_tone:repair-before-closeness',
    ]))
    expect(governor?.sceneAnchor).toContain('later repair coding seam after callback cooldown')
    expect(governor?.rationale).toContain('reason=scene_grounding_priority')
  })

  it('still builds a lower-pressure no-seam recall governor from a measured-return emotional kernel without promoting it into repair-first', () => {
    const governor = buildRecallGovernor({
      now: 70_000,
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'measured-companionship',
        initiativeMode: 'observe',
        memoryRecallMode: 'low-pressure-presence',
        embodimentTone: 'measured-return',
        valence: 0.58,
        arousal: 0.28,
        guardedness: 0.14,
        closenessDrive: 0.28,
        repairNeed: 0.05,
        initiativePressure: 0.15,
        reasonTags: ['measured-return', 'quiet-companionship'],
        why: 'lower-pressure',
      },
      privateThought: {
        thoughtText: 'Stay on the same line and keep the return lower-pressure.',
        emotionalTension: 'soft-covision',
        shouldSpeak: false,
        stance: 'accompany',
        rationaleTags: ['continuity-inward-carry'],
      } as any,
      sceneContext: {
        cueSummary: 'same callback line still lives here',
        appName: 'Code',
        processName: 'Code',
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'diff',
      },
    } as any)

    expect(governor?.mode).toBe('self-continuity')
    expect(governor?.affectAnchors).toEqual(expect.arrayContaining([
      'emotion:measured-companionship',
      'emotion_memory_mode:low-pressure-presence',
      'emotion_tone:measured-return',
    ]))
    expect(governor).not.toHaveProperty('suppressAssociativeRecall')
    expect(governor).not.toHaveProperty('allowActiveThoughts')
    expect(governor).not.toHaveProperty('allowRecalledFragments')
    expect(governor?.rationale).not.toContain('repair')
  })
})
