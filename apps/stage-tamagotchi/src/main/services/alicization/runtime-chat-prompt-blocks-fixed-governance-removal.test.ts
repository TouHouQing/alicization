import { existsSync, readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildChatInspectionContractSystemBlock,
  buildChatPerceptionSystemBlock,
} from './runtime-chat-prompt-blocks'

describe('runtime chat prompt blocks fixed governance removal', () => {
  it('removes the dead natural-language dialogue mind prompt module', () => {
    expect(existsSync(new URL('./dialogue-mind-frame.ts', import.meta.url))).toBe(false)
    expect(existsSync(new URL('./dialogue-mind-frame.test.ts', import.meta.url))).toBe(false)

    const source = readFileSync(new URL('./runtime-chat-prompt-blocks.ts', import.meta.url), 'utf8')
    expect(source).not.toContain('buildCompactMindTurnControlSystemBlock')
    expect(source).not.toContain('buildDialogueMindFrameSystemBlock')
  })

  it('does not define background project self-brief blocks for provider gateways', () => {
    const source = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(/build(?:CoreIncarnationReforge|Reminder|Proactive|Dream|MemoryConsolidation)ProjectSelfBriefSystemBlock/u)
    expect(source).not.toContain('buildAlicizationProviderFacingProjectStateExtraSystemBlocks')
    expect(source).not.toContain('buildAlicizationProviderFacingProjectStateSystemBlock')
  })

  it('does not embed reply-writing rules in perception or inspection context', () => {
    const source = readFileSync(new URL('./runtime-chat-prompt-blocks.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('The visible reply must be authored by the provider from current grounded evidence.')
    expect(source).not.toContain('reply_order=')
    expect(source).not.toContain('evidence_priority=')
    expect(source).not.toContain('stale_perception_policy=')
    expect(source).not.toContain('uncertainty_policy=')
    expect(source).not.toContain('blindness_claim_policy=')
    expect(source).not.toContain('self_surface_inspection_policy=')
    expect(source).not.toContain('visual_evidence_boundary=')
  })

  it('emits perception and inspection evidence as typed facts', () => {
    const state = {
      attentionAnchor: {
        appName: 'Safari',
        anchoredAt: 10,
        lastObservedAt: 10,
        reason: 'recent-foreground',
        workloadKind: 'browsing',
        confidence: 0.9,
      },
      browserWorkflowState: null,
      lastNonSelfForegroundTarget: null,
      recentObservations: [],
      invitedInspection: null,
      recentSceneResidue: null,
      updatedAt: 10,
    } as any

    const perception = buildChatPerceptionSystemBlock({
      now: 10,
      state,
      inspectionRequested: true,
    })
    const inspection = buildChatInspectionContractSystemBlock({
      now: 10,
      state,
      mode: 'perception-only',
      permissionStatus: 'granted',
    })

    expect(JSON.parse(perception)).toMatchObject({
      type: 'alicization-perception',
      data: {
        inspectionMode: 'invited-by-user',
      },
    })
    expect(JSON.parse(inspection)).toMatchObject({
      type: 'alicization-inspection',
      data: {
        groundingMode: 'perception-only',
        permissionStatus: 'granted',
      },
    })
    expect(perception).not.toContain('[ALICIZATION_PERCEPTION]')
    expect(inspection).not.toContain('[ALICIZATION_INSPECTION_CONTRACT]')
  })
})
