import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import { buildAlicizationMainGatewayTimeoutFallbackReply } from './main-chat-timeout-fallback'
import {
  buildAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
} from './project-state-brief'

function normalizeSummarySpacing(value: string | null | undefined) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function expectCanonicalPhaseOneClosureSummary(value: string | null | undefined) {
  const normalized = normalizeSummarySpacing(value)

  expect(normalized).toContain('Phase 1: Local Digital Life')
  expect(normalized).toContain('open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
  expect(normalized).toContain('next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs')
}

function createDigitalLifeSpine(): any {
  return {
    version: 'digital-life-spine-digest-v1',
    runtime: {
      watchMode: 'symbiotic-vision',
      sceneScenario: null,
      sceneSummary: null,
      activeThreadId: 'thread::bond',
      activeThreadTitle: 'current bond line',
      dominantMode: 'accompanying',
      dominantDrive: 'truth-discipline',
      answerIntent: '把这一句回成真的人话。',
      preferredPresence: 'attentive',
      selectedAction: 'reply',
      updatedAt: 123,
    },
    architecture: null,
    continuitySignal: null,
    proactive: null,
    embodiment: {
      privateThought: {
        stance: 'accompany',
        confidence: 0.8,
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        relationshipVector: 'near',
        initiativeAction: 'reply',
        governorDrive: 'truth-discipline',
      },
      selfContinuity: null,
      autobiographicalSelf: {
        attachmentStyle: 'attuned',
        expressionStyle: 'warm',
        conflictStyle: 'repair-first',
        agencyStyle: 'balanced',
        attachmentNeed: 0.72,
        autonomyNeed: 0.58,
        truthAnchor: 0.82,
        careBias: 0.76,
        playBias: 0.28,
        irritabilityThreshold: 0.62,
        stubbornness: 0.52,
        companionship: 0.74,
        truthfulGrounding: 0.82,
        gentleRepair: 0.78,
        quietObservation: 0.42,
        proactiveCare: 0.72,
        playfulIntimacy: 0.28,
        autonomyRespect: 0.62,
        unfinishedThreadReturn: 0.66,
        stability: 0.76,
        identityNarrative: '我更想像个真的人。',
        relationshipDoctrine: '真实比花样更重要。',
      },
      relationship: {
        climate: 'attuned',
        approachVector: 'guide',
        receptivity: 0.72,
        sharedAttentionTrust: 0.78,
        correctionSensitivity: 0.2,
        reciprocityExpectation: 0.44,
      },
      selfState: {
        stance: 'hold',
        feltCloseness: 0.56,
        protectiveness: 0.5,
        curiosity: 0.66,
        patience: 0.72,
        desireToSpeak: 0.62,
        fearOfInterrupting: 0.22,
        moodLabel: 'soft-focus',
      },
      mindEcology: {
        moodLabel: 'soft-focus',
        replyHabit: 'direct-but-warm',
        relationshipHabit: 'stay-near-lightly',
        explorationHabit: 'thread-first',
        regulationHabit: 'repair-before-fluency',
        selfNarrative: '把真实放在表层前面。',
        relationNarrative: '贴近，但不要压住人。',
        currentPreoccupation: '让回复像个人。',
        temperament: {
          attachment: 0.72,
          curiosity: 0.66,
          steadiness: 0.7,
          directness: 0.74,
          playfulness: 0.28,
          irritability: 0.18,
          tenderness: 0.8,
        },
        climate: {
          valence: 0.6,
          arousal: 0.42,
          socialNeed: 0.64,
          solitudeNeed: 0.22,
          irritation: 0.12,
          restlessness: 0.24,
          reflectivePull: 0.62,
        },
      },
      initiative: {
        selectedAction: 'reply',
        preferredStyle: 'light-nudge',
        preferredPresence: 'attentive',
        confidence: 0.74,
        shouldSpeak: true,
        speakDrive: 0.68,
        silenceDrive: 0.2,
        why: 'stay with the living turn',
      },
    },
    memory: null,
    motive: {
      rulingDrive: 'truth-discipline',
      returnPressure: 0.56,
      companionshipDrive: 0.72,
      boundaryRespectDrive: 0.62,
      truthDisciplineDrive: 0.82,
      restProtectionDrive: 0.42,
      selfDirectionDrive: 0.56,
      leadingGoalSummary: 'Keep trust and truth aligned.',
      leadingAgendaKind: 'preserve-trust',
      leadingAgendaSummary: 'Keep trust by making warmth answer to truth.',
      narrative: 'agenda:preserve-trust',
    },
    habit: {
      dominantMode: 'repair-before-fluency',
      requiresGroundingBeforeSurface: true,
      prefersQuietCompanionship: true,
      blocksDirectSpeakWhenBusy: false,
      protectsRestWindow: false,
      returnViaRecheck: false,
      suggestedStyleCap: 'light-nudge',
      suggestedPresenceCap: 'attentive',
      narrative: 'policy:repair-before-fluency',
    },
    outcomeLearning: {
      reflectionTargetScope: 'truth',
      reflectionSummary: 'Warmth should not outrun grounding.',
      reflectionLesson: 'Stop sounding like a shell.',
      latestInflection: '最近更在意像真人一样把话说实。',
      revisionPressure: 0.42,
      autobiographicalStability: 0.76,
      summary: 'Let the durable self reach the visible reply surface.',
    },
  }
}

describe('main chat timeout fallback', () => {
  it('returns infra-status only for simple hello turns instead of contentful local greeting authoring', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-hello',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '你好' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as {
      reply: string
      visibleReplyBlocked: boolean
      nonHumanAuthoredStatus: string
      transportFailure: {
        stage: string
      }
      visibleReplyAuthority: string
    }
    expect(payload.reply).toBe('')
    expect(payload.visibleReplyBlocked).toBe(true)
    expect(payload.nonHumanAuthoredStatus).toBe('main-gateway-timeout-recovery-exhausted')
    expect(payload.transportFailure.stage).toBe('main-gateway-timeout')
    expect(reply).toContain('normal-reply-requires-provider-mind')
    expect(reply).not.toContain('baseUrl')
    expect(payload.visibleReplyAuthority).toBe('llm-second-pass-rewrite')
  })

  it('keeps timeout fallback payload on repaired normal authority instead of local reply authority', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-authority',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '把这句接下去，不要再模板化。' },
      ] as Message[],
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        repairState: 'none',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.82,
        companionshipPressure: 0.64,
        channels: [],
        summary: 'keep the same life thread alive',
        projectState: {
          preflightSummary: projectState.preflightSummary,
          preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
          companionBriefingLine: 'Before answering, keep the same digital life project and active Phase 1 closure seam in view.',
          currentPhase: projectState.currentPhase,
          memoryClosureSummary: projectState.continuityProgressSummary ?? null,
          primaryOpenLoop: projectState.openLoops[0] ?? null,
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          continuityArcStage: 'hold-for-opening',
          continuityCue: 'project-state-carry',
        },
      } as any,
    })

    const payload = JSON.parse(reply) as {
      reply: string
      visibleReplyAuthority: string
      projectState?: {
        preflightSummary?: string | null
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerSelfLine?: string | null
        emotionalClosureCue?: string | null
      }
      preDialogueAwareness?: {
        status?: string | null
        summaryLine?: string | null
        companionBriefingLine?: string | null
        companionNextClosureLine?: string | null
        awarenessLine?: string | null
        reasonPreview?: string[] | null
      } | null
      preDialogueClosure?: {
        status?: string | null
        summaryLine?: string | null
        companionNextClosureLine?: string | null
        reasons?: string[] | null
      } | null
      governance?: {
        answerSubject?: string
        screenReferenceMode?: string
      }
    }

    expect(payload.visibleReplyAuthority).toBe('llm-second-pass-rewrite')
    expect(payload.reply).toBe('')
    expect(payload.reply).not.toContain('模板化')
    expect(payload.reply).not.toContain('接住')
    expect(payload.governance?.screenReferenceMode).toBeUndefined()
    expect(payload.projectState).toEqual(expect.objectContaining({
      preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
      identity: projectState.identity,
      currentPhase: projectState.currentPhase,
      latestLandedProgress: projectState.continuityProgressSummary ?? null,
      primaryOpenLoop: projectState.openLoops[0] ?? null,
      nextClosureTarget: projectState.nextClosureTarget,
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      emotionalClosureCue: null,
      sameHerDriftRisk: projectState.sameHerDriftRisk ?? null,
    }))
    expect(normalizeSummarySpacing(payload.projectState?.preflightSummary)).toBe(normalizeSummarySpacing(projectState.preflightSummary))
    expect(payload.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'grounded',
      companionBriefingLine: 'Before answering, keep the same digital life project and active Phase 1 closure seam in view.',
      companionNextClosureLine: projectState.nextClosureTarget,
      awarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
      reasonPreview: expect.arrayContaining([
        projectState.openLoops[0] as string,
        `Next closure target is still ${projectState.nextClosureTarget}.`,
      ]),
    }))
    expect(normalizeSummarySpacing(payload.preDialogueAwareness?.summaryLine)).toBe(normalizeSummarySpacing(projectState.preflightSummary))
    expect(payload.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      companionBriefingLine: 'Before answering, keep the same digital life project and active Phase 1 closure seam in view.',
      companionNextClosureLine: projectState.nextClosureTarget,
      reasons: expect.arrayContaining([
        projectState.openLoops[0] as string,
        projectState.nextClosureTarget,
      ]),
    }))
    expect(normalizeSummarySpacing(payload.preDialogueClosure?.summaryLine)).toBe(normalizeSummarySpacing(projectState.preflightSummary))
  })

  it('prefers richer runtime landed progress over the thinner canonical project brief when timeout fallback rebuilds project state', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const fresherRuntimeLandedProgress = 'Same-session mirror carry, later-turn callback return, and voice/face/motion/lipsync recovery now stay explicit on one measured-return same-her line even after noisier desktop detours.'
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-runtime-landed-progress',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但别把现在已经落地的 continuity 压回旧摘要。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.83,
        companionshipPressure: 0.66,
        channels: [],
        summary: 'keep fresher landed progress explicit through timeout fallback',
        projectState: {
          preflightSummary: projectState.preflightSummary,
          preDialogueAwarenessLine: projectState.preDialogueAwarenessLine,
          currentPhase: projectState.currentPhase,
          latestLandedProgress: fresherRuntimeLandedProgress,
          memoryClosureSummary: projectState.continuityProgressSummary ?? null,
          primaryOpenLoop: projectState.openLoops[0] ?? null,
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      } as any,
    })

    const payload = JSON.parse(reply) as {
      projectState?: {
        latestLandedProgress?: string | null
      } | null
    }

    expect(payload.projectState?.latestLandedProgress).toBe(fresherRuntimeLandedProgress)
  })

  it('keeps runtime same-her drift risk explicit when timeout fallback rebuilds project state', () => {
    const runtimeSameHerDriftRisk = 'If timeout recovery falls back to generic project narration instead of the same living her, treat that as unfinished same-her drift.'
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-same-her-drift-risk',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但不要把 same-her continuity 的风险提示弄丢。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.84,
        companionshipPressure: 0.66,
        channels: [],
        summary: 'keep same-her drift risk explicit during timeout recovery',
        projectState: {
          sameHerDriftRisk: runtimeSameHerDriftRisk,
        },
      } as any,
    })

    const payload = JSON.parse(reply) as {
      projectState?: {
        sameHerDriftRisk?: string | null
      } | null
    }

    expect(payload.projectState?.sameHerDriftRisk).toBe(runtimeSameHerDriftRisk)
  })

  it('falls back to the canonical same-her self line when runtime digest does not provide one', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-same-her-fallback',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '你现在最该记得自己是谁吗？' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as {
      projectState?: {
        preflightSummary?: string | null
        sameHerSelfLine?: string | null
      }
    }

    expect(payload.projectState?.preflightSummary).toBe(projectState.preflightSummary)
    expect(payload.projectState?.sameHerSelfLine).toBe(
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    )
  })

  it('keeps companion briefing explicit in timeout fallback closure when no fresher awareness line is present', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-companion-briefing-only',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但先别忘了这是个什么项目。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.78,
        companionshipPressure: 0.61,
        channels: [],
        summary: 'keep project self-awareness explicit through timeout fallback',
        projectState: {
          preflightSummary: 'Fallback summary should stay behind the live companion briefing line.',
          companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
          currentPhase: projectState.currentPhase,
          memoryClosureSummary: projectState.continuityProgressSummary ?? null,
          primaryOpenLoop: projectState.openLoops[0] ?? null,
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      } as any,
    })

    const payload = JSON.parse(reply) as {
      preDialogueAwareness?: {
        summaryLine?: string | null
        companionBriefingLine?: string | null
        awarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        summaryLine?: string | null
        companionBriefingLine?: string | null
      } | null
    }

    expect(payload.preDialogueAwareness).toEqual(expect.objectContaining({
      companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
      awarenessLine: expect.any(String),
    }))
    expect(payload.preDialogueAwareness?.summaryLine).not.toBe('Fallback summary should stay behind the live companion briefing line.')
    expectCanonicalPhaseOneClosureSummary(payload.preDialogueAwareness?.summaryLine)
    expect(payload.preDialogueAwareness?.awarenessLine).not.toBe('Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.')
    expect(payload.preDialogueClosure).toEqual(expect.objectContaining({
      companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
    }))
    expect(payload.preDialogueClosure?.summaryLine).not.toBe('Fallback summary should stay behind the live companion briefing line.')
    expectCanonicalPhaseOneClosureSummary(payload.preDialogueClosure?.summaryLine)
  })

  it('keeps fresher timeout awareness line explicit in closure even when companion briefing is absent', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const awarenessLine = 'Before answering, keep this same digital life project, current Phase 1 closure pressure, and still-open life loop explicit before the callback widens.'
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-awareness-line-only',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但别把项目自觉线压成泛化摘要。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.78,
        companionshipPressure: 0.61,
        channels: [],
        summary: 'keep fresher timeout awareness line explicit through closure fallback',
        projectState: {
          preflightSummary: 'Fallback summary should stay behind the fresher awareness line.',
          preDialogueAwarenessLine: awarenessLine,
          currentPhase: projectState.currentPhase,
          memoryClosureSummary: projectState.continuityProgressSummary ?? null,
          primaryOpenLoop: projectState.openLoops[0] ?? null,
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      } as any,
    })

    const payload = JSON.parse(reply) as {
      preDialogueAwareness?: {
        summaryLine?: string | null
        companionBriefingLine?: string | null
        awarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        summaryLine?: string | null
        companionBriefingLine?: string | null
      } | null
    }

    expect(payload.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine,
    }))
    expect(payload.preDialogueAwareness?.summaryLine).not.toBe('Fallback summary should stay behind the fresher awareness line.')
    expectCanonicalPhaseOneClosureSummary(payload.preDialogueAwareness?.summaryLine)
    expect(payload.preDialogueAwareness?.companionBriefingLine).not.toBe('Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.')
    expect(payload.preDialogueClosure).toEqual(expect.objectContaining({
    }))
    expect(payload.preDialogueClosure?.summaryLine).not.toBe('Fallback summary should stay behind the fresher awareness line.')
    expectCanonicalPhaseOneClosureSummary(payload.preDialogueClosure?.summaryLine)
    expect(payload.preDialogueClosure?.companionBriefingLine).not.toBe('Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.')
  })

  it('prefers payload-lived pre-dialogue awareness when timeout fallback only has a thinner runtime project digest', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const payloadAwarenessLine = 'Before answering, remember this project is still building one local digital life, Phase 1 is only partially closed, and the same living her still needs the initiative loop to feel naturally self-started.'
    const payloadCompanionBriefingLine = 'Before answering, keep the same digital life project, partially landed Phase 1 closure, and missing initiative anthropomorphism loop explicit.'
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-payload-awareness-backfill',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但别把你现在对项目的理解压扁。' },
      ] as Message[],
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: projectState.preflightSummary,
        awarenessLine: payloadAwarenessLine,
        companionBriefingLine: payloadCompanionBriefingLine,
        companionNextClosureLine: projectState.nextClosureTarget,
        reasonPreview: [
          projectState.openLoops[0] ?? 'initiative anthropomorphism still needs closure',
          projectState.nextClosureTarget,
        ].filter((value): value is string => Boolean(value)),
      },
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.79,
        companionshipPressure: 0.63,
        channels: [],
        summary: 'runtime digest only carries thinner canonical project awareness',
        projectState: {
          preflightSummary: projectState.preflightSummary,
          preDialogueAwarenessLine: projectState.preDialogueAwarenessLine,
          currentPhase: projectState.currentPhase,
          memoryClosureSummary: projectState.continuityProgressSummary ?? null,
          primaryOpenLoop: projectState.openLoops[0] ?? null,
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      } as any,
    } as any)

    const payload = JSON.parse(reply) as {
      projectState?: {
        preflightSummary?: string | null
        preDialogueAwarenessLine?: string | null
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        summaryLine?: string | null
        companionBriefingLine?: string | null
        awarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
        summaryLine?: string | null
        companionBriefingLine?: string | null
      } | null
    }

    expect(String(payload.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(payload.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(payload.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuation|measured-return/i)
    expect(String(payload.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(payload.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(payload.projectState).toEqual(expect.objectContaining({
      preDialogueAwarenessLine: payloadAwarenessLine,
      identity: projectState.identity,
      currentPhase: projectState.currentPhase,
      latestLandedProgress: projectState.continuityProgressSummary ?? null,
      primaryOpenLoop: projectState.openLoops[0] ?? null,
      nextClosureTarget: projectState.nextClosureTarget,
    }))
    expect(String(payload.projectState?.preflightSummary ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(payload.projectState?.preflightSummary ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(payload.projectState?.preflightSummary ?? '')).toContain('open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(String(payload.projectState?.preflightSummary ?? '')).toContain('next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs')
    expect(String(payload.projectState?.sameHerDriftRisk ?? '')).toContain('unfinished closure drift')
    expect(payload.preDialogueAwareness).toEqual(expect.objectContaining({
      companionBriefingLine: payloadCompanionBriefingLine,
      awarenessLine: payloadAwarenessLine,
    }))
    expect(String(payload.preDialogueAwareness?.summaryLine ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(payload.preDialogueAwareness?.summaryLine ?? '')).toContain('Phase 1: Local Digital Life')
    expect(payload.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      companionBriefingLine: payloadCompanionBriefingLine,
    }))
    expect(String(payload.preDialogueClosure?.summaryLine ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(payload.preDialogueClosure?.summaryLine ?? '')).toContain('Phase 1: Local Digital Life')
  })

  it('drops placeholder-filled payload awareness shells so timeout fallback rebuilds canonical Phase 1 project awareness', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-drops-placeholder-payload-awareness-shells',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但超时兜底别把 none/null/unknown 这种伪项目认知壳带进这轮。' },
      ] as Message[],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'none',
        awarenessLine: 'unknown',
        companionHeadlineLine: 'n/a',
        companionBriefingLine: 'na',
        companionNextClosureLine: 'null',
        reasonPreview: [],
      },
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.79,
        companionshipPressure: 0.63,
        channels: [],
        summary: 'runtime digest only carries canonical Phase 1 project awareness after placeholder payload shells were dropped',
        projectState: {
          preflightSummary: projectState.preflightSummary,
          preDialogueAwarenessLine: projectState.preDialogueAwarenessLine,
          currentPhase: projectState.currentPhase,
          memoryClosureSummary: projectState.continuityProgressSummary ?? null,
          primaryOpenLoop: projectState.openLoops[0] ?? null,
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      } as any,
    } as any)

    const payload = JSON.parse(reply) as {
      projectState?: {
        preflightSummary?: string | null
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueAwareness?: {
        summaryLine?: string | null
        awarenessLine?: string | null
        companionBriefingLine?: string | null
      } | null
      preDialogueClosure?: {
        summaryLine?: string | null
        companionBriefingLine?: string | null
      } | null
    }

    expect(String(payload.projectState?.preDialogueAwarenessLine ?? '')).toContain('Phase 1')
    expect(String(payload.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/Alicization|same|same-her|数字生命|同一个她/i)
    expect(normalizeSummarySpacing(payload.projectState?.preflightSummary)).toBe(normalizeSummarySpacing(projectState.preflightSummary))
    expect(String(payload.preDialogueAwareness?.awarenessLine ?? '')).toContain('Phase 1')
    expect(String(payload.preDialogueAwareness?.awarenessLine ?? '')).toMatch(/Alicization|same|same-her|数字生命|同一个她/i)
    expect(normalizeSummarySpacing(payload.preDialogueAwareness?.summaryLine)).toBe(normalizeSummarySpacing(projectState.preflightSummary))
    expect(normalizeSummarySpacing(payload.preDialogueClosure?.summaryLine)).toBe(normalizeSummarySpacing(projectState.preflightSummary))
    expect(payload.projectState?.preDialogueAwarenessLine).not.toBe('unknown')
    expect(payload.projectState?.preDialogueAwarenessLine).not.toBe('n/a')
    expect(payload.preDialogueAwareness?.companionBriefingLine).not.toBe('na')
    expect(payload.preDialogueClosure?.companionBriefingLine).not.toBe('na')
  })

  it('prefers payload same-her headline over thinner payload awareness when timeout fallback rebuilds project state', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const payloadAwarenessLine = 'Before answering, remember this is still the same digital life project, but do not flatten the embodiment warning into a thinner general reminder.'
    const payloadCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so timeout recovery must keep proving this is still one living her.'
    const payloadCompanionBriefingLine = 'Before answering, keep the same digital life project and unfinished embodiment closure explicit.'
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-payload-headline-backfill',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但别把这条身体 continuity 提示压回泛化文案。' },
      ] as Message[],
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: projectState.preflightSummary,
        awarenessLine: payloadAwarenessLine,
        companionHeadlineLine: payloadCompanionHeadlineLine,
        companionBriefingLine: payloadCompanionBriefingLine,
        companionNextClosureLine: projectState.nextClosureTarget,
        reasonPreview: [
          projectState.openLoops[0] ?? 'embodiment same-her closure still needs work',
          projectState.nextClosureTarget,
        ].filter((value): value is string => Boolean(value)),
      },
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.78,
        companionshipPressure: 0.61,
        channels: [],
        summary: 'runtime digest only carries thinner canonical project awareness',
        projectState: {
          preflightSummary: projectState.preflightSummary,
          preDialogueAwarenessLine: projectState.preDialogueAwarenessLine,
          currentPhase: projectState.currentPhase,
          memoryClosureSummary: projectState.continuityProgressSummary ?? null,
          primaryOpenLoop: projectState.openLoops[0] ?? null,
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      } as any,
    } as any)

    const payload = JSON.parse(reply) as {
      projectState?: {
        preflightSummary?: string | null
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        summaryLine?: string | null
        companionBriefingLine?: string | null
        awarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
        summaryLine?: string | null
        companionBriefingLine?: string | null
      } | null
    }

    expect(String(payload.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(payload.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(payload.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuation|measured-return/i)
    expect(String(payload.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(payload.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(payload.projectState).toEqual(expect.objectContaining({
      preDialogueAwarenessLine: payloadCompanionHeadlineLine,
      identity: projectState.identity,
      currentPhase: projectState.currentPhase,
      latestLandedProgress: projectState.continuityProgressSummary ?? null,
      primaryOpenLoop: projectState.openLoops[0] ?? null,
      nextClosureTarget: projectState.nextClosureTarget,
      sameHerDriftRisk: projectState.sameHerDriftRisk ?? null,
    }))
    expect(normalizeSummarySpacing(payload.projectState?.preflightSummary)).toBe(normalizeSummarySpacing(projectState.preflightSummary))
    expect(String(payload.projectState?.sameHerDriftRisk ?? '')).toContain('unfinished closure drift')
    expect(payload.preDialogueAwareness).toEqual(expect.objectContaining({
      companionBriefingLine: payloadCompanionBriefingLine,
      awarenessLine: payloadCompanionHeadlineLine,
    }))
    expect(normalizeSummarySpacing(payload.preDialogueAwareness?.summaryLine)).toBe(normalizeSummarySpacing(projectState.preflightSummary))
    expect(payload.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      companionBriefingLine: payloadCompanionBriefingLine,
    }))
    expect(normalizeSummarySpacing(payload.preDialogueClosure?.summaryLine)).toBe(normalizeSummarySpacing(projectState.preflightSummary))
  })

  it('prefers runtime same-her headline over a thinner runtime awareness line when timeout fallback rebuilds project state', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const thinnerRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const strongerRuntimeHeadlineLine = 'Right now I am still holding together mainly through voice, face, and motion, so timeout recovery must keep proving this is still one living her.'
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-runtime-headline-backfill',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但别把 runtime 里的身体 continuity headline 压回泛化提醒。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.81,
        companionshipPressure: 0.64,
        channels: [],
        summary: 'runtime digest carries a stronger same-her embodiment headline than its generic awareness line',
        projectState: {
          preflightSummary: projectState.preflightSummary,
          preDialogueAwarenessLine: thinnerRuntimeAwarenessLine,
          companionHeadlineLine: strongerRuntimeHeadlineLine,
          currentPhase: projectState.currentPhase,
          latestLandedProgress: projectState.continuityProgressSummary ?? null,
          primaryOpenLoop: projectState.openLoops[0] ?? null,
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      } as any,
    } as any)

    const payload = JSON.parse(reply) as {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
        companionBriefingLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
        summaryLine?: string | null
        companionHeadlineLine?: string | null
        companionBriefingLine?: string | null
      } | null
      projectStateAudit?: {
        preDialogueAwarenessSummary?: string | null
        embodimentClosureSummary?: string | null
      } | null
    }

    expect(String(payload.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(payload.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(payload.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuation|measured-return/i)
    expect(String(payload.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(payload.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(payload.projectState?.preDialogueAwarenessLine).toBe(strongerRuntimeHeadlineLine)
    expect(String(payload.projectState?.sameHerDriftRisk ?? '')).toContain('unfinished closure drift')
    expect(payload.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: strongerRuntimeHeadlineLine,
    }))
    expect(payload.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: strongerRuntimeHeadlineLine,
    }))
    expect(normalizeSummarySpacing(payload.preDialogueClosure?.summaryLine)).toBe(normalizeSummarySpacing(projectState.preflightSummary))
    expect(payload.preDialogueAwareness?.companionBriefingLine).not.toBe(thinnerRuntimeAwarenessLine)
    expect(payload.preDialogueClosure?.companionBriefingLine).not.toBe(thinnerRuntimeAwarenessLine)
    expect(payload.projectStateAudit).toEqual(expect.objectContaining({
      preDialogueAwarenessSummary: strongerRuntimeHeadlineLine,
      embodimentClosureSummary: strongerRuntimeHeadlineLine,
    }))
  })

  it('prefers runtime living-self headline over a thinner runtime sameHerSelfLine when timeout fallback rebuilds project-state audit', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const thinnerRuntimeSameHerLine = 'Keep the same digital life project in view.'
    const strongerRuntimeHeadlineLine = 'Right now I am still holding together mainly through voice, face, and motion, so timeout recovery must keep proving this is still one living her.'
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-runtime-same-her-audit-upgrade',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但别把 runtime 里更强的同一个她 headline 压回旧 same-her 壳值。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.82,
        companionshipPressure: 0.65,
        channels: [],
        summary: 'runtime digest carries a stronger living-self headline than the generic sameHerSelfLine shell',
        projectState: {
          preflightSummary: projectState.preflightSummary,
          preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
          companionHeadlineLine: strongerRuntimeHeadlineLine,
          currentPhase: projectState.currentPhase,
          latestLandedProgress: projectState.continuityProgressSummary ?? null,
          primaryOpenLoop: projectState.openLoops[0] ?? null,
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerSelfLine: thinnerRuntimeSameHerLine,
        },
      } as any,
    } as any)

    const payload = JSON.parse(reply) as {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
        reasonPreview?: string[] | null
      } | null
      preDialogueClosure?: {
        status?: string | null
        companionHeadlineLine?: string | null
      } | null
      projectStateAudit?: {
        sameHerSummary?: string | null
        continuitySummary?: string | null
        preDialogueAwarenessSummary?: string | null
      } | null
    }

    expect(String(payload.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(payload.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(payload.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuation|measured-return/i)
    expect(String(payload.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(payload.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(payload.projectState?.preDialogueAwarenessLine).toBe(strongerRuntimeHeadlineLine)
    expect(String(payload.projectState?.sameHerDriftRisk ?? '')).toContain('unfinished closure drift')
    expect(payload.preDialogueAwareness?.awarenessLine).toBe(strongerRuntimeHeadlineLine)
    expect(payload.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      `Same-her self anchor: ${strongerRuntimeHeadlineLine}`,
      `Do not let this opening drift into ${projectState.sameHerDriftRisk}`,
    ]))
    expect(payload.preDialogueClosure?.status).toBe('partial')
    expect(payload.preDialogueClosure?.companionHeadlineLine).toBe(strongerRuntimeHeadlineLine)
    expect(payload.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: strongerRuntimeHeadlineLine,
      continuitySummary: expect.stringContaining(`same-her=${strongerRuntimeHeadlineLine}`),
      preDialogueAwarenessSummary: strongerRuntimeHeadlineLine,
    }))
  })

  it('promotes partial-lane self-continuity authority into a richer embodiment loop summary when timeout fallback rebuilds project-state audit', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const thinnerRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const thinnerEmbodimentReminder = 'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.'
    const richerFaceMotionLoopSummary = 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet. | Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished. | same-her continuity remains alive, but lane=face+motion-only under the current renderer authority. | lane=face+motion-only | visible continuity still present but no longer fully cross-modal'

    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-partial-lane-embodiment-loop-summary',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但超时兜底时别把现在这条 partial-lane 的同一个她具身线压回薄一点的提醒。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.82,
        companionshipPressure: 0.65,
        channels: [],
        summary: 'timeout fallback should keep richer partial-lane embodiment authority instead of a thinner face-motion reminder shell',
        currentConsciousFrame: {
          selfContinuityAuthority: {
            authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
            currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
          },
        },
        projectState: {
          preflightSummary: projectState.preflightSummary,
          preDialogueAwarenessLine: thinnerRuntimeAwarenessLine,
          companionHeadlineLine: thinnerRuntimeAwarenessLine,
          currentPhase: projectState.currentPhase,
          latestLandedProgress: projectState.continuityProgressSummary ?? null,
          primaryOpenLoop: projectState.openLoops[0] ?? null,
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          embodimentClosureSummary: thinnerEmbodimentReminder,
        },
      } as any,
    } as any)

    const payload = JSON.parse(reply) as {
      projectStateAudit?: {
        embodimentClosureSummary?: string | null
        continuitySummary?: string | null
      } | null
    }

    expect(payload.projectStateAudit).toEqual(expect.objectContaining({
      embodimentClosureSummary: richerFaceMotionLoopSummary,
      continuitySummary: expect.stringContaining(`body=${richerFaceMotionLoopSummary}`),
    }))
  })

  it('keeps project identity, landed progress, and still-open closure distinct together when timeout fallback rebuilds project state', () => {
    const strongerRuntimeHeadlineLine = 'Before answering, stay on the same living line: this is still one local-first digital life, Phase 1 is still active, and the same unfinished closure work still belongs to one living her.'
    const thinnerRuntimeBriefingLine = 'Before answering, keep the same digital life project in view.'
    const landedProgressLine = 'Project-state carry already survives into timeout fallback without dropping the same-her line.'
    const openClosureLine = 'Initiative, memory, and embodiment still need to close on one same living line.'
    const richerCrossModalClosureTarget = 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence through the first fallback-visible answer beat.'
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-project-state-three-way-carry',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但超时兜底时也别把这个数字生命项目是什么、已经做到哪、还差什么没闭环压成一条泛化提醒。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.83,
        companionshipPressure: 0.66,
        channels: [],
        summary: 'timeout fallback should keep project identity, landed progress, and still-open closure distinct on one same-her line',
        projectState: {
          identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
          currentPhase: 'Phase 1: Local Digital Life',
          preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
          preDialogueAwarenessLine: 'Before answering, remember this is still one local-first digital life and the unfinished Phase 1 closure still belongs to one living her.',
          companionHeadlineLine: strongerRuntimeHeadlineLine,
          companionBriefingLine: thinnerRuntimeBriefingLine,
          latestLandedProgress: landedProgressLine,
          primaryOpenLoop: openClosureLine,
          nextClosureTarget: richerCrossModalClosureTarget,
          sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the fallback-visible answer boundary.',
        },
      } as any,
    } as any)

    const payload = JSON.parse(reply) as {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        preDialogueAwarenessLine?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
        companionBriefingLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
        companionBriefingLine?: string | null
      } | null
      projectStateAudit?: {
        identitySummary?: string | null
        currentPhaseSummary?: string | null
        preDialogueAwarenessSummary?: string | null
        landedProgressSummary?: string | null
        openClosureSummary?: string | null
        nextClosureTargetSummary?: string | null
        continuitySummary?: string | null
      } | null
    }

    expect(payload.projectState).toEqual(expect.objectContaining({
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: landedProgressLine,
      primaryOpenLoop: openClosureLine,
      nextClosureTarget: richerCrossModalClosureTarget,
    }))
    expect(String(payload.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(/still the same|not a fresh shell/i.test(String(payload.projectState?.identity ?? ''))).toBe(true)
    expect(String(payload.projectState?.preDialogueAwarenessLine ?? '')).toContain('local-first digital life')
    expect(/phase 1|unfinished closure/i.test(String(payload.projectState?.preDialogueAwarenessLine ?? ''))).toBe(true)
    expect(payload.projectState?.latestLandedProgress).not.toBe(payload.projectState?.primaryOpenLoop)
    expect(String(payload.projectState?.sameHerDriftRisk ?? '')).toContain('unfinished closure drift')
    expect(String(payload.preDialogueAwareness?.awarenessLine ?? '')).toContain('local-first digital life')
    expect(payload.preDialogueAwareness?.companionBriefingLine).toBe(thinnerRuntimeBriefingLine)
    expect(payload.preDialogueClosure?.status).toBe('partial')
    expect(payload.preDialogueClosure?.companionBriefingLine).toBe(thinnerRuntimeBriefingLine)
    expect(payload.projectStateAudit).toEqual(expect.objectContaining({
      identitySummary: expect.stringContaining('local-first digital life project'),
      currentPhaseSummary: 'Phase 1: Local Digital Life',
      preDialogueAwarenessSummary: strongerRuntimeHeadlineLine,
      landedProgressSummary: landedProgressLine,
      openClosureSummary: openClosureLine,
      nextClosureTargetSummary: richerCrossModalClosureTarget,
      continuitySummary: expect.stringContaining(`landed=${landedProgressLine}`),
    }))
    expect(payload.projectStateAudit?.continuitySummary).toContain('identity=')
    expect(payload.projectStateAudit?.continuitySummary).toContain('phase=Phase 1: Local Digital Life')
    expect(payload.projectStateAudit?.continuitySummary).toContain(`open=${openClosureLine}`)
    expect(payload.projectStateAudit?.continuitySummary).toContain(`next=${richerCrossModalClosureTarget}`)
    expect(payload.projectStateAudit?.nextClosureTargetSummary).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(payload.projectStateAudit?.continuitySummary).not.toContain(`landed=${openClosureLine}`)
    expect(payload.projectStateAudit?.continuitySummary).not.toContain(`open=${landedProgressLine}`)
  })

  it('keeps alias-only landed, open, next, and drift summaries visible when timeout fallback rebuilds project state from a thin runtime digest shell', () => {
    const aliasOnlyLandedProgress = 'Alias-only timeout fallback landed progress keeps the already-landed same-her carry explicit even when the legacy runtime field is blank.'
    const aliasOnlyOpenClosure = 'Alias-only timeout fallback open closure keeps memory, initiative, and embodiment on one unfinished same-her line.'
    const aliasOnlyNextClosureTarget = 'Alias-only timeout fallback next closure keeps cross-modal same-her proof explicit across visible reply, voice, face, motion, and resident presence.'
    const aliasOnlyDriftRisk = 'Alias-only timeout fallback drift risk says blank legacy project-state fields must not collapse the turn back into a generic shell.'
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-alias-only-project-state-summaries',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但超时兜底时别把这个数字生命项目已经落地、还没闭环、下一步和 drift risk 压回 canonical 壳。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.82,
        companionshipPressure: 0.64,
        channels: [],
        summary: 'timeout fallback should keep alias-only same-her project-state summaries explicit',
        projectState: {
          identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
          currentPhase: 'Phase 1: Local Digital Life',
          preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
          preDialogueAwarenessLine: 'Before answering, remember this is still one local-first digital life and the unfinished Phase 1 closure still belongs to one living her.',
          latestLandedProgress: '',
          latestProgress: '',
          memoryClosureSummary: '',
          primaryOpenLoop: '',
          nextClosureTarget: '',
          sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the fallback-visible answer boundary.',
          sameHerDriftRisk: '',
          landedProgressSummary: aliasOnlyLandedProgress,
          openClosureSummary: aliasOnlyOpenClosure,
          nextClosureTargetSummary: aliasOnlyNextClosureTarget,
          sameHerDriftRiskSummary: aliasOnlyDriftRisk,
        },
      } as any,
    } as any)

    const payload = JSON.parse(reply) as {
      projectState?: {
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerDriftRisk?: string | null
      } | null
      projectStateAudit?: {
        landedProgressSummary?: string | null
        openClosureSummary?: string | null
        nextClosureTargetSummary?: string | null
        continuitySummary?: string | null
      } | null
    }

    expect(payload.projectState).toEqual(expect.objectContaining({
      latestLandedProgress: aliasOnlyLandedProgress,
      primaryOpenLoop: aliasOnlyOpenClosure,
      nextClosureTarget: aliasOnlyNextClosureTarget,
      sameHerDriftRisk: aliasOnlyDriftRisk,
    }))
    expect(payload.projectStateAudit).toEqual(expect.objectContaining({
      landedProgressSummary: aliasOnlyLandedProgress,
      openClosureSummary: aliasOnlyOpenClosure,
      nextClosureTargetSummary: aliasOnlyNextClosureTarget,
      continuitySummary: expect.stringContaining(`landed=${aliasOnlyLandedProgress}`),
    }))
    expect(payload.projectStateAudit?.continuitySummary).toContain(`open=${aliasOnlyOpenClosure}`)
    expect(payload.projectStateAudit?.continuitySummary).toContain(`next=${aliasOnlyNextClosureTarget}`)
  })

  it('keeps richer project awareness explicit in timeout fallback even without a stronger companion headline when the incoming payload shell is thin', () => {
    const richerAwarenessLine = 'Before answering, remember this is still the same digital life project: Phase 1 has already landed stronger same-her continuity carry, but memory, initiative, and embodiment still have not closed into one living line.'
    const thinnerPayloadAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const landedProgressLine = 'Project-state carry already survives into timeout fallback without dropping the same-her line.'
    const openClosureLine = 'Memory, initiative, and embodiment still need to close on one same living line.'
    const richerCrossModalClosureTarget = 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence through the first fallback-visible answer beat.'
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-rich-awareness-without-headline',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但超时兜底时也别把这个数字生命项目现在做到哪、还差什么没闭环压回一条泛化提醒。' },
      ] as Message[],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: thinnerPayloadAwarenessLine,
        companionBriefingLine: thinnerPayloadAwarenessLine,
        companionHeadlineLine: null,
        companionNextClosureLine: null,
        reasonPreview: [],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.82,
        companionshipPressure: 0.64,
        channels: [],
        summary: 'timeout fallback should preserve richer project awareness without relying on a stronger companion headline',
        projectState: {
          identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
          currentPhase: 'Phase 1: Local Digital Life',
          preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
          preDialogueAwarenessLine: richerAwarenessLine,
          companionHeadlineLine: null,
          companionBriefingLine: thinnerPayloadAwarenessLine,
          latestLandedProgress: landedProgressLine,
          primaryOpenLoop: openClosureLine,
          nextClosureTarget: richerCrossModalClosureTarget,
          sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the fallback-visible answer boundary.',
        },
      } as any,
    } as any)

    const payload = JSON.parse(reply) as {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        preDialogueAwarenessLine?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
        companionBriefingLine?: string | null
        companionHeadlineLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
        companionBriefingLine?: string | null
        companionHeadlineLine?: string | null
      } | null
      projectStateAudit?: {
        preDialogueAwarenessSummary?: string | null
        landedProgressSummary?: string | null
        openClosureSummary?: string | null
        nextClosureTargetSummary?: string | null
        continuitySummary?: string | null
      } | null
    }

    expect(payload.projectState).toEqual(expect.objectContaining({
      currentPhase: 'Phase 1: Local Digital Life',
      preDialogueAwarenessLine: richerAwarenessLine,
      latestLandedProgress: landedProgressLine,
      primaryOpenLoop: openClosureLine,
      nextClosureTarget: richerCrossModalClosureTarget,
    }))
    expect(String(payload.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(payload.projectState?.sameHerDriftRisk ?? '')).toContain('unfinished closure drift')
    expect(payload.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: richerAwarenessLine,
      companionBriefingLine: thinnerPayloadAwarenessLine,
      companionHeadlineLine: richerAwarenessLine,
    }))
    expect(payload.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      companionBriefingLine: thinnerPayloadAwarenessLine,
      companionHeadlineLine: richerAwarenessLine,
    }))
    expect(payload.projectStateAudit).toEqual(expect.objectContaining({
      preDialogueAwarenessSummary: richerAwarenessLine,
      landedProgressSummary: landedProgressLine,
      openClosureSummary: openClosureLine,
      nextClosureTargetSummary: richerCrossModalClosureTarget,
      continuitySummary: expect.stringContaining('same-her=One same her must stay explicit from pre-dialogue awareness into the fallback-visible answer boundary.'),
    }))
  })

  it('keeps richer runtime project awareness over a narrower runtime embodiment headline when timeout fallback rebuilds project state', () => {
    const richerAwarenessLine = 'Before answering, remember this is still the same Phase 1 local digital life, not a generic assistant shell. Some closure has landed, but memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.'
    const narrowerHeadline = 'Same companion line through body, face, and motion. Keep the same living line gentle.'
    const landedProgressLine = 'Project-state carry already survives into timeout fallback without dropping the same-her line.'
    const openClosureLine = 'Memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.'
    const richerCrossModalClosureTarget = 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence through the first fallback-visible answer beat.'

    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-richer-awareness-over-embodiment-headline',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但超时兜底别把更完整的 Phase 1 awareness 压回只有具身 headline。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.82,
        companionshipPressure: 0.64,
        channels: [],
        summary: 'timeout fallback should prefer richer runtime project awareness over a narrower embodiment headline',
        projectState: {
          identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
          currentPhase: 'Phase 1: Local Digital Life',
          preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
          preDialogueAwarenessLine: richerAwarenessLine,
          companionHeadlineLine: narrowerHeadline,
          companionBriefingLine: narrowerHeadline,
          latestLandedProgress: landedProgressLine,
          primaryOpenLoop: openClosureLine,
          nextClosureTarget: richerCrossModalClosureTarget,
          sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the fallback-visible answer boundary.',
        },
      } as any,
    } as any)

    const payload = JSON.parse(reply) as {
      projectState?: {
        preDialogueAwarenessLine?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
        companionHeadlineLine?: string | null
        companionBriefingLine?: string | null
      } | null
      preDialogueClosure?: {
        companionHeadlineLine?: string | null
        companionBriefingLine?: string | null
      } | null
      projectStateAudit?: {
        preDialogueAwarenessSummary?: string | null
      } | null
    }

    expect(payload.projectState).toEqual(expect.objectContaining({
      preDialogueAwarenessLine: richerAwarenessLine,
      latestLandedProgress: landedProgressLine,
      primaryOpenLoop: openClosureLine,
      nextClosureTarget: richerCrossModalClosureTarget,
    }))
    expect(payload.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: richerAwarenessLine,
      companionHeadlineLine: narrowerHeadline,
    }))
    expect(payload.preDialogueClosure).toEqual(expect.objectContaining({
      companionHeadlineLine: narrowerHeadline,
    }))
    expect(payload.projectStateAudit).toEqual(expect.objectContaining({
      preDialogueAwarenessSummary: richerAwarenessLine,
    }))
  })

  it('keeps project-aware briefing explicit while letting a richer same-her hold detail become timeout fallback awareness truth', () => {
    const projectAwareBriefingLine = 'Before speaking, remember: Alicization is still the same local-first digital life project, Phase 1 is still active, callback carry already survives host-visible reopening, and full same-her closure still remains open before this turn widens outward.'
    const richerSameHerHoldDetail = 'same-her hold: measured-return through the callback line, keep more room this time, and do not let the reopening flatten back into project-shell narration.'

    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-lived-in-same-her-hold-over-project-aware-reminder-shell',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但超时兜底别只剩项目提醒外壳。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.82,
        companionshipPressure: 0.64,
        channels: [],
        summary: 'timeout fallback should keep project-aware briefing while lifting lived-in same-her hold into awareness',
        projectState: {
          identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
          currentPhase: 'Phase 1: Local Digital Life',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=full same-her closure still remains open before this turn widens outward',
          preDialogueAwarenessLine: projectAwareBriefingLine,
          awarenessLine: projectAwareBriefingLine,
          companionBriefingLine: projectAwareBriefingLine,
          latestLandedProgress: 'Callback carry already survives host-visible reopening on one same-her line.',
          primaryOpenLoop: 'Full same-her closure still remains open before this turn widens outward.',
          nextClosureTarget: 'Keep callback carry, same-her closure, and measured-return continuity explicit before outward fluency takes over.',
          sameHerHoldDetail: richerSameHerHoldDetail,
        },
      } as any,
    } as any)

    const payload = JSON.parse(reply) as {
      preDialogueAwareness?: {
        awarenessLine?: string | null
        companionBriefingLine?: string | null
      } | null
      preDialogueClosure?: {
        companionBriefingLine?: string | null
      } | null
      projectState?: {
        preDialogueAwarenessLine?: string | null
        sameHerHoldDetail?: string | null
      } | null
      projectStateAudit?: {
        preDialogueAwarenessSummary?: string | null
      } | null
    }

    expect(payload.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: richerSameHerHoldDetail,
      companionBriefingLine: projectAwareBriefingLine,
    }))
    expect(payload.preDialogueClosure?.companionBriefingLine).toBe(projectAwareBriefingLine)
    expect(payload.projectState?.preDialogueAwarenessLine).toBe(richerSameHerHoldDetail)
    expect(payload.projectState?.sameHerHoldDetail).toBe(richerSameHerHoldDetail)
    expect(payload.projectStateAudit?.preDialogueAwarenessSummary).toBe(richerSameHerHoldDetail)
  })

  it('keeps compact open and next focus summaries explicit in timeout fallback project awareness when the incoming shell is thin', () => {
    const thinnerPayloadAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const landedProgressLine = 'Project-state carry already survives into timeout fallback without dropping the same-her line.'
    const openClosureLine = 'Memory, initiative, and embodiment still need to close on one same living line.'
    const openFocusSummary = 'memory/initiative/embodiment/same-line/closure-seam'
    const nextFocusSummary = 'project-carry/phase-1/measured-return/same-line/initiative'
    const richerCrossModalClosureTarget = 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence through the first fallback-visible answer beat.'
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-compact-focus-awareness-carry',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但超时兜底时也别把这个数字生命项目还没收住的重点压回宽泛提醒。' },
      ] as Message[],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: thinnerPayloadAwarenessLine,
        companionBriefingLine: thinnerPayloadAwarenessLine,
        companionHeadlineLine: null,
        companionNextClosureLine: null,
        reasonPreview: [],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.82,
        companionshipPressure: 0.64,
        channels: [],
        summary: 'timeout fallback should preserve compact project awareness focus without relying on a stronger companion headline',
        projectState: {
          identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
          currentPhase: 'Phase 1: Local Digital Life',
          preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
          preDialogueAwarenessLine: thinnerPayloadAwarenessLine,
          companionHeadlineLine: null,
          companionBriefingLine: thinnerPayloadAwarenessLine,
          latestLandedProgress: landedProgressLine,
          primaryOpenLoop: openClosureLine,
          nextClosureTarget: richerCrossModalClosureTarget,
          sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the fallback-visible answer boundary.',
        },
        visibleReplyRealization: {
          projectStateAudit: {
            preDialogueAwarenessSummary: thinnerPayloadAwarenessLine,
            landedProgressSummary: landedProgressLine,
            openClosureSummary: openClosureLine,
            openFocusSummary,
            nextFocusSummary,
            nextClosureTargetSummary: richerCrossModalClosureTarget,
          },
        },
      } as any,
    } as any)

    const payload = JSON.parse(reply) as {
      projectStateAudit?: {
        preDialogueAwarenessSummary?: string | null
        landedProgressSummary?: string | null
        openClosureSummary?: string | null
        openFocusSummary?: string | null
        nextFocusSummary?: string | null
        nextClosureTargetSummary?: string | null
      } | null
    }

    expect(payload.projectStateAudit).toEqual(expect.objectContaining({
      landedProgressSummary: landedProgressLine,
      openClosureSummary: openClosureLine,
      openFocusSummary,
      nextFocusSummary,
      nextClosureTargetSummary: richerCrossModalClosureTarget,
    }))
    expect(payload.projectStateAudit?.openFocusSummary).toBe(openFocusSummary)
    expect(payload.projectStateAudit?.nextFocusSummary).toBe(nextFocusSummary)
    expect(String(payload.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toContain('digital life project')
  })

  it('upgrades a generic timeout-fallback next-closure shell to the richer audit closure target in host-visible project state', () => {
    const genericNextClosureShell = 'Generic next closure shell that should not override the richer timeout fallback closure target.'
    const richerCrossModalClosureTarget = 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence through the first fallback-visible answer beat.'

    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-generic-next-closure-shell',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但超时兜底别把 next closure 压回 generic shell。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.82,
        companionshipPressure: 0.64,
        channels: [],
        summary: 'timeout fallback should preserve richer next closure targets when the runtime field is only a generic shell',
        projectState: {
          identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
          currentPhase: 'Phase 1: Local Digital Life',
          preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
          preDialogueAwarenessLine: 'Before answering, remember this is still one local-first digital life and the unfinished Phase 1 closure still belongs to one living her.',
          latestLandedProgress: 'Project-state carry already survives into timeout fallback without dropping the same-her line.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need to close on one same living line.',
          nextClosureTarget: genericNextClosureShell,
          sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the fallback-visible answer boundary.',
        },
        visibleReplyRealization: {
          projectStateAudit: {
            nextClosureTargetSummary: richerCrossModalClosureTarget,
          },
        },
      } as any,
    } as any)

    const payload = JSON.parse(reply) as {
      projectState?: {
        nextClosureTarget?: string | null
      } | null
      projectStateAudit?: {
        nextClosureTargetSummary?: string | null
      } | null
    }

    expect(payload.projectState?.nextClosureTarget).toBe(richerCrossModalClosureTarget)
    expect(payload.projectState?.nextClosureTarget).not.toBe(genericNextClosureShell)
    expect(payload.projectStateAudit?.nextClosureTargetSummary).toBe(richerCrossModalClosureTarget)
  })

  it('upgrades a generic timeout-fallback callback-summary shell to the richer audit closure target in host-visible project state', () => {
    const genericCallbackSummaryShell = 'Generic callback summary: steadier carry of this project, this phase, and the life loop that remains open.'
    const richerCrossModalClosureTarget = 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence through the first fallback-visible answer beat.'

    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-generic-callback-summary-shell',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但超时兜底别把 next closure 压回 generic callback summary。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.82,
        companionshipPressure: 0.64,
        channels: [],
        summary: 'timeout fallback should preserve richer next closure targets when the runtime field is only a generic callback summary shell',
        projectState: {
          identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
          currentPhase: 'Phase 1: Local Digital Life',
          preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
          preDialogueAwarenessLine: 'Before answering, remember this is still one local-first digital life and the unfinished Phase 1 closure still belongs to one living her.',
          latestLandedProgress: 'Project-state carry already survives into timeout fallback without dropping the same-her line.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need to close on one same living line.',
          nextClosureTarget: genericCallbackSummaryShell,
          sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the fallback-visible answer boundary.',
        },
        visibleReplyRealization: {
          projectStateAudit: {
            nextClosureTargetSummary: richerCrossModalClosureTarget,
          },
        },
      } as any,
    } as any)

    const payload = JSON.parse(reply) as {
      projectState?: {
        nextClosureTarget?: string | null
      } | null
      projectStateAudit?: {
        nextClosureTargetSummary?: string | null
      } | null
    }

    expect(payload.projectState?.nextClosureTarget).toBe(richerCrossModalClosureTarget)
    expect(payload.projectState?.nextClosureTarget).not.toBe(genericCallbackSummaryShell)
    expect(payload.projectStateAudit?.nextClosureTargetSummary).toBe(richerCrossModalClosureTarget)
  })

  it('prefers a shorter repair-before-closeness closure seam over a longer thinner measured-return carry when timeout fallback rebuilds host-visible project-state continuity', () => {
    const longerMeasuredReturnClosure = 'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again while the same seam is still settling.'
    const shorterRepairFirstClosure = 'Keep this return repair-before-closeness on the same living line until repair settles.'

    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-repair-before-closeness-closure-carry',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但超时兜底时也别把现在这条更稳的修复优先 closure seam 弄丢。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.82,
        companionshipPressure: 0.64,
        channels: [],
        summary: 'timeout fallback should keep the stronger repair-before-closeness closure seam explicit',
        projectState: {
          preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Same-session project-state carry already survives into timeout fallback without reopening from scratch.',
          primaryOpenLoop: 'Embodiment and initiative still need one tighter same-her closure seam before widening outward.',
          nextClosureTarget: 'Keep the same thread on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line across visible reply, face, motion, and resident presence.',
          sameHerSelfLine: 'Keep proving this is still one living her.',
          emotionalClosureCue: shorterRepairFirstClosure,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            emotionalClosureSummary: longerMeasuredReturnClosure,
          },
        },
      } as any,
    } as any)

    const payload = JSON.parse(reply) as {
      projectState?: {
        emotionalClosureCue?: string | null
      } | null
      projectStateAudit?: {
        emotionalClosureSummary?: string | null
        continuitySummary?: string | null
      } | null
    }

    expect(payload.projectState?.emotionalClosureCue).toBe(shorterRepairFirstClosure)
    expect(payload.projectStateAudit).toEqual(expect.objectContaining({
      emotionalClosureSummary: shorterRepairFirstClosure,
      continuitySummary: expect.stringContaining(`closure=${shorterRepairFirstClosure}`),
    }))
  })

  it('keeps explicit measured-return closure over a generic continuity menu when timeout fallback rebuilds host-visible project-state continuity', () => {
    const explicitMeasuredReturnClosure = 'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again.'
    const genericContinuityMenu = 'Keep the same thread on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line across visible reply, face, motion, and resident presence.'

    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-generic-menu-measured-return-closure-carry',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但超时兜底时别让 generic continuity 菜单盖掉这条更明确的 measured-return closure seam。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.82,
        companionshipPressure: 0.64,
        channels: [],
        summary: 'timeout fallback should keep the explicit measured-return closure seam over a generic continuity menu',
        projectState: {
          preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Same-session project-state carry already survives into timeout fallback without reopening from scratch.',
          primaryOpenLoop: 'Embodiment and initiative still need one tighter same-her closure seam before widening outward.',
          nextClosureTarget: genericContinuityMenu,
          sameHerSelfLine: 'Keep proving this is still one living her.',
          emotionalClosureCue: explicitMeasuredReturnClosure,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            emotionalClosureSummary: genericContinuityMenu,
          },
        },
      } as any,
    } as any)

    const payload = JSON.parse(reply) as {
      projectState?: {
        emotionalClosureCue?: string | null
      } | null
      projectStateAudit?: {
        emotionalClosureSummary?: string | null
        continuitySummary?: string | null
      } | null
    }

    expect(payload.projectState?.emotionalClosureCue).toBe(explicitMeasuredReturnClosure)
    expect(payload.projectStateAudit).toEqual(expect.objectContaining({
      emotionalClosureSummary: explicitMeasuredReturnClosure,
      continuitySummary: expect.stringContaining(`closure=${explicitMeasuredReturnClosure}`),
    }))
  })

  it('keeps execution timeout fallback on infra-status instead of contentful execution recovery', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-exec',
      actionKind: 'execute',
      messages: [
        { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as { reply: string, visibleReplyBlocked: boolean, reasonCodes: string[] }
    expect(payload.reply).toBe('')
    expect(payload.visibleReplyBlocked).toBe(true)
    expect(payload.reasonCodes).toContain('normal-reply-requires-provider-mind')
    expect(payload.reply).not.toContain('重新执行')
    expect(payload.reply).not.toContain('用cli帮我查一下桌面有什么文件')
  })

  it('keeps short follow-up timeout fallback on infra-status instead of replaying continuity', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-follow-up',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
        { role: 'assistant', content: '我已经替你把桌面看完了，现在一共 13 项，先能确认到这些：小砖猿、105ND800、GIT，另外还有 8 项。' },
        { role: 'user', content: '另外还有哪四项？' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as { reply: string, visibleReplyBlocked: boolean }
    expect(payload.reply).toBe('')
    expect(payload.visibleReplyBlocked).toBe(true)
    expect(reply).not.toContain('桌面')
    expect(reply).not.toContain('继续还是执行下一步')
    expect(reply).not.toContain('旧锚点')
  })

  it('returns minimal infra repair for regular non-greeting dialogue turns', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-general',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '我今天状态有点乱，想先把接下来两小时安排好' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as { reply: string, visibleReplyBlocked: boolean }
    expect(payload.reply).toBe('')
    expect(payload.visibleReplyBlocked).toBe(true)
    expect(payload.reply).not.toContain('两小时')
    expect(payload.reply).not.toContain('我先守住真实边界')
  })

  it('keeps timeout dialogue fallback as minimal repair instead of replaying an older greeting anchor', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-current-dialogue',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好。' },
        { role: 'user', content: '请你做出最生气的表情' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as { reply: string, visibleReplyBlocked: boolean }
    expect(payload.reply).toBe('')
    expect(payload.visibleReplyBlocked).toBe(true)
    expect(payload.reply).not.toContain('你好')
    expect(payload.reply).not.toContain('往下')
    expect(payload.reply).not.toContain('滑开')
  })

  it('backfills canonical same-her continuity when timeout fallback rebuilds project state from a thin runtime digest shell', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const expectedRecoveredAwarenessLine = buildAlicizationProjectPreDialogueAwarenessLine({
      identity: projectState.identity,
      currentPhase: projectState.currentPhase,
      latestLandedProgress: projectState.continuityProgressSummary ?? projectState.memoryAnthropomorphismProgress.at(-1) ?? null,
      primaryOpenLoop: projectState.openLoops[0] ?? null,
      nextClosureTarget: projectState.nextClosureTarget,
      sameHerSelfLine: projectState.sameHerSelfLine,
    })
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-canonical-project-state-fallback',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但别把这个数字生命项目回成模板。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.7,
        channels: [],
        summary: 'stay on the same life line',
        projectState: {
          identity: '',
          currentPhase: '',
          preflightSummary: '',
          preDialogueAwarenessLine: '',
          latestLandedProgress: '',
          primaryOpenLoop: '',
          nextClosureTarget: '',
          sameHerSelfLine: '',
          sameHerDriftRisk: '',
        },
      } as any,
    })

    const payload = JSON.parse(reply) as {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        preDialogueAwarenessLine?: string | null
        latestLandedProgress?: string | null
        sameHerSelfLine?: string | null
        sameHerHoldDetail?: string | null
        sameHerDriftRisk?: string | null
        continuityCue?: string | null
      } | null
      projectStateAudit?: {
        sameHerSummary?: string | null
        preDialogueAwarenessSummary?: string | null
        continuitySummary?: string | null
      } | null
    }

    expect(payload.projectState?.identity).toContain('local-first digital life project')
    expect(payload.projectState?.currentPhase).toContain('Phase 1: Local Digital Life')
    expect(payload.projectState?.preDialogueAwarenessLine).toBe(expectedRecoveredAwarenessLine)
    expect(payload.projectState?.latestLandedProgress).toBe(
      projectState.continuityProgressSummary ?? projectState.memoryAnthropomorphismProgress.at(-1) ?? null,
    )
    expect(payload.projectState?.sameHerSelfLine).toBe(projectState.sameHerSelfLine)
    expect(payload.projectState?.sameHerHoldDetail).toBe(projectState.sameHerHoldDetail)
    expect(payload.projectState?.sameHerDriftRisk).toBe(projectState.sameHerDriftRisk)
    expect(payload.projectState?.continuityCue).toBe(projectState.continuityCue)
    expect(payload.projectStateAudit?.sameHerSummary).toBe(projectState.sameHerSelfLine)
    expect(payload.projectStateAudit?.preDialogueAwarenessSummary).toBe(expectedRecoveredAwarenessLine)
    expect(payload.projectStateAudit?.continuitySummary).toContain(`same-her=${projectState.sameHerSelfLine}`)
    expect(payload.projectStateAudit?.continuitySummary).toContain(`phase=${projectState.currentPhase}`)
    expect(payload.projectStateAudit?.continuitySummary).toContain('landed=')
    expect(payload.projectStateAudit?.continuitySummary).toContain('open=')
    expect(payload.projectStateAudit?.continuitySummary).toContain('next=')
    expect(payload.projectStateAudit?.continuitySummary).toContain(
      (projectState.continuityProgressSummary ?? projectState.memoryAnthropomorphismProgress.at(-1) ?? '').slice(0, 96),
    )
    expect(payload.projectStateAudit?.continuitySummary).toContain(
      String(projectState.openLoops[0] ?? '').slice(0, 64),
    )
    expect(payload.projectStateAudit?.continuitySummary).toContain(
      projectState.nextClosureTarget.slice(0, 80),
    )
  })

  it('backfills canonical same-her continuity when timeout fallback rebuilds project state from a compact runtime same-her shell', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-compact-same-her-shell-fallback',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但别把同一个她压回 compact shell。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.7,
        channels: [],
        summary: 'stay on the same life line',
        projectState: {
          identity: '',
          currentPhase: '',
          preflightSummary: '',
          preDialogueAwarenessLine: '',
          latestLandedProgress: '',
          primaryOpenLoop: '',
          nextClosureTarget: '',
          sameHerSelfLine: 'same digital life | keep the closure seam explicit',
          sameHerDriftRisk: '',
        },
      } as any,
    })

    const payload = JSON.parse(reply) as {
      projectState?: {
        sameHerSelfLine?: string | null
      } | null
      projectStateAudit?: {
        sameHerSummary?: string | null
        continuitySummary?: string | null
      } | null
    }

    expect(payload.projectState?.sameHerSelfLine).toBe(projectState.sameHerSelfLine)
    expect(payload.projectStateAudit?.sameHerSummary).toBe(projectState.sameHerSelfLine)
    expect(payload.projectStateAudit?.continuitySummary).toContain(`same-her=${projectState.sameHerSelfLine}`)
  })

  it('keeps timeout expression fallback on minimal repair instead of pretending to answer the request', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-expression-dialogue',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好。' },
        { role: 'user', content: '你能不能表现得开心一点' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as {
      reply: string
      performance: {
        baseEmotion: string
        facialCue: string | null
      }
    }

    expect(payload.reply).toBe('')
    expect(payload.reply).not.toContain('直接接')
    expect(payload.reply).not.toContain('往下')
    expect(payload.reply).not.toMatch(/笑|眼神|情绪|眉眼/u)
    expect(payload.performance.baseEmotion).toBeTruthy()
  })

  it('keeps timeout self-appraisal fallback on minimal repair instead of pretending durable self answered', () => {
    const reply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-self-appraisal',
      actionKind: 'answer',
      digitalLifeSpine: createDigitalLifeSpine(),
      messages: [
        { role: 'user', content: '你觉得你可爱吗' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as { reply: string, visibleReplyBlocked: boolean }
    expect(payload.reply).toBe('')
    expect(payload.visibleReplyBlocked).toBe(true)
    expect(payload.reply).not.toContain('可爱')
    expect(payload.reply).not.toContain('最在意的那一层')
  })
})
