import type { AlicizationNormalVisibleReplyAuthority } from '@proj-alicization/stage-shared'

import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialogueActKernelSnapshot,
  AlicizationDialogueTurnEncounterSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueFocusGovernance } from './dialogue-focus-governor'
import type { AlicizationDialogueObligation, AlicizationPersonaKernelMode } from './dialogue-obligation'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationExecutiveAnswerBrief } from './executive-answer-brief'
import type { AlicizationMainChatExecutionReplyObligation } from './main-chat-execution-reply-obligation'
import type { AlicizationResponseCharter } from './response-charter'
import type { OrganicMemoryPromptContext } from './runtime-soul'
import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import {
  normalizeAlicizationNormalVisibleReplyAuthority,
  readKnowledgeEvidenceFromDerivedMindStateBundle,
  readMemoryDeliberationFromDerivedMindStateBundle,
  readPersonStateProjectionFromDerivedMindStateBundle,
} from '@proj-alicization/stage-shared'

import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'
import { resolvePreferredPersonStateProjection } from './person-state-projection-resolution'
import { deriveAlicizationTruthDiscipline } from './truth-discipline'

export interface AlicizationResponseSurfaceContract {
  openingStyle: 'direct-observation' | 'direct-correction' | 'direct-answer' | 'gentle-care' | 'light-accompaniment'
  replyRealizationMode?: 'provider-mind-required' | 'fallback-locally-allowed'
  expectedVisibleReplyAuthority?: AlicizationNormalVisibleReplyAuthority
  activeClosenessContext?: string | null
  activeClosenessRung?: string | null
  maxParagraphs: number
  maxSentences: number
  personaKernelMode: AlicizationPersonaKernelMode
  allowAffectionatePreface: boolean
  allowStageDirections: boolean
  allowBodyNarration: boolean
  labelCarryAsMemory: boolean
  suppressAssociativeRecall: boolean
  activeSelfRevisionPatchId?: string | null
  mustDo: string[]
  mustNotDo: string[]
}

function resolveAffectionatePrefaceAllowance(input: {
  personaKernelMode: AlicizationPersonaKernelMode
  briefTurnMode: AlicizationExecutiveAnswerBrief['turnMode']
  relationshipPosture: AlicizationResponseCharter['relationshipPosture']
  activeClosenessRung?: string | null
}) {
  if (input.personaKernelMode !== 'full')
    return false
  if (!input.activeClosenessRung)
    return input.briefTurnMode === 'care' && input.relationshipPosture !== 'restrained'
  if (input.activeClosenessRung === 'close-hold')
    return input.briefTurnMode === 'care' || input.briefTurnMode === 'accompany'
  if (input.activeClosenessRung === 'warm-near')
    return input.briefTurnMode === 'care'
  return false
}

interface AlicizationDialogueEncounterSurface extends Pick<
  AlicizationDialogueTurnEncounterSnapshot,
  'subject' | 'screenReferenceMode'
> {}

