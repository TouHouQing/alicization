const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const process = require('node:process')

const { isOwnedHostViewport } = require('./electron-launch.cjs')
const { sampleLive2D } = require('./live2d-product-checks.cjs')

exports.runLifeHistoryProductChecks = async function ({ settings, stage, root, report, capture, check, click }) {
  assert.ok(process.env.LIFE_QA_PRIVATE_DESKTOP || isOwnedHostViewport(report))
  const fixture = JSON.parse(await fs.readFile(path.join(root, 'life-history-fixture.json'), 'utf8'))
  assert.equal(fixture.ids.length, 65)
  assert.equal(fixture.writerClosedBeforeLaunch, true)
  const base = settings.url().split('#')[0]
  report.historyExperiences = []
  for (let repetition = 0; repetition < 3; repetition++) {
    await settings.goto(`${base}#/settings/life`)
    if (repetition)
      await settings.reload()
    const section = settings.locator('[data-life-obligation-history]')
    await section.locator('summary').waitFor({ timeout: 30000 })
    await click(section.locator('summary'))
    await settings.waitForFunction(() => document.querySelectorAll('[data-history-obligation-id]').length === 20, undefined, { timeout: 15000 })
    check(`History ${repetition}: the initial page is bounded to twenty rows`, await section.locator('[data-history-obligation-id]').count() === 20)
    let pages = 1
    while (await section.locator('[data-life-history-more]').count()) {
      assert.ok(pages < 10, 'History acceptance must stay inside its finite page budget')
      const previous = await section.locator('[data-history-obligation-id]').count()
      await click(section.locator('[data-life-history-more]'))
      await settings.waitForFunction(previous => document.querySelectorAll('[data-history-obligation-id]').length > previous, previous, { timeout: 10000 })
      pages++
    }
    const ids = await section.locator('[data-history-obligation-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-history-obligation-id')))
    check(`History ${repetition}: every historical fixture responsibility can be reached once`, new Set(ids).size === ids.length && fixture.ids.every(id => ids.includes(id)))
    check(`History ${repetition}: pagination reaches records beyond the original twenty`, pages >= 4)
    check(`History ${repetition}: history fits the settings viewport`, await settings.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    check(`History ${repetition}: browsing retains the actual Live2D model`, (await sampleLive2D(stage)).models.length > 0)
    await capture(settings, `life-history-complete-${repetition}`)
    await click(section.locator('[data-life-history-refresh]'))
    await settings.waitForFunction(() => document.querySelectorAll('[data-history-obligation-id]').length === 20, undefined, { timeout: 10000 })
    check(`History ${repetition}: explicit refresh returns to a bounded current page`, await section.locator('[data-history-obligation-id]').count() === 20)
    report.historyExperiences.push({ repetition, pages, matchedFixtureCount: fixture.ids.filter(id => ids.includes(id)).length, uniqueRows: new Set(ids).size, refreshedRows: 20 })
  }
}
