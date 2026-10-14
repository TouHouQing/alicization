import { generateText } from '@xsai/generate-text'
import { streamText } from '@xsai/stream-text'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDesktopProviderTransport, providerFetch, setProviderTransport } from './provider-fetch'

afterEach(() => setProviderTransport())

describe('desktop provider HTTP transport', () => {
  it('routes a real xsai request with its credentials, payload and abort signal through the configured desktop transport', async () => {
    const native = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: '好' } }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }), { headers: { 'content-type': 'application/json' } }))
    const fallback = vi.fn<typeof fetch>()
    setProviderTransport(createDesktopProviderTransport(native, fallback))
    const controller = new AbortController()
    const result = await generateText({ baseURL: 'https://qa.invalid/v1/', apiKey: 'synthetic-key', model: 'qa-model', messages: [{ role: 'user', content: '你好' }], abortSignal: controller.signal, fetch: providerFetch })
    expect(result.text).toBe('好')
    expect(native).toHaveBeenCalledOnce()
    const [address, init] = native.mock.calls[0]
    expect(String(address)).toBe('https://qa.invalid/v1/chat/completions')
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer synthetic-key')
    expect(init?.signal).toBe(controller.signal)
    expect(init?.credentials).toBe('omit')
    expect(JSON.parse(String(init?.body))).toMatchObject({ model: 'qa-model', messages: [{ role: 'user', content: '你好' }] })
    expect(JSON.parse(String(init?.body))).not.toHaveProperty('fetch')
    expect(fallback).not.toHaveBeenCalled()
  })

  it('keeps an actual xsai SSE reader incremental through the desktop transport', async () => {
    const encoder = new TextEncoder()
    const body = new ReadableStream({ start(controller) {
      for (const content of ['雨', '声'])
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content }, finish_reason: null }] })}\n\n`))
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } })}\n\ndata: [DONE]\n\n`))
      controller.close()
    } })
    setProviderTransport(createDesktopProviderTransport(vi.fn<typeof fetch>(async () => new Response(body, { headers: { 'content-type': 'text/event-stream' } })), vi.fn<typeof fetch>()))
    const stream = streamText({ baseURL: 'https://qa.invalid/v1/', model: 'qa-model', messages: [{ role: 'user', content: '你好' }], fetch: providerFetch })
    const chunks = []
    for await (const chunk of stream.textStream)
      chunks.push(chunk)
    expect(chunks.join('')).toBe('雨声')
    expect(chunks.length).toBeGreaterThan(1)
  })

  it('propagates cancellation without retrying the request through a different transport', async () => {
    const native = vi.fn<typeof fetch>((_address, init) => new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason), { once: true })))
    const fallback = vi.fn<typeof fetch>()
    const controller = new AbortController()
    const pending = createDesktopProviderTransport(native, fallback)('http://127.0.0.1:1234/v1/chat/completions', { method: 'POST', body: 'synthetic', signal: controller.signal })
    const rejected = expect(pending).rejects.toThrow('cancelled')
    controller.abort(new Error('cancelled'))
    await rejected
    expect(native).toHaveBeenCalledOnce()
    expect(fallback).not.toHaveBeenCalled()
  })

  it.each(['data:text/plain,qa', 'https://qa.invalid/integrity'])('retains original fetch semantics for $0', async (address) => {
    const native = vi.fn<typeof fetch>()
    const response = new Response('qa')
    const fallback = vi.fn<typeof fetch>(async () => response)
    const init = address.startsWith('https:') ? { integrity: 'sha256-synthetic' } : undefined
    expect(await createDesktopProviderTransport(native, fallback)(address, init)).toBe(response)
    expect(native).not.toHaveBeenCalled()
    expect(fallback).toHaveBeenCalledWith(address, init)
  })
})
