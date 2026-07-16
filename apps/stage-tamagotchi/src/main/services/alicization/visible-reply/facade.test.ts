import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from '../digital-life-kernel'
import { createDefaultVisualPresenceState } from '../visual-episodic-memory'
import {
  buildAlicizationVisibleReplySurfacePlan,
  resolveAlicizationPreparedVisibleReplyExecution,
} from './facade'

describe('visible-reply-facade', () => {
  it('keeps normal visible reply authority on the provider path', () => {
    const execution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared: {
        mindTurnContract: {
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
        },
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {},
        governance: {},
      } as any,
    })

    expect(execution.mode).toBe('provider-stream')
    expect(execution.providerMindExecuted).toBe(true)
    expect(execution.expectedVisibleReplyAuthority).toBe('llm-mind')
  })

  it('returns planning DTOs without reply-governance system blocks', () => {
    const state = createDefaultVisualPresenceState(10_000)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    const plan = buildAlicizationVisibleReplySurfacePlan({
      now: 10_000,
      context: {
        system: {},
        workload: { kind: 'unknown', confidence: 0, source: 'test' },
        content: { kind: 'unknown', confidence: 0, source: 'test' },
        relationship: {},
        localTime: { hour: 12, minute: 0, isLateNight: false },
      } as any,
      state,
      runtimeSurface,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 10_000,
      } as any,
    })

    expect(plan.executiveAnswerBrief.brief.mustDo).toEqual([])
    expect(plan.responseSurfaceContract.contract.mustDo).toEqual([])
    expect(plan.mindTurnContract.mustDo).toEqual([])
    expect(plan).not.toHaveProperty('systemBlocks')
  })
})
