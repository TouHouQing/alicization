import type {
  AlicizationProactiveDecision,
  AlicizationProactiveReasonCode,
  AlicizationProactiveScenario,
} from '../../../shared/eventa'
import type { AlicizationProactiveLoopState } from './proactive-feedback'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { inferScenarioFromContext } from './proactive-layered-context'

export const proactivePolicyVersion = 'epoch3-v1'

export interface AlicizationProactivePerceptionSignals {
  activeAttentionAnchor: boolean
  attentionAnchorAgeMs: number | null
  attentionAnchorConfidence: number
  attentionAnchorWorkloadKind: AlicizationProactiveLayeredContext['workload']['kind']
  attentionAnchorCanOverrideScenario: boolean
  recentObservationCount: number
  invitedInspectionActive: boolean
}

export interface AlicizationProactivePolicyEvaluation extends AlicizationProactiveDecision {
  feedbackBias: number
  consideredSignals: string[]
  ignoredSignals: string[]
  whyNow: string
  whyNotLater: string
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, value))
}

function clampMs(value: number, min: number, max: number) {
  if (!Number.isFinite(value))
    return min
  return Math.max(min, Math.min(max, Math.floor(value)))
}

function buildBaseCooldownMs(scenario: AlicizationProactiveScenario) {
  if (scenario === 'coding')
    return 18 * 60_000
  if (scenario === 'media')
    return 20 * 60_000
  if (scenario === 'late-night-care')
    return 12 * 60_000
  return 10 * 60_000
}

function buildBaseThreshold(scenario: AlicizationProactiveScenario) {
  if (scenario === 'coding')
    return 1.05
  if (scenario === 'media')
    return 0.99
  if (scenario === 'late-night-care')
    return 0.9
  return 0.94
}

function inferScenarioFromPerception(input: {
  workloadKind: AlicizationProactiveLayeredContext['workload']['kind']
  lateNight: boolean
  lateNightActiveMinutes: number
  fatigue: number
}) {
  if (
    input.lateNight
    && (input.lateNightActiveMinutes >= 90 || input.fatigue >= 55)
    && (input.workloadKind === 'game' || input.workloadKind === 'media')
  ) {
    return 'late-night-care' as const
  }
  if (input.workloadKind === 'coding' || input.workloadKind === 'terminal')
    return 'coding' as const
  if (input.workloadKind === 'media')
    return 'media' as const
  return null
}

function resolveUrgency(input: {
  scenario: AlicizationProactiveScenario
  fatigue: number
  lateNightActiveMinutes: number
  contentKind: AlicizationProactiveLayeredContext['content']['kind']
  loneliness: number
}) {
  if (input.scenario === 'late-night-care' && (input.fatigue >= 80 || input.lateNightActiveMinutes >= 180))
    return 'high' as const
  if (input.contentKind === 'error' || input.loneliness >= 95)
    return 'medium' as const
  return 'low' as const
}

function resolveStyle(input: {
  scenario: AlicizationProactiveScenario
  contentKind: AlicizationProactiveLayeredContext['content']['kind']
  fatigue: number
  lateNightActiveMinutes: number
  inputActivity: AlicizationProactiveLayeredContext['system']['inputActivity']
}) {
  if (input.scenario === 'media')
    return input.inputActivity === 'active' ? 'silent-observe' as const : 'light-nudge' as const
  if (input.scenario === 'late-night-care') {
    if (input.fatigue >= 80 || input.lateNightActiveMinutes >= 180)
      return 'firm-warning' as const
    return 'gentle-care' as const
  }
  if (input.scenario === 'coding')
    return input.contentKind === 'error' || input.contentKind === 'diff' ? 'light-nudge' as const : 'gentle-care' as const
  return 'light-nudge' as const
}

function pushReason(reasonCodes: AlicizationProactiveReasonCode[], code: AlicizationProactiveReasonCode, active = true) {
  if (!active || reasonCodes.includes(code))
    return
  reasonCodes.push(code)
}

