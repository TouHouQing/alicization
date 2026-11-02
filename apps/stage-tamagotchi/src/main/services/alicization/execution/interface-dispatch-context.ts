import { AsyncLocalStorage } from 'node:async_hooks'

import { assertActionDispatchCurrent, assertActionDispatchOperation } from './action-dispatch-context'

interface InterfaceDispatch { operation: string, parameters: object, signal?: AbortSignal, closed: boolean }
const interfaces = new AsyncLocalStorage<InterfaceDispatch>()

function freezeParameters<T extends object>(value: T): T {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object')
      freezeParameters(child)
  }
  return Object.freeze(value)
}

/** Snapshot the public tool input before platform selection or asynchronous review. */
export function bindInterfaceOperation<T extends { abortSignal?: AbortSignal }, R>(operation: string, dispatch: (input: T) => Promise<R>) {
  return async (input: T): Promise<R> => {
    const { abortSignal, ...raw } = input
    const parameters = freezeParameters(structuredClone(raw))
    const snapshot = Object.freeze({ ...parameters, abortSignal }) as T
    const scope: InterfaceDispatch = { operation, parameters, signal: abortSignal, closed: false }
    return interfaces.run(scope, async () => {
      try {
        await assertInterfaceDispatchCurrent(false)
        return await dispatch(snapshot)
      }
      finally { scope.closed = true }
    })
  }
}

/** Recheck the same original operation and bytes at CDP/native/script dispatch. */
export async function assertInterfaceDispatchCurrent(target = true) {
  const scope = interfaces.getStore()
  if (!scope)
    return assertActionDispatchCurrent(target)
  if (scope.closed)
    throw new Error('Interface dispatch context has already closed')
  scope.signal?.throwIfAborted()
  const authority = await assertActionDispatchOperation([`tool.${scope.operation}`], scope.parameters, target)
  if (scope.closed)
    throw new Error('Interface dispatch context closed during its authority check')
  scope.signal?.throwIfAborted()
  return authority
}
