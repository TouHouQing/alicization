import type {
  AlicizationDurabilityPulseSnapshot,
  AlicizationVisualAttentionSnapshot,
  AlicizationVisualEpisode,
  AlicizationVisualSceneSnapshot,
  AlicizationVisualTarget,
  AlicizationVisualTransitionSnapshot,
  AlicizationVisualWatchMode,
  AlicizationWorldCertainty,
  AlicizationWorldContinuityLabel,
  AlicizationWorldModelSnapshot,
  AlicizationWorldThreadKind,
  AlicizationWorldThreadSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

const lingeringThreadTtlMs = 10 * 60_000

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

function targetSignature(target: AlicizationVisualTarget | null | undefined) {
  const normalized = normalizeTarget(target)
  if (!normalized)
    return ''
  return [
    normalized.appName ?? '',
    normalized.processName ?? '',
    normalized.title ?? '',
    normalized.pid ?? '',
  ].join('::').toLowerCase()
}

function isSeriousDurabilityPulse(pulse: AlicizationDurabilityPulseSnapshot | null | undefined) {
  return pulse?.kind === 'process-gone'
    || pulse?.kind === 'render-process-gone'
    || pulse?.kind === 'child-process-gone'
    || pulse?.kind === 'anr-likely'
}

function isAfterglowWindow(input: {
  now: number
  recentTransition: AlicizationVisualTransitionSnapshot | null
}) {
  const recentTransition = input.recentTransition
  if (!recentTransition)
    return false
  return recentTransition.fromWatchMode === 'symbiotic-vision'
    && (recentTransition.fromScenario === 'coding' || recentTransition.fromScenario === 'media')
    && recentTransition.durationMs >= 20 * 60_000
    && input.now - recentTransition.occurredAt <= 120_000
}

function inferThreadKind(input: {
  context: AlicizationProactiveLayeredContext
  scene: AlicizationVisualSceneSnapshot | null
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
}) {
  if (isSeriousDurabilityPulse(input.durabilityPulse))
    return 'recovery' as const
  if (input.context.localTime.isLateNight && (input.context.relationship.fatigue >= 55 || input.context.relationship.lateNightActiveMinutes >= 90))
    return 'late-night-endurance' as const
  if (input.context.content.kind === 'error')
    return 'debugging' as const
  if (input.context.content.kind === 'diff')
    return 'change-review' as const
  if (input.context.workload.kind === 'coding' || input.context.workload.kind === 'terminal')
    return 'deep-focus' as const
  if (input.scene?.scenario === 'media' || input.context.workload.kind === 'media')
    return 'co-viewing' as const
  if (input.context.workload.kind === 'chat')
    return 'chatting' as const
  if (input.context.workload.kind === 'browser' || input.context.workload.kind === 'document')
    return 'browsing' as const
  return 'unknown' as const
}

function buildThreadTitle(input: {
  kind: AlicizationWorldThreadKind
  scene: AlicizationVisualSceneSnapshot | null
  attention: AlicizationVisualAttentionSnapshot | null
  previousModel?: AlicizationWorldModelSnapshot | null
}) {
  const title = sanitizeText(
    input.scene?.summary
    ?? input.attention?.target?.title
    ?? input.scene?.target?.title
    ?? input.previousModel?.activeThread?.title
    ?? '',
    140,
  )
  if (title)
    return title
  switch (input.kind) {
    case 'debugging': return '当前故障点'
    case 'change-review': return '当前改动块'
    case 'deep-focus': return '你手上的这件任务'
    case 'co-viewing': return '当前共视内容'
    case 'late-night-endurance': return '深夜里的这一段停留'
    case 'chatting': return '当前对话'
    case 'browsing': return '当前浏览页'
    case 'recovery': return '前台异常'
    default: return '当前场景'
  }
}

function buildThreadSummary(input: {
  kind: AlicizationWorldThreadKind
  title: string
  scene: AlicizationVisualSceneSnapshot | null
  afterglowOpen: boolean
  carriedFromPrevious?: boolean
}) {
  const title = sanitizeText(input.title, 140) || '这一刻'
  if (input.kind === 'debugging')
    return `thread=debugging; target=${title}`
  if (input.kind === 'change-review')
    return `thread=change_review; target=${title}`
  if (input.kind === 'deep-focus')
    return `thread=deep_focus; target=${title}`
  if (input.kind === 'co-viewing') {
    return input.afterglowOpen
      ? `thread=co_viewing; target=${title}; afterglow=open`
      : `thread=co_viewing; target=${title}; shared_view=active`
  }
  if (input.kind === 'late-night-endurance')
    return `thread=late_night_endurance; target=${title}`
  if (input.kind === 'chatting')
    return `thread=chatting; target=${title}`
  if (input.kind === 'browsing') {
    return input.carriedFromPrevious
      ? `thread=browsing; target=${title}; carried_previous_thread=true`
      : `thread=browsing; target=${title}`
  }
  if (input.kind === 'recovery')
    return 'thread=recovery; foreground=crash_or_freeze_signal'
  return input.scene?.summary
    ? `thread=scene; target=${sanitizeText(input.scene.summary, 140)}`
    : 'thread=current_scene; continuity_understanding=active'
}

function coarseTargetSignature(target: AlicizationVisualTarget | null | undefined) {
  const normalized = normalizeTarget(target)
  if (!normalized)
    return ''
  return [
    normalized.appName ?? '',
    normalized.processName ?? '',
    normalized.pid ?? '',
  ].join('::').toLowerCase()
}

function isUnresolvedThread(kind: AlicizationWorldThreadKind, sceneAgeMs: number, attentionAgeMs: number) {
  if (kind === 'debugging' || kind === 'change-review' || kind === 'late-night-endurance' || kind === 'recovery')
    return true
  if (kind === 'deep-focus')
    return sceneAgeMs >= 5 * 60_000 || attentionAgeMs >= 5 * 60_000
  return false
}

function buildThreadId(kind: AlicizationWorldThreadKind, title: string, target: AlicizationVisualTarget | null) {
  return [
    kind,
    sanitizeText(title, 120).toLowerCase(),
    targetSignature(target),
  ].join('::')
}

function degradeLingeringThread(thread: AlicizationWorldThreadSnapshot, now: number) {
  return {
    ...thread,
    status: 'lingering' as const,
    source: 'continuity' as const,
    confidence: clamp01(thread.confidence * 0.9),
    significance: clamp01(thread.significance * 0.88),
    lastUpdatedAt: now,
  }
}

function parseEpisodeThreadKind(sceneLabel: string): AlicizationWorldThreadKind {
  const [scenario = '', workload = '', content = ''] = sceneLabel.split(':')
  if (content === 'error')
    return 'debugging'
  if (content === 'diff')
    return 'change-review'
  if (scenario === 'late-night-care')
    return 'late-night-endurance'
  if (scenario === 'media' || workload === 'media')
    return 'co-viewing'
  if (workload === 'coding' || workload === 'terminal')
    return 'deep-focus'
  if (workload === 'chat')
    return 'chatting'
  if (workload === 'browser' || workload === 'document')
    return 'browsing'
  return 'unknown'
}

function threadFromEpisode(episode: AlicizationVisualEpisode): AlicizationWorldThreadSnapshot {
  const kind = parseEpisodeThreadKind(episode.scene)
  const title = sanitizeText(episode.attentionTarget ?? episode.summary, 140) || 'recent-scene'
  return {
    id: buildThreadId(kind, title, null),
    kind,
    status: 'lingering',
    source: 'working-memory',
    title,
    summary: sanitizeText(episode.summary, 180) || title,
    confidence: clamp01(episode.confidence * 0.86),
    significance: clamp01(0.3 + episode.confidence * 0.34 + (episode.sedimentCandidate ? 0.2 : 0)),
    unresolved: kind === 'debugging' || kind === 'change-review' || kind === 'late-night-endurance' || kind === 'deep-focus',
    beganAt: episode.beganAt,
    lastUpdatedAt: episode.endedAt,
    target: null,
  }
}

function dedupeTexts(values: string[]) {
  return [...new Set(values.map(value => sanitizeText(value, 180)).filter(Boolean))]
}

function sceneEvidenceLabel(scene: AlicizationVisualSceneSnapshot | null) {
  return sanitizeText(
    scene?.summary
    ?? scene?.target?.title
    ?? '',
    140,
  )
}

function hasContradictoryLiveEvidence(input: {
  context: AlicizationProactiveLayeredContext
  scene: AlicizationVisualSceneSnapshot | null
  attention: AlicizationVisualAttentionSnapshot | null
  previousModel?: AlicizationWorldModelSnapshot | null
}) {
  const previousTarget = normalizeTarget(input.previousModel?.focusTarget ?? input.previousModel?.activeThread?.target)
  const previousTitle = sanitizeText(input.previousModel?.activeThread?.title ?? previousTarget?.title ?? '', 140)
  if (!previousTarget && !previousTitle)
    return false

  const currentTarget = normalizeTarget(
    input.scene?.target
    ?? input.attention?.target
    ?? input.context.system.foregroundWindow
    ?? null,
  )
  const currentTitle = sceneEvidenceLabel(input.scene)

  if (!currentTarget && !currentTitle)
    return false

  if (
    currentTarget
    && previousTarget
    && targetSignature(currentTarget) !== ''
    && targetSignature(previousTarget) !== ''
    && targetSignature(currentTarget) !== targetSignature(previousTarget)
  ) {
    return true
  }

  if (
    currentTarget
    && previousTarget
    && coarseTargetSignature(currentTarget) !== ''
    && coarseTargetSignature(previousTarget) !== ''
    && coarseTargetSignature(currentTarget) !== coarseTargetSignature(previousTarget)
  ) {
    return true
  }

  if (
    input.scene?.source === 'screen-semantic-summary'
    || input.scene?.source === 'invited-grounding'
  ) {
    if (currentTitle && previousTitle && currentTitle !== previousTitle)
      return true
  }

  return false
}

function shouldPreferDirectThread(input: {
  directThread: AlicizationWorldThreadSnapshot | null
  scene: AlicizationVisualSceneSnapshot | null
  previousModel?: AlicizationWorldModelSnapshot | null
  afterglowOpen: boolean
  contradictoryLiveEvidence: boolean
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
}) {
  if (!input.directThread)
    return false
  if (isSeriousDurabilityPulse(input.durabilityPulse))
    return true
  if (input.directThread.source === 'grounded-scene')
    return true
  if (input.contradictoryLiveEvidence && input.scene?.source === 'screen-semantic-summary')
    return true
  if (input.contradictoryLiveEvidence && !input.afterglowOpen)
    return true
  if (input.directThread.source === 'observed-scene' && !input.afterglowOpen)
    return true
  return false
}

function shouldCarryPreviousThread(input: {
  now: number
  directThread: AlicizationWorldThreadSnapshot | null
  previousModel?: AlicizationWorldModelSnapshot | null
  afterglowOpen: boolean
  contradictoryLiveEvidence: boolean
}) {
  if (!input.previousModel?.activeThread)
    return false
  if (input.afterglowOpen) {
    if (input.contradictoryLiveEvidence && input.directThread?.source === 'grounded-scene')
      return false
    return true
  }
  return !input.directThread && input.now - input.previousModel.activeThread.lastUpdatedAt <= lingeringThreadTtlMs
}

function buildEpistemicState(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  scene: AlicizationVisualSceneSnapshot | null
  attention: AlicizationVisualAttentionSnapshot | null
  currentThread: AlicizationWorldThreadSnapshot | null
  continuityLabel: AlicizationWorldContinuityLabel
  previousModel?: AlicizationWorldModelSnapshot | null
  watchMode: AlicizationVisualWatchMode
}) {
  const certainty: AlicizationWorldCertainty = input.currentThread?.source === 'grounded-scene'
    ? 'grounded'
    : input.currentThread?.source === 'durability-pulse'
      ? 'observed'
      : input.currentThread?.source === 'observed-scene'
        ? 'observed'
        : input.currentThread?.source === 'continuity' || input.currentThread?.source === 'working-memory'
          ? 'lingering'
          : input.scene || input.attention
            ? 'observed'
            : 'uncertain'
  const freshestTimestamp = input.scene?.lastSeenAt
    ?? input.attention?.lastConfirmedAt
    ?? input.currentThread?.lastUpdatedAt
    ?? 0
  const freshness = input.now - freshestTimestamp <= 15_000
    ? 'live'
    : input.now - freshestTimestamp <= 2 * 60_000
      ? 'recent'
      : 'stale'

  const seenNow = dedupeTexts([
    input.scene?.target?.appName ? `app:${input.scene.target.appName}` : '',
    input.scene?.target?.title ? `window:${input.scene.target.title}` : '',
    input.scene?.summary ? `scene:${input.scene.summary}` : '',
    input.attention?.target?.title ? `focus:${input.attention.target.title}` : '',
  ])
  const inferredNow = dedupeTexts([
    input.currentThread ? `thread:${input.currentThread.kind}` : '',
    `availability:${input.context.system.inputActivity === 'active' ? 'engaged' : 'open'}`,
    `continuity:${input.continuityLabel}`,
    input.watchMode ? `watch-mode:${input.watchMode}` : '',
  ])
  const openQuestions = dedupeTexts([
    certainty === 'lingering' ? 'world-question:thread-not-regrounded' : '',
    certainty === 'uncertain' ? 'world-question:foreground-uncertain' : '',
    input.attention?.source === 'old-anchor' || input.attention?.source === 'recent-observation'
      ? 'world-question:attention-may-be-stale'
      : '',
    input.scene?.source === 'foreground-window-heuristic' && input.context.content.kind === 'unknown'
      ? 'world-question:window-only-evidence'
      : '',
    input.currentThread?.kind === 'debugging' && (certainty === 'lingering' || certainty === 'uncertain')
      ? 'world-question:error-body-unseen'
      : '',
  ])
  const staleRisks = dedupeTexts([
    certainty === 'lingering' ? 'world-risk:continuity-afterimage' : '',
    input.scene?.source === 'foreground-window-heuristic'
      ? 'world-risk:window-only-grounding'
      : '',
    (
      input.previousModel?.activeThread
      && input.currentThread
      && input.previousModel.activeThread.id !== input.currentThread.id
      && certainty !== 'grounded'
    )
      ? 'world-risk:thread-contamination'
      : '',
    (
      input.previousModel?.activeThread
      && input.currentThread
      && input.previousModel.activeThread.id !== input.currentThread.id
      && input.currentThread.source === 'grounded-scene'
    )
      ? 'world-risk:previous-thread-demoted'
      : '',
  ])

  return {
    certainty,
    freshness,
    seenNow,
    inferredNow,
    openQuestions,
    staleRisks,
  } satisfies AlicizationWorldModelSnapshot['epistemicState']
}

