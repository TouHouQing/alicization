import type { LifeCommitInput, LifeCommitReceipt, LifeStateView } from '../../../shared/life-contracts'

import { createHash, randomUUID } from 'node:crypto'

import { pendingLifePersonalProposal } from './life-personal-proposals'

export interface LifeAgencyBudget {
  version: 1
  observedAt: number
  windowStart: number
  cycles: number
  recentEvidence: string[]
  // Project cadence can be committed before the first attention decision.
  lastDecision?: { kind: 'allow' | 'hold', reason: string, evidenceKey: string, at: number }
  pendingPersonalSeries?: string | null
  nextPersonalProjectAt?: number | null
}

export function lifeInternalDriveEvidence(needs?: { boredom: number, loneliness: number, fatigue: number }) {
  // Quantized transitions create evidence; an unchanged need does not cause a
  // timer to spend another cognition budget or contact the host.
  const bucket = (value: number) => Math.floor(Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)) / 10)
  return needs ? [bucket(needs.boredom), bucket(needs.loneliness), bucket(needs.fatigue)] : null
}

export function decideLifeAgency(input: { previous: LifeAgencyBudget | null, now: number, evidenceKey: string, force: boolean, foregroundActive: boolean, suspended: boolean, cpuUsage: number, fullscreen: boolean, maximumCycles?: number }) {
  const now = Math.max(input.now, input.previous?.observedAt ?? 0)
  const reset = !input.previous || !Number.isFinite(input.previous.windowStart) || now - input.previous.windowStart >= 60 * 60_000
  const cycles = reset ? 0 : input.previous!.cycles
  const recentEvidence = input.previous?.recentEvidence ?? []
  const reason = input.suspended
    ? 'suspended'
    : input.foregroundActive
      ? 'foreground-priority'
      : input.cpuUsage >= 80
        ? 'resource-pressure'
        : input.fullscreen && !input.force
          ? 'fullscreen'
          : cycles >= (input.maximumCycles ?? 20)
            ? 'cycle-budget-exhausted'
            : !input.force && recentEvidence.includes(input.evidenceKey)
                ? 'no-new-evidence'
                : 'new-evidence'
  const allowed = reason === 'new-evidence'
  const next: LifeAgencyBudget = { ...input.previous, version: 1, observedAt: now, windowStart: reset ? now : input.previous!.windowStart, cycles: cycles + (allowed ? 1 : 0), recentEvidence: allowed ? [...recentEvidence.filter(key => key !== input.evidenceKey), input.evidenceKey].slice(-64) : recentEvidence, lastDecision: { kind: allowed ? 'allow' : 'hold', reason, evidenceKey: input.evidenceKey, at: now } }
  return { allowed, reason, next }
}

export function createLifeAgencyRuntime(options: { read: () => Promise<LifeStateView>, commit: (input: LifeCommitInput, options?: { signal?: AbortSignal }) => Promise<LifeCommitReceipt>, foregroundActive: () => boolean }) {
  async function reserve(input: { cardId: string, now: number, force: boolean, suspended: boolean, cpuUsage: number, fullscreen: boolean, foreground: unknown, needs?: { boredom: number, loneliness: number, fatigue: number } }, signal?: AbortSignal) {
    const view = await options.read()
    if (view.cardId !== input.cardId)
      throw new Error('Initiative arbitration crossed the card boundary')
    const key = 'life:initiative'
    const previousRaw = view.values[key] ?? null
    const previous = previousRaw ? JSON.parse(previousRaw) as LifeAgencyBudget : null
    const dueProject = previous?.pendingPersonalSeries && Number.isFinite(previous.nextPersonalProjectAt) && Math.max(input.now, previous.observedAt ?? 0) >= Number(previous.nextPersonalProjectAt)
      ? { id: previous.pendingPersonalSeries, dueAt: previous.nextPersonalProjectAt }
      : null
    const evidence = { personalProposal: pendingLifePersonalProposal(view, input.now)?.id ?? null, internalDrive: lifeInternalDriveEvidence(input.needs), owners: view.owners.filter(owner => ['soul', 'memory'].includes(owner.owner)), responsibilities: view.obligations.filter(item => !['cancelled', 'superseded', 'fulfilled'].includes(item.status)).map(item => ({ id: item.id, generation: item.generation, status: item.status })), dueProject, latestInput: view.ingress.find(item => ['user-turn', 'feedback', 'tool-result'].includes(item.kind))?.id ?? null, foreground: input.foreground }
    const evidenceKey = createHash('sha256').update(JSON.stringify(evidence)).digest('hex')
    const decision = decideLifeAgency({ ...input, previous, evidenceKey, foregroundActive: options.foregroundActive() })
    // Unchanged held frames do not produce a write or consume a model budget.
    if (previous?.lastDecision?.kind === 'hold' && previous.lastDecision.reason === decision.reason && previous.lastDecision.evidenceKey === evidenceKey)
      return decision
    await options.commit({ cardId: input.cardId, operationKey: `initiative:${randomUUID()}`, changes: [{ owner: 'initiative', key, value: JSON.stringify(decision.next), expectedValue: previousRaw }] }, { signal })
    return decision
  }
  return { reserve }
}
