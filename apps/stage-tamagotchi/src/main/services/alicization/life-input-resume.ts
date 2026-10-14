import type { AlicizationChatStartPayload, AlicizationChatStartResult } from '../../../shared/eventa'
import type { LifeCommitInput, LifeCommitReceipt, LifeIngress } from '../../../shared/life-contracts'

import { createHash } from 'node:crypto'

export function createLifeInputResume(options: {
  getIngress: (id: string) => Promise<LifeIngress | null>
  getUserInput: (id: string) => Promise<Record<string, unknown> | null>
  commit: (input: LifeCommitInput) => Promise<LifeCommitReceipt>
  binding: () => Pick<AlicizationChatStartPayload, 'providerId' | 'model' | 'providerConfig'>
  session: () => Promise<string>
  start: (input: AlicizationChatStartPayload) => Promise<AlicizationChatStartResult>
}) {
  return async (input: { cardId: string, ingressId: string, expectedPayloadHash: string }) => {
    const turnId = `recovered:${createHash('sha256').update(JSON.stringify(input)).digest('hex')}`
    if (await options.getIngress(`recovery:${turnId}`)) {
      const child = await options.getIngress(`user:${turnId}`)
      if (!child || ['held', 'failed'].includes(child.status))
        throw new Error('The recovered request is held; continue its new entry from the pending list')
      return { status: 'resumed' as const, turnId }
    }
    const binding = options.binding()
    if (!binding.providerId || !binding.model)
      throw new Error('Configure a dialogue model before continuing the held input')
    const parent = await options.getIngress(input.ingressId)
    const message = await options.getUserInput(input.ingressId)
    if (!parent || !message || message.role !== 'user')
      throw new Error('Original user input is unavailable')
    const conversationId = await options.session()
    const receipt = await options.commit({ cardId: input.cardId, operationKey: `resume:${turnId}`, changes: [], mutations: [{ type: 'input-resume', parentIngressId: input.ingressId, expectedPayloadHash: input.expectedPayloadHash, childTurnId: turnId, conversationId }] })
    if (receipt.status === 'duplicate')
      return { status: 'resumed' as const, turnId }
    try {
      const result = await options.start({ ...binding, cardId: input.cardId, turnId, sessionId: conversationId, messages: [{ role: 'user', content: message.content }], supportsTools: true })
      if (!result.accepted)
        throw new Error(result.reason ?? 'The recovered request was not accepted')
      return { status: 'resumed' as const, turnId }
    }
    catch (error) {
      const child = await options.getIngress(`user:${turnId}`)
      if (child && child.status !== 'settled')
        await options.commit({ cardId: input.cardId, operationKey: `resume-held:${turnId}`, changes: [], mutations: [{ type: 'ingress-settle', id: child.id, status: 'held', expectedStatus: child.status }] })
      throw error
    }
  }
}
