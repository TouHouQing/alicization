const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')
const process = require('node:process')
const { pathToFileURL } = require('node:url')

const sha = bytes => createHash('sha256').update(bytes).digest('hex')
let loaded

// Use the source-bound production evaluator's native Job and identity fences.
// This helper only prepares/observes/disposes its passive editor, never types.
async function fixtureModule() {
  if (!loaded) {
    loaded = (async () => {
      const bundle = path.resolve(process.env.LIFE_PRODUCT_NATIVE_METHOD_BUNDLE || '')
      assert.ok(bundle.startsWith(`${path.resolve('output')}${path.sep}`))
      const manifest = JSON.parse(await fs.readFile(path.join(bundle, 'bundle-source.json'), 'utf8'))
      assert.equal(manifest.format, 'alicization-native-method-product-bundle-v1')
      for (const entry of manifest.sources) {
        const source = path.resolve(entry.path)
        assert.ok(source.startsWith(`${process.cwd()}${path.sep}`))
        assert.equal(sha(await fs.readFile(source)), entry.sha256)
      }
      const entry = path.join(bundle, 'native-method-product-fixture.mjs')
      assert.equal(sha(await fs.readFile(entry)), manifest.bundleSha256)
      return import(pathToFileURL(entry).href)
    })()
  }
  return loaded
}

exports.startNativeMethodFixture = async function (directory, saveLabel) {
  const actual = await fixtureModule()
  await fs.mkdir(directory)
  return actual.startNativeMethodFixture({ root: await fs.realpath(directory), saveLabel })
}

exports.startNativeMenuFixture = async function (directory) {
  const actual = await fixtureModule()
  await fs.mkdir(directory)
  return actual.startNativeMenuFixture({ root: await fs.realpath(directory) })
}
