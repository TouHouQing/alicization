import { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { env, platform } from 'node:process'

import { expect, it } from 'vitest'

import { controlFileRecoveryProcess } from './file-recovery-process'

async function fixture() {
  const executable = join(env.SystemRoot!, 'System32/WindowsPowerShell/v1.0/powershell.exe')
  const source = `[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
@{pid=$PID;creationTimeTicks=[string]([Diagnostics.Process]::GetCurrentProcess().StartTime.ToUniversalTime().Ticks)} | ConvertTo-Json -Compress
[void][Console]::In.ReadLine()`
  const child = execFile(executable, ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(source, 'utf16le').toString('base64')], { windowsHide: true, timeout: 60000, maxBuffer: 4096 }, () => {})
  const closed = new Promise<void>(resolve => child.once('close', () => resolve()))
  const ready = await new Promise<{ pid: number, creationTimeTicks: string }>((resolve, reject) => {
    let prefix = ''
    child.once('error', reject)
    child.once('close', () => reject(new Error('Owned fixture closed before its identity was ready')))
    child.stdout?.on('data', (chunk) => {
      prefix += chunk.toString()
      if (prefix.includes('\n')) {
        try { resolve(JSON.parse(prefix.trim())) }
        catch (error) { reject(error) }
      }
    })
  })
  return { child, closed, identity: { ...ready, executable, workerPath: join(tmpdir(), 'synthetic-owned-process-fixture.ps1'), workerHash: createHash('sha256').update(source).digest('hex') } }
}

const windowsTest = platform === 'win32' ? it : it.skip
windowsTest('pins the owned Windows process object before inspecting or terminating, refusing changed birth/image identity', async () => {
  const f = await fixture()
  try {
    expect(f.identity.pid).toBe(f.child.pid)
    expect(await controlFileRecoveryProcess('inspect', f.identity)).toBe('running')
    const otherBirth = { ...f.identity, creationTimeTicks: String(BigInt(f.identity.creationTimeTicks) + 1n) }
    expect(await controlFileRecoveryProcess('stop', otherBirth)).toBe('stopped')
    expect(await controlFileRecoveryProcess('inspect', f.identity)).toBe('running')
    expect(await controlFileRecoveryProcess('stop', { ...f.identity, executable: join(env.SystemRoot!, 'System32/not-the-owned-executable.exe') })).toBe('unknown')
    expect(await controlFileRecoveryProcess('inspect', f.identity)).toBe('running')
    await expect(controlFileRecoveryProcess('stop', { ...f.identity, pid: 0 })).rejects.toThrow()
    expect(await controlFileRecoveryProcess('stop', f.identity)).toBe('stopped')
    await f.closed
    expect(await controlFileRecoveryProcess('inspect', f.identity)).toBe('stopped')
  }
  finally {
    f.child.stdin?.end()
    await f.closed
  }
}, 60000)
