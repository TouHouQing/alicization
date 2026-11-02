import type { AlicizationExecutionRuntimeContext } from '@proj-alicization/stage-shared'

import type { AlicizationDbService } from '../db'
import type { LifeInterfaceAuthorization, LifeInterfaceRiskRequest } from '../life-interface-risk'
import type { BuildMainGatewayToolsOptions } from '../main-chat-execution-surface'
import type { WorkDelegationCapability, WorkStepParent } from './work-delegation-contracts'

import { AsyncLocalStorage } from 'node:async_hooks'
import { lstat, realpath } from 'node:fs/promises'
import { isAbsolute } from 'node:path'

import { errorMessageFrom } from '@moeru/std'

import * as v from 'valibot'

import { executionDigest } from './acceptance-compiler'
import { assertActionDispatchOperation, inheritActionNotStarted, markActionNotStarted } from './action-dispatch-context'
import { workDelegationThreadId } from './work-delegation-contracts'

export { workDelegationThreadId } from './work-delegation-contracts'

const delegations = new AsyncLocalStorage<{ parent: WorkStepParent, workspaceRoot: string, assertCurrent: () => Promise<void> }>()
export const readWorkStepDelegation = () => delegations.getStore() ?? null

const boundedText = v.pipe(v.string(), v.minLength(1), v.maxLength(8000))
const fields = { cwd: v.pipe(v.string(), v.minLength(1), v.maxLength(4096), v.check(isAbsolute)), effect: v.picklist(['observe', 'mutate']) }
const promptSchema = v.strictObject({ ...fields, prompt: boundedText })
const commandSchema = v.strictObject({ ...fields, command: boundedText, args: v.optional(v.pipe(v.array(v.pipe(v.string(), v.maxLength(2048))), v.maxLength(32))) })

