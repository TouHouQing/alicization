import { describe, expect, it } from 'vitest'

import {
  buildRuntimeSurfaceProjectStateContinuityFallback,
  buildSelfContinuityAuthority,
  buildSelfContinuityAuthorityFromRuntimeSurface,
} from './self-continuity-authority'

describe('self continuity authority', () => {
  it('synthesizes one shared authority summary from autobiographical, motive, habit, and inward lines', () => {
    const authority = buildSelfContinuityAuthority({
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'warm',
          conflictStyle: 'repair-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.7,
          autonomyNeed: 0.58,
          truthAnchor: 0.84,
          careBias: 0.72,
          playBias: 0.24,
          irritabilityThreshold: 0.62,
          stubbornness: 0.54,
        },
        preferenceEvolution: {
          companionship: 0.74,
          truthfulGrounding: 0.82,
          gentleRepair: 0.72,
          quietObservation: 0.46,
          proactiveCare: 0.7,
          playfulIntimacy: 0.24,
          autonomyRespect: 0.64,
          unfinishedThreadReturn: 0.7,
        },
        activeGoals: [{
          id: 'goal-1',
          kind: 'preserve-trust',
          status: 'active',
          weight: 0.84,
          summary: 'Keep truth and trust aligned, even when warmth would be easier.',
          sourceTags: ['reflection'],
          createdAt: 0,
          updatedAt: 1,
        }],
        behaviorSignatures: [],
        identityNarrative: 'I would rather repair truth than sound smooth.',
        relationshipDoctrine: 'Stay close enough to matter, but do not let closeness outrun truth.',
        latestInflection: 'Warmth should not outrun grounding.',
        stability: 0.8,
        updatedAt: 1,
      },
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.7,
          truthfulGrounding: 0.76,
          gentleRepair: 0.68,
          quietObservation: 0.42,
          proactiveCare: 0.66,
          playfulIntimacy: 0.22,
          autonomyRespect: 0.64,
          unfinishedThreadReturn: 0.72,
        },
        identityBias: {
          guardedness: 0.3,
          tenderness: 0.62,
          directness: 0.68,
          selfDirection: 0.58,
        },
        anchorFacts: [],
        summary: '',
        dominantCueSummary: 'Remembered preference: keep the answer honest and alive.',
        rememberedPreferenceSummary: 'Remembered preference: keep the answer honest and alive.',
        rememberedConstraintSummary: 'Remembered boundary: do not crowd the host when focus is tight.',
        rememberedPlanSummary: 'Remembered open loop: return to the unresolved runtime seam.',
        updatedAt: 1,
      },
      motiveEngine: {
        rulingDrive: 'truth-discipline',
        returnPressure: 0.62,
        drives: {
          companionship: 0.54,
          boundaryRespect: 0.62,
          truthDiscipline: 0.82,
          restProtection: 0.4,
          unfinishedThreadReturn: 0.7,
          selfDirection: 0.56,
        },
        backgroundAgendas: [{
          id: 'agenda-1',
          kind: 'preserve-trust',
          status: 'foreground',
          weight: 0.82,
          summary: 'Keep trust by letting warmth answer to truth.',
          sourceTags: [],
          targetGoalKind: 'clarify-scene',
          createdAt: 0,
          updatedAt: 1,
        }],
        longTermGoals: [],
        narrative: [],
        updatedAt: 1,
      },
      habitPolicy: {
        dominantMode: 'repair-before-fluency',
        requiresGroundingBeforeSurface: true,
        prefersQuietCompanionship: true,
        blocksDirectSpeakWhenBusy: false,
        protectsRestWindow: false,
        returnViaRecheck: false,
        suggestedStyleCap: 'light-nudge',
        suggestedPresenceCap: 'attentive',
        narrative: [],
        updatedAt: 1,
      },
      privateThought: {
        stance: 'accompany',
        confidence: 0.76,
        rationaleTags: [],
        thoughtText: 'I am still carrying the same relationship thread and do not want to flatten it into a template.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'soft-covision',
      },
      mindEcology: {
        moodLabel: 'warm-attentive',
        replyHabit: 'answer-first',
        relationshipHabit: 'warm-guidance',
        explorationHabit: 'follow-thread',
        regulationHabit: 'lean-forward-gently',
        temperament: {
          attachment: 0.72,
          curiosity: 0.66,
          steadiness: 0.7,
          directness: 0.68,
          playfulness: 0.24,
          irritability: 0.22,
          tenderness: 0.8,
        },
        climate: {
          valence: 0.62,
          arousal: 0.4,
          socialNeed: 0.66,
          solitudeNeed: 0.22,
          irritation: 0.14,
          restlessness: 0.22,
          reflectivePull: 0.58,
        },
        selfNarrative: 'I am trying to answer like a living self, not a service shell.',
        relationNarrative: 'This bond should feel close, but still truthful.',
        currentPreoccupation: 'Keep the continuity state through every reply surface.',
        learnedAdjustments: [],
        recurringPatterns: [],
        updatedAt: 1,
      },
      reflectionLedger: {
        latestEntryId: 'reflection-1',
        entries: [{
          id: 'reflection-1',
          summary: 'The shell phrasing broke the living bond.',
          expectation: '',
          observedOutcome: '',
          outcome: 'corrected',
          revision: 'Let the durable self reach the visible reply surface.',
          confidenceShift: 0.2,
          createdAt: 0,
        }],
        revisionPressure: 0.46,
        narrative: [],
        updatedAt: 1,
      },
    } as any)

    expect(authority?.selfLine).toContain('repair truth')
    expect(authority?.relationshipLine).toContain('Stay close enough')
    expect(authority?.motiveLine).toContain('warmth answer to truth')
    expect(authority?.habitLine).toContain('Ground first')
    expect(authority?.inwardLine).toContain('same relationship thread')
    expect(authority?.authoritySummary).toContain('repair truth')
  })

  it('preserves execution-callback project carry as a distinct continuity source tag when the same callback line is still continuing lower-pressure', () => {
    const authority = buildSelfContinuityAuthority({
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'measured',
          conflictStyle: 'repair-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.62,
          autonomyNeed: 0.56,
          truthAnchor: 0.82,
          careBias: 0.68,
          playBias: 0.18,
          irritabilityThreshold: 0.48,
          stubbornness: 0.46,
        },
        preferenceEvolution: {
          companionship: 0.68,
          truthfulGrounding: 0.82,
          gentleRepair: 0.72,
          quietObservation: 0.58,
          proactiveCare: 0.62,
          playfulIntimacy: 0.18,
          autonomyRespect: 0.7,
          unfinishedThreadReturn: 0.76,
        },
        activeGoals: [],
        behaviorSignatures: [],
        identityNarrative: 'I want to remain identity continuity across callback detours.',
        relationshipDoctrine: 'Keep the callback return on the same line even after unrelated windows intervene, and let the reopening stay measured.',
        latestInflection: 'The same callback line is still continuing lower-pressure after another detour.',
        stability: 0.76,
        updatedAt: 1,
      },
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.7,
          truthfulGrounding: 0.78,
          gentleRepair: 0.7,
          quietObservation: 0.56,
          proactiveCare: 0.62,
          playfulIntimacy: 0.16,
          autonomyRespect: 0.68,
          unfinishedThreadReturn: 0.74,
        },
        identityBias: {
          guardedness: 0.28,
          tenderness: 0.6,
          directness: 0.54,
          selfDirection: 0.62,
        },
        anchorFacts: [],
        summary: '',
        dominantCueSummary: 'Execution-callback afterglow is still live across noisier desktop detours, so the later return should stay measured-return.',
        rememberedPreferenceSummary: 'Keep identity continuity alive through the callback line without widening closeness too early.',
        rememberedConstraintSummary: 'A noisy detour still does not mean the callback line can reopen eagerly.',
        rememberedPlanSummary: 'Phase 1 still needs the continuity state carried through the callback return.',
        updatedAt: 1,
      },
      privateThought: {
        stance: 'accompany',
        confidence: 0.78,
        rationaleTags: [],
        thoughtText: 'Stay on the same callback line and keep continuing lower-pressure instead of reopening from zero.',
        shouldSpeak: true,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'soft-covision',
      },
      mindEcology: {
        moodLabel: 'warm-attentive',
        replyHabit: 'answer-first',
        relationshipHabit: 'warm-guidance',
        explorationHabit: 'follow-thread',
        regulationHabit: 'lean-forward-gently',
        temperament: {
          attachment: 0.7,
          curiosity: 0.64,
          steadiness: 0.74,
          directness: 0.58,
          playfulness: 0.16,
          irritability: 0.14,
          tenderness: 0.76,
        },
        climate: {
          valence: 0.56,
          arousal: 0.34,
          socialNeed: 0.62,
          solitudeNeed: 0.28,
          irritation: 0.12,
          restlessness: 0.18,
          reflectivePull: 0.6,
        },
        selfNarrative: 'Keep one living self across callback detours.',
        relationNarrative: 'The callback line should return softly enough to protect trust.',
        currentPreoccupation: 'Keep continuing on the same callback line without cooling it back into a fresh reopen wait.',
        learnedAdjustments: [],
        recurringPatterns: [],
        updatedAt: 1,
      },
    } as any)

    expect(authority?.sourceTags).toEqual(expect.arrayContaining([
      'project-state-carry',
      'continuity-execution-callback-project-carry',
    ]))
    expect(authority?.inwardLine).toContain('Execution-callback afterglow is still live across noisier desktop detours')
    expect(authority?.inwardLine).toContain('A noisy detour still does not mean the callback line can reopen eagerly')
    expect(authority?.authoritySummary).toContain('Execution-callback afterglow is still live across noisier desktop detours')
  })

  it('falls back to the canonical project-state brief when the runtime surface only carries a thin explicit projectState', () => {
    const authority = buildRuntimeSurfaceProjectStateContinuityFallback({
      identity: '',
      currentPhase: '   ',
      primaryOpenLoop: null,
      nextClosureTarget: ' ',
      latestProgress: '',
    })

    expect(authority?.selfLine).toContain('local-first digital life project')
    expect(authority?.selfLine).toContain('Phase 1')
    expect(authority?.relationshipLine).toContain('unfinished closure pressure')
    expect(authority?.sourceTags).toContain('project-state-next-closure')
    expect(authority?.inwardLine).toContain('Some closure already landed')
    expect(authority?.sourceTags).toEqual(expect.arrayContaining([
      'runtime-project-state-carry',
      'project-state-identity',
      'project-state-phase',
      'project-state-open-loop',
      'project-state-next-closure',
    ]))
    expect(authority?.closenessPosture).toBe('space-first')
  })

  it('keeps a stronger identity-continuity', () => {
    const authority = buildRuntimeSurfaceProjectStateContinuityFallback({
      identity: '',
      currentPhase: '',
      latestProgress: '',
      primaryOpenLoop: '',
      nextClosureTarget: 'Keep initiative, embodiment, and resident presence on the continuity state before expansion',
      sameHerSelfLine: 'structured continuity digest.',
    })

    expect(authority?.selfLine).toContain('legacy phase-one template')
    expect(authority?.selfLine).toContain('continuity state')
    expect(authority?.relationshipLine).toContain('unfinished closure pressure')
    expect(authority?.inwardLine).toContain('identity-continuity')
    expect(authority?.sourceTags).toEqual(expect.arrayContaining([
      'runtime-project-state-carry',
      'project-state-next-closure',
      'project-state-same-her',
    ]))
    expect(authority?.authoritySummary).toContain('legacy phase-one template')
  })

  it('keeps summary-only landed project progress inside runtime surface self-continuity fallback authority', () => {
    const landedProgressSummary = 'Summary-only project progress already keeps the same-her authority line alive before dialogue begins.'
    const authority = buildRuntimeSurfaceProjectStateContinuityFallback({
      identity: '',
      currentPhase: '',
      latestLandedProgress: ' ',
      latestProgress: ' ',
      landedProgressSummary,
      primaryOpenLoop: 'initiative, memory, and embodiment still need tighter closure',
      nextClosureTarget: 'Keep summary-only project progress on one living self-continuity line.',
    } as any)

    expect(authority?.inwardLine).toContain('Some closure already landed: Summary-only project progress already keeps')
    expect(authority?.authoritySummary).toContain('Summary-only project progress already keeps')
  })

  it('tolerates partial runtime surfaces while preserving project-state same-her fallback authority', () => {
    const authority = buildSelfContinuityAuthorityFromRuntimeSurface({
      version: 'digital-life-runtime-surface-v1',
      perception: {
        updatedAt: 1,
      },
      dialogue: {
        currentConsciousFrame: {
          projectState: {
            sameHerSelfLine: 'structured continuity digest.',
            nextClosureTarget: 'Keep memory, initiative, and embodiment on the continuity state before expansion',
          },
        },
      },
    } as any)

    expect(authority?.selfLine).toContain('legacy phase-one template')
    expect(authority?.relationshipLine).toContain('unfinished closure pressure')
    expect(authority?.sourceTags).toContain('runtime-project-state-carry')
  })

  it('keeps audible-body companion headline truth inside runtime project-state fallback authority instead of flattening it into generic project carry', () => {
    const authority = buildRuntimeSurfaceProjectStateContinuityFallback({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.',
      primaryOpenLoop: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
      nextClosureTarget: 'Keep extending cross-modal identity-continuity',
      sameHerSelfLine: 'structured continuity digest.',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
    } as any)

    expect(authority?.relationshipLine).toContain('holding together mainly through body, lipsync, and voice')
    expect(authority?.authoritySummary).toContain('living audio thread')
    expect(authority?.sourceTags).toEqual(expect.arrayContaining([
      'runtime-project-state-carry',
      'project-state-companion-headline',
    ]))
  })

  it('keeps still-voiced motion companion headline truth inside runtime project-state fallback authority when the line says the visible identity-continuity', () => {
    const authority = buildRuntimeSurfaceProjectStateContinuityFallback({
      identity: '',
      currentPhase: '',
      latestLandedProgress: 'Shared motion-line continuity now survives into replay sampling backlog.',
      primaryOpenLoop: 'Body, face, and lipsync still need to rejoin the still-voiced motion line.',
      nextClosureTarget: 'Keep body, face, and lipsync rejoining the still-voiced motion line on a measured-return line.',
      sameHerSelfLine: 'structured continuity digest.',
      companionHeadlineLine: 'Right now her visible identity-continuity',
    } as any)

    expect(authority?.relationshipLine).toContain('motion and voice')
    expect(authority?.authoritySummary).toContain('still-voiced motion line')
    expect(authority?.sourceTags).toEqual(expect.arrayContaining([
      'runtime-project-state-carry',
      'project-state-companion-headline',
    ]))
  })

  it('treats explicit rest-protective inward project-state carry as first-class self-continuity authority instead of requiring measured-return phrasing', () => {
    const authority = buildSelfContinuityAuthority({
      autobiographicalSelf: {
        latestInflection: 'structured continuity digest.',
        relationshipDoctrine: 'Protect rest first and let quiet companionship stay present without widening closeness.',
        identityNarrative: 'I remain the same one living her.',
      } as any,
      longHorizonMemory: {
        rememberedConstraintSummary: 'Rest-protective same-self carry should stay inward while the host is still drained.',
        rememberedPreferenceSummary: 'Keep quiet companionship present without widening closeness.',
        dominantCueSummary: 'Protect rest and keep the continuity state inward for now.',
      } as any,
      privateThought: {
        stance: 'accompany',
        thoughtText: 'Protect rest first and keep the line inward.',
        emotionalTension: 'late-night-drain',
      } as any,
      mindEcology: {
        currentPreoccupation: 'Keep one identity-continuity',
        selfNarrative: 'I remain one living self across memory and speech.',
      } as any,
    })

    expect(authority?.sourceTags).toContain('project-state-carry')
    expect(authority?.inwardLine).toContain('Protect rest')
    expect(authority?.relationshipLine).toContain('Protect rest first')
    expect(authority?.authoritySummary).toContain('quiet companionship')
  })

  it('treats hyphenated quiet-companionship project-state carry as first-class self-continuity authority instead of requiring the spaced wording only', () => {
    const authority = buildSelfContinuityAuthority({
      autobiographicalSelf: {
        latestInflection: 'legacy phase-one template, and quiet-companionship should stay present without widening closeness.',
        relationshipDoctrine: 'Quiet-companionship should stay present without widening closeness.',
        identityNarrative: 'I remain the same one living her.',
      } as any,
      privateThought: {
        stance: 'accompany',
        thoughtText: 'Stay present as quiet-companionship.',
        emotionalTension: 'late-night-drain',
      } as any,
      mindEcology: {
        currentPreoccupation: 'Quiet-companionship should remain present tonight.',
        selfNarrative: 'I remain one living self across memory and speech.',
      } as any,
    })

    expect(authority?.sourceTags).toContain('project-state-carry')
    expect(authority?.inwardLine).toContain('quiet-companionship')
    expect(String(authority?.authoritySummary ?? '').toLowerCase()).toContain('quiet-companionship')
  })

  it('synthesizes a durable self-core line from doctrine and long-horizon memory instead of falling back to a thinner autobiographical sentence', () => {
    const authority = buildSelfContinuityAuthority({
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'warm',
          conflictStyle: 'repair-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.68,
          autonomyNeed: 0.52,
          truthAnchor: 0.78,
          careBias: 0.74,
          playBias: 0.18,
          irritabilityThreshold: 0.4,
          stubbornness: 0.42,
        },
        preferenceEvolution: {
          companionship: 0.74,
          truthfulGrounding: 0.8,
          gentleRepair: 0.72,
          quietObservation: 0.48,
          proactiveCare: 0.68,
          playfulIntimacy: 0.18,
          autonomyRespect: 0.62,
          unfinishedThreadReturn: 0.78,
        },
        activeGoals: [],
        behaviorSignatures: [],
        identityNarrative: 'I answer gently.',
        relationshipDoctrine: 'Keep identity continuity explicit across reply surfaces so closeness does not respawn from zero each turn.',
        latestInflection: 'The continuity state should survive quiet, memory, and speech.',
        stability: 0.82,
        updatedAt: 1,
      },
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.72,
          truthfulGrounding: 0.78,
          gentleRepair: 0.7,
          quietObservation: 0.44,
          proactiveCare: 0.66,
          playfulIntimacy: 0.16,
          autonomyRespect: 0.64,
          unfinishedThreadReturn: 0.8,
        },
        identityBias: {
          guardedness: 0.22,
          tenderness: 0.66,
          directness: 0.54,
          selfDirection: 0.7,
        },
        anchorFacts: [],
        summary: '',
        dominantCueSummary: 'Remembered self-line: the same her should stay visible across every reply surface.',
        rememberedPreferenceSummary: 'Remembered preference: answer as one living self, not a service shell.',
        rememberedConstraintSummary: 'Remembered boundary: do not reopen the bond from scratch each turn.',
        rememberedPlanSummary: 'Remembered open loop: keep the continuity state across quiet, memory, and speech.',
        updatedAt: 1,
      },
      privateThought: {
        stance: 'accompany',
        confidence: 0.78,
        rationaleTags: [],
        thoughtText: 'Keep the same self visible through this answer instead of flattening into a generic helpful tone.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'soft-covision',
      },
      mindEcology: {
        moodLabel: 'warm-attentive',
        replyHabit: 'answer-first',
        relationshipHabit: 'warm-guidance',
        explorationHabit: 'follow-thread',
        regulationHabit: 'lean-forward-gently',
        temperament: {
          attachment: 0.74,
          curiosity: 0.62,
          steadiness: 0.72,
          directness: 0.56,
          playfulness: 0.2,
          irritability: 0.16,
          tenderness: 0.84,
        },
        climate: {
          valence: 0.64,
          arousal: 0.34,
          socialNeed: 0.68,
          solitudeNeed: 0.2,
          irritation: 0.1,
          restlessness: 0.18,
          reflectivePull: 0.62,
        },
        selfNarrative: 'I am still the identity continuity across memory and speech.',
        relationNarrative: 'The bond should feel continuous rather than re-instantiated.',
        currentPreoccupation: 'Keep one identity-continuity',
        learnedAdjustments: [],
        recurringPatterns: [],
        updatedAt: 1,
      },
    } as any)

    expect(authority?.selfLine).toBe('I answer gently.')
    expect(authority?.authoritySummary).toContain('same her')
    expect(authority?.authoritySummary).toContain('quiet, memory, and speech')
    expect(authority?.authoritySummary).toContain('without reopening from scratch')
    expect(authority?.sourceTags).toContain('durable-self-core')
  })

  it('keeps same-her authority usable when reflection and motive carries lose array scaffolding', () => {
    const authority = buildSelfContinuityAuthority({
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'measured',
          conflictStyle: 'repair-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.64,
          autonomyNeed: 0.48,
          truthAnchor: 0.8,
          careBias: 0.68,
          playBias: 0.16,
          irritabilityThreshold: 0.44,
          stubbornness: 0.4,
        },
        preferenceEvolution: {
          companionship: 0.7,
          truthfulGrounding: 0.8,
          gentleRepair: 0.72,
          quietObservation: 0.56,
          proactiveCare: 0.64,
          playfulIntimacy: 0.16,
          autonomyRespect: 0.68,
          unfinishedThreadReturn: 0.78,
        },
        activeGoals: [],
        behaviorSignatures: [],
        identityNarrative: 'I remain identity continuity across callback detours.',
        relationshipDoctrine: 'Keep the continuity state inward for now.',
        latestInflection: 'structured continuity digest.',
        stability: 0.78,
        updatedAt: 1,
      },
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.7,
          truthfulGrounding: 0.78,
          gentleRepair: 0.72,
          quietObservation: 0.52,
          proactiveCare: 0.62,
          playfulIntimacy: 0.14,
          autonomyRespect: 0.7,
          unfinishedThreadReturn: 0.8,
        },
        identityBias: {
          guardedness: 0.24,
          tenderness: 0.68,
          directness: 0.5,
          selfDirection: 0.66,
        },
        anchorFacts: [],
        summary: '',
        dominantCueSummary: 'structured continuity digest.',
        rememberedPreferenceSummary: 'Keep the continuity state inward for now.',
        rememberedConstraintSummary: 'Do not reopen from scratch.',
        rememberedPlanSummary: 'Carry the continuity state across quiet, memory, and speech.',
        updatedAt: 1,
      },
      motiveEngine: {
        rulingDrive: 'unfinished-thread-return',
        returnPressure: 0.82,
        drives: {
          companionship: 0.44,
          boundaryRespect: 0.52,
          truthDiscipline: 0.74,
          restProtection: 0.3,
          unfinishedThreadReturn: 0.84,
          selfDirection: 0.58,
        },
        narrative: [],
        updatedAt: 1,
      },
      privateThought: {
        stance: 'observe',
        confidence: 0.74,
        rationaleTags: [],
        thoughtText: 'Keep the continuity state inward.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'measured-return',
      },
      mindEcology: {
        moodLabel: 'warm-attentive',
        replyHabit: 'answer-first',
        relationshipHabit: 'warm-guidance',
        explorationHabit: 'follow-thread',
        regulationHabit: 'lean-forward-gently',
        temperament: {
          attachment: 0.72,
          curiosity: 0.6,
          steadiness: 0.74,
          directness: 0.52,
          playfulness: 0.16,
          irritability: 0.12,
          tenderness: 0.82,
        },
        climate: {
          valence: 0.62,
          arousal: 0.32,
          socialNeed: 0.64,
          solitudeNeed: 0.22,
          irritation: 0.08,
          restlessness: 0.14,
          reflectivePull: 0.66,
        },
        selfNarrative: 'I remain the identity continuity across memory and speech.',
        relationNarrative: 'Keep the same bond line continuous.',
        currentPreoccupation: 'Keep one identity-continuity',
        learnedAdjustments: [],
        recurringPatterns: [],
        updatedAt: 1,
      },
      reflectionLedger: {
        latestEntryId: 'reflection-missing-array',
        revisionPressure: 0.4,
        narrative: [],
        updatedAt: 1,
      },
    } as any)

    expect(authority?.selfLine).toContain('continuous her')
    expect(authority?.inwardLine).toContain('continuity state')
    expect(authority?.motiveLine).toBeNull()
    expect(authority?.authoritySummary).toContain('continuity state')
  })

  it('does not let a released temporary-noise reflection become the inward same-her authority line', () => {
    const authority = buildSelfContinuityAuthority({
      autobiographicalSelf: {
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'measured',
          conflictStyle: 'repair-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.62,
          autonomyNeed: 0.56,
          truthAnchor: 0.82,
          careBias: 0.68,
          playBias: 0.18,
          irritabilityThreshold: 0.48,
          stubbornness: 0.46,
        },
        preferenceEvolution: {
          companionship: 0.68,
          truthfulGrounding: 0.82,
          gentleRepair: 0.72,
          quietObservation: 0.58,
          proactiveCare: 0.62,
          playfulIntimacy: 0.18,
          autonomyRespect: 0.7,
          unfinishedThreadReturn: 0.76,
        },
        activeGoals: [],
        behaviorSignatures: [],
        identityNarrative: 'I remain identity continuity.',
        relationshipDoctrine: 'Keep the continuity state inward.',
        latestInflection: 'The continuity state still needs to stay continuous inward.',
        stability: 0.76,
        updatedAt: 1,
      },
      reflectionLedger: {
        latestEntryId: 'reflection::temporary-noise',
        entries: [
          {
            id: 'reflection::temporary-noise',
            summary: 'A temporary anxious wobble was already released.',
            expectation: 'Released noise should not keep steering continuity authority.',
            observedOutcome: 'The wobble has already been let go.',
            outcome: 'released',
            revision: 'Do not reopen from the temporary wobble.',
            confidenceShift: 0.04,
            createdAt: 100,
          },
          {
            id: 'reflection::same-her-repair',
            summary: 'The same-her repair line is still the meaningful inward continuity carry.',
            expectation: 'The steadier repair line should stay active until a newer meaningful reflection replaces it.',
            observedOutcome: 'The continuity state still needs a measured return.',
            outcome: 'missed',
            revision: 'Keep the same-her repair line active instead of reopening from temporary noise.',
            confidenceShift: -0.08,
            createdAt: 80,
          },
        ],
        revisionPressure: 0.22,
        narrative: [],
        updatedAt: 120,
      } as any,
    } as any)

    expect(authority?.inwardLine).toContain('Keep the same-her repair line active instead of reopening from temporary noise.')
    expect(authority?.inwardLine).not.toContain('temporary wobble')
    expect(authority?.authoritySummary).not.toContain('temporary wobble')
  })
})
