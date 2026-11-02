import type { ProcedureFormFixtureInput } from './procedure-browser-replay-types'

import { createHash } from 'node:crypto'

/** Parse a bounded native multipart submission; filenames never stand in for received bytes. */
export async function readProcedureFormUpload(body: Uint8Array, contentType: string, values: string[], uploads: NonNullable<ProcedureFormFixtureInput['uploads']>) {
  if (!contentType.startsWith('multipart/form-data;') || contentType.length > 512)
    return null
  let data: FormData
  try {
    data = await new Request('http://127.0.0.1/owned-upload', { method: 'POST', headers: { 'content-type': contentType }, body: Uint8Array.from(body) }).formData()
  }
  catch { return null }
  if ([...data.keys()].length !== values.length + uploads.reduce((total, upload) => total + upload.files.length, 0)
    || values.some((text, index) => data.getAll(`field${index}`).length !== 1 || data.get(`field${index}`) !== text)) {
    return null
  }
  const received: NonNullable<ProcedureFormFixtureInput['uploads']>[number]['files'][] = []
  for (const [index, upload] of uploads.entries()) {
    const entries = data.getAll(`upload${index}`)
    if (entries.length !== upload.files.length)
      return null
    const files = []
    for (const [fileIndex, entry] of entries.entries()) {
      const expected = upload.files[fileIndex]
      if (typeof entry === 'string' || entry.name !== expected.name || entry.size !== expected.bytes || entry.size > 65_536)
        return null
      const sha256 = createHash('sha256').update(new Uint8Array(await entry.arrayBuffer())).digest('hex')
      if (sha256 !== expected.sha256)
        return null
      files.push({ name: entry.name, bytes: entry.size, sha256 })
    }
    received.push(files)
  }
  return received
}
