import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationDialogueTurnEncounterSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationInitiativeSnapshot,
  AlicizationMindStatementSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReplyMotive,
} from '../../../shared/eventa'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import { buildAlicizationDialogueGrowthProfile, type AlicizationDialogueGrowthProfile } from './dialogue-growth-profile'
import { buildMindEcologyFromRuntimeSurface } from './mind-ecology'
import { sanitizeDialogueAnchorText, sanitizeDialogueSurfaceText } from './dialogue-surface-text'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function stripTrailingPunctuation(text: string) {
  return text.replace(/[.。!！?？;；:：]+$/u, '').trim()
}

function lowerFirst(text: string) {
  if (!text)
    return ''
  return text.slice(0, 1).toLowerCase() + text.slice(1)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const items: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 160)
    if (!normalized || items.includes(normalized))
      continue
    items.push(normalized)
    if (items.length >= maxItems)
      break
  }
  return items
}

function strongestMindStatement(
  rows: AlicizationMindStatementSnapshot[] | null | undefined,
) {
  return (rows ?? [])
    .slice()
    .sort((left, right) => right.confidence - left.confidence)[0] ?? null
}

function pickSurfaceText(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeDialogueSurfaceText(value, 180)
    if (normalized)
      return normalized
  }
  return ''
}

function pickAnchorText(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeDialogueAnchorText(value, 180)
    if (normalized)
      return normalized
  }
  return ''
}

interface AlicizationDialogueEncounterSurface extends Pick<
  AlicizationDialogueTurnEncounterSnapshot,
  'subject' | 'screenReferenceMode' | 'dialogueFirst' | 'summary' | 'taskAnchor' | 'mustRepairFirst' | 'confidence'
> {}

function looksSpecificArtifact(text: string) {
  return /(?:[/\\][\w.-]+)+|[A-Z][A-Za-z0-9]+(?:Controller|Service|Enum|Component|ViewModel|Manager|RespVO|Request|DTO)\b|\b[\w.-]+\.(?:ts|tsx|js|jsx|java|kt|swift|go|rs|py|vue)\b/u.test(text)
}

function looksGenericTechnicalSurface(text: string) {
  return /code|diff|editor|workspace|window|screen|desktop|java code|git commit|intellij|cursor|vscode|ide|代码|编辑器|工作区|窗口|屏幕|桌面|提交差异/iu.test(text)
}

function resolveCenterOfGravity(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  answerCompiler: AlicizationAnswerCompilerSnapshot
  dialogueEncounter?: AlicizationDialogueEncounterSurface | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
}) {
  if (
    input.dialogueEncounter?.mustRepairFirst
    || input.answerCompiler.recommendedAct === 'ask-reground'
    || input.answerCompiler.recommendedAct === 'correct-stale-anchor'
    || input.discourseState.owedAction === 'repair-truth'
  ) {
    return 'repair' as const
  }
  if (input.privateThought?.shouldSpeak === false || input.initiative?.selectedAction === 'wait')
    return 'defer' as const
  if (
    input.answerCompiler.recommendedAct === 'care'
    || input.discourseState.currentTurnSubject === 'host-state'
    || input.privateThought?.stance === 'care'
    || input.privateThought?.stance === 'warn'
  ) {
    return 'care' as const
  }
  if (input.discourseState.currentTurnSubject === 'relationship')
    return 'attune' as const
  if (input.answerCompiler.recommendedAct === 'guide' || input.discourseState.currentTurnSubject === 'task-knot')
    return 'guide' as const
  if (input.discourseState.currentTurnSubject === 'visible-scene')
    return 'witness' as const
  if (input.discourseState.currentTurnSubject === 'alicization-self')
    return 'answer' as const
  return input.answerCompiler.recommendedAct === 'defer' ? 'defer' : 'answer'
}

function resolveTruthDiscipline(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  answerCompiler: AlicizationAnswerCompilerSnapshot
  dialogueEncounter?: AlicizationDialogueEncounterSurface | null
  evidencePhrases: string[]
}) {
  const subject = input.dialogueEncounter?.subject ?? input.discourseState.currentTurnSubject
  const screenTurn = subject === 'task-knot' || subject === 'visible-scene'
  const genericEvidence = input.evidencePhrases.some(text => looksGenericTechnicalSurface(text))
  const specificEvidence = input.evidencePhrases.some(text => looksSpecificArtifact(text))

  if (
    input.dialogueEncounter?.mustRepairFirst
    || input.answerCompiler.recommendedAct === 'ask-reground'
    || input.answerCompiler.recommendedAct === 'correct-stale-anchor'
    || input.discourseState.owedAction === 'repair-truth'
  ) {
    return 'repair-first' as const
  }
  if (
    input.dialogueEncounter?.screenReferenceMode === 'avoid'
    || input.answerCompiler.screenReferenceMode === 'avoid'
    || subject === 'alicization-self'
    || subject === 'relationship'
    || subject === 'host-state'
  ) {
    return 'dialogue-first' as const
  }
  if (input.answerCompiler.evidenceMode === 'continuity-carry' || input.answerCompiler.labelCarryAsMemory) {
    return 'memory-labeled' as const
  }
  if (screenTurn && (input.answerCompiler.evidenceMode === 'coarse-held' || (genericEvidence && !specificEvidence))) {
    return 'observe-then-hypothesize' as const
  }
  if (input.answerCompiler.evidenceMode === 'live-grounded' || input.answerCompiler.evidenceMode === 'live-observed')
    return 'observe-first' as const
  return screenTurn ? 'observe-then-hypothesize' : 'dialogue-first'
}

