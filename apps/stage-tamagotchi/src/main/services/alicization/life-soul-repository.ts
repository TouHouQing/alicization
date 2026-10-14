import type { LifeMutation } from '../../../shared/life-contracts'
import type { LifeTransaction } from './life-transaction'

import { isAbsolute } from 'node:path'

import { assertLifePersonaAuthorization } from './life-persona-evaluation'
import { assertLifeId } from './life-transaction'

export async function applyLifeSoul(tx: LifeTransaction, mutation: Extract<LifeMutation, { type: 'soul-prepare' | 'soul-transition' }>) {
  if (mutation.type === 'soul-prepare') {
    const intent = mutation.intent
    assertLifeId(intent.id)
    if (!/^[a-f\d]{64}$/i.test(intent.baseHash) || !/^[a-f\d]{64}$/i.test(intent.targetHash) || intent.status !== 'prepared')
      throw new TypeError('SOUL activation requires exact source and target hashes')
    for (const path of [intent.stagedPath, intent.backupPath]) {
      if (isAbsolute(path) || path.split(/[\\/]/).includes('..') || !path.startsWith('.life/soul/'))
        throw new TypeError('SOUL staging path must stay inside its card directory')
    }
    if (intent.personaAuthorization)
      await assertLifePersonaAuthorization(tx, intent.personaAuthorization.proposalId, intent.personaAuthorization.evaluationHash, intent.targetHash)
    await tx.run(`INSERT INTO life_soul_activation_intents(card_id, operation_id, base_hash, target_hash, staged_relative_path, backup_relative_path, source_refs_json, status, target_soul_revision, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'prepared', ?, ?, ?)`, [tx.cardId, intent.id, intent.baseHash, intent.targetHash, intent.stagedPath, intent.backupPath, JSON.stringify(intent.personaAuthorization ?? null), intent.soulRevision, tx.now, tx.now])
    return
  }
  const row = await tx.get<{ status: string, source_refs_json: string, target_hash: string }>('SELECT status, source_refs_json, target_hash FROM life_soul_activation_intents WHERE card_id = ? AND operation_id = ?', [tx.cardId, mutation.id])
  const allowed: Record<string, string[]> = { 'prepared': ['file-replaced', 'conflicted', 'failed'], 'file-replaced': ['activated', 'conflicted', 'failed'], 'activated': [], 'conflicted': [], 'failed': [], 'rolled-back': [] }
  if (row?.status !== mutation.expected || !allowed[mutation.expected]?.includes(mutation.status))
    throw new Error('SOUL activation fence became stale')
  const authorization = JSON.parse(row.source_refs_json) as { proposalId?: string, evaluationHash?: string } | null
  if (mutation.status === 'activated' && authorization?.proposalId && authorization.evaluationHash) {
    await assertLifePersonaAuthorization(tx, authorization.proposalId, authorization.evaluationHash, row.target_hash, true)
    await tx.run(`UPDATE life_effect_intents SET status = 'settled', updated_at = ? WHERE card_id = ? AND effect_id = ? AND status IN ('prepared','settled')`, [tx.now, tx.cardId, authorization.proposalId])
  }
  await tx.run('UPDATE life_soul_activation_intents SET status = ?, activation_commit_id = ?, updated_at = ? WHERE card_id = ? AND operation_id = ?', [mutation.status, mutation.status === 'activated' ? tx.commitId : null, tx.now, tx.cardId, mutation.id])
}
