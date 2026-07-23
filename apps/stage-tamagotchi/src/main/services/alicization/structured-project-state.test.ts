import { describe, expect, it } from 'vitest'

import { resolveCanonicalStructuredProjectState } from './structured-project-state'

describe('structured project state legacy governance isolation', () => {
  it('does not make the legacy project-state container an owner of user memory facts', () => {
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'project_state_scope=visible_governance',
        currentPhase: 'runtime_context=local_runtime',
        latestLandedProgress: 'The user chose green tea yesterday.',
        primaryOpenLoop: 'A birthday dinner is still undecided.',
        nextClosureTarget: 'Recall the preferred restaurant when asked.',
        sameHerSelfLine: 'continuity_context=present',
      },
    })

    expect(rebuilt.latestLandedProgress).toBeNull()
    expect(rebuilt.primaryOpenLoop).toBeNull()
    expect(rebuilt.nextClosureTarget).toBe('')
    expect(rebuilt.identity).toBe('')
    expect(rebuilt.currentPhase).toBe('')
    expect(rebuilt.sameHerSelfLine).toBe('')
    expect(rebuilt.sameHerDriftRisk).toBe('')
    expect(rebuilt.preDialogueAwarenessLine).toBeNull()
    expect(rebuilt.companionBriefingLine).toBeNull()
  })

  it('drops explicit drift, cadence, opening, and delivery-policy cues', () => {
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        sameHerDriftRisk: 'drift_risk=detached_project_shell; action=review_before_reply',
        companionBriefingLine: 'companion_briefing=project_state_continuity_review',
        emotionalClosureSummary: 'emotional_closure=half_settled; reopening=deferred',
        continuityRestraint: 'measured-return',
        continuityArcStage: 'hold-for-opening',
        continuityCue: 'opening_policy=continue_same_her',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'relationship_cadence=linger_then_rejoin',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
      },
    })

    expect(rebuilt.sameHerDriftRisk).toBe('')
    expect(rebuilt.companionBriefingLine).toBeNull()
    expect(rebuilt.emotionalClosureSummary).toBeNull()
    expect(rebuilt.continuityRestraint).toBeNull()
    expect(rebuilt.continuityArcStage).toBeNull()
    expect(rebuilt.continuityCue).toBeNull()
    expect(rebuilt.continuityPreferredTiming).toBeNull()
    expect(rebuilt.continuityCadence).toBeNull()
    expect(rebuilt.preferredBlinkCadence).toBeNull()
    expect(rebuilt.preferredGazeMode).toBeNull()
    expect(rebuilt.preferredPauseMode).toBeNull()
    expect(rebuilt.preferredLipsyncMode).toBeNull()
    expect(rebuilt.preferredVoiceMode).toBeNull()
    expect(rebuilt.preferredPacingMode).toBeNull()
  })

  it('does not replace legacy reminder shells with another awareness template', () => {
    const legacyReminderShells = [
      'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin.',
      '开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1，下一步继续把 closure 收成一个 living line。',
    ]

    for (const legacyReminder of legacyReminderShells) {
      const rebuilt = resolveCanonicalStructuredProjectState({
        normalizedProjectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          preDialogueAwarenessSummary: legacyReminder,
          preDialogueAwarenessLine: legacyReminder,
          awarenessLine: legacyReminder,
        },
        runtimePreferredAwarenessLine: legacyReminder,
        runtimePreDialogueAwarenessLine: 'opening_policy=continue_same_her',
        payloadPreDialogueAwarenessLine: 'visibility=redacted_internal',
      })

      expect(rebuilt.preDialogueAwarenessSummary).toBeNull()
      expect(rebuilt.preDialogueAwarenessLine).toBeNull()
      expect(rebuilt.awarenessLine).toBeNull()
      expect(rebuilt.companionHeadlineLine).toBeNull()
      expect(JSON.stringify(rebuilt)).not.toContain(legacyReminder)
    }
  })

  it('does not derive repair-before-closeness or continuity-arc reply instructions', () => {
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        latestLandedProgress: 'The callback result is available.',
        primaryOpenLoop: 'The user still has an unresolved follow-up.',
        nextClosureTarget: 'Answer the follow-up with recalled context.',
        sameHerDriftRisk: 'If this becomes a generic shell, restore same-her continuity.',
        continuityRestraint: 'repair-before-closeness',
        continuityPreferredTiming: 'next-open-window',
      },
      runtimePreDialogueAwarenessLine: 'structured continuity digest.',
      runtimePreflightSummary: 'identity=Alicization | phase=Phase 1 | open=repair | next=closure',
    })

    expect(rebuilt.latestLandedProgress).toBeNull()
    expect(rebuilt.primaryOpenLoop).toBeNull()
    expect(rebuilt.nextClosureTarget).toBe('')
    expect(rebuilt.sameHerHoldDetail).toBeNull()
    expect(rebuilt.sameHerDriftRisk).toBe('')
    expect(rebuilt.continuityRestraint).toBeNull()
    expect(rebuilt.continuityPreferredTiming).toBeNull()
    expect(rebuilt.continuityCue).toBeNull()
    expect(rebuilt.preDialogueAwarenessLine).toBeNull()
  })
})
