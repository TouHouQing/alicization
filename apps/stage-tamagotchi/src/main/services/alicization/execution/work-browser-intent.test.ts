import type { ExecutionCriterion } from '../../../../shared/execution-contracts'

import { describe, expect, it } from 'vitest'

import { matchesDeclaredBrowserWorkIntent } from './work-browser-intent'

describe('declared loopback browser intent', () => {
  const criteria: ExecutionCriterion[] = [{ id: 'download', required: true, proofScope: 'bytes', predicate: { kind: 'browser-download', stepId: 'download', minimumBytes: 1 } }]
  const declaration = (urls: unknown[], click = true) => [
    ...urls.map((url, index) => ({ id: `navigate-${index}`, capabilityId: 'tool.browser_navigate', input: { url } })),
    ...(click ? [{ id: 'download', capabilityId: 'tool.browser_click_element', input: { selector: 'element:current-download' } }] : []),
  ]
  it.each([
    ['http://127.0.0.1:8123/page', true],
    ['https://localhost:8123/page', true],
    ['http://[::1]:8123/page', true],
    ['http://localhost.example/page', false],
    ['http://127.0.0.1.example/page', false],
    ['http://192.168.1.2/page', false],
    ['http://localhost@outside.example/page', false],
    ['http://user:secret@localhost/page', false],
    ['file:///C:/report.txt', false],
    ['ftp://localhost/report', false],
    ['not-a-url', false],
    [null, false],
  ] as const)('binds local references only to the actual declared origin %s', (url, accepted) => {
    expect(matchesDeclaredBrowserWorkIntent('访问本机测试服务器并尝试下载', declaration([url]), criteria)).toBe(accepted)
  })
  it('requires one declared origin and the actual download trigger, retaining every extra verb', () => {
    const intent = '访问本机测试服务器并尝试下载'
    const steps = declaration(['http://localhost:8123/page'])
    expect(matchesDeclaredBrowserWorkIntent(intent, declaration([]), criteria)).toBe(false)
    expect(matchesDeclaredBrowserWorkIntent(intent, declaration(['http://localhost:8123/page', 'http://localhost:8124/other']), criteria)).toBe(false)
    expect(matchesDeclaredBrowserWorkIntent(intent, declaration(['http://localhost:8123/page', 'https://outside.example/page']), criteria)).toBe(false)
    expect(matchesDeclaredBrowserWorkIntent(intent, declaration(['http://localhost:8123/page'], false), criteria)).toBe(false)
    expect(matchesDeclaredBrowserWorkIntent(intent, steps, [])).toBe(false)
    expect(matchesDeclaredBrowserWorkIntent(intent, steps, [{ ...criteria[0], predicate: { kind: 'browser-download', stepId: 'another-click', minimumBytes: 1 } }])).toBe(false)
    for (const text of ['访问外部服务器并尝试下载', `${intent}并上传文件`, `${intent}然后删除文件`, '已经访问本机服务器并下载成功', '访问本机服务器并安装程序'])
      expect(matchesDeclaredBrowserWorkIntent(text, steps, criteria), text).toBe(false)
    expect(matchesDeclaredBrowserWorkIntent('打开本地网页', steps, [])).toBe(true)
  })
})
