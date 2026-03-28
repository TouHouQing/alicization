import { describe, expect, it } from 'vitest'

import { resolveInspectionTurnState } from './inspection-turn-state-machine'

describe('resolveInspectionTurnState', () => {
  it('enters screen-repair when explicit inspection asks for recheck semantics', () => {
    const decision = resolveInspectionTurnState({
      candidateInspectionActive: true,
      explicitInspectionIntent: true,
      continuityActive: true,
      anchoredSceneContinuation: true,
      sharedAttentionContinuation: true,
      repairSignal: true,
      dialoguePivot: false,
      identityPivot: false,
      ingressInspectionEligible: true,
    })

    expect(decision.state).toBe('screen-repair')
    expect(decision.inspectionRequested).toBe(true)
    expect(decision.releaseCarry).toBe(false)
  })

  it('enters inspection-carry when continuity owns a follow-up without fresh explicit ask', () => {
    const decision = resolveInspectionTurnState({
      candidateInspectionActive: true,
      explicitInspectionIntent: false,
      continuityActive: true,
      anchoredSceneContinuation: true,
      sharedAttentionContinuation: false,
      repairSignal: false,
      dialoguePivot: false,
      identityPivot: false,
      ingressInspectionEligible: true,
    })

    expect(decision.state).toBe('inspection-carry')
    expect(decision.inspectionRequested).toBe(true)
    expect(decision.releaseCarry).toBe(false)
  })

  it('forces dialogue-first when a pivot away from inspection is detected', () => {
    const decision = resolveInspectionTurnState({
      candidateInspectionActive: true,
      explicitInspectionIntent: false,
      continuityActive: true,
      anchoredSceneContinuation: false,
      sharedAttentionContinuation: false,
      repairSignal: false,
      dialoguePivot: true,
      identityPivot: true,
      ingressInspectionEligible: true,
    })

    expect(decision.state).toBe('dialogue-first')
    expect(decision.inspectionRequested).toBe(false)
    expect(decision.releaseCarry).toBe(true)
    expect(decision.reasonTags).toContain('dialogue-pivot-away')
  })

  it('keeps inspection-live for explicit follow-up without repair signal', () => {
    const decision = resolveInspectionTurnState({
      candidateInspectionActive: true,
      explicitInspectionIntent: true,
      continuityActive: true,
      anchoredSceneContinuation: true,
      sharedAttentionContinuation: false,
      repairSignal: false,
      dialoguePivot: false,
      identityPivot: false,
      ingressInspectionEligible: true,
    })

    expect(decision.state).toBe('inspection-live')
    expect(decision.inspectionRequested).toBe(true)
    expect(decision.releaseCarry).toBe(false)
  })

  it('releases carry after screen-repair when ingress eligibility drops on the next turn', () => {
    const repairedTurn = resolveInspectionTurnState({
      candidateInspectionActive: true,
      explicitInspectionIntent: true,
      continuityActive: true,
      anchoredSceneContinuation: true,
      sharedAttentionContinuation: true,
      repairSignal: true,
      dialoguePivot: false,
      identityPivot: false,
      ingressInspectionEligible: true,
    })
    expect(repairedTurn.state).toBe('screen-repair')

    const nextTurn = resolveInspectionTurnState({
      candidateInspectionActive: false,
      explicitInspectionIntent: false,
      continuityActive: true,
      anchoredSceneContinuation: false,
      sharedAttentionContinuation: false,
      repairSignal: false,
      dialoguePivot: true,
      identityPivot: false,
      ingressInspectionEligible: false,
    })

    expect(nextTurn.state).toBe('dialogue-first')
    expect(nextTurn.inspectionRequested).toBe(false)
    expect(nextTurn.releaseCarry).toBe(true)
    expect(nextTurn.reasonTags).toContain('release-inspection-carry')
  })
})
