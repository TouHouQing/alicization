import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { arch, env, platform } from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'

import { expect, it } from 'vitest'

import { createWindowsKeyboardProgram } from './windows-keyboard-program'

it.skipIf(env.ALICIZATION_NATIVE_PROGRAM_CHECK !== '1' || platform !== 'win32' || arch !== 'x64')('loads the actual native health role without observing or sending host input', async () => {
  const root = await mkdtemp(join(resolve('output'), 'native-program-health-check-'))
  const program = createWindowsKeyboardProgram(root)
  try {
    const prepared = await program.ready()
    const health = await program.health()
    expect(health).toMatchObject({ kind: 'windows-keyboard-program-health-v1', layout: 40, bitness: 64, hooksInstalled: false, inputObserved: false, inputEvents: 0 })
    expect(health.pid).toBeGreaterThan(0)
    expect(health.checkedAt).toBeGreaterThan(0)
    await expect(program.verify(prepared)).resolves.toBeUndefined()
    await writeFile(join(root, 'health-accepted.json'), JSON.stringify({ ...health, sha256: prepared.sha256 }))
  }
  finally { await program.dispose() }
}, 40_000)

it.skipIf(env.ALICIZATION_NATIVE_PROGRAM_CHECK !== '1' || platform !== 'win32' || arch !== 'x64')('prepares the actual native program when the parent module path contains an incompatible PowerShell Core utility module', async () => {
  const root = await mkdtemp(join(resolve('output'), 'native-program-core-parent-'))
  const moduleRoot = join(root, 'core-modules')
  const utility = join(moduleRoot, 'Microsoft.PowerShell.Utility')
  await mkdir(utility, { recursive: true })
  await writeFile(join(utility, 'Microsoft.PowerShell.Utility.psd1'), '@{ ModuleVersion=\'99.0.0\'; GUID=\'057b2ec8-29c3-4414-a258-2c6ed93c134b\'; PowerShellVersion=\'7.0\'; RootModule=\'Utility.psm1\'; FunctionsToExport=@(\'Get-FileHash\') }')
  await writeFile(join(utility, 'Utility.psm1'), 'function Get-FileHash { throw \'Incompatible parent module must never load\' }; Export-ModuleMember -Function Get-FileHash')
  const inherited = env.PSModulePath
  const contaminated = `${moduleRoot};${inherited ?? ''}`
  const program = createWindowsKeyboardProgram(join(root, 'owned-native'))
  try {
    env.PSModulePath = contaminated
    const ready = await program.ready()
    expect(ready.sha256).toBe(createHash('sha256').update(await readFile(ready.executable)).digest('hex'))
    await expect(program.verify(ready)).resolves.toBeUndefined()
    expect(env.PSModulePath).toBe(contaminated)
  }
  finally {
    if (inherited === undefined)
      delete env.PSModulePath
    else
      env.PSModulePath = inherited
    await program.dispose()
  }
}, 40_000)

it.skipIf(env.ALICIZATION_NATIVE_PROGRAM_CHECK !== '1' || platform !== 'win32' || arch !== 'x64')('compiles the bundled production program and checks its identity without hooks or input', async () => {
  const root = await mkdtemp(join(resolve('output'), 'native-program-check-'))
  const program = createWindowsKeyboardProgram(root)
  const ready = await program.ready()
  expect(ready.sha256).toBe(createHash('sha256').update(await readFile(ready.executable)).digest('hex'))
  expect(ready.parentStartTicks).toMatch(/^[1-9]\d{17,18}$/u)
  await expect(program.verify(ready)).resolves.toBeUndefined()
  expect(await program.ready()).toBe(ready)
  // Mutate this test's owned program only, proving the load guard detects it.
  await writeFile(ready.executable, 'invalidated owned compiler check')
  await expect(program.verify(ready)).rejects.toThrow('PROGRAM_CHANGED')
}, 40_000)

it.skipIf(env.ALICIZATION_NATIVE_PROGRAM_CHECK !== '1' || platform !== 'win32' || arch !== 'x64')('waits for an actually started compiler on shutdown and rejects subsequent helper use', async () => {
  const root = await mkdtemp(join(resolve('output'), 'native-program-stop-check-'))
  const program = createWindowsKeyboardProgram(root)
  const preparation = program.ready()
  let compilerStarted = false
  for (let index = 0; index < 400; index++) {
    const directory = (await readdir(root)).find(name => name.startsWith('keyboard-'))
    if (directory && (await readdir(join(root, directory))).some(name => name.endsWith('.cs'))) {
      compilerStarted = true
      break
    }
    await delay(25)
  }
  expect(compilerStarted).toBe(true)
  await program.dispose()
  const compiled = await preparation
  expect(compiled.sha256).toMatch(/^[a-f0-9]{64}$/u)
  await expect(program.ready()).rejects.toThrow('PROGRAM_CLOSED')
  await expect(program.verify(compiled)).rejects.toThrow('PROGRAM_CLOSED')
}, 40_000)
