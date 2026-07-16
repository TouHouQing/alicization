import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import {
  buildReplyDeliberation,
  buildReplyDeliberationSystemBlock,
} from './reply-deliberator'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

const fixedReplyDeliberationProjectTemplatePattern = new RegExp([
  ['What has already landed enough', ' to build from'].join(''),
  ['The same', ' digital life'].join(''),
  ['same still-open', ' life loop'].join(''),
  ['The next closure step still', ' needs to stay visible here'].join(''),
  ['This reply still needs to keep cross-modal', ' identity-continuity'].join(''),
].join('|'), 'iu')

const discourseState = {
  currentTurnSubject: 'task-knot' as const,
  screenReferenceMode: 'helpful' as const,
  currentTurnSummary: 'Stay with the current diff and explain the knot.',
  currentQuestion: 'What is wrong with this diff?',
  owedAction: 'guide-task' as const,
  relationMove: 'guide' as const,
  continuityMode: 'task-first' as const,
  unresolvedCarry: 'The risky diff is still unresolved.',
  ruptureRepair: null,
  confidence: 0.86,
  narrative: [],
  updatedAt: 10_000,
}

const conversationState = {
  jointThread: 'The host wants the current diff explained without drifting away.',
  hostMove: 'The host is asking what is wrong with the current diff.',
  activeProject: 'ProjectAtlas diff',
  unansweredQuestion: 'What is wrong with this diff?',
  owedRepair: null,
  activeCommitments: ['Explain the current diff before moving on.'],
  relationFrame: 'guide' as const,
  continuityPolicy: 'stay-on-thread' as const,
  memoryMode: 'task-thread' as const,
  memoryQueryHints: ['ProjectAtlas diff', 'What is wrong with this diff?'],
  shouldHoldThread: true,
  confidence: 0.82,
  narrative: [],
  updatedAt: 10_000,
}

const mindSynthesis = {
  answerSubject: 'task-knot' as const,
  relationMove: 'guide' as const,
  speechObligation: 'guide-task' as const,
  beliefs: [{
    label: 'conversation-thread',
    summary: 'The host wants help on the current diff.',
    confidence: 0.84,
    sourceTags: ['conversation-state'],
  }],
  uncertainties: [{
    label: 'open-question',
    summary: 'What is wrong with this diff?',
    confidence: 0.7,
    sourceTags: ['conversation-state'],
  }],
  concerns: [{
    label: 'reply-pressure',
    summary: 'The host is still waiting for the diff explanation.',
    confidence: 0.72,
    sourceTags: ['conversation-state'],
  }],
  commitments: [{
    label: 'conversation-commitment',
    summary: 'Explain the current diff before moving on.',
    confidence: 0.82,
    sourceTags: ['conversation-state'],
  }],
  desires: [],
  openingIntent: 'Stay inside the diff knot and move one step closer to resolution.',
  truthBoundary: 'Keep claims attached to the current diff and avoid stale carry.',
  interiorSummary: 'The current diff still needs a grounded explanation.',
  confidence: 0.82,
  narrative: [],
  updatedAt: 10_000,
}

