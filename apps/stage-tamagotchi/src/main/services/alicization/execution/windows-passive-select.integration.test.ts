import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { env, platform } from 'node:process'

import { expect, it } from 'vitest'

import { startNativeMenuFixture, startNativeSelectFixture } from '../../../../../scripts/life-acceptance/native-menu-product-fixture'
import { createLifeWindowsDesktopRuntime } from '../life-windows-desktop-runtime'

it.skipIf(platform !== 'win32' || env.LIFE_QA_NATIVE_MENU !== '1').each(['select', 'budget', 'menu'])('reads a real passive WPF %s without activation and refuses input-desktop selection before dispatch', async (kind) => {
  const root = await mkdtemp(join(tmpdir(), 'life-passive-select-'))
  let fixture: Awaited<ReturnType<typeof startNativeMenuFixture>> | undefined
  let completed = false
  try {
    fixture = kind === 'menu' ? await startNativeMenuFixture({ root }) : await startNativeSelectFixture({ root, large: kind === 'budget' })
    expect(fixture).toMatchObject({ outsideAllDisplays: true, foreground: false })
    const owner = fixture
    const adapter = createLifeWindowsDesktopRuntime({ ownerId: () => owner.nonce, authorize: async (request) => {
      expect(JSON.parse(request.targetId)).toMatchObject({ windowId: owner.windowId, processId: owner.processId, processStartTicks: owner.processStartTicks })
      return { allow: true, reason: 'Exact owned passive fixture only' }
    } })
    const observe = () => adapter.listDesktopInteractables({ windowTitle: owner.windowTitle, maxItems: 120 })
    const observed = await observe() as Record<string, unknown>
    if (kind === 'budget') {
      expect(observed).toMatchObject({ ok: true })
      const controls = observed.elements as Array<Record<string, unknown>>
      const select = controls.find(control => control.role === 'select' && control.name === 'Owned category')
      expect(select).toMatchObject({ value: '按名称', optionsComplete: false })
      expect(select?.options).toHaveLength(64)
      expect(controls.some(control => control.role === 'menu-item')).toBe(true)
      expect(await adapter.typeDesktopText({ windowTitle: owner.windowTitle, role: 'select', targetText: 'Owned category', text: '按类型', clearExisting: true, exactText: true })).toMatchObject({ ok: false, errorCode: 'WINDOWS_UIA_SELECT_OPTIONS_BUDGET', effectMayHaveOccurred: false, sideEffectState: 'none' })
    }
    else if (kind === 'menu') {
      expect(observed).toMatchObject({ ok: true, windowId: owner.windowId, processId: owner.processId })
      expect(await adapter.clickDesktopElement({ windowTitle: owner.windowTitle, role: 'menu-item', text: 'Owned file options', exactText: true })).toMatchObject({ ok: false, errorCode: 'WINDOWS_UIA_FOREGROUND_REQUIRED', effectMayHaveOccurred: false, sideEffectState: 'none' })
      expect(await owner.snapshot()).toStrictEqual({ nonce: owner.nonce, clicks: 0, submenuOpen: false, actionVisible: false, foregroundTaken: false })
    }
    else {
      expect(observed).toMatchObject({ ok: true, windowId: owner.windowId, processId: owner.processId, processStartTicks: owner.processStartTicks })
      const controls = observed.elements as Array<Record<string, unknown>>
      expect(controls.find(control => control.role === 'select' && control.name === 'Owned category')).toMatchObject({ value: '按名称', options: ['按名称', '按类型', '中文🙂'], optionsComplete: true })
      expect(await adapter.clickDesktopElement({ windowTitle: owner.windowTitle, role: 'select', text: 'Owned category', exactText: true })).toMatchObject({ ok: false, errorCode: 'WINDOWS_UIA_FOREGROUND_REQUIRED', effectMayHaveOccurred: false, sideEffectState: 'none' })
      expect(await observe()).toMatchObject({ ok: true })
      expect(await adapter.typeDesktopText({ windowTitle: owner.windowTitle, role: 'select', targetText: 'Owned category', text: '中文🙂', clearExisting: true, exactText: true })).toMatchObject({ ok: false, errorCode: 'WINDOWS_UIA_FOREGROUND_REQUIRED', requiresForeground: true, effectMayHaveOccurred: false, sideEffectState: 'none' })
      expect(await observe()).toMatchObject({ ok: true })
      expect(await adapter.typeDesktopText({ windowTitle: owner.windowTitle, role: 'select', targetText: 'Owned category', text: '不存在', clearExisting: true, exactText: true })).toMatchObject({ ok: false, errorCode: 'WINDOWS_UIA_AMBIGUOUS_OR_MISSING_SELECT_OPTION', effectMayHaveOccurred: false, sideEffectState: 'none' })
    }
    await expect(readFile(owner.marker)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await owner.snapshot()).toMatchObject({ nonce: owner.nonce, clicks: 0, foregroundTaken: false })
    if (kind !== 'menu')
      expect(await owner.snapshot()).toMatchObject({ selected: '按名称', dropdownOpen: false })
    completed = true
  }
  finally {
    if (fixture)
      expect(await fixture.close()).toMatchObject({ closed: true, normalExit: true, nativeJobTreeStopped: true })
    if (completed)
      await rm(root, { recursive: true, force: true })
  }
}, 120000)