export function evaluateProactivePolicy(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  proactiveState: AlicizationProactiveLoopState
  killSwitchSuspended: boolean
  perception?: AlicizationProactivePerceptionSignals
}): AlicizationProactivePolicyEvaluation {
  const { context, proactiveState } = input
  const contextScenario = inferScenarioFromContext({
    workload: context.workload.kind,
    content: context.content.kind,
    lateNight: context.localTime.isLateNight,
    lateNightActiveMinutes: context.relationship.lateNightActiveMinutes,
    fatigue: context.relationship.fatigue,
  })
  const perceptionScenario = input.perception?.attentionAnchorCanOverrideScenario
    ? inferScenarioFromPerception({
        workloadKind: input.perception.attentionAnchorWorkloadKind,
        lateNight: context.localTime.isLateNight,
        lateNightActiveMinutes: context.relationship.lateNightActiveMinutes,
        fatigue: context.relationship.fatigue,
      })
    : null
  const scenario = contextScenario === 'general' && perceptionScenario
    ? perceptionScenario
    : contextScenario
  const feedbackBias = proactiveState.scenarioBias[scenario] ?? 0
  const reasonCodes: AlicizationProactiveReasonCode[] = []
  const consideredSignals = [
    'boredom',
    'loneliness',
    'fatigue',
    'inputActivity',
    'cpuUsage',
    'fullscreenLikely',
    'foregroundWindow',
    'workload.kind',
    'content.kind',
    'feedbackBias',
    'lateNightActiveMinutes',
  ]
  if (input.perception?.activeAttentionAnchor) {
    consideredSignals.push(
      'attentionAnchor.workload',
      'attentionAnchor.ageMs',
      'attentionAnchor.confidence',
    )
  }
  if ((input.perception?.recentObservationCount ?? 0) > 0)
    consideredSignals.push('recentObservations.count')
  if (input.perception?.invitedInspectionActive)
    consideredSignals.push('invitedInspection.active')
  if (context.workload.source === 'screen-semantic-summary')
    consideredSignals.push('workload.screenSemantic')
  if (context.content.source === 'screen-semantic-summary') {
    consideredSignals.push('content.screenSemantic')
    if (context.content.summary)
      consideredSignals.push('content.summary')
  }
  const ignoredSignals = [
    'battery',
    'memory',
    'speech-intent-not-wired',
  ]
  if (context.workload.source !== 'screen-semantic-summary' && context.content.source !== 'screen-semantic-summary')
    ignoredSignals.push('screen-semantic-input-unavailable')

  const suppressBusy = context.system.cpuUsage >= 70
    || context.system.fullscreenLikely
    || (context.system.inputActivity === 'active' && context.system.cpuUsage >= 45)
  const cooldownActive = proactiveState.globalCooldownUntil > input.now
  const style = resolveStyle({
    scenario,
    contentKind: context.content.kind,
    fatigue: context.relationship.fatigue,
    lateNightActiveMinutes: context.relationship.lateNightActiveMinutes,
    inputActivity: context.system.inputActivity,
  })
  const urgency = resolveUrgency({
    scenario,
    fatigue: context.relationship.fatigue,
    lateNightActiveMinutes: context.relationship.lateNightActiveMinutes,
    contentKind: context.content.kind,
    loneliness: context.relationship.loneliness,
  })
  const baseScore
    = Math.max(context.relationship.boredom, context.relationship.loneliness) / 100
      + (context.relationship.fatigue >= 55 ? 0.06 : 0)
      + (context.system.inputActivity === 'idle' ? 0.08 : 0)
      + (context.content.kind === 'error' ? 0.14 : 0)
      + (context.content.kind === 'diff' ? 0.08 : 0)
      + (input.perception?.activeAttentionAnchor && input.perception.attentionAnchorWorkloadKind === 'coding' && scenario === 'coding' ? 0.06 : 0)
      + ((input.perception?.recentObservationCount ?? 0) >= 2 && scenario === 'coding' ? 0.04 : 0)
      + (input.perception?.invitedInspectionActive && scenario === 'coding' ? 0.05 : 0)
      + (scenario === 'late-night-care' && context.relationship.lateNightActiveMinutes >= 90 ? 0.14 : 0)
      + (context.relationship.reminderBacklog > 0 ? 0.02 : 0)
  const threshold = buildBaseThreshold(scenario)
    + feedbackBias
    - (input.perception?.invitedInspectionActive && scenario === 'coding' ? 0.04 : 0)
  const shouldInterrupt
    = !input.killSwitchSuspended
      && !suppressBusy
      && !cooldownActive
      && style !== 'silent-observe'
      && baseScore >= threshold

  pushReason(reasonCodes, 'kill-switch-suspended', input.killSwitchSuspended)
  pushReason(reasonCodes, 'fullscreen-host', context.system.fullscreenLikely)
  pushReason(reasonCodes, 'busy-host', suppressBusy && !context.system.fullscreenLikely)
  pushReason(reasonCodes, 'global-cooldown-active', cooldownActive)
  pushReason(reasonCodes, 'attention-anchor-active', input.perception?.activeAttentionAnchor)
  pushReason(reasonCodes, 'recent-observation-memory', (input.perception?.recentObservationCount ?? 0) >= 2)
  pushReason(reasonCodes, 'invited-inspection-active', input.perception?.invitedInspectionActive)
  pushReason(reasonCodes, 'scenario-bias-raised', feedbackBias > 0)
  pushReason(reasonCodes, 'recent-dismiss-penalty', feedbackBias >= 0.15)
  pushReason(reasonCodes, 'recent-positive-feedback', feedbackBias < 0)
  pushReason(reasonCodes, 'recent-ignored-penalty', proactiveState.consecutiveIgnored[scenario] >= 3)
  pushReason(reasonCodes, 'high-loneliness', context.relationship.loneliness >= 90)
  pushReason(reasonCodes, 'high-boredom', context.relationship.boredom >= 90)
  pushReason(reasonCodes, 'user-idle', context.system.inputActivity === 'idle')
  pushReason(reasonCodes, 'coding-focus', scenario === 'coding')
  pushReason(reasonCodes, 'foreground-error', context.content.kind === 'error')
  pushReason(reasonCodes, 'foreground-diff', context.content.kind === 'diff')
  pushReason(reasonCodes, 'media-playback', scenario === 'media')
  pushReason(reasonCodes, 'late-night-activity', scenario === 'late-night-care' && context.relationship.lateNightActiveMinutes >= 90)
  pushReason(reasonCodes, 'late-night-fatigue', scenario === 'late-night-care' && context.relationship.fatigue >= 55)
  pushReason(reasonCodes, 'reminder-backlog', context.relationship.reminderBacklog > 0)

  const cooldownMs = clampMs(
    buildBaseCooldownMs(scenario) * (proactiveState.consecutiveIgnored[scenario] >= 3 ? 2 : 1),
    60_000,
    45 * 60_000,
  )
  const confidence = suppressBusy || cooldownActive || input.killSwitchSuspended
    ? 0.94
    : clamp01(
        0.45
        + Math.abs(baseScore - threshold) * 1.8
        + (input.perception?.activeAttentionAnchor ? 0.04 : 0)
        + ((input.perception?.recentObservationCount ?? 0) >= 2 ? 0.03 : 0),
      )

  const whyNow = shouldInterrupt
    ? scenario === 'coding'
      ? input.perception?.activeAttentionAnchor
        ? '当前窗口与短时知觉记忆都持续指向 coding 场景，且宿主不在高忙抑制态。'
        : '当前窗口和张力都指向 coding 场景，且宿主不在高忙抑制态。'
      : scenario === 'late-night-care'
        ? '已经进入深夜长时活跃场景，疲劳与在线时长叠加到了可提醒阈值。'
        : scenario === 'media'
          ? '媒体场景已经脱离高侵入态，允许低强度提醒。'
          : '当前张力与关系态达到了轻量主动开口阈值。'
    : cooldownActive
      ? '刚收到负反馈后的冷却窗口仍在生效。'
      : suppressBusy
        ? '宿主仍处于忙碌或高沉浸状态。'
        : style === 'silent-observe'
          ? '当前场景只适合静默观察，不适合打断。'
          : input.perception?.activeAttentionAnchor
            ? '虽然短时知觉还记得宿主刚才的工作对象，但现在还没强到值得立刻插话。'
            : '虽然感知到了信号，但分数还没有高到值得现在插话。'
  const whyNotLater = shouldInterrupt
    ? '继续延后会错过当前语境窗口。'
    : suppressBusy
      ? '等忙碌态解除或退出全屏后再重新评估。'
      : cooldownActive
        ? '至少等冷却结束后再看是否还存在同类信号。'
        : input.perception?.activeAttentionAnchor
          ? '等她再观察到几轮同类工作信号，或者宿主暂时停下来后再决定。'
          : '等张力、场景或交互状态进一步累积后再决定。'

  return {
    shouldInterrupt,
    confidence: Number(confidence.toFixed(2)),
    reasonCodes,
    urgency,
    style,
    cooldownMs,
    scenario,
    policyVersion: proactivePolicyVersion,
    feedbackBias: Number(feedbackBias.toFixed(2)),
    consideredSignals,
    ignoredSignals,
    whyNow,
    whyNotLater,
  }
}
