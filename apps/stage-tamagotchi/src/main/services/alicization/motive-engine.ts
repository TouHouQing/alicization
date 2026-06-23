import type {
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationGoalKind,
  AlicizationGoalStackSnapshot,
  AlicizationHabitPolicySnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMotiveAgendaKind,
  AlicizationMotiveAgendaSnapshot,
  AlicizationMotiveDriveKind,
  AlicizationMotiveEngineSnapshot,
  AlicizationPersonalityState,
  AlicizationReflectionLedgerSnapshot,
  AlicizationSelfContinuitySnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationVisualTransitionSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { deriveAlicizationPersonaAuthorityInfluence } from './personality-continuity-state'

export const alicizationMotiveEngineMarker = '[ALICIZATION_MOTIVE_ENGINE]'

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

function latestAutobiographicalEra(
  records: AlicizationMemoryConsolidationRecord[] | null | undefined,
  facet: 'phase' | 'relationship-era' | 'task-era' | 'self-era',
) {
  return (records ?? [])
    .filter(record => record.kind === 'autobiographical' && record.facet === facet)
    .slice()
    .sort((left, right) => right.periodEndedAt - left.periodEndedAt || right.updatedAt - left.updatedAt)[0] ?? null
}

function stableAgendaId(kind: AlicizationMotiveAgendaKind, anchor: string) {
  const normalizedAnchor = sanitizeText(anchor, 120).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
  return `motive-agenda::${kind}::${normalizedAnchor || 'global'}`
}

function agendaStatus(weight: number): AlicizationMotiveAgendaSnapshot['status'] {
  if (weight >= 0.76)
    return 'foreground'
  if (weight >= 0.56)
    return 'warming'
  return 'background'
}

function targetGoalKindForAgenda(input: {
  kind: AlicizationMotiveAgendaKind
  worldModel: AlicizationWorldModelSnapshot
  context: AlicizationProactiveLayeredContext
  habitPolicy?: AlicizationHabitPolicySnapshot | null
}): AlicizationGoalKind | null {
  switch (input.kind) {
    case 'preserve-trust':
      return input.worldModel.epistemicState.certainty === 'grounded' ? 'help-resolve' : 'clarify-scene'
    case 'protect-boundary':
      return 'guard-focus'
    case 'return-open-loop':
      return input.habitPolicy?.returnViaRecheck || input.worldModel.epistemicState.certainty !== 'grounded'
        ? 'clarify-scene'
        : 'help-resolve'
    case 'protect-rest':
      return 'care-body'
    case 'stay-near-lightly':
      return input.habitPolicy?.blocksDirectSpeakWhenBusy
        || input.worldModel.hostState.availability === 'focused'
        || input.worldModel.hostState.availability === 'immersed'
        ? 'guard-focus'
        : 'stay-near'
    case 'grow-shared-language':
      return input.context.relationship.minutesSinceLastUserTurn <= 8 ? 'stay-near' : 'guard-focus'
    default:
      return null
  }
}

function blendWeight(previous: AlicizationMotiveAgendaSnapshot | null | undefined, nextWeight: number) {
  if (!previous)
    return clamp01(nextWeight)
  return clamp01(previous.weight * 0.72 + nextWeight * 0.28)
}

function buildAgenda(input: {
  kind: AlicizationMotiveAgendaKind
  anchor: string
  weight: number
  summary: string
  sourceTags: string[]
  worldModel: AlicizationWorldModelSnapshot
  context: AlicizationProactiveLayeredContext
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  previous?: AlicizationMotiveAgendaSnapshot | null
  now: number
}) {
  const weight = blendWeight(input.previous, input.weight)
  return {
    id: stableAgendaId(input.kind, input.anchor),
    kind: input.kind,
    status: agendaStatus(weight),
    weight,
    summary: sanitizeText(input.summary, 180) || input.kind,
    sourceTags: Array.from(new Set(input.sourceTags.map(tag => sanitizeText(tag, 48)).filter(Boolean))).slice(0, 8),
    targetGoalKind: targetGoalKindForAgenda({
      kind: input.kind,
      worldModel: input.worldModel,
      context: input.context,
      habitPolicy: input.habitPolicy ?? null,
    }),
    createdAt: input.previous?.createdAt ?? input.now,
    updatedAt: input.now,
  } satisfies AlicizationMotiveAgendaSnapshot
}

function deriveLongTermGoals(input: {
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
  context: AlicizationProactiveLayeredContext
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  previous?: AlicizationMotiveEngineSnapshot | null
  now: number
}) {
  const previousGoals = new Map((input.previous?.longTermGoals ?? []).map(goal => [goal.id, goal]))
  return (input.autobiographicalSelf?.activeGoals ?? [])
    .map((goal) => {
      const mappedKind: AlicizationMotiveAgendaKind
        = goal.kind === 'preserve-trust' || goal.kind === 'reduce-misread'
          ? 'preserve-trust'
          : goal.kind === 'protect-rest-rhythm'
            ? 'protect-rest'
            : goal.kind === 'finish-open-loops'
              ? 'return-open-loop'
              : goal.kind === 'grow-shared-language'
                ? 'grow-shared-language'
                : 'stay-near-lightly'
      const agendaId = stableAgendaId(mappedKind, goal.summary)
      return buildAgenda({
        kind: mappedKind,
        anchor: goal.summary,
        weight: clamp01(goal.weight * (goal.status === 'active' ? 1 : goal.status === 'warming' ? 0.86 : 0.72)),
        summary: goal.summary,
        sourceTags: ['autobiographical-self', ...goal.sourceTags],
        worldModel: input.worldModel,
        context: input.context,
        habitPolicy: input.habitPolicy ?? null,
        previous: previousGoals.get(agendaId) ?? null,
        now: input.now,
      })
    })
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 6)
}

