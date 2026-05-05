import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'

import { mergeGuidanceLine, mergeUniqueRules } from './runtime-turn-composition'

export interface RuntimeAnswerPlannerReducerInput {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  governance: AlicizationMindTurnGovernance | null
  now: number
}

export function reduceRuntimeAnswerPlanner(input: RuntimeAnswerPlannerReducerInput) {
  const surface = input.surface ?? null
  const governance = input.governance ?? null
  if (!surface || !governance)
    return surface
  if (surface.dialogue.answerPlanner && surface.dialogue.replyDeliberation && surface.dialogue.dialogueActKernel)
    return surface

  const answerIntent = governance.answerIntent ?? governance.focusAnchor ?? governance.liveSurface ?? ''
  const openingMove = governance.openingMove ?? answerIntent

  return {
    ...surface,
    dialogue: {
      ...surface.dialogue,
      replyDeliberation: surface.dialogue.replyDeliberation ?? {
        selectedMotive: governance.answerAct === 'care' ? 'care' : governance.answerAct === 'guide' ? 'guide' : 'answer',
        speakingFrom: governance.screenReferenceMode === 'avoid' ? 'dialogue-bond' : 'task-thread',
        memoryMode: governance.suppressAssociativeRecall ? 'suppress-associative' : 'dialogue-carry',
        openingBeat: openingMove,
        whyThisReplyNow: answerIntent,
        whyNotOtherCandidates: [],
        withheldImpulses: [],
        candidateMotives: [],
        shouldSpeak: true,
        mustInclude: mergeUniqueRules(governance.mustDo ?? [], 10),
        mustAvoid: mergeUniqueRules(governance.mustNotDo ?? [], 10),
        confidence: 0.72,
        narrative: ['runtime-answer-planner'],
        updatedAt: input.now,
      },
      answerPlanner: surface.dialogue.answerPlanner ?? {
        act: governance.answerAct ?? 'answer',
        evidenceMode: governance.evidenceMode ?? 'dialogue-grounded',
        confidence: 0.72,
        governingFocus: answerIntent,
        openingMove,
        answerIntent,
        relationshipPosture: governance.relationshipPosture ?? 'warm',
        shouldAskForGrounding: governance.shouldAskForGrounding,
        shouldAcknowledgeRepair: governance.shouldAcknowledgeRepair,
        selectedConcernEntryId: null,
        selectedRepairId: null,
        selectedCommitmentId: null,
        selectedInquiryPlanId: null,
        selectedRuntimeThreadId: null,
        selectedProjectId: null,
        selectedReflectionId: null,
        executivePhase: null,
        selectedTruthFrame: null,
        mustDo: mergeUniqueRules(governance.mustDo ?? [], 10),
        mustNotDo: mergeUniqueRules(governance.mustNotDo ?? [], 10),
        narrative: ['runtime-answer-planner'],
        updatedAt: input.now,
      },
      dialogueActKernel: surface.dialogue.dialogueActKernel ?? {
        subject: governance.answerSubject ?? 'general',
        hostGoal: governance.answerAct === 'care' ? 'rest' : 'resolve-problem',
        relationNeed: governance.answerSubject === 'relationship' ? 'companionship' : governance.answerAct === 'care' ? 'care' : 'guidance',
        activeProject: null,
        truthMode: governance.screenReferenceMode === 'avoid' ? 'memory-only' : governance.evidenceMode ?? 'dialogue-grounded',
        speechAct: governance.answerAct ?? 'answer',
        turnMode: governance.turnMode,
        screenReferenceMode: governance.screenReferenceMode ?? 'avoid',
        speakingFrom: governance.screenReferenceMode === 'avoid' ? 'dialogue-bond' : 'task-thread',
        selectedEvidence: [],
        openingClaim: mergeGuidanceLine([governance.focusAnchor ?? null, governance.liveSurface ?? null], 220) || answerIntent,
        openingMove,
        whyNow: answerIntent,
        mustSay: mergeUniqueRules([answerIntent, ...(governance.mustDo ?? [])], 8),
        mustAvoid: mergeUniqueRules(governance.mustNotDo ?? [], 8),
        sourceTrace: ['runtime-answer-planner'],
        confidence: 0.72,
        updatedAt: input.now,
      },
    },
  } satisfies AlicizationDigitalLifeRuntimeSurface
}
