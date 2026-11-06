import { describe, expect, it, vi } from 'vitest'

import { runIsolatedProgram } from './isolated-program'

describe('programmatic tool calling in an actual WASM heap', () => {
  it('reduces multiple host reads into one result without leaking host objects', async () => {
    const callTool = vi.fn(async (_name, input: any) => ({ lines: [input.path, '你好'] }))
    const result = await runIsolatedProgram({ signal: new AbortController().signal, input: ['a.ts', 'b.ts'], code: 'const values = await Promise.all(input.map(path => call("read", {path}))); return values.map(value => value.lines[0]);', callTool })
    expect(result).toEqual({ calls: 2, result: ['a.ts', 'b.ts'] })
    expect(callTool).toHaveBeenCalledTimes(2)
  })

  it.each(['process', 'require', 'fetch', 'WebSocket', 'setTimeout'])('has no %s capability', async (name) => {
    expect((await runIsolatedProgram({ signal: new AbortController().signal, code: `return typeof ${name};`, callTool: vi.fn() })).result).toBe('undefined')
  })

  it('rejects imports, unowned promises, over-budget calls and non-JSON output', async () => {
    const base = { signal: new AbortController().signal, callTool: vi.fn(async () => null) }
    await expect(runIsolatedProgram({ ...base, code: 'return await import("node:fs");' })).rejects.toThrow()
    await expect(runIsolatedProgram({ ...base, code: 'return await new Promise(() => {});' })).rejects.toThrow('unowned promise')
    await expect(runIsolatedProgram({ ...base, maximumCalls: 1, code: 'await call("read", {}); await call("read", {}); return null;' })).rejects.toThrow('budget')
    await expect(runIsolatedProgram({ ...base, code: 'return {value: NaN};' })).rejects.toThrow('JSON')
  })

  it('interrupts CPU loops and cancels then joins actual host calls', async () => {
    await expect(runIsolatedProgram({ signal: new AbortController().signal, code: 'while (true) {}', callTool: vi.fn() })).rejects.toThrow()
    let stopped = false
    await expect(runIsolatedProgram({ signal: new AbortController().signal, timeoutMs: 30, code: 'return await call("read", {});', callTool: async (_name, _input, signal) => {
      await new Promise<void>((resolve) => {
        if (signal.aborted)
          resolve(); else
          signal.addEventListener('abort', () => resolve(), { once: true })
      })
      stopped = true
      signal.throwIfAborted()
    } })).rejects.toThrow('deadline')
    expect(stopped).toBe(true)
  })
})
