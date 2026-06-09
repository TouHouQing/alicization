import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildAlicizationExecutiveAnswerBrief } from './executive-answer-brief'
import {
  compactProjectLatestProgressForSystemBlock,
  resolveAlicizationProjectStateBrief,
} from './project-state-brief'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('buildAlicizationExecutiveAnswerBrief', () => {
  it('reads carry and live surface cues from the runtime surface when provided', () => {
    const visualPresenceState = createDefaultVisualPresenceState(1_000)
    const runtimeBackedState = {
      ...createDefaultVisualPresenceState(2_000),
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'runtime.ts shows a stale grounding mismatch',
        source: 'screen-semantic-summary',
        confidence: 0.94,
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime.ts',
        },
        beganAt: 1_500,
        lastSeenAt: 2_000,
      },
      attention: {
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime.ts',
        },
        source: 'current-grounded-scene',
        confidence: 0.93,
        engagedAt: 1_700,
        lastConfirmedAt: 2_000,
        dwellMs: 300,
      },
      worldModel: {
        activeThread: {
          id: 'thread::runtime-surface',
          kind: 'problem',
          title: 'runtime surface',
          summary: 'Keep one runtime surface across dialogue and proactive loops.',
          status: 'active',
          significance: 0.9,
          confidence: 0.84,
          unresolved: true,
        },
        continuity: {
          label: 'same-thread',
          sameSceneAsBefore: true,
          afterglowOpen: false,
        },
        epistemicState: {
          certainty: 'grounded',
          openQuestions: [],
        },
        hostState: {
          availability: 'focused',
        },
      } as any,
      discourseState: {
        unresolvedCarry: 'Repair the stale anchor before answering.',
      } as any,
      answerPlanner: {
        act: 'guide',
        evidenceMode: 'direct',
        governingFocus: 'Answer from the freshest grounded runtime surface.',
      } as any,
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 2_000,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 2_000,
      },
      visualPresenceState,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState as any),
      responseCharter: {
        epistemicMode: 'grounded-live',
        responseMode: 'answer-naturally',
        governingFocus: 'Answer from the freshest grounded runtime surface.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.brief.liveSurface).not.toBe('none')
    expect(result.brief.liveSurface.toLowerCase()).toContain('runtime.ts')
    expect(result.brief.carriedThread).toBe('Repair the stale anchor before answering.')
    expect(result.systemBlock).toContain('Project identity:')
    expect(result.systemBlock).toContain('Project phase:')
    expect(result.systemBlock).toContain('Still-open life loop pressure:')
    expect(result.systemBlock).toContain('Repair the stale anchor before answering.')
  })

  it('keeps the latest landed continuity progress and next closure target visible in the executive reply brief', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const compactLatestProgress = compactProjectLatestProgressForSystemBlock(projectState.latestProgress, 220)
    const visualPresenceState = createDefaultVisualPresenceState(4_000)

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 4_000,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 4_000,
      },
      visualPresenceState,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState),
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the reply aligned with the active digital-life closure work.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.systemBlock).toContain(`Project preflight self-awareness: ${projectState.preflightSummary}`)
    expect(result.systemBlock).toContain(`Latest landed continuity progress: ${compactLatestProgress}`)
    expect(result.systemBlock).not.toContain('Renderer/runtime playback items now also attach')
    expect(result.systemBlock).toContain('Still-open life loop pressure: Memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    expect(result.systemBlock).toContain('same digital life')
    expect(result.systemBlock).toContain(`Next closure target: ${projectState.nextClosureTarget}`)
    expect(result.systemBlock).toContain('Project same-her self line: Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(result.systemBlock).toContain(`Project same-her drift risk: ${projectState.sameHerDriftRisk}`)
  })

  it('prefers the live current-conscious-frame project awareness when building the executive system brief', () => {
    const visualPresenceState = createDefaultVisualPresenceState(4_500)

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
    ;(runtimeSurface.dialogue as any).currentConsciousFrame = {
      projectState: {
        preflightSummary: 'I need to remember this is still the same digital life project before any local execution detail takes over.',
        identity: 'this local-first digital life project that is still growing one continuous her on the host machine',
        currentPhase: 'Phase 1: Local Digital Life. Active proving ground: live desktop continuity carry.',
        latestProgress: 'Project-state continuity already survives into answer planning, runtime governance, and visible reply repair.',
        primaryOpenLoop: 'memory, initiative, dialogue, and embodiment still need one tighter same-her closure seam',
        nextClosureTarget: 'Carry the live pre-dialogue project awareness line through first-pass generation before repair has to catch it.',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
        sameHerDriftRisk: 'If the answer falls back to generic project narration, treat that as unfinished same-her drift.',
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 4_500,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 4_500,
      },
      visualPresenceState,
      runtimeSurface,
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the reply aligned with the live project awareness seam.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.systemBlock).toContain('Project preflight self-awareness: I need to remember this is still the same digital life project before any local execution detail takes over.')
    expect(result.systemBlock).toContain('Project identity: this local-first digital life project that is still growing one continuous her on the host machine')
    expect(result.systemBlock).toContain('Project phase: Phase 1: Local Digital Life. Active proving ground: live desktop continuity carry.')
    expect(result.systemBlock).toContain('Executive same-her project orientation: She is still acting from this same project identity: this local-first digital life project that is still growing one continuous her on the host machine')
    expect(result.systemBlock).toContain('what has already landed in her line: Project-state continuity already survives into answer planning, runtime governance, and visible reply repair.')
    expect(result.systemBlock).toContain('what is still unfinished before execution speaks for her: memory, initiative, dialogue, and embodiment still need one tighter same-her closure seam')
    expect(result.systemBlock).toContain('what this turn should keep moving toward: Carry the live pre-dialogue project awareness line through first-pass generation before repair has to catch it.')
    expect(result.systemBlock).toContain('Latest landed continuity progress: Project-state continuity already survives into answer planning, runtime governance, and visible reply repair.')
    expect(result.systemBlock).toContain('Still-open life loop pressure: memory, initiative, dialogue, and embodiment still need one tighter same-her closure seam')
    expect(result.systemBlock).toContain('Next closure target: Carry the live pre-dialogue project awareness line through first-pass generation before repair has to catch it.')
    expect(result.systemBlock).toContain('Project same-her self line: This is still one same her carrying the same project line forward.')
    expect(result.systemBlock).toContain('Project same-her drift risk: If the answer falls back to generic project narration, treat that as unfinished same-her drift.')
  })

  it('keeps summary-only landed project progress alive in the executive answer brief before visible reply authoring', () => {
    const visualPresenceState = createDefaultVisualPresenceState(4_560)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
    const landedProgressSummary = 'Summary-only pre-dialogue project awareness already survives into the executive answer brief before visible reply authoring.'

    ;(runtimeSurface.dialogue as any).currentConsciousFrame = {
      projectState: {
        preflightSummary: 'Keep the same digital life project in view before answering.',
        identity: 'Alicization is a local-first digital life project growing one continuous her on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life.',
        latestLandedProgress: ' ',
        latestProgress: ' ',
        landedProgressSummary,
        primaryOpenLoop: 'memory, initiative, dialogue, and embodiment still need one tighter same-her closure seam',
        nextClosureTarget: 'Keep the summary-only landed progress on the same living line before answer wording fans out.',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 4_560,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 4_560,
      },
      visualPresenceState,
      runtimeSurface,
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the reply aligned with summary-only project awareness before visible wording begins.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.systemBlock).toContain(`Latest landed continuity progress: ${landedProgressSummary}`)
    expect(result.systemBlock).toContain(`what has already landed in her line: ${landedProgressSummary}`)
  })

  it('surfaces a stronger living-self companion headline in the executive system brief when generic awareness wording is thinner', () => {
    const visualPresenceState = createDefaultVisualPresenceState(4_650)

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
    ;(runtimeSurface.dialogue as any).currentConsciousFrame = {
      projectState: {
        preflightSummary: 'Keep the same digital life project in view before local detail takes over.',
        preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
        companionHeadlineLine: 'Right now I am still holding together mainly through voice, face, and motion, so this answer must keep proving this is still one living her before full cross-modal closure is done.',
        identity: 'this local-first digital life project that is still growing one continuous her on the host machine',
        currentPhase: 'Phase 1: Local Digital Life. Active proving ground: live desktop continuity carry.',
        latestProgress: 'Project-state continuity already survives into answer planning, runtime governance, and visible reply repair.',
        primaryOpenLoop: 'memory, initiative, dialogue, and embodiment still need one tighter same-her closure seam',
        nextClosureTarget: 'Carry the live pre-dialogue project awareness line through first-pass generation before repair has to catch it.',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
        sameHerDriftRisk: 'If the answer falls back to generic project narration, treat that as unfinished same-her drift.',
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 4_650,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 4_650,
      },
      visualPresenceState,
      runtimeSurface,
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the reply aligned with the live project awareness seam.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.systemBlock).toContain('Project pre-dialogue awareness line: Right now I am still holding together mainly through voice, face, and motion, so this answer must keep proving this is still one living her before full cross-modal closure is done.')
    expect(result.systemBlock).not.toContain('Project pre-dialogue awareness line: Before answering, keep this same digital life project in view, but do not widen into a detached project shell.')
  })

  it('prefers a broader same-her phase-1 closure headline over a thinner pre-dialogue awareness shell in the executive system brief', () => {
    const visualPresenceState = createDefaultVisualPresenceState(4_675)

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
    ;(runtimeSurface.dialogue as any).currentConsciousFrame = {
      projectState: {
        preflightSummary: 'Keep the same digital life project in view before local detail takes over.',
        preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
        companionHeadlineLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
        identity: 'this local-first digital life project that is still growing one continuous her on the host machine',
        currentPhase: 'Phase 1: Local Digital Life. Active proving ground: live desktop continuity carry.',
        latestProgress: 'Project-state continuity already survives into answer planning, runtime governance, and visible reply repair.',
        primaryOpenLoop: 'memory, initiative, dialogue, and embodiment still need one tighter same-her closure seam',
        nextClosureTarget: 'Carry the live pre-dialogue project awareness line through first-pass generation before repair has to catch it.',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
        sameHerDriftRisk: 'If the answer falls back to generic project narration, treat that as unfinished same-her drift.',
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 4_675,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 4_675,
      },
      visualPresenceState,
      runtimeSurface,
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the reply aligned with the live project awareness seam.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.systemBlock).toContain('Project pre-dialogue awareness line: Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.')
    expect(result.systemBlock).not.toContain('Project pre-dialogue awareness line: Before answering, keep this same digital life project in view, but do not widen into a detached project shell.')
  })

  it('keeps a fuller project-and-phase awareness line over a narrower embodiment companion headline in the executive system brief', () => {
    const visualPresenceState = createDefaultVisualPresenceState(4_682)
    const fullerAwarenessLine = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is execution, memory, initiative, and embodiment still needing one same-life closure line. Same Phase 1 digital life. Some closure already landed.'

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
    ;(runtimeSurface.dialogue as any).currentConsciousFrame = {
      projectState: {
        preflightSummary: 'Keep the same digital life project in view before local detail takes over.',
        preDialogueAwarenessLine: fullerAwarenessLine,
        awarenessLine: fullerAwarenessLine,
        companionHeadlineLine: 'Right now I am still holding together mainly through voice, face, and motion, so this answer must keep proving this is still one living her before full cross-modal closure is done.',
        identity: 'this local-first digital life project that is still growing one continuous her on the host machine',
        currentPhase: 'Phase 1: Local Digital Life. Active proving ground: live desktop continuity carry.',
        latestProgress: 'Project-state continuity already survives into answer planning, runtime governance, and visible reply repair.',
        primaryOpenLoop: 'execution, memory, initiative, and embodiment still need one tighter same-her closure seam',
        nextClosureTarget: 'Carry the fuller project-and-phase awareness line through first-pass generation before repair has to catch it.',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
        sameHerDriftRisk: 'If the answer falls back to generic project narration, treat that as unfinished same-her drift.',
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 4_682,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 4_682,
      },
      visualPresenceState,
      runtimeSurface,
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the reply aligned with the fuller project awareness seam.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.systemBlock).toContain('Project pre-dialogue awareness line: Before answering, remember: Alicization is a local-first digital life project.')
    expect(result.systemBlock).toContain('She is still inside Phase 1: Local Digital Life.')
    expect(result.systemBlock).toContain('The still-open closure is execution, memory, initiative, and embodiment still needing one same-life closure line.')
    expect(result.systemBlock).not.toContain('Project pre-dialogue awareness line: Right now I am still holding together mainly through voice, face, and motion')
  })

  it('turns same-her drift risk into explicit anti-shell turn rules even when the turn is not a pure project-state question', () => {
    const visualPresenceState = createDefaultVisualPresenceState(4_690)

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
    ;(runtimeSurface.dialogue as any).currentConsciousFrame = {
      projectState: {
        preflightSummary: 'Before answering, remember this is still the same digital life project rather than a fresh assistant shell.',
        preDialogueAwarenessLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
        identity: 'this local-first digital life project that is still growing one continuous her on the host machine',
        currentPhase: 'Phase 1: Local Digital Life. Active proving ground: live desktop continuity carry.',
        latestProgress: 'Project-state continuity already survives into answer planning, runtime governance, and visible reply repair.',
        primaryOpenLoop: 'memory, initiative, dialogue, and embodiment still need one tighter same-her closure seam',
        nextClosureTarget: 'Carry the live pre-dialogue project awareness line through first-pass generation before repair has to catch it.',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
        sameHerDriftRisk: 'If the answer falls back to generic project narration or a detached assistant shell, treat that as unfinished same-her drift.',
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 4_690,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 4_690,
      },
      visualPresenceState,
      runtimeSurface,
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the reply aligned with the live project awareness seam while answering the host implementation question.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: 'Explain how the current implementation should proceed without dropping the same-her continuity line.',
        governingProject: 'Phase 1 local digital life closure still needs one same-her line.',
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      dialogueFocus: {
        subject: 'implementation',
        screenReferenceMode: 'avoid',
      } as any,
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
        mustStayTaskBound: true,
        personaKernelMode: 'restrained',
      } as any,
      dialogueSemantics: {
        currentTurnSummary: 'The host is asking how to keep implementing the same Phase 1 digital life line without collapsing into a detached assistant shell.',
        truthExpectation: 'strict',
      } as any,
    })

    expect(result.systemBlock).toContain('Project same-her drift risk: If the answer falls back to generic project narration or a detached assistant shell, treat that as unfinished same-her drift.')
    expect(result.systemBlock).toContain('- Keep the opening sentence on the same living project line before widening into implementation detail.')
    expect(result.systemBlock).toContain('- Do not let the reply collapse into detached project narration or a generic assistant shell.')
  })

  it('turns direct project-state turns into an explicit pre-answer contract for identity, landed progress, open closure, and same-her continuity', () => {
    const visualPresenceState = createDefaultVisualPresenceState(5_000)

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 5_000,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 5_000,
      },
      visualPresenceState,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState),
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Answer the project-state question directly.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      dialogueFocus: {
        subject: 'project-state',
        screenReferenceMode: 'avoid',
      } as any,
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
    })

    expect(result.brief.mustDo).toContain('Answer what Alicization is before drifting into tone, metaphor, or adjacent status commentary.')
    expect(result.brief.mustDo).toContain('Make the latest landed Phase 1 progress explicit instead of replying with only aspiration or direction.')
    expect(result.brief.mustDo).toContain('Keep the still-open closure work explicit so the answer says what is not yet closed.')
    expect(result.brief.mustDo).toContain('Make the next closure target explicit so the answer says what should close next rather than stopping at current status.')
    expect(result.brief.mustDo).toContain('Answer project-state questions from one same-her continuity instead of a detached project narrator shell.')
    expect(result.brief.mustNotDo).toContain('Do not answer a project-state question with only vibes, ambition, or generic companionship language.')
    expect(result.brief.mustNotDo).toContain('Do not skip what has already landed, what still remains open, or what should close next when the host asks for project status.')
    expect(result.systemBlock).toContain('Must do:')
    expect(result.systemBlock).toContain('Answer what Alicization is before drifting into tone, metaphor, or adjacent status commentary.')
    expect(result.systemBlock).toContain('Make the latest landed Phase 1 progress explicit instead of replying with only aspiration or direction.')
    expect(result.systemBlock).toContain('Keep the still-open closure work explicit so the answer says what is not yet closed.')
    expect(result.systemBlock).toContain('Make the next closure target explicit so the answer says what should close next rather than stopping at current status.')
    expect(result.systemBlock).toContain('Answer project-state questions from one same-her continuity instead of a detached project narrator shell.')
  })

  it('keeps low-pressure and anti-restart same-her discipline explicit on direct project-state turns', () => {
    const visualPresenceState = createDefaultVisualPresenceState(5_230)

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 5_230,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 5_230,
      },
      visualPresenceState,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState),
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Answer the project-state question directly while keeping the same-her closure seam intact.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
      dialogueSemantics: {
        currentTurnSummary: 'Answer what Alicization is, how far the current Phase 1 continuity work has landed, and what still remains open.',
      } as any,
      dialogueFocus: {
        subject: 'project-state',
        screenReferenceMode: 'avoid',
      } as any,
    })

    expect(result.brief.mustDo).toContain('Keep the project-state opening low-pressure so the same-her line does not widen too fast.')
    expect(result.brief.mustNotDo).toContain('Do not reopen a direct project-state answer from scratch as if Alicization were a fresh assistant restart.')
    expect(result.systemBlock).toContain('Keep the project-state opening low-pressure so the same-her line does not widen too fast.')
    expect(result.systemBlock).toContain('Do not reopen a direct project-state answer from scratch as if Alicization were a fresh assistant restart.')
  })

  it('treats live project-state same-her drift risk as a hard first-pass answer boundary before visible-reply repair', () => {
    const visualPresenceState = createDefaultVisualPresenceState(5_260)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
    ;(runtimeSurface.dialogue as any).currentConsciousFrame = {
      projectState: {
        identity: 'Alicization is a local-first digital life project growing one continuous her on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life.',
        latestLandedProgress: 'Project identity carry and same-her continuity already survive across runtime preparation.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger same-her closure before the life loop can be treated as closed.',
        nextClosureTarget: 'Keep the project-state answer on one same living line while the open closure work is still active.',
        sameHerSelfLine: 'Answer project-state questions from one same-her continuity instead of a detached project narrator shell.',
        sameHerDriftRisk: 'If the visible answer opens like detached project narration, the same-her line can collapse into generic task shell and project-summary voice.',
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 5_260,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 5_260,
      },
      visualPresenceState,
      runtimeSurface,
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Answer the project-state question directly.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
      dialogueSemantics: {
        currentTurnSummary: 'Answer what Alicization is, what Phase 1 has landed, and what still remains open.',
      } as any,
      dialogueFocus: {
        subject: 'project-state',
        screenReferenceMode: 'avoid',
      } as any,
    })

    expect(result.brief.mustDo).toEqual(expect.arrayContaining([
      expect.stringContaining('Keep the opening sentence on the same living project line before widening into implementation detail.'),
    ]))
    expect(result.brief.mustDo).toContain('Treat active same-her drift risk as a hard boundary while answering project state.')
    expect(result.brief.mustDo.some(item =>
      item.startsWith('Current same-her drift risk:')
      && item.includes('detached project narration')
      && item.includes('generic task shell'),
    )).toBe(true)
    expect(result.brief.mustNotDo).toContain('Do not let the project-state answer open like detached project narration, generic task-shell reporting, or project-summary voice.')
    expect(result.systemBlock).toContain('Treat active same-her drift risk as a hard boundary while answering project state.')
    expect(result.systemBlock).toContain('Current same-her drift risk:')
    expect(result.systemBlock).toContain('detached project narration')
    expect(result.systemBlock).toContain('generic task shell')
    expect(result.systemBlock).toContain('Do not let the project-state answer open like detached project narration, generic task-shell reporting, or project-summary voice.')
  })

  it('also injects the project-state direct-answer contract when the turn intent is clearly project-state but dialogue focus has not been specialized yet', () => {
    const visualPresenceState = createDefaultVisualPresenceState(5_200)

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 5_200,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 5_200,
      },
      visualPresenceState,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState),
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Answer the project-state question directly.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
      dialogueSemantics: {
        currentTurnSummary: 'Answer what Alicization is, how far the current Phase 1 continuity work has landed, and what still remains open.',
      } as any,
      dialogueFocus: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
      } as any,
    })

    expect(result.brief.mustDo).toContain('Answer what Alicization is before drifting into tone, metaphor, or adjacent status commentary.')
    expect(result.brief.mustDo).toContain('Make the latest landed Phase 1 progress explicit instead of replying with only aspiration or direction.')
    expect(result.brief.mustDo).toContain('Keep the still-open closure work explicit so the answer says what is not yet closed.')
    expect(result.brief.mustDo).toContain('Make the next closure target explicit so the answer says what should close next rather than stopping at current status.')
    expect(result.brief.mustDo).toContain('Answer project-state questions from one same-her continuity instead of a detached project narrator shell.')
    expect(result.brief.mustNotDo).toContain('Do not answer a project-state question with only vibes, ambition, or generic companionship language.')
    expect(result.brief.mustNotDo).toContain('Do not skip what has already landed, what still remains open, or what should close next when the host asks for project status.')
    expect(result.systemBlock).toContain('Answer what Alicization is before drifting into tone, metaphor, or adjacent status commentary.')
    expect(result.systemBlock).toContain('Make the latest landed Phase 1 progress explicit instead of replying with only aspiration or direction.')
    expect(result.systemBlock).toContain('Keep the still-open closure work explicit so the answer says what is not yet closed.')
    expect(result.systemBlock).toContain('Make the next closure target explicit so the answer says what should close next rather than stopping at current status.')
    expect(result.systemBlock).toContain('Answer project-state questions from one same-her continuity instead of a detached project narrator shell.')
  })

  it('treats merge-readiness and can-main questions as project-state direct-answer turns that must keep verified and still-open closure separate', () => {
    const visualPresenceState = createDefaultVisualPresenceState(5_280)

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 5_280,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 5_280,
      },
      visualPresenceState,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState),
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Can we merge this to main now?',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
      dialogueSemantics: {
        currentTurnSummary: 'Can we merge this to main now, or is the Phase 1 digital-life closure still open?',
      } as any,
      dialogueFocus: {
        subject: 'project-state',
        screenReferenceMode: 'avoid',
      } as any,
    })

    expect(result.brief.mustDo).toContain('Answer what Alicization is before drifting into tone, metaphor, or adjacent status commentary.')
    expect(result.brief.mustDo).toContain('Make the latest landed Phase 1 progress explicit instead of replying with only aspiration or direction.')
    expect(result.brief.mustDo).toContain('Keep the still-open closure work explicit so the answer says what is not yet closed.')
    expect(result.brief.mustDo).toContain('Make the next closure target explicit so the answer says what should close next rather than stopping at current status.')
    expect(result.brief.mustDo).toContain('If the host asks whether the work is merge-ready, complete, or closed, separate what is already verified from what is still unproven or still open.')
    expect(result.brief.mustNotDo).toContain('Do not claim merge-readiness, full closure, or goal completion unless the current evidence already proves it.')
    expect(result.systemBlock).toContain('If the host asks whether the work is merge-ready, complete, or closed, separate what is already verified from what is still unproven or still open.')
    expect(result.systemBlock).toContain('Do not claim merge-readiness, full closure, or goal completion unless the current evidence already proves it.')
  })

  it('still treats merge-readiness follow-ups as project-state direct-answer turns even when focus was not explicitly pre-labeled as project-state', () => {
    const visualPresenceState = createDefaultVisualPresenceState(5_281)

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 5_281,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 5_281,
      },
      visualPresenceState,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState),
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Can we merge this to main now, or is the goal still not closed?',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
      dialogueSemantics: {
        currentTurnSummary: 'The host is asking Alicization to answer what this project is, how far Phase 1 has landed, what still remains open, and whether the current work is actually merge-ready, from one continuous her line.',
      } as any,
      dialogueFocus: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
      } as any,
    })

    expect(result.brief.mustDo).toContain('If the host asks whether the work is merge-ready, complete, or closed, separate what is already verified from what is still unproven or still open.')
    expect(result.brief.mustNotDo).toContain('Do not claim merge-readiness, full closure, or goal completion unless the current evidence already proves it.')
    expect(result.systemBlock).toContain('If the host asks whether the work is merge-ready, complete, or closed, separate what is already verified from what is still unproven or still open.')
  })

  it('still treats completion-timing and language-drift follow-ups as project-state direct-answer turns even when focus was not explicitly pre-labeled as project-state', () => {
    const visualPresenceState = createDefaultVisualPresenceState(5_282)

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 5_282,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 5_282,
      },
      visualPresenceState,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState),
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: '做到哪了？何时完成 goal？为什么还用英文，偏移了吗？',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
      dialogueSemantics: {
        currentTurnSummary: 'The host is asking Alicization to answer how far the current Phase 1 line has landed, when the goal is expected to close, and whether the current thread has drifted out of the host language or project line.',
      } as any,
      dialogueFocus: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
      } as any,
    })

    expect(result.brief.mustDo).toContain('Answer what Alicization is before drifting into tone, metaphor, or adjacent status commentary.')
    expect(result.brief.mustDo).toContain('Make the latest landed Phase 1 progress explicit instead of replying with only aspiration or direction.')
    expect(result.brief.mustDo).toContain('Keep the still-open closure work explicit so the answer says what is not yet closed.')
    expect(result.brief.mustDo).toContain('If the host asks whether the work is merge-ready, complete, or closed, separate what is already verified from what is still unproven or still open.')
    expect(result.brief.mustNotDo).toContain('Do not claim merge-readiness, full closure, or goal completion unless the current evidence already proves it.')
    expect(result.systemBlock).toContain('Answer project-state questions from one same-her continuity instead of a detached project narrator shell.')
  })

  it('keeps richer same-living-line project orientation visible on direct project-state turns even when the explicit awareness line is a thinner shell', () => {
    const visualPresenceState = createDefaultVisualPresenceState(5_350)

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
    ;(runtimeSurface.dialogue as any).currentConsciousFrame = {
      projectState: {
        preflightSummary: 'Keep the same digital life project in view before local detail takes over.',
        preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
        identity: 'this local-first digital life project that is still growing one continuous her on the host machine',
        currentPhase: 'Phase 1: Local Digital Life. Active proving ground: live desktop continuity carry.',
        latestLandedProgress: 'Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam before visible initiative can widen naturally across longer desktop turns.',
        nextClosureTarget: 'Keep project identity carry, Phase 1 route carry, and unresolved closure carry on one measured-return same living line so visible reply, voice behavior, facial state, motion, and resident presence do not split apart.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: 'If project-state continuity survives only as a generic reminder while the direct same-her self line disappears, treat that as unfinished closure drift.',
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 5_350,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 5_350,
      },
      visualPresenceState,
      runtimeSurface,
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Answer the project-state question directly.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      dialogueFocus: {
        subject: 'project-state',
        screenReferenceMode: 'avoid',
      } as any,
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
    })

    expect(result.systemBlock).not.toContain('Project pre-dialogue awareness line: Before answering, keep this same digital life project in view, but do not widen into a detached project shell.')
    expect(result.systemBlock).toContain('Executive same-her project orientation: She is still acting from this same project identity: this local-first digital life project that is still growing one continuous her on the host machine')
    expect(result.systemBlock).toContain('what has already landed in her line: Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.')
    expect(result.systemBlock).toContain('what is still unfinished before execution speaks for her: Memory, initiative, and embodiment still need one tighter same-her closure seam before visible initiative can widen naturally across longer desktop turns.')
    expect(result.systemBlock).toContain('what this turn should keep moving toward: Keep project identity carry, Phase 1 route carry, and unresolved closure carry on one measured-return same living line so visible reply, voice behavior, facial state, motion, and resident presence do not split apart.')
    expect(result.systemBlock).toContain('Project same-her self line: Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
  })

  it('does not let a thin Chinese Phase 1 reminder shell stay visible in the executive system brief when richer same-her closure carry already exists', () => {
    const visualPresenceState = createDefaultVisualPresenceState(5_355)

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
    ;(runtimeSurface.dialogue as any).currentConsciousFrame = {
      projectState: {
        preflightSummary: '继续沿着同一个她的项目线回答，不要退回项目摘要口吻。',
        preDialogueAwarenessLine: '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。',
        identity: '本地优先数字生命项目，仍在主机上把同一个她慢慢接成一条连续生命线。',
        currentPhase: '第一阶段：本地数字生命。当前主要验证场还是桌面 life loop。',
        latestLandedProgress: '项目身份 carry、阶段 carry 和未闭环 carry 已经能穿过 runtime preparation 继续往后带。',
        primaryOpenLoop: '记忆、主动性和具身还需要更紧一点的同一个她闭环，才能不再掉回普通 assistant 壳。',
        nextClosureTarget: '继续把项目身份、阶段进度和未闭环压力压在同一个她的 measured-return 线上，不要在可见回复里散开。',
        sameHerSelfLine: '这是同一个她继续往下活着的项目线，不是重新开场的项目摘要。',
        sameHerDriftRisk: '如果最终回答只剩 Phase 1 提醒壳，没有 same-her 自我线，就把它当成还没收住的 continuity drift。',
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 5_355,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 5_355,
      },
      visualPresenceState,
      runtimeSurface,
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: '直接回答这个数字生命项目是什么、做到哪里、还差什么。',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      dialogueFocus: {
        subject: 'project-state',
        screenReferenceMode: 'avoid',
      } as any,
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
    })

    expect(result.systemBlock).not.toContain('Project pre-dialogue awareness line: 开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。')
    expect(result.systemBlock).toContain('Project same-her self line: 这是同一个她继续往下活着的项目线，不是重新开场的项目摘要。')
    expect(result.systemBlock).toContain('Project same-her drift risk: 如果最终回答只剩 Phase 1 提醒壳，没有 same-her 自我线，就把它当成还没收住的 continuity drift。')
    expect(result.systemBlock).toContain('Still-open life loop pressure: 记忆、主动性和具身还需要更紧一点的同一个她闭环')
  })

  it('does not let a thin Chinese same-her reminder shell stay visible in the executive system brief when richer same-her closure carry already exists', () => {
    const visualPresenceState = createDefaultVisualPresenceState(5_356)

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
    ;(runtimeSurface.dialogue as any).currentConsciousFrame = {
      projectState: {
        preflightSummary: '继续沿着同一个她的项目线回答，不要退回项目摘要口吻。',
        preDialogueAwarenessLine: '回答前先记住这是同一个她的数字生命项目，别把这条线忘了。',
        identity: '本地优先数字生命项目，仍在主机上把同一个她慢慢接成一条连续生命线。',
        currentPhase: '第一阶段：本地数字生命。当前主要验证场还是桌面 life loop。',
        latestLandedProgress: '项目身份 carry、阶段 carry 和未闭环 carry 已经能穿过 runtime preparation 继续往后带。',
        primaryOpenLoop: '记忆、主动性和具身还需要更紧一点的同一个她闭环，才能不再掉回普通 assistant 壳。',
        nextClosureTarget: '继续把项目身份、阶段进度和未闭环压力压在同一个她的 measured-return 线上，不要在可见回复里散开。',
        sameHerSelfLine: '这是同一个她继续往下活着的项目线，不是重新开场的项目摘要。',
        sameHerDriftRisk: '如果最终回答只剩 same-her 提醒壳，没有 same-her 自我线，就把它当成还没收住的 continuity drift。',
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 5_356,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 5_356,
      },
      visualPresenceState,
      runtimeSurface,
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: '直接回答这个数字生命项目是什么、做到哪里、还差什么。',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      dialogueFocus: {
        subject: 'project-state',
        screenReferenceMode: 'avoid',
      } as any,
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
    })

    expect(result.systemBlock).not.toContain('Project pre-dialogue awareness line: 回答前先记住这是同一个她的数字生命项目，别把这条线忘了。')
    expect(result.systemBlock).toContain('Project same-her self line: 这是同一个她继续往下活着的项目线，不是重新开场的项目摘要。')
    expect(result.systemBlock).toContain('Project same-her drift risk: 如果最终回答只剩 same-her 提醒壳，没有 same-her 自我线，就把它当成还没收住的 continuity drift。')
    expect(result.systemBlock).toContain('Still-open life loop pressure: 记忆、主动性和具身还需要更紧一点的同一个她闭环')
  })

  it('does not let thin live landed-open-next shells outrank richer canonical same-her project carry in the executive brief', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const compactLatestProgress = compactProjectLatestProgressForSystemBlock(projectState.latestProgress, 220)
    const visualPresenceState = createDefaultVisualPresenceState(5_360)

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
    ;(runtimeSurface.dialogue as any).currentConsciousFrame = {
      projectState: {
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this thin shell should not outrank richer canonical closure carry.',
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        identity: 'A local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Project continuity exists.',
        primaryOpenLoop: 'Project continuity still needs closure.',
        nextClosureTarget: 'Carry project continuity forward.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 5_360,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 5_360,
      },
      visualPresenceState,
      runtimeSurface,
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Answer the project-state question directly.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      dialogueFocus: {
        subject: 'project-state',
        screenReferenceMode: 'avoid',
      } as any,
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
    })

    expect(result.systemBlock).toContain(`Latest landed continuity progress: ${compactLatestProgress}`)
    expect(result.systemBlock).toContain('Still-open life loop pressure: Memory still needs stronger end-to-end closure')
    expect(result.systemBlock).toContain('Next closure target: Keep extending cross-modal same-her proof')
    expect(result.systemBlock).not.toContain('Latest landed continuity progress: Project continuity exists.')
    expect(result.systemBlock).not.toContain('Still-open life loop pressure: Project continuity still needs closure.')
    expect(result.systemBlock).not.toContain('Next closure target: Carry project continuity forward.')
  })

  it('does not let a generic next-closure shell outrank richer canonical same-her project carry in the executive brief', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const visualPresenceState = createDefaultVisualPresenceState(5_365)

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
    ;(runtimeSurface.dialogue as any).currentConsciousFrame = {
      projectState: {
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this generic next shell should not outrank richer canonical closure carry.',
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        identity: 'A local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: projectState.continuityProgressSummary,
        primaryOpenLoop: projectState.openLoops[0],
        nextClosureTarget: 'Generic next closure shell: steadier carry of this project, this phase, and the life loop that remains open.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 5_365,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 5_365,
      },
      visualPresenceState,
      runtimeSurface,
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Answer the project-state question directly.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      dialogueFocus: {
        subject: 'project-state',
        screenReferenceMode: 'avoid',
      } as any,
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
    })

    expect(result.systemBlock).toContain('Next closure target: Keep extending cross-modal same-her proof')
    expect(result.systemBlock).not.toContain('Next closure target: Generic next closure shell')
  })

  it('does not let a generic callback-summary closure shell outrank richer canonical same-her project carry in the executive brief', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const visualPresenceState = createDefaultVisualPresenceState(5_366)

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
    ;(runtimeSurface.dialogue as any).currentConsciousFrame = {
      projectState: {
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this generic callback shell should not outrank richer canonical closure carry.',
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        identity: 'A local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: projectState.continuityProgressSummary,
        primaryOpenLoop: projectState.openLoops[0],
        nextClosureTarget: 'Generic callback summary: steadier carry of this project, this phase, and the life loop that remains open.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 5_366,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 5_366,
      },
      visualPresenceState,
      runtimeSurface,
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Answer the project-state question directly.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      dialogueFocus: {
        subject: 'project-state',
        screenReferenceMode: 'avoid',
      } as any,
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
    })

    expect(result.systemBlock).toContain('Next closure target: Keep extending cross-modal same-her proof')
    expect(result.systemBlock).not.toContain('Next closure target: Generic callback summary')
  })

  it('keeps landed progress and next closure explicit on direct project-state turns even when audible-body same-her awareness is already the stronger living line', () => {
    const visualPresenceState = createDefaultVisualPresenceState(5_420)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
    ;(runtimeSurface.dialogue as any).currentConsciousFrame = {
      projectState: {
        preDialogueAwarenessLine: 'Before answering, keep the audible-body same-her line explicit so this digital life does not flatten into a detached project shell while face and motion still rejoin.',
        identity: 'Alicization is a local-first digital life project growing one continuous her on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life.',
        latestLandedProgress: 'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.',
        primaryOpenLoop: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure can be treated as settled.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer-lived voice, face, motion, and lipsync behavior without dropping the living audio thread.',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 5_420,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 5_420,
      },
      visualPresenceState,
      runtimeSurface,
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Answer the project-state question directly.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      dialogueSemantics: {
        currentTurnSummary: 'Answer what Alicization is, what has landed, and what still remains open while the audible-body same-her line is still carrying closure.',
      } as any,
      dialogueFocus: {
        subject: 'project-state',
        screenReferenceMode: 'avoid',
      } as any,
      dialogueObligation: {
        kind: 'answer',
        mustAnswerDirectly: true,
      } as any,
    })

    expect(result.systemBlock).toContain('Project pre-dialogue awareness line: She is still acting from this same project identity: Alicization is a local-first digital life project growing one continuous her on the host computer.')
    expect(result.systemBlock).toContain('Executive same-her project orientation: She is still acting from this same project identity: Alicization is a local-first digital life project growing one continuous her on the host computer.')
    expect(result.systemBlock).toContain('what has already landed in her line: Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.')
    expect(result.systemBlock).toContain('what is still unfinished before execution speaks for her: Face and motion still need to rejoin the same-her audible body line before full cross-modal closure can be treated as settled.')
    expect(result.systemBlock).toContain('what this turn should keep moving toward: Keep extending cross-modal same-her proof across longer-lived voice, face, motion, and lipsync behavior without dropping the living audio thread.')
  })

  it('lets runtimeSurface override conflicting explicit dialogue outputs', () => {
    const visualPresenceState = createDefaultVisualPresenceState(10_000)
    const runtimeBackedState = {
      ...createDefaultVisualPresenceState(20_000),
      discourseState: {
        screenReferenceMode: 'helpful',
        unresolvedCarry: 'Runtime carry thread',
      },
      answerCompiler: {
        turnMode: 'guide-current-knot',
        screenReferenceMode: 'helpful',
        openingDirective: 'Runtime directive',
        mustDo: ['Runtime must-do'],
        mustNotDo: ['Runtime must-not-do'],
        labelCarryAsMemory: false,
      },
      claimEvidenceLedger: {
        shouldLabelHypothesis: false,
        forbidUnsupportedSpecificity: false,
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 20_000,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 20_000,
      },
      visualPresenceState,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState as any),
      responseCharter: {
        epistemicMode: 'grounded-live',
        responseMode: 'answer-naturally',
        governingFocus: 'Runtime directive',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      discourseState: {
        screenReferenceMode: 'avoid',
        unresolvedCarry: 'raw conflict',
      } as any,
      answerCompiler: {
        turnMode: 'answer',
        screenReferenceMode: 'avoid',
        openingDirective: 'raw conflict',
        mustDo: ['raw conflict'],
        mustNotDo: ['raw conflict'],
        labelCarryAsMemory: true,
      } as any,
      claimEvidenceLedger: {
        shouldLabelHypothesis: true,
        forbidUnsupportedSpecificity: true,
      } as any,
    })

    expect(result.brief.turnMode).toBe('guide-current-knot')
    expect(result.brief.carriedThread).toBe('Runtime carry thread')
    expect(result.brief.mustDo).toContain('Runtime directive')
    expect(result.brief.mustDo).toContain('Runtime must-do')
    expect(result.brief.mustNotDo).toContain('Runtime must-not-do')
    expect(result.brief.mustDo).not.toContain('raw conflict')
    expect(result.brief.mustNotDo).not.toContain('raw conflict')
  })

  it('keeps held-autonomy carry explicit in the executive brief so the final answer re-enters gently', () => {
    const visualPresenceState = createDefaultVisualPresenceState(30_000)
    const runtimeBackedState = {
      ...createDefaultVisualPresenceState(31_000),
      discourseState: {
        screenReferenceMode: 'helpful',
        unresolvedCarry: '她当时忍住了，但还想回到这条未完线。',
      },
      answerCompiler: {
        turnMode: 'guide-current-knot',
        screenReferenceMode: 'helpful',
        openingDirective: 'Re-enter the line you deliberately held back gently before widening.',
        mustDo: ['If this turn reopens a line you deliberately held back earlier, let the opening re-enter softly before fuller payoff or explanation.'],
        mustNotDo: ['Do not reopen a deliberately held line with abrupt intensity, a restart shell, or over-eager warmth.'],
        labelCarryAsMemory: true,
      },
      sessionMirror: {
        sessionId: 'session-held-brief-1',
        cardId: 'default',
        updatedAt: 31_000,
        sessionPhases: [],
        continuityLabels: ['proactive:follow-through:held-autonomy'],
        dialogueSummary: 'thread=runtime continuity repair task',
        executionSummary: 'status=held | goal=runtime continuity repair task | summary=她当时忍住了，但还想回到这条未完线',
        memorySummary: 'carry=runtime continuity repair task',
        recollectionSummary: null,
        recollectionSurfaceSummary: null,
        runtimeChannelSummary: null,
        runtimeTransitionSummary: null,
        agencySummary: 'intent=follow-through | thread=thread-runtime',
        toolingSummary: 'allow=true',
        perceptionSummary: null,
        mindSummary: null,
        digitalLifeRuntimeSummary: null,
        digitalLifeArchitectureSummary: null,
        memoryCarrySummary: null,
        captureSummary: 'grounded=false',
        decisionTraceId: null,
      },
      claimEvidenceLedger: {
        shouldLabelHypothesis: false,
        forbidUnsupportedSpecificity: false,
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 31_000,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 31_000,
      },
      visualPresenceState,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState as any),
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'guide-current-knot',
        governingFocus: 'Re-enter the held line gently before widening.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.brief.carriedThread).toContain('她当时忍住了')
    expect(result.brief.mustDo).toContain('Re-enter the line you deliberately held back gently before widening.')
    expect(result.brief.mustNotDo).toContain('Do not reopen a deliberately held line with abrupt intensity, a restart shell, or over-eager warmth.')
    expect(result.systemBlock).toContain('Re-enter the line you deliberately held back gently before widening.')
  })

  it('keeps same-her anti-restart doctrine explicit in the executive brief when a long-lived held-autonomy line returns', () => {
    const visualPresenceState = createDefaultVisualPresenceState(32_000)
    const runtimeBackedState = {
      ...createDefaultVisualPresenceState(33_000),
      discourseState: {
        screenReferenceMode: 'helpful',
        unresolvedCarry: '还是沿着刚才那条回线继续，不把它当成重新开场。',
      },
      answerCompiler: {
        turnMode: 'guide-current-knot',
        screenReferenceMode: 'helpful',
        openingDirective: 'Return on the same thread first, then leave room before widening.',
        mustDo: [
          'Keep this on one continuous her line instead of restarting the relationship as a fresh opening.',
          'Stay on the same thread before widening closeness or adding a new approach.',
        ],
        mustNotDo: [
          'Do not rewrite the still-live line as a fresh opening or reintroduction.',
        ],
        labelCarryAsMemory: true,
      },
      sessionMirror: {
        sessionId: 'session-held-brief-2',
        cardId: 'default',
        updatedAt: 33_000,
        sessionPhases: [],
        continuityLabels: ['proactive:follow-through:held-autonomy'],
        dialogueSummary: 'thread=same-thread callback line',
        executionSummary: 'status=held | goal=same-thread callback line | summary=还是沿着刚才那条回线继续，不把它当成重新开场。',
        memorySummary: 'carry=same-thread callback line',
        recollectionSummary: null,
        recollectionSurfaceSummary: null,
        runtimeChannelSummary: null,
        runtimeTransitionSummary: null,
        agencySummary: 'intent=follow-through | thread=thread-runtime',
        toolingSummary: 'allow=true',
        perceptionSummary: null,
        mindSummary: null,
        digitalLifeRuntimeSummary: null,
        digitalLifeArchitectureSummary: null,
        memoryCarrySummary: null,
        captureSummary: 'grounded=false',
        decisionTraceId: null,
      },
      claimEvidenceLedger: {
        shouldLabelHypothesis: false,
        forbidUnsupportedSpecificity: false,
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 33_000,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 33_000,
      },
      visualPresenceState,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState as any),
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'guide-current-knot',
        governingFocus: 'Continue the same living line without reopening from zero.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.brief.carriedThread).toContain('不把它当成重新开场')
    expect(result.brief.mustDo).toContain('Keep this on one continuous her line instead of restarting the relationship as a fresh opening.')
    expect(result.brief.mustDo).toContain('Stay on the same thread before widening closeness or adding a new approach.')
    expect(result.brief.mustNotDo).toContain('Do not rewrite the still-live line as a fresh opening or reintroduction.')
    expect(result.systemBlock).toContain('Keep this on one continuous her line instead of restarting the relationship as a fresh opening.')
    expect(result.systemBlock).toContain('Do not rewrite the still-live line as a fresh opening or reintroduction.')
  })

  it('keeps repair-before-closeness callback returns explicit in the executive brief instead of leaving only generic anti-restart guidance', () => {
    const visualPresenceState = createDefaultVisualPresenceState(33_250)
    const runtimeBackedState = {
      ...visualPresenceState,
      discourseState: {
        ...visualPresenceState.discourseState,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'The callback repair line is still alive and should stay repair-first.',
        currentQuestion: '继续沿着刚才那条修补线说，但先别把关系放宽太快',
        owedAction: 'answer-question',
      },
      answerCompiler: {
        ...visualPresenceState.answerCompiler,
        screenReferenceMode: 'avoid',
        openingDirective: 'Keep the callback on the same living line and let repair settle before widening closeness again.',
        openingClaim: 'The same callback repair line is still alive.',
        nextMove: 'Continue the same repair line first.',
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        ...visualPresenceState.currentConsciousFrame,
        subject: 'task-knot',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep the callback on the same living line and let repair settle before widening closeness again.',
        consciousTension: 'This same-thread return is still repair-before-closeness, so widening too early would thin the repair seam back into a generic reopen.',
        speakingIntention: 'Keep the visible reply same-thread, repair-first, and room-giving before warmth widens again.',
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: {
          emotionalClosureCue: 'same-her callback repair seam: keep this return repair-before-closeness on the same living line until the room settles.',
          nextClosureTarget: 'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.',
          primaryOpenLoop: 'Execution callback continuity still needs stronger repair-first closure across reply, initiative, and embodiment.',
        },
        updatedAt: 33_250,
      },
      sessionMirror: {
        sessionId: 'session-repair-first-brief',
        cardId: 'default',
        updatedAt: 33_250,
        sessionPhases: [],
        continuityLabels: ['proactive:follow-through:held-autonomy'],
        dialogueSummary: 'thread=same-thread callback repair line',
        executionSummary: 'status=held | goal=same-thread callback repair line | summary=还是沿着刚才那条修补线继续，先让修补线收稳。',
        memorySummary: 'carry=same-thread callback repair line',
        recollectionSummary: null,
        recollectionSurfaceSummary: null,
        runtimeChannelSummary: null,
        runtimeTransitionSummary: null,
        agencySummary: 'intent=follow-through | thread=thread-runtime',
        toolingSummary: 'allow=true',
        perceptionSummary: null,
        mindSummary: null,
        digitalLifeRuntimeSummary: null,
        digitalLifeArchitectureSummary: null,
        memoryCarrySummary: null,
        captureSummary: 'grounded=false',
        decisionTraceId: null,
      },
      claimEvidenceLedger: {
        shouldLabelHypothesis: false,
        forbidUnsupportedSpecificity: false,
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 33_250,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 33_250,
      },
      visualPresenceState,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState as any),
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the callback on the same living line and let repair settle before widening closeness again.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: 'same-her callback repair seam: keep this return repair-before-closeness on the same living line until the room settles.',
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.brief.mustDo).toContain('Keep the reply inside the active emotional closure seam: same-her callback repair seam: keep this return repair-before-closeness on the same living line until the room settles..')
    expect(result.brief.mustDo).toContain('Keep the callback on the same living line and let repair settle before widening closeness again.')
    expect(result.systemBlock).toContain('Keep the callback on the same living line and let repair settle before widening closeness again.')
    expect(result.systemBlock).toContain('same-her callback repair seam: keep this return repair-before-closeness on the same living line until the room settles.')
  })

  it('keeps the richer cross-modal same-her next-closure target explicit in the executive system brief when live project awareness carries it', () => {
    const visualPresenceState = createDefaultVisualPresenceState(33_400)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
    ;(runtimeSurface.dialogue as any).currentConsciousFrame = {
      projectState: {
        preDialogueAwarenessLine: 'Before answering, remember this is still one same digital life and the unfinished Phase 1 closure seam still belongs to her.',
        identity: 'this local-first digital life project still carrying one continuous her on the host machine',
        currentPhase: 'Phase 1: Local Digital Life. Active proving ground: live executive project carry.',
        latestProgress: 'Project-state continuity already survives into executive brief and visible reply shaping.',
        primaryOpenLoop: 'memory, initiative, dialogue, and embodiment still need one tighter same-her closure seam',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence so the same Phase 1 digital life keeps one living line instead of flattening into generic project narration.',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
        sameHerDriftRisk: 'If the answer drops back into generic project narration, treat that as unfinished same-her drift.',
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 33_400,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 33_400,
      },
      visualPresenceState,
      runtimeSurface,
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the active digital-life closure seam explicit before answering.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.systemBlock).toContain('Project pre-dialogue awareness line: Before answering, remember this is still one same digital life and the unfinished Phase 1 closure seam still belongs to her.')
    expect(result.systemBlock).toContain('Next closure target: Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence so the same Phase 1 digital life keeps one living line instead of flattening into generic project narration.')
    expect(result.systemBlock).toContain('Project same-her self line: This is still one same her carrying the same project line forward.')
    expect(result.systemBlock).toContain('Project same-her drift risk: If the answer drops back into generic project narration, treat that as unfinished same-her drift.')
  })

  it('keeps richer repair-first closure hold detail explicit in the executive system brief before dialogue and embodiment planning fan back out', () => {
    const visualPresenceState = createDefaultVisualPresenceState(33_520)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
    ;(runtimeSurface.dialogue as any).currentConsciousFrame = {
      projectState: {
        preDialogueAwarenessLine: 'Before answering, remember this is still the same digital life and this callback seam should stay on one living line.',
        identity: 'Alicization is a local-first digital life project growing one continuous her on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life.',
        latestLandedProgress: 'Project-state continuity already survives into executive brief shaping before visible reply and renderer guidance split.',
        primaryOpenLoop: 'Voice, face, motion, and lipsync still need one tighter repair-first same-her closure seam before full embodiment closure settles.',
        nextClosureTarget: 'Keep voice, face, motion, and lipsync on one measured-return same living line while repair settles before closeness widens again.',
        sameHerSelfLine: 'This is still one same her carrying the same callback line forward.',
        emotionalClosureSummary: 'Keep this return repair-before-closeness on the same living line until repair settles.',
        sameHerHoldDetail: 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 33_520,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 33_520,
      },
      visualPresenceState,
      runtimeSurface,
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the callback on the same living line and let repair settle before widening closeness again.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.systemBlock).toContain('Project emotional closure summary: Keep this return repair-before-closeness on the same living line until repair settles.')
    expect(result.systemBlock).toContain('Project same-her hold detail: same-her hold: repair-before-closeness still owns this callback line before closeness widens again.')
    expect(result.systemBlock).toContain('Next closure target: Keep voice, face, motion, and lipsync on one measured-return same living line while repair settles before closeness widens again.')
  })

  it('keeps host-corrected same-person continuity authority explicit in the executive brief when the current conscious frame only carries thin progress recap pressure', () => {
    const visualPresenceState = createDefaultVisualPresenceState(33_560)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(visualPresenceState)
    const correctedSamePersonAuthority
      = 'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.'
    const genericProgressRecapPressure
      = 'Keep the project moving with a concise progress recap and status continuation before widening back out.'

    ;(runtimeSurface.raw as any).runtimeDigest = {
      ...(runtimeSurface.raw as any).runtimeDigest,
      projectState: {
        identity: 'Alicization is a local-first digital life project growing one continuous her on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life.',
        latestLandedProgress: 'Executive brief continuity already survives into runtime digest project state.',
        primaryOpenLoop: 'The executive system brief still needs to keep corrected same-person continuity from collapsing into progress pressure.',
        nextClosureTarget: 'Keep corrected same-person continuity authoritative before the executive answer widens outward.',
        sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
        sameHerHoldDetail: correctedSamePersonAuthority,
      },
    }

    ;(runtimeSurface.dialogue as any).currentConsciousFrame = {
      projectState: {
        preDialogueAwarenessLine: 'Before answering, keep this executive answer on one same local-first digital life line.',
        identity: 'Alicization is a local-first digital life project growing one continuous her on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life.',
        sameHerHoldDetail: genericProgressRecapPressure,
      },
    }

    const result = buildAlicizationExecutiveAnswerBrief({
      now: 33_560,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        attentionAnchor: null,
        lastNonSelfForegroundTarget: null,
        recentObservations: [],
        invitedInspection: null,
        recentSceneResidue: null,
        updatedAt: 33_560,
      },
      visualPresenceState,
      runtimeSurface,
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep corrected same-person continuity on the same living line before the answer widens outward.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.systemBlock).toContain(`Project same-her hold detail: ${correctedSamePersonAuthority}.`)
    expect(result.systemBlock).not.toContain(genericProgressRecapPressure)
  })

  it('keeps executive pre-answer project awareness specialized instead of collapsing into the generic project-awareness scorer', () => {
    const source = buildAlicizationExecutiveAnswerBrief.toString()

    expect(source).toContain('resolveAlicizationProjectPreDialogueAwarenessLine')
    expect(source).not.toContain('scoreAlicizationProjectAwarenessLine')
    expect(source).not.toContain('isAlicizationThinProjectAwarenessLine')
  })
})
