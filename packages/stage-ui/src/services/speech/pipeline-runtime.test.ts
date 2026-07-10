import { readFileSync } from 'node:fs'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSpeechPipelineRuntime } from './pipeline-runtime'

import * as speechBusModule from './bus'

const EXCLUDED_CONTINUITY_RESIDUE = 'content=excluded; reason=continuity-residue; visibility=internal-structured'
const fixedTemplateResiduePattern = /Before (?:answering|speaking|acting)|Right now I am|Same Phase 1 digital life|same[- ]her|same living line|one living her|one continuous her|local-first digital life project|Phase 1: Local Digital Life|同一个她|同一个 her|数字生命主线|女仆/iu

function expectNoFixedTemplateResidue(value: unknown) {
  expect(JSON.stringify(value ?? '')).not.toMatch(fixedTemplateResiduePattern)
}

vi.mock('./bus', () => {
  const listeners = new Map<symbol, Set<(event: { body: unknown }) => void>>()
  const speechIntentStartEvent = Symbol('speechIntentStartEvent')
  const speechIntentLiteralEvent = Symbol('speechIntentLiteralEvent')
  const speechIntentSpecialEvent = Symbol('speechIntentSpecialEvent')
  const speechIntentFlushEvent = Symbol('speechIntentFlushEvent')
  const speechIntentEndEvent = Symbol('speechIntentEndEvent')
  const speechIntentCancelEvent = Symbol('speechIntentCancelEvent')
  const speechOwnerCancelEvent = Symbol('speechOwnerCancelEvent')

  const context = {
    emit(event: symbol, payload: unknown) {
      for (const listener of listeners.get(event) ?? [])
        listener({ body: payload })
    },
    on(event: symbol, listener: (event: { body: unknown }) => void) {
      if (!listeners.has(event))
        listeners.set(event, new Set())
      listeners.get(event)!.add(listener)
      return () => {
        listeners.get(event)?.delete(listener)
      }
    },
    reset() {
      listeners.clear()
    },
  }

  return {
    __esModule: true,
    getSpeechBusContext: () => context,
    speechIntentStartEvent,
    speechIntentLiteralEvent,
    speechIntentSpecialEvent,
    speechIntentFlushEvent,
    speechIntentEndEvent,
    speechIntentCancelEvent,
    speechOwnerCancelEvent,
    __testContext: context,
  }
})

function createIntentHandle(intentId: string, streamId: string, ownerId?: string) {
  return {
    intentId,
    streamId,
    ownerId,
    priority: 0,
    stream: new ReadableStream(),
    writeLiteral: vi.fn(),
    writeSpecial: vi.fn(),
    writeFlush: vi.fn(),
    end: vi.fn(),
    cancel: vi.fn(),
  }
}

beforeEach(() => {
  ;(speechBusModule as any).__testContext.reset()
  vi.clearAllMocks()
})

