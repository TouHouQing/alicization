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
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'

import {
  sanitizeDialogueAnchorText,
  sanitizeDialogueSurfaceText,
} from './dialogue-surface-text'

interface AlicizationDialogueEncounterSurface extends Pick<
  AlicizationDialogueTurnEncounterSnapshot,
  'subject' | 'screenReferenceMode' | 'dialogueFirst' | 'summary' | 'taskAnchor' | 'mustRepairFirst' | 'confidence'
> {}

type AlicizationCurrentConsciousProjectState
  = NonNullable<AlicizationCurrentConsciousFrameSnapshot['projectState']>

type AlicizationContinuityTiming
  = AlicizationCurrentConsciousFrameSnapshot['continuityPreferredTiming']

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
        text: normalized,
        sourceTag: candidate.sourceTag,
      }
    }
  }
  return null
}

function pickDynamicAnchor(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeDynamicAnchor(value)
    if (normalized)
      return normalized
  }
  return ''
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

function sanitizeContinuityTiming(raw: unknown): AlicizationContinuityTiming {
  return raw === 'internal-only'
    || raw === 'after-payoff'
    || raw === 'same-turn-if-invited'
    || raw === 'next-open-window'
    ? raw
    : null
}

function sanitizeContinuityRestraint(raw: unknown): AlicizationCurrentConsciousProjectState['continuityRestraint'] {
  return raw === 'lower-pressure'
    || raw === 'measured-return'
    || raw === 'repair-before-closeness'
    || raw === 'rest-protective'
    || raw === 'single-thread'
    ? raw
    : null
}

function sanitizeStructuredSlug(raw: unknown) {
  const normalized = sanitizeText(raw, 80).toLowerCase()
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(normalized) ? normalized : null
}

function sanitizeBlinkCadence(raw: unknown): AlicizationCurrentConsciousProjectState['preferredBlinkCadence'] {
  return raw === 'normal' || raw === 'linger' || raw === 'quiet' ? raw : null
}

function sanitizeGazeMode(raw: unknown): AlicizationCurrentConsciousProjectState['preferredGazeMode'] {
  return raw === 'steady' || raw === 'soften' || raw === 'drift' ? raw : null
}

function sanitizePauseMode(raw: unknown): AlicizationCurrentConsciousProjectState['preferredPauseMode'] {
  return raw === 'longer' || raw === 'natural' ? raw : null
}

function sanitizeLipsyncMode(raw: unknown): AlicizationCurrentConsciousProjectState['preferredLipsyncMode'] {
  return raw === 'restrained' || raw === 'matched' ? raw : null
}

function sanitizeVoiceMode(raw: unknown): AlicizationCurrentConsciousProjectState['preferredVoiceMode'] {
  return raw === 'lower-pressure' || raw === 'even' ? raw : null
}

function sanitizePacingMode(raw: unknown): AlicizationCurrentConsciousProjectState['preferredPacingMode'] {
  return raw === 'slower' || raw === 'natural' ? raw : null
}

