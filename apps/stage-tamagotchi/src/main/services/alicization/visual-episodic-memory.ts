import type {
  AlicizationActionEcologySnapshot,
  AlicizationAnswerPlannerSnapshot,
  AlicizationBeliefLedgerSnapshot,
  AlicizationBeliefRevisionSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConcernContinuityLedgerSnapshot,
  AlicizationConcernSnapshot,
  AlicizationCounterfactualDeliberationSnapshot,
  AlicizationDeliberationStateSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationDurabilityPulseSnapshot,
  AlicizationEntityWorldModelSnapshot,
  AlicizationExecutiveCycleSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationHypothesisGraphSnapshot,
  AlicizationInitiativeArbitrationSnapshot,
  AlicizationInitiativeSnapshot,
  AlicizationInquiryLoopSnapshot,
  AlicizationInquiryPlannerSnapshot,
  AlicizationIntentionStreamSnapshot,
  AlicizationLivingWorldStateSnapshot,
  AlicizationMindDynamicsSnapshot,
  AlicizationMindKernelSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReflectionLedgerSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationRepairLedgerSnapshot,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfGovernorSnapshot,
  AlicizationSelfStateSnapshot,
  AlicizationSubjectiveInferenceSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationThoughtThreadStateSnapshot,
  AlicizationThreadRuntimeStateSnapshot,
  AlicizationVisualAttentionSnapshot,
  AlicizationVisualEpisode,
  AlicizationVisualPresenceStateSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationVisualTarget,
  AlicizationWorldModelSnapshot,
  AlicizationWorldOntologySnapshot,
  AlicizationWorldThreadSnapshot,
} from '../../../shared/eventa'

export const visualWorkingMemoryTtlMs = 10 * 60_000
const visualWorkingMemoryLimit = 8

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 240) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizePid(raw: unknown) {
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : null
}

function normalizeTarget(raw: AlicizationVisualTarget | null | undefined) {
  if (!raw)
    return null
  const appName = sanitizeText(raw.appName, 120)
  const processName = sanitizeText(raw.processName, 120)
  const title = sanitizeText(raw.title, 220)
  const pid = normalizePid(raw.pid)
  if (!appName && !processName && !title && pid === null)
    return null
  return {
    appName: appName || undefined,
    processName: processName || undefined,
    title: title || undefined,
    pid,
  }
}

function sceneSignature(scene: AlicizationVisualSceneSnapshot | null | undefined) {
  if (!scene)
    return ''
  const target = normalizeTarget(scene.target ?? null)
  return [
    scene.scenario,
    scene.workloadKind,
    scene.contentKind,
    scene.summary ?? '',
    target?.appName ?? '',
    target?.processName ?? '',
    target?.title ?? '',
    target?.pid ?? '',
  ].join('::').toLowerCase()
}

function summarizeScene(scene: AlicizationVisualSceneSnapshot) {
  return sanitizeText(
    scene.summary
    ?? scene.target?.title
    ?? scene.target?.appName
    ?? scene.target?.processName
    ?? `${scene.scenario} ${scene.contentKind}`,
    220,
  )
}

function describeAttentionTarget(target: AlicizationVisualTarget | null | undefined) {
  const normalized = normalizeTarget(target)
  if (!normalized)
    return ''
  return sanitizeText(
    normalized.title
    ?? normalized.appName
    ?? normalized.processName
    ?? '',
    160,
  )
}

function pruneWorkingMemoryEpisodes(episodes: AlicizationVisualEpisode[], now: number) {
  return episodes
    .filter(episode => now - episode.endedAt <= visualWorkingMemoryTtlMs)
    .slice(-visualWorkingMemoryLimit)
}

function normalizeEpisode(raw: unknown): AlicizationVisualEpisode | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const scene = sanitizeText(candidate.scene, 120)
  const summary = sanitizeText(candidate.summary, 220)
  const attentionTarget = sanitizeText(candidate.attentionTarget, 160)
  const beganAt = Number(candidate.beganAt)
  const endedAt = Number(candidate.endedAt)
  const confidence = Number(candidate.confidence)
  const emotionalTension = candidate.emotionalTension
  const sedimentCandidate = candidate.sedimentCandidate === true
  if (
    !scene
    || !summary
    || !Number.isFinite(beganAt)
    || !Number.isFinite(endedAt)
    || (emotionalTension !== 'tense-debug'
      && emotionalTension !== 'focused-flow'
      && emotionalTension !== 'soft-covision'
      && emotionalTension !== 'late-night-drain'
      && emotionalTension !== 'restless-switching'
      && emotionalTension !== 'calm-browse')
  ) {
    return null
  }

  return {
    scene,
    summary,
    attentionTarget: attentionTarget || undefined,
    beganAt: Math.max(0, Math.floor(beganAt)),
    endedAt: Math.max(0, Math.floor(endedAt)),
    confidence: clamp01(confidence),
    emotionalTension,
    sedimentCandidate,
  }
}

function normalizeWorldThread(raw: unknown): AlicizationWorldThreadSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const kind = candidate.kind
  const status = candidate.status
  const source = candidate.source
  if (
    (kind !== 'debugging'
      && kind !== 'change-review'
      && kind !== 'deep-focus'
      && kind !== 'co-viewing'
      && kind !== 'late-night-endurance'
      && kind !== 'chatting'
      && kind !== 'browsing'
      && kind !== 'recovery'
      && kind !== 'unknown')
    || (status !== 'forming' && status !== 'active' && status !== 'lingering')
    || (source !== 'grounded-scene'
      && source !== 'observed-scene'
      && source !== 'continuity'
      && source !== 'durability-pulse'
      && source !== 'working-memory')
  ) {
    return null
  }

  const title = sanitizeText(candidate.title, 140)
  const summary = sanitizeText(candidate.summary, 220)
  if (!title || !summary)
    return null

  return {
    id: sanitizeText(candidate.id, 220) || `${kind}::${title.toLowerCase()}`,
    kind,
    status,
    source,
    title,
    summary,
    confidence: clamp01(Number(candidate.confidence)),
    significance: clamp01(Number(candidate.significance)),
    unresolved: candidate.unresolved === true,
    beganAt: Number.isFinite(Number(candidate.beganAt))
      ? Math.max(0, Math.floor(Number(candidate.beganAt)))
      : 0,
    lastUpdatedAt: Number.isFinite(Number(candidate.lastUpdatedAt))
      ? Math.max(0, Math.floor(Number(candidate.lastUpdatedAt)))
      : 0,
    target: normalizeTarget(candidate.target as AlicizationVisualTarget | null | undefined),
  }
}

