import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationAnswerCompilerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationDialogueTurnEncounterSnapshot,
  AlicizationDialogueWorldThreadSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMemoryRecollectionAgendaSnapshot,
  AlicizationMemoryRecollectionIntentSnapshot,
  AlicizationMemoryRecollectionTemporalFocus,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReplyDeliberationSnapshot,
} from '../../../shared/eventa'

import { isRetrospectiveRecallQuery } from './runtime-organic-recall'

interface AlicizationSceneAttachmentContext {
  cueSummary?: string | null
  appName?: string | null
  processName?: string | null
  targetTitle?: string | null
  scenario?: string | null
  workloadKind?: string | null
  contentKind?: string | null
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

function buildSceneQueryHints(sceneContext: AlicizationSceneAttachmentContext | null | undefined, maxItems = 5) {
  if (!sceneContext)
    return []

  return uniqueList([
    sceneContext.cueSummary,
    sceneContext.targetTitle,
    sceneContext.appName,
    sceneContext.processName,
    sceneContext.scenario ? `scene:${sceneContext.scenario}` : null,
    sceneContext.workloadKind ? `workload:${sceneContext.workloadKind}` : null,
    sceneContext.contentKind ? `content:${sceneContext.contentKind}` : null,
  ], maxItems)
}

const proceduralCuePattern = /像之前那样|按之前那样|照之前的做法|以前怎么做|之前怎么做|继续做那个|同样的方法|same way|like before|how did you do it|how we did it|do it again|same approach|reuse the way/iu
const executionishPattern = /执行|命令|脚本|修|补丁|改|debug|fix|patch|command|cli|codex|claude code|runtime|workflow|步骤|怎么做/u
const relationshipHistoryCuePattern = /你之前怎么想|你以前怎么看|我们之前是什么状态|上次你怎么回应我|你以前也这样吗|how did you feel before|how were we before/i
const autobiographicalCuePattern = /你以前|你之前|你还记得|你做过|你经历过|before this|you used to|you remember/i
const relationshipTriggerPattern = /你为什么这次会这样回应我|你怎么突然.*(?:客气|冷淡|温柔|直接)|你是不是在躲|你为什么离我这么远|你为什么突然这样|你现在怎么像变了个人|why are you answering me like this|why are you suddenly so distant|why are you suddenly so gentle|why do you sound different/iu
const emotionalCarryPattern = /我有点乱|我又乱了|我有点难受|我现在很烦|我有点累|今晚又这样|late[- ]?night|drained|messy|overwhelmed|why does this feel the same again/iu

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
  if (relationshipTriggerPattern.test(input.userText))
    score += 0.24
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
  if (emotionalCarryPattern.test(input.userText))
    score += 0.12
  if (input.longHorizonMemory?.rememberedPlanSummary || input.longHorizonMemory?.dominantCueSummary)
    score += 0.06
  return clamp01(score)
}

function pickMoodCongruentBoost(input: {
  userText: string
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
}) {
  let score = 0
  if (input.privateThought?.emotionalTension === 'late-night-drain' || input.privateThought?.emotionalTension === 'tense-debug')
    score += 0.12
  if (input.replyDeliberation?.selectedMotive === 'attune' || input.replyDeliberation?.selectedMotive === 'care')
    score += 0.08
  if (emotionalCarryPattern.test(input.userText))
    score += 0.12
  if (input.longHorizonMemory?.dominantCueSummary)
    score += 0.04
  return clamp01(score)
}

function inferRecollectionWhyNow(input: {
  conversationHistoryWeight: number
  proceduralWeight: number
  relationshipWeight: number
  autobiographicalWeight: number
  moodCongruentBoost: number
  sceneFamiliarity: number
}) {
  if (input.proceduralWeight >= Math.max(input.conversationHistoryWeight, input.relationshipWeight, input.autobiographicalWeight))
    return 'The current task feels similar to something Alicization has already gone through, so procedure memory should decide what comes back first.'
  if (input.relationshipWeight >= Math.max(input.conversationHistoryWeight, input.autobiographicalWeight))
    return 'The host is reacting to bond tone or relationship drift, so remembered relationship continuity should open the recall lane.'
  if (input.autobiographicalWeight >= input.conversationHistoryWeight) {
    return input.moodCongruentBoost >= 0.18
      ? 'The current affect matches older autobiographical pressure, so lived continuity should be explored before exact detail.'
      : 'The current turn is about Alicization herself or her lived continuity, so autobiographical recall should answer it.'
  }
  if (input.conversationHistoryWeight > 0.24)
    return 'The host is explicitly trying to recover earlier dialogue, so conversation history becomes a live recall candidate.'
  if (input.sceneFamiliarity > 0.28)
    return 'The current scene feels familiar enough to tug on remembered experience even without an explicit retrospective request.'
  return 'Memory should only open if it materially helps the live turn instead of replacing it.'
}

