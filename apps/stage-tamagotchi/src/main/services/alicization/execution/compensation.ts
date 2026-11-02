import type { ExecutionResourceBroker } from './resource-broker'

import { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { env, platform } from 'node:process'

import workerScript from './compensation-worker.ps1?raw'

import { executionFileResources } from './resource-broker'

export interface FileCompensation {
  cardId: string
  effectId: string
  recoveryId: string
  path: string
  device: string
  inode: string
  removeCreated?: true
  writtenHash: string
  backupHash: string
  backupBytes: Uint8Array
}

export type FileCompensationBinding = Omit<FileCompensation, 'backupBytes'>

/**
 * Only a previously owned file version can be compensated. Messages, payments,
 * uploads and arbitrary command execution have no automatic rollback here.
 */
export async function compensateExecutionFile(raw: FileCompensation, ports: {
  broker: ExecutionResourceBroker
  effectOwnsVersion: (input: Readonly<FileCompensationBinding>) => Promise<boolean>
  audit: (result: Record<string, unknown>) => Promise<void>
  signal?: AbortSignal
}) {
  const input = Object.freeze({ ...raw, backupBytes: Uint8Array.from(raw.backupBytes) })
  ports.signal?.throwIfAborted()
  if (platform !== 'win32')
    throw new Error('Exclusive file compensation is unavailable on this platform')
  if (!isAbsolute(input.path) || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/u.test(input.recoveryId) || input.backupBytes.length > 2_097_152 || !/^\d+$/u.test(input.device) || !/^[1-9]\d{0,19}$/u.test(input.inode) || (input.removeCreated && input.backupBytes.length !== 0) || !/^[a-f\d]{64}$/u.test(input.writtenHash) || createHash('sha256').update(input.backupBytes).digest('hex') !== input.backupHash)
    throw new Error('Compensation requires a bounded, hash-verified original version')
  const { backupBytes, ...fields } = input
  const binding = Object.freeze(fields)
  if (!await ports.effectOwnsVersion(binding))
    throw new Error('Compensation is not authorized by the exact original effect')
  const resources = await executionFileResources(input.path)
  const recoveryOwner = `file-restore:${input.recoveryId}`
  const lease = await ports.broker.withOwner(recoveryOwner, async () => ports.broker.acquire({ owner: recoveryOwner, effectId: recoveryOwner, effectCardId: input.cardId, resources }))
  let root: string | undefined
  let uncertain = false
  let nativeStopped = true
  let stopAcknowledgment: Promise<void> | undefined
  try {
    root = await mkdtemp(join(tmpdir(), 'alicization-compensate-'))
    const path = join(root, 'worker.ps1')
    await writeFile(path, `\uFEFF${workerScript}`, 'utf8')
    ports.signal?.throwIfAborted()
    ports.broker.assert(lease)
    await ports.audit({ stage: 'prepared', ...binding })
    if (!await ports.effectOwnsVersion(binding))
      throw new Error('Compensation original effect changed before native dispatch')
    ports.signal?.throwIfAborted()
    ports.broker.assert(lease)
    uncertain = true
    const startedAt = Date.now()
    const expiresAt = Math.min(lease.expiresAt, startedAt + 12000)
    const executable = join(env.SystemRoot!, 'System32/WindowsPowerShell/v1.0/powershell.exe')
    const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
      let ended = false
      let readyLine = ''
      let prefix = ''
      const child = execFile(executable, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path], { windowsHide: true, timeout: 12_000, maxBuffer: 32_000, signal: ports.signal }, (error, stdout) => {
        ended = true
        if (error) {
          reject(error)
        }
        else {
          try {
            const lines = stdout.trim().split(/\r?\n/u)
            if (!readyLine || lines.length !== 2 || lines[0].trim() !== readyLine)
              throw new Error('Compensation native handshake or terminal frame changed')
            resolve(JSON.parse(lines[1]))
          }
          catch (error) { reject(error) }
        }
      })
      const fail = (error: unknown) => {
        ended = true
        child.kill()
        reject(error)
      }
      nativeStopped = false
      stopAcknowledgment = new Promise<void>((resolve) => {
        // AbortError reports cancellation; close proves this process and its
        // stdio actually stopped before its private worker file is removed.
        child.once('close', () => { nativeStopped = true; resolve() })
      })
      const receive = (chunk: Uint8Array) => {
        if (readyLine || ended)
          return
        prefix += Buffer.from(chunk).toString('utf8')
        if (prefix.length > 4096) {
          fail(new Error('Compensation native handshake exceeded its budget'))
          return
        }
        const newline = prefix.indexOf('\n')
        if (newline < 0)
          return
        readyLine = prefix.slice(0, newline).trim()
        child.stdout?.removeListener('data', receive)
        void (async () => {
          const ready = JSON.parse(readyLine) as { kind?: unknown, pid?: unknown, creationTimeTicks?: unknown }
          if (ready.kind !== 'file-recovery-native-ready-v1' || ready.pid !== child.pid || typeof ready.creationTimeTicks !== 'string' || !/^[1-9]\d{14,19}$/u.test(ready.creationTimeTicks))
            throw new Error('Compensation native process identity did not match its child')
          // The worker waits on stdin until this identity is durable. A late
          // audit completion cannot send input into a cancelled/closed worker.
          await ports.audit({ stage: 'native-started', ...binding, pid: child.pid, creationTimeTicks: ready.creationTimeTicks, executable, workerPath: path, workerHash: createHash('sha256').update(workerScript).digest('hex'), startedAt, expiresAt })
          if (ended || nativeStopped)
            throw new Error('Compensation native process ended during startup auditing')
          ports.signal?.throwIfAborted()
          if (!await ports.effectOwnsVersion(binding))
            throw new Error('Compensation original effect changed during native startup')
          ports.broker.assert(lease)
          ports.signal?.throwIfAborted()
          if (ended || nativeStopped || Date.now() >= expiresAt)
            throw new Error('Compensation native startup authority expired')
          child.stdin?.end(`${JSON.stringify({ path: input.path, device: input.device, inode: input.inode, removeCreated: input.removeCreated === true, expectedHash: input.writtenHash, restoreHash: input.backupHash, restoreBytes: Buffer.from(backupBytes).toString('base64'), expiresAt })}\n`)
        })().catch(fail)
      }
      child.stdout?.on('data', receive)
    })
    const validSuccess = result.ok === true && (input.removeCreated ? result.scope === 'exclusive-file-handle-removed-created-file' && result.removedHash === input.writtenHash : result.scope === 'exclusive-file-handle-restored-bytes' && result.actualHash === input.backupHash)
    const validFailure = result.ok === false && typeof result.errorCode === 'string' && result.errorCode.length <= 512 && typeof result.effectMayHaveOccurred === 'boolean'
    if (!validSuccess && !validFailure)
      throw new Error('Compensation native result did not match its bound file operation')
    await ports.audit({ stage: 'observed', ...binding, result })
    uncertain = result.effectMayHaveOccurred === true
    return result
  }
  finally {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      if (stopAcknowledgment && !nativeStopped)
        await Promise.race([stopAcknowledgment, new Promise<void>((resolve) => { timer = setTimeout(resolve, 5000) })])
    }
    finally { clearTimeout(timer) }
    if (!nativeStopped)
      uncertain = true
    ports.broker.settle(lease, { stopped: nativeStopped, uncertain })
    if (root) {
      const ownedRoot = root
      if (nativeStopped)
        await rm(ownedRoot, { recursive: true, force: true })
      else
        void stopAcknowledgment!.then(() => rm(ownedRoot, { recursive: true, force: true })).catch(() => {})
    }
  }
}