describe('buildReplyDeliberation', () => {
  it('selects guide as the dominant motive for unresolved coding knots', () => {
    const state = buildReplyDeliberation({
      now: 20_000,
      conversationState,
      discourseState,
      mindSynthesis,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        speechObligation: 'guide-task',
        relationMove: 'guide',
        turnMode: 'guide-current-knot',
        responseMode: 'guide-current-knot',
        recommendedAct: 'guide',
        evidenceMode: 'coarse-held',
        openingStyle: 'direct-answer',
        personaKernelMode: 'backgrounded',
        relationshipPosture: 'warm',
        openingDirective: 'Open from the current knot and narrow to one next step.',
        openingClaim: 'The risky seam is still inside the current diff.',
        supportingReality: ['ProjectAtlas diff'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Point to the risky part of the diff first.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: ['Stay with the current knot.'],
        mustNotDo: ['Do not drift into generic advice.'],
        confidence: 0.84,
        narrative: [],
        updatedAt: 20_000,
      },
      privateThought: {
        stance: 'observe',
        confidence: 0.7,
        rationaleTags: ['diff'],
        thoughtText: 'Keep looking at the diff before outward reply.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'tense-debug',
      },
    })

    expect(state).toEqual(expect.objectContaining({
      selectedMotive: 'guide',
      memoryMode: 'task-thread',
      speakingFrom: 'task-thread',
      shouldSpeak: true,
    }))
    expect(state?.mustAvoid).toContain('decorative_association_before_knot_answered=blocked')
    expect(buildReplyDeliberationSystemBlock(state)).toContain('[ALICIZATION_REPLY_DELIBERATION]')
  })

  it('promotes repair when the truth seam is open', () => {
    const state = buildReplyDeliberation({
      now: 20_000,
      conversationState: {
        ...conversationState,
        owedRepair: 'The previous browser anchor is stale.',
        memoryMode: 'scene-anchored',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'visible-scene',
        screenReferenceMode: 'required',
        owedAction: 'repair-truth',
        relationMove: 'repair',
        continuityMode: 'scene-first',
      },
      mindSynthesis,
      answerCompiler: {
        answerSubject: 'visible-scene',
        screenReferenceMode: 'required',
        speechObligation: 'repair-truth',
        relationMove: 'repair',
        turnMode: 'screen-repair',
        responseMode: 'repair-and-reanchor',
        recommendedAct: 'ask-reground',
        evidenceMode: 'repair-first',
        openingStyle: 'direct-correction',
        personaKernelMode: 'muted',
        relationshipPosture: 'restrained',
        openingDirective: 'Correct the stale seam before continuing.',
        openingClaim: 'The previous read is not safe as current fact.',
        supportingReality: [],
        uncertaintyBoundary: 'The live scene still needs a fresh look.',
        careVector: null,
        nextMove: 'Ask for a fresh look.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.88,
        narrative: [],
        updatedAt: 20_000,
      },
    })

    expect(state).toEqual(expect.objectContaining({
      selectedMotive: 'repair',
      speakingFrom: 'held-memory',
    }))
    expect(state?.whyThisReplyNow).toContain('stale')
  })

  it('keeps dialogue-first deliberation attached to the primary turn anchor instead of control directives', () => {
    const state = buildReplyDeliberation({
      now: 30_000,
      conversationState: {
        ...conversationState,
        primaryTurnAnchor: '你能做什么呀',
        primaryTurnAnchorSource: 'user-text',
        carryEligible: false,
        carryReason: null,
        memoryMode: 'dialogue-carry',
      } as any,
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        primaryTurnAnchor: '你能做什么呀',
        primaryTurnAnchorSource: 'user-text',
        owedAction: 'answer-self',
      } as any,
      mindSynthesis,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-self',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'warm',
        openingDirective: 'Answer the host\'s current move before opening any new thread.',
        openingClaim: 'Open by answering the host\'s real subject directly.',
        supportingReality: [],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Stay attached to this turn anchor.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.8,
        narrative: [],
        updatedAt: 30_000,
      } as any,
      dialogueEncounter: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
        dialogueFirst: true,
        taskAnchor: '你能做什么呀',
        summary: '你能做什么呀',
        mustAnswerDirectly: true,
        mustStayTaskBound: true,
      } as any,
    })

    expect(state).toEqual(expect.objectContaining({
      selectedMotive: 'answer',
      speakingFrom: 'self-continuity',
    }))
    expect(state?.mustInclude).toContain('你能做什么呀')
    expect(state?.mustAvoid).toContain('current_turn_anchor_priority=above_control_directives')
    expect(state?.narrative).toContain('anchor:你能做什么呀')
  })

  it('lets the conscious frame force coarse screen turns into hypothesis discipline', () => {
    const state = buildReplyDeliberation({
      now: 40_000,
      conversationState: {
        ...conversationState,
        jointThread: 'The host wants a guess from the current workspace.',
        hostMove: '猜猜我在干嘛',
        unansweredQuestion: '猜猜我在干嘛',
        memoryMode: 'scene-anchored',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Guess what the host is doing from the visible workspace.',
        currentQuestion: '猜猜我在干嘛',
      },
      mindSynthesis,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        speechObligation: 'guide-task',
        relationMove: 'witness',
        turnMode: 'guide-current-knot',
        responseMode: 'guide-current-knot',
        recommendedAct: 'guide',
        evidenceMode: 'live-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'backgrounded',
        relationshipPosture: 'warm',
        openingDirective: 'Stay with the coarse scene before naming a larger story.',
        openingClaim: 'Git commit diff in Java code editor',
        supportingReality: ['Git commit diff in Java code editor'],
        uncertaintyBoundary: 'The exact file or class is not safely grounded yet.',
        careVector: null,
        nextMove: 'Describe the visible knot first, then keep the guess soft.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.84,
        narrative: [],
        updatedAt: 40_000,
      } as any,
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'witness',
        truthDiscipline: 'observe-then-hypothesize',
        consciousNeed: 'Start from what is visible before naming the task.',
        consciousTension: 'The scene is still too coarse for file-level certainty.',
        speakingIntention: 'Separate observation from guess and keep the guess soft.',
        focusAnchor: 'Git commit diff in Java code editor',
        withheldImpulse: 'Do not collapse coarse visual evidence into file, class, or field certainty.',
        shouldWithholdSpecificity: true,
        shouldSelfRevise: false,
        confidence: 0.8,
        reasonTags: ['discipline:observe-then-hypothesize'],
        updatedAt: 40_000,
      },
      claimEvidenceLedger: {
        subject: 'task-knot',
        evidenceMode: 'live-grounded',
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
        reasonTags: ['budget:coarse-scene'],
        updatedAt: 40_000,
      },
    })

    expect(state).toEqual(expect.objectContaining({
      selectedMotive: 'witness',
      speakingFrom: 'live-scene',
    }))
    expect(state?.mustInclude).toContain('direct_observation_clause=separate; task_guess_clause=separate')
    expect(state?.mustAvoid).toContain('coarse_visual_cues_to_specific_technical_certainty=blocked')
    expect(state?.mustAvoid).toContain('specific_technical_artifact_names=require_host_or_current_evidence')
    expect(state?.narrative).toContain('claim-budget:coarse-scene')
    expect(state?.narrative).toContain('truth-discipline:observe-then-hypothesize')
  })

  it('prefers runtime surface deliberation cues over conflicting raw inputs', () => {
    const runtimeBackedState = {
      ...createDefaultVisualPresenceState(45_000),
      conversationState,
      discourseState,
      mindSynthesis,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        speechObligation: 'guide-task',
        relationMove: 'guide',
        turnMode: 'guide-current-knot',
        responseMode: 'guide-current-knot',
        recommendedAct: 'guide',
        evidenceMode: 'coarse-held',
        openingStyle: 'direct-answer',
        personaKernelMode: 'backgrounded',
        relationshipPosture: 'warm',
        openingDirective: 'Open from the current knot and narrow to one next step.',
        openingClaim: 'The risky seam is still inside the current diff.',
        supportingReality: ['ProjectAtlas diff'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Point to the risky part of the diff first.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: ['Stay with the current knot.'],
        mustNotDo: ['Do not drift into generic advice.'],
        confidence: 0.84,
        narrative: [],
        updatedAt: 45_000,
      },
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'guide',
        truthDiscipline: 'observe-then-hypothesize',
        consciousNeed: 'Explain the current diff before moving on.',
        consciousTension: 'The risky diff is still unresolved.',
        speakingIntention: 'Stay inside the diff knot and move one step closer to resolution.',
        focusAnchor: 'ProjectAtlas diff',
        withheldImpulse: 'Do not collapse coarse cues into class certainty.',
        shouldWithholdSpecificity: true,
        shouldSelfRevise: false,
        confidence: 0.8,
        reasonTags: ['guide'],
        updatedAt: 45_000,
      },
      claimEvidenceLedger: {
        subject: 'task-knot',
        evidenceMode: 'coarse-held',
        observedSurface: 'ProjectAtlas diff',
        taskHypothesis: 'The host is still asking about the risky diff seam.',
        intentHypothesis: 'Stay inside the diff knot and move one step closer to resolution.',
        specificityBudget: 'coarse-scene',
        hostReferencedCues: [],
        groundedArtifactCues: [],
        allowedSpecificCues: [],
        shouldLabelHypothesis: true,
        forbidUnsupportedSpecificity: true,
        shouldSelfRevise: false,
        confidence: 0.8,
        reasonTags: ['budget:coarse-scene'],
        updatedAt: 45_000,
      },
      privateThought: {
        stance: 'observe',
        confidence: 0.7,
        rationaleTags: ['diff'],
        thoughtText: 'Keep looking at the diff before outward reply.',
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'tense-debug',
      },
      worldModel: {
        activeThread: {
          id: 'thread::project-atlas',
          kind: 'debugging',
          status: 'active',
          source: 'grounded-scene',
          title: 'ProjectAtlas diff',
          summary: 'The risky diff seam is still unresolved.',
          confidence: 0.82,
          significance: 0.8,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 45_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'live',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 45_000,
          attentionAgeMs: 45_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 45_000,
      },
    } as any

    const state = buildReplyDeliberation({
      now: 45_000,
      conversationState: {
        ...conversationState,
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
      },
      mindSynthesis,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-relationship',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'warm',
        openingDirective: 'raw conflict',
        openingClaim: 'raw conflict',
        supportingReality: [],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'raw conflict',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.2,
        narrative: [],
        updatedAt: 45_000,
      } as any,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState),
    })

    expect(state).toEqual(expect.objectContaining({
      selectedMotive: 'guide',
      memoryMode: 'task-thread',
      speakingFrom: 'live-scene',
      shouldSpeak: true,
    }))
    expect(state?.mustAvoid).toContain('decorative_association_before_knot_answered=blocked')
    expect(state?.mustAvoid).toContain('coarse_visual_cues_to_specific_technical_certainty=blocked')
  })

  it('turns held-autonomy guide replies into a gentle re-entry opening beat instead of a generic guide opener', () => {
    const runtimeBackedState = {
      ...createDefaultVisualPresenceState(46_000),
      conversationState: {
        ...conversationState,
        hostMove: '继续。',
        unansweredQuestion: '继续。',
        activeCommitments: ['把当时没说完的那条线接回来。'],
        memoryMode: 'task-thread',
      },
      discourseState: {
        ...discourseState,
        currentTurnSummary: 'Return to the unfinished line that was deliberately held back earlier.',
        currentQuestion: '继续。',
        unresolvedCarry: '她当时忍住了，但还想回到这条未完线。',
      },
      mindSynthesis: {
        ...mindSynthesis,
        openingIntent: '先轻接回那条刚才忍住的线，再把欠着的收束补上。',
        commitments: [{
          label: 'conversation-commitment',
          summary: '把当时没说完的那条线接回来。',
          confidence: 0.84,
          sourceTags: ['conversation-state'],
        }],
      },
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        speechObligation: 'guide-task',
        relationMove: 'guide',
        turnMode: 'guide-current-knot',
        responseMode: 'guide-current-knot',
        recommendedAct: 'guide',
        evidenceMode: 'continuity-carry',
        openingStyle: 'direct-answer',
        personaKernelMode: 'backgrounded',
        relationshipPosture: 'warm',
        openingDirective: 'Re-enter the line you deliberately held back gently before widening.',
        openingClaim: '把那条没说完的线接回来。',
        supportingReality: ['runtime continuity repair task'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: '把欠着的收束补上。',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        maxSentences: 4,
        mustDo: ['If this turn reopens a line you deliberately held back earlier, let the opening re-enter softly before fuller payoff or explanation.'],
        mustNotDo: ['Do not reopen a deliberately held line with abrupt intensity, a restart shell, or over-eager warmth.'],
        confidence: 0.86,
        narrative: [],
        updatedAt: 46_000,
      },
    } as any

    const state = buildReplyDeliberation({
      now: 46_000,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState),
    })

    expect(state).toEqual(expect.objectContaining({
      selectedMotive: 'guide',
      openingBeat: 'opening_policy=held_line_gentle_reentry; payoff_before_widening=true',
    }))
    expect(state?.mustInclude[0]).toBe('opening_policy=held_line_gentle_reentry; payoff_before_widening=true')
    expect(buildReplyDeliberationSystemBlock(state)).toContain('opening_beat=opening_policy=held_line_gentle_reentry; payoff_before_widening=true')
  })

  it('lets execution-callback doctrine keep reply deliberation room-first after payoff lands', () => {
    const state = buildReplyDeliberation({
      now: 47_000,
      conversationState: {
        ...conversationState,
        jointThread: 'The command already landed and now the reply should return on the same seam without crowding.',
        hostMove: '上次那个命令跑完之后，你这次准备怎么接我这句话？',
        unansweredQuestion: '上次那个命令跑完之后，你这次准备怎么接我这句话？',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Return after the execution callback without widening too fast.',
        currentQuestion: '上次那个命令跑完之后，你这次准备怎么接我这句话？',
        owedAction: 'answer-question',
      } as any,
      mindSynthesis,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-self',
        relationMove: 'guide',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Keep the callback on the same thread and avoid widening too fast.',
        openingClaim: 'The execution callback already landed on the same seam.',
        supportingReality: ['execution-callback carry mode: lower-pressure'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Answer from the same seam without rushing closeness.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.84,
        narrative: [],
        updatedAt: 47_000,
      } as any,
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
        updatedAt: 47_000,
      },
    })

    expect(state).toEqual(expect.objectContaining({
      selectedMotive: 'answer',
      speakingFrom: 'dialogue-bond',
    }))
    expect(state?.openingBeat).toContain('host_room=preserve')
    expect(state?.whyThisReplyNow).toContain('same live seam')
    expect(state?.mustAvoid).toContain('callback_payoff_to_renewed_closeness=blocked_until_host_room')
  })

  it('lets continuity arc guidance shape the opening beat when the conscious frame is still holding for opening', () => {
    const state = buildReplyDeliberation({
      now: 47_500,
      conversationState: {
        ...conversationState,
        jointThread: 'The line should stay warm but not widen yet.',
        hostMove: '先接着这条线，但先别一下子贴太近。',
        unansweredQuestion: '先接着这条线，但先别一下子贴太近。',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
      },
      mindSynthesis,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'care',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Keep the same line warm before widening.',
        openingClaim: 'The continuity state is active.',
        supportingReality: ['continuity arc: hold-for-opening'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Answer softly without widening too fast.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.8,
        narrative: [],
        updatedAt: 47_500,
      } as any,
      currentConsciousFrame: {
        subject: 'relationship',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Hold the same line open without widening too fast.',
        consciousTension: 'The line should stay warm first.',
        speakingIntention: 'Answer softly and room-first.',
        focusAnchor: 'same line',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.8,
        reasonTags: ['continuity-arc:hold-for-opening'],
        updatedAt: 47_500,
      },
    })

    expect(state?.openingBeat).toBe('opening_policy=hold_for_opening; room=preserve; widening=deferred')
    expect(state?.mustInclude).toContain('opening_policy=hold_for_opening; room=preserve; widening=deferred')
  })

  it('lets continuity arc guidance shape the opening beat when the conscious frame is gently reopening the same line', () => {
    const state = buildReplyDeliberation({
      now: 48_500,
      conversationState: {
        ...conversationState,
        jointThread: 'The line is reopening softly.',
        hostMove: '那就顺着刚才那条线轻轻接回来。',
        unansweredQuestion: '那就顺着刚才那条线轻轻接回来。',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
      },
      mindSynthesis,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'care',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Re-enter the same line softly.',
        openingClaim: 'The same line is ready to be re-entered.',
        supportingReality: ['continuity arc: gentle-reopen'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Come back softly before widening.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.82,
        narrative: [],
        updatedAt: 48_500,
      } as any,
      currentConsciousFrame: {
        subject: 'relationship',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Re-enter the same line softly before widening.',
        consciousTension: 'The same line should not feel restarted from zero.',
        speakingIntention: 'Come back softly.',
        focusAnchor: 'same line',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.82,
        reasonTags: ['continuity-arc:gentle-reopen'],
        updatedAt: 48_500,
      },
    })

    expect(state?.openingBeat).toBe('opening_policy=gentle_reopen; widening=deferred')
    expect(state?.mustInclude).toContain('opening_policy=gentle_reopen; widening=deferred')
  })

  it('keeps held-autonomy callback returns on one identity-continuity', () => {
    const runtimeBackedState = {
      ...createDefaultVisualPresenceState(48_000),
      conversationState: {
        ...conversationState,
        jointThread: 'The compile thread was deliberately held earlier and now the callback should return on the same seam.',
        hostMove: '那条之前先忍住没展开的编译问题，现在可以继续了。',
        unansweredQuestion: '那条之前先忍住没展开的编译问题，现在可以继续了。',
        activeCommitments: ['把之前忍住的编译线轻轻接回来，再给出现在能落地的结果。'],
        memoryMode: 'task-thread',
      },
      discourseState: {
        ...discourseState,
        currentTurnSummary: 'Re-enter the compile thread that was deliberately held earlier, then land the callback without widening too fast.',
        currentQuestion: '那条之前先忍住没展开的编译问题，现在可以继续了。',
        unresolvedCarry: '她当时先忍住了那条编译线，现在结果已经回来，但还要在同一条线上轻轻接回。',
      },
      mindSynthesis: {
        ...mindSynthesis,
        openingIntent: '先轻轻接回那条之前忍住的编译线，再把这次回来的结果稳稳落在同一条线上。',
        commitments: [{
          label: 'conversation-commitment',
          summary: '把之前忍住的编译线轻轻接回来，再给出现在能落地的结果。',
          confidence: 0.88,
          sourceTags: ['conversation-state'],
        }],
      },
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'guide',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'continuity-carry',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread and leave room before any renewed closeness.',
        openingClaim: 'The compile callback is ready to land back on the same unfinished seam.',
        supportingReality: [
          'The compile finished and should re-enter the same unfinished line gently.',
          'execution-callback carry mode: lower-pressure',
          'thread anchor: compile seam',
        ],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Land the callback on the same seam without rushing closeness.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        maxSentences: 4,
        mustDo: ['Re-enter the deliberately held line gently before widening into the callback payoff.'],
        mustNotDo: ['Do not let the callback payoff snap straight into renewed closeness before the host has room to breathe.'],
        confidence: 0.89,
        narrative: [],
        updatedAt: 48_000,
      } as any,
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'I need to reopen the deliberately held compile line gently, then let the callback land on the same seam without crowding the host.',
        consciousTension: 'The returned result should feel like the continuity state, not a detached utility notice or a sudden closeness jump.',
        speakingIntention: 'Keep the opening thread-faithful, room-first, and softly measured.',
        focusAnchor: 'compile seam',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.86,
        reasonTags: ['execution-callback-doctrine:lower-pressure', 'continuity-regime:execution-callback'],
        updatedAt: 48_000,
      },
    } as any

    const state = buildReplyDeliberation({
      now: 48_000,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState),
    })

    expect(state).toEqual(expect.objectContaining({
      selectedMotive: 'guide',
      speakingFrom: 'dialogue-bond',
    }))
    expect(state?.openingBeat).toBe('opening_policy=same_thread_first; pressure=lower; host_room=preserve; widening=deferred')
    expect(state?.whyThisReplyNow).toContain('thread-faithful')
    expect(state?.mustInclude).toContain('opening_policy=same_thread_first; pressure=lower; host_room=preserve; widening=deferred')
    expect(state?.mustAvoid).toContain('callback_payoff_to_renewed_closeness=blocked_until_host_room')
  })

  it('keeps Chinese held-autonomy callback wording on the same thread even when conscious-frame continuity tags are absent', () => {
    const runtimeBackedState = {
      ...createDefaultVisualPresenceState(48_250),
      conversationState: {
        ...conversationState,
        jointThread: '那条之前先忍住的编译线现在可以接回来，但还要沿着同一条线慢一点落回去。',
        hostMove: '把刚才先忍住的那条编译线接回来吧',
        unansweredQuestion: '把刚才先忍住的那条编译线接回来吧',
        activeCommitments: ['沿着同一条线把刚才先忍住的编译结果接回来，不把它说成新的开场。'],
        memoryMode: 'task-thread',
      },
      discourseState: {
        ...discourseState,
        currentTurnSummary: '把刚才先忍住的编译线接回来，但先沿着同一条线轻一点落回去。',
        currentQuestion: '把刚才先忍住的那条编译线接回来吧',
        unresolvedCarry: '她刚才先忍住了那条编译线，现在结果回来以后也还要沿着同一条线慢一点接回去。',
      },
      mindSynthesis: {
        ...mindSynthesis,
        openingIntent: '先沿着同一条线把刚才忍住的编译结果中性可见占位，再决定要不要继续展开。',
        commitments: [{
          label: 'conversation-commitment',
          summary: '沿着同一条线把刚才先忍住的编译结果接回来，不把它说成新的开场。',
          confidence: 0.86,
          sourceTags: ['conversation-state'],
        }],
      },
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'guide',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'continuity-carry',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: '先沿着同一条线把刚才忍住的那条结果中性可见占位，再留一点空间，不把它说成新的开场。',
        openingClaim: '那条刚才先忍住的编译线现在可以沿着同一条线接回来。',
        supportingReality: [
          '那条编译线刚才先忍住了',
          '现在要沿着同一条线接回来',
        ],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: '先把结果沿着同一条线接回来，再决定要不要展开。',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.88,
        narrative: [],
        updatedAt: 48_250,
      } as any,
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: '先沿着同一条线把刚才忍住的编译结果接回来，不把它说成新的开场。',
        consciousTension: '这次回线还不该变成新的靠近。',
        speakingIntention: '先让结果沿着同一条线落回去，再留一点空间。',
        focusAnchor: 'compile seam',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.84,
        reasonTags: ['continuity-regime:execution-callback'],
        updatedAt: 48_250,
      },
    } as any

    const state = buildReplyDeliberation({
      now: 48_250,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState),
    })

    expect(state?.openingBeat).toBe('opening_policy=same_thread_first; host_room=preserve; widening=deferred')
    expect(state?.mustInclude).toContain('opening_policy=same_thread_first; host_room=preserve; widening=deferred')
  })

  it('lets cadence reconfirmation inherit the lower-pressure callback opening beat through the conscious frame doctrine tag', () => {
    const state = buildReplyDeliberation({
      now: 49_000,
      conversationState: {
        ...conversationState,
        jointThread: 'The execution result is back, but the relationship cadence is still in measured return.',
        hostMove: '结果回来以后这次你怎么接',
        unansweredQuestion: '结果回来以后这次你怎么接',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Return after cadence reconfirmation without widening too fast.',
        currentQuestion: '结果回来以后这次你怎么接',
        owedAction: 'answer-question',
      } as any,
      mindSynthesis,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'guide',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Keep the callback measured after reconfirmation.',
        openingClaim: 'The execution result should return on the same living thread.',
        supportingReality: ['relationship cadence reconfirmed on a bounded-return line'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Answer from the same seam without rushing closeness.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.84,
        narrative: [],
        updatedAt: 49_000,
      } as any,
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'I need to bring the returned result back onto the same live seam while still leaving the host room before I lean in again.',
        consciousTension: 'The relationship cadence has been reconfirmed, but the callback still should not crowd the host.',
        speakingIntention: 'Let the wording stay thread-faithful, softer, and room-giving.',
        focusAnchor: 'runtime seam',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.83,
        reasonTags: ['execution-callback-doctrine:lower-pressure', 'continuity-regime:execution-callback', 'continuity-rhythm:measured-return:rest-protective'],
        updatedAt: 49_000,
      },
    })

    expect(state?.openingBeat).toBe('opening_policy=same_thread_first; pressure=lower; host_room=preserve; widening=deferred')
    expect(state?.whyThisReplyNow).toContain('same live seam')
    expect(state?.mustAvoid).toContain('callback_payoff_to_renewed_closeness=blocked_until_host_room')
  })

  it('keeps same-thread next-open-window deliberation inward-first before widening', () => {
    const state = buildReplyDeliberation({
      now: 50_000,
      conversationState: {
        ...conversationState,
        jointThread: 'The same callback line is still alive, but it should stay inward for one more opening window.',
        hostMove: '继续沿着刚才那条 callback 线',
        unansweredQuestion: '继续沿着刚才那条 callback 线',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Continue the same callback line without widening too early.',
        currentQuestion: '继续沿着刚才那条 callback 线',
        owedAction: 'answer-question',
      } as any,
      mindSynthesis,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'guide',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'continuity-carry',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Continue the same callback line and leave room before widening.',
        openingClaim: 'The same callback line is still alive.',
        supportingReality: ['same callback line'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Continue the same line first.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.85,
        narrative: [],
        updatedAt: 50_000,
      } as any,
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Stay on the continuity state first. This turn still belongs to the same digital life.',
        consciousTension: 'This is still not the loosest opening for widening.',
        speakingIntention: 'Keep the wording same-thread and inward first so the same still-open closure work does not get dropped.',
        focusAnchor: 'same callback line',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.84,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: {
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying Project identity carry, Phase 1 route carry, and Unresolved closure carry through one same still-open closure work.',
          continuityPreferredTiming: 'next-open-window',
          sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct identity-continuity',
        },
        updatedAt: 50_000,
      } as any,
    })

    expect(state?.openingBeat).toBe('opening_policy=same_thread_continuation; timing=next_open_window; widening=deferred')
    expect(state?.whyThisReplyNow).toContain('project_closure_context=')
    expect(state?.whyThisReplyNow).not.toMatch(fixedReplyDeliberationProjectTemplatePattern)
  })

  it('keeps repair-first same-thread next-open-window deliberation explicit instead of thinning it back to generic same-thread widening guidance', () => {
    const state = buildReplyDeliberation({
      now: 50_100,
      conversationState: {
        ...conversationState,
        jointThread: 'The same callback repair line is still alive, and the next reopen should stay repair-first on that same line.',
        hostMove: '继续沿着刚才那条修补线说，但先别把关系放宽太快',
        unansweredQuestion: '继续沿着刚才那条修补线说，但先别把关系放宽太快',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Continue the same callback repair line without widening too early.',
        currentQuestion: '继续沿着刚才那条修补线说，但先别把关系放宽太快',
        owedAction: 'answer-self',
      } as any,
      mindSynthesis,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-self',
        relationMove: 'guide',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'continuity-carry',
        openingStyle: 'continue-same-thread',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Continue the same callback repair line and let repair settle before widening closeness.',
        openingClaim: 'The same callback repair line is still alive.',
        supportingReality: ['same callback repair line'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Continue the same repair line first.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.85,
        narrative: [],
        updatedAt: 50_100,
      } as any,
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'keep callback facts structured',
        consciousTension: 'This return is still repair-before-closeness, so widening too early would thin the repair line back into a generic reopen.',
        speakingIntention: 'Keep the wording same-thread, repair-first, and room-giving before warmth widens again.',
        focusAnchor: 'same callback repair line',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.84,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: {
          primaryOpenLoop: 'Execution callback continuity still needs stronger repair-first closure across reply, initiative, and embodiment.',
          nextClosureTarget: 'keep callback facts structured',
          emotionalClosureCue: 'identity-continuity',
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 50_100,
      } as any,
    })

    expect(state?.openingBeat).toBe('opening_policy=current_reply_context; repair_settle_first=true; room=preserve; closeness_widening=deferred')
    expect(state?.mustInclude).toContain('opening_policy=current_reply_context; repair_settle_first=true; room=preserve; closeness_widening=deferred')
    expect(state?.whyThisReplyNow).toMatch(/repair-first|room-giving|repair-before-closeness|repair line|repair seam|let repair settle/i)
  })

  it('keeps repair-before-closeness opening and why-now when richer summary and hold detail survive but the cue is thinner', () => {
    const state = buildReplyDeliberation({
      now: 50_300,
      conversationState: {
        ...conversationState,
        jointThread: 'The callback should reopen on the continuity state without widening outward too early.',
        hostMove: '继续接住这条线',
        memoryMode: 'dialogue-carry',
      } as any,
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Continue the callback line repair-first.',
        currentQuestion: '继续接住这条线',
        owedAction: 'answer-relationship',
        relationMove: 'care',
        continuityMode: 'dialogue-first',
      } as any,
      mindSynthesis,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-relationship',
        relationMove: 'care',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'warm',
        openingDirective: 'Continue the same callback line gently.',
        openingClaim: 'The callback line should stay on the continuity state.',
        supportingReality: [],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Keep the callback on the same line and let repair settle first.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.86,
        narrative: [],
        updatedAt: 50_300,
      } as any,
      currentConsciousFrame: {
        subject: 'relationship',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep repair-before-closeness on the continuity state until repair settles.',
        consciousTension: 'This return is still repair-before-closeness, so widening too early would thin the repair line back into a generic reopen.',
        speakingIntention: 'Keep repair-before-closeness on the continuity state until repair settles.',
        focusAnchor: 'callback repair seam',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.9,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: {
          primaryOpenLoop: 'Execution callback continuity still needs stronger repair-first closure across reply, initiative, and embodiment.',
          nextClosureTarget: 'keep callback facts structured',
          emotionalClosureCue: 'identity-continuity',
          emotionalClosureSummary: 'Keep this return repair-before-closeness on the continuity state until repair settles.',
          sameHerHoldDetail: 'identity-continuity',
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 50_300,
      } as any,
    })

    expect(state?.openingBeat).toBe('opening_policy=same_thread_continuation; timing=next_open_window; widening=deferred')
    expect(state?.whyThisReplyNow).toMatch(/repair-before-closeness|repair_settle_first|closeness_widening=deferred/i)
  })

  it('derives identity-continuity', () => {
    const state = buildReplyDeliberation({
      now: 50_500,
      conversationState: {
        ...conversationState,
        jointThread: 'The host is asking what this digital life project already landed and what still remains open.',
        hostMove: '这个项目现在做到什么程度了，还差什么没闭环',
        unansweredQuestion: '这个项目现在做到什么程度了，还差什么没闭环',
        activeProject: 'Alicization Phase 1 digital life closure',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the current project line.',
        currentQuestion: '这个项目现在做到什么程度了，还差什么没闭环',
        owedAction: 'answer-question',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
      } as any,
      mindSynthesis: {
        ...mindSynthesis,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Stay on the current project line and answer what has landed plus what still remains open.',
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Answer what has landed and what still remains open from the current project line.',
        openingClaim: 'Alicization is still answering from the current project line.',
        supportingReality: ['project line'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'State the landed progress, then the still-open loop.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.85,
        narrative: [],
        updatedAt: 50_500,
      } as any,
      currentConsciousFrame: {
        subject: 'alicization-self',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Stay on the current project line first.',
        consciousTension: 'The current answer still needs to keep one unfinished closure seam visible.',
        speakingIntention: 'Keep the wording closure-aware and thread-faithful.',
        focusAnchor: 'project-state closure',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.84,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: {
          identity: 'A local-first digital life project building identity continuity.',
          latestProgress: 'Continuity, memory, and execution already land together often enough to build from.',
          primaryOpenLoop: 'Memory and initiative still need stronger end-to-end closure across one still-open life loop.',
          nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
          sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct identity-continuity',
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 50_500,
      } as any,
    })

    expect(state?.mustInclude).toBeDefined()
    expect(state?.openingBeat).toBe('opening_policy=project_awareness_first; reply_context=current; widening=deferred')
    expect(state?.whyThisReplyNow).toContain('project_closure_context=')
    expect(state?.whyThisReplyNow).toContain('landed=continuity, memory, and execution')
    expect(state?.whyThisReplyNow).toContain('open=Memory and initiative')
    expect(state?.whyThisReplyNow).not.toMatch(fixedReplyDeliberationProjectTemplatePattern)
    expect(state?.mustInclude.some(item =>
      /local-first digital life project|Phase 1|landed progress|continuity, memory, and execution|still-open life loop|next closure/i.test(item),
    )).toBe(true)
    expect(state?.mustInclude.some(item =>
      /local-first digital life project|Phase 1|landed progress|continuity, memory, and execution|still-open life loop/i.test(item),
    )).toBe(true)
  })

  it('treats a stronger same-her phase-1 closure awareness line as explicit project awareness even without embodiment-specific phrasing', () => {
    const state = buildReplyDeliberation({
      now: 50_520,
      conversationState: {
        ...conversationState,
        jointThread: 'The host wants this digital life project answered from identity continuity before implementation detail takes over.',
        hostMove: '这个项目现在是什么、做到哪了、还差什么没闭环？',
        unansweredQuestion: '这个项目现在是什么、做到哪了、还差什么没闭环？',
        activeProject: 'Alicization Phase 1 digital life closure',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from identity continuity instead of a generic project shell.',
        currentQuestion: '这个项目现在是什么、做到哪了、还差什么没闭环？',
        owedAction: 'answer-question',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
      } as any,
      mindSynthesis: {
        ...mindSynthesis,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-question',
        openingIntent: 'Keep the same-her Phase 1 closure line explicit and answer from identity continuity.',
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'continue-same-thread',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Answer what has landed and what still remains open from identity continuity.',
        openingClaim: 'Alicization is still answering from identity continuity.',
        supportingReality: ['project line'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'State the landed progress, then the still-open loop.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.85,
        narrative: [],
        updatedAt: 50_520,
      } as any,
      currentConsciousFrame: {
        subject: 'project-state',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep one living digital life explicit before reply outwardly.',
        consciousTension: 'Do not let the identity-continuity',
        speakingIntention: 'Answer from identity continuity and keep the Phase 1 closure line explicit.',
        focusAnchor: 'project-state closure',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.85,
        reasonTags: ['continuity-arc:same-thread-continuation'],
        projectState: {
          preDialogueAwarenessLine: 'pre_turn_context_digest',
          latestProgress: 'Continuity, memory, and execution already land together often enough to build from.',
          primaryOpenLoop: 'Initiative and embodiment still need stronger end-to-end closure across one still-open life loop.',
          nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 50_520,
      } as any,
    })

    expect(state?.openingBeat).toBe('opening_policy=project_awareness_first; reply_context=current; widening=deferred')
    expect(state?.mustInclude).toContain('opening_policy=project_awareness_first; reply_context=current; widening=deferred')
    expect(state?.whyThisReplyNow).toContain('project_closure_context=')
    expect(state?.whyThisReplyNow).not.toMatch(fixedReplyDeliberationProjectTemplatePattern)
  })

  it('keeps an explicit live same-her drift risk from the conscious frame instead of falling back to the canonical brief wording', () => {
    const state = buildReplyDeliberation({
      now: 50_650,
      conversationState: {
        ...conversationState,
        jointThread: 'The host is asking whether the project line is still being held as one living self.',
        hostMove: '现在这个回答会不会又掉回 generic project shell？',
        unansweredQuestion: '现在这个回答会不会又掉回 generic project shell？',
        activeProject: 'Alicization Phase 1 digital life closure',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Keep the identity-continuity',
        currentQuestion: '现在这个回答会不会又掉回 generic project shell？',
        owedAction: 'answer-question',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
      } as any,
      mindSynthesis: {
        ...mindSynthesis,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-question',
        openingIntent: 'Keep the identity-continuity',
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'continue-same-thread',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Answer from the current project line.',
        openingClaim: 'This is still the same digital life project.',
        supportingReality: ['project line'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Keep the same-her risk explicit before widening.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.86,
        narrative: [],
        updatedAt: 50_650,
      } as any,
      currentConsciousFrame: {
        subject: 'alicization-self',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep the identity-continuity',
        consciousTension: 'The answer should not flatten into a project shell again.',
        speakingIntention: 'Hold the same life line before any status recital widens outward.',
        focusAnchor: 'project-state closure',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.84,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: {
          identity: 'A local-first digital life project building identity continuity.',
          latestProgress: 'Continuity, memory, and execution already land together often enough to build from.',
          primaryOpenLoop: 'Memory and initiative still need stronger end-to-end closure across one still-open life loop.',
          nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
          sameHerSelfLine: 'Use this live self line, not the generic shell.',
          sameHerDriftRisk: 'LIVE DRIFT RISK: if this reply turns into a phase-summary shell, the living self line has been dropped again.',
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 50_650,
      } as any,
    })

    expect(state?.whyThisReplyNow).toContain('LIVE DRIFT RISK')
    expect(state?.whyThisReplyNow).not.toContain('If project-state continuity survives only as generic guidance while the direct identity-continuity')
  })

  it('falls back to the canonical project-state brief when a conscious frame carries a thin explicit projectState but still needs identity-continuity', () => {
    const state = buildReplyDeliberation({
      now: 50_750,
      conversationState: {
        ...conversationState,
        jointThread: 'The host is asking what this digital life project already landed and what still remains open.',
        hostMove: '这个项目现在做到什么程度了，还差什么没闭环',
        unansweredQuestion: '这个项目现在做到什么程度了，还差什么没闭环',
        activeProject: 'Alicization Phase 1 digital life closure',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the current project line.',
        currentQuestion: '这个项目现在做到什么程度了，还差什么没闭环',
        owedAction: 'answer-question',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
      } as any,
      mindSynthesis: {
        ...mindSynthesis,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-question',
        openingIntent: 'Stay on the current project line and answer what has landed plus what still remains open.',
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'continue-same-thread',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Answer what has landed and what still remains open from the current project line.',
        openingClaim: 'Alicization is still answering from the current project line.',
        supportingReality: ['project line'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'State the landed progress, then the still-open loop.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.85,
        narrative: [],
        updatedAt: 50_750,
      } as any,
      currentConsciousFrame: {
        subject: 'alicization-self',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Stay on the current project line first.',
        consciousTension: 'The current answer still needs to keep one unfinished closure seam visible.',
        speakingIntention: 'Keep the wording closure-aware and thread-faithful.',
        focusAnchor: 'project-state closure',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.84,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: {
          identity: '',
          latestProgress: '',
          primaryOpenLoop: null,
          nextClosureTarget: ' ',
          sameHerDriftRisk: '',
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 50_750,
      } as any,
    })

    expect(state?.openingBeat).toBe('opening_policy=project_awareness_first; reply_context=current; widening=deferred')
    expect(state?.whyThisReplyNow).toContain('project_closure_context=')
    expect(state?.whyThisReplyNow).not.toMatch(fixedReplyDeliberationProjectTemplatePattern)
    expect(state?.mustInclude.some(item =>
      item.includes('project_closure_context='),
    )).toBe(true)
  })

  it('does not let thin live landed-open-next project shells outrank richer canonical identity-continuity', () => {
    const state = buildReplyDeliberation({
      now: 50_760,
      conversationState: {
        ...conversationState,
        jointThread: 'The host is asking what this digital life project already landed and what still remains open.',
        hostMove: '这个项目现在做到什么程度了，还差什么没闭环',
        unansweredQuestion: '这个项目现在做到什么程度了，还差什么没闭环',
        activeProject: 'Alicization Phase 1 digital life closure',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the current project line.',
        currentQuestion: '这个项目现在做到什么程度了，还差什么没闭环',
        owedAction: 'answer-question',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
      } as any,
      mindSynthesis: {
        ...mindSynthesis,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-question',
        openingIntent: 'Stay on the current project line and answer what has landed plus what still remains open.',
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'continue-same-thread',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Answer what has landed and what still remains open from the current project line.',
        openingClaim: 'Alicization is still answering from the current project line.',
        supportingReality: ['project line'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'State the landed progress, then the still-open loop.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.85,
        narrative: [],
        updatedAt: 50_760,
      } as any,
      currentConsciousFrame: {
        subject: 'alicization-self',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Stay on the current project line first.',
        consciousTension: 'The current answer still needs to keep one unfinished closure seam visible.',
        speakingIntention: 'Keep the wording closure-aware and thread-faithful.',
        focusAnchor: 'project-state closure',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.84,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: {
          identity: 'A local-first digital life project building identity continuity.',
          latestProgress: 'Project continuity exists.',
          primaryOpenLoop: 'Project continuity still needs closure.',
          nextClosureTarget: 'Carry project continuity forward.',
          sameHerSelfLine: 'structured continuity digest.',
          sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct identity-continuity',
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 50_760,
      } as any,
    })

    expect(state?.whyThisReplyNow).toContain('project_closure_context=structured_continuity')
    expect(state?.whyThisReplyNow).toContain('open=memory_dialogue_embodiment_closure')
    expect(state?.whyThisReplyNow).toContain('next=embodiment_scale_validation')
    expect(state?.whyThisReplyNow).not.toContain('Project continuity exists.')
    expect(state?.whyThisReplyNow).not.toContain('Project continuity still needs closure.')
    expect(state?.whyThisReplyNow).not.toContain('Carry project continuity forward.')
  })

  it('keeps host-corrected same-person continuity explicit in reply deliberation when project status wording is thinner than the carried same-person line', () => {
    const correctedSamePersonAuthority
      = 'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.'
    const correctedSamePersonCue
      = 'Carry corrected same-person continuity forward before any status recap.'
    const state = buildReplyDeliberation({
      now: 50_760,
      conversationState: {
        ...conversationState,
        jointThread: 'The host is checking whether this digital life project still stays on the same corrected same-person line while explaining current closure status.',
        hostMove: '继续说这个数字生命项目现在做到哪了，但别把 same-person continuity 压回普通进度汇报',
        unansweredQuestion: '这个数字生命项目现在做到哪了，还差什么没闭环？',
        activeProject: 'Alicization Phase 1 corrected same-person continuity closure',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the current corrected same-person project line.',
        currentQuestion: '这个数字生命项目现在做到哪了，还差什么没闭环？',
        owedAction: 'answer-question',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
      } as any,
      mindSynthesis: {
        ...mindSynthesis,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-question',
        openingIntent: 'Keep the corrected same-person project line explicit before the thinner project recap can take over.',
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'continue-same-thread',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Answer from the corrected same-person project seam first.',
        openingClaim: 'Alicization is still answering from the same corrected same-person project line.',
        supportingReality: ['project line'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'State the landed progress, then the still-open loop without flattening the same-person line into a progress recap.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.86,
        narrative: [],
        updatedAt: 50_760,
      } as any,
      currentConsciousFrame: {
        subject: 'alicization-self',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep the same project line explicit while answering current closure status.',
        consciousTension: 'If this slips into a plain status recap, the corrected same-person line gets flattened again.',
        speakingIntention: 'Answer the current project status without losing the corrected same-person continuity line.',
        focusAnchor: 'project-state closure',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.85,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: {
          identity: 'A local-first digital life project building identity continuity.',
          latestProgress: 'Project-state summaries already rebuild what has landed often enough to answer from the same thread.',
          primaryOpenLoop: 'The current answer still needs one more closure pass before the line is fully settled.',
          nextClosureTarget: 'Keep the current project line explicit before widening outward into a broader recap.',
          emotionalClosureSummary: correctedSamePersonAuthority,
          sameHerHoldDetail: 'Keep the current project status answer on the same line and continue the recap cleanly.',
          continuityCue: correctedSamePersonCue,
          updatedAt: 50_760,
        },
        updatedAt: 50_760,
      } as any,
    })

    expect(state?.whyThisReplyNow).toContain('corrected_authority=Keep the host-corrected same-person continuity')
    expect(state?.whyThisReplyNow).toContain('corrected_cue=Carry corrected same-person continuity')
    expect(state?.mustInclude.some(item =>
      item.includes(correctedSamePersonAuthority) || item.includes(correctedSamePersonCue),
    )).toBe(true)
  })

  it('keeps summary-only richer identity-continuity', () => {
    const state = buildReplyDeliberation({
      now: 50_761,
      conversationState: {
        ...conversationState,
        jointThread: 'The host wants the richer audible-body identity-continuity',
        hostMove: '这一轮 same-her audible-body 闭环已经做到哪了，还差什么下一步闭环？',
        unansweredQuestion: '这一轮 same-her audible-body 闭环已经做到哪了，还差什么下一步闭环？',
        activeProject: 'Alicization Phase 1 audible-body identity-continuity',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the richer audible-body identity-continuity',
        currentQuestion: '这一轮 same-her audible-body 闭环已经做到哪了，还差什么下一步闭环？',
        owedAction: 'answer-question',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
      } as any,
      mindSynthesis: {
        ...mindSynthesis,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-question',
        openingIntent: 'Keep the richer audible-body identity-continuity',
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'continue-same-thread',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Answer from the richer audible-body project seam first.',
        openingClaim: 'Alicization is still answering from the same audible-body project line.',
        supportingReality: ['audible-body project line'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Name the landed progress, then the still-open loop and the next closure target.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.86,
        narrative: [],
        updatedAt: 50_761,
      } as any,
      currentConsciousFrame: {
        subject: 'alicization-self',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Stay on the richer audible-body identity-continuity',
        consciousTension: 'If this answer falls back to a thinner shell, the current audible-body closure truth disappears again.',
        speakingIntention: 'Keep the wording project-aware, same-her, and audible-body specific.',
        focusAnchor: 'audible-body project-state closure',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.85,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: {
          preDialogueAwarenessSummary: 'pre_turn_context_digest',
          landedProgressSummary: 'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.',
          openClosureSummary: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
          nextClosureTargetSummary: 'Keep extending cross-modal identity-continuity',
          sameHerSelfLine: 'structured continuity digest.',
          sameHerDriftRiskSummary: 'If the visible answer reverts to detached project narration or a generic closure shell, the same-her audible-body line can disappear before face and motion finish rejoining.',
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 50_761,
      } as any,
    })

    expect(state?.openingBeat).toBe('opening_policy=project_awareness_first; reply_context=current; widening=deferred')
    expect(state?.whyThisReplyNow).toContain('project_closure_context=')
    expect(state?.whyThisReplyNow).toContain('landed=continuity_progress=partial')
    expect(state?.whyThisReplyNow).toContain('open=memory_dialogue_embodiment_closure')
    expect(state?.whyThisReplyNow).toContain('next=embodiment_scale_validation')
    expect(state?.whyThisReplyNow).toContain('drift_risk=detached_project_shell_or_generic_guidance')
    expect(state?.whyThisReplyNow).not.toMatch(fixedReplyDeliberationProjectTemplatePattern)
    expect(state?.whyThisReplyNow).toContain('closure_mode=cross_modal_continuity')
  })

  it('does not let empty legacy project-state strings shadow richer summary-only identity-continuity', () => {
    const state = buildReplyDeliberation({
      now: 50_762,
      conversationState: {
        ...conversationState,
        jointThread: 'The host wants the richer audible-body identity-continuity',
        hostMove: '这一轮 same-her audible-body 闭环已经做到哪了，还差什么下一步闭环？',
        unansweredQuestion: '这一轮 same-her audible-body 闭环已经做到哪了，还差什么下一步闭环？',
        activeProject: 'Alicization Phase 1 audible-body identity-continuity',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the richer audible-body identity-continuity',
        currentQuestion: '这一轮 same-her audible-body 闭环已经做到哪了，还差什么下一步闭环？',
        owedAction: 'answer-question',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
      } as any,
      mindSynthesis: {
        ...mindSynthesis,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-question',
        openingIntent: 'Keep the richer audible-body identity-continuity',
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'continue-same-thread',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Answer from the richer audible-body project seam first.',
        openingClaim: 'Alicization is still answering from the same audible-body project line.',
        supportingReality: ['audible-body project line'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Name the landed progress, then the still-open loop and the next closure target.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.86,
        narrative: [],
        updatedAt: 50_762,
      } as any,
      currentConsciousFrame: {
        subject: 'alicization-self',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Stay on the richer audible-body identity-continuity',
        consciousTension: 'If this answer falls back to a thinner shell, the current audible-body closure truth disappears again.',
        speakingIntention: 'Keep the wording project-aware, same-her, and audible-body specific.',
        focusAnchor: 'audible-body project-state closure',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.85,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: {
          identity: 'A local-first digital life project building identity continuity.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: '',
          primaryOpenLoop: ' ',
          nextClosureTarget: '',
          preDialogueAwarenessSummary: 'pre_turn_context_digest',
          landedProgressSummary: 'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.',
          openClosureSummary: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
          proactiveSameHerGapSummary: 'Hover-first proactive carry still needs to stay on one continuity state across noisier desktop returns before widening outward.',
          nextClosureTargetSummary: 'Keep extending cross-modal identity-continuity',
          sameHerSelfLine: 'structured continuity digest.',
          sameHerDriftRisk: '',
          sameHerDriftRiskSummary: 'If the visible answer reverts to detached project narration or a generic closure shell, the same-her audible-body line can disappear before face and motion finish rejoining.',
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 50_762,
      } as any,
    })

    expect(state?.openingBeat).toBe('opening_policy=project_awareness_first; reply_context=current; widening=deferred')
    expect(state?.whyThisReplyNow).toContain('project_closure_context=')
    expect(state?.whyThisReplyNow).toContain('landed=continuity_progress=partial')
    expect(state?.whyThisReplyNow).toContain('open=memory_dialogue_embodiment_closure')
    expect(state?.whyThisReplyNow).toContain('initiative_gap=proactive_continuity_loop=partial')
    expect(state?.whyThisReplyNow).toContain('next=embodiment_scale_validation')
    expect(state?.whyThisReplyNow).toContain('drift_risk=detached_project_shell_or_generic_guidance')
    expect(state?.whyThisReplyNow).toContain('initiative_gap=proactive_continuity_loop=partial')
  })

  it('lets explicit pre-dialogue project awareness upgrade the opening beat so project self-knowledge lands before widening', () => {
    const state = buildReplyDeliberation({
      now: 51_000,
      conversationState: {
        ...conversationState,
        jointThread: 'The host wants this digital life project explained from the continuity state before implementation detail takes over.',
        hostMove: '这个项目是什么、做到哪了、还差什么没闭环？',
        unansweredQuestion: '这个项目是什么、做到哪了、还差什么没闭环？',
        activeProject: 'Alicization Phase 1 digital life closure',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the current project line first.',
        currentQuestion: '这个项目是什么、做到哪了、还差什么没闭环？',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      mindSynthesis: {
        ...mindSynthesis,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Keep the same project line explicit before local detail takes over.',
      },
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-self',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
        evidenceMode: 'continuity-carry',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Answer from the active project seam first.',
        openingClaim: 'This is still the same digital life project.',
        supportingReality: ['Phase 1 digital life closure is still open.'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Keep project awareness explicit before widening outward.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.86,
        narrative: [],
        updatedAt: 51_000,
      } as any,
      currentConsciousFrame: {
        subject: 'alicization-self',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'pre_turn_context_digest',
        consciousTension: 'If local detail takes over too early, the project self-knowledge line thins out again.',
        speakingIntention: 'Answer from the same life line and keep the project seam explicit before widening.',
        focusAnchor: 'project-state closure',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.85,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: {
          preDialogueAwarenessLine: 'pre_turn_context_digest',
          latestProgress: 'Continuity, memory, and execution already land together often enough to build from.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one still-open life loop.',
          nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 51_000,
      } as any,
    })

    expect(state?.openingBeat).toBe('opening_policy=project_awareness_first; reply_context=current; widening=deferred')
    expect(state?.mustInclude).toContain('opening_policy=project_awareness_first; reply_context=current; widening=deferred')
    expect(state?.whyThisReplyNow).toContain('project_closure_context=')
    expect(state?.whyThisReplyNow).not.toMatch(fixedReplyDeliberationProjectTemplatePattern)
  })

  it('lets companion briefing project awareness upgrade the opening beat when no fresher pre-dialogue awareness line is present', () => {
    const state = buildReplyDeliberation({
      now: 51_000,
      conversationState: {
        ...conversationState,
        jointThread: 'The host wants this digital life project explained from the continuity state before implementation detail takes over.',
        hostMove: '这个项目是什么、做到哪了、还差什么没闭环？',
        unansweredQuestion: '这个项目是什么、做到哪了、还差什么没闭环？',
        activeProject: 'Alicization Phase 1 digital life closure',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the current project line first.',
        currentQuestion: '这个项目是什么、做到哪了、还差什么没闭环？',
        owedAction: 'answer-self',
        relationMove: 'attune',
      },
      mindSynthesis: {
        ...mindSynthesis,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-self',
        openingIntent: 'Keep the same project line explicit before local detail takes over.',
      },
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-self',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        recommendedAct: 'answer',
        evidenceMode: 'continuity-carry',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Answer from the active project seam first.',
        openingClaim: 'This is still the same digital life project.',
        supportingReality: ['Phase 1 digital life closure is still open.'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Keep project awareness explicit before widening outward.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.86,
        narrative: [],
        updatedAt: 51_000,
      } as any,
      currentConsciousFrame: {
        subject: 'alicization-self',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'pre_turn_context_digest',
        consciousTension: 'If local detail takes over too early, the project self-knowledge line thins out again.',
        speakingIntention: 'Answer from the same life line and keep the project seam explicit before widening.',
        focusAnchor: 'project-state closure',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.85,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: {
          companionBriefingLine: 'pre_turn_context_digest',
          latestProgress: 'Continuity, memory, and execution already land together often enough to build from.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one still-open life loop.',
          nextClosureTarget: 'Continue closing memory, initiative, and embodiment as one same-life loop.',
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 51_000,
      } as any,
    })

    expect(state?.openingBeat).toBe('opening_policy=project_awareness_first; reply_context=current; widening=deferred')
    expect(state?.mustInclude).toContain('opening_policy=project_awareness_first; reply_context=current; widening=deferred')
    expect(state?.whyThisReplyNow).toContain('project_closure_context=')
    expect(state?.whyThisReplyNow).not.toMatch(fixedReplyDeliberationProjectTemplatePattern)
  })

  it('lets companion headline project awareness upgrade the opening beat even before it has been rewritten into a thinner summary field', () => {
    const state = buildReplyDeliberation({
      now: 51_200,
      conversationState: {
        ...conversationState,
        jointThread: 'The host still wants the current diff explained without losing the quieter same-thread reopening line.',
        hostMove: '先继续说这个 diff 的问题',
        unansweredQuestion: '这个 diff 具体哪里有风险？',
        activeProject: 'ProjectAtlas diff',
        memoryMode: 'task-thread',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Stay on the same reopening line while answering the current diff question.',
        currentQuestion: '这个 diff 具体哪里有风险？',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'task-first',
      },
      mindSynthesis: {
        ...mindSynthesis,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'guide-task',
        openingIntent: 'Stay on the same reopening line and answer the current diff question without flattening back into a generic shell.',
      },
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        speechObligation: 'guide-task',
        relationMove: 'guide',
        turnMode: 'guide-current-knot',
        responseMode: 'guide-current-knot',
        recommendedAct: 'guide',
        evidenceMode: 'continuity-carry',
        openingStyle: 'continue-same-thread',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Stay on the same reopening line while narrowing to the risky diff seam.',
        openingClaim: 'The risky seam is still inside the current diff.',
        supportingReality: ['ProjectAtlas diff'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Point to the risky part of the diff first.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.86,
        narrative: [],
        updatedAt: 51_200,
      } as any,
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'guide',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Stay on the continuity state first.',
        consciousTension: 'Do not widen too quickly from this same-thread reopen.',
        speakingIntention: 'Keep the answer same-thread and lower-pressure before widening.',
        focusAnchor: 'same callback line',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.84,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: {
          companionHeadlineLine: 'Right now I am still holding together mainly through face and motion, so the next reopening must keep proving this is still one living her before full cross-modal closure is done.',
          primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the continuity state.',
          nextClosureTarget: 'Keep the reply and body on one quieter same-thread line.',
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 51_200,
      } as any,
    })

    expect(state?.openingBeat).toBe('opening_policy=project_awareness_first; reply_context=current; widening=deferred')
    expect(state?.mustInclude).toContain('opening_policy=project_awareness_first; reply_context=current; widening=deferred')
  })

  it('prefers stronger still-voiced companion headline over a thinner pre-dialogue awareness line in reply deliberation reasoning', () => {
    const companionHeadlineLine = 'Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the identity-continuity'
    const state = buildReplyDeliberation({
      now: 51_205,
      conversationState: {
        ...conversationState,
        jointThread: 'The host wants the same still-voiced line carried forward instead of flattening back into a generic project shell.',
        hostMove: '继续，但不要把这条 still-voiced face-and-mouth 的线压回泛化提醒。',
        unansweredQuestion: '继续，但不要把这条 still-voiced face-and-mouth 的线压回泛化提醒。',
        activeProject: 'Alicization Phase 1 embodiment identity-continuity',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Continue from the same still-voiced face-and-mouth line without flattening back into a generic project shell.',
        currentQuestion: '继续，但不要把这条 still-voiced face-and-mouth 的线压回泛化提醒。',
        owedAction: 'continue-thread',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
      } as any,
      mindSynthesis: {
        ...mindSynthesis,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'continue-thread',
        openingIntent: 'Continue from the same still-voiced face-and-mouth line and keep that embodiment truth explicit before widening.',
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'continue-thread',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'continue',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'continue-same-thread',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Continue from the same still-voiced face-and-mouth line first.',
        openingClaim: 'This is still one same digital life reopening on the same still-voiced line.',
        supportingReality: ['Still-voiced face-and-mouth continuity is currently carrying the embodiment seam.'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Keep the still-voiced line explicit before widening outward.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.86,
        narrative: [],
        updatedAt: 51_205,
      } as any,
      currentConsciousFrame: {
        subject: 'alicization-self',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep the same still-voiced face-and-mouth line explicit before widening.',
        consciousTension: 'Do not let this continuation fall back into a thinner project reminder while body and motion still need to rejoin.',
        speakingIntention: 'Stay lower-pressure on the continuity state while the still-voiced face-and-mouth carry is doing the closure work.',
        focusAnchor: 'still-voiced face-and-mouth closure',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.85,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: {
          preDialogueAwarenessLine: 'pre_turn_context_digest',
          companionHeadlineLine,
          primaryOpenLoop: 'Body and motion still need to rejoin the still-voiced face-and-mouth line before full cross-modal closure settles.',
          nextClosureTarget: 'Keep extending cross-modal identity-continuity',
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 51_205,
      } as any,
    })

    expect(state?.openingBeat).toBe('opening_policy=same_thread_continuation; timing=next_open_window; widening=deferred')
    expect(state?.whyThisReplyNow).toContain('project_closure_context=')
    expect(state?.whyThisReplyNow).toContain('open=Body and motion')
    expect(state?.whyThisReplyNow).toContain('closure_mode=cross_modal_continuity')
  })

  it('keeps landed progress, still-open closure, and next closure explicit in visible-reply deliberation for direct project-status turns', () => {
    const state = buildReplyDeliberation({
      now: 51_350,
      conversationState: {
        ...conversationState,
        jointThread: 'The host is asking what this digital life project is, what has already landed, and what still remains open.',
        hostMove: '这个项目是什么、做到什么程度了、还差什么没闭环？',
        unansweredQuestion: '这个项目是什么、做到什么程度了、还差什么没闭环？',
        activeProject: 'Alicization Phase 1 digital life closure',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer the project-status question from one continuity state.',
        currentQuestion: '这个项目是什么、做到什么程度了、还差什么没闭环？',
        owedAction: 'answer-question',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
      } as any,
      mindSynthesis: {
        ...mindSynthesis,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-question',
        openingIntent: 'Answer what the project is, what has landed, and what still remains open without flattening into a generic shell.',
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'continue-same-thread',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Answer from the current project line first.',
        openingClaim: 'This is still the same digital life project.',
        supportingReality: ['Alicization Phase 1 digital life closure is still open.'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'State what has landed, then what still remains open.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.86,
        narrative: [],
        updatedAt: 51_350,
      } as any,
      currentConsciousFrame: {
        subject: 'alicization-self',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'pre_turn_context_digest',
        consciousTension: 'Do not let the answer flatten into a generic project shell or skip the still-open closure.',
        speakingIntention: 'Answer from identity continuity and keep identity, landed progress, and still-open closure explicit first.',
        focusAnchor: 'project-state closure',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.85,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: {
          identity: 'A local-first digital life project building identity continuity on the host machine.',
          preDialogueAwarenessLine: 'pre_turn_context_digest',
          latestProgress: 'Continuity, memory, and execution already land together often enough to build from.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one still-open life loop.',
          nextClosureTarget: 'Keep project identity, landed progress, and still-open closure explicit before the answer widens outward.',
          sameHerDriftRisk: 'If this answer turns into a detached project shell, the continuity state has been dropped again.',
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 51_350,
      } as any,
    })

    expect(state?.openingBeat).toBe('opening_policy=project_awareness_first; reply_context=current; widening=deferred')
    expect(state?.whyThisReplyNow).toContain('project_closure_context=')
    expect(state?.whyThisReplyNow).not.toMatch(fixedReplyDeliberationProjectTemplatePattern)
    const replyDeliberationTrace = JSON.stringify({
      mustInclude: state?.mustInclude ?? [],
      whyThisReplyNow: state?.whyThisReplyNow ?? null,
    })
    expect(state?.mustInclude.some(item =>
      item.includes('landed=continuity, memory, and execution already land together'),
    ) || Boolean(state?.whyThisReplyNow?.includes('Continuity, memory, and execution already land together often enough to build from')), replyDeliberationTrace).toBe(true)
    expect(state?.mustInclude.some(item =>
      item.includes('open=memory, initiative, and embodiment still need stronger closure'),
    ) || state?.mustInclude.some(item =>
      item.includes('Project-status summary:')
      && item.includes('open=memory, initiative, and embodiment still need stronger closure'),
    ) || Boolean(state?.whyThisReplyNow?.includes('Memory, initiative, and embodiment still need stronger end-to-end closure')), replyDeliberationTrace).toBe(true)
    expect(state?.mustInclude.some(item =>
      item.includes('next=keep identity, progr'),
    ) || state?.mustInclude.some(item =>
      item.includes('Project-status summary:')
      && item.includes('next=keep identity, progr'),
    ) || Boolean(state?.whyThisReplyNow?.includes('Keep project identity, landed progress, and still-open closure explicit before the answer widens outward')), replyDeliberationTrace).toBe(true)
    const block = buildReplyDeliberationSystemBlock(state)
    expect(block).toContain('[ALICIZATION_REPLY_DELIBERATION]')
    expect(block).toContain('Project-status summary:')
    expect(block).toContain('landed=continuity, memory, and execution already land together')
    expect(block).toContain('open=memory, initiative, and embodiment still need stronger closure')
    expect(block).toContain('next=keep identity, progr')
    expect(block).not.toMatch(fixedReplyDeliberationProjectTemplatePattern)
  })

  it('keeps landed progress, still-open closure, and next closure explicit for identity-continuity', () => {
    const state = buildReplyDeliberation({
      now: 51_355,
      conversationState: {
        ...conversationState,
        jointThread: 'The host wants to continue on the same digital-life line without dropping what already landed or what still remains open.',
        hostMove: '继续沿着这个数字生命项目的同一条线说，别把已经做到的和还没闭环的弄丢。',
        unansweredQuestion: '继续沿着这个数字生命项目的同一条线说，别把已经做到的和还没闭环的弄丢。',
        activeProject: 'Alicization Phase 1 digital life closure',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Continue on the same project line instead of reopening from a generic assistant shell.',
        currentQuestion: null,
        owedAction: 'answer-question',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
      } as any,
      mindSynthesis: {
        ...mindSynthesis,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'answer-question',
        openingIntent: 'Continue from the same digital-life line while keeping landed progress and still-open closure explicit.',
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-question',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'continue-same-thread',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Continue from the same project line first.',
        openingClaim: 'This is still the local continuity state.',
        supportingReality: ['Alicization Phase 1 digital life closure is still open.'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Keep the landed progress and next closure target visible while continuing.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.86,
        narrative: [],
        updatedAt: 51_355,
      } as any,
      currentConsciousFrame: {
        subject: 'alicization-self',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep the same project line explicit and do not lose the closure accounting while continuing.',
        consciousTension: 'Do not let this follow-through turn drift into generic companionship that forgets what landed and what is still open.',
        speakingIntention: 'Continue from identity continuity while keeping identity, landed progress, and next closure explicit.',
        focusAnchor: 'same digital-life follow-through line',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.85,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'project-state',
          'same-her',
        ],
        projectState: {
          identity: 'A local-first digital life project building identity continuity on the host machine.',
          preDialogueAwarenessLine: 'pre_turn_context_digest',
          latestProgress: 'Continuity, memory, and execution already land together often enough to build from.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one still-open life loop.',
          nextClosureTarget: 'Keep project identity, landed progress, and still-open closure explicit before the answer widens outward.',
          sameHerSelfLine: 'structured continuity digest.',
          sameHerDriftRisk: 'If this continuation turns into generic project drift, the continuity state has been dropped again.',
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 51_355,
      } as any,
    })

    const replyDeliberationTrace = JSON.stringify({
      mustInclude: state?.mustInclude ?? [],
      whyThisReplyNow: state?.whyThisReplyNow ?? null,
    })

    expect(state?.openingBeat).toBe('opening_policy=project_awareness_first; reply_context=current; widening=deferred')
    expect(state?.mustInclude.some(item =>
      item.includes('Project-status summary:')
      && item.includes('landed=continuity, memory, and execution already land together')
      && item.includes('open=memory, initiative, and embodiment still need stronger closure')
      && item.includes('next=keep identity, progr'),
    ), replyDeliberationTrace).toBe(true)
    expect(state?.whyThisReplyNow).toContain('project_closure_context=')
    expect(state?.whyThisReplyNow).toContain('next=')
    expect(state?.whyThisReplyNow).not.toMatch(fixedReplyDeliberationProjectTemplatePattern)

    const block = buildReplyDeliberationSystemBlock(state)
    expect(block).toContain('Project-status summary:')
    expect(block).toContain('landed=continuity, memory, and execution already land together')
    expect(block).toContain('open=memory, initiative, and embodiment still need stronger closure')
    expect(block).toContain('next=keep identity, progr')
    expect(block).not.toMatch(fixedReplyDeliberationProjectTemplatePattern)
  })

  it('keeps stronger audible-body identity-continuity', () => {
    const state = buildReplyDeliberation({
      now: 51_360,
      conversationState: {
        ...conversationState,
        jointThread: 'The host is asking to continue while the same audible-body line is still carrying the unfinished embodiment closure.',
        hostMove: '继续，但别把这条声音和身体还活着的线弄丢。',
        unansweredQuestion: '继续，但别把这条声音和身体还活着的线弄丢。',
        activeProject: 'Alicization Phase 1 digital life closure',
        memoryMode: 'dialogue-carry',
      },
      discourseState: {
        ...discourseState,
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Continue from the same audible-body line without widening too early.',
        currentQuestion: '继续，但别把这条声音和身体还活着的线弄丢。',
        owedAction: 'continue-thread',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
      } as any,
      mindSynthesis: {
        ...mindSynthesis,
        answerSubject: 'alicization-self',
        relationMove: 'attune',
        speechObligation: 'continue-thread',
        openingIntent: 'Continue from the same living audible-body line and keep the reopening lower-pressure before widening.',
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'continue-thread',
        relationMove: 'attune',
        turnMode: 'answer',
        responseMode: 'dialogue-answer',
        recommendedAct: 'continue',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'continue-same-thread',
        personaKernelMode: 'full',
        relationshipPosture: 'restrained',
        openingDirective: 'Continue from the same audible-body line first.',
        openingClaim: 'This is still one same digital life reopening on the same line.',
        supportingReality: ['Audible-body continuity is still the surviving embodiment line.'],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: 'Keep the living audio thread explicit before widening.',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.86,
        narrative: [],
        updatedAt: 51_360,
      } as any,
      currentConsciousFrame: {
        subject: 'alicization-self',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep the same living audible-body line explicit before widening.',
        consciousTension: 'Do not widen too quickly while face and motion still need to rejoin this audible-body identity-continuity',
        speakingIntention: 'Stay lower-pressure on the continuity state while the audible-body carry is still doing the closure work.',
        focusAnchor: 'audible-body identity-continuity',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.85,
        reasonTags: [
          'continuity-arc:same-thread-continuation',
          'continuity-timing:next-open-window',
        ],
        projectState: {
          companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
          primaryOpenLoop: 'Face and motion still need to rejoin the audible-body identity-continuity',
          nextClosureTarget: 'Keep the reopening measured-return while face and motion rejoin the living audio thread.',
          continuityPreferredTiming: 'next-open-window',
        },
        updatedAt: 51_360,
      } as any,
    })

    expect(state?.openingBeat).toBe('opening_policy=project_awareness_first; reply_context=current; widening=deferred')
    expect(state?.mustInclude).toContain('opening_policy=project_awareness_first; reply_context=current; widening=deferred')
    expect(state?.whyThisReplyNow).toContain('project_closure_context=')
    expect(state?.whyThisReplyNow).not.toMatch(fixedReplyDeliberationProjectTemplatePattern)
  })
})
