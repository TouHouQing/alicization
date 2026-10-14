import type { AlicizationActivityPresence } from '@proj-alicization/stage-shared'

import type { AlicizationPresencePulsePayload } from '../../stores/alicization-bridge'

import { readonly, shallowRef } from 'vue'

const phases = new Set(['orienting', 'working', 'verifying', 'blocked', 'finished', 'interrupted', 'failed'])
const terminal = (phase: string) => ['finished', 'interrupted', 'failed'].includes(phase)

/** A visible result badge is not an ongoing action that owns the body. */
export function stageActivityNeedsBodyFocus(activity: AlicizationActivityPresence | null | undefined) {
  return Boolean(activity && ['orienting', 'working', 'verifying'].includes(activity.phase))
}

/** Ephemeral presentation only; task/goal authority stays in the desktop DB. */
export function useStageActivityPresence(now: () => number = Date.now) {
  const activity = shallowRef<AlicizationActivityPresence | null>(null)
  const armed = new Map<string, string>()
  let expiry: ReturnType<typeof setTimeout> | undefined
  let expiresAt = 0
  function clear() {
    clearTimeout(expiry)
    expiry = undefined
    activity.value = null
    expiresAt = 0
    armed.clear()
  }
  function accept(payload: AlicizationPresencePulsePayload) {
    const candidate = payload.activity
    if (!candidate)
      return true
    if (!candidate.id || typeof candidate.attemptId !== 'string' || !phases.has(candidate.phase) || !['execution', 'personal-project', 'daily-life'].includes(candidate.kind)
      || (candidate.kind === 'daily-life' && !['rest', 'stretch'].includes(candidate.behavior ?? ''))
      || (candidate.posture != null && !['stand', 'sit', 'lie', 'sleep', 'work'].includes(candidate.posture))
      || !Number.isSafeInteger(candidate.sequence) || candidate.sequence < 1 || !Number.isFinite(candidate.observedAt)
      || !Number.isFinite(candidate.phaseStartedAt) || candidate.phaseStartedAt > candidate.observedAt
      || !Number.isFinite(payload.expiresAt) || payload.expiresAt <= now() || payload.expiresAt - now() > (candidate.kind === 'daily-life' && candidate.phase === 'working' ? 65_000 : 25_000)) {
      return false
    }
    const current = activity.value
    if (current?.id === candidate.id && (current.attemptId !== candidate.attemptId ? candidate.observedAt < current.observedAt : candidate.sequence < current.sequence || candidate.observedAt < current.observedAt))
      return false
    if (current?.kind === 'execution' && !terminal(current.phase) && expiresAt > now() && candidate.kind !== 'execution')
      return false
    activity.value = { ...candidate }
    expiresAt = payload.expiresAt
    clearTimeout(expiry)
    expiry = setTimeout(clear, expiresAt - now())
    return true
  }
  function shouldAnimate(channel: string, payload: AlicizationPresencePulsePayload) {
    if (!payload.activity)
      return !activity.value || terminal(activity.value.phase)
    const current = activity.value
    if (!current || current.id !== payload.activity.id || current.attemptId !== payload.activity.attemptId || current.sequence !== payload.activity.sequence)
      return false
    const key = `${current.id}:${current.attemptId}:${current.sequence}:${current.phase}`
    if (armed.get(channel) === key)
      return false
    armed.set(channel, key)
    return true
  }
  return { activity: readonly(activity), accept, shouldAnimate, clear }
}
