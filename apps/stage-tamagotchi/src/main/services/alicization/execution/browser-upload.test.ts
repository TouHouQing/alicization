import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, toNamespacedPath } from 'node:path'

import { chromium } from 'playwright'
import { describe, expect, it } from 'vitest'

import { prepareBrowserUpload } from './browser-upload'

describe('approved browser upload snapshots', () => {
  it('sends the exact approved snapshot through a real Chromium file input after the original changes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-real-upload-'))
    const approved = 'approved upload: 雨声陪伴\nExact bytes 12345.'
    const changed = 'host changed this after approval'
    const source = join(root, 'report.txt')
    await writeFile(source, approved)
    const snapshot = await prepareBrowserUpload([source], join(root, 'staging'))
    const receipts: Array<{ sha256: string, bytes: number, body: string }> = []
    const server = createServer((request, response) => {
      if (request.url === '/receive' && request.method === 'POST') {
        const chunks: Uint8Array[] = []
        request.on('data', (chunk: Uint8Array) => chunks.push(chunk))
        request.on('end', () => {
          const bytes = Buffer.concat(chunks)
          const receipt = { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, body: bytes.toString('utf8') }
          receipts.push(receipt)
          response.setHeader('content-type', 'application/json')
          response.end(JSON.stringify(receipt))
        })
      }
      else {
        response.setHeader('content-type', 'text/html; charset=utf-8')
        response.end('<input type="file" id="file"><button id="send">send</button><output id="receipt"></output><script>send.onclick=async()=>{const result=await fetch("/receive",{method:"POST",body:file.files[0]});receipt.textContent=await result.text()}</script>')
      }
    })
    const executable = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
    try {
      browser = await chromium.launch({ ...(executable ? { executablePath: executable } : {}), headless: true })
      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
      const page = await browser.newPage()
      const port = (server.address() as { port: number }).port
      await page.goto(`http://127.0.0.1:${port}`)
      const protocol = await page.context().newCDPSession(page)
      const { root: document } = await protocol.send('DOM.getDocument')
      const { nodeId } = await protocol.send('DOM.querySelector', { nodeId: document.nodeId, selector: '#file' })
      await protocol.send('DOM.setFileInputFiles', { nodeId, files: [toNamespacedPath(snapshot.files[0]!.path)] })
      await writeFile(source, changed)
      expect(await page.evaluate('document.querySelector("#file").files[0].text()')).toBe(approved)
      await page.click('#send')
      await page.waitForFunction('document.querySelector("#receipt").textContent !== ""')
      const observed = JSON.parse((await page.locator('#receipt').textContent())!)
      expect(receipts).toEqual([{ sha256: snapshot.files[0]!.sha256, bytes: snapshot.files[0]!.bytes, body: approved }])
      expect(observed).toEqual(receipts[0])
      expect(await readFile(source, 'utf8')).toBe(changed)
    }
    finally {
      await browser?.close()
      if (server.listening)
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
      await snapshot.dispose()
      await rm(root, { recursive: true, force: true })
    }
  }, 30_000)

  it('freezes the approved bytes while the original changes and cleans only its owned stage', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-upload-'))
    try {
      const source = join(root, 'source.txt')
      await writeFile(source, 'approved bytes')
      const snapshot = await prepareBrowserUpload([source], join(root, 'staging'))
      await writeFile(source, 'host edited the source later')
      expect(await readFile(snapshot.files[0]!.path, 'utf8')).toBe('approved bytes')
      expect(snapshot.files[0]).toMatchObject({ name: 'source.txt', bytes: 14, sha256: expect.stringMatching(/^[a-f\d]{64}$/u) })
      await snapshot.dispose()
      await expect(stat(snapshot.files[0]!.path)).rejects.toMatchObject({ code: 'ENOENT' })
      expect(await readFile(source, 'utf8')).toBe('host edited the source later')
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })

  it('rejects relative paths, excess files, directories, cancelled reads and oversized files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-upload-budget-'))
    try {
      const source = join(root, 'large.txt')
      await writeFile(source, new Uint8Array(4 * 1024 * 1024 + 1))
      await expect(prepareBrowserUpload(['relative.txt'], root)).rejects.toThrow('ABSOLUTE_FILES')
      await expect(prepareBrowserUpload(Array.from({ length: 5 }, () => source), root)).rejects.toThrow('ABSOLUTE_FILES')
      await expect(prepareBrowserUpload([source], root)).rejects.toThrow('BYTE_BUDGET')
      await expect(prepareBrowserUpload([root], root)).rejects.toThrow('BYTE_BUDGET')
      const controller = new AbortController()
      controller.abort(new Error('host-cancelled'))
      await expect(prepareBrowserUpload([source], root, controller.signal)).rejects.toThrow('host-cancelled')
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })
})
