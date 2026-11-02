import { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import { env, platform } from 'node:process'

import { expect, it } from 'vitest'

import native from './windows-keyboard-native.cs?raw'
import shared from './windows-keyboard-shared-state.cs?raw'
import policy from './windows-pointer-hook-policy.cs?raw'
import fixture from './windows-pointer-policy-check.cs?raw'
import script from './windows-pointer-policy-check.ps1?raw'
import pointerState from './windows-pointer-shared-state.cs?raw'

it.skipIf(platform !== 'win32' || env.ALICIZATION_NATIVE_PROGRAM_CHECK !== '1')('runs actual native shared memory and both policy roles without touching host input', async () => {
  const sources = { 'keyboard-native': native, 'keyboard-shared-state': shared, 'pointer-shared-state': pointerState, 'pointer-hook-policy': policy, 'pointer-policy-check': fixture }
  const actual = await new Promise<string>((resolve, reject) => {
    const child = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Mta', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, shell: false, timeout: 15_000, maxBuffer: 16_384, encoding: 'utf8' }, (error, stdout, stderr) => error || stderr ? reject(new Error(`Actual native pointer policy check failed: ${stderr.slice(0, 2500)}`)) : resolve(stdout))
    child.stdin?.end(`${JSON.stringify({ operation: 'check-pointer-policy', sources: Object.entries(sources).map(([name, text]) => ({ name, bytes: Buffer.from(text).toString('base64') })) })}\n`)
  })
  const cases = JSON.parse(actual)
  expect(cases).toHaveLength(10)
  for (const result of cases) expect(result).toMatchObject({ passed: true, inputEvents: 0, hooksInstalled: false })
}, 20_000)
