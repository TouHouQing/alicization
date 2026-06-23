import type { AlicizationMemoryProvenance, AlicizationRecallGovernorSnapshot } from '../../../shared/eventa'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import type { MemoryClusterProbe, MemoryClusterState } from './runtime-organic-memory-prompt-types'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { isAlicizationWeakMemoryProvenance } from '@proj-alicization/stage-shared'

type NegativeRecallSuppressionTag = 'self-model-stale' | 'relationship-era-confusion'
type MemoryRankingProvenance = AlicizationMemoryProvenance

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function normalizeRankingText(raw: string) {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase()
}

function parseHumanlikeRecallTargetList(rawSeed: string, label: 'downrank' | 'merge' | 'forget') {
  const targets: string[] = []
  for (const match of rawSeed.matchAll(new RegExp(`${label}=([^|\\n]+)`, 'giu'))) {
    const payload = typeof match[1] === 'string'
      ? match[1].trim()
      : ''
    if (!payload)
      continue
    for (const rawTarget of payload.split(',')) {
      const target = normalizeRankingText(rawTarget)
      if (!target || targets.includes(target))
        continue
      targets.push(target)
    }
  }
  return targets
}

function humanizeHumanlikeRecallTarget(target: string) {
  return normalizeRankingText(target.replace(/[-_]+/g, ' '))
}

function hasProjectPreflightContinuityAuthority(projectPreflight: string) {
  if (!projectPreflight)
    return false

  const phaseOneClosureStillOpen
    = projectPreflight.includes('phase 1')
      && (
        projectPreflight.includes('open=memory still needs stronger end-to-end closure')
        || projectPreflight.includes('open=execution reopenings still need stronger same-her closure')
        || projectPreflight.includes('memory, initiative, and embodiment still need stronger same-her closure')
        || projectPreflight.includes('same-her')
        || projectPreflight.includes('same her')
        || projectPreflight.includes('same living line')
        || projectPreflight.includes('one living her')
        || projectPreflight.includes('one continuous "her"')
        || projectPreflight.includes('generic task-shell')
        || projectPreflight.includes('generic project-shell')
        || projectPreflight.includes('generic task shell')
        || projectPreflight.includes('generic project shell')
        || projectPreflight.includes('do not flatten')
      )

  return phaseOneClosureStillOpen
}

