import type { LifeEffect } from '../../src/shared/life-contracts'

import assert from 'node:assert/strict'
import process, { env } from 'node:process'

import { execFileSync, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import { withActionDispatch } from '../../src/main/services/alicization/execution/action-dispatch-context'
import { createInterfaceEffectRecovery } from '../../src/main/services/alicization/execution/interface-effect-recovery'
import { createLifeWindowsDesktopRuntime } from '../../src/main/services/alicization/life-windows-desktop-runtime'

async function main() {
  assert.match(env.LIFE_QA_PRIVATE_DESKTOP ?? '', /^AlicizationQA_[a-f\d]{32}$/u)
  assert(env.LIFE_QA_PROCESS_REGISTRY)
  const root = resolve(env.LIFE_DESKTOP_PROBE_ROOT ?? 'output/execution-desktop-native-20261020')
  assert(root.startsWith(`${resolve('output')}\\`))
  await mkdir(root, { recursive: true })
  const profile = join(root, `alicization-life-desktop-fixture-${randomUUID()}`)
  await mkdir(profile)
  const stopPath = join(root, 'fixture.stop')
  const path = join(root, 'notes.txt')
  const shell = join(env.SystemRoot!, 'System32/WindowsPowerShell/v1.0/powershell.exe')
  const fixturePath = join(profile, 'fixture.ps1')
  const fixtureSource = await readFile(resolve('apps/stage-tamagotchi/scripts/life-acceptance/life-windows-native-fixture.ps1'), 'utf8')
  await writeFile(fixturePath, `\uFEFF${fixtureSource.replace(/^\uFEFF/u, '')}`, 'utf8')
  const fixture = spawn(shell, ['-NoProfile', '-NonInteractive', '-Sta', '-ExecutionPolicy', 'Bypass', '-File', fixturePath], { windowsHide: true, cwd: profile, stdio: ['pipe', 'pipe', 'pipe'] })
  const exit = once(fixture, 'exit')
  fixture.stdin.end(`${JSON.stringify({ path, stopPath })}\n`)
  let diagnostics = ''
  fixture.stderr.on('data', bytes => diagnostics = `${diagnostics}${bytes.toString()}`.slice(-4000))
  const checks: string[] = []
  const check = (label: string, value: boolean) => {
    assert(value, label)
    checks.push(label)
  }
  const report: Record<string, unknown> = { passed: false, scope: 'native-Windows-semantic-desktop-only', checks, desktop: env.LIFE_QA_PRIVATE_DESKTOP, fixturePid: fixture.pid, profile, syntheticIdentity: true }
  try {
    await new Promise<void>((resolve, reject) => {
      let text = ''
      const timeout = setTimeout(() => reject(new Error(`Fixture startup timeout: ${diagnostics}`)), 15000)
      fixture.stdout.on('data', (bytes) => {
        text += bytes.toString()
        if (text.includes('"ready":true')) {
          clearTimeout(timeout)
          resolve()
        }
      })
      fixture.once('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
      fixture.once('exit', (code) => {
        clearTimeout(timeout)
        reject(new Error(`Fixture exited ${code}: ${diagnostics}`))
      })
    })
    const proof = JSON.parse(execFileSync(shell, ['-NoProfile', '-NonInteractive', '-File', resolve('apps/stage-tamagotchi/scripts/life-acceptance/assert-private-desktop.ps1'), '-ExpectedDesktop', env.LIFE_QA_PRIVATE_DESKTOP!, '-RuntimePid', String(fixture.pid)], { encoding: 'utf8', windowsHide: true, timeout: 15000 }))
    await appendFile(env.LIFE_QA_PROCESS_REGISTRY!, `${JSON.stringify({ pid: fixture.pid, executable: shell, profile, ...proof })}\n`)
    check('native-fixture-belongs-to-private-desktop', proof.runtimeWindowVerified === true)
    const desktop = createLifeWindowsDesktopRuntime({ ownerId: () => 'synthetic-desktop-probe' })
    const health = await desktop.getHealth()
    check('actual-uia-worker-health-without-observing-a-window', health.available && health.ready && health.reason === null)
    check('health-does-not-authorize-unobserved-controls', (await desktop.typeDesktopText({ text: 'Do not inject', targetText: 'unobserved' })).errorCode === 'WINDOWS_UIA_OBSERVATION_REQUIRED')
    const title = 'Alicization QA Native Notes'
    const beforeExpiry = await desktop.listDesktopInteractables({ windowTitle: title, maxItems: 40 })
    const expiryField = (beforeExpiry.elements as Array<{ role: string, name: string, value: string }>).find(item => item.role === 'input')!
    // Fault injection specifically at the child-process boundary: even a
    // late/revoked host authority must be rejected by the native worker itself.
    const expired = await withActionDispatch(async () => ({ expiresAt: Date.now() - 1 }), () => desktop.typeDesktopText({ windowTitle: title, targetText: expiryField.name || undefined, text: 'must not reach the native control', clearExisting: true }))
    check('native-worker-rejects-expired-dispatch-before-mutation', expired.status === 'failed' && expired.errorCode === 'WINDOWS_UIA_ACTION_AUTHORITY_EXPIRED' && expired.effectMayHaveOccurred === false)
    const afterExpiry = await desktop.listDesktopInteractables({ windowTitle: title, maxItems: 40 })
    check('expired-worker-preserves-actual-control-value', (afterExpiry.elements as Array<{ role: string, value: string }>).find(item => item.role === 'input')?.value === expiryField.value)
    for (let round = 1; round <= 3; round++) {
      const waited = await desktop.waitForDesktop({ appName: 'powershell.exe', titleIncludes: title, timeoutMs: 5000 })
      check(`round-${round}:wait-real-window`, waited.status === 'completed' && waited.processId === fixture.pid && waited.foregroundChanged === false)
      const observed = await desktop.listDesktopInteractables({ windowTitle: title, maxItems: 40 })
      report.observed = observed
      check(`round-${round}:observed-native-controls`, observed.status === 'completed')
      const bounds = observed.windowBounds as { left: number, top: number, width: number, height: number }
      check(`round-${round}:physical-visible-window-geometry`, observed.coordinateSpace === 'screen-physical' && observed.windowVisible === true && [bounds.left, bounds.top, bounds.width, bounds.height].every(Number.isFinite) && bounds.width > 0 && bounds.height > 0)
      const fields = (observed.elements as Array<{ role: string, name: string }>).filter(item => item.role === 'input')
      check(`round-${round}:unique-observed-input`, fields.length === 1)
      const targetText = fields[0].name || undefined
      const text = `第 ${round} 轮，中文 🌿 literal $(Get-Process)${round === 3 ? '\n第二行' : ''}`
      const typed = await desktop.typeDesktopText({ windowTitle: title, targetText, exactText: true, text, clearExisting: true })
      report.typed = typed
      check(`round-${round}:type-real-control`, typed.status === 'completed')
      const observedEffect: LifeEffect = { id: `read-${round}`, operationKey: `read-${round}`, kind: 'execute', turnId: `request-${round}`, actionId: 'read', generation: 0, status: 'settled', payload: { capabilityId: 'tool.desktop_list_interactables', parameters: {} }, receipt: { outcome: 'success', output: observed }, leaseUntil: null }
      const uncertain: LifeEffect = { ...observedEffect, id: `type-${round}`, status: 'uncertain', actionId: 'type', payload: { capabilityId: 'tool.desktop_type_text', parameters: { windowTitle: title, targetText, exactText: true, text, clearExisting: true } }, receipt: null }
      const recover = createInterfaceEffectRecovery({ database: () => ({ readLifeTurnExecutionEffects: async () => [observedEffect, uncertain] }), observeBrowser: async () => null, observeDesktop: target => desktop.observeWindow(target) })
      const recovery = await recover(uncertain)
      check(`round-${round}:reconcile-native-field`, recovery.verdict === 'applied')
      await desktop.listDesktopInteractables({ windowTitle: title })
      const saved = await desktop.clickDesktopElement({ windowTitle: title, text: '保存', exactText: true, role: 'button' })
      check(`round-${round}:semantic-save`, saved.status === 'completed')
      check(`round-${round}:independent-file-bytes`, (await readFile(path, 'utf8')).replace(/\r\n/gu, '\n') === text)
      const options = await desktop.listDesktopInteractables({ windowTitle: title })
      const select = (options.elements as Array<{ role: string, options?: string[] }>).filter(item => item.role === 'select')
      check(`round-${round}:actual-select-options`, select.length === 1 && JSON.stringify(select[0].options) === JSON.stringify(['按名称', '按日期']))
      const rejected = await desktop.typeDesktopText({ windowTitle: title, role: 'select', ordinal: 1, text: '不存在的选项', clearExisting: true })
      check(`round-${round}:unknown-option-does-not-inject`, rejected.errorCode === 'WINDOWS_UIA_AMBIGUOUS_OR_MISSING_SELECT_OPTION' && rejected.sideEffectState === 'none')
      await desktop.listDesktopInteractables({ windowTitle: title })
      const selected = round % 2 ? '按日期' : '按名称'
      check(`round-${round}:select-observed-option`, (await desktop.typeDesktopText({ windowTitle: title, role: 'select', ordinal: 1, text: selected, clearExisting: true })).status === 'completed')
      const after = await desktop.listDesktopInteractables({ windowTitle: title })
      report.selectionReadback = after
      check(`round-${round}:independent-select-readback`, (after.elements as Array<{ role: string, value: string }>).find(item => item.role === 'select')?.value === selected)
      check(`round-${round}:application-received-selection-notification`, await readFile(`${path}.selection.txt`, 'utf8') === selected)
    }
    // A second explicit fixture controller simulates an out-of-band UI edit;
    // this does not pretend to be a physical keyboard/mouse takeover test.
    const host = createLifeWindowsDesktopRuntime({ ownerId: () => 'synthetic-fixture-host' })
    await host.listDesktopInteractables({ windowTitle: title })
    check('fixture-host-changes-select-options', (await host.clickDesktopElement({ windowTitle: title, text: '改变选项', exactText: true })).status === 'completed')
    const stale = await desktop.typeDesktopText({ windowTitle: title, role: 'select', ordinal: 1, text: '按名称', clearExisting: true })
    check('changed-options-invalidate-old-selection', stale.errorCode === 'WINDOWS_UIA_STALE_SELECT_OPTIONS' && stale.sideEffectState === 'none')
    await desktop.listDesktopInteractables({ windowTitle: title })
    check('freshly-observed-new-option-is-selectable', (await desktop.typeDesktopText({ windowTitle: title, role: 'select', ordinal: 1, text: '新增选项', clearExisting: true })).status === 'completed')
    await host.listDesktopInteractables({ windowTitle: title })
    await host.clickDesktopElement({ windowTitle: title, text: '改变选项', exactText: true })
    await desktop.listDesktopInteractables({ windowTitle: title })
    const ambiguous = await desktop.typeDesktopText({ windowTitle: title, role: 'select', ordinal: 1, text: '新增选项', clearExisting: true })
    check('duplicate-option-text-does-not-pick-an-arbitrary-index', ambiguous.errorCode === 'WINDOWS_UIA_AMBIGUOUS_OR_MISSING_SELECT_OPTION' && ambiguous.sideEffectState === 'none')
    const missing = await desktop.waitForDesktop({ titleIncludes: 'This synthetic window does not exist', timeoutMs: 0 })
    check('missing-window-does-not-succeed', missing.status === 'failed' && missing.errorCode === 'LOCAL_DESKTOP_WAIT_TIMEOUT')
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(desktop.waitForDesktop({ titleIncludes: title, abortSignal: controller.signal }))
    check('cancel-before-inspection', true)
    report.passed = true
  }
  catch (error) {
    report.error = String(error)
    report.diagnostics = diagnostics
    throw error
  }
  finally {
    await writeFile(stopPath, 'stop owned fixture')
    const deadline = Date.now() + 5000
    while (fixture.exitCode === null && Date.now() < deadline) await delay(50)
    if (fixture.exitCode === null) {
      fixture.kill()
      report.passed = false
      report.forcedCleanup = true
    }
    const [code] = await exit
    report.fixtureExitCode = code
    report.passed = report.passed === true && code === 0
    await writeFile(join(root, 'report.json'), JSON.stringify(report, null, 2))
    if (!report.passed)
      process.exitCode = 1
  }
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
