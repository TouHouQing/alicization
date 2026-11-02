import type { AlicizationDbService } from '../db'
import type { SkillLifecycleSnapshot } from '../turn-os/skill-loader'

import { randomUUID } from 'node:crypto'

import * as v from 'valibot'

import { LifeStateConflictError } from '../life-state-store'

const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
const snapshot = v.strictObject({
  version: v.literal(1),
  items: v.pipe(v.array(v.strictObject({ id, version: id, sourceHash: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u)), evaluationStatus: v.picklist(['unvalidated', 'sandbox-passed', 'replay-passed', 'approved', 'failed']), activationStatus: v.picklist(['candidate', 'active', 'rolled-back', 'revoked']) })), v.maxLength(128)),
})

/** Registry decisions survive restart in the same card's life-writer journal. */
export function createSkillLifecyclePersistence(database: AlicizationDbService, cardId: string) {
  return {
    async readLifecycle(): Promise<SkillLifecycleSnapshot | null> {
      const view = await database.readLifeState()
      if (view.cardId !== cardId)
        throw new Error('Skill lifecycle crossed its card owner')
      const latest = view.ingress.find(item => item.source === 'execution-skill-state' && item.status === 'settled')
      return latest ? v.parse(snapshot, latest.payload.snapshot) : null
    },
    async persistLifecycle(state: SkillLifecycleSnapshot) {
      const value = v.parse(snapshot, state)
      const active = value.items.filter(item => item.activationStatus === 'active')
      if (new Set(value.items.map(item => `${item.id}@${item.version}`)).size !== value.items.length || new Set(active.map(item => item.id)).size !== active.length || active.some(item => item.evaluationStatus !== 'approved'))
        throw new Error('Skill lifecycle has conflicting or unapproved active versions')
      const id = `execution-skill-state:${randomUUID()}`
      const at = Date.now()
      let previousHead: string | null | undefined
      for (let attempt = 0; attempt < 4; attempt++) {
        const view = await database.readLifeState()
        if (view.cardId !== cardId)
          throw new Error('Skill lifecycle crossed its card owner')
        const latest = view.ingress.find(item => item.source === 'execution-skill-state' && item.status === 'settled')
        const head = latest ? `${latest.id}:${latest.payloadHash}` : null
        if (previousHead !== undefined && head !== previousHead)
          throw new Error('Another skill lifecycle decision changed before persistence')
        previousHead = head
        try {
          await database.commitLifeState({ cardId, expectedRevision: view.revision, operationKey: id, changes: [], mutations: [
            { type: 'ingress-accept', ingress: { id, kind: 'system', source: 'execution-skill-state', sourceKey: id, occurredAt: at, payload: { snapshot: value } } },
            { type: 'ingress-settle', id, status: 'settled' },
          ] })
          return
        }
        catch (error) {
          // Unrelated dialogue/transfer journals may advance the global writer.
          // Retry only that CAS conflict; a competing lifecycle decision stays final.
          if (!(error instanceof LifeStateConflictError) || attempt === 3)
            throw error
        }
      }
    },
  }
}