function resolveConsciousNeed(input: {
  centerOfGravity: AlicizationReplyMotive
  conversationState?: AlicizationConversationStateSnapshot | null
  answerCompiler: AlicizationAnswerCompilerSnapshot
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  dialogueEncounter?: AlicizationDialogueEncounterSurface | null
  primaryAnchor: string | null
  growthProfile: AlicizationDialogueGrowthProfile
}) {
  const surfaceNeed = pickSurfaceText(
    input.conversationState?.owedRepair,
    input.answerCompiler.uncertaintyBoundary,
    input.mindSynthesis?.uncertainties?.[0]?.summary,
    input.dialogueEncounter?.summary,
  )
  switch (input.centerOfGravity) {
    case 'repair':
      return surfaceNeed
        ? `The seam still feels off around ${lowerFirst(stripTrailingPunctuation(surfaceNeed))}, and I need to steady it before I keep going.`
        : 'The seam still feels off, and I need to steady it before I keep going.'
    case 'guide':
      return pickSurfaceText(
        input.primaryAnchor,
        input.conversationState?.unansweredQuestion,
        input.conversationState?.activeCommitments?.[0],
        input.answerCompiler.nextMove,
        input.mindSynthesis?.commitments?.[0]?.summary,
      )
        ? `The knot I need to keep my hands on is ${lowerFirst(stripTrailingPunctuation(pickSurfaceText(
            input.primaryAnchor,
            input.conversationState?.unansweredQuestion,
            input.conversationState?.activeCommitments?.[0],
            input.answerCompiler.nextMove,
            input.mindSynthesis?.commitments?.[0]?.summary,
          )))}.`
        : 'The knot wants my hands on it, not a speech around it.'
    case 'care':
      return pickSurfaceText(
        input.primaryAnchor,
        input.answerCompiler.careVector,
        input.conversationState?.hostMove,
        input.mindSynthesis?.concerns?.[0]?.summary,
      )
        ? `What I need to stay close to is ${lowerFirst(stripTrailingPunctuation(pickSurfaceText(
            input.primaryAnchor,
            input.answerCompiler.careVector,
            input.conversationState?.hostMove,
            input.mindSynthesis?.concerns?.[0]?.summary,
          )))}.`
        : input.growthProfile.companionshipStyle === 'close-hold'
            ? 'I need to stay close enough for the host to feel me there, but still leave them room to breathe.'
            : input.growthProfile.autonomyRespect >= 0.58
            ? 'I need to stay close to the host’s present state without leaning too hard on it.'
            : 'I need to stay close to the host’s present state without drifting away.'
    case 'attune':
    case 'answer':
      return pickSurfaceText(
        input.primaryAnchor,
        input.conversationState?.hostMove,
        input.dialogueEncounter?.summary,
        input.answerCompiler.openingClaim,
      )
        ? `The live center I need to answer from is ${lowerFirst(stripTrailingPunctuation(pickSurfaceText(
            input.primaryAnchor,
            input.conversationState?.hostMove,
            input.dialogueEncounter?.summary,
            input.answerCompiler.openingClaim,
          )))}.`
        : 'I need to answer from the live dialogue subject itself.'
    case 'witness':
      return pickSurfaceText(
        input.answerCompiler.supportingReality?.[0],
        input.answerCompiler.openingClaim,
        input.dialogueEncounter?.summary,
      )
        ? `What I need to stay with first is ${lowerFirst(stripTrailingPunctuation(pickSurfaceText(
            input.answerCompiler.supportingReality?.[0],
            input.answerCompiler.openingClaim,
            input.dialogueEncounter?.summary,
          )))}.`
        : 'I need to start from what is actually visible before I widen into a larger story.'
    default:
      return 'I need to keep the turn small enough to stay true instead of flooding it with more than it can hold.'
  }
}