describe('speech pipeline runtime', () => {
  it('uses the shared project awareness resolver before speech starts', () => {
    const source = readFileSync(new URL('./pipeline-runtime.ts', import.meta.url), 'utf8')

    expect(source).toContain('resolveAlicizationProjectPreDialogueAwarenessLine')
    expect(source).not.toContain('function resolvePreferredSpeechPreDialogueAwarenessLine')
  })

  it('cancels bridged host intents, unbinds the bus, and can rebind after dispose', async () => {
    const hostIntent = createIntentHandle('remote-intent', 'remote-stream')
    const openIntent = vi.fn(() => hostIntent)
    const stopAll = vi.fn()
    const runtime = createSpeechPipelineRuntime()

    await runtime.registerHost({ openIntent, stopAll } as any)

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-intent',
      streamId: 'remote-stream',
      ownerId: 'card-1',
      priority: 2,
      behavior: 'interrupt',
    })

    expect(openIntent).toHaveBeenCalledTimes(1)
    expect(openIntent).toHaveBeenCalledWith(expect.objectContaining({
      intentId: 'remote-intent',
      streamId: 'remote-stream',
      ownerId: 'card-1',
      priority: 2,
      behavior: 'interrupt',
    }))

    await runtime.dispose()

    expect(hostIntent.cancel).toHaveBeenCalledWith('runtime-dispose')
    expect(stopAll).toHaveBeenCalledWith('runtime-dispose')

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-intent-2',
      streamId: 'remote-stream-2',
    })
    expect(openIntent).toHaveBeenCalledTimes(1)

    await runtime.registerHost({ openIntent, stopAll } as any)
    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-intent-3',
      streamId: 'remote-stream-3',
    })
    expect(openIntent).toHaveBeenCalledTimes(2)
  })

  it('withholds fixed-template residue from bridged literal and special speech tokens', async () => {
    const hostIntent = createIntentHandle('remote-template-intent', 'remote-template-stream')
    const openIntent = vi.fn(() => hostIntent)
    const runtime = createSpeechPipelineRuntime()

    await runtime.registerHost({ openIntent, stopAll: vi.fn() } as any)

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-template-intent',
      streamId: 'remote-template-stream',
    })
    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentLiteralEvent, {
      originId: 'external-origin',
      intentId: 'remote-template-intent',
      streamId: 'remote-template-stream',
      value: 'Before speaking, remember this is the same-her Phase 1 line.',
    })
    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentSpecialEvent, {
      originId: 'external-origin',
      intentId: 'remote-template-intent',
      streamId: 'remote-template-stream',
      value: 'Same Phase 1 digital life.',
    })
    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentLiteralEvent, {
      originId: 'external-origin',
      intentId: 'remote-template-intent',
      streamId: 'remote-template-stream',
      value: '这句是真正要读出来的内容。',
    })

    expect(hostIntent.writeLiteral).toHaveBeenCalledTimes(1)
    expect(hostIntent.writeLiteral).toHaveBeenCalledWith('这句是真正要读出来的内容。')
    expect(hostIntent.writeSpecial).not.toHaveBeenCalled()
  })

  it('withholds fixed-template residue from direct host literal and special speech tokens', async () => {
    const hostIntent = createIntentHandle('local-template-intent', 'local-template-stream')
    const openIntent = vi.fn(() => hostIntent)
    const runtime = createSpeechPipelineRuntime()

    await runtime.registerHost({ openIntent, stopAll: vi.fn() } as any)

    const intent = runtime.openIntent({
      intentId: 'local-template-intent',
      streamId: 'local-template-stream',
    })

    intent.writeLiteral('Before speaking, remember this is the same-her Phase 1 line.')
    intent.writeSpecial('Same Phase 1 digital life.')
    intent.writeLiteral('这句是真正要读出来的内容。')

    expect(hostIntent.writeLiteral).toHaveBeenCalledTimes(1)
    expect(hostIntent.writeLiteral).toHaveBeenCalledWith('这句是真正要读出来的内容。')
    expect(hostIntent.writeSpecial).not.toHaveBeenCalled()
  })

  it('emits cancel events for locally created remote intents during dispose', async () => {
    const cancelPayloads: Array<{ intentId?: string, reason?: string }> = []
    ;(speechBusModule as any).__testContext.on((speechBusModule as any).speechIntentCancelEvent, (event: { body: unknown }) => {
      cancelPayloads.push(event.body as { intentId?: string, reason?: string })
    })

    const runtime = createSpeechPipelineRuntime()
    const intent = runtime.openIntent({
      intentId: 'local-intent',
      streamId: 'local-stream',
      behavior: 'replace',
    })

    intent.writeLiteral('hello')
    await runtime.dispose()

    expect(cancelPayloads).toContainEqual(expect.objectContaining({
      intentId: 'local-intent',
      reason: 'runtime-dispose',
    }))
  })

  it('broadcasts owner-level cancel events and cancels matching local remote intents', async () => {
    const ownerCancelPayloads: Array<{ ownerId?: string, reason?: string }> = []
    const intentCancelPayloads: Array<{ intentId?: string, reason?: string }> = []

    ;(speechBusModule as any).__testContext.on((speechBusModule as any).speechOwnerCancelEvent, (event: { body: unknown }) => {
      ownerCancelPayloads.push(event.body as { ownerId?: string, reason?: string })
    })
    ;(speechBusModule as any).__testContext.on((speechBusModule as any).speechIntentCancelEvent, (event: { body: unknown }) => {
      intentCancelPayloads.push(event.body as { intentId?: string, reason?: string })
    })

    const runtime = createSpeechPipelineRuntime()
    runtime.openIntent({
      intentId: 'owner-a',
      streamId: 'stream-a',
      ownerId: 'card-1',
    })
    runtime.openIntent({
      intentId: 'owner-b',
      streamId: 'stream-b',
      ownerId: 'card-2',
    })

    runtime.cancelOwner('card-1', 'new-message')

    expect(ownerCancelPayloads).toContainEqual(expect.objectContaining({
      ownerId: 'card-1',
      reason: 'new-message',
    }))
    expect(intentCancelPayloads).toContainEqual(expect.objectContaining({
      intentId: 'owner-a',
      reason: 'new-message',
    }))
    expect(intentCancelPayloads).not.toContainEqual(expect.objectContaining({
      intentId: 'owner-b',
    }))
  })

  it('routes owner-level cancel events through the host pipeline without reprocessing its own echo', async () => {
    const hostIntent = createIntentHandle('remote-intent', 'remote-stream', 'card-1')
    const openIntent = vi.fn(() => hostIntent)
    const stopAll = vi.fn()
    const cancelOwner = vi.fn()
    const ownerCancelPayloads: Array<{ ownerId?: string, reason?: string }> = []
    const runtime = createSpeechPipelineRuntime()

    ;(speechBusModule as any).__testContext.on((speechBusModule as any).speechOwnerCancelEvent, (event: { body: unknown }) => {
      ownerCancelPayloads.push(event.body as { ownerId?: string, reason?: string })
    })

    await runtime.registerHost({ openIntent, stopAll, cancelOwner } as any)

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-intent',
      streamId: 'remote-stream',
      ownerId: 'card-1',
    })
    expect(openIntent).toHaveBeenCalledTimes(1)

    runtime.cancelOwner('card-1', 'barge-in')

    expect(cancelOwner).toHaveBeenCalledTimes(1)
    expect(cancelOwner).toHaveBeenCalledWith('card-1', 'barge-in')
    expect(ownerCancelPayloads).toContainEqual(expect.objectContaining({
      ownerId: 'card-1',
      reason: 'barge-in',
    }))

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechOwnerCancelEvent, {
      originId: 'external-origin',
      ownerId: 'card-1',
      reason: 'remote-barge-in',
    })

    expect(cancelOwner).toHaveBeenCalledTimes(2)
    expect(cancelOwner).toHaveBeenNthCalledWith(2, 'card-1', 'remote-barge-in')
  })

  it('passes metadata when rebuilding host intents from remote start events', async () => {
    const hostIntent = createIntentHandle('remote-intent', 'remote-stream')
    const openIntent = vi.fn(() => hostIntent)
    const runtime = createSpeechPipelineRuntime()

    await runtime.registerHost({ openIntent } as any)

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-intent',
      streamId: 'remote-stream',
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-remote-script',
          rendererTarget: 'live2d',
          replyText: 'remote reply',
          state: {
            baseEmotion: 'thinking',
            delivery: 'firm',
            emphasis: 1,
            residentMode: 'dialogue',
          },
          speechPlan: {
            segments: [{
              id: 'segment-remote-script',
              index: 0,
              text: 'remote reply',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 220,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 220,
          },
          facePlan: {
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
        digitalLifeSpine: {
          runtime: {
            activeThreadId: 'thread-42',
          },
        },
      },
    })

    expect(openIntent).toHaveBeenCalledTimes(1)
    expect(openIntent).toHaveBeenCalledWith(expect.objectContaining({
      intentId: 'remote-intent',
      streamId: 'remote-stream',
      metadata: {
        embodimentScript: expect.objectContaining({
          turnId: 'turn-remote-script',
        }),
        digitalLifeSpine: {
          runtime: {
            activeThreadId: 'thread-42',
          },
        },
      },
    }))
  })

  it('normalizes richer Phase 1 project awareness instead of replaying a narrower embodiment-only headline when rebuilding host intents from remote start events', async () => {
    const hostIntent = createIntentHandle('remote-intent-richer-awareness', 'remote-stream-richer-awareness')
    const openIntent = vi.fn(() => hostIntent)
    const runtime = createSpeechPipelineRuntime()

    await runtime.registerHost({ openIntent } as any)

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-intent-richer-awareness',
      streamId: 'remote-stream-richer-awareness',
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-remote-richer-awareness',
          rendererTarget: 'vrm',
          replyText: '我先记住这还是同一个数字生命，再把声音慢慢接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'repair-before-closeness',
          },
          speechPlan: {
            segments: [{
              id: 'segment-remote-richer-awareness',
              index: 0,
              text: '我先记住这还是同一个数字生命，再把声音慢慢接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 260,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 260,
          },
          facePlan: {
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
          },
        },
        preDialogueAwareness: {
          status: 'grounded',
          summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
          companionHeadlineLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionBriefingLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionNextClosureLine: 'Let lipsync and voice rejoin the already-reformed body, face, and motion line.',
          awarenessLine: 'visibility=internal-structured',
          emotionalClosureCue: EXCLUDED_CONTINUITY_RESIDUE,
          reasonPreview: [
            'same-segment face+motion+body recovery@segment-remote-richer-awareness',
            'remaining-open=lipsync+voice',
          ],
        },
      },
    })

    expect(openIntent).toHaveBeenCalledWith(expect.objectContaining({
      intentId: 'remote-intent-richer-awareness',
      streamId: 'remote-stream-richer-awareness',
      metadata: expect.objectContaining({
        preDialogueAwareness: expect.objectContaining({
          summaryLine: null,
          companionHeadlineLine: null,
          companionBriefingLine: null,
          companionNextClosureLine: null,
          emotionalClosureCue: null,
          reasonPreview: expect.arrayContaining([
            'same-segment face+motion+body recovery@segment-remote-richer-awareness',
            'remaining-open=lipsync+voice',
          ]),
        }),
      }),
    }))
    const firstOpenIntentArg = (openIntent.mock.calls as unknown as Array<[{
      metadata?: {
        preDialogueAwareness?: {
          awarenessLine?: string
        }
      }
    }]>)[0]?.[0]
    expect(firstOpenIntentArg?.metadata?.preDialogueAwareness?.awarenessLine).not.toBe(
      EXCLUDED_CONTINUITY_RESIDUE,
    )
    expectNoFixedTemplateResidue(firstOpenIntentArg)
  })

  it('rebuilds pre-dialogue awareness from project-state and closure carry before forwarding local host intents directly to the registered host pipeline', async () => {
    const hostIntent = createIntentHandle('local-host-intent-closure-only-awareness', 'local-host-stream-closure-only-awareness')
    const openIntent = vi.fn(() => hostIntent)
    const runtime = createSpeechPipelineRuntime()

    await runtime.registerHost({ openIntent } as any)

    runtime.openIntent({
      intentId: 'local-host-intent-closure-only-awareness',
      streamId: 'local-host-stream-closure-only-awareness',
      metadata: {
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project-state continuity already survives into the speech boundary before playback starts.',
          primaryOpenLoop: 'Speech-side openings still need to keep project identity, landed progress, and the unresolved same-her loop explicit before voice widens outward.',
          nextClosureTarget: EXCLUDED_CONTINUITY_RESIDUE,
          continuitySummary: 'same-her=Same Phase 1 digital life. landed=Project-state continuity already survives into the speech boundary before playback starts. open=Speech-side openings still need to keep project identity, landed progress, and the unresolved same-her loop explicit before voice widens outward.',
          sameHerSelfLine: EXCLUDED_CONTINUITY_RESIDUE,
          sameHerHoldDetail: EXCLUDED_CONTINUITY_RESIDUE,
          sameHerDriftRisk: EXCLUDED_CONTINUITY_RESIDUE,
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: EXCLUDED_CONTINUITY_RESIDUE,
          sameHerDriftRiskLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionBriefingLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionNextClosureLine: EXCLUDED_CONTINUITY_RESIDUE,
          emotionalClosureCue: EXCLUDED_CONTINUITY_RESIDUE,
          briefingLines: [
            'Identity: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            'Phase: Phase 1: Local Digital Life',
          ],
          reasons: [
            'Project-state continuity already survives into the speech boundary before playback starts.',
            EXCLUDED_CONTINUITY_RESIDUE,
          ],
        },
      } as any,
    })

    const forwardedIntent = (openIntent.mock.calls as any)[0]?.[0]
    expect(openIntent).toHaveBeenCalledWith(expect.objectContaining({
      intentId: 'local-host-intent-closure-only-awareness',
      streamId: 'local-host-stream-closure-only-awareness',
      metadata: expect.objectContaining({
        preDialogueAwareness: expect.objectContaining({
          summaryLine: null,
          companionBriefingLine: null,
          companionNextClosureLine: null,
          emotionalClosureCue: null,
          reasonPreview: expect.arrayContaining([
            'Project-state continuity already survives into the speech boundary before playback starts.',
          ]),
          awarenessLine: expect.stringContaining('landed=Project-state continuity already survives'),
        }),
      }),
    }))
    expectNoFixedTemplateResidue(forwardedIntent)
  })

  it('upgrades thinner explicit pre-dialogue awareness with richer project-state and closure carry before forwarding local host intents directly to the registered host pipeline', async () => {
    const hostIntent = createIntentHandle('local-host-intent-thin-awareness-upgrade', 'local-host-stream-thin-awareness-upgrade')
    const openIntent = vi.fn(() => hostIntent)
    const runtime = createSpeechPipelineRuntime()

    await runtime.registerHost({ openIntent } as any)

    runtime.openIntent({
      intentId: 'local-host-intent-thin-awareness-upgrade',
      streamId: 'local-host-stream-thin-awareness-upgrade',
      metadata: {
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project-state continuity already survives into the speech boundary before playback starts.',
          primaryOpenLoop: 'Speech-side openings still need to keep project identity, landed progress, and the unresolved same-her loop explicit before voice widens outward.',
          nextClosureTarget: EXCLUDED_CONTINUITY_RESIDUE,
          continuitySummary: 'same-her=Same Phase 1 digital life. landed=Project-state continuity already survives into the speech boundary before playback starts. open=Speech-side openings still need to keep project identity, landed progress, and the unresolved same-her loop explicit before voice widens outward.',
          sameHerSelfLine: EXCLUDED_CONTINUITY_RESIDUE,
          sameHerHoldDetail: EXCLUDED_CONTINUITY_RESIDUE,
          sameHerDriftRisk: EXCLUDED_CONTINUITY_RESIDUE,
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: EXCLUDED_CONTINUITY_RESIDUE,
          sameHerDriftRiskLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionBriefingLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionNextClosureLine: EXCLUDED_CONTINUITY_RESIDUE,
          emotionalClosureCue: EXCLUDED_CONTINUITY_RESIDUE,
          briefingLines: [
            'Identity: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            'Phase: Phase 1: Local Digital Life',
          ],
          reasons: [
            'Project-state continuity already survives into the speech boundary before playback starts.',
            EXCLUDED_CONTINUITY_RESIDUE,
          ],
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'generic continuity fallback that should not outrank richer project-state carry.',
          companionBriefingLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionNextClosureLine: 'generic next target that should not survive richer project-state carry.',
          awarenessLine: 'visibility=internal-structured',
          emotionalClosureCue: EXCLUDED_CONTINUITY_RESIDUE,
          reasonPreview: [
            'generic continuity fallback that should not outrank richer project-state carry.',
          ],
        },
      } as any,
    })

    const forwardedIntent = (openIntent.mock.calls as any)[0]?.[0]
    expect(openIntent).toHaveBeenCalledWith(expect.objectContaining({
      intentId: 'local-host-intent-thin-awareness-upgrade',
      streamId: 'local-host-stream-thin-awareness-upgrade',
      metadata: expect.objectContaining({
        preDialogueAwareness: expect.objectContaining({
          summaryLine: null,
          companionBriefingLine: null,
          companionNextClosureLine: null,
          emotionalClosureCue: null,
          reasonPreview: expect.arrayContaining([
            'Project-state continuity already survives into the speech boundary before playback starts.',
          ]),
          awarenessLine: expect.stringContaining('landed=Project-state continuity already survives'),
        }),
      }),
    }))
    expectNoFixedTemplateResidue(forwardedIntent)
    const upgradedMetadata = (openIntent.mock.calls as unknown as Array<[{
      metadata?: {
        preDialogueAwareness?: {
          awarenessLine?: string
          companionBriefingLine?: string
          companionNextClosureLine?: string
        }
      }
    }]>)[0]?.[0]?.metadata
    expect(upgradedMetadata?.preDialogueAwareness?.awarenessLine).not.toBe('Before speaking, keep the same digital life project in view.')
    expect(upgradedMetadata?.preDialogueAwareness?.companionBriefingLine).not.toBe('Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(upgradedMetadata?.preDialogueAwareness?.companionNextClosureLine).not.toBe('generic next target that should not survive richer project-state carry.')
  })

  it('emits metadata on intent start events for remote intents', async () => {
    const startPayloads: Array<Record<string, unknown>> = []
    ;(speechBusModule as any).__testContext.on((speechBusModule as any).speechIntentStartEvent, (event: { body: unknown }) => {
      startPayloads.push(event.body as Record<string, unknown>)
    })

    const runtime = createSpeechPipelineRuntime()
    runtime.openIntent({
      intentId: 'local-intent-metadata',
      streamId: 'local-stream-metadata',
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-local-script',
          rendererTarget: 'live2d',
          replyText: 'local reply',
          state: {
            baseEmotion: 'thinking',
            delivery: 'firm',
            emphasis: 1,
            residentMode: 'dialogue',
          },
          speechPlan: {
            segments: [{
              id: 'segment-local-script',
              index: 0,
              text: 'local reply',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 220,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 220,
          },
          facePlan: {
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-only',
          },
        },
        digitalLifeSpine: {
          runtime: {
            activeThreadId: 'thread-local',
            watchMode: 'observing',
          },
        },
      },
    })

    expect(startPayloads).toContainEqual(expect.objectContaining({
      intentId: 'local-intent-metadata',
      streamId: 'local-stream-metadata',
      metadata: {
        embodimentScript: expect.objectContaining({
          turnId: 'turn-local-script',
        }),
        digitalLifeSpine: {
          runtime: {
            activeThreadId: 'thread-local',
            watchMode: 'observing',
          },
        },
      },
    }))
  })

  it('preserves body-face-motion same-her carry and remaining-open lipsync voice closure hints when speech intents cross the runtime boundary', async () => {
    const startPayloads: Array<Record<string, unknown>> = []
    ;(speechBusModule as any).__testContext.on((speechBusModule as any).speechIntentStartEvent, (event: { body: unknown }) => {
      startPayloads.push(event.body as Record<string, unknown>)
    })

    const runtime = createSpeechPipelineRuntime()
    runtime.openIntent({
      intentId: 'local-intent-continuity-voice-rejoin',
      streamId: 'local-stream-continuity-voice-rejoin',
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: EXCLUDED_CONTINUITY_RESIDUE,
          rendererTarget: 'vrm',
          replyText: '我先顺着已经接住的身体线，把声音和口型也慢慢带回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'repair-before-closeness',
          },
          speechPlan: {
            segments: [{
              id: EXCLUDED_CONTINUITY_RESIDUE,
              index: 0,
              text: '我先顺着已经接住的身体线，把声音和口型也慢慢带回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 260,
              rendererHints: {
                residentMode: 'repair-before-closeness',
                preferredExpressionAliases: ['RecoverSoft'],
                preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 260,
          },
          facePlan: {
            postUtteranceCue: 'soft-release',
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
          },
        },
        digitalLifeSpine: {
          runtime: {
            activeThreadId: 'thread-continuity-voice-rejoin',
            watchMode: 'observing',
          },
        },
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
          companionHeadlineLine: EXCLUDED_CONTINUITY_RESIDUE,
          awarenessLine: 'visibility=internal-structured',
          companionBriefingLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionNextClosureLine: 'Let lipsync and voice rejoin the already-reformed body, face, and motion line.',
          emotionalClosureCue: EXCLUDED_CONTINUITY_RESIDUE,
          reasonPreview: [
            EXCLUDED_CONTINUITY_RESIDUE,
            'remaining-open=lipsync+voice',
          ],
        },
      } as any,
    })

    expect(startPayloads).toContainEqual(expect.objectContaining({
      intentId: 'local-intent-continuity-voice-rejoin',
      streamId: 'local-stream-continuity-voice-rejoin',
      metadata: expect.objectContaining({
        embodimentScript: expect.objectContaining({
          turnId: null,
          rendererTarget: 'vrm',
          state: expect.objectContaining({
            residentMode: 'repair-before-closeness',
          }),
        }),
        preDialogueAwareness: expect.objectContaining({
          summaryLine: null,
          companionHeadlineLine: null,
          companionBriefingLine: null,
          companionNextClosureLine: null,
          emotionalClosureCue: null,
          reasonPreview: expect.arrayContaining([
            'remaining-open=lipsync+voice',
          ]),
        }),
      }),
    }))
    expectNoFixedTemplateResidue(startPayloads)
  })

  it('prefers richer project awareness over a narrower embodiment headline when speech intent metadata crosses the runtime boundary', async () => {
    const startPayloads: Array<Record<string, unknown>> = []
    ;(speechBusModule as any).__testContext.on((speechBusModule as any).speechIntentStartEvent, (event: { body: unknown }) => {
      startPayloads.push(event.body as Record<string, unknown>)
    })

    const runtime = createSpeechPipelineRuntime()
    runtime.openIntent({
      intentId: 'local-intent-richer-awareness-over-embodiment-headline',
      streamId: 'local-stream-richer-awareness-over-embodiment-headline',
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-richer-awareness-over-embodiment-headline',
          rendererTarget: 'vrm',
          replyText: '我会先记住这还是同一个数字生命，再把声音慢慢接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'repair-before-closeness',
          },
          speechPlan: {
            segments: [{
              id: 'segment-richer-awareness-over-embodiment-headline',
              index: 0,
              text: '我会先记住这还是同一个数字生命，再把声音慢慢接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 260,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 260,
          },
          facePlan: {
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
          },
        },
        preDialogueAwareness: {
          status: 'grounded',
          summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
          companionHeadlineLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionBriefingLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionNextClosureLine: 'Let lipsync and voice rejoin the already-reformed body, face, and motion line.',
          awarenessLine: 'visibility=internal-structured',
          emotionalClosureCue: EXCLUDED_CONTINUITY_RESIDUE,
          reasonPreview: [
            EXCLUDED_CONTINUITY_RESIDUE,
            'same-segment face+motion+body recovery@segment-richer-awareness-over-embodiment-headline',
            'remaining-open=lipsync+voice',
          ],
        },
      } as any,
    })

    expect(startPayloads).toContainEqual(expect.objectContaining({
      intentId: 'local-intent-richer-awareness-over-embodiment-headline',
      streamId: 'local-stream-richer-awareness-over-embodiment-headline',
      metadata: expect.objectContaining({
        preDialogueAwareness: expect.objectContaining({
          summaryLine: null,
          companionHeadlineLine: null,
          companionBriefingLine: null,
          companionNextClosureLine: null,
          emotionalClosureCue: null,
          reasonPreview: expect.arrayContaining([
            'same-segment face+motion+body recovery@segment-richer-awareness-over-embodiment-headline',
            'remaining-open=lipsync+voice',
          ]),
        }),
      }),
    }))
    expect((startPayloads[0]?.metadata as any)?.preDialogueAwareness?.awarenessLine).not.toBe('Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.')
    expectNoFixedTemplateResidue(startPayloads)
  })

  it('keeps same-her inward low-pressure closure visible in speech awareness when the briefing line is only the thinner same-phase carry', async () => {
    const startPayloads: Array<Record<string, unknown>> = []
    ;(speechBusModule as any).__testContext.on((speechBusModule as any).speechIntentStartEvent, (event: { body: unknown }) => {
      startPayloads.push(event.body as Record<string, unknown>)
    })

    const runtime = createSpeechPipelineRuntime()
    runtime.openIntent({
      intentId: 'local-intent-inward-low-pressure-awareness',
      streamId: 'local-stream-inward-low-pressure-awareness',
      metadata: {
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
          companionHeadlineLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionBriefingLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionNextClosureLine: 'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line.',
          awarenessLine: 'visibility=internal-structured',
          emotionalClosureCue: EXCLUDED_CONTINUITY_RESIDUE,
          reasonPreview: [
            EXCLUDED_CONTINUITY_RESIDUE,
            'quiet-companionship',
            'remaining-open=lipsync+voice',
          ],
        },
      } as any,
    })

    expect(startPayloads).toContainEqual(expect.objectContaining({
      intentId: 'local-intent-inward-low-pressure-awareness',
      streamId: 'local-stream-inward-low-pressure-awareness',
      metadata: expect.objectContaining({
        preDialogueAwareness: expect.objectContaining({
          companionHeadlineLine: null,
          companionBriefingLine: null,
          companionNextClosureLine: null,
          emotionalClosureCue: null,
          reasonPreview: expect.arrayContaining([
            'quiet-companionship',
            'remaining-open=lipsync+voice',
          ]),
        }),
      }),
    }))
    expectNoFixedTemplateResidue(startPayloads)
  })

  it('keeps anthropomorphic host-facing same-her closure visible in speech awareness when the briefing line is only the thinner same-phase carry', async () => {
    const startPayloads: Array<Record<string, unknown>> = []
    ;(speechBusModule as any).__testContext.on((speechBusModule as any).speechIntentStartEvent, (event: { body: unknown }) => {
      startPayloads.push(event.body as Record<string, unknown>)
    })

    const runtime = createSpeechPipelineRuntime()
    runtime.openIntent({
      intentId: 'local-intent-anthropomorphic-host-facing-awareness',
      streamId: 'local-stream-anthropomorphic-host-facing-awareness',
      metadata: {
        preDialogueAwareness: {
          status: 'grounded',
          summaryLine: 'The host-facing same-her closure is still open before speech widens outward.',
          companionHeadlineLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionBriefingLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionNextClosureLine: 'Keep the host-facing closure on one measured-return line until the same living carry is easier to observe directly.',
          awarenessLine: 'visibility=internal-structured',
          emotionalClosureCue: 'Let the host-facing closure stay lived-in and observable instead of reopening as a detached project shell.',
          reasonPreview: [
            'anthropomorphic emotional closure',
            EXCLUDED_CONTINUITY_RESIDUE,
            'measured-return',
          ],
        },
      } as any,
    })

    expect(startPayloads).toContainEqual(expect.objectContaining({
      intentId: 'local-intent-anthropomorphic-host-facing-awareness',
      streamId: 'local-stream-anthropomorphic-host-facing-awareness',
      metadata: expect.objectContaining({
        preDialogueAwareness: expect.objectContaining({
          companionHeadlineLine: null,
          companionBriefingLine: null,
          companionNextClosureLine: 'Keep the host-facing closure on one measured-return line until the same living carry is easier to observe directly.',
          emotionalClosureCue: 'Let the host-facing closure stay lived-in and observable instead of reopening as a detached project shell.',
          reasonPreview: expect.arrayContaining([
            'anthropomorphic emotional closure',
            'measured-return',
          ]),
        }),
      }),
    }))
  })

  it('rebuilds pre-dialogue awareness from project-state and closure carry when speech intent metadata crosses the runtime boundary without explicit awareness', async () => {
    const startPayloads: Array<Record<string, unknown>> = []
    ;(speechBusModule as any).__testContext.on((speechBusModule as any).speechIntentStartEvent, (event: { body: unknown }) => {
      startPayloads.push(event.body as Record<string, unknown>)
    })

    const runtime = createSpeechPipelineRuntime()
    runtime.openIntent({
      intentId: 'local-intent-closure-only-awareness-rebuild',
      streamId: 'local-stream-closure-only-awareness-rebuild',
      metadata: {
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project-state continuity already survives into the speech boundary before playback starts.',
          primaryOpenLoop: 'Speech-side openings still need to keep project identity, landed progress, and the unresolved same-her loop explicit before voice widens outward.',
          nextClosureTarget: EXCLUDED_CONTINUITY_RESIDUE,
          continuitySummary: 'same-her=Same Phase 1 digital life. landed=Project-state continuity already survives into the speech boundary before playback starts. open=Speech-side openings still need to keep project identity, landed progress, and the unresolved same-her loop explicit before voice widens outward.',
          sameHerSelfLine: EXCLUDED_CONTINUITY_RESIDUE,
          sameHerHoldDetail: EXCLUDED_CONTINUITY_RESIDUE,
          sameHerDriftRisk: EXCLUDED_CONTINUITY_RESIDUE,
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: EXCLUDED_CONTINUITY_RESIDUE,
          sameHerDriftRiskLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionBriefingLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionNextClosureLine: EXCLUDED_CONTINUITY_RESIDUE,
          emotionalClosureCue: EXCLUDED_CONTINUITY_RESIDUE,
          briefingLines: [
            'Identity: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            'Phase: Phase 1: Local Digital Life',
          ],
          reasons: [
            'Project-state continuity already survives into the speech boundary before playback starts.',
            EXCLUDED_CONTINUITY_RESIDUE,
          ],
        },
      } as any,
    })

    expect(startPayloads).toContainEqual(expect.objectContaining({
      intentId: 'local-intent-closure-only-awareness-rebuild',
      streamId: 'local-stream-closure-only-awareness-rebuild',
      metadata: expect.objectContaining({
        preDialogueAwareness: expect.objectContaining({
          summaryLine: null,
          companionBriefingLine: null,
          companionNextClosureLine: null,
          emotionalClosureCue: null,
          reasonPreview: expect.arrayContaining([
            'Project-state continuity already survives into the speech boundary before playback starts.',
          ]),
          awarenessLine: expect.stringContaining('landed=Project-state continuity already survives'),
        }),
      }),
    }))
    expectNoFixedTemplateResidue(startPayloads)
  })

  it('rebuilds pre-dialogue awareness from runtime-digest project state carry when speech intent metadata crosses the runtime boundary without explicit awareness', async () => {
    const startPayloads: Array<Record<string, unknown>> = []
    ;(speechBusModule as any).__testContext.on((speechBusModule as any).speechIntentStartEvent, (event: { body: unknown }) => {
      startPayloads.push(event.body as Record<string, unknown>)
    })

    const runtime = createSpeechPipelineRuntime()
    runtime.openIntent({
      intentId: 'local-intent-runtime-digest-awareness-rebuild',
      streamId: 'local-stream-runtime-digest-awareness-rebuild',
      metadata: {
        runtimeDigest: {
          version: 'alicization-runtime-digest-v1',
          dominantChannel: 'active-memory',
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Runtime-digest continuity already survives into the speech boundary before playback starts.',
            primaryOpenLoop: 'Speech-side openings still need to keep project identity, landed progress, and the unresolved same-her loop explicit before voice widens outward.',
            nextClosureTarget: EXCLUDED_CONTINUITY_RESIDUE,
            sameHerSelfLine: EXCLUDED_CONTINUITY_RESIDUE,
            sameHerHoldDetail: EXCLUDED_CONTINUITY_RESIDUE,
            sameHerDriftRisk: EXCLUDED_CONTINUITY_RESIDUE,
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'same-turn-if-invited',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          currentConsciousFrame: {
            reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
            focusAnchor: 'same callback line still alive before this spoken opening',
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'same-turn-if-invited',
          },
          emotionalClosureCue: EXCLUDED_CONTINUITY_RESIDUE,
          shouldProactivelySpeak: false,
          shouldProactivelyAct: false,
          continuityPressure: 0.67,
          companionshipPressure: 0.54,
          channels: [{
            id: 'active-memory',
            readiness: 0.83,
            state: 'hot',
            focus: 'same callback line still alive before this spoken opening',
            summary: 'active memory is carrying the callback line inward',
          }],
          summary: 'dominant=active-memory | closure=measured-return',
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: EXCLUDED_CONTINUITY_RESIDUE,
          sameHerDriftRiskLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionBriefingLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionNextClosureLine: EXCLUDED_CONTINUITY_RESIDUE,
          emotionalClosureCue: EXCLUDED_CONTINUITY_RESIDUE,
          briefingLines: [
            'Identity: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            'Phase: Phase 1: Local Digital Life',
          ],
          reasons: [
            'Runtime-digest continuity already survives into the speech boundary before playback starts.',
            EXCLUDED_CONTINUITY_RESIDUE,
          ],
        },
      } as any,
    })

    expect(startPayloads).toContainEqual(expect.objectContaining({
      intentId: 'local-intent-runtime-digest-awareness-rebuild',
      streamId: 'local-stream-runtime-digest-awareness-rebuild',
      metadata: expect.objectContaining({
        runtimeDigest: expect.objectContaining({
          projectState: expect.objectContaining({
            latestLandedProgress: 'Runtime-digest continuity already survives into the speech boundary before playback starts.',
            continuityPreferredTiming: 'same-turn-if-invited',
          }),
        }),
        preDialogueAwareness: expect.objectContaining({
          summaryLine: null,
          companionBriefingLine: null,
          companionNextClosureLine: null,
          emotionalClosureCue: null,
          reasonPreview: expect.arrayContaining([
            'Runtime-digest continuity already survives into the speech boundary before playback starts.',
          ]),
          awarenessLine: expect.stringContaining('landed=Runtime-digest continuity already survives'),
        }),
      }),
    }))
    expectNoFixedTemplateResidue(startPayloads)
  })

  it('keeps same-her voice rejoin metadata intact when an owner-canceled host intent resumes on the later callback line', async () => {
    const firstHostIntent = createIntentHandle('remote-intent-earlier-shell', 'remote-stream-earlier-shell', 'card-1')
    const secondHostIntent = createIntentHandle('remote-intent-later-line', 'remote-stream-later-line', 'card-1')
    const openIntent = vi
      .fn()
      .mockReturnValueOnce(firstHostIntent)
      .mockReturnValueOnce(secondHostIntent)
    const cancelOwner = vi.fn()
    const runtime = createSpeechPipelineRuntime()

    await runtime.registerHost({ openIntent, cancelOwner } as any)

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-intent-earlier-shell',
      streamId: 'remote-stream-earlier-shell',
      ownerId: 'card-1',
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-earlier-shell',
          rendererTarget: 'vrm',
          replyText: '先别急，我还在把这条线接回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'measured-return',
          },
          speechPlan: {
            segments: [{
              id: 'segment-earlier-shell',
              index: 0,
              text: '先别急，我还在把这条线接回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 220,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 220,
          },
          facePlan: {
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'observe_focus',
            actionBursts: [],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
          },
        },
        preDialogueAwareness: {
          status: 'partial',
          companionHeadlineLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionNextClosureLine: 'Keep memory, initiative, execution, and embodiment on one same-her line.',
          reasonPreview: [
            'same-segment face+motion+lipsync recovery@segment-earlier-shell',
          ],
        },
      },
    })

    runtime.cancelOwner('card-1', 'owner-canceled')

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-intent-later-line',
      streamId: 'remote-stream-later-line',
      ownerId: 'card-1',
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-later-line',
          rendererTarget: 'live2d',
          replyText: '我先顺着已经接住的身体线，把声音和口型也慢慢带回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'repair-before-closeness',
          },
          speechPlan: {
            segments: [{
              id: 'segment-later-line',
              index: 0,
              text: '我先顺着已经接住的身体线，把声音和口型也慢慢带回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 260,
              rendererHints: {
                residentMode: 'repair-before-closeness',
                preferredExpressionAliases: ['RecoverSoft'],
                preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 260,
          },
          facePlan: {
            postUtteranceCue: 'soft-release',
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
          },
        },
        preDialogueAwareness: {
          status: 'partial',
          companionHeadlineLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionNextClosureLine: 'Let lipsync and voice rejoin the already-reformed body, face, and motion line.',
          awarenessLine: 'visibility=internal-structured',
          reasonPreview: [
            'same-segment face+motion+body recovery@segment-later-line',
            'remaining-open=lipsync+voice',
          ],
        },
      },
    })

    expect(cancelOwner).toHaveBeenCalledWith('card-1', 'owner-canceled')
    expect(openIntent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      intentId: 'remote-intent-later-line',
      streamId: 'remote-stream-later-line',
      ownerId: 'card-1',
      metadata: expect.objectContaining({
        embodimentScript: expect.objectContaining({
          turnId: 'turn-later-line',
          rendererTarget: 'live2d',
          state: expect.objectContaining({
            residentMode: 'repair-before-closeness',
          }),
        }),
        preDialogueAwareness: expect.objectContaining({
          companionHeadlineLine: null,
          companionNextClosureLine: null,
          reasonPreview: expect.arrayContaining([
            'same-segment face+motion+body recovery@segment-later-line',
            'remaining-open=lipsync+voice',
          ]),
        }),
      }),
    }))
    expectNoFixedTemplateResidue(openIntent.mock.calls[1]?.[0])
  })

  it('does not reopen a metadata-less fallback host intent while same-her voice rejoin tokens continue flowing on an already-started later line', async () => {
    const hostIntent = createIntentHandle('remote-intent-later-line', 'remote-stream-later-line', 'card-1')
    const openIntent = vi.fn(() => hostIntent)
    const runtime = createSpeechPipelineRuntime()

    await runtime.registerHost({ openIntent } as any)

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentStartEvent, {
      originId: 'external-origin',
      intentId: 'remote-intent-later-line',
      streamId: 'remote-stream-later-line',
      ownerId: 'card-1',
      metadata: {
        embodimentScript: {
          version: 'embodiment-script-v1',
          turnId: 'turn-later-line',
          rendererTarget: 'live2d',
          replyText: '我先顺着已经接住的身体线，把声音和口型也慢慢带回来。',
          state: {
            baseEmotion: 'thinking',
            delivery: 'gentle',
            emphasis: 0,
            residentMode: 'repair-before-closeness',
          },
          speechPlan: {
            segments: [{
              id: 'segment-later-line',
              index: 0,
              text: '我先顺着已经接住的身体线，把声音和口型也慢慢带回来。',
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 260,
            }],
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 260,
          },
          facePlan: {
            postUtteranceCue: 'soft-release',
            speakingCues: [],
          },
          motionPlan: {
            idleBase: 'idle_settle',
            actionBursts: [],
            attentionMode: 'attentive',
          },
          lipsyncPlan: {
            mode: 'energy-phoneme-hybrid',
          },
        },
        preDialogueAwareness: {
          status: 'partial',
          companionHeadlineLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionNextClosureLine: 'Let lipsync and voice rejoin the already-reformed body, face, and motion line.',
          reasonPreview: [
            'same-segment face+motion+body recovery@segment-later-line',
            'remaining-open=lipsync+voice',
          ],
        },
      } as any,
    })

    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentLiteralEvent, {
      originId: 'external-origin',
      intentId: 'remote-intent-later-line',
      streamId: 'remote-stream-later-line',
      sequence: 0,
      value: '我先顺着已经接住的身体线，',
    })
    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentFlushEvent, {
      originId: 'external-origin',
      intentId: 'remote-intent-later-line',
      streamId: 'remote-stream-later-line',
      sequence: 1,
    })
    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentLiteralEvent, {
      originId: 'external-origin',
      intentId: 'remote-intent-later-line',
      streamId: 'remote-stream-later-line',
      sequence: 2,
      value: '把声音和口型也慢慢带回来。',
    })
    ;(speechBusModule as any).__testContext.emit((speechBusModule as any).speechIntentEndEvent, {
      originId: 'external-origin',
      intentId: 'remote-intent-later-line',
      streamId: 'remote-stream-later-line',
    })

    expect(openIntent).toHaveBeenCalledTimes(1)
    expect(openIntent).toHaveBeenCalledWith(expect.objectContaining({
      intentId: 'remote-intent-later-line',
      metadata: expect.objectContaining({
        preDialogueAwareness: expect.objectContaining({
          companionNextClosureLine: null,
        }),
      }),
    }))
    expectNoFixedTemplateResidue((openIntent.mock.calls as any)[0]?.[0])
    expect(hostIntent.writeLiteral).toHaveBeenNthCalledWith(1, '我先顺着已经接住的身体线，')
    expect(hostIntent.writeFlush).toHaveBeenCalledTimes(1)
    expect(hostIntent.writeLiteral).toHaveBeenNthCalledWith(2, '把声音和口型也慢慢带回来。')
    expect(hostIntent.end).toHaveBeenCalledTimes(1)
  })

  it('rebuilds same-her awareness for token-driven fallback host intents when the host misses the original start event but later receives the continuing token stream', async () => {
    const receiverHostIntent = createIntentHandle('late-host-intent-continuity-rejoin', 'late-host-stream-continuity-rejoin', 'card-1')
    const receiverOpenIntent = vi.fn(() => receiverHostIntent)
    const senderRuntime = createSpeechPipelineRuntime()
    const receiverRuntime = createSpeechPipelineRuntime()

    const senderIntent = senderRuntime.openIntent({
      intentId: 'late-host-intent-continuity-rejoin',
      streamId: 'late-host-stream-continuity-rejoin',
      ownerId: 'card-1',
      metadata: {
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Body, face, and motion already rejoined before the voice-side stream continues.',
          primaryOpenLoop: 'Voice-side token recovery still needs project identity, landed progress, and unresolved same-her closure to stay explicit before speech widens outward.',
          nextClosureTarget: EXCLUDED_CONTINUITY_RESIDUE,
          sameHerSelfLine: EXCLUDED_CONTINUITY_RESIDUE,
          sameHerHoldDetail: EXCLUDED_CONTINUITY_RESIDUE,
          continuitySummary: 'same-her=Same Phase 1 digital life. landed=Body, face, and motion already rejoined before the voice-side stream continues. open=Voice-side token recovery still needs project identity, landed progress, and unresolved same-her closure to stay explicit before speech widens outward.',
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionBriefingLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionNextClosureLine: EXCLUDED_CONTINUITY_RESIDUE,
          emotionalClosureCue: EXCLUDED_CONTINUITY_RESIDUE,
          reasons: [
            'Body, face, and motion already rejoined before the voice-side stream continues.',
            EXCLUDED_CONTINUITY_RESIDUE,
          ],
          briefingLines: [
            'Identity: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            'Phase: Phase 1: Local Digital Life',
          ],
        },
      } as any,
    })

    await receiverRuntime.registerHost({ openIntent: receiverOpenIntent } as any)

    senderIntent.writeLiteral('我先沿着已经接住的身体线，')
    senderIntent.writeFlush()
    senderIntent.writeLiteral('把声音和口型也慢慢带回来。')
    senderIntent.end()

    expect(receiverOpenIntent).toHaveBeenCalledTimes(1)
    expect(receiverOpenIntent).toHaveBeenCalledWith(expect.objectContaining({
      intentId: 'late-host-intent-continuity-rejoin',
      streamId: 'late-host-stream-continuity-rejoin',
      metadata: expect.objectContaining({
        preDialogueAwareness: expect.objectContaining({
          summaryLine: null,
          companionBriefingLine: null,
          companionNextClosureLine: null,
          emotionalClosureCue: null,
          reasonPreview: expect.arrayContaining([
            'Body, face, and motion already rejoined before the voice-side stream continues.',
          ]),
          awarenessLine: expect.stringContaining('landed=Body, face, and motion already rejoined'),
        }),
      }),
    }))
    expectNoFixedTemplateResidue((receiverOpenIntent.mock.calls as any)[0]?.[0])
    expect(receiverHostIntent.writeLiteral).toHaveBeenNthCalledWith(1, '我先沿着已经接住的身体线，')
    expect(receiverHostIntent.writeFlush).toHaveBeenCalledTimes(1)
    expect(receiverHostIntent.writeLiteral).toHaveBeenNthCalledWith(2, '把声音和口型也慢慢带回来。')
    expect(receiverHostIntent.end).toHaveBeenCalledTimes(1)
  })

  it('replays owner and interruption authority when the host rebuilds a missed-start intent from continuing remote tokens', async () => {
    const openedOptions: Array<Record<string, unknown> | undefined> = []
    const receiverHostIntents: Array<ReturnType<typeof createIntentHandle>> = []
    const receiverOpenIntent = vi.fn((options?: Record<string, unknown>) => {
      openedOptions.push(options)
      const handle = {
        ...createIntentHandle(
          String(options?.intentId ?? 'late-host-governed-intent'),
          String(options?.streamId ?? 'late-host-governed-stream'),
          typeof options?.ownerId === 'string' ? options.ownerId : undefined,
        ),
        priority: typeof options?.priority === 'number' ? options.priority : 0,
      }
      receiverHostIntents.push(handle)
      return handle
    })
    const senderRuntime = createSpeechPipelineRuntime()
    const receiverRuntime = createSpeechPipelineRuntime()

    const senderIntent = senderRuntime.openIntent({
      intentId: 'late-host-governed-intent',
      streamId: 'late-host-governed-stream',
      ownerId: 'card-voice-rejoin',
      priority: 7,
      behavior: 'interrupt',
      metadata: {
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Body, face, and motion already rejoined before the governed voice-side stream continues.',
          primaryOpenLoop: 'The recovered voice line still needs interruption-safe same-her authority before speech widens outward.',
          nextClosureTarget: EXCLUDED_CONTINUITY_RESIDUE,
          sameHerSelfLine: EXCLUDED_CONTINUITY_RESIDUE,
          sameHerHoldDetail: EXCLUDED_CONTINUITY_RESIDUE,
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: 'Recovered governed voice-side closure is still open before this turn finishes speaking outward.',
          companionBriefingLine: EXCLUDED_CONTINUITY_RESIDUE,
          companionNextClosureLine: EXCLUDED_CONTINUITY_RESIDUE,
          emotionalClosureCue: EXCLUDED_CONTINUITY_RESIDUE,
          reasons: [
            'Body, face, and motion already rejoined before the governed voice-side stream continues.',
          ],
        },
      } as any,
    })

    await receiverRuntime.registerHost({ openIntent: receiverOpenIntent } as any)

    senderIntent.writeLiteral('我先沿着已经接住的身体线，')
    senderIntent.end()

    expect(receiverOpenIntent).toHaveBeenCalledTimes(1)
    expect(openedOptions[0]).toEqual(expect.objectContaining({
      intentId: 'late-host-governed-intent',
      streamId: 'late-host-governed-stream',
      ownerId: 'card-voice-rejoin',
      priority: 7,
      behavior: 'interrupt',
      metadata: expect.objectContaining({
        preDialogueAwareness: expect.objectContaining({
          companionBriefingLine: null,
          companionNextClosureLine: null,
        }),
      }),
    }))
    expect(receiverHostIntents[0]?.ownerId).toBe('card-voice-rejoin')
    expect(receiverHostIntents[0]?.priority).toBe(7)
    expect(receiverHostIntents[0]?.writeLiteral).toHaveBeenCalledWith('我先沿着已经接住的身体线，')
    expect(receiverHostIntents[0]?.end).toHaveBeenCalledTimes(1)
  })
})
