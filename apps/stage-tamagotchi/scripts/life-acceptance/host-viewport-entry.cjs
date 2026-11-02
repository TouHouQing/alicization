const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const process = require('node:process')
const { pathToFileURL } = require('node:url')

const { app } = require('electron')

assert.equal(process.env.LIFE_QA_HOST_VIEWPORT, '1')
assert.equal(process.env.LIFE_QA_PRIVATE_DESKTOP, undefined)
const project = path.resolve(process.env.LIFE_QA_PROJECT_ROOT || process.cwd())
assert.equal(JSON.parse(fs.readFileSync(path.join(project, 'apps/stage-tamagotchi/package.json'))).name, '@proj-alicization/stage-tamagotchi')
const entry = path.join(project, 'apps/stage-tamagotchi/out/main/index.js')
// The compiled entry installs the same placement guard as the exact QA ASAR.
// This wrapper retains only development module resolution and error reporting.
app.setAppPath(path.join(project, 'apps/stage-tamagotchi'))
void import(pathToFileURL(entry).href).catch((error) => {
  console.error(error)
  process.exitCode = 1
  app.quit()
})
