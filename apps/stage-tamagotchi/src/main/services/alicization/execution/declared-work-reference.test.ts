import { expect, it } from 'vitest'

import { createDeclaredWorkReferenceToolSpec, isDeclaredWorkReference } from './declared-work-reference'

it('accepts only the exact source and hash offered for the current request', () => {
  const reference = { sourceInputId: 'user:current-request', proposalHash: 'a'.repeat(64) }
  const spec = createDeclaredWorkReferenceToolSpec(reference, async () => null)
  expect(spec.parameters.parse(reference)).toEqual(reference)
  expect(spec.parameters.safeParse({ ...reference, sourceInputId: 'user:historical' }).success).toBe(false)
  expect(spec.parameters.safeParse({ ...reference, proposalHash: 'b'.repeat(64) }).success).toBe(false)
  expect(spec.parameters.safeParse({ ...reference, bypass: true }).success).toBe(false)
  expect(isDeclaredWorkReference(reference)).toBe(true)
  expect(isDeclaredWorkReference({ ...reference, steps: [] })).toBe(false)
  expect(isDeclaredWorkReference({ sourceInputId: 'tool:foreign', proposalHash: reference.proposalHash })).toBe(false)
})
