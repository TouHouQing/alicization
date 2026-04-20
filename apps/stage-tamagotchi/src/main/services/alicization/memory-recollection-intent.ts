import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationDialogueTurnEncounterSnapshot,
  AlicizationDialogueWorldThreadSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReplyDeliberationSnapshot,
} from '../../../shared/eventa'

import { isRetrospectiveRecallQuery } from './runtime-organic-recall'

export interface AlicizationMemoryRecollectionIntentSnapshot {
  mode: 'none' | 'conversation-history' | 'autobiographical-history' | 'relationship-history' | 'execution-procedure' | 'experience-pattern'
  temporalFocus: 'recent' | 'recent-or-mid' | 'cross-session' | 'experience-matched' | 'distant'
  searchEpisodes: boolean
  searchConversations: boolean
  searchProceduralExperience: boolean
  queryHints: string[]
  rationale: string
  confidence: number
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value)
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

const proceduralCuePattern = /像之前那样|按之前那样|照之前的做法|以前怎么做|之前怎么做|继续做那个|同样的方法|same way|like before|how did you do it|how we did it|do it again|same approach|reuse the way/iu
const executionishPattern = /执行|命令|脚本|修|补丁|改|debug|fix|patch|command|cli|codex|claude code|runtime|workflow|步骤|怎么做/u
const relationshipHistoryCuePattern = /你之前怎么想|你以前怎么看|我们之前是什么状态|上次你怎么回应我|你以前也这样吗|how did you feel before|how were we before/i
const autobiographicalCuePattern = /你以前|你之前|你还记得|你做过|你经历过|before this|you used to|you remember/i

function pickProceduralWeight(input: {
  userText: string
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
}) {
  const userText = sanitizeText(input.userText, 320)
  const executionishText = [
    userText,
    input.dialogueWorldThread?.activeThread,
    input.conversationState?.activeProject,
    ...(input.dialogueWorldThread?.recallKeys ?? []),
    ...(input.conversationState?.memoryQueryHints ?? []),
  ].filter(Boolean).join(' ')
  let score = 0
  if (input.conversationState?.memoryMode === 'task-thread')
    score += 0.34
  if (input.dialogueWorldThread?.memoryMode === 'task-thread')
    score += 0.22
  if (proceduralCuePattern.test(userText))
    score += 0.26
  if (executionishPattern.test(executionishText))
    score += 0.18
  if (input.answerCompiler?.answerSubject === 'task-knot')
    score += 0.14
  return clamp01(score)
}

function pickConversationHistoryWeight(input: {
  userText: string
  dialogueEncounter?: AlicizationDialogueTurnEncounterSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
}) {
  let score = 0
  if (isRetrospectiveRecallQuery(input.userText))
    score += 0.38
  if (input.dialogueEncounter?.dialogueFirst)
    score += 0.08
  if (input.conversationState?.memoryMode === 'dialogue-carry')
    score += 0.14
  return clamp01(score)
}

function pickRelationshipHistoryWeight(input: {
  userText: string
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
}) {
  let score = 0
  if (relationshipHistoryCuePattern.test(input.userText))
    score += 0.28
  if (input.answerCompiler?.answerSubject === 'relationship')
    score += 0.28
  if (input.replyDeliberation?.selectedMotive === 'attune' || input.replyDeliberation?.selectedMotive === 'care')
    score += 0.12
  if (input.privateThought?.stance === 'care' || input.privateThought?.stance === 'accompany')
    score += 0.08
  return clamp01(score)
}

function pickAutobiographicalWeight(input: {
  userText: string
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
}) {
  let score = 0
  if (autobiographicalCuePattern.test(input.userText))
    score += 0.22
  if (input.answerCompiler?.answerSubject === 'alicization-self')
    score += 0.32
  if (input.privateThought?.emotionalTension === 'late-night-drain' || input.privateThought?.emotionalTension === 'tense-debug')
    score += 0.08
  if (input.longHorizonMemory?.rememberedPlanSummary || input.longHorizonMemory?.dominantCueSummary)
    score += 0.06
  return clamp01(score)
}