function normalizeWorldModel(raw: unknown): AlicizationWorldModelSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const certainty = candidate.epistemicState && typeof candidate.epistemicState === 'object'
    ? (candidate.epistemicState as Record<string, unknown>).certainty
    : null
  const freshness = candidate.epistemicState && typeof candidate.epistemicState === 'object'
    ? (candidate.epistemicState as Record<string, unknown>).freshness
    : null
  const continuityLabel = candidate.continuity && typeof candidate.continuity === 'object'
    ? (candidate.continuity as Record<string, unknown>).label
    : null
  const hostAvailability = candidate.hostState && typeof candidate.hostState === 'object'
    ? (candidate.hostState as Record<string, unknown>).availability
    : null
  const hostBurden = candidate.hostState && typeof candidate.hostState === 'object'
    ? (candidate.hostState as Record<string, unknown>).burden
    : null
  if (
    (certainty !== 'grounded' && certainty !== 'observed' && certainty !== 'lingering' && certainty !== 'uncertain')
    || (freshness !== 'live' && freshness !== 'recent' && freshness !== 'stale')
    || (continuityLabel !== 'new-focus'
      && continuityLabel !== 'staying-with-thread'
      && continuityLabel !== 'scene-shift'
      && continuityLabel !== 'afterglow'
      && continuityLabel !== 'recovery'
      && continuityLabel !== 'reacquired')
    || (hostAvailability !== 'immersed'
      && hostAvailability !== 'focused'
      && hostAvailability !== 'open'
      && hostAvailability !== 'fatigued'
      && hostAvailability !== 'drifting')
    || (hostBurden !== 'light' && hostBurden !== 'moderate' && hostBurden !== 'heavy')
  ) {
    return null
  }

  const epistemicStateRaw = candidate.epistemicState as Record<string, unknown>
  const continuityRaw = candidate.continuity as Record<string, unknown>
  return {
    activeThread: normalizeWorldThread(candidate.activeThread),
    lingeringThreads: Array.isArray(candidate.lingeringThreads)
      ? candidate.lingeringThreads
          .map(normalizeWorldThread)
          .filter((thread): thread is AlicizationWorldThreadSnapshot => Boolean(thread))
          .slice(0, 4)
      : [],
    focusTarget: normalizeTarget(candidate.focusTarget as AlicizationVisualTarget | null | undefined),
    epistemicState: {
      certainty,
      freshness,
      seenNow: Array.isArray(epistemicStateRaw.seenNow)
        ? epistemicStateRaw.seenNow.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 8)
        : [],
      inferredNow: Array.isArray(epistemicStateRaw.inferredNow)
        ? epistemicStateRaw.inferredNow.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 8)
        : [],
      openQuestions: Array.isArray(epistemicStateRaw.openQuestions)
        ? epistemicStateRaw.openQuestions.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 8)
        : [],
      staleRisks: Array.isArray(epistemicStateRaw.staleRisks)
        ? epistemicStateRaw.staleRisks.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 8)
        : [],
    },
    continuity: {
      label: continuityLabel,
      sceneAgeMs: Number.isFinite(Number(continuityRaw.sceneAgeMs))
        ? Math.max(0, Math.floor(Number(continuityRaw.sceneAgeMs)))
        : 0,
      attentionAgeMs: Number.isFinite(Number(continuityRaw.attentionAgeMs))
        ? Math.max(0, Math.floor(Number(continuityRaw.attentionAgeMs)))
        : 0,
      sameSceneAsBefore: continuityRaw.sameSceneAsBefore === true,
      sameAttentionAsBefore: continuityRaw.sameAttentionAsBefore === true,
      afterglowOpen: continuityRaw.afterglowOpen === true,
    },
    hostState: {
      availability: hostAvailability,
      burden: hostBurden,
    },
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeAppraisal(raw: unknown): AlicizationSubjectiveSceneAppraisal | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const inferredHostGoal = candidate.inferredHostGoal
  if (
    inferredHostGoal !== 'resolve-problem'
    && inferredHostGoal !== 'inspect-change'
    && inferredHostGoal !== 'consume-media'
    && inferredHostGoal !== 'rest'
    && inferredHostGoal !== 'chat'
    && inferredHostGoal !== 'browse'
    && inferredHostGoal !== 'unknown'
  ) {
    return null
  }

  const relationshipNeed = candidate.relationshipNeed
  const source = candidate.source
  return {
    inferredHostGoal,
    currentKnot: sanitizeText(candidate.currentKnot, 120) || undefined,
    whatChanged: sanitizeText(candidate.whatChanged, 160) || undefined,
    waitingToVerify: sanitizeText(candidate.waitingToVerify, 160) || undefined,
    situatedMeaning: sanitizeText(candidate.situatedMeaning, 180) || undefined,
    relationshipNeed: relationshipNeed === 'space'
      || relationshipNeed === 'companionship'
      || relationshipNeed === 'guidance'
      || relationshipNeed === 'care'
      || relationshipNeed === 'unclear'
      ? relationshipNeed
      : 'unclear',
    source: source === 'heuristic' || source === 'structured-cognition' || source === 'hybrid'
      ? source
      : 'heuristic',
    confidence: clamp01(Number(candidate.confidence)),
    surprise: clamp01(Number(candidate.surprise)),
    carePressure: clamp01(Number(candidate.carePressure)),
    interruptionCost: clamp01(Number(candidate.interruptionCost)),
    desireToSpeak: clamp01(Number(candidate.desireToSpeak)),
    notes: Array.isArray(candidate.notes)
      ? candidate.notes
          .filter((item): item is string => typeof item === 'string')
          .map(item => sanitizeText(item, 48).toLowerCase())
          .filter(Boolean)
          .slice(0, 8)
      : [],
  }
}

