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
export interface LifeBackupCommand {
  cardId: string
  action: 'list' | 'create' | 'restore'
  backupId?: string
  expectedManifestHash?: string
}
export interface LifeBackupResult {
  status: 'listed' | 'created' | 'cancelled' | 'restarting'
  backups: LifeBackupSummary[]
}
