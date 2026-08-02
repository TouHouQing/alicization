import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialogueTurnEncounterSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationVisualSceneSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import { buildAlicizationScreenSurfaceCue } from '@proj-alicization/stage-shared'

import { isDialogueFirstSubject, sanitizeDialogueAnchorText, sanitizeDialogueSurfaceText } from './dialogue-surface-text'

const technicalIdentifierPattern = /\b[A-Z][A-Za-z0-9]{2,}(?:Controller|Service|Manager|Repository|Component|ViewModel|Enum|Request|Response|DTO|VO|Mapper|Factory|Handler|Config|Client|Provider|Module|Entity|Model)\b/gu
const fileLikePattern = /\b(?:[\w-]+[\\/])*[\w.-]+\.(?:ts|tsx|js|jsx|mjs|cjs|java|kt|kts|swift|go|rs|py|vue|json|ya?ml|sql|md)\b/giu

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

function pickSurfaceText(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeDialogueSurfaceText(value, 220)
    if (normalized)
      return normalized
  }
  return ''
}

function pickAnchorText(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeDialogueAnchorText(value, 220)
    if (normalized)
      return normalized
  }
  return ''
}

interface AlicizationDialogueEncounterSurface extends Pick<
  AlicizationDialogueTurnEncounterSnapshot,
  'subject' | 'screenReferenceMode' | 'dialogueFirst' | 'summary' | 'taskAnchor'
> {}

