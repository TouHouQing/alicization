import { describe, expect, it } from 'vitest'

import { buildAlicizationChatMetaSignature } from './main-chat-stream-meta'

function buildDriftRiskOnlySegmentCarrySignature() {
  const driftRisk
    = 'Remembered same-her drift risk: if this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.'

  const signature = buildAlicizationChatMetaSignature({
    governance: {
      decisionTraceId: 'trace-segment-level-project-state-remembered-drift-risk-1',
    } as any,
    embodiment: {
      emotion: 'thinking',
      variationToken: 'turn-segment-level-project-state-remembered-drift-risk-1',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'observe_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      rendererHints: {
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      },
    } as any,
    embodimentScript: {
      version: 'embodiment-script-v1',
      decisionTraceId: 'trace-segment-level-project-state-remembered-drift-risk-1',
      turnId: 'turn-segment-level-project-state-remembered-drift-risk-1',
      rendererTarget: 'vrm',
      replyText: '我先沿着这条还活着的线轻一点接回来。',
      state: {
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 0,
        residentMode: 'measured-return',
      },
      speechPlan: {
        segments: [{
          id: 'segment-project-state-remembered-drift-risk',
          index: 0,
          text: '我先沿着这条还活着的线轻一点接回来。',
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 340,
        }],
        interruptPolicy: 'soft-settle',
        preRollMs: 20,
        settleMs: 340,
      },
      facePlan: {
        speakingCues: [{
          segmentId: 'segment-project-state-remembered-drift-risk',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          intensity: 0.46,
          holdMs: 320,
          source: 'resident-authority',
          confidence: 0.92,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        }],
      },
      motionPlan: {
        idleBase: 'observe_focus',
        actionBursts: [{
          segmentId: 'segment-project-state-remembered-drift-risk',
          actionCue: 'observe_focus',
          intensity: 0.34,
          holdMs: 300,
          source: 'resident-authority',
          confidence: 0.88,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        }],
        attentionMode: 'attentive',
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid',
        visemeHints: [{
          segmentId: 'segment-project-state-remembered-drift-risk',
          viseme: 'I',
          weight: 0.35,
          source: 'resident-authority',
          confidence: 0.9,
        }],
      },
    } as any,
    speechTimeline: {
      version: 'speech-timeline-v1',
      variationToken: 'turn-segment-level-project-state-remembered-drift-risk-1',
      reply: '我先沿着这条还活着的线轻一点接回来。',
      emotion: 'thinking',
      segments: [{
        id: 'segment-project-state-remembered-drift-risk',
        index: 0,
        startOffset: 0,
        endOffset: 18,
        text: '我先沿着这条还活着的线轻一点接回来。',
        emotion: 'thinking',
        gestureWeight: 0.31,
        facialWeight: 0.34,
        prosodyWeight: 0.39,
        beatWeight: 0.28,
        mouthWeight: 0.44,
        headWeight: 0.22,
        emotionHoldMs: 320,
        settleMode: 'linger',
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        actionCue: 'observe_focus',
        facialCue: 'soft-gaze',
        actionWindow: 'full-utterance',
        interruptMode: 'soft-interrupt',
      }],
    } as any,
    digitalLife: {
      version: 'digital-life-v1',
      variationToken: 'turn-segment-level-project-state-remembered-drift-risk-1',
      emotion: 'thinking',
      mode: 'thinking',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'observe_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      speechStyle: {
        pitchDelta: -3,
        rateMultiplier: 0.93,
      },
      voice: {
        pitchDelta: -3,
        rateMultiplier: 0.93,
        energy: 0.55,
        cadence: 0.52,
      },
      lipSync: {
        mode: 'energy-phoneme-hybrid',
        visemeBias: 0.35,
        energyBias: 0.61,
        mouthScale: 0.97,
        continuityHoldMs: 300,
      },
      face: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        expressionMode: 'hold',
        intensity: 0.46,
        holdMs: 320,
      },
      action: {
        actionCue: 'observe_focus',
        actionMode: 'hold',
        intensity: 0.34,
        holdMs: 300,
      },
      motor: {
        stillness: 0,
        gazeStability: 0,
        breathAmplitude: 0,
        expressivity: 0,
      },
      frames: [{
        id: 'segment-project-state-remembered-drift-risk',
        index: 0,
        startOffset: 0,
        endOffset: 18,
        text: '我先沿着这条还活着的线轻一点接回来。',
        mode: 'thinking',
        interruptPolicy: 'soft-settle',
        settleMode: 'linger',
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
          energy: 0.55,
          cadence: 0.52,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.35,
          energyBias: 0.61,
          mouthScale: 0.97,
          continuityHoldMs: 300,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.46,
          holdMs: 320,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.34,
          holdMs: 300,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0,
          gazeStability: 0,
          breathAmplitude: 0,
          expressivity: 0,
        },
      }],
    } as any,
    digitalLifeSpine: {
      version: 'digital-life-spine-digest-v1',
      runtime: {
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        sceneSummary: 'only the remembered same-her drift-risk line still survives while the host continues coding',
        activeThreadId: 'thread-segment-level-project-state-remembered-drift-risk',
        activeThreadTitle: 'segment-level project-state remembered drift risk',
        dominantMode: 'tracking',
        dominantDrive: 'understand',
        answerIntent: 'guide',
        preferredPresence: 'attentive',
        selectedAction: 'wait',
        updatedAt: 58 * 60_000,
      },
      continuitySignal: {
        label: 'same-thread-segment-level-project-state-remembered-drift-risk',
        summary: 'same-thread-continuation still active while the remembered drift-risk line quietly survives another coding detour',
        signature: 'segment-level-project-state-remembered-drift-risk',
        createdAt: 58 * 60_000,
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        activeThreadId: 'thread-segment-level-project-state-remembered-drift-risk',
        dominantMode: 'tracking',
        dominantDrive: 'understand',
        answerIntent: 'guide',
        preferredPresence: 'attentive',
      },
      proactive: {
        selectedAction: 'wait',
        preferredStyle: 'silent-observe',
        confidence: 0.9,
        shouldSpeak: false,
        continuityRestraint: 'measured-return',
        activeThreadId: 'thread-segment-level-project-state-remembered-drift-risk',
        activeThreadTitle: 'segment-level project-state remembered drift risk',
        dominantConcernKind: 'same-thread-continuation',
        dominantConcernSummary: 'keep the remembered drift-risk line inward and nearby-soft without turning it into a new opening',
        leadingGoalId: null,
        leadingGoalSummary: null,
        preferredPresence: 'attentive',
      },
      memory: null,
    } as any,
    runtimeDigest: {
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      shouldProactivelySpeak: true,
      shouldProactivelyAct: false,
      continuityPressure: 0.88,
      companionshipPressure: 0.77,
      continuityRestraint: 'measured-return',
      activeLoop: {
        phase: 'integrate',
        handoffTarget: 'active-memory',
        continuityArcStage: 'same-thread-continuation',
        initiativeBudget: 0.08,
        coherence: 0.9,
        observationHeavy: true,
        summary: 'keep the remembered drift-risk line quietly alive while the host stays with the current coding seam',
      },
      currentConsciousFrame: {
        continuityPreferredTiming: 'next-open-window',
      },
      projectState: {
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityCue: null,
        sameHerDriftRisk: driftRisk,
      },
      summary: 'dominant=active-memory | same-thread-continuation=alive',
    } as any,
    visibleReplyExecution: null,
  })

  return {
    driftRisk,
    signature: JSON.parse(signature) as {
      lastSegmentVoiceSummary?: string | null
      lastSegmentFaceSummary?: string | null
      lastSegmentMotionSummary?: string | null
      lastSegmentLipSyncSummary?: string | null
      lastSegmentBodyContinuitySummary?: string | null
    },
  }
}

describe('main chat stream meta drift-risk segment carry', () => {
  it('keeps segment-level measured-return summaries on the remembered same-her drift-risk line when project-state drift risk is the only surviving continuity authority', () => {
    const { driftRisk, signature } = buildDriftRiskOnlySegmentCarrySignature()

    expect(signature.lastSegmentVoiceSummary).toContain(`reason=${driftRisk}`)
    expect(signature.lastSegmentFaceSummary).toContain(`reason=${driftRisk}`)
    expect(signature.lastSegmentMotionSummary).toContain(`reason=${driftRisk}`)
    expect(signature.lastSegmentLipSyncSummary).toContain(`reason=${driftRisk}`)
    expect(signature.lastSegmentBodyContinuitySummary).toContain(`reason=${driftRisk}`)
    expect(signature.lastSegmentVoiceSummary).not.toContain('reason=Alicization is a local-first digital life project')
    expect(signature.lastSegmentVoiceSummary).not.toContain('reason=Keep the same living line inward for now')
  })
})
