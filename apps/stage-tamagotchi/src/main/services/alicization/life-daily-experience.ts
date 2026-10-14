import type { AlicizationEpisodicEventInput } from '@proj-alicization/stage-shared'

import type { LifeCommitInput, LifeCommitReceipt, LifeIngress, LifeStateView } from '../../../shared/life-contracts'
import type { LifeDailyActivity } from './life-daily-activity-runtime'

/**
 * The experience is the completed digital body activity, never an invented
 * physical sensation or a fictional scene from a generated work.
 */
export async function recordLifeDailyExperience(options: { read: () => Promise<LifeStateView>, getIngress: (id: string) => Promise<LifeIngress | null>, commit: (input: LifeCommitInput) => Promise<LifeCommitReceipt>, appendEpisodes: (events: AlicizationEpisodicEventInput[]) => Promise<unknown> }, cardId: string, activity: LifeDailyActivity) {
  if (activity.phase !== 'finished' || activity.kind !== 'stretch' || !activity.bodyVerified)
    return
  const id = `daily-experience:${activity.id}`
  if (await options.getIngress(id))
    return
  const before = await options.read()
  if (before.cardId !== cardId)
    throw new Error('Daily experience crossed the card boundary')
  const source = before.ingress.find(item => item.source === 'rendered-body-activity' && item.payload.activityId === activity.id && item.payload.state === 'completed' && item.payload.nativeVisible === true)
  if (!source)
    return
  await options.appendEpisodes([{ id, cardId, turnId: activity.id, sourceKind: 'execution-result', provenance: 'observed', occurredAt: source.occurredAt, createdAt: source.occurredAt, updatedAt: source.occurredAt, whatHappened: '完成了一次数字身体的伸展。实际模型运动和可见窗口回执已核验；这不代表物理身体或外部世界经历。', sourceSummary: `visible-owned-body:${source.id}`, confidence: 1, salience: 0.35, withWhom: ['self'], tags: ['daily-life', 'verified-body'], derivedFrom: [] }])
  const view = await options.read()
  const key = view.owners.find(owner => owner.owner === 'memory')?.metaKey ?? 'life:memory-head'
  await options.commit({ cardId, operationKey: id, changes: [{ owner: 'memory', key, expectedValue: view.values[key] ?? null, value: JSON.stringify({ ...(view.values[key] ? JSON.parse(view.values[key]) : {}), dailyExperience: id }) }], mutations: [{ type: 'ingress-accept', ingress: { id, kind: 'system', source: 'daily-memory-index', sourceKey: id, occurredAt: source.occurredAt, payload: { episodeId: id, bodyReceiptId: source.id } } }, { type: 'ingress-settle', id, status: 'settled' }] })
}
