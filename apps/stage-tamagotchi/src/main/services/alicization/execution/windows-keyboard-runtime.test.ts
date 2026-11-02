import type { ActionDispatchAuthority } from './action-dispatch-context'
import type { WindowsKeyboardWrite } from './windows-keyboard-writer'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { withActionDispatch } from './action-dispatch-context'
import { createExecutionResourceBroker } from './resource-broker'
import { createWindowsKeyboardRuntime } from './windows-keyboard-runtime'

const native = vi.hoisted(() => ({
  ready: vi.fn(),
  verify: vi.fn(),
  health: vi.fn(),
  dispose: vi.fn(),
  observe: vi.fn(),
  run: vi.fn(),
  releaseOwnedInput: vi.fn(),
  isActive: vi.fn(),
}))
vi.mock('./windows-keyboard-program', () => ({ createWindowsKeyboardProgram: () => ({ ready: native.ready, verify: native.verify, health: native.health, observe: native.observe, dispose: native.dispose }) }))
vi.mock('./windows-keyboard-writer', () => ({ createWindowsKeyboardWriter: () => ({ run: native.run, releaseOwnedInput: native.releaseOwnedInput, isActive: native.isActive }) }))

const target = { windowId: '123', processId: 44, processStartTicks: '639000000000000000', windowClass: 'OwnedFixture', desktop: 'Default', inputDesktop: 'Default', focusWindowId: '124', integrityLevel: 8192 }
beforeEach(() => {
  vi.resetAllMocks()
  native.ready.mockResolvedValue({})
  native.verify.mockResolvedValue(undefined)
  native.health.mockResolvedValue({ checkedAt: Date.now() })
  native.dispose.mockResolvedValue(undefined)
  native.observe.mockResolvedValue(target)
  native.releaseOwnedInput.mockResolvedValue(true)
  native.isActive.mockReturnValue(false)
  native.run.mockImplementation(async (input: WindowsKeyboardWrite) => {
    await input.assertCurrent('prepare')
    await input.assertCurrent('admit')
    await input.assertCurrent('execute')
    return { ok: true, inputReleased: true, writerStopped: true, effectMayHaveOccurred: true, failure: null, receiptRoot: 'owned-journal', native: null }
  })
})
function fixture() {
  const broker = createExecutionResourceBroker()
  const lease = broker.acquire({ owner: 'alice:turn', resources: ['physical-input:desktop'], effectId: 'effect', effectCardId: 'alice' })
  const initial = { ...target, title: 'Owned Fixture', elements: [{ role: 'input', value: 'exact original bytes' }] }
  let observation: typeof initial | null = initial
  let owner = 'alice'
  let current = true
  const authority = { expiresAt: Date.now() + 60_000, capabilityId: 'tool.desktop_press_keys', effectId: 'effect', cardId: owner, turnId: 'turn', resourceLease: lease }
  const check = vi.fn(async (): Promise<ActionDispatchAuthority> => {
    if (!current)
      throw new Error('source withdrawn')
    broker.assert(lease)
    return authority
  })
  const authorize = vi.fn(async () => ({ allow: true, reason: 'host-approved' }))
  const readObservation = vi.fn(async () => observation)
  const onInputTakeover = vi.fn()
  const stableAt = Date.now()
  const runtime = createWindowsKeyboardRuntime({ ownerId: () => owner, protectedRoot: 'C:/OwnedUserData/execution-native', resourceBroker: () => broker, observation: () => observation, observedAt: () => stableAt, readObservation, onInputTakeover, invalidateObservation: () => {
    observation = null
  }, authorize })
  return { runtime, initial, broker, lease, check, authorize, readObservation, onInputTakeover, setObservation: (next: typeof initial | null) => {
    observation = next
  }, setOwner: (next: string) => {
    owner = next
  }, withdraw: () => {
    current = false
  } }
}

