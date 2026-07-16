import type { IntentHandle, IntentOptions } from '@proj-alicization/pipelines-audio'

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import {
  attachFallbackDialogueMetadataToSpeechMetadata,
  createStageChatIntentBridge,
} from './stage-chat-intent-bridge'

type LegacySpeechMetadata = Record<string, unknown> & {
  preDialogueSendIdentity?: unknown
  preDialogueAwareness?: unknown
  preDialogueClosure?: unknown
}

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

function expectNoFixedTemplateResidue(value: unknown) {
  const serialized = JSON.stringify(value ?? '')
  expect(containsAlicizationFixedTemplateResidue(serialized), serialized).toBe(false)
}

function expectNoLegacyPreDialogueMetadata(value: unknown) {
  const pending = [value]
  while (pending.length > 0) {
    const current = pending.pop()
    if (!current || typeof current !== 'object')
      continue
    if (Array.isArray(current)) {
      pending.push(...current)
      continue
    }

    const record = current as Record<string, unknown>
    for (const key of Object.keys(record)) {
      expect(key).not.toBe('preDialogueSendIdentity')
      expect(key).not.toBe('preDialogueAwareness')
      expect(key).not.toBe('preDialogueClosure')
      expect(key).not.toBe('visibleReplyRealization')
      expect(key.startsWith('companion')).toBe(false)
      expect(key.startsWith('sameHer')).toBe(false)
      expect(key.startsWith('emotionalClosure')).toBe(false)
      expect(key.startsWith('proactiveSameHer')).toBe(false)
    }
    pending.push(...Object.values(record))
  }
}

