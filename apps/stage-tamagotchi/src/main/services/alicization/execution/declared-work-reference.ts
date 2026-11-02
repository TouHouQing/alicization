import { z } from 'zod'

export interface DeclaredWorkReference { sourceInputId: string, proposalHash: string }

/** A reference selects immutable request data; it grants no action authority. */
export function isDeclaredWorkReference(input: Record<string, unknown>): input is Record<string, unknown> & DeclaredWorkReference {
  return Object.keys(input).length === 2 && typeof input.sourceInputId === 'string' && input.sourceInputId.startsWith('user:') && input.sourceInputId.length <= 1024 && typeof input.proposalHash === 'string' && /^[a-f\d]{64}$/u.test(input.proposalHash)
}

export function createDeclaredWorkReferenceToolSpec(reference: DeclaredWorkReference, execute: (input: DeclaredWorkReference, options?: { abortSignal?: AbortSignal }) => Promise<unknown>) {
  return {
    name: 'life_execute_work_plan',
    description: 'Admit the complete explicit work plan already supplied in the current user request. Copy the exact sourceInputId and proposalHash offered by this schema; do not regenerate its goal, criteria, content, paths or steps. The desktop rereads and validates the original persisted request before admission. Every subsequent operation still uses normal permissions, cancellation and independent verification. Acceptance is not task completion. For discussion or review without a request to act, answer normally and do not call this tool.',
    parameters: z.object({ sourceInputId: z.literal(reference.sourceInputId), proposalHash: z.literal(reference.proposalHash) }).strict(),
    execute,
  }
}
