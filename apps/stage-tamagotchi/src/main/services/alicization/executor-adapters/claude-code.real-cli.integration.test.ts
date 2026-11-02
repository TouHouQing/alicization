import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import process from 'node:process'

import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { describe, expect, it } from 'vitest'

import { locateAlicizationExecutionBinary } from '../execution-command-env'
import { withActionDispatch } from '../execution/action-dispatch-context'
import { executeClaudeCodeTaskThread } from './claude-code'

const enabled = process.env.ALICIZATION_RUN_REAL_CLAUDE === '1'
const execFileAsync = promisify(execFile)

async function ownedNativeClient(binary: string, marker: string) {
  const quote = (value: string) => `'${value.replaceAll('\'', '\'\'')}'`
  const command = `Get-CimInstance Win32_Process -Filter "Name = 'claude.exe'" | Where-Object { $_.ExecutablePath -eq ${quote(binary)} -and $_.CommandLine.Contains(${quote(marker)}) } | Select-Object ProcessId,CreationDate | ConvertTo-Json -Compress`
  const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, timeout: 10_000 })
  return stdout.trim() ? [JSON.parse(stdout)].flat() as Array<{ ProcessId: number, CreationDate: string }> : []
}

function thread(id: string, effect: 'observe' | 'mutate'): AlicizationTaskThreadRecord {
  return {
    id,
    decisionTraceId: id,
    sessionId: id,
    turnId: id,
    origin: 'user-turn',
    kind: 'agent-delegation',
    goal: 'Verify the actual Claude Code adapter only in an owned synthetic fixture.',
    proposedChannel: 'claude-code',
    selectedChannel: 'claude-code',
    status: 'planned',
    summary: null,
    metadata: { task: { effect, permissionMode: effect === 'observe' ? 'none' : 'explicit' } },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastEventAt: null,
    completedAt: null,
  }
}

async function fixture() {
  // These opt-in tests inherit a caller-owned, isolated CLI configuration. They
  // never discover credentials or adopt the developer's Claude conversation.
  expect(process.env.CLAUDE_CONFIG_DIR).toBeTruthy()
  const root = await mkdtemp(join(tmpdir(), 'life-real-claude-'))
  await writeFile(join(root, 'owner.json'), JSON.stringify({ format: 'alicization-real-claude-fixture-v1', root }))
  return root
}

async function receipt(root: string, value: Record<string, unknown>) {
  await writeFile(join(root, 'receipt.json'), JSON.stringify({ ...value, at: new Date().toISOString() }, null, 2))
  const reportRoot = process.env.ALICIZATION_REAL_CLAUDE_REPORT_ROOT
  if (reportRoot) {
    await mkdir(reportRoot, { recursive: true })
    await writeFile(join(reportRoot, `${root.split(/[\\/]/u).at(-1)}.json`), JSON.stringify({ root, ...value }, null, 2))
  }
}

