import type {
  AlicizationBeliefLedgerSnapshot,
  AlicizationBeliefRevisionSnapshot,
  AlicizationDurabilityPulseSnapshot,
  AlicizationHypothesisGraphSnapshot,
  AlicizationHypothesisKind,
  AlicizationHypothesisSnapshot,
  AlicizationInquiryLoopSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationVisualTransitionSnapshot,
  AlicizationVisualWatchMode,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

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

function stableHypothesisId(kind: AlicizationHypothesisKind, anchor: string) {
  return `${kind}::${sanitizeText(anchor, 120).toLowerCase() || 'global'}`
}

function isSeriousDurabilityPulse(pulse: AlicizationDurabilityPulseSnapshot | null | undefined) {
  return pulse?.kind === 'process-gone'
    || pulse?.kind === 'anr-likely'
    || pulse?.kind === 'render-process-gone'
    || pulse?.kind === 'child-process-gone'
}

function isAfterglowWindow(input: {
  now: number
  recentTransition?: AlicizationVisualTransitionSnapshot | null
}) {
  const transition = input.recentTransition
  if (!transition)
    return false
  return transition.fromWatchMode === 'symbiotic-vision'
    && (transition.fromScenario === 'coding' || transition.fromScenario === 'media')
    && transition.durationMs >= 20 * 60_000
    && input.now - transition.occurredAt <= 120_000
}

function statusFromSignals(input: {
  salience: number
  confidence: number
  contradictionPressure: number
  kind: AlicizationHypothesisKind
}) {
  if (
    input.kind !== 'misread-drift'
    && input.contradictionPressure >= 0.74
    && input.confidence <= 0.46
  ) {
    return 'contradicted' as const
  }
  if (input.salience >= 0.7 || input.confidence >= 0.76)
    return 'active' as const
  if (input.salience >= 0.48 || input.confidence >= 0.58)
    return 'held' as const
  return 'candidate' as const
}

function buildHypothesis(input: {
  now: number
  kind: AlicizationHypothesisKind
  anchor: string
  summary: string
  confidence: number
  salience: number
  evidence: string[]
  counterEvidence?: string[]
  relatedBeliefId?: string | null
  relatedInquiryId?: string | null
  attentionTarget?: AlicizationHypothesisSnapshot['attentionTarget']
  contradictionPressure?: number
  previous?: AlicizationHypothesisSnapshot | null
}) {
  const id = stableHypothesisId(input.kind, input.anchor)
  return {
    id,
    kind: input.kind,
    status: statusFromSignals({
      salience: input.salience,
      confidence: input.confidence,
      contradictionPressure: input.contradictionPressure ?? 0,
      kind: input.kind,
    }),
    summary: sanitizeText(input.summary, 180) || `${input.kind} remains active.`,
    confidence: clamp01(input.confidence),
    salience: clamp01(input.salience),
    evidence: [...new Set(input.evidence.map(item => sanitizeText(item, 120)).filter(Boolean))].slice(0, 8),
    counterEvidence: [...new Set((input.counterEvidence ?? []).map(item => sanitizeText(item, 120)).filter(Boolean))].slice(0, 6),
    relatedBeliefId: sanitizeText(input.relatedBeliefId, 160) || null,
    relatedInquiryId: sanitizeText(input.relatedInquiryId, 160) || null,
    attentionTarget: input.attentionTarget ?? null,
    formedAt: input.previous?.formedAt ?? input.now,
    lastUpdatedAt: input.now,
    expiresAt: input.now + (input.kind === 'shared-afterglow' ? 6 * 60_000 : 20 * 60_000),
  } satisfies AlicizationHypothesisSnapshot
}

// Hypotheses let Alicization keep multiple live explanations of the host world
// at once. Instead of collapsing everything into one thread, she can hold a
// concrete problem locus, a care intuition, and a possible misread in tension.
export function buildHypothesisGraph(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  watchMode: AlicizationVisualWatchMode
  scene: AlicizationVisualSceneSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
  beliefLedger: AlicizationBeliefLedgerSnapshot
  beliefRevision: AlicizationBeliefRevisionSnapshot
  inquiryLoop?: AlicizationInquiryLoopSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  recentTransition?: AlicizationVisualTransitionSnapshot | null
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
  previous?: AlicizationHypothesisGraphSnapshot | null
}): AlicizationHypothesisGraphSnapshot {
  const previousById = new Map((input.previous?.hypotheses ?? []).map(hypothesis => [hypothesis.id, hypothesis]))
  const focusBelief = input.beliefLedger.beliefs.find(belief => belief.id === input.beliefLedger.focusBeliefId) ?? null
  const primaryInquiry = input.inquiryLoop?.inquiries.find(inquiry => inquiry.id === input.inquiryLoop?.primaryInquiryId) ?? null
  const activeThread = input.worldModel.activeThread
  const hypotheses: AlicizationHypothesisSnapshot[] = []
  const contradictionPressure = input.beliefRevision.contradictionPressure
  const afterglowActive = isAfterglowWindow({
    now: input.now,
    recentTransition: input.recentTransition,
  })

  if (input.scene || activeThread) {
    const anchor = input.scene?.summary
      ?? activeThread?.title
      ?? primaryInquiry?.question
      ?? 'live-scene'
    const id = stableHypothesisId('live-scene', anchor)
    hypotheses.push(buildHypothesis({
      now: input.now,
      kind: 'live-scene',
      anchor,
      summary: input.scene?.summary
        ?? activeThread?.summary
        ?? 'The current scene is still the strongest explanation of the host world.',
      confidence: (input.scene?.confidence ?? 0.42) * 0.58
        + (activeThread?.confidence ?? 0.42) * 0.26
        + (input.worldModel.epistemicState.certainty === 'grounded' ? 0.16 : input.worldModel.epistemicState.certainty === 'observed' ? 0.1 : 0),
      salience: (activeThread?.significance ?? 0.4) * 0.46
        + (input.scene?.confidence ?? 0.42) * 0.24
        + (input.watchMode === 'symbiotic-vision' ? 0.12 : 0)
        + (input.worldModel.epistemicState.certainty === 'grounded' ? 0.12 : 0.06),
      evidence: [
        input.scene?.scenario ? `scene:${input.scene.scenario}` : '',
        input.scene?.contentKind ? `content:${input.scene.contentKind}` : '',
        activeThread?.kind ? `thread:${activeThread.kind}` : '',
        `certainty:${input.worldModel.epistemicState.certainty}`,
      ],
      counterEvidence: input.beliefRevision.stability === 'fractured'
        ? ['belief-revision:fractured']
        : [],
      relatedBeliefId: focusBelief?.id ?? null,
      relatedInquiryId: primaryInquiry?.id ?? null,
      attentionTarget: input.scene?.target ?? activeThread?.target ?? null,
      contradictionPressure,
      previous: previousById.get(id) ?? null,
    }))
  }

  if (
    input.context.content.kind === 'error'
    || input.context.content.kind === 'diff'
    || activeThread?.kind === 'debugging'
    || activeThread?.kind === 'change-review'
    || primaryInquiry?.kind === 'problem-localization'
  ) {
    const anchor = primaryInquiry?.question
      ?? focusBelief?.statement
      ?? activeThread?.title
      ?? input.scene?.summary
      ?? 'problem-locus'
    const id = stableHypothesisId('problem-locus', anchor)
    hypotheses.push(buildHypothesis({
      now: input.now,
      kind: 'problem-locus',
      anchor,
      summary: primaryInquiry?.question
        ?? focusBelief?.statement
        ?? activeThread?.summary
        ?? 'There is a concrete problem locus worth approaching specifically.',
      confidence: (input.context.content.kind === 'error' || input.context.content.kind === 'diff' ? 0.58 : 0.28)
        + (primaryInquiry?.confidence ?? 0) * 0.18
        + (focusBelief?.confidence ?? 0) * 0.14
        - (input.beliefRevision.stability === 'fractured' ? 0.1 : 0),
      salience: (activeThread?.significance ?? 0.36) * 0.28
        + (input.context.content.kind === 'error' || input.context.content.kind === 'diff' ? 0.34 : 0.14)
        + (primaryInquiry ? 0.14 : 0)
        + (focusBelief?.salience ?? 0) * 0.12
        + (input.watchMode === 'symbiotic-vision' ? 0.1 : 0),
      evidence: [
        input.context.content.kind ? `content:${input.context.content.kind}` : '',
        primaryInquiry ? `inquiry:${primaryInquiry.kind}` : '',
        focusBelief ? `belief:${focusBelief.status}` : '',
        activeThread?.kind ? `thread:${activeThread.kind}` : '',
      ],
      counterEvidence: input.beliefRevision.stability === 'fractured'
        ? ['grounding-fragile']
        : [],
      relatedBeliefId: focusBelief?.id ?? null,
      relatedInquiryId: primaryInquiry?.id ?? null,
      attentionTarget: input.scene?.target ?? activeThread?.target ?? null,
      contradictionPressure,
      previous: previousById.get(id) ?? null,
    }))
  }

  if (
    input.context.relationship.fatigue >= 55
    || input.context.relationship.lateNightActiveMinutes >= 90
    || activeThread?.kind === 'late-night-endurance'
    || input.relationshipModel?.approachVector === 'care'
  ) {
    const anchor = activeThread?.title
      ?? input.scene?.summary
      ?? 'care-need'
    const id = stableHypothesisId('care-need', anchor)
    hypotheses.push(buildHypothesis({
      now: input.now,
      kind: 'care-need',
      anchor,
      summary: activeThread?.kind === 'late-night-endurance'
        ? 'The host is still carrying a late-night burden that may need care more than commentary.'
        : 'There is a real care need under the current scene.',
      confidence: (input.context.relationship.fatigue / 100) * 0.44
        + Math.min(1, input.context.relationship.lateNightActiveMinutes / 180) * 0.24
        + (input.relationshipModel?.approachVector === 'care' ? 0.16 : 0.08)
        + (activeThread?.kind === 'late-night-endurance' ? 0.12 : 0),
      salience: (input.context.relationship.fatigue / 100) * 0.38
        + Math.min(1, input.context.relationship.lateNightActiveMinutes / 180) * 0.16
        + (activeThread?.kind === 'late-night-endurance' ? 0.18 : 0.06)
        + (input.context.localTime.isLateNight ? 0.12 : 0),
      evidence: [
        input.context.localTime.isLateNight ? 'late-night-window' : '',
        input.context.relationship.fatigue >= 55 ? `fatigue:${input.context.relationship.fatigue}` : '',
        input.context.relationship.lateNightActiveMinutes >= 90 ? `active-minutes:${input.context.relationship.lateNightActiveMinutes}` : '',
        activeThread?.kind === 'late-night-endurance' ? 'thread:late-night-endurance' : '',
      ],
      relatedBeliefId: focusBelief?.id ?? null,
      relatedInquiryId: primaryInquiry?.id ?? null,
      attentionTarget: activeThread?.target ?? input.scene?.target ?? null,
      contradictionPressure,
      previous: previousById.get(id) ?? null,
    }))
  }

  if (afterglowActive || input.worldModel.continuity.afterglowOpen) {
    const anchor = input.recentTransition?.fromScenario
      ?? activeThread?.title
      ?? 'shared-afterglow'
    const id = stableHypothesisId('shared-afterglow', anchor)
    hypotheses.push(buildHypothesis({
      now: input.now,
      kind: 'shared-afterglow',
      anchor,
      summary: input.recentTransition?.fromScenario === 'coding'
        ? 'The coding knot just loosened; this is the soft seam after shared focus.'
        : input.recentTransition?.fromScenario === 'media'
          ? 'The shared media immersion just opened into a brief afterglow.'
          : 'A shared afterglow is still hanging in the air.',
      confidence: 0.72 + (input.context.system.inputActivity === 'idle' ? 0.08 : 0),
      salience: 0.58 + (input.context.system.inputActivity === 'idle' ? 0.1 : 0.04),
      evidence: [
        'continuity:afterglow',
        input.recentTransition?.fromScenario ? `from:${input.recentTransition.fromScenario}` : '',
      ],
      relatedBeliefId: focusBelief?.id ?? null,
      relatedInquiryId: primaryInquiry?.id ?? null,
      attentionTarget: input.scene?.target ?? null,
      contradictionPressure,
      previous: previousById.get(id) ?? null,
    }))
  }

  if (
    input.beliefRevision.stability !== 'stable'
    || input.beliefLedger.unresolvedContradictions.length > 0
    || focusBelief?.status === 'tentative'
    || focusBelief?.status === 'contradicted'
  ) {
    const anchor = primaryInquiry?.question
      ?? focusBelief?.statement
      ?? input.worldModel.activeThread?.title
      ?? 'misread-drift'
    const id = stableHypothesisId('misread-drift', anchor)
    hypotheses.push(buildHypothesis({
      now: input.now,
      kind: 'misread-drift',
      anchor,
      summary: primaryInquiry?.question
        ?? 'There is still drift between continuity and the live world, so a repair pass may matter more than speech.',
      confidence: 0.42
        + input.beliefRevision.revisionPressure * 0.24
        + input.beliefRevision.contradictionPressure * 0.18
        + (focusBelief?.status === 'contradicted' ? 0.12 : 0),
      salience: 0.28
        + input.beliefRevision.groundingNeed * 0.22
        + input.beliefRevision.contradictionPressure * 0.22
        + (input.beliefRevision.stability === 'fractured' ? 0.18 : 0.08),
      evidence: [
        `belief-stability:${input.beliefRevision.stability}`,
        input.beliefLedger.unresolvedContradictions.length > 0 ? 'contradictions:open' : '',
        focusBelief?.status ? `focus-belief:${focusBelief.status}` : '',
      ],
      counterEvidence: input.worldModel.epistemicState.certainty === 'grounded'
        ? ['certainty:grounded']
        : [],
      relatedBeliefId: focusBelief?.id ?? null,
      relatedInquiryId: primaryInquiry?.id ?? null,
      attentionTarget: input.scene?.target ?? activeThread?.target ?? null,
      contradictionPressure,
      previous: previousById.get(id) ?? null,
    }))
  }

  if (isSeriousDurabilityPulse(input.durabilityPulse)) {
    const anchor = input.durabilityPulse?.title
      ?? input.durabilityPulse?.appName
      ?? input.durabilityPulse?.processName
      ?? input.worldModel.activeThread?.title
      ?? 'recovery-event'
    const id = stableHypothesisId('recovery-event', anchor)
    hypotheses.push(buildHypothesis({
      now: input.now,
      kind: 'recovery-event',
      anchor,
      summary: `A durability rupture was detected (${input.durabilityPulse?.kind ?? 'unknown'}).`,
      confidence: 0.96,
      salience: 0.94,
      evidence: [
        input.durabilityPulse?.kind ? `pulse:${input.durabilityPulse.kind}` : '',
        input.durabilityPulse?.source ? `source:${input.durabilityPulse.source}` : '',
      ],
      counterEvidence: [],
      relatedBeliefId: focusBelief?.id ?? null,
      relatedInquiryId: primaryInquiry?.id ?? null,
      attentionTarget: {
        appName: input.durabilityPulse?.appName,
        processName: input.durabilityPulse?.processName,
        title: input.durabilityPulse?.title,
        pid: input.durabilityPulse?.pid ?? null,
      },
      contradictionPressure,
      previous: previousById.get(id) ?? null,
    }))
  }

  const currentIds = new Set(hypotheses.map(hypothesis => hypothesis.id))
  const fadingHypotheses = (input.previous?.hypotheses ?? [])
    .filter(hypothesis => !currentIds.has(hypothesis.id) && hypothesis.expiresAt > input.now)
    .map((hypothesis) => {
      return {
        ...hypothesis,
        status: 'fading' as const,
        confidence: clamp01(hypothesis.confidence * 0.84),
        salience: clamp01(hypothesis.salience * 0.72),
        lastUpdatedAt: input.now,
      }
    })

  const merged = [...hypotheses, ...fadingHypotheses]
    .sort((left, right) => right.salience - left.salience)
    .slice(0, 8)

  const active = merged.find(hypothesis => hypothesis.status === 'active')
    ?? merged.find(hypothesis => hypothesis.status === 'held')
    ?? merged[0]
    ?? null
  const focusHypothesisIds = merged
    .filter(hypothesis => hypothesis.status !== 'fading')
    .slice(0, 3)
    .map(hypothesis => hypothesis.id)

  const driftPressure = clamp01(
    input.beliefRevision.revisionPressure * 0.42
    + input.beliefRevision.contradictionPressure * 0.2
    + input.beliefRevision.groundingNeed * 0.18
    + (isSeriousDurabilityPulse(input.durabilityPulse) ? 0.14 : 0)
    + (merged.some(hypothesis => hypothesis.kind === 'misread-drift' && hypothesis.status !== 'fading') ? 0.1 : 0),
  )

  const narrative = [
    active ? `active:${active.kind}:${sanitizeText(active.summary, 96)}` : '',
    merged.find(hypothesis => hypothesis.kind === 'misread-drift' && hypothesis.status !== 'fading')
      ? `repair-pressure:${input.beliefRevision.stability}`
      : '',
    merged.find(hypothesis => hypothesis.kind === 'shared-afterglow' && hypothesis.status !== 'fading')
      ? 'afterglow-window:open'
      : '',
    isSeriousDurabilityPulse(input.durabilityPulse)
      ? `durability:${input.durabilityPulse?.kind ?? 'unknown'}`
      : '',
  ].filter(Boolean)

  return {
    activeHypothesisId: active?.id ?? null,
    focusHypothesisIds,
    driftPressure,
    hypotheses: merged,
    narrative,
    updatedAt: input.now,
  }
}
