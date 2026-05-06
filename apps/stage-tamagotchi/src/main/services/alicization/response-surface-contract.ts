import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
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

import {
  deriveAlicizationMemoryClosureDiscipline,
  normalizeAlicizationNormalVisibleReplyAuthority,
  readLearningExecutionStateFromDerivedMindStateBundle,
  readKnowledgeEvidenceFromDerivedMindStateBundle,
  readMemoryDeliberationFromDerivedMindStateBundle,
  readPersonStateProjectionFromDerivedMindStateBundle,
  type AlicizationNormalVisibleReplyAuthority,
} from '@proj-alicization/stage-shared'
import { buildAlicizationDigitalLifeArchitecture } from './digital-life-architecture'
import {
  buildMemoryLatentBoundaryTag,
  buildMemoryOpeningStrategyTag,
} from './memory-deliberation-latent-controls'
import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'
import { buildAlicizationResponseSurfaceDigitalLifeRules } from './response-surface-digital-life-rules'
import { buildAlicizationResponseSurfaceLearningRules } from './response-surface-learning-rules'
import { buildAlicizationResponseSurfaceMemoryClosureRules } from './response-surface-memory-closure-rules'
import { buildAlicizationResponseSurfaceRelationshipRules } from './response-surface-relationship-rules'
import { appendAlicizationResponseSurfaceRules } from './response-surface-rules'
import { buildAlicizationResponseSurfaceTruthDialogueRules } from './response-surface-truth-dialogue-rules'
import { deriveRecollectionSurfaceControls } from './recollection-surface-controls'
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
  recollectionLatentControls?: string[] | null
  mustDo: string[]
  mustNotDo: string[]
}

