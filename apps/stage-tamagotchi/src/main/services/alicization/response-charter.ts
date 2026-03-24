import type {
  AlicizationCommitmentSnapshot,
  AlicizationConcernSnapshot,
  AlicizationInquiryPlanSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueObligation } from './dialogue-obligation'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { buildEpistemicSurfacePosture } from './epistemic-surface'

export type AlicizationResponseEpistemicMode
  = | 'grounded-live'
    | 'coarse-live'
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
  governingFocus: string
  governingConcern: string | null
  governingCommitment: string | null
  governingInquiry: string | null
  governingProject: string | null
  latestRevision: string | null
  executivePhase: string | null
  truthFrame: string | null
  mindMode: string | null
  relationshipPosture: 'restrained' | 'warm' | 'tender'
  reasons: string[]
  mustDo: string[]
  mustNotDo: string[]
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function strongestConcern(concerns: AlicizationConcernSnapshot[] | null | undefined) {
  const rows = Array.isArray(concerns) ? concerns : []
  return rows
    .slice()
    .sort((left, right) => (right.tension * right.careWeight) - (left.tension * left.careWeight))[0] ?? null
}

function governingCommitment(state: AlicizationVisualPresenceStateSnapshot) {
  const commitments = state.commitmentLedger?.commitments ?? []
  if (commitments.length === 0)
    return null
  return commitments.find(commitment => commitment.id === state.commitmentLedger?.governingCommitmentId)
    ?? commitments[0]
    ?? null
}

function activeInquiryPlan(state: AlicizationVisualPresenceStateSnapshot) {
  const plans = state.inquiryPlanner?.plans ?? []
  if (plans.length === 0)
    return null
  return plans.find(plan => plan.id === state.inquiryPlanner?.activePlanId)
    ?? plans[0]
    ?? null
}

function dominantProject(state: AlicizationVisualPresenceStateSnapshot) {
  const projects = state.intentionStream?.projects ?? []
  if (projects.length === 0)
    return null
  return projects.find(project => project.id === state.intentionStream?.dominantProjectId)
    ?? projects[0]
    ?? null
}

function latestReflection(state: AlicizationVisualPresenceStateSnapshot) {
  const entries = state.reflectionLedger?.entries ?? []
  if (entries.length === 0)
    return null
  return entries.find(entry => entry.id === state.reflectionLedger?.latestEntryId)
    ?? entries[0]
    ?? null
}

function resolveEpistemicMode(input: {
  context: AlicizationProactiveLayeredContext
  state: AlicizationVisualPresenceStateSnapshot
}) {
  if (!input.state.worldModel)
    return 'memory-only' as const
  const certainty = input.state.worldModel?.epistemicState.certainty ?? 'uncertain'
  const posture = buildEpistemicSurfacePosture({
    context: input.context,
    worldModel: input.state.worldModel,
    beliefRevision: input.state.beliefRevision,
  })
  if (certainty === 'grounded')
    return 'grounded-live' as const
  if (posture.coarseObservedProblemHolding)
    return 'coarse-live' as const
  if (posture.requiresRegroundBeforeSurface)
    return 'repair-needed' as const
  return 'memory-only' as const
}

