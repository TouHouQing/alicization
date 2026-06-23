import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationAnswerCompilerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationDialogueTurnEncounterSnapshot,
  AlicizationDialogueWorldThreadSnapshot,
  AlicizationEmotionalKernelSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMemoryRecollectionAgendaSnapshot,
  AlicizationMemoryRecollectionIntentSnapshot,
  AlicizationMemoryRecollectionTemporalFocus,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReplyDeliberationSnapshot,
} from '../../../shared/eventa'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'

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

function tokenizeSceneResonanceCues(raw: unknown) {
  const normalized = sanitizeText(raw, 220).toLowerCase()
  if (!normalized)
    return []

  const asciiTokens = normalized
    .split(/[^a-z0-9]+/u)
    .map(token => token.trim())
    .filter(token => token.length >= 4)

  const namedPhraseMatches = normalized.match(
    /runtime seam|callback line|callback seam|bond line|same line|same thread|thread[- ]faithful|leave room|repair first|measured[- ]return/gu,
  ) ?? []

  const cjkPhraseMatches = normalized.match(
    /同一条线|同条线|这条线|关系线|回调线|留白|空间|修复优先|先修复|慢一点|温和|贴太近/gu,
  ) ?? []

  return uniqueList([
    ...namedPhraseMatches,
    ...cjkPhraseMatches,
    ...asciiTokens,
  ], 12)
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

function buildSelfAuthorityQueryHints(selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null, maxItems = 4) {
  if (!selfContinuityAuthority)
    return []

  return uniqueList([
    selfContinuityAuthority.closenessPosture ? `closeness:${selfContinuityAuthority.closenessPosture}` : null,
    selfContinuityAuthority.relationshipLine,
    selfContinuityAuthority.authoritySummary,
    selfContinuityAuthority.selfLine,
    selfContinuityAuthority.inwardLine,
    selfContinuityAuthority.habitLine,
  ], maxItems)
}

function selfAuthoritySignalsMeasuredRelationshipContinuity(selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null) {
  if (!selfContinuityAuthority)
    return false

  const closenessPosture = sanitizeText(selfContinuityAuthority.closenessPosture, 80).toLowerCase()
  const continuityText = sanitizeText([
    selfContinuityAuthority.relationshipLine,
    selfContinuityAuthority.authoritySummary,
    selfContinuityAuthority.habitLine,
    selfContinuityAuthority.inwardLine,
  ].filter(Boolean).join(' '), 320).toLowerCase()

  return /measured|space|restrain|repair|room|bounded|lower-pressure|same line|same thread|thread-faithful|留白|空间|修复|同一条线|生命线|慢一点/u.test(closenessPosture)
    || /measured-return|repair before closeness|repair first|leave room|lower-pressure|same line|same thread|thread-faithful|bounded|留白|空间|修复优先|先修复|同一条线|生命线|慢一点|别立刻把温度放大|温度放大/u.test(continuityText)
}

function buildAffectiveResidueQueryHints(affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null, maxItems = 5) {
  if (!affectiveResidue)
    return []

  return uniqueList([
    affectiveResidue.dominantResidueKind ? `affect:${affectiveResidue.dominantResidueKind}` : null,
    affectiveResidue.relationshipCadence?.cadenceMode ? `cadence:${affectiveResidue.relationshipCadence.cadenceMode}` : null,
    affectiveResidue.relationshipCadence?.distancePosture ? `distance:${affectiveResidue.relationshipCadence.distancePosture}` : null,
    affectiveResidue.summary,
    affectiveResidue.relationshipCadence?.summary,
    affectiveResidue.residues?.[0]?.summary,
  ], maxItems)
}

function hasStrongAffectiveResidueCarry(affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null) {
  if (!affectiveResidue)
    return false

  return (affectiveResidue.dominantResidueKind === 'rest-protective'
    || affectiveResidue.dominantResidueKind === 'afterglow'
    || affectiveResidue.dominantResidueKind === 'repair')
  && (
    (affectiveResidue.relationshipCadence?.afterglowCarry ?? 0) >= 0.18
    || (affectiveResidue.relationshipCadence?.fatigueGuard ?? 0) >= 0.42
    || affectiveResidue.relationshipCadence?.shouldProtectRest === true
    || affectiveResidue.relationshipCadence?.shouldDelayWarmth === true
  )
}

const proceduralCuePattern = /像之前那样|按之前那样|照之前的做法|以前怎么做|之前怎么做|继续做那个|同样的方法|same way|like before|how did you do it|how we did it|do it again|same approach|reuse the way/iu
const executionishPattern = /执行|命令|脚本|修|补丁|改|debug|fix|patch|command|cli|codex|claude code|runtime|workflow|步骤|怎么做/u
const relationshipHistoryCuePattern = /你之前怎么想|你以前怎么看|我们之前是什么状态|上次你怎么回应我|你以前也这样吗|how did you feel before|how were we before/i
const autobiographicalCuePattern = /你以前|你之前|你还记得|你做过|你经历过|before this|you used to|you remember/i
const relationshipTriggerPattern = /你为什么这次会这样回应我|你怎么突然.*(?:客气|冷淡|温柔|直接)|你是不是在躲|你为什么离我这么远|你为什么突然这样|你现在怎么像变了个人|why are you answering me like this|why are you suddenly so distant|why are you suddenly so gentle|why do you sound different/iu
const emotionalCarryPattern = /我有点乱|我又乱了|我有点难受|我现在很烦|我有点累|今晚又这样|late[- ]?night|drained|messy|overwhelmed|why does this feel the same again/iu
const rememberedBoundaryPattern = /remembered boundary|boundary|space|room|focus|focused work|别贴太近|先别靠太近|空间|边界|留白|不要打扰/iu
const rememberedPreferencePattern = /remembered preference|grounded repair|repair first|先稳住|先确认|先修复|温和|轻一点/iu
const rememberedPlanPattern = /remembered open loop|return to|before branching|unfinished|follow[- ]?up|继续|别忘|回来|open loop/iu

function buildLongHorizonRecallBias(input: {
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  userText: string
}) {
  const memory = input.longHorizonMemory ?? null
  const userText = sanitizeText(input.userText, 320)
  const rememberedBoundary = sanitizeText(memory?.rememberedConstraintSummary, 220)
  const rememberedPreference = sanitizeText(memory?.rememberedPreferenceSummary, 220)
  const rememberedPlan = sanitizeText(memory?.rememberedPlanSummary, 220)
  const dominantCue = sanitizeText(memory?.dominantCueSummary, 220)
  const merged = `${rememberedBoundary} ${rememberedPreference} ${rememberedPlan} ${dominantCue} ${userText}`

  return {
    relationship: clamp01(
      (rememberedBoundary && rememberedBoundaryPattern.test(merged) ? 0.18 : 0)
      + (rememberedPreference && rememberedPreferencePattern.test(merged) ? 0.08 : 0)
      + (dominantCue && /trust|bond|relationship|回应|靠近|距离|repair/i.test(dominantCue) ? 0.08 : 0),
    ),
    procedural: clamp01(
      (rememberedPlan && rememberedPlanPattern.test(merged) ? 0.18 : 0)
      + (dominantCue && /verify|procedure|runtime|flow|same way|稳的方式|做法/i.test(dominantCue) ? 0.1 : 0)
      + (rememberedPreference && /grounded repair|repair first|verify|先确认/i.test(rememberedPreference) ? 0.06 : 0),
    ),
    autobiographical: clamp01(
      (dominantCue ? 0.04 : 0)
      + (rememberedPreference && /warmth|陪|gentle|温和|soft/i.test(rememberedPreference) ? 0.06 : 0),
    ),
    queryHints: uniqueList([
      rememberedBoundary,
      rememberedPreference,
      rememberedPlan,
      dominantCue,
    ], 4),
  }
}

function buildSceneMemoryResonanceBias(input: {
  sceneContext?: AlicizationSceneAttachmentContext | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
}) {
  const sceneQueryHints = buildSceneQueryHints(input.sceneContext ?? null, 6)
  const sceneText = sanitizeText([
    input.sceneContext?.cueSummary,
    input.sceneContext?.targetTitle,
    input.sceneContext?.appName,
    input.sceneContext?.processName,
    input.dialogueWorldThread?.activeThread,
    input.conversationState?.jointThread,
    ...(input.dialogueWorldThread?.recallKeys ?? []),
    ...(input.conversationState?.memoryQueryHints ?? []),
  ].filter(Boolean).join(' '), 520).toLowerCase()

  const rememberedBoundary = sanitizeText(input.longHorizonMemory?.rememberedConstraintSummary, 220)
  const rememberedPreference = sanitizeText(input.longHorizonMemory?.rememberedPreferenceSummary, 220)
  const rememberedPlan = sanitizeText(input.longHorizonMemory?.rememberedPlanSummary, 220)
  const dominantCue = sanitizeText(input.longHorizonMemory?.dominantCueSummary, 220)
  const relationshipLine = sanitizeText(input.selfContinuityAuthority?.relationshipLine, 220)
  const habitLine = sanitizeText(input.selfContinuityAuthority?.habitLine, 220)
  const authoritySummary = sanitizeText(input.selfContinuityAuthority?.authoritySummary, 220)
  const sceneCueTokens = tokenizeSceneResonanceCues(sceneText)

  const relationshipThreadMatch = [
    rememberedBoundary,
    rememberedPreference,
    relationshipLine,
    habitLine,
    authoritySummary,
  ].some((item) => {
    const normalized = sanitizeText(item, 160).toLowerCase()
    if (normalized.length >= 8 && sceneText.includes(normalized.slice(0, Math.min(48, normalized.length))))
      return true

    const memoryCueTokens = tokenizeSceneResonanceCues(normalized)
    return memoryCueTokens.length >= 2
      ? memoryCueTokens.some(token => sceneCueTokens.includes(token))
      : false
  })

  const proceduralThreadMatch = [
    rememberedPlan,
    dominantCue,
  ].some((item) => {
    const normalized = sanitizeText(item, 160).toLowerCase()
    if (normalized.length >= 8 && sceneText.includes(normalized.slice(0, Math.min(48, normalized.length))))
      return true

    const memoryCueTokens = tokenizeSceneResonanceCues(normalized)
    return memoryCueTokens.length >= 2
      ? memoryCueTokens.some(token => sceneCueTokens.includes(token))
      : false
  })

  const sameThreadCue = /same line|same thread|runtime seam|callback seam|focused work|bond line|relationship line|repair|room|space|thread-faithful|continuity|同一条线|同条线|这条线|生命线|回调线|关系线|留白|慢一点|温度放大/iu.test(sceneText)
  const sceneFeltFamiliar = sceneQueryHints.length >= 2 && (relationshipThreadMatch || proceduralThreadMatch || sameThreadCue)

  return {
    relationship: clamp01(
      (relationshipThreadMatch ? 0.18 : 0)
      + (sameThreadCue ? 0.08 : 0),
    ),
    autobiographical: clamp01(
      (relationshipThreadMatch ? 0.1 : 0)
      + (sameThreadCue ? 0.06 : 0),
    ),
    procedural: clamp01(proceduralThreadMatch ? 0.08 : 0),
    sceneFeelsRemembered: sceneFeltFamiliar,
    queryHints: sceneFeltFamiliar
      ? uniqueList([
          rememberedBoundary,
          rememberedPreference,
          rememberedPlan,
          dominantCue,
          relationshipLine,
          habitLine,
          authoritySummary,
          ...sceneQueryHints,
        ], 6)
      : [],
  }
}

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
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
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
  if (input.selfContinuityAuthority?.relationshipLine)
    score += 0.1
  if (selfAuthoritySignalsMeasuredRelationshipContinuity(input.selfContinuityAuthority ?? null))
    score += 0.08
  if (input.longHorizonMemory?.rememberedConstraintSummary)
    score += 0.06
  return clamp01(score)
}

