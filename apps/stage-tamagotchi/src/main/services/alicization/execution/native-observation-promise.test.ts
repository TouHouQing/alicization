import process from 'node:process'

import { Session } from 'node:inspector'
import { createRequire } from 'node:module'

import { expect, it } from 'vitest'

const { withPinnedInspectorResult } = createRequire(import.meta.url)('../../../../../scripts/life-acceptance/native-observation-promise.cjs')

it.each([false, true])('retains a real inspector promise through forced GC and releases it after rejected=%s', async (reject) => {
  const session = new Session()
  session.connect()
  const post = (method: string, params: Record<string, unknown> = {}) => new Promise<any>((resolve, reject) => session.post(method, params, (error, value) => error ? reject(error) : resolve(value)))
  const evaluate = async (expression: string) => {
    const result = await post('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: false })
    if (result.exceptionDetails)
      throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
    return result.result.value
  }
  const count = () => evaluate('Object.getOwnPropertyNames(globalThis).filter(key => key.startsWith("__alicizationOwnedObservation_")).length')
  try {
    expect(await count()).toBe(0)
    const expression = `new Promise((resolve, reject) => { setTimeout(() => ${reject ? 'reject(new Error("owned capture rejected"))' : 'resolve({ pid: process.pid, complete: true })'}, 100); })`
    // Attach rejection handling before forced collection, just as a client
    // must account for the native result while its control request is pending.
    const pending = withPinnedInspectorResult(evaluate, expression).then((value: unknown) => ({ value }), (error: Error) => ({ error }))
    expect(await count()).toBe(1)
    await post('HeapProfiler.collectGarbage')
    const result = await pending
    if (reject)
      expect(result.error?.message).toContain('owned capture rejected')
    else
      expect(result.value).toMatchObject({ pid: process.pid, complete: true })
    expect(await count()).toBe(0)
  }
  finally { session.disconnect() }
})
