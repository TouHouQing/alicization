import type {
  AlicizationReplyRealizationMode,
  AlicizationVisibleReplyExecutionMode,
} from '../../../../shared/eventa'
import type {
  AlicizationMainChatReplyAuthoritySurface,
  AlicizationMainChatReplyExecutionPlanSurface,
} from './runtime-surface-authority'

import { describe, expect, it } from 'vitest'

import { createAlicizationVisibleReplyExecution } from './realization-engine'

const providerMindRequired: AlicizationReplyRealizationMode = 'provider-mind-required'
const providerStream: AlicizationMainChatReplyExecutionPlanSurface['preferredMode'] = 'provider-stream'
const providerOneShot: AlicizationMainChatReplyExecutionPlanSurface['preferredMode'] = 'provider-one-shot'
const transparentFailureMode: AlicizationVisibleReplyExecutionMode = 'local-fallback'

// @ts-expect-error Normal dialogue realization always requires the Provider mind.
const retiredSharedReplyMode: AlicizationReplyRealizationMode = 'fallback-locally-allowed'
// @ts-expect-error Runtime reply authority cannot authorize a locally authored normal reply.
const retiredAuthorityReplyMode: AlicizationMainChatReplyAuthoritySurface['replyRealizationMode'] = 'fallback-locally-allowed'
// @ts-expect-error local-fallback is an execution result for transparent failures, not a normal dialogue plan.
const retiredPlannedExecutionMode: AlicizationMainChatReplyExecutionPlanSurface['preferredMode'] = 'local-fallback'
const retiredCompileTimeFixtures = [
  retiredSharedReplyMode,
  retiredAuthorityReplyMode,
  retiredPlannedExecutionMode,
]

describe('normal visible reply plan types', () => {
  it('only exposes Provider-backed modes for normal dialogue planning', () => {
    expect(retiredCompileTimeFixtures).toHaveLength(3)
    expect([
      providerMindRequired,
      providerStream,
      providerOneShot,
    ]).toEqual([
      'provider-mind-required',
      'provider-stream',
      'provider-one-shot',
    ])
  })

  it('keeps local fallback as an explicit transparent failure execution result', () => {
    const execution = createAlicizationVisibleReplyExecution({
      mode: transparentFailureMode,
      expectedVisibleReplyAuthority: 'llm-mind',
      providerMindExecuted: false,
      reason: 'provider-request-failed',
    })

    expect(execution).toMatchObject({
      mode: 'local-fallback',
      expectedVisibleReplyAuthority: 'llm-mind',
      actualVisibleReplyAuthority: 'local-deterministic-fallback',
      providerMindExecuted: false,
      reason: 'provider-request-failed',
    })
  })
})
