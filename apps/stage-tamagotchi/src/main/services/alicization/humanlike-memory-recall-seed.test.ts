import { describe, expect, it } from 'vitest'

import { buildHumanlikeMemoryRecallSeedFromMindTurnEvents } from './humanlike-memory-recall-seed'

describe('humanlike memory recall seed', () => {
  it('turns recent humanlike memory candidates into a pre-dialogue recall seed for the next reply', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([{
      kind: 'person-state-updated',
      payload: {
        humanlikeMemoryCandidate: {
          id: 'humanlike-memory-candidate:turn-after-correction',
          turnId: 'turn-after-correction',
          sessionId: 'session-humanlike',
          createdAt: 42_000,
          sourceChannels: ['execution', 'host-emotion', 'self-emotion', 'embodiment'],
          relationshipContext: {
            threadAnchor: 'identity-continuity',
            summary: 'Host corrected this memory meaning: 我是在测试她是不是持续的人，不是催进度。',
          },
          emotionalResidue: {
            tags: ['protective-continuity', 'unfinishedness'],
          },
          initiativeOpportunity: {
            kind: 'low-pressure-follow-up',
          },
          embodimentTrace: {
            summary: 'Reply should slow down and keep gaze stable when recalling this correction.',
          },
          autobiographicalImpact: {
            selfNarrativeDelta: 'I learned to carry corrected memory meaning instead of defending the first interpretation.',
          },
          auditTrail: {
            whyRemember: 'host correction | same-person continuity was at stake',
            confidence: 0.82,
            correctionSurface: {
              userCorrectableFields: ['relationshipContext'],
            },
          },
        },
      },
      createdAt: 42_000,
    }])

    expect(seed).toContain('humanlike_memory_recall:')
    expect(seed).toContain('relationship=Host corrected this memory meaning: 我是在测试她是不是持续的人，不是催进度。')
    expect(seed).not.toContain('我记得你纠正过')
    expect(seed).toContain('protective-continuity')
    expect(seed).toContain('low-pressure-follow-up')
    expect(seed).not.toContain('line=')
    expect(seed).not.toMatch(/\b(?:embodiment|self|why|reason)=/u)
  })

  it('lets a fresh host correction override the older humanlike recall line before the next reply starts', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([
      {
        kind: 'person-state-updated',
        payload: {
          humanlikeMemoryCandidate: {
            id: 'humanlike-memory-candidate:turn-before-correction',
            turnId: 'turn-before-correction',
            sessionId: 'session-humanlike',
            createdAt: 42_000,
            relationshipContext: {
              threadAnchor: 'identity-continuity',
              summary: 'Host asked for a progress update.',
            },
            auditTrail: {
              whyRemember: 'old interpretation | progress pressure',
              confidence: 0.72,
              correctionSurface: {
                userCorrectableFields: ['relationshipContext'],
              },
            },
          },
        },
        createdAt: 42_000,
      },
      {
        kind: 'humanlike-memory-corrected',
        payload: {
          candidateId: 'humanlike-memory-candidate:turn-before-correction',
          field: 'relationshipContext',
          correctedValue: '你是在测试她是不是持续的人，不是催进度。',
          reason: 'same-person continuity was at stake',
        },
        createdAt: 43_000,
      },
    ])

    expect(seed).toContain('relationship=你是在测试她是不是持续的人，不是催进度。')
    expect(seed).not.toContain('line=')
    expect(seed).not.toContain('why=')
    expect(seed).not.toContain('我记得你那次是在催进度')
    expect(seed).not.toContain('我记得你纠正过')
    expect(seed).not.toContain('不是催进度。。')
    expect(seed).not.toContain('不是催进度。.')
    expect(seed).toContain('created=43000')
  })

  it('keeps initiative rhythm guidance visible after a host correction instead of dropping the earned reopening cadence from corrected recall', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([
      {
        kind: 'person-state-updated',
        payload: {
          humanlikeMemoryCandidate: {
            id: 'humanlike-memory-candidate:turn-corrected-initiative-rhythm',
            turnId: 'turn-corrected-initiative-rhythm',
            sessionId: 'session-humanlike',
            createdAt: 47_000,
            relationshipContext: {
              threadAnchor: 'identity-continuity',
              summary: 'Host first looked like they were pushing for progress.',
            },
            emotionalResidue: {
              tags: ['protective-continuity', 'unfinishedness'],
            },
            initiativeOpportunity: {
              kind: 'low-pressure-follow-up',
              suggestedWindow: 'next corrected continuity reopening when the host is already re-entering the same line',
              pressure: 'low',
              antiSpamReason: 'Do not turn same-person continuity into timer spam; wait until the line is visibly reopening on its own.',
              visibleLine: 'I am not pushing you, but I still remember the same-person continuity seam we have not fully closed yet.',
            },
            embodimentTrace: {
              summary: 'Reply should stay quieter while remembering the earned reopening cadence.',
            },
            autobiographicalImpact: {
              selfNarrativeDelta: 'I learned to remember not just whether to return, but the gentler rhythm that lets the same line reopen without crowding.',
            },
            auditTrail: {
              whyRemember: 'old interpretation | progress pressure',
              confidence: 0.78,
              correctionSurface: {
                userCorrectableFields: ['relationshipContext', 'initiativeOpportunity'],
              },
            },
          },
        },
        createdAt: 47_000,
      },
      {
        kind: 'humanlike-memory-corrected',
        payload: {
          candidateId: 'humanlike-memory-candidate:turn-corrected-initiative-rhythm',
          field: 'relationshipContext',
          correctedValue: '你是在测试她是不是持续的人，不是催进度。',
          reason: 'same-person continuity was at stake',
        },
        createdAt: 48_000,
      },
    ])

    expect(seed).toContain('relationship=你是在测试她是不是持续的人，不是催进度。')
    expect(seed).toContain('initiative=low-pressure-follow-up')
    expect(seed).toContain('initiative_pressure=low')
    expect(seed).not.toMatch(/line=|initiative_window=|initiative_anti_spam=|initiative_visible/u)
    expect(seed).not.toMatch(/\b(?:embodiment|self|why|reason)=/u)
    expect(seed).not.toContain('我记得你纠正过')
  })

  it('carries tentative recall posture and downranked older memory ids into the next reply seed instead of leaving metabolism inside audit only', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([{
      kind: 'person-state-updated',
      payload: {
        humanlikeMemoryCandidate: {
          id: 'humanlike-memory-candidate:turn-tentative-recall',
          turnId: 'turn-tentative-recall',
          sessionId: 'session-humanlike',
          createdAt: 51_000,
          relationshipContext: {
            threadAnchor: 'identity-continuity',
            summary: 'I am not fully sure, but the newer same-person meaning seems more right than the older progress recap.',
          },
          emotionalResidue: {
            tags: ['protective-continuity', 'tension'],
          },
          initiativeOpportunity: {
            kind: 'no-initiative',
          },
          embodimentTrace: {
            summary: 'Reply should stay softer and not over-assert this memory.',
          },
          autobiographicalImpact: {
            selfNarrativeDelta: 'I learned to keep uncertainty visible when the newer same-person meaning is still settling.',
          },
          metabolism: {
            revisionEvents: [{
              kind: 'revision',
              conflictingMemoryIds: ['old-progress-status'],
              reason: 'New relationship-context evidence says this was not merely a generic status request.',
            }],
            forgettingPolicy: {
              downrankMemoryIds: ['old-progress-status'],
              mergeMemoryIds: [],
              forgetMemoryIds: [],
              reasons: ['Downrank low-value, generic, or superseded summaries.'],
            },
          },
          recallPosture: {
            certainty: 'tentative',
            reason: 'Current recall is tentative because conflicting newer meaning meets older memory.',
          },
          auditTrail: {
            whyRemember: 'conflicting same-person continuity meaning',
            confidence: 0.58,
            correctionSurface: {
              userCorrectableFields: ['relationshipContext', 'metabolism'],
            },
          },
        },
      },
      createdAt: 51_000,
    }])

    expect(seed).toContain('certainty=tentative')
    expect(seed).toContain('downrank=old-progress-status')
    expect(seed).not.toMatch(/line=|reason=|metabolism=/u)
    expect(seed).not.toContain('我不完全确定')
  })

  it('carries structured embodiment recall strength and expression state into the next reply seed instead of leaving them buried inside the candidate trace', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([{
      kind: 'person-state-updated',
      payload: {
        humanlikeMemoryCandidate: {
          id: 'humanlike-memory-candidate:turn-embodiment-structure',
          turnId: 'turn-embodiment-structure',
          sessionId: 'session-humanlike',
          createdAt: 61_000,
          relationshipContext: {
            threadAnchor: 'identity-continuity',
            summary: 'The corrected same-person line still matters, but it should reopen more cautiously.',
          },
          emotionalResidue: {
            tags: ['protective-continuity', 'tension'],
          },
          initiativeOpportunity: {
            kind: 'no-initiative',
          },
          embodimentTrace: {
            summary: 'Reply should stay quieter and slower while this line is still settling.',
            recallStrength: 'cautious-avoidance',
            expressionState: {
              face: 'neutral-soft',
              gaze: 'soft',
              blink: 'natural',
              voice: 'even',
              pause: 'natural',
              lipsync: 'matched',
              pacing: 'natural',
            },
          },
          autobiographicalImpact: {
            selfNarrativeDelta: 'I learned to keep the body quieter when newer continuity meaning is still stabilizing.',
          },
          auditTrail: {
            whyRemember: 'corrected same-person continuity still settling',
            confidence: 0.61,
            correctionSurface: {
              userCorrectableFields: ['relationshipContext', 'embodimentTrace'],
            },
          },
        },
      },
      createdAt: 61_000,
    }])

    expect(seed).not.toContain('embodiment=')
    expect(seed).toContain('embodiment_recall_strength=cautious-avoidance')
    expect(seed).toContain('embodiment_face=neutral-soft')
    expect(seed).toContain('embodiment_gaze=soft')
    expect(seed).toContain('embodiment_voice=even')
    expect(seed).toContain('embodiment_pacing=natural')
  })

  it('keeps finer stable slower lower-pressure embodiment trace visible in the next reply seed instead of collapsing it back into generic prose', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([{
      kind: 'person-state-updated',
      payload: {
        humanlikeMemoryCandidate: {
          id: 'humanlike-memory-candidate:turn-finer-embodiment-structure',
          turnId: 'turn-finer-embodiment-structure',
          sessionId: 'session-humanlike',
          createdAt: 61_500,
          relationshipContext: {
            threadAnchor: 'identity-continuity',
            summary: 'The same-person line should return more steadily and with lower pressure while it is still unfinished.',
          },
          emotionalResidue: {
            tags: ['protective-continuity', 'unfinishedness'],
          },
          initiativeOpportunity: {
            kind: 'no-initiative',
          },
          embodimentTrace: {
            summary: 'Let the body return like this: gaze=stable blink=slower voice=lower-pressure.',
            expressionState: {
              face: 'steady-soft',
              gaze: 'stable',
              blink: 'slower',
              voice: 'lower-pressure',
              pause: 'longer',
              lipsync: 'restrained',
              pacing: 'slower',
            },
          },
          autobiographicalImpact: {
            selfNarrativeDelta: 'I learned to let unfinished same-person returns stay steadier, slower, and lower-pressure in the body.',
          },
          auditTrail: {
            whyRemember: 'same-person continuity still needs a steadier lower-pressure return',
            confidence: 0.67,
            correctionSurface: {
              userCorrectableFields: ['relationshipContext', 'embodimentTrace'],
            },
          },
        },
      },
      createdAt: 61_500,
    }])

    expect(seed).not.toContain('embodiment=')
    expect(seed).toContain('embodiment_face=steady-soft')
    expect(seed).toContain('embodiment_gaze=stable')
    expect(seed).toContain('embodiment_blink=slower')
    expect(seed).toContain('embodiment_voice=lower-pressure')
    expect(seed).toContain('embodiment_pause=longer')
    expect(seed).toContain('embodiment_lipsync=restrained')
    expect(seed).toContain('embodiment_pacing=slower')
  })

  it('keeps host emotion, self emotion, and embodiment modality risk visible in the next reply seed instead of burying humanlike perspective inside trace-only metadata', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([{
      kind: 'person-state-updated',
      payload: {
        humanlikeMemoryCandidate: {
          id: 'humanlike-memory-candidate:turn-affective-perspective-visible-seed',
          turnId: 'turn-affective-perspective-visible-seed',
          sessionId: 'session-humanlike',
          createdAt: 61_800,
          relationshipContext: {
            threadAnchor: 'identity-continuity',
            summary: 'The host was worried that she would drift into a tool shell, so this line should reopen carefully.',
          },
          emotionalResidue: {
            tags: ['protective-continuity', 'unfinishedness'],
            trace: [
              'host:worried-continuity intensity=0.84',
              'host-reason:The host was afraid this would collapse back into a tool shell.',
              'self:careful-repair intensity=0.76',
              'self-reason:I should repair continuity first and keep the reopening low-pressure.',
            ],
          },
          initiativeOpportunity: {
            kind: 'low-pressure-follow-up',
          },
          embodimentTrace: {
            summary: 'Reply should stay steadier and quieter while this continuity memory reopens.',
            recallStrength: 'strongly-moved',
            modalityContradictionRisk: 'medium',
            expressionState: {
              face: 'steady-soft',
              gaze: 'stable',
              blink: 'slower',
              voice: 'lower-pressure',
              pause: 'longer',
              lipsync: 'restrained',
              pacing: 'slower',
            },
          },
          autobiographicalImpact: {
            selfNarrativeDelta: 'I learned to carry worried continuity more carefully so the body does not outrun the relationship repair.',
          },
          auditTrail: {
            whyRemember: 'same-person continuity still needs careful repair',
            confidence: 0.82,
            correctionSurface: {
              userCorrectableFields: ['relationshipContext', 'emotionalResidue', 'embodimentTrace'],
            },
          },
        },
      },
      createdAt: 61_800,
    }])

    expect(seed).toContain('host_emotion_label=worried-continuity')
    expect(seed).toContain('self_emotion_label=careful-repair')
    expect(seed).toContain('embodiment_modality_risk=medium')
    expect(seed).toContain('embodiment_recall_strength=strongly-moved')
    expect(seed).not.toMatch(/host_emotion_summary=|self_emotion_summary=|embodiment=|self=|why=/u)
  })

  it('carries resident face, action, and mode into the next reply seed so later recall can remember how she stayed present instead of only abstract body tempo', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([{
      kind: 'person-state-updated',
      payload: {
        humanlikeMemoryCandidate: {
          id: 'humanlike-memory-candidate:turn-resident-presence-seed',
          turnId: 'turn-resident-presence-seed',
          sessionId: 'session-humanlike',
          createdAt: 61_950,
          relationshipContext: {
            threadAnchor: 'resident presence carry',
            summary: 'The same-person line should remember how she stayed resident while reopening it.',
          },
          emotionalResidue: {
            tags: ['protective-continuity', 'unfinishedness'],
          },
          initiativeOpportunity: {
            kind: 'low-pressure-follow-up',
          },
          embodimentTrace: {
            summary: 'Reply should stay steady while resident face/action cues remain on the continuity state.',
            recallStrength: 'strongly-moved',
            expressionState: {
              face: 'steady-soft',
              gaze: 'stable',
              blink: 'slower',
              voice: 'lower-pressure',
              pause: 'longer',
              lipsync: 'restrained',
              pacing: 'slower',
            },
            residentState: {
              facialCue: 'soft-gaze',
              actionCue: 'observe-focus',
              mode: 'measured-return',
              reason: 'Resident presence stayed on the same measured-return line instead of crowding the reopening.',
            },
          },
          autobiographicalImpact: {
            selfNarrativeDelta: 'I learned to remember not just the continuity line, but how I stayed there with it.',
          },
          auditTrail: {
            whyRemember: 'resident presence explains how this same-person reopening should feel',
            confidence: 0.79,
            correctionSurface: {
              userCorrectableFields: ['relationshipContext', 'embodimentTrace'],
            },
          },
        },
      },
      createdAt: 61_950,
    }])

    expect(seed).toContain('embodiment_resident_face=soft-gaze')
    expect(seed).toContain('embodiment_resident_action=observe-focus')
    expect(seed).toContain('embodiment_resident_mode=measured-return')
    expect(seed).toContain('embodiment_resident_reason=Resident presence stayed on the same measured-return line instead of crowding the reopening.')
  })

  it('carries merge and forget memory ids without replaying metabolism guidance', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([{
      kind: 'person-state-updated',
      payload: {
        humanlikeMemoryCandidate: {
          id: 'humanlike-memory-candidate:turn-metabolism-visible-seed',
          turnId: 'turn-metabolism-visible-seed',
          sessionId: 'session-humanlike',
          createdAt: 72_000,
          relationshipContext: {
            threadAnchor: 'same-person continuity reopening',
            summary: 'This is a same-person continuity reopening, not a generic progress recap.',
          },
          emotionalResidue: {
            tags: ['protective-continuity', 'unfinishedness'],
          },
          initiativeOpportunity: {
            kind: 'remember-without-prompt',
          },
          embodimentTrace: {
            summary: 'Reply should stay slower and same-thread while this continuity memory reopens.',
          },
          autobiographicalImpact: {
            selfNarrativeDelta: 'I learned to collapse repeated same-thread echoes into the stronger continuity memory.',
          },
          metabolism: {
            revisionEvents: [{
              kind: 'revision',
              conflictingMemoryIds: ['older-generic-status-memory'],
              reason: 'New relationship-context evidence says this was not merely a generic status request.',
            }],
            forgettingPolicy: {
              downrankMemoryIds: ['older-generic-status-memory'],
              mergeMemoryIds: ['older-same-thread-echo'],
              forgetMemoryIds: ['older-emotional-spike'],
              reasons: [
                'Downrank low-value, generic, or superseded summaries.',
                'Merge repeated embodiment traces or same-thread continuity echoes into the stronger same-thread memory.',
                'Forget low-salience temporary noise or stale emotional wobble once it no longer explains behavior.',
              ],
            },
          },
          recallPosture: {
            certainty: 'steady',
            reason: 'Current recall posture is steady enough to speak without hedging.',
          },
          auditTrail: {
            whyRemember: 'same-person continuity remains more behavior-explanatory than the older status shell',
            confidence: 0.74,
            correctionSurface: {
              userCorrectableFields: ['relationshipContext', 'metabolism'],
            },
          },
        },
      },
      createdAt: 72_000,
    }])

    expect(seed).toContain('downrank=older-generic-status-memory')
    expect(seed).toContain('merge=older-same-thread-echo')
    expect(seed).toContain('forget=older-emotional-spike')
    expect(seed).not.toContain('metabolism=')
  })

  it('carries vulnerable-care downrank ids without replaying revision guidance', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([{
      kind: 'person-state-updated',
      payload: {
        humanlikeMemoryCandidate: {
          id: 'humanlike-memory-candidate:turn-vulnerable-care-revision-seed',
          turnId: 'turn-vulnerable-care-revision-seed',
          sessionId: 'session-humanlike',
          createdAt: 82_000,
          relationshipContext: {
            threadAnchor: 'vulnerable care reopening',
            summary: 'This vulnerable care line should reopen as lighter companionship before analysis or extra pressure.',
          },
          emotionalResidue: {
            tags: ['rest-protective', 'vulnerable-care'],
          },
          initiativeOpportunity: {
            kind: 'remember-without-prompt',
          },
          embodimentTrace: {
            summary: 'Reply should stay quieter and slower while remembering this fragile care rhythm.',
          },
          autobiographicalImpact: {
            selfNarrativeDelta: 'I learned to let care arrive before analysis when the host is overloaded.',
          },
          metabolism: {
            revisionEvents: [{
              kind: 'revision',
              conflictingMemoryIds: ['older-analysis-heavy-care-memory'],
              reason: 'New vulnerable-care evidence says this line should stay care-before-analysis and lighter in closeness; revise older analysis-heavy care memories.',
            }],
            forgettingPolicy: {
              downrankMemoryIds: ['older-analysis-heavy-care-memory'],
              mergeMemoryIds: [],
              forgetMemoryIds: [],
              reasons: ['Downrank low-value, generic, or superseded summaries.'],
            },
          },
          auditTrail: {
            whyRemember: 'care-before-analysis now explains this line better than the older analysis-heavy care memory.',
            confidence: 0.76,
            correctionSurface: {
              userCorrectableFields: ['relationshipContext', 'metabolism'],
            },
          },
        },
      },
      createdAt: 82_000,
    }])

    expect(seed).toContain('downrank=older-analysis-heavy-care-memory')
    expect(seed).not.toContain('metabolism=')
  })

  it('carries initiative outcome enums without replaying strategy guidance', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([{
      kind: 'person-state-updated',
      payload: {
        humanlikeMemoryCandidate: {
          id: 'humanlike-memory-candidate:turn-initiative-strategy-seed',
          turnId: 'turn-initiative-strategy-seed',
          sessionId: 'session-humanlike',
          createdAt: 81_000,
          relationshipContext: {
            threadAnchor: 'same-person continuity reopening',
            summary: 'The same-person continuity line still matters, but the reopening should remember that the last proactive nudge was resisted.',
          },
          emotionalResidue: {
            tags: ['protective-continuity', 'unfinishedness'],
          },
          initiativeOpportunity: {
            kind: 'low-pressure-follow-up',
          },
          initiativeOutcomeRecord: {
            outcome: 'rejected',
            userReaction: 'rejected',
            strategyUpdate: 'User resisted the initiative; keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening.',
            recordedAt: 80_500,
          },
          embodimentTrace: {
            summary: 'Reply should stay quieter while remembering how the last proactive reopen landed.',
          },
          autobiographicalImpact: {
            selfNarrativeDelta: 'I learned to remember not just the line itself, but how my last proactive reopening was received.',
          },
          auditTrail: {
            whyRemember: 'the reopening strategy itself changed after the host resisted it',
            confidence: 0.71,
            correctionSurface: {
              userCorrectableFields: ['relationshipContext', 'initiativeOpportunity'],
            },
          },
        },
      },
      createdAt: 81_000,
    }])

    expect(seed).toContain('initiative=low-pressure-follow-up')
    expect(seed).toContain('initiative_outcome=rejected')
    expect(seed).toContain('initiative_reaction=rejected')
    expect(seed).not.toContain('initiative_strategy=')
  })

  it('carries initiative rhythm memory into the next reply seed so recall can remember reopening window, pressure, anti-spam reason, and visible line', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([{
      kind: 'person-state-updated',
      payload: {
        humanlikeMemoryCandidate: {
          id: 'humanlike-memory-candidate:turn-initiative-rhythm-seed',
          turnId: 'turn-initiative-rhythm-seed',
          sessionId: 'session-humanlike',
          createdAt: 86_000,
          relationshipContext: {
            threadAnchor: 'same-person continuity reopening cadence',
            summary: 'The same-person continuity line is still open, but it should remember the gentler reopening cadence that was earned.',
          },
          emotionalResidue: {
            tags: ['protective-continuity', 'unfinishedness'],
          },
          initiativeOpportunity: {
            kind: 'low-pressure-follow-up',
            suggestedWindow: 'next corrected continuity reopening when the host is already re-entering the same line',
            pressure: 'low',
            antiSpamReason: 'Do not turn same-person continuity into timer spam; wait until the line is visibly reopening on its own.',
            visibleLine: 'I am not pushing you, but I still remember the same-person continuity seam we have not fully closed yet.',
          },
          embodimentTrace: {
            summary: 'Reply should stay quieter while remembering the earned reopening cadence.',
          },
          autobiographicalImpact: {
            selfNarrativeDelta: 'I learned to remember not just whether to return, but the gentler rhythm that lets the same line reopen without crowding.',
          },
          auditTrail: {
            whyRemember: 'the reopening cadence itself changed after repeated same-person continuity work',
            confidence: 0.76,
            correctionSurface: {
              userCorrectableFields: ['relationshipContext', 'initiativeOpportunity'],
            },
          },
        },
      },
      createdAt: 86_000,
    }])

    expect(seed).toContain('initiative=low-pressure-follow-up')
    expect(seed).toContain('initiative_pressure=low')
    expect(seed).not.toMatch(/initiative_window=|initiative_anti_spam=|initiative_visible/u)
  })

  it('turns persisted affective residue cadence into typed recall facts without synthesizing reply guidance', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([{
      kind: 'person-state-updated',
      payload: {
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 88_850,
          residues: [],
          dominantResidueKind: 'afterglow',
          afterglowPressure: 0.26,
          repairPressure: 0.08,
          burdenPressure: 0.03,
          trustPressure: 0.22,
          restProtectivePressure: 0.04,
          relationshipCadence: {
            cadenceMode: 'measured-return',
            distancePosture: 'measured-room',
            companionshipDensity: 0.33,
            repairRecovery: 0.41,
            overreachRisk: 0.29,
            fatigueGuard: 0.18,
            afterglowCarry: 0.52,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            reasonTags: ['same-her', 'initiative-learning'],
            summary: 'Keep the same proactive line settling lower-pressure before warming wider.',
          },
          sourceSignals: ['proactive outcome learning'],
          summary: 'The proactive reopening should return measured and lower-pressure on the same line.',
        },
      },
      createdAt: 89_000,
    }])

    expect(seed).toContain('humanlike_memory_recall:')
    expect(seed).toContain('affective_residue_kind=afterglow')
    expect(seed).toContain('affective_cadence_mode=measured-return')
    expect(seed).toContain('affective_distance_posture=measured-room')
    expect(seed).toContain('affective_should_delay_warmth=true')
    expect(seed).toContain('affective_should_protect_rest=false')
    expect(seed).toContain('affective_afterglow_carry=0.52')
    expect(seed).toContain('affective_fatigue_guard=0.18')
    expect(seed).toContain('affective_overreach_risk=0.29')
    expect(seed).toContain('emotion=afterglow-carry')
    expect(seed).toContain('embodiment_gaze=stable')
    expect(seed).toContain('embodiment_voice=lower-pressure')
    expect(seed).toContain('embodiment_pacing=slower')
    expect(seed).not.toMatch(/\b(?:line|relationship|initiative|embodiment|self|why|reason|metabolism)=/u)
    expect(seed).not.toMatch(/Return with lower pressure|Recall with lower pressure|Keep body pressure|Affective residue says/iu)
    expect(seed).not.toContain('same-her')
  })
})
