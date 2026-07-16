import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from '../digital-life-kernel'
import { createDefaultVisualPresenceState } from '../visual-episodic-memory'
import { buildAlicizationVisibleReplySurfacePlan } from './facade'

function expectNoFixedTemplateResidue(value: unknown) {
  const text = JSON.stringify(value ?? '')
  expect(containsAlicizationFixedTemplateResidue(text)).toBe(false)
}

describe('visible reply facade project-state summary', () => {
  it('keeps host-corrected same-person continuity authority over a thinner current-conscious hold detail in visible reply project state', () => {
    const baseState = createDefaultVisualPresenceState(91_000)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(baseState as any)
    const correctedSamePersonAuthority
      = 'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.'
    const genericProgressRecapPressure
      = 'Keep the project moving with a concise progress recap and status continuation before widening back out.'

    runtimeSurface.dialogue.runtimeDigest = {
      ...runtimeSurface.dialogue.runtimeDigest,
      projectState: {
        identity: 'Alicization is a local-first digital life project building identity continuity on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Visible reply project-state continuity already survives into the runtime preparation lane.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter identity-continuity',
        nextClosureTarget: 'Keep the identity-continuity',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerHoldDetail: correctedSamePersonAuthority,
      },
    } as any

    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      subject: 'project-state',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep the visible reply on one same local digital life line.',
      consciousTension: 'Do not let the reply widen back into a generic project shell.',
      speakingIntention: 'Carry the same project continuity into the first visible answer beat.',
      focusAnchor: 'visible-reply identity-continuity',
      confidence: 0.82,
      reasonTags: ['project-state', 'same-her', 'visible-reply'],
      projectState: {
        identity: 'Alicization is a local-first digital life project building identity continuity on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        sameHerHoldDetail: genericProgressRecapPressure,
      },
      updatedAt: 91_000,
    } as any

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 91_000,
      context: {
        system: {
          cpuUsage: 18,
          battery: null,
          memory: null,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: null,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.9, source: 'foreground-window-heuristic' },
        content: { kind: 'terminal', confidence: 0.84, source: 'foreground-window-heuristic' },
        relationship: {
          hostAttitude: 'focused',
          boredom: 4,
          loneliness: 5,
          fatigue: 16,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
        localTime: {
          hour: 16,
          minute: 12,
          isLateNight: false,
        },
      } as any,
      state: {
        ...baseState,
        currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame,
      } as any,
      runtimeSurface,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        watchMode: 'symbiotic-vision',
        currentScene: null,
        currentForeground: null,
        recentObservations: [],
        groundedSignal: null,
        captureHealth: 'healthy',
        capturePermission: 'granted',
        degradedSignals: [],
        updatedAt: 91_000,
      } as any,
      currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame ?? undefined,
    })

    const projectState = surfacePlan.mindTurnContract.projectState as Record<string, unknown>

    expect(projectState.sameHerHoldDetail).toBe(correctedSamePersonAuthority)
    expect(surfacePlan).not.toHaveProperty('systemBlocks')
    expect(JSON.stringify(surfacePlan)).not.toContain(genericProgressRecapPressure)
  })

  it('does not carry fixed project-state templates from runtime surface into visible reply project state', () => {
    const baseState = createDefaultVisualPresenceState(92_000)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(baseState as any)

    runtimeSurface.dialogue.runtimeDigest = {
      ...runtimeSurface.dialogue.runtimeDigest,
      projectState: {
        identity: 'Alicization is a local-first digital life project building identity continuity on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Visible reply project-state continuity already survives into runtime preparation.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter identity-continuity',
        nextClosureTarget: 'Keep extending cross-modal identity-continuity',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct identity-continuity',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
      },
    } as any

    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      subject: 'project-state',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep the visible reply grounded in current project facts.',
      consciousTension: 'Do not let fixed continuity slogans take over.',
      speakingIntention: 'Answer with usable project facts.',
      focusAnchor: 'visible-reply project-state cleanup',
      confidence: 0.82,
      reasonTags: ['project-state'],
      projectState: {
        identity: 'Alicization is a local-first digital life project building identity continuity on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        sameHerSelfLine: 'identity continuity on the continuity state',
        sameHerDriftRisk: 'same-her drift if a generic project shell takes over',
      },
      updatedAt: 92_000,
    } as any

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 92_000,
      context: {
        system: {
          cpuUsage: 18,
          battery: null,
          memory: null,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: null,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.9, source: 'foreground-window-heuristic' },
        content: { kind: 'terminal', confidence: 0.84, source: 'foreground-window-heuristic' },
        relationship: {
          hostAttitude: 'focused',
          boredom: 4,
          loneliness: 5,
          fatigue: 16,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
        localTime: {
          hour: 16,
          minute: 12,
          isLateNight: false,
        },
      } as any,
      state: {
        ...baseState,
        currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame,
      } as any,
      runtimeSurface,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        watchMode: 'symbiotic-vision',
        currentScene: null,
        currentForeground: null,
        recentObservations: [],
        groundedSignal: null,
        captureHealth: 'healthy',
        capturePermission: 'granted',
        degradedSignals: [],
        updatedAt: 92_000,
      } as any,
      currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame ?? undefined,
    })

    expectNoFixedTemplateResidue(surfacePlan.mindTurnContract.projectState)
    expect(surfacePlan).not.toHaveProperty('systemBlocks')
    expect(JSON.stringify(surfacePlan.mindTurnContract.projectState)).not.toContain(
      'pre_turn_context_digest',
    )
    expect(JSON.stringify(surfacePlan.mindTurnContract.projectState)).not.toContain(
      'identity continuity on the continuity state',
    )
  })

  it('does not promote fixed same-her slogans from answerCompiler openingClaim into visible-reply project state or provider blocks', () => {
    const baseState = createDefaultVisualPresenceState(93_000)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(baseState as any)

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 93_000,
      context: {
        system: {
          cpuUsage: 18,
          battery: null,
          memory: null,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: null,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.9, source: 'foreground-window-heuristic' },
        content: { kind: 'terminal', confidence: 0.84, source: 'foreground-window-heuristic' },
        relationship: {
          hostAttitude: 'focused',
          boredom: 4,
          loneliness: 5,
          fatigue: 16,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
        localTime: {
          hour: 16,
          minute: 12,
          isLateNight: false,
        },
      } as any,
      state: baseState as any,
      runtimeSurface,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        watchMode: 'symbiotic-vision',
        currentScene: null,
        currentForeground: null,
        recentObservations: [],
        groundedSignal: null,
        captureHealth: 'healthy',
        capturePermission: 'granted',
        degradedSignals: [],
        updatedAt: 93_000,
      } as any,
      answerCompiler: {
        openingClaim: 'structured continuity digest.',
        supportingReality: [],
        mustDo: [],
        mustNotDo: ['If this turns into generic project shell narration, treat that as identity-continuity'],
      } as any,
    })

    expectNoFixedTemplateResidue(surfacePlan.mindTurnContract.projectState)
    expect(surfacePlan).not.toHaveProperty('systemBlocks')
    expect(String(surfacePlan.mindTurnContract.projectState?.sameHerSelfLine ?? '')).not.toContain('legacy phase-one template')
    expect(String(surfacePlan.mindTurnContract.projectState?.sameHerDriftRisk ?? '')).not.toContain('same-her')
  })
})
