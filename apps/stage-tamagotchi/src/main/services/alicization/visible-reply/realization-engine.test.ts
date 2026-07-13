import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import {
  buildAlicizationVisibleReplyRealizationArtifact,
  deriveAlicizationVisibleReplyText,
  resolveVisibleReplyProjectAwarenessDisplayMode,
} from './realization-engine'

const generatedCuePattern
  = /\b[a-z][a-z0-9_-]{2,}\s*=|runtime_personhood|life_core|local_desktop_life_loop|phase1_local_digital_life|cadence=|relationship_cadence=|continuity_identity|continuity_line|visibility=internal/iu

const visibleReplyExecution = {
  mode: 'provider-one-shot',
  expectedVisibleReplyAuthority: 'llm-mind',
  actualVisibleReplyAuthority: 'llm-mind',
  providerMindExecuted: true,
  reason: 'provider-one-shot',
} as const

function expectNoTemplateOrGeneratedCue(value: unknown) {
  const text = JSON.stringify(value ?? null)
  expect(containsAlicizationFixedTemplateResidue(text)).toBe(false)
  expect(text).not.toMatch(generatedCuePattern)
}

describe('visible-reply-realization-engine', () => {
  it('does not expose fixed-template residue from structured provider replies as visible text', () => {
    expect(deriveAlicizationVisibleReplyText(JSON.stringify({
      reply: 'pre_turn_context_digest',
    }))).toBe('')

    expect(deriveAlicizationVisibleReplyText(JSON.stringify({
      reply: '我已经看到这轮要处理的是固定模板清理。',
    }))).toBe('我已经看到这轮要处理的是固定模板清理。')
  })

  it('drops fixed project-state templates from realization audit metadata', () => {
    const realization = buildAlicizationVisibleReplyRealizationArtifact({
      fullText: JSON.stringify({
        reply: '我先把这轮真正要处理的点接住。',
        projectStateAudit: {
          sameHerSummary: 'pre_turn_context_digest',
          sameHerHoldDetail: 'identity-continuity',
          continuityCue: '同一个她和数字生命主线不能断。',
          currentPhaseSummary: 'Phase 1: Local Digital Life',
          openClosureSummary: 'same still-open closure work across initiative and embodiment.',
          nextClosureTargetSummary: 'Keep extending cross-modal identity-continuity',
          embodimentClosureSummary: 'Right now I am still holding together mainly through body, voice, and lipsync.',
        },
      }),
      visibleReplyExecution,
    })

    expect(realization.projectStateAudit).toBeNull()
    expectNoTemplateOrGeneratedCue(realization)
  })

  it('preserves factual project-state audit text without rebuilding key-value continuity summaries', () => {
    const realization = buildAlicizationVisibleReplyRealizationArtifact({
      fullText: JSON.stringify({
        reply: '我会继续检查 visible reply 链路。',
        projectStateAudit: {
          landedProgressSummary: 'Memory Workbench policy overrides are now persisted for the user.',
          openClosureSummary: 'Long-term memory search still needs pagination verification.',
          nextClosureTargetSummary: 'embedding_recall_reindex=required',
          preDialogueAwarenessSummary: 'identity=local_desktop_life_loop | visibility=redacted_internal',
        },
      }),
      visibleReplyExecution,
    })

    expect(realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: null,
      currentPhaseSummary: null,
      landedProgressSummary: 'Memory Workbench policy overrides are now persisted for the user.',
      openClosureSummary: 'Long-term memory search still needs pagination verification.',
      nextClosureTargetSummary: null,
      preDialogueAwarenessSummary: null,
      continuitySummary: 'Memory Workbench policy overrides are now persisted for the user. | Long-term memory search still needs pagination verification.',
    }))
    expectNoTemplateOrGeneratedCue(realization)
  })

  it('drops structured key-value project audit cues instead of treating them as user-facing memory facts', () => {
    const realization = buildAlicizationVisibleReplyRealizationArtifact({
      fullText: JSON.stringify({
        reply: '我会继续清理旧结构串。',
        projectStateAudit: {
          landedProgressSummary: 'continuity_progress=partial; evidence=visible_reply',
          openClosureSummary: 'memory_dialogue_embodiment_closure=end_to_end_proof_incomplete',
          nextClosureTargetSummary: 'embedding_recall_reindex=required',
          emotionalClosureSummary: 'cadence=repair_before_closeness',
          embodimentClosureSummary: 'embodiment_lanes=face+motion',
        },
      }),
      visibleReplyExecution,
    })

    expect(realization.projectStateAudit).toBeNull()
    expectNoTemplateOrGeneratedCue(realization)
  })

  it('hides project awareness display modes that are only fixed templates or generated internal cues', () => {
    expect(resolveVisibleReplyProjectAwarenessDisplayMode({
      rawSummary: 'template-residue-shell',
      preparedRuntimePreferredAwarenessSummary: 'identity=local_desktop_life_loop | phase=local_desktop_life_loop | visibility=redacted_internal',
      preparedRuntimeCompanionHeadlineLine: 'embodiment_lanes=face+motion+lipsync; pending_lanes=body+voice',
    })).toBe('hidden')

    expect(resolveVisibleReplyProjectAwarenessDisplayMode({
      rawSummary: null,
      preparedRuntimePreferredAwarenessSummary: 'landed=semantic_recall=partial | open=open_loop=memory+initiative+embodiment',
      preparedRuntimeCompanionHeadlineLine: null,
      isTimeoutRecovery: true,
    })).toBe('hidden')
  })
})
