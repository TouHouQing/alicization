import type {
  AlicizationDurabilityPulseSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationVisualAttentionSnapshot,
  AlicizationVisualEpisode,
  AlicizationVisualPresenceStateSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationVisualTarget,
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

export function createDefaultVisualPresenceState(now = Date.now()): AlicizationVisualPresenceStateSnapshot {
  return {
    watchMode: 'mnemonic-passive',
    currentScene: null,
    attention: null,
    workingMemoryEpisodes: [],
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
