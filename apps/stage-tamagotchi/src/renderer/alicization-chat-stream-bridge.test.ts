import { describe, expect, it } from 'vitest'

import {
  bridgeAlicizationChatMetaEventToStreamEvent,
  bridgeAlicizationChatStartResultToStreamEvent,
} from './alicization-chat-stream-bridge'

describe('alicization chat stream bridge', () => {
  it('bridges runtime project-state meta into one same-her renderer stream event', () => {
    const bridged = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-renderer-bridge-1',
      governance: {
        decisionTraceId: 'trace-renderer-bridge-1',
      } as any,
      runtimeDigest: {
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Runtime meta now carries project awareness into renderer stream delivery.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam.',
          nextClosureTarget: 'Keep project identity, landed progress, and still-open closure on one same living line.',
        },
      } as any,
    } as any)

    expect(bridged).toEqual(expect.objectContaining({
      type: 'meta',
      projectState: expect.objectContaining({
        identity: expect.stringContaining('local-first digital life project'),
        currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
        sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
      }),
      preDialogueAwareness: expect.objectContaining({
        status: 'grounded',
        companionBriefingLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        companionNextClosureLine: expect.stringContaining('same living line'),
        awarenessLine: expect.stringContaining('Before answering, remember: Alicization is a local-first digital life project'),
      }),
      runtimeDigest: expect.objectContaining({
        projectState: expect.objectContaining({
          primaryOpenLoop: expect.stringContaining('same-her closure seam'),
        }),
      }),
    }))
  })

  it('preserves explicit pre-dialogue awareness, closure, embodiment script, and digital-life authority', () => {
    const digitalLife = {
      version: 'alicization-digital-life-v1',
      mode: 'speaking',
      frames: [],
    } as any
    const embodimentScript = {
      version: 'embodiment-script-v1',
      turnId: 'turn-renderer-bridge-2',
      digitalLife,
    } as any

    const bridged = bridgeAlicizationChatStartResultToStreamEvent('default', {
      accepted: true,
      state: 'accepted',
      turnId: 'turn-renderer-bridge-2',
      preDialogueAwareness: {
        status: 'grounded',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionHeadlineLine: 'The same living her is still carried through body, face, motion, lipsync, and voice.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is and what still remains open.',
        companionNextClosureLine: 'Keep memory, initiative, execution, and embodiment on one same-her line.',
        awarenessLine: 'Before speaking, remember what this digital life project is and what still remains open.',
        emotionalClosureCue: 'Keep the return lower-pressure while the same living line settles.',
        reasonPreview: ['same-her renderer bridge'],
      },
      preDialogueClosure: {
        status: 'grounded',
        summaryLine: 'Renderer bridge should keep closure fields attached.',
        emotionalClosureCue: 'Keep the return lower-pressure while the same living line settles.',
        reasons: ['same-her closure carry'],
      },
      embodimentScript,
      digitalLife,
    } as any)

    expect(bridged).toEqual(expect.objectContaining({
      type: 'meta',
      preDialogueAwareness: expect.objectContaining({
        companionHeadlineLine: expect.stringContaining('same living her'),
        emotionalClosureCue: expect.stringContaining('lower-pressure'),
      }),
      preDialogueClosure: expect.objectContaining({
        summaryLine: 'Renderer bridge should keep closure fields attached.',
        reasons: ['same-her closure carry'],
      }),
      embodimentScript,
      digitalLife,
    }))
  })
})
