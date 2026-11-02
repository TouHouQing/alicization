import { Buffer } from 'node:buffer'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

const { inspectHostViewportPackage } = createRequire(import.meta.url)('../../../scripts/life-acceptance/host-package-identity.cjs')

it.each(['exact', 'old-entry', 'different-main', 'different-id', 'production-name', 'different-executable'] as const)('refuses a mismatched packaged background entry before process creation: %s', async (scenario) => {
  const root = await mkdtemp(join(tmpdir(), 'life-package-identity-unit-'))
  const runId = '20261027-abcdef12'
  const source = 'const format = "host-viewport-qa-v1"; export const normalAsarBootstrap = true'
  try {
    const directory = join(root, 'apps/stage-tamagotchi/out/main')
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'index.js'), source)
    const main = scenario === 'old-entry' ? 'export const oldEntry = true' : scenario === 'different-main' ? `${source}; changed()` : source
    const metadata = { name: scenario === 'production-name' ? '@proj-alicization/stage-tamagotchi' : `alicization-life-installer-${runId}`, lifeQaInstallerId: scenario === 'different-id' ? '20261026-abcdef12' : runId, main: 'out/main/index.js' }
    const archive = { extractFile: (_file: string, member: string) => Buffer.from(member === 'package.json' ? JSON.stringify(metadata) : main) }
    const input = { workspace: root, runId, executable: join(root, scenario === 'different-executable' ? 'alicization.exe' : `alicization-lifeqa-${runId}.exe`), archive }
    if (scenario === 'exact')
      expect(inspectHostViewportPackage(input)).toMatchObject({ runId, normalAsarBootstrap: true })
    else
      expect(() => inspectHostViewportPackage(input)).toThrow()
  }
  finally { await rm(root, { recursive: true, force: true }) }
})
