import { describe, expect, it } from 'vitest'

import {
  bridgeAlicizationChatMetaEventToStreamEvent,
  bridgeAlicizationChatStartResultToStreamEvent,
} from './alicization-chat-stream-bridge'

describe('alicization chat stream bridge', () => {
  it('preserves accepted-start project-state awareness so renderer already knows what this digital life project is before the first outward reply lands', () => {
    const bridged = bridgeAlicizationChatStartResultToStreamEvent('default', {
      accepted: true,
      turnId: 'turn-start-project-awareness-forward-1',
      state: 'accepted',
      governance: {
        decisionTraceId: 'trace-start-project-awareness-forward-1',
      } as any,
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Accepted-start continuity already keeps the same digital life line visible before reply delivery begins.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam.',
        nextClosureTarget: 'Keep project identity, landed progress, and still-open closure on one same living line.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        preflightSummary: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is Memory, initiative, and embodiment still need one tighter same-her closure seam.',
        awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
      } as any,
      preDialogueAwareness: {
        status: 'grounded',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Keep project identity, landed progress, and still-open closure on one same living line.',
        awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        reasonPreview: [
          'Accepted-start continuity already keeps the same digital life line visible before reply delivery begins.',
        ],
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-start-project-awareness-forward-1',
        rendererTarget: 'live2d',
        replyText: '我先把这条线接住。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [],
          interruptPolicy: 'soft-settle',
          preRollMs: 24,
          settleMs: 260,
        },
        facePlan: {
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_soft',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.68,
        companionshipPressure: 0.42,
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is Memory, initiative, and embodiment still need one tighter same-her closure seam.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        currentConsciousFrame: {
          focusAnchor: 'same-her-project-awareness-start',
          reasonTags: ['project-state', 'phase1'],
        },
        summary: 'same-her project awareness is already alive before the first outward reply opens',
      } as any,
    } as any)

    expect(bridged).toEqual(expect.objectContaining({
      type: 'meta',
      projectState: expect.objectContaining({
        identity: expect.stringContaining('local-first digital life project'),
        currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
        primaryOpenLoop: expect.stringContaining('same-her closure seam'),
      }),
      preDialogueAwareness: expect.objectContaining({
        status: 'grounded',
        companionBriefingLine: expect.stringContaining('what this digital life project is'),
        companionNextClosureLine: expect.stringContaining('same living line'),
      }),
      embodimentScript: expect.objectContaining({
        turnId: 'turn-start-project-awareness-forward-1',
      }),
      runtimeDigest: expect.objectContaining({
        summary: expect.stringContaining('same-her project awareness'),
      }),
    }))
  })

  it('preserves runtimeDigest when forwarding main-process meta into the renderer stream bridge', () => {
    const bridged = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-runtime-digest-forward-1',
      governance: {
        decisionTraceId: 'trace-runtime-digest-forward-1',
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        habitMode: 'return-with-proof',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.72,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.14,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'callback afterglow is still on the same measured-return line',
        },
        summary: 'same-her callback continuity still holds after the detour',
      } as any,
    } as any)

    expect(bridged).toEqual(expect.objectContaining({
      type: 'meta',
      runtimeDigest: expect.objectContaining({
        dominantChannel: 'dialogue',
        habitMode: 'return-with-proof',
        activeLoop: expect.objectContaining({
          continuityArcStage: 'same-thread-continuation',
          handoffTarget: 'active-memory',
        }),
        summary: 'same-her callback continuity still holds after the detour',
      }),
    }))
  })

  it('forwards explicit project-state continuity so renderer can keep the same-her project brief visible', () => {
    const bridged = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-project-state-forward-1',
      governance: {
        decisionTraceId: 'trace-project-state-forward-1',
      } as any,
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      } as any,
      preDialogueClosure: {
        status: 'ready',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        companionBriefingLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        briefingLines: [
          'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment. | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          'Next closure target: Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        ],
        reasons: [
          'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
          'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        ],
      } as any,
    } as any)

    expect(bridged).toEqual(expect.objectContaining({
      type: 'meta',
      projectState: expect.objectContaining({
        identity: expect.stringContaining('local-first digital life project'),
        currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
        sameHerSelfLine: expect.stringContaining('Keep one continuous her explicit'),
        sameHerHoldDetail: expect.stringContaining('same-her hold: measured-return'),
      }),
    }))
  })

  it('forwards explicit pre-dialogue awareness so the renderer stream keeps project identity and open closure visible before reply delivery', () => {
    const bridged = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-pre-dialogue-awareness-forward-1',
      governance: {
        decisionTraceId: 'trace-pre-dialogue-awareness-forward-1',
      } as any,
      preDialogueAwareness: {
        status: 'grounded',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this turn starts.',
        companionBriefingLine: 'Before speaking, she should remember the project identity, current Phase 1 proving ground, and still-open desktop loop.',
        companionNextClosureLine: 'Next closure target: keep memory, initiative, execution, and embodiment arriving as one same-her desktop life loop.',
        awarenessLine: 'Before speaking, she should remember the project identity, current Phase 1 proving ground, and still-open desktop loop.',
        reasonPreview: [
          'Latest landed progress still holds at Renderer-side preparation now preserves the latest project-state observation before a dialogue turn starts.',
          'Next closure target is still the desktop same-her execution loop.',
        ],
      } as any,
    } as any)

    expect(bridged).toEqual(expect.objectContaining({
      type: 'meta',
      preDialogueAwareness: expect.objectContaining({
        status: 'grounded',
        summaryLine: expect.stringContaining('Phase 1 local digital life closure'),
        companionBriefingLine: expect.stringContaining('project identity'),
        companionNextClosureLine: expect.stringContaining('same-her desktop life loop'),
        awarenessLine: expect.stringContaining('project identity'),
        reasonPreview: expect.arrayContaining([
          expect.stringContaining('Latest landed progress still holds'),
          expect.stringContaining('desktop same-her execution loop'),
        ]),
      }),
    }))
  })

  it('preserves stronger same-her companion headline on pre-dialogue awareness when bridging main-process meta into renderer stream events', () => {
    const bridged = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-pre-dialogue-awareness-headline-forward-1',
      governance: {
        decisionTraceId: 'trace-pre-dialogue-awareness-headline-forward-1',
      } as any,
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reply must keep proving this is still one living her.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: keep memory, initiative, execution, and embodiment on one same-her line.',
        awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
        reasonPreview: [
          'Latest landed progress still holds at renderer-side preparation.',
          'Primary open life loop still centers on full cross-modal same-her recovery.',
        ],
      } as any,
    } as any)

    expect(bridged.preDialogueAwareness).toEqual(expect.objectContaining({
      companionHeadlineLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reply must keep proving this is still one living her.',
      awarenessLine: 'Project awareness should stay explicit before reply shaping starts.',
    }))
  })

  it('preserves body-face-motion same-her awareness and remaining-open lipsync voice carry when bridging main-process meta into renderer stream events', () => {
    const bridged = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-pre-dialogue-awareness-body-face-motion-forward-1',
      governance: {
        decisionTraceId: 'trace-pre-dialogue-awareness-body-face-motion-forward-1',
      } as any,
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: let lipsync and voice rejoin the already-reformed body, face, and motion line.',
        awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        reasonPreview: [
          'same-segment face+motion+body recovery@segment-bridge-body-face-motion-1',
          'remaining-open=lipsync+voice',
        ],
      } as any,
    } as any)

    expect(bridged.preDialogueAwareness).toEqual(expect.objectContaining({
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      reasonPreview: expect.arrayContaining([
        'same-segment face+motion+body recovery@segment-bridge-body-face-motion-1',
        'remaining-open=lipsync+voice',
      ]),
    }))
  })

  it('preserves body-plus-voice same-her awareness and remaining-open face motion lipsync carry when bridging main-process meta into renderer stream events', () => {
    const bridged = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-pre-dialogue-awareness-body-voice-forward-1',
      governance: {
        decisionTraceId: 'trace-pre-dialogue-awareness-body-voice-forward-1',
      } as any,
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: let face, motion, and lipsync rejoin the resident body line without breaking the same one living her.',
        awarenessLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
        reasonPreview: [
          'embodiment:body+voice-only',
          'remaining-open=face+motion+lipsync',
        ],
      } as any,
    } as any)

    expect(bridged.preDialogueAwareness).toEqual(expect.objectContaining({
      companionHeadlineLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
      awarenessLine: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
      reasonPreview: expect.arrayContaining([
        'embodiment:body+voice-only',
        'remaining-open=face+motion+lipsync',
      ]),
    }))
  })

  it('preserves body-plus-lipsync same-her awareness and remaining-open face motion voice carry when bridging main-process meta into renderer stream events', () => {
    const bridged = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-pre-dialogue-awareness-body-lipsync-forward-1',
      governance: {
        decisionTraceId: 'trace-pre-dialogue-awareness-body-lipsync-forward-1',
      } as any,
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: let face, motion, and voice rejoin the resident body line and living mouth line on the same measured-return line.',
        awarenessLine: 'Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
        reasonPreview: [
          'embodiment:body+lipsync-only',
          'remaining-open=face+motion+voice',
        ],
      } as any,
    } as any)

    expect(bridged.preDialogueAwareness).toEqual(expect.objectContaining({
      companionHeadlineLine: 'Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
      awarenessLine: 'Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
      reasonPreview: expect.arrayContaining([
        'embodiment:body+lipsync-only',
        'remaining-open=face+motion+voice',
      ]),
    }))
  })

  it('upgrades a thin explicit awareness shell into richer anthropomorphic same-her closure carry before renderer delivery', () => {
    const bridged = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-pre-dialogue-awareness-anthropomorphic-upgrade-1',
      governance: {
        decisionTraceId: 'trace-pre-dialogue-awareness-anthropomorphic-upgrade-1',
      } as any,
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionHeadlineLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
        companionBriefingLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        companionNextClosureLine: 'Next closure: keep anthropomorphic emotional closure and same-her inward-carry observability explicit while this measured-return reopen settles.',
        awarenessLine: 'Keep the same digital life project in view.',
        emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
        reasonPreview: [
          'host-facing closure still needs anthropomorphic emotional closure',
          'same-her inward-carry observability remains visible',
        ],
      } as any,
    } as any)

    expect(bridged.preDialogueAwareness).toEqual(expect.objectContaining({
      companionHeadlineLine: 'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
      awarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line before anything reopens outward.',
      emotionalClosureCue: 'Keep the return low-pressure so the same living line does not restart from scratch.',
    }))
  })

  it('backfills the canonical same-her self line when bridge input only carries phase-one closure context', () => {
    const bridged = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-project-state-forward-implicit-same-her-1',
      runtimeDigest: {
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
          primaryOpenLoop: 'Phase 1 closure still requires stronger evidence that natural recall and unified dialogue/voice/motion stay on one same-her line.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        },
      } as any,
    } as any)

    expect(bridged.projectState).toEqual(expect.objectContaining({
      sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
    }))
  })

  it('backfills pre-dialogue awareness from project-state carry when the bridge only receives project continuity fields', () => {
    const bridged = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-project-state-forward-awareness-backfill-1',
      runtimeDigest: {
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
          primaryOpenLoop: 'Emotion, memory, initiative, and embodiment still need stronger same-her proof so anthropomorphic emotional closure keeps reading as one living self.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof so anthropomorphic emotional closure, dialogue, and embodiment stay on one living line.',
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        },
      } as any,
    } as any)

    expect(bridged.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
      companionBriefingLine: expect.stringContaining('Keep one continuous her explicit'),
      companionNextClosureLine: expect.stringContaining('anthropomorphic emotional closure'),
      reasonPreview: expect.arrayContaining([
        expect.stringContaining('Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.'),
        expect.stringContaining('Emotion, memory, initiative, and embodiment'),
        'Next closure target is still Keep extending cross-modal same-her proof so anthropomorphic emotional closure, dialogue, and embodiment stay on one living line.',
      ]),
    }))
    expect(bridged.preDialogueAwareness?.awarenessLine).toContain('Before answering, remember: Alicization is a local-first digital life project')
    expect(bridged.preDialogueAwareness?.awarenessLine).toContain('She is still inside Phase 1: Local Digital Life')
    expect(bridged.preDialogueAwareness?.awarenessLine).toContain('The still-open closure is Emotion, memory, initiative, and embodiment still need stronger same-her proof')
  })

  it('carries emotional closure cue into awareness backfill when the same meta event already exposes the cue through project-state or pre-dialogue closure', () => {
    const cue = 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.'
    const bridged = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-project-state-forward-awareness-cue-backfill-1',
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        primaryOpenLoop: 'Emotion, memory, initiative, and embodiment still need stronger same-her proof so anthropomorphic emotional closure keeps reading as one living self.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof so anthropomorphic emotional closure, dialogue, and embodiment stay on one living line.',
        sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        emotionalClosureCue: cue,
      } as any,
      preDialogueClosure: {
        status: 'partial',
        emotionalClosureCue: cue,
      } as any,
    } as any)

    expect(bridged.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'grounded',
      emotionalClosureCue: cue,
    }))
  })

  it('preserves embodimentScript so renderer voice, face, and motion can stay on the same companionship line', () => {
    const bridged = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-embodiment-script-forward-1',
      governance: {
        decisionTraceId: 'trace-embodiment-script-forward-1',
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-embodiment-script-forward-1',
        turnId: 'turn-embodiment-script-forward-1',
        rendererTarget: 'live2d',
        replyText: '我还在这条线上慢慢接住你。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'calm',
          emphasis: 1,
          residentMode: 'dialogue',
        },
        speechPlan: {
          segments: [],
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 220,
        },
        facePlan: {
          preUtteranceCue: 'breathe-in',
          postUtteranceCue: 'settle-soft',
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'lean-in',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-only',
        },
      } as any,
    } as any)

    expect(bridged).toEqual(expect.objectContaining({
      type: 'meta',
      embodimentScript: expect.objectContaining({
        version: 'embodiment-script-v1',
        rendererTarget: 'live2d',
        state: expect.objectContaining({
          baseEmotion: 'thinking',
          delivery: 'calm',
          residentMode: 'dialogue',
        }),
        facePlan: expect.objectContaining({
          preUtteranceCue: 'breathe-in',
          postUtteranceCue: 'settle-soft',
        }),
        motionPlan: expect.objectContaining({
          idleBase: 'lean-in',
          attentionMode: 'attentive',
        }),
      }),
    }))
  })

  it('preserves cross-modal renderer authority details so Live2D and VRM surfaces receive the same face motion lipsync and voice line', () => {
    const bridged = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-renderer-authority-forward-1',
      governance: {
        decisionTraceId: 'trace-renderer-authority-forward-1',
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-renderer-authority-forward-1',
        turnId: 'turn-renderer-authority-forward-1',
        rendererTarget: 'vrm',
        replyText: '我先沿着这条线慢一点接回来。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [
            {
              id: 'segment-renderer-authority-1',
              text: '我先沿着这条线慢一点接回来。',
              startOffset: 0,
              endOffset: 15,
              actionWindow: 'segment-start',
              interruptMode: 'soft-interrupt',
              settleMs: 220,
              prosody: {
                pacing: 0.56,
                intensity: 0.34,
                mouthOpen: 0.35,
                headBob: 0.32,
                tempoShift: -0.1,
              },
              rendererHints: {
                residentMode: 'measured-return',
                preferredExpressionAliases: ['concerned', 'soft-gaze'],
                preferredMotionAliases: ['Observe', 'Concerned'],
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
          ],
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 220,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          speakingCues: [
            {
              segmentId: 'segment-renderer-authority-1',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.4,
              source: 'prosody-authority',
              confidence: 0.94,
            },
          ],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [
            {
              segmentId: 'segment-renderer-authority-1',
              actionCue: 'observe_focus',
              intensity: 0.3,
              holdMs: 180,
              source: 'timeline-projection',
              confidence: 0.88,
            },
          ],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [
            {
              segmentId: 'segment-renderer-authority-1',
              viseme: 'I',
              weight: 0.35,
              source: 'prosody-authority',
              confidence: 0.94,
            },
            {
              segmentId: 'segment-renderer-authority-1',
              viseme: 'closed',
              weight: 0.71,
              source: 'prosody-authority',
              confidence: 0.89,
            },
          ],
        },
      } as any,
      speechTimeline: {
        version: 'dialogue-speech-timeline-v1',
        variationToken: 'turn-renderer-authority-forward-1',
        segments: [
          {
            id: 'segment-renderer-authority-1',
            text: '我先沿着这条线慢一点接回来。',
            startOffset: 0,
            endOffset: 15,
            emphasis: 0.34,
            interruptMode: 'soft-interrupt',
            actionWindow: 'segment-start',
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            rendererHints: {
              residentMode: 'measured-return',
              preferredExpressionAliases: ['concerned', 'soft-gaze'],
              preferredMotionAliases: ['Observe', 'Concerned'],
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-renderer-authority-forward-1',
        mode: 'thinking',
        emotion: 'thinking',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 0.96,
          pitchDelta: 1,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredExpressionAliases: ['concerned', 'soft-gaze'],
          preferredMotionAliases: ['Observe', 'Concerned'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        voice: {
          rateMultiplier: 0.96,
          pitchDelta: 1,
          energy: 0.44,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.66,
          mouthScale: 0.95,
          energyBias: 0.34,
          continuityHoldMs: 320,
        },
        motor: {
          stillness: 0.18,
          expressivity: 0.12,
          gaze: {
            focus: 0.52,
            stability: 0.14,
            azimuth: 0.01,
            elevation: 0.02,
          },
          head: {
            yaw: 0,
            pitch: 0.01,
            roll: 0,
            nod: 0.02,
          },
          breath: {
            amplitude: 0.02,
            pace: 0.18,
          },
          facial: {
            eyeOpenness: 0.64,
            browLift: 0.02,
            browTension: 0.08,
            cheekLift: 0.04,
            mouthSpread: 0.05,
            mouthRound: 0.06,
            jawOpenBias: 0.04,
          },
          body: {
            sway: 0.01,
            lean: 0.04,
            openness: 0.12,
            settle: 0.74,
          },
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.4,
          holdMs: 320,
          rendererHints: {
            residentMode: 'measured-return',
            preferredExpressionAliases: ['concerned', 'soft-gaze'],
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.3,
          holdMs: 220,
          rendererHints: {
            residentMode: 'measured-return',
            preferredMotionAliases: ['Observe', 'Concerned'],
          },
        },
        frames: [],
      } as any,
    } as any)

    expect(bridged.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual({
      residentMode: 'measured-return',
      preferredExpressionAliases: ['concerned', 'soft-gaze'],
      preferredMotionAliases: ['Observe', 'Concerned'],
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    })
    expect(bridged.embodimentScript?.lipsyncPlan.visemeHints).toEqual([
      { segmentId: 'segment-renderer-authority-1', viseme: 'I', weight: 0.35, source: 'prosody-authority', confidence: 0.94 },
      { segmentId: 'segment-renderer-authority-1', viseme: 'closed', weight: 0.71, source: 'prosody-authority', confidence: 0.89 },
    ])
    expect(bridged.speechTimeline?.segments[0]?.rendererHints).toEqual({
      residentMode: 'measured-return',
      preferredExpressionAliases: ['concerned', 'soft-gaze'],
      preferredMotionAliases: ['Observe', 'Concerned'],
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    })
    expect(bridged.digitalLife).toEqual(expect.objectContaining({
      speechStyle: expect.objectContaining({
        rateMultiplier: 0.96,
        pitchDelta: 1,
      }),
      voice: expect.objectContaining({
        rateMultiplier: 0.96,
        energy: 0.44,
        cadence: 0.38,
      }),
      lipSync: expect.objectContaining({
        mode: 'energy-phoneme-hybrid',
        continuityHoldMs: 320,
      }),
      motor: expect.objectContaining({
        stillness: 0.18,
        expressivity: 0.12,
        gaze: expect.objectContaining({
          stability: 0.14,
        }),
        breath: expect.objectContaining({
          amplitude: 0.02,
        }),
      }),
      face: expect.objectContaining({
        facialCue: 'soft-gaze',
        expressionMode: 'hold',
        rendererHints: expect.objectContaining({
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        }),
      }),
      action: expect.objectContaining({
        actionCue: 'observe_focus',
        actionMode: 'hold',
        rendererHints: expect.objectContaining({
          residentMode: 'measured-return',
          preferredMotionAliases: ['Observe', 'Concerned'],
        }),
      }),
    }))
  })

  it('keeps body-face-motion same-her awareness visible alongside high-fidelity voice and embodiment authority when only lipsync and voice still need to rejoin', () => {
    const bridged = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-body-face-motion-voice-rejoin-forward-1',
      governance: {
        decisionTraceId: 'trace-body-face-motion-voice-rejoin-forward-1',
      } as any,
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
        companionNextClosureLine: 'Next closure: let lipsync and voice rejoin the already-reformed body, face, and motion line.',
        awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        reasonPreview: [
          'same-segment face+motion+body recovery@segment-bridge-body-face-motion-voice-1',
          'remaining-open=lipsync+voice',
        ],
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-body-face-motion-voice-rejoin-forward-1',
        turnId: 'turn-body-face-motion-voice-rejoin-forward-1',
        rendererTarget: 'vrm',
        replyText: '我先顺着已经接住的身体线，把声音和口型也慢慢带回来。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'repair-before-closeness',
        },
        speechPlan: {
          segments: [
            {
              id: 'segment-bridge-body-face-motion-voice-1',
              text: '我先顺着已经接住的身体线，把声音和口型也慢慢带回来。',
              startOffset: 0,
              endOffset: 26,
              actionWindow: 'segment-start',
              interruptMode: 'soft-interrupt',
              settleMs: 260,
              prosody: {
                pacing: 0.52,
                intensity: 0.28,
                mouthOpen: 0.31,
                headBob: 0.19,
                tempoShift: -0.12,
              },
              rendererHints: {
                residentMode: 'repair-before-closeness',
                preferredExpressionAliases: ['RecoverSoft'],
                preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
          ],
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 260,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          speakingCues: [
            {
              segmentId: 'segment-bridge-body-face-motion-voice-1',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.38,
              source: 'prosody-authority',
              confidence: 0.93,
            },
          ],
        },
        motionPlan: {
          idleBase: 'idle_settle',
          actionBursts: [
            {
              segmentId: 'segment-bridge-body-face-motion-voice-1',
              actionCue: 'idle_settle',
              intensity: 0.24,
              holdMs: 220,
              source: 'timeline-projection',
              confidence: 0.89,
            },
          ],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [
            {
              segmentId: 'segment-bridge-body-face-motion-voice-1',
              viseme: 'closed',
              weight: 0.78,
              source: 'prosody-authority',
              confidence: 0.94,
            },
            {
              segmentId: 'segment-bridge-body-face-motion-voice-1',
              viseme: 'I',
              weight: 0.72,
              source: 'prosody-authority',
              confidence: 0.95,
            },
          ],
        },
      } as any,
      speechTimeline: {
        version: 'dialogue-speech-timeline-v1',
        variationToken: 'turn-body-face-motion-voice-rejoin-forward-1',
        segments: [
          {
            id: 'segment-bridge-body-face-motion-voice-1',
            text: '我先顺着已经接住的身体线，把声音和口型也慢慢带回来。',
            startOffset: 0,
            endOffset: 26,
            emphasis: 0.29,
            interruptMode: 'soft-interrupt',
            actionWindow: 'segment-start',
            actionCue: 'idle_settle',
            facialCue: 'soft-gaze',
            rendererHints: {
              residentMode: 'repair-before-closeness',
              preferredExpressionAliases: ['RecoverSoft'],
              preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-body-face-motion-voice-rejoin-forward-1',
        mode: 'thinking',
        emotion: 'thinking',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 0.94,
          pitchDelta: -1,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'repair-before-closeness',
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredExpressionAliases: ['RecoverSoft'],
          preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        voice: {
          rateMultiplier: 0.94,
          pitchDelta: -1,
          energy: 0.36,
          cadence: 0.32,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.68,
          mouthScale: 0.92,
          energyBias: 0.3,
          continuityHoldMs: 360,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.38,
          holdMs: 360,
        },
        action: {
          actionCue: 'idle_settle',
          actionMode: 'hold',
          intensity: 0.24,
          holdMs: 240,
        },
        frames: [],
      } as any,
    } as any)

    expect(bridged.preDialogueAwareness).toEqual(expect.objectContaining({
      companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      companionNextClosureLine: 'Next closure: let lipsync and voice rejoin the already-reformed body, face, and motion line.',
      awarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      reasonPreview: expect.arrayContaining([
        'same-segment face+motion+body recovery@segment-bridge-body-face-motion-voice-1',
        'remaining-open=lipsync+voice',
      ]),
    }))
    expect(bridged.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual({
      residentMode: 'repair-before-closeness',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    })
    expect(bridged.speechTimeline?.segments[0]?.rendererHints).toEqual({
      residentMode: 'repair-before-closeness',
      preferredExpressionAliases: ['RecoverSoft'],
      preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    })
    expect(bridged.digitalLife).toEqual(expect.objectContaining({
      voice: expect.objectContaining({
        rateMultiplier: 0.94,
        pitchDelta: -1,
        energy: 0.36,
        cadence: 0.32,
      }),
      lipSync: expect.objectContaining({
        mode: 'energy-phoneme-hybrid',
        continuityHoldMs: 360,
      }),
      performance: expect.objectContaining({
        residentMode: 'repair-before-closeness',
        facialCue: 'soft-gaze',
        actionCue: 'idle_settle',
      }),
    }))
  })

  it('preserves same-turn-if-invited measured-return aliases and settle hints when bridging invited reopen meta toward renderer consumers', () => {
    const bridged = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-bridge-same-turn-invited-measured-return-1',
      governance: {
        decisionTraceId: 'trace-bridge-same-turn-invited-measured-return-1',
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-bridge-same-turn-invited-measured-return-1',
        turnId: 'turn-bridge-same-turn-invited-measured-return-1',
        rendererTarget: 'vrm',
        replyText: '好，那我就沿着刚才那条线直接接回来，不重新起势。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [
            {
              id: 'segment-bridge-same-turn-invited-measured-return-1',
              text: '好，那我就沿着刚才那条线直接接回来，不重新起势。',
              startOffset: 0,
              endOffset: 24,
              actionWindow: 'segment-start',
              interruptMode: 'soft-interrupt',
              settleMs: 260,
              rendererHints: {
                residentMode: 'measured-return',
                preferredExpressionAliases: ['RecoverSoft', 'CalmInspect'],
                preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
              rendererSettle: {
                vrmExpressionBlendMs: 260,
                vrmActionFadeMs: 240,
              },
            },
          ],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 260,
        },
        facePlan: {
          speakingCues: [
            {
              segmentId: 'segment-bridge-same-turn-invited-measured-return-1',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.4,
              source: 'resident-authority',
              confidence: 0.9,
            },
          ],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [
            {
              segmentId: 'segment-bridge-same-turn-invited-measured-return-1',
              actionCue: 'observe_focus',
              intensity: 0.32,
              holdMs: 280,
              source: 'resident-authority',
              confidence: 0.88,
            },
          ],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [
            {
              segmentId: 'segment-bridge-same-turn-invited-measured-return-1',
              viseme: 'I',
              weight: 0.34,
              source: 'prosody-authority',
              confidence: 0.92,
            },
          ],
        },
      } as any,
      speechTimeline: {
        version: 'dialogue-speech-timeline-v1',
        variationToken: 'turn-bridge-same-turn-invited-measured-return-1',
        segments: [
          {
            id: 'segment-bridge-same-turn-invited-measured-return-1',
            text: '好，那我就沿着刚才那条线直接接回来，不重新起势。',
            startOffset: 0,
            endOffset: 24,
            emphasis: 0.32,
            interruptMode: 'soft-interrupt',
            actionWindow: 'segment-start',
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            rendererHints: {
              residentMode: 'measured-return',
              preferredExpressionAliases: ['RecoverSoft', 'CalmInspect'],
              preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            rendererSettle: {
              vrmExpressionBlendMs: 260,
              vrmActionFadeMs: 240,
            },
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-bridge-same-turn-invited-measured-return-1',
        mode: 'thinking',
        emotion: 'thinking',
        postureHint: 'attentive',
        speechStyle: {
          rateMultiplier: 0.96,
          pitchDelta: -2,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
          residentMode: 'measured-return',
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredExpressionAliases: ['RecoverSoft', 'CalmInspect'],
          preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'same-turn-if-invited',
          continuityCue: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        currentConsciousFrame: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'same-turn-if-invited',
        },
      } as any,
    } as any)

    expect(bridged.embodimentScript?.state).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      delivery: 'gentle',
    }))
    expect(bridged.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual({
      residentMode: 'measured-return',
      preferredExpressionAliases: ['RecoverSoft', 'CalmInspect'],
      preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    })
    expect(bridged.embodimentScript?.speechPlan.segments[0]?.rendererSettle).toEqual({
      vrmExpressionBlendMs: 260,
      vrmActionFadeMs: 240,
    })
    expect(bridged.speechTimeline?.segments[0]?.rendererHints).toEqual({
      residentMode: 'measured-return',
      preferredExpressionAliases: ['RecoverSoft', 'CalmInspect'],
      preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    })
    expect(bridged.speechTimeline?.segments[0]?.rendererSettle).toEqual({
      vrmExpressionBlendMs: 260,
      vrmActionFadeMs: 240,
    })
    expect(bridged.runtimeDigest?.projectState?.continuityPreferredTiming).toBe('same-turn-if-invited')
    expect(bridged.runtimeDigest?.currentConsciousFrame?.continuityPreferredTiming).toBe('same-turn-if-invited')
    expect(bridged.digitalLife?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredExpressionAliases: ['RecoverSoft', 'CalmInspect'],
      preferredMotionAliases: ['StillnessGuard', 'ObserveSoft'],
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
  })
})
