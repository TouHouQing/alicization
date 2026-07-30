import { describe, expect, it } from 'vitest'

import {
  normalizeProviderFacingMindTurnContract,
  rebuildProviderFacingMindTurnContract,
  resolvePreparedRuntimeSurfaceSelection,
} from './main-chat-session-runtime'

describe('main chat session runtime governance isolation', () => {
  it('does not return project-state or closure governance to the provider contract', () => {
    const contract = {
      version: 'mind-turn-contract-v1',
      answerIntent: 'answer the user',
      answerAct: 'direct-answer',
      turnMode: 'answer',
      responseMode: 'normal',
      evidenceMode: 'memory-aware',
      openingStyle: 'direct-answer',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'full',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: null,
      labelCarryAsMemory: false,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['project-state=keep same-her opening policy'],
      mustNotDo: ['relationship_cadence=measured-return'],
      governingFocus: 'Answer from the current user message.',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: 'phase1 digital life closure',
      emotionalClosureCue: 'repair-before-closeness',
      projectState: {
        preDialogueAwarenessLine: 'Before answering, keep the same-her line.',
        nextClosureTarget: 'Project closure.',
      },
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'Project closure.',
        briefingLines: ['same-her continuity'],
        reasons: ['opening_policy'],
      },
      reasons: ['project-state'],
      updatedAt: 1,
    } as any

    const rebuilt = rebuildProviderFacingMindTurnContract({
      contract,
      governance: null,
      runtimeSurface: null,
    })
    const normalized = normalizeProviderFacingMindTurnContract(rebuilt, null, null)

    for (const result of [rebuilt, normalized]) {
      expect(result?.projectState).toBeNull()
      expect(result?.preDialogueClosure).toBeNull()
      expect(result?.governingProject).toBeNull()
      expect(result?.emotionalClosureCue).toBeNull()
      expect(result?.mustDo).toEqual([])
      expect(result?.mustNotDo).toEqual([])
      expect(result?.reasons).toEqual([])
    }
  })

  it('removes project governance from every prepared runtime surface channel', () => {
    const projectState = {
      preDialogueAwarenessLine: 'Before answering, keep the same-her line.',
      continuityCadence: 'relationship_cadence=measured-return',
    }
    const surface = {
      version: 'digital-life-runtime-surface-v1',
      raw: {
        runtime: { projectState },
        runtimeDigest: { projectState },
      },
      perception: {
        watchMode: 'idle',
        currentScene: null,
        attention: null,
        captureState: null,
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 0,
        updatedAt: 1,
      },
      world: {
        worldModel: null,
        worldOntology: null,
        entityWorld: null,
        livingWorldState: null,
        relationshipModel: null,
      },
      cognition: {
        runtimeDigest: { projectState },
      },
      memory: {
        workingMemoryEpisodes: [],
        goalStack: null,
        concerns: [],
      },
      dialogue: {
        currentConsciousFrame: {
          projectState,
          reasonTags: ['project-state', 'live-user-question'],
        },
        answerPlanner: {
          governingProject: 'phase1 closure',
          mustDo: ['same-her continuity'],
          mustNotDo: [],
        },
      },
      agency: {},
    } as any

    const selected = resolvePreparedRuntimeSurfaceSelection({
      answerPlannerReducedRuntimeSurface: surface,
      baseDigitalLifeRuntimeSurface: surface,
      digitalLifeSpine: null,
    })

    for (const runtimeSurface of [
      selected.fresherRuntimeSurface,
      selected.runtimeSurfaceForBuilder,
      selected.selectionDiagnostics.preAdjustmentSelectedRuntimeSurface,
    ]) {
      expect(runtimeSurface?.dialogue.currentConsciousFrame?.projectState).toBeUndefined()
      expect(runtimeSurface?.raw?.runtime?.projectState).toBeUndefined()
      expect(runtimeSurface?.raw?.runtimeDigest?.projectState).toBeUndefined()
      expect(runtimeSurface?.cognition.runtimeDigest?.projectState).toBeUndefined()
      expect(runtimeSurface?.dialogue.answerPlanner?.governingProject).toBeNull()
      expect(runtimeSurface?.dialogue.answerPlanner?.mustDo).toEqual([])
    }
  })
})
