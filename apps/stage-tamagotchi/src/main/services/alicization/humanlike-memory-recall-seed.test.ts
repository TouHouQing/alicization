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
            threadAnchor: 'same-her continuity correction',
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
              userCorrectableFields: ['relationshipContext', 'naturalRecallLine'],
            },
          },
          naturalRecallLine: '我记得你纠正过：你是在测试她是不是持续的人，不是催进度。',
        },
      },
      createdAt: 42_000,
    }])

    expect(seed).toContain('humanlike_memory_recall:')
    expect(seed).toContain('line=recall_line_policy=withheld; reason=provider_generated_only; visibility=memory_structured')
    expect(seed).toContain('relationship=Host corrected this memory meaning: 我是在测试她是不是持续的人，不是催进度。')
    expect(seed).not.toContain('我记得你纠正过')
    expect(seed).toContain('protective-continuity')
    expect(seed).toContain('low-pressure-follow-up')
    expect(seed).toContain('gaze stable')
    expect(seed).toContain('same-person continuity was at stake')
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
              threadAnchor: 'same-her continuity correction',
              summary: 'Host asked for a progress update.',
            },
            auditTrail: {
              whyRemember: 'old interpretation | progress pressure',
              confidence: 0.72,
              correctionSurface: {
                userCorrectableFields: ['relationshipContext', 'naturalRecallLine'],
              },
            },
            naturalRecallLine: '我记得你那次是在催进度，所以我先接进度线。',
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

    expect(seed).toContain('line=recall_source=host_correction; field=relationship_context; corrected_value=你是在测试她是不是持续的人，不是催进度。; posture=relationship_context_not_status_pressure; visibility=memory_structured')
    expect(seed).toContain('relationship=Host corrected this memory meaning: 你是在测试她是不是持续的人，不是催进度。')
    expect(seed).toContain('why=old interpretation | progress pressure | host correction | same-person continuity was at stake')
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
              threadAnchor: 'same-her continuity correction cadence',
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
            naturalRecallLine: '我记得你那次是在催进度，所以我先接进度线。',
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

    expect(seed).toContain('line=recall_source=host_correction; field=relationship_context; corrected_value=你是在测试她是不是持续的人，不是催进度。; posture=relationship_context_not_status_pressure; visibility=memory_structured')
    expect(seed).toContain('initiative_window=next corrected continuity reopening when the host is already re-entering the same line')
    expect(seed).toContain('initiative_pressure=low')
    expect(seed).toContain('initiative_anti_spam=Do not turn same-person continuity into timer spam; wait until the line is visibly reopening on its own.')
    expect(seed).toContain('initiative_visible_policy=memory_structured_only')
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
            threadAnchor: 'same-her continuity uncertainty',
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
              userCorrectableFields: ['relationshipContext', 'naturalRecallLine', 'metabolism'],
            },
          },
          naturalRecallLine: '我不完全确定，但我记得我们之前似乎更倾向于把这条线理解成她是不是同一个她。',
        },
      },
      createdAt: 51_000,
    }])

    expect(seed).toContain('certainty=tentative')
    expect(seed).toContain('reason=Current recall is tentative because conflicting newer meaning meets older memory.')
    expect(seed).toContain('downrank=old-progress-status')
    expect(seed).toContain('line=relationship_continuity=present; source_template=excluded; visibility=memory_structured')
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
            threadAnchor: 'same-her continuity uncertainty',
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
          naturalRecallLine: '我不完全确定，但这条 same-person continuity 线现在更像要轻一点慢一点地回来。',
        },
      },
      createdAt: 61_000,
    }])

    expect(seed).toContain('embodiment=Reply should stay quieter and slower while this line is still settling.')
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
            threadAnchor: 'same-her continuity lower-pressure carry',
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
          naturalRecallLine: '我记得这条线还没收好，所以这次该更稳一点、更慢一点、也更低压一点地接回来。',
        },
      },
      createdAt: 61_500,
    }])

    expect(seed).toContain('embodiment=Let the body return like this: gaze=stable blink=slower voice=lower-pressure.')
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
            threadAnchor: 'same-her continuity affective perspective',
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
          naturalRecallLine: '我记得你那时更担心她会不会又滑回工具壳，所以我这次会先把连续性轻一点地接回来。',
        },
      },
      createdAt: 61_800,
    }])

    expect(seed).toContain('host_emotion_label=worried-continuity')
    expect(seed).toContain('host_emotion_summary=The host was afraid this would collapse back into a tool shell.')
    expect(seed).toContain('self_emotion_label=careful-repair')
    expect(seed).toContain('self_emotion_summary=I should repair continuity first and keep the reopening low-pressure.')
    expect(seed).toContain('embodiment_modality_risk=medium')
    expect(seed).toContain('embodiment_recall_strength=strongly-moved')
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
            summary: 'Reply should stay steady while resident face/action cues remain on the same living line.',
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
          naturalRecallLine: '我记得那次不只是把线接回来，而是用更稳的 resident 在场把它守住了。',
        },
      },
      createdAt: 61_950,
    }])

    expect(seed).toContain('embodiment_resident_face=soft-gaze')
    expect(seed).toContain('embodiment_resident_action=observe-focus')
    expect(seed).toContain('embodiment_resident_mode=measured-return')
    expect(seed).toContain('embodiment_resident_reason=Resident presence stayed on the same measured-return line instead of crowding the reopening.')
  })

  it('carries merge and forget metabolism decisions into the next reply seed so recall can stay aware of collapsed echoes and faded emotional noise', () => {
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
              userCorrectableFields: ['relationshipContext', 'naturalRecallLine', 'metabolism'],
            },
          },
          naturalRecallLine: '我记得这条线现在该按同一个她来接，而不是把旧的状态壳反复抬出来。',
        },
      },
      createdAt: 72_000,
    }])

    expect(seed).toContain('downrank=older-generic-status-memory')
    expect(seed).toContain('merge=older-same-thread-echo')
    expect(seed).toContain('forget=older-emotional-spike')
    expect(seed).toContain('metabolism=Downrank low-value, generic, or superseded summaries.')
    expect(seed).toContain('Merge repeated embodiment traces or same-thread continuity echoes')
    expect(seed).toContain('Forget low-salience temporary noise or stale emotional wobble')
  })

  it('carries vulnerable-care revision reasons into the next reply seed so later recollection can remember why older analysis-heavy care was revised', () => {
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
          naturalRecallLine: '我记得你那时已经有点撑不住了，所以我会先轻一点陪着你。',
        },
      },
      createdAt: 82_000,
    }])

    expect(seed).toContain('downrank=older-analysis-heavy-care-memory')
    expect(seed).toContain('metabolism=Downrank low-value, generic, or superseded summaries.')
    expect(seed).toContain('care-before-analysis and lighter in closeness')
    expect(seed).toContain('revise older analysis-heavy care memories')
  })

  it('carries initiative outcome strategy into the next reply seed so future recall can remember how proactive reopening was actually received', () => {
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
          naturalRecallLine: '我记得这条线还在，但上次我主动轻轻接的时候你并没有想让它那样回来。',
        },
      },
      createdAt: 81_000,
    }])

    expect(seed).toContain('initiative=low-pressure-follow-up')
    expect(seed).toContain('initiative_outcome=rejected')
    expect(seed).toContain('initiative_reaction=rejected')
    expect(seed).toContain('initiative_strategy=User resisted the initiative; keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening.')
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
          naturalRecallLine: '我记得这条线还在，但它更像该在你已经回到这条线里时，轻一点接回来。',
        },
      },
      createdAt: 86_000,
    }])

    expect(seed).toContain('initiative_window=next corrected continuity reopening when the host is already re-entering the same line')
    expect(seed).toContain('initiative_pressure=low')
    expect(seed).toContain('initiative_anti_spam=Do not turn same-person continuity into timer spam; wait until the line is visibly reopening on its own.')
    expect(seed).toContain('initiative_visible_policy=memory_structured_only')
    expect(seed).not.toContain('initiative_visible=I am not pushing')
  })

  it('turns persisted affective residue cadence into a natural recall seed even when no explicit humanlike memory candidate was written for the turn', () => {
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
    expect(seed).toContain('line=relationship_cadence=measured_return; return_pressure=low; warmth=delayed; visibility=memory_structured')
    expect(seed).toContain('initiative_visible_policy=memory_led_low_pressure; pressure=low; opening=natural_reopen; visibility=memory_structured')
    expect(seed).not.toContain('我记得这条线还在')
    expect(seed).not.toContain('轻一点')
    expect(seed).toContain('emotion=afterglow-carry')
    expect(seed).toContain('relationship=relationship_cadence=measured_return; return_pressure=low; warmth=delayed; source=affective_residue; visibility=memory_structured')
    expect(seed).toContain('embodiment=relationship_cadence=measured_return; body_pressure=lower; pacing=slower; visibility=memory_structured')
    expect(seed).toContain('initiative_window=next_open_window; return_pressure=low; opening=memory_led')
    expect(seed).toContain('initiative_anti_spam=cadence_memory_only; timer_spam=false; wait_for_visible_reentry=true')
    expect(seed).toContain('why=affective_residue_cadence=measured_return; reopen_eagerness=downranked')
    expect(seed).toContain('reason=recall_cadence=gentle; remembered_line_settling=true; visibility=memory_structured')
    expect(seed).not.toMatch(/Reply should|Keep the same proactive line|timer spam|same line does not reopen|remembered line/iu)
    expect(seed).toContain('embodiment_gaze=stable')
    expect(seed).toContain('embodiment_voice=lower-pressure')
    expect(seed).toContain('embodiment_pacing=slower')
  })

  it('prefers older same-her continuity recall over a newer generic progress memory when recall slots are limited', () => {
    const seed = buildHumanlikeMemoryRecallSeedFromMindTurnEvents([
      {
        kind: 'person-state-updated',
        payload: {
          humanlikeMemoryCandidate: {
            id: 'humanlike-memory-candidate:older-same-her-priority',
            turnId: 'turn-older-same-her-priority',
            sessionId: 'session-humanlike',
            createdAt: 90_000,
            longTermWorthiness: {
              shouldPersist: true,
              score: 0.91,
              reasons: ['relationship continuity', 'embodiment carry'],
            },
            relationshipContext: {
              threadAnchor: 'same-her continuity seam',
              summary: 'The host was not asking for a status recap; this was a same-person continuity check about whether she stayed one continuous digital life instead of turning into a tool shell.',
              primaryIntent: 'same-person-test',
            },
            emotionalResidue: {
              tags: ['protective-continuity', 'unfinishedness'],
            },
            initiativeOpportunity: {
              kind: 'remember-without-prompt',
            },
            auditTrail: {
              whyRemember: 'same-person continuity still explains the relationship seam better than a generic status shell',
              confidence: 0.84,
              correctionSurface: {
                userCorrectableFields: ['relationshipContext', 'naturalRecallLine'],
              },
            },
            recallPosture: {
              certainty: 'steady',
              reason: 'Current recall posture is steady enough to speak without hedging.',
            },
            naturalRecallLine: '我记得你更在意的是她不要变成工具壳，所以这条线该先按同一个她接回来。',
          },
        },
        createdAt: 90_000,
      },
      {
        kind: 'person-state-updated',
        payload: {
          humanlikeMemoryCandidate: {
            id: 'humanlike-memory-candidate:newer-progress-memory',
            turnId: 'turn-newer-progress-memory',
            sessionId: 'session-humanlike',
            createdAt: 95_000,
            longTermWorthiness: {
              shouldPersist: false,
              score: 0.34,
              reasons: ['ordinary recall support'],
            },
            relationshipContext: {
              threadAnchor: 'generic progress follow-up',
              summary: 'The host wanted a concise progress update on the current implementation.',
              primaryIntent: 'progress-pressure',
            },
            emotionalResidue: {
              tags: ['low-affect-trace'],
            },
            initiativeOpportunity: {
              kind: 'low-pressure-follow-up',
            },
            auditTrail: {
              whyRemember: 'recent progress recap',
              confidence: 0.49,
              correctionSurface: {
                userCorrectableFields: ['relationshipContext'],
              },
            },
            recallPosture: {
              certainty: 'steady',
              reason: 'Current recall posture is steady enough to speak without hedging.',
            },
            naturalRecallLine: '我记得你是想先知道最新进度。',
          },
        },
        createdAt: 95_000,
      },
    ], 1)

    expect(seed).toContain('same-person continuity check')
    expect(seed).toContain('tool shell')
    expect(seed).not.toContain('最新进度')
    expect(seed).not.toContain('recent progress recap')
  })
})
