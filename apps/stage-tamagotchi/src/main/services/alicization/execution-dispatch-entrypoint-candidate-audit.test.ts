import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  collectAlicizationExecutionDispatchCandidateFiles,
} from './execution-dispatch-entrypoint-candidate-audit'
import {
  collectAlicizationExecutionDispatchOwnerFiles,
} from './task-thread-dispatch-owner-audit'

describe('execution dispatch entrypoint candidate audit', () => {
  it('keeps broader execution-dispatch candidate discovery sourced from the shared owner helper instead of re-encoding one more local dispatch scan', () => {
    const source = readFileSync(new URL('./execution-dispatch-entrypoint-candidate-audit.ts', import.meta.url), 'utf8')

    expect(source).toContain('from \'./task-thread-dispatch-owner-audit\'')
    expect(source).toContain('collectAlicizationExecutionDispatchOwnerFiles(')
    expect(/^function collectExecutionDispatchOwnerFiles\(/m.test(source)).toBe(false)
  })

  it('keeps broader execution-dispatch candidate discovery broad enough to catch runtime and subconscious bridge surfaces while still proving they remain inside the explicit owner map', () => {
    const source = readFileSync(new URL('./execution-dispatch-entrypoint-candidate-audit.ts', import.meta.url), 'utf8')
    const invokeHandlersSource = readFileSync(new URL('./runtime-invoke-handlers-task.ts', import.meta.url), 'utf8')
    const executorRuntimeSource = readFileSync(new URL('./executor-runtime.ts', import.meta.url), 'utf8')
    const autonomySource = readFileSync(new URL('./autonomy-actuation.ts', import.meta.url), 'utf8')
    const orchestratorSource = readFileSync(new URL('./task-thread-orchestrator.ts', import.meta.url), 'utf8')
    const runtimeSource = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')
    const subconsciousSource = readFileSync(new URL('./runtime-subconscious-tick.ts', import.meta.url), 'utf8')

    expect(invokeHandlersSource).toContain('return await dispatchTaskThread({')
    expect(executorRuntimeSource).toContain('const dispatchResult = await options.dispatchTaskThread({')
    expect(autonomySource).toContain('await input.dispatchTaskThread(buildAutonomousTaskDispatchInput({')
    expect(orchestratorSource).toContain('return await dispatchTaskThread(invocation.port, invocation.input)')
    expect(runtimeSource).toContain('dispatchTaskThread: invocation => dispatchTaskThreadWithExecutionDelivery(invocation)')
    expect(runtimeSource).toContain('dispatchTaskThread: async (port, payload) => await dispatchTaskThreadWithExecutionDelivery({')
    expect(runtimeSource).toContain('const result = await taskThreadOrchestrator.dispatch({')
    expect(runtimeSource).toContain('...preparedInvocation,')
    expect(subconsciousSource).toContain('dispatchTaskThread: async (payload: any) => await dispatchAutonomyTaskThread(payload)')
    expect(source).toContain('return await dispatchTaskThread\\(')
    expect(source).toContain('await options\\.dispatchTaskThread\\(')
    expect(source).toContain('await input\\.dispatchTaskThread\\(')
    expect(source).toContain('taskThreadOrchestrator\\.dispatch\\(')
    expect(source).toContain('dispatchTaskThreadWithExecutionDelivery\\(')
    expect(source).toContain('dispatchAutonomyTaskThread\\(')
  })

  it('keeps the current execution-dispatch candidate set equal to the explicit owner files so the broader bridge scan and explicit owner registry stay synchronized', () => {
    const rootDir = new URL('.', import.meta.url).pathname

    expect(collectAlicizationExecutionDispatchCandidateFiles(rootDir)).toEqual(
      collectAlicizationExecutionDispatchOwnerFiles(rootDir),
    )
  })

  it('makes the current boundary explicit: broader execution-dispatch candidates now stay aligned with the explicit bridge-owner registry, while future execution families still remain open', () => {
    const routeAuthoritySource = readFileSync(new URL('./project-awareness-route-authority-audit.test.ts', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')

    expect(routeAuthoritySource).toContain('from \'./execution-dispatch-entrypoint-candidate-audit\'')
    expect(routeAuthoritySource).toContain('collectAlicizationExecutionDispatchCandidateFiles(')
    expect(coverageSource).toContain('execution-dispatch-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('execution-dispatch-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('future execution dispatch families still need explicit owner registration')
    expect(matrixSource).toContain('runtime execution bridge and subconscious deferred bridge are now explicitly registered')
  })
})