function resolveHostState(input: {
  context: AlicizationProactiveLayeredContext
  watchMode: AlicizationVisualWatchMode
  currentThread: AlicizationWorldThreadSnapshot | null
  afterglowOpen: boolean
}) {
  const availability = (() => {
    if (input.context.localTime.isLateNight && input.context.relationship.fatigue >= 55)
      return 'fatigued' as const
    if (
      input.context.system.fullscreenLikely
      || (
        input.watchMode === 'symbiotic-vision'
        && input.context.workload.kind === 'media'
        && input.context.system.inputActivity === 'active'
      )
    ) {
      return 'immersed' as const
    }
    if (
      input.context.system.inputActivity === 'active'
      && (
        input.currentThread?.kind === 'debugging'
        || input.currentThread?.kind === 'change-review'
        || input.currentThread?.kind === 'deep-focus'
      )
    ) {
      return 'focused' as const
    }
    if (input.afterglowOpen || input.context.system.inputActivity === 'idle' || (input.context.system.idleSeconds ?? 0) >= 45)
      return 'open' as const
    return 'drifting' as const
  })()

  const burden = (() => {
    if (
      input.context.system.cpuUsage >= 70
      || input.context.relationship.fatigue >= 80
      || (input.currentThread?.significance ?? 0) >= 0.78
    ) {
      return 'heavy' as const
    }
    if (
      input.context.system.cpuUsage >= 45
      || input.context.system.inputActivity === 'active'
      || (input.currentThread?.significance ?? 0) >= 0.52
    ) {
      return 'moderate' as const
    }
    return 'light' as const
  })()

  return {
    availability,
    burden,
  } satisfies AlicizationWorldModelSnapshot['hostState']
}

