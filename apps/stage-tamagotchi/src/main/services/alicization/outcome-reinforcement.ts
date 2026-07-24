import type { AlicizationExecutionRuntimeMemoryClosureExecution } from '@proj-alicization/stage-shared'

import type {
  AlicizationEmotionalTransitionLedgerSnapshot,
  AlicizationEpisodicEventInput,
  AlicizationMemoryFactInput,
  AlicizationMemoryReflectionInput,
  AlicizationPersonaReinforcementEventInput,
  AlicizationRelationshipOutcomeInput,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationEmbodimentContinuityLedger } from './embodiment-continuity-ledger'
import type { AlicizationRecentProactiveOutcome } from './proactive-feedback'

import {
  sanitizeAlicizationMemoryEvidenceText,
} from '@proj-alicization/stage-shared'

import { computeEpisodicEventSalience } from './humanlike-memory'

function clampDelta(value: number, maxAbs = 0.18) {
  if (!Number.isFinite(value))
    return 0
  return Number(Math.max(-maxAbs, Math.min(maxAbs, value)).toFixed(2))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeClosureTagValue(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

function readReplyRuntimeEmbodiment(surface: AlicizationDigitalLifeRuntimeSurface | null) {
  const residentPerformance = surface?.raw?.residentPerformance ?? null
  return {
    currentBodyState: sanitizeText(surface?.perception?.currentBodyState, 64),
    continuityMode: sanitizeText(surface?.perception?.continuityMode, 64),
    dominantResidueKind: sanitizeText(surface?.memory?.affectiveResidue?.dominantResidueKind, 64),
    residentFacialCue: sanitizeText(
      residentPerformance?.performance?.facialCue,
      64,
    ),
    residentActionCue: sanitizeText(
      residentPerformance?.performance?.actionCue,
      64,
    ),
    residentMode: sanitizeText(
      residentPerformance?.performance?.residentMode
      ?? residentPerformance?.performance?.face?.residentMode
      ?? residentPerformance?.performance?.action?.residentMode,
      64,
    ),
  }
}

function inferExecutionProcedureContextTags(input: {
  goal: string
  summary?: string | null
  outcome?: string | null
}) {
  const text = `${input.goal} ${input.summary ?? ''} ${input.outcome ?? ''}`.toLowerCase()
  const tags: string[] = ['procedure-learning']
  if (/runtime|debug|coding|cursor|terminal|patch|verify|test|cli/iu.test(text))
    tags.push('focused-work', 'execution-context')
  if (/late|night|rest|tired|fatigue|sleep|熬夜|疲惫/u.test(text))
    tags.push('late-night')
  if (/browser|screen|desktop|window|tab|click/iu.test(text))
    tags.push('visual-execution')
  return [...new Set(tags)]
}

export interface AlicizationOutcomeClosureResult {
  relationshipOutcomes: AlicizationRelationshipOutcomeInput[]
  reinforcementEvents: AlicizationPersonaReinforcementEventInput[]
  memoryFacts: AlicizationMemoryFactInput[]
  reflections: AlicizationMemoryReflectionInput[]
  episodicEvents: AlicizationEpisodicEventInput[]
  affectiveResidue?: AlicizationDigitalLifeRuntimeSurface['memory']['affectiveResidue'] | null
  emotionalTransitionLedger?: AlicizationEmotionalTransitionLedgerSnapshot | null
  embodimentContinuityLedger?: AlicizationEmbodimentContinuityLedger | null
}

export type AlicizationDialogueReplyFeedbackKind = 'received' | 'robotic' | 'missed' | 'intrusive' | 'interrupted'
export type AlicizationExecutionProposalFeedbackKind = 'affirmed' | 'denied' | 'interrupted'
export type AlicizationExecutionResultFeedbackKind = 'valued' | 'doubted' | 'intrusive' | 'interrupted'

export interface AlicizationExecutionProposalFeedbackThread {
  affirmationReasonCodes?: string[] | null
  goal: string
  projectBriefing?: AlicizationExecutionResultFeedbackThread['projectBriefing']
  proposedChannel?: string | null
  selectedChannel?: string | null
  summary?: string | null
  threadId: string
  userText?: string | null
}

export interface AlicizationExecutionResultFeedbackThread {
  goal: string
  memoryClosureExecution?: AlicizationExecutionRuntimeMemoryClosureExecution | null
  outcome?: string | null
  previousAssistantText?: string | null
  projectBriefing?: {
    currentPhase?: string | null
    identity?: string | null
    latestLandedProgress?: string | null
    proactiveSameHerGap?: string | null
    nextClosureTarget?: string | null
    preDialogueAwarenessLine?: string | null
    preflightSummary?: string | null
    primaryOpenLoop?: string | null
    sameHerDriftRisk?: string | null
    sameHerSelfLine?: string | null
  } | null
  proposedChannel?: string | null
  resumeConfirmationSummary?: string | null
  selectedChannel?: string | null
  safetyGateSummary?: string | null
  summary?: string | null
  threadId: string
  userText?: string | null
}

function baseResult(): AlicizationOutcomeClosureResult {
  return {
    relationshipOutcomes: [],
    reinforcementEvents: [],
    memoryFacts: [],
    reflections: [],
    episodicEvents: [],
    affectiveResidue: null,
    embodimentContinuityLedger: null,
  }
}

function buildRelationshipShift(outcome: AlicizationRelationshipOutcomeInput) {
  return {
    closenessDelta: clampDelta(outcome.closenessDelta, 0.24),
    trustDelta: clampDelta(outcome.trustDelta, 0.24),
    burdenDelta: clampDelta(outcome.burdenDelta, 0.24),
    boundaryDelta: clampDelta(outcome.boundaryDelta, 0.24),
    misreadDelta: clampDelta(outcome.misreadDelta, 0.24),
    repairDelta: clampDelta(outcome.repairDelta, 0.24),
    openLoopDelta: clampDelta(outcome.openLoopDelta, 0.24),
  }
}

function appendOutcomeEpisode(input: {
  result: AlicizationOutcomeClosureResult
  cardId: string
  now: number
  sourceKind: AlicizationEpisodicEventInput['sourceKind']
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  whereSummary?: string | null
  withWhom?: string[] | null
  threadAnchor?: string | null
  whatHappened: string
  felt?: string | null
  emotionTags?: string[]
  relationshipMeaning?: string | null
  lesson?: string | null
  sourceSummary?: string | null
  confidence?: number
  salience?: number
  sceneAttachment?: number
  consolidationPriority?: number
  relationshipOutcome: AlicizationRelationshipOutcomeInput
  derivedFrom?: AlicizationEpisodicEventInput['derivedFrom']
  tags?: string[]
  provenance?: AlicizationEpisodicEventInput['provenance']
}) {
  const shift = buildRelationshipShift(input.relationshipOutcome)
  input.result.episodicEvents.push({
    cardId: input.cardId,
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    sourceKind: input.sourceKind,
    provenance: input.provenance ?? 'observed',
    occurredAt: input.now,
    whereSummary: sanitizeText(input.whereSummary, 180) || null,
    withWhom: (input.withWhom ?? []).map(item => sanitizeText(item, 64)).filter(Boolean),
    threadAnchor: sanitizeText(input.threadAnchor, 160) || null,
    whatHappened: sanitizeText(input.whatHappened, 640) || input.relationshipOutcome.actionSummary,
    felt: input.felt ? sanitizeAlicizationMemoryEvidenceText(input.felt, 180) || null : null,
    emotionTags: (input.emotionTags ?? []).map(item => sanitizeText(item, 48)).filter(Boolean),
    whatChanged: null,
    relationshipMeaning: input.relationshipMeaning
      ? sanitizeAlicizationMemoryEvidenceText(input.relationshipMeaning, 200) || null
      : null,
    lesson: input.lesson ? sanitizeAlicizationMemoryEvidenceText(input.lesson, 200) || null : null,
    sourceSummary: sanitizeText(input.sourceSummary, 180) || null,
    confidence: Number.isFinite(input.confidence) ? Number(input.confidence) : 0.76,
    salience: computeEpisodicEventSalience({
      relationshipShift: shift,
      confidence: input.confidence ?? 0.76,
      sourceKind: input.sourceKind,
      emotionalWeight: input.emotionTags?.length ?? 0,
      existing: input.salience ?? 0.56,
    }),
    sceneAttachment: Number.isFinite(input.sceneAttachment) ? Number(input.sceneAttachment) : 0.22,
    consolidationPriority: Number.isFinite(input.consolidationPriority) ? Number(input.consolidationPriority) : 0.28,
    relationshipShift: shift,
    derivedFrom: input.derivedFrom ?? [],
    tags: (input.tags ?? []).map(item => sanitizeText(item, 48)).filter(Boolean),
  })
}

export function buildReplyOutcomeClosure(input: {
  now: number
  cardId: string
  turnId?: string | null
  sessionId?: string | null
  decisionTraceId?: string | null
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  userText?: string | null
  assistantText?: string | null
}): AlicizationOutcomeClosureResult {
  const result = baseResult()
  const surface = input.runtimeSurface
  if (!surface)
    return result

  result.affectiveResidue = surface.memory?.affectiveResidue ?? null
  result.emotionalTransitionLedger = surface.memory?.derivedMindStateBundle?.emotionalTransitionLedger ?? null

  const hostAvailability = surface.world?.worldModel?.hostState.availability ?? 'open'
  const selectedAction = sanitizeText(surface.agency?.initiative?.selectedAction, 48)
  const preferredStyle = sanitizeText(surface.agency?.initiative?.preferredStyle, 48)
  const answerIntent = sanitizeText(surface.dialogue?.answerPlanner?.answerIntent, 80)
  const actionMode = sanitizeText(surface.agency?.actionEcology?.mode, 64)
  const repairFirst = selectedAction === 'recheck'
    || actionMode === 'repair-before-speaking'
    || answerIntent.includes('repair')
    || answerIntent.includes('clarify')
  const observeFirst = selectedAction === 'hover'
    || selectedAction === 'wait'
    || preferredStyle === 'silent-observe'
  const hostBusy = hostAvailability === 'focused' || hostAvailability === 'immersed'
  const threadUnresolved = surface.world?.worldModel?.activeThread?.unresolved === true
  const runtimeEmbodiment = readReplyRuntimeEmbodiment(surface)
  const actionSummary = sanitizeText([
    selectedAction ? `action=${selectedAction}` : 'action=reply',
    preferredStyle ? `style=${preferredStyle}` : '',
    answerIntent ? `intent=${answerIntent}` : '',
  ].filter(Boolean).join('; '), 220)
  const episodeRelationshipOutcome: AlicizationRelationshipOutcomeInput = {
    cardId: input.cardId,
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    sourceKind: 'reply',
    actionSummary,
    closenessDelta: 0,
    trustDelta: 0,
    burdenDelta: 0,
    boundaryDelta: 0,
    misreadDelta: 0,
    repairDelta: 0,
    openLoopDelta: 0,
    summary: sanitizeText([
      'reply_outcome=unrated',
      `host_availability=${hostAvailability}`,
      `repair_first=${repairFirst}`,
      `observe_first=${observeFirst}`,
      threadUnresolved ? 'thread=open' : 'thread=closed',
    ].join('; '), 180),
    createdAt: input.now,
  }

  const dialogueEvidence = [
    input.userText ? `user=${sanitizeText(input.userText, 220)}` : '',
    input.assistantText ? `assistant=${sanitizeText(input.assistantText, 280)}` : '',
  ].filter(Boolean)
  const runtimeEvidence = [
    `host_availability=${hostAvailability}`,
    runtimeEmbodiment.currentBodyState ? `body=${runtimeEmbodiment.currentBodyState}` : '',
    runtimeEmbodiment.continuityMode ? `continuity_mode=${runtimeEmbodiment.continuityMode}` : '',
    runtimeEmbodiment.dominantResidueKind ? `residue=${runtimeEmbodiment.dominantResidueKind}` : '',
    runtimeEmbodiment.residentFacialCue ? `resident_face=${runtimeEmbodiment.residentFacialCue}` : '',
    runtimeEmbodiment.residentActionCue ? `resident_action=${runtimeEmbodiment.residentActionCue}` : '',
    runtimeEmbodiment.residentMode ? `resident_mode=${runtimeEmbodiment.residentMode}` : '',
  ].filter(Boolean)

  appendOutcomeEpisode({
    result,
    cardId: input.cardId,
    now: input.now,
    sourceKind: 'reply',
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    whereSummary: sanitizeText([
      `host:${hostAvailability}`,
      surface.world?.worldModel?.activeThread?.title ? `thread:${surface.world.worldModel.activeThread.title}` : '',
    ].filter(Boolean).join(' | '), 180),
    withWhom: ['host'],
    threadAnchor: sanitizeText(surface.world?.worldModel?.activeThread?.title ?? answerIntent ?? '', 160),
    whatHappened: [...dialogueEvidence, ...runtimeEvidence, actionSummary].join(' | '),
    emotionTags: [
      repairFirst ? 'repair' : 'presence',
      observeFirst ? 'restraint' : 'direct',
      hostBusy ? 'respect-space' : 'open-window',
      runtimeEmbodiment.dominantResidueKind ? `residue-${runtimeEmbodiment.dominantResidueKind}` : '',
    ].filter(Boolean),
    sourceSummary: 'reply-outcome',
    confidence: repairFirst ? 0.82 : observeFirst ? 0.78 : 0.74,
    sceneAttachment: hostBusy ? 0.52 : 0.34,
    consolidationPriority: threadUnresolved ? 0.58 : 0.42,
    relationshipOutcome: episodeRelationshipOutcome,
    derivedFrom: [
      input.userText
        ? { kind: 'turn', id: input.turnId ?? input.sessionId ?? 'reply-turn', label: `host feedback dialogue: ${sanitizeText(input.userText, 220)}` }
        : null,
      input.assistantText
        ? { kind: 'turn', id: input.turnId ?? input.sessionId ?? 'reply-turn', label: `assistant feedback dialogue: ${sanitizeText(input.assistantText, 220)}` }
        : null,
      input.turnId ? { kind: 'turn', id: input.turnId, label: 'reply turn' } : null,
      input.decisionTraceId ? { kind: 'mind-turn-event', id: input.decisionTraceId, label: 'governed reply trace' } : null,
    ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
    tags: [
      'dialogue',
      selectedAction || 'reply',
      preferredStyle || 'default-style',
      hostBusy ? 'focused-window' : 'open-window',
      threadUnresolved ? 'open-loop' : 'resolved-loop',
      runtimeEmbodiment.currentBodyState ? `body-${normalizeClosureTagValue(runtimeEmbodiment.currentBodyState)}` : '',
      runtimeEmbodiment.continuityMode ? `continuity-${normalizeClosureTagValue(runtimeEmbodiment.continuityMode)}` : '',
      runtimeEmbodiment.dominantResidueKind ? `residue-${normalizeClosureTagValue(runtimeEmbodiment.dominantResidueKind)}` : '',
      runtimeEmbodiment.residentFacialCue ? `facial-${normalizeClosureTagValue(runtimeEmbodiment.residentFacialCue)}` : '',
      runtimeEmbodiment.residentActionCue ? `action-${normalizeClosureTagValue(runtimeEmbodiment.residentActionCue)}` : '',
      runtimeEmbodiment.residentMode ? `resident-mode-${normalizeClosureTagValue(runtimeEmbodiment.residentMode)}` : '',
    ],
  })

  return result
}

function proactiveScenarioLabel(outcome: AlicizationRecentProactiveOutcome) {
  switch (outcome.scenario) {
    case 'coding':
      return 'coding'
    case 'media':
      return 'co-viewing'
    case 'late-night-care':
      return 'late-night care'
    default:
      return 'general presence'
  }
}

const zhExecutionAffirmationPattern = /^(?:可以(?:做吧|开始|做)?|行(?:啊|吧)?|好[的啊呀]?(?:做吧)?|嗯嗯?|那就做吧|那你做吧|做吧|去做吧|开始吧|动手吧|改吧|那就改吧|去改吧|你做吧|来吧)$/u
const zhExecutionDenialTokens = ['不用', '先别', '别做', '别改', '不要做', '不要改', '算了', '算啦', '停一下', '先停下', '不需要', '不用你做', '别动它', '先不要动']
const enExecutionAffirmationPattern = /^(?:ok|okay|yes|yeah|yep|sure|goahead|doit|pleasedo|startit|dothat)$/iu
const enExecutionDenialTokens = ['no', 'dont', 'donot', 'don\'t', 'stop', 'notnow', 'leaveit', 'skipit', 'cancelit']
const zhExecutionResultValuedTokens = ['靠谱', '有用', '挺有用', '这样可以', '这样挺好', '以后可以这样', '值得', '就是这个', '对的', '谢谢', '有帮助']
const zhExecutionResultDoubtedTokens = ['不对', '不靠谱', '错了', '不是这个', '不行', '不准', '你搞错了', '这结果错了', '不可靠']
const zhExecutionResultIntrusiveTokens = ['打扰', '别这样突然', '别老这样', '太吵', '太烦', '别这么报', '先别这样报', '别突然报结果']
const enExecutionResultValuedTokens = ['useful', 'helpful', 'thatworks', 'thatsright', 'that\'sright', 'goodresult', 'thankyou', 'thanks']
const enExecutionResultDoubtedTokens = ['wrong', 'incorrect', 'unreliable', 'doesntlookright', 'doesn\'tlookright', 'notright', 'badresult']
const enExecutionResultIntrusiveTokens = ['intrusive', 'annoying', 'dontinterrupt', 'don\'tinterrupt', 'toonoisy', 'dontsuddenlyreport', 'don\'tsuddenlyreport']
const executionResultAssistantCueTokens = ['结果', '执行', '命令', '任务', 'callback', 'cli', 'codex', 'claudecode', 'openclaw', '有结果', '跑完', '做完']
const zhDialogueReplyReceivedTokens = ['像人多了', '自然多了', '这次自然', '这样就对', '这样舒服', '有被接住', '这次好多了', '这样说就好', '这样就好', '这句可以', '谢谢你这样说', '对，就是这个', '这次对了']
const zhDialogueReplyRoboticTokens = ['像机器', '像机器人', '太模板', '很模板', '不自然', '不像人', '说人话', '像系统', '像客服', '流程播报', '系统口气', '人机味', '太机械']
const zhDialogueReplyMissedTokens = ['不对', '不是这个', '答非所问', '没回答到', '没答到', '没懂', '你没懂', '不是这个意思', '跑题', '跑偏', '你在说啥', '你在讲什么']
const zhDialogueReplyIntrusiveTokens = ['太挤', '太黏', '太过了', '别这么贴', '别这样哄', '先别安慰', '太肉麻', '别这么叫我', '太烦了', '压力太大']
const zhDialogueReplyInterruptedTokens = ['先说别的', '换个话题', '不聊这个', '先不说这个', '算了说别的', '我还有别的事', '先说另一件事']
const enDialogueReplyReceivedTokens = ['morehuman', 'naturalthistime', 'thatlanded', 'thatfeelsright', 'thatsbetter', 'that\'sbetter', 'thatfeltgood', 'thathelped', 'yougotit', 'yougotme']
const enDialogueReplyRoboticTokens = ['robotic', 'tootemplated', 'toocorporate', 'toosystem', 'youstillsoundlikeabot', 'soundmorehuman', 'talklikeaperson']
const enDialogueReplyMissedTokens = ['notthis', 'missedthepoint', 'didntanswer', 'didn\'tanswer', 'thatsnotwhatimeant', 'that\'snotwhatimeant', 'youstilldontgetit', 'youstilldon\'tgetit']
const enDialogueReplyIntrusiveTokens = ['tooclose', 'toomuch', 'dontcomfortmelikethat', 'don\'tcomfortmelikethat', 'stopcrowdingme', 'thatsintrusive', 'that\'sintrusive']
const enDialogueReplyInterruptedTokens = ['letsdropthat', 'let\'sdropthat', 'talkaboutsomethingelse', 'differenttopic', 'leaveit', 'letsmoveon', 'let\'smoveon']

function normalizeCompactText(raw: string) {
  return sanitizeText(raw, 240)
    .replace(/[，,。.!！？?\s]+/g, '')
    .toLowerCase()
}

export function deriveExecutionProposalFeedbackKind(input: {
  thread: AlicizationExecutionProposalFeedbackThread
  userText: string
}): AlicizationExecutionProposalFeedbackKind | null {
  const compact = normalizeCompactText(input.userText)
  if (!compact)
    return null
  if (zhExecutionAffirmationPattern.test(compact) || enExecutionAffirmationPattern.test(compact))
    return 'affirmed'
  if (
    zhExecutionDenialTokens.some(token => compact.includes(token))
    || enExecutionDenialTokens.some(token => compact.includes(token))
  ) {
    return 'denied'
  }
  return 'interrupted'
}

export function deriveExecutionResultFeedbackKind(input: {
  previousAssistantText?: string | null
  thread: AlicizationExecutionResultFeedbackThread
  userText: string
}): AlicizationExecutionResultFeedbackKind | null {
  const compact = normalizeCompactText(input.userText)
  if (!compact)
    return null

  if (
    zhExecutionResultIntrusiveTokens.some(token => compact.includes(token))
    || enExecutionResultIntrusiveTokens.some(token => compact.includes(token))
  ) {
    return 'intrusive'
  }
  if (
    zhExecutionResultDoubtedTokens.some(token => compact.includes(token))
    || enExecutionResultDoubtedTokens.some(token => compact.includes(token))
  ) {
    return 'doubted'
  }
  if (
    zhExecutionResultValuedTokens.some(token => compact.includes(token))
    || enExecutionResultValuedTokens.some(token => compact.includes(token))
  ) {
    return 'valued'
  }

  const previousAssistantCompact = normalizeCompactText(input.previousAssistantText ?? '')
  const assistantLooksExecutionLike = executionResultAssistantCueTokens.some(token => previousAssistantCompact.includes(token))
    || executionResultAssistantCueTokens.some(token => compact.includes(token))
  if (!assistantLooksExecutionLike)
    return null

  return 'interrupted'
}

export function deriveDialogueReplyFeedbackKind(input: {
  previousAssistantText?: string | null
  userText: string
}): AlicizationDialogueReplyFeedbackKind | null {
  const compact = normalizeCompactText(input.userText)
  if (!compact)
    return null

  if (
    zhDialogueReplyIntrusiveTokens.some(token => compact.includes(token))
    || enDialogueReplyIntrusiveTokens.some(token => compact.includes(token))
  ) {
    return 'intrusive'
  }
  if (
    zhDialogueReplyRoboticTokens.some(token => compact.includes(token))
    || enDialogueReplyRoboticTokens.some(token => compact.includes(token))
  ) {
    return 'robotic'
  }
  if (
    zhDialogueReplyMissedTokens.some(token => compact.includes(token))
    || enDialogueReplyMissedTokens.some(token => compact.includes(token))
  ) {
    return 'missed'
  }
  if (
    zhDialogueReplyReceivedTokens.some(token => compact.includes(token))
    || enDialogueReplyReceivedTokens.some(token => compact.includes(token))
  ) {
    return 'received'
  }
  if (
    zhDialogueReplyInterruptedTokens.some(token => compact.includes(token))
    || enDialogueReplyInterruptedTokens.some(token => compact.includes(token))
  ) {
    return 'interrupted'
  }

  const previousAssistantCompact = normalizeCompactText(input.previousAssistantText ?? '')
  if (!previousAssistantCompact)
    return null

  return null
}

export function buildDialogueReplyFeedbackOutcomeClosure(input: {
  now: number
  cardId: string
  sessionId?: string | null
  decisionTraceId?: string | null
  turnId?: string | null
  feedback: AlicizationDialogueReplyFeedbackKind
  userText?: string | null
  previousAssistantText?: string | null
  affectiveResidue?: AlicizationDigitalLifeRuntimeSurface['memory']['affectiveResidue'] | null
}): AlicizationOutcomeClosureResult {
  const result = baseResult()
  result.affectiveResidue = input.affectiveResidue ?? null
  const relationshipOutcome: AlicizationRelationshipOutcomeInput = {
    cardId: input.cardId,
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    sourceKind: 'reply',
    actionSummary: `dialogue_feedback=${input.feedback}`,
    closenessDelta: clampDelta(
      input.feedback === 'received'
        ? 0.06
        : input.feedback === 'robotic'
          ? -0.05
          : input.feedback === 'intrusive'
            ? -0.04
            : -0.03,
    ),
    trustDelta: clampDelta(
      input.feedback === 'received'
        ? 0.07
        : input.feedback === 'missed'
          ? -0.09
          : input.feedback === 'robotic'
            ? -0.08
            : input.feedback === 'intrusive'
              ? -0.06
              : -0.03,
    ),
    burdenDelta: clampDelta(
      input.feedback === 'received'
        ? -0.02
        : input.feedback === 'robotic'
          ? 0.04
          : input.feedback === 'intrusive'
            ? 0.08
            : input.feedback === 'missed'
              ? 0.01
              : 0,
    ),
    boundaryDelta: clampDelta(
      input.feedback === 'received'
        ? 0.02
        : input.feedback === 'intrusive'
          ? -0.11
          : input.feedback === 'robotic'
            ? -0.03
            : 0,
    ),
    misreadDelta: clampDelta(
      input.feedback === 'received'
        ? -0.04
        : input.feedback === 'missed'
          ? 0.1
          : input.feedback === 'robotic'
            ? 0.07
            : input.feedback === 'intrusive'
              ? 0.03
              : 0.02,
    ),
    repairDelta: clampDelta(
      input.feedback === 'received'
        ? 0.02
        : input.feedback === 'robotic' || input.feedback === 'missed'
          ? 0.09
          : input.feedback === 'intrusive'
            ? 0.03
            : 0,
    ),
    openLoopDelta: clampDelta(input.feedback === 'interrupted' ? 0.03 : 0),
    summary: `dialogue_feedback=${input.feedback}; evidence=user_and_assistant_turn`,
    createdAt: input.now,
  }
  result.relationshipOutcomes.push(relationshipOutcome)

  const addReinforcement = (
    dimension: AlicizationPersonaReinforcementEventInput['dimension'],
    delta: number,
    valence: AlicizationPersonaReinforcementEventInput['valence'],
  ) => {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension,
      delta,
      valence,
      summary: `dialogue_feedback=${input.feedback}; dimension=${dimension}`,
      createdAt: input.now,
    })
  }

  if (input.feedback === 'received') {
    addReinforcement('companionship', 0.06, 'reinforce')
    addReinforcement('temper-guardedness', 0.04, 'suppress')
  }
  if (input.feedback === 'robotic') {
    addReinforcement('companionship', 0.07, 'reinforce')
    addReinforcement('gentle-repair', 0.06, 'reinforce')
    addReinforcement('temper-guardedness', 0.06, 'suppress')
  }
  if (input.feedback === 'missed') {
    addReinforcement('truthful-grounding', 0.08, 'reinforce')
    addReinforcement('gentle-repair', 0.08, 'reinforce')
    addReinforcement('temper-directness', 0.04, 'suppress')
  }
  if (input.feedback === 'intrusive') {
    addReinforcement('autonomy-respect', 0.1, 'reinforce')
    addReinforcement('temper-directness', 0.05, 'suppress')
    addReinforcement('temper-guardedness', 0.04, 'reinforce')
  }
  if (input.feedback === 'interrupted') {
    addReinforcement('autonomy-respect', 0.06, 'reinforce')
    addReinforcement('companionship', 0.03, 'suppress')
    addReinforcement('unfinished-thread-return', 0.03, 'suppress')
  }

  appendOutcomeEpisode({
    result,
    cardId: input.cardId,
    now: input.now,
    sourceKind: 'dialogue-feedback',
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    whereSummary: 'dialogue-feedback',
    withWhom: ['host'],
    threadAnchor: sanitizeText(input.previousAssistantText, 160) || null,
    whatHappened: [
      `feedback=${input.feedback}`,
      input.userText ? `user=${sanitizeText(input.userText, 240)}` : '',
      input.previousAssistantText ? `assistant=${sanitizeText(input.previousAssistantText, 280)}` : '',
    ].filter(Boolean).join(' | '),
    emotionTags: [input.feedback],
    sourceSummary: 'dialogue-feedback',
    confidence: input.feedback === 'received' ? 0.84 : 0.88,
    sceneAttachment: input.feedback === 'received' ? 0.24 : 0.4,
    consolidationPriority: input.feedback === 'robotic' || input.feedback === 'missed' || input.feedback === 'intrusive' ? 0.72 : 0.48,
    relationshipOutcome,
    derivedFrom: [
      input.userText
        ? { kind: 'turn', id: input.turnId ?? input.sessionId ?? 'feedback-turn', label: `host feedback dialogue: ${sanitizeText(input.userText, 240)}` }
        : null,
      input.previousAssistantText
        ? { kind: 'turn', id: input.turnId ?? input.sessionId ?? 'feedback-turn', label: `assistant feedback dialogue: ${sanitizeText(input.previousAssistantText, 280)}` }
        : null,
      input.turnId ? { kind: 'turn', id: input.turnId, label: 'feedback turn' } : null,
      input.decisionTraceId ? { kind: 'mind-turn-event', id: input.decisionTraceId, label: 'feedback trace' } : null,
    ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
    tags: ['dialogue-feedback', `feedback:${input.feedback}`],
  })

  return result
}

export function buildExecutionProposalFeedbackOutcomeClosure(input: {
  now: number
  cardId: string
  sessionId?: string | null
  decisionTraceId?: string | null
  turnId?: string | null
  feedback: AlicizationExecutionProposalFeedbackKind
  affectiveResidue?: AlicizationDigitalLifeRuntimeSurface['memory']['affectiveResidue'] | null
  emotionalTransitionLedger?: AlicizationEmotionalTransitionLedgerSnapshot | null
  thread: AlicizationExecutionProposalFeedbackThread
}): AlicizationOutcomeClosureResult {
  const result = baseResult()
  result.affectiveResidue = input.affectiveResidue ?? null
  result.emotionalTransitionLedger = input.emotionalTransitionLedger ?? null
  const channel = sanitizeText(input.thread.selectedChannel ?? input.thread.proposedChannel ?? 'executor', 48) || 'executor'
  const goal = sanitizeText(input.thread.goal, 180) || 'proposed-execution'
  const summary = sanitizeText(input.thread.summary, 220)
  const procedureContextTags = inferExecutionProcedureContextTags({
    goal,
    summary,
  })
  const relationshipOutcome: AlicizationRelationshipOutcomeInput = {
    cardId: input.cardId,
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    sourceKind: 'execution',
    actionSummary: `execution_proposal_feedback=${input.feedback}; channel=${channel}; goal=${goal}`,
    closenessDelta: clampDelta(input.feedback === 'affirmed' ? 0.04 : input.feedback === 'denied' ? -0.04 : -0.02),
    trustDelta: clampDelta(input.feedback === 'affirmed' ? 0.08 : input.feedback === 'denied' ? -0.08 : -0.03),
    burdenDelta: clampDelta(input.feedback === 'affirmed' ? -0.01 : input.feedback === 'denied' ? 0.08 : 0.04),
    boundaryDelta: clampDelta(input.feedback === 'affirmed' ? 0.03 : input.feedback === 'denied' ? -0.12 : -0.05),
    misreadDelta: clampDelta(input.feedback === 'affirmed' ? -0.03 : input.feedback === 'denied' ? 0.06 : 0.03),
    repairDelta: clampDelta(input.feedback === 'affirmed' ? 0.03 : 0),
    openLoopDelta: clampDelta(input.feedback === 'affirmed' ? 0.06 : input.feedback === 'interrupted' ? 0.01 : -0.01),
    summary: `execution_proposal_feedback=${input.feedback}; consent_evidence=explicit_user_turn`,
    createdAt: input.now,
  }
  result.relationshipOutcomes.push(relationshipOutcome)

  const addReinforcement = (
    dimension: AlicizationPersonaReinforcementEventInput['dimension'],
    delta: number,
    valence: AlicizationPersonaReinforcementEventInput['valence'],
  ) => {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension,
      delta,
      valence,
      summary: `execution_proposal_feedback=${input.feedback}; dimension=${dimension}`,
      createdAt: input.now,
    })
  }

  if (input.feedback === 'affirmed') {
    addReinforcement('temper-directness', 0.06, 'reinforce')
    addReinforcement('unfinished-thread-return', 0.06, 'reinforce')
  }
  if (input.feedback === 'denied') {
    addReinforcement('autonomy-respect', 0.1, 'reinforce')
    addReinforcement('temper-guardedness', 0.06, 'reinforce')
    addReinforcement('temper-directness', 0.05, 'suppress')
  }
  if (input.feedback === 'interrupted') {
    addReinforcement('autonomy-respect', 0.06, 'reinforce')
    addReinforcement('temper-directness', 0.03, 'suppress')
  }

  appendOutcomeEpisode({
    result,
    cardId: input.cardId,
    now: input.now,
    sourceKind: 'execution-proposal',
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    whereSummary: `execution-proposal:${channel}`,
    withWhom: ['host'],
    threadAnchor: goal,
    whatHappened: [
      `feedback=${input.feedback}`,
      `channel=${channel}`,
      `goal=${goal}`,
      summary ? `summary=${summary}` : '',
      input.thread.userText ? `user=${sanitizeText(input.thread.userText, 240)}` : '',
    ].filter(Boolean).join(' | '),
    emotionTags: ['execution', input.feedback],
    sourceSummary: 'execution-proposal-feedback',
    confidence: input.feedback === 'affirmed' ? 0.84 : 0.86,
    sceneAttachment: 0.38,
    consolidationPriority: input.feedback === 'denied' ? 0.78 : 0.56,
    relationshipOutcome,
    derivedFrom: [
      input.turnId ? { kind: 'turn', id: input.turnId, label: 'execution proposal feedback turn' } : null,
      input.thread.userText
        ? { kind: 'turn', id: input.turnId ?? input.thread.threadId, label: `host feedback dialogue: ${sanitizeText(input.thread.userText, 240)}` }
        : null,
      { kind: 'task-thread', id: input.thread.threadId, label: goal },
    ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
    tags: ['execution-proposal', channel, `feedback:${input.feedback}`, ...procedureContextTags],
  })

  return result
}

export function buildExecutionResultFeedbackOutcomeClosure(input: {
  now: number
  cardId: string
  sessionId?: string | null
  decisionTraceId?: string | null
  turnId?: string | null
  feedback: AlicizationExecutionResultFeedbackKind
  affectiveResidue?: AlicizationDigitalLifeRuntimeSurface['memory']['affectiveResidue'] | null
  emotionalTransitionLedger?: AlicizationEmotionalTransitionLedgerSnapshot | null
  thread: AlicizationExecutionResultFeedbackThread
}): AlicizationOutcomeClosureResult {
  const result = baseResult()
  result.affectiveResidue = input.affectiveResidue ?? null
  result.emotionalTransitionLedger = input.emotionalTransitionLedger ?? null
  const channel = sanitizeText(input.thread.selectedChannel ?? input.thread.proposedChannel ?? 'executor', 48) || 'executor'
  const goal = sanitizeText(input.thread.goal, 180) || 'finished-execution'
  const outcome = sanitizeText(input.thread.outcome ?? input.thread.summary ?? '', 220)
  const summary = sanitizeText(input.thread.summary, 220)
  const safetyGateSummary = sanitizeText(input.thread.safetyGateSummary, 260)
  const resumeConfirmationSummary = sanitizeText(input.thread.resumeConfirmationSummary, 260)
  const procedureContextTags = inferExecutionProcedureContextTags({
    goal,
    summary,
    outcome,
  })
  const carriesBlockedDispatchSafetyRestraint = Boolean(safetyGateSummary)
  const carriesResumeConfirmationBoundary = Boolean(resumeConfirmationSummary)
  const relationshipOutcome: AlicizationRelationshipOutcomeInput = {
    cardId: input.cardId,
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    sourceKind: 'execution',
    actionSummary: `execution_result_feedback=${input.feedback}; channel=${channel}; goal=${goal}`,
    closenessDelta: clampDelta(input.feedback === 'valued' ? 0.03 : input.feedback === 'intrusive' ? -0.03 : 0),
    trustDelta: clampDelta(input.feedback === 'valued' ? 0.09 : input.feedback === 'doubted' ? -0.1 : input.feedback === 'intrusive' ? -0.05 : -0.02),
    burdenDelta: clampDelta(input.feedback === 'intrusive' ? 0.08 : input.feedback === 'interrupted' ? 0.03 : 0),
    boundaryDelta: clampDelta(input.feedback === 'valued' ? 0.02 : input.feedback === 'intrusive' ? -0.12 : input.feedback === 'interrupted' ? -0.05 : -0.02),
    misreadDelta: clampDelta(input.feedback === 'valued' ? -0.04 : input.feedback === 'doubted' ? 0.1 : input.feedback === 'intrusive' ? 0.02 : 0.01),
    repairDelta: clampDelta(input.feedback === 'valued' ? 0.03 : input.feedback === 'doubted' ? 0.08 : 0),
    openLoopDelta: clampDelta(input.feedback === 'valued' ? 0.05 : input.feedback === 'interrupted' ? 0.02 : 0),
    summary: `execution_result_feedback=${input.feedback}; outcome_evidence=${Boolean(outcome)}; safety_gate=${carriesBlockedDispatchSafetyRestraint}; resume_confirmation=${carriesResumeConfirmationBoundary}`,
    createdAt: input.now,
  }
  result.relationshipOutcomes.push(relationshipOutcome)

  const addReinforcement = (
    dimension: AlicizationPersonaReinforcementEventInput['dimension'],
    delta: number,
    valence: AlicizationPersonaReinforcementEventInput['valence'],
  ) => {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension,
      delta,
      valence,
      summary: `execution_result_feedback=${input.feedback}; dimension=${dimension}`,
      createdAt: input.now,
    })
  }

  if (input.feedback === 'valued') {
    addReinforcement('truthful-grounding', 0.07, 'reinforce')
    addReinforcement('temper-directness', 0.05, 'reinforce')
    addReinforcement('unfinished-thread-return', 0.05, 'reinforce')
  }
  if (input.feedback === 'doubted') {
    addReinforcement('truthful-grounding', 0.08, 'reinforce')
    addReinforcement('temper-directness', 0.06, 'suppress')
    addReinforcement('temper-guardedness', 0.05, 'reinforce')
  }
  if (input.feedback === 'intrusive') {
    addReinforcement('autonomy-respect', 0.1, 'reinforce')
    addReinforcement('temper-directness', 0.05, 'suppress')
    addReinforcement('temper-guardedness', 0.04, 'reinforce')
  }
  if (input.feedback === 'interrupted') {
    addReinforcement('autonomy-respect', 0.06, 'reinforce')
    addReinforcement('temper-directness', 0.03, 'suppress')
  }

  const addObservedFact = (predicate: string, object: string, confidence: number) => {
    const normalized = sanitizeText(object, 320)
    if (!normalized)
      return
    result.memoryFacts.push({
      subject: 'execution',
      predicate,
      object: normalized,
      confidence,
    })
  }
  addObservedFact('outcome', outcome, input.feedback === 'valued' ? 0.84 : 0.76)
  addObservedFact('safety-gate', safetyGateSummary, 0.86)
  addObservedFact('resume-confirmation', resumeConfirmationSummary, 0.86)

  appendOutcomeEpisode({
    result,
    cardId: input.cardId,
    now: input.now,
    sourceKind: 'execution-result',
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    whereSummary: `execution-callback:${channel}`,
    withWhom: ['host'],
    threadAnchor: goal,
    whatHappened: [
      `feedback=${input.feedback}`,
      `channel=${channel}`,
      `goal=${goal}`,
      outcome ? `outcome=${outcome}` : '',
      input.thread.userText ? `user=${sanitizeText(input.thread.userText, 240)}` : '',
      input.thread.previousAssistantText ? `assistant=${sanitizeText(input.thread.previousAssistantText, 280)}` : '',
      safetyGateSummary ? `safety_gate=${safetyGateSummary}` : '',
      resumeConfirmationSummary ? `resume_confirmation=${resumeConfirmationSummary}` : '',
    ].filter(Boolean).join(' | '),
    emotionTags: ['execution', input.feedback],
    sourceSummary: 'execution-result-feedback',
    confidence: input.feedback === 'valued' ? 0.86 : 0.84,
    sceneAttachment: 0.42,
    consolidationPriority: input.feedback === 'doubted' || input.feedback === 'intrusive' ? 0.74 : 0.54,
    relationshipOutcome,
    derivedFrom: [
      input.turnId ? { kind: 'turn', id: input.turnId, label: 'execution result feedback turn' } : null,
      input.thread.userText
        ? { kind: 'turn', id: input.turnId ?? input.thread.threadId, label: `host feedback dialogue: ${sanitizeText(input.thread.userText, 240)}` }
        : null,
      input.thread.previousAssistantText
        ? { kind: 'turn', id: input.turnId ?? input.thread.threadId, label: `assistant feedback dialogue: ${sanitizeText(input.thread.previousAssistantText, 280)}` }
        : null,
      outcome ? { kind: 'task-thread', id: `${input.thread.threadId}:outcome`, label: `tool outcome: ${outcome}` } : null,
      safetyGateSummary ? { kind: 'task-thread', id: `${input.thread.threadId}:safety`, label: `safety gate: ${safetyGateSummary}` } : null,
      resumeConfirmationSummary ? { kind: 'task-thread', id: `${input.thread.threadId}:resume`, label: `resume confirmation: ${resumeConfirmationSummary}` } : null,
      { kind: 'task-thread', id: input.thread.threadId, label: goal },
    ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
    tags: [
      'execution-result',
      channel,
      `feedback:${input.feedback}`,
      ...procedureContextTags,
      carriesBlockedDispatchSafetyRestraint ? 'execution-safety-gate' : '',
      carriesResumeConfirmationBoundary ? 'execution-resume-confirmation' : '',
    ],
  })

  return result
}

