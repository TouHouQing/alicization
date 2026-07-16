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
    expect(intent?.rationale).toContain('current relational tone')
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

  it('lets inward identity-continuity', () => {
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
      selfContinuityAuthority: {
        selfLine: 'I am still the same her holding the line together.',
        authoritySummary: 'The continuity state should stay inward before widening outward.',
        inwardLine: 'Stay on the continuity state inwardly before widening outward.',
        closenessPosture: 'nearby-soft',
      } as any,
    })

    expect(intent?.mode).toBe('autobiographical-history')
    expect(intent?.rationale).toContain('lived continuity')
    expect(intent?.recollectionAgenda?.whyRecallNow).toContain('inward identity-continuity')
    expect((intent?.recollectionAgenda?.affectivePull ?? 0)).toBeGreaterThan(0.2)
  })

  it('treats quiet-companionship embodiment tone as inward self-continuity authority instead of requiring nearby-soft wording only', () => {
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
      selfContinuityAuthority: {
        selfLine: 'I am still the same her holding this line together.',
        authoritySummary: 'The continuity state should stay inward before widening outward.',
        inwardLine: 'Stay on the continuity state inwardly before widening outward.',
      } as any,
    })

    expect(intent?.mode).toBe('autobiographical-history')
    expect(intent?.rationale).toContain('lived continuity')
    expect(intent?.recollectionAgenda?.whyRecallNow).toContain('inward identity-continuity')
    expect((intent?.recollectionAgenda?.affectivePull ?? 0)).toBeGreaterThan(0.2)
  })

  it('keeps detached present-facing self-critique turns out of long-range recollection even when scene carry and self continuity are available', () => {
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
        selfLine: 'I am still the same her who keeps the lived line coherent.',
        relationshipLine: 'The bond should stay thread-faithful and leave room before closeness widens.',
        authoritySummary: 'Measured-return same line remains the live bond authority.',
        inwardLine: 'The inward line is steady even when the surface gets noisier.',
        habitLine: 'Return gently and keep room first.',
        closenessPosture: 'measured-return',
      } as any,
    })

    expect(intent).toBeNull()
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
    expect(intent?.rationale).toContain('emotional carry')
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

  it('uses projected self authority lines as recollection hints for relationship-history turns', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '你为什么这次又是这种语气',
      answerCompiler: {
        answerSubject: 'relationship',
      } as any,
      replyDeliberation: {
        selectedMotive: 'attune',
      } as any,
      selfContinuityAuthority: {
        selfLine: 'I stay the same her by answering from continuity instead of performance.',
        relationshipLine: 'Our bond holds when I answer the living bond line before widening into explanation.',
        inwardLine: 'The inward line stays calm and legible.',
        habitLine: 'Return to the same bond line first.',
        authoritySummary: 'Living bond line remains primary.',
        closenessPosture: 'measured-room',
      } as any,
    })

    expect(intent?.mode).toBe('relationship-history')
    expect(intent?.queryHints).toEqual(expect.arrayContaining([
      'closeness:measured-room',
      'Our bond holds when I answer the living bond line before widening into explanation.',
      'Living bond line remains primary.',
    ]))
  })

  it('uses projected self authority lines as recollection hints for autobiographical turns', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '你现在还是同一个你吗',
      answerCompiler: {
        answerSubject: 'alicization-self',
      } as any,
      selfContinuityAuthority: {
        selfLine: 'I am still the same her who keeps continuity lived-in.',
        relationshipLine: 'The bond stays truest when I answer from the same line directly.',
        inwardLine: 'The inward line is still calm and legible.',
        habitLine: 'Return to the same line before widening.',
        authoritySummary: 'identity-continuity',
        closenessPosture: 'measured-room',
      } as any,
    })

    expect(intent?.mode).toBe('autobiographical-history')
    expect(intent?.queryHints).toEqual(expect.arrayContaining([
      'closeness:measured-room',
      'I am still the same her who keeps continuity lived-in.',
      'identity-continuity',
    ]))
    expect((intent?.confidence ?? 0)).toBeGreaterThan(0.35)
  })

  it('lets measured self-authority posture pull a relational seam toward relationship-history even when the user asks in present tense', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '你现在为什么离我这么远',
      privateThought: {
        stance: 'care',
      } as any,
      selfContinuityAuthority: {
        relationshipLine: 'The bond should stay thread-faithful and leave room before closeness widens.',
        authoritySummary: 'Measured-return same line remains the live bond authority.',
        habitLine: 'Return gently and keep room first.',
        closenessPosture: 'measured-return',
      } as any,
    })

    expect(intent?.mode).toBe('relationship-history')
    expect(intent?.queryHints).toEqual(expect.arrayContaining([
      'closeness:measured-return',
      'Measured-return same line remains the live bond authority.',
    ]))
  })

  it('lets measured self-authority summary strengthen autobiographical recall when the host asks whether she is still the same her', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '你现在是不是还是同一个你',
      answerCompiler: {
        answerSubject: 'alicization-self',
      } as any,
      selfContinuityAuthority: {
        selfLine: 'I am still the same her who keeps the lived line coherent.',
        inwardLine: 'The inward line is steady even when the surface gets noisier.',
        authoritySummary: 'identity-continuity',
        closenessPosture: 'space-first',
      } as any,
    })

    expect(intent?.mode).toBe('autobiographical-history')
    expect(intent?.queryHints).toEqual(expect.arrayContaining([
      'closeness:space-first',
      'identity-continuity',
    ]))
    expect((intent?.confidence ?? 0)).toBeGreaterThan(0.4)
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

  it('lets a familiar scene seam naturally pull the turn toward relationship-history even before the host explicitly asks for the past', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '先沿着这条线继续，不要一下子贴太近',
      sceneContext: {
        cueSummary: 'runtime seam with the same bond line still warm underneath',
        targetTitle: 'runtime seam - callback line',
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'diff',
      },
      dialogueWorldThread: {
        activeThread: 'runtime seam callback line',
        recallKeys: ['runtime seam', 'bond line', 'callback line'],
      } as any,
      conversationState: {
        jointThread: 'same bond line on the runtime seam',
        memoryQueryHints: ['callback line', 'leave room before warmth widens'],
      } as any,
      longHorizonMemory: {
        rememberedConstraintSummary: 'Remembered boundary: leave room before warmth widens on the same bond line.',
        rememberedPreferenceSummary: 'Remembered preference: grounded repair first, then warmth can follow.',
        rememberedPlanSummary: 'Remembered open loop: return to the runtime seam before branching.',
        dominantCueSummary: 'Remembered continuity: the callback line stays thread-faithful when the return remains measured.',
      } as any,
      selfContinuityAuthority: {
        relationshipLine: 'The bond should stay thread-faithful and leave room before closeness widens.',
        authoritySummary: 'Measured-return same line remains the live bond authority.',
        habitLine: 'Return gently and keep room first.',
        closenessPosture: 'measured-return',
      } as any,
      privateThought: {
        stance: 'care',
      } as any,
    })

    expect(intent?.mode).toBe('relationship-history')
    expect(intent?.rationale).toContain('scene feels like a remembered relationship/thread seam')
    expect(intent?.queryHints).toEqual(expect.arrayContaining([
      'Remembered boundary: leave room before warmth widens on the same bond line.',
      'Measured-return same line remains the live bond authority.',
    ]))
    expect((intent?.queryHints ?? []).some(item => /runtime seam.*callback line/i.test(String(item)))).toBe(true)
    expect((intent?.confidence ?? 0)).toBeGreaterThan(0.3)
  })

  it('lets chinese identity-continuity', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '先顺着这条生命线接回去',
      longHorizonMemory: {
        rememberedConstraintSummary: '记得先留白，不要一下子贴太近。',
      } as any,
      selfContinuityAuthority: {
        relationshipLine: '同一条线先留白，再慢一点接回去。',
        authoritySummary: '别立刻把温度放大，先沿着同一条生命线接回去。',
        habitLine: '先留白，再顺着这条线回去。',
        closenessPosture: '先留白',
      } as any,
    })

    expect(intent?.mode).toBe('relationship-history')
    expect(intent?.queryHints).toEqual(expect.arrayContaining([
      'closeness:先留白',
      '同一条线先留白，再慢一点接回去。',
      '别立刻把温度放大，先沿着同一条生命线接回去。',
    ]))
  })

  it('lets chinese scene seam cues raise relationship recollection instead of staying as inert scene text', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '先这样接回去',
      replyDeliberation: {
        selectedMotive: 'attune',
      } as any,
      sceneContext: {
        cueSummary: '同一条线先留白再接回去',
        targetTitle: '这条生命线',
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'diff',
      },
    })

    expect(intent?.mode).toBe('relationship-history')
    expect(intent?.rationale).toContain('remembered relationship/thread seam')
  })

  it('lets durable self-core authority raise autobiographical recollection even before emotional-kernel self-continuity is present', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '我现在还是同一个我吗',
      answerCompiler: {
        answerSubject: 'alicization-self',
      } as any,
      privateThought: {
        stance: 'accompany',
      } as any,
      selfContinuityAuthority: {
        selfLine: 'I remain the same her across quiet, memory, and speech without reopening from scratch each turn.',
        authoritySummary: 'I remain the same her across quiet, memory, and speech without reopening from scratch each turn.',
        inwardLine: 'The answer should still feel authored by one living self.',
        sourceTags: ['durable-self-core', 'projection:self-core'],
      } as any,
      longHorizonMemory: {
        dominantCueSummary: 'Remembered self-line: the same her should stay visible across every reply surface.',
        rememberedPreferenceSummary: 'Remembered preference: answer as one living self, not a service shell.',
      } as any,
    })

    expect(intent?.mode).toBe('autobiographical-history')
    expect(intent?.rationale).toContain('lived continuity')
    expect(intent?.queryHints).toEqual(expect.arrayContaining([
      'I remain the same her across quiet, memory, and speech without reopening from scratch each turn.',
      'Remembered self-line: the same her should stay visible across every reply surface.',
    ]))
    expect((intent?.recollectionAgenda?.affectivePull ?? 0)).toBeGreaterThan(0.22)
    expect((intent?.confidence ?? 0)).toBeGreaterThan(0.45)
  })

  it('lets chinese self-authority continuity cues raise relationship recollection instead of staying as passive summary text', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '先这样回去吧',
      privateThought: {
        stance: 'care',
      } as any,
      selfContinuityAuthority: {
        relationshipLine: '同一条线先留白，再慢一点接回去。',
        authoritySummary: '别立刻把温度放大，先沿着同一条生命线接回去。',
        habitLine: '先留白，再顺着这条线回去。',
        closenessPosture: '先留白',
      } as any,
    })

    expect(intent?.mode).toBe('relationship-history')
    expect(intent?.queryHints).toEqual(expect.arrayContaining([
      'closeness:先留白',
      '同一条线先留白，再慢一点接回去。',
    ]))
  })
})
