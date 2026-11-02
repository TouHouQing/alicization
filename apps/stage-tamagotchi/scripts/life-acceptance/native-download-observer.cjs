/** Observe actual native callbacks; every original operation is forwarded unchanged. */
exports.observeNativeDownloads = async function (app) {
  return app.evaluate(({ app, BrowserWindow }) => {
    const sessions = new WeakSet()
    const rows = []
    globalThis.alicizationQaNativeDownloads = rows
    function observe(contents) {
      const session = contents.session
      if (sessions.has(session))
        return
      sessions.add(session)
      session.on('will-download', (_event, item, initiator) => {
        const url = new URL(item.getURL())
        const row = { startedAt: Date.now(), sourceId: initiator.id, url: `${url.origin}${url.pathname}`, events: [], cancels: [] }
        rows.push(row)
        const cancel = item.cancel
        item.cancel = function (...args) {
          row.cancels.push({ at: Date.now(), stack: new Error('Observed native cancellation').stack })
          return Reflect.apply(cancel, this, args)
        }
        item.on('updated', (_event, state) => row.events.push({ at: Date.now(), type: 'updated', state, received: item.getReceivedBytes(), total: item.getTotalBytes() }))
        item.once('done', (_event, state) => row.events.push({ at: Date.now(), type: 'done', state, received: item.getReceivedBytes(), total: item.getTotalBytes() }))
      })
    }
    app.on('web-contents-created', (_event, contents) => observe(contents))
    for (const window of BrowserWindow.getAllWindows())
      observe(window.webContents)
    return { scope: 'Actual native DownloadItem metadata and forwarded cancel calls; no synthetic events, state changes or network substitution.' }
  })
}

exports.readNativeDownloads = async app => app.evaluate(() => globalThis.alicizationQaNativeDownloads ?? [])
