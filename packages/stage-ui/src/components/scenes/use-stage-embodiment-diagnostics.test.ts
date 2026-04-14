import {
  createIdleStageEmbodimentPresencePostureState,
  createIdleStageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'

import { useStageEmbodimentDiagnostics } from './use-stage-embodiment-diagnostics'

describe('stage embodiment diagnostics', () => {
  it('exposes latest Alicization runtime digest fields in diagnostics snapshot', () => {
    const now = Date.now()
    const { snapshot } = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      runtimeDigest: ref({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.67,
        companionshipPressure: 0.81,
        channels: [
          {
            id: 'active-dialogue',
            state: 'hot',
            readiness: 0.9,
            focus: 'stay with current thread',
            summary: 'active dialogue lane is hot',
          },
        ],
        summary: 'active-dialogue=hot | continuity=0.67 | companionship=0.81',
      }),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 1280, height: 720 }),
      targetPoint: ref({ x: 640, y: 360 }),
      visualPresenceState: ref({
        watchMode: 'symbiotic-vision',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'diff',
          scenario: 'coding',
          source: 'screen-semantic-summary',
          confidence: 0.82,
          summary: 'inspecting current diff',
          target: {
            appName: 'Visual Studio Code',
            title: 'runtime.ts',
          },
          beganAt: now - 3_000,
          lastSeenAt: now - 120,
        },
        attention: {
          target: {
            appName: 'Visual Studio Code',
            title: 'runtime.ts',
          },
          source: 'current-grounded-scene',
          confidence: 0.76,
          engagedAt: now - 2_500,
          lastConfirmedAt: now - 120,
          dwellMs: 2_380,
        },
        workingMemoryEpisodes: [],
        privateThought: {
          stance: 'observe',
          confidence: 0.68,
          rationaleTags: ['scene:diff'],
          thoughtText: 'Stay with this diff line.',
          shouldSpeak: true,
          suggestedStyle: 'light-nudge',
          embodiedPresence: 'attentive',
          expiresAt: now + 8_000,
          emotionalTension: 'focused-flow',
        },
        captureState: {
          permission: 'granted',
          sourceName: 'Entire screen',
          degradedReason: undefined,
          lastGroundedAt: now - 200,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 1_500,
        updatedAt: now - 100,
      }),
    })

    expect(snapshot.value.visualPresence.runtimeDominantChannel).toBe('active-dialogue')
    expect(snapshot.value.visualPresence.runtimeShouldSpeak).toBe(true)
    expect(snapshot.value.visualPresence.runtimeShouldAct).toBe(false)
    expect(snapshot.value.visualPresence.runtimeContinuityPressure).toBeCloseTo(0.67)
    expect(snapshot.value.visualPresence.runtimeCompanionshipPressure).toBeCloseTo(0.81)
    expect(snapshot.value.visualPresence.runtimeSummary).toContain('active-dialogue=hot')
  })

  it('falls back to null Alicization diagnostics fields when runtime digest is absent', () => {
    const { snapshot } = useStageEmbodimentDiagnostics({
      activePresence: ref(null),
      presencePosture: ref(createIdleStageEmbodimentPresencePostureState()),
      speechRenderState: ref(createIdleStageEmbodimentSpeechRenderState()),
      stageBounds: ref({ width: 800, height: 600 }),
      targetPoint: ref({ x: 400, y: 300 }),
      visualPresenceState: ref(null),
    })

    expect(snapshot.value.visualPresence.runtimeDominantChannel).toBeNull()
    expect(snapshot.value.visualPresence.runtimeShouldSpeak).toBeNull()
    expect(snapshot.value.visualPresence.runtimeShouldAct).toBeNull()
    expect(snapshot.value.visualPresence.runtimeContinuityPressure).toBeNull()
    expect(snapshot.value.visualPresence.runtimeCompanionshipPressure).toBeNull()
    expect(snapshot.value.visualPresence.runtimeSummary).toBeNull()
  })
})