function pickAutobiographicalWeight(input: {
  userText: string
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
}) {
  let score = 0
  if (autobiographicalCuePattern.test(input.userText))
    score += 0.22
  if (input.answerCompiler?.answerSubject === 'alicization-self')
    score += 0.32
  if (input.privateThought?.emotionalTension === 'late-night-drain' || input.privateThought?.emotionalTension === 'tense-debug')
    score += 0.08
  if (input.selfContinuityAuthority?.selfLine || input.selfContinuityAuthority?.inwardLine)
    score += 0.1
  if (input.selfContinuityAuthority?.authoritySummary)
    score += 0.06
  if (selfAuthoritySignalsMeasuredRelationshipContinuity(input.selfContinuityAuthority ?? null))
    score += 0.04
  if (emotionalCarryPattern.test(input.userText))
    score += 0.12
  if (input.longHorizonMemory?.rememberedPlanSummary || input.longHorizonMemory?.dominantCueSummary)
    score += 0.06
  if (input.longHorizonMemory?.rememberedPreferenceSummary)
    score += 0.04
  if (input.affectiveResidue?.dominantResidueKind === 'rest-protective' || input.affectiveResidue?.dominantResidueKind === 'afterglow')
    score += 0.08
  if (input.affectiveResidue?.relationshipCadence?.shouldProtectRest || input.affectiveResidue?.relationshipCadence?.shouldDelayWarmth)
    score += 0.06
  return clamp01(score)
}

