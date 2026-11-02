import type { LifeInterfaceAuthorization, LifeInterfaceRiskRequest } from '../life-interface-risk'
import type { AlicizationLocalDesktopPressKeysInput } from '../local-browser-automation'
import type { ExecutionResourceBroker, ResourceLease } from './resource-broker'
import type { WindowsKeyboardJournalAdmission } from './windows-keyboard-journal'
import type { WindowsKeyboardTarget } from './windows-keyboard-program'
import type { WindowsKeyboardWrite } from './windows-keyboard-writer'

import { errorMessageFrom } from '@moeru/std'

import { executionDigest } from './acceptance-compiler'
import { assertActionDispatchCurrent } from './action-dispatch-context'
import { createForegroundBroker } from './foreground-broker'
import { createWindowsKeyboardProgram } from './windows-keyboard-program'
import { compileWindowsKeyboardShortcut } from './windows-keyboard-shortcut'
import { createWindowsKeyboardWriter } from './windows-keyboard-writer'

export interface KeyboardDesktopObservation {
  windowId: string
  processId: number
  processStartTicks: string
  windowClass: string
  desktop: string
  focusWindowId?: string | null
  title: string
  elements: readonly unknown[]
}
const foregroundTarget = (target: WindowsKeyboardTarget) => ({ desktop: target.desktop, windowId: target.windowId, processId: target.processId, fingerprint: executionDigest(target) })

/**
 * Desktop-owned adapter: observation/risk/authority and the global resource
 * owner remain outside the native input kernel. No model HWND grants access.
 */
