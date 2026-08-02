import type {
  AlicizationMindTurnContractSnapshot,
} from '../../../shared/eventa'

import { normalizeAlicizationNormalVisibleReplyAuthority } from '@proj-alicization/stage-shared'

/**
 * Provider-facing reply authority only.
 *
 * Dialogue planning, relationship posture, memory, and persona facts retain
 * their own owners and must not be repackaged as reply-writing instructions.
 */
export function buildAlicizationMindTurnContract(input: {
  expectedVisibleReplyAuthority?: AlicizationMindTurnContractSnapshot['expectedVisibleReplyAuthority']
  now?: number
}): AlicizationMindTurnContractSnapshot {
  return {
    version: 'mind-turn-contract-v1',
    expectedVisibleReplyAuthority: normalizeAlicizationNormalVisibleReplyAuthority(
      input.expectedVisibleReplyAuthority ?? null,
      'llm-mind',
    ),
    replyRealizationMode: 'provider-mind-required',
    updatedAt: Number.isFinite(input.now) ? Math.floor(Number(input.now)) : Date.now(),
  }
}
