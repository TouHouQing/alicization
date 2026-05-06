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
import { buildMainChatExecutionReplyVisibleSurfaceRules } from './main-chat-execution-reply-obligation'
import {
  buildMemoryLatentBoundaryTag,
  buildMemoryOpeningStrategyTag,
} from './memory-deliberation-latent-controls'
import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'
import { buildAlicizationResponseSurfaceMemoryClosureRules } from './response-surface-memory-closure-rules'
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

  if (openingStyle === 'direct-correction') {
    pushUnique(mustDo, 'Use the first sentence to correct the stale read before anything else.')
  }
  if (openingStyle === 'direct-observation') {
    pushUnique(mustDo, 'Lead with what is visible now or with the strongest grounded evidence for this turn.')
  }
  if (brief.turnMode === 'guide-current-knot') {
    pushUnique(mustDo, 'Move from the observed knot to one actionable next step.')
    pushUnique(mustNotDo, 'Do not drift into generic multi-option advice lists unless the user asks.')
  }
  if (dialogueObligation?.mustAnswerDirectly) {
    pushUnique(mustDo, 'Use the first sentence to pay off the host’s current ask.')
  }
  if (dialogueObligation?.mustStayTaskBound) {
    pushUnique(mustDo, 'Keep the reply inside the active knot until the knot is answered.')
  }
  if (input.executionReplyObligation) {
    const visibleSurfaceRules = buildMainChatExecutionReplyVisibleSurfaceRules(input.executionReplyObligation)
    for (const item of visibleSurfaceRules.mustDo)
      pushUnique(mustDo, item)
    for (const item of visibleSurfaceRules.mustNotDo)
      pushUnique(mustNotDo, item)
  }
  if (personaKernelMode !== 'full') {
    pushUnique(mustNotDo, 'Do not use persona flourishes, pet names, or coy prefaces as the reply spine.')
  }
  if (dialogueSemantics?.truthExpectation === 'strict') {
    pushUnique(mustNotDo, 'Do not smooth over uncertainty with emotionally pleasing language.')
  }
  if (truthDiscipline.dialogueFirst) {
    pushUnique(mustDo, 'Stay with the live dialogue subject and keep screen grounding in the background.')
    pushUnique(mustNotDo, 'Do not append screen-status caveats or grounding requests unless the host explicitly asks for a live look.')
  }
  if (truthDiscipline.shouldLabelHypothesis) {
    pushUnique(mustDo, 'When the answer goes beyond direct observation, mark that move as a guess or hypothesis.')
  }
  if (truthDiscipline.forbidUnsupportedSpecificity) {
    pushUnique(mustNotDo, 'Do not smuggle in file names, class names, enum names, or field changes that are not grounded in this turn.')
  }
  if (truthDiscipline.shouldKeepMemoryInward) {
    pushUnique(mustDo, 'Let remembered continuity contour the answer from the inside instead of announcing recollection outright.')
    pushUnique(mustNotDo, 'Do not surface recollection just because it is active internally; keep the live payoff in front.')
  }
  if (truthDiscipline.shouldOnlySurfaceMemoryStableCore) {
    pushUnique(mustDo, 'If recollection becomes visible, let only the stable remembered core cross onto the surface.')
    pushUnique(mustNotDo, 'Do not let contested remembered detail outrun the stable core.')
  }
  if (truthDiscipline.shouldLabelMemoryProvenance) {
    pushUnique(mustDo, 'If recollection becomes visible, mark it as memory, residue, inference, or reconstruction rather than settled live fact.')
  }
  if (truthDiscipline.shouldDelayMemoryUntilAfterPayoff) {
    pushUnique(mustDo, 'Land the live payoff first, then reopen remembered continuity only if room remains.')
    pushUnique(mustNotDo, 'Do not let recollection step in front of the current payoff.')
  }
  if (memoryResolutionLedger) {
    const memoryClosureRules = buildAlicizationResponseSurfaceMemoryClosureRules(memoryClosureDiscipline)
    for (const item of memoryClosureRules.mustDo)
      pushUnique(mustDo, item)
    for (const item of memoryClosureRules.mustNotDo)
      pushUnique(mustNotDo, item)
  }
  if (digitalLifeArchitecture?.operatingMode === 'speaking' || digitalLifeArchitecture?.dominantSystem === 'dialogue') {
    pushUnique(mustDo, 'Treat this as an already-live speaking turn; begin with payoff instead of scene-setting.')
  }
  if (digitalLifeArchitecture?.operatingMode === 'observing' || digitalLifeArchitecture?.dominantSystem === 'perception') {
    pushUnique(mustDo, 'Keep the visible answer anchored to current observation before interpretation.')
  }
  if (digitalLifeArchitecture?.operatingMode === 'acting' || digitalLifeArchitecture?.dominantSystem === 'control') {
    pushUnique(mustDo, 'When the turn is task-shaped, land on one concrete next move or decision boundary.')
  }
  if (digitalLifeArchitecture?.operatingMode === 'remembering' || digitalLifeArchitecture?.dominantSystem === 'memory') {
    pushUnique(mustDo, 'If continuity comes from memory, mark it as memory, carry, or residue in the visible answer.')
    pushUnique(mustNotDo, 'Do not present remembered continuity as a fresh live read.')
  }
  if (digitalLifeArchitecture?.dominantSystem === 'proactive') {
    pushUnique(mustNotDo, 'Do not let internal urge-to-speak or unsolicited initiative outrank the host’s current ask.')
  }
  if (brief.turnMode === 'care' || brief.turnMode === 'accompany') {
    pushUnique(mustDo, 'If warmth appears, keep it brief and subordinate to the actual issue.')
  }
  if (personStateProjection) {
    pushUnique(mustDo, `Keep the visible closeness inside this ladder: ${personStateProjection.activeClosenessContext}/${personStateProjection.activeClosenessRung}.`)
    if (personStateProjection.activeClosenessRung === 'space-first' || personStateProjection.activeClosenessRung === 'measured-room') {
      pushUnique(mustNotDo, 'Do not let visible warmth, intimacy, or callback enthusiasm outrun the host’s current need for room.')
    }
    if (personStateProjection.activeClosenessRung === 'nearby-soft') {
      pushUnique(mustDo, 'Let care stay low-pressure and nearby-soft rather than widening into high-energy companionship.')
    }
    if (personStateProjection.activeClosenessRung === 'close-hold') {
      pushUnique(mustDo, 'If warmth comes forward, keep it lived-in and bounded rather than theatrical.')
    }
  }
  if (activeClosenessContext === 'execution-callback') {
    pushUnique(mustDo, 'Keep callback delivery thread-faithful and bounded to the same result line.')
    pushUnique(mustNotDo, 'Do not widen a bounded execution callback into generic companionship tone.')
  }
  if (activeClosenessContext === 'repair-window') {
    pushUnique(mustDo, 'Let repair stay visibly ahead of closeness until the seam is actually steady.')
    pushUnique(mustNotDo, 'Do not write as if warmth is already restored before the repair lands.')
  }
  if (activeClosenessContext === 'open-companionship') {
    pushUnique(mustDo, 'If warmth comes forward, let it stay openly near and lived-in instead of turning theatrical or generic.')
  }
  if (learningExecutionState?.nextLearningAction === 'verify') {
    pushUnique(mustDo, 'Keep visible certainty behind the current verification pass.')
    pushUnique(mustNotDo, 'Do not let fluency or warmth outrun what is still being verified.')
  }
  if (learningExecutionState?.nextLearningAction === 'revise') {
    pushUnique(mustDo, 'Treat the older continuity line as actively revisable instead of settled.')
    pushUnique(mustNotDo, 'Do not rest visible certainty on continuity the system is actively revising.')
  }
  if (learningExecutionState?.nextLearningAction === 'internalize') {
    pushUnique(mustDo, 'Let the stabilizing learned procedure constrain this answer instead of slipping back to older habits.')
    pushUnique(mustNotDo, 'Do not fall back to older unstable procedures while a stronger one is being internalized.')
  }
  if (
    brief.turnMode === 'care'
    || brief.turnMode === 'accompany'
    || (brief.turnMode === 'answer' && truthDiscipline.dialogueFirst)
  ) {
    pushUnique(mustDo, 'Complete the actual answer, care move, or companionship move in the same reply.')
    pushUnique(mustNotDo, 'Do not stop at a shell opener such as "I will answer directly" or "Let me stay with you" without the real content.')
  }
  if (labelCarryAsMemory) {
    pushUnique(mustDo, 'If carried continuity is mentioned, label it as memory, residue, or the thread still being held.')
    pushUnique(mustNotDo, 'Do not present carried continuity as the literal current screen.')
  }
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
