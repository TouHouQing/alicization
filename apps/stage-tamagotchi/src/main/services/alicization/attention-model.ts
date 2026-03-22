import type {
  AlicizationDurabilityPulseSnapshot,
  AlicizationProactiveScenario,
  AlicizationSystemProbeSample,
  AlicizationVisualAttentionSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationVisualTarget,
} from '../../../shared/eventa'

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

function normalizeTarget(
  raw: AlicizationSystemProbeSample['foregroundWindow'] | AlicizationVisualTarget | null | undefined,
): AlicizationVisualTarget | null {
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

function resolvePulseTarget(pulse: AlicizationDurabilityPulseSnapshot | null | undefined) {
  if (!pulse || pulse.kind === 'none')
    return null
  return normalizeTarget({
    appName: pulse.appName,
    processName: pulse.processName,
    title: pulse.title,
    pid: pulse.pid,
  })
}

export function updateVisualAttentionModel(input: {
  now: number
  scenario: AlicizationProactiveScenario
  previousAttention?: AlicizationVisualAttentionSnapshot | null
  currentForeground?: AlicizationSystemProbeSample['foregroundWindow']
  currentScene: AlicizationVisualSceneSnapshot | null
  invitedInspectionActive: boolean
  perceptionAnchor?: AlicizationVisualTarget | null
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
  tccRecovered?: boolean
}): AlicizationVisualAttentionSnapshot | null {
  const previousAttention = input.previousAttention ?? null
  const currentForeground = normalizeTarget(input.currentForeground)
  const sceneTarget = normalizeTarget(input.currentScene?.target)
  const anchorTarget = normalizeTarget(input.perceptionAnchor)
  const pulseTarget = resolvePulseTarget(input.durabilityPulse)

  let target: AlicizationVisualTarget | null = null
  let source: AlicizationVisualAttentionSnapshot['source'] = 'foreground-window'
  let confidence = 0.52
  let invalidationReason: string | null = null

  if (input.durabilityPulse && input.durabilityPulse.kind !== 'none') {
    target = pulseTarget ?? sceneTarget ?? currentForeground ?? anchorTarget
    source = 'durability-pulse'
    confidence = 0.96
    invalidationReason = 'durability-pulse'
  }
  else if (input.invitedInspectionActive) {
    target = sceneTarget ?? currentForeground ?? anchorTarget
    source = 'invited-inspection'
    confidence = 0.93
    invalidationReason = previousAttention ? 'invited-recheck' : null
  }
  else if (sceneTarget) {
    target = sceneTarget
    source = 'current-grounded-scene'
    confidence = Math.max(0.72, input.currentScene?.confidence ?? 0.72)
    if (previousAttention && targetSignature(previousAttention.target) !== targetSignature(sceneTarget))
      invalidationReason = 'scene-conflict'
  }
  else if (currentForeground) {
    target = currentForeground
    source = 'foreground-window'
    confidence = 0.68
    if (previousAttention && targetSignature(previousAttention.target) !== targetSignature(currentForeground))
      invalidationReason = 'foreground-switch'
  }
  else if (anchorTarget) {
    target = anchorTarget
    source = 'recent-observation'
    confidence = 0.64
  }
  else if (previousAttention && (input.now - (previousAttention.lastConfirmedAt ?? input.now)) <= 3 * 60_000) {
    target = normalizeTarget(previousAttention.target)
    source = 'old-anchor'
    confidence = previousAttention.confidence * (input.scenario === 'media' ? 0.72 : 0.86)
  }

  if (!target)
    return null

  if (input.tccRecovered)
    invalidationReason = 'tcc-recovered-first-grounding'

  const sameTarget = previousAttention
    ? targetSignature(previousAttention.target) === targetSignature(target)
    : false
  const engagedAt = sameTarget
    ? previousAttention?.engagedAt ?? input.now
    : input.now
  const lastConfirmedAt = source === 'old-anchor'
    ? previousAttention?.lastConfirmedAt ?? input.now
    : input.now

  return {
    target,
    source,
    confidence: clamp01(confidence),
    engagedAt,
    lastConfirmedAt,
    dwellMs: Math.max(0, input.now - (engagedAt ?? input.now)),
    invalidationReason,
  }
}
