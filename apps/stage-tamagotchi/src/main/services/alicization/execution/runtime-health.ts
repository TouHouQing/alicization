export interface ExecutionRuntimeHealth {
  available: boolean
  ready: boolean
  reason: string | null
  observedAt: number
}

/** Coalesce bounded probes without starting another worker after a timeout. */
export function createExecutionHealthProbe(input: {
  probe: () => Promise<Omit<ExecutionRuntimeHealth, 'observedAt'>>
  failureReason: string
  timeoutMs?: number
  ttlMs?: number
  now?: () => number
}) {
  const now = input.now ?? Date.now
  let cached: ExecutionRuntimeHealth | null = null
  let pending: Promise<ExecutionRuntimeHealth> | null = null
  let running = false
  return async (): Promise<ExecutionRuntimeHealth> => {
    if (pending)
      return pending
    if (cached && (running || now() - cached.observedAt < (input.ttlMs ?? 15_000)))
      return { ...cached }
    running = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const work = Promise.resolve().then(input.probe).finally(() => { running = false })
    pending = Promise.race([
      work,
      new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('HEALTH_PROBE_TIMEOUT')), input.timeoutMs ?? 5000) }),
    ]).then(result => ({ ...result, observedAt: now() }), () => ({ available: true, ready: false, reason: input.failureReason, observedAt: now() })).then((result) => {
      cached = result
      return { ...result }
    }).finally(() => { clearTimeout(timer); pending = null })
    return pending
  }
}