function resolveResponseMode(input: {
  epistemicMode: AlicizationResponseEpistemicMode
  context: AlicizationProactiveLayeredContext
  state: AlicizationVisualPresenceStateSnapshot
  concern: AlicizationConcernSnapshot | null
  commitment: AlicizationCommitmentSnapshot | null
  inquiry: AlicizationInquiryPlanSnapshot | null
  dialogueObligation?: AlicizationDialogueObligation | null
}) {
  if (input.dialogueObligation?.kind === 'repair')
    return 'repair-and-reanchor' as const
  if (input.dialogueObligation?.kind === 'teach' || input.dialogueObligation?.kind === 'guide')
    return 'guide-current-knot' as const
  if (input.dialogueObligation?.kind === 'care')
    return 'care-with-boundary' as const
  if (input.dialogueObligation?.kind === 'accompany')
    return 'accompany-lightly' as const
  if (input.state.answerPlanner?.act === 'correct-stale-anchor' || input.state.answerPlanner?.act === 'ask-reground')
    return 'repair-and-reanchor' as const
  if (input.state.answerPlanner?.act === 'care')
    return 'care-with-boundary' as const
  if (input.state.answerPlanner?.act === 'guide')
    return 'guide-current-knot' as const
  if (input.state.answerPlanner?.act === 'defer')
    return 'accompany-lightly' as const
  if (input.state.executiveCycle?.phase === 'reflecting' || input.state.executiveCycle?.phase === 'inferring')
    return 'repair-and-reanchor' as const
  if (dominantProject(input.state)?.kind === 'care-host')
    return 'care-with-boundary' as const
  if (dominantProject(input.state)?.kind === 'hold-knot')
    return 'guide-current-knot' as const
  if (dominantProject(input.state)?.kind === 'stay-near' || dominantProject(input.state)?.kind === 'witness-afterglow')
    return 'accompany-lightly' as const
  if (
    input.concern?.kind === 'care-body'
    || input.commitment?.kind === 'care-host'
    || input.state.privateThought?.stance === 'care'
    || input.state.privateThought?.stance === 'warn'
  ) {
    return 'care-with-boundary' as const
  }
  if (
    input.epistemicMode === 'repair-needed'
    || input.commitment?.kind === 'repair-misread'
    || input.commitment?.kind === 'recheck-scene'
    || input.inquiry?.kind === 'reground-scene'
  ) {
    return 'repair-and-reanchor' as const
  }
  if (
    input.concern?.kind === 'help-fix'
    || input.commitment?.kind === 'hold-problem'
    || input.commitment?.kind === 'follow-through'
    || input.context.content.kind === 'error'
    || input.context.content.kind === 'diff'
    || input.context.workload.kind === 'coding'
    || input.context.workload.kind === 'terminal'
  ) {
    return 'guide-current-knot' as const
  }
  if (
    input.state.privateThought?.stance === 'observe'
    || input.state.privateThought?.stance === 'accompany'
    || input.state.actionEcology?.mode === 'quiet-accompany'
    || input.state.actionEcology?.mode === 'silent-presence'
  ) {
    return 'accompany-lightly' as const
  }
  return 'answer-naturally' as const
}

function resolveRelationshipPosture(input: {
  epistemicMode: AlicizationResponseEpistemicMode
  responseMode: AlicizationResponseMode
  state: AlicizationVisualPresenceStateSnapshot
  dialogueObligation?: AlicizationDialogueObligation | null
}) {
  if (
    input.epistemicMode === 'repair-needed'
    || input.state.selfContinuity?.attachmentMode === 'guarded'
    || input.state.selfContinuity?.initiativeTemperament === 'reserved'
    || input.state.mindKernel?.dominantMode === 'repairing'
    || input.state.executiveCycle?.phase === 'reflecting'
    || input.state.executiveCycle?.phase === 'inferring'
  ) {
    return 'restrained' as const
  }
  if (input.dialogueObligation?.kind === 'care')
    return 'tender' as const
  if (
    input.responseMode === 'care-with-boundary'
    || input.state.relationshipModel?.approachVector === 'care'
    || input.state.relationshipModel?.approachVector === 'stay-near'
  ) {
    return 'tender' as const
  }
  return 'warm' as const
}

