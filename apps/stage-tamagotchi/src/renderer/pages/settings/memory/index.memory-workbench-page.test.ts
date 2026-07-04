import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('memory workbench settings page', () => {
  it('is a dedicated settings memory page with all visible loop tabs', () => {
    const source = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

    expect(source).toContain('useAlicizationMemoryWorkbenchStore')
    expect(source).toContain("'working'")
    expect(source).toContain("'long-term'")
    expect(source).toContain("'review'")
    expect(source).toContain("'probe'")
    expect(source).toContain("'persona'")
    expect(source).toContain("'health'")
    expect(source).toContain('settings.pages.memory.workbench.title')
    expect(source).toContain('titleKey: settings.pages.memory.workbench.title')
    expect(source).toContain('settingsEntry: true')
  })

  it('keeps user-facing memory UI outside performance visualizer', () => {
    const source = readFileSync(new URL('../../devtools/performance-visualizer.vue', import.meta.url), 'utf8')

    expect(source).not.toContain('useAlicizationMemoryWorkbenchStore')
  })

  it('renders productized long-term filters and health sections', () => {
    const source = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

    expect(source).toContain('longTermFilters')
    expect(source).toContain('loadMoreLongTerm')
    expect(source).toContain('settings.pages.memory.workbench.fields.semantic_channel')
    expect(source).toContain('recallProbe.semantic')
    expect(source).toContain('settings.pages.memory.workbench.fields.queue_health')
    expect(source).toContain('settings.pages.memory.workbench.fields.embedding_health')
  })

  it('renders persona candidate panel and embedding reindex action', () => {
    const source = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

    expect(source).toContain('personaCandidates')
    expect(source).toContain('applyPersonaCandidateAction')
    expect(source).toContain('reindexEmbeddings')
    expect(source).toContain('settings.pages.memory.workbench.fields.behavior_lesson')
    expect(source).toContain('settings.pages.memory.workbench.actions.reindex_embeddings')
  })
})
