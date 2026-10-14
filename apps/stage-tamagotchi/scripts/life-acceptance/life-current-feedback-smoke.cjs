const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions } = require('./electron-launch.cjs')
const { observeLife } = require('./experience-life-oracle.cjs')
const { openLifeSettings } = require('./open-life-settings.cjs')

async function main() {
  assert.equal(process.env.LIFE_QA_DEV_BUILD, '1')
  const workspace = path.resolve(__dirname, '../../../..')
  const file = await fs.realpath(process.env.LIFE_QA_EXPERIENCE_PARENT_REPORT)
  assert.ok(file.startsWith(`${path.join(workspace, 'output')}${path.sep}`))
  const parent = JSON.parse(await fs.readFile(file, 'utf8'))
  assert.equal(parent.syntheticIdentity, true)
  const profile = await fs.realpath(parent.profile)
  assert.equal(path.dirname(profile).toLowerCase(), (await fs.realpath(os.tmpdir())).toLowerCase())
  assert.match(await fs.readFile(path.join(profile, 'alicizations/cards/default/SOUL.md'), 'utf8'), /QA/u)
  const before = await observeLife(profile, parent.output)
  const project = before.goals.find(goal => goal.kind === 'personal-project' && goal.source.personalDevelopment?.shares.length && !goal.source.personalDevelopment.feedback.length)
  assert.ok(project)
  const app = await _electron.launch(launchOptions(profile))
  let settings
  try {
    let stage
    const deadline = Date.now() + 30000
    while (!stage && Date.now() < deadline) {
      stage = app.windows().find(page => page.url().endsWith('#/'))
      if (!stage)
        await new Promise(resolve => setTimeout(resolve, 200))
    }
    assert.ok(stage)
    await app.evaluate(({ app, BrowserWindow }) => {
      app.on('web-contents-created', (_, contents) => contents.setAudioMuted(true))
      for (const window of BrowserWindow.getAllWindows())
        window.webContents.setAudioMuted(true)
    })
    settings = await openLifeSettings(app, stage)
    // eslint-disable-next-line unicorn/prefer-dom-node-text-content -- Observe only visible text in this synthetic settings window.
    await fs.writeFile(path.join(parent.output, 'feedback-surface.json'), JSON.stringify({ url: settings.url(), content: await settings.locator('body').innerText() }, null, 2))
    await settings.screenshot({ path: path.join(parent.output, 'feedback-surface.png') })
    const panel = settings.locator(`[data-life-project="${project.id}"]`)
    await panel.locator('[data-life-project-feedback="positive"]').click()
    await settings.getByRole('alert').waitFor()
    assert.match(await settings.getByRole('alert').textContent(), /展示.*作品|show this piece/u)
    await settings.screenshot({ path: path.join(parent.output, '13-project-feedback.png') })
    const after = await observeLife(profile, parent.output)
    assert.equal(after.goals.find(goal => goal.id === project.id).source.personalDevelopment.feedback.length, 0)
    const report = { format: 'life-native-feedback-scene-v1', passed: true, scope: 'Actual settings entry and rejection of feedback lacking a presentation receipt in the prior failed development run; not positive feedback, release or speech verification evidence.', parentReport: file, privateDesktop: process.env.LIFE_QA_PRIVATE_DESKTOP, unpresentedFeedbackRejected: true }
    await fs.writeFile(path.join(workspace, 'output/life-closure-feedback-native-dev.json'), JSON.stringify(report, null, 2))
    console.info(JSON.stringify({ passed: true, unpresentedFeedbackRejected: true }))
  }
  catch (error) {
    if (settings) {
      await settings.screenshot({ path: path.join(parent.output, 'feedback-failure.png') })
      // eslint-disable-next-line unicorn/prefer-dom-node-text-content -- Preserve the actual visible failure in this own QA surface.
      await fs.writeFile(path.join(parent.output, 'feedback-failure.json'), JSON.stringify({ url: settings.url(), content: await settings.locator('body').innerText() }, null, 2))
    }
    throw error
  }
  finally {
    await app.close()
  }
}
main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
