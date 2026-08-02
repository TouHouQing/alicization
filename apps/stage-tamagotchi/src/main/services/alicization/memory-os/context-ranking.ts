import type {
  AlicizationMemoryRecollectionMode,
  AlicizationPersonStateEvolutionSummary,
  AlicizationRecallGovernorSnapshot,
} from '../../../../shared/eventa'
import type { AlicizationPersonStateProjection } from '../person-state-projection'
import type { MemoryClusterProbe, MemoryClusterState } from '../runtime-organic-memory-prompt-types'
import type { OrganicMemoryPromptContext } from '../runtime-soul'

import { buildHostSocialContexts, buildHostSocialGuidance } from '../host-social-guidance'
import { buildAlicizationPersonStateProjection } from '../person-state-projection'
import { buildRelationshipDoctrineGuidance } from '../relationship-doctrine-guidance'

function uniqueList(values: Array<string | null | undefined>, maxItems = 6) {
  const result: string[] = []
  for (const value of values) {
    const normalized = String(value ?? '').trim().replace(/\s+/g, ' ')
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

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizePromptText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function clusterTokens(normalizeOrganicRecallText: (raw: string) => string, text: string) {
  const tokens = normalizeOrganicRecallText(text).toLowerCase().match(/\p{Script=Han}{1,8}|[a-z0-9][a-z0-9-]{1,32}/gu) ?? []
  return tokens.filter(token =>
    ![
      'the',
      'this',
      'that',
      'with',
      'from',
      'turn',
      'period',
      'relationship',
      'memory',
      'remembered',
      'host',
      'assistant',
      'reply',
      'event',
      'runtime',
      'session',
      'thread',
      'line',
      'thing',
      '这个',
      '那个',
      '这次',
      '那次',
      '关系',
      '记忆',
      '回忆',
      '时期',
      '线程',
      '会话',
    ].includes(token),
  )
}

function rankClusterKeyTokens(tokens: string[]) {
  const weighted = tokens.map((token, index) => {
    const relationshipLineSignal = /bond|room|space|closeness|warm|repair|boundary|distance|living|foreground|靠近|空间|边界|距离|修复|温和|关系线|同一条线/u.test(token)
    const score = (relationshipLineSignal ? 2 : 0) + Math.max(0, 6 - index) * 0.1
    return { token, score, index }
  })

  return weighted
    .sort((left, right) => right.score !== left.score ? right.score - left.score : left.index - right.index)
    .map(item => item.token)
}

export function countRecallTermOverlap(normalizeOrganicRecallText: (raw: string) => string, base: string, candidate: string) {
  const baseTerms = new Set(
    normalizeOrganicRecallText(base)
      .split(/\s+/u)
      .filter(term => term.length >= 2),
  )
  if (baseTerms.size === 0)
    return 0
  const candidateTerms = new Set(
    normalizeOrganicRecallText(candidate)
      .split(/\s+/u)
      .filter(term => term.length >= 2),
  )
  if (candidateTerms.size === 0)
    return 0

  let overlap = 0
  for (const term of candidateTerms) {
    if (baseTerms.has(term))
      overlap += 1
  }
  return overlap / candidateTerms.size
}

function expandCarryCueVariants(raw: string | null | undefined, maxItems = 8) {
  const normalized = sanitizePromptText(raw, 80).toLowerCase()
  if (!normalized)
    return []

  const variants = new Set<string>()
  for (const segment of normalized.split('|').map(item => item.trim()).filter(Boolean)) {
    variants.add(segment)
    const colonParts = segment.split(':').map(item => item.trim()).filter(Boolean)
    if (colonParts.length > 1)
      variants.add(colonParts[colonParts.length - 1]!)

    const slashParts = segment.split('/').map(item => item.trim()).filter(Boolean)
    if (slashParts.length > 1)
      slashParts.forEach(part => variants.add(part))

    const hyphenParts = segment.split('-').map(item => item.trim()).filter(item => item.length >= 2)
    if (hyphenParts.length > 1) {
      variants.add(hyphenParts.join('-'))
      variants.add(hyphenParts.join(' '))
      if (hyphenParts.length > 2)
        variants.add(hyphenParts.slice(0, -1).join('-'))
      if (hyphenParts.length > 2)
        variants.add(hyphenParts.slice(0, -1).join(' '))
      variants.add(hyphenParts[hyphenParts.length - 1]!)
      hyphenParts.forEach(part => variants.add(part))
    }
  }

  return uniqueList([...variants], maxItems)
}

function expandProcedureLineVariants(lines: string[], maxItems = 16) {
  const result: string[] = []
  for (const line of lines) {
    for (const variant of expandCarryCueVariants(line, maxItems)) {
      if (result.some(item => item.toLowerCase() === variant.toLowerCase()))
        continue
      result.push(variant)
      if (result.length >= maxItems)
        return result
    }
  }
  return result
}

function deriveAffectiveEmbodiedCarry(input: {
  recallGovernor?: AlicizationRecallGovernorSnapshot | null
}) {
  const governor = input.recallGovernor ?? null
  const affectiveCarry = governor?.affectiveCarry ?? null
  const embodiedCarry = governor?.embodiedCarry ?? null
  const sceneFamiliarityHint = Number.isFinite(governor?.sceneFamiliarityHint)
    ? Math.max(0, Math.min(1, Number(governor?.sceneFamiliarityHint)))
    : 0
  const moodTexts = uniqueList([
    affectiveCarry?.summary ?? null,
    affectiveCarry?.moodLabel ? `mood:${affectiveCarry.moodLabel}` : null,
    affectiveCarry?.emotionalTension ? `tension:${affectiveCarry.emotionalTension}` : null,
  ], 4)
  const embodiedTexts = uniqueList([
    embodiedCarry?.summary ?? null,
    embodiedCarry?.presence ? `presence:${embodiedCarry.presence}` : null,
    embodiedCarry?.suggestedStyle ? `style:${embodiedCarry.suggestedStyle}` : null,
    embodiedCarry?.afterglowFromScenario ? `afterglow:${embodiedCarry.afterglowFromScenario}` : null,
  ], 4)
  const sceneTexts = uniqueList([
    ...(governor?.sceneAnchor?.split('|').map(item => sanitizePromptText(item, 120)) ?? []),
  ], 6)
  const moodCues = uniqueList([
    ...moodTexts.flatMap(text => expandCarryCueVariants(text, 6)),
    ...expandCarryCueVariants(affectiveCarry?.moodLabel ?? null, 4),
    ...expandCarryCueVariants(affectiveCarry?.emotionalTension ?? null, 6),
  ], 10)
  const embodiedCues = uniqueList([
    ...embodiedTexts.flatMap(text => expandCarryCueVariants(text, 6)),
    ...expandCarryCueVariants(embodiedCarry?.presence ?? null, 4),
    ...expandCarryCueVariants(embodiedCarry?.suggestedStyle ?? null, 6),
    ...expandCarryCueVariants(embodiedCarry?.afterglowFromScenario ?? null, 4),
    ...sceneTexts.flatMap(text => expandCarryCueVariants(text, 6)),
  ], 12)

  return {
    sceneFamiliarityHint,
    sceneTexts,
    moodTexts,
    embodiedTexts,
    moodCues,
    embodiedCues,
    moodLabel: affectiveCarry?.moodLabel ?? null,
    emotionalTension: affectiveCarry?.emotionalTension ?? null,
    embodiedPresence: embodiedCarry?.presence ?? null,
    afterglowFromScenario: embodiedCarry?.afterglowFromScenario ?? null,
  }
}

function scoreCuePresence(normalizeOrganicRecallText: (raw: string) => string, text: string, cues: string[]) {
  if (cues.length === 0)
    return 0

  const normalized = normalizeOrganicRecallText(text).toLowerCase()
  if (!normalized)
    return 0
  const textTokens = new Set(clusterTokens(normalizeOrganicRecallText, normalized))
  let best = 0
  for (const cue of cues) {
    const normalizedCue = normalizeOrganicRecallText(cue).toLowerCase()
    if (!normalizedCue)
      continue
    if (normalized.includes(normalizedCue))
      return 1
    const cueTokens = clusterTokens(normalizeOrganicRecallText, normalizedCue)
    if (cueTokens.length === 0)
      continue
    let matched = 0
    for (const token of cueTokens) {
      if (textTokens.has(token))
        matched += 1
    }
    best = Math.max(best, matched / cueTokens.length)
  }
  return clamp01(best)
}

function scoreExactCuePresence(normalizeOrganicRecallText: (raw: string) => string, text: string, cues: string[]) {
  const normalized = normalizeOrganicRecallText(text).toLowerCase()
  if (!normalized || cues.length === 0)
    return 0

  let best = 0
  for (const cue of cues) {
    const normalizedCue = normalizeOrganicRecallText(cue).toLowerCase()
    if (!normalizedCue)
      continue
    if (normalized.includes(normalizedCue))
      best = Math.max(best, 1)
    continue
    const cueParts = normalizedCue.split(/\s+/u).filter(part => part.length >= 2)
    if (cueParts.length >= 2 && cueParts.every(part => normalized.includes(part)))
      best = Math.max(best, 0.82)
  }
  return clamp01(best)
}

function scoreSceneMoodEmbodiedCarryText(input: {
  normalizeOrganicRecallText: (raw: string) => string
  text: string
  sceneWeight?: number | null
  carry: ReturnType<typeof deriveAffectiveEmbodiedCarry>
}) {
  const normalized = input.normalizeOrganicRecallText(input.text).toLowerCase()
  if (
    !normalized
    || (input.carry.sceneFamiliarityHint <= 0.14
      && input.carry.moodTexts.length === 0
      && input.carry.embodiedTexts.length === 0
      && input.carry.sceneTexts.length === 0)
  ) {
    return 0
  }

  const sceneWeight = Math.max(0, input.sceneWeight ?? 0)
  const moodOverlap = input.carry.moodTexts.length > 0
    ? Math.max(...input.carry.moodTexts.map(line => countRecallTermOverlap(input.normalizeOrganicRecallText, line, input.text)), 0)
    : 0
  const embodiedOverlap = input.carry.embodiedTexts.length > 0
    ? Math.max(...input.carry.embodiedTexts.map(line => countRecallTermOverlap(input.normalizeOrganicRecallText, line, input.text)), 0)
    : 0
  const sceneCuePresence = scoreCuePresence(input.normalizeOrganicRecallText, input.text, input.carry.sceneTexts)
  const moodCuePresence = scoreCuePresence(input.normalizeOrganicRecallText, input.text, input.carry.moodCues)
  const embodiedCuePresence = scoreCuePresence(input.normalizeOrganicRecallText, input.text, input.carry.embodiedCues)
  const afterglowBoost = (input.carry.moodLabel === 'afterglow' || input.carry.afterglowFromScenario)
    && /afterglow|linger|warm|still warm|late-night|余温|回温|soft carry/u.test(normalized)
    ? 0.14
    : 0
  const emotionalTensionBoost = input.carry.emotionalTension === 'late-night-drain'
    && /late-night|drain|tired|soft|gentle|quiet|夜里|夜间|累|余温/u.test(normalized)
    ? 0.12
    : 0
  const codingSceneBoost = input.carry.afterglowFromScenario === 'coding'
    && /cursor|diff|editor|terminal|patch|lane|终端|编辑器/u.test(normalized)
    ? 0.14
    : 0
  const presenceBoost = input.carry.embodiedPresence === 'attentive' && /focus|verify|watch|observe|repair|screen|diff|editor|专注|观察|修复/u.test(normalized)
    ? 0.1
    : input.carry.embodiedPresence === 'concerned' && /care|soft|warn|rest|gentle|关心|提醒|温和|休息/u.test(normalized)
      ? 0.1
      : input.carry.embodiedPresence === 'glance' && /afterglow|linger|brief|light|warm|quiet|cursor|diff|余温|轻/u.test(normalized)
        ? 0.12
        : 0
  return clamp01(
    sceneWeight * (0.16 + input.carry.sceneFamiliarityHint * 0.24)
    + sceneCuePresence * (0.08 + input.carry.sceneFamiliarityHint * 0.12)
    + moodCuePresence * 0.26
    + embodiedCuePresence * 0.18
    + moodOverlap * 0.14
    + embodiedOverlap * 0.12
    + afterglowBoost
    + emotionalTensionBoost
    + codingSceneBoost
    + presenceBoost,
  )
}

export function deriveMemoryClusterKey(normalizeOrganicRecallText: (raw: string) => string, text: string) {
  const tokens = rankClusterKeyTokens(clusterTokens(normalizeOrganicRecallText, text))
  if (tokens.length === 0)
    return ''
  return tokens.slice(0, 4).join(':')
}

function deriveMemoryPromptProjectionContexts(input: {
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
}) {
  const intentMode = input.recollectionIntent?.mode ?? ('none' satisfies AlicizationMemoryRecollectionMode)
  const relationshipHistory = intentMode === 'relationship-history' || intentMode === 'autobiographical-history'
  const executionHistory = intentMode === 'execution-procedure' || intentMode === 'experience-pattern'
  return buildHostSocialContexts({
    extraContexts: [
      relationshipHistory ? 'open-window' : 'general',
      executionHistory ? 'focused-work' : 'general',
      executionHistory ? 'execution' : 'general',
    ],
  })
}

function buildMemoryRelationshipDoctrineGuidance(input: {
  projection: OrganicMemoryPromptContext['personStateProjection'] | null
  coreIncarnation: string
  contexts: string[]
}) {
  const continuity = input.projection?.personalityContinuityState ?? null
  const growthProfile = continuity?.growthProfile ?? null

  return buildRelationshipDoctrineGuidance({
    authority: input.projection?.selfContinuityAuthority ?? null,
    doctrineText: input.projection?.relationshipDoctrine || input.coreIncarnation,
    contexts: input.contexts,
    conflictStyle: continuity?.repairPosture === 'repair-first' ? 'repair-first' : null,
    quietObservation: growthProfile?.prefersQuietCompanionship ? 1 : null,
    autonomyRespect: growthProfile?.autonomyRespect ?? null,
    truthfulGrounding: growthProfile?.truthAnchor ?? null,
  })
}

export function buildMemoryPromptPersonStateProjection(input: {
  recallSeed: string
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
  personStateEvolutionSummary?: AlicizationPersonStateEvolutionSummary | null
}): AlicizationPersonStateProjection | null {
  if (!input.hostPersonModel)
    return null

  return buildAlicizationPersonStateProjection({
    now: Date.now(),
    contexts: deriveMemoryPromptProjectionContexts({
      recollectionIntent: input.recollectionIntent,
    }),
    hostPersonModel: input.hostPersonModel,
    personStateEvolutionSummary: input.personStateEvolutionSummary ?? null,
  })
}

function deriveHostSocialRecallBias(input: {
  recallSeed: string
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
  personStateProjection: OrganicMemoryPromptContext['personStateProjection'] | null
  coreIncarnation: string
}) {
  const projection = input.personStateProjection ?? null
  const defaultDoctrineGuidance = buildMemoryRelationshipDoctrineGuidance({
    projection,
    coreIncarnation: input.coreIncarnation,
    contexts: projection?.contexts ?? [],
  })
  const hostPersonModel = input.hostPersonModel ?? null
  if (!hostPersonModel && !projection) {
    return {
      contexts: [] as string[],
      cautious: false,
      restrained: false,
      doctrineGuidance: defaultDoctrineGuidance,
      activeClosenessContext: null as AlicizationPersonStateProjection['activeClosenessContext'] | null,
      activeClosenessRung: null as AlicizationPersonStateProjection['activeClosenessRung'] | null,
      biasTexts: [] as string[],
    }
  }

  const contexts = projection?.contexts ?? deriveMemoryPromptProjectionContexts({
    recollectionIntent: input.recollectionIntent,
  })
  const guidance = buildHostSocialGuidance({
    hostPersonModel,
    contexts,
  })
  const doctrineGuidance = buildMemoryRelationshipDoctrineGuidance({
    projection,
    coreIncarnation: input.coreIncarnation,
    contexts,
  })
  const biasTexts = uniqueList([
    projection?.preferenceText,
    projection?.sensitivityText,
    projection?.repairTriggerText,
    projection?.burdenText,
    projection?.routineText,
    projection?.trustRationale,
    projection?.summary,
    guidance.preferenceText,
    guidance.sensitivityText,
    guidance.repairTriggerText,
    guidance.burdenText,
    guidance.trustRationale,
    ...(hostPersonModel?.routines ?? []),
    ...(hostPersonModel?.sensitivities ?? []),
    ...(hostPersonModel?.repairTriggers ?? []),
    ...(hostPersonModel?.recurrentBurdens ?? []),
  ], 10)

  return {
    contexts,
    cautious: projection?.cautious ?? guidance.cautious,
    restrained: projection?.restrained ?? guidance.restrained,
    doctrineGuidance,
    trustStage: projection?.personalityContinuityState?.trustStage ?? hostPersonModel?.trustLadder.stage ?? null,
    activeClosenessContext: projection?.activeClosenessContext ?? null,
    activeClosenessRung: projection?.activeClosenessRung ?? null,
    biasTexts,
  }
}

function deriveRelationshipStageAlignmentScore(input: {
  normalizeOrganicRecallText: (raw: string) => string
  text: string
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
  personStateProjection: OrganicMemoryPromptContext['personStateProjection'] | null
  coreIncarnation: string
  recallSeed: string
}) {
  const socialBias = deriveHostSocialRecallBias({
    recallSeed: input.recallSeed,
    recollectionIntent: input.recollectionIntent,
    hostPersonModel: input.hostPersonModel,
    personStateProjection: input.personStateProjection,
    coreIncarnation: input.coreIncarnation,
  })
  const normalized = input.normalizeOrganicRecallText(input.text)
  const repairLike = /repair|space|room|lighter|boundary|distance|pressure|back off|leave room|修复|空间|边界|轻一点|距离|压力/u.test(normalized)
  const warmLike = /warm|close|closeness|directness|companionship|tender|care|open window|温和|靠近|亲密|直接|陪伴/u.test(normalized)
  const procedureLike = /runtime|procedure|patch|verify|result|callback|task|execution|focused|bounded|thread-faithful|修复节奏|回调|执行|任务|线程/u.test(normalized)
  let score = 0
  if ((socialBias.trustStage === 'guarded' || socialBias.trustStage === 'cautious-open') && repairLike)
    score += 0.22
  if ((socialBias.trustStage === 'guarded' || socialBias.trustStage === 'cautious-open') && warmLike)
    score -= 0.14
  if ((socialBias.trustStage === 'warming' || socialBias.trustStage === 'trusted') && warmLike)
    score += 0.16
  if ((socialBias.trustStage === 'warming' || socialBias.trustStage === 'trusted') && repairLike)
    score -= 0.08
  if (socialBias.doctrineGuidance.repairBeforeCloseness && repairLike)
    score += 0.12
  if (socialBias.doctrineGuidance.repairBeforeCloseness && warmLike)
    score -= 0.1
  if (socialBias.activeClosenessContext === 'repair-window') {
    if (repairLike)
      score += 0.18
    if (warmLike)
      score -= 0.12
  }
  if (socialBias.activeClosenessContext === 'execution-callback') {
    if (procedureLike)
      score += 0.16
    if (warmLike)
      score -= 0.1
  }
  if (socialBias.activeClosenessContext === 'focused-work') {
    if (procedureLike || repairLike)
      score += 0.08
    if (warmLike)
      score -= 0.08
  }
  if (socialBias.activeClosenessContext === 'open-companionship' && warmLike)
    score += 0.14
  if (socialBias.activeClosenessRung === 'space-first' || socialBias.activeClosenessRung === 'measured-room') {
    if (warmLike)
      score -= 0.1
    if (repairLike)
      score += 0.06
  }
  if ((socialBias.activeClosenessRung === 'warm-near' || socialBias.activeClosenessRung === 'close-hold') && warmLike)
    score += 0.08
  return score
}

export function rankByHostSocialAffinity<T>(input: {
  normalizeOrganicRecallText: (raw: string) => string
  items: T[]
  toText: (item: T) => string
  recallSeed: string
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
  personStateProjection: OrganicMemoryPromptContext['personStateProjection'] | null
  coreIncarnation: string
}) {
  if (input.items.length <= 1 || (!input.hostPersonModel && !input.personStateProjection && !input.coreIncarnation))
    return input.items

  const socialBias = deriveHostSocialRecallBias({
    recallSeed: input.recallSeed,
    recollectionIntent: input.recollectionIntent,
    hostPersonModel: input.hostPersonModel,
    personStateProjection: input.personStateProjection,
    coreIncarnation: input.coreIncarnation,
  })
  if (socialBias.biasTexts.length === 0)
    return input.items

  const intentMode = input.recollectionIntent?.mode ?? 'none'
  return [...input.items]
    .map((item, index) => {
      const text = input.toText(item)
      const overlap = Math.max(
        ...socialBias.biasTexts.map(biasText => countRecallTermOverlap(input.normalizeOrganicRecallText, biasText, text)),
        0,
      )
      const normalized = input.normalizeOrganicRecallText(text)
      const hasRepairBias = /repair|space|room|lighter|boundary|back off|leave room|压力|空间|边界|轻一点|修复/u.test(normalized)
      const hasClosenessBias = /warm|close|closeness|companionship|tender|care|温和|靠近|亲密/u.test(normalized)
      let score = overlap * 0.26
      if ((intentMode === 'relationship-history' || intentMode === 'autobiographical-history') && (socialBias.cautious || socialBias.restrained)) {
        if (hasRepairBias)
          score += 0.18
        if (hasClosenessBias)
          score -= 0.12
      }
      if ((intentMode === 'relationship-history' || intentMode === 'autobiographical-history') && socialBias.doctrineGuidance.repairBeforeCloseness) {
        if (hasRepairBias)
          score += 0.18
        if (hasClosenessBias)
          score -= 0.14
      }
      if ((intentMode === 'execution-procedure' || intentMode === 'experience-pattern') && socialBias.doctrineGuidance.truthBeforeWarmth) {
        if (/repair|verify|truth|ground|accur|runtime|procedure|patch|fix|真实|核实|修复|准确/iu.test(normalized))
          score += 0.12
        if (hasClosenessBias)
          score -= 0.08
      }
      if (socialBias.doctrineGuidance.leaveRoom && hasRepairBias)
        score += 0.08
      if ((intentMode === 'execution-procedure' || intentMode === 'experience-pattern') && socialBias.contexts.includes('focused-work')) {
        if (/runtime|procedure|patch|verify|task|execution|focused|repair rhythm|bounded/iu.test(normalized))
          score += 0.12
      }
      return { item, index, score }
    })
    .sort((left, right) => left.score !== right.score ? right.score - left.score : left.index - right.index)
    .map(entry => entry.item)
}

function scoreAgeForCandidateScope(ageDays: number, scope: NonNullable<NonNullable<OrganicMemoryPromptContext['recollectionIntent']>['recollectionAgenda']>['candidateTimeScopes'][number]['scope']) {
  switch (scope) {
    case 'recent':
      return ageDays <= 1 ? 1 : ageDays <= 3 ? 0.56 : 0.08
    case 'recent-or-mid':
      return ageDays <= 14 ? 1 : ageDays <= 30 ? 0.62 : 0.16
    case 'cross-session':
      return ageDays >= 2 ? Math.min(1, 0.42 + ageDays / 21) : 0.12
    case 'experience-matched':
      return ageDays >= 1 ? Math.min(1, 0.38 + ageDays / 14) : 0.2
    case 'distant':
      return ageDays >= 14 ? Math.min(1, 0.34 + ageDays / 45) : 0.04
    default:
      return 0
  }
}

export function rankByRecollectionAgendaAffinity<T>(input: {
  normalizeOrganicRecallText: (raw: string) => string
  items: T[]
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  toText: (item: T) => string
  getFacet?: (item: T) => NonNullable<NonNullable<OrganicMemoryPromptContext['recollectionIntent']>['recollectionAgenda']>['candidateEraFacets'][number]['facet'] | null
  getAgeDays?: (item: T) => number | null
  personStateProjection?: OrganicMemoryPromptContext['personStateProjection'] | null
}) {
  const agenda = input.recollectionIntent?.recollectionAgenda ?? null
  if (input.items.length <= 1 || !agenda)
    return input.items

  const facetWeights = new Map(
    (agenda.candidateEraFacets ?? []).map(item => [item.facet, item.weight] as const),
  )
  const procedureLines = agenda.candidateProcedureLines ?? []
  const procedureLineVariants = expandProcedureLineVariants(procedureLines, 18)
  const emotionalPattern = /drain|mess|overwhelm|care|warm|cold|tender|annoyed|压力|[累乱烦]|温和|冷淡|情绪/u
  const relationshipPattern = /relationship|bond|trust|repair|boundary|tone|space|回应|关系|信任|修复|边界|语气|空间/u

  return [...input.items]
    .map((item, index) => {
      const text = input.toText(item)
      const normalized = input.normalizeOrganicRecallText(text).toLowerCase()
      const procedureOverlap = procedureLines.length > 0
        ? Math.max(...procedureLines.map(line => countRecallTermOverlap(input.normalizeOrganicRecallText, line, text)), 0)
        : 0
      const procedureVariantOverlap = procedureLineVariants.length > 0
        ? Math.max(...procedureLineVariants.map(line => countRecallTermOverlap(input.normalizeOrganicRecallText, line, text)), 0)
        : 0
      const procedureExactCue = scoreExactCuePresence(input.normalizeOrganicRecallText, text, procedureLines)
      const procedureVariantExactCue = scoreExactCuePresence(input.normalizeOrganicRecallText, text, procedureLineVariants)
      const facetWeight = input.getFacet ? (facetWeights.get(input.getFacet(item) ?? 'phase') ?? 0) : 0
      const timeWeight = input.getAgeDays
        ? Math.max(
            ...((agenda.candidateTimeScopes ?? []).map(scope => scoreAgeForCandidateScope(input.getAgeDays?.(item) ?? 0, scope.scope) * scope.weight)),
            0,
          )
        : 0
      const relationshipAffinity = agenda.relationshipNeed >= 0.32 && relationshipPattern.test(normalized)
        ? agenda.relationshipNeed * 0.18
        : 0
      const affectAffinity = agenda.affectivePull >= 0.28 && emotionalPattern.test(normalized)
        ? agenda.affectivePull * 0.14
        : 0
      const sceneAffinity = agenda.sceneFamiliarity >= 0.28 && /scene:|workload:|content:|window|period|terminal|editor|screen|窗口|阶段/u.test(normalized)
        ? agenda.sceneFamiliarity * 0.1
        : 0
      const score = procedureOverlap * (0.18 + agenda.goalSimilarity * 0.22)
        + procedureVariantOverlap * (0.12 + agenda.goalSimilarity * 0.18)
        + procedureExactCue * (0.18 + agenda.goalSimilarity * 0.16)
        + procedureVariantExactCue * (0.16 + agenda.goalSimilarity * 0.14)
        + facetWeight * 0.28
        + timeWeight * 0.24
        + relationshipAffinity
        + affectAffinity
        + sceneAffinity
      return { item, index, score }
    })
    .sort((left, right) => left.score !== right.score ? right.score - left.score : left.index - right.index)
    .map(entry => entry.item)
}

export function analyzeMemoryClusters(input: {
  normalizeOrganicRecallText: (raw: string) => string
  probes: MemoryClusterProbe[]
  recallSeed: string
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
  personStateProjection: OrganicMemoryPromptContext['personStateProjection'] | null
  coreIncarnation: string
  recallGovernor?: AlicizationRecallGovernorSnapshot | null
}) {
  const agenda = input.recollectionIntent?.recollectionAgenda ?? null
  const carry = deriveAffectiveEmbodiedCarry({
    recallGovernor: input.recallGovernor ?? null,
  })
  if (input.probes.length === 0) {
    return {
      dominantClusterKey: null,
      dominantSummary: null,
      dominantScore: 0,
      runnerUpClusterKey: null,
      runnerUpSummary: null,
      runnerUpScore: 0,
      strongDominant: false,
      ambiguous: false,
      clusterScoreByKey: new Map(),
      competingVariants: [],
    } satisfies MemoryClusterState
  }

  const recallSeedText = input.normalizeOrganicRecallText(input.recallSeed)
  const hintTexts = input.recollectionIntent?.queryHints ?? []
  const procedureLines = agenda?.candidateProcedureLines ?? []
  const procedureLineVariants = expandProcedureLineVariants(procedureLines, 18)
  const clusterEntries = new Map<string, {
    summary: string
    score: number
    probeCount: number
  }>()
  for (const probe of input.probes) {
    const recallOverlap = countRecallTermOverlap(input.normalizeOrganicRecallText, recallSeedText, probe.text)
    const hintOverlap = hintTexts.length > 0
      ? Math.max(...hintTexts.map(text => countRecallTermOverlap(input.normalizeOrganicRecallText, text, probe.text)), 0)
      : 0
    const procedureOverlap = procedureLines.length > 0
      ? Math.max(...procedureLines.map(text => countRecallTermOverlap(input.normalizeOrganicRecallText, text, probe.text)), 0)
      : 0
    const procedureVariantOverlap = procedureLineVariants.length > 0
      ? Math.max(...procedureLineVariants.map(text => countRecallTermOverlap(input.normalizeOrganicRecallText, text, probe.text)), 0)
      : 0
    const procedureExactCue = scoreExactCuePresence(input.normalizeOrganicRecallText, probe.text, procedureLines)
    const procedureVariantExactCue = scoreExactCuePresence(input.normalizeOrganicRecallText, probe.text, procedureLineVariants)
    const relationshipStageScore = deriveRelationshipStageAlignmentScore({
      normalizeOrganicRecallText: input.normalizeOrganicRecallText,
      text: probe.text,
      recollectionIntent: input.recollectionIntent,
      hostPersonModel: input.hostPersonModel,
      personStateProjection: input.personStateProjection,
      coreIncarnation: input.coreIncarnation,
      recallSeed: input.recallSeed,
    })
    const carryScore = scoreSceneMoodEmbodiedCarryText({
      normalizeOrganicRecallText: input.normalizeOrganicRecallText,
      text: probe.text,
      carry,
    })
    const baseScore = recallOverlap * 0.44
      + hintOverlap * 0.22
      + procedureOverlap * 0.2
      + procedureVariantOverlap * 0.18
      + procedureExactCue * 0.22
      + procedureVariantExactCue * 0.2
      + relationshipStageScore
      + carryScore * 0.48
      + 0.08
    const current = clusterEntries.get(probe.clusterKey) ?? {
      summary: probe.clusterSummary,
      score: 0,
      probeCount: 0,
    }
    current.score += baseScore
    current.probeCount += 1
    if (probe.clusterSummary.length > current.summary.length)
      current.summary = probe.clusterSummary
    clusterEntries.set(probe.clusterKey, current)
  }

  const rankedClusters = [...clusterEntries.entries()]
    .map(([clusterKey, value]) => ({
      clusterKey,
      summary: value.summary,
      score: Number((value.score / Math.max(1, Math.min(3, value.probeCount))).toFixed(2)),
    }))
    .sort((left, right) => right.score - left.score)

  const dominant = rankedClusters[0] ?? null
  const runnerUp = rankedClusters[1] ?? null
  const strongDominant = Boolean(
    dominant
    && (!runnerUp || dominant.score >= runnerUp.score + 0.12 || dominant.score >= runnerUp.score * 1.18),
  )
  const ambiguous = Boolean(
    dominant
    && runnerUp
    && dominant.score >= 0.14
    && runnerUp.score >= 0.12
    && !strongDominant,
  )
  return {
    dominantClusterKey: dominant?.clusterKey ?? null,
    dominantSummary: dominant?.summary ?? null,
    dominantScore: dominant?.score ?? 0,
    runnerUpClusterKey: runnerUp?.clusterKey ?? null,
    runnerUpSummary: runnerUp?.summary ?? null,
    runnerUpScore: runnerUp?.score ?? 0,
    strongDominant,
    ambiguous,
    clusterScoreByKey: new Map(rankedClusters.map(item => [item.clusterKey, item.score])),
    competingVariants: ambiguous && dominant && runnerUp
      ? [
          {
            id: `cluster:${dominant.clusterKey}`,
            summary: dominant.summary,
            reason: 'cluster-competition:dominant',
          },
          {
            id: `cluster:${runnerUp.clusterKey}`,
            summary: runnerUp.summary,
            reason: 'cluster-competition:runner-up',
          },
        ]
      : [],
  } satisfies MemoryClusterState
}

export function rankByClusterDominance<T>(input: {
  normalizeOrganicRecallText: (raw: string) => string
  items: T[]
  clusterState: MemoryClusterState
  toClusterText: (item: T) => string
}) {
  if (input.items.length <= 1 || !input.clusterState.dominantClusterKey)
    return input.items

  return [...input.items]
    .map((item, index) => {
      const clusterKey = deriveMemoryClusterKey(input.normalizeOrganicRecallText, input.toClusterText(item))
      const clusterScore = input.clusterState.clusterScoreByKey.get(clusterKey) ?? 0
      const mismatchPenalty = input.clusterState.strongDominant && clusterKey && clusterKey !== input.clusterState.dominantClusterKey
        ? 0.18
        : 0
      return { item, index, score: clusterScore - mismatchPenalty }
    })
    .sort((left, right) => left.score !== right.score ? right.score - left.score : left.index - right.index)
    .map(entry => entry.item)
}

export function rankBySceneMoodEmbodiedCarry<T>(input: {
  normalizeOrganicRecallText: (raw: string) => string
  items: T[]
  toText: (item: T) => string
  getSceneWeight?: (item: T) => number | null
  recallGovernor?: AlicizationRecallGovernorSnapshot | null
}) {
  const carry = deriveAffectiveEmbodiedCarry({
    recallGovernor: input.recallGovernor ?? null,
  })
  if (
    input.items.length <= 1
    || (carry.sceneFamiliarityHint <= 0.14 && carry.moodTexts.length === 0 && carry.embodiedTexts.length === 0)
  ) {
    return input.items
  }

  return [...input.items]
    .map((item, index) => {
      const text = input.toText(item)
      const score = scoreSceneMoodEmbodiedCarryText({
        normalizeOrganicRecallText: input.normalizeOrganicRecallText,
        text,
        sceneWeight: input.getSceneWeight ? input.getSceneWeight(item) : 0,
        carry,
      })
      return { item, index, score }
    })
    .sort((left, right) => left.score !== right.score ? right.score - left.score : left.index - right.index)
    .map(entry => entry.item)
}
