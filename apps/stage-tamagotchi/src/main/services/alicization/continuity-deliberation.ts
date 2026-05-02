import type { AlicizationRuntimeDigest } from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationDigitalLifeSpineSnapshot } from './digital-life-spine'
import type { AlicizationDialogueSessionMirror } from './dialogue-session-manager'

export type AlicizationContinuityDeliberationKind
  = | 'none'
    | 'memory-follow-up'
    | 'dialogue-carry'
    | 'execution-callback'

export type AlicizationContinuityIntrusionRisk = 'low' | 'medium' | 'high'
export type AlicizationContinuityPayoffDependency = 'memory-only' | 'requires-current-payoff' | 'can-surface-softly'
export type AlicizationContinuityPreferredTiming = 'internal-only' | 'after-payoff' | 'same-turn-if-invited' | 'next-open-window'

export interface AlicizationContinuityDeliberation {
  kind: AlicizationContinuityDeliberationKind
  summary: string | null
  whyNow: string | null
  pressure: number
  intrusionRisk: AlicizationContinuityIntrusionRisk
  payoffDependency: AlicizationContinuityPayoffDependency
  preferredTiming: AlicizationContinuityPreferredTiming
  shouldStayOnThread: boolean
  shouldSpeakNow: boolean
  sourceTags: string[]
}

function clamp01(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value)))
}

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueTextList(values: Array<string | null | undefined>, maxItems = 6) {
  const result: string[] = []
  for (const value of values) {
    const text = sanitizeText(value)
    if (!text || result.some(item => item.toLowerCase() === text.toLowerCase()))
      continue
    result.push(text)
    if (result.length >= maxItems)
      break
  }
  return result
}

function looksExecutionContinuityText(raw: unknown) {
  return /(?:execution|callback|result|listing|remaining|cli|task|thread|执行|回调|结果|清单|剩下|任务)/iu.test(String(raw ?? ''))
}

function deriveKindFromAffordance(input: {
  summary: string | null
  whyNow: string | null
  payoffDependency: AlicizationContinuityPayoffDependency
  speechShouldSurface: boolean
}) {
  if (looksExecutionContinuityText(`${input.summary ?? ''} ${input.whyNow ?? ''}`))
    return 'execution-callback' as const
  if (input.payoffDependency === 'memory-only' || input.speechShouldSurface === false)
    return 'memory-follow-up' as const
  return 'dialogue-carry' as const
}

function deriveAlicizationContinuityDeliberationCore(input: {
  memoryDeliberation: AlicizationDigitalLifeRuntimeSurface['memory']['memoryDeliberation']
  recollectionSpeechPlan: AlicizationDigitalLifeRuntimeSurface['memory']['recollectionSpeechPlan']
  autonomy: AlicizationDigitalLifeRuntimeSurface['agency']['autonomy']
  replyDeliberation: AlicizationDigitalLifeRuntimeSurface['dialogue']['replyDeliberation']
}): AlicizationContinuityDeliberation {
  const deliberation = input.memoryDeliberation ?? null
  const speechPlan = input.recollectionSpeechPlan ?? null
  const autonomy = input.autonomy ?? null
  const replyDeliberation = input.replyDeliberation ?? null

  const affordance = deliberation?.followUpAffordance ?? null
  if (affordance) {
    const kind = deriveKindFromAffordance({
      summary: affordance.summary,
      whyNow: affordance.whyNow,
      payoffDependency: affordance.payoffDependency,
      speechShouldSurface: speechPlan?.shouldSurface === true,
    })
    const pressure = clamp01(
      0.28
      + (affordance.preferredTiming === 'after-payoff' ? 0.18 : affordance.preferredTiming === 'same-turn-if-invited' ? 0.14 : affordance.preferredTiming === 'next-open-window' ? 0.12 : 0.04)
      + (affordance.payoffDependency === 'requires-current-payoff' ? 0.18 : affordance.payoffDependency === 'can-surface-softly' ? 0.12 : 0.06)
      - (affordance.intrusionRisk === 'high' ? 0.12 : affordance.intrusionRisk === 'medium' ? 0.05 : 0),
    )
    return {
      kind,
      summary: affordance.summary,
      whyNow: affordance.whyNow,
      pressure,
      intrusionRisk: affordance.intrusionRisk,
      payoffDependency: affordance.payoffDependency,
      preferredTiming: affordance.preferredTiming,
      shouldStayOnThread: true,
      shouldSpeakNow: kind !== 'memory-follow-up'
        && affordance.preferredTiming !== 'next-open-window'
        && affordance.preferredTiming !== 'internal-only'
        && affordance.intrusionRisk !== 'high',
      sourceTags: uniqueTextList([
        'memory-deliberation',
        `kind:${kind}`,
        `timing:${affordance.preferredTiming}`,
        `intrusion:${affordance.intrusionRisk}`,
      ], 4),
    }
  }

  if (
    autonomy?.executionIntent?.kind === 'follow-through'
    && (autonomy.executionIntent?.summary || autonomy.whyNow)
  ) {
    return {
      kind: 'execution-callback',
      summary: sanitizeText(autonomy.executionIntent?.summary, 180) || sanitizeText(autonomy.whyNow, 180) || null,
      whyNow: sanitizeText(autonomy.whyNow, 220) || null,
      pressure: clamp01((autonomy.actReadiness ?? 0) * 0.46 + (autonomy.confidence ?? 0) * 0.34 + 0.1),
      intrusionRisk: autonomy.shouldSpeak === false ? 'medium' : 'low',
      payoffDependency: 'requires-current-payoff',
      preferredTiming: autonomy.shouldSpeak === false ? 'after-payoff' : 'same-turn-if-invited',
      shouldStayOnThread: true,
      shouldSpeakNow: autonomy.shouldSpeak === true,
      sourceTags: ['autonomy-follow-through', 'kind:execution-callback'],
    }
  }

  if (
    replyDeliberation?.memoryMode === 'dialogue-carry'
    || replyDeliberation?.speakingFrom === 'held-memory'
  ) {
    return {
      kind: 'dialogue-carry',
      summary: sanitizeText(replyDeliberation.whyThisReplyNow, 180) || sanitizeText(replyDeliberation.openingBeat, 180) || null,
      whyNow: sanitizeText(replyDeliberation.whyThisReplyNow, 220) || null,
      pressure: clamp01((replyDeliberation.confidence ?? 0.5) * 0.58 + 0.12),
      intrusionRisk: 'medium',
      payoffDependency: 'can-surface-softly',
      preferredTiming: 'same-turn-if-invited',
      shouldStayOnThread: true,
      shouldSpeakNow: replyDeliberation.shouldSpeak === true,
      sourceTags: ['reply-deliberation', 'kind:dialogue-carry'],
    }
  }

  return {
    kind: 'none',
    summary: null,
    whyNow: null,
    pressure: 0,
    intrusionRisk: 'high',
    payoffDependency: 'memory-only',
    preferredTiming: 'internal-only',
    shouldStayOnThread: false,
    shouldSpeakNow: false,
    sourceTags: [],
  }
}

