import type { ActionDispatchAuthority } from './action-dispatch-context'
import type { WindowsPointerWrite } from './windows-pointer-writer'
import type { WindowsVisualActInput } from './windows-visual-tool-contracts'

import { Buffer } from 'node:buffer'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { describeMainGatewayRequestTarget } from '../main-gateway-request-target'
import { isActionAwaitingHost } from './action-approval-presence'
import { withActionDispatch } from './action-dispatch-context'
import { createExecutionResourceBroker } from './resource-broker'
import { createWindowsVisualRuntime } from './windows-visual-runtime'

const native = vi.hoisted(() => ({ ready: vi.fn(), verify: vi.fn(), health: vi.fn(), observe: vi.fn(), dispose: vi.fn(), capture: vi.fn(), run: vi.fn(), releaseOwnedInput: vi.fn(), isActive: vi.fn() }))
vi.mock('./windows-visual-window-program', () => ({ createWindowsVisualWindowProgram: () => ({ ready: native.ready, health: native.health, capture: native.capture, dispose: native.dispose }) }))
vi.mock('./windows-pointer-program', () => ({ createWindowsPointerProgram: () => ({ ready: native.ready, verify: native.verify, health: native.health, observe: native.observe, dispose: native.dispose }) }))
vi.mock('./windows-pointer-writer', () => ({ createWindowsPointerWriter: () => ({ run: native.run, releaseOwnedInput: native.releaseOwnedInput, isActive: native.isActive }) }))
const owner = { windowId: '123', processId: 44, processStartTicks: '639000000000000000', windowClass: 'OwnedFixture', desktop: 'Default' }
const geometry = { coordinateSpace: 'screen-physical' as const, clientBounds: { left: 100, top: 200, width: 800, height: 600 }, virtualScreen: { left: 0, top: 0, width: 2560, height: 1440 }, displays: [{ left: 0, top: 0, width: 2560, height: 1440 }], imageWidth: 400, imageHeight: 300, dpiX: 144, dpiY: 144 }
const locations = [{ index: 0, state: 'unique' as const, confidence: 0.99, point: { space: 'image-pixel' as const, x: 100, y: 100 }, explanation: 'Visible fixture button' }]
const providerTarget = describeMainGatewayRequestTarget({ providerId: 'owned-vision', model: 'owned-vision-model', baseUrl: 'http://127.0.0.1:12345/v1/' })
const runtimes: ReturnType<typeof createWindowsVisualRuntime>[] = []
function pixels() {
  const bytes = Buffer.alloc(33)
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes)
  bytes.writeUInt32BE(13, 8); bytes.write('IHDR', 12); bytes.writeUInt32BE(400, 16); bytes.writeUInt32BE(300, 20)
  return bytes
}
beforeEach(() => {
  vi.resetAllMocks()
  native.ready.mockResolvedValue({})
  native.verify.mockResolvedValue(undefined)
  native.health.mockResolvedValue({ ready: true })
  native.dispose.mockResolvedValue(undefined)
  native.observe.mockResolvedValue({ ...owner, inputDesktop: 'Default', focusWindowId: '124', integrityLevel: 8192 })
  native.capture.mockImplementation(async () => ({ owner: { ...owner }, geometry: structuredClone(geometry), png: pixels(), observedAt: Date.now(), authority: { userSid: 'S-1-5-21-123-456-789-1001', sessionId: 1, integrityLevel: 8192, ownerWindowId: null } }))
  native.isActive.mockReturnValue(false)
  native.releaseOwnedInput.mockResolvedValue(true)
  native.run.mockImplementation(async (input: WindowsPointerWrite) => {
    await input.assertCurrent('prepare'); await input.assertCurrent('admit'); await input.assertCurrent('execute')
    return { ok: true, inputReleased: true, writerStopped: true, effectMayHaveOccurred: true, failure: null, receiptRoot: 'owned-journal', native: null }
  })
})
afterEach(async () => { for (const runtime of runtimes.splice(0)) await runtime.stop() })
function fixture() {
  const broker = createExecutionResourceBroker()
  const lease = broker.acquire({ owner: 'alice:work', resources: ['physical-input:desktop'], effectId: 'effect', effectCardId: 'alice' })
  let cardId = 'alice'; let capabilityId = 'tool.desktop_locate_window'; let effectId = 'read'; let turnId = 'work-run'; let current = true
  const observation = { ...owner, title: 'Owned Fixture', ownerWindowId: null }
  const observedAt = Date.now()
  const authorize = vi.fn(async () => ({ allow: true, reason: 'host-approved' }))
  const ground = vi.fn(async () => structuredClone(locations))
  const policy = vi.fn(async () => {})
  const source = vi.fn(async () => {})
  const check = vi.fn(async (): Promise<ActionDispatchAuthority> => {
    if (!current)
      throw new Error('source withdrawn')
    broker.assert(lease)
    return { capabilityId, effectId, cardId, turnId, expiresAt: Date.now() + 60_000, resourceLease: lease }
  })
  const runtime = createWindowsVisualRuntime({ ownerId: () => cardId, protectedRoot: 'C:/OwnedUserData/execution-native', observation: () => observation, observedAt: () => observedAt, invalidateObservation: vi.fn(), resourceBroker: () => broker, authorize, ground, providerTarget: () => providerTarget, assertCaptureAllowed: policy, assertWindowSource: source, admitJournal: vi.fn() })
  runtimes.push(runtime)
  const locate = () => withActionDispatch(check, () => runtime.locate({ windowTitle: observation.title, targets: ['fixture button'] }))
  const act = (observationId: string) => {
    capabilityId = 'tool.desktop_pointer_action'; effectId = 'write'
    return withActionDispatch(check, () => runtime.act({ kind: 'click', button: 'left', targetIndex: 0, observationId } as WindowsVisualActInput))
  }
  return { runtime, broker, lease, authorize, ground, policy, source, locate, act, setOwner: (id: string) => { cardId = id }, setTurn: (id: string) => { turnId = id }, withdraw: () => { current = false } }
}
describe('visual execution keeps the same life, source, privacy and input resource owners', () => {
  it('can initialize, probe and close before the life input resources are composed', async () => {
    const resourceBroker = vi.fn(() => { throw new Error('Life input resources not initialized yet') })
    const runtime = createWindowsVisualRuntime({ ownerId: () => 'alice', protectedRoot: 'C:/OwnedUserData/execution-native', resourceBroker, observation: () => null, observedAt: () => 0, invalidateObservation: vi.fn(), ground: vi.fn(), providerTarget: () => providerTarget, assertCaptureAllowed: vi.fn(), assertWindowSource: vi.fn(), admitJournal: vi.fn() })
    runtimes.push(runtime)
    expect(await runtime.getHealth()).toMatchObject({ available: true, ready: true })
    await runtime.stop()
    expect(resourceBroker).not.toHaveBeenCalled()
  })
  it('refuses an unbound last-observed window before approval, capture or external transmission', async () => {
    const f = fixture()
    f.source.mockRejectedValue(new Error('WINDOWS_VISUAL_BOUND_WINDOW_REQUIRED'))
    expect(await f.locate()).toMatchObject({ ok: false, errorCode: 'WINDOWS_VISUAL_BOUND_WINDOW_REQUIRED' })
    expect(f.authorize).not.toHaveBeenCalled()
    expect(native.capture).not.toHaveBeenCalled()
    expect(f.ground).not.toHaveBeenCalled()
  })
  it('refuses a changed native popup owner before transmitting identical-looking window pixels', async () => {
    const f = fixture()
    native.capture.mockImplementation(async () => ({ owner, geometry, png: pixels(), observedAt: Date.now(), authority: { userSid: 'S-1-5-21-123-456-789-1001', sessionId: 1, integrityLevel: 8192, ownerWindowId: '987' } }))
    expect(await f.locate()).toMatchObject({ ok: false, errorCode: 'WINDOWS_VISUAL_OWNER_CONTEXT_CHANGED' })
    expect(f.authorize).toHaveBeenCalledTimes(1)
    expect(f.ground).not.toHaveBeenCalled()
  })
  it('connects two fresh same-image observations, policy and grounded points to one finite governed writer', async () => {
    const f = fixture()
    const observed = await f.locate()
    expect(observed).toMatchObject({ ok: true, taskCompletionProven: false, coordinateSpace: 'screen-physical' })
    expect(native.capture).toHaveBeenCalledTimes(2)
    expect(f.authorize).toHaveBeenCalledTimes(2)
    native.observe.mockImplementationOnce(async () => {
      expect(isActionAwaitingHost('alice', 'write')).toBe(true)
      return { ...owner, inputDesktop: 'Default', focusWindowId: '124', integrityLevel: 8192 }
    })
    expect(await f.act(String('observationId' in observed && observed.observationId))).toMatchObject({ ok: true, requiresVerification: true, taskCompletionProven: false, executionScope: 'bound-mouse-delivery-only' })
    expect(native.run).toHaveBeenCalledTimes(1)
    expect(isActionAwaitingHost('alice', 'write')).toBe(false)
    expect(native.run.mock.calls[0][0]).toMatchObject({ action: { kind: 'click', button: 'left', point: locations[0].point }, owner: { cardId: 'alice', turnId: 'work-run', leaseId: f.lease.id } })
    expect(JSON.stringify(native.run.mock.calls[0][0])).not.toContain('png')
    expect(() => f.broker.acquire({ owner: 'other', resources: ['physical-input:Default'] })).toThrow()
    f.broker.assert(f.lease)
  })
  it('refuses capture before asking for approval when current host policy excludes screenshots', async () => {
    const f = fixture()
    f.policy.mockRejectedValue(new Error('LOCAL_VISUAL_CAPTURE_NOT_AUTHORIZED'))
    expect(await f.locate()).toMatchObject({ ok: false, errorCode: 'LOCAL_VISUAL_CAPTURE_NOT_AUTHORIZED' })
    expect(f.authorize).not.toHaveBeenCalled(); expect(native.capture).not.toHaveBeenCalled(); expect(f.ground).not.toHaveBeenCalled()
  })
  it.each([1, 2])('host denial at privacy gate %s cannot reach the next phase', async (gate) => {
    const f = fixture()
    if (gate === 2)
      f.authorize.mockResolvedValueOnce({ allow: true, reason: 'host-approved' })
    f.authorize.mockResolvedValue({ allow: false, reason: 'host-denied' })
    expect(await f.locate()).toMatchObject({ ok: false, errorCode: 'ALICIZATION_TOOL_DENIED_BY_HOST' })
    expect(native.capture).toHaveBeenCalledTimes(gate - 1)
    expect(f.ground).not.toHaveBeenCalled(); expect(native.run).not.toHaveBeenCalled()
  })
  it('changed pixels during vision analysis cannot enter the action cache', async () => {
    const f = fixture()
    const captures: Buffer[] = []
    native.capture.mockImplementation(async () => {
      const png = pixels(); if (captures.length)
        png[32] = 1; captures.push(png)
      return { owner, geometry, png, observedAt: Date.now(), authority: { userSid: 'S-1-5-21-123-456-789-1001', sessionId: 1, integrityLevel: 8192, ownerWindowId: null } }
    })
    expect(await f.locate()).toMatchObject({ ok: false, errorCode: 'WINDOWS_VISUAL_SOURCE_IMAGE_CHANGED_DURING_GROUNDING' })
    expect(captures.every(bytes => bytes.every(byte => byte === 0))).toBe(true)
    expect(native.run).not.toHaveBeenCalled()
  })
  it('a denied mutation burns its image reference and cannot be replayed', async () => {
    const f = fixture()
    const observed = await f.locate()
    const id = String('observationId' in observed && observed.observationId)
    f.authorize.mockResolvedValue({ allow: false, reason: 'host-denied' })
    expect(await f.act(id)).toMatchObject({ ok: false, errorCode: 'ALICIZATION_TOOL_DENIED_BY_HOST' })
    f.authorize.mockResolvedValue({ allow: true, reason: 'host-approved' })
    expect(await f.act(id)).toMatchObject({ ok: false })
    expect(native.run).not.toHaveBeenCalled()
  })
  it('projects an authenticated writer preflight refusal for a fresh host-reviewed observation', async () => {
    const f = fixture()
    const observed = await f.locate()
    // The native writer authenticates this port result; its real protocol and
    // immutable actor receipt checks are exercised by separate native tests.
    const noInput = { type: 'preflight-refused', bindingHash: 'a'.repeat(64), actorProcessId: 44, actorStartTicks: '639000000000000000', parentProcessId: 55, parentStartTicks: '639000000000000001', receiptRoot: 'C:/OwnedUserData/execution-native/pointer-abc123/owned-receipt', guardianStarted: false, hooksInstalled: false, insertedEvents: 0, effectMayHaveOccurred: false, stopReason: 3, failure: 'WINDOWS_POINTER_OBSERVATION_CHANGED' } as const
    native.run.mockResolvedValue({ ok: false, inputReleased: true, writerStopped: true, effectMayHaveOccurred: false, failure: noInput.failure, noInput, native: null, receiptRoot: noInput.receiptRoot })
    expect(await f.act(String('observationId' in observed && observed.observationId))).toMatchObject({ ok: false, errorCode: noInput.failure, sideEffectState: 'none', effectMayHaveOccurred: false, noInputReceipt: noInput, taskCompletionProven: false })
  })
  it('another work run cannot borrow a retained observation', async () => {
    const f = fixture(); const observed = await f.locate(); f.setTurn('different-work-run')
    expect(await f.act(String('observationId' in observed && observed.observationId))).toMatchObject({ ok: false })
    expect(native.run).not.toHaveBeenCalled()
  })
  it('ambiguous or weak visual evidence cannot become a mouse action', async () => {
    const f = fixture(); f.ground.mockResolvedValue([{ ...locations[0], confidence: 0.8 }])
    const observed = await f.locate()
    expect(await f.act(String('observationId' in observed && observed.observationId))).toMatchObject({ ok: false, errorCode: 'WINDOWS_VISUAL_TARGET_NOT_UNAMBIGUOUS' })
    expect(native.run).not.toHaveBeenCalled()
  })
  it('source withdrawal during actual writer preparation retains an uncertain effect and releases only confirmed input', async () => {
    const f = fixture(); const observed = await f.locate()
    native.run.mockImplementation(async (input: WindowsPointerWrite) => { f.withdraw(); await input.assertCurrent('execute') })
    expect(await f.act(String('observationId' in observed && observed.observationId))).toMatchObject({ ok: false, sideEffectState: 'unknown' })
  })
})
