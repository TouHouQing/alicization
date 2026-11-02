import { createRequire } from 'node:module'

import { expect, it } from 'vitest'

import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { createWorkPlanToolSpec } from './work-plan-tool'

const require = createRequire(import.meta.url)
const { createOwnedKeyboardWorkPlan } = require('../../../../../scripts/life-acceptance/electron-keyboard-product-checks.cjs')

it.each([false, true])('admits every exact product fixture step under the real capability schemas, Unicode=%s', (unicodeInput) => {
  const registry = createCanonicalToolRegistry()
  const plan = createOwnedKeyboardWorkPlan({ goal: 'Owned fixture only', artifact: 'C:/owned-fixture/saved.txt', text: '实际输入 中文🙂 e\u0301 👩‍💻 العربية', unicodeInput })
  const admission = createWorkPlanToolSpec(async () => undefined).parameters.safeParse(plan)
  expect(admission.success, admission.error?.message).toBe(true)
  expect(plan.steps).toHaveLength(unicodeInput ? 4 : 2)
  for (const step of plan.steps) {
    const result = registry.validateInput(step.capabilityId, step.input)
    expect(result.valid, JSON.stringify({ capability: step.capabilityId, errors: result.errors })).toBe(true)
  }
  expect(plan.steps.filter((step: { capabilityId: string }) => step.capabilityId === 'tool.desktop_press_keys')).toHaveLength(1)
  expect(plan.steps.at(-1).input).toEqual({ shortcut: 'Ctrl+S', repeat: 1 })
  expect(plan.steps.at(-1).dependsOn).toEqual([unicodeInput ? 'readback' : 'observe'])
})
