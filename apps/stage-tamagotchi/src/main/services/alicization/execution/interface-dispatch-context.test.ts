import { expect, it, vi } from 'vitest'

import { withActionDispatch } from './action-dispatch-context'
import { assertInterfaceDispatchCurrent, bindInterfaceOperation } from './interface-dispatch-context'

it('preserves the original upload vector and text during asynchronous platform review and refuses a saved callback after return', async () => {
  const input = { selector: 'element:owned', files: ['C:/owned.txt'], text: 'original 中文🙂' }
  const expected = structuredClone(input)
  const review = Promise.withResolvers<void>()
  const entered = Promise.withResolvers<void>()
  const resumeDetached = Promise.withResolvers<void>()
  let detached: Promise<unknown> | undefined
  const check = vi.fn(async (binding?: { parameters?: unknown }) => {
    if (binding?.parameters)
      expect(binding.parameters).toEqual(expected)
    return { expiresAt: Date.now() + 60_000, capabilityId: 'tool.browser_upload_files' }
  })
  const dispatch = bindInterfaceOperation('browser_upload_files', async (snapshot: typeof input & { abortSignal?: AbortSignal }) => {
    detached = resumeDetached.promise.then(() => assertInterfaceDispatchCurrent(false))
    entered.resolve()
    await review.promise
    await assertInterfaceDispatchCurrent(false)
    return { files: [...snapshot.files], text: snapshot.text }
  })
  const pending = withActionDispatch(check, () => dispatch(input))
  await entered.promise
  input.files[0] = 'C:/private.txt'
  input.text = 'changed during approval'
  review.resolve()
  expect(await pending).toEqual({ files: expected.files, text: expected.text })
  const checks = check.mock.calls.length
  resumeDetached.resolve()
  await expect(detached!).rejects.toThrow('already closed')
  expect(check).toHaveBeenCalledTimes(checks)
})

it('does not dispatch after cancellation arrives during the final authority read', async () => {
  const controller = new AbortController()
  const send = vi.fn()
  const operation = bindInterfaceOperation('browser_click_element', async (_input: { selector: string, abortSignal?: AbortSignal }) => {
    await assertInterfaceDispatchCurrent(false)
    send()
  })
  let checks = 0
  await expect(withActionDispatch(async () => {
    if (++checks === 3)
      controller.abort(new Error('host stopped at dispatch'))
    return { expiresAt: Date.now() + 60_000, capabilityId: 'tool.browser_click_element' }
  }, () => operation({ selector: 'element:owned', abortSignal: controller.signal }))).rejects.toThrow('host stopped at dispatch')
  expect(send).not.toHaveBeenCalled()
})