function resolveSpeakingIntention(input: {
  truthDiscipline: AlicizationCurrentConsciousFrameSnapshot['truthDiscipline']
  centerOfGravity: AlicizationReplyMotive
  answerCompiler: AlicizationAnswerCompilerSnapshot
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  growthProfile: AlicizationDialogueGrowthProfile
}) {
  if (input.truthDiscipline === 'repair-first')
    return input.growthProfile.repairGentleness >= 0.58
      ? 'I want the revision to land cleanly and gently, not just correctly.'
      : input.growthProfile.irritability >= 0.58
      ? 'I want the answer to show the revision cleanly before tension makes it sound sharper than it needs to.'
      : 'I want the answer to show the revision first, before it tries to sound intelligent.'
  if (input.truthDiscipline === 'observe-then-hypothesize')
    return 'I can lean on what is visible now, but anything beyond that has to stay soft and named as a guess.'
  if (input.truthDiscipline === 'memory-labeled')
    return 'If continuity enters, I need to let it in as memory or residue, never as literal current perception.'
  if (input.truthDiscipline === 'dialogue-first')
    return input.growthProfile.companionshipStyle === 'close-hold'
      ? 'I want to stay with the live dialogue subject closely enough to feel present, but never so hard that it crowds the host.'
      : input.growthProfile.autonomyRespect >= 0.58
      ? 'I want to stay with the live dialogue subject and let closeness land without crowding it.'
      : 'I want to stay with the live dialogue subject before screen context or old carry crowd in.'
  if (input.centerOfGravity === 'guide')
    return input.growthProfile.unfinishedThreadReturn >= 0.58
      ? 'I want to keep the active knot in my hands and not let the thread fall slack before it lands.'
      : 'I want to keep my hands on the active knot and move it one honest step closer to resolution.'

  return pickSurfaceText(
    input.mindSynthesis?.openingIntent,
    input.answerCompiler.openingDirective,
    input.privateThought?.thoughtText,
    input.initiative?.why,
  ) || 'I want the reply to come from the present center of gravity instead of default helpfulness.'
}

