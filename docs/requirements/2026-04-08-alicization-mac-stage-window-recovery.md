# Alicization Mac Stage Window Recovery

## Goal
Repair the mac desktop Alicization launch path so the transparent main window never becomes an invisible full-screen click blocker and the desktop stage again exposes visible, interactive affordances for the Live2D character, dialogue surface, and desktop controls.

## Problem Statement
Recent Alicization desktop changes introduced a regression where launching the mac app results in a transparent full-screen window that blocks clicks on the desktop while the expected character, chat bubble, and bottom-right controls are absent. Existing recovery mechanisms are split between main and renderer and currently fail to guarantee a visible, clickable fallback surface.

## Constraints
- Do not revert unrelated user work in the dirty tree.
- Preserve desktop click-through semantics for blank pixels.
- Prefer one authoritative mouse-capture path over overlapping guards.
- Keep the fix compatible with current Alicization desktop route and stage component architecture.

## Acceptance Criteria
- App launch on mac does not leave a transparent full-screen blocker over the desktop.
- The desktop route always exposes a visible recovery or control affordance when the stage cannot render.
- When the default model loads successfully, the stage route restores the visible desktop character and controls.
- Mouse-capture behavior does not rely on ambiguous main-process cursor-region probing.
- Regression coverage exists for the repaired interaction logic.

## Non-Goals
- Rework unrelated Alicization cognition/runtime logic.
- Redesign stage visuals beyond what is required to recover visibility and interaction.
