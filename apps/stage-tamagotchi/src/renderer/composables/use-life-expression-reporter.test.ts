import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { electronLifeExpressionReceipt, electronLifeSurfaceSession } from '../../shared/life-events'
import { useLifeExpressionReporter } from './use-life-expression-reporter'

const ports = vi.hoisted(() => ({ send: vi.fn(), session: vi.fn() }))
vi.mock('@proj-alicization/electron-vueuse', () => ({
  useElectronEventaInvoke: (event: unknown) => event === electronLifeExpressionReceipt ? ports.send : event === electronLifeSurfaceSession ? ports.session : vi.fn(),
}))
vi.mock('@vueuse/core', async () => {
  const { ref } = await import('vue')
  return { useLocalStorage: () => ref([]), useIntervalFn: vi.fn() }
})

describe('life expression outbox isolation', () => {
  it('retains a rejected observation while settling independent playback and rendering receipts', async () => {
    ports.session.mockResolvedValue({ id: 'issued-surface' })
    ports.send.mockImplementation(async (receipt) => {
      if (receipt.turnId === 'unpublished-old-turn')
        throw new Error('Expression receipt has no published turn')
      return { presentationVerified: true }
    })
    const scope = effectScope()
    try {
      const reporter = scope.run(() => useLifeExpressionReporter(() => 'default'))!
      reporter.pending.value.push({ cardId: 'default', receiptId: 'old', deliveryId: 'unpublished-old-turn', turnId: 'unpublished-old-turn', utteranceId: 'old', segmentId: 'text', playbackEpoch: 'old-surface', surfaceSessionId: 'old-surface', sequence: 0, state: 'rendered', playedMs: 0, alignedTextEnd: null, alignmentSource: null, errorCode: null, occurredAt: 1 })
      await reporter.audio({ cardId: 'default', turnId: 'committed:gw1', utteranceId: 'one-actual-voice', playbackEpoch: 'one-actual-voice', state: 'audio-started', playedMs: 0, errorCode: null })
      expect(reporter.pending.value.map(receipt => receipt.receiptId)).toEqual(['old'])
      expect(ports.send).toHaveBeenCalledWith(expect.objectContaining({ turnId: 'committed:gw1', state: 'audio-started', surfaceSessionId: 'issued-surface' }))
      expect(reporter.error.value).toBe('Expression receipt has no published turn')
      await reporter.rendered({ cardId: 'default', turnId: 'committed:gw1' })
      expect(ports.send).toHaveBeenCalledWith(expect.objectContaining({ turnId: 'committed:gw1', state: 'rendered' }))
      expect(reporter.pending.value.map(receipt => receipt.receiptId)).toEqual(['old'])
      const count = ports.send.mock.calls.length
      await reporter.rendered({ cardId: 'default', turnId: 'committed:gw1' })
      expect(ports.send).toHaveBeenCalledTimes(count)
    }
    finally { scope.stop() }
  })
})
