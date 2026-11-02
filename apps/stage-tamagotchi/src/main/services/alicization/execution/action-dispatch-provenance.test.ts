import { expect, it } from 'vitest'

import { actionDidNotStart, inheritActionNotStarted, markActionNotStarted, markActionNotStartedError, withActionDispatch } from './action-dispatch-context'

it('binds local no-dispatch receipts to their exact action and keeps external copies untrusted', async () => {
  const check = async () => ({ cardId: 'alice', effectId: 'actual-effect', expiresAt: Date.now() + 60000 })
  const result = await withActionDispatch(check, () => markActionNotStarted({ effectMayHaveOccurred: false, sideEffectState: 'none' }))
  expect(actionDidNotStart({ ...result }, 'alice', 'actual-effect')).toBe(true)
  expect(actionDidNotStart(result, 'other-card', 'actual-effect')).toBe(false)
  expect(actionDidNotStart(result, 'alice', 'other-effect')).toBe(false)
  expect(actionDidNotStart(JSON.parse(JSON.stringify(result)), 'alice', 'actual-effect')).toBe(false)
  expect(actionDidNotStart(structuredClone(result), 'alice', 'actual-effect')).toBe(false)
  expect(actionDidNotStart(markActionNotStarted({ effectMayHaveOccurred: false, sideEffectState: 'none' }), 'alice', 'actual-effect')).toBe(false)
})

it('prevents detached callbacks from minting a receipt after their action context closes', async () => {
  const release = Promise.withResolvers<void>()
  let late!: Promise<{ sideEffectState: 'none', effectMayHaveOccurred: false }>
  await withActionDispatch(async () => ({ cardId: 'alice', effectId: 'closed-effect', expiresAt: Date.now() + 60000 }), () => {
    late = release.promise.then(() => markActionNotStarted({ effectMayHaveOccurred: false, sideEffectState: 'none' }))
  })
  release.resolve()
  expect(actionDidNotStart(await late, 'alice', 'closed-effect')).toBe(false)
})

it('keeps frozen local errors bound through normalization without trusting serialized error fields', async () => {
  const error = Object.freeze(new Error('Local validation refused the proposal'))
  await withActionDispatch(async () => ({ cardId: 'alice', effectId: 'refused', expiresAt: null }), () => {
    expect(markActionNotStartedError(error)).toBe(error)
  })
  const normalized = inheritActionNotStarted(error, { status: 'failed' })
  expect(actionDidNotStart(normalized, 'alice', 'refused')).toBe(true)
  expect(actionDidNotStart(normalized, 'alice', 'different')).toBe(false)
  expect(actionDidNotStart(JSON.parse(JSON.stringify(normalized)), 'alice', 'refused')).toBe(false)
  expect(actionDidNotStart(inheritActionNotStarted({ sideEffectState: 'none', effectMayHaveOccurred: false }, {}), 'alice', 'refused')).toBe(false)
})
