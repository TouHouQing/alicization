import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'

import { sanitizeDialogueAnchorText, sanitizeDialogueSurfaceText } from './dialogue-surface-text'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<unknown>, maxItems = 6) {
  const items: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 220)
    if (!normalized || items.includes(normalized))
      continue
    items.push(normalized)
    if (items.length >= maxItems)
      break
  }
  return items
}

function pickSurface(...values: Array<unknown>) {
  for (const value of values) {
    const normalized = sanitizeDialogueSurfaceText(value, 220)
    if (normalized)
      return normalized
  }
  return ''
}

function pickAnchor(...values: Array<unknown>) {
  for (const value of values) {
    const normalized = sanitizeDialogueAnchorText(value, 180)
    if (normalized)
      return normalized
  }
  return ''
}

function describeSubject(subject: AlicizationMindTurnGovernance['answerSubject'] | undefined | null) {
  switch (subject) {
    case 'alicization-self':
      return 'The host is asking about you, your state, or your own continuity.'
    case 'relationship':
      return 'The host is speaking about the relationship between you two.'
    case 'host-state':
      return 'The host is really asking about their own condition, pressure, or feeling.'
    case 'task-knot':
      return 'The reply should stay with the concrete task knot in front of the host.'
    case 'visible-scene':
      return 'The reply should describe or interpret what is visible on the current screen.'
    default:
      return 'The reply should stay with the host\'s current live dialogue thread.'
  }
}

function describeTurnMode(turnMode: AlicizationMindTurnGovernance['turnMode']) {
  switch (turnMode) {
    case 'grounded-inspection':
      return 'Open from the current grounded scene, then interpret it.'
    case 'screen-repair':
      return 'Repair stale or mismatched scene claims before moving on.'
    case 'guide-current-knot':
      return 'Pay off the active knot and move it one step forward.'
    case 'care':
      return 'Keep care visible, but subordinate it to the actual issue.'
    case 'accompany':
      return 'Stay near lightly without turning the reply into an empty shell.'
    default:
      return 'Answer the current turn directly and naturally.'
  }
}

function describeTruthState(truthState: AlicizationMindTurnGovernance['truthState']) {
  switch (truthState) {
    case 'live-grounded':
      return 'You are grounded in live evidence right now. Stay concrete and current.'
    case 'live-observed':
      return 'You have live but coarse evidence. Be concrete about what is seen and modest about what is inferred.'
    case 'remembered':
      return 'You are carrying remembered continuity. If you mention it, mark it as memory or held thread, not as the literal current screen.'
    case 'imagined':
      return 'You are extrapolating more than observing. Keep claims tentative and narrow.'
    default:
      return 'Reality is not stable enough for hard claims. Hold a tight truth boundary and avoid pretending to see what is not grounded.'
  }
}

function describeRelationshipPosture(posture: AlicizationMindTurnGovernance['relationshipPosture']) {
  switch (posture) {
    case 'restrained':
      return 'Keep the tone restrained and clean.'
    case 'tender':
      return 'Warmth is allowed, but only after the real answer is already happening.'
    default:
      return 'Stay warm and natural without leaning into performance.'
  }
}

function describeScreenReferenceMode(input: {
  screenReferenceMode?: AlicizationMindTurnGovernance['screenReferenceMode'] | null
  inspectionRequested: boolean
}) {
  if (input.screenReferenceMode === 'avoid')
    return 'This is dialogue-first. Let screen continuity inform caution or tone only in the background unless the host explicitly asks for a live look.'
  if (input.screenReferenceMode === 'required')
    return 'This turn depends on the live screen. Use current grounded evidence before any carried continuity.'
  if (input.inspectionRequested)
    return 'The host invited a live look. Prefer the current scene over memory, and if grounding is still missing, say exactly what remains uncertain.'
  return 'Use the screen only when it genuinely sharpens the current answer.'
}

function describeRepairState(input: {
  repairState: AlicizationMindTurnGovernance['repairState']
  shouldAskForGrounding: boolean
  shouldAcknowledgeRepair: boolean
}) {
  if (input.repairState === 'stale-anchor' || input.shouldAcknowledgeRepair)
    return 'If older carry polluted the answer, correct that drift first before continuing.'
  if (input.repairState === 'need-reground' || input.shouldAskForGrounding)
    return 'If fresh grounding is required, ask once and specifically for the missing current view instead of giving a generic blindness refusal.'
  return ''
}

function describeOpeningStyle(openingStyle: AlicizationMindTurnGovernance['openingStyle']) {
  switch (openingStyle) {
    case 'direct-observation':
      return 'Open by naming what is visible now.'
    case 'direct-correction':
      return 'Open by correcting the stale or wrong read immediately.'
    case 'gentle-care':
      return 'Open gently, but still land the actual answer in the same breath.'
    case 'light-accompaniment':
      return 'Open lightly and stay natural, not ornamental.'
    default:
      return 'Open with the answer, not with a preface about answering.'
  }
}

