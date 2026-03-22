import type {
  AlicizationDurabilityPulseSnapshot,
  AlicizationProactiveScenario,
  AlicizationSystemProbeSample,
  AlicizationVisualPresenceStateSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationVisualTarget,
  AlicizationVisualTransitionSnapshot,
  AlicizationVisualWatchMode,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

const passiveProbeMs = 45_000
const symbioticProbeMs = 12_000
const invitedProbeMs = 6_000
const recoveringProbeMs = 5_000

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

function resolveSceneSummary(input: {
  foregroundTarget: AlicizationVisualTarget | null
  groundedSummary?: string | null
  scenario: AlicizationProactiveScenario
  context: Pick<AlicizationProactiveLayeredContext, 'workload' | 'content'>
}) {
  const groundedSummary = sanitizeText(input.groundedSummary, 220)
  if (groundedSummary)
    return groundedSummary
  if (input.foregroundTarget?.title)
    return input.foregroundTarget.title
  if (input.foregroundTarget?.appName && input.foregroundTarget?.processName && input.foregroundTarget.appName !== input.foregroundTarget.processName)
    return `${input.foregroundTarget.appName} ${input.foregroundTarget.processName}`
  return input.foregroundTarget?.appName
    ?? input.foregroundTarget?.processName
    ?? `${input.scenario} ${input.context.content.kind}`
}

function resolveSceneSource(input: {
  invitedInspectionActive: boolean
  groundedSummary?: string | null
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
  screenSemanticSummaryActive: boolean
}) {
  if (input.durabilityPulse && input.durabilityPulse.kind !== 'none')
    return 'durability-hook' as const
  if (input.invitedInspectionActive && input.groundedSummary)
    return 'invited-grounding' as const
  if (input.screenSemanticSummaryActive && input.groundedSummary)
    return 'screen-semantic-summary' as const
  return 'foreground-window-heuristic' as const
}

function resolveNextProbeMs(watchMode: AlicizationVisualWatchMode) {
  if (watchMode === 'recovering')
    return recoveringProbeMs
  if (watchMode === 'invited-inspection')
    return invitedProbeMs
  if (watchMode === 'symbiotic-vision')
    return symbioticProbeMs
  return passiveProbeMs
}

function resolveWatchMode(input: {
  now: number
  scenario: AlicizationProactiveScenario
  previousState?: AlicizationVisualPresenceStateSnapshot | null
  foregroundTarget: AlicizationVisualTarget | null
  context: Pick<AlicizationProactiveLayeredContext, 'system' | 'content'>
  invitedInspectionActive: boolean
  groundedSummary?: string | null
  screenSemanticSummaryActive: boolean
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
}) {
  if (input.durabilityPulse && input.durabilityPulse.kind !== 'none')
    return { watchMode: 'recovering' as const, reason: 'durability-pulse' }
  if (input.invitedInspectionActive)
    return { watchMode: 'invited-inspection' as const, reason: 'invited-inspection' }

  const previousScene = input.previousState?.currentScene
  const sameForeground = previousScene
    ? targetSignature(previousScene.target ?? null) === targetSignature(input.foregroundTarget)
    : false
  const previousDurationMs = previousScene && sameForeground
    ? Math.max(0, input.now - previousScene.beganAt)
    : 0
  const attentionConflict = Boolean(
    input.previousState?.attention?.target
    && input.foregroundTarget
    && targetSignature(input.previousState.attention.target) !== targetSignature(input.foregroundTarget)
    && (input.now - (input.previousState.attention.lastConfirmedAt ?? input.now)) <= 3 * 60_000,
  )
  const codingSymbiotic = input.scenario === 'coding'
    && (
      previousDurationMs >= 20_000
      || input.context.content.kind === 'error'
      || input.context.content.kind === 'diff'
      || input.screenSemanticSummaryActive
      || Boolean(input.groundedSummary)
    )
  const mediaSymbiotic = input.scenario === 'media'
    && (
      input.context.system.fullscreenLikely
      || input.context.system.inputActivity === 'active'
      || input.screenSemanticSummaryActive
    )

  if (codingSymbiotic || mediaSymbiotic || attentionConflict) {
    return {
      watchMode: 'symbiotic-vision' as const,
      reason: attentionConflict ? 'attention-conflict' : 'symbiotic-entry',
    }
  }

  return {
    watchMode: 'mnemonic-passive' as const,
    reason: 'passive-continuity',
  }
}

export interface AlicizationVisualHeartbeatResult {
  watchMode: AlicizationVisualWatchMode
  scene: AlicizationVisualSceneSnapshot | null
  durabilityPulse: AlicizationDurabilityPulseSnapshot | null
  recentTransition: AlicizationVisualTransitionSnapshot | null
  nextSuggestedProbeMs: number
}

export function buildVisualHeartbeat(input: {
  now: number
  scenario: AlicizationProactiveScenario
  previousState?: AlicizationVisualPresenceStateSnapshot | null
  context: Pick<AlicizationProactiveLayeredContext, 'system' | 'workload' | 'content'>
  invitedInspectionActive: boolean
  groundedSummary?: string | null
  screenSemanticSummaryActive: boolean
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
}): AlicizationVisualHeartbeatResult {
  const foregroundTarget = normalizeTarget(input.context.system.foregroundWindow)
  const watchModeResolution = resolveWatchMode({
    now: input.now,
    scenario: input.scenario,
    previousState: input.previousState,
    foregroundTarget,
    context: {
      system: input.context.system,
      content: input.context.content,
    },
    invitedInspectionActive: input.invitedInspectionActive,
    groundedSummary: input.groundedSummary,
    screenSemanticSummaryActive: input.screenSemanticSummaryActive,
    durabilityPulse: input.durabilityPulse,
  })
  const previousScene = input.previousState?.currentScene
  const sameScene = previousScene
    ? targetSignature(previousScene.target ?? null) === targetSignature(foregroundTarget)
    && previousScene.scenario === input.scenario
    && previousScene.contentKind === input.context.content.kind
    && previousScene.workloadKind === input.context.workload.kind
    : false
  const summary = resolveSceneSummary({
    foregroundTarget,
    groundedSummary: input.groundedSummary,
    scenario: input.scenario,
    context: input.context,
  })
  const scene = foregroundTarget || summary
    ? {
      workloadKind: input.context.workload.kind,
      contentKind: input.context.content.kind,
      scenario: input.scenario,
      summary: summary || undefined,
      source: resolveSceneSource({
        invitedInspectionActive: input.invitedInspectionActive,
        groundedSummary: input.groundedSummary,
        durabilityPulse: input.durabilityPulse,
        screenSemanticSummaryActive: input.screenSemanticSummaryActive,
      }),
      confidence: clamp01(
        input.context.content.source === 'screen-semantic-summary'
          ? Math.max(input.context.content.confidence, input.context.workload.confidence)
          : summary
            ? 0.74
            : 0.52,
      ),
      target: foregroundTarget,
      beganAt: sameScene ? previousScene?.beganAt ?? input.now : input.now,
      lastSeenAt: input.now,
    } satisfies AlicizationVisualSceneSnapshot
    : null

  const recentTransition = input.previousState
    && input.previousState.watchMode !== watchModeResolution.watchMode
    ? {
      fromWatchMode: input.previousState.watchMode,
      toWatchMode: watchModeResolution.watchMode,
      fromScenario: input.previousState.currentScene?.scenario ?? 'unknown',
      durationMs: Math.max(0, input.now - (input.previousState.currentScene?.beganAt ?? input.previousState.updatedAt)),
      reason: watchModeResolution.reason,
      occurredAt: input.now,
    } satisfies AlicizationVisualTransitionSnapshot
    : null

  return {
    watchMode: watchModeResolution.watchMode,
    scene,
    durabilityPulse: input.durabilityPulse && input.durabilityPulse.kind !== 'none'
      ? input.durabilityPulse
      : null,
    recentTransition,
    nextSuggestedProbeMs: resolveNextProbeMs(watchModeResolution.watchMode),
  }
}