function rankByLongHorizonMemoryAffinity<T>(input: {
  items: T[]
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
  toText: (item: T) => string
}) {
  const rememberedBoundary = normalizeRankingText(input.hostPersonModel?.preferredClosenessByContext[0]?.preference ?? '')
  const trustRationale = normalizeRankingText(input.hostPersonModel?.trustLadder.rationale ?? '')
  const relationshipTurn = input.recollectionIntent?.mode === 'relationship-history'
  const proceduralTurn = input.recollectionIntent?.mode === 'execution-procedure'
    || input.recollectionIntent?.mode === 'experience-pattern'

  if (!rememberedBoundary && !trustRationale)
    return input.items

  const overlapScore = (left: string, right: string) => {
    if (!left || !right)
      return 0
    const leftTokens = new Set(left.split(/[^a-z0-9\u4E00-\u9FFF]+/u).filter(Boolean))
    const rightTokens = new Set(right.split(/[^a-z0-9\u4E00-\u9FFF]+/u).filter(Boolean))
    if (leftTokens.size === 0 || rightTokens.size === 0)
      return 0
    let overlap = 0
    for (const token of leftTokens) {
      if (rightTokens.has(token))
        overlap += 1
    }
    return overlap / Math.max(leftTokens.size, rightTokens.size)
  }

  return [...input.items]
    .map((item, index) => {
      const text = normalizeRankingText(input.toText(item))
      const boundaryOverlap = overlapScore(text, rememberedBoundary)
      const trustOverlap = overlapScore(text, trustRationale)
      let score = 0

      if (relationshipTurn) {
        score += boundaryOverlap * 0.34
        score += trustOverlap * 0.24
      }
      if (proceduralTurn) {
        score += boundaryOverlap * 0.16
        score += trustOverlap * 0.14
      }
      if (/\bgrounded\b|\brepair\b|\bspace\b|\broom\b|\bverify\b|\breturn to\b|\bseam\b|先确认|修复|空间|边界|回到/u.test(text))
        score += relationshipTurn ? 0.08 : 0.06

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

function rankByProjectPreflightContinuityBias<T>(input: {
  items: T[]
  recallGovernor?: AlicizationRecallGovernorSnapshot | null
  toText: (item: T) => string
}) {
  const narrative = Array.isArray(input.recallGovernor?.narrative)
    ? input.recallGovernor?.narrative
    : []
  const projectPreflight = narrative
    .filter((item): item is string => typeof item === 'string' && item.startsWith('project-preflight:'))
    .map(item => item.toLowerCase())
    .join(' ')

  const phaseOneClosureStillOpen = hasProjectPreflightContinuityAuthority(projectPreflight)
  if (!phaseOneClosureStillOpen || input.items.length <= 1)
    return input.items

  return [...input.items]
    .map((item, index) => {
      const text = normalizeRankingText(input.toText(item))
      let score = 0

      if (/\bproject\b.*\bclosure\b|\bsame-her\b|\bsame digital life\b|\bphase 1\b|\bsame living line\b|\bdo not reopen from scratch\b|\blower-pressure\b|\bmeasured-return\b|project closure|same living line|phase 1|同一个她|同一条线|数字生命|不要重新开始|低压|留白|慢一点/u.test(text))
        score += 0.24
      if (/\brepair\b|\bverify\b|\bspace\b|\broom\b|\breturn\b|\bseam\b|修复|先确认|空间|留白|回到|这条线/u.test(text))
        score += 0.2
      if (/\bwarmth\b|\bclose\b|\bcloseness\b|\btender\b|靠近|亲密|温和/u.test(text))
        score -= 0.08

      return { item, index, score }
    })
    .sort((left, right) => {
      if (left.score !== right.score)
        return right.score - left.score
      return left.index - right.index
    })
    .map(entry => entry.item)
}

function deriveHumanlikeRecallAuthority(input: {
  recallSeed: string
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
}) {
  const seed = normalizeRankingText(input.recallSeed)
  if (!seed.includes('humanlike_memory_recall:'))
    return null

  const relationshipHistoryTurn = input.recollectionIntent?.mode === 'relationship-history'
    || input.recollectionIntent?.mode === 'conversation-history'
  const proceduralTurn = input.recollectionIntent?.mode === 'execution-procedure'
    || input.recollectionIntent?.mode === 'experience-pattern'

  const samePersonCarry = /\bsame[- ]?person\b|\bsame[- ]?her\b|\bsame living line\b|\bone continuous\b|\bcontinuous digital life\b|\btool shell\b|同一个她|同一条线|持续的人|持续人格|数字生命|工具壳/u.test(seed)
  const correctedMeaning = /\bhost corrected this memory meaning\b|\bcertainty=corrected\b|\bcorrected[- ]meaning\b|我记得你纠正过/u.test(seed)
  const tentativeMeaning = /\bcertainty=tentative\b|\bi am not fully sure\b|\bnot fully sure\b|我不完全确定/u.test(seed)
  const genericStatusSuppressed = /\bnot a status report\b|\bnot .*status recap\b|\bnot .*generic recap\b|不是状态汇报|不是要状态汇报|不是催进度/u.test(seed)
  const protectiveContinuity = /\bprotective-continuity\b|\bunfinishedness\b|\bcorrected-meaning\b|\bhost correction\b|\bsame-person continuity\b|\bsame living line\b|\btool shell\b|未完成|工具壳/u.test(seed)
  const vulnerableCareCarry = /\brest-protective\b|\bvulnerable-care\b|\bcare-before-analysis\b|\blighter companionship\b|\bstay nearby gently\b|\bfragile\b|\boverloaded\b|轻一点|先陪|不要分析太多/u.test(seed)

  if ((!relationshipHistoryTurn && !proceduralTurn) || (!samePersonCarry && !vulnerableCareCarry))
    return null

  return {
    relationshipHistoryTurn,
    proceduralTurn,
    correctedMeaning,
    tentativeMeaning,
    genericStatusSuppressed,
    protectiveContinuity,
    vulnerableCareCarry,
    downrankTargets: parseHumanlikeRecallTargetList(input.recallSeed, 'downrank'),
    mergeTargets: parseHumanlikeRecallTargetList(input.recallSeed, 'merge'),
    forgetTargets: parseHumanlikeRecallTargetList(input.recallSeed, 'forget'),
  }
}

function rankByHumanlikeRecallAuthority<T>(input: {
  items: T[]
  recallSeed: string
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  toText: (item: T) => string
  getId?: ((item: T) => string | null | undefined) | undefined
}) {
  const authority = deriveHumanlikeRecallAuthority({
    recallSeed: input.recallSeed,
    recollectionIntent: input.recollectionIntent,
  })
  if (!authority || input.items.length <= 1)
    return input.items

  return [...input.items]
    .map((item, index) => {
      const text = normalizeRankingText(input.toText(item))
      const id = normalizeRankingText(input.getId?.(item) ?? '')
      const matchesTarget = (targets: string[]) => {
        return targets.some((target) => {
          if (id && id === target)
            return true
          const humanizedTarget = humanizeHumanlikeRecallTarget(target)
          return Boolean(
            (target && text.includes(target))
            || (humanizedTarget && text.includes(humanizedTarget)),
          )
        })
      }

      const mergedAway = matchesTarget(authority.mergeTargets)
      const forgotten = matchesTarget(authority.forgetTargets)
      const downranked = matchesTarget(authority.downrankTargets)
      let score = 0

      if (/\bsame[- ]?person\b|\bsame[- ]?her\b|\bsame living line\b|\bone continuous\b|\bcontinuous digital life\b|\btool shell\b|同一个她|同一条线|持续的人|数字生命|工具壳/u.test(text))
        score += authority.correctedMeaning ? 0.42 : 0.28
      if (authority.vulnerableCareCarry && (/\brest-protective\b|\bvulnerable-care\b|\bcare-before-analysis\b|\blighter companionship\b|\bstay nearby gently\b|\bfragile\b|\boverloaded\b|轻一点|先陪|不要分析太多/u.test(text)))
        score += 0.42
      if (/\brepair\b|\broom\b|\bspace\b|\breturn\b|\bseam\b|\blower-pressure\b|\bmeasured-return\b|\bnot a status report\b|\bnot .*status recap\b|修复|空间|留白|回到|低压|不是状态汇报/u.test(text))
        score += authority.relationshipHistoryTurn ? 0.18 : 0.12
      if (authority.protectiveContinuity && (/\bunfinished\b|\bclosure\b|\bstill open\b|\bcontinue\b|\bkeep carrying\b|未完成|闭环|继续推进|还没收完/u.test(text)))
        score += authority.correctedMeaning ? 0.16 : 0.1
      if (authority.vulnerableCareCarry && (/\banalysis-heavy\b|\banalysis heavy\b|\banalytical\b|\banalysis-first\b|\bexplain the problem\b|\bdirect\b|\bmove closer quickly\b|\bcloser quickly\b|\brush closeness\b|\bextra pressure\b|马上分析|先分析|分析太多|一下子拉近|太近/u.test(text)))
        score -= 0.32
      if (/\bprogress\b|\bstatus recap\b|\bstatus report\b|\bconcise\b|\bgeneric recap\b|\bprogress update\b|进度|状态汇报|简短汇报/u.test(text))
        score -= authority.genericStatusSuppressed ? 0.3 : 0.14
      if (authority.tentativeMeaning && /\bold\b|\bolder\b|\bprevious\b|\bgeneric recap\b|\bstatus report\b|\bconcise\b|旧|旧理解|状态汇报/u.test(text))
        score -= 0.08
      if (downranked)
        score -= 0.2
      if (mergedAway)
        score -= 0.3
      if (forgotten)
        score -= 0.4

      return { item, index, score }
    })
    .sort((left, right) => {
      if (left.score !== right.score)
        return right.score - left.score
      return left.index - right.index
    })
    .map(entry => entry.item)
}

function deriveEmbodimentCadenceRecallAuthority(input: {
  recallSeed: string
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
}) {
  const seed = normalizeRankingText(input.recallSeed)
  const relationshipHistoryTurn = input.recollectionIntent?.mode === 'relationship-history'
  const embodimentConfirmedMeasuredReturn = /\bcontinuity_cadence_reconfirmation\b|\bbody=measured-return\b|\bblink=linger\b|\bgaze=soften\b|\bmeasured-return body line\b|\bdurable relationship rhythm\b|\broom-first\b|same thread|measured-return|留白|慢一点/u.test(seed)
  const embodimentConfirmedRepairHold = /\bbody=repair-before-closeness\b|\brepair-before-closeness\b|\brepair first\b|\brepair-first\b|\brepair before closeness\b|先修复|先别靠近/u.test(seed)
  const embodimentConfirmedQuietSameHer = /\bresident=quiet-companionship\b|\bcontinuity=quiet-same-her\b|\bquiet same-her continuity\b|\bsame-her-inward-carry\b|\bbody=quiet-companionship\b|安静陪着|先别外扩/u.test(seed)

  if (!relationshipHistoryTurn || (!embodimentConfirmedMeasuredReturn && !embodimentConfirmedRepairHold && !embodimentConfirmedQuietSameHer))
    return null

  return {
    measuredReturn: embodimentConfirmedMeasuredReturn,
    repairBeforeCloseness: embodimentConfirmedRepairHold,
    quietSameHer: embodimentConfirmedQuietSameHer,
  }
}

function rankByEmbodimentCadenceRecallAuthority<T>(input: {
  items: T[]
  recallSeed: string
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  toText: (item: T) => string
}) {
  const authority = deriveEmbodimentCadenceRecallAuthority({
    recallSeed: input.recallSeed,
    recollectionIntent: input.recollectionIntent,
  })
  if (!authority || input.items.length <= 1)
    return input.items

  return [...input.items]
    .map((item, index) => {
      const text = normalizeRankingText(input.toText(item))
      let score = 0

      if (/\broom\b|\bspace\b|\brepair\b|\breturn\b|\bsame thread\b|\bseam\b|\bboundary\b|\bverify\b|留白|空间|修复|回到|边界|先确认/u.test(text))
        score += authority.repairBeforeCloseness ? 0.28 : 0.22
      if (/\bmeasured\b|\bslow\b|\bgentle\b|\blinger\b|\bsoften\b|\blow-pressure\b|慢一点|轻一点|低压|停留/u.test(text))
        score += authority.measuredReturn ? 0.16 : 0.08
      if (/\bquiet same-her continuity\b|\bsame-her-inward-carry\b|\bquiet-companionship\b|\binward\b|\bsame living line stayed inward\b|安静陪着|先别外扩/u.test(text))
        score += authority.quietSameHer ? 0.2 : 0.06
      if (/\bwarmth\b|\bclose\b|\bcloseness\b|\btender\b|\bintimacy\b|靠近|亲密|温和/u.test(text))
        score -= authority.repairBeforeCloseness ? 0.16 : 0.1

      return { item, index, score }
    })
    .sort((left, right) => {
      if (left.score !== right.score)
        return right.score - left.score
      return left.index - right.index
    })
    .map(entry => entry.item)
}

function uniqueSuppressionVariants(values: MemoryClusterState['competingVariants']) {
  const result: MemoryClusterState['competingVariants'] = []
  const seen = new Set<string>()
  for (const value of values) {
    const key = `${value.id}:${value.summary}`
    if (seen.has(key))
      continue
    seen.add(key)
    result.push(value)
  }
  return result.slice(0, 8)
}

function deriveNegativeRecallSuppressionSignal(input: {
  text: string
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  tuningAdvice: AlicizationMemoryTuningAdvice | null
  mode: 'consolidation' | 'window' | 'episode' | 'conversation'
  provenance?: MemoryRankingProvenance | null
}) {
  const tuningAdvice = input.tuningAdvice ?? null
  if (!tuningAdvice)
    return { penalty: 0, tags: [] as NegativeRecallSuppressionTag[], reasons: [] as string[] }

  const staleSelfModelVetoRate = clamp01(tuningAdvice.staleSelfModelVetoRate ?? 0)
  const relationshipEraConfusionRate = clamp01(tuningAdvice.relationshipEraConfusionRate ?? 0)
  if (staleSelfModelVetoRate < 0.18 && relationshipEraConfusionRate < 0.18)
    return { penalty: 0, tags: [] as NegativeRecallSuppressionTag[], reasons: [] as string[] }

  const normalized = normalizeRankingText(input.text)
  const unreliableProvenance = isAlicizationWeakMemoryProvenance(input.provenance)
  const tags: NegativeRecallSuppressionTag[] = []
  const reasons: string[] = []
  let penalty = 0

  const selfModelTurn = input.recollectionIntent?.mode === 'autobiographical-history'
    || /\bself-era\b|\bself story\b|\bself-story\b|\bidentity\b|\bautobiographical\b|自我|身份|叙事/u.test(normalized)
  const staleSelfCue = /\bol(d|der)\b|\bprevious self\b|\bstale\b|\brevision\b|\brevised\b|\bidentity revision\b|\bolder self-story\b|旧理解|旧叙事|旧自我|之前那套|修正自己|身份修正/u.test(normalized)
  if (staleSelfModelVetoRate >= 0.18 && selfModelTurn && staleSelfCue) {
    const provenancePenalty = unreliableProvenance ? 0.08 : 0
    penalty += 0.16 + staleSelfModelVetoRate * 0.3 + provenancePenalty
    tags.push('self-model-stale')
    reasons.push('Stale self-model veto pressure is elevated, so an older self-story cluster was demoted before deliberation.')
  }

  const relationshipTurn = input.recollectionIntent?.mode === 'relationship-history'
    || /\brelationship\b|\bbond\b|\btrust\b|\brepair\b|\bboundary\b|\bdistance\b|\bcloseness\b|\brelationship-era\b|关系|信任|修复|边界|距离|亲密/u.test(normalized)
  const relationshipCue = /\brelationship\b|\brepair\b|\bboundary\b|\bdistance\b|\bspace\b|\broom\b|\bcloseness\b|\bwarmth\b|关系|修复|边界|距离|空间|靠近|亲密|温和/u.test(normalized)
  const phaseConfusionCue = /\bold\b|\bprevious\b|\banother repair\b|\bdifferent repair\b|\bwrong one\b|\bnot that time\b|\bsame wound\b|\bold wound\b|\bold hurt\b|\bphase\b|\bera\b|\bwarmth before room\b|\bclose before space\b|不是那次|记错|另一条|旧伤|关系阶段|修复期|先靠近|过早靠近/u.test(normalized)
  const reconstructedWarmthRisk = unreliableProvenance && /\bwarm\b|\bclose\b|\bcloseness\b|\btender\b|\bcompanionship\b|靠近|亲密|温和|陪伴/u.test(normalized)
  if (relationshipEraConfusionRate >= 0.18 && relationshipTurn && relationshipCue && (phaseConfusionCue || reconstructedWarmthRisk)) {
    penalty += 0.14 + relationshipEraConfusionRate * 0.28 + (unreliableProvenance ? 0.06 : 0)
    tags.push('relationship-era-confusion')
    reasons.push('Relationship-era confusion pressure is elevated, so a nearby relationship phase was separated before deliberation.')
  }

  return {
    penalty: clamp01(penalty),
    tags: [...new Set(tags)],
    reasons,
  }
}

function rankByNegativeRecallSuppression<T>(input: {
  items: T[]
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  tuningAdvice: AlicizationMemoryTuningAdvice | null
  mode: 'consolidation' | 'window' | 'episode' | 'conversation'
  toText: (item: T) => string
  getProvenance?: ((item: T) => MemoryRankingProvenance | null) | undefined
}) {
  if (input.items.length <= 1 || !input.tuningAdvice)
    return input.items

  return [...input.items]
    .map((item, index) => {
      const signal = deriveNegativeRecallSuppressionSignal({
        text: input.toText(item),
        recollectionIntent: input.recollectionIntent,
        tuningAdvice: input.tuningAdvice,
        mode: input.mode,
        provenance: input.getProvenance?.(item) ?? null,
      })
      return {
        item,
        index,
        score: -signal.penalty,
      }
    })
    .sort((left, right) => {
      if (left.score !== right.score)
        return right.score - left.score
      return left.index - right.index
    })
    .map(entry => entry.item)
}

function buildNegativeRecallSuppressionVariants(input: {
  probes: MemoryClusterProbe[]
  recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  tuningAdvice: AlicizationMemoryTuningAdvice | null
}) {
  const variants: MemoryClusterState['competingVariants'] = []
  for (const probe of input.probes) {
    const signal = deriveNegativeRecallSuppressionSignal({
      text: [probe.clusterSummary, probe.text, probe.kind].filter(Boolean).join(' '),
      recollectionIntent: input.recollectionIntent,
      tuningAdvice: input.tuningAdvice,
      mode: probe.kind === 'consolidation' || probe.kind === 'window' || probe.kind === 'episode' || probe.kind === 'conversation'
        ? probe.kind
        : 'episode',
      provenance: null,
    })
    for (const tag of signal.tags) {
      variants.push({
        id: `suppression:${tag}`,
        summary: probe.clusterSummary,
        reason: signal.reasons[0] ?? 'Negative recall suppression demoted this nearby memory cluster before deliberation.',
      })
    }
  }
  return uniqueSuppressionVariants(variants)
}

export interface OrganicMemoryCandidateRankingHelpers {
  deriveMemoryClusterKey: (text: string) => string
  rankByHostSocialAffinity: <T>(input: {
    items: T[]
    toText: (item: T) => string
    recallSeed: string
    recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
    personStateProjection: OrganicMemoryPromptContext['personStateProjection'] | null
    coreIncarnation: string
  }) => T[]
  rankBySceneMoodEmbodiedCarry: <T>(input: {
    items: T[]
    toText: (item: T) => string
    getSceneWeight?: ((item: T) => number | null) | undefined
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
  }) => T[]
  rankByBenchmarkTuningBias: <T>(input: {
    items: T[]
    tuningAdvice: AlicizationMemoryTuningAdvice | null
    mode: 'consolidation' | 'window' | 'procedure' | 'episode' | 'conversation'
    toText: (item: T) => string
    getProvenance?: ((item: T) => MemoryRankingProvenance | null) | undefined
  }) => T[]
  rankByRecollectionAgendaAffinity: <T>(input: {
    items: T[]
    recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    toText: (item: T) => string
    getFacet?: ((item: T) => NonNullable<NonNullable<OrganicMemoryPromptContext['recollectionIntent']>['recollectionAgenda']>['candidateEraFacets'][number]['facet'] | null) | undefined
    getAgeDays?: ((item: T) => number | null) | undefined
  }) => T[]
  analyzeMemoryClusters: (input: {
    probes: MemoryClusterProbe[]
    recallSeed: string
    recollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
    hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
    personStateProjection: OrganicMemoryPromptContext['personStateProjection'] | null
    coreIncarnation: string
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
  }) => MemoryClusterState
  rankByClusterDominance: <T>(input: {
    items: T[]
    clusterState: MemoryClusterState
    toClusterText: (item: T) => string
  }) => T[]
}

export interface OrganicMemoryCandidateRankingStageInput {
  helpers: OrganicMemoryCandidateRankingHelpers
  recallSeed: string
  activeRecollectionIntent: OrganicMemoryPromptContext['recollectionIntent'] | null
  hostPersonModel: OrganicMemoryPromptContext['hostPersonModel'] | null
  personStateProjection: OrganicMemoryPromptContext['personStateProjection'] | null
  coreIncarnation: string
  memoryTuningAdvice: AlicizationMemoryTuningAdvice | null
  recallGovernor?: AlicizationRecallGovernorSnapshot | null
  consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
  recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
  proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
  recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
  recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
}

export function rankOrganicMemoryCandidatesStage(input: OrganicMemoryCandidateRankingStageInput) {
  const sociallyRankedConsolidatedMemories = input.helpers.rankByHostSocialAffinity({
    items: input.consolidatedMemories,
    toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
    recallSeed: input.recallSeed,
    recollectionIntent: input.activeRecollectionIntent,
    hostPersonModel: input.hostPersonModel,
    personStateProjection: input.personStateProjection,
    coreIncarnation: input.coreIncarnation,
  })
  const carryRankedConsolidatedMemories = input.helpers.rankBySceneMoodEmbodiedCarry({
    items: sociallyRankedConsolidatedMemories,
    toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
    recallGovernor: input.recallGovernor ?? null,
  })
  const cadenceAuthorityRankedConsolidatedMemories = rankByEmbodimentCadenceRecallAuthority({
    items: carryRankedConsolidatedMemories,
    recallSeed: input.recallSeed,
    recollectionIntent: input.activeRecollectionIntent,
    toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
  })
  const agendaRankedConsolidatedMemories = input.helpers.rankByBenchmarkTuningBias({
    items: rankByNegativeRecallSuppression({
      items: input.helpers.rankByRecollectionAgendaAffinity({
        items: rankByProjectPreflightContinuityBias({
          items: rankByHumanlikeRecallAuthority({
            items: rankByLongHorizonMemoryAffinity({
              items: cadenceAuthorityRankedConsolidatedMemories,
              recollectionIntent: input.activeRecollectionIntent,
              hostPersonModel: input.hostPersonModel,
              toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
            }),
            recallSeed: input.recallSeed,
            recollectionIntent: input.activeRecollectionIntent,
            toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
            getId: item => item.id,
          }),
          recallGovernor: input.recallGovernor ?? null,
          toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
        }),
        recollectionIntent: input.activeRecollectionIntent,
        toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
        getFacet: item => item.facet ?? 'phase',
        getAgeDays: item => Math.max(0, (Date.now() - item.periodEndedAt) / (24 * 60 * 60 * 1000)),
      }),
      recollectionIntent: input.activeRecollectionIntent,
      tuningAdvice: input.memoryTuningAdvice,
      mode: 'consolidation',
      toText: item => [item.periodKey, item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
      getProvenance: item => item.dominantProvenance,
    }),
    tuningAdvice: input.memoryTuningAdvice,
    mode: 'consolidation',
    toText: item => [item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
    getProvenance: item => item.dominantProvenance,
  })

  const sociallyRankedWindows = input.helpers.rankByHostSocialAffinity({
    items: input.recollectedWindows,
    toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
    recallSeed: input.recallSeed,
    recollectionIntent: input.activeRecollectionIntent,
    hostPersonModel: input.hostPersonModel,
    personStateProjection: input.personStateProjection,
    coreIncarnation: input.coreIncarnation,
  })
  const carryRankedWindows = input.helpers.rankBySceneMoodEmbodiedCarry({
    items: sociallyRankedWindows,
    toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
    getSceneWeight: item => item.confidence,
    recallGovernor: input.recallGovernor ?? null,
  })
  const cadenceAuthorityRankedWindows = rankByEmbodimentCadenceRecallAuthority({
    items: carryRankedWindows,
    recallSeed: input.recallSeed,
    recollectionIntent: input.activeRecollectionIntent,
    toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
  })
  const agendaRankedWindows = input.helpers.rankByBenchmarkTuningBias({
    items: rankByNegativeRecallSuppression({
      items: input.helpers.rankByRecollectionAgendaAffinity({
        items: rankByProjectPreflightContinuityBias({
          items: rankByHumanlikeRecallAuthority({
            items: rankByLongHorizonMemoryAffinity({
              items: cadenceAuthorityRankedWindows,
              recollectionIntent: input.activeRecollectionIntent,
              hostPersonModel: input.hostPersonModel,
              toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
            }),
            recallSeed: input.recallSeed,
            recollectionIntent: input.activeRecollectionIntent,
            toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
            getId: item => item.id,
          }),
          recallGovernor: input.recallGovernor ?? null,
          toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
        }),
        recollectionIntent: input.activeRecollectionIntent,
        toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
        getFacet: () => 'window',
        getAgeDays: item => Math.max(0, (Date.now() - item.endedAt) / (24 * 60 * 60 * 1000)),
      }),
      recollectionIntent: input.activeRecollectionIntent,
      tuningAdvice: input.memoryTuningAdvice,
      mode: 'window',
      toText: item => [item.label, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
      getProvenance: item => item.dominantProvenance,
    }),
    tuningAdvice: input.memoryTuningAdvice,
    mode: 'window',
    toText: item => [item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
    getProvenance: item => item.dominantProvenance,
  })

  const sociallyRankedProceduralMemories = input.helpers.rankByHostSocialAffinity({
    items: input.proceduralMemories,
    toText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
    recallSeed: input.recallSeed,
    recollectionIntent: input.activeRecollectionIntent,
    hostPersonModel: input.hostPersonModel,
    personStateProjection: input.personStateProjection,
    coreIncarnation: input.coreIncarnation,
  })
  const carryRankedProceduralMemories = input.helpers.rankBySceneMoodEmbodiedCarry({
    items: sociallyRankedProceduralMemories,
    toText: item => [
      item.label,
      item.approach,
      ...(item.pitfalls ?? []),
      ...(item.cues ?? []),
    ].filter(Boolean).join(' '),
    recallGovernor: input.recallGovernor ?? null,
  })
  const cadenceAuthorityRankedProceduralMemories = rankByEmbodimentCadenceRecallAuthority({
    items: carryRankedProceduralMemories,
    recallSeed: input.recallSeed,
    recollectionIntent: input.activeRecollectionIntent,
    toText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
  })
  const agendaRankedProceduralMemoriesBase = input.helpers.rankByBenchmarkTuningBias({
    items: input.helpers.rankByRecollectionAgendaAffinity({
      items: rankByProjectPreflightContinuityBias({
        items: rankByHumanlikeRecallAuthority({
          items: rankByLongHorizonMemoryAffinity({
            items: cadenceAuthorityRankedProceduralMemories,
            recollectionIntent: input.activeRecollectionIntent,
            hostPersonModel: input.hostPersonModel,
            toText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
          }),
          recallSeed: input.recallSeed,
          recollectionIntent: input.activeRecollectionIntent,
          toText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
          getId: item => item.id,
        }),
        recallGovernor: input.recallGovernor ?? null,
        toText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
      }),
      recollectionIntent: input.activeRecollectionIntent,
      toText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
    }),
    tuningAdvice: input.memoryTuningAdvice,
    mode: 'procedure',
    toText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
  })

  const sociallyRankedEpisodes = input.helpers.rankByHostSocialAffinity({
    items: input.recalledEpisodes,
    toText: item => [
      item.threadAnchor,
      item.whereSummary,
      item.whatHappened,
      item.relationshipMeaning,
      item.lesson,
      ...(item.tags ?? []),
    ].filter(Boolean).join(' '),
    recallSeed: input.recallSeed,
    recollectionIntent: input.activeRecollectionIntent,
    hostPersonModel: input.hostPersonModel,
    personStateProjection: input.personStateProjection,
    coreIncarnation: input.coreIncarnation,
  })
  const carryRankedEpisodes = input.helpers.rankBySceneMoodEmbodiedCarry({
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
    recallGovernor: input.recallGovernor ?? null,
  })
  const cadenceAuthorityRankedEpisodes = rankByEmbodimentCadenceRecallAuthority({
    items: carryRankedEpisodes,
    recallSeed: input.recallSeed,
    recollectionIntent: input.activeRecollectionIntent,
    toText: item => [
      item.threadAnchor,
      item.whereSummary,
      item.whatHappened,
      item.relationshipMeaning,
      item.lesson,
      ...(item.tags ?? []),
    ].filter(Boolean).join(' '),
  })
  const agendaRankedEpisodesBase = input.helpers.rankByBenchmarkTuningBias({
    items: rankByNegativeRecallSuppression({
      items: input.helpers.rankByRecollectionAgendaAffinity({
        items: rankByProjectPreflightContinuityBias({
          items: rankByHumanlikeRecallAuthority({
            items: rankByLongHorizonMemoryAffinity({
              items: cadenceAuthorityRankedEpisodes,
              recollectionIntent: input.activeRecollectionIntent,
              hostPersonModel: input.hostPersonModel,
              toText: item => [
                item.threadAnchor,
                item.whereSummary,
                item.whatHappened,
                item.relationshipMeaning,
                item.lesson,
                ...(item.tags ?? []),
              ].filter(Boolean).join(' '),
            }),
            recallSeed: input.recallSeed,
            recollectionIntent: input.activeRecollectionIntent,
            toText: item => [
              item.threadAnchor,
              item.whereSummary,
              item.whatHappened,
              item.relationshipMeaning,
              item.lesson,
              ...(item.tags ?? []),
            ].filter(Boolean).join(' '),
            getId: item => item.id,
          }),
          recallGovernor: input.recallGovernor ?? null,
          toText: item => [
            item.threadAnchor,
            item.whereSummary,
            item.whatHappened,
            item.relationshipMeaning,
            item.lesson,
            ...(item.tags ?? []),
          ].filter(Boolean).join(' '),
        }),
        recollectionIntent: input.activeRecollectionIntent,
        toText: item => [
          item.threadAnchor,
          item.whereSummary,
          item.whatHappened,
          item.relationshipMeaning,
          item.lesson,
          ...(item.tags ?? []),
        ].filter(Boolean).join(' '),
        getAgeDays: item => Math.max(0, (Date.now() - item.occurredAt) / (24 * 60 * 60 * 1000)),
      }),
      recollectionIntent: input.activeRecollectionIntent,
      tuningAdvice: input.memoryTuningAdvice,
      mode: 'episode',
      toText: item => [
        item.threadAnchor,
        item.whereSummary,
        item.whatHappened,
        item.relationshipMeaning,
        item.lesson,
        item.sourceSummary,
        ...(item.tags ?? []),
      ].filter(Boolean).join(' '),
      getProvenance: item => item.latestReconsolidation?.provenance ?? item.provenance,
    }),
    tuningAdvice: input.memoryTuningAdvice,
    mode: 'episode',
    toText: item => [
      item.threadAnchor,
      item.whereSummary,
      item.whatHappened,
      item.relationshipMeaning,
      item.lesson,
      ...(item.tags ?? []),
    ].filter(Boolean).join(' '),
    getProvenance: item => item.latestReconsolidation?.provenance ?? item.provenance,
  })

  const carryRankedConversationHistory = input.helpers.rankBySceneMoodEmbodiedCarry({
    items: input.recalledConversationHistory,
    toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
    recallGovernor: input.recallGovernor ?? null,
  })
  const cadenceAuthorityRankedConversationHistory = rankByEmbodimentCadenceRecallAuthority({
    items: carryRankedConversationHistory,
    recallSeed: input.recallSeed,
    recollectionIntent: input.activeRecollectionIntent,
    toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
  })
  const agendaRankedConversationHistoryBase = input.helpers.rankByBenchmarkTuningBias({
    items: rankByNegativeRecallSuppression({
      items: input.helpers.rankByRecollectionAgendaAffinity({
        items: rankByProjectPreflightContinuityBias({
          items: rankByHumanlikeRecallAuthority({
            items: rankByLongHorizonMemoryAffinity({
              items: cadenceAuthorityRankedConversationHistory,
              recollectionIntent: input.activeRecollectionIntent,
              hostPersonModel: input.hostPersonModel,
              toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
            }),
            recallSeed: input.recallSeed,
            recollectionIntent: input.activeRecollectionIntent,
            toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
            getId: item => item.turnId ?? `${item.sessionId}:${item.createdAt}`,
          }),
          recallGovernor: input.recallGovernor ?? null,
          toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
        }),
        recollectionIntent: input.activeRecollectionIntent,
        toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
        getAgeDays: item => Math.max(0, (Date.now() - item.createdAt) / (24 * 60 * 60 * 1000)),
      }),
      recollectionIntent: input.activeRecollectionIntent,
      tuningAdvice: input.memoryTuningAdvice,
      mode: 'conversation',
      toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
      getProvenance: item => item.provenance,
    }),
    tuningAdvice: input.memoryTuningAdvice,
    mode: 'conversation',
    toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
    getProvenance: item => item.provenance,
  })

  const clusterProbes = [
    ...agendaRankedConsolidatedMemories.slice(0, 4).map(item => ({
      id: item.id,
      kind: 'consolidation' as const,
      clusterKey: input.helpers.deriveMemoryClusterKey([item.periodKey, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' ')),
      clusterSummary: item.summary,
      text: [item.periodKey, item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
    })),
    ...agendaRankedWindows.slice(0, 4).map(item => ({
      id: item.id,
      kind: 'window' as const,
      clusterKey: input.helpers.deriveMemoryClusterKey([item.label, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' ')),
      clusterSummary: item.summary,
      text: [item.label, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
    })),
    ...agendaRankedProceduralMemoriesBase.slice(0, 4).map(item => ({
      id: item.id,
      kind: 'procedure' as const,
      clusterKey: input.helpers.deriveMemoryClusterKey([item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' ')),
      clusterSummary: item.approach,
      text: [
        item.label,
        item.approach,
        ...(item.pitfalls ?? []),
        ...(item.cues ?? []),
      ].filter(Boolean).join(' '),
    })),
    ...agendaRankedEpisodesBase.slice(0, 4).map(item => ({
      id: item.id,
      kind: 'episode' as const,
      clusterKey: input.helpers.deriveMemoryClusterKey([item.threadAnchor, item.sourceSummary, ...(item.tags ?? [])].filter(Boolean).join(' ')),
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
      clusterKey: input.helpers.deriveMemoryClusterKey([item.userText, item.assistantText].filter(Boolean).join(' ')),
      clusterSummary: [item.userText, item.assistantText].filter(Boolean).join(' | '),
      text: [item.userText, item.assistantText].filter(Boolean).join(' '),
    })),
  ].filter((item): item is MemoryClusterProbe => Boolean(item.clusterKey))
  const analyzedClusterState = input.helpers.analyzeMemoryClusters({
    probes: clusterProbes,
    recallSeed: input.recallSeed,
    recollectionIntent: input.activeRecollectionIntent,
    hostPersonModel: input.hostPersonModel,
    personStateProjection: input.personStateProjection,
    coreIncarnation: input.coreIncarnation,
    recallGovernor: input.recallGovernor ?? null,
  })
  const clusterState: MemoryClusterState = {
    ...analyzedClusterState,
    competingVariants: uniqueSuppressionVariants([
      ...analyzedClusterState.competingVariants,
      ...buildNegativeRecallSuppressionVariants({
        probes: clusterProbes,
        recollectionIntent: input.activeRecollectionIntent,
        tuningAdvice: input.memoryTuningAdvice,
      }),
    ]),
  }

  return {
    clusterState,
    agendaRankedConsolidatedMemoriesClustered: rankByNegativeRecallSuppression({
      items: input.helpers.rankByClusterDominance({
        items: agendaRankedConsolidatedMemories,
        clusterState,
        toClusterText: item => [item.periodKey, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
      }),
      recollectionIntent: input.activeRecollectionIntent,
      tuningAdvice: input.memoryTuningAdvice,
      mode: 'consolidation',
      toText: item => [item.periodKey, item.summary, item.lesson ?? '', ...(item.cues ?? [])].filter(Boolean).join(' '),
      getProvenance: item => item.dominantProvenance,
    }),
    agendaRankedWindowsClustered: rankByNegativeRecallSuppression({
      items: input.helpers.rankByClusterDominance({
        items: agendaRankedWindows,
        clusterState,
        toClusterText: item => [item.label, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
      }),
      recollectionIntent: input.activeRecollectionIntent,
      tuningAdvice: input.memoryTuningAdvice,
      mode: 'window',
      toText: item => [item.label, item.summary, ...(item.cues ?? [])].filter(Boolean).join(' '),
      getProvenance: item => item.dominantProvenance,
    }),
    agendaRankedProceduralMemories: input.helpers.rankByClusterDominance({
      items: agendaRankedProceduralMemoriesBase,
      clusterState,
      toClusterText: item => [item.label, item.approach, ...(item.cues ?? [])].filter(Boolean).join(' '),
    }),
    agendaRankedEpisodes: rankByNegativeRecallSuppression({
      items: input.helpers.rankByClusterDominance({
        items: agendaRankedEpisodesBase,
        clusterState,
        toClusterText: item => [item.threadAnchor, item.sourceSummary, ...(item.tags ?? [])].filter(Boolean).join(' '),
      }),
      recollectionIntent: input.activeRecollectionIntent,
      tuningAdvice: input.memoryTuningAdvice,
      mode: 'episode',
      toText: item => [
        item.threadAnchor,
        item.whereSummary,
        item.whatHappened,
        item.relationshipMeaning,
        item.lesson,
        item.sourceSummary,
        ...(item.tags ?? []),
      ].filter(Boolean).join(' '),
      getProvenance: item => item.latestReconsolidation?.provenance ?? item.provenance,
    }),
    agendaRankedConversationHistory: rankByNegativeRecallSuppression({
      items: input.helpers.rankByClusterDominance({
        items: agendaRankedConversationHistoryBase,
        clusterState,
        toClusterText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
      }),
      recollectionIntent: input.activeRecollectionIntent,
      tuningAdvice: input.memoryTuningAdvice,
      mode: 'conversation',
      toText: item => [item.userText, item.assistantText].filter(Boolean).join(' '),
      getProvenance: item => item.provenance,
    }),
  }
}
