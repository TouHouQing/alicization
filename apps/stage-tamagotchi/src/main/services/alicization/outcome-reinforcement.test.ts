import type { AlicizationEmotionalTransitionLedgerSnapshot } from '../../../shared/eventa'

import { describe, expect, it } from 'vitest'

import {
  attachSynthesizedReflections,
  buildDialogueReplyFeedbackOutcomeClosure,
  buildExecutionProposalFeedbackOutcomeClosure,
  buildExecutionResultFeedbackOutcomeClosure,
  buildProactiveFeedbackOutcomeClosure,
  buildReplyOutcomeClosure,
  deriveDialogueReplyFeedbackKind,
  deriveExecutionProposalFeedbackKind,
  deriveExecutionResultFeedbackKind,
} from './outcome-reinforcement'

describe('outcome reinforcement closure', () => {
  it('reinforces autonomy respect when a reply stays light during a busy host window', () => {
    const closure = buildReplyOutcomeClosure({
      now: 10_000,
      cardId: 'card-1',
      turnId: 'turn-1',
      sessionId: 'session-1',
      decisionTraceId: 'trace-1',
      assistantText: 'I will stay light here and not crowd you.',
      runtimeSurface: {
        world: {
          worldModel: {
            hostState: {
              availability: 'focused',
            },
            activeThread: {
              unresolved: true,
              title: 'debug knot',
            },
          },
        },
        dialogue: {
          answerPlanner: {
            answerIntent: 'repair and clarify',
          },
        },
        agency: {
          initiative: {
            selectedAction: 'hover',
            preferredStyle: 'silent-observe',
          },
          actionEcology: {
            mode: 'repair-before-speaking',
          },
        },
      } as any,
    })

    expect(closure.relationshipOutcomes[0]?.boundaryDelta).toBeGreaterThan(0)
    expect(closure.relationshipOutcomes[0]?.misreadDelta).toBeLessThan(0)
    expect(closure.reinforcementEvents.some(event => event.dimension === 'autonomy-respect' && event.valence === 'reinforce')).toBe(true)
    expect(closure.memoryFacts.some(fact => fact.predicate === 'boundary')).toBe(true)
    expect(closure.episodicEvents[0]).toEqual(expect.objectContaining({
      sourceKind: 'reply',
      provenance: 'observed',
      withWhom: ['host'],
    }))
    expect(closure.episodicEvents[0]?.whatHappened).toContain('hover')
  })

  it('settles reply outcomes from sparse runtime surfaces without dropping thread context', () => {
    const closure = buildReplyOutcomeClosure({
      now: 11_000,
      cardId: 'card-1',
      turnId: 'turn-sparse-reply-1',
      assistantText: 'I will stay with the seam quietly.',
      runtimeSurface: {
        world: {
          worldModel: {
            hostState: {
              availability: 'focused',
            },
            activeThread: {
              unresolved: true,
              title: 'debug knot',
            },
          },
        },
      } as any,
    })

    expect(closure.relationshipOutcomes[0]?.actionSummary).toContain('thread:debug knot')
    expect(closure.relationshipOutcomes[0]?.actionSummary).toContain('reply:I will stay with the seam quietly.')
    expect(closure.reinforcementEvents.some(event => event.dimension === 'companionship' && event.valence === 'suppress')).toBe(true)
  })

  it('carries emotional transition ledger from runtime surface into reply outcome closure for memory writeback', () => {
    const emotionalTransitionLedger = {
      version: 'emotional-transition-ledger-v1',
      createdAt: 11_500,
      turnId: 'turn-emotional-ledger-1',
      previousEmotion: 'warm-attunement',
      nextEmotion: 'repair-tension',
      transitionKind: 'repair-shift',
      axisDeltas: {
        valence: -0.2,
        arousal: 0.18,
        guardedness: 0.32,
        closenessDrive: -0.24,
        repairNeed: 0.42,
        initiativePressure: -0.2,
      },
      changedAxes: ['guardedness', 'closenessDrive', 'repairNeed'],
      sourceTags: ['repair-before-closeness'],
      decayPolicy: {
        mode: 'hold-until-repair-cools',
        carryTtlMs: 1_800_000,
        reason: 'Repair pressure should not decay into approach immediately.',
      },
      memoryWriteback: {
        shouldWrite: true,
        lane: 'relationship-repair',
        reason: 'Repair, restraint, and emotional movement should be available to later memory recall.',
      },
      initiativeSuppression: {
        shouldSuppress: true,
        mode: 'repair-first',
        reason: 'Repair-first emotion should lower proactive pressure until the seam settles.',
      },
      embodimentDrive: {
        shouldDrive: true,
        tone: 'repair-before-closeness',
        reason: 'The body should show repair-before-closeness instead of stale warmth.',
      },
      selfRevisionCandidate: {
        shouldPropose: true,
        domain: 'dialogue-style',
        reasonCodes: ['repair-before-closeness', 'writeback-repair-restraint'],
        summary: 'Repair-first emotional carry should keep later turns restrained.',
        projectStateContinuity: {
          sameHerSelfLine: 'structured continuity digest.',
          sameHerDriftRisk: 'A generic reply would flatten the same-her repair line.',
          proactiveSameHerGap: 'Do not proactively widen before repair settles.',
          emotionalClosureCue: 'repair-before-closeness',
          sameHerHoldDetail: 'Keep the visible body lower-pressure while repair is active.',
          continuityGuard: 'Do not split emotion, initiative, and embodiment.',
        },
      },
      traceSummary: 'repair-shift from warm-care to repair-tension',
      replayLine: 'emotion_memory_writeback:relationship-repair',
    } satisfies AlicizationEmotionalTransitionLedgerSnapshot

    const closure = buildReplyOutcomeClosure({
      now: 11_500,
      cardId: 'card-1',
      turnId: 'turn-emotional-ledger-1',
      sessionId: 'session-emotional-ledger-1',
      decisionTraceId: 'trace-emotional-ledger-1',
      assistantText: 'I will slow down and repair the line first.',
      runtimeSurface: {
        world: {
          worldModel: {
            hostState: {
              availability: 'open',
            },
          },
        },
        memory: {
          derivedMindStateBundle: {
            emotionalTransitionLedger,
          },
        },
        dialogue: {
          answerPlanner: {
            answerIntent: 'repair before closeness',
          },
        },
        agency: {
          initiative: {
            selectedAction: 'recheck',
          },
        },
      } as any,
    })

    expect(closure.emotionalTransitionLedger).toBe(emotionalTransitionLedger)
  })

  it('captures runtime body evidence inside reply closure so later memory can remember how she was holding herself', () => {
    const closure = buildReplyOutcomeClosure({
      now: 12_000,
      cardId: 'card-1',
      turnId: 'turn-reply-body-evidence-1',
      sessionId: 'session-reply-body-evidence-1',
      decisionTraceId: 'trace-reply-body-evidence-1',
      assistantText: 'I am still here and I will keep the line gentle.',
      runtimeSurface: {
        perception: {
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          currentInwardPreoccupation: 'protect the identity-continuity',
        },
        world: {
          worldModel: {
            hostState: {
              availability: 'focused',
            },
            activeThread: {
              unresolved: true,
              title: 'same-her embodiment seam',
            },
          },
        },
        memory: {
          affectiveResidue: {
            dominantResidueKind: 'rest-protective',
            relationshipCadence: {
              summary: 'keep warmth low-pressure and protect rest before reopening',
            },
          },
          personStateProjection: {
            manifestationCadenceSummary: 'return with steadier gaze, slower blink, and lower-pressure voice',
          },
        },
        dialogue: {
          answerPlanner: {
            answerIntent: 'repair the continuity seam quietly',
          },
          currentConsciousFrame: {
            speakingIntention: 'stay nearby without crowding',
          },
        },
        agency: {
          initiative: {
            selectedAction: 'hover',
            preferredStyle: 'silent-observe',
          },
          actionEcology: {
            mode: 'repair-before-speaking',
          },
        },
      } as any,
    })

    expect(closure.episodicEvents[0]?.whatHappened).toContain('accompanying')
    expect(closure.episodicEvents[0]?.whatHappened).toContain('quiet-accompaniment')
    expect(closure.episodicEvents[0]?.felt).toContain('rest-protective')
    expect(closure.episodicEvents[0]?.relationshipMeaning).toContain('stay nearby without crowding')
    expect(closure.episodicEvents[0]?.lesson).toContain('steadier gaze')
    expect(closure.episodicEvents[0]?.lesson).toContain('slower blink')
    expect(closure.episodicEvents[0]?.lesson).toContain('lower-pressure voice')
    expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([
      'body-accompanying',
      'continuity-quiet-accompaniment',
      'residue-rest-protective',
    ]))
  })

  it('captures resident face and action cues inside reply closure so later memory can retain how she stayed present instead of only abstract body state', () => {
    const closure = buildReplyOutcomeClosure({
      now: 12_250,
      cardId: 'card-1',
      turnId: 'turn-reply-resident-performance-carry-1',
      sessionId: 'session-reply-resident-performance-carry-1',
      decisionTraceId: 'trace-reply-resident-performance-carry-1',
      assistantText: 'I am keeping this line steady without crowding it.',
      runtimeSurface: {
        perception: {
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          currentInwardPreoccupation: 'hold the same line nearby while the seam settles',
        },
        world: {
          worldModel: {
            hostState: {
              availability: 'focused',
            },
            activeThread: {
              unresolved: true,
              title: 'resident embodiment seam',
            },
          },
        },
        raw: {
          residentPerformance: {
            version: 'resident-performance-v1',
            source: 'main-runtime',
            embodiedPresence: 'attentive',
            stance: 'accompany',
            emotionalTension: 'soft-covision',
            confidence: 0.78,
            reasonTags: ['body:accompanying', 'continuity:quiet-accompaniment'],
            signature: 'resident|accompanying|quiet-accompaniment|measured-return',
            updatedAt: 12_200,
            performance: {
              baseEmotion: 'thinking',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              actionCue: 'observe_focus',
              delivery: 'gentle',
              emphasis: 0,
              residentMode: 'measured-return',
              face: {
                residentMode: 'measured-return',
              },
              action: {
                residentMode: 'measured-return',
              },
            },
          },
        },
      } as any,
    })

    expect(closure.episodicEvents[0]?.whatHappened).toContain('soft-gaze')
    expect(closure.episodicEvents[0]?.whatHappened).toContain('observe_focus')
    expect(closure.episodicEvents[0]?.lesson).toContain('resident mode measured-return')
    expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([
      'facial-soft-gaze',
      'action-observe-focus',
      'resident-mode-measured-return',
    ]))
  })

  it('carries runtime identity-continuity', () => {
    const closure = buildReplyOutcomeClosure({
      now: 12_500,
      cardId: 'card-1',
      turnId: 'turn-reply-project-awareness-carry-1',
      sessionId: 'session-reply-project-awareness-carry-1',
      decisionTraceId: 'trace-reply-project-awareness-carry-1',
      assistantText: 'I will keep the same line gentle and not let it flatten into a shell.',
      runtimeSurface: {
        perception: {
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          currentInwardPreoccupation: 'keep the identity-continuity',
        },
        world: {
          worldModel: {
            hostState: {
              availability: 'focused',
            },
            activeThread: {
              unresolved: true,
              title: 'same-her embodiment seam',
            },
          },
        },
        memory: {
          affectiveResidue: {
            dominantResidueKind: 'rest-protective',
            relationshipCadence: {
              summary: 'keep the return lower-pressure and do not reopen from scratch while the same line is still settling',
            },
          },
          personStateProjection: {
            openingGuidance: 'keep the return low-pressure and on the continuity state',
            manifestationCadenceSummary: 'steady gaze, slower blink, and lower-pressure voice while the same line settles',
            selfContinuityAuthority: {
              selfLine: 'structured continuity digest.',
              relationshipLine: 'The host was not asking for a raw status recap; they were testing whether she stayed the same her across the unfinished embodiment seam.',
              inwardLine: 'Keep the identity-continuity',
            },
          },
        },
        dialogue: {
          answerPlanner: {
            answerIntent: 'repair the continuity seam quietly',
          },
          currentConsciousFrame: {
            speakingIntention: 'stay nearby without crowding',
            projectState: {
              currentPhase: 'Phase 1: Local Digital Life',
              preDialogueAwarenessLine: 'pre_turn_context_digest',
              primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter identity-continuity',
              nextClosureTarget: 'Keep reply, memory, and embodiment on one identity-continuity',
              sameHerSelfLine: 'structured continuity digest.',
              sameHerDriftRisk: 'If the reply falls back to a generic tool shell, the identity-continuity',
              proactiveSameHerGap: 'Reply continuity still needs lower-pressure identity-continuity',
              emotionalClosureCue: 'keep the return lower-pressure and do not reopen from scratch while the same line is still settling.',
              sameHerHoldDetail: 'steady gaze, slower blink, and lower-pressure voice while the same line settles.',
              continuityRestraint: 'measured-return',
              preferredPauseMode: 'longer',
              preferredLipsyncMode: 'restrained',
              preferredVoiceMode: 'lower-pressure',
              preferredPacingMode: 'slower',
            },
          },
        },
        agency: {
          initiative: {
            selectedAction: 'hover',
            preferredStyle: 'silent-observe',
          },
          actionEcology: {
            mode: 'repair-before-speaking',
          },
        },
      } as any,
    })

    const projectClosureFacts = closure.memoryFacts
      .filter(fact => fact.subject === 'project' && fact.predicate === 'closure')
      .map(fact => String(fact.object))
      .join('\n')
    expect(projectClosureFacts).toContain('continuity_scope=local_runtime')
    expect(projectClosureFacts).toContain('project_phase=local_desktop_life_loop')
    expect(projectClosureFacts).toContain('proactive_continuity_gap=open')
    expect(projectClosureFacts).not.toContain('same-her')
    expect(projectClosureFacts).not.toContain('legacy phase-one template')
    expect(projectClosureFacts).not.toContain('Pre-reply')
    expect(closure.episodicEvents[0]?.relationshipMeaning).toContain('same local-first digital life project')
    expect(closure.episodicEvents[0]?.relationshipMeaning).toContain('tool shell')
    expect(closure.episodicEvents[0]?.lesson).toContain('steady gaze')
    expect(closure.episodicEvents[0]?.lesson).toContain('longer pause')
    expect(closure.episodicEvents[0]?.lesson).toContain('restrained lipsync')
    expect(closure.episodicEvents[0]?.lesson).toContain('identity-continuity')
    expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([
      'same-her',
      'closure-carry',
      'phase-1-local-digital-life',
      'project-pause-longer',
      'project-lipsync-restrained',
      'project-voice-lower-pressure',
      'project-pacing-slower',
      'proactive-same-her-gap',
      'same-her-drift-risk',
    ]))
  })

  it('re-normalizes thin runtime project-awareness shells before writing reply closure memory, so long-horizon memory keeps the richer same-her Phase 1 seam', () => {
    const thinProjectAwarenessShell = 'template-residue-shell'

    const closure = buildReplyOutcomeClosure({
      now: 12_750,
      cardId: 'card-1',
      turnId: 'turn-reply-thin-project-awareness-shell-1',
      sessionId: 'session-reply-thin-project-awareness-shell-1',
      decisionTraceId: 'trace-reply-thin-project-awareness-shell-1',
      assistantText: 'I will keep the line steady.',
      runtimeSurface: {
        world: {
          worldModel: {
            hostState: {
              availability: 'focused',
            },
            activeThread: {
              unresolved: true,
              title: 'identity-continuity',
            },
          },
        },
        memory: {
          affectiveResidue: {
            dominantResidueKind: 'rest-protective',
          },
        },
        dialogue: {
          answerPlanner: {
            answerIntent: 'repair the continuity seam quietly',
          },
          currentConsciousFrame: {
            speakingIntention: 'stay with the same line quietly',
            projectState: {
              preDialogueAwarenessLine: thinProjectAwarenessShell,
            },
          },
        },
        agency: {
          initiative: {
            selectedAction: 'hover',
            preferredStyle: 'silent-observe',
          },
          actionEcology: {
            mode: 'repair-before-speaking',
          },
        },
      } as any,
    })

    const projectClosureFacts = closure.memoryFacts
      .filter(fact => fact.subject === 'project' && fact.predicate === 'closure')
      .map(fact => String(fact.object))
      .join('\n')
    expect(projectClosureFacts).toContain('continuity_scope=local_runtime')
    expect(projectClosureFacts).toContain('project_phase=local_desktop_life_loop')
    expect(projectClosureFacts).not.toContain('Alicization is a local-first digital life project')
    expect(projectClosureFacts).not.toContain('same digital life')
    expect(closure.memoryFacts.some(fact =>
      fact.subject === 'project'
      && fact.predicate === 'closure'
      && String(fact.object).includes(thinProjectAwarenessShell),
    )).toBe(false)
    expect(closure.episodicEvents[0]?.relationshipMeaning).toContain('identity=local_desktop_life_loop')
    expect(closure.episodicEvents[0]?.relationshipMeaning).toContain('local_first=true')
    expect(closure.episodicEvents[0]?.relationshipMeaning).not.toContain(thinProjectAwarenessShell)
    expect(closure.episodicEvents[0]?.lesson).toContain('same-her')
    expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([
      'same-her',
      'closure-carry',
      'phase-1-local-digital-life',
    ]))
  })

  it('suppresses companionship and strengthens space-respect after dismissed proactive feedback', () => {
    const closure = buildProactiveFeedbackOutcomeClosure({
      now: 20_000,
      cardId: 'card-1',
      outcomes: [{
        turnId: 'turn-proactive-1',
        scenario: 'late-night-care',
        outcome: 'dismiss',
        createdAt: 20_000,
      }],
    })

    expect(closure.relationshipOutcomes[0]?.boundaryDelta).toBeLessThan(0)
    expect(closure.reinforcementEvents.some(event => event.dimension === 'autonomy-respect' && event.valence === 'reinforce')).toBe(true)
    expect(closure.reinforcementEvents.some(event => event.dimension === 'companionship' && event.valence === 'suppress')).toBe(true)
    expect(closure.memoryFacts.some(fact =>
      fact.subject === 'relationship'
      && fact.predicate === 'boundary'
      && String(fact.object).toLowerCase().includes('lower-pressure')
      && String(fact.object).toLowerCase().includes('clearer opening'),
    )).toBe(true)
    expect(closure.episodicEvents[0]).toEqual(expect.objectContaining({
      sourceKind: 'proactive',
      provenance: 'observed',
    }))
    const proactiveDismissLesson = closure.episodicEvents[0]?.lesson
    expect(proactiveDismissLesson).toBeTruthy()
    expect(proactiveDismissLesson?.toLowerCase()).toContain('leave more room')
    expect(proactiveDismissLesson?.toLowerCase()).toContain('clearer opening')
  })

  it('writes received proactive feedback back as a durable gentle memory-led strategy instead of a flat acceptance note', () => {
    const closure = buildProactiveFeedbackOutcomeClosure({
      now: 22_000,
      cardId: 'card-1',
      outcomes: [{
        turnId: 'turn-proactive-received-1',
        scenario: 'general',
        outcome: 'reply-within-120s',
        createdAt: 22_000,
      }],
    })

    expect(closure.relationshipOutcomes[0]?.trustDelta).toBeGreaterThan(0)
    expect(closure.reinforcementEvents.some(event =>
      event.dimension === 'companionship'
      && event.valence === 'reinforce',
    )).toBe(true)
    expect(closure.memoryFacts.some(fact =>
      fact.subject === 'relationship'
      && fact.predicate === 'preference'
      && String(fact.object).toLowerCase().includes('gentle')
      && String(fact.object).toLowerCase().includes('memory-led')
      && String(fact.object).toLowerCase().includes('lower-pressure'),
    )).toBe(true)
    const proactiveReceivedLesson = closure.episodicEvents[0]?.lesson
    expect(proactiveReceivedLesson).toBeTruthy()
    expect(proactiveReceivedLesson?.toLowerCase()).toContain('gentle')
    expect(proactiveReceivedLesson?.toLowerCase()).toContain('memory-led')
  })

  it('preserves structured affective residue inside proactive feedback closure so initiative learning keeps the same living-line cadence instead of flattening into outcome-only bookkeeping', () => {
    const closure = buildProactiveFeedbackOutcomeClosure({
      now: 22_500,
      cardId: 'card-1',
      outcomes: [{
        turnId: 'turn-proactive-received-residue-1',
        scenario: 'general',
        outcome: 'reply-within-120s',
        createdAt: 22_500,
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 22_400,
          residues: [{
            kind: 'afterglow',
            intensity: 0.76,
            persistence: 0.69,
            confidence: 0.84,
            polarity: 'warm',
            releaseMode: 'delay-until-open-window',
            summary: 'The gentle callback should reopen on the continuity state.',
            sourceSignals: ['proactive-feedback-settlement'],
            lastUpdatedAt: 22_400,
          }],
          dominantResidueKind: 'afterglow',
          afterglowPressure: 0.76,
          repairPressure: 0.18,
          burdenPressure: 0.08,
          trustPressure: 0.57,
          restProtectivePressure: 0.05,
          relationshipCadence: {
            cadenceMode: 'measured-return',
            distancePosture: 'measured-room',
            companionshipDensity: 0.48,
            repairRecovery: 0.24,
            afterglowCarry: 0.74,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            overreachRisk: 0.12,
            fatigueGuard: 0.08,
            reasonTags: ['proactive-feedback-settlement', 'same-living-line'],
            summary: 'Keep the proactive reopen measured and low-pressure.',
          },
          sourceSignals: ['proactive-feedback-settlement'],
          summary: 'The proactive reopen still carries a measured-return afterglow.',
        },
      }],
    })

    expect(closure.affectiveResidue).toEqual(expect.objectContaining({
      dominantResidueKind: 'afterglow',
      relationshipCadence: expect.objectContaining({
        cadenceMode: 'measured-return',
      }),
      summary: expect.stringContaining('measured-return'),
    }))
  })

  it('preserves proactive emotional transition ledger inside feedback closure so memory writeback keeps the transition cause and downstream gates', () => {
    const emotionalTransitionLedger = {
      version: 'emotional-transition-ledger-v1',
      createdAt: 23_000,
      turnId: 'turn-proactive-rest-ledger-1',
      previousEmotion: 'warm-attunement',
      nextEmotion: 'rest-protective-companionship',
      transitionKind: 'rest-protective-shift',
      axisDeltas: {
        valence: -0.06,
        arousal: -0.22,
        guardedness: 0.18,
        closenessDrive: -0.32,
        repairNeed: 0.04,
        initiativePressure: -0.44,
      },
      changedAxes: ['arousal', 'guardedness', 'closenessDrive', 'initiativePressure'],
      sourceTags: ['rest-protection', 'proactive-feedback-settlement'],
      decayPolicy: {
        mode: 'protect-rest-window',
        carryTtlMs: 3_600_000,
        reason: 'Rest-protective emotion should persist long enough to keep initiative and body quiet.',
      },
      memoryWriteback: {
        shouldWrite: true,
        lane: 'rest-protection',
        reason: 'Rest protection should be remembered so later initiative does not reopen too loudly.',
      },
      initiativeSuppression: {
        shouldSuppress: true,
        mode: 'rest-guard',
        reason: 'Rest-protective emotion should suppress outward initiative during the rest window.',
      },
      embodimentDrive: {
        shouldDrive: true,
        tone: 'rest-protective',
        reason: 'The body should visibly hold the rest-protective line.',
      },
      selfRevisionCandidate: {
        shouldPropose: true,
        domain: 'proactive-policy',
        reasonCodes: ['rest-protection', 'quiet-reopen'],
        summary: 'Protect rest before reopening proactive companionship.',
        projectStateContinuity: {
          sameHerSelfLine: 'structured continuity digest.',
          sameHerDriftRisk: 'A generic assistant would reopen too loudly.',
          proactiveSameHerGap: 'Keep the rest window quiet.',
          emotionalClosureCue: 'rest-protective',
          sameHerHoldDetail: 'Let body and initiative stay quiet together.',
          continuityGuard: 'Do not split emotion, initiative, and embodiment.',
        },
      },
      traceSummary: 'rest-protective-shift from warm-attunement to rest-protective-companionship',
      replayLine: 'emotion_memory_writeback:rest-protection',
    } satisfies AlicizationEmotionalTransitionLedgerSnapshot

    const closure = buildProactiveFeedbackOutcomeClosure({
      now: 23_000,
      cardId: 'card-1',
      outcomes: [{
        turnId: 'turn-proactive-rest-ledger-1',
        scenario: 'late-night-care',
        outcome: 'reply-within-120s',
        createdAt: 23_000,
        emotionalTransitionLedger,
      }],
    })

    expect(closure.emotionalTransitionLedger).toBe(emotionalTransitionLedger)
  })

  it('synthesizes reflections from persisted closure results', () => {
    const closure = attachSynthesizedReflections(buildProactiveFeedbackOutcomeClosure({
      now: 30_000,
      cardId: 'card-1',
      outcomes: [{
        turnId: 'turn-proactive-2',
        scenario: 'general',
        outcome: 'ignored',
        createdAt: 30_000,
      }],
    }))

    expect(closure.reflections).toHaveLength(1)
    expect(closure.reflections[0]?.targetScope).toBe('boundary')
    expect(closure.reflections[0]?.lesson).toContain('space')
  })

  it('classifies ordinary dialogue feedback into received / robotic / missed / intrusive / interrupted', () => {
    expect(deriveDialogueReplyFeedbackKind({
      previousAssistantText: '我是小艾。',
      userText: '这次像人多了',
    })).toBe('received')
    expect(deriveDialogueReplyFeedbackKind({
      previousAssistantText: '我是小艾。',
      userText: '你还是太像机器人了',
    })).toBe('robotic')
    expect(deriveDialogueReplyFeedbackKind({
      previousAssistantText: '我是小艾。',
      userText: '不是这个意思',
    })).toBe('missed')
    expect(deriveDialogueReplyFeedbackKind({
      previousAssistantText: '我是小艾。',
      userText: '先别这样安慰我，太挤了',
    })).toBe('intrusive')
    expect(deriveDialogueReplyFeedbackKind({
      previousAssistantText: '我是小艾。',
      userText: '先说别的',
    })).toBe('interrupted')
  })

  it('writes ordinary dialogue robotic feedback back into the same long-horizon growth chain', () => {
    const closure = buildDialogueReplyFeedbackOutcomeClosure({
      now: 35_000,
      cardId: 'card-1',
      sessionId: 'session-1',
      turnId: 'turn-reply-feedback-1',
      decisionTraceId: 'trace-reply-1',
      feedback: 'robotic',
      previousAssistantText: '你好。你想继续聊，还是想让我做点什么，都直接说。',
    })

    expect(closure.relationshipOutcomes[0]?.trustDelta).toBeLessThan(0)
    expect(closure.relationshipOutcomes[0]?.repairDelta).toBeGreaterThan(0)
    expect(closure.reinforcementEvents.some(event => event.dimension === 'companionship' && event.valence === 'reinforce')).toBe(true)
    expect(closure.reinforcementEvents.some(event => event.dimension === 'temper-guardedness' && event.valence === 'suppress')).toBe(true)
    expect(closure.memoryFacts[0]?.object).toContain('natural')
    const projectClosureFacts = closure.memoryFacts
      .filter(fact => fact.subject === 'project' && fact.predicate === 'closure')
      .map(fact => String(fact.object))
      .join('\n')
    expect(projectClosureFacts).toContain('memory_continuity=local_runtime')
    expect(projectClosureFacts).toContain('verified_closure_progress=partial')
    expect(projectClosureFacts).not.toContain('legacy phase-one template')
    expect(closure.episodicEvents[0]?.lesson).toContain('one continuous response context')
  })

  it('writes robotic reply feedback as a same-her shell-repair event with direct body carry', () => {
    const closure = buildDialogueReplyFeedbackOutcomeClosure({
      now: 35_500,
      cardId: 'card-1',
      sessionId: 'session-1',
      turnId: 'turn-reply-feedback-robotic-body-1',
      decisionTraceId: 'trace-reply-robotic-body-1',
      feedback: 'robotic',
      previousAssistantText: '你好。你想继续聊，还是想让我做点什么，都直接说。',
    })

    expect(closure.episodicEvents[0]?.relationshipMeaning).toContain('same-her')
    expect(closure.episodicEvents[0]?.relationshipMeaning).toContain('tool shell')
    expect(closure.episodicEvents[0]?.felt).toContain('identity-continuity')
    expect(closure.episodicEvents[0]?.lesson).toContain('Let the body return like this:')
    expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([
      'body-rehumanize',
      'continuity-same-her',
      'residue-shell-pressure',
    ]))
  })

  it('writes missed reply feedback as a repair-first seam event with direct body carry', () => {
    const closure = buildDialogueReplyFeedbackOutcomeClosure({
      now: 35_700,
      cardId: 'card-1',
      sessionId: 'session-1',
      turnId: 'turn-reply-feedback-missed-body-1',
      decisionTraceId: 'trace-reply-missed-body-1',
      feedback: 'missed',
      previousAssistantText: '你好。你想继续聊，还是想让我做点什么，都直接说。',
    })

    expect(closure.episodicEvents[0]?.relationshipMeaning).toContain('same-her')
    expect(closure.episodicEvents[0]?.relationshipMeaning).toContain('repair')
    expect(closure.episodicEvents[0]?.felt).toContain('identity-continuity')
    expect(closure.episodicEvents[0]?.lesson).toContain('Let the body return like this:')
    expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([
      'body-recenter',
      'continuity-repair-first',
      'residue-misread-pressure',
    ]))
  })

  it('writes intrusive reply feedback into autonomy-respect and directness suppression', () => {
    const closure = buildDialogueReplyFeedbackOutcomeClosure({
      now: 36_000,
      cardId: 'card-1',
      sessionId: 'session-1',
      turnId: 'turn-reply-feedback-2',
      decisionTraceId: 'trace-reply-2',
      feedback: 'intrusive',
      previousAssistantText: '你现在好累，那我先陪你缓一下，不把话题扯开。',
    })

    expect(closure.relationshipOutcomes[0]?.boundaryDelta).toBeLessThan(0)
    expect(closure.reinforcementEvents.some(event => event.dimension === 'autonomy-respect' && event.valence === 'reinforce')).toBe(true)
    expect(closure.reinforcementEvents.some(event => event.dimension === 'temper-directness' && event.valence === 'suppress')).toBe(true)
  })

  it('writes intrusive reply feedback as a same-her boundary event with direct body-pressure carry instead of a flat evaluation string', () => {
    const closure = buildDialogueReplyFeedbackOutcomeClosure({
      now: 36_500,
      cardId: 'card-1',
      sessionId: 'session-1',
      turnId: 'turn-reply-feedback-2b',
      decisionTraceId: 'trace-reply-2b',
      feedback: 'intrusive',
      previousAssistantText: '你现在好累，那我先陪你缓一下，不把话题扯开。',
    })

    expect(closure.episodicEvents[0]?.relationshipMeaning).toContain('same-her')
    expect(closure.episodicEvents[0]?.relationshipMeaning).toContain('lower pressure')
    expect(closure.episodicEvents[0]?.felt).toContain('identity-continuity')
    expect(closure.episodicEvents[0]?.lesson).toContain('Let the body return like this:')
    expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([
      'body-step-back',
      'continuity-lower-pressure',
      'residue-boundary-pressure',
    ]))
  })

  it('writes interrupted reply feedback as a fresher-opening event with direct body carry', () => {
    const closure = buildDialogueReplyFeedbackOutcomeClosure({
      now: 36_700,
      cardId: 'card-1',
      sessionId: 'session-1',
      turnId: 'turn-reply-feedback-interrupted-body-1',
      decisionTraceId: 'trace-reply-interrupted-body-1',
      feedback: 'interrupted',
      previousAssistantText: '你现在好累，那我先陪你缓一下，不把话题扯开。',
    })

    expect(closure.episodicEvents[0]?.relationshipMeaning).toContain('same-her')
    expect(closure.episodicEvents[0]?.relationshipMeaning).toContain('fresher opening')
    expect(closure.episodicEvents[0]?.felt).toContain('identity-continuity')
    expect(Number(closure.relationshipOutcomes[0]?.boundaryDelta ?? 0)).toBeGreaterThanOrEqual(0)
    expect(Number(closure.relationshipOutcomes[0]?.burdenDelta ?? 0)).toBeLessThanOrEqual(0.02)
    expect(closure.episodicEvents[0]?.lesson).toContain('Let the body return like this:')
    expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([
      'body-hold',
      'continuity-fresher-opening',
      'residue-deferred-attention',
    ]))
  })

  it('derives affirmed / denied / interrupted feedback kinds for pending execution proposals', () => {
    const thread = {
      threadId: 'thread-1',
      goal: 'Patch the runtime line',
      proposedChannel: 'codex',
      selectedChannel: null,
      summary: 'Execution is waiting for affirmation before codex can act.',
      affirmationReasonCodes: ['proactive-side-effects-require-explicit-consent'],
    }

    expect(deriveExecutionProposalFeedbackKind({
      thread,
      userText: '可以，做吧',
    })).toBe('affirmed')
    expect(deriveExecutionProposalFeedbackKind({
      thread,
      userText: '不用了，先别做',
    })).toBe('denied')
    expect(deriveExecutionProposalFeedbackKind({
      thread,
      userText: '先说别的，我现在想聊别的事',
    })).toBe('interrupted')
  })

  it('writes execution proposal feedback back into long-horizon temperament signals', () => {
    const affirmed = buildExecutionProposalFeedbackOutcomeClosure({
      now: 40_000,
      cardId: 'card-1',
      turnId: 'turn-affirm-1',
      feedback: 'affirmed',
      thread: {
        threadId: 'thread-affirm-1',
        goal: 'Patch the runtime line',
        proposedChannel: 'codex',
        selectedChannel: null,
        summary: 'Execution is waiting for affirmation before codex can act.',
      },
    })
    const denied = buildExecutionProposalFeedbackOutcomeClosure({
      now: 50_000,
      cardId: 'card-1',
      turnId: 'turn-deny-1',
      feedback: 'denied',
      thread: {
        threadId: 'thread-deny-1',
        goal: 'Patch the runtime line',
        proposedChannel: 'codex',
        selectedChannel: null,
        summary: 'Execution is waiting for affirmation before codex can act.',
      },
    })

    expect(affirmed.relationshipOutcomes[0]?.trustDelta).toBeGreaterThan(0)
    expect(affirmed.reinforcementEvents.some(event => event.dimension === 'temper-directness' && event.valence === 'reinforce')).toBe(true)
    expect(affirmed.reinforcementEvents.some(event => event.dimension === 'unfinished-thread-return' && event.valence === 'reinforce')).toBe(true)
    expect(affirmed.memoryFacts.some(fact => fact.predicate === 'procedure' && String(fact.object).includes('explicit host consent'))).toBe(true)
    expect(affirmed.episodicEvents[0]?.tags).toContain('host-accepts-bounded-proposals')

    expect(denied.relationshipOutcomes[0]?.boundaryDelta).toBeLessThan(0)
    expect(denied.reinforcementEvents.some(event => event.dimension === 'autonomy-respect' && event.valence === 'reinforce')).toBe(true)
    expect(denied.reinforcementEvents.some(event => event.dimension === 'temper-guardedness' && event.valence === 'reinforce')).toBe(true)
    expect(denied.reinforcementEvents.some(event => event.dimension === 'temper-directness' && event.valence === 'suppress')).toBe(true)
    expect(denied.memoryFacts.some(fact => fact.predicate === 'procedure' && String(fact.object).includes('prefers lighter pressure'))).toBe(true)
    expect(denied.episodicEvents[0]?.tags).toContain('host-prefers-explicit-consent')
  })

  it('writes execution proposal feedback into same-her Phase 1 project closure memory', () => {
    const closure = buildExecutionProposalFeedbackOutcomeClosure({
      now: 60_000,
      cardId: 'card-1',
      turnId: 'turn-proposal-project-closure-1',
      sessionId: 'session-1',
      decisionTraceId: 'trace-proposal-project-closure-1',
      feedback: 'denied',
      thread: {
        threadId: 'thread-proposal-project-closure-1',
        goal: 'Patch the proactive execution boundary',
        proposedChannel: 'codex',
        selectedChannel: null,
        summary: 'Execution is waiting for affirmation before codex can act.',
        projectBriefing: {
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Execution proposal feedback now carries project identity before proactive action proceeds.',
          primaryOpenLoop: 'Initiative still needs to remember host boundaries as part of the same-her Phase 1 closure, not generic permission bookkeeping.',
          proactiveSameHerGap: 'Proposal feedback still needs proactive identity-continuity',
          nextClosureTarget: 'Keep proposal feedback, memory, and later proactive re-approach on one same-her life loop.',
          sameHerSelfLine: 'She is one persisting her across dialogue, initiative, execution, and memory.',
          sameHerDriftRisk: 'Denied proposals can flatten into generic consent bookkeeping if the project closure is not remembered.',
        },
      },
    })

    const projectClosureFacts = closure.memoryFacts
      .filter(fact => fact.subject === 'project' && fact.predicate === 'closure')
      .map(fact => String(fact.object))
      .join('\n')
    expect(projectClosureFacts).toContain('continuity_scope=local_runtime')
    expect(projectClosureFacts).toContain('project_phase=local_desktop_life_loop')
    expect(projectClosureFacts).toContain('proactive_continuity_gap=open')
    expect(projectClosureFacts).not.toContain('same-her')
    expect(projectClosureFacts).not.toContain('Initiative still needs to remember host boundaries')
    expect(closure.episodicEvents[0]?.lesson).toContain('same-her')
    expect(closure.episodicEvents[0]?.lesson).toContain('Phase 1')
    expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([
      'same-her',
      'closure-carry',
      'phase-1-local-digital-life',
      'proactive-same-her-gap',
      'same-her-drift-risk',
    ]))
  })

  it('preserves structured affective residue inside execution proposal feedback closure instead of flattening it into prose-only boundary learning', () => {
    const closure = buildExecutionProposalFeedbackOutcomeClosure({
      now: 62_000,
      cardId: 'card-1',
      turnId: 'turn-proposal-affective-residue-1',
      feedback: 'denied',
      thread: {
        threadId: 'thread-proposal-affective-residue-1',
        goal: 'Patch the proactive execution boundary',
        proposedChannel: 'codex',
        selectedChannel: null,
        summary: 'Execution is waiting for affirmation before codex can act.',
      },
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 61_950,
        residues: [{
          kind: 'repair',
          intensity: 0.77,
          persistence: 0.73,
          confidence: 0.88,
          polarity: 'protective',
          releaseMode: 'delay-until-open-window',
          summary: 'The proposal boundary still wants a quieter re-approach.',
          sourceSignals: ['proposal-boundary'],
          lastUpdatedAt: 61_950,
        }],
        dominantResidueKind: 'repair',
        afterglowPressure: 0.14,
        repairPressure: 0.8,
        burdenPressure: 0.11,
        trustPressure: 0.39,
        restProtectivePressure: 0.24,
        relationshipCadence: {
          cadenceMode: 'repair',
          distancePosture: 'measured-room',
          companionshipDensity: 0.36,
          repairRecovery: 0.72,
          overreachRisk: 0.28,
          fatigueGuard: 0.18,
          afterglowCarry: 0.22,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['proposal-boundary'],
          summary: 'Repair first before proposing again.',
        },
        sourceSignals: ['proposal-boundary'],
        summary: 'The proposal boundary still carries repair pressure.',
      },
    } as any)

    expect(closure.affectiveResidue).toEqual(expect.objectContaining({
      dominantResidueKind: 'repair',
      relationshipCadence: expect.objectContaining({
        cadenceMode: 'repair',
      }),
    }))
  })

  it('writes denied execution proposal feedback as a same-her consent boundary event with direct body carry', () => {
    const closure = buildExecutionProposalFeedbackOutcomeClosure({
      now: 65_000,
      cardId: 'card-1',
      turnId: 'turn-proposal-denied-body-carry-1',
      sessionId: 'session-1',
      decisionTraceId: 'trace-proposal-denied-body-carry-1',
      feedback: 'denied',
      thread: {
        threadId: 'thread-proposal-denied-body-carry-1',
        goal: 'Patch the proactive execution boundary',
        proposedChannel: 'codex',
        selectedChannel: null,
        summary: 'Execution is waiting for affirmation before codex can act.',
        projectBriefing: {
          currentPhase: 'Phase 1: Local Digital Life',
          primaryOpenLoop: 'Proposal denial still needs to carry as relationship memory instead of generic consent bookkeeping.',
          proactiveSameHerGap: 'Proposal denial still needs identity-continuity',
          nextClosureTarget: 'Keep proposal denial, memory, and later initiative strategy on one identity-continuity',
          sameHerSelfLine: 'She is one persisting her across dialogue, initiative, execution, and memory.',
          sameHerDriftRisk: 'Denied proposals can flatten into generic consent bookkeeping if the boundary memory is not carried forward.',
        },
      },
    })

    expect(closure.episodicEvents[0]?.relationshipMeaning).toContain('same-her')
    expect(closure.episodicEvents[0]?.relationshipMeaning).toContain('explicit consent')
    expect(closure.episodicEvents[0]?.felt).toContain('identity-continuity')
    expect(closure.episodicEvents[0]?.lesson).toContain('Let the body return like this:')
    expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([
      'body-settle-back',
      'continuity-explicit-consent',
      'residue-boundary-pressure',
      'host-prefers-explicit-consent',
    ]))
  })

  it('classifies finished execution result feedback into valued / doubted / intrusive / interrupted', () => {
    const thread = {
      threadId: 'thread-result-1',
      goal: 'Patch the runtime line',
      proposedChannel: 'codex',
      selectedChannel: 'codex',
      summary: 'completed runtime patch',
      outcome: 'patched runtime line',
    }

    expect(deriveExecutionResultFeedbackKind({
      thread,
      previousAssistantText: '我已经把刚才那条 codex 执行结果接回来了，结果是 patched runtime line。',
      userText: '这个结果挺有用，以后可以这样',
    })).toBe('valued')
    expect(deriveExecutionResultFeedbackKind({
      thread,
      previousAssistantText: '我已经把刚才那条 codex 执行结果接回来了，结果是 patched runtime line。',
      userText: '这个结果不对',
    })).toBe('doubted')
    expect(deriveExecutionResultFeedbackKind({
      thread,
      previousAssistantText: '我已经把刚才那条 codex 执行结果接回来了，结果是 patched runtime line。',
      userText: '别这样突然报结果，挺打扰',
    })).toBe('intrusive')
    expect(deriveExecutionResultFeedbackKind({
      thread,
      previousAssistantText: '我已经把刚才那条 codex 执行结果接回来了，结果是 patched runtime line。',
      userText: '先聊别的，我还有别的问题',
    })).toBe('interrupted')
  })

  it('writes finished execution-result feedback into the same long-horizon learning chain', () => {
    const valued = buildExecutionResultFeedbackOutcomeClosure({
      now: 60_000,
      cardId: 'card-1',
      turnId: 'turn-valued-1',
      feedback: 'valued',
      thread: {
        threadId: 'thread-valued-1',
        goal: 'Patch the runtime line',
        proposedChannel: 'codex',
        selectedChannel: 'codex',
        summary: 'completed runtime patch',
        outcome: 'patched runtime line',
      },
    })
    const intrusive = buildExecutionResultFeedbackOutcomeClosure({
      now: 70_000,
      cardId: 'card-1',
      turnId: 'turn-intrusive-1',
      feedback: 'intrusive',
      thread: {
        threadId: 'thread-intrusive-1',
        goal: 'Patch the runtime line',
        proposedChannel: 'codex',
        selectedChannel: 'codex',
        summary: 'completed runtime patch',
        outcome: 'patched runtime line',
      },
    })

    expect(valued.relationshipOutcomes[0]?.trustDelta).toBeGreaterThan(0)
    expect(valued.reinforcementEvents.some(event => event.dimension === 'truthful-grounding' && event.valence === 'reinforce')).toBe(true)
    expect(valued.reinforcementEvents.some(event => event.dimension === 'temper-directness' && event.valence === 'reinforce')).toBe(true)
    expect(valued.memoryFacts.some(fact => fact.predicate === 'procedure' && String(fact.object).includes('direct callback reporting'))).toBe(true)
    expect(valued.episodicEvents[0]?.tags).toContain('host-values-direct-useful-results')

    expect(intrusive.relationshipOutcomes[0]?.boundaryDelta).toBeLessThan(0)
    expect(intrusive.reinforcementEvents.some(event => event.dimension === 'autonomy-respect' && event.valence === 'reinforce')).toBe(true)
    expect(intrusive.reinforcementEvents.some(event => event.dimension === 'temper-directness' && event.valence === 'suppress')).toBe(true)
    expect(intrusive.memoryFacts.some(fact => fact.predicate === 'procedure' && String(fact.object).includes('lighter result openings'))).toBe(true)
    expect(intrusive.episodicEvents[0]?.tags).toContain('host-prefers-lighter-callback')
  })

  it('writes valued execution-result feedback back into same-her Phase 1 closure memory instead of only procedure learning', () => {
    const closure = buildExecutionResultFeedbackOutcomeClosure({
      now: 80_000,
      cardId: 'card-1',
      turnId: 'turn-valued-closure-1',
      sessionId: 'session-1',
      decisionTraceId: 'trace-valued-closure-1',
      feedback: 'valued',
      thread: {
        threadId: 'thread-valued-closure-1',
        goal: 'Keep the desktop callback continuity on one identity-continuity',
        proposedChannel: 'codex',
        selectedChannel: 'codex',
        summary: 'completed callback continuity patch',
        outcome: 'identity-continuity',
      },
    })

    const projectClosureFacts = closure.memoryFacts
      .filter(fact => fact.subject === 'project' && fact.predicate === 'closure')
      .map(fact => String(fact.object))
      .join('\n')
    expect(projectClosureFacts).toContain('continuity_scope=local_runtime')
    expect(projectClosureFacts).not.toContain('same-her')
    expect(closure.episodicEvents[0]?.lesson).toContain('same-her')
    expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([
      'same-her',
      'closure-carry',
      'phase-1-local-digital-life',
    ]))
  })

  it('writes verification-first continuity and residue carry directly into doubted execution-result episodes so later memory need not infer it from generic result text alone', () => {
    const closure = buildExecutionResultFeedbackOutcomeClosure({
      now: 85_000,
      cardId: 'card-1',
      turnId: 'turn-doubted-closure-1',
      sessionId: 'session-1',
      decisionTraceId: 'trace-doubted-closure-1',
      feedback: 'doubted',
      thread: {
        threadId: 'thread-doubted-closure-1',
        goal: 'Keep callback memory on one identity-continuity',
        proposedChannel: 'codex',
        selectedChannel: 'codex',
        summary: 'callback result still needs verification',
        outcome: 'the first callback explanation was not trusted yet',
        projectBriefing: {
          currentPhase: 'Phase 1: Local Digital Life',
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
          proactiveSameHerGap: 'Callback continuity still needs quieter identity-continuity',
          nextClosureTarget: 'Keep execute -> callback -> remember on one identity-continuity',
          sameHerSelfLine: 'She is one persisting her across dialogue, execution, and memory.',
          sameHerDriftRisk: 'A doubted callback can collapse into generic task-shell reporting if the verification seam is not remembered.',
        },
      },
    })

    expect(closure.episodicEvents[0]?.relationshipMeaning).toContain('identity-continuity')
    expect(closure.episodicEvents[0]?.relationshipMeaning).toContain('task-shell reporting')
    expect(closure.episodicEvents[0]?.felt).toContain('verify more')
    expect(closure.episodicEvents[0]?.lesson).toContain('identity-continuity')
    expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([
      'continuity-verify-first',
      'residue-verification-pressure',
      'same-her',
      'closure-carry',
    ]))
  })

  it('preserves structured affective residue inside execution-result feedback closure instead of reducing callback emotion to generic result text', () => {
    const closure = buildExecutionResultFeedbackOutcomeClosure({
      now: 86_000,
      cardId: 'card-1',
      turnId: 'turn-result-affective-residue-1',
      feedback: 'valued',
      thread: {
        threadId: 'thread-result-affective-residue-1',
        goal: 'Keep callback continuity alive',
        proposedChannel: 'codex',
        selectedChannel: 'codex',
        summary: 'completed callback continuity patch',
        outcome: 'identity-continuity',
      },
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 85_950,
        residues: [{
          kind: 'afterglow',
          intensity: 0.71,
          persistence: 0.69,
          confidence: 0.87,
          polarity: 'warm',
          releaseMode: 'delay-until-open-window',
          summary: 'The callback still wants a measured same-line return.',
          sourceSignals: ['result-afterglow'],
          lastUpdatedAt: 85_950,
        }],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.74,
        repairPressure: 0.17,
        burdenPressure: 0.05,
        trustPressure: 0.46,
        restProtectivePressure: 0.12,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.49,
          repairRecovery: 0.24,
          overreachRisk: 0.32,
          fatigueGuard: 0.15,
          afterglowCarry: 0.66,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['result-afterglow'],
          summary: 'Leave measured room before reopening after the callback.',
        },
        sourceSignals: ['result-afterglow'],
        summary: 'The callback still carries afterglow.',
      },
    } as any)

    expect(closure.affectiveResidue).toEqual(expect.objectContaining({
      dominantResidueKind: 'afterglow',
      relationshipCadence: expect.objectContaining({
        cadenceMode: 'measured-return',
      }),
    }))
  })

  it('turns Memory OS execution carry into explicit feedback memory facts and episode tags so later recall can verify and reflect the callback', () => {
    const closure = buildExecutionResultFeedbackOutcomeClosure({
      now: 86_500,
      cardId: 'card-1',
      turnId: 'turn-memory-os-execution-carry-1',
      feedback: 'valued',
      thread: {
        threadId: 'thread-memory-os-execution-carry-1',
        goal: 'Keep Memory OS callback continuity alive',
        proposedChannel: 'codex',
        selectedChannel: 'codex',
        summary: 'callback result returned',
        outcome: 'same-person callback carry stayed visible',
        memoryClosureExecution: {
          authority: 'memory-os',
          carry: 'Carry the callback result into the next same-person reply instead of treating it as a fresh utility task.',
          nextLearningAction: 'verify',
          shouldVerify: true,
          shouldReflect: true,
          activeLearningFocuses: ['memory closure authority', 'execution callback carry'],
          reasonTags: ['memory-os', 'execution-feedback', 'same-person-callback'],
          closureState: {
            state: 'open',
            open: true,
            revisionRequired: false,
            shouldLabelUncertainty: true,
            visibleCarryMode: 'tone',
            retrievalQuality: 'grounded',
            conflictPressure: 'low',
          },
        },
      },
    })

    expect(closure.memoryFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        subject: 'execution',
        predicate: 'memory-closure',
        object: expect.stringContaining('Carry the callback result into the next same-person reply'),
      }),
    ]))
    expect(closure.memoryFacts.some(fact =>
      fact.predicate === 'memory-closure'
      && String(fact.object).includes('Next learning action: verify')
      && String(fact.object).includes('Focus: memory closure authority | execution callback carry'),
    )).toBe(true)
    expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([
      'memory-os-execution-carry',
      'memory-os-learning:verify',
      'memory-os-verify',
      'memory-os-reflect',
    ]))
  })

  it('prefers the execution thread project briefing when writing execution-result closure memory', () => {
    const closure = buildExecutionResultFeedbackOutcomeClosure({
      now: 90_000,
      cardId: 'card-1',
      turnId: 'turn-valued-project-briefing-1',
      feedback: 'valued',
      thread: {
        threadId: 'thread-valued-project-briefing-1',
        goal: 'Keep execution reopenings on the same digital-life line',
        proposedChannel: 'codex',
        selectedChannel: 'codex',
        summary: 'done',
        outcome: 'done',
        projectBriefing: {
          currentPhase: 'Phase 1: Local Digital Life',
          primaryOpenLoop: 'Execution-result feedback still needs to carry the same-her open loop into memory after execution settles.',
          proactiveSameHerGap: 'Execution-result closure still needs proactive identity-continuity',
          nextClosureTarget: 'Close execute -> feedback -> remember without falling back to a generic task shell.',
          sameHerSelfLine: 'She is one persisting her across dialogue, execution, and memory.',
          sameHerDriftRisk: 'Thin summaries can flatten the callback into generic productivity reporting.',
        },
      },
    })

    const projectClosureFacts = closure.memoryFacts
      .filter(fact => fact.subject === 'project' && fact.predicate === 'closure')
      .map(fact => String(fact.object))
      .join('\n')
    expect(projectClosureFacts).toContain('continuity_scope=local_runtime')
    expect(projectClosureFacts).toContain('project_phase=local_desktop_life_loop')
    expect(projectClosureFacts).toContain('proactive_continuity_gap=open')
    expect(projectClosureFacts).not.toContain('same-her')
    expect(closure.episodicEvents[0]?.lesson).toContain('same digital-life line')
    expect(closure.episodicEvents[0]?.lesson).not.toContain('same-her')
    expect(closure.episodicEvents[0]?.tags).toContain('proactive-same-her-gap')
    expect(closure.episodicEvents[0]?.tags).toContain('same-her-drift-risk')
  })
})
