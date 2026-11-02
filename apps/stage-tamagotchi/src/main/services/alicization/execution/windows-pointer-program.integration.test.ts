import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { arch, env, pid, platform } from 'node:process'

import { describe, expect, it } from 'vitest'

import { createWindowsPointerProgram } from './windows-pointer-program'
import { decodeWindowsPointerNoInput } from './windows-pointer-protocol'
import { createWindowsPointerWriter } from './windows-pointer-writer'

async function invoke(executable: string, request: unknown) {
  return new Promise<{ code: number | null, stdout: string }>((resolve, reject) => {
    let output = ''; let errors = ''
    const child = execFile(executable, ['--actor'], { windowsHide: true, shell: false, timeout: 5000, maxBuffer: 16_384, encoding: 'utf8' }, (_error, stdout, stderr) => { output = stdout; errors = stderr })
    child.once('close', code => errors ? reject(new Error('Native pointer negative fixture wrote stderr')) : resolve({ code, stdout: output }))
    child.stdin?.on('error', () => {})
    child.stdin?.end(`${JSON.stringify(request)}\n`)
  })
}

describe.skipIf(env.ALICIZATION_NATIVE_PROGRAM_CHECK !== '1' || platform !== 'win32' || arch !== 'x64')('fixed native pointer program preparation', () => {
  it('verifies actual no-input refusal in both stdout and durable receipt and leaves the writer reusable', async () => {
    const program = createWindowsPointerProgram(await mkdtemp(join(resolve('output'), 'native-pointer-refusal-')))
    try {
      const prepared = await program.ready()
      const snapshot = { owner: { windowId: '1', processId: pid, processStartTicks: prepared.parentStartTicks, windowClass: 'AlicizationOwnedAbsentPointerFixture', desktop: 'Default' }, authority: { userSid: 'S-1-5-21-123-456-789-1001', sessionId: 1, integrityLevel: 8192, ownerWindowId: null }, geometry: { coordinateSpace: 'screen-physical' as const, clientBounds: { left: 100, top: 100, width: 400, height: 300 }, virtualScreen: { left: 0, top: 0, width: 2560, height: 1440 }, displays: [{ left: 0, top: 0, width: 2560, height: 1440 }], imageWidth: 400, imageHeight: 300, dpiX: 96, dpiY: 96 }, imageSha256: 'a'.repeat(64) }
      const action = { kind: 'click' as const, button: 'left' as const, point: { space: 'image-pixel' as const, x: 100, y: 100 } }
      const writer = createWindowsPointerWriter(program)
      for (let index = 0; index < 2; index++) {
        const actual = await writer.run({ snapshot, action, observationId: 'visual-window:12345678-1234-1234-1234-123456789abc', bindingHash: 'b'.repeat(64), owner: { cardId: 'owned-test', turnId: 'native-negative', effectId: `negative-${index}`, leaseId: 'owned-negative', epoch: 'owned-negative', fencingToken: index + 1 }, expiresAt: Date.now() + 15_000, assertCurrent: async () => {} })
        expect(actual).toMatchObject({ ok: false, effectMayHaveOccurred: false, inputReleased: true, writerStopped: true, native: null, noInput: { type: 'preflight-refused', guardianStarted: false, hooksInstalled: false, insertedEvents: 0, parentProcessId: pid, parentStartTicks: prepared.parentStartTicks } })
        expect(writer.isActive()).toBe(false)
        expect(await writer.releaseOwnedInput()).toBe(true)
        const body = await readFile(join(actual.receiptRoot!, 'actor-result.json'), 'utf8')
        const proof = decodeWindowsPointerNoInput(body, { bindingHash: 'b'.repeat(64), actorProcessId: actual.noInput!.actorProcessId, parentProcessId: pid, parentStartTicks: prepared.parentStartTicks, receiptRoot: actual.receiptRoot!, keys: [1], repeat: 1, expectedEvents: 3 })
        expect(proof).toEqual(actual.noInput)
      }
    }
    finally { await program.dispose() }
  }, 40_000)
  it('refuses malformed, expired and foreign parent native envelopes before readiness', async () => {
    const program = createWindowsPointerProgram(await mkdtemp(join(resolve('output'), 'native-pointer-envelope-')))
    try {
      const prepared = await program.ready()
      const base = { version: 1, mappingName: `Local\\AlicizationInput_${randomBytes(16).toString('hex')}`, tag: '42', bindingHash: 'a'.repeat(64), parentProcessId: pid, parentStartTicks: prepared.parentStartTicks, expiresAt: Date.now() + 15_000, action: { kind: 'click', button: 'left', wheel: 0, points: [{ x: 100, y: 100 }] }, snapshot: { owner: { windowId: '1', processId: pid, processStartTicks: prepared.parentStartTicks, windowClass: 'OwnedAbsent', desktop: 'Default' }, authority: { userSid: 'S-1-5-21-1-2-3-1001', sessionId: 1, integrityLevel: 8192, ownerWindowId: null }, geometry: { coordinateSpace: 'screen-physical', clientBounds: { left: 0, top: 0, width: 400, height: 300 }, virtualScreen: { left: 0, top: 0, width: 2560, height: 1440 }, displays: [{ left: 0, top: 0, width: 2560, height: 1440 }], imageWidth: 400, imageHeight: 300, dpiX: 96, dpiY: 96 }, imageSha256: 'a'.repeat(64) } }
      for (const change of [{ arbitrary: 'not a native field' }, { expiresAt: Date.now() - 1 }, { parentStartTicks: (BigInt(prepared.parentStartTicks) + 1n).toString() }, { action: { ...base.action, kind: 'down' } }]) {
        const actual = await invoke(prepared.executable, { ...base, ...change })
        expect(actual.code).toBe(3)
        expect(JSON.parse(actual.stdout)).toMatchObject({ type: 'protocol-error', ok: false, inputReleased: false })
        expect(actual.stdout).not.toContain('"type":"ready"')
      }
    }
    finally { await program.dispose() }
  }, 40_000)
  it('compiles the exact bundled actor and guardian but loads only the role with zero hooks and input', async () => {
    const root = await mkdtemp(join(resolve('output'), 'native-pointer-program-'))
    const program = createWindowsPointerProgram(root)
    try {
      const actual = await program.ready()
      expect(actual.sha256).toMatch(/^[a-f0-9]{64}$/u)
      expect((await readFile(actual.executable)).subarray(0, 2).toString()).toBe('MZ')
      expect(await program.health()).toMatchObject({ kind: 'windows-pointer-program-health-v1', layout: 40, bitness: 64, hooksInstalled: false, inputObserved: false, inputEvents: 0 })
      await expect(program.verify(actual)).resolves.toBeUndefined()
    }
    finally { await program.dispose() }
  }, 40_000)
  it('refuses a changed generated owned executable and closes further preparation', async () => {
    const program = createWindowsPointerProgram(await mkdtemp(join(resolve('output'), 'native-pointer-changed-')))
    const actual = await program.ready()
    await program.health()
    await writeFile(actual.executable, 'invalid owned generated executable')
    await expect(program.health()).rejects.toThrow('PROGRAM_CHANGED')
    await program.dispose()
    await expect(program.ready()).rejects.toThrow('PROGRAM_CLOSED')
  }, 40_000)
})
