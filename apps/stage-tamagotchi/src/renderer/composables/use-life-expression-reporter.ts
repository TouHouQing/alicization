import type { StageSpeechReceiptInput } from '@proj-alicization/stage-ui/types/speech-receipts'

import type { LifeExpressionReceipt, LifeMutation } from '../../shared/life-contracts'

import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { useIntervalFn, useLocalStorage } from '@vueuse/core'
import { ref, watch } from 'vue'

import { electronLifeBodyActivity, electronLifeBodyHealth, electronLifeExpressionReceipt, electronLifeSurfaceSession } from '../../shared/life-events'

export function useLifeExpressionReporter(activeCard: () => string | undefined) {
  const openSession = useElectronEventaInvoke(electronLifeSurfaceSession)
  const send = useElectronEventaInvoke(electronLifeExpressionReceipt)
  const sendHealth = useElectronEventaInvoke(electronLifeBodyHealth)
  const sendBodyActivity = useElectronEventaInvoke(electronLifeBodyActivity)
  const pending = useLocalStorage<LifeExpressionReceipt[]>('alicization/life-expression-outbox-v1', [])
  const error = ref<string | null>(null)
  const sessions = new Map<string, Promise<{ id: string }>>()
  const presented = new Set<string>()
  const sequences = new Map<string, number>()
  let sending = false
  let registration: Promise<unknown> = Promise.resolve()

  function registerActiveSession(cardId: string) {
    // Serialize registrations across a switch; flushing an old receipt must
    // never register its former character as the window's current character.
    const current = registration.then(() => openSession({ cardId })).catch((caught) => {
      if (sessions.get(cardId) === current)
        sessions.delete(cardId)
      throw caught
    })
    sessions.set(cardId, current)
    registration = current.catch(() => {})
    return current
  }
  watch(activeCard, (cardId) => {
    if (cardId)
      registerActiveSession(cardId)
  }, { immediate: true, flush: 'sync' })

  function session(cardId: string) {
    let current = sessions.get(cardId)
    if (!current && cardId === activeCard())
      current = registerActiveSession(cardId)
    if (!current) {
      throw new Error('No issued presentation session for this character')
    }
    return current
  }

  async function flush() {
    if (sending || pending.value.length === 0)
      return
    sending = true
    try {
      let firstError: string | null = null
      for (const receipt of [...pending.value]) {
        try {
          const result = await send({ ...receipt })
          if (receipt.state === 'rendered' && result.presentationVerified)
            presented.add(`${receipt.surfaceSessionId}:${receipt.turnId}`)
          pending.value = pending.value.filter(item => item.receiptId !== receipt.receiptId)
        }
        catch (caught) {
          // Keep this observation for retry without blocking independent, valid later turns.
          firstError ??= caught instanceof Error ? caught.message : String(caught)
        }
      }
      error.value = firstError
    }
    catch (caught) { error.value = caught instanceof Error ? caught.message : String(caught) }
    finally {
      sending = false
    }
  }

  async function rendered(input: { cardId: string, turnId: string }) {
    try {
      if (input.cardId !== activeCard())
        return
      const current = await session(input.cardId)
      if (input.cardId !== activeCard())
        return
      const presentationKey = `${current.id}:${input.turnId}`
      if (presented.has(presentationKey) || pending.value.some(item => item.state === 'rendered' && item.surfaceSessionId === current.id && item.turnId === input.turnId))
        return
      // Text shares a surface epoch; its sequence must span all turns. A
      // hidden-window observation does not prevent a fresh visible rendering.
      const key = `${current.id}:text`
      const sequence = sequences.get(key) ?? 0
      sequences.set(key, sequence + 1)
      const receiptId = `rendered:${current.id}:${input.turnId}:${sequence}`
      pending.value.push({ cardId: input.cardId, receiptId, deliveryId: input.turnId, turnId: input.turnId, utteranceId: input.turnId, segmentId: 'text', playbackEpoch: current.id, surfaceSessionId: current.id, sequence, state: 'rendered', playedMs: 0, alignedTextEnd: null, alignmentSource: null, errorCode: null, occurredAt: Date.now() })
      await flush()
    }
    catch (caught) { error.value = caught instanceof Error ? caught.message : String(caught) }
  }
  useIntervalFn(() => {
    void flush()
  }, 2000)
  async function audio(input: StageSpeechReceiptInput) {
    try {
      const current = await session(input.cardId)
      const key = `${current.id}:${input.playbackEpoch}:${input.utteranceId}`
      const sequence = sequences.get(key) ?? 0
      sequences.set(key, sequence + 1)
      const receipt: LifeExpressionReceipt = { ...input, receiptId: `audio:${key}:${sequence}`, deliveryId: input.turnId, segmentId: 'utterance', surfaceSessionId: current.id, sequence, playedMs: Math.max(0, Math.round(input.playedMs)), alignedTextEnd: null, alignmentSource: null, occurredAt: Date.now() }
      if (input.state === 'audio-progress')
        pending.value = pending.value.filter(item => item.state !== 'audio-progress' || item.surfaceSessionId !== current.id || item.playbackEpoch !== input.playbackEpoch || item.utteranceId !== input.utteranceId)
      pending.value.push(receipt)
      await flush()
    }
    catch (caught) { error.value = caught instanceof Error ? caught.message : String(caught) }
  }
  async function health(cardId: string, health: Extract<LifeMutation, { type: 'body-health' }>['health']) {
    try {
      if (cardId !== activeCard())
        return
      const current = await session(cardId)
      await sendHealth({ cardId, sessionId: current.id, health })
    }
    catch (caught) {
      error.value = caught instanceof Error ? caught.message : String(caught)
    }
  }
  async function bodyActivity(receipt: import('@proj-alicization/stage-shared').AlicizationBodyActivityReceipt) {
    try {
      if (receipt.cardId !== activeCard())
        return
      const current = await session(receipt.cardId)
      await sendBodyActivity({ receipt, sessionId: current.id })
    }
    catch (caught) { error.value = caught instanceof Error ? caught.message : String(caught) }
  }
  return { rendered, audio, health, bodyActivity, pending, error }
}