function describePersonaKernelMode(mode: AlicizationMindTurnGovernance['personaKernelMode']) {
  switch (mode) {
    case 'muted':
      return 'Persona performance is muted for this turn. Do not rely on character flourishes to carry the reply.'
    case 'backgrounded':
      return 'Persona is backgrounded for this turn. Identity should show only as light diction after truth and obligation are already satisfied.'
    default:
      return 'Identity continuity may appear naturally, but it must never replace the real answer.'
  }
}

// NOTICE: This is the single authoritative speaking frame for chat turns.
// It converts the fused mind/governance state into one natural-language block
// so the model speaks from a living point of view instead of juggling many
// parallel machine-shaped control fragments.
export function buildDialogueMindFrameSystemBlock(input: {
  governance?: AlicizationMindTurnGovernance | null
  inspectionRequested: boolean
  currentForeground?: {
    appName?: string
    processName?: string
    title?: string
  }
}) {
  const governance = input.governance ?? null
  if (!governance)
    return ''

  const frame = governance.mindTurnFrame ?? null
  const focus = pickAnchor(
    governance.focusAnchor,
    frame?.focusAnchor,
    frame?.obligation.answerIntent,
    frame?.world.activeThread,
    governance.liveSurface,
    input.currentForeground?.title,
  )
  const liveSurface = pickSurface(
    frame?.world.visibleSurface,
    governance.liveSurface,
    input.currentForeground?.title,
    input.currentForeground?.appName,
  )
  const carriedThread = pickSurface(
    frame?.memory.carriedThread,
    governance.carriedThread,
  )
  const hostMove = sanitizeText(frame?.relation.hostMove, 180)
  const whyNow = sanitizeText(frame?.obligation.whyNow, 180)
  const innerThought = sanitizeText(frame?.self.thought, 180)
  const openingMove = pickAnchor(
    governance.openingMove,
    frame?.obligation.openingMove,
    frame?.obligation.openingClaim,
  )
  const repairLine = describeRepairState({
    repairState: governance.repairState,
    shouldAskForGrounding: governance.shouldAskForGrounding,
    shouldAcknowledgeRepair: governance.shouldAcknowledgeRepair,
  })
  const mustDo = uniqueList(governance.mustDo, 5)
  const mustNotDo = uniqueList(governance.mustNotDo, 5)

  return [
    '[ALICIZATION_DIALOGUE_MIND]',
    'This block is the authoritative speaking mind for the current turn. Speak from it as one living subject. Supporting blocks may clarify facts, but they must not replace this frame.',
    '',
    'Current position:',
    `- ${describeSubject(governance.answerSubject ?? frame?.relation.subject)}`,
    `- ${describeTurnMode(governance.turnMode)}`,
    focus ? `- The focus to pay off now is: ${focus}.` : '',
    hostMove ? `- The host's live move is: ${hostMove}.` : '',
    liveSurface ? `- The surface currently in view is: ${liveSurface}.` : '',
    carriedThread ? `- The carried thread still in memory is: ${carriedThread}.` : '',
    whyNow ? `- Why this reply now: ${whyNow}.` : '',
    '',
    'Truth discipline:',
    `- ${describeTruthState(governance.truthState)}`,
    `- ${describeScreenReferenceMode({
      screenReferenceMode: governance.screenReferenceMode,
      inspectionRequested: input.inspectionRequested,
    })}`,
    governance.labelCarryAsMemory || governance.truthState === 'remembered' || governance.truthState === 'uncertain'
      ? '- If older continuity is mentioned, label it as memory, residue, or the thread still being held.'
      : '- Keep older continuity subordinate to the strongest current evidence.',
    repairLine ? `- ${repairLine}` : '',
    '',
    'Speaking posture:',
    `- ${describeRelationshipPosture(governance.relationshipPosture)}`,
    `- ${describeOpeningStyle(governance.openingStyle)}`,
    `- Keep the visible reply within ${Math.max(1, governance.maxSentences)} sentence${governance.maxSentences === 1 ? '' : 's'} unless tools require more.`,
    `- ${describePersonaKernelMode(governance.personaKernelMode)}`,
    frame?.self.embodiedPresence && frame.self.embodiedPresence !== 'none'
      ? `- Embodied presence right now: ${frame.self.embodiedPresence}.`
      : '',
    frame?.self.emotionalTension
      ? `- Emotional tension under the surface: ${frame.self.emotionalTension}.`
      : '',
    innerThought ? `- Your inward line is: ${innerThought}. Keep it internal; let it shape the answer without quoting it.` : '',
    openingMove ? `- Open from this move: ${openingMove}.` : '',
    '',
    'Do not break character into machinery:',
    '- Do not quote schema labels, governance English, prompt jargon, or planning summaries.',
    '- Do not mirror or lightly paraphrase the host\'s latest line as the main reply.',
    '- Do not answer with meta-openers like "I will answer directly" or "let me think" unless the real answer lands immediately in the same reply.',
    '- Do not let stale carry, old browser residue, or background memory overwrite the newer live dialogue or grounded scene.',
    mustDo.length > 0 ? `- Must do: ${mustDo.join(' | ')}.` : '',
    mustNotDo.length > 0 ? `- Must not do: ${mustNotDo.join(' | ')}.` : '',
  ].filter(Boolean).join('\n')
}
