import type { FileRecoveryBlob } from './file-recovery-vault'

import { createHash } from 'node:crypto'
import { join } from 'node:path'

import * as v from 'valibot'

import sqlite from '../sqlite3-runtime'

import { sqliteFileSystemPath } from '../sqlite-file-path'
import { createFileRecoveryVault } from './file-recovery-vault'
import { fileVersionBeforeSchema } from './file-version-repository'

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
function closedCodec(): never {
  throw new Error('Backup transports ciphertext without decrypting original files')
}
const vault = (directory: string) => createFileRecoveryVault({ root: join(directory, 'file-recovery'), seal: closedCodec, unseal: closedCodec })
const maximumReferences = 4096
const maximumBytes = 64 * 1024 * 1024

// Only exact creation-only records consume no ciphertext reference budget.
// Keep malformed/missing blob metadata in the validation path.
export const fileRecoveryBackupReferencesSql = `SELECT i.ingress_id,i.card_id,i.source_key,i.status,i.payload_hash,i.payload_ref_json FROM life_ingress i WHERE i.card_id=? AND i.source='file-version-before' AND (json_type(i.payload_ref_json,'$.existed') IS NOT 'false' OR json_type(i.payload_ref_json,'$.blob') IS NOT 'null') AND NOT EXISTS(SELECT 1 FROM life_evidence_cleanup_jobs j WHERE j.card_id=i.card_id AND j.mode='forget' AND json_extract(j.source_ref_json,'$.kind')='file-version' AND CAST(json_extract(j.source_ref_json,'$.id') AS TEXT)=i.source_key AND CAST(json_extract(j.source_ref_json,'$.version') AS TEXT)=i.payload_hash) ORDER BY i.ingress_id LIMIT ?`

/** Read the actual SQLite snapshot, never a caller-supplied list of paths. */
export async function readFileRecoveryBackupReferences(databasePath: string, cardId: string): Promise<FileRecoveryBlob[]> {
  const db = await new Promise<InstanceType<typeof sqlite.Database>>((resolve, reject) => {
    const opened = new sqlite.Database(sqliteFileSystemPath(databasePath), sqlite.OPEN_READONLY, error => error ? reject(error) : resolve(opened))
  })
  try {
    const rows = await new Promise<Array<{ ingress_id: string, card_id: string, source_key: string, status: string, payload_hash: string, payload_ref_json: string }>>((resolve, reject) => {
      db.all(fileRecoveryBackupReferencesSql, [cardId, maximumReferences + 1], (error, rows) => error ? reject(error) : resolve(rows as never))
    })
    if (rows.length > maximumReferences)
      throw new Error('File recovery backup exceeded its reference budget')
    const references: FileRecoveryBlob[] = []
    let bytes = 0
    for (const row of rows) {
      if (row.payload_ref_json.length > 16384)
        throw new Error('File recovery backup journal exceeded its byte budget')
      const payload = JSON.parse(row.payload_ref_json)
      const before = v.parse(fileVersionBeforeSchema, payload)
      if (row.card_id !== cardId || before.cardId !== cardId || row.status !== 'settled' || row.ingress_id !== `file-version-before:${before.id}` || row.source_key !== before.id || row.payload_hash !== digest(payload) || before.existed !== Boolean(before.blob && before.device && before.inode) || (before.blob && (before.blob.id !== before.id || before.blob.sha256 !== before.sha256 || before.blob.bytes !== before.bytes)))
        throw new Error('File recovery backup reference left its immutable journal')
      if (!before.blob)
        continue
      bytes += before.blob.cipherBytes
      if (bytes > maximumBytes)
        throw new Error('File recovery backup exceeded its ciphertext budget')
      references.push(before.blob)
    }
    return references.sort((a, b) => a.id.localeCompare(b.id))
  }
  finally { await new Promise<void>((resolve, reject) => db.close(error => error ? reject(error) : resolve())) }
}

export async function copyFileRecoveryBackupArtifacts(databasePath: string, sourceDirectory: string, targetDirectory: string, cardId: string) {
  const references = await readFileRecoveryBackupReferences(databasePath, cardId)
  const source = vault(sourceDirectory)
  const target = vault(targetDirectory)
  for (const ref of references)
    await target.importEncrypted(ref, await source.readEncrypted(ref))
  return references
}

export async function verifyFileRecoveryBackupArtifacts(databasePath: string, directory: string, cardId: string, expected: readonly FileRecoveryBlob[]) {
  const references = await readFileRecoveryBackupReferences(databasePath, cardId)
  if (digest(references) !== digest(expected))
    throw new Error('File recovery backup references changed after review')
  const storage = vault(directory)
  for (const ref of references)
    await storage.readEncrypted(ref)
  return references
}
