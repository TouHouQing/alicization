import { describe, expect, it } from 'vitest'

import { executeToolCallsScheduled } from '../third-party/codex-tool-scheduler'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { isParallelReadAction } from './parallel-admission'

describe('bounded shared readers and exclusive barriers', () => {
  it('overlaps readers, waits at mutation barriers, and settles in proposal order', async () => {
    const active = new Set<string>()
    const seen: string[] = []
    const receipts: string[] = []
    let peak = 0
    await executeToolCallsScheduled(['r1', 'r2', 'write', 'r3', 'r4'], {
      signal: new AbortController().signal,
      canRunInParallel: call => call.startsWith('r'),
      start: async (call) => { seen.push(`start:${call}`) },
      execute: async (call) => {
        if (call === 'write')
          expect(active.size).toBe(0)
        else
          expect(active.has('write')).toBe(false)
        active.add(call)
        peak = Math.max(peak, active.size)
        await new Promise(resolve => setTimeout(resolve, call === 'r1' ? 20 : 2))
        active.delete(call)
        seen.push(`done:${call}`)
        return call
      },
      settle: async (call, result) => {
        expect(result).toEqual({ ok: true, value: call })
        receipts.push(call)
      },
    })
    expect(peak).toBe(2)
    expect(receipts).toEqual(['r1', 'r2', 'write', 'r3', 'r4'])
    expect(seen.indexOf('done:r2')).toBeLessThan(seen.indexOf('done:r1'))
    expect(seen.indexOf('start:write')).toBeGreaterThan(seen.indexOf('done:r1'))
  })

  it('joins cancelled readers before returning and never dispatches the next mutation', async () => {
    const controller = new AbortController()
    const stopped: string[] = []
    const started: string[] = []
    await expect(executeToolCallsScheduled(['r1', 'r2', 'write'], {
      signal: controller.signal,
      canRunInParallel: call => call.startsWith('r'),
      start: async (call) => { started.push(call) },
      execute: async (call) => {
        if (call === 'r1')
          controller.abort(new Error('stop'))
        await new Promise(resolve => setTimeout(resolve, 10))
        stopped.push(call)
        controller.signal.throwIfAborted()
        return call
      },
      settle: async () => {},
    })).rejects.toThrow('stop')
    expect(started).toEqual(['r1', 'r2'])
    expect(stopped).toEqual(['r1']) // r2 was cancelled before its body entered.
  })

  it('requires current canonical read authority and rejects revoked or broadened manifests', () => {
    const registry = createCanonicalToolRegistry()
    const manifest = registry.resolveActive('tool.filesystem_read_file')!
    const action = { actionId: 'a', toolCallId: 'c', capabilityId: manifest.capabilityId, providerToolName: manifest.providerToolName, input: { path: 'a.txt' } }
    expect(isParallelReadAction(action, registry)).toBe(true)
    registry.replace({ ...manifest, risk: 'medium' })
    expect(isParallelReadAction(action, registry)).toBe(false)
    registry.setActivationStatus(manifest.capabilityId, 'revoked')
    expect(isParallelReadAction(action, registry)).toBe(false)
  })
})
