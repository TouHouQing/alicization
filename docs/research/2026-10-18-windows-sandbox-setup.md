# Windows Sandbox setup checkpoint

The user requested that Codex install and open Windows Sandbox for isolated execution acceptance. The host is Windows 11 Pro x64 (26100), with firmware virtualization enabled and an active hypervisor.

## Installation result

Executed the official command as an administrator:

```powershell
Enable-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM -All -NoRestart
```

Windows returned `RestartNeeded: true`. A subsequent feature query reports `Enabled`, and the CBS reboot-pending marker exists. `System32/WindowsSandbox.exe`, the Sandbox Store package and the `wsb` CLI are not available in the current session. The launch helper therefore reports `restart-required` and `actualGuestStarted: false`. No host restart has been initiated.

Evidence:

- `output/windows-sandbox-install-20261018.jsonl`
- `output/windows-sandbox-dism-20261018.log`
- `output/windows-sandbox-launch-status-20261018.json`
- `output/windows-sandbox-6ea1bd44a8fe4bad9e94b278c7e9b684/host-result.json`

## Prepared launch and readiness check

`apps/stage-tamagotchi/scripts/life-acceptance/start-windows-sandbox.ps1 -Start` creates a fresh run directory and launches the installed Windows Sandbox client hidden. The configuration exposes only a read-only bootstrap snapshot and a writable run-specific reports folder, disables host clipboard, microphone, camera, printer and networking sharing, and sets a 4 GB guest memory limit. It does not map the user profile or the whole workspace.

The guest bootstrap refuses native input on the host, verifies guest identity, opens its own WPF text field and verifies Unicode input against that exact guest foreground HWND/PID. Its readiness report is explicitly environment evidence, not product or native Alicization input-adapter acceptance. Neither guest boot nor that check has run yet. Script syntax and the generated XML were checked on the host.

After the required restart, invoke the same launch helper, verify the real guest report and update the installation status. If Windows offers its official Store client update on first launch, finish that supported update before claiming the Sandbox is ready.

## Development continuation

All 24 original execution work items remain the authorized objective. See the work-item JSON for partial implementation and remaining work. Do not mark them complete because a helper or a unit test exists. Preserve the prior Live2D streaming fixes, use real Live2D in product checks, keep host GUI testing in the background, and clean only task-owned transient files.

At this checkpoint, the desktop node and renderer typechecks passed (`output/execution-desktop-typecheck-20261018.log`). The selected execution regression run passed 74 tests in 8 files (`output/execution-sandbox-checkpoint-tests-20261018.log`). Neither result is full product acceptance. Full repository checks, release/package validation and most advanced work packages remain outstanding; no new release was produced.

Sources: [Microsoft installation](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-install), [WSB configuration](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-configure-using-wsb-file), [Sandbox versions](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-versions).
