import type { AlicizationTaskThreadRecord } from '../../../shared/eventa'
import type { LifeFactVersion, LifeStateView } from '../../../shared/life-contracts'

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import * as v from 'valibot'

const planSchema = v.strictObject({ title: v.pipe(v.string(), v.minLength(1), v.maxLength(120)), steps: v.pipe(v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(160))), v.minLength(2), v.maxLength(4)) })
export type LifePersonalSeriesPlan = v.InferOutput<typeof planSchema>
export interface LifePersonalSeriesSlot {
  rootThreadId: string
  stepIndex: number
  plan: LifePersonalSeriesPlan
  previousPieces: string[]
}

export const lifePersonalSeriesResponseFormat = { type: 'json_schema' as const, json_schema: { name: 'personal_series_plan', strict: true, schema: { type: 'object', additionalProperties: false, required: ['title', 'steps'], properties: { title: { type: 'string', minLength: 1, maxLength: 120 }, steps: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string', minLength: 1, maxLength: 160 } } } } } }

export function parseLifePersonalSeriesPlan(raw: unknown): LifePersonalSeriesPlan | null {
  const result = v.safeParse(planSchema, raw)
  return result.success ? result.output : null
}

export function personalSeriesPlanHash(plan: LifePersonalSeriesPlan) {
  return createHash('sha256').update(JSON.stringify(plan)).digest('hex')
}

export function personalSeriesStepIdentity(rootThreadId: string, stepIndex: number) {
  return stepIndex === 0 ? rootThreadId.slice('personal:'.length) : createHash('sha256').update(JSON.stringify({ rootThreadId, stepIndex })).digest('hex')
}

/** The root TaskThread owns its bounded plan; progress is derived from proofs. */
export async function readPersonalSeriesContinuation(input: {
  rootThreadId: string
  view: LifeStateView
  facts: LifeFactVersion[]
  readTask: (id: string) => Promise<AlicizationTaskThreadRecord | null | undefined>
  workspaceRoot: string
}): Promise<{ status: 'ready', fact: LifeFactVersion, slot: LifePersonalSeriesSlot } | { status: 'held', reason: string } | { status: 'closed', reason: string }> {
  if (!/^personal:[a-f0-9]{64}$/u.test(input.rootThreadId))
    return { status: 'closed', reason: 'invalid-project-identity' }
  const rootGoal = input.view.obligations.find(goal => goal.threadId === input.rootThreadId)
  if (!rootGoal || rootGoal.invalidatedBy)
    return { status: 'closed', reason: 'project-source-withdrawn' }
  if (['cancelled', 'superseded'].includes(rootGoal.status))
    return { status: 'closed', reason: 'project-was-cancelled' }
  const root = await input.readTask(input.rootThreadId)
  const metadata = root?.metadata?.personalSeries as { rootThreadId?: unknown, stepIndex?: unknown, plan?: unknown, planHash?: unknown } | undefined
  const plan = parseLifePersonalSeriesPlan(metadata?.plan)
  if (!plan || metadata?.rootThreadId !== input.rootThreadId || metadata.stepIndex !== 0 || metadata.planHash !== personalSeriesPlanHash(plan))
    return { status: 'closed', reason: 'project-plan-changed' }
  const evidence = root?.metadata?.sourceEvidence as Array<{ id: string, version: string }> | undefined
  const fact = input.facts.find(item => evidence?.some(source => source.id === item.factId && source.version === String(item.version)))
  if (!fact)
    return { status: 'closed', reason: 'project-source-withdrawn' }
  const previousPieces: string[] = []
  for (let index = 0; index < plan.steps.length; index++) {
    const identity = personalSeriesStepIdentity(input.rootThreadId, index)
    const goal = input.view.obligations.find(item => item.threadId === `personal:${identity}`)
    if (!goal)
      return { status: 'ready', fact, slot: { rootThreadId: input.rootThreadId, stepIndex: index, plan, previousPieces } }
    const piece = index === 0 ? root : await input.readTask(`personal:${identity}`)
    const piecePlan = piece?.metadata?.personalSeries as typeof metadata
    if (goal.kind !== 'personal-project' || goal.personalActivity !== 'creative-writing-v1' || piecePlan?.rootThreadId !== input.rootThreadId || piecePlan.stepIndex !== index || piecePlan.planHash !== metadata.planHash)
      return { status: 'held', reason: 'project-piece-association-changed' }
    if (goal.invalidatedBy || ['cancelled', 'superseded'].includes(goal.status))
      return { status: 'closed', reason: 'project-was-cancelled' }
    if (goal.status !== 'fulfilled' || goal.verification?.verdict !== 'satisfied' || !goal.verification.independent)
      return { status: 'held', reason: 'project-awaiting-verification' }
    if (!input.view.effects.some(effect => effect.turnId === goal.threadId && effect.status === 'settled' && effect.payload.capabilityId === 'owned-note' && effect.receipt?.outcome === 'completed'))
      return { status: 'held', reason: 'project-awaiting-authorship' }
    const artifactPath = join(input.workspaceRoot, `${identity}.md`)
    if (goal.proof.kind !== 'file' || goal.proof.path !== artifactPath)
      return { status: 'held', reason: 'project-artifact-outside-owned-workspace' }
    const bytes = await readFile(artifactPath).catch(() => null)
    if (!bytes || bytes.length > 24_000 || createHash('sha256').update(bytes).digest('hex') !== goal.proof.contentHash)
      return { status: 'held', reason: 'project-artifact-changed' }
    if (index === 0 && !bytes.toString('utf8').includes(`项目计划：${JSON.stringify(plan)}\n`))
      return { status: 'closed', reason: 'project-plan-changed' }
    previousPieces.push(bytes.toString('utf8'))
  }
  return { status: 'closed', reason: 'project-completed' }
}
