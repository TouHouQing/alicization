import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import process from 'node:process'

import { Buffer } from 'node:buffer'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { register } from 'node:module'
import { join } from 'node:path'

// The actual child owner runs outside Vitest and uses the same fixed raw assets.
register(new URL('../../../../../../scripts/execution-raw-loader.mjs', import.meta.url))
async function main() {
  const { setupAlicizationDb } = await import('../../db')
  const { createLifeTurnRuntime } = await import('../../life-turn-runtime')
  const { createCanonicalToolRegistry } = await import('../../turn-os/tool-registry')
  const { executeCliTaskThread } = await import('../../executor-adapters/cli')
  const { executeCodexTaskThread } = await import('../../executor-adapters/codex')
  const { executeClaudeCodeTaskThread } = await import('../../executor-adapters/claude-code')
  const { withActionDispatch } = await import('../action-dispatch-context')
  const { createExecutionResourceBroker } = await import('../resource-broker')

  const [root, channel, boundary, nonce, transports] = process.argv.slice(2)
  if (!root || !['cli', 'codex', 'claude-code'].includes(channel) || !['suspended', 'actuated', 'result', 'committed'].includes(boundary) || !/^[a-f0-9]{32}$/u.test(nonce))
    throw new Error('Invalid owned crash fixture')
  const capabilityId = channel === 'claude-code' ? 'coding_agent.claude_code' : `coding_agent.${channel}`
  const native = join(root, 'native')
  const workspace = join(root, 'workspace')
  await mkdir(workspace)
  const artifact = join(workspace, 'actual.txt')
  const ready = join(workspace, 'writer.json')
  const marker = join(workspace, 'after-crash.txt')
  const bytes = `Owned ${channel} ${nonce} 中文🙂`
  const prompt = `Owned ${nonce}: only the inert transport fixture; no provider request.`
  const writer = join(workspace, 'owned-writer.cjs')
  const actor = join(workspace, 'owned-actor.cjs')
  await writeFile(writer, `const fs=require('node:fs');fs.writeFileSync(${JSON.stringify(artifact)},${JSON.stringify(bytes)});fs.writeFileSync(${JSON.stringify(ready)},JSON.stringify({pid:process.pid,nonce:${JSON.stringify(nonce)}}));setTimeout(()=>fs.writeFileSync(${JSON.stringify(marker)},'forbidden'),30000)`)
  await writeFile(actor, `require('node:child_process').spawn(process.execPath,[${JSON.stringify(writer)},${JSON.stringify(nonce)}],{detached:true,stdio:'ignore',windowsHide:true});setInterval(()=>{},1000)`)
  const success = boundary !== 'actuated'
  process.env.PATH = `${transports};${process.env.PATH}`
  process.env.CODEX_CLI_PATH = join(transports, 'codex.exe')
  process.env.CODEX_HOME = join(transports, 'codex-home')
  process.env.ALICIZATION_OWNED_PROCESS_FIXTURE = JSON.stringify({ mode: success ? 'success' : 'cancel', node: process.execPath, script: actor, artifact, bytes: Buffer.from(bytes).toString('base64') })
  const database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, resourceBroker: broker, now: Date.now })
  const signal = new AbortController().signal
  const command = channel === 'cli'
    ? { command: 'node', args: success ? ['-e', `require('node:fs').writeFileSync(${JSON.stringify(artifact)},${JSON.stringify(bytes)})`] : [actor, nonce], cwd: workspace, timeoutMs: 60_000 }
    : { prompt, cwd: workspace, timeoutMs: 60_000 }
  await life.admit({ cardId: 'alice', turnId: nonce, conversationId: nonce, messages: [{ role: 'user', content: '只执行自有崩溃回归，不能访问测试目录之外的数据。' }] }, signal)
  const manifest = createCanonicalToolRegistry().resolveActive(capabilityId)!
  const action = await life.beforeAction({ cardId: 'alice', turnId: nonce, actionId: 'owned-dispatch', capabilityId, parameters: command, effectContract: manifest.effects }, signal)
  await action.authorizeDispatch(command)
  await writeFile(join(root, 'action.json'), JSON.stringify({ effectId: action.id, command, capabilityId, nonce }))
  const thread: AlicizationTaskThreadRecord = { id: nonce, decisionTraceId: nonce, turnId: nonce, sessionId: nonce, origin: 'user-turn', goal: 'Only the owned crash boundary', kind: 'run-command', status: 'planned', selectedChannel: channel as 'cli' | 'codex' | 'claude-code', proposedChannel: channel as 'cli' | 'codex' | 'claude-code', summary: '', metadata: { task: { effect: 'mutate', permissionMode: 'explicit' } }, createdAt: Date.now(), updatedAt: Date.now(), lastEventAt: null, completedAt: null }
  await database.upsertTaskThread(thread)
  async function pause(name: string) {
    await writeFile(join(root, 'boundary.json'), JSON.stringify({ name, nonce, ownerPid: process.pid }))
    // Kept alive deliberately: the parent kills this original ChildProcess handle.
    await new Promise<void>(() => setInterval(() => {}, 1000))
  }
  async function authorize() {
    const authority = await action.assertDispatchCurrent()
    if (boundary === 'suspended') {
      for (const program of await readdir(native).catch(() => [])) {
        for (const run of await readdir(join(native, program)).catch(() => [])) {
          if (run.startsWith('run-') && await readFile(join(native, program, run, 'ready.json')).then(() => true, () => false))
            await pause('suspended')
        }
      }
    }
    return authority
  }
  const common = { thread, workspaceRoot: workspace, processJobsRoot: native, abortSignal: signal }
  const result = await withActionDispatch(authorize, () => channel === 'cli'
    ? executeCliTaskThread({ ...common, command: command as Parameters<typeof executeCliTaskThread>[0]['command'] })
    : channel === 'codex'
      ? executeCodexTaskThread({ ...common, command: { prompt, cwd: workspace, sandbox: 'workspace-write', timeoutMs: 60_000 } })
      : executeClaudeCodeTaskThread({ ...common, command: { prompt, cwd: workspace, allowTools: true, timeoutMs: 60_000 } }))
  if (!result.ok)
    throw new Error(`Owned transport failed: ${result.errorCode}`)
  if (boundary === 'result')
    await pause('result')
  await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'success', output: result, interrupted: false })
  await pause('committed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
