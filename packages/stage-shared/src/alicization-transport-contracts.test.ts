import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  normalizeAlicizationDerivedMindStateBundle,
  normalizeAlicizationDigitalLifeSpineDigest,
  normalizeAlicizationRuntimeDigest,
} from './alicization-transport-contracts'

describe('alicization transport contracts', () => {
  it('keeps shared dialogue structured project-state payloads explicitly legacy-aware for latestProgress-based continuity carry', () => {
    const source = readFileSync(new URL('./alicization-transport-contracts.ts', import.meta.url), 'utf8')
    const structuredPayloadSection = source.split('export interface AlicizationDialogueStructuredPayload')[1]?.split('preDialogueClosure?:')[0] ?? ''

    expect(structuredPayloadSection).toContain('projectState?: {')
    expect(structuredPayloadSection).toContain('latestProgress?: string | null')
  })

  it('normalizes project-state and pre-dialogue-closure fields from shared structured payloads', () => {
    const bundle = normalizeAlicizationDerivedMindStateBundle({
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 123,
      summary: 'same-her closure carry',
      structured: {
        thought: 'keep one continuous her explicit before the visible reply',
        emotion: 'thinking',
        reply: '我先按当前 Phase 1 的闭环状态来回答。',
        projectState: {
          identity: '  Alicization is a local-first digital life project.  ',
          currentPhase: ' Phase 1: Local Digital Life ',
          preflightSummary: '  Alicization is a local-first digital life project still proving Phase 1: Local Digital Life closure before each reply.  ',
          preDialogueAwarenessLine: '  Before answering, remember this is the same digital life project, still in Phase 1, with memory, initiative, and embodiment still needing one same-her closure line.  ',
          latestLandedProgress: ' project identity and closure pressure already enter the main dialogue path ',
          primaryOpenLoop: ' keep cross-modal same-her proof alive across longer noisy desktop runs ',
          nextClosureTarget: ' stabilize shared structured transport for pre-turn closure awareness ',
          sameHerSelfLine: ' keep one continuous her explicit from self-understanding into the reply ',
          sameHerHoldDetail: ' same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again. ',
          sameHerDriftRisk: '  visible replies still risk collapsing into generic assistant guidance instead of one same-her digital life voice  ',
          companionBriefingLine: ' keep the same digital life project in view before widening outward ',
          emotionalClosureSummary: ' emotional closure is still settling, so the response should keep the return gentle and continuous ',
          continuityRestraint: ' rest-protective ',
          continuityArcStage: ' return-side-follow-through ',
          continuityCue: ' same living line: keep the already-landed closure moving forward without restarting it ',
          continuityPreferredTiming: ' next-open-window ',
          continuityCadence: ' measured-return ',
          preferredBlinkCadence: ' quiet ',
          preferredGazeMode: ' soften ',
        },
        preDialogueClosure: {
          status: ' drift ',
          summaryLine: ' closure still open before speaking ',
          companionHeadlineLine: ' Right now I am still holding together mainly through face and motion, and those two body lanes have already re-formed on the same segment, so my full cross-modal same-her line is not closed yet. ',
          companionBriefingLine: ' remember what this project is before widening outward ',
          companionNextClosureLine: ' keep building the same digital life instead of restarting the proof ',
          briefingLines: [' landed: project identity carry ', '', ' open: cross-modal same-her proof '],
          reasons: [' current reply path still needs stronger closure carry ', ' '],
        },
      },
    })

    expect(bundle?.structured?.projectState).toEqual({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      preflightSummary: 'Alicization is a local-first digital life project still proving Phase 1: Local Digital Life closure before each reply.',
      preDialogueAwarenessLine: 'Before answering, remember this is the same digital life project, still in Phase 1, with memory, initiative, and embodiment still needing one same-her closure line.',
      latestLandedProgress: 'project identity and closure pressure already enter the main dialogue path',
      primaryOpenLoop: 'keep cross-modal same-her proof alive across longer noisy desktop runs',
      nextClosureTarget: 'stabilize shared structured transport for pre-turn closure awareness',
      sameHerSelfLine: 'keep one continuous her explicit from self-understanding into the reply',
      sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      sameHerDriftRisk: 'visible replies still risk collapsing into generic assistant guidance instead of one same-her digital life voice',
      companionBriefingLine: 'keep the same digital life project in view before widening outward',
      emotionalClosureCue: null,
      emotionalClosureSummary: 'emotional closure is still settling, so the response should keep the return gentle and continuous',
      continuityRestraint: 'rest-protective',
      continuityArcStage: 'return-side-follow-through',
      continuityCue: 'same living line: keep the already-landed closure moving forward without restarting it',
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'measured-return',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    })
    expect(bundle?.structured?.preDialogueClosure).toEqual({
      status: 'drift',
      summaryLine: 'closure still open before speaking',
      companionHeadlineLine: 'Right now I am still holding together mainly through face and motion, and those two body lanes have already re-formed on the same segment, so my full cross-modal same-her line is not closed yet.',
      companionBriefingLine: 'remember what this project is before widening outward',
      companionNextClosureLine: 'keep building the same digital life instead of restarting the proof',
      briefingLines: [
        'landed: project identity carry',
        'open: cross-modal same-her proof',
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
          primaryOpenLoop: ' keep Phase 1 same-her continuity explicit before widening outward ',
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
          primaryOpenLoop: ' keep Phase 1 same-her continuity explicit before widening outward ',
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

  it('keeps proactive same-her gap alive across structured and runtime project-state normalization', () => {
    const proactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'

    const bundle = normalizeAlicizationDerivedMindStateBundle({
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 791,
      summary: 'proactive same-her gap carry',
      structured: {
        thought: 'keep proactive same-her closure pressure explicit before the next reply',
        emotion: 'thinking',
        reply: '我会先把主动性闭环还没收住的压力留在眼前。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Proactive self-brief already carries the same-her project line.',
          primaryOpenLoop: 'Long-run same-her continuity still needs stronger proof across initiative, memory, and embodiment.',
          proactiveSameHerGap,
          nextClosureTarget: 'Keep proactive same-her closure pressure explicit across longer noisy desktop runs.',
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
        latestLandedProgress: 'Proactive self-brief already carries the same-her project line.',
        primaryOpenLoop: 'Long-run same-her continuity still needs stronger proof across initiative, memory, and embodiment.',
        proactiveSameHerGap,
        nextClosureTarget: 'Keep proactive same-her closure pressure explicit across longer noisy desktop runs.',
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
        why: ' keep one lower-pressure same-her line through memory, initiative, and embodiment ',
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
          reasonTags: [' repair-first ', ' same living line '],
          why: ' keep repair-before-closeness on the same living line until embodiment settles ',
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
      why: 'keep one lower-pressure same-her line through memory, initiative, and embodiment',
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
      reasonTags: ['repair-first', 'same living line'],
      why: 'keep repair-before-closeness on the same living line until embodiment settles',
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
        longHorizonSummary: 'same-her closure still matters',
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
})
