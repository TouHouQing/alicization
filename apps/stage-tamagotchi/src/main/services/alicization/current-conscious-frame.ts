import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationDialogueTurnEncounterSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationInitiativeSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReplyMotive,
} from '../../../shared/eventa'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'

import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'

import {
  sanitizeDialogueAnchorText,
  sanitizeDialogueSurfaceText,
} from './dialogue-surface-text'

interface AlicizationDialogueEncounterSurface extends Pick<
  AlicizationDialogueTurnEncounterSnapshot,
  'subject' | 'screenReferenceMode' | 'dialogueFirst' | 'summary' | 'taskAnchor' | 'mustRepairFirst' | 'confidence'
> {}

type AlicizationConsciousNeedSource
  = Exclude<AlicizationCurrentConsciousFrameSnapshot['consciousNeedSource'], null | undefined>

type AlicizationFocusAnchorSource
  = Exclude<AlicizationCurrentConsciousFrameSnapshot['focusAnchorSource'], null | undefined>

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

function sanitizeDynamicText(raw: unknown, maxChars = 420) {
  const surfaceText = sanitizeDialogueSurfaceText(raw, maxChars)
  return surfaceText
    ? sanitizeAlicizationProviderFacingText(surfaceText, maxChars, '')
    : ''
}

function sanitizeDynamicAnchor(raw: unknown, maxChars = 180) {
  const anchor = sanitizeDialogueAnchorText(raw, maxChars)
  return anchor
    ? sanitizeAlicizationProviderFacingText(anchor, maxChars, '')
    : ''
}

function pickDynamicTextWithSource(
  maxChars: number,
  candidates: Array<{
    preserveUserAuthoredText?: boolean
    source?: AlicizationConsciousNeedSource | null
    value: unknown
    sourceTag: string
  }>,
) {
  for (const candidate of candidates) {
    const normalized = candidate.preserveUserAuthoredText
      ? sanitizeText(candidate.value, maxChars)
      : sanitizeDynamicText(candidate.value, maxChars)
    if (normalized) {
      return {
        source: candidate.source ?? null,
        text: normalized,
        sourceTag: candidate.sourceTag,
      }
    }
  }
  return null
}

function pickDynamicAnchorWithSource(candidates: Array<{
  focusSource: AlicizationFocusAnchorSource
  preserveUserAuthoredText?: boolean
  value: unknown
}>) {
  for (const candidate of candidates) {
    const normalized = candidate.preserveUserAuthoredText
      ? sanitizeText(candidate.value, 180)
      : sanitizeDynamicAnchor(candidate.value)
    if (normalized) {
      return {
        focusSource: candidate.focusSource,
        text: normalized,
      }
    }
  }
  return null
}

function uniqueReasonTags(values: Array<string | null | undefined>) {
  const tags: string[] = []
  for (const value of values) {
    const normalized = sanitizeAlicizationProviderFacingText(value, 160, '')
    if (!normalized || tags.includes(normalized))
      continue
    tags.push(normalized)
    if (tags.length >= 10)
      break
  }
  return tags
}

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
}): AlicizationReplyMotive {
  if (
    input.dialogueEncounter?.mustRepairFirst
    || input.answerCompiler.recommendedAct === 'ask-reground'
    || input.answerCompiler.recommendedAct === 'correct-stale-anchor'
    || input.discourseState.owedAction === 'repair-truth'
  ) {
    return 'repair'
  }
  if (input.privateThought?.shouldSpeak === false || input.initiative?.selectedAction === 'wait')
    return 'defer'
  if (
    input.answerCompiler.recommendedAct === 'care'
    || input.discourseState.currentTurnSubject === 'host-state'
    || input.privateThought?.stance === 'care'
    || input.privateThought?.stance === 'warn'
  ) {
    return 'care'
  }
  if (input.discourseState.currentTurnSubject === 'relationship')
    return 'attune'
  if (input.answerCompiler.recommendedAct === 'guide' || input.discourseState.currentTurnSubject === 'task-knot')
    return 'guide'
  if (input.discourseState.currentTurnSubject === 'visible-scene')
    return 'witness'
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
  const genericEvidence = input.evidencePhrases.some(looksGenericTechnicalSurface)
  const specificEvidence = input.evidencePhrases.some(looksSpecificArtifact)

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
  if (input.answerCompiler.evidenceMode === 'continuity-carry' || input.answerCompiler.labelCarryAsMemory)
    return 'memory-labeled' as const
  if (screenTurn && (input.answerCompiler.evidenceMode === 'coarse-held' || (genericEvidence && !specificEvidence)))
    return 'observe-then-hypothesize' as const
  if (input.answerCompiler.evidenceMode === 'live-grounded' || input.answerCompiler.evidenceMode === 'live-observed')
    return 'observe-first' as const
  return screenTurn ? 'observe-then-hypothesize' as const : 'dialogue-first' as const
}