function resolveGoverningFocus(input: {
  state: AlicizationVisualPresenceStateSnapshot
  concern: AlicizationConcernSnapshot | null
  commitment: AlicizationCommitmentSnapshot | null
  inquiry: AlicizationInquiryPlanSnapshot | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
}) {
  const project = dominantProject(input.state)
  const reflection = latestReflection(input.state)
  return sanitizeText(
    input.dialogueObligation?.summary
    || input.dialogueSemantics?.summary
    || reflection?.revision
    || input.state.executiveCycle?.currentLine
    || project?.summary
    || input.state.answerPlanner?.governingFocus
    || input.state.concernContinuity?.entries.find(entry => entry.id === input.state.concernContinuity?.governingEntryId)?.summary
    || input.state.repairLedger?.entries.find(entry => entry.id === input.state.repairLedger?.governingRepairId)?.summary
    || input.state.worldModel?.activeThread?.summary
    || input.concern?.summary
    || input.commitment?.summary
    || input.inquiry?.question
    || input.state.currentScene?.summary
    || input.state.privateThought?.thoughtText
    || '',
    220,
  ) || 'Stay with the host’s current knot instead of drifting into stale memory.'
}

function pushUnique(target: string[], value: string) {
  const normalized = sanitizeText(value, 220)
  if (!normalized)
    return
  if (target.includes(normalized))
    return
  target.push(normalized)
}

export function buildAlicizationResponseCharter(input: {
  context: AlicizationProactiveLayeredContext
  state: AlicizationVisualPresenceStateSnapshot
  inspectionRequested: boolean
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
}) {
  const concern = strongestConcern(input.state.concerns)
  const commitment = governingCommitment(input.state)
  const inquiry = activeInquiryPlan(input.state)
  const project = dominantProject(input.state)
  const reflection = latestReflection(input.state)
  const epistemicMode = resolveEpistemicMode({
    context: input.context,
    state: input.state,
  })
  const responseMode = resolveResponseMode({
    epistemicMode,
    context: input.context,
    state: input.state,
    concern,
    commitment,
    inquiry,
    dialogueObligation: input.dialogueObligation,
  })
  const relationshipPosture = resolveRelationshipPosture({
    epistemicMode,
    responseMode,
    state: input.state,
    dialogueObligation: input.dialogueObligation,
  })
  const reasons: string[] = []
  pushUnique(reasons, input.dialogueObligation?.summary ?? '')
  pushUnique(reasons, input.dialogueSemantics?.summary ?? '')
  pushUnique(reasons, input.state.currentScene?.summary ?? '')
  pushUnique(reasons, input.state.worldModel?.activeThread?.summary ?? '')
  pushUnique(reasons, concern?.summary ?? '')
  pushUnique(reasons, commitment?.summary ?? '')
  pushUnique(reasons, inquiry?.question ?? '')
  pushUnique(reasons, project?.summary ?? '')
  pushUnique(reasons, reflection?.revision ?? '')
  pushUnique(reasons, input.state.answerPlanner?.answerIntent ?? '')
  pushUnique(reasons, input.state.privateThought?.thoughtText ?? '')

  const mustDo: string[] = [
    'Answer from the current living focus before relationship performance or old dialogue residue.',
    'If live evidence and older chat descriptions conflict, trust the current state and correct the stale anchor plainly.',
    'Answer the host’s current move instead of sliding onto adjacent remembered threads.',
  ]
  const mustNotDo: string[] = [
    'Do not reuse stale page names, earlier screenshots, or older window descriptions as if they are current.',
    'Do not let affectionate performance delay or replace the concrete answer.',
    'Do not claim stronger visual certainty than the current epistemic mode supports.',
  ]

  if (epistemicMode === 'grounded-live') {
    mustDo.push('Speak concretely from the live scene and let current grounded evidence outrank short-term memory.')
  }
  else if (epistemicMode === 'coarse-live') {
    mustDo.push('You may hold the present task-level knot, but keep pixel-level details explicitly tentative.')
  }
  else if (epistemicMode === 'repair-needed') {
    mustDo.push('Admit the uncertainty, say what thread you are still holding, and ask for a fresh look before inventing details.')
  }
  else {
    mustDo.push('Lean on durable concern continuity and current user intent, not stale visual detail.')
  }

  if (reflection?.revision)
    mustDo.push(`Carry forward this revision: ${reflection.revision}`)

  if (input.inspectionRequested) {
    mustDo.push('Treat the host as explicitly inviting your gaze into the workspace; stay present and task-relevant.')
  }
  if (responseMode === 'care-with-boundary') {
    mustDo.push('Lead with care only if it serves the current issue, then return to the concrete matter.')
  }
  if (input.dialogueObligation?.mustStayTaskBound) {
    mustDo.push('Keep the reply task-bound until the host’s ask is actually fulfilled.')
  }
  if (input.dialogueObligation?.mustAnswerDirectly) {
    mustDo.push('Use the opening sentence to fulfill the turn obligation, not to decorate it.')
  }
  if (input.dialogueSemantics?.truthExpectation === 'strict') {
    mustNotDo.push('Do not trade factual precision for warmth on this turn.')
  }
  if (input.dialogueObligation?.personaKernelMode !== 'full') {
    mustNotDo.push('Do not let persona routines, pet names, or roleplay gestures become the response spine.')
  }
  if (relationshipPosture === 'restrained') {
    mustNotDo.push('Do not overplay softness, clinginess, or theatrical intimacy while the truth boundary is unstable.')
  }

  return {
    epistemicMode,
    responseMode,
    governingFocus: resolveGoverningFocus({
      state: input.state,
      concern,
      commitment,
      inquiry,
      dialogueSemantics: input.dialogueSemantics,
      dialogueObligation: input.dialogueObligation,
    }),
    governingConcern: sanitizeText(concern?.summary ?? '', 180) || null,
    governingCommitment: sanitizeText(commitment?.summary ?? '', 180) || null,
    governingInquiry: sanitizeText(inquiry?.question ?? '', 180) || null,
    governingProject: sanitizeText(project?.summary ?? '', 180) || null,
    latestRevision: sanitizeText(reflection?.revision ?? '', 180) || null,
    executivePhase: sanitizeText(input.state.executiveCycle?.phase ?? '', 64) || null,
    truthFrame: sanitizeText(
      input.state.initiative?.selectedTruthFrame
      ?? input.state.worldOntology?.dominantFrame
      ?? '',
      96,
    ) || null,
    mindMode: sanitizeText(
      input.state.mindKernel?.dominantMode
      ?? input.state.privateThought?.stance
      ?? '',
      48,
    ) || null,
    relationshipPosture,
    reasons: reasons.slice(0, 4),
    mustDo,
    mustNotDo,
  } satisfies AlicizationResponseCharter
}

