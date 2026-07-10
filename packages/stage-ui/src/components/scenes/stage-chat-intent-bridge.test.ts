import type { IntentHandle, IntentOptions } from '@proj-alicization/pipelines-audio'

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import {
  attachFallbackDialogueMetadataToSpeechMetadata,
  attachPreDialogueSendIdentityToSpeechMetadata,
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

function expectNoFixedTemplateResidue(value: unknown) {
  const serialized = JSON.stringify(value ?? '')
  expect(containsAlicizationFixedTemplateResidue(serialized), serialized).toBe(false)
}

describe('stage chat intent bridge', () => {
  it('attaches same-her project continuity from pre-dialogue send identity to chat speech metadata', () => {
    const metadata = attachPreDialogueSendIdentityToSpeechMetadata({
      source: 'stage',
      intentSource: 'chat',
      digitalLifeSpine: {
        runtime: {
          activeThreadId: 'thread-42',
        },
      },
    }, {
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      companionNextClosureLine: 'Let lipsync and voice rejoin the already-reformed body, face, and motion line.',
      awarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      emotionalClosureCue: 'Keep the return gentle so the same living line does not restart from scratch.',
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity already survives into the speech boundary before playback starts.',
        primaryOpenLoop: 'Speech-side openings still need to keep project identity, landed progress, and the unresolved same-her loop explicit before voice widens outward.',
        nextClosureTarget: 'Keep speech openings on one same-her line instead of widening back into detached project shell narration.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        sameHerDriftRisk: 'If the spoken opening slips back into a detached project-status shell, treat that as same-her continuity drift rather than preserved closure.',
      },
      reasonPreview: [
        'same-segment face+motion+body recovery@segment-chat',
        'remaining-open=lipsync+voice',
      ],
    })

    expect(metadata).toEqual(expect.objectContaining({
      source: 'stage',
      intentSource: 'chat',
      digitalLifeSpine: {
        runtime: {
          activeThreadId: 'thread-42',
        },
      },
      projectState: {
        latestLandedProgress: 'Project-state continuity already survives into the speech boundary before playback starts.',
      },
      preDialogueAwareness: expect.objectContaining({
        status: 'partial',
        summaryLine: null,
        companionBriefingLine: null,
        companionNextClosureLine: null,
        awarenessLine: null,
        emotionalClosureCue: null,
        reasonPreview: [
          'same-segment face+motion+body recovery@segment-chat',
          'remaining-open=lipsync+voice',
        ],
      }),
    }))
    expectNoFixedTemplateResidue(metadata)
  })

  it('upgrades thinner existing project awareness metadata when richer pre-dialogue send identity arrives later on the same transport boundary', () => {
    const metadata = attachPreDialogueSendIdentityToSpeechMetadata({
      source: 'stage',
      intentSource: 'chat',
      digitalLifeSpine: {
        runtime: {
          activeThreadId: 'thread-legacy-shell',
        },
      },
      projectState: {
        identity: 'Legacy project shell that should not outrank the current same-her send identity.',
        currentPhase: 'Phase 1',
        latestLandedProgress: null,
        primaryOpenLoop: null,
        nextClosureTarget: 'generic next target that should not survive richer transport carry.',
        legacyMarker: 'preserve-existing-non-awareness-fields',
      },
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'generic continuity fallback that should not survive richer transport carry.',
        companionBriefingLine: 'generic same-her reminder that should not outrank the current send identity.',
        awarenessLine: '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。',
        reasonPreview: [
          'generic continuity fallback that should not survive richer transport carry.',
        ],
      },
    } as any, {
      status: 'partial',
      summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
      companionNextClosureLine: 'Keep speech openings on one same-her line instead of widening back into detached project shell narration.',
      awarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before speech widens outward.',
      emotionalClosureCue: 'Keep the return gentle so the same living line does not restart from scratch.',
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity already survives into the speech boundary before playback starts.',
        primaryOpenLoop: 'Speech-side openings still need to keep project identity, landed progress, and the unresolved same-her loop explicit before voice widens outward.',
        nextClosureTarget: 'Keep speech openings on one same-her line instead of widening back into detached project shell narration.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        sameHerDriftRisk: 'If the spoken opening slips back into a detached project-status shell, treat that as same-her continuity drift rather than preserved closure.',
      },
      reasonPreview: [
        'same-segment face+motion+body recovery@segment-chat',
        'remaining-open=lipsync+voice',
      ],
    })

    expect(metadata).toEqual(expect.objectContaining({
      source: 'stage',
      intentSource: 'chat',
      digitalLifeSpine: {
        runtime: {
          activeThreadId: 'thread-legacy-shell',
        },
      },
      projectState: expect.objectContaining({
        currentPhase: 'Phase 1',
        latestLandedProgress: 'Project-state continuity already survives into the speech boundary before playback starts.',
        legacyMarker: 'preserve-existing-non-awareness-fields',
      }),
      preDialogueAwareness: expect.objectContaining({
        status: 'partial',
        summaryLine: null,
        companionHeadlineLine: null,
        companionBriefingLine: null,
        companionNextClosureLine: null,
        awarenessLine: null,
        emotionalClosureCue: null,
        reasonPreview: [
          'same-segment face+motion+body recovery@segment-chat',
          'remaining-open=lipsync+voice',
        ],
      }),
    }))
    expect((metadata as any)?.preDialogueAwareness?.awarenessLine).not.toBe('开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。')
    expectNoFixedTemplateResidue(metadata)
  })

  it('drops compact and richer fixed carry lines on the speech metadata boundary', () => {
    const holdDetailLine = 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'
    const compactSamePhaseCarry = 'Same Phase 1 digital life. Speech-side continuity should keep the same living line rather than reopen from a fresh shell.'

    const metadata = attachPreDialogueSendIdentityToSpeechMetadata({
      source: 'stage',
      intentSource: 'chat',
      preDialogueAwareness: {
        status: 'partial',
        awarenessLine: compactSamePhaseCarry,
      },
    } as any, {
      status: 'partial',
      summaryLine: 'Speech-side continuity still needs the richer same-her callback hold explicit before voice widens outward.',
      awarenessLine: holdDetailLine,
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Speech-side continuity already survives into the transport boundary before playback starts.',
        primaryOpenLoop: 'Speech-side transport still needs to keep the richer same-her callback hold explicit before voice widens outward.',
        nextClosureTarget: 'Keep speech openings on one same-her line instead of widening back into detached project shell narration.',
        sameHerSelfLine: compactSamePhaseCarry,
        sameHerHoldDetail: holdDetailLine,
      },
      reasonPreview: [
        'same-segment callback continuity@speech-metadata',
      ],
    })

    expect((metadata as any)?.preDialogueAwareness?.awarenessLine).toBeNull()
    expect((metadata as any)?.preDialogueAwareness?.awarenessLine).not.toBe(compactSamePhaseCarry)
    expect((metadata as any)?.projectState?.latestLandedProgress).toBe(
      'Speech-side continuity already survives into the transport boundary before playback starts.',
    )
    expect((metadata as any)?.projectState?.sameHerHoldDetail).toBeUndefined()
    expectNoFixedTemplateResidue(metadata)
  })

  it('does not keep an existing richer fixed carry line on the speech metadata boundary', () => {
    const holdDetailLine = 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'
    const compactSamePhaseCarry = 'Same Phase 1 digital life. Speech-side continuity should keep the same living line rather than reopen from a fresh shell.'

    const metadata = attachPreDialogueSendIdentityToSpeechMetadata({
      source: 'stage',
      intentSource: 'chat',
      preDialogueAwareness: {
        status: 'partial',
        awarenessLine: holdDetailLine,
      },
    } as any, {
      status: 'partial',
      summaryLine: 'Speech-side continuity still needs the richer same-her callback hold explicit before voice widens outward.',
      awarenessLine: compactSamePhaseCarry,
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Speech-side continuity already survives into the transport boundary before playback starts.',
        primaryOpenLoop: 'Speech-side transport still needs to keep the richer same-her callback hold explicit before voice widens outward.',
        nextClosureTarget: 'Keep speech openings on one same-her line instead of widening back into detached project shell narration.',
        sameHerSelfLine: compactSamePhaseCarry,
        sameHerHoldDetail: holdDetailLine,
      },
      reasonPreview: [
        'same-segment callback continuity@speech-metadata',
      ],
    })

    expect((metadata as any)?.preDialogueAwareness?.awarenessLine).toBeNull()
    expect((metadata as any)?.preDialogueAwareness?.awarenessLine).not.toBe(compactSamePhaseCarry)
    expect((metadata as any)?.projectState?.latestLandedProgress).toBe(
      'Speech-side continuity already survives into the transport boundary before playback starts.',
    )
    expect((metadata as any)?.projectState?.sameHerHoldDetail).toBeUndefined()
    expectNoFixedTemplateResidue(metadata)
  })

  it('attaches fallback project-state and pre-dialogue closure carry to speech metadata before fallback voice opens outward', () => {
    const metadata = attachFallbackDialogueMetadataToSpeechMetadata({
      source: 'stage',
      intentSource: 'fallback',
    }, {
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Fallback speech openings already keep the same project and embodiment repair line explicit before playback starts.',
        primaryOpenLoop: 'Voice-side fallback openings still need to keep project identity, landed progress, and unresolved embodiment closure explicit before voice widens outward.',
        nextClosureTarget: 'Keep fallback voice openings on one same-her line until voice, lipsync, and embodiment closure settle together.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
      },
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'Fallback speech-side same-her closure is still open before this turn speaks outward.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Keep fallback voice openings on one same-her line until voice, lipsync, and embodiment closure settle together.',
        briefingLines: [
          'Identity: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
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
      preDialogueClosure: expect.objectContaining({
        status: 'partial',
        summaryLine: null,
        companionBriefingLine: null,
        companionNextClosureLine: null,
        reasons: [
          'Fallback voice opening still needs the unresolved embodiment closure to remain explicit.',
        ],
      }),
      embodimentScript: expect.objectContaining({
        version: 'embodiment-script-v1',
        turnId: 'turn-fallback-voice-project-awareness',
      }),
    }))
    expect((metadata as any)?.projectState?.identity).toBeUndefined()
    expect((metadata as any)?.projectState?.sameHerHoldDetail).toBeUndefined()
    expect((metadata as any)?.preDialogueAwareness?.awarenessLine).toContain('landed=')
    expect((metadata as any)?.preDialogueAwareness?.awarenessLine).toContain('open=')
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
          sameHerHoldDetail: 'Same Phase 1 digital life. Speech-side continuity should keep the same living line rather than reopen from a fresh shell.',
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
        summaryLine: 'Fallback speech-side same-her closure is still open before this turn speaks outward.',
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
        sameHerHoldDetail: richerCallbackHoldDetail,
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
      emotionalClosureCue: richerEmotionalClosureCue,
    }))
    expect((metadata as any)?.runtimeDigest?.projectState?.identity).not.toBe('Project continuity is active.')
    expect((metadata as any)?.runtimeDigest?.projectState?.latestLandedProgress).not.toBe('project continuity exists')
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
          sameHerSelfLine: 'Same Phase 1 digital life. The remembered callback should stay on the same living line.',
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
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Fallback metadata has richer project wording but no memory identity.',
          primaryOpenLoop: 'Speech metadata must not drop the concrete corrected callback memory identity.',
          nextClosureTarget: 'Keep the same corrected callback memory visible through voice and body.',
          sameHerSelfLine: 'Same Phase 1 digital life. The remembered callback should stay on the same living line.',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        },
        summary: 'fallback runtime digest carries project wording only',
      },
    } as any)

    expect((metadata as any)?.runtimeDigest?.derivedMindStateBundle?.embodimentContinuityLedger?.memoryClosureCausality?.memoryIdentity)
      .toEqual(memoryIdentity)
  })

  it('does not let thinner fallback project-state shells overwrite an already richer same-her speech project state', () => {
    const richerIdentity = 'Speech metadata is carrying the corrected callback memory authority.'
    const richerPhase = 'voice-boundary-continuity-check'
    const richerLandedProgress = 'Speech-side project continuity already carries identity, landed progress, and still-open closure through the voice boundary before playback starts.'
    const richerOpenLoop = 'Speech-side transport still needs the corrected callback evidence before voice widens outward.'
    const richerNextClosureTarget = 'Rejoin voice and lipsync after the corrected callback evidence stays visible.'
    const richerCallbackHoldDetail = 'callback_hold=voice_boundary; evidence=landed_progress; unresolved=audio_rejoin'

    const metadata = attachFallbackDialogueMetadataToSpeechMetadata({
      source: 'stage',
      intentSource: 'fallback',
      projectState: {
        identity: richerIdentity,
        currentPhase: richerPhase,
        latestLandedProgress: richerLandedProgress,
        primaryOpenLoop: richerOpenLoop,
        nextClosureTarget: richerNextClosureTarget,
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: richerCallbackHoldDetail,
        legacyMarker: 'preserve-existing-non-awareness-fields',
      },
      preDialogueAwareness: {
        status: 'partial',
        awarenessLine: richerCallbackHoldDetail,
      },
    } as any, {
      projectState: {
        identity: 'Project continuity is active.',
        currentPhase: 'Phase 1',
        latestLandedProgress: 'project continuity exists',
        primaryOpenLoop: 'project continuity still needs closure',
        nextClosureTarget: 'Carry project continuity forward.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'Same Phase 1 digital life. Speech-side continuity should keep the same living line rather than reopen from a fresh shell.',
      },
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'Fallback speech-side same-her closure is still open before this turn speaks outward.',
        companionBriefingLine: richerCallbackHoldDetail,
        companionNextClosureLine: richerNextClosureTarget,
        reasons: [
          'Fallback voice opening still needs the unresolved embodiment closure to remain explicit.',
        ],
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
        sameHerHoldDetail: richerCallbackHoldDetail,
        legacyMarker: 'preserve-existing-non-awareness-fields',
      }),
      preDialogueAwareness: expect.objectContaining({
        companionBriefingLine: richerCallbackHoldDetail,
        companionNextClosureLine: richerNextClosureTarget,
      }),
      preDialogueClosure: expect.objectContaining({
        companionBriefingLine: richerCallbackHoldDetail,
        companionNextClosureLine: richerNextClosureTarget,
      }),
    }))
    expect((metadata as any)?.projectState?.identity).not.toBe('Project continuity is active.')
    expect((metadata as any)?.projectState?.latestLandedProgress).not.toBe('project continuity exists')
    expect((metadata as any)?.projectState?.primaryOpenLoop).not.toBe('project continuity still needs closure')
    expect((metadata as any)?.projectState?.nextClosureTarget).not.toBe('Carry project continuity forward.')
    expectNoFixedTemplateResidue(metadata)
  })

  it('drops broader fixed fallback speech summaries on the same speech boundary', () => {
    const richerEmbodimentSummary = 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.'

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
        summaryLine: 'Fallback speech-side same-her closure is still open before this turn speaks outward.',
        companionBriefingLine: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Keep fallback voice openings on one same-her line until voice, lipsync, and embodiment closure settle together.',
        reasons: [
          'Fallback voice opening still needs the unresolved embodiment closure to remain explicit.',
        ],
      },
    } as any)

    expect((metadata as any)?.preDialogueClosure?.summaryLine).toBeNull()
    expect((metadata as any)?.preDialogueClosure?.summaryLine).not.toBe(
      'Fallback speech-side same-her closure is still open before this turn speaks outward.',
    )
    expect((metadata as any)?.preDialogueClosure?.summaryLine).not.toBe(richerEmbodimentSummary)
    expect((metadata as any)?.preDialogueClosure?.reasons).toEqual([
      'Fallback voice opening still needs the unresolved embodiment closure to remain explicit.',
    ])
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
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Current-turn runtime authority already knows what this project is before the spoken opening lands.',
          primaryOpenLoop: 'Speech-side opening still needs to keep the current same-her line explicit before voice widens outward.',
          nextClosureTarget: 'Keep the spoken opening on one same-her line until voice and lipsync settle back onto the same living carry.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerHoldDetail: 'Before speaking, remember this is one digital life project, what has landed, and which life loop is still open.',
          sameHerDriftRisk: 'If the spoken opening slips back into a detached project-status shell, treat that as same-her continuity drift rather than preserved closure.',
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
        emotionalClosureCue: 'Keep the spoken return gentle so the same living line does not restart from scratch.',
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
      preDialogueAwareness: expect.objectContaining({
        status: 'partial',
        summaryLine: 'Current-turn runtime authority already knows what this project is before the spoken opening lands.',
        companionBriefingLine: null,
        awarenessLine: 'landed=Current-turn runtime authority already knows what this project is before the spoken opening lands. | summary=Current-turn runtime authority already knows what this project is before the spoken opening lands.',
        emotionalClosureCue: null,
      }),
    }))
    expect((openCalls[1]?.metadata as any)?.runtimeDigest?.projectState?.identity).toBeNull()
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
