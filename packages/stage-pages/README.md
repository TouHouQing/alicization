# stage-pages

Shared Vue settings and page surfaces for Alicization.

## Ownership

Pages compose the existing persona, provider, model, memory, and chat stores. The desktop main process owns enduring life state. Editing a card does not activate it; activation remains an explicit user action.

## Product Flows

- The provider catalogue retains expanded categories in the current window's session. Built-in speech and transcription entries open their corresponding module settings instead of nonexistent credential pages.
- Card import validates consumed fields and displays file errors before modifying the card list.
- Data management displays completion or error feedback for export, import, and reset operations.
- Translations live in `packages/i18n`; provider labels use `settings.pages.providers` and memory quality labels use the `stage` namespace.
- Browsing Kokoro settings reads the local model catalogue. Explicit loading downloads model files, reports progress, and exposes failure/retry feedback. Changing the selected model requires loading it before synthesis can run.

## Verification

Desktop product flows are exercised by `apps/stage-tamagotchi/scripts/life-acceptance/life-product-regression.cjs` on a private Windows desktop. Shared card bindings, card import validation, and controlled section expansion also have targeted Vitest coverage in `packages/stage-ui`.
