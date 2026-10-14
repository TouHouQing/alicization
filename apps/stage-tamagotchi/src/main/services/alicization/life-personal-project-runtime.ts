import type { AlicizationCliCommandInput, AlicizationExecutionEventRecord, AlicizationTaskThreadRecord, AlicizationTaskThreadUpsertInput } from '@proj-alicization/stage-shared'

import type { LifeCommitInput, LifeCommitReceipt, LifeEffect, LifeFactVersion, LifeIngress, LifeObligation, LifeStateView } from '../../../shared/life-contracts'
import type { LifeCreativeDraft } from './life-creative-activity'
import type { readLifePersonalProposals } from './life-personal-proposals'
import type { LifePersonalSeriesPlan, LifePersonalSeriesSlot } from './life-personal-series'

import { createHash } from 'node:crypto'
import { join } from 'node:path'

import { validateLifeCreativeDraft } from './life-creative-activity'
import { verifyLifeFileProof, verifyLifeGoal } from './life-goal-verifier'
import { buildLifePracticeReview, personalActivityCadence } from './life-personal-continuity'
import { pendingLifePersonalProposal } from './life-personal-proposals'
import { parseLifePersonalSeriesPlan, personalSeriesPlanHash, personalSeriesStepIdentity, readPersonalSeriesContinuation } from './life-personal-series'
import { recoveredProjectAction } from './life-project-action-recovery'
import { projectPracticePolicy } from './life-project-development'
import { createLifeTurnRuntime } from './life-turn-runtime'
import { renderLifeVisualDraft } from './life-visual-activity'

