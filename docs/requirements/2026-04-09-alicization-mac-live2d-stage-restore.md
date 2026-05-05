# Alicization Mac Live2D Stage Restore

## Goal
Restore the packaged mac desktop stage so the draggable Live2D character, dialogue bubble, and bottom-right controls render again, while preventing the transparent main window from degrading into an invisible click blocker.

## Problem Statement
The packaged mac desktop renderer reaches `Stage.vue` setup, but the main route still fails to finish the first mount commit. In the failing runs, `Stage`, `Live2DScene`, and `Live2DCanvas` setup all execute, yet the page-level and stage-level `onMounted` hooks never run before the watchdog swaps in a blocking recovery page. That leaves the stage blank, hides the dialogue and desktop controls, and later turns the transparent main window into an invalid click blocker. The fix must restore the real main-route mount path instead of piling more recovery UI on top.

## Constraints
- Do not revert unrelated user work in the dirty tree.
- Preserve blank-pixel click-through semantics for the transparent desktop window.
- Prefer root-cause fixes in the packaged renderer startup chain over additional recovery overlays.
- Keep packaged Electron `file://` stage startup free of optional storage and cross-window transport work before first paint.
- Keep packaged Electron `file://` asset loading compatible with the current stage architecture.

## Acceptance Criteria
- Packaged mac stage mounts the default Live2D preset again.
- The draggable Live2D character is visible instead of remaining stuck before `mounted`.
- Dialogue bubble and bottom-right controls are no longer suppressed by stage-loading failure.
- Startup watchdog no longer escalates into the blocking recovery window during normal preset-model boot.
- Single-instance packaged launches do not create competing desktop windows that fight over startup state.
- Regression coverage and verification cover the packaged `file://` startup path, not only the model asset loader.

## Non-Goals
- Rework unrelated Alicization cognition/runtime logic.
- Redesign stage UI beyond what is required to restore normal rendering.
- Add new persistent fallback systems when the underlying model load path can be repaired directly.