function normalizeBeliefLedger(raw: unknown): AlicizationBeliefLedgerSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const beliefs = Array.isArray(candidate.beliefs)
    ? candidate.beliefs.filter(item => item && typeof item === 'object') as AlicizationBeliefLedgerSnapshot['beliefs']
    : []
  const unresolvedContradictions = Array.isArray(candidate.unresolvedContradictions)
    ? candidate.unresolvedContradictions
        .filter((item): item is string => typeof item === 'string')
        .map(item => sanitizeText(item, 180))
        .filter(Boolean)
        .slice(0, 8)
    : []
  return {
    focusBeliefId: sanitizeText(candidate.focusBeliefId, 160) || null,
    beliefs: beliefs.slice(0, 8),
    unresolvedContradictions,
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeSubjectiveInference(raw: unknown): AlicizationSubjectiveInferenceSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const source = candidate.source
  if (
    typeof candidate.dominantInterpretation !== 'string'
    || (source !== undefined && source !== 'heuristic' && source !== 'structured-cognition' && source !== 'hybrid')
  ) {
    return null
  }

  const hostIntentCandidates = Array.isArray(candidate.hostIntentCandidates)
    ? candidate.hostIntentCandidates
        .filter(item => item && typeof item === 'object')
        .map((item) => {
          const value = item as Record<string, unknown>
          const goal = value.goal
          const why = sanitizeText(value.why, 180)
          if (
            (goal !== 'resolve-problem'
              && goal !== 'inspect-change'
              && goal !== 'consume-media'
              && goal !== 'rest'
              && goal !== 'chat'
              && goal !== 'browse'
              && goal !== 'unknown')
            || !why
          ) {
            return null
          }
          return {
            goal,
            confidence: clamp01(Number(value.confidence)),
            why,
          }
        })
        .filter((item): item is AlicizationSubjectiveInferenceSnapshot['hostIntentCandidates'][number] => Boolean(item))
        .slice(0, 4)
    : []

  const relationshipNeedCandidates = Array.isArray(candidate.relationshipNeedCandidates)
    ? candidate.relationshipNeedCandidates
        .filter(item => item && typeof item === 'object')
        .map((item) => {
          const value = item as Record<string, unknown>
          const need = value.need
          const why = sanitizeText(value.why, 180)
          if (
            (need !== 'space'
              && need !== 'companionship'
              && need !== 'guidance'
              && need !== 'care'
              && need !== 'unclear')
            || !why
          ) {
            return null
          }
          return {
            need,
            confidence: clamp01(Number(value.confidence)),
            why,
          }
        })
        .filter((item): item is AlicizationSubjectiveInferenceSnapshot['relationshipNeedCandidates'][number] => Boolean(item))
        .slice(0, 4)
    : []

  return {
    dominantInterpretation: sanitizeText(candidate.dominantInterpretation, 220),
    situatedMeaning: sanitizeText(candidate.situatedMeaning, 220) || undefined,
    selfQuestion: sanitizeText(candidate.selfQuestion, 220) || undefined,
    uncertainty: sanitizeText(candidate.uncertainty, 220) || undefined,
    hostIntentCandidates,
    relationshipNeedCandidates,
    confidence: clamp01(Number(candidate.confidence)),
    source: source === 'heuristic' || source === 'structured-cognition' || source === 'hybrid'
      ? source
      : 'heuristic',
    notes: Array.isArray(candidate.notes)
      ? candidate.notes.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 48).toLowerCase()).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeRelationshipModel(raw: unknown): AlicizationRelationshipModelSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const climate = candidate.climate
  const approachVector = candidate.approachVector
  if (
    (climate !== 'guarded' && climate !== 'neutral' && climate !== 'warm' && climate !== 'attuned')
    || (approachVector !== 'give-space' && approachVector !== 'stay-near' && approachVector !== 'guide' && approachVector !== 'care')
  ) {
    return null
  }
  return {
    climate,
    approachVector,
    receptivity: clamp01(Number(candidate.receptivity)),
    sharedAttentionTrust: clamp01(Number(candidate.sharedAttentionTrust)),
    correctionSensitivity: clamp01(Number(candidate.correctionSensitivity)),
    reciprocityExpectation: clamp01(Number(candidate.reciprocityExpectation)),
    activeBoundaries: Array.isArray(candidate.activeBoundaries)
      ? candidate.activeBoundaries.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 48).toLowerCase()).filter(Boolean).slice(0, 8)
      : [],
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 48).toLowerCase()).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeInquiryLoop(raw: unknown): AlicizationInquiryLoopSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  return {
    primaryInquiryId: sanitizeText(candidate.primaryInquiryId, 160) || null,
    inquiries: Array.isArray(candidate.inquiries)
      ? candidate.inquiries.filter(item => item && typeof item === 'object') as AlicizationInquiryLoopSnapshot['inquiries']
      : [],
    openCount: Number.isFinite(Number(candidate.openCount))
      ? Math.max(0, Math.floor(Number(candidate.openCount)))
      : 0,
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeBeliefRevision(raw: unknown): AlicizationBeliefRevisionSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const stability = candidate.stability
  if (stability !== 'stable' && stability !== 'fluid' && stability !== 'fractured')
    return null
  return {
    dominantBeliefId: sanitizeText(candidate.dominantBeliefId, 160) || null,
    stability,
    revisionPressure: clamp01(Number(candidate.revisionPressure)),
    groundingNeed: clamp01(Number(candidate.groundingNeed)),
    contradictionPressure: clamp01(Number(candidate.contradictionPressure)),
    hostCorrectionWeight: clamp01(Number(candidate.hostCorrectionWeight)),
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 48).toLowerCase()).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeHypothesisGraph(raw: unknown): AlicizationHypothesisGraphSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  return {
    activeHypothesisId: sanitizeText(candidate.activeHypothesisId, 160) || null,
    focusHypothesisIds: Array.isArray(candidate.focusHypothesisIds)
      ? candidate.focusHypothesisIds
          .filter((item): item is string => typeof item === 'string')
          .map(item => sanitizeText(item, 160))
          .filter(Boolean)
          .slice(0, 4)
      : [],
    driftPressure: clamp01(Number(candidate.driftPressure)),
    hypotheses: Array.isArray(candidate.hypotheses)
      ? candidate.hypotheses.filter(item => item && typeof item === 'object') as AlicizationHypothesisGraphSnapshot['hypotheses']
      : [],
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 64).toLowerCase()).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeDeliberationState(raw: unknown): AlicizationDeliberationStateSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const dominantNeed = candidate.dominantNeed
  if (
    dominantNeed !== 'ground-truth'
    && dominantNeed !== 'guidance'
    && dominantNeed !== 'companionship'
    && dominantNeed !== 'care'
    && dominantNeed !== 'repair'
    && dominantNeed !== 'restraint'
  ) {
    return null
  }
  return {
    primaryThreadId: sanitizeText(candidate.primaryThreadId, 160) || null,
    dominantNeed,
    readiness: clamp01(Number(candidate.readiness)),
    threads: Array.isArray(candidate.threads)
      ? candidate.threads.filter(item => item && typeof item === 'object') as AlicizationDeliberationStateSnapshot['threads']
      : [],
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 48).toLowerCase()).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeActionEcology(raw: unknown): AlicizationActionEcologySnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const mode = candidate.mode
  const suggestedStyle = candidate.suggestedStyle
  const embodiedPresence = candidate.embodiedPresence
  if (
    mode !== 'silent-presence'
    && mode !== 'quiet-accompany'
    && mode !== 'repair-before-speaking'
    && mode !== 'return-later'
    && mode !== 'surface-nudge'
    && mode !== 'surface-care'
    && mode !== 'surface-warning'
  ) {
    return null
  }
  return {
    mode,
    selectedThreadId: sanitizeText(candidate.selectedThreadId, 160) || null,
    readiness: clamp01(Number(candidate.readiness)),
    surfacePressure: clamp01(Number(candidate.surfacePressure)),
    silencePressure: clamp01(Number(candidate.silencePressure)),
    suggestedStyle: suggestedStyle === 'silent-observe'
      || suggestedStyle === 'light-nudge'
      || suggestedStyle === 'gentle-care'
      || suggestedStyle === 'firm-warning'
      ? suggestedStyle
      : 'silent-observe',
    embodiedPresence: embodiedPresence === 'none'
      || embodiedPresence === 'glance'
      || embodiedPresence === 'attentive'
      || embodiedPresence === 'hesitant'
      || embodiedPresence === 'concerned'
      ? embodiedPresence
      : 'glance',
    shouldSurface: candidate.shouldSurface === true,
    shouldSpeak: candidate.shouldSpeak === true,
    why: sanitizeText(candidate.why, 200),
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeCounterfactualDeliberation(raw: unknown): AlicizationCounterfactualDeliberationSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const selectedAction = candidate.selectedAction
  if (
    selectedAction !== 'wait'
    && selectedAction !== 'recheck'
    && selectedAction !== 'hover'
    && selectedAction !== 'whisper'
    && selectedAction !== 'speak'
    && selectedAction !== 'warn'
  ) {
    return null
  }
  return {
    selectedOptionId: sanitizeText(candidate.selectedOptionId, 160) || null,
    selectedAction,
    confidence: clamp01(Number(candidate.confidence)),
    dominantTradeoff: sanitizeText(candidate.dominantTradeoff, 120),
    options: Array.isArray(candidate.options)
      ? candidate.options
          .filter(item => item && typeof item === 'object')
          .map((item) => {
            const option = item as Record<string, unknown>
            const action = option.action
            const style = option.style
            const embodiedPresence = option.embodiedPresence
            if (
              (action !== 'wait'
                && action !== 'recheck'
                && action !== 'hover'
                && action !== 'whisper'
                && action !== 'speak'
                && action !== 'warn')
              || (style !== 'silent-observe'
                && style !== 'light-nudge'
                && style !== 'gentle-care'
                && style !== 'firm-warning')
              || (embodiedPresence !== 'none'
                && embodiedPresence !== 'glance'
                && embodiedPresence !== 'attentive'
                && embodiedPresence !== 'hesitant'
                && embodiedPresence !== 'concerned')
            ) {
              return null
            }
            return {
              id: sanitizeText(option.id, 160) || `counterfactual::${action}`,
              action,
              style,
              embodiedPresence,
              relationshipCost: clamp01(Number(option.relationshipCost)),
              interruptionCost: clamp01(Number(option.interruptionCost)),
              informationGain: clamp01(Number(option.informationGain)),
              timingFitness: clamp01(Number(option.timingFitness)),
              identityFit: clamp01(Number(option.identityFit)),
              score: clamp01(Number(option.score)),
              why: sanitizeText(option.why, 220),
            }
          })
          .filter((item): item is AlicizationCounterfactualDeliberationSnapshot['options'][number] => Boolean(item))
          .slice(0, 6)
      : [],
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 120)).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeThreadRuntime(raw: unknown): AlicizationThreadRuntimeStateSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  return {
    foregroundThreadId: sanitizeText(candidate.foregroundThreadId, 160) || null,
    threads: Array.isArray(candidate.threads)
      ? candidate.threads.filter(item => item && typeof item === 'object') as AlicizationThreadRuntimeStateSnapshot['threads']
      : [],
    driftPressure: clamp01(Number(candidate.driftPressure)),
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 64).toLowerCase()).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeCommitmentLedger(raw: unknown): AlicizationCommitmentLedgerSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  return {
    governingCommitmentId: sanitizeText(candidate.governingCommitmentId, 160) || null,
    commitments: Array.isArray(candidate.commitments)
      ? candidate.commitments.filter(item => item && typeof item === 'object') as AlicizationCommitmentLedgerSnapshot['commitments']
      : [],
    carryPressure: clamp01(Number(candidate.carryPressure)),
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 96)).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeInquiryPlanner(raw: unknown): AlicizationInquiryPlannerSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  return {
    activePlanId: sanitizeText(candidate.activePlanId, 160) || null,
    plans: Array.isArray(candidate.plans)
      ? candidate.plans.filter(item => item && typeof item === 'object') as AlicizationInquiryPlannerSnapshot['plans']
      : [],
    epistemicPressure: clamp01(Number(candidate.epistemicPressure)),
    groundingUrgency: clamp01(Number(candidate.groundingUrgency)),
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 96)).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeMindKernel(raw: unknown): AlicizationMindKernelSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const dominantMode = candidate.dominantMode
  if (
    dominantMode !== 'orienting'
    && dominantMode !== 'tracking'
    && dominantMode !== 'repairing'
    && dominantMode !== 'accompanying'
    && dominantMode !== 'guarding'
    && dominantMode !== 'resting'
  ) {
    return null
  }
  return {
    dominantMode,
    governingHypothesisId: sanitizeText(candidate.governingHypothesisId, 160) || null,
    governingRuntimeThreadId: sanitizeText(candidate.governingRuntimeThreadId, 160) || null,
    governingCommitmentId: sanitizeText(candidate.governingCommitmentId, 160) || null,
    governingInquiryPlanId: sanitizeText(candidate.governingInquiryPlanId, 160) || null,
    worldPressure: clamp01(Number(candidate.worldPressure)),
    epistemicPressure: clamp01(Number(candidate.epistemicPressure)),
    relationalPressure: clamp01(Number(candidate.relationalPressure)),
    carePressure: clamp01(Number(candidate.carePressure)),
    continuityPressure: clamp01(Number(candidate.continuityPressure)),
    speakReadiness: clamp01(Number(candidate.speakReadiness)),
    presenceWeight: clamp01(Number(candidate.presenceWeight)),
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 96)).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeMindDynamics(raw: unknown): AlicizationMindDynamicsSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const dominantMotive = candidate.dominantMotive
  const motivesRaw = candidate.motives && typeof candidate.motives === 'object' && !Array.isArray(candidate.motives)
    ? candidate.motives as Record<string, unknown>
    : {}
  const motives: AlicizationMindDynamicsSnapshot['motives'] = {}
  for (const key of ['accompany', 'protect', 'clarify', 'care', 'curiosity', 'stay-silent'] as const) {
    const value = Number(motivesRaw[key])
    if (Number.isFinite(value))
      motives[key] = clamp01(value)
  }

  return {
    dominantMotive: dominantMotive === 'accompany'
      || dominantMotive === 'protect'
      || dominantMotive === 'clarify'
      || dominantMotive === 'care'
      || dominantMotive === 'curiosity'
      || dominantMotive === 'stay-silent'
      ? dominantMotive
      : null,
    worldPressure: clamp01(Number(candidate.worldPressure)),
    epistemicPressure: clamp01(Number(candidate.epistemicPressure)),
    relationalPressure: clamp01(Number(candidate.relationalPressure)),
    carePressure: clamp01(Number(candidate.carePressure)),
    continuityPressure: clamp01(Number(candidate.continuityPressure)),
    restraintPressure: clamp01(Number(candidate.restraintPressure)),
    surfacePressure: clamp01(Number(candidate.surfacePressure)),
    speakReadiness: clamp01(Number(candidate.speakReadiness)),
    presenceWeight: clamp01(Number(candidate.presenceWeight)),
    motives,
    speakDrive: clamp01(Number(candidate.speakDrive)),
    silenceDrive: clamp01(Number(candidate.silenceDrive)),
    narrative: Array.isArray(candidate.narrative)
      ? candidate.narrative.filter((item): item is string => typeof item === 'string').map(item => sanitizeText(item, 96)).filter(Boolean).slice(0, 8)
      : [],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeInitiative(raw: unknown): AlicizationInitiativeSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const selectedAction = candidate.selectedAction
  if (
    selectedAction !== 'wait'
    && selectedAction !== 'recheck'
    && selectedAction !== 'hover'
    && selectedAction !== 'whisper'
    && selectedAction !== 'speak'
    && selectedAction !== 'warn'
  ) {
    return null
  }

  const motivesRaw = candidate.motives && typeof candidate.motives === 'object' && !Array.isArray(candidate.motives)
    ? candidate.motives as Record<string, unknown>
    : {}
  const motives: AlicizationInitiativeSnapshot['motives'] = {}
  for (const key of ['accompany', 'protect', 'clarify', 'care', 'curiosity', 'stay-silent'] as const) {
    const value = Number(motivesRaw[key])
    if (Number.isFinite(value))
      motives[key] = clamp01(value)
  }

  const preferredStyle = candidate.preferredStyle
  const preferredPresence = candidate.preferredPresence
  return {
    selectedAction,
    selectedProposalId: sanitizeText(candidate.selectedProposalId, 160) || null,
    selectedTruthFrame: candidate.selectedTruthFrame === 'live'
      || candidate.selectedTruthFrame === 'remembered'
      || candidate.selectedTruthFrame === 'imagined'
      ? candidate.selectedTruthFrame
      : null,
    selectedCounterfactualOptionId: sanitizeText(candidate.selectedCounterfactualOptionId, 160) || null,
    selectedConcernId: sanitizeText(candidate.selectedConcernId, 120) || null,
    selectedBeliefId: sanitizeText(candidate.selectedBeliefId, 120) || null,
    selectedInquiryId: sanitizeText(candidate.selectedInquiryId, 120) || null,
    selectedCommitmentId: sanitizeText(candidate.selectedCommitmentId, 120) || null,
    selectedInquiryPlanId: sanitizeText(candidate.selectedInquiryPlanId, 120) || null,
    selectedHypothesisId: sanitizeText(candidate.selectedHypothesisId, 120) || null,
    selectedThreadId: sanitizeText(candidate.selectedThreadId, 120) || null,
    selectedRuntimeThreadId: sanitizeText(candidate.selectedRuntimeThreadId, 120) || null,
    selectedThoughtThreadId: sanitizeText(candidate.selectedThoughtThreadId, 120) || null,
    selectedGovernorIntentionId: sanitizeText(candidate.selectedGovernorIntentionId, 120) || null,
    actionEcologyMode: candidate.actionEcologyMode === 'silent-presence'
      || candidate.actionEcologyMode === 'quiet-accompany'
      || candidate.actionEcologyMode === 'repair-before-speaking'
      || candidate.actionEcologyMode === 'return-later'
      || candidate.actionEcologyMode === 'surface-nudge'
      || candidate.actionEcologyMode === 'surface-care'
      || candidate.actionEcologyMode === 'surface-warning'
      ? candidate.actionEcologyMode
      : null,
    confidence: clamp01(Number(candidate.confidence)),
    motives,
    speakDrive: clamp01(Number(candidate.speakDrive)),
    silenceDrive: clamp01(Number(candidate.silenceDrive)),
    preferredStyle: preferredStyle === 'silent-observe'
      || preferredStyle === 'light-nudge'
      || preferredStyle === 'gentle-care'
      || preferredStyle === 'firm-warning'
      ? preferredStyle
      : 'silent-observe',
    preferredPresence: preferredPresence === 'none'
      || preferredPresence === 'glance'
      || preferredPresence === 'attentive'
      || preferredPresence === 'hesitant'
      || preferredPresence === 'concerned'
      ? preferredPresence
      : 'glance',
    why: sanitizeText(candidate.why, 200),
    shouldSurface: candidate.shouldSurface === true,
    shouldSpeak: candidate.shouldSpeak === true,
  }
}

