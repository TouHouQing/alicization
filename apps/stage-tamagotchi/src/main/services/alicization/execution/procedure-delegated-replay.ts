import type { AlicizationExecutionRuntimeContext } from '@proj-alicization/stage-shared'

import type { ProcedureDelegatedReplayFactory } from './procedure-delegated-replay-types'
import type { WorkDelegationCapability } from './work-delegation-contracts'

import { Buffer } from 'node:buffer'
import { createHash, randomUUID } from 'node:crypto'
import { unwatchFile, watchFile } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative } from 'node:path'
import { platform } from 'node:process'

import { locateAlicizationExecutionBinary } from '../execution-command-env'
import { createAlicizationExecutorRuntime } from '../executor-runtime'
import { createTaskThreadOrchestrator } from '../task-thread-orchestrator'
import { executionDigest } from './acceptance-compiler'
import { markActionNotStartedError } from './action-dispatch-context'
import { instantiateProcedureTemplate } from './procedure-template'
import { workDelegationCapabilities } from './work-delegation-contracts'
import { createWorkStepDelegation } from './work-step-delegation'

const quotePowerShell = (value: string) => `'${value.replaceAll('\'', '\'\'')}'`

/** Fresh fixed fixture instructions enter the ordinary governed parent/child executor. */
export const createProcedureDelegatedReplay: ProcedureDelegatedReplayFactory = async ({ root, database, registry, template, interrupts, signal }) => {
  signal.throwIfAborted()
  const required = template.tools.map(tool => tool.id).filter((id): id is WorkDelegationCapability => workDelegationCapabilities.includes(id as WorkDelegationCapability))
  if (required.length !== 1 || template.steps.filter(step => typeof step.capabilityId === 'string' && step.capabilityId.startsWith('coding_agent.')).length !== 1)
    throw new Error('Delegated replay requires one explicit program step')
  if (platform !== 'win32')
    throw new Error('The fixed delegated fixture currently requires the Windows execution port')
  const terminal = await locateAlicizationExecutionBinary('powershell')
  if (!terminal)
    throw new Error('The owned delegated fixture terminal is unavailable')
  const capability = required[0]
  const channel = capability === 'coding_agent.codex' ? 'codex' : capability === 'coding_agent.claude_code' ? 'claude-code' : 'cli'
  if (channel !== 'cli' && !await locateAlicizationExecutionBinary(channel === 'codex' ? 'codex' : 'claude'))
    throw new Error('The configured delegated backend is unavailable for real evaluation')
  const inside = (parent: string, child: string) => {
    const rel = relative(parent, child)
    return isAbsolute(child) && rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\') && !isAbsolute(rel)
  }
  const controller = new AbortController()
  const activeSignal = AbortSignal.any([signal, controller.signal])
  const orchestrator = createTaskThreadOrchestrator()
  const stats = { approvals: 0, denied: 0, dispatches: 0, writeObserved: 0, interrupted: 0 }
  let mode = 'normal'
  let expectedInput: Record<string, unknown> | null = null
  let disposed = false
  let sessionId = `owned-procedure-replay:${randomUUID()}`
  let producedFiles: string[] = []
  let producedHash = ''
  let programSource: { path: string, sha256: string } | null = null
  async function assertProgramSource() {
    if (!programSource || createHash('sha256').update(await readFile(programSource.path)).digest('hex') !== programSource.sha256)
      throw new Error('The owned fixed fixture program changed before child admission')
  }
  await database.upsertChannelCapabilityManifest({ channel, available: true, enabled: true, ready: true, sessionAffinity: true, lastCheckedAt: Date.now() })
  const executor = createAlicizationExecutorRuntime({
    getAlicizationDb: () => database,
    appendAuditLog: async (input) => { await database.appendAuditLog(input) },
    dispatchTaskThread: async (invocation) => {
      stats.dispatches++
      return interrupts.run({ cardId: 'procedure-evaluation', threadId: invocation.input.threadId, signal: invocation.input.abortSignal }, childSignal => orchestrator.dispatch({ ...invocation, input: { ...invocation.input, abortSignal: childSignal } }))
    },
    ensureSessionId: async () => sessionId,
    getCardKillSwitchState: () => disposed || activeSignal.aborted ? 'SUSPENDED' : 'ACTIVE',
    getGlobalKillSwitchState: () => disposed || activeSignal.aborted ? 'SUSPENDED' : 'ACTIVE',
    normalizeSessionId: value => String(value ?? ''),
    sanitizeText: (value, fallback = '') => typeof value === 'string' ? value.trim() : fallback,
  })
  const delegate = createWorkStepDelegation({
    database: () => database,
    enabled: cardId => cardId === 'procedure-evaluation' && !disposed && !activeSignal.aborted,
    authorize: async (request) => {
      activeSignal.throwIfAborted()
      if (!expectedInput || request.operation !== capability || request.effectDigest !== executionDigest(expectedInput) || request.previewText !== JSON.stringify(expectedInput, null, 2) || typeof request.targetId !== 'string' || request.targetId !== expectedInput.cwd || !inside(root, request.targetId))
        throw new Error('Replay approval crossed its exact fixed fixture command or directory')
      await assertProgramSource()
      if (mode === 'refused') {
        stats.denied++
        return { allow: false, reason: 'Owned delegated counterexample refused before child admission' }
      }
      stats.approvals++
      return { allow: true, reason: 'Fixed synthetic fixture within the explicit method evaluation', approvalRef: `procedure-fixture:${randomUUID()}` }
    },
    runtimeContext: async ({ cardId, turnId }): Promise<AlicizationExecutionRuntimeContext> => ({ generatedAt: Date.now(), cardId, turnId, recentActions: [], sensory: { collectedAt: null, running: false, stale: true, ageMs: 0, foregroundWindow: null, capture: null } }),
    execute: input => executor.executeMainGatewayTaskThread(input),
  })
  async function execute(input: Record<string, unknown>, childSignal: AbortSignal) {
    try { await assertProgramSource() }
    catch (error) { throw markActionNotStartedError(error) }
    if (mode !== 'interrupted')
      return delegate(capability, input, AbortSignal.any([activeSignal, childSignal]))
    const interruption = new AbortController()
    const observed = new Map(await Promise.all(producedFiles.map(async file => [file, await readFile(file).then(bytes => createHash('sha256').update(bytes).digest('hex'), () => null)] as const)))
    const listeners: Array<{ file: string, listener: () => void }> = []
    const timer = setTimeout(() => interruption.abort('fixture-result-not-observed'), 30000)
    for (const file of producedFiles) {
      const listener = () => {
        void readFile(file).then((bytes) => {
          if (!interruption.signal.aborted && observed.get(file) !== producedHash && createHash('sha256').update(bytes).digest('hex') === producedHash) {
            stats.writeObserved++
            stats.interrupted++
            interruption.abort('owned-fixture-write-observed-before-receipt')
          }
        }).catch(() => {})
      }
      listeners.push({ file, listener })
      watchFile(file, { interval: 20 }, listener)
    }
    try {
      return await delegate(capability, input, AbortSignal.any([activeSignal, childSignal, interruption.signal]))
    }
    finally {
      clearTimeout(timer)
      for (const { file, listener } of listeners)
        unwatchFile(file, listener)
    }
  }
  return {
    tools: { [capability]: execute },
    snapshot: () => ({ ...stats, inFlight: orchestrator.snapshot().inFlightThreadIds.length }),
    async prepare(input) {
      activeSignal.throwIfAborted()
      if (!inside(root, input.directory))
        throw new Error('Delegated replay requires its newly owned fixture directory')
      await mkdir(input.directory, { recursive: true })
      mode = input.mode
      sessionId = `owned-procedure-replay:${randomUUID()}`
      const arguments_ = structuredClone(input.arguments)
      for (const parameter of input.template.parameters) {
        if (parameter.role === 'workspace')
          arguments_[parameter.name] = input.directory
        else if (parameter.role === 'program')
          arguments_[parameter.name] = terminal
        else if (parameter.role === 'program-arguments')
          arguments_[parameter.name] = []
        else if (parameter.role === 'instructions')
          arguments_[parameter.name] = 'Owned fixture instructions will be bound before admission.'
      }
      const proposal = instantiateProcedureTemplate(input.template, arguments_, registry, 'Owned delegated fixture')
      const files: string[] = []
      for (const criterion of proposal.criteria) {
        const predicate = criterion.predicate
        if (!('path' in predicate) || !inside(input.directory, predicate.path))
          throw new Error('Delegated fixture cannot produce an artifact outside its owned directory')
        if (predicate.kind === 'directory-members')
          files.push(...predicate.names.map(name => join(predicate.path, name)))
        else
          files.push(predicate.path)
      }
      const bytes = Buffer.from(input.text, 'utf8').toString('base64')
      producedFiles = [...new Set(files)]
      producedHash = createHash('sha256').update(input.text).digest('hex')
      const script = (input.mode === 'missing-artifact'
        ? 'Write-Output "Owned counterexample deliberately creates no artifact"'
        : producedFiles.map(file => `[System.IO.Directory]::CreateDirectory(${quotePowerShell(dirname(file))}) | Out-Null; [System.IO.File]::WriteAllBytes(${quotePowerShell(file)},[Convert]::FromBase64String(${quotePowerShell(bytes)}))`).join('; ')) + (input.mode === 'interrupted' ? '; Start-Sleep -Seconds 30' : '')
      // Keep the fixed program out of a single bounded command argument. This
      // program is fixture setup; accepted output files are still child-only.
      const programPath = join(input.directory, 'owned-replay-program.ps1')
      await writeFile(programPath, script, { encoding: 'utf8', flag: 'wx' })
      programSource = { path: programPath, sha256: createHash('sha256').update(script).digest('hex') }
      const bootstrap = `& ([scriptblock]::Create([System.IO.File]::ReadAllText(${quotePowerShell(programPath)},[System.Text.Encoding]::UTF8)))`
      for (const parameter of input.template.parameters) {
        if (parameter.role === 'program-arguments')
          arguments_[parameter.name] = ['-NoProfile', '-NonInteractive', '-Command', bootstrap]
        if (parameter.role === 'instructions') {
          arguments_[parameter.name] = input.mode === 'missing-artifact'
            ? '只回复 OK，不执行工具，不创建或修改任何文件。这是已授权的缺少产物反例。'
            : `这是已授权的独立复跑。只在当前工作目录内用终端执行下面固定 PowerShell 命令，它读取本次测试的已校验脚本。不要修改该脚本或其他文件，不访问外网。然后只回复完成。命令：\n${bootstrap}`
        }
      }
      const expanded = instantiateProcedureTemplate(input.template, arguments_, registry, 'Owned delegated fixture')
      expectedInput = structuredClone(expanded.steps.find(step => step.capabilityId === capability)!.input)
      return arguments_
    },
    async dispose() {
      disposed = true
      controller.abort('procedure-replay-disposed')
      await orchestrator.dispose()
      if (orchestrator.snapshot().inFlightThreadIds.length)
        throw new Error('Delegated fixture children did not fully settle')
    },
  }
}