export function deriveAlicizationContinuityDeliberationFromSurface(
  surface: AlicizationDigitalLifeRuntimeSurface,
): AlicizationContinuityDeliberation {
  return deriveAlicizationContinuityDeliberationCore({
    memoryDeliberation: surface.memory.memoryDeliberation ?? null,
    recollectionSpeechPlan: surface.memory.recollectionSpeechPlan ?? null,
    autonomy: surface.agency.autonomy ?? null,
    replyDeliberation: surface.dialogue.replyDeliberation ?? null,
  })
}

export function deriveAlicizationContinuityDeliberationFromSpine(
  spine: AlicizationDigitalLifeSpineSnapshot,
): AlicizationContinuityDeliberation {
  return deriveAlicizationContinuityDeliberationFromSurface(spine.runtimeSurface)
}

export function deriveAlicizationContinuityDeliberationForFastPath(input: {
  runtimeDigest?: AlicizationRuntimeDigest | null
  continuityAnchor: string
  preparedExecutionCarryText: string
  latestUserText: string
  previousUserText: string
  previousAssistantText: string
  sessionMirror: AlicizationDialogueSessionMirror | null
  shortTurn: boolean
  hasContinuity: boolean
}): AlicizationContinuityDeliberation {
  const executionMirror = sanitizeText(input.sessionMirror?.executionSummary, 180)
  const dialogueMirror = sanitizeText(input.sessionMirror?.dialogueSummary, 180)
  const executionSource = uniqueTextList([
    input.preparedExecutionCarryText,
    executionMirror,
    input.continuityAnchor,
    input.previousAssistantText,
  ], 4).join(' | ')
  if (input.shortTurn && input.hasContinuity && looksExecutionContinuityText(executionSource)) {
    return {
      kind: 'execution-callback',
      summary: sanitizeText(executionSource, 180) || null,
      whyNow: sanitizeText(input.continuityAnchor || executionMirror || input.previousAssistantText, 220) || null,
      pressure: clamp01(Math.max(input.runtimeDigest?.continuityPressure ?? 0, input.runtimeDigest?.returnPressure ?? 0, 0.62)),
      intrusionRisk: 'medium' as const,
      payoffDependency: 'requires-current-payoff' as const,
      preferredTiming: 'same-turn-if-invited' as const,
      shouldStayOnThread: true,
      shouldSpeakNow: true,
      sourceTags: ['execution-carry', 'runtime-digest'],
    } satisfies AlicizationContinuityDeliberation
  }

  if (input.shortTurn && input.hasContinuity && (input.runtimeDigest?.continuityPressure ?? 0) >= 0.62) {
    return {
      kind: 'dialogue-carry',
      summary: sanitizeText(dialogueMirror || input.continuityAnchor || input.previousUserText, 180) || null,
      whyNow: sanitizeText(input.continuityAnchor || dialogueMirror || input.previousAssistantText, 220) || null,
      pressure: clamp01(input.runtimeDigest?.continuityPressure ?? 0),
      intrusionRisk: 'medium',
      payoffDependency: 'can-surface-softly',
      preferredTiming: 'same-turn-if-invited',
      shouldStayOnThread: true,
      shouldSpeakNow: true,
      sourceTags: ['dialogue-carry', 'runtime-digest'],
    }
  }

  return {
    kind: 'none',
    summary: null,
    whyNow: null,
    pressure: 0,
    intrusionRisk: 'high',
    payoffDependency: 'memory-only',
    preferredTiming: 'internal-only',
    shouldStayOnThread: false,
    shouldSpeakNow: false,
    sourceTags: [],
  } satisfies AlicizationContinuityDeliberation
}
