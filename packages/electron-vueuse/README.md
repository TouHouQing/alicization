# @proj-alicization/electron-vueuse

VueUse-like composables and helpers shared across Alicization Electron apps.

## What it provides

- Renderer composables for common Electron behaviors (`mouse`, `window bounds`, `auto updater`, etc.)
- A reusable Eventa context/invoke pattern (`useElectronEventaContext`, `useElectronEventaInvoke`)
- Eventa context/invoke ergonomics for renderer code
- Main-process loop utilities (`useLoop`, `createRendererLoop`)

For IPC contract definitions, use `@proj-alicization/electron-eventa`.

Mouse hit testing treats an unmounted element or unavailable native cursor sample as outside the element. This releases transparent desktop overlays when their dialogue or controls disappear. Rebuild this package after changing composables so desktop apps consume the updated `dist` exports.

## Usage

```ts
import { electron } from '@proj-alicization/electron-eventa'
import { useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'

const openSettings = useElectronEventaInvoke(electron.window.getBounds)
```

```ts
import { createRendererLoop } from '@proj-alicization/electron-vueuse/main'
```