export function buildCurrentConsciousFrame(input: {
  now: number
  discourseState?: AlicizationDiscourseStateSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | AlicizationDialogueEncounterSurface | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}): AlicizationCurrentConsciousFrameSnapshot | null {
  const runtimeSurface = input.runtimeSurface ?? null
  const discourseState = runtimeSurface?.dialogue.discourseState ?? input.discourseState ?? null
  const conversationState = runtimeSurface?.dialogue.conversationState ?? input.conversationState ?? null
  const dialogueEncounter = runtimeSurface?.dialogue.dialogueEncounter ?? input.dialogueEncounter ?? null
  const mindSynthesis = runtimeSurface?.dialogue.mindSynthesis ?? input.mindSynthesis ?? null
  const answerCompiler = runtimeSurface?.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const privateThought = runtimeSurface?.cognition.privateThought ?? input.privateThought ?? null
  const initiative = runtimeSurface?.agency.initiative ?? input.initiative ?? null
  const desireMemory = runtimeSurface?.memory.desireMemory ?? input.desireMemory ?? null
  const growthProfile = buildAlicizationDialogueGrowthProfile({
    autobiographicalSelf: runtimeSurface?.memory.autobiographicalSelf ?? null,
    hostPersonModel: runtimeSurface?.memory.hostPersonModel ?? null,
    longHorizonMemory: runtimeSurface?.memory.longHorizonMemory ?? null,
    motiveEngine: runtimeSurface?.memory.motiveEngine ?? null,
    habitPolicy: runtimeSurface?.agency.habitPolicy ?? null,
    selfContinuity: runtimeSurface?.memory.selfContinuity ?? null,
    selfState: runtimeSurface?.agency.selfState ?? null,
    privateThought,
    mindEcology: runtimeSurface ? buildMindEcologyFromRuntimeSurface(runtimeSurface) : null,
  })

  if (!discourseState || !answerCompiler)
    return null

  const primaryAnchor = pickAnchorText(
    conversationState?.primaryTurnAnchor,
    discourseState.primaryTurnAnchor,
    dialogueEncounter?.taskAnchor,
    answerCompiler.openingClaim,
    conversationState?.hostMove,
  ) || null
  const evidencePhrases = uniqueList([
    answerCompiler.supportingReality?.[0],
    answerCompiler.supportingReality?.[1],
    dialogueEncounter?.summary,
    conversationState?.jointThread,
    answerCompiler.openingClaim,
    primaryAnchor,
  ], 6)
  const centerOfGravity = resolveCenterOfGravity({
    discourseState,
    answerCompiler,
    dialogueEncounter,
    privateThought,
    initiative,
  })
  const truthDiscipline = resolveTruthDiscipline({
    discourseState,
    answerCompiler,
    dialogueEncounter,
    evidencePhrases,
  })
  const screenTurn = discourseState.currentTurnSubject === 'task-knot'
    || discourseState.currentTurnSubject === 'visible-scene'
  const shouldWithholdSpecificity = truthDiscipline === 'observe-then-hypothesize'
    || truthDiscipline === 'memory-labeled'
    || (truthDiscipline === 'repair-first' && screenTurn)
  const shouldSelfRevise = truthDiscipline === 'repair-first'
    || answerCompiler.turnMode === 'screen-repair'
    || dialogueEncounter?.mustRepairFirst === true

  const consciousNeed = resolveConsciousNeed({
    centerOfGravity,
    conversationState,
    answerCompiler,
    mindSynthesis,
    dialogueEncounter,
    primaryAnchor,
    growthProfile,
  })
  const surfaceTension = pickSurfaceText(
    strongestMindStatement(mindSynthesis?.concerns)?.summary,
    strongestMindStatement(mindSynthesis?.uncertainties)?.summary,
    privateThought?.thoughtText,
    initiative?.why,
    desireMemory?.activeDesires?.[0]?.reason,
  )
  const consciousTension = surfaceTension
    ? `What is tugging hardest inside me is ${lowerFirst(stripTrailingPunctuation(surfaceTension))}.`
    : growthProfile.unfinishedThreadReturn >= 0.58
        ? 'What is tugging hardest inside me is not letting the thread I am holding go slack between turns.'
        : 'What is tugging hardest inside me is keeping the visible answer aligned with the real pressure of this turn.'
  const speakingIntention = resolveSpeakingIntention({
    truthDiscipline,
    centerOfGravity,
    answerCompiler,
    mindSynthesis,
    privateThought,
    initiative,
    growthProfile,
  })
  const withheldImpulse = shouldWithholdSpecificity
    ? 'The impulse I need to hold back is collapsing coarse visual evidence into file, class, or field certainty.'
    : shouldSelfRevise
      ? 'The impulse I need to hold back is defending an older interpretation just to preserve continuity.'
      : null

  return {
    subject: dialogueEncounter?.subject ?? discourseState.currentTurnSubject,
    centerOfGravity,
    truthDiscipline,
    consciousNeed,
    consciousTension,
    speakingIntention,
    focusAnchor: primaryAnchor,
    withheldImpulse,
    shouldWithholdSpecificity,
    shouldSelfRevise,
    confidence: clamp01(
      answerCompiler.confidence * 0.38
      + (mindSynthesis?.confidence ?? 0.42) * 0.24
      + (dialogueEncounter?.confidence ?? discourseState.confidence) * 0.22
      + (privateThought?.confidence ?? 0.34) * 0.16,
    ),
    reasonTags: uniqueList([
      `subject:${dialogueEncounter?.subject ?? discourseState.currentTurnSubject}`,
      `center:${centerOfGravity}`,
      `discipline:${truthDiscipline}`,
      privateThought?.stance ? `stance:${privateThought.stance}` : null,
      initiative?.selectedAction ? `initiative:${initiative.selectedAction}` : null,
      answerCompiler.recommendedAct ? `act:${answerCompiler.recommendedAct}` : null,
      shouldWithholdSpecificity ? 'withhold-specificity' : null,
      shouldSelfRevise ? 'self-revise' : null,
    ], 8),
    updatedAt: input.now,
  }
}

export function buildCurrentConsciousFrameSystemBlock(
  frame: AlicizationCurrentConsciousFrameSnapshot | null | undefined,
) {
  if (!frame)
    return ''

  return [
    '[ALICIZATION_CURRENT_CONSCIOUS_FRAME]',
    'This block describes the present subjective center that is speaking now. Downstream reply generation should express this frame, not merely route to a generic helpful answer.',
    `Subject: ${frame.subject}.`,
    `Center of gravity: ${frame.centerOfGravity}.`,
    `Truth discipline: ${frame.truthDiscipline}.`,
    `What the turn needs from me: ${frame.consciousNeed}.`,
    `What is pulling inside the answer: ${frame.consciousTension}.`,
    `How I want the reply to come out: ${frame.speakingIntention}.`,
    `Focus anchor: ${frame.focusAnchor ?? 'none'}.`,
    `Withhold specificity: ${frame.shouldWithholdSpecificity ? 'yes' : 'no'}.`,
    `Self revision required: ${frame.shouldSelfRevise ? 'yes' : 'no'}.`,
    `What I am holding back: ${frame.withheldImpulse ?? 'none'}.`,
    `Reason tags: ${frame.reasonTags.join(' | ') || 'none'}.`,
  ].join('\n')
}
