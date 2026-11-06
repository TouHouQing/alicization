// Ported from deepseek-ai/deepseek-harness, commit
// 8bd073392eef6f54e921a093b95076248eb08cbb,
// packages/lsp/lsp-stdio/src/framing.ts (MIT).
// License: resources/licenses/deepseek-harness-license.txt.
import { Buffer } from 'node:buffer'

export function encodeLspMessage(message: unknown) {
  const body = Buffer.from(JSON.stringify(message), 'utf8')
  return Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'ascii'), body])
}

/** Bounded Content-Length decoder; accepts fragmented and coalesced frames. */
export function createLspMessageDecoder(maxMessageBytes = 4 * 1024 * 1024) {
  let buffer: Buffer = Buffer.alloc(0)
  return (chunk: Buffer): unknown[] => {
    buffer = buffer.length ? Buffer.concat([buffer, chunk]) : chunk
    const messages: unknown[] = []
    for (;;) {
      const separator = buffer.indexOf('\r\n\r\n')
      if (separator < 0) {
        if (buffer.length > 65536)
          throw new Error('LSP header exceeded its byte budget')
        break
      }
      if (separator > 65536)
        throw new Error('LSP header exceeded its byte budget')
      const lengths = buffer.toString('ascii', 0, separator).split('\r\n').filter(line => /^content-length\s*:/iu.test(line)).map(line => line.slice(line.indexOf(':') + 1).trim())
      if (lengths.length !== 1 || !/^\d+$/u.test(lengths[0]!))
        throw new Error('Invalid LSP Content-Length')
      const length = Number(lengths[0])
      if (!Number.isSafeInteger(length) || length > maxMessageBytes)
        throw new Error('LSP body exceeded its byte budget')
      const end = separator + 4 + length
      if (buffer.length < end)
        break
      messages.push(JSON.parse(buffer.toString('utf8', separator + 4, end)))
      buffer = buffer.subarray(end)
    }
    return messages
  }
}
