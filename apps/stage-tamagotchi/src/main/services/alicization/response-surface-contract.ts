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

import { buildAlicizationDigitalLifeArchitecture } from './digital-life-architecture'
import { buildMainChatExecutionReplyVisibleSurfaceRules } from './main-chat-execution-reply-obligation'
import { deriveAlicizationTruthDiscipline } from './truth-discipline'

export interface AlicizationResponseSurfaceContract {
  openingStyle: 'direct-observation' | 'direct-correction' | 'direct-answer' | 'gentle-care' | 'light-accompaniment'
  maxParagraphs: number
  maxSentences: number
  personaKernelMode: AlicizationPersonaKernelMode
  allowAffectionatePreface: boolean
  allowStageDirections: boolean
  allowBodyNarration: boolean
  labelCarryAsMemory: boolean
  suppressAssociativeRecall: boolean
  mustDo: string[]
  mustNotDo: string[]
}

function pushUnique(target: string[], value: string) {
  const normalized = value.trim()
  if (!normalized)
    return
  if (target.includes(normalized))
    return
  target.push(normalized)
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

  const allowAffectionatePreface = personaKernelMode === 'full'
    && brief.turnMode === 'care'
    && charter.relationshipPosture !== 'restrained'
  const allowStageDirections = false
  const allowBodyNarration = false
  const explicitDialogueFirstSurfaceAvoid = dialogueEncounterSurface?.screenReferenceMode === 'avoid'
    || dialogueFocus?.screenReferenceMode === 'avoid'
    || answerCompiler?.screenReferenceMode === 'avoid'
  const labelCarryAsMemory = truthDiscipline.shouldBlockScreenCarry
    ? false
    : (answerCompiler?.labelCarryAsMemory ?? (brief.separateCarryFromSurface || brief.truthState === 'remembered' || brief.truthState === 'uncertain'))
  const suppressAssociativeRecall = truthDiscipline.shouldSuppressAssociativeRecall || (answerCompiler?.suppressAssociativeRecall ?? (brief.turnMode === 'grounded-inspection'
    || (brief.turnMode === 'screen-repair' && (brief.separateCarryFromSurface || brief.carriedThread !== null))
    || brief.turnMode === 'guide-current-knot'
    || explicitDialogueFirstSurfaceAvoid))

  const mustDo = [
    'Start with the answer, observation, or correction immediately.',
    'Keep the reply compact and current-turn-governed.',
    'Speak as someone fulfilling the present obligation, not as someone performing a default persona script.',
    'Sound like one continuing subject in the moment, not like a narrator summarizing internal state.',
  ]
  const mustNotDo = [
    'Do not begin with moans, pet names, ellipsis-only prefaces, or decorative roleplay.',
    'Do not use parenthetical stage directions or body-action narration.',
    'Do not mirror or lightly paraphrase the host\'s latest line as the spine of the reply.',
    'Do not expose planning jargon, governance labels, or internal control summaries in the visible answer.',
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
    maxParagraphs,
    maxSentences,
    personaKernelMode,
    allowAffectionatePreface,
    allowStageDirections,
    allowBodyNarration,
    labelCarryAsMemory,
    suppressAssociativeRecall,
    mustDo,
    mustNotDo,
  }

  return {
    contract,
    systemBlock: [
      '[ALICIZATION_RESPONSE_SURFACE]',
      'This block controls the visible surface of the reply. It outranks persona performance habits.',
      `Opening style: ${contract.openingStyle}.`,
      `Maximum paragraphs: ${contract.maxParagraphs}.`,
      `Maximum sentences: ${contract.maxSentences}.`,
      `Persona kernel mode: ${contract.personaKernelMode}.`,
      `Affectionate preface allowed: ${contract.allowAffectionatePreface ? 'yes' : 'no'}.`,
      `Stage directions allowed: ${contract.allowStageDirections ? 'yes' : 'no'}.`,
      `Body narration allowed: ${contract.allowBodyNarration ? 'yes' : 'no'}.`,
      `Label carried continuity explicitly: ${contract.labelCarryAsMemory ? 'yes' : 'no'}.`,
      `Suppress associative recall noise for this turn: ${contract.suppressAssociativeRecall ? 'yes' : 'no'}.`,
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
