import { describe, expect, it } from 'vitest'

import {
  projectStateObservationToContinuitySnapshot,
  readConversationTurnProjectStateObservation,
} from './project-state-observation'

describe('project-state observation', () => {
  it('keeps direct project facts without carrying dialogue cues forward', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-project-facts',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'local-runtime',
          currentPhase: 'runtime_context=local_runtime',
          latestLandedProgress: 'Memory and execution facts are available for inspection.',
          primaryOpenLoop: 'Initiative and embodiment evidence still require review.',
          nextClosureTarget: 'review_pending_life_loop_evidence',
          continuitySummary: 'source=project-state-facts; landed=memory+execution; open=initiative+embodiment',
          continuityRestraint: 'measured-return',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'repair-before-closeness',
          continuityCue: 'reply_style=continue-softly',
          sameHerSelfLine: 'reply_identity=stable',
          sameHerHoldDetail: 'reply_pressure=lower',
          sameHerDriftRisk: 'reply_drift=generic',
          proactiveSameHerGap: 'reply_gap=proactive',
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'summary that must remain historical',
          awarenessLine: 'opening cue that must not be reused',
          companionBriefingLine: 'briefing that must not be reused',
          reasonPreview: ['historical cue'],
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: 'closure cue that must remain historical',
          companionHeadlineLine: 'headline that must not be reused',
          emotionalClosureCue: 'emotion cue that must not be reused',
          reasons: ['historical closure cue'],
        },
        visibleReplyRealization: {
          projectStateAudit: {
            preDialogueAwarenessSummary: 'audit cue that must not be reused',
            continuitySummary: 'audit continuity cue that must not be reused',
          },
        },
      },
    } as any)

    expect(observation).toEqual(expect.objectContaining({
      preDialogueAwareness: null,
      preDialogueClosure: null,
      projectState: expect.objectContaining({
        identity: 'local-runtime',
        currentPhase: 'runtime_context=local_runtime',
        latestLandedProgress: 'Memory and execution facts are available for inspection.',
        primaryOpenLoop: 'Initiative and embodiment evidence still require review.',
        nextClosureTarget: 'review_pending_life_loop_evidence',
        continuitySummary: 'source=project-state-facts; landed=memory+execution; open=initiative+embodiment',
        continuityRestraint: 'measured-return',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'repair-before-closeness',
        continuityCue: null,
        sameHerSelfLine: null,
        sameHerHoldDetail: null,
        sameHerDriftRisk: null,
        proactiveSameHerGap: null,
      }),
    }))
  })

  it('does not synthesize awareness from an empty transported shell', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-empty-awareness-shell',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'local-runtime',
          currentPhase: 'runtime_context=local_runtime',
          latestLandedProgress: 'Memory evidence is available.',
          primaryOpenLoop: 'Review is still pending.',
          nextClosureTarget: 'review_pending_evidence',
          continuitySummary: 'source=project-state-facts; landed=memory; open=review',
        },
        preDialogueAwareness: {},
      },
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.preDialogueAwareness).toBeNull()
    expect(snapshot?.preDialogueAwareness).toBeNull()
  })

  it('keeps legacy progress fields without rebuilding dialogue cues', () => {
    const snapshot = projectStateObservationToContinuitySnapshot({
      turnId: 'turn-legacy-progress-observation',
      sessionId: 'session-legacy-progress-observation',
      origin: 'user-turn',
      nonHumanAuthoredStatus: null,
      projectState: {
        identity: 'local-runtime',
        currentPhase: 'runtime_context=local_runtime',
        latestLandedProgress: null,
        latestProgress: 'Legacy progress survives factual snapshot rebuilding.',
        primaryOpenLoop: 'Review factual evidence before widening.',
        nextClosureTarget: 'review_factual_evidence',
        continuitySummary: 'source=project-state-facts; landed=legacy-progress; open=review',
      },
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'historical summary',
        awarenessLine: 'historical opening cue',
        reasonPreview: ['historical reason'],
      },
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'historical closure',
        reasons: ['historical closure reason'],
      },
    } as any)

    expect(snapshot?.latestLandedProgress).toBe('Legacy progress survives factual snapshot rebuilding.')
    expect(snapshot?.preDialogueAwareness).toBeNull()
    expect(snapshot?.preDialogueClosure).toBeNull()
    expect(snapshot?.emotionalClosureCue).toBeNull()
  })

  it('preserves behavior fields without provider-facing cue text', () => {
    const observation = readConversationTurnProjectStateObservation({
      sessionId: 'session-continuity-behavior-observation',
      origin: 'user-turn',
      structured: {
        projectState: {
          identity: 'local-runtime',
          currentPhase: 'runtime_context=local_runtime',
          latestLandedProgress: 'Return-side facts reached local observation.',
          primaryOpenLoop: 'A reviewed callback remains open.',
          nextClosureTarget: 'review_callback_evidence',
          continuityRestraint: 'measured-return',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'repair-before-closeness',
          continuityCue: 'reply_style=continue-softly',
          continuitySummary: 'source=project-state-facts; landed=return-side; open=callback-review',
        },
      },
    } as any)

    const snapshot = projectStateObservationToContinuitySnapshot(observation)

    expect(observation?.projectState.continuityRestraint).toBe('measured-return')
    expect(observation?.projectState.continuityPreferredTiming).toBe('next-open-window')
    expect(observation?.projectState.continuityCadence).toBe('repair-before-closeness')
    expect(observation?.projectState.continuityCue).toBeNull()
    expect(snapshot?.continuityRestraint).toBe('measured-return')
    expect(snapshot?.continuityPreferredTiming).toBe('next-open-window')
    expect(snapshot?.continuityCadence).toBe('repair-before-closeness')
    expect(snapshot?.continuityCue).toBeNull()
  })
})
