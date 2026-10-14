import type * as v from 'valibot'

import type { lifeDialogueClaimSchema } from './life-dialogue-claim'

type ReplyBinding = NonNullable<v.InferOutput<typeof lifeDialogueClaimSchema>['binding']>

/** A review-local reference resolves only to the exact supplied owner/version. */
export function createLifeReplyReviewBindings() {
  const aliases = new Map<string, ReplyBinding>()
  const canonicalKeys = new Map<string, ReplyBinding>()
  const key = (binding: ReplyBinding) => JSON.stringify(binding)
  function project<T extends { binding: ReplyBinding }>(record: T): T {
    const canonicalKey = key(record.binding)
    let alias = canonicalKeys.get(canonicalKey)
    if (!alias) {
      alias = { kind: record.binding.kind, id: `local-review-binding:${aliases.size + 1}`, version: '1' }
      canonicalKeys.set(canonicalKey, alias)
      aliases.set(key(alias), record.binding)
    }
    return { ...record, binding: alias }
  }
  function resolve(binding: ReplyBinding | null): ReplyBinding | null {
    if (!binding || !binding.id.startsWith('local-review-binding:'))
      return binding
    return aliases.get(key(binding)) ?? null
  }
  return { project, resolve, ids: () => [...canonicalKeys.values()].map(binding => binding.id), references: () => [...canonicalKeys.values()], evidence: () => [...aliases].map(([alias, canonical]) => ({ alias: JSON.parse(alias) as ReplyBinding, canonical })) }
}
