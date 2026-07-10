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
      return 'answer_subject=alicization_self; scope=self_state_or_continuity'
    case 'relationship':
      return 'answer_subject=relationship; scope=host_alicization_relationship'
    case 'host-state':
      return 'answer_subject=host_state; scope=condition_pressure_or_feeling'
    case 'task-knot':
      return 'answer_subject=task_knot; scope=current_concrete_task'
    case 'visible-scene':
      return 'answer_subject=visible_scene; scope=current_screen_interpretation'
    default:
      return 'answer_subject=current_dialogue; scope=live_thread'
  }
}

function describeTurnMode(turnMode: AlicizationMindTurnGovernance['turnMode']) {
  switch (turnMode) {
    case 'grounded-inspection':
      return 'turn_mode=grounded_inspection; grounding=current_scene_first'
    case 'screen-repair':
      return 'turn_mode=screen_repair; stale_scene_claims=repair_first'
    case 'guide-current-knot':
      return 'turn_mode=guide_current_knot; active_knot=advance_one_step'
    case 'care':
      return 'turn_mode=care; actual_issue_priority=above_care_style'
    case 'accompany':
      return 'turn_mode=accompany; empty_shell=blocked'
    default:
      return 'turn_mode=direct_answer; current_turn_priority=true'
  }
}

function describeTruthState(truthState: AlicizationMindTurnGovernance['truthState']) {
  switch (truthState) {
    case 'live-grounded':
      return 'truth_state=live_grounded; evidence=current; claim_scope=concrete'
    case 'live-observed':
      return 'truth_state=live_observed; evidence=coarse; inference_scope=modest'
    case 'remembered':
      return 'truth_state=remembered; memory_label_required=true; literal_current_screen=false'
    case 'imagined':
      return 'truth_state=imagined; claim_scope=tentative_narrow'
    default:
      return 'truth_state=uncertain; hard_claims=blocked; ungrounded_sight_claims=blocked'
  }
}

function describeRelationshipPosture(posture: AlicizationMindTurnGovernance['relationshipPosture']) {
  switch (posture) {
    case 'restrained':
      return 'relationship_posture=restrained'
    case 'tender':
      return 'relationship_posture=tender; warmth_after_answer=true'
    default:
      return 'relationship_posture=natural; performance_style=blocked'
  }
}

function describeScreenReferenceMode(input: {
  screenReferenceMode?: AlicizationMindTurnGovernance['screenReferenceMode'] | null
  inspectionRequested: boolean
}) {
  if (input.screenReferenceMode === 'avoid')
    return 'screen_reference_mode=avoid; screen_continuity=background_only; explicit_live_look_required=true'
  if (input.screenReferenceMode === 'required')
    return 'screen_reference_mode=required; current_grounded_evidence_priority=above_carried_continuity'
  if (input.inspectionRequested)
    return 'screen_reference_mode=invited; current_scene_priority=above_memory; missing_grounding=surface_explicitly'
  return 'screen_reference_mode=optional; use_only_when_answer_relevant=true'
}

function describeRepairState(input: {
  repairState: AlicizationMindTurnGovernance['repairState']
  shouldAskForGrounding: boolean
  shouldAcknowledgeRepair: boolean
}) {
  if (input.repairState === 'stale-anchor' || input.shouldAcknowledgeRepair)
    return 'repair_state=stale_anchor; older_carry_pollution=correct_first'
  if (input.repairState === 'need-reground' || input.shouldAskForGrounding)
    return 'repair_state=need_reground; ask_once_for_missing_current_view=true; generic_blindness_refusal=blocked'
  return ''
}

function describeOpeningStyle(openingStyle: AlicizationMindTurnGovernance['openingStyle']) {
  switch (openingStyle) {
    case 'direct-observation':
      return 'opening_style=direct_observation; visible_now_first=true'
    case 'direct-correction':
      return 'opening_style=direct_correction; stale_or_wrong_read=correct_first'
    case 'gentle-care':
      return 'opening_style=gentle_care; actual_answer_same_reply=true'
    case 'light-accompaniment':
      return 'opening_style=light_accompaniment; ornamental_opening=blocked'
    default:
      return 'opening_style=answer_first; answer_preface=blocked'
  }
}

function describePersonaKernelMode(mode: AlicizationMindTurnGovernance['personaKernelMode']) {
  switch (mode) {
    case 'muted':
      return 'persona_kernel=muted; character_flourish_carry=blocked'
    case 'backgrounded':
      return 'persona_kernel=backgrounded; identity_diction_after_truth_and_obligation=true'
    default:
      return 'persona_kernel=active; identity_replaces_real_answer=blocked'
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
    'block_role=dialogue_mind_frame; owner=dialogue; wording_authority=false',
    governance.decisionTraceId ? `decision_trace=${governance.decisionTraceId}` : 'decision_trace=none',
    describeSubject(governance.answerSubject ?? frame?.relation.subject),
    describeTurnMode(governance.turnMode),
    `focus=${focus || 'none'}`,
    `host_move=${hostMove || 'none'}`,
    `live_surface=${liveSurface || 'none'}`,
    `carried_thread=${carriedThread || 'none'}`,
    `why_now=${whyNow || 'none'}`,
    describeTruthState(governance.truthState),
    describeScreenReferenceMode({
      screenReferenceMode: governance.screenReferenceMode,
      inspectionRequested: input.inspectionRequested,
    }),
    governance.labelCarryAsMemory || governance.truthState === 'remembered' || governance.truthState === 'uncertain'
      ? 'older_continuity_label_policy=memory_or_residue_required'
      : 'older_continuity_priority=subordinate_to_strongest_current_evidence',
    `repair_signal=${repairLine || 'none'}`,
    describeRelationshipPosture(governance.relationshipPosture),
    describeOpeningStyle(governance.openingStyle),
    `sentence_budget=${Math.max(1, governance.maxSentences)}; tool_exception=true`,
    describePersonaKernelMode(governance.personaKernelMode),
    frame?.self.embodiedPresence && frame.self.embodiedPresence !== 'none'
      ? `embodied_presence=${frame.self.embodiedPresence}`
      : 'embodied_presence=none',
    frame?.self.emotionalTension
      ? `emotional_tension=${frame.self.emotionalTension}`
      : 'emotional_tension=none',
    innerThought ? `inward_line=${innerThought}; quote_inward_line=false` : 'inward_line=none',
    `opening_move=${openingMove || 'none'}`,
    'schema_labels_in_public_reply=blocked; governance_english=blocked; prompt_jargon=blocked; planning_summary_quotes=blocked',
    'latest_host_line_mirror_as_main_reply=blocked',
    'meta_answer_preface=blocked_unless_answer_lands_same_reply',
    'stale_carry_overwrites_newer_live_dialogue=blocked; old_browser_residue_overwrites_grounded_scene=blocked',
    mustDo.length > 0 ? `required_signals=${mustDo.join(' | ')}` : 'required_signals=none',
    mustNotDo.length > 0 ? `avoid_signals=${mustNotDo.join(' | ')}` : 'avoid_signals=none',
  ].filter(Boolean).join('\n')
}
