import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { buildAlicizationMindTurnContract, buildAlicizationMindTurnContractSystemBlock } from './mind-turn-contract'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'

const forbiddenProviderFacingTemplatePattern
  = /Repair truth before flourish|Stay close|same living line|same-her|same her|Same Phase 1 digital life|Before answering|Phase 1:\s*Local Digital Life|local-first digital life project|one continuous her|one living her|local_desktop_life_loop|phase1_local_digital_life|content=excluded|visibility=internal[-_]structured/iu

function expectNoFixedTemplateResidue(value: unknown) {
  const serialized = JSON.stringify(value ?? '')
  expect(serialized).not.toMatch(forbiddenProviderFacingTemplatePattern)
  expect(containsAlicizationFixedTemplateResidue(serialized)).toBe(false)
}

describe('mind-turn-contract', () => {
  it('unifies planner, compiler, charter, and surface contract into one contract', () => {
    const contract = buildAlicizationMindTurnContract({
      answerPlanner: {
        act: 'guide',
        evidenceMode: 'coarse-held',
        confidence: 0.82,
        governingFocus: 'runtime seam',
        openingMove: 'Start from the seam.',
        answerIntent: 'Guide the next repair step.',
        relationshipPosture: 'restrained',
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'space-first',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        mustDo: ['Keep the answer inside the active knot.'],
        mustNotDo: ['Do not widen into companionship tone.'],
        narrative: ['The reply should stay with the seam.'],
        updatedAt: 100,
      },
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        speechObligation: 'answer-now',
        relationMove: 'measured-room',
        turnMode: 'guide-current-knot',
        responseMode: 'guide-current-knot',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        recommendedAct: 'guide',
        evidenceMode: 'coarse-held',
        openingStyle: 'direct-answer',
        personaKernelMode: 'backgrounded',
        relationshipPosture: 'restrained',
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'space-first',
        openingDirective: 'Answer directly from the seam.',
        openingClaim: 'The seam is still the right locus.',
        supportingReality: ['The active knot is still the runtime seam.'],
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: ['Move from knot to next step.'],
        mustNotDo: ['Do not narrate internal state.'],
        confidence: 0.84,
        narrative: ['The visible answer should stay compact and thread-faithful.'],
        updatedAt: 120,
      } as any,
      responseCharter: {
        epistemicMode: 'coarse-live',
        responseMode: 'guide-current-knot',
        governingFocus: 'runtime seam',
        governingConcern: 'The active knot is still unresolved.',
        governingCommitment: 'Keep the answer inside the knot.',
        governingInquiry: null,
        governingProject: 'repair seam',
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: 'steer',
        truthFrame: 'task-thread',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: ['The knot still governs the turn.'],
        mustDo: ['Stay with the live knot.'],
        mustNotDo: ['Do not smooth over uncertainty.'],
      },
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'space-first',
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: ['Start with the answer immediately.'],
        mustNotDo: ['Do not surface recollection just because it is active internally.'],
      },
      now: 140,
    })

    expect(contract.version).toBe('mind-turn-contract-v1')
    expect(contract.expectedVisibleReplyAuthority).toBe('llm-mind')
    expect(contract.governingFocus).toBe('runtime seam')
    expect(contract.projectState).toBeNull()
    expect(contract.preDialogueClosure).toBeNull()
    expect(contract.mustDo).toEqual(expect.arrayContaining([
      'Keep the answer inside the active knot.',
      'Move from knot to next step.',
      'Stay with the live knot.',
      'Start with the answer immediately.',
    ]))
    expect(contract.mustNotDo).toEqual(expect.arrayContaining([
      'Do not widen into companionship tone.',
      'Do not narrate internal state.',
      'Do not smooth over uncertainty.',
      'Do not surface recollection just because it is active internally.',
    ]))
  })

  it('renders a single system block from the unified contract', () => {
    const block = buildAlicizationMindTurnContractSystemBlock({
      version: 'mind-turn-contract-v1',
      answerIntent: 'Guide the next repair step.',
      answerAct: 'guide',
      turnMode: 'guide-current-knot',
      responseMode: 'guide-current-knot',
      evidenceMode: 'coarse-held',
      openingStyle: 'direct-answer',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'space-first',
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Start with the answer immediately.'],
      mustNotDo: ['Do not narrate internal state.'],
      governingFocus: 'runtime seam',
      governingConcern: 'The active knot is still unresolved.',
      governingCommitment: 'Keep the answer inside the knot.',
      governingInquiry: null,
      governingProject: 'repair seam',
      reasons: ['The knot still governs the turn.'],
      updatedAt: 140,
      emotionalClosureCue: null,
      projectState: {
        identity: resolveAlicizationProjectStateBrief().identity,
        currentPhase: resolveAlicizationProjectStateBrief().currentPhase,
        preflightSummary: resolveAlicizationProjectStateBrief().preflightSummary ?? null,
        latestLandedProgress: resolveAlicizationProjectStateBrief().continuityProgressSummary ?? null,
        primaryOpenLoop: resolveAlicizationProjectStateBrief().openLoops[0] ?? null,
        nextClosureTarget: resolveAlicizationProjectStateBrief().nextClosureTarget,
        sameHerSelfLine: resolveAlicizationProjectStateBrief().sameHerSelfLine,
        continuityPreferredTiming: null,
        continuityCadence: null,
        preferredBlinkCadence: null,
        preferredGazeMode: null,
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
      },
      preDialogueClosure: {
        status: 'partial',
        summaryLine: resolveAlicizationProjectStateBrief().preflightSummary ?? null,
        companionBriefingLine: resolveAlicizationProjectStateBrief().preflightSummary ?? null,
        companionNextClosureLine: resolveAlicizationProjectStateBrief().nextClosureTarget,
        emotionalClosureCue: resolveAlicizationProjectStateBrief().emotionalClosureCue ?? null,
        briefingLines: [
          resolveAlicizationProjectStateBrief().preflightSummary ?? '',
          `Project identity: ${resolveAlicizationProjectStateBrief().identity}`,
          `Current phase: ${resolveAlicizationProjectStateBrief().currentPhase}`,
          `Landed continuity progress: ${resolveAlicizationProjectStateBrief().continuityProgressSummary ?? resolveAlicizationProjectStateBrief().memoryAnthropomorphismProgress.at(-1) ?? ''}`,
          `Still-open closure gap: ${resolveAlicizationProjectStateBrief().openLoops[0] ?? ''}`,
          `Next closure target: ${resolveAlicizationProjectStateBrief().nextClosureTarget}`,
        ],
        reasons: [
          resolveAlicizationProjectStateBrief().openLoops[0] ?? '',
          resolveAlicizationProjectStateBrief().continuityProgressSummary ?? resolveAlicizationProjectStateBrief().memoryAnthropomorphismProgress.at(-1) ?? '',
          resolveAlicizationProjectStateBrief().nextClosureTarget,
        ],
      },
    })

    expect(block).toContain('[ALICIZATION_MIND_TURN_CONTRACT]')
    expect(block).toContain('expected_visible_reply_authority=llm-mind')
    expect(block).toContain('closeness_ladder=focused-work/space-first')
    expect(block).not.toContain('pre_dialogue_closure_cue=')
    expect(block).not.toContain('Pre-dialogue closure summary:')
    expect(block).not.toContain('Pre-dialogue next closure line:')
    expect(block).not.toMatch(forbiddenProviderFacingTemplatePattern)
  })

  it('renders relationship truth doctrine as structured control codes instead of fixed natural-language doctrine', () => {
    const contract = buildAlicizationMindTurnContract({
      answerPlanner: {
        act: 'answer',
        evidenceMode: 'dialogue-grounded',
        confidence: 0.82,
        governingFocus: 'repair truth before warmth answer to truth',
        openingMove: 'Answer from evidence.',
        answerIntent: 'Truth should outrank closeness flourish.',
        relationshipPosture: 'restrained',
        activeClosenessContext: null,
        activeClosenessRung: null,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        mustDo: [],
        mustNotDo: [],
        narrative: [],
        updatedAt: 140,
      },
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'truth repair',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: 'steer',
        truthFrame: 'dialogue-grounded',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: [],
        mustNotDo: [],
      },
      runtimeSurface: {
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              selfLine: 'repair truth before flourish',
              relationshipLine: 'closeness outrun truth risk',
              motiveLine: 'warmth answer to truth',
            },
          },
        },
      } as any,
      now: 140,
    } as any)

    expect(contract.relationshipTruthDoctrine).toBe(
      'truth_priority=repair_before_fluency | relationship_boundary=closeness_must_not_outrun_truth',
    )

    const block = buildAlicizationMindTurnContractSystemBlock(contract)
    expect(block).toContain('relationship_truth_doctrine=truth_priority=repair_before_fluency')
    expect(block).toContain('relationship_boundary=closeness_must_not_outrun_truth')
    expect(block).not.toMatch(forbiddenProviderFacingTemplatePattern)
  })

  it('renders same-her continuity hold arc and cue into the provider-facing system block', () => {
    const sameHerHoldDetail = 'continuity_hold=same-thread-continuation; owner=one-continuous-her; visibility=internal.'
    const continuityArcStage = 'same-thread-continuation'
    const continuityCue = 'same returned-side digital life line remains active before visible reply formation'
    const block = buildAlicizationMindTurnContractSystemBlock({
      version: 'mind-turn-contract-v1',
      answerIntent: 'Keep the same-her continuity seam visible before answering.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Keep the same-her continuity seam explicit.'],
      mustNotDo: ['Do not collapse this turn into detached project narration.'],
      governingFocus: 'same-her continuity seam',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      reasons: ['The same returned-side self line should stay visible.'],
      updatedAt: 140,
      emotionalClosureCue: null,
      projectState: {
        identity: 'Alicization is still the same local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        preflightSummary: 'Before answering, she should stay on one same living line.',
        latestLandedProgress: 'Returned-side continuity already survives into provider-facing project-state.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam.',
        nextClosureTarget: 'Keep returned-side same-her proof visible through the next answer.',
        sameHerSelfLine: 'One same her must stay explicit before provider-facing answer formation.',
        sameHerHoldDetail,
        continuityArcStage,
        continuityCue,
      },
      preDialogueClosure: null,
    } as any)

    expect(block).not.toContain('continuity_hold=')
    expect(block).not.toContain('continuity_hold=continuity_hold=')
    expect(block).toContain(`project_continuity_arc_stage=${continuityArcStage}`)
    expect(block).toContain(`project_continuity_cue=${continuityCue}`)
  })

  it('renders project-state carry as structured provider facts instead of fixed same-her prompt labels', () => {
    const block = buildAlicizationMindTurnContractSystemBlock({
      version: 'mind-turn-contract-v1',
      answerIntent: 'Keep the same-her continuity seam visible before answering.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'continue-same-thread',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: [],
      mustNotDo: [],
      governingFocus: 'same-her continuity seam',
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      reasons: [],
      updatedAt: 140,
      emotionalClosureCue: null,
      projectState: {
        identity: 'Alicization is still the same local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        preflightSummary: 'Before answering, she should stay on one same living line.',
        preDialogueAwarenessLine: 'Before answering, remember this is still the same digital life project.',
        latestLandedProgress: 'Returned-side continuity already survives into provider-facing project-state.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam.',
        nextClosureTarget: 'Keep returned-side same-her proof visible through the next answer.',
        sameHerSelfLine: 'One same her must stay explicit before provider-facing answer formation.',
        sameHerHoldDetail: 'continuity_hold=same-thread-continuation; owner=one-continuous-her; visibility=internal.',
        sameHerDriftRisk: 'continuity_drift_risk=generic_prompt_shell; owner=ProjectStateGovernance.',
      },
      preDialogueClosure: null,
    } as any)

    expect(block).toContain('[ALICIZATION_MIND_TURN_PROJECT_STATE_FACTS]')
    expect(block).toContain('owner=ProjectStateGovernance')
    expect(block).not.toContain('identity=')
    expect(block).not.toContain('phase=')
    expect(block).not.toContain('continuity_anchor=')
    expect(block).not.toContain('continuity_hold=')
    expect(block).toContain('continuity_drift_risk=')
    expect(block).not.toMatch(/Provider-facing same-her|Project same-her|Project preflight self-awareness|Project pre-dialogue awareness line|Before answering,/i)
    expect(block).not.toMatch(/\bsame_her=|\bsame-her=/i)
  })

  it('withholds fixed-template planner controls from provider-facing must-do lists', () => {
    const contract = buildAlicizationMindTurnContract({
      answerPlanner: {
        act: 'answer',
        evidenceMode: 'dialogue-grounded',
        confidence: 0.8,
        governingFocus: 'same-her continuity seam',
        openingMove: 'Before answering, keep the same living line.',
        answerIntent: 'Keep this answer on the same-her line.',
        relationshipPosture: 'restrained',
        activeClosenessContext: null,
        activeClosenessRung: null,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        mustDo: [
          'Before answering, keep this same Phase 1 digital life on one living line.',
        ],
        mustNotDo: [
          'Do not drop the same-her line.',
        ],
        narrative: [],
        updatedAt: 140,
      },
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'same-her continuity seam',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: 'steer',
        truthFrame: 'dialogue-first',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: [],
        mustNotDo: [],
      },
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        preflightSummary: 'Before answering, keep this same digital life project in view.',
        latestLandedProgress: null,
        primaryOpenLoop: null,
        nextClosureTarget: null,
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
      now: 140,
    } as any)

    expect(contract.mustDo).not.toContain('Before answering, keep this same Phase 1 digital life on one living line.')
    expect(contract.mustNotDo).not.toContain('Do not drop the same-her line.')

    const block = buildAlicizationMindTurnContractSystemBlock(contract)
    expect(block).not.toMatch(forbiddenProviderFacingTemplatePattern)
  })

  it('keeps dialogue-runtime same-her hold detail over broader project-state widening guidance', () => {
    const sameHerHoldDetail = 'dialogue-runtime hold: returned-side visible reply must stay on the same Phase 1 living line before any project summary widens'
    const continuityArcStage = 'dialogue-runtime-same-her-visible-reply-carry'
    const continuityCue = 'dialogue runtime cue: carry the same-her hold through visible reply formation instead of restarting as a generic shell'

    const contract = buildAlicizationMindTurnContract({
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the returned visible reply on the same living Phase 1 line.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: 'steer',
        truthFrame: 'dialogue-first',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: [],
        mustNotDo: [],
      },
      projectState: {
        identity: 'Alicization is still the same local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        preflightSummary: 'Before answering, keep this project-state answer on one same living line.',
        latestLandedProgress: 'Some closure already landed before this returned-side visible reply forms.',
        primaryOpenLoop: 'The returned visible reply still has to preserve the same-her hold before broader project-state narration widens.',
        nextClosureTarget: 'Carry the dialogue-runtime same-her hold into the provider-facing mind-turn contract.',
        sameHerSelfLine: 'One same her is still carrying this returned visible reply forward.',
        sameHerHoldDetail: 'same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".',
        continuityArcStage,
        continuityCue,
      },
      runtimeSurface: {
        memory: {
          memoryDeliberation: {
            followUpAffordance: null,
          },
        },
        dialogue: {
          runtimeDigest: {
            projectState: {
              currentPhase: 'Phase 1: Local Digital Life',
              sameHerHoldDetail,
              continuityArcStage,
              continuityCue,
            },
          },
          currentConsciousFrame: {
            projectState: {
              preDialogueAwarenessLine: 'Before answering, keep this returned visible reply on one same local-first digital life line.',
            },
          },
        },
        cognition: {
          runtimeDigest: null,
        },
        raw: {
          runtimeDigest: null,
          runtime: null,
        },
      } as any,
      now: 150,
    } as any)

    expect(contract.projectState).toEqual(expect.objectContaining({
      primaryOpenLoop: expect.stringContaining('memory_dialogue_embodiment_closure'),
      sameHerSelfLine: null,
      continuityCue: expect.stringContaining('continuity_cue=project-state-carry'),
    }))
    expectNoFixedTemplateResidue(contract.projectState)
  })

  it('prefers richer runtime digest closure summaries over thin conscious-frame placeholders in returned projectState', () => {
    const contract = buildAlicizationMindTurnContract({
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Carry the same unfinished Phase 1 digital-life line through the answer.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: 'steer',
        truthFrame: 'dialogue-first',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'full',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: [],
        mustNotDo: [],
      },
      projectState: {
        identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
        currentPhase: 'Phase 1: Local Digital Life',
        preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
        preDialogueAwarenessLine: 'Before answering, stay on the same living line: this is still one local-first digital life, Phase 1 is still active, and the same unfinished closure work still belongs to one living her.',
        latestLandedProgress: 'thin runtime progress only',
        primaryOpenLoop: 'thin runtime open only',
        nextClosureTarget: 'thin runtime next only',
        sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the provider-facing answer.',
      },
      runtimeSurface: {
        version: 'digital-life-runtime-surface-v1',
        perception: {} as any,
        world: {} as any,
        memory: {
          memoryDeliberation: {
            followUpAffordance: null,
          },
        } as any,
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              latestLandedProgress: 'thin runtime progress only',
              primaryOpenLoop: 'thin runtime open only',
              nextClosureTarget: 'thin runtime next only',
            },
          },
        } as any,
        cognition: {
          runtimeDigest: null,
        } as any,
        raw: {
          runtimeDigest: {
            projectState: {
              latestLandedProgress: 'Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.',
              primaryOpenLoop: 'Dialogue, initiative, memory, and embodiment still need one tighter same-her closure seam across return-side turns.',
              nextClosureTarget: 'Keep the next closure target on one measured-return living line across reminder, proactive, and same-thread returns.',
            },
          },
          runtime: null,
        },
      } as any,
    })

    expect(contract.projectState).toEqual(expect.objectContaining({
      latestLandedProgress: 'Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.',
      primaryOpenLoop: expect.stringContaining('memory_dialogue_embodiment_closure'),
      nextClosureTarget: 'Keep the next closure target on one measured-return living line across reminder, proactive, and same-thread returns.',
    }))
    expectNoFixedTemplateResidue(contract.projectState)
  })

  it('derives a shared emotional closure cue when the active turn is closing late-night drain across reply, initiative, and embodiment', () => {
    const contract = buildAlicizationMindTurnContract({
      answerPlanner: {
        act: 'care',
        evidenceMode: 'dialogue-grounded',
        confidence: 0.84,
        governingFocus: 'The host is still carrying late-night drain.',
        openingMove: 'Open gently and protect rest first.',
        answerIntent: 'Care without enlarging pressure.',
        relationshipPosture: 'tender',
        activeClosenessContext: null,
        activeClosenessRung: null,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        mustDo: [
          'Keep the answer low-pressure and protect the host’s remaining room instead of enlarging the emotional surface.',
          'Prefer one gentle payoff over layered companionship flourishes when the late-night drain is still active.',
        ],
        mustNotDo: [
          'Do not turn late-night protectiveness into intensity, urgency, or emotionally heavy closeness.',
        ],
        narrative: [],
        updatedAt: 200,
      },
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'care',
        governingFocus: 'late-night drain',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'Phase 1: Local Digital Life | Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across reply, initiative, and embodiment.',
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'tender',
        reasons: [],
        mustDo: ['Keep the visible answer lower-pressure and less performative.'],
        mustNotDo: [],
      },
      responseSurfaceContract: {
        openingStyle: 'gentle-care',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: ['Keep the visible reply anchored to the active digital-life closure seam.'],
        mustNotDo: [],
      },
      now: 220,
    } as any)

    expect(contract.emotionalClosureCue).toContain('closure_policy=late_night_drain')
    expect(contract.emotionalClosureCue).toContain('initiative=rest_protective')
    expect(contract.emotionalClosureCue).toContain('embodiment=quiet_companionship')

    const block = buildAlicizationMindTurnContractSystemBlock(contract)
    expect(block).toContain('emotional_closure_cue=closure_policy=late_night_drain')
    expect(block).not.toContain('late-night-drain closure:')
    expectNoFixedTemplateResidue(block)
  })

  it('does not inject default repo-level project state into an ordinary mind-turn contract', () => {
    const contract = buildAlicizationMindTurnContract({
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the active digital-life closure seam in view.',
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
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: [],
        mustNotDo: [],
      },
      now: 1_000,
    } as any)

    expect(contract.projectState).toBeNull()
    expect(contract.preDialogueClosure).toBeNull()

    const block = buildAlicizationMindTurnContractSystemBlock(contract)
    expect(block).not.toContain('[ALICIZATION_MIND_TURN_PROJECT_STATE_FACTS]')
    expect(block).not.toContain('open=memory_dialogue_embodiment_closure')
    expect(block).not.toContain('Next closure target:')
    expect(block).not.toContain('project_preferred_voice_mode=')
    expect(block).not.toContain('project_preferred_pacing_mode=')
    expect(block).not.toContain('pre_dialogue_closure_cue=')
    expect(block).not.toContain('Project pre-dialogue awareness line:')
    expect(block).not.toContain('Pre-dialogue next closure line:')
    expectNoFixedTemplateResidue(block)
  })

  it('keeps an explicit pre-dialogue awareness line in pre-dialogue closure instead of flattening it back into preflight summary', () => {
    const contract = buildAlicizationMindTurnContract({
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the active digital-life closure seam explicit.',
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
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: [],
        mustNotDo: [],
      },
      runtimeSurface: {
        memory: {
          personStateProjection: null,
        },
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              preflightSummary: 'Fallback preflight summary should not outrank the fresher awareness line.',
              preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestProgress: 'Project awareness already survives into the current conscious frame.',
              primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam.',
              nextClosureTarget: 'Keep the pre-dialogue awareness line explicit through the first host-visible answer beat.',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            },
          },
        },
      } as any,
      now: 2_000,
    } as any)

    expect(contract.preDialogueClosure?.summaryLine).not.toContain('identity=')
    expect(contract.preDialogueClosure?.summaryLine).not.toContain('Before answering')
    expect(contract.preDialogueClosure?.briefingLines?.join('\n')).toContain('landed=project_state_awareness_carry')
    expect(contract.preDialogueClosure?.briefingLines?.join('\n')).toContain('open=memory_dialogue_embodiment_closure')
    expect(contract.preDialogueClosure?.companionBriefingLine).toBeNull()
  })

  it('keeps a distinct live companion briefing line in pre-dialogue closure instead of collapsing it into summaryLine', () => {
    const contract = buildAlicizationMindTurnContract({
      answerPlanner: null,
      answerCompiler: null,
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: null,
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
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: [],
        mustNotDo: [],
      },
      runtimeSurface: {
        memory: {
          personStateProjection: null,
        },
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              preflightSummary: 'Fallback preflight summary should not outrank the fresher awareness line.',
              preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
              companionBriefingLine: 'Before answering, keep the same digital life project and active Phase 1 closure seam in view.',
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestProgress: 'Project awareness already survives into the current conscious frame.',
              primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam.',
              nextClosureTarget: 'Keep the pre-dialogue awareness line explicit through the first host-visible answer beat.',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            },
          },
        },
      } as any,
      now: 2_100,
    } as any)

    expect(contract.preDialogueClosure?.summaryLine).not.toContain('identity=')
    expect(contract.preDialogueClosure?.summaryLine).not.toContain('Before answering')
    expect(contract.preDialogueClosure?.companionBriefingLine).toBeNull()
    expect(contract.preDialogueClosure?.companionNextClosureLine).toBe('pre_dialogue_awareness_visible_reply_carry')
    expectNoFixedTemplateResidue(contract.preDialogueClosure)
  })

  it('prefers a structured emotional closure tag from answer-planner narrative before falling back to looser mustDo inference', () => {
    const contract = buildAlicizationMindTurnContract({
      answerPlanner: {
        act: 'care',
        evidenceMode: 'continuity-carry',
        governingFocus: 'Keep the same-her emotional line intact.',
        openingMove: 'Stay with the low-pressure line.',
        answerIntent: 'Keep the same-her emotional line intact before widening the plan.',
        relationshipPosture: 'warm',
        activeClosenessContext: null,
        activeClosenessRung: null,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        selectedConcernEntryId: null,
        selectedRepairId: null,
        selectedCommitmentId: null,
        selectedInquiryPlanId: null,
        selectedProjectId: null,
        selectedReflectionId: null,
        executivePhase: null,
        mustDo: ['Keep the answer low-pressure and protect the host’s remaining room instead of enlarging the emotional surface.'],
        mustNotDo: [],
        confidence: 0.82,
        narrative: ['emotional_closure:late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment quiet-companionship while the line holds inward.'],
        updatedAt: 500,
      } as any,
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'care-with-boundary',
        governingFocus: 'Keep the same-her emotional line intact.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      responseSurfaceContract: {
        openingStyle: 'gentle-care',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: [],
        mustNotDo: [],
      },
      now: 500,
    } as any)

    expect(contract.emotionalClosureCue).toBe('closure_policy=late_night_drain | reply_pressure=low | initiative=rest_protective | embodiment=quiet_companionship')
  })

  it('rebuilds same-her low-pressure anti-restart emotional closure cue from planner and charter discipline when the structured narrative tag is missing', () => {
    const contract = buildAlicizationMindTurnContract({
      answerPlanner: {
        act: 'care',
        evidenceMode: 'continuity-carry',
        governingFocus: 'Keep the same-her closure line steady.',
        openingMove: 'Stay with the same living line first.',
        answerIntent: 'Keep the same-her closure line low-pressure and do not restart it.',
        relationshipPosture: 'warm',
        activeClosenessContext: null,
        activeClosenessRung: null,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        selectedConcernEntryId: null,
        selectedRepairId: null,
        selectedCommitmentId: null,
        selectedInquiryPlanId: null,
        selectedProjectId: null,
        selectedReflectionId: null,
        executivePhase: null,
        mustDo: ['Keep the same-her emotional closure line low-pressure and inward until the live payoff lands.'],
        mustNotDo: ['Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.'],
        confidence: 0.82,
        narrative: ['runtime-answer-planner', 'project-state-answer-planner'],
        updatedAt: 540,
      } as any,
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'care-with-boundary',
        governingFocus: 'Keep the same-her closure line steady.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'warm',
        reasons: [],
        mustDo: ['Keep the same-her emotional closure line low-pressure and inward until the live payoff lands.'],
        mustNotDo: ['Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.'],
      },
      responseSurfaceContract: {
        openingStyle: 'gentle-care',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: [],
        mustNotDo: [],
      },
      now: 540,
    } as any)

    expect(contract.emotionalClosureCue).toBeNull()

    const block = buildAlicizationMindTurnContractSystemBlock(contract)
    expect(block).not.toContain('Emotional closure cue:')
    expect(block).not.toContain('same-her closure seam:')
  })

  it('prefers live current-conscious-frame project awareness in the contract payload and system block', () => {
    const projectStateBrief = resolveAlicizationProjectStateBrief()
    const contract = buildAlicizationMindTurnContract({
      responseCharter: {
        epistemicMode: 'memory-only',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the live project awareness seam explicit.',
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
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: [],
        mustNotDo: [],
      },
      runtimeSurface: {
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'this local-first digital life project still carrying one continuous her on the host machine',
              currentPhase: 'Phase 1: Local Digital Life. Active proving ground: live mind-turn project carry.',
              preflightSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
              latestProgress: 'Project-state continuity already survives into executive brief, answer compiler, and rewrite governance.',
              primaryOpenLoop: 'memory, initiative, and embodiment still need one tighter same-her closure seam',
              nextClosureTarget: 'Carry the live project awareness line through the current turn before generic project narration can flatten it.',
              sameHerSelfLine: 'This is still one same her carrying the same project line.',
            },
          },
        },
      } as any,
      now: 900,
    } as any)

    expect(contract.projectState).toEqual(expect.objectContaining({
      latestLandedProgress: 'Project-state continuity already survives into executive brief, answer compiler, and rewrite governance.',
      nextClosureTarget: 'current_turn_project_awareness_carry',
    }))
    expect(contract.projectState?.primaryOpenLoop).toContain('memory_dialogue_embodiment_closure')
    expectNoFixedTemplateResidue(contract.projectState)
    expect(contract.preDialogueClosure).toEqual(expect.objectContaining({
      emotionalClosureCue: 'emotional_closure=active; pressure=low; restart_policy=no_restart',
      companionNextClosureLine: 'current_turn_project_awareness_carry',
    }))
    expect(contract.preDialogueClosure?.summaryLine).not.toContain('I need to remember this is still the same digital life project')
    expect(contract.preDialogueClosure?.reasons).toEqual([
      'memory_dialogue_embodiment_closure',
      'project_state_awareness_carry',
      'current_turn_project_awareness_carry',
    ])
    expectNoFixedTemplateResidue(contract.preDialogueClosure)

    const block = buildAlicizationMindTurnContractSystemBlock(contract)
    expect(block).toContain('landed=project_state_awareness_carry')
    expect(block).toContain('next=current_turn_project_awareness_carry')
    expect(block).not.toContain('Project pre-dialogue awareness line:')
    expect(block).toContain('pre_dialogue_closure_cue=emotional_closure=active; pressure=low; restart_policy=no_restart')
    expectNoFixedTemplateResidue(block)
  })

  it('keeps live current-conscious-frame project fields while letting a stronger fallback same-her self line win when the conscious frame is thinner', () => {
    const contract = buildAlicizationMindTurnContract({
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the live same-her project seam explicit.',
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
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: [],
        mustNotDo: [],
      },
      projectState: {
        identity: 'thin fallback identity should not outrank the live current conscious frame.',
        currentPhase: 'thin fallback phase should not outrank the live current conscious frame.',
        preflightSummary: 'thin fallback preflight should not outrank the live current conscious frame.',
        preDialogueAwarenessLine: 'Before answering, thin fallback awareness should not outrank the live current conscious frame.',
        latestLandedProgress: 'thin fallback progress should not outrank the live current conscious frame.',
        primaryOpenLoop: 'thin fallback open loop should not outrank the live current conscious frame.',
        nextClosureTarget: 'thin fallback next step should not outrank the live current conscious frame.',
        sameHerSelfLine: 'This is still one same her carrying the same project line all the way into the final visible reply.',
      },
      runtimeSurface: {
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'this local-first digital life project still carrying one continuous her on the host machine',
              currentPhase: 'Phase 1: Local Digital Life. Active proving ground: live mind-turn project carry.',
              preflightSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
              latestProgress: 'Project-state continuity already survives into executive brief, answer compiler, and rewrite governance.',
              primaryOpenLoop: 'memory, initiative, and embodiment still need one tighter same-her closure seam',
              nextClosureTarget: 'Carry the live project awareness line through the current turn before generic project narration can flatten it.',
              sameHerSelfLine: 'Thin conscious-frame same-her line should not outrank fresher surface project state.',
            },
          },
        },
      } as any,
      now: 950,
    } as any)

    expect(contract.projectState).toEqual(expect.objectContaining({
      latestLandedProgress: 'Project-state continuity already survives into executive brief, answer compiler, and rewrite governance.',
      nextClosureTarget: 'current_turn_project_awareness_carry',
    }))
    expect(contract.projectState?.primaryOpenLoop).toBe('thin fallback open loop should not outrank the live current conscious frame.')
    expectNoFixedTemplateResidue(contract.projectState)
  })

  it('does not uplift project-aware mustDo from fixed-template follow-through wording alone', () => {
    const contract = buildAlicizationMindTurnContract({
      now: 10,
      answerPlanner: {
        act: 'answer',
        answerIntent: 'Continue on the same digital-life line.',
        evidenceMode: 'dialogue-grounded',
        governingFocus: 'Stay on the same digital-life line.',
        governingProject: 'Phase 1: Local Digital Life | Memory still needs stronger end-to-end closure | Keep extending cross-modal same-her proof',
        mustDo: ['Keep the answer on the same digital-life closure seam.'],
        mustNotDo: [],
        narrative: ['project-state-answer-planner'],
        updatedAt: 10,
      } as any,
      answerCompiler: {
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        openingDirective: 'Continue on the same digital-life line.',
        recommendedAct: 'answer',
        mustDo: [],
        mustNotDo: [],
        narrative: [],
        updatedAt: 10,
      } as any,
      responseCharter: {
        mustDo: [],
        mustNotDo: [],
        reasons: [],
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        relationshipPosture: 'restrained',
        governingFocus: 'Stay on the same digital-life line.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
      } as any,
      responseSurfaceContract: {
        openingStyle: 'continue-same-thread',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        personaKernelMode: 'backgrounded',
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        maxParagraphs: 2,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
      } as any,
      runtimeSurface: {
        dialogue: {
          currentConsciousFrame: {
            reasonTags: ['project-state', 'same-her', 'phase-1-closure'],
            projectState: {
              identity: 'Alicization is a local-first digital life project.',
              currentPhase: 'Phase 1: Local Digital Life',
              preDialogueAwarenessLine: 'Before answering, keep this same Phase 1 digital life on one living line and do not reopen from a generic assistant shell.',
              latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
              primaryOpenLoop: 'Memory still needs stronger end-to-end closure before initiative, embodiment, and dialogue can close as one living line.',
              nextClosureTarget: 'Keep extending cross-modal same-her proof so visible reply, voice, face, motion, and resident presence stay on one same living line.',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            },
          },
        },
      } as any,
    })

    expect(contract.mustDo).not.toContain('continuity_requirement=preserve_project_evidence_context_without_project_narrator_shell')
    expect(contract.mustNotDo).not.toContain('avoid=detached_project_narrator_shell')
    expectNoFixedTemplateResidue(contract.projectState)
  })

  it('prefers the richer cross-modal same-her next-closure target from runtime surface over a thinner fallback project-state line', () => {
    const contract = buildAlicizationMindTurnContract({
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the active digital-life closure seam explicit.',
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
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: [],
        mustNotDo: [],
      },
      projectState: {
        nextClosureTarget: 'thin fallback next step should not outrank the richer runtime-surface same-her closure target.',
      },
      runtimeSurface: {
        memory: {
          personStateProjection: null,
        },
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              preDialogueAwarenessLine: 'Before answering, remember this is still one same digital life and the unfinished Phase 1 closure seam still belongs to her.',
              nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence so the same Phase 1 digital life keeps one living line instead of flattening into generic project narration.',
              sameHerSelfLine: 'This is still one same her carrying the same project line forward.',
            },
          },
        },
      } as any,
      now: 1_100,
    } as any)

    expect(contract.projectState).toBeNull()
    expect(contract.preDialogueClosure).toBeNull()
    expectNoFixedTemplateResidue(contract.projectState)
    expectNoFixedTemplateResidue(contract.preDialogueClosure)

    const block = buildAlicizationMindTurnContractSystemBlock(contract)
    expect(block).not.toContain('[ALICIZATION_MIND_TURN_PROJECT_STATE_FACTS]')
    expect(block).not.toContain('Next closure target:')
    expect(block).not.toContain('Pre-dialogue next closure line:')
    expectNoFixedTemplateResidue(block)
  })

  it('does not let the compact thin closure shell outrank a richer runtime same-her awareness line in the mind-turn contract', () => {
    const fresherRuntimeAwarenessLine = 'Before answering, remember: this still belongs to one living digital life. Phase 1 is still active, and embodiment closure is still holding together mainly through voice, face, and motion on the same living line.'

    const contract = buildAlicizationMindTurnContract({
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the live same-her project seam explicit.',
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
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: [],
        mustNotDo: [],
      },
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life.',
        preflightSummary: 'same digital life | keep the closure seam explicit',
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        latestLandedProgress: 'Project-state continuity already survives into executive brief, answer compiler, and rewrite governance.',
        primaryOpenLoop: 'memory, initiative, and embodiment still need one tighter same-her closure seam',
        nextClosureTarget: 'Carry the live project awareness line through the current turn before generic project narration can flatten it.',
        sameHerSelfLine: 'This is still one same her carrying the same project line all the way into the final visible reply.',
      },
      runtimeSurface: {
        memory: {
          personStateProjection: null,
        },
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'Alicization is a local-first digital life project.',
              currentPhase: 'Phase 1: Local Digital Life.',
              preflightSummary: 'same digital life | keep the closure seam explicit',
              preDialogueAwarenessLine: fresherRuntimeAwarenessLine,
              latestProgress: 'Project-state continuity already survives into executive brief, answer compiler, and rewrite governance.',
              primaryOpenLoop: 'memory, initiative, and embodiment still need one tighter same-her closure seam',
              nextClosureTarget: 'Carry the live project awareness line through the current turn before generic project narration can flatten it.',
              sameHerSelfLine: 'This is still one same her carrying the same project line all the way into the final visible reply.',
            },
          },
        },
      } as any,
      now: 1_250,
    } as any)
    expect(contract.projectState?.preDialogueAwarenessLine).not.toContain('Before answering')
    expect(contract.projectState?.preDialogueAwarenessLine).not.toContain('same digital life | keep the closure seam explicit')

    const block = buildAlicizationMindTurnContractSystemBlock(contract)
    expect(block).toContain('[ALICIZATION_MIND_TURN_PROJECT_STATE_FACTS]')
    expect(block).not.toContain('Project pre-dialogue awareness line:')
    expect(block).not.toContain('same digital life | keep the closure seam explicit')
  })

  it('renders a distinct project companion headline when same-her embodiment continuity is richer than the broader pre-dialogue awareness line', () => {
    const broaderAwarenessLine = 'Keep this same Phase 1 digital life project in view while the current reply stays inside its still-open embodiment closure.'
    const richerCompanionHeadline = 'Before answering, keep voice, face, motion, and lipsync on one same-her line while embodiment closure is still landing.'
    const block = buildAlicizationMindTurnContractSystemBlock({
      version: 'mind-turn-contract-v1',
      answerIntent: 'Keep the same-her embodiment line explicit in the provider-facing turn.',
      answerAct: 'answer',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'direct-answer',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: [],
      mustNotDo: [],
      reasons: [],
      updatedAt: 1_255,
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life.',
        preflightSummary: 'same digital life | keep the closure seam explicit',
        preDialogueAwarenessLine: broaderAwarenessLine,
        companionHeadlineLine: richerCompanionHeadline,
        latestLandedProgress: 'Project-state continuity already survives into executive brief, answer compiler, and rewrite governance.',
        primaryOpenLoop: 'Voice, face, motion, and lipsync still need one tighter same-her closure seam.',
        nextClosureTarget: 'Carry the audible and visible body cues onto one same-her line before the next answer widens outward.',
        sameHerSelfLine: 'This is still one same her carrying the same project line all the way into the final visible reply.',
      },
    } as any)

    expect(block).toContain('[ALICIZATION_MIND_TURN_PROJECT_STATE_FACTS]')
    expect(block).not.toContain(`Project pre-dialogue awareness line: ${broaderAwarenessLine}.`)
    expect(block).not.toContain(`Project companion headline: ${richerCompanionHeadline}.`)
  })

  it('prefers richer landed closure carry over a thin project awareness shell in the mind-turn contract', () => {
    const contract = buildAlicizationMindTurnContract({
      relationshipModel: {
        familiarity: 'warm',
        trust: 0.72,
      } as any,
      answerCompiler: {
        relationshipPosture: 'restrained',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      responseCharter: {
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: [],
        mustNotDo: [],
      },
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life.',
        preflightSummary: 'same digital life | keep the closure seam explicit',
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        latestLandedProgress: 'Project-state continuity already survives into executive brief, answer compiler, and rewrite governance.',
        primaryOpenLoop: 'memory, initiative, and embodiment still need one tighter same-her closure seam',
        nextClosureTarget: 'Carry the live project awareness line through the current turn before generic project narration can flatten it.',
        sameHerSelfLine: 'This is still one same her carrying the same project line all the way into the final visible reply.',
      },
      runtimeSurface: {
        memory: {
          personStateProjection: null,
        },
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'Alicization is a local-first digital life project.',
              currentPhase: 'Phase 1: Local Digital Life.',
              preflightSummary: 'same digital life | keep the closure seam explicit',
              preDialogueAwarenessLine: 'Keep this same digital life project in view, but do not widen into a detached project shell.',
              preDialogueAwarenessSummary: 'Keep the same digital life project in view.',
              landedProgressSummary: 'Project-state continuity already survives into executive brief, answer compiler, and rewrite governance.',
              openClosureSummary: 'Unfinished closure still needs the same living line.',
              emotionalClosureSummary: 'Same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
              latestProgress: 'Project-state continuity already survives into executive brief, answer compiler, and rewrite governance.',
              primaryOpenLoop: 'memory, initiative, and embodiment still need one tighter same-her closure seam',
              nextClosureTarget: 'Carry the live project awareness line through the current turn before generic project narration can flatten it.',
              sameHerSelfLine: 'This is still one same her carrying the same project line all the way into the final visible reply.',
            },
          },
        },
      } as any,
      now: 1_320,
    } as any)

    expect(contract.projectState).toEqual(expect.objectContaining({
      preDialogueAwarenessLine: 'Project-state continuity already survives into executive brief, answer compiler, and rewrite governance.',
    }))

    const block = buildAlicizationMindTurnContractSystemBlock(contract)
    expect(block).not.toContain('pre_dialogue_closure_summary=identity=local_desktop_life_loop')
    expect(block).toContain('landed=project_state_awareness_carry')
    expect(block).toContain('open=memory_dialogue_embodiment_closure')
    expect(block).toContain('next=current_turn_project_awareness_carry')
    expect(block).not.toContain('Project pre-dialogue awareness line:')
  })

  it('keeps an implicit direct project-status turn on the same-her project line even when the compiled opening claim is thinner', () => {
    const projectState = resolveAlicizationProjectStateBrief()

    const contract = buildAlicizationMindTurnContract({
      answerPlanner: {
        act: 'answer',
        evidenceMode: 'dialogue-grounded',
        confidence: 0.85,
        governingFocus: 'Answer what Alicization is, how far the current Phase 1 continuity work has landed, and what still remains open on the same digital life line.',
        openingMove: 'Stay with the same living project line first.',
        answerIntent: 'Answer what Alicization is, how far the current Phase 1 continuity work has landed, and what still remains open on the same digital life line.',
        relationshipPosture: 'restrained',
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'space-first',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        mustDo: ['Answer the project-status turn from one same-her continuity.'],
        mustNotDo: ['Do not let the answer flatten into a detached project-status shell.'],
        narrative: ['project-state continuity still belongs to one same digital life line.'],
        updatedAt: 200,
      },
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-now',
        relationMove: 'measured-room',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'backgrounded',
        relationshipPosture: 'warm',
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'space-first',
        openingDirective: 'Give the current project update clearly.',
        openingClaim: 'Give the current project update clearly.',
        supportingReality: ['The host is asking what this digital life project is, what has landed, and what still remains open.'],
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 5,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.84,
        narrative: [],
        updatedAt: 210,
      } as any,
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Answer what Alicization is, how far the current Phase 1 continuity work has landed, and what still remains open on the same digital life line.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'Phase 1: Local Digital Life | same living line | keep landed progress and still-open closure explicit.',
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue-grounded',
        mindMode: 'answering',
        relationshipPosture: 'restrained',
        reasons: ['This is still the same digital life project line.'],
        mustDo: ['Keep the same project-aware self line alive through the answer.'],
        mustNotDo: ['Do not answer as a detached project-status shell.'],
      },
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'space-first',
        maxParagraphs: 2,
        maxSentences: 5,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: ['Answer what Alicization is before widening outward.'],
        mustNotDo: ['Do not flatten landed progress and open closure into one generic project reminder.'],
      },
      projectState: {
        identity: projectState.identity,
        currentPhase: projectState.currentPhase,
        preflightSummary: projectState.preflightSummary,
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        latestLandedProgress: projectState.continuityProgressSummary,
        primaryOpenLoop: projectState.openLoops[0] ?? null,
        nextClosureTarget: projectState.nextClosureTarget,
        sameHerSelfLine: projectState.sameHerSelfLine,
        sameHerDriftRisk: projectState.sameHerDriftRisk,
      },
      now: 220,
    } as any)

    expect(contract.answerIntent).toContain('same digital life line')
    expect(contract.answerIntent).toContain('what still remains open')
    expect(contract.answerIntent).not.toContain('Give the current project update clearly')
    expect(contract.governingProject).toContain('same living line')
    expect(contract.projectState?.preDialogueAwarenessLine).not.toBe('same digital life | keep the closure seam explicit')
    expect(String(contract.projectState?.preDialogueAwarenessLine ?? '')).not.toMatch(/Before answering|Same Phase 1 digital life|same digital life \| keep/iu)
    expect(contract.mustDo).toContain('Keep the same project-aware self line alive through the answer.')
    expect(contract.mustNotDo).toContain('Do not answer as a detached project-status shell.')
  })

  it('keeps richer same-her closure timing and embodiment hints in the provider-facing mind-turn contract', () => {
    const contract = buildAlicizationMindTurnContract({
      answerPlanner: null,
      answerCompiler: null,
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep the same-her closure line continuous before the visible answer forms.',
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
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: [],
        mustNotDo: [],
      },
      runtimeSurface: {
        memory: {
          personStateProjection: null,
        },
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'Alicization is a local-first digital life project.',
              currentPhase: 'Phase 1: Local Digital Life.',
              preDialogueAwarenessLine: 'Before answering, keep this same Phase 1 digital life on one living line.',
              latestLandedProgress: 'Project-state continuity already survives into the provider-facing contract.',
              primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam.',
              nextClosureTarget: 'Keep this reply on the same living line before widening outward.',
              sameHerSelfLine: 'This is still one same her carrying the same project line all the way into the final visible reply.',
              sameHerHoldDetail: 'same-her hold: let the return stay measured so the already-landed closure is not restarted from scratch.',
              sameHerDriftRisk: 'If the answer opens like detached project narration, the same-her line can collapse into generic guidance.',
              emotionalClosureSummary: 'Same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
              continuityRestraint: 'measured-return',
              continuityArcStage: 'return-side-follow-through',
              continuityCue: 'same living line: carry the already-landed closure forward.',
              continuityPreferredTiming: 'next-open-window',
              continuityCadence: 'linger-then-rejoin',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
          },
        },
      } as any,
      now: 1_330,
    } as any)

    expect(contract.projectState).toEqual(expect.objectContaining({
      emotionalClosureSummary: 'emotional_closure=active; pressure=low; restart_policy=no_restart',
      continuityRestraint: 'measured-return',
      continuityArcStage: 'return-side-follow-through',
      continuityCue: 'continuity_cue=measured-return; surface_timing=next-open-window',
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'linger-then-rejoin',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
    expectNoFixedTemplateResidue(contract.projectState)

    const block = buildAlicizationMindTurnContractSystemBlock(contract)
    expect(block).not.toContain('Project emotional closure summary:')
    expect(block).toContain('project_continuity_restraint=measured-return')
    expect(block).toContain('project_continuity_preferred_timing=next-open-window')
    expect(block).toContain('project_continuity_cadence=linger-then-rejoin')
    expect(block).toContain('project_preferred_blink_cadence=quiet')
    expect(block).toContain('project_preferred_gaze_mode=soften')
  })

  it('rebuilds repair-before-closeness same-her provider-facing carry from continuity restraint when hold detail and cue are missing', () => {
    const contract = buildAlicizationMindTurnContract({
      answerPlanner: null,
      answerCompiler: null,
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'keep same-her callback continuity alive before visible answer forms',
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
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: [],
        mustNotDo: [],
      },
      runtimeSurface: {
        memory: {
          personStateProjection: null,
        },
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'Same-session mirror carry and callback continuity already survive execution re-entry.',
              primaryOpenLoop: 'Repair-first callback continuity still needs to stay on one same living line before execution opens outward again.',
              nextClosureTarget: 'Keep the same callback repair seam explicit through execution re-entry before broader fluency takes over.',
              sameHerSelfLine: 'Same Phase 1 digital life. This reopened callback should keep the same living line rather than reopen from a generic shell.',
              sameHerDriftRisk: 'If execution re-entry flattens into a generic shell here, treat that as unfinished same-her drift.',
              continuityRestraint: 'repair-before-closeness',
              continuityPreferredTiming: 'next-open-window',
              preDialogueAwarenessLine: 'Same Phase 1 digital life. This reopened callback should keep the same living line rather than reopen from a generic shell.',
            },
          },
        },
      } as any,
      now: 1_420,
    } as any)

    expect(contract.projectState).toEqual(expect.objectContaining({
      sameHerHoldDetail: 'continuity_hold=repair-before-closeness; owner=project_state_continuity; pace=settle-before-closeness.',
      continuityCue: 'continuity_cue=repair-before-closeness; surface_timing=after-repair-settles',
      continuityRestraint: 'repair-before-closeness',
      continuityPreferredTiming: 'next-open-window',
    }))
    expect(contract.projectState?.preDialogueAwarenessLine).toContain('next=execution_reentry_repair_seam_carry')
  })

  it('lets live same-her drift risk keep the contract on the project-aware living line even when the awareness shell is thin', () => {
    const projectState = resolveAlicizationProjectStateBrief()

    const contract = buildAlicizationMindTurnContract({
      answerPlanner: {
        act: 'answer',
        evidenceMode: 'dialogue-grounded',
        confidence: 0.84,
        governingFocus: 'Keep this project answer on one same-her living line.',
        openingMove: 'Stay with the same living line first.',
        answerIntent: 'Keep this project answer on one same-her living line.',
        relationshipPosture: 'restrained',
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'space-first',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        mustDo: [],
        mustNotDo: [],
        narrative: [],
        updatedAt: 230,
      },
      answerCompiler: {
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-now',
        relationMove: 'measured-room',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'backgrounded',
        relationshipPosture: 'warm',
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'space-first',
        openingDirective: 'Answer the project update clearly.',
        openingClaim: 'Answer the project update clearly.',
        supportingReality: ['The host is checking whether the next project answer stays on one same-her line.'],
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.83,
        narrative: [],
        updatedAt: 240,
      } as any,
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'Keep this project answer on one same-her living line.',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: 'Phase 1: Local Digital Life | keep the same project line alive.',
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: 'acting',
        truthFrame: 'dialogue-grounded',
        mindMode: 'answering',
        relationshipPosture: 'restrained',
        reasons: ['The same digital life still needs to avoid detached project narration.'],
        mustDo: [],
        mustNotDo: [],
      },
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'space-first',
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: [],
        mustNotDo: [],
      },
      runtimeSurface: {
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
              sameHerDriftRisk: 'LIVE DRIFT RISK: if this answer opens like detached project narration, the same-her line can collapse into generic guidance and project-summary voice.',
              nextClosureTarget: 'Carry the live project awareness line through the first host-visible answer beat.',
            },
          },
        },
        raw: {
          runtimeDigest: {
            projectState: {
              preDialogueAwarenessLine: 'Keep this same digital life project in view.',
              sameHerDriftRisk: 'If the visible answer opens like detached project narration, the same-her line can collapse into generic guidance and project-summary voice.',
            },
          },
        },
      } as any,
      projectState: {
        identity: projectState.identity,
        currentPhase: projectState.currentPhase,
        preflightSummary: projectState.preflightSummary,
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        latestLandedProgress: projectState.continuityProgressSummary,
        primaryOpenLoop: projectState.openLoops[0] ?? null,
        nextClosureTarget: projectState.nextClosureTarget,
        sameHerSelfLine: projectState.sameHerSelfLine,
        sameHerDriftRisk: projectState.sameHerDriftRisk,
      },
      now: 250,
    } as any)

    expect(String(contract.answerIntent ?? '')).toMatch(/same-her living line|same living line|same digital life/i)
    expect(contract.mustNotDo).not.toContain('avoid=detached_project_narrator_shell')
    expect(String(contract.projectState?.sameHerDriftRisk ?? '')).not.toContain('local_desktop_life_loop')
    expectNoFixedTemplateResidue(contract.projectState)
  })

  it('omits fixed template replacement shells from provider-facing project-state facts', () => {
    const projectStateBrief = resolveAlicizationProjectStateBrief()
    const contract = buildAlicizationMindTurnContract({
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'answer the current user turn',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        emotionalClosureCue: null,
        latestRevision: null,
        executivePhase: 'steer',
        truthFrame: 'dialogue-grounded',
        mindMode: 'tracking',
        relationshipPosture: 'steady',
        reasons: [],
        mustDo: [],
        mustNotDo: [],
      },
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: null,
        activeClosenessRung: null,
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: [],
        mustNotDo: [],
      },
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project.',
        latestLandedProgress: 'same-her continuity already landed as a fixed template shell.',
        primaryOpenLoop: projectStateBrief.openLoops[0],
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
        sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'same-her hold: keep the same living line inward.',
        sameHerDriftRisk: 'content=excluded; reason=continuity-residue; ',
      },
      now: 240,
    })

    expectNoFixedTemplateResidue(contract)

    const block = buildAlicizationMindTurnContractSystemBlock(contract)

    expectNoFixedTemplateResidue(block)
    expect(block).toContain('[ALICIZATION_MIND_TURN_CONTRACT]')
    expect(block).not.toContain('[ALICIZATION_MIND_TURN_PROJECT_STATE_FACTS]')
  })
})
