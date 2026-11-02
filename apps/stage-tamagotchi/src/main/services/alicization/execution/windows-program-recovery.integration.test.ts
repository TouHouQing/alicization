import { mkdtemp, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { arch, env, pid, platform } from 'node:process'

import { describe, expect, it } from 'vitest'

import { createExecutionHealthProbe } from './runtime-health'
import { createWindowsKeyboardProgram } from './windows-keyboard-program'
import { createWindowsPointerProgram } from './windows-pointer-program'
import { createWindowsVisualWindowProgram } from './windows-visual-window-program'

const programs = [
  { name: 'keyboard', create: createWindowsKeyboardProgram, health: { kind: 'windows-keyboard-program-health-v1', inputObserved: false } },
  { name: 'pointer', create: createWindowsPointerProgram, health: { kind: 'windows-pointer-program-health-v1', inputObserved: false } },
  { name: 'visual-window', create: createWindowsVisualWindowProgram, health: { kind: 'windows-visual-window-health-v1', captured: false } },
] as const

describe.skipIf(env.ALICIZATION_NATIVE_PROGRAM_CHECK !== '1' || platform !== 'win32' || arch !== 'x64')('native program preparation recovery', () => {
  it.each(programs)('$name recovers after a known preparation failure without restarting its owner or sending input', async ({ name, create, health }) => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-native-recovery-'))
    const target = join(root, 'programs')
    await writeFile(join(root, 'test-owner.json'), JSON.stringify({ format: 'owned-native-preparation-recovery-v1', processId: pid, program: name }))
    // An obstruction in this test's own directory fails before any compiler or
    // actor starts. Removing it establishes that a later probe may prepare.
    await writeFile(target, 'owned temporary obstruction')
    const program = create(target)
    let now = 0
    const availability = createExecutionHealthProbe({
      probe: async () => {
        await program.health()
        return { available: true, ready: true, reason: null }
      },
      failureReason: `${name}-unavailable`,
      now: () => now,
    })
    try {
      await expect(program.health()).rejects.toMatchObject({ code: 'EEXIST' })
      expect(await availability()).toMatchObject({ ready: false, reason: `${name}-unavailable` })
      expect((await readdir(root)).sort()).toEqual(['programs', 'test-owner.json'])
      await unlink(target)
      expect(await availability()).toMatchObject({ ready: false })
      now = 15_001
      const first = program.ready()
      const second = program.ready()
      expect(first).toBe(second)
      const [prepared, same, actual] = await Promise.all([first, second, program.health()])
      expect(prepared).toBe(same)
      expect((await readdir(target)).filter(entry => entry.startsWith(`${name}-`))).toHaveLength(1)
      expect(actual).toMatchObject({ ...health, bitness: 64, inputEvents: 0, hooksInstalled: false })
      expect(actual.pid).toBeGreaterThan(0)
      expect(await availability()).toMatchObject({ ready: true, reason: null })
      expect(await program.ready()).toBe(prepared)
      await writeFile(join(root, 'recovery-accepted.json'), JSON.stringify({ health: actual, sha256: prepared.sha256, preparationCount: 1, ownerProcessId: pid }))
      const bytes = await readFile(prepared.executable)
      bytes[0] ^= 0xFF
      await writeFile(prepared.executable, bytes)
      await expect(program.health()).rejects.toThrow('PROGRAM_CHANGED')
      await expect(program.health()).rejects.toThrow('PROGRAM_CHANGED')
      expect(await program.ready()).toBe(prepared)
      expect((await readdir(target)).filter(entry => entry.startsWith(`${name}-`))).toHaveLength(1)
      await program.dispose()
      await expect(program.ready()).rejects.toThrow('CLOSED')
      await expect(program.health()).rejects.toThrow('CLOSED')
    }
    finally { await program.dispose() }
  }, 40_000)

  it.each(programs)('$name stays closed after an initial preparation failure', async ({ name, create }) => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-native-recovery-stop-'))
    const target = join(root, 'programs')
    await writeFile(join(root, 'test-owner.json'), JSON.stringify({ format: 'owned-native-preparation-stop-v1', processId: pid, program: name }))
    await writeFile(target, 'owned temporary obstruction')
    const program = create(target)
    try {
      await expect(program.ready()).rejects.toMatchObject({ code: 'EEXIST' })
      await program.dispose()
      await unlink(target)
      await expect(program.ready()).rejects.toThrow('CLOSED')
      await expect(program.health()).rejects.toThrow('CLOSED')
      expect(await readdir(root)).toEqual(['test-owner.json'])
    }
    finally { await program.dispose() }
  })
})
