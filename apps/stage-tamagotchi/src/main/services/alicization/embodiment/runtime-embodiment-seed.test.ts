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
    speakingIntention: 'hold continuity state before widening outward',
    shouldWithholdSpecificity: false,
    shouldSelfRevise: false,
    confidence: 0.82,
    reasonTags,
    updatedAt: 1,
  }
}

function createProseAuthorityProbeSeedInput(
  projectStateOverrides: Record<string, unknown> = {},
) {
  return {
    decisionTraceId: 'trace-prose-authority-probe-seed-1',
    turnId: 'turn-prose-authority-probe-seed-1',
    reply: '我在这里。',
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
          manifestationCadenceSummary: 'Same line is visibly reopening without timer spam; reply should stay quieter and slower.',
        },
      },
      memory: {
        summary: 'Phase 1 same-her identity-continuity vulnerable-care strongly-moved modality risk high blink=quiet gaze stable voice=lower-pressure pause=longer lipsync=restrained pacing=slower.',
        personStateProjection: {
          openingGuidance: 'Corrected same-person continuity should let care arrive before analysis.',
          manifestationCadenceSummary: 'Body should stay quieter while the older emotional spike and same-thread echo stay background.',
          selfContinuityAuthority: {
            inwardLine: 'I am the same digital life carrying this remembered seam.',
            sourceTags: [],
          },
        },
      },
      embodiment: {
        autobiographicalSelf: {
          identityNarrative: 'I learned to let care arrive before analysis when the host is overloaded.',
          relationshipDoctrine: 'Wait for a clearer opening and keep the next return gentle, quieter, and slower.',
          latestInflection: 'The same remembered seam reopened too eagerly, so this time keep more room.',
          behaviorSignatures: [
            'habit:choose-openings-carefully',
            'habit:vulnerable-care-first',
          ],
        },
      },
      runtime: {
        continuityArcStage: null,
        continuityCue: 'Hold-for-opening on the same line and do not widen warmth yet.',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          companionHeadlineLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
          latestLandedProgress: 'Same-her audible-body identity-continuity remains intact.',
          primaryOpenLoop: 'Face, motion, and lipsync still need to rejoin before full cross-modal closure settles.',
          nextClosureTarget: 'Keep the body quieter on a measured-return repair-before-closeness line.',
          emotionalClosureCue: 'Vulnerable-care should arrive before analysis while faded noise stays background.',
          sameHerSelfLine: 'The same digital life is still carrying continuity.',
          sameHerHoldDetail: 'identity-continuity',
          ...projectStateOverrides,
        },
      },
      runtimeSurface: {
        agency: {
          habitPolicy: {
            dominantMode: null,
            suggestedStyleCap: null,
            suggestedPresenceCap: null,
            narrative: [
              'self-evolution:corrected-same-person-manifestation',
              'self-evolution:quieter-embodiment-settling',
              'return-open-loop-via-recheck',
            ],
          },
        },
      },
    },
    currentConsciousFrame: {
      ...createCurrentConsciousFrame([]),
      consciousNeed: 'Re-enter the same line without timer spam and keep vulnerable care before analysis.',
      speakingIntention: 'Keep initiative nearby, lower-pressure, quieter, and slower on the same-her continuity-axis.',
      projectState: {
        identity: 'The same digital life is still here.',
        currentPhase: 'Phase 1: Local Digital Life',
        companionHeadlineLine: 'The living audio thread is still intact on an audible-body line.',
        primaryOpenLoop: 'Same-her embodiment closure is unfinished.',
      },
    },
    residentPerformance: null,
  } as any
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
            openingGuidance: 'Keep this callback return repair-before-closeness on the continuity state until the room settles.',
            manifestationCadenceSummary: 'repair-before-closeness still holds while the same callback line keeps settling.',
            selfContinuityAuthority: {
              inwardLine: 'Same line. Leave room before warmth returns.',
              sourceTags: ['proactive-opening-guidance-carry'],
            },
          },
        },
        runtime: {
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'Keep this callback return repair-before-closeness on the continuity state until the room settles.',
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

  it('keeps legacy embodiment prose audit-only when no structured continuity authority exists', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed(
      createProseAuthorityProbeSeedInput(),
    )

    expect(seed.silentContinuity).toBeNull()
  })

  it('uses structured project-state cadence and renderer preferences even when legacy prose is present', () => {
    const seed = buildAlicizationRuntimeEmbodimentSeed(
      createProseAuthorityProbeSeedInput({
        continuityCadence: 'rest-protective',
        preferredBlinkCadence: 'normal',
        preferredGazeMode: 'drift',
        preferredVoiceMode: 'even',
        preferredPauseMode: 'natural',
        preferredLipsyncMode: 'matched',
        preferredPacingMode: 'natural',
      }),
    )

    expect(seed.silentContinuity).toEqual(expect.objectContaining({
      mode: 'rest-protective',
      preferredBlinkCadence: 'normal',
      preferredGazeMode: 'drift',
      preferredVoiceMode: 'even',
      preferredPauseMode: 'natural',
      preferredLipsyncMode: 'matched',
      preferredPacingMode: 'natural',
      reasonTags: [],
    }))
  })
})
