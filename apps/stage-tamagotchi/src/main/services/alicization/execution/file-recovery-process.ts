import type { FileRecoveryNativeProcess } from './file-recovery-native-contracts'

import { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { env, platform } from 'node:process'

import * as v from 'valibot'

import script from './file-recovery-process.ps1?raw'

import { fileRecoveryNativeProcessSchema } from './file-recovery-native-contracts'

const responseSchema = v.strictObject({ state: v.picklist(['running', 'stopped', 'unknown']) })

/** Main-owned process identities come from the durable native-startup journal. */
export async function controlFileRecoveryProcess(operation: 'inspect' | 'stop', raw: FileRecoveryNativeProcess) {
  const process = v.parse(fileRecoveryNativeProcessSchema, raw)
  if (platform !== 'win32')
    return 'unknown' as const
  return new Promise<'running' | 'stopped' | 'unknown'>((resolve) => {
    // Only fixed source becomes code. Process metadata is a separate stdin JSON
    // value, so file names and imported journal data cannot become shell code.
    const child = execFile(join(env.SystemRoot!, 'System32/WindowsPowerShell/v1.0/powershell.exe'), ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, timeout: 8000, maxBuffer: 4096 }, (error, stdout) => {
      if (error) {
        resolve('unknown')
        return
      }
      try { resolve(v.parse(responseSchema, JSON.parse(stdout.trim())).state) }
      catch { resolve('unknown') }
    })
    child.stdin?.end(`${JSON.stringify({ operation, pid: process.pid, creationTimeTicks: process.creationTimeTicks, executable: process.executable })}\n`)
  })
}
