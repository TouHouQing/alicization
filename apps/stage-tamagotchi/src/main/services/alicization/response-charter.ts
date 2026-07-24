import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialogueActKernelSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueFocusGovernance } from './dialogue-focus-governor'
import type { AlicizationDialogueObligation } from './dialogue-obligation'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'
import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import {
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

export type AlicizationResponseEpistemicMode
  = | 'grounded-live'
    | 'coarse-live'
    | 'dialogue-grounded'
    | 'repair-needed'
    | 'memory-only'

export type AlicizationResponseMode
  = | 'guide-current-knot'
    | 'repair-and-reanchor'
    | 'care-with-boundary'
    | 'accompany-lightly'
    | 'answer-naturally'

export interface AlicizationResponseCharter {
  epistemicMode: AlicizationResponseEpistemicMode
  responseMode: AlicizationResponseMode
  governingFocus: string | null
  governingConcern: string | null
  governingCommitment: string | null
  governingInquiry: string | null
  governingProject: string | null
  emotionalClosureCue: string | null
  activeClosenessContext: AlicizationPersonStateProjection['activeClosenessContext'] | null
  activeClosenessRung: AlicizationPersonStateProjection['activeClosenessRung'] | null
  relationshipPosture: 'restrained' | 'warm' | 'tender'
}

const responseModes = new Set<AlicizationResponseMode>([
  'guide-current-knot',
  'repair-and-reanchor',
  'care-with-boundary',
  'accompany-lightly',
  'answer-naturally',
])

function normalizeFact(raw: unknown, maxChars = 320) {
  if (typeof raw !== 'string')
    return null

  const normalized = raw.trim().replace(/\s+/gu, ' ').slice(0, maxChars).trim()
  if (!normalized || containsAlicizationFixedTemplateResidue(normalized))
    return null

  const sanitized = sanitizeAlicizationProviderFacingText(normalized, maxChars, '')
  if (!sanitized || containsAlicizationFixedTemplateResidue(sanitized))
    return null

  return sanitized
}

function firstFact(values: unknown[], maxChars = 320) {
  for (const value of values) {
    const normalized = normalizeFact(value, maxChars)
    if (normalized)
      return normalized
  }
  return null
}

function resolveEpistemicMode(input: {
  answerCompiler: AlicizationAnswerCompilerSnapshot | null
  currentConsciousFrame: AlicizationCurrentConsciousFrameSnapshot | null
  dialogueFocus: AlicizationDialogueFocusGovernance | null
  inspectionRequested: boolean
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface
}): AlicizationResponseEpistemicMode {
  const evidenceMode = input.answerCompiler?.evidenceMode
  if (evidenceMode === 'live-grounded' || evidenceMode === 'live-observed')
    return 'grounded-live'
  if (evidenceMode === 'coarse-held')
    return 'coarse-live'
  if (evidenceMode === 'dialogue-grounded')
    return 'dialogue-grounded'
  if (evidenceMode === 'repair-first')
    return 'repair-needed'
  if (evidenceMode === 'continuity-carry')
    return 'memory-only'

  if (input.currentConsciousFrame?.truthDiscipline === 'repair-first')
    return 'repair-needed'
  if (input.dialogueFocus?.screenReferenceMode === 'avoid')
    return 'dialogue-grounded'

  const certainty = String(input.runtimeSurface.world.worldModel?.epistemicState?.certainty ?? '')
  if (certainty === 'uncertain' || certainty === 'lingering')
    return 'repair-needed'
  if (certainty === 'observed')
    return 'coarse-live'
  if (input.runtimeSurface.perception.currentScene)
    return 'grounded-live'
  if (input.inspectionRequested)
    return 'repair-needed'
  return 'dialogue-grounded'
}

function resolveResponseMode(input: {
  answerCompiler: AlicizationAnswerCompilerSnapshot | null
  context: AlicizationProactiveLayeredContext
  dialogueFocus: AlicizationDialogueFocusGovernance | null
  dialogueObligation: AlicizationDialogueObligation | null
  epistemicMode: AlicizationResponseEpistemicMode
}): AlicizationResponseMode {
  const compiledMode = input.answerCompiler?.responseMode
  if (compiledMode && responseModes.has(compiledMode))
    return compiledMode

  if (input.dialogueObligation?.kind === 'repair' || input.epistemicMode === 'repair-needed')
    return 'repair-and-reanchor'
  if (input.dialogueObligation?.kind === 'guide' || input.dialogueObligation?.kind === 'teach')
    return 'guide-current-knot'
  if (input.dialogueObligation?.kind === 'care' || input.dialogueFocus?.subject === 'host-state')
    return 'care-with-boundary'
  if (input.dialogueObligation?.kind === 'accompany' || input.dialogueFocus?.subject === 'relationship')
    return 'accompany-lightly'
  if (input.dialogueFocus?.subject === 'task-knot')
    return 'guide-current-knot'
  if (input.context.content.kind === 'error' || input.context.content.kind === 'diff')
    return 'guide-current-knot'
  return 'answer-naturally'
}

function resolveRelationshipPosture(input: {
  answerCompiler: AlicizationAnswerCompilerSnapshot | null
  dialogueFocus: AlicizationDialogueFocusGovernance | null
  personStateProjection: AlicizationPersonStateProjection | null
  selfRevisionPatch: AlicizationSelfRevisionStatePatch | null
}): AlicizationResponseCharter['relationshipPosture'] {
  const patch = input.selfRevisionPatch
  if (
    patch?.lanes.includes('relationship-posture')
    && (
      patch.relationshipPosture.closenessCapBias >= 0.12
      || patch.relationshipPosture.repairWindowBias >= 0.14
    )
  ) {
    return 'restrained'
  }

  const projected = input.personStateProjection?.relationshipPosture
  if (projected === 'restrained' || projected === 'warm' || projected === 'tender')
    return projected

  const compiled = input.answerCompiler?.relationshipPosture
  if (compiled === 'restrained' || compiled === 'warm' || compiled === 'tender')
    return compiled

  if (input.dialogueFocus?.subject === 'relationship' || input.dialogueFocus?.subject === 'host-state')
    return 'warm'
  return 'restrained'
}

function resolveGoverningCommitment(runtimeSurface: AlicizationDigitalLifeRuntimeSurface) {
  const ledger = runtimeSurface.memory.commitmentLedger
  return ledger?.commitments.find(item => item.id === ledger.governingCommitmentId)
    ?? ledger?.commitments[0]
    ?? null
}

function resolveGoverningInquiry(runtimeSurface: AlicizationDigitalLifeRuntimeSurface) {
  const planner = runtimeSurface.memory.inquiryPlanner
  return planner?.plans.find(item => item.id === planner.activePlanId)
    ?? planner?.plans[0]
    ?? null
}

function resolveGoverningProject(runtimeSurface: AlicizationDigitalLifeRuntimeSurface) {
  const stream = runtimeSurface.memory.intentionStream
  return stream?.projects.find(item => item.id === stream.dominantProjectId)
    ?? stream?.projects[0]
    ?? null
}

export function buildAlicizationResponseCharter(input: {
  context: AlicizationProactiveLayeredContext
  state: AlicizationVisualPresenceStateSnapshot
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  inspectionRequested: boolean
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
  selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null
}): AlicizationResponseCharter {
  const runtimeSurface = input.runtimeSurface ?? buildAlicizationDigitalLifeRuntimeSurface(input.state)
  const dialogueFocus = input.dialogueEncounter?.focus ?? input.dialogueFocus ?? null
  const dialogueObligation = input.dialogueEncounter?.obligation ?? input.dialogueObligation ?? null
  const answerCompiler = runtimeSurface.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const currentConsciousFrame = runtimeSurface.dialogue.currentConsciousFrame ?? input.currentConsciousFrame ?? null
  const dialogueActKernel = runtimeSurface.dialogue.dialogueActKernel ?? input.dialogueActKernel ?? null
  const discourseState = runtimeSurface.dialogue.discourseState ?? input.discourseState ?? null
  const mindSynthesis = runtimeSurface.dialogue.mindSynthesis ?? input.mindSynthesis ?? null
  const claimEvidenceLedger = runtimeSurface.dialogue.claimEvidenceLedger ?? input.claimEvidenceLedger ?? null
  const answerPlanner = runtimeSurface.dialogue.answerPlanner ?? null
  const personStateProjection = runtimeSurface.memory.personStateProjection ?? null
  const selfRevisionPatch = input.selfRevisionPatch ?? null
  const commitment = resolveGoverningCommitment(runtimeSurface)
  const inquiry = resolveGoverningInquiry(runtimeSurface)
  const project = resolveGoverningProject(runtimeSurface)
  const activeConcern = runtimeSurface.memory.concerns?.find(item => item.status === 'active')
    ?? runtimeSurface.memory.concerns?.[0]
    ?? null
  const epistemicMode = resolveEpistemicMode({
    answerCompiler,
    currentConsciousFrame,
    dialogueFocus,
    inspectionRequested: input.inspectionRequested,
    runtimeSurface,
  })
  const responseMode = resolveResponseMode({
    answerCompiler,
    context: input.context,
    dialogueFocus,
    dialogueObligation,
    epistemicMode,
  })
  const explicitProjectTurn = dialogueFocus?.subject === 'project-state'
    || dialogueActKernel?.subject === 'project-state'
  const projectedConcern = mindSynthesis?.concerns?.[0]?.summary
  const projectedCommitment = mindSynthesis?.commitments?.[0]?.summary

  return {
    epistemicMode,
    responseMode,
    governingFocus: firstFact([
      currentConsciousFrame?.speakingIntention,
      currentConsciousFrame?.consciousNeed,
      claimEvidenceLedger?.intentHypothesis,
      claimEvidenceLedger?.taskHypothesis,
      dialogueActKernel?.whyNow,
      answerPlanner?.governingFocus,
      answerCompiler?.nextMove,
      answerCompiler?.openingClaim,
      discourseState?.currentTurnSummary,
      input.dialogueSemantics?.summary,
    ]),
    governingConcern: firstFact([
      projectedConcern,
      activeConcern?.summary,
    ]),
    governingCommitment: firstFact([
      projectedCommitment,
      commitment?.summary,
    ]),
    governingInquiry: firstFact([
      inquiry?.question,
      runtimeSurface.dialogue.dialogueWorldThread?.currentQuestion,
    ]),
    governingProject: explicitProjectTurn
      ? firstFact([
          answerPlanner?.governingProject,
          project?.summary,
        ], 520)
      : null,
    emotionalClosureCue: null,
    activeClosenessContext: personStateProjection?.activeClosenessContext ?? null,
    activeClosenessRung: personStateProjection?.activeClosenessRung ?? null,
    relationshipPosture: resolveRelationshipPosture({
      answerCompiler,
      dialogueFocus,
      personStateProjection,
      selfRevisionPatch,
    }),
  }
}