export function buildMemoryRecollectionIntent(input: {
  userText?: string | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounterSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
}): AlicizationMemoryRecollectionIntentSnapshot | null {
  const userText = sanitizeText(input.userText, 320)
  const conversationHistoryWeight = pickConversationHistoryWeight({
    userText,
    dialogueEncounter: input.dialogueEncounter ?? null,
    conversationState: input.conversationState ?? null,
  })
  const relationshipWeight = pickRelationshipHistoryWeight({
    userText,
    answerCompiler: input.answerCompiler ?? null,
    replyDeliberation: input.replyDeliberation ?? null,
    privateThought: input.privateThought ?? null,
  })
  const autobiographicalWeight = pickAutobiographicalWeight({
    userText,
    answerCompiler: input.answerCompiler ?? null,
    privateThought: input.privateThought ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
  })
  const proceduralWeight = pickProceduralWeight({
    userText,
    dialogueWorldThread: input.dialogueWorldThread ?? null,
    conversationState: input.conversationState ?? null,
    answerCompiler: input.answerCompiler ?? null,
  })

  if (Math.max(conversationHistoryWeight, relationshipWeight, autobiographicalWeight, proceduralWeight) < 0.2)
    return null

  if (proceduralWeight >= Math.max(conversationHistoryWeight, relationshipWeight, autobiographicalWeight)) {
    return {
      mode: proceduralWeight >= 0.54 ? 'execution-procedure' : 'experience-pattern',
      temporalFocus: 'experience-matched',
      searchEpisodes: true,
      searchConversations: false,
      searchProceduralExperience: true,
      queryHints: uniqueList([
        input.conversationState?.activeProject,
        input.dialogueWorldThread?.activeThread,
        input.goalStack?.alicizationGoals[0]?.label,
        input.motiveEngine?.backgroundAgendas[0]?.summary,
        ...(input.dialogueWorldThread?.recallKeys ?? []),
      ], 8),
      rationale: 'The current turn feels like reusing a previously lived way of doing a task, not just recalling a recent sentence.',
      confidence: proceduralWeight,
    }
  }

  if (relationshipWeight >= Math.max(conversationHistoryWeight, autobiographicalWeight)) {
    return {
      mode: 'relationship-history',
      temporalFocus: 'cross-session',
      searchEpisodes: true,
      searchConversations: true,
      searchProceduralExperience: false,
      queryHints: uniqueList([
        input.dialogueWorldThread?.activeThread,
        input.conversationState?.jointThread,
        input.conversationState?.hostMove,
        ...(input.conversationState?.memoryQueryHints ?? []),
      ], 8),
      rationale: 'The turn is asking about the bond or how Alicization has responded before, so relationship history should surface.',
      confidence: relationshipWeight,
    }
  }

  if (autobiographicalWeight >= conversationHistoryWeight) {
    return {
      mode: 'autobiographical-history',
      temporalFocus: 'cross-session',
      searchEpisodes: true,
      searchConversations: true,
      searchProceduralExperience: false,
      queryHints: uniqueList([
        input.dialogueWorldThread?.activeThread,
        input.longHorizonMemory?.dominantCueSummary,
        input.longHorizonMemory?.rememberedPlanSummary,
        ...(input.dialogueWorldThread?.recallKeys ?? []),
      ], 8),
      rationale: 'The turn is asking about Alicization herself or her lived continuity, so autobiographical memory should answer it.',
      confidence: autobiographicalWeight,
    }
  }

  return {
    mode: 'conversation-history',
    temporalFocus: 'cross-session',
    searchEpisodes: true,
    searchConversations: true,
    searchProceduralExperience: false,
    queryHints: uniqueList([
      input.conversationState?.jointThread,
      input.conversationState?.hostMove,
      ...(input.dialogueWorldThread?.recallKeys ?? []),
      ...(input.conversationState?.memoryQueryHints ?? []),
    ], 8),
    rationale: 'The turn is trying to remember what was talked about before, so long-range conversation history should surface.',
    confidence: conversationHistoryWeight,
  }
}
