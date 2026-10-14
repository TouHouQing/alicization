import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { env, platform } from 'node:process'

export async function readPersonaProcessIdentity(pid: number) {
  if (!Number.isSafeInteger(pid) || pid <= 0)
    throw new TypeError('Process identity requires a positive integer PID')
  const windows = platform === 'win32'
  // CIM exposes the process creation time and original command line. Windows
  // ownership uses our argv0 instance nonce, since CIM cannot read its env.
  const script = `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); $p = Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}'; if ($null -ne $p) { @{ startedAt = $p.CreationDate.ToUniversalTime().ToString('o'); command = $p.CommandLine } | ConvertTo-Json -Compress }`
  const inspector = spawn(windows ? join(env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe') : 'ps', windows ? ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')] : ['e', '-p', String(pid), '-o', 'lstart=', '-o', 'command='], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] })
  let output = ''
  return new Promise<{ startedAt: string, command: string } | null>((resolve, reject) => {
    const timeout = setTimeout(() => { inspector.kill(); reject(new Error('Persona process identity inspection timed out')) }, 8000)
    inspector.stdout?.on('data', (chunk) => {
      output += String(chunk)
      if (output.length > 64_000) { inspector.kill(); reject(new Error('Persona process identity exceeds its inspection budget')) }
    })
    inspector.once('error', (error) => { clearTimeout(timeout); reject(error) })
    inspector.once('close', (code) => {
      clearTimeout(timeout)
      if (code !== 0 || !output.trim())
        return resolve(null)
      if (windows) {
        try {
          const value = JSON.parse(output.trim()) as { startedAt?: unknown, command?: unknown }
          return resolve(typeof value.startedAt === 'string' && typeof value.command === 'string' ? { startedAt: value.startedAt, command: value.command } : null)
        }
        catch (error) { return reject(error) }
      }
      const match = output.trim().match(/^(.{24})\s+(.+)$/u)
      resolve(match ? { startedAt: match[1].trim(), command: match[2].trim() } : null)
    })
  })
}
