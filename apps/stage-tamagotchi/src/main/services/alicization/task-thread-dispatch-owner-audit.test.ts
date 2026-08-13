import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  collectAlicizationExecutionDispatchCandidateFiles,
} from './execution-dispatch-entrypoint-candidate-audit'
import {
  collectAlicizationExecutionDispatchOwnerFiles,
  resolveAlicizationTaskThreadDispatchOwnerAuditFiles,
  resolveAlicizationTaskThreadDispatchOwnerAuditRegistry,
  resolveAlicizationTaskThreadDispatchOwnerMode,
} from './task-thread-dispatch-owner-audit'

describe('task-thread dispatch owner audit', () => {
  it('keeps every current task-thread dispatch owner seam explicitly registered', () => {
    const discoveredFiles = collectAlicizationExecutionDispatchOwnerFiles(new URL('.', import.meta.url).pathname)

    expect(discoveredFiles).toEqual(resolveAlicizationTaskThreadDispatchOwnerAuditFiles().slice().sort())
    expect(resolveAlicizationTaskThreadDispatchOwnerAuditRegistry().map(entry => entry.relativePath).sort())
      .toEqual(discoveredFiles)
  })

  it('keeps the broader execution-dispatch candidate scan aligned with the independent owner registry', () => {
    const rootDir = new URL('.', import.meta.url).pathname
    const registeredFiles = new Set<string>(resolveAlicizationTaskThreadDispatchOwnerAuditFiles())
    const uncoveredCandidates = collectAlicizationExecutionDispatchCandidateFiles(rootDir)
      .filter(relativePath => !registeredFiles.has(relativePath))

    expect(uncoveredCandidates).toEqual([])
  })

  it('requires invoke-handler owners to keep kill-switch and DB wiring explicit before direct task dispatch', () => {
    for (const entry of resolveAlicizationTaskThreadDispatchOwnerAuditRegistry()) {
      if (entry.mode !== 'invoke-dispatch-owner')
        continue

      const source = readFileSync(new URL(`./${entry.relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationTaskThreadDispatchOwnerMode(entry.relativePath)).toBe('invoke-dispatch-owner')
      expect(source).toContain('registerInvokeHandler(electronAlicizationDispatchTaskThread')
      expect(source).toContain('const killSwitchSuspended = getAlicizationKillSwitchState() === \'SUSPENDED\'')
      expect(source).toContain('return await dispatchTaskThread({')
      expect(source).toContain('appendAuditLog,')
    }
  })

  it('requires invoke-handler registration wiring to inject the runtime-owned dispatch bridge back into invoke-side direct dispatch before execution leaves the desktop runtime', () => {
    const invokeHandlerSource = readFileSync(new URL('./runtime-invoke-handlers-task.ts', import.meta.url), 'utf8')
    const runtimeSource = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')

    expect(invokeHandlerSource).toContain('registerInvokeHandler(electronAlicizationDispatchTaskThread')
    expect(invokeHandlerSource).toContain('return await dispatchTaskThread({')
    expect(runtimeSource).toContain('registerAlicizationTaskInvokeHandlers({')
    expect(runtimeSource).toContain('dispatchTaskThread: async (port, payload) => await dispatchTaskThreadWithExecutionDelivery({')
  })

  it('requires orchestrator owners to keep direct dispatch fallback isolated behind the audited runDispatchNow seam', () => {
    for (const entry of resolveAlicizationTaskThreadDispatchOwnerAuditRegistry()) {
      if (entry.mode !== 'orchestrator-dispatch-owner')
        continue

      const source = readFileSync(new URL(`./${entry.relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationTaskThreadDispatchOwnerMode(entry.relativePath)).toBe('orchestrator-dispatch-owner')
      expect(source).toContain('const runDispatchNow = async (invocation: AlicizationTaskThreadDispatchInvocation) => {')
      expect(source).toContain('if (options?.runDispatch)')
      expect(source).toContain('return await dispatchTaskThread(invocation.port, invocation.input)')
    }
  })

  it('requires gateway dispatch owners to keep kill-switch state, audit wiring, and explicit thread ids intact before delegated task dispatch', () => {
    for (const entry of resolveAlicizationTaskThreadDispatchOwnerAuditRegistry()) {
      if (entry.mode !== 'gateway-dispatch-owner')
        continue

      const source = readFileSync(new URL(`./${entry.relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationTaskThreadDispatchOwnerMode(entry.relativePath)).toBe('gateway-dispatch-owner')
      expect(source).toContain('const dispatchInvocation = {')
      expect(source).toContain('const dispatchResult = await options.dispatchTaskThread(dispatchInvocation)')
      expect(source).toContain('const killSwitchSuspended = options.getGlobalKillSwitchState() === \'SUSPENDED\'')
      expect(source).toContain('appendAuditLog: options.appendAuditLog,')
      expect(source).toContain('threadId: planning.thread.id,')
      expect(source).toContain('threadId: resumableThread.id,')
    }
  })

  it('requires runtime bridge owners to keep executor-runtime and runtime-owned autonomy dispatch routed through dispatchTaskThreadWithExecutionDelivery instead of inventing a parallel execution seam', () => {
    const entries = resolveAlicizationTaskThreadDispatchOwnerAuditRegistry()
      .filter(entry => entry.mode === 'runtime-bridge-owner')

    expect(entries).toHaveLength(1)

    for (const entry of entries) {
      const source = readFileSync(new URL(`./${entry.relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationTaskThreadDispatchOwnerMode(entry.relativePath)).toBe('runtime-bridge-owner')
      expect(source).toContain('dispatchTaskThread: invocation => dispatchTaskThreadWithExecutionDelivery(invocation)')
      expect(source).toContain('async function dispatchTaskThreadWithExecutionDelivery(')
      expect(source).toContain('dispatchAutonomyTaskThread: async (payload: any) => await dispatchTaskThreadWithExecutionDelivery({')
    }
  })

  it('requires the canonical gateway owner to forward abort signals into new and resumed task threads', () => {
    const executorRuntimeSource = readFileSync(new URL('./executor-runtime.ts', import.meta.url), 'utf8')

    expect(executorRuntimeSource).toContain('abortSignal: combineAbortSignals([')
    expect(executorRuntimeSource).toContain('input.abortSignal,')
    expect(executorRuntimeSource).toContain('input.context.abortSignal,')
    expect(executorRuntimeSource).toContain('threadId: resumableThread.id,')
    expect(executorRuntimeSource).toContain('abortSignal: input.abortSignal,')
  })

  it('requires autonomy dispatch owners to route auto-start task dispatch only through the audited autonomous payload builder after explicit eligibility checks', () => {
    for (const entry of resolveAlicizationTaskThreadDispatchOwnerAuditRegistry()) {
      if (entry.mode !== 'autonomy-dispatch-owner')
        continue

      const source = readFileSync(new URL(`./${entry.relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationTaskThreadDispatchOwnerMode(entry.relativePath)).toBe('autonomy-dispatch-owner')
      expect(source).toContain('await input.dispatchTaskThread(buildAutonomousTaskDispatchInput({')
      expect(source).toContain('planning.plan.state === \'routed\'')
      expect(source).toContain('actuationPlan.task.autoDispatchEligible')
      expect(source).toContain('planning.thread.selectedChannel === actuationPlan.task.requestedDispatchChannel')
      expect(source).toContain('threadId: planning.thread.id,')
    }
  })

  it('requires subconscious bridge owners to route deferred autonomy dispatch only through dispatchAutonomyTaskThread so subconscious execution carry re-enters the audited runtime bridge', () => {
    const entries = resolveAlicizationTaskThreadDispatchOwnerAuditRegistry()
      .filter(entry => entry.mode === 'subconscious-bridge-owner')

    expect(entries).toHaveLength(1)

    for (const entry of entries) {
      const source = readFileSync(new URL(`./${entry.relativePath}`, import.meta.url), 'utf8')

      expect(resolveAlicizationTaskThreadDispatchOwnerMode(entry.relativePath)).toBe('subconscious-bridge-owner')
      expect(source).toContain('dispatchTaskThread: async (payload: any) => await dispatchAutonomyTaskThread(payload)')
      expect(source).not.toContain('dispatchTaskThreadWithExecutionDelivery(invocation)')
    }
  })
})
