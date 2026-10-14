const { execFile } = require('node:child_process')
const { createHash } = require('node:crypto')
const fs = require('node:fs/promises')
const http = require('node:http')
const path = require('node:path')
const { promisify } = require('node:util')

const run = promisify(execFile)
exports.startSpeechQa = async function (profile, options = {}) {
  if (!path.basename(profile).startsWith('alicization-life-real-'))
    throw new Error('Isolated speech QA profile required')
  const maxRequests = options.maxRequests ?? 8
  if (!Number.isInteger(maxRequests) || maxRequests < 1 || maxRequests > 64)
    throw new Error('QA speech requests must be bounded to 1..64')
  let requests = 0
  const failures = []
  const utterances = []
  const pending = new Set()
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', '*')
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }
    if (req.url === '/v1/models') {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ data: [{ id: 'qa-sapi', object: 'model' }] }))
      return
    }
    const completion = Promise.withResolvers()
    pending.add(completion.promise)
    const temporaryFiles = []
    try {
      if (req.method !== 'POST' || req.url !== '/v1/audio/speech' || requests >= maxRequests)
        throw new Error('Unsupported QA request')
      let raw = ''
      for await (const chunk of req) {
        raw += chunk
        if (raw.length > 10000)
          throw new Error('Oversized QA request')
      }
      const payload = JSON.parse(raw)
      const input = payload.input
      const speed = typeof payload.speed === 'number' && Number.isFinite(payload.speed) ? Math.max(0.25, Math.min(4, payload.speed)) : 1
      if (typeof input !== 'string' || !input.trim() || input.length > 2000)
        throw new Error('Invalid QA speech input')
      const id = ++requests
      const text = path.join(profile, `qa-speech-${id}.txt`)
      const wav = path.join(profile, `qa-speech-${id}.wav`)
      temporaryFiles.push(text, wav)
      await fs.writeFile(text, input, 'utf8')
      await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'life-current-sapi.ps1'), '-InputPath', text, '-OutputPath', wav, '-Speed', String(speed)], { windowsHide: true, timeout: 20000 })
      res.setHeader('Content-Type', 'audio/wav')
      const audio = await fs.readFile(wav)
      utterances.push({ id, text: input, requestedSpeed: speed, bytes: audio.length, sha256: createHash('sha256').update(audio).digest('hex') })
      res.end(audio)
    }
    catch (error) {
      failures.push(error.message)
      res.writeHead(500)
      res.end('QA synthesis unavailable')
    }
    finally {
      for (const file of temporaryFiles)
        await fs.rm(file, { force: true, maxRetries: 3, retryDelay: 100 }).catch(error => failures.push(`Temporary speech cleanup: ${error.message}`))
      pending.delete(completion.promise)
      completion.resolve()
    }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  return { url: `http://127.0.0.1:${server.address().port}/v1/`, summary: () => ({ adapter: 'isolated-local-SAPI-protocol-QA', requests, failures, utterances }), close: async () => {
    const closed = new Promise(resolve => server.close(resolve))
    server.closeAllConnections()
    await Promise.allSettled(pending)
    await closed
  } }
}
