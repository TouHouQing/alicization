import { describe, expect, it } from 'vitest'

import { classifyLifeInterfaceRisk } from './life-interface-risk'

describe('observed replacement controls', () => {
  it('requires approval for replacing data and retains stronger delete and network policies', () => {
    expect(classifyLifeInterfaceRisk({ operation: 'desktop_click_element', label: '确认覆盖测试文件' })).toMatchObject({ riskLevel: 'sensitive', actionCategory: 'write' })
    expect(classifyLifeInterfaceRisk({ operation: 'browser_click_element', label: 'Overwrite existing file' })).toMatchObject({ riskLevel: 'sensitive', actionCategory: 'write' })
    expect(classifyLifeInterfaceRisk({ operation: 'desktop_click_element', label: '删除并覆盖' })).toMatchObject({ riskLevel: 'danger', actionCategory: 'delete' })
    expect(classifyLifeInterfaceRisk({ operation: 'desktop_click_element', label: '上传替换现有文件' })).toMatchObject({ riskLevel: 'danger', actionCategory: 'network' })
    expect(classifyLifeInterfaceRisk({ operation: 'desktop_click_element', label: '保存' })).toBeNull()
  })
})
