import { describe, expect, it } from 'vitest'

import { buildMemoryRecollectionIntent } from './memory-recollection-intent'

describe('memory recollection intent', () => {
  it('chooses execution-procedure recollection for task-thread reuse turns', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '按之前那样把这个 runtime 问题继续修掉',
      sceneContext: {
        cueSummary: 'Cursor diff lane with terminal patch flow',
        appName: 'Cursor',
        processName: 'Cursor',
        targetTitle: 'runtime.ts diff',
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'diff',
      },
      conversationState: {
        jointThread: 'continue runtime repair',
        hostMove: '按之前那样把这个 runtime 问题继续修掉',
        activeProject: 'runtime repair',
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'guide',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['runtime repair', 'patch'],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: [],
        updatedAt: 1,
      } as any,
      dialogueWorldThread: {
        activeThread: 'runtime repair',
        currentQuestion: null,
        openLoops: [],
        recentlyResolvedLoops: [],
        carriedFacts: [],
        relationDrift: 'steady',
        memoryMode: 'task-thread',
        recallKeys: ['runtime', 'patch'],
        lastUserMove: '按之前那样把这个 runtime 问题继续修掉',
        lastAssistantMove: '我们上次是先定位回调链路。',
        lastOutcome: 'aligned',
        confidence: 0.8,
        narrative: [],
        updatedAt: 1,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
      } as any,
    })

    expect(intent?.mode).toBe('execution-procedure')
    expect(intent?.temporalFocus).toBe('experience-matched')
    expect(intent?.searchProceduralExperience).toBe(true)
    expect(intent?.queryHints).toEqual(expect.arrayContaining([
      'Cursor diff lane with terminal patch flow',
      'runtime.ts diff',
      'Cursor',
      'scene:coding',
    ]))
    expect(intent?.recollectionAgenda?.candidateTimeScopes.every(item => (item.rationale ?? '').startsWith('time-scope:'))).toBe(true)
    expect(intent?.recollectionAgenda?.candidateEraFacets.every(item => (item.rationale ?? '').startsWith('era-facet:'))).toBe(true)
  })

  it('chooses relationship history recollection for bond-history turns', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '你之前也是这样回应我的吗',
      answerCompiler: {
        answerSubject: 'relationship',
      } as any,
      replyDeliberation: {
        selectedMotive: 'attune',
      } as any,
      privateThought: {
        stance: 'care',
      } as any,
    })

    expect(intent?.mode).toBe('relationship-history')
    expect(intent?.searchConversations).toBe(true)
    expect(intent?.searchEpisodes).toBe(true)
  })

  it('lets relationship-triggered tone complaints wake bond history even without explicit before-language', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '你为什么这次会这样回应我',
      answerCompiler: {
        answerSubject: 'relationship',
      } as any,
      replyDeliberation: {
        selectedMotive: 'attune',
      } as any,
      privateThought: {
        stance: 'care',
        emotionalTension: 'late-night-drain',
      } as any,
      conversationState: {
        jointThread: 'relationship seam',
        hostMove: '你为什么这次会这样回应我',
        memoryQueryHints: ['relationship seam'],
      } as any,
    })

    expect(intent?.mode).toBe('relationship-history')
    expect(intent?.rationale).toBe('recollection:relationship-history:structured-state')
    expect(intent?.queryHints).toContain('mood:late-night-drain')
  })

  it('lets mood-congruent autobiographical pressure wake lived continuity without explicit memory wording', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '我今晚又有点乱了',
      answerCompiler: {
        answerSubject: 'alicization-self',
      } as any,
      privateThought: {
        emotionalTension: 'late-night-drain',
      } as any,
      replyDeliberation: {
        selectedMotive: 'care',
      } as any,
      longHorizonMemory: {
        dominantCueSummary: 'Remembered late-night seam: hold the line gently before outward reply.',
        rememberedPlanSummary: 'Remembered plan: keep the inward line stable.',
      } as any,
      dialogueWorldThread: {
        activeThread: 'late-night seam',
        recallKeys: ['late-night seam'],
      } as any,
    })

    expect(intent?.mode).toBe('autobiographical-history')
    expect(intent?.queryHints).toContain('mood:late-night-drain')
    expect((intent?.confidence ?? 0)).toBeGreaterThan(0.4)
  })

  it('uses typed emotional-kernel state for autobiographical recollection', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '我现在不想把这条线说得太满，但又觉得它还在。',
      privateThought: {
        stance: 'accompany',
      } as any,
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'hesitant-curiosity',
        initiativeMode: 'hold',
        memoryRecallMode: 'self-continuity',
        embodimentTone: 'nearby-soft',
        valence: 0.46,
        arousal: 0.22,
        guardedness: 0.62,
        closenessDrive: 0.44,
        repairNeed: 0.18,
        initiativePressure: 0.16,
        reasonTags: ['self-continuity', 'hesitant-curiosity'],
        why: 'Closeness is present, but the line is still orienting inward.',
      },
    })

    expect(intent?.mode).toBe('autobiographical-history')
    expect(intent?.rationale).toBe('recollection:autobiographical-history:structured-state')
    expect(intent?.recollectionAgenda?.whyRecallNow).toBe('recollection:emotional-kernel:self-continuity-hold')
    expect((intent?.recollectionAgenda?.affectivePull ?? 0)).toBeGreaterThanOrEqual(0.2)
  })

  it('treats quiet-companionship as typed emotional-kernel state without prose authority', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '我先不想把这条线说得太满，但它还是在。',
      privateThought: {
        stance: 'accompany',
      } as any,
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'hesitant-curiosity',
        initiativeMode: 'hold',
        memoryRecallMode: 'self-continuity',
        embodimentTone: 'quiet-companionship',
        valence: 0.46,
        arousal: 0.2,
        guardedness: 0.64,
        closenessDrive: 0.36,
        repairNeed: 0.14,
        initiativePressure: 0.14,
        reasonTags: ['self-continuity', 'quiet-companionship'],
        why: 'Companionship is still being carried on one inward identity-continuity',
      },
    })

    expect(intent?.mode).toBe('autobiographical-history')
    expect(intent?.rationale).toBe('recollection:autobiographical-history:structured-state')
    expect(intent?.recollectionAgenda?.whyRecallNow).toBe('recollection:emotional-kernel:self-continuity-hold')
    expect((intent?.recollectionAgenda?.affectivePull ?? 0)).toBeGreaterThanOrEqual(0.17)
  })

  it('does not suppress structured recollection because the user used a fixed self-critique phrase', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '你能不能表现得开心一点',
      answerCompiler: {
        answerSubject: 'alicization-self',
      } as any,
      dialogueEncounter: {
        dialogueFirst: true,
        subject: 'alicization-self',
        continuityMode: 'dialogue-first',
        mustAnswerDirectly: true,
        shouldBypassScreenRepair: true,
        reasonTags: ['scene-detached-turn', 'dialogue-first-turn'],
      } as any,
      sceneContext: {
        cueSummary: 'runtime seam with the same bond line still warm underneath',
        targetTitle: 'runtime seam - callback line',
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'diff',
      },
      conversationState: {
        jointThread: 'same bond line on the runtime seam',
        hostMove: '你能不能表现得开心一点',
        memoryQueryHints: ['callback line', 'leave room before warmth widens'],
        memoryMode: 'dialogue-carry',
      } as any,
      longHorizonMemory: {
        rememberedConstraintSummary: 'Remembered boundary: leave room before warmth widens on the same bond line.',
        rememberedPreferenceSummary: 'Remembered preference: grounded repair first, then warmth can follow.',
        rememberedPlanSummary: 'Remembered open loop: return to the runtime seam before branching.',
        dominantCueSummary: 'Remembered continuity: the callback line stays thread-faithful when the return remains measured.',
      } as any,
      selfContinuityAuthority: {
        selfLine: '我仍然沿着同一条生命线，让经历保持连贯。',
        relationshipLine: 'The bond should stay thread-faithful and leave room before closeness widens.',
        authoritySummary: 'Measured-return same line remains the live bond authority.',
        inwardLine: 'The inward line is steady even when the surface gets noisier.',
        habitLine: 'Return gently and keep room first.',
        closenessPosture: 'measured-return',
      } as any,
    })

    expect(intent?.mode).toBe('autobiographical-history')
  })

  it('lets affective residue wake autobiographical recollection even when private thought has not explicitly named the current emotion yet', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '为什么这次又感觉像上次那样了',
      answerCompiler: {
        answerSubject: 'alicization-self',
      } as any,
      longHorizonMemory: {
        dominantCueSummary: 'Remembered late-night seam: hold the line gently before outward reply.',
        rememberedPlanSummary: 'Remembered plan: keep the inward line stable.',
      } as any,
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
      } as any,
    })

    expect(intent?.mode).toBe('autobiographical-history')
    expect(intent?.queryHints).toEqual(expect.arrayContaining([
      'affect:rest-protective',
      'cadence:cooldown',
      'distance:protect-space',
    ]))
    expect(intent?.rationale).toBe('recollection:autobiographical-history:affective-residue')
    expect((intent?.recollectionAgenda?.affectivePull ?? 0)).toBeGreaterThan(0.2)
  })

  it('lets remembered boundaries and trust rationale pull a focused turn toward relationship-aware recollection', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '你这次先别贴太近，先告诉我你为什么这样回我',
      answerCompiler: {
        answerSubject: 'relationship',
      } as any,
      replyDeliberation: {
        selectedMotive: 'attune',
      } as any,
      privateThought: {
        stance: 'care',
      } as any,
      sceneContext: {
        cueSummary: 'Focused debugging with emotional spillover',
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'diff',
      },
      longHorizonMemory: {
        dominantCueSummary: 'Remembered continuity: trust is warming when repair stays specific and respects work-focus boundaries.',
        rememberedPreferenceSummary: 'Remembered preference: grounded repair first, then warmth can follow.',
        rememberedConstraintSummary: 'Remembered boundary: focused work windows need room before warmth expands.',
        rememberedPlanSummary: 'Remembered open loop: return to the runtime seam after the bond line is steadier.',
      } as any,
    })

    expect(intent?.mode).toBe('relationship-history')
    expect(intent?.recollectionAgenda?.relationshipNeed).toBeGreaterThan(0.35)
    expect(intent?.recollectionAgenda?.candidateEraFacets.some(item => item.facet === 'relationship-era')).toBe(true)
    expect(intent?.queryHints).toEqual(expect.arrayContaining([
      'Remembered boundary: focused work windows need room before warmth expands.',
    ]))
  })

  it('does not turn self-authority prose into recall hints or extra confidence', () => {
    const structuredInput = {
      userText: '现在这段关系让我有些困惑',
      answerCompiler: {
        answerSubject: 'relationship',
      } as any,
      replyDeliberation: {
        selectedMotive: 'attune',
      } as any,
      privateThought: {
        stance: 'care',
      } as any,
    }
    const withoutAuthority = buildMemoryRecollectionIntent(structuredInput)
    const withAuthority = buildMemoryRecollectionIntent({
      ...structuredInput,
      selfContinuityAuthority: {
        selfLine: 'retired self cue',
        relationshipLine: 'retired relationship cue',
        inwardLine: 'retired repair cue',
        habitLine: 'retired project cue',
        authoritySummary: 'retired authority cue',
        closenessPosture: 'measured-return',
      } as any,
    })

    expect(withAuthority).toEqual(withoutAuthority)
    expect(withAuthority?.queryHints.join(' ')).not.toMatch(/retired self cue|retired relationship cue|retired repair cue|retired project cue|retired authority cue/iu)
  })

  it('lets remembered unfinished lines and prior way-of-doing bias a task turn toward experience-matched recollection', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '继续这个 runtime seam，按我们之前比较稳的方式来',
      conversationState: {
        activeProject: 'runtime seam',
        memoryMode: 'task-thread',
        memoryQueryHints: ['runtime seam'],
      } as any,
      dialogueWorldThread: {
        activeThread: 'runtime seam',
        memoryMode: 'task-thread',
        recallKeys: ['runtime seam', 'repair flow'],
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
      } as any,
      longHorizonMemory: {
        dominantCueSummary: 'Remembered continuity: verify before sounding certain.',
        rememberedPreferenceSummary: 'Remembered preference: grounded repair first, then warmth can follow.',
        rememberedPlanSummary: 'Remembered open loop: return to the runtime seam before branching.',
      } as any,
    })

    expect(intent?.mode).toBe('execution-procedure')
    expect(intent?.recollectionAgenda?.goalSimilarity).toBeGreaterThan(0.45)
    expect(intent?.recollectionAgenda?.candidateProcedureLines).toEqual(expect.arrayContaining([
      'Remembered open loop: return to the runtime seam before branching.',
      'Remembered continuity: verify before sounding certain.',
    ]))
    expect(intent?.queryHints).toEqual(expect.arrayContaining([
      'Remembered open loop: return to the runtime seam before branching.',
    ]))
  })

  it('uses actual memory-to-scene overlap instead of continuity slogans for scene resonance', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '继续当前工作',
      sceneContext: {
        cueSummary: 'database migration review',
        targetTitle: 'migration.sql',
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'diff',
      },
      dialogueWorldThread: {
        activeThread: 'database migration',
        recallKeys: ['migration', 'schema'],
      } as any,
      conversationState: {
        jointThread: 'database migration',
        memoryQueryHints: ['migration', 'schema'],
      } as any,
      longHorizonMemory: {
        rememberedConstraintSummary: 'Review database migration constraints before applying schema changes.',
        rememberedPreferenceSummary: 'Prefer reversible schema changes.',
        rememberedPlanSummary: 'Finish the database migration review.',
        dominantCueSummary: 'Database migration remains the active task.',
      } as any,
      privateThought: {
        stance: 'care',
      } as any,
    })

    expect(intent?.mode).toBe('relationship-history')
    expect(intent?.queryHints).toEqual(expect.arrayContaining([
      'Review database migration constraints before applying schema changes.',
      'database migration review',
    ]))
    expect((intent?.confidence ?? 0)).toBeGreaterThan(0.3)
  })

  it('does not infer recollection from continuity slogans in scene text alone', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '继续',
      replyDeliberation: {
        selectedMotive: 'attune',
      } as any,
      sceneContext: {
        cueSummary: 'retired scene slogan retired relationship cue repair-first slogan',
        targetTitle: 'retired project cue retired authority cue',
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'diff',
      },
    })

    expect(intent).toBeNull()
  })

  it('does not open long-range recall from retrospective wording without structured state', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '前几天我们聊过什么来着',
    })

    expect(intent).toBeNull()
  })
})
