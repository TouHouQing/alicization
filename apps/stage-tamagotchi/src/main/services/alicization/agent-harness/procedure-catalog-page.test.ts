import { describe, expect, it } from 'vitest'

import { procedureCatalogPage } from './procedure-catalog-page'

describe('bounded live method inventory', () => {
  const entries = Array.from({ length: 1000 }, (_, i) => ({ id: `skill.learned_${i.toString().padStart(4, '0')}`, version: i.toString(16).padStart(64, '0'), sourceValid: true, status: 'active', evaluationStatus: 'passed', operations: ['tool.filesystem_write_file'], parameters: [{ name: 'input1', kind: 'string', role: 'expected-text' }], inputSchema: { type: 'object' } }))
  it('pages all 1000 identities exactly once and refuses a stale directory', () => {
    const received: unknown[] = []
    let offset = 0
    let hash: string | undefined
    while (true) {
      const page = procedureCatalogPage(entries, { offset, expectedCatalogHash: hash, limit: 20 })
      expect(page.status).toBe('completed')
      received.push(...page.items)
      hash = page.catalogHash
      if (page.nextOffset === null)
        break
      offset = page.nextOffset
    }
    expect(received).toEqual(entries)
    expect(procedureCatalogPage(entries.slice(1), { offset: 20, expectedCatalogHash: hash })).toMatchObject({ status: 'catalog-changed', items: [], nextOffset: 0 })
  })
  it('finds exact late entries without injecting unrelated methods or historical arguments', () => {
    const exact = procedureCatalogPage(entries, { query: `${entries[999]!.id}@${entries[999]!.version}` })
    expect(exact.items).toEqual([entries[999]])
    expect(procedureCatalogPage(entries, { query: '写入文件 验证文本' }).items.length).toBeGreaterThan(0)
    expect(procedureCatalogPage(entries, { query: '陪我聊聊旅行' }).items).toEqual([])
  })
})
