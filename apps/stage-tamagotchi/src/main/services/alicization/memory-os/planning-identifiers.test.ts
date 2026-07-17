import { describe, expect, it } from 'vitest'

import {
  buildUniqueMemoryPlanningOwnerIdIndex,
  normalizeMemoryPlanningId,
  resolveMemoryPlanningOwnerIds,
} from './planning-identifiers'

describe('memory planning identifiers', () => {
  it('rejects an exact duplicate id owned by two items of the same kind', () => {
    const ownerIdIndex = buildUniqueMemoryPlanningOwnerIdIndex([
      { id: 'episode-1', owner: 'first' },
      { id: 'episode-1', owner: 'second' },
    ], item => item.id)

    expect(ownerIdIndex.has('episode-1')).toBe(false)
    expect(resolveMemoryPlanningOwnerIds(['episode-1'], ownerIdIndex)).toEqual([])
  })

  it('rejects an exact duplicate id across owner kinds for a combined target index', () => {
    const targetIdIndex = buildUniqueMemoryPlanningOwnerIdIndex([
      { id: 'shared-1', kind: 'consolidation' },
      { id: 'shared-1', kind: 'conversation-turn' },
    ], item => item.id)

    expect(resolveMemoryPlanningOwnerIds(['shared-1'], targetIdIndex)).toEqual([])
  })

  it.each([
    {
      label: 'whitespace normalization',
      firstId: 'memory   owner',
      secondId: ' memory owner ',
    },
    {
      label: 'length truncation',
      firstId: `${'m'.repeat(120)}-first`,
      secondId: `${'m'.repeat(120)}-second`,
    },
  ])('rejects ids that collide after $label', ({ firstId, secondId }) => {
    const normalizedId = normalizeMemoryPlanningId(firstId)
    const ownerIdIndex = buildUniqueMemoryPlanningOwnerIdIndex([
      { id: firstId },
      { id: secondId },
    ], item => item.id)

    expect(normalizeMemoryPlanningId(secondId)).toBe(normalizedId)
    expect(ownerIdIndex.has(normalizedId)).toBe(false)
    expect(resolveMemoryPlanningOwnerIds([normalizedId], ownerIdIndex)).toEqual([])
  })

  it('rejects blank owner ids while preserving an unrelated unique owner', () => {
    const ownerIdIndex = buildUniqueMemoryPlanningOwnerIdIndex([
      { id: '' },
      { id: '   ' },
      { id: '\n\t' },
      { id: 'valid-owner' },
    ], item => item.id)

    expect([...ownerIdIndex.entries()]).toEqual([['valid-owner', 'valid-owner']])
    expect(resolveMemoryPlanningOwnerIds(['', '   ', '\n\t'], ownerIdIndex)).toEqual([])
  })
})
