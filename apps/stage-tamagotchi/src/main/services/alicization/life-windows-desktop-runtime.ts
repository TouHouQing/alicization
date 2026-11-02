import type { ExecutionResourceBroker } from './execution/resource-broker'
import type { WindowsKeyboardJournalAdmission } from './execution/windows-keyboard-journal'
import type { WindowsVisualActInput, WindowsVisualLocateInput } from './execution/windows-visual-tool-contracts'
import type { LifeInterfaceAuthorization, LifeInterfaceRiskRequest } from './life-interface-risk'
import type { AlicizationLocalDesktopClickElementInput, AlicizationLocalDesktopListInteractablesInput, AlicizationLocalDesktopOpenApplicationInput, AlicizationLocalDesktopPressKeysInput, AlicizationLocalDesktopScrollInput, AlicizationLocalDesktopTypeTextInput, AlicizationLocalDesktopWaitInput } from './local-browser-automation'

import { execFile, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, extname, isAbsolute, join } from 'node:path'
import { env } from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'

import { errorMessageFrom } from '@moeru/std'

import workerScript from './life-windows-desktop-worker.ps1?raw'

import { executionDigest } from './execution/acceptance-compiler'
import { assertInterfaceDispatchCurrent as assertActionDispatchCurrent } from './execution/interface-dispatch-context'
import { createExecutionHealthProbe } from './execution/runtime-health'
import { createWindowsKeyboardRuntime } from './execution/windows-keyboard-runtime'
import { createWindowsVisualRuntime } from './execution/windows-visual-runtime'
import { classifyLifeInterfaceRisk } from './life-interface-risk'

interface DesktopElement { runtimeId: string, name: string, role: string, automationId: string, enabled: boolean, value: string | null, password: boolean, readOnly: boolean, scroll?: { verticalPercent: number, horizontalPercent: number, verticalViewSize: number, horizontalViewSize: number, verticalScrollable: boolean, horizontalScrollable: boolean } }
interface DesktopObservation { ok: boolean, windowId: string, ownerWindowId?: string | null, processId: number, processStartTicks: string, windowClass: string, desktop: string, focusWindowId?: string | null, title: string, elements: DesktopElement[] }

