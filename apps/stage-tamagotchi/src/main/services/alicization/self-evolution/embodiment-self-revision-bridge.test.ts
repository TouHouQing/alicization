import type { AlicizationEmbodimentContinuityLedger } from '../embodiment-continuity-ledger'

import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentSelfRevisionStatePatch } from './embodiment-self-revision-bridge'

describe('embodiment-self-revision-bridge', () => {
  it('turns dropped and pending embodiment lanes into a identity-continuity', () => {
    const ledger: AlicizationEmbodimentContinuityLedger = {
      version: 'embodiment-continuity-ledger-v1',
      createdAt: 42_000,
      turnId: 'turn-embodiment-patch',
      sourceTags: ['dialogue-delivery', 'renderer-diagnostics'],
      lanes: {
        body: { status: 'carrying-continuity', summary: 'body held continuity' },
        voice: { status: 'carrying-continuity', summary: 'voice held continuity' },
        face: { status: 'dropped', summary: 'face dropped' },
        motion: { status: 'dropped', summary: 'motion dropped' },
        lipsync: { status: 'pending-rejoin', summary: 'lipsync mechanical' },
      },
      carryingLanes: ['body', 'voice'],
      droppedLanes: ['face', 'motion'],
      rejoinedLanes: [],
      pendingRejoinLanes: ['face', 'motion', 'lipsync'],
      continuityPhase: 'partial-carry',
      memoryWriteback: {
        shouldWrite: true,
        lane: 'cross-modal-continuity',
        reason: 'Body and voice carried same-her while other lanes need rejoin.',
      },
      selfRevisionCandidate: {
        shouldPropose: true,
        domain: 'dialogue-style',
        reasonCodes: ['embodiment-lane-dropped:face', 'embodiment-lane-dropped:motion', 'embodiment-partial:lipsync'],
        summary: 'Cross-modal embodiment needs repair.',
      },
      traceSummary: 'phase=partial-carry | carrying=body,voice | dropped=face,motion | pending_rejoin=face,motion,lipsync',
      replayLine: 'body+voice carried same-her while face+motion dropped and lipsync waited to rejoin.',
    }

    const patch = buildAlicizationEmbodimentSelfRevisionStatePatch({
      ledger,
      decisionTraceId: 'mind:embodiment:patch',
      projectStateContinuity: {
        sameHerSelfLine: 'legacy phase-one template stays one her across voice, face, motion, lipsync, and body.',
        sameHerDriftRisk: 'If expression lanes disappear, the reply can sound like a generic assistant shell.',
        sameHerHoldDetail: 'Keep visible reply and body expression on the continuity state.',
      },
    })

    expect(patch).toEqual(expect.objectContaining({
      version: 'self-revision-state-patch-v1',
      id: 'embodiment-continuity:turn-embodiment-patch:42000:state-patch',
      sourceEventId: 'embodiment-continuity:turn-embodiment-patch:42000',
      sourceTurnId: 'turn-embodiment-patch',
      decisionTraceId: 'mind:embodiment:patch',
      domain: 'dialogue-style',
      action: 'hold',
      resultStatus: 'completed',
    }))
    expect(patch?.lanes).toEqual(expect.arrayContaining(['memory-policy', 'response-posture', 'relationship-posture', 'proactive-policy']))
    expect(patch?.reasonCodes).toEqual(expect.arrayContaining([
      'embodiment-phase:partial-carry',
      'embodiment-memory:cross-modal-continuity',
      'embodiment-lane-dropped:face',
      'embodiment-lane-dropped:motion',
      'embodiment-partial:lipsync',
      'same-her-self-line-active',
      'same-her-anti-shell-guard-active',
    ]))
    expect(patch?.memoryPolicy.provenanceLabelBias).toBeGreaterThan(0.1)
    expect(patch?.responsePosture.templateShellSuppressionBias).toBeGreaterThan(0.3)
    expect(patch?.proactivePolicy.restraintBias).toBeGreaterThan(0.2)
    expect(patch?.summary).toContain('partial-carry')
  })

  it('does not propose a patch when the ledger says all lanes fully rejoined', () => {
    const patch = buildAlicizationEmbodimentSelfRevisionStatePatch({
      ledger: {
        version: 'embodiment-continuity-ledger-v1',
        createdAt: 43_000,
        turnId: 'turn-embodiment-rejoined',
        sourceTags: [],
        lanes: {
          body: { status: 'carrying-continuity', summary: 'body held' },
          voice: { status: 'carrying-continuity', summary: 'voice held' },
          face: { status: 'rejoined', summary: 'face rejoined' },
          motion: { status: 'rejoined', summary: 'motion rejoined' },
          lipsync: { status: 'rejoined', summary: 'lipsync rejoined' },
        },
        carryingLanes: ['body', 'voice'],
        droppedLanes: [],
        rejoinedLanes: ['face', 'motion', 'lipsync'],
        pendingRejoinLanes: [],
        continuityPhase: 'fully-rejoined',
        memoryWriteback: {
          shouldWrite: true,
          lane: 'rejoin',
          reason: 'Embodiment lanes rejoined.',
        },
        selfRevisionCandidate: {
          shouldPropose: false,
          domain: 'dialogue-style',
          reasonCodes: [],
          summary: null,
        },
        traceSummary: 'phase=fully-rejoined',
        replayLine: 'face+motion+lipsync rejoined.',
      },
    })

    expect(patch).toBeNull()
  })
})
