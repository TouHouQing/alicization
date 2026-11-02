import type { LifeInterfaceAuthorization, LifeInterfaceRiskRequest } from '../life-interface-risk'
import type { MainGatewayRequestTarget } from '../main-gateway-request-target'
import type { ExecutionResourceBroker, ResourceLease } from './resource-broker'
import type { WindowsPointerJournalAdmission } from './windows-pointer-journal'
import type { WindowsVisualGroundingInput, WindowsVisualLocation } from './windows-visual-grounder'
import type { WindowsVisualActInput, WindowsVisualLocateInput } from './windows-visual-tool-contracts'
import type { WindowsVisualWorkWindowBinding } from './windows-visual-work-source'
import type { WindowsWindowIdentity } from './windows-window-identity'

import { createHash } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

import { errorMessageFrom } from '@moeru/std'

import * as v from 'valibot'

import { sameMainGatewayRequestTarget } from '../main-gateway-request-target'
import { executionDigest } from './acceptance-compiler'
import { withActionApprovalWait } from './action-approval-presence'
import { assertActionDispatchCurrent, markActionNotStarted } from './action-dispatch-context'
import { createForegroundBroker } from './foreground-broker'
import { createVisualWindowObservations } from './visual-window-observation'
import { createWindowsPointerProgram } from './windows-pointer-program'
import { createWindowsPointerWriter } from './windows-pointer-writer'
import { resolveWindowsVisualAction, windowsVisualActSchema, windowsVisualLocateSchema } from './windows-visual-tool-contracts'
import { createWindowsVisualWindowProgram } from './windows-visual-window-program'
import { windowsWindowIdentitySchema } from './windows-window-identity'

interface ObservedWindow extends WindowsWindowIdentity { title: string, ownerWindowId?: string | null }
const target = (owner: WindowsWindowIdentity) => ({ desktop: owner.desktop, windowId: owner.windowId, processId: owner.processId, fingerprint: executionDigest(v.parse(windowsWindowIdentitySchema, { windowId: owner.windowId, processId: owner.processId, processStartTicks: owner.processStartTicks, windowClass: owner.windowClass, desktop: owner.desktop })) })

