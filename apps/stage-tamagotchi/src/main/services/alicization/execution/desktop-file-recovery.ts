import type { AlicizationDbService } from '../db'

import { Buffer } from 'node:buffer'
import { dirname, join } from 'node:path'
import { platform } from 'node:process'

import { safeStorage } from 'electron'

import { createFileRecoveryVault } from './file-recovery-vault'
import { collectFileVersionOrphans } from './file-version-orphan-cleanup'
import { createFileVersionRepository } from './file-version-repository'

/** Encryption stays in the desktop main process and follows the current card. */
export function createDesktopFileRecovery(database: AlicizationDbService) {
  const encrypted = () => {
    if (!safeStorage.isEncryptionAvailable() || platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')
      throw new Error('Original file backup encryption is unavailable; the file was not overwritten')
  }
  const vault = createFileRecoveryVault({ root: join(dirname(database.dbPath), 'file-recovery'), seal: (bytes) => {
    encrypted()
    return safeStorage.encryptString(Buffer.from(bytes).toString('base64'))
  }, unseal: (bytes) => {
    encrypted()
    return Buffer.from(safeStorage.decryptString(Buffer.from(bytes)), 'base64')
  } })
  return { ...createFileVersionRepository({ database: () => database, vault }), collectOrphans: (assertCurrent: () => void) => collectFileVersionOrphans({ database, vault, assertCurrent }) }
}
