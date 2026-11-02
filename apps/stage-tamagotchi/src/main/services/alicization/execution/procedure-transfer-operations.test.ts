import { describe, expect, it } from 'vitest'

import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { isProcedurePageUrl, procedureEvaluatorVersion, procedureRequiredPermissions, procedureRisk, transferableProcedureOperation } from './procedure-transfer-operations'

describe('procedure transfer keeps browser reads inside the existing operation policy', () => {
  it.each(['https://example.test/notes?id=two', 'http://127.0.0.1:15432/owned-page', 'https://example.test/a%20b#section'])('accepts an explicit page URL: %s', (url) => {
    expect(isProcedurePageUrl(url)).toBe(true)
  })

  it.each(['javascript:alert(1)', 'file:///C:/private.txt', 'data:text/html,test', 'https://user:secret@example.test/', 'https://example.test/\nother', ' https://example.test', '/relative-page', 'https://example.test/unencoded space', 'https://example.test:99999', ''])('refuses active schemes, credentials, implicit targets and malformed URLs: %s', (url) => {
    expect(isProcedurePageUrl(url)).toBe(false)
  })

  it('uses current manifest permissions and refuses old proof after same-version policy changes', () => {
    const registry = createCanonicalToolRegistry()
    const template = { tools: ['tool.browser_open_url', 'tool.browser_read_page', 'tool.filesystem_write_file'].map(id => transferableProcedureOperation(registry, id)), steps: [] }
    expect(procedureRequiredPermissions(template, registry)).toEqual(['network.read', 'screen.read', 'workspace.write'])
    const fileCopy = { tools: ['tool.filesystem_read_file', 'tool.filesystem_write_file'].map(id => transferableProcedureOperation(registry, id)) }
    expect(procedureRequiredPermissions(fileCopy, registry)).toEqual(['workspace.read', 'workspace.write'])
    expect(procedureEvaluatorVersion(template)).toBe('browser-procedure-replay-v1')
    expect(procedureEvaluatorVersion({ tools: template.tools.filter(tool => !tool.id.startsWith('tool.browser_')), steps: [] })).toBe('file-procedure-replay-v1')
    const current = registry.resolveActive('tool.browser_read_page')!
    registry.replace({ ...current, permissions: [...current.permissions, 'memory.read'] })
    expect(() => procedureRequiredPermissions(template, registry)).toThrow('unchanged operation interface')
  })

  it.each(['tool.desktop_press_keys', 'coding_agent'])('does not silently enable an unsupported interaction or an unspecified program facade: %s', (id) => {
    const registry = createCanonicalToolRegistry()
    expect(() => transferableProcedureOperation(registry, id)).toThrow('nontransferable')
  })

  it.each(['tool.browser_type_text', 'tool.browser_click_element', 'tool.browser_wait'])('binds supported interaction to its dedicated evaluator and current manifest: %s', (id) => {
    const registry = createCanonicalToolRegistry()
    const template = { tools: [transferableProcedureOperation(registry, id)], steps: [] }
    expect(procedureEvaluatorVersion(template)).toBe('browser-interaction-replay-v1')
    expect(procedureRequiredPermissions(template, registry)).toEqual([...registry.resolveActive(id)!.permissions].sort())
    const prior = registry.resolveActive(id)!
    registry.replace({ ...prior, permissions: [...prior.permissions, 'memory.read'] })
    expect(() => procedureRequiredPermissions(template, registry)).toThrow('unchanged operation interface')
  })

  it('retains the highest actual operation risk in a delegated method', () => {
    const registry = createCanonicalToolRegistry()
    const template = { tools: ['tool.filesystem_read_file', 'coding_agent.cli'].map(id => transferableProcedureOperation(registry, id)), steps: [] }
    expect(procedureRisk(template, registry)).toBe('high')
    expect(procedureEvaluatorVersion(template)).toBe('computer-procedure-replay-v2')
    const command = registry.resolveActive('coding_agent.cli')!
    registry.replace({ ...command, risk: 'critical' })
    expect(() => procedureRisk(template, registry)).toThrow('unchanged operation interface')
  })
})