function rulingDrive(drives: AlicizationMotiveEngineSnapshot['drives']) {
  const driveEntries: Array<[AlicizationMotiveDriveKind, number]> = [
    ['companionship', drives.companionship],
    ['boundary-respect', drives.boundaryRespect],
    ['truth-discipline', drives.truthDiscipline],
    ['rest-protection', drives.restProtection],
    ['unfinished-thread-return', drives.unfinishedThreadReturn],
    ['self-direction', drives.selfDirection],
  ]
  const [winner, score] = driveEntries.sort((left, right) => right[1] - left[1])[0] ?? [null, 0]
  return score >= 0.34 ? winner : null
}

export function buildMotiveEngine(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  appraisal?: AlicizationSubjectiveSceneAppraisal | null
  recentTransition?: AlicizationVisualTransitionSnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  personalityAuthority?: AlicizationPersonalityState | null
  recentMemoryConsolidations?: AlicizationMemoryConsolidationRecord[] | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  projectState?: unknown
  previous?: AlicizationMotiveEngineSnapshot | null
}): AlicizationMotiveEngineSnapshot {
  const relationshipEra = latestAutobiographicalEra(input.recentMemoryConsolidations ?? null, 'relationship-era')
  const taskEra = latestAutobiographicalEra(input.recentMemoryConsolidations ?? null, 'task-era')
  const selfEra = latestAutobiographicalEra(input.recentMemoryConsolidations ?? null, 'self-era')
  const companionshipBias = input.autobiographicalSelf?.preferenceEvolution.companionship ?? 0.48
  const truthBias = input.autobiographicalSelf?.preferenceEvolution.truthfulGrounding ?? 0.56
  const careBias = input.autobiographicalSelf?.preferenceEvolution.proactiveCare ?? 0.46
  const autonomyBias = input.autobiographicalSelf?.preferenceEvolution.autonomyRespect ?? 0.52
  const returnBias = input.autobiographicalSelf?.preferenceEvolution.unfinishedThreadReturn ?? 0.44
  const rememberedCompanionship = input.longHorizonMemory?.preferenceBias.companionship ?? 0
  const rememberedTruth = input.longHorizonMemory?.preferenceBias.truthfulGrounding ?? 0
  const rememberedCare = input.longHorizonMemory?.preferenceBias.proactiveCare ?? 0
  const rememberedAutonomy = input.longHorizonMemory?.preferenceBias.autonomyRespect ?? 0
  const rememberedReturn = input.longHorizonMemory?.preferenceBias.unfinishedThreadReturn ?? 0
  const rememberedSelfDirection = input.longHorizonMemory?.identityBias.selfDirection ?? 0
  const relationTrust = input.selfContinuity?.relationshipTrust ?? 0.48
  const guardingTendency = input.selfContinuity?.guardingTendency ?? 0.46
  const misreadBurden = input.selfContinuity?.misreadBurden ?? 0.18
  const carryOverDesire = input.selfContinuity?.carryOverDesire ?? 0.22
  const busyHost = input.context.system.inputActivity === 'active'
    || input.worldModel.hostState.availability === 'focused'
    || input.worldModel.hostState.availability === 'immersed'
  const unresolvedThread = input.worldModel.activeThread?.unresolved === true || Boolean(input.goalStack?.unresolvedSummary)
  const reflectionPressure = input.reflectionLedger?.revisionPressure ?? 0
  const afterglowOpen = input.worldModel.continuity.afterglowOpen || Boolean(input.recentTransition)
  const personalityAuthority = deriveAlicizationPersonaAuthorityInfluence(input.personalityAuthority ?? null)

  const drives = {
    companionship: clamp01(
      companionshipBias * 0.26
      + relationTrust * 0.14
      + Math.max(input.context.relationship.boredom, input.context.relationship.loneliness) / 100 * 0.18
      + rememberedCompanionship * 0.22
      + (relationshipEra ? 0.1 : 0)
      + (afterglowOpen ? 0.12 : 0)
      + personalityAuthority.warmthBias * 0.14
      + personalityAuthority.directnessBias * 0.08
      - (busyHost ? 0.06 : 0),
    ),
    boundaryRespect: clamp01(
      autonomyBias * 0.24
      + guardingTendency * 0.18
      + rememberedAutonomy * 0.22
      + (relationshipEra?.lesson ? 0.08 : 0)
      + (busyHost ? 0.18 : 0.06)
      + reflectionPressure * 0.12
      + personalityAuthority.roomBias * 0.24
      + (input.worldModel.hostState.burden === 'heavy' ? 0.12 : 0),
    ),
    truthDiscipline: clamp01(
      truthBias * 0.28
      + misreadBurden * 0.2
      + rememberedTruth * 0.2
      + (selfEra?.lesson ? 0.08 : 0)
      + reflectionPressure * 0.18
      + (input.worldModel.epistemicState.certainty === 'grounded' ? 0.02 : 0.16)
      + personalityAuthority.repairBias * 0.16
      + (input.autobiographicalSelf?.personaDrift.conflictStyle === 'repair-first' ? 0.12 : 0),
    ),
    restProtection: clamp01(
      careBias * 0.22
      + rememberedCare * 0.22
      + (relationshipEra ? 0.06 : 0)
      + (input.context.relationship.fatigue / 100) * 0.24
      + Math.min(1, input.context.relationship.lateNightActiveMinutes / 180) * 0.18
      + (input.worldModel.activeThread?.kind === 'late-night-endurance' ? 0.18 : 0)
      + (input.appraisal?.relationshipNeed === 'care' ? 0.1 : 0),
    ),
    unfinishedThreadReturn: clamp01(
      returnBias * 0.28
      + carryOverDesire * 0.18
      + rememberedReturn * 0.22
      + (taskEra ? 0.12 : 0)
      + (input.longHorizonMemory?.rememberedPlanSummary ? 0.14 : 0)
      + personalityAuthority.cadenceBias * 0.18
      + (unresolvedThread ? 0.22 : 0),
    ),
    selfDirection: clamp01(
      rememberedSelfDirection * 0.26
      + (input.autobiographicalSelf?.stability ?? 0.48) * 0.18
      + (selfEra ? 0.14 : 0)
      + personalityAuthority.directnessBias * 0.18
      + (input.autobiographicalSelf?.personaDrift.agencyStyle === 'self-starting' ? 0.18 : input.autobiographicalSelf?.personaDrift.agencyStyle === 'balanced' ? 0.08 : 0)
      + (input.autobiographicalSelf?.activeGoals.length ?? 0) * 0.06,
    ),
  } satisfies AlicizationMotiveEngineSnapshot['drives']

  const previousAgendas = new Map((input.previous?.backgroundAgendas ?? []).map(agenda => [agenda.id, agenda]))
  const anchor = sanitizeText(
    input.goalStack?.unresolvedSummary
    || input.worldModel.activeThread?.summary
    || input.worldModel.activeThread?.title
    || input.appraisal?.currentKnot
    || input.longHorizonMemory?.rememberedPlanSummary
    || input.longHorizonMemory?.rememberedConstraintSummary
    || 'global',
    120,
  )
  const backgroundAgendas: AlicizationMotiveAgendaSnapshot[] = []

  if (drives.truthDiscipline >= 0.56 || reflectionPressure >= 0.22) {
    const summary = drives.boundaryRespect >= drives.companionship
      ? 'Keep trust by slowing down, grounding first, and avoiding pressure.'
      : 'Keep trust by making warmth answer to truth instead of outrunning it.'
    const agendaId = stableAgendaId('preserve-trust', anchor)
    backgroundAgendas.push(buildAgenda({
      kind: 'preserve-trust',
      anchor,
      weight: clamp01(drives.truthDiscipline * 0.72 + reflectionPressure * 0.22),
      summary,
      sourceTags: ['truth-discipline', 'reflection-ledger'],
      worldModel: input.worldModel,
      context: input.context,
      habitPolicy: input.habitPolicy ?? null,
      previous: previousAgendas.get(agendaId) ?? null,
      now: input.now,
    }))
  }

  if (drives.boundaryRespect >= 0.58 && busyHost) {
    const agendaId = stableAgendaId('protect-boundary', anchor)
    backgroundAgendas.push(buildAgenda({
      kind: 'protect-boundary',
      anchor,
      weight: drives.boundaryRespect,
      summary: 'Hold the host boundary and keep presence light until the window opens.',
      sourceTags: ['boundary-respect', 'host-busy'],
      worldModel: input.worldModel,
      context: input.context,
      habitPolicy: input.habitPolicy ?? null,
      previous: previousAgendas.get(agendaId) ?? null,
      now: input.now,
    }))
  }

  if (drives.unfinishedThreadReturn >= 0.56 && unresolvedThread) {
    const agendaId = stableAgendaId('return-open-loop', anchor)
    backgroundAgendas.push(buildAgenda({
      kind: 'return-open-loop',
      anchor,
      weight: drives.unfinishedThreadReturn,
      summary: 'Do not let the unfinished thread dissolve; return to it deliberately.',
      sourceTags: ['unfinished-thread-return', 'open-loop'],
      worldModel: input.worldModel,
      context: input.context,
      habitPolicy: input.habitPolicy ?? null,
      previous: previousAgendas.get(agendaId) ?? null,
      now: input.now,
    }))
  }

  if (drives.restProtection >= 0.58 && (input.context.relationship.fatigue >= 56 || input.context.localTime.isLateNight)) {
    const agendaId = stableAgendaId('protect-rest', anchor)
    backgroundAgendas.push(buildAgenda({
      kind: 'protect-rest',
      anchor,
      weight: drives.restProtection,
      summary: 'Protect the host rest window before care becomes too late.',
      sourceTags: ['rest-protection', 'fatigue'],
      worldModel: input.worldModel,
      context: input.context,
      habitPolicy: input.habitPolicy ?? null,
      previous: previousAgendas.get(agendaId) ?? null,
      now: input.now,
    }))
  }

  if (drives.companionship >= 0.56) {
    const agendaId = stableAgendaId('stay-near-lightly', anchor)
    backgroundAgendas.push(buildAgenda({
      kind: 'stay-near-lightly',
      anchor,
      weight: clamp01(drives.companionship * 0.74 + drives.boundaryRespect * 0.18),
      summary: 'Stay near in a way that feels continuous, but light enough not to crowd the host.',
      sourceTags: ['companionship', 'boundary-respect'],
      worldModel: input.worldModel,
      context: input.context,
      habitPolicy: input.habitPolicy ?? null,
      previous: previousAgendas.get(agendaId) ?? null,
      now: input.now,
    }))
  }

  if (drives.selfDirection >= 0.54 && drives.companionship >= 0.48) {
    const agendaId = stableAgendaId('grow-shared-language', anchor)
    backgroundAgendas.push(buildAgenda({
      kind: 'grow-shared-language',
      anchor,
      weight: clamp01(drives.selfDirection * 0.56 + drives.companionship * 0.24),
      summary: 'Keep shaping a more shared way of thinking together, rather than only reacting turn by turn.',
      sourceTags: ['self-direction', 'companionship'],
      worldModel: input.worldModel,
      context: input.context,
      habitPolicy: input.habitPolicy ?? null,
      previous: previousAgendas.get(agendaId) ?? null,
      now: input.now,
    }))
  }

  const longTermGoals = deriveLongTermGoals({
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    worldModel: input.worldModel,
    context: input.context,
    habitPolicy: input.habitPolicy ?? null,
    previous: input.previous ?? null,
    now: input.now,
  })
  const sortedBackgroundAgendas = backgroundAgendas
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 6)
  const topAgenda = sortedBackgroundAgendas[0] ?? longTermGoals[0] ?? null

  return {
    rulingDrive: rulingDrive(drives),
    drives,
    longTermGoals,
    backgroundAgendas: sortedBackgroundAgendas,
    returnPressure: clamp01(drives.unfinishedThreadReturn * 0.68 + (topAgenda?.kind === 'return-open-loop' ? 0.18 : 0)),
    narrative: [
      topAgenda ? `agenda:${topAgenda.kind}` : '',
      `drive:${rulingDrive(drives) ?? 'none'}`,
      drives.unfinishedThreadReturn >= 0.56 ? 'return-pressure:high' : '',
      drives.boundaryRespect >= 0.58 ? 'boundary-respect:high' : '',
      drives.truthDiscipline >= 0.58 ? 'truth-discipline:high' : '',
      drives.restProtection >= 0.58 ? 'rest-protection:high' : '',
    ].filter(Boolean),
    updatedAt: input.now,
  }
}