export function buildCurrentConsciousFrame(input: {
  now: number
  userText?: string
  discourseState?: AlicizationDiscourseStateSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | AlicizationDialogueEncounterSurface | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  runtimeSurface?: unknown
}): AlicizationCurrentConsciousFrameSnapshot | null {
  const discourseState = input.discourseState ?? null
  const conversationState = input.conversationState ?? null
  const dialogueEncounter = input.dialogueEncounter ?? null
  const mindSynthesis = input.mindSynthesis ?? null
  const answerCompiler = input.answerCompiler ?? null
  const privateThought = input.privateThought ?? null
  const initiative = input.initiative ?? null

  if (!discourseState || !answerCompiler)
    return null

  const userText = sanitizeText(input.userText, 420)
  const matchesUserText = (value: unknown) =>
    Boolean(userText && sanitizeText(value, 420) === userText)
  const conversationAnchorIsQuestion = conversationState?.primaryTurnAnchorSource === 'question'
    && matchesUserText(conversationState.primaryTurnAnchor)
  const discourseAnchorIsQuestion = discourseState.primaryTurnAnchorSource === 'question'
    && matchesUserText(discourseState.primaryTurnAnchor)
  const conversationAnchorIsUserText = conversationState?.primaryTurnAnchorSource === 'user-text'
  const discourseAnchorIsUserText = discourseState.primaryTurnAnchorSource === 'user-text'
  const hostMoveIsUserText = matchesUserText(conversationState?.hostMove)

  const subject = dialogueEncounter?.subject ?? discourseState.currentTurnSubject
  const primaryAnchorSelection = pickDynamicAnchorWithSource([
    {
      focusSource: conversationAnchorIsUserText
        ? 'user-text'
        : conversationAnchorIsQuestion
          ? 'question'
          : 'conversation-anchor',
      preserveUserAuthoredText: conversationAnchorIsUserText || conversationAnchorIsQuestion,
      value: conversationState?.primaryTurnAnchor,
    },
    {
      focusSource: discourseAnchorIsUserText
        ? 'user-text'
        : discourseAnchorIsQuestion
          ? 'question'
          : 'discourse-anchor',
      preserveUserAuthoredText: discourseAnchorIsUserText || discourseAnchorIsQuestion,
      value: discourseState.primaryTurnAnchor,
    },
    {
      focusSource: 'dialogue-task-anchor',
      value: dialogueEncounter?.taskAnchor,
    },
    {
      focusSource: hostMoveIsUserText ? 'user-text' : 'host-move',
      preserveUserAuthoredText: hostMoveIsUserText,
      value: conversationState?.hostMove,
    },
    {
      focusSource: 'user-text',
      preserveUserAuthoredText: true,
      value: userText,
    },
  ])
  const primaryAnchor = primaryAnchorSelection?.text ?? null
  const evidencePhrases = [
    answerCompiler.supportingReality?.[0],
    answerCompiler.supportingReality?.[1],
    dialogueEncounter?.summary,
    conversationState?.jointThread,
    primaryAnchor,
  ]
    .map(value => sanitizeDynamicText(value, 220))
    .filter(Boolean)
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
  const screenTurn = subject === 'task-knot' || subject === 'visible-scene'
  const shouldWithholdSpecificity = truthDiscipline === 'observe-then-hypothesize'
    || truthDiscipline === 'memory-labeled'
    || (truthDiscipline === 'repair-first' && screenTurn)
  const shouldSelfRevise = truthDiscipline === 'repair-first'
    || answerCompiler.turnMode === 'screen-repair'
    || dialogueEncounter?.mustRepairFirst === true
  const consciousNeed = pickDynamicTextWithSource(
    420,
    [
      {
        preserveUserAuthoredText: true,
        source: 'question',
        value: matchesUserText(discourseState.currentQuestion)
          ? discourseState.currentQuestion
          : null,
        sourceTag: 'need-source:discourse-question',
      },
      {
        preserveUserAuthoredText: true,
        source: 'question',
        value: matchesUserText(conversationState?.unansweredQuestion)
          ? conversationState?.unansweredQuestion
          : null,
        sourceTag: 'need-source:conversation-question',
      },
      {
        preserveUserAuthoredText: true,
        source: 'question',
        value: conversationAnchorIsQuestion
          ? conversationState?.primaryTurnAnchor
          : null,
        sourceTag: 'need-source:conversation-question',
      },
      {
        preserveUserAuthoredText: true,
        source: 'question',
        value: discourseAnchorIsQuestion
          ? discourseState.primaryTurnAnchor
          : null,
        sourceTag: 'need-source:discourse-question',
      },
      {
        preserveUserAuthoredText: true,
        source: 'user-text',
        value: conversationAnchorIsUserText
          ? conversationState?.primaryTurnAnchor
          : null,
        sourceTag: 'need-source:user-text',
      },
      {
        preserveUserAuthoredText: true,
        source: 'user-text',
        value: discourseAnchorIsUserText
          ? discourseState.primaryTurnAnchor
          : null,
        sourceTag: 'need-source:user-text',
      },
      {
        preserveUserAuthoredText: true,
        source: 'host-move',
        value: hostMoveIsUserText
          ? conversationState?.hostMove
          : null,
        sourceTag: 'need-source:host-move',
      },
      {
        preserveUserAuthoredText: true,
        source: 'user-text',
        value: userText,
        sourceTag: 'need-source:user-text',
      },
      {
        value: conversationState?.owedRepair,
        sourceTag: 'need-source:conversation-repair',
      },
      {
        value: discourseState.ruptureRepair,
        sourceTag: 'need-source:discourse-repair',
      },
    ],
  )
  const consciousTension = pickDynamicTextWithSource(
    420,
    [
      {
        value: answerCompiler.uncertaintyBoundary,
        sourceTag: 'tension-source:uncertainty-boundary',
      },
      {
        value: conversationState?.owedRepair,
        sourceTag: 'tension-source:conversation-repair',
      },
      {
        value: discourseState.ruptureRepair,
        sourceTag: 'tension-source:discourse-repair',
      },
      {
        value: mindSynthesis?.uncertainties?.[0]?.summary,
        sourceTag: 'tension-source:mind-uncertainty',
      },
    ],
  )
  return {
    subject,
    centerOfGravity,
    truthDiscipline,
    consciousNeed: consciousNeed?.text ?? '',
    consciousNeedSource: consciousNeed?.source ?? null,
    consciousTension: consciousTension?.text ?? '',
    speakingIntention: '',
    focusAnchor: primaryAnchor,
    focusAnchorSource: primaryAnchorSelection?.focusSource ?? null,
    withheldImpulse: null,
    shouldWithholdSpecificity,
    shouldSelfRevise,
    confidence: clamp01(
      answerCompiler.confidence * 0.38
      + (mindSynthesis?.confidence ?? 0.42) * 0.24
      + (dialogueEncounter?.confidence ?? discourseState.confidence) * 0.22
      + (privateThought?.confidence ?? 0.34) * 0.16,
    ),
    reasonTags: uniqueReasonTags([
      `subject:${subject}`,
      `center:${centerOfGravity}`,
      `discipline:${truthDiscipline}`,
      `evidence:${answerCompiler.evidenceMode}`,
      answerCompiler.recommendedAct ? `act:${answerCompiler.recommendedAct}` : null,
      consciousNeed?.sourceTag,
      consciousTension?.sourceTag,
      shouldWithholdSpecificity ? 'withhold-specificity' : null,
      shouldSelfRevise ? 'self-revise' : null,
    ]),
    updatedAt: input.now,
  }
}