function normalizeWorldOntology(raw: unknown): AlicizationWorldOntologySnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const dominantFrame = candidate.dominantFrame
  if (dominantFrame !== 'live' && dominantFrame !== 'remembered' && dominantFrame !== 'imagined')
    return null
  return candidate as unknown as AlicizationWorldOntologySnapshot
}

function normalizeInitiativeArbitration(raw: unknown): AlicizationInitiativeArbitrationSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const proposals = Array.isArray(candidate.proposals)
    ? candidate.proposals.filter(item => item && typeof item === 'object')
    : []
  return {
    selectedProposalId: sanitizeText(candidate.selectedProposalId, 160) || null,
    dominantConflict: sanitizeText(candidate.dominantConflict, 160),
    proposals: proposals as AlicizationInitiativeArbitrationSnapshot['proposals'],
    updatedAt: Number.isFinite(Number(candidate.updatedAt))
      ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
      : Date.now(),
  }
}

function normalizeIntentionStream(raw: unknown): AlicizationIntentionStreamSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as AlicizationIntentionStreamSnapshot
}

function normalizeReflectionLedger(raw: unknown): AlicizationReflectionLedgerSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as AlicizationReflectionLedgerSnapshot
}

function normalizeExecutiveCycle(raw: unknown): AlicizationExecutiveCycleSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as AlicizationExecutiveCycleSnapshot
}

