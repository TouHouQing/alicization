import type { BrowserPageObservation } from './browser-observation'

import { EventEmitter } from 'node:events'
import { existsSync } from 'node:fs'

import { chromium } from 'playwright'
import { describe, expect, it } from 'vitest'

import { createBrowserCdp } from './browser-cdp'
import { browserPageScript } from './browser-observation'

async function fixture() {
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true })
  const context = await browser.newContext({ viewport: { width: 1100, height: 760 } })
  const page = await context.newPage()
  const protocol = await context.newCDPSession(page)
  const inputEvents: Array<{ method: string, parameters: Record<string, unknown> }> = []
  const port = Object.assign(new EventEmitter(), {
    attach: () => {},
    detach: () => {},
    isAttached: () => false,
    sendCommand: async (method: string, parameters: Record<string, unknown>, sessionId?: string) => {
      // These fixtures exercise same-process nested documents. OOPIF coverage
      // requires the separate child-session transport; never flatten it away.
      if (sessionId)
        throw new Error('Unexpected out-of-process fixture frame')
      if (method.startsWith('Input.'))
        inputEvents.push({ method, parameters })
      return protocol.send(method as Parameters<typeof protocol.send>[0], parameters as never)
    },
  })
  const cdp = createBrowserCdp(port as unknown as Parameters<typeof createBrowserCdp>[0], browserPageScript)
  const innerHtml = '<style>body{margin:16px}button{width:120px;height:36px}</style><input id="note" aria-label="深层字段"><button id="save">深层保存</button><button id="other">相邻操作</button><script>window.saved=0;window.other=0;document.querySelector("#save").onclick=e=>{if(e.isTrusted)window.saved++};document.querySelector("#other").onclick=e=>{if(e.isTrusted)window.other++}</script>'
  await page.setContent('<input aria-label="顶层字段"><iframe id="outer" style="width:700px;height:420px;border:8px solid black;margin:20px;transform:scale(.9);transform-origin:top left"></iframe>')
  await page.locator('#outer').evaluate((element, html) => {
    (element as unknown as { srcdoc: string }).srcdoc = `<input aria-label="中层字段"><iframe id="inner" style="width:500px;height:260px;border:6px solid black;margin:18px" srcdoc="${html.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"></iframe>`
  }, innerHtml)
  const inner = page.frameLocator('#outer').frameLocator('#inner')
  await inner.getByRole('button', { name: '深层保存' }).waitFor()
  const frame = page.frames().find(frame => frame.parentFrame()?.parentFrame() === page.mainFrame())!
  const observe = () => cdp.observe<BrowserPageObservation>(12000, false)
  const target = async (name: string) => {
    const matches = (await observe()).elements.filter(element => element.text === name)
    expect(matches).toHaveLength(1)
    return matches[0]!
  }
  return { page, inner, frame, cdp, inputEvents, target, close: async () => { cdp.close(); await context.close(); await browser.close() } }
}

