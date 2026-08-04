import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('memory workbench settings page', () => {
  it('lives under the modules settings area as Memory with all visible loop tabs', () => {
    const source = readFileSync(new URL('../modules/memory.vue', import.meta.url), 'utf8')

    expect(source).toContain('useAlicizationMemoryWorkbenchStore')
    expect(source).toContain('\'working\'')
    expect(source).toContain('\'long-term\'')
    expect(source).toContain('\'review\'')
    expect(source).toContain('\'probe\'')
    expect(source).toContain('\'persona\'')
    expect(source).toContain('\'health\'')
    expect(source).toContain('settings.pages.memory.workbench.title')
    expect(source).toContain('titleKey: settings.pages.memory.workbench.title')
    expect(source).not.toContain('settingsEntry: true')
  })

  it('keeps the old memory route as a compatibility redirect instead of a settings entry', () => {
    const source = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

    expect(source).toContain('router.replace(\'/settings/modules/memory\')')
    expect(source).not.toContain('settingsEntry: true')
  })

  it('exposes Memory from the modules list', () => {
    const source = readFileSync(new URL('../../../../../../../packages/stage-ui/src/composables/use-modules-list.ts', import.meta.url), 'utf8')

    expect(source).toContain('id: \'memory\'')
    expect(source).toContain('to: \'/settings/modules/memory\'')
    expect(source).toContain('settings.pages.modules.memory.title')
  })

  it('keeps user-facing memory UI outside performance visualizer', () => {
    const source = readFileSync(new URL('../../devtools/performance-visualizer.vue', import.meta.url), 'utf8')

    expect(source).not.toContain('useAlicizationMemoryWorkbenchStore')
  })

  it('renders productized long-term filters and health sections', () => {
    const source = readFileSync(new URL('../modules/memory.vue', import.meta.url), 'utf8')

    expect(source).toContain('longTermFilters')
    expect(source).toContain('loadMoreLongTerm')
    expect(source).toContain('settings.pages.memory.workbench.fields.semantic_channel')
    expect(source).toContain('recallProbe.semantic')
    expect(source).toContain('settings.pages.memory.workbench.fields.queue_health')
    expect(source).toContain('settings.pages.memory.workbench.fields.embedding_health')
  })

  it('localizes long-term memory search filters instead of rendering raw enum values', () => {
    const source = readFileSync(new URL('../modules/memory.vue', import.meta.url), 'utf8')

    expect(source).toContain('settings.pages.memory.workbench.placeholders.long_term_search')
    expect(source).toContain('settings.pages.memory.workbench.placeholders.long_term_source')
    expect(source).toContain('settings.pages.memory.workbench.filters.kind.')
    expect(source).toContain('settings.pages.memory.workbench.filters.sensitivity.')
    expect(source).toContain('settings.pages.memory.workbench.filters.visibility.')
    expect(source).toContain('settings.pages.memory.workbench.filters.training.')
    expect(source).toContain('formatLongTermFilterLabel(')
    expect(source).not.toContain('{{ option }}')
  })

  it('renders persona candidate panel and embedding reindex action', () => {
    const source = readFileSync(new URL('../modules/memory.vue', import.meta.url), 'utf8')

    expect(source).toContain('personaCandidates')
    expect(source).toContain('applyPersonaCandidateAction')
    expect(source).toContain('reindexEmbeddings')
    expect(source).toContain('settings.pages.memory.workbench.fields.behavior_lesson')
    expect(source).toContain('settings.pages.memory.workbench.actions.reindex_embeddings')
  })

  it('renders dataset governance controls and truthful vector index health', () => {
    const source = readFileSync(new URL('../modules/memory.vue', import.meta.url), 'utf8')

    expect(source).toContain('personaTrainingDataset')
    expect(source).toContain('refreshPersonaTrainingDataset')
    expect(source).toContain('stagePersonaTrainingDataset')
    expect(source).toContain('exportPersonaTrainingDataset')
    expect(source).toContain('activatePersonaTrainingDataset')
    expect(source).toContain('rollbackPersonaTrainingDataset')
    expect(source).toContain('revokePersonaTrainingDatasetSource')
    expect(source).toContain('setPersonaTrainingDatasetExamplePolicy')
    expect(source).toContain('settings.pages.memory.workbench.fields.dataset_consent')
    expect(source).toContain('settings.pages.memory.workbench.fields.pii_status')
    expect(source).toContain('settings.pages.memory.workbench.fields.index_mode')
    expect(source).toContain('settings.pages.memory.workbench.fields.native_index')
    expect(source).toContain('settings.pages.memory.workbench.fields.search_ready')
    expect(source).toContain('settings.pages.memory.workbench.fields.canonical_count')
    expect(source).toContain('settings.pages.memory.workbench.fields.indexed_count')
    expect(source).toContain('settings.pages.memory.workbench.fields.missing_count')
    expect(source).toContain('settings.pages.memory.workbench.fields.text_hash_mismatch_count')
    expect(source).toContain('settings.pages.memory.workbench.fields.stale_or_failed_count')
    expect(source).toContain('settings.pages.memory.workbench.fields.orphaned_count')
    expect(source).toContain('settings.pages.memory.workbench.fields.coverage_ratio')
    expect(source).toContain('formatCoverageRatio(')
    expect(source).not.toContain('pending: {{')
    expect(source).not.toContain('deadLettered: {{')
  })

  it('renders durable reindex progress, cancellation, retry, and transparent provider errors', () => {
    const source = readFileSync(new URL('../modules/memory.vue', import.meta.url), 'utf8')

    expect(source).toContain('reindexProgress')
    expect(source).toContain('cancelReindexJob')
    expect(source).toContain('retryDeadLetterReindex')
    expect(source).toContain('reindexDeadLetterItems')
    expect(source).toContain('deadLetterItem.itemId')
    expect(source).toContain('deadLetterItem.sourceId')
    expect(source).toContain('deadLetterItem.attemptCount')
    expect(source).toContain('deadLetterItem.lastError')
    expect(source).toContain('reindexProgress.lastError')
    expect(source).toContain('settings.pages.memory.workbench.actions.cancel_reindex')
    expect(source).toContain('settings.pages.memory.workbench.actions.retry_dead_letter')
  })

  it('renders production embedding configuration controls first with model discovery and connectivity testing', () => {
    const source = readFileSync(new URL('../modules/memory.vue', import.meta.url), 'utf8')
    const embeddingConfigSource = readFileSync(new URL('../modules/components/memory-embedding-config.vue', import.meta.url), 'utf8')
    const embeddingConfigIndex = source.indexOf('<MemoryEmbeddingConfig />')
    const tabIndex = source.indexOf('v-for="tab in tabs"')

    expect(embeddingConfigIndex).toBeGreaterThan(0)
    expect(tabIndex).toBeGreaterThan(embeddingConfigIndex)
    expect(source).toContain('<MemoryEmbeddingConfig />')
    expect(source).not.toContain('const memoryEmbeddingBaseUrl')
    expect(embeddingConfigSource).toContain('memoryEmbeddingBaseUrl')
    expect(embeddingConfigSource).toContain('memoryEmbeddingApiKey')
    expect(embeddingConfigSource).toContain('memoryEmbeddingProviderId')
    expect(embeddingConfigSource).toContain('memoryEmbeddingModel')
    expect(embeddingConfigSource).toContain('memoryEmbeddingModelSearch')
    expect(embeddingConfigSource).toContain('memoryEmbeddingDimensions')
    expect(embeddingConfigSource).toContain('discoverEmbeddingModels')
    expect(embeddingConfigSource).toContain('selectEmbeddingModel')
    expect(embeddingConfigSource).toContain('testEmbeddingConnection')
    expect(embeddingConfigSource).toContain('saveEmbeddingConfig')
    expect(embeddingConfigSource).toContain('onUnmounted')
    expect(embeddingConfigSource).toContain('LEGACY_MEMORY_EMBEDDING_CONFIG_KEY')
    expect(embeddingConfigSource).toContain('store.embeddingConnectionTest = null')
    expect(embeddingConfigSource).toContain('settings.pages.memory.workbench.actions.discover_embedding_models')
    expect(embeddingConfigSource).toContain('settings.pages.memory.workbench.actions.test_embedding_connection')
    expect(embeddingConfigSource).toContain('settings.pages.memory.workbench.actions.save_embedding_config')
  })
})
