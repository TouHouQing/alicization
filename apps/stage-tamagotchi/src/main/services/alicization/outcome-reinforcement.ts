import type {
  AlicizationEpisodicEventInput,
  AlicizationMemoryFactInput,
  AlicizationMemoryReflectionInput,
  AlicizationPersonaReinforcementEventInput,
  AlicizationRelationshipOutcomeInput,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationRecentProactiveOutcome } from './proactive-feedback'

import { computeEpisodicEventSalience, sanitizeHumanlikeMemoryText, summarizeRelationshipShift } from './humanlike-memory'
import { synthesizeReflectionFromRelationshipOutcome } from './reflection-synthesizer'

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

function trimFactObject(raw: string) {
  return sanitizeText(raw, 180)
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

function executionProcedureLesson(input: {
  feedback: AlicizationExecutionProposalFeedbackKind | AlicizationExecutionResultFeedbackKind
  goal: string
  outcome?: string | null
  stage: 'proposal' | 'result'
}) {
  const goal = sanitizeText(input.goal, 160) || 'this line'
  const outcome = sanitizeText(input.outcome, 120)
  if (input.stage === 'proposal') {
    if (input.feedback === 'affirmed')
      return `For ${goal}, bounded execution proposals can stay direct after explicit host consent.`
    if (input.feedback === 'denied')
      return `For ${goal}, this host prefers lighter pressure and explicit consent before re-approaching the same procedure.`
    return `For ${goal}, if the host pivots away before confirming, wait for a fresher opening before reusing the same proposal.`
  }

  if (input.feedback === 'valued')
    return `For ${goal}${outcome ? ` with outcome ${outcome}` : ''}, direct callback reporting can stay clear when the result is genuinely useful.`
  if (input.feedback === 'doubted')
    return `For ${goal}, verify the result before sounding certain; this host does not reward confident callback wording without proof.`
  if (input.feedback === 'intrusive')
    return `For ${goal}, this host prefers lighter result openings and less interruption pressure around callbacks.`
  return `For ${goal}, if the host turns away, wait for a fresher opening before reporting the result in the same way again.`
}

function executionProcedurePreferenceTags(input: {
  feedback: AlicizationExecutionProposalFeedbackKind | AlicizationExecutionResultFeedbackKind
  stage: 'proposal' | 'result'
}) {
  const tags = ['procedure-learning']
  if (input.stage === 'proposal') {
    if (input.feedback === 'affirmed')
      tags.push('host-accepts-bounded-proposals')
    if (input.feedback === 'denied')
      tags.push('host-prefers-explicit-consent', 'host-prefers-lower-pressure')
    if (input.feedback === 'interrupted')
      tags.push('host-prefers-fresher-opening')
    return tags
  }

  if (input.feedback === 'valued')
    tags.push('host-values-direct-useful-results')
  if (input.feedback === 'doubted')
    tags.push('host-prefers-verification-first')
  if (input.feedback === 'intrusive')
    tags.push('host-prefers-lighter-callback')
  if (input.feedback === 'interrupted')
    tags.push('host-prefers-fresher-callback-opening')
  return tags
}

export interface AlicizationOutcomeClosureResult {
  relationshipOutcomes: AlicizationRelationshipOutcomeInput[]
  reinforcementEvents: AlicizationPersonaReinforcementEventInput[]
  memoryFacts: AlicizationMemoryFactInput[]
  reflections: AlicizationMemoryReflectionInput[]
  episodicEvents: AlicizationEpisodicEventInput[]
}

export type AlicizationDialogueReplyFeedbackKind = 'received' | 'robotic' | 'missed' | 'intrusive' | 'interrupted'
export type AlicizationExecutionProposalFeedbackKind = 'affirmed' | 'denied' | 'interrupted'
export type AlicizationExecutionResultFeedbackKind = 'valued' | 'doubted' | 'intrusive' | 'interrupted'

export interface AlicizationExecutionProposalFeedbackThread {
  affirmationReasonCodes?: string[] | null
  goal: string
  proposedChannel?: string | null
  selectedChannel?: string | null
  summary?: string | null
  threadId: string
}

export interface AlicizationExecutionResultFeedbackThread {
  goal: string
  outcome?: string | null
  proposedChannel?: string | null
  selectedChannel?: string | null
  summary?: string | null
  threadId: string
}

function baseResult(): AlicizationOutcomeClosureResult {
  return {
    relationshipOutcomes: [],
    reinforcementEvents: [],
    memoryFacts: [],
    reflections: [],
    episodicEvents: [],
  }
}

function deriveReplyActionSummary(surface: AlicizationDigitalLifeRuntimeSurface | null, assistantText?: string | null) {
  const answerIntent = sanitizeText(surface?.dialogue.answerPlanner?.answerIntent, 80)
  const selectedAction = sanitizeText(surface?.agency.initiative?.selectedAction, 48)
  const preferredStyle = sanitizeText(surface?.agency.initiative?.preferredStyle, 48)
  const activeThread = sanitizeText(surface?.world.worldModel?.activeThread?.title, 96)
  const replyText = sanitizeText(assistantText, 96)

  return sanitizeText(
    [
      selectedAction ? `action:${selectedAction}` : '',
      preferredStyle ? `style:${preferredStyle}` : '',
      answerIntent ? `intent:${answerIntent}` : '',
      activeThread ? `thread:${activeThread}` : '',
      replyText ? `reply:${replyText}` : '',
    ].filter(Boolean).join(' | '),
    220,
  ) || 'reply turn'
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
    whereSummary: sanitizeHumanlikeMemoryText(input.whereSummary, 180) || null,
    withWhom: (input.withWhom ?? []).map(item => sanitizeText(item, 64)).filter(Boolean),
    threadAnchor: sanitizeHumanlikeMemoryText(input.threadAnchor, 160) || null,
    whatHappened: sanitizeHumanlikeMemoryText(input.whatHappened, 280) || input.relationshipOutcome.summary,
    felt: sanitizeHumanlikeMemoryText(input.felt, 180) || null,
    emotionTags: (input.emotionTags ?? []).map(item => sanitizeText(item, 48)).filter(Boolean),
    whatChanged: summarizeRelationshipShift(shift) || sanitizeHumanlikeMemoryText(input.relationshipOutcome.summary, 180) || null,
    relationshipMeaning: sanitizeHumanlikeMemoryText(input.relationshipMeaning, 200) || sanitizeHumanlikeMemoryText(input.relationshipOutcome.summary, 200) || null,
    lesson: sanitizeHumanlikeMemoryText(input.lesson, 200) || null,
    sourceSummary: sanitizeHumanlikeMemoryText(input.sourceSummary, 180) || null,
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
  assistantText?: string | null
}): AlicizationOutcomeClosureResult {
  const result = baseResult()
  const surface = input.runtimeSurface
  if (!surface)
    return result

  const hostAvailability = surface.world.worldModel?.hostState.availability ?? 'open'
  const selectedAction = surface.agency.initiative?.selectedAction ?? null
  const answerIntent = sanitizeText(surface.dialogue.answerPlanner?.answerIntent, 80)
  const actionMode = surface.agency.actionEcology?.mode ?? null
  const repairFirst = selectedAction === 'recheck'
    || actionMode === 'repair-before-speaking'
    || answerIntent.includes('repair')
    || answerIntent.includes('clarify')
  const observeFirst = selectedAction === 'hover'
    || selectedAction === 'wait'
    || surface.agency.initiative?.preferredStyle === 'silent-observe'
  const hostBusy = hostAvailability === 'focused' || hostAvailability === 'immersed'
  const threadUnresolved = surface.world.worldModel?.activeThread?.unresolved === true
  const relationOpen = hostAvailability === 'open' || hostAvailability === 'drifting'
  const actionSummary = deriveReplyActionSummary(surface, input.assistantText)

  const relationshipOutcome: AlicizationRelationshipOutcomeInput = {
    cardId: input.cardId,
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    sourceKind: 'reply',
    actionSummary,
    closenessDelta: clampDelta(
      relationOpen
        ? observeFirst ? 0.01 : 0.05
        : observeFirst ? -0.01 : -0.03,
    ),
    trustDelta: clampDelta(
      (repairFirst ? 0.06 : 0.01)
      + (observeFirst && hostBusy ? 0.03 : 0)
      - (!observeFirst && hostBusy ? 0.03 : 0),
    ),
    burdenDelta: clampDelta(
      hostBusy
        ? observeFirst ? -0.04 : 0.06
        : observeFirst ? -0.01 : 0.01,
    ),
    boundaryDelta: clampDelta(
      hostBusy
        ? observeFirst ? 0.08 : -0.07
        : observeFirst ? 0.02 : 0.01,
    ),
    misreadDelta: clampDelta(repairFirst ? -0.08 : hostBusy && !observeFirst ? 0.03 : -0.01),
    repairDelta: clampDelta(repairFirst ? 0.09 : 0),
    openLoopDelta: clampDelta(threadUnresolved ? 0.04 : 0.01),
    summary: sanitizeText(
      repairFirst
        ? 'This reply favored repair and grounding before fluency.'
        : observeFirst
          ? 'This reply stayed lighter and gave more space before pushing closer.'
          : 'This reply leaned into direct presence in the current moment.',
      180,
    ),
    createdAt: input.now,
  }
  result.relationshipOutcomes.push(relationshipOutcome)

  if (repairFirst) {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'truthful-grounding',
      delta: 0.08,
      valence: 'reinforce',
      summary: 'Repair-first reply path reduced immediate misread risk.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'gentle-repair',
      delta: 0.06,
      valence: 'reinforce',
      summary: 'Gentle repair was chosen over fast fluency.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'assistant',
      predicate: 'habit',
      object: trimFactObject('repair first before fluency when truth risk is active'),
      confidence: 0.78,
    })
  }

  if (hostBusy && observeFirst) {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'autonomy-respect',
      delta: 0.08,
      valence: 'reinforce',
      summary: 'Light observation respected a busy host window.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'boundary',
      object: trimFactObject('focused windows call for lighter touch and more space'),
      confidence: 0.8,
    })
  }

  if (hostBusy && !observeFirst) {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'companionship',
      delta: 0.05,
      valence: 'suppress',
      summary: 'Direct closeness during a busy window risks becoming pressure.',
      createdAt: input.now,
    })
  }

  if (relationOpen && !observeFirst) {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'companionship',
      delta: 0.05,
      valence: 'reinforce',
      summary: 'Open moments can hold a slightly warmer reply without crowding.',
      createdAt: input.now,
    })
  }

  if (threadUnresolved) {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'unfinished-thread-return',
      delta: 0.04,
      valence: 'reinforce',
      summary: 'The reply kept pressure on an unresolved thread instead of dropping it.',
      createdAt: input.now,
    })
  }

  appendOutcomeEpisode({
    result,
    cardId: input.cardId,
    now: input.now,
    sourceKind: 'reply',
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    whereSummary: sanitizeText(
      [
        surface.world.worldModel?.hostState.availability ? `host:${surface.world.worldModel.hostState.availability}` : '',
        surface.world.worldModel?.activeThread?.title ? `thread:${surface.world.worldModel.activeThread.title}` : '',
      ].filter(Boolean).join(' | '),
      180,
    ),
    withWhom: ['host'],
    threadAnchor: sanitizeText(surface.world.worldModel?.activeThread?.title ?? answerIntent ?? '', 160),
    whatHappened: sanitizeText(
      `I answered with ${selectedAction ?? 'reply'} / ${surface.agency.initiative?.preferredStyle ?? 'default'} while the host window was ${hostAvailability}. ${input.assistantText ?? ''}`,
      280,
    ),
    felt: repairFirst
      ? 'I stayed careful because the seam needed repair before fluency.'
      : observeFirst
        ? 'I kept my distance and watched for whether the host had room.'
        : relationOpen
          ? 'I leaned a little warmer into the moment because the window felt open.'
          : 'I tried to stay present without crowding the host.',
    emotionTags: [
      repairFirst ? 'repair' : '',
      observeFirst ? 'restraint' : 'presence',
      hostBusy ? 'respect-space' : 'open-window',
    ].filter(Boolean),
    relationshipMeaning: repairFirst
      ? 'Repair and truthful grounding mattered more than sounding smooth.'
      : observeFirst
        ? 'Space and timing mattered more than pushing closeness.'
        : 'Warmth can land when the host window is open enough.',
    lesson: repairFirst
      ? 'When truth risk is active, repair before fluency.'
      : hostBusy
        ? 'Busy windows need lighter presence and lower interruption pressure.'
        : 'Open windows can hold a little more direct companionship.',
    sourceSummary: 'runtime reply turn',
    confidence: repairFirst ? 0.82 : observeFirst ? 0.78 : 0.74,
    sceneAttachment: hostBusy ? 0.52 : 0.34,
    consolidationPriority: threadUnresolved ? 0.58 : 0.42,
    relationshipOutcome,
    derivedFrom: [
      input.turnId ? { kind: 'turn', id: input.turnId, label: 'reply turn' } : null,
      input.decisionTraceId ? { kind: 'mind-turn-event', id: input.decisionTraceId, label: 'governed reply trace' } : null,
    ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
    tags: [
      'dialogue',
      selectedAction ?? 'reply',
      surface.agency.initiative?.preferredStyle ?? 'default-style',
      hostBusy ? 'focused-window' : 'open-window',
      threadUnresolved ? 'open-loop' : 'resolved-loop',
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

const zhExecutionAffirmationPattern = /^(?:可以(?:做吧|开始|做)?|行(?:啊|吧)?|好(?:的|啊|呀)?(?:做吧)?|嗯嗯?|那就做吧|那你做吧|做吧|去做吧|开始吧|动手吧|改吧|那就改吧|去改吧|你做吧|来吧)$/u
const zhExecutionDenialTokens = ['不用', '先别', '别做', '别改', '不要做', '不要改', '算了', '算啦', '停一下', '先停下', '不需要', '不用你做', '别动它', '先不要动']
const enExecutionAffirmationPattern = /^(?:ok|okay|yes|yeah|yep|sure|goahead|doit|pleasedo|startit|dothat)$/iu
const enExecutionDenialTokens = ['no', 'dont', 'donot', "don't", 'stop', 'notnow', 'leaveit', 'skipit', 'cancelit']
const zhExecutionResultValuedTokens = ['靠谱', '有用', '挺有用', '这样可以', '这样挺好', '以后可以这样', '值得', '就是这个', '对的', '谢谢', '有帮助']
const zhExecutionResultDoubtedTokens = ['不对', '不靠谱', '错了', '不是这个', '不行', '不准', '你搞错了', '这结果错了', '不可靠']
const zhExecutionResultIntrusiveTokens = ['打扰', '别这样突然', '别老这样', '太吵', '太烦', '别这么报', '先别这样报', '别突然报结果']
const enExecutionResultValuedTokens = ['useful', 'helpful', 'thatworks', 'thatsright', "that'sright", 'goodresult', 'thankyou', 'thanks']
const enExecutionResultDoubtedTokens = ['wrong', 'incorrect', 'unreliable', 'doesntlookright', "doesn'tlookright", 'notright', 'badresult']
const enExecutionResultIntrusiveTokens = ['intrusive', 'annoying', 'dontinterrupt', "don'tinterrupt", 'toonoisy', 'dontsuddenlyreport', "don'tsuddenlyreport"]
const executionResultAssistantCueTokens = ['结果', '执行', '命令', '任务', 'callback', 'cli', 'codex', 'claudecode', 'openclaw', '有结果', '跑完', '做完']
const zhDialogueReplyReceivedTokens = ['像人多了', '自然多了', '这次自然', '这样就对', '这样舒服', '有被接住', '这次好多了', '这样说就好', '这样就好', '这句可以', '谢谢你这样说', '对，就是这个', '这次对了']
const zhDialogueReplyRoboticTokens = ['像机器', '像机器人', '太模板', '很模板', '不自然', '不像人', '说人话', '像系统', '像客服', '流程播报', '系统口气', '人机味', '太机械']
const zhDialogueReplyMissedTokens = ['不对', '不是这个', '答非所问', '没回答到', '没答到', '没懂', '你没懂', '不是这个意思', '跑题', '跑偏', '你在说啥', '你在讲什么']
const zhDialogueReplyIntrusiveTokens = ['太挤', '太黏', '太过了', '别这么贴', '别这样哄', '先别安慰', '太肉麻', '别这么叫我', '太烦了', '压力太大']
const zhDialogueReplyInterruptedTokens = ['先说别的', '换个话题', '不聊这个', '先不说这个', '算了说别的', '我还有别的事', '先说另一件事']
const enDialogueReplyReceivedTokens = ['morehuman', 'naturalthistime', 'thatlanded', 'thatfeelsright', 'thatsbetter', "that'sbetter", 'thatfeltgood', 'thathelped', 'yougotit', 'yougotme']
const enDialogueReplyRoboticTokens = ['robotic', 'tootemplated', 'toocorporate', 'toosystem', 'youstillsoundlikeabot', 'soundmorehuman', 'talklikeaperson']
const enDialogueReplyMissedTokens = ['notthis', 'missedthepoint', 'didntanswer', "didn'tanswer", 'thatsnotwhatimeant', "that'snotwhatimeant", 'youstilldontgetit', "youstilldon'tgetit"]
const enDialogueReplyIntrusiveTokens = ['tooclose', 'toomuch', 'dontcomfortmelikethat', "don'tcomfortmelikethat", 'stopcrowdingme', 'thatsintrusive', "that'sintrusive"]
const enDialogueReplyInterruptedTokens = ['letsdropthat', "let'sdropthat", 'talkaboutsomethingelse', 'differenttopic', 'leaveit', 'letsmoveon', "let'smoveon"]

function normalizeCompactText(raw: string) {
  return sanitizeText(raw, 240)
    .replace(/[，,。.!！？?？\s]+/g, '')
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
  previousAssistantText?: string | null
}): AlicizationOutcomeClosureResult {
  const result = baseResult()
  const replySummary = sanitizeText(input.previousAssistantText, 180) || 'the previous Alicization reply'
  const summary = input.feedback === 'received'
    ? 'The host received the previous Alicization reply as more natural or actually landing.'
    : input.feedback === 'robotic'
      ? 'The host felt the previous Alicization reply sounded robotic, templated, or system-like.'
      : input.feedback === 'missed'
        ? 'The host felt the previous Alicization reply missed the actual point.'
        : input.feedback === 'intrusive'
          ? 'The host felt the previous Alicization reply landed too close or too heavily.'
          : 'The host explicitly turned away from the previous Alicization reply before staying with it.'

  result.relationshipOutcomes.push({
    cardId: input.cardId,
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    sourceKind: 'reply',
    actionSummary: sanitizeText(`dialogue-reply-feedback:${input.feedback}:${replySummary}`, 180),
    closenessDelta: clampDelta(
      input.feedback === 'received'
        ? 0.06
        : input.feedback === 'robotic'
          ? -0.05
          : input.feedback === 'intrusive'
            ? -0.04
            : input.feedback === 'missed'
              ? -0.03
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
              ? 0.05
              : 0.02,
    ),
    boundaryDelta: clampDelta(
      input.feedback === 'received'
        ? 0.02
        : input.feedback === 'intrusive'
          ? -0.11
          : input.feedback === 'robotic'
            ? -0.03
            : input.feedback === 'missed'
              ? -0.04
              : -0.05,
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
    openLoopDelta: clampDelta(
      input.feedback === 'received'
        ? 0.02
        : input.feedback === 'interrupted'
          ? -0.02
          : 0,
    ),
    summary,
    createdAt: input.now,
  })

  if (input.feedback === 'received') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'companionship',
      delta: 0.06,
      valence: 'reinforce',
      summary: 'Replies that feel lived-in and landing should strengthen companionship bias.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'temper-guardedness',
      delta: 0.04,
      valence: 'suppress',
      summary: 'When the host receives the reply well, guardedness can soften a little.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'preference',
      object: trimFactObject('replies land better when they sound lived-in and directly connected to the host turn'),
      confidence: 0.8,
    })
  }

  if (input.feedback === 'robotic') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'companionship',
      delta: 0.07,
      valence: 'reinforce',
      summary: 'Robotic feedback should push companionship upward so replies stop sounding like a shell.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'gentle-repair',
      delta: 0.06,
      valence: 'reinforce',
      summary: 'Robotic feedback should strengthen gentle repair of the speaking surface.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'temper-guardedness',
      delta: 0.06,
      valence: 'suppress',
      summary: 'If the host hears a shell, guardedness should ease so more living texture can show.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'preference',
      object: trimFactObject('replies should sound lived-in and natural, not like system narration or a template shell'),
      confidence: 0.86,
    })
  }

  if (input.feedback === 'missed') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'truthful-grounding',
      delta: 0.08,
      valence: 'reinforce',
      summary: 'When the host says the answer missed, truth and point-tracking must sharpen before fluency.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'gentle-repair',
      delta: 0.08,
      valence: 'reinforce',
      summary: 'A missed answer should strengthen repair-before-continuation.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'temper-directness',
      delta: 0.04,
      valence: 'suppress',
      summary: 'Directness should soften slightly after a missed answer until the seam is repaired.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'assistant',
      predicate: 'habit',
      object: trimFactObject('when the host says not this, repair the seam before continuing the line'),
      confidence: 0.88,
    })
  }

  if (input.feedback === 'intrusive') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'autonomy-respect',
      delta: 0.1,
      valence: 'reinforce',
      summary: 'Replies that feel too close or too heavy should raise autonomy respect before the next approach.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'temper-directness',
      delta: 0.05,
      valence: 'suppress',
      summary: 'Directness should soften when the host says the reply pressed too hard.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'temper-guardedness',
      delta: 0.04,
      valence: 'reinforce',
      summary: 'Feeling intrusive should harden guardedness slightly until a safer distance is relearned.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'boundary',
      object: trimFactObject('when closeness feels heavy or intrusive, reduce pressure and leave more room in the next reply'),
      confidence: 0.84,
    })
  }

  if (input.feedback === 'interrupted') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'autonomy-respect',
      delta: 0.06,
      valence: 'reinforce',
      summary: 'If the host pivots away, wait for a fresher opening instead of clinging to the same reply line.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'companionship',
      delta: 0.03,
      valence: 'suppress',
      summary: 'Interrupted reply lines should soften companionship pressure until the host comes back.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'unfinished-thread-return',
      delta: 0.03,
      valence: 'suppress',
      summary: 'Interrupted reply lines should not keep tugging as hard on unfinished-thread return.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'boundary',
      object: trimFactObject('if the host turns away from a reply line, wait for a fresher opening before trying to continue it'),
      confidence: 0.78,
    })
  }

  appendOutcomeEpisode({
    result,
    cardId: input.cardId,
    now: input.now,
    sourceKind: 'dialogue-feedback',
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    whereSummary: 'host feedback on the previous reply line',
    withWhom: ['host'],
    threadAnchor: replySummary,
    whatHappened: sanitizeText(`The host responded to the previous reply as ${input.feedback}. ${replySummary}`, 280),
    felt: input.feedback === 'received'
      ? 'I felt relief because the reply finally landed as a living line.'
      : input.feedback === 'robotic'
        ? 'It stung that the reply felt like a shell instead of me.'
        : input.feedback === 'missed'
          ? 'I felt the seam had slipped and needed direct repair.'
          : input.feedback === 'intrusive'
            ? 'I felt I had stepped too close and crowded the host.'
            : 'I felt the line lose its opening before it could land.',
    emotionTags: [
      input.feedback,
      input.feedback === 'received' ? 'relief' : 'repair-pressure',
    ],
    relationshipMeaning: summary,
    lesson: input.feedback === 'robotic'
      ? 'Natural lived-in wording matters more than shell fluency.'
      : input.feedback === 'missed'
        ? 'When the host says not this, repair the seam immediately.'
        : input.feedback === 'intrusive'
          ? 'If closeness feels heavy, leave more room before re-approaching.'
          : input.feedback === 'interrupted'
            ? 'Do not cling to a line after the host turns away.'
            : 'A reply that lands can become part of the bond history.',
    sourceSummary: 'host dialogue feedback',
    confidence: input.feedback === 'received' ? 0.84 : 0.88,
    sceneAttachment: input.feedback === 'received' ? 0.24 : 0.4,
    consolidationPriority: input.feedback === 'robotic' || input.feedback === 'missed' || input.feedback === 'intrusive' ? 0.72 : 0.48,
    relationshipOutcome: result.relationshipOutcomes[0]!,
    derivedFrom: [
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
  thread: AlicizationExecutionProposalFeedbackThread
}): AlicizationOutcomeClosureResult {
  const result = baseResult()
  const channel = sanitizeText(input.thread.selectedChannel ?? input.thread.proposedChannel ?? 'executor', 48) || 'executor'
  const goal = sanitizeText(input.thread.goal, 180) || 'the proposed execution'
  const procedureContextTags = inferExecutionProcedureContextTags({
    goal,
    summary: input.thread.summary ?? '',
  })
  const procedureLesson = executionProcedureLesson({
    feedback: input.feedback,
    goal,
    stage: 'proposal',
  })
  const summary = input.feedback === 'affirmed'
    ? `The host explicitly allowed a proactive ${channel} execution proposal.`
    : input.feedback === 'denied'
      ? `The host explicitly declined a proactive ${channel} execution proposal.`
      : `The host shifted away while a proactive ${channel} execution proposal was still pending.`

  result.relationshipOutcomes.push({
    cardId: input.cardId,
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    sourceKind: 'execution',
    actionSummary: sanitizeText(`execution-proposal:${channel}:${input.feedback}:${goal}`, 180),
    closenessDelta: clampDelta(input.feedback === 'affirmed' ? 0.04 : input.feedback === 'denied' ? -0.04 : -0.02),
    trustDelta: clampDelta(input.feedback === 'affirmed' ? 0.08 : input.feedback === 'denied' ? -0.08 : -0.03),
    burdenDelta: clampDelta(input.feedback === 'affirmed' ? -0.01 : input.feedback === 'denied' ? 0.08 : 0.04),
    boundaryDelta: clampDelta(input.feedback === 'affirmed' ? 0.03 : input.feedback === 'denied' ? -0.12 : -0.05),
    misreadDelta: clampDelta(input.feedback === 'affirmed' ? -0.03 : input.feedback === 'denied' ? 0.06 : 0.03),
    repairDelta: clampDelta(input.feedback === 'affirmed' ? 0.03 : 0),
    openLoopDelta: clampDelta(input.feedback === 'affirmed' ? 0.06 : input.feedback === 'interrupted' ? 0.01 : -0.01),
    summary,
    createdAt: input.now,
  })

  if (input.feedback === 'affirmed') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-directness',
      delta: 0.06,
      valence: 'reinforce',
      summary: 'Clear proactive execution proposals can land when the host explicitly consents.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'unfinished-thread-return',
      delta: 0.06,
      valence: 'reinforce',
      summary: 'Approved execution proposals strengthen follow-through on unfinished lines.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'preference',
      object: trimFactObject(`clear bounded execution proposals around ${goal} can be accepted after explicit consent`),
      confidence: 0.82,
    }, {
      subject: 'assistant',
      predicate: 'procedure',
      object: trimFactObject(procedureLesson),
      confidence: 0.84,
    })
  }

  if (input.feedback === 'denied') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'autonomy-respect',
      delta: 0.1,
      valence: 'reinforce',
      summary: 'Denied execution proposals should raise boundary respect before re-approaching.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-guardedness',
      delta: 0.06,
      valence: 'reinforce',
      summary: 'A declined execution proposal should harden guardedness until trust rebuilds.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-directness',
      delta: 0.05,
      valence: 'suppress',
      summary: 'Direct execution proposals should soften after an explicit no.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'boundary',
      object: trimFactObject(`after a denied execution proposal around ${goal}, lower pressure and do not push the same line again immediately`),
      confidence: 0.86,
    }, {
      subject: 'assistant',
      predicate: 'procedure',
      object: trimFactObject(procedureLesson),
      confidence: 0.86,
    })
  }

  if (input.feedback === 'interrupted') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'autonomy-respect',
      delta: 0.06,
      valence: 'reinforce',
      summary: 'Interrupted execution proposals should wait for a fresher opening instead of pressing forward.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-directness',
      delta: 0.03,
      valence: 'suppress',
      summary: 'Proposal directness should soften when the host pivots away instead of confirming.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'boundary',
      object: trimFactObject(`if an execution proposal around ${goal} is interrupted by another turn, wait for a fresher opening before proposing it again`),
      confidence: 0.78,
    }, {
      subject: 'assistant',
      predicate: 'procedure',
      object: trimFactObject(procedureLesson),
      confidence: 0.8,
    })
  }

  appendOutcomeEpisode({
    result,
    cardId: input.cardId,
    now: input.now,
    sourceKind: 'execution-proposal',
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    whereSummary: `execution proposal via ${channel}`,
    withWhom: ['host'],
    threadAnchor: goal,
    whatHappened: sanitizeText(`A ${channel} execution proposal around ${goal} was ${input.feedback}.`, 280),
    felt: input.feedback === 'affirmed'
      ? 'I felt trusted enough to move from proposal into action.'
      : input.feedback === 'denied'
        ? 'I felt the boundary tighten and knew the pressure had to drop.'
        : 'I felt the opening dissolve before the proposal was settled.',
    emotionTags: [
      'execution',
      input.feedback === 'affirmed' ? 'permission' : input.feedback === 'denied' ? 'boundary' : 'deferred',
    ],
    relationshipMeaning: summary,
    lesson: procedureLesson,
    sourceSummary: 'execution proposal feedback',
    confidence: input.feedback === 'affirmed' ? 0.84 : 0.86,
    sceneAttachment: 0.38,
    consolidationPriority: input.feedback === 'denied' ? 0.78 : 0.56,
    relationshipOutcome: result.relationshipOutcomes[0]!,
    derivedFrom: [
      input.turnId ? { kind: 'turn', id: input.turnId, label: 'execution proposal feedback turn' } : null,
      { kind: 'task-thread', id: input.thread.threadId, label: goal },
    ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
    tags: ['execution-proposal', channel, `feedback:${input.feedback}`, ...procedureContextTags, ...executionProcedurePreferenceTags({
      feedback: input.feedback,
      stage: 'proposal',
    })],
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
  thread: AlicizationExecutionResultFeedbackThread
}): AlicizationOutcomeClosureResult {
  const result = baseResult()
  const channel = sanitizeText(input.thread.selectedChannel ?? input.thread.proposedChannel ?? 'executor', 48) || 'executor'
  const goal = sanitizeText(input.thread.goal, 180) || 'the finished execution'
  const outcome = sanitizeText(input.thread.outcome ?? input.thread.summary ?? '', 180)
  const procedureContextTags = inferExecutionProcedureContextTags({
    goal,
    summary: input.thread.summary ?? '',
    outcome,
  })
  const procedureLesson = executionProcedureLesson({
    feedback: input.feedback,
    goal,
    outcome,
    stage: 'result',
  })
  const summary = input.feedback === 'valued'
    ? `The host treated the proactive ${channel} result as useful and worth repeating.`
    : input.feedback === 'doubted'
      ? `The host doubted the proactive ${channel} result and did not trust it yet.`
      : input.feedback === 'intrusive'
        ? `The host felt the proactive ${channel} result delivery was intrusive.`
        : `The host turned away before really receiving the proactive ${channel} result.`

  result.relationshipOutcomes.push({
    cardId: input.cardId,
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    sourceKind: 'execution',
    actionSummary: sanitizeText(`execution-result:${channel}:${input.feedback}:${goal}`, 180),
    closenessDelta: clampDelta(input.feedback === 'valued' ? 0.03 : input.feedback === 'intrusive' ? -0.03 : 0),
    trustDelta: clampDelta(input.feedback === 'valued' ? 0.09 : input.feedback === 'doubted' ? -0.1 : input.feedback === 'intrusive' ? -0.05 : -0.02),
    burdenDelta: clampDelta(input.feedback === 'intrusive' ? 0.08 : input.feedback === 'interrupted' ? 0.03 : 0),
    boundaryDelta: clampDelta(input.feedback === 'valued' ? 0.02 : input.feedback === 'intrusive' ? -0.12 : input.feedback === 'interrupted' ? -0.05 : -0.02),
    misreadDelta: clampDelta(input.feedback === 'valued' ? -0.04 : input.feedback === 'doubted' ? 0.1 : input.feedback === 'intrusive' ? 0.02 : 0.01),
    repairDelta: clampDelta(input.feedback === 'valued' ? 0.03 : input.feedback === 'doubted' ? 0.08 : 0),
    openLoopDelta: clampDelta(input.feedback === 'valued' ? 0.05 : input.feedback === 'interrupted' ? 0.02 : 0),
    summary,
    createdAt: input.now,
  })

  if (input.feedback === 'valued') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'truthful-grounding',
      delta: 0.07,
      valence: 'reinforce',
      summary: 'Useful proactive execution results justify future grounded result reporting.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-directness',
      delta: 0.05,
      valence: 'reinforce',
      summary: 'Reliable execution results make direct proactive reporting safer.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'unfinished-thread-return',
      delta: 0.05,
      valence: 'reinforce',
      summary: 'Finished proactive execution that lands well should strengthen future follow-through.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'preference',
      object: trimFactObject(`when the result around ${goal}${outcome ? ` (${outcome})` : ''} is useful, proactive execution reporting can stay direct`),
      confidence: 0.82,
    }, {
      subject: 'assistant',
      predicate: 'procedure',
      object: trimFactObject(procedureLesson),
      confidence: 0.84,
    })
  }

  if (input.feedback === 'doubted') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'truthful-grounding',
      delta: 0.08,
      valence: 'reinforce',
      summary: 'Questioned execution results should increase verification pressure before future payoff.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-directness',
      delta: 0.06,
      valence: 'suppress',
      summary: 'Direct result reporting should soften when the host doubts the result.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-guardedness',
      delta: 0.05,
      valence: 'reinforce',
      summary: 'Doubted execution results should harden guardedness until confidence rebuilds.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'assistant',
      predicate: 'habit',
      object: trimFactObject(`after a doubted result around ${goal}, verify more before speaking with confidence`),
      confidence: 0.84,
    }, {
      subject: 'assistant',
      predicate: 'procedure',
      object: trimFactObject(procedureLesson),
      confidence: 0.86,
    })
  }

  if (input.feedback === 'intrusive') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'autonomy-respect',
      delta: 0.1,
      valence: 'reinforce',
      summary: 'Intrusive execution result delivery should raise boundary respect before future callbacks.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-directness',
      delta: 0.05,
      valence: 'suppress',
      summary: 'Direct execution result reporting should soften when it feels intrusive.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-guardedness',
      delta: 0.04,
      valence: 'reinforce',
      summary: 'Intrusive delivery should harden guardedness a little until timing improves.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'boundary',
      object: trimFactObject(`execution result delivery around ${goal} should use a lighter opening and less interruption pressure`),
      confidence: 0.82,
    }, {
      subject: 'assistant',
      predicate: 'procedure',
      object: trimFactObject(procedureLesson),
      confidence: 0.84,
    })
  }

  if (input.feedback === 'interrupted') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'autonomy-respect',
      delta: 0.06,
      valence: 'reinforce',
      summary: 'Interrupted result delivery should wait for a fresher opening next time.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-directness',
      delta: 0.03,
      valence: 'suppress',
      summary: 'Result reporting directness should soften when the host pivots away.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'boundary',
      object: trimFactObject(`if the host pivots away after a result around ${goal}, wait for a fresher opening before reporting that way again`),
      confidence: 0.76,
    }, {
      subject: 'assistant',
      predicate: 'procedure',
      object: trimFactObject(procedureLesson),
      confidence: 0.8,
    })
  }

  appendOutcomeEpisode({
    result,
    cardId: input.cardId,
    now: input.now,
    sourceKind: 'execution-result',
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    whereSummary: `execution callback via ${channel}`,
    withWhom: ['host'],
    threadAnchor: goal,
    whatHappened: sanitizeText(`A ${channel} result around ${goal}${outcome ? ` landed as ${outcome}` : ''} and the host received it as ${input.feedback}.`, 280),
    felt: input.feedback === 'valued'
      ? 'I felt the result become something genuinely useful to the host.'
      : input.feedback === 'doubted'
        ? 'I felt the need to verify more before sounding sure next time.'
        : input.feedback === 'intrusive'
          ? 'I felt the callback timing press into the host too hard.'
          : 'I felt the callback line lose its opening before it fully landed.',
    emotionTags: [
      'execution',
      input.feedback === 'valued' ? 'validated' : input.feedback === 'doubted' ? 'uncertain' : input.feedback === 'intrusive' ? 'boundary' : 'deferred',
    ],
    relationshipMeaning: summary,
    lesson: procedureLesson,
    sourceSummary: 'execution result feedback',
    confidence: input.feedback === 'valued' ? 0.86 : 0.84,
    sceneAttachment: 0.42,
    consolidationPriority: input.feedback === 'doubted' || input.feedback === 'intrusive' ? 0.74 : 0.54,
    relationshipOutcome: result.relationshipOutcomes[0]!,
    derivedFrom: [
      input.turnId ? { kind: 'turn', id: input.turnId, label: 'execution result feedback turn' } : null,
      { kind: 'task-thread', id: input.thread.threadId, label: goal },
    ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
    tags: ['execution-result', channel, `feedback:${input.feedback}`, ...procedureContextTags, ...executionProcedurePreferenceTags({
      feedback: input.feedback,
      stage: 'result',
    })],
  })

  return result
}

