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
      return 'Answer subject: Alicization self, self-state, or continuity.'
    case 'relationship':
      return 'Answer subject: the host and Alicization relationship.'
    case 'host-state':
      return 'Answer subject: the host state, pressure, or feeling.'
    case 'task-knot':
      return 'Answer subject: the current concrete task.'
    case 'visible-scene':
      return 'Answer subject: the current visible scene.'
    default:
      return 'Answer subject: the current live dialogue thread.'
  }
}

function describeTurnMode(turnMode: AlicizationMindTurnGovernance['turnMode']) {
  switch (turnMode) {
    case 'grounded-inspection':
      return 'Turn mode: grounded inspection. Current scene evidence comes first.'
    case 'screen-repair':
      return 'Turn mode: screen repair. Correct stale scene claims first.'
    case 'guide-current-knot':
      return 'Turn mode: guide the current knot one step forward.'
    case 'care':
      return 'Turn mode: care. The actual issue outranks care style.'
    case 'accompany':
      return 'Turn mode: accompany. Empty companionship shells are blocked.'
    default:
      return 'Turn mode: direct answer. The current turn comes first.'
  }
}

function describeTruthState(truthState: AlicizationMindTurnGovernance['truthState']) {
  switch (truthState) {
    case 'live-grounded':
      return 'Truth state: live grounded. Use current evidence and keep claims concrete.'
    case 'live-observed':
      return 'Truth state: live observed. Evidence is coarse; keep inference modest.'
    case 'remembered':
      return 'Truth state: remembered. Label memory as memory, not as the literal current screen.'
    case 'imagined':
      return 'Truth state: imagined. Keep claims tentative and narrow.'
    default:
      return 'Truth state: uncertain. Hard claims and ungrounded sight claims are blocked.'
  }
}

function describeRelationshipPosture(posture: AlicizationMindTurnGovernance['relationshipPosture']) {
  switch (posture) {
    case 'restrained':
      return 'Relationship posture: restrained.'
    case 'tender':
      return 'Relationship posture: tender, with warmth after the answer lands.'
    default:
      return 'Relationship posture: natural; performance style is blocked.'
  }
}

function describeScreenReferenceMode(input: {
  screenReferenceMode?: AlicizationMindTurnGovernance['screenReferenceMode'] | null
  inspectionRequested: boolean
}) {
  if (input.screenReferenceMode === 'avoid')
    return 'Screen reference mode: avoid. Treat screen continuity as background unless there is an explicit live look.'
  if (input.screenReferenceMode === 'required')
    return 'Screen reference mode: required. Current grounded evidence outranks carried continuity.'
  if (input.inspectionRequested)
    return 'Screen reference mode: invited. Current scene evidence outranks memory; surface missing grounding explicitly.'
  return 'Screen reference mode: optional. Use screen context only when relevant to the answer.'
}

function describeRepairState(input: {
  repairState: AlicizationMindTurnGovernance['repairState']
  shouldAskForGrounding: boolean
  shouldAcknowledgeRepair: boolean
}) {
  if (input.repairState === 'stale-anchor' || input.shouldAcknowledgeRepair)
    return 'Repair signal: stale anchor. Correct older carry pollution first.'
  if (input.repairState === 'need-reground' || input.shouldAskForGrounding)
    return 'Repair signal: needs regrounding. Ask once for the missing current view; generic blindness refusal is blocked.'
  return ''
}

function describeOpeningStyle(openingStyle: AlicizationMindTurnGovernance['openingStyle']) {
  switch (openingStyle) {
    case 'direct-observation':
      return 'Opening style: direct observation. Start from what is visible now.'
    case 'direct-correction':
      return 'Opening style: direct correction. Correct stale or wrong reads first.'
    case 'gentle-care':
      return 'Opening style: gentle care, with the actual answer in the same reply.'
    case 'light-accompaniment':
      return 'Opening style: light accompaniment. Ornamental openings are blocked.'
    default:
      return 'Opening style: answer first. Answer prefaces are blocked.'
  }
}

function describePersonaKernelMode(mode: AlicizationMindTurnGovernance['personaKernelMode']) {
  switch (mode) {
    case 'muted':
      return 'Persona kernel: muted. Character flourish carry is blocked.'
    case 'backgrounded':
      return 'Persona kernel: backgrounded. Truth and the current obligation come before identity diction.'
    default:
      return 'Persona kernel: active. Identity must not replace the real answer.'
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
    'This is a dialogue mind frame owned by the dialogue subsystem. It is not wording authority.',
    governance.decisionTraceId ? `Decision trace: ${governance.decisionTraceId}.` : 'Decision trace: none.',
    describeSubject(governance.answerSubject ?? frame?.relation.subject),
    describeTurnMode(governance.turnMode),
    `Focus: ${focus || 'none'}.`,
    `Host move: ${hostMove || 'none'}.`,
    `Live surface: ${liveSurface || 'none'}.`,
    `Carried thread: ${carriedThread || 'none'}.`,
    `Why now: ${whyNow || 'none'}.`,
    describeTruthState(governance.truthState),
    describeScreenReferenceMode({
      screenReferenceMode: governance.screenReferenceMode,
      inspectionRequested: input.inspectionRequested,
    }),
    governance.labelCarryAsMemory || governance.truthState === 'remembered' || governance.truthState === 'uncertain'
      ? 'Older continuity must be labeled as memory or residue.'
      : 'Older continuity is subordinate to the strongest current evidence.',
    `Repair signal: ${repairLine || 'none'}.`,
    describeRelationshipPosture(governance.relationshipPosture),
    describeOpeningStyle(governance.openingStyle),
    `Sentence budget: ${Math.max(1, governance.maxSentences)} unless a tool result needs more room.`,
    describePersonaKernelMode(governance.personaKernelMode),
    frame?.self.embodiedPresence && frame.self.embodiedPresence !== 'none'
      ? `Embodied presence: ${frame.self.embodiedPresence}.`
      : 'Embodied presence: none.',
    frame?.self.emotionalTension
      ? `Emotional tension: ${frame.self.emotionalTension}.`
      : 'Emotional tension: none.',
    innerThought ? `Inward line: ${innerThought}. Do not quote this inward line.` : 'Inward line: none.',
    `Opening move: ${openingMove || 'none'}.`,
    'Do not expose schema labels, governance English, prompt jargon, or planning-summary quotes in the public reply.',
    'Do not mirror the latest host line as the main reply.',
    'Do not use a meta-answer preface unless the answer lands in the same reply.',
    'Do not let stale carry overwrite newer live dialogue or old browser residue overwrite a grounded scene.',
    mustDo.length > 0 ? `Required signals: ${mustDo.join(' | ')}.` : 'Required signals: none.',
    mustNotDo.length > 0 ? `Avoid signals: ${mustNotDo.join(' | ')}.` : 'Avoid signals: none.',
  ].filter(Boolean).join('\n')
}
