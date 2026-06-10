import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from '../digital-life-kernel'
import { createDefaultVisualPresenceState } from '../visual-episodic-memory'
import { buildAlicizationVisibleReplySurfacePlan } from './facade'

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
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Visible reply project-state continuity already survives into the runtime preparation lane.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam.',
        nextClosureTarget: 'Keep the same-her project briefing explicit before local visible-reply detail takes over.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
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
      focusAnchor: 'visible-reply same-her continuity',
      confidence: 0.82,
      reasonTags: ['project-state', 'same-her', 'visible-reply'],
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life',
        preDialogueAwarenessLine: 'Before answering, keep this visible reply on one same local-first digital life line.',
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
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(`Project same-her hold detail: ${correctedSamePersonAuthority}.`)
    expect(surfacePlan.systemBlocks.mindTurnContract).not.toContain(genericProgressRecapPressure)
  })
})
