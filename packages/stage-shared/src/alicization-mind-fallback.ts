// NOTICE: This helper lives in stage-shared instead of stage-ui because the
// desktop main process must not import raw TypeScript source from
// `node_modules/@proj-alicization/stage-ui/src/...` inside packaged apps.
// That packaging shape crashes under Node's `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`.
// Keep this module framework-free and main-safe so both renderer and main can
// share the same governed reply surface without pulling Vue-side sources.

import type { AlicizationExecutionDispatchChannel } from './alicization-execution-intent'

import { analyzeAlicizationExecutionTurnAuthority } from './alicization-execution-intent'
import {
  deriveAlicizationInspectionSignalProfile,
  inferAlicizationInspectionIntent,
} from './alicization-inspection-intent'
import { buildAlicizationScreenSurfaceCue, isWeakAlicizationScreenSurfaceCue } from './alicization-screen-surface'

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

const internalGovernedSurfacePattern = /\b(?:the turn is|what matters first is|this turn is about|answer the relationship bid|open by|stay with the|pay off the|correct the|ask for the missing grounding|offer one concrete next step|keep the care|do not let|cannot be deferred|detached explanation|relational position|truth boundary|present-tense fact|present-tense scene claims are constrained|stale anchor or ungrounded seam|window-level cues only explain surface context|shared thread|current seam|held memory|live scene|narrowest truthful reply|active knot|there is a real care need under the current scene|is this a moment to stay near quietly|would speaking now feel like crowding the host|which belief is stale memory|still reflects the current world|where exactly is the real knot|acknowledge the current condition,? but keep it attached to the actual issue|窗口级线索只能说明表层上下文|宿主(?:正在审视|还在沿着|刚从|现在更像是在浏览|把当前注意力放在|停留在)|她(?:还没重新看见|还想再确认一次|把这一刻读成|更想先护住|像是在沿着|像是在衡量)|真正卡住的是哪一处|误把路过窗口当作问题核心)\b/iu
const governedNarrationPattern = /\b(?:the host|this turn|turning the dialogue|dialogue-first|relationship bid|shared presence|self continuity|plain direct answer|living thread|current seam|should stay near|stay near that bid|expects a plain direct answer|wants a plain direct answer|answer the host(?:'s)? question|我先纠正一下|刚才那一下我借错了参照|刚才我把前一条线错带进这句里了|这一轮我还没重新看稳当前画面|我记得上一条线里有|我只说我现在能确实看见的|我就正面回你|我直接答你|let me correct that first|i borrowed the wrong reference just now|i pulled the wrong thread into this reply just now|i do not have a fresh enough view|the previous line is still warm in my head|i still remember|i'll stay with what i can honestly see|then i'll answer you directly|i'll answer you directly)\b/iu
const windowTracePattern = /\s\|\s|(?:^|[\s(,.:;-])(?:general unknown|entire screen)(?:$|[\s),.:;-])/iu
const cjkPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
const englishMetaWordPattern = /\b(?:the|this|host|turn|dialogue|relationship|answer|current|should|would|expects|wants)\b/iu
const tentativeSceneReadPattern = /我猜|看起来|像是|可能|应该|大概|估计|猜测|maybe|looks like|seems|probably|might be/iu
const decorativeRepairDriftPattern = /主人|[欸呀呢嘛啦哟喵～]|抱抱|亲亲|我好心疼|心疼你|眼睛一定很累|先休息|辛苦了|…{3,}/u
const repairCorrectionPattern = /不是刚才|不是上一条|不是上一个|旧锚点|旧画面|旧页面|旧线程|上一条线|前一条线|刚才那页|刚才那张|那不是现在|借错了参照|错带进这句里|不是你现在这幕|前一段残影/u
const repairRegroundPattern = /新画面|新页面|当前画面|当前屏幕|现在这张|现在这一页|按这次|按现在|按你现在|重新说|重新看|重新落地|重新判断/u
const repairBoundaryPattern = /真实边界|实时画面根据|旧记忆当成当前屏幕|旧记忆当成你现在的屏幕|不拿旧印象硬说现在|重新看稳当前画面|这轮的新落点|truth boundary|stable enough live view|older memory as your current screen|fresh enough view of the current scene/iu

function countCjkChars(raw: string) {
  return [...raw].filter(char => cjkPattern.test(char)).length
}

export const alicizationGovernedMindEmotionWhitelist = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'concerned',
  'tired',
  'apologetic',
  'surprised',
  'thinking',
] as const

export type AlicizationGovernedMindEmotion = typeof alicizationGovernedMindEmotionWhitelist[number]
export type AlicizationGovernedMindAnswerSubject
  = | 'alicization-self'
    | 'project-state'
    | 'relationship'
    | 'host-state'
    | 'task-knot'
    | 'visible-scene'
    | 'general'
export type AlicizationGovernedMindTurnMode
  = | 'grounded-inspection'
    | 'screen-repair'
    | 'guide-current-knot'
    | 'care'
    | 'accompany'
    | 'answer'
export type AlicizationGovernedMindTruthState
  = | 'live-grounded'
    | 'live-observed'
    | 'dialogue-grounded'
    | 'remembered'
    | 'imagined'
    | 'uncertain'
export type AlicizationGovernedMindAnswerAct
  = | 'answer'
    | 'guide'
    | 'ask-reground'
    | 'correct-stale-anchor'
    | 'care'
    | 'defer'
export type AlicizationGovernedMindEvidenceMode
  = | 'live-grounded'
    | 'live-observed'
    | 'coarse-held'
    | 'dialogue-grounded'
    | 'continuity-carry'
    | 'repair-first'
export type AlicizationGovernedMindScreenReferenceMode
  = | 'required'
    | 'helpful'
    | 'incidental'
    | 'avoid'
export type AlicizationGovernedMindRelationshipPosture = 'restrained' | 'warm' | 'tender'
export type AlicizationGovernedMindRepairState = 'none' | 'stale-anchor' | 'need-reground'

