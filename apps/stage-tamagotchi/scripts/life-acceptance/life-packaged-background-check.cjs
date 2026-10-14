const assert = require('node:assert/strict')
const { execFile } = require('node:child_process')
const fs = require('node:fs/promises')
const { createRequire } = require('node:module')
const path = require('node:path')
const process = require('node:process')
const { promisify } = require('node:util')

async function main() {
  const workspace = path.resolve(__dirname, '../../../..')
  const release = path.resolve(process.argv[2] || process.env.LIFE_QA_RELEASE || '')
  assert.ok(release.startsWith(`${path.join(workspace, 'apps/stage-tamagotchi/dist')}${path.sep}`))
  const executable = path.join(release, 'win-unpacked/alicization.exe')
  const requireApp = createRequire(path.join(workspace, 'apps/stage-tamagotchi/package.json'))
  const requireBuilder = createRequire(requireApp.resolve('electron-builder'))
  const requireLib = createRequire(requireBuilder.resolve('app-builder-lib'))
  const fuses = requireLib('@electron/fuses')
  const wire = await fuses.getCurrentFuseWire(executable)
  // @electron/fuses 1.8.0 encodes ENABLE as ASCII '1' (49). A disabled/unknown
  // fuse must never fall through to ordinary GUI startup during background QA.
  assert.equal(wire[fuses.FuseV1Options.RunAsNode], 49, 'Only an explicitly enabled RunAsNode binary may be tested in background')
  const resources = path.join(release, 'win-unpacked/resources')
  const sqlite = path.join(resources, 'app.asar.unpacked/node_modules/sqlite3/lib/sqlite3.js')
  const vectorDirectory = path.join(resources, 'sqlite-vec')
  const vector = (await fs.readdir(vectorDirectory)).find(file => file.endsWith('.dll'))
  assert.ok(vector)
  const script = `
    const sqlite = require(${JSON.stringify(sqlite)});
    const db = new sqlite.Database(':memory:');
    db.loadExtension(${JSON.stringify(path.join(vectorDirectory, vector))}, error => {
      if (error) throw error;
      db.serialize(() => {
        db.run('CREATE TABLE proof (value TEXT NOT NULL)');
        db.run('INSERT INTO proof(value) VALUES (?)', ['background QA']);
        db.get('SELECT value, vec_version() AS vectorVersion FROM proof', (error, row) => {
          if (error) throw error;
          if (row.value !== 'background QA') throw new Error('Native database result mismatch');
          db.close(error => {
            if (error) throw error;
            console.log(JSON.stringify({ sqliteReadWrite: true, vectorVersion: row.vectorVersion, modulesAbi: process.versions.modules, electronVersion: process.versions.electron ?? null, windowsConstructed: 0 }));
          });
        });
      });
    });
  `
  const { stdout } = await promisify(execFile)(executable, ['-e', script], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, windowsHide: true, timeout: 15000 })
  const result = JSON.parse(stdout.trim())
  assert.equal(result.sqliteReadWrite, true)
  assert.equal(result.windowsConstructed, 0)
  const report = { format: 'life-packaged-background-check-v1', passed: true, release, executable, runAsNodeFuseEnabled: true, ...result, scope: 'Actual packaged Electron binary and native SQLite/vector extensions in Node mode, in-memory database only; no renderer, window, speech or installer interaction' }
  const target = path.resolve(process.argv[3] || process.env.LIFE_QA_REPORT || path.join(workspace, 'output/life-acceptance/experience-packaged-background.json'))
  assert.ok(target.startsWith(`${path.join(workspace, 'output/life-acceptance')}${path.sep}`))
  await fs.writeFile(target, JSON.stringify(report, null, 2))
  console.info(JSON.stringify(report))
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