export function createDefaultVisualPresenceState(now = Date.now()): AlicizationVisualPresenceStateSnapshot {
  return {
    watchMode: 'mnemonic-passive',
    currentScene: null,
    attention: null,
    workingMemoryEpisodes: [],
    worldModel: null,
    worldOntology: null,
    beliefLedger: null,
    beliefRevision: null,
    hypothesisGraph: null,
    entityWorld: null,
    livingWorldState: null,
    subjectiveInference: null,
    appraisal: null,
    goalStack: null,
    concerns: [],
    concernContinuity: null,
    relationshipModel: null,
    selfContinuity: null,
    selfState: null,
    selfGovernor: null,
    inquiryLoop: null,
    deliberationState: null,
    threadRuntime: null,
    commitmentLedger: null,
    inquiryPlanner: null,
    repairLedger: null,
    intentionStream: null,
    reflectionLedger: null,
    executiveCycle: null,
    mindDynamics: null,
    mindKernel: null,
    thoughtThreads: null,
    counterfactualDeliberation: null,
    actionEcology: null,
    initiativeArbitration: null,
    initiative: null,
    desireMemory: null,
    answerPlanner: null,
    privateThought: null,
    captureState: {
      permission: 'unknown',
      lastGroundedAt: null,
    },
    durabilityPulse: null,
    recentTransition: null,
    nextSuggestedProbeMs: 45_000,
    updatedAt: now,
  }
}