export interface AlicizationGovernedMindDialogueActKernelLike {
  openingMove?: string | null
  answerIntent?: string | null
  whyNow?: string | null
  openingClaim?: string | null
  selectedEvidence?: Array<{ summary?: string | null }>
  mustSay?: string[]
}

export interface AlicizationGovernedMindTurnFrameLike {
  focusAnchor?: string | null
  world?: {
    visibleSurface?: string | null
    truthState?: AlicizationGovernedMindTruthState | null
  } | null
  relation?: {
    relationshipPosture?: AlicizationGovernedMindRelationshipPosture | null
    subject?: AlicizationGovernedMindAnswerSubject | null
  } | null
  memory?: {
    carriedThread?: string | null
  } | null
  obligation?: {
    answerIntent?: string | null
    openingClaim?: string | null
    openingMove?: string | null
    answerAct?: AlicizationGovernedMindAnswerAct | null
  } | null
}

export interface AlicizationMindTurnGovernanceLike {
  turnMode: AlicizationGovernedMindTurnMode
  truthState: AlicizationGovernedMindTruthState
  groundedThisTurn?: boolean
  relationshipPosture: AlicizationGovernedMindRelationshipPosture
  answerSubject?: AlicizationGovernedMindAnswerSubject | null
  screenReferenceMode?: AlicizationGovernedMindScreenReferenceMode | null
  answerAct?: AlicizationGovernedMindAnswerAct | null
  evidenceMode?: AlicizationGovernedMindEvidenceMode | null
  repairState: AlicizationGovernedMindRepairState
  liveSurface?: string | null
  focusAnchor?: string | null
  answerIntent?: string | null
  openingMove?: string | null
  emotionalClosureCue?: string | null
  carriedThread?: string | null
  labelCarryAsMemory: boolean
  shouldAskForGrounding: boolean
  shouldAcknowledgeRepair: boolean
  maxSentences: number
  dialogueActKernel?: AlicizationGovernedMindDialogueActKernelLike | null
  mindTurnFrame?: AlicizationGovernedMindTurnFrameLike | null
  projectState?: {
    identity: string
    currentPhase: string
    preflightSummary?: string | null
    preDialogueAwarenessLine?: string | null
    latestLandedProgress: string | null
    latestProgress?: string | null
    landedProgressSummary?: string | null
    primaryOpenLoop: string | null
    nextClosureTarget: string
    sameHerSelfLine?: string | null
    sameHerHoldDetail?: string | null
    sameHerDriftRisk?: string | null
    continuitySummary?: string | null
    companionHeadlineLine?: string | null
  } | null
  mustDo: string[]
  mustNotDo: string[]
}

export interface AlicizationExecutionFirstGovernanceNormalization<T extends AlicizationMindTurnGovernanceLike = AlicizationMindTurnGovernanceLike> {
  applied: boolean
  executionBound: boolean
  explicitExecutionDemand: boolean
  governance: T | null
  mentionedDispatchChannels: AlicizationExecutionDispatchChannel[]
  reasonCodes: string[]
  signalScore: number
}

function pick<T>(...values: Array<T | null | undefined | ''>) {
  for (const value of values) {
    if (value)
      return value
  }
  return null
}

function uniqueSentences(sentences: string[], maxSentences: number) {
  const output: string[] = []
  for (const sentence of sentences) {
    const normalized = sanitizeText(sentence, 320)
    if (!normalized || output.includes(normalized))
      continue
    output.push(normalized)
    if (output.length >= maxSentences)
      break
  }
  return output
}

function countAsciiWords(raw: string) {
  return (raw.match(/[A-Z]+/gi) ?? []).length
}

function isDialogueFirstGovernance(governance: AlicizationMindTurnGovernanceLike) {
  if (governance.screenReferenceMode === 'avoid')
    return true

  const subject = governance.answerSubject ?? governance.mindTurnFrame?.relation?.subject ?? null
  return governance.turnMode === 'care'
    || governance.turnMode === 'accompany'
    || governance.answerAct === 'care'
    || governance.answerAct === 'defer'
    || subject === 'alicization-self'
    || subject === 'project-state'
    || subject === 'relationship'
    || subject === 'host-state'
}

function executionTurnNeedsRepairAuthorityOverride(governance: AlicizationMindTurnGovernanceLike) {
  return governance.repairState !== 'none'
    || governance.turnMode === 'screen-repair'
    || governance.turnMode === 'grounded-inspection'
    || governance.answerAct === 'ask-reground'
    || governance.answerAct === 'correct-stale-anchor'
    || governance.shouldAskForGrounding
    || governance.shouldAcknowledgeRepair
    || governance.screenReferenceMode === 'required'
}

function resolveExecutionFirstAnswerAct(input: {
  governance: AlicizationMindTurnGovernanceLike
  mentionedDispatchChannels: AlicizationExecutionDispatchChannel[]
  explicitExecutionDemand: boolean
}) {
  if (input.governance.answerAct === 'care' || input.governance.answerAct === 'defer')
    return input.governance.answerAct
  if (input.governance.answerAct === 'guide')
    return 'guide' as const

  const subject = input.governance.answerSubject ?? input.governance.mindTurnFrame?.relation?.subject ?? null
  const taskDirected = subject === 'task-knot'
    || input.governance.turnMode === 'guide-current-knot'
    || input.mentionedDispatchChannels.length > 0
    || input.explicitExecutionDemand

  return taskDirected ? 'guide' : 'answer'
}

function resolveExecutionFirstTurnMode(input: {
  governance: AlicizationMindTurnGovernanceLike
  answerAct: AlicizationGovernedMindAnswerAct
}) {
  if (input.governance.turnMode === 'care' || input.governance.turnMode === 'accompany')
    return input.governance.turnMode
  if (input.answerAct === 'guide')
    return 'guide-current-knot' as const
  return 'answer' as const
}