export function normalizeTechnicalSpecificityCue(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[`"'“”‘’]/gu, '')
    .replace(/\\/gu, '/')
    .replace(/\s+/gu, '')
    .trim()
}

function pushUniqueCue(target: string[], raw: unknown, maxItems = 12) {
  const normalized = sanitizeText(raw, 120)
  const normalizedCue = normalizeTechnicalSpecificityCue(normalized)
  if (!normalized || !normalizedCue)
    return
  if (target.some(item => normalizeTechnicalSpecificityCue(item) === normalizedCue))
    return
  target.push(normalized)
  if (target.length > maxItems)
    target.length = maxItems
}

export function extractTechnicalSpecificityClaims(raw: unknown, maxItems = 12) {
  if (typeof raw !== 'string' || !raw.trim())
    return []

  const claims: string[] = []
  const fileMatches = raw.matchAll(new RegExp(fileLikePattern.source, fileLikePattern.flags))
  const identifierMatches = raw.matchAll(new RegExp(technicalIdentifierPattern.source, technicalIdentifierPattern.flags))
  for (const match of fileMatches)
    pushUniqueCue(claims, match[0], maxItems)
  for (const match of identifierMatches)
    pushUniqueCue(claims, match[0], maxItems)
  return claims.slice(0, maxItems)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
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

function normalizeSpecificityBudget(raw: unknown): AlicizationClaimEvidenceLedgerSnapshot['specificityBudget'] | null {
  return raw === 'dialogue-only'
    || raw === 'coarse-scene'
    || raw === 'grounded-artifacts'
    ? raw
    : null
}

export function normalizeClaimEvidenceLedger(raw: unknown): AlicizationClaimEvidenceLedgerSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const subject = candidate.subject
  const evidenceMode = candidate.evidenceMode
  const specificityBudget = normalizeSpecificityBudget(candidate.specificityBudget)
  if (
    (subject !== 'alicization-self'
      && subject !== 'relationship'
      && subject !== 'host-state'
      && subject !== 'task-knot'
      && subject !== 'visible-scene'
      && subject !== 'general')
    || (evidenceMode !== 'live-grounded'
      && evidenceMode !== 'live-observed'
      && evidenceMode !== 'coarse-held'
      && evidenceMode !== 'dialogue-grounded'
      && evidenceMode !== 'continuity-carry'
      && evidenceMode !== 'repair-first')
    || !specificityBudget
  ) {
    return null
  }

  return {
    subject,
    evidenceMode,
    observedSurface: sanitizeText(candidate.observedSurface, 220) || null,
    taskHypothesis: sanitizeText(candidate.taskHypothesis, 220) || null,
    intentHypothesis: sanitizeText(candidate.intentHypothesis, 220) || null,
    specificityBudget,
    hostReferencedCues: Array.isArray(candidate.hostReferencedCues)
      ? candidate.hostReferencedCues.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 120)).filter(Boolean).slice(0, 12)
      : [],
    groundedArtifactCues: Array.isArray(candidate.groundedArtifactCues)
      ? candidate.groundedArtifactCues.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 120)).filter(Boolean).slice(0, 12)
      : [],
    allowedSpecificCues: Array.isArray(candidate.allowedSpecificCues)
      ? candidate.allowedSpecificCues.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 120)).filter(Boolean).slice(0, 12)
      : [],
    shouldLabelHypothesis: candidate.shouldLabelHypothesis === true,
    forbidUnsupportedSpecificity: candidate.forbidUnsupportedSpecificity === true,
    shouldSelfRevise: candidate.shouldSelfRevise === true,
    confidence: clamp01(Number(candidate.confidence)),
    reasonTags: Array.isArray(candidate.reasonTags)
      ? candidate.reasonTags.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 96)).filter(Boolean).slice(0, 10)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function resolveObservedSurface(input: {
  sceneCue: string
  dialogueFirst: boolean
  discourseState: AlicizationDiscourseStateSnapshot
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueEncounterSurface | null
  answerCompiler: AlicizationAnswerCompilerSnapshot
}) {
  if (input.dialogueFirst) {
    return pickSurfaceText(
      input.conversationState?.primaryTurnAnchor,
      input.discourseState.primaryTurnAnchor,
      input.dialogueEncounter?.taskAnchor,
      input.conversationState?.hostMove,
      input.discourseState.currentQuestion,
    ) || null
  }

  return pickSurfaceText(
    input.sceneCue,
    input.answerCompiler.supportingReality[0],
    input.answerCompiler.supportingReality[1],
    input.answerCompiler.openingClaim,
    input.dialogueEncounter?.summary,
    input.discourseState.currentTurnSummary,
  ) || null
}

export function buildClaimEvidenceLedger(input: {
  now: number
  discourseState?: AlicizationDiscourseStateSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | AlicizationDialogueEncounterSurface | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  currentScene?: AlicizationVisualSceneSnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
}): AlicizationClaimEvidenceLedgerSnapshot | null {
  const runtimeSurface = input.runtimeSurface ?? null
  const discourseState = runtimeSurface?.dialogue.discourseState ?? input.discourseState ?? null
  const conversationState = runtimeSurface?.dialogue.conversationState ?? input.conversationState ?? null
  const dialogueEncounter = runtimeSurface?.dialogue.dialogueEncounter ?? input.dialogueEncounter ?? null
  const answerCompiler = runtimeSurface?.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const currentConsciousFrame = runtimeSurface?.dialogue.currentConsciousFrame ?? input.currentConsciousFrame ?? null
  const currentScene = runtimeSurface?.perception.currentScene ?? input.currentScene ?? null

  if (!discourseState || !answerCompiler)
    return null

  const subject = dialogueEncounter?.subject
    ?? answerCompiler.answerSubject
    ?? discourseState.currentTurnSubject
  const dialogueFirst = dialogueEncounter?.screenReferenceMode === 'avoid'
    || answerCompiler.screenReferenceMode === 'avoid'
    || isDialogueFirstSubject(subject)
  const screenCentricTurn = subject === 'task-knot' || subject === 'visible-scene'
  const sceneCue = buildAlicizationScreenSurfaceCue({
    rawCues: [
      currentScene?.summary,
      currentScene?.target?.title,
      answerCompiler.supportingReality[0],
      answerCompiler.supportingReality[1],
    ],
    target: currentScene?.target ?? null,
    scenario: currentScene?.scenario ?? null,
    workloadKind: currentScene?.workloadKind ?? null,
    contentKind: currentScene?.contentKind ?? null,
  })

  const hostReferencedCues = uniqueList([
    ...extractTechnicalSpecificityClaims(conversationState?.hostMove),
    ...extractTechnicalSpecificityClaims(conversationState?.unansweredQuestion),
    ...extractTechnicalSpecificityClaims(conversationState?.primaryTurnAnchor),
    ...extractTechnicalSpecificityClaims(discourseState.currentQuestion),
    ...extractTechnicalSpecificityClaims(discourseState.primaryTurnAnchor),
    ...extractTechnicalSpecificityClaims(dialogueEncounter?.taskAnchor),
  ], 12)

  const groundedArtifactCues = (
    !dialogueFirst
    && (answerCompiler.evidenceMode === 'live-grounded' || answerCompiler.evidenceMode === 'live-observed')
  )
    ? uniqueList([
        ...extractTechnicalSpecificityClaims(currentScene?.summary),
        ...extractTechnicalSpecificityClaims(currentScene?.target?.title),
        ...extractTechnicalSpecificityClaims(answerCompiler.openingClaim),
        ...extractTechnicalSpecificityClaims(answerCompiler.supportingReality[0]),
        ...extractTechnicalSpecificityClaims(answerCompiler.supportingReality[1]),
      ], 12)
    : []

  const allowedSpecificCues = uniqueList([
    ...hostReferencedCues,
    ...groundedArtifactCues,
  ], 12)
  const specificityBudget = dialogueFirst
    ? 'dialogue-only' as const
    : groundedArtifactCues.length > 0
      ? 'grounded-artifacts' as const
      : 'coarse-scene' as const
  const shouldLabelHypothesis = screenCentricTurn
    && (
      specificityBudget === 'coarse-scene'
      || answerCompiler.evidenceMode === 'coarse-held'
      || answerCompiler.evidenceMode === 'continuity-carry'
      || answerCompiler.evidenceMode === 'repair-first'
      || currentConsciousFrame?.truthDiscipline === 'observe-then-hypothesize'
      || currentConsciousFrame?.shouldWithholdSpecificity === true
    )
  const observedSurface = resolveObservedSurface({
    sceneCue,
    dialogueFirst,
    discourseState,
    conversationState,
    dialogueEncounter,
    answerCompiler,
  })
  const taskHypothesis = pickSurfaceText(
    answerCompiler.openingClaim,
    conversationState?.jointThread,
    conversationState?.unansweredQuestion,
    discourseState.currentQuestion,
    dialogueEncounter?.summary,
  ) || null
  const intentHypothesis = pickSurfaceText(
    currentConsciousFrame?.speakingIntention,
    currentConsciousFrame?.consciousNeed,
    answerCompiler.nextMove,
    answerCompiler.openingDirective,
  ) || null

  return {
    subject,
    evidenceMode: answerCompiler.evidenceMode,
    observedSurface,
    taskHypothesis,
    intentHypothesis,
    specificityBudget,
    hostReferencedCues,
    groundedArtifactCues,
    allowedSpecificCues,
    shouldLabelHypothesis,
    forbidUnsupportedSpecificity: dialogueFirst || screenCentricTurn,
    shouldSelfRevise: currentConsciousFrame?.shouldSelfRevise === true
      || answerCompiler.recommendedAct === 'ask-reground'
      || answerCompiler.recommendedAct === 'correct-stale-anchor',
    confidence: clamp01(
      answerCompiler.confidence * 0.46
      + discourseState.confidence * 0.28
      + (currentConsciousFrame?.confidence ?? 0.42) * 0.26,
    ),
    reasonTags: uniqueList([
      `subject:${subject}`,
      `evidence:${answerCompiler.evidenceMode}`,
      `budget:${specificityBudget}`,
      shouldLabelHypothesis ? 'label-hypothesis' : null,
      (dialogueFirst || screenCentricTurn) ? 'forbid-unsupported-specificity' : null,
      hostReferencedCues.length > 0 ? 'host-referenced-artifacts' : null,
      groundedArtifactCues.length > 0 ? 'grounded-artifacts' : null,
      currentConsciousFrame?.shouldWithholdSpecificity ? 'withhold-specificity' : null,
      currentConsciousFrame?.shouldSelfRevise ? 'self-revise' : null,
      pickAnchorText(currentConsciousFrame?.focusAnchor, discourseState.primaryTurnAnchor) || null,
    ], 8),
    updatedAt: input.now,
  }
}
