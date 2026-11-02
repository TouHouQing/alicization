import type { ExecutionRecoveryCommand, ExecutionRecoveryResult } from '../../../../shared/execution-recovery-contracts'
import type { LifeMutation } from '../../../../shared/life-contracts'
import type { AlicizationDbService } from '../db'
import type { ExecutionResourceBroker } from './resource-broker'

import { createHash, randomUUID } from 'node:crypto'

import * as v from 'valibot'

import { browserDownloadReservationSchema } from './browser-download-reservations'
import { downloadResourceReleaseMatches } from './browser-download-resource-recovery'

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

/** An explicit local host decision releases ownership, never certifies a download. */
export function createHostDownloadControl(options: {
  database: () => AlicizationDbService
  broker: ExecutionResourceBroker
  writerStopped: (cardId: string, reservationId: string) => boolean
  now?: () => number
}) {
  const now = options.now ?? Date.now
  const challenges = new Map<number, { token: string, expiresAt: number, binding: string }>()
  const owned = (cardId: string) => options.broker.snapshot().filter(lease => lease.uncertain && lease.resourceOnly && lease.effectCardId === cardId && lease.effectId?.startsWith('browser-download:')).sort((a, b) => a.effectId!.localeCompare(b.effectId!))
  async function snapshot(cardId: string, effectId: string) {
    const reservationId = effectId.replace(/^browser-download:/u, '')
    if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/u.test(reservationId))
      throw new Error('Download recovery needs the exact native owner')
    const database = options.database()
    const lease = owned(cardId).find(item => item.effectId === effectId)
    if (!lease)
      throw new Error('Download ownership changed; refresh its state')
    const source = await database.getLifeIngress(`browser-download-reservation:${reservationId}`)
    const reservation = v.parse(browserDownloadReservationSchema, source?.payload)
    if (!source || source.source !== 'browser-download-reservation' || source.sourceKey !== reservationId || reservation.id !== reservationId || reservation.cardId !== cardId || downloadResourceReleaseMatches(await database.getLifeIngress(`browser-download-resource-release:${reservationId}`), source))
      throw new Error('Download recovery crossed its immutable reservation')
    const parent = reservation.origin.kind === 'life-effect' ? await database.getLifeEffect(reservation.origin.effectId) : null
    const run = parent?.turnId ? await database.getLifeIngress(parent.turnId.startsWith('task-run:') ? parent.turnId : `user:${parent.turnId}`) : null
    const planId = run?.source === 'work-plan-scheduler' && typeof run.payload.planId === 'string' ? run.payload.planId : undefined
    const view = await database.readLifeState(planId ? { executionPlanId: planId } : undefined)
    if (view.cardId !== cardId)
      throw new Error('Download recovery crossed the selected card')
    const goal = view.obligations.find(item => item.id === run?.payload.rootObligationId)
    const began = await database.getLifeIngress(`browser-download:${reservationId}`)
    const terminal = await database.getLifeIngress(`browser-download-result:${reservationId}`)
    const unused = await database.getLifeIngress(`browser-download-reservation-result:${reservationId}`)
    const binding = digest({ cardId, lease, reservationHash: source.payloadHash, parent, run: run ? { id: run.id, status: run.status, payloadHash: run.payloadHash } : null, goal, beganHash: began?.payloadHash ?? null, terminalHash: terminal?.payloadHash ?? null, unusedHash: unused?.payloadHash ?? null })
    return { database, view, lease, reservation, source, goal, binding }
  }
  return async (input: ExecutionRecoveryCommand, surfaceId: number): Promise<ExecutionRecoveryResult> => {
    for (const [id, challenge] of challenges) {
      if (challenge.expiresAt <= now())
        challenges.delete(id)
    }
    if (input.action === 'list-downloads') {
      const database = options.database()
      if ((await database.readLifeState()).cardId !== input.cardId)
        throw new Error('Download recovery list crossed its card')
      const page = owned(input.cardId).filter(item => !input.afterId || item.effectId! > input.afterId).slice(0, 65)
      const items = []
      for (const lease of page.slice(0, 64)) {
        const current = await snapshot(input.cardId, lease.effectId!)
        items.push({ effectId: lease.effectId!, directory: current.reservation.directory })
      }
      return { state: 'download-list', items, next: page.length > 64 ? items.at(-1)!.effectId : null }
    }
    const challenge = challenges.get(surfaceId)
    if (input.action === 'takeover')
      challenges.delete(surfaceId)
    const current = await snapshot(input.cardId, input.effectId)
    if (input.action === 'preview') {
      if (challenges.size >= 64 && !challenges.has(surfaceId))
        throw new Error('Too many open native download confirmations')
      const token = randomUUID()
      const expiresAt = now() + 120_000
      challenges.set(surfaceId, { token, expiresAt, binding: current.binding })
      return { state: 'preview', token, expiresAt, capabilityId: 'tool.browser_download', target: current.reservation.directory, goals: current.goal ? [current.goal.summary.slice(0, 320)] : [] }
    }
    if (!options.writerStopped(input.cardId, current.reservation.id))
      throw new Error('The native download writer has not stopped')
    if (input.action === 'recheck')
      return { state: 'unknown' }
    if (!challenge || challenge.token !== input.token || !input.confirmedStopped || challenge.expiresAt <= now() || challenge.binding !== current.binding)
      throw new Error('Download confirmation expired or changed; review it again')
    const lease = options.broker.beginHostTakeover(input.effectId, current.lease.resources, input.cardId)
    let resolved = false
    try {
      const decisionId = `browser-download-resource-release:${current.reservation.id}`
      const mutations: LifeMutation[] = [
        { type: 'ingress-accept', ingress: { id: decisionId, kind: 'feedback', source: 'browser-download-resource-release', sourceKey: current.reservation.id, occurredAt: now(), payload: { reservationId: current.reservation.id, reservationHash: current.source.payloadHash, confirmationId: input.token, confirmedStopped: true, independent: false, stopEvidence: 'host-attestation', scope: 'resource-only-no-transfer-or-goal-success', binding: current.binding, originalGoal: current.goal ? { id: current.goal.id, generation: current.goal.generation, revision: current.goal.revision, status: current.goal.status, verification: current.goal.verification ?? null } : null } } },
        { type: 'ingress-settle', id: decisionId, status: 'settled' },
        ...(current.goal && !['fulfilled', 'cancelled', 'superseded'].includes(current.goal.status) ? [{ type: 'obligation-update' as const, id: current.goal.id, expectedRevision: current.goal.revision, expectedGeneration: current.goal.generation, status: 'cancelled' as const }] : []),
      ]
      let expectedRevision = current.view.revision
      for (let attempt = 0; ; attempt++) {
        lease.assert()
        if (!options.writerStopped(input.cardId, current.reservation.id))
          throw new Error('Native ownership changed during the host decision')
        try {
          await current.database.commitLifeState({ cardId: input.cardId, operationKey: decisionId, expectedRevision, changes: [], mutations })
          break
        }
        catch (error) {
          if (!(error instanceof Error) || !('code' in error) || error.code !== 'LIFE_STATE_CONFLICT' || attempt >= 3)
            throw error
          const latest = await snapshot(input.cardId, input.effectId)
          if (latest.binding !== current.binding)
            throw new Error('Download confirmation changed during commit')
          expectedRevision = latest.view.revision
        }
      }
      resolved = true
      return { state: 'host-taken-over' }
    }
    finally { lease.finish(resolved) }
  }
}