export function createLifeWindowsDesktopRuntime(options: { ownerId: () => string, authorize?: (request: LifeInterfaceRiskRequest, signal?: AbortSignal) => Promise<LifeInterfaceAuthorization>, visual?: Pick<Parameters<typeof createWindowsVisualRuntime>[0], 'protectedRoot' | 'resourceBroker' | 'ground' | 'providerTarget' | 'assertCaptureAllowed' | 'assertWindowSource' | 'admitJournal' | 'onInputTakeover'>, keyboard?: { protectedRoot: string, resourceBroker: () => ExecutionResourceBroker, admitJournal?: (admission: WindowsKeyboardJournalAdmission) => Promise<void>, onInputTakeover?: (input: { cardId: string, turnId: string, effectId: string }) => void } }) {
  let observation: DesktopObservation | null = null
  let observedAt = 0
  let owner = options.ownerId()
  let busy = false
  let mutationPending = false
  let nativeMutationPending = false
  const keyboard = options.keyboard
    ? createWindowsKeyboardRuntime({
        ...options.keyboard,
        ownerId: options.ownerId,
        authorize: options.authorize,
        observation: () => observation,
        observedAt: () => observedAt,
        invalidateObservation: () => { observation = null },
        readObservation: async (expected, signal) => {
          const actual = await command({ operation: 'observe', windowId: expected.windowId, processId: expected.processId, expectedProcessStartTicks: expected.processStartTicks, expectedWindowClass: expected.windowClass, expectedDesktop: expected.desktop, expectedWindowTitle: expected.title }, signal)
          return actual.ok ? actual as unknown as DesktopObservation : null
        },
      })
    : undefined
  const visual = options.visual ? createWindowsVisualRuntime({ ...options.visual, ownerId: options.ownerId, authorize: options.authorize, observation: () => observation, observedAt: () => observedAt, invalidateObservation: () => { observation = null } }) : undefined
  async function command(input: Record<string, unknown>, signal?: AbortSignal): Promise<Record<string, unknown>> {
    signal?.throwIfAborted()
    if (busy)
      return { ok: false, errorCode: 'WINDOWS_UIA_BUSY' }
    busy = true
    nativeMutationPending = ['click', 'type', 'scroll'].includes(String(input.operation))
    if (owner !== options.ownerId()) {
      observation = null
      owner = options.ownerId()
    }
    const capturedOwner = owner
    // Structured stdin avoids command-line interpolation and Windows' length
    // limit, including multiline text and literal PowerShell metacharacters.
    let workerRoot: string | undefined
    let workerStarted = false
    let nativeStopped = true
    let stopAcknowledgment: Promise<void> | undefined
    const script = `[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)\n$lifeRequest = [Console]::In.ReadLine() | ConvertFrom-Json\n${workerScript}`
    try {
      workerRoot = await mkdtemp(join(tmpdir(), 'alicization-uia-worker-'))
      const workerPath = join(workerRoot, 'worker.ps1')
      await writeFile(workerPath, `\uFEFF${script}`, 'utf8')
      signal?.throwIfAborted()
      const authority = ['click', 'type', 'scroll'].includes(String(input.operation)) ? await assertActionDispatchCurrent(false) : null
      const request = { ...input, ...(authority ? { dispatchExpiresAt: authority.expiresAt } : {}) }
      const result = await new Promise<string>((resolve, reject) => {
        workerStarted = true
        const child = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Mta', '-ExecutionPolicy', 'Bypass', '-File', workerPath], { windowsHide: true, timeout: input.operation === 'health' ? 4000 : 12_000, maxBuffer: 256_000, signal }, (error, stdout) => error ? reject(error) : resolve(stdout))
        nativeStopped = false
        stopAcknowledgment = new Promise<void>((resolve) => {
          child.once('close', () => { nativeStopped = true; resolve() })
        })
        child.stdin?.end(`${JSON.stringify(request)}\n`)
      })
      signal?.throwIfAborted()
      if (capturedOwner !== options.ownerId()) {
        observation = null
        throw new Error('Desktop operation owner changed')
      }
      return JSON.parse(result.trim())
    }
    catch (error) {
      observation = null
      if (signal?.aborted)
        throw error
      return { ok: false, errorCode: 'WINDOWS_UIA_OPERATION_FAILED', errorMessage: errorMessageFrom(error), ...(['click', 'type', 'scroll'].includes(String(input.operation)) ? { effectMayHaveOccurred: workerStarted, requiresVerification: workerStarted } : {}) }
    }
    finally {
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        if (stopAcknowledgment && !nativeStopped)
          await Promise.race([stopAcknowledgment, new Promise<void>((resolve) => { timer = setTimeout(resolve, 5000) })])
      }
      finally { clearTimeout(timer) }
      if (nativeStopped) {
        try {
          if (workerRoot)
            await rm(workerRoot, { recursive: true, force: true })
        }
        finally { busy = false; nativeMutationPending = false }
      }
      else {
        // AbortError/timeout can precede close. Keep this owner and its script
        // until the native process and stdio actually stop, even after return.
        const root = workerRoot
        void stopAcknowledgment!.then(async () => {
          try {
            if (root)
              await rm(root, { recursive: true, force: true })
          }
          finally { busy = false; nativeMutationPending = false }
        }).catch(error => console.warn('[alicization-runtime] Deferred UIA worker cleanup failed', errorMessageFrom(error)))
      }
    }
  }
  function result(operation: string, outcome: Record<string, unknown>) {
    return { channel: 'desktop', operation, status: outcome.ok ? 'completed' : 'failed', ...(outcome.ok ? { finalStatus: 'completed' } : { sideEffectState: outcome.effectMayHaveOccurred ? 'unknown' : 'none' }), ...outcome, executionScope: 'observed-window-and-desktop-only' }
  }
  async function listDesktopInteractables(input: AlicizationLocalDesktopListInteractablesInput & { windowTitle?: string }) {
    if (mutationPending || visual?.isActive())
      return result('desktop_list_interactables', { ok: false, errorCode: 'WINDOWS_UIA_BUSY' })
    const outcome = await command({ operation: 'observe', ...(input.windowTitle ? { windowTitle: input.windowTitle.slice(0, 180) } : {}) }, input.abortSignal)
    observation = outcome.ok ? outcome as unknown as DesktopObservation : null
    observedAt = Date.now()
    const elements = observation?.elements.filter(element => !input.role || input.role === 'element' || element.role === input.role).slice(0, Math.min(120, Math.max(1, input.maxItems ?? 40)))
    return result('desktop_list_interactables', { ...outcome, elements })
  }
  function operationName(operation: 'click' | 'type' | 'scroll') {
    return operation === 'scroll' ? 'desktop_scroll' : operation === 'click' ? 'desktop_click_element' : 'desktop_type_text'
  }
  async function mutate(operation: 'click' | 'type' | 'scroll', input: AlicizationLocalDesktopClickElementInput | AlicizationLocalDesktopTypeTextInput | AlicizationLocalDesktopScrollInput) {
    const { abortSignal, ...parameters } = input
    input = { ...structuredClone(parameters), abortSignal }
    if (mutationPending || keyboard?.isWriting() || visual?.isActive())
      return result(operationName(operation), { ok: false, errorCode: 'WINDOWS_UIA_BUSY' })
    mutationPending = true
    try { return await dispatchMutation(operation, input) }
    finally { mutationPending = false }
  }
  async function dispatchMutation(operation: 'click' | 'type' | 'scroll', input: AlicizationLocalDesktopClickElementInput | AlicizationLocalDesktopTypeTextInput | AlicizationLocalDesktopScrollInput) {
    input.abortSignal?.throwIfAborted()
    const name = operationName(operation)
    if (!observation || owner !== options.ownerId())
      return result(name, { ok: false, errorCode: 'WINDOWS_UIA_OBSERVATION_REQUIRED' })
    if (!observation.processStartTicks || !observation.windowClass)
      return result(name, { ok: false, errorCode: 'WINDOWS_UIA_WINDOW_IDENTITY_REQUIRED' })
    if (input.windowTitle && observation.title !== input.windowTitle) {
      observation = null
      return result(name, { ok: false, errorCode: 'WINDOWS_UIA_WINDOW_CONTEXT_CHANGED', sideEffectState: 'none', requiresReadback: true })
    }
    const targetText = operation === 'click' ? (input as AlicizationLocalDesktopClickElementInput).text : (input as AlicizationLocalDesktopTypeTextInput).targetText
    const typed = input as AlicizationLocalDesktopTypeTextInput
    const role = operation === 'type' ? (typed.role === 'select' ? 'select' : 'input') : (input as AlicizationLocalDesktopClickElementInput).role
    const selection = input as AlicizationLocalDesktopClickElementInput
    const scrolling = input as AlicizationLocalDesktopScrollInput
    if (operation === 'scroll' && (!['up', 'down', 'top', 'bottom'].includes(scrolling.action) || (scrolling.amount !== undefined && !['small', 'large'].includes(scrolling.amount))))
      return result(name, { ok: false, errorCode: 'WINDOWS_UIA_INVALID_SCROLL' })
    const candidates = observation.elements.filter(element => operation === 'scroll'
      ? element.runtimeId === scrolling.runtimeId && Boolean(element.scroll?.verticalScrollable)
      : (!role || element.role === role) && (!targetText || (selection.exactText ? element.name === targetText : element.name.includes(targetText))))
    const expected = operation !== 'scroll' && selection.ordinal !== undefined ? candidates[selection.ordinal - 1] : candidates.length === 1 ? candidates[0] : null
    if (!expected)
      return result(name, { ok: false, errorCode: 'WINDOWS_UIA_AMBIGUOUS_TARGET' })
    if (operation === 'type' && (!typed.text || typed.text.length > 16_000))
      return result(name, { ok: false, errorCode: 'WINDOWS_UIA_INPUT_BUDGET' })
    const captured = observation
    const capturedOwner = owner
    const risk = operation === 'scroll' ? null : classifyLifeInterfaceRisk({ operation: name, label: expected.name, password: operation === 'type' && expected.password })
    // The selected account/recipient is part of the reviewed effect, just as
    // editable text is. Revalidate both immediately before native dispatch.
    const reviewedInputs = captured.elements.filter(element => element.role === 'input' || element.role === 'select')
    if (risk) {
      const decision = await options.authorize?.({ cardId: capturedOwner, operation: name, targetId: JSON.stringify({ windowId: captured.windowId, ownerWindowId: captured.ownerWindowId ?? null, processId: captured.processId, processStartTicks: captured.processStartTicks, desktop: captured.desktop, title: captured.title }), label: expected.name, ...(operation === 'type' ? { previewText: typed.text } : {}), effectDigest: executionDigest({ operation, expected, text: operation === 'type' ? typed.text : null, submit: typed.submit === true, inputs: reviewedInputs }), targetFingerprint: executionDigest({ owner: capturedOwner, windowId: captured.windowId, ownerWindowId: captured.ownerWindowId ?? null, processId: captured.processId, processStartTicks: captured.processStartTicks, windowClass: captured.windowClass, desktop: captured.desktop, expected }), ...risk }, input.abortSignal)
      input.abortSignal?.throwIfAborted()
      if (!decision?.allow) {
        observation = null
        return result(name, { ok: false, errorCode: decision?.reason === 'host-denied' ? 'ALICIZATION_TOOL_DENIED_BY_HOST' : 'LOCAL_INTERFACE_CONFIRMATION_UNAVAILABLE', sideEffectState: 'none' })
      }
    }
    if (capturedOwner !== options.ownerId())
      return result(name, { ok: false, errorCode: 'WINDOWS_UIA_OWNER_CHANGED', sideEffectState: 'none' })
    const outcome = await command({ operation, windowId: captured.windowId, processId: captured.processId, expectedProcessStartTicks: captured.processStartTicks, expectedWindowClass: captured.windowClass, expectedDesktop: captured.desktop, expectedWindowTitle: captured.title, expectedOwnerWindowId: captured.ownerWindowId ?? null, expected, ...(risk ? { expectedInputs: reviewedInputs } : {}), ...(operation === 'type' ? { text: typed.text, clearExisting: typed.clearExisting === true, submit: typed.submit === true } : {}), ...(operation === 'scroll' ? { action: scrolling.action, amount: scrolling.amount ?? 'large' } : {}) }, input.abortSignal)
    observation = null
    return result(name, outcome)
  }
  async function openApplication(input: AlicizationLocalDesktopOpenApplicationInput) {
    if (mutationPending || keyboard?.isWriting() || visual?.isActive())
      return result('desktop_open_application', { ok: false, errorCode: 'WINDOWS_UIA_BUSY' })
    input.abortSignal?.throwIfAborted()
    const names: Record<string, string> = { notepad: 'notepad.exe', 记事本: 'notepad.exe', paint: 'mspaint.exe', mspaint: 'mspaint.exe', 画图: 'mspaint.exe', calculator: 'calc.exe', calc: 'calc.exe', 计算器: 'calc.exe', explorer: 'explorer.exe', 文件资源管理器: 'explorer.exe' }
    const named = names[(input.appName || '').trim().toLowerCase()]
    const executable = input.path || (named ? join(env.SystemRoot || 'C:/Windows', 'System32', named) : '')
    const interpreters = new Set(['cmd.exe', 'powershell.exe', 'pwsh.exe', 'reg.exe', 'mshta.exe', 'rundll32.exe', 'cscript.exe', 'wscript.exe', 'schtasks.exe', 'python.exe', 'node.exe', 'wsl.exe', 'bash.exe'])
    if (!executable || !isAbsolute(executable) || extname(executable).toLowerCase() !== '.exe' || !existsSync(executable) || interpreters.has(basename(executable).toLowerCase()))
      return result('desktop_open_application', { ok: false, errorCode: 'WINDOWS_UIA_APPLICATION_NOT_SUPPORTED', errorMessage: 'Choose an installed desktop executable. Shell and interpreter commands use the governed CLI channel.' })
    // Store applications may forward to an existing Default desktop instance.
    // Private QA launches its own fixture inside its job instead.
    if (env.LIFE_QA_PRIVATE_DESKTOP)
      return result('desktop_open_application', { ok: false, errorCode: 'WINDOWS_UIA_QA_REQUIRES_OWNED_FIXTURE' })
    if ((input.args ?? []).length > 32 || (input.args ?? []).some(arg => arg.length > 2048 || arg.includes('\0')))
      return result('desktop_open_application', { ok: false, errorCode: 'WINDOWS_UIA_ARGUMENT_BUDGET' })
    const capturedOwner = options.ownerId()
    if (!named || input.path || input.args?.length) {
      const decision = await options.authorize?.({ cardId: capturedOwner, operation: 'desktop_open_application', targetId: executable, label: `${basename(executable)} ${(input.args ?? []).join(' ').slice(0, 200)}`, riskLevel: 'danger', actionCategory: 'execute', reason: 'Review an explicit executable or launch arguments before a process is started.' }, input.abortSignal)
      input.abortSignal?.throwIfAborted()
      if (!decision?.allow || capturedOwner !== options.ownerId())
        return result('desktop_open_application', { ok: false, errorCode: decision?.reason === 'host-denied' ? 'ALICIZATION_TOOL_DENIED_BY_HOST' : 'LOCAL_INTERFACE_CONFIRMATION_UNAVAILABLE', sideEffectState: 'none' })
    }
    observation = null
    await assertActionDispatchCurrent(false)
    return new Promise<Record<string, unknown>>((resolve) => {
      const child = spawn(executable, input.args ?? [], { windowsHide: true, stdio: 'ignore', shell: false })
      child.once('error', error => resolve(result('desktop_open_application', { ok: false, errorCode: 'WINDOWS_UIA_APPLICATION_FAILED', errorMessage: errorMessageFrom(error) })))
      child.once('spawn', () => {
        child.unref()
        resolve({ ...result('desktop_open_application', { ok: true, processId: child.pid, appName: input.appName ?? basename(executable), requiresReadback: true }), finalStatus: 'dispatched', executionScope: 'process-launched-interface-unverified' })
      })
    })
  }
  async function observeWindow(proof: { windowId: string, processId: number, processStartTicks?: string, windowClass?: string, desktop?: string, title: string }, signal?: AbortSignal) {
    const outcome = await command({ operation: 'observe', windowId: proof.windowId, processId: proof.processId, expectedProcessStartTicks: proof.processStartTicks, expectedWindowClass: proof.windowClass, expectedDesktop: proof.desktop, expectedWindowTitle: proof.title }, signal)
    return result('desktop_list_interactables', outcome)
  }
  async function waitForDesktop(input: AlicizationLocalDesktopWaitInput) {
    const names: Record<string, string> = { 记事本: 'notepad', 画图: 'mspaint', 计算器: 'CalculatorApp', 文件资源管理器: 'explorer' }
    const name = (input.appName ?? '').trim().replace(/\.exe$/iu, '')
    const processName = names[name] ?? name
    const title = (input.titleIncludes ?? '').trim()
    if ((!processName && !title) || processName.length > 180 || title.length > 180 || /[/\\\0]/u.test(processName))
      return result('desktop_wait', { ok: false, errorCode: 'WINDOWS_UIA_WAIT_TARGET_REQUIRED' })
    const startedAt = Date.now()
    const timeoutMs = Math.min(60_000, Math.max(0, Number.isFinite(input.timeoutMs) ? input.timeoutMs! : 10_000))
    const capturedOwner = options.ownerId()
    do {
      input.abortSignal?.throwIfAborted()
      if (capturedOwner !== options.ownerId())
        return result('desktop_wait', { ok: false, errorCode: 'WINDOWS_UIA_OWNER_CHANGED' })
      if (mutationPending || busy || visual?.isActive())
        return result('desktop_wait', { ok: false, errorCode: 'WINDOWS_UIA_BUSY' })
      const actual = await command({ operation: 'observe', ...(processName ? { processName } : {}), ...(title ? { windowTitleIncludes: title } : {}) }, input.abortSignal)
      if (actual.ok === true) {
        observation = actual as unknown as DesktopObservation
        observedAt = Date.now()
        return result('desktop_wait', { ...actual, timeoutMs, elapsedMs: Date.now() - startedAt, proofScope: 'matching-window-observed-only', foregroundChanged: false })
      }
      if (actual.errorCode !== 'WINDOWS_UIA_WINDOW_NOT_FOUND')
        return result('desktop_wait', actual)
      const remaining = timeoutMs - (Date.now() - startedAt)
      if (remaining <= 0)
        break
      await delay(Math.min(200, remaining), undefined, { signal: input.abortSignal })
    } while (Date.now() - startedAt <= timeoutMs)
    return result('desktop_wait', { ok: false, errorCode: 'LOCAL_DESKTOP_WAIT_TIMEOUT', timeoutMs, elapsedMs: Date.now() - startedAt })
  }
  const probeHealth = createExecutionHealthProbe({
    failureReason: 'windows-uia-probe-failed',
    probe: async () => {
      const outcome = await command({ operation: 'health' })
      return { available: true, ready: outcome.ok === true && outcome.health === 'uia-ready', reason: outcome.ok === true && outcome.health === 'uia-ready' ? null : 'windows-uia-probe-failed' }
    },
  })
  const getHealth = () => busy || mutationPending || keyboard?.isWriting() || visual?.isActive()
    ? Promise.resolve({ available: true, ready: false, reason: 'windows-uia-busy', observedAt: Date.now() })
    : probeHealth()
  async function pressDesktopKeys(input: AlicizationLocalDesktopPressKeysInput) {
    if (!keyboard)
      return result('desktop_press_keys', { ok: false, errorCode: 'WINDOWS_KEYBOARD_NOT_CONFIGURED' })
    if (busy || mutationPending || keyboard.isWriting() || visual?.isActive())
      return result('desktop_press_keys', { ok: false, errorCode: 'WINDOWS_UIA_BUSY' })
    mutationPending = true
    try { return await keyboard.press(input) }
    finally { mutationPending = false }
  }
  async function locateWindow(input: WindowsVisualLocateInput) {
    if (!visual || busy || mutationPending || keyboard?.isWriting())
      return result('desktop_locate_window', { ok: false, errorCode: 'WINDOWS_VISUAL_NOT_READY' })
    return visual.locate(input)
  }
  async function pointerAction(input: WindowsVisualActInput) {
    if (!visual || busy || mutationPending || keyboard?.isWriting())
      return result('desktop_pointer_action', { ok: false, errorCode: 'WINDOWS_VISUAL_NOT_READY' })
    return visual.act(input)
  }
  return { listDesktopInteractables, observeWindow, openApplication, waitForDesktop, pressDesktopKeys, locateWindow, pointerAction, scrollDesktop: (input: AlicizationLocalDesktopScrollInput) => mutate('scroll', input), clickDesktopElement: (input: AlicizationLocalDesktopClickElementInput) => mutate('click', input), typeDesktopText: (input: AlicizationLocalDesktopTypeTextInput) => mutate('type', input), getHealth, getKeyboardHealth: () => keyboard?.getHealth(), getVisualHealth: () => visual?.getHealth(), stopKeyboard: async () => { const outcomes = await Promise.all([keyboard?.stop(), visual?.stop()]); return { stopped: outcomes.every(item => !item || item.stopped), state: outcomes.every(item => !item || item.stopped) ? 'stopped' : 'awaiting-input-release' } }, isActive: () => busy || mutationPending || Boolean(keyboard?.isWriting()) || Boolean(visual?.isActive()), isWriting: () => nativeMutationPending || mutationPending || Boolean(keyboard?.isWriting()) || Boolean(visual?.isWriting()) }
}
