# @proj-alicization/ui

A stylized UI component library built with [Reka UI](https://reka-ui.com/) and [UnoCSS](https://unocss.dev/).

## File Inputs And Collapsible State

`InputFile` forwards its default slot and the `isDragging` slot property. `BasicInputFile` emits selected or dropped files through `update:modelValue`, respects `multiple`, and prevents dropped files from navigating the page. Callers validate their accepted file formats before changing application state.

`Collapsible` supports controlled `v-model` state. Its optional `default` prop stays undefined when omitted, so an absent Boolean prop cannot overwrite the caller's expansion state.

`Select` forwards its disabled state, placeholder, and title to the underlying combobox. A disabled selection prevents both text entry and opening the choices.

`FieldRange` links its visible label to the native slider through `aria-labelledby`, forwards `disabled`, and preserves explicit zero bounds. `Range` applies the disabled state to its actual input.

To preview the components, refer to the [`stage-ui`](../stage-ui) package for instructions for running the Histoire UI storyboard.

## Get started

Install the library:

```shell
ni @proj-alicization/ui -D # from @antfu/ni, can be installed via `npm i -g @antfu/ni`
pnpm i @proj-alicization/ui -D
yarn i @proj-alicization/ui -D
npm i @proj-alicization/ui -D
```

This library requires `unocss` with Attributify Mode and a style reset.

First, install `unocss` if you haven't already:

```shell
pnpm i -D unocss
```

Next, in your `uno.config.ts`, add `presetAttributify()` to your presets array:
```ts
import { defineConfig, presetAttributify } from 'unocss'

export default defineConfig({
  presets: [
    presetAttributify(),
    // ...your other presets
  ],
})
```

Finally, import the reset styles in your `main.ts`:
```ts
import '@unocss/reset/tailwind.css'
```

## Usage

```vue
<script setup lang="ts">
import { Button } from '@proj-alicization/ui'
</script>

<template>
  <Button>Click me</Button>
</template>
```

## Components

* [Animations](src/components/Animations)
    * [TransitionVertical](src/components/Animations/TransitionVertical.vue)
* [Form](src/components/Form)
    * [Checkbox](src/components/Form/Checkbox)
    * [Field](src/components/Form/Field)
    * [Input](src/components/Form/Input)
    * [Radio](src/components/Form/Radio)
    * [Range](src/components/Form/Range)
    * [Select](src/components/Form/Select)
    * [Textarea](src/components/Form/Textarea)

## License

[MIT](../../LICENSE)
