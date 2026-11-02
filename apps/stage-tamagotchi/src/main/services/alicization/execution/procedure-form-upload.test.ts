import { createHash } from 'node:crypto'
import { createServer } from 'node:http'

import { expect, it } from 'vitest'

import { createProcedureFormFixture } from './procedure-form-fixture'

const digest = (text: string) => createHash('sha256').update(text).digest('hex')

it.each(['correct', 'changed-bytes', 'missing-file', 'unexpected-file', 'duplicate-field', 'malformed', 'repeated-post'] as const)('independently checks actual multipart upload: %s', async (mode) => {
  const fixture = createProcedureFormFixture('owned-upload')
  const server = createServer(async (request, response) => {
    if (!await fixture.handle(request, response)) {
      response.statusCode = 404
      response.end('Not an active form')
    }
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Owned fixture requires a loopback port')
  const origin = `http://127.0.0.1:${address.port}`
  try {
    const files = [{ name: '附件.txt', bytes: new TextEncoder().encode('Exact 中文🙂 bytes').length, sha256: digest('Exact 中文🙂 bytes') }, { name: 'empty.txt', bytes: 0, sha256: digest('') }]
    const form = fixture.prepare({ caseId: 'submitted', fields: [{ label: '说明', text: 'first\nsecond' }], uploads: [{ label: '附件', files }], submitLabel: '发送', receiptText: '独立回执' })
    const page = await fetch(origin + form.path)
    expect(await page.text()).toContain('enctype="multipart/form-data"')
    expect(fixture.snapshot()).toEqual({ requests: 0, accepted: 0, refused: 0, observedText: null })
    const body = new FormData()
    body.append('field0', 'first\r\nsecond')
    if (mode === 'duplicate-field')
      body.append('field0', 'first\r\nsecond')
    if (mode !== 'missing-file')
      body.append('upload0', new Blob([mode === 'changed-bytes' ? 'Wrong 中文🙂 bytes' : 'Exact 中文🙂 bytes']), '附件.txt')
    body.append('upload0', new Blob([]), 'empty.txt')
    if (mode === 'unexpected-file')
      body.append('other', new Blob(['must refuse']), 'extra.txt')
    const post = () => fetch(origin + form.submitPath, mode === 'malformed'
      ? { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=missing' }, body: 'truncated invalid multipart bytes' }
      : { method: 'POST', body })
    const response = await post()
    expect(response.status).toBe(['correct', 'repeated-post'].includes(mode) ? 200 : 403)
    await response.arrayBuffer()
    if (mode === 'correct') {
      expect(fixture.snapshot()).toEqual({ requests: 1, accepted: 1, refused: 0, observedText: form.expectedText })
      expect(JSON.parse(form.expectedText).files).toEqual([files])
    }
    else if (mode === 'repeated-post') {
      const duplicate = await post()
      expect(duplicate.status).toBe(403)
      await duplicate.arrayBuffer()
      expect(fixture.snapshot()).toMatchObject({ requests: 2, accepted: 1, refused: 1 })
    }
    else {
      expect(fixture.snapshot()).toEqual({ requests: 1, accepted: 0, refused: 1, observedText: null })
    }
    fixture.clear()
    expect((await fetch(origin + form.path)).status).toBe(404)
  }
  finally {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
})

it('bounds file-only uploads and refuses metadata that could escape a filename', () => {
  const fixture = createProcedureFormFixture('owned-upload')
  const file = { name: 'only.txt', bytes: 1, sha256: digest('x') }
  const input = { caseId: 'file-only', fields: [], uploads: [{ label: '唯一附件', files: [file] }], submitLabel: '发送', receiptText: '收到' }
  expect(JSON.parse(fixture.prepare(input).expectedText).values).toEqual([])
  for (const changed of [{ ...file, name: '../escape.txt' }, { ...file, bytes: 65_537 }, { ...file, sha256: 'forged' }])
    expect(() => fixture.prepare({ ...input, uploads: [{ label: '附件', files: [changed] }] })).toThrow('budget')
  expect(() => fixture.prepare({ ...input, uploads: Array.from({ length: 5 }, () => input.uploads[0]) })).toThrow('budget')
})
