import type {
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConcernContinuityLedgerSnapshot,
  AlicizationInquiryPlannerSnapshot,
  AlicizationIntentionStreamSnapshot,
  AlicizationMindKernelSnapshot,
  AlicizationMindProjectKind,
  AlicizationMindProjectSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationRepairLedgerSnapshot,
  AlicizationSelfGovernorSnapshot,
  AlicizationThoughtThreadStateSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

const projectLimit = 6

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

function stableProjectId(kind: AlicizationMindProjectKind, anchor: string, threadId?: string | null) {
  return [
    'mind-project',
    kind,
    sanitizeText(anchor, 120).toLowerCase() || 'global',
    sanitizeText(threadId, 120).toLowerCase() || 'threadless',
  ].join('::')
}

function ttlMs(kind: AlicizationMindProjectKind) {
  switch (kind) {
    case 'repair-truth':
    case 'reacquire-scene':
      return 30 * 60_000
    case 'hold-knot':
      return 40 * 60_000
    case 'care-host':
      return 35 * 60_000
    case 'stay-near':
    case 'witness-afterglow':
      return 24 * 60_000
  }
}

function governingConcern(ledger?: AlicizationConcernContinuityLedgerSnapshot | null) {
  return ledger?.entries.find(entry => entry.id === ledger.governingEntryId)
    ?? ledger?.entries[0]
    ?? null
}

function governingRepair(ledger?: AlicizationRepairLedgerSnapshot | null) {
  return ledger?.entries.find(entry => entry.id === ledger.governingRepairId)
    ?? ledger?.entries[0]
    ?? null
}

function governingCommitment(ledger?: AlicizationCommitmentLedgerSnapshot | null) {
  return ledger?.commitments.find(entry => entry.id === ledger.governingCommitmentId)
    ?? ledger?.commitments[0]
    ?? null
}

function activeInquiryPlan(planner?: AlicizationInquiryPlannerSnapshot | null) {
  return planner?.plans.find(plan => plan.id === planner.activePlanId)
    ?? planner?.plans[0]
    ?? null
}

function foregroundThoughtThread(thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null) {
  return thoughtThreads?.threads.find(thread => thread.id === thoughtThreads.foregroundThreadId)
    ?? thoughtThreads?.threads[0]
    ?? null
}

function dominantGovernorIntention(selfGovernor?: AlicizationSelfGovernorSnapshot | null) {
  return selfGovernor?.activeIntentions.find(intention => intention.id === selfGovernor.dominantIntentionId)
    ?? selfGovernor?.activeIntentions[0]
    ?? null
}

function projectScore(project: AlicizationMindProjectSnapshot) {
  return project.tension * 0.34
    + project.confidence * 0.18
    + project.continuityWeight * 0.28
    + project.speakAffinity * 0.12
    + (project.status === 'active' ? 0.08 : project.status === 'stabilizing' ? 0.04 : 0)
}

function createProject(input: {
  now: number
  kind: AlicizationMindProjectKind
  title: string
  summary: string
  tension: number
  confidence: number
  continuityWeight: number
  speakAffinity: number
  sourceTags: string[]
  targetThreadId?: string | null
  targetConcernEntryId?: string | null
  targetRepairId?: string | null
  targetCommitmentId?: string | null
  targetInquiryPlanId?: string | null
  targetThoughtThreadId?: string | null
  targetGovernorIntentionId?: string | null
  withheld?: boolean
  previous?: AlicizationMindProjectSnapshot | null
}) {
  const summary = sanitizeText(input.summary, 180) || sanitizeText(input.title, 120) || input.kind
  const id = stableProjectId(input.kind, summary, input.targetThreadId ?? null)
  return {
    id,
    kind: input.kind,
    status: input.withheld
      ? 'withheld'
      : input.tension >= 0.38
        ? 'active'
        : input.previous
          ? 'stabilizing'
          : 'forming',
    title: sanitizeText(input.title, 120) || input.kind,
    summary,
    tension: clamp01(input.tension),
    confidence: clamp01(input.confidence),
    continuityWeight: clamp01(input.continuityWeight),
    speakAffinity: clamp01(input.speakAffinity),
    sourceTags: input.sourceTags.map(tag => sanitizeText(tag, 48)).filter(Boolean).slice(0, 8),
    targetThreadId: sanitizeText(input.targetThreadId, 160) || null,
    targetConcernEntryId: sanitizeText(input.targetConcernEntryId, 160) || null,
    targetRepairId: sanitizeText(input.targetRepairId, 160) || null,
    targetCommitmentId: sanitizeText(input.targetCommitmentId, 160) || null,
    targetInquiryPlanId: sanitizeText(input.targetInquiryPlanId, 160) || null,
    targetThoughtThreadId: sanitizeText(input.targetThoughtThreadId, 160) || null,
    targetGovernorIntentionId: sanitizeText(input.targetGovernorIntentionId, 160) || null,
    formedAt: input.previous?.formedAt ?? input.now,
    lastUpdatedAt: input.now,
    expiresAt: input.now + ttlMs(input.kind),
  } satisfies AlicizationMindProjectSnapshot
}

function shouldCarryProject(input: {
  now: number
  project: AlicizationMindProjectSnapshot
  worldModel?: AlicizationWorldModelSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
}) {
  if (input.project.expiresAt <= input.now)
    return false
  if (input.worldModel?.continuity.afterglowOpen)
    return true
  if (input.worldModel?.activeThread?.unresolved)
    return true
  if (input.repairLedger?.shouldConstrainPresentTense)
    return true
  return input.now - input.project.lastUpdatedAt <= 10 * 60_000
}

export function buildIntentionStream(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel?: AlicizationWorldModelSnapshot | null
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  previous?: AlicizationIntentionStreamSnapshot | null
}): AlicizationIntentionStreamSnapshot {
  const concern = governingConcern(input.concernContinuity)
  const repair = governingRepair(input.repairLedger)
  const commitment = governingCommitment(input.commitmentLedger)
  const inquiryPlan = activeInquiryPlan(input.inquiryPlanner)
  const thoughtThread = foregroundThoughtThread(input.thoughtThreads)
  const governorIntention = dominantGovernorIntention(input.selfGovernor)
  const previousProjects = new Map((input.previous?.projects ?? []).map(project => [project.id, project]))
  const projects: AlicizationMindProjectSnapshot[] = []

  const repairAnchor = repair?.summary
    ?? inquiryPlan?.question
    ?? input.worldModel?.epistemicState.openQuestions[0]
    ?? 'Repair the truth boundary before speaking.'
  const repairProjectId = stableProjectId('repair-truth', repairAnchor, input.worldModel?.activeThread?.id ?? null)
  if (
    repair
    || input.repairLedger?.shouldConstrainPresentTense
    || inquiryPlan?.kind === 'reground-scene'
  ) {
    projects.push(createProject({
      now: input.now,
      kind: 'repair-truth',
      title: repair?.kind ?? 'repair-truth',
      summary: repairAnchor,
      tension: clamp01(
        (repair?.urgency ?? 0.24) * 0.44
        + (input.repairLedger?.repairPressure ?? 0.2) * 0.26
        + (input.repairLedger?.shouldConstrainPresentTense ? 0.22 : 0)
        + (input.mindKernel?.dominantMode === 'repairing' || input.mindKernel?.dominantMode === 'orienting' ? 0.08 : 0)
        + (input.worldModel?.epistemicState.certainty === 'uncertain' ? 0.18 : input.worldModel?.epistemicState.certainty === 'lingering' ? 0.08 : 0),
      ),
      confidence: clamp01(
        (repair?.confidence ?? 0.36) * 0.44
        + (inquiryPlan ? 0.12 : 0.04)
        + 0.24,
      ),
      continuityWeight: clamp01(
        (input.repairLedger?.truthRisk ?? 0.18) * 0.34
        + (input.repairLedger?.repairPressure ?? 0.22) * 0.28
        + (input.worldModel?.activeThread?.unresolved ? 0.14 : 0)
        + (input.previous?.carryPressure ?? 0.18) * 0.14,
      ),
      speakAffinity: input.repairLedger?.shouldConstrainPresentTense ? 0.06 : 0.14,
      sourceTags: ['repair-ledger', inquiryPlan?.kind ?? '', repair?.kind ?? ''],
      targetThreadId: input.worldModel?.activeThread?.id ?? null,
      targetConcernEntryId: concern?.id ?? null,
      targetRepairId: repair?.id ?? null,
      targetCommitmentId: commitment?.id ?? null,
      targetInquiryPlanId: inquiryPlan?.id ?? null,
      targetThoughtThreadId: thoughtThread?.id ?? null,
      targetGovernorIntentionId: governorIntention?.id ?? null,
      withheld: input.selfGovernor?.dominantDrive === 'withhold',
      previous: previousProjects.get(repairProjectId) ?? null,
    }))
  }

  const holdKnotAnchor = concern?.summary
    ?? commitment?.summary
    ?? thoughtThread?.summary
    ?? input.worldModel?.activeThread?.summary
    ?? 'Keep the current knot in hand until it localizes.'
  const holdKnotProjectId = stableProjectId('hold-knot', holdKnotAnchor, input.worldModel?.activeThread?.id ?? null)
  if (
    concern?.kind === 'help-fix'
    || concern?.kind === 'unfinished-thread'
    || commitment?.kind === 'hold-problem'
    || commitment?.kind === 'follow-through'
    || thoughtThread?.kind === 'problem-thread'
    || input.worldModel?.activeThread?.unresolved
  ) {
    projects.push(createProject({
      now: input.now,
      kind: 'hold-knot',
      title: input.worldModel?.activeThread?.title ?? thoughtThread?.title ?? 'hold-knot',
      summary: holdKnotAnchor,
      tension: clamp01(
        (concern?.continuityWeight ?? concern?.confidence ?? 0.36) * 0.3
        + (input.worldModel?.activeThread?.significance ?? 0.22) * 0.2
        + (input.worldModel?.activeThread?.unresolved ? 0.2 : 0)
        + (thoughtThread?.salience ?? 0.18) * 0.12
        + (governorIntention?.kind === 'hold-thread' ? 0.12 : 0),
      ),
      confidence: clamp01(
        (concern?.confidence ?? 0.42) * 0.24
        + (thoughtThread?.confidence ?? 0.42) * 0.16
        + (input.worldModel?.activeThread?.confidence ?? 0.36) * 0.24
        + 0.18,
      ),
      continuityWeight: clamp01(
        (concern?.continuityWeight ?? 0.32) * 0.34
        + (input.worldModel?.continuity.afterglowOpen ? 0.12 : 0)
        + (input.previous?.carryPressure ?? 0.18) * 0.12
        + (thoughtThread?.salience ?? 0.18) * 0.16
        + (governorIntention?.patience ?? 0.22) * 0.12,
      ),
      speakAffinity: clamp01(
        (input.worldModel?.epistemicState.certainty === 'grounded' ? 0.34 : input.worldModel?.epistemicState.certainty === 'observed' ? 0.24 : 0.12)
        + (input.relationshipModel?.approachVector === 'guide' ? 0.14 : 0)
        + (input.context.system.inputActivity === 'active' ? -0.06 : 0),
      ),
      sourceTags: ['concern-continuity', commitment?.kind ?? '', thoughtThread?.kind ?? ''],
      targetThreadId: input.worldModel?.activeThread?.id ?? null,
      targetConcernEntryId: concern?.id ?? null,
      targetRepairId: repair?.id ?? null,
      targetCommitmentId: commitment?.id ?? null,
      targetInquiryPlanId: inquiryPlan?.id ?? null,
      targetThoughtThreadId: thoughtThread?.id ?? null,
      targetGovernorIntentionId: governorIntention?.id ?? null,
      withheld: input.selfGovernor?.dominantDrive === 'withhold' && (repair?.urgency ?? 0) >= 0.48,
      previous: previousProjects.get(holdKnotProjectId) ?? null,
    }))
  }

  const careAnchor = concern?.summary
    ?? commitment?.summary
    ?? input.worldModel?.activeThread?.summary
    ?? 'Care for the host instead of only narrating the scene.'
  const careProjectId = stableProjectId('care-host', careAnchor, input.worldModel?.activeThread?.id ?? null)
  if (
    concern?.kind === 'care-body'
    || commitment?.kind === 'care-host'
    || input.worldModel?.activeThread?.kind === 'late-night-endurance'
    || input.worldModel?.activeThread?.kind === 'recovery'
  ) {
    projects.push(createProject({
      now: input.now,
      kind: 'care-host',
      title: 'care-host',
      summary: careAnchor,
      tension: clamp01(
        input.context.relationship.fatigue / 100 * 0.26
        + Math.min(1, input.context.relationship.lateNightActiveMinutes / 180) * 0.22
        + (input.worldModel?.activeThread?.kind === 'recovery' ? 0.28 : 0)
        + (concern?.kind === 'care-body' ? 0.22 : 0),
      ),
      confidence: clamp01(
        (concern?.confidence ?? 0.38) * 0.24
        + (input.relationshipModel?.receptivity ?? 0.44) * 0.14
        + 0.3,
      ),
      continuityWeight: clamp01(
        (input.context.relationship.lateNightActiveMinutes > 0 ? 0.22 : 0)
        + (input.previous?.carryPressure ?? 0.18) * 0.12
        + (governorIntention?.kind === 'care-host' || governorIntention?.kind === 'protect-host' ? 0.2 : 0),
      ),
      speakAffinity: clamp01(
        0.26
        + (input.context.relationship.fatigue >= 55 ? 0.2 : 0)
        + (input.worldModel?.hostState.availability === 'fatigued' ? 0.18 : input.worldModel?.hostState.availability === 'open' ? 0.08 : 0),
      ),
      sourceTags: ['care', input.worldModel?.activeThread?.kind ?? '', commitment?.kind ?? ''],
      targetThreadId: input.worldModel?.activeThread?.id ?? null,
      targetConcernEntryId: concern?.id ?? null,
      targetCommitmentId: commitment?.id ?? null,
      targetThoughtThreadId: thoughtThread?.id ?? null,
      targetGovernorIntentionId: governorIntention?.id ?? null,
      previous: previousProjects.get(careProjectId) ?? null,
    }))
  }

  const stayNearAnchor = thoughtThread?.summary
    ?? governorIntention?.summary
    ?? commitment?.summary
    ?? 'Stay near the host without breaking their seam.'
  const stayNearProjectId = stableProjectId('stay-near', stayNearAnchor, input.worldModel?.activeThread?.id ?? null)
  if (
    commitment?.kind === 'stay-near'
    || governorIntention?.kind === 'stay-near'
    || thoughtThread?.kind === 'relationship-thread'
    || (input.relationshipModel?.approachVector === 'stay-near' && !input.repairLedger?.shouldConstrainPresentTense)
  ) {
    projects.push(createProject({
      now: input.now,
      kind: 'stay-near',
      title: 'stay-near',
      summary: stayNearAnchor,
      tension: clamp01(
        (input.relationshipModel?.sharedAttentionTrust ?? 0.42) * 0.2
        + Math.max(input.context.relationship.boredom, input.context.relationship.loneliness) / 100 * 0.18
        + (input.worldModel?.continuity.afterglowOpen ? 0.12 : 0)
        + (input.mindKernel?.dominantMode === 'accompanying' ? 0.08 : 0)
        + (thoughtThread?.salience ?? 0.2) * 0.12,
      ),
      confidence: clamp01(
        (input.relationshipModel?.receptivity ?? 0.44) * 0.24
        + (thoughtThread?.confidence ?? 0.38) * 0.18
        + 0.24,
      ),
      continuityWeight: clamp01(
        (input.previous?.carryPressure ?? 0.2) * 0.18
        + (input.worldModel?.continuity.afterglowOpen ? 0.24 : 0)
        + (governorIntention?.patience ?? 0.2) * 0.12,
      ),
      speakAffinity: clamp01(
        0.12
        + (input.worldModel?.hostState.availability === 'open' ? 0.12 : 0)
        + (input.context.system.inputActivity === 'idle' ? 0.08 : 0),
      ),
      sourceTags: ['relationship', commitment?.kind ?? '', thoughtThread?.kind ?? ''],
      targetThreadId: input.worldModel?.activeThread?.id ?? null,
      targetCommitmentId: commitment?.id ?? null,
      targetThoughtThreadId: thoughtThread?.id ?? null,
      targetGovernorIntentionId: governorIntention?.id ?? null,
      withheld: input.selfGovernor?.dominantDrive === 'withhold',
      previous: previousProjects.get(stayNearProjectId) ?? null,
    }))
  }

  const reacquireAnchor = inquiryPlan?.question
    ?? repair?.summary
    ?? input.worldModel?.epistemicState.openQuestions[0]
    ?? 'Reacquire the scene before carrying it further.'
  const reacquireProjectId = stableProjectId('reacquire-scene', reacquireAnchor, input.worldModel?.activeThread?.id ?? null)
  if (
    inquiryPlan?.kind === 'reground-scene'
    || input.worldModel?.epistemicState.certainty === 'uncertain'
    || input.worldModel?.epistemicState.certainty === 'lingering'
  ) {
    projects.push(createProject({
      now: input.now,
      kind: 'reacquire-scene',
      title: inquiryPlan?.kind ?? 'reacquire-scene',
      summary: reacquireAnchor,
      tension: clamp01(
        (input.inquiryPlanner?.groundingUrgency ?? 0.22) * 0.38
        + (input.worldModel?.epistemicState.certainty === 'uncertain' ? 0.28 : input.worldModel?.epistemicState.certainty === 'lingering' ? 0.16 : 0)
        + (repair?.urgency ?? 0.18) * 0.14,
      ),
      confidence: clamp01(
        (input.inquiryPlanner?.epistemicPressure ?? 0.22) * 0.22
        + (repair?.confidence ?? 0.32) * 0.2
        + 0.22,
      ),
      continuityWeight: clamp01(
        (input.previous?.carryPressure ?? 0.18) * 0.14
        + (input.worldModel?.activeThread?.unresolved ? 0.14 : 0)
        + (input.worldModel?.continuity.afterglowOpen ? 0.1 : 0),
      ),
      speakAffinity: 0.04,
      sourceTags: ['inquiry', inquiryPlan?.kind ?? '', repair?.kind ?? ''],
      targetThreadId: input.worldModel?.activeThread?.id ?? null,
      targetRepairId: repair?.id ?? null,
      targetCommitmentId: commitment?.id ?? null,
      targetInquiryPlanId: inquiryPlan?.id ?? null,
      targetThoughtThreadId: thoughtThread?.id ?? null,
      targetGovernorIntentionId: governorIntention?.id ?? null,
      withheld: true,
      previous: previousProjects.get(reacquireProjectId) ?? null,
    }))
  }

  const afterglowAnchor = thoughtThread?.summary
    ?? input.worldModel?.activeThread?.summary
    ?? 'The shared scene just loosened and left a tender opening behind.'
  const afterglowProjectId = stableProjectId('witness-afterglow', afterglowAnchor, input.worldModel?.activeThread?.id ?? null)
  if (
    input.worldModel?.continuity.afterglowOpen
    && !input.repairLedger?.shouldConstrainPresentTense
    && (input.relationshipModel?.climate === 'warm' || input.relationshipModel?.climate === 'attuned')
  ) {
    projects.push(createProject({
      now: input.now,
      kind: 'witness-afterglow',
      title: 'witness-afterglow',
      summary: afterglowAnchor,
      tension: clamp01(
        (input.relationshipModel?.sharedAttentionTrust ?? 0.42) * 0.18
        + (thoughtThread?.salience ?? 0.18) * 0.18
        + 0.16,
      ),
      confidence: clamp01(
        (input.relationshipModel?.receptivity ?? 0.44) * 0.2
        + (thoughtThread?.confidence ?? 0.4) * 0.18
        + 0.2,
      ),
      continuityWeight: clamp01(
        0.24
        + (input.previous?.carryPressure ?? 0.18) * 0.18
        + (thoughtThread?.salience ?? 0.18) * 0.12,
      ),
      speakAffinity: clamp01(
        0.28
        + (input.worldModel?.hostState.availability === 'open' ? 0.12 : 0)
        + (input.context.system.inputActivity === 'idle' ? 0.08 : 0),
      ),
      sourceTags: ['afterglow', thoughtThread?.kind ?? '', input.relationshipModel?.climate ?? ''],
      targetThreadId: input.worldModel?.activeThread?.id ?? null,
      targetThoughtThreadId: thoughtThread?.id ?? null,
      targetGovernorIntentionId: governorIntention?.id ?? null,
      previous: previousProjects.get(afterglowProjectId) ?? null,
    }))
  }

  const seenIds = new Set(projects.map(project => project.id))
  for (const previous of input.previous?.projects ?? []) {
    if (seenIds.has(previous.id))
      continue
    if (!shouldCarryProject({
      now: input.now,
      project: previous,
      worldModel: input.worldModel,
      repairLedger: input.repairLedger,
    })) {
      continue
    }
    projects.push({
      ...previous,
      status: previous.status === 'active' ? 'stabilizing' : previous.status,
      lastUpdatedAt: input.now,
    })
  }

  const orderedProjects = projects
    .sort((left, right) => projectScore(right) - projectScore(left))
    .slice(0, projectLimit)
  const dominant = orderedProjects[0]
    ?? input.previous?.projects.find(project => project.id === input.previous?.dominantProjectId)
    ?? input.previous?.projects[0]
    ?? null

  return {
    dominantProjectId: dominant?.id ?? null,
    projects: orderedProjects,
    carryPressure: clamp01(
      orderedProjects.reduce((sum, project) => sum + project.continuityWeight, 0) / Math.max(1, orderedProjects.length),
    ),
    surfaceBias: clamp01(
      orderedProjects.reduce((sum, project) => sum + project.speakAffinity, 0) / Math.max(1, orderedProjects.length),
    ),
    narrative: [
      dominant ? `dominant_project:${dominant.kind}/${dominant.status}` : 'dominant_project:none',
      dominant?.summary ?? '',
      orderedProjects.length > 1 ? `secondary_project:${orderedProjects[1]?.kind ?? 'none'}` : '',
    ].filter(Boolean),
    updatedAt: input.now,
  } satisfies AlicizationIntentionStreamSnapshot
}
