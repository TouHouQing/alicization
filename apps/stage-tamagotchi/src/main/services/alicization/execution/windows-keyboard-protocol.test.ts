import { describe, expect, it } from 'vitest'

import { decodeWindowsKeyboardReady, decodeWindowsKeyboardResult } from './windows-keyboard-protocol'

const binding = { bindingHash: 'a'.repeat(64), actorProcessId: 40, parentProcessId: 30, receiptRoot: 'C:\\Owned\\input-journal-42', keys: [0xA2, 0x53], repeat: 1 }
const ready = () => ({ type: 'ready', bindingHash: binding.bindingHash, actorStartTicks: '639000000000000001', guardianProcessId: 50, guardianStartTicks: '639000000000000000', receiptRoot: binding.receiptRoot })
const release = () => ({ type: 'guardian-release', bindingHash: binding.bindingHash, inputReleased: true, stopReason: 1, failure: null, readyPreparationMs: 12 })
const result = () => ({ type: 'result', bindingHash: binding.bindingHash, ok: true, completedRounds: 1, insertedEvents: 4, effectMayHaveOccurred: true, inputReleased: true, guardianNormalExit: true, guardianReady: JSON.stringify({ type: 'guardian-ready', bindingHash: binding.bindingHash }), guardianReceipt: `${JSON.stringify(release())}\n`, stopReason: 1, failure: null, ownedKeys: [], receiptRoot: binding.receiptRoot })

describe('native keyboard ownership protocol', () => {
  it('accepts actual native delivery and independently bound guardian release', () => {
    expect(decodeWindowsKeyboardReady(JSON.stringify(ready()), binding).guardianProcessId).toBe(50)
    expect(decodeWindowsKeyboardResult(JSON.stringify(result()), binding).ok).toBe(true)
  })

  it.each([
    { bindingHash: 'b'.repeat(64) },
    { guardianProcessId: 40 },
    { guardianProcessId: 30 },
    { actorStartTicks: '639000000000000001.5' },
    { guardianStartTicks: '639000000000000000.5' },
    { receiptRoot: 'C:\\Owned\\input-journal-other' },
    { receiptRoot: '..\\Owned\\input-journal-42' },
    { unrecognizedAuthority: true },
  ])('rejects forged, borrowed or ambiguous readiness %j', (changed) => {
    expect(() => decodeWindowsKeyboardReady(JSON.stringify({ ...ready(), ...changed }), binding)).toThrow()
  })

  it.each([
    { completedRounds: 0 },
    { insertedEvents: 3 },
    { insertedEvents: 8 },
    { effectMayHaveOccurred: false },
    { inputReleased: false },
    { ownedKeys: [0xA2] },
    { guardianNormalExit: false },
    { failure: 'delivery unknown' },
    { guardianReceipt: '' },
    { guardianReceipt: JSON.stringify({ ...release(), inputReleased: false }) },
    { guardianReceipt: JSON.stringify({ ...release(), bindingHash: 'b'.repeat(64) }) },
    { guardianReady: JSON.stringify({ type: 'guardian-ready', bindingHash: 'b'.repeat(64) }) },
  ])('does not turn incomplete native evidence into success %j', (changed) => {
    expect(() => decodeWindowsKeyboardResult(JSON.stringify({ ...result(), ...changed }), binding)).toThrow()
  })

  it('preserves a cancelled partial batch and unreleased ownership as uncertain', () => {
    const partial = { ...result(), ok: false, completedRounds: 0, insertedEvents: 1, inputReleased: false, guardianNormalExit: false, guardianReceipt: null, failure: 'release not confirmed', ownedKeys: [0xA2] }
    expect(decodeWindowsKeyboardResult(JSON.stringify(partial), binding)).toMatchObject({ ok: false, effectMayHaveOccurred: true, inputReleased: false, ownedKeys: [0xA2] })
    expect(() => decodeWindowsKeyboardResult(JSON.stringify({ ...partial, ownedKeys: [0xA2, 0xA2] }), binding)).toThrow()
    expect(() => decodeWindowsKeyboardResult(JSON.stringify({ ...partial, ownedKeys: [0x41] }), binding)).toThrow()
  })

  it('retains no-input preflight failure without manufacturing execution or success', () => {
    const failure = { ...result(), ok: false, completedRounds: 0, insertedEvents: 0, effectMayHaveOccurred: false, inputReleased: false, guardianNormalExit: false, guardianReady: null, guardianReceipt: null, failure: 'target changed' }
    expect(decodeWindowsKeyboardResult(JSON.stringify(failure), binding)).toMatchObject({ ok: false, effectMayHaveOccurred: false, inputReleased: false })
  })

  it('keeps intentional focus transition evidence while requiring exact repetition', () => {
    const tab = { ...binding, keys: [9] }
    const moved = { ...result(), insertedEvents: 2, stopReason: 3, guardianReceipt: JSON.stringify({ ...release(), stopReason: 3 }) }
    expect(decodeWindowsKeyboardResult(JSON.stringify(moved), tab).ok).toBe(true)
    expect(() => decodeWindowsKeyboardResult(JSON.stringify(moved), { ...tab, repeat: 2 })).toThrow()
  })

  it('rejects oversized or malformed stdout before interpreting authority', () => {
    expect(() => decodeWindowsKeyboardReady('x'.repeat(16_385), binding)).toThrow('budget')
    expect(() => decodeWindowsKeyboardReady('{', binding)).toThrow()
    expect(() => decodeWindowsKeyboardResult(JSON.stringify({ ...result(), unrelated: true }), binding)).toThrow()
  })
})