function shouldSuppressPresentFacingSelfCritiqueRecollection(input: {
  userText: string
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounterSnapshot | null
}) {
  const userText = sanitizeText(input.userText, 320)
  const answerSubject = input.answerCompiler?.answerSubject ?? null
  const encounter = input.dialogueEncounter ?? null

  if (answerSubject !== 'alicization-self')
    return false
  if (!encounter?.dialogueFirst || encounter.continuityMode !== 'dialogue-first')
    return false
  if (!encounter.mustAnswerDirectly || !encounter.shouldBypassScreenRepair)
    return false

  return /表现得.*开心|开心一点|说人话|别这么(?:客气|冷淡|温柔|直接)|为什么这样回我|别这样回我|太公式化|像个人一点|sound more human|be happier|too polite|too cold|why are you talking like this/iu.test(userText)
}

function pickMoodCongruentBoost(input: {
  userText: string
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
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
  if (input.affectiveResidue?.dominantResidueKind === 'rest-protective')
    score += 0.12
  else if (input.affectiveResidue?.dominantResidueKind === 'afterglow' || input.affectiveResidue?.dominantResidueKind === 'repair')
    score += 0.08
  if (input.emotionalKernel?.memoryRecallMode === 'self-continuity')
    score += 0.12
  else if (input.emotionalKernel?.memoryRecallMode === 'low-pressure-presence')
    score += 0.08
  if (input.emotionalKernel?.embodimentTone === 'nearby-soft')
    score += 0.08
  else if (input.emotionalKernel?.embodimentTone === 'measured-return')
    score += 0.06
  score += clamp01(
    (input.affectiveResidue?.relationshipCadence?.afterglowCarry ?? 0) * 0.22
    + (input.affectiveResidue?.relationshipCadence?.fatigueGuard ?? 0) * 0.18
    + (input.affectiveResidue?.relationshipCadence?.shouldProtectRest ? 0.08 : 0)
    + (input.affectiveResidue?.relationshipCadence?.shouldDelayWarmth ? 0.06 : 0),
  )
  return clamp01(score)
}

function hasInwardSelfContinuityEmbodimentTone(
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null,
) {
  return emotionalKernel?.embodimentTone === 'nearby-soft'
    || emotionalKernel?.embodimentTone === 'quiet-companionship'
}

function inferRecollectionWhyNow(input: {
  conversationHistoryWeight: number
  proceduralWeight: number
  relationshipWeight: number
  autobiographicalWeight: number
  moodCongruentBoost: number
  sceneFamiliarity: number
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
}) {
  if (
    input.emotionalKernel?.memoryRecallMode === 'self-continuity'
    && input.emotionalKernel?.initiativeMode === 'hold'
    && hasInwardSelfContinuityEmbodimentTone(input.emotionalKernel ?? null)
  ) {
    return 'The current emotional kernel is holding inward same-her continuity, so recollection should recover lived self-line continuity before outward memory detail.'
  }
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
    input.goalStack?.alicizationGoals?.[0]?.label,
    input.motiveEngine?.backgroundAgendas?.[0]?.summary,
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
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
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
    + (input.goalStack?.alicizationGoals?.[0]?.label ? 0.06 : 0),
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
      emotionalKernel: input.emotionalKernel ?? null,
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
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
  sceneContext?: AlicizationSceneAttachmentContext | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
}): AlicizationMemoryRecollectionIntentSnapshot | null {
  const userText = sanitizeText(input.userText, 320)
  if (shouldSuppressPresentFacingSelfCritiqueRecollection({
    userText,
    answerCompiler: input.answerCompiler ?? null,
    dialogueEncounter: input.dialogueEncounter ?? null,
  })) {
    return null
  }
  const sceneQueryHints = buildSceneQueryHints(input.sceneContext ?? null)
  const selfAuthorityQueryHints = buildSelfAuthorityQueryHints(input.selfContinuityAuthority ?? null)
  const affectiveResidueQueryHints = buildAffectiveResidueQueryHints(input.affectiveResidue ?? null)
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
    longHorizonMemory: input.longHorizonMemory ?? null,
    selfContinuityAuthority: input.selfContinuityAuthority ?? null,
  })
  const autobiographicalWeight = pickAutobiographicalWeight({
    userText,
    answerCompiler: input.answerCompiler ?? null,
    privateThought: input.privateThought ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    selfContinuityAuthority: input.selfContinuityAuthority ?? null,
    affectiveResidue: input.affectiveResidue ?? null,
  })
  const moodCongruentBoost = pickMoodCongruentBoost({
    userText,
    privateThought: input.privateThought ?? null,
    replyDeliberation: input.replyDeliberation ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    affectiveResidue: input.affectiveResidue ?? null,
    emotionalKernel: input.emotionalKernel ?? null,
  })
  const proceduralWeight = pickProceduralWeight({
    userText,
    dialogueWorldThread: input.dialogueWorldThread ?? null,
    conversationState: input.conversationState ?? null,
    answerCompiler: input.answerCompiler ?? null,
  })
  const longHorizonRecallBias = buildLongHorizonRecallBias({
    longHorizonMemory: input.longHorizonMemory ?? null,
    userText,
  })
  const sceneMemoryResonanceBias = buildSceneMemoryResonanceBias({
    sceneContext: input.sceneContext ?? null,
    dialogueWorldThread: input.dialogueWorldThread ?? null,
    conversationState: input.conversationState ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    selfContinuityAuthority: input.selfContinuityAuthority ?? null,
  })

  const boostedRelationshipWeight = clamp01(relationshipWeight + (
    relationshipWeight > 0 || relationshipTriggerPattern.test(userText)
      ? moodCongruentBoost * 0.32
      : 0
  ) + longHorizonRecallBias.relationship + sceneMemoryResonanceBias.relationship
  + (input.emotionalKernel?.memoryRecallMode === 'self-continuity' ? 0.16 : 0)
  + (hasInwardSelfContinuityEmbodimentTone(input.emotionalKernel ?? null) ? 0.06 : 0))
  const boostedAutobiographicalWeight = clamp01(autobiographicalWeight + moodCongruentBoost * 0.42 + longHorizonRecallBias.autobiographical + sceneMemoryResonanceBias.autobiographical
    + (input.emotionalKernel?.memoryRecallMode === 'self-continuity' ? 0.22 : 0)
    + (input.emotionalKernel?.initiativeMode === 'hold' ? 0.08 : 0)
    + (hasInwardSelfContinuityEmbodimentTone(input.emotionalKernel ?? null) ? 0.06 : 0))
  const boostedProceduralWeight = clamp01(proceduralWeight + longHorizonRecallBias.procedural + sceneMemoryResonanceBias.procedural)
  const recollectionAgenda = buildRecollectionAgenda({
    conversationHistoryWeight,
    proceduralWeight: boostedProceduralWeight,
    relationshipWeight: boostedRelationshipWeight,
    autobiographicalWeight: boostedAutobiographicalWeight,
    moodCongruentBoost,
    emotionalKernel: input.emotionalKernel ?? null,
    sceneQueryHints,
    sceneContext: input.sceneContext ?? null,
    dialogueWorldThread: input.dialogueWorldThread ?? null,
    conversationState: input.conversationState ?? null,
    goalStack: input.goalStack ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    motiveEngine: input.motiveEngine ?? null,
  })

  if (Math.max(conversationHistoryWeight, boostedRelationshipWeight, boostedAutobiographicalWeight, boostedProceduralWeight) < 0.2)
    return null

  if (boostedProceduralWeight >= Math.max(conversationHistoryWeight, boostedRelationshipWeight, boostedAutobiographicalWeight)) {
    return {
      mode: boostedProceduralWeight >= 0.54 ? 'execution-procedure' : 'experience-pattern',
      temporalFocus: 'experience-matched',
      searchEpisodes: true,
      searchConversations: false,
      searchProceduralExperience: true,
      queryHints: uniqueList([
        input.conversationState?.activeProject,
        input.dialogueWorldThread?.activeThread,
        ...longHorizonRecallBias.queryHints,
        ...sceneQueryHints,
        input.goalStack?.alicizationGoals?.[0]?.label,
        input.motiveEngine?.backgroundAgendas?.[0]?.summary,
        ...(input.dialogueWorldThread?.recallKeys ?? []),
      ], 8),
      rationale: 'The current turn feels like reusing a previously lived way of doing a task, not just recalling a recent sentence.',
      confidence: boostedProceduralWeight,
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
        ...selfAuthorityQueryHints,
        ...longHorizonRecallBias.queryHints,
        ...sceneMemoryResonanceBias.queryHints,
        ...sceneQueryHints,
        input.privateThought?.emotionalTension ? `mood:${input.privateThought.emotionalTension}` : null,
        ...(input.conversationState?.memoryQueryHints ?? []),
      ], 8),
      rationale: relationshipTriggerPattern.test(userText)
        ? 'The host is reacting to Alicization’s current relational tone, so bond-history recall should surface even without an explicit "before" question.'
        : sceneMemoryResonanceBias.sceneFeelsRemembered
          ? 'The current scene feels like a remembered relationship/thread seam, so bond-history recall should open even before the host explicitly asks for the past.'
          : 'The turn is asking about the bond or how Alicization has responded before, so relationship history should surface.',
      confidence: boostedRelationshipWeight,
      recollectionAgenda,
    }
  }

  if (boostedAutobiographicalWeight >= conversationHistoryWeight) {
    const affectiveResidueCarry = hasStrongAffectiveResidueCarry(input.affectiveResidue ?? null)
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
        ...selfAuthorityQueryHints,
        ...affectiveResidueQueryHints,
        ...sceneMemoryResonanceBias.queryHints,
        ...sceneQueryHints,
        input.privateThought?.emotionalTension ? `mood:${input.privateThought.emotionalTension}` : null,
        ...(input.dialogueWorldThread?.recallKeys ?? []),
      ], 8),
      rationale: emotionalCarryPattern.test(userText) || affectiveResidueCarry
        ? 'The host’s current emotional carry matches older autobiographical pressure, so lived continuity should answer it.'
        : sceneMemoryResonanceBias.sceneFeelsRemembered
          ? 'The current scene feels like a remembered lived seam, so autobiographical continuity should answer before the moment gets flattened into generic context.'
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
