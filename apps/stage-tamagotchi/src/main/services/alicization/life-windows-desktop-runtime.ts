import type { LifeInterfaceAuthorization, LifeInterfaceRiskRequest } from './life-interface-risk'
import type { AlicizationLocalDesktopClickElementInput, AlicizationLocalDesktopListInteractablesInput, AlicizationLocalDesktopOpenApplicationInput, AlicizationLocalDesktopTypeTextInput } from './local-browser-automation'

import { execFile, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, extname, isAbsolute, join } from 'node:path'
import { env } from 'node:process'

import { errorMessageFrom } from '@moeru/std'

import workerScript from './life-windows-desktop-worker.ps1?raw'

import { classifyLifeInterfaceRisk } from './life-interface-risk'

interface DesktopElement { runtimeId: string, name: string, role: string, automationId: string, enabled: boolean, value: string | null, password: boolean, readOnly: boolean }
interface DesktopObservation { ok: boolean, windowId: string, processId: number, desktop: string, title: string, elements: DesktopElement[] }

export function createLifeWindowsDesktopRuntime(options: { ownerId: () => string, authorize?: (request: LifeInterfaceRiskRequest, signal?: AbortSignal) => Promise<LifeInterfaceAuthorization> }) {
  let observation: DesktopObservation | null = null
  let owner = options.ownerId()
  let busy = false
  let mutationPending = false
  async function command(input: Record<string, unknown>, signal?: AbortSignal): Promise<Record<string, unknown>> {
    signal?.throwIfAborted()
    if (busy)
      return { ok: false, errorCode: 'WINDOWS_UIA_BUSY' }
    busy = true
    if (owner !== options.ownerId()) {
      observation = null
      owner = options.ownerId()
    }
    const capturedOwner = owner
    // Structured stdin avoids command-line interpolation and Windows' length
    // limit, including multiline text and literal PowerShell metacharacters.
    let workerRoot: string | undefined
    const script = `[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)\n$lifeRequest = [Console]::In.ReadLine() | ConvertFrom-Json\n${workerScript}`
    try {
      workerRoot = await mkdtemp(join(tmpdir(), 'alicization-uia-worker-'))
      const workerPath = join(workerRoot, 'worker.ps1')
      await writeFile(workerPath, `\uFEFF${script}`, 'utf8')
      signal?.throwIfAborted()
      const result = await new Promise<string>((resolve, reject) => {
        const child = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Mta', '-ExecutionPolicy', 'Bypass', '-File', workerPath], { windowsHide: true, timeout: 12_000, maxBuffer: 256_000, signal }, (error, stdout) => error ? reject(error) : resolve(stdout))
        child.stdin?.end(`${JSON.stringify(input)}\n`)
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
      return { ok: false, errorCode: 'WINDOWS_UIA_OPERATION_FAILED', errorMessage: errorMessageFrom(error), ...(input.operation !== 'observe' ? { effectMayHaveOccurred: true, requiresVerification: true } : {}) }
    }
    finally {
      busy = false
      if (workerRoot)
        await rm(workerRoot, { recursive: true, force: true })
    }
  }
  function result(operation: string, outcome: Record<string, unknown>) {
    return { channel: 'desktop', operation, status: outcome.ok ? 'completed' : 'failed', ...(outcome.ok ? { finalStatus: 'completed' } : { sideEffectState: outcome.effectMayHaveOccurred ? 'unknown' : 'none' }), ...outcome, executionScope: 'observed-window-and-desktop-only' }
  }
  async function listDesktopInteractables(input: AlicizationLocalDesktopListInteractablesInput & { windowTitle?: string }) {
    if (mutationPending)
      return result('desktop_list_interactables', { ok: false, errorCode: 'WINDOWS_UIA_BUSY' })
    const outcome = await command({ operation: 'observe', ...(input.windowTitle ? { windowTitle: input.windowTitle.slice(0, 180) } : {}) }, input.abortSignal)
    observation = outcome.ok ? outcome as unknown as DesktopObservation : null
    const elements = observation?.elements.filter(element => !input.role || input.role === 'element' || element.role === input.role).slice(0, Math.min(120, Math.max(1, input.maxItems ?? 40)))
    return result('desktop_list_interactables', { ...outcome, elements })
  }
  async function mutate(operation: 'click' | 'type', input: AlicizationLocalDesktopClickElementInput | AlicizationLocalDesktopTypeTextInput) {
    if (mutationPending)
      return result(operation === 'click' ? 'desktop_click_element' : 'desktop_type_text', { ok: false, errorCode: 'WINDOWS_UIA_BUSY' })
    mutationPending = true
    try { return await dispatchMutation(operation, input) }
    finally { mutationPending = false }
  }
  async function dispatchMutation(operation: 'click' | 'type', input: AlicizationLocalDesktopClickElementInput | AlicizationLocalDesktopTypeTextInput) {
    input.abortSignal?.throwIfAborted()
    const name = operation === 'click' ? 'desktop_click_element' : 'desktop_type_text'
    if (!observation || owner !== options.ownerId())
      return result(name, { ok: false, errorCode: 'WINDOWS_UIA_OBSERVATION_REQUIRED' })
    if (input.windowTitle && observation.title !== input.windowTitle) {
      observation = null
      return result(name, { ok: false, errorCode: 'WINDOWS_UIA_WINDOW_CONTEXT_CHANGED', sideEffectState: 'none', requiresReadback: true })
    }
    const targetText = operation === 'click' ? (input as AlicizationLocalDesktopClickElementInput).text : (input as AlicizationLocalDesktopTypeTextInput).targetText
    const typed = input as AlicizationLocalDesktopTypeTextInput
    const role = operation === 'type' ? 'input' : (input as AlicizationLocalDesktopClickElementInput).role
    const candidates = observation.elements.filter(element => (!role || element.role === role) && (!targetText || (input.exactText ? element.name === targetText : element.name.includes(targetText))))
    const expected = input.ordinal !== undefined ? candidates[input.ordinal - 1] : candidates.length === 1 ? candidates[0] : null
    if (!expected)
      return result(name, { ok: false, errorCode: 'WINDOWS_UIA_AMBIGUOUS_TARGET' })
    if (operation === 'type' && (!typed.text || typed.text.length > 16_000))
      return result(name, { ok: false, errorCode: 'WINDOWS_UIA_INPUT_BUDGET' })
    const captured = observation
    const capturedOwner = owner
    const risk = classifyLifeInterfaceRisk({ operation: name, label: expected.name, password: operation === 'type' && expected.password })
    if (risk) {
      const decision = await options.authorize?.({ cardId: capturedOwner, operation: name, targetId: JSON.stringify({ windowId: captured.windowId, processId: captured.processId, title: captured.title }), label: expected.name, ...risk }, input.abortSignal)
      input.abortSignal?.throwIfAborted()
      if (!decision?.allow) {
        observation = null
        return result(name, { ok: false, errorCode: decision?.reason === 'host-denied' ? 'ALICIZATION_TOOL_DENIED_BY_HOST' : 'LOCAL_INTERFACE_CONFIRMATION_UNAVAILABLE', sideEffectState: 'none' })
      }
    }
    if (capturedOwner !== options.ownerId())
      return result(name, { ok: false, errorCode: 'WINDOWS_UIA_OWNER_CHANGED', sideEffectState: 'none' })
    const outcome = await command({ operation, windowId: captured.windowId, processId: captured.processId, expectedWindowTitle: captured.title, expected, ...(risk ? { expectedInputs: captured.elements.filter(element => element.role === 'input') } : {}), ...(operation === 'type' ? { text: typed.text, clearExisting: typed.clearExisting === true, submit: typed.submit === true } : {}) }, input.abortSignal)
    observation = null
    return result(name, outcome)
  }
  async function openApplication(input: AlicizationLocalDesktopOpenApplicationInput) {
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
    return new Promise<Record<string, unknown>>((resolve) => {
      const child = spawn(executable, input.args ?? [], { windowsHide: true, stdio: 'ignore', shell: false })
      child.once('error', error => resolve(result('desktop_open_application', { ok: false, errorCode: 'WINDOWS_UIA_APPLICATION_FAILED', errorMessage: errorMessageFrom(error) })))
      child.once('spawn', () => {
        child.unref()
        resolve({ ...result('desktop_open_application', { ok: true, processId: child.pid, appName: input.appName ?? basename(executable), requiresReadback: true }), finalStatus: 'dispatched', executionScope: 'process-launched-interface-unverified' })
      })
    })
  }
  async function observeWindow(proof: { windowId: string, processId: number, title: string }, signal?: AbortSignal) {
    const outcome = await command({ operation: 'observe', windowId: proof.windowId, processId: proof.processId, expectedWindowTitle: proof.title }, signal)
    return result('desktop_list_interactables', outcome)
  }
  return { listDesktopInteractables, observeWindow, openApplication, clickDesktopElement: (input: AlicizationLocalDesktopClickElementInput) => mutate('click', input), typeDesktopText: (input: AlicizationLocalDesktopTypeTextInput) => mutate('type', input) }
}
