import { createServer } from 'node:http'

import { expect, it } from 'vitest'

import { createProcedureFormFixture } from './procedure-form-fixture'

it.each([
  { name: 'four maximum-length Chinese fields', fields: Array.from({ length: 4 }, (_, index) => ({ label: `字段${index}`, text: '中'.repeat(16_000) })), wire: Array.from({ length: 4 }, () => '中'.repeat(16_000)) },
  { name: 'browser-normalized multiline input', fields: [{ label: '正文', text: 'first\nsecond\rthird\r\n中文🙂' }], wire: ['first\r\nsecond\r\nthird\r\n中文🙂'] },
])('accepts the declared form budget through actual HTTP: $name', async ({ fields, wire }) => {
  const fixture = createProcedureFormFixture('owned-budget')
  const server = createServer(async (request, response) => {
    await fixture.handle(request, response)
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Owned fixture must have a loopback port')
  const url = `http://127.0.0.1:${address.port}`
  try {
    const form = fixture.prepare({ caseId: 'valid', fields, submitLabel: '提交', receiptText: '实际回执' })
    const result = await fetch(url + form.submitPath, { method: 'POST', body: new URLSearchParams(wire.map((text, index): [string, string] => [`field${index}`, text])) })
    expect(result.status).toBe(200)
    expect(fixture.snapshot()).toMatchObject({ requests: 1, accepted: 1, refused: 0, observedText: JSON.stringify({ receipt: '实际回执', values: wire }) })
    expect(form.expectedText).toBe(fixture.snapshot().observedText)
    await result.arrayBuffer()
    const huge = fixture.prepare({ caseId: 'oversized', fields, submitLabel: '提交', receiptText: '实际回执' })
    const rejected = await fetch(url + huge.submitPath, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `field0=${'x'.repeat(600_000)}` })
    expect(rejected.status).toBe(413)
    expect(fixture.snapshot()).toMatchObject({ accepted: 0, refused: 1 })
    await rejected.arrayBuffer()
  }
  finally {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
})

it('only accepts one exact real form submission, observes received bytes and invalidates old cases', async () => {
  const fixture = createProcedureFormFixture('owned-nonce')
  const server = createServer(async (request, response) => {
    if (!await fixture.handle(request, response)) {
      response.statusCode = 404
      response.end('Not an active form')
    }
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Owned fixture must have a loopback port')
  const origin = `http://127.0.0.1:${address.port}`
  const input = { caseId: 'normal', fields: [{ label: '字段 <safe>', text: '中文🙂 & value' }], submitLabel: 'Record', receiptText: 'Receipt' }
  const post = async (url: string, body: URLSearchParams) => fetch(`${origin}${url}`, { method: 'POST', body })
  try {
    const seeded = fixture.prepare(input)
    const page = await fetch(`${origin}${seeded.path}`)
    expect(await page.text()).toContain('字段 &lt;safe&gt;')
    expect(page.headers.get('content-security-policy')).toContain('form-action \'self\'')
    const response = await post(seeded.submitPath, new URLSearchParams({ field0: input.fields[0].text }))
    expect(response.status).toBe(200)
    expect(fixture.snapshot()).toEqual({ requests: 1, accepted: 1, refused: 0, observedText: seeded.expectedText })
    expect((await post(seeded.submitPath, new URLSearchParams({ field0: input.fields[0].text }))).status).toBe(403)
    fixture.prepare({ ...input, caseId: 'next' })
    expect((await fetch(`${origin}${seeded.path}`)).status).toBe(404)
    expect(fixture.snapshot().requests).toBe(0)
    const changed = fixture.prepare({ ...input, caseId: 'wrong-value' })
    expect((await post(changed.submitPath, new URLSearchParams({ field0: 'Wrong value' }))).status).toBe(403)
    const duplicate = fixture.prepare({ ...input, caseId: 'duplicate' })
    expect((await post(duplicate.submitPath, new URLSearchParams([['field0', input.fields[0].text], ['field0', input.fields[0].text]]))).status).toBe(403)
    const explicit = fixture.prepare({ ...input, caseId: 'refused', fault: 'submission-refused' })
    expect((await post(explicit.submitPath, new URLSearchParams({ field0: input.fields[0].text }))).status).toBe(403)
    fixture.clear()
    expect((await fetch(`${origin}${explicit.path}`)).status).toBe(404)
  }
  finally {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
})
