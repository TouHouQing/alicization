# 2026-04-13 Timeout Recovery Governed Compact Refactor

## Background

Foreground dialogue lanes now have stronger local/governed authority, but the stream-timeout recovery chain is still split from that authority:

1. `handleAlicizationMainChatRunFailure -> recoverFromTimeout` retries one-shot generation as a generic transport recovery step,
2. minimal-context retry trims messages mechanically instead of re-entering the same governed compact dialogue contract,
3. simple or short dialogue turns can therefore recover with a different mind surface than the main foreground path, even when the same turn should stay inside one coherent living thread.

This is still not digital-life-consistent:

- timeout recovery behaves like a separate subsystem,
- mind/continuity/tooling authority does not stay unified when stream-first-event stalls,
- short turns can still feel slower, flatter, or less continuous after recovery than before failure.

## Goal

Refactor timeout recovery so stream-first-event recovery can re-enter the same governed compact dialogue contract instead of only relying on generic full-context/minimal-context one-shot retries.

## Scope

1. Introduce a governed compact timeout recovery attempt for eligible active-dialogue turns.
2. Reuse the existing active-dialogue fast-path message builder for that recovery attempt.
3. Keep timeout recovery mode/accounting explicit so lifecycle telemetry still explains which recovery lane succeeded.
4. Preserve deterministic required-tool recovery precedence for execution/tool-forced turns.
5. Add regression coverage for:
   - dialogue timeout recovery choosing governed compact messages,
   - lifecycle timeout accounting with the new recovery mode,
   - recovery staying aligned with `mind-turn-v1` governed output.

## Acceptance Criteria

1. When a short dialogue turn times out before first content, timeout recovery may retry through a governed compact dialogue attempt before falling back to generic minimal-context retry.
2. The governed compact recovery attempt reuses the same compact active-dialogue governance block as the main fast path.
3. Successful compact recovery returns `mind-turn-v1` output whose visible surface and `thought` stay aligned with current-turn governance.
4. Required-tool execution turns still prefer deterministic recovery and do not get rerouted through dialogue compact recovery.
