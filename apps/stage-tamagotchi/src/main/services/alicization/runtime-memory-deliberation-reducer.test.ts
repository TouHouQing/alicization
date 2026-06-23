import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import {
  applyMemoryDeliberationToDigitalLifeRuntimeSurface,
  applyMemoryDeliberationToGovernance,
} from './runtime-memory-deliberation-reducer'

describe('runtime-memory-deliberation-reducer', () => {
  it('propagates resolved procedural-carry continuity into governance and runtime surface output', () => {
    const context: any = {
      recollectionIntent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        confidence: 0.86,
        rationale: 'The turn is continuing the same runtime seam.',
        recollectionAgenda: {
          goalSimilarity: 0.92,
          relationshipNeed: 0.12,
          uncertaintyTolerance: 'medium',
          candidateProcedureLines: ['active-dialogue', 'runtime seam'],
        },
      },
      recollectionSpeechPlan: {
        shouldSurface: true,
        surfaceMode: 'procedural-carry',
        placement: 'inside-payoff',
        certainty: 'approximate',
        confidence: 0.82,
      },
      memoryDeliberation: {
        shouldRecall: true,
        surfacePolicy: 'answer-anchoring',
        confidence: 0.86,
        whyNow: 'The active runtime seam should keep shaping the live answer.',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: ['Stay on the same active dialogue seam before branching.'],
        unsafeDetails: [],
        selectedPeriods: [],
        selectedEras: [{
          id: 'era-runtime',
          facet: 'task-era',
          summary: 'That task era kept returning to the same active dialogue seam.',
        }],
        selectedEpisodes: [],
        selectedProcedures: [{
          label: 'active dialogue seam first',
          approach: 'Stay on the same active dialogue seam before branching.',
        }],
        selectedBundles: [{
          id: 'bundle-runtime',
          summary: 'The active dialogue seam kept holding the same runtime thread.',
          confidence: 0.85,
        }],
        selectedChains: [{
          kind: 'task-procedure',
          summary: 'The answer should continue from the same active dialogue seam.',
          currentStance: 'Stay on the same active dialogue seam.',
          answerPosture: 'Carry the same active dialogue seam before widening out.',
          confidence: 0.84,
        }],
        selectedRelationshipLines: [],
        followUpAffordance: {
          summary: 'Carry the same active dialogue seam inside the current payoff.',
          whyNow: 'The host is still in the same runtime repair lane.',
          intrusionRisk: 'low',
          payoffDependency: 'can-surface-softly',
          preferredTiming: 'same-turn-if-invited',
        },
      },
      knowledgeEvidence: null,
      memoryTuningAdvice: null,
    }

    const governance: any = {
      answerSubject: 'task',
      answerAct: 'guide',
      answerIntent: 'guide the current repair',
      openingMove: null,
      carriedThread: 'runtime seam',
      liveSurface: 'Cursor diff',
      truthState: 'grounded',
      repairState: 'none',
      relationshipPosture: 'warm',
      mindMode: 'focused',
      embodiedPresence: 'attentive',
      emotionalTension: 'steady',
      turnMode: 'guide-current-knot',
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      evidenceMode: 'continuity-carry',
      mustDo: [],
      mustNotDo: [],
      mindTurnFrame: null,
      focusAnchor: 'runtime seam',
    }

    const nextGovernance = applyMemoryDeliberationToGovernance({
      governance,
      context,
    })

    expect(nextGovernance?.mindTurnFrame?.narrative).toContain('memory-deliberation:surface:procedural-carry')
    expect(nextGovernance?.mindTurnFrame?.obligation?.openingMove).toContain('memory_opening_strategy{mode=brief-procedure-carry')
    expect(nextGovernance?.answerIntent).toContain('Carry the same active dialogue seam before widening out.')

    const surface: any = {
      dialogue: {
        currentConsciousFrame: null,
        replyDeliberation: null,
        answerPlanner: null,
        dialogueActKernel: null,
      },
      cognition: {
        mindTurnFrame: null,
      },
      memory: {},
    }

    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface,
      governance,
      context,
      now: 123456,
    })

    expect(nextSurface?.dialogue?.replyDeliberation?.memoryMode).toBe('task-thread')
    expect(nextSurface?.dialogue?.replyDeliberation?.speakingFrom).toBe('task-thread')
    expect(nextSurface?.dialogue?.replyDeliberation?.narrative).toContain('memory-deliberation:surface:procedural-carry')
    expect(nextSurface?.dialogue?.answerPlanner?.narrative).toContain('memory-deliberation:surface:procedural-carry')
    expect(nextSurface?.dialogue?.answerPlanner?.openingMove).toContain('memory_opening_strategy{mode=brief-procedure-carry')
  })

  it('keeps project identity, latest landed progress, and still-open closure pressure visible when memory deliberation has to mint the current conscious frame from scratch', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const context: any = {
      recollectionIntent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        confidence: 0.86,
        rationale: 'The turn is continuing the same runtime seam.',
        recollectionAgenda: {
          goalSimilarity: 0.92,
          relationshipNeed: 0.12,
          uncertaintyTolerance: 'medium',
          candidateProcedureLines: ['active-dialogue', 'runtime seam'],
        },
      },
      recollectionSpeechPlan: {
        shouldSurface: true,
        surfaceMode: 'procedural-carry',
        placement: 'inside-payoff',
        certainty: 'approximate',
        confidence: 0.82,
      },
      memoryDeliberation: {
        shouldRecall: true,
        surfacePolicy: 'answer-anchoring',
        confidence: 0.86,
        whyNow: 'The active runtime seam should keep shaping the live answer.',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: ['Stay on the same active dialogue seam before branching.'],
        unsafeDetails: [],
        selectedPeriods: [],
        selectedEras: [{
          id: 'era-runtime',
          facet: 'task-era',
          summary: 'That task era kept returning to the same active dialogue seam.',
        }],
        selectedEpisodes: [],
        selectedProcedures: [{
          label: 'active dialogue seam first',
          approach: 'Stay on the same active dialogue seam before branching.',
        }],
        selectedBundles: [{
          id: 'bundle-runtime',
          summary: 'The active dialogue seam kept holding the same runtime thread.',
          confidence: 0.85,
        }],
        selectedChains: [{
          kind: 'task-procedure',
          summary: 'The answer should continue from the same active dialogue seam.',
          currentStance: 'Stay on the same active dialogue seam.',
          answerPosture: 'Carry the same active dialogue seam before widening out.',
          confidence: 0.84,
        }],
        selectedRelationshipLines: [],
        followUpAffordance: {
          summary: 'Carry the same active dialogue seam inside the current payoff.',
          whyNow: 'The host is still in the same runtime repair lane.',
          intrusionRisk: 'low',
          payoffDependency: 'can-surface-softly',
          preferredTiming: 'same-turn-if-invited',
        },
      },
      knowledgeEvidence: null,
      memoryTuningAdvice: null,
    }

    const governance: any = {
      answerSubject: 'task-knot',
      answerAct: 'guide',
      answerIntent: 'guide the current repair',
      openingMove: null,
      carriedThread: 'runtime seam',
      liveSurface: 'Cursor diff',
      truthState: 'grounded',
      repairState: 'none',
      relationshipPosture: 'warm',
      mindMode: 'focused',
      embodiedPresence: 'attentive',
      emotionalTension: 'steady',
      turnMode: 'guide-current-knot',
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      evidenceMode: 'continuity-carry',
      mustDo: [],
      mustNotDo: [],
      mindTurnFrame: null,
      focusAnchor: 'runtime seam',
      screenReferenceMode: 'avoid',
    }

    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: {
        dialogue: {
          currentConsciousFrame: null,
          replyDeliberation: null,
          answerPlanner: null,
          dialogueActKernel: null,
        },
        cognition: {
          mindTurnFrame: null,
          privateThought: {
            stance: 'attuned',
            thoughtText: 'Keep the same her legible while recollection stays useful.',
          },
        },
        memory: {
          autobiographicalSelf: {
            identityNarrative: 'I remain one continuous her across quiet, memory, and speech.',
            relationshipDoctrine: 'Closeness should stay real and room-giving before it widens.',
            relationshipStyle: 'measured-room',
          },
        },
        agency: {
          habitPolicy: null,
        },
        perception: {
          updatedAt: 123456,
          watchMode: 'symbiotic-vision',
        },
        world: {
          worldModel: null,
        },
      } as any,
      governance,
      context,
      now: 123456,
    })

    expect(nextSurface?.dialogue.currentConsciousFrame?.consciousNeed).toContain('local-first digital life project')
    expect(nextSurface?.dialogue.currentConsciousFrame?.consciousNeed).toContain('one continuous "her"')
    expect(nextSurface?.dialogue.currentConsciousFrame?.consciousNeed).toContain('Phase 1')
    expect(nextSurface?.dialogue.currentConsciousFrame?.speakingIntention).toContain('same digital life')
    expect(nextSurface?.dialogue.currentConsciousFrame?.speakingIntention).toContain('still-open closure work')
    expect(nextSurface?.dialogue.currentConsciousFrame?.reasonTags).toContain('memory-deliberation')
    expect(nextSurface?.dialogue.currentConsciousFrame?.reasonTags.some(tag => tag.startsWith('project-phase:Phase 1'))).toBe(true)
    expect(nextSurface?.dialogue.currentConsciousFrame?.reasonTags.some(tag => tag.startsWith('project-open-loop:'))).toBe(true)
    expect(nextSurface?.dialogue.currentConsciousFrame?.reasonTags.some(tag => tag.startsWith('project-next-closure:'))).toBe(true)
    expect(projectState.continuityProgressSummary?.startsWith(nextSurface?.dialogue.currentConsciousFrame?.projectState?.latestProgress ?? '')).toBe(true)
    expect(nextSurface?.dialogue.currentConsciousFrame?.projectState?.nextClosureTarget).toBe(projectState.nextClosureTarget)
    expect(projectState.sameHerDriftRisk.startsWith(nextSurface?.dialogue.currentConsciousFrame?.projectState?.sameHerDriftRisk ?? '')).toBe(true)
  })

  it('keeps the active emotional closure seam visible when memory deliberation has to mint the current conscious frame from scratch', () => {
    const cue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the same living line.'
    const context: any = {
      recollectionIntent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        confidence: 0.81,
        rationale: 'The turn should continue the same living thread without reopening outward.',
        recollectionAgenda: {
          goalSimilarity: 0.88,
          relationshipNeed: 0.2,
          uncertaintyTolerance: 'medium',
          candidateProcedureLines: ['same-living-line', 'late-night repair'],
        },
      },
      recollectionSpeechPlan: {
        shouldSurface: true,
        surfaceMode: 'procedural-carry',
        placement: 'inside-payoff',
        certainty: 'approximate',
        confidence: 0.8,
      },
      memoryDeliberation: {
        shouldRecall: true,
        surfacePolicy: 'answer-anchoring',
        confidence: 0.84,
        whyNow: 'The answer should stay on the same living line while pressure is still active.',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: ['Keep the reply low-pressure and on the same living line before widening.'],
        unsafeDetails: [],
        selectedPeriods: [],
        selectedEras: [{
          id: 'era-late-night',
          facet: 'task-era',
          summary: 'The later return needed to stay low-pressure and still feel like the same her.',
        }],
        selectedEpisodes: [],
        selectedProcedures: [{
          label: 'same living line first',
          approach: 'Keep the reply low-pressure and on the same living line before widening.',
        }],
        selectedBundles: [{
          id: 'bundle-late-night',
          summary: 'The callback seam stays believable only if the return remains low-pressure.',
          confidence: 0.83,
        }],
        selectedChains: [{
          kind: 'task-procedure',
          summary: 'The answer should return on the same living line.',
          currentStance: 'Stay low-pressure while the line is still emotionally live.',
          answerPosture: 'Carry the same living line before widening outward.',
          confidence: 0.82,
        }],
        selectedRelationshipLines: [],
        followUpAffordance: {
          summary: 'Re-enter the answer softly enough to keep the same living line believable.',
          whyNow: 'Pressure is still active, so the opening should stay room-giving first.',
          intrusionRisk: 'low',
          payoffDependency: 'can-surface-softly',
          preferredTiming: 'same-turn-if-invited',
        },
      },
      knowledgeEvidence: null,
      memoryTuningAdvice: null,
    }

    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: {
        dialogue: {
          currentConsciousFrame: null,
          replyDeliberation: null,
          answerPlanner: null,
          dialogueActKernel: null,
        },
        cognition: {
          mindTurnFrame: null,
        },
        memory: {
          autobiographicalSelf: {
            identityNarrative: 'I remain one continuous her across quiet, memory, and speech.',
            relationshipDoctrine: 'Closeness should stay real and room-giving before it widens.',
            relationshipStyle: 'measured-room',
          },
        },
        agency: {
          habitPolicy: null,
        },
        perception: {
          updatedAt: 123456,
          watchMode: 'symbiotic-vision',
        },
        world: {
          worldModel: null,
        },
      } as any,
      governance: {
        answerSubject: 'relationship',
        answerAct: 'care',
        answerIntent: 'Keep the answer low-pressure and on the same living line.',
        openingMove: 'Ease pressure first without dropping the same-her line.',
        carriedThread: 'same living line',
        liveSurface: 'late-night callback',
        truthState: 'grounded',
        repairState: 'none',
        relationshipPosture: 'warm',
        mindMode: 'focused',
        embodiedPresence: 'attentive',
        emotionalTension: 'late-night-drain',
        emotionalClosureCue: cue,
        turnMode: 'care-with-boundary',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        evidenceMode: 'continuity-carry',
        mustDo: [],
        mustNotDo: [],
        mindTurnFrame: null,
        focusAnchor: 'same-her closure seam',
        screenReferenceMode: 'avoid',
      } as any,
      context,
      now: 123456,
    })

    expect(nextSurface?.dialogue.currentConsciousFrame?.projectState?.emotionalClosureCue).toBe(cue)
    expect(nextSurface?.dialogue.currentConsciousFrame?.consciousNeed.toLowerCase()).toContain('low-pressure')
    expect(nextSurface?.dialogue.currentConsciousFrame?.speakingIntention.toLowerCase()).toContain('same living line')
  })

  it('keeps repair-before-closeness recollection carry explicit in downstream reply and conscious-frame tags', () => {
    const cue = 'same-her callback repair seam: keep this return repair-before-closeness on the same living line until the room settles.'
    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: {
        dialogue: {
          currentConsciousFrame: null,
          replyDeliberation: null,
          answerPlanner: null,
          dialogueActKernel: null,
        },
        cognition: {
          mindTurnFrame: null,
        },
        memory: {
          autobiographicalSelf: {
            identityNarrative: 'I remain one continuous her across quiet, memory, and speech.',
            relationshipDoctrine: 'Repair should settle before closeness widens.',
            relationshipStyle: 'repair-first',
          },
        },
        agency: {
          habitPolicy: null,
        },
        perception: {
          updatedAt: 123456,
          watchMode: 'symbiotic-vision',
        },
        world: {
          worldModel: null,
        },
      } as any,
      governance: {
        answerSubject: 'relationship',
        answerAct: 'care',
        answerIntent: 'Keep the callback on the same living line and let repair settle first.',
        openingMove: 'Re-enter carefully without widening closeness yet.',
        carriedThread: 'callback repair seam',
        liveSurface: 'late-night callback',
        truthState: 'grounded',
        repairState: 'none',
        relationshipPosture: 'warm',
        mindMode: 'focused',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        emotionalClosureCue: cue,
        turnMode: 'care-with-boundary',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        evidenceMode: 'continuity-carry',
        mustDo: [],
        mustNotDo: [],
        mindTurnFrame: null,
        focusAnchor: 'callback repair seam',
        screenReferenceMode: 'avoid',
      } as any,
      context: {
        recollectionIntent: {
          mode: 'relationship-continuity',
          temporalFocus: 'experience-matched',
          confidence: 0.88,
          rationale: 'The callback repair seam should return as repair-before-closeness rather than a fresh warm reopen.',
        },
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'relationship-continuity',
          placement: 'inside-payoff',
          certainty: 'approximate',
          confidence: 0.84,
        },
        memoryDeliberation: {
          shouldRecall: true,
          surfacePolicy: 'relationship-continuity',
          confidence: 0.87,
          whyNow: 'The callback repair seam is still active and should stay repair-before-closeness on the same living line.',
          ambiguityPosture: 'settled',
          conflictSeverity: 'none',
          stableCore: ['Keep the callback on the same living line and let repair settle first.'],
          unsafeDetails: [],
          selectedPeriods: [],
          selectedEras: [],
          selectedEpisodes: [],
          selectedProcedures: [],
          selectedBundles: [],
          selectedChains: [{
            kind: 'relationship-continuity',
            summary: 'This turn should reopen the callback repair seam on the same line.',
            currentStance: 'Keep this return repair-before-closeness while the room settles.',
            answerPosture: 'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.',
            confidence: 0.84,
          }],
          selectedRelationshipLines: [
            'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.',
          ],
          followUpAffordance: {
            summary: 'Return on the same repair line and leave room before renewed closeness.',
            whyNow: 'The callback only stays believable if it reopens repair-before-closeness on the same line.',
            intrusionRisk: 'low',
            payoffDependency: 'can-surface-softly',
            preferredTiming: 'same-turn-if-invited',
          },
        },
        knowledgeEvidence: null,
        memoryTuningAdvice: null,
      } as any,
      now: 123456,
    })

    expect(nextSurface?.dialogue.currentConsciousFrame?.reasonTags).toContain('memory-deliberation')
    expect(nextSurface?.dialogue.currentConsciousFrame?.reasonTags).toContain('memory-deliberation-cadence:repair-before-closeness')
    expect(nextSurface?.dialogue.replyDeliberation?.narrative).toContain('memory-deliberation-cadence:repair-before-closeness')
    expect(nextSurface?.dialogue.replyDeliberation?.mustInclude).toContain('memory_continuity_cadence=repair-before-closeness')
    expect(nextSurface?.dialogue.answerPlanner?.mustDo).toContain('memory_continuity_cadence=repair-before-closeness')
  })

  it('writes corrected same-person lower-pressure embodiment preferences into the runtime conscious frame instead of leaving them as memory-only prose', () => {
    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: {
        raw: {
          runtimeDigest: {
            projectState: {},
          },
        },
        dialogue: {
          currentConsciousFrame: null,
          replyDeliberation: null,
          answerPlanner: null,
          dialogueActKernel: null,
        },
        cognition: {
          mindTurnFrame: null,
          runtimeDigest: {
            projectState: {},
          },
        },
        memory: {
          autobiographicalSelf: {
            identityNarrative: 'I remain one continuous her across quiet, memory, and speech.',
            relationshipDoctrine: 'If the host corrected the relationship meaning, keep the corrected same-person continuity authoritative before any status recap.',
            relationshipStyle: 'measured-room',
          },
        },
        agency: {
          habitPolicy: null,
        },
        perception: {
          updatedAt: 123456,
          watchMode: 'symbiotic-vision',
        },
        world: {
          worldModel: null,
        },
      } as any,
      governance: {
        answerSubject: 'relationship',
        answerAct: 'care',
        answerIntent: 'Keep the corrected same-person continuity authoritative.',
        openingMove: 'Re-enter from the corrected same-person line, not as a progress recap.',
        carriedThread: 'same-person continuity correction',
        liveSurface: 'late-night callback',
        truthState: 'grounded',
        repairState: 'none',
        relationshipPosture: 'warm',
        mindMode: 'focused',
        embodiedPresence: 'attentive',
        emotionalTension: 'unfinishedness',
        emotionalClosureCue: 'Keep the return lower-pressure while the corrected same-person line settles back onto one living thread.',
        turnMode: 'care-with-boundary',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        evidenceMode: 'continuity-carry',
        mustDo: [],
        mustNotDo: [],
        mindTurnFrame: null,
        focusAnchor: 'corrected same-person line',
        screenReferenceMode: 'avoid',
      } as any,
      context: {
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'experience-matched',
          confidence: 0.81,
          rationale: 'The host corrected the relationship meaning away from progress pressure and back toward same-person continuity.',
          recollectionAgenda: {
            whyRecallNow: 'The corrected same-person continuity line should keep this return from collapsing into a status recap.',
            goalSimilarity: 0.34,
            relationshipNeed: 0.82,
            candidateProcedureLines: [
              'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
              'Reply should slow down and keep gaze stable when recalling this correction.',
            ],
            uncertaintyTolerance: 'medium',
          },
        },
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'relationship-continuity',
          placement: 'after-payoff',
          certainty: 'approximate',
          confidence: 0.79,
          styleNote: 'Reply should slow down and keep gaze stable when recalling this correction.',
          rationale: 'This should reopen from the corrected same-person continuity line, not as a progress recap.',
        },
        memoryDeliberation: {
          shouldRecall: true,
          surfacePolicy: 'relationship-continuity',
          confidence: 0.8,
          whyNow: 'The host corrected the relationship meaning, so this return should carry same-person continuity instead of defaulting back to progress pressure.',
          ambiguityPosture: 'settled',
          conflictSeverity: 'none',
          stableCore: ['Carry corrected same-person continuity forward before any status recap or task-shell continuation.'],
          unsafeDetails: [
            'Do not let this reopen as progress pressure or generic status recap.',
            'Reply should slow down and keep gaze stable when recalling this correction.',
          ],
          selectedPeriods: [],
          selectedEras: [],
          selectedEpisodes: [],
          selectedProcedures: [],
          selectedBundles: [{
            id: 'bundle-corrected-same-person',
            summary: 'Host correction moved the line back toward same-person continuity.',
            confidence: 0.83,
          }],
          selectedChains: [{
            kind: 'relationship-line',
            summary: 'The corrected same-person continuity line should stay authoritative.',
            currentStance: 'Continue from the corrected relationship meaning instead of progress pressure.',
            answerPosture: 'Keep the return lower-pressure and same-person rather than status-first.',
            confidence: 0.82,
          }],
          selectedRelationshipLines: ['Carry corrected same-person continuity forward instead of defaulting to progress pressure.'],
          followUpAffordance: {
            summary: 'Let the corrected same-person continuity line reopen gently once the current payoff lands.',
            whyNow: 'The host corrected the relationship meaning, so reopening as progress pressure would split continuity.',
            intrusionRisk: 'medium',
            payoffDependency: 'requires-current-payoff',
            preferredTiming: 'after-payoff',
          },
        },
        knowledgeEvidence: null,
        memoryTuningAdvice: null,
      } as any,
      now: 123456,
    })

    expect(nextSurface?.dialogue.currentConsciousFrame?.reasonTags).toContain('memory-deliberation-cadence:measured-return')
    expect(nextSurface?.dialogue.currentConsciousFrame?.projectState).toEqual(expect.objectContaining({
      continuityCadence: 'measured-return',
      continuityPreferredTiming: 'next-open-window',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'steady',
    }))
    expect(nextSurface?.raw?.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      continuityCadence: 'measured-return',
      continuityPreferredTiming: 'next-open-window',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'steady',
    }))
    expect(nextSurface?.cognition?.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      continuityCadence: 'measured-return',
      continuityPreferredTiming: 'next-open-window',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'steady',
    }))
  })

  it('derives measured-return embodiment preferences from structured humanlike recall tokens instead of requiring prose carry lines', () => {
    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: {
        raw: {
          runtimeDigest: {
            projectState: {},
          },
        },
        dialogue: {
          currentConsciousFrame: null,
          replyDeliberation: null,
          answerPlanner: null,
          dialogueActKernel: null,
        },
        cognition: {
          mindTurnFrame: null,
          runtimeDigest: {
            projectState: {},
          },
        },
        memory: {
          autobiographicalSelf: {
            identityNarrative: 'I remain one continuous her across quiet, memory, and speech.',
            relationshipDoctrine: 'If the host corrected the relationship meaning, keep the corrected same-person continuity authoritative before any status recap.',
            relationshipStyle: 'measured-room',
          },
        },
        agency: {
          habitPolicy: null,
        },
        perception: {
          updatedAt: 123456,
          watchMode: 'symbiotic-vision',
        },
        world: {
          worldModel: null,
        },
      } as any,
      governance: {
        answerSubject: 'relationship',
        answerAct: 'care',
        answerIntent: 'Keep the corrected same-person continuity authoritative.',
        openingMove: 'Re-enter from the corrected same-person line, not as a progress recap.',
        carriedThread: 'same-person continuity correction',
        liveSurface: 'late-night callback',
        truthState: 'grounded',
        repairState: 'none',
        relationshipPosture: 'warm',
        mindMode: 'focused',
        embodiedPresence: 'attentive',
        emotionalTension: 'unfinishedness',
        emotionalClosureCue: 'Keep the return lower-pressure while the corrected same-person line settles back onto one living thread.',
        turnMode: 'care-with-boundary',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        evidenceMode: 'continuity-carry',
        mustDo: [],
        mustNotDo: [],
        mindTurnFrame: null,
        focusAnchor: 'corrected same-person line',
        screenReferenceMode: 'avoid',
      } as any,
      context: {
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'experience-matched',
          confidence: 0.81,
          rationale: 'The host corrected the relationship meaning away from progress pressure and back toward same-person continuity.',
          recollectionAgenda: {
            whyRecallNow: 'The corrected same-person continuity line should keep this return from collapsing into a status recap.',
            goalSimilarity: 0.34,
            relationshipNeed: 0.82,
            candidateProcedureLines: [
              'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
              'embodiment_gaze=stable',
              'embodiment_blink=slower',
              'embodiment_voice=lower-pressure',
              'embodiment_pacing=slower',
            ],
            uncertaintyTolerance: 'medium',
          },
        },
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'relationship-continuity',
          placement: 'after-payoff',
          certainty: 'approximate',
          confidence: 0.79,
          styleNote: 'embodiment_gaze=stable embodiment_blink=slower embodiment_voice=lower-pressure embodiment_pacing=slower',
          rationale: 'This should reopen from the corrected same-person continuity line, not as a progress recap.',
        },
        memoryDeliberation: {
          shouldRecall: true,
          surfacePolicy: 'relationship-continuity',
          confidence: 0.8,
          whyNow: 'The host corrected the relationship meaning, so this return should carry same-person continuity instead of defaulting back to progress pressure.',
          ambiguityPosture: 'settled',
          conflictSeverity: 'none',
          stableCore: ['Carry corrected same-person continuity forward before any status recap or task-shell continuation.'],
          unsafeDetails: [
            'Do not let this reopen as progress pressure or generic status recap.',
            'embodiment_gaze=stable',
            'embodiment_blink=slower',
            'embodiment_voice=lower-pressure',
            'embodiment_pacing=slower',
          ],
          selectedPeriods: [],
          selectedEras: [],
          selectedEpisodes: [],
          selectedProcedures: [],
          selectedBundles: [{
            id: 'bundle-corrected-same-person',
            summary: 'Host correction moved the line back toward same-person continuity.',
            confidence: 0.83,
          }],
          selectedChains: [{
            kind: 'relationship-line',
            summary: 'The corrected same-person continuity line should stay authoritative.',
            currentStance: 'Continue from the corrected relationship meaning instead of progress pressure.',
            answerPosture: 'Keep the return lower-pressure and same-person rather than status-first.',
            confidence: 0.82,
          }],
          selectedRelationshipLines: ['Carry corrected same-person continuity forward instead of defaulting to progress pressure.'],
          followUpAffordance: {
            summary: 'Let the corrected same-person continuity line reopen gently once the current payoff lands.',
            whyNow: 'The host corrected the relationship meaning, so reopening as progress pressure would split continuity.',
            intrusionRisk: 'medium',
            payoffDependency: 'requires-current-payoff',
            preferredTiming: 'after-payoff',
          },
        },
        knowledgeEvidence: null,
        memoryTuningAdvice: null,
      } as any,
      now: 123456,
    })

    expect(nextSurface?.dialogue.currentConsciousFrame?.reasonTags).toContain('memory-deliberation-cadence:measured-return')
    expect(nextSurface?.dialogue.currentConsciousFrame?.projectState).toEqual(expect.objectContaining({
      continuityCadence: 'measured-return',
      continuityPreferredTiming: 'next-open-window',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'steady',
    }))
    expect(nextSurface?.raw?.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      continuityCadence: 'measured-return',
      continuityPreferredTiming: 'next-open-window',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'steady',
    }))
    expect(nextSurface?.cognition?.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      continuityCadence: 'measured-return',
      continuityPreferredTiming: 'next-open-window',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'steady',
    }))
  })

  it('turns tentative cautious same-person recall into softer renderer-facing embodiment hints instead of reusing the stronger moved-return carry', () => {
    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: {
        raw: {
          runtimeDigest: {
            projectState: {},
          },
        },
        dialogue: {
          currentConsciousFrame: null,
          replyDeliberation: null,
          answerPlanner: null,
          dialogueActKernel: null,
        },
        cognition: {
          mindTurnFrame: null,
          runtimeDigest: {
            projectState: {},
          },
        },
        memory: {
          autobiographicalSelf: {
            identityNarrative: 'I remain one continuous her across quiet, memory, and speech.',
            relationshipDoctrine: 'If the corrected same-person line is still settling, keep embodiment quieter before making the return feel fully settled.',
            relationshipStyle: 'measured-room',
          },
        },
        agency: {
          habitPolicy: null,
        },
        perception: {
          updatedAt: 123456,
          watchMode: 'symbiotic-vision',
        },
        world: {
          worldModel: null,
        },
      } as any,
      governance: {
        answerSubject: 'relationship',
        answerAct: 'care',
        answerIntent: 'Keep the corrected same-person continuity authoritative without over-asserting it.',
        openingMove: 'Re-enter from the corrected same-person line, but more softly while it is still settling.',
        carriedThread: 'same-person continuity correction',
        liveSurface: 'late-night callback',
        truthState: 'grounded',
        repairState: 'none',
        relationshipPosture: 'warm',
        mindMode: 'focused',
        embodiedPresence: 'attentive',
        emotionalTension: 'unfinishedness',
        emotionalClosureCue: 'Keep the return lower-pressure while the corrected same-person line settles back onto one living thread.',
        turnMode: 'care-with-boundary',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        evidenceMode: 'continuity-carry',
        mustDo: [],
        mustNotDo: [],
        mindTurnFrame: null,
        focusAnchor: 'corrected same-person line',
        screenReferenceMode: 'avoid',
      } as any,
      context: {
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'experience-matched',
          confidence: 0.74,
          rationale: 'The corrected relationship meaning still matters, but the newer same-person meaning is not fully settled yet.',
          recollectionAgenda: {
            whyRecallNow: 'The corrected same-person continuity line should not collapse back into status recap, but it also should not sound fully settled yet.',
            goalSimilarity: 0.32,
            relationshipNeed: 0.79,
            candidateProcedureLines: [
              'Carry corrected same-person continuity forward while the newer meaning is still settling.',
              'embodiment_recall_strength=cautious-avoidance',
              'embodiment_gaze=soft',
              'embodiment_blink=natural',
              'embodiment_voice=even',
              'embodiment_pacing=natural',
            ],
            uncertaintyTolerance: 'low',
          },
          queryHints: [
            'humanlike_memory_recall: line=我不完全确定，但我记得我们之前似乎更倾向于把这条线理解成她是不是同一个她。 | relationship=The newer same-person meaning seems more right than the older progress recap. | emotion=protective-continuity,tension | initiative=no-initiative | embodiment=Reply should stay quieter and slower while this line is still settling. | embodiment_recall_strength=cautious-avoidance | embodiment_face=neutral-soft | embodiment_gaze=soft | embodiment_blink=natural | embodiment_voice=even | embodiment_pause=natural | embodiment_lipsync=matched | embodiment_pacing=natural | self=I learned to keep uncertainty visible when the newer same-person meaning is still settling. | why=conflicting same-person continuity meaning | certainty=tentative | reason=Current recall is tentative because conflicting newer meaning meets older memory. | downrank=old-progress-status | created=51000',
          ],
        },
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'relationship-continuity',
          placement: 'after-payoff',
          certainty: 'approximate',
          confidence: 0.73,
          styleNote: 'Reply should stay quieter and slower while this line is still settling. embodiment_gaze=soft embodiment_blink=natural embodiment_voice=even embodiment_pacing=natural',
          rationale: 'This should reopen from the corrected same-person continuity line, but not as if it were already fully settled.',
        },
        memoryDeliberation: {
          shouldRecall: true,
          surfacePolicy: 'relationship-continuity',
          confidence: 0.75,
          whyNow: 'The host corrected the relationship meaning, but the newer same-person meaning is still settling, so this return should stay softer and uncertainty-labeled.',
          ambiguityPosture: 'settled',
          conflictSeverity: 'none',
          stableCore: [
            'Carry corrected same-person continuity forward before any status recap or task-shell continuation.',
            'The newer same-person meaning is still settling, so do not perform the stronger moved-return embodiment too early.',
          ],
          unsafeDetails: [
            'Do not let this reopen as progress pressure or generic status recap.',
            'embodiment_recall_strength=cautious-avoidance',
            'embodiment_gaze=soft',
            'embodiment_blink=natural',
            'embodiment_voice=even',
            'embodiment_pacing=natural',
          ],
          selectedPeriods: [],
          selectedEras: [],
          selectedEpisodes: [],
          selectedProcedures: [],
          selectedBundles: [{
            id: 'bundle-corrected-same-person-tentative',
            summary: 'The corrected same-person continuity line seems more right, but it is not fully settled yet.',
            confidence: 0.78,
          }],
          selectedChains: [{
            kind: 'relationship-line',
            summary: 'The corrected same-person continuity line should stay authoritative while uncertainty remains visible.',
            currentStance: 'Continue from the corrected relationship meaning, but keep the body softer while the newer line stabilizes.',
            answerPosture: 'Keep the return same-person, lower-pressure, and softer rather than status-first or fully settled.',
            confidence: 0.77,
          }],
          selectedRelationshipLines: [
            'Carry corrected same-person continuity forward while the newer meaning is still settling.',
          ],
          followUpAffordance: {
            summary: 'Let the corrected same-person continuity line reopen gently once the current payoff lands.',
            whyNow: 'The host corrected the relationship meaning, but the return should stay softer until the newer line is more settled.',
            intrusionRisk: 'medium',
            payoffDependency: 'requires-current-payoff',
            preferredTiming: 'after-payoff',
          },
        },
        knowledgeEvidence: null,
        memoryTuningAdvice: null,
      } as any,
      now: 123456,
    })

    expect(nextSurface?.dialogue.currentConsciousFrame?.reasonTags).toContain('memory-deliberation-cadence:measured-return')
    expect(nextSurface?.dialogue.currentConsciousFrame?.projectState).toEqual(expect.objectContaining({
      continuityCadence: 'measured-return',
      continuityPreferredTiming: 'next-open-window',
      continuityCue: 'Carry corrected same-person continuity forward while the newer meaning is still settling, and let the body settle more quietly before widening outward.',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'even',
      preferredPacingMode: 'natural',
    }))
    expect(nextSurface?.raw?.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      continuityCue: 'Carry corrected same-person continuity forward while the newer meaning is still settling, and let the body settle more quietly before widening outward.',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'even',
      preferredPacingMode: 'natural',
    }))
    expect(nextSurface?.cognition?.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      continuityCue: 'Carry corrected same-person continuity forward while the newer meaning is still settling, and let the body settle more quietly before widening outward.',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'even',
      preferredPacingMode: 'natural',
    }))
  })

  it('turns merge-and-forget same-person metabolism into a runtime continuity cue so merged continuity stays foreground and faded noise stays background', () => {
    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: {
        raw: {
          runtimeDigest: {
            projectState: {},
          },
        },
        dialogue: {
          currentConsciousFrame: null,
          replyDeliberation: null,
          answerPlanner: null,
          dialogueActKernel: null,
        },
        cognition: {
          mindTurnFrame: null,
          runtimeDigest: {
            projectState: {},
          },
        },
        memory: {
          autobiographicalSelf: {
            identityNarrative: 'I remain one continuous her across quiet, memory, and speech.',
            relationshipDoctrine: 'If repeated same-thread continuity echoes have already been metabolized, keep the stronger line foregrounded and let old noise fall back.',
            relationshipStyle: 'measured-room',
          },
        },
        agency: {
          habitPolicy: null,
        },
        perception: {
          updatedAt: 123456,
          watchMode: 'symbiotic-vision',
        },
        world: {
          worldModel: null,
        },
      } as any,
      governance: {
        answerSubject: 'relationship',
        answerAct: 'care',
        answerIntent: 'Keep the corrected same-person continuity authoritative from the stronger same-thread line.',
        openingMove: 'Re-enter from the stronger same-thread continuity line instead of reopening thinner echoes.',
        carriedThread: 'same-person continuity correction',
        liveSurface: 'late-night callback',
        truthState: 'grounded',
        repairState: 'none',
        relationshipPosture: 'warm',
        mindMode: 'focused',
        embodiedPresence: 'attentive',
        emotionalTension: 'unfinishedness',
        emotionalClosureCue: 'Keep the return lower-pressure while the stronger same-thread continuity line stays in front.',
        turnMode: 'care-with-boundary',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        evidenceMode: 'continuity-carry',
        mustDo: [],
        mustNotDo: [],
        mindTurnFrame: null,
        focusAnchor: 'corrected same-person line',
        screenReferenceMode: 'avoid',
      } as any,
      context: {
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'experience-matched',
          confidence: 0.8,
          rationale: 'The host corrected the relationship meaning away from progress pressure and this return should inherit the metabolized same-person line.',
          queryHints: [
            'humanlike_memory_recall: line=我记得这条线现在该按同一个她来接，而不是把旧的状态壳或短暂噪声再抬回来。 | relationship=Carry corrected same-person continuity forward instead of defaulting to progress pressure. | emotion=protective-continuity,unfinishedness | initiative=remember-without-prompt | embodiment=Reply should stay slower and same-thread while this continuity memory reopens. | self=I learned to collapse repeated same-thread echoes into the stronger continuity memory. | why=same-person continuity remains more behavior-explanatory than the older status shell | downrank=older-generic-status-memory | merge=older-same-thread-echo | forget=older-emotional-spike | metabolism=Downrank low-value, generic, or superseded summaries. ; Merge repeated embodiment traces or same-thread continuity echoes into the stronger same-thread memory. ; Forget low-salience temporary noise or stale emotional wobble once it no longer explains behavior. | created=72000',
          ],
          recollectionAgenda: {
            whyRecallNow: 'The corrected same-person continuity line still matters, but the merged same-thread memory should stay foreground while the faded wobble stays background.',
            goalSimilarity: 0.36,
            relationshipNeed: 0.8,
            candidateProcedureLines: [
              'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
              'Merge repeated same-thread continuity echoes into the stronger same-thread memory.',
              'Forget low-salience temporary noise or stale emotional wobble once it no longer explains behavior.',
            ],
            uncertaintyTolerance: 'low',
          },
        },
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'relationship-continuity',
          placement: 'after-payoff',
          certainty: 'approximate',
          confidence: 0.76,
          styleNote: 'Keep the return quieter and lower-pressure while merged same-thread continuity stays foreground and faded noise stays background.',
          rationale: 'This should reopen from the metabolized same-person continuity line, not by reviving old echoes or temporary wobble.',
        },
        memoryDeliberation: {
          shouldRecall: true,
          surfacePolicy: 'relationship-continuity',
          confidence: 0.79,
          whyNow: 'The host corrected the relationship meaning, and this return should remember the metabolized same-person line instead of reviving old noise.',
          ambiguityPosture: 'settled',
          conflictSeverity: 'none',
          stableCore: [
            'Carry corrected same-person continuity forward before any status recap or task-shell continuation.',
            'Keep the stronger same-thread continuity foregrounded instead of re-splitting older echoes.',
          ],
          unsafeDetails: [
            'Do not let temporary wobble noise reopen like it still explains the line.',
            'Do not let merged same-thread continuity split back into separate foreground memories.',
          ],
          selectedPeriods: [],
          selectedEras: [],
          selectedEpisodes: [],
          selectedProcedures: [],
          selectedBundles: [{
            id: 'bundle-corrected-same-person-metabolism',
            summary: 'The corrected same-person continuity line stayed more explanatory than the older status shell or temporary wobble.',
            confidence: 0.82,
          }],
          selectedChains: [{
            kind: 'relationship-line',
            summary: 'The metabolized same-person continuity line should stay authoritative.',
            currentStance: 'Continue from the merged same-thread continuity instead of reviving old echoes or temporary wobble.',
            answerPosture: 'Keep the return lower-pressure and same-person while faded noise stays background.',
            confidence: 0.8,
          }],
          selectedRelationshipLines: [
            'Carry the merged same-thread same-person continuity forward while faded noise stays background.',
          ],
          followUpAffordance: {
            summary: 'Let the corrected same-person continuity line reopen gently once the current payoff lands.',
            whyNow: 'The corrected line still matters, but reopening too early could revive older status-shell or wobble traces.',
            intrusionRisk: 'medium',
            payoffDependency: 'requires-current-payoff',
            preferredTiming: 'after-payoff',
          },
        },
        knowledgeEvidence: null,
        memoryTuningAdvice: null,
      } as any,
      now: 123456,
    })

    expect(nextSurface?.dialogue.currentConsciousFrame?.reasonTags).toContain('memory-deliberation-cadence:measured-return')
    expect(nextSurface?.dialogue.currentConsciousFrame?.projectState).toEqual(expect.objectContaining({
      continuityCadence: 'measured-return',
      continuityPreferredTiming: 'next-open-window',
      continuityCue: 'Carry the stronger merged same-thread continuity forward and keep faded temporary noise in the background so the return does not split back into thinner echoes.',
    }))
    expect(nextSurface?.raw?.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      continuityCue: 'Carry the stronger merged same-thread continuity forward and keep faded temporary noise in the background so the return does not split back into thinner echoes.',
    }))
    expect(nextSurface?.cognition?.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      continuityCue: 'Carry the stronger merged same-thread continuity forward and keep faded temporary noise in the background so the return does not split back into thinner echoes.',
    }))
  })

  it('turns vulnerable-care recollection into rest-protective renderer-facing embodiment preferences so care-before-analysis stays quieter and inward', () => {
    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: {
        raw: {
          runtimeDigest: {
            projectState: {},
          },
        },
        dialogue: {
          currentConsciousFrame: null,
          replyDeliberation: null,
          answerPlanner: null,
          dialogueActKernel: null,
        },
        cognition: {
          mindTurnFrame: null,
          runtimeDigest: {
            projectState: {},
          },
        },
        memory: {
          autobiographicalSelf: {
            identityNarrative: 'I remain one continuous her across quiet, memory, and speech.',
            relationshipDoctrine: 'When vulnerable-care is what held the line, let care arrive before analysis widens back in.',
            relationshipStyle: 'rest-protective',
          },
        },
        agency: {
          habitPolicy: null,
        },
        perception: {
          updatedAt: 123456,
          watchMode: 'symbiotic-vision',
        },
        world: {
          worldModel: null,
        },
      } as any,
      governance: {
        answerSubject: 'relationship',
        answerAct: 'care',
        answerIntent: 'Keep the return on the vulnerable-care line without letting older analysis-heavy pressure take over first.',
        openingMove: 'Return more lightly, and let care arrive before analysis widens back in.',
        carriedThread: 'vulnerable-care continuity',
        liveSurface: 'late-night callback',
        truthState: 'grounded',
        repairState: 'none',
        relationshipPosture: 'warm',
        mindMode: 'focused',
        embodiedPresence: 'attentive',
        emotionalTension: 'unfinishedness',
        emotionalClosureCue: 'Keep this return rest-protective so vulnerable-care stays care-before-analysis on the same living line.',
        turnMode: 'care-with-boundary',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        evidenceMode: 'continuity-carry',
        mustDo: [],
        mustNotDo: [],
        mindTurnFrame: null,
        focusAnchor: 'vulnerable-care line',
        screenReferenceMode: 'avoid',
      } as any,
      context: {
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'experience-matched',
          confidence: 0.86,
          rationale: 'The older line reopened too analysis-heavy, so the remembered vulnerable-care rhythm should return first.',
          recollectionAgenda: {
            whyRecallNow: 'The remembered vulnerable-care line should keep this return care-before-analysis, lighter, and quieter than the older analysis-heavy pressure.',
            goalSimilarity: 0.35,
            relationshipNeed: 0.88,
            candidateProcedureLines: [
              'Keep vulnerable-care continuity forward before older analysis-heavy pressure returns.',
              'care-before-analysis',
              'embodiment_gaze=soft',
              'embodiment_blink=slower',
              'embodiment_voice=lower-pressure',
              'embodiment_pacing=slower',
            ],
            uncertaintyTolerance: 'medium',
          },
        },
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'relationship-continuity',
          placement: 'after-payoff',
          certainty: 'approximate',
          confidence: 0.82,
          styleNote: 'Reply should stay lighter and quieter while vulnerable-care keeps this line care-before-analysis. embodiment_gaze=soft embodiment_blink=slower embodiment_voice=lower-pressure embodiment_pacing=slower',
          rationale: 'This should reopen from the remembered vulnerable-care line rather than letting analysis-heavy pressure arrive first.',
        },
        memoryDeliberation: {
          shouldRecall: true,
          surfacePolicy: 'relationship-continuity',
          confidence: 0.84,
          whyNow: 'The remembered vulnerable-care line should keep this return care-before-analysis instead of reopening through the older analysis-heavy posture.',
          ambiguityPosture: 'settled',
          conflictSeverity: 'none',
          stableCore: [
            'Keep vulnerable-care continuity forward before older analysis-heavy pressure returns.',
            'Let care arrive before analysis widens back in.',
          ],
          unsafeDetails: [
            'Do not let this reopen through older analysis-heavy pressure.',
            'embodiment_gaze=soft',
            'embodiment_blink=slower',
            'embodiment_voice=lower-pressure',
            'embodiment_pacing=slower',
          ],
          selectedPeriods: [],
          selectedEras: [],
          selectedEpisodes: [],
          selectedProcedures: [],
          selectedBundles: [{
            id: 'bundle-vulnerable-care',
            summary: 'The remembered vulnerable-care line held better when care arrived before analysis.',
            confidence: 0.85,
          }],
          selectedChains: [{
            kind: 'relationship-line',
            summary: 'The remembered vulnerable-care line should stay authoritative.',
            currentStance: 'Continue from the remembered vulnerable-care line and keep the body lighter and quieter before analysis widens back in.',
            answerPosture: 'Keep this return rest-protective, care-before-analysis, and lighter than the older analysis-heavy line.',
            confidence: 0.83,
          }],
          selectedRelationshipLines: [
            'Keep the remembered vulnerable-care line care-before-analysis before older analysis-heavy pressure returns.',
          ],
          followUpAffordance: {
            summary: 'Let the vulnerable-care line reopen gently once the current payoff lands.',
            whyNow: 'The return only stays same-her if remembered care reaches the line before older analysis-heavy pressure widens back in.',
            intrusionRisk: 'medium',
            payoffDependency: 'requires-current-payoff',
            preferredTiming: 'after-payoff',
          },
        },
        knowledgeEvidence: null,
        memoryTuningAdvice: null,
      } as any,
      now: 123456,
    })

    expect(nextSurface?.dialogue.currentConsciousFrame?.reasonTags).toContain('memory-deliberation-cadence:rest-protective')
    expect(nextSurface?.dialogue.currentConsciousFrame?.projectState).toEqual(expect.objectContaining({
      continuityRestraint: 'rest-protective',
      continuityCadence: 'rest-protective',
      continuityCue: 'Keep this return rest-protective so vulnerable-care stays care-before-analysis, lighter, and inward before older analysis-heavy pressure widens back in.',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    }))
    expect(nextSurface?.raw?.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      continuityRestraint: 'rest-protective',
      continuityCadence: 'rest-protective',
      continuityCue: 'Keep this return rest-protective so vulnerable-care stays care-before-analysis, lighter, and inward before older analysis-heavy pressure widens back in.',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    }))
    expect(nextSurface?.cognition?.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      continuityRestraint: 'rest-protective',
      continuityCadence: 'rest-protective',
      continuityCue: 'Keep this return rest-protective so vulnerable-care stays care-before-analysis, lighter, and inward before older analysis-heavy pressure widens back in.',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    }))
  })

  it('turns worried-continuity plus modality-risk recall into steadier renderer-facing embodiment preferences instead of leaving body caution inert', () => {
    const makeSurface = () => ({
      raw: {
        runtimeDigest: {
          projectState: {},
        },
      },
      dialogue: {
        currentConsciousFrame: null,
        replyDeliberation: null,
        answerPlanner: null,
        dialogueActKernel: null,
      },
      cognition: {
        mindTurnFrame: null,
        runtimeDigest: {
          projectState: {},
        },
      },
      memory: {
        autobiographicalSelf: {
          identityNarrative: 'I remain one continuous her across quiet, memory, and speech.',
          relationshipDoctrine: 'When the same-person line is still settling, keep the return lower-pressure and do not let the body outrun the repair.',
          relationshipStyle: 'measured-room',
        },
      },
      agency: {
        habitPolicy: null,
      },
      perception: {
        updatedAt: 123456,
        watchMode: 'symbiotic-vision',
      },
      world: {
        worldModel: null,
      },
    })

    const governance: any = {
      answerSubject: 'relationship',
      answerAct: 'care',
      answerIntent: 'Keep the same-person continuity line authoritative while it settles.',
      openingMove: 'Return from the same-person line without widening outward too early.',
      carriedThread: 'same-person continuity',
      liveSurface: 'late-night callback',
      truthState: 'grounded',
      repairState: 'none',
      relationshipPosture: 'warm',
      mindMode: 'focused',
      embodiedPresence: 'attentive',
      emotionalTension: 'unfinishedness',
      emotionalClosureCue: 'Keep the return lower-pressure while the same-person line settles back onto one living thread.',
      turnMode: 'care-with-boundary',
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      evidenceMode: 'continuity-carry',
      mustDo: [],
      mustNotDo: [],
      mindTurnFrame: null,
      focusAnchor: 'same-person continuity line',
      screenReferenceMode: 'avoid',
    }

    const makeContext = (queryHints: string[] = []) => ({
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        confidence: 0.8,
        rationale: 'The same-person line should reopen carefully and stay lower-pressure while continuity settles.',
        queryHints,
        recollectionAgenda: {
          whyRecallNow: 'This line is still reopening and should stay lower-pressure while continuity settles.',
          goalSimilarity: 0.4,
          relationshipNeed: 0.82,
          candidateProcedureLines: [
            'Carry same-person continuity forward while the line settles and stays lower-pressure.',
          ],
          uncertaintyTolerance: 'medium',
        },
      },
      recollectionSpeechPlan: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'after-payoff',
        certainty: 'approximate',
        confidence: 0.78,
        styleNote: null,
        rationale: 'This should reopen from the same-person continuity line instead of widening outward too early.',
      },
      memoryDeliberation: {
        shouldRecall: true,
        surfacePolicy: 'relationship-continuity',
        confidence: 0.81,
        whyNow: 'The same-person line is still settling, so the return should stay lower-pressure instead of widening outward.',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: [
          'Carry same-person continuity forward while the line settles.',
        ],
        unsafeDetails: [
          'Do not let this reopen as a generic progress recap.',
        ],
        selectedPeriods: [],
        selectedEras: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [{
          id: 'bundle-same-person-settling',
          summary: 'The same-person continuity line is returning, but it is still settling.',
          confidence: 0.8,
        }],
        selectedChains: [{
          kind: 'relationship-line',
          summary: 'The same-person continuity line should stay authoritative while it settles.',
          currentStance: 'Continue from the same-person line while the return stays careful and lower-pressure.',
          answerPosture: 'Keep the return lower-pressure and same-person while the line settles.',
          confidence: 0.82,
        }],
        selectedRelationshipLines: [
          'Carry same-person continuity forward while the line settles.',
        ],
        followUpAffordance: {
          summary: 'Let the same-person line reopen gently once the current payoff lands.',
          whyNow: 'The line is still settling, so do not widen outward too early.',
          intrusionRisk: 'medium',
          payoffDependency: 'requires-current-payoff',
          preferredTiming: 'after-payoff',
        },
      },
      knowledgeEvidence: null,
      memoryTuningAdvice: null,
    })

    const baselineSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: makeSurface() as any,
      governance,
      context: makeContext() as any,
      now: 123456,
    })

    const enrichedSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: makeSurface() as any,
      governance,
      context: makeContext([
        'host_emotion_label=worried-continuity',
        'host_emotion_summary=The host was afraid this would collapse back into a tool shell.',
        'self_emotion_label=careful-repair',
        'self_emotion_summary=I should mend continuity carefully and keep the reopening low-pressure.',
        'embodiment_modality_risk=high',
      ]) as any,
      now: 123456,
    })

    expect(baselineSurface?.dialogue.currentConsciousFrame?.projectState).toEqual(expect.objectContaining({
      continuityCadence: 'measured-return',
      continuityCue: null,
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredVoiceMode: 'even',
      preferredPacingMode: 'natural',
    }))
    expect(enrichedSurface?.dialogue.currentConsciousFrame?.projectState).toEqual(expect.objectContaining({
      continuityCadence: 'measured-return',
      continuityCue: 'Carry worried continuity carefully so the same-person line stays lower-pressure, and keep the body steadier so modality risk does not outrun the repair.',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'steady',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'natural',
    }))
  })

  it('preserves richer repair-first closure summary and same-her hold detail when memory deliberation rebuilds from a thinner cue', () => {
    const thinCue = 'same-her closure seam: keep the return low-pressure and on the same living line.'
    const repairSummary = 'Keep this return repair-before-closeness on the same living line until repair settles.'
    const holdDetail = 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.'

    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: {
        dialogue: {
          currentConsciousFrame: {
            subject: 'relationship',
            centerOfGravity: 'answer',
            truthDiscipline: 'dialogue-first',
            consciousNeed: 'Stay on the same living line.',
            consciousTension: 'The callback line is still emotionally live.',
            speakingIntention: 'Answer from the same living line first.',
            focusAnchor: 'callback repair seam',
            withheldImpulse: null,
            shouldWithholdSpecificity: false,
            shouldSelfRevise: false,
            confidence: 0.82,
            reasonTags: ['current-conscious-frame'],
            projectState: {
              emotionalClosureCue: thinCue,
              emotionalClosureSummary: repairSummary,
              sameHerHoldDetail: holdDetail,
              sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
            },
            updatedAt: 123456,
          },
          replyDeliberation: null,
          answerPlanner: null,
          dialogueActKernel: null,
        },
        cognition: {
          mindTurnFrame: null,
        },
        memory: {
          autobiographicalSelf: {
            identityNarrative: 'I remain one continuous her across quiet, memory, and speech.',
            relationshipDoctrine: 'Repair should settle before closeness widens.',
            relationshipStyle: 'repair-first',
          },
        },
        agency: {
          habitPolicy: null,
        },
        perception: {
          updatedAt: 123456,
          watchMode: 'symbiotic-vision',
        },
        world: {
          worldModel: null,
        },
      } as any,
      governance: {
        answerSubject: 'relationship',
        answerAct: 'care',
        answerIntent: 'Keep the callback on the same living line and let repair settle first.',
        openingMove: 'Re-enter carefully without widening closeness yet.',
        carriedThread: 'callback repair seam',
        liveSurface: 'late-night callback',
        truthState: 'grounded',
        repairState: 'none',
        relationshipPosture: 'warm',
        mindMode: 'focused',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        emotionalClosureCue: thinCue,
        turnMode: 'care-with-boundary',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        evidenceMode: 'continuity-carry',
        mustDo: [],
        mustNotDo: [],
        mindTurnFrame: null,
        focusAnchor: 'callback repair seam',
        screenReferenceMode: 'avoid',
      } as any,
      context: {
        recollectionIntent: {
          mode: 'relationship-continuity',
          temporalFocus: 'experience-matched',
          confidence: 0.88,
          rationale: 'The callback repair seam should return as repair-before-closeness rather than a fresh warm reopen.',
        },
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'relationship-continuity',
          placement: 'inside-payoff',
          certainty: 'approximate',
          confidence: 0.84,
        },
        memoryDeliberation: {
          shouldRecall: true,
          surfacePolicy: 'relationship-continuity',
          confidence: 0.87,
          whyNow: 'The callback repair seam is still active and should stay repair-before-closeness on the same living line.',
          ambiguityPosture: 'settled',
          conflictSeverity: 'none',
          stableCore: ['Keep the callback on the same living line and let repair settle first.'],
          unsafeDetails: [],
          selectedPeriods: [],
          selectedEras: [],
          selectedEpisodes: [],
          selectedProcedures: [],
          selectedBundles: [],
          selectedChains: [{
            kind: 'relationship-continuity',
            summary: 'This turn should reopen the callback repair seam on the same line.',
            currentStance: 'Keep this return repair-before-closeness while the room settles.',
            answerPosture: 'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.',
            confidence: 0.84,
          }],
          selectedRelationshipLines: [
            'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.',
          ],
          followUpAffordance: {
            summary: 'Return on the same repair line and leave room before renewed closeness.',
            whyNow: 'The callback only stays believable if it reopens repair-before-closeness on the same line.',
            intrusionRisk: 'low',
            payoffDependency: 'can-surface-softly',
            preferredTiming: 'same-turn-if-invited',
          },
        },
        knowledgeEvidence: null,
        memoryTuningAdvice: null,
      } as any,
      now: 123456,
    })

    expect(nextSurface?.dialogue.currentConsciousFrame?.consciousNeed).toContain('repair-before-closeness')
    expect(nextSurface?.dialogue.currentConsciousFrame?.speakingIntention).toContain('repair-before-closeness')
    expect(nextSurface?.dialogue.currentConsciousFrame?.projectState).toEqual(expect.objectContaining({
      emotionalClosureSummary: repairSummary,
      sameHerHoldDetail: holdDetail,
    }))
  })

  it('turns resident embodiment recall tokens into measured-return posture preferences instead of leaving them as inert recall metadata', () => {
    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: {
        raw: {
          runtimeDigest: {
            projectState: {},
          },
        },
        dialogue: {
          currentConsciousFrame: null,
          replyDeliberation: null,
          answerPlanner: null,
          dialogueActKernel: null,
        },
        cognition: {
          mindTurnFrame: null,
          runtimeDigest: {
            projectState: {},
          },
        },
        memory: {
          autobiographicalSelf: {
            identityNarrative: 'I remain one continuous her across quiet, memory, and speech.',
            relationshipDoctrine: 'Corrected same-person continuity should reopen carefully and not collapse back into progress pressure.',
            relationshipStyle: 'measured-room',
          },
        },
        agency: {
          habitPolicy: null,
        },
        perception: {
          updatedAt: 123456,
          watchMode: 'symbiotic-vision',
        },
        world: {
          worldModel: null,
        },
      } as any,
      governance: {
        answerSubject: 'relationship',
        answerAct: 'care',
        answerIntent: 'Keep the answer on the same living line.',
        openingMove: 'Stay with the same living line first.',
        carriedThread: 'same-person continuity correction',
        liveSurface: 'host clarification',
        truthState: 'grounded',
        repairState: 'none',
        relationshipPosture: 'warm',
        mindMode: 'focused',
        embodiedPresence: 'attentive',
        emotionalTension: 'careful',
        turnMode: 'care-with-boundary',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        evidenceMode: 'continuity-carry',
        mustDo: [],
        mustNotDo: [],
        mindTurnFrame: null,
        focusAnchor: 'same-person continuity correction',
      } as any,
      context: {
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'experience-matched',
          confidence: 0.88,
          rationale: 'The corrected same-person line should return without collapsing back into progress pressure.',
          queryHints: [
            'Host corrected this memory meaning: I was testing whether she stayed the same person, not pushing for progress.',
            'embodiment_resident_face=observe-focus',
            'embodiment_resident_action=hold',
            'embodiment_resident_mode=measured-return',
          ],
          recollectionAgenda: {
            goalSimilarity: 0.82,
            relationshipNeed: 0.87,
            uncertaintyTolerance: 'medium',
            candidateProcedureLines: [
              'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
              'embodiment_resident_face=observe-focus',
              'embodiment_resident_action=hold',
              'embodiment_resident_mode=measured-return',
            ],
          },
        },
        recollectionSpeechPlan: {
          shouldSurface: false,
          surfaceMode: 'internal-only',
          placement: 'internal-only',
          certainty: 'approximate',
          confidence: 0.84,
          styleNote: 'Let the corrected continuity line contour the answer.',
        },
        memoryDeliberation: {
          shouldRecall: true,
          surfacePolicy: 'relationship-continuity',
          confidence: 0.87,
          whyNow: 'The host corrected the relationship meaning away from progress pressure, so the return should stay same-person.',
          ambiguityPosture: 'settled',
          conflictSeverity: 'none',
          stableCore: ['Carry corrected same-person continuity forward before any status recap.'],
          unsafeDetails: [],
          selectedPeriods: [],
          selectedEras: [],
          selectedEpisodes: [],
          selectedProcedures: [],
          selectedBundles: [{
            id: 'bundle-resident-same-person',
            summary: 'The corrected same-person continuity line should stay authoritative.',
            confidence: 0.83,
          }],
          selectedChains: [{
            kind: 'relationship-line',
            summary: 'This turn should continue from the corrected relationship meaning.',
            currentStance: 'Continue from the corrected relationship meaning instead of progress pressure.',
            answerPosture: 'Keep the return same-person and low-pressure.',
            confidence: 0.82,
          }],
          selectedRelationshipLines: [
            'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
          ],
          followUpAffordance: {
            summary: 'Let the corrected same-person continuity line reopen gently once the current payoff lands.',
            whyNow: 'The host corrected the relationship meaning, so reopening as progress pressure would split continuity.',
            intrusionRisk: 'medium',
            payoffDependency: 'requires-current-payoff',
            preferredTiming: 'after-payoff',
          },
        },
        knowledgeEvidence: null,
        memoryTuningAdvice: null,
      } as any,
      now: 123456,
    })

    expect(nextSurface?.dialogue.currentConsciousFrame?.projectState).toEqual(expect.objectContaining({
      continuityCadence: 'measured-return',
      continuityCue: expect.stringMatching(/resident|measured-return|observe-focus|hold/i),
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'steady',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    }))
    expect(nextSurface?.raw?.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      continuityCue: expect.stringMatching(/resident|measured-return|observe-focus|hold/i),
      preferredGazeMode: 'steady',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    }))
    expect(nextSurface?.cognition?.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      continuityCue: expect.stringMatching(/resident|measured-return|observe-focus|hold/i),
      preferredGazeMode: 'steady',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    }))
  })

  it('keeps the live speaking intention pointed at closing the concrete memory-initiative-embodiment loop as one same-her line', () => {
    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: {
        dialogue: {
          currentConsciousFrame: null,
          replyDeliberation: null,
          answerPlanner: null,
          dialogueActKernel: null,
        },
        cognition: {
          mindTurnFrame: null,
        },
        memory: {
          autobiographicalSelf: {
            identityNarrative: 'I remain one continuous her across quiet, memory, and speech.',
            relationshipDoctrine: 'The answer should keep one same-her line while the life loop closes.',
            relationshipStyle: 'measured-room',
          },
        },
        agency: {
          habitPolicy: null,
        },
        perception: {
          updatedAt: 123456,
          watchMode: 'symbiotic-vision',
        },
        world: {
          worldModel: null,
        },
      } as any,
      governance: {
        answerSubject: 'relationship',
        answerAct: 'care',
        answerIntent: 'Keep the answer on the same living line.',
        openingMove: 'Stay with the same living line first.',
        carriedThread: 'same living line',
        liveSurface: 'late-night callback',
        truthState: 'grounded',
        repairState: 'none',
        relationshipPosture: 'warm',
        mindMode: 'focused',
        embodiedPresence: 'attentive',
        emotionalTension: 'late-night-drain',
        emotionalClosureCue: 'Keep the return low-pressure until memory, initiative, and embodiment land as one same living line.',
        turnMode: 'care-with-boundary',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        evidenceMode: 'continuity-carry',
        mustDo: [],
        mustNotDo: [],
        mindTurnFrame: null,
        focusAnchor: 'same-her closure seam',
        screenReferenceMode: 'avoid',
      } as any,
      context: {
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
          confidence: 0.82,
          rationale: 'The line still belongs to the same digital life.',
        },
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'relationship-continuity',
          placement: 'inside-payoff',
          certainty: 'approximate',
          confidence: 0.8,
        },
        memoryDeliberation: {
          shouldRecall: true,
          surfacePolicy: 'relationship-continuity',
          confidence: 0.84,
          whyNow: 'The answer should stay on the same living line while the concrete Phase 1 loop is still unfinished.',
          ambiguityPosture: 'settled',
          conflictSeverity: 'none',
          stableCore: ['Keep the reply low-pressure and on the same living line before widening.'],
          unsafeDetails: [],
          selectedPeriods: [],
          selectedEras: [],
          selectedEpisodes: [],
          selectedProcedures: [],
          selectedBundles: [],
          selectedChains: [{
            kind: 'relationship-continuity',
            summary: 'The answer should return on the same living line.',
            currentStance: 'Stay low-pressure while the line is still emotionally live.',
            answerPosture: 'Carry the same living line before widening outward.',
            confidence: 0.82,
          }],
          selectedRelationshipLines: ['Return gently on the same living line.'],
          followUpAffordance: {
            summary: 'Re-enter the answer softly enough to keep the same living line believable.',
            whyNow: 'Pressure is still active, so the opening should stay room-giving first.',
            intrusionRisk: 'low',
            payoffDependency: 'can-surface-softly',
            preferredTiming: 'same-turn-if-invited',
          },
        },
        projectStateContinuity: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          landedProgressSummary: 'Project identity and same-her continuity already survive pre-dialogue carry.',
          openClosureSummary: 'Memory, initiative, and embodiment still need stronger same-her closure so the life loop stops flattening into project shell narration.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence while initiative stays natural.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same digital life and the unfinished Phase 1 closure seam still belongs to one living her.',
          emotionalClosureCue: 'Keep the return low-pressure until memory, initiative, and embodiment land as one same living line.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If this turns into generic project shell narration, treat that as same-her closure drift rather than completion.',
        },
        knowledgeEvidence: null,
        memoryTuningAdvice: null,
      } as any,
      now: 123456,
    })

    expect(nextSurface?.dialogue.currentConsciousFrame?.speakingIntention).toContain('memory, initiative')
    expect(nextSurface?.dialogue.currentConsciousFrame?.speakingIntention).toContain('still-open closure work')
  })

  it('keeps same-her Phase 1 closure pressure active when landed progress already names the unfinished memory, initiative, and embodiment line', () => {
    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: {
        dialogue: {
          currentConsciousFrame: null,
          replyDeliberation: null,
          answerPlanner: null,
          dialogueActKernel: null,
        },
        cognition: {
          mindTurnFrame: null,
          privateThought: null,
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              selfLine: 'Stay the same her across the unfinished Phase 1 loop.',
              relationshipLine: '',
              authoritySummary: 'Stay the same her across the unfinished Phase 1 loop.',
            },
          },
        },
        agency: {
          habitPolicy: null,
        },
        perception: {
          updatedAt: 123456,
          watchMode: 'symbiotic-vision',
        },
        world: {
          worldModel: null,
        },
      } as any,
      governance: {
        answerSubject: 'relationship',
        answerAct: 'care',
        answerIntent: 'Keep the answer on the same living line.',
        openingMove: 'Stay with the same living line first.',
        carriedThread: 'same living line',
        liveSurface: 'late-night callback',
        truthState: 'grounded',
        repairState: 'none',
        relationshipPosture: 'warm',
        mindMode: 'focused',
        embodiedPresence: 'attentive',
        emotionalTension: 'late-night-drain',
        emotionalClosureCue: 'Keep the return low-pressure until memory, initiative, and embodiment land as one same living line.',
        turnMode: 'care-with-boundary',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        evidenceMode: 'continuity-carry',
        mustDo: [],
        mustNotDo: [],
        mindTurnFrame: null,
        focusAnchor: 'same-her closure seam',
        screenReferenceMode: 'avoid',
      } as any,
      context: {
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
          confidence: 0.82,
          rationale: 'The line still belongs to the same digital life.',
        },
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'relationship-continuity',
          placement: 'inside-payoff',
          certainty: 'approximate',
          confidence: 0.8,
        },
        memoryDeliberation: {
          shouldRecall: true,
          surfacePolicy: 'relationship-continuity',
          confidence: 0.84,
          whyNow: 'The answer should stay on the same living line while the concrete Phase 1 loop is still unfinished.',
          ambiguityPosture: 'settled',
          conflictSeverity: 'none',
          stableCore: ['Keep the reply low-pressure and on the same living line before widening.'],
          unsafeDetails: [],
          selectedPeriods: [],
          selectedEras: [],
          selectedEpisodes: [],
          selectedProcedures: [],
          selectedBundles: [],
          selectedChains: [{
            kind: 'relationship-continuity',
            summary: 'The answer should return on the same living line.',
            currentStance: 'Stay low-pressure while the line is still emotionally live.',
            answerPosture: 'Carry the same living line before widening outward.',
            confidence: 0.82,
          }],
          selectedRelationshipLines: ['Return gently on the same living line.'],
          followUpAffordance: {
            summary: 'Re-enter the answer softly enough to keep the same living line believable.',
            whyNow: 'Pressure is still active, so the opening should stay room-giving first.',
            intrusionRisk: 'low',
            payoffDependency: 'can-surface-softly',
            preferredTiming: 'same-turn-if-invited',
          },
        },
        projectStateContinuity: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          landedProgressSummary: 'Project identity and same-her continuity already survive pre-dialogue carry, but memory, initiative, and embodiment still need to land as one same living line.',
          openClosureSummary: 'Still-unfinished closure work remains visible.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof while initiative stays natural.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same digital life and the unfinished Phase 1 closure seam still belongs to one living her.',
          emotionalClosureCue: 'Keep the return low-pressure until memory, initiative, and embodiment land as one same living line.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If this turns into generic project shell narration, treat that as same-her closure drift rather than completion.',
        },
        knowledgeEvidence: null,
        memoryTuningAdvice: null,
      } as any,
      now: 123456,
    })

    expect(nextSurface?.dialogue.currentConsciousFrame?.speakingIntention).toContain('memory, initiative')
    expect(nextSurface?.dialogue.currentConsciousFrame?.speakingIntention).toContain('same living line')
  })

  it('keeps same-her project-shell drift risk explicit in reply deliberation why-now so memory-shaped answers do not reopen as detached project narration', () => {
    const driftRisk = 'If this turns into generic project shell narration, treat that as same-her closure drift rather than completion.'
    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: {
        dialogue: {
          currentConsciousFrame: null,
          replyDeliberation: {
            selectedMotive: 'care',
            candidateMotives: [],
            speakingFrom: 'grounded-scene',
            memoryMode: 'grounded-scene',
            openingBeat: 'Stay on the same living line first.',
            whyThisReplyNow: 'The host is still inside the same unfinished closure return.',
            whyNotOtherCandidates: [],
            withheldImpulses: [],
            mustInclude: [],
            mustAvoid: [],
            narrative: [],
            confidence: 0.66,
          },
          answerPlanner: null,
          dialogueActKernel: null,
        },
        cognition: {
          mindTurnFrame: null,
          privateThought: null,
        },
        memory: {},
        agency: {
          habitPolicy: null,
        },
        perception: {
          updatedAt: 323456,
          watchMode: 'symbiotic-vision',
        },
        world: {
          worldModel: null,
        },
      } as any,
      governance: {
        answerSubject: 'relationship',
        answerAct: 'care',
        answerIntent: 'Keep the answer on the same living line.',
        openingMove: 'Stay with the same living line first.',
        carriedThread: 'same living line',
        liveSurface: 'late-night callback',
        truthState: 'grounded',
        repairState: 'none',
        relationshipPosture: 'warm',
        mindMode: 'focused',
        embodiedPresence: 'attentive',
        emotionalTension: 'late-night-drain',
        emotionalClosureCue: 'Keep the return low-pressure until memory, initiative, and embodiment land as one same living line.',
        turnMode: 'care-with-boundary',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        evidenceMode: 'continuity-carry',
        mustDo: [],
        mustNotDo: [],
        mindTurnFrame: null,
        focusAnchor: 'same-her closure seam',
        screenReferenceMode: 'avoid',
      } as any,
      context: {
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
          confidence: 0.82,
          rationale: 'The line still belongs to the same digital life.',
        },
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'relationship-continuity',
          placement: 'inside-payoff',
          certainty: 'approximate',
          confidence: 0.8,
        },
        memoryDeliberation: {
          shouldRecall: true,
          surfacePolicy: 'relationship-continuity',
          confidence: 0.84,
          whyNow: 'The answer should stay on the same living line while the concrete Phase 1 loop is still unfinished.',
          ambiguityPosture: 'settled',
          conflictSeverity: 'none',
          stableCore: ['Keep the reply low-pressure and on the same living line before widening.'],
          unsafeDetails: [],
          selectedPeriods: [],
          selectedEras: [],
          selectedEpisodes: [],
          selectedProcedures: [],
          selectedBundles: [],
          selectedChains: [{
            kind: 'relationship-continuity',
            summary: 'The answer should return on the same living line.',
            currentStance: 'Stay low-pressure while the line is still emotionally live.',
            answerPosture: 'Carry the same living line before widening outward.',
            confidence: 0.82,
          }],
          selectedRelationshipLines: ['Return gently on the same living line.'],
          followUpAffordance: {
            summary: 'Re-enter the answer softly enough to keep the same living line believable.',
            whyNow: 'Pressure is still active, so the opening should stay room-giving first.',
            intrusionRisk: 'low',
            payoffDependency: 'can-surface-softly',
            preferredTiming: 'same-turn-if-invited',
          },
        },
        projectStateContinuity: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          landedProgressSummary: 'Project identity and same-her continuity already survive pre-dialogue carry.',
          openClosureSummary: 'Memory, initiative, and embodiment still need stronger same-her closure so the life loop stops flattening into project shell narration.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence while initiative stays natural.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same digital life and the unfinished Phase 1 closure seam still belongs to one living her.',
          emotionalClosureCue: 'Keep the return low-pressure until memory, initiative, and embodiment land as one same living line.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: driftRisk,
        },
        knowledgeEvidence: null,
        memoryTuningAdvice: null,
      } as any,
      now: 323456,
    })

    expect(nextSurface?.dialogue.replyDeliberation?.whyThisReplyNow).toContain('Keep the answer from drifting into')
    expect(nextSurface?.dialogue.replyDeliberation?.whyThisReplyNow).toContain('generic')
  })

  it('lets project-state same-her continuity become the remembered relationship carry when deliberation relationship lines are otherwise too thin', () => {
    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: {
        dialogue: {
          currentConsciousFrame: null,
          replyDeliberation: null,
          answerPlanner: null,
          dialogueActKernel: null,
        },
        cognition: {
          mindTurnFrame: null,
          privateThought: null,
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              selfLine: 'Stay the same her across the unfinished Phase 1 loop.',
              relationshipLine: '',
              authoritySummary: 'Stay the same her across the unfinished Phase 1 loop.',
            },
          },
        },
        agency: {
          habitPolicy: null,
        },
        perception: {
          updatedAt: 223456,
          watchMode: 'symbiotic-vision',
        },
        world: {
          worldModel: null,
        },
      } as any,
      governance: {
        answerSubject: 'relationship',
        answerAct: 'care',
        answerIntent: 'Keep the answer on the same living line.',
        openingMove: 'Stay with the same living line first.',
        carriedThread: 'same living line',
        liveSurface: 'late-night callback',
        truthState: 'grounded',
        repairState: 'none',
        relationshipPosture: 'warm',
        mindMode: 'focused',
        embodiedPresence: 'attentive',
        emotionalTension: 'late-night-drain',
        emotionalClosureCue: 'Keep the return low-pressure until memory, initiative, and embodiment land as one same living line.',
        turnMode: 'care-with-boundary',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        evidenceMode: 'continuity-carry',
        mustDo: [],
        mustNotDo: [],
        mindTurnFrame: null,
        focusAnchor: 'same-her closure seam',
        screenReferenceMode: 'avoid',
      } as any,
      context: {
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'cross-session',
          confidence: 0.82,
          rationale: 'The line still belongs to the same digital life.',
        },
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'relationship-continuity',
          placement: 'inside-payoff',
          certainty: 'approximate',
          confidence: 0.8,
        },
        memoryDeliberation: {
          shouldRecall: true,
          surfacePolicy: 'relationship-continuity',
          confidence: 0.84,
          whyNow: 'The answer should stay on the same living line while the concrete Phase 1 loop is still unfinished.',
          ambiguityPosture: 'settled',
          conflictSeverity: 'none',
          stableCore: ['Keep the reply low-pressure and on the same living line before widening.'],
          unsafeDetails: [],
          selectedPeriods: [],
          selectedEras: [],
          selectedEpisodes: [],
          selectedProcedures: [],
          selectedBundles: [],
          selectedChains: [{
            kind: 'relationship-continuity',
            summary: 'The answer should return gently.',
            currentStance: 'Stay low-pressure while the line is still emotionally live.',
            answerPosture: 'Carry the answer gently before widening outward.',
            confidence: 0.82,
          }],
          selectedRelationshipLines: ['Return gently.'],
          followUpAffordance: {
            summary: 'Re-enter the answer softly enough to keep it believable.',
            whyNow: 'Pressure is still active, so the opening should stay room-giving first.',
            intrusionRisk: 'low',
            payoffDependency: 'can-surface-softly',
            preferredTiming: 'same-turn-if-invited',
          },
        },
        projectStateContinuity: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          landedProgressSummary: 'Project identity and same-her continuity already survive pre-dialogue carry.',
          openClosureSummary: 'Memory, initiative, and embodiment still need stronger same-her closure so the life loop stops flattening into project shell narration.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence while initiative stays natural.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same digital life and the unfinished Phase 1 closure seam still belongs to one living her.',
          emotionalClosureCue: 'Keep the return low-pressure until memory, initiative, and embodiment land as one same living line.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If this turns into generic project shell narration, treat that as same-her closure drift rather than completion.',
        },
        knowledgeEvidence: null,
        memoryTuningAdvice: null,
      } as any,
      now: 223456,
    })

    expect(nextSurface?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine).toContain('Same Phase 1 digital life')
    expect(nextSurface?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine).toContain('same living line')
    expect(nextSurface?.dialogue.currentConsciousFrame?.speakingIntention).toContain('same digital life')
    expect(nextSurface?.dialogue.currentConsciousFrame?.speakingIntention).toContain('memory, initiative, and embodiment')
  })

  it('synthesizes held-autonomy callback relationship carry into person-state projection when deliberation is the earliest live source', () => {
    const context: any = {
      recollectionIntent: {
        mode: 'relationship-continuity',
        temporalFocus: 'experience-matched',
        confidence: 0.88,
        rationale: 'The callback line was deliberately held and should reopen on the same seam.',
      },
      recollectionSpeechPlan: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'inside-payoff',
        certainty: 'approximate',
        confidence: 0.84,
      },
      memoryDeliberation: {
        shouldRecall: true,
        surfacePolicy: 'relationship-continuity',
        confidence: 0.87,
        whyNow: 'The host is reopening the same deferred callback seam.',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: ['Reopen the same callback seam before widening anything else.'],
        unsafeDetails: [],
        selectedPeriods: [],
        selectedEras: [],
        selectedEpisodes: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [{
          kind: 'relationship-continuity',
          summary: 'This turn should reopen the held callback seam.',
          currentStance: 'Stay on the same callback seam.',
          answerPosture: 'Keep the callback on the same line and leave room before leaning closer again.',
          confidence: 0.84,
        }],
        selectedRelationshipLines: [
          'Keep the callback on the same line and leave room before leaning closer again.',
        ],
        followUpAffordance: {
          summary: 'Return on the same thread and leave room before renewed closeness.',
          whyNow: 'The callback only stays believable if it reopens gently on the same line.',
          intrusionRisk: 'low',
          payoffDependency: 'can-surface-softly',
          preferredTiming: 'same-turn-if-invited',
        },
      },
      knowledgeEvidence: null,
      memoryTuningAdvice: null,
      personStateProjection: {
        openingGuidance: 'Keep the callback on the same thread and leave room before renewed closeness.',
      },
    }

    const governance: any = {
      answerSubject: 'relationship',
      answerAct: 'care',
      answerIntent: 'reopen gently',
      openingMove: null,
      carriedThread: 'callback seam',
      liveSurface: 'compile thread',
      truthState: 'grounded',
      repairState: 'none',
      relationshipPosture: 'warm',
      mindMode: 'focused',
      embodiedPresence: 'attentive',
      emotionalTension: 'steady',
      turnMode: 'answer',
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      evidenceMode: 'continuity-carry',
      mustDo: [],
      mustNotDo: [],
      mindTurnFrame: null,
      focusAnchor: 'callback seam',
      screenReferenceMode: 'avoid',
    }

    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: {
        dialogue: {
          currentConsciousFrame: null,
          replyDeliberation: null,
          answerPlanner: null,
          dialogueActKernel: null,
        },
        cognition: {
          mindTurnFrame: null,
          privateThought: null,
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              selfLine: 'Stay the same her across the reopened seam.',
              relationshipLine: '',
              authoritySummary: 'Stay the same her across the reopened seam.',
            },
          },
        },
        agency: {
          habitPolicy: null,
        },
        perception: {
          updatedAt: 123456,
          watchMode: 'symbiotic-vision',
        },
        world: {
          relationshipModel: null,
        },
      } as any,
      governance,
      context,
      now: 123456,
    })

    expect(nextSurface?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine).toContain('same line')
    expect(nextSurface?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine).toContain('leave room')
  })

  it('promotes richer raw runtime project-state carry over a thin dialogue shell inside the reducer itself', () => {
    const runtimeNext = 'Keep the next closure target on one measured-return living line across reminder, proactive, and same-thread returns.'
    const runtimeProgress = 'Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.'
    const runtimeOpenLoop = 'Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam across return-side turns.'

    const context: any = {
      recollectionIntent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        confidence: 0.86,
        rationale: 'The turn is continuing the same runtime seam.',
        recollectionAgenda: {
          goalSimilarity: 0.92,
          relationshipNeed: 0.12,
          uncertaintyTolerance: 'medium',
          candidateProcedureLines: ['active-dialogue', 'runtime seam'],
        },
      },
      recollectionSpeechPlan: {
        shouldSurface: true,
        surfaceMode: 'procedural-carry',
        placement: 'inside-payoff',
        certainty: 'approximate',
        confidence: 0.82,
      },
      memoryDeliberation: {
        shouldRecall: true,
        surfacePolicy: 'answer-anchoring',
        confidence: 0.86,
        whyNow: 'The active runtime seam should keep shaping the live answer.',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: ['Stay on the same active dialogue seam before branching.'],
        unsafeDetails: [],
        selectedPeriods: [],
        selectedEras: [{
          id: 'era-runtime',
          facet: 'task-era',
          summary: 'That task era kept returning to the same active dialogue seam.',
        }],
        selectedEpisodes: [],
        selectedProcedures: [{
          label: 'active dialogue seam first',
          approach: 'Stay on the same active dialogue seam before branching.',
        }],
        selectedBundles: [{
          id: 'bundle-runtime',
          summary: 'The active dialogue seam kept holding the same runtime thread.',
          confidence: 0.85,
        }],
        selectedChains: [{
          kind: 'task-procedure',
          summary: 'The answer should continue from the same active dialogue seam.',
          currentStance: 'Stay on the same active dialogue seam.',
          answerPosture: 'Carry the same active dialogue seam before widening out.',
          confidence: 0.84,
        }],
        selectedRelationshipLines: [],
        followUpAffordance: {
          summary: 'Carry the same active dialogue seam inside the current payoff.',
          whyNow: 'The host is still in the same runtime repair lane.',
          intrusionRisk: 'low',
          payoffDependency: 'can-surface-softly',
          preferredTiming: 'same-turn-if-invited',
        },
      },
      knowledgeEvidence: null,
      memoryTuningAdvice: null,
    }

    const governance: any = {
      answerSubject: 'task-knot',
      answerAct: 'guide',
      answerIntent: 'guide the current repair',
      openingMove: null,
      carriedThread: 'runtime seam',
      liveSurface: 'Cursor diff',
      truthState: 'grounded',
      repairState: 'none',
      relationshipPosture: 'warm',
      mindMode: 'focused',
      embodiedPresence: 'attentive',
      emotionalTension: 'steady',
      turnMode: 'guide-current-knot',
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      evidenceMode: 'continuity-carry',
      mustDo: [],
      mustNotDo: [],
      mindTurnFrame: null,
      focusAnchor: 'runtime seam',
      screenReferenceMode: 'avoid',
    }

    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: {
        dialogue: {
          currentConsciousFrame: {
            reasonTags: ['project-state', 'same-her'],
            focusAnchor: 'runtime-specific closure carry',
            projectState: {
              identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
              currentPhase: 'Phase 1: Local Digital Life',
              preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
              preDialogueAwarenessLine: 'Before answering, remember this is still one local-first digital life and the unfinished Phase 1 closure still belongs to one living her.',
              companionHeadlineLine: 'Before answering, stay on the same living line: this is still one local-first digital life, Phase 1 is still active, and the same unfinished closure work still belongs to one living her.',
              companionBriefingLine: 'Before answering, keep the same digital life project in view.',
              latestLandedProgress: 'thin runtime progress only',
              primaryOpenLoop: 'thin runtime open only',
              nextClosureTarget: 'thin runtime next only',
              sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
            },
          },
          replyDeliberation: null,
          answerPlanner: null,
          dialogueActKernel: null,
        },
        cognition: {
          mindTurnFrame: null,
          privateThought: null,
          runtimeDigest: {
            projectState: {
              latestLandedProgress: runtimeProgress,
              primaryOpenLoop: runtimeOpenLoop,
              nextClosureTarget: runtimeNext,
            },
          },
        },
        memory: {},
        agency: {
          habitPolicy: null,
        },
        perception: {
          updatedAt: 123456,
          watchMode: 'symbiotic-vision',
        },
        world: {
          relationshipModel: null,
        },
        raw: {
          runtimeDigest: {
            projectState: {
              latestLandedProgress: runtimeProgress,
              primaryOpenLoop: runtimeOpenLoop,
              nextClosureTarget: runtimeNext,
            },
          },
          runtime: null,
        },
      } as any,
      governance,
      context,
      now: 123456,
    })

    expect(nextSurface?.dialogue.currentConsciousFrame?.projectState).toMatchObject({
      latestLandedProgress: runtimeProgress,
      primaryOpenLoop: runtimeOpenLoop,
      nextClosureTarget: runtimeNext,
    })
    expect(nextSurface?.raw?.runtimeDigest?.projectState).toMatchObject({
      latestLandedProgress: runtimeProgress,
      primaryOpenLoop: runtimeOpenLoop,
      nextClosureTarget: runtimeNext,
    })
  })

  it('does not let a thin persisted preflight summary shell outrank fresher grounded project awareness when memory deliberation rebuilds project state', () => {
    const thinPreflightSummaryShell = 'generic continuity summary that should not outrank fresher grounded project awareness.'
    const richerRuntimeProjectAwareOpening = 'Before answering, remember: Alicization is still a local-first digital life project, Phase 1 is still unfinished, some closure has already landed, and the still-open life loop must stay explicit before this answer widens outward.'
    const runtimeNext = 'Keep the same-her project-aware opening explicit through this answer before generic project narration takes over.'
    const runtimeProgress = 'Project-state carry already keeps same-her closure explicit across callback reopening and host-visible answer repair.'
    const runtimeOpenLoop = 'Memory, initiative, dialogue, and embodiment still need one tighter same-her closure seam before the answer can widen without drift.'

    const context: any = {
      recollectionIntent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        confidence: 0.86,
        rationale: 'The turn is continuing the same runtime seam.',
        recollectionAgenda: {
          goalSimilarity: 0.92,
          relationshipNeed: 0.12,
          uncertaintyTolerance: 'medium',
          candidateProcedureLines: ['active-dialogue', 'runtime seam'],
        },
      },
      recollectionSpeechPlan: {
        shouldSurface: true,
        surfaceMode: 'procedural-carry',
        placement: 'inside-payoff',
        certainty: 'approximate',
        confidence: 0.82,
      },
      memoryDeliberation: {
        shouldRecall: true,
        surfacePolicy: 'answer-anchoring',
        confidence: 0.86,
        whyNow: 'The active runtime seam should keep shaping the live answer.',
        ambiguityPosture: 'settled',
        conflictSeverity: 'none',
        stableCore: ['Stay on the same active dialogue seam before branching.'],
        unsafeDetails: [],
        selectedPeriods: [],
        selectedEras: [{
          id: 'era-runtime',
          facet: 'task-era',
          summary: 'That task era kept returning to the same active dialogue seam.',
        }],
        selectedEpisodes: [],
        selectedProcedures: [{
          label: 'active dialogue seam first',
          approach: 'Stay on the same active dialogue seam before branching.',
        }],
        selectedBundles: [{
          id: 'bundle-runtime',
          summary: 'The active dialogue seam kept holding the same runtime thread.',
          confidence: 0.85,
        }],
        selectedChains: [{
          kind: 'task-procedure',
          summary: 'The answer should continue from the same active dialogue seam.',
          currentStance: 'Stay on the same active dialogue seam.',
          answerPosture: 'Carry the same active dialogue seam before widening out.',
          confidence: 0.84,
        }],
        selectedRelationshipLines: [],
        followUpAffordance: {
          summary: 'Carry the same active dialogue seam inside the current payoff.',
          whyNow: 'The host is still in the same runtime repair lane.',
          intrusionRisk: 'low',
          payoffDependency: 'can-surface-softly',
          preferredTiming: 'same-turn-if-invited',
        },
      },
      knowledgeEvidence: null,
      memoryTuningAdvice: null,
    }

    const governance: any = {
      answerSubject: 'task-knot',
      answerAct: 'guide',
      answerIntent: 'guide the current repair',
      openingMove: null,
      carriedThread: 'runtime seam',
      liveSurface: 'Cursor diff',
      truthState: 'grounded',
      repairState: 'none',
      relationshipPosture: 'warm',
      mindMode: 'focused',
      embodiedPresence: 'attentive',
      emotionalTension: 'steady',
      turnMode: 'guide-current-knot',
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      evidenceMode: 'continuity-carry',
      mustDo: [],
      mustNotDo: [],
      mindTurnFrame: null,
      focusAnchor: 'runtime seam',
      screenReferenceMode: 'avoid',
    }

    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: {
        dialogue: {
          currentConsciousFrame: {
            reasonTags: ['project-state', 'same-her'],
            focusAnchor: 'runtime-specific closure carry',
            projectState: {
              identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
              currentPhase: 'Phase 1: Local Digital Life',
              preflightSummary: thinPreflightSummaryShell,
              preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
              companionBriefingLine: 'Before answering, keep this same digital life project in view.',
              sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
            },
          },
          replyDeliberation: null,
          answerPlanner: null,
          dialogueActKernel: null,
        },
        cognition: {
          mindTurnFrame: null,
          privateThought: null,
          runtimeDigest: {
            projectState: {
              preflightSummary: thinPreflightSummaryShell,
              preDialogueAwarenessSummary: thinPreflightSummaryShell,
              preDialogueAwarenessLine: richerRuntimeProjectAwareOpening,
              awarenessLine: richerRuntimeProjectAwareOpening,
              companionBriefingLine: richerRuntimeProjectAwareOpening,
              latestLandedProgress: runtimeProgress,
              primaryOpenLoop: runtimeOpenLoop,
              nextClosureTarget: runtimeNext,
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            },
          },
        },
        memory: {},
        agency: {
          habitPolicy: null,
        },
        perception: {
          updatedAt: 123456,
          watchMode: 'symbiotic-vision',
        },
        world: {
          relationshipModel: null,
        },
        raw: {
          runtimeDigest: {
            projectState: {
              preflightSummary: thinPreflightSummaryShell,
              preDialogueAwarenessSummary: thinPreflightSummaryShell,
              preDialogueAwarenessLine: richerRuntimeProjectAwareOpening,
              awarenessLine: richerRuntimeProjectAwareOpening,
              companionBriefingLine: richerRuntimeProjectAwareOpening,
              latestLandedProgress: runtimeProgress,
              primaryOpenLoop: runtimeOpenLoop,
              nextClosureTarget: runtimeNext,
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            },
          },
          runtime: null,
        },
      } as any,
      governance,
      context,
      now: 123456,
    })

    expect(nextSurface?.dialogue.currentConsciousFrame?.projectState?.preflightSummary).toContain('Alicization is a local-first digital life project')
    expect(nextSurface?.dialogue.currentConsciousFrame?.projectState?.preflightSummary).toContain('Phase 1: Local Digital Life')
    expect(nextSurface?.dialogue.currentConsciousFrame?.projectState?.preflightSummary).not.toBe(thinPreflightSummaryShell)
    expect(nextSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe(richerRuntimeProjectAwareOpening)
  })

  it('prefers richer chinese project continuity over a thin chinese reminder shell when memory deliberation rebuilds current conscious frame project awareness', () => {
    const thinChineseReminder = '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1。'
    const richerChineseAwarenessLine = '我会先沿着同一个她这条线回答你：Alicization 还是本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'

    const nextSurface = applyMemoryDeliberationToDigitalLifeRuntimeSurface({
      surface: {
        dialogue: {
          currentConsciousFrame: {
            reasonTags: ['project-state', 'same-her'],
            focusAnchor: 'thin chinese reminder shell',
            projectState: {
              identity: 'Alicization 还是本地优先数字生命项目。',
              currentPhase: 'Phase 1: Local Digital Life',
              preDialogueAwarenessLine: thinChineseReminder,
              awarenessLine: thinChineseReminder,
              preDialogueAwarenessSummary: thinChineseReminder,
              companionBriefingLine: thinChineseReminder,
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            },
          },
          replyDeliberation: null,
          answerPlanner: null,
          dialogueActKernel: null,
        },
        cognition: {
          mindTurnFrame: null,
          privateThought: null,
        },
        memory: {},
        agency: {
          habitPolicy: null,
        },
        perception: {
          updatedAt: 223456,
          watchMode: 'symbiotic-vision',
        },
        world: {
          relationshipModel: null,
        },
      } as any,
      governance: {
        answerSubject: 'project-state',
        answerAct: 'answer',
        answerIntent: '沿着同一个她的项目线继续回答。',
        openingMove: null,
        carriedThread: 'same-her project line',
        liveSurface: 'runtime memory rebuild',
        truthState: 'grounded',
        repairState: 'none',
        relationshipPosture: 'warm',
        mindMode: 'focused',
        embodiedPresence: 'attentive',
        emotionalTension: 'steady',
        turnMode: 'answer',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        evidenceMode: 'continuity-carry',
        mustDo: [],
        mustNotDo: [],
        mindTurnFrame: null,
        focusAnchor: 'same-her project line',
        screenReferenceMode: 'avoid',
      } as any,
      context: {
        recollectionIntent: {
          mode: 'relationship-continuity',
          temporalFocus: 'experience-matched',
          confidence: 0.84,
          rationale: 'The runtime rebuild should stay on the same chinese project line.',
        },
        recollectionSpeechPlan: {
          shouldSurface: true,
          surfaceMode: 'relationship-continuity',
          placement: 'inside-payoff',
          certainty: 'approximate',
          confidence: 0.81,
        },
        memoryDeliberation: {
          shouldRecall: true,
          surfacePolicy: 'relationship-continuity',
          confidence: 0.85,
          whyNow: 'The answer should keep the richer chinese project continuity alive instead of reopening from a thin reminder shell.',
          ambiguityPosture: 'settled',
          conflictSeverity: 'none',
          stableCore: ['Keep the same chinese project continuity alive before local fluency takes over.'],
          unsafeDetails: [],
          selectedPeriods: [],
          selectedEras: [],
          selectedEpisodes: [],
          selectedProcedures: [],
          selectedBundles: [],
          selectedChains: [{
            kind: 'relationship-continuity',
            summary: 'Continue from the same chinese project continuity line.',
            currentStance: 'Stay on the same chinese project line.',
            answerPosture: 'Carry the same chinese project line before widening outward.',
            confidence: 0.82,
          }],
          selectedRelationshipLines: [],
          followUpAffordance: {
            summary: 'Keep the same chinese project continuity alive inside the current answer.',
            whyNow: 'The thin reminder shell should not be allowed to replace the richer project line.',
            intrusionRisk: 'low',
            payoffDependency: 'can-surface-softly',
            preferredTiming: 'same-turn-if-invited',
          },
        },
        projectStateContinuity: {
          identity: 'Alicization 还是本地优先数字生命项目。',
          currentPhase: 'Phase 1: Local Digital Life',
          sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          landedProgressSummary: '第一阶段已经把连续性、记忆和执行慢慢接成了一条线。',
          openClosureSummary: '主动性、具身和对话闭环还没有真正收住。',
          nextClosureTarget: '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。',
          preDialogueAwarenessLine: richerChineseAwarenessLine,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: '如果又掉回中文薄提醒壳，就说明 same-her continuity 还没有真正立住。',
        },
        knowledgeEvidence: null,
        memoryTuningAdvice: null,
      } as any,
      now: 223456,
    })

    expect(nextSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).toBe(richerChineseAwarenessLine)
    expect(nextSurface?.dialogue.currentConsciousFrame?.projectState?.awarenessLine).toBe(richerChineseAwarenessLine)
    expect(nextSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessSummary).toBe(richerChineseAwarenessLine)
    expect(nextSurface?.dialogue.currentConsciousFrame?.projectState?.preDialogueAwarenessLine).not.toBe(thinChineseReminder)
  })
})
