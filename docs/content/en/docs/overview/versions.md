---
title: Versions
description: Different versions of Alicization and how to get them
---

<script setup>
import ReleaseDownloads from '../../../../.vitepress/components/ReleaseDownloads.vue'
import ReleasesList from '../../../../.vitepress/components/ReleasesList.vue'
</script>

Alicization offers multiple release channels to suit different needs. Whether you want the most stable experience or the latest features, we've got you covered.

## Stable Releases & Pre-releases

Official releases include both **stable** versions (thoroughly tested and recommended for most users) and **pre-releases** (beta and alpha versions with new features ready for testing).

Pre-releases are tagged with `-beta.X` or `-alpha.X` suffixes (e.g., `v0.7.2-beta.3`).

<ReleaseDownloads />

### Recent Stable & Pre-release Versions

<ReleasesList type="releases" :limit="5" />

[View all releases on GitHub →](https://github.com/TouHouQing/alicization/releases)

## Nightly Builds

::: warning EXPERIMENTAL
Nightly builds are **experimental** and may contain bugs or unstable features. Use them at your own risk and always keep a stable version as backup.
:::

Nightly builds are automatically generated every day from the latest `main` branch code. They contain the absolute newest features and bug fixes.

**Best for:**
- Developers and contributors
- Testing the latest bug fixes
- Users who need a specific fix that hasn't been released yet

### How to Get Nightly Builds

1. Visit the [Nightly Build Workflow](https://github.com/TouHouQing/alicization/actions/workflows/release-tamagotchi.yml) page
2. Click on the most recent successful run (indicated by a green checkmark ✓)
3. Scroll down to the **Artifacts** section
4. Download the build for your platform:
   - **Windows**: `Alicization-*-windows-x64-setup.exe`
   - **macOS (Intel)**: `Alicization-*-darwin-x64.dmg`
   - **macOS (Apple Silicon)**: `Alicization-*-darwin-arm64.dmg`
   - **Linux (x64)**: `Alicization-*-linux-x64.deb` or `Alicization-*-linux-x64.rpm`
   - **Linux (ARM64)**: `Alicization-*-linux-arm64.deb` or `Alicization-*-linux-arm64.rpm`

::: tip
Nightly builds run automatically at **00:00 UTC** every day. If you encounter an issue with the latest stable release, try the latest nightly build to see if it has been fixed.
:::

### Recent Nightly Builds

<ReleasesList type="nightly-builds" :limit="5" />

[View all nightly builds →](https://github.com/TouHouQing/alicization/actions/workflows/release-tamagotchi.yml)
