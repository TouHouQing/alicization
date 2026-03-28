import { describe, expect, it } from 'vitest'

import { resolveInspectionGroundingGate } from './inspection-grounding-gate'

describe('resolveInspectionGroundingGate', () => {
  it('releases inspection when ingress has shifted to dialogue-first without explicit visual intent', () => {
    const decision = resolveInspectionGroundingGate({
      inspectionRequested: true,
      inspectionState: 'inspection-carry',
      releaseCarry: false,
      explicitInspectionIntent: false,
      ingressInspectionEligible: true,
      ingressOwner: 'alicization-self',
      ingressDialogueFirstSignal: true,
      ingressSceneBoundSignal: false,
    })

    expect(decision.inspectionRequested).toBe(false)
    expect(decision.inspectionState).toBe('dialogue-first')
    expect(decision.releaseCarry).toBe(true)
    expect(decision.reasonTags).toContain('grounding-gate:dialogue-first-ingress')
  })

  it('keeps inspection when explicit recheck intent is present', () => {
    const decision = resolveInspectionGroundingGate({
      inspectionRequested: true,
      inspectionState: 'screen-repair',
      releaseCarry: false,
      explicitInspectionIntent: true,
      ingressInspectionEligible: true,
      ingressOwner: 'task-knot',
      ingressDialogueFirstSignal: false,
      ingressSceneBoundSignal: true,
    })

    expect(decision.inspectionRequested).toBe(true)
    expect(decision.inspectionState).toBe('screen-repair')
    expect(decision.releaseCarry).toBe(false)
    expect(decision.reasonTags).toContain('grounding-gate:inspection-kept:screen-repair')
  })

  it('releases inspection when ingress is not eligible anymore', () => {
    const decision = resolveInspectionGroundingGate({
      inspectionRequested: true,
      inspectionState: 'inspection-live',
      releaseCarry: false,
      explicitInspectionIntent: false,
      ingressInspectionEligible: false,
      ingressOwner: 'task-knot',
      ingressDialogueFirstSignal: false,
      ingressSceneBoundSignal: true,
    })

    expect(decision.inspectionRequested).toBe(false)
    expect(decision.inspectionState).toBe('dialogue-first')
    expect(decision.releaseCarry).toBe(true)
    expect(decision.reasonTags).toContain('grounding-gate:ingress-ineligible')
  })
})
