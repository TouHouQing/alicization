const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { createHash, randomUUID } = require('node:crypto')
const fs = require('node:fs')
const { createRequire } = require('node:module')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

// Compile and run the actual System plugin and production macro. The three
// directory branches must preserve caller registers and explicit overrides.
async function main() {
  assert.equal(process.platform, 'win32')
  const workspace = path.resolve(__dirname, '../../../..')
  const appRoot = path.join(workspace, 'apps/stage-tamagotchi')
  const requireApp = createRequire(path.join(appRoot, 'package.json'))
  const requireBuilder = createRequire(requireApp.resolve('electron-builder'))
  const requireLib = createRequire(requireBuilder.resolve('app-builder-lib'))
  const { NSIS_PATH, NsisTargetOptions, nsisTemplatesDir } = requireLib('./targets/nsis/nsisUtil.js')
  NsisTargetOptions.resolve({})
  const nsis = await NSIS_PATH()
  const compiler = path.join(nsis, 'Bin', 'makensis.exe')
  const build = path.join(appRoot, 'build')
  const vendorHeader = '; Vendored from electron-builder 26.8.1 (MIT), copyright (c) 2015 Loopline Systems.\n; Only multiUser.nsh include changes; attribution: resources/licenses/electron-builder-MIT.txt.\n'
  const originalMulti = fs.readFileSync(path.join(nsisTemplatesDir, 'multiUser.nsh'), 'utf8')
  const start = originalMulti.indexOf('  !macro setInstallModePerUser')
  const end = originalMulti.indexOf('  !macroend', start) + '  !macroend'.length
  assert.ok(start >= 0 && end > start)
  assert.equal(fs.readFileSync(path.join(build, 'nsis/multiUser.nsh'), 'utf8'), `${vendorHeader + originalMulti.slice(0, start)}  !include "\${BUILD_RESOURCES_DIR}\\nsis-safe-per-user.nsh"${originalMulti.slice(end)}`)
  const compilerEnvironment = { ...process.env, ALICIZATION_NSIS_UPSTREAM_TEMPLATES: nsisTemplatesDir }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alicization-nsis-path-'))
  const nonce = randomUUID()
  const registry = `Software\\AlicizationNsisQA\\${nonce}`
  const source = path.join(root, 'paths.nsi')
  const executable = path.join(root, 'paths.exe')
  const resultFile = path.join(root, 'native.txt')
  const output = path.join(workspace, 'output', `nsis-per-user-${nonce}.json`)
  const literal = value => value.replaceAll('$', '$$').replaceAll('"', '$\\"')
  const template = String.raw`
Unicode true
RequestExecutionLevel user
SilentInstall silent
OutFile "@@EXE@@"
!include LogicLib.nsh
!define BUILD_RESOURCES_DIR "@@BUILD@@"
!define INSTALL_REGISTRY_KEY "@@REG@@"
!define FOLDERID_UserProgramFiles {5CD7AEE2-2219-4A67-B85D-6C9CE15660CB}
!define KF_FLAG_CREATE 0x00008000
!define APP_FILENAME AlicizationNsisPathProbe
Var installMode
Var perUserInstallationFolder
!macro GetDParameter outVar
  StrCpy \${outVar} $R9
!macroend
!include "@@BUILD@@\nsis-startup.nsh"
!include "@@BUILD@@\nsis-safe-per-user.nsh"
Section
  ReadRegStr $0 HKCU "\${INSTALL_REGISTRY_KEY}" InstallLocation
  \${If} $0 != ""
    SetErrorLevel 10
    Quit
  \${EndIf}
  StrCpy $R9 ""
  StrCpy $1 preserve-one
  StrCpy $2 preserve-two
  StrCpy $R7 0
  loop:
    !insertmacro setInstallModePerUser
    \${If} $1 != preserve-one
    \${OrIf} $2 != preserve-two
    \${OrIf} $INSTDIR == ""
      SetErrorLevel 11
      Quit
    \${EndIf}
    IntOp $R7 $R7 + 1
    IntCmp $R7 32 done loop done
  done:
  FileOpen $R8 "@@RESULT@@" w
  FileWrite $R8 "known-folder=$INSTDIR$\r$\nregisters-preserved=32$\r$\n"
  WriteRegStr HKCU "\${INSTALL_REGISTRY_KEY}" InstallLocation "@@ROOT@@\registered path"
  !insertmacro setInstallModePerUser
  \${If} $INSTDIR != "@@ROOT@@\registered path"
    DeleteRegKey HKCU "\${INSTALL_REGISTRY_KEY}"
    SetErrorLevel 12
    Quit
  \${EndIf}
  FileWrite $R8 "registered-path=preserved$\r$\n"
  StrCpy $R9 "@@ROOT@@\explicit override"
  !insertmacro setInstallModePerUser
  DeleteRegKey HKCU "\${INSTALL_REGISTRY_KEY}"
  \${If} $INSTDIR != "@@ROOT@@\explicit override"
    SetErrorLevel 13
    Quit
  \${EndIf}
  FileWrite $R8 "explicit-override=preserved$\r$\n"
  FileClose $R8
  SetErrorLevel 0
SectionEnd
Section Uninstall
  !insertmacro setInstallModePerUser
SectionEnd
`
  const input = template.replaceAll('\\${', '${').replaceAll('@@EXE@@', literal(executable)).replaceAll('@@BUILD@@', literal(path.join(appRoot, 'build'))).replaceAll('@@REG@@', literal(registry)).replaceAll('@@ROOT@@', literal(root)).replaceAll('@@RESULT@@', literal(resultFile))
  fs.writeFileSync(source, input, { flag: 'wx' })
  const preprocessed = execFileSync(compiler, ['-NOCD', '-V2', '-PPO', source], { encoding: 'utf8', windowsHide: true, timeout: 30000, env: compilerEnvironment })
  assert.equal(preprocessed.includes('System::Store'), false)
  assert.equal(preprocessed.includes('&w'), false)
  assert.equal((preprocessed.match(/KERNEL32::lstrcpynW/gu) ?? []).length, 4)
  execFileSync(compiler, ['-NOCD', '-V2', source], { windowsHide: true, timeout: 30000, env: compilerEnvironment })
  execFileSync(executable, ['/S'], { windowsHide: true, timeout: 30000 })
  const native = fs.readFileSync(resultFile, 'utf8')
  assert.match(native, /known-folder=.+\\AlicizationNsisPathProbe/u)
  assert.match(native, /registers-preserved=32/u)
  assert.match(native, /registered-path=preserved/u)
  assert.match(native, /explicit-override=preserved/u)
  const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
  const report = { format: 'nsis-per-user-native-check-v2', passed: true, root, registry, registryRemovedByProbe: true, compiler, compilerSha256: digest(compiler), sourceSha256: digest(source), macroSha256: digest(path.join(appRoot, 'build/nsis-safe-per-user.nsh')), hookSha256: digest(path.join(appRoot, 'build/nsis-startup.nsh')), vendoredTemplateParity: true, upstream: 'a356198ec7c54c7795659342bff36d9a5162cd93', native, scope: 'Real NSIS compile/System plugin, 32 known-folder calls with register preservation, existing HKCU InstallLocation and explicit override; installer/uninstaller macro expansion and pinned template parity. Actual full installation is a separate check.' }
  fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' })
  console.info(JSON.stringify({ ...report, report: output }))
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