export function createWindowsKeyboardRuntime(options: {
  ownerId: () => string
  protectedRoot: string
  resourceBroker: () => ExecutionResourceBroker
  observation: () => KeyboardDesktopObservation | null
  observedAt: () => number
  readObservation: (expected: KeyboardDesktopObservation, signal?: AbortSignal) => Promise<KeyboardDesktopObservation | null>
  invalidateObservation: () => void
  onInputTakeover?: (input: { cardId: string, turnId: string, effectId: string }) => void
  admitJournal?: (admission: WindowsKeyboardJournalAdmission) => Promise<void>
  authorize?: (request: LifeInterfaceRiskRequest, signal?: AbortSignal) => Promise<LifeInterfaceAuthorization>
}) {
  const program = createWindowsKeyboardProgram(options.protectedRoot)
  const writer = createWindowsKeyboardWriter(program, undefined, options.admitJournal)
  const attemptedLeases = new WeakSet<ResourceLease>()
  let foreground: ReturnType<typeof createForegroundBroker> | undefined
  const broker = () => foreground ??= createForegroundBroker(options.resourceBroker(), { readTarget: async () => foregroundTarget(await program.observe()), releaseOwnedInput: writer.releaseOwnedInput })
  const failure = (errorCode: string, errorMessage?: string) => ({ channel: 'desktop', operation: 'desktop_press_keys', status: 'failed', ok: false, sideEffectState: 'none', errorCode, errorMessage, requiresReadback: true })
  async function press(input: AlicizationLocalDesktopPressKeysInput) {
    let lease: ResourceLease | undefined
    let result: Record<string, unknown> | undefined
    try {
      input.abortSignal?.throwIfAborted()
      const chord = compileWindowsKeyboardShortcut(input.shortcut, input.repeat ?? 1)
      const dispatchBinding = { capabilityId: 'tool.desktop_press_keys', parameters: { shortcut: input.shortcut, ...(input.repeat === undefined ? {} : { repeat: input.repeat }) } }
      await program.ready()
      const observed = options.observation()
      const observedAt = options.observedAt()
      const owner = options.ownerId()
      if (!observed?.focusWindowId || Date.now() - observedAt > 15_000)
        return failure('WINDOWS_KEYBOARD_FRESH_FOREGROUND_OBSERVATION_REQUIRED')
      const initial = await assertActionDispatchCurrent(true, dispatchBinding)
      if (!initial?.effectId || initial.capabilityId !== dispatchBinding.capabilityId || initial.cardId !== owner || !initial.turnId || initial.expiresAt === null || !initial.resourceLease)
        return failure('WINDOWS_KEYBOARD_DISPATCH_AUTHORITY_REQUIRED')
      if (attemptedLeases.has(initial.resourceLease))
        return failure('WINDOWS_KEYBOARD_ACTION_ALREADY_ATTEMPTED')
      // Burn this main-owned action before a wait or approval. Retries need a
      // newly admitted effect; weak ownership does not accumulate old turns.
      attemptedLeases.add(initial.resourceLease)
      const target = await program.observe()
      if (['windowId', 'processId', 'processStartTicks', 'windowClass', 'desktop', 'focusWindowId'].some(key => observed[key as keyof KeyboardDesktopObservation] !== target[key as keyof WindowsKeyboardTarget]))
        return failure('WINDOWS_KEYBOARD_OBSERVATION_CHANGED')
      const surfaceHash = executionDigest({ title: observed.title, elements: observed.elements })
      const navigation = /^(?:Shift\+)?(?:Tab|ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Home|End|PageUp|PageDown)$/u.test(chord.shortcut)
      const bindingHash = executionDigest({ cardId: owner, effectId: initial.effectId, turnId: initial.turnId, lease: initial.resourceLease, target, surfaceHash, shortcut: chord.shortcut, repeat: chord.repeat })
      if (!navigation) {
        const decision = await options.authorize?.({ cardId: owner, operation: 'desktop_press_keys', targetId: JSON.stringify(target), label: `${observed.title}: ${chord.shortcut}`, effectDigest: bindingHash, targetFingerprint: executionDigest({ target, surfaceHash }), riskLevel: 'danger', actionCategory: 'execute', reason: 'Review this exact shortcut and observed application. Its application-specific effect can write, discard or transmit data.' }, input.abortSignal)
        input.abortSignal?.throwIfAborted()
        if (!decision?.allow)
          return failure(decision?.reason === 'host-denied' ? 'ALICIZATION_TOOL_DENIED_BY_HOST' : 'LOCAL_INTERFACE_CONFIRMATION_UNAVAILABLE')
      }
      const checkOwner = () => {
        input.abortSignal?.throwIfAborted()
        if (options.ownerId() !== owner || options.observation() !== observed || options.observedAt() !== observedAt || Date.now() - observedAt > 15_000)
          throw new Error('WINDOWS_KEYBOARD_OBSERVATION_OWNER_CHANGED')
      }
      checkOwner()
      lease = await broker().acquire(initial.resourceLease.owner, foregroundTarget(target), initial.resourceLease)
      const expiresAt = Math.min(initial.expiresAt, lease.expiresAt, Date.now() + 15_000)
      const assertCurrent: WindowsKeyboardWrite['assertCurrent'] = async (phase) => {
        checkOwner()
        const authority = await assertActionDispatchCurrent(true, dispatchBinding)
        if (!authority || authority.effectId !== initial.effectId || authority.cardId !== owner || authority.turnId !== initial.turnId || authority.resourceLease?.id !== lease!.id || authority.expiresAt === null || authority.expiresAt < expiresAt)
          throw new Error('WINDOWS_KEYBOARD_ACTION_OWNER_CHANGED')
        await broker().beforeInjection(lease!)
        // The actor cannot inject before execute. Recheck the full approved
        // surface at that boundary; earlier checks still fence source, owner,
        // foreground and expiry without spawning duplicate UIA workers.
        if (!navigation && phase === 'execute') {
          const actual = await options.readObservation(observed, input.abortSignal)
          if (!actual || executionDigest({ title: actual.title, elements: actual.elements }) !== surfaceHash)
            throw new Error('WINDOWS_KEYBOARD_APPROVED_SURFACE_CHANGED')
        }
        await assertActionDispatchCurrent(true, dispatchBinding)
        options.resourceBroker().assert(lease!)
        checkOwner()
      }
      const outcome = await writer.run({ target, shortcut: chord.shortcut, repeat: chord.repeat, bindingHash, owner: { cardId: owner, turnId: initial.turnId, effectId: initial.effectId, leaseId: lease.id, epoch: lease.epoch, fencingToken: lease.fencingToken }, expiresAt, assertCurrent, signal: input.abortSignal })
      result = { channel: 'desktop', operation: 'desktop_press_keys', status: outcome.ok ? 'completed' : 'failed', ok: outcome.ok, finalStatus: outcome.ok ? 'completed' : 'failed', sideEffectState: outcome.effectMayHaveOccurred ? outcome.ok ? 'executed' : 'unknown' : 'none', shortcut: chord.shortcut, repeat: chord.repeat, requiresReadback: true, requiresVerification: true, inputReleased: outcome.inputReleased, writerStopped: outcome.writerStopped, receiptRoot: outcome.receiptRoot, nativeReceipt: outcome.native, errorCode: outcome.ok ? null : 'WINDOWS_KEYBOARD_EXECUTION_UNCONFIRMED', errorMessage: outcome.failure, executionScope: 'bound-shortcut-dispatch-only' }
      if (outcome.native?.stopReason === 2)
        options.onInputTakeover?.({ cardId: owner, turnId: initial.turnId, effectId: initial.effectId })
      return result
    }
    catch (error) {
      return failure('WINDOWS_KEYBOARD_DISPATCH_REFUSED', errorMessageFrom(error))
    }
    finally {
      options.invalidateObservation()
      if (lease) {
        const release = await broker().release(lease)
        if (!release.stopped && result) {
          Object.assign(result, { ok: false, status: 'failed', finalStatus: 'failed', sideEffectState: 'unknown', inputReleased: false, writerStopped: false, errorCode: 'WINDOWS_KEYBOARD_RELEASE_UNCONFIRMED' })
        }
      }
    }
  }
  async function getHealth() {
    try {
      await program.verify(await program.ready())
      if (!writer.isActive())
        await program.health()
      return { available: true, ready: !writer.isActive(), reason: writer.isActive() ? 'windows-keyboard-writer-unsettled' : null, observedAt: Date.now() }
    }
    catch (error) {
      return { available: true, ready: false, reason: 'windows-keyboard-program-unavailable', observedAt: Date.now(), diagnostic: error && typeof error === 'object' && 'diagnostic' in error ? error.diagnostic : { error: errorMessageFrom(error) } }
    }
  }
  async function stop() {
    options.invalidateObservation()
    const release = foreground ? foreground.takeOver() : writer.releaseOwnedInput().then(stopped => ({ stopped, state: stopped ? 'stopped' : 'awaiting-input-release' }))
    const [outcome] = await Promise.all([release, program.dispose()])
    return outcome
  }
  return { press, getHealth, stop, isWriting: writer.isActive }
}