describe('desktop keyboard uses the same life action and host resource owner', () => {
  it('keeps full surface readback at the final execute boundary within the original fifteen-second observation budget', async () => {
    let now = Date.now()
    const original = now
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => now)
    try {
      const f = fixture()
      f.readObservation.mockImplementation(async () => {
        now += 6000
        return f.initial
      })
      native.run.mockImplementation(async (input: WindowsKeyboardWrite) => {
        await input.assertCurrent('prepare')
        await input.assertCurrent('admit')
        await input.assertCurrent('execute')
        expect(input.expiresAt).toBeLessThanOrEqual(original + 15_000)
        return { ok: true, inputReleased: true, writerStopped: true, effectMayHaveOccurred: true, failure: null, receiptRoot: 'owned-journal', native: null }
      })
      expect(await withActionDispatch(f.check, () => f.runtime.press({ shortcut: 'Ctrl+S' }))).toMatchObject({ ok: true })
      expect(f.readObservation).toHaveBeenCalledTimes(1)
      expect(now - original).toBe(6000)
    }
    finally { clock.mockRestore() }
  })

  it('still refuses the original stale observation before execute without extending its budget', async () => {
    let now = Date.now()
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => now)
    try {
      const f = fixture()
      const execute = vi.fn()
      native.run.mockImplementation(async (input: WindowsKeyboardWrite) => {
        await input.assertCurrent('prepare')
        await input.assertCurrent('admit')
        now += 15_001
        await input.assertCurrent('execute')
        execute()
      })
      expect(await withActionDispatch(f.check, () => f.runtime.press({ shortcut: 'Ctrl+S' }))).toMatchObject({ ok: false, sideEffectState: 'none', errorMessage: 'WINDOWS_KEYBOARD_OBSERVATION_OWNER_CHANGED' })
      expect(execute).not.toHaveBeenCalled()
      expect(f.readObservation).not.toHaveBeenCalled()
    }
    finally { clock.mockRestore() }
  })

  it('completes one input dispatch while the enclosing effect retains its global input lease', async () => {
    const f = fixture()
    const result = await withActionDispatch(f.check, () => f.runtime.press({ shortcut: 'Tab' }))
    expect(result).toMatchObject({ ok: true, inputReleased: true, writerStopped: true, requiresVerification: true, executionScope: 'bound-shortcut-dispatch-only' })
    expect(f.authorize).not.toHaveBeenCalled()
    expect(native.run).toHaveBeenCalledTimes(1)
    expect(() => f.broker.acquire({ owner: 'other-card', resources: ['physical-input:Default'] })).toThrow()
    f.broker.assert(f.lease)
    f.broker.settle(f.lease, { stopped: true, uncertain: false })
    expect(f.broker.acquire({ owner: 'next-action', resources: ['physical-input:Default'] })).toBeTruthy()
  })

  it('healthy native code alone cannot grant an ungoverned foreground action', async () => {
    const f = fixture()
    expect(await f.runtime.press({ shortcut: 'Tab' })).toMatchObject({ ok: false, sideEffectState: 'none', errorCode: 'WINDOWS_KEYBOARD_DISPATCH_AUTHORITY_REQUIRED' })
    expect(native.run).not.toHaveBeenCalled()
  })

  it('cannot dispatch a second shortcut by reentering the same admitted action', async () => {
    const f = fixture()
    expect(await withActionDispatch(f.check, () => f.runtime.press({ shortcut: 'Tab' }))).toMatchObject({ ok: true })
    f.setObservation(f.initial)
    expect(await withActionDispatch(f.check, () => f.runtime.press({ shortcut: 'Tab' }))).toMatchObject({ ok: false, sideEffectState: 'none', errorCode: 'WINDOWS_KEYBOARD_ACTION_ALREADY_ATTEMPTED' })
    expect(native.run).toHaveBeenCalledTimes(1)
  })

  it('cannot borrow a nested task or another capability permission as a keyboard action', async () => {
    const f = fixture()
    const outer = { ...await f.check(), capabilityId: 'tool.dispatch_task' }
    f.check.mockResolvedValue(outer)
    expect(await withActionDispatch(f.check, () => f.runtime.press({ shortcut: 'Tab' }))).toMatchObject({ ok: false, sideEffectState: 'none', errorCode: 'WINDOWS_KEYBOARD_DISPATCH_AUTHORITY_REQUIRED' })
    expect(native.run).not.toHaveBeenCalled()
  })

  it('a different focused control cannot borrow a previous UIA observation', async () => {
    const f = fixture()
    native.observe.mockResolvedValue({ ...target, focusWindowId: '125' })
    expect(await withActionDispatch(f.check, () => f.runtime.press({ shortcut: 'Tab' }))).toMatchObject({ ok: false, errorCode: 'WINDOWS_KEYBOARD_OBSERVATION_CHANGED' })
    expect(native.run).not.toHaveBeenCalled()
  })

  it('binds consequential shortcut approval to exact target, surface and admitted effect', async () => {
    const f = fixture()
    expect(await withActionDispatch(f.check, () => f.runtime.press({ shortcut: 'Ctrl+S' }))).toMatchObject({ ok: true })
    expect(f.authorize).toHaveBeenCalledWith(expect.objectContaining({ cardId: 'alice', operation: 'desktop_press_keys', riskLevel: 'danger', effectDigest: expect.stringMatching(/^[a-f0-9]{64}$/u), targetFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/u) }), undefined)
    expect(f.readObservation).toHaveBeenCalledTimes(1)
  })

  it('denial causes no native writer and no input ownership handoff', async () => {
    const f = fixture()
    f.authorize.mockResolvedValue({ allow: false, reason: 'host-denied' })
    expect(await withActionDispatch(f.check, () => f.runtime.press({ shortcut: 'Enter' }))).toMatchObject({ ok: false, errorCode: 'ALICIZATION_TOOL_DENIED_BY_HOST' })
    expect(native.run).not.toHaveBeenCalled()
    f.broker.assert(f.lease)
  })

  it('changed approved input bytes invalidate the shortcut before dispatch', async () => {
    const f = fixture()
    f.readObservation.mockResolvedValue({ ...f.initial, elements: [{ role: 'input', value: 'changed bytes' }] })
    expect(await withActionDispatch(f.check, () => f.runtime.press({ shortcut: 'Ctrl+S' }))).toMatchObject({ ok: false, sideEffectState: 'none', errorMessage: 'WINDOWS_KEYBOARD_APPROVED_SURFACE_CHANGED' })
    f.broker.assert(f.lease)
  })

  it('source withdrawal between native readiness and execution rejects the second check', async () => {
    const f = fixture()
    const inserted = vi.fn()
    native.run.mockImplementation(async (input: WindowsKeyboardWrite) => {
      await input.assertCurrent('prepare')
      f.withdraw()
      await input.assertCurrent('execute')
      inserted()
    })
    expect(await withActionDispatch(f.check, () => f.runtime.press({ shortcut: 'Tab' }))).toMatchObject({ ok: false, sideEffectState: 'none', errorMessage: 'source withdrawn' })
    expect(inserted).not.toHaveBeenCalled()
  })

  it('unconfirmed key release quarantines the original effect against every desktop writer', async () => {
    const f = fixture()
    native.run.mockResolvedValue({ ok: false, inputReleased: false, writerStopped: false, effectMayHaveOccurred: true, failure: 'guardian disappeared', receiptRoot: 'owned-journal', native: null })
    native.releaseOwnedInput.mockResolvedValue(false)
    expect(await withActionDispatch(f.check, () => f.runtime.press({ shortcut: 'Tab' }))).toMatchObject({ ok: false, sideEffectState: 'unknown', errorCode: 'WINDOWS_KEYBOARD_RELEASE_UNCONFIRMED' })
    expect(() => f.broker.assert(f.lease)).toThrow()
    expect(() => f.broker.acquire({ owner: 'different-card', resources: ['physical-input:OtherDesktop'] })).toThrow()
    expect((await f.runtime.stop()).stopped).toBe(false)
  })

  it('external input stops the bound life owner while keeping the action outcome unknown', async () => {
    const f = fixture()
    native.run.mockResolvedValue({ ok: false, inputReleased: true, writerStopped: true, effectMayHaveOccurred: true, failure: 'external input', receiptRoot: 'owned-journal', native: { stopReason: 2 } })
    expect(await withActionDispatch(f.check, () => f.runtime.press({ shortcut: 'Tab' }))).toMatchObject({ ok: false, sideEffectState: 'unknown' })
    expect(f.onInputTakeover).toHaveBeenCalledExactlyOnceWith({ cardId: 'alice', turnId: 'turn', effectId: 'effect' })
  })

  it('a changed helper is unavailable even if its previous compilation succeeded', async () => {
    const f = fixture()
    native.verify.mockRejectedValue(new Error('program hash changed'))
    expect(await f.runtime.getHealth()).toMatchObject({ ready: false, reason: 'windows-keyboard-program-unavailable' })
    expect(native.run).not.toHaveBeenCalled()
  })

  it('does not announce a compiled component as ready when Windows refuses its input-free startup', async () => {
    const f = fixture()
    native.health.mockRejectedValue(Object.assign(new Error('WINDOWS_KEYBOARD_PROGRAM_LOAD_FAILED'), { diagnostic: { code: 'EACCES' } }))
    expect(await f.runtime.getHealth()).toMatchObject({ available: true, ready: false, reason: 'windows-keyboard-program-unavailable', diagnostic: { code: 'EACCES' } })
    expect(native.observe).not.toHaveBeenCalled()
    expect(native.run).not.toHaveBeenCalled()
    expect(f.authorize).not.toHaveBeenCalled()
  })

  it('checks native startup without reading the foreground or acquiring input permission', async () => {
    const f = fixture()
    expect(await f.runtime.getHealth()).toMatchObject({ available: true, ready: true })
    expect(native.health).toHaveBeenCalledTimes(1)
    expect(native.observe).not.toHaveBeenCalled()
    expect(f.authorize).not.toHaveBeenCalled()
    expect(native.run).not.toHaveBeenCalled()
  })

  it('reports an unsettled input writer without starting a competing health process', async () => {
    const f = fixture()
    native.isActive.mockReturnValue(true)
    expect(await f.runtime.getHealth()).toMatchObject({ ready: false, reason: 'windows-keyboard-writer-unsettled' })
    expect(native.health).not.toHaveBeenCalled()
  })
})
