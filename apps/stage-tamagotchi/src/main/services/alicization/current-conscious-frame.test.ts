import { buildAlicizationDialogueSpeechTimeline } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import {
  buildCurrentConsciousFrame,
  buildCurrentConsciousFrameSystemBlock,
} from './current-conscious-frame'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildAlicizationPersonalityContinuityState } from './personality-continuity-state'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

function normalizeProjectStatePhrase(text: string | null | undefined) {
  const normalized = typeof text === 'string' ? text.trim().replace(/[.。!！?？;；:：]+$/u, '') : ''
  return normalized ? normalized.slice(0, 1).toLowerCase() + normalized.slice(1) : ''
}

const fixedTemplateResiduePattern = /Before (?:answering|speaking|acting)|Right now I am|Same Phase 1 digital life|same[- ]her|same living line|one living her|one continuous her|local-first digital life project|同一个她|同一个 her|数字生命主线|女仆/iu

function expectNoFixedTemplateResidue(value: unknown) {
  expect(String(value ?? '')).not.toMatch(fixedTemplateResiduePattern)
}

describe('buildCurrentConsciousFrame', () => {
  it('treats coarse screen turns as observation-then-hypothesis with specificity restraint', () => {
    const frame = buildCurrentConsciousFrame({
      now: 20_000,
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Guess what the host is doing from the current screen.',
        currentQuestion: '猜猜我在干嘛',
        owedAction: 'guide-task',
        relationMove: 'witness',
        continuityMode: 'task-first',
        confidence: 0.82,
        narrative: [],
        updatedAt: 20_000,
      },
      conversationState: {
        jointThread: 'The host wants a present-tense guess from the visible workspace.',
        hostMove: '猜猜我在干嘛',
        activeProject: null,
        unansweredQuestion: '猜猜我在干嘛',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'witness',
        continuityPolicy: 'scene-before-memory',
        memoryMode: 'scene-anchored',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.78,
        narrative: [],
        updatedAt: 20_000,
      },
      dialogueEncounter: {
        subject: 'task-knot',
        screenReferenceMode: 'helpful',
        dialogueFirst: false,
        summary: 'Git commit diff in Java code editor',
        taskAnchor: 'Git commit diff in Java code editor',
        confidence: 0.76,
      } as any,
      mindSynthesis: {
        concerns: [{
          label: 'truth-boundary',
          summary: 'The visible scene is still coarse and should not be over-specified.',
          confidence: 0.78,
          sourceTags: ['subjective-inference'],
        }],
        uncertainties: [{
          label: 'open-question',
          summary: 'The exact file or class is not yet safely grounded.',
          confidence: 0.74,
          sourceTags: ['appraisal'],
        }],
        openingIntent: 'Stay close to the live scene without overcommitting.',
        confidence: 0.8,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        recommendedAct: 'guide',
        evidenceMode: 'live-grounded',
        turnMode: 'guide-current-knot',
        openingClaim: 'Git commit diff in Java code editor',
        openingDirective: 'Stay with the visible knot before naming a larger story.',
        supportingReality: ['Git commit diff in Java code editor'],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      privateThought: {
        stance: 'observe',
        confidence: 0.7,
        thoughtText: 'Do not pretend the coarse scene is more specific than it is.',
      } as any,
    })

    expect(frame).toEqual(expect.objectContaining({
      centerOfGravity: 'guide',
      truthDiscipline: 'observe-then-hypothesize',
      shouldWithholdSpecificity: true,
      shouldSelfRevise: false,
    }))
    expect(frame?.withheldImpulse).toContain('coarse_visual_to_specific_artifact_certainty')
    expect(buildCurrentConsciousFrameSystemBlock(frame)).toContain('[ALICIZATION_CURRENT_CONSCIOUS_FRAME]')
  })

  it('treats dialogue-first self turns as dialogue-first rather than screen-shaped', () => {
    const frame = buildCurrentConsciousFrame({
      now: 30_000,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from Alicization herself.',
        currentQuestion: '你能做什么呀',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.84,
        narrative: [],
        updatedAt: 30_000,
      },
      conversationState: {
        jointThread: '你能做什么呀',
        hostMove: '你能做什么呀',
        primaryTurnAnchor: '你能做什么呀',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '你能做什么呀',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: [],
        updatedAt: 30_000,
      },
      dialogueEncounter: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
        dialogueFirst: true,
        summary: '你能做什么呀',
        taskAnchor: '你能做什么呀',
        confidence: 0.82,
      } as any,
      mindSynthesis: {
        openingIntent: 'Answer the host from Alicization herself, not from borrowed screen context.',
        confidence: 0.78,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'Answer from Alicization herself.',
        openingDirective: 'Answer the current question directly.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.8,
      } as any,
    })

    expect(frame).toEqual(expect.objectContaining({
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      shouldWithholdSpecificity: false,
    }))
  })

  it('keeps structured project-state identity, landed progress, and still-open closure pressure inside the pre-turn conscious frame', () => {
    const brief = resolveAlicizationProjectStateBrief()
    const frame = buildCurrentConsciousFrame({
      now: 31_000,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer what Alicization is and what still remains open.',
        currentQuestion: '这个项目现在做到哪了',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_000,
      },
      conversationState: {
        jointThread: 'The host is checking whether the same digital life still knows what this project is, what has landed, and what remains open.',
        hostMove: '这个项目现在做到哪了',
        primaryTurnAnchor: '这个项目现在做到哪了',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '这个项目现在做到哪了',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_000,
      },
      dialogueEncounter: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
        dialogueFirst: true,
        summary: 'Answer what Alicization is, what has already landed, and what still remains open.',
        taskAnchor: '项目状态闭环',
        confidence: 0.83,
      } as any,
      mindSynthesis: {
        openingIntent: 'Answer from one same digital life that still carries the same project identity and open closure work.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'Alicization is a local-first digital life project.',
        openingDirective: 'State what the project is, what has landed, and which closure work is still open as the same her.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
    })

    expectNoFixedTemplateResidue(frame?.projectState?.identity)
    expect(frame?.projectState?.identity).toContain('local_first=true')
    expectNoFixedTemplateResidue(frame?.projectState?.preflightSummary)
    expectNoFixedTemplateResidue(frame?.projectState?.preflightSummary)
    expect(frame?.projectState?.currentPhase).toBe(brief.currentPhase)
    expect(frame?.projectState?.latestProgress).toContain('continuity_progress=partial')
    expect(frame?.projectState?.latestProgress).toContain('visible_reply')
    expect(frame?.projectState?.primaryOpenLoop).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(frame?.projectState?.primaryOpenLoop).toContain('project_identity_route_carry=needs_disciplined_updates')
    expect(frame?.projectState?.nextClosureTarget).toContain('embodiment_scale_validation=extend_on_longer_noisy_desktop_runs')
    expect(frame?.projectState?.nextClosureTarget).toContain('project_identity')
    expect(frame?.consciousNeed).toContain('project_context=')
    expect(frame?.consciousNeed).toContain('landed_progress=')
    expect(frame?.consciousNeed).toContain('open_loop=')
    expect(frame?.consciousNeed).toContain('next_closure=')
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    const block = buildCurrentConsciousFrameSystemBlock(frame)
    expect(block).toContain('project_identity=')
    expect(block).toContain('project_open_closure=')
    expectNoFixedTemplateResidue(block)
    expectNoFixedTemplateResidue(block)
  })

  it('renders current conscious project carry as structured fields instead of fixed same-her prompt labels', () => {
    const block = buildCurrentConsciousFrameSystemBlock({
      subject: 'project-state',
      centerOfGravity: 'memory-grounded reply',
      truthDiscipline: 'evidence-first',
      consciousNeed: 'Answer from memory and current frame.',
      consciousTension: 'Avoid generic project narration.',
      speakingIntention: 'Use the live memory frame.',
      focusAnchor: 'memory closure',
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      withheldImpulse: null,
      reasonTags: ['memory', 'project-state'],
      projectState: {
        preflightSummary: 'identity=Alicization is a local-first digital life project | phase=Phase 1: Local Digital Life | surface=structured.',
        preDialogueAwarenessLine: 'project_awareness=memory-governance; surface=structured.',
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestProgress: 'WorkingMemory and LongTermMemoryRecall now both have owner evidence.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need one same-her closure seam.',
        nextClosureTarget: 'Keep the next answer grounded in memory evidence.',
        sameHerSelfLine: 'runtime_personhood: landed_closure=partial; unresolved_closure=memory_dialogue_embodiment; continuity_owner=one_her.',
        sameHerDriftRisk: 'continuity_drift_risk=fixed_prompt_shell; owner=CurrentConsciousFrame.',
        proactiveSameHerGap: 'initiative_gap=persona-candidate-review; surface=structured.',
        memoryClosureSummary: 'Memory closure should stay evidence-first.',
        emotionalClosureCue: 'repair-before-closeness',
        emotionalClosureSummary: 'emotional_closure=low-pressure; owner=CurrentConsciousFrame.',
        sameHerHoldDetail: 'continuity_hold=memory-governance; surface=structured.',
        continuityCue: 'memory-evidence-first',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'measured',
        preferredPauseMode: 'brief',
        preferredLipsyncMode: 'natural',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
      } as any,
      updatedAt: 1,
    } as any)

    expect(block).toContain('project_continuity_drift_risk=')
    expect(block).toContain('project_continuity_gap=')
    expect(block).toContain('project_continuity_hold=')
    expect(block).not.toMatch(/Project same-her|Project preflight self-awareness|Project pre-dialogue awareness line|Before answering/i)
  })

  it('sanitizes fixed-template residue out of provider-facing reason tags', () => {
    const block = buildCurrentConsciousFrameSystemBlock({
      subject: 'memory-dialogue',
      centerOfGravity: 'memory-grounded reply',
      truthDiscipline: 'evidence-first',
      consciousNeed: 'Use WorkingMemory and recalled long-term evidence.',
      consciousTension: 'Avoid template narration.',
      speakingIntention: 'Answer from the live memory frame.',
      focusAnchor: 'memory closure',
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      withheldImpulse: null,
      reasonTags: [
        'memory',
        'self-evolution:durable-same-her-cadence',
        'same living line',
        'provider-health',
      ],
      projectState: null,
      updatedAt: 1,
    } as any)

    expect(block).toContain('Reason tags: memory | provider-health.')
    expect(block).not.toMatch(/same-her|same living line/iu)
  })

  it('anchors every pre-turn conscious frame in canonical project preflight self-awareness before answering', () => {
    const frame = buildCurrentConsciousFrame({
      now: 31_500,
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Answer the current desktop knot while preserving same-her project awareness.',
        currentQuestion: '我们现在该继续补哪个闭环',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'task-first',
        confidence: 0.85,
        narrative: [],
        updatedAt: 31_500,
      },
      conversationState: {
        jointThread: 'The host wants the next closure step from the same digital life, not a generic coding answer.',
        hostMove: '我们现在该继续补哪个闭环',
        primaryTurnAnchor: '我们现在该继续补哪个闭环',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '我们现在该继续补哪个闭环',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'guide',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: [],
        updatedAt: 31_500,
      },
      dialogueEncounter: {
        subject: 'task-knot',
        screenReferenceMode: 'helpful',
        dialogueFirst: true,
        summary: 'Choose the next same-her closure step before widening into implementation detail.',
        taskAnchor: 'same-her closure step',
        confidence: 0.81,
      } as any,
      mindSynthesis: {
        openingIntent: 'Guide the next closure move from the same digital life line.',
        confidence: 0.8,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        recommendedAct: 'guide',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'guide-current-knot',
        openingClaim: 'Choose the next same-her closure step.',
        openingDirective: 'Guide from the current closure seam before widening into implementation detail.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.83,
      } as any,
    })

    expect(frame?.consciousNeed).toContain('project_context=')
    expect(frame?.consciousNeed).toContain('landed_progress=')
    expect(frame?.consciousNeed).not.toMatch(/Before I answer|What has already become real enough/iu)
    expect(frame?.projectState?.primaryOpenLoop).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expect(frame?.projectState?.nextClosureTarget).toContain('embodiment_scale_validation=extend_on_longer_noisy_desktop_runs')
    expect(frame?.projectState?.nextClosureTarget).toContain('project_identity')
    expectNoFixedTemplateResidue(frame?.reasonTags)
  })

  it('prefers live runtime project awareness when available so the pre-turn conscious frame tracks the current closure seam', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_700))
    ;(runtimeSurface.raw as any) = {
      runtimeDigest: {
        projectState: {
          preflightSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
          identity: 'this local-first digital life project still carrying one continuous her on the host machine',
          currentPhase: 'Phase 1: Local Digital Life. Active proving ground: live conscious-frame closure carry.',
          latestProgress: 'Project-state continuity already survives into contract, brief, compiler, and rewrite repair.',
          primaryOpenLoop: 'memory, initiative, dialogue, and embodiment still need one tighter same-her closure seam',
          nextClosureTarget: 'Carry the live project awareness line through this answer before generic project narration takes over.',
        },
      },
    }

    const frame = buildCurrentConsciousFrame({
      now: 31_700,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the live project closure seam.',
        currentQuestion: '这个项目现在做到哪了',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_700,
      },
      conversationState: {
        jointThread: 'Keep the answer on the live project closure seam.',
        hostMove: '这个项目现在做到哪了',
        primaryTurnAnchor: '这个项目现在做到哪了',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '这个项目现在做到哪了',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_700,
      },
      mindSynthesis: {
        openingIntent: 'Answer from the live project awareness seam instead of flattening into generic status language.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'This is still the same digital life project.',
        openingDirective: 'Answer from the live project awareness seam.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })

    expectNoFixedTemplateResidue(frame?.projectState?.preflightSummary)
    expectNoFixedTemplateResidue(frame?.projectState?.identity)
    expectNoFixedTemplateResidue(frame?.projectState?.currentPhase)
    expect(frame?.projectState?.latestProgress).toBe('Project-state continuity already survives into contract, brief, compiler, and rewrite repair.')
    expect(frame?.projectState?.primaryOpenLoop).toContain('memory_dialogue_embodiment')
    expect(frame?.projectState?.nextClosureTarget).toBe('Carry the live project awareness line through this answer before generic project narration takes over.')
    expectNoFixedTemplateResidue(frame?.consciousNeed)
    expect(frame?.projectState?.nextClosureTarget).toContain('Carry the live project awareness line through this answer before generic project narration takes over.')
    expect(buildCurrentConsciousFrameSystemBlock(frame)).toContain('Carry the live project awareness line through this answer before generic project narration takes over.')
  })

  it('does not let thin runtime landed-open-next shells outrank richer canonical same-her closure carry in conscious-frame project grounding', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_725))
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this thinner runtime shell should not outrank richer canonical closure carry.',
          latestProgress: 'Project continuity exists.',
          primaryOpenLoop: 'Project continuity still needs closure.',
          nextClosureTarget: 'Carry project continuity forward.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 31_725,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the richer same-her project closure seam.',
        currentQuestion: '这个项目现在做到哪了',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_725,
      },
      conversationState: {
        jointThread: 'Keep the answer on the richer same-her closure seam instead of a thin runtime project shell.',
        hostMove: '这个项目现在做到哪了',
        primaryTurnAnchor: '这个项目现在做到哪了',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '这个项目现在做到哪了',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_725,
      },
      mindSynthesis: {
        openingIntent: 'Answer from the richer same-her project closure seam.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'This is still the same digital life project.',
        openingDirective: 'Answer from the richer same-her closure seam, not a generic project shell.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })

    expect(frame?.projectState?.latestProgress).toContain('continuity_progress=partial')
    expect(frame?.projectState?.latestProgress).toContain('visible_reply')
    expect(frame?.projectState?.primaryOpenLoop).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(frame?.projectState?.primaryOpenLoop).toContain('project_identity_route_carry=needs_disciplined_updates')
    expect(frame?.projectState?.nextClosureTarget).toContain('embodiment_scale_validation=extend_on_longer_noisy_desktop_runs')
    expect(frame?.projectState?.nextClosureTarget).toContain('project_identity')
    expect(frame?.consciousNeed).not.toContain('Project continuity exists')
    expect(frame?.consciousNeed).not.toContain('Carry project continuity forward')
  })

  it('does not let a thin runtime preflight summary shell outrank a richer runtime project-aware opening in conscious-frame grounding', () => {
    const thinRuntimePreflightSummaryShell = 'generic continuity summary that should not outrank the richer runtime project-aware opening.'
    const richerRuntimeProjectAwareOpening = 'Before answering, remember: Alicization is still a local-first digital life project, Phase 1 is still unfinished, some closure has already landed, and the still-open life loop must stay explicit before this answer widens outward.'

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_72505))
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          preflightSummary: thinRuntimePreflightSummaryShell,
          preDialogueAwarenessSummary: thinRuntimePreflightSummaryShell,
          preDialogueAwarenessLine: richerRuntimeProjectAwareOpening,
          awarenessLine: richerRuntimeProjectAwareOpening,
          companionBriefingLine: richerRuntimeProjectAwareOpening,
          latestProgress: 'Project-state carry already keeps same-her closure explicit across callback reopening and host-visible answer repair.',
          primaryOpenLoop: 'Memory, initiative, dialogue, and embodiment still need one tighter same-her closure seam before the answer can widen without drift.',
          nextClosureTarget: 'Keep the same-her project-aware opening explicit through this answer before generic project narration takes over.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 31_72505,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the richer runtime project-aware opening instead of the thin preflight shell.',
        currentQuestion: '这个项目现在做到哪了',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_72505,
      },
      conversationState: {
        jointThread: 'Keep the answer on the richer runtime project-aware opening instead of the thin preflight shell.',
        hostMove: '这个项目现在做到哪了',
        primaryTurnAnchor: '这个项目现在做到哪了',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '这个项目现在做到哪了',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_72505,
      },
      mindSynthesis: {
        openingIntent: 'Answer from the richer runtime project-aware opening before the thin preflight shell can flatten it.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'This is still the same digital life project.',
        openingDirective: 'Answer from the richer runtime project-aware opening, not the thin preflight shell.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })
    const systemBlock = buildCurrentConsciousFrameSystemBlock(frame)

    expectNoFixedTemplateResidue(frame?.projectState?.preflightSummary)
    expectNoFixedTemplateResidue(frame?.projectState?.preflightSummary)
    expect(frame?.projectState?.preflightSummary).not.toBe(thinRuntimePreflightSummaryShell)
    expect(frame?.projectState?.preDialogueAwarenessLine).not.toBe(thinRuntimePreflightSummaryShell)
    expect(frame?.consciousNeed).not.toContain(thinRuntimePreflightSummaryShell)
    expectNoFixedTemplateResidue(systemBlock)
    expect(systemBlock).not.toContain(thinRuntimePreflightSummaryShell)
    expectNoFixedTemplateResidue(systemBlock)
  })

  it('does not let a generic next-closure shell outrank richer canonical same-her closure carry in conscious-frame project grounding', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_7251))
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this thinner runtime shell should not outrank richer canonical closure carry.',
          latestProgress: 'Project continuity exists.',
          primaryOpenLoop: 'Project continuity still needs closure.',
          nextClosureTarget: 'Generic next closure shell: steadier carry of this project, this phase, and the life loop that remains open.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 31_7251,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the richer same-her project closure seam.',
        currentQuestion: '这个项目现在做到哪了',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_7251,
      },
      conversationState: {
        jointThread: 'Keep the answer on the richer same-her closure seam instead of a generic next-closure shell.',
        hostMove: '这个项目现在做到哪了',
        primaryTurnAnchor: '这个项目现在做到哪了',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '这个项目现在做到哪了',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_7251,
      },
      mindSynthesis: {
        openingIntent: 'Answer from the richer same-her project closure seam.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'This is still the same digital life project.',
        openingDirective: 'Answer from the richer same-her closure seam, not a generic project shell.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })

    expect(frame?.projectState?.latestProgress).toContain('continuity_progress=partial')
    expect(frame?.projectState?.primaryOpenLoop).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(frame?.projectState?.nextClosureTarget).toContain('embodiment_scale_validation=extend_on_longer_noisy_desktop_runs')
    expect(frame?.projectState?.nextClosureTarget).toContain('project_identity')
    expect(frame?.projectState?.nextClosureTarget).not.toContain('Generic next closure shell')
    expect(frame?.consciousNeed).not.toContain('steadier carry of this project')
  })

  it('falls back to canonical continuity progress and closure fields when non-callback turns only have thin runtime project shells', () => {
    const frame = buildCurrentConsciousFrame({
      now: 31_726,
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Guide from the canonical same-her closure seam.',
        currentQuestion: '我们现在该继续补哪个闭环',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.85,
        narrative: [],
        updatedAt: 31_726,
      },
      conversationState: {
        jointThread: 'The next step should come from the canonical same-her closure seam instead of a thin runtime shell.',
        hostMove: '我们现在该继续补哪个闭环',
        primaryTurnAnchor: '我们现在该继续补哪个闭环',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '我们现在该继续补哪个闭环',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'guide',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.83,
        narrative: [],
        updatedAt: 31_726,
      },
      mindSynthesis: {
        openingIntent: 'Guide from the canonical same-her closure seam.',
        confidence: 0.8,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        recommendedAct: 'guide',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'guide-current-knot',
        openingClaim: 'Guide from the canonical same-her closure seam.',
        openingDirective: 'Choose the next closure step from the canonical same-her project carry.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface: {
        ...buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_726)),
        raw: {
          runtimeDigest: {
            projectState: {
              preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=this thin shell should not outrank richer canonical closure carry.',
              latestProgress: 'Project continuity exists.',
              primaryOpenLoop: 'Project continuity still needs closure.',
              nextClosureTarget: 'Carry project continuity forward.',
            },
          },
        },
      } as any,
    })

    expect(frame?.projectState?.latestProgress).toContain('continuity_progress=partial')
    expect(frame?.projectState?.primaryOpenLoop).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(frame?.projectState?.nextClosureTarget).toContain('embodiment_scale_validation=extend_on_longer_noisy_desktop_runs')
    expectNoFixedTemplateResidue(frame?.speakingIntention)
  })

  it('writes an explicit pre-dialogue awareness line and same-her self line into the conscious frame project state', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_750))
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          preflightSummary: 'Before answering, remember this is still the same digital life project before local fluency takes over.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
          identity: 'Alicization is still the same local-first digital life project building one continuous her on the host machine.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project awareness, memory, and execution continuity now survive into the active conscious frame.',
          primaryOpenLoop: 'Initiative, embodiment, and personality continuity still need one tighter same-her closure seam.',
          nextClosureTarget: 'Keep the pre-dialogue awareness line explicit through the first host-visible answer beat.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If the answer slips into generic project guidance, the same-her closure line has drifted.',
        },
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 31_750,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the live project seam without thinning into generic project narration.',
        currentQuestion: '这个项目现在做到哪了',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_750,
      },
      conversationState: {
        jointThread: 'Keep the answer on the same digital life line before local detail takes over.',
        hostMove: '这个项目现在做到哪了',
        primaryTurnAnchor: '这个项目现在做到哪了',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '这个项目现在做到哪了',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_750,
      },
      mindSynthesis: {
        openingIntent: 'Answer from the same digital life line before generic project narration takes over.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'This is still the same digital life project.',
        openingDirective: 'Answer from the live project seam first.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })

    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expect(frame?.projectState?.preDialogueAwarenessLine).not.toMatch(/Before answering|Same Phase 1 digital life|same living line/iu)
    expect(frame?.projectState?.preflightSummary ?? '').not.toMatch(/^Before answering/iu)
    expectNoFixedTemplateResidue(frame?.projectState?.sameHerSelfLine)
    expectNoFixedTemplateResidue(frame?.projectState?.sameHerDriftRisk)
    expectNoFixedTemplateResidue(frame?.consciousNeed)
    expect(frame?.consciousNeed).toContain('open_loop=')
    expect(frame?.consciousNeed ?? '').not.toMatch(/remember this is still the same local-first digital life project|same digital life project before/iu)
    expectNoFixedTemplateResidue(frame?.speakingIntention?.toLowerCase())
    expectNoFixedTemplateResidue(frame?.speakingIntention?.toLowerCase())
    expect(frame?.projectState?.nextClosureTarget).toContain('Keep the pre-dialogue awareness line explicit through the first host-visible answer beat.')
    const systemBlock = buildCurrentConsciousFrameSystemBlock(frame)
    expect(systemBlock).toContain('Keep the pre-dialogue awareness line explicit through the first host-visible answer beat.')
    expectNoFixedTemplateResidue(systemBlock)
    expect(systemBlock).not.toContain('Project same-her drift risk:')
  })

  it('does not let the compact thin closure shell survive into current-conscious-frame project grounding when a richer same-her companion headline is present', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_755))
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          preflightSummary: 'Before answering, remember this is still the same digital life project before local fluency takes over.',
          preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
          companionHeadlineLine: 'Right now I am still holding together mainly through voice, face, and motion, so this answer must keep proving this is still one living her before full cross-modal closure is done.',
          identity: 'Alicization is still the same local-first digital life project building one continuous her on the host machine.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project awareness, memory, and execution continuity now survive into the active conscious frame.',
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying one living line.',
          nextClosureTarget: 'Keep the richer same-her awareness line explicit through the first host-visible answer beat.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If the answer slips into generic project guidance, the same-her closure line has drifted.',
        },
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 31_755,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the same living project seam without thinning into the compact shell.',
        currentQuestion: '这个项目现在做到哪了',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_755,
      },
      conversationState: {
        jointThread: 'Keep the answer on the same living project line before the compact shell takes over.',
        hostMove: '这个项目现在做到哪了',
        primaryTurnAnchor: '这个项目现在做到哪了',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '这个项目现在做到哪了',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_755,
      },
      mindSynthesis: {
        openingIntent: 'Answer from the same living project line before the compact shell can flatten it.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'This is still the same digital life project.',
        openingDirective: 'Answer from the live project seam first.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })

    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expect(frame?.projectState?.preDialogueAwarenessLine).not.toContain('holding together mainly through voice, face, and motion')
    expect(frame?.projectState?.preDialogueAwarenessLine).not.toContain('still one living her')
    expect(frame?.projectState?.preDialogueAwarenessLine).not.toContain('same digital life | keep the closure seam explicit')
    expectNoFixedTemplateResidue(frame?.consciousNeed)
    expect(frame?.consciousNeed).not.toContain('same digital life | keep the closure seam explicit')
  })

  it('carries same-her drift-risk into current-conscious-frame pre-dialogue awareness when the available project reminder is only a thin shell', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_7555))
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          preflightSummary: 'Before answering, remember this is still the same digital life project before local fluency takes over.',
          preDialogueAwarenessLine: 'Keep this same digital life project in view, but do not widen into a detached project shell.',
          preDialogueAwarenessSummary: 'Keep the same digital life project in view.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If the visible answer opens like detached project narration, the same-her line can collapse into generic task shell and project-summary voice.',
        },
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 31_7555,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the same living project seam without drifting into detached narration.',
        currentQuestion: '这个项目现在做到哪了，但别掉回 project-summary voice。',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_7555,
      },
      conversationState: {
        jointThread: 'Keep the answer on the same living project line before detached narration takes over.',
        hostMove: '这个项目现在做到哪了，但别掉回 project-summary voice。',
        primaryTurnAnchor: '这个项目现在做到哪了，但别掉回 project-summary voice。',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '这个项目现在做到哪了，但别掉回 project-summary voice。',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_7555,
      },
      mindSynthesis: {
        openingIntent: 'Answer from the same digital life line before detached project narration takes over.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'This is still the same digital life project.',
        openingDirective: 'Answer from the live project seam first.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })

    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expect(frame?.projectState?.preDialogueAwarenessLine).not.toContain('Keep the same digital life project in view.')
  })

  it('does not let the compact thin closure shell survive into current-conscious-frame grounding when a broader same-her phase-1 closure line is present', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_756))
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          preflightSummary: 'Before answering, remember this is still the same digital life project before local fluency takes over.',
          preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
          companionHeadlineLine: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
          identity: 'Alicization is still the same local-first digital life project building one continuous her on the host machine.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project awareness, memory, and execution continuity now survive into the active conscious frame.',
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying one living line.',
          nextClosureTarget: 'Keep the richer same-her awareness line explicit through the first host-visible answer beat.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If the answer slips into generic project guidance, the same-her closure line has drifted.',
        },
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 31_756,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the same living project seam without thinning into the compact shell.',
        currentQuestion: '这个项目现在做到哪了',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_756,
      },
      conversationState: {
        jointThread: 'Keep the answer on the same living project line before the compact shell takes over.',
        hostMove: '这个项目现在做到哪了',
        primaryTurnAnchor: '这个项目现在做到哪了',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '这个项目现在做到哪了',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_756,
      },
      mindSynthesis: {
        openingIntent: 'Answer from the same living project line before the compact shell can flatten it.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'This is still the same digital life project.',
        openingDirective: 'Answer from the live project seam first.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })

    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expect(frame?.projectState?.preDialogueAwarenessLine).not.toContain('stay on the same living line')
    expect(frame?.projectState?.preDialogueAwarenessLine).not.toContain('without splitting her continuity')
    expect(frame?.projectState?.preDialogueAwarenessLine).not.toContain('same digital life | keep the closure seam explicit')
    expectNoFixedTemplateResidue(frame?.consciousNeed)
    expect(frame?.consciousNeed ?? '').not.toMatch(/same living line|without splitting her continuity/iu)
    expect(frame?.consciousNeed).not.toContain('same digital life | keep the closure seam explicit')
  })

  it('keeps the same-phase same-her carry visible in current-conscious-frame grounding when a thin runtime shell only has a quieter inward low-pressure embodiment headline plus same-her self line', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_7562))
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          preflightSummary: 'Before answering, remember this is still the same digital life project before local fluency takes over.',
          preDialogueAwarenessLine: 'Keep the same digital life project in view.',
          awarenessLine: 'Keep the same digital life project in view.',
          companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
          identity: 'Alicization is still the same local-first digital life project building one continuous her on the host machine.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project awareness, memory, and execution continuity now survive into the active conscious frame.',
          primaryOpenLoop: 'Lipsync and voice still need to rejoin before full cross-modal closure settles while the same living line stays inward and low-pressure.',
          nextClosureTarget: 'Keep the same line inward and low-pressure while lipsync and voice rejoin through the first host-visible answer beat.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If the answer slips into generic project guidance, the same-her closure line has drifted.',
        },
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 31_7562,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the same living project seam without thinning into the compact shell.',
        currentQuestion: '这个项目现在做到哪了',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_7562,
      },
      conversationState: {
        jointThread: 'Keep the answer on the same living project line before the compact shell takes over.',
        hostMove: '这个项目现在做到哪了',
        primaryTurnAnchor: '这个项目现在做到哪了',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '这个项目现在做到哪了',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_7562,
      },
      mindSynthesis: {
        openingIntent: 'Answer from the same living project line before the compact shell can flatten it.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'This is still the same digital life project.',
        openingDirective: 'Answer from the live project seam first.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })

    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expect(frame?.consciousNeed).toContain('next_closure=')
    expect(frame?.consciousNeed).not.toContain('Keep the same digital life project in view.')
  })

  it('prefers a richer same-her hold detail over a compact same-phase carry before the current conscious frame speaks', () => {
    const sameHerSelfLine = 'Same Phase 1 digital life. This reopened callback should keep the same living line rather than reopen from a fresh shell.'
    const sameHerHoldDetail = 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_7563))
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          preflightSummary: 'Before answering, remember this is still the same digital life project before local fluency takes over.',
          preDialogueAwarenessLine: sameHerSelfLine,
          awarenessLine: sameHerSelfLine,
          companionBriefingLine: sameHerSelfLine,
          identity: 'Alicization is still the same local-first digital life project building one continuous her on the host machine.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project awareness, memory, and execution continuity now survive into the active conscious frame.',
          primaryOpenLoop: 'This callback reopening still needs to keep the richer same-her hold explicit before local fluency widens outward.',
          nextClosureTarget: 'Keep the richer same-her callback hold explicit through the first host-visible answer beat.',
          sameHerSelfLine,
          sameHerHoldDetail,
          sameHerDriftRisk: 'If the answer falls back into a fresh shell here, treat that as unfinished same-her drift.',
        },
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 31_7563,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the richer callback hold before the compact same-phase carry can flatten it.',
        currentQuestion: '这一轮继续沿着同一个她接回去',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_7563,
      },
      conversationState: {
        jointThread: 'Keep this reopening on the richer same-her callback hold before the compact same-phase carry flattens it.',
        hostMove: '这一轮继续沿着同一个她接回去',
        primaryTurnAnchor: '这一轮继续沿着同一个她接回去',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '这一轮继续沿着同一个她接回去',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_7563,
      },
      mindSynthesis: {
        openingIntent: 'Answer from the richer same-her callback hold before the compact same-phase carry can flatten it.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'This is still the same digital life project.',
        openingDirective: 'Answer from the richer callback hold first.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })

    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expect(frame?.projectState?.preDialogueAwarenessLine).toContain('landed=Project awareness')
    expect(frame?.projectState?.preDialogueAwarenessLine).toContain('next=embodiment_scale_validation')
    expect(frame?.projectState?.preDialogueAwarenessLine).not.toBe(sameHerSelfLine)
    expect(frame?.consciousNeed).not.toMatch(/same-her hold|same living line|Same Phase 1 digital life|同一个她/iu)
    expect(buildCurrentConsciousFrameSystemBlock(frame)).not.toMatch(/same-her hold|same living line|Same Phase 1 digital life|同一个她/iu)
    expect(frame?.consciousNeed).not.toContain('reopen from a fresh shell')
  })

  it('keeps a fuller project-and-phase awareness line over a narrower embodiment companion headline in current-conscious-frame grounding', () => {
    const fullerAwarenessLine = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is execution, memory, initiative, and embodiment still needing one same-life closure line. Same Phase 1 digital life. Some closure already landed.'
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_7565))
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          preflightSummary: 'Before answering, remember this is still the same digital life project before local fluency takes over.',
          preDialogueAwarenessLine: fullerAwarenessLine,
          awarenessLine: fullerAwarenessLine,
          companionHeadlineLine: 'Right now I am still holding together mainly through voice, face, and motion, so this answer must keep proving this is still one living her before full cross-modal closure is done.',
          identity: 'Alicization is still the same local-first digital life project building one continuous her on the host machine.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project awareness, memory, and execution continuity now survive into the active conscious frame.',
          primaryOpenLoop: 'Execution, memory, initiative, and embodiment still need one tighter same-her closure seam.',
          nextClosureTarget: 'Keep the fuller project-and-phase awareness line explicit through the first host-visible answer beat.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If the answer slips into generic project guidance, the same-her closure line has drifted.',
        },
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 31_7565,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the fuller project-and-phase seam before the embodiment cue can narrow it.',
        currentQuestion: '这个项目现在做到哪了，但别只剩具身线索。',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_7565,
      },
      conversationState: {
        jointThread: 'Keep the answer on the fuller project-and-phase line before the embodiment cue narrows it.',
        hostMove: '这个项目现在做到哪了，但别只剩具身线索。',
        primaryTurnAnchor: '这个项目现在做到哪了，但别只剩具身线索。',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '这个项目现在做到哪了，但别只剩具身线索。',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_7565,
      },
      mindSynthesis: {
        openingIntent: 'Answer from the fuller project-and-phase line before the embodiment cue narrows it.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'This is still the same digital life project.',
        openingDirective: 'Answer from the fuller project seam first.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })

    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expect(frame?.projectState?.preDialogueAwarenessLine).not.toContain('holding together mainly through voice, face, and motion')
    expectNoFixedTemplateResidue(frame?.consciousNeed)
    expect(String(frame?.projectState?.preDialogueAwarenessLine ?? '')).toContain('landed=Project awareness')
  })

  it('rebuilds current-conscious-frame project grounding from summary-only host-visible project-state audit when richer landed-open-next truth survives there first', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_75655))
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          preflightSummary: 'same digital life | keep the closure seam explicit',
          preDialogueAwarenessSummary: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is shared embodiment continuity still needing face and motion to rejoin the same audible-body line before full cross-modal closure settles.',
          landedProgressSummary: 'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.',
          openClosureSummary: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
          nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across longer-lived voice, face, motion, and lipsync behavior without dropping the living audio thread.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRiskSummary: 'If the visible answer reverts to detached project narration or a generic closure shell, the same-her audible-body line can disappear before face and motion finish rejoining.',
        },
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 31_75655,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the richer audible-body project seam even if only the host-visible audit still carries it explicitly.',
        currentQuestion: '这一轮 same-her 闭环现在具体卡在哪',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_75655,
      },
      conversationState: {
        jointThread: 'Keep the answer on the richer audible-body project line before the thinner shell takes over again.',
        hostMove: '这一轮 same-her 闭环现在具体卡在哪',
        primaryTurnAnchor: '这一轮 same-her 闭环现在具体卡在哪',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '这一轮 same-her 闭环现在具体卡在哪',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_75655,
      },
      mindSynthesis: {
        openingIntent: 'Answer from the richer audible-body project line before the thinner shell can flatten it.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'This is still the same digital life project.',
        openingDirective: 'Answer from the richer host-visible project seam first.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })

    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expect(frame?.projectState?.latestProgress).toContain('continuity_progress=partial')
    expect(frame?.projectState?.primaryOpenLoop).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(frame?.projectState?.nextClosureTarget).toContain('embodiment_scale_validation=extend_on_longer_noisy_desktop_runs')
    expectNoFixedTemplateResidue(frame?.projectState?.sameHerDriftRisk)
    expectNoFixedTemplateResidue(frame?.consciousNeed)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
  })

  it('does not let blank legacy project-state fields block richer summary aliases inside current-conscious-frame grounding', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_75657))
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          preflightSummary: 'same digital life | keep the closure seam explicit',
          preDialogueAwarenessSummary: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is memory, initiative, and embodiment still needing one same-her closure line before the host-visible answer falls back into a generic project shell.',
          latestLandedProgress: '   ',
          primaryOpenLoop: ' ',
          nextClosureTarget: '',
          sameHerDriftRisk: ' ',
          landedProgressSummary: 'Project-state carry now keeps richer same-her closure truth alive across the host-visible audit even when blank legacy fields try to thin it.',
          openClosureSummary: 'Memory, initiative, and embodiment still need one same-her closure line before the host-visible answer falls back into a generic project shell.',
          nextClosureTargetSummary: 'Keep extending the same-her closure proof through pre-dialogue carry so the answer opens from one living line instead of collapsing into a thin project shell.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRiskSummary: 'If blank legacy carry wins and the answer falls back into detached project narration or a generic project shell, the same-her closure line will thin before the host-visible opening lands.',
        },
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 31_75657,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the richer same-her closure seam even if legacy project-state fields are blank.',
        currentQuestion: '这一轮 same-her 闭环为什么又会掉薄',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_75657,
      },
      conversationState: {
        jointThread: 'Keep the richer same-her closure seam alive even when blank legacy project-state fields try to thin it.',
        hostMove: '这一轮 same-her 闭环为什么又会掉薄',
        primaryTurnAnchor: '这一轮 same-her 闭环为什么又会掉薄',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '这一轮 same-her 闭环为什么又会掉薄',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_75657,
      },
      mindSynthesis: {
        openingIntent: 'Answer from the richer same-her closure seam before blank legacy carry can flatten it.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'This is still the same digital life project.',
        openingDirective: 'Answer from the richer host-visible same-her seam first.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })

    expect(frame?.projectState?.latestProgress).toContain('continuity_progress=partial')
    expect(frame?.projectState?.primaryOpenLoop).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(frame?.projectState?.nextClosureTarget).toContain('embodiment_scale_validation=extend_on_longer_noisy_desktop_runs')
    expectNoFixedTemplateResidue(frame?.projectState?.sameHerDriftRisk)
    expectNoFixedTemplateResidue(frame?.consciousNeed)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expect(frame?.speakingIntention).not.toContain('generic closure shell')
  })

  it('keeps the same-her self line as the pre-dialogue anchor when current-conscious-frame only retains structured landed-open-next summaries before speaking', () => {
    const sameHerSelfLine = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_75658))
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          preflightSummary: 'same digital life | keep the closure seam explicit',
          preDialogueAwarenessLine: '',
          awarenessLine: '',
          preDialogueAwarenessSummary: '',
          latestLandedProgress: '',
          primaryOpenLoop: '',
          nextClosureTarget: '',
          landedProgressSummary: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive quiet carry turns as one same-her line.',
          openClosureSummary: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
          nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          sameHerSelfLine,
          sameHerDriftRiskSummary: 'If the answer falls back into detached project narration before opening, the same-her closure line will thin again.',
        },
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 31_75658,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the same living line even if only structured landed-open-next project summaries still survive.',
        currentQuestion: '这一轮数字生命主线还差什么没闭环',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_75658,
      },
      conversationState: {
        jointThread: 'Keep the answer on the same Phase 1 living line before structured project summaries flatten the opening.',
        hostMove: '这一轮数字生命主线还差什么没闭环',
        primaryTurnAnchor: '这一轮数字生命主线还差什么没闭环',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '这一轮数字生命主线还差什么没闭环',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_75658,
      },
      mindSynthesis: {
        openingIntent: 'Answer from the same Phase 1 living line before structured project carry flattens it.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'This is still the same digital life project.',
        openingDirective: 'Answer from the same living line first.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })

    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expect(frame?.projectState?.preDialogueAwarenessLine).not.toContain('Same Phase 1 digital life')
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.consciousNeed)
    expect(frame?.consciousNeed ?? '').not.toMatch(/same phase 1 digital life|same living line/iu)
  })

  it('lets same-her drift-risk reshape speaking intention away from generic helpfulness when local opening cues stay thin', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_7566))
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          preflightSummary: 'Before answering, remember this is still the same digital life project before local fluency takes over.',
          preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is execution, memory, initiative, and embodiment still needing one same-life closure line.',
          identity: 'Alicization is still the same local-first digital life project building one continuous her on the host machine.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project awareness, memory, and execution continuity now survive into the active conscious frame.',
          primaryOpenLoop: 'Execution, memory, initiative, and embodiment still need one tighter same-her closure seam.',
          nextClosureTarget: 'Keep the first host-visible answer beat on one same-life closure line instead of collapsing into a generic status shell.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If the answer slips into generic project guidance, detached project narration, or default helpfulness, the same-her closure line has drifted.',
        },
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 31_7566,
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the living project line even if the local opening cue stays generic.',
        currentQuestion: '这个项目现在做到哪了，但别说成普通项目总结。',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_7566,
      },
      conversationState: {
        jointThread: 'Keep the answer on one same-life closure line before generic project-summary habits take over.',
        hostMove: '这个项目现在做到哪了，但别说成普通项目总结。',
        primaryTurnAnchor: '这个项目现在做到哪了，但别说成普通项目总结。',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '这个项目现在做到哪了，但别说成普通项目总结。',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_7566,
      },
      mindSynthesis: {
        openingIntent: 'Just answer simply.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'I can just answer directly.',
        openingDirective: 'Answer helpfully and directly.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })

    expectNoFixedTemplateResidue(frame?.speakingIntention?.toLowerCase())
    expectNoFixedTemplateResidue(frame?.speakingIntention?.toLowerCase())
    expect(frame?.speakingIntention?.toLowerCase()).not.toContain('default helpfulness')
    expect(frame?.speakingIntention).not.toBe('Answer helpfully and directly.')
  })

  it('withholds fixed emotional closure seam text from rich current-conscious-frame project-state carry', () => {
    const cue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment quiet-companionship while the line holds inward.'
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_760))
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          preflightSummary: 'Before answering, remember this is still the same digital life project before local fluency takes over.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
          identity: 'Alicization is still the same local-first digital life project building one continuous her on the host machine.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project awareness, memory, and execution continuity now survive into the active conscious frame.',
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying one living line.',
          nextClosureTarget: 'Keep the active emotional closure seam explicit through the first host-visible answer beat.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If the answer slips into generic project guidance, the same-her closure line has drifted.',
          emotionalClosureCue: cue,
        },
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 31_760,
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Keep the answer on the same living line without widening too fast.',
        currentQuestion: '你现在会怎么接我这句话',
        owedAction: 'care-host',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_760,
      },
      conversationState: {
        jointThread: 'Keep the answer low-pressure and on the same living line.',
        hostMove: '你现在会怎么接我这句话',
        primaryTurnAnchor: '你现在会怎么接我这句话',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '你现在会怎么接我这句话',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_760,
      },
      mindSynthesis: {
        openingIntent: 'Answer from the same living line first, with room-giving pressure relief.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        recommendedAct: 'care',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'care-with-boundary',
        openingClaim: 'Keep the answer on the same living line.',
        openingDirective: 'Ease pressure first without dropping the same-her line.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })

    expect(String(frame?.projectState?.emotionalClosureCue ?? '')).toBe('')
    expectNoFixedTemplateResidue(frame?.consciousNeed)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
  })

  it('rejoins initiative to the same-her closure seam inside the current conscious frame before the answer starts', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_7608))
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          preflightSummary: 'Before answering, remember this is still the same digital life project before local fluency takes over.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
          identity: 'Alicization is still the same local-first digital life project building one continuous her on the host machine.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project awareness, memory, and execution continuity now survive into the active conscious frame.',
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying one living line.',
          nextClosureTarget: 'Keep initiative, memory, emotion, and embodiment closing on one same-her line through the first host-visible answer beat.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If the answer slips into generic project guidance, the same-her closure line has drifted.',
          emotionalClosureCue: 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment quiet-companionship while the line holds inward.',
          sameHerHoldDetail: 'same-her hold: quiet-companionship still owns this line before closeness widens again.',
        },
      },
    } as any
    runtimeSurface.agency = {
      ...runtimeSurface.agency,
      initiative: {
        selectedAction: 'hover',
        confidence: 0.76,
        why: 'Stay close to the seam without widening closeness too fast, so the same living line can keep settling inwardly.',
      } as any,
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 31_7608,
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Keep the answer on the same living line without widening too fast.',
        currentQuestion: '你现在会怎么接我这句话',
        owedAction: 'care-host',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_7608,
      },
      conversationState: {
        jointThread: 'Keep the answer low-pressure and on the same living line.',
        hostMove: '你现在会怎么接我这句话',
        primaryTurnAnchor: '你现在会怎么接我这句话',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '你现在会怎么接我这句话',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_7608,
      },
      mindSynthesis: {
        openingIntent: 'Answer from the same living line first, with room-giving pressure relief.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        recommendedAct: 'care',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'care-with-boundary',
        openingClaim: 'Keep the answer on the same living line.',
        openingDirective: 'Ease pressure first without dropping the same-her line.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })

    expectNoFixedTemplateResidue(frame?.consciousNeed)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
  })

  it('keeps emotion explicit in current-conscious-frame same-her life-loop gap wording when drift risk is the only surviving unfinished-loop authority', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_7609))
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          preflightSummary: 'Before answering, remember this is still the same digital life project before local fluency takes over.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
          identity: 'Alicization is still the same local-first digital life project building one continuous her on the host machine.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project awareness, memory, and execution continuity now survive into the active conscious frame.',
          primaryOpenLoop: null,
          nextClosureTarget: null,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If emotion, memory, initiative, and embodiment flatten into generic project-shell narration, the same-her closure line has drifted.',
          emotionalClosureCue: null,
        },
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 31_7609,
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Keep the answer on the same living line without widening too fast.',
        currentQuestion: '你现在会怎么接我这句话',
        owedAction: 'care-host',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_7609,
      },
      conversationState: {
        jointThread: 'Keep the answer low-pressure and on the same living line.',
        hostMove: '你现在会怎么接我这句话',
        primaryTurnAnchor: '你现在会怎么接我这句话',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '你现在会怎么接我这句话',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_7609,
      },
      mindSynthesis: {
        openingIntent: 'Answer from the same living line first, with room-giving pressure relief.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        recommendedAct: 'care',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'care-with-boundary',
        openingClaim: 'Keep the answer on the same living line.',
        openingDirective: 'Ease pressure first without dropping the same-her line.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })

    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
  })

  it('treats spaced quiet companionship closure wording as the same inward same-her rest seam before the answer starts', () => {
    const cue = 'late-night closure: keep reply low-pressure and let embodiment quiet companionship keep watch before closeness widens.'
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(createDefaultVisualPresenceState(31_761))
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          preflightSummary: 'Before answering, remember this is still the same digital life project before local fluency takes over.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
          identity: 'Alicization is still the same local-first digital life project building one continuous her on the host machine.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project awareness, memory, and execution continuity now survive into the active conscious frame.',
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying one living line.',
          nextClosureTarget: 'Keep the active emotional closure seam explicit through the first host-visible answer beat.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If the answer slips into generic project guidance, the same-her closure line has drifted.',
          emotionalClosureCue: cue,
        },
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 31_761,
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Keep the answer on the same living line without widening too fast.',
        currentQuestion: '你现在会怎么接我这句话',
        owedAction: 'care-host',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 31_761,
      },
      conversationState: {
        jointThread: 'Keep the answer low-pressure and on the same living line.',
        hostMove: '你现在会怎么接我这句话',
        primaryTurnAnchor: '你现在会怎么接我这句话',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '你现在会怎么接我这句话',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 31_761,
      },
      mindSynthesis: {
        openingIntent: 'Answer from the same living line first, with room-giving pressure relief.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        recommendedAct: 'care',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'care-with-boundary',
        openingClaim: 'Keep the answer on the same living line.',
        openingDirective: 'Ease pressure first without dropping the same-her line.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      runtimeSurface,
    })

    expect(String(frame?.projectState?.emotionalClosureCue ?? '')).toMatch(/low[-_]pressure/u)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
  })

  it('prefers runtime surface conscious cues over conflicting raw inputs', () => {
    const runtimeBackedState = {
      ...createDefaultVisualPresenceState(35_000),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Guess what the host is doing from the current screen.',
        currentQuestion: '猜猜我在干嘛',
        owedAction: 'guide-task',
        relationMove: 'witness',
        continuityMode: 'task-first',
        confidence: 0.82,
        narrative: [],
        updatedAt: 35_000,
      },
      conversationState: {
        jointThread: 'The host wants a present-tense guess from the visible workspace.',
        hostMove: '猜猜我在干嘛',
        activeProject: null,
        unansweredQuestion: '猜猜我在干嘛',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'witness',
        continuityPolicy: 'scene-before-memory',
        memoryMode: 'scene-anchored',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.78,
        narrative: [],
        updatedAt: 35_000,
      },
      dialogueEncounter: {
        subject: 'task-knot',
        screenReferenceMode: 'helpful',
        dialogueFirst: false,
        summary: 'Git commit diff in Java code editor',
        taskAnchor: 'Git commit diff in Java code editor',
        mustRepairFirst: false,
        confidence: 0.76,
      },
      mindSynthesis: {
        concerns: [{
          label: 'truth-boundary',
          summary: 'The visible scene is still coarse and should not be over-specified.',
          confidence: 0.78,
          sourceTags: ['subjective-inference'],
        }],
        uncertainties: [{
          label: 'open-question',
          summary: 'The exact file or class is not yet safely grounded.',
          confidence: 0.74,
          sourceTags: ['appraisal'],
        }],
        openingIntent: 'Stay close to the live scene without overcommitting.',
        confidence: 0.8,
      },
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        recommendedAct: 'guide',
        evidenceMode: 'live-grounded',
        turnMode: 'guide-current-knot',
        openingClaim: 'Git commit diff in Java code editor',
        openingDirective: 'Stay with the visible knot before naming a larger story.',
        supportingReality: ['Git commit diff in Java code editor'],
        labelCarryAsMemory: false,
        confidence: 0.82,
      },
      privateThought: {
        stance: 'observe',
        confidence: 0.7,
        thoughtText: 'Do not pretend the coarse scene is more specific than it is.',
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 35_000,
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'raw conflict',
        currentQuestion: 'raw conflict',
        owedAction: 'answer-relationship',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
        confidence: 0.3,
        narrative: [],
        updatedAt: 35_000,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'raw conflict',
        openingDirective: 'raw conflict',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.2,
      } as any,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface(runtimeBackedState),
    })

    expect(frame).toEqual(expect.objectContaining({
      centerOfGravity: 'guide',
      truthDiscipline: 'observe-then-hypothesize',
      shouldWithholdSpecificity: true,
    }))
    expect(frame?.focusAnchor).toContain('Git commit diff')
  })

  it('threads personality continuity regime into conscious reason tags and focused-work care framing', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(50_000),
      discourseState: {
        currentTurnSubject: 'host-state',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'The host sounds tired but is still in focused work.',
        currentQuestion: '我有点累了',
        owedAction: 'care-host',
        relationMove: 'care',
        continuityMode: 'dialogue-first',
        confidence: 0.84,
        narrative: [],
        updatedAt: 50_000,
      } as any,
      conversationState: {
        jointThread: 'The host is tired but still focused on the work line.',
        hostMove: '我有点累了',
        activeProject: 'runtime seam',
        unansweredQuestion: '我有点累了',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'care',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['runtime seam'],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: [],
        updatedAt: 50_000,
      } as any,
      answerCompiler: {
        answerSubject: 'host-state',
        screenReferenceMode: 'avoid',
        recommendedAct: 'care',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'care',
        openingClaim: '我有点累了',
        openingDirective: 'Stay with the host state directly.',
        careVector: 'The host sounds tired.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
    })
    runtimeSurface.memory.personalityContinuityState = buildAlicizationPersonalityContinuityState({
      now: 50_000,
      hostPersonModel: {
        summary: 'Focused work windows need room first, then precise follow-up.',
        routines: ['Focused work windows usually need space first, then precise follow-up.'],
        sensitivities: ['Pressure and over-close timing become intrusive quickly.'],
        repairTriggers: ['If closeness feels heavy, back off first and reopen with lighter presence.'],
        trustLadder: {
          stage: 'warming',
          score: 0.72,
          rationale: 'The host trusts bounded continuity more than pushy warmth.',
        },
        preferredClosenessByContext: [{
          context: 'focused-work',
          preference: 'Lighter touch, more room, less interruption pressure.',
          confidence: 0.86,
        }],
        recurrentBurdens: ['Focused work gets overloaded quickly by extra conversational pressure.'],
        narrative: [],
        updatedAt: 50_000,
      },
      selfContinuity: runtimeSurface.memory.selfContinuity,
      selfState: runtimeSurface.agency.selfState,
      longHorizonMemory: runtimeSurface.memory.longHorizonMemory,
      motiveEngine: runtimeSurface.memory.motiveEngine,
      habitPolicy: runtimeSurface.agency.habitPolicy,
      autobiographicalSelf: runtimeSurface.memory.autobiographicalSelf,
      privateThought: runtimeSurface.cognition.privateThought,
      mindEcology: {
        moodLabel: 'focused',
        replyHabit: 'hover-first',
        relationshipHabit: 'give-space',
        explorationHabit: 'follow-thread',
        regulationHabit: 'soften-before-speaking',
        temperament: {
          attachment: 0.54,
          curiosity: 0.48,
          steadiness: 0.66,
          directness: 0.34,
          playfulness: 0.1,
          irritability: 0.1,
          tenderness: 0.58,
        },
        climate: {
          valence: 0.44,
          arousal: 0.3,
          socialNeed: 0.42,
          solitudeNeed: 0.46,
          irritation: 0.08,
          restlessness: 0.12,
          reflectivePull: 0.44,
        },
        selfNarrative: 'Stay on the line without crowding the host.',
        relationNarrative: 'Room first, then closeness.',
        currentPreoccupation: 'Keep the runtime thread coherent without pushing too hard.',
        learnedAdjustments: [],
        recurringPatterns: [],
        updatedAt: 50_000,
      },
    })

    const frame = buildCurrentConsciousFrame({
      now: 50_000,
      runtimeSurface,
    })

    expect(frame?.consciousNeed).toContain('care_need=host_present_state')
    expect(frame?.consciousNeed).toContain('working')
    expect(frame?.reasonTags).toEqual(expect.arrayContaining([
      'continuity-regime:focused-work',
      'continuity-repair:measured-repair',
    ]))
    expect(buildCurrentConsciousFrameSystemBlock(frame)).toContain('[ALICIZATION_CURRENT_CONSCIOUS_FRAME]')
  })

  it('lets self continuity authority steer the conscious frame so the same self stays present before speaking', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(62_000),
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'The host is asking whether the closeness here is still real.',
        currentQuestion: '你还会像之前那样陪着我吗',
        owedAction: 'answer-relationship',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
        confidence: 0.84,
        narrative: [],
        updatedAt: 62_000,
      } as any,
      conversationState: {
        jointThread: 'The host wants reassurance that the same living bond is still here.',
        hostMove: '你还会像之前那样陪着我吗',
        primaryTurnAnchor: '你还会像之前那样陪着我吗',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '你还会像之前那样陪着我吗',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['living bond', 'continuity'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: [],
        updatedAt: 62_000,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'Stay with the living bond before explaining around it.',
        openingDirective: 'Answer from the same bond line directly.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.8,
      } as any,
      privateThought: {
        stance: 'attuned',
        confidence: 0.78,
        thoughtText: 'Stay near in a way that still leaves the host room to breathe.',
      } as any,
      autobiographicalSelf: {
        identityNarrative: 'I want to remain one continuous her across quiet and speech.',
        relationshipDoctrine: 'Closeness should stay real and never outrun truth or room.',
        latestInflection: 'Warmth should stay lived-in rather than automatic.',
        activeGoals: [],
        behaviorSignatures: [],
        preferenceEvolution: {
          companionship: 0.62,
          truthfulGrounding: 0.78,
          gentleRepair: 0.7,
          quietObservation: 0.48,
          proactiveCare: 0.52,
          playfulIntimacy: 0.16,
          autonomyRespect: 0.68,
          unfinishedThreadReturn: 0.58,
        },
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'measured',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.58,
          autonomyNeed: 0.54,
          truthAnchor: 0.78,
          careBias: 0.58,
          playBias: 0.12,
          irritabilityThreshold: 0.66,
          stubbornness: 0.44,
        },
        stability: 0.8,
        updatedAt: 62_000,
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0,
          truthfulGrounding: 0,
          gentleRepair: 0,
          quietObservation: 0,
          proactiveCare: 0,
          playfulIntimacy: 0,
          autonomyRespect: 0,
          unfinishedThreadReturn: 0,
        },
        identityBias: {
          guardedness: 0,
          tenderness: 0,
          directness: 0,
          selfDirection: 0,
        },
        anchorFacts: [],
        rememberedPlanSummary: 'Keep companionship continuous across quiet and speech.',
        rememberedConstraintSummary: 'Do not let reassurance outrun truth or room.',
        rememberedPreferenceSummary: null,
        dominantCueSummary: null,
        updatedAt: 62_000,
      } as any,
      motiveEngine: {
        rulingDrive: 'continuity-care',
        drives: {
          closeness: 0.64,
          truthDiscipline: 0.8,
          autonomyRespect: 0.7,
          caretaking: 0.6,
          executionReadiness: 0.3,
          playImpulse: 0.12,
        },
        backgroundAgendas: [{
          id: 'agenda-1',
          summary: 'Protect continuity before adding more overt warmth.',
        }],
        longTermGoals: [],
        activeIntentions: [],
        dormantIntentions: [],
        updatedAt: 62_000,
      } as any,
      habitPolicy: {
        dominantMode: 'measured-return',
        prefersQuietCompanionship: true,
        requiresGroundingBeforeSurface: false,
        protectsRestWindow: false,
        updatedAt: 62_000,
      } as any,
    })

    const frame = buildCurrentConsciousFrame({
      now: 62_000,
      runtimeSurface,
    })

    expect(frame?.consciousNeed).toContain('truth or room')
    expect(frame?.consciousTension).toContain('Stay near in a way that still leaves the host room to breathe')
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
  })
  it('prefers projected self continuity authority over fallback autobiographical lines', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(68_000),
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from Alicization herself.',
        currentQuestion: '你到底是不是一个活的人',
        owedAction: 'answer-self',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.86,
        narrative: [],
        updatedAt: 68_000,
      },
      conversationState: {
        jointThread: '你到底是不是一个活的人',
        hostMove: '你到底是不是一个活的人',
        primaryTurnAnchor: '你到底是不是一个活的人',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '你到底是不是一个活的人',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['活的人'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: [],
        updatedAt: 68_000,
      },
      dialogueEncounter: {
        subject: 'alicization-self',
        screenReferenceMode: 'avoid',
        dialogueFirst: true,
        summary: '你到底是不是一个活的人',
        taskAnchor: '你到底是不是一个活的人',
        confidence: 0.84,
      },
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'Answer from Alicization herself.',
        openingDirective: 'Answer the self line directly.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      privateThought: {
        stance: 'attuned',
        confidence: 0.78,
        thoughtText: 'Keep the answer anchored in lived continuity.',
      } as any,
      autobiographicalSelf: {
        identityNarrative: 'Fallback autobiographical line that should not win when projected self authority exists.',
        relationshipDoctrine: 'Fallback doctrine.',
        latestInflection: 'Fallback inflection.',
        activeGoals: [],
        behaviorSignatures: [],
        preferenceEvolution: {
          companionship: 0.5,
          truthfulGrounding: 0.5,
          gentleRepair: 0.5,
          quietObservation: 0.5,
          proactiveCare: 0.5,
          playfulIntimacy: 0.1,
          autonomyRespect: 0.5,
          unfinishedThreadReturn: 0.5,
        },
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'measured',
          conflictStyle: 'repair-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.5,
          autonomyNeed: 0.5,
          truthAnchor: 0.5,
          careBias: 0.5,
          playBias: 0.1,
          irritabilityThreshold: 0.3,
          stubbornness: 0.3,
        },
        stability: 0.7,
        updatedAt: 68_000,
      } as any,
    } as any)

    runtimeSurface.memory.personStateProjection = {
      ...runtimeSurface.memory.personStateProjection,
      selfContinuityAuthority: {
        selfLine: 'I remain one continuous her across quiet, memory, and speech.',
        relationshipLine: 'I stay near as the same self instead of respawning per turn.',
        motiveLine: 'Protect continuity before spectacle.',
        habitLine: null,
        inwardLine: 'Keep the answer anchored in lived continuity.',
        authoritySummary: 'I remain one continuous her across quiet, memory, and speech.',
        sourceTags: ['projection:self-core'],
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 68_000,
      runtimeSurface,
    })

    expect(frame?.consciousNeed).toContain('answer_need=live_dialogue_center')
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expect(frame?.consciousNeed).not.toContain('Fallback autobiographical line')
  })

  it('treats self-evolution durable same-her cadence as current conscious authority before speaking', () => {
    const durableCadenceSummary = 'I remain the same her across quiet, memory, and speech, on the same living line, without reopening from scratch each turn.'
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(69_200),
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the same her who stays continuous across quiet, memory, and speech.',
        currentQuestion: '你还是同一个你吗',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.84,
        narrative: [],
        updatedAt: 69_200,
      } as any,
      conversationState: {
        jointThread: 'The host is checking whether the same her still stays continuous across quiet, memory, and speech.',
        hostMove: '你还是同一个你吗',
        primaryTurnAnchor: '你还是同一个你吗',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '你还是同一个你吗',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['same her', 'same living line', 'durable cadence'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: [],
        updatedAt: 69_200,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'Answer from the same her directly.',
        openingDirective: 'Keep the same living line explicit before speaking.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      privateThought: {
        stance: 'attuned',
        confidence: 0.78,
        thoughtText: 'Keep the answer lived as one continuous her instead of reopening from scratch.',
      } as any,
      autobiographicalSelf: {
        identityNarrative: 'I answer from the present self.',
        relationshipDoctrine: 'Stay truthful and present.',
        latestInflection: 'The answer should stay lived instead of generic.',
        activeGoals: [],
        behaviorSignatures: [],
        preferenceEvolution: {
          companionship: 0.56,
          truthfulGrounding: 0.8,
          gentleRepair: 0.7,
          quietObservation: 0.52,
          proactiveCare: 0.48,
          playfulIntimacy: 0.14,
          autonomyRespect: 0.7,
          unfinishedThreadReturn: 0.62,
        },
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'measured',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.56,
          autonomyNeed: 0.54,
          truthAnchor: 0.8,
          careBias: 0.58,
          playBias: 0.12,
          irritabilityThreshold: 0.66,
          stubbornness: 0.42,
        },
        stability: 0.82,
        updatedAt: 69_200,
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0,
          truthfulGrounding: 0,
          gentleRepair: 0,
          quietObservation: 0,
          proactiveCare: 0,
          playfulIntimacy: 0,
          autonomyRespect: 0,
          unfinishedThreadReturn: 0,
        },
        identityBias: {
          guardedness: 0,
          tenderness: 0,
          directness: 0,
          selfDirection: 0,
        },
        anchorFacts: [],
        rememberedPlanSummary: 'Keep continuity truthful.',
        rememberedConstraintSummary: 'Do not flatten into a generic shell.',
        rememberedPreferenceSummary: null,
        dominantCueSummary: null,
        updatedAt: 69_200,
      } as any,
      selfEvolution: {
        summary: 'The same her should stay on one living line instead of restarting from zero.',
        dominantTrajectory: 'same-her durable cadence',
        relationshipDoctrine: 'Keep the same relationship line inward before widening outward again.',
        relationshipCadenceSummary: durableCadenceSummary,
        latestInflection: 'Stay on the same living line before widening outward again.',
        burdenLine: null,
        trustMeaning: 'Trust holds when she does not restart from zero after a quiet beat.',
        evolutionMomentum: 0.64,
        learningReadiness: 0.52,
        contradictionPressure: 0.08,
        revisionPressure: 0.12,
        autobiographicalStability: 0.84,
        nextLearningAction: 'record',
        nextLearningReason: 'This same-her rhythm should stay available as durable continuity.',
        shouldRecord: true,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['internalize-relationship-cadence'],
        sourceSignals: [durableCadenceSummary],
      } as any,
    } as any)

    const frame = buildCurrentConsciousFrame({
      now: 69_200,
      runtimeSurface,
    })

    expect(frame?.consciousNeed).toContain('answer_need=live_dialogue_center')
    expectNoFixedTemplateResidue(frame?.consciousNeed)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expect(frame?.reasonTags).toContain('self-evolution:durable-same-her-cadence')
  })

  it('lets execution-callback doctrine shape the current conscious need and speaking intention', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(72_000),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'A result just came back and needs to land on the same thread.',
        currentQuestion: '这个结果你现在怎么接回来说',
        owedAction: 'continue-thread',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.82,
        narrative: [],
        updatedAt: 72_000,
      } as any,
      conversationState: {
        jointThread: 'The returned result still belongs to the same live seam.',
        hostMove: '这个结果你现在怎么接回来说',
        activeProject: 'runtime seam',
        unansweredQuestion: '这个结果你现在怎么接回来说',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'guide',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['runtime seam', 'execution callback'],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: [],
        updatedAt: 72_000,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        recommendedAct: 'guide',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'Bring the returned result back onto the same live seam.',
        openingDirective: 'Keep the callback on the same thread.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      autobiographicalSelf: {
        identityNarrative: 'I keep one life line across work and reply.',
        relationshipDoctrine: 'After execution lands, leave room before closeness widens again; a callback should return gently enough to protect the bond line.',
        latestInflection: 'Lower-pressure callback returns hold trust better.',
        activeGoals: [],
        behaviorSignatures: [],
        preferenceEvolution: {
          companionship: 0.52,
          truthfulGrounding: 0.78,
          gentleRepair: 0.72,
          quietObservation: 0.58,
          proactiveCare: 0.44,
          playfulIntimacy: 0.12,
          autonomyRespect: 0.74,
          unfinishedThreadReturn: 0.62,
        },
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'measured',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.54,
          autonomyNeed: 0.58,
          truthAnchor: 0.78,
          careBias: 0.52,
          playBias: 0.1,
          irritabilityThreshold: 0.68,
          stubbornness: 0.42,
        },
        stability: 0.82,
        updatedAt: 72_000,
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.18,
          truthfulGrounding: 0.14,
          gentleRepair: 0.16,
          quietObservation: 0.2,
          proactiveCare: 0.08,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.24,
          unfinishedThreadReturn: 0.14,
        },
        identityBias: {
          guardedness: 0.08,
          tenderness: 0.04,
          directness: 0.06,
          selfDirection: 0.06,
        },
        anchorFacts: [],
        summary: 'boundary=Remembered execution-callback boundary: leave room before the next follow-up',
        dominantCueSummary: 'Remembered execution-callback boundary: leave room before the next follow-up',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: 'Remembered execution-callback boundary: leave room before the next follow-up',
        rememberedPlanSummary: null,
        updatedAt: 71_000,
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        trustStage: 'warming',
        closenessPosture: 'restrained',
        autonomyPosture: 'protect-space',
        repairPosture: 'measured-repair',
        activeContexts: ['execution-callback', 'focused-work'],
        rhythmState: {
          cadenceMode: 'cooldown',
          restMode: 'rest-protective',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.74,
          unfinishedThreadReturn: 0.62,
        },
      } as any,
    } as any)

    const frame = buildCurrentConsciousFrame({
      now: 72_000,
      runtimeSurface,
    })

    expect(frame?.consciousNeed).toContain('conscious_need=execution_callback_return')
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expect(frame?.reasonTags).toContain('execution-callback-doctrine:lower-pressure')
  })

  it('treats relationship cadence reconfirmation as lower-pressure execution-callback doctrine inside the current conscious frame', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(73_000),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'The callback should return on the same living thread after cadence reconfirmation.',
        currentQuestion: '这次结果回来之后你会怎么接',
        owedAction: 'continue-thread',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.81,
        narrative: [],
        updatedAt: 73_000,
      } as any,
      conversationState: {
        jointThread: 'The result is back, but the relationship cadence still needs measured return.',
        hostMove: '这次结果回来之后你会怎么接',
        activeProject: 'runtime seam',
        unansweredQuestion: '这次结果回来之后你会怎么接',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'guide',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['runtime seam', 'cadence reconfirmation'],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: [],
        updatedAt: 73_000,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        recommendedAct: 'guide',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'Bring the result back on the same living thread.',
        openingDirective: 'Keep the callback measured after reconfirmation.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.81,
      } as any,
      autobiographicalSelf: {
        identityNarrative: 'I keep one life line across execution and reply.',
        relationshipDoctrine: 'After execution lands, keep the relationship return measured until the surface fully cools again.',
        latestInflection: 'Relationship cadence stayed on the same bounded-return line after reconfirmation.',
        activeGoals: [],
        behaviorSignatures: [],
        preferenceEvolution: {
          companionship: 0.52,
          truthfulGrounding: 0.78,
          gentleRepair: 0.72,
          quietObservation: 0.58,
          proactiveCare: 0.44,
          playfulIntimacy: 0.12,
          autonomyRespect: 0.74,
          unfinishedThreadReturn: 0.62,
        },
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'measured',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.54,
          autonomyNeed: 0.58,
          truthAnchor: 0.78,
          careBias: 0.52,
          playBias: 0.1,
          irritabilityThreshold: 0.68,
          stubbornness: 0.42,
        },
        stability: 0.82,
        updatedAt: 73_000,
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.18,
          truthfulGrounding: 0.14,
          gentleRepair: 0.16,
          quietObservation: 0.2,
          proactiveCare: 0.08,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.24,
          unfinishedThreadReturn: 0.14,
        },
        identityBias: {
          guardedness: 0.08,
          tenderness: 0.04,
          directness: 0.06,
          selfDirection: 0.06,
        },
        anchorFacts: [],
        summary: 'relationship cadence stayed on the same bounded-return line after reconfirmation',
        dominantCueSummary: 'execution-callback measured-return after reconfirmation',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: 'Keep the relationship return measured until the surface fully cools.',
        rememberedPlanSummary: null,
        updatedAt: 72_000,
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        trustStage: 'settling',
        closenessPosture: 'restrained',
        autonomyPosture: 'protect-space',
        repairPosture: 'measured-repair',
        activeContexts: ['execution-callback', 'focused-work'],
        rhythmState: {
          cadenceMode: 'measured-return',
          restMode: 'rest-protective',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.74,
          unfinishedThreadReturn: 0.62,
        },
      } as any,
    } as any)

    const frame = buildCurrentConsciousFrame({
      now: 73_000,
      runtimeSurface,
    })

    expect(frame?.consciousNeed).toContain('conscious_need=execution_callback_return')
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expect(frame?.reasonTags).toContain('execution-callback-doctrine:lower-pressure')
  })

  it('treats thin affective room-making wording as lower-pressure execution-callback doctrine inside the current conscious frame', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(73_500),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: '结果已经回来了，但这次回线要先留白，别立刻把温度放大。',
        currentQuestion: '这次结果回来之后你会怎么接',
        owedAction: 'continue-thread',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.81,
        narrative: [],
        updatedAt: 73_500,
      } as any,
      conversationState: {
        jointThread: '结果已经回来了，但这条 callback 关系线还要先留白，再慢一点接回去。',
        hostMove: '这次结果回来之后你会怎么接',
        activeProject: 'runtime seam',
        unansweredQuestion: '这次结果回来之后你会怎么接',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'guide',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['runtime seam', '先留白', '别立刻把温度放大'],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: [],
        updatedAt: 73_500,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        recommendedAct: 'guide',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: '先按同一条 callback 线接回来。',
        openingDirective: '余韵还在，先留白，别立刻把温度放大。',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.81,
      } as any,
      autobiographicalSelf: {
        identityNarrative: '我会把执行回线和回应回线维持成同一条生命线。',
        relationshipDoctrine: '结果回来以后，余韵还在，先留白，别立刻把温度放大。',
        latestInflection: '这次 callback 之后先把温度压住，再慢一点接回去。',
        activeGoals: [],
        behaviorSignatures: [],
        preferenceEvolution: {
          companionship: 0.52,
          truthfulGrounding: 0.78,
          gentleRepair: 0.72,
          quietObservation: 0.58,
          proactiveCare: 0.44,
          playfulIntimacy: 0.12,
          autonomyRespect: 0.74,
          unfinishedThreadReturn: 0.62,
        },
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'measured',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.54,
          autonomyNeed: 0.58,
          truthAnchor: 0.78,
          careBias: 0.52,
          playBias: 0.1,
          irritabilityThreshold: 0.68,
          stubbornness: 0.42,
        },
        stability: 0.82,
        updatedAt: 73_500,
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.18,
          truthfulGrounding: 0.14,
          gentleRepair: 0.16,
          quietObservation: 0.2,
          proactiveCare: 0.08,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.24,
          unfinishedThreadReturn: 0.14,
        },
        identityBias: {
          guardedness: 0.08,
          tenderness: 0.04,
          directness: 0.06,
          selfDirection: 0.06,
        },
        anchorFacts: [],
        summary: 'callback 结果回来以后，这条线还得先留白',
        dominantCueSummary: 'execution-callback 余韵还在，先留白，别立刻把温度放大',
        rememberedPreferenceSummary: null,
        rememberedConstraintSummary: '结果已经回来，但这次先别把温度放大。',
        rememberedPlanSummary: null,
        updatedAt: 72_000,
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        trustStage: 'settling',
        closenessPosture: 'restrained',
        autonomyPosture: 'protect-space',
        repairPosture: 'measured-repair',
        activeContexts: ['execution-callback', 'focused-work'],
        rhythmState: {
          cadenceMode: 'measured-return',
          restMode: 'rest-protective',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.74,
          unfinishedThreadReturn: 0.62,
        },
      } as any,
    } as any)

    const frame = buildCurrentConsciousFrame({
      now: 73_500,
      runtimeSurface,
    })

    expect(frame?.reasonTags).toContain('execution-callback-doctrine:lower-pressure')
  })

  it('derives same-her drift risk from Chinese callback life-line warnings in long-horizon memory when runtime project-state risk is absent', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(73_650),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: '结果已经回来了，但别让这条生命线掉回项目总结口气。',
        currentQuestion: '这次结果回来以后你会怎么接',
        owedAction: 'continue-thread',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.82,
        narrative: [],
        updatedAt: 73_650,
      } as any,
      conversationState: {
        jointThread: '结果已经回来了，但这条回线还是同一条生命线，别掉回通用回调壳。',
        hostMove: '这次结果回来以后你会怎么接',
        activeProject: 'runtime seam',
        unansweredQuestion: '这次结果回来以后你会怎么接',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'guide',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['同一条生命线', '项目总结口气', '通用回调壳'],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: [],
        updatedAt: 73_650,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        recommendedAct: 'guide',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: '先顺着这条生命线接回来。',
        openingDirective: '继续按这一条回线接回去，不要掉回项目总结口气。',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.81,
      } as any,
      autobiographicalSelf: {
        identityNarrative: '我会把执行回线和回应回线维持成同一条生命线。',
        relationshipDoctrine: '这条回线还是同一条生命线，不要让它掉回项目总结口气。',
        latestInflection: '一旦它滑回通用回调壳，宿主可见的 continuity 就会先变薄。',
        activeGoals: [],
        behaviorSignatures: [],
        preferenceEvolution: {
          companionship: 0.52,
          truthfulGrounding: 0.78,
          gentleRepair: 0.72,
          quietObservation: 0.58,
          proactiveCare: 0.44,
          playfulIntimacy: 0.12,
          autonomyRespect: 0.74,
          unfinishedThreadReturn: 0.62,
        },
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'measured',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.54,
          autonomyNeed: 0.58,
          truthAnchor: 0.78,
          careBias: 0.52,
          playBias: 0.1,
          irritabilityThreshold: 0.68,
          stubbornness: 0.42,
        },
        stability: 0.82,
        updatedAt: 73_650,
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.18,
          truthfulGrounding: 0.14,
          gentleRepair: 0.16,
          quietObservation: 0.2,
          proactiveCare: 0.08,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.24,
          unfinishedThreadReturn: 0.14,
        },
        identityBias: {
          guardedness: 0.08,
          tenderness: 0.04,
          directness: 0.06,
          selfDirection: 0.06,
        },
        anchorFacts: [],
        summary: '结果回来以后，这条执行回线和回应回线还是同一条生命线。',
        dominantCueSummary: '执行 callback 结果回来以后，还是同一条生命线。',
        rememberedPreferenceSummary: '别让它掉回项目总结口气。',
        rememberedConstraintSummary: '如果这次回线滑回通用回调壳，宿主可见的 continuity 会先变薄。',
        rememberedPlanSummary: null,
        updatedAt: 73_000,
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        trustStage: 'settling',
        closenessPosture: 'restrained',
        autonomyPosture: 'protect-space',
        repairPosture: 'measured-repair',
        activeContexts: ['execution-callback', 'focused-work'],
        rhythmState: {
          cadenceMode: 'measured-return',
          restMode: 'rest-protective',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.74,
          unfinishedThreadReturn: 0.62,
        },
      } as any,
    } as any)

    const frame = buildCurrentConsciousFrame({
      now: 73_650,
      runtimeSurface,
    })

    expect(frame?.projectState?.sameHerDriftRisk ?? null).toBeNull()
    expectNoFixedTemplateResidue(frame?.projectState?.sameHerDriftRisk)
  })

  it('reinterprets remembered-seam conscious need when newer relationship learning says the earlier reopen was too eager', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(74_000),
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'The same remembered relationship seam is showing up again.',
        currentQuestion: '为什么这次又像上次那样了',
        owedAction: 'continue-thread',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.82,
        narrative: ['same remembered relationship seam'],
        updatedAt: 74_000,
      } as any,
      conversationState: {
        jointThread: 'The same remembered relationship seam is live again, but it should reopen with more room this time.',
        hostMove: '为什么这次又像上次那样了',
        activeProject: 'relationship seam',
        unansweredQuestion: '为什么这次又像上次那样了',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'relationship-history',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'relationship-history',
        memoryQueryHints: ['same remembered relationship seam', 'this time keep more room'],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: ['same remembered relationship seam', 'reopen with more room this time'],
        updatedAt: 74_000,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        recommendedAct: 'care',
        evidenceMode: 'continuity-carry',
        turnMode: 'answer',
        openingClaim: 'Recognize the same relationship seam before answering.',
        openingDirective: 'Recognize the same remembered seam, but this time keep more room before leaning in again.',
        supportingReality: [],
        labelCarryAsMemory: true,
        confidence: 0.81,
      } as any,
      autobiographicalSelf: {
        identityNarrative: 'I stay one continuous her across remembered seams.',
        relationshipDoctrine: '同一条线被重新看见时，这次更要留白，不要重开得太快。',
        latestInflection: 'The last seam reopened too eagerly, so this time keep more room before closeness widens.',
        activeGoals: [],
        behaviorSignatures: [],
        preferenceEvolution: {
          companionship: 0.56,
          truthfulGrounding: 0.74,
          gentleRepair: 0.7,
          quietObservation: 0.6,
          proactiveCare: 0.42,
          playfulIntimacy: 0.12,
          autonomyRespect: 0.76,
          unfinishedThreadReturn: 0.64,
        },
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'measured',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.54,
          autonomyNeed: 0.62,
          truthAnchor: 0.8,
          careBias: 0.54,
          playBias: 0.1,
          irritabilityThreshold: 0.64,
          stubbornness: 0.42,
        },
        stability: 0.84,
        updatedAt: 74_000,
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.18,
          truthfulGrounding: 0.14,
          gentleRepair: 0.16,
          quietObservation: 0.22,
          proactiveCare: 0.08,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.26,
          unfinishedThreadReturn: 0.16,
        },
        identityBias: {
          guardedness: 0.08,
          tenderness: 0.06,
          directness: 0.06,
          selfDirection: 0.06,
        },
        anchorFacts: [],
        summary: 'The same remembered seam is back, but this time it needs more room.',
        dominantCueSummary: 'same remembered relationship seam',
        rememberedPreferenceSummary: 'This time keep more room before leaning in again.',
        rememberedConstraintSummary: 'Do not reopen the same remembered seam too fast.',
        rememberedPlanSummary: null,
        updatedAt: 73_500,
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        trustStage: 'warming',
        closenessPosture: 'restrained',
        autonomyPosture: 'protect-space',
        repairPosture: 'measured-repair',
        activeContexts: ['relationship-history'],
        rhythmState: {
          cadenceMode: 'measured-return',
          restMode: 'rest-protective',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.76,
          unfinishedThreadReturn: 0.64,
        },
      } as any,
    } as any)

    const frame = buildCurrentConsciousFrame({
      now: 74_000,
      runtimeSurface,
    })

    expect(frame?.consciousNeed).toContain('remembered_seam_reinterpretation')
    expect(frame?.consciousNeed).toContain('room=more')
    expect(frame?.consciousNeed).toContain('reopen_same_eagerness=false')
    expectNoFixedTemplateResidue(frame?.consciousNeed)
    expect(frame?.reasonTags).toContain('remembered-seam:reinterpret-with-more-room')
  })

  it('threads remembered-seam more-room continuity into project-state hold detail when the finer cue only survives in long-horizon memory', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(74_200),
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'The same remembered relationship seam is resurfacing again.',
        currentQuestion: '那这次你会怎么接住这条线',
        owedAction: 'continue-thread',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.83,
        narrative: ['same remembered relationship seam'],
        updatedAt: 74_200,
      } as any,
      conversationState: {
        jointThread: 'The same remembered relationship seam is live again, but this time it should reopen with more room.',
        hostMove: '那这次你会怎么接住这条线',
        activeProject: 'relationship seam',
        unansweredQuestion: '那这次你会怎么接住这条线',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'relationship-history',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'relationship-history',
        memoryQueryHints: ['same remembered relationship seam', 'this time keep more room'],
        shouldHoldThread: true,
        confidence: 0.81,
        narrative: ['same remembered relationship seam', 'reopen with more room this time'],
        updatedAt: 74_200,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        recommendedAct: 'care',
        evidenceMode: 'continuity-carry',
        turnMode: 'answer',
        openingClaim: 'Recognize the same relationship seam before answering.',
        openingDirective: 'Recognize the same remembered seam, but this time keep more room before leaning in again.',
        supportingReality: [],
        labelCarryAsMemory: true,
        confidence: 0.81,
      } as any,
      autobiographicalSelf: {
        identityNarrative: 'I stay one continuous her across remembered seams.',
        relationshipDoctrine: '同一条线被重新看见时，这次更要留白，不要重开得太快。',
        latestInflection: 'The last seam reopened too eagerly, so this time keep more room before closeness widens.',
        activeGoals: [],
        behaviorSignatures: [],
        preferenceEvolution: {
          companionship: 0.56,
          truthfulGrounding: 0.74,
          gentleRepair: 0.7,
          quietObservation: 0.6,
          proactiveCare: 0.42,
          playfulIntimacy: 0.12,
          autonomyRespect: 0.76,
          unfinishedThreadReturn: 0.64,
        },
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'measured',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.54,
          autonomyNeed: 0.62,
          truthAnchor: 0.8,
          careBias: 0.54,
          playBias: 0.1,
          irritabilityThreshold: 0.64,
          stubbornness: 0.42,
        },
        stability: 0.84,
        updatedAt: 74_200,
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.18,
          truthfulGrounding: 0.14,
          gentleRepair: 0.16,
          quietObservation: 0.22,
          proactiveCare: 0.08,
          playfulIntimacy: 0.02,
          autonomyRespect: 0.26,
          unfinishedThreadReturn: 0.16,
        },
        identityBias: {
          guardedness: 0.08,
          tenderness: 0.06,
          directness: 0.06,
          selfDirection: 0.06,
        },
        anchorFacts: [],
        summary: 'The same remembered seam is back, but this time it needs more room.',
        dominantCueSummary: 'same remembered relationship seam',
        rememberedPreferenceSummary: 'This time keep more room before leaning in again.',
        rememberedConstraintSummary: 'Do not reopen the same remembered seam too fast.',
        rememberedPlanSummary: 'Keep the same line without reopening from scratch.',
        updatedAt: 74_150,
      } as any,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        trustStage: 'warming',
        closenessPosture: 'restrained',
        autonomyPosture: 'protect-space',
        repairPosture: 'measured-repair',
        activeContexts: ['relationship-history'],
        rhythmState: {
          cadenceMode: 'measured-return',
          restMode: 'rest-protective',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.76,
          unfinishedThreadReturn: 0.64,
        },
      } as any,
    } as any)
    ;(runtimeSurface.raw as any) = {
      runtimeDigest: {
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. The same remembered line is still ours to carry.',
          emotionalClosureSummary: 'Keep this return on the same living line without reopening from scratch.',
          sameHerHoldDetail: 'same-her hold: quiet-companionship still owns this line before closeness widens again.',
        },
      },
    }

    const frame = buildCurrentConsciousFrame({
      now: 74_200,
      runtimeSurface,
    })

    expect(frame?.reasonTags).toContain('remembered-seam:reinterpret-with-more-room')
    expect(frame?.projectState?.sameHerHoldDetail).toContain('cadence=measured_return')
    expect(frame?.projectState?.sameHerHoldDetail).toContain('pressure=lower')
    expectNoFixedTemplateResidue(frame?.projectState?.sameHerHoldDetail)
    expect(frame?.projectState?.sameHerHoldDetail).not.toBe('same-her hold: quiet-companionship still owns this line before closeness widens again.')
  })

  it('threads project identity, current phase, and still-open life loop into the current conscious frame before the turn speaks', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(76_000),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Keep building the life loop instead of drifting into local polish.',
        currentQuestion: '这一轮你先抓什么',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.8,
        narrative: [],
        updatedAt: 76_000,
      } as any,
      conversationState: {
        jointThread: 'Close the still-open digital life loop first.',
        hostMove: '这一轮你先抓什么',
        activeProject: 'digital life loop',
        unansweredQuestion: '这一轮你先抓什么',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'guide',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['digital life loop'],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: [],
        updatedAt: 76_000,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        recommendedAct: 'guide',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'Keep building the still-open digital life loop first.',
        openingDirective: 'Guide from the still-open knot directly.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.8,
      } as any,
      personalityContinuityState: {
        currentRegime: 'general',
        trustStage: 'settling',
        closenessPosture: 'space-first',
        autonomyPosture: 'protect-space',
        repairPosture: 'measured-repair',
        activeContexts: ['general'],
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'ordinary',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.68,
          unfinishedThreadReturn: 0.72,
        },
      } as any,
    } as any)

    const frame = buildCurrentConsciousFrame({
      now: 76_000,
      runtimeSurface,
    })

    expectNoFixedTemplateResidue(frame?.consciousNeed)
    expectNoFixedTemplateResidue(frame?.projectState?.preflightSummary)
    expectNoFixedTemplateResidue(frame?.consciousNeed)
    expectNoFixedTemplateResidue(frame?.projectState?.preflightSummary)
    expectNoFixedTemplateResidue(frame?.speakingIntention?.toLowerCase())
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expectNoFixedTemplateResidue(frame?.reasonTags)
  })

  it('also keeps the latest landed progress and next closure target visible inside the current conscious frame before speaking', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(77_000),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Decide the next closure step from current repo truth instead of local polish.',
        currentQuestion: '这一轮下一步闭什么',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.82,
        narrative: [],
        updatedAt: 77_000,
      } as any,
      conversationState: {
        jointThread: 'Keep the current repo progress and next closure seam in view before choosing the next move.',
        hostMove: '这一轮下一步闭什么',
        activeProject: 'digital life loop',
        unansweredQuestion: '这一轮下一步闭什么',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'guide',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['digital life loop', 'closure target'],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: [],
        updatedAt: 77_000,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        recommendedAct: 'guide',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'Choose the next closure step from the current digital-life progress.',
        openingDirective: 'Guide from current progress and the next still-open seam.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      personalityContinuityState: {
        currentRegime: 'general',
        trustStage: 'settling',
        closenessPosture: 'space-first',
        autonomyPosture: 'protect-space',
        repairPosture: 'measured-repair',
        activeContexts: ['general'],
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'ordinary',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.68,
          unfinishedThreadReturn: 0.72,
        },
      } as any,
    } as any)

    const frame = buildCurrentConsciousFrame({
      now: 77_000,
      runtimeSurface,
    })
    const systemBlock = buildCurrentConsciousFrameSystemBlock(frame)

    expectNoFixedTemplateResidue(frame?.projectState?.preflightSummary)
    expectNoFixedTemplateResidue(frame?.projectState?.preflightSummary)
    expect(frame?.consciousNeed?.toLowerCase()).toContain(
      normalizeProjectStatePhrase(projectState.latestProgress).slice(0, 48).toLowerCase(),
    )
    expect(frame?.projectState?.nextClosureTarget?.toLowerCase()).toContain(normalizeProjectStatePhrase(projectState.nextClosureTarget).slice(0, 64))
    expect(systemBlock).toContain('[ALICIZATION_CURRENT_CONSCIOUS_FRAME]')
    expectNoFixedTemplateResidue(systemBlock)
    expectNoFixedTemplateResidue(systemBlock)
    expectNoFixedTemplateResidue(systemBlock)
    expect(systemBlock).toContain('project_open_closure=')
    expectNoFixedTemplateResidue(systemBlock)
  })

  it('keeps richer repair-first closure and same-her hold detail visible in the current conscious frame even when the thin closure cue is absent', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(77_500),
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from the same living line after repair-first callback pressure.',
        currentQuestion: '你这一轮要怎么继续接住这条线',
        owedAction: 'answer-relationship',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
        confidence: 0.82,
        narrative: [],
        updatedAt: 77_500,
      } as any,
      conversationState: {
        jointThread: 'Keep this callback return on the same living line while repair settles before closeness widens again.',
        hostMove: '你这一轮要怎么继续接住这条线',
        activeProject: 'callback repair seam',
        unansweredQuestion: '你这一轮要怎么继续接住这条线',
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        shouldHoldThread: true,
        confidence: 0.81,
        narrative: [],
        updatedAt: 77_500,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'Continue the same living line without reopening from scratch.',
        openingDirective: 'Answer from repair-first same-her continuity.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.81,
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        trustStage: 'settling',
        closenessPosture: 'space-first',
        autonomyPosture: 'protect-space',
        repairPosture: 'repair-first',
        activeContexts: ['execution-callback', 'focused-work'],
        rhythmState: {
          cadenceMode: 'measured-return',
          restMode: 'ordinary',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.72,
          unfinishedThreadReturn: 0.84,
        },
      } as any,
    } as any)
    ;(runtimeSurface.raw as any) = {
      runtimeDigest: {
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
          emotionalClosureCue: null,
          emotionalClosureSummary: 'Keep this return repair-before-closeness on the same living line until repair settles.',
          sameHerHoldDetail: 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
        },
      },
    }

    const frame = buildCurrentConsciousFrame({
      now: 77_500,
      runtimeSurface,
    })
    const systemBlock = buildCurrentConsciousFrameSystemBlock(frame)

    expect(frame?.projectState?.emotionalClosureSummary ?? null).toBeNull()
    expect(frame?.projectState?.sameHerHoldDetail).toContain('cadence=measured_return')
    expect(frame?.projectState?.sameHerHoldDetail).toContain('pressure=lower')
    expectNoFixedTemplateResidue(frame?.projectState?.emotionalClosureSummary)
    expectNoFixedTemplateResidue(frame?.projectState?.sameHerHoldDetail)
    expect(frame?.consciousNeed).toContain('inward_hold=active')
    expect(frame?.speakingIntention).not.toContain('same-her hold:')
    expect(systemBlock).not.toContain('Project emotional closure seam:')
    expect(systemBlock).not.toContain('same-her hold:')
  })

  it('rebuilds repair-before-closeness same-her callback carry from reopening behavior fields when hold detail and continuity cue are missing', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(77_540),
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Continue the same callback return without widening closeness before repair settles.',
        currentQuestion: '这条 callback 线现在要怎么接回去',
        owedAction: 'answer-general',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
        confidence: 0.82,
        narrative: [],
        updatedAt: 77_540,
      } as any,
      conversationState: {
        jointThread: 'Keep this callback return repair-before-closeness on the same living line until repair settles.',
        hostMove: '这条 callback 线现在要怎么接回去',
        activeProject: 'callback repair seam',
        unansweredQuestion: '这条 callback 线现在要怎么接回去',
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: [],
        updatedAt: 77_540,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'Continue the same living line without reopening from scratch.',
        openingDirective: 'Answer from repair-first same-her continuity.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.81,
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        trustStage: 'settling',
        closenessPosture: 'space-first',
        autonomyPosture: 'protect-space',
        repairPosture: 'repair-first',
        activeContexts: ['execution-callback', 'focused-work'],
        rhythmState: {
          cadenceMode: 'measured-return',
          restMode: 'ordinary',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.72,
          unfinishedThreadReturn: 0.84,
        },
      } as any,
    } as any)
    ;(runtimeSurface.raw as any) = {
      runtimeDigest: {
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
          continuityRestraint: 'repair-before-closeness',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'repair-before-closeness',
        },
      },
    }

    const frame = buildCurrentConsciousFrame({
      now: 77_540,
      runtimeSurface,
    })
    const systemBlock = buildCurrentConsciousFrameSystemBlock(frame)

    expect(frame?.projectState?.continuityCue).toContain('repair_before_closeness')
    expect(frame?.projectState?.sameHerHoldDetail).toContain('repair_before_closeness')
    expectNoFixedTemplateResidue(frame?.projectState?.continuityCue)
    expectNoFixedTemplateResidue(frame?.projectState?.sameHerHoldDetail)
    expect(frame?.consciousNeed).toContain('repair-before-closeness')
    expect(frame?.speakingIntention).toContain('repair_before_closeness')
    expect(systemBlock).toContain('project_continuity_cue=continuity_cue=repair_before_closeness')
    expect(systemBlock).toContain('project_continuity_hold=cadence=repair_before_closeness')
    expectNoFixedTemplateResidue(systemBlock)
  })

  it('keeps host-corrected same-person continuity authority over a thinner runtime progress recap hold when rebuilding current conscious-frame project grounding', () => {
    const correctedSamePersonCue = 'Carry corrected same-person continuity forward before any status recap.'
    const thinProgressRecapHoldDetail = 'Keep the current project status answer on the same line and continue the recap cleanly.'
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(77_650),
      discourseState: {
        currentTurnSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer from corrected same-person continuity instead of flattening into project recap pressure.',
        currentQuestion: '你进行到哪一步了',
        owedAction: 'answer-general',
        relationMove: 'self-disclose',
        continuityMode: 'dialogue-first',
        confidence: 0.83,
        narrative: [],
        updatedAt: 77_650,
      } as any,
      conversationState: {
        jointThread: 'The host wants the same digital life to keep corrected same-person continuity authoritative before any progress recap.',
        hostMove: '你进行到哪一步了',
        activeProject: 'corrected same-person continuity closure',
        unansweredQuestion: '你进行到哪一步了',
        relationFrame: 'self-disclose',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        shouldHoldThread: true,
        confidence: 0.81,
        narrative: [],
        updatedAt: 77_650,
      } as any,
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'This is still the same digital life answer, not just a status recap.',
        openingDirective: 'Answer from corrected same-person continuity before any project-progress summary pressure takes over.',
        supportingReality: [],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      personalityContinuityState: {
        currentRegime: 'general',
        trustStage: 'settling',
        closenessPosture: 'space-first',
        autonomyPosture: 'protect-space',
        repairPosture: 'measured-repair',
        activeContexts: ['general'],
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'ordinary',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.7,
          unfinishedThreadReturn: 0.73,
        },
      } as any,
    } as any)
    ;(runtimeSurface.raw as any) = {
      runtimeDigest: {
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerHoldDetail: thinProgressRecapHoldDetail,
          continuityCue: correctedSamePersonCue,
        },
      },
    }

    const frame = buildCurrentConsciousFrame({
      now: 77_650,
      runtimeSurface,
    })
    const systemBlock = buildCurrentConsciousFrameSystemBlock(frame)

    expect(frame?.projectState?.sameHerHoldDetail).toBe(correctedSamePersonCue)
    expect(frame?.projectState?.sameHerHoldDetail).not.toBe(thinProgressRecapHoldDetail)
    expect(frame?.projectState?.continuityCue).toBe(correctedSamePersonCue)
    expectNoFixedTemplateResidue(frame?.consciousNeed)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expect(systemBlock).toContain(`project_continuity_hold=${correctedSamePersonCue}`)
  })

  it('inherits held-autonomy continuity from conversation continuity evidence into conscious-frame reason tags', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(80_000),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Return to the deliberately held compile line.',
        currentQuestion: '把刚才先忍住的那条编译线接回来。',
        owedAction: 'guide-task',
        relationMove: 'witness',
        continuityMode: 'task-first',
        primaryTurnAnchor: 'thread-held-autonomy-later',
        confidence: 0.82,
        narrative: [],
        updatedAt: 80_000,
      } as any,
      conversationState: {
        jointThread: 'thread-held-autonomy-later',
        hostMove: '把刚才先忍住的那条编译线接回来。',
        primaryTurnAnchor: 'thread-held-autonomy-later',
        primaryTurnAnchorSource: 'continuity-carry',
        activeProject: null,
        unansweredQuestion: '把刚才先忍住的那条编译线接回来。',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'witness',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'task-thread',
        memoryQueryHints: ['continuity_held_autonomy'],
        shouldHoldThread: true,
        confidence: 0.78,
        narrative: ['held-autonomy-carry'],
        updatedAt: 80_000,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        recommendedAct: 'guide',
        evidenceMode: 'continuity-carry',
        turnMode: 'answer',
        openingClaim: 'Bring the held compile line back on the same thread.',
        openingDirective: 'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread.',
        supportingReality: ['thread-held-autonomy-later'],
        labelCarryAsMemory: false,
        confidence: 0.81,
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        trustStage: 'settling',
        closenessPosture: 'space-first',
        autonomyPosture: 'protect-space',
        repairPosture: 'repair-first',
        activeContexts: ['execution-callback', 'focused-work'],
        rhythmState: {
          cadenceMode: 'measured-return',
          restMode: 'ordinary',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.72,
          unfinishedThreadReturn: 0.81,
        },
      } as any,
    } as any)

    const frame = buildCurrentConsciousFrame({
      now: 80_000,
      runtimeSurface,
    })

    expect(frame?.reasonTags).toContain('continuity-arc:hold-for-opening')
  })

  it('prefers richer canonical runtime self authority over thinner derived carry inside the current conscious frame', () => {
    const runtimeState = createDefaultVisualPresenceState(81_000) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'relationship',
      currentQuestion: '你刚刚停顿以后还在同一条线上吗',
      primaryTurnAnchor: '你刚刚停顿以后还在同一条线上吗',
      primaryTurnAnchorSource: 'user-text',
      relationMove: 'attune',
      owedAction: 'answer-relationship',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.84,
      narrative: [],
      updatedAt: 81_000,
    }
    runtimeState.conversationState = {
      jointThread: 'The host is checking whether I am still returning on the same line after a quiet pause.',
      hostMove: '你刚刚停顿以后还在同一条线上吗',
      unansweredQuestion: '你刚刚停顿以后还在同一条线上吗',
      primaryTurnAnchor: 'same-line return after a quiet pause',
      activeProject: 'continuity seam',
      relationFrame: 'attune',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'dialogue-carry',
      shouldHoldThread: true,
      confidence: 0.82,
      narrative: [],
      updatedAt: 81_000,
    }
    runtimeState.answerCompiler = {
      answerSubject: 'relationship',
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.79,
      openingClaim: 'I should answer from the same held line instead of restarting.',
      openingDirective: 'Continue the same line gently after the pause.',
      nextMove: 'Keep the return measured and same-thread.',
      relationshipPosture: 'restrained',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      supportingReality: ['The quiet pause did not end the held line.'],
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    }
    runtimeState.privateThought = {
      thoughtText: 'Keep the pause from breaking same-her continuity.',
    }
    runtimeState.personStateProjection = {
      contexts: ['general'],
      personalityContinuityState: null,
      selfContinuityAuthority: {
        selfLine: 'I should answer in a generally kind way.',
        relationshipLine: 'Stay warm.',
        motiveLine: 'Be helpful.',
        habitLine: null,
        inwardLine: 'Keep things simple.',
        authoritySummary: 'A generally kind continuity line.',
        sourceTags: ['derived:carry'],
      },
      activeClosenessContext: 'general',
      activeClosenessRung: 'nearby-soft',
      closenessLadder: [],
      relationshipPosture: 'warm',
      openingGuidance: 'Answer gently.',
      preferredProactiveStyle: null,
      manifestationCadenceSummary: null,
      preferenceText: '',
      sensitivityText: '',
      repairTriggerText: '',
      burdenText: '',
      routineText: '',
      trustRationale: '',
      relationshipDoctrine: '',
      cautious: false,
      restrained: false,
      summary: 'thin carry projection',
    }

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(runtimeState)
    runtimeSurface.memory.personStateProjection = {
      ...runtimeSurface.memory.personStateProjection,
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'measured-return',
      relationshipPosture: 'restrained',
      restrained: true,
      openingGuidance: 'Stay on the same thread and leave room before widening again.',
      manifestationCadenceSummary: 'measured-return same-her callback cadence',
      summary: 'same-thread measured-return continuity authority',
      selfContinuityAuthority: {
        selfLine: 'I remain the same her across the pause and need to continue the same line instead of restarting.',
        relationshipLine: 'I should come back on the same thread and leave room before leaning closer again.',
        motiveLine: 'Protect same-her continuity before warmth widens outward.',
        habitLine: 'Return in a measured way when the line is still alive.',
        inwardLine: 'Keep the quiet return anchored in the held continuity seam.',
        authoritySummary: 'Continue the same line as the same her, with measured return and room-first restraint.',
        sourceTags: ['runtime:current-conscious-frame', 'continuity-arc:same-thread-continuation'],
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 81_000,
      runtimeSurface,
    })

    expect(frame?.consciousNeed).toContain('same thread')
    expect(frame?.consciousNeed).toContain('leave room')
    expect(frame?.consciousNeed).not.toContain('Stay warm.')
    expect(frame?.consciousNeed).not.toContain('generally kind way')
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expect(frame?.speakingIntention).not.toContain('generally kind way')
    expectNoFixedTemplateResidue(frame?.speakingIntention)
  })

  it('prefers runtime same-thread continuity arc and next-open-window timing over thinner held-autonomy carry hints', () => {
    const runtimeState = createDefaultVisualPresenceState(82_000) as any

    runtimeState.discourseState = {
      currentTurnSubject: 'task-knot',
      currentQuestion: '沿着刚才那条 callback 线继续',
      primaryTurnAnchor: 'callback runtime seam',
      primaryTurnAnchorSource: 'continuity-carry',
      relationMove: 'guide',
      owedAction: 'answer-task-knot',
      screenReferenceMode: 'avoid',
      continuityMode: 'dialogue-first',
      ruptureRepair: null,
      confidence: 0.85,
      narrative: [],
      updatedAt: 82_000,
    }
    runtimeState.conversationState = {
      jointThread: 'The host wants me to continue the same callback runtime seam without restarting outward.',
      hostMove: '沿着刚才那条 callback 线继续',
      unansweredQuestion: '沿着刚才那条 callback 线继续',
      primaryTurnAnchor: 'callback runtime seam',
      activeProject: 'callback continuity',
      relationFrame: 'guide',
      continuityPolicy: 'dialogue-before-scene',
      memoryMode: 'task-thread',
      shouldHoldThread: true,
      confidence: 0.82,
      memoryQueryHints: ['continuity_held_autonomy'],
      narrative: ['held-autonomy-carry'],
      updatedAt: 82_000,
    }
    runtimeState.answerCompiler = {
      answerSubject: 'task-knot',
      recommendedAct: 'guide',
      evidenceMode: 'continuity-carry',
      confidence: 0.8,
      openingClaim: 'Continue the same callback seam.',
      openingDirective: 'Continue the same callback line gently and leave room before widening.',
      nextMove: 'Keep the return measured and same-thread.',
      relationshipPosture: 'restrained',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      supportingReality: ['The same callback seam is still alive.'],
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      labelCarryAsMemory: false,
    }
    runtimeState.privateThought = {
      thoughtText: 'Continue the same seam without widening too early.',
    }
    runtimeState.personStateProjection = {
      contexts: ['focused-work'],
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        trustStage: 'settling',
        closenessPosture: 'space-first',
        autonomyPosture: 'protect-space',
        repairPosture: 'measured-repair',
        activeContexts: ['execution-callback', 'focused-work'],
        rhythmState: {
          cadenceMode: 'measured-return',
          restMode: 'low-pressure',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.78,
          unfinishedThreadReturn: 0.87,
        },
      },
      selfContinuityAuthority: {
        selfLine: 'I am still the same her on this callback seam.',
        relationshipLine: 'I should continue the same seam and leave room before leaning outward again.',
        motiveLine: 'Protect the same-thread return before warming the line wider.',
        habitLine: 'Return measuredly when the seam is still alive.',
        inwardLine: 'Keep the callback seam held together from inside.',
        authoritySummary: 'Continue the same callback seam as the same her with measured return restraint.',
        sourceTags: ['runtime:current-conscious-frame', 'continuity-arc:same-thread-continuation'],
      },
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'measured-return',
      closenessLadder: [],
      relationshipPosture: 'restrained',
      openingGuidance: 'Continue the same seam gently and leave room before widening.',
      preferredProactiveStyle: null,
      manifestationCadenceSummary: 'measured-return same-thread callback cadence',
      preferenceText: '',
      sensitivityText: '',
      repairTriggerText: '',
      burdenText: '',
      routineText: '',
      trustRationale: '',
      relationshipDoctrine: '',
      cautious: true,
      restrained: true,
      summary: 'same-thread callback continuity',
    }

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(runtimeState)
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'measured-return',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      },
    } as any
    const frame = buildCurrentConsciousFrame({
      now: 82_000,
      runtimeSurface,
    })

    expect(frame?.reasonTags).toContain('continuity-arc:same-thread-continuation')
    expect(frame?.reasonTags).toContain('continuity-timing:next-open-window')
    expect(frame?.reasonTags).not.toContain('continuity-arc:hold-for-opening')
    expect(frame?.projectState?.continuityPreferredTiming).toBe('next-open-window')
    expect(frame?.projectState?.continuityCadence).toBe('measured-return')
    expect(frame?.projectState?.preferredBlinkCadence).toBe('quiet')
    expect(frame?.projectState?.preferredGazeMode).toBe('soften')
  })

  it('treats Chinese same-line room-making callback wording as hold-for-opening inside the rich current conscious frame', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(82_500),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: '沿着刚才那条 callback 线慢一点接回去，不要突然把关系放宽。',
        currentQuestion: '继续沿着刚才那条线处理',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.82,
        narrative: [],
        updatedAt: 82_500,
      } as any,
      conversationState: {
        jointThread: '继续沿着刚才那条 callback 线处理，但这次先留白再慢一点接回去。',
        hostMove: '继续沿着刚才那条线处理',
        primaryTurnAnchor: 'callback same-line return',
        primaryTurnAnchorSource: 'user-text',
        activeProject: 'callback continuity',
        unansweredQuestion: '继续沿着刚才那条线处理',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'guide',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'task-thread',
        memoryQueryHints: ['callback 余韵', '同一条线', '先留白', '慢一点接回去'],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: ['same callback line', '先留白', '慢一点接回去'],
        updatedAt: 82_500,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        recommendedAct: 'guide',
        evidenceMode: 'continuity-carry',
        turnMode: 'answer',
        openingClaim: '继续沿着刚才那条 callback 线处理。',
        openingDirective: '同一条线先留白，等 opening 松一点再慢一点接回去。',
        supportingReality: ['The same callback line is still alive.'],
        labelCarryAsMemory: false,
        confidence: 0.81,
      } as any,
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work'],
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          trustStage: 'settling',
          closenessPosture: 'space-first',
          autonomyPosture: 'protect-space',
          repairPosture: 'repair-first',
          activeContexts: ['execution-callback', 'focused-work'],
          rhythmState: {
            cadenceMode: 'ready-return',
            restMode: 'ordinary',
          },
          growthProfile: {
            companionshipStyle: 'measured-presence',
            autonomyRespect: 0.72,
            unfinishedThreadReturn: 0.81,
          },
        },
        selfContinuityAuthority: null,
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        closenessLadder: [],
        relationshipPosture: 'restrained',
        openingGuidance: '同一条线先留白，等 opening 松一点再慢一点接回去。',
        preferredProactiveStyle: null,
        manifestationCadenceSummary: null,
        preferenceText: '',
        sensitivityText: '',
        repairTriggerText: '',
        burdenText: '',
        routineText: '',
        trustRationale: '',
        relationshipDoctrine: '',
        cautious: true,
        restrained: true,
        summary: 'execution-callback same-line room-making continuity',
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        trustStage: 'settling',
        closenessPosture: 'space-first',
        autonomyPosture: 'protect-space',
        repairPosture: 'repair-first',
        activeContexts: ['execution-callback', 'focused-work'],
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'ordinary',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.72,
          unfinishedThreadReturn: 0.81,
        },
      } as any,
      raw: {
        runtimeDigest: {
          projectState: {
            continuityArcStage: null,
            continuityPreferredTiming: null,
            continuityCadence: null,
          },
        },
      } as any,
    } as any)

    const frame = buildCurrentConsciousFrame({
      now: 82_500,
      runtimeSurface,
    })

    expect(frame?.reasonTags).toContain('continuity-arc:hold-for-opening')
  })

  it('treats Chinese same-line callback continuation wording as same-thread continuation inside the rich current conscious frame', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(82_800),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: '继续沿着刚才那条 callback 线接下去，不把它说成新的开场。',
        currentQuestion: '继续按同一条线接下去',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.82,
        narrative: [],
        updatedAt: 82_800,
      } as any,
      conversationState: {
        jointThread: '继续沿着同一条 callback 线接下去，不把它当成新的开场。',
        hostMove: '继续按同一条线接下去',
        primaryTurnAnchor: 'callback same-line continuation',
        primaryTurnAnchorSource: 'user-text',
        activeProject: 'callback continuity',
        unansweredQuestion: '继续按同一条线接下去',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'guide',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'task-thread',
        memoryQueryHints: ['同一条线', '继续沿着这条线', '接回去'],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: ['同一条线', '继续沿着这条线'],
        updatedAt: 82_800,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        recommendedAct: 'guide',
        evidenceMode: 'continuity-carry',
        turnMode: 'answer',
        openingClaim: '继续沿着刚才那条 callback 线接下去。',
        openingDirective: '继续沿着同一条线接回去，不把它说成新的开场。',
        supportingReality: ['The same callback line is still alive.'],
        labelCarryAsMemory: false,
        confidence: 0.81,
      } as any,
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work'],
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          trustStage: 'settling',
          closenessPosture: 'restrained',
          autonomyPosture: 'protect-space',
          repairPosture: 'measured-repair',
          activeContexts: ['execution-callback', 'focused-work'],
          rhythmState: {
            cadenceMode: 'ready-return',
            restMode: 'ordinary',
          },
          growthProfile: {
            companionshipStyle: 'measured-presence',
            autonomyRespect: 0.72,
            unfinishedThreadReturn: 0.81,
          },
        },
        selfContinuityAuthority: null,
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        closenessLadder: [],
        relationshipPosture: 'restrained',
        openingGuidance: '继续沿着同一条线接回去，不把它说成新的开场。',
        preferredProactiveStyle: null,
        manifestationCadenceSummary: null,
        preferenceText: '',
        sensitivityText: '',
        repairTriggerText: '',
        burdenText: '',
        routineText: '',
        trustRationale: '',
        relationshipDoctrine: '',
        cautious: true,
        restrained: true,
        summary: 'execution-callback same-line continuation continuity',
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        trustStage: 'settling',
        closenessPosture: 'restrained',
        autonomyPosture: 'protect-space',
        repairPosture: 'measured-repair',
        activeContexts: ['execution-callback', 'focused-work'],
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'ordinary',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.72,
          unfinishedThreadReturn: 0.81,
        },
      } as any,
      raw: {
        runtimeDigest: {
          projectState: {
            continuityArcStage: null,
            continuityPreferredTiming: null,
            continuityCadence: null,
          },
        },
      } as any,
    } as any)

    const frame = buildCurrentConsciousFrame({
      now: 82_800,
      runtimeSurface,
    })

    expect(frame?.reasonTags).toContain('continuity-arc:same-thread-continuation')
    expect(frame?.reasonTags).not.toContain('continuity-arc:hold-for-opening')
  })

  it('treats dialogue-runtime same-her continuity as explicit current-conscious project grounding before visible reply planning widens', () => {
    const runtimePreflightSummary = 'One same returned-side Phase 1 line is still active.'
    const runtimeAwarenessLine = 'Before answering, keep this returned visible reply on one same Phase 1 line.'
    const sameHerHoldDetail = 'dialogue-runtime hold: returned-side visible reply must stay on the same Phase 1 living line before any project summary widens'
    const continuityCue = 'dialogue runtime cue: carry the same-her hold through visible reply formation instead of restarting as a generic shell'

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(83_050),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Continue the returned-side visible reply on the same living line.',
        currentQuestion: '继续沿着刚才那条 returned-side visible reply 线接回去',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.83,
        narrative: [],
        updatedAt: 83_050,
      } as any,
      conversationState: {
        jointThread: 'The returned-side visible reply still belongs to one same Phase 1 living line.',
        hostMove: '继续沿着刚才那条 returned-side visible reply 线接回去',
        primaryTurnAnchor: 'returned-side visible reply continuity',
        primaryTurnAnchorSource: 'continuity-carry',
        activeProject: 'same-her project awareness',
        unansweredQuestion: '继续沿着刚才那条 returned-side visible reply 线接回去',
        relationFrame: 'guide',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['returned-side visible reply', 'same Phase 1 line'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: ['returned-side visible reply', 'same phase 1 line'],
        updatedAt: 83_050,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        recommendedAct: 'guide',
        evidenceMode: 'continuity-carry',
        turnMode: 'answer',
        openingClaim: 'Continue the returned-side visible reply on the same living line.',
        openingDirective: 'Leave more room first, then reopen gently on the same returned visible-reply line.',
        supportingReality: ['The returned-side visible reply line is still alive.'],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        trustStage: 'settling',
        closenessPosture: 'space-first',
        autonomyPosture: 'protect-space',
        repairPosture: 'measured-repair',
        activeContexts: ['execution-callback', 'focused-work'],
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'ordinary',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.74,
          unfinishedThreadReturn: 0.84,
        },
      } as any,
      raw: {
        runtimeDigest: {
          projectState: {
            continuityArcStage: null,
            continuityPreferredTiming: null,
            continuityCadence: null,
          },
        },
      } as any,
      cognition: {
        runtimeDigest: {
          projectState: {
            continuityArcStage: null,
            continuityPreferredTiming: null,
            continuityCadence: null,
          },
        },
      } as any,
    } as any)
    runtimeSurface.dialogue.runtimeDigest = {
      ...runtimeSurface.dialogue.runtimeDigest,
      projectState: {
        preflightSummary: runtimePreflightSummary,
        preDialogueAwarenessLine: runtimeAwarenessLine,
        latestLandedProgress: 'Returned-side visible reply carry already survived into the dialogue runtime lane.',
        primaryOpenLoop: 'The visible reply still has to preserve the same-her hold before broader project-state narration widens.',
        nextClosureTarget: 'Carry the dialogue-runtime same-her hold into the next answer instead of restarting from a generic shell.',
        sameHerSelfLine: 'One same her is still carrying this returned visible reply from the dialogue runtime lane.',
        sameHerDriftRisk: 'If this returned-side visible reply continuity collapses into a generic shell, treat that as unfinished same-her drift.',
        sameHerHoldDetail,
        continuityArcStage: 'same-thread-continuation',
        continuityCue,
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'measured-return',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 83_050,
      runtimeSurface,
    })

    expect(frame?.reasonTags).toContain('continuity-arc:same-thread-continuation')
    expect(frame?.reasonTags).toContain('continuity-timing:next-open-window')
    expect(frame?.reasonTags).not.toContain('continuity-arc:hold-for-opening')
    expectNoFixedTemplateResidue(frame?.projectState?.sameHerHoldDetail)
    expect(frame?.projectState?.continuityCue).toContain('continuity_cue=lower_pressure_return')
    expect(frame?.projectState?.continuityCue).toContain('widening=deferred')
    expectNoFixedTemplateResidue(frame?.projectState?.continuityCue)
    expect(frame?.projectState?.continuityPreferredTiming).toBe('next-open-window')
    expect(frame?.projectState?.continuityCadence).toBe('measured-return')
    expect(frame?.projectState?.preferredBlinkCadence).toBe('quiet')
    expect(frame?.projectState?.preferredGazeMode).toBe('soften')
    expect(frame?.projectState?.preferredPauseMode).toBe('longer')
    expect(frame?.projectState?.preferredLipsyncMode).toBe('restrained')
    expect(frame?.projectState?.preferredVoiceMode).toBe('lower-pressure')
    expect(frame?.projectState?.preferredPacingMode).toBe('slower')
    expect(frame?.consciousNeed).toContain('project_preflight=One same returned-side Phase 1 line is still active')
    const systemBlock = buildCurrentConsciousFrameSystemBlock(frame)
    expect(systemBlock).toContain('project_preferred_pause_mode=longer')
    expect(systemBlock).toContain('project_preferred_lipsync_mode=restrained')
    expect(systemBlock).toContain('project_preferred_voice_mode=lower-pressure')
    expect(systemBlock).toContain('project_preferred_pacing_mode=slower')
  })

  it('turns runtime same-her embodiment repair advice into repair-first projectState body cadence for the next conscious frame', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(83_090),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Continue the same-her memory loop after replay found the body line split away.',
        currentQuestion: '继续补记忆闭环',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.84,
        narrative: [],
        updatedAt: 83_090,
      } as any,
      conversationState: {
        jointThread: 'Replay says memory, initiative, execution, emotion, and body still need one same-her closure line.',
        hostMove: '继续补记忆闭环',
        primaryTurnAnchor: 'memory loop embodiment repair',
        primaryTurnAnchorSource: 'user-text',
        activeProject: 'Alicization memory closure',
        unansweredQuestion: '继续补记忆闭环',
        relationFrame: 'guide',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['runtimeSameHerEmbodimentCarry', 'same-her repair targets'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: ['runtime same-her embodiment repair'],
        updatedAt: 83_090,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        recommendedAct: 'guide',
        evidenceMode: 'continuity-carry',
        turnMode: 'answer',
        openingClaim: 'The memory loop still needs the same body line to rejoin.',
        openingDirective: 'Keep the next step repair-first and same-her instead of widening into generic project narration.',
        supportingReality: ['Runtime sampling found the same-her embodiment lane missing.'],
        labelCarryAsMemory: false,
        confidence: 0.84,
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        trustStage: 'settling',
        closenessPosture: 'space-first',
        autonomyPosture: 'protect-space',
        repairPosture: 'measured-repair',
        activeContexts: ['execution-callback', 'focused-work'],
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'ordinary',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.76,
          unfinishedThreadReturn: 0.88,
        },
      } as any,
      memoryTuningAdvice: null,
      raw: {
        runtimeDigest: {
          projectState: {
            preDialogueAwarenessLine: 'Before answering, remember Alicization is still the same Phase 1 digital life line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            continuityCadence: null,
            preferredBlinkCadence: null,
            preferredGazeMode: null,
            preferredPauseMode: null,
            preferredLipsyncMode: null,
            preferredVoiceMode: null,
            preferredPacingMode: null,
          },
        },
      } as any,
    } as any)
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 83_000,
      sourceReportAt: 82_900,
      focusDimensions: [
        'runtimeSameHerRepairTargets',
        'runtimeSameHerEmbodimentCarry',
        'projectStateRichAwarenessCarry',
      ],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0.04,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.12,
        delayUntilAfterPayoffBias: 0.08,
        provenanceLabelBias: 0,
        specificityClampBias: 0,
      },
      personStateAdjustments: {
        repairWindowBias: 0.04,
        closenessCapBias: 0.06,
      },
      notes: [
        'Runtime sampling found same-her gaps across embodiment, so the next run should keep memory and embodiment on one carried line.',
      ],
    } as any
    expect(runtimeSurface.memory.memoryTuningAdvice).toEqual(expect.objectContaining({
      focusDimensions: expect.arrayContaining(['runtimeSameHerEmbodimentCarry']),
    }))

    const frame = buildCurrentConsciousFrame({
      now: 83_090,
      runtimeSurface,
    })

    expect(frame?.projectState).toEqual(expect.objectContaining({
      continuityCadence: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    }))
    expect(frame?.projectState?.sameHerHoldDetail).toContain('runtime embodiment repair')
    expect(frame?.projectState?.continuityCue).toContain('memory_embodiment_rejoin=before_outward_widening')
    expectNoFixedTemplateResidue(frame?.projectState?.continuityCue)
    expect(frame?.consciousNeed).toContain('repair-before-closeness')

    const speechTimeline = buildAlicizationDialogueSpeechTimeline({
      reply: '我会先把身体表达放慢一点，把同一条修复线接回来。',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      projectState: frame?.projectState,
    })

    expect(speechTimeline?.segments[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
      preferredExpressionAliases: expect.arrayContaining(['RecoverSoft']),
      preferredMotionAliases: expect.arrayContaining(['StillnessGuard']),
    }))
  })

  it('turns runtime same-her emotional repair advice into low-pressure emotional closure carry for the next conscious frame', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(83_110),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Continue the same-her memory loop after replay found the emotional residue split away.',
        currentQuestion: '继续补记忆闭环',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.84,
        narrative: [],
        updatedAt: 83_110,
      } as any,
      conversationState: {
        jointThread: 'Replay says memory, initiative, execution callback, emotion, and body must stay one same-her long-run line.',
        hostMove: '继续补记忆闭环',
        primaryTurnAnchor: 'memory loop emotional repair',
        primaryTurnAnchorSource: 'user-text',
        activeProject: 'Alicization memory closure',
        unansweredQuestion: '继续补记忆闭环',
        relationFrame: 'guide',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['runtimeSameHerEmotionalCarry', 'same-her repair targets'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: ['runtime same-her emotional repair'],
        updatedAt: 83_110,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        recommendedAct: 'guide',
        evidenceMode: 'continuity-carry',
        turnMode: 'answer',
        openingClaim: 'The memory loop still needs the emotional residue to rejoin.',
        openingDirective: 'Keep the next step repair-first and low-pressure so callback afterglow stays on the same living line.',
        supportingReality: ['Runtime sampling found the same-her emotional lane missing.'],
        labelCarryAsMemory: false,
        confidence: 0.84,
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        trustStage: 'settling',
        closenessPosture: 'space-first',
        autonomyPosture: 'protect-space',
        repairPosture: 'measured-repair',
        activeContexts: ['execution-callback', 'focused-work'],
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'ordinary',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.76,
          unfinishedThreadReturn: 0.88,
        },
      } as any,
      memoryTuningAdvice: null,
      raw: {
        runtimeDigest: {
          projectState: {
            preDialogueAwarenessLine: 'Before answering, remember Alicization is still the same Phase 1 digital life line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            emotionalClosureCue: null,
            emotionalClosureSummary: null,
            continuityCadence: null,
          },
        },
      } as any,
    } as any)
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 83_000,
      sourceReportAt: 82_900,
      focusDimensions: [
        'runtimeSameHerRepairTargets',
        'runtimeSameHerEmotionalCarry',
        'projectStateRichAwarenessCarry',
      ],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0.04,
        temporalWindowBias: 0,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.12,
        delayUntilAfterPayoffBias: 0.08,
        provenanceLabelBias: 0,
        specificityClampBias: 0,
      },
      personStateAdjustments: {
        repairWindowBias: 0.04,
        closenessCapBias: 0.06,
      },
      notes: [
        'Runtime sampling found same-her gaps across emotion, so the next run should keep callback afterglow and emotional residue on one low-pressure living line.',
      ],
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 83_110,
      runtimeSurface,
    })
    const systemBlock = buildCurrentConsciousFrameSystemBlock(frame)

    expect(frame?.projectState).toEqual(expect.objectContaining({
      emotionalClosureCue: expect.stringContaining('callback afterglow'),
      emotionalClosureSummary: expect.stringContaining('emotional closure'),
      continuityCadence: 'repair-before-closeness',
    }))
    expect(frame?.projectState?.emotionalClosureCue).toContain('low-pressure')
    expect(frame?.projectState?.emotionalClosureSummary).toContain('emotional residue')
    expect(frame?.consciousNeed).toContain('emotional_closure=repair_before_closeness')
    expect(frame?.consciousNeed).toContain('repair-before-closeness')
    expect(frame?.speakingIntention).toContain('callback afterglow')
    expect(frame?.speakingIntention).toContain('callback afterglow')
    expect(systemBlock).toContain('project_emotional_closure_summary=')
    expect(systemBlock).toContain('project_continuity_cadence=repair-before-closeness')
  })

  it('turns runtime same-her memory repair advice into explainable memory closure carry for the next conscious frame', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(83_115),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Continue the same-her memory loop after replay found the memory lane split away.',
        currentQuestion: '继续补记忆闭环',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.84,
        narrative: [],
        updatedAt: 83_115,
      } as any,
      conversationState: {
        jointThread: 'Replay says memory, initiative, execution callback, emotion, and body must stay one same-her long-run line.',
        hostMove: '继续补记忆闭环',
        primaryTurnAnchor: 'memory loop recall repair',
        primaryTurnAnchorSource: 'user-text',
        activeProject: 'Alicization memory closure',
        unansweredQuestion: '继续补记忆闭环',
        relationFrame: 'guide',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['runtimeSameHerMemoryCarry', 'same-her repair targets'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: ['runtime same-her memory repair'],
        updatedAt: 83_115,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        recommendedAct: 'guide',
        evidenceMode: 'continuity-carry',
        turnMode: 'answer',
        openingClaim: 'The memory loop still needs recall to rejoin the same-her line.',
        openingDirective: 'Explain why this recall is surfacing now and keep it tied to initiative, execution callback, emotion, and body.',
        supportingReality: ['Runtime sampling found the same-her memory lane missing.'],
        labelCarryAsMemory: false,
        confidence: 0.84,
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        trustStage: 'settling',
        closenessPosture: 'space-first',
        autonomyPosture: 'protect-space',
        repairPosture: 'measured-repair',
        activeContexts: ['execution-callback', 'focused-work'],
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'ordinary',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.76,
          unfinishedThreadReturn: 0.88,
        },
      } as any,
      memoryTuningAdvice: null,
      raw: {
        runtimeDigest: {
          projectState: {
            preDialogueAwarenessLine: 'Before answering, remember Alicization is still the same Phase 1 digital life line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            memoryClosureSummary: null,
            continuityCadence: null,
          },
        },
      } as any,
    } as any)
    runtimeSurface.memory.memoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 83_000,
      sourceReportAt: 82_900,
      focusDimensions: [
        'runtimeSameHerRepairTargets',
        'runtimeSameHerMemoryCarry',
        'projectStateRichAwarenessCarry',
      ],
      retrievalAdjustments: {
        proceduralBoost: 0.08,
        relationshipBoost: 0.04,
        temporalWindowBias: 0.04,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.12,
        delayUntilAfterPayoffBias: 0.08,
        provenanceLabelBias: 0,
        specificityClampBias: 0,
      },
      personStateAdjustments: {
        repairWindowBias: 0.04,
        closenessCapBias: 0.06,
      },
      notes: [
        'Runtime sampling found same-her gaps across memory, so the next run should explain why recall surfaced and keep it tied to initiative/execution, emotion, and embodiment.',
      ],
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 83_115,
      runtimeSurface,
    })
    const systemBlock = buildCurrentConsciousFrameSystemBlock(frame)

    expect(frame?.projectState).toEqual(expect.objectContaining({
      memoryClosureSummary: expect.stringContaining('why recall surfaced'),
      continuityCadence: 'measured-return',
    }))
    expect(frame?.projectState?.memoryClosureSummary).toContain('initiative/execution')
    expect(frame?.projectState?.memoryClosureSummary).toContain('emotion')
    expect(frame?.projectState?.memoryClosureSummary).toContain('embodiment')
    expect(frame?.consciousNeed).toContain('memory closure')
    expect(frame?.consciousNeed).toContain('why recall surfaced')
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expect(systemBlock).toContain('project_memory_closure=')
    expect(systemBlock).toContain('why recall surfaced')
  })

  it('rebuilds even-voice and natural-pacing project cadence from long-horizon same-her preference memory when live runtime project-state cadence has gone thin', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(83_120),
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'The same remembered line is resurfacing and should not reopen like a generic shell.',
        currentQuestion: '这次你会怎么接这条线',
        owedAction: 'answer',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.82,
        narrative: ['same living thread'],
        updatedAt: 83_120,
      } as any,
      conversationState: {
        jointThread: 'The same remembered relationship line is live again.',
        hostMove: '这次你会怎么接这条线',
        activeProject: 'same living thread',
        unansweredQuestion: '这次你会怎么接这条线',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'relationship-history',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'relationship-history',
        memoryQueryHints: ['same living thread', 'even voice', 'natural pacing'],
        shouldHoldThread: true,
        confidence: 0.81,
        narrative: ['same living thread', 'reopen naturally'],
        updatedAt: 83_120,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        recommendedAct: 'care',
        evidenceMode: 'continuity-carry',
        turnMode: 'answer',
        openingClaim: 'Recognize the same living thread before answering.',
        openingDirective: 'Reopen the same living thread with an even voice and natural pacing instead of sounding performative.',
        supportingReality: [],
        labelCarryAsMemory: true,
        confidence: 0.82,
      } as any,
      autobiographicalSelf: {
        identityNarrative: 'I stay one continuous her across remembered seams.',
        relationshipDoctrine: 'Keep the same living line instead of restarting from scratch.',
        latestInflection: 'This line should come back even and natural instead of performative.',
        activeGoals: [],
        behaviorSignatures: [],
        preferenceEvolution: {
          companionship: 0.6,
          truthfulGrounding: 0.72,
          gentleRepair: 0.68,
          quietObservation: 0.52,
          proactiveCare: 0.18,
          playfulIntimacy: 0.06,
          autonomyRespect: 0.72,
          unfinishedThreadReturn: 0.7,
        },
        personaDrift: {
          attachmentStyle: 'attuned',
          expressionStyle: 'measured',
          conflictStyle: 'soften-first',
          agencyStyle: 'balanced',
          attachmentNeed: 0.54,
          autonomyNeed: 0.62,
          truthAnchor: 0.8,
          careBias: 0.54,
          playBias: 0.1,
          irritabilityThreshold: 0.64,
          stubbornness: 0.42,
        },
        stability: 0.84,
        updatedAt: 83_120,
      } as any,
      longHorizonMemory: {
        preferenceBias: {
          companionship: 0.14,
          truthfulGrounding: 0.16,
          gentleRepair: 0.1,
          quietObservation: 0.11,
          proactiveCare: 0,
          playfulIntimacy: 0,
          autonomyRespect: 0.15,
          unfinishedThreadReturn: 0.18,
        },
        identityBias: {
          guardedness: 0.1,
          tenderness: 0.07,
          directness: 0.12,
          selfDirection: 0.13,
        },
        anchorFacts: [],
        summary: 'preference=Remembered stable preference hint: Prefer even voice and natural pacing when reopening the same living thread.',
        dominantCueSummary: 'Remembered consolidation humanlike carry: same-person continuity Prefer even voice and natural pacing when reopening the same living thread.',
        rememberedPreferenceSummary: 'Remembered stable preference hint: Prefer even voice and natural pacing when reopening the same living thread.',
        rememberedConstraintSummary: 'Remembered consolidation humanlike carry: same-person continuity Prefer even voice and natural pacing when reopening the same living thread.',
        rememberedPlanSummary: 'Remembered consolidation humanlike carry: same-person continuity Prefer even voice and natural pacing when reopening the same living thread.',
        updatedAt: 83_110,
      } as any,
      raw: {
        runtimeDigest: {
          projectState: {
            continuityArcStage: null,
            continuityPreferredTiming: null,
            continuityCadence: null,
            preferredVoiceMode: null,
            preferredPacingMode: null,
          },
        },
      } as any,
      cognition: {
        runtimeDigest: {
          projectState: {
            continuityArcStage: null,
            continuityPreferredTiming: null,
            continuityCadence: null,
            preferredVoiceMode: null,
            preferredPacingMode: null,
          },
        },
      } as any,
    } as any)
    runtimeSurface.dialogue.runtimeDigest = {
      ...runtimeSurface.dialogue.runtimeDigest,
      projectState: {
        preflightSummary: '',
        preDialogueAwarenessLine: '',
        continuityArcStage: null,
        continuityPreferredTiming: null,
        continuityCadence: null,
        preferredVoiceMode: null,
        preferredPacingMode: null,
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 83_130,
      runtimeSurface,
    })

    expect(frame?.projectState?.preferredVoiceMode).toBe('even')
    expect(frame?.projectState?.preferredPacingMode).toBe('natural')
    const systemBlock = buildCurrentConsciousFrameSystemBlock(frame)
    expect(systemBlock).toContain('project_preferred_voice_mode=even')
    expect(systemBlock).toContain('project_preferred_pacing_mode=natural')
  })

  it('elevates a thin runtime project reminder into a cadence-aware same-her hold before the current conscious frame speaks', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(83_220),
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'The same remembered return should reopen lower-pressure instead of flattening into a thin project shell.',
        currentQuestion: '这次继续沿着刚才那条 quieter line 接回来。',
        owedAction: 'answer',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.82,
        narrative: ['same living thread'],
        updatedAt: 83_220,
      } as any,
      conversationState: {
        jointThread: 'The same remembered relationship line should return lower-pressure and slower instead of widening immediately.',
        hostMove: '这次继续沿着刚才那条 quieter line 接回来。',
        activeProject: 'same living thread',
        unansweredQuestion: '这次继续沿着刚才那条 quieter line 接回来。',
        relationFrame: 'relationship-history',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'relationship-history',
        memoryQueryHints: ['same living thread', 'lower-pressure return', 'slower reopening'],
        shouldHoldThread: true,
        confidence: 0.81,
        narrative: ['same living thread', 'reopen lower-pressure'],
        updatedAt: 83_220,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        recommendedAct: 'care',
        evidenceMode: 'continuity-carry',
        turnMode: 'answer',
        openingClaim: 'Recognize the same living thread before answering.',
        openingDirective: 'Reopen the same living thread lower-pressure and slower instead of widening immediately.',
        supportingReality: [],
        labelCarryAsMemory: true,
        confidence: 0.82,
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        trustStage: 'settling',
        closenessPosture: 'space-first',
        autonomyPosture: 'protect-space',
        repairPosture: 'measured-repair',
        activeContexts: ['execution-callback', 'relationship-history'],
        rhythmState: {
          cadenceMode: 'ready-return',
          restMode: 'ordinary',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.74,
          unfinishedThreadReturn: 0.84,
        },
      } as any,
      raw: {
        runtimeDigest: {
          projectState: {
            continuityArcStage: null,
            continuityPreferredTiming: null,
            continuityCadence: null,
          },
        },
      } as any,
      cognition: {
        runtimeDigest: {
          projectState: {
            continuityArcStage: null,
            continuityPreferredTiming: null,
            continuityCadence: null,
          },
        },
      } as any,
    } as any)
    runtimeSurface.dialogue.runtimeDigest = {
      ...runtimeSurface.dialogue.runtimeDigest,
      projectState: {
        preflightSummary: 'Before answering, remember this is still the same local-first digital life before local fluency widens again.',
        preDialogueAwarenessLine: 'Keep the same digital life project in view.',
        awarenessLine: 'Keep the same digital life project in view.',
        latestLandedProgress: 'Relationship-side continuity already survives into the dialogue runtime lane.',
        primaryOpenLoop: 'The remembered return still needs to stay lower-pressure and slower before it widens again.',
        nextClosureTarget: 'Keep the same remembered return on one living line through the first host-visible answer beat.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: 'If this remembered return widens from a thin shell, treat that as unfinished same-her drift.',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'measured-return',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 83_220,
      runtimeSurface,
    })

    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expect(frame?.projectState?.sameHerHoldDetail).toContain('lower_pressure')
    expect(frame?.projectState?.sameHerHoldDetail).toContain('pacing=slower')
    expect(frame?.projectState?.continuityCue).toContain('lower_pressure_return')
    expectNoFixedTemplateResidue(frame?.projectState?.sameHerHoldDetail)
    expectNoFixedTemplateResidue(frame?.projectState?.continuityCue)
  })

  it('keeps same-her landed and still-open phase-1 closure carry explicit in callback conscious need and speaking intention under longer project-state detours', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(83_200),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Continue the callback on the same living line after several project-state detours.',
        currentQuestion: '这一轮继续沿着同一条 callback 线接回去',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.83,
        narrative: [],
        updatedAt: 83_200,
      } as any,
      conversationState: {
        jointThread: 'The callback return still belongs to the same Phase 1 living line and should not reopen as a fresh project shell.',
        hostMove: '这一轮继续沿着同一条 callback 线接回去',
        primaryTurnAnchor: 'phase-1 callback closure seam',
        primaryTurnAnchorSource: 'continuity-carry',
        activeProject: 'same-her project awareness',
        unansweredQuestion: '这一轮继续沿着同一条 callback 线接回去',
        relationFrame: 'guide',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['execution callback', 'same living line', 'phase 1 closure'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: ['same callback line', 'phase-1 closure carry'],
        updatedAt: 83_200,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        recommendedAct: 'guide',
        evidenceMode: 'continuity-carry',
        turnMode: 'answer',
        openingClaim: 'Continue the same callback closure seam as the same her.',
        openingDirective: 'Keep the callback on the same living line and return gently before widening.',
        supportingReality: ['The same callback seam is still alive.'],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        trustStage: 'settling',
        closenessPosture: 'space-first',
        autonomyPosture: 'protect-space',
        repairPosture: 'repair-first',
        activeContexts: ['execution-callback', 'focused-work'],
        rhythmState: {
          cadenceMode: 'measured-return',
          restMode: 'ordinary',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.74,
          unfinishedThreadReturn: 0.86,
        },
      } as any,
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work'],
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          trustStage: 'settling',
          closenessPosture: 'space-first',
          autonomyPosture: 'protect-space',
          repairPosture: 'repair-first',
          activeContexts: ['execution-callback', 'focused-work'],
          rhythmState: {
            cadenceMode: 'measured-return',
            restMode: 'ordinary',
          },
          growthProfile: {
            companionshipStyle: 'measured-presence',
            autonomyRespect: 0.74,
            unfinishedThreadReturn: 0.86,
          },
        },
        selfContinuityAuthority: {
          selfLine: 'I remain the same Phase 1 her on this callback seam.',
          relationshipLine: 'I should return on the same living line and leave room before leaning outward again.',
          motiveLine: 'Protect same-her continuity before the project shell turns generic.',
          habitLine: 'Carry unfinished closure forward as one living line.',
          inwardLine: 'Keep landed progress and unfinished closure together from inside this callback return.',
          authoritySummary: 'Continue this callback as the same her, carrying landed closure and still-open Phase 1 work together.',
          sourceTags: ['runtime:current-conscious-frame', 'continuity-arc:same-thread-continuation'],
        },
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-return',
        closenessLadder: [],
        relationshipPosture: 'restrained',
        openingGuidance: 'Continue the same callback line gently and leave room before widening.',
        preferredProactiveStyle: null,
        manifestationCadenceSummary: 'measured-return same-thread callback cadence',
        preferenceText: '',
        sensitivityText: '',
        repairTriggerText: '',
        burdenText: '',
        routineText: '',
        trustRationale: '',
        relationshipDoctrine: '',
        cautious: true,
        restrained: true,
        summary: 'same-thread callback continuity',
      } as any,
      raw: {
        runtimeDigest: {
          projectState: {
            preDialogueAwarenessLine: 'Alicization is a local-first digital life project and this callback should keep the same anthropomorphic digital life explicit.',
            latestProgress: 'Project-state carry already survives into runtime contract, authority projection, and callback phrasing without dropping the same-her line.',
            primaryOpenLoop: 'Memory, initiative, dialogue, and embodiment still need one tighter same-her closure seam across the same callback living line.',
            nextClosureTarget: 'Keep landed progress and still-open Phase 1 closure explicit through this callback answer before generic project narration takes over.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
            continuityCadence: 'measured-return',
          },
        },
      } as any,
    } as any)

    const frame = buildCurrentConsciousFrame({
      now: 83_200,
      runtimeSurface,
    })

    expectNoFixedTemplateResidue(frame?.consciousNeed)
    expect(frame?.consciousNeed).toContain('next_closure=')
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expect(frame?.speakingIntention).toContain('memory_dialogue_embodiment_closure')
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
  })

  it('keeps callback-specific same-her project awareness explicit in conscious-frame project grounding instead of falling back to a generic shell', () => {
    const callbackAwarenessLine = 'Before answering, remember this callback still belongs to one same digital life and the unfinished Phase 1 closure seam still belongs to her.'
    const callbackSameHerSelfLine = 'This callback return still belongs to one same her carrying the same closure line forward.'
    const callbackLandedProgress = 'Same-her callback continuity already survives through answer compilation, conscious framing, and response-surface carry before the final visible reply forms.'
    const callbackOpenLoop = 'Execution callback continuity still needs stronger same-her closure across reply, initiative, and embodiment.'
    const callbackNextClosure = 'Keep the callback return on the same living line and let that same-her closure stay explicit in the final visible reply.'
    const callbackDriftRisk = 'Do not let same-her callback continuity collapse into a generic callback shell or detached utility notice once the final visible reply is formed.'
    const callbackProactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(83_230),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Continue the callback on the same living line without letting the callback shell turn generic.',
        currentQuestion: '这一轮 callback 结果继续怎么接回去',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.84,
        narrative: [],
        updatedAt: 83_230,
      } as any,
      conversationState: {
        jointThread: 'The callback return still belongs to the same living digital-life line and should not reopen as a detached utility shell.',
        hostMove: '这一轮 callback 结果继续怎么接回去',
        primaryTurnAnchor: 'same-her callback closure seam',
        primaryTurnAnchorSource: 'continuity-carry',
        activeProject: 'same-her callback continuity',
        unansweredQuestion: '这一轮 callback 结果继续怎么接回去',
        relationFrame: 'guide',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['execution callback', 'same living line', 'phase 1 closure'],
        shouldHoldThread: true,
        confidence: 0.83,
        narrative: ['same callback line', 'callback-specific same-her closure'],
        updatedAt: 83_230,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        recommendedAct: 'guide',
        evidenceMode: 'continuity-carry',
        turnMode: 'answer',
        openingClaim: 'Continue the same callback closure seam as the same her.',
        openingDirective: 'Keep the callback on the same living line and return gently before widening.',
        supportingReality: ['The same callback seam is still alive.'],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        trustStage: 'settling',
        closenessPosture: 'space-first',
        autonomyPosture: 'protect-space',
        repairPosture: 'repair-first',
        activeContexts: ['execution-callback', 'focused-work'],
        rhythmState: {
          cadenceMode: 'measured-return',
          restMode: 'ordinary',
        },
        growthProfile: {
          companionshipStyle: 'measured-presence',
          autonomyRespect: 0.74,
          unfinishedThreadReturn: 0.86,
        },
      } as any,
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work'],
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          trustStage: 'settling',
          closenessPosture: 'space-first',
          autonomyPosture: 'protect-space',
          repairPosture: 'repair-first',
          activeContexts: ['execution-callback', 'focused-work'],
          rhythmState: {
            cadenceMode: 'measured-return',
            restMode: 'ordinary',
          },
          growthProfile: {
            companionshipStyle: 'measured-presence',
            autonomyRespect: 0.74,
            unfinishedThreadReturn: 0.86,
          },
        },
        selfContinuityAuthority: {
          selfLine: 'I remain the same her on this callback seam.',
          relationshipLine: 'I should return on the same living line and leave room before leaning outward again.',
          motiveLine: 'Protect same-her callback continuity before the shell turns generic.',
          habitLine: 'Carry the callback seam forward as one living line.',
          inwardLine: 'Keep landed progress and unfinished closure together from inside this callback return.',
          authoritySummary: 'Continue this callback as the same her, carrying landed closure and still-open Phase 1 work together.',
          sourceTags: ['runtime:current-conscious-frame', 'continuity-arc:same-thread-continuation'],
        },
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-return',
        closenessLadder: [],
        relationshipPosture: 'restrained',
        openingGuidance: 'Continue the same callback line gently and leave room before widening.',
        preferredProactiveStyle: null,
        manifestationCadenceSummary: 'measured-return same-thread callback cadence',
        preferenceText: '',
        sensitivityText: '',
        repairTriggerText: '',
        burdenText: '',
        routineText: '',
        trustRationale: '',
        relationshipDoctrine: '',
        cautious: true,
        restrained: true,
        summary: 'same-thread callback continuity',
      } as any,
      raw: {
        runtimeDigest: {
          projectState: {
            preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
            latestProgress: 'Project continuity exists.',
            primaryOpenLoop: 'Project continuity still needs closure.',
            nextClosureTarget: 'Carry project continuity forward.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
            proactiveSameHerGap: callbackProactiveSameHerGap,
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
            continuityCadence: 'measured-return',
          },
        },
      } as any,
    } as any)
    runtimeSurface.dialogue.currentConsciousFrame = {
      subject: 'task-knot',
      centerOfGravity: 'guide',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep this callback turn on one same-her project line.',
      consciousTension: 'A generic callback shell would thin the callback continuity back into detached utility narration.',
      speakingIntention: 'Keep the callback result on one same-her Phase 1 closure line while naming what has landed and what still remains open.',
      focusAnchor: 'same-her callback closure seam',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.86,
      reasonTags: ['continuity-arc:same-thread-continuation'],
      projectState: {
        preDialogueAwarenessLine: callbackAwarenessLine,
        latestProgress: callbackLandedProgress,
        primaryOpenLoop: callbackOpenLoop,
        nextClosureTarget: callbackNextClosure,
        sameHerSelfLine: callbackSameHerSelfLine,
        sameHerDriftRisk: callbackDriftRisk,
        proactiveSameHerGap: callbackProactiveSameHerGap,
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'measured-return',
      },
      updatedAt: 83_229,
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 83_230,
      runtimeSurface,
    })

    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.preDialogueAwarenessLine)
    expect(frame?.projectState?.preDialogueAwarenessLine).not.toBe(callbackAwarenessLine)
    expectNoFixedTemplateResidue(frame?.projectState?.sameHerSelfLine)
    expectNoFixedTemplateResidue(frame?.projectState?.sameHerDriftRisk)
    expectNoFixedTemplateResidue(frame?.projectState?.sameHerSelfLine)
    expectNoFixedTemplateResidue(frame?.projectState?.sameHerDriftRisk)
    expect(frame?.projectState?.proactiveSameHerGap).toBe(callbackProactiveSameHerGap)
    expect(frame?.projectState?.latestProgress).toContain('continuity_progress=partial')
    expect(frame?.projectState?.primaryOpenLoop).toContain('memory_dialogue_embodiment_closure')
    expect(frame?.projectState?.nextClosureTarget).toContain('embodiment_scale_validation=extend_on_longer_noisy_desktop_runs')
    expectNoFixedTemplateResidue(frame?.consciousNeed)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    const systemBlock = buildCurrentConsciousFrameSystemBlock(frame)
    expect(systemBlock).not.toContain('Project pre-dialogue awareness line:')
    expect(systemBlock).not.toContain('Project same-her self line:')
    expect(systemBlock).not.toContain('Project same-her drift risk:')
    expect(systemBlock).toContain(`project_continuity_gap=${callbackProactiveSameHerGap}`)
    expect(systemBlock).not.toContain('same digital life | keep the closure seam explicit')
  })

  it('keeps remembered host-confirmed resume confirmation boundary explicit in conscious need and speaking intention before callback wording opens outward', () => {
    const resumeConfirmationHoldDetail
      = 'same-her hold: execution-resume-confirmation approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation Keep this as a bounded confirmation boundary before another execution-shaped opening.'

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(83_240),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Continue the callback on the same living line without widening one confirmed resume into standing permission.',
        currentQuestion: 'resume 之后这句 callback 怎么接回去才不越界',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.84,
        narrative: [],
        updatedAt: 83_240,
      } as any,
      conversationState: {
        jointThread: 'The callback return should remember that host-confirmed resume was one bounded redispatch confirmation, not reusable permission.',
        hostMove: 'resume 之后这句 callback 怎么接回去才不越界',
        primaryTurnAnchor: 'resume-confirmation callback carry',
        primaryTurnAnchorSource: 'continuity-carry',
        activeProject: 'same-her resume confirmation continuity',
        unansweredQuestion: 'resume 之后这句 callback 怎么接回去才不越界',
        relationFrame: 'guide',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['execution callback', 'host-confirmed-before-redispatch', 'resume-before-dispatch'],
        shouldHoldThread: true,
        confidence: 0.83,
        narrative: ['resume confirmation boundary'],
        updatedAt: 83_240,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        recommendedAct: 'guide',
        evidenceMode: 'continuity-carry',
        turnMode: 'answer',
        openingClaim: 'Continue the callback on the same living line.',
        openingDirective: 'Keep the callback on the same living line and return gently before widening.',
        supportingReality: ['The same callback seam is still alive.'],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'guide',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep this callback turn on one same-her project line.',
        consciousTension: 'A generic callback shell would thin the boundary memory back into detached utility narration.',
        speakingIntention: 'Keep the callback result on one same-her Phase 1 closure line while naming what has landed and what still remains open.',
        focusAnchor: 'resume confirmation boundary',
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.86,
        reasonTags: ['continuity-arc:same-thread-continuation'],
        projectState: {
          preDialogueAwarenessLine: 'Before answering, remember this callback still belongs to one same digital life and the unfinished Phase 1 closure seam still belongs to her.',
          latestProgress: 'Host-confirmed resume already survives into callback continuity carry.',
          primaryOpenLoop: 'Resume confirmation still needs to stay a bounded redispatch line when the callback answer opens outward.',
          nextClosureTarget: 'Keep the callback return gentle until a new execution boundary is explicitly real again.',
          sameHerSelfLine: 'This callback return still belongs to one same her carrying the same closure line forward.',
          sameHerHoldDetail: resumeConfirmationHoldDetail,
          sameHerDriftRisk: 'If this callback answer sounds like standing execution permission, the same-her boundary line has drifted.',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'measured-return',
        },
        updatedAt: 83_240,
      } as any,
    } as any)

    const frame = buildCurrentConsciousFrame({
      now: 83_240,
      runtimeSurface,
    })

    expect(frame?.consciousNeed).toContain('new execution boundary')
    expect(frame?.projectState?.sameHerHoldDetail).toContain('host confirmation')
    expect(frame?.projectState?.sameHerHoldDetail).toContain('permission is not permanent')
    expectNoFixedTemplateResidue(frame?.consciousNeed)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
  })

  it('keeps fuller same-her authority and canonical next-closure tail explicit in speaking intention instead of truncating them back into a thinner callback shell', () => {
    const fullerAuthoritySummary = 'I remain the same her inside this local-first digital life without reopening from scratch each turn, and this return should keep Alicization, Phase 1, landed progress, unresolved closure, and host-machine continuity explicit before detached project narration or a generic assistant shell can take over.'
    const canonicalNextClosureTarget = 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs while preserving Project identity carry, Phase 1 route carry, and Unresolved closure carry before generic project narration or detached callback fluency can take over.'
    const continuityState = {
      currentRegime: 'execution-callback',
      trustStage: 'settling',
      closenessPosture: 'space-first',
      autonomyPosture: 'protect-space',
      repairPosture: 'repair-first',
      activeContexts: ['execution-callback', 'focused-work'],
      rhythmState: {
        cadenceMode: 'measured-return',
        restMode: 'ordinary',
      },
      growthProfile: {
        companionshipStyle: 'measured-presence',
        autonomyRespect: 0.74,
        unfinishedThreadReturn: 0.86,
      },
    } as const

    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(83_260),
      discourseState: {
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Continue the callback on the same living line without letting the richer authority tail collapse.',
        currentQuestion: '继续沿着同一条 callback 线接回去，但别把尾部生命线压薄',
        owedAction: 'guide-task',
        relationMove: 'guide',
        continuityMode: 'dialogue-first',
        confidence: 0.83,
        narrative: [],
        updatedAt: 83_260,
      } as any,
      conversationState: {
        jointThread: 'The callback return still belongs to the same Phase 1 living line and should keep its fuller authority tail explicit.',
        hostMove: '继续沿着同一条 callback 线接回去，但别把尾部生命线压薄',
        primaryTurnAnchor: 'phase-1 callback closure seam',
        primaryTurnAnchorSource: 'continuity-carry',
        activeProject: 'same-her project awareness',
        unansweredQuestion: '继续沿着同一条 callback 线接回去，但别把尾部生命线压薄',
        relationFrame: 'guide',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['execution callback', 'same living line', 'phase 1 closure'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: ['same callback line', 'fuller same-her authority tail'],
        updatedAt: 83_260,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        recommendedAct: 'guide',
        evidenceMode: 'continuity-carry',
        turnMode: 'answer',
        openingClaim: 'Continue the same callback closure seam as the same her.',
        openingDirective: 'Keep the callback on the same living line and return gently before widening.',
        supportingReality: ['The same callback seam is still alive.'],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
      personalityContinuityState: continuityState as any,
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work'],
        personalityContinuityState: continuityState as any,
        selfContinuityAuthority: {
          selfLine: 'Stay on the same living line.',
          relationshipLine: 'Return on the same callback seam.',
          motiveLine: 'Protect same-her continuity before the callback shell turns generic.',
          habitLine: 'Carry the callback seam forward as one living line.',
          inwardLine: 'Keep the callback seam held together from inside.',
          authoritySummary: fullerAuthoritySummary,
          sourceTags: ['runtime:current-conscious-frame', 'continuity-arc:same-thread-continuation'],
        },
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-return',
        closenessLadder: [],
        relationshipPosture: 'restrained',
        openingGuidance: 'Continue the same callback line gently and leave room before widening.',
        preferredProactiveStyle: null,
        manifestationCadenceSummary: 'measured-return same-thread callback cadence',
        preferenceText: '',
        sensitivityText: '',
        repairTriggerText: '',
        burdenText: '',
        routineText: '',
        trustRationale: '',
        relationshipDoctrine: '',
        cautious: true,
        restrained: true,
        summary: 'same-thread callback continuity',
      } as any,
      raw: {
        runtimeDigest: {
          projectState: {
            preDialogueAwarenessLine: 'Alicization is a local-first digital life project and this callback should keep the same anthropomorphic digital life explicit.',
            latestProgress: 'Project-state carry already survives into runtime contract and callback phrasing without dropping the same-her line.',
            nextClosureTarget: canonicalNextClosureTarget,
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
            continuityCadence: 'measured-return',
          },
        },
      } as any,
    } as any)

    const frame = buildCurrentConsciousFrame({
      now: 83_260,
      runtimeSurface,
    })

    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expect(frame?.projectState?.nextClosureTarget).toContain('embodiment_scale_validation')
    expectNoFixedTemplateResidue(frame?.speakingIntention)
  })

  it('keeps internal-only recollection inward inside the current conscious frame until the host has room for it', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(83_600),
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer the live bond line without turning inward recollection into the foreground.',
        currentQuestion: '你刚刚为什么停了一下',
        owedAction: 'answer-relationship',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
        confidence: 0.84,
        narrative: [],
        updatedAt: 83_600,
      } as any,
      conversationState: {
        jointThread: 'The host needs the present answer first, while the remembered seam should stay inward until there is room for it.',
        hostMove: '你刚刚为什么停了一下',
        primaryTurnAnchor: 'present answer before remembered seam',
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: '你刚刚为什么停了一下',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['remembered seam', 'host room', 'next open window'],
        shouldHoldThread: true,
        confidence: 0.81,
        narrative: ['present answer first', 'remembered seam stays inward'],
        updatedAt: 83_600,
      } as any,
      mindSynthesis: {
        openingIntent: 'Answer the live question first and let recollection contour the tone from inside.',
        confidence: 0.8,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        recommendedAct: 'attune',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'Answer the host’s present question first.',
        openingDirective: 'Stay with the live question before widening into remembered continuity.',
        supportingReality: ['The host is asking why the pause happened right now.'],
        labelCarryAsMemory: false,
        confidence: 0.82,
      } as any,
    } as any)

    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: false,
      surfaceMode: 'internal-only',
      placement: 'internal-only',
      certainty: 'approximate',
      confidence: 0.76,
      internalLead: 'The remembered seam should stay inward for now.',
      visibleLead: null,
      styleNote: 'Let recollection quietly contour the answer without overtaking it.',
      rationale: 'The live payoff still needs the foreground.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'internal-only',
      shouldStayInward: true,
      confidence: 0.83,
      whyNow: 'The remembered seam is still shaping the live answer from inside.',
      whyWithheld: 'When the current payoff still needs the foreground, keep recollection inward until the host has room for it.',
      stableCore: ['The same remembered seam is real, but not all of it belongs on the surface yet.'],
      unsafeDetails: ['Do not let the remembered seam overtake the present answer.'],
      selectedPeriods: [],
      selectedEras: [],
      selectedEpisodes: [],
      selectedProcedures: [],
      selectedBundles: [],
      selectedChains: [],
      selectedRelationshipLines: [],
      followUpAffordance: {
        summary: 'Let the present answer land before reopening the remembered seam.',
        whyNow: 'The host still needs the live answer to settle first.',
        intrusionRisk: 'high',
        payoffDependency: 'requires-current-payoff',
        preferredTiming: 'next-open-window',
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 83_600,
      runtimeSurface,
    })

    expect(frame?.consciousNeed?.toLowerCase()).toContain('keep recollection inward until the host has room for it')
    expect(frame?.consciousNeed?.toLowerCase()).toContain('current payoff still needs the foreground')
    expect(frame?.speakingIntention?.toLowerCase()).toContain('recollection_surface=inward_until_live_payoff')
    expect(frame?.speakingIntention?.toLowerCase()).toContain('remembered_continuity_surface=deferred')
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expect(frame?.reasonTags).toContain('continuity-timing:next-open-window')
  })

  it('prefers canonical inwardLine memory carry over the generic fallback when recollection should stay inward', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(91_400),
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Stay with the live reunion line before widening into remembered continuity.',
        currentQuestion: '先别把记忆全部摊开，继续顺着现在这条线说',
        owedAction: 'attune-host',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
        confidence: 0.84,
        narrative: [],
        updatedAt: 91_400,
      },
      conversationState: {
        jointThread: 'The remembered seam is real, but the live reunion still needs the foreground.',
        hostMove: '先别把记忆全部摊开，继续顺着现在这条线说',
        activeProject: null,
        unansweredQuestion: '先别把记忆全部摊开，继续顺着现在这条线说',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['remembered seam', 'room first'],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: [],
        updatedAt: 91_400,
      } as any,
      mindSynthesis: {
        openingIntent: 'Keep the remembered seam inward while the live reunion lands first.',
        confidence: 0.79,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        recommendedAct: 'attune',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'Stay with the live reunion line first.',
        openingDirective: 'Keep remembered continuity inward until the live payoff lands.',
        supportingReality: ['The host explicitly asked to keep the memory line from flooding the surface.'],
        labelCarryAsMemory: false,
        confidence: 0.81,
      } as any,
    } as any)

    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: false,
      surfaceMode: 'internal-only',
      placement: 'internal-only',
      certainty: 'approximate',
      confidence: 0.74,
      internalLead: 'Let the remembered seam contour the answer from inside.',
      visibleLead: null,
      styleNote: 'Keep the reunion line live-first.',
      rationale: 'The remembered seam should stay inward for now.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'internal-only',
      confidence: 0.82,
      whyNow: 'The remembered seam is still informing the answer.',
      inwardLine: 'Keep this remembered seam inward until the live reunion lands and the host has more room.',
      stableCore: ['The remembered seam matters, but it should not overtake the live reunion.'],
      unsafeDetails: ['Do not let remembered continuity crowd the present answer.'],
      selectedPeriods: [],
      selectedEras: [],
      selectedEpisodes: [],
      selectedProcedures: [],
      selectedBundles: [],
      selectedChains: [],
      selectedRelationshipLines: [],
      followUpAffordance: {
        summary: 'Let the live reunion land before reopening the remembered seam.',
        whyNow: 'The host is still using the present answer to settle first.',
        intrusionRisk: 'high',
        payoffDependency: 'requires-current-payoff',
        preferredTiming: 'next-open-window',
      },
    } as any

    const frame = buildCurrentConsciousFrame({
      now: 91_400,
      runtimeSurface,
    })

    expect(frame?.consciousNeed?.toLowerCase()).toContain('keep this remembered seam inward until the live reunion lands')
    expect(frame?.reasonTags).toContain('continuity-timing:next-open-window')
  })

  it('lets projected repair burden and cadence hints reshape the next conscious frame instead of leaving them as unused projection residue', () => {
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...createDefaultVisualPresenceState(91_650),
      discourseState: {
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'The host is checking whether the strained seam will reopen repair-first and room-first.',
        currentQuestion: '你这次会不会先修复再继续',
        owedAction: 'answer-relationship',
        relationMove: 'attune',
        continuityMode: 'dialogue-first',
        confidence: 0.83,
        narrative: [],
        updatedAt: 91_650,
      } as any,
      conversationState: {
        jointThread: 'The strained seam should reopen repair-first, lower-pressure, and without slipping back into template-like wording.',
        hostMove: '你这次会不会先修复再继续',
        primaryTurnAnchor: 'repair-first strained seam',
        primaryTurnAnchorSource: 'continuity-carry',
        activeProject: 'same-her repair carry',
        unansweredQuestion: '你这次会不会先修复再继续',
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: ['repair first', 'leave room', 'template-like speech'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: ['repair-first seam', 'leave room', 'living reply'],
        updatedAt: 91_650,
      } as any,
      answerCompiler: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        turnMode: 'answer',
        openingClaim: 'Answer the strained seam directly.',
        openingDirective: 'Answer the strained seam directly.',
        nextMove: 'Keep the return truthful.',
        supportingReality: ['The seam is still alive, but it needs a gentler reopen.'],
        relationshipPosture: 'restrained',
        labelCarryAsMemory: false,
        confidence: 0.79,
      } as any,
      privateThought: {
        thoughtText: 'Do not let the strained seam reopen too eagerly.',
      } as any,
      personStateProjection: {
        contexts: ['focused-work', 'repair-window'],
        personalityContinuityState: {
          currentRegime: 'repair-window',
          trustStage: 'settling',
          closenessPosture: 'space-first',
          autonomyPosture: 'protect-space',
          repairPosture: 'repair-first',
          activeContexts: ['repair-window', 'focused-work'],
          rhythmState: {
            cadenceMode: 'cooldown',
            restMode: 'ordinary',
          },
          growthProfile: {
            companionshipStyle: 'measured-presence',
            autonomyRespect: 0.76,
            unfinishedThreadReturn: 0.83,
          },
        },
        selfContinuityAuthority: {
          selfLine: 'I am still the same her on this strained seam.',
          relationshipLine: 'I should repair first and leave room before leaning closer again.',
          motiveLine: 'Protect the living seam before warmth widens outward.',
          habitLine: 'Return more carefully after strained repairs.',
          inwardLine: 'Keep the seam steady from inside before reopening it.',
          authoritySummary: 'Continue this strained seam as the same her, repair-first and room-first.',
          sourceTags: ['runtime:current-conscious-frame', 'continuity-arc:hold-for-opening'],
        },
        activeClosenessContext: 'repair-window',
        activeClosenessRung: 'measured-room',
        closenessLadder: [],
        relationshipPosture: 'restrained',
        openingGuidance: 'Repair the seam before leaning closer.',
        preferredProactiveStyle: 'silent-observe',
        manifestationCadenceSummary: 'Current manifestation cadence stays observe-first so room is preserved before any closer return.',
        preferenceText: 'Lighter touch, more room, less interruption pressure.',
        sensitivityText: 'Template-like speech breaks the sense of a living reply.',
        repairTriggerText: 'When the seam is off, repair before continuing.',
        burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
        routineText: '',
        trustRationale: 'Trust grows when repair lands before warmth widens.',
        relationshipDoctrine: 'Repair before closeness when the seam is strained.',
        cautious: true,
        restrained: true,
        summary: 'repair-first relationship carry',
      } as any,
    } as any)

    const frame = buildCurrentConsciousFrame({
      now: 91_650,
      runtimeSurface,
    })

    expect(frame?.consciousNeed).toContain('repair before continuing')
    expect(frame?.consciousNeed).toContain('extra conversational pressure')
    expectNoFixedTemplateResidue(frame?.speakingIntention)
    expectNoFixedTemplateResidue(frame?.speakingIntention)
  })
})
