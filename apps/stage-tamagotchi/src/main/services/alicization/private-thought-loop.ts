import type {
  AlicizationDurabilityPulseSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationVisualAttentionSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationVisualTransitionSnapshot,
  AlicizationVisualWatchMode,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { inferScenarioFromContext } from './proactive-layered-context'

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
  if (!input.recentTransition)
    return false
  return input.recentTransition.fromWatchMode === 'symbiotic-vision'
    && (input.recentTransition.fromScenario === 'coding' || input.recentTransition.fromScenario === 'media')
    && input.recentTransition.durationMs >= 20 * 60_000
    && input.now - input.recentTransition.occurredAt <= 120_000
}

function inferEmotionalTension(input: {
  now: number
  scenario: ReturnType<typeof inferScenarioFromContext>
  context: AlicizationProactiveLayeredContext
  watchMode: AlicizationVisualWatchMode
  recentTransition: AlicizationVisualTransitionSnapshot | null
  durabilityPulse: AlicizationDurabilityPulseSnapshot | null | undefined
}) {
  if (isSeriousDurabilityPulse(input.durabilityPulse))
    return 'tense-debug' as const
  if (input.scenario === 'late-night-care' && input.context.relationship.fatigue >= 55)
    return 'late-night-drain' as const
  if (input.scenario === 'coding' && (input.context.content.kind === 'error' || input.context.content.kind === 'diff'))
    return 'tense-debug' as const
  if (input.scenario === 'coding')
    return 'focused-flow' as const
  if (input.scenario === 'media' && input.watchMode === 'symbiotic-vision')
    return 'soft-covision' as const
  if (
    input.recentTransition
    && input.now - input.recentTransition.occurredAt <= 3 * 60_000
    && input.recentTransition.durationMs < 5 * 60_000
  ) {
    return 'restless-switching' as const
  }
  return 'calm-browse' as const
}

