import type { LifeTransaction } from './life-transaction'

import { createHash } from 'node:crypto'

import { boundedJson } from './life-transaction'

export async function redactLifeProjectSource(tx: LifeTransaction, threadId: string) {
  const task = await tx.get<{ metadata_json: string | null }>('SELECT metadata_json FROM task_threads WHERE id = ?', [threadId])
  if (task) {
    const metadata = task.metadata_json ? JSON.parse(task.metadata_json) as Record<string, unknown> : {}
    const retained = { personalActivity: metadata.personalActivity, ownership: metadata.ownership, sourceEvidence: metadata.sourceEvidence, goalProof: metadata.goalProof, sourceWithdrawn: true }
    await tx.run(`UPDATE task_threads SET goal = '来源已遗忘的个人活动', summary = '相关兴趣材料已撤销。', metadata_json = ?, updated_at = ? WHERE id = ?`, [boundedJson(retained), tx.now, threadId])
  }
  const effects = await tx.all<{ effect_id: string, intent_hash: string, status: string, payload_ref_json: string }>('SELECT effect_id, intent_hash, status, payload_ref_json FROM life_effect_intents WHERE card_id = ? AND turn_id = ?', [tx.cardId, threadId])
  for (const effect of effects) {
    const payload = boundedJson({ sourceWithdrawn: true, originalIntentHash: (JSON.parse(effect.payload_ref_json) as { originalIntentHash?: string }).originalIntentHash ?? effect.intent_hash })
    const receipt = ['settled', 'uncertain', 'failed'].includes(effect.status) ? boundedJson({ sourceWithdrawn: true, recordedStatus: effect.status }) : null
    await tx.run('UPDATE life_effect_intents SET payload_ref_json = ?, intent_hash = ?, receipt_ref_json = ? WHERE card_id = ? AND effect_id = ?', [payload, createHash('sha256').update(payload).digest('hex'), receipt, tx.cardId, effect.effect_id])
    const observations = await tx.all<{ ingress_id: string }>('SELECT ingress_id FROM life_ingress WHERE card_id = ? AND source = ? AND source_key = ?', [tx.cardId, 'execution', effect.effect_id])
    for (const observation of observations) {
      const body = boundedJson({ sourceWithdrawn: true, recordedStatus: effect.status })
      await tx.run('UPDATE life_ingress SET payload_ref_json = ?, payload_hash = ? WHERE card_id = ? AND ingress_id = ?', [body, createHash('sha256').update(body).digest('hex'), tx.cardId, observation.ingress_id])
    }
  }
}
