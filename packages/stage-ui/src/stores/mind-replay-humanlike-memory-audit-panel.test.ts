import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('mind replay humanlike memory audit panel wiring', () => {
  it('keeps humanlike memory audit visible inside the mind replay devtools page', () => {
    const source = readFileSync(new URL('../../../stage-pages/src/pages/devtools/mind-replay.vue', import.meta.url), 'utf8')

    expect(source).toContain('import MindReplayHumanlikeMemoryAuditPanel from \'./components/mind-replay-humanlike-memory-audit-panel.vue\'')
    expect(source).toContain('<MindReplayHumanlikeMemoryAuditPanel')
    expect(source).toContain(':decision-trace-id="decisionTraceId.trim() || null"')
    expect(source).toContain(':turn-id="turnId.trim() || null"')
    expect(source).toContain(':limit="normalizedLimit"')
  })

  it('keeps the panel coupled to the audit store and correctable relationship-memory fields', () => {
    const source = readFileSync(new URL('../../../stage-pages/src/pages/devtools/components/mind-replay-humanlike-memory-audit-panel.vue', import.meta.url), 'utf8')

    expect(source).toContain('useAlicizationHumanlikeMemoryAuditStore')
    expect(source).toContain('loadAudit')
    expect(source).toContain('correctAuditEntry')
    expect(source).toContain('whyRemember')
    expect(source).toContain('relationshipContext')
    expect(source).toContain('naturalRecallLine')
    expect(source).toContain('emotionalResidueTags')
    expect(source).toContain('embodimentSummary')
  })
})