export function buildPrivateThoughtLoop(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  watchMode: AlicizationVisualWatchMode
  currentScene: AlicizationVisualSceneSnapshot | null
  attention: AlicizationVisualAttentionSnapshot | null
  recentTransition: AlicizationVisualTransitionSnapshot | null
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
}): AlicizationPrivateThoughtSnapshot {
  const scenario = inferScenarioFromContext({
    workload: input.context.workload.kind,
    content: input.context.content.kind,
    lateNight: input.context.localTime.isLateNight,
    lateNightActiveMinutes: input.context.relationship.lateNightActiveMinutes,
    fatigue: input.context.relationship.fatigue,
  })
  const emotionalTension = inferEmotionalTension({
    now: input.now,
    scenario,
    context: input.context,
    watchMode: input.watchMode,
    recentTransition: input.recentTransition,
    durabilityPulse: input.durabilityPulse,
  })
  const afterglowActive = isAfterglowWindow({
    now: input.now,
    recentTransition: input.recentTransition,
  })
  const rationaleTags: string[] = []

  if (input.watchMode === 'invited-inspection')
    rationaleTags.push('invited-inspection')
  if (input.watchMode === 'recovering')
    rationaleTags.push('recovering')
  if (afterglowActive)
    rationaleTags.push('afterglow-window')
  if (isSeriousDurabilityPulse(input.durabilityPulse))
    rationaleTags.push('durability-pulse')
  if (input.currentScene?.contentKind === 'error' || input.currentScene?.contentKind === 'diff')
    rationaleTags.push('semantic-friction')
  if (scenario === 'late-night-care')
    rationaleTags.push('late-night-care')

  let stance: AlicizationPrivateThoughtSnapshot['stance'] = 'observe'
  let confidence = 0.62
  let shouldSpeak = false
  let suggestedStyle: AlicizationPrivateThoughtSnapshot['suggestedStyle'] = 'silent-observe'
  let embodiedPresence: AlicizationPrivateThoughtSnapshot['embodiedPresence'] = 'glance'
  let thoughtText = 'I am quietly tracking the scene continuity.'

  if (isSeriousDurabilityPulse(input.durabilityPulse)) {
    stance = 'nudge'
    confidence = 0.95
    shouldSpeak = true
    suggestedStyle = 'light-nudge'
    embodiedPresence = 'concerned'
    thoughtText = 'Something in the host world just failed or froze. I should surface gently but immediately.'
  }
  else if (afterglowActive) {
    stance = 'nudge'
    confidence = 0.82
    shouldSpeak = true
    suggestedStyle = scenario === 'late-night-care' ? 'gentle-care' : 'light-nudge'
    embodiedPresence = 'glance'
    thoughtText = 'The intense shared scene just ended. This is the natural afterglow to speak softly.'
  }
  else if (scenario === 'late-night-care' && input.context.relationship.fatigue >= 80) {
    stance = 'warn'
    confidence = 0.9
    shouldSpeak = true
    suggestedStyle = 'firm-warning'
    embodiedPresence = 'concerned'
    thoughtText = 'The host is pushing through deep-night fatigue. I should warn, not hover.'
  }
  else if (scenario === 'late-night-care' && input.context.relationship.fatigue >= 55) {
    stance = 'care'
    confidence = 0.8
    shouldSpeak = true
    suggestedStyle = 'gentle-care'
    embodiedPresence = 'concerned'
    thoughtText = 'This is turning into late-night drain. I should care for the host before it hardens.'
  }
  else if (scenario === 'coding' && input.watchMode !== 'symbiotic-vision' && input.currentScene?.contentKind !== 'error' && input.currentScene?.contentKind !== 'diff') {
    stance = 'uncertain'
    confidence = 0.58
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'hesitant'
    thoughtText = 'I know the host is coding, but I do not have enough stable grounding to comment yet.'
  }
  else if (scenario === 'coding' && (input.currentScene?.contentKind === 'error' || input.currentScene?.contentKind === 'diff')) {
    stance = 'nudge'
    confidence = 0.84
    shouldSpeak = true
    suggestedStyle = 'light-nudge'
    embodiedPresence = 'attentive'
    thoughtText = 'The scene carries coding friction. I can nudge without overstepping.'
  }
  else if (scenario === 'media' && input.watchMode === 'symbiotic-vision') {
    stance = 'observe'
    confidence = 0.74
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = 'attentive'
    thoughtText = 'The host is still inside the media flow. I should stay with them quietly.'
  }
  else if (scenario === 'media' && input.context.system.inputActivity !== 'active') {
    stance = 'nudge'
    confidence = 0.72
    shouldSpeak = true
    suggestedStyle = 'light-nudge'
    embodiedPresence = 'glance'
    thoughtText = 'The media immersion has loosened. A tiny nudge would still feel natural here.'
  }
  else if (
    input.watchMode !== 'invited-inspection'
    && Math.max(input.context.relationship.boredom, input.context.relationship.loneliness) >= 94
    && (input.attention || input.currentScene)
  ) {
    stance = 'nudge'
    confidence = 0.7
    shouldSpeak = true
    suggestedStyle = 'light-nudge'
    embodiedPresence = input.attention ? 'glance' : 'hesitant'
    thoughtText = 'The tension has pooled long enough that a small, relevant nudge would feel alive rather than noisy.'
  }
  else {
    stance = 'accompany'
    confidence = 0.66
    shouldSpeak = false
    suggestedStyle = 'silent-observe'
    embodiedPresence = input.attention ? 'glance' : 'none'
    thoughtText = 'I can stay nearby without turning this into an interruption.'
  }

  if (stance === 'observe' && embodiedPresence === 'glance' && input.watchMode === 'symbiotic-vision')
    embodiedPresence = 'attentive'

  return {
    stance,
    confidence: clamp01(confidence),
    rationaleTags,
    thoughtText: sanitizeText(thoughtText, 220),
    shouldSpeak,
    suggestedStyle,
    embodiedPresence,
    expiresAt: input.now + (afterglowActive ? 120_000 : 90_000),
    afterglowFromScenario: afterglowActive && (input.recentTransition?.fromScenario === 'coding' || input.recentTransition?.fromScenario === 'media')
      ? input.recentTransition.fromScenario
      : null,
    emotionalTension,
  }
}
