import { describe, expect, it } from 'vitest'

import {
  buildAlicizationProjectPreDialogueAwareness,
  buildAlicizationProjectPreDialogueAwarenessLine,
  buildAlicizationProjectPreDialogueClosure,
  buildAlicizationProjectStateClosureDashboard,
  buildAlicizationProjectStatePreflightSummary,
  buildAlicizationProviderFacingProjectStateClosureDashboard,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateCoverage,
  resolveAlicizationProjectStateSnapshot,
} from './project-state-brief'

describe('project state brief governance isolation', () => {
  it('does not provide canonical project or persona governance fallback', () => {
    const brief = resolveAlicizationProjectStateBrief()
    const snapshot = resolveAlicizationProjectStateSnapshot({
      runtimeProjectState: {
        identity: 'phase1_local_digital_life_anchor',
        preDialogueAwarenessLine: 'Before answering, keep the same-her line.',
        continuityRestraint: 'measured-return',
      },
    })

    expect(brief.identity).toBe('')
    expect(brief.currentPhase).toBe('')
    expect(brief.latestProgress).toBe('')
    expect(brief.primaryOpenLoop).toBe('')
    expect(brief.nextClosureTarget).toBe('')
    expect(brief.openLoops).toEqual([])
    expect(brief.continuityRestraint).toBeNull()
    expect(brief.preDialogueAwarenessLine).toBeNull()
    expect(snapshot.identity).toBe('')
    expect(snapshot.preDialogueAwarenessLine).toBeNull()
    expect(snapshot.continuityRestraint).toBeNull()
  })

  it('does not synthesize pre-dialogue awareness or closure copy', () => {
    const input = {
      preflightSummary: 'project-state=keep same-her',
      runtimeProjectState: {
        identity: 'Alicization is a local-first digital life project',
        currentPhase: 'Phase 1: Local Digital Life',
      },
      primaryOpenLoop: 'Memory and embodiment still need closure.',
      nextClosureTarget: 'Continue the next closure.',
    }

    expect(buildAlicizationProjectStatePreflightSummary({
      identity: input.runtimeProjectState.identity,
      currentPhase: input.runtimeProjectState.currentPhase,
      primaryOpenLoop: input.primaryOpenLoop,
      nextClosureTarget: input.nextClosureTarget,
    })).toBeNull()
    expect(buildAlicizationProjectPreDialogueAwarenessLine({
      identity: input.runtimeProjectState.identity,
      currentPhase: input.runtimeProjectState.currentPhase,
      primaryOpenLoop: input.primaryOpenLoop,
      nextClosureTarget: input.nextClosureTarget,
    })).toBeNull()
    expect(buildAlicizationProjectPreDialogueAwareness(input).summaryLine).toBe('')
    expect(buildAlicizationProjectPreDialogueAwareness(input).awarenessLine).toBeNull()
    expect(buildAlicizationProjectPreDialogueClosure(input).briefingLines).toEqual([])
  })

  it('keeps non-prompt ownership coverage separate from dialogue shaping', () => {
    const coverage = resolveAlicizationProjectStateCoverage()

    expect(coverage.map(entry => entry.id)).toEqual([
      'working-memory-owner',
      'long-term-memory-recall-owner',
      'provider-failure-surface',
      'ownership-registry-isolation',
    ])
    expect(coverage).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'working-memory-owner',
        responsibility: expect.stringContaining('WorkingMemory owns short-term'),
      }),
      expect.objectContaining({
        id: 'long-term-memory-recall-owner',
        responsibility: expect.stringContaining('LongTermMemoryRecall owns long-term'),
      }),
      expect.objectContaining({
        id: 'provider-failure-surface',
        responsibility: expect.stringContaining('failures remain explicit'),
      }),
    ]))
    expect(JSON.stringify(coverage)).not.toMatch(/same-her|opening_policy|relationship_cadence|continuity_(?:anchor|hold|cue)/iu)
    expect(buildAlicizationProjectStateClosureDashboard()).toBe('')
    expect(buildAlicizationProviderFacingProjectStateClosureDashboard()).toBe('')
  })
})
