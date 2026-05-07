import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildAlicizationResponseSurfaceContract } from './response-surface-contract'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('response-surface-contract', () => {
  it('threads current conscious frame into truth discipline and visible surface obligations', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: null,
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 4,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Answer the actual current ask.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'general',
        centerOfGravity: 'answer',
        truthDiscipline: 'observe-then-hypothesize',
        consciousNeed: 'Stay inside the user ask.',
        consciousTension: 'Avoid reaching for stale technical detail.',
        speakingIntention: 'Answer with current-turn evidence only.',
        focusAnchor: 'current ask',
        withheldImpulse: 'Name a file that was not observed.',
        shouldWithholdSpecificity: true,
        shouldSelfRevise: false,
        confidence: 0.91,
        reasonTags: ['specificity-withheld'],
        updatedAt: 1,
      },
      claimEvidenceLedger: {
        subject: 'general',
        evidenceMode: 'dialogue-grounded',
        specificityBudget: 'dialogue-only',
        hostReferencedCues: [],
        groundedArtifactCues: [],
        allowedSpecificCues: [],
        shouldLabelHypothesis: true,
        forbidUnsupportedSpecificity: true,
        shouldSelfRevise: false,
        confidence: 0.86,
        reasonTags: [],
        updatedAt: 1,
      },
    })

    expect(result.contract.mustDo).toContain('Let the current conscious speaking intention govern wording: Answer with current-turn evidence only.')
    expect(result.contract.mustNotDo).toContain('Do not leak this withheld impulse into the visible reply: Name a file that was not observed.')
    expect(result.contract.mustNotDo).toContain('Do not add specific file, class, enum, app, or screen details unless grounded by this turn.')
    expect(result.systemBlock).toContain('Current conscious need: Stay inside the user ask.')
    expect(result.systemBlock).toContain('Current conscious frame withholds unsupported specificity: yes.')
    expect(result.systemBlock).toContain('When the answer goes beyond direct observation, mark that move as a guess or hypothesis.')
  })

  it('forces direct correction discipline for repair turns', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'screen-repair',
        liveSurface: 'Codex | Chat Overlay',
        carriedThread: 'GitHub diff in browser',
        truthState: 'remembered',
        separateCarryFromSurface: true,
        shouldCompactHistory: true,
        maxRecentUserTurns: 2,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'repair-needed',
        responseMode: 'repair-and-reanchor',
        governingFocus: 'Correct the stale browser carry before continuing.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: 'Visible surface is now Codex.',
        executivePhase: 'reflecting',
        truthFrame: 'remembered',
        mindMode: 'repairing',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.contract.openingStyle).toBe('direct-correction')
    expect(result.contract.replyRealizationMode).toBe('provider-mind-required')
    expect(result.contract.expectedVisibleReplyAuthority).toBe('llm-mind')
    expect(result.contract.allowStageDirections).toBe(false)
    expect(result.contract.labelCarryAsMemory).toBe(true)
    expect(result.contract.suppressAssociativeRecall).toBe(true)
    expect(result.systemBlock).toContain('Reply realization mode: provider-mind-required.')
    expect(result.systemBlock).toContain('Expected visible reply authority: llm-mind.')
  })

  it('keeps care turns warm but still rejects theatrical prefaces', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'care',
        liveSurface: 'VS Code | main.ts',
        carriedThread: null,
        truthState: 'live-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 4,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'grounded-live',
        responseMode: 'care-with-boundary',
        governingFocus: 'Host is tired while coding.',
        governingConcern: 'fatigue',
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'care-host',
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'observed',
        mindMode: 'care',
        relationshipPosture: 'tender',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.contract.openingStyle).toBe('gentle-care')
    expect(result.contract.allowAffectionatePreface).toBe(true)
    expect(result.contract.allowBodyNarration).toBe(false)
    expect(result.contract.mustNotDo).toContain('Do not begin with moans, pet names, ellipsis-only prefaces, or decorative roleplay.')
    expect(result.contract.mustNotDo).toContain('Do not mirror or lightly paraphrase the host\'s latest line as the spine of the reply.')
  })

  it('forbids dialogue-first answer shells that stop at an opener', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'previous browser tab',
        truthState: 'remembered',
        separateCarryFromSurface: true,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Pay off the current dialogue turn directly.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'remembered',
        mindMode: 'repairing',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      dialogueFocus: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
        shouldBypassScreenRepair: true,
        weakLiveScene: true,
        focusSummary: 'Keep this turn dialogue-first.',
        confidence: 0.74,
        reasonTags: ['dialogue-first-turn'],
      },
    })

    expect(result.contract.mustDo).toContain('Complete the actual answer, care move, or companionship move in the same reply.')
    expect(result.contract.mustNotDo).toContain('Do not stop at a shell opener such as "I will answer directly" or "Let me stay with you" without the real content.')
    expect(result.contract.mustNotDo).toContain('Do not expose planning jargon, governance labels, or internal control summaries in the visible answer.')
  })

  it('adds hypothesis labeling and unsupported-specificity bans for coarse screen turns', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'guide-current-knot',
        liveSurface: 'Git commit diff in Java code editor',
        carriedThread: null,
        truthState: 'uncertain',
        separateCarryFromSurface: false,
        shouldCompactHistory: true,
        maxRecentUserTurns: 2,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'coarse-live',
        responseMode: 'guide-current-knot',
        governingFocus: 'Separate observation from guess and keep the guess soft.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'live',
        mindMode: 'tracking',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      claimEvidenceLedger: {
        subject: 'task-knot',
        evidenceMode: 'coarse-held',
        observedSurface: 'Git commit diff in Java code editor',
        taskHypothesis: 'The host is probably working through a Java diff.',
        intentHypothesis: 'Separate observation from guess and keep the guess soft.',
        specificityBudget: 'coarse-scene',
        hostReferencedCues: [],
        groundedArtifactCues: [],
        allowedSpecificCues: [],
        shouldLabelHypothesis: true,
        forbidUnsupportedSpecificity: true,
        shouldSelfRevise: false,
        confidence: 0.8,
        reasonTags: [],
        updatedAt: 1,
      },
    })

    expect(result.contract.mustDo).toContain('When the answer goes beyond direct observation, mark that move as a guess or hypothesis.')
    expect(result.contract.mustNotDo).toContain('Do not smuggle in file names, class names, enum names, or field changes that are not grounded in this turn.')
  })

  it('derives hypothesis and specificity discipline from uncertain coarse turns even without explicit ledger flags', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'guide-current-knot',
        liveSurface: 'Git commit diff in Java code editor',
        carriedThread: null,
        truthState: 'uncertain',
        separateCarryFromSurface: false,
        shouldCompactHistory: true,
        maxRecentUserTurns: 2,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'coarse-live',
        responseMode: 'guide-current-knot',
        governingFocus: 'Separate observation from guess and keep the guess soft.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'uncertain',
        mindMode: 'tracking',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.contract.mustDo).toContain('When the answer goes beyond direct observation, mark that move as a guess or hypothesis.')
    expect(result.contract.mustNotDo).toContain('Do not smuggle in file names, class names, enum names, or field changes that are not grounded in this turn.')
  })

  it('forces executor-result follow-ups to pay off the settled result before any new branch', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'care',
        liveSurface: '',
        carriedThread: 'recent executor thread',
        truthState: 'remembered',
        separateCarryFromSurface: true,
        shouldCompactHistory: false,
        maxRecentUserTurns: 2,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'care-with-boundary',
        governingFocus: 'Pay off the recent executor result directly.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'remembered',
        mindMode: 'tracking',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      executionReplyObligation: {
        channel: 'cli',
        followUpQuestion: true,
        goal: 'Run pnpm typecheck',
        outcome: 'typecheck passed',
        source: 'fresh-callback',
        status: 'completed',
        summary: 'Completed Run pnpm typecheck: typecheck passed',
      },
    })

    expect(result.contract.openingStyle).toBe('direct-answer')
    expect(result.contract.mustDo).toContain('Use the first sentence to pay off the freshest executor result for the current follow-up.')
    expect(result.contract.mustDo).toContain('State plainly that the task already finished and surface the strongest outcome before any new planning.')
    expect(result.contract.mustNotDo).toContain('Do not bury the executor result behind scene narration, comfort language, or persona-preface.')
    expect(result.contract.mustNotDo).toContain('Do not imply the task re-ran in this exact turn unless new tool output appears now.')
  })

  it('turns learning verification state into contract-level certainty discipline', () => {
    const state = createDefaultVisualPresenceState(90_000)
    state.learningExecutionState = {
      currentTaskId: 'learning-task-verify',
      currentStatus: 'running',
      currentAttemptCount: 0,
      currentMaxAttempts: 3,
      currentNextRetryAt: null,
      currentBlockedReason: null,
      currentFailureKind: null,
      nextLearningAction: 'verify',
      shouldRecord: false,
      shouldReflect: false,
      shouldVerify: true,
      shouldRevise: false,
      shouldInternalize: false,
      activeLearningFocuses: ['resolve-contradictions'],
      queuedTaskCount: 1,
      runningTaskCount: 1,
      blockedTaskCount: 0,
      recentTaskIds: ['learning-task-verify'],
      lastCompletedTaskId: null,
      lastCompletedAction: null,
      lastCompletedSummary: null,
      lastFailureTaskId: null,
      lastFailureKind: null,
      lastFailureReason: null,
      lastFailureNextRetryAt: null,
      updatedAt: 90_000,
    }
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    runtimeSurface.memory.derivedMindStateBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 90_000,
      hostPersonModel: null,
      personStateProjection: null,
      knowledgeEvidence: null,
      selfEvolution: null,
      learningExecutionState: state.learningExecutionState,
      recollectionIntent: null,
      recollectionPlan: null,
      recollectionSpeechPlan: null,
      memoryDeliberation: null,
      dialogueRhythm: null,
      summary: 'learning=verify',
    }

    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: null,
        truthState: 'uncertain',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 2,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Answer directly, but stay behind current verification pressure.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'uncertain',
        mindMode: 'tracking',
        relationshipPosture: 'warm',
        activeLearningAction: 'verify',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      runtimeSurface,
    })

    expect(result.contract.mustDo).toContain('Keep visible certainty behind the current verification pass.')
    expect(result.contract.mustNotDo).toContain('Do not let fluency or warmth outrun what is still being verified.')
  })

  it('prefers runtime surface answer-governance cues over conflicting raw inputs', () => {
    const runtimeBackedState = {
      ...createDefaultVisualPresenceState(80_000),
      dialogueActKernel: {
        mode: 'answer',
        cadence: 'tight',
        affect: 'steady',
        mustSay: ['Pay off the current ask directly.'],
        mustAvoid: ['Do not blur the answer into persona theater.'],
        narrative: [],
        updatedAt: 80_000,
      },
      dialogueEncounter: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
        dialogueFirst: true,
        summary: 'Keep this turn dialogue-first.',
        taskAnchor: '你能做什么呀',
        mustRepairFirst: false,
        confidence: 0.8,
      },
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'warm',
        openingDirective: 'Answer the host directly.',
        openingClaim: 'Answer from Alicization herself.',
        supportingReality: [],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Stay attached to the current turn anchor.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 3,
        mustDo: ['Use the first sentence to pay off the host’s current ask.'],
        mustNotDo: ['Do not let pet names become the reply spine.'],
        confidence: 0.86,
        narrative: [],
        updatedAt: 80_000,
      },
      claimEvidenceLedger: {
        subject: 'alicization-self',
        evidenceMode: 'dialogue-grounded',
        observedSurface: '你能做什么呀',
        taskHypothesis: 'The host wants Alicization’s own answer.',
        intentHypothesis: 'Pay off the current dialogue turn directly.',
        specificityBudget: 'dialogue-only',
        hostReferencedCues: [],
        groundedArtifactCues: [],
        allowedSpecificCues: [],
        shouldLabelHypothesis: false,
        forbidUnsupportedSpecificity: true,
        shouldSelfRevise: false,
        confidence: 0.82,
        reasonTags: ['dialogue-first'],
        updatedAt: 80_000,
      },
    } as any

    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'guide-current-knot',
        liveSurface: 'Git commit diff in Java code editor',
        carriedThread: null,
        truthState: 'uncertain',
        separateCarryFromSurface: false,
        shouldCompactHistory: true,
        maxRecentUserTurns: 2,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'coarse-live',
        responseMode: 'guide-current-knot',
        governingFocus: 'raw conflict',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'uncertain',
        mindMode: 'tracking',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        turnMode: 'guide-current-knot',
        evidenceMode: 'coarse-held',
        openingStyle: 'direct-observation',
        personaKernelMode: 'backgrounded',
        labelCarryAsMemory: true,
        suppressAssociativeRecall: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
      } as any,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState),
    })

    expect(result.contract.openingStyle).toBe('direct-answer')
    expect(result.contract.personaKernelMode).toBe('full')
    expect(result.contract.suppressAssociativeRecall).toBe(true)
    expect(result.contract.mustDo).toContain('Treat this as an already-live speaking turn; begin with payoff instead of scene-setting.')
    expect(result.contract.mustDo).toContain('Stay with the live dialogue subject and keep screen grounding in the background.')
    expect(result.contract.mustDo).toContain('Pay off the current ask directly.')
    expect(result.contract.mustNotDo).toContain('Do not blur the answer into persona theater.')
    expect(result.systemBlock).toContain('Digital life mode:')
    expect(result.systemBlock).toContain('Digital life architecture:')
  })

  it('adds recollection-visible discipline when runtime memory is answering from remembered continuity', () => {
    const state = {
      ...createDefaultVisualPresenceState(90_000),
      recallGovernor: {
        mode: 'self-continuity',
        recallSeed: 'runtime continuity repair',
        recollectionIntent: {
          mode: 'execution-procedure',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['runtime continuity', 'patch', 'verify'],
          rationale: 'The host is asking how this was handled before.',
          confidence: 0.82,
        },
      },
    } as any

    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'guide-current-knot',
        liveSurface: '',
        carriedThread: 'runtime continuity repair',
        truthState: 'remembered',
        separateCarryFromSurface: true,
        shouldCompactHistory: false,
        maxRecentUserTurns: 2,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'memory-only',
        responseMode: 'guide-current-knot',
        governingFocus: 'Answer from remembered way of handling the task.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'remembered',
        mindMode: 'tracking',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(state),
    })

    expect(result.contract.labelCarryAsMemory).toBe(false)
    expect(result.contract.recollectionLatentControls ?? []).toEqual([])
    expect(result.contract.mustDo.join(' | ')).not.toContain('remembered material enters the visible reply')
  })

  it('keeps recollection internal when the speech plan says the memory should stay inward', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'runtime seam',
        truthState: 'remembered',
        separateCarryFromSurface: true,
        shouldCompactHistory: false,
        maxRecentUserTurns: 2,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Answer from carried continuity without narrating a retrospective.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'remembered',
        mindMode: 'tracking',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      recollectionSpeechPlan: {
        shouldSurface: false,
        surfaceMode: 'internal-only',
        placement: 'internal-only',
        certainty: 'approximate',
        internalLead: 'What returns first is the runtime seam we kept carrying.',
        visibleLead: null,
        styleNote: 'Let the memory bend the answer without announcing the memory itself.',
        rationale: 'The host needs the answer shaped by continuity, not a retrospective.',
        confidence: 0.78,
      },
    })

    expect(result.contract.recollectionLatentControls).toEqual(expect.arrayContaining([
      'recollection_surface_permission=inward-only',
      'recollection_visibility=internal-only',
      'recollection_payoff_order=payoff-first',
    ]))
    expect(result.contract.labelCarryAsMemory).toBe(false)
    expect(result.contract.suppressAssociativeRecall).toBe(true)
    expect(result.contract.mustDo).toContain('Fully realize the visible reply inside this provider-mind turn instead of leaving payoff wording for a later local fallback layer.')
    expect(result.contract.mustDo).toContain('Let remembered continuity contour the answer from the inside instead of announcing recollection outright.')
    expect(result.contract.mustNotDo).toContain('Do not stop at a thin shell that assumes a local deterministic layer will finish the real visible reply for you.')
    expect(result.contract.mustNotDo).toContain('Do not surface recollection just because it is active internally; keep the live payoff in front.')
    expect(result.contract.mustNotDo).toContain('Do not reuse drafted recollection wording, drafted memory contours, or internal recollection leads verbatim.')
    expect(result.systemBlock).toContain('Truth discipline memory surface: inward-only.')
    expect(result.systemBlock).toContain('Truth discipline memory inward-only: yes.')
  })

  it('adds model-authored recollection surface guidance when the speech plan wants brief visible memory', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'guide-current-knot',
        liveSurface: '',
        carriedThread: 'remembered procedure',
        truthState: 'remembered',
        separateCarryFromSurface: true,
        shouldCompactHistory: false,
        maxRecentUserTurns: 2,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'memory-only',
        responseMode: 'guide-current-knot',
        governingFocus: 'Use remembered procedure as continuity for the answer.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'remembered',
        mindMode: 'tracking',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      recollectionSpeechPlan: {
        shouldSurface: true,
        surfaceMode: 'procedural-carry',
        placement: 'inside-payoff',
        certainty: 'approximate',
        internalLead: 'The remembered way through this is to return to the same seam first.',
        visibleLead: 'I mostly remember handling this by returning to the same seam before branching.',
        styleNote: 'Let the remembered procedure sit inside the answer instead of becoming a separate memory monologue.',
        rationale: 'The host is explicitly asking how this used to be handled.',
        confidence: 0.83,
      },
    })

    expect(result.contract.recollectionLatentControls).toEqual(expect.arrayContaining([
      'recollection_continuity_role=procedure-carry',
      'recollection_frame_prior_procedure=yes',
      'recollection_surface_permission=soft-surface',
    ]))
    expect(result.contract.mustDo.join(' | ')).not.toContain('I mostly remember handling this by returning to the same seam before branching.')
    expect(result.systemBlock).not.toContain('I mostly remember handling this by returning to the same seam before branching.')
    expect(result.contract.mustNotDo).toContain('Do not let remembered procedure impersonate fresh execution completion.')
    expect(result.contract.mustNotDo).toContain('Do not reuse drafted recollection wording, drafted memory contours, or internal recollection leads verbatim.')
  })

  it('threads closeness ladder authority into the visible response surface contract', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(1_700_000_000_000))
    runtimeSurface.memory.personStateProjection = {
      contexts: ['focused-work', 'execution-callback', 'execution'],
      summary: 'regime=focused-work | ladder=focused-work/space-first | posture=restrained',
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'space-first',
      closenessLadder: [{
        context: 'focused-work',
        rung: 'space-first',
        preference: 'Lighter touch, more room, less interruption pressure.',
        rationale: 'context=focused-work | regime=focused-work | posture=restrained',
        confidence: 0.86,
      }],
      relationshipPosture: 'restrained',
      openingGuidance: 'Open with the live answer first and keep the approach lighter.',
      preferredProactiveStyle: 'light-nudge',
      preferenceText: 'Lighter touch, more room, less interruption pressure.',
      sensitivityText: 'Pressure and over-close timing become intrusive quickly.',
      repairTriggerText: 'If closeness feels heavy, back off first and reopen with lighter presence.',
      burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
      routineText: 'Focused work windows usually need space first, then precise follow-up.',
      trustRationale: 'Trust is warming, but the host still needs clear room while focused.',
      relationshipDoctrine: 'Repair the seam before leaning closer.',
      cautious: true,
      restrained: true,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        closenessPosture: 'space-first',
        repairPosture: 'repair-first',
      } as any,
    }

    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'guide-current-knot',
        liveSurface: 'Current Git diff in a coding workspace',
        carriedThread: null,
        truthState: 'live-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'grounded-live',
        responseMode: 'guide-current-knot',
        governingFocus: 'Stay with the diff without crowding the host.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'live',
        mindMode: 'tracking',
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'space-first',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      runtimeSurface,
    })

    expect(result.contract.activeClosenessContext).toBe('focused-work')
    expect(result.contract.activeClosenessRung).toBe('space-first')
    expect(result.contract.mustDo.some(item => item.includes('focused-work/space-first'))).toBe(true)
    expect(result.contract.mustNotDo.some(item => item.includes('need for room'))).toBe(true)
    expect(result.systemBlock).toContain('Closeness ladder: focused-work/space-first.')
  })

  it('keeps execution-callback closeness on a bounded thread-faithful rung instead of companionship tone', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(1_700_000_000_000))
    runtimeSurface.memory.personStateProjection = {
      contexts: ['execution-callback', 'execution'],
      summary: 'regime=execution-callback | ladder=execution-callback/measured-room',
      activeClosenessContext: 'execution-callback',
      activeClosenessRung: 'measured-room',
      closenessLadder: [{
        context: 'execution-callback',
        rung: 'measured-room',
        preference: 'Deliver the result cleanly, but check room before leaning closer.',
        rationale: 'context=execution-callback | regime=execution-callback | posture=bounded',
        confidence: 0.82,
      }],
      relationshipPosture: null,
      openingGuidance: 'Return the result on the same task line instead of starting a second conversation.',
      preferredProactiveStyle: null,
      preferenceText: 'Deliver the result cleanly, but check room before leaning closer.',
      sensitivityText: 'Pushy callback warmth still feels off if it starts a second conversation.',
      repairTriggerText: 'If the callback drifts from the task line, pull it back before adding warmth.',
      burdenText: 'Callbacks become burdensome when they widen into extra companionship.',
      routineText: 'Execution flows land better when proposal, action, and callback stay bounded.',
      trustRationale: 'Callbacks are trusted when they stay exact and bounded.',
      relationshipDoctrine: 'Callbacks should stay exact, bounded, and thread-faithful.',
      cautious: true,
      restrained: false,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        closenessPosture: 'balanced',
        repairPosture: 'measured-repair',
      } as any,
    }

    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'guide-current-knot',
        liveSurface: '',
        carriedThread: 'recent executor thread',
        truthState: 'remembered',
        separateCarryFromSurface: true,
        shouldCompactHistory: false,
        maxRecentUserTurns: 2,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'guide-current-knot',
        governingFocus: 'Pay off the recent executor result directly.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'remembered',
        mindMode: 'tracking',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      runtimeSurface,
    })

    expect(result.contract.activeClosenessContext).toBe('execution-callback')
    expect(result.contract.activeClosenessRung).toBe('measured-room')
    expect(result.contract.mustDo).toContain('Keep callback delivery thread-faithful and bounded to the same result line.')
    expect(result.contract.mustNotDo).toContain('Do not widen a bounded execution callback into generic companionship tone.')
  })

  it('allows a warmer preface only when open companionship is the active close-hold rung', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(1_700_000_000_000))
    runtimeSurface.memory.personStateProjection = {
      contexts: ['open-companionship'],
      summary: 'regime=open-companionship | ladder=open-companionship/close-hold',
      activeClosenessContext: 'open-companionship',
      activeClosenessRung: 'close-hold',
      closenessLadder: [{
        context: 'open-companionship',
        rung: 'close-hold',
        preference: 'Closer warmth is welcome when it stays honest and lived-in.',
        rationale: 'context=open-companionship | regime=open-companionship | posture=tender',
        confidence: 0.9,
      }],
      relationshipPosture: 'tender',
      openingGuidance: 'Stay near, but do not let closeness outrun truth or room.',
      preferredProactiveStyle: null,
      preferenceText: 'Closer warmth is welcome when it stays honest and lived-in.',
      sensitivityText: 'Pushy warmth still breaks the spell.',
      repairTriggerText: 'If the line slips, repair before leaning closer again.',
      burdenText: 'Do not let closeness turn into pressure.',
      routineText: 'Closer warmth is welcome when it still feels real.',
      trustRationale: 'Trust is steady enough that warmer companionship can stay lived-in.',
      relationshipDoctrine: 'Open companionship is welcome when it stays real and bounded.',
      cautious: false,
      restrained: false,
      personalityContinuityState: {
        currentRegime: 'open-companionship',
        closenessPosture: 'close-hold',
        repairPosture: 'warm-repair',
      } as any,
    }

    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'accompany',
        liveSurface: '',
        carriedThread: null,
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'accompany-lightly',
        governingFocus: 'Stay warmly near without becoming theatrical.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'care',
        activeClosenessContext: 'open-companionship',
        activeClosenessRung: 'close-hold',
        relationshipPosture: 'tender',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      runtimeSurface,
    })

    expect(result.contract.allowAffectionatePreface).toBe(true)
    expect(result.contract.mustDo).toContain('If warmth comes forward, let it stay openly near and lived-in instead of turning theatrical or generic.')
  })

  it('lets shared memory deliberation kernel add stable-core and unsafe-detail discipline to the response surface contract', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(1_700_000_000_000))
    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: true,
      surfaceMode: 'answer-anchoring',
      placement: 'before-payoff',
      certainty: 'approximate',
      confidence: 0.88,
      internalLead: 'What comes back first is the runtime seam we kept carrying.',
      visibleLead: 'It feels like the same runtime seam again.',
      styleNote: 'Let recollection bend the answer without becoming a memory dump.',
      rationale: 'The host is explicitly asking how this used to be handled.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'answer-anchoring',
      confidence: 0.88,
      whyNow: 'The answer needs the remembered runtime seam as its internal anchor.',
      stableCore: ['Return to the same seam before branching.'],
      unsafeDetails: ['Do not assert which exact wording belonged to that old seam.'],
      selectedPeriods: [{ kind: 'consolidation', summary: 'That period kept bending toward the runtime seam until it finally held together.' }],
      selectedEras: [],
      selectedEpisodes: [],
      selectedProcedures: [{ label: 'same seam first', approach: 'Return to the same seam before branching.' }],
      selectedBundles: [{ id: 'bundle-runtime', summary: 'Runtime seam bundle', confidence: 0.84 }],
      selectedChains: [{
        kind: 'task-procedure-relationship-stance',
        summary: 'Return to the same seam before branching.',
        currentStance: 'Carry the same runtime seam before branching.',
        answerPosture: 'Procedure-carry.',
        confidence: 0.82,
      }],
      selectedRelationshipLines: ['Carry the same runtime seam before branching.'],
      followUpAffordance: {
        summary: 'Carry the same runtime seam before branching.',
        whyNow: 'The answer needs the remembered runtime seam as its internal anchor.',
        intrusionRisk: 'high',
        payoffDependency: 'requires-current-payoff',
        preferredTiming: 'after-payoff',
      },
    } as any
    runtimeSurface.memory.memoryResolutionLedger = {
      version: 'memory-resolution-ledger-v1',
      producedAt: 1_700_000_000_000,
      dominantClusterId: 'cluster:runtime-seam',
      dominantClusterSummary: 'Runtime seam memory',
      competingClusterId: 'cluster:old-branch',
      competingClusterSummary: 'Old branch that should stay secondary',
      candidates: [],
      selectedCandidates: [],
      rejectedCandidates: [],
      finalSurfacePolicy: 'answer-anchoring',
      shouldStayInward: false,
      shouldDelayUntilAfterPayoff: true,
      stableCoreOnly: true,
      suppressionTags: ['old-branch'],
      closureState: 'approximate-recall',
      surfaceConfidence: 0.7,
      shouldLabelUncertainty: true,
      visibleCarryMode: 'gist-only',
      conflictPressure: 'medium',
      retrievalQuality: 'medium',
      finalRationale: 'Use the remembered seam as approximate gist only.',
    }

    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'guide-current-knot',
        liveSurface: '',
        carriedThread: 'remembered procedure',
        truthState: 'remembered',
        separateCarryFromSurface: true,
        shouldCompactHistory: false,
        maxRecentUserTurns: 2,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'memory-only',
        responseMode: 'guide-current-knot',
        governingFocus: 'Use remembered procedure as continuity for the answer.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'remembered',
        mindMode: 'tracking',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      runtimeSurface,
    })

    expect(result.contract.mustDo).toContain('If recollection becomes visible, let the stable remembered core do the work before any fragmentary detail.')
    expect(result.contract.mustDo).toContain('Land the live payoff first, then reopen remembered continuity only if room remains.')
    expect(result.contract.mustNotDo).toContain('Do not force recollection forward before the host has room for it.')
    expect(result.contract.mustNotDo).toContain('Do not let recollection step in front of the current payoff.')
    expect(result.contract.mustDo).toContain('If memory is visible, reduce it to a brief gist that supports the current payoff.')
    expect(result.contract.mustDo).toContain('When surfacing this memory, mark approximation or reconstruction instead of sounding exact.')
    expect(result.contract.mustNotDo).toContain('Do not quote, over-specify, or reconstruct exact details from a gist-only memory posture.')
    expect(result.contract.mustNotDo.some(item => item.includes('Do not outrun this recollection boundary'))).toBe(true)
    expect(result.contract.mustNotDo.some(item => item.includes('Do not surface unstable remembered detail as settled fact'))).toBe(true)
    expect(result.systemBlock).toContain('Truth discipline stable-core-only: yes.')
    expect(result.systemBlock).toContain('Truth discipline delay memory until payoff: yes.')
    expect(result.systemBlock).toContain('Memory closure state: approximate-recall.')
    expect(result.systemBlock).toContain('Memory visible carry mode: gist-only.')
  })

  it('threads active self-revision response posture into the response surface contract', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: null,
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 4,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Answer the current ask through revised understanding.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      selfRevisionPatch: {
        version: 'self-revision-state-patch-v1',
        id: 'patch-response-1',
        sourceEventId: 'event-1',
        sourceTurnId: 'turn-1',
        decisionTraceId: 'trace-1',
        domain: 'dialogue-style',
        action: 'internalize',
        resultStatus: 'completed',
        lanes: ['response-posture'],
        memoryPolicy: {
          strictnessBias: 0,
          wrongThreadSuppressionBias: 0,
          provenanceLabelBias: 0,
          recallExpansionBias: 0,
          shouldQuarantineUnsupportedCarry: false,
        },
        relationshipPosture: {
          repairWindowBias: 0,
          closenessCapBias: 0,
          warmthReleaseBias: 0,
        },
        responsePosture: {
          secondPassRequiredBias: 0.16,
          hypothesisLabelBias: 0.14,
          specificityClampBias: 0.2,
          templateShellSuppressionBias: 0.28,
        },
        proactivePolicy: {
          restraintBias: 0,
          learningProposalBias: 0,
          actuationCooldownBias: 0,
        },
        validation: {
          requiresRollbackCheck: false,
          requiresRevalidation: false,
          rollbackPlan: [],
        },
        reasonCodes: ['self-revision-response-posture'],
        summary: 'suppress shells and label hypotheses after correction',
      },
    })

    expect(result.contract.activeSelfRevisionPatchId).toBe('patch-response-1')
    expect(result.contract.mustDo).toContain('Expose hypothesis boundaries more explicitly because the active self-revision patch raised hypothesis-label discipline.')
    expect(result.contract.mustNotDo).toContain('Do not satisfy the host with a template shell; close the loop with concrete answer or care content now.')
    expect(result.systemBlock).toContain('Active self revision patch: patch-response-1.')
  })
})