export function createLifePersonalProjectRuntime(options: {
  read: () => Promise<LifeStateView>
  getIngress: (id: string) => Promise<LifeIngress | null>
  getEffect: (id: string) => Promise<LifeEffect | null>
  commit: (input: LifeCommitInput, options?: { signal?: AbortSignal }) => Promise<LifeCommitReceipt>
  facts: (cardId: string, factIds?: string[]) => Promise<LifeFactVersion[]>
  upsertTask: (input: AlicizationTaskThreadUpsertInput) => Promise<unknown>
  dispatch: (input: { threadId: string, cli: AlicizationCliCommandInput, workspaceRoot: string, abortSignal?: AbortSignal }) => Promise<{ thread: { status: string, summary: string | null } }>
  workspace: (cardId: string) => string
  foregroundActive: () => boolean
  now: () => number
  preferCreative?: boolean
  origin?: 'self-initiated' | 'host-invited'
  compose?: (input: { cardId: string, topic: string, practice: ReturnType<typeof projectPracticePolicy>, project?: LifePersonalSeriesSlot, signal: AbortSignal }) => Promise<LifeCreativeDraft | null>
  composeVisual?: (input: { cardId: string, topic: string, signal: AbortSignal }) => Promise<import('./life-visual-activity').LifeVisualDraft | null>
  planSeries?: (input: { cardId: string, topic: string, signal: AbortSignal }) => Promise<LifePersonalSeriesPlan | null>
  readTask?: (id: string) => Promise<AlicizationTaskThreadRecord | null | undefined>
  readExecutionEvents?: (threadId: string) => Promise<AlicizationExecutionEventRecord[]>
  recordExperience: (goal: LifeObligation) => Promise<void>
}) {
  let running = false
  async function readSeriesFacts(cardId: string, rootThreadId: string) {
    const task = await options.readTask?.(rootThreadId)
    const evidence = task?.metadata?.sourceEvidence as Array<{ kind: string, id: string }> | undefined
    const ids = (evidence ?? []).filter(ref => ref.kind === 'memory_facts').slice(0, 16).map(ref => ref.id)
    return options.facts(cardId, ids)
  }
  async function closeCompletedSeries(cardId: string) {
    if (!options.readTask)
      return
    const view = await options.read()
    if (view.cardId !== cardId)
      throw new Error('Personal series completion crossed the card boundary')
    const raw = view.values['life:initiative'] ?? null
    const budget = raw ? JSON.parse(raw) as Record<string, unknown> : {}
    if (typeof budget.pendingPersonalSeries !== 'string')
      return
    const continuation = await readPersonalSeriesContinuation({ rootThreadId: budget.pendingPersonalSeries, view, facts: await readSeriesFacts(cardId, budget.pendingPersonalSeries), readTask: options.readTask, workspaceRoot: options.workspace(cardId) })
    if (continuation.status !== 'closed' || continuation.reason !== 'project-completed')
      return
    await options.commit({ cardId, operationKey: `project-series-complete:${budget.pendingPersonalSeries}`, changes: [{ owner: 'initiative', key: 'life:initiative', value: JSON.stringify({ ...budget, pendingPersonalSeries: null, nextPersonalProjectAt: null }), expectedValue: raw }], mutations: [] })
  }
  async function run(cardId: string, signal?: AbortSignal) {
    if (running || options.foregroundActive() || signal?.aborted)
      return { status: 'held' as const, reason: 'foreground-or-running' }
    running = true
    try {
      const view = await options.read()
      if (view.cardId !== cardId)
        throw new Error('Personal activity crossed the card boundary')
      const raw = view.values['life:initiative'] ?? null
      const budget = raw ? JSON.parse(raw) as Record<string, unknown> : {}
      const now = Math.max(options.now(), Number(budget.observedAt) || 0)
      if (Number(budget.personalProjectAt) > 0 && now - Number(budget.personalProjectAt) < 30 * 60_000)
        return { status: 'held' as const, reason: 'daily-project-budget' }
      // Organizing known experience is reflection, never invented external reading.
      const facts = await options.facts(cardId)
      const eligible = facts.filter(item => item.subject.kind === 'entity' && [`host:${cardId}`, `self:${cardId}`].includes(item.subject.id ?? '') && item.lifecycle === 'active' && item.recordedTo == null && ['observed', 'reported'].includes(item.provenance) && /interest|likes|prefers|preference|爱好|兴趣|喜欢|偏好/iu.test(item.predicate) && !/dislike|不喜欢|讨厌|hate|avoid/iu.test(item.predicate) && (item.validFrom == null || item.validFrom <= now) && (item.validTo == null || item.validTo > now))
      const activities = options.compose
        ? options.preferCreative ? ['creative-writing-v1', 'interest-note-v1'] as const : ['interest-note-v1', 'creative-writing-v1'] as const
        : ['interest-note-v1'] as const
      let selected: { fact?: LifeFactVersion, proposal?: ReturnType<typeof readLifePersonalProposals>[number], activity: NonNullable<LifeObligation['personalActivity']>, identity: string, series?: LifePersonalSeriesSlot, review?: NonNullable<ReturnType<typeof buildLifePracticeReview>> } | null = null
      if (!budget.pendingPersonalSeries) {
        const proposal = pendingLifePersonalProposal(view, now)
        if (proposal && personalActivityCadence(view, proposal.activity, now).allowed && !projectPracticePolicy(view.obligations, proposal.activity, now).held)
          selected = { proposal, activity: proposal.activity, identity: createHash('sha256').update(proposal.id).digest('hex') }
      }
      if (typeof budget.pendingPersonalSeries === 'string' && options.readTask && options.compose) {
        const continuationFacts = (await readSeriesFacts(cardId, budget.pendingPersonalSeries)).filter(item => ['active', 'superseded'].includes(item.lifecycle) && ['observed', 'reported'].includes(item.provenance))
        const continuation = await readPersonalSeriesContinuation({ rootThreadId: budget.pendingPersonalSeries, view, facts: continuationFacts, readTask: options.readTask, workspaceRoot: options.workspace(cardId) })
        if (continuation.status === 'held')
          return { status: 'held' as const, reason: continuation.reason }
        if (continuation.status === 'ready') {
          if (projectPracticePolicy(view.obligations, 'creative-writing-v1', now).held)
            return { status: 'held' as const, reason: 'project-feedback-restraint' }
          if (personalActivityCadence(view, 'creative-writing-v1', now).allowed)
            selected = { fact: continuation.fact, activity: 'creative-writing-v1', identity: personalSeriesStepIdentity(continuation.slot.rootThreadId, continuation.slot.stepIndex), series: continuation.slot }
        }
        else {
          await options.commit({ cardId, operationKey: `project-series-close:${budget.pendingPersonalSeries}`, changes: [{ owner: 'initiative', key: 'life:initiative', value: JSON.stringify({ ...budget, pendingPersonalSeries: null, nextPersonalProjectAt: null }), expectedValue: raw }], mutations: [] }, { signal })
          return { status: 'held' as const, reason: continuation.reason }
        }
      }
      for (const fact of selected ? [] : eligible) {
        for (const activity of activities) {
          if (!personalActivityCadence(view, activity, now).allowed)
            continue
          const practice = projectPracticePolicy(view.obligations, activity, now)
          if (practice.held)
            continue
          for (let iteration = 0; iteration < (activity === 'creative-writing-v1' ? 4 : 1); iteration++) {
            const identity = createHash('sha256').update(JSON.stringify({ cardId, factId: fact.factId, version: fact.version, activity, ...(options.planSeries && activity === 'creative-writing-v1' ? { series: true } : {}), ...(iteration ? { iteration } : {}) })).digest('hex')
            const previous = view.obligations.find(item => item.id === `task:personal:${identity}`)
            if (!previous) {
              selected = { fact, activity, identity }
              break
            }
            // Repeated practice requires real positive feedback on this exact
            // topic and artifact, and another week. Silence never authorizes it.
            if (!previous.personalDevelopment?.feedback.some(item => item.feedback === 'positive' && now - item.occurredAt >= 7 * 24 * 60 * 60_000) || previous.invalidatedBy)
              break
          }
          if (selected)
            break
        }
        if (selected)
          break
      }
      if (!selected && personalActivityCadence(view, 'practice-review-v1', now).allowed) {
        const review = buildLifePracticeReview(view)
        if (review) {
          const identity = createHash('sha256').update(JSON.stringify({ cardId, activity: 'practice-review-v1', evidence: review.identity })).digest('hex')
          if (!view.obligations.some(goal => goal.threadId === `personal:${identity}`))
            selected = { activity: 'practice-review-v1', identity, review }
        }
      }
      if (!selected)
        return { status: 'held' as const, reason: eligible.length ? 'interest-already-processed' : 'no-grounded-interest' }
      const { fact, activity, identity } = selected
      const threadId = `personal:${identity}`
      const workspaceRoot = options.workspace(cardId)
      const name = `${identity}.${activity === 'visual-study-v1' ? 'svg' : 'md'}`
      const topic = selected.proposal?.topic ?? (fact ? String(fact.value).slice(0, 240) : selected.review!.topic)
      const sourceLabel = selected.proposal ? `${selected.proposal.id}，回复 ${selected.proposal.sourceReplyHash}` : fact ? `${fact.factId}，版本 ${fact.version}` : '已核验练习'
      const content = selected.review?.content ?? `# 兴趣札记\n\n这是对已有经历的整理。\n\n兴趣材料：${JSON.stringify(topic)}\n\n来源：${sourceLabel}。\n\n本次实际活动：整理并保存本地札记；尚未进行外部阅读或研究。\n`
      let artifactContent = content
      if (activity === 'visual-study-v1') {
        if (!options.composeVisual)
          return { status: 'held' as const, reason: 'visual-provider-unavailable' }
        const draft = await options.composeVisual({ cardId, topic, signal: signal ?? new AbortController().signal })
        if (!draft)
          return { status: 'held' as const, reason: 'visual-provider-unavailable' }
        artifactContent = renderLifeVisualDraft(draft, sourceLabel)
      }
      if (activity === 'creative-writing-v1') {
        if (!selected.series && !selected.proposal && options.planSeries) {
          const plan = parseLifePersonalSeriesPlan(await options.planSeries({ cardId, topic, signal: signal ?? new AbortController().signal }))
          if (!plan)
            return { status: 'held' as const, reason: 'project-plan-unavailable' }
          selected.series = { rootThreadId: threadId, stepIndex: 0, plan, previousPieces: [] }
        }
        const draft = await options.compose!({ cardId, topic, practice: projectPracticePolicy(view.obligations, activity, now), project: selected.series, signal: signal ?? new AbortController().signal })
        signal?.throwIfAborted()
        if (options.foregroundActive())
          return { status: 'held' as const, reason: 'foreground-priority' }
        if (!draft)
          return { status: 'held' as const, reason: 'creative-provider-unavailable' }
        const accepted = validateLifeCreativeDraft(draft)
        artifactContent = `# 创作练习：${accepted.title}\n\n这是一段新写的虚构作品，不代表真实经历。\n\n${accepted.body}\n\n---\n主题来源：${sourceLabel}。\n本次实际活动：创作并保存本地作品；没有进行外部阅读或研究。\n`
        if (selected.series)
          artifactContent += `\n持续项目：${selected.series.plan.title}\n本段：${selected.series.stepIndex + 1}/${selected.series.plan.steps.length}，${selected.series.plan.steps[selected.series.stepIndex]}\n项目计划：${JSON.stringify(selected.series.plan)}\n`
      }
      const contentHash = createHash('sha256').update(artifactContent).digest('hex')
      const evidence = selected.review?.evidence ?? (selected.proposal ? [{ cardId, kind: 'personal-proposal', id: selected.proposal.id, version: selected.proposal.sourceReplyHash }] : [{ cardId, kind: 'memory_facts', id: fact!.factId, version: String(fact!.version) }])
      signal?.throwIfAborted()
      if (options.foregroundActive())
        return { status: 'held' as const, reason: 'foreground-priority' }
      const series = selected.series
      // The last piece still belongs to the project until its actual file proof
      // succeeds. An interrupted write must retain the same root after restart.
      const pendingSeries = series?.rootThreadId ?? (typeof budget.pendingPersonalSeries === 'string' ? budget.pendingPersonalSeries : null)
      await options.upsertTask({ id: threadId, createOnly: true, goal: series ? `继续自己的创作：${series.plan.title}（${series.stepIndex + 1}/${series.plan.steps.length}）` : `${activity === 'visual-study-v1' ? '画一幅本地作品' : activity === 'creative-writing-v1' ? '写一段虚构作品' : activity === 'practice-review-v1' ? '回顾自己的实际练习' : '整理兴趣札记'}：${topic.slice(0, 120)}`, kind: 'codebase-edit', status: 'planned', selectedChannel: 'cli', proposedChannel: 'cli', origin: 'subconscious-proactive', turnId: threadId, metadata: { personalActivity: activity, personalTopic: (series?.plan.title ?? topic).slice(0, 160), personalOrigin: options.origin ?? 'self-initiated', sourceEvidence: evidence, ownership: 'application-owned-note', ...(series ? { personalSeries: { rootThreadId: series.rootThreadId, stepIndex: series.stepIndex, planHash: personalSeriesPlanHash(series.plan), ...(series.stepIndex === 0 ? { plan: series.plan } : {}) } } : {}) } })
      await options.commit({ cardId, operationKey: `project-bind:${identity}`, changes: [{ owner: 'initiative', key: 'life:initiative', value: JSON.stringify({ ...budget, personalProjectAt: now, ...(series ? { pendingPersonalSeries: pendingSeries, nextPersonalProjectAt: pendingSeries ? now + 6 * 60 * 60_000 : null } : {}) }), expectedValue: raw }], expectedOwners: view.owners.filter(owner => owner.owner === 'memory'), mutations: [{ type: 'personal-project-bind', threadId, proof: { kind: 'file', path: join(workspaceRoot, name), contentHash }, evidence }] }, { signal })
      const life = createLifeTurnRuntime({ read: options.read, commit: options.commit, getIngress: options.getIngress, getEffect: options.getEffect, now: options.now })
      const cli = { command: 'alicization:owned-note', ownedNote: { name, content: artifactContent, contentHash } }
      const effect = await life.beforeAction({ cardId, turnId: threadId, actionId: 'create-note', capabilityId: 'owned-note', parameters: cli }, signal ?? new AbortController().signal)
      if (!effect.cached) {
        try {
          const result = await options.dispatch({ threadId, cli, workspaceRoot, abortSignal: signal })
          await life.afterAction({ cardId, id: effect.id, outcome: result.thread.status, output: { summary: result.thread.summary }, interrupted: result.thread.status === 'cancelled' || signal?.aborted === true })
        }
        catch (error) {
          await life.afterAction({ cardId, id: effect.id, outcome: 'uncertain', output: { reason: 'dispatch-interrupted' }, interrupted: true })
          throw error
        }
      }
      const current = await options.read()
      const obligation = current.obligations.find(item => item.id === `task:${threadId}`)
      if (obligation?.status === 'fulfilled')
        await options.recordExperience(obligation)
      if (obligation?.status === 'fulfilled') {
        await closeCompletedSeries(cardId)
        return { status: 'completed' as const, threadId }
      }
      if (!obligation || obligation.invalidatedBy || ['cancelled', 'fulfilled', 'superseded'].includes(obligation.status))
        return { status: 'held' as const, reason: 'responsibility-changed' }
      const verification = await verifyLifeGoal({ obligation, readSetting: async () => undefined, now: options.now })
      await options.commit({ cardId, operationKey: `project-verify:${identity}:${verification.id}`, changes: [], mutations: [{ type: 'obligation-verify', id: obligation.id, expectedGeneration: obligation.generation, expectedRevision: obligation.revision, verification }] })
      if (verification.verdict === 'satisfied') {
        await options.recordExperience({ ...obligation, status: 'fulfilled', verification, receiptId: verification.id })
        await closeCompletedSeries(cardId)
      }
      return { status: verification.verdict === 'satisfied' ? 'completed' as const : 'blocked' as const, threadId }
    }
    finally {
      running = false
    }
  }
  async function recover(cardId: string) {
    const view = await options.read()
    if (view.cardId !== cardId)
      throw new Error('Personal project recovery crossed the card boundary')
    for (const goal of view.obligations.filter(item => item.kind === 'personal-project' && item.proof.kind === 'file' && !item.invalidatedBy).slice(0, 32)) {
      const proof = goal.proof
      if (proof.kind !== 'file')
        continue
      if (!['fulfilled', 'in-progress', 'verifying', 'accepted'].includes(goal.status))
        continue
      const verification = goal.status === 'fulfilled' ? goal.verification : await verifyLifeGoal({ obligation: goal, readSetting: async () => undefined, now: options.now })
      if (!verification)
        continue
      const mutations: LifeCommitInput['mutations'] = goal.status === 'fulfilled' ? [] : [{ type: 'obligation-verify', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, verification }]
      const uncertain = view.effects.filter(effect => effect.turnId === goal.threadId && effect.status === 'uncertain')
      const recoveryProof = goal.status === 'fulfilled' && uncertain.length ? await verifyLifeFileProof(proof, options.now) : verification
      if (recoveryProof.verdict === 'satisfied' && options.readTask && options.readExecutionEvents && goal.threadId) {
        const task = await options.readTask(goal.threadId)
        const events = await options.readExecutionEvents(goal.threadId)
        for (const effect of uncertain) {
          const result = await recoveredProjectAction(goal, effect, task, events, options.workspace(cardId))
          if (result)
            mutations.push({ type: 'effect-transition', id: effect.id, expected: 'uncertain', status: 'settled', receipt: { outcome: 'completed', recoveredBy: 'persisted-adapter-result-and-file-proof', executionEventId: result.id, attemptId: task!.attemptId, verification: recoveryProof } })
        }
      }
      if (mutations.length)
        await options.commit({ cardId, operationKey: `project-recovery:${goal.id}:${verification.id}`, changes: [], mutations })
      if (verification.verdict === 'satisfied')
        await options.recordExperience({ ...goal, status: 'fulfilled', verification, receiptId: verification.id })
    }
    await closeCompletedSeries(cardId)
  }
  return { run, recover }
}
