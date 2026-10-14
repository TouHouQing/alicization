import type { AlicizationPresencePulsePayload } from '../../../shared/eventa'
import type { LifeCommitInput, LifeCommitReceipt, LifeStateView } from '../../../shared/life-contracts'

import { createHash } from 'node:crypto'

import { readLifeBodyActivities } from './life-body-activity-runtime'

export interface LifeDailyActivity {
  id: string
  kind: 'rest' | 'stretch'
  phase: 'working' | 'finished' | 'interrupted'
  startedAt: number
  dueAt: number
  observedAt: number
  inputId: string | null
  sequence: number
  reason: string
  bodyVerified?: boolean
  posture?: 'sit' | 'lie' | 'sleep'
  needsEffect?: import('./life-daily-needs').LifeDailyNeedsEffect
}

interface DailyRhythm {
  current: LifeDailyActivity | null
  history: LifeDailyActivity[]
}

export function readLifeDailyRhythm(values: LifeStateView['values']): DailyRhythm {
  const initiative = values['life:initiative'] ? JSON.parse(values['life:initiative']) : {}
  return initiative.dailyRhythm ?? { current: null, history: [] }
}

/** Actual quiet runtime intervals and body intentions, not invented experiences. */
export function createLifeDailyActivityRuntime(options: {
  read: () => Promise<LifeStateView>
  commit: (input: LifeCommitInput, options?: { signal?: AbortSignal }) => Promise<LifeCommitReceipt>
  publish: (input: AlicizationPresencePulsePayload) => void
  recordExperience?: (cardId: string, activity: LifeDailyActivity) => Promise<void>
}) {
  return async (input: { cardId: string, now: number, needs: { boredom: number, fatigue: number, appliedDailyNeedsEffects?: string[] }, suspended: boolean, foregroundActive: boolean, fullscreen: boolean }, signal?: AbortSignal) => {
    signal?.throwIfAborted()
    const view = await options.read()
    if (view.cardId !== input.cardId)
      throw new Error('Daily activity crossed the card boundary')
    const raw = view.values['life:initiative'] ?? null
    const budget = raw ? JSON.parse(raw) : {}
    const rhythm = readLifeDailyRhythm(view.values)
    const now = Math.max(input.now, rhythm.current?.observedAt ?? 0, Number(budget.observedAt) || 0)
    const inputId = view.ingress.find(item => item.kind === 'user-turn')?.id ?? null
    const held = input.suspended || input.foregroundActive || input.fullscreen || view.effects.some(effect => effect.status === 'dispatched' || effect.status === 'claimed')
    let next = rhythm.current
    if (next?.phase === 'working') {
      const completedBody = next.kind === 'stretch' && readLifeBodyActivities(view).find(item => item.activityId === next!.id && item.state === 'completed')
      if (completedBody) {
        next = { ...next, phase: 'finished', observedAt: now, sequence: 2, reason: 'rendered-body-completed', bodyVerified: true, needsEffect: { id: next.id, fatigueRelief: 3 } }
      }
      else if (held || next.inputId !== inputId) {
        next = { ...next, phase: 'interrupted', observedAt: now, sequence: 2, reason: 'host-or-policy-preemption' }
      }
      else if (now - next.dueAt > 120_000) {
        next = { ...next, phase: 'interrupted', observedAt: now, sequence: 2, reason: 'unobserved-runtime-gap' }
      }
      else if (next.kind === 'stretch') {
        const receipt = readLifeBodyActivities(view).find(item => item.activityId === next!.id && item.state !== 'started')
        if (receipt || now >= next.startedAt + 90_000) {
          next = { ...next, phase: 'interrupted', observedAt: now, sequence: 2, reason: receipt ? `body-${receipt.state}` : 'body-receipt-timeout', bodyVerified: false }
        }
      }
      else if (now >= next.dueAt) {
        next = { ...next, phase: 'finished', observedAt: now, sequence: 2 }
        next.needsEffect = { id: next.id, fatigueRelief: 12 }
      }
    }
    else if (!held) {
      const recent = rhythm.history.filter(item => now - item.observedAt < 60 * 60_000)
      const completed = recent.filter(item => item.phase === 'finished')
      const kind = input.needs.fatigue >= 30 ? 'rest' : input.needs.boredom >= 10 || input.needs.fatigue >= 12 ? 'stretch' : null
      const previousAttempt = recent.filter(item => item.kind === kind).at(-1)
      const retryInterrupted = previousAttempt?.phase === 'interrupted' && ['host-or-policy-preemption', 'body-interrupted'].includes(previousAttempt.reason) && now - previousAttempt.observedAt >= 60_000
      // A preempted intention earned no benefit. Permit a quiet retry, bounded
      // to three attempts and two completed activities per hour; unsupported
      // bodies and unobserved gaps retain their cooldown.
      if (kind && recent.length < 3 && completed.length < 2 && !completed.some(item => item.kind === kind) && (!previousAttempt || retryInterrupted)) {
        const id = createHash('sha256').update(JSON.stringify({ cardId: input.cardId, now, kind, inputId })).digest('hex')
        next = { id: `daily:${id}`, kind, phase: 'working', startedAt: now, dueAt: now + (kind === 'rest' ? 180_000 : 12_000), observedAt: now, inputId, sequence: 1, reason: kind === 'rest' ? 'fatigue-rest-window' : 'low-activity-body-break', ...(kind === 'rest' ? { posture: input.needs.fatigue >= 85 ? 'sleep' as const : input.needs.fatigue >= 70 ? 'lie' as const : 'sit' as const } : {}) }
      }
    }
    const changed = next && JSON.stringify(next) !== JSON.stringify(rhythm.current)
    if (next && changed) {
      const history = next.phase === 'working' ? rhythm.history : [...rhythm.history, next].slice(-16)
      const ingressId = `daily-activity:${next.id}:${next.sequence}`
      await options.commit({ cardId: input.cardId, operationKey: ingressId, changes: [{ owner: 'initiative', key: 'life:initiative', expectedValue: raw, value: JSON.stringify({ ...budget, dailyRhythm: { current: next, history } }) }], mutations: [{ type: 'ingress-accept', ingress: { id: ingressId, kind: 'system', source: 'daily-activity', sourceKey: ingressId, occurredAt: now, payload: { ...next, bodyIntentOnly: next.kind === 'stretch' && !next.bodyVerified, bodyVerified: next.bodyVerified === true, runtimeQuietWindow: next.kind === 'rest' && next.phase === 'finished' } } }, { type: 'ingress-settle', id: ingressId, status: 'settled' }] }, { signal })
    }
    if (next && !input.suspended && (changed || next.phase === 'working')) {
      options.publish({ cardId: input.cardId, watchMode: 'mnemonic-passive', embodiedPresence: next.kind === 'rest' ? 'concerned' : 'attentive', stance: 'accompany', scenario: 'general', confidence: 1, reasonTags: ['committed-daily-activity', next.reason], expiresAt: now + (next.phase === 'working' ? Math.min(65_000, Math.max(1000, (next.kind === 'stretch' ? next.startedAt + 90000 : next.dueAt) - now)) : 20_000), activity: { id: next.id, attemptId: '', kind: 'daily-life', behavior: next.kind, ...(next.posture ? { posture: next.posture } : {}), phase: next.phase, phaseStartedAt: next.sequence === 1 ? next.startedAt : next.observedAt, observedAt: now, sequence: next.sequence } })
    }
    if (next?.phase === 'finished' && next.bodyVerified)
      await options.recordExperience?.(input.cardId, next)
    const needsEffects = input.suspended || input.foregroundActive ? [] : [...new Map([...rhythm.history, ...(next ? [next] : [])].filter(activity => activity.phase === 'finished' && activity.needsEffect && !input.needs.appliedDailyNeedsEffects?.includes(activity.needsEffect.id)).map(activity => [activity.id, activity.needsEffect!])).values()]
    return { holding: next?.kind === 'rest' && next.phase === 'working', fatigueRelief: needsEffects.reduce((sum, effect) => sum + effect.fatigueRelief, 0), needsEffects, activity: next }
  }
}