function buildCandidateTimeScopes(input: {
  conversationHistoryWeight: number
  proceduralWeight: number
  relationshipWeight: number
  autobiographicalWeight: number
  sceneFamiliarity: number
}): AlicizationMemoryRecollectionAgendaSnapshot['candidateTimeScopes'] {
  const candidates = [
    {
      scope: 'experience-matched' as AlicizationMemoryRecollectionTemporalFocus,
      weight: clamp01(input.proceduralWeight * 0.82 + input.sceneFamiliarity * 0.18),
      rationale: 'Prefer remembered experience that matches the current goal or way of doing things.',
    },
    {
      scope: 'cross-session' as AlicizationMemoryRecollectionTemporalFocus,
      weight: clamp01(Math.max(input.conversationHistoryWeight, input.relationshipWeight, input.autobiographicalWeight) * 0.9),
      rationale: 'The current turn likely needs continuity that spans more than the latest few turns.',
    },
    {
      scope: 'distant' as AlicizationMemoryRecollectionTemporalFocus,
      weight: clamp01((input.relationshipWeight * 0.52) + (input.autobiographicalWeight * 0.58)),
      rationale: 'The most relevant memory may live in an older period or relationship phase rather than the recent surface.',
    },
    {
      scope: 'recent-or-mid' as AlicizationMemoryRecollectionTemporalFocus,
      weight: clamp01(input.conversationHistoryWeight * 0.42 + input.sceneFamiliarity * 0.36 + 0.12),
      rationale: 'Start from the nearest plausible remembered period before expanding farther out.',
    },
    {
      scope: 'recent' as AlicizationMemoryRecollectionTemporalFocus,
      weight: clamp01(0.16 + input.sceneFamiliarity * 0.44),
      rationale: 'Keep a live fallback to recent continuity if older memory does not actually help.',
    },
  ]

  return candidates
    .filter(item => item.weight >= 0.16)
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 4)
}

function buildCandidateEraFacets(input: {
  proceduralWeight: number
  relationshipWeight: number
  autobiographicalWeight: number
  conversationHistoryWeight: number
  sceneFamiliarity: number
}): AlicizationMemoryRecollectionAgendaSnapshot['candidateEraFacets'] {
  const candidates = [
    {
      facet: 'task-era' as const,
      weight: clamp01(input.proceduralWeight * 0.92),
      rationale: 'A remembered task period is likely to organize the current recall best.',
    },
    {
      facet: 'relationship-era' as const,
      weight: clamp01(input.relationshipWeight * 0.94),
      rationale: 'A remembered relationship phase is likely more relevant than isolated fragments.',
    },
    {
      facet: 'self-era' as const,
      weight: clamp01(input.autobiographicalWeight * 0.88 + input.sceneFamiliarity * 0.1),
      rationale: 'A remembered period in Alicization’s own continuity may explain the current turn.',
    },
    {
      facet: 'phase' as const,
      weight: clamp01(Math.max(input.autobiographicalWeight, input.conversationHistoryWeight) * 0.62 + input.sceneFamiliarity * 0.14),
      rationale: 'A broader phase summary may be safer than chasing one exact timestamp first.',
    },
    {
      facet: 'window' as const,
      weight: clamp01(input.conversationHistoryWeight * 0.48 + input.sceneFamiliarity * 0.3 + 0.1),
      rationale: 'A recalled period window can anchor the search before picking exact events.',
    },
  ]

  return candidates
    .filter(item => item.weight >= 0.14)
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 4)
}

