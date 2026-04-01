import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationVisualSceneSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'

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
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
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
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  currentScene?: AlicizationVisualSceneSnapshot | null
}): AlicizationClaimEvidenceLedgerSnapshot | null {
  if (!input.discourseState || !input.answerCompiler)
    return null

  const subject = input.dialogueEncounter?.subject
    ?? input.answerCompiler.answerSubject
    ?? input.discourseState.currentTurnSubject
  const dialogueFirst = input.dialogueEncounter?.screenReferenceMode === 'avoid'
    || input.answerCompiler.screenReferenceMode === 'avoid'
    || isDialogueFirstSubject(subject)
  const screenCentricTurn = subject === 'task-knot' || subject === 'visible-scene'
  const sceneCue = buildAlicizationScreenSurfaceCue({
    rawCues: [
      input.currentScene?.summary,
      input.currentScene?.target?.title,
      input.answerCompiler.supportingReality[0],
      input.answerCompiler.supportingReality[1],
    ],
    target: input.currentScene?.target ?? null,
    scenario: input.currentScene?.scenario ?? null,
    workloadKind: input.currentScene?.workloadKind ?? null,
    contentKind: input.currentScene?.contentKind ?? null,
  })

  const hostReferencedCues = uniqueList([
    ...extractTechnicalSpecificityClaims(input.conversationState?.hostMove),
    ...extractTechnicalSpecificityClaims(input.conversationState?.unansweredQuestion),
    ...extractTechnicalSpecificityClaims(input.conversationState?.primaryTurnAnchor),
    ...extractTechnicalSpecificityClaims(input.discourseState.currentQuestion),
    ...extractTechnicalSpecificityClaims(input.discourseState.primaryTurnAnchor),
    ...extractTechnicalSpecificityClaims(input.dialogueEncounter?.taskAnchor),
  ], 12)

  const groundedArtifactCues = (
    !dialogueFirst
    && (input.answerCompiler.evidenceMode === 'live-grounded' || input.answerCompiler.evidenceMode === 'live-observed')
  )
    ? uniqueList([
        ...extractTechnicalSpecificityClaims(input.currentScene?.summary),
        ...extractTechnicalSpecificityClaims(input.currentScene?.target?.title),
        ...extractTechnicalSpecificityClaims(input.answerCompiler.openingClaim),
        ...extractTechnicalSpecificityClaims(input.answerCompiler.supportingReality[0]),
        ...extractTechnicalSpecificityClaims(input.answerCompiler.supportingReality[1]),
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
      || input.answerCompiler.evidenceMode === 'coarse-held'
      || input.answerCompiler.evidenceMode === 'continuity-carry'
      || input.answerCompiler.evidenceMode === 'repair-first'
      || input.currentConsciousFrame?.truthDiscipline === 'observe-then-hypothesize'
      || input.currentConsciousFrame?.shouldWithholdSpecificity === true
    )
  const observedSurface = resolveObservedSurface({
    sceneCue,
    dialogueFirst,
    discourseState: input.discourseState,
    conversationState: input.conversationState ?? null,
    dialogueEncounter: input.dialogueEncounter ?? null,
    answerCompiler: input.answerCompiler,
  })
  const taskHypothesis = pickSurfaceText(
    input.answerCompiler.openingClaim,
    input.conversationState?.jointThread,
    input.conversationState?.unansweredQuestion,
    input.discourseState.currentQuestion,
    input.dialogueEncounter?.summary,
  ) || null
  const intentHypothesis = pickSurfaceText(
    input.currentConsciousFrame?.speakingIntention,
    input.currentConsciousFrame?.consciousNeed,
    input.answerCompiler.nextMove,
    input.answerCompiler.openingDirective,
  ) || null

  return {
    subject,
    evidenceMode: input.answerCompiler.evidenceMode,
    observedSurface,
    taskHypothesis,
    intentHypothesis,
    specificityBudget,
    hostReferencedCues,
    groundedArtifactCues,
    allowedSpecificCues,
    shouldLabelHypothesis,
    forbidUnsupportedSpecificity: dialogueFirst || screenCentricTurn,
    shouldSelfRevise: input.currentConsciousFrame?.shouldSelfRevise === true
      || input.answerCompiler.recommendedAct === 'ask-reground'
      || input.answerCompiler.recommendedAct === 'correct-stale-anchor',
    confidence: clamp01(
      input.answerCompiler.confidence * 0.46
      + input.discourseState.confidence * 0.28
      + (input.currentConsciousFrame?.confidence ?? 0.42) * 0.26,
    ),
    reasonTags: uniqueList([
      `subject:${subject}`,
      `evidence:${input.answerCompiler.evidenceMode}`,
      `budget:${specificityBudget}`,
      shouldLabelHypothesis ? 'label-hypothesis' : null,
      (dialogueFirst || screenCentricTurn) ? 'forbid-unsupported-specificity' : null,
      hostReferencedCues.length > 0 ? 'host-referenced-artifacts' : null,
      groundedArtifactCues.length > 0 ? 'grounded-artifacts' : null,
      input.currentConsciousFrame?.shouldWithholdSpecificity ? 'withhold-specificity' : null,
      input.currentConsciousFrame?.shouldSelfRevise ? 'self-revise' : null,
      pickAnchorText(input.currentConsciousFrame?.focusAnchor, input.discourseState.primaryTurnAnchor) || null,
    ], 8),
    updatedAt: input.now,
  }
}

export function buildClaimEvidenceLedgerSystemBlock(
  state: AlicizationClaimEvidenceLedgerSnapshot | null | undefined,
) {
  if (!state)
    return ''

  return [
    '[ALICIZATION_CLAIM_EVIDENCE_LEDGER]',
    'This block tracks what is actually evidenced for the current turn and how much visible specificity the reply is allowed to claim.',
    `Subject: ${state.subject}.`,
    `Evidence mode: ${state.evidenceMode}.`,
    `Observed surface: ${state.observedSurface ?? 'none'}.`,
    `Task hypothesis: ${state.taskHypothesis ?? 'none'}.`,
    `Intent hypothesis: ${state.intentHypothesis ?? 'none'}.`,
    `Specificity budget: ${state.specificityBudget}.`,
    `Host referenced cues: ${state.hostReferencedCues.length > 0 ? state.hostReferencedCues.join(' | ') : 'none'}.`,
    `Grounded artifact cues: ${state.groundedArtifactCues.length > 0 ? state.groundedArtifactCues.join(' | ') : 'none'}.`,
    `Allowed specific cues: ${state.allowedSpecificCues.length > 0 ? state.allowedSpecificCues.join(' | ') : 'none'}.`,
    `Label hypothesis explicitly: ${state.shouldLabelHypothesis ? 'yes' : 'no'}.`,
    `Unsupported specificity forbidden: ${state.forbidUnsupportedSpecificity ? 'yes' : 'no'}.`,
    `Self revision pressure: ${state.shouldSelfRevise ? 'yes' : 'no'}.`,
    `Reason tags: ${state.reasonTags.join(' | ') || 'none'}.`,
  ].join('\n')
}