/** Reuse governed executors only under the admitted parent step's authority. */
export function createWorkStepDelegation(options: {
  database: () => AlicizationDbService
  enabled: (cardId: string) => boolean
  authorize: (request: LifeInterfaceRiskRequest, signal?: AbortSignal) => Promise<LifeInterfaceAuthorization>
  runtimeContext: (input: { cardId: string, turnId: string, abortSignal: AbortSignal }) => Promise<AlicizationExecutionRuntimeContext>
  execute: BuildMainGatewayToolsOptions['executeTaskThread']
}) {
  return async (capabilityId: WorkDelegationCapability, raw: Record<string, unknown>, signal: AbortSignal) => {
    let childAdmitted = false
    let open = true
    try {
      const parameters = structuredClone(raw)
      const input = capabilityId === 'coding_agent.cli' ? v.parse(commandSchema, parameters) : v.parse(promptSchema, parameters)
      if (JSON.stringify(parameters).length > 12000)
        throw new Error('The delegated work step exceeds its complete approval preview budget')
      signal.throwIfAborted()
      const authority = await assertActionDispatchOperation([capabilityId], parameters)
      if (!authority?.cardId || !authority.turnId?.startsWith('task-run:') || !authority.effectId || !options.enabled(authority.cardId))
        throw new Error('Delegated work needs its current admitted parent work step')
      const database = options.database()
      const effect = await database.getLifeEffect(authority.effectId)
      const stamp = effect?.payload.actionResponsibility as Record<string, unknown> | undefined
      if (stamp?.kind !== 'work-step' || typeof stamp.planId !== 'string' || typeof stamp.stepId !== 'string')
        throw new Error('Delegated work has no durable parent responsibility')
      const view = await database.readLifeState({ executionPlanId: stamp.planId })
      const plan = view.execution?.plans.find(plan => plan.id === stamp.planId)
      const step = plan?.steps.find(step => step.id === stamp.stepId)
      if (!plan || !step || step.capabilityId !== capabilityId || view.cardId !== authority.cardId)
        throw new Error('Delegated work parent plan or operation changed')
      const cwd = await realpath(input.cwd)
      const directory = await lstat(cwd, { bigint: true })
      if (!directory.isDirectory() || directory.isSymbolicLink())
        throw new Error('Delegated work requires its exact local workspace directory')
      const assertCurrent = async () => {
        if (!open)
          throw new Error('Delegated work authority is closed')
        signal.throwIfAborted()
        if (options.database() !== database || !options.enabled(authority.cardId!))
          throw new Error('Delegated work owner changed')
        await assertActionDispatchOperation([capabilityId], parameters)
        const current = await lstat(cwd, { bigint: true })
        if (!current.isDirectory() || current.isSymbolicLink() || current.dev !== directory.dev || current.ino !== directory.ino || await realpath(input.cwd) !== cwd)
          throw new Error('Delegated work workspace identity changed after approval')
        signal.throwIfAborted()
      }
      await assertCurrent()
      // Open-ended code/commands can do more than edit one known file. The
      // complete immutable proposal, workspace and parent version are reviewed.
      const goal = view.obligations.find(goal => goal.id === plan.rootObligationId)?.summary ?? '委托执行'
      const approval = await options.authorize({ cardId: authority.cardId, operation: capabilityId, targetId: cwd, label: `工作步骤 ${plan.steps.indexOf(step) + 1}：${goal}`, riskLevel: 'danger', actionCategory: 'execute', reason: '委托代码执行器可以运行命令或修改工作区。仅批准本次步骤、指定工作区和完整参数；完成后仍独立核对父任务的验收条件。', effectDigest: executionDigest(parameters), targetFingerprint: executionDigest({ responsibility: stamp, cwd, device: String(directory.dev), inode: String(directory.ino) }), previewText: JSON.stringify(parameters, null, 2) }, signal)
      if (!approval.allow || !approval.approvalRef)
        return markActionNotStarted({ ok: false, status: 'blocked', errorCode: 'WORK_DELEGATION_NOT_APPROVED', reason: approval.reason, effectMayHaveOccurred: false, sideEffectState: 'none' })
      await assertCurrent()
      const parent: WorkStepParent = { version: 1, cardId: plan.cardId, effectId: authority.effectId, planId: plan.id, planRevision: plan.revision, rootThreadId: plan.rootThreadId, rootObligationId: plan.rootObligationId, obligationGeneration: plan.obligationGeneration, stepId: step.id, attemptId: String(stamp.attemptId), capabilityId, inputHash: executionDigest(parameters), approvalRef: approval.approvalRef }
      const runtimeContext = await options.runtimeContext({ cardId: parent.cardId, turnId: authority.turnId, abortSignal: signal })
      await assertCurrent()
      const channel = capabilityId === 'coding_agent.codex' ? 'codex' : capabilityId === 'coding_agent.claude_code' ? 'claude-code' : 'cli'
      const dispatch = 'command' in input
        ? { cli: { command: input.command, args: input.args, cwd, timeoutMs: 60000, runtimeContext } }
        : channel === 'codex'
          ? { codex: { prompt: input.prompt, cwd, sandbox: input.effect === 'observe' ? 'read-only' as const : 'workspace-write' as const, timeoutMs: 120000, runtimeContext } }
          : { claudeCode: { prompt: input.prompt, cwd, allowTools: input.effect === 'mutate', permissionMode: 'default' as const, timeoutMs: 120000, runtimeContext } }
      const result = await delegations.run({ parent, workspaceRoot: cwd, assertCurrent }, async () => {
        childAdmitted = true
        return options.execute({ context: { cardId: parent.cardId, turnId: authority.turnId!, toolCallId: authority.effectId, abortSignal: signal, authorizationSource: 'human-ui' }, dispatchMode: 'inline', task: { kind: channel === 'cli' ? 'run-command' : input.effect === 'observe' ? 'codebase-investigation' : 'codebase-edit', goal: `工作步骤 ${step.id}`, origin: 'user', effect: input.effect, permissionMode: 'explicit', justification: 'grounded', riskBudget: 'medium', requestedChannel: channel, prefersPersistentSession: true }, dispatch, abortSignal: signal })
      })
      if (result.stage === 'plan')
        return markActionNotStarted({ ...result, ok: false, status: 'blocked', effectMayHaveOccurred: false, sideEffectState: 'none', parent, rootCompletionProven: false, proofScope: 'delegated-admission-only' })
      if (result.thread.id !== workDelegationThreadId(parent))
        throw new Error('Delegated work returned a result from a different child responsibility')
      const completed = result.ok && result.stage === 'dispatch' && result.thread.status === 'completed'
      // A nonzero exit can follow real writes. Only the private local
      // no-dispatch token can remove this uncertainty, never backend JSON.
      return inheritActionNotStarted(result, { ...result, ok: completed, status: completed ? 'completed' : 'blocked', ...(!completed ? { effectMayHaveOccurred: true, sideEffectState: 'unknown' } : {}), childThreadId: result.thread.id, parent, rootCompletionProven: false, proofScope: 'delegated-step-only' })
    }
    catch (error) {
      if (childAdmitted)
        throw error
      return markActionNotStarted({ ok: false, status: 'blocked', errorCode: 'WORK_DELEGATION_NOT_STARTED', reason: errorMessageFrom(error), effectMayHaveOccurred: false, sideEffectState: 'none' })
    }
    finally {
      open = false
    }
  }
}
