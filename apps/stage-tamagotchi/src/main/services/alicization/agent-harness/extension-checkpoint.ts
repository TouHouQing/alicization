import type { AlicizationDbService } from '../db'

import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'

interface Binding { cardId: string, turnId: string, actionId: string, conversationId: string, capabilityId: string, extensionId: string, extensionVersion: string, callId: string, parametersHash: string }

/** Snapshot before execution; result and custom entries commit atomically. */
export async function openExtensionCheckpoint(database: AlicizationDbService, binding: Binding, prepare: () => Promise<unknown>) {
  if ((await database.readLifeState()).cardId !== binding.cardId)
    throw new Error('Extension checkpoint crossed its life owner')
  const key = createHash('sha256').update(JSON.stringify([binding.cardId, binding.turnId, binding.actionId])).digest('hex')
  const id = `extension-checkpoint:${key}`
  const resultId = `${id}:result`
  const mutation = (entryId: string, source: string, payload: Record<string, unknown>) => [
    { type: 'ingress-accept' as const, ingress: { id: entryId, kind: 'system' as const, source, sourceKey: entryId, occurredAt: Date.now(), payload } },
    { type: 'ingress-settle' as const, id: entryId, status: 'settled' as const },
  ]
  let start = await database.getLifeIngress(id)
  if (!start) {
    const input = await prepare()
    await database.commitLifeState({ cardId: binding.cardId, operationKey: id, changes: [], mutations: mutation(id, 'agent-extension-checkpoint', { binding, input }) })
    start = await database.getLifeIngress(id)
  }
  if (!start || start.source !== 'agent-extension-checkpoint' || start.status !== 'settled' || !isDeepStrictEqual(start.payload.binding, binding))
    throw new Error('Extension checkpoint identity changed')
  const completed = await database.getLifeIngress(resultId)
  if (completed && (completed.source !== 'agent-extension-result' || completed.status !== 'settled' || !isDeepStrictEqual(completed.payload.binding, binding)))
    throw new Error('Extension checkpoint result changed its owner')
  return { id, input: start.payload.input, completed: completed ? completed.payload.output : undefined, async commit(entries: Array<{ customType: string, data: unknown }>, output: unknown) {
    if (entries.length > 16 || entries.some(entry => JSON.stringify(entry).length > 8000))
      throw new Error('Extension journal exceeded its entry budget')
    const existing = await database.getLifeIngress(resultId)
    const payload = JSON.parse(JSON.stringify({ binding, output }))
    if (existing) {
      if (!isDeepStrictEqual(existing.payload, payload))
        throw new Error('Extension checkpoint result changed')
      return
    }
    const mutations = entries.flatMap((entry, index) => mutation(`${resultId}:entry:${index}`, `agent-extension-entry:${binding.extensionId}`, { ...entry, extensionVersion: binding.extensionVersion, extensionCheckpointId: id }))
    mutations.push(...mutation(resultId, 'agent-extension-result', payload))
    await database.commitLifeState({ cardId: binding.cardId, operationKey: resultId, changes: [], mutations })
  } }
}
