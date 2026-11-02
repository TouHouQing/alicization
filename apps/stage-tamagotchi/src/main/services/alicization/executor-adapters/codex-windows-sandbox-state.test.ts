import { Buffer } from 'node:buffer'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, expect, it } from 'vitest'

import { copyCodexWindowsSandboxState } from './codex-windows-sandbox-state'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true }))) })

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'alicization-codex-state-test-'))
  roots.push(root)
  const sourceHome = join(root, 'source')
  const isolatedHome = join(root, 'isolated')
  await mkdir(join(sourceHome, '.sandbox'), { recursive: true })
  await mkdir(join(sourceHome, '.sandbox-secrets'))
  await mkdir(isolatedHome)
  const marker = JSON.stringify({ version: 5, offline_username: 'CodexSandboxOffline', online_username: 'CodexSandboxOnline', read_roots: ['retained scope'], write_roots: [], additional_vendor_field: true })
  const users = JSON.stringify({ version: 5, offline: { username: 'CodexSandboxOffline', password: Buffer.from('opaque-test-offline').toString('base64') }, online: { username: 'CodexSandboxOnline', password: Buffer.from('opaque-test-online').toString('base64') } })
  await writeFile(join(sourceHome, '.sandbox/setup_marker.json'), marker)
  await writeFile(join(sourceHome, '.sandbox-secrets/sandbox_users.json'), users)
  await writeFile(join(sourceHome, '.sandbox/sandbox.log'), 'not part of executor state')
  return { root, sourceHome, isolatedHome, marker, users, platform: 'win32', sandbox: 'elevated' as const }
}

it('copies exact opaque credentials and existing policy without copying history or altering source state', async () => {
  const f = await fixture()
  await copyCodexWindowsSandboxState(f)
  for (const [relative, expected] of [['.sandbox/setup_marker.json', f.marker], ['.sandbox-secrets/sandbox_users.json', f.users]]) {
    expect(await readFile(join(f.isolatedHome, relative), 'utf8')).toBe(expected)
    expect(await readFile(join(f.sourceHome, relative), 'utf8')).toBe(expected)
  }
  await expect(readFile(join(f.isolatedHome, '.sandbox/sandbox.log'))).rejects.toMatchObject({ code: 'ENOENT' })
})

it.each(['missing', 'incompatible', 'mismatch', 'malformed', 'oversized'])('fails before dispatch for %s state without exposing protected bytes', async (kind) => {
  const f = await fixture()
  const path = join(f.sourceHome, '.sandbox-secrets/sandbox_users.json')
  if (kind === 'missing')
    await rm(path)
  else
    await writeFile(path, kind === 'malformed' ? 'PRIVATE_STATE_DO_NOT_LOG' : kind === 'oversized' ? 'x'.repeat(65537) : f.users.replace(kind === 'incompatible' ? '"version":5' : 'CodexSandboxOffline', kind === 'incompatible' ? '"version":6' : 'OtherIdentity'))
  await expect(copyCodexWindowsSandboxState(f)).rejects.toMatchObject({ code: 'CODEX_WINDOWS_SANDBOX_STATE_UNAVAILABLE', message: expect.not.stringContaining('PRIVATE_STATE_DO_NOT_LOG') })
  await expect(readFile(join(f.isolatedHome, '.sandbox/setup_marker.json'))).rejects.toMatchObject({ code: 'ENOENT' })
})

it('rejects a linked state directory and never overwrites an existing destination', async () => {
  const f = await fixture()
  const alias = join(f.root, 'alias')
  await mkdir(alias)
  await symlink(join(f.sourceHome, '.sandbox'), join(alias, '.sandbox'), 'junction')
  await expect(copyCodexWindowsSandboxState({ ...f, sourceHome: alias })).rejects.toMatchObject({ code: 'CODEX_WINDOWS_SANDBOX_STATE_UNAVAILABLE' })
  await mkdir(join(f.isolatedHome, '.sandbox'))
  await writeFile(join(f.isolatedHome, '.sandbox/setup_marker.json'), 'existing')
  await expect(copyCodexWindowsSandboxState(f)).rejects.toMatchObject({ code: 'CODEX_WINDOWS_SANDBOX_STATE_UNAVAILABLE' })
  expect(await readFile(join(f.isolatedHome, '.sandbox/setup_marker.json'), 'utf8')).toBe('existing')
})

it('leaves other platforms and unelevated execution independent of this credential store', async () => {
  const f = await fixture()
  await rm(join(f.sourceHome, '.sandbox-secrets'), { recursive: true })
  await copyCodexWindowsSandboxState({ ...f, platform: 'linux' })
  await copyCodexWindowsSandboxState({ ...f, sandbox: 'unelevated' })
  await expect(readFile(join(f.isolatedHome, '.sandbox/setup_marker.json'))).rejects.toMatchObject({ code: 'ENOENT' })
})
