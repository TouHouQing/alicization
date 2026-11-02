import { expect, it } from 'vitest'

import { createStageActionDelivery } from './stage-action-delivery'

it('keeps one primary gesture across metadata, preview, playback and later sentences of an utterance', () => {
  const delivery = createStageActionDelivery()
  expect(delivery.claim('chat:session:message:gw1|||午后阳光。 我铺开画纸:0', 'nod_soft')).toBe(true)
  expect(delivery.claim('chat:session:message:gw1|||午后阳光。\n我铺开画纸:0', 'nod_soft')).toBe(false)
  expect(delivery.claim('chat:session:message:gw2|||另一段格式化文本:0', 'nod_soft')).toBe(false)
  expect(delivery.claim('chat:session:message:gw1|||午后阳光:1', 'nod_soft')).toBe(false)
  expect(delivery.claim('chat:session:message:gw1|||午后阳光:2', 'cheer_raise_hand')).toBe(false)
  expect(delivery.claim('chat:session:next-message:gw1|||午后阳光:0', 'nod_soft')).toBe(true)
})

it('releases the utterance budget for the next interaction after explicit clearing', () => {
  const delivery = createStageActionDelivery()
  expect(delivery.claim('reply|||text:0', 'nod_soft')).toBe(true)
  expect(delivery.claim('reply|||text:1', 'head_shake')).toBe(false)
  delivery.clear()
  expect(delivery.claim('reply|||text:0', 'head_shake')).toBe(true)
})

it('joins early turn metadata to later speech segments before a segment identity exists', () => {
  const delivery = createStageActionDelivery()
  expect(delivery.claim(null, 'nod_soft', 'turn:gw1')).toBe(true)
  expect(delivery.claim('turn:gw1|||reply:0', 'cheer_raise_hand')).toBe(false)
  expect(delivery.claim(null, 'head_shake', 'turn:gw2')).toBe(false)
  expect(delivery.claim(null, 'nod_soft', 'next-turn:gw1')).toBe(true)
})

it('preserves distinct gestures, ordinary segment IDs, and independent presence pulses', () => {
  const delivery = createStageActionDelivery()
  expect(delivery.claim('segment-a', 'nod_soft')).toBe(true)
  expect(delivery.claim('segment-a', 'nod_soft')).toBe(false)
  expect(delivery.claim('segment-a', 'head_shake')).toBe(true)
  expect(delivery.claim('segment-b', 'nod_soft')).toBe(true)
  expect(delivery.claim(null, 'nod_soft')).toBe(true)
  expect(delivery.claim(null, 'nod_soft')).toBe(true)
  delivery.clear()
  expect(delivery.claim('segment-a', 'nod_soft')).toBe(true)
})