/** A visual fallback remains subordinate to the same life action owner. */
export function createWindowsVisualRuntime(options: {
  ownerId: () => string
  protectedRoot: string
  resourceBroker: () => ExecutionResourceBroker
  observation: () => ObservedWindow | null
  observedAt: () => number
  invalidateObservation: () => void
  authorize?: (request: LifeInterfaceRiskRequest, signal?: AbortSignal) => Promise<LifeInterfaceAuthorization>
  ground: (input: WindowsVisualGroundingInput) => Promise<WindowsVisualLocation[]>
  providerTarget: () => MainGatewayRequestTarget | null
  assertCaptureAllowed: (turnId: string) => Promise<void>
  assertWindowSource: (binding: WindowsVisualWorkWindowBinding) => Promise<void>
  admitJournal: (admission: WindowsPointerJournalAdmission) => Promise<void>
  onInputTakeover?: (owner: { cardId: string, turnId: string, effectId: string }) => void
}) {
  const reader = createWindowsVisualWindowProgram(options.protectedRoot)
  const program = createWindowsPointerProgram(options.protectedRoot)
  const writer = createWindowsPointerWriter(program, undefined, options.admitJournal)
  const images = createVisualWindowObservations()
  const attemptedLeases = new WeakSet<ResourceLease>()
  let pending = false
  let closed = false
  // The life composition supplies this dependency before actions, after this
  // service is constructed. Health and shutdown must not acquire input owners.
  let foreground: ReturnType<typeof createForegroundBroker> | undefined
  const broker = () => foreground ??= createForegroundBroker(options.resourceBroker(), { readTarget: async () => target(await program.observe()), releaseOwnedInput: writer.releaseOwnedInput })
  function failure(operation: string, reason: string) {
    return markActionNotStarted({ channel: 'desktop', operation, ok: false, status: 'failed', errorCode: reason, sideEffectState: 'none' as const, effectMayHaveOccurred: false as const })
  }
  function checkOwner(cardId: string) {
    if (closed || options.ownerId() !== cardId) {
      images.clear()
      throw new Error('WINDOWS_VISUAL_OWNER_CHANGED')
    }
  }
  async function locate(input: WindowsVisualLocateInput) {
    const operation = 'desktop_locate_window'
    if (pending || writer.isActive() || closed)
      return failure(operation, 'WINDOWS_VISUAL_BUSY')
    pending = true
    let png: Uint8Array | undefined
    try {
      const { abortSignal, ...raw } = input
      const parameters = v.parse(windowsVisualLocateSchema, raw)
      const owner = options.ownerId()
      const observed = options.observation()
      const observedAt = options.observedAt()
      if (!observed || observed.title !== parameters.windowTitle || Date.now() - observedAt > 15_000)
        return failure(operation, 'WINDOWS_VISUAL_FRESH_SEMANTIC_WINDOW_REQUIRED')
      if (!Object.hasOwn(observed, 'ownerWindowId') || observed.ownerWindowId === undefined)
        return failure(operation, 'WINDOWS_VISUAL_OWNER_CONTEXT_REQUIRED')
      const ownerWindowId = observed.ownerWindowId
      const identity = v.parse(windowsWindowIdentitySchema, { windowId: observed.windowId, processId: observed.processId, processStartTicks: observed.processStartTicks, windowClass: observed.windowClass, desktop: observed.desktop })
      const binding = { capabilityId: `tool.${operation}`, parameters }
      const initial = await assertActionDispatchCurrent(false, binding)
      if (!initial?.effectId || initial.cardId !== owner || !initial.turnId || initial.expiresAt === null)
        return failure(operation, 'WINDOWS_VISUAL_ACTION_AUTHORITY_REQUIRED')
      const providerTarget = options.providerTarget()
      if (!providerTarget)
        return failure(operation, 'WINDOWS_VISUAL_PROVIDER_UNCONFIGURED')
      const assertCurrent = async () => {
        abortSignal?.throwIfAborted()
        checkOwner(owner)
        await options.assertCaptureAllowed(initial.turnId!)
        await options.assertWindowSource({ effectId: initial.effectId!, turnId: initial.turnId!, window: { ...identity, title: observed.title, ownerWindowId } })
        if (!sameMainGatewayRequestTarget(options.providerTarget(), providerTarget))
          throw new Error('WINDOWS_VISUAL_PROVIDER_TARGET_CHANGED')
        if (options.observation() !== observed || options.observedAt() !== observedAt)
          throw new Error('WINDOWS_VISUAL_SOURCE_OBSERVATION_CHANGED')
        const current = await assertActionDispatchCurrent(false, binding)
        if (!current || current.effectId !== initial.effectId || current.cardId !== owner || current.turnId !== initial.turnId || current.expiresAt === null || current.expiresAt <= Date.now())
          throw new Error('WINDOWS_VISUAL_ACTION_AUTHORITY_CHANGED')
        checkOwner(owner)
      }
      await assertCurrent()
      const captureDecision = await options.authorize?.({ cardId: owner, operation, targetId: JSON.stringify(identity), label: parameters.windowTitle, riskLevel: 'sensitive', actionCategory: 'read', targetFingerprint: executionDigest(identity), effectDigest: executionDigest({ identity, parameters, effectId: initial.effectId }), reason: 'Read one exact application window image for the requested target. The image is retained briefly in local memory, not in long-term memory.' }, abortSignal)
      if (!captureDecision?.allow)
        return failure(operation, captureDecision?.reason === 'host-denied' ? 'ALICIZATION_TOOL_DENIED_BY_HOST' : 'LOCAL_INTERFACE_CONFIRMATION_UNAVAILABLE')
      await assertCurrent()
      const capture = await reader.capture(identity, abortSignal)
      png = capture.png
      if (capture.authority.ownerWindowId !== ownerWindowId)
        throw new Error('WINDOWS_VISUAL_OWNER_CONTEXT_CHANGED')
      const imageSha256 = createHash('sha256').update(capture.png).digest('hex')
      const transmission = await options.authorize?.({ cardId: owner, operation, targetId: JSON.stringify({ window: identity, destination: providerTarget.origin }), label: parameters.windowTitle, riskLevel: 'sensitive', actionCategory: 'network', targetFingerprint: executionDigest({ identity, providerTarget }), effectDigest: executionDigest({ identity, imageSha256, parameters, providerTarget, effectId: initial.effectId }), imagePreview: { png: capture.png, sha256: imageSha256, markers: [] }, previewText: `${providerTarget.origin}\n${providerTarget.model}\n${parameters.targets.join('\n')}`, reason: 'Send this exact captured window image to the displayed provider and model. A changed route or account requires a fresh review.' }, abortSignal)
      if (!transmission?.allow)
        return failure(operation, transmission?.reason === 'host-denied' ? 'ALICIZATION_TOOL_DENIED_BY_HOST' : 'LOCAL_INTERFACE_CONFIRMATION_UNAVAILABLE')
      const locations = await options.ground({ cardId: owner, turnId: initial.turnId, providerTarget, png: capture.png, geometry: capture.geometry, targets: parameters.targets, signal: abortSignal, assertCurrent })
      await assertCurrent()
      const fresh = await reader.capture(identity, abortSignal)
      capture.png.fill(0)
      png = fresh.png
      if (createHash('sha256').update(fresh.png).digest('hex') !== imageSha256 || executionDigest(fresh.geometry) !== executionDigest(capture.geometry) || executionDigest(fresh.authority) !== executionDigest(capture.authority))
        throw new Error('WINDOWS_VISUAL_SOURCE_IMAGE_CHANGED_DURING_GROUNDING')
      await assertCurrent()
      images.selectCard(owner)
      const observation = images.admit({ ...fresh, native: { authority: fresh.authority, locations, title: observed.title } }, { cardId: owner, contextHash: executionDigest({ cardId: owner, turnId: initial.turnId }) })
      return { channel: 'desktop', operation, ok: true, status: 'completed', observationId: observation.id, imageSha256: observation.imageSha256, observedAt: observation.observedAt, expiresAt: observation.expiresAt, locations, geometry: observation.geometry, windowBounds: { ...observation.geometry.clientBounds }, coordinateSpace: 'screen-physical', windowVisible: true, ...identity, ownerWindowId: fresh.authority.ownerWindowId, title: observed.title, executionScope: 'single-window-visual-localization-only', taskCompletionProven: false }
    }
    catch (error) { return failure(operation, errorMessageFrom(error) ?? 'WINDOWS_VISUAL_LOCATE_FAILED') }
    finally {
      png?.fill(0)
      pending = false
    }
  }
  async function act(input: WindowsVisualActInput) {
    const operation = 'desktop_pointer_action'
    if (pending || writer.isActive() || closed)
      return failure(operation, 'WINDOWS_VISUAL_BUSY')
    pending = true
    let lease: ResourceLease | undefined
    let outcome: Record<string, unknown> | undefined
    let nativeStarted = false
    let previewPixels: Uint8Array | undefined
    let nativeExpiresAt: number | undefined
    try {
      const { abortSignal, ...raw } = input
      const parameters = v.parse(windowsVisualActSchema, raw)
      const owner = options.ownerId()
      const binding = { capabilityId: `tool.${operation}`, parameters }
      const initial = await assertActionDispatchCurrent(true, binding)
      if (!initial?.effectId || initial.cardId !== owner || !initial.turnId || initial.expiresAt === null || !initial.resourceLease)
        return failure(operation, 'WINDOWS_VISUAL_ACTION_AUTHORITY_REQUIRED')
      if (attemptedLeases.has(initial.resourceLease))
        return failure(operation, 'WINDOWS_VISUAL_ACTION_ALREADY_ATTEMPTED')
      attemptedLeases.add(initial.resourceLease)
      images.selectCard(owner)
      const captured = images.consume(parameters.observationId, { cardId: owner, contextHash: executionDigest({ cardId: owner, turnId: initial.turnId }) })
      previewPixels = captured.png
      if (!captured.native)
        throw new Error('WINDOWS_VISUAL_NATIVE_AUTHORITY_MISSING')
      const snapshot = { owner: captured.facts.owner, geometry: captured.facts.geometry, authority: captured.native.authority, imageSha256: captured.facts.imageSha256 }
      const sourceBinding = { effectId: initial.effectId, turnId: initial.turnId, observationId: parameters.observationId, window: { ...snapshot.owner, title: captured.native.title, ownerWindowId: snapshot.authority.ownerWindowId } }
      await options.assertCaptureAllowed(initial.turnId)
      await options.assertWindowSource(sourceBinding)
      const action = resolveWindowsVisualAction(parameters, captured.native)
      const bindingHash = executionDigest({ owner, effectId: initial.effectId, turnId: initial.turnId, lease: initial.resourceLease, snapshot, action, observationId: parameters.observationId })
      const markedPoints = action.kind === 'drag' ? [action.from, action.to] : [action.point]
      const reviewAction = action.kind === 'click' ? { kind: action.kind, button: action.button } : action.kind === 'scroll' ? { kind: action.kind, direction: action.direction, notches: action.notches } : { kind: action.kind }
      const decision = await options.authorize?.({ cardId: owner, operation, targetId: JSON.stringify(snapshot.owner), label: captured.native.title, riskLevel: 'danger', actionCategory: 'execute', effectDigest: bindingHash, expiresAt: captured.facts.expiresAt, targetFingerprint: executionDigest(snapshot), imagePreview: { png: captured.png, sha256: snapshot.imageSha256, markers: markedPoints.map((point, index) => ({ x: point.x, y: point.y, label: String(index + 1) })), action: reviewAction }, reason: 'Review this exact visual target and finite mouse operation. Its application-specific effect may modify or transmit data. Bring the approved application to the foreground yourself; changed images or user input stop execution.' }, abortSignal)
      captured.png.fill(0)
      previewPixels = undefined
      if (!decision?.allow)
        return failure(operation, decision?.reason === 'host-denied' ? 'ALICIZATION_TOOL_DENIED_BY_HOST' : 'LOCAL_INTERFACE_CONFIRMATION_UNAVAILABLE')
      await program.ready()
      const assertCurrent = async () => {
        abortSignal?.throwIfAborted()
        checkOwner(owner)
        await options.assertCaptureAllowed(initial.turnId!)
        await options.assertWindowSource(sourceBinding)
        if (Date.now() >= captured.facts.expiresAt)
          throw new Error('WINDOWS_VISUAL_OBSERVATION_EXPIRED')
        const current = await assertActionDispatchCurrent(true, binding)
        if (!current || current.effectId !== initial.effectId || current.turnId !== initial.turnId || current.cardId !== owner || current.resourceLease?.id !== initial.resourceLease!.id || current.expiresAt === null || current.expiresAt <= Date.now() || (nativeExpiresAt !== undefined && current.expiresAt < nativeExpiresAt))
          throw new Error('WINDOWS_VISUAL_ACTION_AUTHORITY_CHANGED')
        if (lease)
          await broker().beforeInjection(lease)
        checkOwner(owner)
      }
      await assertCurrent()
      // Approval can focus the companion's review surface. Wait once for the
      // host to select the approved application; never activate it ourselves.
      // After the first match, every subsequent gate refuses a changed target.
      const foregroundDeadline = Math.min(Date.now() + 10_000, initial.expiresAt, captured.facts.expiresAt)
      await withActionApprovalWait(owner, async () => {
        while (true) {
          await assertCurrent()
          const currentTarget = target(await program.observe())
          if (Date.now() >= foregroundDeadline)
            throw new Error('WINDOWS_VISUAL_APPROVED_FOREGROUND_REQUIRED')
          if (executionDigest(currentTarget) === executionDigest(target(snapshot.owner)))
            break
          await delay(Math.min(100, foregroundDeadline - Date.now()), undefined, { signal: abortSignal })
        }
        // Let the host release the keys used to select the application. The
        // following acquisition checks that same first match without retries.
        await delay(Math.min(250, Math.max(0, foregroundDeadline - Date.now())), undefined, { signal: abortSignal })
        await assertCurrent()
      })
      lease = await broker().acquire(initial.resourceLease.owner, target(snapshot.owner), initial.resourceLease)
      const expiresAt = Math.min(initial.expiresAt, lease.expiresAt, captured.facts.expiresAt, Date.now() + 15_000)
      nativeExpiresAt = expiresAt
      nativeStarted = true
      const actual = await writer.run({ snapshot, action, observationId: parameters.observationId, bindingHash, owner: { cardId: owner, turnId: initial.turnId, effectId: initial.effectId, leaseId: lease.id, epoch: lease.epoch, fencingToken: lease.fencingToken }, expiresAt, assertCurrent, signal: abortSignal })
      outcome = { channel: 'desktop', operation, ok: actual.ok, status: actual.ok ? 'completed' : 'failed', finalStatus: actual.ok ? 'completed' : 'failed', sideEffectState: actual.effectMayHaveOccurred ? actual.ok ? 'executed' : 'unknown' : 'none', observationId: parameters.observationId, imageSha256: snapshot.imageSha256, inputReleased: actual.inputReleased, writerStopped: actual.writerStopped, nativeReceipt: actual.native, receiptRoot: actual.receiptRoot, errorMessage: actual.failure, requiresReadback: true, requiresVerification: true, taskCompletionProven: false, executionScope: 'bound-mouse-delivery-only' }
      if (actual.noInput && actual.writerStopped && actual.inputReleased)
        Object.assign(outcome, markActionNotStarted({ sideEffectState: 'none' as const, effectMayHaveOccurred: false as const, noInputReceipt: actual.noInput, errorCode: actual.noInput.failure }))
      if (actual.native?.stopReason === 2)
        options.onInputTakeover?.({ cardId: owner, turnId: initial.turnId, effectId: initial.effectId })
      return outcome
    }
    catch (error) {
      if (!nativeStarted) {
        const reason = errorMessageFrom(error) ?? 'WINDOWS_VISUAL_DISPATCH_REFUSED'
        const result = failure(operation, reason)
        if (reason === 'WINDOWS_VISUAL_APPROVED_FOREGROUND_REQUIRED')
          Object.assign(result, { requiresForeground: true })
        return result
      }
      outcome = { channel: 'desktop', operation, ok: false, status: 'failed', sideEffectState: 'unknown', requiresVerification: true, errorMessage: errorMessageFrom(error) }
      return outcome
    }
    finally {
      previewPixels?.fill(0)
      options.invalidateObservation()
      pending = false
      if (lease) {
        const release = await broker().release(lease)
        if (!release.stopped && outcome)
          Object.assign(outcome, { ok: false, status: 'failed', finalStatus: 'failed', sideEffectState: 'unknown', inputReleased: false, writerStopped: false })
      }
    }
  }
  return { locate, act, isActive: () => pending || writer.isActive(), isWriting: writer.isActive, async getHealth() {
    try {
      if (!writer.isActive())
        await Promise.all([reader.health(), program.health()])
      return { available: true, ready: !closed && !pending && !writer.isActive(), observedAt: Date.now() }
    }
    catch { return { available: true, ready: false, reason: 'windows-visual-native-helper-unavailable', observedAt: Date.now() } }
  }, async stop() {
    closed = true
    images.dispose()
    const release = foreground ? foreground.takeOver() : writer.releaseOwnedInput().then(stopped => ({ stopped, state: stopped ? 'stopped' : 'awaiting-input-release' }))
    const [outcome] = await Promise.all([release, reader.dispose(), program.dispose()])
    return outcome
  } }
}
