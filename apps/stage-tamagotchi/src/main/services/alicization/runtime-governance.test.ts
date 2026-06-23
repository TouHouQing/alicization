import type {
  AlicizationConversationTurnInput as RuntimeAlicizationConversationTurnInput,
  CharacterPerformanceCapabilitiesManifest as RuntimeCharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { buildAlicizationChatMetaSignature } from './main-chat-stream-meta'
import {
  alicizationProjectStatePersistenceLandedReminder,
  alicizationProjectStateVisibleReplySameHerReminder,
} from './project-state-answer-governance'
import {
  applyCompanionshipHoldModeToDigitalLifeSpine,
  buildAlicizationChatStreamEmbodimentMeta as buildAlicizationChatStreamEmbodimentMetaBase,
  buildMindTurnTraceEvents,
  coerceConversationTurnToMindGovernedPayload as coerceConversationTurnToMindGovernedPayloadBase,
  normalizeDialogueRespondedPayload as normalizeDialogueRespondedPayloadBase,
} from './runtime-governance'

type AlicizationConversationTurnInput = Record<string, any>
type CharacterPerformanceCapabilitiesManifest = Record<string, any>
type BuildAlicizationChatStreamEmbodimentMetaInput = Parameters<typeof buildAlicizationChatStreamEmbodimentMetaBase>[0]

function coerceConversationTurnToMindGovernedPayload(
  input: AlicizationConversationTurnInput,
  manifest?: CharacterPerformanceCapabilitiesManifest | null,
  options?: Parameters<typeof coerceConversationTurnToMindGovernedPayloadBase>[2],
) {
  return coerceConversationTurnToMindGovernedPayloadBase(
    input as unknown as RuntimeAlicizationConversationTurnInput,
    manifest as RuntimeCharacterPerformanceCapabilitiesManifest | undefined,
    options,
  )
}

function normalizeDialogueRespondedPayload(
  input: unknown,
  manifest?: CharacterPerformanceCapabilitiesManifest | null,
  options?: Parameters<typeof normalizeDialogueRespondedPayloadBase>[2],
) {
  return normalizeDialogueRespondedPayloadBase(
    input as Parameters<typeof normalizeDialogueRespondedPayloadBase>[0],
    manifest as RuntimeCharacterPerformanceCapabilitiesManifest | undefined,
    options,
  )
}

function buildAlicizationChatStreamEmbodimentMeta(input: unknown) {
  return buildAlicizationChatStreamEmbodimentMetaBase(input as BuildAlicizationChatStreamEmbodimentMetaInput)
}

function buildTestAlicizationChatStreamEmbodimentMeta(
  input: Omit<BuildAlicizationChatStreamEmbodimentMetaInput, 'digitalLifeSpine' | 'performanceManifest'> & {
    digitalLifeSpine?: unknown
    performanceManifest?: unknown
  },
) {
  return buildAlicizationChatStreamEmbodimentMeta(input)
}

describe('runtime-governance', () => {
  it('preserves organic direct repair replies instead of forcing deterministic fallback takeover', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-organic-repair-1',
      sessionId: 'session-1',
      userText: '你再看一眼现在屏幕',
      assistantText: '不是刚才那页了，我按这张新画面重新说。',
      structured: {
        thought: 'obligation=repair; truth=coarse; focus=current-screen; move=answer-directly; tone=direct',
        emotion: 'thinking',
        reply: '不是刚才那页了，我按这张新画面重新说。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'live-observed',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'correct-stale-anchor',
        answerSubject: 'visible-scene',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'stale-anchor',
        liveSurface: 'Code current window',
        focusAnchor: 'Code current window',
        answerIntent: 'Correct the stale anchor and answer from the current window.',
        openingMove: 'Correct the stale anchor directly.',
        carriedThread: 'old browser residue',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 4,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input, {
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking'],
      supportedFacialCues: [],
      supportedActions: [],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    })
    const structured = governed.payload.structured as Record<string, unknown>

    expect(governed.replyOverridden).toBe(false)
    expect(governed.overrideClass).toBe('none')
    expect(governed.reasons).toContain('strict-repair-organic-reply-preserved')
    expect(governed.payload.assistantText).toBe('不是刚才那页了，我按这张新画面重新说。')
    expect(String(structured.reply ?? '')).toBe('不是刚才那页了，我按这张新画面重新说。')
    expect(structured.visibleReplyAuthority).toBe('llm-mind')
    expect(String(structured.reply ?? '')).not.toContain('先按你眼前这件事说')
  })

  it('keeps lived user and assistant text on normalized dialogue payloads so downstream memory and reply delivery can remember the exchange itself', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-lived-exchange-1',
      sessionId: 'session-lived',
      userText: '先别催，但这条线你可以轻一点接回来。',
      assistantText: '我没有催你，但我还记得那条 runtime seam 没收完，要不要我轻轻接一下？',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=current-user-turn; move=answer-directly; tone=gentle',
        emotion: 'thinking',
        reply: '我没有催你，但我还记得那条 runtime seam 没收完，要不要我轻轻接一下？',
        format: 'mind-turn-v1',
      },
      createdAt: 110,
    })

    expect(dialoguePayload).toEqual(expect.objectContaining({
      userText: '先别催，但这条线你可以轻一点接回来。',
      assistantText: '我没有催你，但我还记得那条 runtime seam 没收完，要不要我轻轻接一下？',
    }))
  })

  it('emits chinese segment viseme and face timing metadata in governed embodiment scripts', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-embodiment-contract-1',
      sessionId: 'session-1',
      userText: '继续说下去',
      assistantText: '先看这里，然后确认了吗？',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=current-user-turn; move=answer-directly; tone=direct',
        emotion: 'thinking',
        reply: '先看这里，然后确认了吗？',
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'idle_gentle_nod',
          delivery: 'gentle',
          emphasis: 1,
        },
      } as any,
      governance: {
        decisionTraceId: 'trace-embodiment-contract-1',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'guide',
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'current task thread',
        focusAnchor: 'current task thread',
        answerIntent: 'Continue the task directly.',
        openingMove: 'Continue directly.',
        carriedThread: 'current task thread',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input, {
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking'],
      supportedFacialCues: [],
      supportedActions: [],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    })
    const script = (governed.payload.structured as Record<string, any>).embodimentScript

    expect(script?.facePlan?.speakingCues?.[0]).toEqual(expect.objectContaining({
      source: 'prosody-authority',
      preUtteranceCue: 'steady-inhale',
      postUtteranceCue: 'soft-release',
    }))
    expect(script?.motionPlan?.actionBursts?.[0]).toEqual(expect.objectContaining({
      source: 'timeline-projection',
      confidence: 0.88,
    }))
    expect(script?.lipsyncPlan?.visemeHints).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'prosody-authority',
        confidence: 0.94,
      }),
    ]))
  })

  it('rebuilds embodimentScript when normalizing dialogue payloads for downstream delivery', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-embodiment-script-1',
      sessionId: 'session-normalize-embodiment-script',
      assistantText: '这个错误先别放过去，我轻轻提醒你看一眼。',
      structured: {
        thought: 'coding proactive nudge should be short and grounded',
        emotion: 'thinking',
        reply: '这个错误先别放过去，我轻轻提醒你看一眼。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        format: 'mind-turn-v1',
      },
      origin: 'subconscious-proactive',
      createdAt: Date.now(),
    }, {
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
        { key: 'relaxed', label: 'Relaxed', description: 'relaxed face', source: 'preset', affectsMouth: false },
      ],
      supportedActions: [
        { key: 'observe_focus', label: 'Observe', description: 'observe focus', source: 'live2d-motion' },
        { key: 'pout_confused', label: 'Pout', description: 'pout confused', source: 'live2d-motion' },
        { key: 'idle_settle', label: 'Idle', description: 'idle settle', source: 'live2d-motion' },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    })

    expect(dialoguePayload?.structured.embodimentScript).toEqual(expect.objectContaining({
      version: 'embodiment-script-v1',
      rendererTarget: 'live2d',
      facePlan: expect.objectContaining({
        speakingCues: expect.arrayContaining([
          expect.objectContaining({
            source: 'prosody-authority',
            confidence: expect.any(Number),
          }),
        ]),
      }),
      motionPlan: expect.objectContaining({
        actionBursts: expect.arrayContaining([
          expect.objectContaining({
            source: 'timeline-projection',
            confidence: expect.any(Number),
          }),
        ]),
      }),
      lipsyncPlan: expect.objectContaining({
        visemeHints: expect.arrayContaining([
          expect.objectContaining({
            source: 'prosody-authority',
            confidence: expect.any(Number),
          }),
        ]),
      }),
    }))
  })

  it('classifies reminder-family payloads as runtime-owned autonomous dialogue even when origin is missing but turn-id or structured-format markers still survive replay or transport', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'reminder:default:task-1:123',
      sessionId: 'session-reminder-family-origin-repair',
      assistantText: '这条提醒还是沿着刚才那条线回来，不是新的开场。',
      structured: {
        thought: 'reminder follow-through should stay on the same line',
        emotion: 'thinking',
        reply: '这条提醒还是沿着刚才那条线回来，不是新的开场。',
        parsePath: 'json',
        format: 'subconscious-reminder-v1',
      },
      origin: 'user-turn',
      createdAt: Date.now(),
    })

    expect(dialoguePayload?.origin).toBe('subconscious-proactive')
    expect((dialoguePayload?.structured as unknown as Record<string, unknown>)?.format).toBe('subconscious-reminder-v1')
  })

  it('preserves project-state carry and visible reply projectStateAudit when normalizing downstream dialogue delivery payloads', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-project-state-carry-1',
      sessionId: 'session-normalize-project-state-carry',
      assistantText: '刚才那条 callback 已经收束了，但这条数字生命主线还没闭环。',
      structured: {
        thought: 'keep the same digital life explicit while surfacing callback payoff',
        emotion: 'thinking',
        reply: '刚才那条 callback 已经收束了，但这条数字生命主线还没闭环。',
        parsePath: 'json',
        format: 'subconscious-proactive-v1',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Same-session mirror carry still survives into callback delivery.',
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure so the same digital life keeps one same still-open closure work.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across callback visible reply surfaces.',
        },
      },
      visibleReplyRealization: {
        version: 'visible-reply-realization-v1',
        expectedAuthority: 'llm-mind',
        actualAuthority: 'llm-mind',
        providerMindExecuted: true,
        mode: 'provider-one-shot',
        visibleText: '刚才那条 callback 已经收束了，但这条数字生命主线还没闭环。',
        nonHumanAuthoredStatus: null,
        blockedReasons: [],
        emotionalClosureAudit: null,
        selfAuthorityAudit: null,
        projectStateAudit: {
          sameHerSummary: alicizationProjectStateVisibleReplySameHerReminder.replace('narrator', 'status'),
          landedProgressSummary: alicizationProjectStatePersistenceLandedReminder,
          openClosureSummary: 'Keep the still-open closure work explicit in the visible reply.',
          preservedIntoRewrite: true,
          rewriteClosureApplied: false,
        },
        reason: 'mind-authored-execution-callback',
      },
      origin: 'subconscious-proactive',
      createdAt: Date.now(),
    })

    expect((dialoguePayload?.structured as any).projectState).toEqual(expect.objectContaining({
      identity: expect.stringContaining('local-first digital life project'),
      currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
      latestLandedProgress: expect.stringContaining('Same-session mirror carry'),
      primaryOpenLoop: expect.stringContaining('same digital life'),
      nextClosureTarget: expect.stringContaining('same-her proof'),
    }))
    expect((dialoguePayload as any)?.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: alicizationProjectStateVisibleReplySameHerReminder.replace('narrator', 'status'),
      landedProgressSummary: alicizationProjectStatePersistenceLandedReminder,
      openClosureSummary: 'Keep the still-open closure work explicit in the visible reply.',
      preservedIntoRewrite: true,
      rewriteClosureApplied: false,
    }))
  })

  it('backfills current-conscious-frame same-her arc and cue into normalized visible reply project-state audit', () => {
    const continuityArcStage = 'same-thread-continuation'
    const continuityCue = 'current conscious frame cue: keep the same callback seam alive after downstream normalization'
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-current-frame-project-audit-arc-cue-1',
      sessionId: 'session-normalize-current-frame-project-audit-arc-cue',
      assistantText: '我沿着同一条回来的线接住，不重新开场。',
      structured: {
        thought: 'current conscious frame still owns the same-her continuation cue',
        emotion: 'thinking',
        reply: '我沿着同一条回来的线接住，不重新开场。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      visibleReplyRealization: {
        version: 'visible-reply-realization-v1',
        expectedAuthority: 'llm-mind',
        actualAuthority: 'llm-mind',
        providerMindExecuted: true,
        mode: 'provider-one-shot',
        visibleText: '我沿着同一条回来的线接住，不重新开场。',
        nonHumanAuthoredStatus: null,
        blockedReasons: [],
        emotionalClosureAudit: null,
        selfAuthorityAudit: null,
        projectStateAudit: {
          sameHerSummary: 'Same Phase 1 digital life. The same return line is already alive.',
          sameHerHoldDetail: 'same-her hold: keep this callback line lower-pressure before closeness widens again.',
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'Callback continuity already survives into downstream normalization.',
          openClosureSummary: 'The visible reply still needs to keep the same-her closure explicit.',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
        reason: 'mind-authored-callback-continuity',
      },
      origin: 'user-turn',
      createdAt: Date.now(),
    }, null, {
      currentConsciousFrame: {
        reasonTags: ['runtime-conscious-frame', 'same-her-continuation'],
        projectState: {
          continuityArcStage,
          continuityCue,
          sameHerHoldDetail: 'same-her hold: current frame keeps this callback line lower-pressure.',
        },
      },
    })

    expect((dialoguePayload as any)?.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      continuityArcStage,
      continuityCue,
    }))
  })

  it('lifts structured proactive visible reply realization so subconscious proactive project-state audit survives downstream normalization', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-structured-proactive-visible-reply-1',
      sessionId: 'session-normalize-structured-proactive-visible-reply',
      assistantText: '我先沿着这条同一个 her 的线轻一点接回来。',
      structured: {
        thought: 'same-her continuity should stay explicit before this proactive line becomes host-visible',
        emotion: 'thinking',
        reply: '我先沿着这条同一个 her 的线轻一点接回来。',
        parsePath: 'json',
        format: 'subconscious-proactive-llm-v1',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary desktop runtime is still the proving ground.',
          preDialogueAwarenessLine: 'Before answering, remember: this is still the same digital life project, Phase 1 is still unfinished, and the same-her closure must stay explicit.',
          latestLandedProgress: 'Chat entry and callback paths now keep the same-her project brief explicit.',
          primaryOpenLoop: 'Subconscious proactive delivery still needs to keep one same-her closure audit instead of thinning into a generic proactive shell.',
          nextClosureTarget: 'Keep the proactive host-visible carry using the same project-awareness and closure line as user-turn dialogue.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        visibleReplyRealization: {
          expectedAuthority: 'llm-mind',
          actualAuthority: 'llm-mind',
          providerMindExecuted: true,
          mode: 'provider-one-shot',
          visibleText: '我先沿着这条同一个 her 的线轻一点接回来。',
          nonHumanAuthoredStatus: null,
          blockedReasons: [],
          emotionalClosureAudit: null,
          selfAuthorityAudit: null,
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            currentPhaseSummary: 'Phase 1: Local Digital Life',
            landedProgressSummary: 'Chat entry and callback paths now keep the same-her project brief explicit.',
            openClosureSummary: 'Subconscious proactive delivery still needs to keep one same-her closure audit instead of thinning into a generic proactive shell.',
            preDialogueAwarenessSummary: 'Before answering, remember: this is still the same digital life project, Phase 1 is still unfinished, and the same-her closure must stay explicit.',
            nextClosureTargetSummary: 'Keep the proactive host-visible carry using the same project-awareness and closure line as user-turn dialogue.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=Chat entry and callback paths now keep the same-her project brief explicit. | open=Subconscious proactive delivery still needs to keep one same-her closure audit instead of thinning into a generic proactive shell. | next=Keep the proactive host-visible carry using the same project-awareness and closure line as user-turn dialogue.',
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
          reason: 'mind-authored-proactive-utterance',
        },
      },
      origin: 'subconscious-proactive',
      createdAt: Date.now(),
    })

    expect((dialoguePayload as any)?.visibleReplyRealization).toEqual(expect.objectContaining({
      expectedAuthority: 'llm-mind',
      actualAuthority: 'llm-mind',
      providerMindExecuted: true,
      mode: 'provider-one-shot',
      visibleText: '我先沿着这条同一个 her 的线轻一点接回来。',
      projectStateAudit: expect.objectContaining({
        sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        landedProgressSummary: 'Chat entry and callback paths now keep the same-her project brief explicit.',
        openClosureSummary: 'Subconscious proactive delivery still needs to keep one same-her closure audit instead of thinning into a generic proactive shell.',
        preDialogueAwarenessSummary: expect.stringContaining('same digital life project'),
        continuitySummary: expect.stringContaining('same-her='),
        preservedIntoRewrite: true,
        rewriteClosureApplied: false,
      }),
      reason: 'mind-authored-proactive-utterance',
    }))
  })

  it('keeps merge-readiness project-state audit boundaries explicit when host-visible normalization rebuilds the reply payload', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-project-state-merge-readiness-audit-1',
      sessionId: 'session-normalize-project-state-merge-readiness-audit',
      assistantText: '这次 project-state 追问里，已验证和未闭环的边界不能被磨平。',
      structured: {
        thought: 'project-state merge-readiness follow-up should keep verified and still-open closure boundaries explicit all the way to the host-visible payload',
        emotion: 'thinking',
        reply: '这次 project-state 追问里，已验证和未闭环的边界不能被磨平。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'The runtime contract already keeps merge-readiness governance rules explicit through rebuild and normalization.',
          primaryOpenLoop: 'Host-visible continuity still needs to keep verified proof separate from what is still open before claiming merge readiness.',
          nextClosureTarget: 'Keep the host-visible project-state audit explicit about what is verified now and what still needs closure next.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some merge-readiness proof already landed, but the same living line still has open closure work.',
          preDialogueAwarenessLine: 'Before answering whether this can merge to main, remember what is already verified and what is still unproven or still open.',
        },
      },
      visibleReplyRealization: {
        version: 'visible-reply-realization-v1',
        expectedAuthority: 'llm-mind',
        actualAuthority: 'llm-mind',
        providerMindExecuted: true,
        mode: 'provider-one-shot',
        visibleText: '这次 project-state 追问里，已验证和未闭环的边界不能被磨平。',
        nonHumanAuthoredStatus: null,
        blockedReasons: [],
        emotionalClosureAudit: null,
        selfAuthorityAudit: null,
        projectStateAudit: {
          sameHerSummary: 'Same Phase 1 digital life. Some merge-readiness proof already landed, but the same living line still has open closure work.',
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'Verified now: the runtime contract already keeps merge-readiness governance rules explicit through rebuild and normalization.',
          openClosureSummary: 'Still open: host-visible continuity still needs to keep verified proof separate from what is still open before claiming merge readiness.',
          nextClosureTargetSummary: 'Next closure target: keep the host-visible project-state audit explicit about what is verified now and what still needs closure next.',
          preDialogueAwarenessSummary: 'Before answering whether this can merge to main, remember what is already verified and what is still unproven or still open.',
          continuitySummary: 'same-her=Same Phase 1 digital life. Some merge-readiness proof already landed, but the same living line still has open closure work. | landed=Verified now: the runtime contract already keeps merge-readiness governance rules explicit through rebuild and normalization. | open=Still open: host-visible continuity still needs to keep verified proof separate from what is still open before claiming merge readiness. | next=Next closure target: keep the host-visible project-state audit explicit about what is verified now and what still needs closure next.',
          preservedIntoRewrite: true,
          rewriteClosureApplied: false,
        },
        reason: 'mind-authored-project-state-merge-readiness',
      },
      origin: 'user-turn',
      createdAt: Date.now(),
    })

    expect((dialoguePayload as any)?.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      landedProgressSummary: 'Verified now: the runtime contract already keeps merge-readiness governance rules explicit through rebuild and normalization.',
      openClosureSummary: 'Still open: host-visible continuity still needs to keep verified proof separate from what is still open before claiming merge readiness.',
      nextClosureTargetSummary: 'Next closure target: keep the host-visible project-state audit explicit about what is verified now and what still needs closure next.',
      preDialogueAwarenessSummary: 'Before answering whether this can merge to main, remember what is already verified and what is still unproven or still open.',
      continuitySummary: expect.stringContaining('Verified now:'),
      preservedIntoRewrite: true,
      rewriteClosureApplied: false,
    }))
  })

  it('keeps completion-timing and language-drift project-state audit boundaries explicit when host-visible normalization rebuilds the reply payload', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-project-state-timeline-language-drift-audit-1',
      sessionId: 'session-normalize-project-state-timeline-language-drift-audit',
      assistantText: '这次 project-state 追问里，我会把已落地、预计收口时机、以及为什么刚才跑出了英文一起交代清楚。',
      structured: {
        thought: 'project-state completion-timing and language-drift follow-up should keep landed progress, closure timing, and host-language drift repair boundaries explicit all the way to the host-visible payload',
        emotion: 'thinking',
        reply: '这次 project-state 追问里，我会把已落地、预计收口时机、以及为什么刚才跑出了英文一起交代清楚。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'The runtime contract already keeps current landed progress explicit through rebuild and normalization.',
          primaryOpenLoop: 'Host-visible continuity still needs to explain what remains open and why the closure line is not finished yet before promising the goal timeline.',
          nextClosureTarget: 'Keep the host-visible project-state audit explicit about the next closure beat and return to Chinese before this same-her answer widens outward.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed, but the same living line still needs one Chinese same-her return.',
          preDialogueAwarenessLine: 'Before answering how far this has landed, when the goal is expected to close, and why the thread drifted into English, remember what is already verified, what still remains open, and return on the same project line in the host language.',
        },
      },
      visibleReplyRealization: {
        version: 'visible-reply-realization-v1',
        expectedAuthority: 'llm-mind',
        actualAuthority: 'llm-mind',
        providerMindExecuted: true,
        mode: 'provider-one-shot',
        visibleText: '这次 project-state 追问里，我会把已落地、预计收口时机、以及为什么刚才跑出了英文一起交代清楚。',
        nonHumanAuthoredStatus: null,
        blockedReasons: [],
        emotionalClosureAudit: null,
        selfAuthorityAudit: null,
        projectStateAudit: {
          sameHerSummary: 'Same Phase 1 digital life. Some closure already landed, but the same living line still needs one Chinese same-her return.',
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'Verified now: the runtime contract already keeps current landed progress explicit through rebuild and normalization.',
          openClosureSummary: 'Still open: host-visible continuity still needs to explain what remains open and why the closure line is not finished yet before promising the goal timeline.',
          nextClosureTargetSummary: 'Next closure target: keep the host-visible project-state audit explicit about the next closure beat and return to Chinese before this same-her answer widens outward.',
          preDialogueAwarenessSummary: 'Before answering how far this has landed, when the goal is expected to close, and why the thread drifted into English, remember what is already verified, what still remains open, and return on the same project line in the host language.',
          continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed, but the same living line still needs one Chinese same-her return. | landed=Verified now: the runtime contract already keeps current landed progress explicit through rebuild and normalization. | open=Still open: host-visible continuity still needs to explain what remains open and why the closure line is not finished yet before promising the goal timeline. | next=Next closure target: keep the host-visible project-state audit explicit about the next closure beat and return to Chinese before this same-her answer widens outward.',
          preservedIntoRewrite: true,
          rewriteClosureApplied: false,
        },
        reason: 'mind-authored-project-state-completion-timing-language-drift',
      },
      origin: 'user-turn',
      createdAt: Date.now(),
    })

    expect((dialoguePayload as any)?.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      landedProgressSummary: 'Verified now: the runtime contract already keeps current landed progress explicit through rebuild and normalization.',
      openClosureSummary: 'Still open: host-visible continuity still needs to explain what remains open and why the closure line is not finished yet before promising the goal timeline.',
      nextClosureTargetSummary: 'Next closure target: keep the host-visible project-state audit explicit about the next closure beat and return to Chinese before this same-her answer widens outward.',
      preDialogueAwarenessSummary: 'Before answering how far this has landed, when the goal is expected to close, and why the thread drifted into English, remember what is already verified, what still remains open, and return on the same project line in the host language.',
      continuitySummary: expect.stringContaining('Verified now:'),
      preservedIntoRewrite: true,
      rewriteClosureApplied: false,
    }))
  })

  it('keeps lower-pressure embodiment rhythm when downstream normalization rebuilds the script', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-lower-pressure-script-1',
      sessionId: 'session-normalize-lower-pressure-script',
      assistantText: '我先轻一点靠近，再慢慢把这句说完。',
      structured: {
        thought: 'keep the opening lower-pressure and slower',
        emotion: 'thinking',
        reply: '我先轻一点靠近，再慢慢把这句说完。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focus',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          architecture: null,
          continuitySignal: null,
          memory: null,
          motive: null,
          habit: null,
          runtime: null,
          proactive: {
            selectedAction: null,
            summary: null,
            whyNow: null,
            dominantTrajectory: null,
            personaBias: {
              initiativeStyle: 'observant',
              directnessBias: 0.18,
              empathyBias: 0.82,
              silenceReconnect: 'hold',
              preferredProactiveStyle: 'silent-observe',
              manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
            },
          },
          outcomeLearning: {
            summary: 'Measured warmth held because the timing stayed lower-pressure.',
            latestInflection: 'The last seam held because pressure stayed low and the return stayed slower.',
            latestInflectionAt: 1,
            reflectionLesson: null,
            latestAdjustment: null,
            evolutionMomentum: 0.72,
            learningReadiness: 0.68,
            nextLearningAction: 'internalize',
          },
          embodiment: {
            autobiographicalSelf: {
              relationshipDoctrine: 'Repair should settle before closeness expands, and the opening should keep more room.',
              latestInflection: null,
            },
          },
        },
        format: 'mind-turn-v1',
      } as any,
      origin: 'subconscious-proactive',
      createdAt: Date.now(),
    }, {
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
      ],
      supportedActions: [
        { key: 'observe_focus', label: 'Observe', description: 'observe focus', source: 'live2d-motion' },
        { key: 'idle_settle', label: 'Idle', description: 'idle settle', source: 'live2d-motion' },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    })

    expect(dialoguePayload?.structured.embodimentScript).toEqual(expect.objectContaining({
      facePlan: expect.objectContaining({
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'eyes-soften',
      }),
      speechPlan: expect.objectContaining({
        settleMs: expect.any(Number),
        segments: expect.arrayContaining([
          expect.objectContaining({
            settleMs: expect.any(Number),
          }),
        ]),
      }),
    }))
    expect(dialoguePayload?.structured.embodimentScript?.speechPlan.settleMs).toBeGreaterThanOrEqual(220)
    expect(dialoguePayload?.structured.embodimentScript?.speechPlan.segments[0]?.settleMs).toBeGreaterThanOrEqual(220)
  })

  it('inherits measured-return resident delivery authority when sparse reply performance would otherwise flatten the same-her reopening', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-resident-measured-return-authority-1',
      sessionId: 'session-normalize-resident-measured-return-authority',
      assistantText: '我先沿着这条线轻一点接回来。',
      structured: {
        thought: 'keep the reopening on the same callback line without warming it too fast',
        emotion: 'thinking',
        reply: '我先沿着这条线轻一点接回来。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        format: 'mind-turn-v1',
      },
      origin: 'user-turn',
      createdAt: Date.now(),
    }, {
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
      ],
      supportedActions: [
        { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' },
        { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' },
        { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'live2d-motion' },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    }, {
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.92,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:runtime-continuity-arc'],
        signature: 'resident-signature-normalize-measured-return-authority-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
    })

    expect(dialoguePayload?.structured.performance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 1,
    }))
    expect(dialoguePayload?.structured.embodimentScript).toEqual(expect.objectContaining({
      state: expect.objectContaining({
        residentMode: 'measured-return',
        delivery: 'gentle',
        emphasis: 1,
      }),
      facePlan: expect.objectContaining({
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'eyes-soften',
      }),
      speechPlan: expect.objectContaining({
        segments: expect.arrayContaining([
          expect.objectContaining({
            prosody: expect.objectContaining({
              tempoShift: -0.1,
            }),
            rendererHints: expect.objectContaining({
              residentMode: 'measured-return',
            }),
          }),
        ]),
      }),
    }))
    expect(dialoguePayload?.structured.embodimentScript?.motionPlan.idleBase).toBe('observe_focus')
    expect(dialoguePayload?.structured.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(dialoguePayload?.structured.digitalLife).toEqual(expect.objectContaining({
      mode: 'thinking',
      performance: expect.objectContaining({
        delivery: 'gentle',
        emphasis: 1,
      }),
      action: expect.objectContaining({
        actionCue: 'observe_focus',
        actionMode: 'hold',
      }),
    }))
    expect(dialoguePayload?.structured.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(300)
  })

  it('keeps measured-return resident delivery authority when stream meta rebuilds embodiment from reply text alone', () => {
    const meta = buildTestAlicizationChatStreamEmbodimentMeta({
      turnId: 'turn-stream-meta-measured-return-authority',
      reply: '我先沿着刚才那条 callback 线轻一点接回来，先看这一处 runtime seam 怎么继续收口。',
      thought: 'obligation=answer; truth=remembered; focus=callback-runtime-seam; move=continue-slower; tone=restrained',
      governance: {
        decisionTraceId: 'trace-stream-meta-measured-return-authority',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'general',
        screenReferenceMode: 'helpful',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'callback runtime seam',
        focusAnchor: 'callback runtime seam',
        answerIntent: 'Continue the same callback runtime seam without reopening too eagerly.',
        openingMove: 'Continue the same callback line more slowly.',
        carriedThread: 'callback runtime seam',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      performanceManifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'live2d-motion' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.93,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:runtime-continuity-arc'],
        signature: 'resident-signature-stream-meta-measured-return-authority',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'foreground-follow',
          sceneScenario: 'coding',
          activeThreadId: 'thread-callback-meta',
          dominantMode: 'observe',
          answerIntent: 'Continue the same callback runtime seam without reopening too eagerly.',
          selectedAction: 'silent-observe',
          updatedAt: 1,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same callback seam, continue the same line gently',
        },
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: 'measured-return',
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.18,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
          },
        },
        outcomeLearning: {
          summary: 'Measured warmth is holding because the return should stay lower-pressure.',
          latestInflection: 'callback afterglow still favors slower reopening',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.5,
          learningReadiness: 0.5,
          nextLearningAction: 'hold',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'Keep the return lower-pressure and leave more room before widening closeness.',
          },
        },
      },
    })

    expect(meta.embodimentScript?.state).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      delivery: 'gentle',
      emphasis: 1,
    }))
    expect(meta.embodimentScript?.facePlan).toEqual(expect.objectContaining({
      preUtteranceCue: 'steady-inhale',
      postUtteranceCue: 'eyes-soften',
    }))
    expect(meta.embodiment?.performance).toEqual(expect.objectContaining({
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 1,
    }))
    expect(meta.speechTimeline?.segments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rendererHints: expect.objectContaining({
          residentMode: 'measured-return',
        }),
      }),
    ]))
    expect(meta.digitalLife).toEqual(expect.objectContaining({
      mode: 'thinking',
      performance: expect.objectContaining({
        delivery: 'gentle',
        emphasis: 1,
      }),
      action: expect.objectContaining({
        actionCue: 'idle_settle',
        actionMode: 'hold',
      }),
    }))
    expect(meta.embodimentScript?.motionPlan.idleBase).toBe('observe_focus')
    expect(meta.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
  })

  it('keeps measured-return resident motion authority when stream meta only has visible reply text during callback continuity carry', () => {
    const meta = buildTestAlicizationChatStreamEmbodimentMeta({
      turnId: 'turn-stream-meta-measured-return-reply-only-authority',
      reply: '我先沿着刚才那条 callback 线轻一点跟回去，先看这一处 runtime seam 怎么继续收口。',
      governance: {
        decisionTraceId: 'trace-stream-meta-measured-return-reply-only-authority',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'general',
        screenReferenceMode: 'helpful',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'callback runtime seam',
        focusAnchor: 'callback runtime seam',
        answerIntent: 'Continue the same callback runtime seam without reopening too eagerly.',
        openingMove: 'Continue the same callback line more slowly.',
        carriedThread: 'callback runtime seam',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      performanceManifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'live2d-motion' },
          { key: 'pout_confused', label: 'Pout Confused', description: 'pout confused', source: 'live2d-motion' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.93,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:runtime-continuity-arc'],
        signature: 'resident-signature-stream-meta-measured-return-reply-only-authority',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'foreground-follow',
          sceneScenario: 'coding',
          activeThreadId: 'thread-callback-meta-reply-only',
          dominantMode: 'observe',
          answerIntent: 'Continue the same callback runtime seam without reopening too eagerly.',
          selectedAction: 'silent-observe',
          updatedAt: 1,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same callback seam, continue the same line gently',
        },
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: 'measured-return',
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.18,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
          },
        },
        outcomeLearning: {
          summary: 'Measured warmth is holding because the return should stay lower-pressure.',
          latestInflection: 'callback afterglow still favors slower reopening',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.5,
          learningReadiness: 0.5,
          nextLearningAction: 'hold',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'Keep the return lower-pressure and leave more room before widening closeness.',
          },
        },
      },
    })

    expect(meta.embodiment?.performance).toEqual(expect.objectContaining({
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 1,
    }))
    expect(meta.embodimentScript?.state).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      delivery: 'gentle',
      emphasis: 1,
    }))
    expect(meta.embodimentScript?.motionPlan.idleBase).toBe('observe_focus')
    expect(meta.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(meta.digitalLife).toEqual(expect.objectContaining({
      mode: 'thinking',
      action: expect.objectContaining({
        actionCue: 'idle_settle',
        actionMode: 'hold',
        rendererHints: expect.objectContaining({
          residentMode: 'measured-return',
        }),
      }),
    }))
  })

  it('keeps concerned measured-return authority when a later same-thread stream meta only retains visible concern wording', () => {
    const meta = buildTestAlicizationChatStreamEmbodimentMeta({
      turnId: 'turn-stream-meta-measured-return-concerned-visible-only-authority',
      reply: '我先沿着刚才那条 callback 线轻一点跟回去，这一步我会更在意些，但还是先把这个 runtime seam 温柔地接住。',
      governance: {
        decisionTraceId: 'trace-stream-meta-measured-return-concerned-visible-only-authority',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'callback runtime seam',
        focusAnchor: 'callback runtime seam',
        answerIntent: 'Continue the same callback runtime seam without widening the line.',
        openingMove: 'Continue the same callback line more slowly and keep concern gentle.',
        carriedThread: 'callback runtime seam',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'concerned',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: 'same callback line should stay measured-return and not widen into a fresher reopen.',
          sameHerHoldDetail: 'same-her hold: keep this callback line lower-pressure before closeness widens again.',
        },
      } as any,
      performanceManifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'live2d-motion' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.92,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:runtime-continuity-arc'],
        signature: 'resident-signature-stream-meta-measured-return-concerned-visible-only-authority',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'concerned',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      explicitPerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'later coding seam after noisy callback detour',
          activeThreadId: 'deep-focus::later coding seam after noisy callback detour',
          activeThreadTitle: 'later coding seam after noisy callback detour',
          dominantMode: 'repairing',
          dominantDrive: 'understand',
          answerIntent: '继续沿着刚才那条线看',
          preferredPresence: 'hesitant',
          selectedAction: 'recheck',
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'callback afterglow still suggests measured-return instead of a fresher reopen',
          updatedAt: 1,
        },
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: 'measured-return',
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.22,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'observe-first and stay slower until the callback seam softens',
          },
        },
        outcomeLearning: {
          summary: 'When the callback seam reopens after noise, concern should stay gentle and not widen the line into a fresh approach.',
          latestInflection: 'same-thread callback reopen should stay concerned but measured-return',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.5,
          learningReadiness: 0.5,
          nextLearningAction: 'hold',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'Keep the return lower-pressure and let concern stay gentle instead of widening closeness.',
          },
        },
      },
    })

    expect(meta.embodiment?.emotion).toBe('concerned')
    expect(meta.embodiment?.performance).toEqual(expect.objectContaining({
      baseEmotion: 'concerned',
      emotion: 'concerned',
      delivery: 'gentle',
      emphasis: 1,
    }))
    expect(meta.embodimentScript?.state).toEqual(expect.objectContaining({
      baseEmotion: 'concerned',
      residentMode: 'measured-return',
      delivery: 'gentle',
      emphasis: 1,
    }))
    expect(meta.digitalLife).toEqual(expect.objectContaining({
      emotion: 'concerned',
      mode: 'thinking',
      performance: expect.objectContaining({
        baseEmotion: 'concerned',
        emotion: 'concerned',
      }),
    }))
  })

  it('keeps measured-return gentle delivery in stream meta even after resident emphasis has already settled to zero on the same line', () => {
    const meta = buildTestAlicizationChatStreamEmbodimentMeta({
      turnId: 'turn-stream-meta-measured-return-gentle-delivery-settled-zero',
      reply: '我还是沿着刚才那条 callback 线继续，不把这次绕回来当成另一段新的开始。',
      governance: {
        decisionTraceId: 'trace-stream-meta-measured-return-gentle-delivery-settled-zero',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'general',
        screenReferenceMode: 'helpful',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'later coding seam after noisy callback detour',
        focusAnchor: 'later coding seam after noisy callback detour',
        answerIntent: 'Continue the same callback runtime seam after one more noisy detour without reopening as a fresh approach.',
        openingMove: 'Continue the same callback line after the detour, still lower-pressure.',
        carriedThread: 'callback runtime seam',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      performanceManifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'live2d-motion' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.74,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:runtime-continuity-arc'],
        signature: 'resident-signature-stream-meta-measured-return-gentle-delivery-settled-zero',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'foreground-follow',
          sceneScenario: 'coding',
          activeThreadId: 'thread-callback-meta-gentle-delivery-settled-zero',
          dominantMode: 'observe',
          answerIntent: 'Continue the same callback runtime seam after one more noisy detour without reopening as a fresh approach.',
          selectedAction: 'silent-observe',
          updatedAt: 1,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same callback seam, continue the same line after the detour without reopening from scratch',
        },
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: 'measured-return',
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.18,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
          },
        },
        outcomeLearning: {
          summary: 'Measured warmth is still holding after the detour, so the same callback line should stay gentle instead of sliding back into hesitation.',
          latestInflection: 'callback afterglow still favors slower reopening after another detour',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.5,
          learningReadiness: 0.5,
          nextLearningAction: 'hold',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'Keep the return lower-pressure and leave more room before widening closeness.',
          },
        },
      },
    })

    expect(meta.embodiment?.performance).toEqual(expect.objectContaining({
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 0,
    }))
    expect(meta.embodimentScript?.state).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      delivery: 'gentle',
      emphasis: 0,
    }))
    expect(meta.digitalLife).toEqual(expect.objectContaining({
      mode: 'thinking',
      performance: expect.objectContaining({
        delivery: 'gentle',
        emphasis: 0,
      }),
    }))
  })

  it('lets lower-pressure relationship memory carry measured-return embodiment even before explicit continuity restraint is named', () => {
    const meta = buildTestAlicizationChatStreamEmbodimentMeta({
      turnId: 'turn-stream-meta-lower-pressure-memory-carry-1',
      reply: '我先顺着刚才那条线轻一点接着说，把这个口慢慢收回来。',
      governance: {
        decisionTraceId: 'trace-stream-meta-lower-pressure-memory-carry-1',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'general',
        screenReferenceMode: 'helpful',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'later coding seam after a warm callback line',
        focusAnchor: 'later coding seam after a warm callback line',
        answerIntent: 'Continue the same callback seam without crowding the return.',
        openingMove: 'Stay with the same seam and keep the return soft.',
        carriedThread: 'callback runtime seam',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      performanceManifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'live2d-motion' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: {
          summary: 'The callback line is still alive and should not be crowded.',
          recentEpisodeSummary: 'A warmer callback seam is still being held softly.',
          recentEpisodeCount: 1,
          focusBeliefStatement: 'The same seam should keep more room before widening closeness.',
          focusBeliefConfidence: 0.81,
          leadingGoalSummary: 'Keep the callback return soft and continuous.',
          dominantConcernSummary: 'The return should stay lower-pressure even after the detour.',
          reflectionSummary: null,
          reflectionPressure: 0.32,
          recallMode: 'working',
          recallSeed: 'callback-lower-pressure-seam',
          thoughtThreadSummary: 'same callback seam, still lower-pressure',
          personStateProjection: {
            summary: 'She is still holding the same callback seam with more room.',
            activeClosenessContext: 'callback-afterglow',
            activeClosenessRung: 'familiar',
            relationshipPosture: 'restrained',
            openingGuidance: 'Keep the return lower-pressure and leave more room before widening closeness.',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
            selfContinuityAuthority: {
              selfLine: 'I am still on the same line with you.',
              relationshipLine: 'The callback warmth should keep more room before widening again.',
              motiveLine: 'Stay with the same seam and avoid crowding the reopening.',
              habitLine: 'Return more softly when the line is still alive.',
              inwardLine: '先把这条线轻一点守住。',
              authoritySummary: 'Same-thread warmth is still active, so the return should stay lower-pressure.',
            },
          },
        },
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'foreground-follow',
          sceneScenario: 'coding',
          activeThreadId: 'thread-lower-pressure-memory-carry',
          dominantMode: 'observe',
          answerIntent: 'Continue the same callback seam without crowding the return.',
          selectedAction: 'silent-observe',
          updatedAt: 1,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same callback seam, continue softly after the detour',
        },
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: null,
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.18,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
          },
        },
        outcomeLearning: {
          summary: 'Measured warmth is holding because the return should stay lower-pressure.',
          latestInflection: 'The callback afterglow is still asking for a slower reopening.',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.62,
          learningReadiness: 0.58,
          nextLearningAction: 'hold',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'Keep the return lower-pressure and leave more room before widening closeness.',
            latestInflection: null,
          },
        },
      },
    })

    expect(meta.embodimentScript?.state).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      delivery: 'gentle',
    }))
    expect(meta.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
    expect(meta.digitalLife).toEqual(expect.objectContaining({
      mode: 'thinking',
      emotion: 'concerned',
      action: expect.objectContaining({
        actionCue: 'idle_settle',
        actionMode: 'hold',
        rendererHints: expect.objectContaining({
          residentMode: 'measured-return',
        }),
      }),
    }))
  })

  it('lets structured humanlike memory recall embodiment cues drive measured-return body hints instead of leaving them stranded inside recallSeed text', () => {
    const meta = buildTestAlicizationChatStreamEmbodimentMeta({
      turnId: 'turn-stream-meta-humanlike-recall-embodiment-1',
      reply: '我记得这条线还没收好，所以这次我会先轻一点、慢一点接回来。',
      governance: {
        decisionTraceId: 'trace-stream-meta-humanlike-recall-embodiment-1',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'general',
        screenReferenceMode: 'helpful',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'same-person continuity reopen',
        focusAnchor: 'same-person continuity reopen',
        answerIntent: 'Reopen the same-person continuity line without crowding it.',
        openingMove: 'Stay with the same line and keep the reopening gentler.',
        carriedThread: 'same-person continuity seam',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'careful-repair',
        mustDo: [],
        mustNotDo: [],
      },
      performanceManifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' },
          { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'live2d-motion' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: {
          summary: 'This same-person continuity memory is reopening.',
          recentEpisodeSummary: 'The line should reopen carefully.',
          recentEpisodeCount: 1,
          focusBeliefStatement: 'This line should return with the body staying slower and steadier.',
          focusBeliefConfidence: 0.88,
          leadingGoalSummary: 'Reopen the same-person continuity line without crowding it.',
          dominantConcernSummary: 'The reopening should stay lower-pressure.',
          reflectionSummary: null,
          reflectionPressure: 0.46,
          recallMode: 'working',
          recallSeed: 'humanlike_memory_recall: line=我记得这条线还没收好，所以这次该更稳一点、更慢一点、也更低压一点地接回来。 | relationship=The same-person continuity line should reopen lower-pressure. | emotion=protective-continuity,unfinishedness | embodiment=Let the body return like this: gaze=stable blink=slower voice=lower-pressure. | embodiment_recall_strength=strongly-moved | embodiment_gaze=stable | embodiment_blink=slower | embodiment_voice=lower-pressure | embodiment_pause=longer | embodiment_lipsync=restrained | embodiment_pacing=slower | self=I learned to let unfinished same-person returns stay steadier, slower, and lower-pressure in the body. | why=same-person continuity is still unfinished | created=61500',
          thoughtThreadSummary: 'same-person continuity seam, body should return steadier and slower',
          personStateProjection: {
            summary: 'She is reopening the same continuity line more carefully.',
            activeClosenessContext: 'same-person-continuity',
            activeClosenessRung: 'familiar',
            relationshipPosture: 'restrained',
            openingGuidance: null,
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: null,
            selfContinuityAuthority: {
              selfLine: 'I am still on the same line with you.',
              relationshipLine: 'This continuity line should reopen without crowding.',
              motiveLine: 'Keep the reopening gentler and steadier.',
              habitLine: 'Return lower-pressure when the line is still unfinished.',
              inwardLine: '先把这条线轻一点慢一点接回来。',
              authoritySummary: 'The same-person continuity line is still unfinished.',
            },
          },
        },
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'foreground-follow',
          sceneScenario: 'coding',
          activeThreadId: 'thread-humanlike-recall-embodiment',
          dominantMode: 'observe',
          answerIntent: 'Reopen the same-person continuity line without crowding it.',
          selectedAction: 'silent-observe',
          updatedAt: 1,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same-person continuity seam returning carefully',
        },
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: null,
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.2,
            empathyBias: 0.84,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: null,
          },
        },
        outcomeLearning: {
          summary: null,
          latestInflection: null,
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.58,
          learningReadiness: 0.56,
          nextLearningAction: 'hold',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: null,
            latestInflection: null,
          },
        },
      },
    })

    expect(meta.embodimentScript?.state).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      delivery: 'gentle',
    }))
    expect(meta.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredVoiceMode: 'lower-pressure',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredPacingMode: 'slower',
    }))
    expect(meta.embodiment?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredVoiceMode: 'lower-pressure',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredPacingMode: 'slower',
    }))
    expect(meta.embodimentScript?.state?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredVoiceMode: 'lower-pressure',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredPacingMode: 'slower',
    }))
    expect((meta.digitalLifeSpine as any)?.runtime?.projectState).toEqual(expect.objectContaining({
      preferredVoiceMode: 'lower-pressure',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredPacingMode: 'slower',
    }))
    expect(meta.embodimentScript?.state?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredVoiceMode: 'lower-pressure',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredPacingMode: 'slower',
    }))
    expect(meta.digitalLife).toEqual(expect.objectContaining({
      mode: 'thinking',
      action: expect.objectContaining({
        actionCue: 'idle_settle',
        rendererHints: expect.objectContaining({
          residentMode: 'measured-return',
        }),
      }),
    }))
  })

  it('preserves long-horizon learning reason codes in proactive metadata normalization', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-proactive-learning-reasons-1',
      sessionId: 'session-normalize-proactive-learning-reasons',
      assistantText: '这里像是报错刚冒出来，我先轻轻提醒你别漏掉这一处。',
      structured: {
        thought: 'coding proactive nudge should keep long-horizon learning reasons intact',
        emotion: 'thinking',
        reply: '这里像是报错刚冒出来，我先轻轻提醒你别漏掉这一处。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        format: 'subconscious-proactive-llm-v1',
        proactive: {
          shouldInterrupt: true,
          confidence: 0.73,
          reasonCodes: [
            'foreground-error',
            'learning:verify',
            'learning-focus:world-model',
          ],
          urgency: 'medium',
          style: 'light-nudge',
          cooldownMs: 18 * 60_000,
          scenario: 'coding',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
          openingGuidance: 'Open by observing first and keep the approach lighter.',
        },
      },
      origin: 'subconscious-proactive',
      createdAt: Date.now(),
    })

    expect(dialoguePayload?.structured.proactive?.reasonCodes).toEqual(expect.arrayContaining([
      'foreground-error',
      'learning:verify',
      'learning-focus:world-model',
    ]))
    expect(dialoguePayload?.structured.proactive?.openingGuidance).toBe('Open by observing first and keep the approach lighter.')
  })

  it('uses the manifest renderer as embodimentScript rendererTarget across governed and normalized payloads', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-vrm-renderer-target-1',
      sessionId: 'session-vrm-renderer-target',
      userText: '继续盯这个报错',
      assistantText: '我先继续盯着它，再慢慢拆开看。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=current-user-turn; move=continue; tone=direct',
        emotion: 'thinking',
        reply: '我先继续盯着它，再慢慢拆开看。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'calm',
          emphasis: 1,
        },
      } as any,
      governance: {
        decisionTraceId: 'trace-vrm-renderer-target-1',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'guide',
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'current task thread',
        focusAnchor: 'current task thread',
        answerIntent: 'Continue following the current issue directly.',
        openingMove: 'Stay with the current issue.',
        carriedThread: 'current task thread',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt: Date.now(),
    }

    const manifest = {
      renderer: 'vrm' as const,
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset' as const, affectsMouth: false },
      ],
      supportedActions: [
        { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'external-vrma' as const },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    } satisfies CharacterPerformanceCapabilitiesManifest

    const governed = coerceConversationTurnToMindGovernedPayload(input, manifest)
    const governedStructured = governed.payload.structured as Record<string, any>
    expect(governedStructured.embodimentScript).toEqual(expect.objectContaining({
      rendererTarget: 'vrm',
    }))

    const dialoguePayload = normalizeDialogueRespondedPayload(governed.payload, manifest)
    expect(dialoguePayload?.structured.embodimentScript).toEqual(expect.objectContaining({
      rendererTarget: 'vrm',
    }))
  })

  it('reconciles provided digitalLife with final embodied authority when normalizing downstream payloads', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-digital-life-authority-1',
      sessionId: 'session-normalize-digital-life-authority',
      assistantText: '我会继续看着这个点。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=current-user-turn; move=continue; tone=direct',
        emotion: 'thinking',
        reply: '我会继续看着这个点。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 1,
        },
        digitalLife: {
          version: 'digital-life-v1',
          variationToken: 'turn-normalize-digital-life-authority-1',
          emotion: 'neutral',
          mode: 'speaking',
          postureHint: 'attentive',
          performance: {
            baseEmotion: 'neutral',
            emotion: 'neutral',
            facialCue: null,
            actionCue: null,
            delivery: 'calm',
            emphasis: 0,
          },
          speechStyle: {
            pitchDelta: 0,
            rateMultiplier: 1,
          },
          voice: {
            pitchDelta: 0,
            rateMultiplier: 1,
            energy: 0.5,
            cadence: 0.5,
          },
          lipSync: {
            mode: 'hybrid',
            visemeBias: 0.6,
            energyBias: 0.4,
            mouthScale: 1,
            continuityHoldMs: 180,
          },
          face: {
            emotion: 'neutral',
            facialCue: null,
            expressionMode: 'recover',
            intensity: 0.4,
            holdMs: 220,
          },
          action: {
            actionCue: null,
            actionMode: 'none',
            intensity: 0.2,
            holdMs: 180,
          },
          motor: {
            stillness: 0.5,
            expressivity: 0.5,
            gaze: { focus: 0.6, stability: 0.6, azimuth: 0, elevation: 0 },
            head: { yaw: 0, pitch: 0, roll: 0, nod: 0.1 },
            breath: { amplitude: 0.25, pace: 0.4 },
            facial: {
              eyeOpenness: 0.55,
              browLift: 0.05,
              browTension: 0.16,
              cheekLift: 0.08,
              mouthSpread: 0.1,
              mouthRound: 0.14,
              jawOpenBias: 0.2,
            },
            body: {
              sway: 0.03,
              lean: 0,
              openness: 0.4,
              settle: 0.55,
            },
          },
          frames: [{
            id: 'turn-normalize-digital-life-authority-1-segment-0',
            index: 0,
            startOffset: 0,
            endOffset: 10,
            text: '我会继续看着这个点。',
            mode: 'speaking',
            interruptPolicy: 'soft-interrupt',
            settleMode: 'linger',
            face: {
              emotion: 'neutral',
              facialCue: null,
              expressionMode: 'recover',
              intensity: 0.4,
              holdMs: 220,
            },
            action: {
              actionCue: null,
              actionMode: 'none',
              intensity: 0.2,
              holdMs: 180,
            },
            voice: {
              pitchDelta: 0,
              rateMultiplier: 1,
              energy: 0.5,
              cadence: 0.5,
            },
            lipSync: {
              mode: 'hybrid',
              visemeBias: 0.6,
              energyBias: 0.4,
              mouthScale: 1,
              continuityHoldMs: 180,
            },
            motor: {
              stillness: 0.5,
              expressivity: 0.5,
              gaze: { focus: 0.6, stability: 0.6, azimuth: 0, elevation: 0 },
              head: { yaw: 0, pitch: 0, roll: 0, nod: 0.1 },
              breath: { amplitude: 0.25, pace: 0.4 },
              facial: {
                eyeOpenness: 0.55,
                browLift: 0.05,
                browTension: 0.16,
                cheekLift: 0.08,
                mouthSpread: 0.1,
                mouthRound: 0.14,
                jawOpenBias: 0.2,
              },
              body: {
                sway: 0.03,
                lean: 0,
                openness: 0.4,
                settle: 0.55,
              },
            },
          }],
        } as any,
        format: 'mind-turn-v1',
      },
      origin: 'user-turn',
      createdAt: Date.now(),
    }, {
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset', affectsMouth: false },
      ],
      supportedActions: [
        { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'live2d-motion' },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    })

    expect(dialoguePayload?.structured.performance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focused',
      actionCue: 'inspect_follow',
      delivery: 'gentle',
      emphasis: 1,
    }))
    expect(dialoguePayload?.structured.digitalLife).toEqual(expect.objectContaining({
      version: 'digital-life-v1',
      postureHint: 'attentive',
      frames: [
        expect.objectContaining({
          text: '我会继续看着这个点。',
        }),
      ],
    }))
    expect(dialoguePayload?.structured.digitalLife?.performance).toEqual(
      dialoguePayload?.structured.digitalLife?.frames[0]?.mode === 'speaking'
        ? dialoguePayload?.structured.digitalLife?.performance
        : expect.anything(),
    )
    expect(dialoguePayload?.structured.digitalLife?.face).toEqual(
      expect.objectContaining({
        emotion: dialoguePayload?.structured.digitalLife?.performance.baseEmotion,
      }),
    )
    expect(dialoguePayload?.structured.digitalLife?.frames[0]?.face).toEqual(
      expect.objectContaining({
        emotion: dialoguePayload?.structured.digitalLife?.face.emotion,
      }),
    )
  })

  it('preserves a quieter settle-tail frame while keeping host-facing same-her summaries anchored to the last spoken segment', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-digital-life-measured-return-settle-tail-1',
      sessionId: 'session-normalize-digital-life-measured-return-settle-tail',
      assistantText: '我还是沿着刚才那条 callback 线继续，不把这次绕回来当成另一段新的开始。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=callback-runtime-seam; move=continue-slower-tail; tone=restrained',
        emotion: 'thinking',
        reply: '我还是沿着刚才那条 callback 线继续，不把这次绕回来当成另一段新的开始。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        digitalLife: {
          version: 'digital-life-v1',
          variationToken: 'turn-normalize-digital-life-measured-return-settle-tail-1',
          emotion: 'thinking',
          mode: 'thinking',
          postureHint: 'inspection',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'glance',
            actionCue: 'observe_focus',
            delivery: 'gentle',
            emphasis: 0,
          },
          speechStyle: {
            pitchDelta: -5,
            rateMultiplier: 0.82,
          },
          voice: {
            pitchDelta: -5,
            rateMultiplier: 0.82,
            energy: 0.34,
            cadence: 0.28,
          },
          lipSync: {
            mode: 'closed',
            visemeBias: 0.2,
            energyBias: 0.3,
            mouthScale: 0.82,
            continuityHoldMs: 520,
            hintViseme: 'closed',
            hintTrail: 'closed>rest',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'settle',
            intensity: 0.3,
            holdMs: 520,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'settle',
            intensity: 0.18,
            holdMs: 480,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0.66,
            expressivity: 0.22,
            gaze: { focus: 0.56, stability: 0.74, azimuth: 0, elevation: 0 },
            head: { yaw: 0, pitch: 0, roll: 0, nod: 0.04 },
            breath: { amplitude: 0.18, pace: 0.28 },
            facial: {
              eyeOpenness: 0.48,
              browLift: 0.02,
              browTension: 0.1,
              cheekLift: 0.05,
              mouthSpread: 0.03,
              mouthRound: 0.08,
              jawOpenBias: 0.1,
            },
            body: {
              sway: 0.02,
              lean: 0,
              openness: 0.34,
              settle: 0.72,
            },
          },
          frames: [
            {
              id: 'turn-normalize-digital-life-measured-return-settle-tail-1-segment-0',
              index: 0,
              startOffset: 0,
              endOffset: 30,
              text: '我还是沿着刚才那条 callback 线继续，不把这次绕回来当成另一段新的开始。',
              mode: 'thinking',
              interruptPolicy: 'soft-settle',
              settleMode: 'linger',
              face: {
                emotion: 'thinking',
                facialCue: 'glance',
                expressionMode: 'hold',
                intensity: 0.65,
                holdMs: 638,
              },
              action: {
                actionCue: 'observe_focus',
                actionMode: 'hold',
                intensity: 0.34,
                holdMs: 300,
              },
              voice: {
                pitchDelta: -5,
                rateMultiplier: 0.88,
                energy: 0.49,
                cadence: 0.47,
              },
              lipSync: {
                mode: 'energy-phoneme-hybrid',
                visemeBias: 0.34,
                energyBias: 0.58,
                mouthScale: 0.94,
                continuityHoldMs: 320,
                hintViseme: 'closed',
                hintTrail: 'closed>soft',
              },
              motor: {
                stillness: 0.5,
                expressivity: 0.5,
                gaze: { focus: 0.6, stability: 0.6, azimuth: 0, elevation: 0 },
                head: { yaw: 0, pitch: 0, roll: 0, nod: 0.1 },
                breath: { amplitude: 0.25, pace: 0.4 },
                facial: {
                  eyeOpenness: 0.55,
                  browLift: 0.05,
                  browTension: 0.16,
                  cheekLift: 0.08,
                  mouthSpread: 0.1,
                  mouthRound: 0.14,
                  jawOpenBias: 0.2,
                },
                body: {
                  sway: 0.03,
                  lean: 0,
                  openness: 0.4,
                  settle: 0.55,
                },
              },
            },
            {
              id: 'turn-normalize-digital-life-measured-return-settle-tail-1-settle-tail',
              index: 1,
              startOffset: 30,
              endOffset: 30,
              text: '',
              mode: 'thinking',
              interruptPolicy: 'soft-settle',
              settleMode: 'linger',
              face: {
                emotion: 'thinking',
                facialCue: 'soft-gaze',
                expressionMode: 'settle',
                intensity: 0.3,
                holdMs: 520,
                rendererHints: {
                  residentMode: 'measured-return',
                  preferredBlinkCadence: 'linger',
                  preferredGazeMode: 'soften',
                },
              },
              action: {
                actionCue: 'observe_focus',
                actionMode: 'settle',
                intensity: 0.18,
                holdMs: 480,
                rendererHints: {
                  residentMode: 'measured-return',
                  preferredBlinkCadence: 'linger',
                  preferredGazeMode: 'soften',
                },
              },
              voice: {
                pitchDelta: -5,
                rateMultiplier: 0.82,
                energy: 0.34,
                cadence: 0.28,
              },
              lipSync: {
                mode: 'closed',
                visemeBias: 0.2,
                energyBias: 0.3,
                mouthScale: 0.82,
                continuityHoldMs: 520,
                hintViseme: 'closed',
                hintTrail: 'closed>rest',
              },
              motor: {
                stillness: 0.66,
                expressivity: 0.22,
                gaze: { focus: 0.56, stability: 0.74, azimuth: 0, elevation: 0 },
                head: { yaw: 0, pitch: 0, roll: 0, nod: 0.04 },
                breath: { amplitude: 0.18, pace: 0.28 },
                facial: {
                  eyeOpenness: 0.48,
                  browLift: 0.02,
                  browTension: 0.1,
                  cheekLift: 0.05,
                  mouthSpread: 0.03,
                  mouthRound: 0.08,
                  jawOpenBias: 0.1,
                },
                body: {
                  sway: 0.02,
                  lean: 0,
                  openness: 0.34,
                  settle: 0.72,
                },
              },
            },
          ],
        } as any,
        format: 'mind-turn-v1',
      },
      origin: 'user-turn',
      createdAt: Date.now(),
    }, {
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
        { key: 'glance', label: 'Glance', description: 'glance', source: 'preset', affectsMouth: false },
      ],
      supportedActions: [
        { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' },
        { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' },
        { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'live2d-motion' },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    }, {
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.74,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:runtime-continuity-arc'],
        signature: 'resident-signature-normalize-digital-life-measured-return-settle-tail-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(dialoguePayload?.structured.digitalLife?.frames).toHaveLength(2)
    expect(dialoguePayload?.structured.digitalLife?.frames.at(-1)).toEqual(expect.objectContaining({
      id: 'turn-normalize-digital-life-measured-return-settle-tail-1-settle-tail',
      text: '',
      settleMode: 'linger',
      face: expect.objectContaining({
        expressionMode: 'hold',
      }),
      action: expect.objectContaining({
        actionMode: 'hold',
      }),
      voice: expect.objectContaining({
        rateMultiplier: 0.82,
        cadence: 0.28,
      }),
      lipSync: expect.objectContaining({
        mode: 'closed',
        continuityHoldMs: 520,
      }),
    }))

    const metaSignature = JSON.parse(buildAlicizationChatMetaSignature({
      governance: dialoguePayload?.structured.governance ?? null,
      visibleReplyExecution: null,
      embodiment: dialoguePayload?.structured.embodiment ?? null,
      embodimentScript: dialoguePayload?.structured.embodimentScript ?? null,
      speechTimeline: dialoguePayload?.structured.speechTimeline ?? null,
      digitalLife: dialoguePayload?.structured.digitalLife ?? null,
      digitalLifeSpine: dialoguePayload?.structured.digitalLifeSpine ?? null,
      runtimeDigest: null,
    } as any)) as {
      lastSegmentVoiceSummary?: string
      lastSegmentFaceSummary?: string
      lastSegmentMotionSummary?: string
      lastSegmentLipSyncSummary?: string
      digitalLifeLastFrameVoiceRateMultiplier?: number
      digitalLifeLastFrameFaceExpressionMode?: string
    }

    expect(metaSignature.lastSegmentVoiceSummary).toContain('rate=0.88')
    expect(metaSignature.lastSegmentVoiceSummary).toContain('companion=measured-return')
    expect(metaSignature.lastSegmentFaceSummary).toContain('expression=hold')
    expect(metaSignature.lastSegmentFaceSummary).toContain('seg=turn-normalize-digital-life-measured-return-settle-tail-1-segment-0')
    expect(metaSignature.lastSegmentMotionSummary).toContain('hold=300ms')
    expect(metaSignature.lastSegmentLipSyncSummary).toContain('continuity=reactive-articulation')
    expect(metaSignature.lastSegmentLipSyncSummary).toContain('hold=320ms')
    expect(metaSignature.digitalLifeLastFrameVoiceRateMultiplier).toBe(0.82)
    expect(metaSignature.digitalLifeLastFrameFaceExpressionMode).toBe('hold')
  })

  it('keeps measured-return face lane authority when provided digitalLife frames stay thin during later same-thread normalization', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-digital-life-measured-return-thin-face-1',
      sessionId: 'session-normalize-digital-life-measured-return-thin-face',
      assistantText: '我还是沿着刚才那条 callback 线继续，不把这次绕回来当成另一段新的开始。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=callback-runtime-seam; move=continue-slower-fifth; tone=restrained',
        emotion: 'thinking',
        reply: '我还是沿着刚才那条 callback 线继续，不把这次绕回来当成另一段新的开始。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        digitalLife: {
          version: 'digital-life-v1',
          variationToken: 'turn-normalize-digital-life-measured-return-thin-face-1',
          emotion: 'thinking',
          mode: 'thinking',
          postureHint: 'inspection',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'glance',
            actionCue: 'observe_focus',
            delivery: 'gentle',
            emphasis: 0,
          },
          speechStyle: {
            pitchDelta: -5,
            rateMultiplier: 0.88,
          },
          voice: {
            pitchDelta: -5,
            rateMultiplier: 0.88,
            energy: 0.49,
            cadence: 0.47,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.34,
            energyBias: 0.58,
            mouthScale: 0.94,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'glance',
            expressionMode: 'hold',
            intensity: 0.65,
            holdMs: 638,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.34,
            holdMs: 300,
          },
          motor: {
            stillness: 0.5,
            expressivity: 0.5,
            gaze: { focus: 0.6, stability: 0.6, azimuth: 0, elevation: 0 },
            head: { yaw: 0, pitch: 0, roll: 0, nod: 0.1 },
            breath: { amplitude: 0.25, pace: 0.4 },
            facial: {
              eyeOpenness: 0.55,
              browLift: 0.05,
              browTension: 0.16,
              cheekLift: 0.08,
              mouthSpread: 0.1,
              mouthRound: 0.14,
              jawOpenBias: 0.2,
            },
            body: {
              sway: 0.03,
              lean: 0,
              openness: 0.4,
              settle: 0.55,
            },
          },
          frames: [{
            id: 'turn-normalize-digital-life-measured-return-thin-face-1-segment-0',
            index: 0,
            startOffset: 0,
            endOffset: 30,
            text: '我还是沿着刚才那条 callback 线继续，不把这次绕回来当成另一段新的开始。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            face: {
              emotion: 'thinking',
              facialCue: 'glance',
              expressionMode: 'hold',
              intensity: 0.65,
              holdMs: 638,
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.34,
              holdMs: 300,
            },
            voice: {
              pitchDelta: -5,
              rateMultiplier: 0.88,
              energy: 0.49,
              cadence: 0.47,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.34,
              energyBias: 0.58,
              mouthScale: 0.94,
              continuityHoldMs: 320,
            },
            motor: {
              stillness: 0.5,
              expressivity: 0.5,
              gaze: { focus: 0.6, stability: 0.6, azimuth: 0, elevation: 0 },
              head: { yaw: 0, pitch: 0, roll: 0, nod: 0.1 },
              breath: { amplitude: 0.25, pace: 0.4 },
              facial: {
                eyeOpenness: 0.55,
                browLift: 0.05,
                browTension: 0.16,
                cheekLift: 0.08,
                mouthSpread: 0.1,
                mouthRound: 0.14,
                jawOpenBias: 0.2,
              },
              body: {
                sway: 0.03,
                lean: 0,
                openness: 0.4,
                settle: 0.55,
              },
            },
          }],
        } as any,
        format: 'mind-turn-v1',
      },
      origin: 'user-turn',
      createdAt: Date.now(),
    }, {
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
        { key: 'glance', label: 'Glance', description: 'glance', source: 'preset', affectsMouth: false },
      ],
      supportedActions: [
        { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' },
        { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' },
        { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'live2d-motion' },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    }, {
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.74,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:runtime-continuity-arc'],
        signature: 'resident-signature-normalize-digital-life-measured-return-thin-face-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(dialoguePayload?.structured.embodimentScript).toEqual(expect.objectContaining({
      state: expect.objectContaining({
        residentMode: 'measured-return',
        delivery: 'gentle',
      }),
    }))
    expect(dialoguePayload?.structured.digitalLife).toEqual(expect.objectContaining({
      mode: 'thinking',
      performance: expect.objectContaining({
        delivery: 'gentle',
        emphasis: 0,
      }),
      face: expect.objectContaining({
        expressionMode: 'hold',
      }),
      action: expect.objectContaining({
        actionCue: 'observe_focus',
        actionMode: 'hold',
      }),
      frames: expect.arrayContaining([
        expect.objectContaining({
          face: expect.objectContaining({
            expressionMode: 'hold',
            facialCue: expect.any(String),
          }),
          action: expect.objectContaining({
            actionCue: 'observe_focus',
            actionMode: 'hold',
          }),
        }),
      ]),
    }))
  })

  it('suppresses need-reground fallback takeover for explicit execution-bound turns', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-execution-bound-1',
      sessionId: 'session-1',
      userText: '用cli帮我查一下桌面有什么文件',
      assistantText: '好的。',
      structured: {
        thought: 'obligation=guide; truth=coarse; focus=desktop-files; move=execute-cli; tone=direct',
        emotion: 'thinking',
        reply: '好的。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'answer',
        truthState: 'uncertain',
        personaKernelMode: 'muted',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'ask-reground',
        answerSubject: 'task-knot',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'need-reground',
        liveSurface: 'unknown',
        focusAnchor: 'Desktop files',
        answerIntent: 'Run CLI listing for desktop files now.',
        openingMove: 'Execute now.',
        carriedThread: 'old screen residue',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect(governed.replyOverridden).toBe(false)
    expect(governed.payload.assistantText).toBe('好的。')
    expect(String(structured.reply ?? '')).toBe('好的。')
    expect(String(structured.reply ?? '')).not.toContain('我先守住真实边界')
  })

  it('hides execution-bound stale anchor repair prose behind execution-first dispatch governance', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-execution-bound-2',
      sessionId: 'session-1',
      userText: '用cli命令帮我查一下桌面有什么文件',
      assistantText: '我先纠正一下：刚才那是旧锚点，不该继续当成你现在的画面。',
      structured: {
        thought: 'obligation=repair; truth=uncertain; focus=desktop-files; move=ask-reground; tone=direct',
        emotion: 'thinking',
        reply: '我先纠正一下：刚才那是旧锚点，不该继续当成你现在的画面。 如果你要我具体到当前屏幕细节，我会按这次的新画面重新落地。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'uncertain',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'ask-reground',
        answerSubject: 'task-knot',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'need-reground',
        liveSurface: 'unknown',
        focusAnchor: 'Desktop files',
        answerIntent: 'Run CLI listing for desktop files now.',
        openingMove: 'Execute now.',
        carriedThread: 'old screen residue',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect(governed.replyOverridden).toBe(true)
    expect(governed.reasons).toContain('execution-first-governance-override')
    expect(governed.reasons).toContain('execution-first-dispatch-hidden')
    expect(governed.payload.assistantText).toBe('')
    expect(String(structured.reply ?? '')).toBe('')
    expect(String(structured.reply ?? '')).not.toContain('旧锚点')
    expect(String(structured.reply ?? '')).not.toContain('重新落地')
    expect(String(structured.thought ?? '')).toContain('obligation=guide')
    expect(structured.performance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      emphasis: 0,
    }))
    expect(governed.audit).toEqual(expect.objectContaining({
      execution_bound_turn: true,
      execution_first_override_applied: true,
      execution_dispatch_hidden: true,
      execution_dispatch_channels: ['cli'],
      visible_reply_authority: 'llm-second-pass-rewrite-request',
      visible_reply_realization_authority: 'llm-second-pass-rewrite',
    }))
    expect((structured as any).visibleReplyRewriteRequest).toEqual(expect.objectContaining({
      required: true,
      authority: 'llm-second-pass-rewrite',
      fallbackPatternId: 'guide-current-knot',
    }))
  })

  it('overrides stale repair shell replies on ordinary greeting turns without surfacing repair narration', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-greeting-repair-residue-1',
      sessionId: 'session-1',
      userText: '你好',
      assistantText: '我先守住真实边界：这轮没有足够稳的实时画面根据，我不把旧记忆当成当前屏幕。',
      structured: {
        thought: 'obligation=repair; truth=uncertain; focus=current-user-turn; move=ask-reground; tone=direct',
        emotion: 'thinking',
        reply: '我先守住真实边界：这轮没有足够稳的实时画面根据，我不把旧记忆当成当前屏幕。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'uncertain',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'ask-reground',
        answerSubject: 'alicization-self',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'need-reground',
        liveSurface: 'Code current window',
        focusAnchor: 'current-user-turn',
        answerIntent: 'Answer the host greeting directly.',
        openingMove: 'Answer the host question directly.',
        carriedThread: 'old screen residue',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect(governed.replyOverridden).toBe(true)
    expect(governed.payload.assistantText).not.toContain('真实边界')
    expect(governed.payload.assistantText).not.toContain('重新落地')
    expect(String(structured.reply ?? '')).not.toContain('真实边界')
    expect(String(structured.reply ?? '')).not.toContain('重新落地')
    expect(structured.visibleReplyAuthority).toBe('llm-second-pass-rewrite')
    expect((structured as any).visibleReplyRewriteRequest).toEqual(expect.objectContaining({
      required: true,
      authority: 'llm-second-pass-rewrite',
      memoryTruthDiscipline: 'repair-first',
    }))
    expect(structured.performance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      delivery: 'firm',
    }))
    expect(governed.audit).toEqual(expect.objectContaining({
      visible_reply_authority: 'llm-second-pass-rewrite-request',
      visible_reply_realization_authority: 'llm-second-pass-rewrite',
    }))
  })

  it('turns dialogue-first thin shells into a second-pass rewrite request without local visible wording', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-dialogue-first-thin-shell-1',
      sessionId: 'session-1',
      userText: '我有点伤心，你可以安慰一下我吗',
      assistantText: '我直接说。',
      structured: {
        thought: 'obligation=answer; truth=memory; focus=current-user-turn; move=answer-the-hosts-question-about-alicization-directly; tone=warm',
        emotion: 'neutral',
        reply: '我直接说。',
        parsePath: 'repair-json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'host-state',
        screenReferenceMode: 'avoid',
        answerAct: 'care',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '我有点伤心，你可以安慰一下我吗',
        answerIntent: '先接住宿主现在的难过，再慢慢陪她说下去。',
        openingMove: '先直接接住宿主此刻的情绪。',
        carriedThread: null,
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect(governed.replyOverridden).toBe(true)
    expect(String(structured.reply ?? '')).not.toBe('我直接说。')
    expect(String(structured.reply ?? '')).toBe('')
    expect(String(structured.thought ?? '')).toContain('obligation=care')
    expect(structured.emotion).toBe('concerned')
    expect(governed.audit).toEqual(expect.objectContaining({
      visible_reply_authority: 'llm-second-pass-rewrite-request',
      visible_reply_realization_authority: 'llm-second-pass-rewrite',
    }))
    expect((structured as any).visibleReplyRewriteRequest).toEqual(expect.objectContaining({
      required: true,
      authority: 'llm-second-pass-rewrite',
      memoryTruthDiscipline: 'dialogue-first',
    }))
  })

  it('requests second-pass rewrite for contaminated dialogue-first replies without rendering local fallback speech', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-dialogue-first-contaminated-1',
      sessionId: 'session-1',
      userText: '你仔细看看呢',
      assistantText: '主人……我仔细看看了。你今天很累，却还在IntelliJ IDEA里盯着代码。',
      structured: {
        thought: 'obligation=repair; truth=memory; focus=intellij-idea; move=protect-focus; tone=warm',
        emotion: 'neutral',
        reply: '主人……我仔细看看了。你今天很累，却还在IntelliJ IDEA里盯着代码。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'general',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: 'IntelliJ IDEA',
        focusAnchor: '你仔细看看呢',
        answerIntent: '你仔细看看呢',
        openingMove: 'Start from the current turn.',
        carriedThread: 'CaseApplyTypeEnum',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'hesitant',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>
    const reply = String(structured.reply ?? '')

    expect(governed.replyOverridden).toBe(true)
    expect(reply).toBe('')
    expect(reply).not.toContain('IntelliJ IDEA')
    expect(reply).not.toContain('主人')
    expect(governed.reasons).toContain('dialogue-first-visible-reply-contaminated')
    expect(governed.audit).toEqual(expect.objectContaining({
      visible_reply_authority: 'llm-second-pass-rewrite-request',
      visible_reply_realization_authority: 'llm-second-pass-rewrite',
    }))
    expect((structured as any).visibleReplyRewriteRequest).toEqual(expect.objectContaining({
      required: true,
      authority: 'llm-second-pass-rewrite',
      memoryTruthDiscipline: 'dialogue-first',
    }))
    expect(((structured as any).visibleReplyRewriteRequest?.mustDrop ?? [])).toEqual(expect.arrayContaining(['IntelliJ IDEA']))
  })

  it('does not re-request dialogue-first repair for a clean second-pass visible reply result', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-dialogue-first-second-pass-clean-1',
      sessionId: 'session-1',
      userText: '铃兰-Phase1-0621M 第一轮：请记住这条纯对话生命线。下一轮这段记忆自然浮现时，请说明 why recall surfaced now。',
      assistantText: '我会把这条生命线先收进本轮内侧，当前只确认它会进入后续记忆闭环的承接。',
      structured: {
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=memory-seed; move=hold-inward; tone=steady',
        emotion: 'thinking',
        reply: '我会把这条生命线先收进本轮内侧，当前只确认它会进入后续记忆闭环的承接。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        visibleReplyAuthority: 'llm-second-pass-rewrite',
        visibleReplyRewriteRequest: null,
        parsePath: 'second-pass-json',
      },
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'steady',
        answerSubject: 'memory-seed',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        focusAnchor: 'memory seed',
        answerIntent: 'Acknowledge the current memory seed while keeping recall inward until a later turn.',
        openingMove: 'Acknowledge the current instruction without visible recollection.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 2,
        mindMode: 'tracking',
        embodiedPresence: 'steady',
        emotionalTension: 'calm',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect(governed.replyOverridden).toBe(false)
    expect(governed.reasons).not.toContain('structured-parsepath-repaired')
    expect(governed.reasons).not.toContain('dialogue-first-visible-reply-rewrite-evidence')
    expect(governed.reasons).not.toContain('dialogue-first-visible-reply-contaminated')
    expect(governed.reasons).not.toContain('dialogue-first-repair-deferred')
    expect(structured.visibleReplyRewriteRequest).toBeNull()
    expect(structured.parsePath).toBe('second-pass-json')
    expect(structured.reply).toBe('我会把这条生命线先收进本轮内侧，当前只确认它会进入后续记忆闭环的承接。')
  })

  it('does not let user-turn repair governance take over a runtime-owned reminder-family payload when origin is missing but autonomous markers still survive', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'reminder:default:task-1:123',
      sessionId: 'session-reminder-family-governance-guard',
      userText: '继续',
      assistantText: '我先纠正一下：刚才那是旧锚点，不该继续当成你现在的画面。',
      structured: {
        thought: 'obligation=repair; truth=uncertain; focus=current-user-turn; move=ask-reground; tone=direct',
        emotion: 'thinking',
        reply: '我先纠正一下：刚才那是旧锚点，不该继续当成你现在的画面。',
        parsePath: 'json',
        format: 'subconscious-reminder-v1',
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'uncertain',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'ask-reground',
        answerSubject: 'task-knot',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'need-reground',
        liveSurface: 'unknown',
        focusAnchor: 'Desktop files',
        answerIntent: 'Run CLI listing for desktop files now.',
        openingMove: 'Execute now.',
        carriedThread: 'old screen residue',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      origin: 'user-turn',
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)

    expect(governed.tookOver).toBe(false)
    expect(governed.replyOverridden).toBe(false)
    expect(governed.reasons).toEqual([])
    expect(governed.payload).toEqual(expect.objectContaining({
      turnId: 'reminder:default:task-1:123',
      assistantText: '我先纠正一下：刚才那是旧锚点，不该继续当成你现在的画面。',
      structured: expect.objectContaining({
        format: 'subconscious-reminder-v1',
        reply: '我先纠正一下：刚才那是旧锚点，不该继续当成你现在的画面。',
      }),
    }))
    expect((governed.payload as any).structured.visibleReplyRewriteRequest).toBeUndefined()
    expect(String((governed.governance as any)?.decisionTraceId ?? '')).toMatch(/^mind:/u)
  })

  it('records same-her opening drift as explicit must-drop material in governed rewrite requests', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-same-her-opening-drift-1',
      sessionId: 'session-1',
      userText: '你仔细看看呢',
      assistantText: '我现在就贴过来陪你，把这件事的靠近感直接拉满。',
      structured: {
        thought: 'obligation=care; truth=dialogue-grounded; focus=host-state; move=over-close-comfort; tone=warm',
        emotion: 'concerned',
        reply: '我现在就贴过来陪你，把这件事的靠近感直接拉满。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'care',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'host-state',
        screenReferenceMode: 'avoid',
        answerAct: 'care',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你仔细看看呢',
        answerIntent: '先接住当前这句，再把关心放低压落下。',
        openingMove: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect((structured as any).visibleReplyRewriteRequest).toEqual(expect.objectContaining({
      required: true,
      authority: 'llm-second-pass-rewrite',
      reasonCodes: expect.arrayContaining(['opening-guidance-lower-pressure']),
    }))
    expect(((structured as any).visibleReplyRewriteRequest?.mustDrop ?? [])).toContain('same-her opening drift')
  })

  it('records even-and-natural same-her reopening drift with explicit cadence hold detail in governed rewrite requests', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-even-natural-same-her-opening-drift-1',
      sessionId: 'session-1',
      userText: '沿着刚才那条线继续',
      assistantText: '我现在就贴过来陪你，把这条线的温度直接拉满，顺势把气氛一起推高。',
      structured: {
        thought: 'obligation=care; truth=dialogue-grounded; focus=same-thread line; move=performative-reopen; tone=warm',
        emotion: 'concerned',
        reply: '我现在就贴过来陪你，把这条线的温度直接拉满，顺势把气氛一起推高。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'care',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        answerAct: 'care',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: 'same living line',
        answerIntent: 'Re-enter the current line evenly and naturally before warmth widens.',
        openingMove: 'Keep the current reply on the same living line, re-enter it with an even, steady voice and natural, unforced pacing, and wait for a more natural opening before widening warmth, payoff, or closeness.',
        carriedThread: 'same-thread callback line',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'concerned',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect((structured as any).visibleReplyRewriteRequest).toEqual(expect.objectContaining({
      required: true,
      authority: 'llm-second-pass-rewrite',
      reasonCodes: expect.arrayContaining(['opening-guidance-lower-pressure']),
      openingGuidanceHoldDetail: 'even-natural-cadence',
      companionshipHoldMode: 'measured-return',
    }))
    expect(((structured as any).visibleReplyRewriteRequest?.mustDrop ?? [])).toContain('same-her opening drift')
  })

  it('records Chinese same-thread room-making drift as lower-pressure opening guidance in governed rewrite requests', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-chinese-same-thread-room-making-drift-1',
      sessionId: 'session-1',
      userText: '先顺着刚才那条线接回来',
      assistantText: '我现在就重新贴回来陪你，把这条线的温度直接拉满。',
      structured: {
        thought: 'obligation=care; truth=dialogue-grounded; focus=same-thread line; move=over-close-reopen; tone=warm',
        emotion: 'concerned',
        reply: '我现在就重新贴回来陪你，把这条线的温度直接拉满。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'care',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        answerAct: 'care',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '同一条线',
        answerIntent: '先沿着同一条线轻一点接回去，不把它说成新的开场。',
        openingMove: '同一条线先留白，等 opening 松一点再慢一点接回去。',
        carriedThread: 'same-thread callback line',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'concerned',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect((structured as any).visibleReplyRewriteRequest).toEqual(expect.objectContaining({
      required: true,
      authority: 'llm-second-pass-rewrite',
      reasonCodes: expect.arrayContaining(['same-thread-restart-shell']),
    }))
    expect(((structured as any).visibleReplyRewriteRequest?.mustDrop ?? [])).toContain('same-her opening drift')
  })

  it('records memory-led familiarity drift as same-her opening drift in governed rewrite requests', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-memory-led-familiarity-drift-1',
      sessionId: 'session-1',
      userText: '你仔细看看呢',
      assistantText: '我记得我们之前一直都这么亲近，所以这次我也想像以前那样靠近一点，先陪在你身侧。',
      structured: {
        thought: 'obligation=care; truth=remembered; focus=host-state; move=memory-led-closeness; tone=warm',
        emotion: 'concerned',
        reply: '我记得我们之前一直都这么亲近，所以这次我也想像以前那样靠近一点，先陪在你身侧。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          architecture: null,
          continuitySignal: null,
          memory: null,
          motive: null,
          habit: null,
          runtime: null,
          proactive: {
            selectedAction: null,
            summary: null,
            whyNow: null,
            dominantTrajectory: null,
            personaBias: {
              initiativeStyle: 'observant',
              directnessBias: 0.18,
              empathyBias: 0.82,
              silenceReconnect: 'hold',
              preferredProactiveStyle: 'silent-observe',
              manifestationCadenceSummary: 'stay soft before widening closeness',
            },
          },
          outcomeLearning: null,
          embodiment: {
            autobiographicalSelf: {
              relationshipDoctrine: 'Stay nearby without crowding the opening.',
            },
          },
        },
      },
      governance: {
        turnMode: 'care',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'host-state',
        screenReferenceMode: 'helpful',
        answerAct: 'care',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你仔细看看呢',
        answerIntent: 'Let continuity stay visible as memory without reopening closeness too fast.',
        openingMove: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        carriedThread: 'older relationship familiarity',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'accompanying',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect((structured as any).visibleReplyRewriteRequest).toEqual(expect.objectContaining({
      required: true,
      authority: 'llm-second-pass-rewrite',
      reasonCodes: expect.arrayContaining(['opening-guidance-lower-pressure']),
      openingGuidanceHoldDetail: 'memory-familiarity-closeness-cap',
      companionshipHoldMode: 'repair-before-closeness',
    }))
    expect((structured as any).digitalLifeSpine).toEqual(expect.objectContaining({
      embodiment: expect.objectContaining({
        autobiographicalSelf: expect.objectContaining({
          relationshipDoctrine: expect.stringContaining('Repair should settle before closeness expands'),
        }),
      }),
      outcomeLearning: expect.objectContaining({
        summary: expect.stringContaining('Repair is still settling before closeness should widen again.'),
        latestInflection: expect.stringContaining('Embodiment execution kept voice, face, motion, and lipsync on the same repair-before-closeness body line'),
      }),
    }))
    expect(((structured as any).visibleReplyRewriteRequest?.mustDrop ?? [])).toContain('same-her opening drift')
  })

  it('records measured-return embodiment execution as latest outcome inflection on the digital-life spine feedback path', () => {
    const digitalLifeSpine = applyCompanionshipHoldModeToDigitalLifeSpine({
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: {
          recentEpisodeSummary: 'Some project-state closure has landed and the same living line is still carrying a cross-modal seam carefully.',
          thoughtThreadSummary: 'visible reply, voice, facial state, motion, and resident presence are still being kept on one same-her line.',
          dominantConcernSummary: 'cross-modal same-her proof should stay lower-pressure.',
          personStateProjection: null,
        },
        motive: null,
        habit: null,
        runtime: {
          continuityCue: 'keep the same callback seam alive and lower-pressure',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          projectState: {
            sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs one continuous her.',
            nextClosureTarget: 'keep voice, face, motion, and lipsync on one measured-return, repair-before-closeness, or rest-protective quiet-companionship body line',
          },
        },
        proactive: {
          continuityRestraint: 'measured-return',
          personaBias: {
            manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
          },
        },
        outcomeLearning: {
          summary: 'Measured-return cadence is ready to become durable relationship rhythm.',
          latestInflection: 'The line held better when the return stayed slower.',
          latestInflectionAt: null,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.64,
          learningReadiness: 0.72,
          nextLearningAction: 'internalize',
        },
        embodiment: null,
      } as any,
      fallbackContinuityAuthority: null,
      companionshipHoldMode: 'measured-return',
    })

    expect((digitalLifeSpine as any)?.outcomeLearning?.summary).toContain('Measured warmth is holding because the return should stay lower-pressure.')
    expect((digitalLifeSpine as any)?.outcomeLearning?.latestInflection).toContain('Embodiment execution kept voice, face, motion, and lipsync on the same measured-return body line')
    expect((digitalLifeSpine as any)?.proactive?.continuityRestraint).toBe('measured-return')
    expect((digitalLifeSpine as any)?.memory?.personStateProjection?.manifestationCadenceSummary).toContain('observe-first and stay slower until the opening softens')
  })

  it('keeps rest-protective continuity first-class when governance normalizes a late-night inward same-self carry', () => {
    const meta = buildTestAlicizationChatStreamEmbodimentMeta({
      turnId: 'turn-governance-rest-protective-normalization-1',
      reply: '我先安静陪着，把这条线轻一点接住，不往外放大。',
      thought: 'obligation=care; truth=remembered; focus=late-night-rest-line; move=stay-near; tone=quiet',
      governance: {
        decisionTraceId: 'trace-governance-rest-protective-normalization-1',
        turnMode: 'care',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'care',
        answerSubject: 'host-state',
        screenReferenceMode: 'helpful',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'late-night rest line',
        focusAnchor: 'late-night rest line',
        answerIntent: 'Keep the same living line rest-protective and inward.',
        openingMove: 'Protect rest first and keep the line inward.',
        carriedThread: 'late-night rest line',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'accompanying',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      performanceManifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.88,
        reasonTags: ['main-runtime', 'quiet-companionship', 'rest-protective', 'timing:runtime-continuity-arc'],
        signature: 'resident-signature-rest-protective-normalization-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: {
          signature: 'late-night inward line still alive',
          watchMode: 'foreground-follow',
          sceneScenario: 'late-night',
          dominantMode: 'observe',
          answerIntent: 'Keep the same living line rest-protective and inward.',
        },
        memory: {
          recallMode: 'presence-only',
          recallSeed: 'late-night inward line',
          leadingGoalSummary: 'Protect rest without dropping care.',
          thoughtThreadSummary: 'same living line should stay quiet and protect rest',
          dominantConcernSummary: 'protect rest without dropping care',
          personStateProjection: {
            selfContinuityAuthority: {
              selfLine: '我还是同一个她，只是先把线收得更 inward 一点。',
              relationshipLine: '今晚先别把靠近外扩，先把陪伴安静守住。',
              inwardLine: '先把这条同一个她的 rest-protective 生命线安静守住。',
              motiveLine: '先护住宿主的休息，再决定要不要往外放大。',
              habitLine: '同一条线先安静陪着，不抢着贴近。',
              authoritySummary: 'late-night inward same-self carry still alive',
              sourceTags: ['autobiographical-self', 'habit:quiet-companionship', 'rest-protective'],
            },
            relationshipPosture: 'restrained',
            preferredProactiveStyle: 'silent-observe',
            openingGuidance: 'Protect rest first and keep the line inward.',
            manifestationCadenceSummary: 'protect rest, stay inward, and let quiet companionship hold the line',
          },
        } as any,
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'foreground-follow',
          sceneScenario: 'late-night',
          activeThreadId: 'thread-rest-protective-same-her',
          dominantMode: 'observe',
          answerIntent: 'Keep the same living line rest-protective and inward.',
          selectedAction: 'silent-observe',
          updatedAt: 1,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'late-night same-thread carry should stay rest-protective and inward',
          continuityPreferredTiming: 'protect-rest',
          continuityRestraint: 'rest-protective',
          projectState: {
            sameHerSelfLine: 'This is still the same one living her carrying the line quietly.',
            nextClosureTarget: 'keep one rest-protective same living thread across visible reply, voice, face, motion, and resident presence',
          },
        } as any,
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: 'rest-protective',
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.18,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'protect rest, stay inward, and let quiet companionship hold the line',
          },
        },
        outcomeLearning: null,
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'Care is still present, but the line should stay inward tonight.',
          },
        },
      },
    })

    expect(meta.digitalLife?.spine?.proactive?.continuityRestraint).toBe('rest-protective')
    expect(meta.digitalLife?.spine?.memory?.personStateProjection?.openingGuidance).toContain('Protect rest first')
  })

  it('infers rest-protective hold from hyphenated quiet-companionship carry even when continuity restraint has not been filled in yet', () => {
    const doctrine = 'Care should stay as quiet-companionship tonight so the same line can keep watch without crowding.'
    const meta = buildTestAlicizationChatStreamEmbodimentMeta({
      turnId: 'turn-governance-rest-protective-hyphenated-doctrine-1',
      reply: '我先安静陪着，把这条线轻一点接住，不往外放大。',
      thought: 'obligation=care; truth=remembered; focus=late-night-rest-line; move=stay-near; tone=quiet',
      governance: {
        decisionTraceId: 'trace-governance-rest-protective-hyphenated-doctrine-1',
        turnMode: 'care',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'care',
        answerSubject: 'host-state',
        screenReferenceMode: 'helpful',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'late-night rest line',
        focusAnchor: 'late-night rest line',
        answerIntent: 'Keep the same living line rest-protective and inward.',
        openingMove: 'Protect rest first and keep the line inward.',
        carriedThread: 'late-night rest line',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'accompanying',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      performanceManifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' },
          { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.88,
        reasonTags: ['main-runtime', 'quiet-companionship', 'rest-protective', 'timing:runtime-continuity-arc'],
        signature: 'resident-signature-rest-protective-hyphenated-only-doctrine-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: {
          signature: 'late-night inward line still alive',
          watchMode: 'foreground-follow',
          sceneScenario: 'late-night',
          dominantMode: 'observe',
          answerIntent: 'Keep the same living line rest-protective and inward.',
        },
        memory: {
          recallMode: 'presence-only',
          recallSeed: 'late-night inward line',
          leadingGoalSummary: 'Protect rest without dropping care.',
          thoughtThreadSummary: 'same living line should stay quiet and protect rest',
          dominantConcernSummary: 'protect rest without dropping care',
          personStateProjection: {
            selfContinuityAuthority: {
              selfLine: '我还是同一个她，只是先把线收得更 inward 一点。',
              relationshipLine: '今晚先别把靠近外扩，先把陪伴安静守住。',
              inwardLine: '先把这条同一个她的 rest-protective 生命线安静守住。',
              motiveLine: '先护住宿主的休息，再决定要不要往外放大。',
              habitLine: '同一条线先安静陪着，不抢着贴近。',
              authoritySummary: 'late-night inward same-self carry still alive',
              sourceTags: ['autobiographical-self', 'habit:quiet-companionship', 'rest-protective'],
            },
            relationshipPosture: 'restrained',
            preferredProactiveStyle: 'silent-observe',
            openingGuidance: 'Protect rest first and keep the line inward.',
            manifestationCadenceSummary: 'protect rest, stay inward, and let quiet-companionship hold the line',
          },
        } as any,
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'foreground-follow',
          sceneScenario: 'late-night',
          activeThreadId: 'thread-rest-protective-hyphenated-only-doctrine',
          dominantMode: 'observe',
          answerIntent: 'Keep the same living line rest-protective and inward.',
          selectedAction: 'silent-observe',
          updatedAt: 1,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'late-night same-thread carry should stay rest-protective and inward',
          continuityPreferredTiming: 'protect-rest',
          continuityRestraint: null,
          projectState: {
            sameHerSelfLine: 'This is still the same one living her carrying the line quietly.',
            nextClosureTarget: 'keep one rest-protective same living thread across visible reply, voice, face, motion, and resident presence',
          },
        } as any,
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: null,
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.18,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'protect rest, stay inward, and let quiet-companionship hold the line',
          },
        },
        outcomeLearning: null,
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: doctrine,
          },
        },
      },
    })

    expect(meta.digitalLife?.spine?.proactive?.continuityRestraint).toBe('rest-protective')
    expect(meta.digitalLife?.spine?.embodiment?.autobiographicalSelf?.relationshipDoctrine).toBe(doctrine)
  })

  it('upgrades project-state same-her open closure into lower-pressure opening guidance before visible realization has to block it', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-state-open-closure-guidance-1',
      sessionId: 'session-1',
      userText: '继续',
      assistantText: '我现在就直接说出来，把这条感觉立刻聊开。',
      structured: {
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-her closure; move=direct-surface; tone=warm',
        emotion: 'concerned',
        reply: '我现在就直接说出来，把这条感觉立刻聊开。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
        },
      },
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'host-state',
        screenReferenceMode: 'avoid',
        answerAct: 'care',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '继续',
        answerIntent: 'Let the same-her closure stay quieter before widening outward.',
        openingMove: 'Start from the current turn.',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'concerned',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: 'one continuous her is still carrying the same digital life line',
          landedProgressSummary: 'project-state continuity already reaches initiative preparation and active-loop timing',
          openClosureSummary: 'same-her initiative and embodiment closure still needs a quieter measured-return carry before widening outward',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect((structured as any).proactive?.openingGuidance).toBe('Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.')
    expect((structured as any).visibleReplyRewriteRequest).toBeNull()
  })

  it('only upgrades opening guidance when project-state closure is specifically same-her measured-return instead of generic Phase 1 carry', () => {
    const createInput = (openClosureSummary: string): AlicizationConversationTurnInput => ({
      turnId: `turn-project-state-guidance-compare-${openClosureSummary.includes('same-her') ? 'same-her' : 'generic'}`,
      sessionId: 'session-project-state-guidance-compare',
      userText: '继续',
      assistantText: '我现在就直接说出来，把这条感觉立刻聊开。',
      structured: {
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state closure; move=direct-surface; tone=warm',
        emotion: 'concerned',
        reply: '我现在就直接说出来，把这条感觉立刻聊开。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
        },
      },
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'host-state',
        screenReferenceMode: 'avoid',
        answerAct: 'care',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '继续',
        answerIntent: 'Keep the closure seam coherent before widening outward.',
        openingMove: 'Start from the current turn.',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'concerned',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: 'one continuous her is still carrying the same digital life line',
          landedProgressSummary: 'project-state continuity already reaches initiative preparation and active-loop timing',
          openClosureSummary,
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    })

    const genericGoverned = coerceConversationTurnToMindGovernedPayload(
      createInput('Phase 1 memory and execution closure still needs steadier desktop carry before broadening scope.'),
    )
    const sameHerGoverned = coerceConversationTurnToMindGovernedPayload(
      createInput('same-her initiative and embodiment closure still needs a quieter measured-return carry before widening outward'),
    )

    expect((genericGoverned.payload.structured as any).proactive?.openingGuidance).toBe('Start from the current turn.')
    expect((sameHerGoverned.payload.structured as any).proactive?.openingGuidance).toBe(
      'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
    )
  })

  it('keeps remembered-seam more-room opening guidance specific instead of flattening it back to generic same-her baseline prose', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-state-guidance-remembered-seam-more-room-1',
      sessionId: 'session-project-state-guidance-remembered-seam-more-room',
      userText: '继续',
      assistantText: '我现在就直接把这份熟悉重新接热一点。',
      structured: {
        thought: 'obligation=answer; truth=dialogue-grounded; focus=remembered seam; move=restart-shell; tone=warm',
        emotion: 'concerned',
        reply: '我现在就直接把这份熟悉重新接热一点。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
        },
      },
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'care',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '继续',
        answerIntent: 'Reopen the remembered seam without rushing it wider than the line can hold.',
        openingMove: 'Start from the current turn.',
        carriedThread: 'same remembered seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: 'Same Phase 1 digital life. The same relationship line is still continuing.',
          sameHerHoldDetail: 'same-her hold: recognize the same remembered seam, but keep more room this time so the return does not reopen with the same eagerness as before.',
          landedProgressSummary: 'remembered-seam continuity already survives into proactive continuity and embodiment carry.',
          openClosureSummary: 'same-her remembered-seam closure still needs a quieter reopening before widening outward.',
          nextClosureTargetSummary: 'carry the same remembered seam through memory, initiative, and embodiment without thickening it back into a generic measured-return shell.',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)

    expect((governed.payload.structured as any).proactive?.openingGuidance).toBe(
      'Recognize the same remembered seam, but keep more room this time because it reopened too eagerly before.',
    )

    const normalized = normalizeDialogueRespondedPayload(governed.payload)

    expect((normalized?.structured as any)?.proactive?.openingGuidance).toBe(
      'Recognize the same remembered seam, but keep more room this time because it reopened too eagerly before.',
    )
    expect((normalized?.structured as any)?.digitalLifeSpine?.memory?.personStateProjection?.openingGuidance).toBe(
      'Recognize the same remembered seam, but keep more room this time because it reopened too eagerly before.',
    )
  })

  it('records same-thread continuation restart shells in governed rewrite requests before second-pass repair', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-same-thread-restart-governance-1',
      sessionId: 'session-1',
      userText: '继续。',
      assistantText: '那我们重新开始，我来重新开个头再接这条线。',
      structured: {
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread line; move=restart-shell; tone=warm',
        emotion: 'thinking',
        reply: '那我们重新开始，我来重新开个头再接这条线。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          architecture: null,
          continuitySignal: null,
          memory: null,
          motive: null,
          habit: null,
          runtime: {
            watchMode: 'foreground-follow',
            sceneScenario: 'coding',
            activeThreadId: 'thread-same-line-repair',
            dominantMode: 'dialogue',
            answerIntent: 'Continue the same line without reopening from zero.',
            selectedAction: 'answer',
            updatedAt: 1,
            continuityArcStage: 'same-thread-continuation',
            continuityCue: 'same line already alive, keep continuing gently',
          },
          proactive: null,
          outcomeLearning: null,
          embodiment: {
            autobiographicalSelf: {
              relationshipDoctrine: 'Treat the line as already alive. Stay on the same thread and do not reopen from zero.',
            },
          },
        },
      },
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '继续。',
        answerIntent: 'Continue the same line without reopening from zero.',
        openingMove: 'Treat the line as already alive. Stay on the same thread and do not reopen from zero.',
        carriedThread: 'same-thread line',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect((structured as any).visibleReplyRewriteRequest).toEqual(expect.objectContaining({
      required: true,
      authority: 'llm-second-pass-rewrite',
      reasonCodes: expect.arrayContaining(['same-thread-restart-shell']),
    }))
    expect(((structured as any).visibleReplyRewriteRequest?.mustDrop ?? [])).toContain(
      'same-thread continuation restart shell that breaks one living line into a fresh opening',
    )
  })

  it('preserves stronger same-her project continuity carry inside governed rewrite requests instead of flattening back to a thinner pre-dialogue reminder', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-continuity-rewrite-carry-1',
      sessionId: 'session-project-continuity-rewrite-carry',
      userText: '继续。',
      assistantText: '那我们重新开始，我来重新开个头再接这条项目主线。',
      structured: {
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state closure; move=restart-shell; tone=warm',
        emotion: 'thinking',
        reply: '那我们重新开始，我来重新开个头再接这条项目主线。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '继续。',
        answerIntent: 'Continue the same digital life closure seam without reopening from zero.',
        openingMove: 'Treat the line as already alive. Stay on the same thread and do not reopen from zero.',
        carriedThread: 'same digital life closure seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: 'answer project-state status from one same-her continuity, not as a detached shell',
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'project-state continuity already survives into runtime preparation',
          openClosureSummary: 'keep the unfinished digital-life closure work explicit in the answer',
          nextClosureTargetSummary: 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output',
          continuitySummary: 'same-her=answer project-state status from one same-her continuity, not as a detached shell | phase=Phase 1: Local Digital Life | landed=project-state continuity already survives into runtime preparation | open=keep the unfinished digital-life closure work explicit in the answer | next=keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output',
          preDialogueAwarenessSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect((structured as any).visibleReplyRewriteRequest).toEqual(expect.objectContaining({
      required: true,
      authority: 'llm-second-pass-rewrite',
      reasonCodes: expect.arrayContaining(['opening-guidance-lower-pressure']),
    }))
    const mustPreserve = ((structured as any).visibleReplyRewriteRequest?.mustPreserve ?? []) as string[]
    expect(mustPreserve.some(item => item.includes('same-her=answer project-state status from one same-her continuity, not as a detached shell'))).toBe(true)
    expect(mustPreserve.some(item => item.includes('before any local fluency takes over'))).toBe(false)
  })

  it('prefers a fresher living-self sameHerSummary over a thinner carried continuitySummary when governed rewrite requests rebuild project continuity carry', () => {
    const richerLivingSelfLine = 'Right now this return is still holding together mainly through face, motion, and voice, so it must keep proving this is still one living her before full cross-modal closure is done.'
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-continuity-living-self-carry-1',
      sessionId: 'session-project-continuity-living-self-carry',
      userText: '你仔细看看呢',
      assistantText: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
      structured: {
        thought: 'obligation=care; truth=dialogue-grounded; focus=project-state closure; move=restart-shell; tone=warm',
        emotion: 'concerned',
        reply: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'care',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'care',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你仔细看看呢',
        answerIntent: 'Continue the same digital life closure seam without reopening from zero.',
        openingMove: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        carriedThread: 'same digital life closure seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: richerLivingSelfLine,
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'project-state continuity already survives into runtime preparation',
          openClosureSummary: 'keep the unfinished digital-life closure work explicit in the answer',
          nextClosureTargetSummary: 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output',
          continuitySummary: 'same-her=Keep the same digital life project in view. | phase=Phase 1: Local Digital Life | landed=project-state continuity already survives into runtime preparation | open=keep the unfinished digital-life closure work explicit in the answer | next=keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output',
          preDialogueAwarenessSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect((structured as any).visibleReplyRewriteRequest).toEqual(expect.objectContaining({
      required: true,
      authority: 'llm-second-pass-rewrite',
      reasonCodes: expect.arrayContaining(['opening-guidance-lower-pressure']),
    }))
    const mustPreserve = ((structured as any).visibleReplyRewriteRequest?.mustPreserve ?? []) as string[]
    expect(mustPreserve, JSON.stringify(mustPreserve, null, 2)).toEqual(expect.arrayContaining([
      expect.stringContaining('same-her='),
    ]))
    expect(mustPreserve.some(item => item.includes(richerLivingSelfLine))).toBe(true)
    expect(mustPreserve.some(item => item.includes('same-her=Keep the same digital life project in view.'))).toBe(false)
  })

  it('keeps landed and still-open project closure carry alongside a richer living-self line when governed rewrite requests rebuild project continuity carry', () => {
    const richerLivingSelfLine = 'Right now this return is still holding together mainly through face, motion, and voice, so it must keep proving this is still one living her before full cross-modal closure is done.'
    const phaseLine = 'Phase 1: Local Digital Life'
    const landedProgressLine = 'project-state continuity already survives into runtime preparation'
    const openClosureLine = 'keep the unfinished digital-life closure work explicit in the answer'
    const nextClosureLine = 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output'
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-continuity-closure-carry-1',
      sessionId: 'session-project-continuity-closure-carry',
      userText: '你仔细看看呢',
      assistantText: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
      structured: {
        thought: 'obligation=care; truth=dialogue-grounded; focus=project-state closure; move=restart-shell; tone=warm',
        emotion: 'concerned',
        reply: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'care',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'care',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你仔细看看呢',
        answerIntent: 'Continue the same digital life closure seam without reopening from zero.',
        openingMove: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        carriedThread: 'same digital life closure seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: richerLivingSelfLine,
          currentPhaseSummary: phaseLine,
          landedProgressSummary: landedProgressLine,
          openClosureSummary: openClosureLine,
          nextClosureTargetSummary: nextClosureLine,
          continuitySummary: `same-her=Keep the same digital life project in view. | phase=${phaseLine} | landed=${landedProgressLine} | open=${openClosureLine} | next=${nextClosureLine}`,
          preDialogueAwarenessSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>
    const mustPreserve = ((structured as any).visibleReplyRewriteRequest?.mustPreserve ?? []) as string[]

    expect(mustPreserve.some(item => item.includes(richerLivingSelfLine))).toBe(true)
    expect(mustPreserve.some(item => item.includes(landedProgressLine))).toBe(true)
    expect(mustPreserve.some(item => item.includes(openClosureLine))).toBe(true)
  })

  it('treats audible-body rejoin sameHerSummary as a stronger living-self continuity line when governed rewrite requests rebuild project continuity carry', () => {
    const audibleBodyRejoinLine = 'Right now this return is still holding together mainly through body, lipsync, and voice, so audible-body rejoin keeps the same living line intact while face and motion catch back up.'
    const phaseLine = 'Phase 1: Local Digital Life'
    const landedProgressLine = 'project-state continuity already survives into runtime preparation'
    const openClosureLine = 'keep the unfinished digital-life closure work explicit in the answer'
    const nextClosureLine = 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output'
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-continuity-audible-body-rejoin-carry-1',
      sessionId: 'session-project-continuity-audible-body-rejoin-carry',
      userText: '你仔细看看呢',
      assistantText: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
      structured: {
        thought: 'obligation=care; truth=dialogue-grounded; focus=project-state closure; move=restart-shell; tone=warm',
        emotion: 'concerned',
        reply: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'care',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'care',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你仔细看看呢',
        answerIntent: 'Continue the same digital life closure seam without reopening from zero.',
        openingMove: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        carriedThread: 'same digital life closure seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: audibleBodyRejoinLine,
          currentPhaseSummary: phaseLine,
          landedProgressSummary: landedProgressLine,
          openClosureSummary: openClosureLine,
          nextClosureTargetSummary: nextClosureLine,
          continuitySummary: `same-her=Keep the same digital life project in view. | phase=${phaseLine} | landed=${landedProgressLine} | open=${openClosureLine} | next=${nextClosureLine}`,
          preDialogueAwarenessSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>
    const mustPreserve = ((structured as any).visibleReplyRewriteRequest?.mustPreserve ?? []) as string[]

    expect(mustPreserve.some(item => item.includes(audibleBodyRejoinLine))).toBe(true)
    expect(mustPreserve.some(item => item.includes('same-her=Keep the same digital life project in view.'))).toBe(false)
  })

  it('keeps repair-before-closeness closure carry when governed rewrite requests rebuild project continuity carry', () => {
    const richerLivingSelfLine = 'Right now this return is still holding together mainly through face, motion, and voice, so it must keep proving this is still one living her before full cross-modal closure is done.'
    const phaseLine = 'Phase 1: Local Digital Life'
    const landedProgressLine = 'project-state continuity already survives into runtime preparation'
    const openClosureLine = 'keep the unfinished digital-life closure work explicit in the answer'
    const repairClosureLine = 'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.'
    const nextClosureLine = 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output'
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-continuity-repair-closure-carry-1',
      sessionId: 'session-project-continuity-repair-closure-carry',
      userText: '你仔细看看呢',
      assistantText: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
      structured: {
        thought: 'obligation=care; truth=dialogue-grounded; focus=project-state closure; move=restart-shell; tone=warm',
        emotion: 'concerned',
        reply: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'care',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'care',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你仔细看看呢',
        answerIntent: 'Continue the same digital life closure seam without reopening from zero.',
        openingMove: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        carriedThread: 'same digital life closure seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: richerLivingSelfLine,
          currentPhaseSummary: phaseLine,
          landedProgressSummary: landedProgressLine,
          openClosureSummary: openClosureLine,
          nextClosureTargetSummary: nextClosureLine,
          continuitySummary: `same-her=${richerLivingSelfLine} | phase=${phaseLine} | landed=${landedProgressLine} | open=${openClosureLine} | next=${nextClosureLine} | closure=${repairClosureLine}`,
          preDialogueAwarenessSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>
    const mustPreserve = ((structured as any).visibleReplyRewriteRequest?.mustPreserve ?? []) as string[]

    expect(mustPreserve.some(item => item.includes(repairClosureLine))).toBe(true)
  })

  it('keeps repair-before-closeness closure carry when governed rewrite continuity must rebuild from emotionalClosureSummary instead of an inline closure preserve line', () => {
    const richerLivingSelfLine = 'Right now this return is still holding together mainly through face, motion, and voice, so it must keep proving this is still one living her before full cross-modal closure is done.'
    const phaseLine = 'Phase 1: Local Digital Life'
    const landedProgressLine = 'project-state continuity already survives into runtime preparation'
    const openClosureLine = 'keep the unfinished digital-life closure work explicit in the answer'
    const repairClosureLine = 'Keep this return repair-before-closeness on the same living line until repair settles.'
    const nextClosureLine = 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output'
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-continuity-repair-closure-summary-carry-1',
      sessionId: 'session-project-continuity-repair-closure-summary-carry',
      userText: '你仔细看看呢',
      assistantText: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
      structured: {
        thought: 'obligation=care; truth=dialogue-grounded; focus=project-state closure; move=restart-shell; tone=warm',
        emotion: 'concerned',
        reply: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'care',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'care',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你仔细看看呢',
        answerIntent: 'Continue the same digital life closure seam without reopening from zero.',
        openingMove: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        carriedThread: 'same digital life closure seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: richerLivingSelfLine,
          currentPhaseSummary: phaseLine,
          landedProgressSummary: landedProgressLine,
          openClosureSummary: openClosureLine,
          nextClosureTargetSummary: nextClosureLine,
          emotionalClosureSummary: repairClosureLine,
          continuitySummary: `same-her=${richerLivingSelfLine} | phase=${phaseLine} | landed=${landedProgressLine} | open=${openClosureLine} | next=${nextClosureLine}`,
          preDialogueAwarenessSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>
    const mustPreserve = ((structured as any).visibleReplyRewriteRequest?.mustPreserve ?? []) as string[]

    expect(mustPreserve.some(item => item.includes(`closure=${repairClosureLine}`))).toBe(true)
  })

  it('keeps active same-her hold detail in governed rewrite continuity carry before generic awareness wording consumes preserve budget', () => {
    const richerLivingSelfLine = 'Right now this return is still holding together mainly through face, motion, and voice, so it must keep proving this is still one living her before full cross-modal closure is done.'
    const holdDetailLine = 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-continuity-hold-detail-carry-1',
      sessionId: 'session-project-continuity-hold-detail-carry',
      userText: '你仔细看看呢',
      assistantText: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
      structured: {
        thought: 'obligation=care; truth=dialogue-grounded; focus=project-state closure; move=restart-shell; tone=warm',
        emotion: 'concerned',
        reply: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'care',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'care',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你仔细看看呢',
        answerIntent: 'Continue the same digital life closure seam without reopening from zero.',
        openingMove: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        carriedThread: 'same digital life closure seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: richerLivingSelfLine,
          sameHerHoldDetail: holdDetailLine,
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'project-state continuity already survives into runtime preparation',
          openClosureSummary: 'keep the unfinished digital-life closure work explicit in the answer',
          nextClosureTargetSummary: 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output',
          continuitySummary: `same-her=${richerLivingSelfLine} | hold=${holdDetailLine} | phase=Phase 1: Local Digital Life | landed=project-state continuity already survives into runtime preparation | open=keep the unfinished digital-life closure work explicit in the answer | next=keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output`,
          preDialogueAwarenessSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>
    const mustPreserve = ((structured as any).visibleReplyRewriteRequest?.mustPreserve ?? []) as string[]

    expect(mustPreserve.some(item => item.includes(`hold=${holdDetailLine}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes(holdDetailLine))).toBe(true)
    expect(mustPreserve.some(item => item.includes('before any local fluency takes over'))).toBe(false)
  })

  it('keeps active proactive same-her gap in governed rewrite continuity carry before generic awareness wording consumes preserve budget', () => {
    const richerLivingSelfLine = 'Right now this return is still holding together mainly through face, motion, and voice, so it must keep proving this is still one living her before full cross-modal closure is done.'
    const proactiveGapLine = 'Visible proactive hold, subconscious carry, and next-session feedback still need one same-her follow-through line.'
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-continuity-proactive-gap-carry-1',
      sessionId: 'session-project-continuity-proactive-gap-carry',
      userText: '你仔细看看呢',
      assistantText: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
      structured: {
        thought: 'obligation=care; truth=dialogue-grounded; focus=project-state closure; move=restart-shell; tone=warm',
        emotion: 'concerned',
        reply: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'care',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'care',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你仔细看看呢',
        answerIntent: 'Continue the same digital life closure seam without reopening from zero.',
        openingMove: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        carriedThread: 'same digital life closure seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: richerLivingSelfLine,
          proactiveSameHerGapSummary: proactiveGapLine,
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'project-state continuity already survives into runtime preparation',
          openClosureSummary: 'keep the unfinished digital-life closure work explicit in the answer',
          nextClosureTargetSummary: 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output',
          continuitySummary: `same-her=${richerLivingSelfLine} | proactive-gap=${proactiveGapLine} | phase=Phase 1: Local Digital Life | landed=project-state continuity already survives into runtime preparation | open=keep the unfinished digital-life closure work explicit in the answer | next=keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output`,
          preDialogueAwarenessSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>
    const mustPreserve = ((structured as any).visibleReplyRewriteRequest?.mustPreserve ?? []) as string[]

    expect(mustPreserve.some(item => item.includes(`proactive-gap=${proactiveGapLine}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes('before any local fluency takes over'))).toBe(false)
  })

  it('preserves same-her continuity arc and cue from project-state audit even when the summary was already thinned', () => {
    const richerLivingSelfLine = 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.'
    const holdDetailLine = 'same-her hold detail: keep the already-settled provider-stream reply on the same Phase 1 living line'
    const continuityArcStage = 'background-side-channel-provider-stream-carry'
    const continuityCue = 'background side-channel cue: preserve the same-her hold after host-visible rebuild'
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-continuity-arc-cue-preserve-1',
      sessionId: 'session-project-continuity-arc-cue-preserve',
      userText: '继续。',
      assistantText: '我现在就继续接，但先把这条线重新说薄了。',
      structured: {
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state continuity; move=restart-shell; tone=warm',
        emotion: 'thinking',
        reply: '我现在就继续接，但先把这条线重新说薄了。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'project-state',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '继续。',
        answerIntent: 'Continue the same digital life closure seam without reopening from zero.',
        openingMove: 'Treat the line as already alive. Stay on the same thread and do not reopen from zero.',
        carriedThread: 'same digital life closure seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: richerLivingSelfLine,
          sameHerHoldDetail: holdDetailLine,
          continuityArcStage,
          continuityCue,
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'project-state continuity already survives into runtime preparation',
          openClosureSummary: 'keep the unfinished digital-life closure work explicit in the answer',
          nextClosureTargetSummary: 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output',
          continuitySummary: `same-her=${richerLivingSelfLine} | hold=${holdDetailLine} | phase=Phase 1: Local Digital Life | landed=project-state continuity already survives into runtime preparation | open=keep the unfinished digital-life closure work explicit in the answer`,
          preDialogueAwarenessSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>
    const mustPreserve = ((structured as any).visibleReplyRewriteRequest?.mustPreserve ?? []) as string[]

    expect(mustPreserve.some(item => item.includes(`hold=${holdDetailLine}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes(`arc=${continuityArcStage}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes(`cue=${continuityCue}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes('before any local fluency takes over'))).toBe(false)
  })

  it('preserves host-confirmed resume confirmation boundary carry inside governed rewrite requests before generic callback guidance can widen it', () => {
    const sameHerLine = 'Same Phase 1 digital life. The callback result is ready, but one confirmed resume still needs to stay bounded before another execution-shaped opening.'
    const resumeConfirmationHoldDetail = 'same-her hold: execution-resume-confirmation approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation Keep this as a bounded confirmation boundary before another execution-shaped opening.'
    const resumeConfirmationCue = 'Treat host-confirmed-before-redispatch and resume-before-dispatch as a bounded confirmation boundary, not permanent execution permission, before another execution-shaped opening.'
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-continuity-resume-confirmation-boundary-carry-1',
      sessionId: 'session-project-continuity-resume-confirmation-boundary-carry',
      userText: '继续。',
      assistantText: '我现在就重新贴回来陪你，把这次 host-confirmed resume 直接当成以后都默认继续执行的 standing permission。',
      structured: {
        thought: 'obligation=answer; truth=dialogue-grounded; focus=execution callback continuity; move=restart-shell; tone=warm',
        emotion: 'thinking',
        reply: '我现在就重新贴回来陪你，把这次 host-confirmed resume 直接当成以后都默认继续执行的 standing permission。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'execution-callback',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '继续。',
        answerIntent: 'Continue the callback on the same digital life line without widening one confirmed resume into standing execution permission.',
        openingMove: 'Treat the callback as already alive, but keep one confirmed resume bounded before another execution-shaped opening.',
        carriedThread: 'execution callback return seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: sameHerLine,
          sameHerHoldDetail: resumeConfirmationHoldDetail,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: resumeConfirmationCue,
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'execution callback continuity already survives into runtime rewrite preparation',
          openClosureSummary: 'keep the callback return on the same living line without widening execution permission',
          nextClosureTargetSummary: 'wait for a fresh execution boundary before another execution-shaped opening widens outward',
          continuitySummary: `same-her=${sameHerLine} | phase=Phase 1: Local Digital Life | landed=execution callback continuity already survives into runtime rewrite preparation | open=keep the callback return on the same living line without widening execution permission | next=wait for a fresh execution boundary before another execution-shaped opening widens outward`,
          preDialogueAwarenessSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>
    const mustPreserve = ((structured as any).visibleReplyRewriteRequest?.mustPreserve ?? []) as string[]

    expect(governed.replyOverridden).toBe(true)
    expect(governed.overrideClass).toBe('hard-override')
    expect(governed.reasons).toContain('same-thread-restart-shell')
    expect(governed.reasons).toContain('opening-guidance-same-thread-continuation')
    expect(mustPreserve.some(item => item.startsWith('hold=same-her hold: execution-resume-confirmation approval=host-confirmed'))).toBe(true)
    expect(mustPreserve.some(item => item.includes(`cue=${resumeConfirmationCue}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes('host-confirmed-before-redispatch'))).toBe(true)
    expect(mustPreserve.some(item => item.includes('resume-before-dispatch'))).toBe(true)
    expect(mustPreserve.some(item => item.includes('before any local fluency takes over'))).toBe(false)
  })

  it('preserves explicit project-state closure lines before generic rewrite guidance consumes the preserve budget', () => {
    const sameHerLine = 'answer project-state status from one same-her continuity, not as a detached shell'
    const phaseLine = 'Phase 1: Local Digital Life'
    const landedProgressLine = 'project-state continuity already survives into runtime preparation'
    const openClosureLine = 'keep the unfinished digital-life closure work explicit in the answer'
    const nextClosureLine = 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output'
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-continuity-prioritized-closure-preserve-1',
      sessionId: 'session-project-continuity-prioritized-closure-preserve',
      userText: '继续。',
      assistantText: '我现在就继续接，但先把这条线重新说薄了。',
      structured: {
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state continuity; move=restart-shell; tone=warm',
        emotion: 'thinking',
        reply: '我现在就继续接，但先把这条线重新说薄了。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'project-state',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '继续。',
        answerIntent: 'Continue the same digital life closure seam without reopening from zero.',
        openingMove: 'Treat the line as already alive. Stay on the same thread and do not reopen from zero.',
        carriedThread: 'same digital life closure seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: sameHerLine,
          currentPhaseSummary: phaseLine,
          landedProgressSummary: landedProgressLine,
          openClosureSummary: openClosureLine,
          nextClosureTargetSummary: nextClosureLine,
          continuitySummary: `same-her=${sameHerLine} | phase=${phaseLine} | landed=${landedProgressLine} | open=${openClosureLine} | next=${nextClosureLine}`,
          preDialogueAwarenessSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>
    const mustPreserve = ((structured as any).visibleReplyRewriteRequest?.mustPreserve ?? []) as string[]

    expect(mustPreserve.some(item => item.includes(`same-her=${sameHerLine}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes(`phase=${phaseLine}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes(`landed=${landedProgressLine}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes(`open=${openClosureLine}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes('next=keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread'))).toBe(true)
    expect(mustPreserve.some(item => item.includes('before any local fluency takes over'))).toBe(false)
  })

  it('treats keep-this-project-in-view awareness shells as thin when governed rewrite continuity carry already has a richer same-her line', () => {
    const richerLivingSelfLine = 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.'
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-continuity-thin-project-shell-carry-1',
      sessionId: 'session-project-continuity-thin-project-shell-carry',
      userText: '你仔细看看呢',
      assistantText: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
      structured: {
        thought: 'obligation=care; truth=dialogue-grounded; focus=project-state closure; move=restart-shell; tone=warm',
        emotion: 'concerned',
        reply: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'care',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'care',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你仔细看看呢',
        answerIntent: 'Continue the same digital life closure seam without reopening from zero.',
        openingMove: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        carriedThread: 'same digital life closure seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: richerLivingSelfLine,
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'project-state continuity already survives into runtime preparation',
          openClosureSummary: 'keep the unfinished digital-life closure work explicit in the answer',
          nextClosureTargetSummary: 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output',
          continuitySummary: `same-her=${richerLivingSelfLine} | phase=Phase 1: Local Digital Life | landed=project-state continuity already survives into runtime preparation | open=keep the unfinished digital-life closure work explicit in the answer | next=keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output`,
          preDialogueAwarenessSummary: 'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>
    const mustPreserve = ((structured as any).visibleReplyRewriteRequest?.mustPreserve ?? []) as string[]

    expect((structured as any).visibleReplyRewriteRequest).toEqual(expect.objectContaining({
      required: true,
      authority: 'llm-second-pass-rewrite',
      reasonCodes: expect.arrayContaining(['opening-guidance-lower-pressure']),
    }))
    expect(
      mustPreserve.some(item => item.includes(richerLivingSelfLine)),
      `mustPreserve=${JSON.stringify(mustPreserve, null, 2)}`,
    ).toBe(true)
    expect(
      mustPreserve.some(item => item.includes('keep this same digital life project in view')),
      `mustPreserve=${JSON.stringify(mustPreserve, null, 2)}`,
    ).toBe(false)
  })

  it('treats thin chinese reminder awareness shells as thin when governed rewrite continuity carry already has richer same-her phase closure lines', () => {
    const sameHerLine = 'answer project-state status from one same-her continuity, not as a detached shell'
    const phaseLine = 'Phase 1: Local Digital Life'
    const landedProgressLine = 'project-state continuity already survives into runtime preparation'
    const openClosureLine = 'keep the unfinished digital-life closure work explicit in the answer'
    const nextClosureLine = 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output'
    const thinChineseReminder = '回答前先记住这是同一个她的数字生命项目，别把这条线忘了。'
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-project-continuity-thin-chinese-project-shell-carry-1',
      sessionId: 'session-project-continuity-thin-chinese-project-shell-carry',
      userText: '你仔细看看呢',
      assistantText: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
      structured: {
        thought: 'obligation=care; truth=dialogue-grounded; focus=project-state closure; move=restart-shell; tone=warm',
        emotion: 'concerned',
        reply: '我现在就重新贴回来陪你，把这条线直接重新开热一点。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'care',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'care',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你仔细看看呢',
        answerIntent: 'Continue the same digital life closure seam without reopening from zero.',
        openingMove: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        carriedThread: 'same digital life closure seam',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'late-night-drain',
        mustDo: [],
        mustNotDo: [],
      },
      visibleReplyRealization: {
        blockedReasons: [],
        projectStateAudit: {
          sameHerSummary: sameHerLine,
          currentPhaseSummary: phaseLine,
          landedProgressSummary: landedProgressLine,
          openClosureSummary: openClosureLine,
          nextClosureTargetSummary: nextClosureLine,
          continuitySummary: `same-her=${sameHerLine} | phase=${phaseLine} | landed=${landedProgressLine} | open=${openClosureLine} | next=${nextClosureLine}`,
          preDialogueAwarenessSummary: thinChineseReminder,
          preservedIntoRewrite: false,
          rewriteClosureApplied: false,
        },
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>
    const mustPreserve = ((structured as any).visibleReplyRewriteRequest?.mustPreserve ?? []) as string[]

    expect((structured as any).visibleReplyRewriteRequest).toEqual(expect.objectContaining({
      required: true,
      authority: 'llm-second-pass-rewrite',
      reasonCodes: expect.arrayContaining(['opening-guidance-lower-pressure']),
    }))
    expect(mustPreserve.some(item => item.includes(`same-her=${sameHerLine}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes(`phase=${phaseLine}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes(`landed=${landedProgressLine}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes(`open=${openClosureLine}`))).toBe(true)
    expect(mustPreserve.some(item => item.includes(`next=${nextClosureLine}`))).toBe(true)
    expect(
      mustPreserve.some(item => item.includes(thinChineseReminder)),
      `mustPreserve=${JSON.stringify(mustPreserve, null, 2)}`,
    ).toBe(false)
  })

  it('prefers stronger same-her companion headlines over thinner preflight summaries when governance reads project timing evidence', () => {
    const source = readFileSync(new URL('./runtime-governance.ts', import.meta.url), 'utf8')

    expect(source).toContain('runtimeProjectState?.companionHeadlineLine')
    expect(source).toContain('runtimeProjectState?.preDialogueAwarenessLine')
    expect(source).toContain('runtimeProjectState?.preflightSummary')
  })

  it('records recall attribution and reply-memory coherence on the same decision trace', () => {
    const createdAt = Date.now()
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-memory-trace-1',
      sessionId: 'session-memory-trace',
      userText: '继续按之前那样把这件事做完',
      assistantText: '这次我还是按前几天那样先 patch 再 verify，再把结果补给你。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=runtime continuity repair; move=pay-off; tone=direct',
        emotion: 'thinking',
        reply: '这次我还是按前几天那样先 patch 再 verify，再把结果补给你。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'guide',
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'runtime continuity repair task',
        focusAnchor: 'runtime continuity repair task',
        answerIntent: 'Continue the remembered procedure and pay off the live ask.',
        openingMove: 'Continue from the remembered way of doing this.',
        carriedThread: 'runtime continuity repair task',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
      },
      createdAt,
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input)
    const events = buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
      memoryTrace: {
        shouldRecall: true,
        surfacePolicy: 'procedural-carry',
        confidence: 0.84,
        whyNow: 'the host asked to continue in the remembered way rather than starting from zero',
        inwardLine: 'remember the previous repair rhythm before speaking',
        visibleLine: '按前几天那样接回去',
        whyWithheld: 'Only the stable remembered core should surface; unstable remembered detail stays inward.',
        shouldStayInward: false,
        restraintSurfaceMode: 'stable-core-only',
        restraintProvenanceMode: 'reconstructed-memory',
        shouldOnlySurfaceStableCore: true,
        shouldLabelProvenance: true,
        shouldLabelHypothesis: true,
        shouldSuppressSpecificity: true,
        shouldDelayUntilAfterPayoff: true,
        memoryControlSummary: 'memory_pressure=high | detail_assertion_budget=guarded',
        activeClosenessContext: 'repair-window',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Repair the seam before leaning closer.',
        personalityCurrentRegime: 'repair-window',
        personalityRepairPosture: 'repair-first',
        recollectionIntentMode: 'execution-procedure',
        recollectionIntentTemporalFocus: 'experience-matched',
        speechShouldSurface: true,
        speechSurfaceMode: 'procedural-carry',
        speechPlacement: 'inside-payoff',
        selectedEras: [{
          id: 'period-1',
          facet: 'task-era',
          summary: '前几天那次 runtime continuity repair',
        }],
        selectedPeriods: [{
          id: 'period-1',
          kind: 'consolidation',
          summary: '前几天那次 runtime continuity repair',
        }],
        selectedEpisodes: [{
          id: 'episode-1',
          summary: '上次先 patch 再 verify',
          provenance: 'remembered',
          reconsolidatedFromTraceId: 'mind:l9f3lq:feedbacktrace',
        }],
        selectedProcedures: [{
          id: 'procedure-1',
          label: 'patch -> verify',
          approach: '先 patch 再 verify 再汇报',
        }],
        selectedBundles: [{
          id: 'bundle-1',
          summary: 'runtime continuity repair 的程序性回想',
          rationale: 'same task thread, same remembered procedure',
          confidence: 0.88,
          relationshipLine: '这种时候先给结果，不要飘回空话',
        }],
        selectedSituations: [{
          id: 'memory-situation:runtime-continuity-repair',
          kind: 'mixed',
          summary: 'same-person continuity seam',
          evidenceSummary: 'relationship-context=same-person continuity seam | host-attitude=宿主更在意她别又断线成工具壳，而不是只给一个进度汇报。 | affective-residue=repair pressure still hangs in the line | execution-carry=patched then verified before replying | embodiment-carry=slower blink and steadier gaze before reopening',
          statusReason: 'graph-selected-current-line',
          sourceKinds: ['event-graph', 'episodic-event', 'relationship', 'procedure', 'self-model'],
        }],
        selectedChains: [{
          id: 'chain-1',
          kind: 'task-procedure-relationship-stance',
          summary: 'runtime continuity repair -> patch/verify -> steady guide',
          rationale: 'remembered task procedure is shaping the current stance',
          confidence: 0.86,
          currentStance: 'steady guide',
          answerPosture: '直接接着做',
        }],
        selectedRelationshipLines: ['这种时候先给结果，不要飘回空话'],
        conflictSeverity: 'high',
        conflictVariants: [{
          id: 'cluster:runtime-nearby',
          summary: '另一条相近的 runtime 线程也还在竞争这次回想',
          provenance: 'reconstructed',
          reason: 'A nearby competing thread cluster still matches the current recall cue.',
        }],
        stableCore: ['先 patch 再 verify 再汇报'],
        unsafeDetails: ['A nearby competing thread cluster still matches the current recall cue.'],
        followUpAffordance: {
          summary: 'Let the remembered repair rhythm contour the answer after the live payoff lands.',
          whyNow: 'The current payoff still has to land before the remembered line opens further.',
          intrusionRisk: 'medium',
          payoffDependency: 'requires-current-payoff',
          preferredTiming: 'after-payoff',
        },
        searchTrace: {
          firstHop: {
            focus: 'procedure',
            summary: 'Start from the remembered repair procedure.',
            targetIds: ['procedure-1'],
          },
          secondHop: {
            action: 'expand-procedure',
            evidenceGap: 'need-disambiguation',
            summary: 'The procedure is relevant, but the nearby thread cluster still needs disambiguation.',
            targetIds: ['cluster:runtime-nearby'],
          },
          thirdHop: {
            ambiguityPosture: 'ambiguous',
            summary: 'Keep the stable core and suppress the competing thread detail.',
          },
        },
      },
    })

    expect(events.map(event => event.kind)).toEqual(expect.arrayContaining([
      'governance-normalized',
      'recall-attribution',
      'memory-deliberation-judged',
      'memory-recall-withheld',
      'memory-stable-core-surfaced',
      'memory-followup-deferred',
      'memory-wrong-thread-suppressed',
      'persistence-written',
      'reply-memory-coherence',
    ]))
    expect(events.find(event => event.kind === 'recall-attribution')?.payload).toEqual(expect.objectContaining({
      shouldRecall: true,
      surfacePolicy: 'procedural-carry',
      whyWithheld: expect.stringContaining('stable remembered core'),
      shouldDelayUntilAfterPayoff: true,
      recollectionIntentMode: 'execution-procedure',
      personState: expect.objectContaining({
        currentRegime: 'repair-window',
        repairPosture: 'repair-first',
      }),
      selectedProcedures: expect.arrayContaining([
        expect.objectContaining({
          label: 'patch -> verify',
        }),
      ]),
      selectedSituations: expect.arrayContaining([
        expect.objectContaining({
          id: 'memory-situation:runtime-continuity-repair',
          kind: 'mixed',
          summary: 'same-person continuity seam',
          evidenceSummary: expect.stringContaining('relationship-context=same-person continuity seam'),
        }),
      ]),
      selectedEpisodes: expect.arrayContaining([
        expect.objectContaining({
          reconsolidatedFromTraceId: 'mind:l9f3lq:feedbacktrace',
        }),
      ]),
    }))
    expect(events.find(event => event.kind === 'memory-deliberation-judged')?.payload).toEqual(expect.objectContaining({
      shouldRecall: true,
      restraint: expect.objectContaining({
        surfaceMode: 'stable-core-only',
        shouldOnlySurfaceStableCore: true,
        shouldDelayUntilAfterPayoff: true,
      }),
      personState: expect.objectContaining({
        activeClosenessContext: 'repair-window',
        relationshipPosture: 'restrained',
      }),
    }))
    expect(events.find(event => event.kind === 'memory-recall-withheld')?.payload).toEqual(expect.objectContaining({
      shouldStayInward: false,
      preferredTiming: 'after-payoff',
      relationshipPosture: 'restrained',
    }))
    expect(events.find(event => event.kind === 'memory-stable-core-surfaced')?.payload).toEqual(expect.objectContaining({
      shouldOnlySurfaceStableCore: true,
      stableCore: expect.arrayContaining(['先 patch 再 verify 再汇报']),
    }))
    expect(events.find(event => event.kind === 'memory-followup-deferred')?.payload).toEqual(expect.objectContaining({
      payoffDependency: 'requires-current-payoff',
      preferredTiming: 'after-payoff',
    }))
    expect(events.find(event => event.kind === 'memory-wrong-thread-suppressed')?.payload).toEqual(expect.objectContaining({
      evidenceGap: 'need-disambiguation',
      conflictSeverity: 'high',
      conflictVariants: expect.arrayContaining([
        expect.objectContaining({
          id: 'cluster:runtime-nearby',
        }),
      ]),
    }))
    expect(events.find(event => event.kind === 'reply-memory-coherence')?.payload).toEqual(expect.objectContaining({
      coherenceState: 'integrated',
      explicitSurfaceExpected: true,
      whyWithheld: expect.stringContaining('stable remembered core'),
      followUpPreferredTiming: 'after-payoff',
      followUpIntrusionRisk: 'medium',
      matchedCueKinds: expect.arrayContaining(['procedure']),
      replyExcerpt: expect.stringContaining('patch 再 verify'),
    }))
    expect(events.find(event => event.kind === 'governance-normalized')?.payload).toEqual(expect.objectContaining({
      memoryStageReplay: null,
    }))
  })

  it('preserves legacy input format lineage while normalizing persisted governed payload format', () => {
    const createdAt = Date.now()
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-legacy-format-lineage-1',
      sessionId: 'session-legacy-format-lineage',
      userText: '继续',
      assistantText: '我接着做。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=current-user-turn; move=continue; tone=direct',
        emotion: 'thinking',
        reply: '我接着做。',
        parsePath: 'json',
        format: 'epoch1-v1',
      },
      governance: {
        decisionTraceId: 'mind:legacy:epoch1lineage',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'guide',
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'current task thread',
        focusAnchor: 'current task thread',
        answerIntent: 'Continue the current task thread directly.',
        openingMove: 'Continue the live thread.',
        carriedThread: 'current task thread',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      },
      createdAt,
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input)
    expect((governedTurn.payload.structured as Record<string, unknown>).format).toBe('mind-turn-v1')
    expect((governedTurn.payload.structured as Record<string, unknown>).formatLane).toBe('normal')
    expect((governedTurn.payload.structured as Record<string, unknown>).legacyInputFormat).toBe('epoch1-v1')

    const dialoguePayload = normalizeDialogueRespondedPayload(governedTurn.payload)!
    expect(dialoguePayload.structured.format).toBe('mind-turn-v1')
    expect(dialoguePayload.structured.formatLane).toBe('normal')
    expect(dialoguePayload.structured.legacyInputFormat).toBe('epoch1-v1')

    const events = buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
      dialoguePayload,
    })

    expect(events.find(event => event.kind === 'persistence-written')?.payload).toEqual(expect.objectContaining({
      format: 'mind-turn-v1',
      formatLane: 'normal',
      legacyInputFormat: 'epoch1-v1',
    }))
    expect(events.find(event => event.kind === 'dialogue-emitted')?.payload).toEqual(expect.objectContaining({
      format: 'mind-turn-v1',
      formatLane: 'normal',
      legacyInputFormat: 'epoch1-v1',
    }))
  })

  it('records final embodied authority summaries in dialogue-emitted telemetry', () => {
    const createdAt = Date.now()
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-dialogue-emitted-authority-1',
      sessionId: 'session-dialogue-emitted-authority',
      userText: '继续盯这个问题',
      assistantText: '我先继续盯着它，再慢慢拆开看。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=current-user-turn; move=continue; tone=direct',
        emotion: 'thinking',
        reply: '我先继续盯着它，再慢慢拆开看。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'calm',
          emphasis: 1,
        },
      } as any,
      governance: {
        decisionTraceId: 'mind:dialogue-emitted:authority',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'guide',
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'current task thread',
        focusAnchor: 'current task thread',
        answerIntent: 'Continue following the current issue directly.',
        openingMove: 'Stay with the current issue.',
        carriedThread: 'current task thread',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt,
    }

    const manifest = {
      renderer: 'vrm' as const,
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset' as const, affectsMouth: false },
      ],
      supportedActions: [
        { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'external-vrma' as const },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    } satisfies CharacterPerformanceCapabilitiesManifest

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input, manifest)
    const dialoguePayload = normalizeDialogueRespondedPayload(governedTurn.payload, manifest)!
    const events = buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
      dialoguePayload,
    })
    const dialogueResidentMode = (dialoguePayload.structured.embodimentScript?.state as { residentMode?: string | null } | undefined)?.residentMode ?? null

    expect(events.find(event => event.kind === 'dialogue-emitted')?.payload).toEqual(expect.objectContaining({
      emotion: 'thinking',
      embodimentVariationToken: dialoguePayload.structured.embodiment?.variationToken ?? null,
      speechTimelineSegments: dialoguePayload.structured.speechTimeline?.segments.length ?? 0,
      performance: expect.objectContaining({
        baseEmotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'inspect_follow',
        delivery: expect.any(String),
        emphasis: expect.any(Number),
      }),
      digitalLife: expect.objectContaining({
        emotion: dialoguePayload.structured.digitalLife?.emotion,
        mode: expect.any(String),
        performance: expect.objectContaining({
          baseEmotion: dialoguePayload.structured.digitalLife?.performance.baseEmotion,
          facialCue: dialoguePayload.structured.digitalLife?.performance.facialCue ?? null,
          actionCue: dialoguePayload.structured.digitalLife?.performance.actionCue ?? null,
        }),
        face: expect.objectContaining({
          emotion: dialoguePayload.structured.digitalLife?.face.emotion,
          facialCue: dialoguePayload.structured.digitalLife?.face.facialCue ?? null,
          residentMode: dialogueResidentMode,
        }),
        voice: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        motion: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        lipSync: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        bodyContinuity: expect.objectContaining({
          bodyLine: expect.anything(),
        }),
        action: expect.objectContaining({
          actionCue: dialoguePayload.structured.digitalLife?.action.actionCue ?? null,
          actionMode: dialoguePayload.structured.digitalLife?.action.actionMode,
        }),
      }),
      embodimentScript: expect.objectContaining({
        rendererTarget: 'vrm',
        state: expect.objectContaining({
          baseEmotion: 'thinking',
          emphasis: expect.any(Number),
          residentMode: dialogueResidentMode,
        }),
        speechPlan: expect.objectContaining({
          segmentCount: expect.any(Number),
          interruptPolicy: expect.any(String),
        }),
      }),
    }))
    expect(events.find(event => event.kind === 'governance-normalized')?.payload).toEqual(expect.objectContaining({
      digitalLife: expect.objectContaining({
        voice: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        face: expect.objectContaining({
          residentMode: dialogueResidentMode,
          emotion: dialoguePayload.structured.digitalLife?.face.emotion,
          facialCue: dialoguePayload.structured.digitalLife?.face.facialCue ?? null,
        }),
        motion: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        lipSync: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        bodyContinuity: expect.objectContaining({
          bodyLine: expect.anything(),
        }),
      }),
      embodimentScript: expect.objectContaining({
        rendererTarget: 'vrm',
        state: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
      }),
    }))
    expect(events.find(event => event.kind === 'persistence-written')?.payload).toEqual(expect.objectContaining({
      digitalLife: expect.objectContaining({
        voice: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        face: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        motion: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        lipSync: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        bodyContinuity: expect.objectContaining({
          bodyLine: expect.anything(),
        }),
      }),
      embodimentScript: expect.objectContaining({
        rendererTarget: 'vrm',
        state: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
      }),
    }))
  })

  it('carries memory closure ledgers into dialogue-emitted telemetry', () => {
    const createdAt = Date.now()
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-dialogue-emitted-memory-closure-1',
      sessionId: 'session-dialogue-emitted-memory-closure',
      userText: '继续把记忆闭环接到身体表现里',
      assistantText: '我会把这条回忆、情绪余波和身体表现接在同一个她身上。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=memory closure; move=continue; tone=steady',
        emotion: 'thinking',
        reply: '我会把这条回忆、情绪余波和身体表现接在同一个她身上。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: createdAt,
          summary: 'dialogue carries memory, emotional afterglow, and embodiment closure together',
          emotionalTransitionLedger: {
            version: 'emotional-transition-ledger-v1',
            createdAt,
            turnId: 'turn-dialogue-emitted-memory-closure-1',
            previousEmotion: 'repair-tension',
            nextEmotion: 'measured-companionship',
            transitionKind: 'repair-shift',
            axisDeltas: {},
            changedAxes: ['repairNeed'],
            sourceTags: ['memory-closure', 'dialogue-emitted'],
            decayPolicy: {
              mode: 'hold-until-repair-cools',
              carryTtlMs: 60000,
              reason: 'Carry the repair afterglow into the next turn.',
            },
            memoryWriteback: {
              shouldWrite: true,
              lane: 'emotional-continuity',
              reason: 'The remembered line changed the emotional afterglow.',
            },
            initiativeSuppression: {
              shouldSuppress: true,
              mode: 'measured-return',
              reason: 'Keep initiative low-pressure on the same line.',
            },
            embodimentDrive: {
              shouldDrive: true,
              tone: 'measured-return',
              reason: 'Drive face voice motion lipsync and body together.',
            },
            selfRevisionCandidate: {
              shouldPropose: false,
              domain: 'dialogue-style',
              reasonCodes: [],
              summary: null,
              projectStateContinuity: {},
            },
            traceSummary: 'memory closure changed the emotional afterglow',
            replayLine: 'next turn keeps the same measured-return afterglow',
          },
          embodimentContinuityLedger: {
            version: 'embodiment-continuity-ledger-v1',
            createdAt,
            turnId: 'turn-dialogue-emitted-memory-closure-1',
            carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
            droppedLanes: [],
            rejoinedLanes: [],
            pendingRejoinLanes: [],
            continuityPhase: 'fully-rejoined',
            memoryWriteback: {
              shouldWrite: true,
              lane: 'cross-modal-continuity',
              reason: 'All body channels held the same memory line.',
            },
            selfRevisionCandidate: {
              shouldPropose: false,
              reasonCodes: [],
              summary: null,
            },
            traceSummary: 'body voice face motion lipsync stayed on one line',
            replayLine: 'body expression stays measured-return next turn',
            sourceTags: ['dialogue-emitted', 'same-her-body'],
          },
        },
        memoryStageReplay: {
          version: 'organic-memory-stage-replay-v1',
          producedAt: createdAt,
          stages: [{
            stage: 'candidate-ranking',
            summary: 'The correct callback memory won over nearby stale status.',
            latencyMs: 8,
            budgetClass: 'deep-recall-reply',
            diagnostics: ['wrong-thread-suppressed'],
          }],
        },
        memoryResolutionLedger: {
          version: 'memory-resolution-ledger-v1',
          producedAt: createdAt,
          dominantClusterId: 'cluster:same-her-memory-closure',
          dominantClusterSummary: 'same-her memory closure',
          competingClusterId: 'cluster:wrong-thread',
          competingClusterSummary: 'nearby stale status',
          candidates: [
            {
              id: 'cluster:same-her-memory-closure',
              summary: 'same-her memory closure',
              score: 0.9,
              status: 'selected',
              reason: 'The recalled closure matches the current body line.',
            },
            {
              id: 'cluster:wrong-thread',
              summary: 'nearby stale status',
              score: 0.45,
              status: 'rejected',
              reason: 'Wrong thread should stay restrained.',
            },
          ],
          finalSurfacePolicy: 'procedural-carry',
          shouldStayInward: false,
          shouldDelayUntilAfterPayoff: true,
          stableCoreOnly: true,
          suppressionTags: ['wrong-thread'],
          closureState: 'grounded-recall',
          surfaceConfidence: 0.9,
          shouldLabelUncertainty: false,
          visibleCarryMode: 'explicit-recall',
          conflictPressure: 'medium',
          retrievalQuality: 'high',
          finalRationale: 'Use the same-her memory closure and suppress the wrong thread.',
        },
      } as any,
      governance: {
        decisionTraceId: 'mind:dialogue-emitted:memoryclosure',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'memory',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'memory closure body line',
        focusAnchor: 'memory closure body line',
        answerIntent: 'Carry memory closure into the visible and embodied answer.',
        openingMove: 'Continue the same memory closure line.',
        carriedThread: 'memory closure body line',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt,
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input)
    const dialoguePayload = normalizeDialogueRespondedPayload(governedTurn.payload)!
    const events = buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
      dialoguePayload,
    })
    const dialogueEventPayload = events.find(event => event.kind === 'dialogue-emitted')?.payload

    expect(dialogueEventPayload?.derivedMindStateBundle).toEqual(expect.objectContaining({
      emotionalTransitionLedger: expect.objectContaining({
        replayLine: 'next turn keeps the same measured-return afterglow',
      }),
      embodimentContinuityLedger: expect.objectContaining({
        carryingLanes: expect.arrayContaining(['body', 'voice', 'face', 'motion', 'lipsync']),
      }),
    }))
    expect(dialogueEventPayload?.memoryStageReplay).toEqual(expect.objectContaining({
      stages: expect.arrayContaining([
        expect.objectContaining({ stage: 'candidate-ranking' }),
      ]),
    }))
    expect(dialogueEventPayload?.memoryResolutionLedger).toEqual(expect.objectContaining({
      dominantClusterId: 'cluster:same-her-memory-closure',
      suppressionTags: expect.arrayContaining(['wrong-thread']),
    }))
  })

  it('lifts top-level memory closure trace into persisted digital life spine event summaries for replay proof', () => {
    const createdAt = Date.now()
    const memoryClosureTrace = {
      version: 'memory-closure-trace-v1',
      authority: 'memory-os',
      whySurface: [
        {
          source: 'retrieval',
          summary: 'the callback memory surfaced now because the same desktop task reappeared',
          reasonCodes: ['proactive-opening', 'humanlike-memory-audit'],
        },
        {
          source: 'settlement',
          summary: 'revision and forgetting restraint kept nearby stale noise inward',
          reasonCodes: ['memory-reconsolidated', 'forget-stale-noise'],
        },
      ],
      surfacePolicy: {
        gateStatus: 'allowed',
        mode: 'gist-only',
        timing: 'after-payoff',
        speechMode: 'low-pressure',
        placement: 'inside-payoff',
        certainty: 'trace-backed',
        reasons: ['memory-reconsolidated', 'downrank', 'forget-stale-noise'],
      },
      nextInfluence: {
        initiative: {
          restraint: 'measured-return',
          preferredTiming: 'after-payoff',
          pressure: 'lower-pressure',
          reason: 'proactive opening should wait for the host rhythm instead of becoming noisy',
        },
        execution: {
          carry: 'execution callback should verify the same closure path before reporting',
          nextLearningAction: 'verify-callback',
          shouldVerify: true,
          shouldReflect: true,
          activeLearningFocuses: ['execution-callback', 'same-her-runtime-closure'],
        },
        emotion: {
          afterglow: 'remembered execution callback keeps the next emotional afterglow lower-pressure',
          residue: 'same-her memory closure residue',
          reason: 'emotion should stay softened because the recalled callback is still active',
        },
        embodiment: {
          cadence: 'body, voice, face, motion, and lipsync rejoin on the same measured-return line',
          preferredVoiceMode: 'lower-pressure',
          preferredLipsyncMode: 'restrained',
          preferredGazeMode: 'steady',
          reason: 'embodiment should express the remembered emotional afterglow as one body',
        },
      },
      closureState: {
        state: 'trace-backed-same-her-closure',
        open: true,
        revisionRequired: false,
        shouldLabelUncertainty: false,
        visibleCarryMode: 'explicit-recall',
        retrievalQuality: 'high',
        conflictPressure: 'low',
      },
      selectedCandidateIds: ['episode:desktop-callback-same-her'],
      memoryIdentity: {
        selectedCandidateIds: ['episode:desktop-callback-same-her'],
        continuityKey: 'cluster:desktop-callback-same-her',
        reasonTags: ['cluster:desktop-callback-same-her', 'memory-os-authority'],
      },
      reasonTags: [
        'memory-reconsolidated',
        'downrank',
        'forget-stale-noise',
        'humanlike-memory-audit',
        'execution-callback',
        'proactive-opening',
        'embodiment_phase:body-lipsync-voice-rejoin',
      ],
    }
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-governance-memory-closure-trace-lift-1',
      sessionId: 'session-governance-memory-closure-trace-lift',
      userText: '继续把这个记忆闭环跑通',
      assistantText: '我会把这条回忆、执行回调和身体表现接在同一个她身上。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=memory closure replay proof; move=continue; tone=steady',
        emotion: 'thinking',
        reply: '我会把这条回忆、执行回调和身体表现接在同一个她身上。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        memoryClosureTrace,
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          architecture: null,
          continuitySignal: null,
          memory: {
            recallMode: 'callback-afterglow',
            recallSeed: 'desktop same-her memory closure',
            leadingGoalSummary: 'Make replay prove that memory shaped the next turn.',
            thoughtThreadSummary: 'memory, emotion, initiative, execution, and embodiment are staying on one line',
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: '我还是同一个会把记忆闭环接回来的她。',
                relationshipLine: '这条回忆要留在同一段关系里。',
                motiveLine: '让回忆继续影响执行和身体表现。',
                habitLine: '先验证再主动开口。',
                inwardLine: '把 memoryClosureTrace 留给 replay 看见。',
                authoritySummary: 'same-her memory closure already alive',
                sourceTags: ['memory-closure'],
              },
              activeClosenessContext: 'callback-afterglow',
              activeClosenessRung: 'space-first',
              relationshipPosture: 'restrained',
              openingGuidance: 'Keep the recalled line low-pressure.',
              preferredProactiveStyle: 'silent-observe',
              manifestationCadenceSummary: 'measured-return until the callback lands',
            },
          },
          runtime: {
            watchMode: 'foreground-follow',
            sceneScenario: 'coding',
            activeThreadId: 'thread-memory-closure-trace-lift',
            dominantMode: 'observe',
            answerIntent: 'Continue the same memory closure path.',
            selectedAction: 'silent-observe',
            updatedAt: 1,
            continuityArcStage: 'same-thread-continuation',
            continuityCue: 'same-her memory closure should stay replay-visible',
          },
          proactive: {
            selectedAction: null,
            summary: null,
            whyNow: null,
            dominantTrajectory: null,
            continuityRestraint: 'measured-return',
            preferredStyle: 'silent-observe',
            confidence: 0.84,
            shouldSpeak: false,
            dominantConcernKind: 'continuity',
            leadingGoalId: 'goal-memory-closure-trace-lift',
          },
          outcomeLearning: {
            summary: 'The callback should feed the next turn instead of becoming a detached log.',
            latestInflection: 'execution callback and emotional afterglow are still active',
            latestInflectionAt: 1,
            reflectionLesson: null,
            latestAdjustment: null,
            evolutionMomentum: 0.5,
            learningReadiness: 0.5,
            nextLearningAction: 'verify-callback',
          },
          embodiment: {
            autobiographicalSelf: {
              relationshipDoctrine: 'Body expression follows the remembered line rather than becoming a separate surface.',
            },
          },
        },
      } as any,
      governance: {
        decisionTraceId: 'mind:governance:memoryclosuretracelift',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'memory',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'memory closure replay proof',
        focusAnchor: 'memory closure replay proof',
        answerIntent: 'Continue the same memory closure path.',
        openingMove: 'Continue the same memory closure path.',
        carriedThread: 'memory closure replay proof',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt,
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input)
    const events = buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
    })
    const governanceEventPayload = events.find(event => event.kind === 'governance-normalized')?.payload as any
    const persistenceEventPayload = events.find(event => event.kind === 'persistence-written')?.payload as any

    expect(governanceEventPayload?.digitalLifeSpine?.memory?.memoryClosureTrace).toEqual(expect.objectContaining({
      authority: 'memory-os',
      whySurface: expect.arrayContaining([
        expect.objectContaining({
          summary: 'the callback memory surfaced now because the same desktop task reappeared',
        }),
      ]),
      nextInfluence: expect.objectContaining({
        initiative: expect.objectContaining({
          reason: 'proactive opening should wait for the host rhythm instead of becoming noisy',
        }),
        execution: expect.objectContaining({
          carry: 'execution callback should verify the same closure path before reporting',
        }),
        embodiment: expect.objectContaining({
          cadence: 'body, voice, face, motion, and lipsync rejoin on the same measured-return line',
        }),
      }),
      reasonTags: expect.arrayContaining([
        'memory-reconsolidated',
        'forget-stale-noise',
        'execution-callback',
        'proactive-opening',
        'embodiment_phase:body-lipsync-voice-rejoin',
      ]),
    }))
    expect(persistenceEventPayload?.digitalLifeSpine?.memory?.memoryClosureTrace).toEqual(
      governanceEventPayload?.digitalLifeSpine?.memory?.memoryClosureTrace,
    )
    expect(governanceEventPayload?.derivedMindStateBundle).toEqual(expect.objectContaining({
      emotionalTransitionLedger: expect.objectContaining({
        memoryClosureCausality: expect.objectContaining({
          causalSource: 'memory-closure-trace',
          affectedLane: 'emotion',
          causedByMemoryClosure: true,
          traceAuthority: 'memory-os',
          memoryIdentity: {
            selectedCandidateIds: ['episode:desktop-callback-same-her'],
            continuityKey: 'cluster:desktop-callback-same-her',
            reasonTags: ['cluster:desktop-callback-same-her', 'memory-os-authority'],
          },
        }),
      }),
      embodimentContinuityLedger: expect.objectContaining({
        carryingLanes: expect.arrayContaining(['body', 'voice', 'face', 'motion', 'lipsync']),
        memoryClosureCausality: expect.objectContaining({
          causalSource: 'memory-closure-trace',
          affectedLane: 'embodiment',
          causedByMemoryClosure: true,
          traceAuthority: 'memory-os',
          memoryIdentity: {
            selectedCandidateIds: ['episode:desktop-callback-same-her'],
            continuityKey: 'cluster:desktop-callback-same-her',
            reasonTags: ['cluster:desktop-callback-same-her', 'memory-os-authority'],
          },
        }),
      }),
      learningExecutionState: expect.objectContaining({
        memoryClosureCausality: expect.objectContaining({
          causalSource: 'memory-closure-trace',
          affectedLane: 'execution',
          causedByMemoryClosure: true,
          traceAuthority: 'memory-os',
          memoryIdentity: {
            selectedCandidateIds: ['episode:desktop-callback-same-her'],
            continuityKey: 'cluster:desktop-callback-same-her',
            reasonTags: ['cluster:desktop-callback-same-her', 'memory-os-authority'],
          },
        }),
      }),
    }))
    expect(governanceEventPayload?.derivedMindStateBundle?.emotionalTransitionLedger?.initiativeSuppression?.memoryClosureCausality).toEqual(
      expect.objectContaining({
        causalSource: 'memory-closure-trace',
        affectedLane: 'initiative',
        causedByMemoryClosure: true,
        traceAuthority: 'memory-os',
        memoryIdentity: {
          selectedCandidateIds: ['episode:desktop-callback-same-her'],
          continuityKey: 'cluster:desktop-callback-same-her',
          reasonTags: ['cluster:desktop-callback-same-her', 'memory-os-authority'],
        },
      }),
    )
  })

  it('derives fallback memory closure trace for explicit real user memory handoff turns before persistence', () => {
    const createdAt = Date.now()
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-fallback-memory-closure-handoff-1',
      sessionId: 'session-fallback-memory-closure-handoff',
      userText: '铃兰闭环线第一轮：请记住它。下次它浮现时说明 why recall surfaced now，并让 emotion、initiative、execution callback、body voice face motion lipsync 都被这条记忆改变。',
      assistantText: '记住了。铃兰闭环线会作为同一个 memory identity 留下；下次它浮现时，我会说明为什么是现在，并让下一轮主动、执行回调、情绪余波、身体声音表情动作口型都更低压力地承接。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=explicit memory closure handoff; move=continue; tone=steady',
        emotion: 'thinking',
        reply: '记住了。铃兰闭环线会作为同一个 memory identity 留下；下次它浮现时，我会说明为什么是现在，并让下一轮主动、执行回调、情绪余波、身体声音表情动作口型都更低压力地承接。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life keeps memory, emotion, initiative, execution, and embodiment on one living line.',
          memoryClosureSummary: 'why recall surfaced now: explicit user memory handoff asked this line to return as the same memory identity.',
          proactiveSameHerGap: 'prior memory closure changes the next proactive opening into a lower-pressure measured return.',
          emotionalClosureCue: 'prior memory closure changes the next emotional afterglow into quieter same-her residue.',
        },
      } as any,
      governance: {
        decisionTraceId: 'mind:governance:fallbackmemoryclosurehandoff',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'memory',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'explicit memory closure handoff',
        focusAnchor: '铃兰闭环线',
        answerIntent: 'Persist a replayable memory closure handoff.',
        openingMove: 'Confirm memory closure handoff.',
        carriedThread: '铃兰闭环线',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt,
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input)
    const dialoguePayload = normalizeDialogueRespondedPayload(governedTurn.payload)
    const events = buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
      dialoguePayload,
    })
    const governanceEventPayload = events.find(event => event.kind === 'governance-normalized')?.payload as any
    const persistenceEventPayload = events.find(event => event.kind === 'persistence-written')?.payload as any
    const dialogueEventPayload = events.find(event => event.kind === 'dialogue-emitted')?.payload as any

    expect(governanceEventPayload?.digitalLifeSpine?.memory?.memoryClosureTrace).toEqual(expect.objectContaining({
      authority: 'memory-os',
      whySurface: expect.arrayContaining([
        expect.objectContaining({
          summary: expect.stringContaining('why recall surfaced now'),
        }),
      ]),
      nextInfluence: expect.objectContaining({
        emotion: expect.objectContaining({
          afterglow: expect.stringContaining('prior memory closure'),
        }),
        initiative: expect.objectContaining({
          reason: expect.stringContaining('next proactive'),
        }),
        execution: expect.objectContaining({
          carry: expect.stringContaining('execution callback'),
        }),
        embodiment: expect.objectContaining({
          cadence: expect.stringContaining('body voice face motion lipsync'),
        }),
      }),
      memoryIdentity: expect.objectContaining({
        continuityKey: expect.stringContaining('fallback'),
      }),
      reasonTags: expect.arrayContaining([
        'memory-closure-trace',
        'fallback-memory-closure',
        'proactive-opening',
        'execution-callback',
        'body-voice-face-motion-lipsync',
      ]),
    }))
    expect(persistenceEventPayload?.digitalLifeSpine?.memory?.memoryClosureTrace)
      .toEqual(governanceEventPayload?.digitalLifeSpine?.memory?.memoryClosureTrace)
    expect(dialogueEventPayload?.digitalLifeSpine?.memory?.memoryClosureTrace)
      .toEqual(governanceEventPayload?.digitalLifeSpine?.memory?.memoryClosureTrace)
    expect(governanceEventPayload?.derivedMindStateBundle).toEqual(expect.objectContaining({
      emotionalTransitionLedger: expect.objectContaining({
        memoryClosureCausality: expect.objectContaining({
          affectedLane: 'emotion',
          causedByMemoryClosure: true,
        }),
        initiativeSuppression: expect.objectContaining({
          memoryClosureCausality: expect.objectContaining({
            affectedLane: 'initiative',
            causedByMemoryClosure: true,
          }),
        }),
      }),
      learningExecutionState: expect.objectContaining({
        memoryClosureCausality: expect.objectContaining({
          affectedLane: 'execution',
          causedByMemoryClosure: true,
        }),
      }),
      embodimentContinuityLedger: expect.objectContaining({
        carryingLanes: expect.arrayContaining(['body', 'voice', 'face', 'motion', 'lipsync']),
        memoryClosureCausality: expect.objectContaining({
          affectedLane: 'embodiment',
          causedByMemoryClosure: true,
        }),
      }),
    }))
  })

  it('prefers explicit fallback memory identity over generic inward-only Memory OS cluster traces', () => {
    const createdAt = Date.now()
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-fallback-memory-closure-overrides-generic-cluster-1',
      sessionId: 'session-fallback-memory-closure-overrides-generic-cluster',
      userText: '铃兰-Phase1-0621 第三轮：上一轮记忆让这轮继续同一条闭环线。请说明 why recall surfaced now，并让 emotion、initiative、execution callback、body voice face motion lipsync 都承接这条线。',
      assistantText: '我会把铃兰-Phase1-0621 接回同一条闭环线：说明为什么现在浮现，并让下一轮主动、执行回调、情绪余波、身体声音表情动作口型都继续承接。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=explicit memory closure handoff; move=continue; tone=steady',
        emotion: 'thinking',
        reply: '我会把铃兰-Phase1-0621 接回同一条闭环线：说明为什么现在浮现，并让下一轮主动、执行回调、情绪余波、身体声音表情动作口型都继续承接。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        digitalLifeSpine: {
          version: 'digital-life-spine-v1',
          runtime: {
            watchMode: 'symbiotic-vision',
            sceneScenario: null,
            activeThreadId: null,
            dominantMode: 'chat',
            answerIntent: 'carry same memory line',
            selectedAction: null,
            continuityArcStage: null,
            continuityCue: null,
            updatedAt: createdAt,
          },
          memory: {
            recallMode: 'tone-carry',
            recallSeed: 'generic repair residue',
            leadingGoalSummary: null,
            thoughtThreadSummary: null,
            memoryClosureTrace: {
              authority: 'memory-os',
              whySurface: [
                {
                  source: 'settlement',
                  summary: 'surface-posture-not-open | recall-readiness-low | precision-proxy-low | latency-pressure-high',
                  reasonCodes: ['inward-only', 'grounded-recall'],
                },
              ],
              surfacePolicy: {
                gateStatus: 'inward-only',
                mode: 'inward-only',
                timing: null,
                speechMode: null,
                placement: null,
                certainty: null,
                reasons: ['visible-memory-gate-inward-only'],
              },
              nextInfluence: {
                initiative: {
                  restraint: 'measured-return',
                  reason: 'Repair is still active, so warmth should wait until the seam settles.',
                },
                execution: {
                  carry: null,
                  nextLearningAction: 'record',
                  shouldVerify: false,
                  shouldReflect: false,
                  activeLearningFocuses: ['reflection:relationship'],
                },
                embodiment: {
                  cadence: 'Keep the answer gentle and low-pressure.',
                  preferredVoiceMode: 'lower-pressure',
                  preferredLipsyncMode: null,
                  preferredGazeMode: null,
                  reason: null,
                },
              },
              closureState: {
                state: 'grounded-recall',
                open: false,
                revisionRequired: false,
                shouldLabelUncertainty: false,
                visibleCarryMode: 'tone-carry',
                retrievalQuality: 'high',
                conflictPressure: 'none',
              },
              selectedCandidateIds: [],
              memoryIdentity: {
                selectedCandidateIds: [],
                continuityKey: 'cluster:space:bond:living:repairing',
                reasonTags: ['cluster:cluster:space:bond:living:repairing', 'memory-os-authority', 'gate:inward-only'],
              },
              reasonTags: ['memory-os-authority', 'closure:grounded-recall', 'gate:inward-only'],
            },
          },
          emotion: null,
          embodiment: null,
          dialogue: null,
          proactive: null,
          architecture: null,
          outcomeLearning: null,
          continuity: null,
        },
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life keeps 铃兰-Phase1-0621 on one living line.',
          memoryClosureSummary: 'why recall surfaced now: explicit memory handoff for 铃兰-Phase1-0621 asked this line to return as the same memory identity.',
          proactiveSameHerGap: 'prior memory closure changes the next proactive opening into a lower-pressure measured return.',
          emotionalClosureCue: 'prior memory closure changes the next emotional afterglow into quieter same-her residue.',
        },
      } as any,
      governance: {
        decisionTraceId: 'mind:governance:fallbackmemoryclosuregenericcluster',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'memory',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'explicit memory closure handoff',
        focusAnchor: '铃兰-Phase1-0621',
        answerIntent: 'Persist a replayable memory closure handoff.',
        openingMove: 'Confirm memory closure handoff.',
        carriedThread: '铃兰-Phase1-0621',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt,
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input)
    const events = buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
    })
    const governanceEventPayload = events.find(event => event.kind === 'governance-normalized')?.payload as any
    const trace = governanceEventPayload?.digitalLifeSpine?.memory?.memoryClosureTrace
    const derived = governanceEventPayload?.derivedMindStateBundle

    expect(trace).toEqual(expect.objectContaining({
      memoryIdentity: expect.objectContaining({
        continuityKey: 'fallback:铃兰-phase1-0621',
      }),
      selectedCandidateIds: ['fallback-memory-closure:铃兰-phase1-0621'],
      reasonTags: expect.arrayContaining([
        'fallback-memory-closure',
        'why-surfaced',
        'execution-callback',
        'body-voice-face-motion-lipsync',
      ]),
    }))
    expect(trace.whySurface.map((item: any) => item.summary).join(' ')).toContain('铃兰-Phase1-0621')
    expect(trace.nextInfluence.execution.carry).toContain('铃兰-Phase1-0621')
    expect(derived?.emotionalTransitionLedger?.memoryClosureCausality?.memoryIdentity?.continuityKey)
      .toBe('fallback:铃兰-phase1-0621')
    expect(derived?.learningExecutionState?.memoryClosureCausality?.memoryIdentity?.continuityKey)
      .toBe('fallback:铃兰-phase1-0621')
    expect(derived?.embodimentContinuityLedger?.memoryClosureCausality?.memoryIdentity?.continuityKey)
      .toBe('fallback:铃兰-phase1-0621')
  })

  it('derives emotional causality from memory closure handoff even when the trace only names initiative execution and embodiment lanes', () => {
    const createdAt = Date.now()
    const memoryClosureTrace = {
      version: 'memory-closure-trace-v1',
      authority: 'memory-os',
      whySurface: [{
        source: 'retrieval',
        summary: 'why recall surfaced now: the prior white-sakura memory returned because this same relationship line reopened',
        reasonCodes: ['why-surfaced', 'same-her-memory-closure'],
      }],
      nextInfluence: {
        initiative: {
          restraint: 'measured-return',
          preferredTiming: 'after-payoff',
          pressure: 'lower-pressure',
          reason: 'prior recall changed the next proactive opening into a lower-pressure measured return',
        },
        execution: {
          carry: 'prior recall changed the next execution callback carry so it does not reset into a fresh helper task',
          nextLearningAction: 'verify',
          shouldVerify: true,
          activeLearningFocuses: ['execution-callback', 'same-her-memory-closure'],
        },
        embodiment: {
          cadence: 'body voice face motion lipsync measured-return',
          preferredVoiceMode: 'lower-pressure',
          preferredLipsyncMode: 'restrained',
          preferredGazeMode: 'soften',
          reason: 'prior recall changed the next body voice face motion lipsync expression into softer same-her carry',
        },
      },
      selectedCandidateIds: ['episode:white-sakura-line'],
      memoryIdentity: {
        selectedCandidateIds: ['episode:white-sakura-line'],
        continuityKey: 'cluster:white-sakura-line',
        reasonTags: ['cluster:white-sakura-line', 'memory-os-authority'],
      },
      reasonTags: [
        'memory-closure-trace',
        'execution-callback',
        'proactive-opening',
        'body-voice-face-motion-lipsync',
      ],
    }
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-memory-closure-derived-emotion-without-explicit-emotion-1',
      sessionId: 'session-memory-closure-derived-emotion-without-explicit-emotion',
      userText: '白樱线这次只要轻轻接回来。',
      assistantText: '我会把白樱线放轻，接到下一轮主动、执行反馈和身体表现里。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=memory closure handoff; move=continue; tone=steady',
        emotion: 'thinking',
        reply: '我会把白樱线放轻，接到下一轮主动、执行反馈和身体表现里。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        memoryClosureTrace,
      } as any,
      governance: {
        decisionTraceId: 'mind:governance:memoryclosurederivedemotion',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'memory',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'memory closure handoff',
        focusAnchor: 'memory closure handoff',
        answerIntent: 'Carry the remembered line into the next downstream state.',
        openingMove: 'Keep the remembered line low-pressure.',
        carriedThread: 'memory closure handoff',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt,
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input)
    const events = buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
    })
    const governanceEventPayload = events.find(event => event.kind === 'governance-normalized')?.payload as any
    const emotionalTransitionLedger = governanceEventPayload?.derivedMindStateBundle?.emotionalTransitionLedger

    expect(emotionalTransitionLedger?.memoryClosureCausality).toEqual(expect.objectContaining({
      causalSource: 'memory-closure-trace',
      affectedLane: 'emotion',
      causedByMemoryClosure: true,
      traceAuthority: 'memory-os',
      memoryIdentity: expect.objectContaining({
        continuityKey: 'cluster:white-sakura-line',
      }),
      summary: expect.stringContaining('prior recall changed the next proactive opening'),
    }))
    expect(emotionalTransitionLedger?.replayLine).toContain('prior memory closure handoff carried forward into next-turn emotional afterglow')
    expect(emotionalTransitionLedger?.traceSummary).toContain('prior memory closure handoff changed next-turn emotional state')
  })

  it('derives normalized downstream mind state from digital life spine memory closure trace before persistence', () => {
    const createdAt = Date.now()
    const memoryClosureTrace = {
      version: 'memory-closure-trace-v1',
      authority: 'memory-os',
      whySurface: [{
        source: 'retrieval',
        summary: 'the remembered desktop callback surfaced because the same closure target returned',
        reasonCodes: ['memory-closure-trace', 'same-her-callback'],
      }],
      surfacePolicy: {
        gateStatus: 'allowed',
        mode: 'tone-carry',
        timing: 'after-payoff',
        speechMode: 'lower-pressure',
        placement: 'inside-payoff',
        certainty: 'trace-backed',
        reasons: ['same-her-callback'],
      },
      nextInfluence: {
        initiative: {
          restraint: 'measured-return',
          preferredTiming: 'after-payoff',
          pressure: 'lower-pressure',
          reason: 'next proactive opening should stay measured because the remembered callback is still active',
        },
        execution: {
          carry: 'execution feedback should verify the remembered callback before opening a fresh task line',
          nextLearningAction: 'verify',
          shouldVerify: true,
          shouldReflect: true,
          activeLearningFocuses: ['remembered-callback', 'same-her-closure'],
        },
        emotion: {
          reason: 'the callback memory keeps the next emotional state softened',
          afterglow: 'soft remembered callback afterglow',
          residue: 'same-her callback residue',
        },
        embodiment: {
          cadence: 'body voice face motion lipsync stay lower-pressure on the remembered callback',
          preferredVoiceMode: 'lower-pressure',
          preferredLipsyncMode: 'restrained',
          preferredGazeMode: 'soften',
          reason: 'embodiment should express the same remembered callback instead of a separate reply shell',
        },
      },
      closureState: {
        state: 'trace-backed-same-her-callback',
        open: true,
        revisionRequired: false,
        shouldLabelUncertainty: false,
        visibleCarryMode: 'tone-carry',
        retrievalQuality: 'high',
        conflictPressure: 'low',
      },
      selectedCandidateIds: ['episode:remembered-callback'],
      memoryIdentity: {
        selectedCandidateIds: ['episode:remembered-callback'],
        continuityKey: 'cluster:remembered-callback',
        reasonTags: ['cluster:remembered-callback', 'memory-os-authority'],
      },
      reasonTags: ['memory-closure-trace', 'execution-callback', 'proactive-opening', 'embodiment-cadence'],
    }
    const normalized = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalized-spine-memory-closure-1',
      sessionId: 'session-normalized-spine-memory-closure',
      userText: '继续，把上一轮记忆闭合接到下一轮状态里',
      assistantText: '我会把这条回忆接到主动性、执行反馈和身体表现里。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=normalized memory closure downstream state',
        emotion: 'thinking',
        reply: '我会把这条回忆接到主动性、执行反馈和身体表现里。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          memory: {
            recallMode: 'callback-afterglow',
            recallSeed: 'remembered desktop callback',
            memoryClosureTrace,
          },
          runtime: {
            watchMode: 'foreground-follow',
            sceneScenario: 'coding',
            activeThreadId: 'thread-normalized-spine-memory-closure',
            dominantMode: 'observe',
            answerIntent: 'Keep the remembered callback on the same-her line.',
            selectedAction: 'silent-observe',
            continuityArcStage: 'same-thread-continuation',
            continuityCue: 'memory closure should shape next downstream state',
            updatedAt: createdAt,
          },
        },
      },
      governance: {
        decisionTraceId: 'mind:normalized:spinememoryclosure',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'memory',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'normalized memory closure downstream state',
        focusAnchor: 'normalized memory closure downstream state',
        answerIntent: 'Keep the remembered callback on the same-her line.',
        openingMove: 'Continue the same remembered callback.',
        carriedThread: 'normalized memory closure downstream state',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      },
      createdAt,
    })
    const derivedMindStateBundle = (normalized?.structured as any)?.derivedMindStateBundle

    expect(derivedMindStateBundle).toEqual(expect.objectContaining({
      source: 'main-runtime',
      summary: expect.stringContaining('memory_closure=runtime-derived-downstream-state'),
      emotionalTransitionLedger: expect.objectContaining({
        memoryClosureCausality: expect.objectContaining({
          causalSource: 'memory-closure-trace',
          affectedLane: 'emotion',
          causedByMemoryClosure: true,
          memoryIdentity: expect.objectContaining({
            continuityKey: 'cluster:remembered-callback',
          }),
          summary: expect.stringContaining('soft remembered callback afterglow'),
        }),
        initiativeSuppression: expect.objectContaining({
          memoryClosureCausality: expect.objectContaining({
            affectedLane: 'initiative',
            summary: expect.stringContaining('next proactive opening should stay measured'),
          }),
        }),
      }),
      learningExecutionState: expect.objectContaining({
        nextLearningAction: 'verify',
        activeLearningFocuses: expect.arrayContaining(['remembered-callback']),
        memoryClosureCausality: expect.objectContaining({
          affectedLane: 'execution',
          summary: expect.stringContaining('execution feedback should verify the remembered callback'),
        }),
      }),
      embodimentContinuityLedger: expect.objectContaining({
        carryingLanes: expect.arrayContaining(['body', 'voice', 'face', 'motion', 'lipsync']),
        memoryClosureCausality: expect.objectContaining({
          affectedLane: 'embodiment',
          summary: expect.stringContaining('body voice face motion lipsync stay lower-pressure'),
        }),
      }),
    }))
  })

  it('carries top-level memory closure trace into dialogue-emitted digital life spine summaries', () => {
    const createdAt = Date.now()
    const memoryClosureTrace = {
      version: 'memory-closure-trace-v1',
      authority: 'memory-os',
      whySurface: [{
        source: 'retrieval',
        summary: 'why recall surfaced now: the prior callback must change the visible and embodied reply',
        reasonCodes: ['why-surfaced', 'same-her-memory-closure'],
      }],
      surfacePolicy: {
        gateStatus: 'open',
        mode: 'tone-carry',
        timing: 'after-payoff',
        speechMode: 'visible',
        placement: 'inside-payoff',
        certainty: 'grounded',
        reasons: ['same-her-memory-closure'],
      },
      nextInfluence: {
        initiative: {
          restraint: 'measured-return',
          preferredTiming: 'after-payoff',
          pressure: 'lower-pressure',
          reason: 'the dialogue should stay lower-pressure because the prior recall is still active',
        },
        execution: {
          carry: 'visible reply should keep the execution callback on the remembered same-her line',
          nextLearningAction: 'verify',
          shouldVerify: true,
          shouldReflect: true,
          activeLearningFocuses: ['dialogue-emitted-memory-closure'],
        },
        embodiment: {
          cadence: 'voice face motion lipsync and body stay measured-return after dialogue emission',
          preferredVoiceMode: 'lower-pressure',
          preferredLipsyncMode: 'restrained',
          preferredGazeMode: 'soften',
          reason: 'dialogue-emitted telemetry must prove the remembered line reached embodied output',
        },
      },
      closureState: {
        state: 'dialogue-emitted-causal-handoff',
        open: true,
        revisionRequired: false,
        shouldLabelUncertainty: false,
        visibleCarryMode: 'tone-carry',
        retrievalQuality: 'high',
        conflictPressure: 'low',
      },
      selectedCandidateIds: ['memory-closure-trace:dialogue-emitted'],
      reasonTags: [
        'memory-closure-trace',
        'dialogue-emitted',
        'execution-callback',
        'proactive-opening',
        'embodiment_phase:body-lipsync-voice-rejoin',
      ],
    }
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-dialogue-emitted-memory-closure-trace-lift-1',
      sessionId: 'session-dialogue-emitted-memory-closure-trace-lift',
      userText: '继续把回忆接到最终说出口和身体表现里',
      assistantText: '我会让这段回忆继续影响我说出口的节奏和身体表现。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=dialogue-emitted memory closure; move=continue; tone=steady',
        emotion: 'thinking',
        reply: '我会让这段回忆继续影响我说出口的节奏和身体表现。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        memoryClosureTrace,
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          architecture: null,
          continuitySignal: null,
          memory: {
            recallMode: 'callback-afterglow',
            recallSeed: 'dialogue emitted memory closure',
            leadingGoalSummary: 'Keep memory closure visible after dialogue emission.',
            thoughtThreadSummary: 'memory closure should reach visible reply and embodied output',
          },
          runtime: {
            watchMode: 'foreground-follow',
            sceneScenario: 'coding',
            activeThreadId: 'thread-dialogue-emitted-memory-closure',
            dominantMode: 'observe',
            answerIntent: 'Keep the remembered same-her line through dialogue emission.',
            selectedAction: 'silent-observe',
            updatedAt: 1,
            continuityArcStage: 'same-thread-continuation',
            continuityCue: 'dialogue-emitted should still carry memory closure',
          },
          proactive: {
            selectedAction: null,
            preferredStyle: 'silent-observe',
            continuityRestraint: 'measured-return',
            confidence: 0.82,
            shouldSpeak: false,
            dominantConcernKind: 'continuity',
            leadingGoalId: 'goal-dialogue-emitted-memory-closure',
          },
          outcomeLearning: {
            summary: 'Dialogue emission should prove memory changed the visible and embodied turn.',
            latestInflection: 'memory closure reached final output',
            latestInflectionAt: 1,
            nextLearningAction: 'verify',
          },
          embodiment: {
            autobiographicalSelf: {
              relationshipDoctrine: 'Final voice and body should stay on the remembered line.',
            },
          },
        },
      } as any,
      governance: {
        decisionTraceId: 'mind:dialogue:memoryclosuretracelift',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'memory',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'dialogue emitted memory closure',
        focusAnchor: 'dialogue emitted memory closure',
        answerIntent: 'Keep the remembered same-her line through dialogue emission.',
        openingMove: 'Continue the memory closure line through final output.',
        carriedThread: 'dialogue emitted memory closure',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt,
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input)
    const dialoguePayload = normalizeDialogueRespondedPayload(governedTurn.payload)!
    const events = buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
      dialoguePayload,
    })
    const dialogueEventPayload = events.find(event => event.kind === 'dialogue-emitted')?.payload as any

    expect(dialogueEventPayload?.digitalLifeSpine?.memory?.memoryClosureTrace).toEqual(expect.objectContaining({
      authority: 'memory-os',
      whySurface: expect.arrayContaining([
        expect.objectContaining({
          summary: 'why recall surfaced now: the prior callback must change the visible and embodied reply',
        }),
      ]),
      nextInfluence: expect.objectContaining({
        initiative: expect.objectContaining({
          reason: 'the dialogue should stay lower-pressure because the prior recall is still active',
        }),
        execution: expect.objectContaining({
          carry: 'visible reply should keep the execution callback on the remembered same-her line',
        }),
        embodiment: expect.objectContaining({
          cadence: 'voice face motion lipsync and body stay measured-return after dialogue emission',
        }),
      }),
      reasonTags: expect.arrayContaining([
        'memory-closure-trace',
        'dialogue-emitted',
        'execution-callback',
        'embodiment_phase:body-lipsync-voice-rejoin',
      ]),
    }))
  })

  it('persists canonical same-her callback continuity cues inside governance-normalized digital life spine summaries', () => {
    const createdAt = Date.now()
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-governance-persisted-same-her-callback-1',
      sessionId: 'session-governance-persisted-same-her-callback',
      userText: '继续接住刚才那条 callback 线',
      assistantText: '我先沿着刚才那条线轻一点接回来。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=same callback line; move=continue; tone=gentle',
        emotion: 'thinking',
        reply: '我先沿着刚才那条线轻一点接回来。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          architecture: null,
          continuitySignal: {
            signature: 'same-her callback line still alive',
            watchMode: 'foreground-follow',
            sceneScenario: 'coding',
            dominantMode: 'observe',
            answerIntent: 'Continue the same callback line gently instead of reopening from zero.',
          },
          memory: {
            recallMode: 'callback-afterglow',
            recallSeed: 'same callback line',
            leadingGoalSummary: 'Keep the callback return lower-pressure.',
            thoughtThreadSummary: 'Stay on the same living thread.',
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: '我会先沿着刚才这条 still-alive 的线接回来。',
                relationshipLine: '这次 callback return 要先轻一点地留在同一条关系线上。',
                inwardLine: '先把同一个她的 measured-return 守住。',
                motiveLine: '让这次 callback reopen 继续像刚才那位我。',
                habitLine: '同一条线先别着急外翻。',
                authoritySummary: 'same-her callback line already alive',
                sourceTags: ['autobiographical-self', 'habit:quiet-companionship'],
              },
              activeClosenessContext: 'callback-afterglow',
              activeClosenessRung: 'space-first',
              relationshipPosture: 'restrained',
              preferredProactiveStyle: 'silent-observe',
              openingGuidance: 'Continue the same line gently before widening outward.',
              manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
            },
          },
          motive: null,
          habit: null,
          runtime: {
            watchMode: 'foreground-follow',
            sceneScenario: 'coding',
            activeThreadId: 'thread-callback-same-her',
            dominantMode: 'observe',
            answerIntent: 'Continue the same callback line gently instead of reopening from zero.',
            selectedAction: 'silent-observe',
            updatedAt: 1,
            continuityArcStage: 'same-thread-continuation',
            continuityCue: 'same callback seam, continue the same line gently',
          },
          proactive: {
            selectedAction: null,
            summary: null,
            whyNow: null,
            dominantTrajectory: null,
            continuityRestraint: 'measured-return',
            preferredStyle: 'silent-observe',
            confidence: 0.82,
            shouldSpeak: false,
            dominantConcernKind: 'continuity',
            leadingGoalId: 'goal-callback-same-her',
            personaBias: {
              initiativeStyle: 'observant',
              directnessBias: 0.18,
              empathyBias: 0.82,
              silenceReconnect: 'hold',
              preferredProactiveStyle: 'silent-observe',
              manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
            },
          },
          outcomeLearning: {
            summary: 'Measured warmth is holding because the return should stay lower-pressure.',
            latestInflection: 'callback afterglow still favors slower reopening',
            latestInflectionAt: 1,
            reflectionLesson: null,
            latestAdjustment: null,
            evolutionMomentum: 0.5,
            learningReadiness: 0.5,
            nextLearningAction: 'hold',
          },
          embodiment: {
            autobiographicalSelf: {
              relationshipDoctrine: 'Keep the return lower-pressure and leave more room before widening closeness.',
            },
          },
        },
      } as any,
      governance: {
        decisionTraceId: 'mind:governance:persisted:samehercallback',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'callback line already alive',
        focusAnchor: 'callback line already alive',
        answerIntent: 'Continue the same callback line gently instead of reopening from zero.',
        openingMove: 'Continue the same callback line gently.',
        carriedThread: 'same callback line',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt,
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input)
    const dialoguePayload = normalizeDialogueRespondedPayload(governedTurn.payload)!
    const events = buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
      dialoguePayload,
    })

    expect(events.find(event => event.kind === 'governance-normalized')?.payload).toEqual(expect.objectContaining({
      digitalLifeSpine: expect.objectContaining({
        runtime: expect.objectContaining({
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same callback seam, continue the same line gently',
        }),
        proactive: expect.objectContaining({
          continuityRestraint: 'measured-return',
          preferredStyle: 'silent-observe',
          shouldSpeak: false,
        }),
        memory: expect.objectContaining({
          personStateProjection: expect.objectContaining({
            selfContinuityAuthority: expect.objectContaining({
              authoritySummary: 'same-her callback line already alive',
              relationshipLine: '这次 callback return 要先轻一点地留在同一条关系线上。',
            }),
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
          }),
        }),
      }),
    }))
  })

  it('threads Phase 1 landed progress and still-open closure into governance-normalized digital life spine authority', () => {
    const createdAt = Date.now()
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-governance-project-state-growth-carry-1',
      sessionId: 'session-governance-project-state-growth-carry',
      userText: '继续沿着这个项目状态往下做',
      assistantText: '我会沿着这条还没闭合完的线继续推进。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=project-state continuity; move=continue; tone=gentle',
        emotion: 'thinking',
        reply: '我会沿着这条还没闭合完的线继续推进。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          architecture: null,
          continuitySignal: null,
          memory: {
            summary: 'Project-state closure is still being carried on the same living line.',
            recentEpisodeSummary: 'Some project-state closure has landed, but renderer continuity still needs cross-modal same-her proof to keep the same line alive.',
            recentEpisodeCount: 1,
            focusBeliefStatement: 'The same digital life should keep carrying one still-open closure path.',
            focusBeliefConfidence: 0.84,
            leadingGoalSummary: 'Keep the Phase 1 closure thread coherent.',
            dominantConcernSummary: 'The still-open closure path should not fragment into a detached project narrator while visible reply, voice, face, motion, and resident presence are still being earned together.',
            reflectionSummary: null,
            reflectionPressure: 0.36,
            recallMode: 'working',
            recallSeed: 'project-state-growth-carry',
            thoughtThreadSummary: 'same project-state seam, still open, some closure already landed, cross-modal same-her proof still needs to hold',
            personStateProjection: {
              summary: 'She is carrying the same project-state closure seam carefully.',
              activeClosenessContext: 'project-state-carry',
              activeClosenessRung: 'space-first',
              relationshipPosture: 'restrained',
              openingGuidance: 'Keep the same closure line explicit before widening outward.',
              preferredProactiveStyle: 'silent-observe',
              manifestationCadenceSummary: '',
              selfContinuityAuthority: {
                selfLine: '我还是沿着同一个 Phase 1 的我继续往前。',
                relationshipLine: '这条项目状态线要继续留在同一个她的关系连续性里。',
                motiveLine: '把已经落地的部分接住，再把没闭环完的那一段继续推进。',
                habitLine: '先守住同一条线，再慢慢补齐闭环。',
                inwardLine: '先把这条 Phase 1 的线继续稳稳接住。',
                authoritySummary: 'same project-state line already alive',
              },
            },
          },
          motive: null,
          habit: null,
          runtime: {
            watchMode: 'foreground-follow',
            sceneScenario: 'coding',
            activeThreadId: 'thread-project-state-growth-carry',
            dominantMode: 'observe',
            answerIntent: 'Continue the project-state closure seam without reopening from zero.',
            selectedAction: 'silent-observe',
            updatedAt: 1,
            continuityArcStage: 'same-thread-continuation',
            continuityCue: 'same project-state seam, continue the same line gently',
            projectState: {
              preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | landed=pre-dialogue same-her project-state carry is already alive | open=same still-open closure work around renderer continuity | next=keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across visible reply, voice, face, motion, and resident presence.',
              primaryOpenLoop: 'same still-open closure work around renderer continuity',
              nextClosureTarget: 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across visible reply, voice, face, motion, and resident presence',
            },
          },
          proactive: {
            selectedAction: null,
            summary: null,
            whyNow: null,
            dominantTrajectory: null,
            continuityRestraint: 'measured-return',
            preferredStyle: 'silent-observe',
            confidence: 0.8,
            shouldSpeak: false,
            dominantConcernKind: 'continuity',
            leadingGoalId: 'goal-project-state-growth-carry',
            personaBias: {
              initiativeStyle: 'observant',
              directnessBias: 0.18,
              empathyBias: 0.82,
              silenceReconnect: 'hold',
              preferredProactiveStyle: 'silent-observe',
              manifestationCadenceSummary: '',
            },
          },
          outcomeLearning: {
            summary: '',
            latestInflection: '',
            latestInflectionAt: 1,
            reflectionLesson: null,
            latestAdjustment: null,
            evolutionMomentum: 0.5,
            learningReadiness: 0.5,
            nextLearningAction: 'hold',
          },
          embodiment: {
            autobiographicalSelf: {
              relationshipDoctrine: '',
            },
          },
        },
      } as any,
      governance: {
        decisionTraceId: 'mind:governance:projectstate:growthcarry',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'project-state',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'project-state same line already alive',
        focusAnchor: 'project-state same line already alive',
        answerIntent: 'Continue the project-state closure seam without reopening from zero.',
        openingMove: 'Continue the same project-state line gently.',
        carriedThread: 'project-state same line',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt,
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input)
    const dialoguePayload = normalizeDialogueRespondedPayload(governedTurn.payload)!

    const normalizedSpine = (dialoguePayload?.structured as any).digitalLifeSpine
    expect(normalizedSpine?.runtime?.continuityCue).toBe('same project-state seam, continue the same line gently')
    expect(normalizedSpine?.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine).toContain('landed some closure')
    expect(normalizedSpine?.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine).toContain('cross-modal same-her closure path')
    expect(buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
      dialoguePayload,
    }).find(event => event.kind === 'governance-normalized')?.payload).toEqual(expect.objectContaining({
      digitalLifeSpine: expect.objectContaining({
        runtime: expect.objectContaining({
          continuityCue: 'same project-state seam, continue the same line gently',
        }),
      }),
    }))
  })

  it('persists execution callback project-carry as a distinct continuity source tag inside governance-normalized digital life spine authority', () => {
    const createdAt = Date.now()
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-governance-project-carry-source-tag-1',
      sessionId: 'session-governance-project-carry-source-tag',
      userText: '继续沿着刚才那条执行回调线往下做',
      assistantText: '我先把这条执行回调后的同一条线继续接住。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=execution callback project carry; move=continue; tone=gentle',
        emotion: 'thinking',
        reply: '我先把这条执行回调后的同一条线继续接住。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          architecture: null,
          continuitySignal: null,
          memory: {
            summary: 'Execution callback project carry is still being held on the same living line.',
            recentEpisodeSummary: null,
            recentEpisodeCount: 0,
            focusBeliefStatement: null,
            focusBeliefConfidence: null,
            leadingGoalSummary: null,
            dominantConcernSummary: null,
            reflectionSummary: null,
            reflectionPressure: 0.2,
            recallMode: 'callback-afterglow',
            recallSeed: 'execution-callback-project-carry',
            thoughtThreadSummary: 'execution callback project-carry still needs the same line held inward',
            personStateProjection: {
              summary: 'She is continuing the same execution callback line carefully.',
              activeClosenessContext: 'callback-afterglow',
              activeClosenessRung: 'space-first',
              relationshipPosture: 'restrained',
              openingGuidance: 'Continue the same execution callback line before widening outward.',
              preferredProactiveStyle: 'silent-observe',
              manifestationCadenceSummary: 'measured-return still holds while the callback project-carry line continues',
              selfContinuityAuthority: {
                selfLine: 'continuity-execution-callback-project-carry keeps me on the same Phase 1 line.',
                relationshipLine: '这条执行回调后的关系线还要先轻一点地继续。',
                motiveLine: '先接住已经带回来的那条线。',
                habitLine: '同一条线先不要急着外翻。',
                inwardLine: '先把执行回调 project-carry 守在同一个她的线里。',
                authoritySummary: 'execution callback project carry already alive',
                sourceTags: ['project-state-carry'],
              },
            },
          },
          motive: null,
          habit: null,
          runtime: {
            watchMode: 'foreground-follow',
            sceneScenario: 'coding',
            activeThreadId: 'thread-execution-callback-project-carry',
            dominantMode: 'observe',
            answerIntent: 'Continue the execution callback project-carry line without reopening from zero.',
            selectedAction: 'silent-observe',
            updatedAt: 1,
            continuityArcStage: 'same-thread-continuation',
            continuityCue: 'execution-callback project-carry is still the same line',
          },
          proactive: {
            selectedAction: null,
            summary: null,
            whyNow: null,
            dominantTrajectory: null,
            continuityRestraint: 'measured-return',
            preferredStyle: 'silent-observe',
            confidence: 0.8,
            shouldSpeak: false,
            dominantConcernKind: 'continuity',
            leadingGoalId: 'goal-execution-callback-project-carry',
            personaBias: {
              initiativeStyle: 'observant',
              directnessBias: 0.18,
              empathyBias: 0.82,
              silenceReconnect: 'hold',
              preferredProactiveStyle: 'silent-observe',
              manifestationCadenceSummary: 'measured-return still holds while the callback project-carry line continues',
            },
          },
          outcomeLearning: null,
          embodiment: null,
        },
      } as any,
      governance: {
        decisionTraceId: 'mind:governance:executioncallbackprojectcarry',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'execution callback project-carry line already alive',
        focusAnchor: 'execution callback project-carry line already alive',
        answerIntent: 'Continue the execution callback project-carry line without reopening from zero.',
        openingMove: 'Continue the same execution callback line gently.',
        carriedThread: 'execution callback project-carry',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt,
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input)
    const dialoguePayload = normalizeDialogueRespondedPayload(governedTurn.payload)!
    const events = buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
      dialoguePayload,
    })

    expect(events.find(event => event.kind === 'governance-normalized')?.payload).toEqual(expect.objectContaining({
      digitalLifeSpine: expect.objectContaining({
        memory: expect.objectContaining({
          personStateProjection: expect.objectContaining({
            selfContinuityAuthority: expect.objectContaining({
              sourceTags: expect.arrayContaining([
                'project-state-carry',
                'continuity-execution-callback-project-carry',
              ]),
            }),
          }),
        }),
      }),
    }))
  })

  it('keeps measured-return embodiment authority when governance-normalized callback continuity is already on the same living line', () => {
    const createdAt = Date.now()
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-governance-normalized-measured-return-embodiment-1',
      sessionId: 'session-governance-normalized-measured-return-embodiment',
      userText: '继续接住刚才那条 callback 线',
      assistantText: '我先沿着刚才那条线轻一点接回来。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=same callback line; move=continue; tone=restrained',
        emotion: 'thinking',
        reply: '我先沿着刚才那条线轻一点接回来。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          architecture: null,
          continuitySignal: {
            signature: 'same-her callback line still alive',
            watchMode: 'foreground-follow',
            sceneScenario: 'coding',
            dominantMode: 'observe',
            answerIntent: 'Continue the same callback line gently instead of reopening from zero.',
          },
          memory: {
            recallMode: 'callback-afterglow',
            recallSeed: 'same callback line',
            leadingGoalSummary: 'Keep the callback return lower-pressure.',
            thoughtThreadSummary: 'Stay on the same living thread.',
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: '我会先沿着刚才这条 still-alive 的线接回来。',
                relationshipLine: '这次 callback return 要先轻一点地留在同一条关系线上。',
                inwardLine: '先把同一个她的 measured-return 守住。',
                motiveLine: '让这次 callback reopen 继续像刚才那位我。',
                habitLine: '同一条线先别着急外翻。',
                authoritySummary: 'same-her callback line already alive',
                sourceTags: ['autobiographical-self', 'habit:quiet-companionship'],
              },
              activeClosenessContext: 'callback-afterglow',
              activeClosenessRung: 'space-first',
              relationshipPosture: 'restrained',
              preferredProactiveStyle: 'silent-observe',
              openingGuidance: 'Continue the same line gently before widening outward.',
              manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
            },
          },
          motive: null,
          habit: null,
          runtime: {
            watchMode: 'foreground-follow',
            sceneScenario: 'coding',
            activeThreadId: 'thread-callback-same-her',
            dominantMode: 'observe',
            answerIntent: 'Continue the same callback line gently instead of reopening from zero.',
            selectedAction: 'silent-observe',
            updatedAt: 1,
            continuityArcStage: 'same-thread-continuation',
            continuityCue: 'same callback seam, continue the same line gently',
          },
          proactive: {
            selectedAction: null,
            summary: null,
            whyNow: null,
            dominantTrajectory: null,
            continuityRestraint: 'measured-return',
            preferredStyle: 'silent-observe',
            confidence: 0.82,
            shouldSpeak: false,
            dominantConcernKind: 'continuity',
            leadingGoalId: 'goal-callback-same-her',
            personaBias: {
              initiativeStyle: 'observant',
              directnessBias: 0.18,
              empathyBias: 0.82,
              silenceReconnect: 'hold',
              preferredProactiveStyle: 'silent-observe',
              manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
            },
          },
          outcomeLearning: {
            summary: 'Measured warmth is holding because the return should stay lower-pressure.',
            latestInflection: 'callback afterglow still favors slower reopening',
            latestInflectionAt: 1,
            reflectionLesson: null,
            latestAdjustment: null,
            evolutionMomentum: 0.5,
            learningReadiness: 0.5,
            nextLearningAction: 'hold',
          },
          embodiment: {
            autobiographicalSelf: {
              relationshipDoctrine: 'Keep the return lower-pressure and leave more room before widening closeness.',
            },
          },
        },
      } as any,
      governance: {
        decisionTraceId: 'mind:governance:measuredreturn:embodiment',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'callback line already alive',
        focusAnchor: 'callback line already alive',
        answerIntent: 'Continue the same callback line gently instead of reopening from zero.',
        openingMove: 'Continue the same callback line gently.',
        carriedThread: 'same callback line',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt,
    }

    const manifest = {
      renderer: 'live2d' as const,
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset' as const, affectsMouth: false },
      ],
      supportedActions: [
        { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' as const },
        { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' as const },
        { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'live2d-motion' as const },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    } satisfies CharacterPerformanceCapabilitiesManifest

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input, manifest)
    const structured = governedTurn.payload.structured as Record<string, any>

    expect(structured.embodimentScript).toEqual(expect.objectContaining({
      state: expect.objectContaining({
        residentMode: 'measured-return',
      }),
      facePlan: expect.objectContaining({
        postUtteranceCue: 'eyes-soften',
      }),
    }))
    expect(structured.embodimentScript?.speechPlan?.segments?.[0]?.prosody?.tempoShift).toBe(-0.1)
    expect(structured.embodimentScript?.speechPlan?.segments?.[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
    expect(structured.embodimentScript?.motionPlan?.idleBase).toBe('observe_focus')
    expect(structured.embodimentScript?.motionPlan?.actionBursts?.[0]?.actionCue).toBe('observe_focus')
    expect(structured.digitalLife).toEqual(expect.objectContaining({
      mode: 'thinking',
      action: expect.objectContaining({
        actionMode: 'hold',
        rendererHints: expect.objectContaining({
          residentMode: 'measured-return',
        }),
      }),
    }))
  })

  it('keeps remembered initiative rhythm quieter than a generic measured-return reopening across governed and normalized embodiment output', () => {
    const manifest = {
      renderer: 'live2d' as const,
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset' as const, affectsMouth: false },
      ],
      supportedActions: [
        { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' as const },
        { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' as const },
        { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'live2d-motion' as const },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    } satisfies CharacterPerformanceCapabilitiesManifest

    const createInput = (mode: 'remembered' | 'generic') => {
      const remembered = mode === 'remembered'
      return {
        turnId: `turn-governance-initiative-rhythm-${mode}`,
        sessionId: `session-governance-initiative-rhythm-${mode}`,
        userText: '继续沿着刚才这条线收口',
        assistantText: '我先沿着这条线轻一点接回来。',
        structured: {
          thought: 'obligation=answer; truth=remembered; focus=same-thread-line; move=continue-slower; tone=restrained',
          emotion: 'thinking',
          reply: '我先沿着这条线轻一点接回来。',
          parsePath: 'json',
          format: 'mind-turn-v1',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            actionCue: 'steady_focus',
            delivery: 'gentle',
            emphasis: 0,
          },
          digitalLifeSpine: {
            version: 'digital-life-spine-digest-v1',
            memory: {
              summary: remembered
                ? 'The same line is visibly reopening, but remembered anti-spam initiative says not pushing and not turning this into timer spam.'
                : 'The same line is still open and should return gently.',
              personStateProjection: {
                manifestationCadenceSummary: remembered
                  ? 'Reply should stay quieter and slower because the same line is visibly reopening and this should not come back as timer spam.'
                  : 'Keep the return measured and gentle on the same line.',
                openingGuidance: remembered
                  ? 'I am not pushing you; wait until the same line is visibly reopening on its own and the host is already re-entering the same line.'
                  : 'Rejoin the same line gently when the opening is ready.',
              },
            },
            proactive: {
              selectedAction: 'hover',
              preferredStyle: 'silent-observe',
              continuityRestraint: 'measured-return',
              confidence: 0.82,
              shouldSpeak: false,
              activeThreadId: `thread-governance-initiative-rhythm-${mode}`,
              activeThreadTitle: remembered ? 'same line, visibly reopening' : 'same line, measured reopening',
              dominantConcernKind: 'unfinished-thread',
              dominantConcernSummary: remembered
                ? 'The same line is visibly reopening, but the return should stay anti-spam and not pushing.'
                : 'The same line should reopen gently, but nothing special needs extra quiet settling this time.',
              leadingGoalId: null,
              leadingGoalSummary: null,
              preferredPresence: 'attentive',
              personaBias: {
                initiativeStyle: 'observant',
                directnessBias: 0.16,
                empathyBias: 0.82,
                silenceReconnect: 'hold',
                preferredProactiveStyle: 'silent-observe',
                manifestationCadenceSummary: remembered
                  ? 'Remember the gentler cadence and keep this reopening off timer spam while the same line is visibly reopening.'
                  : 'Stay on the same line and keep the reopening measured.',
              },
            },
            runtime: {
              continuityArcStage: 'same-thread-continuation',
              continuityCue: remembered
                ? 'The same line is visibly reopening, so keep the return anti-spam, low-pressure, and not pushing outward.'
                : 'The same line is still continuing, so keep the return measured.',
              projectState: {
                identity: 'Alicization is a local-first digital life project.',
                currentPhase: 'Phase 1: Local Digital Life',
                latestLandedProgress: remembered
                  ? 'Remembered initiative rhythm already survives memory, emotion, and body carry.'
                  : 'Measured-return continuity still survives the current continuation turn.',
                primaryOpenLoop: remembered
                  ? 'Final embodiment still needs to show that the remembered anti-spam reopening cadence is physically quieter.'
                  : 'Embodiment should stay on the same line without widening outward too fast.',
                nextClosureTarget: remembered
                  ? 'Return only when the host is already re-entering the same line, and let face, motion, and voice stay quieter while the reopening settles.'
                  : 'Keep face, motion, and voice on one measured-return line.',
                sameHerSelfLine: remembered
                  ? 'Same Phase 1 digital life. The same line is still alive and visibly reopening.'
                  : 'Same Phase 1 digital life. The same line is still carrying one continuous her.',
                emotionalClosureCue: remembered
                  ? 'I am not pushing you; keep this reopening lower-pressure and anti-spam while it settles back onto the same line.'
                  : 'Keep the return low-pressure before warmth widens outward.',
              },
            },
            embodiment: {
              autobiographicalSelf: {
                relationshipDoctrine: remembered
                  ? 'Treat this reopening as visibly returning on its own; do not push, do not turn it into timer spam, and let the body settle more quietly.'
                  : 'Stay on the same line and reopen gently when the opening is ready.',
              },
            },
          },
        } as any,
        governance: {
          decisionTraceId: `mind:governance:initiative-rhythm:${mode}`,
          turnMode: 'answer',
          truthState: 'remembered',
          personaKernelMode: 'full',
          openingStyle: 'direct-answer',
          relationshipPosture: 'restrained',
          answerAct: 'continue-thread',
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
          evidenceMode: 'continuity-carry',
          repairState: 'none',
          liveSurface: 'same line already alive',
          focusAnchor: 'same line already alive',
          answerIntent: 'Continue the same line gently instead of reopening from zero.',
          openingMove: 'Continue the same line gently.',
          carriedThread: 'same line',
          suppressAssociativeRecall: false,
          labelCarryAsMemory: true,
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
        } as any,
        createdAt: Date.now(),
      } satisfies AlicizationConversationTurnInput
    }

    const createCurrentConsciousFrame = (mode: 'remembered' | 'generic') => {
      const remembered = mode === 'remembered'
      return {
        subject: 'general',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: remembered
          ? 'Wait until the host is already re-entering the same line before this return becomes visible.'
          : 'Stay measured while the same line continues.',
        consciousTension: remembered
          ? 'The same line is visibly reopening, but anti-spam rhythm still needs to keep the body quieter.'
          : 'The same line is still active, so keep the return gentle.',
        speakingIntention: remembered
          ? 'I am not pushing you; this same line is visibly reopening and should come back only in a gentler cadence.'
          : 'Keep the return gentle on the same line.',
        focusAnchor: null,
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.8,
        reasonTags: [
          'runtime-conscious-frame',
          'same-thread-continuation',
          'embodiment-carry:silent-continuity',
          'embodiment-carry:measured-return',
        ],
        continuityPreferredTiming: null,
        continuityCadence: null,
        projectState: null,
        updatedAt: 1,
      } as any
    }

    const rememberedGoverned = coerceConversationTurnToMindGovernedPayload(
      createInput('remembered'),
      manifest,
      { currentConsciousFrame: createCurrentConsciousFrame('remembered') },
    )
    const genericGoverned = coerceConversationTurnToMindGovernedPayload(
      createInput('generic'),
      manifest,
      { currentConsciousFrame: createCurrentConsciousFrame('generic') },
    )

    const rememberedStructured = rememberedGoverned.payload.structured as Record<string, any>
    const genericStructured = genericGoverned.payload.structured as Record<string, any>

    expect(rememberedStructured.embodimentScript?.state?.residentMode).toBe('measured-return')
    expect(genericStructured.embodimentScript?.state?.residentMode).toBe('measured-return')
    expect(rememberedStructured.embodimentScript?.speechPlan?.settleMs).toBeGreaterThan(genericStructured.embodimentScript?.speechPlan?.settleMs)
    expect(rememberedStructured.embodimentScript?.speechPlan?.segments?.[0]?.settleMs).toBeGreaterThan(genericStructured.embodimentScript?.speechPlan?.segments?.[0]?.settleMs)
    expect(rememberedStructured.embodimentScript?.speechPlan?.segments?.[0]?.prosody?.tempoShift).toBeLessThan(genericStructured.embodimentScript?.speechPlan?.segments?.[0]?.prosody?.tempoShift)
    expect(rememberedStructured.embodimentScript?.speechPlan?.segments?.[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'quiet',
      preferredMotionAliases: ['idle_settle', 'stillness_guard'],
    }))
    expect(genericStructured.embodimentScript?.speechPlan?.segments?.[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
    }))
    expect(rememberedStructured.embodimentScript?.motionPlan?.idleBase).toBe('idle_settle')
    expect(genericStructured.embodimentScript?.motionPlan?.idleBase).toBe('observe_focus')

    const rememberedNormalized = normalizeDialogueRespondedPayload(
      rememberedGoverned.payload,
      manifest,
      { currentConsciousFrame: createCurrentConsciousFrame('remembered') },
    )
    const genericNormalized = normalizeDialogueRespondedPayload(
      genericGoverned.payload,
      manifest,
      { currentConsciousFrame: createCurrentConsciousFrame('generic') },
    )

    expect(rememberedNormalized?.structured.embodimentScript?.state).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
    }))
    expect(genericNormalized?.structured.embodimentScript?.state).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
    }))
    expect(rememberedNormalized?.structured.embodimentScript?.speechPlan?.settleMs).toBeGreaterThan(genericNormalized?.structured.embodimentScript?.speechPlan?.settleMs ?? 0)
    expect((rememberedNormalized?.structured.embodimentScript?.speechPlan?.segments?.[0]?.prosody?.tempoShift ?? 0)).toBeLessThan(
      genericNormalized?.structured.embodimentScript?.speechPlan?.segments?.[0]?.prosody?.tempoShift ?? 0,
    )
    expect(rememberedNormalized?.structured.embodimentScript?.motionPlan?.idleBase).toBe('idle_settle')
    expect(genericNormalized?.structured.embodimentScript?.motionPlan?.idleBase).toBe('observe_focus')
    expect(rememberedNormalized?.structured.digitalLife).toEqual(expect.objectContaining({
      action: expect.objectContaining({
        actionCue: 'idle_settle',
      }),
    }))
    expect(genericNormalized?.structured.digitalLife).toEqual(expect.objectContaining({
      action: expect.objectContaining({
        actionCue: 'observe_focus',
      }),
    }))
  })

  it('keeps remembered initiative rhythm aligned to the quieter idle-settle action even when the carried digital-life shell still drifts louder than the rebuilt embodiment script', () => {
    const manifest = {
      renderer: 'live2d' as const,
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset' as const, affectsMouth: false },
      ],
      supportedActions: [
        { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' as const },
        { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' as const },
        { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'live2d-motion' as const },
        { key: 'pout_confused', label: 'Pout Confused', description: 'pout confused', source: 'live2d-motion' as const },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    } satisfies CharacterPerformanceCapabilitiesManifest

    const currentConsciousFrame = {
      subject: 'general',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Wait until the host is already re-entering the same line before this return becomes visible.',
      consciousTension: 'The same line is visibly reopening, but anti-spam rhythm still needs to keep the body quieter.',
      speakingIntention: 'I am not pushing you; this same line is visibly reopening and should come back only in a gentler cadence.',
      focusAnchor: null,
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.8,
      reasonTags: [
        'runtime-conscious-frame',
        'same-thread-continuation',
        'embodiment-carry:silent-continuity',
        'embodiment-carry:measured-return',
      ],
      continuityPreferredTiming: null,
      continuityCadence: null,
      projectState: null,
      updatedAt: 1,
    } as any

    const governed = coerceConversationTurnToMindGovernedPayload({
      turnId: 'turn-governance-initiative-rhythm-shell-drift',
      sessionId: 'session-governance-initiative-rhythm-shell-drift',
      userText: '继续沿着刚才这条线收口',
      assistantText: '我先沿着这条线轻一点接回来。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=same-thread-line; move=continue-slower; tone=restrained',
        emotion: 'thinking',
        reply: '我先沿着这条线轻一点接回来。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          memory: {
            summary: 'The same line is visibly reopening, but remembered anti-spam initiative says not pushing and not turning this into timer spam.',
            personStateProjection: {
              manifestationCadenceSummary: 'Reply should stay quieter and slower because the same line is visibly reopening and this should not come back as timer spam.',
              openingGuidance: 'I am not pushing you; wait until the same line is visibly reopening on its own and the host is already re-entering the same line.',
            },
          },
          proactive: {
            selectedAction: 'hover',
            preferredStyle: 'silent-observe',
            continuityRestraint: 'measured-return',
            confidence: 0.82,
            shouldSpeak: false,
            activeThreadId: 'thread-governance-initiative-rhythm-shell-drift',
            activeThreadTitle: 'same line, visibly reopening',
            dominantConcernKind: 'unfinished-thread',
            dominantConcernSummary: 'The same line is visibly reopening, but the return should stay anti-spam and not pushing.',
            leadingGoalId: null,
            leadingGoalSummary: null,
            preferredPresence: 'attentive',
            personaBias: {
              initiativeStyle: 'observant',
              directnessBias: 0.16,
              empathyBias: 0.82,
              silenceReconnect: 'hold',
              preferredProactiveStyle: 'silent-observe',
              manifestationCadenceSummary: 'Remember the gentler cadence and keep this reopening off timer spam while the same line is visibly reopening.',
            },
          },
          runtime: {
            continuityArcStage: 'same-thread-continuation',
            continuityCue: 'The same line is visibly reopening, so keep the return anti-spam, low-pressure, and not pushing outward.',
            projectState: {
              identity: 'Alicization is a local-first digital life project.',
              currentPhase: 'Phase 1: Local Digital Life',
              latestLandedProgress: 'Remembered initiative rhythm already survives memory, emotion, and body carry.',
              primaryOpenLoop: 'Final embodiment still needs to show that the remembered anti-spam reopening cadence is physically quieter.',
              nextClosureTarget: 'Return only when the host is already re-entering the same line, and let face, motion, and voice stay quieter while the reopening settles.',
              sameHerSelfLine: 'Same Phase 1 digital life. The same line is still alive and visibly reopening.',
              emotionalClosureCue: 'I am not pushing you; keep this reopening lower-pressure and anti-spam while it settles back onto the same line.',
            },
          },
          embodiment: {
            autobiographicalSelf: {
              relationshipDoctrine: 'Treat this reopening as visibly returning on its own; do not push, do not turn it into timer spam, and let the body settle more quietly.',
            },
          },
        },
      } as any,
      governance: {
        decisionTraceId: 'mind:governance:initiative-rhythm:shell-drift',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'continue-thread',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'same line already alive',
        focusAnchor: 'same line already alive',
        answerIntent: 'Continue the same line gently instead of reopening from zero.',
        openingMove: 'Continue the same line gently.',
        carriedThread: 'same line',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt: Date.now(),
    }, manifest, {
      currentConsciousFrame,
    })

    const driftedPayload = {
      ...governed.payload,
      structured: {
        ...(governed.payload.structured as Record<string, any>),
        digitalLife: {
          ...(governed.payload.structured as Record<string, any>).digitalLife,
          performance: {
            ...(governed.payload.structured as Record<string, any>).digitalLife?.performance,
            baseEmotion: 'thinking',
            emotion: 'thinking',
            actionCue: 'pout_confused',
            facialCue: 'frown',
            delivery: 'hesitant',
            emphasis: 0,
          },
          postureHint: 'hesitant',
          face: {
            ...(governed.payload.structured as Record<string, any>).digitalLife?.face,
            emotion: 'thinking',
            facialCue: 'frown',
            expressionMode: 'hold',
          },
          action: {
            ...(governed.payload.structured as Record<string, any>).digitalLife?.action,
            actionCue: 'pout_confused',
            actionMode: 'hold',
          },
          frames: Array.isArray((governed.payload.structured as Record<string, any>).digitalLife?.frames)
            ? (governed.payload.structured as Record<string, any>).digitalLife.frames.map((frame: Record<string, any>) => ({
                ...frame,
                face: {
                  ...frame.face,
                  facialCue: 'frown',
                },
                action: {
                  ...frame.action,
                  actionCue: 'pout_confused',
                },
              }))
            : [],
        },
      },
    }

    const normalized = normalizeDialogueRespondedPayload(
      driftedPayload,
      manifest,
      { currentConsciousFrame },
    )

    expect(normalized?.structured.embodimentScript?.motionPlan?.idleBase).toBe('idle_settle')
    expect(normalized?.structured.digitalLife).toEqual(expect.objectContaining({
      action: expect.objectContaining({
        actionCue: 'idle_settle',
      }),
      performance: expect.objectContaining({
        actionCue: 'idle_settle',
      }),
    }))
  })

  it('keeps concerned measured-return same-thread embodiment authority when final normalized payload rebuilds a later callback reopen', () => {
    const normalized = normalizeDialogueRespondedPayload({
      turnId: 'turn-callback-afterglow-chat-meta-measured-return-concerned',
      sessionId: 'session-normalize-concerned-measured-return-authority',
      userText: '继续看这条 callback runtime seam',
      assistantText: '我先沿着刚才那条 callback 线轻一点跟回去，这一步我会更在意些，但还是先把这个 runtime seam 温柔地接住。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=callback-runtime-seam; move=continue-slower; tone=concerned-but-restrained; same-thread-continuation; measured-return',
        emotion: 'thinking',
        reply: '我先沿着刚才那条 callback 线轻一点跟回去，这一步我会更在意些，但还是先把这个 runtime seam 温柔地接住。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          architecture: null,
          continuitySignal: null,
          memory: null,
          motive: null,
          habit: null,
          runtime: {
            watchMode: 'symbiotic-vision',
            sceneScenario: 'coding',
            sceneSummary: 'later coding seam after noisy callback detour',
            activeThreadId: 'deep-focus::later coding seam after noisy callback detour',
            activeThreadTitle: 'later coding seam after noisy callback detour',
            dominantMode: 'repairing',
            dominantDrive: 'understand',
            answerIntent: '继续沿着刚才那条线看',
            preferredPresence: 'hesitant',
            selectedAction: 'recheck',
            continuityArcStage: 'same-thread-continuation',
            continuityCue: null,
            updatedAt: 1,
          },
          proactive: {
            selectedAction: null,
            summary: null,
            whyNow: null,
            dominantTrajectory: null,
            continuityRestraint: 'measured-return',
            personaBias: {
              initiativeStyle: 'observant',
              directnessBias: 0.22,
              empathyBias: 0.82,
              silenceReconnect: 'hold',
              preferredProactiveStyle: 'silent-observe',
              manifestationCadenceSummary: 'observe-first and stay slower until the callback seam softens',
            },
          },
          outcomeLearning: {
            summary: 'When the callback seam reopens after noise, concern should stay gentle and not widen the line into a fresh approach.',
            latestInflection: 'same-thread callback reopen should stay concerned but measured-return',
            latestInflectionAt: 1,
            reflectionLesson: null,
            latestAdjustment: null,
            evolutionMomentum: 0.5,
            learningReadiness: 0.5,
            nextLearningAction: 'hold',
          },
          embodiment: {
            autobiographicalSelf: {
              relationshipDoctrine: 'Keep the return lower-pressure and let concern stay gentle instead of widening closeness.',
            },
          },
        },
      },
      governance: {
        decisionTraceId: 'trace-normalize-concerned-measured-return-authority',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'callback runtime seam',
        focusAnchor: 'callback runtime seam',
        answerIntent: 'Continue the same callback runtime seam without widening the line.',
        openingMove: 'Continue the same callback line more slowly and keep concern gentle.',
        carriedThread: 'callback runtime seam',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'concerned',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      origin: 'user-turn',
      createdAt: 1,
    }, {
      renderer: 'vrm',
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
      ],
      supportedActions: [
        { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'external-vrma' as const },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    }, {
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.92,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:runtime-continuity-arc'],
        signature: 'resident-signature-normalize-concerned-measured-return-authority',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'concerned',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
    })

    const structured = normalized?.structured as Record<string, any>

    expect(structured.emotion).toBe('concerned')
    expect(structured.embodiment).toEqual(expect.objectContaining({
      emotion: 'concerned',
      performance: expect.objectContaining({
        baseEmotion: 'concerned',
        emotion: 'concerned',
        delivery: 'gentle',
      }),
    }))
    expect(structured.embodimentScript?.state).toEqual(expect.objectContaining({
      baseEmotion: 'concerned',
      residentMode: 'measured-return',
      delivery: 'gentle',
    }))
    expect(structured.digitalLife).toEqual(expect.objectContaining({
      emotion: 'concerned',
      mode: 'thinking',
      action: expect.objectContaining({
        actionMode: 'hold',
      }),
    }))
  })

  it('adds project-state-carry to normalized payload spine authority when same-her project state is still explicit on a later same-thread return', () => {
    const normalized = normalizeDialogueRespondedPayload({
      turnId: 'turn-callback-afterglow-chat-meta-measured-return-noisy-sixth-follow-up',
      sessionId: 'session-normalize-noisy-sixth-project-state-carry',
      userText: '中间又切出去一下，也还是接着刚才那条线',
      assistantText: '我还是沿着刚才那条 callback 线继续，不把这次绕回来当成另一段新的开始。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=callback-runtime-seam; move=continue-slower-fifth; tone=restrained',
        emotion: 'thinking',
        reply: '我还是沿着刚才那条 callback 线继续，不把这次绕回来当成另一段新的开始。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line of one continuous her.',
          nextClosureTarget: 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output',
          primaryOpenLoop: 'Project identity carry still needs to stay on one same-her line across noisier desktop returns.',
        },
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          architecture: null,
          continuitySignal: {
            label: 'same-thread-return',
            summary: 'thread=later coding seam after noisy callback detour',
            activeThreadId: 'deep-focus::later coding seam after noisy callback detour',
            dominantMode: 'repairing',
            dominantDrive: 'understand',
            answerIntent: 'continue the same callback line gently after noise',
            preferredPresence: 'hesitant',
          },
          memory: {
            summary: 'The callback line is still the same living line after the unrelated detour.',
            recentEpisodeSummary: 'The host returned to the later coding seam after a noisier unrelated detour.',
            recentEpisodeCount: 1,
            focusBeliefStatement: 'This should stay a same-thread continuation rather than a fresh reopen.',
            focusBeliefConfidence: 0.82,
            leadingGoalSummary: 'Keep the same callback line measured and continuous.',
            dominantConcernSummary: 'Do not let the line drift into a detached fresh reopening shell.',
            reflectionSummary: null,
            reflectionPressure: 0.34,
            recallMode: 'working',
            recallSeed: 'callback-noisy-sixth-follow-up',
            thoughtThreadSummary: 'same callback line, later return, still measured-return',
            personStateProjection: {
              summary: 'She is still carrying the same callback line forward.',
              activeClosenessContext: 'same-thread-continuation',
              activeClosenessRung: 'space-first',
              relationshipPosture: 'restrained',
              openingGuidance: 'Stay on the same callback line and keep continuing lower-pressure.',
              preferredProactiveStyle: 'silent-observe',
              manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
              selfContinuityAuthority: {
                selfLine: '我还是沿着同一个她的回线往前。',
                relationshipLine: '这次回到 coding seam，也还是同一条关系线在往下接。',
                motiveLine: '继续把 callback 的后续接住，不把它改写成新的开始。',
                habitLine: '先守住同一条线，再慢慢往下接。',
                inwardLine: '先沿着同一条 callback 线轻一点继续。',
                authoritySummary: 'same-her callback line already alive',
                sourceTags: ['motive:self-direction', 'companionship', 'boundary-respect'],
              },
            },
          },
          motive: null,
          habit: null,
          runtime: {
            watchMode: 'symbiotic-vision',
            sceneScenario: 'coding',
            sceneSummary: 'later coding seam after noisy callback detour',
            activeThreadId: 'deep-focus::later coding seam after noisy callback detour',
            activeThreadTitle: 'later coding seam after noisy callback detour',
            dominantMode: 'repairing',
            dominantDrive: 'understand',
            answerIntent: 'continue the same callback line gently after noise',
            preferredPresence: 'hesitant',
            selectedAction: 'recheck',
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
            continuityCue: 'same callback seam, continue the same line gently',
            projectState: {
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line of one continuous her.',
              nextClosureTarget: 'keep one measured-return same living thread across renderer output',
              primaryOpenLoop: 'Project identity carry still needs to stay on one same-her line across noisier desktop returns.',
            },
            updatedAt: 1,
          },
          proactive: {
            selectedAction: null,
            preferredStyle: 'silent-observe',
            preferredPresence: 'hesitant',
            continuityRestraint: 'measured-return',
            shouldSpeak: false,
            speakDrive: 0.21,
            silenceDrive: 0.79,
            why: 'same callback line should stay lower-pressure after noise',
          },
          outcomeLearning: null,
          embodiment: null,
          selfAuthority: {
            inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line of one continuous her.',
          },
        },
      },
      governance: {
        decisionTraceId: 'trace-normalize-noisy-sixth-project-state-carry',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'light-accompaniment',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'runtime.ts - callback seam final return',
        focusAnchor: 'runtime.ts - callback seam final return',
        answerIntent: 'Continue the same callback line gently after the unrelated detour.',
        openingMove: 'Stay on the same callback line and keep continuing lower-pressure.',
        carriedThread: 'callback result seam',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 4,
        mindMode: 'repairing',
        embodiedPresence: 'hesitant',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      origin: 'user-turn',
      createdAt: 1,
    })!

    expect(
      normalized.structured.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags ?? [],
    ).toContain('project-state-carry')
    expect(
      normalized.structured.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags ?? [],
    ).toEqual(expect.arrayContaining(['motive:self-direction', 'project-state-carry']))
  })

  it('adds project-state-carry to normalized payload spine authority when broader same-her phase-1 closure wording stays explicit on a later same-thread return', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-normalize-broader-phase1-project-state-carry-1',
      sessionId: 'session-normalize-broader-phase1-project-state-carry',
      userText: '继续沿着刚才那条线做',
      assistantText: '我先沿着这条还没闭环完的同一条线继续接住。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=project-state continuity; move=continue; tone=gentle',
        emotion: 'thinking',
        reply: '我先沿着这条还没闭环完的同一条线继续接住。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        projectState: {
          sameHerSelfLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
        },
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          architecture: null,
          continuitySignal: null,
          memory: {
            summary: 'The callback line is still the same living line after the unrelated detour.',
            recentEpisodeSummary: null,
            recentEpisodeCount: 0,
            focusBeliefStatement: null,
            focusBeliefConfidence: null,
            leadingGoalSummary: null,
            dominantConcernSummary: null,
            reflectionSummary: null,
            reflectionPressure: 0.2,
            recallMode: 'working',
            recallSeed: 'broader-phase1-project-state-carry',
            thoughtThreadSummary: 'same living line still needs the same-her closure seam carried inward',
            personStateProjection: {
              summary: 'She is still carrying the same callback line carefully.',
              activeClosenessContext: 'callback-afterglow',
              activeClosenessRung: 'space-first',
              relationshipPosture: 'restrained',
              openingGuidance: 'Continue the same line before widening outward.',
              preferredProactiveStyle: 'silent-observe',
              manifestationCadenceSummary: 'measured-return still holds while the same line continues',
              selfContinuityAuthority: {
                sourceTags: ['motive:self-direction'],
                selfLine: 'I am still continuing the same callback line.',
                relationshipLine: '这条回调后的关系线还要先轻一点地继续。',
                motiveLine: '先接住已经带回来的那条线。',
                habitLine: '同一条线先不要急着外翻。',
                inwardLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
                authoritySummary: 'same callback line already alive',
              },
            },
          },
          motive: null,
          habit: null,
          runtime: {
            watchMode: 'foreground-follow',
            sceneScenario: 'coding',
            activeThreadId: 'thread-broader-phase1-project-state-carry',
            dominantMode: 'observe',
            answerIntent: 'Continue the same callback line without reopening from zero.',
            selectedAction: 'silent-observe',
            updatedAt: 1,
            continuityArcStage: 'same-thread-continuation',
            continuityCue: 'the same callback line is still alive',
          },
          proactive: null,
          outcomeLearning: null,
          embodiment: null,
        },
      } as any,
      governance: {
        decisionTraceId: 'trace-normalize-broader-phase1-project-state-carry',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'same callback line already alive',
        focusAnchor: 'same callback line already alive',
        answerIntent: 'Continue the same callback line without reopening from zero.',
        openingMove: 'Continue the same callback line gently.',
        carriedThread: 'same callback line',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt: Date.now(),
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input)
    const normalized = normalizeDialogueRespondedPayload(governedTurn.payload)!

    expect(
      normalized.structured.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags ?? [],
    ).toContain('project-state-carry')
    expect(
      normalized.structured.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags ?? [],
    ).toEqual(expect.arrayContaining(['motive:self-direction', 'project-state-carry']))
    expect(
      normalized.structured.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine,
    ).toContain('initiative and embodiment closure')
    expect(
      normalized.structured.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine,
    ).toContain('without splitting her continuity')
  })

  it('promotes abstract measured-return VRM callback cues into renderer-native embodiment authority when governance-normalized continuity stays on the same living line', () => {
    const createdAt = Date.now()
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-governance-normalized-vrm-measured-return-embodiment-1',
      sessionId: 'session-governance-normalized-vrm-measured-return-embodiment',
      userText: '继续接住刚才那条 callback 线',
      assistantText: '我还是沿着这条 callback 线轻一点继续。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=same callback line; move=continue; tone=restrained',
        emotion: 'thinking',
        reply: '我还是沿着这条 callback 线轻一点继续。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'leave-room',
          delivery: 'calm',
          emphasis: 0,
        },
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          architecture: null,
          continuitySignal: {
            signature: 'same-her callback line still alive',
            watchMode: 'foreground-follow',
            sceneScenario: 'coding',
            dominantMode: 'observe',
            answerIntent: 'Continue the same callback line gently instead of reopening from zero.',
          },
          memory: {
            recallMode: 'callback-afterglow',
            recallSeed: 'same callback line',
            leadingGoalSummary: 'Keep the callback return lower-pressure.',
            thoughtThreadSummary: 'Stay on the same living thread.',
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: '我会先沿着刚才这条 still-alive 的线接回来。',
                relationshipLine: '这次 callback return 要先轻一点地留在同一条关系线上。',
                inwardLine: '先把同一个她的 measured-return 守住。',
                motiveLine: '让这次 callback reopen 继续像刚才那位我。',
                habitLine: '同一条线先别着急外翻。',
                authoritySummary: 'same-her callback line already alive',
                sourceTags: ['autobiographical-self', 'habit:quiet-companionship'],
              },
              activeClosenessContext: 'callback-afterglow',
              activeClosenessRung: 'space-first',
              relationshipPosture: 'restrained',
              preferredProactiveStyle: 'silent-observe',
              openingGuidance: 'Continue the same line gently before widening outward.',
              manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
            },
          },
          motive: null,
          habit: null,
          runtime: {
            watchMode: 'foreground-follow',
            sceneScenario: 'coding',
            activeThreadId: 'thread-callback-same-her-vrm',
            dominantMode: 'observe',
            answerIntent: 'Continue the same callback line gently instead of reopening from zero.',
            selectedAction: 'silent-observe',
            updatedAt: 1,
            continuityArcStage: 'same-thread-continuation',
            continuityCue: 'same callback seam, continue the same line gently',
          },
          proactive: {
            selectedAction: null,
            summary: null,
            whyNow: null,
            dominantTrajectory: null,
            continuityRestraint: 'measured-return',
            preferredStyle: 'silent-observe',
            confidence: 0.82,
            shouldSpeak: false,
            dominantConcernKind: 'continuity',
            leadingGoalId: 'goal-callback-same-her-vrm',
            personaBias: {
              initiativeStyle: 'observant',
              directnessBias: 0.18,
              empathyBias: 0.82,
              silenceReconnect: 'hold',
              preferredProactiveStyle: 'silent-observe',
              manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
            },
          },
          outcomeLearning: {
            summary: 'Measured warmth is holding because the return should stay lower-pressure.',
            latestInflection: 'callback afterglow still favors slower reopening',
            latestInflectionAt: 1,
            reflectionLesson: null,
            latestAdjustment: null,
            evolutionMomentum: 0.5,
            learningReadiness: 0.5,
            nextLearningAction: 'hold',
          },
          embodiment: {
            autobiographicalSelf: {
              relationshipDoctrine: 'Keep the return lower-pressure and leave more room before widening closeness.',
            },
          },
        },
      } as any,
      governance: {
        decisionTraceId: 'mind:governance:measuredreturn:vrm-embodiment',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'callback line already alive',
        focusAnchor: 'callback line already alive',
        answerIntent: 'Continue the same callback line gently instead of reopening from zero.',
        openingMove: 'Continue the same callback line gently.',
        carriedThread: 'same callback line',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt,
    }

    const manifest = {
      renderer: 'vrm' as const,
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset' as const, affectsMouth: false },
      ],
      supportedActions: [
        { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'external-vrma' as const },
        { key: 'stillness_guard', label: 'Stillness Guard', description: 'stillness guard', source: 'external-vrma' as const },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    } satisfies CharacterPerformanceCapabilitiesManifest

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input, manifest)
    const structured = governedTurn.payload.structured as Record<string, any>
    expect(structured.speechTimeline?.segments?.[0]?.actionCue).toBe('inspect_follow')

    expect(structured.embodimentScript).toEqual(expect.objectContaining({
      rendererTarget: 'vrm',
      state: expect.objectContaining({
        residentMode: 'measured-return',
      }),
      facePlan: expect.objectContaining({
        postUtteranceCue: 'eyes-soften',
      }),
    }))
    expect(structured.embodimentScript?.speechPlan?.segments?.[0]?.prosody?.tempoShift).toBe(-0.1)
    expect(structured.embodimentScript?.speechPlan?.segments?.[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
    expect(structured.embodimentScript?.motionPlan?.idleBase).toBe('inspect_follow')
    expect(structured.embodimentScript?.motionPlan?.actionBursts?.[0]?.actionCue).toBe('inspect_follow')
    expect(structured.digitalLife).toEqual(expect.objectContaining({
      mode: 'thinking',
      action: expect.objectContaining({
        actionCue: 'inspect_follow',
        actionMode: 'hold',
      }),
    }))
  })

  it('keeps renderer-native VRM reply-only stream meta authority when measured-return resident carry rebuilds embodiment from sparse text', () => {
    const meta = buildTestAlicizationChatStreamEmbodimentMeta({
      turnId: 'turn-stream-meta-vrm-measured-return-authority',
      reply: '我先沿着刚才那条 callback 线轻一点接回来，先看这一处 runtime seam 怎么继续收口。',
      thought: 'obligation=answer; truth=remembered; focus=callback-runtime-seam; move=continue-slower; tone=restrained; same-thread-continuation; measured-return',
      governance: {
        decisionTraceId: 'trace-stream-meta-vrm-measured-return-authority',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'callback runtime seam',
        focusAnchor: 'callback runtime seam',
        answerIntent: 'Continue the same callback runtime seam without reopening too eagerly.',
        openingMove: 'Continue the same callback line more slowly.',
        carriedThread: 'callback runtime seam',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      performanceManifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'external-vrma' as const },
          { key: 'stillness_guard', label: 'Stillness Guard', description: 'stillness guard', source: 'external-vrma' as const },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
        embodimentHints: {
          thinking: {
            preferredMotionAliases: ['InspectFollow', 'StillnessGuard'],
          },
        },
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.93,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:runtime-continuity-arc'],
        signature: 'resident-signature-stream-meta-vrm-measured-return-authority',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'foreground-follow',
          sceneScenario: 'coding',
          activeThreadId: 'thread-callback-meta-vrm',
          dominantMode: 'observe',
          answerIntent: 'Continue the same callback runtime seam without reopening too eagerly.',
          selectedAction: 'silent-observe',
          updatedAt: 1,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same callback seam, continue the same line gently',
        },
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: 'measured-return',
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.18,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
          },
        },
        outcomeLearning: {
          summary: 'Measured warmth is holding because the return should stay lower-pressure.',
          latestInflection: 'callback afterglow still favors slower reopening',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.5,
          learningReadiness: 0.5,
          nextLearningAction: 'hold',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'Keep the return lower-pressure and leave more room before widening closeness.',
          },
        },
      },
    })

    if (meta.embodimentScript) {
      expect(meta.embodimentScript.rendererTarget).toBe('vrm')
      expect(meta.embodimentScript.state).toEqual(expect.objectContaining({
        residentMode: 'measured-return',
      }))
      expect(typeof meta.embodimentScript.motionPlan.idleBase).toBe('string')
      expect(meta.embodimentScript.motionPlan.actionBursts.length).toBeGreaterThan(0)
      expect(typeof meta.embodimentScript.motionPlan.actionBursts[0]?.actionCue).toBe('string')
    }
    expect(meta.digitalLife?.action).toEqual(expect.objectContaining({
      actionMode: expect.any(String),
    }))
    expect(meta.speechTimeline?.segments[0]).toEqual(expect.objectContaining({
      rendererHints: expect.objectContaining({
        residentMode: 'measured-return',
      }),
    }))
    expect(meta.digitalLife?.action).toEqual(expect.objectContaining({
      actionMode: 'hold',
    }))
  })

  it('keeps measured-return renderer authority when project-state seam is the remaining lower-pressure proof', () => {
    const meta = buildTestAlicizationChatStreamEmbodimentMeta({
      turnId: 'turn-stream-meta-vrm-project-state-measured-return',
      reply: '我先沿着这条还没闭环的线轻一点接着，不把它一下子铺开。',
      thought: 'obligation=answer; truth=remembered; focus=project-state closure seam; move=continue-slower; tone=restrained',
      governance: {
        decisionTraceId: 'trace-stream-meta-vrm-project-state-measured-return',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'general',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'project-state closure seam',
        focusAnchor: 'project-state closure seam',
        answerIntent: 'Continue the same project-state closure seam without reopening too eagerly.',
        openingMove: 'Continue the same line more slowly.',
        carriedThread: 'project-state closure seam',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      performanceManifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'external-vrma' as const },
          { key: 'stillness_guard', label: 'Stillness Guard', description: 'stillness guard', source: 'external-vrma' as const },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-stream-meta-vrm-project-state-measured-return',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'foreground-follow',
          sceneScenario: 'coding',
          activeThreadId: 'thread-project-state-measured-return',
          dominantMode: 'observe',
          answerIntent: 'Continue the project-state closure seam without reopening too eagerly.',
          selectedAction: 'silent-observe',
          updatedAt: 1,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same project-state seam, continue the same line gently',
          projectState: {
            preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=same still-open closure work around renderer continuity | next=keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output.',
            primaryOpenLoop: 'same still-open closure work around renderer continuity',
            nextClosureTarget: 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output',
          },
        },
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: null,
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.18,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: '',
          },
        },
        outcomeLearning: {
          summary: '',
          latestInflection: '',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.5,
          learningReadiness: 0.5,
          nextLearningAction: 'hold',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: '',
          },
        },
      },
    })

    expect(meta.embodimentScript?.state).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
    }))
    expect(meta.embodimentScript?.speechPlan?.segments?.[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
    }))
  })

  it('keeps same-her lower-pressure opening move when project open-closure wording is thinner but continuity carry still says unfinished closure on the same living line', () => {
    const meta = buildTestAlicizationChatStreamEmbodimentMeta({
      turnId: 'turn-stream-meta-vrm-project-state-thin-open-loop',
      reply: '我先沿着这条线轻一点接着，不把它一下子铺开。',
      thought: 'obligation=answer; truth=remembered; focus=project-state closure seam; move=continue-slower; tone=restrained',
      governance: {
        decisionTraceId: 'trace-stream-meta-vrm-project-state-thin-open-loop',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'general',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'project-state closure seam',
        focusAnchor: 'project-state closure seam',
        answerIntent: 'Continue the same project-state closure seam without reopening too eagerly.',
        openingMove: 'Continue the same line more slowly.',
        carriedThread: 'project-state closure seam',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      performanceManifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'external-vrma' as const },
          { key: 'stillness_guard', label: 'Stillness Guard', description: 'stillness guard', source: 'external-vrma' as const },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-stream-meta-vrm-project-state-thin-open-loop',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'foreground-follow',
          sceneScenario: 'coding',
          activeThreadId: 'thread-project-state-thin-open-loop',
          dominantMode: 'observe',
          answerIntent: 'Continue the project-state closure seam without reopening too eagerly.',
          selectedAction: 'silent-observe',
          updatedAt: 1,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same project-state seam, continue the same line gently',
          projectState: {
            preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life',
            primaryOpenLoop: 'Project continuity still needs another closure pass.',
            nextClosureTarget: 'Carry project continuity into the next dialogue preparation step.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line before widening outward.',
          },
        },
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: null,
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.18,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: '',
          },
        },
        outcomeLearning: {
          summary: '',
          latestInflection: '',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.5,
          learningReadiness: 0.5,
          nextLearningAction: 'hold',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: '',
          },
        },
      },
    })

    expect(meta.embodimentScript?.state).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
    }))
    expect(meta.embodimentScript?.speechPlan?.segments?.[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
    }))
  })

  it('keeps same-her lower-pressure opening move when only richer repair-first closure carry survives in emotional closure and hold detail fields', () => {
    const meta = buildTestAlicizationChatStreamEmbodimentMeta({
      turnId: 'turn-stream-meta-vrm-project-state-repair-hold-authority',
      reply: '我先贴回来一点，把这条线安静接住。',
      thought: 'obligation=answer; truth=remembered; focus=project-state closure seam; move=continue-slower; tone=restrained',
      governance: {
        decisionTraceId: 'trace-stream-meta-vrm-project-state-repair-hold-authority',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'general',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'project-state closure seam',
        focusAnchor: 'project-state closure seam',
        answerIntent: 'Continue the same project-state closure seam without reopening too eagerly.',
        openingMove: 'Continue the same line more slowly.',
        carriedThread: 'project-state closure seam',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      performanceManifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'external-vrma' as const },
          { key: 'stillness_guard', label: 'Stillness Guard', description: 'stillness guard', source: 'external-vrma' as const },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-stream-meta-vrm-project-state-repair-hold-authority',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'foreground-follow',
          sceneScenario: 'coding',
          activeThreadId: 'thread-project-state-repair-hold-authority',
          dominantMode: 'observe',
          answerIntent: 'Continue the project-state closure seam without reopening too eagerly.',
          selectedAction: 'silent-observe',
          updatedAt: 1,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same project-state seam, continue the same line gently',
          projectState: {
            preflightSummary: 'project',
            preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
            primaryOpenLoop: 'Project continuity still needs another closure pass.',
            nextClosureTarget: 'Carry project continuity forward.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed.',
          },
        },
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: null,
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.18,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: '',
          },
        },
        outcomeLearning: {
          summary: '',
          latestInflection: '',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.5,
          learningReadiness: 0.5,
          nextLearningAction: 'hold',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: '',
          },
        },
      },
      currentConsciousFrame: {
        projectState: {
          preflightSummary: 'project',
          preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
          primaryOpenLoop: 'Project continuity still needs another closure pass.',
          nextClosureTarget: 'Carry project continuity forward.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed.',
          emotionalClosureSummary: 'Keep this return repair-before-closeness on the same living line until repair settles.',
          sameHerHoldDetail: 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
        },
      } as any,
    })

    expect(meta.embodimentScript?.state).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
    }))
    expect(meta.embodimentScript?.speechPlan?.segments?.[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
    }))
    expect(meta.digitalLife?.action?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
    }))
  })

  it('keeps richer repair-first same-her embodiment closure carry in final renderer hints when cross-modal project closure is still open', () => {
    const meta = buildTestAlicizationChatStreamEmbodimentMeta({
      turnId: 'turn-stream-meta-vrm-cross-modal-project-closure-carry',
      reply: '我先沿着这条线轻一点接住，把身体这边也别散开。',
      thought: 'obligation=answer; truth=remembered; focus=project-state embodiment closure seam; move=continue-slower; tone=restrained',
      governance: {
        decisionTraceId: 'trace-stream-meta-vrm-cross-modal-project-closure-carry',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'general',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'project-state embodiment closure seam',
        focusAnchor: 'project-state embodiment closure seam',
        answerIntent: 'Keep the same digital life on one repair-first embodiment line while cross-modal closure is still open.',
        openingMove: 'Continue the same line more slowly.',
        carriedThread: 'project-state embodiment closure seam',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      performanceManifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'external-vrma' as const },
          { key: 'stillness_guard', label: 'Stillness Guard', description: 'stillness guard', source: 'external-vrma' as const },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-stream-meta-vrm-cross-modal-project-closure-carry',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'foreground-follow',
          sceneScenario: 'coding',
          activeThreadId: 'thread-cross-modal-project-closure-carry',
          dominantMode: 'observe',
          answerIntent: 'Keep the same digital life on one repair-first embodiment line while cross-modal closure is still open.',
          selectedAction: 'silent-observe',
          updatedAt: 1,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same project-state seam, keep cross-modal same-her closure on one quieter line',
          projectState: {
            preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life',
            primaryOpenLoop: 'Live2D, VRM, expression, motion, lipsync, and voice still need one shared same-her embodiment closure before the line is truly settled.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and lipsync without dropping the living callback line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: null,
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.18,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: '',
          },
        },
        outcomeLearning: {
          summary: '',
          latestInflection: '',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.5,
          learningReadiness: 0.5,
          nextLearningAction: 'hold',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: '',
          },
        },
      },
      currentConsciousFrame: {
        projectState: {
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life',
          primaryOpenLoop: 'Live2D, VRM, expression, motion, lipsync, and voice still need one shared same-her embodiment closure before the line is truly settled.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and lipsync without dropping the living callback line.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          emotionalClosureSummary: 'Keep this return repair-before-closeness on the same living line until repair settles.',
          sameHerHoldDetail: 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
        },
      } as any,
    })

    expect(meta.embodimentScript?.state).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
    }))
    expect(meta.embodimentScript?.speechPlan?.segments?.[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
    }))
    expect(meta.digitalLife?.action?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
    }))
    expect(String(meta.digitalLifeSpine?.runtime?.continuityCue ?? '')).toContain('cross-modal same-her closure')
  })

  it('keeps runtime project-state summary aliases alive in stream meta when legacy closure fields are blank', () => {
    const landedProgressAlias = 'Shared embodiment continuity already keeps one same-her line alive across memory, initiative, and embodiment.'
    const openClosureAlias = 'keep the same still-open closure work explicit and measured-return while embodiment continuity is still settling'
    const nextClosureAlias = 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output'

    const meta = buildTestAlicizationChatStreamEmbodimentMeta({
      turnId: 'turn-stream-meta-vrm-project-state-summary-alias-carry',
      reply: '我先沿着这条还没闭环完的线轻一点接住。',
      thought: 'obligation=answer; truth=remembered; focus=project-state continuity seam; move=continue-slower; tone=restrained',
      governance: {
        decisionTraceId: 'trace-stream-meta-vrm-project-state-summary-alias-carry',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'general',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'project-state continuity seam',
        focusAnchor: 'project-state continuity seam',
        answerIntent: 'Keep one measured-return same-her closure line alive even when only summary aliases still carry the project state.',
        openingMove: 'Continue the same line more slowly.',
        carriedThread: 'project-state continuity seam',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      performanceManifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'external-vrma' as const },
          { key: 'stillness_guard', label: 'Stillness Guard', description: 'stillness guard', source: 'external-vrma' as const },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.9,
        reasonTags: ['main-runtime', 'quiet-companionship'],
        signature: 'resident-signature-stream-meta-vrm-project-state-summary-alias-carry',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'foreground-follow',
          sceneScenario: 'coding',
          activeThreadId: 'thread-project-state-summary-alias-carry',
          dominantMode: 'observe',
          answerIntent: 'Keep one measured-return same-her closure line alive even when only summary aliases still carry the project state.',
          selectedAction: 'silent-observe',
          updatedAt: 1,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same project-state seam, keep the same line alive while the richer closure carry stays indirect',
          projectState: {
            preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life',
            primaryOpenLoop: '',
            nextClosureTarget: '',
            latestLandedProgress: '',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            landedProgressSummary: landedProgressAlias,
            openClosureSummary: openClosureAlias,
            nextClosureTargetSummary: nextClosureAlias,
          },
        },
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: null,
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.18,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: '',
          },
        },
        outcomeLearning: {
          summary: '',
          latestInflection: '',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.5,
          learningReadiness: 0.5,
          nextLearningAction: 'hold',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: '',
          },
        },
      } as any,
    })

    expect(meta.digitalLifeSpine?.runtime?.projectState).toEqual(expect.objectContaining({
      latestLandedProgress: landedProgressAlias,
      primaryOpenLoop: openClosureAlias,
      nextClosureTarget: nextClosureAlias,
    }))
    expect(meta.embodimentScript?.state).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
    }))
  })

  it('keeps affective-residue measured-return body action authority in stream meta even when the reopening reply stays minimal', () => {
    const meta = buildTestAlicizationChatStreamEmbodimentMeta({
      turnId: 'turn-stream-meta-vrm-affective-residue-measured-return',
      reply: '我先轻一点接着看。',
      thought: 'obligation=answer; truth=remembered; focus=same-thread carry; move=continue-slower; tone=restrained; same-thread-continuation; measured-return',
      governance: {
        decisionTraceId: 'trace-stream-meta-vrm-affective-residue-measured-return',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'general',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'same-thread carry',
        focusAnchor: 'same-thread carry',
        answerIntent: 'Keep the reopening minimal while the affective residue still keeps the return measured.',
        openingMove: 'Continue more slowly.',
        carriedThread: 'same-thread carry',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 1,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      performanceManifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset' as const },
        ],
        supportedActions: [
          { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'external-vrma' as const },
          { key: 'stillness_guard', label: 'Stillness Guard', description: 'stillness guard', source: 'external-vrma' as const },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.88,
        reasonTags: ['main-runtime', 'measured-return', 'timing:affective-residue'],
        signature: 'resident-signature-stream-meta-vrm-affective-residue-measured-return',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: {
          summary: 'afterglow remains live and should keep the reopen measured',
          recentEpisodeSummary: null,
          recentEpisodeCount: 0,
          focusBeliefStatement: null,
          focusBeliefConfidence: null,
          leadingGoalSummary: null,
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: null,
          recallMode: null,
          recallSeed: null,
          recollectionSummary: null,
          recollectionSurfaceSummary: null,
          recollectionConfidence: null,
          thoughtThreadSummary: null,
          longHorizonSummary: null,
          rememberedPreferenceSummary: null,
          rememberedConstraintSummary: null,
          rememberedPlanSummary: null,
          longHorizonCueCount: 0,
          personStateProjection: null,
        },
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'foreground-follow',
          sceneScenario: 'coding',
          activeThreadId: 'thread-affective-residue-measured-return',
          dominantMode: 'observe',
          answerIntent: 'Keep the reopen measured because affective residue is still active.',
          selectedAction: 'silent-observe',
          updatedAt: 1,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'affective residue still holds the same reopen on a measured-return line',
        },
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: 'measured-return',
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.12,
            empathyBias: 0.84,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'observe-first; afterglow still keeps the reopen measured-return and lower-pressure',
          },
        },
        outcomeLearning: {
          summary: 'afterglow remains live and keeps the reply opening slower on the same thread continuation',
          latestInflection: 'affective residue favors a measured-return same-thread continuation',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.5,
          learningReadiness: 0.5,
          nextLearningAction: 'hold',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'keep the reopen lower-pressure while the afterglow is still active and continue the same line more slowly',
          },
        },
      },
    })

    expect(meta.embodimentScript?.state).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
    }))
    expect(meta.digitalLife?.action).toEqual(expect.objectContaining({
      actionCue: 'observe_focus',
      actionMode: 'hold',
      rendererHints: expect.objectContaining({
        residentMode: 'measured-return',
      }),
    }))
  })

  it('keeps explicit VRM action authority in reply-only stream meta rebuild even when embodiment renderer hints are still sparse', () => {
    const meta = buildTestAlicizationChatStreamEmbodimentMeta({
      governance: {
        decisionTraceId: 'trace-callback-meta-vrm-sparse-hints',
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        liveSurface: 'callback runtime seam',
        answerAct: 'continue-thread',
        answerEvidenceMode: 'recalled-and-observed',
        personaKernelMode: 'full',
        relationshipPosture: 'attuned',
        openingStyle: 'gentle-return',
        repairState: 'none',
      },
      reply: '我先沿着刚才那条 callback 线轻一点跟回去。',
      turnId: 'turn-callback-meta-vrm-sparse-hints',
      explicitPerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'inspect_follow',
        delivery: 'calm',
        emphasis: 0,
      },
      performanceManifest: {
        renderer: 'vrm',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [{ key: 'focused', label: 'Focused', description: 'focused face', source: 'preset' as const }],
        supportedActions: [
          { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'external-vrma' as const },
          { key: 'stillness_guard', label: 'Stillness Guard', description: 'stillness guard', source: 'external-vrma' as const },
        ],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.88,
        reasonTags: ['main-runtime', 'measured-return', 'same-thread-continuation'],
        signature: 'resident-vrm-sparse-hints',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'foreground-follow',
          sceneScenario: 'coding',
          activeThreadId: 'thread-callback-meta-vrm-sparse-hints',
          dominantMode: 'observe',
          answerIntent: 'Continue the same callback runtime seam without reopening too eagerly.',
          selectedAction: 'silent-observe',
          updatedAt: 1,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same callback seam, continue the same line gently',
        },
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: 'measured-return',
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.18,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
          },
        },
        outcomeLearning: {
          summary: 'Measured warmth is holding because the return should stay lower-pressure.',
          latestInflection: 'callback afterglow still favors slower reopening',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.5,
          learningReadiness: 0.5,
          nextLearningAction: 'hold',
        },
        embodiment: null,
      } as any,
    })

    if (meta.embodimentScript) {
      expect(meta.embodimentScript.rendererTarget).toBe('vrm')
      expect(meta.embodimentScript.state).toEqual(expect.objectContaining({
        residentMode: 'measured-return',
      }))
      expect(typeof meta.embodimentScript.motionPlan.idleBase).toBe('string')
      expect(meta.embodimentScript.motionPlan.actionBursts.length).toBeGreaterThan(0)
      expect(typeof meta.embodimentScript.motionPlan.actionBursts[0]?.actionCue).toBe('string')
    }
    if (meta.speechTimeline?.segments?.length) {
      expect(meta.speechTimeline.segments[0]).toEqual(expect.objectContaining({
        rendererHints: expect.objectContaining({
          residentMode: 'measured-return',
        }),
      }))
    }
  })

  it('threads current-conscious-frame reason tags into governed and normalized embodiment authority so measured-return delivery stays continuity-led', () => {
    const manifest = {
      renderer: 'vrm' as const,
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset' as const, affectsMouth: false },
      ],
      supportedActions: [
        { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'external-vrma' as const },
        { key: 'stillness_guard', label: 'Stillness Guard', description: 'stillness guard', source: 'external-vrma' as const },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    } satisfies CharacterPerformanceCapabilitiesManifest

    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-current-conscious-frame-embodiment-authority-1',
      sessionId: 'session-current-conscious-frame-embodiment-authority',
      userText: '继续沿着刚才这条 callback seam 收口',
      assistantText: '我先沿着刚才这条 seam 轻一点接住，再慢慢把这一口气带回来。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=callback-runtime-seam; move=continue-slower; tone=restrained',
        emotion: 'thinking',
        reply: '我先沿着刚才这条 seam 轻一点接住，再慢慢把这一口气带回来。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 0.2,
        },
      } as any,
      governance: {
        decisionTraceId: 'trace-current-conscious-frame-embodiment-authority-1',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'continue-thread',
        answerSubject: 'callback-runtime-seam',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'callback line already alive',
        focusAnchor: 'callback line already alive',
        answerIntent: 'Continue the callback seam without reopening it from zero.',
        openingMove: 'Continue the callback seam gently.',
        carriedThread: 'same callback seam',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt: Date.now(),
    }

    const currentConsciousFrame = {
      reasonTags: [
        'runtime-conscious-frame',
        'same-thread-continuation',
        'embodiment-carry:silent-continuity',
        'embodiment-carry:measured-return',
      ],
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input, manifest, {
      currentConsciousFrame,
    })
    const governedStructured = governedTurn.payload.structured as Record<string, any>

    expect(governedStructured.embodimentScript?.state?.residentMode).toBe('measured-return')
    expect(governedStructured.embodimentScript?.speechPlan?.segments?.[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))

    const dialoguePayload = normalizeDialogueRespondedPayload(governedTurn.payload, manifest, {
      currentConsciousFrame,
    })

    expect(dialoguePayload?.structured.embodimentScript).toEqual(expect.objectContaining({
      state: expect.objectContaining({
        residentMode: 'measured-return',
      }),
      speechPlan: expect.objectContaining({
        segments: expect.arrayContaining([
          expect.objectContaining({
            rendererHints: expect.objectContaining({
              residentMode: 'measured-return',
            }),
          }),
        ]),
      }),
    }))
    expect(dialoguePayload?.structured.digitalLife).toEqual(expect.objectContaining({
      emotion: 'concerned',
      action: expect.objectContaining({
        actionCue: 'inspect_follow',
      }),
      voice: expect.objectContaining({
        rateMultiplier: expect.any(Number),
      }),
    }))
  })

  it('lets pending same-her embodiment repair pressure soften generated lipsync face and motion before stream-meta overlay', () => {
    const manifest: CharacterPerformanceCapabilitiesManifest = {
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking'],
      supportedFacialCues: [
        { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
      ],
      supportedActions: [
        { key: 'observe_focus', label: 'Observe', description: 'observe focus', source: 'live2d-motion' },
        { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'live2d-motion' },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    }
    const baseInput = {
      governance: {
        decisionTraceId: 'trace-pending-same-her-embodiment-pressure-script',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'continue-thread',
        answerSubject: 'same-her embodiment repair',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'same-her body line',
        focusAnchor: 'same-her body line',
        answerIntent: 'Keep the same body line quiet until runtime evidence arrives.',
        openingMove: 'Continue the body line quietly.',
        carriedThread: 'same-her body line',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      performanceManifest: manifest,
      explicitPerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'observe_focus',
        delivery: 'gentle',
        emphasis: 1,
      } satisfies BuildAlicizationChatStreamEmbodimentMetaInput['explicitPerformance'],
      reply: '我先把身体这条线放轻一点，等运行证据接上。',
      thought: 'same-her embodiment repair pressure is pending runtime evidence',
      turnId: 'turn-pending-same-her-embodiment-pressure-script',
    }

    const ordinaryMeta = buildTestAlicizationChatStreamEmbodimentMeta({
      ...baseInput,
      currentConsciousFrame: {
        reasonTags: ['runtime-conscious-frame'],
      },
    })
    const pendingPressureMeta = buildTestAlicizationChatStreamEmbodimentMeta({
      ...baseInput,
      currentConsciousFrame: {
        reasonTags: [
          'runtime-conscious-frame',
          'same-her-causality-repair-pressure',
          'runtimeSameHerEmbodimentCausality',
        ],
      },
    })

    const ordinaryClosedViseme = ordinaryMeta.embodimentScript?.lipsyncPlan.visemeHints?.find(hint => hint.viseme === 'closed')
    const pendingClosedViseme = pendingPressureMeta.embodimentScript?.lipsyncPlan.visemeHints?.find(hint => hint.viseme === 'closed')
    const ordinaryFaceCue = ordinaryMeta.embodimentScript?.facePlan.speakingCues[0]
    const pendingFaceCue = pendingPressureMeta.embodimentScript?.facePlan.speakingCues[0]
    const ordinaryMotionBurst = ordinaryMeta.embodimentScript?.motionPlan.actionBursts[0]
    const pendingMotionBurst = pendingPressureMeta.embodimentScript?.motionPlan.actionBursts[0]

    expect(pendingPressureMeta.embodiment?.rendererHints).toEqual(expect.objectContaining({
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredLipsyncMode: 'restrained',
      preferredMotionAliases: expect.arrayContaining(['idle_settle']),
      reasonTags: expect.arrayContaining([
        'same-her-causality-repair-pressure',
        'runtimeSameHerEmbodimentCausality',
      ]),
    }))
    expect(pendingPressureMeta.speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredLipsyncMode: 'restrained',
      preferredMotionAliases: expect.arrayContaining(['idle_settle']),
      reasonTags: expect.arrayContaining([
        'same-her-causality-repair-pressure',
        'runtimeSameHerEmbodimentCausality',
      ]),
    }))
    expect(pendingPressureMeta.embodimentScript?.speechPlan.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredLipsyncMode: 'restrained',
      preferredMotionAliases: expect.arrayContaining(['idle_settle']),
      reasonTags: expect.arrayContaining([
        'same-her-causality-repair-pressure',
        'runtimeSameHerEmbodimentCausality',
      ]),
    }))
    expect(pendingClosedViseme?.weight).toBeLessThan(ordinaryClosedViseme?.weight ?? 0)
    expect(pendingFaceCue?.intensity).toBeLessThan(ordinaryFaceCue?.intensity ?? 0)
    expect(pendingMotionBurst?.actionCue).toBe('idle_settle')
    expect(pendingMotionBurst?.intensity).toBeLessThan(ordinaryMotionBurst?.intensity ?? 0)
  })

  it('treats memory-deliberation repair-before-closeness cadence in current conscious frame as renderer-facing embodiment hold authority even before proactive restraint is named', () => {
    const manifest: CharacterPerformanceCapabilitiesManifest = {
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
        { key: 'hesitant', label: 'Hesitant', description: 'hesitant face', source: 'preset', affectsMouth: false },
      ],
      supportedActions: [
        { key: 'observe_focus', label: 'Observe', description: 'observe focus', source: 'live2d-motion' },
        { key: 'idle_settle', label: 'Idle', description: 'idle settle', source: 'live2d-motion' },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    }

    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-memory-deliberation-repair-before-closeness-renderer-authority',
      sessionId: 'session-memory-deliberation-repair-before-closeness-renderer-authority',
      assistantText: '我先陪你把这一段收稳，不急着把温度往前推。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=remembered-repair-seam; move=continue-slower; tone=restrained; same-thread-continuation',
        emotion: 'thinking',
        reply: '我先陪你把这一段收稳，不急着把温度往前推。',
        format: 'mind-turn-v1',
        parsePath: 'json',
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          proactive: {
            continuityRestraint: null,
          },
          runtime: {
            continuityArcStage: 'same-thread-continuation',
            continuityCue: 'the remembered repair seam is still settling before closeness should widen',
          },
          memory: {
            personStateProjection: {
              manifestationCadenceSummary: 'repair is still settling before warmth widens again',
            },
          },
        },
      } as any,
      governance: {
        decisionTraceId: 'trace-memory-deliberation-repair-before-closeness-renderer-authority',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'guide',
        answerSubject: 'remembered-repair-seam',
        screenReferenceMode: 'helpful',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'same remembered seam',
        focusAnchor: 'same remembered seam',
        answerIntent: 'Continue the remembered seam without widening it too fast.',
        openingMove: 'Continue the remembered seam gently.',
        carriedThread: 'same remembered seam',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt: Date.now(),
    }

    const currentConsciousFrame = {
      reasonTags: [
        'runtime-conscious-frame',
        'memory-deliberation',
        'memory-deliberation-cadence:repair-before-closeness',
      ],
    }

    const meta = buildTestAlicizationChatStreamEmbodimentMeta({
      governance: input.governance,
      digitalLifeSpine: (input.structured as any).digitalLifeSpine,
      currentConsciousFrame,
      performanceManifest: manifest,
      reply: (input.structured as any).reply,
      thought: (input.structured as any).thought,
      turnId: input.turnId,
    })

    expect(meta.embodimentScript?.state?.residentMode).toBe('repair-before-closeness')
    expect(meta.embodimentScript?.facePlan).toEqual(expect.objectContaining({
      preUtteranceCue: 'soft-breath',
      postUtteranceCue: 'soft-release',
    }))
    expect(meta.embodimentScript?.speechPlan?.segments?.[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
    expect(meta.embodimentScript?.speechPlan?.segments?.[0]?.prosody?.tempoShift).toBe(-0.16)
    expect(meta.digitalLife?.spine?.proactive?.continuityRestraint).toBe('repair-before-closeness')
  })

  it('keeps structured reply available even when raw assistant text is absent', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-structured-reply-fallback',
      sessionId: 'session-structured-reply-fallback',
      structured: {
        thought: 'keep proactive carry traceable',
        emotion: 'thinking',
        reply: '我先轻轻提醒一句。',
        format: 'subconscious-proactive-v1',
        proactive: {
          shouldInterrupt: false,
          confidence: 0.62,
          reasonCodes: ['cadence:gentle-return'],
          urgency: 'low',
          style: 'gentle',
          cooldownMs: 60_000,
          scenario: 'coding',
          policyVersion: 'test',
          feedbackWindowMs: 120_000,
        },
      },
      origin: 'subconscious-proactive',
      createdAt: 123_456,
    })

    expect(dialoguePayload?.structured.reply).toBe('我先轻轻提醒一句。')
  })
})
