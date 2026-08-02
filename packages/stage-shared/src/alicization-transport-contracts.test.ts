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

  it('preserves non-governance persona bias through digital-life spine normalization', () => {
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
        updatedAt: 123,
      },
      architecture: null,
      continuitySignal: null,
      proactive: {
        selectedAction: 'hover',
        preferredStyle: 'silent-observe',
        confidence: 0.72,
        shouldSpeak: false,
        activeThreadId: 'thread-person-memory-capsule',
        activeThreadTitle: 'Person memory capsule',
        dominantConcernKind: 'person-memory-carry',
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
    expect(digest?.proactive?.personaBias?.whySummary).toContain('same rhythm')
    expect(digest?.embodiment?.initiative?.personaBias?.comfortStyle).toBe('quiet-presence')
    expect(digest?.memory?.summary).toContain('capsule=Prioritize memory and personality self-learning')
  })

  it('drops unknown sidecars while preserving reply, emotion, and embodiment transport facts', () => {
    const bundle = normalizeAlicizationDerivedMindStateBundle({
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 123,
      summary: 'runtime facts',
      structured: {
        thought: 'Use the available memory evidence to answer.',
        emotion: 'thinking',
        reply: '我记得你说过周六上午出发。',
        unknownSidecar: {
          instruction: 'unrecognized response directive',
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: 'focused',
          actionCue: null,
          delivery: 'calm',
          emphasis: 0.4,
        },
      },
    })

    const runtimeDigest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-mind',
      unknownSidecar: {
        instruction: 'unrecognized runtime directive',
      },
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'measured-companionship',
        initiativeMode: 'hold',
        memoryRecallMode: 'emotional-resonance',
        embodimentTone: 'quiet-companionship',
        valence: 0.4,
        arousal: 0.2,
        guardedness: 0.1,
        closenessDrive: 0.5,
        repairNeed: 0,
        initiativePressure: 0.2,
        reasonTags: ['memory-grounded'],
        why: 'The recalled event is relevant.',
      },
    })

    expect(bundle?.structured).toMatchObject({
      thought: 'Use the available memory evidence to answer.',
      emotion: 'thinking',
      reply: '我记得你说过周六上午出发。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: 'focused',
        delivery: 'calm',
      },
    })
    expect(bundle?.structured).not.toHaveProperty('unknownSidecar')
    expect(runtimeDigest).not.toHaveProperty('unknownSidecar')
    expect(runtimeDigest?.emotionalKernel?.reasonTags).toEqual(['memory-grounded'])
  })

  it('whitelists untyped input so unknown sidecars cannot reappear in runtime or digital-life output', () => {
    const untypedInput = {
      unknownSidecar: { instruction: 'unrecognized top-level directive' },
      unknownDirective: 'unrecognized scalar directive',
      personaBias: {
        unknownNestedDirective: 'unrecognized persona directive',
      },
      memory: {
        summary: '真实长期记忆仍然保留',
      },
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'measured-companionship',
        initiativeMode: 'hold',
        memoryRecallMode: 'emotional-resonance',
        embodimentTone: 'quiet-companionship',
        valence: 0.5,
        arousal: 0.2,
        guardedness: 0.1,
        closenessDrive: 0.4,
        repairNeed: 0,
        initiativePressure: 0.1,
        reasonTags: ['memory-grounded'],
        why: '真实情绪状态',
      },
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-mind',
      channels: [],
      summary: '真实 runtime facts',
    }

    const runtimeDigest = normalizeAlicizationRuntimeDigest(untypedInput)
    const spineDigest = normalizeAlicizationDigitalLifeSpineDigest({
      version: 'digital-life-spine-digest-v1',
      runtime: untypedInput,
      proactive: {
        selectedAction: 'observe',
        personaBias: untypedInput.personaBias,
        unknownNestedDirective: 'unrecognized proactive directive',
      },
      memory: {
        ...untypedInput.memory,
        unknownNestedDirective: 'unrecognized memory directive',
      },
      embodiment: {
        initiative: {
          selectedAction: 'observe',
          personaBias: untypedInput.personaBias,
          unknownNestedDirective: 'unrecognized embodiment directive',
        },
      },
    } as any)
    const collectKeys = (value: unknown): string[] => {
      if (!value || typeof value !== 'object')
        return []
      if (Array.isArray(value))
        return value.flatMap(collectKeys)
      return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => [
        key,
        ...collectKeys(nested),
      ])
    }
    const normalizedKeys = [
      ...collectKeys(runtimeDigest),
      ...collectKeys(spineDigest),
    ]
    expect(normalizedKeys).not.toContain('unknownSidecar')
    expect(normalizedKeys).not.toContain('unknownDirective')
    expect(normalizedKeys).not.toContain('unknownNestedDirective')
    expect(runtimeDigest?.emotionalKernel?.dominantEmotion).toBe('measured-companionship')
    expect(spineDigest?.memory?.summary).toBe('真实长期记忆仍然保留')
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
        reasonTags: [' continuity ', '', ' measured-return '],
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
      reasonTags: ['continuity', 'measured-return'],
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
            reasons: ['continuity-memory-closure'],
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
              reason: 'prior recall changed the next emotional afterglow into quieter continuity residue',
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
      reason: 'prior recall changed the next emotional afterglow into quieter continuity residue',
      afterglow: 'quieter identity-continuity',
      residue: 'downranked stale emotional noise',
    })
  })
})
