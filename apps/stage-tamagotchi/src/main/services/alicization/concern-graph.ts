import type {
  AlicizationConcernKind,
  AlicizationConcernSnapshot,
  AlicizationConcernStatus,
  AlicizationDurabilityPulseSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationVisualSceneSnapshot,
  AlicizationVisualTarget,
  AlicizationVisualTransitionSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeTarget(target: AlicizationVisualTarget | null | undefined) {
  if (!target)
    return null
  return {
    appName: sanitizeText(target.appName, 80) || undefined,
    processName: sanitizeText(target.processName, 80) || undefined,
    title: sanitizeText(target.title, 160) || undefined,
    pid: Number.isFinite(Number(target.pid)) ? Math.floor(Number(target.pid)) : null,
  }
}

function concernId(kind: AlicizationConcernKind, scene: AlicizationVisualSceneSnapshot | null, knot: string) {
  const target = normalizeTarget(scene?.target)
  return [
    kind,
    scene?.scenario ?? 'unknown',
    target?.appName ?? '',
    target?.processName ?? '',
    target?.title ?? '',
    target?.pid ?? '',
    knot,
  ].join('::').toLowerCase()
}

function isSeriousDurabilityPulse(pulse: AlicizationDurabilityPulseSnapshot | null | undefined) {
  return pulse?.kind === 'process-gone'
    || pulse?.kind === 'render-process-gone'
    || pulse?.kind === 'child-process-gone'
    || pulse?.kind === 'anr-likely'
}

function inferConcernKind(input: {
  context: AlicizationProactiveLayeredContext
  appraisal: AlicizationSubjectiveSceneAppraisal
  worldModel: AlicizationWorldModelSnapshot
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
}): AlicizationConcernKind {
  if (isSeriousDurabilityPulse(input.durabilityPulse))
    return 'help-fix'
  if (input.worldModel.activeThread?.kind === 'late-night-endurance')
    return 'care-body'
  if (input.worldModel.activeThread?.kind === 'debugging' || input.worldModel.activeThread?.kind === 'change-review' || input.worldModel.activeThread?.kind === 'recovery')
    return 'help-fix'
  if (input.worldModel.activeThread?.kind === 'deep-focus')
    return 'unfinished-thread'
  if (input.worldModel.activeThread?.kind === 'co-viewing')
    return 'co-watch'
  if (input.context.localTime.isLateNight && input.context.relationship.fatigue >= 55)
    return 'care-body'
  if (input.context.content.kind === 'error' || input.context.content.kind === 'diff')
    return 'help-fix'
  if (input.context.workload.kind === 'coding' || input.context.workload.kind === 'terminal')
    return 'unfinished-thread'
  if (input.context.workload.kind === 'media')
    return 'co-watch'
  if (input.appraisal.currentKnot)
    return 'curiosity'
  return 'protect-focus'
}

function inferConcernSummary(input: {
  kind: AlicizationConcernKind
  appraisal: AlicizationSubjectiveSceneAppraisal
  scene: AlicizationVisualSceneSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
}) {
  const target = sanitizeText(
    input.worldModel.activeThread?.title
    ?? input.scene?.summary
    ?? input.scene?.target?.title
    ?? '',
    120,
  )
  const focalSubject = input.appraisal.currentKnot
    || sanitizeText(input.worldModel.activeThread?.title, 120)
    || target
  if (input.kind === 'help-fix')
    return sanitizeText(input.worldModel.activeThread?.summary ?? `她还在挂着 ${focalSubject || '当前问题'} 这件事。`, 140) || '她还在挂着当前问题。'
  if (input.kind === 'care-body')
    return sanitizeText(input.worldModel.activeThread?.summary ?? '她担心你正在把自己拖进更深的疲惫里。', 140) || '她担心你正在把自己拖进更深的疲惫里。'
  if (input.kind === 'co-watch')
    return sanitizeText(input.worldModel.activeThread?.summary ?? `她还在陪你停留在 ${target || '当前内容'} 里。`, 140) || '她还在陪你停留在当前内容里。'
  if (input.kind === 'unfinished-thread')
    return sanitizeText(input.worldModel.activeThread?.summary ?? `她觉得 ${focalSubject || '这一段工作'} 还没有真正收束。`, 140) || '她觉得这段工作还没有真正收束。'
  if (input.kind === 'curiosity')
    return sanitizeText(`她想再看清 ${focalSubject || '这一刻'} 到底意味着什么。`, 140) || '她想再看清这一刻到底意味着什么。'
  return '她更想先护住你的专注，不急着插进来。'
}

function nextStatus(input: {
  previous?: AlicizationConcernSnapshot
  now: number
  active: boolean
}): AlicizationConcernStatus {
  if (input.active)
    return input.previous ? 'active' : 'forming'
  if (!input.previous)
    return 'released'
  if (input.now - input.previous.lastEvidenceAt <= 6 * 60_000)
    return 'lingering'
  return 'released'
}

export function updateConcernGraph(input: {
  now: number
  previousConcerns?: AlicizationConcernSnapshot[] | null
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  appraisal: AlicizationSubjectiveSceneAppraisal
  scene: AlicizationVisualSceneSnapshot | null
  recentTransition: AlicizationVisualTransitionSnapshot | null
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
}): AlicizationConcernSnapshot[] {
  const kind = inferConcernKind({
    context: input.context,
    appraisal: input.appraisal,
    worldModel: input.worldModel,
    durabilityPulse: input.durabilityPulse,
  })
  const knot = sanitizeText(input.appraisal.currentKnot ?? input.worldModel.activeThread?.title ?? input.scene?.summary ?? '', 120)
  const id = concernId(kind, input.scene, knot)
  const previousConcerns = Array.isArray(input.previousConcerns) ? input.previousConcerns : []
  const previous = previousConcerns.find(item => item.id === id)
  const target = normalizeTarget(input.worldModel.activeThread?.target ?? input.scene?.target)
  const currentConcern: AlicizationConcernSnapshot = {
    id,
    kind,
    status: nextStatus({
      previous,
      now: input.now,
      active: true,
    }),
    summary: inferConcernSummary({
      kind,
      appraisal: input.appraisal,
      scene: input.scene,
      worldModel: input.worldModel,
    }),
    target,
    hostGoal: input.appraisal.inferredHostGoal,
    tension: clamp01(
      input.appraisal.carePressure * 0.6
      + input.appraisal.surprise * 0.18
      + input.appraisal.desireToSpeak * 0.22
      + (input.worldModel.activeThread?.significance ?? 0) * 0.12
      + (input.recentTransition ? 0.08 : 0),
    ),
    confidence: clamp01(
      input.appraisal.confidence * 0.72
      + (previous?.confidence ?? 0) * 0.18
      + (input.worldModel.activeThread?.confidence ?? 0) * 0.08
      + (isSeriousDurabilityPulse(input.durabilityPulse) ? 0.08 : 0),
    ),
    careWeight: clamp01(
      (kind === 'care-body' ? 0.92 : 0.45)
      + (kind === 'help-fix' ? 0.24 : 0)
      + (kind === 'co-watch' ? 0.08 : 0),
    ),
    createdAt: previous?.createdAt ?? input.now,
    lastEvidenceAt: input.now,
    patienceUntil: input.now + (kind === 'co-watch' ? 12 * 60_000 : kind === 'care-body' ? 9 * 60_000 : 15 * 60_000),
    predictedClosure: input.appraisal.waitingToVerify,
  }

  const lingeringConcerns: AlicizationConcernSnapshot[] = []
  for (const item of previousConcerns) {
    if (item.id === id)
      continue
    const status = nextStatus({
      previous: item,
      now: input.now,
      active: false,
    })
    if (status === 'released')
      continue
    lingeringConcerns.push({
      ...item,
      status,
      tension: clamp01(item.tension * 0.86),
    })
  }

  return [...lingeringConcerns, currentConcern]
    .sort((left, right) => (right.tension * right.careWeight) - (left.tension * left.careWeight))
    .slice(0, 6)
}