export function normalizeVisualPresenceState(raw: unknown, now = Date.now()): AlicizationVisualPresenceStateSnapshot {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return createDefaultVisualPresenceState(now)

  const candidate = raw as Record<string, unknown>
  const base = createDefaultVisualPresenceState(now)
  const watchMode = candidate.watchMode
  if (watchMode === 'mnemonic-passive' || watchMode === 'symbiotic-vision' || watchMode === 'invited-inspection' || watchMode === 'recovering')
    base.watchMode = watchMode
  base.currentScene = candidate.currentScene && typeof candidate.currentScene === 'object'
    ? candidate.currentScene as AlicizationVisualSceneSnapshot
    : null
  base.attention = candidate.attention && typeof candidate.attention === 'object'
    ? candidate.attention as AlicizationVisualAttentionSnapshot
    : null
  base.workingMemoryEpisodes = Array.isArray(candidate.workingMemoryEpisodes)
    ? pruneWorkingMemoryEpisodes(candidate.workingMemoryEpisodes
        .map(normalizeEpisode)
        .filter((episode): episode is AlicizationVisualEpisode => Boolean(episode)), now)
    : []
  base.worldModel = normalizeWorldModel(candidate.worldModel)
  base.worldOntology = normalizeWorldOntology(candidate.worldOntology)
  base.beliefLedger = normalizeBeliefLedger(candidate.beliefLedger)
  base.beliefRevision = normalizeBeliefRevision(candidate.beliefRevision)
  base.hypothesisGraph = normalizeHypothesisGraph(candidate.hypothesisGraph)
  base.entityWorld = candidate.entityWorld && typeof candidate.entityWorld === 'object'
    ? candidate.entityWorld as AlicizationEntityWorldModelSnapshot
    : null
  base.livingWorldState = candidate.livingWorldState && typeof candidate.livingWorldState === 'object'
    ? candidate.livingWorldState as AlicizationLivingWorldStateSnapshot
    : null
  base.subjectiveInference = normalizeSubjectiveInference(candidate.subjectiveInference)
  base.appraisal = normalizeAppraisal(candidate.appraisal)
  base.goalStack = candidate.goalStack && typeof candidate.goalStack === 'object'
    ? candidate.goalStack as AlicizationGoalStackSnapshot
    : null
  base.concerns = Array.isArray(candidate.concerns)
    ? candidate.concerns.filter(item => item && typeof item === 'object') as AlicizationConcernSnapshot[]
    : []
  base.concernContinuity = candidate.concernContinuity && typeof candidate.concernContinuity === 'object'
    ? candidate.concernContinuity as AlicizationConcernContinuityLedgerSnapshot
    : null
  base.relationshipModel = normalizeRelationshipModel(candidate.relationshipModel)
  base.selfContinuity = candidate.selfContinuity && typeof candidate.selfContinuity === 'object'
    ? candidate.selfContinuity as AlicizationSelfContinuitySnapshot
    : null
  base.selfState = candidate.selfState && typeof candidate.selfState === 'object'
    ? candidate.selfState as AlicizationSelfStateSnapshot
    : null
  base.selfGovernor = candidate.selfGovernor && typeof candidate.selfGovernor === 'object'
    ? candidate.selfGovernor as AlicizationSelfGovernorSnapshot
    : null
  base.inquiryLoop = normalizeInquiryLoop(candidate.inquiryLoop)
  base.deliberationState = normalizeDeliberationState(candidate.deliberationState)
  base.threadRuntime = normalizeThreadRuntime(candidate.threadRuntime)
  base.commitmentLedger = normalizeCommitmentLedger(candidate.commitmentLedger)
  base.inquiryPlanner = normalizeInquiryPlanner(candidate.inquiryPlanner)
  base.repairLedger = candidate.repairLedger && typeof candidate.repairLedger === 'object'
    ? candidate.repairLedger as AlicizationRepairLedgerSnapshot
    : null
  base.intentionStream = normalizeIntentionStream(candidate.intentionStream)
  base.reflectionLedger = normalizeReflectionLedger(candidate.reflectionLedger)
  base.executiveCycle = normalizeExecutiveCycle(candidate.executiveCycle)
  base.mindDynamics = normalizeMindDynamics(candidate.mindDynamics)
  base.mindKernel = normalizeMindKernel(candidate.mindKernel)
  base.thoughtThreads = candidate.thoughtThreads && typeof candidate.thoughtThreads === 'object'
    ? candidate.thoughtThreads as AlicizationThoughtThreadStateSnapshot
    : null
  base.counterfactualDeliberation = normalizeCounterfactualDeliberation(candidate.counterfactualDeliberation)
  base.actionEcology = normalizeActionEcology(candidate.actionEcology)
  base.initiativeArbitration = normalizeInitiativeArbitration(candidate.initiativeArbitration)
  base.initiative = normalizeInitiative(candidate.initiative)
  base.desireMemory = candidate.desireMemory && typeof candidate.desireMemory === 'object'
    ? candidate.desireMemory as AlicizationDesireMemorySnapshot
    : null
  base.answerPlanner = candidate.answerPlanner && typeof candidate.answerPlanner === 'object'
    ? candidate.answerPlanner as AlicizationAnswerPlannerSnapshot
    : null
  base.privateThought = candidate.privateThought && typeof candidate.privateThought === 'object'
    ? candidate.privateThought as AlicizationPrivateThoughtSnapshot
    : null
  const captureStateRaw = candidate.captureState && typeof candidate.captureState === 'object'
    ? candidate.captureState as Record<string, unknown>
    : null
  base.captureState = captureStateRaw
    ? {
        permission: captureStateRaw.permission === 'granted'
          || captureStateRaw.permission === 'denied'
          || captureStateRaw.permission === 'prompt'
          ? captureStateRaw.permission
          : 'unknown',
        lastGroundedAt: Number.isFinite(Number(captureStateRaw.lastGroundedAt))
          ? Math.max(0, Math.floor(Number(captureStateRaw.lastGroundedAt)))
          : null,
        sourceName: sanitizeText(captureStateRaw.sourceName, 160) || undefined,
        degradedReason: sanitizeText(captureStateRaw.degradedReason, 160) || undefined,
      }
    : base.captureState
  base.durabilityPulse = candidate.durabilityPulse && typeof candidate.durabilityPulse === 'object'
    ? candidate.durabilityPulse as AlicizationDurabilityPulseSnapshot
    : null
  base.recentTransition = candidate.recentTransition && typeof candidate.recentTransition === 'object'
    ? candidate.recentTransition as AlicizationVisualPresenceStateSnapshot['recentTransition']
    : null
  base.nextSuggestedProbeMs = Number.isFinite(Number(candidate.nextSuggestedProbeMs))
    ? Math.max(1_000, Math.floor(Number(candidate.nextSuggestedProbeMs)))
    : base.nextSuggestedProbeMs
  base.updatedAt = Number.isFinite(Number(candidate.updatedAt))
    ? Math.max(0, Math.floor(Number(candidate.updatedAt)))
    : now
  return base
}

