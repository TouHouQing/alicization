import type { LifeStateView } from '../../../shared/life-contracts'

import { readLifeBodyActivities } from './life-body-activity-runtime'
import { readLifeDailyRhythm } from './life-daily-activity-runtime'

export function verifiedLifeDailyActivities(view: LifeStateView) {
  const rhythm = readLifeDailyRhythm(view.values)
  const receipts = readLifeBodyActivities(view)
  const activities = [...new Map([...rhythm.history, ...(rhythm.current ? [rhythm.current] : [])].map(activity => [activity.id, activity])).values()]
  return activities.flatMap((activity) => {
    if (activity.phase !== 'finished')
      return []
    const body = receipts.find(receipt => receipt.activityId === activity.id && receipt.state === 'completed' && receipt.nativeVisible && receipt.visiblePixels && receipt.motionCompleted && receipt.activitySequence === 1 && receipt.observedFrames >= 30 && receipt.observedMs >= 4000 && receipt.movementRadians >= 0.2)
    const quiet = activity.kind === 'rest' && activity.observedAt >= activity.dueAt && activity.dueAt - activity.startedAt >= 180000 && activity.observedAt - activity.dueAt <= 120000
    if (activity.kind === 'stretch' ? !activity.bodyVerified || !body : !quiet)
      return []
    return [{ binding: { kind: 'activity' as const, id: activity.id, version: String(activity.sequence) }, actor: 'self', activity: activity.kind, verifiedAt: body?.occurredAt ?? activity.observedAt, proof: body ? 'visible-owned-model-movement' : 'actual-runtime-quiet-window', physicalWorldExperience: false }]
  }).slice(-8)
}