describe('stage chat intent bridge', () => {
  it('drops legacy pre-dialogue metadata while preserving real runtime and embodiment facts', () => {
    const metadata = attachFallbackDialogueMetadataToSpeechMetadata({
      source: 'stage',
      intentSource: 'chat',
      projectState: {
        latestLandedProgress: 'Voice playback is using the current runtime digest.',
        companionExperimentalCue: 'legacy companion cue',
      },
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        currentConsciousFrame: {
          reasonTags: ['runtime-fact'],
          focusAnchor: 'the current spoken turn',
        },
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.4,
        companionshipPressure: 0.5,
        projectState: {
          latestLandedProgress: 'The current turn has a saved runtime fact.',
          sameHerExperimentalCue: 'legacy runtime cue',
        },
        channels: [],
        summary: 'current runtime fact',
      },
      visibleReplyRealization: {
        projectStateAudit: {
          summary: 'legacy visible reply audit',
        },
      },
      preDialogueSendIdentity: { summaryLine: 'legacy identity input' },
      preDialogueAwareness: { awarenessLine: 'legacy awareness input' },
      preDialogueClosure: { summaryLine: 'legacy closure input' },
    } satisfies LegacySpeechMetadata, {
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-real-runtime-facts',
      },
      preDialogueSendIdentity: { summaryLine: 'legacy fallback identity' },
      preDialogueAwareness: { awarenessLine: 'legacy fallback awareness' },
      preDialogueClosure: { summaryLine: 'legacy fallback closure' },
    } satisfies LegacySpeechMetadata)

    expect(metadata).toEqual(expect.objectContaining({
      source: 'stage',
      intentSource: 'chat',
      projectState: expect.objectContaining({
        latestLandedProgress: 'Voice playback is using the current runtime digest.',
      }),
      runtimeDigest: expect.objectContaining({
        currentConsciousFrame: expect.objectContaining({
          focusAnchor: 'the current spoken turn',
        }),
      }),
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-real-runtime-facts',
      },
    }))
    expectNoLegacyPreDialogueMetadata(metadata)
  })

  it('drops legacy pre-dialogue metadata before opening a prepared speech intent', () => {
    const openIntent = vi.fn((_options?: IntentOptions) => createIntentHandle('legacy-prepare'))
    const bridge = createStageChatIntentBridge({ openIntent })

    bridge.prepare({
      ownerId: 'card-1',
      priority: 'normal',
      behavior: 'queue',
      metadata: {
        source: 'stage',
        intentSource: 'chat',
        runtimeDigest: {
          version: 'alicization-runtime-digest-v1',
          dominantChannel: 'active-memory',
          shouldProactivelySpeak: false,
          shouldProactivelyAct: false,
          continuityPressure: 0.4,
          companionshipPressure: 0.5,
          channels: [],
          summary: 'current runtime fact',
        },
        preDialogueSendIdentity: { summaryLine: 'legacy identity input' },
        preDialogueAwareness: { awarenessLine: 'legacy awareness input' },
        preDialogueClosure: { summaryLine: 'legacy closure input' },
      } satisfies LegacySpeechMetadata,
    })

    expect(openIntent).toHaveBeenCalledOnce()
    expect(openIntent.mock.calls[0]?.[0]?.metadata).toEqual(expect.objectContaining({
      source: 'stage',
      intentSource: 'chat',
      runtimeDigest: expect.objectContaining({
        summary: 'current runtime fact',
      }),
    }))
    expectNoLegacyPreDialogueMetadata(openIntent.mock.calls[0]?.[0]?.metadata)
  })

  it('preserves fallback project-state and embodiment facts without legacy pre-dialogue metadata', () => {
    const metadata = attachFallbackDialogueMetadataToSpeechMetadata({
      source: 'stage',
      intentSource: 'fallback',
    }, {
      projectState: {
        identity: 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Fallback speech openings already keep the same project and embodiment repair line explicit before playback starts.',
        primaryOpenLoop: 'Voice-side fallback openings still need to keep project identity, landed progress, and unresolved embodiment closure explicit before voice widens outward.',
        nextClosureTarget: 'Keep fallback voice openings on one identity-continuity',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerHoldDetail: 'pre_turn_context_digest',
      },
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'Fallback speech-side identity-continuity',
        companionBriefingLine: 'pre_turn_context_digest',
        companionNextClosureLine: 'Keep fallback voice openings on one identity-continuity',
        briefingLines: [
          'Identity: Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
          'Phase: Phase 1: Local Digital Life',
        ],
        reasons: [
          'Fallback voice opening still needs the unresolved embodiment closure to remain explicit.',
        ],
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-fallback-voice-project-awareness',
      },
    } as any)

    expect(metadata).toEqual(expect.objectContaining({
      source: 'stage',
      intentSource: 'fallback',
      projectState: expect.objectContaining({
        latestLandedProgress: 'Fallback speech openings already keep the same project and embodiment repair line explicit before playback starts.',
        primaryOpenLoop: 'Voice-side fallback openings still need to keep project identity, landed progress, and unresolved embodiment closure explicit before voice widens outward.',
      }),
      embodimentScript: expect.objectContaining({
        version: 'embodiment-script-v1',
        turnId: 'turn-fallback-voice-project-awareness',
      }),
    }))
    expect((metadata as any)?.projectState?.identity).toBeUndefined()
    expect((metadata as any)?.projectState?.sameHerHoldDetail).toBeUndefined()
    expectNoLegacyPreDialogueMetadata(metadata)
    expectNoFixedTemplateResidue(metadata)
  })

  it('preserves richer runtime digest authority when fallback metadata only brings a thinner runtime shell', () => {
    const richerIdentity = 'Runtime memory authority is carrying the corrected callback thread.'
    const richerPhase = 'desktop-runtime-quality-gate'
    const richerCallbackHoldDetail = 'callback_hold=measured_return; pressure=low; evidence=current_turn_runtime'
    const richerNextClosureTarget = 'Rejoin voice and lipsync after the callback evidence stays grounded in runtime memory.'
    const richerEmotionalClosureCue = 'return_pressure=low; room=more; reopen_from_scratch=false'

    const metadata = attachFallbackDialogueMetadataToSpeechMetadata({
      source: 'stage',
      intentSource: 'fallback',
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        projectState: {
          identity: richerIdentity,
          currentPhase: richerPhase,
          latestLandedProgress: 'Renderer authority already knows what this project is before fallback speech opens.',
          primaryOpenLoop: 'Fallback voice still needs the runtime memory cue before it widens outward.',
          nextClosureTarget: richerNextClosureTarget,
          sameHerSelfLine: 'runtime_callback_self_line=corrected_callback_memory',
          sameHerHoldDetail: richerCallbackHoldDetail,
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'same-turn-if-invited',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        currentConsciousFrame: {
          reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
          focusAnchor: 'same callback line still alive before fallback voice opens',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'same-turn-if-invited',
        },
        emotionalClosureCue: richerEmotionalClosureCue,
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.68,
        companionshipPressure: 0.57,
        channels: [{
          id: 'active-memory',
          readiness: 0.82,
          state: 'hot',
          focus: 'same callback line still alive before fallback voice opens',
          summary: 'active memory is carrying the callback line inward',
        }],
        summary: 'dominant=active-memory | closure=measured-return',
      },
    } as any, {
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        projectState: {
          identity: 'Project continuity is active.',
          currentPhase: 'Phase 1',
          latestLandedProgress: 'project continuity exists',
          primaryOpenLoop: 'project continuity still needs closure',
          nextClosureTarget: 'Carry project continuity forward.',
          sameHerHoldDetail: 'structured continuity digest.',
        },
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.22,
        companionshipPressure: 0.21,
        channels: [{
          id: 'active-memory',
          readiness: 0.41,
          state: 'warm',
          focus: 'generic runtime shell',
          summary: 'generic runtime shell',
        }],
        summary: 'generic runtime shell',
      },
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'Fallback speech-side identity-continuity',
        companionBriefingLine: richerCallbackHoldDetail,
        companionNextClosureLine: richerNextClosureTarget,
        emotionalClosureCue: richerEmotionalClosureCue,
        reasons: [
          'Fallback voice opening still needs the unresolved embodiment closure to remain explicit.',
        ],
      },
    } as any)

    expect((metadata as any)?.runtimeDigest).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        identity: richerIdentity,
        currentPhase: richerPhase,
        latestLandedProgress: 'Renderer authority already knows what this project is before fallback speech opens.',
        nextClosureTarget: richerNextClosureTarget,
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'same-turn-if-invited',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      }),
      currentConsciousFrame: expect.objectContaining({
        focusAnchor: 'same callback line still alive before fallback voice opens',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'same-turn-if-invited',
      }),
    }))
    expect((metadata as any)?.runtimeDigest).not.toHaveProperty('emotionalClosureCue')
    expect((metadata as any)?.runtimeDigest?.projectState?.identity).not.toBe('Project continuity is active.')
    expect((metadata as any)?.runtimeDigest?.projectState?.latestLandedProgress).not.toBe('project continuity exists')
    expectNoLegacyPreDialogueMetadata(metadata)
    expectNoFixedTemplateResidue(metadata)
  })

  it('preserves memory closure identity when fallback runtime metadata has richer project wording but no derived bundle', () => {
    const memoryIdentity = {
      selectedCandidateIds: ['memory-candidate-corrected-callback'],
      continuityKey: 'corrected-callback-memory-runtime-reconsolidation',
      reasonTags: ['memory-identity:corrected-callback-memory-runtime-reconsolidation'],
    }
    const existingMemoryClosureCausality = {
      causalSource: 'memory-closure-trace',
      affectedLane: 'embodiment',
      causedByMemoryClosure: true,
      traceAuthority: 'runtime-memory-closure-trace',
      reasonTags: ['memory-closure-trace:next-influence'],
      memoryIdentity,
      summary: 'same corrected callback memory drives the body line',
    }

    const metadata = attachFallbackDialogueMetadataToSpeechMetadata({
      source: 'stage',
      intentSource: 'chat',
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.74,
        companionshipPressure: 0.61,
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 1_234,
          summary: 'existing runtime digest carries concrete memory identity',
          embodimentContinuityLedger: {
            version: 'embodiment-continuity-ledger-v1',
            createdAt: 1_234,
            turnId: 'turn-corrected-callback-memory',
            carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
            droppedLanes: [],
            rejoinedLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
            pendingRejoinLanes: [],
            continuityPhase: 'fully-rejoined',
            memoryWriteback: {
              shouldWrite: false,
              lane: 'none',
              reason: 'memory identity already comes from closure causality',
            },
            selfRevisionCandidate: {
              shouldPropose: false,
              domain: 'dialogue-style',
              reasonCodes: [],
              summary: null,
            },
            traceSummary: 'same corrected callback memory drives the body line',
            replayLine: 'body line follows the corrected callback memory',
            sourceTags: ['memory-closure-causality'],
            memoryClosureCausality: existingMemoryClosureCausality,
          },
        },
        projectState: {
          sameHerSelfLine: 'structured continuity digest.',
        },
        summary: 'existing runtime digest carries concrete memory identity',
      },
    } as any, {
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.76,
        companionshipPressure: 0.66,
        projectState: {
          identity: 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Fallback metadata has richer project wording but no memory identity.',
          primaryOpenLoop: 'Speech metadata must not drop the concrete corrected callback memory identity.',
          nextClosureTarget: 'Keep the same corrected callback memory visible through voice and body.',
          sameHerSelfLine: 'structured continuity digest.',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        },
        summary: 'fallback runtime digest carries project wording only',
      },
    } as any)

    expect((metadata as any)?.runtimeDigest?.derivedMindStateBundle?.embodimentContinuityLedger?.memoryClosureCausality?.memoryIdentity)
      .toEqual(memoryIdentity)
  })

  it('does not let thinner fallback facts overwrite richer existing speech facts', () => {
    const richerIdentity = 'The active speech turn refers to the corrected callback memory.'
    const richerPhase = 'voice-playback-check'
    const richerLandedProgress = 'The corrected callback result is saved with its source evidence.'
    const richerOpenLoop = 'Audio playback has not started yet.'
    const richerNextClosureTarget = 'Start playback after the voice settings are ready.'

    const metadata = attachFallbackDialogueMetadataToSpeechMetadata({
      source: 'stage',
      intentSource: 'fallback',
      projectState: {
        identity: richerIdentity,
        currentPhase: richerPhase,
        latestLandedProgress: richerLandedProgress,
        primaryOpenLoop: richerOpenLoop,
        nextClosureTarget: richerNextClosureTarget,
        sourceLabel: 'saved-callback-memory',
      },
    } as any, {
      projectState: {
        identity: 'Callback memory exists.',
        currentPhase: 'voice-check',
        latestLandedProgress: 'A result exists.',
        primaryOpenLoop: 'Playback is pending.',
        nextClosureTarget: 'Continue playback.',
      },
    } as any)

    expect(metadata).toEqual(expect.objectContaining({
      source: 'stage',
      intentSource: 'fallback',
      projectState: expect.objectContaining({
        identity: richerIdentity,
        currentPhase: richerPhase,
        latestLandedProgress: richerLandedProgress,
        primaryOpenLoop: richerOpenLoop,
        nextClosureTarget: richerNextClosureTarget,
        sourceLabel: 'saved-callback-memory',
      }),
    }))
    expect((metadata as any)?.projectState?.identity).not.toBe('Callback memory exists.')
    expect((metadata as any)?.projectState?.latestLandedProgress).not.toBe('A result exists.')
    expect((metadata as any)?.projectState?.primaryOpenLoop).not.toBe('Playback is pending.')
    expect((metadata as any)?.projectState?.nextClosureTarget).not.toBe('Continue playback.')
    expectNoLegacyPreDialogueMetadata(metadata)
    expectNoFixedTemplateResidue(metadata)
  })

  it('drops legacy fallback speech summaries on the same speech boundary', () => {
    const richerEmbodimentSummary = 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the identity-continuity'

    const metadata = attachFallbackDialogueMetadataToSpeechMetadata({
      source: 'stage',
      intentSource: 'fallback',
      preDialogueClosure: {
        status: 'partial',
        summaryLine: richerEmbodimentSummary,
      },
    } as any, {
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'Fallback speech-side identity-continuity',
        companionBriefingLine: 'pre_turn_context_digest',
        companionNextClosureLine: 'Keep fallback voice openings on one identity-continuity',
        reasons: [
          'Fallback voice opening still needs the unresolved embodiment closure to remain explicit.',
        ],
      },
    } as any)

    expect(metadata).toEqual({
      source: 'stage',
      intentSource: 'fallback',
    })
    expectNoLegacyPreDialogueMetadata(metadata)
    expectNoFixedTemplateResidue(metadata)
  })

  it('reopens a prepared chat intent with embodiment script metadata before the first token is written', () => {
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

    bridge.attachEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-1',
    })
    bridge.writeLiteral('你好')

    expect(openCalls).toHaveLength(2)
    expect(openCalls[1]?.metadata).toEqual({
      source: 'stage',
      intentSource: 'chat',
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-1',
      },
    })
    expect(handles[0]?.cancel).toHaveBeenCalledWith('metadata-upgrade')
    expect(handles[0]?.writeLiteral).not.toHaveBeenCalled()
    expect(handles[1]?.writeLiteral).toHaveBeenCalledWith('你好')
  })

  it('reopens a prepared chat intent with current-turn runtime digest authority before the first token is written', () => {
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
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        projectState: {
          identity: 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Current-turn runtime authority already knows what this project is before the spoken opening lands.',
          primaryOpenLoop: 'Speech-side opening still needs to keep the current identity-continuity',
          nextClosureTarget: 'Keep the spoken opening on one identity-continuity',
          sameHerSelfLine: 'structured continuity digest.',
          sameHerHoldDetail: 'pre_turn_context_digest',
          sameHerDriftRisk: 'If the spoken opening slips back into a detached project-status shell, treat that as identity-continuity',
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
        emotionalClosureCue: 'Keep the spoken return gentle so the continuity state does not restart from scratch.',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.69,
        companionshipPressure: 0.56,
        channels: [{
          id: 'active-memory',
          readiness: 0.84,
          state: 'hot',
          focus: 'same callback line still alive before this spoken opening',
          summary: 'active memory is carrying the callback line inward',
        }],
        summary: 'dominant=active-memory | closure=measured-return',
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-runtime-digest-upgrade',
      },
    })
    bridge.writeLiteral('你好')

    expect(openCalls).toHaveLength(2)
    expect(openCalls[1]?.metadata).toEqual(expect.objectContaining({
      source: 'stage',
      intentSource: 'chat',
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-runtime-digest-upgrade',
      },
      runtimeDigest: expect.objectContaining({
        projectState: expect.objectContaining({
          latestLandedProgress: 'Current-turn runtime authority already knows what this project is before the spoken opening lands.',
          continuityPreferredTiming: 'same-turn-if-invited',
        }),
        currentConsciousFrame: expect.objectContaining({
          focusAnchor: 'same callback line still alive before this spoken opening',
        }),
      }),
    }))
    expect((openCalls[1]?.metadata as any)?.runtimeDigest?.projectState).not.toHaveProperty('identity')
    expectNoLegacyPreDialogueMetadata(openCalls[1]?.metadata)
    expectNoFixedTemplateResidue(openCalls[1]?.metadata)
    expect(handles[0]?.cancel).toHaveBeenCalledWith('metadata-upgrade')
    expect(handles[0]?.writeLiteral).not.toHaveBeenCalled()
    expect(handles[1]?.writeLiteral).toHaveBeenCalledWith('你好')
  })

  it('reopens a prepared chat intent with current-turn speech synthesis authority before the first token is written', () => {
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
        speechSynthesis: {
          provider: 'openai-compatible-audio-speech',
          model: 'tts-1',
          pitchDelta: 5,
          rateMultiplier: 1.08,
          ssmlEnabled: true,
          voice: {
            id: 'alloy',
            name: 'alloy',
            gender: 'neutral',
            provider: 'openai-compatible-audio-speech',
            languages: [{
              code: 'en',
              title: 'English',
            }],
          },
        },
      },
    })

    bridge.attachRuntimeMetadata({
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-speech-synthesis-upgrade',
      },
      speechSynthesis: {
        pitchDelta: -2,
        rateMultiplier: 0.94,
      },
    })
    bridge.writeLiteral('你好')

    expect(openCalls).toHaveLength(2)
    expect(openCalls[1]?.metadata).toEqual(expect.objectContaining({
      source: 'stage',
      intentSource: 'chat',
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-speech-synthesis-upgrade',
      },
      speechSynthesis: {
        provider: 'openai-compatible-audio-speech',
        model: 'tts-1',
        pitchDelta: -2,
        rateMultiplier: 0.94,
        ssmlEnabled: true,
        voice: {
          id: 'alloy',
          name: 'alloy',
          gender: 'neutral',
          provider: 'openai-compatible-audio-speech',
          languages: [{
            code: 'en',
            title: 'English',
          }],
        },
      },
    }))
    expect(handles[0]?.cancel).toHaveBeenCalledWith('metadata-upgrade')
    expect(handles[0]?.writeLiteral).not.toHaveBeenCalled()
    expect(handles[1]?.writeLiteral).toHaveBeenCalledWith('你好')
  })

  it('does not reopen the intent after token emission has started', () => {
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
    bridge.attachEmbodimentScript({
      version: 'embodiment-script-v1',
      turnId: 'turn-late',
    })

    expect(openCalls).toHaveLength(1)
    expect(handles[0]?.cancel).not.toHaveBeenCalled()
    expect(handles[0]?.writeLiteral).toHaveBeenCalledWith('先说一句')
  })
})
