import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { procedureDesktopInteraction } from './procedure-desktop-interaction'
import { desktopProcedureExample } from './procedure-desktop-test-fixture'
import { compileProcedureTemplate, instantiateProcedureTemplate } from './procedure-template'
import { procedureEvaluationCases, procedureEvaluatorVersion } from './procedure-transfer-operations'

it('removes private native examples and requires fresh exact window/control/content/file arguments', () => {
  const registry = createCanonicalToolRegistry({ platform: 'win32' })
  const source = desktopProcedureExample()
  const template = compileProcedureTemplate(source.plan, source.criteria, registry)
  expect(JSON.stringify(template)).not.toMatch(/Private|private-native/u)
  const shape = procedureDesktopInteraction(template)!
  expect(template.parameters).toHaveLength(4)
  expect(procedureEvaluatorVersion(template)).toBe('windows-desktop-replay-v1')
  expect(procedureEvaluationCases(template)).toHaveLength(10)
  const args = { [shape.windowParameter]: 'Fresh editor', [shape.textParameter]: 'Fresh 中文🙂', [shape.saveLabelParameter]: 'Fresh save', [shape.pathParameter]: join(tmpdir(), 'fresh-native.txt') }
  const proposal = instantiateProcedureTemplate(template, args, registry, 'Use the current exact editor')
  expect(proposal.steps[1].input).toMatchObject({ windowTitle: 'Fresh editor', text: 'Fresh 中文🙂', role: 'input' })
  expect(proposal.steps[1].input).not.toHaveProperty('submit')
  expect(proposal.steps[1].inputBindings?.[0].select?.equals).toBe('input')
  expect(() => instantiateProcedureTemplate(template, { ...args, [shape.windowParameter]: 'x'.repeat(181) }, registry, 'Invalid window')).toThrow('budget')
})

it.each(['unobserved-target', 'old-observation', 'implicit-submit', 'optional-proof', 'mixed-program', 'unrelated-byte-proof'])('refuses unsafe desktop method shape: %s', (fault) => {
  const registry = createCanonicalToolRegistry({ platform: 'win32' })
  const source = desktopProcedureExample()
  if (fault === 'unobserved-target') {
    source.plan.steps[1].inputBindings = undefined
    source.plan.steps[1].input.targetText = 'Private field'
  }
  if (fault === 'old-observation')
    source.plan.steps[3].inputBindings![0].stepId = 'read-entry'
  if (fault === 'implicit-submit')
    source.plan.steps[1].input.submit = true
  if (fault === 'optional-proof')
    source.criteria[0].required = false
  if (fault === 'mixed-program')
    source.plan.steps[3].capabilityId = 'tool.desktop_press_keys'
  if (fault === 'unrelated-byte-proof')
    source.criteria[0].predicate.sha256 = 'b'.repeat(64)
  expect(() => compileProcedureTemplate(source.plan, source.criteria, registry)).toThrow()
})
