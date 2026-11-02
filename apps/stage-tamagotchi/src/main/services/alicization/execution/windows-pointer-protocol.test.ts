import { describe, expect, it } from 'vitest'

import { decodeWindowsPointerNoInput, decodeWindowsPointerResult } from './windows-pointer-protocol'

const binding = { bindingHash: 'a'.repeat(64), actorProcessId: 11, parentProcessId: 12, parentStartTicks: '639000000000000000', receiptRoot: 'C:\\Owned\\input-journal-42', keys: [1], repeat: 1, expectedEvents: 19 }
const guardian = { type: 'guardian-release', bindingHash: binding.bindingHash, inputReleased: true, stopReason: 1, failure: null, readyPreparationMs: 3 }
const result = { type: 'result', bindingHash: binding.bindingHash, ok: true, completedRounds: 1, insertedEvents: 19, effectMayHaveOccurred: true, inputReleased: true, guardianNormalExit: true, guardianReady: JSON.stringify({ type: 'guardian-ready', bindingHash: binding.bindingHash }), guardianReceipt: JSON.stringify(guardian), stopReason: 1, failure: null, ownedKeys: [], receiptRoot: binding.receiptRoot }

describe('native pointer delivery is distinct from keyboard chord counts', () => {
  it('separates a pre-hook refusal from input delivery and verifies the original parent lifetime', () => {
    const refusal = { type: 'preflight-refused', bindingHash: binding.bindingHash, actorProcessId: binding.actorProcessId, actorStartTicks: '639000000000000001', parentProcessId: binding.parentProcessId, parentStartTicks: binding.parentStartTicks, receiptRoot: binding.receiptRoot, guardianStarted: false, hooksInstalled: false, insertedEvents: 0, effectMayHaveOccurred: false, stopReason: 7, failure: 'WINDOWS_VISUAL_WINDOW_IDENTITY_CHANGED' }
    expect(decodeWindowsPointerNoInput(JSON.stringify(refusal), binding)).toMatchObject({ guardianStarted: false, hooksInstalled: false, insertedEvents: 0 })
    for (const change of [{ actorProcessId: 99 }, { parentStartTicks: '639000000000000002' }, { hooksInstalled: true }, { guardianStarted: true }, { insertedEvents: 1 }, { effectMayHaveOccurred: true }]) expect(() => decodeWindowsPointerNoInput(JSON.stringify({ ...refusal, ...change }), binding)).toThrow()
    expect(() => decodeWindowsPointerResult(JSON.stringify(refusal), binding)).toThrow()
  })
  it('requires all finite drag moves plus down/up and independently attested release', () => {
    expect(decodeWindowsPointerResult(JSON.stringify(result), binding)).toMatchObject({ ok: true, insertedEvents: 19 })
  })
  it.each([{ insertedEvents: 2 }, { insertedEvents: 20 }, { completedRounds: 0 }, { inputReleased: false }, { guardianNormalExit: false }, { effectMayHaveOccurred: false }, { ownedKeys: [1] }, { guardianReceipt: JSON.stringify({ ...guardian, inputReleased: false }) }, { guardianReceipt: JSON.stringify({ ...guardian, bindingHash: 'b'.repeat(64) }) }])('rejects unsupported completion facts %j', (change) => {
    expect(() => decodeWindowsPointerResult(JSON.stringify({ ...result, ...change }), binding)).toThrow()
  })
  it('supports a complete wheel operation with zero button ownership', () => {
    expect(decodeWindowsPointerResult(JSON.stringify({ ...result, insertedEvents: 2 }), { ...binding, keys: [], expectedEvents: 2 }).ok).toBe(true)
  })
  it('preserves partially inserted drag and unconfirmed button release as uncertain', () => {
    expect(decodeWindowsPointerResult(JSON.stringify({ ...result, ok: false, completedRounds: 0, insertedEvents: 7, inputReleased: false, guardianNormalExit: false, ownedKeys: [1], failure: 'WINDOWS_POINTER_DELIVERY_NOT_CONFIRMED' }), binding)).toMatchObject({ ok: false, inputReleased: false, ownedKeys: [1], effectMayHaveOccurred: true })
  })
})