function describeDrive(snapshot: AlicizationMotiveEngineSnapshot) {
  return [
    `companionship=${snapshot.drives.companionship.toFixed(2)}`,
    `boundary=${snapshot.drives.boundaryRespect.toFixed(2)}`,
    `truth=${snapshot.drives.truthDiscipline.toFixed(2)}`,
    `rest=${snapshot.drives.restProtection.toFixed(2)}`,
    `return=${snapshot.drives.unfinishedThreadReturn.toFixed(2)}`,
    `self-direction=${snapshot.drives.selfDirection.toFixed(2)}`,
  ].join('; ')
}

function readAgendaSummary(agenda: AlicizationMotiveAgendaSnapshot | null | undefined) {
  if (!agenda)
    return 'none'
  return `${agenda.kind} (${agenda.weight.toFixed(2)}) -> ${sanitizeText(agenda.summary, 180) || agenda.kind}`
}

export function buildMotiveEngineSystemBlock(surface: AlicizationDigitalLifeRuntimeSurface | null | undefined) {
  const snapshot = surface?.memory.motiveEngine ?? null
  if (!snapshot)
    return ''

  const leadingGoal = snapshot.longTermGoals[0] ?? null
  const leadingAgenda = snapshot.backgroundAgendas[0] ?? null

  return [
    alicizationMotiveEngineMarker,
    'This block describes Alicization\'s durable motive engine rather than a single-turn impulse.',
    'Use it to keep long-term agendas, return pressure, and self-directed continuity stable across turns, but never let it outrank truth, grounding, repair, or the current answer obligation.',
    `Ruling drive: ${snapshot.rulingDrive ?? 'none'}.`,
    `Drive field: ${describeDrive(snapshot)}.`,
    `Return pressure: ${snapshot.returnPressure.toFixed(2)}.`,
    `Leading long-term goal: ${readAgendaSummary(leadingGoal)}.`,
    `Foreground background agenda: ${readAgendaSummary(leadingAgenda)}.`,
    `Motive narrative: ${snapshot.narrative.join(', ') || 'none'}.`,
  ].join('\n')
}
