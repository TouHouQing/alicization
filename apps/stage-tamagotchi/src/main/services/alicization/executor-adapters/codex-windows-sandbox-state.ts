import { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { isAbsolute, join, relative, sep } from 'node:path'
import { platform } from 'node:process'

import * as v from 'valibot'

// Protocol used by the installed Codex 0.142.3 Windows sandbox. Copy its opaque
// DPAPI records; never decode passwords, provision accounts or change policy.
const username = v.pipe(v.string(), v.minLength(1), v.maxLength(64), v.regex(/^[\w.-]+$/u))
const user = v.object({ username, password: v.pipe(v.string(), v.minLength(4), v.maxLength(32768), v.regex(/^[A-Z\d+/]+={0,2}$/iu)) })
const markerSchema = v.object({ version: v.literal(5), offline_username: username, online_username: username })
const usersSchema = v.object({ version: v.literal(5), offline: user, online: user })
const files = [['.sandbox', 'setup_marker.json'], ['.sandbox-secrets', 'sandbox_users.json']] as const
const stateLimit = 65536

function unavailable() {
  return Object.assign(new Error('An existing compatible Windows sandbox setup is required for isolated Codex execution.'), { code: 'CODEX_WINDOWS_SANDBOX_STATE_UNAVAILABLE' })
}

function within(root: string, path: string) {
  const tail = relative(root, path)
  return tail !== '' && !isAbsolute(tail) && tail !== '..' && !tail.startsWith(`..${sep}`)
}

async function protectSecretsDirectory(path: string) {
  if (platform !== 'win32')
    return
  // mkdir's POSIX mode does not set a Windows DACL. Protect only this fresh
  // secret directory before placing an opaque DPAPI record in it.
  const script = `$ErrorActionPreference='Stop'
$request=[Console]::In.ReadLine()|ConvertFrom-Json
$target=Get-Item -LiteralPath $request.path -Force
if(!$target.PSIsContainer -or ($target.Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Invalid private credential directory'}
$acl=[Security.AccessControl.DirectorySecurity]::new()
$acl.SetAccessRuleProtection($true,$false)
$current=[Security.Principal.WindowsIdentity]::GetCurrent().User
$acl.SetOwner($current)
foreach($sid in @($current,[Security.Principal.SecurityIdentifier]::new('S-1-5-18'),[Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))){
  $rule=[Security.AccessControl.FileSystemAccessRule]::new($sid,[Security.AccessControl.FileSystemRights]::FullControl,[Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit',[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow)
  [void]$acl.AddAccessRule($rule)
}
$target.SetAccessControl($acl)
$actual=$target.GetAccessControl()
if(!$actual.AreAccessRulesProtected){throw 'Private credential protection was not observed'}
`
  await new Promise<void>((resolve, reject) => {
    let failed = false
    const child = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, timeout: 5000, maxBuffer: 4096 }, (error) => { failed ||= Boolean(error) })
    child.once('error', () => { failed = true })
    child.once('close', () => failed ? reject(unavailable()) : resolve())
    child.stdin?.once('error', () => { failed = true })
    child.stdin?.end(`${JSON.stringify({ path })}\n`)
  })
}

async function snapshot(root: string) {
  const values: Buffer[] = []
  for (const [directory, name] of files) {
    const folder = join(root, directory)
    const folderStat = await lstat(folder)
    if (!folderStat.isDirectory() || folderStat.isSymbolicLink() || !within(root, await realpath(folder)))
      throw unavailable()
    const path = join(folder, name)
    const before = await lstat(path)
    if (!before.isFile() || before.isSymbolicLink() || before.size < 1 || before.size > stateLimit || !within(root, await realpath(path)))
      throw unavailable()
    const bytes = await readFile(path)
    const after = await lstat(path)
    if (bytes.length > stateLimit || after.isSymbolicLink() || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs || !within(root, await realpath(path)))
      throw unavailable()
    values.push(bytes)
  }
  return values
}

/** Preserve an existing same-host sandbox identity inside a fresh executor home. */
export async function copyCodexWindowsSandboxState(input: { sourceHome: string, isolatedHome: string, platform: string, sandbox: 'elevated' | 'unelevated' | null }) {
  if (input.platform !== 'win32' || input.sandbox !== 'elevated')
    return
  try {
    const source = await realpath(input.sourceHome)
    const destination = await realpath(input.isolatedHome)
    if (source === destination || (await lstat(input.isolatedHome)).isSymbolicLink())
      throw unavailable()
    const original = await snapshot(source)
    // Parsing failures must not serialize protected records into diagnostics.
    const marker = v.safeParse(markerSchema, JSON.parse(new TextDecoder().decode(original[0])))
    const users = v.safeParse(usersSchema, JSON.parse(new TextDecoder().decode(original[1])))
    if (!marker.success || !users.success || marker.output.offline_username !== users.output.offline.username || marker.output.online_username !== users.output.online.username)
      throw unavailable()
    for (const [index, [directory, name]] of files.entries()) {
      const target = join(destination, directory)
      await mkdir(target, { mode: 0o700 })
      if (directory === '.sandbox-secrets')
        await protectSecretsDirectory(target)
      const bytes = original[index]
      if (!bytes)
        throw unavailable()
      await writeFile(join(target, name), bytes, { mode: 0o600, flag: 'wx' })
    }
    const current = await snapshot(source)
    if (original.some((bytes, index) => !current[index] || !bytes.equals(current[index])))
      throw Object.assign(new Error('Windows sandbox state changed while preparing isolated Codex execution.'), { code: 'CODEX_WINDOWS_SANDBOX_STATE_CHANGED' })
  }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'CODEX_WINDOWS_SANDBOX_STATE_CHANGED')
      throw error
    throw unavailable()
  }
}
