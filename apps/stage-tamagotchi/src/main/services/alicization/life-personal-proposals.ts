import type { LifeCommitInput, LifeCommitReceipt, LifeStateView } from '../../../shared/life-contracts'

import { createHash } from 'node:crypto'

import { parseLifePersonalIntent } from './life-personal-intent'

export interface LifePersonalProposal {
  id: string
  topic: string
  activity: 'creative-writing-v1' | 'visual-study-v1'
  sourceTurnId: string
  sourceReplyHash: string
  createdAt: number
  expiresAt: number
  status: 'proposed' | 'withdrawn'
}

const key = 'life:initiative'
export function readLifePersonalProposals(view: LifeStateView): LifePersonalProposal[] {
  return view.values[key] ? JSON.parse(view.values[key]).personalProposals ?? [] : []
}

export function pendingLifePersonalProposal(view: LifeStateView, now: number) {
  return readLifePersonalProposals(view).find(item => item.status === 'proposed' && item.createdAt <= now && item.expiresAt > now && !view.obligations.some(goal => goal.threadId === `personal:${createHash('sha256').update(item.id).digest('hex')}`)) ?? null
}

export async function withdrawLifePersonalProposal(options: { read: () => Promise<LifeStateView>, commit: (input: LifeCommitInput) => Promise<LifeCommitReceipt> }, input: { cardId: string, proposalId: string, expectedReplyHash: string }) {
  const view = await options.read()
  if (view.cardId !== input.cardId)
    throw new Error('Proposal withdrawal crossed the card boundary')
  const proposals = readLifePersonalProposals(view)
  const proposal = proposals.find(item => item.id === input.proposalId && item.sourceReplyHash === input.expectedReplyHash)
  if (!proposal || proposal.status !== 'proposed')
    throw new Error('Proposal is absent, changed or already withdrawn')
  const budget = view.values[key] ? JSON.parse(view.values[key]) : {}
  await options.commit({ cardId: input.cardId, operationKey: `withdraw:${proposal.id}:${proposal.sourceReplyHash}`, changes: [{ owner: 'initiative', key, expectedValue: view.values[key] ?? null, value: JSON.stringify({ ...budget, personalProposals: proposals.map(item => item.id === proposal.id ? { ...item, status: 'withdrawn', topic: '' } : item) }) }], mutations: [{ type: 'evidence-invalidate', source: { cardId: input.cardId, kind: 'personal-proposal', id: proposal.id, version: proposal.sourceReplyHash }, mode: 'forget', reason: 'personal-choice-withdrawn' }] })
}

/** A present, bounded creative choice is a proposal, never a permanent preference. */
export function presentCreativeChoice(text: string, creativeOpportunity = false): string | null {
  const sentence = text.trim().split(/[。！？\n.!?]/u).find(part => /^(?:(?:此刻|现在)?我(?:现在|有点|倒是|更)?想(?:先|试着|尝试)?写|I'd like to write|I want to write)/iu.test(part.trim()) || creativeOpportunity && /^(?:此刻|现在)?我(?:自己)?想(?:试试|尝试|试着)/u.test(part.trim()))
  if (!sentence || /你让我|你说|如果|以后|明天|下次|保证|答应|提醒|文件|代码|命令|邮件|脚本|password|command|script|email/iu.test(sentence))
    return null
  const topic = sentence.trim().replace(/^(?:(?:此刻|现在)?我(?:现在|有点|倒是|更)?想(?:先|试着|尝试)?写|I'd like to write|I want to write)\s*/iu, '').trim()
  return topic.length >= 3 && topic.length <= 160 && (creativeOpportunity || /故事|短篇|诗|童话|散文|story|poem|fiction/iu.test(topic)) ? topic : null
}

export async function recordLifePersonalChoice(options: {
  read: () => Promise<LifeStateView>
  commit: (input: LifeCommitInput) => Promise<LifeCommitReceipt>
  now: () => number
}, input: { cardId: string, turnId: string, text: string, creativeOpportunity?: boolean, personalIntent?: unknown }) {
  const view = await options.read()
  if (view.cardId !== input.cardId)
    throw new Error('Personal choice crossed the card boundary')
  const source = view.ingress.find(item => item.id === `dialogue-settlement:user:${input.turnId}` && item.status === 'settled')
  if (!source)
    return
  const writing = presentCreativeChoice(input.text, input.creativeOpportunity)
  const intention = parseLifePersonalIntent(input.personalIntent)
  const visual = input.text.trim().split(/[。！？\n]/u).find(part => /^(?:此刻|现在)?我(?:现在|自己)?想(?:试着|先)?画/u.test(part.trim()) && !/你让我|如果|以后|明天|下次|保证|答应/u.test(part))
  const topic = intention?.topic ?? writing ?? (visual && visual.length <= 160 ? visual : null)
  if (!topic)
    return
  const proposals = readLifePersonalProposals(view)
  const sourceReplyHash = createHash('sha256').update(input.text).digest('hex')
  const id = `proposal:${createHash('sha256').update(JSON.stringify({ cardId: input.cardId, turnId: input.turnId, sourceReplyHash })).digest('hex')}`
  if (proposals.some(item => item.id === id || item.status === 'proposed' && item.topic === topic && item.expiresAt > options.now()))
    return
  const proposal: LifePersonalProposal = { id, topic, activity: intention?.activity ?? (writing ? 'creative-writing-v1' : 'visual-study-v1'), sourceTurnId: input.turnId, sourceReplyHash, createdAt: options.now(), expiresAt: options.now() + 7 * 86400_000, status: 'proposed' }
  const budget = view.values[key] ? JSON.parse(view.values[key]) : {}
  await options.commit({ cardId: input.cardId, operationKey: id, changes: [{ owner: 'initiative', key, expectedValue: view.values[key] ?? null, value: JSON.stringify({ ...budget, personalProposals: [...proposals, proposal].slice(-16) }) }], mutations: [] })
}
