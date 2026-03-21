# stage-tamagotchi

Electron desktop surface for Alicization.

## What It Does

- Runs the desktop Alicization experience.
- Hosts the main-process Alicization runtime, renderer, screen-capture helpers, and desktop sensory loops.
- Is the correct app target when debugging desktop-only behavior such as proactive perception, IPC, screen capture, and TCC permissions.

## When To Use It

- Use this app when the issue only reproduces on the desktop build.
- Use the local macOS install flow below when validating Screen Recording / screen-capture behavior on macOS.

## When Not To Use It

- Do not use this app to validate web-only behavior.
- Do not launch the raw `dist/.../alicization.app` bundle repeatedly for macOS TCC testing after rebuilding. Local rebuilds are ad-hoc signed by default and can cause Screen Recording permission state to drift or be treated as a different app identity.

## Local macOS TCC-Stable Flow

Use the installed local app flow instead of running the raw packaged bundle:

```bash
pnpm -F @proj-alicization/stage-tamagotchi build:mac:local
```

This does three things:

1. Builds the unpacked macOS app.
2. Installs a stable local bundle at `~/Applications/Alicization Local.app`.
3. Re-signs that installed bundle with a stable signing identity.
4. Automatically repairs stale macOS `ScreenCapture` / `Accessibility` TCC entries when the local build signature changed in a way that macOS can treat as a different app.

Identity selection order:

- Prefer an existing `Apple Development` or `Developer ID Application` identity if one is available.
- Otherwise create a persistent local signing identity inside `~/Library/Application Support/com.tohoqing.alicization/local-signing`.

Why the auto-repair exists:

- Local self-signed development identities do not carry a stable Apple Team Identifier.
- On macOS, `Screen Recording` and `Accessibility` grants can stay pinned to an older code requirement for that bundle id.
- After a rebuild, the app may still look toggled on in System Settings while `tccd` silently rejects the current binary as an older program.
- The installer now stops the running local app, refreshes the installed bundle, and resets the stale TCC entries when that kind of signature drift is detected.

The local flow now self-heals older broken ad-hoc/local-signing state:

- If the dedicated local signing keychain exists but does not expose a valid codesigning identity, the installer recreates that dedicated keychain and reissues the stable local certificate.
- The dedicated local keychain is added to the user search list so `codesign` can keep resolving the same identity across refreshes.

After the first install, refresh the installed bundle without changing its local identity:

```bash
pnpm -F @proj-alicization/stage-tamagotchi refresh:mac:local
```

If the refreshed local build changed and the installer auto-repaired TCC, reopen `~/Applications/Alicization Local.app` and re-enable:

- `Screen Recording`
- `Accessibility`

If the installed local app is already present but macOS is still acting like the old permission grant is stuck, repair the installed bundle directly without rebuilding:

```bash
pnpm -F @proj-alicization/stage-tamagotchi repair:mac:local:permissions
```

If you need to clear a broken Screen Recording grant from older ad-hoc builds once, use:

```bash
pnpm -F @proj-alicization/stage-tamagotchi exec tsx scripts/install-local-mac-app.ts --reset-tcc
```

Then reopen `~/Applications/Alicization Local.app` and grant Screen Recording plus Accessibility again one time.

## Validation

After granting permission, verify from runtime logs or audit logs that inspection turns no longer fall back to:

- `screen-capture-permission-denied`
- `inspection-grounding-skipped`

Expected healthy path:

- `inspection-grounded`
- or at worst `perception-only` fallback without repeated permission prompting