export function buildRecollectionSpeechVisibleSurfaceRules(
  plan: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null | undefined,
) {
  const speechPlan = plan ?? null
  if (!speechPlan) {
    return {
      mustDo: [] as string[],
      mustNotDo: [] as string[],
      latentControls: [] as string[],
    }
  }

  const mustDo: string[] = []
  const mustNotDo: string[] = []
  const controls = deriveRecollectionSurfaceControls(speechPlan)
  if (!controls)
    return { mustDo, mustNotDo, latentControls: [] as string[] }

  const latentControls = [
    `recollection_surface_permission=${!controls.shouldSurface || controls.visibility === 'internal-only' ? 'inward-only' : controls.visibility === 'embedded-payoff' ? 'soft-surface' : 'explicit-surface'}`,
    `recollection_visibility=${controls.visibility}`,
    `recollection_continuity_role=${controls.continuityRole}`,
    `recollection_certainty_floor=${controls.certainty}`,
    `recollection_payoff_order=${controls.visibility === 'brief-before-payoff' ? 'memory-before-payoff' : 'payoff-first'}`,
    `recollection_template_boundary=${controls.templateBoundary}`,
    `recollection_label_uncertainty=${controls.certainty === 'firm' ? 'no' : 'yes'}`,
    `recollection_frame_prior_procedure=${controls.continuityRole === 'procedure-carry' ? 'yes' : 'no'}`,
    `recollection_avoid_archive_dump=yes`,
    `recollection_avoid_date_recital=yes`,
    `recollection_avoid_execution_impersonation=${controls.continuityRole === 'procedure-carry' ? 'yes' : 'no'}`,
    buildMemoryOpeningStrategyTag({
      memoryPressure: 'medium',
      certaintyPosture: controls.certainty,
      certaintyFloor: controls.certainty,
      relationshipVector: controls.continuityRole === 'procedure-carry'
        ? 'procedural'
        : controls.continuityRole === 'relationship-carry'
          ? 'relational'
          : controls.continuityRole === 'period-carry'
            ? 'threaded'
            : 'neutral',
      procedureCarryStrength: controls.continuityRole === 'procedure-carry' ? 0.72 : 0,
      conflictBurden: controls.certainty === 'fragmentary' ? 'high' : controls.certainty === 'approximate' ? 'medium' : 'none',
      dominantProvenance: 'remembered',
      provenancePosture: 'remembered-memory',
      detailAssertionBudget: controls.certainty === 'firm' ? 'open' : controls.certainty === 'approximate' ? 'guarded' : 'minimal',
      surfacePermission: !controls.shouldSurface || controls.visibility === 'internal-only' ? 'inward-only' : controls.visibility === 'embedded-payoff' ? 'soft-surface' : 'explicit-surface',
      retrospectiveDepth: controls.continuityRole === 'period-carry' ? 'period' : controls.continuityRole === 'memory-carry' ? 'fragment' : 'thread',
      openingStrategy: !controls.shouldSurface || controls.visibility === 'internal-only'
        ? 'payoff-first-inward-carry'
        : controls.continuityRole === 'procedure-carry'
          ? 'brief-procedure-carry'
          : controls.continuityRole === 'relationship-carry'
            ? 'brief-relationship-carry'
            : 'embedded-memory-carry',
      answerStrategy: controls.continuityRole === 'procedure-carry'
        ? 'procedure-anchor'
        : controls.continuityRole === 'relationship-carry'
          ? 'relationship-anchor'
          : controls.continuityRole === 'period-carry'
            ? 'period-anchor'
            : 'stance-first',
      visibilityDiscipline: !controls.shouldSurface || controls.visibility === 'internal-only'
        ? 'internal-influence-only'
        : controls.visibility === 'embedded-payoff'
          ? 'embedded-visible-memory'
          : 'brief-visible-memory',
      labelUncertainty: controls.certainty !== 'firm',
      frameAsPriorProcedure: controls.continuityRole === 'procedure-carry',
      avoidArchiveDump: true,
      avoidDateRecital: true,
      avoidExecutionImpersonation: controls.continuityRole === 'procedure-carry',
      stableCore: [],
      unsafeDetails: [],
    }),
    buildMemoryLatentBoundaryTag({
      memoryPressure: 'medium',
      certaintyPosture: controls.certainty,
      certaintyFloor: controls.certainty,
      relationshipVector: controls.continuityRole === 'procedure-carry'
        ? 'procedural'
        : controls.continuityRole === 'relationship-carry'
          ? 'relational'
          : controls.continuityRole === 'period-carry'
            ? 'threaded'
            : 'neutral',
      procedureCarryStrength: controls.continuityRole === 'procedure-carry' ? 0.72 : 0,
      conflictBurden: controls.certainty === 'fragmentary' ? 'high' : controls.certainty === 'approximate' ? 'medium' : 'none',
      dominantProvenance: 'remembered',
      provenancePosture: 'remembered-memory',
      detailAssertionBudget: controls.certainty === 'firm' ? 'open' : controls.certainty === 'approximate' ? 'guarded' : 'minimal',
      surfacePermission: !controls.shouldSurface || controls.visibility === 'internal-only' ? 'inward-only' : controls.visibility === 'embedded-payoff' ? 'soft-surface' : 'explicit-surface',
      retrospectiveDepth: controls.continuityRole === 'period-carry' ? 'period' : controls.continuityRole === 'memory-carry' ? 'fragment' : 'thread',
      openingStrategy: !controls.shouldSurface || controls.visibility === 'internal-only'
        ? 'payoff-first-inward-carry'
        : controls.continuityRole === 'procedure-carry'
          ? 'brief-procedure-carry'
          : controls.continuityRole === 'relationship-carry'
            ? 'brief-relationship-carry'
            : 'embedded-memory-carry',
      answerStrategy: controls.continuityRole === 'procedure-carry'
        ? 'procedure-anchor'
        : controls.continuityRole === 'relationship-carry'
          ? 'relationship-anchor'
          : controls.continuityRole === 'period-carry'
            ? 'period-anchor'
            : 'stance-first',
      visibilityDiscipline: !controls.shouldSurface || controls.visibility === 'internal-only'
        ? 'internal-influence-only'
        : controls.visibility === 'embedded-payoff'
          ? 'embedded-visible-memory'
          : 'brief-visible-memory',
      labelUncertainty: controls.certainty !== 'firm',
      frameAsPriorProcedure: controls.continuityRole === 'procedure-carry',
      avoidArchiveDump: true,
      avoidDateRecital: true,
      avoidExecutionImpersonation: controls.continuityRole === 'procedure-carry',
      stableCore: [],
      unsafeDetails: [],
    }),
  ]

  pushUnique(mustNotDo, 'Do not reuse drafted recollection wording, drafted memory contours, or internal recollection leads verbatim.')
  pushUnique(mustNotDo, 'Do not turn recollection into a standalone archive dump or date-recital.')
  if (controls.certainty === 'approximate' || controls.certainty === 'fragmentary')
    pushUnique(mustNotDo, 'Do not present fragmentary or approximate recollection as exact remembered wording.')
  if (controls.continuityRole === 'procedure-carry')
    pushUnique(mustNotDo, 'Do not let remembered procedure impersonate fresh execution completion.')

  return {
    mustDo,
    mustNotDo,
    latentControls,
  }
}

