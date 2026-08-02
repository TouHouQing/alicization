import type { IntentHandle, IntentOptions } from '@proj-alicization/pipelines-audio'

import { readFileSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import {
  attachFallbackDialogueMetadataToSpeechMetadata,
  attachRuntimeDigestToSpeechMetadata,
  attachSpeechSynthesisToSpeechMetadata,
  createStageChatIntentBridge,
} from './stage-chat-intent-bridge'

function createIntentHandle(label: string) {
  return {
    intentId: `intent-${label}`,
    streamId: `stream-${label}`,
    priority: 0,
    ownerId: 'card-1',
    writeLiteral: vi.fn(),
    writeSpecial: vi.fn(),
    writeFlush: vi.fn(),
    end: vi.fn(),
    cancel: vi.fn(),
    stream: new ReadableStream(),
  } satisfies IntentHandle
}

function buildRuntimeDigest() {
  return {
    version: 'alicization-runtime-digest-v1',
    dominantChannel: 'active-memory',
    activeLoop: {
      version: 'alicization-active-loop-v1',
      phase: 'dialogue',
      dominantChannel: 'active-memory',
      handoffTarget: 'active-dialogue',
      dialogueReady: true,
      controlReady: false,
      memoryCarry: true,
      companionshipReady: true,
      observationHeavy: false,
      initiativeBudget: 0.6,
      coherence: 0.9,
      summary: 'phase=dialogue | dominant=active-memory | handoff=active-dialogue',
    },
    currentConsciousFrame: {
      reasonTags: ['working-memory', 'long-term-recall'],
      focusAnchor: '当前用户问题',
      consciousNeed: '回答当前问题',
      speakingIntention: '基于记忆自然回应',
    },
    shouldProactivelySpeak: true,
    shouldProactivelyAct: false,
    continuityPressure: 0.7,
    companionshipPressure: 0.6,
    channels: [{
      id: 'active-memory',
      readiness: 0.85,
      state: 'hot',
      focus: '当前短期记忆与长期召回',
      summary: 'working-memory and long-term recall are available',
    }],
    summary: 'dominant=active-memory | speak=true | act=false',
  } as any
}

describe('stage chat intent bridge', () => {
  it('does not maintain a legacy metadata-key denylist', () => {
    const source = readFileSync(new URL('./stage-chat-intent-bridge.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('legacySpeechGovernanceKeys')
    expect(source).not.toContain('isLegacySpeechGovernanceKey')
  })

  it('merges current runtime, memory, and embodiment facts', () => {
    const metadata = attachFallbackDialogueMetadataToSpeechMetadata({
      source: 'stage',
      intentSource: 'chat',
      runtimeDigest: buildRuntimeDigest(),
    }, {
      runtimeDigest: {
        ...buildRuntimeDigest(),
        summary: 'provider-authored runtime digest',
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-memory-facts',
      },
    } as any)

    expect(metadata).toEqual(expect.objectContaining({
      source: 'stage',
      intentSource: 'chat',
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-memory-facts',
      },
      runtimeDigest: expect.objectContaining({
        dominantChannel: 'active-memory',
        currentConsciousFrame: expect.objectContaining({
          focusAnchor: '当前用户问题',
        }),
      }),
    }))
  })

  it('does not let a longer sparse digest win runtime digest selection', () => {
    const metadata = attachFallbackDialogueMetadataToSpeechMetadata({
      source: 'stage',
      runtimeDigest: buildRuntimeDigest(),
    }, {
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.1,
        companionshipPressure: 0.1,
        channels: [],
        summary: 'dominant=active-memory | speak=false | act=false',
      },
    } as any)

    expect((metadata?.runtimeDigest as any)?.activeLoop?.phase).toBe('dialogue')
    expect((metadata?.runtimeDigest as any)?.currentConsciousFrame?.focusAnchor)
      .toBe('当前用户问题')
  })

  it('preserves cleaned derived memory identity', () => {
    const memoryIdentity = {
      selectedCandidateIds: ['memory-candidate-1'],
      continuityKey: 'corrected-callback-memory',
      reasonTags: ['memory-identity:corrected-callback-memory'],
    }
    const memoryClosureCausality = {
      causalSource: 'memory-closure-trace',
      affectedLane: 'embodiment',
      causedByMemoryClosure: true,
      traceAuthority: 'runtime-memory-closure-trace',
      reasonTags: ['memory-closure-trace:next-influence'],
      memoryIdentity,
      summary: 'cleaned recalled memory drives the next embodiment state',
    }
    const metadata = attachRuntimeDigestToSpeechMetadata(null, {
      ...buildRuntimeDigest(),
      derivedMindStateBundle: {
        version: 'derived-mind-state-bundle-v1',
        source: 'main-runtime',
        producedAt: 1,
        summary: 'cleaned memory identity',
        embodimentContinuityLedger: {
          version: 'embodiment-continuity-ledger-v1',
          createdAt: 1,
          turnId: 'turn-memory-identity',
          carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
          droppedLanes: [],
          rejoinedLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
          pendingRejoinLanes: [],
          continuityPhase: 'fully-rejoined',
          memoryWriteback: {
            shouldWrite: false,
            lane: 'none',
            reason: 'memory identity already comes from recall evidence',
          },
          traceSummary: 'cleaned recalled memory drives the next embodiment state',
          replayLine: 'body state follows recalled memory evidence',
          sourceTags: ['memory-closure-causality'],
          memoryClosureCausality,
        },
      },
    })

    expect(
      (metadata?.runtimeDigest as any)?.derivedMindStateBundle?.embodimentContinuityLedger?.memoryClosureCausality?.memoryIdentity,
    ).toEqual(memoryIdentity)
  })

  it('merges current speech synthesis values without dropping provider and voice facts', () => {
    const metadata = attachSpeechSynthesisToSpeechMetadata({
      source: 'stage',
      speechSynthesis: {
        provider: 'openai-compatible-audio-speech',
        model: 'tts-1',
        pitchDelta: 5,
        rateMultiplier: 1.08,
        voice: {
          id: 'alloy',
          name: 'alloy',
        },
      },
    }, {
      pitchDelta: -2,
      rateMultiplier: 0.94,
    })

    expect(metadata?.speechSynthesis).toEqual({
      provider: 'openai-compatible-audio-speech',
      model: 'tts-1',
      pitchDelta: -2,
      rateMultiplier: 0.94,
      voice: {
        id: 'alloy',
        name: 'alloy',
      },
    })
  })

  it('reopens a prepared intent with cleaned runtime metadata before token output', () => {
    const openCalls: Array<IntentOptions | undefined> = []
    const handles: IntentHandle[] = []
    const bridge = createStageChatIntentBridge({
      openIntent(options) {
        openCalls.push(options)
        const handle = createIntentHandle(String(openCalls.length))
        handles.push(handle)
        return handle
      },
    })

    bridge.prepare({
      ownerId: 'card-1',
      priority: 'normal',
      behavior: 'queue',
      metadata: {
        source: 'stage',
        intentSource: 'chat',
      },
    })
    bridge.attachRuntimeMetadata({
      runtimeDigest: {
        ...buildRuntimeDigest(),
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-runtime-upgrade',
      },
    })
    bridge.writeLiteral('你好')

    expect(openCalls).toHaveLength(2)
    expect(openCalls[1]?.metadata).toEqual(expect.objectContaining({
      source: 'stage',
      intentSource: 'chat',
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-runtime-upgrade',
      },
      runtimeDigest: expect.objectContaining({
        dominantChannel: 'active-memory',
      }),
    }))
    expect(handles[0]?.cancel).toHaveBeenCalledWith('metadata-upgrade')
    expect(handles[1]?.writeLiteral).toHaveBeenCalledWith('你好')
  })

  it('does not reopen the intent after token output starts', () => {
    const openCalls: Array<IntentOptions | undefined> = []
    const handles: IntentHandle[] = []
    const bridge = createStageChatIntentBridge({
      openIntent(options) {
        openCalls.push(options)
        const handle = createIntentHandle(String(openCalls.length))
        handles.push(handle)
        return handle
      },
    })

    bridge.prepare({
      ownerId: 'card-1',
      priority: 'normal',
      behavior: 'queue',
      metadata: {
        source: 'stage',
      },
    })
    bridge.writeLiteral('先说一句')
    bridge.attachRuntimeMetadata({
      runtimeDigest: buildRuntimeDigest(),
    })

    expect(openCalls).toHaveLength(1)
    expect(handles[0]?.cancel).not.toHaveBeenCalled()
    expect(handles[0]?.writeLiteral).toHaveBeenCalledWith('先说一句')
  })
})
