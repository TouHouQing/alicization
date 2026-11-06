// SPDX-License-Identifier: MIT
// Adapted from Pi truncateMiddle, packages/coding-agent/src/core/tools/truncate.ts
// at 62752fd4c37a72e0f3c1cc83e9ac3b4299f31fe6. Copyright (c) 2025 Mario Zechner.
// Full license: ./pi-license.txt. Changes: bounded marker, validation, byte offsets.
import { Buffer } from 'node:buffer'

export function truncatePiToolText(content: string, maxBytes: number) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 128)
    throw new TypeError('Tool preview requires a byte budget of at least 128')
  const bytes = Buffer.from(content, 'utf8')
  if (bytes.length <= maxBytes)
    return content
  const marker = '\n… middle omitted; read the original receipt for exact content …\n'
  const available = maxBytes - Buffer.byteLength(marker)
  const isBoundary = (index: number) => index >= bytes.length || (bytes[index]! & 0xC0) !== 0x80
  let headEnd = Math.floor(available / 2)
  while (headEnd > 0 && !isBoundary(headEnd)) headEnd--
  let tailStart = bytes.length - (available - Math.floor(available / 2))
  while (tailStart < bytes.length && !isBoundary(tailStart)) tailStart++
  return `${bytes.subarray(0, headEnd).toString('utf8')}${marker}${bytes.subarray(tailStart).toString('utf8')}`
}

export function readUtf8ToolPage(content: string, offset: number, maxBytes: number) {
  const bytes = Buffer.from(content, 'utf8')
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > bytes.length || (offset < bytes.length && (bytes[offset]! & 0xC0) === 0x80))
    throw new TypeError('Receipt offset must be an existing UTF-8 character boundary')
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 64 || maxBytes > 8192)
    throw new TypeError('Receipt pages require 64 to 8192 bytes')
  let end = Math.min(bytes.length, offset + maxBytes)
  while (end > offset && end < bytes.length && (bytes[end]! & 0xC0) === 0x80) end--
  return { content: bytes.subarray(offset, end).toString('utf8'), offset, nextOffset: end, totalBytes: bytes.length, complete: end === bytes.length }
}
