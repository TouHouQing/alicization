const { execFileSync } = require('node:child_process')
const path = require('node:path')
const process = require('node:process')

const { app, BrowserWindow } = require('electron')

const identity = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'assert-private-desktop.ps1'), '-ExpectedDesktop', process.env.LIFE_QA_PRIVATE_DESKTOP], { windowsHide: true, encoding: 'utf8' }))
app.whenReady().then(() => {
  globalThis.__lifeQaDesktopProbe = { ...identity, windowsCreated: BrowserWindow.getAllWindows().length }
})
