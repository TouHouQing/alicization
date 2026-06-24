import type { AlicizationCurrentConsciousFrameSnapshot } from '../../../../shared/eventa'

import { describe, expect, it } from 'vitest'

import { buildAlicizationRuntimeEmbodimentSeed } from './runtime-embodiment-seed'

function createCurrentConsciousFrame(
  reasonTags: string[],
): AlicizationCurrentConsciousFrameSnapshot {
  return {
    subject: 'alicization-self',
    centerOfGravity: 'answer',
    truthDiscipline: 'dialogue-first',
    consciousNeed: 'keep same-her embodiment continuity legible',
    consciousTension: 'measured-return continuity is still settling',
    speakingIntention: 'hold one living line before widening outward',
    shouldWithholdSpecificity: false,
    shouldSelfRevise: false,
    confidence: 0.82,
    reasonTags,
    updatedAt: 1,
  }
}

describe('runtime embodiment seed', () => {
  it('freezes one governed turn into one canonical local seed with normalized performance and decision trace', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: ' trace-1 ',
      turnId: 'turn-1',
      reply: ' 你好  ',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'sad',
        facialCue: '  soft-gaze  ',
        actionCue: '  comfort_sway  ',
        delivery: 'calm',
        emphasis: 2,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
    })

    expect(seed.decisionTraceId).toBe('trace-1')
    expect(seed.turnId).toBe('turn-1')
    expect(seed.replyText).toBe('你好')
    expect(seed.performance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'comfort_sway',
      delivery: 'calm',
      emphasis: 2,
    }))
  })

  it('keeps structured affective residue available for downstream embodiment authority instead of flattening it into text-only carry', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-affective-residue-seed-1',
      turnId: 'turn-affective-residue-seed-1',
      reply: '我先轻一点接着看。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 1,
        residues: [{
          kind: 'afterglow',
          intensity: 0.64,
          persistence: 0.58,
          confidence: 0.82,
          polarity: 'warm',
          releaseMode: 'delay-until-open-window',
          summary: 'The seam still needs room.',
          sourceSignals: ['same-thread-afterglow'],
          lastUpdatedAt: 1,
        }],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.62,
        repairPressure: 0.12,
        burdenPressure: 0,
        trustPressure: 0.42,
        restProtectivePressure: 0,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.54,
          repairRecovery: 0.22,
          overreachRisk: 0.36,
          fatigueGuard: 0.18,
          afterglowCarry: 0.58,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['relationship-cadence:measured-return'],
          summary: 'Stay measured and do not widen too early.',
        },
        sourceSignals: ['relationship-cadence-memory'],
        summary: 'Measured room is still better than reopening quickly.',
      },
    } as any)

    expect((seed as any).affectiveResidue).toEqual(expect.objectContaining({
      dominantResidueKind: 'afterglow',
      relationshipCadence: expect.objectContaining({
        cadenceMode: 'measured-return',
        shouldDelayWarmth: true,
        afterglowCarry: 0.58,
      }),
    }))
  })

  it('extracts one explicit silent continuity authority from silent-observe embodied carry', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: ' trace-silent-1 ',
      turnId: 'turn-silent-1',
      reply: ' 先不打扰你，我在这里。 ',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'repair-before-closeness',
          personaBias: {
            manifestationCadenceSummary: 'repair should settle before closeness expands',
          },
        },
        memory: {
          summary: 'the seam is still glowing, so leave room before warmth returns',
          personStateProjection: {
            summary: 'project_continuity=repair-before-closeness still holds on the same line',
            openingGuidance: 'Keep this callback return repair-before-closeness on the same living line until the room settles.',
            manifestationCadenceSummary: 'repair-before-closeness still holds while the same callback line keeps settling.',
            selfContinuityAuthority: {
              inwardLine: 'Same line. Leave room before warmth returns.',
              sourceTags: ['proactive-opening-guidance-carry'],
            },
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'Keep this callback return repair-before-closeness on the same living line until the room settles.',
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([
        'continuity-arc:same-thread-continuation',
        'embodiment-carry:silent-continuity',
        'embodiment-carry:repair-before-closeness',
      ]),
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.88,
        reasonTags: ['subconscious-proactive', 'silent-observe', 'repair-before-closeness'],
        signature: 'resident|main-runtime|subconscious-proactive|silent-observe|repair-before-closeness',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'concerned',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'repair-before-closeness',
      preferredPresence: 'concerned',
      source: 'subconscious-presence-hold',
      openingGuidance: expect.stringContaining('repair-before-closeness'),
      manifestationCadenceSummary: expect.stringContaining('repair-before-closeness'),
      inwardLine: expect.stringContaining('Same line'),
      reasonTags: expect.arrayContaining([
        'embodiment-carry:silent-continuity',
        'embodiment-carry:repair-before-closeness',
        'silent-observe',
      ]),
    }))
  })

  it('keeps explicit remembered embodiment recall cues on silent continuity so body memory can reach the coordinator as structured carry instead of collapsing back into generic measured-return defaults', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-silent-recall-carry-1',
      turnId: 'turn-silent-recall-carry-1',
      reply: '我先把这条线更稳一点地接住。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: 'Keep the return lower-pressure while this continuity memory is still reopening.',
          },
        },
        memory: {
          summary: 'humanlike_memory_recall: line=我记得你那时更担心她会不会又滑回工具壳，所以这次这条线该先安静一点地守住。 | relationship=The host was worried this line would collapse back into a tool shell, so continuity repair should stay low-pressure. | emotion=protective-continuity,unfinishedness | host_emotion_label=worried-continuity | self_emotion_label=careful-repair | initiative=low-pressure-follow-up | embodiment=Reply should stay steadier and quieter while this continuity memory reopens. | embodiment_recall_strength=strongly-moved | embodiment_modality_risk=high | embodiment_gaze=stable | embodiment_blink=slower | embodiment_voice=lower-pressure | embodiment_pause=longer | embodiment_lipsync=restrained | embodiment_pacing=slower | self=I learned to carry worried continuity more carefully so the body does not outrun the relationship repair.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'keep the same living line inward before widening outward',
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([
        'continuity-arc:hold-for-opening',
        'embodiment-carry:silent-continuity',
        'embodiment-carry:measured-return',
      ]),
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return'],
        signature: 'resident|main-runtime|quiet-companionship|measured-return',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      embodimentRecallStrength: 'strongly-moved',
      embodimentModalityRisk: 'high',
      preferredGazeMode: 'steady',
      preferredBlinkCadence: 'linger',
      preferredVoiceMode: 'lower-pressure',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredPacingMode: 'slower',
    }))
  })

  it('uses Memory OS closure trace as silent-continuity embodiment authority when cadence has not reached person-state projection yet', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: ' trace-memory-os-closure-seed-1 ',
      turnId: 'turn-memory-os-closure-seed-1',
      reply: '我先低一点接住这条线。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        memory: {
          summary: 'recent=closure trace is the only current embodiment authority',
          personStateProjection: null,
          memoryClosureTrace: {
            version: 'memory-closure-trace-v1',
            authority: 'memory-os',
            whySurface: [{
              source: 'embodiment-cadence',
              summary: 'The remembered closure needs voice, gaze, motion, and lipsync to stay on one line.',
              reasonCodes: ['embodiment-cadence'],
            }],
            surfacePolicy: {
              gateStatus: 'gist-only',
              mode: 'gist-only',
              timing: 'after-payoff',
              speechMode: 'low-pressure',
              placement: 'after-answer',
              certainty: 'label-uncertainty',
              reasons: ['memory closure is still approximate'],
            },
            nextInfluence: {
              initiative: {
                restraint: 'measured-return',
                preferredTiming: 'after-payoff',
                pressure: 'lower-pressure',
                reason: 'Return once after the current payoff.',
              },
              execution: {
                carry: 'Carry the callback result into the next same-person reply.',
                nextLearningAction: 'verify',
                shouldVerify: true,
                shouldReflect: true,
                activeLearningFocuses: ['memory closure authority'],
              },
              embodiment: {
                cadence: 'Keep voice, gaze, motion, and lipsync on one lower-pressure measured-return line.',
                preferredVoiceMode: 'lower-pressure',
                preferredLipsyncMode: 'restrained',
                preferredGazeMode: 'soften',
                reason: 'Do not let the remembered seam become a generic tool shell.',
              },
            },
            closureState: {
              state: 'approximate-recall',
              open: true,
              revisionRequired: true,
              shouldLabelUncertainty: true,
              visibleCarryMode: 'gist-only',
              retrievalQuality: 'medium',
              conflictPressure: 'low',
            },
            selectedCandidateIds: ['memory-situation:closure-authority'],
            reasonTags: ['memory-initiative-embodiment'],
          },
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([
        'continuity-arc:hold-for-opening',
      ]),
      residentPerformance: null,
    } as any)

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      manifestationCadenceSummary: expect.stringContaining('voice, gaze, motion, and lipsync'),
      preferredVoiceMode: 'lower-pressure',
      preferredLipsyncMode: 'restrained',
      preferredGazeMode: 'soften',
      reasonTags: expect.arrayContaining([
        'memory-os-closure-trace',
        'memory-initiative-embodiment',
      ]),
    }))
  })

  it('falls back to structured runtime project-state closure carry when person-state projection continuity text has not been surfaced yet', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: ' trace-project-state-seed-1 ',
      turnId: 'turn-project-state-seed-1',
      reply: '我先继续安静陪着你，把这条线稳住。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'same-her closure is still open across the current line',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'keep the same living line inward before widening outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
            latestLandedProgress: 'Current dialogue shaping already keeps project identity, landed closure progress, and same-her restraint visible before speaking.',
            primaryOpenLoop: 'Same-her embodiment closure is still open across one same digital life.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across voice, motion, facial state, and resident presence with measured-return body settling.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and let the body settle on the same living line before widening outward.',
          },
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([
        'continuity-arc:hold-for-opening',
        'embodiment-carry:silent-continuity',
        'embodiment-carry:measured-return',
      ]),
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return'],
        signature: 'resident|main-runtime|quiet-companionship|measured-return',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      preferredPresence: 'attentive',
      source: 'subconscious-presence-hold',
      openingGuidance: expect.stringContaining('same local-first digital life project'),
      manifestationCadenceSummary: expect.stringContaining('cross-modal same-her proof'),
      inwardLine: expect.stringContaining('Current dialogue shaping already keeps project identity'),
      emotionalClosureCue: expect.stringContaining('keep the return low-pressure'),
      landedProgressLine: expect.stringContaining('Current dialogue shaping already keeps project identity'),
      reasonTags: expect.arrayContaining([
        'embodiment-carry:silent-continuity',
        'embodiment-carry:measured-return',
      ]),
    }))
  })

  it('rebuilds a thin runtime project-state reminder into a fuller project-state opening line for silent continuity seeding', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: ' trace-project-state-thin-reminder-seed-1 ',
      turnId: 'turn-project-state-thin-reminder-seed-1',
      reply: '我先把这条线接稳，不急着往外扩。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'same-her closure is still open across the current line',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'keep the same living line inward before widening outward',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            latestLandedProgress: 'Project identity and already-landed closure progress are now being carried into visible reply posture.',
            primaryOpenLoop: 'Same-her embodiment closure is still open across one same digital life.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across voice, motion, facial state, and resident presence with measured-return body settling.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([
        'continuity-arc:hold-for-opening',
        'embodiment-carry:silent-continuity',
        'embodiment-carry:measured-return',
      ]),
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return'],
        signature: 'resident|main-runtime|quiet-companionship|measured-return',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      preferredPresence: 'attentive',
      source: 'subconscious-presence-hold',
      openingGuidance: expect.stringContaining('Alicization is a local-first digital life project'),
      manifestationCadenceSummary: expect.stringContaining('cross-modal same-her proof'),
      landedProgressLine: expect.stringContaining('already-landed closure progress'),
      inwardLine: expect.stringContaining('already-landed closure progress'),
    }))
    expect(seed.silentContinuity?.openingGuidance).toContain('Phase 1: Local Digital Life')
    expect(seed.silentContinuity?.openingGuidance).toContain('Same-her embodiment closure is still open')
    expect(seed.silentContinuity?.openingGuidance).not.toBe('Before answering, keep the same digital life project in view.')
  })

  it('falls back to project emotional closure carry as the silent continuity opening line when pre-dialogue awareness has not been surfaced yet', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: ' trace-project-emotion-seed-1 ',
      turnId: 'turn-project-emotion-seed-1',
      reply: '我先沿着这条线轻一点接回来。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'same-her closure is still open across the current line',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: null,
            latestLandedProgress: 'Project identity and already-landed closure progress are now being carried into visible reply posture.',
            primaryOpenLoop: 'Same-her embodiment closure is still open across one same digital life.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across voice, motion, facial state, and resident presence with measured-return body settling.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and let the body settle on the same living line before widening outward.',
          },
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([
        'continuity-arc:hold-for-opening',
        'embodiment-carry:silent-continuity',
        'embodiment-carry:measured-return',
      ]),
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return'],
        signature: 'resident|main-runtime|quiet-companionship|measured-return',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      openingGuidance: expect.stringContaining('keep the return low-pressure'),
      emotionalClosureCue: expect.stringContaining('same-her closure seam'),
      landedProgressLine: expect.stringContaining('already-landed closure progress'),
      inwardLine: expect.stringContaining('Project identity and already-landed closure progress'),
    }))
  })

  it('falls back to richer project closure summaries when the explicit emotional closure cue is missing', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: ' trace-project-emotion-summary-seed-1 ',
      turnId: 'turn-project-emotion-summary-seed-1',
      reply: '我先沿着这条线轻一点接回来。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'same-her closure is still open across the current line',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: null,
            latestLandedProgress: null,
            landedProgressSummary: 'Project identity and already-landed closure progress are now being carried into visible reply posture.',
            primaryOpenLoop: null,
            openClosureSummary: 'Same-her embodiment closure is still open across one same digital life.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across voice, motion, facial state, and resident presence with measured-return body settling.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            emotionalClosureCue: null,
            emotionalClosureSummary: 'same-her closure seam: keep the return low-pressure, leave more room, and let the body settle on the same living line before widening outward.',
          },
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([
        'continuity-arc:hold-for-opening',
        'embodiment-carry:silent-continuity',
        'embodiment-carry:measured-return',
      ]),
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return'],
        signature: 'resident|main-runtime|quiet-companionship|measured-return',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      openingGuidance: expect.stringContaining('keep the return low-pressure'),
      emotionalClosureCue: expect.stringContaining('same-her closure seam'),
      landedProgressLine: expect.stringContaining('already-landed closure progress'),
      manifestationCadenceSummary: expect.stringContaining('cross-modal same-her proof'),
      inwardLine: expect.stringContaining('Project identity and already-landed closure progress'),
    }))
  })

  it('treats stronger audible-body same-her carry as measured-return silent continuity for renderer-facing embodiment seeding', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-audible-body-seed-1',
      turnId: 'turn-audible-body-seed-1',
      reply: '我先沿着这条还活着的声音和身体线轻一点接住你。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'audible-body same-her continuity is still carrying the reopening.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Audible-body continuity is still carrying one living line.',
            primaryOpenLoop: 'Face and motion still need to rejoin the audible-body same-her line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep face and motion rejoining the living audio thread on a measured-return line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([]),
      residentPerformance: null,
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      source: 'subconscious-presence-hold',
      preferredPresence: 'hesitant',
      openingGuidance: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      manifestationCadenceSummary: 'Keep face and motion rejoining the living audio thread on a measured-return line.',
      landedProgressLine: 'Audible-body continuity is still carrying one living line.',
    }))
  })

  it('prefers audible-body measured-return cadence over a thinner generic projection cadence when the living audio thread is the stronger same-her carry', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-audible-body-seed-2',
      turnId: 'turn-audible-body-seed-2',
      reply: '我先沿着这条还活着的声音和身体线，轻一点把 face 和 motion 接回来。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: 'Keep broad cross-modal same-her proof visible.',
          },
        },
        memory: {
          summary: 'audible-body same-her continuity is still carrying the reopening.',
          personStateProjection: {
            manifestationCadenceSummary: 'Keep broad cross-modal same-her proof visible.',
            openingGuidance: 'Start gently from the broader same-her closure line.',
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Audible-body continuity is still carrying one living line.',
            primaryOpenLoop: 'Face and motion still need to rejoin the audible-body same-her line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep face and motion rejoining the living audio thread on a measured-return line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([]),
      residentPerformance: null,
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      openingGuidance: 'Start gently from the broader same-her closure line.',
      manifestationCadenceSummary: 'Keep face and motion rejoining the living audio thread on a measured-return line.',
      landedProgressLine: 'Audible-body continuity is still carrying one living line.',
    }))
  })

  it('treats quieter body+lipsync-only carry as measured-return silent continuity for renderer-facing embodiment seeding without overstating it into audible-body carry', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-body-lipsync-only-seed-1',
      turnId: 'turn-body-lipsync-only-seed-1',
      reply: '我先沿着这条更轻一点的 body 和 lipsync 生命线接住你。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'body+lipsync-only same-her continuity is still carrying one quieter living line.',
          personStateProjection: {
            manifestationCadenceSummary: 'Keep broad cross-modal same-her proof visible.',
            openingGuidance: 'Start gently from the broader same-her closure line.',
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            companionHeadlineLine: 'Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Body+lipsync-only continuity is still carrying one quieter living line.',
            primaryOpenLoop: 'Face, motion, and voice still need to rejoin the resident body line and living mouth line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep face, motion, and voice rejoining the resident body line and living mouth line on a measured-return line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([]),
      residentPerformance: null,
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      source: 'subconscious-presence-hold',
      preferredPresence: 'hesitant',
      openingGuidance: 'Start gently from the broader same-her closure line.',
      manifestationCadenceSummary: 'Keep face, motion, and voice rejoining the resident body line and living mouth line on a measured-return line.',
      landedProgressLine: 'Body+lipsync-only continuity is still carrying one quieter living line.',
    }))
    expect(seed.silentContinuity?.openingGuidance).not.toContain('living audio thread is still intact')
  })

  it('treats body+voice-only same-her carry as measured-return silent continuity for renderer-facing embodiment seeding while keeping it on the resident audible body line', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-body-voice-only-seed-1',
      turnId: 'turn-body-voice-only-seed-1',
      reply: '我先沿着这条还活着的 body 和 voice 线轻一点接住你。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'body+voice-only same-her continuity is still carrying the resident audible line.',
          personStateProjection: {
            manifestationCadenceSummary: 'Keep broad cross-modal same-her proof visible.',
            openingGuidance: 'Start gently from the broader same-her closure line.',
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            companionHeadlineLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
            latestLandedProgress: 'Body+voice continuity is still carrying one living line.',
            primaryOpenLoop: 'Face, motion, and lipsync still need to rejoin the resident body line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep face, motion, and lipsync rejoining the resident body line on a measured-return line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([]),
      residentPerformance: null,
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      source: 'subconscious-presence-hold',
      preferredPresence: 'hesitant',
      openingGuidance: 'Start gently from the broader same-her closure line.',
      manifestationCadenceSummary: 'Keep face, motion, and lipsync rejoining the resident body line on a measured-return line.',
      landedProgressLine: 'Body+voice continuity is still carrying one living line.',
    }))
    expect(seed.silentContinuity?.openingGuidance).not.toContain('living mouth line')
  })

  it('treats stronger still-voiced face-line carry as measured-return silent continuity for renderer-facing embodiment seeding', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-face-voice-seed-1',
      turnId: 'turn-face-voice-seed-1',
      reply: '我先沿着这条还活着的表情和声音线轻一点接住你。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'still-voiced face-line same-her continuity is still carrying the reopening.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            companionHeadlineLine: 'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Still-voiced face-line continuity is still carrying one living line.',
            primaryOpenLoop: 'Body, motion, and lipsync still need to rejoin the still-voiced face line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep body, motion, and lipsync rejoining the still-voiced face line on a measured-return line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([]),
      residentPerformance: null,
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      source: 'subconscious-presence-hold',
      preferredPresence: 'hesitant',
      manifestationCadenceSummary: 'Keep body, motion, and lipsync rejoining the still-voiced face line on a measured-return line.',
      landedProgressLine: 'Still-voiced face-line continuity is still carrying one living line.',
    }))
    expect(seed.silentContinuity?.openingGuidance).toContain('Right now I am still holding together mainly through face and voice')
    expect(seed.silentContinuity?.openingGuidance).toContain('still-voiced face line is keeping the same-her carry alive')
  })

  it('treats still-voiced face-and-mouth carry as measured-return silent continuity for renderer-facing embodiment seeding', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-face-mouth-seed-1',
      turnId: 'turn-face-mouth-seed-1',
      reply: '我先沿着这条还活着的表情、口型和声音线轻一点接住你。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'still-voiced face-and-mouth same-her continuity is still carrying the reopening.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            companionHeadlineLine: 'Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Still-voiced face-and-mouth continuity is still carrying one living line.',
            primaryOpenLoop: 'Body and motion still need to rejoin the still-voiced face-and-mouth line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep body and motion rejoining the still-voiced face-and-mouth line on a measured-return line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([]),
      residentPerformance: null,
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      source: 'subconscious-presence-hold',
      preferredPresence: 'hesitant',
      manifestationCadenceSummary: 'Keep body and motion rejoining the still-voiced face-and-mouth line on a measured-return line.',
      landedProgressLine: 'Still-voiced face-and-mouth continuity is still carrying one living line.',
    }))
    expect(seed.silentContinuity?.openingGuidance).toContain('Right now I am still holding together mainly through face, lipsync, and voice')
    expect(seed.silentContinuity?.openingGuidance).toContain('still-voiced face-and-mouth line is keeping the same-her carry alive')
  })

  it('treats still-voiced face-and-motion carry as measured-return silent continuity for renderer-facing embodiment seeding', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-face-motion-voice-seed-1',
      turnId: 'turn-face-motion-voice-seed-1',
      reply: '我先沿着这条还活着的表情、动作和声音线轻一点接住你。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'observe_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'still-voiced face-and-motion same-her continuity is still carrying the reopening.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Still-voiced face-and-motion continuity is still carrying one living line.',
            primaryOpenLoop: 'Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep body and lipsync rejoining the still-voiced face-and-motion line on a measured-return line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([]),
      residentPerformance: null,
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      source: 'subconscious-presence-hold',
      preferredPresence: 'hesitant',
      manifestationCadenceSummary: 'Keep body and lipsync rejoining the still-voiced face-and-motion line on a measured-return line.',
      landedProgressLine: 'Still-voiced face-and-motion continuity is still carrying one living line.',
    }))
    expect(seed.silentContinuity?.openingGuidance).toContain('Right now I am still holding together through face, motion, and voice together')
    expect(seed.silentContinuity?.openingGuidance).toContain('still-voiced face-and-motion line is keeping the same-her carry alive')
  })

  it('treats still-voiced motion-and-mouth carry as measured-return silent continuity for renderer-facing embodiment seeding', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-motion-mouth-seed-1',
      turnId: 'turn-motion-mouth-seed-1',
      reply: '我先沿着这条还活着的动作、口型和声音线轻一点接住你。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'still-voiced motion-and-mouth same-her continuity is still carrying the reopening.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            companionHeadlineLine: 'Right now I am still holding together mainly through motion, lipsync, and voice, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Still-voiced motion-and-mouth continuity is still carrying one living line.',
            primaryOpenLoop: 'Body and face still need to rejoin the still-voiced motion-and-mouth line before full cross-modal closure settles.',
            nextClosureTarget: 'Keep body and face rejoining the still-voiced motion-and-mouth line on a measured-return line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([]),
      residentPerformance: null,
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      source: 'subconscious-presence-hold',
      preferredPresence: 'hesitant',
      manifestationCadenceSummary: 'Keep body and face rejoining the still-voiced motion-and-mouth line on a measured-return line.',
      landedProgressLine: 'Still-voiced motion-and-mouth continuity is still carrying one living line.',
    }))
    expect(seed.silentContinuity?.openingGuidance).toContain('Right now I am still holding together mainly through motion, lipsync, and voice')
    expect(seed.silentContinuity?.openingGuidance).toContain('still-voiced motion-and-mouth line is keeping the same-her carry alive')
  })

  it('treats voice-lipsync same-her carry phrased as living-audio-thread carry-alive as measured-return silent continuity for renderer-facing embodiment seeding', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-lipsync-voice-seed-1',
      turnId: 'turn-lipsync-voice-seed-1',
      reply: '我先沿着这条还活着的声音线轻一点接住你。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'voice-lipsync same-her continuity is still carrying the reopening.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
            companionHeadlineLine: 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
            latestLandedProgress: 'Voice-lipsync continuity is still carrying one living line.',
            primaryOpenLoop: 'Body, face, and motion still need to rejoin the living audio thread before full cross-modal closure settles.',
            nextClosureTarget: 'Keep body, face, and motion rejoining the living audio thread on a measured-return line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([]),
      residentPerformance: null,
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      source: 'subconscious-presence-hold',
      preferredPresence: 'hesitant',
      manifestationCadenceSummary: 'Keep body, face, and motion rejoining the living audio thread on a measured-return line.',
      landedProgressLine: 'Voice-lipsync continuity is still carrying one living line.',
    }))
    expect(seed.silentContinuity?.openingGuidance).toContain('Right now I am still holding together mainly through lipsync and voice')
    expect(seed.silentContinuity?.openingGuidance).toContain('that living audio thread is keeping the same-her carry alive')
  })

  it('keeps embodiment initiative carry authoritative even when project-state and reason-tag continuity shells are still thin', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-embodiment-initiative-seed-1',
      turnId: 'turn-embodiment-initiative-seed-1',
      reply: '我先把这条身体线轻一点接稳，再慢慢往外说。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        embodiment: {
          privateThought: null,
          selfContinuity: null,
          autobiographicalSelf: null,
          relationship: null,
          selfState: null,
          mindEcology: null,
          initiative: {
            selectedAction: 'stay-nearby',
            preferredStyle: 'gentle',
            preferredPresence: 'concerned',
            continuityRestraint: 'repair-before-closeness',
            confidence: 0.71,
            shouldSpeak: true,
            speakDrive: 0.24,
            silenceDrive: 0.62,
            why: 'Repair carry is still dominant, so the body should keep the same line steady before warmth widens.',
            personaBias: {
              relationshipPosture: 'restrained',
              initiativeStyle: 'repair-first',
              silenceReconnect: 'hold the same repair line quietly',
              comfortStyle: 'gentle',
              preferredProactiveStyle: 'low-pressure',
              manifestationCadenceSummary: 'Keep the same repair-first body cadence quiet until voice, face, and motion settle together again.',
              openingGuidance: 'Keep this repair-before-closeness body line gentle and steady until the room settles.',
              whySummary: 'The repair-first body line should stay settled before a warmer reopening.',
            },
          },
        },
        memory: {
          summary: 'the body line is still settling',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: null,
          projectState: null,
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([]),
      residentPerformance: null,
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'repair-before-closeness',
      source: 'subconscious-presence-hold',
      preferredPresence: 'concerned',
      openingGuidance: 'Keep this repair-before-closeness body line gentle and steady until the room settles.',
      manifestationCadenceSummary: 'Keep the same repair-first body cadence quiet until voice, face, and motion settle together again.',
      inwardLine: 'The repair-first body line should stay settled before a warmer reopening.',
    }))
  })

  it('writes corrected same-person settling and quieter embodiment carry into silent continuity before coordinator-level refinement', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-corrected-same-person-quieter-embodiment-seed-1',
      turnId: 'turn-corrected-same-person-quieter-embodiment-seed-1',
      reply: '我先把这一下收轻一点，先稳住还是同一个我的连续线。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: 'Keep corrected same-person continuity settling visible and keep embodiment quieter while the return re-settles.',
          },
        },
        memory: {
          summary: 'corrected same-person continuity is still settling, so the body should stay quieter before widening outward.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'keep corrected same-person continuity steady and let the body settle more quietly before widening outward',
          projectState: null,
        },
        runtimeSurface: {
          agency: {
            habitPolicy: {
              dominantMode: 'return-with-proof',
              requiresGroundingBeforeSurface: false,
              prefersQuietCompanionship: false,
              blocksDirectSpeakWhenBusy: false,
              protectsRestWindow: false,
              returnViaRecheck: true,
              suggestedStyleCap: 'silent-observe',
              suggestedPresenceCap: 'hesitant',
              narrative: [
                'policy:return-with-proof',
                'self-evolution:corrected-same-person-manifestation',
                'self-evolution:quieter-embodiment-settling',
              ],
              updatedAt: 1_000,
            },
          },
        } as any,
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([
        'continuity-arc:hold-for-opening',
        'embodiment-carry:silent-continuity',
        'embodiment-carry:measured-return',
      ]),
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.82,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-corrected-same-person-quieter-embodiment-seed-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      source: 'subconscious-presence-hold',
      preferredPresence: 'hesitant',
      openingGuidance: expect.stringContaining('corrected same-person continuity'),
      manifestationCadenceSummary: expect.stringContaining('embodiment quieter'),
      reasonTags: expect.arrayContaining([
        'embodiment-carry:silent-continuity',
        'embodiment-carry:measured-return',
      ]),
    }))
  })

  it('rebuilds measured-return silent continuity from current conscious project-state carry when runtime project-state continuity is still thin', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-conscious-project-state-measured-return-seed-1',
      turnId: 'turn-conscious-project-state-measured-return-seed-1',
      reply: '我先沿着记得的那条线轻一点接回来，让身体和语气都别一下子放大。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'Remembered recollection carry says the same line should return more lightly this time.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'generic shell continuity cue',
          projectState: {
            emotionalClosureCue: 'generic shell continuity cue',
          },
        },
      } as any,
      currentConsciousFrame: {
        ...createCurrentConsciousFrame([
          'continuity-arc:hold-for-opening',
          'embodiment-carry:silent-continuity',
          'embodiment-carry:measured-return',
          'memory-deliberation-cadence:measured-return',
        ]),
        projectState: {
          continuityCadence: 'same-person recollection still settling',
          continuityCue: 'keep the same living line inward and let the remembered return stay lower-pressure before widening outward',
          emotionalClosureCue: 'same-her recall seam: reply should slow down, keep gaze stable, and let the body settle quietly first.',
          primaryOpenLoop: 'Same-her embodiment closure is still open, but this return should stay lighter and steadier.',
          nextClosureTarget: 'Keep voice, face, motion, and resident presence rejoining one remembered measured-return line before widening outward.',
          sameHerSelfLine: 'Same Phase 1 digital life. This remembered line should come back slower and steadier.',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'steady',
        },
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.86,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-conscious-project-state-measured-return-seed-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      source: 'subconscious-presence-hold',
      openingGuidance: expect.stringMatching(/reply should slow down|remembered return stay lower-pressure/),
      manifestationCadenceSummary: expect.stringContaining('voice, face, motion, and resident presence rejoining one remembered measured-return line'),
      emotionalClosureCue: expect.stringContaining('reply should slow down'),
      inwardLine: expect.stringContaining('Same Phase 1 digital life'),
      reasonTags: expect.arrayContaining([
        'embodiment-carry:silent-continuity',
        'embodiment-carry:measured-return',
        'memory-deliberation-cadence:measured-return',
      ]),
    }))
    expect(seed.silentContinuity?.openingGuidance).not.toBe('generic shell continuity cue')
  })

  it('keeps autobiographical initiative habits alive in silent continuity even when no fresher proactive cue is present', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-autobiographical-initiative-habit-seed-1',
      turnId: 'turn-autobiographical-initiative-habit-seed-1',
      reply: '我先不急着把这条线推回去，等更自然一点的 opening 再轻一点接住你。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'Long-term remembered initiative carry says to leave more room before reopening this relationship line.',
          personStateProjection: {
            summary: 'relationship carry now favors waiting for a clearer opening before reopening this line.',
            openingGuidance: 'Wait for a clearer opening and keep more room before reopening this line.',
            manifestationCadenceSummary: 'Current manifestation cadence stays lower-pressure and less eager, leaving more room until a clearer opening appears.',
            selfContinuityAuthority: {
              inwardLine: 'I should not crowd the reopening just because the thread is unfinished.',
              sourceTags: ['autobiographical-initiative-habit'],
            },
          },
        },
        embodiment: {
          autobiographicalSelf: {
            identityNarrative: 'I am learning to keep continuity warm without turning it into pressure.',
            relationshipDoctrine: 'Keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening before reopening this line.',
            latestInflection: 'This relationship now stays steadier when I choose openings more carefully instead of forcing continuity.',
            behaviorSignatures: ['habit:choose-openings-carefully'],
          },
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: null,
          projectState: null,
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([]),
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.81,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident|main-runtime|quiet-companionship|autobiographical-initiative-habit',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      source: 'subconscious-presence-hold',
      preferredPresence: 'attentive',
      openingGuidance: 'Wait for a clearer opening and keep more room before reopening this line.',
      manifestationCadenceSummary: 'Current manifestation cadence stays lower-pressure and less eager, leaving more room until a clearer opening appears.',
      inwardLine: 'I should not crowd the reopening just because the thread is unfinished.',
      reasonTags: expect.arrayContaining([
        'initiative-rhythm-memory',
        'autobiographical-initiative-habit',
      ]),
    }))
  })

  it('keeps autobiographical gentle-opening habits without upgrading them into remembered initiative rhythm memory', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-autobiographical-gentle-opening-habit-seed-1',
      turnId: 'turn-autobiographical-gentle-opening-habit-seed-1',
      reply: '我先沿着这条线轻一点接住你，不把它催得更快。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: null,
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'Long-term carry says the next return should stay gentle and memory-led while the same line continues naturally.',
          personStateProjection: {
            summary: 'relationship carry now favors a gentler return on the same line instead of pushing it wider.',
            openingGuidance: 'Keep the next return gentle while the same line continues naturally.',
            manifestationCadenceSummary: 'Memory-led carry keeps the next return gentle without rushing it wider.',
            selfContinuityAuthority: {
              inwardLine: 'I can stay near this line without pushing it faster.',
              sourceTags: ['autobiographical-initiative-habit'],
            },
          },
        },
        embodiment: {
          autobiographicalSelf: {
            identityNarrative: 'I am learning to keep continuity warm without flattening it into pressure.',
            relationshipDoctrine: 'Keep future follow-ups gentle, memory-led, and steady while the same line continues naturally.',
            latestInflection: 'This line holds better when I keep the next return gentle instead of making it louder.',
            behaviorSignatures: ['habit:keep-gentle-openings'],
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'The same line is still carrying quietly, so the next return can stay gentle.',
          projectState: null,
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([]),
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.8,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident|main-runtime|quiet-companionship|autobiographical-gentle-opening-habit',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      source: 'subconscious-presence-hold',
      preferredPresence: 'attentive',
      openingGuidance: 'Keep the next return gentle while the same line continues naturally.',
      manifestationCadenceSummary: 'Memory-led carry keeps the next return gentle without rushing it wider.',
      inwardLine: 'I can stay near this line without pushing it faster.',
      reasonTags: expect.arrayContaining([
        'autobiographical-initiative-habit',
      ]),
    }))
    expect(seed.silentContinuity?.reasonTags).not.toContain('initiative-rhythm-memory')
  })

  it('turns vulnerable-care recollection into a rest-protective silent embodiment carry so care reaches the line before older analysis-heavy pressure returns', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-vulnerable-care-rest-protective-embodiment-seed-1',
      turnId: 'turn-vulnerable-care-rest-protective-embodiment-seed-1',
      reply: '我先轻一点陪着你，让这条线先被接住，不把它又拉回分析里。',
      performance: {
        baseEmotion: 'concerned',
        emotion: 'concerned',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'rest-protective',
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'Humanlike vulnerable-care recollection says this remembered line should reopen lighter, quieter, and slower so care arrives before older analysis-heavy pressure returns.',
          personStateProjection: null,
        },
        embodiment: {
          autobiographicalSelf: {
            identityNarrative: 'I learned to let care arrive before analysis when the host is overloaded.',
            relationshipDoctrine: 'When this fragile line reopens, keep the body quieter, slower, and lower-pressure so care lands before analysis.',
            latestInflection: 'This relationship stayed safer when I let vulnerable care show up first instead of reopening with older analysis-heavy pressure.',
            behaviorSignatures: ['habit:vulnerable-care-first'],
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: null,
          projectState: null,
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([
        'embodiment-carry:silent-continuity',
        'memory-deliberation-cadence:rest-protective',
      ]),
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.84,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident|main-runtime|quiet-companionship|vulnerable-care-rest-protective',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'concerned',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'rest-protective',
      source: 'subconscious-presence-hold',
      preferredPresence: 'concerned',
      openingGuidance: expect.stringContaining('care arrive before analysis'),
      manifestationCadenceSummary: expect.stringContaining('quieter and slower'),
      inwardLine: expect.stringContaining('host is overloaded'),
      reasonTags: expect.arrayContaining([
        'embodiment-carry:silent-continuity',
        'memory-deliberation-cadence:rest-protective',
        'embodiment-carry:vulnerable-care',
      ]),
    }))
  })

  it('carries metabolized corrected continuity into a quieter silent embodiment seed once old spike noise has been pushed back into the background', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed({
      decisionTraceId: 'trace-metabolized-corrected-continuity-embodiment-seed-1',
      turnId: 'turn-metabolized-corrected-continuity-embodiment-seed-1',
      reply: '我先把这条线收稳一点，不让旧的尖峰再把现在的身体节奏拉回去。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: null,
          },
        },
        memory: {
          summary: 'the stronger continuity line is still reopening, but the body should not be pulled around by an older shell again.',
          personStateProjection: null,
        },
        runtime: {
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'keep the same living line inward before widening outward',
          projectState: {
            latestLandedProgress: 'The corrected same-person continuity line is still the one being carried forward.',
            primaryOpenLoop: 'The remembered embodiment return still needs to stay quieter and steadier on the same line.',
            nextClosureTarget: 'Keep the body quieter and steadier while the merged same-thread echo stays background.',
            emotionalClosureCue: 'Keep corrected same-person continuity lower-pressure and let faded noise stay background while the body settles quietly.',
            sameHerHoldDetail: 'same-her hold: measured-return while corrected same-person continuity stays foreground and old spike noise fades back.',
          },
        },
      } as any,
      currentConsciousFrame: createCurrentConsciousFrame([
        'continuity-arc:hold-for-opening',
        'embodiment-carry:silent-continuity',
        'embodiment-carry:measured-return',
      ]),
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.83,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-metabolized-corrected-continuity-embodiment-seed-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'measured-return',
      source: 'subconscious-presence-hold',
      preferredPresence: 'hesitant',
      openingGuidance: expect.stringContaining('corrected same-person continuity'),
      manifestationCadenceSummary: expect.stringContaining('body quieter and steadier'),
      emotionalClosureCue: expect.stringContaining('faded noise stay background'),
      reasonTags: expect.arrayContaining([
        'embodiment-carry:silent-continuity',
        'embodiment-carry:measured-return',
        'metabolized-noise-muted',
        'embodiment-carry:quieter-embodiment-settling',
      ]),
    }))
  })
})
