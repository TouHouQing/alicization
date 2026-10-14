import type { AlicizationBodyActivityReceipt } from '@proj-alicization/stage-shared'

import type { LifeCommitInput, LifeCommitReceipt, LifeStateView } from '../../../shared/life-contracts'

import * as v from 'valibot'

import { readLifeDailyRhythm } from './life-daily-activity-runtime'

const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
const time = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(Number.MAX_SAFE_INTEGER))
export const lifeBodyActivitySchema = v.strictObject({
  cardId: id,
  activityId: id,
  activitySequence: time,
  modelId: id,
  renderer: v.picklist(['vrm', 'live2d']),
  state: v.picklist(['started', 'completed', 'interrupted', 'unsupported', 'hidden']),
  observedFrames: v.pipe(time, v.maxValue(100000)),
  observedMs: v.pipe(time, v.maxValue(600000)),
  movementRadians: v.pipe(v.number(), v.minValue(0), v.maxValue(Math.PI)),
  cue: id,
  visiblePixels: v.boolean(),
  motionCompleted: v.boolean(),
  occurredAt: time,
})

export function readLifeBodyActivities(view: LifeStateView): Array<AlicizationBodyActivityReceipt & { nativeVisible: boolean, sessionId: string }> {
  return view.ingress.filter(item => item.kind === 'body-receipt' && item.source === 'rendered-body-activity' && item.status === 'settled').map(item => item.payload as unknown as AlicizationBodyActivityReceipt & { nativeVisible: boolean, sessionId: string })
}

export async function recordLifeBodyActivity(options: {
  read: () => Promise<LifeStateView>
  commit: (input: LifeCommitInput) => Promise<LifeCommitReceipt>
  now: () => number
}, input: AlicizationBodyActivityReceipt, sessionId: string, nativeVisible: boolean) {
  const receipt = v.parse(lifeBodyActivitySchema, input)
  const view = await options.read()
  const activity = readLifeDailyRhythm(view.values).current
  if (view.cardId !== receipt.cardId || activity?.id !== receipt.activityId || activity.sequence !== receipt.activitySequence || activity.phase !== 'working')
    throw new Error('Body observation has no current activity owner')
  if (receipt.occurredAt < activity.startedAt || receipt.occurredAt > options.now() + 1000 || options.now() - receipt.occurredAt > 5000 || receipt.observedMs > options.now() - activity.startedAt + 1000)
    throw new Error('Body observation is stale or exceeds the activity interval')
  const expectedCue = activity.kind === 'stretch' ? 'stretch' : 'rest_settle'
  if (receipt.cue !== expectedCue)
    throw new Error('Body observation does not match the requested action')
  const previous = readLifeBodyActivities(view)
  const start = previous.find(item => item.activityId === receipt.activityId && item.sessionId === sessionId && item.state === 'started' && item.modelId === receipt.modelId && item.nativeVisible)
  if (receipt.state === 'completed' && (!nativeVisible || !receipt.visiblePixels || !receipt.motionCompleted || !start?.visiblePixels || receipt.observedMs < 4000 || receipt.observedFrames < 30 || receipt.movementRadians < 0.2 || receipt.renderer !== 'vrm'))
    throw new Error('Body completion requires visible, owned model movement')
  const terminal = previous.find(item => item.activityId === receipt.activityId && item.state !== 'started')
  if (terminal)
    return { status: 'duplicate' as const }
  const key = view.owners.find(owner => owner.owner === 'expression')?.metaKey ?? 'life:expression-head'
  const ingressId = `body-activity:${receipt.activityId}:${sessionId}:${receipt.state}`
  await options.commit({ cardId: receipt.cardId, operationKey: ingressId, changes: [{ owner: 'expression', key, expectedValue: view.values[key] ?? null, value: JSON.stringify({ ...(view.values[key] ? JSON.parse(view.values[key]) : {}), bodyActivityReceipt: ingressId }) }], mutations: [{ type: 'ingress-accept', ingress: { id: ingressId, kind: 'body-receipt', source: 'rendered-body-activity', sourceKey: ingressId, occurredAt: receipt.occurredAt, payload: { ...receipt, sessionId, nativeVisible } } }, { type: 'ingress-settle', id: ingressId, status: 'settled' }] })
  return { status: 'recorded' as const }
}
