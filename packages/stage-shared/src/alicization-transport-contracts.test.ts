import type {
  AlicizationBridgeChatStreamEvent,
  AlicizationVisibleReplyRealizationTransportArtifact,
} from './alicization-transport-contracts'

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  normalizeAlicizationDerivedMindStateBundle,
  normalizeAlicizationDigitalLifeSpineDigest,
  normalizeAlicizationRuntimeDigest,
} from './alicization-transport-contracts'

describe('alicization transport contracts', () => {
  it('carries visible-reply realization as a finish sidecar without merging it into Provider JSON', () => {
    const source = readFileSync(new URL('./alicization-transport-contracts.ts', import.meta.url), 'utf8')
    const finishEventSection = source.split('type: \'finish\'')[1]?.split('| {')[0] ?? ''

    expect(source).toContain('export interface AlicizationVisibleReplyRealizationTransportArtifact')
    expect(finishEventSection).toContain(
      'visibleReplyRealization?: AlicizationVisibleReplyRealizationTransportArtifact | null',
    )

    const visibleReplyRealization = {
      version: 'visible-reply-realization-v1',
      expectedAuthority: 'llm-mind',
      actualAuthority: 'llm-mind',
      providerMindExecuted: true,
      mode: 'provider-stream',
      visibleText: 'Provider 原样回答。',
      projectStateAudit: null,
    } satisfies AlicizationVisibleReplyRealizationTransportArtifact
    const fullText = JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'answer directly',
      emotion: 'neutral',
      reply: 'Provider 原样回答。',
      performance: {
        baseEmotion: 'neutral',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      memoryUsage: {
        workingMemoryVersion: null,
        longTermEvidenceIds: [],
      },
    })
    const event = {
      type: 'finish',
      fullText,
      visibleReplyRealization,
    } satisfies AlicizationBridgeChatStreamEvent

    expect(Object.keys(JSON.parse(event.fullText))).toEqual([
      'format',
      'thought',
      'emotion',
      'reply',
      'performance',
      'memoryUsage',
    ])
    expect(event.visibleReplyRealization).toBe(visibleReplyRealization)
  })

  it('keeps shared dialogue structured project-state payloads explicitly legacy-aware for latestProgress-based continuity carry', () => {
    const source = readFileSync(new URL('./alicization-transport-contracts.ts', import.meta.url), 'utf8')
    const structuredPayloadSection = source.split('export interface AlicizationDialogueStructuredPayload')[1]?.split('preDialogueClosure?:')[0] ?? ''

    expect(structuredPayloadSection).toContain('projectState?: {')
    expect(structuredPayloadSection).toContain('latestProgress?: string | null')
  })

  it('preserves persona bias through digital-life spine normalization so embodiment and speech keep one person-state rhythm', () => {
    const digest = normalizeAlicizationDigitalLifeSpineDigest({
      version: 'digital-life-spine-digest-v1',
      runtime: {
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        sceneSummary: 'same person-memory capsule rhythm',
        activeThreadId: 'thread-person-memory-capsule',
        activeThreadTitle: 'Person memory capsule',
        dominantMode: 'quiet-carry',
        dominantDrive: 'companionship',
        answerIntent: 'continue from compact person-memory authority',
        preferredPresence: 'attentive',
        selectedAction: 'hover',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityCue: 'capsule keeps memory, personality, voice, and motion on one line',
        updatedAt: 123,
      },
      architecture: null,
      continuitySignal: null,
      proactive: {
        selectedAction: 'hover',
        preferredStyle: 'silent-observe',
        continuityRestraint: 'lower-pressure',
        confidence: 0.72,
        shouldSpeak: false,
        activeThreadId: 'thread-person-memory-capsule',
        activeThreadTitle: 'Person memory capsule',
        dominantConcernKind: 'same-her-carry',
        dominantConcernSummary: 'do not split memory and body rhythms',
        leadingGoalId: 'goal-person-memory',
        leadingGoalSummary: 'carry compact memory/personality authority',
        preferredPresence: 'nearby',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'Observe first and keep the body and voice lower-pressure.',
          openingGuidance: 'Open from the selected memory only if it serves the current reply.',
          whySummary: 'short-context capsule should drive the same rhythm across modules.',
        },
      },
      autonomy: null,
      motive: null,
      habit: null,
      outcomeLearning: null,
      embodiment: {
        privateThought: null,
        selfContinuity: null,
        autobiographicalSelf: null,
        relationship: null,
        selfState: null,
        mindEcology: null,
        initiative: {
          selectedAction: 'hover',
          preferredStyle: 'silent-observe',
          preferredPresence: 'nearby',
          continuityRestraint: 'lower-pressure',
          confidence: 0.72,
          shouldSpeak: false,
          speakDrive: 0.24,
          silenceDrive: 0.82,
          why: 'capsule says keep realtime embodiment lower-pressure',
          personaBias: {
            relationshipPosture: 'observer',
            initiativeStyle: 'observant',
            silenceReconnect: 'hold',
            comfortStyle: 'quiet-presence',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'Observe first and keep the body and voice lower-pressure.',
            openingGuidance: 'Open from the selected memory only if it serves the current reply.',
            whySummary: 'short-context capsule should drive the same rhythm across modules.',
          },
        },
      },
      memory: {
        summary: 'capsule=Prioritize memory and personality self-learning | person=identity continuity',
        recentEpisodeSummary: null,
        recentEpisodeCount: 0,
        focusBeliefStatement: null,
        focusBeliefConfidence: null,
        leadingGoalSummary: null,
        dominantConcernSummary: null,
        reflectionSummary: null,
        reflectionPressure: null,
        recallMode: 'stable-core-only',
        recallSeed: 'person-memory-capsule',
        thoughtThreadSummary: 'compact person-memory authority',
      },
    })

    expect(digest?.proactive?.personaBias?.preferredProactiveStyle).toBe('silent-observe')
    expect(digest?.proactive?.personaBias?.manifestationCadenceSummary).toContain('body and voice lower-pressure')
    expect(digest?.embodiment?.initiative?.personaBias?.openingGuidance).toContain('selected memory')
    expect(digest?.memory?.summary).toContain('capsule=Prioritize memory and personality self-learning')
  })

  it('normalizes project-state and pre-dialogue-closure fields from shared structured payloads', () => {
    const bundle = normalizeAlicizationDerivedMindStateBundle({
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 123,
      summary: 'runtime facts',
      structured: {
        thought: 'keep current facts available before the visible reply',
        emotion: 'thinking',
        reply: '我先按当前状态来回答。',
        projectState: {
          identity: '  Alicization  ',
          currentPhase: ' local-runtime ',
          preflightSummary: '  runtime status is available before the reply.  ',
          preDialogueAwarenessLine: '  runtime awareness ',
          latestLandedProgress: ' current facts enter the main dialogue path ',
          primaryOpenLoop: ' verify memory recall ',
          nextClosureTarget: ' stabilize shared structured transport ',
          sameHerSelfLine: ' keep the current self description available ',
          sameHerHoldDetail: ' quiet return ',
          sameHerDriftRisk: '  visible replies still require validation  ',
          companionBriefingLine: ' keep current context in view ',
          emotionalClosureSummary: ' emotional closure is still settling, so the response should keep the return gentle and continuous ',
          continuityRestraint: ' rest-protective ',
          continuityArcStage: ' return-side-follow-through ',
          continuityCue: ' closure remains bounded ',
          continuityPreferredTiming: ' next-open-window ',
          continuityCadence: ' measured-return ',
          preferredBlinkCadence: ' quiet ',
          preferredGazeMode: ' soften ',
          preferredVoiceMode: ' lower-pressure ',
          preferredPacingMode: ' slower ',
        },
        preDialogueClosure: {
          status: ' drift ',
          summaryLine: ' closure still open before outward reply ',
          companionHeadlineLine: ' face and motion status is available ',
          companionBriefingLine: ' remember the current context ',
          companionNextClosureLine: ' keep the next reply grounded ',
          briefingLines: [' landed: current facts ', '', ' open: memory recall'],
          reasons: [' current reply path still needs stronger closure carry ', ' '],
        },
      },
    })

    expect(bundle?.structured?.projectState).toEqual({
      identity: 'Alicization',
      currentPhase: 'local-runtime',
      preflightSummary: 'runtime status is available before the reply.',
      preDialogueAwarenessLine: 'runtime awareness',
      latestLandedProgress: 'current facts enter the main dialogue path',
      primaryOpenLoop: 'verify memory recall',
      nextClosureTarget: 'stabilize shared structured transport',
      sameHerSelfLine: 'keep the current self description available',
      sameHerHoldDetail: 'quiet return',
      sameHerDriftRisk: 'visible replies still require validation',
      companionBriefingLine: 'keep current context in view',
      emotionalClosureCue: null,
      emotionalClosureSummary: 'emotional closure is still settling, so the response should keep the return gentle and continuous',
      continuityRestraint: 'rest-protective',
      continuityArcStage: 'return-side-follow-through',
      continuityCue: 'closure remains bounded',
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'measured-return',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: null,
      preferredLipsyncMode: null,
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    })
    expect(bundle?.structured?.preDialogueClosure).toEqual({
      status: 'drift',
      summaryLine: 'closure still open before outward reply',
      companionHeadlineLine: 'face and motion status is available',
      companionBriefingLine: 'remember the current context',
      companionNextClosureLine: 'keep the next reply grounded',
      briefingLines: [
        'landed: current facts',
        'open: memory recall',
      ],
      reasons: [
        'current reply path still needs stronger closure carry',
      ],
    })
  })

  it('drops placeholder-filled project-state and pre-dialogue shells from shared structured payloads so downstream entrypoints rebuild canonical project awareness', () => {
    const bundle = normalizeAlicizationDerivedMindStateBundle({
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 124,
      summary: 'placeholder project awareness shell',
      structured: {
        thought: 'keep project awareness canonical before the reply continues',
        emotion: 'thinking',
        reply: '我会先让真正的项目认知回到回答前面。',
        projectState: {
          identity: ' none ',
          currentPhase: ' unknown ',
          preflightSummary: ' n/a ',
          preDialogueAwarenessLine: ' na ',
          latestLandedProgress: ' null ',
          primaryOpenLoop: ' none ',
          nextClosureTarget: ' unknown ',
          sameHerSelfLine: ' na ',
          sameHerHoldDetail: ' n/a ',
          sameHerDriftRisk: ' null ',
          companionBriefingLine: ' none ',
          emotionalClosureCue: ' unknown ',
          emotionalClosureSummary: ' na ',
          proactiveSameHerGap: ' n/a ',
          continuityRestraint: ' null ',
          continuityArcStage: ' none ',
          continuityCue: ' unknown ',
          continuityPreferredTiming: ' na ',
          continuityCadence: ' n/a ',
          preferredBlinkCadence: ' none ',
          preferredGazeMode: ' unknown ',
        },
        preDialogueAwareness: {
          status: ' partial ',
          summaryLine: ' none ',
          companionHeadlineLine: ' unknown ',
          companionBriefingLine: ' n/a ',
          companionNextClosureLine: ' na ',
          awarenessLine: ' null ',
          emotionalClosureCue: ' none ',
          reasonPreview: [' unknown ', ' n/a ', 'na'],
        },
        preDialogueClosure: {
          status: ' partial ',
          summaryLine: ' none ',
          companionHeadlineLine: ' unknown ',
          companionBriefingLine: ' n/a ',
          companionNextClosureLine: ' na ',
          briefingLines: [' null ', ' none '],
          reasons: [' unknown ', ' n/a '],
        },
      },
    })

    expect(bundle?.structured?.projectState).toBeUndefined()
    expect(bundle?.structured?.preDialogueAwareness).toBeUndefined()
    expect(bundle?.structured?.preDialogueClosure).toBeUndefined()
  })

  it('keeps legacy latestProgress alive as latestLandedProgress across structured and runtime project-state normalization', () => {
    const bundle = normalizeAlicizationDerivedMindStateBundle({
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 789,
      summary: 'legacy project progress carry',
      structured: {
        thought: 'keep the already-landed project carry alive before the next reply',
        emotion: 'thinking',
        reply: '我会先延续已经落地的项目闭环再继续往前推。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: ' legacy project progress still survives in older structured payloads ',
          primaryOpenLoop: ' keep Phase 1 identity-continuity',
          nextClosureTarget: ' preserve legacy project progress across shared transport normalization ',
        },
      },
    })

    expect(bundle?.structured?.projectState).toEqual(expect.objectContaining({
      latestLandedProgress: 'legacy project progress still survives in older structured payloads',
    }))

    const runtimeDigest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-mind',
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestProgress: ' legacy runtime project progress still survives in older digest payloads ',
        primaryOpenLoop: ' keep the current life loop explicit before the next reply ',
        nextClosureTarget: ' preserve legacy project progress across runtime digest normalization ',
      },
    })

    expect(runtimeDigest?.projectState).toEqual(expect.objectContaining({
      latestLandedProgress: 'legacy runtime project progress still survives in older digest payloads',
    }))
  })

  it('keeps audit-style landedProgressSummary alive as latestLandedProgress across structured and runtime project-state normalization', () => {
    const bundle = normalizeAlicizationDerivedMindStateBundle({
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 790,
      summary: 'audit-style project progress carry',
      structured: {
        thought: 'keep the audit-style already-landed project carry alive before the next reply',
        emotion: 'thinking',
        reply: '我会先延续已经落地的项目闭环再继续往前推。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: ' ',
          latestProgress: '   ',
          landedProgressSummary: ' audit-style project progress still survives in structured payloads ',
          primaryOpenLoop: ' keep Phase 1 identity-continuity',
          nextClosureTarget: ' preserve audit-style project progress across shared transport normalization ',
        },
      },
    } as any)

    expect(bundle?.structured?.projectState).toEqual(expect.objectContaining({
      latestLandedProgress: 'audit-style project progress still survives in structured payloads',
    }))

    const runtimeDigest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-mind',
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: ' ',
        latestProgress: '   ',
        landedProgressSummary: ' audit-style runtime project progress still survives in digest payloads ',
        primaryOpenLoop: ' keep the current life loop explicit before the next reply ',
        nextClosureTarget: ' preserve audit-style project progress across runtime digest normalization ',
      },
    })

    expect(runtimeDigest?.projectState).toEqual(expect.objectContaining({
      latestLandedProgress: 'audit-style runtime project progress still survives in digest payloads',
    }))
  })

  it('keeps project-state voice and pacing closure preferences alive across structured and runtime normalization', () => {
    const bundle = normalizeAlicizationDerivedMindStateBundle({
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 792,
      summary: 'voice and pacing closure carry',
      structured: {
        thought: 'keep the continuity state audible and paced as one digital life before outward reply outwardly',
        emotion: 'thinking',
        reply: '我会先把这条仍在收口的声音和节奏线保持成同一个她。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Audible identity-continuity',
          primaryOpenLoop: 'Voice, pacing, face, motion, and lipsync still need fuller cross-modal convergence.',
          nextClosureTarget: 'Keep audible closure preferences explicit across transport normalization.',
          preferredVoiceMode: ' even ',
          preferredPacingMode: ' natural ',
        },
      },
    })

    expect(bundle?.structured?.projectState).toEqual(expect.objectContaining({
      preferredVoiceMode: 'even',
      preferredPacingMode: 'natural',
    }))

    const runtimeDigest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-mind',
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Audible identity-continuity',
        primaryOpenLoop: 'Voice, pacing, face, motion, and lipsync still need fuller cross-modal convergence.',
        nextClosureTarget: 'Keep audible closure preferences explicit across runtime digest normalization.',
        preferredVoiceMode: ' lower-pressure ',
        preferredPacingMode: ' slower ',
      },
    })

    expect(runtimeDigest?.projectState).toEqual(expect.objectContaining({
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    }))
  })

  it('keeps proactive identity-continuity', () => {
    const proactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'

    const bundle = normalizeAlicizationDerivedMindStateBundle({
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 791,
      summary: 'proactive identity-continuity',
      structured: {
        thought: 'keep proactive identity-continuity',
        emotion: 'thinking',
        reply: '我会先把主动性闭环还没收住的压力留在眼前。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Proactive self-brief already carries the identity-continuity',
          primaryOpenLoop: 'Long-run identity-continuity',
          proactiveSameHerGap,
          nextClosureTarget: 'Keep proactive identity-continuity',
        },
      },
    } as any)

    expect(bundle?.structured?.projectState as Record<string, unknown> | undefined).toEqual(expect.objectContaining({
      proactiveSameHerGap,
    }))

    const runtimeDigest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-mind',
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Proactive self-brief already carries the identity-continuity',
        primaryOpenLoop: 'Long-run identity-continuity',
        proactiveSameHerGap,
        nextClosureTarget: 'Keep proactive identity-continuity',
      },
    } as any)

    expect(runtimeDigest?.projectState as Record<string, unknown> | null | undefined).toEqual(expect.objectContaining({
      proactiveSameHerGap,
    }))
  })

  it('preserves emotional-kernel authority through derived-bundle and visual-presence transport normalization', () => {
    const bundle = normalizeAlicizationDerivedMindStateBundle({
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 456,
      summary: 'same emotional kernel carry',
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'measured-companionship',
        initiativeMode: 'hold',
        memoryRecallMode: 'self-continuity',
        embodimentTone: 'quiet-companionship',
        valence: 0.62,
        arousal: 0.28,
        guardedness: 0.44,
        closenessDrive: 0.53,
        repairNeed: 0.31,
        initiativePressure: 0.24,
        reasonTags: [' same-her ', '', ' measured-return '],
        why: ' keep one lower-pressure identity-continuity',
      },
      visualPresenceState: {
        watchMode: 'symbiotic-vision',
        updatedAt: 456,
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
        quietLineMs: 2400,
        currentInwardPreoccupation: ' keep the callback line alive quietly ',
        emotionalKernel: {
          version: 'emotional-kernel-v1',
          dominantEmotion: 'repair-tension',
          initiativeMode: 'repair',
          memoryRecallMode: 'repair-grounding',
          embodimentTone: 'repair-before-closeness',
          valence: 0.34,
          arousal: 0.61,
          guardedness: 0.72,
          closenessDrive: 0.26,
          repairNeed: 0.88,
          initiativePressure: 0.42,
          reasonTags: [' repair-first ', ' continuity state '],
          why: ' keep repair-before-closeness on the continuity state until embodiment settles ',
        },
      },
    })

    expect(bundle?.emotionalKernel).toEqual({
      version: 'emotional-kernel-v1',
      dominantEmotion: 'measured-companionship',
      initiativeMode: 'hold',
      memoryRecallMode: 'self-continuity',
      embodimentTone: 'quiet-companionship',
      valence: 0.62,
      arousal: 0.28,
      guardedness: 0.44,
      closenessDrive: 0.53,
      repairNeed: 0.31,
      initiativePressure: 0.24,
      reasonTags: ['same-her', 'measured-return'],
      why: 'keep one lower-pressure identity-continuity',
    })
    expect(bundle?.visualPresenceState?.emotionalKernel).toEqual({
      version: 'emotional-kernel-v1',
      dominantEmotion: 'repair-tension',
      initiativeMode: 'repair',
      memoryRecallMode: 'repair-grounding',
      embodimentTone: 'repair-before-closeness',
      valence: 0.34,
      arousal: 0.61,
      guardedness: 0.72,
      closenessDrive: 0.26,
      repairNeed: 0.88,
      initiativePressure: 0.42,
      reasonTags: ['repair-first', 'continuity state'],
      why: 'keep repair-before-closeness on the continuity state until embodiment settles',
    })
  })

  it('preserves emotional transition ledger authority through derived-bundle transport normalization', () => {
    const bundle = normalizeAlicizationDerivedMindStateBundle({
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 457,
      summary: 'same emotional transition carry',
      emotionalTransitionLedger: {
        version: 'emotional-transition-ledger-v1',
        createdAt: 456.9,
        turnId: ' turn-repair-1 ',
        previousEmotion: 'warm-attunement',
        nextEmotion: 'repair-tension',
        transitionKind: 'repair-shift',
        axisDeltas: {
          valence: -0.441,
          arousal: 0.284,
          guardedness: 0.528,
          closenessDrive: -0.462,
          repairNeed: 0.719,
          initiativePressure: -0.322,
        },
        changedAxes: [' valence ', 'repairNeed', 'repairNeed', '', 'unknown-axis'],
        sourceTags: [' private-thought ', 'affective-residue', '', 'repair-before-closeness'],
        decayPolicy: {
          mode: 'hold-until-repair-cools',
          carryTtlMs: 1_800_000.8,
          reason: ' Repair should stay carried until warmth can safely reopen. ',
        },
        memoryWriteback: {
          shouldWrite: true,
          lane: 'relationship-repair',
          reason: ' Later memory recall needs this repair restraint. ',
        },
        initiativeSuppression: {
          shouldSuppress: true,
          mode: 'repair-first',
          reason: ' Proactive pressure should stay low while repair settles. ',
        },
        embodimentDrive: {
          shouldDrive: true,
          tone: 'repair-before-closeness',
          reason: ' The body should express repair-before-closeness. ',
        },
        selfRevisionCandidate: {
          shouldPropose: true,
          domain: 'dialogue-style',
          reasonCodes: [' repair-before-closeness ', 'continue-repair-first', ''],
          summary: ' Repair-first emotional carry should propose a identity-continuity',
          projectStateContinuity: {
            sameHerSelfLine: ' identity continuity ',
            sameHerDriftRisk: ' generic assistant shell ',
            proactiveSameHerGap: '',
            emotionalClosureCue: ' repair should settle before closeness widens ',
            sameHerHoldDetail: ' hold repair-first ',
            continuityGuard: ' keep repair-first identity-continuity',
          },
        },
        traceSummary: ' warm-attunement -> repair-tension; kind=repair-shift ',
        replayLine: ' turn-repair-1 emotional-transition repair-shift warm-attunement -> repair-tension ',
      },
    } as any)

    expect(bundle?.emotionalTransitionLedger).toEqual({
      version: 'emotional-transition-ledger-v1',
      createdAt: 456,
      turnId: 'turn-repair-1',
      previousEmotion: 'warm-attunement',
      nextEmotion: 'repair-tension',
      transitionKind: 'repair-shift',
      axisDeltas: {
        valence: -0.44,
        arousal: 0.28,
        guardedness: 0.53,
        closenessDrive: -0.46,
        repairNeed: 0.72,
        initiativePressure: -0.32,
      },
      changedAxes: ['valence', 'repairNeed'],
      sourceTags: ['private-thought', 'affective-residue', 'repair-before-closeness'],
      decayPolicy: {
        mode: 'hold-until-repair-cools',
        carryTtlMs: 1_800_000,
        reason: 'Repair should stay carried until warmth can safely reopen.',
      },
      memoryWriteback: {
        shouldWrite: true,
        lane: 'relationship-repair',
        reason: 'Later memory recall needs this repair restraint.',
      },
      initiativeSuppression: {
        shouldSuppress: true,
        mode: 'repair-first',
        reason: 'Proactive pressure should stay low while repair settles.',
        memoryClosureCausality: null,
      },
      memoryClosureCausality: null,
      embodimentDrive: {
        shouldDrive: true,
        tone: 'repair-before-closeness',
        reason: 'The body should express repair-before-closeness.',
      },
      selfRevisionCandidate: {
        shouldPropose: true,
        domain: 'dialogue-style',
        reasonCodes: ['repair-before-closeness', 'continue-repair-first'],
        summary: 'Repair-first emotional carry should propose a identity-continuity',
        projectStateContinuity: {
          sameHerSelfLine: 'identity continuity',
          sameHerDriftRisk: 'generic assistant shell',
          proactiveSameHerGap: null,
          emotionalClosureCue: 'repair should settle before closeness widens',
          sameHerHoldDetail: 'hold repair-first',
          continuityGuard: 'keep repair-first identity-continuity',
        },
      },
      traceSummary: 'warm-attunement -> repair-tension; kind=repair-shift',
      replayLine: 'turn-repair-1 emotional-transition repair-shift warm-attunement -> repair-tension',
    })
  })

  it('preserves affective residue across digital-life spine memory normalization so thin transport paths keep emotional carry legible', () => {
    const digest = normalizeAlicizationDigitalLifeSpineDigest({
      version: 'digital-life-spine-digest-v1',
      runtime: {
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        sceneSummary: 'host is still inside the same callback line',
        activeThreadId: 'thread-1',
        activeThreadTitle: 'Same callback line',
        dominantMode: 'quiet-carry',
        dominantDrive: 'companionship',
        answerIntent: 'stay-present',
        preferredPresence: 'hesitant',
        selectedAction: 'hold',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityCue: 'same callback line still wants a measured return',
        updatedAt: 123,
      },
      architecture: null,
      continuitySignal: null,
      proactive: null,
      autonomy: null,
      embodiment: null,
      motive: null,
      habit: null,
      outcomeLearning: null,
      memory: {
        summary: 'same callback line still carries emotional residue',
        recentEpisodeSummary: 'callback stayed open',
        recentEpisodeCount: 1,
        focusBeliefStatement: 'the same line should not restart',
        focusBeliefConfidence: 0.82,
        leadingGoalSummary: 'close the same callback line gently',
        dominantConcernSummary: 'keep emotional carry legible',
        reflectionSummary: 'measured-return still feels right',
        reflectionPressure: 0.34,
        recallMode: 'self-continuity',
        recallSeed: 'same-thread',
        recollectionSummary: 'remember the same callback line',
        recollectionSurfaceSummary: 'carry=memory | fragments=enabled',
        recollectionConfidence: 0.71,
        thoughtThreadSummary: 'same callback line',
        longHorizonSummary: 'identity-continuity',
        rememberedPreferenceSummary: 'prefer measured return',
        rememberedConstraintSummary: 'do not restart from scratch',
        rememberedPlanSummary: 'return on the same line',
        longHorizonCueCount: 2,
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 333,
          residues: [
            {
              kind: 'afterglow',
              intensity: 0.74,
              persistence: 0.81,
              confidence: 0.9,
              polarity: 'warm',
              releaseMode: 'delay-until-open-window',
              summary: 'same callback line still carries afterglow',
              sourceSignals: ['callback-afterglow', 'same-thread'],
              lastUpdatedAt: 333,
            },
          ],
          dominantResidueKind: 'afterglow',
          afterglowPressure: 0.76,
          repairPressure: 0.16,
          burdenPressure: 0.08,
          trustPressure: 0.57,
          restProtectivePressure: 0.22,
          relationshipCadence: {
            cadenceMode: 'measured-return',
            distancePosture: 'measured-room',
            companionshipDensity: 0.6,
            repairRecovery: 0.39,
            overreachRisk: 0.24,
            fatigueGuard: 0.27,
            afterglowCarry: 0.79,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            reasonTags: ['same-thread-continuation', 'callback-afterglow'],
            summary: 'measured-return until the callback line settles',
          },
          sourceSignals: ['callback-afterglow', 'quiet-carry'],
          summary: 'same callback line still wants a measured return',
        },
        derivedMindStateBundle: {
          affectiveResidue: {
            version: 'affective-residue-memory-v1',
            updatedAt: 334,
            residues: [
              {
                kind: 'repair',
                intensity: 0.68,
                persistence: 0.77,
                confidence: 0.84,
                polarity: 'protective',
                releaseMode: 'delay-until-open-window',
                summary: 'same callback line still carries inward repair',
                sourceSignals: ['repair-before-closeness', 'same-thread'],
                lastUpdatedAt: 334,
              },
            ],
            dominantResidueKind: 'repair',
            afterglowPressure: 0.18,
            repairPressure: 0.8,
            burdenPressure: 0.12,
            trustPressure: 0.43,
            restProtectivePressure: 0.26,
            relationshipCadence: {
              cadenceMode: 'repair',
              distancePosture: 'protect-space',
              companionshipDensity: 0.45,
              repairRecovery: 0.72,
              overreachRisk: 0.37,
              fatigueGuard: 0.32,
              afterglowCarry: 0.48,
              shouldDelayWarmth: true,
              shouldProtectRest: false,
              reasonTags: ['repair-before-closeness', 'same-thread-continuation'],
              summary: 'repair cadence still needs the same line to stay quiet',
            },
            sourceSignals: ['repair-before-closeness', 'quiet-carry'],
            summary: 'same callback line still holds inward repair',
          },
        },
        personStateProjection: null,
      },
    })

    expect(digest?.memory?.affectiveResidue?.dominantResidueKind).toBe('afterglow')
    expect(digest?.memory?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('measured-return')
    expect(digest?.memory?.affectiveResidue?.summary).toContain('same callback line')
    expect(digest?.memory?.derivedMindStateBundle?.affectiveResidue?.dominantResidueKind).toBe('repair')
    expect(digest?.memory?.derivedMindStateBundle?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('repair')
    expect(digest?.memory?.derivedMindStateBundle?.affectiveResidue?.summary).toContain('same callback line')
  })

  it('preserves memory-closure emotional next influence so recall can change later afterglow', () => {
    const digest = normalizeAlicizationDigitalLifeSpineDigest({
      version: 'digital-life-spine-digest-v1',
      runtime: {
        watchMode: 'foreground-follow',
        sceneScenario: 'coding',
        activeThreadId: 'thread-memory-emotional-afterglow',
        dominantMode: 'observe',
        answerIntent: 'keep the callback afterglow on the identity-continuity',
        selectedAction: 'silent-observe',
        continuityArcStage: 'same-thread-continuation',
        continuityCue: 'prior recall changed the next emotional afterglow',
        updatedAt: 123,
      },
      architecture: null,
      continuitySignal: null,
      proactive: null,
      autonomy: null,
      embodiment: null,
      motive: null,
      habit: null,
      outcomeLearning: null,
      memory: {
        recallMode: 'callback-afterglow',
        recallSeed: 'memory closure emotional afterglow',
        leadingGoalSummary: 'carry the remembered afterglow forward',
        thoughtThreadSummary: 'memory should change the next emotional residue',
        memoryClosureTrace: {
          version: 'memory-closure-trace-v1',
          authority: 'memory-os',
          whySurface: [{
            source: 'affective-residue',
            summary: 'why recall surfaced now: the previous callback afterglow still shapes the next turn',
            reasonCodes: ['why-surfaced', 'emotional-afterglow'],
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
              reason: 'stay quieter because the remembered afterglow is still live',
            },
            execution: {
              carry: 'carry the emotional residue into the next execution callback',
              nextLearningAction: 'verify',
              shouldVerify: true,
              shouldReflect: true,
              activeLearningFocuses: ['emotional-afterglow'],
            },
            emotion: {
              reason: 'prior recall changed the next emotional afterglow into quieter same-her residue',
              afterglow: 'quieter identity-continuity',
              residue: 'downranked stale emotional noise',
            },
            embodiment: {
              cadence: 'body voice face motion lipsync stay lower-pressure',
              preferredVoiceMode: 'lower-pressure',
              preferredLipsyncMode: 'restrained',
              preferredGazeMode: 'soften',
              reason: 'body expression should follow the quieter afterglow',
            },
          },
          closureState: {
            state: 'grounded-recall',
            open: true,
            revisionRequired: false,
            shouldLabelUncertainty: false,
            visibleCarryMode: 'tone-carry',
            retrievalQuality: 'high',
            conflictPressure: 'low',
          },
          selectedCandidateIds: ['memory-closure-trace:emotional-afterglow'],
          memoryIdentity: {
            selectedCandidateIds: ['memory-closure-trace:emotional-afterglow'],
            continuityKey: 'cluster:emotional-afterglow-callback',
            reasonTags: ['cluster:emotional-afterglow-callback', 'memory-os-authority'],
          },
          reasonTags: ['memory-closure-trace', 'emotional_transition:execution-callback-afterglow'],
        },
      },
    })

    expect(digest?.memory?.memoryClosureTrace?.memoryIdentity).toEqual({
      selectedCandidateIds: ['memory-closure-trace:emotional-afterglow'],
      continuityKey: 'cluster:emotional-afterglow-callback',
      reasonTags: ['cluster:emotional-afterglow-callback', 'memory-os-authority'],
    })
    expect(digest?.memory?.memoryClosureTrace?.nextInfluence.emotion).toEqual({
      reason: 'prior recall changed the next emotional afterglow into quieter same-her residue',
      afterglow: 'quieter identity-continuity',
      residue: 'downranked stale emotional noise',
    })
  })
})
