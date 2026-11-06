import type { QuickJSHandle } from 'quickjs-emscripten'

import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'

import { newQuickJSWASMModuleFromVariant, newVariant, RELEASE_SYNC } from 'quickjs-emscripten'

import { markOwnedReadStopped } from '../execution/owned-read-stop'
import { agentRuntimeAsset } from './agent-runtime-assets'

// DeepSeek workflow-ptc's JSON-only realm boundary, bounded child ownership and
// cooperative teardown, adapted to a QuickJS WASM heap rather than node:vm.
// Upstream: 8bd073392eef6f54e921a093b95076248eb08cbb, workflow-ptc/src/realm.ts.
// License: resources/licenses/deepseek-harness-license.txt.
const maximumJsonBytes = 128 * 1024
const getProgramModule = (() => {
  let pending: ReturnType<typeof newQuickJSWASMModuleFromVariant> | undefined
  return () => pending ??= newQuickJSWASMModuleFromVariant(newVariant(RELEASE_SYNC, { wasmBinary: async () => Uint8Array.from(await readFile(agentRuntimeAsset('quickjs.wasm'))).buffer }))
})()

function json(value: unknown) {
  const text = JSON.stringify(value)
  if (typeof text !== 'string' || Buffer.byteLength(text) > maximumJsonBytes)
    throw new Error('Program JSON crossed its data budget')
  return text
}

/** A fresh WASM heap, with no process, imports, filesystem, network or timers. */
export async function runIsolatedProgram(options: {
  code: string
  input?: unknown
  signal: AbortSignal
  callTool: (name: string, input: unknown, signal: AbortSignal) => Promise<unknown>
  maximumCalls?: number
  maximumSourceChars?: number
  timeoutMs?: number
}) {
  options.signal.throwIfAborted()
  const maximumSourceChars = options.maximumSourceChars ?? 16000
  if (!Number.isSafeInteger(maximumSourceChars) || maximumSourceChars < 1 || maximumSourceChars > 128000 || !options.code.trim() || options.code.length > maximumSourceChars)
    throw new Error('Program source must contain 1 to 16000 characters')
  const maximumCalls = options.maximumCalls ?? 16
  const timeoutMs = options.timeoutMs ?? 30000
  if (!Number.isSafeInteger(maximumCalls) || maximumCalls < 0 || maximumCalls > 32 || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000)
    throw new Error('Invalid program execution budget')
  const module = await getProgramModule()
  options.signal.throwIfAborted()
  const stop = new AbortController()
  const signal = AbortSignal.any([stop.signal, options.signal])
  const timer = setTimeout(() => stop.abort(new Error('Program deadline exceeded')), timeoutMs)
  const runtime = module.newRuntime()
  runtime.setMemoryLimit(16 * 1024 * 1024)
  runtime.setMaxStackSize(256 * 1024)
  let cpuRemaining = 250
  let sliceDeadline = Date.now() + cpuRemaining
  runtime.setInterruptHandler(() => signal.aborted || Date.now() >= sliceDeadline)
  runtime.setModuleLoader(() => {
    throw new Error('Program imports are unavailable')
  })
  const context = runtime.newContext()
  const pending = new Set<Promise<void>>()
  let calls = 0
  let closed = false
  const bridge = context.newFunction('__hostCall', (nameHandle, inputHandle) => {
    signal.throwIfAborted()
    if (++calls > maximumCalls)
      throw new Error('Program tool-call budget exceeded')
    const name = context.getString(nameHandle)
    const text = context.getString(inputHandle)
    if (!name || name.length > 128 || Buffer.byteLength(text) > maximumJsonBytes)
      throw new Error('Program call crossed its data budget')
    const input = JSON.parse(text)
    const deferred = context.newPromise()
    const task = Promise.resolve().then(async () => {
      try {
        signal.throwIfAborted()
        const output = json(await options.callTool(name, input, signal))
        if (!closed) {
          const value = context.newString(output)
          deferred.resolve(value)
          value.dispose()
        }
      }
      catch (error) {
        if (!closed) {
          const value = context.newString(error instanceof Error ? error.message : String(error))
          deferred.reject(value)
          value.dispose()
        }
      }
      finally { deferred.dispose() }
    }).finally(() => pending.delete(task))
    pending.add(task)
    return deferred.handle
  })
  context.setProp(context.global, '__hostCall', bridge)
  bridge.dispose()
  let promise: QuickJSHandle | null = null
  try {
    const started = Date.now()
    // Capture codecs in the closure before guest code can modify globals.
    // JSON is the only value crossing the heap boundary; host object prototypes
    // and host callbacks are never exposed as JavaScript objects in the guest.
    promise = context.unwrapResult(context.evalCode(`(async () => {
      const stringify = JSON.stringify.bind(JSON), parse = JSON.parse.bind(JSON), hostCall = __hostCall;
      delete globalThis.__hostCall;
      const encode = value => stringify(value, (_key, item) => {
        if (item === undefined || typeof item === 'function' || typeof item === 'symbol' || typeof item === 'bigint' || typeof item === 'number' && !Number.isFinite(item)) throw new Error('Program values must be JSON data');
        return item;
      });
      const call = async (name, args) => parse(await hostCall(name, encode(args)));
      const input = parse(${JSON.stringify(json(options.input ?? null))});
      const result = await (async () => { ${options.code}\n })();
      return encode(result);
    })()`, 'life-program.js'))
    cpuRemaining -= Date.now() - started
    for (;;) {
      signal.throwIfAborted()
      if (cpuRemaining <= 0)
        throw new Error('Program CPU budget exceeded')
      sliceDeadline = Date.now() + cpuRemaining
      const before = Date.now()
      const jobs = runtime.executePendingJobs(64)
      if (jobs.error) {
        const error = context.dump(jobs.error)
        jobs.error.dispose()
        throw new Error(`Program job failed: ${json(error)}`)
      }
      const state = context.getPromiseState(promise)
      cpuRemaining -= Date.now() - before
      if (state.type === 'fulfilled') {
        try {
          const output = context.getString(state.value)
          if (Buffer.byteLength(output) > maximumJsonBytes)
            throw new Error('Program output crossed its data budget')
          return { result: JSON.parse(output), calls }
        }
        finally { state.value.dispose() }
      }
      if (state.type === 'rejected') {
        const error = context.dump(state.error)
        state.error.dispose()
        throw new Error(`Program failed: ${json(error)}`)
      }
      if (!pending.size && !runtime.hasPendingJob())
        throw new Error('Program awaits an unowned promise')
      await new Promise(resolve => setTimeout(resolve, 2))
    }
  }
  catch (error) {
    throw markOwnedReadStopped(error && typeof error === 'object' ? error : new Error(String(error)))
  }
  finally {
    stop.abort(new Error('Program stopped'))
    clearTimeout(timer)
    // Host calls observe the same cancellation and own bounded adapter deadlines.
    // Join before releasing the heap; no late promise can access disposed values.
    await Promise.allSettled(pending)
    closed = true
    promise?.dispose()
    context.dispose()
    runtime.dispose()
  }
}
