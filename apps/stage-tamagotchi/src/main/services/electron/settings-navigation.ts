import type { IpcMain } from 'electron'

import type { SettingsWindowManager } from '../../windows/settings'

import { defineInvokeHandler } from '@moeru/eventa'
import { createContext } from '@moeru/eventa/adapters/electron/main'

import { electronOpenSettings } from '../../../shared/eventa'

export function createSettingsNavigationService(ipcMain: IpcMain, settings: Pick<SettingsWindowManager, 'openWindow'>) {
  // Navigation has multiple callers. An unbound adapter replies to the actual
  // request sender; a context bound to the stage strands onboarding's promise.
  const { context, dispose } = createContext(ipcMain)
  defineInvokeHandler(context, electronOpenSettings, async (payload) => {
    await settings.openWindow(payload?.route)
  })
  return { dispose }
}
