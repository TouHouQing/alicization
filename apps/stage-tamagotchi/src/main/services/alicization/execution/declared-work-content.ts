import { executionDigest } from './acceptance-compiler'
import { declaredWorkProposal, matchesDeclaredWorkProposal } from './declared-work-proposal'
import { createWorkPlanToolSpec, normalizeWorkProposal } from './work-plan-tool'
import { inspectWorkProposalCoherence, workProposalRepairFence } from './work-proposal-coherence'

const schema = createWorkPlanToolSpec(async () => null).parameters

/**
 * Restore only literal bytes already supplied by the current user. This is
 * transcription, never a new plan, permission, execution or completion proof.
 */
export function restoreDeclaredWorkContent(input: Record<string, unknown>, sourceText: string) {
  const declared = declaredWorkProposal(sourceText)
  const candidate = schema.safeParse(input)
  if (!declared || !candidate.success || matchesDeclaredWorkProposal(candidate.data, declared)
    || inspectWorkProposalCoherence(declared.proposal).length
    || workProposalRepairFence(candidate.data) !== workProposalRepairFence(declared.proposal)) {
    return { input, projection: null }
  }

  const resolved = normalizeWorkProposal(candidate.data)
  const fields: string[] = []
  for (const [index, step] of resolved.steps.entries()) {
    const original = declared.proposal.steps[index]
    if (!original || step.capabilityId !== 'tool.filesystem_write_file' || step.input.content === original.input.content)
      continue
    if (typeof step.input.content !== 'string' || typeof original.input.content !== 'string'
      || step.inputBindings?.some(binding => binding.parameter === 'content')) {
      return { input, projection: null }
    }
    step.input.content = original.input.content
    fields.push(`steps.${index}.input.content`)
  }
  if (!fields.length || !matchesDeclaredWorkProposal(resolved, declared))
    return { input, projection: null }
  return {
    input: resolved as unknown as Record<string, unknown>,
    projection: {
      version: 'declared-work-literal-content-v1',
      sourceHash: declared.hash,
      proposedHash: executionDigest(input),
      resolvedHash: executionDigest(resolved),
      fields,
      actionAdmitted: false,
    },
  }
}
