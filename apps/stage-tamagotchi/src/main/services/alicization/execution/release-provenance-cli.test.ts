import process from 'node:process'

import { execFile } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

import { expect, it } from 'vitest'

const runFile = promisify(execFile)
const tsx = createRequire(import.meta.url).resolve('tsx/cli')
const script = resolve(import.meta.dirname, '../../../../../scripts/life-release-provenance.ts')

it.each([[], ['--snapshot'], ['dist/current-candidate'], ['dist/current-candidate', 'output/proof.json', 'extra-argument']].map(args => ({ args })))('refuses implicit old release/evidence before reading or writing an artifact: $args', async ({ args }) => {
  await expect(runFile(process.execPath, [tsx, script, ...args], { windowsHide: true, timeout: 10000 })).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining('Provide an explicit release path and evidence manifest') })
})