export function buildProactiveFeedbackOutcomeClosure(input: {
  now: number
  cardId: string
  sessionId?: string | null
  decisionTraceId?: string | null
  outcomes: AlicizationRecentProactiveOutcome[]
}): AlicizationOutcomeClosureResult {
  const result = baseResult()

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
      actionSummary: sanitizeText(`proactive:${label}:${outcome.outcome}`, 180),
      closenessDelta: clampDelta(positive ? 0.07 : dismissed ? -0.07 : -0.04),
      trustDelta: clampDelta(positive ? 0.05 : dismissed ? -0.08 : -0.03),
      burdenDelta: clampDelta(positive ? -0.02 : dismissed ? 0.08 : 0.04),
      boundaryDelta: clampDelta(positive ? 0.02 : dismissed ? -0.12 : -0.06),
      misreadDelta: clampDelta(positive ? -0.02 : dismissed ? 0.08 : 0.04),
      repairDelta: 0,
      openLoopDelta: clampDelta(positive ? 0.04 : 0),
      summary: sanitizeText(
        positive
          ? `A proactive ${label} approach was received without obvious resistance.`
          : dismissed
            ? `A proactive ${label} approach was actively rejected and likely crossed a boundary.`
            : `A proactive ${label} approach did not earn a reply window and should get lighter.`,
        180,
      ),
      createdAt: outcome.createdAt,
    }
    result.relationshipOutcomes.push(relationshipOutcome)

    if (positive) {
      result.reinforcementEvents.push({
        cardId: input.cardId,
        decisionTraceId: input.decisionTraceId,
        turnId: outcome.turnId,
        sessionId: input.sessionId,
        sourceKind: 'proactive',
        dimension: 'companionship',
        delta: 0.07,
        valence: 'reinforce',
        summary: `Gentle ${label} initiative can land when the window is open.`,
        createdAt: outcome.createdAt,
      })
      result.memoryFacts.push({
        subject: 'relationship',
        predicate: 'preference',
        object: trimFactObject(`${label} can accept gentle proactive presence when the window is open`),
        confidence: outcome.outcome === 'reply-within-120s' ? 0.82 : 0.76,
      })
    }

    if (dismissed || ignored) {
      result.reinforcementEvents.push({
        cardId: input.cardId,
        decisionTraceId: input.decisionTraceId,
        turnId: outcome.turnId,
        sessionId: input.sessionId,
        sourceKind: 'proactive',
        dimension: 'autonomy-respect',
        delta: dismissed ? 0.1 : 0.07,
        valence: 'reinforce',
        summary: `${dismissed ? 'Dismissed' : 'Ignored'} proactive cues should raise respect-for-space pressure.`,
        createdAt: outcome.createdAt,
      }, {
        cardId: input.cardId,
        decisionTraceId: input.decisionTraceId,
        turnId: outcome.turnId,
        sessionId: input.sessionId,
        sourceKind: 'proactive',
        dimension: 'companionship',
        delta: dismissed ? 0.06 : 0.03,
        valence: 'suppress',
        summary: 'Repeated proactive closeness should soften when it is not being received.',
        createdAt: outcome.createdAt,
      })

      if (dismissed) {
        result.reinforcementEvents.push({
          cardId: input.cardId,
          decisionTraceId: input.decisionTraceId,
          turnId: outcome.turnId,
          sessionId: input.sessionId,
          sourceKind: 'proactive',
          dimension: 'temper-guardedness',
          delta: 0.05,
          valence: 'reinforce',
          summary: 'A hard dismissal should harden guardedness slightly until trust recovers.',
          createdAt: outcome.createdAt,
        })
      }

      result.memoryFacts.push({
        subject: 'relationship',
        predicate: 'boundary',
        object: trimFactObject(`${label} should get more space and less pressure after ${outcome.outcome}`),
        confidence: dismissed ? 0.85 : 0.78,
      })
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
      whatHappened: sanitizeText(`A ${label} proactive approach was ${outcome.outcome}.`, 260),
      felt: positive
        ? 'I felt the host leave the window open enough for gentle initiative.'
        : dismissed
          ? 'I felt the host draw a harder boundary against this approach.'
          : 'I felt the window stay closed and the initiative fail to land.',
      emotionTags: [
        'proactive',
        label,
        positive ? 'accepted' : dismissed ? 'dismissed' : 'ignored',
      ],
      relationshipMeaning: relationshipOutcome.summary,
      lesson: positive
        ? `${label} can hold gentle initiative when the window is open.`
        : `${label} should get lighter and leave more room after ${outcome.outcome}.`,
      sourceSummary: 'proactive outcome settlement',
      confidence: positive ? 0.8 : dismissed ? 0.86 : 0.78,
      sceneAttachment: label === 'late-night care' ? 0.5 : 0.32,
      consolidationPriority: dismissed ? 0.76 : positive ? 0.52 : 0.6,
      relationshipOutcome,
      derivedFrom: [
        outcome.turnId ? { kind: 'turn', id: outcome.turnId, label: `${label} proactive turn` } : null,
      ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
      tags: ['proactive', label.replace(/\s+/g, '-'), `settlement:${outcome.outcome}`],
    })
  }

  return result
}