export function buildAlicizationResponseSurfaceContract(input: {
  brief: AlicizationExecutiveAnswerBrief
  charter: AlicizationResponseCharter
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  executionReplyObligation?: AlicizationMainChatExecutionReplyObligation | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  recollectionSpeechPlan?: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null
  selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null
}) {
  const runtimeSurface = input.runtimeSurface ?? null
  const dialogueEncounter = input.dialogueEncounter ?? null
  const dialogueEncounterSurface: AlicizationDialogueEncounterSurface | null = runtimeSurface?.dialogue.dialogueEncounter ?? dialogueEncounter ?? null
  const dialogueObligation = dialogueEncounter?.obligation ?? input.dialogueObligation ?? null
  const dialogueFocus = dialogueEncounter?.focus ?? input.dialogueFocus ?? null
  const answerCompiler = runtimeSurface?.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const claimEvidenceLedger = runtimeSurface?.dialogue.claimEvidenceLedger ?? input.claimEvidenceLedger ?? null
  const currentConsciousFrame = runtimeSurface?.dialogue.currentConsciousFrame ?? input.currentConsciousFrame ?? null
  const derivedBundle = runtimeSurface?.memory.derivedMindStateBundle ?? null
  const personStateProjection = resolvePreferredPersonStateProjection({
    bundleProjection: readPersonStateProjectionFromDerivedMindStateBundle<any>(derivedBundle),
    runtimeProjection: runtimeSurface?.memory.personStateProjection ?? null,
  }) ?? null
  const recollectionSpeechPlan = input.recollectionSpeechPlan
    ?? runtimeSurface?.memory.recollectionSpeechPlan
    ?? null
  const memoryDeliberationKernel = buildAlicizationMemoryDeliberationKernel({
    deliberation: readMemoryDeliberationFromDerivedMindStateBundle<any>(derivedBundle)
      ?? runtimeSurface?.memory.memoryDeliberation
      ?? null,
    speech: recollectionSpeechPlan,
    recollectionIntent: (derivedBundle?.recollectionIntent as OrganicMemoryPromptContext['recollectionIntent']) ?? null,
    knowledgeEvidence: readKnowledgeEvidenceFromDerivedMindStateBundle(derivedBundle)
      ?? runtimeSurface?.memory.knowledgeEvidence
      ?? null,
    hostPersonModel: (derivedBundle?.hostPersonModel as OrganicMemoryPromptContext['hostPersonModel']) ?? runtimeSurface?.memory.hostPersonModel ?? null,
  })
  const selfRevisionPatch = input.selfRevisionPatch ?? null
  const { brief, charter } = input
  const truthDiscipline = deriveAlicizationTruthDiscipline({
    answerSubject: dialogueEncounterSurface?.subject ?? dialogueFocus?.subject ?? answerCompiler?.answerSubject ?? null,
    screenReferenceMode: dialogueEncounterSurface?.screenReferenceMode ?? dialogueFocus?.screenReferenceMode ?? answerCompiler?.screenReferenceMode ?? null,
    truthState: brief.truthState,
    turnMode: answerCompiler?.turnMode ?? brief.turnMode,
    repairState: brief.turnMode === 'screen-repair' ? 'stale-anchor' : 'none',
    evidenceMode: answerCompiler?.evidenceMode ?? claimEvidenceLedger?.evidenceMode ?? null,
    labelCarryAsMemory: (answerCompiler?.labelCarryAsMemory ?? brief.separateCarryFromSurface) || brief.truthState === 'remembered',
    suppressAssociativeRecall: answerCompiler?.suppressAssociativeRecall ?? false,
    claimEvidenceLedger,
    currentConsciousFrame,
    memoryRestraint: memoryDeliberationKernel?.restraint ?? null,
  })

  const openingStyle = input.executionReplyObligation
    ? 'direct-answer' as const
    : answerCompiler?.openingStyle ?? (() => {
      if (brief.turnMode === 'grounded-inspection')
        return 'direct-observation' as const
      if (brief.turnMode === 'screen-repair')
        return 'direct-correction' as const
      if (brief.turnMode === 'care')
        return 'gentle-care' as const
      if (brief.turnMode === 'accompany')
        return 'light-accompaniment' as const
      return 'direct-answer' as const
    })()

  const personaKernelMode: AlicizationPersonaKernelMode = answerCompiler?.personaKernelMode
    ?? dialogueObligation?.personaKernelMode
    ?? (brief.turnMode === 'screen-repair'
      ? 'muted'
      : brief.turnMode === 'guide-current-knot'
        ? 'backgrounded'
        : 'full')
  const maxParagraphs = brief.turnMode === 'care' || brief.turnMode === 'accompany' ? 2 : 2
  const maxSentences = answerCompiler?.maxSentences ?? (brief.turnMode === 'care'
    ? 5
    : brief.turnMode === 'accompany'
      ? 3
      : brief.turnMode === 'grounded-inspection' || brief.turnMode === 'screen-repair'
        ? 4
        : 4)
  const expectedVisibleReplyAuthority = normalizeAlicizationNormalVisibleReplyAuthority(
    answerCompiler?.expectedVisibleReplyAuthority ?? null,
    'llm-mind',
  )
  const replyRealizationMode = 'provider-mind-required' as const
  const activeClosenessContext = personStateProjection?.activeClosenessContext ?? charter.activeClosenessContext ?? null
  const activeClosenessRung = personStateProjection?.activeClosenessRung ?? charter.activeClosenessRung ?? null
  const allowAffectionatePreface = resolveAffectionatePrefaceAllowance({
    personaKernelMode,
    briefTurnMode: brief.turnMode,
    relationshipPosture: charter.relationshipPosture,
    activeClosenessRung,
  })
  const allowStageDirections = false
  const allowBodyNarration = false
  const explicitDialogueFirstSurfaceAvoid = dialogueEncounterSurface?.screenReferenceMode === 'avoid'
    || dialogueFocus?.screenReferenceMode === 'avoid'
    || answerCompiler?.screenReferenceMode === 'avoid'
  const baseLabelCarryAsMemory = answerCompiler?.labelCarryAsMemory
    ?? (brief.separateCarryFromSurface || brief.truthState === 'remembered' || brief.truthState === 'uncertain')
  const labelCarryAsMemory = truthDiscipline.shouldKeepMemoryInward || truthDiscipline.shouldBlockScreenCarry
    ? false
    : truthDiscipline.shouldLabelMemoryProvenance
      ? true
      : baseLabelCarryAsMemory
  const suppressAssociativeRecall = truthDiscipline.shouldSuppressAssociativeRecall || (answerCompiler?.suppressAssociativeRecall ?? (brief.turnMode === 'grounded-inspection'
    || (brief.turnMode === 'screen-repair' && (brief.separateCarryFromSurface || brief.carriedThread !== null))
    || brief.turnMode === 'guide-current-knot'
    || explicitDialogueFirstSurfaceAvoid))
  const contract: AlicizationResponseSurfaceContract = {
    openingStyle,
    replyRealizationMode,
    expectedVisibleReplyAuthority,
    activeClosenessContext,
    activeClosenessRung,
    maxParagraphs,
    maxSentences,
    personaKernelMode,
    allowAffectionatePreface,
    allowStageDirections,
    allowBodyNarration,
    labelCarryAsMemory,
    suppressAssociativeRecall,
    activeSelfRevisionPatchId: selfRevisionPatch?.id ?? null,
    mustDo: [],
    mustNotDo: [],
  }

  return {
    contract,
    systemBlock: '',
  }
}
