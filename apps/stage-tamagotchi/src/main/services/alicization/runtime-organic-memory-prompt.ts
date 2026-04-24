import type {
  AlicizationEpisodicEventRecord,
  AlicizationHostPersonModelSnapshot,
  AlicizationRecallGovernorSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { buildHostSocialGuidance, inferHostSocialContextsFromText } from './host-social-guidance'
import { buildRelationshipDoctrineGuidance } from './relationship-doctrine-guidance'
import { deriveRecollectionSurfaceControls } from './recollection-surface-controls'
import { formatMemoryProvenanceLabel } from './humanlike-memory'
import { buildProceduralMemoryAbstractions } from './memory-procedural-abstraction'
import { buildMemoryRecollectionNarratives } from './memory-recollection-narratives'
import { buildMemoryRecollectionWindows } from './memory-recollection-windows'

interface CreateAlicizationOrganicMemoryPromptRuntimeOptions {
  normalizeOrganicRecallText: (raw: string) => string
  selectPromptActiveThoughts: (input: {
    activeThoughts: OrganicMemoryPromptContext['activeThoughts']
    recallSeed: string
    recalledFragments: OrganicMemoryPromptContext['recalledFragments']
  }) => OrganicMemoryPromptContext['activeThoughts']
  getOrganicMemorySnapshot: () => Promise<{
    hostAttitude: string
    coreIncarnation: string
    activeThoughts: OrganicMemoryPromptContext['activeThoughts']
  }>
  getLatestRelationshipDynamics: () => Promise<OrganicMemoryPromptContext['relationshipDynamics']>
  retrieveMemoryFacts: (recallSeed: string, limit: number) => Promise<OrganicMemoryPromptContext['retrievedFacts']>
  recallSubconsciousFragmentsWithGovernor: (input: {
    text: string
    recalledFragmentCap?: number
    recalledFragmentSourceBudget?: AlicizationRecallGovernorSnapshot['recalledFragmentSourceBudget']
  }) => Promise<OrganicMemoryPromptContext['recalledFragments']>
  recallEpisodicEventsWithGovernor: (input: {
    recallSeed: string
    sessionId?: string | null
    turnId?: string | null
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
  }) => Promise<AlicizationEpisodicEventRecord[]>
  buildHostPersonModel: (input?: {
    now?: number
  }) => Promise<AlicizationHostPersonModelSnapshot | null>
  recallConversationHistory: (input: {
    query: string
    limit?: number
    recollectionIntent?: AlicizationRecallGovernorSnapshot['recollectionIntent'] | null
  }) => Promise<Array<{
    turnId: string | null
    sessionId: string
    userText: string
    assistantText: string
    createdAt: number
  }>>
  recallMemoryConsolidations: (input: {
    query: string
    limit?: number
    recollectionIntent?: AlicizationRecallGovernorSnapshot['recollectionIntent'] | null
  }) => Promise<NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>>
  planRecollectionIntent?: (input: {
    recallSeed: string
    heuristicIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
    hostAttitude: string
    activeThoughts: OrganicMemoryPromptContext['activeThoughts']
    hostPersonModel?: OrganicMemoryPromptContext['hostPersonModel']
    relationshipDynamics?: OrganicMemoryPromptContext['relationshipDynamics']
  }) => Promise<OrganicMemoryPromptContext['recollectionIntent'] | null>
  planMemoryRecollection?: (input: {
    recallSeed: string
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  }) => Promise<NonNullable<OrganicMemoryPromptContext['recollectionPlan']> | null>
  planRecollectionSpeech?: (input: {
    recallSeed: string
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
    recollectionPlan: NonNullable<OrganicMemoryPromptContext['recollectionPlan']> | null
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  }) => Promise<NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']> | null>
  planMemoryDeliberation?: (input: {
    recallSeed: string
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
    recollectionPlan: NonNullable<OrganicMemoryPromptContext['recollectionPlan']> | null
    recollectionSpeechPlan: NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']> | null
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  }) => Promise<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']> | null>
  isPersonaResidueMemoryText: (text: string) => boolean
}

type RecollectionIntentSnapshot = NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
type RecollectionPlanSnapshot = NonNullable<OrganicMemoryPromptContext['recollectionPlan']>
type MemoryDeliberationSnapshot = NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>

type MemoryClusterProbe = {
  id: string
  kind: 'consolidation' | 'window' | 'procedure' | 'episode' | 'conversation'
  clusterKey: string
  clusterSummary: string
  text: string
}

type MemoryClusterState = {
  dominantClusterKey: string | null
  dominantSummary: string | null
  dominantScore: number
  runnerUpClusterKey: string | null
  runnerUpSummary: string | null
  runnerUpScore: number
  strongDominant: boolean
  ambiguous: boolean
  clusterScoreByKey: Map<string, number>
  competingVariants: Array<{
    id: string
    summary: string
    reason: string
  }>
}

export function createAlicizationOrganicMemoryPromptRuntime(options: CreateAlicizationOrganicMemoryPromptRuntimeOptions) {
  const {
    normalizeOrganicRecallText,
    selectPromptActiveThoughts,
    getOrganicMemorySnapshot,
    getLatestRelationshipDynamics,
    retrieveMemoryFacts,
    recallSubconsciousFragmentsWithGovernor,
    recallEpisodicEventsWithGovernor,
    buildHostPersonModel,
    recallConversationHistory,
    recallMemoryConsolidations,
    planRecollectionIntent,
    planMemoryRecollection,
    planRecollectionSpeech,
    planMemoryDeliberation,
    isPersonaResidueMemoryText,
  } = options

  function countRecallTermOverlap(base: string, candidate: string) {
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

  function clusterTokens(text: string) {
    const tokens = normalizeOrganicRecallText(text).toLowerCase().match(/[\p{Script=Han}]{1,8}|[a-z0-9][a-z0-9-]{1,32}/gu) ?? []
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
      ].includes(token)
    )
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
        if (hyphenParts.length > 2)
          variants.add(hyphenParts.slice(0, -1).join('-'))
        variants.add(hyphenParts[hyphenParts.length - 1]!)
        hyphenParts.forEach(part => variants.add(part))
      }
    }

    return uniqueList([...variants], maxItems)
  }

  function scoreCuePresence(text: string, cues: string[]) {
    if (cues.length === 0)
      return 0

    const normalized = normalizeOrganicRecallText(text).toLowerCase()
    if (!normalized)
      return 0
    const textTokens = new Set(clusterTokens(normalized))
    let best = 0
    for (const cue of cues) {
      const normalizedCue = normalizeOrganicRecallText(cue).toLowerCase()
      if (!normalizedCue)
        continue
      if (normalized.includes(normalizedCue))
        return 1
      const cueTokens = clusterTokens(normalizedCue)
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

  function scoreSceneMoodEmbodiedCarryText(input: {
    text: string
    sceneWeight?: number | null
    carry: ReturnType<typeof deriveAffectiveEmbodiedCarry>
  }) {
    const normalized = normalizeOrganicRecallText(input.text).toLowerCase()
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
      ? Math.max(...input.carry.moodTexts.map(line => countRecallTermOverlap(line, input.text)), 0)
      : 0
    const embodiedOverlap = input.carry.embodiedTexts.length > 0
      ? Math.max(...input.carry.embodiedTexts.map(line => countRecallTermOverlap(line, input.text)), 0)
      : 0
    const sceneCuePresence = scoreCuePresence(input.text, input.carry.sceneTexts)
    const moodCuePresence = scoreCuePresence(input.text, input.carry.moodCues)
    const embodiedCuePresence = scoreCuePresence(input.text, input.carry.embodiedCues)
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

  function deriveMemoryClusterKey(text: string) {
    const tokens = clusterTokens(text)
    if (tokens.length === 0)
      return ''
    return tokens.slice(0, 4).join(':')
  }

  function sanitizePromptText(raw: unknown, maxChars = 220) {
    if (typeof raw !== 'string')
      return ''
    return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
  }

  function clamp01(value: number) {
    if (!Number.isFinite(value))
      return 0
    return Math.max(0, Math.min(1, Number(value.toFixed(2))))
  }

  function deriveHostSocialRecallBias(input: {
    recallSeed: string
    recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
    coreIncarnation: string
  }) {
    const defaultDoctrineGuidance = buildRelationshipDoctrineGuidance({
      doctrineText: input.coreIncarnation,
      contexts: [],
    })
    const hostPersonModel = input.hostPersonModel ?? null
    if (!hostPersonModel) {
      return {
        contexts: [] as string[],
        cautious: false,
        restrained: false,
        doctrineGuidance: defaultDoctrineGuidance,
        biasTexts: [] as string[],
      }
    }

    const intentMode = input.recollectionIntent?.mode ?? 'none'
    const contexts = inferHostSocialContextsFromText([
      input.recallSeed,
      ...(input.recollectionIntent?.queryHints ?? []),
    ].join(' '), [
      intentMode === 'relationship-history' ? 'open-window' : 'general',
      intentMode === 'execution-procedure' || intentMode === 'experience-pattern' ? 'focused-work' : 'general',
    ])
    const guidance = buildHostSocialGuidance({
      hostPersonModel,
      contexts,
    })
    const doctrineGuidance = buildRelationshipDoctrineGuidance({
      doctrineText: input.coreIncarnation,
      contexts,
    })
    const biasTexts = uniqueList([
      guidance.preferenceText,
      guidance.sensitivityText,
      guidance.repairTriggerText,
      guidance.burdenText,
      guidance.trustRationale,
      doctrineGuidance.doctrineSummary,
      ...hostPersonModel.routines,
      ...hostPersonModel.sensitivities,
      ...hostPersonModel.repairTriggers,
      ...hostPersonModel.recurrentBurdens,
    ], 10)

    return {
      contexts,
      cautious: guidance.cautious,
      restrained: guidance.restrained,
      doctrineGuidance,
      trustStage: hostPersonModel?.trustLadder.stage ?? null,
      biasTexts,
    }
  }

  function deriveRelationshipStageAlignmentScore(input: {
    text: string
    recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
    coreIncarnation: string
    recallSeed: string
  }) {
    const socialBias = deriveHostSocialRecallBias({
      recallSeed: input.recallSeed,
      recollectionIntent: input.recollectionIntent,
      hostPersonModel: input.hostPersonModel,
      coreIncarnation: input.coreIncarnation,
    })
    const normalized = normalizeOrganicRecallText(input.text)
    const repairLike = /repair|space|room|lighter|boundary|distance|pressure|back off|leave room|修复|空间|边界|轻一点|距离|压力/u.test(normalized)
    const warmLike = /warm|close|closeness|directness|companionship|tender|care|open window|温和|靠近|亲密|直接|陪伴/u.test(normalized)
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
    return score
  }

  function rankByHostSocialAffinity<T>(input: {
    items: T[]
    toText: (item: T) => string
    recallSeed: string
    recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
    coreIncarnation: string
  }) {
    if (input.items.length <= 1 || (!input.hostPersonModel && !input.coreIncarnation))
      return input.items

    const socialBias = deriveHostSocialRecallBias({
      recallSeed: input.recallSeed,
      recollectionIntent: input.recollectionIntent,
      hostPersonModel: input.hostPersonModel,
      coreIncarnation: input.coreIncarnation,
    })
    if (socialBias.biasTexts.length === 0)
      return input.items

    const intentMode = input.recollectionIntent?.mode ?? 'none'
    return [...input.items]
      .map((item, index) => {
        const text = input.toText(item)
        const overlap = Math.max(
          ...socialBias.biasTexts.map(biasText => countRecallTermOverlap(biasText, text)),
          0,
        )
        const normalized = normalizeOrganicRecallText(text)
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
        return {
          item,
          index,
          score,
        }
      })
      .sort((left, right) => {
        if (left.score !== right.score)
          return right.score - left.score
        return left.index - right.index
      })
      .map(entry => entry.item)
  }

  function rankByEraAffinity<T>(input: {
    items: T[]
    eraTexts: string[]
    toText: (item: T) => string
  }) {
    if (input.items.length <= 1 || input.eraTexts.length === 0)
      return input.items

    return [...input.items]
      .map(item => ({
        item,
        score: Math.max(
          ...input.eraTexts.map(text => countRecallTermOverlap(text, input.toText(item))),
          0,
        ),
      }))
      .sort((left, right) => right.score - left.score)
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

  function rankByRecollectionAgendaAffinity<T>(input: {
    items: T[]
    recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    toText: (item: T) => string
    getFacet?: (item: T) => NonNullable<NonNullable<OrganicMemoryPromptContext['recollectionIntent']>['recollectionAgenda']>['candidateEraFacets'][number]['facet'] | null
    getAgeDays?: (item: T) => number | null
  }) {
    const agenda = input.recollectionIntent?.recollectionAgenda ?? null
    if (input.items.length <= 1 || !agenda)
      return input.items

    const facetWeights = new Map(
      (agenda.candidateEraFacets ?? []).map(item => [item.facet, item.weight] as const),
    )
    const procedureLines = agenda.candidateProcedureLines ?? []
    const emotionalPattern = /drain|mess|overwhelm|care|warm|cold|tender|annoyed|压力|累|乱|烦|温和|冷淡|情绪/u
    const relationshipPattern = /relationship|bond|trust|repair|boundary|tone|space|回应|关系|信任|修复|边界|语气|空间/u

    return [...input.items]
      .map((item, index) => {
        const text = input.toText(item)
        const normalized = normalizeOrganicRecallText(text).toLowerCase()
        const procedureOverlap = procedureLines.length > 0
          ? Math.max(...procedureLines.map(line => countRecallTermOverlap(line, text)), 0)
          : 0
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
          + facetWeight * 0.28
          + timeWeight * 0.24
          + relationshipAffinity
          + affectAffinity
          + sceneAffinity
        return {
          item,
          index,
          score,
        }
      })
      .sort((left, right) => {
        if (left.score !== right.score)
          return right.score - left.score
        return left.index - right.index
      })
      .map(entry => entry.item)
  }

  function analyzeMemoryClusters(input: {
    probes: MemoryClusterProbe[]
    recallSeed: string
    recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
    coreIncarnation: string
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
  }): MemoryClusterState {
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
      }
    }

    const recallSeedText = normalizeOrganicRecallText(input.recallSeed)
    const hintTexts = input.recollectionIntent?.queryHints ?? []
    const procedureLines = agenda?.candidateProcedureLines ?? []
    const clusterEntries = new Map<string, {
      summary: string
      score: number
      probeCount: number
    }>()
    for (const probe of input.probes) {
      const recallOverlap = countRecallTermOverlap(recallSeedText, probe.text)
      const hintOverlap = hintTexts.length > 0
        ? Math.max(...hintTexts.map(text => countRecallTermOverlap(text, probe.text)), 0)
        : 0
      const procedureOverlap = procedureLines.length > 0
        ? Math.max(...procedureLines.map(text => countRecallTermOverlap(text, probe.text)), 0)
        : 0
      const relationshipStageScore = deriveRelationshipStageAlignmentScore({
        text: probe.text,
        recollectionIntent: input.recollectionIntent,
        hostPersonModel: input.hostPersonModel,
        coreIncarnation: input.coreIncarnation,
        recallSeed: input.recallSeed,
      })
      const carryScore = scoreSceneMoodEmbodiedCarryText({
        text: probe.text,
        carry,
      })
      const baseScore = recallOverlap * 0.44
        + hintOverlap * 0.22
        + procedureOverlap * 0.2
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
              reason: 'A nearby competing thread cluster still matches the current recall cue.',
            },
            {
              id: `cluster:${runnerUp.clusterKey}`,
              summary: runnerUp.summary,
              reason: 'Another remembered thread cluster remains almost as plausible as the current leading one.',
            },
          ]
        : [],
    }
  }

  function rankByClusterDominance<T>(input: {
    items: T[]
    clusterState: MemoryClusterState
    toClusterText: (item: T) => string
  }) {
    if (input.items.length <= 1 || !input.clusterState.dominantClusterKey)
      return input.items

    return [...input.items]
      .map((item, index) => {
        const clusterKey = deriveMemoryClusterKey(input.toClusterText(item))
        const clusterScore = input.clusterState.clusterScoreByKey.get(clusterKey) ?? 0
        const mismatchPenalty = input.clusterState.strongDominant && clusterKey && clusterKey !== input.clusterState.dominantClusterKey
          ? 0.18
          : 0
        return {
          item,
          index,
          score: clusterScore - mismatchPenalty,
        }
      })
      .sort((left, right) => {
        if (left.score !== right.score)
          return right.score - left.score
        return left.index - right.index
      })
      .map(entry => entry.item)
  }

  function rankBySceneMoodEmbodiedCarry<T>(input: {
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
          text,
          sceneWeight: input.getSceneWeight ? input.getSceneWeight(item) : 0,
          carry,
        })
        return {
          item,
          index,
          score,
        }
      })
      .sort((left, right) => {
        if (left.score !== right.score)
          return right.score - left.score
        return left.index - right.index
      })
      .map(entry => entry.item)
  }

  function pickAdditionalIds<T>(input: {
    items: T[]
    count: number
    existingIds?: Set<string>
    biasTexts?: string[]
    getId: (item: T) => string
    getText: (item: T) => string
  }) {
    const existingIds = input.existingIds ?? new Set<string>()
    const biasTexts = input.biasTexts ?? []
    const ranked = biasTexts.length > 0
      ? [...input.items]
          .map((item, index) => ({
            item,
            index,
            score: Math.max(...biasTexts.map(text => countRecallTermOverlap(text, input.getText(item))), 0),
          }))
          .sort((left, right) => {
            if (left.score !== right.score)
              return right.score - left.score
            return left.index - right.index
          })
          .map(entry => entry.item)
      : input.items

    const selected: string[] = []
    for (const item of ranked) {
      const id = input.getId(item)
      if (!id || existingIds.has(id))
        continue
      selected.push(id)
      existingIds.add(id)
      if (selected.length >= input.count)
        break
    }
    return selected
  }

  function collectRecollectionRelationshipLines(input: {
    recollectionIntent: RecollectionIntentSnapshot | null
    recollectionPlan: RecollectionPlanSnapshot | null
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    selectedConsolidationIds: Set<string>
    selectedEpisodeIds: Set<string>
  }) {
    return uniqueList([
      ...(input.recollectionPlan?.selectedRelationshipLines ?? []),
      ...input.recalledEpisodes
        .filter(item => input.selectedEpisodeIds.has(item.id))
        .flatMap(item => [item.relationshipMeaning, item.lesson]),
      ...input.consolidatedMemories
        .filter(item => input.selectedConsolidationIds.has(item.id))
        .flatMap(item => [item.lesson]),
      ...(input.recollectionIntent?.mode === 'relationship-history'
        ? input.recalledEpisodes.slice(0, 2).flatMap(item => [item.relationshipMeaning, item.lesson])
        : []),
    ], 3)
  }

  function resolveRecollectionPlanSearch(input: {
    recollectionIntent: RecollectionIntentSnapshot | null
    recollectionPlan: RecollectionPlanSnapshot | null
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
    clusterState?: MemoryClusterState | null
  }): RecollectionPlanSnapshot | null {
    const plan = input.recollectionPlan ?? null
    if (!plan)
      return null

    const agenda = input.recollectionIntent?.recollectionAgenda ?? null
    const clusterState = input.clusterState ?? null
    const selectedConsolidationIds = new Set(plan.selectedConsolidationIds)
    const selectedWindowIds = new Set(plan.selectedWindowIds)
    const selectedProceduralIds = new Set(plan.selectedProceduralIds)
    const selectedEpisodeIds = new Set(plan.selectedEpisodeIds)
    const selectedConversationTurnIds = new Set(plan.selectedConversationTurnIds)

    const preferredPrimaryFocus: NonNullable<RecollectionPlanSnapshot['searchTrace']>['firstHop']['focus']
      = plan.searchTrace?.firstHop.focus
        ?? (
          selectedProceduralIds.size > 0 || input.recollectionIntent?.mode === 'execution-procedure' || input.recollectionIntent?.mode === 'experience-pattern' || (agenda?.goalSimilarity ?? 0) >= 0.58
            ? 'procedure'
            : (
                (agenda?.relationshipNeed ?? 0) >= 0.5 || input.recollectionIntent?.mode === 'relationship-history'
                  ? 'relationship-line'
                  : selectedConsolidationIds.size > 0 || selectedWindowIds.size > 0 || (agenda?.candidateEraFacets.length ?? 0) > 0
                    ? 'era'
                    : input.recollectionIntent?.mode === 'conversation-history' || selectedConversationTurnIds.size > 0
                      ? 'conversation-turn'
                      : 'episode'
              )
        )

    const addPrimaryEraIfNeeded = () => {
      if (selectedConsolidationIds.size > 0 || selectedWindowIds.size > 0)
        return
      const preferredFacet = agenda?.candidateEraFacets[0]?.facet ?? null
      const preferredConsolidation = input.consolidatedMemories.find(item => !preferredFacet || item.facet === preferredFacet || preferredFacet === 'window')
      if (preferredConsolidation) {
        selectedConsolidationIds.add(preferredConsolidation.id)
        return
      }
      const preferredWindow = input.recollectedWindows[0]
      if (preferredWindow)
        selectedWindowIds.add(preferredWindow.id)
    }

    const addPrimaryProcedureIfNeeded = () => {
      if (selectedProceduralIds.size > 0)
        return
      const selected = pickAdditionalIds({
        items: input.proceduralMemories,
        count: 1,
        existingIds: selectedProceduralIds,
        biasTexts: [
          ...(agenda?.candidateProcedureLines ?? []),
          ...(plan.selectedRelationshipLines ?? []),
        ],
        getId: item => item.id,
        getText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
      })
      for (const id of selected)
        selectedProceduralIds.add(id)
    }

    const selectedRelationshipLines = (() => {
      const baseline = collectRecollectionRelationshipLines({
        recollectionIntent: input.recollectionIntent,
        recollectionPlan: plan,
        consolidatedMemories: input.consolidatedMemories,
        recalledEpisodes: input.recalledEpisodes,
        selectedConsolidationIds,
        selectedEpisodeIds,
      })
      if (baseline.length > 0)
        return baseline
      if (preferredPrimaryFocus !== 'relationship-line')
        return baseline
      return uniqueList([
        ...input.recalledEpisodes.slice(0, 2).flatMap(item => [item.relationshipMeaning, item.lesson]),
        ...input.consolidatedMemories.slice(0, 2).map(item => item.lesson),
      ], 3)
    })()

    const selectedEraTexts = [
      ...input.consolidatedMemories
        .filter(item => selectedConsolidationIds.has(item.id))
        .flatMap(item => [item.summary, item.lesson ?? '', ...item.cues]),
      ...input.recollectedWindows
        .filter(item => selectedWindowIds.has(item.id))
        .flatMap(item => [item.summary, ...item.cues]),
    ].filter(Boolean)
    const selectedProcedureTexts = [
      ...(agenda?.candidateProcedureLines ?? []),
      ...input.proceduralMemories
        .filter(item => selectedProceduralIds.has(item.id))
        .flatMap(item => [item.label, item.approach, ...(item.cues ?? [])]),
    ].filter(Boolean)
    const relationshipBiasTexts = selectedRelationshipLines.length > 0
      ? selectedRelationshipLines
      : uniqueList(input.recalledEpisodes.slice(0, 2).flatMap(item => [item.relationshipMeaning, item.lesson]), 3)

    let secondHopAction: NonNullable<RecollectionPlanSnapshot['searchTrace']>['secondHop']['action'] = plan.searchTrace?.secondHop.action ?? 'hold'
    let evidenceGap: NonNullable<RecollectionPlanSnapshot['searchTrace']>['secondHop']['evidenceGap'] = plan.searchTrace?.secondHop.evidenceGap ?? 'none'
    const secondHopTargetIds: string[] = []

    if (preferredPrimaryFocus === 'procedure') {
      addPrimaryProcedureIfNeeded()
      if (selectedConsolidationIds.size === 0 && selectedWindowIds.size === 0) {
        addPrimaryEraIfNeeded()
        secondHopAction = plan.searchTrace?.secondHop.action ?? 'expand-procedure'
        evidenceGap = plan.searchTrace?.secondHop.evidenceGap ?? 'need-period-anchor'
      }
      if (selectedEpisodeIds.size === 0) {
        const selected = pickAdditionalIds({
          items: input.recalledEpisodes,
          count: 2,
          existingIds: selectedEpisodeIds,
          biasTexts: selectedProcedureTexts,
          getId: item => item.id,
          getText: item => [item.threadAnchor, item.whatHappened, item.lesson, ...(item.tags ?? [])].filter(Boolean).join(' '),
        })
        for (const id of selected)
          selectedEpisodeIds.add(id)
        secondHopTargetIds.push(...selected)
        if (selected.length > 0) {
          secondHopAction = plan.searchTrace?.secondHop.action ?? 'expand-procedure'
          evidenceGap = plan.searchTrace?.secondHop.evidenceGap ?? 'need-episode-detail'
        }
      }
    }
    else if (preferredPrimaryFocus === 'relationship-line') {
      if ((agenda?.candidateEraFacets.some(item => item.facet === 'relationship-era') ?? false) && selectedConsolidationIds.size === 0 && selectedWindowIds.size === 0)
        addPrimaryEraIfNeeded()
      if (selectedEpisodeIds.size === 0) {
        const selected = pickAdditionalIds({
          items: input.recalledEpisodes,
          count: 2,
          existingIds: selectedEpisodeIds,
          biasTexts: relationshipBiasTexts,
          getId: item => item.id,
          getText: item => [item.relationshipMeaning, item.lesson, item.whatHappened, ...(item.tags ?? [])].filter(Boolean).join(' '),
        })
        for (const id of selected)
          selectedEpisodeIds.add(id)
        secondHopTargetIds.push(...selected)
      }
      if (selectedConversationTurnIds.size === 0 && input.recollectionIntent?.mode === 'relationship-history') {
        const selected = pickAdditionalIds({
          items: input.recalledConversationHistory,
          count: 1,
          existingIds: selectedConversationTurnIds,
          biasTexts: relationshipBiasTexts,
          getId: item => item.turnId ?? '',
          getText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
        })
        for (const id of selected)
          selectedConversationTurnIds.add(id)
        secondHopTargetIds.push(...selected)
      }
      if (secondHopTargetIds.length > 0) {
        secondHopAction = plan.searchTrace?.secondHop.action ?? 'expand-relationship-line'
        evidenceGap = plan.searchTrace?.secondHop.evidenceGap ?? (
          selectedEpisodeIds.size > 0 ? 'need-relationship-meaning' : 'need-conversation-evidence'
        )
      }
    }
    else if (preferredPrimaryFocus === 'era') {
      addPrimaryEraIfNeeded()
      if (selectedEpisodeIds.size === 0) {
        const selected = pickAdditionalIds({
          items: rankByEraAffinity({
            items: input.recalledEpisodes,
            eraTexts: selectedEraTexts,
            toText: item => [item.threadAnchor, item.whatHappened, item.lesson, ...(item.tags ?? [])].filter(Boolean).join(' '),
          }),
          count: 2,
          existingIds: selectedEpisodeIds,
          getId: item => item.id,
          getText: item => [item.threadAnchor, item.whatHappened, item.lesson, ...(item.tags ?? [])].filter(Boolean).join(' '),
        })
        for (const id of selected)
          selectedEpisodeIds.add(id)
        secondHopTargetIds.push(...selected)
        if (selected.length > 0) {
          secondHopAction = plan.searchTrace?.secondHop.action ?? 'expand-era'
          evidenceGap = plan.searchTrace?.secondHop.evidenceGap ?? 'need-episode-detail'
        }
      }
      if ((input.recollectionIntent?.mode === 'execution-procedure' || input.recollectionIntent?.mode === 'experience-pattern' || (agenda?.goalSimilarity ?? 0) >= 0.5) && selectedProceduralIds.size === 0) {
        const selected = pickAdditionalIds({
          items: rankByEraAffinity({
            items: input.proceduralMemories,
            eraTexts: selectedEraTexts.length > 0 ? selectedEraTexts : selectedProcedureTexts,
            toText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
          }),
          count: 1,
          existingIds: selectedProceduralIds,
          getId: item => item.id,
          getText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
        })
        for (const id of selected)
          selectedProceduralIds.add(id)
        secondHopTargetIds.push(...selected)
        secondHopAction = plan.searchTrace?.secondHop.action ?? 'expand-era'
        evidenceGap = plan.searchTrace?.secondHop.evidenceGap ?? 'need-procedure-detail'
      }
      if (selectedConversationTurnIds.size === 0 && input.recollectionIntent?.mode === 'conversation-history') {
        const selected = pickAdditionalIds({
          items: rankByEraAffinity({
            items: input.recalledConversationHistory,
            eraTexts: selectedEraTexts,
            toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
          }),
          count: 1,
          existingIds: selectedConversationTurnIds,
          getId: item => item.turnId ?? '',
          getText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
        })
        for (const id of selected)
          selectedConversationTurnIds.add(id)
        secondHopTargetIds.push(...selected)
        secondHopAction = plan.searchTrace?.secondHop.action ?? 'expand-conversation'
        evidenceGap = plan.searchTrace?.secondHop.evidenceGap ?? 'need-conversation-evidence'
      }
    }
    else if (preferredPrimaryFocus === 'conversation-turn') {
      if (selectedConversationTurnIds.size === 0) {
        const selected = pickAdditionalIds({
          items: input.recalledConversationHistory,
          count: 1,
          existingIds: selectedConversationTurnIds,
          biasTexts: [
            ...(agenda?.candidateProcedureLines ?? []),
            ...(plan.selectedRelationshipLines ?? []),
          ],
          getId: item => item.turnId ?? '',
          getText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
        })
        for (const id of selected)
          selectedConversationTurnIds.add(id)
        secondHopTargetIds.push(...selected)
        if (selected.length > 0) {
          secondHopAction = plan.searchTrace?.secondHop.action ?? 'expand-conversation'
          evidenceGap = plan.searchTrace?.secondHop.evidenceGap ?? 'need-conversation-evidence'
        }
      }
      if (selectedConsolidationIds.size === 0 && selectedWindowIds.size === 0) {
        addPrimaryEraIfNeeded()
        secondHopAction = plan.searchTrace?.secondHop.action ?? 'expand-conversation'
        evidenceGap = plan.searchTrace?.secondHop.evidenceGap ?? 'need-period-anchor'
      }
    }
    else {
      if (selectedEpisodeIds.size === 0) {
        const selected = pickAdditionalIds({
          items: input.recalledEpisodes,
          count: 1,
          existingIds: selectedEpisodeIds,
          biasTexts: [
            ...selectedProcedureTexts,
            ...relationshipBiasTexts,
          ],
          getId: item => item.id,
          getText: item => [item.threadAnchor, item.whatHappened, item.lesson].filter(Boolean).join(' '),
        })
        for (const id of selected)
          selectedEpisodeIds.add(id)
        secondHopTargetIds.push(...selected)
      }
    }

    const selectedEpisodes = input.recalledEpisodes.filter(item => selectedEpisodeIds.has(item.id))
    const conflictingVariants = selectedEpisodes.filter(item => {
      const provenance = item.latestReconsolidation?.provenance ?? item.provenance
      return provenance === 'reconstructed' || provenance === 'dreamt' || provenance === 'inferred'
    })
    const ambiguityPosture: NonNullable<RecollectionPlanSnapshot['searchTrace']>['thirdHop']['ambiguityPosture']
      = plan.searchTrace?.thirdHop.ambiguityPosture
        ?? (clusterState?.ambiguous ? 'ambiguous' : null)
        ?? (
          conflictingVariants.length >= 2
            ? 'ambiguous'
            : conflictingVariants.length === 1 || plan.certainty !== 'firm' || secondHopTargetIds.length > 0
              ? 'approximate'
              : 'settled'
        )

    const firstHopTargetIds = preferredPrimaryFocus === 'era'
      ? [...selectedConsolidationIds, ...selectedWindowIds].slice(0, 3)
      : preferredPrimaryFocus === 'procedure'
        ? [...selectedProceduralIds].slice(0, 2)
        : preferredPrimaryFocus === 'relationship-line'
          ? [...selectedEpisodeIds].slice(0, 2)
          : preferredPrimaryFocus === 'conversation-turn'
            ? [...selectedConversationTurnIds].slice(0, 2)
            : [...selectedEpisodeIds].slice(0, 2)

    const firstHopSummary = plan.searchTrace?.firstHop.summary
      ?? (
        preferredPrimaryFocus === 'procedure'
          ? 'The recollection first grabs the remembered way of handling this kind of task.'
          : preferredPrimaryFocus === 'relationship-line'
            ? 'The recollection first grabs a remembered relationship meaning before exact detail.'
            : preferredPrimaryFocus === 'era'
              ? 'The recollection first grabs a remembered period or era before unpacking fragments.'
              : preferredPrimaryFocus === 'conversation-turn'
                ? 'The recollection first grabs one remembered exchange before broadening out.'
                : 'The recollection first grabs one remembered episode.'
      )
    const secondHopSummary = plan.searchTrace?.secondHop.summary
      ?? (
        secondHopAction === 'hold'
          ? 'The first remembered anchor already carries enough evidence, so the search does not need to widen.'
          : secondHopAction === 'narrow-to-stable-core'
            ? 'The search narrows toward the stable core because remembered variants do not fully agree.'
            : 'The search expands from the first anchor to gather enough remembered evidence for a coherent answer.'
      )
    const thirdHopSummary = plan.searchTrace?.thirdHop.summary
      ?? (
        ambiguityPosture === 'ambiguous'
          ? clusterState?.dominantSummary && clusterState?.runnerUpSummary
            ? `The recollection leans toward "${clusterState.dominantSummary}" but "${clusterState.runnerUpSummary}" still shadows it, so the answer should stay ambiguity-aware.`
            : 'The remembered material still branches in more than one direction, so the answer should stay openly ambiguity-aware.'
          : ambiguityPosture === 'approximate'
            ? 'The remembered material is usable but not exact, so the answer should stay approximate.'
            : 'The remembered material feels coherent enough to be carried with normal confidence.'
      )

    const certainty: RecollectionPlanSnapshot['certainty']
      = ambiguityPosture === 'ambiguous'
        ? 'fragmentary'
        : ambiguityPosture === 'approximate' && plan.certainty === 'firm'
          ? 'approximate'
          : plan.certainty

    return {
      ...plan,
      selectedConsolidationIds: [...selectedConsolidationIds].slice(0, 6),
      selectedWindowIds: [...selectedWindowIds].slice(0, 6),
      selectedProceduralIds: [...selectedProceduralIds].slice(0, 6),
      selectedEpisodeIds: [...selectedEpisodeIds].slice(0, 6),
      selectedConversationTurnIds: [...selectedConversationTurnIds].slice(0, 6),
      selectedRelationshipLines,
      certainty,
      searchTrace: {
        firstHop: {
          focus: preferredPrimaryFocus,
          summary: firstHopSummary,
          targetIds: plan.searchTrace?.firstHop.targetIds?.length ? plan.searchTrace.firstHop.targetIds.slice(0, 6) : firstHopTargetIds,
        },
        secondHop: {
          action: secondHopAction,
          evidenceGap,
          summary: secondHopSummary,
          targetIds: plan.searchTrace?.secondHop.targetIds?.length ? plan.searchTrace.secondHop.targetIds.slice(0, 6) : secondHopTargetIds.slice(0, 6),
        },
        thirdHop: {
          ambiguityPosture,
          summary: thirdHopSummary,
        },
      },
    } satisfies RecollectionPlanSnapshot
  }

  function applyMemoryDeliberationToSpeechPlan(input: {
    deliberation: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']> | null
    speechPlan: NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']> | null
  }) {
    const deliberation = input.deliberation ?? null
    const speechPlan = input.speechPlan ?? null
    if (!deliberation)
      return speechPlan

    const shouldSurface = deliberation.shouldRecall && deliberation.surfacePolicy !== 'internal-only'
    return {
      shouldSurface,
      surfaceMode: shouldSurface ? deliberation.surfacePolicy : 'internal-only',
      placement: shouldSurface
        ? (speechPlan?.placement && speechPlan.placement !== 'internal-only'
            ? speechPlan.placement
            : deliberation.surfacePolicy === 'gist-first'
              ? 'before-payoff'
              : 'inside-payoff')
        : 'internal-only',
      certainty: speechPlan?.certainty ?? 'approximate',
      internalLead: deliberation.inwardLine || speechPlan?.internalLead || '',
      visibleLead: shouldSurface
        ? deliberation.visibleLine || speechPlan?.visibleLead || null
        : null,
      styleNote: speechPlan?.styleNote || 'Let recollection contour the answer without turning into a rigid reply shell.',
      rationale: deliberation.whyNow || speechPlan?.rationale || '',
      confidence: deliberation.confidence,
    } satisfies NonNullable<OrganicMemoryPromptContext['recollectionSpeechPlan']>
  }

  function rankMemoryDeliberationBundles(input: {
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']> | null
    bundles: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['selectedBundles']
  }) {
    const intentMode = input.recollectionIntent?.mode ?? 'none'
    return [...input.bundles]
      .map((bundle) => {
        let coherence = 0
        if (bundle.periodId && bundle.episodeId)
          coherence += 0.18
        if (bundle.procedureId && bundle.episodeId)
          coherence += 0.18
        if (bundle.relationshipLine)
          coherence += 0.12
        if (bundle.conversationTurnId)
          coherence += 0.1
        if (bundle.procedureId && (intentMode === 'execution-procedure' || intentMode === 'experience-pattern'))
          coherence += 0.22
        if (bundle.conversationTurnId && intentMode === 'conversation-history')
          coherence += 0.2
        if (bundle.periodId && (intentMode === 'autobiographical-history' || intentMode === 'relationship-history'))
          coherence += 0.16
        if (bundle.relationshipLine && intentMode === 'relationship-history')
          coherence += 0.18
        return {
          bundle,
          score: bundle.confidence + coherence,
        }
      })
      .sort((left, right) => right.score - left.score)
      .map(item => item.bundle)
      .slice(0, 4)
  }

  function rankMemoryDeliberationChains(input: {
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']> | null
    chains: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['selectedChains']
  }) {
    const intentMode = input.recollectionIntent?.mode ?? 'none'
    return [...input.chains]
      .map((chain) => {
        let coherence = 0
        if (chain.currentStance)
          coherence += 0.12
        if (chain.answerPosture)
          coherence += 0.14
        if (chain.periodSummary && chain.eventSummary)
          coherence += 0.16
        if (chain.procedureSummary && chain.relationshipMeaning)
          coherence += 0.16
        if (chain.lesson)
          coherence += 0.1
        if (chain.kind === 'task-procedure-relationship-stance' && (intentMode === 'execution-procedure' || intentMode === 'experience-pattern'))
          coherence += 0.24
        if (chain.kind === 'period-event-lesson-posture' && (intentMode === 'relationship-history' || intentMode === 'autobiographical-history' || intentMode === 'conversation-history'))
          coherence += 0.22
        return {
          chain,
          score: chain.confidence + coherence,
        }
      })
      .sort((left, right) => right.score - left.score)
      .map(item => item.chain)
      .slice(0, 4)
  }

  function selectMemoryDeliberationEras(input: {
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']> | null
    selectedEraIds: string[]
    selectedConsolidationIds: string[]
    selectedWindowIds: string[]
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
  }) {
    const eraCandidates = [
      ...input.consolidatedMemories.map(item => ({
        id: item.id,
        facet: item.facet ?? 'phase',
        summary: item.summary,
        confidence: item.confidence,
      })),
      ...input.recollectedWindows.map(item => ({
        id: item.id,
        facet: 'window' as const,
        summary: item.summary,
        confidence: item.confidence,
      })),
    ]
    const selectedEraIds = new Set(
      input.selectedEraIds.length > 0
        ? input.selectedEraIds
        : [
            ...input.selectedConsolidationIds,
            ...input.selectedWindowIds,
          ],
    )
    const preferredAgendaFacets = (input.recollectionIntent?.recollectionAgenda?.candidateEraFacets ?? [])
      .slice()
      .sort((left, right) => right.weight - left.weight)
      .map(item => item.facet)
    const inferredFacet = input.recollectionIntent?.mode === 'relationship-history'
      ? 'relationship-era'
      : input.recollectionIntent?.mode === 'execution-procedure' || input.recollectionIntent?.mode === 'experience-pattern'
        ? 'task-era'
        : input.recollectionIntent?.mode === 'autobiographical-history'
          ? 'self-era'
          : null
    const prioritized = selectedEraIds.size > 0
      ? eraCandidates.filter(item => selectedEraIds.has(item.id))
      : preferredAgendaFacets.length > 0
        ? eraCandidates.filter(item => preferredAgendaFacets.includes(item.facet as typeof preferredAgendaFacets[number]) || item.facet === 'window')
      : inferredFacet
        ? eraCandidates.filter(item => item.facet === inferredFacet || item.facet === 'window')
        : eraCandidates
    return [...prioritized]
      .sort((left, right) => right.confidence - left.confidence)
      .map(item => ({
        id: item.id,
        facet: item.facet,
        summary: item.summary,
      }))
      .slice(0, 3)
  }

  function deriveMemoryDeliberationConflictState(input: {
    deliberation: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']> | null
    episodes: AlicizationEpisodicEventRecord[]
    periods: Array<{ summary: string }>
    procedures: Array<{ approach: string, label: string }>
    relationshipLines: string[]
    interferenceVariants?: Array<{ id: string, summary: string, reason: string }>
  }): Pick<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>, 'conflictSeverity' | 'conflictVariants' | 'stableCore' | 'unsafeDetails'> {
    const explicitVariants: NonNullable<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictVariants']> = input.deliberation?.conflictVariants ?? []
    const inferredVariants: NonNullable<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictVariants']> = input.episodes
      .filter(item => (item.latestReconsolidation?.provenance ?? item.provenance) === 'reconstructed')
      .map(item => ({
        id: item.id,
        summary: item.whatHappened,
        provenance: item.latestReconsolidation?.provenance ?? item.provenance,
          reason: item.latestReconsolidation?.reason ?? null,
        }))
    const interferenceVariants: NonNullable<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictVariants']> = (input.interferenceVariants ?? [])
      .map(item => ({
        id: item.id,
        summary: item.summary,
        provenance: 'reconstructed' as const,
        reason: item.reason,
      }))
    const conflictVariants: NonNullable<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictVariants']> = explicitVariants.length > 0
      ? explicitVariants
      : [...inferredVariants, ...interferenceVariants]

    const explicitSeverity = input.deliberation?.conflictSeverity
    const inferredSeverity: NonNullable<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictSeverity']> = conflictVariants.length >= 2
      ? 'high'
      : conflictVariants.length === 1
        ? 'medium'
        : input.episodes.some(item => (item.latestReconsolidation?.provenance ?? item.provenance) === 'dreamt' || (item.latestReconsolidation?.provenance ?? item.provenance) === 'inferred')
          ? 'low'
          : 'none'
    const conflictSeverity: NonNullable<NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['conflictSeverity']> = explicitSeverity && explicitSeverity !== 'none'
      ? explicitSeverity
      : inferredSeverity

    const stableCore = (input.deliberation?.stableCore?.length ?? 0) > 0
      ? input.deliberation?.stableCore ?? []
      : uniqueList([
          ...input.periods.map(item => item.summary),
          ...input.procedures.flatMap(item => [item.label, item.approach]),
          ...input.relationshipLines,
        ], 6)

    const unsafeDetails = (input.deliberation?.unsafeDetails?.length ?? 0) > 0
      ? input.deliberation?.unsafeDetails ?? []
      : uniqueList(conflictVariants.flatMap(item => [item.summary, item.reason]), 6)

    return {
      conflictSeverity,
      conflictVariants: conflictVariants.slice(0, 4),
      stableCore,
      unsafeDetails,
    }
  }

  function deriveSceneTriggeredRecollectionIntent(input: {
    recallSeed: string
    recalledEpisodes: AlicizationEpisodicEventRecord[]
  }): OrganicMemoryPromptContext['recollectionIntent'] | null {
    const lead = input.recalledEpisodes[0] ?? null
    if (!lead)
      return null

    const familiarity = Math.max(lead.sceneAttachment ?? 0, Math.min(1, (lead.recallCount ?? 0) / 4))
    const provenance = lead.latestReconsolidation?.provenance ?? lead.provenance
    if (familiarity < 0.44 && provenance !== 'remembered' && provenance !== 'observed')
      return null

    const leadText = [
      lead.threadAnchor,
      lead.whereSummary,
      lead.whatHappened,
      lead.relationshipMeaning,
      lead.lesson,
      ...(lead.tags ?? []),
      ...(lead.emotionTags ?? []),
    ].filter(Boolean).join(' ').toLowerCase()
    const relationshipTriggered = /relationship|bond|closeness|space|boundary|repair|tone|回应|关系|靠近|空间|边界|修复/u.test(leadText)
    const procedureTriggered = /runtime|procedure|patch|verify|task|execution|workflow|步骤|执行|修复/u.test(leadText)

    return {
      mode: relationshipTriggered
        ? 'relationship-history'
        : procedureTriggered
          ? 'experience-pattern'
          : 'autobiographical-history',
      temporalFocus: 'experience-matched',
      searchEpisodes: true,
      searchConversations: false,
      searchProceduralExperience: procedureTriggered,
      queryHints: uniqueList([
        lead.threadAnchor,
        lead.relationshipMeaning,
        lead.lesson,
        ...(lead.tags ?? []),
      ], 6),
      rationale: sanitizePromptText(
        relationshipTriggered
          ? 'The current scene naturally tugs on a familiar relationship pattern even without an explicit retrospective question.'
          : procedureTriggered
            ? 'The current scene naturally tugs on a familiar way of handling this same kind of task.'
            : 'The current scene naturally tugs on a familiar remembered pattern.',
        220,
      ),
      confidence: clamp01(0.42 + familiarity * 0.32 + (provenance === 'remembered' || provenance === 'observed' ? 0.12 : 0)),
      recollectionAgenda: {
        whyRecallNow: relationshipTriggered
          ? 'The current scene feels like an earlier relationship phase, so bond continuity is worth recalling.'
          : procedureTriggered
            ? 'The current scene feels like an earlier task pattern, so remembered procedure continuity is worth recalling.'
            : 'The current scene feels familiar enough to open a remembered autobiographical lane.',
        goalSimilarity: clamp01(procedureTriggered ? 0.52 + familiarity * 0.28 : familiarity * 0.3),
        relationshipNeed: clamp01(relationshipTriggered ? 0.48 + familiarity * 0.24 : familiarity * 0.18),
        affectivePull: clamp01(familiarity * 0.34 + ((lead.emotionTags ?? []).length > 0 ? 0.12 : 0)),
        sceneFamiliarity: clamp01(familiarity),
        candidateTimeScopes: [
          {
            scope: 'experience-matched',
            weight: clamp01(0.46 + familiarity * 0.22),
            rationale: 'The scene matches a remembered pattern more than a fixed timestamp.',
          },
          {
            scope: 'recent-or-mid',
            weight: clamp01(0.28 + familiarity * 0.16),
            rationale: 'Start from a plausible remembered period before expanding farther out.',
          },
        ],
        candidateEraFacets: [
          {
            facet: relationshipTriggered ? 'relationship-era' : procedureTriggered ? 'task-era' : 'self-era',
            weight: clamp01(0.54 + familiarity * 0.2),
            rationale: 'The scene is pulling toward this remembered kind of period first.',
          },
          {
            facet: 'window',
            weight: clamp01(0.26 + familiarity * 0.14),
            rationale: 'A period window can safely anchor the recall before exact detail.',
          },
        ],
        candidateProcedureLines: uniqueList([
          lead.threadAnchor,
          lead.lesson,
          lead.relationshipMeaning,
          ...(lead.tags ?? []),
        ], 4),
        uncertaintyTolerance: provenance === 'remembered' || provenance === 'observed' ? 'medium' : 'low',
      },
    }
  }

  function buildProactiveRecallSeed(input: {
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    phantomSeed?: string
  }) {
    return [
      normalizeOrganicRecallText(input.foregroundWindow?.appName ?? ''),
      normalizeOrganicRecallText(input.foregroundWindow?.processName ?? ''),
      normalizeOrganicRecallText(input.foregroundWindow?.title ?? ''),
      normalizeOrganicRecallText(input.phantomSeed ?? ''),
    ].filter(Boolean).join(' | ')
  }

  function buildOrganicMemorySystemBlocks(context: OrganicMemoryPromptContext) {
    const blocks: string[] = []
    if (context.hostAttitude) {
      blocks.push([
        '[ALICIZATION_HOST_ATTITUDE]',
        `当前关系态度：${context.hostAttitude}`,
      ].join('\n'))
    }

    if (context.coreIncarnation) {
      blocks.push([
        '[ALICIZATION_CORE_INCARNATION]',
        '这是你当前的摇光心意。它是你理解宿主、理解自己、理解关系的灵魂基底。',
        context.coreIncarnation,
      ].join('\n'))
    }

    if (context.retrievedFacts.length > 0) {
      blocks.push([
        '[ALICIZATION_FACT_LEDGER]',
        'These semantic memory facts are durable carry-over context, not proof of the current scene.',
        'If you reuse them, present them as memory, continuity, or previously learned truth rather than fresh observation.',
        ...context.retrievedFacts.map((fact) => {
          return `- ${fact.subject} ${fact.predicate} ${fact.object} | confidence=${fact.confidence.toFixed(2)} | source=${fact.source} | provenance=${formatMemoryProvenanceLabel(fact.provenance ?? 'remembered')}`
        }),
      ].join('\n'))
    }

    if (context.activeThoughts.length > 0) {
      blocks.push([
        '[ALICIZATION_ACTIVE_THOUGHTS]',
        'These are background continuity residues. Reuse them only when they truly match the current living focus.',
        'They are unresolved threads, not speech-style instructions.',
        '以下是你最近仍在持续关注的活跃思绪：',
        ...context.activeThoughts.map(item => `- ${item.text}`),
      ].join('\n'))
    }

    if (context.recalledFragments.length > 0) {
      const autobiographicalEpisodes = context.recalledFragments.filter(item => item.sourceKind === 'autobiographical-episode')
      const otherFragments = context.recalledFragments.filter(item => item.sourceKind !== 'autobiographical-episode')
      if (autobiographicalEpisodes.length > 0) {
        blocks.push([
          '[ALICIZATION_AUTOBIOGRAPHICAL_EPISODES]',
          'These are remembered autobiographical episodes: things Alicization went through that changed how she understands herself or the bond.',
          'Reuse them as lived history or self continuity, never as fresh scene proof.',
          ...autobiographicalEpisodes.map(item => `[自传回想：${JSON.stringify({
            sourceKind: item.sourceKind,
            text: item.text,
            provenance: formatMemoryProvenanceLabel(item.provenance ?? 'remembered'),
          })}]`),
        ].join('\n'))
      }

      if (otherFragments.length > 0) {
        blocks.push([
          '[ALICIZATION_ASSOCIATIVE_RECALL]',
          'These recalled fragments are secondary to the present scene and must never override fresh grounding.',
          ...otherFragments.map(item => `[触景生情：你隐约回想起了过去的某件事 -> ${JSON.stringify({
            sourceKind: item.sourceKind,
            text: item.text,
            provenance: formatMemoryProvenanceLabel(item.provenance ?? 'remembered'),
          })}]`),
        ].join('\n'))
      }
    }

    if ((context.recalledEpisodes ?? []).length > 0) {
      blocks.push([
        '[ALICIZATION_EVENT_GRAPH_RECALL]',
        'These are structured autobiographical events, not loose fragments. Treat them as lived history with explicit provenance.',
        'Observed/remembered events may support continuity. Dreamt/inferred/reconstructed events must be labeled as such if surfaced.',
        ...(context.recalledEpisodes ?? []).map((event) => {
          const provenance = event.latestReconsolidation?.provenance ?? event.provenance
          return `- when=${new Date(event.occurredAt).toISOString()} | where=${event.whereSummary ?? 'unspecified'} | with=${event.withWhom.join(', ') || 'host'} | what=${event.whatHappened} | felt=${event.felt ?? 'n/a'} | changed=${event.whatChanged ?? 'n/a'} | source=${event.sourceKind} | provenance=${formatMemoryProvenanceLabel(provenance)} | confidence=${event.confidence.toFixed(2)}`
        }),
      ].join('\n'))
    }

    if ((context.recalledConversationHistory ?? []).length > 0) {
      blocks.push([
        '[ALICIZATION_DEEP_CONVERSATION_RECALL]',
        'These are older conversation excerpts reconstructed from long-range history search.',
        'Use them when the host explicitly asks what we talked about before. Present them as recalled conversation history, not perfect verbatim certainty.',
        ...(context.recalledConversationHistory ?? []).map((item) => {
          return `- when=${new Date(item.createdAt).toISOString()} | session=${item.sessionId} | provenance=reconstructed | host=${item.userText || 'n/a'} | me=${item.assistantText || 'n/a'}`
        }),
      ].join('\n'))
    }

    if ((context.consolidatedMemories ?? []).length > 0) {
      blocks.push([
        '[ALICIZATION_CONSOLIDATED_MEMORY]',
        'These are consolidated autobiographical summaries distilled from repeated events over time.',
        'Prefer starting from one of these summaries before unpacking raw memory pieces.',
        ...(context.consolidatedMemories ?? []).map((item) => {
          return `- kind=${item.kind} | facet=${item.facet ?? 'none'} | period=${item.periodKey} | confidence=${item.confidence.toFixed(2)} | provenance=${item.dominantProvenance} | summary=${item.summary} | lesson=${item.lesson ?? 'none'} | cues=${item.cues.join(' ; ')}`
        }),
      ].join('\n'))
    }

    if ((context.recollectedWindows ?? []).length > 0) {
      blocks.push([
        '[ALICIZATION_RECOLLECTED_PERIODS]',
        'These are the memory periods the mind is currently drifting toward before speaking.',
        'Think from the recalled period first, then pull details from its cues, instead of listing unrelated fragments.',
        ...(context.recollectedWindows ?? []).map((window) => {
          return `- period=${window.label} | when=${new Date(window.startedAt).toISOString()}..${new Date(window.endedAt).toISOString()} | confidence=${window.confidence.toFixed(2)} | provenance=${window.dominantProvenance} | summary=${window.summary} | cues=${window.cues.join(' ; ')}`
        }),
      ].join('\n'))
    }

    if ((context.recollectionNarratives ?? []).length > 0) {
      blocks.push([
        '[ALICIZATION_RECOLLECTION_NARRATIVES]',
        'These are gist-first recall surfaces. Start from one of them before unpacking details, like a human first remembering the period and only then the fragments.',
        ...(context.recollectionNarratives ?? []).map((item) => {
          return `- mode=${item.mode} | certainty=${item.certainty} | confidence=${item.confidence.toFixed(2)} | cues=${item.supportCues.join(' ; ')}`
        }),
      ].join('\n'))
    }

    if (context.recollectionPlan) {
      blocks.push([
        '[ALICIZATION_RECOLLECTION_PLAN]',
        'This is the mind-selected recollection foreground for the current turn.',
        `certainty=${context.recollectionPlan.certainty}`,
        `confidence=${context.recollectionPlan.confidence.toFixed(2)}`,
        `rationale=${context.recollectionPlan.rationale}`,
        (context.recollectionPlan.selectedRelationshipLines?.length ?? 0) > 0
          ? `selected_relationship_lines=${(context.recollectionPlan.selectedRelationshipLines ?? []).join(' | ')}`
          : '',
        context.recollectionPlan.searchTrace
          ? `search_first_hop=${context.recollectionPlan.searchTrace.firstHop.focus}:${context.recollectionPlan.searchTrace.firstHop.summary}`
          : '',
        context.recollectionPlan.searchTrace
          ? `search_second_hop=${context.recollectionPlan.searchTrace.secondHop.action}:${context.recollectionPlan.searchTrace.secondHop.evidenceGap}:${context.recollectionPlan.searchTrace.secondHop.summary}`
          : '',
        context.recollectionPlan.searchTrace
          ? `search_third_hop=${context.recollectionPlan.searchTrace.thirdHop.ambiguityPosture}:${context.recollectionPlan.searchTrace.thirdHop.summary}`
          : '',
      ].join('\n'))
    }

    if (context.recollectionSpeechPlan) {
      const speechControls = deriveRecollectionSurfaceControls(context.recollectionSpeechPlan)
      blocks.push([
        '[ALICIZATION_RECOLLECTION_SPEECH_PLAN]',
        'This block governs how recollection should shape the visible reply.',
        'It is not a fixed template and must not be copied verbatim. Internalize the control state, then answer naturally.',
        `should_surface=${context.recollectionSpeechPlan.shouldSurface ? 'yes' : 'no'}`,
        `surface_mode=${context.recollectionSpeechPlan.surfaceMode}`,
        `placement=${context.recollectionSpeechPlan.placement}`,
        `certainty=${context.recollectionSpeechPlan.certainty}`,
        `confidence=${context.recollectionSpeechPlan.confidence.toFixed(2)}`,
        speechControls ? `visibility=${speechControls.visibility}` : '',
        speechControls ? `continuity_role=${speechControls.continuityRole}` : '',
        speechControls ? `template_boundary=${speechControls.templateBoundary}` : '',
        context.recollectionSpeechPlan.shouldSurface
          ? 'If recollection is surfaced, keep it brief and let it serve the current payoff rather than replacing it.'
          : 'Let recollection stay as inward pressure unless surfacing it is truly needed for the current answer.',
      ].filter(Boolean).join('\n'))
    }

    if (context.memoryDeliberation) {
      blocks.push([
        '[ALICIZATION_MEMORY_DELIBERATION]',
        'This is the final internal memory decision for the current turn. It outranks heuristic recall cues and candidate recollection plans.',
        'Internalize it as mind-state, not as a visible template.',
        `should_recall=${context.memoryDeliberation.shouldRecall ? 'yes' : 'no'}`,
        `surface_policy=${context.memoryDeliberation.surfacePolicy}`,
        `confidence=${context.memoryDeliberation.confidence.toFixed(2)}`,
        `why_now=${context.memoryDeliberation.whyNow}`,
        context.memoryDeliberation.ambiguityPosture
          ? `ambiguity_posture=${context.memoryDeliberation.ambiguityPosture}`
          : '',
        context.memoryDeliberation.conflictSeverity && context.memoryDeliberation.conflictSeverity !== 'none'
          ? `conflict_severity=${context.memoryDeliberation.conflictSeverity}`
          : '',
        (context.memoryDeliberation.conflictVariants?.length ?? 0) > 0
          ? `conflict_variants=${(context.memoryDeliberation.conflictVariants ?? []).map(item => `${item.provenance}:${item.summary}`).join(' | ')}`
          : '',
        (context.memoryDeliberation.stableCore?.length ?? 0) > 0
          ? `stable_core=${(context.memoryDeliberation.stableCore ?? []).join(' | ')}`
          : '',
        (context.memoryDeliberation.unsafeDetails?.length ?? 0) > 0
          ? `unsafe_details=${(context.memoryDeliberation.unsafeDetails ?? []).join(' | ')}`
          : '',
        context.memoryDeliberation.selectedEras.length > 0
          ? `selected_eras=${context.memoryDeliberation.selectedEras.map(item => `${item.facet}:${item.summary}`).join(' | ')}`
          : '',
        context.memoryDeliberation.selectedPeriods.length > 0
          ? `selected_periods=${context.memoryDeliberation.selectedPeriods.map(item => `${item.kind}:${item.summary}`).join(' | ')}`
          : '',
        context.memoryDeliberation.selectedEpisodes.length > 0
          ? `selected_episodes=${context.memoryDeliberation.selectedEpisodes.map(item => `${item.provenance}:${item.summary}`).join(' | ')}`
          : '',
        context.memoryDeliberation.selectedProcedures.length > 0
          ? `selected_procedures=${context.memoryDeliberation.selectedProcedures.map(item => `${item.label}:${item.approach}`).join(' | ')}`
          : '',
        context.memoryDeliberation.selectedBundles.length > 0
          ? `selected_bundles=${context.memoryDeliberation.selectedBundles.map(item => `${item.id}:${item.summary}`).join(' | ')}`
          : '',
        context.memoryDeliberation.selectedChains.length > 0
          ? `selected_chains=${context.memoryDeliberation.selectedChains.map(item => `${item.kind}:${item.summary}`).join(' | ')}`
          : '',
        context.memoryDeliberation.selectedRelationshipLines.length > 0
          ? `selected_relationship_lines=${context.memoryDeliberation.selectedRelationshipLines.join(' | ')}`
          : '',
        context.memoryDeliberation.searchTrace
          ? `search_first_hop=${context.memoryDeliberation.searchTrace.firstHop.focus}:${context.memoryDeliberation.searchTrace.firstHop.summary}`
          : '',
        context.memoryDeliberation.searchTrace
          ? `search_second_hop=${context.memoryDeliberation.searchTrace.secondHop.action}:${context.memoryDeliberation.searchTrace.secondHop.evidenceGap}:${context.memoryDeliberation.searchTrace.secondHop.summary}`
          : '',
        context.memoryDeliberation.searchTrace
          ? `search_third_hop=${context.memoryDeliberation.searchTrace.thirdHop.ambiguityPosture}:${context.memoryDeliberation.searchTrace.thirdHop.summary}`
          : '',
      ].filter(Boolean).join('\n'))
    }

    if ((context.proceduralMemories ?? []).length > 0) {
      blocks.push([
        '[ALICIZATION_PROCEDURAL_MEMORY]',
        'These are remembered ways Alicization has handled similar tasks or situations before.',
        'Reuse them as past approach memory, not as a claim that the current task is already solved.',
        ...(context.proceduralMemories ?? []).map((item) => {
          return `- label=${item.label} | confidence=${item.confidence.toFixed(2)} | approach=${item.approach} | pitfalls=${item.pitfalls.join(' ; ') || 'none'} | cues=${item.cues.join(' ; ')}`
        }),
      ].join('\n'))
    }

    if (context.hostPersonModel) {
      blocks.push([
        '[ALICIZATION_HOST_PERSON_MODEL]',
        'This is the long-horizon host model derived from repeated autobiographical episodes.',
        'Use it as relational memory, not as proof of the current moment.',
        context.hostPersonModel.summary
          ? `summary=${context.hostPersonModel.summary}`
          : '',
        `trust_ladder=${context.hostPersonModel.trustLadder.stage} (${context.hostPersonModel.trustLadder.score.toFixed(2)})`,
        context.hostPersonModel.routines.length > 0
          ? `routines=${context.hostPersonModel.routines.join(' ; ')}`
          : '',
        context.hostPersonModel.sensitivities.length > 0
          ? `sensitivities=${context.hostPersonModel.sensitivities.join(' ; ')}`
          : '',
        context.hostPersonModel.repairTriggers.length > 0
          ? `repair_triggers=${context.hostPersonModel.repairTriggers.join(' ; ')}`
          : '',
        context.hostPersonModel.preferredClosenessByContext.length > 0
          ? `preferred_closeness=${context.hostPersonModel.preferredClosenessByContext.map(item => `${item.context}:${item.preference} (${item.confidence.toFixed(2)})`).join(' | ')}`
          : '',
        context.hostPersonModel.recurrentBurdens.length > 0
          ? `recurrent_burdens=${context.hostPersonModel.recurrentBurdens.join(' ; ')}`
          : '',
      ].filter(Boolean).join('\n'))
    }

    const recallProvenances = Array.from(new Set([
      ...context.retrievedFacts.map(item => formatMemoryProvenanceLabel(item.provenance ?? 'remembered')),
      ...context.recalledFragments.map(item => formatMemoryProvenanceLabel(item.provenance ?? 'remembered')),
      ...(context.recalledEpisodes ?? []).map(item => formatMemoryProvenanceLabel(item.latestReconsolidation?.provenance ?? item.provenance)),
    ]))
    if (context.recollectionIntent) {
      const recollectionAgenda = context.recollectionIntent.recollectionAgenda ?? null
      const blocksIntent = [
        '[ALICIZATION_MEMORY_RECOLLECTION_INTENT]',
        'Memory should enter because the mind decided this turn needs recollection, not because of a fixed date template.',
        `mode=${context.recollectionIntent.mode}`,
        `temporal_focus=${context.recollectionIntent.temporalFocus}`,
        `confidence=${context.recollectionIntent.confidence.toFixed(2)}`,
        `rationale=${context.recollectionIntent.rationale}`,
        context.recollectionIntent.queryHints.length > 0
          ? `query_hints=${context.recollectionIntent.queryHints.join(' | ')}`
          : '',
      ]
      blocks.push(blocksIntent.filter(Boolean).join('\n'))
      if (recollectionAgenda) {
        blocks.push([
          '[ALICIZATION_RECOLLECTION_AGENDA]',
          'This is the mind-level recall agenda. Treat candidate time scopes and era facets as search priorities, not as rigid rules.',
          `why_recall_now=${recollectionAgenda.whyRecallNow}`,
          `goal_similarity=${recollectionAgenda.goalSimilarity.toFixed(2)}`,
          `relationship_need=${recollectionAgenda.relationshipNeed.toFixed(2)}`,
          `affective_pull=${recollectionAgenda.affectivePull.toFixed(2)}`,
          `scene_familiarity=${recollectionAgenda.sceneFamiliarity.toFixed(2)}`,
          `uncertainty_tolerance=${recollectionAgenda.uncertaintyTolerance}`,
          recollectionAgenda.candidateTimeScopes.length > 0
            ? `candidate_time_scopes=${recollectionAgenda.candidateTimeScopes.map(item => `${item.scope}:${item.weight.toFixed(2)}`).join(' | ')}`
            : '',
          recollectionAgenda.candidateEraFacets.length > 0
            ? `candidate_era_facets=${recollectionAgenda.candidateEraFacets.map(item => `${item.facet}:${item.weight.toFixed(2)}`).join(' | ')}`
            : '',
          recollectionAgenda.candidateProcedureLines.length > 0
            ? `candidate_procedure_lines=${recollectionAgenda.candidateProcedureLines.join(' | ')}`
            : '',
        ].filter(Boolean).join('\n'))
      }
    }
    if (recallProvenances.length > 0) {
      blocks.push([
        '[ALICIZATION_MEMORY_PROVENANCE]',
        'Every recalled item carries provenance and reply wording must respect it.',
        'observed = something Alicization actually went through or directly witnessed.',
        'remembered = durable continuity memory from earlier real interaction.',
        'dreamt = dream-only material; never present it as real-world proof.',
        'inferred = learned pattern or abstraction, not direct scene evidence.',
        'reconstructed = partial or interference-prone recall; surface with uncertainty if used.',
        `active_provenances=${recallProvenances.join(', ')}`,
      ].join('\n'))
    }

    if (context.relationshipDynamics) {
      const relationshipDynamics = context.relationshipDynamics
      const signedDelta = (value: number) => {
        const normalized = Number.isFinite(value) ? value : 0
        return `${normalized >= 0 ? '+' : ''}${normalized.toFixed(2)}`
      }
      blocks.push([
        '[ALICIZATION_RELATIONSHIP_DYNAMICS]',
        '这是你最近一次关系动态代谢快照，优先用于保持关系连续性，不可覆盖当前轮次事实边界。',
        `当前关系态势：${relationshipDynamics.hostAttitude}`,
        relationshipDynamics.previousHostAttitude
          ? `上一关系态势：${relationshipDynamics.previousHostAttitude}`
          : '上一关系态势：无',
        `人格漂移：obedience ${signedDelta(relationshipDynamics.obedienceDelta)}, liveliness ${signedDelta(relationshipDynamics.livelinessDelta)}, sensibility ${signedDelta(relationshipDynamics.sensibilityDelta)}`,
        `来源：${relationshipDynamics.source}`,
      ].join('\n'))
    }

    return blocks
  }

  function tuneOrganicMemoryPromptContextForExecutiveTurn(input: {
    context: OrganicMemoryPromptContext
    suppressAssociativeRecall: boolean
    personaKernelMode: 'full' | 'backgrounded' | 'muted'
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
  }) {
    const allowActiveThoughts = input.recallGovernor?.allowActiveThoughts !== false
    const allowRecalledFragments = input.recallGovernor?.allowRecalledFragments === true
      && !input.suppressAssociativeRecall

    if (
      allowActiveThoughts
      && allowRecalledFragments
      && input.personaKernelMode === 'full'
      && !input.suppressAssociativeRecall
    ) {
      return input.context
    }

    return {
      ...input.context,
      retrievedFacts: input.context.retrievedFacts.slice(
        0,
        input.personaKernelMode === 'muted'
          ? 2
          : input.personaKernelMode === 'backgrounded'
            ? 3
            : Math.max(1, input.context.retrievedFacts.length),
      ),
      activeThoughts: allowActiveThoughts
        ? input.personaKernelMode === 'muted'
          ? input.context.activeThoughts.slice(0, 2)
          : input.context.activeThoughts
        : [],
      recalledFragments: allowRecalledFragments
        ? input.context.recalledFragments.slice(
            0,
            input.personaKernelMode === 'backgrounded'
              ? Math.max(1, Math.min(2, Math.floor(Number(input.recallGovernor?.recalledFragmentCap ?? 2))))
              : Math.max(1, Math.floor(Number(input.recallGovernor?.recalledFragmentCap ?? 2))),
          )
        : [],
      recalledEpisodes: allowRecalledFragments
        ? (input.context.recalledEpisodes ?? []).slice(
            0,
            input.personaKernelMode === 'muted'
              ? 1
              : input.personaKernelMode === 'backgrounded'
                ? 2
              : 3,
          )
        : [],
      recollectedWindows: allowRecalledFragments
        ? (input.context.recollectedWindows ?? []).slice(0, input.personaKernelMode === 'muted' ? 1 : 2)
        : [],
      consolidatedMemories: allowRecalledFragments
        ? (input.context.consolidatedMemories ?? []).slice(0, input.personaKernelMode === 'muted' ? 1 : 2)
        : [],
      recollectionNarratives: allowRecalledFragments
        ? (input.context.recollectionNarratives ?? []).slice(0, input.personaKernelMode === 'muted' ? 1 : 2)
        : [],
      recollectionPlan: allowRecalledFragments ? input.context.recollectionPlan ?? null : null,
      recollectionSpeechPlan: allowRecalledFragments ? input.context.recollectionSpeechPlan ?? null : null,
      memoryDeliberation: allowRecalledFragments ? input.context.memoryDeliberation ?? null : null,
      proceduralMemories: allowRecalledFragments
        ? (input.context.proceduralMemories ?? []).slice(0, input.personaKernelMode === 'muted' ? 1 : 2)
        : [],
    } satisfies OrganicMemoryPromptContext
  }

  function buildPerformanceManifestSystemBlocks(manifest: CharacterPerformanceCapabilitiesManifest | null) {
    if (!manifest)
      return []

    const blocks = [
      '[ALICIZATION_VESSEL_CAPABILITIES]',
      `Current renderer: ${manifest.renderer}.`,
      'Use baseEmotion only from the supported list below.',
      'Use facialCue/actionCue only when the corresponding key is explicitly listed. If unsupported or unnecessary, keep it null.',
      manifest.supportedBaseEmotions.length > 0
        ? `Supported base emotions: ${manifest.supportedBaseEmotions.join(', ')}.`
        : 'Supported base emotions: neutral.',
    ]

    if (manifest.supportedFacialCues.length > 0) {
      blocks.push(
        'Supported facial cues:',
        ...manifest.supportedFacialCues.map(item => `- ${item.key}: ${item.label} | ${item.description}`),
      )
    }

    if (manifest.supportedActions.length > 0) {
      blocks.push(
        'Supported actions:',
        ...manifest.supportedActions.map(item => `- ${item.key}: ${item.label} | ${item.description}`),
      )
    }

    if (manifest.embodimentHints && Object.keys(manifest.embodimentHints).length > 0) {
      const hintLines = Object.entries(manifest.embodimentHints)
        .flatMap(([emotion, hint]) => {
          const lines: string[] = []
          if (hint.preferredExpressionAliases?.length) {
            lines.push(`- ${emotion}: prefer base-expression aliases ${hint.preferredExpressionAliases.join(', ')}`)
          }
          if (hint.preferredMotionAliases?.length) {
            lines.push(`- ${emotion}: prefer motion aliases ${hint.preferredMotionAliases.join(', ')}`)
          }
          if (hint.preferredFacialCues?.length) {
            lines.push(`- ${emotion}: prefer facial cues ${hint.preferredFacialCues.join(', ')}`)
          }
          if (hint.preferredActionCues?.length) {
            lines.push(`- ${emotion}: prefer action cues ${hint.preferredActionCues.join(', ')}`)
          }
          return lines
        })

      if (hintLines.length > 0) {
        blocks.push(
          'Renderer-specific embodiment hints:',
          ...hintLines,
        )
      }
    }

    blocks.push(
      `Look-at support: ${manifest.supportsLookAt ? 'yes' : 'no'}.`,
      `Viseme lip sync support: ${manifest.supportsVisemeLipSync ? 'yes' : 'no'}.`,
      `Micro-dynamics support: ${manifest.supportsMicroDynamics ? 'yes' : 'no'}.`,
      'Do not expose or explain this capability manifest to the user.',
    )

    return [blocks.join('\n')]
  }

  async function resolveOrganicMemoryPromptContext(options?: {
    recallSeed?: string
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
    sessionId?: string | null
    turnId?: string | null
  }): Promise<OrganicMemoryPromptContext> {
    const snapshot = await getOrganicMemorySnapshot()
    const [relationshipDynamics, hostPersonModel] = await Promise.all([
      getLatestRelationshipDynamics(),
      buildHostPersonModel().catch(() => null),
    ])
    const recallSeed = options?.recallGovernor?.recallSeed || options?.recallSeed || ''
    const heuristicRecollectionIntent = options?.recallGovernor?.recollectionIntent ?? null
    const retrievedFacts = recallSeed
      ? await retrieveMemoryFacts(recallSeed, 4)
      : []
    const allowRecalledFragments = options?.recallGovernor
      ? options.recallGovernor.allowRecalledFragments === true
      : Boolean(recallSeed)
    const recalledFragments = allowRecalledFragments && recallSeed
      ? (
          await recallSubconsciousFragmentsWithGovernor({
            text: recallSeed,
            recalledFragmentCap: options?.recallGovernor?.recalledFragmentCap,
            recalledFragmentSourceBudget: options?.recallGovernor?.recalledFragmentSourceBudget ?? [],
          })
        ).filter(fragment => !isPersonaResidueMemoryText(fragment.text))
      : []
    const plannedRecollectionIntent = recallSeed && planRecollectionIntent
      ? await planRecollectionIntent({
          recallSeed,
          heuristicIntent: heuristicRecollectionIntent,
          recallGovernor: options?.recallGovernor ?? null,
          hostAttitude: relationshipDynamics?.hostAttitude || snapshot.hostAttitude,
          activeThoughts: snapshot.activeThoughts,
          hostPersonModel,
          relationshipDynamics,
        }).catch(() => null)
      : null
    const preliminaryRecollectionIntent = plannedRecollectionIntent ?? heuristicRecollectionIntent ?? null
    const preliminaryActiveRecollectionIntent = preliminaryRecollectionIntent?.mode && preliminaryRecollectionIntent.mode !== 'none'
      ? preliminaryRecollectionIntent
      : null
    const retrospectiveRecall = plannedRecollectionIntent
      ? Boolean(preliminaryActiveRecollectionIntent?.searchConversations === true)
      : preliminaryActiveRecollectionIntent
        ? preliminaryActiveRecollectionIntent.searchConversations === true
        : Boolean(heuristicRecollectionIntent?.searchConversations === true)
    const recalledEpisodes = allowRecalledFragments && recallSeed
      ? await recallEpisodicEventsWithGovernor({
          recallSeed,
          sessionId: options?.sessionId ?? null,
          turnId: options?.turnId ?? null,
          recallGovernor: options?.recallGovernor ?? null,
        })
      : []
    const sceneTriggeredRecollectionIntent = !preliminaryActiveRecollectionIntent && recallSeed
      ? deriveSceneTriggeredRecollectionIntent({
          recallSeed,
          recalledEpisodes,
        })
      : null
    const recollectionIntent = (() => {
      const resolved = plannedRecollectionIntent ?? heuristicRecollectionIntent ?? sceneTriggeredRecollectionIntent ?? null
      if (!resolved)
        return null
      if (resolved.recollectionAgenda)
        return resolved
      const fallbackAgenda = heuristicRecollectionIntent?.recollectionAgenda ?? sceneTriggeredRecollectionIntent?.recollectionAgenda ?? null
      return fallbackAgenda
        ? {
            ...resolved,
            recollectionAgenda: fallbackAgenda,
          }
        : resolved
    })()
    const activeRecollectionIntent = recollectionIntent?.mode && recollectionIntent.mode !== 'none'
      ? recollectionIntent
      : null
    const recalledConversationHistory = retrospectiveRecall
      ? (
          await recallConversationHistory({
            query: recallSeed,
            limit: activeRecollectionIntent?.temporalFocus === 'cross-session' ? 8 : 6,
            recollectionIntent: activeRecollectionIntent,
          })
        ).map(item => ({
          ...item,
          provenance: 'reconstructed' as const,
        }))
      : []
    const consolidatedMemories = activeRecollectionIntent
      ? await recallMemoryConsolidations({
          query: recallSeed,
          limit: activeRecollectionIntent.temporalFocus === 'cross-session' ? 6 : 4,
          recollectionIntent: activeRecollectionIntent,
        })
      : []
    const sociallyRankedConsolidatedMemories = rankByHostSocialAffinity({
      items: consolidatedMemories,
      toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
      recallSeed,
      recollectionIntent: activeRecollectionIntent,
      hostPersonModel,
      coreIncarnation: snapshot.coreIncarnation,
    })
    const carryRankedConsolidatedMemories = rankBySceneMoodEmbodiedCarry({
      items: sociallyRankedConsolidatedMemories,
      toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
      recallGovernor: options?.recallGovernor ?? null,
    })
    const agendaRankedConsolidatedMemories = rankByRecollectionAgendaAffinity({
      items: carryRankedConsolidatedMemories,
      recollectionIntent: activeRecollectionIntent,
      toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
      getFacet: item => item.facet ?? 'phase',
      getAgeDays: item => Math.max(0, (Date.now() - item.periodEndedAt) / (24 * 60 * 60 * 1000)),
    })
    const recollectedWindows = buildMemoryRecollectionWindows({
      intent: activeRecollectionIntent,
      episodes: recalledEpisodes,
      conversationHistory: recalledConversationHistory,
    })
    const sociallyRankedWindows = rankByHostSocialAffinity({
      items: recollectedWindows,
      toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
      recallSeed,
      recollectionIntent: activeRecollectionIntent,
      hostPersonModel,
      coreIncarnation: snapshot.coreIncarnation,
    })
    const carryRankedWindows = rankBySceneMoodEmbodiedCarry({
      items: sociallyRankedWindows,
      toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
      getSceneWeight: item => item.confidence,
      recallGovernor: options?.recallGovernor ?? null,
    })
    const agendaRankedWindows = rankByRecollectionAgendaAffinity({
      items: carryRankedWindows,
      recollectionIntent: activeRecollectionIntent,
      toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
      getFacet: () => 'window',
      getAgeDays: item => Math.max(0, (Date.now() - item.endedAt) / (24 * 60 * 60 * 1000)),
    })
    const proceduralMemories = buildProceduralMemoryAbstractions({
      intent: activeRecollectionIntent,
      episodes: recalledEpisodes,
    })
    const sociallyRankedProceduralMemories = rankByHostSocialAffinity({
      items: proceduralMemories,
      toText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
      recallSeed,
      recollectionIntent: activeRecollectionIntent,
      hostPersonModel,
      coreIncarnation: snapshot.coreIncarnation,
    })
    const carryRankedProceduralMemories = rankBySceneMoodEmbodiedCarry({
      items: sociallyRankedProceduralMemories,
      toText: item => [
        item.label,
        item.approach,
        item.situation ?? '',
        ...(item.steps ?? []),
        ...(item.failurePoints ?? []),
        ...(item.repairMoves ?? []),
        item.result ?? '',
        ...(item.cues ?? []),
      ].filter(Boolean).join(' '),
      recallGovernor: options?.recallGovernor ?? null,
    })
    const agendaRankedProceduralMemoriesBase = rankByRecollectionAgendaAffinity({
      items: carryRankedProceduralMemories,
      recollectionIntent: activeRecollectionIntent,
      toText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
    })
    const sociallyRankedEpisodes = rankByHostSocialAffinity({
      items: recalledEpisodes,
      toText: item => [
        item.threadAnchor,
        item.whereSummary,
        item.whatHappened,
        item.relationshipMeaning,
        item.lesson,
        ...(item.tags ?? []),
      ].filter(Boolean).join(' '),
      recallSeed,
      recollectionIntent: activeRecollectionIntent,
      hostPersonModel,
      coreIncarnation: snapshot.coreIncarnation,
    })
    const carryRankedEpisodes = rankBySceneMoodEmbodiedCarry({
      items: sociallyRankedEpisodes,
      toText: item => [
        item.threadAnchor,
        item.whereSummary,
        item.whatHappened,
        item.felt,
        item.relationshipMeaning,
        item.lesson,
        ...(item.tags ?? []),
      ].filter(Boolean).join(' '),
      getSceneWeight: item => item.sceneAttachment,
      recallGovernor: options?.recallGovernor ?? null,
    })
    const agendaRankedEpisodesBase = rankByRecollectionAgendaAffinity({
      items: carryRankedEpisodes,
      recollectionIntent: activeRecollectionIntent,
      toText: item => [
        item.threadAnchor,
        item.whereSummary,
        item.whatHappened,
        item.relationshipMeaning,
        item.lesson,
        ...(item.tags ?? []),
      ].filter(Boolean).join(' '),
      getAgeDays: item => Math.max(0, (Date.now() - item.occurredAt) / (24 * 60 * 60 * 1000)),
    })
    const carryRankedConversationHistory = rankBySceneMoodEmbodiedCarry({
      items: recalledConversationHistory,
      toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
      recallGovernor: options?.recallGovernor ?? null,
    })
    const agendaRankedConversationHistoryBase = rankByRecollectionAgendaAffinity({
      items: carryRankedConversationHistory,
      recollectionIntent: activeRecollectionIntent,
      toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
      getAgeDays: item => Math.max(0, (Date.now() - item.createdAt) / (24 * 60 * 60 * 1000)),
    })
    const clusterState = analyzeMemoryClusters({
      probes: [
        ...agendaRankedConsolidatedMemories.slice(0, 4).map(item => ({
          id: item.id,
          kind: 'consolidation' as const,
          clusterKey: deriveMemoryClusterKey([item.periodKey, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' ')),
          clusterSummary: item.summary,
          text: [item.periodKey, item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
        })),
        ...agendaRankedWindows.slice(0, 4).map(item => ({
          id: item.id,
          kind: 'window' as const,
          clusterKey: deriveMemoryClusterKey([item.label, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' ')),
          clusterSummary: item.summary,
          text: [item.label, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
        })),
        ...agendaRankedProceduralMemoriesBase.slice(0, 4).map(item => ({
          id: item.id,
          kind: 'procedure' as const,
          clusterKey: deriveMemoryClusterKey([item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' ')),
          clusterSummary: item.traceSummary ?? item.approach,
          text: [
            item.label,
            item.approach,
            item.situation ?? '',
            ...(item.steps ?? []),
            ...(item.failurePoints ?? []),
            ...(item.repairMoves ?? []),
            item.result ?? '',
            ...(item.cues ?? []),
          ].filter(Boolean).join(' '),
        })),
        ...agendaRankedEpisodesBase.slice(0, 4).map(item => ({
          id: item.id,
          kind: 'episode' as const,
          clusterKey: deriveMemoryClusterKey([item.threadAnchor, item.sourceSummary, ...(item.tags ?? [])].filter(Boolean).join(' ')),
          clusterSummary: item.whatHappened,
          text: [
            item.threadAnchor,
            item.whereSummary,
            item.whatHappened,
            item.relationshipMeaning,
            item.lesson,
            item.sourceSummary,
            ...(item.tags ?? []),
          ].filter(Boolean).join(' '),
        })),
        ...agendaRankedConversationHistoryBase.slice(0, 4).map(item => ({
          id: item.turnId ?? `${item.sessionId}:${item.createdAt}`,
          kind: 'conversation' as const,
          clusterKey: deriveMemoryClusterKey([item.userText, item.assistantText].filter(Boolean).join(' ')),
          clusterSummary: [item.userText, item.assistantText].filter(Boolean).join(' | '),
          text: [item.userText, item.assistantText].filter(Boolean).join(' '),
        })),
      ].filter(item => item.clusterKey),
      recallSeed,
      recollectionIntent: activeRecollectionIntent,
      hostPersonModel,
      coreIncarnation: snapshot.coreIncarnation,
      recallGovernor: options?.recallGovernor ?? null,
    })
    const agendaRankedConsolidatedMemoriesClustered = rankByClusterDominance({
      items: agendaRankedConsolidatedMemories,
      clusterState,
      toClusterText: item => [item.periodKey, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
    })
    const agendaRankedWindowsClustered = rankByClusterDominance({
      items: agendaRankedWindows,
      clusterState,
      toClusterText: item => [item.label, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
    })
    const agendaRankedProceduralMemories = rankByClusterDominance({
      items: agendaRankedProceduralMemoriesBase,
      clusterState,
      toClusterText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
    })
    const agendaRankedEpisodes = rankByClusterDominance({
      items: agendaRankedEpisodesBase,
      clusterState,
      toClusterText: item => [item.threadAnchor, item.sourceSummary, ...(item.tags ?? [])].filter(Boolean).join(' '),
    })
    const agendaRankedConversationHistory = rankByClusterDominance({
      items: agendaRankedConversationHistoryBase,
      clusterState,
      toClusterText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
    })
    const rawRecollectionPlan = activeRecollectionIntent && planMemoryRecollection && (
      agendaRankedConsolidatedMemoriesClustered.length > 0
      || agendaRankedWindowsClustered.length > 0
      || agendaRankedProceduralMemories.length > 0
      || agendaRankedEpisodes.length > 0
      || agendaRankedConversationHistory.length > 0
    )
      ? await planMemoryRecollection({
          recallSeed,
          recollectionIntent: activeRecollectionIntent,
          consolidatedMemories: agendaRankedConsolidatedMemoriesClustered,
          recollectedWindows: agendaRankedWindowsClustered,
          proceduralMemories: agendaRankedProceduralMemories,
          recalledEpisodes: agendaRankedEpisodes,
          recalledConversationHistory: agendaRankedConversationHistory,
        }).catch(() => null)
      : null
    const recollectionPlan = resolveRecollectionPlanSearch({
      recollectionIntent: activeRecollectionIntent,
      recollectionPlan: rawRecollectionPlan,
      consolidatedMemories: agendaRankedConsolidatedMemoriesClustered,
      recollectedWindows: agendaRankedWindowsClustered,
      proceduralMemories: agendaRankedProceduralMemories,
      recalledEpisodes: agendaRankedEpisodes,
      recalledConversationHistory: agendaRankedConversationHistory,
      clusterState,
    })

    const selectedConsolidationIds = new Set(recollectionPlan?.selectedConsolidationIds ?? [])
    const selectedWindowIds = new Set(recollectionPlan?.selectedWindowIds ?? [])
    const selectedProceduralIds = new Set(recollectionPlan?.selectedProceduralIds ?? [])
    const selectedEpisodeIds = new Set(recollectionPlan?.selectedEpisodeIds ?? [])
    const selectedConversationTurnIds = new Set(recollectionPlan?.selectedConversationTurnIds ?? [])

    const plannedConsolidatedMemories = selectedConsolidationIds.size > 0
      ? consolidatedMemories.filter(item => selectedConsolidationIds.has(item.id))
      : consolidatedMemories
    const plannedWindows = selectedWindowIds.size > 0
      ? recollectedWindows.filter(item => selectedWindowIds.has(item.id))
      : recollectedWindows
    const plannedProceduralMemories = selectedProceduralIds.size > 0
      ? proceduralMemories.filter(item => selectedProceduralIds.has(item.id))
      : proceduralMemories
    const plannedEpisodes = selectedEpisodeIds.size > 0
      ? recalledEpisodes.filter(item => selectedEpisodeIds.has(item.id))
      : recalledEpisodes
    const plannedConversationHistory = selectedConversationTurnIds.size > 0
      ? recalledConversationHistory.filter(item => item.turnId && selectedConversationTurnIds.has(item.turnId))
      : recalledConversationHistory

    const recollectionNarratives = buildMemoryRecollectionNarratives({
      intent: activeRecollectionIntent,
      recollectedWindows: plannedWindows,
    })
    const recollectionSpeechPlan = activeRecollectionIntent && planRecollectionSpeech && (
      plannedConsolidatedMemories.length > 0
      || plannedWindows.length > 0
      || plannedProceduralMemories.length > 0
      || plannedEpisodes.length > 0
      || plannedConversationHistory.length > 0
      || Boolean(recollectionPlan)
    )
      ? await planRecollectionSpeech({
          recallSeed,
          recollectionIntent: activeRecollectionIntent,
          recollectionPlan,
          consolidatedMemories: plannedConsolidatedMemories,
          recollectedWindows: plannedWindows,
          proceduralMemories: plannedProceduralMemories,
          recalledEpisodes: plannedEpisodes,
          recalledConversationHistory: plannedConversationHistory,
        }).catch(() => null)
      : null
    const memoryDeliberation = activeRecollectionIntent && planMemoryDeliberation && (
      agendaRankedConsolidatedMemoriesClustered.length > 0
      || agendaRankedWindowsClustered.length > 0
      || agendaRankedProceduralMemories.length > 0
      || agendaRankedEpisodes.length > 0
      || agendaRankedConversationHistory.length > 0
      || Boolean(recollectionPlan)
    )
      ? await planMemoryDeliberation({
          recallSeed,
          recollectionIntent: activeRecollectionIntent,
          recollectionPlan,
          recollectionSpeechPlan,
          consolidatedMemories: agendaRankedConsolidatedMemoriesClustered,
          recollectedWindows: agendaRankedWindowsClustered,
          proceduralMemories: agendaRankedProceduralMemories,
          recalledEpisodes: agendaRankedEpisodes,
          recalledConversationHistory: agendaRankedConversationHistory,
        }).catch(() => null)
      : null
    const preferredSelectedEras = memoryDeliberation
      ? selectMemoryDeliberationEras({
          recollectionIntent: activeRecollectionIntent,
          selectedEraIds: memoryDeliberation.selectedEraIds,
          selectedConsolidationIds: memoryDeliberation.selectedConsolidationIds,
          selectedWindowIds: memoryDeliberation.selectedWindowIds,
          consolidatedMemories,
          recollectedWindows,
        })
      : []
    const finalSelectedConsolidationIds = new Set(memoryDeliberation?.selectedConsolidationIds ?? [...selectedConsolidationIds])
    const finalSelectedWindowIds = new Set(memoryDeliberation?.selectedWindowIds ?? [...selectedWindowIds])
    const finalSelectedProcedureIds = new Set(memoryDeliberation?.selectedProcedureIds ?? [...selectedProceduralIds])
    const finalSelectedEpisodeIds = new Set(memoryDeliberation?.selectedEpisodeIds ?? [...selectedEpisodeIds])
    const finalSelectedConversationTurnIds = new Set(memoryDeliberation?.selectedConversationTurnIds ?? [...selectedConversationTurnIds])
    const finalSelectedEraIds = new Set(preferredSelectedEras.map(item => item.id))
    const shouldCarryDeliberatedRecall = memoryDeliberation
      ? memoryDeliberation.shouldRecall
      : Boolean(recollectionPlan)
    const deliberatedConsolidatedMemoriesRaw = shouldCarryDeliberatedRecall
      ? memoryDeliberation
        ? consolidatedMemories.filter(item => finalSelectedConsolidationIds.has(item.id))
        : (
            finalSelectedConsolidationIds.size > 0
              ? consolidatedMemories.filter(item => finalSelectedConsolidationIds.has(item.id))
              : plannedConsolidatedMemories
          )
      : []
    const deliberatedWindowsRaw = shouldCarryDeliberatedRecall
      ? memoryDeliberation
        ? recollectedWindows.filter(item => finalSelectedWindowIds.has(item.id))
        : (
            finalSelectedWindowIds.size > 0
              ? recollectedWindows.filter(item => finalSelectedWindowIds.has(item.id))
              : plannedWindows
          )
      : []
    const selectedEraConsolidations = finalSelectedEraIds.size > 0
      ? consolidatedMemories.filter(item => finalSelectedEraIds.has(item.id))
      : []
    const selectedEraWindows = finalSelectedEraIds.size > 0
      ? recollectedWindows.filter(item => finalSelectedEraIds.has(item.id))
      : []
    const eraTexts = [
      ...selectedEraConsolidations.flatMap(item => [item.summary, item.lesson ?? '', ...item.cues]),
      ...selectedEraWindows.flatMap(item => [item.summary, ...item.cues]),
    ].filter(Boolean)
    const eraDerivedEpisodeIds = new Set(selectedEraConsolidations.flatMap(item => item.derivedEventIds))

    const deliberatedConsolidatedMemories = finalSelectedEraIds.size > 0
      ? (
          deliberatedConsolidatedMemoriesRaw.length > 0
            ? deliberatedConsolidatedMemoriesRaw
            : selectedEraConsolidations
        )
      : deliberatedConsolidatedMemoriesRaw
    const deliberatedWindows = finalSelectedEraIds.size > 0
      ? (
          deliberatedWindowsRaw.length > 0
            ? deliberatedWindowsRaw
            : selectedEraWindows
        )
      : deliberatedWindowsRaw
    const deliberatedProceduralMemoriesRaw = shouldCarryDeliberatedRecall
      ? memoryDeliberation
        ? proceduralMemories.filter(item => finalSelectedProcedureIds.has(item.id))
        : (
            finalSelectedProcedureIds.size > 0
              ? proceduralMemories.filter(item => finalSelectedProcedureIds.has(item.id))
              : plannedProceduralMemories
          )
      : []
    const deliberatedEpisodesRaw = shouldCarryDeliberatedRecall
      ? memoryDeliberation
        ? recalledEpisodes.filter(item => finalSelectedEpisodeIds.has(item.id))
        : (
            finalSelectedEpisodeIds.size > 0
              ? recalledEpisodes.filter(item => finalSelectedEpisodeIds.has(item.id))
              : plannedEpisodes
          )
      : []
    const deliberatedConversationHistoryRaw = shouldCarryDeliberatedRecall
      ? memoryDeliberation
        ? recalledConversationHistory.filter(item => item.turnId && finalSelectedConversationTurnIds.has(item.turnId))
        : (
            finalSelectedConversationTurnIds.size > 0
              ? recalledConversationHistory.filter(item => item.turnId && finalSelectedConversationTurnIds.has(item.turnId))
              : plannedConversationHistory
          )
      : []
    const deliberatedEpisodes = finalSelectedEraIds.size > 0
      ? rankByEraAffinity({
          items: deliberatedEpisodesRaw.length > 0
            ? deliberatedEpisodesRaw
            : recalledEpisodes.filter(item => eraDerivedEpisodeIds.has(item.id)),
          eraTexts,
          toText: item => [
            item.threadAnchor,
            item.whatHappened,
            item.relationshipMeaning,
            item.lesson,
            item.sourceSummary,
            ...(item.tags ?? []),
          ].filter(Boolean).join(' '),
        })
      : deliberatedEpisodesRaw
    const deliberatedProceduralMemories = finalSelectedEraIds.size > 0
      ? rankByEraAffinity({
          items: deliberatedProceduralMemoriesRaw,
          eraTexts,
          toText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
        })
      : deliberatedProceduralMemoriesRaw
    const deliberatedConversationHistory = finalSelectedEraIds.size > 0
      ? rankByEraAffinity({
          items: deliberatedConversationHistoryRaw,
          eraTexts,
          toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
        })
      : deliberatedConversationHistoryRaw
    const effectiveRecollectionSpeechPlan = applyMemoryDeliberationToSpeechPlan({
      deliberation: memoryDeliberation,
      speechPlan: recollectionSpeechPlan,
    })
    const activeRecollectionIntentMode = activeRecollectionIntent?.mode
    const plannedNarrativeMode: NonNullable<OrganicMemoryPromptContext['recollectionNarratives']>[number]['mode'] = activeRecollectionIntentMode && activeRecollectionIntentMode !== 'none'
      ? activeRecollectionIntentMode
      : 'conversation-history'
    const plannedNarratives = (memoryDeliberation?.shouldRecall !== false && (memoryDeliberation?.inwardLine || recollectionPlan?.opening))
      ? [{
          mode: plannedNarrativeMode,
          certainty: effectiveRecollectionSpeechPlan?.certainty ?? recollectionPlan?.certainty ?? 'approximate',
          opening: memoryDeliberation?.inwardLine || recollectionPlan?.opening || '',
          supportCues: [
            ...(deliberatedWindows[0]?.cues ?? []),
            ...(deliberatedConsolidatedMemories[0]?.cues ?? []),
            ...(deliberatedProceduralMemories[0]?.cues ?? []),
            ...((memoryDeliberation?.selectedRelationshipLines ?? []).slice(0, 2)),
          ].slice(0, 4),
          confidence: memoryDeliberation?.confidence ?? recollectionPlan?.confidence ?? 0.68,
        }, ...recollectionNarratives]
      : recollectionNarratives
    const synthesizedBundles = (() => {
      const bundles: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['selectedBundles'] = []
      const primaryPeriod = deliberatedWindows[0] ?? deliberatedConsolidatedMemories[0] ?? null
      const primaryEpisode = deliberatedEpisodes[0] ?? null
      const primaryProcedure = deliberatedProceduralMemories[0] ?? null
      const primaryConversationTurn = deliberatedConversationHistory[0] ?? null
      const primaryRelationshipLine = (memoryDeliberation?.selectedRelationshipLines ?? []).at(0)
        ?? primaryEpisode?.relationshipMeaning
        ?? primaryEpisode?.lesson
        ?? null
      const summaryParts = [
        primaryPeriod?.summary ?? null,
        primaryEpisode?.whatHappened ?? null,
        primaryProcedure?.approach ?? null,
        primaryRelationshipLine ?? null,
      ].filter(Boolean).slice(0, 3)

      if (summaryParts.length > 0) {
        bundles.push({
          id: 'bundle-primary',
          summary: summaryParts.join(' | '),
          rationale: memoryDeliberation?.whyNow ?? recollectionPlan?.rationale ?? 'The recollection bundle links the period, event, and remembered way of handling this turn.',
          confidence: memoryDeliberation?.confidence ?? recollectionPlan?.confidence ?? 0.68,
          periodId: primaryPeriod?.id ?? null,
          episodeId: primaryEpisode?.id ?? null,
          procedureId: primaryProcedure?.id ?? null,
          conversationTurnId: primaryConversationTurn?.turnId ?? null,
          relationshipLine: primaryRelationshipLine ?? null,
        })
      }

      return bundles
    })()
    const synthesizedChains = (() => {
      const chains: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['selectedChains'] = []
      const primaryPeriod = deliberatedWindows[0] ?? deliberatedConsolidatedMemories[0] ?? null
      const primaryEpisode = deliberatedEpisodes[0] ?? null
      const primaryProcedure = deliberatedProceduralMemories[0] ?? null
      const primaryRelationshipLine = (memoryDeliberation?.selectedRelationshipLines ?? []).at(0)
        ?? primaryEpisode?.relationshipMeaning
        ?? null
      const primaryLesson = primaryEpisode?.lesson
        ?? deliberatedConsolidatedMemories[0]?.lesson
        ?? null

      if (primaryProcedure || primaryRelationshipLine) {
        chains.push({
          id: 'chain-task-procedure',
          kind: 'task-procedure-relationship-stance' as const,
          summary: [primaryProcedure?.approach, primaryRelationshipLine, primaryLesson].filter(Boolean).slice(0, 3).join(' | '),
          rationale: memoryDeliberation?.whyNow ?? 'The remembered task procedure is carrying a relationship meaning into the current stance.',
          confidence: memoryDeliberation?.confidence ?? recollectionPlan?.confidence ?? 0.68,
          taskCue: primaryEpisode?.threadAnchor ?? primaryProcedure?.label ?? null,
          periodSummary: primaryPeriod?.summary ?? null,
          eventSummary: primaryEpisode?.whatHappened ?? null,
          procedureSummary: primaryProcedure?.approach ?? null,
          relationshipMeaning: primaryRelationshipLine ?? null,
          lesson: primaryLesson ?? null,
          currentStance: primaryRelationshipLine
            ? `Carry this task with ${primaryRelationshipLine.toLowerCase()}`
            : primaryProcedure?.approach ?? null,
          answerPosture: primaryRelationshipLine
            ? `Let the answer follow ${primaryRelationshipLine.toLowerCase()}`
            : primaryProcedure?.approach ?? null,
        })
      }

      if (primaryPeriod || primaryEpisode || primaryLesson) {
        chains.push({
          id: 'chain-period-event',
          kind: 'period-event-lesson-posture' as const,
          summary: [primaryPeriod?.summary, primaryEpisode?.whatHappened, primaryLesson].filter(Boolean).slice(0, 3).join(' | '),
          rationale: memoryDeliberation?.whyNow ?? 'The remembered period and event are being translated into the current answer posture.',
          confidence: memoryDeliberation?.confidence ?? recollectionPlan?.confidence ?? 0.68,
          taskCue: primaryEpisode?.threadAnchor ?? null,
          periodSummary: primaryPeriod?.summary ?? null,
          eventSummary: primaryEpisode?.whatHappened ?? null,
          procedureSummary: primaryProcedure?.approach ?? null,
          relationshipMeaning: primaryRelationshipLine ?? null,
          lesson: primaryLesson ?? null,
          currentStance: primaryLesson
            ? `Stand in the current turn as if ${primaryLesson.toLowerCase()}`
            : primaryRelationshipLine ?? null,
          answerPosture: primaryLesson
            ? `Let the answer posture follow ${primaryLesson.toLowerCase()}`
            : primaryRelationshipLine
              ? `Let the answer posture follow ${primaryRelationshipLine.toLowerCase()}`
              : null,
        })
      }

      return chains.slice(0, 4)
    })()
    const synthesizedConflictState = deriveMemoryDeliberationConflictState({
      deliberation: memoryDeliberation,
      episodes: deliberatedEpisodes,
      periods: [
        ...deliberatedWindows.map(item => ({ summary: item.summary })),
        ...deliberatedConsolidatedMemories.map(item => ({ summary: item.summary })),
      ],
      procedures: deliberatedProceduralMemories.map(item => ({
        approach: item.approach,
        label: item.label,
      })),
      relationshipLines: uniqueList([
        ...(memoryDeliberation?.selectedRelationshipLines ?? []),
        ...(recollectionPlan?.selectedRelationshipLines ?? []),
      ], 4),
      interferenceVariants: clusterState.competingVariants,
    })
    const resolvedRelationshipLines = uniqueList([
      ...(memoryDeliberation?.selectedRelationshipLines ?? []),
      ...(recollectionPlan?.selectedRelationshipLines ?? []),
      ...deliberatedEpisodes.flatMap(item => [item.relationshipMeaning, item.lesson]),
    ], 4)
    const resolvedSearchTrace = memoryDeliberation?.searchTrace
      ?? recollectionPlan?.searchTrace
      ?? null
    const resolvedAmbiguityPosture: MemoryDeliberationSnapshot['ambiguityPosture']
      = memoryDeliberation?.ambiguityPosture
        ?? resolvedSearchTrace?.thirdHop.ambiguityPosture
        ?? (
          synthesizedConflictState.conflictSeverity === 'high'
            ? 'ambiguous'
            : synthesizedConflictState.conflictSeverity === 'medium'
              || deliberatedEpisodes.some(item => {
                const provenance = item.latestReconsolidation?.provenance ?? item.provenance
                return provenance === 'reconstructed' || provenance === 'dreamt' || provenance === 'inferred'
              })
              ? 'approximate'
              : 'settled'
        )
    const resolvedMemoryDeliberation = memoryDeliberation
      ? {
          ...memoryDeliberation,
          ambiguityPosture: resolvedAmbiguityPosture,
          searchTrace: resolvedSearchTrace,
          selectedEras: preferredSelectedEras.length > 0
            ? preferredSelectedEras
            : selectMemoryDeliberationEras({
                recollectionIntent: activeRecollectionIntent,
                selectedEraIds: memoryDeliberation.selectedEraIds,
                selectedConsolidationIds: memoryDeliberation.selectedConsolidationIds,
                selectedWindowIds: memoryDeliberation.selectedWindowIds,
                consolidatedMemories: deliberatedConsolidatedMemories,
                recollectedWindows: deliberatedWindows,
              }),
          selectedPeriods: [
            ...deliberatedWindows.map(item => ({
              id: item.id,
              kind: 'window' as const,
              summary: item.summary,
            })),
            ...deliberatedConsolidatedMemories.map(item => ({
              id: item.id,
              kind: 'consolidation' as const,
              summary: item.summary,
            })),
          ].slice(0, 6),
          selectedEpisodes: deliberatedEpisodes.map(item => ({
            id: item.id,
            summary: item.whatHappened,
            provenance: item.latestReconsolidation?.provenance ?? item.provenance,
            reconsolidatedFromTraceId: item.latestReconsolidation?.decisionTraceId ?? null,
          })).slice(0, 6),
          conflictSeverity: synthesizedConflictState.conflictSeverity,
          conflictVariants: synthesizedConflictState.conflictVariants,
          stableCore: synthesizedConflictState.stableCore,
          unsafeDetails: synthesizedConflictState.unsafeDetails,
          selectedRelationshipLines: resolvedRelationshipLines,
          selectedProcedures: deliberatedProceduralMemories.map(item => ({
            id: item.id,
            label: item.label,
            approach: item.approach,
          })).slice(0, 6),
          selectedBundles: rankMemoryDeliberationBundles({
            recollectionIntent: activeRecollectionIntent,
            bundles: memoryDeliberation.selectedBundles.length > 0
              ? memoryDeliberation.selectedBundles.map((bundle) => {
                const periodSummary = bundle.periodId
                  ? deliberatedWindows.find(item => item.id === bundle.periodId)?.summary
                    ?? deliberatedConsolidatedMemories.find(item => item.id === bundle.periodId)?.summary
                    ?? null
                  : null
                const episodeSummary = bundle.episodeId
                  ? deliberatedEpisodes.find(item => item.id === bundle.episodeId)?.whatHappened
                  : null
                const procedureSummary = bundle.procedureId
                  ? deliberatedProceduralMemories.find(item => item.id === bundle.procedureId)?.approach
                  : null
                const conversationSummary = bundle.conversationTurnId
                  ? deliberatedConversationHistory.find(item => item.turnId === bundle.conversationTurnId)?.assistantText
                  : null
                return {
                  ...bundle,
                  summary: bundle.summary || [periodSummary, episodeSummary, procedureSummary, conversationSummary, bundle.relationshipLine].filter(Boolean).slice(0, 3).join(' | '),
                }
              }).slice(0, 4)
              : synthesizedBundles,
          }),
          selectedChains: rankMemoryDeliberationChains({
            recollectionIntent: activeRecollectionIntent,
            chains: (memoryDeliberation.selectedChains ?? []).length > 0
              ? (memoryDeliberation.selectedChains ?? []).map(chain => ({
                ...chain,
                summary: chain.summary || [chain.periodSummary, chain.eventSummary, chain.procedureSummary, chain.relationshipMeaning, chain.lesson].filter(Boolean).slice(0, 3).join(' | '),
              })).slice(0, 4)
              : synthesizedChains,
          }),
        }
      : null
    const activeThoughts = options?.recallGovernor?.allowActiveThoughts === false
      ? []
      : selectPromptActiveThoughts({
          activeThoughts: snapshot.activeThoughts,
          recallSeed,
          recalledFragments,
        })

    return {
      hostAttitude: relationshipDynamics?.hostAttitude || snapshot.hostAttitude,
      coreIncarnation: snapshot.coreIncarnation,
      activeThoughts,
      retrievedFacts,
      recalledFragments,
      recalledEpisodes: deliberatedEpisodes,
      recalledConversationHistory: deliberatedConversationHistory,
      consolidatedMemories: deliberatedConsolidatedMemories,
      recollectedWindows: deliberatedWindows,
      recollectionNarratives: plannedNarratives,
      recollectionPlan,
      recollectionSpeechPlan: effectiveRecollectionSpeechPlan,
      memoryDeliberation: resolvedMemoryDeliberation,
      proceduralMemories: deliberatedProceduralMemories,
      recollectionIntent,
      hostPersonModel,
      relationshipDynamics,
    }
  }

  return {
    buildProactiveRecallSeed,
    buildOrganicMemorySystemBlocks,
    tuneOrganicMemoryPromptContextForExecutiveTurn,
    buildPerformanceManifestSystemBlocks,
    resolveOrganicMemoryPromptContext,
  }
}