export function normalizeExecutionFirstGovernance<T extends AlicizationMindTurnGovernanceLike>(input: {
  governance?: T | null
  userText?: string
}): AlicizationExecutionFirstGovernanceNormalization<T> {
  const governance = input.governance ?? null
  const executionTurnAuthority = analyzeAlicizationExecutionTurnAuthority(input.userText ?? '')
  if (!governance) {
    return {
      applied: false,
      executionBound: executionTurnAuthority.executionBound,
      explicitExecutionDemand: executionTurnAuthority.explicitExecutionDemand,
      governance: null,
      mentionedDispatchChannels: executionTurnAuthority.semanticSignals.mentionedDispatchChannels,
      reasonCodes: executionTurnAuthority.reasonCodes,
      signalScore: executionTurnAuthority.semanticSignals.executionSignalScore,
    }
  }

  if (!executionTurnAuthority.executionBound || !executionTurnNeedsRepairAuthorityOverride(governance)) {
    return {
      applied: false,
      executionBound: executionTurnAuthority.executionBound,
      explicitExecutionDemand: executionTurnAuthority.explicitExecutionDemand,
      governance,
      mentionedDispatchChannels: executionTurnAuthority.semanticSignals.mentionedDispatchChannels,
      reasonCodes: executionTurnAuthority.reasonCodes,
      signalScore: executionTurnAuthority.semanticSignals.executionSignalScore,
    }
  }

  const answerAct = resolveExecutionFirstAnswerAct({
    governance,
    mentionedDispatchChannels: executionTurnAuthority.semanticSignals.mentionedDispatchChannels,
    explicitExecutionDemand: executionTurnAuthority.explicitExecutionDemand,
  })
  const turnMode = resolveExecutionFirstTurnMode({
    governance,
    answerAct,
  })
  const relationSubject = governance.mindTurnFrame?.relation?.subject ?? null
  const normalizedGovernance = {
    ...governance,
    turnMode,
    answerAct,
    answerSubject: governance.answerSubject === 'visible-scene'
      ? 'task-knot'
      : governance.answerSubject,
    screenReferenceMode: governance.screenReferenceMode === 'avoid'
      ? 'avoid'
      : 'incidental',
    repairState: 'none',
    shouldAskForGrounding: false,
    shouldAcknowledgeRepair: false,
    mindTurnFrame: governance.mindTurnFrame
      ? {
          ...governance.mindTurnFrame,
          relation: governance.mindTurnFrame.relation
            ? {
                ...governance.mindTurnFrame.relation,
                subject: relationSubject === 'visible-scene' ? 'task-knot' : relationSubject,
              }
            : governance.mindTurnFrame.relation,
          obligation: governance.mindTurnFrame.obligation
            ? {
                ...governance.mindTurnFrame.obligation,
                answerAct,
              }
            : governance.mindTurnFrame.obligation,
        }
      : governance.mindTurnFrame,
  } satisfies T

  return {
    applied: true,
    executionBound: true,
    explicitExecutionDemand: executionTurnAuthority.explicitExecutionDemand,
    governance: normalizedGovernance,
    mentionedDispatchChannels: executionTurnAuthority.semanticSignals.mentionedDispatchChannels,
    reasonCodes: [
      ...executionTurnAuthority.reasonCodes,
      'execution-first-governance-override',
    ],
    signalScore: executionTurnAuthority.semanticSignals.executionSignalScore,
  }
}

export function replyViolatesExecutionFirstSurface(input: {
  reply: string
  governance?: AlicizationMindTurnGovernanceLike | null
  userText?: string
}) {
  const executionFirstGovernance = normalizeExecutionFirstGovernance({
    governance: input.governance,
    userText: input.userText,
  })
  if (!executionFirstGovernance.executionBound)
    return false

  const reply = sanitizeText(input.reply, 420)
  if (!reply)
    return false

  return repairCorrectionPattern.test(reply)
    || repairRegroundPattern.test(reply)
    || repairBoundaryPattern.test(reply)
}

function cueLooksInternal(raw: string, governance: AlicizationMindTurnGovernanceLike, userText?: string) {
  if (internalGovernedSurfacePattern.test(raw) || governedNarrationPattern.test(raw) || windowTracePattern.test(raw))
    return true

  if (isDialogueFirstGovernance(governance)) {
    if (!cjkPattern.test(raw) && cjkPattern.test(userText ?? '') && countAsciiWords(raw) >= 5 && englishMetaWordPattern.test(raw))
      return true
    if (/^(?:code|finder|browser|desktop)$/iu.test(raw))
      return true
  }

  return false
}

function sanitizeGovernedSurfaceCue(
  raw: unknown,
  governance: AlicizationMindTurnGovernanceLike,
  userText?: string,
  maxChars = 180,
) {
  const normalized = sanitizeText(raw, maxChars)
  if (!normalized)
    return ''
  if (/^(?:unknown|general unknown|none|null|n\/a)$/iu.test(normalized))
    return ''
  if (isWeakAlicizationScreenSurfaceCue(normalized))
    return ''
  if (cueLooksInternal(normalized, governance, userText))
    return ''
  return normalized
}

const visibleRepairInspectionReasonCodes = new Set([
  'observe-cue',
  'describe-cue',
  'visual-plane-cue',
  'recheck-cue',
  'scene-shift-cue',
  'anchored-continuation-cue',
  'explicit-visual-ask',
])

function normalizeComparisonText(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
}

function extractComparisonTerms(raw: unknown) {
  const normalized = normalizeComparisonText(raw)
  if (!normalized)
    return []

  return [...new Set(
    (normalized.match(/[\p{Letter}\p{Number}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu) ?? [])
      .filter(segment => [...segment].length >= 2),
  )]
}

function mirrorsUserText(candidate: unknown, userText: unknown) {
  const normalizedCandidate = normalizeComparisonText(candidate)
  const normalizedUserText = normalizeComparisonText(userText)
  if (!normalizedCandidate || !normalizedUserText)
    return false

  if (normalizedCandidate === normalizedUserText)
    return true

  const shorterLength = Math.max(1, Math.min(normalizedCandidate.length, normalizedUserText.length))
  if (
    (normalizedCandidate.includes(normalizedUserText) || normalizedUserText.includes(normalizedCandidate))
    && shorterLength / Math.max(normalizedCandidate.length, normalizedUserText.length) >= 0.68
  ) {
    return true
  }

  const userTerms = extractComparisonTerms(normalizedUserText)
  const candidateTerms = extractComparisonTerms(normalizedCandidate)
  if (userTerms.length === 0 || candidateTerms.length === 0)
    return false

  const overlap = candidateTerms.filter(term => userTerms.includes(term))
  return overlap.length / Math.max(1, Math.min(userTerms.length, candidateTerms.length)) >= 0.72
}

function mirrorsCue(left: unknown, right: unknown) {
  return mirrorsUserText(left, right) || mirrorsUserText(right, left)
}

function pickNonMirroringCue(governance: AlicizationMindTurnGovernanceLike, userText: unknown, ...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeGovernedSurfaceCue(value, governance, typeof userText === 'string' ? userText : undefined)
    if (!normalized || mirrorsUserText(normalized, userText))
      continue
    return normalized
  }
  return ''
}

