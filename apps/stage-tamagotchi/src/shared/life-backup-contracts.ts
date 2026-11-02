import * as v from 'valibot'

export interface LifeBackupSummary {
  id: string
  cardId: string
  createdAt: number
  revision: number
  schemaVersion: number
  databaseHash: string
  soulHash: string | null
  manifestHash: string
}
// The renderer and the trusted IPC entry share this bounded wire contract.
// Paging is display authority only; restore still binds the reviewed manifest.
export const lifeBackupCommandSchema = v.strictObject({
  cardId: v.pipe(v.string(), v.minLength(1), v.maxLength(512)),
  action: v.picklist(['list', 'create', 'restore']),
  backupId: v.optional(v.pipe(v.string(), v.uuid())),
  expectedManifestHash: v.optional(v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))),
  cursor: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(512))),
  limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100))),
  refresh: v.optional(v.boolean()),
})
export type LifeBackupCommand = v.InferOutput<typeof lifeBackupCommandSchema>
export interface LifeBackupResult {
  status: 'listed' | 'created' | 'cancelled' | 'restarting' | 'deferred'
  cardId: string
  backups: LifeBackupSummary[]
  issues: LifeBackupIssue[]
  page?: { total: number, issuesTotal: number, nextCursor: string | null }
}

export interface LifeBackupIssue {
  backupId: string
  ownership: 'unidentified'
  code: 'unreadable-manifest' | 'unsafe-entry'
}
