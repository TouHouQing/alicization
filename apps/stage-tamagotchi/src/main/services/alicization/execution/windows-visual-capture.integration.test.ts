import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { env, platform } from 'node:process'
import { fileURLToPath } from 'node:url'

import { expect, it } from 'vitest'

it.skipIf(platform !== 'win32' || env.ALICIZATION_NATIVE_PROGRAM_CHECK !== '1')('captures real owned window pixels and rejects stale or hidden windows without foreground or input', async () => {
  const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../..')
  const parent = await mkdtemp(join(tmpdir(), 'alicization-owned-visual-capture-'))
  const root = join(parent, 'qualification')
  const script = join(workspace, 'apps/stage-tamagotchi/scripts/life-acceptance/check-windows-visual-window.ps1')
  await new Promise<void>((accept, reject) => {
    execFile('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-OutputRoot', root, '-Workspace', workspace], { windowsHide: true, timeout: 60_000, maxBuffer: 16_384 }, (error, _stdout, stderr) => {
      if (error || stderr)
        reject(new Error(`Owned read-only capture qualification failed; evidence retained at ${root}: ${error?.message ?? stderr}`))
      else
        accept()
    })
  })
  const report = JSON.parse(await readFile(join(root, 'report.json'), 'utf8'))
  expect(report).toMatchObject({ passed: true, normalFixtureClosure: true, outsideAllDisplays: true, foregroundTaken: false, inputEvents: 0 })
  expect(report.checks).toHaveLength(12)
  expect(report.checks.find((entry: { kind: string }) => entry.kind === 'actual-owner-change-with-identical-client-image')).toMatchObject({ passed: true, oldOwnerContextRefused: true, sameClientImage: true, inputEvents: 0 })
  expect(report.checks.every((entry: { passed: boolean }) => entry.passed)).toBe(true)
  const png = await readFile(join(root, 'actual-owned-window.png'))
  const digest = createHash('sha256').update(png).digest('hex')
  expect(report.checks.filter((entry: { kind: string }) => entry.kind === 'actual-owned-window-pixels').every((entry: { imageSha256: string }) => entry.imageSha256 === digest)).toBe(true)
  expect(report.sourceHashes).toHaveLength(3)
  for (const source of report.sourceHashes)
    expect(createHash('sha256').update(await readFile(source.path)).digest('hex')).toBe(source.sha256)
}, 70_000)
