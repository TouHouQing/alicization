import type { AlicizationDialogueObligation, AlicizationPersonaKernelMode } from './dialogue-obligation'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationExecutiveAnswerBrief } from './executive-answer-brief'
import type { AlicizationResponseCharter } from './response-charter'

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

export function buildAlicizationResponseSurfaceContract(input: {
  brief: AlicizationExecutiveAnswerBrief
  charter: AlicizationResponseCharter
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
}) {
  const { brief, charter } = input

  const openingStyle = (() => {
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

  const personaKernelMode: AlicizationPersonaKernelMode = input.dialogueObligation?.personaKernelMode
    ?? (brief.turnMode === 'screen-repair'
      ? 'muted'
      : brief.turnMode === 'guide-current-knot'
        ? 'backgrounded'
        : 'full')
  const maxParagraphs = brief.turnMode === 'care' || brief.turnMode === 'accompany' ? 2 : 2
  const maxSentences = brief.turnMode === 'care'
    ? 5
    : brief.turnMode === 'accompany'
      ? 3
      : brief.turnMode === 'grounded-inspection' || brief.turnMode === 'screen-repair'
        ? 4
        : 4

  const allowAffectionatePreface = personaKernelMode === 'full'
    && brief.turnMode === 'care'
    && charter.relationshipPosture !== 'restrained'
  const allowStageDirections = false
  const allowBodyNarration = false
  const labelCarryAsMemory = brief.separateCarryFromSurface || brief.truthState === 'remembered' || brief.truthState === 'uncertain'
  const suppressAssociativeRecall = brief.turnMode === 'grounded-inspection'
    || (brief.turnMode === 'screen-repair' && (brief.separateCarryFromSurface || brief.carriedThread !== null))
    || brief.turnMode === 'guide-current-knot'

  const mustDo = [
    'Start with the answer, observation, or correction immediately.',
    'Keep the reply compact and current-turn-governed.',
    'Speak as someone fulfilling the present obligation, not as someone performing a default persona script.',
  ]
  const mustNotDo = [
    'Do not begin with moans, pet names, ellipsis-only prefaces, or decorative roleplay.',
    'Do not use parenthetical stage directions or body-action narration.',
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
  if (input.dialogueObligation?.mustAnswerDirectly) {
    pushUnique(mustDo, 'Use the first sentence to pay off the host’s current ask.')
  }
  if (input.dialogueObligation?.mustStayTaskBound) {
    pushUnique(mustDo, 'Keep the reply inside the active knot until the knot is answered.')
  }
  if (personaKernelMode !== 'full') {
    pushUnique(mustNotDo, 'Do not use persona flourishes, pet names, or coy prefaces as the reply spine.')
  }
  if (input.dialogueSemantics?.truthExpectation === 'strict') {
    pushUnique(mustNotDo, 'Do not smooth over uncertainty with emotionally pleasing language.')
  }
  if (brief.turnMode === 'care' || brief.turnMode === 'accompany') {
    pushUnique(mustDo, 'If warmth appears, keep it brief and subordinate to the actual issue.')
  }
  if (labelCarryAsMemory) {
    pushUnique(mustDo, 'If carried continuity is mentioned, label it as memory, residue, or the thread still being held.')
    pushUnique(mustNotDo, 'Do not present carried continuity as the literal current screen.')
  }

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
      'Must do:',
      ...contract.mustDo.map(item => `- ${item}`),
      'Must not do:',
      ...contract.mustNotDo.map(item => `- ${item}`),
    ].join('\n'),
  }
}
