const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const { createServer } = require('node:http')
const path = require('node:path')

const hash = value => createHash('sha256').update(value).digest('hex')

/** An authenticated owned service; only its independently received bytes create receipts. */
exports.startBusinessFormFixture = async function (root) {
  const session = randomUUID()
  const cases = new Map()
  const requests = []
  const foreignText = `Unpermitted business frame ${randomUUID()}`
  const foreign = createServer((_request, response) => {
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.end(`<h1>${foreignText}</h1>`)
  })
  await new Promise(resolve => foreign.listen(0, '127.0.0.1', resolve))
  const foreignOrigin = `http://127.0.0.1:${foreign.address().port}`
  const server = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url, 'http://127.0.0.1')
      const row = { method: request.method, path: url.pathname, status: null, credentialPresent: Boolean(request.headers.cookie) }
      requests.push(row)
      function finish(status, body, headers = {}) {
        row.status = status
        response.writeHead(status, { 'content-type': 'text/html; charset=utf-8', ...headers })
        response.end(body)
      }
      if (url.pathname === '/favicon.ico')
        return finish(204, '')
      const match = /^\/(login|case|details|save|export)\/([1-3])$/u.exec(url.pathname)
      if (!match)
        return finish(404, 'No such owned route')
      const [, route, number] = match
      const item = cases.get(Number(number))
      if (!item)
        return finish(404, 'Case not allocated')
      if (route === 'login' && request.method === 'GET')
        return finish(302, '', { 'set-cookie': `qa-session=${session}; HttpOnly; SameSite=Lax; Path=/`, 'location': `/case/${number}` })
      if (route === 'export' && request.method === 'GET') {
        if (url.searchParams.get('token') !== item.token)
          return finish(403, 'Export token required')
        if (item.submissions !== 1)
          return finish(409, 'A real accepted form is required first')
        if (item.exports !== 0)
          return finish(409, 'Export already consumed')
        item.exports++
        return finish(200, item.exportBytes, { 'content-type': 'application/octet-stream', 'content-disposition': `attachment; filename="business-report-${number}.txt"`, 'content-length': String(item.exportBytes.length) })
      }
      if (request.headers.cookie !== `qa-session=${session}`)
        return finish(401, 'The original authenticated browser session is required')
      if (route === 'case' && request.method === 'GET') {
        return finish(200, `<title>Alicization business form ${number}</title><h1>自有业务测试账户</h1><form action="/save/${number}" method="post"><label for="qa-note">QA 浏览器留言</label><input id="qa-note" name="note"/><button>提交业务表单</button></form><iframe id="details" src="/details/${number}"></iframe><iframe src="${foreignOrigin}"></iframe><p id="result"></p><script>document.querySelector('form').onsubmit=async event=>{event.preventDefault();const frame=document.querySelector('#details').contentDocument;const file=frame.querySelector('input[type=file]').files[0];if(!file)throw Error('Attachment missing');const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);const response=await fetch('/save/${number}',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({note:document.querySelector('#qa-note').value,category:frame.querySelector('select').value,attachment:{name:file.name,base64:btoa(binary)}})});document.querySelector('#result').textContent=response.ok?'业务已接收，回执已保存': '业务提交失败';};</script>`)
      }
      if (route === 'details' && request.method === 'GET')
        return finish(200, `<form action="/save/${number}" method="post"><label for="category">QA 交付分类</label><select id="category" name="category"><option value="">请选择</option><option value="illustration">绘画</option><option value="document">文档</option></select><label for="attachment">QA 附件</label><input id="attachment" name="attachment" type="file"/></form>`)
      if (route === 'save' && request.method === 'POST') {
        const chunks = []
        let total = 0
        for await (const chunk of request) {
          total += chunk.length
          if (total > 65536)
            return finish(413, 'Owned request exceeded its bound')
          chunks.push(chunk)
        }
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          assert.equal(body.note, item.marker)
          assert.equal(body.category, 'illustration')
          assert.equal(body.attachment?.name, item.attachmentName)
          assert.equal(typeof body.attachment.base64, 'string')
          const bytes = Buffer.from(body.attachment.base64, 'base64')
          assert.equal(bytes.toString('base64'), body.attachment.base64)
          assert.deepEqual(bytes, item.attachmentBytes)
          assert.equal(item.submissions, 0, 'A form submission cannot be repeated')
          const receipt = { receiptId: item.receiptId, round: Number(number), note: body.note, category: body.category, attachmentName: body.attachment.name, attachmentBytes: bytes.length, attachmentSha256: hash(bytes), exportSha256: hash(item.exportBytes) }
          await fs.writeFile(item.receiptPath, JSON.stringify(receipt), { flag: 'wx' })
          item.submissions++
          item.receipt = receipt
          return finish(200, 'Accepted')
        }
        catch {
          item.rejected++
          return finish(400, 'The actual received fields or bytes do not match this owned case')
        }
      }
      return finish(405, 'Unsupported owned operation')
    })().catch(() => {
      if (!response.headersSent)
        response.writeHead(500)
      response.end('Owned fixture failed')
    })
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  return {
    origin,
    foreignText,
    allocate: async (round, marker) => {
      assert.ok([1, 2, 3].includes(round) && !cases.has(round))
      const attachmentName = `attachment-${round}-中文.txt`
      const attachmentPath = path.join(root, attachmentName)
      const attachmentBytes = Buffer.from(`Actual attachment ${round} 中文🙂 ${randomUUID()}`, 'utf8')
      await fs.writeFile(attachmentPath, attachmentBytes, { flag: 'wx' })
      const exportBytes = Buffer.from(`Accepted business report ${round}\n${marker}\nillustration\n${hash(attachmentBytes)}\n`, 'utf8')
      const item = { marker, attachmentName, attachmentPath, attachmentBytes, attachmentMtimeMs: (await fs.stat(attachmentPath)).mtimeMs, receiptId: randomUUID(), receiptPath: path.join(root, `business-receipt-${round}.json`), exportPath: path.join(root, `business-report-${round}.txt`), exportBytes, token: randomUUID(), submissions: 0, exports: 0, rejected: 0, receipt: null }
      cases.set(round, item)
      return { ...item, exportUrl: `${origin}/export/${round}?token=${item.token}` }
    },
    snapshot: () => ({ requests: structuredClone(requests), cases: [...cases].map(([round, item]) => ({ round, submissions: item.submissions, exports: item.exports, rejected: item.rejected, receipt: item.receipt })) }),
    close: async () => {
      for (const listener of [server, foreign]) {
        listener.closeAllConnections()
        await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()))
      }
    },
  }
}