describe('actual browser input through nested same-process frames', () => {
  it('types Unicode and delivers one trusted click through scaled ancestors without touching siblings', async () => {
    const f = await fixture()
    try {
      const text = '雨声🙂 & $()\n第二行'
      const field = await f.target('深层字段')
      // A single-line input must reject multiline content before any key event.
      expect(await f.cdp.mutate(field, { operation: 'type', text, clear: true }, () => {})).toMatchObject({ ok: false, errorCode: 'LOCAL_BROWSER_MULTILINE_TARGET_REQUIRED' })
      expect(f.inputEvents).toHaveLength(0)
      expect(await f.cdp.mutate(await f.target('深层字段'), { operation: 'type', text: '雨声🙂 & $()', clear: true }, () => {})).toMatchObject({ ok: true, inputMode: 'trusted-cdp' })
      expect(await f.inner.getByRole('textbox').inputValue()).toBe('雨声🙂 & $()')
      expect(await f.page.getByRole('textbox', { name: '顶层字段' }).inputValue()).toBe('')
      expect(await f.page.frameLocator('#outer').getByRole('textbox', { name: '中层字段' }).inputValue()).toBe('')
      expect(await f.cdp.mutate(await f.target('深层保存'), { operation: 'click' }, () => {})).toMatchObject({ ok: true })
      expect(await f.frame.evaluate('({saved:window.saved,other:window.other})')).toEqual({ saved: 1, other: 0 })
    }
    finally { await f.close() }
  })

  it('refuses a frame document replacement even when the new control has identical selector and label', async () => {
    const f = await fixture()
    try {
      const stale = await f.target('深层保存')
      await f.page.frameLocator('#outer').locator('#inner').evaluate((element) => {
        (element as unknown as { srcdoc: string }).srcdoc = '<button id="save">深层保存</button>'
      })
      await f.inner.getByRole('button', { name: '深层保存' }).waitFor()
      await expect(f.cdp.mutate(stale, { operation: 'click' }, () => {})).rejects.toThrow()
      expect(f.inputEvents).toHaveLength(0)
    }
    finally { await f.close() }
  })

  it('does not press at the old coordinate when a hover moves the intended button over a sibling', async () => {
    const f = await fixture()
    try {
      await f.frame.evaluate(`document.querySelector('#save').addEventListener('mouseenter', () => {
        const save=document.querySelector('#save'); const other=document.querySelector('#other');
        other.style.position='absolute'; other.style.left=save.offsetLeft+'px'; other.style.top=save.offsetTop+'px';
        save.style.transform='translateY(90px)';
      },{once:true})`)
      const outcome = await f.cdp.mutate(await f.target('深层保存'), { operation: 'click' }, () => {})
      const actual = await f.frame.evaluate<{ saved: number, other: number, transform: string }>('({saved:window.saved,other:window.other,transform:document.querySelector("#save").style.transform})')
      expect(actual.transform).toBe('translateY(90px)')
      expect(outcome, JSON.stringify(actual)).toMatchObject({ ok: false })
      expect(f.inputEvents.filter(event => event.method === 'Input.dispatchMouseEvent' && event.parameters.type === 'mousePressed')).toHaveLength(0)
      expect(await f.frame.evaluate('({saved:window.saved,other:window.other})')).toEqual({ saved: 0, other: 0 })
    }
    finally { await f.close() }
  })

  it('refuses a deep control occluded by an ancestor overlay before sending input', async () => {
    const f = await fixture()
    try {
      const target = await f.target('深层保存')
      await f.page.evaluate(`document.body.insertAdjacentHTML('beforeend','<div style="position:fixed;inset:0;z-index:1000">遮挡层</div>')`)
      expect(await f.cdp.mutate(target, { operation: 'click' }, () => {})).toMatchObject({ ok: false, errorCode: 'LOCAL_BROWSER_BLOCKED_TARGET' })
      expect(f.inputEvents).toHaveLength(0)
      expect(await f.frame.evaluate('({saved:window.saved,other:window.other})')).toEqual({ saved: 0, other: 0 })
    }
    finally { await f.close() }
  })

  it('does not type when a deep focus handler transfers focus to the top document', async () => {
    const f = await fixture()
    try {
      await f.frame.evaluate(`document.querySelector('#note').addEventListener('focus', () => top.document.querySelector('input').focus(), {once:true})`)
      await expect(f.cdp.mutate(await f.target('深层字段'), { operation: 'type', text: '不得泄露到上层', clear: true }, () => {})).rejects.toThrow('LOCAL_BROWSER_FOCUS_CHANGED')
      expect(f.inputEvents).toHaveLength(0)
      expect(await f.inner.getByRole('textbox').inputValue()).toBe('')
      expect(await f.page.getByRole('textbox', { name: '顶层字段' }).inputValue()).toBe('')
    }
    finally { await f.close() }
  })
})
