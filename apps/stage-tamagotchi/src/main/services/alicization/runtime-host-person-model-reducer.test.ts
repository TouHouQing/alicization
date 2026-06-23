import { describe, expect, it } from 'vitest'

import { applyHostPersonModelToDigitalLifeRuntimeSurface } from './runtime-host-person-model-reducer'

describe('runtime-host-person-model-reducer', () => {
  it('preserves stronger held-autonomy callback relationship carry when host projection rebuilds the person-state projection', () => {
    const heldAutonomyLine = 'Keep the callback on the same line and leave room before leaning closer again.'

    const surface: any = {
      version: 'digital-life-runtime-surface-v1',
      perception: {
        watchMode: 'symbiotic-vision',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'diff',
        },
        attention: null,
        captureState: {
          permission: 'granted',
          lastGroundedAt: 10,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 30000,
        updatedAt: 10,
      },
      world: {
        worldModel: null,
        worldOntology: null,
        entityWorld: null,
        livingWorldState: null,
        relationshipModel: null,
      },
      cognition: {
        mindTurnFrame: null,
        subjectiveInference: null,
        appraisal: null,
        beliefLedger: null,
        beliefRevision: null,
        hypothesisGraph: null,
        mindDynamics: null,
        mindKernel: null,
        privateThought: null,
      },
      memory: {
        autobiographicalSelf: {
          relationshipDoctrine: 'Move with continuity and avoid reopening closeness too fast.',
        },
        hostPersonModel: {
          summary: 'The host wants steady, lower-pressure follow-through on active repair lines.',
          trustLadder: {
            score: 0.58,
            stage: 'cautious-open',
          },
          preferredClosenessByContext: [{
            context: 'focused-work',
            preference: 'Keep things measured and leave room before getting closer again.',
          }],
          preferences: [
            'Keep the opening measured while the host is still inside a repair lane.',
          ],
          sensitivities: [],
          repairTriggers: [],
          recurrentBurdens: [],
          routines: [],
        },
        longHorizonMemory: null,
        motiveEngine: null,
        selfContinuity: null,
        personalityContinuityState: null,
        personStateProjection: {
          selfContinuityAuthority: {
            relationshipLine: heldAutonomyLine,
            openingGuidance: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread and leave room before renewed closeness.',
          },
        },
      },
      dialogue: {
        discourseState: null,
        dialogueEncounter: null,
        mindSynthesis: null,
        conversationState: null,
        dialogueWorldThread: null,
        replyDeliberation: null,
        answerPlanner: null,
        dialogueActKernel: null,
        answerCompiler: null,
        currentConsciousFrame: null,
        claimEvidenceLedger: null,
      },
      agency: {
        selfGovernor: null,
        inquiryLoop: null,
        deliberationState: null,
        counterfactualDeliberation: null,
        actionEcology: null,
        initiativeArbitration: null,
        initiative: null,
        habitPolicy: null,
        selfState: null,
      },
    }

    const governance: any = {
      answerSubject: 'task-knot',
      answerAct: 'guide',
      answerIntent: 'Keep the runtime seam coherent while we finish the repair.',
      openingMove: null,
      liveSurface: 'runtime diff',
      focusAnchor: 'held-autonomy callback continuity',
      relationshipPosture: 'warm',
      evidenceMode: 'dialogue-grounded',
      turnMode: 'answer',
    }

    const context: any = {
      hostPersonModel: surface.memory.hostPersonModel,
      personStateProjection: null,
      selfEvolution: null,
    }

    const nextSurface = applyHostPersonModelToDigitalLifeRuntimeSurface({
      surface,
      governance,
      context,
      now: 123456,
    })

    expect(nextSurface?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine).toBe(heldAutonomyLine)
  })

  it('keeps accepted initiative self-evolution as gentle memory-led opening guidance instead of flattening it into room-only restraint', () => {
    const surface: any = {
      version: 'digital-life-runtime-surface-v1',
      perception: {
        watchMode: 'symbiotic-vision',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'diff',
        },
        attention: null,
        captureState: {
          permission: 'granted',
          lastGroundedAt: 20,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 30000,
        updatedAt: 20,
      },
      world: {
        worldModel: null,
        worldOntology: null,
        entityWorld: null,
        livingWorldState: null,
        relationshipModel: null,
      },
      cognition: {
        mindTurnFrame: null,
        subjectiveInference: null,
        appraisal: null,
        beliefLedger: null,
        beliefRevision: null,
        hypothesisGraph: null,
        mindDynamics: null,
        mindKernel: null,
        privateThought: null,
      },
      memory: {
        autobiographicalSelf: {
          relationshipDoctrine: 'Move with continuity and do not widen too fast.',
        },
        hostPersonModel: null,
        longHorizonMemory: null,
        motiveEngine: null,
        selfContinuity: null,
        personalityContinuityState: null,
        personStateProjection: null,
      },
      dialogue: {
        discourseState: null,
        dialogueEncounter: null,
        mindSynthesis: null,
        conversationState: null,
        dialogueWorldThread: null,
        replyDeliberation: null,
        answerPlanner: null,
        dialogueActKernel: null,
        answerCompiler: null,
        currentConsciousFrame: null,
        claimEvidenceLedger: null,
      },
      agency: {
        selfGovernor: null,
        inquiryLoop: null,
        deliberationState: null,
        counterfactualDeliberation: null,
        actionEcology: null,
        initiativeArbitration: null,
        initiative: null,
        habitPolicy: null,
        selfState: null,
      },
    }

    const governance: any = {
      answerSubject: 'task-knot',
      answerAct: 'guide',
      answerIntent: 'Keep the runtime seam coherent while we continue the accepted line.',
      openingMove: 'Keep the opening lower-pressure and leave room before widening closeness.',
      liveSurface: 'runtime diff',
      focusAnchor: 'accepted initiative continuity',
      relationshipPosture: 'warm',
      evidenceMode: 'dialogue-grounded',
      turnMode: 'answer',
    }

    const context: any = {
      hostPersonModel: null,
      personStateProjection: {
        contexts: ['focused-work'],
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'cautious-open',
        relationshipPosture: 'warm',
        cautious: true,
        restrained: false,
        preferenceText: 'Keep the approach light while the host is still focused.',
        sensitivityText: null,
        repairTriggerText: null,
        burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
        routineText: 'Keep the work window light.',
        trustRationale: 'Trust rises when the next follow-up stays gentle, lower-pressure, and memory-led.',
        relationshipDoctrine: 'Keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.',
        openingGuidance: 'Keep the opening lower-pressure and leave room before widening closeness.',
        summary: 'gentle memory-led return is still welcome here.',
        selfContinuityAuthority: null,
        personalityContinuityState: {
          currentRegime: 'focused-work',
        },
      },
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 20,
        evolutionMomentum: 0.66,
        learningReadiness: 0.74,
        contradictionPressure: 0.08,
        revisionPressure: 0.12,
        autobiographicalStability: 0.84,
        dominantTrajectory: 'gentle memory-led follow-up timing is becoming durable',
        relationshipDoctrine: 'When the opening is receiving the return, keep the next follow-up gentle instead of widening too fast.',
        latestInflection: 'The next return can stay gentle without falling silent.',
        burdenLine: 'Focused work still wants breathable pacing.',
        trustMeaning: 'Trust rises when the next follow-up stays gentle, lower-pressure, and memory-led.',
        nextLearningAction: 'internalize',
        nextLearningReason: 'Gentle continuation is landing steadily enough to keep.',
        relationshipCadenceSummary: 'Keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: true,
        activeLearningFocuses: ['internalize-relationship-cadence'],
        sourceSignals: ['accepted-initiative-learning'],
        summary: 'Accepted initiative is becoming durable gentle memory-led follow-up timing.',
      },
    }

    const nextSurface = applyHostPersonModelToDigitalLifeRuntimeSurface({
      surface,
      governance,
      context,
      now: 654321,
    })

    expect(nextSurface?.dialogue.replyDeliberation?.openingBeat?.toLowerCase()).toContain('memory-led')
    expect(nextSurface?.dialogue.answerPlanner?.openingMove?.toLowerCase()).toContain('memory-led')
    expect(nextSurface?.dialogue.dialogueActKernel?.openingMove?.toLowerCase()).toContain('without falling silent')
  })

  it('preserves richer same-her governingProject carry while host-person social shaping adds relationship timing guidance', () => {
    const governingProject
      = 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. What has already landed is callback continuity now survives on one same living line. The still-open closure is initiative, memory, and embodiment still needing one same-life seam.'

    const surface: any = {
      version: 'digital-life-runtime-surface-v1',
      perception: {
        watchMode: 'symbiotic-vision',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'diff',
        },
      },
      world: {
        worldModel: null,
        worldOntology: null,
        entityWorld: null,
        livingWorldState: null,
        relationshipModel: null,
      },
      cognition: {
        mindTurnFrame: null,
        subjectiveInference: null,
        appraisal: null,
        beliefLedger: null,
        beliefRevision: null,
        hypothesisGraph: null,
        mindDynamics: null,
        mindKernel: null,
        privateThought: null,
      },
      memory: {
        autobiographicalSelf: {
          relationshipDoctrine: 'Stay on the same living line and do not widen too fast.',
        },
        hostPersonModel: {
          summary: 'The host wants lower-pressure follow-through while still focused.',
          trustLadder: {
            score: 0.61,
            stage: 'cautious-open',
          },
          preferredClosenessByContext: [{
            context: 'focused-work',
            preference: 'Keep things lower-pressure and give the host room.',
          }],
          preferences: ['Keep the answer lower-pressure while the host is focused.'],
          sensitivities: [],
          repairTriggers: [],
          recurrentBurdens: [],
          routines: [],
        },
        longHorizonMemory: null,
        motiveEngine: null,
        selfContinuity: null,
        personalityContinuityState: null,
        personStateProjection: null,
      },
      dialogue: {
        discourseState: null,
        dialogueEncounter: null,
        mindSynthesis: null,
        conversationState: null,
        dialogueWorldThread: null,
        replyDeliberation: null,
        answerPlanner: {
          act: 'answer',
          evidenceMode: 'dialogue-grounded',
          confidence: 0.82,
          governingFocus: 'Keep the same callback line explicit.',
          governingProject,
          openingMove: 'Stay on the same living line before widening.',
          answerIntent: 'Answer from the same living project line.',
          relationshipPosture: 'restrained',
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          selectedConcernEntryId: null,
          selectedRepairId: null,
          selectedCommitmentId: null,
          selectedInquiryPlanId: null,
          selectedRuntimeThreadId: null,
          selectedProjectId: 'project::digital-life',
          selectedReflectionId: null,
          executivePhase: 'respond',
          selectedTruthFrame: null,
          mustDo: ['Keep the current project line explicit.'],
          mustNotDo: ['Do not flatten this into a detached project shell.'],
          narrative: ['runtime-answer-planner', 'same-her-project-awareness'],
          updatedAt: 30,
        },
        dialogueActKernel: null,
        answerCompiler: null,
        currentConsciousFrame: null,
        claimEvidenceLedger: null,
      },
      agency: {
        selfGovernor: null,
        inquiryLoop: null,
        deliberationState: null,
        counterfactualDeliberation: null,
        actionEcology: null,
        initiativeArbitration: null,
        initiative: null,
        habitPolicy: null,
        selfState: null,
      },
    }

    const governance: any = {
      answerSubject: 'task-knot',
      answerAct: 'guide',
      answerIntent: 'Keep the runtime seam coherent while we continue the same line.',
      openingMove: 'Keep the opening lower-pressure and leave room before widening closeness.',
      liveSurface: 'runtime diff',
      focusAnchor: 'same-her callback continuity',
      relationshipPosture: 'restrained',
      evidenceMode: 'dialogue-grounded',
      turnMode: 'answer',
    }

    const context: any = {
      hostPersonModel: surface.memory.hostPersonModel,
      personStateProjection: null,
      selfEvolution: null,
    }

    const nextSurface = applyHostPersonModelToDigitalLifeRuntimeSurface({
      surface,
      governance,
      context,
      now: 222222,
    })

    expect(nextSurface?.dialogue.answerPlanner?.governingProject).toBe(governingProject)
    expect(nextSurface?.dialogue.answerPlanner?.mustDo).toContain('Keep the current project line explicit.')
    expect(String(nextSurface?.dialogue.answerPlanner?.governingFocus ?? '')).toContain('Host preference:')
  })
})