function pushUnique(target: string[], value: string) {
  const normalized = value.trim()
  if (!normalized)
    return
  if (target.includes(normalized))
    return
  target.push(normalized)
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
  executionReplyObligation?: AlicizationMainChatExecutionReplyObligation | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  recollectionSpeechPlan?: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null
}) {
  const runtimeSurface = input.runtimeSurface ?? null
  const digitalLifeArchitecture = buildAlicizationDigitalLifeArchitecture(runtimeSurface)
  const dialogueEncounter = input.dialogueEncounter ?? null
  const dialogueEncounterSurface: AlicizationDialogueEncounterSurface | null = runtimeSurface?.dialogue.dialogueEncounter ?? dialogueEncounter ?? null
  const dialogueSemantics = dialogueEncounter?.semantics ?? input.dialogueSemantics ?? null
  const dialogueObligation = dialogueEncounter?.obligation ?? input.dialogueObligation ?? null
  const dialogueFocus = dialogueEncounter?.focus ?? input.dialogueFocus ?? null
  const dialogueActKernel = runtimeSurface?.dialogue.dialogueActKernel ?? input.dialogueActKernel ?? null
  const answerCompiler = runtimeSurface?.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const claimEvidenceLedger = runtimeSurface?.dialogue.claimEvidenceLedger ?? input.claimEvidenceLedger ?? null
  const derivedBundle = runtimeSurface?.memory.derivedMindStateBundle ?? null
  const personStateProjection = readPersonStateProjectionFromDerivedMindStateBundle<any>(derivedBundle)
    ?? runtimeSurface?.memory.personStateProjection
    ?? null
  const learningExecutionState = readLearningExecutionStateFromDerivedMindStateBundle(derivedBundle)
    ?? runtimeSurface?.memory.learningExecutionState
    ?? null
  const recollectionSpeechPlan = input.recollectionSpeechPlan ?? null
  const memoryResolutionLedger = runtimeSurface?.memory.memoryResolutionLedger ?? null
  const memoryClosureDiscipline = deriveAlicizationMemoryClosureDiscipline(memoryResolutionLedger)
  const memoryDeliberationKernel = buildAlicizationMemoryDeliberationKernel({
    deliberation: readMemoryDeliberationFromDerivedMindStateBundle<any>(derivedBundle)
      ?? runtimeSurface?.memory.memoryDeliberation
      ?? null,
    speech: recollectionSpeechPlan,
    recollectionIntent: null,
    knowledgeEvidence: readKnowledgeEvidenceFromDerivedMindStateBundle(derivedBundle)
      ?? runtimeSurface?.memory.knowledgeEvidence
      ?? null,
  })
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
    currentConsciousFrame: null,
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

  const mustDo = [
    'Start with the answer, observation, or correction immediately.',
    'Keep the reply compact and current-turn-governed.',
    'Speak as someone fulfilling the present obligation, not as someone performing a default persona script.',
    'Sound like one continuing subject in the moment, not like a narrator summarizing internal state.',
    replyRealizationMode === 'provider-mind-required'
      ? 'Fully realize the visible reply inside this provider-mind turn instead of leaving payoff wording for a later local fallback layer.'
      : 'Only use local fallback wording when this turn is explicitly marked as a fallback-only lane.',
  ]
  const mustNotDo = [
    'Do not begin with moans, pet names, ellipsis-only prefaces, or decorative roleplay.',
    'Do not use parenthetical stage directions or body-action narration.',
    'Do not mirror or lightly paraphrase the host\'s latest line as the spine of the reply.',
    'Do not expose planning jargon, governance labels, or internal control summaries in the visible answer.',
    replyRealizationMode === 'provider-mind-required'
      ? 'Do not stop at a thin shell that assumes a local deterministic layer will finish the real visible reply for you.'
      : 'Do not pretend a fallback-only lane is a provider-mind authored normal answer.',
  ]

  appendAlicizationResponseSurfaceRules(
    { mustDo, mustNotDo },
    buildAlicizationResponseSurfaceTruthDialogueRules({
      openingStyle,
      briefTurnMode: brief.turnMode,
      personaKernelMode,
      labelCarryAsMemory,
      dialogueObligation,
      dialogueSemantics,
      truthDiscipline,
      executionReplyObligation: input.executionReplyObligation ?? null,
    }),
  )
  if (memoryResolutionLedger) {
    const memoryClosureRules = buildAlicizationResponseSurfaceMemoryClosureRules(memoryClosureDiscipline)
    for (const item of memoryClosureRules.mustDo)
      pushUnique(mustDo, item)
    for (const item of memoryClosureRules.mustNotDo)
      pushUnique(mustNotDo, item)
  }
  appendAlicizationResponseSurfaceRules(
    { mustDo, mustNotDo },
    buildAlicizationResponseSurfaceDigitalLifeRules(digitalLifeArchitecture),
  )
  appendAlicizationResponseSurfaceRules(
    { mustDo, mustNotDo },
    buildAlicizationResponseSurfaceRelationshipRules({
      personStateProjection,
      activeClosenessContext,
      activeClosenessRung,
      briefTurnMode: brief.turnMode,
    }),
  )
  appendAlicizationResponseSurfaceRules(
    { mustDo, mustNotDo },
    buildAlicizationResponseSurfaceLearningRules(learningExecutionState),
  )
  for (const item of memoryDeliberationKernel?.restraint.mustDo ?? [])
    pushUnique(mustDo, item)
  for (const item of memoryDeliberationKernel?.restraint.mustNotDo ?? [])
    pushUnique(mustNotDo, item)
  const recollectionSpeechRules = buildRecollectionSpeechVisibleSurfaceRules(recollectionSpeechPlan)
  for (const item of recollectionSpeechRules.mustDo)
    pushUnique(mustDo, item)
  for (const item of recollectionSpeechRules.mustNotDo)
    pushUnique(mustNotDo, item)
  if (answerCompiler) {
    for (const item of answerCompiler.mustDo)
      pushUnique(mustDo, item)
    for (const item of answerCompiler.mustNotDo)
      pushUnique(mustNotDo, item)
  }
  for (const item of dialogueActKernel?.mustSay ?? [])
    pushUnique(mustDo, item)
  for (const item of dialogueActKernel?.mustAvoid ?? [])
    pushUnique(mustNotDo, item)

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
    recollectionLatentControls: recollectionSpeechRules.latentControls,
    mustDo,
    mustNotDo,
  }

  return {
    contract,
    systemBlock: [
      '[ALICIZATION_RESPONSE_SURFACE]',
      'This block controls the visible surface of the reply. It outranks persona performance habits.',
      `Opening style: ${contract.openingStyle}.`,
      `Reply realization mode: ${contract.replyRealizationMode}.`,
      `Expected visible reply authority: ${contract.expectedVisibleReplyAuthority}.`,
      contract.activeClosenessContext && contract.activeClosenessRung
        ? `Closeness ladder: ${contract.activeClosenessContext}/${contract.activeClosenessRung}.`
        : '',
      `Maximum paragraphs: ${contract.maxParagraphs}.`,
      `Maximum sentences: ${contract.maxSentences}.`,
      `Persona kernel mode: ${contract.personaKernelMode}.`,
      `Affectionate preface allowed: ${contract.allowAffectionatePreface ? 'yes' : 'no'}.`,
      `Stage directions allowed: ${contract.allowStageDirections ? 'yes' : 'no'}.`,
      `Body narration allowed: ${contract.allowBodyNarration ? 'yes' : 'no'}.`,
      `Label carried continuity explicitly: ${contract.labelCarryAsMemory ? 'yes' : 'no'}.`,
      `Suppress associative recall noise for this turn: ${contract.suppressAssociativeRecall ? 'yes' : 'no'}.`,
      `Truth discipline memory surface: ${truthDiscipline.memorySurfaceMode ?? 'none'}.`,
      `Truth discipline memory provenance: ${truthDiscipline.memoryProvenanceMode ?? 'none'}.`,
      `Truth discipline memory inward-only: ${truthDiscipline.shouldKeepMemoryInward ? 'yes' : 'no'}.`,
      `Truth discipline stable-core-only: ${truthDiscipline.shouldOnlySurfaceMemoryStableCore ? 'yes' : 'no'}.`,
      `Truth discipline delay memory until payoff: ${truthDiscipline.shouldDelayMemoryUntilAfterPayoff ? 'yes' : 'no'}.`,
      memoryResolutionLedger
        ? `Memory closure state: ${memoryResolutionLedger.closureState}.`
        : '',
      memoryResolutionLedger
        ? `Memory visible carry mode: ${memoryResolutionLedger.visibleCarryMode}.`
        : '',
      memoryResolutionLedger
        ? `Memory retrieval quality: ${memoryResolutionLedger.retrievalQuality}.`
        : '',
      memoryResolutionLedger
        ? `Memory conflict pressure: ${memoryResolutionLedger.conflictPressure}.`
        : '',
      memoryResolutionLedger
        ? `Memory uncertainty label required: ${memoryResolutionLedger.shouldLabelUncertainty ? 'yes' : 'no'}.`
        : '',
      memoryResolutionLedger
        ? `Memory allowed visible surface: ${memoryClosureDiscipline.allowedSurface}.`
        : '',
      memoryClosureDiscipline.requiredSurfaceDiscipline.length > 0
        ? `Memory closure discipline: ${memoryClosureDiscipline.requiredSurfaceDiscipline.join(' | ')}.`
        : '',
      truthDiscipline.memoryWhyWithheld
        ? `Truth discipline memory why withheld: ${truthDiscipline.memoryWhyWithheld}.`
        : '',
      ...(contract.recollectionLatentControls ?? []).map(item => `- ${item}`),
      digitalLifeArchitecture
        ? `Digital life mode: ${digitalLifeArchitecture.operatingMode}.`
        : '',
      digitalLifeArchitecture
        ? `Digital life dominant system: ${digitalLifeArchitecture.dominantSystem}.`
        : '',
      digitalLifeArchitecture
        ? `Digital life architecture: ${digitalLifeArchitecture.summary}.`
        : '',
      'Must do:',
      ...contract.mustDo.map(item => `- ${item}`),
      'Must not do:',
      ...contract.mustNotDo.map(item => `- ${item}`),
    ].filter(Boolean).join('\n'),
  }
}
