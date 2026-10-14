import type { LifeCommitInput, LifeCommitReceipt, LifeEffect, LifeEntity, LifeMutation, LifeSoulActivation, LifeStateView } from '../../../shared/life-contracts'

import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'

const activeKey = 'life:soul-active'
const hash = (content: string) => createHash('sha256').update(content).digest('hex')

export function createLifeSoulActivationRuntime(options: {
  cardId: string
  rootDir: string
  soulPath: string
  validate: (content: string) => unknown
  writeAtomic: (path: string, content: string) => Promise<void>
  read: () => Promise<LifeStateView>
  commit: (input: LifeCommitInput) => Promise<LifeCommitReceipt>
  getEffect?: (id: string) => Promise<LifeEffect | null>
  entities?: (content: string, hash: string, revision: number) => LifeEntity[]
}) {
  async function fileContent() {
    try { return await readFile(options.soulPath, 'utf8') }
    catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
        return ''
      throw error
    }
  }

  function stagedPath(relative: string) {
    const root = resolve(options.rootDir)
    const path = resolve(root, relative)
    if (!relative.startsWith('.life/soul/') || !path.startsWith(`${root}${sep}`))
      throw new Error('SOUL staging reference escaped the active card')
    return path
  }

  async function activate(content: string, intent?: LifeSoulActivation) {
    options.validate(content)
    const contentHash = hash(content)
    if (hash(await fileContent()) !== contentHash)
      throw new Error('SOUL file changed before activation')
    const view = await options.read()
    if (view.cardId !== options.cardId)
      throw new Error('SOUL activation crossed the card boundary')
    const previous = view.values[activeKey] ?? null
    const active = previous ? JSON.parse(previous) as { contentHash: string, soulRevision: number } : null
    if (!intent && active?.contentHash === contentHash)
      return active.soulRevision
    const soulRevision = active?.contentHash === contentHash ? active.soulRevision : (active?.soulRevision ?? 0) + 1
    const persona = intent?.personaAuthorization ? { ...intent.personaAuthorization, backupPath: intent.backupPath, baseHash: intent.baseHash } : undefined
    const mutations: LifeMutation[] = []
    if (intent) {
      if (intent.status === 'prepared')
        mutations.push({ type: 'soul-transition', id: intent.id, expected: 'prepared', status: 'file-replaced' })
      mutations.push({ type: 'soul-transition', id: intent.id, expected: 'file-replaced', status: 'activated' })
    }
    for (const entity of options.entities?.(content, contentHash, soulRevision) ?? [])
      mutations.push({ type: 'entity-register', entity })
    await options.commit({ cardId: options.cardId, operationKey: intent ? `soul-activate:${intent.id}` : `soul-external:${randomUUID()}`, source: intent ? 'soul-activation' : 'soul-file-observed', changes: [{ owner: 'soul', key: activeKey, value: JSON.stringify({ contentHash, soulRevision, ...(persona ? { persona } : {}) }), expectedValue: previous }], mutations })

    return soulRevision
  }

  async function write(content: string, expectedBaseHash?: string, personaAuthorization?: LifeSoulActivation['personaAuthorization']) {
    options.validate(content)
    if (content.length > 2_000_000)
      throw new TypeError('SOUL content exceeds its storage budget')
    const before = await fileContent()
    if (expectedBaseHash && hash(before) !== expectedBaseHash)
      throw new Error('SOUL changed since the mutation was prepared')
    if (before === content)
      return activate(content)
    const view = await options.read()
    const active = view.values[activeKey] ? JSON.parse(view.values[activeKey]) as { soulRevision: number } : null
    const id = randomUUID()
    const intent: LifeSoulActivation = { id, baseHash: hash(before), targetHash: hash(content), stagedPath: `.life/soul/${id}.new`, backupPath: `.life/soul/${id}.previous`, status: 'prepared', soulRevision: (active?.soulRevision ?? 0) + 1, ...(personaAuthorization ? { personaAuthorization } : {}) }
    await mkdir(join(options.rootDir, '.life', 'soul'), { recursive: true })
    await options.writeAtomic(stagedPath(intent.stagedPath), content)
    await options.writeAtomic(stagedPath(intent.backupPath), before)
    await options.commit({ cardId: options.cardId, operationKey: `soul-prepare:${id}`, changes: [], mutations: [{ type: 'soul-prepare', intent }] })
    if (hash(await fileContent()) !== intent.baseHash) {
      await options.commit({ cardId: options.cardId, operationKey: `soul-conflict:${id}`, changes: [], mutations: [{ type: 'soul-transition', id, expected: 'prepared', status: 'conflicted' }] })
      throw new Error('SOUL was edited manually while the replacement was being prepared')
    }
    await options.writeAtomic(options.soulPath, content)
    try { return await activate(content, intent) }
    catch (error) {
      // A candidate can lose its sources during the file write. Restore only
      // our exact replacement; a concurrent human edit is never overwritten.
      if (personaAuthorization && hash(await fileContent()) === intent.targetHash)
        await options.writeAtomic(options.soulPath, before)
      throw error
    }
  }

  async function recover() {
    const view = await options.read()
    let changed = false
    const active = JSON.parse(view.values[activeKey] ?? 'null') as { contentHash: string, persona?: { proposalId: string } } | null
    if (active?.persona && options.getEffect) {
      const proposal = await options.getEffect(active.persona.proposalId)
      if (!proposal || proposal.status === 'cancelled') {
        const current = await fileContent()
        if (hash(current) === active.contentHash)
          await rollbackPersona(active.persona.proposalId)
        else
          await activate(current)
        changed = true
      }
    }
    for (const intent of view.soulActivations.filter(item => ['prepared', 'file-replaced'].includes(item.status))) {
      const content = await fileContent()
      if (intent.personaAuthorization && options.getEffect) {
        const proposal = await options.getEffect(intent.personaAuthorization.proposalId)
        if (!proposal || proposal.status === 'cancelled') {
          if (hash(content) === intent.targetHash) {
            const backup = await readFile(stagedPath(intent.backupPath), 'utf8')
            if (hash(backup) !== intent.baseHash)
              throw new Error('Withdrawn persona recovery backup failed integrity verification')
            await options.writeAtomic(options.soulPath, backup)
            changed = true
          }
          await options.commit({ cardId: options.cardId, operationKey: `soul-source-withdrawn:${intent.id}`, changes: [], mutations: [{ type: 'soul-transition', id: intent.id, expected: intent.status, status: 'conflicted' }] })
          continue
        }
      }
      if (hash(content) === intent.targetHash) {
        await activate(content, intent)
        continue
      }
      if (hash(content) !== intent.baseHash) {
        await options.commit({ cardId: options.cardId, operationKey: `soul-recover-conflict:${intent.id}`, changes: [], mutations: [{ type: 'soul-transition', id: intent.id, expected: intent.status, status: 'conflicted' }] })
        continue
      }
      const staged = await readFile(stagedPath(intent.stagedPath), 'utf8')
      if (hash(staged) !== intent.targetHash)
        throw new Error('SOUL staged content failed its recovery hash check')
      options.validate(staged)
      await options.writeAtomic(options.soulPath, staged)
      await activate(staged, intent)
    }
    return changed
  }
  async function rollbackPersona(proposalId: string) {
    const view = await options.read()
    const active = JSON.parse(view.values[activeKey] ?? 'null') as { contentHash: string, persona?: { proposalId: string, backupPath: string, baseHash: string } } | null
    if (active?.persona?.proposalId !== proposalId || hash(await fileContent()) !== active.contentHash)
      throw new Error('Persona changed; its previous revision cannot overwrite the current identity')
    const previous = await readFile(stagedPath(active.persona.backupPath), 'utf8')
    if (hash(previous) !== active.persona.baseHash)
      throw new Error('Persona rollback backup failed its integrity check')
    return write(previous, active.contentHash)
  }
  return { write, activate, recover, rollbackPersona }
}
