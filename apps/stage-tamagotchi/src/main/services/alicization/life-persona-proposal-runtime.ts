import type { LifeCommitInput, LifeCommitReceipt, LifeStateView } from '../../../shared/life-contracts'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'

import { createHash } from 'node:crypto'

import { fingerprintLifePersonaSource } from './life-persona-evidence'

const hash = (text: string) => createHash('sha256').update(text).digest('hex')

// Dreaming proposes a revision. SOUL remains the single adopted identity until
// that exact proposal has passed evaluation and the activation saga commits.
export function createLifePersonaProposalRuntime(options: {
  read: () => Promise<LifeStateView>
  commit: (input: LifeCommitInput) => Promise<LifeCommitReceipt>
  listConsolidations: (limit: number, cardId: string) => Promise<AlicizationMemoryConsolidationRecord[]>
}) {
  async function stage(input: { cardId: string, turnId: string, baseContent: string, targetContent: string, sourceIds: string[] }) {
    if (input.targetContent.length > 200_000)
      throw new TypeError('Persona revision exceeds its proposal budget')
    const view = await options.read()
    if (view.cardId !== input.cardId)
      throw new Error('Persona proposal crossed the card boundary')
    const authority = view.owners.find(owner => owner.owner === 'soul')
    const active = view.values['life:soul-active'] ? JSON.parse(view.values['life:soul-active']) as { contentHash: string } : null
    if (!authority || active?.contentHash !== hash(input.baseContent))
      throw new Error('Persona changed before the dream proposal was staged')
    const selected = new Set(input.sourceIds.slice(0, 32))
    const sources = (await options.listConsolidations(128, input.cardId)).filter(source => selected.has(source.id)).map(source => ({ id: source.id, summaryHash: fingerprintLifePersonaSource(source), provenance: source.dominantProvenance, confidence: source.confidence }))
    const targetHash = hash(input.targetContent)
    const id = `persona-proposal:${hash(JSON.stringify({ cardId: input.cardId, turnId: input.turnId, targetHash }))}`
    return options.commit({ cardId: input.cardId, operationKey: id, expectedOwners: [authority], changes: [], mutations: [{ type: 'effect-prepare', effect: { id, operationKey: id, kind: 'reflect', turnId: input.turnId, actionId: null, generation: 1, payload: { format: 'persona-revision-proposal-v1', baseHash: active.contentHash, targetHash, targetContent: input.targetContent, sources, evaluationStatus: sources.length ? 'requires-candidate-evaluation' : 'requires-clean-source', adopted: false } } }] })
  }
  return { stage }
}
