import type { BrowserWindow } from 'electron'

import type { LifeBackupCommand, LifeBackupResult } from '../../../shared/life-backup-contracts'
import type { createLifeBackupRuntime } from './life-backup-runtime'

import messages from '@proj-alicization/i18n/locales'

import { app, dialog } from 'electron'

import { createI18n } from '../../libs/i18n'

export async function runNativeLifeBackupCommand(runtime: ReturnType<typeof createLifeBackupRuntime>, input: LifeBackupCommand, window: BrowserWindow): Promise<LifeBackupResult> {
  if (input.action === 'list')
    return { status: 'listed', backups: await runtime.list() }
  if (input.action === 'create') {
    await runtime.create()
    return { status: 'created', backups: await runtime.list() }
  }
  if (!input.backupId || !input.expectedManifestHash)
    throw new Error('Restore requires the reviewed backup identity')
  const t = createI18n({ messages, locale: app.getLocale().startsWith('zh') ? 'zh-Hans' : 'en' }).t
  const controller = new AbortController()
  const cancel = () => controller.abort()
  window.once('closed', cancel)
  let response: { response: number }
  try {
    response = await dialog.showMessageBox(window, { type: 'warning', title: t('settings.life.backup.confirm_title'), message: t('settings.life.backup.confirm_message'), detail: t('settings.life.backup.confirm_detail'), buttons: [t('settings.life.backup.cancel'), t('settings.life.backup.confirm')], defaultId: 0, cancelId: 0, noLink: true, signal: controller.signal })
  }
  finally { window.removeListener('closed', cancel) }
  if (controller.signal.aborted || window.isDestroyed())
    return { status: 'cancelled', backups: [] }
  if (response.response !== 1)
    return { status: 'cancelled', backups: await runtime.list() }
  await runtime.requestRestore(input.backupId, input.expectedManifestHash)
  // The boot-time saga runs only after the old workers and writer are closed.
  setTimeout(() => { app.relaunch(); app.quit() }, 300)
  return { status: 'restarting', backups: [] }
}
