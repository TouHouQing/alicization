import { describe, expect, it } from 'vitest'

import { buildDerivedMindStateBundle } from './alicization-derived-mind-state-bundle'
import { normalizeAlicizationDerivedMindStateBundle } from './alicization-transport-contracts'

describe('buildDerivedMindStateBundle', () => {
  it('does not let legacy opening guidance override current trust evidence', () => {
    const bundle = buildDerivedMindStateBundle({
      source: 'main-runtime',
      producedAt: 59_000,
      personStateProjection: {
        openingGuidance: 'legacy fixed opening',
        trustRationale: 'Current trust evidence from the memory owner.',
      },
    })

    expect(bundle.dialogueRhythm?.stabilitySignal).toBe('Current trust evidence from the memory owner.')
  })

  it('does not revive the removed carrying-continuity lane status', () => {
    const bundle = normalizeAlicizationDerivedMindStateBundle({
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 60_000,
      embodimentContinuityLedger: {
        version: 'embodiment-continuity-ledger-v1',
        createdAt: 60_000,
        turnId: null,
        lanes: {
          body: {
            status: 'carrying-continuity',
            summary: 'legacy status',
          },
        },
        continuityPhase: 'quiet',
        carryingLanes: ['body'],
        droppedLanes: [],
        rejoinedLanes: [],
        pendingRejoinLanes: [],
        memoryWriteback: {
          shouldWrite: false,
          lane: 'none',
          reason: 'none',
        },
        traceSummary: '',
        replayLine: '',
        sourceTags: [],
      },
    })

    expect(bundle?.embodimentContinuityLedger?.lanes?.body.status).toBe('silent')
    expect(bundle?.embodimentContinuityLedger?.carryingLanes).toEqual([])
  })

  it('preserves embodiment continuity ledger for cross-modal continuity replay and repair', () => {
    const bundle = buildDerivedMindStateBundle({
      source: 'main-runtime',
      producedAt: 61_000,
      embodimentContinuityLedger: {
        version: 'embodiment-continuity-ledger-v1',
        createdAt: 61_000,
        turnId: 'turn-embodiment-1',
        continuityPhase: 'partial-carry',
        carryingLanes: ['body', 'voice'],
        droppedLanes: ['face', 'motion'],
        rejoinedLanes: [],
        pendingRejoinLanes: ['face', 'motion', 'lipsync'],
        memoryWriteback: {
          shouldWrite: true,
          lane: 'cross-modal-continuity',
          reason: 'Body and voice carried continuity while expression lanes still need rejoin.',
        },
        traceSummary: 'phase=partial-carry | carrying=body,voice | dropped=face,motion',
        replayLine: 'body+voice carried continuity while face+motion dropped and lipsync waited to rejoin.',
        sourceTags: ['dialogue-delivery', 'renderer-diagnostics', 'cross-modal-continuity-replay'],
      },
    })

    expect(bundle.embodimentContinuityLedger).toEqual(expect.objectContaining({
      continuityPhase: 'partial-carry',
      memoryWriteback: expect.objectContaining({ lane: 'cross-modal-continuity' }),
      sourceTags: ['dialogue-delivery', 'renderer-diagnostics', 'cross-modal-continuity-replay'],
    }))
    expect(bundle.embodimentContinuityLedger).not.toHaveProperty('selfRevisionCandidate')
    expect(bundle.summary).toContain('embodiment_phase=partial-carry')
    expect(bundle.summary).not.toContain('embodiment_self_revision_candidate')
  })

  it('preserves emotional transition ledger for replay and downstream life-loop audits', () => {
    const bundle = buildDerivedMindStateBundle({
      source: 'main-runtime',
      producedAt: 60_000,
      emotionalTransitionLedger: {
        version: 'emotional-transition-ledger-v1',
        createdAt: 60_000,
        turnId: 'turn-repair-1',
        previousEmotion: 'warm-attunement',
        nextEmotion: 'repair-tension',
        transitionKind: 'repair-shift',
        axisDeltas: {
          valence: -0.44,
          arousal: 0.28,
          guardedness: 0.53,
          closenessDrive: -0.46,
          repairNeed: 0.72,
          initiativePressure: -0.32,
        },
        changedAxes: ['valence', 'repairNeed'],
        sourceTags: ['private-thought', 'affective-residue', 'repair-before-closeness'],
        decayPolicy: {
          mode: 'hold-until-repair-cools',
          carryTtlMs: 1_800_000,
          reason: 'Repair should stay carried until warmth can safely reopen.',
        },
        memoryWriteback: {
          shouldWrite: true,
          lane: 'relationship-repair',
          reason: 'Later memory recall needs this repair restraint.',
        },
        initiativeSuppression: {
          shouldSuppress: true,
          mode: 'repair-first',
          reason: 'Proactive pressure should stay low while repair settles.',
        },
        embodimentDrive: {
          shouldDrive: true,
          tone: 'repair-before-closeness',
          reason: 'The body should express repair-before-closeness.',
        },
        traceSummary: 'warm-attunement -> repair-tension; kind=repair-shift',
        replayLine: 'turn-repair-1 emotional-transition repair-shift warm-attunement -> repair-tension',
      },
    })

    expect(bundle.emotionalTransitionLedger?.transitionKind).toBe('repair-shift')
    expect(bundle.emotionalTransitionLedger?.memoryWriteback.lane).toBe('relationship-repair')
    expect(bundle.emotionalTransitionLedger).not.toHaveProperty('selfRevisionCandidate')
    expect(bundle.summary).toContain('emotion_transition=repair-shift')
    expect(bundle.summary).not.toContain('self_revision_candidate')
  })

  it('normalizes structured memory-closure causality on emotional and embodiment ledgers', () => {
    const bundle = normalizeAlicizationDerivedMindStateBundle({
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 62_000,
      emotionalTransitionLedger: {
        version: 'emotional-transition-ledger-v1',
        createdAt: 62_000,
        turnId: 'turn-memory-closure-causality-1',
        previousEmotion: null,
        nextEmotion: 'measured-companionship',
        transitionKind: 'softened',
        axisDeltas: {},
        changedAxes: ['arousal'],
        sourceTags: ['runtime-derived-downstream-state'],
        decayPolicy: {
          mode: 'decay-normally',
          carryTtlMs: 1_800_000,
          reason: 'Carry the lower-pressure residue.',
        },
        memoryWriteback: {
          shouldWrite: true,
          lane: 'emotional-continuity',
          reason: 'Write the emotional carry.',
        },
        initiativeSuppression: {
          shouldSuppress: false,
          mode: 'measured-return',
          reason: 'Return with restraint.',
          memoryClosureCausality: {
            causalSource: 'memory-closure-trace',
            affectedLane: 'initiative',
            causedByMemoryClosure: true,
            traceAuthority: 'memory-os',
            reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
            memoryIdentity: {
              selectedCandidateIds: ['episode:desktop-callback-continuity'],
              continuityKey: 'episode:desktop-callback-continuity',
              reasonTags: ['memory-identity:episode:desktop-callback-continuity'],
            },
            summary: 'trace id and policy caused this initiative restraint',
          },
        },
        embodimentDrive: {
          shouldDrive: true,
          tone: 'measured-return',
          reason: 'Drive the body line.',
        },
        traceSummary: 'emotional state changed',
        replayLine: 'afterglow carried',
        memoryClosureCausality: {
          causalSource: 'memory-closure-trace',
          affectedLane: 'emotion',
          causedByMemoryClosure: true,
          traceAuthority: 'memory-os',
          reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
          memoryIdentity: {
            selectedCandidateIds: ['episode:desktop-callback-continuity'],
            continuityKey: 'episode:desktop-callback-continuity',
            reasonTags: ['memory-identity:episode:desktop-callback-continuity'],
          },
          summary: 'trace id and policy caused this emotional state',
        },
      },
      embodimentContinuityLedger: {
        version: 'embodiment-continuity-ledger-v1',
        createdAt: 62_000,
        turnId: 'turn-memory-closure-causality-1',
        continuityPhase: 'fully-rejoined',
        carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
        droppedLanes: [],
        rejoinedLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
        pendingRejoinLanes: [],
        memoryWriteback: {
          shouldWrite: true,
          lane: 'cross-modal-continuity',
          reason: 'Write cross-modal continuity.',
        },
        traceSummary: 'all lanes rejoined',
        replayLine: 'body voice face motion lipsync carried together',
        sourceTags: ['runtime-derived-downstream-state'],
        memoryClosureCausality: {
          causalSource: 'memory-closure-trace',
          affectedLane: 'embodiment',
          causedByMemoryClosure: true,
          traceAuthority: 'memory-os',
          reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
          memoryIdentity: {
            selectedCandidateIds: ['episode:desktop-callback-continuity'],
            continuityKey: 'episode:desktop-callback-continuity',
            reasonTags: ['memory-identity:episode:desktop-callback-continuity'],
          },
          summary: 'trace id and policy caused this embodied state',
        },
      },
      learningExecutionState: {
        currentTaskId: null,
        currentStatus: null,
        currentAttemptCount: 0,
        currentMaxAttempts: 0,
        currentNextRetryAt: null,
        currentBlockedReason: null,
        currentFailureKind: null,
        nextLearningAction: 'verify',
        shouldRecord: false,
        shouldReflect: true,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['identity-continuity'],
        queuedTaskCount: 0,
        runningTaskCount: 0,
        blockedTaskCount: 0,
        recentTaskIds: [],
        lastCompletedTaskId: null,
        lastCompletedAction: null,
        lastCompletedSummary: null,
        lastFailureTaskId: null,
        lastFailureKind: null,
        lastFailureReason: null,
        lastFailureNextRetryAt: null,
        updatedAt: 62_000,
        memoryClosureCausality: {
          causalSource: 'memory-closure-trace',
          affectedLane: 'execution',
          causedByMemoryClosure: true,
          traceAuthority: 'memory-os',
          reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
          memoryIdentity: {
            selectedCandidateIds: ['episode:desktop-callback-continuity'],
            continuityKey: 'episode:desktop-callback-continuity',
            reasonTags: ['memory-identity:episode:desktop-callback-continuity'],
          },
          summary: 'trace id and policy caused this execution feedback state',
        },
      },
      summary: 'source=main-runtime',
    })

    expect(bundle?.emotionalTransitionLedger?.memoryClosureCausality).toEqual({
      causalSource: 'memory-closure-trace',
      affectedLane: 'emotion',
      causedByMemoryClosure: true,
      traceAuthority: 'memory-os',
      reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
      memoryIdentity: {
        selectedCandidateIds: ['episode:desktop-callback-continuity'],
        continuityKey: 'episode:desktop-callback-continuity',
        reasonTags: ['memory-identity:episode:desktop-callback-continuity'],
      },
      summary: 'trace id and policy caused this emotional state',
    })
    expect(bundle?.emotionalTransitionLedger?.initiativeSuppression.memoryClosureCausality).toEqual({
      causalSource: 'memory-closure-trace',
      affectedLane: 'initiative',
      causedByMemoryClosure: true,
      traceAuthority: 'memory-os',
      reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
      memoryIdentity: {
        selectedCandidateIds: ['episode:desktop-callback-continuity'],
        continuityKey: 'episode:desktop-callback-continuity',
        reasonTags: ['memory-identity:episode:desktop-callback-continuity'],
      },
      summary: 'trace id and policy caused this initiative restraint',
    })
    expect(bundle?.learningExecutionState?.memoryClosureCausality).toEqual({
      causalSource: 'memory-closure-trace',
      affectedLane: 'execution',
      causedByMemoryClosure: true,
      traceAuthority: 'memory-os',
      reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
      memoryIdentity: {
        selectedCandidateIds: ['episode:desktop-callback-continuity'],
        continuityKey: 'episode:desktop-callback-continuity',
        reasonTags: ['memory-identity:episode:desktop-callback-continuity'],
      },
      summary: 'trace id and policy caused this execution feedback state',
    })
    expect(bundle?.embodimentContinuityLedger?.memoryClosureCausality).toEqual({
      causalSource: 'memory-closure-trace',
      affectedLane: 'embodiment',
      causedByMemoryClosure: true,
      traceAuthority: 'memory-os',
      reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
      memoryIdentity: {
        selectedCandidateIds: ['episode:desktop-callback-continuity'],
        continuityKey: 'episode:desktop-callback-continuity',
        reasonTags: ['memory-identity:episode:desktop-callback-continuity'],
      },
      summary: 'trace id and policy caused this embodied state',
    })
  })
})
