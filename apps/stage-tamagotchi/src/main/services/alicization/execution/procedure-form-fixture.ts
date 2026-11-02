import type { IncomingMessage, ServerResponse } from 'node:http'

import type { ProcedureFormFixtureInput, ProcedureFormObservation } from './procedure-browser-replay-types'

import { Buffer } from 'node:buffer'
import { StringDecoder } from 'node:string_decoder'

import { readProcedureFormUpload } from './procedure-form-upload'

const html = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
// A UTF-16 code unit can expand to nine ASCII bytes in a URL-encoded form.
// Keep all four declared 16K fields representable, including their field names.
const maxFormBodyBytes = 4 * 16_000 * 9 + 32
const formLineEndings = (text: string) => text.replace(/\r\n|\r|\n/gu, '\r\n')

/** Synthetic loopback service receives real browser form submissions. No script or external resource. */
export function createProcedureFormFixture(nonce: string) {
  let form: { input: ProcedureFormFixtureInput, path: string, expectedValues: string[], expectedText: string } | null = null
  let observation: ProcedureFormObservation = { requests: 0, accepted: 0, refused: 0, observedText: null }
  function prepare(input: ProcedureFormFixtureInput) {
    const uploads = input.uploads ?? []
    if (!/^[a-z0-9-]{1,64}$/u.test(input.caseId) || input.fields.length + uploads.length < 1 || input.fields.length + uploads.length > 4 || input.fields.some(field => !field.label || field.label.length > 4096 || !field.text || field.text.length > 16_000) || uploads.some(upload => !upload.label || upload.label.length > 4096 || upload.files.length < 1 || upload.files.length > 4 || upload.files.some(file => !file.name || file.name.length > 255 || /[/\\\u0000-\u001F]/u.test(file.name) || !Number.isInteger(file.bytes) || file.bytes < 0 || file.bytes > 65_536 || !/^[a-f0-9]{64}$/u.test(file.sha256))) || !input.submitLabel || input.submitLabel.length > 4096 || !input.receiptText || input.receiptText.length > 4096)
      throw new Error('Interactive replay fixture exceeds its explicit form budget')
    const copy = structuredClone(input)
    // Native HTML form submission canonicalizes textarea newlines to CRLF.
    // Compare the received form values, while preserving the caller's input.
    const expectedValues = copy.fields.map(field => formLineEndings(field.text))
    form = { input: copy, path: `/${nonce}/${input.caseId}/form`, expectedValues, expectedText: JSON.stringify({ receipt: copy.receiptText, values: expectedValues, ...(uploads.length ? { files: copy.uploads!.map(upload => upload.files) } : {}) }) }
    observation = { requests: 0, accepted: 0, refused: 0, observedText: null }
    return { path: form.path, submitPath: `${form.path}/submit`, expectedText: form.expectedText }
  }
  async function handle(request: IncomingMessage, response: ServerResponse) {
    const current = form
    if (!current || ![current.path, `${current.path}/submit`].includes(request.url ?? ''))
      return false
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.setHeader('cache-control', 'no-store')
    response.setHeader('content-security-policy', 'default-src \'none\'; form-action \'self\'; frame-ancestors \'none\'')
    const { input, expectedValues } = current
    if (request.method === 'GET' && request.url === current.path) {
      if (input.fault === 'page-missing') {
        response.statusCode = 404
        response.end('<html><body>Owned form unavailable</body></html>')
        return true
      }
      const fields = input.fields.map((field, index) => input.fault === 'control-missing' && index === 0 ? '' : `<label>${html(field.label)}<textarea name="field${index}"></textarea></label>`)
      fields.push(...(input.uploads ?? []).map((upload, index) => input.fault === 'control-missing' && !input.fields.length && index === 0 ? '' : `<label>${html(upload.label)}<input type="file" name="upload${index}" multiple></label>`))
      if (input.fault === 'control-ambiguous') {
        const firstLabel = input.fields[0]?.label ?? input.uploads![0].label
        fields.push(`<label>${html(firstLabel)}<input name="duplicate" type="${input.fields.length ? 'text' : 'file'}"></label>`)
      }
      response.end(`<html><head><title>Owned interactive evaluation</title></head><body><form method="post"${input.uploads?.length ? ' enctype="multipart/form-data"' : ''} action="${current.path}/submit">${fields.join('')}<button type="submit">${html(input.submitLabel)}</button></form></body></html>`)
      return true
    }
    if (request.method !== 'POST' || request.url !== `${current.path}/submit`) {
      response.statusCode = 405
      response.end('Method refused')
      return true
    }
    observation.requests++
    let body = ''
    let bodyBytes = 0
    const decoder = new StringDecoder('utf8')
    const parts: Buffer[] = []
    for await (const chunk of request) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
      bodyBytes += bytes.length
      if (bodyBytes > (input.uploads?.length ? 2 * 1024 * 1024 : maxFormBodyBytes)) {
        observation.refused++
        response.statusCode = 413
        response.end('Owned form body exceeds budget')
        return true
      }
      if (input.uploads?.length)
        parts.push(bytes)
      else
        body += decoder.write(bytes)
    }
    body += decoder.end()
    const values = new URLSearchParams(body)
    const receivedFiles = input.uploads?.length ? await readProcedureFormUpload(Buffer.concat(parts), request.headers['content-type'] ?? '', expectedValues, input.uploads) : null
    const exact = input.uploads?.length
      ? receivedFiles !== null
      : request.headers['content-type']?.startsWith('application/x-www-form-urlencoded')
        && [...values.keys()].length === input.fields.length
        && expectedValues.every((text, index) => values.getAll(`field${index}`).length === 1 && values.get(`field${index}`) === text)
    if (form !== current || !exact || observation.requests !== 1 || input.fault === 'submission-refused') {
      observation.refused++
      response.statusCode = 403
      response.end('<html><body>Owned form submission refused</body></html>')
      return true
    }
    observation.accepted++
    const text = JSON.stringify({ receipt: input.receiptText, values: input.fault === 'page-changed' ? (expectedValues.length ? expectedValues.map((_, index) => `Different independent value ${index}`) : ['Different independent value']) : expectedValues, ...(receivedFiles ? { files: receivedFiles } : {}) })
    observation.observedText = text
    response.end(`<html><head><title>Owned form receipt</title></head><body><pre>${html(text)}</pre></body></html>`)
    return true
  }
  return {
    prepare,
    handle,
    snapshot: () => ({ ...observation }),
    clear: () => {
      form = null
    },
  }
}
