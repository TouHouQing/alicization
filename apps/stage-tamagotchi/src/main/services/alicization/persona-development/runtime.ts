import type { LifeCommitInput, LifeCommitReceipt, LifeEvidenceRef, LifeSoulActivation, LifeStateView } from '../../../../shared/life-contracts'
import type { PersonaDevelopmentCommand, PersonaEvidenceObservation, PersonaFacetDraft } from '../../../../shared/persona-development-contracts'

import { randomUUID } from 'node:crypto'

import * as v from 'valibot'

import { personaDevelopmentKey, personaDigest, personaObservationSchema, readPersonaDevelopment } from './schema'
import { canonicalPersonaFacets, compilePersonaSoul, personaSoulCore, readPersonaSoul } from './soul'

export interface PersonaExtractionSource { ref: LifeEvidenceRef, text: string, context: string, selfChosen: boolean, positive: boolean, rejected?: boolean, learningAllowed?: boolean }
export function createPersonaDevelopmentRuntime(options: {
  read: () => Promise<LifeStateView>
  commit: (input: LifeCommitInput, options?: { signal?: AbortSignal }) => Promise<LifeCommitReceipt>
  sources: () => Promise<PersonaExtractionSource[]>
  extract: (source: PersonaExtractionSource, existing: PersonaFacetDraft[], signal: AbortSignal) => Promise<PersonaEvidenceObservation[]>
  readSoul: () => Promise<string>
  activate: (content: string, baseHash: string, authorization: NonNullable<LifeSoulActivation['developmentAuthorization']>) => Promise<unknown>
  foregroundActive: () => boolean
  now: () => number
}) {
  let running = false
  let retryAt = 0
  async function command(input: PersonaDevelopmentCommand) {
    const view = await options.read()
    const owner = view.owners.find(owner => owner.owner === 'persona-development')
    if (view.cardId !== input.cardId || (owner?.contentHash ?? null) !== input.expectedHash)
      throw new Error('Personality development changed; reload before editing')
    const { cardId: _cardId, operationId: _operationId, expectedHash: _expectedHash, ...operation } = input
    await options.commit({ cardId: view.cardId, operationKey: `persona-command:${input.operationId}`, expectedOwners: owner ? [owner] : [], expectedAbsentOwners: owner ? [] : ['persona-development'], changes: [], mutations: [{ type: 'persona-development', operation }] })
    if (input.action === 'withdraw' || input.action === 'correct' || input.action === 'reconsider')
      await reconcileSoul(new AbortController().signal, true)
    return { status: input.action }
  }
  async function reconcileSoul(signal: AbortSignal, explicitReview = false) {
    const view = await options.read()
    const state = readPersonaDevelopment(view.values)
    const base = await options.readSoul()
    const baseHash = personaDigest(base)
    const soul = view.values['life:soul-active'] ? JSON.parse(view.values['life:soul-active']) : null
    if (!soul || soul.contentHash !== baseHash)
      throw new Error('Adopted SOUL changed before personality development')
    const facets = canonicalPersonaFacets(state.facets.filter(facet => facet.status === 'mature' && (!state.paused || facet.adoptedSoulHash === baseHash)))
    if (facets.length > 32)
      throw new Error('Mature personality exceeds the adopted budget')
    const adopted = readPersonaSoul(base)
    if ((!facets.length && !adopted.length) || (personaDigest(facets.map(facet => [facet.id, facet.version])) === personaDigest(adopted.map(facet => [facet.id, facet.version])) && state.facets.filter(facet => facet.status === 'mature').every(facet => facet.adoptedSoulHash === baseHash)))
      return
    const content = compilePersonaSoul(base, facets)
    if (personaSoulCore(base) !== personaSoulCore(content))
      throw new Error('Personality growth attempted to change the stable core')
    const facetHash = personaDigest(facets)
    const id = `development:${randomUUID()}`
    signal.throwIfAborted()
    if (!explicitReview && options.foregroundActive())
      return
    await options.commit({ cardId: view.cardId, operationKey: id, expectedOwners: view.owners.filter(owner => ['soul', 'persona-development'].includes(owner.owner)), changes: [], mutations: [{ type: 'persona-development', operation: { action: 'prepare-adoption', id, baseHash, targetHash: personaDigest(content), facetHash, facets } }] }, { signal })
    await options.activate(content, baseHash, { developmentId: id, facetHash })
  }
  async function run(cardId: string, signal = new AbortController().signal) {
    if (running || signal.aborted || options.foregroundActive() || options.now() < retryAt)
      return { status: 'held' }
    running = true
    try {
      let view = await options.read()
      if (view.cardId !== cardId)
        throw new Error('Personality background work crossed the character boundary')
      if (readPersonaDevelopment(view.values).paused) {
        await reconcileSoul(signal)
        return { status: 'paused' }
      }
      await options.commit({ cardId, operationKey: `persona-reconcile:${randomUUID()}`, changes: [], mutations: [{ type: 'persona-development', operation: { action: 'reconcile' } }] }, { signal })
      const sources = (await options.sources()).slice(0, 48)
      let processed = 0
      let skipped = 0
      for (const source of sources) {
        signal.throwIfAborted()
        if (options.foregroundActive())
          break
        view = await options.read()
        const state = readPersonaDevelopment(view.values)
        if (state.paused)
          break
        if (state.processedSources.some(ref => personaDigest(ref) === personaDigest(source.ref)))
          continue
        if (source.rejected) {
          await options.commit({ cardId, operationKey: `persona-skip:${randomUUID()}`, expectedOwners: view.owners.filter(owner => owner.owner === 'persona-development'), changes: [], mutations: [{ type: 'persona-development', operation: { action: 'skip-source', source: source.ref } }] }, { signal })
          if (++skipped >= 8)
            break
          continue
        }
        const observations = source.learningAllowed === false ? [] : (await options.extract(source, state.facets.filter(facet => facet.status !== 'withdrawn'), signal)).map(value => v.parse(personaObservationSchema, value))
        if (observations.length > 2 || observations.some(item => personaDigest(item.source) !== personaDigest(source.ref)))
          throw new Error('Personality extraction invented source evidence')
        signal.throwIfAborted()
        if (options.foregroundActive())
          break
        await options.commit({ cardId, operationKey: `persona-extract:${randomUUID()}`, expectedOwners: view.owners.filter(owner => owner.owner === 'persona-development'), expectedAbsentOwners: view.owners.some(owner => owner.owner === 'persona-development') ? [] : ['persona-development'], changes: [], mutations: [{ type: 'persona-development', operation: { action: 'observe', observations, extracted: source.ref } }] }, { signal })
        if (++processed >= 2)
          break
      }
      await reconcileSoul(signal)
      return { status: 'processed', processed, skipped }
    }
    catch (error) {
      retryAt = options.now() + 60_000
      throw error
    }
    finally { running = false }
  }
  return { command, run, reconcileSoul, key: personaDevelopmentKey }
}
