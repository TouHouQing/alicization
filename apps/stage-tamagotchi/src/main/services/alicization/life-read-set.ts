import type { LifeOwner, LifeOwnerVersion } from '../../../shared/life-contracts'

// Absence is part of a read set: creating the first goal or memory authority
// during generation must invalidate a reply that was prepared without it.
export const lifeDialogueReadOwners: LifeOwner[] = ['soul', 'memory', 'growth', 'self', 'habit', 'relationship', 'goals', 'emotion', 'reflection', 'motivation', 'cognition']

export function createLifeDialogueReadSet(adopted: LifeOwnerVersion[]) {
  return {
    expectedOwners: adopted.filter(owner => lifeDialogueReadOwners.includes(owner.owner)),
    expectedAbsentOwners: lifeDialogueReadOwners.filter(owner => !adopted.some(item => item.owner === owner)),
  }
}