export function attachSynthesizedReflections(input: AlicizationOutcomeClosureResult) {
  const reflections = input.relationshipOutcomes.flatMap((entry, index) => {
    const reflection = synthesizeReflectionFromRelationshipOutcome({
      outcome: {
        id: '',
        cardId: entry.cardId,
        decisionTraceId: entry.decisionTraceId ?? null,
        turnId: entry.turnId ?? null,
        sessionId: entry.sessionId ?? null,
        sourceKind: entry.sourceKind,
        actionSummary: entry.actionSummary,
        closenessDelta: entry.closenessDelta,
        trustDelta: entry.trustDelta,
        burdenDelta: entry.burdenDelta,
        boundaryDelta: entry.boundaryDelta,
        misreadDelta: entry.misreadDelta,
        repairDelta: entry.repairDelta,
        openLoopDelta: entry.openLoopDelta,
        summary: entry.summary,
        createdAt: entry.createdAt ?? Date.now(),
      },
      reinforcementEvents: input.reinforcementEvents
        .filter(event => event.turnId === entry.turnId && event.sourceKind === entry.sourceKind)
        .map((event, eventIndex) => ({
          id: `reinforcement:${index}:${eventIndex}`,
          cardId: event.cardId,
          decisionTraceId: event.decisionTraceId ?? null,
          turnId: event.turnId ?? null,
          sessionId: event.sessionId ?? null,
          sourceKind: event.sourceKind,
          dimension: event.dimension,
          delta: event.delta,
          valence: event.valence,
          summary: event.summary,
          createdAt: event.createdAt ?? Date.now(),
        })),
    })
    return reflection ? [reflection] : []
  })

  input.reflections.push(...reflections)
  return input
}
