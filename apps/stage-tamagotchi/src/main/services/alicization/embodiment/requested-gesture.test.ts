import type { CharacterPerformanceCapabilitiesManifest } from '@proj-alicization/stage-shared'

import { expect, it } from 'vitest'

import { resolveRequestedGesture } from './requested-gesture'

const manifest = { renderer: 'live2d', supportedActions: ['nod_soft', 'head_shake', 'head_tilt'].map(key => ({ key })) } as CharacterPerformanceCapabilitiesManifest

it.each([
  ['你能轻轻点一下头回应我吗？一句简短的话就好，不需要连续点头。', 'nod_soft'],
  ['能不能点头回应一下？', 'nod_soft'],
  ['你可不可以轻轻点一次头？', 'nod_soft'],
  ['现在只轻轻点一次头，说一句“我在这里”就好。', 'nod_soft'],
  ['先停下刚才的话。我在这里，你轻轻点一次头，只回复“嗯，我在”。', 'nod_soft'],
  ['你慢慢摇一下头。', 'head_shake'],
  ['请摇一下头。', 'head_shake'],
  ['麻烦你稍微歪头看看我。', 'head_tilt'],
  ['Could you nod your head once, please?', 'nod_soft'],
  ['Please shake your head.', 'head_shake'],
  ['Can you tilt your head?', 'head_tilt'],
])('binds a direct current-user body request: %s', (text, cue) => {
  expect(resolveRequestedGesture(text, manifest)).toBe(cue)
})

it.each([
  '请不要点头。',
  '你能不能不要点头？',
  '你轻轻点头是什么意思？',
  '如果你轻轻点头，我会开心。',
  '别点头。',
  '不用你摇头。',
  '如果我请你点头，你会怎么做？',
  '解释一下点头是什么意思。',
  '请说“你能点头吗”。',
  '请输出「请摇头」。',
  '请说\'点头\'。',
  '他说你能点头。',
  '我喜欢点头这个动作。',
  '你会点头吗？',
  '请画一个点头的角色。',
  '请写一个你能点头的故事。',
  'Please do not nod.',
  'Please translate "can you nod".',
  'Please explain what nod means.',
  'Please draw someone who can nod.',
  '```please nod```',
  'Please say `nod`.',
])('does not execute a mention, quotation, hypothetical, or negation: %s', (text) => {
  expect(resolveRequestedGesture(text, manifest)).toBeNull()
})

it('uses only actual body capabilities and does not consume a later positive clause as negated', () => {
  expect(resolveRequestedGesture('请点头', { ...manifest, supportedActions: [] })).toBeNull()
  expect(resolveRequestedGesture('请点头')).toBeNull()
  expect(resolveRequestedGesture('不要点头，请摇一下头。', manifest)).toBe('head_shake')
})
