import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildAlicizationResponseSurfaceContract } from './response-surface-contract'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('response-surface-contract', () => {
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
    expect(result.contract.allowStageDirections).toBe(false)
    expect(result.contract.labelCarryAsMemory).toBe(true)
    expect(result.contract.suppressAssociativeRecall).toBe(true)
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

    expect(result.contract.mustDo).toContain('If remembered material enters the visible reply, let one recollected period, relationship line, or remembered approach lead before finer details.')
    expect(result.contract.mustDo).toContain('If the turn is asking how something was previously handled, surface the remembered way of doing it before proposing a new branch.')
    expect(result.contract.mustNotDo).toContain('Do not speak as if remembered procedure means the current task already finished in this turn.')
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

    expect(result.contract.mustDo).toContain('Let active recollection stay as inner carry unless surfacing it materially helps the current payoff.')
    expect(result.contract.mustNotDo).toContain('Do not dump recalled memory into the visible reply just because it became mentally active.')
    expect(result.contract.mustNotDo).toContain('Do not reuse drafted recollection wording verbatim in the visible reply.')
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

    expect(result.contract.mustDo).toContain('Fold recollection into the answer itself rather than detouring into a separate memory monologue.')
    expect(result.contract.mustDo).toContain('Let remembered procedure appear as prior way of handling similar situations, not as a completed action in this turn.')
    expect(result.contract.mustDo).toContain('Keep any surfaced recollection subordinate to the live payoff rather than following drafted memory wording.')
    expect(result.contract.mustDo.join(' | ')).not.toContain('I mostly remember handling this by returning to the same seam before branching.')
    expect(result.systemBlock).not.toContain('I mostly remember handling this by returning to the same seam before branching.')
    expect(result.contract.mustNotDo).toContain('Do not let remembered procedure impersonate fresh execution completion.')
    expect(result.contract.mustNotDo).toContain('Do not reuse drafted recollection wording, drafted memory contours, or internal recollection leads verbatim.')
  })
})
