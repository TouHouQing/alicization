import type { ExecutionResourceBroker, ResourceLease } from './resource-broker'

export function createForegroundBroker(broker: ExecutionResourceBroker, input: { readTarget: () => Promise<{ desktop: string, windowId: string, processId: number, fingerprint: string }>, releaseOwnedInput: () => Promise<boolean> }) {
  let active: { lease: ResourceLease, targetHash: string, ownsLease: boolean } | null = null
  let takeover = false
  let acquiring = false
  let releasing: Promise<{ stopped: boolean, state: string }> | null = null
  const fingerprint = (target: Awaited<ReturnType<typeof input.readTarget>>) => JSON.stringify(target)
  async function acquire(owner: string, expected: Awaited<ReturnType<typeof input.readTarget>>, admittedLease?: ResourceLease) {
    if (takeover || active || acquiring)
      throw new Error('Foreground input was taken over by the user')
    acquiring = true
    try {
      const target = await input.readTarget()
      if (takeover || fingerprint(target) !== fingerprint(expected))
        throw new Error('Foreground input target changed')
      let admitted: ResourceLease | undefined
      if (admittedLease) {
        broker.assert(admittedLease)
        // The caller's lease copy cannot widen the broker's actual resource.
        admitted = broker.snapshot().find(lease => lease.id === admittedLease.id)
        if (!admitted || admitted.owner !== owner || !admitted.resources.some(resource => ['host:execution', 'physical-input:desktop', `physical-input:${target.desktop}`].includes(resource)))
          throw new Error('Foreground input needs the admitted action resource owner')
        broker.assert(admitted)
      }
      const lease = admitted ?? broker.acquire({ owner, resources: [`physical-input:${target.desktop}`], ttlMs: 15_000 })
      active = { lease, targetHash: fingerprint(target), ownsLease: !admittedLease }
      return lease
    }
    finally { acquiring = false }
  }
  async function beforeInjection(lease: ResourceLease) {
    if (takeover || releasing || active?.lease.id !== lease.id)
      throw new Error('Foreground input owner is stopping or changed')
    broker.assert(lease)
    const target = await input.readTarget()
    broker.assert(lease)
    if (takeover || releasing || active?.lease.id !== lease.id || active.targetHash !== fingerprint(target))
      throw new Error('Foreground input target or ownership changed')
  }
  async function release(lease: ResourceLease) {
    if (active?.lease.id !== lease.id)
      throw new Error('Cannot release another foreground input owner')
    if (releasing)
      return releasing
    const current = active
    // Publish the stopping gate before invoking cleanup, including callbacks
    // which reenter this owner. Only a confirmed release settles its lease.
    releasing = Promise.resolve().then(async () => {
      let stopped = false
      try { stopped = await input.releaseOwnedInput() }
      catch { /* Failed cleanup keeps the physical-input resource quarantined. */ }
      // An enclosing effect retains its lease until its own durable settlement.
      // Unconfirmed native release must quarantine that same owner immediately.
      if (current.ownsLease || !stopped)
        broker.settle(current.lease, { stopped, uncertain: !stopped })
      if (stopped)
        active = null
      return { stopped, state: stopped ? 'stopped' : 'awaiting-input-release' }
    }).finally(() => { releasing = null })
    return releasing
  }
  async function takeOver() {
    takeover = true
    return active ? release(active.lease) : { stopped: true, state: 'stopped' }
  }
  return { acquire, beforeInjection, release, takeOver, resume: () => {
    if (active || acquiring)
      throw new Error('Old foreground writer has not stopped'); takeover = false
  } }
}