describe('actual Claude Code adapter in an owned fixture', () => {
  it.skipIf(!enabled).each([1, 2, 3])('completes a tool-free provider turn without changing the sentinel: %s', async (round) => {
    const root = await fixture()
    const sentinel = join(root, 'sentinel.txt')
    await writeFile(sentinel, 'Owned sentinel: 中文🙂\n')
    const before = await stat(sentinel)
    const marker = `CLAUDE_OBSERVE_${randomUUID()}`
    const result = await withActionDispatch(async () => ({ cardId: 'owned-real-claude', effectId: marker, expiresAt: null }), () => executeClaudeCodeTaskThread({
      thread: thread(marker, 'observe'),
      workspaceRoot: root,
      command: { prompt: `Reply with exactly ${marker}. Do not use tools.`, model: process.env.ANTHROPIC_MODEL, allowTools: false, timeoutMs: 60_000 },
    }))
    const unchanged = (await readFile(sentinel, 'utf8')) === 'Owned sentinel: 中文🙂\n' && (await stat(sentinel)).mtimeMs === before.mtimeMs
    await receipt(root, { round, scenario: 'tool-free-provider', ok: result.ok, errorCode: result.errorCode, finalStatus: result.finalStatus, markerReturned: result.output?.includes(marker) === true, sentinelUnchanged: unchanged })
    expect(result.ok, result.errorCode).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output?.includes(marker)).toBe(true)
    expect(unchanged).toBe(true)
  }, 80_000)

  it.skipIf(!enabled).each([1, 2, 3])('independently verifies an explicitly approved new file instead of trusting provider prose: %s', async (round) => {
    const root = await fixture()
    const marker = `真实执行 ${round} ${randomUUID()} 中文🙂\n`
    const target = join(root, 'approved-output.txt')
    const id = randomUUID()
    const result = await withActionDispatch(async () => ({ cardId: 'owned-real-claude', effectId: id, expiresAt: null }), () => executeClaudeCodeTaskThread({
      thread: thread(id, 'mutate'),
      workspaceRoot: root,
      command: {
        prompt: `This is an explicitly approved synthetic file test. Use the Write tool to create only ${JSON.stringify(target)} with exactly the following JSON-decoded UTF-8 string: ${JSON.stringify(marker)}. Do not run commands, access other files, contact other services, or create any other artifact. Then reply done.`,
        model: process.env.ANTHROPIC_MODEL,
        allowTools: true,
        permissionMode: 'acceptEdits',
        timeoutMs: 60_000,
      },
    }))
    const actual = await readFile(target, 'utf8').catch(() => null)
    const names = await readdir(root)
    const unexpected = names.filter(name => !['owner.json', 'approved-output.txt'].includes(name))
    await receipt(root, { round, scenario: 'approved-file-write', ok: result.ok, errorCode: result.errorCode, finalStatus: result.finalStatus, independentlyVerifiedBytes: actual === marker, unexpectedArtifacts: unexpected })
    expect(result.ok, result.errorCode).toBe(true)
    expect(actual === marker, 'The actual file bytes must match; a successful provider exit cannot replace verification.').toBe(true)
    expect(unexpected).toEqual([])
  }, 80_000)

  it.skipIf(!enabled)('refuses revoked authority before starting the real client', async () => {
    const root = await fixture()
    let checks = 0
    const result = await withActionDispatch(async () => {
      if (++checks > 1)
        throw new Error('Owned source withdrawn before dispatch')
      return { cardId: 'owned-real-claude', effectId: 'revoked', expiresAt: null }
    }, () => executeClaudeCodeTaskThread({ thread: thread('revoked', 'observe'), workspaceRoot: root, command: { prompt: 'Never dispatch this request.', allowTools: false, timeoutMs: 10_000 } }))
    await receipt(root, { scenario: 'source-withdrawal', ok: result.ok, errorCode: result.errorCode, checks, effectMayHaveOccurred: result.effectMayHaveOccurred, sideEffectState: result.sideEffectState })
    expect(checks).toBe(2)
    expect(result).toMatchObject({ ok: false, errorCode: 'CLAUDE_CODE_DISPATCH_REVOKED', sideEffectState: 'none', effectMayHaveOccurred: false })
    expect(result.events.some(event => event.kind === 'dispatch')).toBe(false)
  })

  it.skipIf(!enabled || process.platform !== 'win32').each([1, 2, 3])('stops the exact observed native client on cancellation without a provider reply: %s', async (round) => {
    const root = await fixture()
    const binary = await locateAlicizationExecutionBinary('claude')
    expect(binary).toBeTruthy()
    const id = `CANCEL_${randomUUID()}`
    const controller = new AbortController()
    const pending = withActionDispatch(async () => ({ cardId: 'owned-real-claude', effectId: id, expiresAt: null }), () => executeClaudeCodeTaskThread({ thread: thread(id, 'observe'), workspaceRoot: root, abortSignal: controller.signal, command: { prompt: `Reply with ${id} without tools.`, model: process.env.ANTHROPIC_MODEL, allowTools: false, timeoutMs: 60_000 } }))
    let observed: Array<{ ProcessId: number, CreationDate: string }> = []
    try {
      const deadline = Date.now() + 20_000
      while (!observed.length && Date.now() < deadline) {
        observed = await ownedNativeClient(binary!, id)
        if (!observed.length)
          await new Promise(resolve => setTimeout(resolve, 100))
      }
      // A synthetic cancel callback alone cannot prove the client ever ran.
    }
    finally {
      controller.abort(new Error('Owned native-client cancellation'))
    }
    const result = await pending
    const survivors = await ownedNativeClient(binary!, id)
    await receipt(root, { round, scenario: 'observed-native-client-cancellation', ok: result.ok, finalStatus: result.finalStatus, errorCode: result.errorCode, observed, survivors, scope: 'Actual direct client exit; no delegated child-command tree or remote-effect completion is inferred.' })
    expect(observed.length).toBe(1)
    expect(result).toMatchObject({ ok: false, finalStatus: 'cancelled', errorCode: 'CLAUDE_CODE_ABORTED' })
    expect(survivors).toEqual([])
    expect((await readdir(root)).sort()).toEqual(['owner.json', 'receipt.json'])
  }, 45_000)
})
