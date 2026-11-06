import { Buffer } from 'node:buffer'

import { expect, it } from 'vitest'

import { createLspMessageDecoder, encodeLspMessage } from '../third-party/deepseek-lsp-framing'

it('decodes split UTF-8 and multiple frames, rejects malformed or oversized frames', () => {
  const messages = [{ jsonrpc: '2.0', id: 1, result: '你好' }, { jsonrpc: '2.0', id: 2, result: null }]
  const data = Buffer.concat(messages.map(encodeLspMessage))
  const decode = createLspMessageDecoder()
  const output = [...decode(data.subarray(0, 7)), ...decode(data.subarray(7, 60)), ...decode(data.subarray(60))]
  expect(output).toEqual(messages)
  expect(() => createLspMessageDecoder(10)(Buffer.from('Content-Length: 11\r\n\r\n'))).toThrow('budget')
  expect(() => createLspMessageDecoder()(Buffer.from('Content-Length: 2\r\nContent-Length: 2\r\n\r\n{}'))).toThrow('Invalid')
})