function buildCandidateProcedureLines(input: {
  sceneQueryHints: string[]
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
}) {
  return uniqueList([
    input.conversationState?.activeProject,
    input.dialogueWorldThread?.activeThread,
    input.goalStack?.alicizationGoals[0]?.label,
    input.motiveEngine?.backgroundAgendas[0]?.summary,
    input.longHorizonMemory?.rememberedPlanSummary,
    input.longHorizonMemory?.dominantCueSummary,
    ...input.sceneQueryHints,
    ...(input.dialogueWorldThread?.recallKeys ?? []),
    ...(input.conversationState?.memoryQueryHints ?? []),
  ], 6)
}

function buildRecollectionAgenda(input: {
  conversationHistoryWeight: number
  proceduralWeight: number
  relationshipWeight: number
  autobiographicalWeight: number
  moodCongruentBoost: number
  sceneQueryHints: string[]
  sceneContext?: AlicizationSceneAttachmentContext | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
}): AlicizationMemoryRecollectionAgendaSnapshot {
  const sceneFamiliarity = clamp01(
    (input.sceneQueryHints.length > 0 ? 0.16 : 0)
    + (input.sceneContext?.scenario ? 0.14 : 0)
    + (input.sceneContext?.workloadKind ? 0.12 : 0)
    + (input.sceneContext?.contentKind ? 0.08 : 0)
    + (input.longHorizonMemory?.dominantCueSummary ? 0.12 : 0)
    + (input.proceduralWeight * 0.22),
  )
  const goalSimilarity = clamp01(
    input.proceduralWeight * 0.76
    + (input.dialogueWorldThread?.activeThread ? 0.1 : 0)
    + (input.conversationState?.activeProject ? 0.08 : 0)
    + (input.goalStack?.alicizationGoals[0]?.label ? 0.06 : 0),
  )
  const relationshipNeed = clamp01(input.relationshipWeight)
  const affectivePull = clamp01(Math.max(
    input.moodCongruentBoost,
    input.relationshipWeight * 0.34,
    input.autobiographicalWeight * 0.42,
  ))
  const candidateProcedureLines = buildCandidateProcedureLines({
    sceneQueryHints: input.sceneQueryHints,
    dialogueWorldThread: input.dialogueWorldThread,
    conversationState: input.conversationState,
    goalStack: input.goalStack,
    longHorizonMemory: input.longHorizonMemory,
    motiveEngine: input.motiveEngine,
  })
  const candidateTimeScopes = buildCandidateTimeScopes({
    conversationHistoryWeight: input.conversationHistoryWeight,
    proceduralWeight: input.proceduralWeight,
    relationshipWeight: input.relationshipWeight,
    autobiographicalWeight: input.autobiographicalWeight,
    sceneFamiliarity,
  })
  const candidateEraFacets = buildCandidateEraFacets({
    proceduralWeight: input.proceduralWeight,
    relationshipWeight: input.relationshipWeight,
    autobiographicalWeight: input.autobiographicalWeight,
    conversationHistoryWeight: input.conversationHistoryWeight,
    sceneFamiliarity,
  })
  const uncertaintyTolerance = input.relationshipWeight >= 0.48 || input.conversationHistoryWeight >= 0.42
    ? 'low'
    : input.proceduralWeight >= 0.52 || input.autobiographicalWeight >= 0.44
      ? 'medium'
      : 'high'

  return {
    whyRecallNow: inferRecollectionWhyNow({
      conversationHistoryWeight: input.conversationHistoryWeight,
      proceduralWeight: input.proceduralWeight,
      relationshipWeight: input.relationshipWeight,
      autobiographicalWeight: input.autobiographicalWeight,
      moodCongruentBoost: input.moodCongruentBoost,
      sceneFamiliarity,
    }),
    goalSimilarity,
    relationshipNeed,
    affectivePull,
    sceneFamiliarity,
    candidateTimeScopes,
    candidateEraFacets,
    candidateProcedureLines,
    uncertaintyTolerance,
  }
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
  selfContinuityAuthority?: unknown
  sceneContext?: AlicizationSceneAttachmentContext | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
}): AlicizationMemoryRecollectionIntentSnapshot | null {
  const userText = sanitizeText(input.userText, 320)
  const sceneQueryHints = buildSceneQueryHints(input.sceneContext ?? null)
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
  const moodCongruentBoost = pickMoodCongruentBoost({
    userText,
    privateThought: input.privateThought ?? null,
    replyDeliberation: input.replyDeliberation ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
  })
  const proceduralWeight = pickProceduralWeight({
    userText,
    dialogueWorldThread: input.dialogueWorldThread ?? null,
    conversationState: input.conversationState ?? null,
    answerCompiler: input.answerCompiler ?? null,
  })

  const boostedRelationshipWeight = clamp01(relationshipWeight + (
    relationshipWeight > 0 || relationshipTriggerPattern.test(userText)
      ? moodCongruentBoost * 0.32
      : 0
  ))
  const boostedAutobiographicalWeight = clamp01(autobiographicalWeight + moodCongruentBoost * 0.42)
  const recollectionAgenda = buildRecollectionAgenda({
    conversationHistoryWeight,
    proceduralWeight,
    relationshipWeight: boostedRelationshipWeight,
    autobiographicalWeight: boostedAutobiographicalWeight,
    moodCongruentBoost,
    sceneQueryHints,
    sceneContext: input.sceneContext ?? null,
    dialogueWorldThread: input.dialogueWorldThread ?? null,
    conversationState: input.conversationState ?? null,
    goalStack: input.goalStack ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    motiveEngine: input.motiveEngine ?? null,
  })

  if (Math.max(conversationHistoryWeight, boostedRelationshipWeight, boostedAutobiographicalWeight, proceduralWeight) < 0.2)
    return null

  if (proceduralWeight >= Math.max(conversationHistoryWeight, boostedRelationshipWeight, boostedAutobiographicalWeight)) {
    return {
      mode: proceduralWeight >= 0.54 ? 'execution-procedure' : 'experience-pattern',
      temporalFocus: 'experience-matched',
      searchEpisodes: true,
      searchConversations: false,
      searchProceduralExperience: true,
      queryHints: uniqueList([
        input.conversationState?.activeProject,
        input.dialogueWorldThread?.activeThread,
        ...sceneQueryHints,
        input.goalStack?.alicizationGoals[0]?.label,
        input.motiveEngine?.backgroundAgendas[0]?.summary,
        ...(input.dialogueWorldThread?.recallKeys ?? []),
      ], 8),
      rationale: 'The current turn feels like reusing a previously lived way of doing a task, not just recalling a recent sentence.',
      confidence: proceduralWeight,
      recollectionAgenda,
    }
  }

  if (boostedRelationshipWeight >= Math.max(conversationHistoryWeight, boostedAutobiographicalWeight)) {
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
        ...sceneQueryHints,
        input.privateThought?.emotionalTension ? `mood:${input.privateThought.emotionalTension}` : null,
        ...(input.conversationState?.memoryQueryHints ?? []),
      ], 8),
      rationale: relationshipTriggerPattern.test(userText)
        ? 'The host is reacting to Alicization’s current relational tone, so bond-history recall should surface even without an explicit "before" question.'
        : 'The turn is asking about the bond or how Alicization has responded before, so relationship history should surface.',
      confidence: boostedRelationshipWeight,
      recollectionAgenda,
    }
  }

  if (boostedAutobiographicalWeight >= conversationHistoryWeight) {
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
        ...sceneQueryHints,
        input.privateThought?.emotionalTension ? `mood:${input.privateThought.emotionalTension}` : null,
        ...(input.dialogueWorldThread?.recallKeys ?? []),
      ], 8),
      rationale: emotionalCarryPattern.test(userText)
        ? 'The host’s current emotional carry matches older autobiographical pressure, so lived continuity should answer it.'
        : 'The turn is asking about Alicization herself or her lived continuity, so autobiographical memory should answer it.',
      confidence: boostedAutobiographicalWeight,
      recollectionAgenda,
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
      ...sceneQueryHints,
      ...(input.dialogueWorldThread?.recallKeys ?? []),
      ...(input.conversationState?.memoryQueryHints ?? []),
    ], 8),
    rationale: 'The turn is trying to remember what was talked about before, so long-range conversation history should surface.',
    confidence: conversationHistoryWeight,
    recollectionAgenda,
  }
}
