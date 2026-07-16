import { describe, expect, it } from 'vitest'

import { buildAlicizationChatMetaPayload } from './main-chat-stream-meta'

describe('main chat stream meta project-state summary', () => {
  it('keeps host-corrected same-person continuity authority over generic progress recap pressure when rebuilding effective chat-meta project state', () => {
    const correctedSamePersonAuthority
      = 'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.'
    const genericProgressRecapPressure
      = 'Keep the project moving with a concise progress recap and status continuation before widening back out.'

    const payload = buildAlicizationChatMetaPayload({
      cardId: 'card-stream-meta-corrected-same-person-authority',
      turnId: 'turn-stream-meta-corrected-same-person-authority',
      governance: null,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        runtime: {
          projectState: {
            sameHerHoldDetail: correctedSamePersonAuthority,
          },
        },
      } as any,
      residentPerformance: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.7,
        companionshipPressure: 0.4,
        continuityRestraint: 'measured-return',
        projectState: {
          identity: 'Alicization is a local-first digital life project building identity continuity on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Stream-meta project-state carry already survives into host-visible continuity shaping.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter identity-continuity',
          nextClosureTarget: 'Keep project identity, landed progress, and still-open closure on one continuity state.',
          sameHerSelfLine: 'structured continuity digest.',
          sameHerHoldDetail: genericProgressRecapPressure,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
    })

    expect(payload.projectState?.sameHerHoldDetail).toBe(correctedSamePersonAuthority)
    expect(payload.runtimeDigest?.projectState?.sameHerHoldDetail).toBe(correctedSamePersonAuthority)
  })
})