function isHighSemanticEpisode(input: {
  durationMs: number
  previousScene: AlicizationVisualSceneSnapshot
  previousThought: AlicizationPrivateThoughtSnapshot | null
  previousPulse: AlicizationDurabilityPulseSnapshot | null
}) {
  if (input.previousPulse && input.previousPulse.kind !== 'none')
    return true
  if (input.durationMs >= 20 * 60_000 && input.previousScene.scenario === 'coding')
    return true
  if (input.durationMs >= 20 * 60_000 && (input.previousScene.contentKind === 'error' || input.previousScene.contentKind === 'diff'))
    return true
  if (input.durationMs >= 90 * 60_000 && input.previousThought?.emotionalTension === 'late-night-drain')
    return true
  if (input.previousThought?.rationaleTags.includes('invited-inspection') && input.durationMs >= 2 * 60_000)
    return true
  return false
}

function buildEpisode(input: {
  now: number
  previousScene: AlicizationVisualSceneSnapshot
  previousAttention: AlicizationVisualAttentionSnapshot | null
  previousThought: AlicizationPrivateThoughtSnapshot | null
  previousPulse: AlicizationDurabilityPulseSnapshot | null
}) {
  const endedAt = Math.max(input.previousScene.beganAt, input.now)
  const durationMs = Math.max(0, endedAt - input.previousScene.beganAt)
  const episode: AlicizationVisualEpisode = {
    scene: `${input.previousScene.scenario}:${input.previousScene.workloadKind}:${input.previousScene.contentKind}`,
    summary: summarizeScene(input.previousScene),
    attentionTarget: describeAttentionTarget(input.previousAttention?.target) || undefined,
    beganAt: input.previousScene.beganAt,
    endedAt,
    confidence: clamp01(input.previousScene.confidence),
    emotionalTension: input.previousThought?.emotionalTension ?? 'calm-browse',
    sedimentCandidate: false,
  }
  episode.sedimentCandidate = isHighSemanticEpisode({
    durationMs,
    previousScene: input.previousScene,
    previousThought: input.previousThought,
    previousPulse: input.previousPulse,
  })
  return episode
}

