import process from 'node:process'

import { createHash } from 'node:crypto'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { createWindowsVisualWindowProgram } from './windows-visual-window-program'

const owned: Array<{ root: string, program: ReturnType<typeof createWindowsVisualWindowProgram> }> = []
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'owned-visual-reader-'))
  await writeFile(join(root, 'test-owner.json'), JSON.stringify({ format: 'owned-visual-reader-integration-test-v1', processId: process.pid, createdAt: Date.now() }), { flag: 'wx' })
  const program = createWindowsVisualWindowProgram(join(root, 'programs'))
  owned.push({ root, program })
  return { root, program }
}
afterEach(async () => {
  for (const item of owned.splice(0)) {
    await item.program.dispose()
    await rm(item.root, { recursive: true, force: true })
  }
})

describe.skipIf(process.platform !== 'win32' || process.arch !== 'x64' || process.env.ALICIZATION_NATIVE_PROGRAM_CHECK !== '1')('fixed native single-window reader lifecycle', () => {
  it('compiles exact bundled bytes, verifies actual child loader health and has no input or capture effects', async () => {
    const { program } = await fixture()
    const native = await program.ready()
    const owner = JSON.parse(await readFile(join(native.root, 'owner.json'), 'utf8'))
    expect(owner).toMatchObject({ format: 'alicization-owned-visual-program-v1', processId: process.pid, executableSha256: native.sha256 })
    const sources = (await readdir(native.root)).filter(name => name.endsWith('.cs')).sort()
    expect(sources).toEqual(['windows-native.cs', 'windows-visual-window-process.cs', 'windows-visual-window.cs'])
    const actual = await Promise.all(sources.map(async name => createHash('sha256').update(await readFile(join(native.root, name))).digest('hex')))
    expect(actual.sort()).toEqual(owner.sourceHashes.sort())
    expect(await program.health()).toMatchObject({ kind: 'windows-visual-window-health-v1', bitness: 64, captured: false, hooksInstalled: false, inputEvents: 0 })
    await program.dispose()
    await expect(program.ready()).rejects.toThrow('CLOSED')
    await expect(program.health()).rejects.toThrow('CLOSED')
  }, 60000)

  it('refuses a modified generated executable before it can be launched', async () => {
    const { program } = await fixture()
    const native = await program.ready()
    await program.health()
    const bytes = await readFile(native.executable)
    bytes[0] ^= 0xFF
    await writeFile(native.executable, bytes)
    await expect(program.health()).rejects.toThrow('PROGRAM_CHANGED')
  }, 60000)

  it('preserves an actual native identity refusal without disclosing image or arbitrary stdout', async () => {
    const { program } = await fixture()
    const native = await program.ready()
    await expect(program.capture({ windowId: '1', processId: process.pid, processStartTicks: native.parentStartTicks, windowClass: 'NonexistentOwnedVisualWindow', desktop: 'Default' })).rejects.toThrow('WINDOWS_VISUAL_WINDOW_IDENTITY_CHANGED')
  }, 60000)

  it('honours cancellation before preparation and refuses capture after disposal', async () => {
    const { root, program } = await fixture()
    const controller = new AbortController()
    controller.abort(new Error('owned-capture-stop'))
    const owner = { windowId: '1', processId: process.pid, processStartTicks: '638500000000000000', windowClass: 'Owned', desktop: 'Default' }
    await expect(program.capture(owner, controller.signal)).rejects.toThrow('owned-capture-stop')
    expect(await readdir(root)).toEqual(['test-owner.json'])
    await program.dispose()
    await expect(program.capture(owner)).rejects.toThrow('CLOSED')
  })
})
