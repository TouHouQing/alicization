import { describe, expect, it } from 'vitest'

import {
  createAlicizationRendererReconcileKey,
  isAlicizationRendererReconcileCurrent,
} from './alicization-reconcile-scope'

describe('alicization renderer reconcile scope', () => {
  it('keys in-flight reconciliation by card, session and scope epoch', () => {
    expect(createAlicizationRendererReconcileKey({
      cardId: 'card-a',
      sessionId: 'session-1',
      epoch: 1,
    })).toBe('card-a::session-1::1')
    expect(createAlicizationRendererReconcileKey({
      cardId: 'card-b',
      sessionId: 'session-1',
      epoch: 1,
    })).not.toBe(createAlicizationRendererReconcileKey({
      cardId: 'card-a',
      sessionId: 'session-1',
      epoch: 1,
    }))
    expect(createAlicizationRendererReconcileKey({
      cardId: 'card-a',
      sessionId: 'session-1',
      epoch: 2,
    })).not.toBe(createAlicizationRendererReconcileKey({
      cardId: 'card-a',
      sessionId: 'session-1',
      epoch: 1,
    }))
  })

  it('rejects a late response from an old card or scope epoch', () => {
    const token = {
      cardId: 'card-a',
      sessionId: 'session-1',
      epoch: 3,
    }

    expect(isAlicizationRendererReconcileCurrent(token, {
      cardId: 'card-a',
      sessionId: 'session-1',
      epoch: 3,
    })).toBe(true)
    expect(isAlicizationRendererReconcileCurrent(token, {
      cardId: 'card-b',
      sessionId: 'session-1',
      epoch: 3,
    })).toBe(false)
    expect(isAlicizationRendererReconcileCurrent(token, {
      cardId: 'card-a',
      sessionId: 'session-1',
      epoch: 4,
    })).toBe(false)
  })
})
