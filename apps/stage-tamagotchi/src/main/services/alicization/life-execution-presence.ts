import type { AlicizationActivityPresence } from '@proj-alicization/stage-shared'

import type { AlicizationPresencePulsePayload, AlicizationTaskThreadRecord } from '../../../shared/eventa'
import type { LifeTaskOutcome } from './life-task-outcome'

import { createPiEventStream } from './third-party/pi-event-stream'

export function resolveLifeExecutionPresencePhase(thread: AlicizationTaskThreadRecord, outcome: LifeTaskOutcome): AlicizationActivityPresence['phase'] {
  if (thread.status === 'cancelled' || outcome?.status === 'cancelled' || outcome?.invalidated)
    return 'interrupted'
  if (thread.status === 'failed' || thread.status === 'dead-lettered')
    return 'failed'
  if (['blocked', 'needs-affirmation', 'paused'].includes(thread.status) || outcome?.status === 'blocked' || outcome?.verdict === 'not-satisfied')
    return 'blocked'
  if (thread.status === 'completed') {
    return outcome?.status === 'fulfilled' && outcome.verdict === 'satisfied' && outcome.independent && outcome.verificationId
      ? 'finished'
      : 'verifying'
  }
  return thread.status === 'running' ? 'working' : 'orienting'
}

/** Observes committed task state; it never executes tools or writes personhood. */
export function createLifeExecutionPresenceObserver(options: {
  cardId: string
  threadId: string
  attemptId: string | null
  enabled: () => boolean
  read: () => Promise<{ thread: AlicizationTaskThreadRecord | null | undefined, outcome: LifeTaskOutcome }>
  publish: (payload: AlicizationPresencePulsePayload) => void
  onError: (error: unknown) => void
  onHeld?: (reason: 'inactive-scope' | 'stale-attempt' | 'missing-thread') => void
  now: () => number
}) {
  const stream = createPiEventStream<{ settle?: () => void }>(4)
  let refreshPending = false
  let disposed = false
  let previousPhase: AlicizationActivityPresence['phase'] | null = null
  let phaseStartedAt = 0
  let sequence = 0
  const consumer = (async () => {
    for await (const command of stream) {
      refreshPending = false
      try {
        if (disposed)
          continue
        if (!options.enabled()) {
          options.onHeld?.('inactive-scope')
          continue
        }
        const { thread, outcome } = await options.read()
        if (disposed)
          continue
        const held = !options.enabled() ? 'inactive-scope' : !thread ? 'missing-thread' : thread.id !== options.threadId || (thread.attemptId ?? null) !== options.attemptId ? 'stale-attempt' : null
        if (held) {
          options.onHeld?.(held)
          continue
        }
        if (!thread)
          continue
        const phase = resolveLifeExecutionPresencePhase(thread, outcome)
        const now = Math.max(options.now(), phaseStartedAt)
        if (phase !== previousPhase) {
          phaseStartedAt = now
          previousPhase = phase
          sequence += 1
        }
        const terminal = ['finished', 'interrupted', 'failed'].includes(phase)
        options.publish({
          cardId: options.cardId,
          watchMode: 'mnemonic-passive',
          embodiedPresence: phase === 'blocked' || phase === 'failed' ? 'concerned' : phase === 'verifying' ? 'hesitant' : 'attentive',
          scenario: 'coding',
          stance: 'accompany',
          confidence: 1,
          reasonTags: ['committed-execution', `execution:${phase}`],
          expiresAt: now + (terminal ? 6000 : 20_000),
          activity: { id: options.threadId, attemptId: options.attemptId ?? '', kind: thread.metadata?.personalActivity ? 'personal-project' : 'execution', phase, phaseStartedAt, observedAt: now, sequence },
        })
      }
      catch (error) {
        try {
          options.onError(error)
        }
        catch {
          // Presentation diagnostics cannot reject the executor.
        }
      }
      finally {
        command.settle?.()
      }
    }
  })()
  function refresh() {
    if (!disposed && !refreshPending)
      refreshPending = stream.push({})
  }
  // Keep an actual running attempt visible without replaying its phase gesture.
  const heartbeat = setInterval(() => {
    if (previousPhase && !['finished', 'interrupted', 'failed', 'blocked'].includes(previousPhase))
      refresh()
  }, 8000)
  heartbeat.unref?.()
  async function flush() {
    if (!disposed) {
      await new Promise<void>((resolve) => {
        if (!stream.push({ settle: resolve }))
          resolve()
      })
    }
  }
  return {
    refresh,
    flush,
    async finish() {
      clearInterval(heartbeat)
      await flush()
      disposed = true
      stream.end()
      await consumer
    },
  }
}
