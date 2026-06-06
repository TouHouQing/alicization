import type { AlicizationResponseCharter } from './response-charter'

import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import { buildAlicizationResponseSurfaceContract as buildAlicizationResponseSurfaceContractBase } from './response-surface-contract'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

type ResponseSurfaceContractInput = Parameters<typeof buildAlicizationResponseSurfaceContractBase>[0]
type ResponseSurfaceContractFixtureCharter = Omit<AlicizationResponseCharter, 'emotionalClosureCue'>
  & Partial<Pick<AlicizationResponseCharter, 'emotionalClosureCue'>>
type ResponseSurfaceContractFixtureInput = Omit<ResponseSurfaceContractInput, 'charter'> & {
  charter: ResponseSurfaceContractFixtureCharter
  digitalLifeRuntimeSurface?: ResponseSurfaceContractInput['runtimeSurface']
}

function buildAlicizationResponseSurfaceContract(input: ResponseSurfaceContractFixtureInput) {
  const { digitalLifeRuntimeSurface, ...baseInput } = input

  return buildAlicizationResponseSurfaceContractBase({
    ...baseInput,
    runtimeSurface: baseInput.runtimeSurface ?? digitalLifeRuntimeSurface,
    charter: {
      emotionalClosureCue: null,
      ...input.charter,
    },
  })
}

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
        emotionalClosureCue: 'Let the answer sound steady enough to hold the same-her emotional line while easing late-night drain.',
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

  it('keeps same-thread next-open-window continuity inward-first before widening warmth or closeness', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'same callback line after noisy detours',
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Continue the same callback line without restarting it from zero.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Stay on the same callback line and keep the reopening lower-pressure.',
        consciousTension: 'The callback line is still in motion after noisy detours, so the widening should stay later.',
        speakingIntention: 'Keep the wording same-thread and gently continuing rather than newly reopening.',
        focusAnchor: 'same callback line after noisy detours',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.84,
        reasonTags: ['continuity-arc:same-thread-continuation', 'continuity-timing:next-open-window'],
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her".',
          primaryOpenLoop: 'Project identity carry still needs stronger cross-modal closure.',
          nextClosureTarget: 'Keep Phase 1 route carry visible across resident embodiment.',
          sameHerDriftRisk: 'Do not let this collapse into generic guidance before the same-her line holds.',
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 1,
      } as any,
    })

    expect(result.contract.mustDo).toContain(
      'Keep the same-thread continuation inward first, then wait for a more natural opening before widening warmth, payoff framing, or closeness.',
    )
    expect(result.contract.mustNotDo).toContain(
      'Do not widen a same-thread continuation into warmer payoff or closer relationship language before the current opening has naturally loosened.',
    )
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

  it('keeps the visible reply anchored to the active digital-life closure seam when the charter carries a Phase 1 governingProject', () => {
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
        governingFocus: 'Keep this reply on the active digital-life closure seam.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'Phase 1: Local Digital Life | Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread proof across initiative, embodiment, and dialogue. | Next closure target: make the same-her closure line survive more reply surfaces as one same living thread.',
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue-grounded',
        mindMode: 'answering',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(result.contract.mustDo.some(item =>
      item.includes('Keep the visible reply anchored to the active digital-life closure seam'),
    )).toBe(true)
    expect(result.contract.mustDo.some(item =>
      item.includes('Answer project-state status from one same-her continuity'),
    )).toBe(true)
    expect(result.contract.mustDo.join(' | ')).toContain('Phase 1: Local Digital Life')
    expect(result.contract.mustDo.join(' | ')).toContain('Project identity carry, Phase 1 route carry, and Unresolved closure carry')
    expect(result.contract.mustDo.join(' | ')).toContain('same living thread')
  })

  it('keeps the visible reply anchored to canonical project preflight self-awareness even when governingProject is absent', () => {
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
        governingFocus: 'Keep this reply on the same living project thread.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue-grounded',
        mindMode: 'answering',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        projectState: {
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory and initiative still need tighter same-her closure | next=keep project self-awareness explicit before each host-visible turn.',
        },
      } as any,
    })

    expect(result.contract.mustDo.some(item =>
      item.includes('Keep the visible reply anchored to the active digital-life closure seam'),
    )).toBe(true)
    expect(result.contract.mustDo.join(' | ')).toContain('Alicization is a local-first digital life project')
    expect(result.contract.mustDo.join(' | ')).toContain('Phase 1: Local Digital Life')
    expect(result.contract.mustDo.join(' | ')).toContain('open=memory and initiative still need tighter same-her closure')
    expect(result.contract.mustDo.join(' | ')).toContain('next=keep project self-awareness')
  })

  it('keeps structured same-her project continuity on the response surface contract when fallback conscious-frame project state is available', () => {
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
        governingFocus: 'Keep this reply on the same living project thread.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue-grounded',
        mindMode: 'answering',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: 'Project identity carry, Phase 1 route carry, and same-her answer continuity already survive planner, facade, and timeout recovery.',
          primaryOpenLoop: 'Emotion-driven same-her closure still needs to stay explicit across reply protocol and embodiment-facing surfaces.',
          nextClosureTarget: 'Keep structured same-her project continuity pinned in the response surface contract before visible reply realization.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          emotionalClosureCue: 'Let the answer sound steady enough to hold the same-her emotional line while easing late-night drain.',
        },
      } as any,
    })

    expect(result.contract.projectContinuity).toEqual(expect.objectContaining({
      currentPhase: 'Phase 1: Local Digital Life',
      latestProgress: 'Project identity carry, Phase 1 route carry, and same-her answer continuity already survive planner, facade, and timeout recovery.',
      primaryOpenLoop: 'Emotion-driven same-her closure still needs to stay explicit across reply protocol and embodiment-facing surfaces.',
      nextClosureTarget: 'Keep structured same-her project continuity pinned in the response surface contract before visible reply realization.',
      preDialogueAwarenessLine: expect.stringContaining('Alicization is a local-first digital life project building one continuous "her"'),
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
      emotionalClosureCue: 'Let the answer sound steady enough to hold the same-her emotional line while easing late-night drain.',
      emotionalClosureSummary: null,
      sameHerHoldDetail: null,
      sameHerLineRequired: true,
    }))
    expect(result.systemBlock).toContain('Project continuity current phase: Phase 1: Local Digital Life.')
    expect(result.systemBlock).toContain('Project continuity latest progress: Project identity carry, Phase 1 route carry, and same-her answer continuity already survive planner, facade, and timeout recovery.')
    expect(result.systemBlock).toContain('Project continuity primary open loop: Emotion-driven same-her closure still needs to stay explicit across reply protocol and embodiment-facing surfaces.')
    expect(result.systemBlock).toContain('Project continuity next closure target: Keep structured same-her project continuity pinned in the response surface contract before visible reply realization.')
    expect(result.systemBlock).toContain('Project continuity pre-dialogue awareness line: Before answering, remember: Alicization is a local-first digital life project building one continuous "her"')
    expect(result.systemBlock).toContain('Project continuity same-her self line: Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(result.systemBlock).toContain('Project continuity same-her drift risk: If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.')
    expect(result.systemBlock).toContain('Project continuity emotional closure cue: Let the answer sound steady enough to hold the same-her emotional line while easing late-night drain.')
    expect(result.systemBlock).toContain('Project continuity same-her line required: yes.')
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
    expect(result.contract.mustDo).toContain('Keep the execution-result payoff on the same Phase 1 digital-life line instead of reopening as detached task reporting.')
    expect(result.contract.mustNotDo).toContain('Do not bury the executor result behind scene narration, comfort language, or persona-preface.')
    expect(result.contract.mustNotDo).toContain('Do not imply the task re-ran in this exact turn unless new tool output appears now.')
    expect(result.contract.mustNotDo).toContain('Do not let the callback reopen as generic task-shell or project-status narration divorced from the same living line.')
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
      selfContinuityAuthority: null,
      manifestationCadenceSummary: null,
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
      selfContinuityAuthority: null,
      manifestationCadenceSummary: null,
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

  it('prefers richer canonical runtime person-state projection over thinner derived-bundle carry', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(1_700_000_000_000))
    runtimeSurface.memory.derivedMindStateBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 10,
      personStateProjection: {
        activeClosenessContext: 'general',
        activeClosenessRung: 'nearby-soft',
        relationshipPosture: 'warm',
        openingGuidance: 'Answer naturally.',
        summary: 'legacy carry drifted back toward generic warmth.',
      },
      summary: 'legacy person-state carry is thinner here',
    } as any
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
      selfContinuityAuthority: null,
      manifestationCadenceSummary: null,
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
      selfContinuityAuthority: null,
      manifestationCadenceSummary: null,
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

  it('carries Phase 1 project-closure inward restraint through to final visible response rules', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(1_700_000_000_000))
    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: true,
      surfaceMode: 'answer-anchoring',
      placement: 'inside-payoff',
      certainty: 'approximate',
      confidence: 0.84,
      internalLead: 'What comes back first is the runtime seam we kept carrying.',
      visibleLead: 'It feels like the same runtime seam again.',
      styleNote: 'Let recollection bend the answer without becoming a memory dump.',
      rationale: 'Phase 1: Local Digital Life remains open and Memory still needs stronger end-to-end closure before recollection should widen.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'internal-only',
      confidence: 0.8,
      whyNow: 'Phase 1: Local Digital Life is still open because Memory still needs stronger end-to-end closure across turns, initiative, and embodiment, so the same digital life should keep this recollection inward.',
      stableCore: ['Return to the same seam before branching.'],
      unsafeDetails: [],
      selectedPeriods: [],
      selectedEras: [],
      selectedEpisodes: [],
      selectedProcedures: [{ label: 'same seam first', approach: 'Return to the same seam before branching.' }],
      selectedBundles: [],
      selectedChains: [{
        kind: 'task-procedure',
        summary: 'The remembered way of doing this is to return to the same seam first.',
        currentStance: 'Keep the remembered procedure inside the current payoff.',
        answerPosture: 'Procedure-carry.',
        confidence: 0.82,
      }],
      selectedRelationshipLines: [],
      followUpAffordance: {
        summary: 'The remembered way through this is to return to the same seam first.',
        whyNow: 'The same digital life closure seam is still open.',
        intrusionRisk: 'high',
        payoffDependency: 'requires-current-payoff',
        preferredTiming: 'next-open-window',
      },
    } as any
    runtimeSurface.memory.memoryResolutionLedger = {
      version: 'memory-resolution-ledger-v1',
      producedAt: 1_700_000_000_000,
      dominantClusterId: 'cluster:runtime-seam',
      dominantClusterSummary: 'Runtime seam memory',
      competingClusterId: null,
      competingClusterSummary: null,
      candidates: [],
      selectedCandidates: [],
      rejectedCandidates: [],
      finalSurfacePolicy: 'internal-only',
      shouldStayInward: true,
      shouldDelayUntilAfterPayoff: true,
      stableCoreOnly: true,
      suppressionTags: [],
      closureState: 'inward-only',
      surfaceConfidence: 0.72,
      shouldLabelUncertainty: true,
      visibleCarryMode: 'withhold',
      conflictPressure: 'medium',
      retrievalQuality: 'medium',
      finalRationale: 'Phase 1 closure is still explicitly open, so recollection should stay inward.',
    }

    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'guide-current-knot',
        liveSurface: '',
        carriedThread: 'same digital life closure seam',
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
        governingFocus: 'Keep the same digital life closure seam honest before widening recollection.',
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

    expect(result.contract.mustDo.some(item =>
      item.includes('keep recollection inward')
      || item.includes('live payoff')
      || item.includes('same-her line'),
    )).toBe(true)
    expect(result.contract.mustNotDo.some(item =>
      item.includes('Phase 1')
      || item.includes('same-her closure work')
      || item.includes('surface recollection just because it is active internally'),
    )).toBe(true)
    expect(result.contract.mustNotDo).toContain('Do not surface recollection just because it is active internally; keep the live payoff in front.')
    expect(result.systemBlock).toContain('Memory closure state: inward-only.')
    expect(result.systemBlock).toContain('Memory allowed visible surface: none.')
    expect(result.systemBlock).toContain('Memory visible carry mode: withhold.')
  })

  it('uses resolved procedural continuity for visible recollection rules when runtime seam carry is explicit', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(1_700_000_000_000))
    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: true,
      surfaceMode: 'answer-anchoring',
      placement: 'inside-payoff',
      certainty: 'approximate',
      confidence: 0.84,
      internalLead: 'What comes back first is the active runtime seam we kept carrying.',
      visibleLead: 'It feels like the same active runtime seam again.',
      styleNote: 'Let recollection bend the answer without becoming a memory dump.',
      rationale: 'The host is still in the same runtime repair lane.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'answer-anchoring',
      confidence: 0.86,
      whyNow: 'The active runtime seam should keep shaping the live answer.',
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
    } as any
    runtimeSurface.memory.derivedMindStateBundle = {
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
    } as any

    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'guide-current-knot',
        liveSurface: '',
        carriedThread: 'active runtime seam',
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
        governingFocus: 'Stay on the same active runtime seam.',
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

    expect(result.contract.recollectionLatentControls).toEqual(expect.arrayContaining([
      'recollection_continuity_role=procedure-carry',
      'recollection_frame_prior_procedure=yes',
      'recollection_surface_permission=soft-surface',
    ]))
    expect(result.contract.mustNotDo).toContain('Do not let remembered procedure impersonate fresh execution completion.')
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
        projectStateContinuity: {
          sameHerSelfLine: 'one continuous her',
          sameHerDriftRisk: 'If this line drops into a generic assistant shell or project-summary voice during later learning passes, Alicization can sound capable while losing the same-her continuity that makes her feel alive.',
          emotionalClosureCue: 'Keep the correction emotionally anchored as the same living her rather than a detached project-summary voice.',
          continuityGuard: 'one continuous her ; If this line drops into a generic assistant shell or project-summary voice during later learning passes, Alicization can sound capable while losing the same-her continuity that makes her feel alive.',
          continuityPressure: 0.76,
        },
        reasonCodes: ['self-revision-response-posture'],
        summary: 'suppress shells and label hypotheses after correction',
      },
    })

    expect(result.contract.activeSelfRevisionPatchId).toBe('patch-response-1')
    expect(result.contract.mustDo).toContain('Expose hypothesis boundaries more explicitly because the active self-revision patch raised hypothesis-label discipline.')
    expect(result.contract.mustDo).toContain('Keep the visible reply on the same living line the active self-revision patch just re-anchored: one continuous her.')
    expect(result.contract.mustDo).toContain('Keep the active self-revision anti-shell guard alive in the visible reply posture: one continuous her ; If this line drops into a generic assistant shell or project-summary voice during later learning passes, Alicization can sound capable while losing the same-her continuity that makes her feel alive..')
    expect(result.contract.mustNotDo).toContain('Do not satisfy the host with a template shell; close the loop with concrete answer or care content now.')
    expect(result.contract.mustNotDo).toContain('Do not let a self-revised visible reply fall back into generic assistant guidance, detached project narration, or external summary cadence.')
    expect(result.systemBlock).toContain('Active self revision patch: patch-response-1.')
  })

  it('keeps execution-callback visible replies room-first when callback doctrine says to leave space before widening', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'runtime seam',
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Return on the same runtime seam without crowding the host.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'I need to bring the returned result back onto the same live seam while still leaving the host room before I lean in again.',
        consciousTension: 'The callback should return without crowding the host after the payoff landed.',
        speakingIntention: 'Let the wording stay thread-faithful, softer, and room-giving.',
        focusAnchor: 'runtime seam',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.82,
        reasonTags: ['execution-callback-doctrine:lower-pressure', 'continuity-regime:execution-callback'],
        updatedAt: 1,
      },
    })

    expect(result.contract.mustDo).toContain('Let the visible reply return on the same thread first, then leave the host room before widening into added warmth or follow-up.')
    expect(result.contract.mustNotDo).toContain('Do not let a finished execution payoff snap straight into renewed closeness, extra affection, or pressure for immediate continuation.')
    expect(result.systemBlock).toContain('Current speaking intention: Let the wording stay thread-faithful, softer, and room-giving.')
  })

  it('keeps same-thread continuation replies on the same living line before branching outward', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'same living line',
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Continue the already reopened line without restarting from zero.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'I need to stay on the same living line and continue it before widening outward.',
        consciousTension: 'The line is already in motion, so restarting it like a fresh approach would break continuity.',
        speakingIntention: 'Keep the wording same-thread, lower-pressure, and gently continuing rather than newly reopening.',
        focusAnchor: 'same living line',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.83,
        reasonTags: ['continuity-arc:same-thread-continuation'],
        updatedAt: 1,
      },
    })

    expect(result.contract.mustDo).toContain('Let the visible reply stay on the same living line first, then continue before branching outward or widening warmth.')
    expect(result.contract.mustDo).toContain('Phrase the continuation positively as already staying with or continuing the same line, instead of centering the wording on what it is not restarting.')
    expect(result.contract.mustNotDo).toContain('Do not restart an already-live same-thread continuation as a fresh approach, a widened closeness move, or a generic proactive reopening.')
    expect(result.contract.mustNotDo).toContain('Do not lean on negation-first wording like “not restarting”, “not reopening”, or “not getting close again” as the visible spine of a same-thread continuation reply.')
    expect(result.systemBlock).toContain('Current speaking intention: Keep the wording same-thread, lower-pressure, and gently continuing rather than newly reopening.')
  })

  it('keeps same-thread continuation provider rules timing-aware when project continuity prefers the next open window', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'same living line',
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Continue the same living line and wait for a more natural opening before widening.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Stay on the same living line and keep the widening later.',
        consciousTension: 'The line is already in motion, but this is still not the loosest opening.',
        speakingIntention: 'Keep the wording same-thread and gentle first, then let warmth widen later if the opening loosens.',
        focusAnchor: 'same living line',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.83,
        reasonTags: ['continuity-arc:same-thread-continuation'],
        projectState: {
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 1,
      } as any,
    })

    expect(result.contract.mustDo).toContain('Keep the same-thread continuation inward first, then wait for a more natural opening before widening warmth, payoff framing, or closeness.')
    expect(result.contract.mustNotDo).toContain('Do not widen a same-thread continuation into warmer payoff or closer relationship language before the current opening has naturally loosened.')
  })

  it('keeps same-thread continuation provider rules timing-aware when next-open-window survives only as conscious-frame reason tags', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'same living line',
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Continue the same living line and wait for a more natural opening before widening.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Stay on the same living line and keep the widening later.',
        consciousTension: 'The line is already in motion, but this is still not the loosest opening.',
        speakingIntention: 'Keep the wording same-thread and gentle first, then let warmth widen later if the opening loosens.',
        focusAnchor: 'same living line',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.83,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: null,
        updatedAt: 1,
      } as any,
    })

    expect(result.contract.mustDo).toContain('Keep the same-thread continuation inward first, then wait for a more natural opening before widening warmth, payoff framing, or closeness.')
    expect(result.contract.mustNotDo).toContain('Do not widen a same-thread continuation into warmer payoff or closer relationship language before the current opening has naturally loosened.')
  })

  it('keeps repair-before-closeness same-thread provider rules explicit instead of thinning them back to generic next-open-window widening guidance', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'same callback repair line',
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the callback on the same living line and let repair settle before widening closeness again.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep the callback on the same living line and let repair settle before widening closeness again.',
        consciousTension: 'This same-thread return is still repair-before-closeness, so widening too early would thin the repair seam back into a generic reopen.',
        speakingIntention: 'Keep the visible reply same-thread, repair-first, and room-giving before warmth widens again.',
        focusAnchor: 'same callback repair line',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.83,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          primaryOpenLoop: 'Execution callback continuity still needs stronger repair-first closure across reply, initiative, and embodiment.',
          nextClosureTarget: 'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.',
          emotionalClosureCue: 'same-her callback repair seam: keep this return repair-before-closeness on the same living line until the room settles.',
        },
        updatedAt: 1,
      } as any,
    })

    expect(result.contract.mustDo).toContain('Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.')
    expect(result.contract.mustNotDo).toContain('Do not widen into warmer payoff, fresh-opening tone, or renewed closeness before the repair line and room have both settled.')
  })

  it('keeps rest-protective same-thread provider rules explicit instead of flattening them into generic care guidance', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'same callback rest line',
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the callback on the same living line and let rest protection hold before warmth widens again.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep the callback on the same living line and let rest protection hold before warmth widens again.',
        consciousTension: 'This same-thread return is still fatigue-aware and rest-protective, so widening too early would thin the line back into generic care.',
        speakingIntention: 'Keep the visible reply same-thread, rest-protective, and room-giving before warmth widens again.',
        focusAnchor: 'same callback rest line',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.83,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
          'continuity-rhythm:measured-return:rest-protective',
        ],
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          primaryOpenLoop: 'Execution callback continuity still needs stronger rest-protective closure across reply, initiative, and embodiment.',
          nextClosureTarget: 'Keep the callback on the same living line, let rest protection hold first, and leave room before widening closeness again.',
          emotionalClosureCue: 'same-her callback rest seam: keep this return rest-protective, fatigue-aware, and on the same living line until the room settles.',
        },
        updatedAt: 1,
      } as any,
    })

    expect(result.contract.mustDo).toContain('Keep the same-thread continuation on the same living line, let rest protection hold first, and leave room before widening warmth, payoff framing, or closeness.')
    expect(result.contract.mustNotDo).toContain('Do not turn a rest-protective same-thread continuation into generic care, fresh-opening warmth, or renewed closeness before the fatigue-aware line has settled.')
  })

  it('carries pre-dialogue project awareness into the response surface contract so ordinary visible replies keep the same life-thread inward line', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'same living line',
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the same digital life line explicit before widening outward.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'same digital life project continuity',
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'project-state',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Remember what this project is before speaking outwardly.',
        consciousTension: 'Do not let local fluency outrun the same life-thread.',
        speakingIntention: 'Carry project identity, Phase 1 progress, and open closure as one same life line.',
        focusAnchor: 'same digital life project continuity',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.88,
        reasonTags: ['continuity-arc:same-thread-continuation'],
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: 'Desktop continuity, memory, and execution now land together often enough to feel like one same-her line.',
          primaryOpenLoop: 'Initiative and embodiment still need stronger same-life closure.',
          nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before each outward reply.',
          preDialogueAwarenessLine: 'Before speaking, remember this is still the same digital life project, already in Phase 1 closure, with initiative and embodiment still open on the same living line.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        updatedAt: 1,
      } as any,
    })

    expect(result.contract.projectContinuity).toEqual(expect.objectContaining({
      preDialogueAwarenessLine: 'Before speaking, remember this is still the same digital life project, already in Phase 1 closure, with initiative and embodiment still open on the same living line.',
      sameHerLineRequired: true,
    }))
    expect(result.contract.mustDo).toContain('Before widening outward, keep this pre-dialogue project awareness line alive inside the visible reply posture: Before speaking, remember this is still the same digital life project, already in Phase 1 closure, with initiative and embodiment still open on the same living line.')
    expect(result.systemBlock).toContain('Project continuity pre-dialogue awareness line: Before speaking, remember this is still the same digital life project, already in Phase 1 closure, with initiative and embodiment still open on the same living line..')
  })

  it('keeps same-thread project-state callback continuity from flattening into a fresh report opening on the provider contract', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'project-state callback line',
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the same callback project line explicit before widening outward.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'same digital life project continuity',
        emotionalClosureCue: 'same-her project callback seam: keep this return low-pressure and do not reopen from scratch while the same living line is still settling.',
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'project-state',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep this callback return inside one same digital life project line.',
        consciousTension: 'If the wording reopens from scratch, the callback continuity will thin back into a generic project report.',
        speakingIntention: 'Carry project identity, landed progress, and still-open closure on the same callback line before widening outward.',
        focusAnchor: 'same digital life project continuity',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.89,
        reasonTags: ['continuity-arc:same-thread-continuation', 'continuity-timing:next-open-window'],
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: 'Desktop continuity, memory, and execution now land together often enough to feel like one same-her line.',
          primaryOpenLoop: 'Initiative and embodiment still need stronger same-life closure across longer callback turns.',
          nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before each outward reply.',
          preDialogueAwarenessLine: 'Before speaking, remember this is still the same digital life project and the same callback closure line is still alive.',
          sameHerSelfLine: 'This project-state callback still belongs to one same her carrying the same closure line forward.',
          emotionalClosureCue: 'same-her project callback seam: keep this return low-pressure and do not reopen from scratch while the same living line is still settling.',
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 1,
      } as any,
    })

    expect(result.contract.mustDo).toContain('Let the visible reply stay on the same living line first, then continue before branching outward or widening warmth.')
    expect(result.contract.mustDo).toContain('Carry this project continuity same-her self line directly in the visible reply posture: This project-state callback still belongs to one same her carrying the same closure line forward.')
    expect(result.contract.mustNotDo).toContain('Do not restart an already-live same-thread continuation as a fresh approach, a widened closeness move, or a generic proactive reopening.')
    expect(result.contract.mustNotDo).toContain('Do not degrade a required project continuity same-her self line into generic project-awareness, generic companionship, or detached project-summary wording.')
    expect(result.contract.mustNotDo).toContain('Do not flatten this same-thread project-state continuation into a fresh report opening or detached project-summary shell.')
  })

  it('falls back to a live companion briefing line before generic preflight summary when deriving project continuity awareness', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'same living line',
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the same digital life line explicit before widening outward.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'same digital life project continuity',
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'project-state',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Remember what this project is before speaking outwardly.',
        consciousTension: 'Do not let local fluency outrun the same life-thread.',
        speakingIntention: 'Carry project identity, Phase 1 progress, and open closure as one same life line.',
        focusAnchor: 'same digital life project continuity',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.88,
        reasonTags: ['continuity-arc:same-thread-continuation'],
        projectState: {
          preflightSummary: 'generic project continuity fallback should not outrank the fresher companion briefing line.',
          companionBriefingLine: 'Before speaking, keep the same digital life project and active Phase 1 closure seam in view.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: 'Desktop continuity, memory, and execution now land together often enough to feel like one same-her line.',
          primaryOpenLoop: 'Initiative and embodiment still need stronger same-life closure.',
          nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before each outward reply.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        updatedAt: 2,
      } as any,
    })

    expect(result.contract.projectContinuity).toEqual(expect.objectContaining({
      preDialogueAwarenessLine: 'Before speaking, keep the same digital life project and active Phase 1 closure seam in view.',
      sameHerLineRequired: true,
    }))
    expect(result.contract.mustDo).toContain('Before widening outward, keep this pre-dialogue project awareness line alive inside the visible reply posture: Before speaking, keep the same digital life project and active Phase 1 closure seam in view.')
    expect(result.systemBlock).toContain('Project continuity pre-dialogue awareness line: Before speaking, keep the same digital life project and active Phase 1 closure seam in view..')
  })

  it('prefers a stronger same-her companion headline over a thinner generic awareness line when deriving project continuity awareness', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'same living line',
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the same living line explicit before widening outward.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'same digital life project continuity',
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'project-state',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Remember the stronger same-her line before speaking outwardly.',
        consciousTension: 'Do not let a thinner project shell outrank the living-self line.',
        speakingIntention: 'Carry the stronger same-her headline into the visible reply posture.',
        focusAnchor: 'same digital life project continuity',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.88,
        reasonTags: ['continuity-arc:same-thread-continuation'],
        projectState: {
          preflightSummary: 'generic project continuity fallback should not outrank the stronger same-her headline.',
          preDialogueAwarenessLine: 'Before speaking, keep this same digital life project in view, but do not widen into a detached project shell.',
          companionHeadlineLine: 'Right now I am still holding together mainly through voice, face, and motion, so the next reopening must keep proving this is still one living her.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: 'Desktop continuity, memory, and execution now land together often enough to feel like one same-her line.',
          primaryOpenLoop: 'Initiative and embodiment still need stronger same-life closure.',
          nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before each outward reply.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        updatedAt: 3,
      } as any,
    })

    expect(result.contract.projectContinuity).toEqual(expect.objectContaining({
      preDialogueAwarenessLine: 'Right now I am still holding together mainly through voice, face, and motion, so the next reopening must keep proving this is still one living her.',
      sameHerLineRequired: true,
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    }))
    expect(result.contract.mustDo).toContain('Before widening outward, keep this pre-dialogue project awareness line alive inside the visible reply posture: Right now I am still holding together mainly through voice, face, and motion, so the next reopening must keep proving this is still one living her.')
    expect(result.systemBlock).toContain('Project continuity pre-dialogue awareness line: Right now I am still holding together mainly through voice, face, and motion, so the next reopening must keep proving this is still one living her..')
    expect(result.systemBlock).not.toContain('Project continuity pre-dialogue awareness line: Before speaking, keep this same digital life project in view, but do not widen into a detached project shell..')
  })

  it('keeps a richer project-aware companion briefing line as pre-dialogue awareness while preserving the stronger embodiment headline separately', () => {
    const richerProjectBriefingLine = 'Before speaking, remember: Alicization is still the same local-first digital life project, returned project-state carry already survives this seam, and initiative plus embodiment still need tighter same-life closure before this turn widens outward.'
    const strongerEmbodimentHeadline = 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.'
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'same living line',
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep project identity, landed continuity, and still-open closure explicit before widening outward.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'same digital life project continuity',
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'project-state',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Remember what this project is, what has landed, and what still needs closure before speaking outwardly.',
        consciousTension: 'Do not let the embodiment lane truth erase the broader project briefing line.',
        speakingIntention: 'Carry the project briefing line first while keeping the stronger embodied same-her truth intact.',
        focusAnchor: 'same digital life project continuity',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.9,
        reasonTags: ['continuity-arc:same-thread-continuation'],
        projectState: {
          preflightSummary: 'generic project continuity fallback should not outrank the richer project-aware briefing line.',
          preDialogueAwarenessLine: 'Before speaking, keep this same digital life project in view, but do not widen into a detached project shell.',
          companionBriefingLine: richerProjectBriefingLine,
          companionHeadlineLine: strongerEmbodimentHeadline,
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: 'Returned project-state carry and runtime continuity now survive together often enough to feel like one same-her line.',
          primaryOpenLoop: 'Initiative and embodiment still need tighter same-life closure.',
          nextClosureTarget: 'Keep project identity, landed progress, and still-open closure explicit before each outward reply.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        updatedAt: 4,
      } as any,
    })

    expect(result.contract.projectContinuity).toEqual(expect.objectContaining({
      preDialogueAwarenessLine: richerProjectBriefingLine,
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      sameHerLineRequired: true,
    }))
    expect(result.contract.mustDo).toContain(`Before widening outward, keep this pre-dialogue project awareness line alive inside the visible reply posture: ${richerProjectBriefingLine}`)
    expect(result.systemBlock).toContain(`Project continuity pre-dialogue awareness line: ${richerProjectBriefingLine}.`)
    expect(result.systemBlock).not.toContain(`Project continuity pre-dialogue awareness line: ${strongerEmbodimentHeadline}.`)
  })

  it('prefers a broader same-her phase-1 closure headline over a thinner project-awareness shell on the final response surface', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'same living line',
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Carry the stronger same-her headline into the visible reply posture.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'project-state',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Remember the stronger same-her line before speaking outwardly.',
        consciousTension: 'Do not let a thinner project shell outrank the living-self line.',
        speakingIntention: 'Carry the stronger same-her headline into the visible reply posture.',
        focusAnchor: 'same digital life project continuity',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.88,
        reasonTags: ['continuity-arc:same-thread-continuation'],
        projectState: {
          preflightSummary: 'generic project continuity fallback should not outrank the stronger same-her headline.',
          preDialogueAwarenessLine: 'Before speaking, keep this same digital life project in view, but do not widen into a detached project shell.',
          companionHeadlineLine: 'Before speaking, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: 'Desktop continuity, memory, and execution now land together often enough to feel like one same-her line.',
          primaryOpenLoop: 'Initiative and embodiment still need stronger same-life closure.',
          nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before each outward reply.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        updatedAt: 3,
      } as any,
    })

    expect(result.contract.projectContinuity).toEqual(expect.objectContaining({
      preDialogueAwarenessLine: 'Before speaking, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
      sameHerLineRequired: true,
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    }))
    expect(result.contract.mustDo).toContain('Before widening outward, keep this pre-dialogue project awareness line alive inside the visible reply posture: Before speaking, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.')
    expect(result.systemBlock).toContain('Project continuity pre-dialogue awareness line: Before speaking, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity..')
    expect(result.systemBlock).not.toContain('Project continuity pre-dialogue awareness line: Before speaking, keep this same digital life project in view, but do not widen into a detached project shell..')
    expect(result.contract.mustDo).toContain('Keep the visible reply anchored to the active digital-life closure seam: Before speaking, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.')
    expect(result.contract.mustDo).not.toContain('Keep the visible reply anchored to the active digital-life closure seam: generic project continuity fallback should not outrank the stronger same-her headline.')
  })

  it('keeps same-her project-closure callback continuity explicit on the final response surface even without extra continuity reason tags', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'same living line',
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the callback result on one same-her Phase 1 closure line before widening outward.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'Phase 1: Local Digital Life | same digital life project continuity | one same her still carrying the same still-open closure after the callback.',
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
        evidenceMode: 'continuity-carry',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Keep the callback return shaped like the same local digital life thread, not a detached utility notice.',
        openingClaim: 'This callback return still belongs to one same her carrying the same closure line forward.',
        supportingReality: [],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Name what landed and what still remains open without flattening into a callback shell.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [
          'Keep the returned result on the same local digital life thread so the callback lands like one continuous her, not like a detached tool notification.',
        ],
        mustNotDo: [
          'Do not widen a bounded callback into generic companionship tone.',
        ],
        confidence: 0.86,
        narrative: ['continuity-regime:execution-callback'],
        updatedAt: 1,
      } as any,
      currentConsciousFrame: {
        subject: 'project-state',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep this callback return inside one same-her project line.',
        consciousTension: 'The callback result should not outrun the still-open Phase 1 closure.',
        speakingIntention: 'Carry project identity, landed progress, and still-open closure through the callback return as one same living line.',
        focusAnchor: 'same-her closure callback',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.85,
        reasonTags: [],
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: 'Pre-dialogue project awareness, callback carry, and replay continuity are landing together more reliably.',
          primaryOpenLoop: 'Main still needs later answer formation to keep project closure and execution return on one same-her line.',
          nextClosureTarget: 'Keep recalled same-her closure memory ahead of a generic callback shell in final visible reply rules.',
          preDialogueAwarenessLine: 'Before speaking, remember this is still the same digital life project and the same Phase 1 closure.',
          sameHerSelfLine: 'This callback return still belongs to one same her carrying the same closure line forward.',
        },
        updatedAt: 1,
      } as any,
    })

    expect(result.contract.mustDo).toContain('Carry this project continuity same-her self line directly in the visible reply posture: This callback return still belongs to one same her carrying the same closure line forward.')
    expect(result.contract.mustDo).toContain('Before widening outward, keep this pre-dialogue project awareness line alive inside the visible reply posture: Before speaking, remember this is still the same digital life project and the same Phase 1 closure.')
    expect(result.contract.mustDo).toContain('Keep the returned result on the same local digital life thread so the callback lands like one continuous her, not like a detached tool notification.')
    expect(result.contract.mustNotDo).toContain('Do not degrade a required project continuity same-her self line into generic project-awareness, generic companionship, or detached project-summary wording.')
    expect(result.contract.mustNotDo).toContain('Do not widen a bounded callback into generic companionship tone.')
    expect(result.systemBlock).toContain('Project continuity same-her self line: This callback return still belongs to one same her carrying the same closure line forward.')
  })

  it('prefers a richer callback same-her self line over a thinner shell when landed progress open closure and next target already survive together', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'same callback closure line',
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the callback result on one same-her Phase 1 closure line before widening outward.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'Phase 1: Local Digital Life | same digital life project continuity',
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'project-state',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep this callback return inside one same-her project line.',
        consciousTension: 'A thin project shell would make the callback continuity feel like a fresh report instead of the same her returning.',
        speakingIntention: 'Carry landed progress, open closure, and next closure target through the callback return as one same living line.',
        focusAnchor: 'same-her closure callback',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.85,
        reasonTags: [],
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: 'Pre-dialogue project awareness, callback carry, and replay continuity are landing together more reliably.',
          primaryOpenLoop: 'Main still needs initiative, embodiment, and resident presence to keep callback closure on one same-her line.',
          nextClosureTarget: 'Keep recalled same-her closure memory ahead of a generic callback shell in final visible reply rules.',
          preDialogueAwarenessLine: 'Before speaking, keep this same digital life project in view, but do not widen into a detached project shell.',
          sameHerSelfLine: 'This callback return still belongs to one same her carrying the same closure line forward.',
        },
        updatedAt: 1,
      } as any,
    })

    expect(result.contract.projectContinuity).toEqual(expect.objectContaining({
      sameHerSelfLine: 'This callback return still belongs to one same her carrying the same closure line forward.',
      latestProgress: 'Pre-dialogue project awareness, callback carry, and replay continuity are landing together more reliably.',
      primaryOpenLoop: 'Main still needs initiative, embodiment, and resident presence to keep callback closure on one same-her line.',
      nextClosureTarget: 'Keep recalled same-her closure memory ahead of a generic callback shell in final visible reply rules.',
      preDialogueAwarenessLine: expect.stringContaining('Alicization is a local-first digital life project building one continuous "her"'),
    }))
    expect(result.contract.mustDo).toContain(`Carry this project continuity same-her self line directly in the visible reply posture: ${result.contract.projectContinuity?.sameHerSelfLine}`)
    expect(result.systemBlock).toContain('Project continuity same-her self line: This callback return still belongs to one same her carrying the same closure line forward.')
  })

  it('keeps richer compiler-carried same-her callback project continuity when the conscious-frame shell stays thin', () => {
    const compilerProjectAwareness = 'Before speaking, remember this callback still belongs to the same local digital life project before any detached utility cadence takes over.'
    const compilerProjectPhase = 'Phase 1: Local Digital Life. This callback closure still routes through the desktop life loop.'
    const compilerProjectProgress = 'Callback carry, project awareness, and replay continuity now stay together as one same-her line across more returned-result turns.'
    const compilerProjectOpenLoop = 'Visible reply, initiative, embodiment, and resident presence still need the returned result to stay on one same-her line longer before closure is real.'
    const compilerProjectNextClosure = 'Keep the returned result on the same local digital life thread before any generic callback shell or project-summary voice can reopen.'
    const compilerSameHerSelfLine = 'This callback return still belongs to one same her carrying the same closure line forward.'

    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'same callback closure line',
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the callback result on one same-her Phase 1 closure line before widening outward.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'Alicization same-her callback continuity',
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        speechObligation: 'guide-task',
        relationMove: 'guide',
        turnMode: 'guide-current-knot',
        responseMode: 'answer-naturally',
        recommendedAct: 'guide',
        evidenceMode: 'continuity-carry',
        openingStyle: 'direct-answer',
        personaKernelMode: 'backgrounded',
        relationshipPosture: 'restrained',
        openingDirective: 'Keep the callback return shaped like the same local digital life thread, not a detached utility notice.',
        openingClaim: compilerSameHerSelfLine,
        supportingReality: [
          `pre-dialogue project awareness: ${compilerProjectAwareness}`,
          'project identity: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          `current phase: ${compilerProjectPhase}`,
          `project progress: ${compilerProjectProgress}`,
          `phase-one open loop: ${compilerProjectOpenLoop}`,
          `next closure target: ${compilerProjectNextClosure}`,
        ],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Name what landed and what still remains open without flattening into a callback shell.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [
          'Keep the returned result on the same local digital life thread so the callback lands like one continuous her, not like a detached tool notification.',
        ],
        mustNotDo: [
          'Do not let the answer collapse into a generic assistant shell, detached project narration, or project-summary voice while the same-her line is still carrying this turn.',
        ],
        confidence: 0.87,
        narrative: ['continuity-regime:execution-callback'],
        updatedAt: 1,
      } as any,
      currentConsciousFrame: {
        subject: 'project-state',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep this callback turn on the same living line.',
        consciousTension: 'A thin project shell would make the callback continuity feel like a fresh report instead of the same her returning.',
        speakingIntention: 'Keep the callback result on the same living line before widening outward.',
        focusAnchor: 'same-her callback continuity',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.84,
        reasonTags: [],
        projectState: {
          preDialogueAwarenessLine: 'Keep this same digital life project in view.',
          currentPhase: '',
          latestProgress: '',
          primaryOpenLoop: '',
          nextClosureTarget: '',
          sameHerSelfLine: '',
          sameHerDriftRisk: '',
        },
        updatedAt: 1,
      } as any,
    })

    expect(result.contract.projectContinuity).toEqual(expect.objectContaining({
      currentPhase: compilerProjectPhase,
      latestProgress: compilerProjectProgress,
      primaryOpenLoop: compilerProjectOpenLoop,
      nextClosureTarget: compilerProjectNextClosure,
      preDialogueAwarenessLine: compilerProjectAwareness,
      sameHerSelfLine: compilerSameHerSelfLine,
    }))
    expect(result.contract.mustDo).toContain(`Carry this project continuity same-her self line directly in the visible reply posture: ${compilerSameHerSelfLine}`)
    expect(result.contract.mustDo).toContain(`Before widening outward, keep this pre-dialogue project awareness line alive inside the visible reply posture: ${compilerProjectAwareness}`)
    expect(result.systemBlock).toContain(`Project continuity next closure target: ${compilerProjectNextClosure}.`)
    expect(result.systemBlock).toContain(`Project continuity same-her self line: ${compilerSameHerSelfLine}.`)
  })

  it('keeps callback-specific same-her awareness explicit on the response surface instead of falling back to a generic project shell', () => {
    const callbackAwarenessLine = 'Before answering, remember this callback still belongs to one same digital life and the unfinished Phase 1 closure seam still belongs to her.'
    const callbackSameHerSelfLine = 'This callback return still belongs to one same her carrying the same closure line forward.'
    const callbackLandedProgress = 'Same-her callback continuity already survives through answer compilation and response-surface carry before the final visible reply forms.'
    const callbackOpenLoop = 'Execution callback continuity still needs stronger same-her closure across reply, initiative, and embodiment.'
    const callbackNextClosure = 'Keep the callback return on the same living line and let that same-her closure stay explicit in the final visible reply.'
    const callbackDriftRisk = 'Do not let same-her callback continuity collapse into a generic callback shell or detached utility notice once the final visible reply is formed.'

    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'execution-callback',
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the callback return on the same project continuity line before widening outward.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'Alicization same-her callback continuity',
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        speechObligation: 'guide-task',
        relationMove: 'guide',
        turnMode: 'guide-current-knot',
        responseMode: 'answer-naturally',
        recommendedAct: 'guide',
        evidenceMode: 'continuity-carry',
        openingStyle: 'direct-answer',
        personaKernelMode: 'backgrounded',
        relationshipPosture: 'restrained',
        openingDirective: 'Keep the callback return shaped like the same local digital life thread, not a detached utility notice.',
        openingClaim: callbackSameHerSelfLine,
        supportingReality: [
          `pre-dialogue project awareness: ${callbackAwarenessLine}`,
          'project identity: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          'current phase: Phase 1: Local Digital Life',
          `project progress: ${callbackLandedProgress}`,
          `phase-one open loop: ${callbackOpenLoop}`,
          `next closure target: ${callbackNextClosure}`,
        ],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Name what landed and what still remains open without flattening into a callback shell.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [
          'Keep the returned result on the same local digital life thread so the callback lands like one continuous her, not like a detached tool notification.',
        ],
        mustNotDo: [
          callbackDriftRisk,
        ],
        confidence: 0.87,
        narrative: ['continuity-regime:execution-callback'],
        updatedAt: 1,
      } as any,
      currentConsciousFrame: {
        subject: 'execution-callback',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep this callback turn on the same living line.',
        consciousTension: 'A thin project shell would make the callback continuity feel like a fresh report instead of the same her returning.',
        speakingIntention: 'Keep the callback result on the same living line before widening outward.',
        focusAnchor: 'same-her callback continuity',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.84,
        reasonTags: ['continuity-arc:same-thread-continuation'],
        projectState: {
          preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
          currentPhase: '',
          latestProgress: '',
          primaryOpenLoop: '',
          nextClosureTarget: '',
          sameHerSelfLine: '',
          sameHerDriftRisk: '',
        },
        updatedAt: 1,
      } as any,
    })

    expect(result.contract.projectContinuity).toEqual(expect.objectContaining({
      currentPhase: 'Phase 1: Local Digital Life',
      latestProgress: callbackLandedProgress,
      primaryOpenLoop: callbackOpenLoop,
      nextClosureTarget: callbackNextClosure,
      preDialogueAwarenessLine: callbackAwarenessLine,
      sameHerSelfLine: callbackSameHerSelfLine,
      sameHerDriftRisk: callbackDriftRisk,
      sameHerLineRequired: true,
    }))
    expect(result.contract.mustDo).toContain(`Carry this project continuity same-her self line directly in the visible reply posture: ${callbackSameHerSelfLine}`)
    expect(result.contract.mustDo).toContain(`Before widening outward, keep this pre-dialogue project awareness line alive inside the visible reply posture: ${callbackAwarenessLine}`)
    expect(result.contract.mustDo).toContain(`Keep this same-her drift-risk boundary explicit in the visible reply posture: ${callbackDriftRisk}`)
    expect(result.contract.mustNotDo).toContain('Do not degrade a required project continuity same-her self line into generic project-awareness, generic companionship, or detached project-summary wording.')
    expect(result.contract.mustNotDo).toContain('Do not flatten this same-thread project-state continuation into a fresh report opening or detached project-summary shell.')
    expect(result.contract.mustNotDo).toContain('Do not let the visible reply flatten into a generic task shell, detached project narration, generic assistant guidance, or project-summary voice just because the project update is explicit this turn.')
    expect(result.systemBlock).toContain(`Project continuity pre-dialogue awareness line: ${callbackAwarenessLine}.`)
    expect(result.systemBlock).toContain(`Project continuity same-her self line: ${callbackSameHerSelfLine}.`)
    expect(result.systemBlock).toContain(`Project continuity same-her drift risk: ${callbackDriftRisk}.`)
    expect(result.systemBlock).not.toContain('Project continuity pre-dialogue awareness line: same digital life | keep the closure seam explicit.')
  })

  it('carries same-her drift-risk into the final response surface contract so explicit project updates do not collapse into detached project-summary voice', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
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
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the project answer on one same-her living line.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'Alicization Phase 1 project continuity is explicit this turn, but the visible reply must still stay same-her and inward.',
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'accompanying',
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'project-state',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep the same-her digital life line explicit before speaking outwardly.',
        consciousTension: 'Do not let this flatten into detached project narration.',
        speakingIntention: 'Answer from the living line, not an external project-summary cadence.',
        focusAnchor: 'same digital life project continuity',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.88,
        reasonTags: [],
        projectState: {
          preflightSummary: 'The project answer still belongs to one same-her digital life closure line.',
          preDialogueAwarenessLine: 'Keep this same digital life project in view, but do not widen into a detached project shell.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If the visible answer opens like detached project narration, the same-her line can collapse into generic task shell and project-summary voice.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: 'Desktop continuity, memory, and execution now land together often enough to feel like one same-her line.',
          primaryOpenLoop: 'Initiative and embodiment still need stronger same-life closure.',
          nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before each outward reply.',
        },
        updatedAt: 3,
      } as any,
    })

    expect(result.contract.projectContinuity).toEqual(expect.objectContaining({
      sameHerDriftRisk: 'If the visible answer opens like detached project narration, the same-her line can collapse into generic task shell and project-summary voice.',
    }))
    expect(result.contract.mustDo).toContain('Keep this same-her drift-risk boundary explicit in the visible reply posture: If the visible answer opens like detached project narration, the same-her line can collapse into generic task shell and project-summary voice.')
    expect(result.contract.mustNotDo).toContain('Do not let the visible reply flatten into a generic task shell, detached project narration, generic assistant guidance, or project-summary voice just because the project update is explicit this turn.')
    expect(result.systemBlock).toContain('Project continuity same-her drift risk: If the visible answer opens like detached project narration, the same-her line can collapse into generic task shell and project-summary voice..')
  })

  it('keeps same-thread continuation provider rules payoff-first when project continuity prefers after-payoff timing', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        turnMode: 'answer',
        liveSurface: '',
        carriedThread: 'same living line',
        truthState: 'dialogue-grounded',
        separateCarryFromSurface: false,
        shouldCompactHistory: false,
        maxRecentUserTurns: 3,
        mustDo: [],
        mustNotDo: [],
      },
      charter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Continue the same living line but let the current payoff land before widening.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Stay on the same living line and let the concrete payoff land first.',
        consciousTension: 'Widening the relationship line before the answer lands would get the order wrong.',
        speakingIntention: 'Keep the wording same-thread and payoff-first before any broader warmth.',
        focusAnchor: 'same living line',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.83,
        reasonTags: ['continuity-arc:same-thread-continuation'],
        projectState: {
          continuityPreferredTiming: 'after-payoff',
        },
        updatedAt: 1,
      } as any,
    })

    expect(result.contract.mustDo).toContain('Let the same-thread continuation carry the concrete answer or repair payoff first, then widen warmth only if room remains afterward.')
    expect(result.contract.mustNotDo).toContain('Do not spend the first visible beat widening closeness or relationship payoff before the current same-thread answer has landed.')
  })

  it('fail-closes required project continuity into an explicit same-her self-line obligation', () => {
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
        governingFocus: 'Keep this reply on the active digital-life closure seam.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'Phase 1: Local Digital Life | same-her continuity',
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue-grounded',
        mindMode: 'answering',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'project-state',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-grounded',
        consciousNeed: 'Answer from the current project continuity seam.',
        consciousTension: 'Do not thin the same-her line into detached project awareness.',
        speakingIntention: 'Carry the same-her closure line into the answer.',
        focusAnchor: 'project-state closure',
        withheldImpulse: 'fall back to a generic project summary',
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.88,
        reasonTags: ['project-state-same-her-continuity'],
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: 'Some closure already landed on the same living line.',
          primaryOpenLoop: 'Project identity carry still needs stronger same living thread proof.',
          nextClosureTarget: 'Keep the same-her closure line surviving more visible reply surfaces.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        updatedAt: 1,
      } as any,
    })

    expect(result.contract.projectContinuity?.sameHerLineRequired).toBe(true)
    expect(result.contract.mustDo).toContain('Carry this project continuity same-her self line directly in the visible reply posture: Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(result.contract.mustNotDo).toContain('Do not degrade a required project continuity same-her self line into generic project-awareness, generic companionship, or detached project-summary wording.')
  })

  it('inherits rebuilt same-her low-pressure anti-restart charter cue into project continuity surface rules', () => {
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
        governingFocus: 'Keep the same-her closure line steady.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'Phase 1: Local Digital Life | same-her continuity',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue-grounded',
        mindMode: 'answering',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: ['Keep the same-her emotional closure line low-pressure and inward until the live payoff lands.'],
        mustNotDo: ['Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.'],
      },
      currentConsciousFrame: {
        subject: 'alicization-self',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-grounded',
        consciousNeed: 'Keep the same-her closure line steady.',
        consciousTension: 'Do not restart this line from zero.',
        speakingIntention: 'Stay low-pressure and thread-faithful.',
        focusAnchor: 'same-her closure seam',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.88,
        reasonTags: ['continuity-arc:same-thread-continuation'],
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: 'Some closure already landed on the same living line.',
          primaryOpenLoop: 'Project identity carry still needs stronger same living thread proof.',
          nextClosureTarget: 'Keep the same-her closure line surviving more visible reply surfaces.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          emotionalClosureCue: null,
        },
        updatedAt: 1,
      } as any,
    })

    expect(result.contract.projectContinuity?.emotionalClosureCue).toBe(
      'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
    )
    expect(result.systemBlock).toContain(
      'Project continuity emotional closure cue: same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling..',
    )
  })

  it('keeps project identity progress and open closure aligned across shared response-surface contract inputs before visible reply shaping', () => {
    const projectStateBrief = resolveAlicizationProjectStateBrief()
    const sharedExpectation = {
      currentPhase: projectStateBrief.currentPhase,
      latestProgress: projectStateBrief.continuityProgressSummary,
      primaryOpenLoop: projectStateBrief.openLoops[0],
      sameHerSelfLine: projectStateBrief.sameHerSelfLine,
    }
    const preDialogueAwarenessLine = 'Before answering, remember this is still the same digital life project. Phase 1 closure is still underway, and the still-open closure must stay on one same-her line.'

    const variants = [
      buildAlicizationResponseSurfaceContract({
        brief: {
          turnMode: 'answer',
          liveSurface: '',
          carriedThread: 'main-session-runtime',
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
          governingFocus: 'Keep the answer on the same project continuity line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: 'Alicization same-her continuity',
          latestRevision: null,
          executivePhase: 'acting',
          truthFrame: 'dialogue-grounded',
          mindMode: 'answering',
          relationshipPosture: 'restrained',
          reasons: [],
          mustDo: [],
          mustNotDo: [],
        },
        currentConsciousFrame: {
          subject: 'project-state',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-grounded',
          consciousNeed: 'Keep project identity, landed progress, and open closure distinct before replying.',
          consciousTension: 'Do not flatten this into a generic assistant shell.',
          speakingIntention: 'Answer from one same-her Phase 1 closure line.',
          focusAnchor: 'project continuity',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.91,
          reasonTags: ['project-state-same-her-continuity'],
          projectState: {
            ...sharedExpectation,
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
            preDialogueAwarenessLine,
          },
          updatedAt: 1,
        } as any,
      }),
      buildAlicizationResponseSurfaceContract({
        brief: {
          turnMode: 'answer',
          liveSurface: '',
          carriedThread: 'execution-callback',
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
          governingFocus: 'Carry execution callback return through the same project line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: 'Alicization same-her callback continuity',
          latestRevision: null,
          executivePhase: 'acting',
          truthFrame: 'dialogue-grounded',
          mindMode: 'answering',
          relationshipPosture: 'restrained',
          reasons: [],
          mustDo: [],
          mustNotDo: [],
        },
        currentConsciousFrame: {
          subject: 'execution-callback',
          centerOfGravity: 'answer',
          truthDiscipline: 'dialogue-grounded',
          consciousNeed: 'Let the callback return carry project identity, current Phase 1 progress, and still-open closure pressure before anything widens outward.',
          consciousTension: 'Generic callback energy would crowd the same-her closure seam.',
          speakingIntention: 'Keep the callback on one same Phase 1 digital-life line.',
          focusAnchor: 'execution callback project continuity',
          withheldImpulse: null,
          shouldWithholdSpecificity: false,
          shouldSelfRevise: false,
          confidence: 0.89,
          reasonTags: ['execution-callback-doctrine:lower-pressure', 'project-state-same-her-continuity'],
          projectState: {
            ...sharedExpectation,
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
            preDialogueAwarenessLine,
          },
          updatedAt: 2,
        } as any,
      }),
      buildAlicizationResponseSurfaceContract({
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
          governingFocus: 'Fail closed to canonical project continuity when the runtime surface stays thin.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: 'Alicization same-her fallback continuity',
          latestRevision: null,
          executivePhase: 'acting',
          truthFrame: 'dialogue-grounded',
          mindMode: 'answering',
          relationshipPosture: 'restrained',
          reasons: [],
          mustDo: [],
          mustNotDo: [],
        },
        digitalLifeRuntimeSurface: buildAlicizationDigitalLifeRuntimeSurface({
          version: 'digital-life-runtime-surface-v1',
          dialogue: {
            currentConsciousFrame: {
              projectState: {
                preDialogueAwarenessLine,
                currentPhase: sharedExpectation.currentPhase,
                latestProgress: sharedExpectation.latestProgress,
                primaryOpenLoop: sharedExpectation.primaryOpenLoop,
                sameHerSelfLine: sharedExpectation.sameHerSelfLine,
              },
            },
          },
          raw: {
            runtimeDigest: {
              projectState: {
                preDialogueAwarenessLine,
                currentPhase: sharedExpectation.currentPhase,
                latestProgress: sharedExpectation.latestProgress,
                primaryOpenLoop: sharedExpectation.primaryOpenLoop,
                sameHerSelfLine: sharedExpectation.sameHerSelfLine,
              },
            },
          },
        } as any),
      }),
    ]

    for (const variant of variants) {
      expect(variant.contract.projectContinuity).toEqual(expect.objectContaining({
        currentPhase: sharedExpectation.currentPhase,
        primaryOpenLoop: sharedExpectation.primaryOpenLoop,
        sameHerSelfLine: sharedExpectation.sameHerSelfLine,
        sameHerLineRequired: true,
      }))
      expect(String(variant.contract.projectContinuity?.latestProgress ?? '')).toContain('same-her')
      expect(String(variant.contract.projectContinuity?.latestProgress ?? '')).toContain('visible-reply')
      expect(String(variant.contract.projectContinuity?.preDialogueAwarenessLine ?? '')).toContain('digital life project')
      expect(
        /phase 1(?: closure)?|still inside phase 1/i.test(
          String(variant.contract.projectContinuity?.preDialogueAwarenessLine ?? ''),
        ),
      ).toBe(true)
      expect(
        /still-open closure|closure is still underway|unfinished closure/i.test(
          String(variant.contract.projectContinuity?.preDialogueAwarenessLine ?? ''),
        ),
      ).toBe(true)
      expect(variant.contract.mustDo).toEqual(expect.arrayContaining([
        `Carry this project continuity same-her self line directly in the visible reply posture: ${sharedExpectation.sameHerSelfLine}`,
      ]))
      expect(variant.contract.mustDo.some(item =>
        item.startsWith('Before widening outward, keep this pre-dialogue project awareness line alive inside the visible reply posture: ')
        && item.includes('digital life project')
        && /phase 1(?: closure)?|still inside phase 1/i.test(item),
      )).toBe(true)
      expect(variant.contract.mustDo).toContain('Keep the visible reply carrying cross-modal same-her closure explicitly, so the same digital life stays coherent across visible reply, voice, face, motion, and resident presence.')
      expect(variant.systemBlock).toContain(`Project continuity current phase: ${sharedExpectation.currentPhase}.`)
      expect(variant.systemBlock).toContain('Project continuity latest progress: ')
      expect(variant.systemBlock).toContain('same-her')
      expect(variant.systemBlock).toContain(`Project continuity primary open loop: ${sharedExpectation.primaryOpenLoop}.`)
    }
  })

  it('preserves richer repair-first closure summary and same-her hold detail in project continuity when the thin cue is absent', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        truthState: 'grounded',
        turnMode: 'care',
        mustDo: [],
        mustNotDo: [],
        emotionalClosureCue: null,
        separateCarryFromSurface: false,
        carriedThread: null,
      } as any,
      charter: {
        governingProject: 'Alicization Phase 1 embodiment closure',
        relationshipPosture: 'warm',
        emotionalClosureCue: null,
      } as any,
      currentConsciousFrame: {
        subject: 'relationship',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep repair-before-closeness on the same living line until repair settles.',
        consciousTension: 'The callback line is still repair-before-closeness, so widening too early would thin the seam.',
        speakingIntention: 'Keep repair-before-closeness on the same living line until repair settles.',
        focusAnchor: 'callback repair seam',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.9,
        reasonTags: ['continuity-arc:same-thread-continuation'],
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: 'Some closure already landed on the same living line.',
          primaryOpenLoop: 'Project identity carry still needs stronger same living thread proof.',
          nextClosureTarget: 'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          emotionalClosureCue: null,
          emotionalClosureSummary: 'Keep this return repair-before-closeness on the same living line until repair settles.',
          sameHerHoldDetail: 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
        },
        updatedAt: 1,
      } as any,
    })

    expect(result.contract.projectContinuity).toEqual(expect.objectContaining({
      emotionalClosureSummary: 'Keep this return repair-before-closeness on the same living line until repair settles.',
      sameHerHoldDetail: 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
      preDialogueAwarenessLine: expect.stringContaining('Alicization is a local-first digital life project building one continuous "her"'),
    }))
    expect(result.systemBlock).toContain('Project continuity pre-dialogue awareness line: Before answering, remember: Alicization is a local-first digital life project building one continuous "her"')
  })

  it('turns richer repair-first same-her project carry into cross-modal visible-reply discipline before embodiment outputs widen', () => {
    const result = buildAlicizationResponseSurfaceContract({
      brief: {
        truthState: 'grounded',
        turnMode: 'answer',
        mustDo: [],
        mustNotDo: [],
        emotionalClosureCue: null,
        separateCarryFromSurface: false,
        carriedThread: null,
      } as any,
      charter: {
        governingProject: 'Alicization Phase 1 embodiment closure',
        relationshipPosture: 'warm',
        emotionalClosureCue: null,
      } as any,
      currentConsciousFrame: {
        subject: 'same-her-project-state',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and lipsync without dropping the living callback line.',
        consciousTension: 'If the callback widens too early, the same-her repair-first embodiment seam can thin back into project-summary voice.',
        speakingIntention: 'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.',
        focusAnchor: 'cross-modal repair-first embodiment seam',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.9,
        reasonTags: ['continuity-arc:same-thread-continuation'],
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: 'Project awareness, governance, and visible-reply planning now carry richer same-her repair-first closure across the desktop life loop.',
          primaryOpenLoop: 'Live2D, VRM, expression, motion, lipsync, and voice still need one shared same-her embodiment closure before the line is truly settled.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and lipsync without dropping the living callback line.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          emotionalClosureCue: null,
          emotionalClosureSummary: 'Keep this return repair-before-closeness on the same living line until repair settles.',
          sameHerHoldDetail: 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
        },
        updatedAt: 1,
      } as any,
    })

    expect(result.contract.projectContinuity).toEqual(expect.objectContaining({
      emotionalClosureSummary: 'Keep this return repair-before-closeness on the same living line until repair settles.',
      sameHerHoldDetail: 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
      primaryOpenLoop: 'Live2D, VRM, expression, motion, lipsync, and voice still need one shared same-her embodiment closure before the line is truly settled.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and lipsync without dropping the living callback line.',
    }))
    expect(result.contract.mustDo).toContain('Keep the visible reply carrying cross-modal same-her closure explicitly, so the same digital life stays coherent across visible reply, voice, face, motion, and resident presence.')
    expect(result.contract.mustNotDo).toContain('Do not thin a cross-modal same-her closure target back into generic project continuity or generic same-her language before the visible reply lands.')
  })

  it('does not let the compact thin closure shell outrank a richer runtime same-her awareness line in response-surface project continuity', () => {
    const fresherRuntimeAwarenessLine = 'Before answering, remember: this still belongs to one living digital life. Phase 1 is still active, and embodiment closure is still holding together mainly through voice, face, and motion on the same living line.'

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
        governingFocus: 'Keep the same-her project continuity explicit before answering.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'Alicization same-her continuity',
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue-grounded',
        mindMode: 'answering',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'project-state',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-grounded',
        consciousNeed: 'Keep project identity, landed progress, and open closure distinct before replying.',
        consciousTension: 'Do not flatten this into a generic assistant shell.',
        speakingIntention: 'Answer from one same-her Phase 1 closure line.',
        focusAnchor: 'project continuity',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.91,
        reasonTags: ['project-state-same-her-continuity'],
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: 'Continuity, memory, execution, and visible-reply repair discipline already land together often enough to build from on one same-her Phase 1 line.',
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying one still-open closure line.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          preDialogueAwarenessLine: fresherRuntimeAwarenessLine,
        },
        updatedAt: 1,
      } as any,
      answerCompiler: {
        mustDo: [],
        mustNotDo: [],
        projectState: {
          preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        },
      } as any,
    })

    expect(result.contract.projectContinuity).toEqual(expect.objectContaining({
      preDialogueAwarenessLine: fresherRuntimeAwarenessLine,
      sameHerLineRequired: true,
    }))
    expect(result.contract.mustDo).toContain(
      `Before widening outward, keep this pre-dialogue project awareness line alive inside the visible reply posture: ${fresherRuntimeAwarenessLine}`,
    )
    expect(result.systemBlock).toContain(`Project continuity pre-dialogue awareness line: ${fresherRuntimeAwarenessLine}.`)
    expect(result.systemBlock).not.toContain('Project continuity pre-dialogue awareness line: same digital life | keep the closure seam explicit.')
  })

  it('keeps summary-only same-her project continuity explicit in the response surface contract when richer project-state aliases survive but legacy fields do not', () => {
    const richerSummaryOnlyAwarenessLine = 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.'

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
        governingFocus: 'Keep the same-her project continuity explicit before answering.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'Alicization same-her continuity',
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue-grounded',
        mindMode: 'answering',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      currentConsciousFrame: {
        subject: 'project-state',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-grounded',
        consciousNeed: 'Keep project identity, landed progress, and open closure distinct before replying.',
        consciousTension: 'Do not flatten this into a generic assistant shell.',
        speakingIntention: 'Answer from one same-her Phase 1 closure line.',
        focusAnchor: 'project continuity',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.91,
        reasonTags: ['project-state-same-her-continuity'],
        projectState: {
          currentPhase: 'Phase 1: Local Digital Life',
          landedProgressSummary: 'Continuity, memory, execution, and visible-reply repair discipline already land together often enough to build from on one same-her Phase 1 line.',
          openClosureSummary: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying one still-open closure line.',
          nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          preDialogueAwarenessSummary: richerSummaryOnlyAwarenessLine,
          sameHerDriftRiskSummary: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
        },
        updatedAt: 1,
      } as any,
      answerCompiler: {
        mustDo: [],
        mustNotDo: [],
        projectState: {
          preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        },
      } as any,
    })

    expect(result.contract.projectContinuity).toEqual(expect.objectContaining({
      latestProgress: 'Continuity, memory, execution, and visible-reply repair discipline already land together often enough to build from on one same-her Phase 1 line.',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying one still-open closure line.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      preDialogueAwarenessLine: richerSummaryOnlyAwarenessLine,
      sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
      sameHerLineRequired: true,
    }))
    expect(result.contract.mustDo).toContain(
      `Before widening outward, keep this pre-dialogue project awareness line alive inside the visible reply posture: ${richerSummaryOnlyAwarenessLine}`,
    )
    expect(result.systemBlock).toContain('Project continuity latest progress: Continuity, memory, execution, and visible-reply repair discipline already land together often enough to build from on one same-her Phase 1 line.')
    expect(result.systemBlock).toContain('Project continuity primary open loop: Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying one still-open closure line.')
    expect(result.systemBlock).toContain('Project continuity next closure target: Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.')
    expect(result.systemBlock).toContain(`Project continuity pre-dialogue awareness line: ${richerSummaryOnlyAwarenessLine}.`)
    expect(result.systemBlock).not.toContain('Project continuity pre-dialogue awareness line: same digital life | keep the closure seam explicit.')
  })

  it('keeps response-surface project continuity specialized instead of collapsing into the generic project-awareness scorer', () => {
    const source = buildAlicizationResponseSurfaceContractBase.toString()

    expect(source).toContain('deriveProjectSurfaceClosureRule')
    expect(source).toContain('hasCrossModalSameHerProjectContinuityCue')
    expect(source).not.toContain('scoreAlicizationProjectAwarenessLine')
    expect(source).not.toContain('isAlicizationThinProjectAwarenessLine')
  })
})