function resolveTypedProjectState(
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface | null,
): AlicizationCurrentConsciousFrameSnapshot['projectState'] {
  const sources = [
    runtimeSurface?.dialogue?.currentConsciousFrame?.projectState,
    runtimeSurface?.dialogue?.runtimeDigest?.projectState,
    runtimeSurface?.cognition?.runtimeDigest?.projectState,
    runtimeSurface?.raw?.runtimeDigest?.projectState,
    runtimeSurface?.raw?.runtime?.projectState,
    runtimeSurface?.raw?.projectState,
  ].filter(Boolean)

  const pick = <T>(key: string, normalize: (raw: unknown) => T | null) => {
    for (const source of sources) {
      const value = (source as Record<string, unknown>)[key]
      const normalized = normalize(value)
      if (normalized !== null)
        return normalized
    }
    return null
  }

  const continuityPreferredTiming = pick('continuityPreferredTiming', sanitizeContinuityTiming)
  const continuityCadence = pick('continuityCadence', sanitizeStructuredSlug)
  const continuityRestraint = pick('continuityRestraint', sanitizeContinuityRestraint)
  const continuityArcStage = pick('continuityArcStage', sanitizeStructuredSlug)
  const preferredBlinkCadence = pick('preferredBlinkCadence', sanitizeBlinkCadence)
  const preferredGazeMode = pick('preferredGazeMode', sanitizeGazeMode)
  const preferredPauseMode = pick('preferredPauseMode', sanitizePauseMode)
  const preferredLipsyncMode = pick('preferredLipsyncMode', sanitizeLipsyncMode)
  const preferredVoiceMode = pick('preferredVoiceMode', sanitizeVoiceMode)
  const preferredPacingMode = pick('preferredPacingMode', sanitizePacingMode)

  if (
    !continuityPreferredTiming
    && !continuityCadence
    && !continuityRestraint
    && !continuityArcStage
    && !preferredBlinkCadence
    && !preferredGazeMode
    && !preferredPauseMode
    && !preferredLipsyncMode
    && !preferredVoiceMode
    && !preferredPacingMode
  ) {
    return null
  }

  return {
    continuityPreferredTiming,
    continuityCadence,
    continuityRestraint,
    continuityArcStage,
    preferredBlinkCadence,
    preferredGazeMode,
    preferredPauseMode,
    preferredLipsyncMode,
    preferredVoiceMode,
    preferredPacingMode,
  }
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
  const discourseState = runtimeSurface?.dialogue?.discourseState ?? input.discourseState ?? null
  const conversationState = runtimeSurface?.dialogue?.conversationState ?? input.conversationState ?? null
  const dialogueEncounter = runtimeSurface?.dialogue?.dialogueEncounter ?? input.dialogueEncounter ?? null
  const mindSynthesis = runtimeSurface?.dialogue?.mindSynthesis ?? input.mindSynthesis ?? null
  const answerCompiler = runtimeSurface?.dialogue?.answerCompiler ?? input.answerCompiler ?? null
  const privateThought = runtimeSurface?.cognition?.privateThought ?? input.privateThought ?? null
  const initiative = runtimeSurface?.agency?.initiative ?? input.initiative ?? null

  if (!discourseState || !answerCompiler)
    return null

  const subject = dialogueEncounter?.subject ?? discourseState.currentTurnSubject
  const primaryAnchor = pickDynamicAnchor(
    conversationState?.primaryTurnAnchor,
    discourseState.primaryTurnAnchor,
    dialogueEncounter?.taskAnchor,
    conversationState?.hostMove,
  ) || null
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
  const projectState = resolveTypedProjectState(runtimeSurface)
  const consciousNeed = pickDynamicTextWithSource(
    420,
    [
      {
        preserveUserAuthoredText: true,
        value: discourseState.currentQuestion,
        sourceTag: 'need-source:discourse-question',
      },
      {
        preserveUserAuthoredText: true,
        value: conversationState?.unansweredQuestion,
        sourceTag: 'need-source:conversation-question',
      },
      {
        value: conversationState?.owedRepair,
        sourceTag: 'need-source:conversation-repair',
      },
      {
        value: discourseState.ruptureRepair,
        sourceTag: 'need-source:discourse-repair',
      },
      {
        value: shouldSelfRevise ? dialogueEncounter?.summary : null,
        sourceTag: 'need-source:dialogue-encounter',
      },
      {
        value: primaryAnchor,
        sourceTag: 'need-source:primary-anchor',
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
  const continuityPreferredTiming = projectState?.continuityPreferredTiming ?? null
  const continuityCadence = projectState?.continuityCadence ?? null

  return {
    subject,
    centerOfGravity,
    truthDiscipline,
    consciousNeed: consciousNeed?.text ?? '',
    consciousTension: consciousTension?.text ?? '',
    speakingIntention: '',
    focusAnchor: primaryAnchor,
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
      projectState?.continuityArcStage ? `continuity-arc:${projectState.continuityArcStage}` : null,
      continuityPreferredTiming ? `continuity-timing:${continuityPreferredTiming}` : null,
      continuityCadence ? `continuity-cadence:${continuityCadence}` : null,
    ]),
    continuityPreferredTiming,
    continuityCadence,
    projectState,
    updatedAt: input.now,
  }
}