export function buildWorldModel(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  watchMode: AlicizationVisualWatchMode
  scene: AlicizationVisualSceneSnapshot | null
  attention: AlicizationVisualAttentionSnapshot | null
  recentTransition: AlicizationVisualTransitionSnapshot | null
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
  workingMemoryEpisodes?: AlicizationVisualEpisode[]
  previousModel?: AlicizationWorldModelSnapshot | null
}): AlicizationWorldModelSnapshot {
  const previousModel = input.previousModel ?? null
  const sceneAgeMs = input.scene ? Math.max(0, input.now - input.scene.beganAt) : 0
  const attentionAgeMs = input.attention?.engagedAt ? Math.max(0, input.now - input.attention.engagedAt) : 0
  const previousActiveTarget = previousModel?.focusTarget ?? previousModel?.activeThread?.target ?? null
  const previousThreadTitle = sanitizeText(previousModel?.activeThread?.title, 140)
  const sameSceneAsBefore = Boolean(
    input.scene
    && previousThreadTitle
    && targetSignature(input.scene.target) === targetSignature(previousActiveTarget)
    && sanitizeText(input.scene.summary ?? input.scene.target?.title ?? '', 140) === previousThreadTitle,
  )
  const sameAttentionAsBefore = targetSignature(input.attention?.target) !== ''
    && targetSignature(input.attention?.target) === targetSignature(previousActiveTarget)
  const afterglowOpen = isAfterglowWindow({
    now: input.now,
    recentTransition: input.recentTransition,
  })
  const continuityLabel: AlicizationWorldContinuityLabel
    = isSeriousDurabilityPulse(input.durabilityPulse)
      ? 'recovery'
      : afterglowOpen
        ? 'afterglow'
        : input.scene && previousModel?.activeThread && targetSignature(input.scene.target) === targetSignature(previousModel.activeThread.target)
          ? 'staying-with-thread'
          : input.scene && sameAttentionAsBefore
            ? 'reacquired'
            : input.scene && previousModel?.activeThread
              ? 'scene-shift'
              : input.scene
                ? 'new-focus'
                : 'recovery'

  const threadKind = inferThreadKind({
    context: input.context,
    scene: input.scene,
    durabilityPulse: input.durabilityPulse,
  })
  const contradictoryLiveEvidence = hasContradictoryLiveEvidence({
    context: input.context,
    scene: input.scene,
    attention: input.attention,
    previousModel,
  })
  const focusTarget = normalizeTarget(input.attention?.target ?? input.scene?.target ?? previousActiveTarget)
  const rawTitle = buildThreadTitle({
    kind: threadKind,
    scene: input.scene,
    attention: input.attention,
    previousModel,
  })
  const unresolved = isUnresolvedThread(threadKind, sceneAgeMs, attentionAgeMs)
  const directThread = (() => {
    const shouldCreateFromCurrentEvidence
      = isSeriousDurabilityPulse(input.durabilityPulse)
        || Boolean(input.scene)
        || Boolean(input.attention)
    if (!shouldCreateFromCurrentEvidence)
      return null
    const source = isSeriousDurabilityPulse(input.durabilityPulse)
      ? 'durability-pulse' as const
      : input.scene?.source === 'screen-semantic-summary' || input.scene?.source === 'invited-grounding'
        ? 'grounded-scene' as const
        : input.attention?.source === 'old-anchor' || input.attention?.source === 'recent-observation'
          ? 'working-memory' as const
          : previousModel?.activeThread && targetSignature(previousModel.activeThread.target) === targetSignature(focusTarget)
            ? 'continuity' as const
            : 'observed-scene' as const
    const title = rawTitle
    const significance = clamp01(
      (input.scene?.confidence ?? input.attention?.confidence ?? 0.46) * 0.46
      + Math.min(sceneAgeMs / (20 * 60_000), 1) * 0.18
      + (unresolved ? 0.18 : 0.04)
      + (afterglowOpen ? 0.08 : 0)
      + (isSeriousDurabilityPulse(input.durabilityPulse) ? 0.18 : 0),
    )
    return {
      id: buildThreadId(threadKind, title, focusTarget),
      kind: threadKind,
      status: sceneAgeMs < 15_000 && !afterglowOpen ? 'forming' : 'active',
      source,
      title,
      summary: buildThreadSummary({
        kind: threadKind,
        title,
        scene: input.scene,
        afterglowOpen,
      }),
      confidence: clamp01(
        (input.scene?.confidence ?? input.attention?.confidence ?? previousModel?.activeThread?.confidence ?? 0.4)
        + (source === 'grounded-scene' ? 0.1 : source === 'continuity' ? 0.04 : 0),
      ),
      significance,
      unresolved,
      beganAt: input.scene?.beganAt ?? input.attention?.engagedAt ?? input.now,
      lastUpdatedAt: input.now,
      target: focusTarget,
    } satisfies AlicizationWorldThreadSnapshot
  })()

  const carryPreviousThread
    = previousModel?.activeThread
      && shouldCarryPreviousThread({
        now: input.now,
        directThread,
        previousModel,
        afterglowOpen,
        contradictoryLiveEvidence,
      })
      ? {
          ...degradeLingeringThread(previousModel.activeThread, input.now),
          summary: buildThreadSummary({
            kind: previousModel.activeThread.kind,
            title: previousModel.activeThread.title,
            scene: input.scene,
            afterglowOpen,
            carriedFromPrevious: true,
          }),
        }
      : null

  const activeThread = shouldPreferDirectThread({
    directThread,
    scene: input.scene,
    previousModel,
    afterglowOpen,
    contradictoryLiveEvidence,
    durabilityPulse: input.durabilityPulse,
  })
    ? directThread
    : carryPreviousThread ?? directThread ?? null
  const epistemicState = buildEpistemicState({
    now: input.now,
    context: input.context,
    scene: input.scene,
    attention: input.attention,
    currentThread: activeThread,
    continuityLabel,
    previousModel,
    watchMode: input.watchMode,
  })
  const hostState = resolveHostState({
    context: input.context,
    watchMode: input.watchMode,
    currentThread: activeThread,
    afterglowOpen,
  })

  const lingeringCandidates: AlicizationWorldThreadSnapshot[] = []
  if (previousModel?.activeThread && previousModel.activeThread.id !== activeThread?.id && input.now - previousModel.activeThread.lastUpdatedAt <= lingeringThreadTtlMs)
    lingeringCandidates.push(degradeLingeringThread(previousModel.activeThread, input.now))
  for (const thread of previousModel?.lingeringThreads ?? []) {
    if (thread.id === activeThread?.id)
      continue
    if (input.now - thread.lastUpdatedAt > lingeringThreadTtlMs)
      continue
    lingeringCandidates.push(degradeLingeringThread(thread, input.now))
  }
  for (const episode of (input.workingMemoryEpisodes ?? []).slice(-4)) {
    if (input.now - episode.endedAt > lingeringThreadTtlMs)
      continue
    lingeringCandidates.push(threadFromEpisode(episode))
  }
  const seenLingeringIds = new Set<string>()
  const lingeringThreads = lingeringCandidates
    .filter((thread) => {
      if (thread.id === activeThread?.id)
        return false
      if (seenLingeringIds.has(thread.id))
        return false
      seenLingeringIds.add(thread.id)
      return true
    })
    .sort((left, right) => right.significance - left.significance)
    .slice(0, 4)

  return {
    activeThread,
    lingeringThreads,
    focusTarget,
    epistemicState,
    continuity: {
      label: continuityLabel,
      sceneAgeMs,
      attentionAgeMs,
      sameSceneAsBefore,
      sameAttentionAsBefore,
      afterglowOpen,
    },
    hostState,
    updatedAt: input.now,
  }
}