function resolveFrameCue(governance: AlicizationMindTurnGovernanceLike, userText?: string) {
  const dialogueFirst = isDialogueFirstGovernance(governance)

  return pickNonMirroringCue(
    governance,
    userText,
    governance.mindTurnFrame?.focusAnchor,
    dialogueFirst
      ? null
      : governance.mindTurnFrame?.world?.visibleSurface,
    dialogueFirst
      ? null
      : governance.mindTurnFrame?.memory?.carriedThread,
    dialogueFirst
      ? null
      : governance.mindTurnFrame?.obligation?.answerIntent,
  )
}

function truthStateIsUnstable(governance: AlicizationMindTurnGovernanceLike) {
  const truthState = governance.mindTurnFrame?.world?.truthState ?? governance.truthState
  return truthState === 'remembered' || truthState === 'uncertain'
}

function groundedSceneShouldSuppressRepair(governance: AlicizationMindTurnGovernanceLike) {
  return governance.groundedThisTurn === true
    && governance.screenReferenceMode !== 'avoid'
    && resolveGovernedMindTruth(governance) === 'grounded'
    && (
      governance.answerSubject === 'visible-scene'
      || governance.answerSubject === 'task-knot'
      || governance.turnMode === 'grounded-inspection'
      || governance.turnMode === 'guide-current-knot'
    )
}

function hasStrongVisualInspectionSignal(reasonCodes: string[]) {
  return reasonCodes.includes('visual-plane-cue')
    || reasonCodes.includes('explicit-visual-ask')
}

function resolveVisibleRepairSurfaceDecision(input: {
  governance: AlicizationMindTurnGovernanceLike
  userText?: string
  executionBound?: boolean
}) {
  const governance = input.governance
  const subject = governance.answerSubject ?? governance.mindTurnFrame?.relation?.subject ?? null
  const sceneCentricTurn = isSceneCentricGovernanceTurn(governance)
  const inspectionIntent = inferAlicizationInspectionIntent({
    message: input.userText ?? '',
    contextPhrases: [
      governance.mindTurnFrame?.focusAnchor,
      governance.mindTurnFrame?.world?.visibleSurface,
      governance.mindTurnFrame?.obligation?.answerIntent,
      governance.mindTurnFrame?.obligation?.openingClaim,
      governance.focusAnchor,
      governance.liveSurface,
      governance.answerIntent,
      governance.openingMove,
    ]
      .map(value => sanitizeGovernedSurfaceCue(value, governance, input.userText, 180))
      .filter(Boolean),
  })
  const inspectionSignalProfile = inspectionIntent.signalProfile
    ?? deriveAlicizationInspectionSignalProfile({
      reasonCodes: inspectionIntent.reasonCodes,
      contextOverlap: inspectionIntent.contextOverlap,
      confidence: inspectionIntent.confidence,
    })
  const inspectionSignal = inspectionIntent.reasonCodes.some(code => visibleRepairInspectionReasonCodes.has(code))
  const contextualInspection = inspectionSignalProfile.decisive
    || (
      inspectionSignal
      && inspectionSignalProfile.actionable
      && inspectionIntent.confidence >= 0.58
      && (
        inspectionIntent.contextOverlap >= 0.24
        || inspectionIntent.sharedAttentionLikely
        || subject === 'visible-scene'
        || governance.turnMode === 'grounded-inspection'
        || sceneCentricTurn
      )
    )
  const strongVisualInspection = inspectionSignalProfile.explicitSceneDirective
    || hasStrongVisualInspectionSignal(inspectionIntent.reasonCodes)
    || (
      sceneCentricTurn
      && inspectionIntent.sharedAttentionLikely
      && inspectionIntent.contextOverlap >= 0.34
    )
  const allowed = !input.executionBound
    && !isDialogueFirstGovernance(governance)
    && governance.screenReferenceMode !== 'avoid'
    && isExplicitRepairGovernanceTurn(governance)
    && contextualInspection
    && strongVisualInspection

  return {
    allowed,
    inspectionIntent,
    strongVisualInspection,
  }
}

function buildDialogueFirstFallbackBodies(input: {
  governance: AlicizationMindTurnGovernanceLike
  translate: (path: string, params?: Record<string, unknown>) => string
  forceAnswerFallback?: boolean
}) {
  const subject = input.governance.answerSubject ?? input.governance.mindTurnFrame?.relation?.subject ?? null
  const unstableTruth = truthStateIsUnstable(input.governance)
  const t = input.translate
  const sentences: string[] = []

  if (
    input.governance.turnMode === 'care'
    || input.governance.answerAct === 'care'
    || subject === 'host-state'
  ) {
    sentences.push(t('mind-fallback.care-body'))
    if (unstableTruth)
      sentences.push(t('mind-fallback.dialogue-boundary-memory'))
    return uniqueSentences(sentences, 2)
  }

  if (
    input.governance.turnMode === 'accompany'
    || input.governance.answerAct === 'defer'
    || (
      subject === 'relationship'
      && input.governance.turnMode !== 'answer'
      && input.governance.answerAct !== 'answer'
    )
  ) {
    sentences.push(t('mind-fallback.accompany-body'))
    if (unstableTruth)
      sentences.push(t('mind-fallback.dialogue-boundary-memory'))
    return uniqueSentences(sentences, 2)
  }

  if (input.forceAnswerFallback) {
    if (subject === 'relationship') {
      sentences.push(t('mind-fallback.accompany-body'))
    }
    else if (input.governance.repairState !== 'none') {
      sentences.push(
        t('mind-fallback.answer-repair-body'),
      )
    }
    else {
      sentences.push(
        t('mind-fallback.answer-repair-body'),
      )
    }
    if (sentences.length > 0 && unstableTruth)
      sentences.push(t('mind-fallback.dialogue-boundary-memory'))
    return uniqueSentences(sentences, 2)
  }

  // NOTICE: Dialogue-first answer turns must keep model-authored visible speech
  // whenever possible. Local fallback prose here made ordinary turns like
  // “你好” / “你能做啥” collapse into the same governance template after
  // structured repair, which broke the feeling of live dialogue. Keep answer-
  // mode fallback authoring disabled unless the turn is explicitly care or
  // accompany; repair-owned turns are still handled above.
  return []
}