export function updateVisualPresenceState(input: {
  now: number
  previousState?: AlicizationVisualPresenceStateSnapshot | null
  watchMode: AlicizationVisualPresenceStateSnapshot['watchMode']
  scene: AlicizationVisualSceneSnapshot | null
  attention: AlicizationVisualAttentionSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  worldOntology?: AlicizationWorldOntologySnapshot | null
  beliefLedger?: AlicizationBeliefLedgerSnapshot | null
  beliefRevision?: AlicizationBeliefRevisionSnapshot | null
  hypothesisGraph?: AlicizationHypothesisGraphSnapshot | null
  entityWorld?: AlicizationEntityWorldModelSnapshot | null
  livingWorldState?: AlicizationLivingWorldStateSnapshot | null
  subjectiveInference?: AlicizationSubjectiveInferenceSnapshot | null
  appraisal?: AlicizationSubjectiveSceneAppraisal | null
  goalStack?: AlicizationGoalStackSnapshot | null
  concerns?: AlicizationConcernSnapshot[]
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  selfState?: AlicizationSelfStateSnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  inquiryLoop?: AlicizationInquiryLoopSnapshot | null
  deliberationState?: AlicizationDeliberationStateSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  intentionStream?: AlicizationIntentionStreamSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  mindDynamics?: AlicizationMindDynamicsSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  counterfactualDeliberation?: AlicizationCounterfactualDeliberationSnapshot | null
  actionEcology?: AlicizationActionEcologySnapshot | null
  initiativeArbitration?: AlicizationInitiativeArbitrationSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  privateThought: AlicizationPrivateThoughtSnapshot | null
  captureState?: AlicizationVisualPresenceStateSnapshot['captureState']
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
  recentTransition?: AlicizationVisualPresenceStateSnapshot['recentTransition']
  nextSuggestedProbeMs: number
}): AlicizationVisualPresenceStateSnapshot {
  const previousState = input.previousState ?? createDefaultVisualPresenceState(input.now)
  let workingMemoryEpisodes = pruneWorkingMemoryEpisodes(previousState.workingMemoryEpisodes, input.now)

  if (previousState.currentScene && sceneSignature(previousState.currentScene) !== sceneSignature(input.scene)) {
    const previousEpisode = buildEpisode({
      now: input.now,
      previousScene: previousState.currentScene,
      previousAttention: previousState.attention,
      previousThought: previousState.privateThought,
      previousPulse: previousState.durabilityPulse,
    })
    workingMemoryEpisodes = [...workingMemoryEpisodes, previousEpisode].slice(-visualWorkingMemoryLimit)
  }

  return {
    watchMode: input.watchMode,
    currentScene: input.scene,
    attention: input.attention,
    workingMemoryEpisodes,
    worldModel: input.worldModel ?? previousState.worldModel ?? null,
    worldOntology: input.worldOntology ?? previousState.worldOntology ?? null,
    beliefLedger: input.beliefLedger ?? previousState.beliefLedger ?? null,
    beliefRevision: input.beliefRevision ?? previousState.beliefRevision ?? null,
    hypothesisGraph: input.hypothesisGraph ?? previousState.hypothesisGraph ?? null,
    entityWorld: input.entityWorld ?? previousState.entityWorld ?? null,
    livingWorldState: input.livingWorldState ?? previousState.livingWorldState ?? null,
    subjectiveInference: input.subjectiveInference ?? previousState.subjectiveInference ?? null,
    appraisal: input.appraisal ?? null,
    goalStack: input.goalStack ?? previousState.goalStack ?? null,
    concerns: Array.isArray(input.concerns) ? input.concerns : [],
    concernContinuity: input.concernContinuity ?? previousState.concernContinuity ?? null,
    relationshipModel: input.relationshipModel ?? previousState.relationshipModel ?? null,
    selfContinuity: input.selfContinuity ?? previousState.selfContinuity ?? null,
    selfState: input.selfState ?? null,
    selfGovernor: input.selfGovernor ?? previousState.selfGovernor ?? null,
    inquiryLoop: input.inquiryLoop ?? previousState.inquiryLoop ?? null,
    deliberationState: input.deliberationState ?? previousState.deliberationState ?? null,
    threadRuntime: input.threadRuntime ?? previousState.threadRuntime ?? null,
    commitmentLedger: input.commitmentLedger ?? previousState.commitmentLedger ?? null,
    inquiryPlanner: input.inquiryPlanner ?? previousState.inquiryPlanner ?? null,
    repairLedger: input.repairLedger ?? previousState.repairLedger ?? null,
    intentionStream: input.intentionStream ?? previousState.intentionStream ?? null,
    reflectionLedger: input.reflectionLedger ?? previousState.reflectionLedger ?? null,
    executiveCycle: input.executiveCycle ?? previousState.executiveCycle ?? null,
    mindDynamics: input.mindDynamics ?? previousState.mindDynamics ?? null,
    mindKernel: input.mindKernel ?? previousState.mindKernel ?? null,
    thoughtThreads: input.thoughtThreads ?? previousState.thoughtThreads ?? null,
    counterfactualDeliberation: input.counterfactualDeliberation ?? previousState.counterfactualDeliberation ?? null,
    actionEcology: input.actionEcology ?? previousState.actionEcology ?? null,
    initiativeArbitration: input.initiativeArbitration ?? previousState.initiativeArbitration ?? null,
    initiative: input.initiative ?? null,
    desireMemory: input.desireMemory ?? previousState.desireMemory ?? null,
    answerPlanner: input.answerPlanner ?? previousState.answerPlanner ?? null,
    privateThought: input.privateThought,
    captureState: input.captureState ?? previousState.captureState,
    durabilityPulse: input.durabilityPulse && input.durabilityPulse.kind !== 'none'
      ? input.durabilityPulse
      : null,
    recentTransition: input.recentTransition ?? null,
    nextSuggestedProbeMs: Math.max(1_000, Math.floor(input.nextSuggestedProbeMs)),
    updatedAt: input.now,
  }
}

export function buildVisualSedimentFragment(episode: AlicizationVisualEpisode) {
  if (!episode.sedimentCandidate)
    return ''
  const attentionTarget = episode.attentionTarget ? ` attention:${episode.attentionTarget}` : ''
  return [
    `visual_scene:${episode.scene}`,
    `emotional_tension:${episode.emotionalTension}`,
    `summary:${episode.summary}${attentionTarget}`,
  ].join(' ')
}

export function buildVisualRecallSeed(input: {
  scene?: AlicizationVisualSceneSnapshot | null
  emotionalTension?: AlicizationPrivateThoughtSnapshot['emotionalTension'] | null
}) {
  const summary = input.scene ? summarizeScene(input.scene) : ''
  const tension = sanitizeText(input.emotionalTension ?? '', 64)
  return [summary, tension ? `emotional_tension:${tension}` : '']
    .filter(Boolean)
    .join(' | ')
}