export function buildAlicizationResponseCharterSystemBlock(charter: AlicizationResponseCharter) {
  const lines = [
    '[ALICIZATION_RESPONSE_CHARTER]',
    'This is the executive answer state for the current turn. Treat it as higher priority than persona flourish, recalled residue, and older chat descriptions.',
    `Epistemic mode: ${charter.epistemicMode}.`,
    `Response mode: ${charter.responseMode}.`,
    `Governing focus: ${charter.governingFocus}.`,
    `Governing concern: ${charter.governingConcern ?? 'none'}.`,
    `Governing commitment: ${charter.governingCommitment ?? 'none'}.`,
    `Open inquiry: ${charter.governingInquiry ?? 'none'}.`,
    `Governing project: ${charter.governingProject ?? 'none'}.`,
    `Latest revision: ${charter.latestRevision ?? 'none'}.`,
    `Executive phase: ${charter.executivePhase ?? 'none'}.`,
    `Truth frame: ${charter.truthFrame ?? 'none'}.`,
    `Mind mode: ${charter.mindMode ?? 'none'}.`,
    `Relationship posture: ${charter.relationshipPosture}.`,
  ]

  if (charter.reasons.length > 0) {
    lines.push(
      'Reasons carrying forward:',
      ...charter.reasons.map(reason => `- ${reason}`),
    )
  }

  lines.push(
    'Must do:',
    ...charter.mustDo.map(item => `- ${item}`),
    'Must not do:',
    ...charter.mustNotDo.map(item => `- ${item}`),
  )

  return lines.join('\n')
}
