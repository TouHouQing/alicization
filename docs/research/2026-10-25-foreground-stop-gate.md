# Foreground input release gate

The foreground broker could authorize a previously pending target check after normal release had started but before owned-key cleanup had finished. Takeover already set its own stop flag, but ordinary release left the same lease apparently active during the cleanup await.

`beforeInjection` now checks the owner/release gate and lease before reading the target, and rechecks both after that asynchronous read. Release publishes its shared promise before calling owned-input cleanup, so reentrant callbacks join the same release instead of starting another cleanup or observing an injectable owner. Failed cleanup still quarantines the physical resource; successful cleanup still requires the existing broker settlement.

A controlled RED case holds both target read and cleanup: the previous implementation incorrectly authorizes injection when the target read completes. The fixed case refuses it and joins concurrent releases. A separate reentrant cleanup case verifies that no new target read or duplicate cleanup occurs. The complete ownership and acceptance suites passed 15 tests, including the existing expiry, physical-key ownership, alias, permission and independent-success checks. Node typecheck passed; lint has zero errors and existing style warnings.

This establishes broker ordering with controlled drivers. It is not physical `SendInput`, hook, watchdog or Sandbox acceptance. The native keyboard adapter remains disabled. Selective primary integration and its regression are still pending.

Three reviewed files were subsequently copied into the primary checkout with a v119 hash guard and original-file backup at `output/execution-foreground-stop-reviewed-merge-20261025/`. Primary regression is pending.

Primary v120 passed six files / 122 tests, including these 15 ownership/acceptance tests and the current grounding/streaming/budget composition. Node types pass95 and build pass94 passed. The real Live2D download diagnostic passed 24 checks with three accepted downloads on the same production source; the Windows keyboard adapter remains disabled and physical input acceptance is still outstanding.