export function buildProactiveFeedbackOutcomeClosure(input: {
  now: number
  cardId: string
  sessionId?: string | null
  decisionTraceId?: string | null
  outcomes: AlicizationRecentProactiveOutcome[]
  affectiveResidue?: AlicizationDigitalLifeRuntimeSurface['memory']['affectiveResidue'] | null
}): AlicizationOutcomeClosureResult {
  const result = baseResult()
  const settledAffectiveResidue = [...input.outcomes]
    .reverse()
    .find(outcome => outcome.affectiveResidue)
    ?.affectiveResidue ?? null
  const settledEmotionalTransitionLedger = [...input.outcomes]
    .reverse()
    .find(outcome => outcome.emotionalTransitionLedger)
    ?.emotionalTransitionLedger ?? null
  result.affectiveResidue = input.affectiveResidue ?? settledAffectiveResidue
  result.emotionalTransitionLedger = settledEmotionalTransitionLedger

  for (const outcome of input.outcomes) {
    const label = proactiveScenarioLabel(outcome)
    const positive = outcome.outcome === 'positive' || outcome.outcome === 'reply-within-120s'
    const dismissed = outcome.outcome === 'dismiss'
    const ignored = outcome.outcome === 'ignored'
    const relationshipOutcome: AlicizationRelationshipOutcomeInput = {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: outcome.turnId,
      sessionId: input.sessionId,
      sourceKind: 'proactive',
      actionSummary: `proactive_outcome=${outcome.outcome}; scenario=${label}`,
      closenessDelta: clampDelta(positive ? 0.07 : dismissed ? -0.07 : -0.04),
      trustDelta: clampDelta(positive ? 0.05 : dismissed ? -0.08 : -0.03),
      burdenDelta: clampDelta(positive ? -0.02 : dismissed ? 0.08 : 0.04),
      boundaryDelta: clampDelta(positive ? 0.02 : dismissed ? -0.12 : -0.06),
      misreadDelta: clampDelta(positive ? -0.02 : dismissed ? 0.08 : 0.04),
      repairDelta: 0,
      openLoopDelta: clampDelta(positive ? 0.04 : 0),
      summary: `proactive_outcome=${outcome.outcome}; scenario=${label}; evidence=user_and_assistant_turn`,
      createdAt: outcome.createdAt,
    }
    result.relationshipOutcomes.push(relationshipOutcome)

    const addReinforcement = (
      dimension: AlicizationPersonaReinforcementEventInput['dimension'],
      delta: number,
      valence: AlicizationPersonaReinforcementEventInput['valence'],
    ) => {
      result.reinforcementEvents.push({
        cardId: input.cardId,
        decisionTraceId: input.decisionTraceId,
        turnId: outcome.turnId,
        sessionId: input.sessionId,
        sourceKind: 'proactive',
        dimension,
        delta,
        valence,
        summary: `proactive_outcome=${outcome.outcome}; scenario=${label}; dimension=${dimension}`,
        createdAt: outcome.createdAt,
      })
    }

    if (positive)
      addReinforcement('companionship', 0.07, 'reinforce')
    if (dismissed || ignored) {
      addReinforcement('autonomy-respect', dismissed ? 0.1 : 0.07, 'reinforce')
      addReinforcement('companionship', dismissed ? 0.06 : 0.03, 'suppress')
      if (dismissed)
        addReinforcement('temper-guardedness', 0.05, 'reinforce')
    }

    appendOutcomeEpisode({
      result,
      cardId: input.cardId,
      now: outcome.createdAt,
      sourceKind: 'proactive',
      decisionTraceId: input.decisionTraceId,
      turnId: outcome.turnId,
      sessionId: input.sessionId,
      whereSummary: `${label} proactive window`,
      withWhom: ['host'],
      threadAnchor: label,
      whatHappened: [
        `outcome=${outcome.outcome}`,
        `scenario=${label}`,
        outcome.userText ? `user=${sanitizeText(outcome.userText, 240)}` : '',
        outcome.assistantText ? `assistant=${sanitizeText(outcome.assistantText, 280)}` : '',
      ].filter(Boolean).join(' | '),
      emotionTags: ['proactive', label, outcome.outcome],
      sourceSummary: 'proactive-outcome',
      confidence: positive ? 0.8 : dismissed ? 0.86 : 0.78,
      sceneAttachment: label === 'late-night care' ? 0.5 : 0.32,
      consolidationPriority: dismissed ? 0.76 : positive ? 0.52 : 0.6,
      relationshipOutcome,
      derivedFrom: [
        outcome.turnId ? { kind: 'turn', id: outcome.turnId, label: `${label} proactive turn` } : null,
        outcome.userText
          ? { kind: 'turn', id: outcome.turnId, label: `host feedback dialogue: ${sanitizeText(outcome.userText, 240)}` }
          : null,
        outcome.assistantText
          ? { kind: 'turn', id: outcome.turnId, label: `assistant feedback dialogue: ${sanitizeText(outcome.assistantText, 280)}` }
          : null,
      ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
      tags: ['proactive', label.replace(/\s+/g, '-'), `settlement:${outcome.outcome}`],
    })
  }

  return result
}

export function attachSynthesizedReflections(input: AlicizationOutcomeClosureResult) {
  return input
}
