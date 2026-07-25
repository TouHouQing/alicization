import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('stage quick reply composer closure surface', () => {
  it('uses the single dialogue-panel closure resolver for visible closure copy', () => {
    const source = readFileSync(new URL('./stage-quick-reply-composer.vue', import.meta.url), 'utf8')

    expect(source).toContain('resolveStageDialoguePanelClosureLine')
    expect(source).toContain('const closureVisibleLine = computed(() => resolveStageDialoguePanelClosureLine(')
    expect(source).toContain('v-if="closureVisibleLine"')
    expect(source).toContain('{{ closureVisibleLine }}')
    expect(source.match(/closureVisibleLine/g)).toHaveLength(3)
    expect(source).not.toContain('resolveStageQuickReplyClosureSummary')
    expect(source).not.toContain('closureDiagnosticEntry.headline')
    expect(source).not.toContain('closureDiagnosticEntry.nextClosureLine')
  })
})