function shouldSuppressDialogueFirstPlainOpener(governance: AlicizationMindTurnGovernanceLike) {
  if (!isDialogueFirstGovernance(governance))
    return false

  if (governance.repairState !== 'none')
    return false

  return governance.turnMode === 'answer'
    || governance.turnMode === 'care'
    || governance.turnMode === 'accompany'
}

export function replyLeaksGovernedMindSurface(
  reply: string,
  governance?: AlicizationMindTurnGovernanceLike | null,
  userText?: string,
) {
  const normalizedReply = sanitizeText(reply, 600)
  if (!normalizedReply || !governance)
    return false

  const visibleRepairSurface = resolveVisibleRepairSurfaceDecision({
    governance,
    userText,
  })
  if (cueLooksInternal(normalizedReply, governance))
    return true
  if (groundedSceneShouldSuppressRepair(governance) && /^(?:我先纠正一下|刚才那一下我借错了参照|刚才我把前一条线错带进这句里了|这一轮我还没重新看稳当前画面|我只说我现在能确实看见的|let me correct that first|i borrowed the wrong reference just now|i pulled the wrong thread into this reply just now|i do not have a fresh enough view|i'll stay with what i can honestly see)/iu.test(normalizedReply))
    return true
  if (!visibleRepairSurface.allowed && (
    repairCorrectionPattern.test(normalizedReply)
    || repairRegroundPattern.test(normalizedReply)
    || repairBoundaryPattern.test(normalizedReply)
  )) {
    return true
  }

  const leakedCandidates = [
    governance.mindTurnFrame?.obligation?.answerIntent,
    governance.mindTurnFrame?.obligation?.openingMove,
    governance.mindTurnFrame?.memory?.carriedThread,
    governance.answerIntent,
    governance.openingMove,
    governance.carriedThread,
    governance.dialogueActKernel?.whyNow,
    governance.dialogueActKernel?.openingClaim,
    governance.dialogueActKernel?.mustSay?.[0],
    governance.mustDo[0],
    governance.mustNotDo[0],
  ]
    .map(value => sanitizeText(value, 220))
    .filter(Boolean)
    .filter(value => cueLooksInternal(value, governance))

  return leakedCandidates.some(candidate => normalizedReply.includes(candidate))
}

export function resolveGovernedMindEmotion(governance: AlicizationMindTurnGovernanceLike): AlicizationGovernedMindEmotion {
  if (governance.repairState !== 'none')
    return governance.repairState === 'stale-anchor' ? 'apologetic' : 'thinking'
  if (governance.answerAct === 'care' || governance.turnMode === 'care')
    return 'concerned'
  if (governance.answerAct === 'guide' || governance.turnMode === 'guide-current-knot')
    return 'thinking'
  if (governance.turnMode === 'grounded-inspection')
    return 'thinking'
  return (governance.mindTurnFrame?.relation?.relationshipPosture ?? governance.relationshipPosture) === 'tender'
    ? 'concerned'
    : 'neutral'
}

export function resolveGovernedMindObligation(governance: AlicizationMindTurnGovernanceLike) {
  switch (governance.answerAct ?? governance.mindTurnFrame?.obligation?.answerAct) {
    case 'guide':
      return 'guide'
    case 'care':
      return 'care'
    case 'correct-stale-anchor':
    case 'ask-reground':
      return 'repair'
    case 'defer':
      return 'accompany'
    default:
      break
  }

  switch (governance.turnMode) {
    case 'guide-current-knot':
      return 'guide'
    case 'care':
      return 'care'
    case 'accompany':
      return 'accompany'
    case 'screen-repair':
      return 'repair'
    default:
      return 'answer'
  }
}

export function resolveGovernedMindTruth(governance: AlicizationMindTurnGovernanceLike) {
  if (governance.groundedThisTurn === true)
    return 'grounded'

  switch (governance.mindTurnFrame?.world?.truthState ?? governance.truthState) {
    case 'live-grounded':
      return 'grounded'
    case 'live-observed':
      return 'coarse'
    case 'remembered':
      return 'memory'
    default:
      return 'uncertain'
  }
}

export function resolveGovernedMindTone(governance: AlicizationMindTurnGovernanceLike) {
  switch (governance.mindTurnFrame?.relation?.relationshipPosture ?? governance.relationshipPosture) {
    case 'restrained':
      return 'restrained'
    case 'tender':
      return 'tender'
    default:
      return governance.turnMode === 'guide-current-knot' || governance.repairState !== 'none'
        ? 'direct'
        : 'warm'
  }
}

function resolveAnchor(governance: AlicizationMindTurnGovernanceLike, userText?: string) {
  const uncertainScreenRepairWindow = !isDialogueFirstGovernance(governance)
    && governance.screenReferenceMode !== 'avoid'
    && governance.groundedThisTurn !== true
    && resolveGovernedMindTruth(governance) !== 'grounded'

  const rawSceneCue = isDialogueFirstGovernance(governance)
    ? ''
    : buildAlicizationScreenSurfaceCue({
        rawCues: [
          governance.mindTurnFrame?.focusAnchor,
          governance.mindTurnFrame?.world?.visibleSurface,
          governance.mindTurnFrame?.obligation?.answerIntent,
          governance.mindTurnFrame?.obligation?.openingClaim,
          governance.focusAnchor,
          governance.liveSurface,
          governance.answerIntent,
          governance.dialogueActKernel?.openingClaim,
          governance.dialogueActKernel?.selectedEvidence?.[0]?.summary,
        ],
      })
  const sceneCue = sanitizeGovernedSurfaceCue(rawSceneCue, governance, userText, 180)
  if (sceneCue && !isWeakAlicizationScreenSurfaceCue(sceneCue) && !mirrorsUserText(sceneCue, userText))
    return sceneCue

  return resolveFrameCue(governance, userText)
    || pickNonMirroringCue(
      governance,
      userText,
      governance.mindTurnFrame?.focusAnchor,
      isDialogueFirstGovernance(governance) ? null : governance.mindTurnFrame?.world?.visibleSurface,
      isDialogueFirstGovernance(governance) ? null : governance.mindTurnFrame?.obligation?.answerIntent,
      isDialogueFirstGovernance(governance) || uncertainScreenRepairWindow ? null : governance.mindTurnFrame?.memory?.carriedThread,
      governance.focusAnchor,
      governance.screenReferenceMode === 'avoid' ? null : governance.liveSurface,
      governance.answerIntent,
      governance.screenReferenceMode === 'avoid' || uncertainScreenRepairWindow ? null : governance.carriedThread,
    )
}

export function shouldDeferGovernedMindLocalRepair(governance?: AlicizationMindTurnGovernanceLike | null) {
  if (!governance)
    return false
  return isDialogueFirstGovernance(governance) && governance.repairState === 'none'
}

export function shouldPreserveDialogueFirstVisibleReply(governance?: AlicizationMindTurnGovernanceLike | null) {
  if (!shouldDeferGovernedMindLocalRepair(governance))
    return false
  if (!governance)
    return false

  const subject = governance.answerSubject ?? governance.mindTurnFrame?.relation?.subject ?? null
  if (
    governance.turnMode === 'care'
    || governance.answerAct === 'care'
    || governance.turnMode === 'accompany'
    || governance.answerAct === 'defer'
    || subject === 'host-state'
  ) {
    return false
  }

  return true
}

function isExplicitRepairGovernanceTurn(governance: AlicizationMindTurnGovernanceLike) {
  return governance.repairState !== 'none'
    || governance.turnMode === 'screen-repair'
    || governance.answerAct === 'ask-reground'
    || governance.answerAct === 'correct-stale-anchor'
}

export function shouldForceGovernedMindSurface(
  governance?: AlicizationMindTurnGovernanceLike | null,
  userText?: string,
) {
  if (!governance)
    return false

  if (governance.groundedThisTurn === true)
    return false

  if (!isExplicitRepairGovernanceTurn(governance))
    return false

  if (!resolveVisibleRepairSurfaceDecision({
    governance,
    userText,
  }).allowed) {
    return false
  }

  if (governance.repairState === 'stale-anchor')
    return true
  if (governance.answerAct === 'correct-stale-anchor')
    return true
  if (governance.answerAct === 'ask-reground') {
    return governance.shouldAskForGrounding
      || governance.shouldAcknowledgeRepair
      || governance.repairState !== 'none'
  }
  if (governance.repairState === 'need-reground')
    return governance.shouldAskForGrounding || governance.shouldAcknowledgeRepair

  return governance.shouldAcknowledgeRepair
}

export function replyLooksThinGovernedShell(
  reply: string,
  governedReply: string,
  governance?: AlicizationMindTurnGovernanceLike | null,
  thinShellCue?: string | null,
) {
  if (!governance || !isDialogueFirstGovernance(governance))
    return false

  const normalizedReply = sanitizeText(reply, 220)
  const normalizedGovernedReply = sanitizeText(governedReply, 280)
  const normalizedThinShellCue = sanitizeText(thinShellCue, 160)
  if (!normalizedReply)
    return false

  const cjkChars = countCjkChars(normalizedReply)
  const asciiWords = countAsciiWords(normalizedReply)
  const sentenceCount = normalizedReply.split(/[.!?。！？]+/u).filter(Boolean).length
  if (sentenceCount > 1 || (cjkChars > 14 && asciiWords > 7))
    return false

  if (/^(?:我(?:直接说|直接答你|就正面回你)|(?:let me|then i'll|i'll)\s+answer(?:\s+you)?\s+directly)[。！？.!?]*$/iu.test(normalizedReply))
    return true

  if (normalizedThinShellCue && normalizedReply === normalizedThinShellCue)
    return true

  if (!normalizedGovernedReply || normalizedReply === normalizedGovernedReply)
    return false

  return normalizedGovernedReply.startsWith(normalizedReply)
}

export function replyLooksOrganicDirectAnswer(input: {
  reply: string
  governance?: AlicizationMindTurnGovernanceLike | null
  userText?: string
  thinShellCue?: string | null
}) {
  const governance = input.governance
  if (!governance)
    return false

  const reply = sanitizeText(input.reply, 420)
  if (!reply)
    return false
  if (cueLooksInternal(reply, governance, input.userText))
    return false
  if (mirrorsUserText(reply, input.userText))
    return false

  const normalizedThinShellCue = sanitizeText(input.thinShellCue, 160)
  if (normalizedThinShellCue && reply === normalizedThinShellCue)
    return false

  if (isExplicitRepairGovernanceTurn(governance)) {
    const visibleRepairSurface = resolveVisibleRepairSurfaceDecision({
      governance,
      userText: input.userText,
    })
    if (!visibleRepairSurface.allowed) {
      if (
        repairCorrectionPattern.test(reply)
        || repairRegroundPattern.test(reply)
        || repairBoundaryPattern.test(reply)
      ) {
        return false
      }
    }
    else {
      if (decorativeRepairDriftPattern.test(reply))
        return false

      if (!repairCorrectionPattern.test(reply) || !repairRegroundPattern.test(reply))
        return false
    }
  }

  const sentenceCount = reply.split(/[.!?。！？]+/u).filter(Boolean).length
  const cjkChars = countCjkChars(reply)
  const asciiWords = countAsciiWords(reply)
  if (sentenceCount >= 1 && (cjkChars >= 8 || asciiWords >= 5))
    return true

  return tentativeSceneReadPattern.test(reply) && (cjkChars >= 6 || asciiWords >= 4)
}

function isSceneCentricGovernanceTurn(governance: AlicizationMindTurnGovernanceLike) {
  if (governance.screenReferenceMode === 'avoid')
    return false

  const subject = governance.answerSubject ?? governance.mindTurnFrame?.relation?.subject ?? null
  return subject === 'task-knot'
    || subject === 'visible-scene'
    || governance.turnMode === 'guide-current-knot'
    || governance.turnMode === 'grounded-inspection'
    || governance.turnMode === 'screen-repair'
}

function cueAppearsInReply(reply: string, cue: string) {
  const normalizedReply = normalizeComparisonText(reply)
  const normalizedCue = normalizeComparisonText(cue)
  if (!normalizedReply || !normalizedCue)
    return false

  if (normalizedReply.includes(normalizedCue))
    return true

  const replyTerms = extractComparisonTerms(normalizedReply)
  const cueTerms = extractComparisonTerms(normalizedCue)
  if (replyTerms.length === 0 || cueTerms.length === 0)
    return false

  const overlap = cueTerms.filter(term => replyTerms.includes(term))
  if (overlap.length === 0)
    return false
  if (overlap.length >= Math.min(2, cueTerms.length))
    return true

  return overlap.length / cueTerms.length >= 0.58
}

export function replyLooksCoherentSceneAnswer(input: {
  reply: string
  governance?: AlicizationMindTurnGovernanceLike | null
  userText?: string
}) {
  const governance = input.governance
  if (!governance || !isSceneCentricGovernanceTurn(governance))
    return false

  const reply = sanitizeText(input.reply, 420)
  if (!reply)
    return false
  if (cueLooksInternal(reply, governance, input.userText))
    return false
  if (mirrorsUserText(reply, input.userText))
    return false

  const cjkChars = countCjkChars(reply)
  const asciiWords = countAsciiWords(reply)
  const sentenceCount = reply.split(/[.!?。！？]+/u).filter(Boolean).length
  const tentativeSceneRead = tentativeSceneReadPattern.test(reply)
  if (sentenceCount < 2 && cjkChars < 12 && asciiWords < 8 && !tentativeSceneRead)
    return false

  const cues = [
    resolveAnchor(governance, input.userText),
    governance.mindTurnFrame?.focusAnchor,
    governance.mindTurnFrame?.world?.visibleSurface,
    governance.mindTurnFrame?.obligation?.openingClaim,
    governance.mindTurnFrame?.obligation?.answerIntent,
    governance.focusAnchor,
    governance.liveSurface,
    governance.answerIntent,
    governance.dialogueActKernel?.openingClaim,
    governance.dialogueActKernel?.selectedEvidence?.[0]?.summary,
    governance.dialogueActKernel?.mustSay?.[0],
  ]
    .map(value => sanitizeGovernedSurfaceCue(value, governance, input.userText, 180))
    .filter(value => Boolean(value))
    .filter(value => !mirrorsUserText(value, input.userText))
    .filter((value, index, items) => items.findIndex(item => item === value) === index)
  if (cues.length === 0)
    return false

  return cues.some(cue => cueAppearsInReply(reply, cue))
}

export function buildGovernedMindThought(input: {
  governance: AlicizationMindTurnGovernanceLike
  userText?: string
}) {
  const anchor = resolveAnchor(input.governance, input.userText)
  const focus = anchor
    ? anchor.toLowerCase().replace(/\s+/g, '-').slice(0, 48)
    : 'current-user-turn'
  const move = sanitizeText(
    pick(
      input.governance.mindTurnFrame?.obligation?.openingMove,
      input.governance.mindTurnFrame?.obligation?.answerIntent,
      input.governance.mindTurnFrame?.focusAnchor,
      input.governance.mindTurnFrame?.world?.visibleSurface,
      input.governance.openingMove,
      input.governance.answerIntent,
      input.governance.focusAnchor,
      input.governance.liveSurface,
    ),
    64,
  ).toLowerCase().replace(/\s+/g, '-')
  || 'stabilize-and-answer'

  return [
    `obligation=${resolveGovernedMindObligation(input.governance)}`,
    `truth=${resolveGovernedMindTruth(input.governance)}`,
    `focus=${focus}`,
    `move=${move}`,
    `tone=${resolveGovernedMindTone(input.governance)}`,
  ].join('; ')
}

export interface AlicizationMindFallbackSurface {
  thought: string
  emotion: AlicizationGovernedMindEmotion
  reply: string
  thinShellCue?: string
  visibleReplyMode?: 'bubble' | 'dispatch-only'
}

export function buildMindGovernedFallbackSurface(input: {
  governance?: AlicizationMindTurnGovernanceLike | null
  userText?: string
  translate: (path: string, params?: Record<string, unknown>) => string
  forceDialogueAnswerFallback?: boolean
}): AlicizationMindFallbackSurface | null {
  const executionFirstGovernance = normalizeExecutionFirstGovernance({
    governance: input.governance,
    userText: input.userText,
  })
  const governance = executionFirstGovernance.governance
  if (!governance)
    return null

  if (executionFirstGovernance.executionBound && !isDialogueFirstGovernance(governance)) {
    return {
      thought: buildGovernedMindThought({
        governance,
        userText: input.userText,
      }),
      emotion: resolveGovernedMindEmotion(governance),
      // NOTICE: Execution-first fallback should let mind governance own the
      // dispatch decision without forcing a visible "I am now using CLI..."
      // bubble into the chat surface. The visible payoff belongs to the actual
      // execution result, while the mind still participates through thought,
      // emotion, and execution-scoped governance.
      reply: '',
      visibleReplyMode: 'dispatch-only',
    }
  }

  const anchor = resolveAnchor(governance, input.userText)
  const dialogueFirst = isDialogueFirstGovernance(governance)
  if (!anchor && governance.repairState === 'none' && !dialogueFirst && !sanitizeText(governance.answerIntent))
    return null

  const t = input.translate
  const sentences: string[] = []
  const carriedThread = sanitizeGovernedSurfaceCue(governance.carriedThread, governance, input.userText, 140)
  const focus = anchor || t('mind-fallback.focus-default')
  const preferAnchoredDialogueOpening = dialogueFirst
    && input.forceDialogueAnswerFallback === true
    && Boolean(anchor)
  const weakAnchor = Boolean(anchor && isWeakAlicizationScreenSurfaceCue(anchor))
  const usePlainOpening = !anchor || weakAnchor || (dialogueFirst && !preferAnchoredDialogueOpening)
  const suppressDialogueFirstPlainOpener = usePlainOpening && shouldSuppressDialogueFirstPlainOpener(governance)
  const truthMode = resolveGovernedMindTruth(governance)
  const repairSuppressedByGrounding = groundedSceneShouldSuppressRepair(governance)
  const visibleRepairSurface = resolveVisibleRepairSurfaceDecision({
    governance,
    userText: input.userText,
    executionBound: executionFirstGovernance.executionBound,
  })
  const effectiveRepairState = repairSuppressedByGrounding ? 'none' : governance.repairState
  const visibleRepairState = visibleRepairSurface.allowed && visibleRepairSurface.strongVisualInspection
    ? effectiveRepairState
    : 'none'
  const suppressDialogueFirstOpening = suppressDialogueFirstPlainOpener
  const contextualNeedRegroundOpening = Boolean(
    !dialogueFirst
    && visibleRepairState === 'need-reground'
    && anchor
    && !isWeakAlicizationScreenSurfaceCue(anchor),
  )
  const repairNarrationAllowed = visibleRepairState !== 'none'
  const prefersLiveObservationOpening = !dialogueFirst
    && visibleRepairState === 'none'
    && governance.screenReferenceMode !== 'avoid'
    && (
      governance.groundedThisTurn === true
      || truthMode === 'grounded'
    )
  let thinShellCue = ''

  if (visibleRepairState === 'stale-anchor') {
    sentences.push(t('mind-fallback.repair-stale-anchor'))
  }
  else if (visibleRepairState === 'need-reground') {
    sentences.push(contextualNeedRegroundOpening
      ? t('mind-fallback.answer-opening', { focus })
      : t('mind-fallback.repair-need-reground'))
  }
  else if (prefersLiveObservationOpening) {
    sentences.push(usePlainOpening
      ? t('mind-fallback.observation-opening-plain')
      : t('mind-fallback.observation-opening', { focus }))
  }
  else if (governance.turnMode === 'guide-current-knot') {
    sentences.push(usePlainOpening
      ? t('mind-fallback.guide-opening-plain')
      : t('mind-fallback.guide-opening', { focus }))
  }
  else if (governance.turnMode === 'care' && !suppressDialogueFirstOpening) {
    sentences.push(usePlainOpening
      ? t('mind-fallback.care-opening-plain')
      : t('mind-fallback.care-opening', { focus }))
  }
  else if (governance.turnMode === 'care' && suppressDialogueFirstOpening) {
    thinShellCue = t('mind-fallback.care-opening-plain')
  }
  else if (governance.turnMode === 'accompany' && !suppressDialogueFirstOpening) {
    sentences.push(usePlainOpening
      ? t('mind-fallback.accompany-opening-plain')
      : t('mind-fallback.accompany-opening', { focus }))
  }
  else if (governance.turnMode === 'accompany' && suppressDialogueFirstOpening) {
    thinShellCue = t('mind-fallback.accompany-opening-plain')
  }
  else if (governance.turnMode === 'grounded-inspection') {
    sentences.push(usePlainOpening
      ? t('mind-fallback.observation-opening-plain')
      : t('mind-fallback.observation-opening', { focus }))
  }
  else if (!suppressDialogueFirstOpening) {
    sentences.push(usePlainOpening
      ? t('mind-fallback.answer-opening-plain')
      : t('mind-fallback.answer-opening', { focus }))
  }
  else {
    thinShellCue = t('mind-fallback.answer-opening-plain')
  }

  if (dialogueFirst && visibleRepairState === 'none') {
    sentences.push(...buildDialogueFirstFallbackBodies({
      governance,
      translate: t,
      forceAnswerFallback: input.forceDialogueAnswerFallback === true,
    }))
  }

  if (
    governance.labelCarryAsMemory
    && governance.screenReferenceMode !== 'avoid'
    && !dialogueFirst
    && repairNarrationAllowed
    && governance.groundedThisTurn !== true
    && !repairSuppressedByGrounding
    && truthMode !== 'grounded'
    && carriedThread
    && !mirrorsCue(carriedThread, focus)
  ) {
    sentences.push(t('mind-fallback.carry-memory', {
      carry: carriedThread,
    }))
  }

  if (
    governance.shouldAskForGrounding
    && repairNarrationAllowed
    && governance.groundedThisTurn !== true
    && truthMode !== 'grounded'
    && !repairSuppressedByGrounding
  ) {
    sentences.push(t('mind-fallback.reground-note'))
  }

  const intent = dialogueFirst
    ? ''
    : pickNonMirroringCue(
        governance,
        input.userText,
        governance.mindTurnFrame?.obligation?.answerIntent,
        governance.mindTurnFrame?.obligation?.openingClaim,
        governance.answerIntent,
      )
  if (intent && intent !== anchor && !mirrorsCue(intent, anchor))
    sentences.push(intent)

  const maxSentences = Math.max(1, Math.min(3, governance.maxSentences || 2))
  const finalSentences = uniqueSentences(sentences, maxSentences)
  if (finalSentences.length === 0)
    return null

  return {
    thought: buildGovernedMindThought({
      governance,
      userText: input.userText,
    }),
    emotion: resolveGovernedMindEmotion(governance),
    reply: finalSentences.join(' '),
    thinShellCue: thinShellCue || undefined,
  }
}
